// Energiebedarf, Makro-Ziele und automatische Mahlzeitenplanung.

import { state } from './store.js';
import { FOODS, SHOP_ORDER } from './data/foods.js';
import { RECIPES, RECIPE_BY_ID } from './data/recipes.js';
import { clamp, isoDate, num, weekDates } from './util.js';

export const ACTIVITY = [
  { v: 1.2, label: 'Kaum aktiv', hint: 'Bürojob, kaum Sport' },
  { v: 1.375, label: 'Leicht aktiv', hint: '1–3× Sport pro Woche' },
  { v: 1.55, label: 'Mäßig aktiv', hint: '3–5× Sport pro Woche' },
  { v: 1.725, label: 'Sehr aktiv', hint: 'Täglich Sport oder körperliche Arbeit' },
];

// kcal: Anpassung relativ zum Gesamtumsatz, protein: g pro kg Körpergewicht, fat: Anteil an den kcal.
export const GOALS = {
  abnehmen: { label: 'Fett verlieren', kcal: -0.2, protein: 2.0, fat: 0.25, hint: '≈ 20 % Defizit, viel Protein schützt die Muskeln' },
  definieren: { label: 'Langsam abnehmen', kcal: -0.1, protein: 2.0, fat: 0.27, hint: 'Leichtes Defizit, Kraft bleibt erhalten' },
  halten: { label: 'Gewicht halten', kcal: 0, protein: 1.6, fat: 0.3, hint: 'Kalorien auf Erhaltungsniveau' },
  aufbau: { label: 'Muskeln aufbauen', kcal: 0.1, protein: 1.8, fat: 0.25, hint: '≈ 10 % Überschuss für sauberen Aufbau' },
};

export const DIETS = { alles: 'Alles', veg: 'Vegetarisch', vegan: 'Vegan' };

export const SLOTS = {
  fruehstueck: { label: 'Frühstück', cat: 'fruehstueck' },
  snack: { label: 'Snack', cat: 'snack' },
  mittag: { label: 'Mittagessen', cat: 'haupt' },
  snack2: { label: 'Snack', cat: 'snack' },
  abend: { label: 'Abendessen', cat: 'haupt' },
};

// Verteilung des Tagesbedarfs auf die Mahlzeiten.
export function slotsFor(n) {
  if (n <= 3) return [['fruehstueck', 0.3], ['mittag', 0.38], ['abend', 0.32]];
  if (n === 4) return [['fruehstueck', 0.25], ['mittag', 0.33], ['snack', 0.12], ['abend', 0.3]];
  return [['fruehstueck', 0.22], ['snack', 0.1], ['mittag', 0.3], ['snack2', 0.1], ['abend', 0.28]];
}
const SLOT_ORDER = ['fruehstueck', 'snack', 'mittag', 'snack2', 'abend'];
const orderSlots = (list) => [...list].sort((a, b) => SLOT_ORDER.indexOf(a[0]) - SLOT_ORDER.indexOf(b[0]));

export function currentWeight() {
  const entries = state.bodyLog.filter((e) => e.weight).sort((a, b) => a.date.localeCompare(b.date));
  return entries.length ? entries[entries.length - 1].weight : null;
}

export function calcTargets(profile, weight) {
  const age = new Date().getFullYear() - profile.birthYear;
  const bmr = 10 * weight + 6.25 * profile.height - 5 * age + (profile.sex === 'm' ? 5 : -161);
  const tdee = bmr * profile.activity;
  const goal = GOALS[profile.goal] ?? GOALS.halten;
  const minKcal = profile.sex === 'm' ? 1500 : 1200;
  const kcal = Math.max(minKcal, Math.round((tdee * (1 + goal.kcal) + (profile.kcalAdjust || 0)) / 10) * 10);
  const protein = Math.round(weight * goal.protein);
  const fat = Math.max(Math.round(weight * 0.8), Math.round((kcal * goal.fat) / 9));
  const carbs = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4));
  return { bmr: Math.round(bmr), tdee: Math.round(tdee), kcal, protein, fat, carbs, goal };
}

