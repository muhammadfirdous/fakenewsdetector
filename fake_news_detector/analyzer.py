import google.generativeai as genai
import os
import json
import logging
from typing import Dict, List

logger = logging.getLogger(__name__)

# GOOGLE_API_KEY should be set in environment variables
API_KEY = os.getenv("GOOGLE_API_KEY", "")

if API_KEY:
    genai.configure(api_key=API_KEY)
    model = genai.GenerativeModel('gemini-1.5-flash')
else:
    logger.warning("GOOGLE_API_KEY not set. Gemini integration will be mocked.")

async def analyze_with_llm(article_data: Dict, credibility_data: Dict, fact_checks: List, red_flags: List):
    if not API_KEY:
        # Return a mock response if no API key
        return {
            "verdict": "Mixed",
            "confidence_score": 50,
            "summary": "LLM Synthesis is unavailable without API key.",
            "reasoning": "Mock reasoning: The article has some red flags but claims match some fact-checks."
        }

    prompt = f"""
    Analyze the following news article data and provide a credibility assessment.
    
    ARTICLE TITLE: {article_data.get('title')}
    ARTICLE TEXT: {article_data.get('text')[:2000]}  # Truncated for token limits
    DOMAIN: {credibility_data.get('domain')}
    DOMAIN RATING: {credibility_data.get('rating')}
    DOMAIN BIAS: {credibility_data.get('bias')}
    
    RED FLAGS DETECTED: {", ".join(red_flags)}
    
    EXISTING FACT CHECKS:
    {json.dumps(fact_checks, indent=2)}
    
    Return a JSON object with:
    1. "verdict": One of (Fake, Likely Fake, Mixed, Likely True, True)
    2. "confidence_score": integer (0-100)
    3. "summary": A concise (1-2 sentence) summary of why this verdict was reached.
    4. "reasoning": A more detailed explanation including analysis of tone, source, and consistency.
    """
    
    try:
        response = model.generate_content(prompt, generation_config={"response_mime_type": "application/json"})
        return json.loads(response.text)
    except Exception as e:
        logger.error(f"Gemini API error: {e}")
        return {
            "verdict": "Error",
            "confidence_score": 0,
            "summary": "Failed to generate AI analysis.",
            "reasoning": str(e)
        }
