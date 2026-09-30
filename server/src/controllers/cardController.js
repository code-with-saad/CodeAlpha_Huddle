import crypto from 'node:crypto';
import Card, { PRIORITIES } from '../models/Card.js';
import Comment from '../models/Comment.js';
import Label from '../models/Label.js';
import User from '../models/User.js';
import { OBJECT_ID } from '../middleware/project.js';
import { logActivity } from '../services/activity.js';
import { notify } from '../services/notify.js';
import { emitProject } from '../services/realtime.js';
import { mentionedMemberIds } from '../utils/mentions.js';
import { atLeast } from '../utils/roles.js';
import { serializeCard, serializeCardDetail, serializeComment } from '../utils/serialize.js';

const str = (v) => (typeof v === 'string' ? v.trim() : '');
const bad = (res, errors) => res.status(400).json({ message: 'Check the highlighted fields', errors });

const MAX_ASSIGNEES = 10;
const MAX_LABELS = 10;
const MAX_CHECKLIST = 50;
const MAX_ATTACHMENTS = 10;
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ALLOWED_MIME = new Set([
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  'application/pdf', 'text/plain', 'text/csv', 'text/markdown',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
]);

export async function loadCard(req, res) {
  const { cardId } = req.params;
  const card = OBJECT_ID.test(cardId) ? await Card.findOne({ _id: cardId, project: req.project._id, archivedAt: null }) : null;
  if (!card) res.status(404).json({ message: 'Card not found' });
  return card;
}

// Public profiles for everyone a card refers to (they may have left the project since).
async function peopleFor(card, comments) {
  const ids = new Set([String(card.createdBy), ...card.attachments.map((a) => String(a.uploadedBy)), ...comments.map((c) => String(c.author))]);
  const users = await User.find({ _id: { $in: [...ids] } });
  return users.map((u) => u.toPublic());
}

async function detail(card, userId) {
  const comments = await Comment.find({ card: card._id }).sort({ createdAt: 1 }).limit(300);
  return { card: serializeCardDetail(card, userId), comments: comments.map(serializeComment), people: await peopleFor(card, comments) };
}

// Tells everyone looking at the board that this card changed.
const announce = (req, card) => emitProject(req.project._id, 'card.upsert', { card: serializeCard(card) }, req.user._id);

// Saves, publishes the change, runs `after` (notifications) and only then answers. On Vercel the function
// can freeze once the response is sent, so everything that must happen has to finish first.
async function finish(req, res, card, status = 200, after = null) {
  await card.save();
  await announce(req, card);
  if (after) await after();
  res.status(status).json(await detail(card, req.user._id));
}

export async function getCard(req, res) {
  const card = await loadCard(req, res);
  if (card) res.json(await detail(card, req.user._id));
}

