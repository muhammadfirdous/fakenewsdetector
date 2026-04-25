"""Internet-verification pipeline.

Orchestrates an end-to-end "verify against the web" flow that complements the
existing one-shot analyzer. Each step is wrapped so a single failure cannot
kill the pipeline — partial results still get streamed to the client.
"""

import asyncio
import json
import logging
import os
import re
from typing import Any, AsyncGenerator, Dict, List, Optional
from urllib.parse import urlparse

import httpx

from analyzer import client as minimax_client, MODELS_TO_TRY, VISION_MODELS_TO_TRY

logger = logging.getLogger(__name__)

BRAVE_API_KEY = os.getenv("BRAVE_SEARCH_API_KEY", "")
BRAVE_ENDPOINT = "https://api.search.brave.com/res/v1/web/search"

REPUTABLE_OUTLETS = [
    "reuters.com", "apnews.com", "bbc.com", "bbc.co.uk", "afp.com",
    "npr.org", "pbs.org", "theguardian.com", "nytimes.com", "washingtonpost.com",
    "wsj.com", "ft.com", "bloomberg.com", "economist.com", "axios.com",
]

FACT_CHECK_SITES = [
    "snopes.com", "politifact.com", "factcheck.org",
    "factcheck.afp.com", "reuters.com/fact-check", "leadstories.com",
    "fullfact.org", "checkyourfact.com",
]

DISCLAIMER = (
    "AI-assisted analysis. Results are not definitive — always verify through "
    "trusted sources."
)


# ---------------------------------------------------------------------------
# Web search (Brave) with mock fallback
# ---------------------------------------------------------------------------

async def web_search(query: str, count: int = 5, timeout: float = 8.0) -> List[Dict[str, str]]:
    """Return [{title, url, snippet, age}] for a Brave search query.

    Falls back to an empty list when no API key is configured. Callers must
    handle that case gracefully — the LLM steps still run and produce a
    "no-evidence" verdict.
    """
    if not BRAVE_API_KEY:
        return []
    headers = {
        "Accept": "application/json",
        "X-Subscription-Token": BRAVE_API_KEY,
    }
    params = {"q": query, "count": count, "safesearch": "moderate"}
    try:
        async with httpx.AsyncClient(timeout=timeout) as http:
            resp = await http.get(BRAVE_ENDPOINT, headers=headers, params=params)
            resp.raise_for_status()
            payload = resp.json()
    except Exception as e:
        logger.warning(f"Brave search failed for '{query[:60]}': {e}")
        return []

    results = []
    for item in (payload.get("web", {}).get("results", []) or [])[:count]:
        results.append({
            "title": item.get("title", "") or "",
            "url": item.get("url", "") or "",
            "snippet": (item.get("description") or "").replace("<strong>", "").replace("</strong>", ""),
            "age": item.get("age", "") or "",
        })
    return results


# ---------------------------------------------------------------------------
# LLM helpers
# ---------------------------------------------------------------------------

async def _llm_json(system: str, user: str, models=MODELS_TO_TRY,
                    temperature: float = 0.3, max_tokens: int = 1024) -> Dict[str, Any]:
    """Run a JSON-mode LLM call against the existing MiniMax client.

    Returns {} when the client is missing or every model fails; callers should
    treat empty dict as "no-data" and continue the pipeline.
    """
    if not minimax_client:
        return {}
    last_error = ""
    for model in models:
        try:
            resp = await minimax_client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": system},
                    {"role": "user", "content": user},
                ],
                temperature=temperature,
                max_tokens=max_tokens,
            )
            text = (resp.choices[0].message.content or "").strip()
            if "```json" in text:
                text = text.split("```json", 1)[1].split("```", 1)[0].strip()
            elif "```" in text:
                text = text.split("```", 1)[1].split("```", 1)[0].strip()
            try:
                return json.loads(text)
            except json.JSONDecodeError:
                m = re.search(r"\{.*\}", text, re.DOTALL)
                if m:
                    return json.loads(m.group(0))
                raise
        except Exception as e:
            last_error = str(e)
            logger.warning(f"_llm_json model {model} failed: {last_error}")
            continue
    logger.error(f"_llm_json: all models exhausted. Last: {last_error}")
    return {}


