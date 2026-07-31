import os
import sqlite3

def init_mock_assets():
    # Make sure folders exist
    os.makedirs('app/assets/corpus', exist_ok=True)
    os.makedirs('app/assets/models', exist_ok=True)

    # 1. Create a valid SQLite DB for FTS corpus mock
    db_path = 'app/assets/corpus/agri_fts.db'
    if not os.path.exists(db_path):
        conn = sqlite3.connect(db_path)
        try:
            # Try setting up virtual FTS table (or normal fallback)
            conn.execute("""
                CREATE VIRTUAL TABLE agri_fts USING fts5(
                    doc_id, title, content, source, crop_tags, season_tags,
                    tokenize='porter unicode61'
                )
            """)
        except sqlite3.OperationalError:
            conn.execute("""
                CREATE TABLE agri_fts (
                    doc_id TEXT, title TEXT, content TEXT, source TEXT, crop_tags TEXT, season_tags TEXT
                )
            """)
        
        # Seed values
        seeds = [
            ("doc_1", "Paddy Blast Disease Management", "Paddy blast is caused by Magnaporthe oryzae. Symptoms include leaf spots. Use chemical control with Tricyclazole 75 WP at 0.6g/L or organic pseudomonas fluorescens.", "ICAR", "paddy,rice", "Kharif"),
            ("doc_2", "Tomato Leaf Curl Virus Guide", "Tomato leaf curl virus is transmitted by whiteflies. Control whiteflies using yellow sticky traps or spray neem oil (5ml/L). Remove infected plants immediately.", "KVK", "tomato", "Kharif"),
            ("doc_3", "Drip Irrigation Subsidy Scheme", "Under PM Krishi Sinchayee Yojana, micro-irrigation subsidies are available up to 90% for small and marginal farmers. Apply via state agriculture portal.", "Govt Portal", "general", "Kharif,Rabi")
        ]
        conn.executemany("INSERT INTO agri_fts VALUES (?,?,?,?,?,?)", seeds)
        conn.commit()
        conn.close()
        print(f"✅ Created mock FTS SQLite DB at {db_path}")

    # 2. Create dummy model files
    for model in ['crop_advisor.onnx', 'disease_detector.onnx', 'intent_classifier.onnx']:
        model_path = f'app/assets/models/{model}'
        if not os.path.exists(model_path):
            with open(model_path, 'wb') as f:
                f.write(b'ONNX_MOCK_MODEL_DATA_VAL_VAANI')
            print(f"✅ Created dummy weights at {model_path}")

    # 3. Create simple valid 1x1 pixel mock PNGs so Expo doesn't fail building/displaying assets
    dummy_png = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4\x00\x00\x00\rIDATx\x9cc`\x00\x01\x00\x00\x0c\x00\x01\x12\x08\xc1\x8f\x00\x00\x00\x00IEND\xaeB`\x82'
    for img in ['icon.png', 'splash.png', 'favicon.png']:
        img_path = f'app/assets/{img}'
        if not os.path.exists(img_path):
            with open(img_path, 'wb') as f:
                f.write(dummy_png)
            print(f"✅ Created dummy PNG asset at {img_path}")

if __name__ == "__main__":
    init_mock_assets()
