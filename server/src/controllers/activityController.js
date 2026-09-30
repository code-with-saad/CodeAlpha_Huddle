import Activity, { ACTIVITY_TYPES } from '../models/Activity.js';
import { OBJECT_ID } from '../middleware/project.js';
import { serializeActivity } from '../services/activity.js';

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Groups the log can be filtered by.
const GROUPS = {
  cards: ['card.created', 'card.moved', 'card.renamed', 'card.archived', 'card.restored', 'card.duplicated', 'card.assigned', 'card.unassigned', 'card.priority', 'card.due', 'card.attached', 'card.bulk'],
  comments: ['card.commented'],
  columns: ['column.created', 'column.renamed', 'column.deleted', 'column.restored'],
  members: ['member.joined', 'member.removed', 'member.role'],
  project: ['project.updated', 'project.archived', 'project.restored'],
};

// GET /api/projects/:id/activity?group=&type=&actor=&card=&q=&before=&limit=
export async function listActivity(req, res) {
  const filter = { project: req.project._id };
  const { group, type, actor, card, q, before } = req.query;
  if (typeof group === 'string' && GROUPS[group]) filter.type = { $in: GROUPS[group] };
  if (typeof type === 'string' && ACTIVITY_TYPES.includes(type)) filter.type = type;
  if (typeof actor === 'string' && OBJECT_ID.test(actor)) filter.actor = actor;
  if (typeof card === 'string' && OBJECT_ID.test(card)) filter.card = card;
  if (typeof q === 'string' && q.trim()) filter.cardTitle = new RegExp(escapeRe(q.trim().slice(0, 60)), 'i');
  if (typeof before === 'string' && OBJECT_ID.test(before)) filter._id = { $lt: before };
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 30, 1), 50);

  const rows = await Activity.find(filter).sort({ _id: -1 }).limit(limit + 1).populate('actor', 'username name avatar');
  res.json({ activity: rows.slice(0, limit).map(serializeActivity), hasMore: rows.length > limit });
}
