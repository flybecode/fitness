import { start, defineActions } from './core.js';
import { state, save } from './store.js';
import { startTicker } from './timer.js';
import './views/ernaehrung.js';
import './views/dashboard.js';
import './views/training.js';
import './views/progress.js';
import './views/einstellungen.js';

defineActions({
  // Kachel auf- und zuklappen, ohne die Seite neu zu zeichnen.
  toggleColl(el) {
    const panel = el.closest('.coll');
    const open = !panel.classList.contains('open');
    panel.classList.toggle('open', open);
    el.setAttribute('aria-expanded', open);
    state.prefs.collapsed = { ...state.prefs.collapsed, [el.dataset.k]: open };
    save();
  },
});

start();
startTicker();

// Offline-Fähigkeit. Lokal beim Entwickeln deaktiviert, damit Änderungen sofort sichtbar sind.
const isLocal = ['localhost', '127.0.0.1'].includes(location.hostname);
if ('serviceWorker' in navigator && !isLocal) {
  // Ist eine neue Version installiert, einmal neu laden, damit sie sofort sichtbar ist.
  const hadController = !!navigator.serviceWorker.controller;
  let reloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (hadController && !reloaded && !state.live) {
      reloaded = true;
      location.reload();
    }
  });
  navigator.serviceWorker.register('./sw.js').catch((e) => console.warn('Service Worker nicht registriert', e));
}
