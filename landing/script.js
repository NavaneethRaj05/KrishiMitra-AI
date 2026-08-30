/**
 * KrishiMitra AI — Landing Page Scripts
 * Handles dynamic multilingual translation, language selection,
 * role modal interactions, and network connectivity status.
 */

// ── Multilingual Translation Dictionary ─────────────────────────────────────
const translations = {
  en: {
    badge_text: "PRECISION AGRI-PLATFORM",
    status_online: "System Operational • Live MSP Feed",
    status_offline: "Offline Mode • Local Intelligence Ready",
    tagline: "Empowering Indian Agriculture with AI-Driven Intelligence & Direct Market Access.",
    btn_farmer: "Farmer Portal",
    desc_farmer: "Crop Advisory · Disease Scan · Soil Health · Mandi MSP",
    btn_buyer: "Buyer & Trader",
    desc_buyer: "Direct Farm Sourcing · APMC Market Rates · Bulk Orders",
    btn_bot: "Krishi AI Bot",
    desc_bot: "Voice Assistant · Multilingual Chat · ICAR Grounded",
    ticker_icar: "ICAR & KVK Verified Practice Data",
    ticker_voice: "Kannada, Hindi, English Voice Audio",
    ticker_offline: "Edge Offline-First Inference",
  },
  kn: {
    badge_text: "ಸ್ಮಾರ್ಟ್ ಕೃಷಿ ವೇದಿಕೆ",
    status_online: "ವ್ಯವಸ್ಥೆ ಸಕ್ರಿಯವಾಗಿದೆ • ನೇರ ಮಂಡಿ ದರಗಳು",
    status_offline: "ಆಫ್‌ಲೈನ್ ಮೋಡ್ • ಸ್ಥಳೀಯ ಕೃಷಿ ಜ್ಞಾನ",
    tagline: "ಕೃತಕ ಬುದ್ಧಿಮತ್ತೆ ಆಧಾರಿತ ಕೃಷಿ ಸಲಹೆ ಮತ್ತು ರೈತ-ಖರೀದಿದಾರರ ನೇರ ಮಾರುಕಟ್ಟೆ.",
    btn_farmer: "ರೈತರ ಪೋರ್ಟಲ್",
    desc_farmer: "ಬೆಳೆ ಸಲಹೆ · ಎಲೆ ರೋಗ ಪತ್ತೆ · ಮಣ್ಣಿನ ಪರೀಕ್ಷೆ · ಮಂಡಿ ಬೆಲೆಗಳು",
    btn_buyer: "ಖರೀದಿದಾರರು & ವ್ಯಾಪಾರಿಗಳು",
    desc_buyer: "ರೈತರಿಂದ ನೇರ ಖರೀದಿ · ಎಪಿಎಂಸಿ ದರಗಳು · ಸಗಟು ಆರ್ಡರ್‌ಗಳು",
    btn_bot: "ಕೃಷಿ AI ಸಹಾಯಕ",
    desc_bot: "ಧ್ವನಿ ಸಂಭಾಷಣೆ · ಕನ್ನಡ ಮತ್ತು ಹಿಂದಿ ಬೆಂಬಲ · ICAR ಪ್ರಮಾಣಿತ",
    ticker_icar: "ICAR & KVK ದೃಢೀಕೃತ ಕೃಷಿ ಮಾಹಿತಿ",
    ticker_voice: "ಕನ್ನಡ, ಹಿಂದಿ, ಇಂಗ್ಲಿಷ್ ಧ್ವನಿ ಬೆಂಬಲ",
    ticker_offline: "ಇಂಟರ್ನೆಟ್ ಇಲ್ಲದೆಯೂ ಲಭ್ಯ (ಆಫ್‌ಲೈನ್)",
  },
  hi: {
    badge_text: "सटीक कृषि मंच",
    status_online: "सिस्टम सक्रिय है • लाइव मंडी भाव",
    status_offline: "ऑफलाइन मोड • स्थानीय एआई उपलब्ध",
    tagline: "एआई-संचालित कृषि सलाह और प्रत्यक्ष उपज बाज़ार से भारतीय किसानों का सशक्तिकरण।",
    btn_farmer: "किसान पोर्टल",
    desc_farmer: "फसल परामर्श · रोग पहचान · मिट्टी स्वास्थ्य · मंडी एमएसपी",
    btn_buyer: "खरीदार एवं व्यापारी",
    desc_buyer: "खेत से सीधी खरीद · एपीएमसी मंडी भाव · थोक ऑर्डर",
    btn_bot: "कृषि एआई बॉट",
    desc_bot: "वॉइस असिस्टेंट · बहुभाषी चैट · आईसीएआर प्रमाणित समाधान",
    ticker_icar: "ICAR और KVK प्रमाणित कृषि पद्धतियां",
    ticker_voice: "हिंदी, कन्नड़, अंग्रेजी वॉइस सपोर्ट",
    ticker_offline: "बिना इंटरनेट ऑफलाइन कार्यप्रणाली",
  },
  te: {
    badge_text: "ఖచ్చితమైన వ్యవసాయ వేదిక",
    status_online: "సిస్టమ్ సక్రియం • ప్రత్యక్ష మార్కెట్ ధరలు",
    status_offline: "ఆఫ్‌లైన్ మోడ్ • స్థానిక మేధస్సు సిద్ధం",
    tagline: "ఏఐ ఆధారిత వ్యవసాయ సలహాలు మరియు ప్రత్యక్ష మార్కెట్ సదుపాయం.",
    btn_farmer: "రైతు పోర్టల్",
    desc_farmer: "పంట సలహాలు · వ్యాధి గుర్తింపు · నేల పరీక్ష · మార్కెట్ ధరలు",
    btn_buyer: "కొనుగోలుదారులు & వ్యాపారులు",
    desc_buyer: "రైతుల నుండి నేరుగా కొనుగోలు · టోకు ఆర్డర్లు",
    btn_bot: "కృషి AI బాట్",
    desc_bot: "వాయిస్ అసిస్టెంట్ · బహుభాషా చాట్ · ఐసిఎఆర్ ధృవీకరణ",
    ticker_icar: "ICAR & KVK ధృవీకరించిన వ్యవసాయ సమాచారం",
    ticker_voice: "తెలుగు, హిందీ, ఇంగ్లీష్ వాయిస్ సపోర్ట్",
    ticker_offline: "ఆఫ్‌లైన్ ఇంటెలిజెన్స్ సదుపాయం",
  },
  ta: {
    badge_text: "துல்லிய வேளாண் தளம்",
    status_online: "செயல்பாட்டில் உள்ளது • நேரடி மண்டி விலைகள்",
    status_offline: "ஆஃப்லைன் முறை • உள்ளூர் ஏஐ தயார்",
    tagline: "செயற்கை நுண்ணறிவு விவசாய வழிகாட்டல் மற்றும் நேரடி சந்தை வாய்ப்பு.",
    btn_farmer: "விவசாயிகள் தளம்",
    desc_farmer: "பயிர் ஆலோசனை · இலை நோய் கண்டறிதல் · மண் பரிசோதனை",
    btn_buyer: "வாங்குபவர்கள் & வியாபாரிகள்",
    desc_buyer: "நேரடி விவசாய கொள்முதல் · மொத்த ஆர்டர்கள்",
    btn_bot: "கிருஷி AI பாட்",
    desc_bot: "குரல் வழி உரையாடல் · பல மொழி ஆதரவு · ICAR சான்றிதழ்",
    ticker_icar: "ICAR மற்றும் KVK அங்கீகரிக்கப்பட்ட நடைமுறைகள்",
    ticker_voice: "தமிழ், இந்தி, ஆங்கில குரல் ஆதரவு",
    ticker_offline: "இணையம் இல்லாத ஆஃப்லைன் பயன்பாடு",
  },
  mr: {
    badge_text: "अचूक कृषी मंच",
    status_online: "प्रणाली कार्यरत • थेट बाजार भाव",
    status_offline: "ऑफलाइन मोड • स्थानिक कृषी सल्ला",
    tagline: "एआय-चालित शेती सल्ला आणि थेट शेतमाल खरेदी-विक्री प्लॅटफॉर्म.",
    btn_farmer: "शेतकरी पोर्टल",
    desc_farmer: "पीक सल्ला · रोग निदान · माती परीक्षण · हमीभाव",
    btn_buyer: "खरेदीदार व व्यापारी",
    desc_buyer: "थेट शेतातून खरेदी · घाऊक सौदे · हमखास दर",
    btn_bot: "कृषी AI बॉट",
    desc_bot: "व्हॉइस असिस्टंट · बहुभाषिक संवाद · ICAR प्रमाणित",
    ticker_icar: "ICAR व KVK प्रमाणित शेती तंत्रज्ञान",
    ticker_voice: "मराठी, हिंदी, इंग्रजी व्हॉइस सपोर्ट",
    ticker_offline: "ऑफलाइन कृषी मार्गदर्शन",
  }
};

