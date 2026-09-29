import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import Icon from './Icon.jsx';
import { dismiss, subscribe } from '../lib/toast.js';

export default function Toaster() {
  const [items, setItems] = useState([]);
  useEffect(() => subscribe(setItems), []);

  return (
    <div className="toaster" aria-label="Notifications">
      {items.map((t) => (
        <div key={t.id} className={`toast toast-${t.kind}`} role={t.kind === 'error' ? 'alert' : 'status'}>
          <span>{t.message}</span>
          <button type="button" className="toast-close" onClick={() => dismiss(t.id)} aria-label="Dismiss">
            <Icon as={X} />
          </button>
        </div>
      ))}
    </div>
  );
}
