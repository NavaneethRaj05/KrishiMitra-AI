import { Router } from 'express';
import multer from 'multer';
import axios from 'axios';
import { config } from '../config/env.js';
import { protect } from '../middleware/auth.middleware.js';
import { attachUserProfile } from '../middleware/attachUserProfile.js';
import { predictCropOffline } from '../utils/onnxFallback.js';

const router = Router();

// Configure multer with a 10MB size limit
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

// Helper to base64 encode user profile to header and forward GPS headers
const getHeadersWithProfile = (req) => {
  const headers = {};
  if (req.headers['x-user-profile']) {
    headers['x-user-profile'] = req.headers['x-user-profile'];
  } else {
    const profileB64 = Buffer.from(JSON.stringify(req.userProfile || {})).toString('base64');
    headers['x-user-profile'] = profileB64;
  }

  // Forward GPS coordinates headers
  const lat = req.headers['x-latitude'] || req.headers['X-Latitude'];
  const lon = req.headers['x-longitude'] || req.headers['X-Longitude'];
  if (lat) headers['X-Latitude'] = lat;
  if (lon) headers['X-Longitude'] = lon;

  return headers;
};

// Timeout for ML service calls (increased for model loading on first call)
const ML_TIMEOUT = 60000; // 60 seconds

// 1. Text Query Handler (KrishiSearch RAG + KAG)
router.post('/query/text', protect, attachUserProfile, async (req, res, next) => {
  try {
    const lang = req.body.language || req.headers['accept-language'] || req.userProfile?.preferredLanguage || 'en';
    if (req.userProfile) req.userProfile.preferredLanguage = lang;
    const response = await axios.post(
      `${config.ML_SERVICE_URL}/query/text`,
      { 
        query: req.body.query,
        image_b64: req.body.image_b64,
        language: lang,
        latitude: req.body.latitude,
        longitude: req.body.longitude
      },
      {
        headers: getHeadersWithProfile(req),
        timeout: ML_TIMEOUT
      }
    );
    res.json(response.data);
  } catch (err) {
    if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
      return res.status(503).json({
        success: false,
        answer: 'The ML service is currently starting up. Please try again in a moment.',
        error: 'ML service is not reachable'
      });
    }
    next(err);
  }
});

// 2. Image Diagnosis Handler (LLaVA diagnosis)
router.post('/query/image', protect, attachUserProfile, upload.single('leaf'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No leaf image file uploaded' });
    }

    const formData = new FormData();
    const fileBlob = new Blob([req.file.buffer], { type: req.file.mimetype });
    formData.append('file', fileBlob, req.file.originalname);
    if (req.body.query) {
      formData.append('query', req.body.query);
    }

    const response = await axios.post(
      `${config.ML_SERVICE_URL}/query/image`,
      formData,
      {
        headers: getHeadersWithProfile(req),
        timeout: ML_TIMEOUT
      }
    );
    res.json(response.data);
  } catch (err) {
    if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
      return res.status(503).json({
        success: false,
        answer: 'The ML service is currently starting up. Please try again in a moment.',
        error: 'ML service is not reachable'
      });
    }
    next(err);
  }
});

// 3. Soil Advisor Handler (XGBoost + SHAP)
router.post('/query/soil', protect, attachUserProfile, async (req, res, next) => {
  const soilParams = req.body.soilParams || req.body;
  try {
    const response = await axios.post(
      `${config.ML_SERVICE_URL}/query/soil`,
      soilParams,
      {
        headers: getHeadersWithProfile(req),
        timeout: ML_TIMEOUT
      }
    );
    res.json(response.data);
  } catch (err) {
    // Catch connection/timeout issues or 503/500 to invoke local ONNX fallback
    if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND' || !err.response || err.response.status >= 500) {
      console.warn('⚠️  FastAPI ML service unreachable. Falling back to local ONNX model in Express gateway.');
      try {
        const fallbackResult = await predictCropOffline(soilParams);
        return res.json(fallbackResult);
      } catch (fallbackErr) {
        return res.status(503).json({
          success: false,
          error: 'ML service offline and local fallback failed',
          details: fallbackErr.message
        });
      }
    }
    next(err);
  }
});

