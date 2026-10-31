export const $ = (sel, root = document) => root.querySelector(sel);

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ESC[c]);

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

export const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

// Datumswerte werden als lokale 'YYYY-MM-DD'-Strings gespeichert.
export function isoDate(d = new Date()) {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}
export function parseDate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}
export function addDays(iso, n) {
  const d = parseDate(iso);
  d.setDate(d.getDate() + n);
  return isoDate(d);
}
export function weekStart(iso) {
  const d = parseDate(iso);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return isoDate(d);
}
export const weekDates = (startIso) => Array.from({ length: 7 }, (_, i) => addDays(startIso, i));
export const daysBetween = (a, b) => Math.round((parseDate(b) - parseDate(a)) / 86400000);

export function weekNumber(iso) {
  const d = parseDate(iso);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const jan4 = new Date(d.getFullYear(), 0, 4);
  return 1 + Math.round(((d - jan4) / 86400000 - 3 + ((jan4.getDay() + 6) % 7)) / 7);
}

const fmt = (opts) => new Intl.DateTimeFormat('de-DE', opts);
const FMT_LONG = fmt({ weekday: 'long', day: 'numeric', month: 'long' });
const FMT_SHORT = fmt({ weekday: 'short', day: 'numeric', month: 'short' });
const FMT_DM = fmt({ day: 'numeric', month: 'short' });
const FMT_WD = fmt({ weekday: 'short' });
export const fmtLong = (iso) => FMT_LONG.format(parseDate(iso));
export const fmtShort = (iso) => FMT_SHORT.format(parseDate(iso));
export const fmtDM = (iso) => FMT_DM.format(parseDate(iso));
export const fmtWD = (iso) => FMT_WD.format(parseDate(iso)).replace('.', '');

export const fmtNum = (iso) => `${Number(iso.slice(8))}.${Number(iso.slice(5, 7))}.`;
export const weekLabel = (ws) => `KW ${weekNumber(ws)} · ${fmtNum(ws)}–${fmtNum(addDays(ws, 6))}`;

export function relDay(iso) {
  const diff = daysBetween(iso, isoDate());
  if (diff === 0) return 'Heute';
  if (diff === 1) return 'Gestern';
  if (diff === -1) return 'Morgen';
  return fmtShort(iso);
}

export const num = (n, digits = 0) =>
  Number(n).toLocaleString('de-DE', { maximumFractionDigits: digits, minimumFractionDigits: 0 });

export function parseNum(s) {
  if (s == null || s === '') return null;
  const n = parseFloat(String(s).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

export function fmtDuration(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`;
}

export const fmtRest = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
