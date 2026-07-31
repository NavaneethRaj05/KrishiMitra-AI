import { Router } from 'express';
import {
  getProfile,
  updateProfile,
  onboard,
  getJournal,
  addJournalEntry,
  savePushSubscription,
  deletePushSubscription,
} from '../controllers/farmer.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = Router();

router.use(protect);  // all farmer routes require auth

router.get('/profile',  getProfile);
router.put('/profile',  updateProfile);
router.post('/onboard', onboard);
router.get('/journal',  getJournal);
router.post('/journal', addJournalEntry);
router.post('/push-subscription',   savePushSubscription);
router.delete('/push-subscription', deletePushSubscription);

export default router;
