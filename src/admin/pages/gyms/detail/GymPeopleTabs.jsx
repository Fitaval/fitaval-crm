import { useState } from 'react';
import { DataTable, actBadge, DetailSheet, nameBtn, viewBtn } from '../../../components/DataTable';
import { Badge, StatusBadge } from '../../../components/ui/Badge';
import { Card } from '../../../components/ui/Card';
import { Locked } from '../../../components/ui/PageHead';
import { useApp } from '../../../context/AppContext';
import { inr, fmtDate, DAYS_FULL, cx } from '../../../lib/utils';

function HoursSchedule({ hours }) {
  if (!hours) return <span className="text-zinc-500">Standard Hours (06:00 AM - 10:00 PM)</span>;
  if (typeof hours === 'string') return <span>{hours}</span>;
  if (!Array.isArray(hours) || !hours.length) return <span className="text-zinc-500">Standard Hours (06:00 AM - 10:00 PM)</span>;

  const todayIdx = (new Date().getDay() + 6) % 7;

  return (
    <div className="mt-1 overflow-hidden rounded-lg border border-zinc-200/80 bg-zinc-50/70 dark:border-zinc-800 dark:bg-zinc-900/50">
      <ul className="divide-y divide-zinc-200/60 dark:divide-zinc-800/80 text-xs">
        {hours.map((h, i) => {
          const isToday = i === todayIdx;
          const dayName = h.day || DAYS_FULL[i] || `Day ${i + 1}`;
          const isOpen = Boolean(h.open);
          const timeText = isOpen ? `${h.from || '06:00 AM'} – ${h.to || '10:00 PM'}` : 'Closed';

          return (
            <li
              key={i}
              className={cx(
                'flex items-center justify-between px-3 py-1.5',
                isToday && 'bg-emerald-500/10 font-medium'
              )}
            >
              <span className="flex items-center gap-1.5">
                <span className={cx(isToday ? 'font-semibold text-emerald-700 dark:text-emerald-400' : 'text-zinc-600 dark:text-zinc-400')}>
                  {dayName}
                </span>
                {isToday && (
                  <Badge tone="green" className="px-1.5 py-0 text-[10px]">
                    Today
                  </Badge>
                )}
              </span>
              <span className="flex items-center gap-1.5 tabular-nums">
                <span className={cx(isOpen ? 'text-zinc-900 dark:text-zinc-100 font-medium' : 'text-zinc-400 dark:text-zinc-500')}>
                  {timeText}
                </span>
                <span
                  className={cx(
                    'h-1.5 w-1.5 rounded-full',
                    isOpen ? 'bg-emerald-500' : 'bg-zinc-300 dark:bg-zinc-600'
                  )}
                />
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function GymStaffTab({ g }) {
  const [open, setOpen] = useState(null);
  const tone = { 'On Shift': 'green', 'Off Today': 'muted', 'On Leave': 'black' };
  const staff = Array.isArray(g?.staff) ? g.staff : [];
  const c = (k) => staff.filter((s) => s.status === k).length;
  const cur = staff.find((s) => s.id === open);
  const cols = [
    {
      id: 'name',
      label: 'Staff member',
      type: 'text',
      w: 220,
      get: (s) => s.name + ' ' + s.role,
      render: (s) => nameBtn(s.name, s.role, () => setOpen(s.id)),
    },
    { id: 'phone', label: 'Phone number', type: 'text', get: (s) => s.phone },
    {
      id: 'status',
      label: 'Shift status',
      type: 'select',
      get: (s) => s.status,
      render: (s) => <Badge tone={tone[s.status]}>{s.status}</Badge>,
    },
    {
      id: 'active',
      label: 'Active status',
      type: 'select',
      get: (s) => (s.active ? 'Active' : 'Inactive'),
      render: (s) => actBadge(s.active),
    },
    { id: 'act', label: 'Actions', nofilter: true, get: (s) => '', render: (s) => viewBtn(() => setOpen(s.id)) },
  ];
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          ['Total staff', staff.length],
          ['On shift now', c('On Shift')],
          ['On leave', c('On Leave')],
        ].map(([l, v]) => (
          <Card key={l} className="p-4">
            <p className="text-xs text-zinc-500">{l}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{v}</p>
          </Card>
        ))}
      </div>
      <DataTable cols={cols} rows={staff} noun="staff" />
      {cur && (
        <DetailSheet
          title="Staff details"
          sub={g.name}
          name={cur.name}
          onClose={() => setOpen(null)}
          badges={
            <>
              <Badge tone="muted">{cur.role}</Badge>
              <Badge tone={tone[cur.status]}>{cur.status}</Badge>
              {actBadge(cur.active)}
            </>
          }
          sections={[
            [
              'Contact',
              [
                ['Phone number', cur.phone],
                ['Email address', cur.email, true],
              ],
            ],
            [
              'Work',
              [
                ['Role', cur.role],
                ['Joined', fmtDate(cur.since)],
                ['Operating hours', <HoursSchedule hours={cur.hours || g?.hours} />, true],
              ],
            ],
            ['About', [['Bio', cur.bio || 'No bio provided.', true]]],
          ]}
        />
      )}
    </div>
  );
}

export function GymTrainersTab({ g }) {
  const [open, setOpen] = useState(null);
  const trainers = Array.isArray(g?.trainers) ? g.trainers : [];
  const cur = trainers.find((t) => t.id === open);
  const cols = [
    {
      id: 'name',
      label: 'Trainer',
      type: 'text',
      w: 220,
      get: (t) => t.name,
      render: (t) => nameBtn(t.name, (t.exp || 0) + ' yrs experience', () => setOpen(t.id)),
    },
    { id: 'phone', label: 'Phone number', type: 'text', get: (t) => t.phone },
    {
      id: 'active',
      label: 'Active status',
      type: 'select',
      get: (t) => (t.active ? 'Active' : 'Inactive'),
      render: (t) => actBadge(t.active),
    },
    { id: 'act', label: 'Actions', nofilter: true, get: (t) => '', render: (t) => viewBtn(() => setOpen(t.id)) },
  ];
  return (
    <div>
      <DataTable cols={cols} rows={trainers} noun="trainers" />
      {cur && (
        <DetailSheet
          title="Trainer details"
          sub={g.name}
          name={cur.name}
          onClose={() => setOpen(null)}
          badges={
            <>
              {actBadge(cur.active)}
              <Badge tone="muted">{cur.exp} yrs experience</Badge>
            </>
          }
          sections={[
            [
              'Contact',
              [
                ['Phone number', cur.phone],
                ['Email address', cur.email, true],
              ],
            ],
            [
              'Coaching',
              [
                ['Experience', cur.exp + ' years'],
                ['Joined', fmtDate(cur.since)],
                ['Clients', cur.clients],
                ['Certifications', cur.certs || 'No certifications recorded.', true],
                [
                  'Specializations',
                  <div className="flex flex-wrap gap-1">
                    {(cur.specs || []).map((x) => (
                      <Badge key={x} tone="green">
                        {x}
                      </Badge>
                    ))}
                  </div>,
                  true,
                ],
                ['Operating hours', <HoursSchedule hours={cur.hours || g?.hours} />, true],
              ],
            ],
            ['About', [['Coach bio', cur.bio || 'No coach bio provided.', true]]],
          ]}
        />
      )}
    </div>
  );
}

export function GymMembersTab({ g }) {
  const { perms } = useApp();
  const [open, setOpen] = useState(null);
  if (!perms.members)
    return (
      <Locked
        title="Member records are restricted"
        text="Trainers cannot see the member list. Switch the role preview to Front Desk Staff, Branch Manager or Super Admin to continue."
      />
    );
  const payTone = { Paid: 'green', Partial: 'outline', Pending: 'black' };
  const members = Array.isArray(g?.members) ? g.members : [];
  const cur = members.find((m) => m.id === open);
  const cols = [
    {
      id: 'name',
      label: 'Member',
      type: 'text',
      w: 220,
      get: (m) => m.name,
      render: (m) => nameBtn(m.name, null, () => setOpen(m.id)),
    },
    { id: 'phone', label: 'Phone number', type: 'text', get: (m) => m.phone },
    { id: 'plan', label: 'Membership plan', type: 'select', get: (m) => m.plan },
    {
      id: 'status',
      label: 'Membership status',
      type: 'select',
      get: (m) => m.status,
      render: (m) => <StatusBadge s={m.status} />,
    },
    {
      id: 'pay',
      label: 'Payment status',
      type: 'select',
      get: (m) => m.pay,
      render: (m) => <Badge tone={payTone[m.pay]}>{m.pay}</Badge>,
    },
    { id: 'act', label: 'Actions', nofilter: true, get: (m) => '', render: (m) => viewBtn(() => setOpen(m.id)) },
  ];
  return (
    <div>
      <DataTable cols={cols} rows={members} noun="members" />
      {cur && (
        <DetailSheet
          title="Member details"
          sub={cur.token}
          name={cur.name}
          onClose={() => setOpen(null)}
          badges={
            <>
              <StatusBadge s={cur.status} />
              <Badge tone="muted">{cur.plan}</Badge>
              <Badge tone={payTone[cur.pay]}>{cur.pay}</Badge>
            </>
          }
          sections={[
            [
              'Personal',
              [
                ['Gender', cur.gender],
                ['Date of birth', fmtDate(cur.dob)],
                ['Phone number', cur.phone],
                ['Email address', cur.email, true],
                ['Address', cur.address, true],
              ],
            ],
            [
              'Membership',
              [
                ['Plan', cur.plan],
                ['Plan fee', inr(cur.fee)],
                ['Start date', fmtDate(cur.start)],
                ['End date', fmtDate(cur.end)],
                ['Assigned trainer', cur.trainer],
                ['Last visit', fmtDate(cur.last)],
                ['Payment method', cur.payMethod, true],
                ['QR token', <span className="font-mono text-xs">{cur.token}</span>, true],
              ],
            ],
          ]}
        />
      )}
    </div>
  );
}
