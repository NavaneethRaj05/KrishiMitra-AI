"""
RAG Service — Retrieval Augmented Generation
Uses ChromaDB (offline vector store) + sentence-transformers + Ollama LLM
"""
import hashlib
import os
import re
from pathlib import Path
from typing import Dict, List, Optional

import chromadb
from chromadb.config import Settings
from sentence_transformers import SentenceTransformer

CHROMA_PATH = Path("knowledge_base/chroma_db")
DOCS_PATH   = Path("knowledge_base/documents")
EMBED_MODEL = "all-MiniLM-L6-v2"
TOP_K       = 5   # Increased from 3 for richer context
CHUNK_WORDS = 300
OVERLAP     = 50

# Domain-aware query expansion terms — boost retrieval for common agricultural patterns
QUERY_EXPANSION = {
    "disease":     ["symptoms", "treatment", "fungicide", "management", "control", "infection"],
    "blight":      ["Phytophthora", "Alternaria", "fungicide", "copper", "Mancozeb", "late blight", "early blight"],
    "fertilizer":  ["NPK", "urea", "DAP", "dosage", "application", "deficiency", "soil nutrition"],
    "pest":        ["insecticide", "IPM", "spray", "biological control", "neem", "pheromone"],
    "water":       ["irrigation", "drip", "schedule", "water requirement", "flood"],
    "yield":       ["production", "harvest", "variety", "seed", "spacing"],
    "market":      ["mandi", "APMC", "price", "MSP", "selling"],
    "soil":        ["pH", "organic matter", "NPK", "compost", "amendment"],
    "rust":        ["Puccinia", "fungicide", "triazole", "propiconazole", "tebuconazole"],
    "wilt":        ["Fusarium", "Verticillium", "root rot", "soil solarization", "biocontrol"],
    "weed":        ["herbicide", "glyphosate", "pendimethalin", "weeding", "grass", "broadleaf"],
    "seed":        ["sowing", "germination", "variety", "hybrid", "treatment", "rate"],
    "worm":        ["fall armyworm", "caterpillar", "borer", "larvae", "insecticide", "spinosad"],
}


