import { useEffect, useMemo, useState } from 'react';
import { adminClient } from '../../api/client';
import { Icon } from '../../components/Icon';
import { Card } from '../../components/ui/Card';
import { PageHead } from '../../components/ui/PageHead';
import { fmtDate } from '../../lib/utils';

export function FeedbackManagement() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [optionFilter, setOptionFilter] = useState('all');

  useEffect(() => {
    let cancelled = false;
    adminClient.feedback
      .list()
      .then((res) => {
        if (!cancelled) setItems(Array.isArray(res) ? res : []);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const crmItems = useMemo(() => items.filter((f) => f.source === 'crm'), [items]);
  const appItems = useMemo(() => items.filter((f) => (f.source || 'app') === 'app'), [items]);

  const avgRating = useMemo(() => {
    const rated = items.filter((f) => Number(f.rating) >= 1 && Number(f.rating) <= 5);
    if (!rated.length) return null;
    const sum = rated.reduce((acc, f) => acc + Number(f.rating), 0);
    return (sum / rated.length).toFixed(1);
  }, [items]);

  const allOptions = useMemo(() => {
    const counts = new Map();
    items.forEach((f) => {
      (f.selected_options || []).forEach((opt) => {
        counts.set(opt, (counts.get(opt) || 0) + 1);
      });
    });
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  }, [items]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((f) => {
      const src = f.source || 'app';
      if (sourceFilter !== 'all' && src !== sourceFilter) {
        return false;
      }
      if (optionFilter !== 'all' && !(f.selected_options || []).includes(optionFilter)) {
        return false;
      }
      if (!q) return true;
      return (
        (f.user_name || '').toLowerCase().includes(q) ||
        (f.gym_name || '').toLowerCase().includes(q) ||
        (f.user_phone || '').toLowerCase().includes(q) ||
        (f.user_email || '').toLowerCase().includes(q) ||
        (f.text || '').toLowerCase().includes(q) ||
        (f.selected_options || []).some((o) => o.toLowerCase().includes(q))
      );
    });
  }, [items, query, sourceFilter, optionFilter]);

  const topOption = allOptions.length ? allOptions[0][0] : '—';

  return (
    <div>
      <PageHead
        title="Feedback & Ratings"
        sub="Responses submitted from the Fitaval mobile app and Gym CRM"
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Total Responses</p>
          <p className="mt-2 text-3xl font-semibold tabular-nums">{items.length}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Gym CRM Feedback</p>
          <p className="mt-2 text-3xl font-semibold tabular-nums text-sky-500">{crmItems.length}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Average Rating</p>
          <p className="mt-2 text-3xl font-semibold tabular-nums text-amber-500">
            {avgRating ? `${avgRating} ★` : '—'}
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Top Selected Topic</p>
          <p className="mt-2 truncate text-lg font-semibold text-emerald-500">{topOption}</p>
        </Card>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Icon n="Search" size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by user, gym, phone, topic, or message..."
            className="w-full rounded-xl border border-zinc-200 bg-transparent py-2 pl-9 pr-3 text-sm outline-none focus:border-emerald-500 dark:border-white/10"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {[
            { id: 'all', label: `All Sources (${items.length})` },
            { id: 'crm', label: `Gym CRM (${crmItems.length})` },
            { id: 'app', label: `Mobile App (${appItems.length})` },
          ].map((s) => (
            <button
              key={s.id}
              onClick={() => setSourceFilter(s.id)}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                sourceFilter === s.id
                  ? 'bg-emerald-500 text-slate-950'
                  : 'border border-zinc-200 text-zinc-500 hover:text-zinc-900 dark:border-white/10 dark:text-zinc-400'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {allOptions.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-1.5">
          <button
            onClick={() => setOptionFilter('all')}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
              optionFilter === 'all'
                ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-950'
                : 'border border-zinc-200 text-zinc-500 hover:text-zinc-900 dark:border-white/10 dark:text-zinc-400'
            }`}
          >
            All Topics
          </button>
          {allOptions.map(([opt, count]) => (
            <button
              key={opt}
              onClick={() => setOptionFilter(opt)}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                optionFilter === opt
                  ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-950'
                  : 'border border-zinc-200 text-zinc-500 hover:text-zinc-900 dark:border-white/10 dark:text-zinc-400'
              }`}
            >
              {opt} ({count})
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <Card className="p-8 text-center text-sm text-zinc-500">Loading feedback...</Card>
      ) : filtered.length === 0 ? (
        <Card className="p-8 text-center text-sm text-zinc-500">No feedback matches the current filters.</Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((f) => {
            const isCrm = f.source === 'crm';
            const ratingVal = Number(f.rating);
            return (
              <Card key={f.id} className="rounded-2xl p-5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold">{f.user_name}</p>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                          isCrm
                            ? 'bg-sky-500/15 text-sky-400 border border-sky-500/30'
                            : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                        }`}
                      >
                        {isCrm ? 'Gym CRM' : 'Mobile App'}
                      </span>
                      {f.gym_name && (
                        <span className="rounded-full bg-zinc-500/10 border border-zinc-500/20 px-2 py-0.5 text-[11px] font-medium text-zinc-300">
                          {f.gym_name}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-zinc-400">
                      {[f.user_phone, f.user_email].filter(Boolean).join(' · ') || 'No contact info'}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {ratingVal >= 1 && ratingVal <= 5 && (
                      <div className="flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-400">
                        <span>{'★'.repeat(ratingVal)}</span>
                        <span className="tabular-nums">{ratingVal}/5</span>
                      </div>
                    )}
                    <span className="text-xs tabular-nums text-zinc-400">
                      {f.created_at ? fmtDate(f.created_at.slice(0, 10)) : ''}
                    </span>
                  </div>
                </div>

                {(f.selected_options || []).length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {f.selected_options.map((opt) => (
                      <span
                        key={opt}
                        className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-400"
                      >
                        {opt}
                      </span>
                    ))}
                  </div>
                )}

                {f.text ? (
                  <p className="mt-3 text-sm leading-relaxed text-zinc-200">{f.text}</p>
                ) : (
                  <p className="mt-3 text-xs italic text-zinc-500">No additional message provided.</p>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
