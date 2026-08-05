import logging
import re
from typing import List, Dict

logger = logging.getLogger("krishimitraai.core.confidence")

class ConfidenceScorer:
    """Computes a robust confidence score for the generated answer."""
    
    def compute_score(self, answer: str, sources: List[Dict], tool_metadata: Dict = None) -> int:
        """
        Calculates confidence (0-100) based on:
        - Density of citations in the answer
        - Source authority scores (ICAR > Web)
        - Tool confidence (e.g. CNN vision confidence)
        """
        score = 50 # Base score
        
        # 1. Citation Analysis — matches [Source: Title] format used by the LLM
        citations = len(set(re.findall(r'\[Source:\s*.*?\]', answer)))
        words = len(answer.split())
        
        if words > 0:
            citation_density = citations / (words / 100) # Citations per 100 words
            if citation_density > 2:
                score += 20
            elif citation_density > 1:
                score += 10
                
        # 2. Source Authority Analysis
        if sources:
            has_icar = any(getattr(s, 'source', '') == "Local KB" for s in sources)
            if has_icar:
                score += 15
                
            # Average authority score
            auth_scores = [getattr(s, 'authority_score', 0.5) for s in sources if hasattr(s, 'authority_score')]
            if auth_scores:
                avg_auth = sum(auth_scores) / len(auth_scores)
                score += int((avg_auth - 0.5) * 20) # Bonus for high authority
                
        # 3. Tool Confidence
        if tool_metadata:
            vision_conf = tool_metadata.get("vision_confidence")
            if vision_conf:
                # If vision model is uncertain, pull down overall confidence
                if vision_conf < 70:
                    score -= 15
                elif vision_conf > 90:
                    score += 10
                    
        return max(40, min(99, score))

confidence_scorer = ConfidenceScorer()
