from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict
import numpy as np
from scipy.optimize import linear_sum_assignment

router = APIRouter()

class Coordinate(BaseModel):
    lat: float
    lng: float

class BookingItem(BaseModel):
    id: str
    coords: Coordinate
    service_id: str

class ExpertCandidate(BaseModel):
    id: str
    coords: Coordinate
    rating: float
    active_jobs: int
    service_ids: List[str]

class MatchRequest(BaseModel):
    bookings: List[BookingItem]
    candidates: List[ExpertCandidate]

# Haversine distance calculator
def get_distance(c1, c2):
    R = 6371.0 # Earth radius in km
    d_lat = np.radians(c2.lat - c1.lat)
    d_lng = np.radians(c2.lng - c1.lng)
    a = np.sin(d_lat/2)**2 + np.cos(np.radians(c1.lat)) * np.cos(np.radians(c2.lat)) * np.sin(d_lng/2)**2
    return 2 * R * np.arcsin(np.sqrt(a))

@router.post("/match")
async def match_batch(payload: MatchRequest):
    bookings = payload.bookings
    candidates = payload.candidates
    
    if not bookings or not candidates:
        return {"assignments": []}
        
    # Build cost matrix (rows = bookings, cols = candidates)
    # Dimension: N x M
    num_bookings = len(bookings)
    num_candidates = len(candidates)
    
    cost_matrix = np.zeros((num_bookings, num_candidates))
    
    for i, b in enumerate(bookings):
        for j, c in enumerate(candidates):
            # Check service compatibility
            if b.service_id not in c.service_ids:
                cost_matrix[i, j] = 999999.0 # Prohibit assignment
                continue
                
            dist = get_distance(b.coords, c.coords)
            
            # Weighted cost function: minimize distance, maximize rating, minimize load
            # Travel distance (lower is better) + rating penalty (higher rating is lower cost)
            cost = dist * 1.5 + (5.0 - c.rating) * 2.0 + c.active_jobs * 3.0
            cost_matrix[i, j] = cost

    # Solve the linear sum assignment (Hungarian Algorithm)
    row_ind, col_ind = linear_sum_assignment(cost_matrix)
    
    assignments = []
    for r, c in zip(row_ind, col_ind):
        # Exclude invalid matches (where service compatibility failed)
        if cost_matrix[r, c] < 99999.0:
            assignments.append({
                "booking_id": bookings[r].id,
                "expert_id": candidates[c].id,
                "score": float(cost_matrix[r, c]),
                "estimated_distance_km": float(get_distance(bookings[r].coords, candidates[c].coords))
            })
            
    return {"assignments": assignments}
