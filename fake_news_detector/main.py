from fastapi import FastAPI, HTTPException, APIRouter
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os

# Load environment variables from .env file
load_dotenv()

from models import (
    AnalyzeRequest, AnalyzeResponse, SourceCredibility, FactCheck,
    ChatRequest, ChatResponse, AnalyzeImageRequest, AnalyzeImageResponse,
)
from scraper import scrape_article
from credibility import get_domain_credibility
from fact_check import query_fact_check
from utils import detect_red_flags
from analyzer import analyze_with_llm, chat_about_results, analyze_image_with_llm
import uvicorn

app = FastAPI(title="Fake News Detector API")

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Define router for clean endpoint management
router = APIRouter()

@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze(request: AnalyzeRequest):
    if not request.url and not request.text:
        raise HTTPException(status_code=400, detail="Either URL or text must be provided.")
    
    article_data = {"title": "", "text": "", "authors": [], "domain": "", "success": False}
    if request.url:
        article_data = scrape_article(request.url)
        if not article_data["success"]:
            # Even if scraping fails, we might have some info or just use raw text if provided
            pass
    
    # If text is provided manually, it overrides scraped text
    if request.text:
        article_data["text"] = request.text
        if not article_data.get("title"):
            article_data["title"] = request.text[:100] + "..."
            
    if not article_data.get("text"):
        raise HTTPException(status_code=400, detail="Could not extract text from URL and no raw text provided.")
    
    # 1. Domain Credibility
    credibility_data = get_domain_credibility(article_data.get("domain", ""))
    
    # 2. Red Flags
    red_flags = detect_red_flags(
        article_data.get("title", ""), 
        article_data.get("text", ""), 
        article_data.get("authors", [])
    )
    
    # 3. Fact Checking
    fact_checks = await query_fact_check(article_data.get("title", ""))
    
    # 4. LLM Analysis
    llm_result = await analyze_with_llm(article_data, credibility_data, fact_checks, red_flags)
    
    return AnalyzeResponse(
        verdict=llm_result.get("verdict", "Unknown"),
        confidence_score=llm_result.get("confidence_score", 0),
        summary=llm_result.get("summary", "No summary available."),
        red_flags=red_flags,
        source_credibility=SourceCredibility(**credibility_data),
        fact_checks=[FactCheck(**fc) for fc in fact_checks],
        reasoning=llm_result.get("reasoning", "")
    )

@router.post("/analyze-image", response_model=AnalyzeImageResponse)
async def analyze_image(request: AnalyzeImageRequest):
    if not request.image_base64 or not request.image_base64.strip():
        raise HTTPException(status_code=400, detail="Image data is required.")

    llm_result = await analyze_image_with_llm(
        image_base64=request.image_base64,
        context=(request.context or ""),
        mime_type=(request.mime_type or "image/png"),
    )

    credibility_data = {
        "domain": "",
        "rating": "unknown",
        "bias": "unknown",
        "description": "Image submission — no source domain available.",
    }

    return AnalyzeImageResponse(
        verdict=llm_result.get("verdict", "Unknown"),
        confidence_score=int(llm_result.get("confidence_score", 0) or 0),
        summary=llm_result.get("summary", "No summary available."),
        red_flags=llm_result.get("red_flags", []) or [],
        source_credibility=SourceCredibility(**credibility_data),
        fact_checks=[],
        reasoning=llm_result.get("reasoning", ""),
        extracted_text=llm_result.get("extracted_text", ""),
    )


@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    if not request.question or not request.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty.")
    if not request.results:
        raise HTTPException(status_code=400, detail="Results context is required.")
    try:
        answer = await chat_about_results(
            question=request.question.strip(),
            history=[m.model_dump() for m in request.messages],
            results=request.results,
        )
        return ChatResponse(answer=answer)
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unexpected error: {e}")

# Include the router both at the root and with /api prefix
app.include_router(router)
app.include_router(router, prefix="/api")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
