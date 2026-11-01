// Energiebedarf, Leitfaden, Rezeptwerte, Wochenauswahl, Einkaufsliste und Tagesrechner.

import { state } from './store.js';
import { FOODS, SHOP_ORDER } from './data/foods.js';
import { RECIPES, RECIPE_BY_ID } from './data/recipes.js';
import { num } from './util.js';

export const ACTIVITY = [
  { v: 1.2, label: 'Kaum aktiv', hint: 'Bürojob, kaum Bewegung' },
  { v: 1.375, label: 'Leicht aktiv', hint: '1–3× Sport pro Woche' },
  { v: 1.55, label: 'Mäßig aktiv', hint: '3–5× Sport pro Woche' },
  { v: 1.725, label: 'Sehr aktiv', hint: 'Täglich Sport oder körperliche Arbeit' },
];

// kcal: Anpassung relativ zum Gesamtumsatz, protein: g pro kg Körpergewicht, fat: Anteil an den kcal.
export const GOALS = {
  abnehmen: { label: 'Fett verlieren', kcal: -0.2, protein: 2.0, fat: 0.25 },
  definieren: { label: 'Langsam abnehmen', kcal: -0.1, protein: 2.0, fat: 0.27 },
  halten: { label: 'Gewicht halten', kcal: 0, protein: 1.6, fat: 0.3 },
  aufbau: { label: 'Muskeln aufbauen', kcal: 0.1, protein: 1.8, fat: 0.25 },
};

export const DIETS = { alles: 'Alles', veg: 'Vegetarisch', vegan: 'Vegan' };
export const CATS = { fruehstueck: 'Frühstück', haupt: 'Hauptgericht', snack: 'Snack', shake: 'Shake' };

// Bild-Icon und Farbe für Rezeptkacheln, abgeleitet aus dem Namen (Reihenfolge = Priorität).
const VISUAL_RULES = [
  [/shake/, 'milkshake'],
  [/lachs|garnele|thunfisch|fisch|kabeljau/, 'fish'],
  [/salat/, 'salad'],
  [/curry|chili|suppe|eintopf/, 'soup'],
  [/pasta|nudel|bolognese|spaghetti/, 'bowl-chopsticks'],
  [/wrap/, 'baguette'],
  [/rührei|omelett|scramble|pancake/, 'egg-fried'],
  [/eier|ei /, 'egg'],
  [/brot|toast|brötchen/, 'bread'],
  [/hähnchen|pute|rind|hack|schwein|steak/, 'meat'],
  [/kartoffel|tofu|kichererbse|linsen|quinoa|gemüse-pfanne/, 'leaf'],
  [/oats|porridge|quark|müsli|granola/, 'bowl-spoon'],
  [/pudding|skyr|joghurt/, 'cup'],
  [/apfel|beere|obst|banane/, 'apple'],
  [/hummus|gemüse|gurke|karotte/, 'carrot'],
  [/reiswaffel|riegel|keks/, 'cookie'],
];
const CAT_VISUAL = { fruehstueck: ['bowl-spoon', 'yellow'], haupt: ['bowl-chopsticks', 'orange'], snack: ['apple', 'green'], shake: ['milkshake', 'blue'] };

export function recipeVisual(r) {
  const n = r.name.toLowerCase();
  const [fallback, tone] = CAT_VISUAL[r.cat] ?? CAT_VISUAL.haupt;
  return { icon: VISUAL_RULES.find(([re]) => re.test(n))?.[1] ?? fallback, tone };
}

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

export const targets = () => (state.profile ? calcTargets(state.profile, currentWeight() ?? 75) : null);

// Grober Leitfaden statt starrem Tagesplan.
export function guide(t) {
  const meals = state.profile.mealsPerDay || 4;
  const perMeal = { kcal: Math.round(t.kcal / meals / 10) * 10, p: Math.round(t.protein / meals / 5) * 5 };
  const rules = {
    abnehmen: [
      'Zu jeder Mahlzeit eine Proteinquelle – sie macht satt und schützt die Muskeln.',
      'Den halben Teller mit Gemüse füllen, Beilagen eher klein halten.',
      'Kalorien aus Getränken und Snacks zwischendurch sparen.',
    ],
    definieren: [
      'Zu jeder Mahlzeit eine Proteinquelle.',
      'Kohlenhydrate vor allem rund ums Training.',
      'Leichtes Defizit reicht – lieber konstant als radikal.',
    ],
    halten: [
      'Zu jeder Mahlzeit eine Proteinquelle.',
      'Vollkorn, Gemüse und Obst als Basis.',
      'Gewicht einmal pro Woche prüfen und bei Abweichung leicht nachsteuern.',
    ],
    aufbau: [
      'Zu jeder Mahlzeit 30–40 g Protein, verteilt über den Tag.',
      'Kohlenhydrate vor und nach dem Training nicht scheuen.',
      'Fällt das Essen schwer: Shakes, Haferflocken und Nüsse liefern viele Kalorien.',
    ],
  }[state.profile.goal] ?? [];
  return { meals, perMeal, rules };
}

// --- Lebensmittel -------------------------------------------------------------

export const food = (id) => FOODS[id] ?? state.customFoods.find((f) => f.id === id) ?? null;

const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ß/g, 'ss');

export function searchFoods(query, limit = 30) {
  const q = norm(query.trim());
  const all = [...state.customFoods, ...Object.values(FOODS)];
  if (!q) return all.slice(0, limit);
  return all
    .map((f) => {
      const name = norm(f.name);
      const hay = `${name} ${norm(f.alias || '')}`;
      const score = name.startsWith(q) ? 0 : name.includes(q) ? 1 : hay.includes(q) ? 2 : -1;
      return { f, score };
    })
    .filter((x) => x.score >= 0)
    .sort((a, b) => a.score - b.score || a.f.name.localeCompare(b.f.name, 'de'))
    .slice(0, limit)
    .map((x) => x.f);
}

