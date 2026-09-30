import crypto from 'node:crypto';
import Invite from '../models/Invite.js';
import Project from '../models/Project.js';
import User from '../models/User.js';
import { OBJECT_ID } from '../middleware/project.js';
import { logActivity } from '../services/activity.js';
import { notify } from '../services/notify.js';
import { emitProject, emitUser } from '../services/realtime.js';
import { assignableBy } from '../utils/roles.js';

const str = (v) => (typeof v === 'string' ? v.trim() : '');
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const LINK_ROLES = ['member', 'viewer'];
const notExpired = () => ({ $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }] });

// Adds a member atomically so two simultaneous accepts cannot create a duplicate.
async function addMember(projectId, userId, role) {
  const res = await Project.updateOne(
    { _id: projectId, archivedAt: null, 'members.user': { $ne: userId } },
    { $push: { members: { user: userId, role, joinedAt: new Date() } } }
  );
  return res.modifiedCount === 1;
}

// Someone joined: open boards show the new member, and their own tab gets access to the project channel.
async function joined(projectId, userId) {
  await logActivity({ project: projectId, actor: userId, type: 'member.joined' });
  await emitProject(projectId, 'project.changed', {}, userId);
  await emitUser(userId, 'access.changed', { projectId: String(projectId) });
}

const serializeInvite = (i) => ({
  id: i._id,
  kind: i.kind,
  role: i.role,
  token: i.kind === 'link' ? i.token : undefined,
  expiresAt: i.expiresAt,
  uses: i.uses,
  createdAt: i.createdAt,
  invitee: i.invitee?.toPublic ? i.invitee.toPublic() : undefined,
  createdBy: i.createdBy?.toPublic ? i.createdBy.toPublic() : undefined,
});

// People search for the invite box. Usernames match by prefix; an email must match exactly.
export async function searchUsers(req, res) {
  const q = str(req.query.q).toLowerCase();
  if (q.length < 2 || q.length > 60) return res.json({ users: [] });
  const filter = q.includes('@') ? { email: q } : { username: new RegExp(`^${escapeRe(q)}`) };
  const users = await User.find({ ...filter, _id: { $ne: req.user._id } }).limit(8).sort({ username: 1 });
  res.json({ users: users.map((u) => u.toPublic()) });
}

export async function listProjectInvites(req, res) {
  const invites = await Invite.find({ project: req.project._id, status: 'pending', ...notExpired() })
    .populate('invitee', 'username name avatar')
    .populate('createdBy', 'username name avatar')
    .sort({ createdAt: -1 });
  res.json({ invites: invites.map(serializeInvite) });
}

export async function createUserInvite(req, res) {
  const role = req.body.role;
  if (!assignableBy(req.role).includes(role)) return res.status(403).json({ message: 'You cannot invite with that role' });

  const username = str(req.body.username).toLowerCase();
  const email = str(req.body.email).toLowerCase();
  const user = username ? await User.findOne({ username }) : email ? await User.findOne({ email }) : null;
  if (!user) {
    return res.status(404).json({ message: 'No account found. Share an invite link instead.' });
  }
  if (req.project.members.some((m) => m.user.equals(user._id))) {
    return res.status(409).json({ message: 'That person is already a member' });
  }
  const open = await Invite.findOne({ project: req.project._id, invitee: user._id, kind: 'user', status: 'pending' });
  if (open) return res.status(409).json({ message: 'That person already has a pending invitation' });

  const invite = await Invite.create({ project: req.project._id, kind: 'user', invitee: user._id, role, createdBy: req.user._id });
  await invite.populate([{ path: 'invitee', select: 'username name avatar' }, { path: 'createdBy', select: 'username name avatar' }]);
  await notify([user._id], { type: 'invited', actor: req.user, project: req.project, snippet: `Invited you as ${role}` });
  await emitUser(user._id, 'invites.changed');
  res.status(201).json({ invite: serializeInvite(invite) });
}

