import mongoose from 'mongoose';

// Two kinds share one collection:
//  - "user": a pending invitation for one existing account (found by username or email)
//  - "link": a shareable token anyone signed in can use until it is revoked or expires
const inviteSchema = new mongoose.Schema(
  {
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    kind: { type: String, enum: ['user', 'link'], required: true },
    invitee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    token: { type: String, default: null },
    role: { type: String, enum: ['admin', 'member', 'viewer'], required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: ['pending', 'accepted', 'declined', 'revoked'], default: 'pending' },
    expiresAt: { type: Date, default: null },
    uses: { type: Number, default: 0 },
  },
  { timestamps: true }
);

inviteSchema.index({ token: 1 }, { unique: true, partialFilterExpression: { token: { $type: 'string' } } });
inviteSchema.index({ invitee: 1, status: 1 });
// One open invitation per person per project.
inviteSchema.index(
  { project: 1, invitee: 1 },
  { unique: true, partialFilterExpression: { kind: 'user', status: 'pending' } }
);

export default mongoose.models.Invite || mongoose.model('Invite', inviteSchema);
