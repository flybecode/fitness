import { defineRoute, defineActions, update } from '../core.js';
import { state } from '../store.js';
import { esc, isoDate, num, weekStart, weekDates, weekNumber, addDays, fmtWD, fmtDM, fmtLong, relDay } from '../util.js';
import {
  targets, dayRows, dayTotals, candidates, recipeMacros, formatAmount, fmtFactor, planDays,
  planWeekFrom, shoppingList, SLOTS, DIETS, dietOk,
} from '../nutrition.js';
import { FOODS } from '../data/foods.js';
import { RECIPES, RECIPE_BY_ID } from '../data/recipes.js';
import { icon } from '../icons.js';
import { openSheet, closeSheet, sheetHead, macroBar, toast } from '../ui.js';

let selDate = isoDate();
let shopWeek = null;
let recipeFilter = 'alle';

const macroLine = (m) =>
  `<span class="macros"><b>${num(m.kcal)}</b> kcal · <i class="p">${num(m.p)} P</i> · <i class="c">${num(m.c)} K</i> · <i class="f">${num(m.f)} F</i></span>`;

export function targetsCard(t) {
  return `<div class="card targets">
    <div class="targets-head">
      <div><p class="eyebrow">${esc(t.goal.label)}</p><p class="big">${num(t.kcal)} <small>kcal / Tag</small></p></div>
      <a class="btn small ghost" href="#/einstellungen">Anpassen</a>
    </div>
    <div class="tiles">
      <div class="tile p"><b>${num(t.protein)} g</b><span>Protein</span></div>
      <div class="tile c"><b>${num(t.carbs)} g</b><span>Kohlenhydrate</span></div>
      <div class="tile f"><b>${num(t.fat)} g</b><span>Fett</span></div>
    </div>
  </div>`;
}

export function mealRow(date, row, { check = false } = {}) {
  const { slot, label, recipe, macros, eaten, entry } = row;
  const checkBtn = check && recipe
    ? `<button class="check ${eaten ? 'on' : ''}" data-act="toggleEaten" data-date="${date}" data-slot="${slot}" aria-label="Gegessen">${icon('check')}</button>`
    : '';
  if (!recipe) {
    return `<div class="li">
      ${check ? '<span class="check placeholder"></span>' : ''}
      <div class="li-main"><span class="eyebrow">${label}</span><span class="muted">Noch nichts geplant</span></div>
      <button class="btn small" data-act="swapMeal" data-date="${date}" data-slot="${slot}">Auswählen</button>
    </div>`;
  }
  return `<div class="li ${eaten ? 'done' : ''}">
    ${checkBtn}
    <button class="li-main linkish" data-act="openMeal" data-date="${date}" data-slot="${slot}">
      <span class="eyebrow">${label}${entry.f !== 1 ? ` · ${num(entry.f, 2)}×` : ''}</span>
      <span class="li-title">${esc(recipe.name)}</span>
      ${macroLine(macros)}
    </button>
    ${check ? '' : `<button class="icon-btn" data-act="swapMeal" data-date="${date}" data-slot="${slot}" aria-label="Tauschen">${icon('swap')}</button>`}
  </div>`;
}

