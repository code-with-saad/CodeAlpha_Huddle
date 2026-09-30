import { Link, Navigate, Route, Routes } from 'react-router-dom';
import Landing from './pages/landing/Landing.jsx';
import Terms from './pages/landing/Terms.jsx';
import Privacy from './pages/landing/Privacy.jsx';
import { useAuth } from './lib/auth.jsx';
import Shell from './components/Shell.jsx';
import RequireAuth from './components/RequireAuth.jsx';
import AuthPage from './pages/AuthPage.jsx';
import ProfilePage from './pages/ProfilePage.jsx';
import ProjectsPage from './pages/ProjectsPage.jsx';
import ProjectLayout from './pages/ProjectLayout.jsx';
import MembersPage from './pages/MembersPage.jsx';
import JoinPage from './pages/JoinPage.jsx';
import NotificationsPage from './pages/NotificationsPage.jsx';
import BoardPage from './pages/board/BoardPage.jsx';
import BoardViews from './pages/board/BoardViews.jsx';
import CalendarView from './pages/board/CalendarView.jsx';
import ListView from './pages/board/ListView.jsx';
import ActivityPage from './pages/ActivityPage.jsx';
import DashboardPage from './pages/dashboard/DashboardPage.jsx';
import ArchivePage from './pages/ArchivePage.jsx';

function Stub({ title, children }) {
  return (
    <>
      <div className="page-head">
        <h1>{title}</h1>
      </div>
      <div className="empty">{children}</div>
    </>
  );
}

// The public front page for visitors, the projects list for people who are signed in.
function Home() {
  const { status } = useAuth();
  if (status === 'loading') {
    return (
      <div className="centered" role="status" aria-label="Loading">
        <div className="progress" />
        <span className="spinner" />
      </div>
    );
  }
  return status === 'in' ? <Navigate to="/projects" replace /> : <Landing />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="terms" element={<Terms />} />
      <Route path="privacy" element={<Privacy />} />
      <Route path="login" element={<AuthPage mode="login" />} />
      <Route path="register" element={<AuthPage mode="register" />} />
      <Route
        path="join/:token"
        element={
          <RequireAuth>
            <JoinPage />
          </RequireAuth>
        }
      />
      <Route
        element={
          <RequireAuth>
            <Shell />
          </RequireAuth>
        }
      >
        <Route path="projects" element={<ProjectsPage />} />
        <Route path="p/:id" element={<ProjectLayout />}>
          <Route element={<BoardViews />}>
            <Route index element={<BoardPage />} />
            <Route path="list" element={<ListView />} />
            <Route path="calendar" element={<CalendarView />} />
          </Route>
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="activity" element={<ActivityPage />} />
          <Route path="archive" element={<ArchivePage />} />
          <Route path="members" element={<MembersPage />} />
        </Route>
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route
          path="*"
          element={
            <Stub title="Page not found">
              That page does not exist. <Link to="/projects">Back to projects</Link>
            </Stub>
          }
        />
      </Route>
    </Routes>
  );
}
