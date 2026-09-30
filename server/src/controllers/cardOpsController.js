import Card from '../models/Card.js';
import Column from '../models/Column.js';
import Label from '../models/Label.js';
import { OBJECT_ID } from '../middleware/project.js';
import { logActivity } from '../services/activity.js';
import { notify } from '../services/notify.js';
import { emitProject } from '../services/realtime.js';
import { STEP, endPosition, placeAt } from '../utils/order.js';
import { serializeCard } from '../utils/serialize.js';
import { loadCard } from './cardController.js';

const MAX_CARDS = 1000;
const MAX_BULK = 100;
const reload = (req) => emitProject(req.project._id, 'board.reload', {}, req.user._id);
const activeColumns = (project) => Column.find({ project, archivedAt: null }).sort({ position: 1 });

// ---- Duplicate ----

export async function duplicateCard(req, res) {
  const src = await loadCard(req, res);
  if (!src) return;
  if ((await Card.countDocuments({ project: req.project._id, archivedAt: null })) >= MAX_CARDS) {
    return res.status(409).json({ message: `A project can have up to ${MAX_CARDS} active cards. Archive some first.` });
  }
  const filter = { column: src.column, archivedAt: null };
  const at = await Card.countDocuments({ ...filter, position: { $lt: src.position } });
  const state = {};
  // The copy sits right below the original. Attachments and comments are not copied; checklist items start unticked.
  const copy = await Card.create({
    project: src.project,
    column: src.column,
    title: `${src.title} (copy)`.slice(0, 200),
    position: await placeAt(Card, filter, null, at + 1, state),
    createdBy: req.user._id,
    description: src.description,
    assignees: src.assignees,
    labels: src.labels,
    priority: src.priority,
    dueDate: src.dueDate,
    checklist: src.checklist.map((i) => ({ text: i.text, done: false })),
    watchers: [...new Set([String(req.user._id), ...src.assignees.map(String)])],
  });
  await logActivity({ project: req.project, actor: req.user, type: 'card.duplicated', card: copy, data: { from: src.title } });
  if (state.renumbered) await reload(req);
  else await emitProject(req.project._id, 'card.upsert', { card: serializeCard(copy) }, req.user._id);
  res.status(201).json({ card: serializeCard(copy) });
}

// ---- Archive list and restore ----

export async function listArchive(req, res) {
  const [cards, columns] = await Promise.all([
    Card.find({ project: req.project._id, archivedAt: { $ne: null } }).sort({ archivedAt: -1 }).limit(200),
    Column.find({ project: req.project._id, archivedAt: { $ne: null } }).sort({ archivedAt: -1 }).limit(50),
  ]);
  const names = new Map((await Column.find({ project: req.project._id })).map((c) => [String(c._id), c]));
  res.json({
    cards: cards.map((c) => ({ id: c._id, title: c.title, column: names.get(String(c.column))?.name || '', columnArchived: !!names.get(String(c.column))?.archivedAt, archivedAt: c.archivedAt, withColumn: c.archivedWithColumn })),
    columns: await Promise.all(columns.map(async (c) => ({ id: c._id, name: c.name, archivedAt: c.archivedAt, cardCount: await Card.countDocuments({ column: c._id, archivedWithColumn: true }) }))),
  });
}

// Puts an archived card back. It keeps its old place if its column still exists, otherwise it lands in the first column.
async function restoreCards(project, cards) {
  const cols = await activeColumns(project._id);
  if (!cols.length) return [];
  const live = new Set(cols.map((c) => String(c._id)));
  const restored = [];
  for (const c of cards) {
    if (!live.has(String(c.column))) {
      c.column = cols[0]._id;
      c.position = await endPosition(Card, { column: cols[0]._id, archivedAt: null });
    }
    c.archivedAt = null;
    c.archivedWithColumn = false;
    await c.save();
    restored.push(c);
  }
  return restored;
}

export async function restoreCard(req, res) {
  const { cardId } = req.params;
  const card = OBJECT_ID.test(cardId) ? await Card.findOne({ _id: cardId, project: req.project._id, archivedAt: { $ne: null } }) : null;
  if (!card) return res.status(404).json({ message: 'Archived card not found' });
  if ((await Card.countDocuments({ project: req.project._id, archivedAt: null })) >= MAX_CARDS) return res.status(409).json({ message: 'Too many active cards. Archive some first.' });
  const [restored] = await restoreCards(req.project, [card]);
  if (!restored) return res.status(409).json({ message: 'This project has no column to restore the card into' });
  await logActivity({ project: req.project, actor: req.user, type: 'card.restored', card: restored });
  await emitProject(req.project._id, 'board.reload', {}, req.user._id);
  res.json({ card: serializeCard(restored) });
}

export async function restoreColumn(req, res) {
  const { columnId } = req.params;
  const column = OBJECT_ID.test(columnId) ? await Column.findOne({ _id: columnId, project: req.project._id, archivedAt: { $ne: null } }) : null;
  if (!column) return res.status(404).json({ message: 'Archived column not found' });
  column.archivedAt = null;
  column.position = await endPosition(Column, { project: req.project._id, archivedAt: null });
  await column.save();
  // Cards that were archived together with the column come back with it.
  await Card.updateMany({ column: column._id, archivedWithColumn: true }, { archivedAt: null, archivedWithColumn: false });
  await logActivity({ project: req.project, actor: req.user, type: 'column.restored', data: { name: column.name } });
  await reload(req);
  res.json({ ok: true });
}

