# Fake News Detector - Backend

This is a FastAPI-based backend that analyzes news articles for credibility using scraping, domain reputation, fact-checking, and LLM-based synthesis.

## Features

- **Automated Scraping**: Uses `newspaper3k` and `trafilatura` to extract content from URLs.
- **Domain Credibility**: Checks domains against a database for bias and reliability ratings.
- **Fact-Checking**: Integrates with Google's Fact Check Tools API.
- **Red Flag Detection**: Identifies clickbait, emotional language, and lack of attribution.
- **AI Synthesis**: Uses Google Gemini (1.5 Flash) to provide a final verdict, confidence score, and detailed reasoning.

## Setup

1. **Install Dependencies**:
   ```bash
   pip install fastapi uvicorn newspaper3k trafilatura httpx google-generativeai beautifulsoup4 lxml_html_clean
   ```

2. **Set API Keys**:
   Set the `GOOGLE_API_KEY` environment variable. This is used for both the Fact Check API and the Gemini AI analysis.
   ```bash
   $env:GOOGLE_API_KEY = "your-api-key-here"
   ```

3. **Run the Server**:
   ```bash
   python main.py
   ```
   The API will be available at `http://localhost:8000`.

## API Endpoint

### `POST /analyze`

**Request:**
```json
{
  "url": "https://example.com/some-article",
  "text": "Optional raw text to analyze"
}
```

**Response:**
```json
{
  "verdict": "Likely True",
  "confidence_score": 92,
  "summary": "Article is from a highly credible source and matches verified facts.",
  "red_flags": [],
  "source_credibility": {
    "domain": "bbc.com",
    "rating": "high",
    "bias": "center-left"
  },
  "fact_checks": [...],
  "reasoning": "..."
}
```
