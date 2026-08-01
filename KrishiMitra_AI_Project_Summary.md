# KrishiMitra AI: Project Summary & Architecture Overview

**KrishiMitra AI** is an advanced, multimodal agricultural assistant designed to deliver hyper-localized, expert-grade agronomic advice. Built for Indian farmers, it processes text, voice, images, and environmental data (soil/weather) to provide precise, actionable solutions grounded in verified ICAR (Indian Council of Agricultural Research) documentation.

---

## 🌟 Key Capabilities

1. **Multimodal Intelligence:**
   - **Text & Voice**: Seamlessly handles queries in multiple regional languages using intent detection and dynamic fallback.
   - **Image Diagnosis (Vision)**: Uses CNN models backed by LLaVA vision LLMs to detect crop diseases from leaf images.
   - **Soil & Climate Advisory**: Integrates GPS location, live weather (Open-Meteo), and soil metrics to provide localized crop recommendations (via SHAP models).

2. **Agentic RAG + KAG Architecture:**
   - **RAG (Retrieval-Augmented Generation)**: Uses ChromaDB with a hybrid **Semantic (Cosine) + BM25 Keyword** search to retrieve exact chemical names, dosages, and treatment protocols from offline ICAR manuals.
   - **KAG (Knowledge-Augmented Generation)**: Leverages a Neo4j Knowledge Graph to understand complex relational data (Crop ↔ Disease ↔ Treatment), ensuring safe, organic, and chemically accurate advice.

3. **Hyper-Localized Context:**
   - Automatically injects the farmer's district, state, agro-climatic zone, current season, real-time weather (temp/humidity), and soil type into every AI prompt. This ensures the AI doesn't give "generic textbook answers" but rather contextualized advice (e.g., warning a farmer in Hassan not to spray fungicide if 85% humidity is detected).

4. **Resilient Offline-First Design:**
   - Features a robust **Smart Fallback Formatter**. If the LLM streaming fails or the internet drops, the system falls back to a deterministic rules engine that combines the locally retrieved ICAR chunks and the farmer's GPS context into a cleanly formatted, readable response.

---

## 🏗️ Core System Architecture

### 1. Intent & Strategy Router (`intent_service.py`)
Categorizes user queries into 11 specialized intents (e.g., `disease_diagnosis`, `market_query`, `government_scheme`) and determines the optimal search strategy (whether to prioritize RAG, KAG, or Web Search).

### 2. Hybrid Retrieval Engine (`rag_service.py`)
- **Domain-Aware Expansion**: Automatically appends synonyms (e.g., "blight" → "Phytophthora, Alternaria, Mancozeb") before searching.
- **Hybrid Scoring**: Combines cosine similarity with BM25 exact keyword matching to ensure highly specific agrochemicals and crop varieties are retrieved.
- **Context Budgeting**: Truncates retrieved chunks to prevent LLM context-window overflow (8K limit).

### 3. Unified Search Pipeline (`krishi_search_service.py`)
An agentic pipeline that orchestrates:
- **Web Search**: Tavily, Semantic Scholar, Vikaspedia, PubMed, FAO.
- **Tool Execution**: Triggers CNN vision models, SHAP soil models, Open-Meteo weather APIs, and Agmarknet market prices based on intent.
- **LLM Streaming**: Synthesizes all gathered intelligence and streams the answer back to the UI in the user's preferred regional language, demanding inline citations for every factual claim.

### 4. Modality-Specific Prompting (`modality_prompts.py`)
Expertly engineered system prompts with **Few-Shot Examples**. The prompts force the LLM into a two-part diagnostic structure:
1. **Situation Analysis**: Explaining how the local weather/soil is affecting the crop.
2. **Expert Recommendation**: Providing a tabular dosage guide (Chemical/Organic) and follow-up questions.

---

## 🚀 Recent Upgrades (Phase 2)

- **Vision-RAG Integration**: The `/image` endpoint now queries the offline ChromaDB knowledge base *after* detecting a disease via CNN, ensuring the vision model recommends ICAR-verified treatments rather than hallucinating generic advice.
- **Graceful Neo4j Failures**: KAG services now cache availability and fail safely when the graph database is down, allowing the system to run seamlessly in pure RAG mode.
- **Fallback Localization**: The deterministic offline fallback generator now dynamically injects the farmer's GPS weather and soil data, ensuring offline answers remain highly relevant.

---

*KrishiMitra AI represents the next generation of precision extension services — combining edge-AI resilience with cutting-edge RAG/KAG reasoning to empower farmers across India.*
