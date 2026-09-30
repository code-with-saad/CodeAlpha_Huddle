import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth.jsx';
import { errorMessage, fieldErrors } from '../lib/api.js';
import './auth.css';

// One page for both modes so the form fields and error handling stay in one place.
export default function AuthPage({ mode }) {
  const isRegister = mode === 'register';
  const { user, status, login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ name: '', username: '', email: '', password: '' });
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');
  const [fields, setFields] = useState({});

  if (status === 'in' && user) return <Navigate to={location.state?.from || '/projects'} replace />;

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setFormError('');
    setFields({});
    try {
      if (isRegister) await register(form);
      else await login({ email: form.email, password: form.password });
      navigate(location.state?.from || '/projects', { replace: true });
    } catch (err) {
      setFormError(errorMessage(err));
      setFields(fieldErrors(err));
      setBusy(false);
    }
  }

  const field = (key, label, props = {}) => (
    <label className="field">
      <span className="field-label">{label}</span>
      <input
        className="input"
        value={form[key]}
        onChange={set(key)}
        aria-invalid={fields[key] ? 'true' : undefined}
        aria-describedby={fields[key] ? `${key}-error` : undefined}
        {...props}
      />
      {fields[key] && (
        <span id={`${key}-error`} className="field-error">
          {fields[key]}
        </span>
      )}
    </label>
  );

  return (
    <main className="auth">
      <div className="auth-card">
        <Link to="/" className="wordmark auth-wordmark">
          Huddle
        </Link>
        <h1>{isRegister ? 'Create your account' : 'Log in'}</h1>

        <form className="auth-form" onSubmit={submit} noValidate>
          {formError && !Object.keys(fields).length && (
            <p className="form-error" role="alert">
              {formError}
            </p>
          )}
          {isRegister && field('name', 'Name', { autoComplete: 'name', maxLength: 40 })}
          {isRegister && field('username', 'Username', { autoComplete: 'username', maxLength: 20, autoCapitalize: 'none' })}
          {field('email', 'Email', { type: 'email', autoComplete: 'email' })}
          {field('password', 'Password', { type: 'password', autoComplete: isRegister ? 'new-password' : 'current-password' })}
          {isRegister && <p className="field-hint">At least 8 characters.</p>}

          <button className="btn btn-primary" disabled={busy}>
            {busy && <span className="spinner" aria-hidden="true" />}
            {isRegister ? 'Create account' : 'Log in'}
          </button>
        </form>

        {isRegister && (
          <p className="auth-legal">
            By creating an account you agree to the <Link to="/terms">Terms of Service</Link> and the <Link to="/privacy">Privacy Policy</Link>.
          </p>
        )}
        <p className="auth-switch">
          {isRegister ? (
            <>
              Already have an account? <Link to="/login">Log in</Link>
            </>
          ) : (
            <>
              New to Huddle? <Link to="/register">Create an account</Link>
            </>
          )}
        </p>
      </div>
    </main>
  );
}
