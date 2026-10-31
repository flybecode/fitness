import { defineRoute, defineActions, update, go, render } from '../core.js';
import { state, save } from '../store.js';
import { esc, num, uid, isoDate, weekStart, addDays, weekNumber, weekLabel, fmtDM, fmtLong, parseNum, relDay } from '../util.js';
import {
  targets, guide, food, searchFoods, formatAmount, itemsMacros, allRecipes, recipe, isOwn, servings,
  recipeMacros, proteinDensity, dietOk, weekList, weekTotals, shoppingList, dayEntries, dayVerdict, CATS,
} from '../nutrition.js';
import { FOODS } from '../data/foods.js';
import { searchOff } from '../off.js';
import { importRecipe, ImportError } from '../ai.js';
import { prepareImage } from '../photos.js';
import { icon } from '../icons.js';
import { openSheet, closeSheet, sheetHead, toast, pageHead, label, macroRow, stepper, empty, badge, macroSplit } from '../ui.js';

// Ab Samstag wird schon für die kommende Woche geplant.
const planningWeek = () => {
  const today = isoDate();
  const ws0 = weekStart(today);
  return addDays(today, 0) >= addDays(ws0, 5) ? addDays(ws0, 7) : ws0;
};
let ws = planningWeek();
let filter = 'alle';
let query = '';
let detailPortions = null;
let draft = null;
let importing = false;
let importError = '';
let calcDate = isoDate();
let picker = null; // { mode: 'draft' | 'calc', results, offResults, offState }

const FILTERS = { alle: 'Alle', prep: 'Mealprep', fruehstueck: 'Frühstück', haupt: 'Haupt', snack: 'Snack', eigene: 'Eigene' };
const kcalP = (m) => `<span class="mono">${num(m.kcal)} kcal · ${num(m.p)} g P</span>`;

// --- Übersicht -------------------------------------------------------------------

function recipeRows() {
  const q = query.trim().toLowerCase();
  const list = allRecipes()
    .filter((r) => dietOk(r, state.prefs.diet))
    .filter((r) => filter === 'alle' || (filter === 'prep' ? r.prep : filter === 'eigene' ? isOwn(r) : r.cat === filter))
    .filter((r) => !q || r.name.toLowerCase().includes(q))
    .sort((a, b) => proteinDensity(b) - proteinDensity(a));
  if (!list.length) return '<p class="muted small pad">Keine Rezepte gefunden.</p>';
  const inWeek = new Set(weekList(ws).map((e) => e.r));
  return list.map((r) => {
    const m = recipeMacros(r);
    const tags = [r.prep && 'Mealprep', isOwn(r) && 'Eigenes', r.diet === 'vegan' && 'Vegan'].filter(Boolean);
    return `<div class="row-item">
      <a class="row-main" href="#/ernaehrung/rezept/${r.id}">
        <span class="row-title">${esc(r.name)}</span>
        <span class="row-sub">${kcalP(m)}${tags.length ? ` <span class="tags">${tags.map((t) => `<i>${t}</i>`).join('')}</span>` : ''}</span>
      </a>
      <button class="icon-btn ${inWeek.has(r.id) ? 'on' : ''}" data-act="quickAdd" data-id="${r.id}" aria-label="Zur Woche">${icon(inWeek.has(r.id) ? 'check' : 'plus')}</button>
    </div>`;
  }).join('');
}

