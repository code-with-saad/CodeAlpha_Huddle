import Card from '../models/Card.js';
import Label from '../models/Label.js';
import { OBJECT_ID } from '../middleware/project.js';
import { serializeLabel } from '../utils/serialize.js';

const MAX_LABELS = 30;
const str = (v) => (typeof v === 'string' ? v.trim() : '');
const COLOR_RE = /^#[0-9a-f]{6}$/i;

function validate(body, { partial }) {
  const errors = {};
  const out = {};
  if (!partial || body.name !== undefined) {
    const name = str(body.name);
    if (!name || name.length > 30) errors.name = 'Enter a name up to 30 characters';
    else out.name = name;
  }
  if (!partial || body.color !== undefined) {
    if (typeof body.color !== 'string' || !COLOR_RE.test(body.color)) errors.color = 'Pick a colour';
    else out.color = body.color.toLowerCase();
  }
  return { errors, out };
}

export async function createLabel(req, res) {
  const { errors, out } = validate(req.body, { partial: false });
  if (Object.keys(errors).length) return res.status(400).json({ message: 'Check the highlighted fields', errors });
  if ((await Label.countDocuments({ project: req.project._id })) >= MAX_LABELS) return res.status(409).json({ message: `A project can have up to ${MAX_LABELS} labels` });
  const label = await Label.create({ ...out, project: req.project._id });
  res.status(201).json({ label: serializeLabel(label) });
}

async function find(req, res) {
  const { labelId } = req.params;
  const label = OBJECT_ID.test(labelId) ? await Label.findOne({ _id: labelId, project: req.project._id }) : null;
  if (!label) res.status(404).json({ message: 'Label not found' });
  return label;
}

export async function updateLabel(req, res) {
  const label = await find(req, res);
  if (!label) return;
  const { errors, out } = validate(req.body, { partial: true });
  if (Object.keys(errors).length) return res.status(400).json({ message: 'Check the highlighted fields', errors });
  Object.assign(label, out);
  await label.save();
  res.json({ label: serializeLabel(label) });
}

// Deleting a label takes it off every card that used it.
export async function deleteLabel(req, res) {
  const label = await find(req, res);
  if (!label) return;
  await Card.updateMany({ project: req.project._id, labels: label._id }, { $pull: { labels: label._id } });
  await label.deleteOne();
  res.json({ ok: true });
}
