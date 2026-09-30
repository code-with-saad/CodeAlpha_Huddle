import { useEffect, useState } from 'react';
import LegalLayout from './LegalLayout.jsx';
import { CONTACT } from './SiteChrome.jsx';
import { api, errorMessage, fieldErrors } from '../../lib/api.js';
import { toast } from '../../lib/toast.js';

// A plain contact form. The message is emailed to the owner; the sender's address is set as the reply address.
export default function Contact() {
  const [form, setForm] = useState({ name: '', email: '', message: '', website: '' }); // "website" is a honeypot for bots
  const [enabled, setEnabled] = useState(true);
  const [busy, setBusy] = useState(false);
  const [fields, setFields] = useState({});
  const [sent, setSent] = useState(false);

  useEffect(() => {
    api.get('/contact').then(({ data }) => setEnabled(!!data.enabled)).catch(() => setEnabled(false));
  }, []);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setFields({});
    try {
      await api.post('/contact', form);
      setSent(true);
      toast.success('Message sent. Thank you, we will reply by email.');
    } catch (err) {
      setFields(fieldErrors(err));
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <LegalLayout title="Contact" showDate={false}>
      <p>
        Questions, bug reports and ideas are welcome. You can write to <a href={`mailto:${CONTACT}`}>{CONTACT}</a>{enabled ? ' or use the form below' : ''}. For a bug, tell us what you did, what you expected, and which browser and screen size you used.
      </p>

      {sent ? (
        <p className="form-ok" role="status">
          Your message was sent. We will answer at the address you gave.
        </p>
      ) : enabled ? (
        <form className="contact-form" onSubmit={submit} noValidate>
          <label className="field">
            <span className="field-label">Your name</span>
            <input className="input" value={form.name} onChange={set('name')} maxLength={80} autoComplete="name" aria-invalid={fields.name ? 'true' : undefined} />
            {fields.name && <span className="field-error">{fields.name}</span>}
          </label>
          <label className="field">
            <span className="field-label">Your email</span>
            <input className="input" type="email" value={form.email} onChange={set('email')} maxLength={254} autoComplete="email" aria-invalid={fields.email ? 'true' : undefined} />
            {fields.email && <span className="field-error">{fields.email}</span>}
          </label>
          <label className="field">
            <span className="field-label">Message</span>
            <textarea className="input" rows={6} value={form.message} onChange={set('message')} maxLength={3000} aria-invalid={fields.message ? 'true' : undefined} />
            {fields.message && <span className="field-error">{fields.message}</span>}
          </label>
          {/* Real visitors never see or fill this. */}
          <label className="visually-hidden" aria-hidden="true">
            Leave this empty
            <input tabIndex={-1} autoComplete="off" value={form.website} onChange={set('website')} />
          </label>
          <div>
            <button className="btn btn-primary" disabled={busy}>
              {busy && <span className="spinner" aria-hidden="true" />}
              Send message
            </button>
          </div>
        </form>
      ) : (
        <p className="row-sub">The contact form is not available right now. Please use the email address above.</p>
      )}
    </LegalLayout>
  );
}
