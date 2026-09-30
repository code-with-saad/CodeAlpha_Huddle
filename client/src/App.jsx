import { Link, Route, Routes } from 'react-router-dom';
import Shell from './components/Shell.jsx';
import RequireAuth from './components/RequireAuth.jsx';
import AuthPage from './pages/AuthPage.jsx';
import ProfilePage from './pages/ProfilePage.jsx';
import ProjectsPage from './pages/ProjectsPage.jsx';
import ProjectLayout from './pages/ProjectLayout.jsx';
import MembersPage from './pages/MembersPage.jsx';
import JoinPage from './pages/JoinPage.jsx';
import BoardPage from './pages/board/BoardPage.jsx';

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

export default function App() {
  return (
    <Routes>
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
        <Route index element={<ProjectsPage />} />
        <Route path="p/:id" element={<ProjectLayout />}>
          <Route index element={<BoardPage />} />
          <Route path="members" element={<MembersPage />} />
        </Route>
        <Route path="notifications" element={<Stub title="Notifications">Nothing here yet.</Stub>} />
        <Route path="profile" element={<ProfilePage />} />
        <Route
          path="*"
          element={
            <Stub title="Page not found">
              That page does not exist. <Link to="/">Back to projects</Link>
            </Stub>
          }
        />
      </Route>
    </Routes>
  );
}
