import Project from '../models/Project.js';
import { OBJECT_ID } from '../middleware/project.js';
import Card from '../models/Card.js';
import { emitProject, emitUser } from '../services/realtime.js';
import { createDefaultColumns } from './boardController.js';

// Name, archive state and membership all live in the project the client holds, so it reloads it.
const changed = (req) => emitProject(req.project._id, 'project.changed', {}, req.user._id);
import { assignableBy, canManageMember, isRole } from '../utils/roles.js';

const str = (v) => (typeof v === 'string' ? v.trim() : '');
const MEMBER_FIELDS = 'username name avatar';

// What the client sees. Only public user fields are ever included for other people.
function serialize(project, myRole) {
  return {
    id: project._id,
    name: project.name,
    description: project.description,
    archived: !!project.archivedAt,
    myRole,
    createdAt: project.createdAt,
    members: project.members.map((m) => ({
      user: m.user.toPublic ? m.user.toPublic() : { id: m.user },
      role: m.role,
      joinedAt: m.joinedAt,
    })),
  };
}

const populated = (query) => query.populate('members.user', MEMBER_FIELDS);

function validateFields(body, { requireName }) {
  const errors = {};
  const out = {};
  if (body.name !== undefined || requireName) {
    const name = str(body.name);
    if (!name || name.length > 80) errors.name = 'Enter a name up to 80 characters';
    else out.name = name;
  }
  if (body.description !== undefined) {
    const description = str(body.description);
    if (description.length > 500) errors.description = 'Use 500 characters or fewer';
    else out.description = description;
  }
  return { errors, out };
}

export async function createProject(req, res) {
  const { errors, out } = validateFields(req.body, { requireName: true });
  if (Object.keys(errors).length) return res.status(400).json({ message: 'Check the highlighted fields', errors });

  const project = await Project.create({ ...out, members: [{ user: req.user._id, role: 'owner' }] });
  await createDefaultColumns(project._id);
  const full = await populated(Project.findById(project._id));
  res.status(201).json({ project: serialize(full, 'owner') });
}

export async function listProjects(req, res) {
  const archived = req.query.archived === '1';
  const projects = await populated(
    Project.find({ 'members.user': req.user._id, archivedAt: archived ? { $ne: null } : null }).sort({ updatedAt: -1 })
  );
  res.json({
    projects: projects.map((p) => serialize(p, p.members.find((m) => m.user._id.equals(req.user._id)).role)),
  });
}

export async function getProject(req, res) {
  const full = await populated(Project.findById(req.project._id));
  res.json({ project: serialize(full, req.role) });
}

export async function updateProject(req, res) {
  const { errors, out } = validateFields(req.body, { requireName: false });
  if (Object.keys(errors).length) return res.status(400).json({ message: 'Check the highlighted fields', errors });
  Object.assign(req.project, out);
  await req.project.save();
  await changed(req);
  const full = await populated(Project.findById(req.project._id));
  res.json({ project: serialize(full, req.role) });
}

export const setArchived = (archive) => async (req, res) => {
  req.project.archivedAt = archive ? new Date() : null;
  await req.project.save();
  await changed(req);
  res.json({ ok: true, archived: archive });
};

function findTarget(req, res) {
  const userId = req.params.userId;
  if (!OBJECT_ID.test(userId)) {
    res.status(404).json({ message: 'Member not found' });
    return null;
  }
  const target = req.project.members.find((m) => m.user.equals(userId));
  if (!target) res.status(404).json({ message: 'Member not found' });
  return target || null;
}

export async function changeRole(req, res) {
  const target = findTarget(req, res);
  if (!target) return;
  const role = req.body.role;
  if (!isRole(role) || !assignableBy(req.role).includes(role)) {
    return res.status(403).json({ message: 'You cannot assign that role' });
  }
  if (!canManageMember(req.role, target.role)) {
    return res.status(403).json({ message: 'You cannot change this member' });
  }
  target.role = role;
  await req.project.save();
  await changed(req);
  await emitUser(target.user, 'access.changed', { projectId: String(req.project._id) });
  res.json({ ok: true });
}

export async function removeMember(req, res) {
  const target = findTarget(req, res);
  if (!target) return;
  const self = target.user.equals(req.user._id);
  if (target.role === 'owner') {
    return res.status(403).json({ message: 'The owner cannot be removed. Transfer ownership first.' });
  }
  // Anyone may leave; removing someone else follows the role rules.
  if (!self && !canManageMember(req.role, target.role)) {
    return res.status(403).json({ message: 'You cannot remove this member' });
  }
  req.project.members = req.project.members.filter((m) => !m.user.equals(target.user));
  await req.project.save();
  // Someone who left can no longer be assigned to anything here.
  await Card.updateMany({ project: req.project._id, assignees: target.user }, { $pull: { assignees: target.user } });
  await changed(req);
  // The person removed (or leaving) must drop the project channel, so their token is re-issued without it.
  await emitUser(target.user, 'access.changed', { removedFrom: String(req.project._id) });
  res.json({ ok: true });
}

export async function transferOwnership(req, res) {
  const target = findTarget(req, res);
  if (!target) return;
  if (target.role === 'owner') return res.status(400).json({ message: 'That member already owns this project' });
  const current = req.project.members.find((m) => m.user.equals(req.user._id));
  target.role = 'owner';
  current.role = 'admin';
  await req.project.save();
  await changed(req);
  await emitUser(target.user, 'access.changed', { projectId: String(req.project._id) });
  res.json({ ok: true });
}
