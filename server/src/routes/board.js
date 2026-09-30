import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
  archiveCard,
  createCard,
  createColumn,
  deleteColumn,
  getBoard,
  moveCard,
  updateCard,
  updateColumn,
} from '../controllers/boardController.js';
import { requireAuth } from '../middleware/auth.js';
import { loadProject, requireRole } from '../middleware/project.js';

const router = Router();
const writeLimiter = rateLimit({ windowMs: 10 * 60 * 1000, limit: 600, standardHeaders: true, legacyHeaders: false });
const read = [requireAuth, loadProject()];
const admin = [requireAuth, writeLimiter, loadProject(), requireRole('admin')];
const member = [requireAuth, writeLimiter, loadProject(), requireRole('member')];

router.get('/:id/board', read, getBoard);

router.post('/:id/columns', admin, createColumn);
router.patch('/:id/columns/:columnId', admin, updateColumn);
router.delete('/:id/columns/:columnId', admin, deleteColumn);

router.post('/:id/cards', member, createCard);
router.patch('/:id/cards/:cardId', member, updateCard);
router.post('/:id/cards/:cardId/move', member, moveCard);
router.delete('/:id/cards/:cardId', member, archiveCard);

export default router;
