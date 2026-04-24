import httpx
import os
import logging

logger = logging.getLogger(__name__)

# GOOGLE_API_KEY should be set in environment variables
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY", "")

async def query_fact_check(query: str):
    if not GOOGLE_API_KEY:
        logger.warning("GOOGLE_API_KEY not set. Skipping fact check query.")
        return []
    
    url = "https://factchecktools.googleapis.com/v1alpha1/claims:search"
    params = {
        "query": query,
        "key": GOOGLE_API_KEY
    }
    
    try:
        async with httpx.AsyncClient(timeout=2.0) as client:
            response = await client.get(url, params=params)
            response.raise_for_status()
            data = response.json()
            
            claims = data.get("claims", [])
            fact_checks = []
            
            for c in claims[:3]: # Limit to top 3
                claim_text = c.get("text", "")
                review = c.get("claimReview", [{}])[0]
                status = review.get("textualRating", "Unknown")
                source = review.get("publisher", {}).get("name", "Unknown")
                review_url = review.get("url", "")
                
                fact_checks.append({
                    "claim": claim_text,
                    "status": status,
                    "source": source,
                    "url": review_url
                })
            
            return fact_checks
    except Exception as e:
        logger.error(f"Fact check API error: {e}")
        return []
