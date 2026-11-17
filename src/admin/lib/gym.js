import { DAYS } from './utils';

export const hrsText = (h) => {
  if (!h) return 'Standard Hours (06:00 AM - 10:00 PM)';
  if (typeof h === 'string') return h;
  if (!Array.isArray(h) || !h.length) return 'Standard Hours (06:00 AM - 10:00 PM)';
  const o = h.map((x, i) => (x?.open ? i : -1)).filter((i) => i >= 0);
  if (!o.length) return 'Closed';
  const x = h[o[0]] || {};
  const d =
    o.length === 1
      ? DAYS[o[0]]
      : o[o.length - 1] - o[0] === o.length - 1
        ? DAYS[o[0]] + '-' + DAYS[o[o.length - 1]]
        : o.map((i) => DAYS[i]).join(', ');
  return d + ' · ' + (x.from || '06:00 AM') + ' to ' + (x.to || '10:00 PM');
};

export const avgRating = (rv) =>
  rv && rv.length
    ? Number((rv.reduce((a, x) => a + (Number(x?.rating) || 0), 0) / rv.length).toFixed(1))
    : 0;
