from fastapi import APIRouter
from pydantic import BaseModel
import numpy as np

router = APIRouter()

class EscrowRequest(BaseModel):
    amount: float
    expert_rating: float
    expert_completed_jobs: int
    customer_dispute_ratio: float
    is_first_time_pairing: bool

@router.post("/analyze")
async def analyze_escrow(payload: EscrowRequest):
    amount = float(payload.amount)
    expert_rating = float(payload.expert_rating)
    completed_jobs = int(payload.expert_completed_jobs)
    dispute_ratio = float(payload.customer_dispute_ratio)
    first_time = bool(payload.is_first_time_pairing)

    # 1. AI Logistical Risk Scoring
    # z-score representing logarithmic risk logit
    z = -1.8 + (dispute_ratio * 4.5) + (1.2 if first_time else 0.0) + ((5.0 - expert_rating) * 0.8) - (min(completed_jobs, 30) * 0.08)
    risk_score = 1.0 / (1.0 + np.exp(-z))
    risk_score = round(float(np.clip(risk_score, 0.02, 0.98)), 3)

    # 2. Release Schedule Decisioning
    if risk_score > 0.75:
        decision = "MANUAL_AUDIT"
        hold_days = 7
    elif risk_score > 0.45:
        decision = "48H_HOLD"
        hold_days = 2
    elif risk_score > 0.22:
        decision = "24H_HOLD"
        hold_days = 1
    else:
        decision = "INSTANT_RELEASE"
        hold_days = 0

    # 3. Dynamic Fintech Split Math
    # Base fee is 8%. Experts with high ratings get discounts.
    # High risk transactions pay a slight premium to pool reserves.
    base_platform_percent = 0.08
    rating_discount = max(0.0, (expert_rating - 4.0) * 0.03) # Up to 3% discount
    risk_surcharge = risk_score * 0.05 # Up to 5% surcharge
    
    platform_fee_percent = max(0.04, min(0.15, base_platform_percent - rating_discount + risk_surcharge))
    platform_fee = round(amount * platform_fee_percent, 2)
    
    # Insurance pool contribution based on risk
    insurance_pool = round(amount * risk_score * 0.05, 2)
    
    # Net expert payout
    expert_net = round(amount - platform_fee - insurance_pool, 2)
    
    # Escrow yield dynamic estimation (4.5% annual yield)
    yield_days = max(0.25, hold_days) # Even instant holds are cleared within hours
    escrow_yield_est = round(amount * 0.045 * (yield_days / 365.0), 4)

    return {
        "risk_score": risk_score,
        "decision": decision,
        "hold_days": hold_days,
        "split": {
            "amount": amount,
            "platform_fee": platform_fee,
            "platform_fee_percent": round(platform_fee_percent * 100, 2),
            "insurance_pool": insurance_pool,
            "expert_net": expert_net,
            "escrow_yield_est": escrow_yield_est
        }
    }
