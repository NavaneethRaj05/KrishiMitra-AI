"""
KrishiSearch Answer Engine — Agentic Pipeline
Streams a cited answer using the new AI Planner and Tool Registry architecture.
"""
import asyncio
import json
import os
import re
import logging
from typing import AsyncGenerator, Optional

# Tools registry must be imported to initialize tools
import tools.implementations
from tools.registry import tool_registry
from agents.planner import planner

from services.search_service import search_service, SearchResult
from services.unified_llm_service import unified_llm_service
from services.intent_service import intent_service

from core.context_builder import context_builder
from core.memory_manager import memory_manager
from prompts.prompt_manager import prompt_manager
from core.confidence_scorer import confidence_scorer
from services.validation_service import validation_service
from shared.constants import KNOWN_CROPS

logger = logging.getLogger(__name__)

LANG_MAP = {
    "en": "English", "hi": "Hindi",  "kn": "Kannada",
    "ta": "Tamil",   "te": "Telugu", "mr": "Marathi",
    "pa": "Punjabi", "bn": "Bengali"
}

# Status messages per stage
STATUS_MESSAGES = {
    "plan":      "🧠 Planning execution strategy...",
    "tool":      "⚙️ Executing specialized tools...",
    "generate":  "✍️ Generating expert answer...",
    "related":   "💬 Generating follow-up questions...",
}

