import { $, esc, num } from './util.js';
import { icon } from './icons.js';
import { state } from './store.js';

// Bottom-Sheet: der Inhalt wird von einer Funktion erzeugt, damit er nach Änderungen neu gerendert werden kann.
let sheetFn = null;

export function openSheet(fn) {
  sheetFn = fn;
  const root = $('#sheet');
  root.innerHTML = `<div class="sheet-backdrop" data-act="closeSheet"></div><div class="sheet-panel" role="dialog">${fn()}</div>`;
  root.classList.add('open');
  document.body.classList.add('noscroll');
}

export function refreshSheet() {
  const panel = $('#sheet .sheet-panel');
  if (!sheetFn || !panel) return;
  const top = panel.scrollTop;
  panel.innerHTML = sheetFn();
  panel.scrollTop = top;
}

export function closeSheet() {
  sheetFn = null;
  const root = $('#sheet');
  root.classList.remove('open');
  root.innerHTML = '';
  document.body.classList.remove('noscroll');
}

export const sheetHead = (title, sub = '') => `
  <div class="sheet-head">
    <div><h2>${esc(title)}</h2>${sub ? `<p class="muted small">${sub}</p>` : ''}</div>
    <button class="icon-btn" data-act="closeSheet" aria-label="Schließen">${icon('x')}</button>
  </div>`;

let toastTimer;
export function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2400);
}

// Kopfzeile einer Seite. back: Ziel-Hash für den Zurück-Pfeil.
export const pageHead = (title, { back, right = '', sub = '' } = {}) => `
  <header class="head ${back ? 'sub' : ''}">
    ${back ? `<a class="icon-btn" href="${back}" aria-label="Zurück">${icon('left')}</a>` : ''}
    <div class="head-title">${sub ? `<p class="label">${sub}</p>` : ''}<h1>${esc(title)}</h1></div>
    ${right || (back ? '<span class="icon-btn ghost"></span>' : '')}
  </header>`;

export const label = (text, right = '') => `<div class="label-row"><p class="label">${text}</p>${right}</div>`;

// overWarn: Überschreiten des Ziels rot markieren (bei Kalorien ja, bei Trainingsvolumen nein).
// tone: Farbe des Balkens (p = Protein, c = Kohlenhydrate, f = Fett, k = Kalorien).
export function bar(value, target, { accent = false, overWarn = true, tone = '' } = {}) {
  const pct = target ? Math.min(100, (value / target) * 100) : 0;
  const over = overWarn && target && value > target * 1.08;
  return `<div class="bar ${tone} ${accent ? 'accent' : ''} ${over ? 'over' : ''}"><span style="width:${pct}%"></span></div>`;
}

export function macroRow(name, value, target, unit = 'g', tone = '') {
  return `<div class="macro">
    <div class="macro-head"><span>${name}</span><span class="mono">${num(value)}<span class="muted"> / ${num(target)} ${unit}</span></span></div>
    ${bar(value, target, { tone })}
  </div>`;
}

// Fortschrittsring mit Inhalt in der Mitte. pct: 0..1
export function ring(pct, inner, { size = 96, stroke = 10, color = 'var(--red)' } = {}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(1, pct || 0));
  return `<div class="ring-wrap" style="width:${size}px;height:${size}px">
    <svg class="ring" viewBox="0 0 ${size} ${size}" aria-hidden="true">
      <circle cx="${size / 2}" cy="${size / 2}" r="${r}" class="ring-bg" stroke-width="${stroke}"/>
      <circle cx="${size / 2}" cy="${size / 2}" r="${r}" class="ring-fg" stroke="${color}" stroke-width="${stroke}"
        stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - p)}" transform="rotate(-90 ${size / 2} ${size / 2})"/>
    </svg>
    <div class="ring-label">${inner}</div>
  </div>`;
}

const MUSCLE_TONE = { Brust: 'red', Rücken: 'blue', Schultern: 'orange', Bizeps: 'yellow', Trizeps: 'yellow', Quadrizeps: 'green', Beinbeuger: 'green', Po: 'green', Waden: 'green', Bauch: 'purple' };
const EQ_ICON = { free: 'barbell', machine: 'adjustments-horizontal', bw: 'gymnastics' };

// Bild für eine Übung: Geräte-Icon in der Farbe der Hauptmuskelgruppe.
export const exerciseBadge = (ex) => badge(EQ_ICON[ex.eq] ?? 'barbell', MUSCLE_TONE[ex.m?.[0]] ?? 'blue');

// Farbiges Icon-Kästchen für Kacheln. tone: red | orange | yellow | green | blue | purple
export const badge = (name, tone = 'red') => `<span class="badge-ic bi-${tone}">${icon(name)}</span>`;

// Aufteilung der Kalorien auf Protein / Kohlenhydrate / Fett als farbiger Streifen.
export function macroSplit(p, c, f) {
  const kp = p * 4, kc = c * 4, kf = f * 9;
  const sum = kp + kc + kf || 1;
  return `<div class="split" aria-hidden="true"><span style="flex:${kp / sum}"></span><span style="flex:${kc / sum}"></span><span style="flex:${kf / sum}"></span></div>`;
}

const fmtD = (iso) => new Date(iso).toLocaleDateString('de-DE', { day: 'numeric', month: 'short' });

