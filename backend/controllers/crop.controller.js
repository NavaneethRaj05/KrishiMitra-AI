import axios from 'axios';
import { config } from '../config/env.js';

/** Proxy crop recommendation to the Python ML service */
export const recommendCrop = async (req, res, next) => {
  try {
    const response = await axios.post(
      `${config.ML_SERVICE_URL}/crop/recommend`,
      req.body,
      { timeout: 30000 }
    );
    res.json(response.data);
  } catch (err) {
    next(err);
  }
};
