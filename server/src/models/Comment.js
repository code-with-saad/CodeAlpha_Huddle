import mongoose from 'mongoose';

const commentSchema = new mongoose.Schema(
  {
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
    card: { type: mongoose.Schema.Types.ObjectId, ref: 'Card', required: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    // A reply points at the top level comment it answers. Threads are one level deep.
    parent: { type: mongoose.Schema.Types.ObjectId, ref: 'Comment', default: null },
    body: { type: String, required: true, trim: true, minlength: 1, maxlength: 2000 },
    // Project members named with @username in the body. Notifications use this in a later phase.
    mentions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    editedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

commentSchema.index({ card: 1, createdAt: 1 });

export default mongoose.models.Comment || mongoose.model('Comment', commentSchema);