defineRoute(/^#\/ernaehrung$/, () => {
  const t = targets();
  const g = guide(t);
  const list = weekList(ws);
  const tot = weekTotals(ws);
  const open = shoppingList(ws).reduce((s, gr) => s + gr.items.length, 0) - (state.shopChecked[ws]?.length || 0);
  return `
  ${pageHead('Ernährung')}
  <section class="panel">
    ${label(`Tagesziel · ${esc(t.goal.label)}`, '<a class="link" href="#/einstellungen">Ändern</a>')}
    <p class="big">${num(t.kcal)}<span class="unit">kcal</span></p>
    ${macroSplit(t.protein, t.carbs, t.fat)}
    <div class="cells cells3">
      <div class="dot-p"><p class="label">Protein</p><p class="val">${num(t.protein)} g</p></div>
      <div class="dot-c"><p class="label">Kohlenh.</p><p class="val">${num(t.carbs)} g</p></div>
      <div class="dot-f"><p class="label">Fett</p><p class="val">${num(t.fat)} g</p></div>
    </div>
  </section>

  <section class="panel">
    <div class="stat-head">${badge('bulb', 'orange')}<p class="label">Leitfaden</p></div>
    <p class="lead">${g.meals} Mahlzeiten mit je ca. <b class="mono">${num(g.perMeal.kcal)} kcal</b> und <b class="mono">${g.perMeal.p} g Protein</b>.</p>
    <ol class="rules">${g.rules.map((r) => `<li>${r}</li>`).join('')}</ol>
  </section>

  <section class="panel">
    <div class="label-row">
      <button class="icon-btn small" data-act="weekShift" data-n="-7" aria-label="Vorige Woche">${icon('left')}</button>
      <p class="label">${weekLabel(ws)}</p>
      <button class="icon-btn small" data-act="weekShift" data-n="7" aria-label="Nächste Woche">${icon('right')}</button>
    </div>
    ${list.length ? `
      <div class="rows">${list.map((e) => {
        const r = recipe(e.r);
        return `<div class="row-item">
          <a class="row-main" href="#/ernaehrung/rezept/${r.id}"><span class="row-title">${esc(r.name)}</span>
          <span class="row-sub">${kcalP(recipeMacros(r))} pro Portion</span></a>
          ${stepper(e.n, { dec: { act: 'weekPortion', attrs: `data-id="${r.id}" data-d="-1"` }, inc: { act: 'weekPortion', attrs: `data-id="${r.id}" data-d="1"` }, size: 'sm' })}
        </div>`;
      }).join('')}</div>
      <p class="muted small mt">${tot.portions} Portionen · Ø <span class="mono">${num(tot.avgKcal)} kcal / ${num(tot.avgP)} g P</span></p>
      <a class="btn block mt" href="#/ernaehrung/einkauf">Einkaufsliste${open > 0 ? ` · ${open} offen` : ''}</a>`
    : `<p class="muted small">Noch nichts ausgewählt. Tipp: zwei Mealprep-Gerichte à 4 Portionen decken die Mittagessen der Woche.</p>`}
  </section>

  <div class="label-row section"><p class="label">Rezepte</p><a class="link" href="#/ernaehrung/neu">${icon('plus')} Eigenes Rezept</a></div>
  <label class="search">${icon('search')}<input type="search" placeholder="Rezept suchen" value="${esc(query)}" data-input="recipeSearch" autocomplete="off"></label>
  <div class="seg scroll">${Object.entries(FILTERS).map(([k, l]) => `<button class="${k === filter ? 'on' : ''}" data-act="recipeFilter" data-k="${k}">${l}</button>`).join('')}</div>
  <p class="muted small">Sortiert nach Protein pro Kalorie · Werte pro Portion</p>
  <div class="panel flush rows" id="recipe-list">${recipeRows()}</div>

  <a class="quiet-link" href="#/ernaehrung/rechner">Tagesrechner: prüfen, ob ein Tag zu deinen Zielen passt ${icon('arrowRight')}</a>`;
}, 'ernaehrung');

// --- Rezept-Detail -----------------------------------------------------------------

