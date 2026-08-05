const DB_NAME = 'krishimitraai_offline';
const DB_VERSION = 1;

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('cache')) {
        const store = db.createObjectStore('cache', { keyPath: 'key' });
        store.createIndex('type', 'type', { unique: false });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
      if (!db.objectStoreNames.contains('threads')) {
        db.createObjectStore('threads', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('queue')) {
        db.createObjectStore('queue', { keyPath: 'id', autoIncrement: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/* ── Generic cache operations ── */
export async function cacheSet(key, value, type = 'general', ttlMs = 3600000) {
  try {
    const db = await openDB();
    const tx = db.transaction('cache', 'readwrite');
    tx.objectStore('cache').put({
      key,
      value,
      type,
      timestamp: Date.now(),
      expires: Date.now() + ttlMs,
    });
    await new Promise((res, rej) => { tx.oncomplete = res; tx.onerror = rej; });
  } catch (e) {
    console.warn('cacheSet failed:', e);
  }
}

export async function cacheGet(key) {
  try {
    const db = await openDB();
    const tx = db.transaction('cache', 'readonly');
    const req = tx.objectStore('cache').get(key);
    return new Promise((res) => {
      req.onsuccess = () => {
        const item = req.result;
        if (!item) return res(null);
        if (item.expires && Date.now() > item.expires) return res(null);
        res(item.value);
      };
      req.onerror = () => res(null);
    });
  } catch {
    return null;
  }
}

/* ── Query response caching ── */
export async function cacheQueryResponse(query, response) {
  const key = `query:${query.toLowerCase().trim()}`;
  await cacheSet(key, response, 'query', 86400000 * 7); // 7 day TTL
}

export async function getCachedQuery(query) {
  const key = `query:${query.toLowerCase().trim()}`;
  return cacheGet(key);
}

/* ── Search cached queries for similar ones ── */
export async function searchCachedQueries(query) {
  try {
    const db = await openDB();
    const tx = db.transaction('cache', 'readonly');
    const store = tx.objectStore('cache');
    const index = store.index('type');
    const req = index.getAll('query');
    
    return new Promise((res) => {
      req.onsuccess = () => {
        const items = req.result || [];
        const words = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
        
        // Score each cached query by word overlap
        const scored = items
          .filter(item => item.expires > Date.now())
          .map(item => {
            const cachedWords = item.key.replace('query:', '').split(/\s+/);
            const overlap = words.filter(w => cachedWords.some(cw => cw.includes(w))).length;
            return { ...item, score: overlap / Math.max(words.length, 1) };
          })
          .filter(item => item.score > 0.3)
          .sort((a, b) => b.score - a.score);

        res(scored.length > 0 ? scored[0].value : null);
      };
      req.onerror = () => res(null);
    });
  } catch {
    return null;
  }
}

/* ── Thread persistence ── */
export async function saveThread(id, thread) {
  try {
    const db = await openDB();
    const tx = db.transaction('threads', 'readwrite');
    tx.objectStore('threads').put({ id, thread, updatedAt: Date.now() });
  } catch (e) {
    console.warn('saveThread failed:', e);
  }
}

export async function getThread(id) {
  try {
    const db = await openDB();
    const tx = db.transaction('threads', 'readonly');
    const req = tx.objectStore('threads').get(id);
    return new Promise((res) => {
      req.onsuccess = () => res(req.result?.thread || null);
      req.onerror = () => res(null);
    });
  } catch {
    return null;
  }
}

/* ── Weather/Market data caching ── */
export async function cacheWeather(data) {
  await cacheSet('weather_data', data, 'weather', 1800000); // 30 min TTL
}

export async function getCachedWeather() {
  return cacheGet('weather_data');
}

/**
 * Market cache uses a composite key so changing crop or district correctly
 * invalidates the previous entry rather than serving stale data.
 */
export async function cacheMarket(data, crop = 'general', district = 'local') {
  const key = `market_${crop.toLowerCase()}_${district.toLowerCase()}`;
  await cacheSet(key, data, 'market', 3600000); // 1 hour TTL
}

export async function getCachedMarket(crop = 'general', district = 'local') {
  const key = `market_${crop.toLowerCase()}_${district.toLowerCase()}`;
  return cacheGet(key);
}

/* ── Multi-Thread conversation history ── */

/**
 * Save a thread by unique ID. Pass a short preview string (first user message).
 */
export async function saveThread(id, thread) {
  try {
    const db = await openDB();
    const tx = db.transaction('threads', 'readwrite');
    const preview = thread.length > 0 ? (thread[0].query || '').slice(0, 60) : '';
    tx.objectStore('threads').put({ id, thread, preview, updatedAt: Date.now() });
    await new Promise((res, rej) => { tx.oncomplete = res; tx.onerror = rej; });
  } catch (e) {
    console.warn('saveThread failed:', e);
  }
}

export async function getThread(id) {
  try {
    const db = await openDB();
    const tx = db.transaction('threads', 'readonly');
    const req = tx.objectStore('threads').get(id);
    return new Promise((res) => {
      req.onsuccess = () => res(req.result?.thread || null);
      req.onerror = () => res(null);
    });
  } catch {
    return null;
  }
}

/**
 * List all saved threads sorted by most recently updated.
 * Returns: [{id, preview, updatedAt}]
 */
export async function listThreads() {
  try {
    const db = await openDB();
    const tx = db.transaction('threads', 'readonly');
    const req = tx.objectStore('threads').getAll();
    return new Promise((res) => {
      req.onsuccess = () => {
        const all = (req.result || [])
          .filter(t => t.id !== 'active_thread') // exclude the live working thread
          .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
        res(all.map(t => ({ id: t.id, preview: t.preview || '(empty)', updatedAt: t.updatedAt })));
      };
      req.onerror = () => res([]);
    });
  } catch {
    return [];
  }
}

/**
 * Delete a saved thread by ID.
 */
export async function deleteThread(id) {
  try {
    const db = await openDB();
    const tx = db.transaction('threads', 'readwrite');
    tx.objectStore('threads').delete(id);
    await new Promise((res, rej) => { tx.oncomplete = res; tx.onerror = rej; });
  } catch (e) {
    console.warn('deleteThread failed:', e);
  }
}

/* ── Request queue for offline sync ── */
export async function queueRequest(request) {
  try {
    const db = await openDB();
    const tx = db.transaction('queue', 'readwrite');
    tx.objectStore('queue').add({ ...request, createdAt: Date.now() });
  } catch (e) {
    console.warn('queueRequest failed:', e);
  }
}

export async function getQueuedRequests() {
  try {
    const db = await openDB();
    const tx = db.transaction('queue', 'readonly');
    const req = tx.objectStore('queue').getAll();
    return new Promise((res) => {
      req.onsuccess = () => res(req.result || []);
      req.onerror = () => res([]);
    });
  } catch {
    return [];
  }
}

export async function clearQueue() {
  try {
    const db = await openDB();
    const tx = db.transaction('queue', 'readwrite');
    tx.objectStore('queue').clear();
  } catch (e) {
    console.warn('clearQueue failed:', e);
  }
}
