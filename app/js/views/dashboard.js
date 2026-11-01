import { defineRoute } from '../core.js';
import { state } from '../store.js';
import { esc, num, isoDate, weekStart, fmtLong } from '../util.js';
import { targets, weekList, recipe, shoppingList } from '../nutrition.js';
import { weekDays, muscleBalance } from '../training.js';
import { weeklySeries, weightTrend, checkThisWeek } from '../progress.js';
import { icon } from '../icons.js';
import { label, sparkline, badge, ring } from '../ui.js';
import { weekScroller, todayAction, insightList } from './training.js';
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

  <section class="panel cal">
    ${weekScroller({ interactive: false })}
  </section>

  <div class="stat-grid">
    <a class="panel stat" href="#/training">
      <div class="stat-head">${badge('dumbbell', 'red')}<p class="label">Trainings</p></div>
      <p class="val-lg">${done}<span class="muted">/${planned || '–'}</span></p>
      <p class="muted small">diese Woche</p>
    </a>
    <a class="panel stat" href="#/training">
      <div class="stat-head">${badge('target', 'green')}<p class="label">Balance</p></div>
      <div class="row gap">${bal.score != null ? ring(bal.score / 100, '', { size: 34, stroke: 5, color: 'var(--green)' }) : ''}<p class="val-lg">${bal.score ?? '–'}<span class="muted">${bal.score != null ? '%' : ''}</span></p></div>
      <p class="muted small">Muskelgruppen</p>
    </a>
    <a class="panel stat" href="#/progress">
      <div class="stat-head">${badge('scale', 'blue')}<p class="label">Gewicht</p></div>
      <p class="val-lg">${last ? num(last.y, 1) : '–'}<span class="muted">${last ? 'kg' : ''}</span></p>
      ${series.length > 1 ? sparkline(series.map((s) => s.y), { w: 120, h: 22 }) : ''}
      <p class="muted small mono">${rate != null ? fmtRate(rate) : 'Trend folgt'}</p>
    </a>
    <a class="panel stat" href="#/ernaehrung">
      <div class="stat-head">${badge('flame', 'orange')}<p class="label">Tagesziel</p></div>
      <p class="val-lg">${num(t.kcal)}<span class="muted">kcal</span></p>
      <p class="muted small mono">${num(t.protein)} g Protein</p>
    </a>
  </div>

  ${checkThisWeek() ? '' : checkPanel()}
  ${insightList(3, 'hinweise-dashboard')}

  <a class="panel block-link" href="#/ernaehrung">
    ${label(`<span class="stat-head" style="margin:0">${badge('bowl', 'orange')}<span>Essen diese Woche</span></span>`, `<span class="label">${open > 0 ? `${open} auf der Einkaufsliste` : ''}</span>`)}
    ${meals.length
      ? `<ul class="plain">${meals.map((e) => `<li><span>${esc(recipe(e.r).name)}</span><span class="mono muted">${e.n}×</span></li>`).join('')}</ul>`
      : '<p class="muted small">Noch keine Rezepte für diese Woche gewählt.</p>'}
  </a>`;
}, 'dashboard');
