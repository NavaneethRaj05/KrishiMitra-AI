import asyncio
import logging
from tools.base import BaseTool, ToolResult
from services.rag_service import rag_service

logger = logging.getLogger("krishimitraai.tools.rag")

class RagTool(BaseTool):
    @property
    def name(self) -> str:
        return "rag_tool"
        
    @property
    def description(self) -> str:
        return "Searches the local agricultural knowledge base (ICAR guidelines, treatments, manuals) using hybrid search."
        
    @property
    def required_params(self) -> list:
        return ["query"]

    async def execute(self, **kwargs) -> ToolResult:
        query = kwargs.get("query")
        soil_type = kwargs.get("soil_type")
        district = kwargs.get("district")
        
        if not query:
            return ToolResult(success=False, data=None, message="Missing query parameter")
            
        try:
            chunks = await asyncio.to_thread(rag_service.retrieve, query, top_k=4)
            
            # Location expansion if context provided
            if soil_type or district:
                loc_parts = []
                if soil_type: loc_parts.append(soil_type)
                if district: loc_parts.append(district)
                expanded_query = f"{query} for {' '.join(loc_parts)}"
                
                loc_chunks = await asyncio.to_thread(rag_service.retrieve, expanded_query, top_k=3)
                
                # Deduplicate
                seen_sigs = set()
                merged_chunks = []
                for chunk in chunks + loc_chunks:
                    txt_sig = chunk.get("text", "").strip().lower()[:100]
                    if txt_sig and txt_sig not in seen_sigs:
                        seen_sigs.add(txt_sig)
                        merged_chunks.append(chunk)
                chunks = merged_chunks[:5]
                
            # Verification Layer: Compress and deduplicate context before returning to Planner
            from services.verification_service import verification_service
            verified_chunks = await verification_service.compress_and_verify(query, chunks)
                
            return ToolResult(
                success=True, 
                data=verified_chunks,
                message=f"Retrieved and verified {len(verified_chunks)} chunks from local KB."
            )
            
        except Exception as e:
            logger.error(f"RAG Tool execution failed: {e}")
            return ToolResult(success=False, data=None, message=str(e))
