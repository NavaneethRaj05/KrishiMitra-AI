"""
Crop Recommendation Service with SHAP Explainability
Returns: recommended crop + SHAP values for each soil feature
"""
import base64
import io
import json
from pathlib import Path

import joblib
import matplotlib
import matplotlib.pyplot as plt
import numpy as np
import shap

matplotlib.use("Agg")

FEATURES = ["N", "P", "K", "temperature", "humidity", "ph", "rainfall"]
FEATURE_LABELS = {
    "N":           "Nitrogen (N)",
    "P":           "Phosphorus (P)",
    "K":           "Potassium (K)",
    "temperature": "Temperature",
    "humidity":    "Humidity",
    "ph":          "Soil pH",
    "rainfall":    "Rainfall",
}


class CropService:
    def __init__(self):
        service_dir = Path(__file__).resolve().parent
        ml_service_dir = service_dir.parent
        model_path  = ml_service_dir / "models" / "crop_model.joblib"
        labels_path = ml_service_dir / "models" / "crop_labels.json"

        if not model_path.exists():
            self.model     = None
            self.labels    = None
            self.explainer = None
            return

        self.model     = joblib.load(str(model_path))
        self.labels    = json.loads(labels_path.read_text())
        # SHAP explainer is lazy-loaded on first use to avoid version-compatibility
        # issues at startup (shap vs xgboost model format mismatches).
        self.explainer = None

    def _get_explainer(self):
        """Lazy-load SHAP explainer on first use."""
        if self.explainer is None and self.model is not None:
            try:
                # Use modern shap.Explainer with fallback to TreeExplainer
                try:
                    self.explainer = shap.Explainer(self.model)
                except Exception:
                    self.explainer = shap.TreeExplainer(self.model)
            except Exception as e:
                import logging
                logging.getLogger("krishimitraai.crop").error("SHAP explainer initialization failed: %s", e, exc_info=True)
                raise RuntimeError(f"SHAP explainer initialization failed: {e}") from e
        return self.explainer

    # ──────────────────────────────────────────
    def predict(self, soil_data: dict) -> dict:
        """Predict best crop and return SHAP explanation + chart."""
        if self.model is None or self.labels is None:
            raise RuntimeError("Crop model not found. Run scripts/train_crop_model.py first.")
        X = np.array([[soil_data[f] for f in FEATURES]], dtype=float)

        pred_idx   = int(self.model.predict(X)[0])
        pred_proba = self.model.predict_proba(X)[0]
        top3_idx   = np.argsort(pred_proba)[::-1][:3]

        explainer = self._get_explainer()
        if explainer is None:
            raise RuntimeError("SHAP explainer is unavailable for crop recommendation.")

        try:
            if hasattr(explainer, "shap_values"):
                shap_values = explainer.shap_values(X)
            else:
                shap_obj = explainer(X)
                shap_values = shap_obj.values

            if isinstance(shap_values, list):
                sv = shap_values[pred_idx][0]
            elif isinstance(shap_values, np.ndarray) and len(shap_values.shape) == 3:
                # Standard tree explainer multi-class output shape: (N, F, C) or (C, N, F)
                if shap_values.shape[0] == X.shape[0]:  # (N, F, C)
                    sv = shap_values[0, :, pred_idx]
                else:  # (C, N, F)
                    sv = shap_values[pred_idx, 0, :]
            elif isinstance(shap_values, np.ndarray) and len(shap_values.shape) == 2:
                sv = shap_values[0]
            else:
                sv = shap_values[0]
        except Exception as e:
            import logging
            logging.getLogger("krishimitraai.crop").error("SHAP calculation failed for input %s: %s", soil_data, e, exc_info=True)
            raise RuntimeError(f"SHAP explanation calculation failed: {e}") from e

        shap_dict = {
            FEATURES[i]: {
                "shap_value":    round(float(sv[i]), 4),
                "feature_value": round(float(X[0][i]), 2),
                "label":         FEATURE_LABELS[FEATURES[i]],
                "impact":        "positive" if sv[i] > 0 else "negative",
            }
            for i in range(len(FEATURES))
        }
        sorted_shap = sorted(
            shap_dict.items(),
            key=lambda x: abs(x[1]["shap_value"]),
            reverse=True,
        )
        chart_b64 = self._generate_shap_chart(sorted_shap, self.labels[pred_idx])

        explanation = self._generate_explanation(self.labels[pred_idx], sorted_shap)

        return {
            "recommended_crop": self.labels[pred_idx],
            "confidence":       round(float(pred_proba[pred_idx]) * 100, 1),
            "top3_crops": [
                {"crop": self.labels[i], "confidence": round(float(pred_proba[i]) * 100, 1)}
                for i in top3_idx
            ],
            "shap_values":    shap_dict,
            "shap_sorted":    sorted_shap,
            "explanation":    explanation,
            "shap_chart_b64": chart_b64,
        }

    # ──────────────────────────────────────────
    def _generate_explanation(self, crop: str, sorted_shap: list) -> str:
        top3  = sorted_shap[:3]
        parts = []
        for fname, fdata in top3:
            direction = "supports" if fdata["impact"] == "positive" else "reduces"
            parts.append(f"{fdata['label']} ({direction} recommendation)")
        return f"{crop} is recommended primarily because: {', '.join(parts)}."

    # ──────────────────────────────────────────
    def _generate_shap_chart(self, sorted_shap: list, crop: str) -> str:
        """Generate SHAP waterfall bar chart as base64 PNG."""
        fig, ax = plt.subplots(figsize=(8, 4))
        labels  = [s[1]["label"]      for s in sorted_shap]
        values  = [s[1]["shap_value"] for s in sorted_shap]
        colors  = ["#1E8449" if v > 0 else "#C0392B" for v in values]

        ax.barh(labels, values, color=colors, edgecolor="white", height=0.6)
        ax.axvline(x=0, color="#333", linewidth=0.8)
        ax.set_title(f"Why {crop}? — Feature Impact (SHAP)", fontsize=12, fontweight="bold")
        ax.set_xlabel("SHAP Value (impact on recommendation)")
        ax.spines["top"].set_visible(False)
        ax.spines["right"].set_visible(False)
        plt.tight_layout()

        buf = io.BytesIO()
        plt.savefig(buf, format="png", dpi=150, bbox_inches="tight")
        plt.close(fig)
        return base64.b64encode(buf.getvalue()).decode()


crop_service = CropService()