async def _llm_vision_json(system: str, text: str, data_url: str,
                           temperature: float = 0.3, max_tokens: int = 1024) -> Dict[str, Any]:
    if not minimax_client:
        return {}
    user_content = [
        {"type": "text", "text": text},
        {"type": "image_url", "image_url": {"url": data_url}},
    ]
    last_error = ""
    for model in VISION_MODELS_TO_TRY:
        try:
            resp = await minimax_client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": system},
                    {"role": "user", "content": user_content},
                ],
                temperature=temperature,
                max_tokens=max_tokens,
            )
            text_out = (resp.choices[0].message.content or "").strip()
            if "```json" in text_out:
                text_out = text_out.split("```json", 1)[1].split("```", 1)[0].strip()
            elif "```" in text_out:
                text_out = text_out.split("```", 1)[1].split("```", 1)[0].strip()
            return json.loads(text_out)
        except Exception as e:
            last_error = str(e)
            logger.warning(f"_llm_vision_json model {model} failed: {last_error}")
            continue
    logger.error(f"_llm_vision_json: all models exhausted. Last: {last_error}")
    return {}


# ---------------------------------------------------------------------------
# Step 1 — Extract Claims & Entities
# ---------------------------------------------------------------------------

async def extract_claims_and_entities(title: str, text: str) -> Dict[str, Any]:
    if not text and not title:
        return {"claims": [], "entities": {"people": [], "organizations": [], "dates": [], "locations": [], "numbers": []}}

    system = (
        "You are an editorial assistant that extracts factual claims and named "
        "entities from a news article. Return ONLY JSON in this exact shape: "
        "{ \"claims\": string[], \"entities\": { \"people\": string[], "
        "\"organizations\": string[], \"dates\": string[], \"locations\": string[], "
        "\"numbers\": string[] } }. Pick at most 6 of the most distinct, "
        "verifiable claims. Skip opinions and rhetorical questions."
    )
    user = f"TITLE: {title}\n\nTEXT:\n{(text or '')[:4000]}"
    data = await _llm_json(system, user, max_tokens=900)
    claims = [c for c in (data.get("claims") or []) if isinstance(c, str) and c.strip()]
    entities = data.get("entities") or {}
    for k in ("people", "organizations", "dates", "locations", "numbers"):
        entities.setdefault(k, [])
    return {"claims": claims[:6], "entities": entities}


# ---------------------------------------------------------------------------
# Step 2 — Source Credibility (web-augmented)
# ---------------------------------------------------------------------------

async def assess_source_web(domain: str, title: str, baseline: Dict[str, Any]) -> Dict[str, Any]:
    """Augment the local credibility lookup with a web search summary."""
    out = {
        "domain": domain,
        "rating": baseline.get("rating", "unknown"),
        "bias": baseline.get("bias", "unknown"),
        "description": baseline.get("description", ""),
        "evidence": [],
        "reasoning": "",
    }
    if not domain:
        out["reasoning"] = "No source domain available (text or image submission)."
        return out

    queries = [
        f"{domain} credibility rating",
        f"{domain} media bias",
    ]
    evidence: List[Dict[str, str]] = []
    for q in queries:
        evidence.extend(await web_search(q, count=4))
    out["evidence"] = evidence[:6]

    if not evidence:
        out["reasoning"] = (
            "No web evidence retrieved (search disabled or empty results). "
            f"Falling back to local rating: {out['rating']}."
        )
        return out

    system = (
        "You assess news source credibility from search results. Return ONLY "
        "JSON: { \"rating\": \"high\" | \"mixed\" | \"low\" | \"unknown\", "
        "\"bias\": string, \"reasoning\": string }. Be concise (max 2 sentences "
        "for reasoning)."
    )
    user = json.dumps({
        "domain": domain,
        "title_being_assessed": title or "",
        "search_results": evidence[:6],
        "local_baseline": {"rating": out["rating"], "bias": out["bias"]},
    }, ensure_ascii=False)[:4000]
    verdict = await _llm_json(system, user, max_tokens=400)
    if verdict:
        out["rating"] = verdict.get("rating") or out["rating"]
        out["bias"] = verdict.get("bias") or out["bias"]
        out["reasoning"] = verdict.get("reasoning") or out["reasoning"]
    return out


