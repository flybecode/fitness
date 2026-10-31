import { defineRoute } from '../core.js';
import { state } from '../store.js';
import { isoDate, num, fmtLong, relDay, esc, daysBetween } from '../util.js';
import { targets, dayRows, dayTotals } from '../nutrition.js';
import { icon } from '../icons.js';
import { ring, macroBar } from '../ui.js';
import { mealRow } from './ernaehrung.js';
import { workoutBanner, nextUnitCard } from './training.js';
import { lastWeighIn, weightTrend, fmtRate } from './koerper.js';

function greeting() {
  const h = new Date().getHours();
  if (h < 11) return 'Guten Morgen';
  if (h < 17) return 'Hallo';
  return 'Guten Abend';
}

defineRoute(/^#\/heute$/, () => {
  const today = isoDate();
  const t = targets();
  const rows = dayRows(today);
  const eaten = dayTotals(rows, true);
  const planned = dayTotals(rows);
  const hasPlan = rows.some((r) => r.recipe);
  const left = t.kcal - eaten.kcal;
  const trainedToday = state.workouts.find((w) => w.date === today);
  const weigh = lastWeighIn();
  const trend = weightTrend();

  return `
  <header class="top">
    <div><p class="eyebrow">${fmtLong(today)}</p><h1>${greeting()}</h1></div>
    <a class="icon-btn" href="#/einstellungen" aria-label="Einstellungen">${icon('settings')}</a>
  </header>

  <section class="card hero">
    <div class="ring-wrap">
      ${ring(eaten.kcal, t.kcal)}
      <div class="ring-label"><b>${num(Math.abs(left))}</b><span>${left >= 0 ? 'kcal übrig' : 'kcal drüber'}</span></div>
    </div>
    <div class="hero-macros">
      ${macroBar('Protein', eaten.p, t.protein, 'p')}
      ${macroBar('Kohlenhydrate', eaten.c, t.carbs, 'c')}
      ${macroBar('Fett', eaten.f, t.fat, 'f')}
    </div>
  </section>
  <p class="muted small center">Ziel ${num(t.kcal)} kcal${hasPlan ? ` · geplant ${num(planned.kcal)} kcal` : ''} · Hake ab, was du gegessen hast</p>

  <div class="row between"><h2 class="section">Mahlzeiten</h2><a class="small" href="#/ernaehrung">Wochenplan</a></div>
  ${hasPlan
    ? `<div class="card list">${rows.map((r) => mealRow(today, r, { check: true })).join('')}</div>`
    : `<div class="card empty"><p class="muted">Für heute ist noch nichts geplant.</p><a class="btn primary" href="#/ernaehrung">Woche planen</a></div>`}

  <h2 class="section">Training</h2>
  ${workoutBanner() || (trainedToday
    ? `<a class="card banner done" href="#/training/einheit/${trainedToday.id}">
        <div><p class="eyebrow">Heute erledigt</p><p class="li-title">${esc(trainedToday.name)}</p></div>${icon('check', 'accent big-ic')}</a>`
    : nextUnitCard() || `<div class="card empty"><p class="muted">Noch kein Trainingsplan angelegt.</p><a class="btn primary" href="#/training">Plan auswählen</a></div>`)}

  <h2 class="section">Körper</h2>
  <div class="card row between">
    <div>
      <p class="eyebrow">${weigh ? `Gewicht · ${relDay(weigh.date)}` : 'Gewicht'}</p>
      <p class="big">${weigh ? `${num(weigh.weight, 1)} <small>kg</small>` : '–'}</p>
      ${trend != null ? `<p class="muted small">Trend ${fmtRate(trend)}</p>` : ''}
    </div>
    <button class="btn ${weigh && daysBetween(weigh.date, today) === 0 ? '' : 'primary'}" data-act="bodyEntry">${icon('scale')} Eintragen</button>
  </div>`;
}, 'heute');
