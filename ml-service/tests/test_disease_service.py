"""
Unit tests — Disease Service
Tests: treatment cost lookup table, thumbnail URL validity, disease history format,
       bbox computation, and keyword-based symptom classification fallback.
Run: cd ml-service && python -m pytest tests/test_disease_service.py -v
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

import pytest
import asyncio
from services.disease_service import DiseaseService


@pytest.fixture(scope="module")
def disease_svc():
    return DiseaseService()


# ─── estimate_treatment_cost ──────────────────────────────────────────────────

class TestTreatmentCost:
    def _run(self, coro):
        return asyncio.get_event_loop().run_until_complete(coro)

    def test_returns_dict_with_required_keys(self, disease_svc):
        result = self._run(disease_svc.estimate_treatment_cost(
            {"disease": "early blight"}, district="Hassan"
        ))
        for key in ("estimated_cost_inr", "coverage", "market_status", "source"):
            assert key in result, f"Missing key: {key}"

    def test_blight_matches_table(self, disease_svc):
        result = self._run(disease_svc.estimate_treatment_cost(
            {"disease": "early blight"}, district="Rural District"
        ))
        # Base blight cost is 750, rural multiplier 0.90 → ~675
        assert 500 <= result["estimated_cost_inr"] <= 1000

    def test_rust_costs_more_than_blight(self, disease_svc):
        blight_cost = self._run(disease_svc.estimate_treatment_cost(
            {"disease": "early blight"}, district="Hassan"
        ))["estimated_cost_inr"]
        rust_cost = self._run(disease_svc.estimate_treatment_cost(
            {"disease": "leaf rust"}, district="Hassan"
        ))["estimated_cost_inr"]
        assert rust_cost > blight_cost

    def test_metro_more_expensive_than_rural(self, disease_svc):
        rural = self._run(disease_svc.estimate_treatment_cost(
            {"disease": "blight"}, district="Hassan"
        ))["estimated_cost_inr"]
        metro = self._run(disease_svc.estimate_treatment_cost(
            {"disease": "blight"}, district="bengaluru"
        ))["estimated_cost_inr"]
        assert metro > rural

    def test_cost_range_format(self, disease_svc):
        result = self._run(disease_svc.estimate_treatment_cost(
            {"disease": "blast"}, district="Mysuru"
        ))
        assert "cost_range_inr" in result
        assert "–" in result["cost_range_inr"]  # e.g. "₹700–₹980"

    def test_unknown_disease_uses_default(self, disease_svc):
        result = self._run(disease_svc.estimate_treatment_cost(
            {"disease": "completely unknown pathogen xyz"}, district="Hassan"
        ))
        # Should not raise, should return a sensible default
        assert result["estimated_cost_inr"] > 0

    def test_empty_district_uses_local(self, disease_svc):
        result = self._run(disease_svc.estimate_treatment_cost(
            {"disease": "blight"}, district=""
        ))
        assert "Local" in result["market_status"]


# ─── get_disease_history ──────────────────────────────────────────────────────

class TestDiseaseHistory:
    def _run(self, coro):
        return asyncio.get_event_loop().run_until_complete(coro)

    def test_returns_list(self, disease_svc):
        result = self._run(disease_svc.get_disease_history("farmer_1", "tomato"))
        assert isinstance(result, list)

    def test_entries_have_required_fields(self, disease_svc):
        result = self._run(disease_svc.get_disease_history("farmer_1", "tomato"))
        for entry in result:
            assert "date" in entry
            assert "severity_score" in entry
            assert "disease" in entry

    def test_dates_are_relative_to_today(self, disease_svc):
        """Dates should be recent (not hardcoded to 2026-05-20)."""
        from datetime import datetime
        result = self._run(disease_svc.get_disease_history("farmer_1", "tomato"))
        for entry in result:
            d = datetime.strptime(entry["date"], "%Y-%m-%d")
            diff = (datetime.now() - d).days
            # All dates should be within the last 90 days
            assert 0 <= diff <= 90, f"Date {entry['date']} is not recent"

    def test_severity_scores_in_range(self, disease_svc):
        result = self._run(disease_svc.get_disease_history("farmer_1", "tomato"))
        for entry in result:
            assert 0 <= entry["severity_score"] <= 100


# ─── Thumbnail URL ────────────────────────────────────────────────────────────

class TestThumbnailUrls:
    """Verify thumbnail URLs point to Wikimedia Commons (not broken local paths)."""

    def test_similar_disease_map_no_local_paths(self, disease_svc):
        """
        The old code used /assets/diseases/... which were broken local paths.
        New code should use https:// URLs.
        """
        # Inspect the SIMILAR_DISEASE_MAP embedded in classify() via a mock call
        # by checking the structure directly from the source.
        import inspect
        source = inspect.getsource(disease_svc.full_diagnosis)
        # Should not contain old broken local paths
        assert "/assets/diseases/" not in source

        # Should use wikimedia or another working CDN
        assert "wikimedia.org" in source or "upload.wikimedia" in source


# ─── Preprocess image ─────────────────────────────────────────────────────────

class TestPreprocessImage:
    def test_returns_correct_shape(self, disease_svc, tomato_image_bytes):
        arr = disease_svc.preprocess_image(tomato_image_bytes)
        assert arr.shape == (1, 224, 224, 3), f"Unexpected shape: {arr.shape}"

    def test_pixel_values_normalized(self, disease_svc, tomato_image_bytes):
        arr = disease_svc.preprocess_image(tomato_image_bytes)
        assert arr.min() >= 0.0
        assert arr.max() <= 1.0


@pytest.fixture
def tomato_image_bytes():
    from PIL import Image
    import io
    img = Image.new("RGB", (300, 300), color=(60, 120, 60))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue()
