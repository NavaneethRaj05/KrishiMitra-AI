"""
Unit tests — Crop Service
Tests: model prediction, SHAP values, explanation text, graceful missing-model behaviour.
Requires: ml-service/models/crop_model.joblib (already present in repo).
Run: cd ml-service && python -m pytest tests/test_crop_service.py -v
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

import pytest
import numpy as np
from services.crop_service import CropService, FEATURES


@pytest.fixture(scope="module")
def crop_svc():
    """Load CropService once for the module (model is 5 MB, avoid repeated loads)."""
    return CropService()


@pytest.fixture
def sample_soil():
    return {
        "N": 90.0, "P": 42.0, "K": 43.0,
        "temperature": 25.0, "humidity": 80.0,
        "ph": 6.5, "rainfall": 202.0,
    }


# ─── Model availability ───────────────────────────────────────────────────────

class TestModelAvailability:
    def test_model_loaded(self, crop_svc):
        """Crop model must be present — it was committed to the repo."""
        assert crop_svc.model is not None, (
            "crop_model.joblib not found in ml-service/models/. "
            "Run scripts/train_crop_model.py first."
        )

    def test_labels_loaded(self, crop_svc):
        assert crop_svc.labels is not None
        assert len(crop_svc.labels) >= 10  # Dataset has 22 crop classes

    def test_explainer_loaded(self, crop_svc):
        assert crop_svc.explainer is not None


# ─── Prediction output structure ─────────────────────────────────────────────

class TestPrediction:
    def test_predict_returns_dict(self, crop_svc, sample_soil):
        if crop_svc.model is None:
            pytest.skip("Model not available")
        result = crop_svc.predict(sample_soil)
        assert isinstance(result, dict)

    def test_required_keys_present(self, crop_svc, sample_soil):
        if crop_svc.model is None:
            pytest.skip("Model not available")
        result = crop_svc.predict(sample_soil)
        for key in ("recommended_crop", "confidence", "top3_crops", "shap_values", "explanation"):
            assert key in result, f"Missing key: {key}"

    def test_confidence_in_range(self, crop_svc, sample_soil):
        if crop_svc.model is None:
            pytest.skip("Model not available")
        result = crop_svc.predict(sample_soil)
        assert 0.0 <= result["confidence"] <= 100.0

    def test_top3_crops_count(self, crop_svc, sample_soil):
        if crop_svc.model is None:
            pytest.skip("Model not available")
        result = crop_svc.predict(sample_soil)
        assert len(result["top3_crops"]) == 3

    def test_top3_confidences_sum_to_100_or_less(self, crop_svc, sample_soil):
        if crop_svc.model is None:
            pytest.skip("Model not available")
        result = crop_svc.predict(sample_soil)
        total = sum(c["confidence"] for c in result["top3_crops"])
        assert total <= 100.1  # small float tolerance


# ─── SHAP values ─────────────────────────────────────────────────────────────

class TestShapValues:
    def test_all_features_have_shap(self, crop_svc, sample_soil):
        if crop_svc.model is None:
            pytest.skip("Model not available")
        result = crop_svc.predict(sample_soil)
        shap = result["shap_values"]
        for feature in FEATURES:
            assert feature in shap, f"Missing SHAP for feature: {feature}"

    def test_shap_impact_is_positive_or_negative(self, crop_svc, sample_soil):
        if crop_svc.model is None:
            pytest.skip("Model not available")
        result = crop_svc.predict(sample_soil)
        for feat, data in result["shap_values"].items():
            assert data["impact"] in ("positive", "negative"), \
                f"Unexpected impact value for {feat}: {data['impact']}"

    def test_shap_values_are_finite(self, crop_svc, sample_soil):
        if crop_svc.model is None:
            pytest.skip("Model not available")
        result = crop_svc.predict(sample_soil)
        for feat, data in result["shap_values"].items():
            val = data["shap_value"]
            assert np.isfinite(val), f"Non-finite SHAP for {feat}: {val}"


# ─── Explanation text ─────────────────────────────────────────────────────────

class TestExplanation:
    def test_explanation_mentions_crop(self, crop_svc, sample_soil):
        if crop_svc.model is None:
            pytest.skip("Model not available")
        result = crop_svc.predict(sample_soil)
        assert result["recommended_crop"].lower() in result["explanation"].lower()

    def test_explanation_is_string(self, crop_svc, sample_soil):
        if crop_svc.model is None:
            pytest.skip("Model not available")
        result = crop_svc.predict(sample_soil)
        assert isinstance(result["explanation"], str)
        assert len(result["explanation"]) > 20


# ─── Missing model graceful handling ─────────────────────────────────────────

class TestMissingModel:
    def test_predict_raises_runtime_error_when_model_none(self):
        svc = CropService.__new__(CropService)
        svc.model = None
        svc.explainer = None
        svc.labels = None
        with pytest.raises(RuntimeError, match="Crop model not found"):
            svc.predict({"N": 90, "P": 42, "K": 43, "temperature": 25,
                         "humidity": 80, "ph": 6.5, "rainfall": 202})


# ─── SHAP chart ──────────────────────────────────────────────────────────────

class TestShapChart:
    def test_shap_chart_is_base64_png(self, crop_svc, sample_soil):
        if crop_svc.model is None:
            pytest.skip("Model not available")
        result = crop_svc.predict(sample_soil)
        chart = result.get("shap_chart_b64", "")
        import base64
        # Should be decodable base64
        decoded = base64.b64decode(chart)
        # PNG magic bytes
        assert decoded[:4] == b"\x89PNG", "Chart is not a valid PNG"
