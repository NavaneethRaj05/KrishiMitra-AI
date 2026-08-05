"""
KrishiMitraAI ML Service — FastAPI entry point
Hosts: RAG, Disease Detection, Crop Recommendation, Voice NLP
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging
import os

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("krishimitraai")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup: initialise all ML services."""
    logger.info("🌾 KrishiMitraAI ML Service starting up...")

    # Lazy imports so missing deps don't crash startup during dev
    try:
        from services.rag_service import rag_service
        count = 0
        try:
            count = rag_service.collection.count()
        except Exception:
            pass

        # Auto-ingest on a fresh clone: if DB is empty but documents exist, ingest now
        if count == 0:
            from pathlib import Path
            docs_path = Path("knowledge_base/documents")
            if docs_path.exists() and any(docs_path.glob("*.txt")):
                logger.info("📚 Knowledge base is empty — auto-ingesting documents from %s ...", docs_path)
                try:
                    new_chunks = rag_service.ingest_documents(docs_path)
                    count = new_chunks
                    logger.info("✅ Auto-ingested %d chunks into ChromaDB", new_chunks)
                except Exception as ingest_err:
                    logger.warning("⚠️  Auto-ingest failed: %s", ingest_err)
            else:
                logger.warning("⚠️  knowledge_base/documents/ has no .txt files — RAG will not have context")

        logger.info("✅ RAG service ready (%d chunks)", count)
    except Exception as e:
        logger.warning("⚠️  RAG service failed to init: %s", e)

    try:
        from services.crop_service import crop_service
        logger.info("✅ Crop service ready")
    except Exception as e:
        logger.warning("⚠️  Crop service failed to init: %s", e)

    try:
        from services.disease_service import disease_service
        logger.info("✅ Disease service ready")
    except Exception as e:
        logger.warning("⚠️  Disease service failed to init: %s", e)

    try:
        from services.voice_service import voice_service
        logger.info("✅ Voice service ready")
    except Exception as e:
        logger.warning("⚠️  Voice service failed to init: %s", e)

    try:
        from services.kag_service import kag_service
        ok = kag_service.health_check()
        logger.info("✅ KAG service ready (Neo4j connected: %s)", ok)
    except Exception as e:
        logger.warning("⚠️  KAG service failed to init: %s", e)

    try:
        from services.intent_service import intent_service
        test = intent_service.classify("why are tomato leaves turning yellow?")
        logger.info("✅ Intent service ready (test: %s)", test.intent)
    except Exception as e:
        logger.warning("⚠️  Intent service failed to init: %s", e)

    # Check LLM backends (Ollama primary, Gemini optional)
    try:
        from services.unified_llm_service import unified_llm_service
        llm_status = unified_llm_service.health_check()
        primary = llm_status.get("primary", "none")
        if llm_status["ollama"]["available"]:
            models = llm_status["ollama"]["models"]
            logger.info("✅ Ollama (PRIMARY) ready with models: %s", ", ".join(models[:5]))
        else:
            logger.warning("⚠️  Ollama not available. Run: ollama serve && ollama pull llama3.1:8b")
        if llm_status["gemini"]["available"]:
            logger.info("✅ Gemini (FALLBACK) is connected and available")
        else:
            logger.info("ℹ️  Gemini not configured (offline-only mode — this is fine)")
        logger.info("🧠 Primary LLM backend: %s", primary.upper())
    except Exception as e:
        logger.warning("⚠️  LLM health check failed: %s", e)

    # Initialize location service
    try:
        from services.location_service import location_service
        n_districts = len(location_service.districts)
        logger.info("✅ Location service ready (%d districts loaded for offline GPS)", n_districts)
    except Exception as e:
        logger.warning("⚠️  Location service failed to init: %s", e)

    logger.info("🚀 All services initialised — listening on port 8000")
    yield
    logger.info("👋 Shutting down")


app = FastAPI(
    title="KrishiMitraAI ML Service",
    description="Offline-First AI Platform for Precision Agriculture",
    version="1.0.0",
    lifespan=lifespan,
)

# Allow ALL origins in development for cross-platform support (iOS, Android, web, Expo)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers — each wrapped individually so one failure doesn't silently kill the rest
def _include(router_obj, **kwargs):
    try:
        app.include_router(router_obj, **kwargs)
    except Exception as exc:
        logger.error("❌ Failed to include router %s: %s", router_obj, exc)

try:
    from routers import rag, disease, crop, voice  # noqa: E402
    _include(rag.router)
    _include(disease.router)
    _include(crop.router)
    _include(voice.router)
except Exception as e:
    logger.error("❌ Failed to import base routers: %s", e)

try:
    from routers.kag import router as kag_router  # noqa: E402
    _include(kag_router)
except Exception as e:
    logger.error("❌ Failed to import kag router: %s", e)

try:
    from routers.search import router as search_router  # noqa: E402
    _include(search_router)
except Exception as e:
    logger.error("❌ Failed to import search router: %s", e)

try:
    from routers.intent import router as intent_router  # noqa: E402
    _include(intent_router)
except Exception as e:
    logger.error("❌ Failed to import intent router: %s", e)

try:
    from routers.query_router import router as query_router  # noqa: E402
    _include(query_router, prefix="/query")
    logger.info("✅ query_router registered at /query")
except Exception as e:
    logger.error("❌ Failed to import query_router: %s", e)


@app.get("/health")
async def health():
    # Include LLM status in health check
    llm_status = {"primary": "unknown"}
    try:
        from services.unified_llm_service import unified_llm_service
        llm_status = unified_llm_service.health_check()
    except Exception:
        pass

    location_ready = False
    try:
        from services.location_service import location_service
        location_ready = len(location_service.districts) > 0
    except Exception:
        pass

    return {
        "status": "ok",
        "service": "krishimitra-ai-ml",
        "version": "1.1.0",
        "llm": {
            "primary": llm_status.get("primary", "none"),
            "ollama": llm_status.get("ollama", {}).get("available", False),
            "gemini": llm_status.get("gemini", {}).get("available", False),
        },
        "gps_location": location_ready,
    }


@app.get("/")
async def root():
    from fastapi.responses import HTMLResponse
    return HTMLResponse(content="""
    <html>
        <head>
            <title>KrishiMitraAI ML Service</title>
            <style>
                body { font-family: 'Segoe UI', sans-serif; text-align: center; padding: 50px; background-color: #f7f9fa; color: #2c3e50; }
                h1 { color: #27ae60; }
                .btn { display: inline-block; background: #27ae60; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin-top: 20px; font-weight: bold; }
                .btn:hover { background: #219653; }
            </style>
        </head>
        <body>
            <h1>🌾 KrishiMitraAI ML Service is Running!</h1>
            <p>This is the backend API and machine learning service engine.</p>
            <p>To access the farmer application user interface, please open:</p>
            <a class="btn" href="http://localhost:5173" target="_blank">Open KrishiMitraAI Web App</a>
        </body>
    </html>
    """)
