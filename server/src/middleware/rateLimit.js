import rateLimit from 'express-rate-limit';

// Brute-force protection for credential endpoints. In-memory per serverless
// instance, so it is best-effort on Vercel.
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many attempts. Try again in a few minutes.' },
});
