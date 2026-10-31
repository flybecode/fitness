import { defineRoute, defineActions, update, go } from '../core.js';
import { state, replaceState, resetState, save } from '../store.js';
import { esc, isoDate, num, parseNum, weekStart } from '../util.js';
import { ACTIVITY, GOALS, DIETS, calcTargets, currentWeight, planWeekFrom } from '../nutrition.js';
import { RECIPE_BY_ID } from '../data/recipes.js';
import { icon } from '../icons.js';
import { toast } from '../ui.js';

const radio = (name, value, current, label, hint = '') => `
  <label class="opt">
    <input type="radio" name="${name}" value="${value}" ${String(current) === String(value) ? 'checked' : ''}>
    <span><b>${label}</b>${hint ? `<small>${hint}</small>` : ''}</span>
  </label>`;

function profileForm(submitLabel, onboarding) {
  const p = state.profile ?? { sex: 'm', birthYear: 1990, height: 180, activity: 1.55, goal: 'aufbau' };
  const w = currentWeight() ?? '';
  return `<form data-submit="saveProfile" data-onboarding="${onboarding ? 1 : ''}" class="stack">
    <div class="card stack">
      <h3>Über dich</h3>
      <div class="seg">${radio('sex', 'm', p.sex, 'Männlich')}${radio('sex', 'w', p.sex, 'Weiblich')}</div>
      <div class="grid3">
        <label class="field"><span>Geburtsjahr</span><input name="birthYear" inputmode="numeric" value="${p.birthYear}" required></label>
        <label class="field"><span>Größe (cm)</span><input name="height" inputmode="numeric" value="${p.height}" required></label>
        <label class="field"><span>Gewicht (kg)</span><input name="weight" inputmode="decimal" value="${w === '' ? '' : num(w, 1)}" required></label>
      </div>
    </div>
    <div class="card stack">
      <h3>Alltag & Bewegung</h3>
      <div class="opts">${ACTIVITY.map((a) => radio('activity', a.v, p.activity, a.label, a.hint)).join('')}</div>
    </div>
    <div class="card stack">
      <h3>Dein Ziel</h3>
      <div class="opts">${Object.entries(GOALS).map(([k, g]) => radio('goal', k, p.goal, g.label, g.hint)).join('')}</div>
    </div>
    <div class="card stack">
      <h3>Ernährung</h3>
      <div class="seg">${Object.entries(DIETS).map(([k, l]) => radio('diet', k, state.prefs.diet, l)).join('')}</div>
      <p class="muted small">Mahlzeiten pro Tag</p>
      <div class="seg">${[3, 4, 5].map((n) => radio('meals', n, state.prefs.mealsPerDay, String(n))).join('')}</div>
    </div>
    <button class="btn primary block" type="submit">${submitLabel}</button>
  </form>`;
}

