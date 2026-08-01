import logging
from typing import List, Dict

logger = logging.getLogger("krishimitraai.core.memory")

class MemoryManager:
    """Handles conversation memory and farmer history to prevent redundant questions."""
    
    def format_memory_context(self, history: List[Dict]) -> str:
        """Converts raw journal/chat history into a prompt string."""
        if not history:
            return ""
            
        lines = []
        for e in history[-5:]:
            t = e.get("entryType", "")
            out = e.get("output", {})
            inp = e.get("input", {})
            
            if t == "disease_detection" and out.get("disease"):
                lines.append(f"Previously detected {out['disease']} in {out.get('crop', '?')}")
            elif t == "crop_recommendation" and out.get("crop"):
                lines.append(f"Previously recommended {out['crop']}")
            elif t == "rag_query":
                q = inp.get("question", "")
                if q:
                    lines.append(f'Previously asked: "{q[:60]}"')
                    
        return ("\nFarmer history: " + "; ".join(lines) + ".") if lines else ""

memory_manager = MemoryManager()
