import Card from '../models/Card.js';
import Column from '../models/Column.js';
import Label from '../models/Label.js';
import { OBJECT_ID } from '../middleware/project.js';
import { STEP, endPosition, placeAt } from '../utils/order.js';
import { logActivity } from '../services/activity.js';
import { emitProject } from '../services/realtime.js';
import { serializeCard, serializeLabel } from '../utils/serialize.js';

const MAX_COLUMNS = 30;
const MAX_CARDS = 1000; // active cards per project, keeps the free database comfortable

const str = (v) => (typeof v === 'string' ? v.trim() : '');
const int = (v) => (Number.isInteger(v) ? v : null);

// Column and label changes are rare and touch several things, so other browsers simply reload the board.
const reload = (req) => emitProject(req.project._id, 'board.reload', {}, req.user._id);

export const DEFAULT_COLUMNS = ['To Do', 'In Progress', 'Done'];

export function createDefaultColumns(projectId) {
  return Column.insertMany(DEFAULT_COLUMNS.map((name, i) => ({ project: projectId, name, position: STEP * (i + 1), isDone: name === 'Done' })));
}

const serializeColumn = (c) => ({ id: c._id, name: c.name, position: c.position, isDone: !!c.isDone });

export async function getBoard(req, res) {
  const [columns, cards, labels] = await Promise.all([
    Column.find({ project: req.project._id, archivedAt: null }).sort({ position: 1 }),
    Card.find({ project: req.project._id, archivedAt: null }).sort({ position: 1 }),
    Label.find({ project: req.project._id }).sort({ name: 1 }),
  ]);
  res.json({ columns: columns.map(serializeColumn), cards: cards.map(serializeCard), labels: labels.map(serializeLabel) });
}

// Loads a column of this project or answers 404. Returns null when it already responded.
async function findColumn(req, res, id) {
  const column = OBJECT_ID.test(id) ? await Column.findOne({ _id: id, project: req.project._id, archivedAt: null }) : null;
  if (!column) res.status(404).json({ message: 'Column not found' });
  return column;
}
async function findCard(req, res) {
  const { cardId } = req.params;
  const card = OBJECT_ID.test(cardId) ? await Card.findOne({ _id: cardId, project: req.project._id, archivedAt: null }) : null;
  if (!card) res.status(404).json({ message: 'Card not found' });
  return card;
}

function validName(res, name) {
  if (!name || name.length > 40) {
    res.status(400).json({ message: 'Check the highlighted fields', errors: { name: 'Enter a name up to 40 characters' } });
    return false;
  }
  return true;
}
function validTitle(res, title) {
  if (!title || title.length > 200) {
    res.status(400).json({ message: 'Check the highlighted fields', errors: { title: 'Enter a title up to 200 characters' } });
    return false;
  }
  return true;
}

// ---- Columns (admin and above) ----

export async function createColumn(req, res) {
  const name = str(req.body.name);
  if (!validName(res, name)) return;
  const filter = { project: req.project._id, archivedAt: null };
  if ((await Column.countDocuments(filter)) >= MAX_COLUMNS) return res.status(409).json({ message: `A project can have up to ${MAX_COLUMNS} columns` });
  const column = await Column.create({ project: req.project._id, name, position: await endPosition(Column, filter) });
  await logActivity({ project: req.project, actor: req.user, type: 'column.created', data: { name } });
  await reload(req);
  res.status(201).json({ column: serializeColumn(column) });
}

export async function updateColumn(req, res) {
  const column = await findColumn(req, res, req.params.columnId);
  if (!column) return;
  let renamedFrom = null;
  let doneChanged = null;
  if (req.body.isDone !== undefined) {
    if (typeof req.body.isDone !== 'boolean') return res.status(400).json({ message: 'isDone must be true or false' });
    if (req.body.isDone !== column.isDone) doneChanged = req.body.isDone;
    column.isDone = req.body.isDone;
  }
  if (req.body.name !== undefined) {
    const name = str(req.body.name);
    if (!validName(res, name)) return;
    if (name !== column.name) renamedFrom = column.name;
    column.name = name;
  }
  if (req.body.index !== undefined) {
    const index = int(req.body.index);
    if (index === null || index < 0) return res.status(400).json({ message: 'Invalid position' });
    column.position = await placeAt(Column, { project: req.project._id, archivedAt: null }, column._id, index);
  }
  await column.save();
  // Changing what counts as done completes or reopens the tasks already in the column.
  if (doneChanged === true) await Card.updateMany({ column: column._id, archivedAt: null, completedAt: null }, { completedAt: new Date() });
  if (doneChanged === false) await Card.updateMany({ column: column._id, archivedAt: null }, { completedAt: null });
  if (renamedFrom) await logActivity({ project: req.project, actor: req.user, type: 'column.renamed', data: { from: renamedFrom, to: column.name } });
  await reload(req);
  res.json({ column: serializeColumn(column) });
}

