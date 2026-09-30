import mongoose from 'mongoose';

export const NOTIFICATION_TYPES = ['assigned', 'mentioned', 'comment', 'due_soon', 'overdue', 'invited'];

const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: NOTIFICATION_TYPES, required: true },
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', default: null },
    card: { type: mongoose.Schema.Types.ObjectId, ref: 'Card', default: null },
    // Names are copied so the list renders without extra lookups and still reads well later.
    projectName: { type: String, default: '', maxlength: 80 },
    cardTitle: { type: String, default: '', maxlength: 200 },
    snippet: { type: String, default: '', maxlength: 200 },
    // Makes time-based notifications idempotent: one per person per card per due date.
    key: { type: String, default: null },
    readAt: { type: Date, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

notificationSchema.index({ user: 1, createdAt: -1 });
notificationSchema.index({ user: 1, readAt: 1 });
notificationSchema.index({ user: 1, key: 1 }, { unique: true, partialFilterExpression: { key: { $type: 'string' } } });
// Old notifications clean themselves up after 60 days.
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 24 * 3600 });

export default mongoose.models.Notification || mongoose.model('Notification', notificationSchema);
