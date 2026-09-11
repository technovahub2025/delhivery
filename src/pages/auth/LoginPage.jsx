import { ArrowRight, Mail } from 'lucide-react';
import { useState } from 'react';

import AuthLayout from '../../components/auth/AuthLayout';
import ForgotPasswordDialog from '../../components/auth/ForgotPasswordDialog';
import IconField from '../../components/auth/IconField';
import PasswordField from '../../components/auth/PasswordField';
import { Button } from '../../components/ui';
import useApiAction from '../../hooks/useApiAction';
import { api } from '../../services/api';

export default function LoginPage({ onLogin, onRegister, notify, initialEmail = '' }) {
  const [visible, setVisible] = useState(false);
  const [remember, setRemember] = useState(Boolean(initialEmail));
  const [forgot, setForgot] = useState(false);
  const { busy, error, run } = useApiAction();

  function submit(event) {
    event.preventDefault();
    const { email, password } = Object.fromEntries(new FormData(event.currentTarget));
    run(async () => {
      const result = await api.login({ email, password });
      if (!result.token || !result.user) throw new Error('The login response is incomplete.');
      onLogin(result, remember);
    });
  }

  return (
    <>
      <AuthLayout mode="login" onSwitch={onRegister} notify={notify}>
        <form onSubmit={submit}>
          <IconField
            label="Email address"
            icon={Mail}
            name="email"
            type="email"
            defaultValue={initialEmail}
            placeholder="you@company.com"
            required
            autoComplete="email"
          />
          <PasswordField
            name="password"
            visible={visible}
            onToggle={() => setVisible(!visible)}
            placeholder="Enter your password"
            required
            minLength={1}
            autoComplete="current-password"
          />
          <div className="form-options">
            <label className="check-label">
              <input
                type="checkbox"
                checked={remember}
                onChange={(event) => setRemember(event.target.checked)}
              />
              Remember me
            </label>
            <button type="button" className="text-link" onClick={() => setForgot(true)}>
              Forgot password?
            </button>
          </div>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <Button type="submit" className="auth-submit" disabled={busy}>
            {busy ? 'Just a moment…' : 'Log in'}
            <ArrowRight size={18} />
          </Button>
        </form>
      </AuthLayout>
      {forgot && <ForgotPasswordDialog onClose={() => setForgot(false)} notify={notify} />}
    </>
  );
}
