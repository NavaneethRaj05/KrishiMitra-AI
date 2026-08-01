import logging
import asyncio
from typing import List, Dict
from pydantic import BaseModel

from services.unified_llm_service import unified_llm_service

logger = logging.getLogger("krishimitraai.services.verification")

class VerificationService:
    """
    Advanced verification layer to run between retrieval and generation.
    Responsibilities:
    - Deduplicate semantic chunks.
    - Resolve contradictory evidence (e.g. Chemical A vs B).
    - Compress context (extract only relevant sentences).
    """

    def deduplicate(self, chunks: List[Dict], similarity_threshold: float = 0.85) -> List[Dict]:
        """Simple heuristic deduplication based on text overlap."""
        unique_chunks = []
        for chunk in chunks:
            text = chunk.get("text", "").lower()
            is_duplicate = False
            for u_chunk in unique_chunks:
                u_text = u_chunk.get("text", "").lower()
                # Jaccard similarity approximation
                words_a = set(text.split())
                words_b = set(u_text.split())
                if not words_a or not words_b: continue
                overlap = len(words_a.intersection(words_b)) / float(len(words_a.union(words_b)))
                if overlap > similarity_threshold:
                    is_duplicate = True
                    break
            
            if not is_duplicate:
                unique_chunks.append(chunk)
                
        return unique_chunks

    async def compress_and_verify(self, query: str, chunks: List[Dict]) -> List[Dict]:
        """
        Uses a fast LLM call to extract only the sentences from the chunks that are relevant 
        to the query, resolving any contradictions.
        """
        if not chunks:
            return chunks

        # First pass deduplication
        deduped = self.deduplicate(chunks)
        
        # We only compress if there are many chunks to save token budget and latency
        if len(deduped) <= 2:
            return deduped
            
        combined_text = "\n\n".join([f"[Source {i+1}]: {c.get('text', '')}" for i, c in enumerate(deduped)])
        
        prompt = f"""
You are an expert agricultural verification assistant.
Given the following retrieved document chunks and a farmer's query, extract ONLY the facts, dosages, and recommendations relevant to the query. 
If there are contradictions between sources, prefer ICAR or government sources.
Keep it extremely concise. Do not rewrite, just extract the core facts.

QUERY: {query}
CHUNKS:
{combined_text}
"""
        try:
            compressed = await unified_llm_service.chat(
                system_prompt="You are a strict data extractor. Return only facts.",
                user_prompt=prompt,
                temperature=0.0
            )
            
            # Wrap the compressed text back into a single highly-authoritative chunk
            return [{
                "title": "AI Verified Context summary",
                "text": compressed,
                "score": 1.0,
                "source": "Verification Layer",
                "authority_score": 1.0
            }]
        except Exception as e:
            logger.warning(f"Context compression failed: {e}. Falling back to raw chunks.")
            return deduped

verification_service = VerificationService()
