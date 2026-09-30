import Notification from '../models/Notification.js';
import Project from '../models/Project.js';
import { OBJECT_ID } from '../middleware/project.js';
import { createToken } from '../services/realtime.js';
import { serializeNotification, syncDueNotifications, unreadCount } from '../services/notify.js';

// GET /api/notifications?limit=30&before=<id>&unread=1
// Opening the list is also when due soon and overdue notifications are created (see services/notify.js).
export async function listNotifications(req, res) {
  await syncDueNotifications(req.user._id);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 30, 1), 50);
  const filter = { user: req.user._id };
  if (req.query.unread === '1') filter.readAt = null;
  if (typeof req.query.before === 'string' && OBJECT_ID.test(req.query.before)) filter._id = { $lt: req.query.before };
  const rows = await Notification.find(filter).sort({ _id: -1 }).limit(limit + 1).populate('actor', 'username name avatar');
  res.json({
    notifications: rows.slice(0, limit).map(serializeNotification),
    hasMore: rows.length > limit,
    unread: await unreadCount(req.user._id),
  });
}

// Light call for the bell badge: syncs time-based notifications and returns the unread count.
export async function getUnread(req, res) {
  await syncDueNotifications(req.user._id);
  res.json({ unread: await unreadCount(req.user._id) });
}

// Body { ids: [...] } marks those read; { all: true } marks everything read.
export async function markRead(req, res) {
  const { ids, all } = req.body || {};
  const filter = { user: req.user._id, readAt: null };
  if (all === true) {
    /* everything unread */
  } else if (Array.isArray(ids) && ids.length <= 100 && ids.every((i) => typeof i === 'string' && OBJECT_ID.test(i))) {
    filter._id = { $in: ids };
  } else {
    return res.status(400).json({ message: 'Send ids or all: true' });
  }
  await Notification.updateMany(filter, { readAt: new Date() });
  res.json({ unread: await unreadCount(req.user._id) });
}

// GET /api/realtime/token: an Ably token request limited to the channels this person may read.
// Called again by the browser whenever membership changes, so access follows the roles.
export async function realtimeToken(req, res) {
  const projects = await Project.find({ 'members.user': req.user._id }).select('_id');
  res.json(await createToken(req.user._id, projects.map((p) => p._id)));
}
