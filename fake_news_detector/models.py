from pydantic import BaseModel, Field
from typing import List, Optional, Dict

class AnalyzeRequest(BaseModel):
    url: Optional[str] = None
    text: Optional[str] = None

class SourceCredibility(BaseModel):
    domain: str
    rating: str
    bias: str
    description: Optional[str] = None

class FactCheck(BaseModel):
    claim: str
    status: str
    source: str
    url: Optional[str] = None

class AnalyzeResponse(BaseModel):
    verdict: str
    confidence_score: int
    summary: str
    red_flags: List[str]
    source_credibility: Optional[SourceCredibility] = None
    fact_checks: List[FactCheck] = []
    reasoning: Optional[str] = None