defineRoute(/^#\/ernaehrung\/rezept\/([\w-]+)$/, (id) => {
  const r = recipe(id);
  if (!r) return `${pageHead('Rezept', { back: '#/ernaehrung' })}${empty('Nicht gefunden', 'Dieses Rezept gibt es nicht mehr.')}`;
  const entry = weekList(ws).find((e) => e.r === id);
  const n = detailPortions?.id === id ? detailPortions.n : entry?.n ?? (r.prep ? 4 : servings(r));
  detailPortions = { id, n };
  const per = recipeMacros(r);
  const k = n / servings(r);
  return `
  ${pageHead(r.name, { back: '#/ernaehrung', sub: [CATS[r.cat], r.min ? `${r.min} Min.` : '', r.prep ? 'Mealprep' : ''].filter(Boolean).join(' · ') })}
  <section class="panel">
    ${label('Pro Portion')}
    ${macroSplit(per.p, per.c, per.f)}
    <div class="cells cells4">
      <div><p class="label">kcal</p><p class="val">${num(per.kcal)}</p></div>
      <div class="dot-p"><p class="label">Prot.</p><p class="val">${num(per.p)} g</p></div>
      <div class="dot-c"><p class="label">KH</p><p class="val">${num(per.c)} g</p></div>
      <div class="dot-f"><p class="label">Fett</p><p class="val">${num(per.f)} g</p></div>
    </div>
  </section>
  <section class="panel">
    <div class="label-row"><p class="label">Zutaten</p>
      ${stepper(n, { dec: { act: 'detailPortion', attrs: 'data-d="-1"' }, inc: { act: 'detailPortion', attrs: 'data-d="1"' }, valueHtml: `${n} Port.`, size: 'sm' })}</div>
    <ul class="ingredients">${r.items.map(([fid, g]) => `<li><span class="mono amt">${formatAmount(fid, g * k)}</span><span>${esc(food(fid)?.name ?? 'Unbekannt')}</span></li>`).join('')}</ul>
    ${r.extra ? `<p class="muted small">Außerdem: ${esc(r.extra)}</p>` : ''}
  </section>
  ${r.steps?.length ? `<section class="panel">${label('Zubereitung')}<ol class="steps">${r.steps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol></section>` : ''}
  <button class="btn primary block" data-act="addToWeek" data-id="${id}">${entry ? `In der Woche: ${entry.n} → ${n} Portionen` : `Zur Woche hinzufügen · ${n} Portionen`}</button>
  ${entry ? `<button class="btn block mt" data-act="removeFromWeek" data-id="${id}">Aus der Woche entfernen</button>` : ''}
  ${isOwn(r) ? `<div class="row gap mt"><a class="btn grow" href="#/ernaehrung/bearbeiten/${id}">Bearbeiten</a><button class="btn grow danger" data-act="deleteRecipe" data-id="${id}">Löschen</button></div>` : ''}`;
}, 'ernaehrung');

// --- Rezept-Editor ------------------------------------------------------------------

function newDraft(r) {
  return r
    ? { id: r.id, name: r.name, cat: r.cat, servings: servings(r), min: r.min || 0, prep: !!r.prep, items: r.items.map((x) => [...x]), extra: r.extra || '', steps: (r.steps || []).join('\n') }
    : { id: null, name: '', cat: 'haupt', servings: 4, min: 0, prep: true, items: [], extra: '', steps: '' };
}

