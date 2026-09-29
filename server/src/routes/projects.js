import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
  changeRole,
  createProject,
  getProject,
  listProjects,
  removeMember,
  setArchived,
  transferOwnership,
  updateProject,
} from '../controllers/projectController.js';
import { createLink, createUserInvite, listProjectInvites, revokeInvite } from '../controllers/inviteController.js';
import { requireAuth } from '../middleware/auth.js';
import { loadProject, requireRole } from '../middleware/project.js';

const router = Router();
const writeLimiter = rateLimit({ windowMs: 10 * 60 * 1000, limit: 120, standardHeaders: true, legacyHeaders: false });

router.use(requireAuth);

router.get('/', listProjects);
router.post('/', writeLimiter, createProject);

router.get('/:id', loadProject(), getProject);
router.patch('/:id', writeLimiter, loadProject(), requireRole('admin'), updateProject);
// Archive and restore are owner-only, and restore must work on an archived project.
router.post('/:id/archive', writeLimiter, loadProject({ allowArchived: true }), requireRole('owner'), setArchived(true));
router.post('/:id/restore', writeLimiter, loadProject({ allowArchived: true }), requireRole('owner'), setArchived(false));

router.patch('/:id/members/:userId', writeLimiter, loadProject(), requireRole('admin'), changeRole);
router.delete('/:id/members/:userId', writeLimiter, loadProject(), removeMember);
router.post('/:id/members/:userId/make-owner', writeLimiter, loadProject(), requireRole('owner'), transferOwnership);

router.get('/:id/invites', loadProject(), requireRole('admin'), listProjectInvites);
router.post('/:id/invites', writeLimiter, loadProject(), requireRole('admin'), createUserInvite);
router.post('/:id/invite-links', writeLimiter, loadProject(), requireRole('admin'), createLink);
router.delete('/:id/invites/:inviteId', writeLimiter, loadProject(), requireRole('admin'), revokeInvite);

export default router;
