import { cacheQueryResponse, getCachedQuery, searchCachedQueries, queueRequest } from '../utils/offlineStore';
import { getLocationHeaders, getLocationBody } from '../utils/gpsLocation';

const getApiBase = () => {
  if (typeof window !== 'undefined' && window.location) {
    let host = window.location.hostname;
    if (host === 'localhost') host = '127.0.0.1';
    return `http://${host}:5000/api`;
  }
  return 'http://127.0.0.1:5000/api';
};
const API_BASE = getApiBase();
const API_TIMEOUT = 30000;

export async function submitQuery({ mode, query, attachedFile, userProfile }) {
  let token = localStorage.getItem('token');
  if (!token || token === 'undefined' || token === 'null') {
    token = 'demo_token';
  }

  const headers = { 
    Authorization: `Bearer ${token}`
  };

  if (userProfile) {
    const jsonStr = JSON.stringify(userProfile);
    headers['x-user-profile'] = btoa(unescape(encodeURIComponent(jsonStr)));
  }

  // Always attach GPS coordinates
  const locationHeaders = getLocationHeaders();
  Object.assign(headers, locationHeaders);
  const locationBody = getLocationBody();

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

  try {
    let response;

    if (mode === 'image' && attachedFile) {
      const formData = new FormData();
      formData.append('leaf', attachedFile);
      if (query) {
        formData.append('query', query);
      }
      // GPS coordinates are in headers for image uploads
      const res = await fetch(`${API_BASE}/query/image`, { 
        method: 'POST', headers, body: formData, signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        return { answer: errorData.answer || 'Failed to process image. Please try again.', error: true };
      }
      response = await res.json();

    } else if (mode === 'soil') {
      const params = parseSoilFromText(query);
      const res = await fetch(`${API_BASE}/query/soil`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...params, ...locationBody }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        return { answer: errorData.answer || 'Failed to process soil data. Please try again.', error: true };
      }
      response = await res.json();

    } else {
      const res = await fetch(`${API_BASE}/query/text`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, ...locationBody }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        return { answer: errorData.answer || 'Failed to get response. Please try again.', error: true };
      }
      response = await res.json();
    }

    // Cache successful text/soil responses for offline use
    if (query && mode !== 'image') {
      cacheQueryResponse(query, response).catch(() => {});
    }

    return response;

  } catch (err) {
    clearTimeout(timeoutId);
    
    // ── OFFLINE FALLBACK ──
    if (err.name === 'AbortError' || !navigator.onLine) {
      console.log('[Offline] Trying cached responses...');
      
      // 1. Try exact match
      const cached = await getCachedQuery(query);
      if (cached) {
        return { ...cached, offline: true };
      }

      // 2. Try fuzzy match
      const similar = await searchCachedQueries(query);
      if (similar) {
        return { ...similar, offline: true, note: 'Showing a similar cached response.' };
      }

      // 3. Queue for later sync
      await queueRequest({ mode, query, timestamp: Date.now() });

      if (err.name === 'AbortError') {
        return { 
          answer: 'Request timed out. The ML service may be loading. Your question has been queued and will be answered when connection is restored.', 
          error: true, offline: true 
        };
      }
      return { 
        answer: 'You are currently offline. Your question has been saved and will be processed when connectivity returns. Previously answered questions are available from cache.', 
        error: true, offline: true 
      };
    }

    console.error('Query submission error:', err);
    return { answer: 'Network error. Please check your connection and try again.', error: true };
  }
}

function parseSoilFromText(text) {
  return {
    N:    parseFloat(text.match(/N\s*=\s*([\d.]+)/i)?.[1] || 90),
    P:    parseFloat(text.match(/P\s*=\s*([\d.]+)/i)?.[1] || 42),
    K:    parseFloat(text.match(/K\s*=\s*([\d.]+)/i)?.[1] || 43),
    pH:   parseFloat(text.match(/pH\s*=\s*([\d.]+)/i)?.[1] || 6.5),
    temp: parseFloat(text.match(/temp\s*=\s*([\d.]+)/i)?.[1] || 25),
    humidity: parseFloat(text.match(/hum\s*=\s*([\d.]+)/i)?.[1] || 80),
  };
}

export async function transcribeVoice(audioBlob, language = null) {
  let token = localStorage.getItem('token') || 'demo_token';
  const headers = { 
    Authorization: `Bearer ${token}`
  };
  
  const formData = new FormData();
  formData.append('file', audioBlob, 'speech.webm');
  if (language) {
    formData.append('language', language);
  }

  const res = await fetch(`${API_BASE}/query/transcribe`, {
    method: 'POST',
    headers,
    body: formData
  });

  if (!res.ok) {
    throw new Error('Transcription failed');
  }
  return res.json();
}

export async function synthesizeSpeech(text, language = 'en') {
  let token = localStorage.getItem('token') || 'demo_token';
  const headers = { 
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  const res = await fetch(`${API_BASE}/query/tts`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ text, language })
  });

  if (!res.ok) {
    throw new Error('TTS synthesis failed');
  }
  return res.json();
}

export async function fetchMarketForecast(commodity, district) {
  let token = localStorage.getItem('token') || 'demo_token';
  const headers = { 
    Authorization: `Bearer ${token}`
  };

  const res = await fetch(`${API_BASE}/market/forecast?commodity=${commodity}&district=${district}`, {
    method: 'GET',
    headers
  });

  if (!res.ok) {
    throw new Error('Forecast fetch failed');
  }
  return res.json();
}

export async function reverseGeocode(lat, lon) {
  let token = localStorage.getItem('token') || 'demo_token';
  const headers = { 
    Authorization: `Bearer ${token}`
  };

  const res = await fetch(`${API_BASE}/location/reverse?lat=${lat}&lon=${lon}`, {
    method: 'GET',
    headers
  });

  if (!res.ok) {
    throw new Error('Reverse geocode failed');
  }
  return res.json();
}

export async function fetchLocationDetails(district) {
  let token = localStorage.getItem('token') || 'demo_token';
  const headers = { 
    Authorization: `Bearer ${token}`
  };

  const res = await fetch(`${API_BASE}/location/details?district=${encodeURIComponent(district)}`, {
    method: 'GET',
    headers
  });

  if (!res.ok) {
    throw new Error('Location details fetch failed');
  }
  return res.json();
}
