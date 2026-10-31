# Fitness

Persönliche Fitness-App als Web-App (PWA) fürs iPhone. Später soll eine native SwiftUI-App daraus werden.

## Funktionen

- **Ziele**: Kalorien- und Makrobedarf (Protein, Kohlenhydrate, Fett) aus Profil und Ziel (Mifflin-St-Jeor × Aktivität).
- **Mahlzeitenplan**: Plant die Woche automatisch aus ~30 Rezepten und passt die Portionen an deinen Bedarf an. Gerichte tauschen, Portionen anpassen, Einkaufsliste.
- **Leichtes Tracking**: Auf „Heute“ abhaken, was gegessen wurde.
- **Training**: Pläne aus Vorlagen oder selbst gebaut, Sätze loggen, Pausentimer, automatische Progression (doppelte Progression), Verlauf und 1RM-Diagramm pro Übung.
- **Körper**: Gewicht und Maße mit Verlauf. Aus dem Gewichtstrend schlägt die App eine Kalorienanpassung vor.
- **Sicherung**: JSON-Export und -Import unter Einstellungen.

## Lokal starten

```bash
python3 werkzeuge/server.py
```

Dann <http://localhost:8790> öffnen.

## Aufbau

```
app/
  index.html, manifest.webmanifest, sw.js   PWA-Hülle und Offline-Cache
  css/app.css                               Design (hell/dunkel)
  js/core.js                                Router und Event-Delegation (data-act, data-change, …)
  js/store.js                               Datenhaltung (localStorage, Key fitness-app-v1)
  js/nutrition.js                           Bedarf, Mahlzeitenplanung, Einkaufsliste
  js/training.js                            Pläne, Progression, Auswertung
  js/timer.js                               Pausentimer
  js/data/                                  Lebensmittel, Rezepte, Übungen, Plan-Vorlagen
  js/views/                                 Heute, Ernährung, Training, Körper, Einstellungen
werkzeuge/
  server.py                                 Entwicklungsserver ohne Cache
  icons_erzeugen.py                         erzeugt die App-Icons
```

Ohne Build-Schritt und ohne Abhängigkeiten.

## Veröffentlichen

Jeder Push auf `main` veröffentlicht `app/` automatisch über GitHub Pages (`.github/workflows/pages.yml`).
Vorher `VERSION` in `app/sw.js` erhöhen, sonst zeigt das iPhone weiter die zwischengespeicherte alte Version.
Das iPhone holt das Update beim nächsten Öffnen der App. Manchmal ist dafür ein zweites Öffnen nötig.

## Neue Rezepte

In `app/js/data/recipes.js` ergänzen. Die Zutaten stehen in Gramm und verweisen auf `app/js/data/foods.js`. Die Nährwerte werden daraus berechnet.
