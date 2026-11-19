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
          <Field label="Work email (View only)" id="pf-email">
            <input
              id="pf-email"
              type="email"
              disabled
              readOnly
              className={cx(inputCls, 'bg-zinc-100 text-zinc-500 cursor-not-allowed border-zinc-200')}
              value={p.email}
            />
          </Field>
          <Field label="Phone" id="pf-phone">
            <input
              id="pf-phone"
              className={inputCls}
              value={p.phone}
              onChange={(e) => setP({ ...p, phone: e.target.value })}
              placeholder="+91 98765 43210"
            />
          </Field>
        </div>
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
