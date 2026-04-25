from openai import AsyncOpenAI
import os
import json
import logging
from typing import Dict, List

logger = logging.getLogger(__name__)

API_KEY = os.getenv("MINIMAX_API_KEY", "")

client = None
if API_KEY:
    client = AsyncOpenAI(
        api_key=API_KEY,
        base_url="https://api.minimaxi.chat/v1",
    )
    logger.info("MiniMax AI client configured.")
else:
    logger.warning("MINIMAX_API_KEY not set. LLM integration will be mocked.")

# Try multiple model names in order
MODELS_TO_TRY = ["MiniMax-Text-01", "abab6.5s-chat", "abab5.5-chat"]

async def analyze_with_llm(article_data: Dict, credibility_data: Dict, fact_checks: List, red_flags: List):
    if not client:
        return {
            "verdict": "Mixed",
            "confidence_score": 50,
            "summary": "LLM Synthesis is unavailable without API key.",
            "reasoning": "Mock reasoning: The article has some red flags but claims match some fact-checks."
        }

    prompt = f"""Analyze the following news article data and provide a credibility assessment.

ARTICLE TITLE: {article_data.get('title')}
ARTICLE TEXT: {article_data.get('text')[:2000]}
DOMAIN: {credibility_data.get('domain')}
DOMAIN RATING: {credibility_data.get('rating')}
DOMAIN BIAS: {credibility_data.get('bias')}

RED FLAGS DETECTED: {", ".join(red_flags)}

EXISTING FACT CHECKS:
{json.dumps(fact_checks, indent=2)}

Return ONLY a valid JSON object with these fields:
1. "verdict": One of (Fake, Likely Fake, Mixed, Likely True, True)
2. "confidence_score": integer (0-100)
3. "summary": A concise (1-2 sentence) summary of why this verdict was reached.
4. "reasoning": A more detailed explanation.

Return ONLY the JSON, no markdown formatting."""

    last_error = ""
    for model_name in MODELS_TO_TRY:
        try:
            logger.info(f"Attempting analysis with {model_name}...")
            response = await client.chat.completions.create(
                model=model_name,
                messages=[
                    {"role": "system", "content": "You are a fact-checking AI assistant. Always respond with valid JSON only."},
                    {"role": "user", "content": prompt},
                ],
                temperature=0.3,
                max_tokens=1024,
            )

            text = response.choices[0].message.content.strip()

            # Clean up if wrapped in markdown code blocks
            if "```json" in text:
                text = text.split("```json")[1].split("```")[0].strip()
            elif "```" in text:
                text = text.split("```")[1].split("```")[0].strip()

            return json.loads(text)

        except Exception as e:
            last_error = str(e)
            logger.warning(f"Model {model_name} failed: {last_error}")
            continue

    return {
        "verdict": "Error",
        "confidence_score": 0,
        "summary": "AI model was busy or unavailable.",
        "reasoning": f"Exhausted all models. Last error: {last_error}"
    }


VISION_MODELS_TO_TRY = ["MiniMax-VL-01", "abab6.5s-chat", "MiniMax-Text-01"]


def _normalize_image_verdict(v) -> str:
    if not v:
        return "Mixed"
    u = str(v).strip().upper()
    if u == "REAL":
        return "True"
    if u == "FAKE":
        return "Fake"
    if u == "UNCERTAIN":
        return "Mixed"
    return str(v)


def _image_mock_response(note: str = "") -> Dict:
    return {
        "verdict": "Mixed",
        "confidence_score": 50,
        "summary": "Image analysis is unavailable without an API key — showing a placeholder response.",
        "reasoning": (
            "Mock reasoning: the image could not be analyzed because the MiniMax vision "
            "model is not available in this environment. In production, the model would "
            "extract the article text from the screenshot and evaluate its credibility."
            + (f" Last error: {note}" if note else "")
        ),
        "red_flags": ["No AI analysis performed (mock mode)"],
        "extracted_text": "[Image text extraction unavailable in mock mode]",
    }


