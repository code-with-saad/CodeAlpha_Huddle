import mongoose from 'mongoose';

export const PRIORITIES = ['none', 'low', 'medium', 'high', 'urgent'];

const checklistItem = new mongoose.Schema(
  {
    text: { type: String, required: true, trim: true, maxlength: 200 },
    done: { type: Boolean, default: false },
  },
  { timestamps: false }
);

const attachment = new mongoose.Schema(
  {
    url: { type: String, required: true, maxlength: 500 },
    name: { type: String, required: true, trim: true, maxlength: 200 },
    size: { type: Number, default: 0 },
    mime: { type: String, default: '', maxlength: 100 },
    // Kept so the file can be removed from Cloudinary when the attachment is deleted.
    publicId: { type: String, default: '', maxlength: 300 },
    resourceType: { type: String, default: 'image', maxlength: 20 },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    createdAt: { type: Date, default: Date.now },
  }
);

const cardSchema = new mongoose.Schema(
  {
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
    column: { type: mongoose.Schema.Types.ObjectId, ref: 'Column', required: true },
    title: { type: String, required: true, trim: true, minlength: 1, maxlength: 200 },
    position: { type: Number, required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    description: { type: String, default: '', maxlength: 10000 },
    assignees: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    labels: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Label' }],
    priority: { type: String, enum: PRIORITIES, default: 'none' },
    // Calendar date stored at 00:00 UTC; the UI treats it as a plain date.
    dueDate: { type: Date, default: null },
    checklist: { type: [checklistItem], default: [] },
    attachments: { type: [attachment], default: [] },
    commentCount: { type: Number, default: 0 },

    // Soft delete. archivedWithColumn lets a restored column bring its cards back.
    archivedAt: { type: Date, default: null },
    archivedWithColumn: { type: Boolean, default: false },
  },
  { timestamps: true }
);

cardSchema.index({ project: 1, archivedAt: 1 });
cardSchema.index({ column: 1, archivedAt: 1, position: 1 });

export default mongoose.models.Card || mongoose.model('Card', cardSchema);
