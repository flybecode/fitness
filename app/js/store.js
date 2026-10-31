// Alle Daten liegen lokal im Browser (localStorage, Fotos in IndexedDB) und lassen sich als JSON exportieren.
// Das Format ist bewusst schlicht gehalten, damit eine spätere native App es importieren kann.

const KEY = 'fitness-app-v1';
export const VERSION = 2;

const defaults = () => ({
  version: VERSION,
  profile: null, // { sex, birthYear, height, activity, goal, mealsPerDay, kcalAdjust, lastAdjust }
  prefs: { diet: 'alles', apiKey: '', rest: 120 },

  // Ernährung
  customFoods: [], // [{ id, name, kcal, p, c, f, src: 'off' | 'ai' | 'manuell' }]
  recipes: [], // eigene Rezepte: [{ id, name, cat, servings, min, prep, items: [[foodId, gramm]], steps: [] }]
  week: {}, // { wochenstart: [{ r: rezeptId, n: portionen }] }
  shopChecked: {}, // { wochenstart: [foodId] }
  shopExtra: {}, // { wochenstart: [{ id, text }] }
  dayLog: {}, // Tagesrechner: { datum: [{ id, kind: 'food' | 'recipe', ref, amount }] }

  // Training
  customExercises: [], // [{ id, name, m: [muskel], s: [], inc }]
  units: [], // [{ id, name, items: [{ id, exId, sets, reps, ss }] }]  ss = Superset mit der nächsten Übung
  schedule: {}, // fester Rhythmus: { 0..6 (Mo..So): unitId }
  scheduleSince: null, // ab diesem Datum zählt der Rhythmus für Quote und Kalender
  weekPlan: {}, // Abweichungen einzelner Wochen: { wochenstart: { 0..6: unitId | null } }
  workouts: [], // abgeschlossen, neueste zuerst: [{ id, unitId, name, date, start, end, ex: [{ exId, sets: [{ w, r, p }] }] }]
  live: null, // laufendes Training

  // Progress
  bodyLog: [], // [{ date, weight, bodyfat }]
  breaks: [], // Urlaub, Reise, Krankheit: [{ id, from, to, kind, note }]
  photos: [], // [{ id, date, thumb }] – Originale in IndexedDB
});

function migrate(data) {
  if (!data.version || data.version < 2) {
    const units = (data.plans ?? []).flatMap((plan) =>
      plan.days.map((d) => ({
        id: d.id,
        name: d.name,
        items: d.exercises.map((e, i) => ({ id: `${d.id}-${i}`, exId: e.exId, sets: e.sets, reps: e.reps, ss: false })),
      })),
    );
    return {
      profile: data.profile ? { mealsPerDay: data.prefs?.mealsPerDay ?? 4, ...data.profile } : null,
      prefs: { diet: data.prefs?.diet ?? 'alles' },
      customExercises: (data.customExercises ?? []).map((e) => ({ id: e.id, name: e.name, m: ['Bauch'], s: [], inc: 2.5 })),
      units,
      workouts: (data.workouts ?? []).map((w) => ({
        id: w.id, unitId: w.dayId, name: w.name, date: w.date, start: w.start, end: w.end,
        ex: w.exercises.map((e) => ({ exId: e.exId, sets: e.sets.map((s) => ({ w: s.w, r: s.r, p: 0 })) })),
      })),
      bodyLog: (data.bodyLog ?? []).map(({ date, weight, bodyfat }) => ({ date, weight, bodyfat })),
    };
  }
  return data;
}

function withDefaults(data) {
  const d = defaults();
  const m = migrate(data);
  return { ...d, ...m, version: VERSION, prefs: { ...d.prefs, ...m.prefs } };
}

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return withDefaults(JSON.parse(raw));
  } catch (e) {
    console.error('Daten konnten nicht geladen werden', e);
  }
  return defaults();
}

export let state = load();

export function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Daten konnten nicht gespeichert werden', e);
  }
}

export function replaceState(data) {
  const apiKey = state.prefs.apiKey;
  state = withDefaults(data);
  state.prefs.apiKey ||= apiKey;
  save();
}

export function resetState() {
  state = defaults();
  save();
}

// Export ohne API-Schlüssel – der bleibt auf dem Gerät.
export function exportData() {
  return { ...state, prefs: { ...state.prefs, apiKey: '' } };
}

// Bittet den Browser, die Daten nicht automatisch zu löschen (wichtig in Safari).
navigator.storage?.persist?.().catch(() => {});