defineRoute(/^#\/ernaehrung$/, () => {
  const t = targets();
  const ws = weekStart(selDate);
  const today = isoDate();
  const rows = dayRows(selDate);
  const total = dayTotals(rows);
  const planned = rows.some((r) => r.recipe);
  const lowProtein = planned && total.p < t.protein * 0.9;
  return `
  <header class="top">
    <div><p class="eyebrow">Ziele & Mahlzeitenplan</p><h1>Ernährung</h1></div>
    <a class="icon-btn" href="#/ernaehrung/rezepte" aria-label="Rezepte">${icon('book')}</a>
  </header>
  ${targetsCard(t)}
  <div class="week-nav">
    <button class="icon-btn" data-act="weekShift" data-n="-7" aria-label="Vorige Woche">${icon('left')}</button>
    <span><b>KW ${weekNumber(ws)}</b> <span class="muted">${fmtDM(ws)} – ${fmtDM(addDays(ws, 6))}</span></span>
    <button class="icon-btn" data-act="weekShift" data-n="7" aria-label="Nächste Woche">${icon('right')}</button>
  </div>
  <div class="days">
    ${weekDates(ws).map((d) => `
      <button class="day ${d === selDate ? 'sel' : ''} ${d === today ? 'today' : ''} ${state.mealPlan[d] ? 'has' : ''}" data-act="selDay" data-date="${d}">
        <span>${fmtWD(d)}</span><b>${Number(d.slice(8))}</b>
      </button>`).join('')}
  </div>
  <div class="row between mt">
    <h2 class="section">${fmtLongOrRel(selDate)}</h2>
    ${planned ? `<button class="btn small ghost" data-act="rerollDay" data-date="${selDate}">${icon('dice')} Neu würfeln</button>` : ''}
  </div>
  <div class="card list">${rows.map((r) => mealRow(selDate, r)).join('')}</div>
  ${planned ? `<div class="card stack">
      <div class="row between"><span class="muted small">Tagessumme</span><b>${num(total.kcal)} / ${num(t.kcal)} kcal</b></div>
      ${macroBar('Protein', total.p, t.protein, 'p')}
      ${macroBar('Kohlenhydrate', total.c, t.carbs, 'c')}
      ${macroBar('Fett', total.f, t.fat, 'f')}
      ${lowProtein ? `<p class="hint">Tipp: Etwas wenig Protein. Ein Snack wie Skyr, Hüttenkäse oder ein Shake bringt 20–30 g extra.</p>` : ''}
    </div>` : ''}
  <div class="stack mt">
    <button class="btn primary block" data-act="planWeek">${icon('dice')} Woche planen</button>
    <a class="btn block" href="#/ernaehrung/einkauf">${icon('cart')} Einkaufsliste</a>
  </div>`;
}, 'ernaehrung');

function fmtLongOrRel(d) {
  const rel = relDay(d);
  return ['Heute', 'Gestern', 'Morgen'].includes(rel) ? `${rel}, ${fmtDM(d)}` : fmtLong(d);
}

defineRoute(/^#\/ernaehrung\/einkauf$/, () => {
  const ws = shopWeek ?? weekStart(selDate);
  const today = isoDate();
  const dates = weekDates(ws).filter((d) => d >= today);
  const groups = shoppingList(dates.length ? dates : weekDates(ws));
  const checked = state.shopChecked[ws] || [];
  const count = groups.reduce((s, g) => s + g.items.length, 0);
  return `
  <header class="top">
    <a class="icon-btn" href="#/ernaehrung" aria-label="Zurück">${icon('left')}</a>
    <h1 class="title-sm">Einkaufsliste</h1><span class="icon-btn"></span>
  </header>
  <div class="week-nav">
    <button class="icon-btn" data-act="shopWeek" data-n="-7">${icon('left')}</button>
    <span><b>KW ${weekNumber(ws)}</b> <span class="muted">${fmtDM(ws)} – ${fmtDM(addDays(ws, 6))}</span></span>
    <button class="icon-btn" data-act="shopWeek" data-n="7">${icon('right')}</button>
  </div>
  ${count ? `<p class="muted small">${ws <= today && today <= addDays(ws, 6) ? 'Ab heute bis Sonntag' : 'Ganze Woche'} · ${checked.length}/${count} erledigt · Gewürze nicht enthalten</p>
    ${groups.map((g) => `<h2 class="section">${g.cat}</h2>
      <div class="card list">${g.items.map((it) => {
        const on = checked.includes(it.id);
        return `<button class="li shop ${on ? 'done' : ''}" data-act="toggleShop" data-week="${ws}" data-id="${it.id}">
          <span class="check ${on ? 'on' : ''}">${icon('check')}</span>
          <span class="li-main">${esc(it.name)}</span><span class="muted">${it.amount}</span>
        </button>`;
      }).join('')}</div>`).join('')}`
    : `<div class="card empty"><h3>Keine Mahlzeiten geplant</h3><p class="muted">Plane zuerst die Woche, dann entsteht hier deine Liste.</p></div>`}`;
}, 'ernaehrung');

