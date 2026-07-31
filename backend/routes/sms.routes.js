import { Router } from 'express';
import axios from 'axios';

const router = Router();
const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

router.post('/inbound', async (req, res, next) => {
  const { from, message } = req.body;
  try {
    // Call search pipeline
    const mlRes = await axios.post(`${ML_SERVICE_URL}/search`, {
      query: message,
      online: true,
      farmer_id: 'sms_farmer'
    });

    const answer = mlRes.data?.answer || "No response generated";
    const truncated = answer.length > 160 ? answer.slice(0, 157) + "..." : answer;

    console.log(`[SMS Inbound] From: ${from}, Query: ${message}, Reply: ${truncated}`);
    res.status(200).json({ success: true, reply: truncated });
  } catch (err) {
    next(err);
  }
});

export default router;