export async function createLink(req, res) {
  const role = req.body.role ?? 'viewer';
  if (!LINK_ROLES.includes(role)) return res.status(400).json({ message: 'Links can grant Member or Viewer' });
  const days = req.body.expiresInDays;
  if (days != null && ![1, 7, 30].includes(days)) return res.status(400).json({ message: 'Choose 1, 7 or 30 days, or no expiry' });

  const invite = await Invite.create({
    project: req.project._id,
    kind: 'link',
    token: crypto.randomBytes(24).toString('base64url'),
    role,
    createdBy: req.user._id,
    expiresAt: days ? new Date(Date.now() + days * 86400000) : null,
  });
  await invite.populate('createdBy', 'username name avatar');
  res.status(201).json({ invite: serializeInvite(invite) });
}

export async function revokeInvite(req, res) {
  const { inviteId } = req.params;
  if (!OBJECT_ID.test(inviteId)) return res.status(404).json({ message: 'Invite not found' });
  const invite = await Invite.findOneAndUpdate(
    { _id: inviteId, project: req.project._id, status: 'pending' },
    { status: 'revoked' }
  );
  if (!invite) return res.status(404).json({ message: 'Invite not found' });
  if (invite.invitee) await emitUser(invite.invitee, 'invites.changed');
  res.json({ ok: true });
}

// Invitations addressed to me, across projects.
export async function myInvites(req, res) {
  const invites = await Invite.find({ invitee: req.user._id, kind: 'user', status: 'pending' })
    .populate({ path: 'project', select: 'name description archivedAt members' })
    .populate('createdBy', 'username name avatar')
    .sort({ createdAt: -1 });
  res.json({
    invites: invites
      .filter((i) => i.project && !i.project.archivedAt)
      .map((i) => ({
        id: i._id,
        role: i.role,
        createdAt: i.createdAt,
        invitedBy: i.createdBy?.toPublic(),
        project: { id: i.project._id, name: i.project.name, description: i.project.description, memberCount: i.project.members.length },
      })),
  });
}

export const respondToInvite = (action) => async (req, res) => {
  const { inviteId } = req.params;
  if (!OBJECT_ID.test(inviteId)) return res.status(404).json({ message: 'Invite not found' });
  const invite = await Invite.findOne({ _id: inviteId, invitee: req.user._id, kind: 'user', status: 'pending' });
  if (!invite) return res.status(404).json({ message: 'Invite not found' });

  if (action === 'decline') {
    invite.status = 'declined';
    await invite.save();
    return res.json({ ok: true });
  }
  const added = await addMember(invite.project, req.user._id, invite.role);
  invite.status = 'accepted';
  await invite.save();
  if (added) await joined(invite.project, req.user._id);
  res.json({ ok: true, projectId: invite.project });
};

async function findLink(token) {
  if (typeof token !== 'string' || token.length > 100) return null;
  const invite = await Invite.findOne({ token, kind: 'link', status: 'pending', ...notExpired() }).populate('project');
  return invite && invite.project && !invite.project.archivedAt ? invite : null;
}

export async function previewLink(req, res) {
  const invite = await findLink(req.params.token);
  if (!invite) return res.status(404).json({ message: 'This invite link is invalid or has expired' });
  const p = invite.project;
  res.json({
    project: { id: p._id, name: p.name, description: p.description, memberCount: p.members.length },
    role: invite.role,
    alreadyMember: p.members.some((m) => m.user.equals(req.user._id)),
  });
}

export async function joinLink(req, res) {
  const invite = await findLink(req.params.token);
  if (!invite) return res.status(404).json({ message: 'This invite link is invalid or has expired' });
  // Someone who is already in keeps their current role; a link never changes it.
  if (await addMember(invite.project._id, req.user._id, invite.role)) {
    await Invite.updateOne({ _id: invite._id }, { $inc: { uses: 1 } });
    await joined(invite.project._id, req.user._id);
  }
  res.json({ ok: true, projectId: invite.project._id });
}
