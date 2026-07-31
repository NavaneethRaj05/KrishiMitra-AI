import { useState, useEffect } from 'react';
import { Sprout } from 'lucide-react';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import SearchBar from './components/SearchBar';
import ThreadView from './components/ThreadView';
import InfoCards from './components/InfoCards';
import SettingsPanel from './components/SettingsPanel';
import CropCalendar from './components/CropCalendar';
import { translate } from './utils/translations';
import { submitQuery, transcribeVoice, reverseGeocode } from './api/queryRouter';
import { cacheWeather, getCachedWeather, cacheMarket, getCachedMarket, saveThread, getThread, getQueuedRequests, clearQueue } from './utils/offlineStore';
import { startLocationTracking, stopLocationTracking, getCurrentLocation, onStatusUpdate, retryLocationTracking, onLocationUpdate } from './utils/gpsLocation';
import LocationOverlay from './components/LocationOverlay';


const DEFAULT_PROFILE = {
  name: 'Farmer',
  phone: '',
  country: 'India',
  state: 'Karnataka',
  district: 'Hassan',
  crop: '',
  lat: 13.06,
  lng: 76.10,
  majorCrops: ['rice', 'ragi', 'coffee', 'coconut', 'areca nut']
};

const DISTRICT_COORDS = {
  hassan: { lat: 13.06, lon: 76.10 },
  mysore: { lat: 12.30, lon: 76.64 }, mysuru: { lat: 12.30, lon: 76.64 },
  tumkur: { lat: 13.34, lon: 77.10 }, kolar: { lat: 13.13, lon: 78.13 },
  belgaum: { lat: 15.85, lon: 74.50 }, belagavi: { lat: 15.85, lon: 74.50 },
  bangalore: { lat: 12.97, lon: 77.59 }, bengaluru: { lat: 12.97, lon: 77.59 },
  jaipur: { lat: 26.91, lon: 75.78 }, pune: { lat: 18.52, lon: 73.85 },
  patna: { lat: 25.59, lon: 85.13 }, lucknow: { lat: 26.84, lon: 80.94 },
};

const SUGGESTION_CHIPS = [
  { key: 'chip_disease', query: 'How to identify and treat tomato leaf diseases?' },
  { key: 'chip_prices', query: 'What are today\'s APMC mandi prices for vegetables in my district?' },
  { key: 'chip_soil', query: 'Recommend best crops for my soil — N=90 P=42 K=43 pH=6.5 temp=25' },
  { key: 'chip_irrigation', query: 'Best irrigation practices for monsoon season crops' },
  { key: 'chip_schemes', query: 'What government agriculture subsidy schemes are available for small farmers?' },
  { key: 'chip_organic', query: 'Organic pest control methods for vegetable crops' },
];

const getWeatherText = (code, lang) => {
  const en = lang === 'en';
  if (code === 0) return en ? 'Clear Sky' : 'ಸ್ವಚ್ಛ ಆಕಾಶ';
  if (code >= 1 && code <= 3) return en ? 'Partly Cloudy' : 'ಭಾಗಶಃ ಮೋಡ';
  if (code >= 45 && code <= 48) return en ? 'Foggy' : 'ಮಂಜು';
  if (code >= 51 && code <= 55) return en ? 'Drizzle' : 'ತುಂತುರು ಮಳೆ';
  if (code >= 61 && code <= 65) return en ? 'Rainy' : 'ಮಳೆ';
  if (code >= 80 && code <= 82) return en ? 'Rain Showers' : 'ಮಳೆ ಹನಿಗಳು';
  if (code >= 95) return en ? 'Thunderstorm' : 'ಗುಡುಗು ಸಹಿತ ಮಳೆ';
  return en ? 'Overcast' : 'ಮೋಡ ಕವಿದ';
};

