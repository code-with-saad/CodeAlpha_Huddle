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

  // A reply answers a top level comment on this card. Replying to a reply attaches to the same thread.
  let parent = null;
  if (req.body.parentId !== undefined && req.body.parentId !== null) {
    const found = typeof req.body.parentId === 'string' && OBJECT_ID.test(req.body.parentId) ? await Comment.findOne({ _id: req.body.parentId, card: card._id, project: req.project._id }) : null;
    if (!found) return res.status(404).json({ message: 'The comment you are replying to no longer exists' });
    parent = found.parent ? await Comment.findById(found.parent) : found;
    if (!parent) return res.status(404).json({ message: 'The comment you are replying to no longer exists' });
  }
  const comment = await Comment.create({ project: req.project._id, card: card._id, author: req.user._id, body, mentions, parent: parent?._id || null });

  // Commenting and being mentioned both make someone follow the card.
  card.commentCount += 1;
  card.watchers.addToSet(req.user._id, ...mentions);
  await card.save();
  await announce(req, 'comment.created', card, { comment: serializeComment(comment) });
  await logActivity({ project: req.project, actor: req.user, type: 'card.commented', card, data: { snippet: body.slice(0, 120) } });

  // Mentioned people hear about it once, as a mention; other followers get a comment notification.
  // The person being answered hears about the reply once; others who follow the card get the usual comment notice.
  const mentioned = new Set(mentions.map(String));
  const replyTo = parent && !mentioned.has(String(parent.author)) ? [parent.author] : [];
  const skip = new Set([...mentioned, ...replyTo.map(String)]);
  const followers = card.watchers.filter((id) => !skip.has(String(id)));
  const ctx = { actor: req.user, project: req.project, card, snippet: body };
  await Promise.all([notify(mentions, { ...ctx, type: 'mentioned' }), notify(replyTo, { ...ctx, type: 'reply' }), notify(followers, { ...ctx, type: 'comment' })]);
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
  // Deleting a comment takes its replies with it.
  const replies = comment.parent ? [] : await Comment.find({ parent: comment._id }).select('_id');
  await Comment.deleteMany({ _id: { $in: replies.map((r) => r._id) } });
  await comment.deleteOne();
  const removed = 1 + replies.length;
  const card = await Card.findOneAndUpdate({ _id: comment.card }, [{ $set: { commentCount: { $max: [0, { $subtract: ['$commentCount', removed] }] } } }], { new: true, updatePipeline: true });
  if (card) await announce(req, 'comment.deleted', card, { commentId: String(comment._id), commentIds: [String(comment._id), ...replies.map((r) => String(r._id))] });
  res.json({ ok: true });
}
