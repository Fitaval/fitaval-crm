import { useState, useEffect } from 'react';
import { Icon } from '../../components/Icon';
import { Avatar } from '../../components/ui/Avatar';
import { Badge } from '../../components/ui/Badge';
import { Btn } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Field } from '../../components/ui/Field';
import { inputCls } from '../../components/ui/styles';
import { useApp } from '../../context/AppContext';
import { getSession, startSession } from '../../../portal/session';
import { httpClient } from '../../../shared/api/httpClient';
import { cx } from '../../lib/utils';

export function SecurityTab() {
  const { session, roleObj, role, toast, addAudit, sessions, setSessions, setAdminName } = useApp();
  const currentSession = session || getSession() || {};
  const currentEmail = currentSession?.user?.email || currentSession?.email || '';
  const currentName = currentSession?.user?.full_name || currentSession?.user?.name || currentSession?.name || (currentEmail ? currentEmail.split('@')[0] : (roleObj?.user || 'Super Admin'));
  const currentPhone = currentSession?.user?.phone || currentSession?.phone || '';

  const [p, setP] = useState({
    name: currentName,
    email: currentEmail,
    phone: currentPhone,
    title: roleObj?.label || 'Super Admin',
  });

  useEffect(() => {
    setP({
      name: currentName,
      email: currentEmail,
      phone: currentPhone,
      title: roleObj?.label || 'Super Admin',
    });
  }, [role, currentName, currentEmail, currentPhone, roleObj]);

  const [savingProfile, setSavingProfile] = useState(false);
  const [rotating, setRotating] = useState(false);
  const [pw, setPw] = useState({ cur: '', next: '', conf: '' });
  const [revoke, setRevoke] = useState(true);

  // Email change OTP state
  const [showEmailChange, setShowEmailChange] = useState(false);
  const [emailChangeStep, setEmailChangeStep] = useState('request');
  const [newEmail, setNewEmail] = useState('');
  const [emailOtp, setEmailOtp] = useState('');
  const [sendingEmailOtp, setSendingEmailOtp] = useState(false);
  const [verifyingEmailOtp, setVerifyingEmailOtp] = useState(false);
  const [emailChangeError, setEmailChangeError] = useState('');
  const [emailChangeSuccess, setEmailChangeSuccess] = useState('');

  const handleSendEmailChangeOtp = async () => {
    try {
      setSendingEmailOtp(true);
      setEmailChangeError('');
      await httpClient.post('/auth/email/change/send-otp/', { email: newEmail.trim() });
      setEmailChangeStep('verify');
      toast({ title: 'Verification code sent', desc: `Check your inbox at ${newEmail.trim()}` });
    } catch (err) {
      console.error(err);
      setEmailChangeError(err.message || 'Failed to send verification code');
      toast({ title: 'Failed to send OTP', desc: err.message, variant: 'destructive' });
    } finally {
      setSendingEmailOtp(false);
    }
  };

  const handleVerifyEmailChangeOtp = async () => {
    try {
      setVerifyingEmailOtp(true);
      setEmailChangeError('');
      const res = await httpClient.post('/auth/email/change/verify-otp/', {
        email: newEmail.trim(),
        otp: emailOtp.trim(),
      });
      const updatedEmail = res?.email || newEmail.trim();
      setP((prev) => ({ ...prev, email: updatedEmail }));
      const existing = getSession() || {};
      startSession({
        ...existing,
        email: updatedEmail,
        user: { ...(existing.user || {}), email: updatedEmail },
      });
      setEmailChangeSuccess('Email successfully updated and verified!');
      toast({ title: 'Email updated', desc: `Your account email is now ${updatedEmail}.` });
      setTimeout(() => {
        setShowEmailChange(false);
        setEmailChangeStep('request');
        setEmailChangeSuccess('');
      }, 2000);
    } catch (err) {
      console.error(err);
      setEmailChangeError(err.message || 'Invalid verification code.');
      toast({ title: 'Verification failed', desc: err.message, variant: 'destructive' });
    } finally {
      setVerifyingEmailOtp(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      setSavingProfile(true);
      await httpClient.patch('/auth/me/', {
        full_name: p.name,
        name: p.name,
        phone: p.phone,
      });

      const existing = getSession() || {};
      const updatedUser = {
        ...(existing.user || {}),
        name: p.name,
        full_name: p.name,
        phone: p.phone,
      };
      startSession({ ...existing, user: updatedUser });
      if (typeof setAdminName === 'function') {
        setAdminName(p.name);
      }

      addAudit('UPDATE', 'accounts.User', existing?.user?.id || 'usr-current', { name: roleObj.user }, { name: p.name, phone: p.phone });
      toast({ title: 'Profile saved', desc: 'Your full name and phone number have been updated successfully.' });
    } catch (err) {
      console.error('Failed to update profile:', err);
      toast({ title: 'Update failed', desc: err.message || 'Could not update profile', variant: 'destructive' });
    } finally {
      setSavingProfile(false);
    }
  };

  const s = pw.next;
  let score = 0;
  if (s.length >= 10) score++;
  if (/[A-Z]/.test(s) && /[a-z]/.test(s)) score++;
  if (/\d/.test(s)) score++;
  if (/[^A-Za-z0-9]/.test(s)) score++;
  const label = ['Too short', 'Weak', 'Fair', 'Good', 'Strong'][score];
  const ok = pw.cur && pw.next.length >= 8 && pw.next === pw.conf;

  const submit = async (e) => {
    e.preventDefault();
    if (!ok) return;
    try {
      setRotating(true);
      await httpClient.post('/auth/password/change/', {
        current_password: pw.cur,
        new_password: pw.next,
        revoke_others: revoke,
      });
      const before = sessions.length;
      if (revoke) setSessions((ss) => ss.filter((x) => x.current));
      addAudit(
        'SECURITY',
        'accounts.User',
        'usr-current',
        { active_jti_count: before },
        { password_rotated_at: new Date().toISOString().slice(0, 19), active_jti_count: revoke ? 1 : before }
      );
      toast({
        title: 'Password updated',
        desc: revoke ? (before > 1 ? `${before - 1} other device session(s) were signed out.` : 'Password changed successfully.') : 'Password updated. Other sessions remain active.',
      });
      setPw({ cur: '', next: '', conf: '' });
    } catch (err) {
      console.error('Password change error:', err);
      toast({
        title: 'Password change failed',
        desc: err.message || 'Incorrect current password or invalid new password.',
        variant: 'destructive',
      });
    } finally {
      setRotating(false);
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="p-5">
        <div className="mb-4 flex items-center gap-4">
          <Avatar name={p.name} size={56} />
          <div className="min-w-0">
            <h3 className="truncate text-base font-semibold">{p.name}</h3>
            <div className="mt-1 flex flex-wrap gap-1.5">
              <Badge tone="black">
                <Icon n="ShieldCheck" size={11} className="text-emerald-400" />
                {roleObj.group}
              </Badge>
              <Badge tone="green">{roleObj.label}</Badge>
            </div>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name" id="pf-name">
            <input
              id="pf-name"
              className={inputCls}
              value={p.name}
              onChange={(e) => setP({ ...p, name: e.target.value })}
              placeholder="e.g. John Doe"
            />
          </Field>
          <Field label="Designation (View only)" id="pf-title">
            <input
              id="pf-title"
              disabled
              readOnly
              className={cx(inputCls, 'bg-zinc-100 text-zinc-500 cursor-not-allowed border-zinc-200')}
              value={p.title}
            />
          </Field>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="pf-email" className="block text-xs font-semibold text-zinc-900">
                Work email
              </label>
              {!showEmailChange && (
                <button
                  type="button"
                  onClick={() => setShowEmailChange(true)}
                  className="text-[11px] font-semibold text-emerald-600 hover:text-emerald-700 underline"
                >
                  Change Email
                </button>
              )}
            </div>
            <input
              id="pf-email"
              type="email"
              disabled
              readOnly
              className={cx(inputCls, 'bg-zinc-100 text-zinc-500 cursor-not-allowed border-zinc-200')}
              value={p.email}
            />
          </div>

          <Field label="Phone" id="pf-phone">
            <div className="flex rounded-md border border-zinc-200 overflow-hidden bg-white focus-within:ring-1 focus-within:ring-zinc-950">
              <span className="inline-flex items-center px-3 bg-zinc-100 text-zinc-600 text-xs font-semibold border-r border-zinc-200 select-none">
                +91
              </span>
              <input
                id="pf-phone"
                type="tel"
                inputMode="numeric"
                maxLength={10}
                className="flex-1 h-9 px-3 text-xs sm:text-sm outline-none bg-transparent"
                value={(p.phone || '').replace(/^\+91/, '').replace(/\D/g, '').slice(0, 10)}
                onChange={(e) => {
                  const digits = e.target.value.replace(/^\+91/, '').replace(/\D/g, '').slice(0, 10);
                  setP({ ...p, phone: digits ? `+91${digits}` : '' });
                }}
                placeholder="9876543210"
              />
            </div>
          </Field>
        </div>

        {showEmailChange && (
          <div className="mt-4 p-3.5 rounded-lg border border-zinc-200 bg-zinc-50 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-zinc-900">Change Admin Work Email</p>
              <button
                type="button"
                onClick={() => {
                  setShowEmailChange(false);
                  setEmailChangeStep('request');
                  setEmailChangeError('');
                  setNewEmail('');
                  setEmailOtp('');
                }}
                className="text-zinc-500 hover:text-zinc-700 text-xs"
              >
                Cancel
              </button>
            </div>

            {emailChangeError && (
              <div className="p-2 rounded bg-rose-50 text-rose-700 border border-rose-200 text-xs">
                {emailChangeError}
              </div>
            )}

            {emailChangeSuccess && (
              <div className="p-2 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs">
                {emailChangeSuccess}
              </div>
            )}

            {emailChangeStep === 'request' ? (
              <div className="space-y-2">
                <input
                  type="email"
                  className={inputCls}
                  placeholder="newadmin@fitaval.com"
                  value={newEmail}
                  onChange={(e) => {
                    setNewEmail(e.target.value);
                    setEmailChangeError('');
                  }}
                />
                <Btn
                  v="primary"
                  className="w-full text-xs"
                  disabled={sendingEmailOtp || !newEmail.trim()}
                  onClick={handleSendEmailChangeOtp}
                >
                  {sendingEmailOtp ? 'Sending OTP...' : 'Send Verification Code'}
                </Btn>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-zinc-600">
                  Enter the 6-digit verification code sent to <span className="font-semibold text-zinc-900">{newEmail}</span>
                </p>
                <input
                  type="text"
                  maxLength={6}
                  inputMode="numeric"
                  className={cx(inputCls, 'text-center font-mono font-bold tracking-widest')}
                  placeholder="6-digit OTP"
                  value={emailOtp}
                  onChange={(e) => {
                    setEmailOtp(e.target.value.replace(/\D/g, '').slice(0, 6));
                    setEmailChangeError('');
                  }}
                />
                <div className="flex gap-2">
                  <Btn
                    v="primary"
                    className="flex-1 text-xs"
                    disabled={verifyingEmailOtp || emailOtp.length < 6}
                    onClick={handleVerifyEmailChangeOtp}
                  >
                    {verifyingEmailOtp ? 'Verifying...' : 'Verify & Update Email'}
                  </Btn>
                  <Btn
                    v="secondary"
                    className="text-xs px-3"
                    disabled={sendingEmailOtp}
                    onClick={handleSendEmailChangeOtp}
                  >
                    Resend
                  </Btn>
                </div>
              </div>
            )}
          </div>
        )}
        <div className="mt-4 flex justify-end">
          <Btn
            v="primary"
            disabled={savingProfile}
            onClick={handleSaveProfile}
          >
            {savingProfile ? 'Saving profile...' : 'Save profile'}
          </Btn>
        </div>
      </Card>
      <Card className="p-5">
        <h3 className="text-base font-semibold">Password rotation</h3>
        <p className="mt-0.5 text-sm text-zinc-500">
          Use at least 8 characters with mixed case, a number and a symbol.
        </p>
        <form className="mt-4 space-y-4" onSubmit={submit}>
          <Field label="Current password" id="pw-cur">
            <input
              id="pw-cur"
              type="password"
              autoComplete="current-password"
              className={inputCls}
              value={pw.cur}
              onChange={(e) => setPw({ ...pw, cur: e.target.value })}
            />
          </Field>
          <Field label="New password" id="pw-new">
            <input
              id="pw-new"
              type="password"
              autoComplete="new-password"
              className={inputCls}
              value={pw.next}
              onChange={(e) => setPw({ ...pw, next: e.target.value })}
            />
            <div className="mt-1 flex items-center gap-2">
              <div className="flex flex-1 gap-1">
                {[1, 2, 3, 4].map((i) => (
                  <span
                    key={i}
                    className={cx(
                      'h-1.5 flex-1 rounded-full',
                      i <= score ? (score >= 3 ? 'bg-emerald-500' : 'bg-zinc-950') : 'bg-zinc-200'
                    )}
                  ></span>
                ))}
              </div>
              <span className="w-16 text-right text-[11px] text-zinc-500">{pw.next ? label : ''}</span>
            </div>
          </Field>
          <Field
            label="Confirm new password"
            id="pw-conf"
            hint={pw.conf && pw.conf !== pw.next ? 'Passwords do not match yet.' : ''}
          >
            <input
              id="pw-conf"
              type="password"
              autoComplete="new-password"
              className={inputCls}
              value={pw.conf}
              onChange={(e) => setPw({ ...pw, conf: e.target.value })}
            />
          </Field>
          <label
            htmlFor="pw-revoke"
            className="flex cursor-pointer items-start gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3"
          >
            <input
              id="pw-revoke"
              type="checkbox"
              className="mt-0.5 h-4 w-4 accent-emerald-500"
              checked={revoke}
              onChange={(e) => setRevoke(e.target.checked)}
            />
            <span className="text-sm text-zinc-800">
              Revoke all other active JWT device sessions upon password change
            </span>
          </label>
          <Btn v="dark" className="w-full" type="submit" disabled={!ok || rotating}>
            <Icon n="KeyRound" size={15} className="text-emerald-400" />
            {rotating ? 'Updating password...' : 'Rotate password'}
          </Btn>
        </form>
      </Card>
    </div>
  );
}
