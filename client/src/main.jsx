import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './styles/tokens.css';
import './styles/base.css';
import './styles/shell.css';
import './styles/ui.css';
import App from './App.jsx';
import Toaster from './components/Toaster.jsx';
import { AuthProvider } from './lib/auth.jsx';
import { NotificationsProvider } from './lib/notifications.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <NotificationsProvider>
          <App />
          <Toaster />
        </NotificationsProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
);