defineRoute(/^#\/start$/, () => `
  <header class="top"><div><p class="eyebrow">Willkommen</p><h1>Lass uns starten</h1></div></header>
  <p class="lead">Aus deinen Angaben berechne ich deinen Kalorien- und Makrobedarf und plane deine erste Woche.</p>
  ${profileForm("Los geht's", true)}
`);

defineRoute(/^#\/einstellungen$/, () => {
  const t = calcTargets(state.profile, currentWeight() ?? 75);
  const adj = state.profile.kcalAdjust || 0;
  const disliked = state.prefs.disliked.map((id) => RECIPE_BY_ID[id]).filter(Boolean);
  return `
  <header class="top">
    <a class="icon-btn" href="#/heute" aria-label="Zurück">${icon('left')}</a>
    <h1 class="title-sm">Einstellungen</h1><span class="icon-btn"></span>
  </header>
  <div class="card">
    <div class="kv"><span>Grundumsatz</span><b>${num(t.bmr)} kcal</b></div>
    <div class="kv"><span>Gesamtumsatz</span><b>${num(t.tdee)} kcal</b></div>
    <div class="kv"><span>Manuelle Anpassung</span><b>${adj > 0 ? '+' : ''}${num(adj)} kcal</b></div>
    <div class="kv"><span>Tagesziel</span><b class="accent">${num(t.kcal)} kcal</b></div>
    <div class="row gap mt">
      <button class="btn small" data-act="adjustKcal" data-d="-100">− 100 kcal</button>
      <button class="btn small" data-act="adjustKcal" data-d="100">+ 100 kcal</button>
      ${adj ? `<button class="btn small ghost" data-act="adjustKcal" data-d="0">Zurücksetzen</button>` : ''}
    </div>
  </div>
  ${profileForm('Speichern', false)}
  ${disliked.length ? `<h2 class="section">Ausgeblendete Rezepte</h2>
    <div class="card list">${disliked.map((r) => `
      <div class="li"><div class="li-main">${esc(r.name)}</div>
      <button class="btn small" data-act="undislike" data-id="${r.id}">Wieder zeigen</button></div>`).join('')}</div>` : ''}
  <h2 class="section">Daten</h2>
  <div class="card stack">
    <p class="muted small">Alle Daten liegen nur auf diesem Gerät. Exportiere regelmäßig eine Sicherung – die Datei kann später auch in die native App übernommen werden.</p>
    <button class="btn block" data-act="exportData">Sicherung exportieren</button>
    <label class="btn block">Sicherung importieren<input type="file" accept="application/json,.json" hidden data-change="importData"></label>
    <button class="btn block danger" data-act="resetAll">Alle Daten löschen</button>
  </div>
  <p class="muted small center mt">Fitness · Version 1.0</p>`;
}, 'heute');

defineActions({
  saveProfile(form) {
    const fd = new FormData(form);
    const birthYear = parseInt(fd.get('birthYear'), 10);
    const height = parseNum(fd.get('height'));
    const weight = parseNum(fd.get('weight'));
    const year = new Date().getFullYear();
    if (!(birthYear > year - 100 && birthYear < year - 12) || !(height > 120 && height < 230) || !(weight > 30 && weight < 300)) {
      return toast('Bitte Geburtsjahr, Größe und Gewicht prüfen');
    }
    state.profile = {
      sex: fd.get('sex'), birthYear, height,
      activity: parseFloat(fd.get('activity')), goal: fd.get('goal'),
      kcalAdjust: state.profile?.kcalAdjust || 0,
    };
    state.prefs.diet = fd.get('diet');
    state.prefs.mealsPerDay = parseInt(fd.get('meals'), 10);
    if (weight !== currentWeight()) {
      const today = isoDate();
      const entry = state.bodyLog.find((e) => e.date === today);
      if (entry) entry.weight = weight;
      else state.bodyLog.push({ date: today, weight });
    }
    if (form.dataset.onboarding) {
      planWeekFrom(weekStart(isoDate()));
      save();
      return go('#/heute');
    }
    update();
    toast('Gespeichert – Ziele aktualisiert');
  },
  adjustKcal(el) {
    const d = Number(el.dataset.d);
    state.profile.kcalAdjust = d === 0 ? 0 : (state.profile.kcalAdjust || 0) + d;
    update();
  },
  undislike(el) {
    state.prefs.disliked = state.prefs.disliked.filter((id) => id !== el.dataset.id);
    update();
  },
  async exportData() {
    const json = JSON.stringify(state, null, 2);
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
      if (!data || data.version !== 1) throw new Error('Unbekanntes Format');
      if (!confirm('Sicherung importieren? Die aktuellen Daten werden ersetzt.')) return;
      replaceState(data);
      toast('Sicherung importiert');
      go('#/heute');
    } catch (e) {
      toast('Datei konnte nicht gelesen werden');
    } finally {
      input.value = '';
    }
  },
  resetAll() {
    if (!confirm('Wirklich alle Daten löschen? Das kann nicht rückgängig gemacht werden.')) return;
    resetState();
    go('#/start');
  },
});