const langLabels = {
  en: "English",
  kn: "ಕನ್ನಡ",
  hi: "हिंदी",
  te: "తెలుగు",
  ta: "தமிழ்",
  mr: "मराठी"
};

// ── Role Details Configuration ──────────────────────────────────────────────
const roleDetails = {
  farmer: {
    title: "Farmer Intelligence Hub",
    subtitle: "Precision tools for smallholder & commercial farms",
    icon: "sprout",
    iconColor: "#10B981",
    actionText: "Enter Farmer Dashboard",
    redirectUrl: "/farmer/",
    features: [
      "🌿 <strong>AI Leaf Disease Diagnostic:</strong> Instant photo scan with organic & chemical remediation",
      "🧪 <strong>Smart Soil & Crop Recommendation:</strong> N-P-K & pH based crop suitability (ONNX Edge)",
      "📊 <strong>Daily APMC Mandi MSP Rates:</strong> Real-time price discovery for Hassan & Karnataka markets",
      "🎙️ <strong>Vernacular Voice Advisory:</strong> Ask questions in spoken Kannada, Hindi, and English"
    ]
  },
  buyer: {
    title: "Direct Produce Sourcing Portal",
    subtitle: "Connecting institutional buyers and traders directly to certified farmers",
    icon: "shopping-bag",
    iconColor: "#38BDF8",
    actionText: "Explore Live Mandi Batches",
    redirectUrl: "/buyer/",
    features: [
      "🚜 <strong>0% Commission Direct Farm Sourcing:</strong> Verified harvest lots with transparent quality scores",
      "📦 <strong>Bulk Contract Farming & Procurement:</strong> Direct price negotiation and harvest batch tracking",
      "📈 <strong>Price Trend Forecast:</strong> AI price volatility predictions across major mandis",
      "📜 <strong>Traceability & Quality Certificate:</strong> Chemical-free and organic certification proofs"
    ]
  },
  bot: {
    title: "KrishiMitra Conversational AI",
    subtitle: "Your 24/7 dedicated agronomic consultant powered by local LLMs",
    icon: "bot",
    iconColor: "#F59E0B",
    actionText: "Start Voice & Chat Session",
    redirectUrl: "/ai/",
    features: [
      "🗣️ <strong>Hands-Free Vernacular Voice Engine:</strong> High accuracy Kannada & Hindi speech recognition",
      "🏛️ <strong>ICAR & State Agri University Grounding:</strong> Strict zero-hallucination package of practices",
      "⚡ <strong>Edge-Resilient RAG Architecture:</strong> Runs fast queries with local vector knowledge base",
      "📸 <strong>Multimodal Pest & Fertilizer Synthesis:</strong> Upload images and get instant audio prescriptions"
    ]
  }
};