function editorView(isNew) {
  const m = itemsMacros(draft.items);
  const per = { kcal: m.kcal / draft.servings, p: m.p / draft.servings, c: m.c / draft.servings, f: m.f / draft.servings };
  const t = targets();
  const hasKey = !!state.prefs.apiKey;
  return `
  ${pageHead(isNew ? 'Neues Rezept' : 'Rezept bearbeiten', { back: isNew ? '#/ernaehrung' : `#/ernaehrung/rezept/${draft.id}` })}
  ${isNew ? `<section class="panel">
    ${label('Importieren')}
    ${importing ? `<p class="loading">Rezept wird ausgewertet …</p>` : `
      <div class="row gap">
        <label class="btn grow ${hasKey ? '' : 'disabled'}">${icon('camera')} Screenshot<input type="file" accept="image/*" multiple hidden data-change="importImages" ${hasKey ? '' : 'disabled'}></label>
        <button class="btn grow" data-act="importTextSheet" ${hasKey ? '' : 'disabled'}>${icon('doc')} Text</button>
      </div>
      <p class="muted small mt">${hasKey ? 'Die KI liest Zutaten und Mengen aus und rechnet die Nährwerte aus. Prüfe das Ergebnis danach kurz.' : 'Für den KI-Import brauchst du einen API-Schlüssel – <a class="link" href="#/einstellungen">in den Einstellungen hinterlegen</a>. Manuell geht es auch ohne.'}</p>`}
    ${importError ? `<p class="error mt">${esc(importError)}</p>` : ''}
  </section>` : ''}

  <section class="panel stack">
    <label class="field"><span class="label">Name</span><input value="${esc(draft.name)}" data-change="draftField" data-f="name" placeholder="z. B. Chili mit Pute"></label>
    <div class="seg">${Object.entries(CATS).map(([k, l]) => `<button class="${draft.cat === k ? 'on' : ''}" data-act="draftCat" data-k="${k}">${l}</button>`).join('')}</div>
    <div class="cells cells3 tight">
      <div><p class="label">Portionen</p>${stepper(draft.servings, { dec: { act: 'draftServings', attrs: 'data-d="-1"' }, inc: { act: 'draftServings', attrs: 'data-d="1"' }, size: 'sm' })}</div>
      <label class="field"><span class="label">Minuten</span><input inputmode="numeric" value="${draft.min || ''}" data-change="draftField" data-f="min"></label>
      <button class="toggle ${draft.prep ? 'on' : ''}" data-act="draftPrep"><span class="label">Mealprep</span><span class="mono">${draft.prep ? 'JA' : 'NEIN'}</span></button>
    </div>
  </section>

  <section class="panel">
    ${label('Zutaten · ganzes Rezept')}
    <div class="rows">${draft.items.map(([fid, g], i) => {
      const f = food(fid);
      return `<div class="row-item ingredient">
        <button class="row-main" data-act="swapIngredient" data-i="${i}"><span class="row-title">${esc(f?.name ?? 'Unbekannt')}</span>
          <span class="row-sub">${f?.src === 'ai' ? 'Nährwerte geschätzt · ' : ''}<span class="mono">${num(((f?.kcal || 0) * g) / 100)} kcal</span></span></button>
        <label class="grams"><input inputmode="decimal" value="${num(g, 1)}" data-change="draftGrams" data-i="${i}" aria-label="Menge"><span>${f?.ml ? 'ml' : 'g'}</span></label>
        <button class="icon-btn small" data-act="draftRemove" data-i="${i}" aria-label="Entfernen">${icon('x')}</button>
      </div>`;
    }).join('') || '<p class="muted small">Noch keine Zutaten.</p>'}</div>
    <button class="btn block mt" data-act="pickFood" data-mode="draft">${icon('plus')} Zutat</button>
  </section>

  <section class="panel">
    ${label('Pro Portion')}
    <div class="cells cells4">
      <div><p class="label">kcal</p><p class="val">${num(per.kcal)}</p></div>
      <div><p class="label">Protein</p><p class="val">${num(per.p)} g</p></div>
      <div><p class="label">KH</p><p class="val">${num(per.c)} g</p></div>
      <div><p class="label">Fett</p><p class="val">${num(per.f)} g</p></div>
    </div>
    ${per.kcal ? `<p class="muted small mt">Entspricht ${Math.round((per.kcal / t.kcal) * 100)} % deines Tagesziels und ${Math.round((per.p / t.protein) * 100)} % deines Proteins.</p>` : ''}
  </section>

  <section class="panel stack">
    <label class="field"><span class="label">Außerdem (Gewürze usw.)</span><input value="${esc(draft.extra)}" data-change="draftField" data-f="extra"></label>
    <label class="field"><span class="label">Zubereitung · ein Schritt pro Zeile</span><textarea rows="6" data-change="draftField" data-f="steps">${esc(draft.steps)}</textarea></label>
  </section>
  <button class="btn primary block" data-act="saveRecipe">Speichern</button>`;
}

defineRoute(/^#\/ernaehrung\/neu$/, () => {
  if (!draft || draft.id) draft = newDraft(null);
  return editorView(true);
}, 'ernaehrung');

defineRoute(/^#\/ernaehrung\/bearbeiten\/([\w-]+)$/, (id) => {
  const r = recipe(id);
  if (!r || !isOwn(r)) return `${pageHead('Rezept', { back: '#/ernaehrung' })}${empty('Nicht bearbeitbar', 'Nur eigene Rezepte lassen sich bearbeiten.')}`;
  if (draft?.id !== id) draft = newDraft(r);
  return editorView(false);
}, 'ernaehrung');

function applyImport(res) {
  const items = res.ingredients.filter((i) => i.grams > 0).map((ing) => {
    if (FOODS[ing.food_id]) return [ing.food_id, ing.grams];
    const f = { id: `c-${uid()}`, name: ing.name, kcal: ing.kcal_100g, p: ing.protein_100g, c: ing.carbs_100g, f: ing.fat_100g, src: 'ai' };
    state.customFoods.push(f);
    return [f.id, ing.grams];
  });
  draft = {
    id: null, name: res.name, cat: res.category, servings: Math.max(1, res.servings || 1), min: res.minutes || 0,
    prep: res.mealprep, items, extra: res.extra || '', steps: res.steps.join('\n'),
  };
}

async function runImport(input) {
  importing = true;
  importError = '';
  render();
  try {
    applyImport(await importRecipe(input));
    save();
    toast('Importiert – bitte kurz prüfen');
  } catch (e) {
    importError = e instanceof ImportError ? e.message : 'Import fehlgeschlagen.';
    if (!(e instanceof ImportError)) console.error(e);
  } finally {
    importing = false;
    render();
  }
}

// --- Lebensmittel-Auswahl (Editor & Tagesrechner) ----------------------------------------

function pickerList() {
  const local = searchFoods(picker.q);
  const offHtml = picker.off === 'loading' ? '<p class="loading">Suche in Open Food Facts …</p>'
    : picker.off === 'error' ? '<p class="error">Open Food Facts ist nicht erreichbar.</p>'
    : Array.isArray(picker.off) ? (picker.off.length ? picker.off.map((p, i) => `
        <button class="row-item" data-act="chooseOff" data-i="${i}"><span class="row-main"><span class="row-title">${esc(p.name)}</span>
        <span class="row-sub mono">${p.kcal} kcal · ${p.p} P · ${p.c} KH · ${p.f} F / 100 g</span></span>${icon('plus')}</button>`).join('')
      : '<p class="muted small">Keine Treffer in Open Food Facts.</p>') : '';
  return `${local.map((f) => `
      <button class="row-item" data-act="chooseFood" data-id="${f.id}"><span class="row-main"><span class="row-title">${esc(f.name)}</span>
      <span class="row-sub mono">${f.kcal} kcal · ${f.p} g P / 100 ${f.ml ? 'ml' : 'g'}</span></span>${icon('plus')}</button>`).join('')}
    ${picker.q.trim().length > 1 ? `<div class="label-row section"><p class="label">Open Food Facts</p>${Array.isArray(picker.off) || picker.off === 'loading' ? '' : '<button class="link" data-act="searchOff">Suchen</button>'}</div>${offHtml}` : ''}
    <button class="btn block mt" data-act="manualFoodSheet">Eigenes Lebensmittel anlegen</button>`;
}

function pickerSheet() {
  return `${sheetHead(picker.mode === 'calc' ? 'Lebensmittel' : 'Zutat wählen')}
    <label class="search">${icon('search')}<input type="search" placeholder="z. B. Skyr, Hähnchen, Marke …" value="${esc(picker.q)}" data-input="foodSearch" autocomplete="off"></label>
    <div class="rows" id="picker-list">${pickerList()}</div>`;
}

function chooseFood(id) {
  const f = food(id);
  const g = f.unit ? f.unit.g : 100;
  if (picker.mode === 'calc') {
    (state.dayLog[calcDate] ??= []).push({ id: uid(), kind: 'food', ref: id, amount: g });
  } else if (picker.replace != null) {
    draft.items[picker.replace][0] = id;
  } else {
    draft.items.push([id, g]);
  }
  closeSheet();
  update();
}

// --- Einkaufsliste -------------------------------------------------------------------

defineRoute(/^#\/ernaehrung\/einkauf$/, () => {
  const groups = shoppingList(ws);
  const checked = state.shopChecked[ws] || [];
  const extra = state.shopExtra[ws] || [];
  return `
  ${pageHead('Einkaufsliste', { back: '#/ernaehrung', sub: weekLabel(ws) })}
  ${groups.length || extra.length ? '' : empty('Liste ist leer', 'Wähle unter Ernährung Rezepte für die Woche aus.')}
  ${groups.map((g) => `${label(g.cat)}<div class="panel flush rows">${g.items.map((it) => {
    const on = checked.includes(it.id);
    return `<button class="row-item check-row ${on ? 'done' : ''}" data-act="toggleShop" data-id="${it.id}">
      <span class="box ${on ? 'on' : ''}">${on ? icon('check') : ''}</span><span class="row-main"><span class="row-title">${esc(it.name)}</span></span><span class="mono muted">${it.amount}</span></button>`;
  }).join('')}</div>`).join('')}
  ${label('Sonstiges')}
  <div class="panel flush rows">${extra.map((it) => {
    const on = checked.includes(it.id);
    return `<div class="row-item check-row ${on ? 'done' : ''}"><button class="box ${on ? 'on' : ''}" data-act="toggleShop" data-id="${it.id}">${on ? icon('check') : ''}</button>
      <span class="row-main"><span class="row-title">${esc(it.text)}</span></span><button class="icon-btn small" data-act="removeShopExtra" data-id="${it.id}">${icon('x')}</button></div>`;
  }).join('')}
    <form class="row-item" data-submit="addShopExtra"><input name="text" placeholder="Weiteres hinzufügen" autocomplete="off"><button class="icon-btn small" type="submit">${icon('plus')}</button></form>
  </div>
  ${checked.length ? '<button class="btn block mt" data-act="resetShop">Haken zurücksetzen</button>' : ''}`;
}, 'ernaehrung');

// --- Tagesrechner ---------------------------------------------------------------------

defineRoute(/^#\/ernaehrung\/rechner$/, () => {
  const t = targets();
  const entries = dayEntries(calcDate);
  const v = dayVerdict(entries, t);
  return `
  ${pageHead('Tagesrechner', { back: '#/ernaehrung' })}
  <div class="label-row">
    <button class="icon-btn small" data-act="calcDay" data-n="-1">${icon('left')}</button>
    <p class="label">${relDay(calcDate) === fmtLong(calcDate) ? fmtLong(calcDate) : `${relDay(calcDate)} · ${fmtDM(calcDate)}`}</p>
    <button class="icon-btn small" data-act="calcDay" data-n="1" ${calcDate >= isoDate() ? 'disabled' : ''}>${icon('right')}</button>
  </div>
  <section class="panel flush rows">${entries.map((e) => `
    <div class="row-item">
      <span class="row-main"><span class="row-title">${esc(e.name)}</span><span class="row-sub mono">${num(e.m.kcal)} kcal · ${num(e.m.p)} g P</span></span>
      <label class="grams"><input inputmode="decimal" value="${num(e.amount, 2)}" data-change="calcAmount" data-id="${e.id}"><span>${e.kind === 'recipe' ? 'Port.' : food(e.ref)?.ml ? 'ml' : 'g'}</span></label>
      <button class="icon-btn small" data-act="calcRemove" data-id="${e.id}">${icon('x')}</button>
    </div>`).join('') || '<p class="muted small pad">Trag ein, was du heute gegessen hast – grob reicht.</p>'}</section>
  <div class="row gap"><button class="btn grow" data-act="pickFood" data-mode="calc">${icon('plus')} Lebensmittel</button><button class="btn grow" data-act="pickRecipe">${icon('plus')} Rezept</button></div>
  ${entries.length ? `<section class="panel mt ${v.ok ? 'ok' : 'warn'}">
    ${label('Ergebnis')}
    <p class="verdict">${v.ok ? 'Passt zu deinen Zielen.' : 'Nicht ganz im Ziel.'}</p>
    <ul class="notes">${v.notes.map((n) => `<li class="${n.ok ? 'ok' : 'warn'}">${n.text}</li>`).join('')}</ul>
    <div class="stack mt">
      ${macroRow('Kalorien', v.sum.kcal, t.kcal, 'kcal', 'k')}
      ${macroRow('Protein', v.sum.p, t.protein, 'g', 'p')}
      ${macroRow('Kohlenhydrate', v.sum.c, t.carbs, 'g', 'c')}
      ${macroRow('Fett', v.sum.f, t.fat, 'g', 'f')}
    </div>
  </section>` : ''}`;
}, 'ernaehrung');

function recipePickerSheet() {
  return `${sheetHead('Rezept')}
    <div class="rows">${allRecipes().map((r) => `<button class="row-item" data-act="chooseCalcRecipe" data-id="${r.id}">
      <span class="row-main"><span class="row-title">${esc(r.name)}</span><span class="row-sub">${kcalP(recipeMacros(r))}</span></span>${icon('plus')}</button>`).join('')}</div>`;
}

// --- Aktionen ---------------------------------------------------------------------------

function setWeekPortions(id, n) {
  const list = (state.week[ws] ??= []);
  const e = list.find((x) => x.r === id);
  if (n <= 0) state.week[ws] = list.filter((x) => x.r !== id);
  else if (e) e.n = n;
  else list.push({ r: id, n });
}

defineActions({
  weekShift(el) {
    ws = addDays(ws, Number(el.dataset.n));
    update();
  },
  recipeSearch(el) {
    query = el.value;
    document.getElementById('recipe-list').innerHTML = recipeRows();
  },
  recipeFilter(el) {
    filter = el.dataset.k;
    update();
  },
  quickAdd(el) {
    const r = recipe(el.dataset.id);
    const inWeek = weekList(ws).some((e) => e.r === r.id);
    setWeekPortions(r.id, inWeek ? 0 : r.prep ? 4 : 1);
    update();
    toast(inWeek ? 'Aus der Woche entfernt' : `${r.prep ? 4 : 1} ${r.prep ? 'Portionen' : 'Portion'} zur Woche hinzugefügt`);
  },
  weekPortion(el) {
    const e = weekList(ws).find((x) => x.r === el.dataset.id);
    setWeekPortions(el.dataset.id, e.n + Number(el.dataset.d));
    update();
  },
  detailPortion(el) {
    detailPortions.n = Math.max(1, detailPortions.n + Number(el.dataset.d));
    update();
  },
  addToWeek(el) {
    setWeekPortions(el.dataset.id, detailPortions.n);
    update();
    toast('Woche aktualisiert');
  },
  removeFromWeek(el) {
    setWeekPortions(el.dataset.id, 0);
    update();
  },
  deleteRecipe(el) {
    if (!confirm('Rezept löschen?')) return;
    state.recipes = state.recipes.filter((r) => r.id !== el.dataset.id);
    for (const k of Object.keys(state.week)) state.week[k] = state.week[k].filter((e) => e.r !== el.dataset.id);
    save();
    go('#/ernaehrung');
  },

  draftField(el) {
    const f = el.dataset.f;
    draft[f] = f === 'min' ? parseInt(el.value, 10) || 0 : el.value;
    save();
    if (f === 'min') update();
  },
  draftCat(el) {
    draft.cat = el.dataset.k;
    update();
  },
  draftServings(el) {
    draft.servings = Math.max(1, draft.servings + Number(el.dataset.d));
    update();
  },
  draftPrep() {
    draft.prep = !draft.prep;
    update();
  },
  draftGrams(el) {
    const v = parseNum(el.value);
    if (v != null && v >= 0) draft.items[el.dataset.i][1] = v;
    update();
  },
  draftRemove(el) {
    draft.items.splice(Number(el.dataset.i), 1);
    update();
  },
  swapIngredient(el) {
    picker = { mode: 'draft', q: food(draft.items[el.dataset.i][0])?.name ?? '', off: null, replace: Number(el.dataset.i) };
    openSheet(pickerSheet);
  },
  saveRecipe() {
    if (!draft.name.trim()) return toast('Bitte einen Namen eingeben');
    if (!draft.items.length) return toast('Bitte mindestens eine Zutat eintragen');
    const r = {
      id: draft.id ?? `r-${uid()}`, name: draft.name.trim(), cat: draft.cat, servings: draft.servings, min: draft.min,
      prep: draft.prep, items: draft.items, extra: draft.extra.trim(), steps: draft.steps.split('\n').map((s) => s.trim()).filter(Boolean),
    };
    const i = state.recipes.findIndex((x) => x.id === r.id);
    if (i >= 0) state.recipes[i] = r;
    else state.recipes.unshift(r);
    draft = null;
    detailPortions = null;
    save();
    go(`#/ernaehrung/rezept/${r.id}`);
    toast('Rezept gespeichert');
  },
  async importImages(el) {
    const files = [...(el.files ?? [])].slice(0, 4);
    el.value = '';
    if (!files.length) return;
    try {
      const images = await Promise.all(files.map((f) => prepareImage(f, 1568).then((x) => x.base64)));
      runImport({ images });
    } catch {
      importError = 'Das Bild konnte nicht gelesen werden.';
      render();
    }
  },
  importTextSheet() {
    openSheet(() => `${sheetHead('Rezepttext einfügen')}
      <form data-submit="importText" class="stack">
        <textarea name="text" rows="10" placeholder="Zutaten und Zubereitung hier einfügen …"></textarea>
        <button class="btn primary block" type="submit">Auswerten</button>
      </form>`);
  },
  importText(form) {
    const text = new FormData(form).get('text').trim();
    if (!text) return;
    closeSheet();
    runImport({ text });
  },

  pickFood(el) {
    picker = { mode: el.dataset.mode, q: '', off: null, replace: null };
    openSheet(pickerSheet);
  },
  foodSearch(el) {
    picker.q = el.value;
    picker.off = null;
    document.getElementById('picker-list').innerHTML = pickerList();
  },
  async searchOff() {
    picker.off = 'loading';
    document.getElementById('picker-list').innerHTML = pickerList();
    try {
      picker.off = await searchOff(picker.q);
    } catch {
      picker.off = 'error';
    }
    const list = document.getElementById('picker-list');
    if (list) list.innerHTML = pickerList();
  },
  chooseFood(el) {
    chooseFood(el.dataset.id);
  },
  chooseOff(el) {
    const p = picker.off[Number(el.dataset.i)];
    let f = state.customFoods.find((x) => x.code === p.code);
    if (!f) {
      f = { id: `c-${uid()}`, code: p.code, name: p.name, kcal: p.kcal, p: p.p, c: p.c, f: p.f, src: 'off' };
      state.customFoods.push(f);
    }
    chooseFood(f.id);
  },
  manualFoodSheet() {
    const prev = picker;
    openSheet(() => `${sheetHead('Eigenes Lebensmittel', 'Werte pro 100 g von der Verpackung')}
      <form data-submit="saveManualFood" class="stack">
        <label class="field"><span class="label">Name</span><input name="name" value="${esc(prev.q)}" required></label>
        <div class="cells cells4 tight">
          ${['kcal', 'Protein', 'KH', 'Fett'].map((l, i) => `<label class="field"><span class="label">${l}</span><input name="${['kcal', 'p', 'c', 'f'][i]}" inputmode="decimal" required></label>`).join('')}
        </div>
        <button class="btn primary block" type="submit">Anlegen</button>
      </form>`);
  },
  saveManualFood(form) {
    const fd = new FormData(form);
    const vals = ['kcal', 'p', 'c', 'f'].map((k) => parseNum(fd.get(k)));
    if (vals.some((v) => v == null || v < 0)) return toast('Bitte alle Werte als Zahl eintragen');
    const f = { id: `c-${uid()}`, name: fd.get('name').trim(), kcal: vals[0], p: vals[1], c: vals[2], f: vals[3], src: 'manuell' };
    state.customFoods.push(f);
    chooseFood(f.id);
  },

  toggleShop(el) {
    const list = state.shopChecked[ws] || [];
    const id = el.dataset.id;
    state.shopChecked[ws] = list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
    update();
  },
  addShopExtra(form) {
    const text = new FormData(form).get('text').trim();
    if (!text) return;
    (state.shopExtra[ws] ??= []).push({ id: `x-${uid()}`, text });
    update();
  },
  removeShopExtra(el) {
    state.shopExtra[ws] = (state.shopExtra[ws] || []).filter((x) => x.id !== el.dataset.id);
    update();
  },
  resetShop() {
    state.shopChecked[ws] = [];
    update();
  },

  calcDay(el) {
    calcDate = addDays(calcDate, Number(el.dataset.n));
    update();
  },
  calcAmount(el) {
    const v = parseNum(el.value);
    const e = (state.dayLog[calcDate] || []).find((x) => x.id === el.dataset.id);
    if (e && v != null && v > 0) e.amount = v;
    update();
  },
  calcRemove(el) {
    state.dayLog[calcDate] = (state.dayLog[calcDate] || []).filter((x) => x.id !== el.dataset.id);
    update();
  },
  pickRecipe() {
    openSheet(recipePickerSheet);
  },
  chooseCalcRecipe(el) {
    (state.dayLog[calcDate] ??= []).push({ id: uid(), kind: 'recipe', ref: el.dataset.id, amount: 1 });
    closeSheet();
    update();
  },
});