// Deleting a column is a soft delete. Its cards must go somewhere: moved to another column or archived with it.
export async function deleteColumn(req, res) {
  const column = await findColumn(req, res, req.params.columnId);
  if (!column) return;
  const filter = { project: req.project._id, archivedAt: null };
  if ((await Column.countDocuments(filter)) <= 1) return res.status(409).json({ message: 'A project needs at least one column' });

  const cardFilter = { column: column._id, archivedAt: null };
  const count = await Card.countDocuments(cardFilter);
  if (count) {
    const { moveTo } = req.query;
    if (moveTo) {
      const target = await findColumn(req, res, String(moveTo));
      if (!target) return;
      if (target._id.equals(column._id)) return res.status(400).json({ message: 'Choose a different column' });
      const cards = await Card.find(cardFilter).sort({ position: 1 }).select('_id');
      const base = await endPosition(Card, { column: target._id, archivedAt: null });
      await Card.bulkWrite(cards.map((c, k) => ({ updateOne: { filter: { _id: c._id }, update: { column: target._id, position: base + STEP * k } } })));
      const moved = cards.map((c) => c._id);
      if (target.isDone) await Card.updateMany({ _id: { $in: moved }, completedAt: null }, { completedAt: new Date() });
      else await Card.updateMany({ _id: { $in: moved } }, { completedAt: null });
    } else if (req.query.archiveCards === '1') {
      await Card.updateMany(cardFilter, { archivedAt: new Date(), archivedWithColumn: true });
    } else {
      return res.status(409).json({ message: 'This column has cards. Move them to another column or archive them.', cardCount: count });
    }
  }
  column.archivedAt = new Date();
  await column.save();
  await logActivity({ project: req.project, actor: req.user, type: 'column.deleted', data: { name: column.name, cards: count } });
  await reload(req);
  res.json({ ok: true });
}

// ---- Cards (member and above) ----

export async function createCard(req, res) {
  const title = str(req.body.title);
  if (!validTitle(res, title)) return;
  const column = await findColumn(req, res, str(req.body.columnId));
  if (!column) return;
  if ((await Card.countDocuments({ project: req.project._id, archivedAt: null })) >= MAX_CARDS) {
    return res.status(409).json({ message: `A project can have up to ${MAX_CARDS} active cards. Archive some first.` });
  }
  const filter = { column: column._id, archivedAt: null };
  const index = int(req.body.index);
  const state = {};
  const position = index === null ? await endPosition(Card, filter) : await placeAt(Card, filter, null, index, state);
  const card = await Card.create({ project: req.project._id, column: column._id, title, position, createdBy: req.user._id, watchers: [req.user._id], completedAt: column.isDone ? new Date() : null });
  await logActivity({ project: req.project, actor: req.user, type: 'card.created', card, data: { column: column.name } });
  if (state.renumbered) await reload(req);
  else await emitProject(req.project._id, 'card.upsert', { card: serializeCard(card) }, req.user._id);
  res.status(201).json({ card: serializeCard(card) });
}

export async function moveCard(req, res) {
  const card = await findCard(req, res);
  if (!card) return;
  const column = await findColumn(req, res, str(req.body.columnId));
  if (!column) return;
  const index = int(req.body.index);
  if (index === null || index < 0) return res.status(400).json({ message: 'Invalid position' });
  const state = {};
  const fromColumn = String(card.column) !== String(column._id) ? await Column.findById(card.column).select('name') : null;
  card.column = column._id;
  // Entering a done column completes the task; leaving it reopens it. Moving between two done columns keeps the date.
  card.completedAt = column.isDone ? card.completedAt || new Date() : null;
  card.position = await placeAt(Card, { column: column._id, archivedAt: null }, card._id, index, state);
  await card.save();
  // Final index in the column, so other browsers can place the card without knowing our positions.
  const at = await Card.countDocuments({ column: column._id, archivedAt: null, _id: { $ne: card._id }, position: { $lt: card.position } });
  if (fromColumn) await logActivity({ project: req.project, actor: req.user, type: 'card.moved', card, data: { from: fromColumn.name, to: column.name } });
  if (state.renumbered) await reload(req);
  else await emitProject(req.project._id, 'card.moved', { card: serializeCard(card), index: at }, req.user._id);
  res.json({ card: serializeCard(card), index: at });
}

export async function archiveCard(req, res) {
  const card = await findCard(req, res);
  if (!card) return;
  card.archivedAt = new Date();
  await card.save();
  await logActivity({ project: req.project, actor: req.user, type: 'card.archived', card });
  await emitProject(req.project._id, 'card.removed', { cardId: String(card._id) }, req.user._id);
  res.json({ ok: true });
}
