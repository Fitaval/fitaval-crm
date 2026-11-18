import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  RadialBarChart,
  RadialBar,
  PolarAngleAxis,
  Tooltip as RTooltip,
} from 'recharts';
import { CapBar } from '../../components/CapBar';
import { Icon } from '../../components/Icon';
import { Avatar } from '../../components/ui/Avatar';
import { Badge } from '../../components/ui/Badge';
import { Btn } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { PageHead } from '../../components/ui/PageHead';
import { useApp } from '../../context/AppContext';
import { BR } from '../../data/branches';
import { ROLES } from '../../data/roles';
import { chartColors } from '../../lib/theme';
import { cx, inr, mulberry, addDays, TODAY, fmtDate, fmtTime } from '../../lib/utils';

export function ChartTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="rounded-lg bg-zinc-950 px-3 py-2 text-xs text-white shadow-xl">
      <p className="mb-1 font-semibold">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} className="flex items-center gap-2 tabular-nums">
          <span
            className="h-2 w-2 rounded-full"
            style={{ background: p.dataKey === 'checkins' ? '#1EAE53' : '#999999' }}
          ></span>
          {p.name}: <b>{p.value}</b>
        </p>
      ))}
    </div>
  );
}

export function trendData(days, cat, branch) {
  return Array.from({ length: days }, (_, i) => {
    const d = addDays(TODAY, i - days + 1);
    return {
      label: d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
      checkins: 0,
      attendance: 0,
    };
  });
}

