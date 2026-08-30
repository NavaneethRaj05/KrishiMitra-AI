"""
Export Offline Search Corpus to SQLite FTS5 (agri_fts.db) & JSON (agri_fts.json)
Reads the 21 ICAR/agronomic knowledge base documents from ml-service/knowledge_base/documents/*.txt,
chunks them using the standard RAG chunking parameters (300 words, 50 overlap),
tags each chunk with crop and topic metadata, and builds both a SQLite FTS5 database
and a JSON corpus for cross-platform offline search.

Outputs:
  - app/assets/corpus/agri_fts.db
  - app/assets/corpus/agri_fts.json
  - ml-service/knowledge_base/agri_fts.db
"""
import os
import sys
import re
import json
import sqlite3
from pathlib import Path

# Safe UTF-8 encoding for Windows consoles
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

CHUNK_WORDS = 300
OVERLAP = 50

KNOWN_CROPS = [
    "rice", "paddy", "wheat", "maize", "corn", "tomato", "potato", "cotton",
    "sugarcane", "coffee", "tea", "onion", "chilli", "pepper", "apple", "grape",
    "banana", "mango", "soybean", "groundnut", "mustard", "pulses", "gram", "ragi"
]

TOPIC_KEYWORDS = {
    "disease": ["disease", "blight", "rust", "rot", "wilt", "spot", "mildew", "virus", "canker", "fungus"],
    "pest": ["pest", "insect", "borer", "armyworm", "whitefly", "aphid", "caterpillar", "trap", "neem"],
    "fertilizer": ["fertilizer", "urea", "dap", "mop", "npk", "dosage", "nitrogen", "phosphorus", "potassium", "nutrient"],
    "soil": ["soil", "ph", "organic", "compost", "manure", "saline", "texture", "loam", "clay", "fertility"],
    "irrigation": ["irrigation", "water", "drip", "sprinkler", "drainage", "flood", "moisture"],
    "scheme": ["scheme", "subsidy", "loan", "pmfby", "pm-kisan", "pmksy", "insurance", "kcc", "portal"],
    "market": ["market", "mandi", "price", "msp", "apmc", "agmarknet", "procurement", "rate", "cost"],
    "harvest": ["harvest", "post harvest", "storage", "drying", "grading", "packaging", "warehouse"],
    "organic": ["organic", "panchagavya", "dashagavya", "biofertilizer", "trichoderma", "pseudomonas"]
}

def chunk_text(text: str) -> list:
    words = text.split()
    chunks = []
    start = 0
    while start < len(words):
        end = start + CHUNK_WORDS
        chunk_slice = " ".join(words[start:end])
        chunks.append(chunk_slice)
        start = end - OVERLAP
    return [c for c in chunks if len(c.split()) > 30]

def extract_tags(text: str, filename: str) -> tuple:
    combined = (filename + " " + text).lower()
    
    crops_found = [c for c in KNOWN_CROPS if re.search(rf"\b{c}\b", combined)]
    if not crops_found:
        crops_found = ["general"]
    
    topics_found = []
    for topic, kws in TOPIC_KEYWORDS.items():
        if any(re.search(rf"\b{kw}\b", combined) for kw in kws):
            topics_found.append(topic)
    if not topics_found:
        topics_found = ["agronomy"]
        
    return ", ".join(crops_found), ", ".join(topics_found)

def infer_source(filename: str) -> str:
    f = filename.lower()
    if "icar" in f:
        return "ICAR Knowledge Repository"
    if "ipm" in f or "niphm" in f:
        return "NIPHM Plant Health Guide"
    if "scheme" in f or "government" in f:
        return "Ministry of Agriculture (Govt of India)"
    if "market" in f:
        return "APMC Mandi Intelligence"
    return "ICAR / State Agricultural Universities"

