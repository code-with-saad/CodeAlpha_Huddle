import mongoose from 'mongoose';

const cardSchema = new mongoose.Schema(
  {
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
    column: { type: mongoose.Schema.Types.ObjectId, ref: 'Column', required: true },
    title: { type: String, required: true, trim: true, minlength: 1, maxlength: 200 },
    position: { type: Number, required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    // Soft delete. archivedWithColumn lets a restored column bring its cards back.
    archivedAt: { type: Date, default: null },
    archivedWithColumn: { type: Boolean, default: false },
  },
  { timestamps: true }
);

cardSchema.index({ project: 1, archivedAt: 1 });
cardSchema.index({ column: 1, archivedAt: 1, position: 1 });

export default mongoose.models.Card || mongoose.model('Card', cardSchema);
