import { defineRoute, defineActions, update, go } from '../core.js';
import { state, save } from '../store.js';
import { esc, num, uid, parseNum, fmtDuration, fmtRest, relDay, fmtShort } from '../util.js';
import {
  activePlan, nextDay, getExercise, allExercises, planFromTemplate, TEMPLATES, startWorkout,
  newWorkoutExercise, finishWorkout, volume, setCount, fmtReps, fmtKg, exerciseHistory, parseReps,
} from '../training.js';
import { MUSCLES } from '../data/exercises.js';
import { startRest, adjustRest, stopRest, unlockAudio } from '../timer.js';
import { icon } from '../icons.js';
import { openSheet, closeSheet, sheetHead, toast, lineChart, empty } from '../ui.js';

const REST_OPTIONS = [45, 60, 90, 120, 150, 180, 240];
let historyTab = 'einheiten';
let picker = null; // { mode: 'plan', planId, dayId } | { mode: 'workout' }
let pickerQuery = '';

const findPlan = (id) => state.plans.find((p) => p.id === id);
const findDay = (plan, id) => plan?.days.find((d) => d.id === id);
const fmtVolume = (v) => (v >= 1000 ? `${num(v / 1000, 1)} t` : `${num(v)} kg`);
function fmtMinutes(ms) {
  const m = Math.max(1, Math.round(ms / 60000));
  return m < 60 ? `${m} Min.` : `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')} Min.`;
}

export function workoutBanner() {
  const w = state.activeWorkout;
  if (!w) return '';
  const done = w.exercises.reduce((s, e) => s + e.sets.filter((x) => x.done).length, 0);
  const total = w.exercises.reduce((s, e) => s + e.sets.length, 0);
  return `<a class="card banner" href="#/training/workout">
    <div><p class="eyebrow">Training läuft · <span data-elapsed="${w.start}">${fmtDuration(Date.now() - w.start)}</span></p>
    <p class="li-title">${esc(w.name)}</p><p class="muted small">${done} von ${total} Sätzen</p></div>
    <span class="btn primary small">Fortsetzen</span>
  </a>`;
}

export function nextUnitCard() {
  const plan = activePlan();
  const day = nextDay(plan);
  if (!plan || !day) return '';
  return `<div class="card">
    <p class="eyebrow">Als Nächstes · ${esc(plan.name)}</p>
    <div class="row between">
      <div><p class="li-title">${esc(day.name)}</p><p class="muted small">${day.exercises.length} Übungen · ca. ${estimateMinutes(day)} Min.</p></div>
      <button class="btn primary" data-act="startDay" data-plan="${plan.id}" data-day="${day.id}">${icon('play')} Starten</button>
    </div>
  </div>`;
}

const estimateMinutes = (day) =>
  Math.round(day.exercises.reduce((s, e) => s + e.sets * (45 + e.rest), 0) / 60 / 5) * 5;

const workoutRow = (w) => `
  <a class="li linkish" href="#/training/einheit/${w.id}">
    <span class="li-main"><span class="eyebrow">${relDay(w.date)}</span><span class="li-title">${esc(w.name)}</span>
    <span class="muted small">${fmtMinutes(w.end - w.start)} · ${setCount(w)} Sätze · ${fmtVolume(volume(w))}</span></span>
    ${icon('right', 'muted')}
  </a>`;

// --- Übersicht ---------------------------------------------------------------

