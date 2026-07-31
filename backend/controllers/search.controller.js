import axios from 'axios';
import { config } from '../config/env.js';

export const askSearch = async (req, res, next) => {
  try {
    const response = await axios.post(
      `${config.ML_SERVICE_URL}/search`,
      req.body,
      { timeout: 60000 }
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
};

export const getTrending = async (req, res, next) => {
  try {
    const { district, season } = req.query;
    const response = await axios.get(
      `${config.ML_SERVICE_URL}/search/trending`,
      {
        params: { district, season },
        timeout: 10000
      }
    );
    res.json(response.data);
  } catch (err) {
    // Return static fallback if ML service is unreachable
    if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
      return res.json({
        success: true,
        data: [
          'How to control tomato leaf curl virus?',
          'Best paddy variety for Kharif season',
          'Organic pesticide for armyworm in maize',
          'PM Kisan Yojana eligibility details',
          'Subsidy on drip irrigation',
          'Tomato modal market price in APMC'
        ]
      });
    }
    next(err);
  }
};