# ---------------------------------------------------------------------------
# Step 3 — Verify each claim
# ---------------------------------------------------------------------------

async def verify_claim(claim: str, entities: Dict[str, Any]) -> Dict[str, Any]:
    primary = await web_search(claim, count=5)
    reputable_query = f"{claim} (site:reuters.com OR site:apnews.com OR site:bbc.com OR site:afp.com)"
    reputable = await web_search(reputable_query, count=5)

    combined: List[Dict[str, str]] = []
    seen = set()
    for r in reputable + primary:
        u = r.get("url", "")
        if u and u not in seen:
            seen.add(u)
            combined.append(r)

    if not combined:
        return {
            "claim": claim,
            "verdict": "Unconfirmed",
            "confidence": 30,
            "reasoning": "No web evidence retrieved.",
            "evidence_for": [],
            "evidence_against": [],
            "sources": [],
        }

    system = (
        "You evaluate whether a claim is supported by web search results. "
        "Return ONLY JSON: { \"verdict\": \"Confirmed\" | \"Unconfirmed\" | "
        "\"Disputed\" | \"False\", \"confidence\": 0-100, \"reasoning\": string, "
        "\"evidence_for\": [{\"title\":string,\"url\":string,\"snippet\":string}], "
        "\"evidence_against\": [{\"title\":string,\"url\":string,\"snippet\":string}] }. "
        "Use only items from the provided search_results. Never fabricate URLs. "
        "Keep reasoning under 2 sentences."
    )
    user = json.dumps({
        "claim": claim,
        "key_entities": entities,
        "search_results": combined[:8],
    }, ensure_ascii=False)[:5000]
    verdict = await _llm_json(system, user, max_tokens=600)

    if not verdict:
        return {
            "claim": claim,
            "verdict": "Unconfirmed",
            "confidence": 30,
            "reasoning": "LLM evaluation unavailable.",
            "evidence_for": combined[:3],
            "evidence_against": [],
            "sources": [r["url"] for r in combined[:5] if r.get("url")],
        }

    sources = []
    for bucket in (verdict.get("evidence_for") or [], verdict.get("evidence_against") or []):
        for item in bucket:
            u = item.get("url")
            if u and u not in sources:
                sources.append(u)

    return {
        "claim": claim,
        "verdict": verdict.get("verdict") or "Unconfirmed",
        "confidence": int(verdict.get("confidence") or 0),
        "reasoning": verdict.get("reasoning") or "",
        "evidence_for": (verdict.get("evidence_for") or [])[:3],
        "evidence_against": (verdict.get("evidence_against") or [])[:3],
        "sources": sources[:6],
    }


async def verify_all_claims(claims: List[str], entities: Dict[str, Any]) -> List[Dict[str, Any]]:
    if not claims:
        return []
    tasks = [verify_claim(c, entities) for c in claims]
    return await asyncio.gather(*tasks, return_exceptions=False)


# ---------------------------------------------------------------------------
# Step 4 — Existing fact-checker hits
# ---------------------------------------------------------------------------

