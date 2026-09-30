import Card from '../models/Card.js';
import Notification from '../models/Notification.js';
import Project from '../models/Project.js';
import { emitUser } from './realtime.js';

const clip = (s, n = 140) => (s.length > n ? `${s.slice(0, n - 1)}...` : s);

export const serializeNotification = (n) => ({
  id: n._id,
  type: n.type,
  actor: n.actor?.toPublic ? n.actor.toPublic() : null,
  project: n.project ? { id: n.project, name: n.projectName } : null,
  card: n.card ? { id: n.card, title: n.cardTitle } : null,
  snippet: n.snippet,
  read: !!n.readAt,
  createdAt: n.createdAt,
});

export const unreadCount = (userId) => Notification.countDocuments({ user: userId, readAt: null });

// Creates one notification per recipient (never for the person who caused it) and pushes it live.
export async function notify(recipientIds, { type, actor, project, card, snippet = '' }) {
  const seen = new Set();
  const targets = [];
  for (const id of recipientIds) {
    const s = String(id);
    if (seen.has(s) || (actor && s === String(actor._id))) continue;
    seen.add(s);
    targets.push(id);
  }
  if (!targets.length) return;

  const docs = await Notification.insertMany(
    targets.map((user) => ({
      user,
      type,
      actor: actor?._id || null,
      project: project?._id || null,
      card: card?._id || null,
      projectName: project?.name || '',
      cardTitle: card?.title || '',
      snippet: clip(snippet),
    }))
  );
  await Promise.all(
    docs.map(async (d) => {
      d.actor = actor; // populated shape for serialization
      await emitUser(d.user, 'notification', { notification: serializeNotification(d), unread: await unreadCount(d.user) });
    })
  );
}

// Time-based notifications without a scheduler. Vercel's free plan allows a cron job once a day at best,
// so instead of a timer, whenever someone loads the app or opens their notifications we look at what is
// due soon or overdue for them and create anything missing. The key makes this safe to run repeatedly.
const lastSync = new Map(); // per serverless instance, only to skip repeated work
const THROTTLE_MS = Number(process.env.DUE_SYNC_MS ?? 60_000);
const DAY = 86400000;

export async function syncDueNotifications(userId) {
  const uid = String(userId);
  if (Date.now() - (lastSync.get(uid) || 0) < THROTTLE_MS) return 0;
  lastSync.set(uid, Date.now());

  const projects = await Project.find({ 'members.user': userId, archivedAt: null }).select('_id name');
  if (!projects.length) return 0;
  const names = new Map(projects.map((p) => [String(p._id), p.name]));

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const cards = await Card.find({
    project: { $in: projects.map((p) => p._id) },
    archivedAt: null,
    completedAt: null,
    dueDate: { $ne: null, $gte: new Date(today.getTime() - 14 * DAY), $lt: new Date(today.getTime() + 2 * DAY) },
    $or: [{ assignees: userId }, { watchers: userId }],
  }).select('title project dueDate');

  const ops = cards.map((c) => {
    const days = Math.round((c.dueDate.getTime() - today.getTime()) / DAY);
    const date = c.dueDate.toISOString().slice(0, 10);
    const overdue = days < 0;
    return {
      updateOne: {
        filter: { user: userId, key: `${overdue ? 'overdue' : 'due'}:${c._id}:${date}` },
        update: {
          $setOnInsert: {
            user: userId,
            type: overdue ? 'overdue' : 'due_soon',
            project: c.project,
            card: c._id,
            projectName: names.get(String(c.project)) || '',
            cardTitle: c.title,
            snippet: overdue ? `Was due ${date}` : days === 0 ? 'Due today' : 'Due tomorrow',
            createdAt: new Date(),
          },
        },
        upsert: true,
      },
    };
  });
  if (!ops.length) return 0;
  const res = await Notification.bulkWrite(ops, { ordered: false });
  return res.upsertedCount;
}