export function formatAmount(foodId, grams) {
  const f = food(foodId);
  if (f?.unit) {
    const n = Math.round((grams / f.unit.g) * 2) / 2;
    if (n >= 0.5) return `${num(n, 1)} ${n === 1 ? f.unit.s : f.unit.p}`;
  }
  const v = grams < 20 ? Math.round(grams) : Math.round(grams / 5) * 5;
  return `${v} ${f?.ml ? 'ml' : 'g'}`;
}

export function itemsMacros(items) {
  const m = { kcal: 0, p: 0, c: 0, f: 0 };
  for (const [id, g] of items) {
    const f = food(id);
    if (!f) continue;
    for (const k of Object.keys(m)) m[k] += (f[k] * g) / 100;
  }
  return m;
}

// --- Rezepte ------------------------------------------------------------------

export const allRecipes = () => [...state.recipes, ...RECIPES];
export const recipe = (id) => RECIPE_BY_ID[id] ?? state.recipes.find((r) => r.id === id) ?? null;
export const isOwn = (r) => state.recipes.includes(r);
export const servings = (r) => r.servings || 1;

export function recipeMacros(r, portions = 1) {
  const total = itemsMacros(r.items);
  const k = portions / servings(r);
  return { kcal: total.kcal * k, p: total.p * k, c: total.c * k, f: total.f * k };
}

// Protein pro 100 kcal – das wichtigste Maß für „kalorien- und proteinoptimiert“.
export const proteinDensity = (r) => {
  const m = recipeMacros(r);
  return m.kcal ? (m.p / m.kcal) * 100 : 0;
};

export const dietOk = (r, diet) => !r.diet || diet === 'alles' || r.diet === 'vegan' || (diet === 'veg' && r.diet === 'veg');

// --- Woche & Einkaufsliste ----------------------------------------------------

export const weekList = (ws) => (state.week[ws] ?? []).filter((e) => recipe(e.r));

export function weekTotals(ws) {
  const list = weekList(ws);
  const portions = list.reduce((s, e) => s + e.n, 0);
  const sum = list.reduce((acc, e) => {
    const m = recipeMacros(recipe(e.r), e.n);
    acc.kcal += m.kcal;
    acc.p += m.p;
    return acc;
  }, { kcal: 0, p: 0 });
  return { portions, avgKcal: portions ? sum.kcal / portions : 0, avgP: portions ? sum.p / portions : 0 };
}

export function shoppingList(ws) {
  const sum = {};
  for (const e of weekList(ws)) {
    const r = recipe(e.r);
    const k = e.n / servings(r);
    for (const [id, g] of r.items) sum[id] = (sum[id] || 0) + g * k;
  }
  const items = Object.entries(sum)
    .map(([id, g]) => ({ id, f: food(id), g }))
    .filter((x) => x.f)
    .map(({ id, f, g }) => ({ id, name: f.name, amount: shopAmount(f, g), cat: f.cat || 'Sonstiges' }));
  return SHOP_ORDER.map((cat) => ({
    cat,
    items: items.filter((i) => i.cat === cat).sort((a, b) => a.name.localeCompare(b.name, 'de')),
  })).filter((g) => g.items.length);
}

function shopAmount(f, grams) {
  if (f.unit) {
    const n = Math.ceil(grams / f.unit.g);
    return `${n} ${n === 1 ? f.unit.s : f.unit.p}`;
  }
  if (grams >= 1000) return `${num(Math.ceil(grams / 100) / 10, 1)} ${f.ml ? 'l' : 'kg'}`;
  return `${Math.ceil(grams / 10) * 10} ${f.ml ? 'ml' : 'g'}`;
}

// --- Tagesrechner -------------------------------------------------------------

export function dayEntries(date) {
  return (state.dayLog[date] ?? [])
    .map((e) => {
      if (e.kind === 'ai') return { ...e, label: e.amount };
      if (e.kind === 'recipe') {
        const r = recipe(e.ref);
        return r && { ...e, name: r.name, label: `${num(e.amount, 2)} ${e.amount === 1 ? 'Portion' : 'Portionen'}`, m: recipeMacros(r, e.amount) };
      }
      const f = food(e.ref);
      return f && { ...e, name: f.name, label: formatAmount(e.ref, e.amount), m: itemsMacros([[e.ref, e.amount]]) };
    })
    .filter(Boolean);
}

export function dayVerdict(entries, t) {
  const sum = entries.reduce((a, e) => ({ kcal: a.kcal + e.m.kcal, p: a.p + e.m.p, c: a.c + e.m.c, f: a.f + e.m.f }), { kcal: 0, p: 0, c: 0, f: 0 });
  const notes = [];
  const dk = sum.kcal - t.kcal;
  if (Math.abs(dk) <= t.kcal * 0.08) notes.push({ ok: true, text: `Kalorien im Ziel (${dk >= 0 ? '+' : '−'}${num(Math.abs(dk))} kcal)` });
  else notes.push({ ok: false, text: dk > 0 ? `${num(dk)} kcal über dem Ziel` : `${num(-dk)} kcal unter dem Ziel` });
  const dp = sum.p - t.protein;
  if (dp >= -t.protein * 0.1) notes.push({ ok: true, text: 'Protein erreicht' });
  else notes.push({ ok: false, text: `Protein: ${num(-dp)} g zu wenig` });
  if (sum.f > t.fat * 1.25) notes.push({ ok: false, text: `Fett: ${num(sum.f - t.fat)} g über dem Ziel` });
  return { sum, notes, ok: notes.every((n) => n.ok) };
}