// ---- Bulk actions ----

const validIds = (ids) => Array.isArray(ids) && ids.length > 0 && ids.length <= MAX_BULK && ids.every((i) => typeof i === 'string' && OBJECT_ID.test(i));

// POST /api/projects/:id/cards/bulk  { action, ids, ... }
// Every action answers with what it changed, so the browser can offer Undo.
export async function bulkCards(req, res) {
  const { action, ids } = req.body;
  if (!validIds(ids)) return res.status(400).json({ message: `Select between 1 and ${MAX_BULK} cards` });
  const unique = [...new Set(ids)];
  const wantArchived = action === 'restore';
  const found = await Card.find({ _id: { $in: unique }, project: req.project._id, archivedAt: wantArchived ? { $ne: null } : null });
  // Keep the order the caller sent, so a move keeps the visual order of the selection.
  const byId = new Map(found.map((c) => [String(c._id), c]));
  const cards = unique.map((i) => byId.get(i)).filter(Boolean);
  if (!cards.length) return res.status(404).json({ message: 'None of those cards were found' });

  let changed = [];
  const ctx = { actor: req.user, project: req.project };

  if (action === 'move') {
    const column = OBJECT_ID.test(req.body.columnId || '') ? await Column.findOne({ _id: req.body.columnId, project: req.project._id, archivedAt: null }) : null;
    if (!column) return res.status(404).json({ message: 'Column not found' });
    const base = await endPosition(Card, { column: column._id, archivedAt: null });
    const ops = [];
    cards.forEach((c, k) => {
      changed.push({ id: String(c._id), columnId: String(c.column), position: c.position });
      ops.push({ updateOne: { filter: { _id: c._id }, update: { column: column._id, position: base + STEP * k } } });
    });
    await Card.bulkWrite(ops);
  } else if (action === 'place') {
    // Exact restore of earlier places, used by Undo.
    const items = Array.isArray(req.body.items) ? req.body.items : [];
    const live = new Set((await activeColumns(req.project._id)).map((c) => String(c._id)));
    const ok = items.filter((i) => typeof i?.id === 'string' && byId.has(i.id) && live.has(String(i.columnId)) && Number.isFinite(i.position));
    if (!ok.length) return res.status(400).json({ message: 'Nothing to restore' });
    await Card.bulkWrite(ok.map((i) => ({ updateOne: { filter: { _id: i.id }, update: { column: i.columnId, position: i.position } } })));
    changed = ok.map((i) => ({ id: i.id }));
  } else if (action === 'assign') {
    const users = Array.isArray(req.body.userIds) ? [...new Set(req.body.userIds)] : null;
    const members = new Set(req.project.members.map((m) => String(m.user)));
    if (!users || !users.length || users.length > 10 || !users.every((u) => typeof u === 'string' && members.has(u))) return res.status(400).json({ message: 'Choose project members' });
    const add = req.body.mode !== 'remove';
    const gained = new Map(users.map((u) => [u, 0]));
    const lastCard = new Map();
    for (const c of cards) {
      const have = new Set(c.assignees.map(String));
      const touch = users.filter((u) => (add ? !have.has(u) : have.has(u)));
      if (!touch.length) continue;
      if (add) {
        c.assignees.addToSet(...touch);
        c.watchers.addToSet(...touch);
        touch.forEach((u) => {
          gained.set(u, gained.get(u) + 1);
          lastCard.set(u, c);
        });
      } else c.assignees.pull(...touch);
      await c.save();
      changed.push({ id: String(c._id) });
    }
    if (add) {
      await Promise.all([...gained].filter(([, n]) => n > 0).map(([u, n]) => notify([u], { ...ctx, type: 'assigned', card: n === 1 ? lastCard.get(u) : null, snippet: n === 1 ? 'Assigned you to this card' : `Assigned you to ${n} cards` })));
    }
  } else if (action === 'label') {
    const labelId = req.body.labelId;
    if (typeof labelId !== 'string' || !OBJECT_ID.test(labelId) || !(await Label.exists({ _id: labelId, project: req.project._id }))) return res.status(400).json({ message: 'Choose a label' });
    const add = req.body.mode !== 'remove';
    for (const c of cards) {
      const has = c.labels.some((l) => String(l) === labelId);
      if (add === has) continue;
      if (add) c.labels.addToSet(labelId);
      else c.labels.pull(labelId);
      await c.save();
      changed.push({ id: String(c._id) });
    }
  } else if (action === 'archive') {
    await Card.updateMany({ _id: { $in: cards.map((c) => c._id) } }, { archivedAt: new Date() });
    changed = cards.map((c) => ({ id: String(c._id) }));
  } else if (action === 'restore') {
    const restored = await restoreCards(req.project, cards);
    changed = restored.map((c) => ({ id: String(c._id) }));
  } else {
    return res.status(400).json({ message: 'Unknown action' });
  }

  if (action !== 'place' && changed.length) {
    await logActivity({ project: req.project, actor: req.user, type: 'card.bulk', data: { action, count: changed.length } });
  }
  await reload(req);
  res.json({ changed, count: changed.length });
}
