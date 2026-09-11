import { Eye, EyeOff, LockKeyhole } from 'lucide-react';

import IconField from './IconField';

export default function PasswordField({ visible, onToggle, label = 'Password', ...props }) {
  return (
    <IconField label={label} icon={LockKeyhole} type={visible ? 'text' : 'password'} {...props}>
      {onToggle && (
        <button
          type="button"
          className="icon-btn"
          onClick={onToggle}
          aria-label={visible ? 'Hide password' : 'Show password'}
        >
          {visible ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      )}
    </IconField>
  );
}
