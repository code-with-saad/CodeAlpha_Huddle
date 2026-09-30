import mongoose from 'mongoose';

// Labels belong to a project. The colour is chosen by the person who creates the label.
const labelSchema = new mongoose.Schema(
  {
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    name: { type: String, required: true, trim: true, minlength: 1, maxlength: 30 },
    color: { type: String, required: true, match: /^#[0-9a-f]{6}$/i },
  },
  { timestamps: true }
);

export default mongoose.models.Label || mongoose.model('Label', labelSchema);