async def find_fact_checks_web(headline: str, claims: List[str]) -> List[Dict[str, str]]:
    base_query = (headline or (claims[0] if claims else "")).strip()
    if not base_query:
        return []
    sites_filter = " OR ".join(f"site:{s}" for s in FACT_CHECK_SITES)
    queries = [
        f"{base_query} fact check",
        f"{base_query} ({sites_filter})",
    ]
    if claims:
        queries.append(f"{claims[0]} debunked")

    seen: set = set()
    results: List[Dict[str, str]] = []
    for q in queries:
        for r in await web_search(q, count=5):
            url = r.get("url", "")
            host = urlparse(url).netloc.lower().lstrip("www.")
            is_fc_site = any(host.endswith(s) for s in FACT_CHECK_SITES)
            if url and url not in seen and is_fc_site:
                seen.add(url)
                results.append({
                    "source": host,
                    "claim": r.get("title", ""),
                    "status": _infer_fact_check_status(r.get("title", "") + " " + r.get("snippet", "")),
                    "url": url,
                    "snippet": r.get("snippet", ""),
                })
        if len(results) >= 5:
            break
    return results[:5]


def _infer_fact_check_status(blob: str) -> str:
    low = blob.lower()
    if any(w in low for w in ("false", "debunk", "hoax", "fake", "no evidence", "misleading")):
        return "False"
    if any(w in low for w in ("true", "correct", "accurate", "confirmed")):
        return "True"
    if any(w in low for w in ("partly", "mostly", "mixed", "out of context")):
        return "Mixed"
    return "Reviewed"


# ---------------------------------------------------------------------------
# Step 5 — Spread / cross-platform analysis
# ---------------------------------------------------------------------------

async def analyze_spread(headline: str, claims: List[str]) -> Dict[str, Any]:
    base = (headline or (claims[0] if claims else "")).strip()
    if not base:
        return {"pattern": "unknown", "mainstream_count": 0, "fringe_count": 0,
                "reasoning": "No headline to search.", "sources": []}

    queries = [
        base,
        f"{base} reddit",
        f"{base} viral misinformation",
    ]
    all_hits: List[Dict[str, str]] = []
    seen = set()
    for q in queries:
        for r in await web_search(q, count=5):
            u = r.get("url", "")
            if u and u not in seen:
                seen.add(u)
                all_hits.append(r)

    mainstream = [r for r in all_hits if any(o in (r.get("url") or "") for o in REPUTABLE_OUTLETS)]
    fringe = [r for r in all_hits if r not in mainstream]
    if not all_hits:
        pattern = "unknown"
        reasoning = "No web evidence retrieved."
    elif len(mainstream) >= 2:
        pattern = "mainstream"
        reasoning = f"Covered by {len(mainstream)} reputable outlet(s); appears in mainstream news."
    elif len(mainstream) == 1:
        pattern = "limited mainstream"
        reasoning = "Limited mainstream pickup; mostly secondary sources."
    else:
        pattern = "fringe-only"
        reasoning = "No reputable-outlet coverage found in the top results."

    return {
        "pattern": pattern,
        "mainstream_count": len(mainstream),
        "fringe_count": len(fringe),
        "reasoning": reasoning,
        "sources": [r["url"] for r in all_hits[:8] if r.get("url")],
    }


# ---------------------------------------------------------------------------
# Step 6 — Image visual analysis
# ---------------------------------------------------------------------------

async def analyze_image_visual(image_base64: str, mime_type: str, ocr_text: str) -> Dict[str, Any]:
    if not image_base64:
        return {"description": "", "claims": [], "sources": []}
    data_url = image_base64 if image_base64.startswith("data:") else f"data:{mime_type or 'image/png'};base64,{image_base64}"

    system = (
        "You are an image analyst. Look at the screenshot of a news article or "
        "social-media post and return ONLY JSON: { \"description\": string "
        "(<=2 sentences describing what's depicted), \"visible_claims\": string[] "
        "(distinct factual claims visible in the image — empty if none) }."
    )
    parsed = await _llm_vision_json(system, "Describe and extract claims.", data_url, max_tokens=600)
    description = parsed.get("description") or ""
    visible_claims = [c for c in (parsed.get("visible_claims") or []) if isinstance(c, str) and c.strip()]

    sources: List[Dict[str, str]] = []
    if description:
        for query in (
            f"{description[:120]} original source",
            f"{description[:120]} fake OR manipulated OR old photo",
        ):
            sources.extend(await web_search(query, count=3))

    return {
        "description": description,
        "claims": visible_claims[:5],
        "ocr_text": (ocr_text or "")[:1500],
        "sources": sources[:6],
    }


