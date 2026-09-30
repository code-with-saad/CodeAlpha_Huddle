import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import Icon from './Icon.jsx';

// A password field with a button that shows or hides what was typed.
export default function PasswordInput({ className = 'input', ...props }) {
  const [shown, setShown] = useState(false);
  return (
    <span className="password-field">
      <input {...props} className={className} type={shown ? 'text' : 'password'} />
      <button type="button" className="icon-btn password-toggle" onClick={() => setShown((s) => !s)} aria-label={shown ? 'Hide password' : 'Show password'} aria-pressed={shown}>
        <Icon as={shown ? EyeOff : Eye} size={16} />
      </button>
    </span>
  );
}