defineRoute(/^#\/training$/, () => {
  const plan = activePlan();
  const next = nextDay(plan);
  const others = state.plans.filter((p) => p.id !== state.activePlanId);
  return `
  <header class="top"><div><p class="eyebrow">Pläne & Verlauf</p><h1>Training</h1></div></header>
  ${workoutBanner()}
  ${plan ? `<div class="card">
      <div class="row between"><div><p class="eyebrow">Aktiver Plan</p><h3>${esc(plan.name)}</h3></div>
      <a class="btn small ghost" href="#/training/plan/${plan.id}">${icon('edit')} Bearbeiten</a></div>
      <div class="list flush">${plan.days.map((d) => `
        <div class="li">
          <div class="li-main"><span class="li-title">${esc(d.name)} ${d.id === next?.id ? '<span class="badge">Als Nächstes</span>' : ''}</span>
          <span class="muted small">${d.exercises.map((e) => esc(getExercise(e.exId).name)).join(' · ') || 'Noch keine Übungen'}</span></div>
          <button class="icon-btn accent" data-act="startDay" data-plan="${plan.id}" data-day="${d.id}" aria-label="Starten" ${d.exercises.length ? '' : 'disabled'}>${icon('play')}</button>
        </div>`).join('')}</div>
    </div>`
    : empty('Noch kein Trainingsplan', 'Starte mit einer bewährten Vorlage oder stell dir deinen eigenen Plan zusammen.',
      `<div class="stack"><button class="btn primary block" data-act="pickTemplate">Vorlage wählen</button>
       <button class="btn block" data-act="newPlan">Eigenen Plan erstellen</button></div>`)}
  <button class="btn block mt" data-act="startFree">${icon('plus')} Freies Training</button>

  ${state.plans.length ? `<h2 class="section">Pläne</h2>
    <div class="card list">${others.map((p) => `
      <div class="li"><a class="li-main linkish" href="#/training/plan/${p.id}"><span class="li-title">${esc(p.name)}</span>
        <span class="muted small">${p.days.length} Einheiten</span></a>
        <button class="btn small" data-act="activatePlan" data-id="${p.id}">Aktivieren</button></div>`).join('')}
      <div class="li"><button class="btn small ghost" data-act="pickTemplate">Vorlage hinzufügen</button>
      <button class="btn small ghost" data-act="newPlan">Neuer Plan</button></div>
    </div>` : ''}

  <div class="row between"><h2 class="section">Verlauf</h2>${state.workouts.length ? '<a class="small" href="#/training/verlauf">Alle anzeigen</a>' : ''}</div>
  ${state.workouts.length
    ? `<div class="card list">${state.workouts.slice(0, 5).map(workoutRow).join('')}</div>`
    : '<p class="muted small">Deine abgeschlossenen Trainings erscheinen hier.</p>'}`;
}, 'training');

// --- Plan-Editor ---------------------------------------------------------------

defineRoute(/^#\/training\/plan\/([\w-]+)$/, (id) => {
  const plan = findPlan(id);
  if (!plan) return empty('Plan nicht gefunden', '', '<a class="btn" href="#/training">Zurück</a>');
  return `
  <header class="top">
    <a class="icon-btn" href="#/training" aria-label="Zurück">${icon('left')}</a>
    <h1 class="title-sm">Plan bearbeiten</h1>
    <button class="icon-btn" data-act="deletePlan" data-id="${plan.id}" aria-label="Plan löschen">${icon('trash')}</button>
  </header>
  <label class="field"><span>Name</span><input value="${esc(plan.name)}" data-change="renamePlan" data-id="${plan.id}"></label>
  ${plan.id === state.activePlanId ? '<p class="muted small">Das ist dein aktiver Plan.</p>' : `<button class="btn small mt" data-act="activatePlan" data-id="${plan.id}">Als aktiven Plan setzen</button>`}
  ${plan.days.map((d, di) => `
    <div class="card">
      <div class="row gap">
        <input class="inline-title" value="${esc(d.name)}" data-change="renameDay" data-plan="${plan.id}" data-day="${d.id}" aria-label="Name der Einheit">
        <button class="icon-btn" data-act="moveDay" data-plan="${plan.id}" data-i="${di}" data-d="-1" ${di === 0 ? 'disabled' : ''}>${icon('up')}</button>
        <button class="icon-btn" data-act="deleteDay" data-plan="${plan.id}" data-day="${d.id}" aria-label="Einheit löschen">${icon('trash')}</button>
      </div>
      <div class="list flush">${d.exercises.map((e, ei) => `
        <button class="li linkish" data-act="editPlanEx" data-plan="${plan.id}" data-day="${d.id}" data-i="${ei}">
          <span class="li-main"><span class="li-title">${esc(getExercise(e.exId).name)}</span>
          <span class="muted small">${e.sets} × ${fmtReps(e.reps)}${getExercise(e.exId).timed ? ' s' : ''} · Pause ${fmtRest(e.rest)}</span></span>
          ${icon('right', 'muted')}
        </button>`).join('')}</div>
      <button class="btn small ghost mt" data-act="pickExercise" data-plan="${plan.id}" data-day="${d.id}">${icon('plus')} Übung hinzufügen</button>
    </div>`).join('')}
  <button class="btn block mt" data-act="addDay" data-plan="${plan.id}">${icon('plus')} Einheit hinzufügen</button>`;
}, 'training');

