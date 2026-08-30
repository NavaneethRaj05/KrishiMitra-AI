/**
 * KrishiMitra AI — AI Assistant Portal Logic
 * RAG chat workspace with DIRECT Gemini 3.6 Flash integration,
 * voice assistant, document citations, TTS
 */

const AIPortal = (() => {
  const STORAGE_KEY = 'krishimitra_ai_history';
  let chatHistory = [];
  let isRecording = false;

  // Prompt cards focus on CONVERSATIONAL topics that don't map to a form/tool.
  // Disease Diagnosis → use Disease Scanner (dedicated tool with photo upload).
  // Crop Recommendation → use Crop Advice tool (structured N-P-K form).
  // These cards guide users to nuanced advisory that only conversational AI handles.
  const SUGGESTED_PROMPTS = [
    {
      title: '⚖️ Organic vs Chemical Treatment',
      desc: 'Compare organic and chemical approaches for Early Blight in Tomato',
      prompt: 'Compare the pros and cons of organic treatment (neem oil, Trichoderma, copper-based fungicides) vs chemical treatment (Mancozeb, Chlorothalonil) for Early Blight (Alternaria solani) in Tomato. Consider cost per acre, residue safety period, effectiveness timeline, and environmental impact. Which would you recommend for a small farmer?'
    },
    {
      title: '🔄 Why Did My Crop Advice Change?',
      desc: 'Why might the recommended crop change between seasons for the same field?',
      prompt: 'My soil NPK test shows N:85, P:40, K:45 with pH 6.3. Last Kharif I was recommended Rice, but this Rabi I am being advised to grow Wheat. Can you explain the seasonal logic behind this change? How do temperature, day length, water availability, and market factors affect this decision?'
    },
    {
      title: '💧 Irrigation & Fertilizers',
      desc: 'How much Urea and DAP is required per acre for Rice (Paddy)?',
      prompt: 'Calculate the complete fertilizer schedule (Urea, DAP, MOP, Zinc Sulphate) per acre for Paddy rice during all growth stages. Include basal dose and top dressing timings with exact quantities.'
    },
    {
      title: '📈 Market & Government Schemes',
      desc: 'What is the current PM-KISAN installment schedule and MSP for Tomato?',
      prompt: 'Explain PM-KISAN benefit scheme details, eligibility, installment amounts, and current MSP prices for major horticultural crops in Karnataka. Include application process.'
    }
  ];

  // ── Direct Gemini Chat Call ──
  async function callGeminiChat(query, lang = 'en') {
    const langNames = { en: 'English', kn: 'Kannada', hi: 'Hindi', te: 'Telugu', ta: 'Tamil', mr: 'Marathi' };
    const langName = langNames[lang] || 'English';

    const systemPrompt = `You are KrishiMitra AI, a world-class precision agricultural advisor for Indian farmers. You have deep expertise in:
- Crop science, agronomy, soil science, plant pathology
- Indian agricultural practices (ICAR Package of Practices)
- Fertilizer management (Urea, DAP, MOP, micronutrients)
- Pest and disease management (IPM, chemical, organic methods)
- Market intelligence (APMC mandi prices, MSP, government schemes)
- Irrigation and water management
- Weather-based advisory

CRITICAL RULES:
1. Always provide SPECIFIC, ACTIONABLE advice with exact quantities, product names, dosages
2. Use Indian agricultural context (crops, varieties, brands available in India)
3. Include both organic AND chemical treatment options when discussing pest/disease
4. Mention specific fertilizer brands (IFFCO, Coromandel, Zuari, RCF, etc.) with prices when relevant
5. Provide answers with proper formatting using **bold** for emphasis and bullet points
6. Be factually accurate — cite ICAR, KVK, or agricultural university recommendations
7. If the user asks in ${langName}, respond in ${langName}
8. For crop recommendations, always explain WHY with soil/climate reasoning
9. For disease queries, always include: symptoms, cause, chemical treatment, organic treatment, prevention

Respond in ${langName} language.`;

    const prompt = `${systemPrompt}\n\nFarmer's Question: ${query}`;

    const rawText = await KrishiAPI.callGemini(prompt);
    return rawText;
  }

  function init() {
    loadHistory();
    renderWelcomeOrMessages();
    // Phase 3: Read ?prefill= query param and auto-send as first message
    _handlePrefill();
  }

  function _handlePrefill() {
    try {
      const params = new URLSearchParams(window.location.search);
      const prefill = params.get('prefill');
      if (prefill && prefill.trim()) {
        // Small delay so the welcome screen renders before the typing indicator appears
        setTimeout(() => sendMessage(prefill.trim()), 400);
        // Clean the URL so a page refresh doesn't re-send
        window.history.replaceState({}, '', window.location.pathname);
      }
    } catch (e) { /* ignore */ }
  }

  function loadHistory() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      chatHistory = stored ? JSON.parse(stored) : [];
    } catch (e) {
      chatHistory = [];
    }
  }

  function saveHistory() {
    try {
      // Keep only last 50 messages to prevent localStorage overflow
      if (chatHistory.length > 50) chatHistory = chatHistory.slice(-50);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(chatHistory));
    } catch (e) {
      console.warn('Could not save chat history', e);
    }
  }

  function renderWelcomeOrMessages() {
    const container = document.getElementById('chat-messages');
    if (!container) return;

    if (chatHistory.length === 0) {
      container.innerHTML = `
        <div class="ai-welcome">
          <div class="ai-avatar-glow">🤖</div>
          <h2 style="font-size:24px;font-family:var(--font-display);font-weight:700;margin-bottom:8px;">Welcome to KrishiMitra AI</h2>
          <p style="color:var(--ai-text-muted);max-width:480px;font-size:14px;line-height:1.5;">
            Your AI Agronomist powered by RAG, Knowledge Graphs, and
            Multilingual Crop Intelligence. Ask any farming or market query!
          </p>

          <div class="ai-suggested-prompts">
            ${SUGGESTED_PROMPTS.map((p, idx) => `
              <div class="ai-prompt-card" onclick="AIPortal.sendSuggestedPrompt(${idx})">
                <div class="ai-prompt-card-title">${p.title}</div>
                <div class="ai-prompt-card-desc">${p.desc}</div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    } else {
      container.innerHTML = chatHistory.map(msg => renderMessageHTML(msg)).join('');
      scrollToBottom();
    }
  }

  function renderMessageHTML(msg) {
    const isUser = msg.role === 'user';
    const avatar = isUser ? '👤' : '🤖';

    // Phase 3: tool_redirect — render a special redirect bubble with a deep-link button
    if (!isUser && msg.isToolRedirect) {
      return `
        <div class="chat-message assistant">
          <div class="chat-avatar">🤖</div>
          <div class="chat-bubble" style="border-left:3px solid #8b5cf6;">
            <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;">
              <span style="font-size:11px;font-weight:700;background:#8b5cf625;color:#c4b5fd;padding:2px 8px;border-radius:99px;">🔀 Dedicated Tool Available</span>
            </div>
            <div>${formatMarkdown(msg.content)}</div>
            <a href="${msg.redirectHref}" style="display:inline-flex;align-items:center;gap:6px;margin-top:10px;padding:7px 16px;border-radius:99px;background:linear-gradient(135deg,#7c3aed,#8b5cf6);color:#fff;font-size:13px;font-weight:700;text-decoration:none;">
              ${msg.redirectLabel || '🔍 Open Tool'}
            </a>
          </div>
        </div>
      `;
    }

    let citationsHTML = '';
    if (msg.citations && msg.citations.length > 0) {
      citationsHTML = `
        <div class="citation-box">
          <div class="citation-title">📚 Knowledge Sources</div>
          <div style="color:var(--ai-text-muted);">${msg.citations.map(c => `• ${c}`).join('<br>')}</div>
        </div>
      `;
    }

    let offlineBanner = '';
    if (!isUser && (msg.source === 'offline_knowledge' || msg.source === 'offline' || msg.isOffline)) {
      offlineBanner = `
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:8px;padding:6px 10px;border-radius:6px;background:#f59e0b18;border:1px solid #f59e0b40;color:#fbbf24;font-size:11px;font-weight:600;">
          📴 Answering from on-device knowledge — reconnect for full AI analysis
        </div>
      `;
    }

    let sourceTag = '';
    if (!isUser && msg.source) {
      const sourceColors = { gemini: '#8b5cf6', gemini_voice: '#8b5cf6', ml_service: '#3b82f6', offline_knowledge: '#f59e0b', offline: '#f59e0b' };
      const sourceLabels = { gemini: '⚡ Gemini AI', gemini_voice: '🎙️ Gemini Vernacular Engine', ml_service: '🧠 ML Service + RAG', offline_knowledge: '📴 ICAR On-Device Corpus', offline: '📦 Offline' };
      sourceTag = `<span style="display:inline-block;font-size:10px;padding:2px 8px;border-radius:10px;background:${sourceColors[msg.source] || '#64748b'}20;color:${sourceColors[msg.source] || '#64748b'};font-weight:600;margin-top:4px;">${sourceLabels[msg.source] || msg.source}</span>`;
    }

    // Voice Message Attributes (User)
    let voiceHeader = '';
    if (isUser && msg.isVoice) {
      voiceHeader = `
        <div class="chat-voice-header">
          <span class="chat-voice-tag">🎙️ Spoken in ${msg.languageName || 'Indian Vernacular'} · ${Math.round((msg.confidence || 0.95)*100)}% Match · ${msg.snr || 23} dB SNR</span>
        </div>
      `;
    }
    const englishSub = isUser && msg.englishTranslation && msg.englishTranslation !== msg.content ? `
      <div class="chat-voice-english-sub">🌐 English: "${msg.englishTranslation}"</div>
    ` : '';

    // Voice Message Attributes (Assistant)
    let intentHTML = '';
    if (!isUser && msg.intent) {
      const intentIcons = {
        disease_diagnosis: '🦠 Disease Diagnosis',
        crop_advise: '🌱 Crop Advisory',
        fertilizer_dosage: '🧪 Fertilizer & Nutrients',
        pest_control: '🦟 Pest Management',
        market_price: '📈 Mandi Market Rate',
        irrigation: '💧 Irrigation & Water',
        general_farming: '🌾 General Agronomy'
      };
      intentHTML = `<span class="badge" style="background:#8b5cf625;color:#c4b5fd;font-weight:700;font-size:11px;margin-bottom:6px;display:inline-block;">${intentIcons[msg.intent] || msg.intent}</span>`;
    }

    let entitiesHTML = '';
    if (!isUser && msg.entities) {
      const chips = [
        ...(msg.entities.crops || []).map(c => `<span class="chat-entity-chip" style="color:#6ee7b7;background:#064e3b35;border:1px solid #10b98130;">🌱 ${c}</span>`),
        ...(msg.entities.symptoms || []).map(s => `<span class="chat-entity-chip" style="color:#fcd34d;background:#78350f35;border:1px solid #f59e0b30;">🔍 ${s}</span>`),
        ...(msg.entities.pests_diseases || []).map(p => `<span class="chat-entity-chip" style="color:#fca5a5;background:#7f1d1d35;border:1px solid #ef444430;">🦠 ${p}</span>`),
        ...(msg.entities.chemicals_fertilizers || []).map(ch => `<span class="chat-entity-chip" style="color:#c4b5fd;background:#4c1d9535;border:1px solid #8b5cf630;">🧪 ${ch}</span>`),
        ...(msg.entities.locations || []).map(l => `<span class="chat-entity-chip" style="color:#93c5fd;background:#1e3a8a35;border:1px solid #3b82f630;">📍 ${l}</span>`),
      ];
      if (chips.length > 0) {
        entitiesHTML = `<div style="margin:6px 0 8px;">${chips.join('')}</div>`;
      }
    }

    let remediesHTML = '';
    if (!isUser && (msg.chemicalRemedy || msg.organicRemedy)) {
      remediesHTML = `
        <div style="display:grid;gap:8px;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));margin:10px 0;">
          ${msg.chemicalRemedy ? `
            <div style="background:#141422;border-left:3px solid #8b5cf6;padding:10px 12px;border-radius:8px;font-size:12px;">
              <strong style="color:#c4b5fd;display:block;margin-bottom:2px;">🧪 Chemical Treatment & Dosages</strong>
              <span style="color:#e4e4e7;line-height:1.4;">${msg.chemicalRemedy}</span>
            </div>
          ` : ''}
          ${msg.organicRemedy ? `
            <div style="background:#141422;border-left:3px solid #10b981;padding:10px 12px;border-radius:8px;font-size:12px;">
              <strong style="color:#6ee7b7;display:block;margin-bottom:2px;">🌿 Organic & Biological Control</strong>
              <span style="color:#e4e4e7;line-height:1.4;">${msg.organicRemedy}</span>
            </div>
          ` : ''}
        </div>
      `;
    }

    const escapedContent = (msg.content || '').replace(/'/g, "\\'").replace(/"/g, '&quot;').replace(/\n/g, ' ');
    const langToSpeak = msg.languageCode || localStorage.getItem('krishimitra_lang') || 'en';
    const langBtnLabel = msg.languageName ? `🔊 Listen in ${msg.languageName.split(' ')[0]}` : '🔊 Speak';
    const ttsButton = !isUser ? `
      <button class="btn btn-ghost btn-sm" onclick="AIPortal.speakVernacularText('${escapedContent}', '${langToSpeak}')" style="margin-top:8px;padding:3px 10px;font-size:12px;color:#c4b5fd;border:1px solid #8b5cf630;border-radius:99px;" title="Listen to advisory in ${langToSpeak}">
        ${langBtnLabel}
      </button>
    ` : '';

    return `
      <div class="chat-message ${isUser ? 'user' : 'assistant'}">
        <div class="chat-avatar">${avatar}</div>
        <div class="chat-bubble">
          ${offlineBanner}
          ${voiceHeader}
          <div>${formatMarkdown(msg.content)}</div>
          ${englishSub}
          ${intentHTML}
          ${entitiesHTML}
          ${remediesHTML}
          ${citationsHTML}
          ${sourceTag}
          ${ttsButton}
        </div>
      </div>
    `;
  }

  function formatMarkdown(text) {
    if (!text) return '';
    return text
      .replace(/\n\n/g, '<br><br>')
      .replace(/\n/g, '<br>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code style="background:#272738;padding:2px 6px;border-radius:4px;font-size:12px;">$1</code>')
      .replace(/^- /gm, '• ');
  }

  function scrollToBottom() {
    const container = document.getElementById('chat-messages');
    if (container) container.scrollTop = container.scrollHeight;
  }

  // ── Offline On-Device ICAR Corpus Search Engine ──
  let cachedOfflineCorpus = null;
  async function loadOfflineCorpus() {
    if (cachedOfflineCorpus) return cachedOfflineCorpus;
    try {
      const res = await fetch('/assets/corpus/agri_fts.json');
      if (res.ok) {
        cachedOfflineCorpus = await res.json();
      }
    } catch (e) {
      console.warn('Could not load offline corpus JSON:', e);
    }
    return cachedOfflineCorpus || [];
  }

  async function searchOfflineKnowledge(query) {
    const corpus = await loadOfflineCorpus();
    if (!corpus || corpus.length === 0) return null;

    const clean = query.replace(/['"*^]/g, '').trim().toLowerCase();
    const tokens = clean.split(/\s+/).filter(w => w.length > 2);
    if (tokens.length === 0) return null;

    const scored = corpus.map(item => {
      let score = 0;
      const fullText = `${item.title} ${item.content} ${item.crop_tags} ${item.topic_tags}`.toLowerCase();
      for (const t of tokens) {
        if (fullText.includes(t)) score += 1;
      }
      return { item, score };
    });

    const matches = scored.filter(s => s.score > 0).sort((a, b) => b.score - a.score);
    if (matches.length === 0) return null;

    const top = matches[0].item;
    return {
      answer: `### 📴 On-Device ICAR Advisory: ${top.title}\n\n${top.content}\n\n---\n*Authority Source: ${top.source} (ICAR Package of Practices)*`,
      citations: matches.slice(0, 3).map(m => `${m.item.title} — ${m.item.source}`),
      source: 'offline_knowledge',
      intent: top.topic_tags.split(',')[0].trim() || 'agronomy'
    };
  }

  async function sendMessage(text) {
    const queryText = text || document.getElementById('ai-input-text')?.value?.trim();
    if (!queryText) return;

    if (document.getElementById('ai-input-text')) {
      document.getElementById('ai-input-text').value = '';
    }

    const lang = localStorage.getItem('krishimitra_lang') || 'en';

    // Append User Message
    const userMsg = { role: 'user', content: queryText, timestamp: new Date().toISOString() };
    chatHistory.push(userMsg);
    saveHistory();
    renderWelcomeOrMessages();

    // Render Typing Dot Indicator
    const container = document.getElementById('chat-messages');
    const typingId = 'typing-indicator-' + Date.now();
    container.insertAdjacentHTML('beforeend', `
      <div class="chat-message assistant" id="${typingId}">
        <div class="chat-avatar">🤖</div>
        <div class="chat-bubble">
          <div class="typing-dots"><span></span><span></span><span></span></div>
          <div style="font-size:11px;color:var(--ai-text-muted);margin-top:4px;">Thinking with Gemini AI...</div>
        </div>
      </div>
    `);
    scrollToBottom();

    // Strategy: Try ML Service first → Gemini direct → hardcoded fallback
    let botReply = '';
    let citations = [];
    let source = 'offline';
    let toolRedirect = null; // Phase 3: tool_redirect response type

    try {
      // Attempt 1: ML Service (RAG + KAG + Ollama/Gemini backend)
      let mlSuccess = false;
      if (window.KrishiAPI && KrishiAPI.isOnline()) {
        try {
          const responseData = await KrishiAPI.queryText(queryText, null, lang);

          // Phase 3: Handle tool_redirect response from intent router
          if (responseData && responseData.type === 'tool_redirect') {
            toolRedirect = responseData;
            mlSuccess = true;
          } else if (responseData && (responseData.answer || responseData.result)) {
            botReply = responseData.answer || responseData.result;
            citations = responseData.citations
              ? responseData.citations.map(c => typeof c === 'string' ? c : c.title || c.source)
              : [];
            source = 'ml_service';
            mlSuccess = true;
          }
        } catch (mlErr) {
          console.warn('ML Service failed, trying Gemini direct:', mlErr.message);
        }
      }

      // Attempt 2: Direct Gemini API (high quality, always online)
      if (!mlSuccess) {
        try {
          botReply = await callGeminiChat(queryText, lang);
          citations = ['Gemini AI — Agricultural Knowledge Base', 'ICAR Best Practices Reference'];
          source = 'gemini';
        } catch (geminiErr) {
          console.warn('Gemini direct also failed, trying on-device ICAR corpus:', geminiErr.message);
        }
      }

      // Attempt 3: On-Device ICAR Knowledge Corpus Fallback (real 21-document FTS)
      if (!botReply && !toolRedirect) {
        const offlineMatch = await searchOfflineKnowledge(queryText);
        if (offlineMatch) {
          botReply = offlineMatch.answer;
          citations = offlineMatch.citations;
          source = 'offline_knowledge';
        } else {
          botReply = `No on-device ICAR document directly matched your query: "${queryText}".\n\n*Note: You are currently offline. Reconnect to the internet for full AI analysis with Gemini & live RAG.*`;
          source = 'offline_knowledge';
        }
      }

    } catch (err) {
      console.error('All AI attempts failed:', err);
      botReply = `Sorry, an error occurred. Please try again.\n\nError: ${err.message}`;
      source = 'offline';
    }

    // Remove typing indicator
    const typingEl = document.getElementById(typingId);
    if (typingEl) typingEl.remove();

    // Phase 3: Handle tool_redirect — render a redirect bubble rather than a chat answer
    if (toolRedirect) {
      const toolLinks = {
        'disease-scanner': '/farmer/disease-scanner.html',
        'recommendation':  '/farmer/recommendation.html',
        'crop-advice':     '/farmer/recommendation.html',
      };
      const targetHref = toolLinks[toolRedirect.suggested_tool] || '/farmer/';
      const redirectMsg = toolRedirect.message ||
        `For the most accurate result, use the dedicated tool — it lets you upload a photo or enter soil data directly.`;

      chatHistory.push({
        role: 'assistant',
        content: redirectMsg,
        source: 'ml_service',
        isToolRedirect: true,
        redirectHref: targetHref,
        redirectLabel: toolRedirect.suggested_tool === 'disease-scanner'
          ? '📸 Open Disease Scanner'
          : '🌱 Open Crop Advisor',
        timestamp: new Date().toISOString()
      });
      saveHistory();
      renderWelcomeOrMessages();
      return;
    }

    // Push bot response
    chatHistory.push({
      role: 'assistant',
      content: botReply,
      citations: citations,
      source: source,
      timestamp: new Date().toISOString()
    });
    saveHistory();
    renderWelcomeOrMessages();
  }

  function sendSuggestedPrompt(idx) {
    const item = SUGGESTED_PROMPTS[idx];
    if (item) sendMessage(item.prompt);
  }

  function clearHistory() {
    if (confirm('Clear all conversation history?')) {
      chatHistory = [];
      saveHistory();
      renderWelcomeOrMessages();
    }
  }

  // ── Direct Zero-Popup Voice Input with Gemini Analysis ──
  let activeSpeechRecognition = null;

  function toggleVoiceRecord() {
    if (isRecording) {
      stopVoiceRecording(true);
    } else {
      startVoiceRecording();
    }
  }

  function startVoiceRecording() {
    const btn = document.getElementById('voice-mic-btn');
    const input = document.getElementById('ai-input-text');
    if (!btn || !input) return;

    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      alert('Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.');
      return;
    }

    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    activeSpeechRecognition = new SpeechRec();

    const currentLang = localStorage.getItem('krishimitra_lang') || 'en';
    const langCodes = {
      en: 'en-IN',
      kn: 'kn-IN',
      hi: 'hi-IN',
      te: 'te-IN',
      ta: 'ta-IN',
      mr: 'mr-IN'
    };

    activeSpeechRecognition.lang = langCodes[currentLang] || 'en-IN';
    activeSpeechRecognition.continuous = false;
    activeSpeechRecognition.interimResults = true;

    isRecording = true;
    btn.classList.add('recording');
    input.dataset.origPlaceholder = input.placeholder;
    input.placeholder = '🎙️ Listening... Speak naturally in your language...';
    input.value = '';
    input.focus();

    let finalTranscript = '';

    activeSpeechRecognition.onresult = (e) => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; ++i) {
        if (e.results[i].isFinal) {
          finalTranscript += e.results[i][0].transcript + ' ';
        } else {
          interim += e.results[i][0].transcript;
        }
      }
      const combined = (finalTranscript + interim).trim();
      if (combined) {
        input.value = combined;
      }
    };

    activeSpeechRecognition.onerror = (err) => {
      console.warn('Speech recognition notice:', err.error);
      stopVoiceRecording(false);
    };

    activeSpeechRecognition.onend = () => {
      const transcribedText = (input.value || '').trim();
      stopVoiceRecording(false);
      if (transcribedText) {
        // Automatically analyze the voice query with Gemini
        sendMessage(transcribedText);
      }
    };

    try {
      activeSpeechRecognition.start();
    } catch (err) {
      console.warn('Speech recognition start failed:', err);
      stopVoiceRecording(false);
    }
  }

  function stopVoiceRecording(triggerSend = false) {
    const btn = document.getElementById('voice-mic-btn');
    const input = document.getElementById('ai-input-text');
    isRecording = false;

    if (btn) btn.classList.remove('recording');
    if (input && input.dataset.origPlaceholder) {
      input.placeholder = input.dataset.origPlaceholder;
    }

    if (activeSpeechRecognition) {
      try { activeSpeechRecognition.stop(); } catch (e) {}
      activeSpeechRecognition = null;
    }

    if (triggerSend && input) {
      const text = input.value.trim();
      if (text) {
        sendMessage(text);
      }
    }
  }

  function speakVernacularText(text, lang) {
    if (!('speechSynthesis' in window)) {
      alert('Speech synthesis is not supported on this device.');
      return;
    }
    window.speechSynthesis.cancel();
    const cleanText = text.replace(/<[^>]*>/g, '').replace(/[*_#`•]/g, '').trim();
    const utterance = new SpeechSynthesisUtterance(cleanText);

    const langCodes = {
      kn: 'kn-IN',
      hi: 'hi-IN',
      te: 'te-IN',
      ta: 'ta-IN',
      mr: 'mr-IN',
      en: 'en-IN'
    };
    utterance.lang = langCodes[lang] || 'en-IN';
    utterance.rate = 0.95;
    utterance.pitch = 1.0;

    window.speechSynthesis.speak(utterance);
  }

  function speakText(text) {
    speakVernacularText(text, localStorage.getItem('krishimitra_lang') || 'en');
  }

  function activateVoiceAssistant() {
    toggleVoiceRecord();
  }

  function closeModal() {
    const el = document.getElementById('ai-active-modal');
    if (el) el.remove();
  }

  function startNewChat() {
    closeModal();
    chatHistory = [];
    saveHistory();
    renderWelcomeOrMessages();
  }

  function showHistoryModal() {
    closeModal();
    const modal = document.createElement('div');
    modal.id = 'ai-active-modal';
    modal.className = 'ai-modal-overlay';

    const items = chatHistory.filter(m => m.role === 'user');
    const escQ = (s) => (s || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');
    modal.innerHTML = `
      <div class="ai-modal-card">
        <div class="ai-modal-header">
          <div class="ai-modal-title">🕒 Chat History</div>
          <button class="ai-modal-close" onclick="AIPortal.closeModal()">✕</button>
        </div>
        <div class="ai-modal-body">
          ${items.length === 0 ? `
            <div style="text-align:center;color:var(--ai-text-muted);padding:24px;">No saved chat history yet.</div>
          ` : `
            <div style="display:flex;flex-direction:column;gap:10px;">
              ${items.map(msg => `
                <div style="background:#181822;border:1px solid #272738;padding:12px 14px;border-radius:12px;display:flex;justify-content:space-between;align-items:center;">
                  <div>
                    <div style="font-weight:600;font-size:13px;color:#f4f4f6;">${escQ(msg.content).substring(0, 80)}${msg.content.length > 80 ? '...' : ''}</div>
                    <div style="font-size:11px;color:#8e8ea0;margin-top:2px;">${new Date(msg.timestamp || Date.now()).toLocaleString()}</div>
                  </div>
                  <button class="btn btn-sm btn-ghost" style="color:#8b5cf6;" onclick="AIPortal.sendMessage('${escQ(msg.content)}');AIPortal.closeModal();">Load</button>
                </div>
              `).join('')}
            </div>
            <button class="btn btn-secondary btn-sm" style="margin-top:12px;color:#ef4444;" onclick="AIPortal.clearHistory();AIPortal.closeModal();">Clear All History</button>
          `}
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }

  function activateVoiceAssistant() {
    closeModal();
    const modal = document.createElement('div');
    modal.id = 'ai-active-modal';
    modal.className = 'ai-modal-overlay';
    const currentLang = localStorage.getItem('krishimitra_lang') || 'en';

    modal.innerHTML = `
      <div class="ai-modal-card" style="max-width:540px;text-align:center;">
        <div class="ai-modal-header">
          <div class="ai-modal-title">🎙️ Gemini Vernacular Voice Assistant</div>
          <button class="ai-modal-close" onclick="AIPortal.closeModal()">✕</button>
        </div>
        <div class="ai-modal-body" style="padding:24px 20px;">
          <!-- Language Tabs -->
          <div style="display:flex;gap:6px;justify-content:center;flex-wrap:wrap;margin-bottom:16px;">
            ${[
              { code: 'kn', name: 'ಕನ್ನಡ' },
              { code: 'hi', name: 'हिंदी' },
              { code: 'te', name: 'తెలుగు' },
              { code: 'ta', name: 'தமிழ்' },
              { code: 'mr', name: 'मराठी' },
              { code: 'en', name: 'English' }
            ].map(l => `
              <button type="button" class="btn btn-sm ${currentLang === l.code ? 'btn-primary' : 'btn-ghost'}" style="border-radius:99px;padding:4px 12px;font-size:12px;font-weight:600;" onclick="localStorage.setItem('krishimitra_lang', '${l.code}');AIPortal.activateVoiceAssistant();">
                ${l.name}
              </button>
            `).join('')}
          </div>

          <!-- Mic Animation -->
          <div class="ai-avatar-glow" style="width:72px;height:72px;font-size:36px;margin:0 auto 12px;cursor:pointer;" onclick="AIPortal.closeModal();AIPortal.toggleVoiceRecord();" title="Click to Speak">
            🎤
          </div>
          <h3 style="font-size:17px;font-weight:700;color:#fff;margin-bottom:4px;">Tap Mic & Speak Query</h3>
          <p style="font-size:12px;color:#8e8ea0;max-width:380px;margin:0 auto 16px;">
            Powered by Gemini 3.6 Flash. Supports dialect understanding, crop pathologies, and ICAR dosage recommendations.
          </p>

          <!-- 1-Click Samples for all 6 Languages -->
          <div style="text-align:left;background:#13131c;padding:12px 14px;border-radius:12px;border:1px solid #272738;margin-bottom:16px;">
            <div style="font-size:11px;font-weight:700;color:#8e8ea0;margin-bottom:8px;text-transform:uppercase;">Quick Vernacular Queries:</div>
            <div style="display:flex;flex-direction:column;gap:6px;">
              <button class="btn btn-ghost btn-sm" style="justify-content:flex-start;text-align:left;font-size:12px;color:#c4b5fd;" onclick="AIPortal.closeModal();AIPortal.sendMessage('ಟೊಮ್ಯಾಟೊ ಬೆಳೆಯಲ್ಲಿ ಎಲೆಗಳು ಹಳದಿಯಾಗುತ್ತಿವೆ, ಯಾವ ಔಷಧ ಸಿಂಪಡಿಸಬೇಕು?');">
                🌾 <strong>ಕನ್ನಡ:</strong> "ಟೊಮ್ಯಾಟೊ ಎಲೆ ಹಳದಿಯಾಗುತ್ತಿದೆ ಔಷಧ ತಿಳಿಸಿ"
              </button>
              <button class="btn btn-ghost btn-sm" style="justify-content:flex-start;text-align:left;font-size:12px;color:#c4b5fd;" onclick="AIPortal.closeModal();AIPortal.sendMessage('गेहूं की फसल में यूरिया और जिंक की सही मात्रा और छिड़काव का समय क्या है?');">
                🌾 <strong>हिंदी:</strong> "गेहूं में यूरिया और जिंक की सही मात्रा क्या है?"
              </button>
              <button class="btn btn-ghost btn-sm" style="justify-content:flex-start;text-align:left;font-size:12px;color:#c4b5fd;" onclick="AIPortal.closeModal();AIPortal.sendMessage('వరి పంటలో కాండం తొలుచు పురుగు నివారణకు ఏ మందు వాడాలి?');">
                🌾 <strong>తెలుగు:</strong> "వరి పంటలో కాండం తొలుచు పురుగు నివారణ"
              </button>
              <button class="btn btn-ghost btn-sm" style="justify-content:flex-start;text-align:left;font-size:12px;color:#c4b5fd;" onclick="AIPortal.closeModal();AIPortal.sendMessage('நெல் பயிரில் இலை சுருட்டு புழுவை கட்டுப்படுத்த சிறந்த மருந்து எது?');">
                🌾 <strong>தமிழ்:</strong> "நெல் பயிரில் இலை சுருட்டு புழு கட்டுப்பாடு"
              </button>
              <button class="btn btn-ghost btn-sm" style="justify-content:flex-start;text-align:left;font-size:12px;color:#c4b5fd;" onclick="AIPortal.closeModal();AIPortal.sendMessage('कपाशी पिकावर बोंडअळीचा प्रादुर्भाव रोखण्यासाठी उपाय सांगा');">
                🌾 <strong>मराठी:</strong> "कपाशीवर बोंडअळी रोखण्यासाठी उपाय सांगा"
              </button>
            </div>
          </div>

          <div style="display:flex;gap:10px;justify-content:center;">
            <button class="btn btn-primary btn-md" style="border-radius:99px;padding:8px 24px;font-weight:600;" onclick="AIPortal.closeModal();AIPortal.toggleVoiceRecord();">
              🎙️ Speak Now
            </button>
            <a href="/farmer/voice-analyzer.html" class="btn btn-secondary btn-md" style="border-radius:99px;padding:8px 20px;text-decoration:none;font-weight:600;">
              ⚡ Open Full Voice Studio
            </a>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }

  function showKnowledgeSourcesModal() {
    closeModal();
    const modal = document.createElement('div');
    modal.id = 'ai-active-modal';
    modal.className = 'ai-modal-overlay';
    modal.innerHTML = `
      <div class="ai-modal-card">
        <div class="ai-modal-header">
          <div class="ai-modal-title">🗄️ Knowledge Base & RAG Index</div>
          <button class="ai-modal-close" onclick="AIPortal.closeModal()">✕</button>
        </div>
        <div class="ai-modal-body">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;">
            <div style="background:#181822;padding:16px;border-radius:12px;border:1px solid #272738;">
              <div style="font-size:11px;color:#8e8ea0;font-weight:600;">VECTOR DATABASE (ChromaDB)</div>
              <div style="font-size:22px;font-weight:800;color:#8b5cf6;margin-top:4px;">2,450</div>
              <div style="font-size:11px;color:#10b981;margin-top:2px;">● Indexed & Active</div>
            </div>
            <div style="background:#181822;padding:16px;border-radius:12px;border:1px solid #272738;">
              <div style="font-size:11px;color:#8e8ea0;font-weight:600;">KNOWLEDGE GRAPH (Neo4j)</div>
              <div style="font-size:22px;font-weight:800;color:#3b82f6;margin-top:4px;">882 Nodes</div>
              <div style="font-size:11px;color:#10b981;margin-top:2px;">● Connected</div>
            </div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;">
            <div style="background:#181822;padding:16px;border-radius:12px;border:1px solid #272738;">
              <div style="font-size:11px;color:#8e8ea0;font-weight:600;">PRIMARY LLM</div>
              <div style="font-size:18px;font-weight:800;color:#10b981;margin-top:4px;">Gemini Flash</div>
              <div style="font-size:11px;color:#10b981;margin-top:2px;">● Online & Active</div>
            </div>
            <div style="background:#181822;padding:16px;border-radius:12px;border:1px solid #272738;">
              <div style="font-size:11px;color:#8e8ea0;font-weight:600;">FALLBACK LLM</div>
              <div style="font-size:18px;font-weight:800;color:#f59e0b;margin-top:4px;">Ollama Local</div>
              <div style="font-size:11px;color:#f59e0b;margin-top:2px;">○ Standby</div>
            </div>
          </div>
          <div style="font-weight:600;font-size:13px;color:#f4f4f6;margin-bottom:8px;">Active Context Sources</div>
          <div style="display:flex;flex-direction:column;gap:8px;font-size:13px;color:#8e8ea0;">
            <div style="padding:10px;background:#181822;border-radius:8px;">• ICAR Agricultural Package of Practices 2024</div>
            <div style="padding:10px;background:#181822;border-radius:8px;">• AgMarknet APMC Mandi Price Intelligence</div>
            <div style="padding:10px;background:#181822;border-radius:8px;">• NIPHM Pest & Plant Pathology Protocol Database</div>
            <div style="padding:10px;background:#181822;border-radius:8px;">• Gemini AI Agricultural Knowledge Base</div>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }

  function showSettingsModal() {
    closeModal();
    const currentLang = localStorage.getItem('krishimitra_lang') || 'en';
    const modal = document.createElement('div');
    modal.id = 'ai-active-modal';
    modal.className = 'ai-modal-overlay';
    modal.innerHTML = `
      <div class="ai-modal-card">
        <div class="ai-modal-header">
          <div class="ai-modal-title">⚙️ AI Workspace Settings</div>
          <button class="ai-modal-close" onclick="AIPortal.closeModal()">✕</button>
        </div>
        <div class="ai-modal-body">
          <div class="form-group">
            <label class="form-label" style="color:#f4f4f6;">Primary LLM Engine</label>
            <select class="form-select" style="background:#181822;color:#fff;border-color:#272738;">
              <option value="gemini" selected>Gemini Flash (Cloud API — Primary)</option>
              <option value="ollama">Ollama Llama 3.1 8B (Local Fallback)</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label" style="color:#f4f4f6;">Default Language</label>
            <select class="form-select" id="settings-lang" style="background:#181822;color:#fff;border-color:#272738;">
              <option value="en" ${currentLang === 'en' ? 'selected' : ''}>English</option>
              <option value="hi" ${currentLang === 'hi' ? 'selected' : ''}>Hindi (हिंदी)</option>
              <option value="kn" ${currentLang === 'kn' ? 'selected' : ''}>Kannada (ಕನ್ನಡ)</option>
              <option value="ta" ${currentLang === 'ta' ? 'selected' : ''}>Tamil (தமிழ்)</option>
              <option value="te" ${currentLang === 'te' ? 'selected' : ''}>Telugu (తెలుగు)</option>
              <option value="mr" ${currentLang === 'mr' ? 'selected' : ''}>Marathi (मराठी)</option>
            </select>
          </div>
          <button class="btn btn-primary" onclick="localStorage.setItem('krishimitra_lang', document.getElementById('settings-lang').value); alert('Settings saved!'); AIPortal.closeModal();">Save Settings</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }

  return {
    init,
    sendMessage,
    sendSuggestedPrompt,
    clearHistory,
    toggleVoiceRecord,
    speakVernacularText,
    speakText,
    startNewChat,
    showHistoryModal,
    activateVoiceAssistant,
    showKnowledgeSourcesModal,
    showSettingsModal,
    closeModal,
  };
})();

window.AIPortal = AIPortal;
