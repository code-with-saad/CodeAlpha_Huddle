import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, lowercase: true, trim: true, minlength: 3, maxlength: 20, match: /^[a-z0-9_]+$/ },
    name: { type: String, trim: true, maxlength: 40, default: '' },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254 },
    password: { type: String, required: true, select: false },
    avatar: { type: String, default: '' },
    passwordChangedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// Never leak the hash. Email is only included for the account owner.
userSchema.methods.toPublic = function () {
  return { id: this._id, username: this.username, name: this.name || this.username, avatar: this.avatar };
};
userSchema.methods.toSelf = function () {
  return { ...this.toPublic(), email: this.email, createdAt: this.createdAt };
};

export default mongoose.models.User || mongoose.model('User', userSchema);
