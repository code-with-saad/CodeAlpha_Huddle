import Card from '../models/Card.js';
import Column from '../models/Column.js';
import Label from '../models/Label.js';
import { OBJECT_ID } from '../middleware/project.js';
import { STEP, endPosition, placeAt } from '../utils/order.js';
import { serializeCard, serializeLabel } from '../utils/serialize.js';

const MAX_COLUMNS = 30;
const MAX_CARDS = 1000; // active cards per project, keeps the free database comfortable

const str = (v) => (typeof v === 'string' ? v.trim() : '');
const int = (v) => (Number.isInteger(v) ? v : null);

export const DEFAULT_COLUMNS = ['To Do', 'In Progress', 'Done'];

export function createDefaultColumns(projectId) {
  return Column.insertMany(DEFAULT_COLUMNS.map((name, i) => ({ project: projectId, name, position: STEP * (i + 1) })));
}

const serializeColumn = (c) => ({ id: c._id, name: c.name, position: c.position });

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
  res.status(201).json({ column: serializeColumn(column) });
}

export async function updateColumn(req, res) {
  const column = await findColumn(req, res, req.params.columnId);
  if (!column) return;
  if (req.body.name !== undefined) {
    const name = str(req.body.name);
    if (!validName(res, name)) return;
    column.name = name;
  }
  if (req.body.index !== undefined) {
    const index = int(req.body.index);
    if (index === null || index < 0) return res.status(400).json({ message: 'Invalid position' });
    column.position = await placeAt(Column, { project: req.project._id, archivedAt: null }, column._id, index);
  }
  await column.save();
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
    } else if (req.query.archiveCards === '1') {
      await Card.updateMany(cardFilter, { archivedAt: new Date(), archivedWithColumn: true });
    } else {
      return res.status(409).json({ message: 'This column has cards. Move them to another column or archive them.', cardCount: count });
    }
  }
  column.archivedAt = new Date();
  await column.save();
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
  const position = index === null ? await endPosition(Card, filter) : await placeAt(Card, filter, null, index);
  const card = await Card.create({ project: req.project._id, column: column._id, title, position, createdBy: req.user._id });
  res.status(201).json({ card: serializeCard(card) });
}

export async function moveCard(req, res) {
  const card = await findCard(req, res);
  if (!card) return;
  const column = await findColumn(req, res, str(req.body.columnId));
  if (!column) return;
  const index = int(req.body.index);
  if (index === null || index < 0) return res.status(400).json({ message: 'Invalid position' });
  card.column = column._id;
  card.position = await placeAt(Card, { column: column._id, archivedAt: null }, card._id, index);
  await card.save();
  res.json({ card: serializeCard(card) });
}

export async function archiveCard(req, res) {
  const card = await findCard(req, res);
  if (!card) return;
  card.archivedAt = new Date();
  await card.save();
  res.json({ ok: true });
}
