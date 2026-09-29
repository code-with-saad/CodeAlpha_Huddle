import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { signUpload } from '../controllers/uploadController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
const limiter = rateLimit({ windowMs: 10 * 60 * 1000, limit: 60, standardHeaders: true, legacyHeaders: false });

router.post('/sign', requireAuth, limiter, signUpload);

export default router;
