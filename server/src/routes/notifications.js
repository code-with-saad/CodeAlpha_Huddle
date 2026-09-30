import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { getUnread, listNotifications, markRead, realtimeToken } from '../controllers/notificationController.js';
import { search } from '../controllers/searchController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
const limiter = rateLimit({ windowMs: 10 * 60 * 1000, limit: 300, standardHeaders: true, legacyHeaders: false });
const guard = [requireAuth, limiter];

router.get('/notifications', guard, listNotifications);
router.get('/notifications/unread', guard, getUnread);
router.post('/notifications/read', guard, markRead);
router.get('/realtime/token', guard, realtimeToken);
router.get('/search', guard, search);

export default router;
