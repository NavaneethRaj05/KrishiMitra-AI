"""
Intent Classifier Training & ONNX Export Script (Enhanced Dataset)
Trains a robust TF-IDF + LogisticRegression model on a rich dataset of conversational
farmer utterances across 11 intent classes, and converts it to ONNX for fast on-device inference.

Outputs:
  - ml-service/models/intent_classifier.onnx
  - ml-service/models/intent_labels.json
  - app/assets/models/intent_classifier.onnx
"""
import os
import sys
import json
from pathlib import Path

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from skl2onnx import convert_sklearn
from skl2onnx.common.data_types import StringTensorType
import onnxruntime as ort

base_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(base_dir))
from services.intent_service import INTENT_KEYWORDS

# Extended conversational training dataset across all 11 intents
CONVERSATIONAL_UTTERANCES = {
    "greeting": [
        "hello there how are you", "good morning sir", "namaste krishi mitra", "namaskara hegidira",
        "vanakkam how can you help me", "who are you and what is your purpose", "thank you very much for your help",
        "thanks for the guidance", "goodbye see you later", "bye have a nice day", "hi there i need assistance",
        "helo krishimitra", "dhanyavaad bhai", "dhanyavada", "koti pranam", "help me please"
    ],
    "disease_diagnosis": [
        "my tomato leaves have yellow spots and are curling", "paddy leaves are turning brown with spindle shaped lesions",
        "wheat stem has black rust pustules", "why are my cotton bolls rotting", "fungal infection spreading in my field",
        "how to cure bacterial leaf blight in rice", "apple tree leaves are covered with white powdery mildew",
        "chilli plants dying suddenly from wilt", "potato leaves look burned and decaying", "plant disease identification from leaf symptoms",
        "how to control anthracnose leaf spot", "severe fungal blight on mustard crop", "my crop looks diseased and weak"
    ],
    "crop_selection": [
        "which crop should I sow this kharif season in red soil", "what is the best crop for low rainfall area in Karnataka",
        "can I plant maize in black cotton soil in July", "suggest suitable crops for sandy loam soil in Punjab",
        "which pulses are best for intercropping with sugarcane", "recommend high yield crop for winter rabi season",
        "is groundnut profitable to plant next month", "which variety of wheat is recommended for Uttar Pradesh",
        "what vegetable crop can I grow with limited water", "what to plant in alluvial soil after rice harvest"
    ],
    "soil_analysis": [
        "what does pH 5.5 mean for my soil fertility", "my soil test report shows low nitrogen and high potassium",
        "how to improve organic carbon in black soil", "how to treat acidic soil before planting vegetables",
        "recommended NPK ratio for clay soil in Hassan", "soil electrical conductivity is too high what to do",
        "how much agricultural lime to apply to acidic field", "how to take soil sample for laboratory testing",
        "soil lacks phosphorus how can I replenish naturally", "ways to reduce soil salinity in irrigated land"
    ],
    "weather_query": [
        "is it going to rain in Hassan district this week", "what is the monsoon forecast for Maharashtra",
        "will there be drought or heavy rain during harvest", "temperature and humidity forecast for tomorrow",
        "is it safe to spray pesticides considering rain today", "upcoming thunderstorm warning for farmers",
        "expected rainfall during August in Mandya", "weather advisory for potato sowing season"
    ],
    "market_query": [
        "what is the current mandi price of tomato in Kolar", "what is the MSP rate for paddy this year",
        "which APMC market offers the highest price for cotton", "daily onion wholesale rates in Nashik market",
        "where can I sell my maize crop for maximum profit", "historical price trend for soybean in Indore",
        "is wheat market rate expected to increase next month", "how to register and sell produce on eNAM portal"
    ],
    "government_scheme": [
        "how can I apply for PM Kisan Samman Nidhi 6000 subsidy", "what are the eligibility rules for PM Fasal Bima Yojana",
        "is there government subsidy for solar water pump under PM KUSUM", "how to get Kisan Credit Card KCC loan from bank",
        "government subsidy on drip irrigation equipment", "where to submit claim for flood crop loss insurance",
        "central government agriculture schemes for small farmers", "documents required for state seed subsidy"
    ],
    "irrigation_query": [
        "how much water does paddy crop require per week", "how to design drip irrigation system for 2 acres banana",
        "what is the best interval for sprinkler irrigation in wheat", "my field is waterlogged how to create proper drainage",
        "benefits of alternate wetting and drying AWD in rice", "borewell water has high TDS can I use for tomato",
        "irrigation schedule during flowering stage of cotton", "how much water saved using drip vs furrow method"
    ],
    "fertilizer_query": [
        "how many bags of urea and DAP needed for 1 acre rice", "what is the recommended fertilizer schedule for tomato",
        "when should I apply potash MOP to sugarcane", "how to make and use vermicompost biofertilizer",
        "dosage of zinc sulfate spray for paddy yellowing", "can I mix urea with pesticide for foliar application",
        "organic fertilizer alternatives to chemical NPK", "correct application time for basal fertilizer dose"
    ],
    "pest_control": [
        "how to eradicate fall armyworm in maize crop", "whiteflies attacking my cotton crop what insecticide to spray",
        "how to prepare neem seed kernel extract NSKE 5 percent", "biological control of stem borer using trichocards",
        "best pheromone trap for pink bollworm management", "aphids on mustard plants how to spray safely",
        "integrated pest management IPM strategy for vegetables", "caterpillars eating cabbage leaves what remedy"
    ],
    "harvest_storage": [
        "how to store harvested onion without rotting in monsoon", "what is the safe moisture percentage for paddy storage",
        "guidelines for wheat grain storage in hermetic bags", "how to grade mangoes for export market",
        "pest management in grain storage warehouses", "correct stage to harvest sugarcane for maximum sucrose",
        "cold storage charges and facilities for potato", "post harvest drying techniques to prevent aflatoxin in groundnut"
    ]
}

