// Utilitários de formatação e datas
export const BRL = (v) =>
  (v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export const pad = (n) => String(n).padStart(2, '0');

export const isoDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const todayISO = () => isoDate(new Date());

export const addDays = (iso, n) => {
  const d = iso ? new Date(iso + 'T12:00:00') : new Date();
  d.setDate(d.getDate() + n);
  return isoDate(d);
};

export const fmtDate = (iso, opts = { day: '2-digit', month: '2-digit', year: 'numeric' }) =>
  iso ? new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR', opts) : '—';

export const fmtLongDate = (iso) =>
  new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });

export const age = (iso) => {
  const b = new Date(iso + 'T12:00:00');
  const n = new Date();
  let a = n.getFullYear() - b.getFullYear();
  if (n.getMonth() < b.getMonth() || (n.getMonth() === b.getMonth() && n.getDate() < b.getDate())) a--;
  return a;
};

export const initials = (name = '') =>
  name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase();

export const timeToMin = (t) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};
export const minToTime = (m) => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;

let _id = Date.now();
export const uid = (p = 'id') => `${p}_${(_id++).toString(36)}`;

export const AVATAR_COLORS = [
  'linear-gradient(135deg,#2ee6c5,#0ea5e9)',
  'linear-gradient(135deg,#7c5cff,#c084fc)',
  'linear-gradient(135deg,#fb7185,#f97316)',
  'linear-gradient(135deg,#f59e0b,#ef4444)',
  'linear-gradient(135deg,#22c55e,#14b8a6)',
  'linear-gradient(135deg,#6366f1,#06b6d4)',
  'linear-gradient(135deg,#ec4899,#8b5cf6)',
];
export const colorFor = (str = '') => {
  let h = 0;
  for (const c of str) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
};
