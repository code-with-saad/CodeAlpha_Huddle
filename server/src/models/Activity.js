import mongoose from 'mongoose';

// One line of the project history: who did what, and when. Written after each meaningful change.
export const ACTIVITY_TYPES = [
  'card.created', 'card.moved', 'card.renamed', 'card.archived', 'card.restored', 'card.duplicated',
  'card.assigned', 'card.unassigned', 'card.priority', 'card.due', 'card.commented', 'card.attached', 'card.bulk',
  'column.created', 'column.renamed', 'column.deleted', 'column.restored',
  'member.joined', 'member.removed', 'member.role',
  'project.updated', 'project.archived', 'project.restored',
];

const activitySchema = new mongoose.Schema(
  {
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ACTIVITY_TYPES, required: true },
    card: { type: mongoose.Schema.Types.ObjectId, ref: 'Card', default: null },
    // Names are copied so the log still reads correctly after a card is renamed or archived.
    cardTitle: { type: String, default: '', maxlength: 200 },
    data: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

activitySchema.index({ project: 1, createdAt: -1 });
activitySchema.index({ project: 1, actor: 1, createdAt: -1 });
activitySchema.index({ project: 1, card: 1, createdAt: -1 });
// The log keeps six months.
activitySchema.index({ createdAt: 1 }, { expireAfterSeconds: 180 * 24 * 3600 });

export default mongoose.models.Activity || mongoose.model('Activity', activitySchema);
