import { Router } from 'express';
import { register, login, getMe, sendOTP, verifyOTP, biometricVerify } from '../controllers/auth.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = Router();

router.post('/register', register);
router.post('/login',    login);
router.get('/me',        protect, getMe);
router.post('/send-otp', sendOTP);
router.post('/verify-otp', verifyOTP);
router.post('/biometric-verify', protect, biometricVerify);

export default router;
