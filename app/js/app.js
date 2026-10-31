import { start } from './core.js';
import { state } from './store.js';
import { startTicker } from './timer.js';
import './views/ernaehrung.js';
import './views/dashboard.js';
import './views/training.js';
import './views/progress.js';
import './views/einstellungen.js';

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
