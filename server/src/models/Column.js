import mongoose from 'mongoose';

const columnSchema = new mongoose.Schema(
  {
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
    name: { type: String, required: true, trim: true, minlength: 1, maxlength: 40 },
    // Fractional order key: moving an item only rewrites that one document.
    position: { type: Number, required: true },
    // A task in a column that counts as done is completed. Moving it out reopens it.
    isDone: { type: Boolean, default: false },
    archivedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

columnSchema.index({ project: 1, archivedAt: 1, position: 1 });

export default mongoose.models.Column || mongoose.model('Column', columnSchema);