let currentLang = 'en';
let activeRole = 'farmer';

// ── Initialize App ──────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  if (window.lucide) {
    lucide.createIcons();
  }
  setupLanguageDropdown();
  setupNetworkListener();
});

// ── Language Dropdown Logic ─────────────────────────────────────────────────
function setupLanguageDropdown() {
  const langWrapper = document.querySelector('.lang-dropdown-wrapper');
  const langBtn = document.getElementById('lang-btn');
  const langOptions = document.querySelectorAll('.lang-option');

  // Toggle Dropdown
  langBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = langWrapper.classList.toggle('open');
    langBtn.setAttribute('aria-expanded', isOpen);
  });

  // Close when clicking outside
  document.addEventListener('click', (e) => {
    if (!langWrapper.contains(e.target)) {
      langWrapper.classList.remove('open');
      langBtn.setAttribute('aria-expanded', 'false');
    }
  });

  // Handle Option Selection
  langOptions.forEach(opt => {
    opt.addEventListener('click', () => {
      const selectedLang = opt.getAttribute('data-lang');
      setLanguage(selectedLang);
      
      langOptions.forEach(o => o.classList.remove('active'));
      opt.classList.add('active');
      
      langWrapper.classList.remove('open');
      langBtn.setAttribute('aria-expanded', 'false');
    });
  });
}

