import dotenv from 'dotenv';
dotenv.config();

export const config = {
  PORT:           process.env.PORT           || 5000,
  MONGODB_URI:    process.env.MONGODB_URI    || 'mongodb://localhost:27017/krishimitraai',
  JWT_SECRET:     process.env.JWT_SECRET     || 'krishimitraai_dev_secret',
  ML_SERVICE_URL: (process.env.ML_SERVICE_URL || 'http://localhost:8000').replace(/\/+$/, ''),
  NODE_ENV:       process.env.NODE_ENV       || 'development',
};