// 4. Voice NLP Handler (Whisper + spaCy NER)
router.post('/query/voice', protect, attachUserProfile, async (req, res, next) => {
  try {
    const response = await axios.post(
      `${config.ML_SERVICE_URL}/query/voice`,
      { 
        transcript: req.body.transcript,
        latitude: req.body.latitude,
        longitude: req.body.longitude
      },
      {
        headers: getHeadersWithProfile(req),
        timeout: ML_TIMEOUT
      }
    );
    res.json(response.data);
  } catch (err) {
    if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
      return res.status(503).json({
        success: false,
        answer: 'The ML service is currently starting up. Please try again in a moment.',
        error: 'ML service is not reachable'
      });
    }
    next(err);
  }
});

// 5. Voice Transcription Handler (audio file -> text transcript)
router.post('/query/transcribe', protect, upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No audio file uploaded' });
    }

    const formData = new FormData();
    const fileBlob = new Blob([req.file.buffer], { type: req.file.mimetype });
    formData.append('file', fileBlob, req.file.originalname);
    if (req.body.language) {
      formData.append('language', req.body.language);
    }

    const response = await axios.post(
      `${config.ML_SERVICE_URL}/voice/transcribe`,
      formData,
      {
        headers: {
          ...getHeadersWithProfile(req),
          'Content-Type': 'multipart/form-data'
        },
        timeout: ML_TIMEOUT
      }
    );
    res.json(response.data);
  } catch (err) {
    if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
      return res.status(503).json({
        success: false,
        error: 'ML service is not reachable'
      });
    }
    next(err);
  }
});

// 6. Text-To-Speech (TTS) Handler (text -> base64 audio)
router.post('/query/tts', protect, attachUserProfile, async (req, res, next) => {
  try {
    const response = await axios.post(
      `${config.ML_SERVICE_URL}/voice/tts`,
      req.body,
      {
        headers: getHeadersWithProfile(req),
        timeout: ML_TIMEOUT
      }
    );
    res.json(response.data);
  } catch (err) {
    if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
      return res.status(503).json({
        success: false,
        error: 'ML service is not reachable'
      });
    }
    next(err);
  }
});

// 7. Location Reverse Geocoding Handler (lat/lon -> district)
router.get('/location/reverse', protect, async (req, res, next) => {
  const { lat, lon } = req.query;
  try {
    const response = await axios.get(`${config.ML_SERVICE_URL}/search/location/reverse`, {
      params: { lat, lon },
      timeout: 10000
    });
    res.json(response.data);
  } catch (err) {
    if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
      return res.status(503).json({
        success: false,
        error: 'ML service is not reachable'
      });
    }
    next(err);
  }
});

// 8. Location Details Handler (district name -> details)
router.get('/location/details', protect, async (req, res, next) => {
  const { district } = req.query;
  try {
    const response = await axios.get(`${config.ML_SERVICE_URL}/search/location/details`, {
      params: { district },
      timeout: 10000
    });
    res.json(response.data);
  } catch (err) {
    if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
      return res.status(503).json({
        success: false,
        error: 'ML service is not reachable'
      });
    }
    next(err);
  }
});

// 9. Multilingual Vernacular Voice Analyzer (Gemini 3.6 Flash)
router.post('/query/voice-analyze', protect, attachUserProfile, async (req, res, next) => {
  try {
    const response = await axios.post(
      `${config.ML_SERVICE_URL}/voice/analyze`,
      req.body,
      {
        headers: getHeadersWithProfile(req),
        timeout: ML_TIMEOUT
      }
    );
    res.json(response.data);
  } catch (err) {
    if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
      return res.status(503).json({
        success: false,
        error: 'ML service is not reachable'
      });
    }
    next(err);
  }
});

export default router;
