import Project from '../models/Project.js';
import { atLeast } from '../utils/roles.js';

export const OBJECT_ID = /^[a-f\d]{24}$/i;

// Loads :id as req.project and the caller's role as req.role. Non-members get 404, not 403,
// so project ids cannot be probed. Archived projects are read-only unless allowArchived is set.
export const loadProject =
  ({ allowArchived = false } = {}) =>
  async (req, res, next) => {
    const id = req.params.id;
    if (!OBJECT_ID.test(id)) return res.status(404).json({ message: 'Project not found' });
    const project = await Project.findById(id);
    const member = project?.members.find((m) => m.user.equals(req.user._id));
    if (!member) return res.status(404).json({ message: 'Project not found' });
    if (project.archivedAt && req.method !== 'GET' && !allowArchived) {
      return res.status(409).json({ message: 'This project is archived. Restore it to make changes.' });
    }
    req.project = project;
    req.role = member.role;
    next();
  };

// Role gate, enforced on the server whatever the UI shows.
export const requireRole = (min) => (req, res, next) =>
  atLeast(req.role, min) ? next() : res.status(403).json({ message: 'You do not have permission to do that' });
