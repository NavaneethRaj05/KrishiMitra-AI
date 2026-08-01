import json
import logging
import re
from typing import Dict, List, Any
from pydantic import BaseModel, Field

from services.unified_llm_service import unified_llm_service
from tools.registry import tool_registry

logger = logging.getLogger("krishimitraai.agents.planner")

class ToolInvocation(BaseModel):
    tool: str
    kwargs: Dict[str, Any] = Field(default_factory=dict)

class PlanResult(BaseModel):
    tools_to_run: List[ToolInvocation] = Field(default_factory=list)
    reasoning: str = ""
    direct_answer: str = "" # If planner decides it doesn't need any tools

class KrishiPlanner:
    """Intelligent Planner that orchestrates tool execution dynamically."""
    
    async def generate_plan(self, query: str, context: dict, image_b64: str = None) -> PlanResult:
        """Analyzes query and decides which tools to invoke."""
        
        # If an image is provided, we definitively need the disease/vision tool.
        # We can bypass LLM planning to save latency in obvious cases.
        if image_b64:
            return PlanResult(
                tools_to_run=[
                    ToolInvocation(tool="disease_tool", kwargs={"image_b64": image_b64}),
                    ToolInvocation(tool="rag_tool", kwargs={"query": f"{context.get('crop', '')} disease treatment"})
                ],
                reasoning="Image provided. Invoking vision and RAG tools directly."
            )
            
        tool_descriptions = tool_registry.get_tool_descriptions()
        
        system_prompt = f"""
You are the KrishiMitra AI Planner. Your job is to analyze the farmer's query and context, and decide which tools to execute to gather enough information to answer perfectly.

AVAILABLE TOOLS:
{tool_descriptions}

FARMER CONTEXT:
{json.dumps(context, indent=2)}

INSTRUCTIONS:
1. Determine what information is missing.
2. Select the minimal set of tools needed to answer the query. Do NOT call tools unnecessarily.
3. If the query is a simple greeting or doesn't require tools, provide a `direct_answer`.
4. Respond ONLY with a valid JSON object matching this schema:
{{
  "reasoning": "string explaining why you chose these tools",
  "tools_to_run": [
    {{ "tool": "tool_name", "kwargs": {{ "param_name": "value" }} }}
  ],
  "direct_answer": "string (optional, only if tools_to_run is empty)"
}}
"""
        
        try:
            response = await unified_llm_service.chat(
                system_prompt=system_prompt,
                user_prompt=f"Query: {query}",
                temperature=0.1
            )
            
            # Clean JSON
            clean_json = response
            if "```json" in clean_json:
                clean_json = clean_json.split("```json")[1].split("```")[0]
            elif "```" in clean_json:
                clean_json = clean_json.split("```")[1].split("```")[0]
                
            clean_json = clean_json.strip()
            # Handle potential non-JSON output from unstable LLMs
            if not clean_json.startswith("{"):
                match = re.search(r'\{.*\}', clean_json, re.DOTALL)
                if match:
                    clean_json = match.group(0)
                else:
                    raise ValueError("No JSON object found in response.")
                    
            data = json.loads(clean_json)
            
            tools_to_run = []
            for t in data.get("tools_to_run", []):
                tools_to_run.append(ToolInvocation(tool=t["tool"], kwargs=t.get("kwargs", {})))
                
            return PlanResult(
                tools_to_run=tools_to_run,
                reasoning=data.get("reasoning", ""),
                direct_answer=data.get("direct_answer", "")
            )
            
        except Exception as e:
            logger.error(f"[Planner] Failed to generate plan: {e}")
            # Fallback to RAG Tool in case of planning failure
            logger.info("Falling back to RAG Tool due to planner failure.")
            return PlanResult(
                tools_to_run=[ToolInvocation(tool="rag_tool", kwargs={"query": query})],
                reasoning="Fallback strategy due to planner error."
            )

planner = KrishiPlanner()
