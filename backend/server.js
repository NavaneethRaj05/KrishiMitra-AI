import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';

dotenv.config();

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
const app  = express();
const PORT = process.env.PORT || 5000;

// ── Security ──
app.use(helmet());

// Secure CORS configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : [];
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
    if (origin.includes('localhost') || origin.includes('127.0.0.1') || origin.includes('192.168.') || origin.includes('exp://') || origin.includes('expo')) {
      return callback(null, true);
    }
    
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 500 }));

// ── Body parsing ──
app.use(express.json({ limit: '15mb' }));  // allow image uploads as base64

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
        <title>KrishiMind API Gateway</title>
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
        <a class="btn" href="http://localhost:8081" target="_blank">Open KrishiMitraAI Web App</a>
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
  app.listen(PORT, '0.0.0.0', () => logger.info(`🌾 KrishiMitraAI API on port ${PORT}`));
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
