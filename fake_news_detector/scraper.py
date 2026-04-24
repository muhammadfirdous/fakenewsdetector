import newspaper
from newspaper import Article
import trafilatura
from urllib.parse import urlparse
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def scrape_article(url: str):
    logger.info(f"Scraping URL: {url}")
    
    result = {
        "title": "",
        "text": "",
        "authors": [],
        "publish_date": None,
        "domain": urlparse(url).netloc,
        "success": False
    }
    
    # Try newspaper3k first
    try:
        article = Article(url)
        article.download()
        article.parse()
        
        result["title"] = article.title
        result["text"] = article.text
        result["authors"] = article.authors
        result["publish_date"] = article.publish_date
        
        if result["text"]:
            result["success"] = True
            logger.info("Scraping successful with newspaper3k")
            return result
    except Exception as e:
        logger.warning(f"newspaper3k failed: {e}")

    # Fallback to trafilatura
    try:
        downloaded = trafilatura.fetch_url(url)
        if downloaded:
            extracted = trafilatura.extract(downloaded, include_comments=False, include_tables=True)
            if extracted:
                result["text"] = extracted
                result["success"] = True
                # Trafilatura metadata extraction is more complex, keeping it simple for now
                logger.info("Scraping successful with trafilatura")
                return result
    except Exception as e:
        logger.error(f"trafilatura failed: {e}")

    return result
