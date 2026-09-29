import { Link, Route, Routes } from 'react-router-dom';
import Shell from './components/Shell.jsx';

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
      <Route element={<Shell />}>
        <Route index element={<Stub title="Projects">No projects yet. Project creation arrives in a later phase.</Stub>} />
        <Route path="notifications" element={<Stub title="Notifications">Nothing here yet.</Stub>} />
        <Route path="profile" element={<Stub title="Profile">Profile settings arrive with sign in.</Stub>} />
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
