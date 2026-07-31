import { Router } from 'express';
import { askSearch, getTrending } from '../controllers/search.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = Router();

router.post('/', protect, askSearch);
router.get('/trending', getTrending);

export default router;