# ---------------------------------------------------------------------------
# Step 7 — Detailed red flags via LLM
# ---------------------------------------------------------------------------

async def detect_red_flags_llm(title: str, text: str) -> List[Dict[str, str]]:
    if not text and not title:
        return []
    system = (
        "You are a media-literacy editor. Inspect the article for red flags and "
        "return ONLY JSON: { \"flags\": [{\"category\": string, \"severity\": "
        "\"critical\"|\"high\"|\"moderate\"|\"low\", \"description\": string}] }. "
        "Categories to consider: clickbait, emotional manipulation, missing "
        "attribution, ALL CAPS / excessive punctuation, conspiracy language, "
        "logical fallacy, misleading statistics, anonymous-experts. Only flag "
        "what's actually present. Up to 6 flags."
    )
    user = f"TITLE: {title}\n\nTEXT:\n{(text or '')[:3500]}"
    data = await _llm_json(system, user, max_tokens=600, temperature=0.2)
    flags = []
    for f in (data.get("flags") or [])[:6]:
        if not isinstance(f, dict):
            continue
        flags.append({
            "category": str(f.get("category", "")).strip() or "Other",
            "severity": str(f.get("severity", "moderate")).lower(),
            "description": str(f.get("description", "")).strip(),
        })
    return flags


# ---------------------------------------------------------------------------
# Step 8 — Final synthesis
# ---------------------------------------------------------------------------