export function TrendCard() {
  const { branch, dark } = useApp();
  const C = chartColors(dark);
  const [days, setDays] = useState(14);
  const [kind, setKind] = useState('area');
  const data = useMemo(() => trendData(days, 'All', branch), [days, branch]);
  const total = data.reduce((a, b) => a + b.checkins, 0);
  const avg = Math.round(total / data.length);
  const best = data.reduce((a, b) => (b.checkins > a.checkins ? b : a), data[0]);
  const axis = { fontSize: 11, fill: C.axis };
  const common = { data, margin: { top: 8, right: 8, left: -18, bottom: 0 } };
  const xi = days > 14 ? 3 : days > 7 ? 1 : 0;
  return (
    <Card className="flex flex-col p-5 lg:col-span-2">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Member Check-In Trends</h2>
          <p className="mt-0.5 text-xs text-zinc-500">
            Turnstile scans, last {days} days ending {fmtDate(TODAY)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-md border border-zinc-200 p-0.5" role="group" aria-label="Date range">
            {[7, 14, 30].map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={cx(
                  'rounded px-2.5 py-1 text-xs font-semibold tabular-nums',
                  days === d ? 'bg-zinc-950 text-white' : 'text-zinc-500 hover:text-zinc-950'
                )}
              >
                {d}D
              </button>
            ))}
          </div>
          <div className="inline-flex rounded-md border border-zinc-200 p-0.5" role="group" aria-label="Chart type">
            {[
              ['area', 'Activity'],
              ['bar', 'BarChart3'],
            ].map(([k, ic]) => (
              <button
                key={k}
                aria-label={k + ' chart'}
                onClick={() => setKind(k)}
                className={cx(
                  'rounded px-2 py-1',
                  kind === k ? 'bg-zinc-950 text-emerald-400' : 'text-zinc-500 hover:text-zinc-950'
                )}
              >
                <Icon n={ic} size={14} />
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-3 border-y border-zinc-100 py-3">
        <div>
          <p className="text-[11px] uppercase tracking-wider text-zinc-500">Check-ins</p>
          <p className="text-lg font-semibold tabular-nums">{total.toLocaleString('en-IN')}</p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-wider text-zinc-500">Average per day</p>
          <p className="text-lg font-semibold tabular-nums">{avg}</p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-wider text-zinc-500">Busiest day</p>
          <p className="text-lg font-semibold tabular-nums">{best.label}</p>
        </div>
      </div>
      <div className="mt-3 h-64 w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          {kind === 'area' ? (
            <AreaChart {...common}>
              <defs>
                <linearGradient id="gCheck" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#1EAE53" stopOpacity={0.42} />
                  <stop offset="100%" stopColor="#1EAE53" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={C.grid} vertical={false} />
              <XAxis dataKey="label" tick={axis} tickLine={false} axisLine={false} interval={xi} />
              <YAxis tick={axis} tickLine={false} axisLine={false} />
              <RTooltip content={<ChartTooltip />} cursor={{ stroke: C.cursor }} />
              <Area
                type="monotone"
                dataKey="checkins"
                name="Check-ins"
                stroke="#1EAE53"
                strokeWidth={2.5}
                fill="url(#gCheck)"
              />
            </AreaChart>
          ) : (
            <BarChart {...common}>
              <CartesianGrid stroke={C.grid} vertical={false} />
              <XAxis dataKey="label" tick={axis} tickLine={false} axisLine={false} interval={xi} />
              <YAxis tick={axis} tickLine={false} axisLine={false} />
              <RTooltip content={<ChartTooltip />} cursor={{ fill: C.grid }} />
              <Bar dataKey="checkins" name="Check-ins" fill="#1EAE53" radius={[3, 3, 0, 0]} />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

export function FeedCard({ feedItems }) {
  const { feed: ctxFeed } = useApp();
  const feed = feedItems && feedItems.length > 0 ? feedItems : ctxFeed;
  return (
    <Card className="flex min-h-0 flex-col">
      <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4">
        <div>
          <h2 className="text-base font-semibold">Live Front-Desk Feed</h2>
          <p className="mt-0.5 text-xs text-zinc-500">Turnstile scans as they happen</p>
        </div>
        <span className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-700">
          <span className="pulse-ring h-2 w-2 rounded-full bg-emerald-500"></span>LIVE
        </span>
      </div>
      <ul className="thin-scroll max-h-[540px] min-h-0 flex-1 divide-y divide-zinc-100 overflow-y-auto">
        {feed.length === 0 ? (
          <li className="flex flex-col items-center justify-center py-12 px-4 text-center text-zinc-400">
            <span className="mb-2 text-2xl">📋</span>
            <p className="text-sm font-medium text-zinc-600">No Check-ins Yet</p>
            <p className="text-xs text-zinc-400 mt-0.5">Live front-desk turnstile and desk scans will appear here.</p>
          </li>
        ) : (
          feed.map((e) => (
            <li key={e.id} className="feed-in flex items-center gap-3 px-5 py-3">
              <Avatar name={e.name} size={34} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-zinc-950">{e.name}</p>
                <p className="truncate text-xs text-zinc-500">
                  {BR[e.branch]?.short || e.branch || 'Main'} · {e.dir === 'IN' ? 'Entry' : 'Exit'}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1">
                {e.status === 'ACTIVE' ? <Badge tone="green">ACTIVE</Badge> : <Badge tone="outline">{e.status}</Badge>}
                <span className="text-[11px] tabular-nums text-zinc-500">{fmtTime(e.at)}</span>
              </div>
            </li>
          ))
        )}
      </ul>
    </Card>
  );
}

export function Dashboard() {
  const { branch, perms, role, occ, scans, setSection, approvals, dark, members, gyms, client } = useApp();
  const [dashData, setDashData] = useState(null);

  useEffect(() => {
    let isMounted = true;
    if (client?.dashboard?.get) {
      client.dashboard.get().then((res) => {
        if (isMounted && res) {
          setDashData(res.data || res);
        }
      }).catch((e) => console.warn('Admin dashboard fetch failed:', e));
    }
    return () => { isMounted = false; };
  }, [client]);

  const C = chartColors(dark);
  const act = dashData?.active_memberships ?? (members || []).filter((m) => m.status === 'Active').length;
  const frz = dashData?.frozen_memberships ?? (members || []).filter((m) => m.status === 'Frozen' || m.status === 'Expired').length;
  const totMembers = act + frz || 1;
  const maxCap = dashData?.live_capacity?.max || Math.max(act, 10);
  const active = dashData?.live_capacity?.current ?? act;
  const pct = dashData?.live_capacity?.percentage ?? (maxCap ? Math.round((active / maxCap) * 100) : 0);
  const mood = dashData?.live_capacity?.status || (pct < 60 ? 'Comfortable' : pct < 85 ? 'Busy' : 'Near capacity');
  const mrr = dashData?.mrr !== undefined ? Number(dashData.mrr) : 0;
  const checkins = dashData?.today_checkins ?? 0;
  const apprList = approvals || [];
  const apprN = dashData?.gym_registrations?.approved ?? apprList.filter((a) => a.status === 'Approved').length;
  const pendN = dashData?.gym_registrations?.pending ?? apprList.filter((a) => a.status === 'Pending' || a.status === 'Under Review').length;
  const totN = (apprN + pendN) || apprList.length || 1;
  const trend = '0%';
  const spark = useMemo(() => Array.from({ length: 14 }, (_, i) => ({ i, v: 0 })), []);
  const hourly = Array.from({ length: 14 }, (_, i) => ({ h: i + 6, v: 0 }));
  const gymsTable = dashData?.gyms_table || [];
  return (
    <div>
      <PageHead
        title="Dashboard"
        sub={
          'Real-time capacity and snapshots · ' +
          new Date(TODAY).toLocaleDateString('en-IN', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })
        }
      >
        <Btn v="outline" onClick={() => setSection('gym')}>
          <Icon n="ClipboardCheck" size={15} />
          All gyms
        </Btn>
      </PageHead>
      <Card className="mb-4 overflow-hidden">
        <div className="grid items-center gap-2 p-5 md:grid-cols-[240px_1fr] md:gap-6">
          <div className="relative mx-auto h-[150px] w-full max-w-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart
                cx="50%"
                cy="85%"
                innerRadius="82%"
                outerRadius="118%"
                barSize={16}
                data={[{ name: 'Occupancy', v: pct, fill: pct > 90 ? C.ink : C.primary }]}
                startAngle={180}
                endAngle={0}
              >
                <PolarAngleAxis type="number" domain={[0, 100]} tick={false} angleAxisId={0} />
                <RadialBar dataKey="v" cornerRadius={8} background={{ fill: C.track }} angleAxisId={0} />
              </RadialBarChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-x-0 bottom-1 text-center">
              <p className="text-4xl font-semibold leading-none tabular-nums tracking-tight">{pct}%</p>
              <p className="mt-1 text-[11px] uppercase tracking-wider text-zinc-500">Occupancy</p>
            </div>
          </div>
          <div className="min-w-0">
            <div className="mb-1 flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-700">
                <span className="pulse-ring h-2 w-2 rounded-full bg-emerald-500"></span>LIVE CAPACITY
              </span>
              <Badge tone={pct < 85 ? 'green' : 'black'}>{mood}</Badge>
            </div>
            <p className="text-2xl font-semibold tabular-nums tracking-tight sm:text-3xl">
              {active} / {maxCap} <span className="text-lg font-medium text-zinc-500">Active · {pct}% Occupancy</span>
            </p>
            <div className="mt-4 grid gap-x-6 gap-y-3 sm:grid-cols-2">
              <CapBar label="Turnstile Check-ins" v={active} max={maxCap} />
            </div>
          </div>{' '}
        </div>
      </Card>
      <div className="mb-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div
          className="relative overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950 p-5 text-white"
          style={{ backgroundImage: 'radial-gradient(circle at 100% 0%, rgba(30,174,83,.28), transparent 55%)' }}
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-400">Monthly recurring revenue</p>
            <Icon n="IndianRupee" size={16} className="text-emerald-400" />
          </div>
          <div className={cx('mt-3 transition', !perms.revenue && 'select-none blur-md')} aria-hidden={!perms.revenue}>
            <p className="text-3xl font-semibold tabular-nums tracking-tight">
              {perms.revenue ? inr(mrr) : '₹8,88,888'}
            </p>
            <div className="mt-2 flex items-center gap-2">
              <Badge tone="solid">
                <Icon n="TrendingUp" size={11} />
                Live
              </Badge>
              <span className="text-xs text-zinc-400">calculated from active users</span>
            </div>
            <div className="mt-3 h-12">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={spark} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
                  <Area type="monotone" dataKey="v" stroke="#47D17A" strokeWidth={2} fill="#1EAE53" fillOpacity={0.2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
          {!perms.revenue && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-zinc-950/40 text-center">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500 text-zinc-950">
                <Icon n="Lock" size={16} />
              </span>
              <p className="text-xs font-semibold">Financials hidden for {ROLES.find((r) => r.id === role).label}</p>
            </div>
          )}
        </div>
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">Active memberships</p>
            <Icon n="Users" size={16} className="text-emerald-600" />
          </div>
          <p className="mt-3 text-3xl font-semibold tabular-nums tracking-tight">
            {act} <span className="text-base font-medium text-zinc-500">Active</span>
          </p>
          <p className="mt-2 flex items-center gap-2 text-sm text-zinc-600">
            <Icon n="Snowflake" size={14} />
            {frz} Frozen
          </p>
          <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-zinc-100">
            <div className="bg-emerald-500" style={{ width: (act / totMembers) * 100 + '%' }}></div>
            <div className="bg-zinc-950" style={{ width: (frz / totMembers) * 100 + '%' }}></div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">Today's check-ins</p>
            <Icon n="ScanLine" size={16} className="text-emerald-600" />
          </div>
          <p className="mt-3 text-3xl font-semibold tabular-nums tracking-tight">
            {checkins} <span className="text-base font-medium text-zinc-500">Scans</span>
          </p>
          <p className="mt-2 flex items-center gap-2 text-sm text-zinc-600">
            <Icon n="Clock" size={14} />
            Real-time scanner
          </p>
          <div className="mt-2 h-8">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hourly} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                <Bar dataKey="v" fill="#1EAE53" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">Gym registrations</p>
            <Icon n="Building2" size={16} className="text-emerald-600" />
          </div>
          <p className="mt-3 text-3xl font-semibold tabular-nums tracking-tight">
            {apprN} <span className="text-base font-medium text-zinc-500">Approved</span>
          </p>
          <button
            onClick={() => setSection('gym')}
            className="mt-2 flex items-center gap-2 text-sm text-zinc-600 hover:text-emerald-700"
          >
            <Icon n="ClipboardCheck" size={14} />
            {pendN} awaiting review
          </button>
          <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-zinc-100">
            <div className="bg-emerald-500" style={{ width: (apprN / totN) * 100 + '%' }}></div>
            <div className="bg-zinc-950" style={{ width: (pendN / totN) * 100 + '%' }}></div>
          </div>
        </Card>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <TrendCard />
        <FeedCard feedItems={dashData?.front_desk_feed} />
      </div>

      {/* Gyms Performance Overview Table */}
      <div className="mt-6">
        <Card className="p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-base font-semibold text-zinc-950 dark:text-white">Gyms Performance Overview</h2>
              <p className="text-xs text-zinc-500 mt-0.5">Live operational metrics, occupancy, and monthly revenue per gym</p>
            </div>
            <Btn v="outline" size="sm" onClick={() => setSection('gym')}>
              <Icon n="Building2" size={14} />
              Manage All Gyms
            </Btn>
          </div>
          {gymsTable.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center text-zinc-400">
              <span className="text-2xl mb-1">🏢</span>
              <p className="text-sm font-medium text-zinc-600">No Gym Records Found</p>
              <p className="text-xs text-zinc-400 mt-0.5">Approved and registered gyms will appear here.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-100 dark:border-zinc-800 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                    <th className="pb-3 pr-4">Gym</th>
                    <th className="pb-3 px-4">Status</th>
                    <th className="pb-3 px-4 text-right">Active Members</th>
                    <th className="pb-3 px-4 text-right">Today's Scans</th>
                    <th className="pb-3 px-4 text-right">Monthly Revenue</th>
                    <th className="pb-3 px-4 text-center">Occupancy</th>
                    <th className="pb-3 pl-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {gymsTable.map((g) => (
                    <tr key={g.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/50 transition-colors">
                      <td className="py-3.5 pr-4">
                        <p className="font-semibold text-zinc-950 dark:text-white">{g.name}</p>
                        <p className="text-xs text-zinc-500 font-mono">{g.registration_number}{g.city ? ` · ${g.city}` : ''}</p>
                      </td>
                      <td className="py-3.5 px-4">
                        <Badge tone={g.status?.toLowerCase() === 'approved' ? 'green' : 'amber'}>
                          {g.status}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4 text-right tabular-nums font-medium">
                        {g.active_members}
                      </td>
                      <td className="py-3.5 px-4 text-right tabular-nums font-medium">
                        {g.today_scans}
                      </td>
                      <td className="py-3.5 px-4 text-right tabular-nums font-semibold text-emerald-600">
                        ₹{Number(g.monthly_revenue).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                          {g.occupancy_pct}%
                        </span>
                      </td>
                      <td className="py-3.5 pl-4 text-right">
                        <Link
                          to={`/admin/gyms/${g.id}`}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1.5 rounded-lg transition-colors"
                        >
                          View
                          <Icon n="ChevronRight" size={13} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
