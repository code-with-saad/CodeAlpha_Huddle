import Card from '../models/Card.js';
import Comment from '../models/Comment.js';
import { OBJECT_ID } from '../middleware/project.js';
import { atLeast } from '../utils/roles.js';
import { mentionedMemberIds } from '../utils/mentions.js';
import { serializeComment } from '../utils/serialize.js';
import { loadCard } from './cardController.js';

const str = (v) => (typeof v === 'string' ? v.trim() : '');
const invalid = (res) => res.status(400).json({ message: 'Check the highlighted fields', errors: { body: 'Enter a comment up to 2,000 characters' } });

export async function addComment(req, res) {
  const card = await loadCard(req, res);
  if (!card) return;
  const body = str(req.body.body);
  if (!body || body.length > 2000) return invalid(res);
  const comment = await Comment.create({
    project: req.project._id,
    card: card._id,
    author: req.user._id,
    body,
    mentions: await mentionedMemberIds(body, req.project),
  });
  await Card.updateOne({ _id: card._id }, { $inc: { commentCount: 1 } });
  res.status(201).json({ comment: serializeComment(comment) });
}

async function findComment(req, res) {
  const { commentId, cardId } = req.params;
  const comment = OBJECT_ID.test(commentId) && OBJECT_ID.test(cardId) ? await Comment.findOne({ _id: commentId, card: cardId, project: req.project._id }) : null;
  if (!comment) res.status(404).json({ message: 'Comment not found' });
  return comment;
}

// Only the author edits a comment.
export async function editComment(req, res) {
  const comment = await findComment(req, res);
  if (!comment) return;
  if (!comment.author.equals(req.user._id)) return res.status(403).json({ message: 'You can only edit your own comments' });
  const body = str(req.body.body);
  if (!body || body.length > 2000) return invalid(res);
  comment.body = body;
  comment.mentions = await mentionedMemberIds(body, req.project);
  comment.editedAt = new Date();
  await comment.save();
  res.json({ comment: serializeComment(comment) });
}

// The author or an admin removes a comment.
export async function deleteComment(req, res) {
  const comment = await findComment(req, res);
  if (!comment) return;
  if (!comment.author.equals(req.user._id) && !atLeast(req.role, 'admin')) return res.status(403).json({ message: 'You can only delete your own comments' });
  await comment.deleteOne();
  await Card.updateOne({ _id: comment.card, commentCount: { $gt: 0 } }, { $inc: { commentCount: -1 } });
  res.json({ ok: true });
}
