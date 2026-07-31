import { Router } from 'express';
import { recommendCrop } from '../controllers/crop.controller.js';

const router = Router();

router.post('/recommend', recommendCrop);

export default router;
