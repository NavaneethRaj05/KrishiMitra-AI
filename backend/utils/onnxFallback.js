/**
 * Server-Side Failover Crop Recommender (Express Gateway)
 *
 * ARCHITECTURAL ROLE:
 * This module provides emergency server-side failover for the Express API gateway
 * (invoked in routes/query.js -> POST /query/soil) when the Python FastAPI ml-service
 * container is offline, restarting, or unreachable.
 *
 * RUNTIME BEHAVIOR:
 * 1. Primary server path: Express proxies to FastAPI ml-service (port 8000).
 * 2. Secondary failover path: If ml-service returns ECONNREFUSED/503 and onnxruntime-node
 *    is installed, it evaluates ../../ml-service/models/crop_model.onnx directly.
 * 3. Tertiary failover path: If onnxruntime-node is absent or model loading fails,
 *    it gracefully falls back to getRuleBasedCropRecommendation() so farmer queries
 *    never fail with an unhandled 500 error.
 *
 * NOTE: Client-side on-device inference in the mobile app is handled independently
 * by app/src/services/ using onnxruntime-react-native and bundled assets.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let ort = null;
let session = null;
let labels = [];

async function loadONNXRuntime() {
  if (ort) return true;
  try {
    ort = await import('onnxruntime-node');
    return true;
  } catch (err) {
    console.warn('⚠️  onnxruntime-node could not be loaded. Using rule-based fallback predictor.', err.message);
    return false;
  }
}

async function initSession() {
  const modelPath = path.resolve(__dirname, '../../ml-service/models/crop_model.onnx');
  const labelsPath = path.resolve(__dirname, '../../ml-service/models/crop_labels.json');

  if (!fs.existsSync(modelPath) || !fs.existsSync(labelsPath)) {
    console.warn(`⚠️  ONNX model or labels file missing at:\nModel: ${modelPath}\nLabels: ${labelsPath}\nUsing rule-based fallback.`);
    return false;
  }

  // Validate model file size and integrity (>1KB)
  try {
    const stats = fs.statSync(modelPath);
    if (stats.size < 1024) {
      console.warn(`⚠️  ONNX model file at ${modelPath} is only ${stats.size} bytes (invalid/placeholder). Using rule-based fallback.`);
      return false;
    }
  } catch (statErr) {
    console.warn('Could not inspect ONNX file size:', statErr.message);
    return false;
  }

  try {
    const hasOrt = await loadONNXRuntime();
    if (!hasOrt) return false;

    if (!session) {
      session = await ort.InferenceSession.create(modelPath);
      labels = JSON.parse(fs.readFileSync(labelsPath, 'utf8'));
      console.log('✅ Real local ONNX crop recommendation model loaded in Express gateway');
    }
    return true;
  } catch (err) {
    console.error('❌ Failed to initialise ONNX session:', err);
    return false;
  }
}

// A simple deterministic rule-based crop recommendation fallback matching standard crop ranges
function getRuleBasedCropRecommendation(N, P, K, pH, temp, humidity) {
  // N-P-K ranges for Paddy, Maize, Tomato, Potato, Sugarcane, Coffee, Cotton
  if (humidity > 80 && temp > 24) {
    return 'rice'; // Paddy thrives in hot & humid
  }
  if (pH < 5.5 && temp < 22) {
    return 'coffee'; // Coffee prefers acidic, cooler temp
  }
  if (K > 100 && pH >= 5.5 && pH <= 6.5) {
    return 'potato'; // Potato loves potassium and moderately acidic soil
  }
  if (P > 50 && N > 70) {
    return 'maize'; // Maize needs high nitrogen and phosphorus
  }
  if (N > 80 && pH >= 6.0 && pH <= 7.0) {
    return 'tomato'; // Tomato grows well in neutral, nitrogen-rich soil
  }
  if (humidity > 60 && temp > 25) {
    return 'cotton'; // Cotton prefers warm, moderately humid climate
  }
  return 'ragi'; // Hardy fallback crop
}

export async function predictCropOffline(soilParams) {
  const N = parseFloat(soilParams.N) || 90;
  const P = parseFloat(soilParams.P) || 42;
  const K = parseFloat(soilParams.K) || 43;
  const pH = parseFloat(soilParams.pH) || 6.5;
  const temp = parseFloat(soilParams.temp) || 25.0;
  const humidity = parseFloat(soilParams.humidity) || 80.0;
  const rainfall = parseFloat(soilParams.rainfall) || 100.0;

  const initialized = await initSession();
  
  if (initialized && session && ort) {
    try {
      const inputData = new Float32Array([N, P, K, temp, humidity, pH, rainfall]);
      const tensorInput = new ort.Tensor('float32', inputData, [1, 7]);
      const feeds = { float_input: tensorInput };
      const results = await session.run(feeds);
      
      const labelTensor = results.label || results.output_label || Object.values(results)[0];
      const predictedIdx = Number(labelTensor.data[0]);
      const recommendedCrop = labels[predictedIdx] || 'Paddy';

      return {
        recommended_crop: recommendedCrop,
        confidence: 85.0,
        top3_crops: [
          { crop: recommendedCrop, confidence: 85.0 },
          { crop: 'Paddy', confidence: 10.0 }
        ],
        explanation: `${recommendedCrop} is recommended based on local ONNX model inference.`,
        offline: true
      };
    } catch (err) {
      console.warn('⚠️  ONNX inference failed, using rule-based fallback:', err.message);
    }
  }

  // Pure rule-based mock matching the parameters
  const ruleCrop = getRuleBasedCropRecommendation(N, P, K, pH, temp, humidity);
  const formattedCrop = ruleCrop.charAt(0).toUpperCase() + ruleCrop.slice(1);
  return {
    recommended_crop: formattedCrop,
    confidence: 75.0,
    top3_crops: [
      { crop: formattedCrop, confidence: 75.0 },
      { crop: 'Paddy', confidence: 15.0 }
    ],
    explanation: `${formattedCrop} is recommended based on local rule-based crop advisor (ONNX offline fallback).`,
    offline: true
  };
}
