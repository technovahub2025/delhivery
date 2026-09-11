import { ArrowUpRight, ShieldCheck, Truck } from 'lucide-react';

import AuthStory from './AuthStory';

export default function AuthLayout({ mode, children, onSwitch, notify }) {
  const register = mode === 'register';
  return (
    <div className="auth-page">
      <AuthStory />
      <main className="auth-form-side">
        <div className="auth-top">
          <span className="demo-pill">
            <span /> Account access
          </span>
          <span>New possibilities. Every delivery.</span>
        </div>
        <div className="auth-form-wrap">
          <div className="auth-form-icon">
            <Truck size={27} />
          </div>
          <div className="eyebrow text-orange">LET’S GET YOU MOVING</div>
          <h2>{register ? 'Start your next chapter.' : 'Welcome back.'}</h2>
          <p className="auth-subtitle">
            {register
              ? 'Create your account and make shipping simpler.'
              : 'Sign in to your dashboard. Your deliveries await.'}
          </p>
          {children}
          <div className="auth-switch">
            {register ? 'Already have an account?' : 'New to Delhivery?'}{' '}
            <button className="text-link" onClick={onSwitch}>
              {register ? 'Log in' : 'Create an account'}
              <ArrowUpRight size={14} />
            </button>
          </div>
          <div className="secure-note">
            <ShieldCheck size={15} />
            <span>Sign in to manage your shipping account.</span>
          </div>
        </div>
        <footer className="auth-footer">
          <span>
            © 2026 <a href="https://www.technovahub.in">Powered by Technovahub</a>. All rights
            reserved.
          </span>
          <button
            className="text-link muted"
            onClick={() => notify('Contact your workspace administrator for account support.')}
          >
            Need a hand? <ArrowUpRight size={13} />
          </button>
        </footer>
      </main>
    </div>
  );
}
