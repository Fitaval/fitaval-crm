import { useState } from 'react';
import { GymScene, MapView } from '../../../components/GymVisuals';
import { Icon } from '../../../components/Icon';
import { Section } from '../../../components/Section';
import { Badge } from '../../../components/ui/Badge';
import { useApp } from '../../../context/AppContext';
import { SCENES, isServiceAmenity } from '../../../data/gyms';
import { cx, TODAY, DAYS_FULL } from '../../../lib/utils';

export function OverviewTab({ g }) {
  const { updateGym, toast } = useApp() || {};
  const [sf, setSf] = useState('all');
  const [editingNote, setEditingNote] = useState(false);
  const [noteVal, setNoteVal] = useState(() => g?.internal_note || '');
  const rawFac = Array.isArray(g?.facilities) ? g.facilities : [];
  const rawSvc = Array.isArray(g?.services) ? g.services : [];

  let facilities = rawFac;
  let services = rawSvc;
  if (services.length === 0 && rawFac.length > 0) {
    services = rawFac.filter(isServiceAmenity);
    facilities = rawFac.filter((x) => !isServiceAmenity(x));
    if (facilities.length === 0 && services.length === 0) {
      facilities = rawFac;
    }
  }

  const items = [...facilities.map((n) => ({ n, t: 'f' })), ...services.map((n) => ({ n, t: 's' }))];
  const shown = items.filter((i) => sf === 'all' || (sf === 'f' ? i.t === 'f' : i.t === 's'));
  const todayIdx = (TODAY.getDay() + 6) % 7;
  const filt = [
    ['all', 'All', items.length],
    ['s', 'Services', services.length],
    ['f', 'Facilities', facilities.length],
  ];
  const hoursList = Array.isArray(g?.hours) ? g.hours : [];
  const photosList = Array.isArray(g?.photos) ? g.photos : [];
  const addressText = [g?.addr || g?.address, g?.loc || g?.city, g?.zip].filter(Boolean).join(', ') || 'Not set';
  const phoneText = g?.phone || g?.contact_phone || g?.owner_phone || 'Not set';
  const emailText = g?.email || g?.contact_email || g?.owner_email || 'Not set';

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="space-y-4">
        <Section icon="Contact" title="Contact information">
          <ul className="space-y-3">
            {[
              ['MapPin', 'Address', addressText],
              ['Phone', 'Phone', phoneText],
              ['Mail', 'Email', emailText],
            ].map(([ic, l, v]) => (
              <li key={l} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                  <Icon n={ic} size={14} />
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] text-zinc-500">{l}</p>
                  <p className="break-words text-sm font-semibold tabular-nums">{v}</p>
                </div>
              </li>
            ))}
          </ul>
        </Section>
        <Section icon="Info" title="About">
          <p className="text-sm leading-relaxed text-zinc-600">{g?.about || g?.description || 'No description provided.'}</p>
        </Section>
        <Section icon="FileText" title="Internal admin note">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs text-zinc-500">Visible only to platform administrators</p>
            {editingNote ? (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setNoteVal(g?.internal_note || '');
                    setEditingNote(false);
                  }}
                  className="text-xs text-zinc-500 hover:text-zinc-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (updateGym) updateGym(g.id, { internal_note: noteVal });
                    if (toast) toast({ title: 'Internal note saved', desc: 'Updated admin note.' });
                    setEditingNote(false);
                  }}
                  className="rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-emerald-700"
                >
                  Save
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setNoteVal(g?.internal_note || '');
                  setEditingNote(true);
                }}
                className="text-xs font-semibold text-emerald-600 hover:underline"
              >
                {g?.internal_note ? 'Edit note' : '+ Add note'}
              </button>
            )}
          </div>
          {editingNote ? (
            <textarea
              rows={3}
              className="w-full rounded-lg border border-zinc-200 p-2 text-xs text-zinc-800 focus:border-emerald-500 focus:outline-none"
              value={noteVal}
              onChange={(e) => setNoteVal(e.target.value)}
              placeholder="Admin-only observations, KYC details, or verification history..."
            />
          ) : (
            <p className="text-sm text-zinc-600 whitespace-pre-wrap">
              {g?.internal_note || 'No internal admin note recorded for this gym.'}
            </p>
          )}
        </Section>
        <Section
          icon="Clock"
          title="Operating hours"
        >
          {hoursList.length > 0 ? (
            <ul className="divide-y divide-zinc-100">
              {hoursList.map((h, i) => (
                <li key={i} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <span className={cx('flex items-center gap-2', i === todayIdx ? 'font-semibold' : 'font-medium')}>
                    {DAYS_FULL[i]}
                    {i === todayIdx && <Badge tone="green">Today</Badge>}
                  </span>
                  <span className="flex items-center gap-2 tabular-nums">
                    <span className={h?.open ? 'text-zinc-800' : 'text-zinc-400'}>
                      {h?.open ? h?.from + ' to ' + h?.to : 'Closed'}
                    </span>
                    <span className={cx('h-2 w-2 rounded-full', h?.open ? 'bg-emerald-500' : 'bg-zinc-300')}></span>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm py-2 text-zinc-600">{typeof g?.hours === 'string' && g.hours ? g.hours : (g?.open_hours || 'Custom schedule configured')}</p>
          )}
        </Section>
      </div>
      <div className="space-y-4">
        <Section
          icon="Sparkles"
          title="Services and amenities"
        >
          <p className="mb-3 text-xs text-zinc-500">
            Available facilities, wellness perks and member service offerings
          </p>
          <div className="mb-3 flex flex-wrap gap-1.5">
            {filt.map(([k, l, n]) => (
              <button
                key={k}
                onClick={() => setSf(k)}
                aria-pressed={sf === k}
                className={cx(
                  'rounded-full border px-3 py-1 text-xs font-semibold',
                  sf === k
                    ? 'border-emerald-500 bg-emerald-500 text-white'
                    : 'border-zinc-200 text-zinc-600 hover:bg-zinc-50'
                )}
              >
                {l} ({n})
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {shown.map((i) => (
              <span
                key={i.n}
                className={cx(
                  'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium',
                  i.t === 's'
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                    : 'border-zinc-200 bg-white text-zinc-700'
                )}
              >
                <Icon n="Check" size={12} className="text-emerald-600" />
                {i.n}
                {i.t === 's' && (
                  <span className="rounded bg-emerald-500 px-1 py-px text-[9px] font-bold tracking-wide text-white">
                    SERVICE
                  </span>
                )}
              </span>
            ))}
          </div>
          {!shown.length && <p className="py-4 text-sm text-zinc-500">Nothing listed here yet.</p>}
        </Section>
        <Section
          icon="MapPin"
          title="Gym location"
        >
          <p className="mb-3 text-sm font-semibold">
            {[g?.addr || g?.address, g?.loc || g?.city].filter(Boolean).join(', ') || 'Location not set'}
          </p>
          {(g?.lat || g?.latitude) && (g?.lng || g?.longitude) ? (
            <MapView lat={g?.lat || g?.latitude} lng={g?.lng || g?.longitude} />
          ) : (
            <div className="flex h-48 items-center justify-center rounded-xl bg-zinc-50 text-xs text-zinc-400 dark:bg-zinc-800/50">
              Map coordinates not set
            </div>
          )}
        </Section>
      </div>
      <div className="lg:col-span-2">
        <Section
          icon="Image"
          title="Photo gallery"
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {photosList.map((p, idx) => {
              const photoSrc = typeof p === 'string' ? p : (p?.src || p?.url || (p?.kind === 'upload' ? p?.src : null));
              return (
                <figure
                  key={p?.id || idx}
                  className="relative aspect-[4/3] overflow-hidden rounded-lg border border-zinc-200 bg-zinc-100"
                >
                  {photoSrc ? (
                    <img src={photoSrc} alt={p?.name || 'Gym photo'} className="h-full w-full object-cover" />
                  ) : (
                    <GymScene kind={p?.scene} />
                  )}
                  <figcaption className="absolute bottom-2 left-2 rounded bg-zinc-950/85 px-2 py-0.5 text-[11px] font-medium text-white">
                    {p?.name || (p?.scene ? SCENES[p.scene] : 'Gym photo')}
                  </figcaption>
                </figure>
              );
            })}
          </div>
          {!photosList.length && (
            <p className="py-8 text-center text-sm text-zinc-500">No photos uploaded for this gym yet.</p>
          )}
        </Section>
      </div>
    </div>
  );
}
