// Trainingslogik: Wochenrhythmus, laufendes Training, Progression, Muskelbalance und Hinweise.

import { state } from './store.js';
import { EXERCISES, MUSCLES } from './data/exercises.js';
import { uid, isoDate, weekStart, weekDates, addDays, daysBetween, num } from './util.js';
import { inBreak } from './progress.js';

export const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
export { MUSCLES };

export const allExercises = () => [...EXERCISES, ...state.customExercises];
export const getExercise = (id) => {
  const ex = allExercises().find((e) => e.id === id) ?? { id, name: 'Unbekannte Übung', m: [], s: [], inc: 2.5 };
  return { eq: ex.bw ? 'bw' : 'free', ...ex };
};
export const unit = (id) => state.units.find((u) => u.id === id) ?? null;

export function parseReps(reps) {
  const [a, b] = String(reps || '8-12').split(/[-–]/).map((n) => parseInt(n, 10));
  const min = Number.isFinite(a) ? a : 8;
  return { min, max: Number.isFinite(b) ? b : min };
}
export const fmtReps = (reps) => String(reps || '8-12').replace('-', '–');
export const fmtKg = (w) => `${num(w, 2)} kg`;

// --- Wochenrhythmus -------------------------------------------------------------

export const dayIndex = (iso) => weekDates(weekStart(iso)).indexOf(iso);

export function weekPlan(ws) {
  return state.weekPlan[ws] ?? { ...state.schedule };
}

function editableWeek(ws) {
  state.weekPlan[ws] ??= { ...state.schedule };
  return state.weekPlan[ws];
}

export function moveDay(ws, from, to) {
  const plan = editableWeek(ws);
  [plan[from], plan[to]] = [plan[to] ?? null, plan[from] ?? null];
}
export function setDay(ws, i, unitId) {
  editableWeek(ws)[i] = unitId;
}
export const resetWeek = (ws) => delete state.weekPlan[ws];

export function weekDays(ws) {
  const plan = weekPlan(ws);
  const custom = !!state.weekPlan[ws];
  const today = isoDate();
  // Der feste Rhythmus gilt erst ab dem Tag, an dem er festgelegt wurde – nicht rückwirkend.
  const since = state.scheduleSince ?? today;
  return weekDates(ws).map((date, i) => {
    const planned = custom || date >= since ? unit(plan[i]) : null;
    const done = state.workouts.filter((w) => w.date === date);
    const brk = inBreak(date);
    let status = 'rest';
    if (done.length) status = 'done';
    else if (brk) status = 'break';
    else if (planned) status = date < today ? 'missed' : 'planned';
    return { i, date, planned, done, brk, status, today: date === today };
  });
}

export const todayInfo = () => weekDays(weekStart(isoDate())).find((d) => d.today);

// --- Einheiten & Supersets -------------------------------------------------------

// Fasst Übungen zu Blöcken zusammen: Eine Übung mit ss=true bildet mit der nächsten ein Superset.
export function blocksOf(items) {
  const blocks = [];
  let cur = [];
  items.forEach((it, i) => {
    cur.push(it);
    if (!it.ss || i === items.length - 1) {
      blocks.push(cur);
      cur = [];
    }
  });
  return blocks;
}

// --- Progression ---------------------------------------------------------------

export function lastPerformance(exId) {
  for (const w of state.workouts) {
    const ex = w.ex.find((e) => e.exId === exId);
    if (ex?.sets.length) return { date: w.date, sets: ex.sets };
  }
  return null;
}

// Doppelte Progression: oberes Ende des Wiederholungsbereichs in allen Sätzen → mehr Gewicht,
// unteres Ende verfehlt → leichter, sonst Gewicht halten und Wiederholungen steigern.
export function tip(exId, reps, sets) {
  const ex = getExercise(exId);
  const { min, max } = parseReps(reps);
  const last = lastPerformance(exId);
  const reps = ex.timed ? 'Sekunden' : 'Wiederholungen';
  if (!last) {
    if (ex.eq === 'bw') return { dir: 'new', w: null, text: ex.timed ? `Erstes Mal: Halte ${min}–${max} Sekunden.` : `Erstes Mal: ${min}–${max} saubere Wiederholungen schaffen.` };
    return { dir: 'new', w: null, text: `Erstes Mal: Wähle ein Gewicht, mit dem du ${max} saubere Wiederholungen schaffst.` };
  }
  const top = Math.max(...last.sets.map((s) => s.w || 0));
  const work = last.sets.filter((s) => (s.w || 0) === top);
  const inc = ex.inc || 0;
  // Körpergewicht ohne Zusatzgewicht: Fortschritt über Wiederholungen.
  if (ex.eq === 'bw' && !top) {
    const allHit = work.length >= sets && work.every((s) => s.r >= max);
    return allHit
      ? { dir: 'up', w: null, text: ex.timed ? `Letztes Mal alle Sätze ${max}+ Sekunden → heute länger halten.` : `Letztes Mal alle Sätze mit ${max}+ Wdh. → mehr Wiederholungen oder etwas Zusatzgewicht.` }
      : { dir: 'hold', w: null, text: `${reps} steigern (Ziel ${min}–${max}).` };
  }
  if (inc && work.length >= sets && work.every((s) => s.r >= max)) {
    return { dir: 'up', w: top + inc, text: `Letztes Mal alle Sätze mit ${max}+ Wdh. → heute ${fmtKg(top + inc)} probieren.` };
  }
  if (inc && top > inc && work[0] && work[0].r < min) {
    return { dir: 'down', w: top - inc, text: `Letztes Mal unter ${min} Wdh. → heute etwas leichter.` };
  }
  return { dir: 'hold', w: top || null, text: `Gewicht halten und mehr Wiederholungen schaffen (Ziel ${min}–${max}).` };
}