async def synthesize_final_verdict(
    title: str,
    text: str,
    claim_results: List[Dict[str, Any]],
    fact_checks_web: List[Dict[str, str]],
    spread: Dict[str, Any],
    source_assessment: Dict[str, Any],
    red_flags_detailed: List[Dict[str, str]],
    image_visual: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    system = (
        "You are TruthLens, an editorial AI that synthesizes a final credibility "
        "verdict. Return ONLY JSON: { \"verdict\": \"Verified\" | \"Likely Real\" "
        "| \"Unverified\" | \"Likely Fake\" | \"Misleading\", \"confidence\": "
        "0-100, \"summary\": string (1-2 sentences), \"reasoning\": string "
        "(2-4 short paragraphs separated by \\n\\n) }. Map confidence to "
        "verdict: 75-100 -> Verified/Likely Real; 40-74 -> Unverified; "
        "0-39 -> Likely Fake/Misleading. Cite specific findings from the input."
    )
    payload = {
        "title": title,
        "snippet": (text or "")[:1200],
        "source_assessment": source_assessment,
        "claim_results": claim_results,
        "existing_fact_checks": fact_checks_web,
        "spread_analysis": spread,
        "red_flags": red_flags_detailed,
    }
    if image_visual:
        payload["image_visual"] = {
            "description": image_visual.get("description", ""),
            "visible_claims": image_visual.get("claims", []),
        }
    user = json.dumps(payload, ensure_ascii=False)[:6000]
    data = await _llm_json(system, user, max_tokens=900, temperature=0.4)
    if not data:
        return {
            "verdict": "Unverified",
            "confidence": 0,
            "summary": "Could not synthesize a verdict (LLM unavailable).",
            "reasoning": "",
        }
    return {
        "verdict": data.get("verdict") or "Unverified",
        "confidence": int(data.get("confidence") or 0),
        "summary": data.get("summary") or "",
        "reasoning": data.get("reasoning") or "",
    }


# ---------------------------------------------------------------------------
# Orchestrator
# ---------------------------------------------------------------------------

PIPELINE_PHASES = [
    ("extract_claims", "Extracting claims"),
    ("source_credibility", "Checking source credibility"),
    ("verify_claims", "Verifying claims against online sources"),
    ("fact_check_db", "Searching fact-checker databases"),
    ("spread", "Analyzing spread pattern"),
    ("image_visual", "Analyzing image"),
    ("red_flags", "Detecting red flags"),
    ("final_verdict", "Generating final verdict"),
]


def _phases_for(input_kind: str) -> List[Dict[str, str]]:
    visible = []
    for key, label in PIPELINE_PHASES:
        if key == "image_visual" and input_kind != "image":
            continue
        visible.append({"key": key, "label": label})
    return visible


async def run_verification_pipeline(
    *,
    input_kind: str,
    title: str = "",
    text: str = "",
    domain: str = "",
    image_base64: str = "",
    mime_type: str = "image/png",
    context: str = "",
    baseline_credibility: Optional[Dict[str, Any]] = None,
    baseline_fact_checks: Optional[List[Dict[str, str]]] = None,
    baseline_red_flags: Optional[List[str]] = None,
) -> AsyncGenerator[Dict[str, Any], None]:
    """Yield event dicts; consumer encodes each as SSE on the wire."""
    visible_phases = _phases_for(input_kind)

    yield {
        "step": "init",
        "status": "done",
        "data": {
            "phases": visible_phases,
            "search_enabled": bool(BRAVE_API_KEY),
            "input_kind": input_kind,
            "title": title,
            "domain": domain,
            "disclaimer": DISCLAIMER,
        },
    }

    # 1) Extract claims & entities ----------------------------------------
    yield {"step": "extract_claims", "status": "started"}
    try:
        claims_pkg = await extract_claims_and_entities(title, text)
    except Exception as e:
        logger.exception("extract_claims failed")
        yield {"step": "extract_claims", "status": "error", "error": str(e)}
        claims_pkg = {"claims": [], "entities": {"people": [], "organizations": [], "dates": [], "locations": [], "numbers": []}}
    else:
        yield {"step": "extract_claims", "status": "done", "data": claims_pkg}

    claims: List[str] = claims_pkg.get("claims", [])
    entities: Dict[str, Any] = claims_pkg.get("entities", {})

    # 2) Source credibility -----------------------------------------------
    yield {"step": "source_credibility", "status": "started"}
    try:
        source_assessment = await assess_source_web(domain, title, baseline_credibility or {})
    except Exception as e:
        logger.exception("source_credibility failed")
        yield {"step": "source_credibility", "status": "error", "error": str(e)}
        source_assessment = baseline_credibility or {}
    else:
        yield {"step": "source_credibility", "status": "done", "data": source_assessment}

    # 3) Claim verification (parallel) ------------------------------------
    yield {"step": "verify_claims", "status": "started", "data": {"total": len(claims)}}
    try:
        claim_results = await verify_all_claims(claims, entities)
    except Exception as e:
        logger.exception("verify_claims failed")
        yield {"step": "verify_claims", "status": "error", "error": str(e)}
        claim_results = []
    else:
        yield {"step": "verify_claims", "status": "done", "data": {"claims": claim_results}}

    # 4) Existing fact-check hits -----------------------------------------
    yield {"step": "fact_check_db", "status": "started"}
    try:
        fact_checks_web = await find_fact_checks_web(title, claims)
    except Exception as e:
        logger.exception("fact_check_db failed")
        yield {"step": "fact_check_db", "status": "error", "error": str(e)}
        fact_checks_web = []
    if baseline_fact_checks:
        existing_urls = {fc.get("url") for fc in fact_checks_web}
        for fc in baseline_fact_checks:
            if fc.get("url") and fc["url"] not in existing_urls:
                fact_checks_web.append(fc)
    yield {"step": "fact_check_db", "status": "done", "data": {"fact_checks": fact_checks_web}}

    # 5) Spread analysis --------------------------------------------------
    yield {"step": "spread", "status": "started"}
    try:
        spread = await analyze_spread(title, claims)
    except Exception as e:
        logger.exception("spread failed")
        yield {"step": "spread", "status": "error", "error": str(e)}
        spread = {"pattern": "unknown", "mainstream_count": 0, "fringe_count": 0,
                  "reasoning": "Spread analysis failed.", "sources": []}
    else:
        yield {"step": "spread", "status": "done", "data": spread}

    # 6) Image visual analysis (image input only) -------------------------
    image_visual: Optional[Dict[str, Any]] = None
    if input_kind == "image":
        yield {"step": "image_visual", "status": "started"}
        try:
            image_visual = await analyze_image_visual(image_base64, mime_type, text)
        except Exception as e:
            logger.exception("image_visual failed")
            yield {"step": "image_visual", "status": "error", "error": str(e)}
            image_visual = None
        else:
            yield {"step": "image_visual", "status": "done", "data": image_visual}

    # 7) Red flags --------------------------------------------------------
    yield {"step": "red_flags", "status": "started"}
    try:
        red_flags_detailed = await detect_red_flags_llm(title, text)
    except Exception as e:
        logger.exception("red_flags failed")
        yield {"step": "red_flags", "status": "error", "error": str(e)}
        red_flags_detailed = []
    if baseline_red_flags:
        existing = {f["description"].lower() for f in red_flags_detailed if f.get("description")}
        for raw in baseline_red_flags:
            if raw and raw.lower() not in existing:
                red_flags_detailed.append({
                    "category": "rule-based",
                    "severity": "moderate",
                    "description": raw,
                })
    yield {"step": "red_flags", "status": "done", "data": {"red_flags": red_flags_detailed}}

    # 8) Final synthesis --------------------------------------------------
    yield {"step": "final_verdict", "status": "started"}
    try:
        verdict_pkg = await synthesize_final_verdict(
            title=title,
            text=text,
            claim_results=claim_results,
            fact_checks_web=fact_checks_web,
            spread=spread,
            source_assessment=source_assessment,
            red_flags_detailed=red_flags_detailed,
            image_visual=image_visual,
        )
    except Exception as e:
        logger.exception("final_verdict failed")
        yield {"step": "final_verdict", "status": "error", "error": str(e)}
        verdict_pkg = {
            "verdict": "Unverified",
            "confidence": 0,
            "summary": "Final synthesis failed.",
            "reasoning": "",
        }
    else:
        yield {"step": "final_verdict", "status": "done", "data": verdict_pkg}

    # Aggregated source list ---------------------------------------------
    all_sources: List[str] = []
    seen_src: set = set()

    def _add(url: Optional[str]):
        if url and url not in seen_src:
            seen_src.add(url)
            all_sources.append(url)

    for ev in (source_assessment.get("evidence") or []):
        _add(ev.get("url"))
    for cr in claim_results:
        for u in cr.get("sources") or []:
            _add(u)
        for ev in (cr.get("evidence_for") or []) + (cr.get("evidence_against") or []):
            _add(ev.get("url"))
    for fc in fact_checks_web:
        _add(fc.get("url"))
    for u in (spread.get("sources") or []):
        _add(u)
    if image_visual:
        for src in (image_visual.get("sources") or []):
            _add(src.get("url") if isinstance(src, dict) else src)

    yield {
        "step": "complete",
        "status": "done",
        "data": {
            "verdict": verdict_pkg.get("verdict", "Unverified"),
            "confidence_score": verdict_pkg.get("confidence", 0),
            "summary": verdict_pkg.get("summary", ""),
            "reasoning": verdict_pkg.get("reasoning", ""),
            "claims_breakdown": claim_results,
            "entities": entities,
            "source_assessment": source_assessment,
            "fact_checks_web": fact_checks_web,
            "spread_analysis": spread,
            "image_visual": image_visual,
            "red_flags_detailed": red_flags_detailed,
            "all_sources": all_sources,
            "title": title,
            "domain": domain,
            "input_kind": input_kind,
            "search_enabled": bool(BRAVE_API_KEY),
            "disclaimer": DISCLAIMER,
        },
    }
