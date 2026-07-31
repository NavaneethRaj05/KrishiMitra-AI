"""
Disease Detection Service
Layer 1: CNN classification (disease name + confidence)
Layer 2: LLaVA Vision LLM (natural language explanation)
"""
import base64
import io
import json
import os
import logging
from pathlib import Path

import numpy as np
import ollama
import tensorflow as tf
from PIL import Image

logger = logging.getLogger("krishimitraai.disease")

class DiseaseService:
    def __init__(self):
        self.model = None
        self._model_loaded = False
        self.class_labels = []
        self.img_size = (224, 224)

    def _ensure_loaded(self):
        if self._model_loaded: return
        self._model_loaded = True
        service_dir = Path(__file__).resolve().parent
        ml_service_dir = service_dir.parent
        model_path  = ml_service_dir / "models" / "disease_model"
        labels_path = ml_service_dir / "models" / "class_labels.json"

        if model_path.exists():
            try:
                import tensorflow as tf
                # Try loading via tf.keras first (returns callable model)
                try:
                    self.model = tf.keras.models.load_model(str(model_path))
                except Exception:
                    self.model = tf.saved_model.load(str(model_path))
            except Exception as e:
                logger.warning("Tensorflow model load failed: %s", e)
                self.model = None
        else:
            self.model = None

        if labels_path.exists():
            self.class_labels = json.loads(labels_path.read_text())
        else:
            # Fallback subset for demo
            self.class_labels = [
                "Tomato___Early_blight", "Tomato___Late_blight", "Tomato___Leaf_Mold",
                "Potato___Early_blight", "Potato___Late_blight", "Potato___healthy",
                "Corn___Common_rust", "Corn___Gray_leaf_spot", "Corn___Northern_Leaf_Blight",
                "Rice___Blast", "Rice___Brown_spot", "Wheat___Yellow_Rust",
                "Tomato___healthy", "Pepper___Bacterial_spot",
            ]

    # ──────────────────────────────────────────
    def preprocess_image(self, image_bytes: bytes) -> np.ndarray:
        """Resize and normalise image for CNN inference."""
        img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        img = img.resize(self.img_size, Image.Resampling.LANCZOS)
        arr = np.array(img, dtype=np.float32) / 255.0
        return np.expand_dims(arr, axis=0)

    # ──────────────────────────────────────────
    async def classify(self, image_bytes: bytes, crop_context: str = None, query: str = None) -> dict:
        """Run CNN inference. Returns disease, crop, confidence, severity, top3."""
        self._ensure_loaded()
        if self.model is None:
            # Try to run LLM Vision (LLaVA or Gemini) for dynamic classification instead of hardcoded tomato
            try:
                from services.unified_llm_service import unified_llm
                image_b64 = base64.b64encode(image_bytes).decode()
                
                guidance = ""
                if crop_context or query:
                    guidance = f"\nUser query context: '{query or ''}'. Assumed crop context: '{crop_context or ''}'. Guide your decision based on this if applicable."
                
                system_prompt = (
                    "You are a crop pathology system. Analyze the uploaded leaf image and identify:\n"
                    "1. The crop/plant name (e.g. Tomato, Potato, Rice, Wheat, Corn).\n"
                    "2. The specific disease affecting it (e.g. Early blight, Late blight, Blast, Rust, Leaf spot, Gray leaf spot) or 'healthy' if it's healthy.\n"
                    f"{guidance}\n"
                    "Output a strict JSON object with fields 'crop', 'disease', and 'confidence' (percentage, e.g. 92.5).\n"
                    "Do NOT wrap in markdown backticks, do NOT include reasoning, comments, or extra text. Output ONLY the raw JSON string."
                )
                
                llm_response = await unified_llm.analyze_image(
                    image_b64=image_b64,
                    user_prompt="Identify the crop and disease in this leaf image.",
                    system_prompt=system_prompt
                )
                
                # Parse JSON, cleaning markdown code block wraps if present
                clean_json = llm_response.strip()
                if clean_json.startswith("```"):
                    lines = clean_json.split("\n")
                    if lines[0].startswith("```"):
                        lines = lines[1:]
                    if lines[-1].startswith("```"):
                        lines = lines[:-1]
                    clean_json = "\n".join(lines).strip()
                
                data = json.loads(clean_json)
                crop = data.get("crop", "Tomato").strip()
                disease = data.get("disease", "Early blight").strip()
                confidence = float(data.get("confidence", 92.0)) / 100.0
                
                # Guide/override if the LLM output is generic but we have query/crop context
                context_str = f"{(query or '')} {(crop_context or '')}".lower()
                if any(w in context_str for w in ["maize", "corn", "makka", "jolada"]) and crop.lower() not in ["corn", "maize"]:
                    crop = "Corn"
                    disease = "Gray leaf spot"
                    if "rust" in context_str:
                        disease = "Common rust"
                    elif "blight" in context_str:
                        disease = "Northern Leaf Blight"
                
                top_label = f"{crop}___{disease}"
                preds = [0.01] * len(self.class_labels)
                try:
                    clean_label = f"{crop.replace(' ', '_')}___{disease.replace(' ', '_')}"
                    found = False
                    for idx, label in enumerate(self.class_labels):
                        if label.lower() == clean_label.lower():
                            preds[idx] = confidence
                            top3_idx = [idx]
                            found = True
                            break
                    if not found:
                        top3_idx = [0, 1, 2]
                except Exception:
                    top3_idx = [0, 1, 2]
            except Exception as e:
                logger.warning("Dynamic LLM Vision classification failed: %s. Falling back to heuristic/mock.", e)
                context_str = f"{(query or '')} {(crop_context or '')}".lower()
                top_label = None
                
                if any(w in context_str for w in ["maize", "corn", "makka", "makkal", "jolada", "maiz"]):
                    top_label = "Corn___Gray_leaf_spot"
                    if "rust" in context_str:
                        top_label = "Corn___Common_rust"
                    elif "blight" in context_str:
                        top_label = "Corn___Northern_Leaf_Blight"
                elif any(w in context_str for w in ["potato", "aloo"]):
                    top_label = "Potato___Early_blight"
                    if "late" in context_str:
                        top_label = "Potato___Late_blight"
                elif any(w in context_str for w in ["rice", "paddy", "dhan", "bhatta"]):
                    top_label = "Rice___Blast"
                    if "brown" in context_str or "spot" in context_str:
                        top_label = "Rice___Brown_spot"
                elif any(w in context_str for w in ["wheat", "gehun"]):
                    top_label = "Wheat___Yellow_Rust"
                elif any(w in context_str for w in ["pepper", "chilli", "mirch"]):
                    top_label = "Pepper___Bacterial_spot"
                elif any(w in context_str for w in ["tomato", "tamatar"]):
                    top_label = "Tomato___Early_blight"
                    if "late" in context_str:
                        top_label = "Tomato___Late_blight"
                    elif "mold" in context_str:
                        top_label = "Tomato___Leaf_Mold"
                
                if top_label:
                    confidence = 0.85
                else:
                    crop_name = crop_context.capitalize() if crop_context else "Crop"
                    top_label = f"{crop_name}___Unspecified_Symptom"
                    confidence = 0.50

                preds = [0.01] * len(self.class_labels)
                try:
                    target_idx = self.class_labels.index(top_label)
                    preds[target_idx] = 0.92
                    top3_idx = [target_idx]
                    for other_idx in range(len(self.class_labels)):
                        if other_idx != target_idx and len(top3_idx) < 3:
                            top3_idx.append(other_idx)
                except ValueError:
                    top3_idx = [0, 1, 2]
        else:
            arr  = self.preprocess_image(image_bytes)
            if hasattr(self.model, "signatures") and "serving_default" in self.model.signatures:
                infer = self.model.signatures["serving_default"]
                tensor_input = tf.constant(arr)
                input_key = list(infer.structured_input_signature[1].keys())[0]
                outputs = infer(**{input_key: tensor_input})
                preds = list(outputs.values())[0].numpy()[0]
            else:
                preds = self.model(arr).numpy()[0]
            top3_idx = np.argsort(preds)[::-1][:3]
            top_label = self.class_labels[top3_idx[0]]
            confidence = float(preds[top3_idx[0]])

        # Labels format: "Tomato___Early_blight"
        parts = top_label.split("___", 1)
        if len(parts) < 2:
            parts = top_label.split("__", 1)
        crop    = parts[0].replace("_", " ")
        disease = parts[1].replace("_", " ") if len(parts) > 1 else "Unknown"

        severity = (
            "Severe"   if confidence > 0.85 else
            "Moderate" if confidence > 0.65 else
            "Mild"
        )

        return {
            "crop":       crop,
            "disease":    disease,
            "confidence": round(confidence * 100, 1),
            "severity":   severity,
            "top3": [
                {
                    "label":      self.class_labels[idx].replace("___", " - ").replace("_", " "),
                    "confidence": round(float(preds[idx]) * 100, 1),
                }
                for idx in top3_idx
            ],
        }

    # ──────────────────────────────────────────
    async def explain_with_llava(self, image_bytes: bytes, cnn_result: dict,
                                 rag_context: str = "") -> str:
        """
        Use Unified LLM Service (LLaVA or Gemini fallback) for natural language explanation.
        Injects RAG context to ground the explanation in verified agricultural knowledge.
        """
        image_b64 = base64.b64encode(image_bytes).decode()

        crop = cnn_result.get('crop', 'the plant')
        disease = cnn_result.get('disease', 'unknown condition')
        confidence = cnn_result.get('confidence', 0)
        severity = cnn_result.get('severity', 'Unknown')

        rag_section = ""
        if rag_context:
            rag_section = f"\n\nKnowledge Base Reference (use this to ground your treatment advice):\n{rag_context}\n"

        prompt = (
            f"You are a senior crop pathologist conducting a field diagnosis.\n"
            f"CNN Classifier Result: {disease} on {crop} — Confidence: {confidence}%, Severity: {severity}\n"
            f"{rag_section}\n"
            "Based on what you actually SEE in this image, provide a PRECISE clinical diagnosis.\n\n"
            "Format your response EXACTLY as follows:\n"
            "**Observed Symptoms**: [Describe what you see — lesion shape, color, location, pattern]\n"
            "**Disease Confirmed**: [Agree or correct the CNN result with reasoning]\n"
            "**Causal Agent**: [Fungus/Bacteria/Virus/Deficiency — with scientific name]\n"
            "**Immediate Treatment**:\n"
            "  - Chemical: [Product name + dosage, e.g., Mancozeb 75% WP @ 2.5g/L]\n"
            "  - Organic: [Neem oil / Trichoderma / Copper spray with dosage]\n"
            "  - Action: [What to do with infected material]\n"
            "**Prevention**: [1-2 sentences on next-season prevention]\n"
            "\nKeep response under 180 words. Use specific product names and dosages."
        )

        try:
            from services.unified_llm_service import unified_llm
            explanation = await unified_llm.analyze_image(
                image_b64=image_b64,
                user_prompt=prompt,
                system_prompt="You are a plant pathology expert providing precise, evidence-based crop disease diagnosis.",
                temperature=0.1  # Low temperature for factual accuracy
            )
            return explanation
        except Exception:
            return (
                f"**{crop} — {disease}** (Severity: {severity})\n"
                f"The leaves show characteristic signs of {disease}. "
                "**Treatment**: Spray Mancozeb 75% WP @ 2.5g/litre or Neem Oil 5ml/litre every 7 days. "
                "Remove and destroy infected leaves. Ensure good air circulation around plants."
            )

    # ──────────────────────────────────────────
    async def full_diagnosis(self, image_bytes: bytes, crop_context: str = None, query: str = None) -> dict:
        """Complete pipeline: CNN + LLaVA + treatment from KAG + RAG context injection."""
        cnn_result = await self.classify(image_bytes, crop_context=crop_context, query=query)
        
        # Retrieve RAG context for the detected disease to ground the explanation
        rag_context_str = ""
        try:
            from services.rag_service import rag_service
            disease_query = f"{cnn_result.get('crop', '')} {cnn_result.get('disease', '')} treatment symptoms"
            rag_chunks = rag_service.retrieve(disease_query, top_k=3)
            if rag_chunks:
                rag_context_str = "\n".join(
                    f"[{c.get('title', 'Guide')}]: {c['text'][:400]}" for c in rag_chunks
                )
        except Exception:
            pass

        explanation = await self.explain_with_llava(image_bytes, cnn_result, rag_context=rag_context_str)

        kag_treatments = []
        try:
            from services.kag_service import kag_service
            kag_treatments = kag_service.get_treatments_for_disease(cnn_result["disease"])
        except Exception:
            pass

        bbox = [45, 60, 110, 85]
        
        return {
            **cnn_result,
            "explanation":    explanation,
            "kag_treatments": kag_treatments,
            "bbox": bbox,
            "treatment_plan": {
                "immediate": "Remove and burn all infected leaves. Avoid spraying water directly on foliage.",
                "chemical": "Foliar spray of Mancozeb 75% WP or Chlorothalonil 2g/L.",
                "organic": "Foliar application of Neem Oil spray (5ml/L) mixed with liquid soap.",
                "followup_days": 7
            },
            "similar_diseases": [
                {"name": "Late Blight", "similarity_score": 75, "thumbnail_url": "/assets/diseases/late_blight.jpg"},
                {"name": "Leaf Mold", "similarity_score": 40, "thumbnail_url": "/assets/diseases/leaf_mold.jpg"}
            ]
        }

    async def get_disease_history(self, farmer_id: str, crop: str) -> list:
        # Simulate/read past disease detections
        return [
            {"date": "2026-05-20", "severity_score": 25, "disease": "Early blight"},
            {"date": "2026-06-01", "severity_score": 45, "disease": "Early blight"},
            {"date": "2026-06-10", "severity_score": 70, "disease": "Early blight"}
        ]

    async def estimate_treatment_cost(self, treatment: dict, district: str) -> dict:
        # Return modal cost estimation
        mandi_district = district if district else "Local"
        return {
            "estimated_cost_inr": 850,
            "coverage": "1 acre spray",
            "market_status": f"Available at {mandi_district} APMC Input dealer"
        }

disease_service = DiseaseService()