defineRoute(/^#\/ernaehrung\/rezepte$/, () => {
  const cats = { alle: 'Alle', fruehstueck: 'Frühstück', haupt: 'Hauptgerichte', snack: 'Snacks' };
  const list = RECIPES.filter((r) => (recipeFilter === 'alle' || r.cat === recipeFilter) && dietOk(r, state.prefs.diet));
  return `
  <header class="top">
    <a class="icon-btn" href="#/ernaehrung" aria-label="Zurück">${icon('left')}</a>
    <h1 class="title-sm">Rezepte</h1><span class="icon-btn"></span>
  </header>
  <div class="chips">${Object.entries(cats).map(([k, l]) => `<button class="chip ${k === recipeFilter ? 'on' : ''}" data-act="recipeFilter" data-k="${k}">${l}</button>`).join('')}</div>
  <p class="muted small">${list.length} Rezepte · ${DIETS[state.prefs.diet]} · Werte pro Grundportion</p>
  <div class="card list">${list.map((r) => `
    <button class="li linkish" data-act="openRecipe" data-id="${r.id}">
      <span class="li-main"><span class="li-title">${esc(r.name)}</span>${macroLine(recipeMacros(r))}</span>
      <span class="muted small">${r.min} Min.</span>
    </button>`).join('')}</div>`;
}, 'ernaehrung');

// --- Sheets --------------------------------------------------------------

function recipeSheet(recipeId, ctx) {
  const entry = ctx && state.mealPlan[ctx.date]?.[ctx.slot];
  const recipe = RECIPE_BY_ID[entry?.r ?? recipeId];
  const f = entry?.f ?? 1;
  const m = recipeMacros(recipe, f);
  return `${sheetHead(recipe.name, `${ctx ? `${SLOTS[ctx.slot].label} · ${fmtLongOrRel(ctx.date)} · ` : ''}${recipe.min} Min.${recipe.batch ? ' · gut zum Vorkochen' : ''}`)}
    <div class="tiles">
      <div class="tile"><b>${num(m.kcal)}</b><span>kcal</span></div>
      <div class="tile p"><b>${num(m.p)} g</b><span>Protein</span></div>
      <div class="tile c"><b>${num(m.c)} g</b><span>Kohlenh.</span></div>
      <div class="tile f"><b>${num(m.f)} g</b><span>Fett</span></div>
    </div>
    ${ctx ? `<div class="stepper mt">
      <button class="icon-btn" data-act="portion" data-d="-0.25" ${f <= 0.5 ? 'disabled' : ''}>${icon('minus')}</button>
      <span><b>${fmtFactor(f)}</b></span>
      <button class="icon-btn" data-act="portion" data-d="0.25" ${f >= 2.5 ? 'disabled' : ''}>${icon('plus')}</button>
    </div>` : ''}
    <h3 class="mt">Zutaten</h3>
    <ul class="ingredients">${recipe.items.map(([id, g]) => `<li><span class="amt">${formatAmount(id, g * f)}</span>${esc(FOODS[id].name)}</li>`).join('')}</ul>
    ${recipe.extra ? `<p class="muted small">Außerdem: ${esc(recipe.extra)}</p>` : ''}
    <h3 class="mt">Zubereitung</h3>
    <ol class="steps">${recipe.steps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol>
    ${ctx ? `<div class="stack mt">
      <button class="btn block" data-act="swapMeal" data-date="${ctx.date}" data-slot="${ctx.slot}">${icon('swap')} Anderes Gericht</button>
      <div class="row gap">
        <button class="btn grow ghost" data-act="removeMeal">Entfernen</button>
        <button class="btn grow ghost" data-act="dislike" data-id="${recipe.id}">Nicht mehr vorschlagen</button>
      </div>
    </div>` : ''}`;
}

let sheetCtx = null;

