import { $, esc, num } from './util.js';
import { icon } from './icons.js';

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
  toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
}

// Fortschrittsring für Kalorien.
export function ring(value, target, size = 120) {
  const r = size / 2 - 9;
  const c = 2 * Math.PI * r;
  const pct = target ? Math.min(1, value / target) : 0;
  return `<svg class="ring" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" aria-hidden="true">
    <circle cx="${size / 2}" cy="${size / 2}" r="${r}" class="ring-bg"/>
    <circle cx="${size / 2}" cy="${size / 2}" r="${r}" class="ring-fg"
      stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - pct)}" transform="rotate(-90 ${size / 2} ${size / 2})"/>
  </svg>`;
}

export function macroBar(label, value, target, cls) {
  const pct = target ? Math.min(100, (value / target) * 100) : 0;
  return `<div class="macro">
    <div class="macro-head"><span>${label}</span><span class="muted">${num(value)} / ${num(target)} g</span></div>
    <div class="bar"><span class="${cls}" style="width:${pct}%"></span></div>
  </div>`;
}

// Liniendiagramm als SVG. points: [{ x: 'YYYY-MM-DD', y }]
export function lineChart(points, { unit = '', digits = 1 } = {}) {
  if (points.length < 2) {
    return `<div class="chart-empty muted small">Mindestens zwei Einträge nötig für den Verlauf.</div>`;
  }
  const W = 340, H = 170, L = 8, R = 44, T = 14, B = 24;
  const xs = points.map((p) => new Date(p.x).getTime());
  const ys = points.map((p) => p.y);
  const x0 = Math.min(...xs), x1 = Math.max(...xs);
  let y0 = Math.min(...ys), y1 = Math.max(...ys);
  const pad = (y1 - y0) * 0.15 || 1;
  y0 -= pad;
  y1 += pad;
  const sx = (x) => L + ((x - x0) / (x1 - x0 || 1)) * (W - L - R);
  const sy = (y) => T + (1 - (y - y0) / (y1 - y0)) * (H - T - B);
  const path = points.map((p, i) => `${i ? 'L' : 'M'}${sx(xs[i]).toFixed(1)},${sy(p.y).toFixed(1)}`).join('');
  const area = `${path}L${sx(x1).toFixed(1)},${H - B}L${sx(x0).toFixed(1)},${H - B}Z`;
  const ticks = [y1 - pad, (y0 + y1) / 2, y0 + pad];
  const last = points[points.length - 1];
  const d = (iso) => new Date(iso).toLocaleDateString('de-DE', { day: 'numeric', month: 'short' });
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Verlauf">
    ${ticks.map((t) => `<line x1="${L}" x2="${W - R}" y1="${sy(t)}" y2="${sy(t)}" class="grid"/>
      <text x="${W - R + 6}" y="${sy(t) + 4}" class="tick">${num(t, digits)}</text>`).join('')}
    <path d="${area}" class="area"/>
    <path d="${path}" class="line"/>
    <circle cx="${sx(xs[xs.length - 1])}" cy="${sy(last.y)}" r="4" class="dot"/>
    <text x="${L}" y="${H - 6}" class="tick">${d(points[0].x)}</text>
    <text x="${W - R}" y="${H - 6}" class="tick" text-anchor="end">${d(last.x)}</text>
    ${unit ? `<text x="${W - R + 6}" y="${H - 6}" class="tick">${unit}</text>` : ''}
  </svg>`;
}

export const empty = (title, text, actionsHtml = '') =>
  `<div class="card empty"><h3>${title}</h3><p class="muted">${text}</p>${actionsHtml}</div>`;
