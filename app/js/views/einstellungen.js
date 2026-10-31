import { defineRoute, defineActions, update, go } from '../core.js';
import { state, save, replaceState, resetState, exportData } from '../store.js';
import { isoDate, num, parseNum, fmtRest } from '../util.js';
import { ACTIVITY, GOALS, DIETS, calcTargets, currentWeight } from '../nutrition.js';
import { toast, pageHead, label } from '../ui.js';

const RESTS = [60, 90, 120, 150, 180];

const opt = (name, value, current, title, hint = '') => `
  <label class="opt">
    <input type="radio" name="${name}" value="${value}" ${String(current) === String(value) ? 'checked' : ''}>
    <span><b>${title}</b>${hint ? `<small>${hint}</small>` : ''}</span>
  </label>`;

const seg = (name, entries, current) =>
  `<div class="seg">${entries.map(([v, l]) => `<label><input type="radio" name="${name}" value="${v}" ${String(current) === String(v) ? 'checked' : ''}><span>${l}</span></label>`).join('')}</div>`;

function profileForm(submitLabel, onboarding) {
  const p = state.profile ?? { sex: 'm', birthYear: 1990, height: 180, activity: 1.55, goal: 'aufbau', mealsPerDay: 4 };
  const w = currentWeight();
  return `<form data-submit="saveProfile" data-onboarding="${onboarding ? 1 : ''}" class="stack">
    <section class="panel stack">
      ${label('Über dich')}
      ${seg('sex', [['m', 'Männlich'], ['w', 'Weiblich']], p.sex)}
      <div class="cells cells3 tight">
        <label class="field"><span class="label">Jahrgang</span><input name="birthYear" inputmode="numeric" value="${p.birthYear}" required></label>
        <label class="field"><span class="label">Größe cm</span><input name="height" inputmode="numeric" value="${p.height}" required></label>
        <label class="field"><span class="label">Gewicht kg</span><input name="weight" inputmode="decimal" value="${w ? num(w, 1) : ''}" required></label>
      </div>
    </section>
    <section class="panel stack">
      ${label('Alltag')}
      <div class="opts">${ACTIVITY.map((a) => opt('activity', a.v, p.activity, a.label, a.hint)).join('')}</div>
    </section>
    <section class="panel stack">
      ${label('Ziel')}
      <div class="opts">${Object.entries(GOALS).map(([k, g]) => opt('goal', k, p.goal, g.label)).join('')}</div>
    </section>
    <section class="panel stack">
      ${label('Ernährung')}
      ${seg('diet', Object.entries(DIETS), state.prefs.diet)}
      <p class="label">Mahlzeiten pro Tag</p>
      ${seg('meals', [[3, '3'], [4, '4'], [5, '5']], p.mealsPerDay || 4)}
    </section>
    <button class="btn primary block" type="submit">${submitLabel}</button>
  </form>`;
}

