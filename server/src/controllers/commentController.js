import Card from '../models/Card.js';
import Comment from '../models/Comment.js';
import { OBJECT_ID } from '../middleware/project.js';
import { logActivity } from '../services/activity.js';
import { notify } from '../services/notify.js';
import { emitProject } from '../services/realtime.js';
import { atLeast } from '../utils/roles.js';
import { mentionedMemberIds } from '../utils/mentions.js';
import { serializeCard, serializeComment } from '../utils/serialize.js';
import { loadCard } from './cardController.js';

const str = (v) => (typeof v === 'string' ? v.trim() : '');
const invalid = (res) => res.status(400).json({ message: 'Check the highlighted fields', errors: { body: 'Enter a comment up to 2,000 characters' } });

// Publishes a comment change together with the card face, so counts on the board stay right.
async function announce(req, name, card, data) {
  await emitProject(req.project._id, name, { cardId: String(card._id), card: serializeCard(card), ...data }, req.user._id);
}

export async function addComment(req, res) {
  const card = await loadCard(req, res);
  if (!card) return;
  const body = str(req.body.body);
  if (!body || body.length > 2000) return invalid(res);
  const mentions = await mentionedMemberIds(body, req.project);
  const comment = await Comment.create({ project: req.project._id, card: card._id, author: req.user._id, body, mentions });

  // Commenting and being mentioned both make someone follow the card.
  card.commentCount += 1;
  card.watchers.addToSet(req.user._id, ...mentions);
  await card.save();
  await announce(req, 'comment.created', card, { comment: serializeComment(comment) });
  await logActivity({ project: req.project, actor: req.user, type: 'card.commented', card, data: { snippet: body.slice(0, 120) } });

  // Mentioned people hear about it once, as a mention; other followers get a comment notification.
  const mentioned = new Set(mentions.map(String));
  const followers = card.watchers.filter((id) => !mentioned.has(String(id)));
  const ctx = { actor: req.user, project: req.project, card, snippet: body };
  await Promise.all([notify(mentions, { ...ctx, type: 'mentioned' }), notify(followers, { ...ctx, type: 'comment' })]);
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
  const before = new Set(comment.mentions.map(String));
  comment.body = body;
  comment.mentions = await mentionedMemberIds(body, req.project);
  comment.editedAt = new Date();
  await comment.save();

  const card = await Card.findById(comment.card);
  const added = comment.mentions.filter((id) => !before.has(String(id)));
  if (card) {
    if (added.length) {
      card.watchers.addToSet(...added);
      await card.save();
    }
    await announce(req, 'comment.updated', card, { comment: serializeComment(comment) });
  }
  if (card && added.length) await notify(added, { type: 'mentioned', actor: req.user, project: req.project, card, snippet: body });
  res.json({ comment: serializeComment(comment) });
}

// The author or an admin removes a comment.
export async function deleteComment(req, res) {
  const comment = await findComment(req, res);
  if (!comment) return;
  if (!comment.author.equals(req.user._id) && !atLeast(req.role, 'admin')) return res.status(403).json({ message: 'You can only delete your own comments' });
  await comment.deleteOne();
  const card = await Card.findOneAndUpdate({ _id: comment.card, commentCount: { $gt: 0 } }, { $inc: { commentCount: -1 } }, { new: true });
  if (card) await announce(req, 'comment.deleted', card, { commentId: String(comment._id) });
  res.json({ ok: true });
}