class RAGService:
    def __init__(self):
        self.embedder = None
        self.client = None
        self.collection = None
        self._loaded = False

    def _ensure_loaded(self):
        if self._loaded: return
        self._loaded = True
        self.embedder = SentenceTransformer(EMBED_MODEL)
        self.client   = chromadb.PersistentClient(
            path=str(CHROMA_PATH),
            settings=Settings(anonymized_telemetry=False),
        )
        self.collection = self.client.get_or_create_collection(
            name="krishimitraai_kb",
            metadata={"hnsw:space": "cosine"},
        )

    # ──────────────────────────────────────────
    def _chunk_text(self, text: str) -> List[str]:
        """Split text into ~CHUNK_WORDS-word overlapping chunks."""
        words  = text.split()
        chunks = []
        start  = 0
        while start < len(words):
            end = start + CHUNK_WORDS
            chunks.append(" ".join(words[start:end]))
            start = end - OVERLAP  # slide with overlap
        return [c for c in chunks if len(c.split()) > 30]

    def ingest_documents(self, directory: Path = DOCS_PATH) -> int:
        """
        Ingest all .txt files from the documents folder.
        Returns number of new chunks added.
        """
        self._ensure_loaded()
        directory.mkdir(parents=True, exist_ok=True)
        added = 0

        for file_path in directory.glob("*.txt"):
            text = file_path.read_text(encoding="utf-8", errors="ignore")
            chunks = self._chunk_text(text)

            ids, embeddings, documents, metadatas = [], [], [], []
            for i, chunk in enumerate(chunks):
                chunk_id = hashlib.md5(chunk.encode()).hexdigest()
                # Skip already-ingested chunks (upsert handles duplicates)
                ids.append(chunk_id)
                embeddings.append(self.embedder.encode(chunk).tolist())
                documents.append(chunk)
                metadatas.append({
                    "source": file_path.name,
                    "title":  file_path.stem.replace("_", " ").title(),
                    "chunk":  i,
                })
                added += 1

            if ids:
                self.collection.upsert(
                    ids=ids,
                    embeddings=embeddings,
                    documents=documents,
                    metadatas=metadatas,
                )

        return added

    def _get_source_type_and_score(self, source: str) -> tuple:
        s = (source or "").lower()
        if "icar" in s or "niphm" in s:
            return "icar", 1.0
        if "kvk" in s:
            return "kvk", 0.9
        if "agmarknet" in s or "apmc" in s:
            return "agmarknet", 0.85
        if "research" in s:
            return "research", 0.8
        return "web", 0.65

    def _expand_query(self, query: str) -> str:
        """
        Domain-aware query expansion: append relevant domain terms to improve
        semantic retrieval for agricultural queries.
        """
        q_lower = query.lower()
        extra_terms = []
        for keyword, expansions in QUERY_EXPANSION.items():
            if keyword in q_lower:
                # Pick up to 3 expansion terms not already in query
                new_terms = [t for t in expansions if t.lower() not in q_lower][:3]
                extra_terms.extend(new_terms)
        if extra_terms:
            # Append expansions to help embedding model find related chunks
            return f"{query} | Related: {', '.join(extra_terms)}"
        return query

    # ──────────────────────────────────────────
    def _bm25_rerank(self, query: str, chunks: List[Dict]) -> List[Dict]:
        """
        Hybrid BM25 keyword reranking layered on top of semantic scores.
        Final score = 0.65 × semantic + 0.35 × normalized_bm25
        This captures exact agrochemical/variety name matches that cosine similarity misses.
        e.g. 'Tricyclazole 75% WP' or 'Mancozeb' are found even when embedding similarity is low.
        """
        if not chunks:
            return chunks
        try:
            from rank_bm25 import BM25Okapi
            corpus = [c["text"].lower().split() for c in chunks]
            bm25 = BM25Okapi(corpus)
            bm25_scores = bm25.get_scores(query.lower().split())
            # Normalize BM25 to [0, 1]
            max_bm25 = max(bm25_scores) if max(bm25_scores) > 0 else 1.0
            for i, chunk in enumerate(chunks):
                semantic_score = chunk.get("score", 0.5)
                bm25_norm = float(bm25_scores[i]) / max_bm25
                chunk["score"] = round(0.65 * semantic_score + 0.35 * bm25_norm, 4)
            return sorted(chunks, key=lambda x: x["score"], reverse=True)
        except ImportError:
            logger.debug("rank_bm25 not available — using semantic-only ranking")
            return chunks
        except Exception as e:
            logger.debug("BM25 rerank failed: %s", e)
            return chunks

    def _trim_to_budget(self, chunks: List[Dict], max_words_per_chunk: int = 200) -> List[Dict]:
        """
        Token budget management: trim each chunk text to max_words_per_chunk words.
        Prevents context overflow in Ollama's 8K token window when combining
        RAG + KAG + system prompt + web sources.
        """
        trimmed = []
        for c in chunks:
            words = c["text"].split()
            if len(words) > max_words_per_chunk:
                c = dict(c)  # shallow copy — don't mutate original
                c["text"] = " ".join(words[:max_words_per_chunk]) + "..."
            trimmed.append(c)
        return trimmed

    # ──────────────────────────────────────────
    def retrieve(self, query: str, top_k: int = TOP_K) -> List[Dict]:
        """
        Hybrid semantic + BM25 retrieval with query expansion and token budget.
        Pipeline: expand query → semantic embed → ChromaDB → BM25 rerank → trim budget.
        """
        self._ensure_loaded()
        expanded_query = self._expand_query(query)
        query_embedding = self.embedder.encode([expanded_query]).tolist()
        # Over-fetch by 2x so BM25 reranking has enough candidates to work with
        fetch_k = min(top_k * 2, self.collection.count() or top_k)
        results = self.collection.query(
            query_embeddings=query_embedding,
            n_results=max(fetch_k, 1),
            include=["documents", "metadatas", "distances"],
        )
        chunks = []
        documents = results.get("documents") or []
        metadatas = results.get("metadatas") or []
        distances = results.get("distances") or []

        if documents and documents[0]:
            for i, doc in enumerate(documents[0]):
                meta = (metadatas[0][i] or {}) if (metadatas and len(metadatas) > 0 and len(metadatas[0]) > i) else {}
                score = distances[0][i] if (distances and len(distances) > 0 and len(distances[0]) > i) else 0.0
                if doc is not None:
                    src = meta.get("source", "Unknown")
                    src_type, auth_score = self._get_source_type_and_score(src)
                    chunks.append({
                        "text":    doc,
                        "source":  src,
                        "title":   meta.get("title", "Agricultural Document"),
                        "excerpt": " ".join(doc.split()[:40]) + "...",
                        "score":   round(1 - score, 4),  # convert cosine distance → similarity
                        "source_type": src_type,
                        "authority_score": auth_score,
                    })

        # Hybrid rerank using BM25 on top of semantic scores
        chunks = self._bm25_rerank(query, chunks)
        # Return top_k after reranking, trimmed to token budget
        return self._trim_to_budget(chunks[:top_k])

    # ──────────────────────────────────────────
    # ──────────────────────────────────────────
    def _sanitize_query(self, query: str) -> str:
        """
        Sanitize user query before embedding into LLM prompt.
        - Cap at 500 chars to prevent context overflow
        - Strip control characters to reduce prompt injection risk
        - Use a fixed delimiter so injected instructions can't break the prompt structure
        """
        import re
        # Strip non-printable / control characters (keep newlines for readability)
        cleaned = re.sub(r"[^\x09\x0a\x0d\x20-\x7e\x80-\xff]", "", query)
        # Collapse excessive whitespace / newlines
        cleaned = re.sub(r"\n{3,}", "\n\n", cleaned).strip()
        # Hard cap at 500 characters
        if len(cleaned) > 500:
            cleaned = cleaned[:500] + "..."
        return cleaned

    async def generate_answer(
        self, query: str, language: str = "en", farmer_history: Optional[list] = None
    ) -> Dict:
        """Full RAG pipeline: retrieve → build prompt → call LLM → return answer + sources."""
        # Sanitize query before use in prompts
        safe_query = self._sanitize_query(query)
        chunks  = self.retrieve(safe_query, top_k=TOP_K)

        # KAG enrichment: if a crop is mentioned, add graph knowledge to context
        kag_context = ""
        try:
            from services.kag_service import kag_service
            from shared.constants import KNOWN_CROPS
            mentioned = [c for c in KNOWN_CROPS if c in query.lower()]
            if mentioned:
                profile = kag_service.get_full_crop_profile(mentioned[0].title())
                if profile.get("diseases"):
                    disease_names = [d["disease"] for d in profile["diseases"]]
                    kag_context = (
                        f"\n\nKnowledge Graph Data for {mentioned[0].title()}: "
                        f"Known diseases: {', '.join(disease_names)}. "
                        f"Grows in: {', '.join(profile['crop'].get('soils', []))}."
                    )
        except Exception:
            pass  # KAG optional — pure RAG still works

        context = "\n\n---\n\n".join([
            f"[Source: {c['title']}]\n{c['text']}" for c in chunks
        ]) + kag_context

        # Build farmer memory string from recent journal entries
        memory_context = ""
        if farmer_history:
            recent = farmer_history[-5:]  # last 5 interactions
            lines = []
            for entry in recent:
                if entry.get("entryType") == "disease_detection":
                    lines.append(
                        f"- Detected {entry['output'].get('disease','unknown')} "
                        f"in {entry['output'].get('crop','unknown')} "
                        f"on {entry.get('createdAt','')[:10]}"
                    )
                elif entry.get("entryType") == "crop_recommendation":
                    lines.append(
                        f"- Recommended {entry['output'].get('crop','unknown')} "
                        f"({entry['output'].get('confidence','?')}% confidence) "
                        f"on {entry.get('createdAt','')[:10]}"
                    )
                elif entry.get("entryType") == "rag_query":
                    lines.append(
                        f"- Asked: \"{entry['input'].get('question','')[:60]}...\""
                    )
            if lines:
                memory_context = "\n\nFarmer's recent activity:\n" + "\n".join(lines)

        lang_map = {
            "kn": "Kannada", "hi": "Hindi", "ta": "Tamil",
            "te": "Telugu",  "mr": "Marathi", "en": "English",
            "pa": "Punjabi", "bn": "Bengali"
        }

        system_prompt = (
            "You are KrishiMitra AI, a precision agricultural expert. "
            "You MUST answer ONLY based on the context documents provided below. "
            "Do NOT fabricate chemical names, dosages, or scheme amounts not in the context. "
            "If the answer is in the context, cite it with [Source: title]. "
            "If the context is insufficient, say: 'My knowledge base doesn't cover this specifically — "
            "here is general guidance...' and give a brief general answer. "
            "NEVER give a vague generic response that ignores the farmer's specific situation. "
            "Always tailor your response to the farmer's location, soil, season, and weather."
            f"Be practical, specific, and use simple language for farmers.{memory_context}\n"
            f"Respond in {lang_map.get(language, 'English')}."
        )

        user_prompt = (
            f"Context from agricultural knowledge base:\n{context}\n\n"
            "###FARMER QUESTION###\n"
            f"{safe_query}\n"
            "###END QUESTION###\n\n"
            "Provide a clear, practical answer based on the context above."
        )

        answer_text = None
        used_model = os.getenv("OLLAMA_MODEL", "llama3.1:8b")
        
        try:
            from services.unified_llm_service import unified_llm_service
            # FIXED: was asyncio.run() which crashes inside FastAPI's running event loop
            answer_text = await unified_llm_service.chat(system_prompt, user_prompt)
            used_model = getattr(unified_llm_service, "_last_used_model", used_model)
        except Exception:
            try:
                import ollama
                response = ollama.chat(
                    model=used_model,
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user",   "content": user_prompt},
                    ],
                )
                answer_text = response["message"]["content"]
            except Exception:
                from utils.fallback_formatter import format_offline_fallback
                answer_text = format_offline_fallback(safe_query, chunks, target_lang=language)

        return {
            "answer":   answer_text,
            "sources":  chunks,
            "language": language,
            "model":    used_model,
        }



rag_service = RAGService()
