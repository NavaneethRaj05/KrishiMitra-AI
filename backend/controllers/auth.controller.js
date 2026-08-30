import jwt from 'jsonwebtoken';
import Farmer from '../models/Farmer.model.js';
import { config } from '../config/env.js';

const signToken = (id) =>
  jwt.sign({ id }, config.JWT_SECRET, { expiresIn: '90d' });

// ── Demo Mode Guard ──
// DEMO_MODE=true enables bypass OTP for local development ONLY.
// It MUST be disabled in any staging/production deployment.
const DEMO_MODE = process.env.DEMO_MODE === 'true';
if (DEMO_MODE) {
  console.warn('\n⚠️  [SECURITY WARNING] DEMO_MODE=true is enabled — OTP bypass is active. NEVER deploy with this setting.\n');
}

// Simple in-memory cache fallback for OTPs
const otpMemoryCache = new Map();

// Helper to generate a 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export const register = async (req, res, next) => {
  try {
    const { name, phone, password, location, language } = req.body;
    const farmer = await Farmer.create({ name, phone, password, location, language });
    const token  = signToken(farmer._id);
    res.status(201).json({ success: true, data: { farmer, token } });
  } catch (err) {
    next(err);
  }
};

export const login = async (req, res, next) => {
  try {
    const { phone, password } = req.body;
    if (!phone || !password) {
      return res.status(400).json({ success: false, error: 'Phone and password required' });
    }

    const farmer = await Farmer.findOne({ phone }).select('+password');
    if (!farmer || !(await farmer.comparePassword(password))) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    const token = signToken(farmer._id);
    res.json({ success: true, data: { farmer, token } });
  } catch (err) {
    next(err);
  }
};

export const getMe = async (req, res, next) => {
  try {
    const farmer = await Farmer.findById(req.farmer.id);
    res.json({ success: true, data: farmer });
  } catch (err) {
    next(err);
  }
};

export const sendOTP = async (req, res, next) => {
  try {
    const { phone } = req.body;
    if (!phone) {
      return res.status(400).json({ success: false, error: 'Phone number required' });
    }
    const otp = generateOTP();

    // Store in memory cache with 10-minute expiration
    otpMemoryCache.set(phone, {
      otp,
      expiresAt: Date.now() + 10 * 60 * 1000
    });

    // Attempt to store in Redis if redis URL is set and redis is somehow available
    try {
      if (process.env.REDIS_URL) {
        const redisModule = await import('redis');
        const redis = redisModule.createClient({ url: process.env.REDIS_URL });
        await redis.connect();
        await redis.set(`otp:${phone}`, otp, { EX: 600 });
        await redis.quit();
      }
    } catch (redisError) {
      // Quietly swallow redis connect/store errors and rely on memory cache
    }

    // Mock/call Gupshup SMS. Since Gupshup is not configured in local environment, we print to console.
    console.log(`\n==========================================`);
    console.log(`[SMS OTP Notification]`);
    console.log(`To: ${phone}`);
    console.log(`OTP: ${otp}`);
    console.log(`Valid for 10 minutes.`);
    console.log(`==========================================\n`);

    res.json({ success: true, message: `OTP sent successfully to ${phone}` });
  } catch (err) {
    next(err);
  }
};

export const verifyOTP = async (req, res, next) => {
  try {
    const { phone, otp } = req.body;
    if (!phone || !otp) {
      return res.status(400).json({ success: false, error: 'Phone and OTP required' });
    }

    let isValid = false;

    // Check memory cache first
    const cached = otpMemoryCache.get(phone);
    if (cached && cached.otp === otp && cached.expiresAt > Date.now()) {
      isValid = true;
      otpMemoryCache.delete(phone); // clean up
    }

    // Check redis fallback if needed
    if (!isValid) {
      try {
        if (process.env.REDIS_URL) {
          const redisModule = await import('redis');
          const redis = redisModule.createClient({ url: process.env.REDIS_URL });
          await redis.connect();
          const stored = await redis.get(`otp:${phone}`);
          if (stored === otp) {
            isValid = true;
            await redis.del(`otp:${phone}`);
          }
          await redis.quit();
        }
      } catch (e) {}
    }

    // Support a dev/demo bypass OTP only when DEMO_MODE=true in environment
    // This must never be enabled in production
    if (DEMO_MODE && otp === (process.env.DEMO_OTP || '000000')) {
      isValid = true;
    }

    if (!isValid) {
      return res.status(400).json({ success: false, error: 'Invalid or expired OTP' });
    }

    let farmer = await Farmer.findOne({ phone });
    let isNewUser = false;
    if (!farmer) {
      // Create farmer with dummy values for required fields.
      // Setup screen will capture actual values.
      isNewUser = true;
      farmer = await Farmer.create({
        phone,
        name: 'New Farmer',
        password: Math.random().toString(36).slice(-8), // satisfies password requirement
      });
    }

    const token = signToken(farmer._id);
    res.json({ success: true, token, farmer, isNewUser });
  } catch (err) {
    next(err);
  }
};

export const biometricVerify = async (req, res, next) => {
  try {
    // Just validate token and return farmer details
    const farmer = await Farmer.findById(req.farmer.id);
    if (!farmer) {
      return res.status(404).json({ success: false, error: 'Farmer not found' });
    }
    res.json({ valid: true, farmer });
  } catch (err) {
    next(err);
  }
};
