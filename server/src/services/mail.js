import fs from 'node:fs';
import nodemailer from 'nodemailer';

// Invitation emails go out through a Gmail account using an app password (SMTP, free, no card).
//   SMTP_USER       the Gmail address that sends the mail
//   SMTP_PASS       a Google app password for it (spaces are ignored)
//   SMTP_FROM_NAME  display name, default "Huddle"
// MAIL_DRY_RUN=1 writes messages to mail-outbox.log instead of sending, for tests.
const dry = () => process.env.MAIL_DRY_RUN === '1';
export const mailConfigured = () => dry() || !!(process.env.SMTP_USER && process.env.SMTP_PASS);

let transport = null;
function getTransport() {
  transport ??= nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT) || 465,
    secure: (Number(process.env.SMTP_PORT) || 465) === 465,
    auth: { user: process.env.SMTP_USER, pass: String(process.env.SMTP_PASS).replace(/\s+/g, '') },
    // A function that is waiting on a mail server can be killed by the platform, so give up early.
    connectionTimeout: 8000,
    greetingTimeout: 8000,
    socketTimeout: 12000,
  });
  return transport;
}

// The base address used in links inside emails: the first allowed client origin.
export const appUrl = () => (process.env.APP_URL || (process.env.CLIENT_URL || 'http://localhost:5173').split(',')[0]).trim().replace(/\/$/, '');

export const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

// Sends one message. Throws when the mail server refuses or times out, so the caller can say so.
export async function sendMail({ to, subject, text, html }) {
  if (dry()) {
    fs.appendFileSync(new URL('../../mail-outbox.log', import.meta.url), `${JSON.stringify({ to, subject, text, html, at: new Date().toISOString() })}\n`);
    return;
  }
  const name = (process.env.SMTP_FROM_NAME || 'Huddle').replace(/["<>\r\n]/g, '');
  await getTransport().sendMail({ from: `"${name}" <${process.env.SMTP_USER}>`, to, subject, text, html });
}

export function inviteEmail({ inviter, project, role, url, expires }) {
  const subject = `${inviter} invited you to ${project} on Huddle`;
  const article = /^[aeiou]/i.test(role) ? 'an' : 'a';
  const text = [
    `${inviter} invited you to join the project "${project}" on Huddle as ${article} ${role}.`,
    '',
    `Open this link to join: ${url}`,
    expires ? `The link works until ${expires}.` : '',
    '',
    'If you were not expecting this, you can ignore this email. Nothing happens unless you open the link and sign in or create an account.',
  ].filter((l, i, a) => l || a[i - 1] !== '').join('\n');
  const html = `<p>${escapeHtml(inviter)} invited you to join the project <strong>${escapeHtml(project)}</strong> on Huddle as ${article} ${escapeHtml(role)}.</p>
<p><a href="${escapeHtml(url)}">Join ${escapeHtml(project)}</a></p>
${expires ? `<p>The link works until ${escapeHtml(expires)}.</p>` : ''}
<p>If you were not expecting this, you can ignore this email. Nothing happens unless you open the link and sign in or create an account.</p>`;
  return { subject, text, html };
}
