import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useParams } from 'react-router-dom';
import RoleBadge from '../components/RoleBadge.jsx';
import { api, errorMessage } from '../lib/api.js';

const ProjectContext = createContext(null);
export const useProject = () => useContext(ProjectContext);

// Loads the project once for every screen under /p/:id and shares it, with a reload for after changes.
export default function ProjectLayout() {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [error, setError] = useState(null);

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
