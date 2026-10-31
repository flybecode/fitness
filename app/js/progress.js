// Gewichtsverlauf, Pausen (Urlaub, Reise, Krankheit) und Abgleich mit dem Ziel.

import { state } from './store.js';
import { isoDate, daysBetween, weekStart, addDays } from './util.js';
import { currentWeight } from './nutrition.js';

export const BREAK_KINDS = { urlaub: 'Urlaub', reise: 'Reise', krank: 'Krank' };

export const inBreak = (date) => state.breaks.find((b) => b.from <= date && date <= b.to) ?? null;

// Nach einer Pause schwankt das Gewicht (Wasser, Salz) – diese Tage zählen nicht für den Trend.
const AFTER_BREAK_DAYS = 4;
export const distorted = (date) =>
  state.breaks.some((b) => b.from <= date && date <= addDays(b.to, AFTER_BREAK_DAYS));

export const sortedLog = () => [...state.bodyLog].sort((a, b) => a.date.localeCompare(b.date));

// Ein Wert pro Kalenderwoche (Mittel der Einträge), für ruhige Diagramme.
export function weeklySeries(key) {
  const byWeek = new Map();
  for (const e of sortedLog()) {
    if (e[key] == null) continue;
    const ws = weekStart(e.date);
    const w = byWeek.get(ws) ?? { sum: 0, n: 0, distorted: false };
    w.sum += e[key];
    w.n += 1;
    w.distorted ||= distorted(e.date);
    byWeek.set(ws, w);
  }
  return [...byWeek].map(([ws, w]) => ({ x: ws, y: Math.round((w.sum / w.n) * 10) / 10, distorted: w.distorted }));
}

export const checkThisWeek = () => {
  const ws = weekStart(isoDate());
  return sortedLog().filter((e) => e.date >= ws && e.weight).pop() ?? null;
};

// Gewichtstrend in kg pro Woche (lineare Regression, letzte 6 Wochen, ohne Pausenzeiten).
export function weightTrend() {
  const today = isoDate();
  const pts = sortedLog().filter((e) => e.weight && daysBetween(e.date, today) <= 42 && !distorted(e.date));
  if (pts.length < 3 || daysBetween(pts[0].date, pts[pts.length - 1].date) < 13) return null;
  const xs = pts.map((e) => daysBetween(pts[0].date, e.date));
  const ys = pts.map((e) => e.weight);
  const mx = xs.reduce((a, b) => a + b) / xs.length;
  const my = ys.reduce((a, b) => a + b) / ys.length;
  const den = xs.reduce((s, x) => s + (x - mx) ** 2, 0);
  return den ? (xs.reduce((s, x, i) => s + (x - mx) * (ys[i] - my), 0) / den) * 7 : null;
}

// Vergleicht den Trend mit dem Ziel und schlägt ggf. eine Kalorienanpassung vor.
export function trendAdvice() {
  const rate = weightTrend();
  const w = currentWeight();
  const p = state.profile;
  if (rate == null || !w || !p) return null;
  const pct = (rate / w) * 100;
  const rules = {
    abnehmen: [[pct > -0.2, -150, 'Das Gewicht sinkt kaum.'], [pct < -1.2, 150, 'Du nimmst sehr schnell ab – das kostet Muskeln.']],
    definieren: [[pct > -0.1, -100, 'Das Gewicht sinkt kaum.'], [pct < -0.8, 150, 'Du nimmst schneller ab als geplant.']],
    halten: [[pct > 0.3, -150, 'Das Gewicht steigt.'], [pct < -0.3, 150, 'Das Gewicht sinkt.']],
    aufbau: [[pct < 0.08, 150, 'Das Gewicht steigt kaum.'], [pct > 0.6, -150, 'Du nimmst schnell zu – vermutlich auch Fett.']],
  }[p.goal] ?? [];
  const hit = rules.find(([cond]) => cond);
  const recentlyAdjusted = p.lastAdjust && daysBetween(p.lastAdjust, isoDate()) < 14;
  if (!hit) return { rate, ok: true };
  return { rate, ok: false, delta: recentlyAdjusted ? 0 : hit[1], text: hit[2] };
}