// Liniendiagramm. points: [{ x: 'YYYY-MM-DD', y, distorted? }], bands: [{ from, to }] werden schraffiert.
export function lineChart(points, { unit = '', digits = 1, bands = [], target = null } = {}) {
  if (points.length < 2) return `<p class="chart-empty muted small">Ab zwei Einträgen erscheint hier der Verlauf.</p>`;
  const W = 340, H = 160, L = 4, R = 40, T = 10, B = 22;
  const t = (iso) => new Date(iso).getTime();
  const xs = points.map((p) => t(p.x));
  const x0 = Math.min(...xs), x1 = Math.max(...xs);
  const ys = points.map((p) => p.y).concat(target != null ? [target] : []);
  let y0 = Math.min(...ys), y1 = Math.max(...ys);
  const pad = (y1 - y0) * 0.15 || 1;
  y0 -= pad;
  y1 += pad;
  const sx = (x) => L + ((x - x0) / (x1 - x0 || 1)) * (W - L - R);
  const sy = (y) => T + (1 - (y - y0) / (y1 - y0)) * (H - T - B);
  const path = points.map((p, i) => `${i ? 'L' : 'M'}${sx(xs[i]).toFixed(1)},${sy(p.y).toFixed(1)}`).join('');
  const ticks = [y1 - pad, (y0 + y1) / 2, y0 + pad];
  const bandRects = bands
    .map((b) => [Math.max(x0, t(b.from)), Math.min(x1, t(b.to))])
    .filter(([a, b]) => b >= a)
    .map(([a, b]) => `<rect x="${sx(a)}" y="${T}" width="${Math.max(3, sx(b) - sx(a))}" height="${H - T - B}" class="band"/>`)
    .join('');
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Verlauf">
    <defs><pattern id="hatch" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="5" class="hatch"/></pattern></defs>
    ${bandRects}
    ${ticks.map((v) => `<line x1="${L}" x2="${W - R}" y1="${sy(v)}" y2="${sy(v)}" class="grid"/>
      <text x="${W - R + 6}" y="${sy(v) + 3.5}" class="tick">${num(v, digits)}</text>`).join('')}
    ${target != null ? `<line x1="${L}" x2="${W - R}" y1="${sy(target)}" y2="${sy(target)}" class="target"/>` : ''}
    <path d="${path}" class="line"/>
    ${points.map((p, i) => `<circle cx="${sx(xs[i])}" cy="${sy(p.y)}" r="${i === points.length - 1 || p.distorted ? 3.5 : 2.2}" class="${p.distorted ? 'dot hollow' : i === points.length - 1 ? 'dot last' : 'dot'}"/>`).join('')}
    <text x="${L}" y="${H - 6}" class="tick">${fmtD(points[0].x)}</text>
    <text x="${W - R}" y="${H - 6}" class="tick" text-anchor="end">${fmtD(points[points.length - 1].x)}</text>
    ${unit ? `<text x="${W - R + 6}" y="${H - 6}" class="tick">${unit}</text>` : ''}
  </svg>`;
}

export function sparkline(values, { w = 80, h = 24 } = {}) {
  if (values.length < 2) return `<svg class="spark" viewBox="0 0 ${w} ${h}"><line x1="0" x2="${w}" y1="${h / 2}" y2="${h / 2}" class="spark-flat"/></svg>`;
  const lo = Math.min(...values), hi = Math.max(...values);
  const sy = (v) => h - 2 - ((v - lo) / (hi - lo || 1)) * (h - 4);
  const sx = (i) => (i / (values.length - 1)) * (w - 4) + 2;
  const d = values.map((v, i) => `${i ? 'L' : 'M'}${sx(i).toFixed(1)},${sy(v).toFixed(1)}`).join('');
  return `<svg class="spark" viewBox="0 0 ${w} ${h}" aria-hidden="true"><path d="${d}"/><circle cx="${sx(values.length - 1)}" cy="${sy(values[values.length - 1])}" r="2"/></svg>`;
}

// Säulen pro Woche. rows: [{ label, value, target?, muted? }]
export function weekBars(rows, { max } = {}) {
  const top = max ?? Math.max(1, ...rows.map((r) => Math.max(r.value, r.target || 0)));
  return `<div class="wbars">${rows.map((r) => `
    <div class="wbar ${r.muted ? 'muted-bar' : ''}" title="${esc(r.label)}">
      <div class="wbar-col">
        ${r.target ? `<span class="wbar-target" style="bottom:${(r.target / top) * 100}%"></span>` : ''}
        <span class="wbar-fill ${r.target && r.value >= r.target ? 'hit' : ''}" style="height:${(r.value / top) * 100}%"></span>
      </div>
      <span class="wbar-label">${r.label}</span>
    </div>`).join('')}</div>`;
}

export const stepper = (value, { dec, inc, valueHtml, size = '' } = {}) => `
  <div class="stepper ${size}">
    <button class="step" data-act="${dec.act}" ${dec.attrs || ''} aria-label="Weniger">${icon('minus')}</button>
    <div class="step-value">${valueHtml ?? value}</div>
    <button class="step" data-act="${inc.act}" ${inc.attrs || ''} aria-label="Mehr">${icon('plus')}</button>
  </div>`;

// Einklappbare Kachel. Der Zustand (auf/zu) wird pro key gemerkt.
export function collapsible(key, head, body, { open = true, cls = '' } = {}) {
  const isOpen = state.prefs.collapsed?.[key] ?? open;
  return `<section class="panel coll ${isOpen ? 'open' : ''} ${cls}">
    <button class="coll-head" data-act="toggleColl" data-k="${key}" aria-expanded="${isOpen}">${head}${icon('chevron', 'coll-ic')}</button>
    <div class="coll-body">${body}</div>
  </section>`;
}

export const empty = (title, text, actionsHtml = '') =>
  `<div class="panel empty"><p class="empty-title">${title}</p><p class="muted small">${text}</p>${actionsHtml}</div>`;
