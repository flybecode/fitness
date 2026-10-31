import { defineRoute, defineActions, update } from '../core.js';
import { state } from '../store.js';
import { esc, isoDate, num, parseNum, daysBetween, relDay } from '../util.js';
import { currentWeight, GOALS } from '../nutrition.js';
import { icon } from '../icons.js';
import { openSheet, closeSheet, sheetHead, lineChart, toast, empty } from '../ui.js';

export const METRICS = [
  { k: 'weight', label: 'Gewicht', unit: 'kg' },
  { k: 'bodyfat', label: 'Körperfett', unit: '%' },
  { k: 'waist', label: 'Taille', unit: 'cm' },
  { k: 'chest', label: 'Brust', unit: 'cm' },
  { k: 'hip', label: 'Hüfte', unit: 'cm' },
  { k: 'arm', label: 'Oberarm', unit: 'cm' },
  { k: 'thigh', label: 'Oberschenkel', unit: 'cm' },
];
let metric = 'weight';
let editDate = null;

const sorted = () => [...state.bodyLog].sort((a, b) => a.date.localeCompare(b.date));

// Gewichtstrend in kg pro Woche (lineare Regression über die letzten 4 Wochen).
export function weightTrend() {
  const today = isoDate();
  const pts = sorted().filter((e) => e.weight && daysBetween(e.date, today) <= 28);
  if (pts.length < 3 || daysBetween(pts[0].date, pts[pts.length - 1].date) < 7) return null;
  const xs = pts.map((e) => daysBetween(pts[0].date, e.date));
  const ys = pts.map((e) => e.weight);
  const mx = xs.reduce((a, b) => a + b) / xs.length;
  const my = ys.reduce((a, b) => a + b) / ys.length;
  const slope = xs.reduce((s, x, i) => s + (x - mx) * (ys[i] - my), 0) / xs.reduce((s, x) => s + (x - mx) ** 2, 0);
  return slope * 7;
}

// Vergleicht den Trend mit dem Ziel und schlägt ggf. eine Kalorienanpassung vor.
export function trendAdvice() {
  const rate = weightTrend();
  const w = currentWeight();
  const p = state.profile;
  if (rate == null || !w || !p) return null;
  if (p.lastAdjust && daysBetween(p.lastAdjust, isoDate()) < 14) return null;
  const pct = (rate / w) * 100;
  const rules = {
    abnehmen: [[pct > -0.2, -150, 'Dein Gewicht sinkt kaum.'], [pct < -1.2, 150, 'Du nimmst sehr schnell ab – das kostet Muskeln.']],
    definieren: [[pct > -0.1, -100, 'Dein Gewicht sinkt kaum.'], [pct < -0.8, 150, 'Du nimmst schneller ab als geplant.']],
    halten: [[pct > 0.3, -150, 'Dein Gewicht steigt.'], [pct < -0.3, 150, 'Dein Gewicht sinkt.']],
    aufbau: [[pct < 0.08, 150, 'Dein Gewicht steigt kaum – für Muskelaufbau brauchst du einen kleinen Überschuss.'], [pct > 0.6, -150, 'Du nimmst schnell zu – vermutlich auch Fett.']],
  }[p.goal] ?? [];
  const hit = rules.find(([cond]) => cond);
  return hit ? { rate, delta: hit[1], text: hit[2] } : { rate, ok: true };
}

export const fmtRate = (r) => `${r > 0 ? '+' : r < 0 ? '−' : '±'}${num(Math.abs(r), 2)} kg/Woche`;