// --- Laufendes Training -----------------------------------------------------------

export function startLive(u) {
  const items = u?.items ?? [];
  state.live = {
    id: uid(),
    unitId: u?.id ?? null,
    name: u?.name ?? 'Freies Training',
    start: Date.now(),
    restUntil: null,
    blocks: blocksOf(items).map((b) => newBlock(b)),
  };
}

export function newBlock(items) {
  return {
    items: items.map((it) => {
      const t = tip(it.exId, it.reps, it.sets);
      return { exId: it.exId, sets: it.sets, reps: it.reps || '8-12', w: t.w, tip: t, log: [] };
    }),
    phase: 'weight', // weight → set → reps → … → done
    round: 0,
    pos: 0,
  };
}

export const blockRounds = (b) => Math.max(...b.items.map((i) => i.sets));
export const blockSetsDone = (b) => b.items.reduce((s, i) => s + i.log.length, 0);
export const blockSetsTotal = (b) => b.items.reduce((s, i) => s + i.sets, 0);

// Nächste Übung im Block, die in dieser Runde noch einen Satz offen hat.
export function advance(b) {
  for (let guard = 0; guard < 50; guard++) {
    b.pos += 1;
    if (b.pos >= b.items.length) {
      b.pos = 0;
      b.round += 1;
    }
    if (b.round >= blockRounds(b)) {
      b.phase = 'done';
      return { restAfter: false };
    }
    if (b.items[b.pos].sets > b.round) {
      b.phase = 'set';
      return { restAfter: b.pos === 0 };
    }
  }
  b.phase = 'done';
  return { restAfter: false };
}

export function finishLive() {
  const l = state.live;
  const ex = l.blocks
    .flatMap((b) => b.items)
    .filter((i) => i.log.length)
    .map((i) => ({ exId: i.exId, sets: i.log.map((s) => ({ w: s.w, r: s.r, p: s.p })) }));
  const saved = { id: l.id, unitId: l.unitId, name: l.name, date: isoDate(new Date(l.start)), start: l.start, end: Date.now(), ex };
  state.workouts.unshift(saved);
  state.live = null;
  return saved;
}

// --- Auswertung --------------------------------------------------------------------

export const e1rm = (w, r) => (w > 0 && r > 0 ? w * (1 + r / 30) : 0);
export const volume = (w) => w.ex.reduce((s, e) => s + e.sets.reduce((a, x) => a + (x.w || 0) * (x.r || 0), 0), 0);
export const setCount = (w) => w.ex.reduce((s, e) => s + e.sets.length, 0);

export function exerciseHistory(exId) {
  return state.workouts
    .filter((w) => w.ex.some((e) => e.exId === exId))
    .map((w) => {
      const sets = w.ex.find((e) => e.exId === exId).sets;
      const best = Math.max(...sets.map((s) => e1rm(s.w, s.r)));
      return { workoutId: w.id, date: w.date, sets, best, maxW: Math.max(...sets.map((s) => s.w || 0)), maxR: Math.max(...sets.map((s) => s.r || 0)) };
    });
}

// Leistungswert einer Einheit: geschätztes Maximum, bei Körpergewichtsübungen die Wiederholungen.
export const score = (h) => (h.best > 0 ? h.best : h.maxR);

export function trainedExercises() {
  const ids = [...new Set(state.workouts.flatMap((w) => w.ex.map((e) => e.exId)))];
  return ids.map((id) => {
    const h = exerciseHistory(id);
    const series = [...h].reverse().map((x) => ({ x: x.date, y: Math.round(score(x) * 10) / 10 }));
    const first = series[0]?.y || 0;
    const last = series[series.length - 1]?.y || 0;
    return { id, ex: getExercise(id), sessions: h.length, series, change: first ? (last - first) / first : 0, lastDate: h[0]?.date };
  }).sort((a, b) => b.lastDate.localeCompare(a.lastDate));
}

