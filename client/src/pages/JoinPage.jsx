import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Wordmark } from '../components/Logo.jsx';
import RoleBadge from '../components/RoleBadge.jsx';
import { api, errorMessage } from '../lib/api.js';
import { toast } from '../lib/toast.js';
import './auth.css';

// Landing page for a shared invite link. RequireAuth sends signed-out visitors to log in and back here.
export default function JoinPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api
      .get(`/invite-links/${encodeURIComponent(token)}`)
      .then(({ data }) => setPreview(data))
      .catch((err) => setError(err.response?.status === 404 ? 'This invite link is invalid or has expired.' : errorMessage(err)));
  }, [token]);

  async function join() {
    setBusy(true);
    try {
      const { data } = await api.post(`/invite-links/${encodeURIComponent(token)}/join`);
      toast.success(`Joined ${preview.project.name}`);
      navigate(`/p/${data.projectId}`, { replace: true });
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  return (
    <main className="auth">
      <div className="auth-card">
        <Link to="/" className="wordmark auth-wordmark" aria-label="Huddle home">
          <Wordmark />
        </Link>
        {error && (
          <>
            <h1>Cannot open this invite</h1>
            <p role="alert">{error}</p>
            <Link to="/projects" className="btn">
              Go to your projects
            </Link>
          </>
        )}
        {!error && !preview && (
          <div className="loading" role="status" aria-label="Loading invite">
            <span className="spinner" />
          </div>
        )}
        {preview && (
          <>
            <h1>Join {preview.project.name}</h1>
            {preview.project.description && <p className="field-hint">{preview.project.description}</p>}
            <p>
              {preview.project.memberCount} {preview.project.memberCount === 1 ? 'member' : 'members'}.{' '}
              {preview.alreadyMember ? 'You are already in this project.' : <>You will join as <RoleBadge role={preview.role} />.</>}
            </p>
            <button type="button" className="btn btn-primary" onClick={join} disabled={busy}>
              {busy && <span className="spinner" aria-hidden="true" />}
              {preview.alreadyMember ? 'Open project' : 'Join project'}
            </button>
          </>
        )}
      </div>
    </main>
  );
}
