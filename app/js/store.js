// Alle Daten liegen lokal im Browser (localStorage) und lassen sich als JSON exportieren.
// Das Format ist bewusst schlicht gehalten, damit eine spätere native App es importieren kann.

const KEY = 'fitness-app-v1';

const defaults = () => ({
  version: 1,
  profile: null, // { sex, birthYear, height, activity, goal, kcalAdjust }
  prefs: { diet: 'alles', mealsPerDay: 4, disliked: [] },
  bodyLog: [], // [{ date, weight, bodyfat, waist, chest, arm, hip, thigh }]
  plans: [], // [{ id, name, days: [{ id, name, exercises: [{ exId, sets, reps, rest }] }] }]
  activePlanId: null,
  customExercises: [], // [{ id, name, muscle }]
  workouts: [], // abgeschlossene Einheiten
  activeWorkout: null,
  mealPlan: {}, // { 'YYYY-MM-DD': { slotId: { r: recipeId, f: factor } } }
  eaten: {}, // { 'YYYY-MM-DD': [slotId] }
  shopChecked: {}, // { weekStart: [foodId] }
});

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return withDefaults(JSON.parse(raw));
  } catch (e) {
    console.error('Daten konnten nicht geladen werden', e);
  }
  return defaults();
}

function withDefaults(data) {
  const d = defaults();
  return { ...d, ...data, prefs: { ...d.prefs, ...data.prefs } };
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
  state = withDefaults(data);
  save();
}

export function resetState() {
  state = defaults();
  save();
}

// Bittet den Browser, die Daten nicht automatisch zu löschen (wichtig in Safari).
navigator.storage?.persist?.().catch(() => {});