export function targets() {
  return state.profile ? calcTargets(state.profile, currentWeight() ?? 75) : null;
}

// --- Rezepte -----------------------------------------------------------

const macroCache = new Map();
export function recipeMacros(recipe, factor = 1) {
  if (!macroCache.has(recipe.id)) {
    const m = { kcal: 0, p: 0, c: 0, f: 0 };
    for (const [id, g] of recipe.items) {
      const food = FOODS[id];
      for (const k of Object.keys(m)) m[k] += (food[k] * g) / 100;
    }
    macroCache.set(recipe.id, m);
  }
  const m = macroCache.get(recipe.id);
  return { kcal: m.kcal * factor, p: m.p * factor, c: m.c * factor, f: m.f * factor };
}

export function formatAmount(foodId, grams) {
  const food = FOODS[foodId];
  if (food.unit) {
    const n = Math.round((grams / food.unit.g) * 2) / 2;
    if (n >= 0.5) return `${num(n, 1)} ${n === 1 ? food.unit.s : food.unit.p}`;
  }
  const v = grams < 20 ? Math.round(grams) : Math.round(grams / 5) * 5;
  return `${v} ${food.ml ? 'ml' : 'g'}`;
}

export const dietOk = (recipe, diet) =>
  diet === 'alles' || recipe.diet === 'vegan' || (diet === 'veg' && recipe.diet === 'veg');

export const fmtFactor = (f) => (f === 1 ? '1 Portion' : `${num(f, 2)} Portionen`);

// Passende Rezepte für eine Mahlzeit, sortiert nach Eignung (kleiner Score = besser).
export function candidates(slot, slotKcal, t) {
  const cat = SLOTS[slot].cat;
  const proteinShare = (t.protein * 4) / t.kcal;
  const fatShare = (t.fat * 9) / t.kcal;
  return RECIPES.filter((r) => r.cat === cat && dietOk(r, state.prefs.diet) && !state.prefs.disliked.includes(r.id))
    .map((recipe) => {
      const base = recipeMacros(recipe);
      const factor = clamp(Math.round((slotKcal / base.kcal) * 4) / 4, 0.5, 2.5);
      const m = recipeMacros(recipe, factor);
      const pShare = (base.p * 4) / base.kcal;
      const fShare = (base.f * 9) / base.kcal;
      // Zu wenig Protein wird stark bestraft, viel zu viel Protein (kostet Kohlenhydrate)
      // und deutlich zu viel Fett leichter, Kalorienabweichung sowieso.
      const score = (Math.abs(m.kcal - slotKcal) / slotKcal) * 2
        + Math.max(0, proteinShare - pShare) * 4
        + Math.max(0, pShare - proteinShare * 1.3) * 2
        + Math.max(0, fShare - fatShare * 1.2) * 3;
      return { recipe, factor, macros: m, score };
    })
    .sort((a, b) => a.score - b.score);
}

export function plannedSlots() {
  return orderSlots(slotsFor(state.prefs.mealsPerDay));
}

// Zeilen eines Tages: aktuelle Mahlzeiten-Slots plus evtl. ältere geplante Slots.
export function dayRows(date) {
  const day = state.mealPlan[date] || {};
  const slots = plannedSlots().map(([id, share]) => [id, share]);
  for (const id of Object.keys(day)) if (!slots.some(([s]) => s === id)) slots.push([id, 0]);
  return orderSlots(slots).map(([slot, share]) => {
    const entry = day[slot];
    const recipe = entry && RECIPE_BY_ID[entry.r];
    return {
      slot, share, label: SLOTS[slot].label, entry, recipe,
      macros: recipe ? recipeMacros(recipe, entry.f) : null,
      eaten: (state.eaten[date] || []).includes(slot),
    };
  });
}