function planExSheet() {
  const { planId, dayId, i } = picker;
  const day = findDay(findPlan(planId), dayId);
  const e = day.exercises[i];
  const ex = getExercise(e.exId);
  return `${sheetHead(ex.name, ex.muscle)}
    <div class="stack">
      <div class="row between"><span>Sätze</span>
        <div class="stepper"><button class="icon-btn" data-act="planExSets" data-d="-1" ${e.sets <= 1 ? 'disabled' : ''}>${icon('minus')}</button>
        <b>${e.sets}</b><button class="icon-btn" data-act="planExSets" data-d="1">${icon('plus')}</button></div></div>
      <label class="field"><span>${ex.timed ? 'Sekunden' : 'Wiederholungen'} (z. B. 8-10)</span>
        <input value="${esc(e.reps)}" data-change="planExReps" inputmode="numeric"></label>
      <div><p class="muted small">Pause</p><div class="chips">${REST_OPTIONS.map((s) => `
        <button class="chip ${s === e.rest ? 'on' : ''}" data-act="planExRest" data-s="${s}">${fmtRest(s)}</button>`).join('')}</div></div>
      <div class="row gap">
        <button class="btn grow" data-act="planExMove" data-d="-1" ${i === 0 ? 'disabled' : ''}>${icon('up')} Nach oben</button>
        <button class="btn grow" data-act="planExMove" data-d="1" ${i === day.exercises.length - 1 ? 'disabled' : ''}>${icon('down')} Nach unten</button>
      </div>
      <button class="btn block danger" data-act="planExRemove">Übung entfernen</button>
      <a class="btn block ghost" href="#/training/uebung/${e.exId}">Fortschritt ansehen</a>
    </div>`;
}

const currentPlanEx = () => {
  const day = findDay(findPlan(picker.planId), picker.dayId);
  return { day, e: day.exercises[picker.i] };
};

// --- Übungsauswahl ---------------------------------------------------------------

function pickerList() {
  const q = pickerQuery.trim().toLowerCase();
  const list = allExercises().filter((e) => !q || e.name.toLowerCase().includes(q) || e.muscle.toLowerCase().includes(q));
  const groups = MUSCLES.map((m) => [m, list.filter((e) => e.muscle === m)]).filter(([, l]) => l.length);
  return `${groups.map(([m, l]) => `<h3 class="group">${m}</h3>${l.map((e) => `
      <button class="li linkish" data-act="chooseExercise" data-id="${e.id}"><span class="li-main">${esc(e.name)}</span>${icon('plus', 'muted')}</button>`).join('')}`).join('')}
    ${q ? `<button class="btn block mt" data-act="customExercise">„${esc(pickerQuery.trim())}“ als eigene Übung anlegen</button>` : ''}
    ${!groups.length && !q ? '<p class="muted">Keine Übungen.</p>' : ''}`;
}

function pickerSheet() {
  return `${sheetHead('Übung hinzufügen')}
    <input class="search" type="search" placeholder="Suchen, z. B. Rudern oder Beine" value="${esc(pickerQuery)}" data-input="exSearch" autocomplete="off">
    <div class="list" id="picker-list">${pickerList()}</div>`;
}

function openPicker(ctx) {
  picker = ctx;
  pickerQuery = '';
  openSheet(pickerSheet);
}

function templateSheet() {
  return `${sheetHead('Vorlage wählen', 'Du kannst Übungen, Sätze und Pausen danach anpassen.')}
    <div class="list">${TEMPLATES.map((t) => `
      <button class="li linkish" data-act="addTemplate" data-id="${t.id}">
        <span class="li-main"><span class="li-title">${esc(t.name)}</span><span class="muted small">${esc(t.hint)}</span>
        <span class="eyebrow">${t.days.map((d) => esc(d.name)).join(' · ')}</span></span>${icon('plus', 'accent')}
      </button>`).join('')}</div>`;
}

// --- Laufendes Training ---------------------------------------------------------------

