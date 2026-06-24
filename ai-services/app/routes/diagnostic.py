from fastapi import APIRouter
from pydantic import BaseModel, Field
from typing import List
import os
import json
from openai import OpenAI

router = APIRouter()

class DiagnosticRequest(BaseModel):
    description: str
    service_id: str
    provider: str = "grok"
    api_key: str = ""

class MatchCriteria(BaseModel):
    min_experience_years: int
    requires_background_check: bool
    requires_certified_badge: bool

class DiagnosticResponse(BaseModel):
    recommended_hours: int = Field(description="Estimated hours to complete the job (1-8)")
    severity: str = Field(description="Must be exactly LOW, MEDIUM, or HIGH")
    tools: list[str] = Field(description="List of specific tools the expert should bring")
    expert_match_criteria: MatchCriteria

@router.post("/analyze")
async def analyze_scope(payload: DiagnosticRequest):
    active_key = payload.api_key or os.environ.get("GROK_API_KEY", "") or os.environ.get("GROQ_API_KEY", "")
    if not active_key:
        # Fallback to simple default if no API key is set
        return {
            "recommended_hours": 2,
            "severity": "LOW",
            "tools": ["Standard tools (Add GROK_API_KEY or GROQ_API_KEY to use real AI)"],
            "expert_match_criteria": {
                "min_experience_years": 1,
                "requires_background_check": True,
                "requires_certified_badge": False
            }
        }

    try:
        base_url = "https://api.groq.com/openai/v1" if payload.provider == "groq" else "https://api.x.ai/v1"
        model_name = "llama-3.3-70b-versatile" if payload.provider == "groq" else "grok-2-latest"
        
        client = OpenAI(
            api_key=active_key,
            base_url=base_url,
        )
        
        prompt = f"""
        You are an AI diagnostic assistant for a home services application. 
        A customer has requested a '{payload.service_id}' service with the following job description:
        "{payload.description}"
        
        Carefully analyze this description to determine the job scope.
        Respond with structured JSON exactly matching the requested format.
        Limit recommended_hours to a maximum of 8.
        """
        
        response = client.chat.completions.create(
            model=model_name,
            messages=[
                {"role": "system", "content": "You are a professional diagnostic AI. Always respond in pure JSON format."},
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"},
        )
        
        return json.loads(response.choices[0].message.content)
    except Exception as e:
        print(f"Grok API Error: {e}")
        # Return safe fallback if AI fails
        return {
            "recommended_hours": 2,
            "severity": "LOW",
            "tools": ["Standard utility tools"],
            "expert_match_criteria": {
                "min_experience_years": 1,
                "requires_background_check": True,
                "requires_certified_badge": False
            }
        }
