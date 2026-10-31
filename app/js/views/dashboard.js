import { defineRoute } from '../core.js';
import { state } from '../store.js';
import { esc, num, isoDate, weekStart, fmtLong } from '../util.js';
import { targets, weekList, recipe, shoppingList } from '../nutrition.js';
import { weekDays, muscleBalance } from '../training.js';
import { weeklySeries, weightTrend, checkThisWeek } from '../progress.js';
import { icon } from '../icons.js';
import { label, sparkline } from '../ui.js';
import { weekStrip, todayAction, insightList } from './training.js';
import { checkPanel, fmtRate } from './progress.js';

defineRoute(/^#\/dashboard$/, () => {
  const today = isoDate();
  const ws = weekStart(today);
  const t = targets();
  const days = weekDays(ws);
  const planned = days.filter((d) => d.planned).length;
  const done = days.filter((d) => d.done.length).length;
  const bal = muscleBalance();
  const series = weeklySeries('weight').slice(-10);
  const last = series[series.length - 1];
  const rate = weightTrend();
  const meals = weekList(ws);
  const open = shoppingList(ws).reduce((s, g) => s + g.items.length, 0) - (state.shopChecked[ws]?.length || 0);

  return `
  <header class="head">
    <div class="head-title"><p class="label">${fmtLong(today)}</p><h1>Dashboard</h1></div>
    <a class="icon-btn" href="#/einstellungen" aria-label="Einstellungen">${icon('settings')}</a>
  </header>

  ${todayAction()}

  <a class="panel block-link" href="#/training">
    ${label('Diese Woche')}
    ${weekStrip(ws, { interactive: false })}
  </a>

  <div class="stat-grid">
    <a class="panel stat" href="#/training">
      <p class="label">Trainings</p>
      <p class="val-lg">${done}<span class="muted">/${planned || '–'}</span></p>
      <p class="muted small">diese Woche</p>
    </a>
    <a class="panel stat" href="#/training">
      <p class="label">Balance</p>
      <p class="val-lg">${bal.score ?? '–'}<span class="muted">${bal.score != null ? '%' : ''}</span></p>
      <p class="muted small">Muskelgruppen</p>
    </a>
    <a class="panel stat" href="#/progress">
      <p class="label">Gewicht</p>
      <p class="val-lg">${last ? num(last.y, 1) : '–'}<span class="muted">${last ? 'kg' : ''}</span></p>
      ${series.length > 1 ? sparkline(series.map((s) => s.y), { w: 120, h: 22 }) : ''}
      <p class="muted small mono">${rate != null ? fmtRate(rate) : 'Trend folgt'}</p>
    </a>
    <a class="panel stat" href="#/ernaehrung">
      <p class="label">Tagesziel</p>
      <p class="val-lg">${num(t.kcal)}<span class="muted">kcal</span></p>
      <p class="muted small mono">${num(t.protein)} g Protein</p>
    </a>
  </div>

  ${checkThisWeek() ? '' : checkPanel()}
  ${insightList(3)}

  <a class="panel block-link" href="#/ernaehrung">
    ${label('Essen diese Woche', `<span class="label">${open > 0 ? `${open} auf der Einkaufsliste` : ''}</span>`)}
    ${meals.length
      ? `<ul class="plain">${meals.map((e) => `<li><span>${esc(recipe(e.r).name)}</span><span class="mono muted">${e.n}×</span></li>`).join('')}</ul>`
      : '<p class="muted small">Noch keine Rezepte für diese Woche gewählt.</p>'}
  </a>`;
}, 'dashboard');
