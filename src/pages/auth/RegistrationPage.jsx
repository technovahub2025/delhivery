import { ArrowRight, Mail, User } from 'lucide-react';
import { useState } from 'react';

import AuthLayout from '../../components/auth/AuthLayout';
import IconField from '../../components/auth/IconField';
import PasswordField from '../../components/auth/PasswordField';
import TermsDialog from '../../components/auth/TermsDialog';
import { Button } from '../../components/ui';
import useApiAction from '../../hooks/useApiAction';
import { api } from '../../services/api';

export default function RegistrationPage({ onShowLogin, notify }) {
  const [visible, setVisible] = useState(false);
  const [terms, setTerms] = useState(false);
  const [error, setError] = useState('');
  const { busy, error: apiError, run } = useApiAction();

  function submit(event) {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    if (data.password !== data.confirm) {
      setError('Passwords do not match. Please try again.');
      return;
    }
    setError('');
    run(async () => {
      await api.register({ name: data.name, email: data.email, password: data.password });
      notify('Account created. You can now log in.');
      onShowLogin();
    });
  }

  return (
    <>
      <AuthLayout mode="register" onSwitch={onShowLogin} notify={notify}>
        <form onSubmit={submit}>
          <IconField
            label="Full name"
            icon={User}
            name="name"
            placeholder="Enter your full name"
            required
            autoComplete="name"
          />
          <IconField
            label="Email address"
            icon={Mail}
            name="email"
            type="email"
            placeholder="you@company.com"
            required
            autoComplete="email"
          />
          <PasswordField
            name="password"
            visible={visible}
            onToggle={() => setVisible(!visible)}
            placeholder="Create a password (8+ characters)"
            required
            minLength={8}
            autoComplete="new-password"
          />
          <PasswordField
            label="Confirm password"
            name="confirm"
            visible={visible}
            placeholder="Re-enter your password"
            required
            autoComplete="new-password"
          />
          <label className="check-label">
            <input type="checkbox" required />I agree to the{' '}
            <button type="button" className="text-link" onClick={() => setTerms(true)}>
              terms and conditions
            </button>
          </label>
          {(error || apiError) && (
            <p className="error" role="alert">
              {error || apiError}
            </p>
          )}
          <Button type="submit" className="auth-submit" disabled={busy}>
            {busy ? 'Just a moment…' : 'Create account'}
            <ArrowRight size={18} />
          </Button>
        </form>
      </AuthLayout>
      {terms && <TermsDialog onClose={() => setTerms(false)} />}
    </>
  );
}
