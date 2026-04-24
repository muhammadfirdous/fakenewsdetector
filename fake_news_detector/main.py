from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os

# Load environment variables from .env file
load_dotenv()

from models import AnalyzeRequest, AnalyzeResponse, SourceCredibility, FactCheck
from scraper import scrape_article
from credibility import get_domain_credibility
from fact_check import query_fact_check
from utils import detect_red_flags
from analyzer import analyze_with_llm
import uvicorn

app = FastAPI(title="Fake News Detector API")

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict this to your frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/analyze", response_model=AnalyzeResponse)
async def analyze(request: AnalyzeRequest):
    if not request.url and not request.text:
        raise HTTPException(status_code=400, detail="Either URL or text must be provided.")
    
    article_data = {}
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

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
