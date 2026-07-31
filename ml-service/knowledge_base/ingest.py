"""
Knowledge Base Ingestion Script
Ingests all .txt files from knowledge_base/documents/ into ChromaDB.

Usage (from ml-service/):
    python knowledge_base/ingest.py

Or via API:
    POST /rag/ingest
"""
import sys
from pathlib import Path

# Allow running from anywhere
sys.path.insert(0, str(Path(__file__).parent.parent))

from services.rag_service import rag_service, DOCS_PATH


def main():
    docs_dir = DOCS_PATH
    txt_files = list(docs_dir.glob("*.txt"))

    if not txt_files:
        print(f"⚠️  No .txt files found in {docs_dir}")
        print("Add knowledge documents (in .txt format) to:", docs_dir)
        print("Example: global_crop_guide.txt, global_crop_calendar.txt, rice_cultivation_guide.txt")
        return

    print(f"Found {len(txt_files)} document(s) to ingest:")
    for f in txt_files:
        print(f"  • {f.name}")

    print("\nIngesting into ChromaDB...")
    added = rag_service.ingest_documents(docs_dir)
    total = rag_service.collection.count()

    print(f"✅ Done — {added} chunks added, {total} total in ChromaDB")


if __name__ == "__main__":
    main()