export async function updateCard(req, res) {
  const card = await loadCard(req, res);
  if (!card) return;
  const b = req.body;
  const errors = {};
  const oldAssignees = card.assignees.map(String);
  const oldDescription = card.description;
  const before = { title: card.title, priority: card.priority, due: card.dueDate ? card.dueDate.toISOString().slice(0, 10) : null };

  if (b.title !== undefined) {
    const title = str(b.title);
    if (!title || title.length > 200) errors.title = 'Enter a title up to 200 characters';
    else card.title = title;
  }
  if (b.description !== undefined) {
    if (typeof b.description !== 'string' || b.description.length > 10000) errors.description = 'Use 10,000 characters or fewer';
    else card.description = b.description;
  }
  if (b.priority !== undefined) {
    if (!PRIORITIES.includes(b.priority)) errors.priority = 'Unknown priority';
    else card.priority = b.priority;
  }
  if (b.dueDate !== undefined) {
    if (b.dueDate === null || b.dueDate === '') card.dueDate = null;
    else {
      // Date parsing rolls 2026-02-31 over to March, so the date must survive a round trip unchanged.
      const d = typeof b.dueDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(b.dueDate) ? new Date(`${b.dueDate}T00:00:00.000Z`) : null;
      if (d && !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === b.dueDate) card.dueDate = d;
      else errors.dueDate = 'Use a valid date';
    }
  }
  if (b.assignees !== undefined) {
    const ids = Array.isArray(b.assignees) ? [...new Set(b.assignees)] : null;
    const members = new Set(req.project.members.map((m) => String(m.user)));
    if (!ids || ids.length > MAX_ASSIGNEES || !ids.every((id) => typeof id === 'string' && members.has(id))) errors.assignees = 'Assign only project members, up to 10';
    else card.assignees = ids;
  }
  if (b.labels !== undefined) {
    const ids = Array.isArray(b.labels) ? [...new Set(b.labels)] : null;
    if (!ids || ids.length > MAX_LABELS || !ids.every((id) => typeof id === 'string' && OBJECT_ID.test(id))) errors.labels = 'Invalid labels';
    else if (ids.length && (await Label.countDocuments({ _id: { $in: ids }, project: req.project._id })) !== ids.length) errors.labels = 'Unknown label';
    else card.labels = ids;
  }
  if (Object.keys(errors).length) return bad(res, errors);

  // Who is newly assigned, and who is newly mentioned in the description. Both start following the card.
  const newlyAssigned = card.assignees.map(String).filter((id) => !oldAssignees.includes(id));
  let newlyMentioned = [];
  if (card.description !== oldDescription) {
    const [now, before] = await Promise.all([mentionedMemberIds(card.description, req.project), mentionedMemberIds(oldDescription, req.project)]);
    const had = new Set(before.map(String));
    newlyMentioned = now.filter((id) => !had.has(String(id)));
  }
  card.watchers.addToSet(...newlyAssigned, ...newlyMentioned);

  const ctx = { actor: req.user, project: req.project, card };
  const removed = oldAssignees.filter((id) => !card.assignees.map(String).includes(id));
  const history = async () => {
    const log = (type, data = {}) => logActivity({ project: req.project, actor: req.user, type, card, data });
    const names = async (ids) => (ids.length ? (await User.find({ _id: { $in: ids } }).select('name username')).map((u) => u.name || u.username) : []);
    const jobs = [];
    if (card.title !== before.title) jobs.push(log('card.renamed', { from: before.title }));
    if (card.priority !== before.priority) jobs.push(log('card.priority', { to: card.priority, from: before.priority }));
    const due = card.dueDate ? card.dueDate.toISOString().slice(0, 10) : null;
    if (due !== before.due) jobs.push(log('card.due', { to: due }));
    if (newlyAssigned.length) jobs.push(names(newlyAssigned).then((users) => log('card.assigned', { users })));
    if (removed.length) jobs.push(names(removed).then((users) => log('card.unassigned', { users })));
    await Promise.all(jobs);
  };
  await finish(req, res, card, 200, () =>
    Promise.all([
      history(),
      notify(newlyAssigned, { ...ctx, type: 'assigned', snippet: 'Assigned you to this card' }),
      notify(newlyMentioned, { ...ctx, type: 'mentioned', snippet: 'Mentioned you in the description' }),
    ])
  );
}

// ---- Watching: a person following a card gets its notifications ----

export const setWatching = (on) => async (req, res) => {
  const card = await loadCard(req, res);
  if (!card) return;
  if (on) card.watchers.addToSet(req.user._id);
  else card.watchers.pull(req.user._id);
  await card.save();
  res.json(await detail(card, req.user._id));
};

// ---- Checklist ----

export async function addChecklistItem(req, res) {
  const card = await loadCard(req, res);
  if (!card) return;
  const text = str(req.body.text);
  if (!text || text.length > 200) return bad(res, { text: 'Enter text up to 200 characters' });
  if (card.checklist.length >= MAX_CHECKLIST) return res.status(409).json({ message: `A checklist can hold ${MAX_CHECKLIST} items` });
  card.checklist.push({ text });
  await finish(req, res, card, 201);
}

