import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/auth.jsx';

export default function RequireAuth({ children }) {
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'loading') {
    return (
      <div className="centered" role="status" aria-label="Loading">
        <div className="progress" />
        <span className="spinner" />
      </div>
    );
  }
  if (status === 'error') {
    return (
      <div className="centered">
        <p>Cannot reach the server. Check your connection and reload.</p>
        <button type="button" className="btn" onClick={() => window.location.reload()}>
          Reload
        </button>
      </div>
    );
  }
  if (status === 'out') return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return children;
}
