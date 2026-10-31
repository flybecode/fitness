import { start } from './core.js';
import { startTicker } from './timer.js';
import './views/heute.js';
import './views/ernaehrung.js';
import './views/training.js';
import './views/koerper.js';
import './views/einstellungen.js';

start();
startTicker();

// Offline-Fähigkeit. Lokal beim Entwickeln deaktiviert, damit Änderungen sofort sichtbar sind.
const isLocal = ['localhost', '127.0.0.1'].includes(location.hostname);
if ('serviceWorker' in navigator && !isLocal) {
  navigator.serviceWorker.register('./sw.js').catch((e) => console.warn('Service Worker nicht registriert', e));
}
