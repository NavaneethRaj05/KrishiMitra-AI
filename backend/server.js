import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';

import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import authRoutes   from './routes/auth.routes.js';
import farmerRoutes from './routes/farmer.routes.js';
import cropRoutes   from './routes/crop.routes.js';
import syncRoutes   from './routes/sync.routes.js';
import marketRoutes from './routes/market.routes.js';
import collectionRoutes from './routes/collection.routes.js';
import smsRoutes from './routes/sms.routes.js';
import searchRoutes from './routes/search.routes.js';
import queryRoutes from './routes/query.js';
import errorHandler from './middleware/errorHandler.js';
import { logger } from './utils/logger.js';

// Validate required environment variables on startup
const requiredEnvVars = ['JWT_SECRET', 'MONGODB_URI'];
requiredEnvVars.forEach((envVar) => {
  const val = process.env[envVar];
  if (!val) {
    logger.error(`❌ CRITICAL: Environment variable ${envVar} is missing!`);
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  } else if (val.includes('your_') || val.includes('placeholder') || val === 'your_jwt_secret_here') {
    logger.warn(`⚠️ WARNING: Environment variable ${envVar} is using a default placeholder/insecure value: "${val}"`);
  }
});

const app  = express();
const PORT = process.env.PORT || 5000;

// ── Security ──
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://unpkg.com", "https://cdn.jsdelivr.net"],
      scriptSrcAttr: ["'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
      imgSrc: ["'self'", "data:", "blob:", "https:"],
      connectSrc: ["'self'", "http://localhost:*", "http://127.0.0.1:*", "ws://localhost:*", "ws://127.0.0.1:*", "https:"],
    },
  },
}));

// Secure CORS configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : [
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      'http://localhost:8081',   // Expo web dev
      'http://127.0.0.1:8081',
      'http://localhost:19006',  // Expo web legacy port
    ];
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc)
    if (!origin) return callback(null, true);
    
    // In production, restrict strictly to configured origins
    if (process.env.NODE_ENV === 'production') {
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error('Not allowed by CORS'));
    }
    
    // Development fallback
    if (origin.includes('localhost') || origin.includes('127.0.0.1') || origin.includes('192.168.') || origin.includes('10.') || origin.includes('172.') || origin.includes('exp://') || origin.includes('expo')) {
      return callback(null, true);
    }
    
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));
app.use(rateLimit({ windowMs: 1 * 60 * 1000, max: 100, standardHeaders: true, legacyHeaders: false }));

// ── Body parsing & Static Files ──
app.use(express.json({ limit: '15mb' }));  // allow image uploads as base64
app.use(express.static(path.join(__dirname, '../landing')));

// ── Routes ──
app.use('/api/auth',   authRoutes);
app.use('/api/farmer', farmerRoutes);
app.use('/api/crop',   cropRoutes);
app.use('/api/sync',   syncRoutes);
app.use('/api/market', marketRoutes);
app.use('/api/collections', collectionRoutes);
app.use('/api/sms', smsRoutes);
app.use('/api/search', searchRoutes);
app.use('/api', queryRoutes);


// ── Health check ──
app.get('/health', (_req, res) => res.json({
  status:     'ok',
  ml_service: process.env.ML_SERVICE_URL,
  timestamp:  new Date().toISOString(),
}));

app.get('/', (_req, res) => {
  res.send(`
    <html>
      <head>
        <title>KrishiMitra-AI API Gateway</title>
        <style>
          body { font-family: 'Segoe UI', sans-serif; text-align: center; padding: 50px; background-color: #f7f9fa; color: #2c3e50; }
          h1 { color: #27ae60; }
          .btn { display: inline-block; background: #27ae60; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin-top: 20px; font-weight: bold; }
          .btn:hover { background: #219653; }
        </style>
      </head>
      <body>
        <h1>🌾 KrishiMitraAI Express API Gateway is Running!</h1>
        <p>This is the gateway server proxying requests to MongoDB and the ML service.</p>
        <p>To access the farmer application user interface, please open:</p>
        <a class="btn" href="http://localhost:5173" target="_blank">Open KrishiMitraAI Web App</a>
      </body>
    </html>
  `);
});


// ── Error handler ──
app.use((err, req, res, next) => {
  if (err.code === 'LIMIT_FILE_SIZE' || err.status === 413) {
    return res.status(413).json({
      success: false,
      error: 'Payload Too Large — Leaf image must be under 10MB'
    });
  }
  next(err);
});
app.use(errorHandler);

// ── Start ──
// Start the server even if MongoDB is unavailable (demo mode)
const startServer = () => {
  app.listen(PORT, () => logger.info(`🌾 KrishiMitraAI API on port ${PORT}`));
};

mongoose
  .connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/krishimitraai', {
    serverSelectionTimeoutMS: 5000, // Don't wait forever for MongoDB
  })
  .then(() => {
    logger.info('✅ MongoDB connected');
    startServer();
  })
  .catch((err) => {
    logger.warn(`⚠️  MongoDB connection failed: ${err.message}`);
    logger.warn('⚠️  Starting server in DEMO MODE without MongoDB');
    startServer();
  });
