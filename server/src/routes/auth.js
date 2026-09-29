import { Router } from 'express';
import { changePassword, login, me, register, updateProfile } from '../controllers/authController.js';
import { requireAuth } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimit.js';

const router = Router();

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.get('/me', requireAuth, me);
router.patch('/me', requireAuth, updateProfile);
router.post('/password', requireAuth, authLimiter, changePassword);

export default router;
