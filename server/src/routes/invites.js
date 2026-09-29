import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { joinLink, myInvites, previewLink, respondToInvite, searchUsers } from '../controllers/inviteController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
const limiter = rateLimit({ windowMs: 10 * 60 * 1000, limit: 120, standardHeaders: true, legacyHeaders: false });
const guard = [requireAuth, limiter];

router.get('/users/search', guard, searchUsers);
router.get('/invites', guard, myInvites);
router.post('/invites/:inviteId/accept', guard, respondToInvite('accept'));
router.post('/invites/:inviteId/decline', guard, respondToInvite('decline'));
router.get('/invite-links/:token', guard, previewLink);
router.post('/invite-links/:token/join', guard, joinLink);

export default router;