export function dayTotals(rows, onlyEaten = false) {
  const t = { kcal: 0, p: 0, c: 0, f: 0 };
  for (const row of rows) {
    if (!row.macros || (onlyEaten && !row.eaten)) continue;
    for (const k of Object.keys(t)) t[k] += row.macros[k];
  }
  return t;
}

// Plant die angegebenen Tage neu: abwechslungsreich, passend zu Kalorien und Protein.
export function planDays(dates) {
  const t = targets();
  const slots = plannedSlots();
  const used = new Map();
  let prev = {};
  for (const date of dates) {
    const day = {};
    for (const [slot, share] of slots) {
      const list = candidates(slot, t.kcal * share, t)
        .map((c) => {
          const id = c.recipe.id;
          const sameDay = Object.values(day).some((e) => e.r === id);
          return { ...c, score: c.score + (used.get(id) || 0) * 0.5 + (prev[slot] === id ? 2 : 0) + (sameDay ? 5 : 0) };
        })
        .sort((a, b) => a.score - b.score);
      if (!list.length) continue;
      // Zufall unter den besten Kandidaten, die besseren etwas wahrscheinlicher.
      const top = list.slice(0, Math.min(4, list.length));
      const pick = top[Math.floor(Math.random() ** 1.5 * top.length)];
      day[slot] = { r: pick.recipe.id, f: pick.factor };
      used.set(pick.recipe.id, (used.get(pick.recipe.id) || 0) + 1);
    }
    balanceDay(day, t.kcal);
    prev = Object.fromEntries(Object.entries(day).map(([k, v]) => [k, v.r]));
    state.mealPlan[date] = day;
    delete state.eaten[date];
  }
}

// Feinjustierung der Portionen, damit die Tagessumme nah am Ziel liegt.
function balanceDay(day, kcalTarget) {
  const total = () => Object.values(day).reduce((s, e) => s + recipeMacros(RECIPE_BY_ID[e.r], e.f).kcal, 0);
  for (let i = 0; i < 6; i++) {
    const diff = kcalTarget - total();
    if (Math.abs(diff) < kcalTarget * 0.05) return;
    const dir = Math.sign(diff);
    let best = null;
    for (const e of Object.values(day)) {
      const nf = e.f + dir * 0.25;
      if (nf < 0.5 || nf > 2.5) continue;
      const step = recipeMacros(RECIPE_BY_ID[e.r], 0.25).kcal;
      const rest = Math.abs(Math.abs(diff) - step);
      if (!best || rest < best.rest) best = { e, nf, rest };
    }
    if (!best || best.rest >= Math.abs(diff)) return;
    best.e.f = best.nf;
  }
}

export function planWeekFrom(startIso) {
  const today = isoDate();
  planDays(weekDates(startIso).filter((d) => d >= today));
}

// --- Einkaufsliste -----------------------------------------------------

export function shoppingList(dates) {
  const sum = {};
  for (const d of dates) {
    for (const e of Object.values(state.mealPlan[d] || {})) {
      const r = RECIPE_BY_ID[e.r];
      if (!r) continue;
      for (const [id, g] of r.items) sum[id] = (sum[id] || 0) + g * e.f;
    }
  }
  const groups = SHOP_ORDER.map((cat) => ({
    cat,
    items: Object.entries(sum)
      .filter(([id]) => FOODS[id].cat === cat)
      .map(([id, g]) => ({ id, name: FOODS[id].name, amount: shopAmount(id, g) }))
      .sort((a, b) => a.name.localeCompare(b.name, 'de')),
  }));
  return groups.filter((g) => g.items.length);
}

function shopAmount(id, grams) {
  const food = FOODS[id];
  if (food.unit) {
    const n = Math.ceil(grams / food.unit.g);
    return `${n} ${n === 1 ? food.unit.s : food.unit.p}`;
  }
  const u = food.ml ? 'ml' : 'g';
  if (grams >= 1000) return `${num(Math.ceil(grams / 100) / 10, 1)} ${food.ml ? 'l' : 'kg'}`;
  return `${Math.ceil(grams / 10) * 10} ${u}`;
}