defineRoute(/^#\/training\/workout$/, () => {
  const w = state.activeWorkout;
  if (!w) {
    return empty('Kein laufendes Training', 'Starte eine Einheit aus deinem Plan.', '<a class="btn primary" href="#/training">Zum Training</a>');
  }
  return `
  <header class="top">
    <a class="icon-btn" href="#/training" aria-label="Zurück">${icon('left')}</a>
    <div class="center"><h1 class="title-sm">${esc(w.name)}</h1><p class="muted small" data-elapsed="${w.start}">${fmtDuration(Date.now() - w.start)}</p></div>
    <button class="btn small primary" data-act="finishWorkout">Fertig</button>
  </header>
  ${w.exercises.map((e, ei) => exerciseCard(e, ei)).join('')}
  <button class="btn block" data-act="pickExerciseWorkout">${icon('plus')} Übung hinzufügen</button>
  <button class="btn block ghost danger mt" data-act="discardWorkout">Training verwerfen</button>`;
}, 'training');

function exerciseCard(e, ei) {
  const ex = getExercise(e.exId);
  const unit = ex.timed ? 'Sek.' : 'Wdh.';
  return `<div class="card exercise">
    <div class="row between">
      <div><a class="li-title linkish" href="#/training/uebung/${e.exId}">${esc(ex.name)}</a>
      <p class="muted small">${e.target.sets} × ${fmtReps(e.target.reps)} ${unit} · Pause ${fmtRest(e.target.rest)}</p></div>
      <button class="icon-btn" data-act="exMenu" data-ei="${ei}" aria-label="Optionen">${icon('more')}</button>
    </div>
    ${e.note ? `<p class="hint">${icon('trophy')} ${esc(e.note)}</p>` : ''}
    <div class="sets">
      <div class="set head"><span>Satz</span><span>${ex.bw ? '+ kg' : 'kg'}</span><span>${unit}</span><span></span></div>
      ${e.sets.map((s, si) => `
        <div class="set ${s.done ? 'done' : ''}">
          <span class="set-no">${si + 1}</span>
          <input inputmode="decimal" placeholder="${ex.bw ? '0' : '–'}" value="${s.w ?? ''}" data-change="setField" data-ei="${ei}" data-si="${si}" data-f="w" aria-label="Gewicht">
          <input inputmode="numeric" placeholder="${s.hint ?? ''}" value="${s.r ?? ''}" data-change="setField" data-ei="${ei}" data-si="${si}" data-f="r" aria-label="Wiederholungen">
          <button class="check ${s.done ? 'on' : ''}" data-act="toggleSet" data-ei="${ei}" data-si="${si}" aria-label="Satz erledigt">${icon('check')}</button>
        </div>`).join('')}
    </div>
    <div class="row gap mt">
      <button class="btn small ghost" data-act="addSet" data-ei="${ei}">${icon('plus')} Satz</button>
      ${e.sets.length > 1 ? `<button class="btn small ghost" data-act="removeSet" data-ei="${ei}">${icon('minus')} Satz</button>` : ''}
    </div>
  </div>`;
}

function exMenuSheet(ei) {
  const w = state.activeWorkout;
  const e = w.exercises[ei];
  return `${sheetHead(getExercise(e.exId).name)}
    <div class="stack">
      <div><p class="muted small">Pause für diese Übung</p><div class="chips">${REST_OPTIONS.map((s) => `
        <button class="chip ${s === e.target.rest ? 'on' : ''}" data-act="workoutRest" data-ei="${ei}" data-s="${s}">${fmtRest(s)}</button>`).join('')}</div></div>
      <div class="row gap">
        <button class="btn grow" data-act="moveWorkoutEx" data-ei="${ei}" data-d="-1" ${ei === 0 ? 'disabled' : ''}>${icon('up')} Nach oben</button>
        <button class="btn grow" data-act="moveWorkoutEx" data-ei="${ei}" data-d="1" ${ei === w.exercises.length - 1 ? 'disabled' : ''}>${icon('down')} Nach unten</button>
      </div>
      <button class="btn block danger" data-act="removeWorkoutEx" data-ei="${ei}">Übung entfernen</button>
    </div>`;
}

// --- Verlauf & Auswertung ---------------------------------------------------------------