defineRoute(/^#\/koerper$/, () => {
  const list = sorted();
  const m = METRICS.find((x) => x.k === metric);
  const points = list.filter((e) => e[metric] != null).map((e) => ({ x: e.date, y: e[metric] }));
  const latest = points[points.length - 1];
  const ref = points.find((pt) => daysBetween(pt.x, latest?.x ?? isoDate()) <= 30);
  const advice = trendAdvice();
  const goal = GOALS[state.profile.goal];
  return `
  <header class="top">
    <div><p class="eyebrow">Gewicht & Maße</p><h1>Körper</h1></div>
    <button class="icon-btn accent" data-act="bodyEntry" aria-label="Eintrag hinzufügen">${icon('plus')}</button>
  </header>
  <div class="chips">${METRICS.map((x) => `<button class="chip ${x.k === metric ? 'on' : ''}" data-act="metric" data-k="${x.k}">${x.label}</button>`).join('')}</div>
  <div class="card">
    ${latest ? `<div class="row between">
        <div><p class="eyebrow">${m.label} · ${relDay(latest.x)}</p><p class="big">${num(latest.y, 1)} <small>${m.unit}</small></p></div>
        ${ref && ref !== latest ? `<div class="right"><p class="eyebrow">30 Tage</p><p class="delta">${latest.y - ref.y > 0 ? '+' : ''}${num(latest.y - ref.y, 1)} ${m.unit}</p></div>` : ''}
      </div>
      ${lineChart(points, { unit: m.unit })}`
    : `<p class="muted">Noch keine Werte für ${m.label}.</p>`}
  </div>
  ${metric === 'weight' && advice ? `<div class="card ${advice.ok ? '' : 'attention'}">
      <p class="eyebrow">Trend · Ziel: ${esc(goal.label)}</p>
      <p><b>${fmtRate(advice.rate)}</b> ${advice.ok ? '– passt zu deinem Ziel. Weiter so!' : `– ${advice.text}`}</p>
      ${advice.ok ? '' : `<button class="btn primary small mt" data-act="applyAdjust" data-d="${advice.delta}">Tagesziel um ${advice.delta > 0 ? '+' : '−'}${Math.abs(advice.delta)} kcal anpassen</button>`}
    </div>` : ''}
  ${metric === 'weight' && !advice ? '<p class="muted small">Wiege dich 2–3× pro Woche morgens nüchtern. Nach etwa einer Woche siehst du hier deinen Trend und ob dein Kalorienziel passt.</p>' : ''}
  <h2 class="section">Einträge</h2>
  ${list.length ? `<div class="card list">${[...list].reverse().map((e) => `
    <button class="li linkish" data-act="bodyEntry" data-date="${e.date}">
      <span class="li-main"><span class="eyebrow">${relDay(e.date)}</span>
      <span class="small">${METRICS.filter((x) => e[x.k] != null).map((x) => `${x.label} <b>${num(e[x.k], 1)}</b> ${x.unit}`).join(' · ')}</span></span>
      ${icon('right', 'muted')}
    </button>`).join('')}</div>`
  : empty('Noch keine Einträge', 'Trage dein Gewicht und optional Maße ein.', '<button class="btn primary" data-act="bodyEntry">Eintrag hinzufügen</button>')}`;
}, 'koerper');

function entrySheet() {
  const e = state.bodyLog.find((x) => x.date === editDate) ?? { date: editDate };
  const exists = state.bodyLog.some((x) => x.date === editDate);
  return `${sheetHead(exists ? 'Eintrag bearbeiten' : 'Neuer Eintrag')}
    <form data-submit="saveBody" class="stack">
      <label class="field"><span>Datum</span><input type="date" name="date" value="${e.date}" max="${isoDate()}" required></label>
      <div class="grid2">${METRICS.map((x) => `
        <label class="field"><span>${x.label} (${x.unit})</span>
        <input name="${x.k}" inputmode="decimal" value="${e[x.k] != null ? num(e[x.k], 1) : ''}" placeholder="optional"></label>`).join('')}</div>
      <button class="btn primary block" type="submit">Speichern</button>
      ${exists ? `<button class="btn block danger ghost" data-act="deleteBody" data-date="${e.date}">Eintrag löschen</button>` : ''}
    </form>`;
}

export function openBodyEntry(date = isoDate()) {
  editDate = date;
  openSheet(entrySheet);
}

defineActions({
  metric(el) {
    metric = el.dataset.k;
    update();
  },
  bodyEntry(el) {
    openBodyEntry(el.dataset.date || isoDate());
  },
  saveBody(form) {
    const fd = new FormData(form);
    const date = fd.get('date');
    const entry = { date };
    for (const x of METRICS) {
      const v = parseNum(fd.get(x.k));
      if (v != null) entry[x.k] = v;
    }
    if (Object.keys(entry).length === 1) return toast('Bitte mindestens einen Wert eintragen');
    // Ein Eintrag pro Tag; beim Datumswechsel wird der alte Eintrag ersetzt.
    state.bodyLog = state.bodyLog.filter((e) => e.date !== date && e.date !== editDate);
    state.bodyLog.push(entry);
    closeSheet();
    update();
    toast('Gespeichert');
  },
  deleteBody(el) {
    if (!confirm('Eintrag löschen?')) return;
    state.bodyLog = state.bodyLog.filter((e) => e.date !== el.dataset.date);
    closeSheet();
    update();
  },
  applyAdjust(el) {
    state.profile.kcalAdjust = (state.profile.kcalAdjust || 0) + Number(el.dataset.d);
    state.profile.lastAdjust = isoDate();
    update();
    toast('Tagesziel angepasst – plane die nächste Woche neu, damit es greift');
  },
});

export const lastWeighIn = () => sorted().filter((e) => e.weight).pop() ?? null;
