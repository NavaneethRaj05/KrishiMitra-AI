#!/bin/bash
set -e

echo "🌾 Setting up KrishiMind — Offline-First AI Platform for Precision Agriculture"
echo "═══════════════════════════════════════════════════════════════════════════════"

# Check prerequisites
command -v node   >/dev/null || { echo "❌ Node.js required (18+). Install: https://nodejs.org"; exit 1; }
command -v python >/dev/null || { echo "❌ Python 3.10+ required. Install: https://python.org"; exit 1; }
command -v ollama >/dev/null || { echo "❌ Ollama required. Install: https://ollama.com"; exit 1; }

NODE_VER=$(node -e "process.stdout.write(process.versions.node)")
echo "✅ Node.js $NODE_VER"
echo "✅ Python $(python --version | cut -d' ' -f2)"

# Copy env
if [ ! -f .env ]; then
  cp .env.example .env
  echo "⚙️  Created .env from .env.example — edit JWT_SECRET before production use"
fi

# Pull LLM models (this takes 10-30 minutes on first run)
echo ""
echo "📥 Pulling Ollama LLM models (this may take 10-30 minutes)..."
ollama pull llama3.1:8b || echo "⚠️  llama3.1:8b pull failed — try: ollama pull llama3.1:8b manually"
ollama pull llava:7b    || echo "⚠️  llava:7b pull failed — try: ollama pull llava:7b manually"

# Frontend
echo ""
echo "📦 Installing frontend dependencies..."
cd web && npm install && cd ..

# Backend
echo ""
echo "📦 Installing backend dependencies..."
cd backend && npm install && cd ..

# Python ML service
echo ""
echo "🐍 Installing Python ML dependencies (may take 5-10 minutes)..."
cd ml-service && pip install -r requirements.txt && cd ..

# spaCy model
echo ""
echo "🗣️  Downloading spaCy English model..."
python -m spacy download en_core_web_sm

# Ingest knowledge base
echo ""
echo "📚 Ingesting knowledge base documents..."
cd ml-service && python knowledge_base/ingest.py && cd ..

echo ""
echo "═══════════════════════════════════════════════════════════════════════════════"
echo "✅ KrishiMind setup complete!"
echo ""
echo "To start all services, open 3 terminals:"
echo ""
echo "  Terminal 1 (Frontend):"
echo "    cd web && npm run dev"
echo ""
echo "  Terminal 2 (Backend):"
echo "    cd backend && npm run dev"
echo ""
echo "  Terminal 3 (ML Service):"
echo "    cd ml-service && uvicorn main:app --reload --port 8000"
echo ""
echo "  Also keep Ollama running:"
echo "    ollama serve"
echo ""
echo "Then open: http://localhost:5173"
echo "═══════════════════════════════════════════════════════════════════════════════"