// Geplante Sätze pro Woche je Muskelgruppe → Score in Prozent.
export function muscleBalance() {
  const plan = state.schedule;
  const sets = Object.fromEntries(MUSCLES.map((m) => [m.id, 0]));
  for (const id of Object.values(plan)) {
    const u = unit(id);
    if (!u) continue;
    for (const it of u.items) {
      const ex = getExercise(it.exId);
      ex.m.forEach((m) => { if (m in sets) sets[m] += it.sets; });
      ex.s.forEach((m) => { if (m in sets) sets[m] += it.sets / 2; });
    }
  }
  const style = state.prefs.style === 'low' ? 'low' : 'high';
  const rows = MUSCLES.map((m) => ({ id: m.id, sets: sets[m.id], target: m[style], pct: Math.min(1, sets[m.id] / m[style]) }));
  const hasPlan = Object.values(plan).some((id) => unit(id));
  return { rows, score: hasPlan ? Math.round((rows.reduce((s, r) => s + r.pct, 0) / rows.length) * 100) : null };
}

// Trainingsquote: geplante vs. erledigte Tage, Pausen ausgenommen.
export function adherence(weeks = 4) {
  const today = isoDate();
  let planned = 0;
  let done = 0;
  for (let k = 0; k < weeks; k++) {
    const ws = addDays(weekStart(today), -7 * k);
    const days = weekDays(ws).filter((d) => d.date < today && !d.brk);
    planned += days.filter((d) => d.planned).length;
    done += days.filter((d) => d.done.length).length;
  }
  return { planned, done: Math.min(done, planned), extra: Math.max(0, done - planned), pct: planned ? Math.min(1, done / planned) : null };
}

export function weeklyCounts(weeks = 12) {
  const today = isoDate();
  return Array.from({ length: weeks }, (_, k) => {
    const ws = addDays(weekStart(today), -7 * (weeks - 1 - k));
    const dates = weekDates(ws);
    return {
      ws,
      count: state.workouts.filter((w) => dates.includes(w.date)).length,
      planned: weekDays(ws).filter((d) => d.planned).length,
      brk: dates.some((d) => inBreak(d)),
    };
  });
}

// Auffälligkeiten: Bestwerte, Stagnation, Leistungseinbruch, Lücken im Plan und in der Umsetzung.
export function insights() {
  const out = [];
  const today = isoDate();

  for (const t of trainedExercises()) {
    const h = exerciseHistory(t.id);
    if (!h.length) continue;
    const [last, ...prev] = h;
    const prevBest = Math.max(0, ...prev.map(score));
    if (prev.length && score(last) > prevBest && daysBetween(last.date, today) <= 10) {
      out.push({ level: 'good', text: `Neuer Bestwert: ${t.ex.name} (${last.maxW ? `${fmtKg(last.maxW)} × ${last.sets.find((s) => s.w === last.maxW)?.r}` : `${last.maxR} Wdh.`}).` });
    }
    if (h.length >= 4) {
      const recent = Math.max(...h.slice(0, 3).map(score));
      const before = Math.max(...h.slice(3).map(score));
      if (recent <= before) out.push({ level: 'warn', text: `${t.ex.name} stagniert seit 3 Einheiten. Probier einen anderen Wiederholungsbereich, eine Variante oder eine leichtere Woche.` });
    }
    if (prev.length >= 2 && !inBreak(last.date) && score(last) < prevBest * 0.9) {
      out.push({ level: 'warn', text: `${t.ex.name}: ${Math.round((1 - score(last) / prevBest) * 100)} % unter deinem Bestwert. Schlaf, Essen und Erholung prüfen.` });
    }
  }

  const a = adherence(4);
  if (a.planned >= 4 && a.pct < 0.7) {
    out.push({ level: 'warn', text: `Nur ${a.done} von ${a.planned} geplanten Trainings in den letzten 4 Wochen.` });
  }

  const bal = muscleBalance();
  if (bal.score != null) {
    const gaps = bal.rows.filter((r) => r.sets === 0).map((r) => r.id);
    if (gaps.length) out.push({ level: 'warn', text: `Im Plan nicht trainiert: ${gaps.join(', ')}.` });
    const low = bal.rows.filter((r) => r.sets > 0 && r.pct < 0.5).map((r) => r.id);
    if (low.length) out.push({ level: 'info', text: `Wenig Volumen: ${low.join(', ')} (unter der Hälfte des Wochenziels).` });

    // Muskelgruppen, die geplant sind, aber seit 14 Tagen nicht trainiert wurden.
    const recent = state.workouts.filter((w) => daysBetween(w.date, today) <= 14);
    if (state.workouts.length >= 3 && !inBreak(today)) {
      const hit = new Set(recent.flatMap((w) => w.ex.flatMap((e) => getExercise(e.exId).m)));
      const missing = bal.rows.filter((r) => r.sets > 0 && !hit.has(r.id)).map((r) => r.id);
      if (missing.length) out.push({ level: 'info', text: `Seit 14 Tagen nicht trainiert: ${missing.join(', ')}.` });
    }
  }
  const order = { warn: 0, info: 1, good: 2 };
  return out.sort((x, y) => order[x.level] - order[y.level]);
}
