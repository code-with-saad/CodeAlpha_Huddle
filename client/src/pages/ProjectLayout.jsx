import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useParams } from 'react-router-dom';
import Avatar from '../components/Avatar.jsx';
import RoleBadge from '../components/RoleBadge.jsx';
import { useAuth } from '../lib/auth.jsx';
import { on } from '../lib/bus.js';
import { joinPresence } from '../lib/realtime.js';
import useChannel from '../lib/useChannel.js';
import { api, errorMessage } from '../lib/api.js';

const ProjectContext = createContext(null);
export const useProject = () => useContext(ProjectContext);

// Loads the project once for every screen under /p/:id and shares it, with a reload for after changes.
export default function ProjectLayout() {
  const { id } = useParams();
  const { user } = useAuth();
  const [project, setProject] = useState(null);
  const [error, setError] = useState(null);
  const [viewers, setViewers] = useState([]);

  const reload = useCallback(async () => {
    try {
      const { data } = await api.get(`/projects/${id}`);
      setProject(data.project);
      setError(null);
    } catch (err) {
      setError({ status: err.response?.status, message: errorMessage(err) });
    }
  }, [id]);

  useEffect(() => {
    setProject(null);
    reload();
  }, [reload]);

  // Live: name, archive state, members and roles all come from the project, so any change reloads it.
  // A role change on this account also comes through the access signal.
  useChannel(`project:${id}`, (name) => name === 'project.changed' && reload(), reload);
  useEffect(() => on('access', reload), [reload]);

  // Who else has this board open right now.
  useEffect(() => {
    setViewers([]);
    return joinPresence(`project:${id}`, { name: user.name, username: user.username, avatar: user.avatar }, setViewers);
  }, [id, user.name, user.username, user.avatar]);

  if (error) {
    return (
      <div className="empty">
        {error.status === 404 ? 'This project does not exist, or you are not a member of it.' : error.message}{' '}
        <Link to="/" className="inline-link">
          Back to projects
        </Link>
      </div>
    );
  }
  if (!project) {
    return (
      <div className="loading" role="status" aria-label="Loading project">
        <span className="spinner" />
      </div>
    );
  }

  return (
    <ProjectContext.Provider value={{ project, reload }}>
      <div className="page-head">
        <div className="title-row">
          <h1>{project.name}</h1>
          <RoleBadge role={project.myRole} />
          {project.archived && <span className="pill pill-warning">Archived</span>}
        </div>
        <div className="presence" role="group" aria-label={`Viewing now: ${viewers.map((v) => v.name).join(', ') || 'only you'}`}>
          {viewers.filter((v) => v.id !== user.id).slice(0, 5).map((v) => (
            <span key={v.id} title={`${v.name} is viewing`}>
              <Avatar user={{ name: v.name, avatar: v.avatar }} size={26} />
            </span>
          ))}
          {viewers.filter((v) => v.id !== user.id).length > 5 && <span className="label-more">+{viewers.filter((v) => v.id !== user.id).length - 5}</span>}
        </div>
      </div>
      {project.archived && <p className="note">This project is archived and read-only. The owner can restore it from the Members tab.</p>}
      <nav className="tabs" aria-label="Project sections">
        <NavLink to={`/p/${id}`} end className="tab">
          Board
        </NavLink>
        <NavLink to={`/p/${id}/members`} className="tab">
          Members
        </NavLink>
      </nav>
      <Outlet />
    </ProjectContext.Provider>
  );
}
