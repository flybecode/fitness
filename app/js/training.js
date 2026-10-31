// Trainingslogik: Pläne, nächste Einheit, Progression und Auswertung.

import { state } from './store.js';
import { EXERCISES } from './data/exercises.js';
import { TEMPLATES } from './data/templates.js';
import { uid, isoDate } from './util.js';

export const allExercises = () => [...EXERCISES, ...state.customExercises];
export const getExercise = (id) =>
  allExercises().find((e) => e.id === id) ?? { id, name: 'Unbekannte Übung', muscle: 'Sonstige' };

export function parseReps(reps) {
  const [a, b] = String(reps).split(/[-–]/).map((n) => parseInt(n, 10));
  const min = Number.isFinite(a) ? a : 8;
  return { min, max: Number.isFinite(b) ? b : min };
}
export const fmtReps = (reps) => String(reps).replace('-', '–');

export const activePlan = () => state.plans.find((p) => p.id === state.activePlanId) ?? null;

export function planFromTemplate(tpl) {
  return {
    id: uid(),
    name: tpl.name,
    days: tpl.days.map((d) => ({
      id: uid(),
      name: d.name,
      exercises: d.ex.map(([exId, sets, reps, rest]) => ({ exId, sets, reps, rest })),
    })),
  };
}
export { TEMPLATES };

export function nextDay(plan) {
  if (!plan?.days.length) return null;
  const last = state.workouts.find((w) => w.planId === plan.id);
  const idx = last ? plan.days.findIndex((d) => d.id === last.dayId) : -1;
  return plan.days[(idx + 1) % plan.days.length];
}

// Letzte abgeschlossene Ausführung einer Übung (workouts sind neueste zuerst sortiert).
export function lastPerformance(exId) {
  for (const w of state.workouts) {
    const ex = w.exercises.find((e) => e.exId === exId);
    if (ex?.sets.length) return { date: w.date, sets: ex.sets };
  }
  return null;
}

// Doppelte Progression: Wenn letztes Mal alle Sätze das obere Ende des Wiederholungsbereichs
// erreicht haben, wird das Gewicht erhöht, sonst bleibt es und es werden mehr Wiederholungen angestrebt.
export function suggestion(exId, target) {
  const last = lastPerformance(exId);
  if (!last) return null;
  const ex = getExercise(exId);
  const { min, max } = parseReps(target.reps);
  const weights = last.sets.map((s) => s.w || 0);
  const top = Math.max(...weights);
  const allHit = last.sets.length >= target.sets && last.sets.every((s) => (s.r || 0) >= max);
  if (allHit && ex.inc) {
    return { w: top + ex.inc, r: min, up: true, text: `Alle Sätze geschafft – heute ${fmtKg(top + ex.inc)} probieren` };
  }
  return { w: top || null, r: null, up: false, text: allHit ? 'Alle Sätze geschafft – mehr Wiederholungen versuchen' : 'Gleiches Gewicht, Wiederholungen steigern' };
}

export const fmtKg = (w) => `${String(w).replace('.', ',')} kg`;

export function startWorkout(plan, day) {
  const exercises = (day?.exercises ?? []).map((t) => newWorkoutExercise(t.exId, t));
  state.activeWorkout = {
    id: uid(),
    planId: plan?.id ?? null,
    dayId: day?.id ?? null,
    name: day?.name ?? 'Freies Training',
    start: Date.now(),
    restUntil: null,
    exercises,
  };
}

export function newWorkoutExercise(exId, t = { sets: 3, reps: '8-12', rest: 90 }) {
  const target = { sets: t.sets, reps: t.reps, rest: t.rest };
  const sug = suggestion(exId, target);
  const last = lastPerformance(exId);
  const sets = Array.from({ length: target.sets }, (_, i) => ({
    w: sug?.w ?? null,
    r: null,
    // Platzhalter für Wiederholungen: Zielwert bzw. das, was letztes Mal geschafft wurde.
    hint: sug?.up ? sug.r : last?.sets[i]?.r ?? parseReps(target.reps).max,
    done: false,
  }));
  return { exId, target, sets, note: sug?.text ?? null };
}

export function finishWorkout() {
  const w = state.activeWorkout;
  const exercises = w.exercises
    .map((e) => ({ exId: e.exId, sets: e.sets.filter((s) => s.done).map((s) => ({ w: s.w ?? 0, r: s.r ?? 0 })) }))
    .filter((e) => e.sets.length);
  const saved = { id: w.id, planId: w.planId, dayId: w.dayId, name: w.name, date: isoDate(new Date(w.start)), start: w.start, end: Date.now(), exercises };
  state.workouts.unshift(saved);
  state.activeWorkout = null;
  return saved;
}

export const volume = (w) => w.exercises.reduce((s, e) => s + e.sets.reduce((a, x) => a + (x.w || 0) * (x.r || 0), 0), 0);
export const setCount = (w) => w.exercises.reduce((s, e) => s + e.sets.length, 0);

// Geschätztes 1-Wiederholungs-Maximum nach Epley.
export const e1rm = (w, r) => (r > 0 ? w * (1 + r / 30) : 0);

export function exerciseHistory(exId) {
  return state.workouts
    .filter((w) => w.exercises.some((e) => e.exId === exId))
    .map((w) => {
      const sets = w.exercises.find((e) => e.exId === exId).sets;
      return {
        workoutId: w.id,
        date: w.date,
        sets,
        best: Math.max(...sets.map((s) => e1rm(s.w, s.r))),
        maxW: Math.max(...sets.map((s) => s.w)),
        maxR: Math.max(...sets.map((s) => s.r)),
      };
    });
}
