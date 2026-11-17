import { useState, useEffect } from 'react';
import { DataTable } from '../../components/DataTable';
import { Icon } from '../../components/Icon';
import { Avatar } from '../../components/ui/Avatar';
import { Badge, StatusBadge } from '../../components/ui/Badge';
import { Btn } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Field } from '../../components/ui/Field';
import { PageHead, Locked } from '../../components/ui/PageHead';
import { QrCode } from '../../components/ui/QrCode';
import { Sheet } from '../../components/ui/Sheet';
import { Tip } from '../../components/ui/Tooltip';
import { inputCls } from '../../components/ui/styles';
import { useApp } from '../../context/AppContext';
import { BR } from '../../data/branches';
import { CHANNELS } from '../../data/crm';
import { token } from '../../data/members';
import { cx, iso, addDays, dayDiff, TODAY, TODAY_ISO, fmtDate, fmtTime, uid } from '../../lib/utils';
import { adminClient } from '../../api/client';

export function Dossier({ id, onClose }) {
  const { members, updateMember, perms, toast, addAudit, roleObj } = useApp();
  const m = members.find((x) => x.id === id);
  const [note, setNote] = useState({ channel: 'Phone Call', text: '', follow: '' });
  useEffect(() => {
    setNote({ channel: 'Phone Call', text: '', follow: '' });
  }, [id]);
  if (!m) return null;
  const tok = token(m);
  const rotate = async () => {
    try {
      const res = await adminClient.users.rotateQr(m.id);
      const hex = res?.new_hex || Array.from({ length: 6 }, () => '0123456789ABCDEF'[Math.floor(Math.random() * 16)]).join('');
      updateMember(m.id, { hex });
      addAudit(
        'SECURITY',
        'memberships.Membership',
        tok,
        { qr: tok },
        { qr: 'FTV-' + (BR[m.branch]?.no || '01') + '-' + (m.num || '001') + '-' + hex }
      );
      toast({
        title: 'QR code rotated',
        desc: 'New dynamic QR token is active in the backend database.',
      });
    } catch (e) {
      console.error('Rotate failed:', e);
    }
  };
  const addNote = () => {
    if (!note.text.trim()) return;
    const when =
      new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) +
      ', ' +
      fmtTime(new Date());
    updateMember(m.id, {
      crm: [
        { id: uid(), channel: note.channel, by: roleObj?.user || 'Super Admin', note: note.text.trim(), when, follow: note.follow },
        ...(m.crm || []),
      ],
    });
    addAudit(
      'CREATE',
      'crm.Interaction',
      'crm-' + Math.floor(Math.random() * 9000 + 1000),
      {},
      { member: tok, channel: note.channel.toUpperCase().replace(/[ -]/g, '_'), follow_up: note.follow || null }
    );
    setNote({ channel: 'Phone Call', text: '', follow: '' });
    toast({ title: 'CRM note added', desc: 'Visible to all staff on this member.' });
  };
  const hasEnd = Boolean(m.end && !isNaN(new Date(m.end).getTime()));
  const days = m.status === 'Expired' || !hasEnd ? null : dayDiff(TODAY_ISO, m.end);
  const displayDays = days == null || isNaN(days) ? (hasEnd ? 'Expired' : 'No plan') : days + ' days';
  const displaySubtitle = days == null || isNaN(days) ? (hasEnd ? 'Renewal due' : 'Free account') : 'Left on plan';
  return (
    <Sheet open={true} onClose={onClose} title="Member details" sub={tok}>
      <div className="space-y-4 pb-4">
        <Card className="p-5">
          <div className="flex items-start gap-4">
            <Avatar name={m.name} size={60} />
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-lg font-semibold">{m.name}</h3>
              <p className="text-sm tabular-nums text-zinc-500">{m.phone || 'No phone'}</p>
              {m.email && <p className="text-xs text-zinc-400 truncate">{m.email}</p>}
              <div className="mt-2 flex flex-wrap gap-1.5">
                <StatusBadge s={m.status} />
                <Badge tone="muted">{m.plan || 'Free Member'}</Badge>
                <Badge tone="muted">{BR[m.branch]?.short || m.branch || 'Main'}</Badge>
              </div>
            </div>
          </div>
        </Card>
        <div className="space-y-4">
          <Card className="p-5">
            <h4 className="mb-3 text-sm font-semibold">Personal & Health Details</h4>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-xs text-zinc-500">Email Address</dt>
                <dd className="font-medium text-zinc-700 truncate">{m.email || '—'}</dd>
              </div>
              <div>
                <dt className="text-xs text-zinc-500">Gender</dt>
                <dd className="font-medium capitalize text-zinc-700">{m.gender || '—'}</dd>
              </div>
              <div>
                <dt className="text-xs text-zinc-500">Date of Birth</dt>
                <dd className="font-medium tabular-nums text-zinc-700">
                  {m.date_of_birth ? fmtDate(m.date_of_birth) : '—'}
                  {m.age ? ` (${m.age} yrs)` : ''}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-zinc-500">Height</dt>
                <dd className="font-medium tabular-nums text-zinc-700">
                  {m.height || m.height_cm ? `${m.height || m.height_cm} cm` : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-zinc-500">Weight</dt>
                <dd className="font-medium tabular-nums text-zinc-700">
                  {m.weight || m.weight_kg ? `${m.weight || m.weight_kg} kg` : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-zinc-500">Registered</dt>
                <dd className="font-medium tabular-nums text-zinc-700">{fmtDate(m.since || m.created_at)}</dd>
              </div>
            </dl>
          </Card>
          <Card className="p-5">
            <h4 className="mb-3 text-sm font-semibold">Membership details</h4>
            <div className="grid grid-cols-3 divide-x divide-zinc-100 rounded-lg bg-zinc-950 py-3 text-center text-white">
              <div>
                <p className="text-xl font-semibold tabular-nums text-emerald-400">{m.visits ?? 0}</p>
                <p className="text-[11px] text-zinc-400">Lifetime visits</p>
              </div>
              <div className="px-2">
                <p className="text-sm font-semibold tabular-nums">{m.last || 'Never'}</p>
                <p className="text-[11px] text-zinc-400">Last check-in</p>
              </div>
              <div>
                <p className="text-sm font-semibold tabular-nums">{displayDays}</p>
                <p className="text-[11px] text-zinc-400">{displaySubtitle}</p>
              </div>
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-xs text-zinc-500">Branch</dt>
                <dd className="font-medium">{BR[m.branch]?.short || m.branch || 'Main'}</dd>
              </div>
              <div>
                <dt className="text-xs text-zinc-500">Plan</dt>
                <dd className="font-medium">{m.plan}</dd>
              </div>
              <div>
                <dt className="text-xs text-zinc-500">Member since</dt>
                <dd className="font-medium tabular-nums">{fmtDate(m.since)}</dd>
              </div>
              <div>
                <dt className="text-xs text-zinc-500">Plan ends</dt>
                <dd className="font-medium tabular-nums">{hasEnd ? fmtDate(m.end) : 'No plan active'}</dd>
              </div>
            </dl>
            <p className="mt-3 flex items-center gap-2 text-xs text-zinc-500">
              <Icon n="Smartphone" size={13} className="text-emerald-600" />
              Profile synced from the Flutter app · v4.2.1 · 2 min ago
            </p>
          </Card>
          <Card className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <h4 className="text-sm font-semibold">Digital check-in QR code</h4>
              <Badge tone="green">Live in app</Badge>
            </div>
            <div className="rounded-lg border border-zinc-200 bg-white p-4">
              <QrCode value={tok} />
              <p className="mt-2 text-center font-mono text-sm font-medium tabular-nums tracking-wider">{tok}</p>
            </div>
            <Btn className="mt-3 w-full" v="outline" disabled={!perms.freeze} onClick={rotate}>
              <Icon n="RefreshCw" size={14} />
              Reissue / Rotate QR Code
            </Btn>
            <p className="mt-2 text-[11px] text-zinc-500">
              The old token stops working at the turnstile the moment a new one is issued.
            </p>
          </Card>
          <Card className="p-5">
            <h4 className="mb-3 text-sm font-semibold">CRM interaction history</h4>
            <div className="mb-4 space-y-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Channel" id="crm-ch">
                  <select
                    id="crm-ch"
                    className={inputCls}
                    value={note.channel}
                    onChange={(e) => setNote({ ...note, channel: e.target.value })}
                  >
                    {Object.keys(CHANNELS).map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Follow-up date" id="crm-fu">
                  <input
                    id="crm-fu"
                    type="date"
                    className={inputCls}
                    value={note.follow}
                    onChange={(e) => setNote({ ...note, follow: e.target.value })}
                  />
                </Field>
              </div>
              <Field label="Summary" id="crm-text">
                <textarea
                  id="crm-text"
                  rows="2"
                  className={cx(inputCls, 'h-auto py-2')}
                  value={note.text}
                  onChange={(e) => setNote({ ...note, text: e.target.value })}
                  placeholder="What was discussed?"
                ></textarea>
              </Field>
              <Btn v="primary" size="sm" disabled={!note.text.trim()} onClick={addNote}>
                <Icon n="Plus" size={14} />
                Add CRM Note
              </Btn>
            </div>
            <ol className="relative space-y-4 border-l border-zinc-200 pl-5">
              {(m.crm || []).map((c) => (
                <li key={c.id} className="relative">
                  <span className="absolute -left-[26px] top-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500 ring-1 ring-zinc-200"></span>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={CHANNELS[c.channel]?.[1] || 'muted'}>
                      <Icon n={CHANNELS[c.channel]?.[0] || 'Phone'} size={11} />
                      {c.channel}
                    </Badge>
                    <span className="text-xs text-zinc-500">{c.when}</span>
                  </div>
                  <p className="mt-1.5 text-sm text-zinc-800">{c.note}</p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                    <span>by {c.by}</span>
                    {c.follow && (
                      <Badge tone="green">
                        <Icon n="CalendarClock" size={11} />
                        Follow up {fmtDate(c.follow)}
                      </Badge>
                    )}
                  </div>
                </li>
              ))}
              {(!m.crm || m.crm.length === 0) && (
                <li className="text-xs text-zinc-400">No CRM notes recorded yet.</li>
              )}
            </ol>
          </Card>
        </div>
      </div>
    </Sheet>
  );
}

export function UserKpis({ rows }) {
  const total = rows.length;
  const active = rows.filter((m) => m.status === 'Active').length;
  const cutoff = iso(addDays(TODAY, -30));
  const fresh = rows.filter((m) => m.since >= cutoff).length;
  const pct = total ? Math.round((active / total) * 100) : 0;
  const items = [
    { label: 'Total Users', value: total, icon: 'Users', sub: fresh + ' joined in the last 30 days' },
    {
      label: 'Active Members',
      value: active,
      icon: 'TrendingUp',
      sub: pct + '% of all users · ' + (total - active) + ' frozen or expired',
    },
  ];
  return (
    <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
      {items.map((k) => (
        <Card key={k.label} className="min-w-0 p-4">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm text-zinc-600">{k.label}</p>
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-50 text-zinc-400">
              <Icon n={k.icon} size={17} />
            </span>
          </div>
          <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight">{k.value.toLocaleString('en-IN')}</p>
          <p className="mt-2 text-xs text-zinc-500">{k.sub}</p>
        </Card>
      ))}
    </div>
  );
}

export function UserManagement() {
  const { branch, perms, members, toast, startExport } = useApp();
  const [open, setOpen] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [nShown, setNShown] = useState(members.length);
  const rows = members.filter((m) => branch === 'all' || m.branch === branch);
  const doExport = () => {
    setExporting(true);
    startExport(nShown, branch, () => setExporting(false));
  };
  const copy = (t) => {
    try {
      navigator.clipboard.writeText(t).then(
        () => toast({ title: 'QR token copied', desc: t }),
        () => toast({ title: 'Copy blocked here', desc: 'Select the token text and copy it manually.' })
      );
    } catch (e) {
      toast({ title: 'Copy blocked here', desc: 'Select the token text and copy it manually.' });
    }
  };
  if (!perms.members)
    return (
      <div>
        <PageHead title="User Management" sub="Members, QR codes and CRM history" />
        <Locked
          title="Member records are restricted"
          text="Trainers can see their own classes and rosters, but not the member directory. Switch the role preview to Front Desk Staff, Branch Manager or Super Admin to continue."
        />
      </div>
    );
  const cols = [
    {
      id: 'name',
      label: 'Member',
      type: 'text',
      w: 240,
      get: (m) => m.name + ' ' + (m.phone || '') + ' ' + (m.email || ''),
      render: (m) => (
        <div className="flex items-center gap-3">
          <Avatar name={m.name} size={34} />
          <div className="min-w-0">
            <button
              className="text-left font-medium text-zinc-950 hover:text-emerald-700 truncate block max-w-[180px]"
              onClick={() => setOpen(m.id)}
            >
              {m.name}
            </button>
            <p className="text-xs tabular-nums text-zinc-500">{m.phone || 'No phone'}</p>
            {m.email && <p className="text-[11px] text-zinc-400 truncate max-w-[180px]">{m.email}</p>}
          </div>
        </div>
      ),
    },
    {
      id: 'profile',
      label: 'Gender / Health',
      type: 'text',
      w: 160,
      get: (m) => (m.gender || '') + ' ' + (m.date_of_birth || '') + ' ' + (m.weight ? m.weight + 'kg' : '') + ' ' + (m.height ? m.height + 'cm' : ''),
      render: (m) => (
        <div className="text-xs space-y-0.5">
          <p className="font-medium capitalize text-zinc-800">
            {m.gender || '—'}{m.age ? ` · ${m.age} yrs` : m.date_of_birth ? ` · ${fmtDate(m.date_of_birth)}` : ''}
          </p>
          {(m.height || m.height_cm || m.weight || m.weight_kg) && (
            <p className="text-zinc-500 tabular-nums">
              {[
                (m.height || m.height_cm) ? `${m.height || m.height_cm} cm` : null,
                (m.weight || m.weight_kg) ? `${m.weight || m.weight_kg} kg` : null,
              ].filter(Boolean).join(' · ')}
            </p>
          )}
        </div>
      ),
    },
    { id: 'plan', label: 'Plan', type: 'select', get: (m) => m.plan },
    {
      id: 'status',
      label: 'Status',
      type: 'select',
      get: (m) => m.status,
      render: (m) => <StatusBadge s={m.status} />,
    },
    {
      id: 'act',
      label: 'Actions',
      nofilter: true,
      get: (m) => '',
      render: (m) => (
        <div className="flex gap-1">
          <Tip text="View full details">
            <Btn v="ghost" size="icon" aria-label="View full details" onClick={() => setOpen(m.id)}>
              <Icon n="Eye" size={15} />
            </Btn>
          </Tip>
          <Tip text="Copy QR token">
            <Btn v="ghost" size="icon" aria-label="Copy QR token" onClick={() => copy(token(m))}>
              <Icon n="Copy" size={15} />
            </Btn>
          </Tip>
        </div>
      ),
    },
  ];
  return (
    <div>
      <PageHead title="User Management" sub="Members, QR codes and CRM history">
        {perms.exportMembers ? (
          <Btn v="dark" disabled={exporting} onClick={doExport}>
            <Icon
              n={exporting ? 'Loader2' : 'FileSpreadsheet'}
              size={15}
              className={exporting ? 'animate-spin' : 'text-emerald-400'}
            />
            Export to Excel
          </Btn>
        ) : (
          <Tip text="Export needs Branch Manager or above">
            <Btn v="outline" disabled={true}>
              <Icon n="Lock" size={14} />
              Export to Excel
            </Btn>
          </Tip>
        )}
      </PageHead>
      <UserKpis rows={rows} />
      <DataTable cols={cols} rows={rows} noun="members" maxH="max-h-[640px]" onCount={setNShown} />
      {open && <Dossier id={open} onClose={() => setOpen(null)} />}
    </div>
  );
}
