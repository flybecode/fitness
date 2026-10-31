# Fitness

Persönliche Fitness-App als Web-App (PWA) fürs iPhone. Später soll eine native SwiftUI-App daraus werden.

## Funktionen

- **Ernährung**: Kalorien- und Makroziel aus Profil und Ziel, kurzer Leitfaden pro Mahlzeit, lockere Wochenauswahl mit Mealprep-Portionen, Einkaufsliste. Rezepte sind nach Protein pro Kalorie sortiert. Eigene Rezepte gibt es manuell oder per KI-Import aus Screenshot oder Text (Claude API, eigener Schlüssel nötig). Zutaten kommen aus der eingebauten Liste oder aus Open Food Facts. Dazu gibt es einen versteckten Tagesrechner.
- **Dashboard**: das Wichtigste aus allen Tabs auf einen Blick.
- **Training**: eigene Einheiten mit Sätzen, Wiederholungsbereich und Supersets. Ein fester Wochenrhythmus lässt sich im Kalender pro Woche verschieben oder streichen. Das Training läuft in Kacheln: Gewicht wählen (mit Progressionstipp), Satz fertig, Wiederholungen und Partials eintragen, Pausentimer, Finish. Dazu kommen Muskelbalance-Score, Hinweise (Bestwerte, Stagnation, Einbrüche, Lücken), Trainingsquote und Fortschritt pro Übung.
- **Progress**: wöchentlicher Gewichts-Check, optional Körperfett, Trend mit Kalorienvorschlag, Fortschrittsfotos mit Vergleich und Pausen (Urlaub, Reise, Krankheit), die aus Quote und Trend herausgerechnet werden.
- **Sicherung**: JSON-Export und -Import unter Einstellungen. API-Schlüssel und Fotos sind nicht enthalten.

## Lokal starten

```bash
python3 werkzeuge/server.py
```

Dann <http://localhost:8790> öffnen.

## Aufbau

```
app/
  index.html, manifest.webmanifest, sw.js   PWA-Hülle und Offline-Cache
  css/app.css                               Design (dunkel, iOS-Stil, Rot als Akzent)
  js/core.js                                Router und Event-Delegation (data-act, data-change, …)
  js/store.js                               Datenhaltung (localStorage, Key fitness-app-v1)
  js/nutrition.js                           Bedarf, Leitfaden, Rezepte, Woche, Einkaufsliste, Tagesrechner
  js/training.js                            Rhythmus, laufendes Training, Progression, Balance, Hinweise
  js/progress.js                            Gewichtstrend, Pausen
  js/ai.js, js/off.js, js/photos.js         KI-Import, Open Food Facts, Fotospeicher
  js/timer.js                               Pausentimer
  js/data/                                  Lebensmittel, Rezepte, Übungen
  js/views/                                 Ernährung, Dashboard, Training, Progress, Einstellungen
  vendor/                                   Anthropic-SDK (gebündelt, für offline)
werkzeuge/
  server.py                                 Entwicklungsserver ohne Cache
  icons_erzeugen.py                         erzeugt die App-Icons
```

Ohne Build-Schritt. Einzige Abhängigkeit ist das gebündelte Anthropic-SDK in `app/vendor/`, das nur beim KI-Import geladen wird.

## Veröffentlichen

Jeder Push auf `main` veröffentlicht `app/` automatisch über GitHub Pages (`.github/workflows/pages.yml`).
Online lädt die App jede Datei frisch vom Server. `VERSION` in `app/sw.js` trotzdem erhöhen, damit auch der Offline-Vorrat erneuert wird.
Das iPhone zeigt Änderungen beim nächsten Öffnen der App.

## Neue Rezepte

In `app/js/data/recipes.js` ergänzen. Die Zutaten stehen in Gramm und verweisen auf `app/js/data/foods.js`. Die Nährwerte werden daraus berechnet.
