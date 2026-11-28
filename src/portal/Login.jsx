import { useState } from 'react';
import AuthShell, { PasswordField } from './AuthShell';
import { login, homePath } from './session';

function safeReturnTo(role) {
  const raw = new URLSearchParams(window.location.search).get('returnTo');
  if (!raw || !raw.startsWith('/') || raw.startsWith('//') || raw.includes('\\')) return null;
  const adminPath = raw === '/admin' || raw.startsWith('/admin/');
  return (role === 'admin') === adminPath ? raw : null;
}

export default function Login() {
  const isAdminLogin =
    typeof window !== 'undefined' &&
    (window.location.pathname === '/admin/login' ||
      (new URLSearchParams(window.location.search).get('returnTo') || '').startsWith('/admin'));

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [needsVerification, setNeedsVerification] = useState(false);
  const [portalSelection, setPortalSelection] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const performLogin = async (explicitRealm = '') => {
    setLoading(true);
    setNeedsVerification(false);
    setPortalSelection(false);
    const realm = explicitRealm || (isAdminLogin ? 'admin' : '');
    const res = await login(email, password, { realm });
    if (!res.ok) {
      setLoading(false);
      if (res.needsVerification) {
        setNeedsVerification(true);
        setUnverifiedEmail(res.email || email);
      }
      if (res.portalSelectionRequired) {
        setPortalSelection(true);
      }
      return setError(res.error);
    }
    window.location.assign(safeReturnTo(res.role) || homePath(res.role));
  };

  const submit = async (e) => {
    e.preventDefault();
    await performLogin();
  };

  return (
    <AuthShell
      title={isAdminLogin ? 'Admin Panel Sign In' : 'Welcome back'}
      sub={
        isAdminLogin
          ? 'Sign in with your Super Admin credentials.'
          : "Sign in to continue. We'll take you to the right place."
      }
      footer={<>New gym owner? <a href="/register">Create an account</a> · <a href="/forgot-password">Forgot password?</a></>}
    >
      <form onSubmit={submit} noValidate>
        <label htmlFor="pt-email">Email</label>
        <input id="pt-email" type="email" autoComplete="username" placeholder="you@gym.com" value={email}
          onChange={(e) => { setEmail(e.target.value); setError(''); setPortalSelection(false); }} />

        <PasswordField id="pt-pass" label="Password" autoComplete="current-password" value={password}
          onChange={(e) => { setPassword(e.target.value); setError(''); setPortalSelection(false); }} />

        {error && <p className="pt-error" role="alert">{error}</p>}
        {portalSelection && (
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
            <button
              className="pt-submit"
              type="button"
              disabled={loading}
              onClick={() => performLogin('crm')}
            >
              Open Gym CRM
            </button>
            <button
              className="pt-submit"
              type="button"
              disabled={loading}
              onClick={() => performLogin('admin')}
            >
              Open Admin Panel
            </button>
          </div>
        )}
        {needsVerification && (
          <p className="pt-foot" style={{ marginTop: '0.75rem' }}>
            <a
              href="/register"
              onClick={() => {
                sessionStorage.setItem('fitaval_pending_signup', JSON.stringify({ email: unverifiedEmail }));
              }}
            >
              Verify your 6-digit confirmation code &rarr;
            </a>
          </p>
        )}
        <button className="pt-submit" type="submit" disabled={loading}>
          {loading ? 'Signing in...' : 'Sign in'}
        </button>
      </form>
    </AuthShell>
  );
}