def train_and_export_intent_onnx():
    repo_root = base_dir.parent

    # Combine INTENT_KEYWORDS + CONVERSATIONAL_UTTERANCES
    texts = []
    labels = []

    for intent, keywords in INTENT_KEYWORDS.items():
        for kw in keywords:
            texts.append(kw.lower())
            labels.append(intent)

    for intent, utterances in CONVERSATIONAL_UTTERANCES.items():
        for utt in utterances:
            texts.append(utt.lower())
            labels.append(intent)

    unique_intents = sorted(list(set(labels)))
    label_to_idx = {name: i for i, name in enumerate(unique_intents)}
    y = np.array([label_to_idx[lbl] for lbl in labels])

    print(f"[DATA] Prepared {len(texts)} intent training samples across {len(unique_intents)} classes.")

    pipeline = Pipeline([
        ("tfidf", TfidfVectorizer(ngram_range=(1, 2), analyzer="word", min_df=1, sublinear_tf=True)),
        ("clf", LogisticRegression(C=2.0, max_iter=300, random_state=42))
    ])
    pipeline.fit(texts, y)
    print("[TRAIN] Model training complete.")

    labels_out = base_dir / "models" / "intent_labels.json"
    labels_out.write_text(json.dumps(unique_intents, indent=2), encoding="utf-8")
    print(f"[SAVE] Saved intent labels to {labels_out}")

    print("[CONVERT] Converting scikit-learn pipeline to ONNX...")
    initial_type = [("text_input", StringTensorType([None, 1]))]
    onnx_model = convert_sklearn(
        pipeline,
        initial_types=initial_type,
        target_opset=12,
        options={id(pipeline): {"zipmap": False}}
    )

    out_paths = [
        base_dir / "models" / "intent_classifier.onnx",
        repo_root / "app" / "assets" / "models" / "intent_classifier.onnx",
    ]

    for p in out_paths:
        p.parent.mkdir(parents=True, exist_ok=True)
        with open(p, "wb") as f:
            f.write(onnx_model.SerializeToString())
        size_kb = p.stat().st_size / 1024
        print(f"[SAVE] Saved ONNX model to {p} ({size_kb:.2f} KB)")

    print(f"[SUCCESS] Exported enhanced ONNX intent classifier to {len(out_paths)} locations.")

if __name__ == "__main__":
    train_and_export_intent_onnx()
