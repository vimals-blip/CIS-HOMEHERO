from fastapi import APIRouter
from pydantic import BaseModel
from typing import List

router = APIRouter()

class DiagnosticRequest(BaseModel):
    description: str
    service_id: str
    api_key: str = ""

import os
import json
import google.generativeai as genai
from pydantic import BaseModel, Field

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
    active_key = payload.api_key or os.environ.get("GEMINI_API_KEY", "")
    if not active_key:
        # Fallback to simple default if no API key is set
        return {
            "recommended_hours": 2,
            "severity": "LOW",
            "tools": ["Standard tools (Add GEMINI_API_KEY to use real AI)"],
            "expert_match_criteria": {
                "min_experience_years": 1,
                "requires_background_check": True,
                "requires_certified_badge": False
            }
        }

    try:
        genai.configure(api_key=active_key)
        model = genai.GenerativeModel("gemini-2.5-flash")
        
        prompt = f"""
        You are an AI diagnostic assistant for a home services application. 
        A customer has requested a '{payload.service_id}' service with the following job description:
        "{payload.description}"
        
        Carefully analyze this description to determine the job scope.
        Respond with structured JSON matching the schema exactly.
        Limit recommended_hours to a maximum of 8.
        """
        
        response = model.generate_content(
            prompt,
            generation_config=genai.GenerationConfig(
                response_mime_type="application/json",
                response_schema=DiagnosticResponse,
            ),
        )
        
        return json.loads(response.text)
    except Exception as e:
        print(f"Gemini API Error: {e}")
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
