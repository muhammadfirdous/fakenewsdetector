from fastapi import FastAPI, HTTPException, APIRouter
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
import json
import os

# Load environment variables from .env file
load_dotenv()

from models import (
    AnalyzeRequest, AnalyzeResponse, SourceCredibility, FactCheck,
    ChatRequest, ChatResponse, AnalyzeImageRequest, AnalyzeImageResponse,
    VerifyRequest,
)
from scraper import scrape_article
from credibility import get_domain_credibility
from fact_check import query_fact_check
from utils import detect_red_flags
from analyzer import analyze_with_llm, chat_about_results, analyze_image_with_llm
from verifier import run_verification_pipeline, analyze_image_visual
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

@router.post("/verify")
async def verify(request: VerifyRequest):
    """End-to-end web-augmented verification, streamed as SSE."""

    # Build the input bundle synchronously (scrape if URL); stream the rest.
    title = ""
    text = (request.text or "").strip()
    domain = ""
    image_b64 = (request.image_base64 or "").strip()
    mime_type = (request.mime_type or "image/png")
    context = (request.context or "").strip()

    if request.input_kind == "url":
        if not request.url:
            raise HTTPException(status_code=400, detail="URL is required for input_kind='url'.")
        scraped = scrape_article(request.url)
        title = scraped.get("title") or ""
        text = scraped.get("text") or ""
        domain = scraped.get("domain") or ""
        if not text:
            text = request.url
    elif request.input_kind == "image":
        if not image_b64:
            raise HTTPException(status_code=400, detail="image_base64 is required for input_kind='image'.")
        # Best-effort OCR via the existing image analyzer; tolerate failure.
        try:
            from analyzer import analyze_image_with_llm as _analyze_img
            ocr_pkg = await _analyze_img(image_base64=image_b64, context=context, mime_type=mime_type)
            text = (ocr_pkg.get("extracted_text") or "").strip() or context
            title = (ocr_pkg.get("summary") or "").strip()
        except Exception:
            text = context
            title = ""
    else:  # "text"
        if not text:
            raise HTTPException(status_code=400, detail="text is required for input_kind='text'.")
        # Use first sentence-ish as a stand-in title for downstream queries.
        title = text.split(". ")[0][:160] if text else ""

    baseline_credibility = get_domain_credibility(domain) if domain else {}
    baseline_red_flags = detect_red_flags(title, text, [])
    try:
        baseline_fact_checks = await query_fact_check(title or text[:120])
    except Exception:
        baseline_fact_checks = []

    async def event_stream():
        try:
            async for event in run_verification_pipeline(
                input_kind=request.input_kind,
                title=title,
                text=text,
                domain=domain,
                image_base64=image_b64,
                mime_type=mime_type,
                context=context,
                baseline_credibility=baseline_credibility,
                baseline_fact_checks=baseline_fact_checks,
                baseline_red_flags=baseline_red_flags,
            ):
                yield "data: " + json.dumps(event, ensure_ascii=False) + "\n\n"
        except Exception as e:
            yield "data: " + json.dumps({"step": "fatal", "status": "error", "error": str(e)}) + "\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
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