defineRoute(/^#\/training\/verlauf$/, () => {
  const used = [...new Set(state.workouts.flatMap((w) => w.exercises.map((e) => e.exId)))];
  return `
  <header class="top">
    <a class="icon-btn" href="#/training" aria-label="Zurück">${icon('left')}</a>
    <h1 class="title-sm">Verlauf</h1><span class="icon-btn"></span>
  </header>
  <div class="seg tabs">
    <button class="${historyTab === 'einheiten' ? 'on' : ''}" data-act="historyTab" data-t="einheiten">Trainings</button>
    <button class="${historyTab === 'uebungen' ? 'on' : ''}" data-act="historyTab" data-t="uebungen">Übungen</button>
  </div>
  ${historyTab === 'einheiten'
    ? (state.workouts.length ? `<div class="card list">${state.workouts.map(workoutRow).join('')}</div>` : '<p class="muted">Noch keine Trainings.</p>')
    : (used.length ? `<div class="card list">${used.map((id) => {
        const h = exerciseHistory(id);
        const ex = getExercise(id);
        return `<a class="li linkish" href="#/training/uebung/${id}"><span class="li-main"><span class="li-title">${esc(ex.name)}</span>
          <span class="muted small">${h.length}× trainiert · Bestwert ${bestLabel(ex, h)}</span></span>${icon('right', 'muted')}</a>`;
      }).join('')}</div>` : '<p class="muted">Noch keine Übungen trainiert.</p>')}`;
}, 'training');

function bestLabel(ex, h) {
  if (!h.length) return '–';
  const maxW = Math.max(...h.map((x) => x.maxW));
  if (!maxW) return `${Math.max(...h.map((x) => x.maxR))} ${ex.timed ? 's' : 'Wdh.'}`;
  return fmtKg(maxW);
}

defineRoute(/^#\/training\/einheit\/([\w-]+)$/, (id) => {
  const w = state.workouts.find((x) => x.id === id);
  if (!w) return empty('Training nicht gefunden', '', '<a class="btn" href="#/training">Zurück</a>');
  return `
  <header class="top">
    <a class="icon-btn" href="#/training" aria-label="Zurück">${icon('left')}</a>
    <h1 class="title-sm">${esc(w.name)}</h1>
    <button class="icon-btn" data-act="deleteWorkout" data-id="${w.id}" aria-label="Löschen">${icon('trash')}</button>
  </header>
  <p class="muted center">${fmtShort(w.date)}</p>
  <div class="tiles">
    <div class="tile"><b>${fmtDuration(w.end - w.start)}</b><span>Dauer</span></div>
    <div class="tile"><b>${setCount(w)}</b><span>Sätze</span></div>
    <div class="tile"><b>${fmtVolume(volume(w))}</b><span>Volumen</span></div>
  </div>
  ${w.exercises.map((e) => {
    const ex = getExercise(e.exId);
    return `<div class="card"><a class="li-title linkish" href="#/training/uebung/${e.exId}">${esc(ex.name)}</a>
      <div class="set-summary">${e.sets.map((s, i) => `<span><i>${i + 1}</i>${s.w ? `${num(s.w, 2)} kg × ` : ''}${s.r}${ex.timed ? ' s' : ''}</span>`).join('')}</div></div>`;
  }).join('')}`;
}, 'training');

defineRoute(/^#\/training\/uebung\/([\w-]+)$/, (id) => {
  const ex = getExercise(id);
  const h = exerciseHistory(id);
  const weighted = h.some((x) => x.maxW > 0);
  const points = [...h].reverse().map((x) => ({ x: x.date, y: weighted ? Math.round(x.best * 10) / 10 : x.maxR }));
  return `
  <header class="top">
    <a class="icon-btn" href="javascript:history.back()" aria-label="Zurück">${icon('left')}</a>
    <h1 class="title-sm">${esc(ex.name)}</h1><span class="icon-btn"></span>
  </header>
  ${h.length ? `
    <div class="card">
      <p class="eyebrow">${weighted ? 'Geschätzte Maximalkraft (1RM)' : `Beste ${ex.timed ? 'Zeit' : 'Wiederholungen'}`}</p>
      <p class="big">${weighted ? fmtKg(Math.round(Math.max(...h.map((x) => x.best)) * 2) / 2) : Math.max(...h.map((x) => x.maxR))}</p>
      ${lineChart(points, { unit: weighted ? 'kg' : '', digits: 0 })}
    </div>
    <h2 class="section">Einheiten</h2>
    <div class="card list">${h.map((x) => `
      <a class="li linkish" href="#/training/einheit/${x.workoutId}"><span class="li-main"><span class="eyebrow">${relDay(x.date)}</span>
        <span class="small">${x.sets.map((s) => `${s.w ? `${num(s.w, 2)}×` : ''}${s.r}`).join(' · ')}</span></span></a>`).join('')}</div>`
    : empty('Noch keine Daten', 'Sobald du diese Übung trainiert hast, siehst du hier deinen Fortschritt.')}`;
}, 'training');

