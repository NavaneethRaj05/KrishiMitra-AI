/**
 * KrishiMitra AI — Shared API Client
 * Centralized fetch wrapper for all portal-to-backend communication
 */

const KrishiAPI = (() => {
  // Gemini API configuration
  const GEMINI_API_KEY = 'AIzaSyAFpMDpfwYarF0l-7tPCZM0qgge3zPcZsA';
  const GEMINI_MODEL = 'gemini-3.5-flash';
  const GEMINI_MODELS = ['gemini-3.5-flash', 'gemini-3.5-flash-lite', 'gemini-3-flash-preview', 'gemini-3.7-flash'];
  let currentModelIndex = 0;

  const getGeminiUrl = (model) =>
    `https://generativelanguage.googleapis.com/v1beta/models/${model || GEMINI_MODELS[currentModelIndex]}:generateContent?key=${GEMINI_API_KEY}`;
  const GEMINI_URL = getGeminiUrl(GEMINI_MODEL);

  // Auto-detect backend URLs based on current hostname
  const getExpressBase = () => {
    const host = window.location.hostname || 'localhost';
    return `http://${host}:5000/api`;
  };

  const getMLBase = () => {
    const host = window.location.hostname || 'localhost';
    return `http://${host}:8000`;
  };

  let EXPRESS_BASE = getExpressBase();
  let ML_BASE = getMLBase();
  let authToken = localStorage.getItem('krishimitra_token') || '';

  // ── Online Status ──
  let _isOnline = navigator.onLine;
  const statusListeners = [];

  window.addEventListener('online', () => { _isOnline = true; statusListeners.forEach(fn => fn(true)); });
  window.addEventListener('offline', () => { _isOnline = false; statusListeners.forEach(fn => fn(false)); });

  async function checkHealth() {
    try {
      const res = await fetch(`${EXPRESS_BASE.replace('/api', '')}/health`, { signal: AbortSignal.timeout(3000) });
      const ok = res.ok;
      _isOnline = ok;
      statusListeners.forEach(fn => fn(ok));
      return ok;
    } catch {
      _isOnline = false;
      statusListeners.forEach(fn => fn(false));
      return false;
    }
  }

  // Initial health check
  checkHealth();
  setInterval(checkHealth, 30000);

  // ── Fetch Wrapper ──
  async function request(url, options = {}) {
    const headers = { 'Content-Type': 'application/json', ...options.headers };
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

    const signal = options.signal || AbortSignal.timeout(options.timeout || 30000);

    try {
      const res = await fetch(url, { ...options, headers, signal });
      if (!res.ok) {
        const errorBody = await res.json().catch(() => ({}));
        throw new Error(errorBody.error || errorBody.message || `HTTP ${res.status}`);
      }
      return await res.json();
    } catch (err) {
      if (err.name === 'TypeError' || err.name === 'AbortError' || err.name === 'TimeoutError') {
        throw new Error('Network unavailable — working in offline mode');
      }
      throw err;
    }
  }

  // ── Express API Methods ──
  const express = {
    get: (path, params) => {
      const url = new URL(`${EXPRESS_BASE}${path}`);
      if (params) Object.entries(params).forEach(([k, v]) => { if (v != null) url.searchParams.set(k, v); });
      return request(url.toString());
    },
    post: (path, body) => request(`${EXPRESS_BASE}${path}`, { method: 'POST', body: JSON.stringify(body) }),
  };

  // ── ML Service Methods ──
  const ml = {
    get: (path, params) => {
      const url = new URL(`${ML_BASE}${path}`);
      if (params) Object.entries(params).forEach(([k, v]) => { if (v != null) url.searchParams.set(k, v); });
      return request(url.toString());
    },
    post: (path, body) => request(`${ML_BASE}${path}`, { method: 'POST', body: JSON.stringify(body) }),
    postForm: async (path, formData) => {
      const headers = {};
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
      const res = await fetch(`${ML_BASE}${path}`, { method: 'POST', body: formData, headers });
      if (!res.ok) throw new Error(`ML Service Error: HTTP ${res.status}`);
      return res.json();
    },
  };

  // ── Specific API Methods ──
  return {
    isOnline: () => _isOnline,
    onStatusChange: (fn) => { statusListeners.push(fn); return () => { const i = statusListeners.indexOf(fn); if (i >= 0) statusListeners.splice(i, 1); }; },
    setToken: (token) => { authToken = token; localStorage.setItem('krishimitra_token', token); },
    checkHealth,

    // Market / Mandi
    getMarketPrices: (params) => express.get('/market/prices', params),
    getPriceForecast: (params) => express.get('/market/forecast', params),

    // Crop Recommendation
    recommendCrop: (soilData) => ml.post('/crop/recommend', soilData),

    // Disease Detection
    detectDisease: (formData) => ml.postForm('/disease/diagnose', formData),

    // RAG Query
    queryText: (query, imageB64, language) => ml.post('/query/text', {
      query,
      image_b64: imageB64 || null,
      language: language || localStorage.getItem('krishimitra_lang') || 'en'
    }),
    queryVoice: (transcript, language) => ml.post('/query/voice', {
      transcript,
      language: language || localStorage.getItem('krishimitra_lang') || 'en'
    }),

    // Voice
    transcribeAudio: (audioFormData) => ml.postForm('/voice/transcribe', audioFormData),
    synthesizeSpeech: (text, lang) => ml.post('/voice/tts', { text, language: lang || 'en' }),

    // Health
    getHealth: () => express.get('/../health'),
    getMLHealth: () => ml.get('/health'),

    // Auth
    login: (phone, password) => express.post('/auth/login', { phone, password }),
    register: (data) => express.post('/auth/register', data),

    // Farmer
    getFarmerProfile: () => express.get('/farmer/profile'),

    // Search
    search: (query) => express.get('/search', { q: query }),

    // Raw access
    express,
    ml,

    // Gemini direct access
    GEMINI_API_KEY,
    GEMINI_MODEL,
    GEMINI_URL,

    // Tavily real-time web search key
    TAVILY_API_KEY: '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',

    // Real-time Tavily web search for live APMC mandis, weather, news
    async searchTavily(query, maxResults = 5) {
      const apiKey = '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';
      try {
        const res = await fetch('https://api.tavily.com/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            api_key: apiKey,
            query,
            search_depth: 'advanced',
            include_answer: true,
            max_results: maxResults,
          })
        });
        if (!res.ok) throw new Error(`Tavily API HTTP ${res.status}`);
        return await res.json();
      } catch (err) {
        console.warn('Tavily search warning:', err.message);
        return null;
      }
    },

    // Gemini direct call helper with automatic multi-model failover on 429 quota limit
    async callGemini(prompt, imageB64, mimeType) {
      const parts = [{ text: prompt }];
      if (imageB64) {
        parts.unshift({ inline_data: { mime_type: mimeType || 'image/jpeg', data: imageB64 } });
      }

      let lastError = null;

      // Try across all available verified models in the cascade
      for (let i = 0; i < GEMINI_MODELS.length; i++) {
        const modelIdx = (currentModelIndex + i) % GEMINI_MODELS.length;
        const modelName = GEMINI_MODELS[modelIdx];
        const targetUrl = getGeminiUrl(modelName);

        try {
          const res = await fetch(targetUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts }],
              generationConfig: { temperature: 0.2, maxOutputTokens: 4096 }
            })
          });

          if (res.status === 429 || res.status === 503) {
            console.warn(`[Gemini API] Model ${modelName} returned HTTP ${res.status} (Quota/Busy). Rotating to next model...`);
            continue; // Try next model immediately
          }

          if (!res.ok) {
            const errText = await res.text();
            throw new Error(`Gemini API [${modelName}] HTTP ${res.status}: ${errText}`);
          }

          const data = await res.json();
          // Successfully completed — lock this working model as primary for subsequent calls
          currentModelIndex = modelIdx;
          return data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        } catch (err) {
          lastError = err;
          console.warn(`[Gemini API] Attempt on ${modelName} failed:`, err.message);
        }
      }

      throw lastError || new Error('All Gemini model endpoints exhausted');
    },

    // Parse JSON from Gemini response (strips markdown fences)
    parseGeminiJSON(rawText) {
      let clean = rawText.trim();
      if (clean.startsWith('```')) {
        const lines = clean.split('\n');
        if (lines[0].startsWith('```')) lines.shift();
        if (lines[lines.length - 1].startsWith('```')) lines.pop();
        clean = lines.join('\n').trim();
      }
      return JSON.parse(clean);
    },
  };
})();

// Make globally available
window.KrishiAPI = KrishiAPI;
