import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { escapeHtml, mailConfigured, sendMail } from '../services/mail.js';

const router = Router();
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const str = (v) => (typeof v === 'string' ? v.trim() : '');
const limiter = rateLimit({ windowMs: 60 * 60 * 1000, limit: 5, standardHeaders: true, legacyHeaders: false, message: { message: 'You have sent several messages already. Please try again later.' } });

// Tells the contact page whether the form can be used (it needs mail to be set up).
router.get('/', (_req, res) => res.json({ enabled: mailConfigured() }));

// Public contact form: the message is emailed to the owner, with the sender's address as the reply address.
router.post('/', limiter, async (req, res) => {
  // Bots fill every field. A real visitor never sees this one, so pretend it worked and send nothing.
  if (str(req.body.website)) return res.json({ ok: true });
  if (!mailConfigured()) return res.status(503).json({ message: 'The contact form is not available right now. Please email us instead.' });

  const name = str(req.body.name);
  const email = str(req.body.email).toLowerCase();
  const message = str(req.body.message);
  const errors = {};
  if (!name || name.length > 80) errors.name = 'Enter your name';
  if (!EMAIL_RE.test(email) || email.length > 254) errors.email = 'Enter a valid email address';
  if (message.length < 5 || message.length > 3000) errors.message = 'Write a message of 5 to 3000 characters';
  if (Object.keys(errors).length) return res.status(400).json({ message: 'Check the highlighted fields', errors });

  try {
    await sendMail({
      to: process.env.CONTACT_TO || 'xyroxx02@gmail.com',
      replyTo: `"${name.replace(/["<>\r\n]/g, '')}" <${email}>`,
      subject: `Huddle contact from ${name.replace(/[\r\n]/g, ' ')}`,
      text: `From: ${name} <${email}>\n\n${message}`,
      html: `<p><strong>${escapeHtml(name)}</strong> (${escapeHtml(email)}) wrote:</p><p style="white-space:pre-wrap">${escapeHtml(message)}</p>`,
    });
  } catch (err) {
    console.error('contact email failed:', err.message);
    return res.status(502).json({ message: 'Your message could not be sent. Please try again, or email us directly.' });
  }
  res.json({ ok: true });
});

export default router;