defineRoute(/^#\/start$/, () => `
  <header class="head"><div class="head-title"><p class="label">Einrichten</p><h1>Fitness</h1></div></header>
  <p class="lead">Aus diesen Angaben berechnet die App deinen Kalorien- und Nährstoffbedarf. Alles bleibt auf deinem Gerät.</p>
  ${profileForm('Los geht’s', true)}
`);

defineRoute(/^#\/einstellungen$/, () => {
  const t = calcTargets(state.profile, currentWeight() ?? 75);
  const adj = state.profile.kcalAdjust || 0;
  return `
  ${pageHead('Einstellungen', { back: '#/dashboard' })}
  <section class="panel">
    ${label('Bedarf')}
    <div class="kv"><span>Grundumsatz</span><b class="mono">${num(t.bmr)} kcal</b></div>
    <div class="kv"><span>Gesamtumsatz</span><b class="mono">${num(t.tdee)} kcal</b></div>
    <div class="kv"><span>Manuelle Anpassung</span><b class="mono">${adj > 0 ? '+' : ''}${num(adj)} kcal</b></div>
    <div class="kv"><span>Tagesziel</span><b class="mono accent">${num(t.kcal)} kcal</b></div>
    <div class="row gap mt">
      <button class="btn small grow" data-act="adjustKcal" data-d="-100">−100</button>
      <button class="btn small grow" data-act="adjustKcal" data-d="100">+100</button>
      ${adj ? '<button class="btn small grow" data-act="adjustKcal" data-d="0">Zurücksetzen</button>' : ''}
    </div>
  </section>

  ${profileForm('Profil speichern', false)}

  <section class="panel stack mt">
    ${label('Training')}
    <p class="label">Pause zwischen Sätzen</p>
    <div class="seg">${RESTS.map((s) => `<button class="${(state.prefs.rest || 120) === s ? 'on' : ''}" data-act="setRest" data-s="${s}">${fmtRest(s)}</button>`).join('')}</div>
  </section>

  <section class="panel stack">
    ${label('KI-Import für Rezepte')}
    <p class="muted small">Für das Auslesen von Screenshots braucht die App einen API-Schlüssel von Anthropic (console.anthropic.com). Er bleibt auf diesem Gerät, wird nicht exportiert und nur an api.anthropic.com gesendet. Ein Import kostet wenige Cent.</p>
    <form data-submit="saveApiKey" class="row gap">
      <input name="key" type="password" autocomplete="off" placeholder="${state.prefs.apiKey ? '•••••••• gespeichert' : 'sk-ant-…'}">
      <button class="btn" type="submit">Speichern</button>
    </form>
    ${state.prefs.apiKey ? '<button class="link" data-act="clearApiKey">Schlüssel entfernen</button>' : ''}
  </section>

  <section class="panel stack">
    ${label('Daten')}
    <p class="muted small">Alles liegt nur auf diesem Gerät. Exportiere regelmäßig eine Sicherung. Fotos sind nicht enthalten.</p>
    <button class="btn block" data-act="exportData">Sicherung exportieren</button>
    <label class="btn block">Sicherung importieren<input type="file" accept="application/json,.json" hidden data-change="importData"></label>
    <button class="btn block danger" data-act="resetAll">Alle Daten löschen</button>
  </section>
  <p class="muted small center mono">FITNESS · 2.0</p>`;
}, 'dashboard');

defineActions({
  saveProfile(form) {
    const fd = new FormData(form);
    const birthYear = parseInt(fd.get('birthYear'), 10);
    const height = parseNum(fd.get('height'));
    const weight = parseNum(fd.get('weight'));
    const year = new Date().getFullYear();
    if (!(birthYear > year - 100 && birthYear < year - 12) || !(height > 120 && height < 230) || !(weight > 30 && weight < 300)) {
      return toast('Bitte Jahrgang, Größe und Gewicht prüfen');
    }
    state.profile = {
      ...state.profile,
      sex: fd.get('sex'), birthYear, height,
      activity: parseFloat(fd.get('activity')), goal: fd.get('goal'),
      mealsPerDay: parseInt(fd.get('meals'), 10),
      kcalAdjust: state.profile?.kcalAdjust || 0,
    };
    state.prefs.diet = fd.get('diet');
    if (weight !== currentWeight()) {
      const today = isoDate();
      const entry = state.bodyLog.find((e) => e.date === today);
      if (entry) entry.weight = weight;
      else state.bodyLog.push({ date: today, weight });
    }
    save();
    if (form.dataset.onboarding) return go('#/dashboard');
    update();
    toast('Gespeichert');
  },
  adjustKcal(el) {
    const d = Number(el.dataset.d);
    state.profile.kcalAdjust = d === 0 ? 0 : (state.profile.kcalAdjust || 0) + d;
    update();
  },
  setRest(el) {
    state.prefs.rest = Number(el.dataset.s);
    update();
  },
  saveApiKey(form) {
    const key = new FormData(form).get('key').trim();
    if (!key.startsWith('sk-ant-')) return toast('Das sieht nicht nach einem Anthropic-Schlüssel aus');
    state.prefs.apiKey = key;
    update();
    toast('Schlüssel gespeichert');
  },
  clearApiKey() {
    state.prefs.apiKey = '';
    update();
  },
  async exportData() {
    const json = JSON.stringify(exportData(), null, 2);
    const name = `fitness-sicherung-${isoDate()}.json`;
    const file = new File([json], name, { type: 'application/json' });
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: 'Fitness-Sicherung' });
        return;
      } catch (e) {
        if (e.name === 'AbortError') return;
      }
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(file);
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  },
  async importData(input) {
    const file = input.files?.[0];
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (!data || !data.version) throw new Error('Unbekanntes Format');
      if (!confirm('Sicherung importieren? Die aktuellen Daten werden ersetzt.')) return;
      replaceState(data);
      toast('Sicherung importiert');
      go('#/dashboard');
    } catch {
      toast('Datei konnte nicht gelesen werden');
    } finally {
      input.value = '';
    }
  },
  resetAll() {
    if (!confirm('Wirklich alle Daten inklusive Fotos löschen? Das kann nicht rückgängig gemacht werden.')) return;
    resetState();
    indexedDB.deleteDatabase('fitness-fotos');
    go('#/start');
  },
});

