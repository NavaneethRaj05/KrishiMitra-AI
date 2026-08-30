/**
 * KrishiMitra AI — Farmer Portal Logic
 * Dashboard data, live weather, Gemini-powered features, crop management
 */

const FarmerPortal = (() => {
  // ── Dynamic Crop Data (persisted in localStorage) ──
  const CROPS_KEY = 'krishimitra_farmer_crops';
  let MY_CROPS = [
    { name: 'Wheat (HD-2967)', icon: '🌾', field: 'Field A', health: 88, stage: 'Grain Filling', sowing: '2026-06-15', harvest: '2026-10-10', status: 'Healthy' },
    { name: 'Tomato (Arka Rakshak)', icon: '🍅', field: 'Field B', health: 74, stage: 'Flowering', sowing: '2026-07-01', harvest: '2026-09-15', status: 'Needs Water' },
    { name: 'Maize (DHM-117)', icon: '🌽', field: 'Field C', health: 92, stage: 'Vegetative', sowing: '2026-07-20', harvest: '2026-11-01', status: 'Excellent' },
  ];

  // Load saved crops
  try {
    const saved = localStorage.getItem(CROPS_KEY);
    if (saved) MY_CROPS = JSON.parse(saved);
  } catch (e) {}

  function saveCrops() {
    try { localStorage.setItem(CROPS_KEY, JSON.stringify(MY_CROPS)); } catch (e) {}
  }

  const ALERTS = [
    { type: 'pest', severity: 'high', title: 'Fall Armyworm Alert', desc: 'Increased armyworm activity reported in your district. Inspect maize fields.', time: '2h ago' },
    { type: 'weather', severity: 'medium', title: 'Heavy Rain Warning', desc: 'IMD predicts heavy rainfall for next 48 hours. Delay spraying operations.', time: '4h ago' },
    { type: 'disease', severity: 'low', title: 'Late Blight Risk', desc: 'Cool and humid conditions favor late blight in tomato. Monitor leaves closely.', time: '1d ago' },
  ];

  const RECENT_ACTIVITY = [
    { icon: '🔍', text: 'Scanned tomato leaf — Early Blight detected', time: '1h ago', color: '#ef4444' },
    { icon: '🌱', text: 'Got crop recommendation — Rice (92% match)', time: '3h ago', color: '#10b981' },
    { icon: '💬', text: 'Asked KrishiMitra about fertilizer dosage', time: 'Yesterday', color: '#3b82f6' },
    { icon: '📊', text: 'Checked mandi prices for Tomato — ₹1,850/q', time: 'Yesterday', color: '#f59e0b' },
  ];

  // ── System Geolocation & Weather ──
  let cachedSystemLocation = null;

  function getStoredSystemLocation() {
    try {
      const saved = localStorage.getItem('krishimitra_system_coords');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return { name: 'Hassan, Karnataka', lat: 13.0072, lon: 76.0962, granted: false };
  }

  async function reverseGeocode(lat, lon) {
    try {
      const res = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`, {
        signal: AbortSignal.timeout(4000)
      });
      if (res.ok) {
        const data = await res.json();
        const city = data.locality || data.city || data.principalSubdivision || '';
        const state = data.principalSubdivision || '';
        if (city && state) return `${city}, ${state}`;
        if (city) return city;
      }
    } catch (e) {
      console.warn('Reverse geocoding error:', e);
    }
    return `${lat.toFixed(2)}°N, ${lon.toFixed(2)}°E`;
  }

  // ── Live Weather from Open-Meteo API ──
  async function fetchLiveWeather(loc) {
    try {
      const lat = loc.lat;
      const lon = loc.lon;
      const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,precipitation&daily=temperature_2m_max,temperature_2m_min,weather_code,precipitation_probability_max&timezone=Asia%2FKolkata&forecast_days=5`, {
        signal: AbortSignal.timeout(8000)
      });
      if (!res.ok) throw new Error('Weather API failed');
      const data = await res.json();

      const weatherCodes = {
        0: { desc: 'Clear Sky', icon: '☀️' }, 1: { desc: 'Mainly Clear', icon: '🌤️' },
        2: { desc: 'Partly Cloudy', icon: '⛅' }, 3: { desc: 'Overcast', icon: '☁️' },
        45: { desc: 'Fog', icon: '🌫️' }, 48: { desc: 'Freezing Fog', icon: '🌫️' },
        51: { desc: 'Light Drizzle', icon: '🌦️' }, 53: { desc: 'Moderate Drizzle', icon: '🌦️' },
        61: { desc: 'Light Rain', icon: '🌧️' }, 63: { desc: 'Moderate Rain', icon: '🌧️' },
        65: { desc: 'Heavy Rain', icon: '🌧️' }, 80: { desc: 'Rain Showers', icon: '🌦️' },
        95: { desc: 'Thunderstorm', icon: '⛈️' },
      };

      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const current = data.current;
      const daily = data.daily;
      const wCode = current.weather_code;
      const wInfo = weatherCodes[wCode] || weatherCodes[Math.floor(wCode / 10) * 10] || { desc: 'Variable', icon: '🌤️' };

      const forecast = daily.time.map((d, i) => {
        const dt = new Date(d);
        const fCode = daily.weather_code[i];
        const fInfo = weatherCodes[fCode] || weatherCodes[Math.floor(fCode / 10) * 10] || { desc: '🌤️', icon: '🌤️' };
        return {
          day: i === 0 ? 'Today' : dayNames[dt.getDay()],
          high: Math.round(daily.temperature_2m_max[i]),
          low: Math.round(daily.temperature_2m_min[i]),
          icon: fInfo.icon,
          rain: `${daily.precipitation_probability_max[i] || 0}%`
        };
      });

      const rainProb = daily.precipitation_probability_max?.[0] || 0;
      const sprayOk = rainProb < 30 && current.wind_speed_10m < 15;

      return {
        location: loc,
        temp: Math.round(current.temperature_2m),
        condition: wInfo.desc,
        conditionIcon: wInfo.icon,
        humidity: Math.round(current.relative_humidity_2m),
        rainfall: Math.round((current.precipitation || 0) * 10) / 10,
        wind: Math.round(current.wind_speed_10m),
        forecast,
        sprayConditions: sprayOk ? 'Recommended' : 'Not Recommended',
        sprayReason: sprayOk ? 'Low wind and dry conditions' : rainProb >= 30 ? `Rain chance ${rainProb}%` : 'High wind drifting spray'
      };
    } catch (err) {
      console.warn('Live weather failed, using fallback:', err.message);
      return {
        location: loc,
        temp: 28, condition: 'Partly Cloudy', conditionIcon: '⛅', humidity: 72, rainfall: 12,
        wind: 14, forecast: [
          { day: 'Today', high: 30, low: 22, icon: '⛅', rain: '20%' },
          { day: 'Tue', high: 32, low: 23, icon: '☀️', rain: '5%' },
          { day: 'Wed', high: 29, low: 21, icon: '🌧️', rain: '70%' },
          { day: 'Thu', high: 27, low: 20, icon: '🌧️', rain: '80%' },
          { day: 'Fri', high: 31, low: 22, icon: '⛅', rain: '15%' },
        ],
        sprayConditions: 'Not Recommended', sprayReason: 'Rain expected within 24 hours'
      };
    }
  }

  // ── Render Weather Widget (System Coordinates Driven) ──
  async function renderWeather(containerId) {
    const el = document.getElementById(containerId);
    if (!el) return;

    let loc = cachedSystemLocation || getStoredSystemLocation();

    // Show initial skeleton
    el.innerHTML = `<div class="weather-card"><div style="text-align:center;padding:24px;"><div class="skeleton" style="width:140px;height:36px;margin:0 auto 8px;"></div><div class="skeleton" style="width:200px;height:14px;margin:0 auto;"></div><p style="margin-top:8px;color:rgba(255,255,255,0.7);font-size:12px;">Detecting device coordinates & fetching live weather...</p></div></div>`;

    // Attempt system geolocation detection automatically
    if (navigator.geolocation && !cachedSystemLocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const lat = parseFloat(pos.coords.latitude.toFixed(4));
          const lon = parseFloat(pos.coords.longitude.toFixed(4));
          const placeName = await reverseGeocode(lat, lon);
          cachedSystemLocation = { name: placeName, lat, lon, granted: true };
          localStorage.setItem('krishimitra_system_coords', JSON.stringify(cachedSystemLocation));
          renderWeatherCard(el, cachedSystemLocation);
        },
        (err) => {
          console.warn('Device location unavailable or denied:', err.message);
          renderWeatherCard(el, { ...loc, granted: false });
        },
        { timeout: 8000, enableHighAccuracy: true }
      );
    } else {
      renderWeatherCard(el, loc);
    }
  }

  async function renderWeatherCard(el, loc) {
    const w = await fetchLiveWeather(loc);

    el.innerHTML = `
      <div class="weather-card">
        ${!loc.granted ? `
        <div style="margin-bottom:12px;padding:8px 12px;background:rgba(245,158,11,0.22);border:1px solid rgba(255,255,255,0.25);border-radius:8px;font-size:12px;display:flex;align-items:center;justify-content:space-between;gap:8px;">
          <span>📍 Turn on device location to get live weather for your exact farm coordinates.</span>
          <button onclick="FarmerPortal.requestSystemLocation()" class="btn btn-sm" style="background:#ffffff;color:#064e3b;font-weight:700;font-size:11px;padding:4px 10px;border:none;border-radius:6px;white-space:nowrap;cursor:pointer;">Turn On</button>
        </div>
        ` : ''}

        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px;">
          <div>
            <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">
              <span style="font-size:16px;">📍</span>
              <span style="font-size:15px;font-weight:700;color:#ffffff;letter-spacing:-0.2px;">${loc.name}</span>
              ${loc.granted ? `<span class="badge" style="background:rgba(255,255,255,0.2);color:#ffffff;font-size:10px;padding:2px 6px;">GPS Active</span>` : ''}
            </div>
            <div class="weather-label" style="font-size:11px;opacity:0.85;margin-left:22px;">
              Coordinates: <strong>${loc.lat.toFixed(4)}°N, ${loc.lon.toFixed(4)}°E</strong>
            </div>
            <div class="weather-temp" style="margin-top:8px;">${w.temp}°C</div>
            <div style="font-size:14px;opacity:0.95;margin-top:2px;font-weight:600;">${w.condition} at your farm</div>
          </div>
          <div style="font-size:56px;opacity:0.9;text-align:right;">${w.conditionIcon || '⛅'}</div>
        </div>

        <div class="weather-stats">
          <div class="weather-stat">
            <div class="weather-stat-value">💧 ${w.humidity}%</div>
            <div class="weather-stat-label">Humidity</div>
          </div>
          <div class="weather-stat">
            <div class="weather-stat-value">🌧️ ${w.rainfall}mm</div>
            <div class="weather-stat-label">Rainfall</div>
          </div>
          <div class="weather-stat">
            <div class="weather-stat-value">💨 ${w.wind}km/h</div>
            <div class="weather-stat-label">Wind Speed</div>
          </div>
        </div>

        <div style="margin-top:12px;padding:8px 12px;background:rgba(255,255,255,0.14);border-radius:8px;font-size:12px;">
          <strong>🧴 Spray Advisory:</strong> ${w.sprayConditions} — ${w.sprayReason}
        </div>

        <div style="display:flex;gap:8px;margin-top:12px;overflow-x:auto;">
          ${w.forecast.map(f => `
            <div style="text-align:center;padding:6px 10px;background:rgba(255,255,255,0.09);border-radius:8px;min-width:60px;">
              <div style="font-size:11px;opacity:0.75;">${f.day}</div>
              <div style="font-size:20px;margin:2px 0;">${f.icon}</div>
              <div style="font-size:12px;font-weight:600;">${f.high}°/${f.low}°</div>
              <div style="font-size:10px;opacity:0.7;">🌧${f.rain}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  function requestSystemLocation() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const lat = parseFloat(pos.coords.latitude.toFixed(4));
          const lon = parseFloat(pos.coords.longitude.toFixed(4));
          const placeName = await reverseGeocode(lat, lon);
          cachedSystemLocation = { name: placeName, lat, lon, granted: true };
          localStorage.setItem('krishimitra_system_coords', JSON.stringify(cachedSystemLocation));
          renderWeather('weather-widget');
        },
        (err) => {
          alert('Could not access device location: ' + err.message + '\nPlease allow location access in your browser settings.');
        },
        { enableHighAccuracy: true }
      );
    } else {
      alert('Geolocation is not supported by your browser.');
    }
  }

  function renderCrops(containerId) {
    const el = document.getElementById(containerId);
    if (!el) return;
    if (MY_CROPS.length === 0) {
      el.innerHTML = '<div style="text-align:center;padding:20px;color:#94a3b8;font-size:14px;">No crops added yet. Click "+ Add Crop" to get started.</div>';
      return;
    }
    el.innerHTML = MY_CROPS.map((crop, idx) => {
      const healthColor = crop.health >= 85 ? '#10b981' : crop.health >= 70 ? '#f59e0b' : '#ef4444';
      const statusColor = crop.status === 'Healthy' || crop.status === 'Excellent' ? '#10b981' : crop.status === 'Needs Water' ? '#f59e0b' : '#ef4444';
      const daysToHarvest = Math.max(0, Math.floor((new Date(crop.harvest) - new Date()) / 86400000));
      return `
        <div class="crop-card" style="cursor:pointer;" onclick="FarmerPortal.showCropDetail(${idx})">
          <div class="crop-icon">${crop.icon}</div>
          <div class="crop-info">
            <div class="flex justify-between items-center">
              <div class="crop-name">${crop.name}</div>
              <span class="badge" style="background:${statusColor}15;color:${statusColor};">${crop.status}</span>
            </div>
            <div class="crop-detail">${crop.field} · ${crop.stage} · Harvest in ${daysToHarvest} days</div>
            <div class="crop-health-bar">
              <div class="crop-health-fill" style="width:${crop.health}%;background:${healthColor};"></div>
            </div>
            <div class="flex justify-between" style="margin-top:4px;">
              <span class="text-xs text-muted">Health: ${crop.health}%</span>
              <span class="text-xs text-muted">Sown: ${new Date(crop.sowing).toLocaleDateString('en-IN', {day:'numeric',month:'short'})}</span>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  function showCropDetail(idx) {
    const crop = MY_CROPS[idx];
    if (!crop) return;
    const modal = document.getElementById('add-crop-modal');
    if (!modal) return;
    const daysToHarvest = Math.max(0, Math.floor((new Date(crop.harvest) - new Date()) / 86400000));
    modal.innerHTML = `
      <div class="card" style="width:90%;max-width:500px;padding:24px;">
        <div class="flex justify-between items-center" style="margin-bottom:16px;">
          <h3 class="heading-lg">${crop.icon} ${crop.name}</h3>
          <button class="btn btn-ghost btn-sm" onclick="this.closest('#add-crop-modal').style.display='none'">✕</button>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;">
          <div style="padding:12px;background:#f0fdf4;border-radius:8px;"><strong>Field:</strong> ${crop.field}</div>
          <div style="padding:12px;background:#f0f9ff;border-radius:8px;"><strong>Stage:</strong> ${crop.stage}</div>
          <div style="padding:12px;background:#fefce8;border-radius:8px;"><strong>Health:</strong> ${crop.health}%</div>
          <div style="padding:12px;background:#faf5ff;border-radius:8px;"><strong>Harvest:</strong> ${daysToHarvest} days</div>
        </div>
        <div style="display:flex;gap:8px;">
          <a href="/farmer/disease-scanner.html" class="btn btn-primary btn-sm" style="flex:1;text-decoration:none;text-align:center;">📸 Scan for Disease</a>
          <a href="/ai/" class="btn btn-secondary btn-sm" style="flex:1;text-decoration:none;text-align:center;">💬 Ask AI About</a>
          <button class="btn btn-sm" style="color:#ef4444;border:1px solid #ef4444;" onclick="FarmerPortal.removeCrop(${idx});this.closest('#add-crop-modal').style.display='none'">🗑️ Remove</button>
        </div>
      </div>
    `;
    modal.style.display = 'flex';
  }

  function removeCrop(idx) {
    MY_CROPS.splice(idx, 1);
    saveCrops();
    renderCrops('crops-list');
  }

  function addCrop(name, variety, field, sowingDate) {
    const cropIcons = { wheat: '🌾', rice: '🌾', paddy: '🌾', tomato: '🍅', maize: '🌽', corn: '🌽', potato: '🥔', onion: '🧅', cotton: '🌿', sugarcane: '🎋', chilli: '🌶️', mango: '🥭', banana: '🍌' };
    const n = name.toLowerCase();
    const icon = Object.keys(cropIcons).find(k => n.includes(k)) ? cropIcons[Object.keys(cropIcons).find(k => n.includes(k))] : '🌱';
    const fullName = variety ? `${name} (${variety})` : name;
    const sowing = sowingDate || new Date().toISOString().split('T')[0];
    const harvestDate = new Date(sowing);
    harvestDate.setMonth(harvestDate.getMonth() + 4);

    MY_CROPS.push({
      name: fullName, icon, field: field || `Field ${String.fromCharCode(65 + MY_CROPS.length)}`,
      health: 95, stage: 'Seedling', sowing, harvest: harvestDate.toISOString().split('T')[0], status: 'Healthy'
    });
    saveCrops();
    renderCrops('crops-list');
  }

  function renderQuickActions(containerId) {
    const el = document.getElementById(containerId);
    if (!el) return;

    // "Ask AI" removed as a peer tile — it now lives as a persistent FAB on all Farmer Portal pages.
    // "Government Schemes" added: routes to AI Bot with a pre-filled query via the RAG/LLM pipeline.
    const actions = [
      { label: 'Scan Crop',   icon: '📸', color: '#818CF8', bg: '#818CF815', href: '/farmer/disease-scanner.html' },
      { label: 'Crop Advice', icon: '🌱', color: '#10B981', bg: '#10B98115', href: '/farmer/recommendation.html' },
      { label: 'Fertilizer',  icon: '🧪', color: '#3b82f6', bg: '#3b82f615', href: '/farmer/tools/fertilizer.html' },
      { label: 'Pesticide',   icon: '🦟', color: '#f97316', bg: '#f9731615', href: '/farmer/tools/pesticide.html' },
      { label: 'Calculator',  icon: '🔢', color: '#f59e0b', bg: '#f59e0b15', href: '/farmer/tools/farming.html' },
      {
        label: 'Govt Schemes', icon: '🏛️', color: '#06b6d4', bg: '#06b6d415',
        href: '/ai/?prefill=' + encodeURIComponent('What government schemes and subsidies are available for farmers in India? Include PM-KISAN, PMFBY crop insurance, soil health card scheme, and any Karnataka-specific schemes.')
      },
    ];
    el.innerHTML = actions.map(a => `
      <a href="${a.href}" class="quick-action-btn" style="text-decoration:none;">
        <div class="quick-action-icon" style="background:${a.bg}">${a.icon}</div>
        <div class="quick-action-label">${a.label}</div>
      </a>
    `).join('');

    // Inject the persistent floating "Ask KrishiMitra" FAB on all Farmer Portal pages.
    // Only inject once — check if it already exists (e.g., on SPA navigation).
    if (!document.getElementById('krishi-fab')) {
      const fab = document.createElement('a');
      fab.id = 'krishi-fab';
      fab.href = '/ai/';
      fab.title = 'Ask KrishiMitra AI';
      fab.setAttribute('aria-label', 'Ask KrishiMitra AI');
      fab.innerHTML = `
        <span style="font-size:22px;line-height:1;">🤖</span>
        <span style="font-size:12px;font-weight:700;letter-spacing:0.2px;">Ask KrishiMitra</span>
      `;
      fab.style.cssText = [
        'position:fixed',
        'bottom:28px',
        'right:24px',
        'z-index:900',
        'display:flex',
        'flex-direction:column',
        'align-items:center',
        'justify-content:center',
        'gap:4px',
        'width:80px',
        'height:80px',
        'border-radius:50%',
        'background:linear-gradient(135deg,#7c3aed,#8b5cf6,#6d28d9)',
        'color:#ffffff',
        'text-decoration:none',
        'box-shadow:0 4px 24px rgba(139,92,246,0.45),0 1px 4px rgba(0,0,0,0.18)',
        'transition:transform 0.18s ease,box-shadow 0.18s ease',
        'text-align:center',
        'padding:8px 4px',
      ].join(';');
      fab.onmouseenter = () => { fab.style.transform = 'scale(1.08)'; fab.style.boxShadow = '0 8px 32px rgba(139,92,246,0.6),0 2px 8px rgba(0,0,0,0.2)'; };
      fab.onmouseleave = () => { fab.style.transform = 'scale(1)'; fab.style.boxShadow = '0 4px 24px rgba(139,92,246,0.45),0 1px 4px rgba(0,0,0,0.18)'; };
      document.body.appendChild(fab);
    }
  }

  // In-memory cache for live regional alerts
  let liveAlertsCache = null;
  let lastAlertsFetchTime = 0;

  async function fetchLiveRegionalAlerts(forceRefresh = false) {
    const now = Date.now();
    if (!forceRefresh && liveAlertsCache && (now - lastAlertsFetchTime < 180000)) {
      return liveAlertsCache;
    }

    if (window.KrishiAPI && KrishiAPI.isOnline()) {
      try {
        const loc = cachedSystemLocation || getStoredSystemLocation();
        const cropsList = MY_CROPS.map(c => c.name).join(', ') || 'Wheat, Tomato, Rice, Maize';
        const prompt = `You are a real-time agricultural pest, disease, and weather risk forecasting system for Indian farmers.
Location: ${loc.name} (${loc.lat.toFixed(2)}°N, ${loc.lon.toFixed(2)}°E)
Current crops in field: ${cropsList}
Current Season: ${new Date().getMonth() >= 5 && new Date().getMonth() <= 9 ? 'Kharif' : new Date().getMonth() >= 10 || new Date().getMonth() <= 2 ? 'Rabi' : 'Zaid'}

Generate 4 urgent, realistic, and actionable agricultural alerts for this exact region and these crops.
Include pest outbreaks, fungal/bacterial disease risks based on current weather/season, IMD weather warnings, and spray advisories.

Respond ONLY with a raw, valid JSON array matching this schema:
[
  {
    "type": "pest",
    "severity": "high",
    "title": "Fall Armyworm Alert in Maize",
    "desc": "Increased moth catches reported in ${loc.name.split(',')[0]}. Scout whorls of young maize plants for pinholes and apply neem spray.",
    "crop": "Maize",
    "region": "${loc.name.split(',')[0]} District",
    "time": "Just now"
  }
]`;

        const rawText = await KrishiAPI.callGemini(prompt);
        const parsed = KrishiAPI.parseGeminiJSON(rawText);
        if (Array.isArray(parsed) && parsed.length > 0) {
          liveAlertsCache = parsed;
          lastAlertsFetchTime = now;
          return parsed;
        }
      } catch (err) {
        console.warn('Gemini live alerts notice:', err.message);
      }
    }

    return ALERTS;
  }

  async function renderAlerts(containerId, limit) {
    const el = document.getElementById(containerId);
    if (!el) return;

    const alerts = await fetchLiveRegionalAlerts();
    const items = limit ? alerts.slice(0, limit) : alerts;
    const severityIcons = { low: 'ℹ️', medium: '⚠️', high: '🔴', critical: '🚨' };
    el.innerHTML = items.map(a => `
      <div class="alert-item alert-${a.severity}">
        <div class="alert-icon">${severityIcons[a.severity] || '⚠️'}</div>
        <div style="flex:1;">
          <div style="font-weight:600;font-size:13px;color:#1e293b;">${a.title}</div>
          <div style="font-size:12px;color:#64748b;margin-top:2px;">${a.desc}</div>
        </div>
        <span class="text-xs text-faint">${a.time}</span>
      </div>
    `).join('');
  }

  function logActivity(icon, text, color = '#10b981') {
    RECENT_ACTIVITY.unshift({ icon, text, time: 'Just now', color });
    if (RECENT_ACTIVITY.length > 10) RECENT_ACTIVITY.pop();
    const el = document.getElementById('activity-list');
    if (el) renderActivity('activity-list');
  }

  function renderActivity(containerId) {
    const el = document.getElementById(containerId);
    if (!el) return;
    el.innerHTML = RECENT_ACTIVITY.map(a => `
      <div class="activity-item">
        <div class="activity-icon" style="background:${a.color}12;color:${a.color};">${a.icon}</div>
        <div class="activity-text">${a.text}</div>
        <div class="activity-time">${a.time}</div>
      </div>
    `).join('');
  }

  function renderOfflineStatus(containerId) {
    const el = document.getElementById(containerId);
    if (!el) return;
    const update = () => {
      const online = window.KrishiAPI ? KrishiAPI.isOnline() : navigator.onLine;
      const status = online ? 'online' : 'offline';
      const icon = online ? '🟢' : '🟡';
      const label = online ? 'Online — Connected to KrishiMitra Services' : 'Offline — Using local agricultural intelligence';
      const sync = online ? 'All data synced' : '3 actions pending sync';
      el.innerHTML = `
        <div class="offline-bar ${status}">
          <span>${icon}</span>
          <div style="flex:1;">
            <div style="font-weight:600;">${label}</div>
            <div style="font-size:11px;opacity:0.7;margin-top:1px;">${sync} · Last sync: ${new Date().toLocaleTimeString('en-IN', {hour:'2-digit',minute:'2-digit'})}</div>
          </div>
        </div>
      `;
    };
    update();
    if (window.KrishiAPI) KrishiAPI.onStatusChange(update);
  }

  // ── Gemini Crop Recommendation ──
  async function callGeminiCropRecommendation(soilData) {
    const selectedLang = localStorage.getItem('krishimitra_lang') || 'en';
    const prompt = `You are a precision agronomist AI. Based on the soil parameters:
- Nitrogen (N): ${soilData.N} kg/ha
- Phosphorus (P): ${soilData.P} kg/ha
- Potassium (K): ${soilData.K} kg/ha
- pH: ${soilData.ph}
- Temperature: ${soilData.temperature}°C
- Humidity: ${soilData.humidity}%
- Rainfall: ${soilData.rainfall} mm

Analyze crop suitability and determine the best crops for these exact conditions. Be scientifically accurate.

Respond ONLY with a raw, valid JSON object matching this schema:
{
  "recommended_crop": "Rice (BPT-5204)",
  "confidence": 92,
  "top3_crops": [
    { "crop": "Rice (BPT-5204)", "confidence": 92 },
    { "crop": "Maize (DHM-117)", "confidence": 78 },
    { "crop": "Tomato (Arka Rakshak)", "confidence": 65 }
  ],
  "shap_sorted": [
    ["rainfall", { "label": "Rainfall Level", "impact": "positive", "shap_value": 0.8, "feature_value": "${soilData.rainfall}mm" }],
    ["N", { "label": "Nitrogen Content (N)", "impact": "positive", "shap_value": 0.6, "feature_value": "${soilData.N} kg/ha" }],
    ["ph", { "label": "Soil pH Level", "impact": "positive", "shap_value": 0.4, "feature_value": "${soilData.ph}" }]
  ],
  "explanation": "Detailed explanation of why this crop is recommended based on the soil and climate data. In ${selectedLang} language."
}`;

    const rawText = await KrishiAPI.callGemini(prompt);
    return KrishiAPI.parseGeminiJSON(rawText);
  }

  // ── Crop Recommendation Submit ──
  async function submitCropRecommendation(formData) {
    const resultEl = document.getElementById('recommendation-result');
    if (!resultEl) return;

    resultEl.innerHTML = '<div style="text-align:center;padding:32px;"><div class="skeleton" style="width:200px;height:20px;margin:0 auto 12px;"></div><div class="skeleton" style="width:300px;height:16px;margin:0 auto;"></div><p style="margin-top:12px;color:#64748b;font-size:13px;">Computing optimal crop suitability with Gemini AI...</p></div>';

    try {
      const soilData = {
        N: parseFloat(formData.N) || 90, P: parseFloat(formData.P) || 42, K: parseFloat(formData.K) || 43,
        temperature: parseFloat(formData.temperature) || 28, humidity: parseFloat(formData.humidity) || 75,
        ph: parseFloat(formData.ph) || 6.5, rainfall: parseFloat(formData.rainfall) || 200,
      };
      let result;
      try {
        result = await KrishiAPI.recommendCrop(soilData);
      } catch (e) {
        result = await callGeminiCropRecommendation(soilData);
      }
      renderCropRecommendationResult(resultEl, result);
    } catch (err) {
      resultEl.innerHTML = `
        <div class="card" style="text-align:center;padding:24px;">
          <div style="font-size:32px;margin-bottom:8px;">⚠️</div>
          <div style="font-weight:600;color:#dc2626;">Could not process recommendation</div>
          <div style="font-size:13px;color:#64748b;margin-top:4px;">${err.message}</div>
        </div>
      `;
    }
  }

  function renderCropRecommendationResult(el, result) {
    const top3 = result.top3_crops || [];
    const shapSorted = result.shap_sorted || [];
    const explanation = result.explanation || '';

    let shapBarsHTML = '';
    if (shapSorted.length > 0) {
      const maxAbs = Math.max(...shapSorted.map(s => Math.abs(s[1].shap_value))) || 1;
      shapBarsHTML = shapSorted.map(([key, data]) => {
        const pct = Math.round((Math.abs(data.shap_value) / maxAbs) * 100);
        const isPositive = data.impact === 'positive';
        const impactLabel = isPositive ? 'Supports' : 'Reduces';
        const friendlyReason = isPositive
          ? `${data.label} supports this recommendation`
          : `${data.label} slightly reduces suitability`;
        return `
          <div class="shap-bar-row">
            <div class="shap-bar-label">${data.label}</div>
            <div class="shap-bar-track">
              <div class="shap-bar-fill ${isPositive ? 'positive' : 'negative'}" style="width:${pct}%;">
                ${pct > 20 ? impactLabel : ''}
              </div>
            </div>
            <span class="text-xs" style="width:50px;color:${isPositive ? '#059669' : '#dc2626'};font-weight:600;">${data.feature_value}</span>
          </div>
          <div style="font-size:11px;color:#94a3b8;margin-left:103px;margin-top:-4px;margin-bottom:4px;">${friendlyReason}</div>
        `;
      }).join('');
    }

    el.innerHTML = `
      <div class="card" style="border-color:#10b98130;">
        <div style="text-align:center;padding:16px 0 12px;">
          <div style="font-size:48px;margin-bottom:8px;">🌾</div>
          <div class="heading-xl" style="color:#059669;">${result.recommended_crop}</div>
          <div style="font-size:14px;color:#64748b;margin-top:4px;">Recommended with <strong style="color:#10b981;">${result.confidence}%</strong> confidence</div>
        </div>

        ${top3.length > 0 ? `
        <div style="display:flex;gap:8px;justify-content:center;margin:16px 0;">
          ${top3.map((c, i) => `
            <div style="padding:8px 16px;background:${i===0?'#10b98118':'#f1f5f9'};border-radius:10px;text-align:center;border:1px solid ${i===0?'#10b98130':'#e2e8f0'};">
              <div style="font-weight:700;font-size:14px;color:${i===0?'#059669':'#334155'};">${c.crop}</div>
              <div style="font-size:12px;color:#64748b;">${c.confidence}%</div>
            </div>
          `).join('')}
        </div>
        ` : ''}

        ${shapBarsHTML ? `
        <div style="margin-top:20px;">
          <div class="heading-md" style="margin-bottom:12px;">🔍 Why ${result.recommended_crop}?</div>
          <div class="shap-bar-container">${shapBarsHTML}</div>
        </div>
        ` : ''}

        ${explanation ? `
        <div class="shap-explanation">
          <strong>📋 In simple terms:</strong> ${explanation}
        </div>
        ` : ''}
      </div>
    `;
  }

  // ── Image Validation ──
  function validateCropLeafImage(imageFile) {
    return new Promise((resolve) => {
      if (!imageFile) return resolve({ isValid: true });
      const fileName = (imageFile?.name || '').toLowerCase();
      if (fileName.includes('screenshot') || fileName.includes('screen_capture') || fileName.includes('desktop_ui')) {
        return resolve({ isValid: false, reason: 'Please upload a photo of an actual crop leaf or plant, not a computer screenshot.' });
      }
      resolve({ isValid: true });
    });
  }

  // ── Gemini Vision Disease Detection (High Accuracy Multimodal) ──
  async function callGeminiVision(imageFile) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const img = new Image();
          img.onload = async () => {
            try {
              // Downscale to max 1024px to ensure light payload (~120KB) and prevent ERR_NETWORK_CHANGED
              let w = img.width;
              let h = img.height;
              const maxDim = 1024;
              if (w > maxDim || h > maxDim) {
                if (w > h) {
                  h = Math.round((h * maxDim) / w);
                  w = maxDim;
                } else {
                  w = Math.round((w * maxDim) / h);
                  h = maxDim;
                }
              }
              const canvas = document.createElement('canvas');
              canvas.width = w;
              canvas.height = h;
              const ctx = canvas.getContext('2d');
              ctx.drawImage(img, 0, 0, w, h);
              const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
              const base64Data = dataUrl.split(',')[1];
              const mimeType = 'image/jpeg';
              const selectedLang = localStorage.getItem('krishimitra_lang') || 'en';

              const prompt = `You are a world-leading agricultural plant pathologist and precision farming expert.
Carefully examine this uploaded image.

FIRST CHECK: Does this image depict any plant, crop leaf, stem, fruit, or agricultural specimen?
- If NO (e.g. it is a human selfie, building, car, animal, furniture, or non-plant object):
  Respond ONLY with: {"is_invalid_image": true, "reason": "The uploaded photo does not contain a crop or plant leaf. Please capture a clear photo of your plant."}

- If YES:
  Perform a comprehensive, highly accurate diagnosis:
  1. Detect the exact Crop name (e.g. Tomato, Rice, Wheat, Maize, Cotton, Potato, Apple, Grape, Chilli, etc.)
  2. Detect the specific Disease / Pathology, or "Healthy Plant" if no disease or pest damage is observed.
  3. Assign an accurate Confidence percentage (70-99%).
  4. Determine Severity: "None", "Low", "Moderate", or "Severe".
  5. List visible Symptoms observed on this specific specimen.
  6. Provide targeted Chemical Treatment (active ingredients, trade names available in India like Mancozeb, Chlorothalonil, Imidacloprid, Carbendazim, etc. with exact dosages per Liter of water).
  7. Provide Organic / Biological Treatment (Neem oil, Trichoderma, Pseudomonas fluorescens, bio-pesticides).
  8. Detail Preventive Cultural Practices (irrigation method, spacing, crop rotation, sanitation).

Respond in ${selectedLang} language context for explanations.
Respond ONLY with a raw, valid JSON object (no markdown quotes, no explanations outside JSON):
{
  "crop": "Tomato",
  "disease": "Early Blight (Alternaria solani)",
  "confidence": 94,
  "severity": "Moderate",
  "symptoms": "Concentric dark brown rings with chlorotic yellow halo...",
  "treatment": "Spray Mancozeb 75% WP @ 2.5 g/L or Azoxystrobin 23% SC @ 1 ml/L every 7-10 days.",
  "organic_treatment": "Spray Neem oil 1500 ppm @ 5 ml/L + Trichoderma viride @ 5 g/L.",
  "prevention": "Ensure wide plant spacing for airflow, practice drip irrigation, destroy infected fallen leaves."
}`;

              const rawText = await KrishiAPI.callGemini(prompt, base64Data, mimeType);
              const parsed = KrishiAPI.parseGeminiJSON(rawText);

              if (parsed.is_invalid_image) {
                return resolve({ is_invalid_image: true, reason: parsed.reason });
              }
              resolve(parsed);
            } catch (err) { reject(err); }
          };
          img.onerror = () => reject(new Error('Failed to decode image'));
          img.src = e.target.result;
        } catch (err) { reject(err); }
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(imageFile);
    });
  }

  // ── Disease Detection Submit ──
  async function submitDiseaseDetection(imageFile) {
    const resultEl = document.getElementById('disease-result');
    if (!resultEl) return;

    resultEl.innerHTML = '<div style="text-align:center;padding:32px;"><div class="skeleton" style="width:220px;height:20px;margin:0 auto 12px;"></div><div class="skeleton" style="width:320px;height:16px;margin:0 auto;"></div><p style="margin-top:12px;color:#10b981;font-size:14px;font-weight:600;">Analyzing crop leaf with Gemini Vision AI...</p></div>';

    const validation = await validateCropLeafImage(imageFile);
    if (!validation.isValid) {
      renderDiseaseResult(resultEl, { is_invalid_image: true, reason: validation.reason });
      return;
    }

    try {
      let result;
      // Prioritize Gemini Vision for maximum real-world diagnostic accuracy
      try {
        result = await callGeminiVision(imageFile);
      } catch (geminiErr) {
        console.warn('Gemini Vision failed, falling back to ML service:', geminiErr);
        const formData = new FormData();
        formData.append('file', imageFile);
        result = await KrishiAPI.detectDisease(formData);
      }

      if (result.is_invalid_image || result.invalid_image) {
        renderDiseaseResult(resultEl, { is_invalid_image: true, reason: result.reason });
        return;
      }
      renderDiseaseResult(resultEl, result);
    } catch (err) {
      resultEl.innerHTML = `
        <div class="card" style="text-align:center;padding:24px;">
          <div style="font-size:32px;margin-bottom:8px;">⚠️</div>
          <div style="font-weight:600;color:#dc2626;">Disease diagnosis failed</div>
          <div style="font-size:13px;color:#64748b;margin-top:4px;">${err.message}</div>
        </div>
      `;
    }
  }

  function renderDiseaseResult(el, result) {
    if (result.is_invalid_image || result.invalid_image) {
      el.innerHTML = `
        <div class="card" style="text-align:center;padding:28px;border:1px solid #f59e0b;background:#fffbebf0;border-radius:14px;">
          <div style="font-size:44px;margin-bottom:10px;">⚠️</div>
          <div class="heading-md" style="color:#b45309;font-weight:700;">Invalid Crop Photo</div>
          <div style="font-size:14px;color:#78350f;margin-top:8px;max-width:440px;margin-left:auto;margin-right:auto;line-height:1.5;">
            Please upload a clear, close-up photo of an actual crop leaf to detect diseases accurately.
          </div>
        </div>
      `;
      return;
    }

    const isHealthy = (result.disease || '').toLowerCase().includes('healthy');
    const confidence = result.confidence || 0;

    el.innerHTML = `
      <div class="disease-result card" style="padding:0;overflow:hidden;">
        <div class="disease-result-header ${isHealthy ? 'healthy' : 'diseased'}">
          <div style="font-size:36px;margin-bottom:8px;">${isHealthy ? '✅' : '🦠'}</div>
          <div class="heading-xl">${result.disease || 'Unknown'}</div>
          <div style="font-size:14px;opacity:0.9;margin-top:4px;">
            ${result.crop || 'Unknown Crop'} · Confidence: ${confidence}%
          </div>
        </div>
        <div style="padding:20px;">
          ${result.severity ? `<div style="margin-bottom:12px;"><strong>Severity:</strong> <span class="severity-${(result.severity||'').toLowerCase()}">${result.severity}</span></div>` : ''}
          ${result.symptoms ? `<div style="margin-bottom:16px;"><strong>Symptoms:</strong><p style="color:#475569;font-size:14px;margin-top:4px;">${result.symptoms}</p></div>` : ''}

          ${!isHealthy ? `
          <div style="display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));">
            ${result.treatment ? `
            <div class="treatment-card">
              <h4>🧪 Chemical Treatment</h4>
              <p style="font-size:13px;color:#475569;">${result.treatment}</p>
            </div>` : ''}
            ${result.organic_treatment ? `
            <div class="treatment-card" style="border-color:#10b98130;">
              <h4 style="color:#059669;">🌿 Organic Treatment</h4>
              <p style="font-size:13px;color:#475569;">${result.organic_treatment}</p>
            </div>` : ''}
          </div>
          ${result.prevention ? `
          <div style="margin-top:12px;padding:12px;background:#f0fdf4;border-radius:8px;border:1px solid #10b98120;">
            <strong style="color:#059669;">🛡️ Prevention:</strong>
            <p style="font-size:13px;color:#475569;margin-top:4px;">${result.prevention}</p>
          </div>` : ''}
          ` : `
          <div style="padding:16px;background:#f0fdf4;border-radius:8px;text-align:center;">
            <div style="font-size:24px;margin-bottom:8px;">🎉</div>
            <div style="font-weight:600;color:#059669;">Your crop looks healthy!</div>
            <div style="font-size:13px;color:#475569;margin-top:4px;">Continue with your current farming practices.</div>
          </div>
          `}
        </div>
      </div>
    `;
  }

  return {
    renderWeather, renderCrops, renderQuickActions, renderAlerts,
    renderActivity, renderOfflineStatus,
    submitCropRecommendation, submitDiseaseDetection,
    addCrop, removeCrop, showCropDetail, saveCrops,
    requestSystemLocation, getStoredSystemLocation,
    fetchLiveRegionalAlerts, logActivity,
    MY_CROPS, ALERTS, RECENT_ACTIVITY,
  };
})();

window.FarmerPortal = FarmerPortal;
