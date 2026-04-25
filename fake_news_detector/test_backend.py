"""Tests for the Fake News Detector backend."""
import pytest
import json
import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

from utils import detect_red_flags
from credibility import get_domain_credibility
from models import AnalyzeRequest, AnalyzeResponse, SourceCredibility, FactCheck


# --- utils.py tests ---

class TestDetectRedFlags:
    def test_clickbait_detected(self):
        flags = detect_red_flags("You won't believe what happened!", "Some text", ["Author"])
        assert any("Clickbait" in f for f in flags)

    def test_all_caps_headline(self):
        flags = detect_red_flags("THIS IS AN ALL CAPS HEADLINE", "Normal text", ["Author"])
        assert "ALL CAPS headline detected" in flags

    def test_excessive_punctuation(self):
        flags = detect_red_flags("Breaking!!!", "Normal text", ["Author"])
        assert "Excessive punctuation (!!! or ???) detected" in flags

    def test_no_author(self):
        flags = detect_red_flags("Normal title", "Normal text", [])
        assert "Lack of specific author attribution" in flags

    def test_admin_author(self):
        flags = detect_red_flags("Normal title", "Normal text", ["admin"])
        assert "Lack of specific author attribution" in flags

    def test_emotional_language(self):
        flags = detect_red_flags(
            "Terrible disaster",
            "This is a terrible, horrific, unbelievable event",
            ["Author"]
        )
        assert "Emotionally loaded language detected" in flags

    def test_clean_article(self):
        flags = detect_red_flags(
            "Local election results announced",
            "The results of the local election were announced today by officials.",
            ["Jane Smith"]
        )
        assert len(flags) == 0

    def test_question_marks_pattern(self):
        flags = detect_red_flags("What??!", "Some content", ["Author"])
        assert any("Clickbait" in f for f in flags)


# --- credibility.py tests ---

class TestGetDomainCredibility:
    def test_known_domain(self):
        result = get_domain_credibility("bbc.com")
        assert result["rating"] == "high"
        assert result["domain"] == "bbc.com"

    def test_known_domain_with_www(self):
        result = get_domain_credibility("www.reuters.com")
        assert result["rating"] == "high"
        assert result["domain"] == "reuters.com"

    def test_unknown_domain(self):
        result = get_domain_credibility("unknownnews123.com")
        assert result["rating"] == "unknown"
        assert result["bias"] == "unknown"

    def test_low_rated_domain(self):
        result = get_domain_credibility("infowars.com")
        assert result["rating"] == "low"

    def test_empty_domain(self):
        result = get_domain_credibility("")
        assert result["rating"] == "unknown"


# --- models.py tests ---

class TestModels:
    def test_analyze_request_url_only(self):
        req = AnalyzeRequest(url="https://example.com")
        assert req.url == "https://example.com"
        assert req.text is None

    def test_analyze_request_text_only(self):
        req = AnalyzeRequest(text="Some news text")
        assert req.url is None
        assert req.text == "Some news text"

    def test_analyze_response_serialization(self):
        resp = AnalyzeResponse(
            verdict="True",
            confidence_score=85,
            summary="Appears credible",
            red_flags=[],
            source_credibility=SourceCredibility(
                domain="bbc.com", rating="high", bias="center-left"
            ),
            fact_checks=[],
            reasoning="Detailed reasoning"
        )
        data = resp.model_dump()
        assert data["verdict"] == "True"
        assert data["confidence_score"] == 85

    def test_fact_check_model(self):
        fc = FactCheck(claim="test claim", status="True", source="Reuters")
        assert fc.url is None
        assert fc.claim == "test claim"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
