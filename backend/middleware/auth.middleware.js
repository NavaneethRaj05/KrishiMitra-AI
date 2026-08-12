import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';

export const protect = (req, res, next) => {
  const internalKey = req.headers['x-internal-key'];
  const expectedKey = process.env.INTERNAL_API_KEY || 'internal';
  if (internalKey && internalKey === expectedKey) {
    req.farmer = { id: req.body?.farmer_id || req.query?.farmer_id };
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Not authorised — no token' });
  }

  const token = authHeader.split(' ')[1];

  // Allow 'demo_token' for local development bypass
  if (token === 'demo_token') {
    // Use a valid 24-character hex string so Mongoose doesn't throw CastError
    req.farmer = { id: '000000000000000000000000', name: 'Demo Farmer' };
    return next();
  }

  try {
    const decoded = jwt.verify(token, config.JWT_SECRET);
    req.farmer    = decoded;
    next();
  } catch {
    res.status(401).json({ success: false, error: 'Token invalid or expired' });
  }
};

