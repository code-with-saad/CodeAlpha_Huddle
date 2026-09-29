import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import { signToken } from '../middleware/auth.js';
import { isOwnImage } from '../utils/cloudinary.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_RE = /^[a-z0-9_]{3,20}$/;
// Names that would collide with routes or impersonate staff.
const RESERVED = new Set(['admin', 'me', 'api', 'support', 'huddle', 'login', 'register', 'settings', 'profile', 'notifications', 'projects']);
// Compared against when the email is unknown so response time does not reveal which emails exist.
const DUMMY_HASH = bcrypt.hashSync('huddle-dummy-password', 12);

// Inputs must be plain strings; this blocks NoSQL operator injection like {"$gt": ""}.
const str = (v) => (typeof v === 'string' ? v.trim() : '');
const pass = (v) => (typeof v === 'string' ? v : '');
const validPassword = (p) => p.length >= 8 && p.length <= 72;

const session = (user) => ({ token: signToken(user._id), user: user.toSelf() });

export async function register(req, res) {
  const username = str(req.body.username).toLowerCase();
  const email = str(req.body.email).toLowerCase();
  const password = pass(req.body.password);
  const name = str(req.body.name).slice(0, 40);

  const errors = {};
  if (!USERNAME_RE.test(username)) errors.username = '3 to 20 characters: letters, numbers, underscore';
  else if (RESERVED.has(username)) errors.username = 'That username is reserved';
  if (!EMAIL_RE.test(email) || email.length > 254) errors.email = 'Enter a valid email';
  if (!validPassword(password)) errors.password = 'Use 8 to 72 characters';
  if (Object.keys(errors).length) return res.status(400).json({ message: 'Check the highlighted fields', errors });

  const taken = await User.findOne({ $or: [{ username }, { email }] }).select('username email');
  if (taken) {
    const field = taken.username === username ? 'username' : 'email';
    return res.status(409).json({ message: `That ${field} is already in use`, errors: { [field]: `That ${field} is already in use` } });
  }

  const user = await User.create({ username, email, name, password: await bcrypt.hash(password, 12) });
  res.status(201).json(session(user));
}

export async function login(req, res) {
  const email = str(req.body.email).toLowerCase();
  const password = pass(req.body.password);
  if (!email || !password) return res.status(400).json({ message: 'Email and password are required' });

  const user = await User.findOne({ email }).select('+password');
  const ok = await bcrypt.compare(password, user ? user.password : DUMMY_HASH);
  if (!user || !ok) return res.status(401).json({ message: 'Incorrect email or password' });
  res.json(session(user));
}

export const me = (req, res) => res.json({ user: req.user.toSelf() });

export async function updateProfile(req, res) {
  const errors = {};
  if (req.body.name !== undefined) {
    const name = str(req.body.name);
    if (name.length > 40) errors.name = 'Use 40 characters or fewer';
    else req.user.name = name;
  }
  if (req.body.avatar !== undefined) {
    if (req.body.avatar === '' || isOwnImage(req.body.avatar)) req.user.avatar = req.body.avatar;
    else errors.avatar = 'Invalid image';
  }
  if (Object.keys(errors).length) return res.status(400).json({ message: 'Check the highlighted fields', errors });
  await req.user.save();
  res.json({ user: req.user.toSelf() });
}

export async function changePassword(req, res) {
  const current = pass(req.body.currentPassword);
  const next = pass(req.body.newPassword);
  if (!validPassword(next)) return res.status(400).json({ message: 'Check the highlighted fields', errors: { newPassword: 'Use 8 to 72 characters' } });

  const user = await User.findById(req.user._id).select('+password');
  if (!(await bcrypt.compare(current, user.password))) {
    return res.status(400).json({ message: 'Current password is wrong', errors: { currentPassword: 'Current password is wrong' } });
  }
  user.password = await bcrypt.hash(next, 12);
  // Backdate by a second so the token issued below is not itself invalidated (iat has 1s resolution).
  user.passwordChangedAt = new Date(Date.now() - 1000);
  await user.save();
  res.json(session(user));
}