class KrishiSearchService:

    async def _related_questions(self, query: str, answer: str, language: str) -> list:
        lang  = LANG_MAP.get(language, "English")
        prompt = (
            f"Based on this farming question and answer, generate exactly 3 short, "
            f"practical follow-up questions a farmer would ask next.\n"
            f"Original question: {query}\n"
            f"Answer summary: {answer[:300]}\n"
            f"Language: {lang}\n"
            f"Return ONLY a JSON array of 3 strings. No explanations.\n"
            f'Format: ["question 1", "question 2", "question 3"]'
        )
        try:
            text = await unified_llm_service.chat(
                system_prompt="You generate follow-up agricultural questions. Return ONLY a JSON array.",
                user_message=prompt,
                temperature=0.7,
            )
            text = text.strip()
            start = text.find("[")
            end   = text.rfind("]") + 1
            if start >= 0 and end > start:
                return json.loads(text[start:end])
        except Exception as e:
            logger.warning(f"[RelatedQ] {e}")
        # Hardcoded fallback if LLM fails
        return [
            "What fertilizer should I use for this crop?",
            "How to prevent this disease next season?",
            "What are the current market prices?"
        ]


    def _extract_confidence(self, answer: str) -> str:
        """Removes the CONFIDENCE tag from the answer text if present."""
        match = re.search(r'CONFIDENCE:\s*(\d+)%?', answer, re.IGNORECASE)
        if match:
            clean = re.sub(r'\s*CONFIDENCE:\s*\d+%?\s*', '', answer).strip()
            return clean
        return answer

    async def stream_answer(
        self,
        query:          str,
        language:       str  = "en",
        conversation:   Optional[list] = None,
        farmer_history: Optional[list] = None,
        online:         bool = True,
        image_b64:      Optional[str] = None,
        farmer_context: Optional[dict] = None,
    ) -> AsyncGenerator:
        
        conversation   = conversation   or []
        farmer_history = farmer_history or []
        sources        = []
        mode           = "offline"

        if language == "en" or not language:
            try:
                from services.voice_service import voice_service
                detected_lang = voice_service.detect_language_from_text(query)
                if detected_lang != "en":
                    language = detected_lang
            except Exception:
                pass

        try:
            # ── 1. Planning Phase ──────────────────────────────────────────
            yield {"type": "status", "message": STATUS_MESSAGES["plan"]}
            plan = await planner.generate_plan(query, farmer_context or {}, image_b64)
            
            # Use intent service just for displaying intent in the UI
            intent = await asyncio.to_thread(intent_service.classify, query)
            if image_b64:
                intent.intent = "disease_diagnosis"

            yield {
                "type": "intent",
                "data": {
                    "intent":      intent.intent,
                    "display":     intent.intent.replace("_", " ").title(),
                    "confidence":  intent.confidence,
                }
            }

            # ── 2. Tool Execution Phase ──────────────────────────────────────
            if plan.direct_answer and not plan.tools_to_run:
                full_answer = plan.direct_answer
                yield {"type": "token", "content": full_answer}
                yield {
                    "type":             "done",
                    "mode":             "offline",
                    "full_answer":      full_answer,
                    "confidence":       99,
                    "citation_count":   0,
                    "source_count":     0,
                    "intent":           intent.intent,
                }
                return

            yield {"type": "status", "message": STATUS_MESSAGES["tool"]}
            
            # Execute planned tools concurrently
            tasks = []
            for tool_invocation in plan.tools_to_run:
                try:
                    tool_instance = tool_registry.get_tool(tool_invocation.tool)
                    # Merge planner kwargs with farmer context variables where appropriate
                    kwargs = tool_invocation.kwargs.copy()
                    if farmer_context:
                        if "location" not in kwargs: kwargs["location"] = farmer_context.get("district")
                        if "district" not in kwargs: kwargs["district"] = farmer_context.get("district")
                        if "soil_type" not in kwargs: kwargs["soil_type"] = farmer_context.get("soil_type")
                        if "agro_zone" not in kwargs: kwargs["agro_zone"] = farmer_context.get("agro_zone")
                        
                    tasks.append(tool_instance.execute(**kwargs))
                except Exception as e:
                    logger.error(f"Failed to setup tool {tool_invocation.tool}: {e}")
            
            if tasks:
                results = await asyncio.gather(*tasks, return_exceptions=True)
                for idx, result in enumerate(results):
                    tool_name = plan.tools_to_run[idx].tool
                    if isinstance(result, Exception):
                        logger.error(f"Tool {tool_name} failed: {result}")
                        continue
                        
                    if result.success:
                        # Adapt tool output to SearchResult format for the LLM
                        if tool_name == "rag_tool":
                            # rag_tool returns a list of chunks
                            for c in result.data:
                                sources.append(SearchResult(
                                    url="", title=c.get("title", "Local KB"),
                                    excerpt=c.get("text", "")[:400], full_text=c.get("text", ""),
                                    source="Local KB", score=c.get("score", 0.9)
                                ))
                        else:
                            # Standard string or json data
                            content = result.data if isinstance(result.data, str) else json.dumps(result.data)
                            sources.append(SearchResult(
                                url="", title=f"Output from {tool_name}",
                                excerpt=content[:400], full_text=content,
                                source=tool_name, score=0.95
                            ))

            # Optional: Add online web search if online and not explicitly prevented
            if online:
                yield {"type": "status", "message": "🔍 Searching agricultural web sources..."}
                try:
                    web_sources = await search_service.search(query, max_results=3)
                    sources.extend(web_sources)
                except Exception as e:
                    logger.warning(f"[WebSearch] {e}")

            mode = "online" if online else "offline"

            # ── 3. Emit Sources ──────────────────────────────────────────────
            yield {
                "type": "sources",
                "data": [
                    {
                        "index":   i + 1,
                        "url":     s.url if hasattr(s, 'url') else s.get('url', ''),
                        "title":   s.title if hasattr(s, 'title') else s.get('title', 'Source'),
                        "excerpt": s.excerpt if hasattr(s, 'excerpt') else s.get('excerpt', ''),
                        "source":  s.source if hasattr(s, 'source') else s.get('source', 'Tool'),
                        "favicon": s.favicon if hasattr(s, 'favicon') and s.favicon else ("📚" if (hasattr(s, 'source') and s.source == "Local KB") else "🔧"),
                        "score":   round(s.score, 3) if hasattr(s, 'score') else 0.9,
                    }
                    for i, s in enumerate(sources)
                ]
            }

            # ── 4. Build System Prompt ────────────────────────────────────────
            mem_ctx = memory_manager.format_memory_context(farmer_history)
            system = prompt_manager.build_system_prompt(sources, mem_ctx, language, farmer_context or {})
            
            messages = [{"role": "system", "content": system}]
            for turn in conversation[-6:]:
                messages.append({"role": turn["role"], "content": turn["content"]})
            messages.append({"role": "user", "content": query})

            # ── 5. Stream LLM Answer ──────────────────────────────────────────
            yield {"type": "status", "message": STATUS_MESSAGES["generate"]}
            full_answer = ""

            try:
                context_texts = []
                for s in sources:
                    txt = getattr(s, "full_text", None) or (s.get("full_text") if isinstance(s, dict) else "")
                    if not txt:
                        txt = getattr(s, "excerpt", None) or (s.get("excerpt") if isinstance(s, dict) else "")
                    if txt:
                        context_texts.append(txt)

                stream = unified_llm_service.chat_stream(
                    system_prompt=system,
                    query=query,
                    history=conversation[-6:],
                    context=context_texts
                )
                async for token in stream:
                    full_answer += token
                    yield {"type": "token", "content": token}
            except Exception as e:
                logger.warning(f"LLM streaming failed: {e}. Building answer from sources.")
                from utils.fallback_formatter import format_offline_fallback
                full_answer = format_offline_fallback(
                    query,
                    sources or [],
                    target_lang=language,
                    location_context=farmer_context or {}
                )
                words = full_answer.split(' ')
                for wi in range(0, len(words), 3):
                    tok = ' '.join(words[wi:wi+3]) + ' '
                    yield {"type": "token", "content": tok}

            # ── 6. Validation & Confidence Scoring ──
            clean_answer = self._extract_confidence(full_answer)
            
            # Extract tool metadata if available (e.g. vision confidence)
            tool_metadata = {}
            if image_b64:
                tool_metadata['vision_confidence'] = 90  # Placeholder since we don't have direct diag here
                
            confidence_score = confidence_scorer.compute_score(clean_answer, sources, tool_metadata)
            
            is_valid, validated_answer = validation_service.validate_response(
                clean_answer, intent.intent, farmer_context
            )
            
            # If the validation added a warning, stream the extra text
            if len(validated_answer) > len(clean_answer):
                extra_text = validated_answer[len(clean_answer):]
                words = extra_text.split(' ')
                for wi in range(0, len(words), 3):
                    tok = ' '.join(words[wi:wi+3]) + ' '
                    yield {"type": "token", "content": tok}
                    
            clean_answer = validated_answer
            
            yield {"type": "confidence", "score": confidence_score}

            # ── 7. Related Questions ──
            yield {"type": "status", "message": STATUS_MESSAGES["related"]}
            related = await self._related_questions(query, clean_answer, language)
            if related:
                yield {"type": "related", "questions": related}

            # ── 8. Done ───────────────────────────────────────────────────────
            citation_count = len(set(re.findall(r'\[Source:\s*.*?\]', full_answer)))
            yield {
                "type":             "done",
                "mode":             mode,
                "full_answer":      clean_answer,
                "confidence":       confidence_score,
                "citation_count":   citation_count,
                "source_count":     len(sources),
                "intent":           intent.intent,
            }

        except Exception as e:
            logger.error(f"[KrishiSearch] {e}", exc_info=True)
            yield {"type": "error", "message": str(e)}

krishi_search_service = KrishiSearchService()
