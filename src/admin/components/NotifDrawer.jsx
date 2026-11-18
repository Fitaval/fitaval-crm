import { useState, useEffect } from 'react';
import { Icon } from './Icon';
import { Btn } from './ui/Button';
import { Field } from './ui/Field';
import { Locked } from './ui/PageHead';
import { Sheet } from './ui/Sheet';
import { Tabs } from './ui/Tabs';
import { inputCls } from './ui/styles';
import { useApp } from '../context/AppContext';
import { cx, fmtTime, uid } from '../lib/utils';
import adminClient from '../api/client';

export function NotifDrawer({ onClose }) {
  const { alerts, setAlerts, perms, toast, addAudit, broadcasts, setBroadcasts, members = [], gyms = [] } = useApp();
  const [tab, setTab] = useState('alerts');
  const [isSending, setIsSending] = useState(false);

  const gymsList = Array.isArray(gyms) ? gyms : Object.values(gyms || {});
  const membersList = Array.isArray(members) ? members : Object.values(members || {});

  const audiencesList = [
    {
      id: 'all',
      label: '🌐 All Users (App & CRM)',
      n: membersList.filter((m) => m.status === 'Active' || !m.status).length + gymsList.length,
    },
    {
      id: 'app_users',
      label: '📱 App Users Only (All Mobile Members)',
      n: membersList.filter((m) => m.status === 'Active' || !m.status).length,
    },
    {
      id: 'crm_users',
      label: '🏢 CRM Users Only (All Gym Portals)',
      n: gymsList.length,
    },
    {
      id: 'expiring',
      label: '⏰ Expiring App Members',
      n: membersList.filter((m) => m.status === 'Expiring' || m.status === 'Expired').length,
    },
    ...gymsList.flatMap((g) => {
      const gId = String(g.id || g.gym_id || g.name);
      const gName = g.name || g.gym_name || 'Gym';
      const gMembers = membersList.filter((m) => m.gym_id === g.id || m.gym === g.id || m.gym === g.name).length;
      return [
        {
          id: `gym_all:${gId}`,
          label: `🏋️‍♂️ ${gName} — Both (Members & CRM)`,
          n: gMembers + 1,
        },
        {
          id: `gym_app:${gId}`,
          label: `📱 ${gName} — App Members Only`,
          n: gMembers,
        },
        {
          id: `gym_crm:${gId}`,
          label: `🏢 ${gName} — CRM Portal Only`,
          n: 1,
        },
      ];
    }),
  ];

  const LINK_OPTIONS = [
    { value: '', label: 'None (Announcement only - No Link)' },
    { value: '/plans', label: 'Plans & Memberships (/plans)' },
    { value: '/members', label: 'Members Directory (/members)' },
    { value: '/finance', label: 'Finance & Wallet (/finance)' },
    { value: '/attendance', label: 'Attendance & Check-in (/attendance)' },
    { value: '/trainers', label: 'Trainers & Staff (/trainers)' },
    { value: '/gym-profile', label: 'Gym Profile (/gym-profile)' },
    { value: '/dashboard', label: 'Dashboard (/dashboard)' },
    { value: 'custom', label: 'Custom Link / Route...' },
  ];

  const [linkSelect, setLinkSelect] = useState('');
  const [customLink, setCustomLink] = useState('');

  const [b, setB] = useState({
    title: '',
    body: '',
    aud: audiencesList[0]?.id || 'all',
  });

  const cleanRouteLink = (raw) => {
    if (!raw) return '';
    let val = raw.trim();
    if (val.startsWith('/crm/')) {
      val = val.replace('/crm', '');
    } else if (val === '/crm') {
      val = '/dashboard';
    }
    return val;
  };

  const finalLink = cleanRouteLink(linkSelect === 'custom' ? customLink : linkSelect);

  useEffect(() => {
    adminClient.notifications.list().then((res) => {
      const list = Array.isArray(res) ? res : (res?.data || res?.results || []);
      if (list.length > 0) {
        setBroadcasts(list.map((item) => ({
          id: item.id,
          title: item.title,
          aud: item.aud || 'All active members',
          n: item.n ?? 0,
          at: item.at ? new Date(item.at) : new Date(),
        })));
      }
    }).catch(() => {});
  }, [setBroadcasts]);

  const aud = audiencesList.find((a) => a.id === b.aud) || audiencesList[0] || { label: 'All members', n: 0 };
  const icons = { capacity: 'Users', expiry: 'CalendarClock', denied: 'Ban', staff: 'Clock', sync: 'Smartphone' };

  const send = async () => {
    if (!b.title.trim() || !b.body.trim() || isSending) return;
    setIsSending(true);
    try {
      const res = await adminClient.notifications.broadcast({
        title: b.title.trim(),
        body: b.body.trim(),
        message: b.body.trim(),
        audience: b.aud,
        link: finalLink,
      });
      const newEntry = {
        id: res?.id || uid(),
        title: b.title.trim(),
        aud: res?.aud || aud.label,
        n: res?.n ?? aud.n,
        at: res?.at ? new Date(res.at) : new Date(),
        link: finalLink,
      };
      setBroadcasts((h) => [newEntry, ...(h || [])]);
      addAudit(
        'CREATE',
        'notifications.Broadcast',
        newEntry.id,
        {},
        { title: b.title, audience: b.aud, recipients: newEntry.n, link: finalLink }
      );
      toast({ title: 'Push broadcast sent successfully', desc: `${newEntry.n} device(s) · ${newEntry.aud}` });
      setB({ title: '', body: '', aud: audiencesList[0]?.id || 'all' });
      setLinkSelect('');
      setCustomLink('');
      setTab('alerts');
    } catch (err) {
      console.error('Failed to send broadcast:', err);
      toast({ title: 'Failed to send broadcast', desc: err?.message || 'Network error', v: 'error' });
    } finally {
      setIsSending(false);
    }
  };
  return (
    <Sheet
      open={true}
      onClose={onClose}
      title="Notifications & Push Broadcast"
      sub="Alerts from the floor and push messages to the member app"
      width="max-w-lg"
      headRight={
        tab === 'alerts' && (
          <Btn size="sm" v="ghost" onClick={() => setAlerts((a) => a.map((x) => ({ ...x, read: true })))}>
            Mark all read
          </Btn>
        )
      }
    >
      <div className="mb-4">
        <Tabs
          tabs={[
            { id: 'alerts', label: 'Alerts', icon: 'Bell' },
            { id: 'fcm', label: 'Push Broadcast', icon: 'Send', lock: !perms.broadcast },
          ]}
          value={tab}
          onChange={setTab}
        />
      </div>
      {tab === 'alerts' && (
        <div className="space-y-2">
          {alerts.map((a) => (
            <div
              key={a.id}
              className={cx(
                'flex gap-3 rounded-lg border p-3',
                a.read ? 'border-zinc-200 bg-white' : 'border-emerald-200 bg-emerald-50/60'
              )}
            >
              <span
                className={cx(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
                  a.type === 'denied' ? 'bg-zinc-950 text-white' : 'bg-white text-emerald-600 ring-1 ring-zinc-200'
                )}
              >
                <Icon n={icons[a.type]} size={15} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold">{a.title}</p>
                  {!a.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-emerald-500"></span>}
                </div>
                <p className="mt-0.5 text-xs text-zinc-600">{a.desc}</p>
                <p className="mt-1 text-[11px] text-zinc-400">{a.time}</p>
              </div>
            </div>
          ))}
          {broadcasts.length > 0 && (
            <p className="pt-3 text-xs font-medium uppercase tracking-wider text-zinc-500">Sent broadcasts</p>
          )}
          {broadcasts.map((h) => (
            <div key={h.id} className="rounded-lg border border-zinc-200 bg-white p-3">
              <p className="text-sm font-semibold">{h.title}</p>
              <p className="mt-0.5 text-xs text-zinc-500">
                {h.n} devices · {h.aud} · {fmtTime(h.at)}
              </p>
            </div>
          ))}
        </div>
      )}
      {tab === 'fcm' &&
        (perms.broadcast ? (
          <div className="space-y-4">
            <Field label="Audience" id="fcm-aud">
              <select
                id="fcm-aud"
                className={inputCls}
                value={b.aud}
                onChange={(e) => setB({ ...b, aud: e.target.value })}
              >
                {audiencesList.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.label} ({a.n})
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Title" id="fcm-title" hint={b.title.length + '/45 characters'}>
              <input
                id="fcm-title"
                maxLength="45"
                className={inputCls}
                value={b.title}
                onChange={(e) => setB({ ...b, title: e.target.value })}
              />
            </Field>
            <Field label="Message" id="fcm-body" hint={b.body.length + '/120 characters'}>
              <textarea
                id="fcm-body"
                rows="3"
                maxLength="120"
                className={cx(inputCls, 'h-auto py-2')}
                value={b.body}
                onChange={(e) => setB({ ...b, body: e.target.value })}
              ></textarea>
            </Field>
            <Field label="Action Link (Optional destination for CRM & Member App)" id="fcm-link">
              <select
                id="fcm-link"
                className={inputCls}
                value={linkSelect}
                onChange={(e) => setLinkSelect(e.target.value)}
              >
                {LINK_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </Field>

            {linkSelect === 'custom' && (
              <Field label="Custom Route / URL" id="fcm-custom-link" hint="e.g. /plans, /members, or https://...">
                <input
                  id="fcm-custom-link"
                  className={inputCls}
                  placeholder="/plans"
                  value={customLink}
                  onChange={(e) => setCustomLink(e.target.value)}
                />
              </Field>
            )}

            <div>
              <p className="mb-2 text-xs font-medium text-zinc-700">Lock-screen & CRM Preview</p>
              <div className="rounded-2xl bg-zinc-950 p-3">
                <div className="flex gap-3 rounded-xl bg-zinc-800/80 p-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500 text-zinc-950">
                    <Icon n="Dumbbell" size={18} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] text-zinc-400">FITAVAL · now</p>
                      {finalLink && (
                        <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-400">
                          View details active
                        </span>
                      )}
                    </div>
                    <p className="truncate text-sm font-semibold text-white">{b.title || 'Title'}</p>
                    <p className="line-clamp-2 text-xs text-zinc-300">{b.body || 'Message'}</p>
                    {finalLink && (
                      <p className="mt-1 truncate text-[10px] text-emerald-400 font-medium">
                        Opens: {finalLink}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <Btn v="primary" className="w-full" disabled={!b.title.trim() || !b.body.trim() || isSending} onClick={send}>
              <Icon n="Send" size={15} />
              {isSending ? 'Sending broadcast...' : `Send to ${aud.n} device(s)`}
            </Btn>
          </div>
        ) : (
          <Locked
            title="Broadcasts need manager access"
            text="Branch Managers and Super Admins can send push notifications to the member app."
          />
        ))}
    </Sheet>
  );
}