// --- Aktionen ---------------------------------------------------------------

function ensureNoActive() {
  return !state.activeWorkout || confirm('Es läuft bereits ein Training. Verwerfen und neu starten?');
}

defineActions({
  startDay(el) {
    const plan = findPlan(el.dataset.plan);
    const day = findDay(plan, el.dataset.day);
    if (state.activeWorkout && state.activeWorkout.dayId === day.id) return go('#/training/workout');
    if (!ensureNoActive()) return;
    startWorkout(plan, day);
    save();
    go('#/training/workout');
  },
  startFree() {
    if (!ensureNoActive()) return;
    startWorkout(null, null);
    save();
    go('#/training/workout');
  },
  pickTemplate() {
    openSheet(templateSheet);
  },
  addTemplate(el) {
    const plan = planFromTemplate(TEMPLATES.find((t) => t.id === el.dataset.id));
    state.plans.push(plan);
    state.activePlanId ??= plan.id;
    closeSheet();
    update();
    toast(`„${plan.name}“ hinzugefügt`);
  },
  newPlan() {
    const plan = { id: uid(), name: 'Mein Plan', days: [{ id: uid(), name: 'Einheit A', exercises: [] }] };
    state.plans.push(plan);
    state.activePlanId ??= plan.id;
    save();
    go(`#/training/plan/${plan.id}`);
  },
  activatePlan(el) {
    state.activePlanId = el.dataset.id;
    update();
  },
  deletePlan(el) {
    if (!confirm('Plan löschen? Dein Trainingsverlauf bleibt erhalten.')) return;
    state.plans = state.plans.filter((p) => p.id !== el.dataset.id);
    if (state.activePlanId === el.dataset.id) state.activePlanId = state.plans[0]?.id ?? null;
    save();
    go('#/training');
  },
  renamePlan(el) {
    findPlan(el.dataset.id).name = el.value.trim() || 'Mein Plan';
    save();
  },
  renameDay(el) {
    findDay(findPlan(el.dataset.plan), el.dataset.day).name = el.value.trim() || 'Einheit';
    save();
  },
  addDay(el) {
    const plan = findPlan(el.dataset.plan);
    plan.days.push({ id: uid(), name: `Einheit ${String.fromCharCode(65 + plan.days.length)}`, exercises: [] });
    update();
  },
  moveDay(el) {
    const plan = findPlan(el.dataset.plan);
    const i = Number(el.dataset.i);
    const j = i + Number(el.dataset.d);
    [plan.days[i], plan.days[j]] = [plan.days[j], plan.days[i]];
    update();
  },
  deleteDay(el) {
    const plan = findPlan(el.dataset.plan);
    if (!confirm('Diese Einheit löschen?')) return;
    plan.days = plan.days.filter((d) => d.id !== el.dataset.day);
    update();
  },
  pickExercise(el) {
    openPicker({ mode: 'plan', planId: el.dataset.plan, dayId: el.dataset.day });
  },
  pickExerciseWorkout() {
    openPicker({ mode: 'workout' });
  },
  exSearch(el) {
    pickerQuery = el.value;
    document.getElementById('picker-list').innerHTML = pickerList();
  },
  customExercise() {
    const ex = { id: `c-${uid()}`, name: pickerQuery.trim(), muscle: 'Sonstige', inc: 2.5 };
    state.customExercises.push(ex);
    actionsChoose(ex.id);
  },
  chooseExercise(el) {
    actionsChoose(el.dataset.id);
  },
  editPlanEx(el) {
    picker = { mode: 'edit', planId: el.dataset.plan, dayId: el.dataset.day, i: Number(el.dataset.i) };
    openSheet(planExSheet);
  },
  planExSets(el) {
    const { e } = currentPlanEx();
    e.sets = Math.max(1, e.sets + Number(el.dataset.d));
    update();
  },
  planExReps(el) {
    const { e } = currentPlanEx();
    const { min, max } = parseReps(el.value);
    e.reps = min === max ? String(min) : `${min}-${max}`;
    update();
  },
  planExRest(el) {
    currentPlanEx().e.rest = Number(el.dataset.s);
    update();
  },
  planExMove(el) {
    const { day } = currentPlanEx();
    const i = picker.i;
    const j = i + Number(el.dataset.d);
    [day.exercises[i], day.exercises[j]] = [day.exercises[j], day.exercises[i]];
    picker.i = j;
    update();
  },
  planExRemove() {
    const { day } = currentPlanEx();
    day.exercises.splice(picker.i, 1);
    closeSheet();
    update();
  },

  setField(el) {
    const s = state.activeWorkout.exercises[el.dataset.ei].sets[el.dataset.si];
    const v = parseNum(el.value);
    s[el.dataset.f] = el.dataset.f === 'r' && v != null ? Math.round(v) : v;
    save();
  },
  toggleSet(el) {
    unlockAudio();
    const e = state.activeWorkout.exercises[el.dataset.ei];
    const s = e.sets[el.dataset.si];
    s.done = !s.done;
    if (s.done) {
      if (s.r == null) s.r = Number(s.hint) || parseReps(e.target.reps).max;
      // Gewicht für die folgenden leeren Sätze übernehmen.
      e.sets.slice(Number(el.dataset.si) + 1).forEach((n) => { if (n.w == null && !n.done) n.w = s.w; });
      const last = state.activeWorkout.exercises.every((x) => x.sets.every((y) => y.done));
      if (!last) startRest(e.target.rest);
    }
    update();
  },
  addSet(el) {
    const e = state.activeWorkout.exercises[el.dataset.ei];
    const prev = e.sets[e.sets.length - 1];
    e.sets.push({ w: prev?.w ?? null, r: null, hint: prev?.r ?? prev?.hint, done: false });
    update();
  },
  removeSet(el) {
    state.activeWorkout.exercises[el.dataset.ei].sets.pop();
    update();
  },
  exMenu(el) {
    const ei = Number(el.dataset.ei);
    openSheet(() => exMenuSheet(ei));
  },
  workoutRest(el) {
    state.activeWorkout.exercises[el.dataset.ei].target.rest = Number(el.dataset.s);
    update();
  },
  moveWorkoutEx(el) {
    const list = state.activeWorkout.exercises;
    const i = Number(el.dataset.ei);
    const j = i + Number(el.dataset.d);
    [list[i], list[j]] = [list[j], list[i]];
    closeSheet();
    update();
  },
  removeWorkoutEx(el) {
    state.activeWorkout.exercises.splice(Number(el.dataset.ei), 1);
    closeSheet();
    update();
  },
  finishWorkout() {
    const w = state.activeWorkout;
    const done = w.exercises.some((e) => e.sets.some((s) => s.done));
    if (!done) {
      if (confirm('Noch kein Satz abgehakt. Training verwerfen?')) {
        state.activeWorkout = null;
        stopRest();
        go('#/training');
      }
      return;
    }
    const open = w.exercises.reduce((n, e) => n + e.sets.filter((s) => !s.done).length, 0);
    if (open && !confirm(`${open} Sätze sind noch offen und werden nicht gespeichert. Training beenden?`)) return;
    const saved = finishWorkout();
    stopRest();
    save();
    go(`#/training/einheit/${saved.id}`);
    toast('Training gespeichert 💪');
  },
  discardWorkout() {
    if (!confirm('Training verwerfen? Die Eingaben gehen verloren.')) return;
    state.activeWorkout = null;
    stopRest();
    go('#/training');
  },
  deleteWorkout(el) {
    if (!confirm('Dieses Training aus dem Verlauf löschen?')) return;
    state.workouts = state.workouts.filter((w) => w.id !== el.dataset.id);
    save();
    go('#/training');
  },
  historyTab(el) {
    historyTab = el.dataset.t;
    update();
  },
  restAdd(el) {
    adjustRest(Number(el.dataset.s));
  },
  restSkip() {
    stopRest();
  },
});

function actionsChoose(exId) {
  if (picker.mode === 'workout') {
    state.activeWorkout.exercises.push(newWorkoutExercise(exId));
  } else {
    findDay(findPlan(picker.planId), picker.dayId).exercises.push({ exId, sets: 3, reps: '8-12', rest: 90 });
  }
  closeSheet();
  update();
}