def export_offline_corpus():
    base_dir = Path(__file__).resolve().parent.parent
    repo_root = base_dir.parent
    docs_dir = base_dir / "knowledge_base" / "documents"

    if not docs_dir.exists():
        raise FileNotFoundError(f"Documents directory not found at {docs_dir}")

    txt_files = sorted(list(docs_dir.glob("*.txt")))
    print(f"[FOUND] Found {len(txt_files)} knowledge documents in {docs_dir}")

    # Build corpus data structures
    all_chunks_data = []

    db_paths = [
        base_dir / "knowledge_base" / "agri_fts.db",
        repo_root / "app" / "assets" / "corpus" / "agri_fts.db",
    ]

    for db_path in db_paths:
        db_path.parent.mkdir(parents=True, exist_ok=True)
        if db_path.exists():
            db_path.unlink()

        conn = sqlite3.connect(str(db_path))
        cursor = conn.cursor()

        # Create base table
        cursor.execute("""
            CREATE TABLE agri_fts (
                doc_id TEXT PRIMARY KEY,
                title TEXT,
                content TEXT,
                source TEXT,
                crop_tags TEXT,
                topic_tags TEXT
            );
        """)

        # Create FTS5 virtual table for fast ranking and BM25 search
        cursor.execute("""
            CREATE VIRTUAL TABLE agri_fts_idx USING fts5(
                doc_id UNINDEXED,
                title,
                content,
                source UNINDEXED,
                crop_tags,
                topic_tags,
                content='agri_fts',
                content_rowid='rowid'
            );
        """)

        total_chunks = 0
        all_chunks_data = []

        for doc_file in txt_files:
            text = doc_file.read_text(encoding="utf-8", errors="ignore")
            chunks = chunk_text(text)
            doc_title = doc_file.stem.replace("_", " ").title()
            source = infer_source(doc_file.name)
            crop_tags, topic_tags = extract_tags(text, doc_file.name)

            for idx, chunk in enumerate(chunks):
                chunk_id = f"{doc_file.stem}_chunk_{idx+1}"
                cursor.execute("""
                    INSERT INTO agri_fts (doc_id, title, content, source, crop_tags, topic_tags)
                    VALUES (?, ?, ?, ?, ?, ?)
                """, (chunk_id, doc_title, chunk, source, crop_tags, topic_tags))

                # Also insert into FTS5 index
                cursor.execute("""
                    INSERT INTO agri_fts_idx (rowid, doc_id, title, content, source, crop_tags, topic_tags)
                    VALUES (last_insert_rowid(), ?, ?, ?, ?, ?, ?)
                """, (chunk_id, doc_title, chunk, source, crop_tags, topic_tags))

                all_chunks_data.append({
                    "doc_id": chunk_id,
                    "title": doc_title,
                    "content": chunk,
                    "source": source,
                    "crop_tags": crop_tags,
                    "topic_tags": topic_tags
                })

                total_chunks += 1

        conn.commit()
        conn.close()

        size_kb = db_path.stat().st_size / 1024
        print(f"[SAVE] Exported SQLite FTS5 database to {db_path} ({total_chunks} chunks, {size_kb:.2f} KB)")

    # Save JSON fallback for web/React Native environments
    json_paths = [
        repo_root / "app" / "assets" / "corpus" / "agri_fts.json",
        repo_root / "landing" / "assets" / "corpus" / "agri_fts.json",
    ]
    for jp in json_paths:
        jp.parent.mkdir(parents=True, exist_ok=True)
        jp.write_text(json.dumps(all_chunks_data, indent=2), encoding="utf-8")
        print(f"[SAVE] Exported JSON corpus to {jp} ({len(all_chunks_data)} entries, {jp.stat().st_size / 1024:.2f} KB)")

    # Validate FTS5 query matching
    print("[VALIDATE] Testing FTS5 query on exported database...")
    conn = sqlite3.connect(str(db_paths[0]))
    cursor = conn.cursor()

    test_queries = ["paddy blast", "tomato fertilizer", "soil npk", "drip irrigation", "pm kisan"]
    for q in test_queries:
        cursor.execute("""
            SELECT title, snippet(agri_fts_idx, 2, '<b>', '</b>', '...', 15), source
            FROM agri_fts_idx
            WHERE agri_fts_idx MATCH ?
            ORDER BY rank
            LIMIT 1
        """, (q,))
        row = cursor.fetchone()
        if row:
            print(f"   MATCH '{q}' -> Title: '{row[0]}' | Source: '{row[2]}'")
        else:
            print(f"   [WARN] No match for '{q}'")

    conn.close()
    print(f"[SUCCESS] Built offline search corpus across {len(txt_files)} ICAR documents with {total_chunks} total indexed chunks.")

if __name__ == "__main__":
    export_offline_corpus()
