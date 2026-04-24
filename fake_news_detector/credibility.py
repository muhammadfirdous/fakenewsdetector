import json
import os
from urllib.parse import urlparse

DOMAINS_FILE = os.path.join(os.path.dirname(__file__), "data", "domains.json")

def get_domain_credibility(domain: str):
    # Normalize domain (remove www.)
    domain = domain.lower()
    if domain.startswith("www."):
        domain = domain[4:]
        
    try:
        with open(DOMAINS_FILE, "r") as f:
            domains_db = json.load(f)
            
        if domain in domains_db:
            data = domains_db[domain]
            return {
                "domain": domain,
                "rating": data.get("rating", "unknown"),
                "bias": data.get("bias", "unknown"),
                "description": data.get("description", "")
            }
    except Exception as e:
        print(f"Error reading domains.json: {e}")
        
    return {
        "domain": domain,
        "rating": "unknown",
        "bias": "unknown",
        "description": "Domain not found in our database."
    }