function swapSheet() {
  const { date, slot } = sheetCtx;
  const t = targets();
  const share = dayRows(date).find((r) => r.slot === slot)?.share || 0.25;
  const current = state.mealPlan[date]?.[slot]?.r;
  const list = candidates(slot, t.kcal * share, t);
  return `${sheetHead(`${SLOTS[slot].label} wählen`, `${fmtLongOrRel(date)} · Ziel ca. ${num(t.kcal * share)} kcal`)}
    <p class="muted small">Sortiert danach, wie gut das Gericht zu deinem Ziel passt. Die Portion wird automatisch angepasst.</p>
    <div class="list">${list.map((c) => `
      <button class="li linkish ${c.recipe.id === current ? 'sel' : ''}" data-act="chooseMeal" data-id="${c.recipe.id}" data-f="${c.factor}">
        <span class="li-main">
          <span class="li-title">${esc(c.recipe.name)}</span>
          <span class="eyebrow">${fmtFactor(c.factor)} · ${c.recipe.min} Min.</span>
          ${macroLine(c.macros)}
        </span>
        ${c.recipe.id === current ? icon('check', 'accent') : ''}
      </button>`).join('')}</div>`;
}

export function openMealSheet(date, slot) {
  sheetCtx = { date, slot };
  openSheet(() => (state.mealPlan[date]?.[slot] ? recipeSheet(null, sheetCtx) : swapSheet()));
}

defineActions({
  selDay(el) {
    selDate = el.dataset.date;
    shopWeek = null;
    update();
  },
  weekShift(el) {
    selDate = addDays(weekStart(selDate), Number(el.dataset.n));
    const today = isoDate();
    if (weekStart(today) === weekStart(selDate)) selDate = today;
    shopWeek = null;
    update();
  },
  planWeek() {
    const ws = weekStart(selDate);
    const today = isoDate();
    const dates = weekDates(ws).filter((d) => d >= today);
    if (!dates.length) return toast('Diese Woche liegt in der Vergangenheit');
    if (dates.some((d) => state.mealPlan[d]) && !confirm('Die geplanten Mahlzeiten dieser Woche (ab heute) werden ersetzt. Fortfahren?')) return;
    planWeekFrom(ws);
    update();
    toast('Woche geplant');
  },
  rerollDay(el) {
    planDays([el.dataset.date]);
    update();
  },
  openMeal(el) {
    openMealSheet(el.dataset.date, el.dataset.slot);
  },
  openRecipe(el) {
    sheetCtx = null;
    openSheet(() => recipeSheet(el.dataset.id, null));
  },
  swapMeal(el) {
    sheetCtx = { date: el.dataset.date, slot: el.dataset.slot };
    openSheet(swapSheet);
  },
  chooseMeal(el) {
    const { date, slot } = sheetCtx;
    state.mealPlan[date] ??= {};
    state.mealPlan[date][slot] = { r: el.dataset.id, f: Number(el.dataset.f) };
    closeSheet();
    update();
  },
  portion(el) {
    const e = state.mealPlan[sheetCtx.date][sheetCtx.slot];
    e.f = Math.min(2.5, Math.max(0.5, e.f + Number(el.dataset.d)));
    update();
  },
  removeMeal() {
    const { date, slot } = sheetCtx;
    delete state.mealPlan[date][slot];
    state.eaten[date] = (state.eaten[date] || []).filter((s) => s !== slot);
    closeSheet();
    update();
  },
  dislike(el) {
    state.prefs.disliked.push(el.dataset.id);
    openSheet(swapSheet);
    update();
    toast('Wird nicht mehr vorgeschlagen');
  },
  toggleEaten(el) {
    const { date, slot } = el.dataset;
    const list = (state.eaten[date] ??= []);
    state.eaten[date] = list.includes(slot) ? list.filter((s) => s !== slot) : [...list, slot];
    update();
  },
  shopWeek(el) {
    shopWeek = addDays(shopWeek ?? weekStart(selDate), Number(el.dataset.n));
    update();
  },
  toggleShop(el) {
    const { week, id } = el.dataset;
    const list = state.shopChecked[week] || [];
    state.shopChecked[week] = list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
    update();
  },
  recipeFilter(el) {
    recipeFilter = el.dataset.k;
    update();
  },
});
