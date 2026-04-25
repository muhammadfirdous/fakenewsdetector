from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any, Literal

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

class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str

class ChatRequest(BaseModel):
    question: str
    messages: List[ChatMessage] = []
    results: Dict[str, Any]

class ChatResponse(BaseModel):
    answer: str

class AnalyzeImageRequest(BaseModel):
    image_base64: str
    mime_type: Optional[str] = "image/png"
    context: Optional[str] = None

class AnalyzeImageResponse(BaseModel):
    verdict: str
    confidence_score: int
    summary: str
    red_flags: List[str]
    source_credibility: Optional[SourceCredibility] = None
    fact_checks: List[FactCheck] = []
    reasoning: Optional[str] = None
    extracted_text: Optional[str] = None

class VerifyRequest(BaseModel):
    input_kind: Literal["text", "url", "image"] = "text"
    text: Optional[str] = None
    url: Optional[str] = None
    image_base64: Optional[str] = None
    mime_type: Optional[str] = "image/png"
    context: Optional[str] = None
