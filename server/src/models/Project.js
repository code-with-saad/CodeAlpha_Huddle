import mongoose from 'mongoose';
import { ROLES } from '../utils/roles.js';

const memberSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, enum: ROLES, required: true },
    joinedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const projectSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 1, maxlength: 80 },
    description: { type: String, trim: true, maxlength: 500, default: '' },
    // The owner is a member with role "owner"; there is always exactly one.
    members: { type: [memberSchema], default: [] },
    // Soft delete: archived projects are hidden and read-only, never removed.
    archivedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

projectSchema.index({ 'members.user': 1, archivedAt: 1 });

export default mongoose.models.Project || mongoose.model('Project', projectSchema);