function setLanguage(lang) {
  if (!translations[lang]) return;
  currentLang = lang;
  localStorage.setItem('krishimitra_lang', lang);
  
  // Update dropdown button label
  const labelEl = document.getElementById('current-lang-label');
  if (labelEl) labelEl.textContent = langLabels[lang] || "English";

  // Translate all DOM elements with data-i18n attribute
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (translations[lang][key]) {
      el.textContent = translations[lang][key];
    }
  });
}

// ── Role Selection & Modal Dialog ───────────────────────────────────────────
function handleRoleSelect(role) {
  activeRole = role;
  const config = roleDetails[role];
  if (!config) return;

  const modal = document.getElementById('role-modal');
  const modalTitle = document.getElementById('modal-title');
  const modalSubtitle = document.getElementById('modal-subtitle');
  const modalContent = document.getElementById('modal-content');
  const modalActionBtn = document.getElementById('modal-action-btn');
  const modalIcon = document.getElementById('modal-icon');
  const modalIconBox = document.getElementById('modal-icon-box');

  modalTitle.textContent = config.title;
  modalSubtitle.textContent = config.subtitle;
  modalActionBtn.textContent = config.actionText;
  
  modalIcon.setAttribute('data-lucide', config.icon);
  modalIconBox.style.color = config.iconColor;
  modalIconBox.style.borderColor = config.iconColor + '40';
  modalIconBox.style.background = config.iconColor + '18';

  let listHtml = '<ul class="modal-feature-list">';
  config.features.forEach(f => {
    listHtml += `<li class="modal-feature-item"><i data-lucide="check-circle-2"></i><div>${f}</div></li>`;
  });
  listHtml += '</ul>';
  modalContent.innerHTML = listHtml;

  modal.classList.add('active');
  if (window.lucide) lucide.createIcons();
}

function closeModal() {
  document.getElementById('role-modal').classList.remove('active');
}

// Close modal on escape key or backdrop click
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeModal();
});

document.getElementById('role-modal').addEventListener('click', (e) => {
  if (e.target.id === 'role-modal') closeModal();
});

function executeRoleAction() {
  const config = roleDetails[activeRole];
  if (config && config.redirectUrl) {
    window.location.href = config.redirectUrl;
  }
}

// ── Network Connectivity Monitor ────────────────────────────────────────────
function setupNetworkListener() {
  const statusEl = document.getElementById('network-status');
  const statusText = statusEl.querySelector('.status-text');

  function updateStatus() {
    if (navigator.onLine) {
      statusEl.style.borderColor = 'rgba(16, 185, 129, 0.3)';
      statusEl.style.color = '#34D399';
      statusText.textContent = translations[currentLang]?.status_online || "System Operational • Live MSP Feed";
    } else {
      statusEl.style.borderColor = 'rgba(245, 158, 11, 0.4)';
      statusEl.style.color = '#FCD34D';
      statusText.textContent = translations[currentLang]?.status_offline || "Offline Mode • Local Intelligence Ready";
    }
  }

  window.addEventListener('online', updateStatus);
  window.addEventListener('offline', updateStatus);
  updateStatus();
}
