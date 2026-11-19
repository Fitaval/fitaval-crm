import { useState } from 'react';
import AuthShell, { PasswordField } from './AuthShell';
import { signUp, verifySignUp, resendSignUpOtp } from './session';

export default function Register() {
  const [gymName, setGymName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [email, setEmail] = useState(() => {
    try {
      const pending = JSON.parse(sessionStorage.getItem('fitaval_pending_signup') || '{}');
      return pending.email || '';
    } catch {
      return '';
    }
  });
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState(() => {
    try {
      const pending = JSON.parse(sessionStorage.getItem('fitaval_pending_signup') || '{}');
      return pending.email ? 'otp' : 'form';
    } catch {
      return 'form';
    }
  });
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!gymName.trim()) return setError('Enter your gym / fitness club name.');
    if (!ownerName.trim()) return setError('Enter owner / manager name.');
    if (password.length < 8) return setError('Password must be at least 8 characters.');
    if (password !== confirm) return setError('Passwords do not match.');
    setLoading(true);
    const res = await signUp(email, password, { gym_name: gymName.trim(), owner_name: ownerName.trim(), phone: phone.trim() });
    setLoading(false);
    if (!res.ok) return setError(res.error);
    setEmail(res.email);
    setError('');
    setStep('otp');
  };

  const verify = async (e) => {
    e.preventDefault();
    setLoading(true);
    const res = await verifySignUp(code);
    if (!res.ok) {
      setLoading(false);
      return setError(res.error);
    }
    window.location.assign('/');
  };

  if (step === 'otp') {
    return (
      <AuthShell
        title="Verify Gym Owner Account"
        sub={`We sent a 6-digit confirmation code to ${email}.`}
        footer={
          <>
            Wrong email?{' '}
            <a
              href="/register"
              onClick={() => {
                sessionStorage.removeItem('fitaval_pending_signup');
                setStep('form');
              }}
            >
              Start again
            </a>
          </>
        }
      >
        <form onSubmit={verify} noValidate>
          <label htmlFor="pt-otp">Verification code</label>
          <input
            id="pt-otp"
            className="pt-otp"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="······"
            autoFocus
            value={code}
            onChange={(e) => {
              setCode(e.target.value.replace(/\D/g, ''));
              setError('');
              setNote('');
            }}
          />
          <p className="pt-hint">Enter the 6-digit confirmation code from your registration email.</p>
          {error && <p className="pt-error" role="alert">{error}</p>}
          {note && <p className="pt-ok" role="status">{note}</p>}
          <button className="pt-submit" type="submit" disabled={code.length < 6 || loading}>
            {loading ? 'Verifying...' : 'Verify and Open CRM'}
          </button>
          <p className="pt-foot">
            Didn't get it?{' '}
            <a
              href="#resend"
              onClick={async (e) => {
                e.preventDefault();
                setError('');
                const res = await resendSignUpOtp(email);
                if (res.ok) {
                  setNote('A new 6-digit verification code has been sent.');
                } else {
                  setError(res.error || 'Failed to resend code.');
                }
              }}
            >
              Resend code
            </a>
          </p>
        </form>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Register Gym Owner Account"
      sub="Sign up to manage your fitness club and open the CRM. Super Admin accounts are pre-provisioned and can only sign in."
      footer={<>Already have an account? <a href="/login">Sign in</a></>}
    >
      <form onSubmit={submit} noValidate>
        <label htmlFor="pt-gym">Gym / Club Name</label>
        <input
          id="pt-gym"
          type="text"
          placeholder="e.g. Iron Paradise Fitness"
          autoFocus
          value={gymName}
          onChange={(e) => {
            setGymName(e.target.value);
            setError('');
          }}
        />

        <label htmlFor="pt-owner">Owner / Manager Name</label>
        <input
          id="pt-owner"
          type="text"
          placeholder="e.g. John Martinez"
          value={ownerName}
          onChange={(e) => {
            setOwnerName(e.target.value);
            setError('');
          }}
        />

        <label htmlFor="pt-email">Business Email</label>
        <input
          id="pt-email"
          type="email"
          autoComplete="email"
          placeholder="owner@yourgym.com"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setError('');
          }}
        />

        <label htmlFor="pt-phone">Phone Number (Optional)</label>
        <input
          id="pt-phone"
          type="tel"
          autoComplete="tel"
          placeholder="e.g. +91 98765 43210"
          value={phone}
          onChange={(e) => {
            setPhone(e.target.value);
            setError('');
          }}
        />

        <PasswordField
          id="pt-pass"
          label="Password"
          autoComplete="new-password"
          placeholder="At least 6 characters"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setError('');
          }}
        />

        <PasswordField
          id="pt-confirm"
          label="Confirm password"
          autoComplete="new-password"
          placeholder="Re-enter your password"
          value={confirm}
          onChange={(e) => {
            setConfirm(e.target.value);
            setError('');
          }}
        />

        {error && <p className="pt-error" role="alert">{error}</p>}
        <button className="pt-submit" type="submit" disabled={loading}>
          {loading ? 'Creating account...' : 'Create Gym Owner Account'}
        </button>
      </form>
    </AuthShell>
  );
}
