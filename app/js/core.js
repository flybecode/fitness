// Mini-Router und Event-Delegation. Views registrieren Routen und Aktionen,
// Elemente lösen Aktionen über data-act (Klick), data-change, data-input und data-submit aus.

import { state, save } from './store.js';
import { $ } from './util.js';
import { refreshSheet, closeSheet } from './ui.js';

const routes = [];
const actions = { closeSheet: () => closeSheet() };
let lastHash = null;

export const defineRoute = (re, fn, tab) => routes.push({ re, fn, tab });
export const defineActions = (obj) => Object.assign(actions, obj);

export function go(hash) {
  if (location.hash === hash) render();
  else location.hash = hash;
}

export function update() {
  save();
  render();
  refreshSheet();
}

export function render() {
  const hash = location.hash || '#/dashboard';
  if (!state.profile && hash !== '#/start') return location.replace('#/start');
  const route = routes.find((r) => r.re.test(hash));
  if (!route) return location.replace('#/dashboard');

  $('#view').innerHTML = route.fn(...hash.match(route.re).slice(1).map(decodeURIComponent));
  const tabbar = $('#tabbar');
  tabbar.hidden = hash === '#/start';
  tabbar.querySelectorAll('a').forEach((a) => a.classList.toggle('active', a.dataset.tab === route.tab));

  if (hash !== lastHash) {
    window.scrollTo(0, 0);
    lastHash = hash;
  }
}

function dispatch(attr, e) {
  const el = e.target.closest(`[data-${attr}]`);
  if (!el) return;
  const fn = actions[el.dataset[attr]];
  if (!fn) return console.warn('Unbekannte Aktion', el.dataset[attr]);
  if (attr === 'act' || attr === 'submit') e.preventDefault();
  fn(el, e);
}

export function start() {
  document.addEventListener('click', (e) => dispatch('act', e));
  document.addEventListener('change', (e) => dispatch('change', e));
  document.addEventListener('input', (e) => dispatch('input', e));
  document.addEventListener('submit', (e) => dispatch('submit', e));
  window.addEventListener('hashchange', () => {
    closeSheet();
    render();
  });
  render();
}
