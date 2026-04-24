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
    logger.info("Gemini AI API configured.")
else:
    logger.warning("GOOGLE_API_KEY not set. Gemini integration will be mocked.")

# List of models to try in order of preference
MODELS_TO_TRY = ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-1.0-pro']

async def analyze_with_llm(article_data: Dict, credibility_data: Dict, fact_checks: List, red_flags: List):
    if not API_KEY:
        return {
            "verdict": "Mixed",
            "confidence_score": 50,
            "summary": "LLM Synthesis is unavailable without API key.",
            "reasoning": "Mock reasoning: The article has some red flags but claims match some fact-checks."
        }

    prompt = f"""
    Analyze the following news article data and provide a credibility assessment.
    
    ARTICLE TITLE: {article_data.get('title')}
    ARTICLE TEXT: {article_data.get('text')[:2000]}
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
    4. "reasoning": A more detailed explanation.
    """
    
    last_error = ""
    for model_name in MODELS_TO_TRY:
        try:
            logger.info(f"Attempting analysis with {model_name}...")
            model = genai.GenerativeModel(model_name)
            
            # Use async generation to avoid blocking
            # Note: gemini-1.0-pro might not support JSON mode, so we handle it gracefully
            gen_config = {}
            if "1.5" in model_name:
                gen_config["response_mime_type"] = "application/json"
            
            response = await model.generate_content_async(prompt, generation_config=gen_config)
            
            # Clean up the response text if it's not strictly JSON (for 1.0-pro)
            text = response.text
            if "```json" in text:
                text = text.split("```json")[1].split("```")[0].strip()
            elif "```" in text:
                text = text.split("```")[1].split("```")[0].strip()
            
            return json.loads(text)
            
        except Exception as e:
            last_error = str(e)
            logger.warning(f"Model {model_name} failed: {last_error}. Switching...")
            continue

    # If all models fail
    return {
        "verdict": "Error",
        "confidence_score": 0,
        "summary": "All AI models were busy or unavailable.",
        "reasoning": f"Exhausted all available models. Last error: {last_error}"
    }