function App() {
  // ── State ──
  const [profile, setProfile] = useState(() => {
    const saved = localStorage.getItem('krishimitraai_profile');
    return saved ? JSON.parse(saved) : DEFAULT_PROFILE;
  });
  const [lang, setLang] = useState(() => localStorage.getItem('krishimitraai_lang') || 'en');
  const [view, setView] = useState('home'); // 'home' | 'thread'
  const [thread, setThread] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [weather, setWeather] = useState({ temp: '--', desc: '', loading: true });
  const [market, setMarket] = useState({ price: '₹--', trend: '', loading: true });
  const [homeQuery, setHomeQuery] = useState('');
  const [locStatus, setLocStatus] = useState({ status: 'loading', error: null });
  const [gpsCoords, setGpsCoords] = useState(null);
  const [geocodedLocation, setGeocodedLocation] = useState(null);
  const [activeNav, setActiveNav] = useState('home');
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // ── Restore thread from IndexedDB on startup ──
  useEffect(() => {
    async function restoreThread() {
      const saved = await getThread('active_thread');
      if (saved && saved.length > 0) {
        setThread(saved);
        setView('thread');
      }
    }
    restoreThread();
  }, []);

  // ── Persist active thread on changes ──
  useEffect(() => {
    if (thread.length > 0) {
      saveThread('active_thread', thread);
    } else {
      saveThread('active_thread', []);
    }
  }, [thread]);

  // ── Online/Offline detection & Auto Sync ──
  useEffect(() => {
    const goOnline = async () => {
      setIsOnline(true);
      console.log('[Sync] Device is back online. Checking offline queue...');
      const queued = await getQueuedRequests();
      if (queued.length > 0) {
        try {
          let host = window.location.hostname || 'localhost';
          if (host === 'localhost') host = '127.0.0.1';
          let token = localStorage.getItem('token') || 'demo_token';
          if (token === 'undefined' || token === 'null') token = 'demo_token';

          const actions = queued.map(q => ({
            actionType: q.mode === 'image' ? 'disease_detection' : q.mode === 'soil' ? 'crop_recommendation' : 'rag_query',
            input: { query: q.query },
            status: 'pending',
            createdAt: new Date(q.timestamp).toISOString()
          }));

          const res = await fetch(`http://${host}:5000/api/sync/flush`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ actions })
          });

          if (res.ok) {
            console.log('[Sync] Offline queue flushed successfully');
            await clearQueue();
          }
        } catch (e) {
          console.warn('[Sync] Failed to flush offline queue:', e);
        }
      }
    };
    const goOffline = () => setIsOnline(false);

    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);

    // Initial check on load
    if (navigator.onLine) {
      goOnline();
    }

    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  // ── Always-on GPS tracking & Status subscription ──
  useEffect(() => {
    startLocationTracking();
    const unsubscribeStatus = onStatusUpdate((statusObj) => {
      setLocStatus(statusObj);
    });
    const unsubscribeLocation = onLocationUpdate((coords) => {
      setGpsCoords(coords);
    });
    return () => {
      stopLocationTracking();
      unsubscribeStatus();
      unsubscribeLocation();
    };
  }, []);

  // ── Geocode GPS coordinates reactively ──
  useEffect(() => {
    if (gpsCoords && gpsCoords.latitude && gpsCoords.longitude) {
      async function doGeocode() {
        try {
          const res = await reverseGeocode(gpsCoords.latitude, gpsCoords.longitude);
          if (res && res.success) {
            setGeocodedLocation({ district: res.district, state: res.state });
          }
        } catch (e) {
          console.warn('[GPS] Geocoding failed:', e);
        }
      }
      doGeocode();
    } else {
      setGeocodedLocation(null);
    }
  }, [gpsCoords]);

  // ── Service Worker registration ──
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(err => {
        console.log('SW registration failed:', err);
      });
    }
  }, []);

  // ── Persist profile & lang ──
  useEffect(() => { localStorage.setItem('krishimitraai_profile', JSON.stringify(profile)); }, [profile]);
  useEffect(() => { localStorage.setItem('krishimitraai_lang', lang); }, [lang]);

  // ── Fetch Weather ──
  useEffect(() => {
    let active = true;
    const fetchWeather = async () => {
      setWeather(prev => ({ ...prev, loading: true }));

      // Try cache first
      const cached = await getCachedWeather();
      if (cached && active) {
        setWeather({ ...cached, loading: false });
      }

      // Use GPS coordinates if available, otherwise fall back to profile
      let lat, lon;
      if (gpsCoords && gpsCoords.latitude && gpsCoords.longitude) {
        lat = gpsCoords.latitude;
        lon = gpsCoords.longitude;
      } else {
        lat = profile.lat; lon = profile.lng;
        if (!lat || !lon) {
          const key = (profile.district || 'Hassan').toLowerCase().trim();
          const coords = DISTRICT_COORDS[key] || DISTRICT_COORDS.hassan;
          lat = coords.lat; lon = coords.lon;
        }
      }

      try {
        const res = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`
        );
        const data = await res.json();
        if (active && data.current_weather) {
          const w = {
            temp: `${Math.round(data.current_weather.temperature)}°C`,
            desc: getWeatherText(data.current_weather.weathercode, lang),
          };
          setWeather({ ...w, loading: false });
          cacheWeather(w);
        }
      } catch {
        if (active && !cached) {
          setWeather({ temp: '24°C', desc: 'Data unavailable', loading: false });
        }
      }
    };
    fetchWeather();
    return () => { active = false; };
  }, [profile.district, profile.lat, profile.lng, gpsCoords, lang]);

  // ── Fetch Market ──
  useEffect(() => {
    let active = true;
    const fetchMarket = async () => {
      setMarket(prev => ({ ...prev, loading: true }));

      const cached = await getCachedMarket();
      if (cached && active) {
        setMarket({ ...cached, loading: false });
      }

      let host = window.location.hostname || 'localhost';
      if (host === 'localhost') host = '127.0.0.1';
      const district = profile.district || 'Hassan';
      
      let crop = profile.crop || 'Tomato';
      if (profile.majorCrops && profile.majorCrops.length > 0) {
        if (crop === 'Tomato') {
          const topCrop = profile.majorCrops[0];
          crop = topCrop.charAt(0).toUpperCase() + topCrop.slice(1);
        }
      }

      let headers = {};
      if (gpsCoords && gpsCoords.latitude && gpsCoords.longitude) {
        headers['X-Latitude'] = String(gpsCoords.latitude);
        headers['X-Longitude'] = String(gpsCoords.longitude);
      }
      try {
        const res = await fetch(`http://${host}:5000/api/market/prices?commodity=${crop}&district=${district}&country=${profile.country || 'India'}`, {
          headers
        });
        const result = await res.json();
        if (active && result.success && result.data.length > 0) {
          const item = result.data[0];
          const m = {
            price: `₹${item.price.toLocaleString('en-IN')}/q`,
            trend: `${item.trend} this week`,
          };
          setMarket({ ...m, loading: false });
          cacheMarket(m);
        } else if (active && !cached) {
          setMarket({ price: '₹1,850/q', trend: '+5% this week', loading: false });
        }
      } catch {
        if (active && !cached) {
          setMarket({ price: '₹1,850/q', trend: '+5% this week', loading: false });
        }
      }
    };
    fetchMarket();
    return () => { active = false; };
  }, [profile.crop, profile.district, profile.country, profile.lat, profile.lng, gpsCoords]);

  // ── Submit a query ──
  const handleQuery = async ({ query, mode, attachedFile }) => {
    // Add user entry to thread
    const userEntry = {
      query,
      mode,
      image: attachedFile ? URL.createObjectURL(attachedFile) : null,
      imageFile: attachedFile,
      answer: null,
      loading: true,
    };
    const newThread = [...thread, userEntry];
    setThread(newThread);
    setView('thread');
    setIsLoading(true);

    try {
      const response = await submitQuery({
        mode,
        query,
        attachedFile,
        userProfile: { ...profile, preferredLanguage: lang },
      });

      // Generate related questions from the response
      const relatedQuestions = generateRelated(query, response);

      const completedEntry = {
        ...userEntry,
        loading: false,
        answer: response.answer || "I couldn't process that. Please try again.",
        intent: response.intent || response.disease || response.recommended_crop ? 
          (response.intent || (response.disease ? 'disease_detection' : 'crop_recommendation')) : null,
        sources: response.sources || [],
        disease: response.disease,
        confidence: response.confidence ? Math.round(response.confidence * 100) : null,
        recommended_crop: response.recommended_crop,
        confidence_score: response.confidence_score,
        relatedQuestions,
        offline: response.offline || false,
        location: response.location || null,
      };

      setThread(prev => prev.map((e, i) => i === prev.length - 1 ? completedEntry : e));
    } catch (err) {
      setThread(prev => prev.map((e, i) => 
        i === prev.length - 1 
          ? { ...e, loading: false, answer: 'An error occurred. Please try again.', error: true }
          : e
      ));
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditQuery = async (index, newQuery) => {
    const originalEntry = thread[index];
    const truncatedThread = thread.slice(0, index);
    const userEntry = {
      query: newQuery,
      mode: originalEntry.imageFile ? 'image' : 'text',
      image: originalEntry.image,
      imageFile: originalEntry.imageFile,
      answer: null,
      loading: true,
    };
    const newThread = [...truncatedThread, userEntry];
    setThread(newThread);
    setIsLoading(true);

    try {
      const response = await submitQuery({
        mode: originalEntry.imageFile ? 'image' : 'text',
        query: newQuery,
        attachedFile: originalEntry.imageFile,
        userProfile: { ...profile, preferredLanguage: lang },
      });

      const relatedQuestions = generateRelated(newQuery, response);

      const completedEntry = {
        ...userEntry,
        loading: false,
        answer: response.answer || "I couldn't process that. Please try again.",
        intent: response.intent || response.disease || response.recommended_crop ? 
          (response.intent || (response.disease ? 'disease_detection' : 'crop_recommendation')) : null,
        sources: response.sources || [],
        disease: response.disease,
        confidence: response.confidence ? Math.round(response.confidence * 100) : null,
        recommended_crop: response.recommended_crop,
        confidence_score: response.confidence_score,
        relatedQuestions,
        offline: response.offline || false,
        location: response.location || null,
      };

      setThread(prev => prev.map((e, i) => i === index ? completedEntry : e));
    } catch (err) {
      setThread(prev => prev.map((e, i) => 
        i === index 
          ? { ...e, loading: false, answer: 'An error occurred. Please try again.', error: true }
          : e
      ));
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewThread = () => {
    setThread([]);
    setView('home');
    setHomeQuery('');
  };

  const handleChipClick = (chipQuery) => {
    setHomeQuery(chipQuery);
  };

  return (
    <div className="h-screen flex bg-bg overflow-hidden">
      {/* Geolocation Overlay */}
      {locStatus.status !== 'active' && (
        <LocationOverlay
          status={locStatus.status}
          error={locStatus.error}
          lang={lang}
          onRetry={retryLocationTracking}
          onLangChange={setLang}
        />
      )}

      {/* Sidebar Navigation */}
      <Sidebar
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        lang={lang}
        onLangChange={setLang}
        isOnline={isOnline}
        onNewThread={handleNewThread}
        onOpenSettings={() => setIsSettingsOpen(true)}
        activeNav={activeNav}
        onNavChange={setActiveNav}
        profile={profile}
      />

      {/* Main Layout Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <TopBar
          onMenuToggle={() => setIsMenuOpen(true)}
          isOnline={isOnline}
          threadCount={thread.length}
        />

        <main className="flex-1 overflow-y-auto bg-bg">
          {activeNav === 'calendar' ? (
            /* ── CROP CALENDAR DIRECT TAB ── */
            <div className="max-w-4xl mx-auto px-4 py-8">
              <h2 className="text-xl font-bold text-text-primary mb-1">📅 Growth Calendar</h2>
              <p className="text-xs text-text-tertiary mb-6">Monitor crop lifecycle stages and receive tailored agronomic advice.</p>
              <CropCalendar
                crop={profile.crop || ''}
                profile={profile}
                onUpdateProfile={setProfile}
                lang={lang}
              />
            </div>
          ) : (
            /* ── CHAT ENGINE TAB ── */
            view === 'home' ? (
              /* ── HOME VIEW ── */
              <div className="flex flex-col items-center justify-center min-h-full px-4 py-12 max-w-4xl mx-auto">
                {/* Logo & Title */}
                <div className="flex flex-col items-center mb-8 fade-in text-center">
                  <div className="w-12 h-12 rounded-2xl bg-accent-muted flex items-center justify-center mb-4">
                    <Sprout size={24} className="text-accent" />
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-text-primary tracking-tight mb-2">
                    {translate(lang, 'home_title')}
                  </h1>
                  <p className="text-sm text-text-tertiary max-w-lg leading-relaxed">
                    {translate(lang, 'home_subtitle')}
                  </p>
                </div>

                {/* Search Bar */}
                <div className="w-full mb-8 slide-up">
                  <SearchBar
                    onSubmit={handleQuery}
                    lang={lang}
                    isLoading={isLoading}
                    value={homeQuery}
                    onChange={setHomeQuery}
                    geocodedLocation={geocodedLocation}
                  />
                </div>

                {/* Suggestion Chips */}
                <div className="flex flex-wrap justify-center gap-2 mb-10 max-w-2xl slide-up" style={{ animationDelay: '0.1s' }}>
                  {SUGGESTION_CHIPS.map((chip) => (
                    <button
                      key={chip.key}
                      onClick={() => handleChipClick(chip.query)}
                      className="text-xs text-text-secondary bg-bg-elevated border border-border-subtle rounded-xl px-3.5 py-2 hover:bg-bg-hover hover:border-border hover:text-text-primary transition-all"
                    >
                      {translate(lang, chip.key)}
                    </button>
                  ))}
                </div>

                {/* Info Cards */}
                <div className="w-full slide-up" style={{ animationDelay: '0.15s' }}>
                  <InfoCards
                    profile={profile}
                    lang={lang}
                    weather={weather}
                    market={market}
                    geocodedLocation={geocodedLocation}
                  />
                </div>

                {/* Footer */}
                <div className="mt-16 pt-8 text-center border-t border-border-subtle w-full max-w-2xl">
                  <p className="text-[11px] text-text-tertiary">
                    KrishiMitraAI · Offline-First AI · {profile.district}, {profile.state}
                  </p>
                </div>
              </div>
            ) : (
              /* ── THREAD VIEW ── */
              <div className="py-4">
                <ThreadView
                  thread={thread}
                  lang={lang}
                  onFollowUp={handleQuery}
                  onEditQuery={handleEditQuery}
                  isLoading={isLoading}
                />
              </div>
            )
          )}
        </main>
      </div>

      {/* Settings Panel */}
      {isSettingsOpen && (
        <SettingsPanel
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          profile={profile}
          onSave={setProfile}
          lang={lang}
        />
      )}
    </div>
  );
}

/* ── Generate related follow-up questions based on the query context ── */
function generateRelated(query, response) {
  const q = query.toLowerCase();
  
  if (q.includes('disease') || q.includes('blight') || q.includes('leaf') || q.includes('rot') || response.disease) {
    return [
      'What organic treatments are available?',
      'How to prevent this disease next season?',
      'Which resistant varieties should I plant?',
    ];
  }
  if (q.includes('price') || q.includes('mandi') || q.includes('apmc') || q.includes('market')) {
    return [
      'Which nearby mandi has the best price today?',
      'What is the price trend for this month?',
      'When is the best time to sell?',
    ];
  }
  if (q.includes('soil') || q.includes('n=') || q.includes('crop recommend') || response.recommended_crop) {
    return [
      'What fertilizers should I apply?',
      'How to improve soil organic content?',
      'Which crop rotation works best?',
    ];
  }
  if (q.includes('scheme') || q.includes('subsidy') || q.includes('government')) {
    return [
      'How to apply for PM-KISAN?',
      'What documents are needed for crop insurance?',
      'Drip irrigation subsidy details?',
    ];
  }
  return [
    'Tell me about pest management',
    'What are current weather advisories?',
    'Best farming practices for monsoon',
  ];
}

export default App;
