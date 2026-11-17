import { cx } from '../../lib/utils';

export function Avatar({ name, size = 36, className = '' }) {
  const tones = [
    'bg-zinc-950 text-emerald-400',
    'bg-emerald-500 text-white',
    'bg-zinc-800 text-white',
    'bg-emerald-50 text-emerald-700 border border-emerald-200',
  ];
  const str = typeof name === 'string' && name.trim() ? name.trim() : 'User';
  const parts = str.split(/\s+/).filter(Boolean);
  const ini = (
    parts.length > 1
      ? (parts[0][0] || '') + (parts[1][0] || '')
      : (parts[0]?.slice(0, 2) || 'U')
  ).toUpperCase();
  const code = str.charCodeAt(0) || 0;
  const i = Math.abs(code + str.length) % tones.length;
  return (
    <span
      className={cx('inline-flex shrink-0 items-center justify-center rounded-full font-semibold', tones[i], className)}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.36) }}
    >
      {ini}
    </span>
  );
}
