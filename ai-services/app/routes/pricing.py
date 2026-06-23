from fastapi import APIRouter
from pydantic import BaseModel
import numpy as np

router = APIRouter()

class PricingFeatures(BaseModel):
    active_bookings_5km: int
    online_experts_5km: int
    hour_of_day: int
    is_weekend: bool

@router.post("/surge")
async def calculate_surge(features: PricingFeatures):
    demand = features.active_bookings_5km
    supply = features.online_experts_5km
    
    if supply == 0:
        # High surge multiplier if zero supply
        return {"multiplier": 1.5, "surge_level": "CRITICAL"}
        
    ratio = demand / supply
    
    # Mathematical Sigmoid Surge function:
    # Multiplier ranges from 1.0 (normal) up to 2.0 (heavy surge)
    multiplier = 1.0 + (1.0 / (1.0 + np.exp(-1.5 * (ratio - 1.2))))
    multiplier = round(float(np.clip(multiplier, 1.0, 2.0)), 2)
    
    surge_level = "NORMAL"
    if multiplier > 1.4:
        surge_level = "HIGH"
    elif multiplier > 1.15:
        surge_level = "MODERATE"
        
    return {"multiplier": multiplier, "surge_level": surge_level}