async def analyze_image_with_llm(image_base64: str, context: str = "", mime_type: str = "image/png") -> Dict:
    if not client:
        return _image_mock_response()

    if image_base64.startswith("data:"):
        data_url = image_base64
    else:
        data_url = f"data:{mime_type or 'image/png'};base64,{image_base64}"

    system_prompt = (
        "You are a fake news detection expert. Analyze this image of a news article "
        "or social media post. Extract all visible text and claims from the image. "
        "Evaluate the credibility of the content. Respond in JSON only: "
        "{ \"verdict\": \"REAL\" | \"FAKE\" | \"UNCERTAIN\", "
        "\"confidence\": 0-100, \"reasoning\": string, \"red_flags\": string[], "
        "\"extracted_text\": string, \"summary\": string }. "
        "Do not include markdown fences."
    )

    user_text = (context.strip() + "\n\n" if context and context.strip() else "") + \
                "Analyze the image and return only the JSON object described."

    user_content = [
        {"type": "text", "text": user_text},
        {"type": "image_url", "image_url": {"url": data_url}},
    ]

    last_error = ""
    for model_name in VISION_MODELS_TO_TRY:
        try:
            logger.info(f"Image analysis: attempting {model_name}...")
            response = await client.chat.completions.create(
                model=model_name,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_content},
                ],
                temperature=0.3,
                max_tokens=1024,
            )
            text = response.choices[0].message.content.strip()

            if "```json" in text:
                text = text.split("```json")[1].split("```")[0].strip()
            elif "```" in text:
                text = text.split("```")[1].split("```")[0].strip()

            parsed = json.loads(text)
            parsed["verdict"] = _normalize_image_verdict(parsed.get("verdict"))
            if "confidence_score" not in parsed:
                parsed["confidence_score"] = int(parsed.get("confidence", 0) or 0)
            parsed.setdefault("red_flags", [])
            parsed.setdefault("reasoning", "")
            parsed.setdefault("summary", "")
            parsed.setdefault("extracted_text", "")
            return parsed

        except Exception as e:
            last_error = str(e)
            logger.warning(f"Image model {model_name} failed: {last_error}")
            continue

    return {
        "verdict": "Mixed",
        "confidence_score": 0,
        "summary": "AI vision model was busy or unavailable.",
        "reasoning": f"Exhausted all vision models. Last error: {last_error}",
        "red_flags": [],
        "extracted_text": "",
    }


async def chat_about_results(question: str, history: List[Dict], results: Dict) -> str:
    if not client:
        raise RuntimeError("AI chat is unavailable: MINIMAX_API_KEY not configured.")

    system_prompt = (
        "You are a helpful assistant. The user is viewing their news credibility "
        "analysis results below. Answer questions about these results clearly and "
        "concisely. Reference specific values (verdict, confidence score, red flags, "
        "source credibility, reasoning) when relevant. Do not invent facts beyond "
        "what the results contain. If the user asks something the results cannot "
        "answer, say so plainly.\n\n"
        f"Results data:\n{json.dumps(results, indent=2, default=str)}"
    )

    capped_history = history[-20:]
    chat_messages: List[Dict] = [{"role": "system", "content": system_prompt}]
    for m in capped_history:
        role = m.get("role")
        if role in ("user", "assistant"):
            chat_messages.append({"role": role, "content": m.get("content", "")})
    chat_messages.append({"role": "user", "content": question})

    last_error = ""
    for model_name in MODELS_TO_TRY:
        try:
            logger.info(f"Chat: attempting {model_name}...")
            response = await client.chat.completions.create(
                model=model_name,
                messages=chat_messages,
                temperature=0.5,
                max_tokens=512,
            )
            return response.choices[0].message.content.strip()
        except Exception as e:
            last_error = str(e)
            logger.warning(f"Chat model {model_name} failed: {last_error}")
            continue

    raise RuntimeError(f"All MiniMax chat models failed. Last error: {last_error}")
