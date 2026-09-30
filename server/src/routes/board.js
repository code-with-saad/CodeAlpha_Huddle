import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
  archiveCard,
  createCard,
  createColumn,
  deleteColumn,
  getBoard,
  moveCard,
  updateColumn,
} from '../controllers/boardController.js';
import {
  addAttachment,
  addChecklistItem,
  deleteAttachment,
  deleteChecklistItem,
  getCard,
  setWatching,
  updateCard,
  updateChecklistItem,
} from '../controllers/cardController.js';
import { addComment, deleteComment, editComment } from '../controllers/commentController.js';
import { createLabel, deleteLabel, updateLabel } from '../controllers/labelController.js';
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
router.get('/:id/cards/:cardId', read, getCard);
// Following a card is not an edit, so viewers can do it too.
router.post('/:id/cards/:cardId/watch', [requireAuth, writeLimiter, loadProject()], setWatching(true));
router.delete('/:id/cards/:cardId/watch', [requireAuth, writeLimiter, loadProject()], setWatching(false));
router.patch('/:id/cards/:cardId', member, updateCard);
router.post('/:id/cards/:cardId/move', member, moveCard);
router.delete('/:id/cards/:cardId', member, archiveCard);

router.post('/:id/cards/:cardId/checklist', member, addChecklistItem);
router.patch('/:id/cards/:cardId/checklist/:itemId', member, updateChecklistItem);
router.delete('/:id/cards/:cardId/checklist/:itemId', member, deleteChecklistItem);

router.post('/:id/cards/:cardId/attachments', member, addAttachment);
router.delete('/:id/cards/:cardId/attachments/:attachmentId', member, deleteAttachment);

router.post('/:id/cards/:cardId/comments', member, addComment);
router.patch('/:id/cards/:cardId/comments/:commentId', member, editComment);
router.delete('/:id/cards/:cardId/comments/:commentId', member, deleteComment);

// Members can create labels; changing or deleting one affects everyone, so that needs an admin.
router.post('/:id/labels', member, createLabel);
router.patch('/:id/labels/:labelId', admin, updateLabel);
router.delete('/:id/labels/:labelId', admin, deleteLabel);

export default router;
