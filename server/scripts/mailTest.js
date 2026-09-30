// npm run mail:test -- you@example.com
// Sends one real test email with the SMTP settings from .env, so you can check them before inviting people.
import 'dotenv/config';
import { mailConfigured, sendMail } from '../src/services/mail.js';

const to = process.argv[2];
if (!to) {
  console.error('Usage: npm run mail:test -- you@example.com');
  process.exit(1);
}
if (!mailConfigured()) {
  console.error('SMTP_USER and SMTP_PASS are not set in server/.env');
  process.exit(1);
}
try {
  await sendMail({ to, subject: 'Huddle email check', text: 'If you can read this, invitation emails from Huddle work.', html: '<p>If you can read this, invitation emails from Huddle work.</p>' });
  console.log(`Sent a test email to ${to}. Check the inbox and the spam folder.`);
} catch (err) {
  console.error('Sending failed:', err.message);
  process.exit(1);
}