export async function updateChecklistItem(req, res) {
  const card = await loadCard(req, res);
  if (!card) return;
  const item = OBJECT_ID.test(req.params.itemId) ? card.checklist.id(req.params.itemId) : null;
  if (!item) return res.status(404).json({ message: 'Item not found' });
  if (req.body.text !== undefined) {
    const text = str(req.body.text);
    if (!text || text.length > 200) return bad(res, { text: 'Enter text up to 200 characters' });
    item.text = text;
  }
  if (req.body.done !== undefined) item.done = req.body.done === true;
  await finish(req, res, card);
}

export async function deleteChecklistItem(req, res) {
  const card = await loadCard(req, res);
  if (!card) return;
  const item = OBJECT_ID.test(req.params.itemId) ? card.checklist.id(req.params.itemId) : null;
  if (!item) return res.status(404).json({ message: 'Item not found' });
  item.deleteOne();
  await finish(req, res, card);
}

// ---- Attachments (files live in Cloudinary; only the reference is stored here) ----

const isOwnAttachmentUrl = (url) =>
  typeof url === 'string' &&
  url.length < 500 &&
  url.startsWith(`https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/`) &&
  url.includes('/huddle/attachments/');

export async function addAttachment(req, res) {
  const card = await loadCard(req, res);
  if (!card) return;
  const { url, name, size, mime, publicId, resourceType } = req.body;
  const errors = {};
  if (!isOwnAttachmentUrl(url)) errors.url = 'Invalid file';
  if (!str(name) || str(name).length > 200) errors.name = 'Invalid file name';
  if (!ALLOWED_MIME.has(mime)) errors.mime = 'That file type is not allowed';
  if (!Number.isFinite(size) || size < 0 || size > MAX_FILE_BYTES) errors.size = 'Files can be up to 10 MB';
  if (typeof publicId !== 'string' || !publicId.startsWith('huddle/attachments/') || publicId.length > 300) errors.publicId = 'Invalid file';
  if (!['image', 'raw'].includes(resourceType)) errors.resourceType = 'Invalid file';
  if (Object.keys(errors).length) return bad(res, errors);
  if (card.attachments.length >= MAX_ATTACHMENTS) return res.status(409).json({ message: `A card can hold ${MAX_ATTACHMENTS} attachments` });

  card.attachments.push({ url, name: str(name), size, mime, publicId, resourceType, uploadedBy: req.user._id });
  await finish(req, res, card, 201, () => logActivity({ project: req.project, actor: req.user, type: 'card.attached', card, data: { name: str(name) } }));
}

// Best effort: a failure here leaves an orphan file in Cloudinary but never blocks the user.
async function destroyRemote(a) {
  try {
    const ts = Math.floor(Date.now() / 1000);
    const signature = crypto.createHash('sha1').update(`public_id=${a.publicId}&timestamp=${ts}${process.env.CLOUDINARY_API_SECRET}`).digest('hex');
    const body = new URLSearchParams({ public_id: a.publicId, timestamp: String(ts), api_key: process.env.CLOUDINARY_API_KEY, signature });
    await fetch(`https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/${a.resourceType}/destroy`, { method: 'POST', body });
  } catch {
    /* ignore */
  }
}

export async function deleteAttachment(req, res) {
  const card = await loadCard(req, res);
  if (!card) return;
  const a = OBJECT_ID.test(req.params.attachmentId) ? card.attachments.id(req.params.attachmentId) : null;
  if (!a) return res.status(404).json({ message: 'Attachment not found' });
  // The uploader can remove their own file; admins can remove any.
  if (!a.uploadedBy.equals(req.user._id) && !atLeast(req.role, 'admin')) return res.status(403).json({ message: 'You can only remove files you added' });
  const copy = { publicId: a.publicId, resourceType: a.resourceType };
  a.deleteOne();
  await finish(req, res, card, 200, () => destroyRemote(copy));
}
