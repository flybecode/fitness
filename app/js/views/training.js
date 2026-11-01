import { defineRoute, defineActions, update, go } from '../core.js';
import { state, save } from '../store.js';
import { esc, num, uid, isoDate, weekStart, addDays, weekNumber, weekLabel, fmtDM, fmtLong, fmtShort, fmtDuration, parseNum, relDay } from '../util.js';
import {
  WEEKDAYS, MUSCLES, allExercises, getExercise, unit, fmtReps, parseReps, weekDays, dayIndex, moveDay, setDay, resetWeek,
  todayInfo, blocksOf, lastPerformance, startLive, newBlock, blockRounds, blockSetsDone, blockSetsTotal, advance, finishLive,
  volume, setCount, exerciseHistory, score, trainedExercises, muscleBalance, adherence, weeklyCounts, insights,
} from '../training.js';
import { startRest, stopRest, adjustRest, unlockAudio } from '../timer.js';
import { icon } from '../icons.js';
import { openSheet, closeSheet, sheetHead, toast, pageHead, label, bar, lineChart, sparkline, weekBars, stepper, empty, ring, badge, collapsible, exerciseBadge } from '../ui.js';
import { EQUIPMENT } from '../data/exercises.js';

let ws = weekStart(isoDate()); // Woche, in der zuletzt ein Tag angetippt wurde
let anchorWs = null; // auf diese Woche scrollt der Kalender, sonst auf die aktuelle
let picker = null; // { mode: 'unit', unitId } | { mode: 'live' }
let pickerQuery = '';
let editWeight = false;

const pct = (v) => `${v > 0 ? '+' : ''}${Math.round(v * 100)} %`;
const fmtMin = (ms) => `${Math.max(1, Math.round(ms / 60000))} Min.`;
const setsText = (sets) => sets.map((s) => `${s.w ? `${num(s.w, 2)}×` : ''}${s.r}${s.p ? `+${s.p}` : ''}`).join(' · ');

// --- Bausteine, auch fürs Dashboard ------------------------------------------------------

// Wochenkalender zum seitlichen Wischen: 8 Wochen zurück bis 8 Wochen voraus, startet bei anchor.
export function weekScroller({ interactive = true, anchor = null } = {}) {
  const current = weekStart(isoDate());
  const target = anchor ?? current;
  const weeks = Array.from({ length: 17 }, (_, k) => addDays(current, (k - 8) * 7));
  const title = (w) => (w === current ? 'Diese Woche' : w === addDays(current, 7) ? 'Nächste Woche' : w === addDays(current, -7) ? 'Letzte Woche' : weekLabel(w));
  return `<div class="wscroll">${weeks.map((w) => `
    <div class="wk ${w === target ? 'anchor' : ''}">
      <p class="wk-title"><span>${title(w)}</span><span class="muted">${w === current || Math.abs(weekNumber(w) - weekNumber(current)) === 1 ? weekLabel(w) : ''}</span></p>
      <div class="week">${weekDays(w).map((d) => {
        const name = d.done[0]?.name ?? d.planned?.name ?? (d.brk ? 'Pause' : '');
        const attrs = interactive ? `data-act="dayMenu" data-date="${d.date}"` : '';
        return `<${interactive ? 'button' : 'div'} class="day st-${d.status} ${d.today ? 'today' : ''}" ${attrs}>
          <span class="d-wd">${WEEKDAYS[d.i]}</span><span class="d-num">${Number(d.date.slice(8))}</span>
          <span class="d-unit">${esc(name)}</span>
        </${interactive ? 'button' : 'div'}>`;
      }).join('')}</div>
    </div>`).join('')}</div>`;
}

export function liveBanner() {
  const l = state.live;
  if (!l) return '';
  const done = l.blocks.reduce((s, b) => s + blockSetsDone(b), 0);
  const total = l.blocks.reduce((s, b) => s + blockSetsTotal(b), 0);
  return `<a class="panel live-banner" href="#/training/live">
    <div><p class="label accent">Training läuft · <span data-elapsed="${l.start}">${fmtDuration(Date.now() - l.start)}</span></p>
    <p class="row-title">${esc(l.name)}</p><p class="muted small mono">${done}/${total} Sätze</p></div>
    <span class="btn primary small">Weiter</span>
  </a>`;
}

export function todayAction() {
  const d = todayInfo();
  if (state.live) return liveBanner();
  if (d.done.length) return `<a class="panel today-card" href="#/training/verlauf/${d.done[0].id}"><div>${badge('check', 'green')}<div><p class="label">Heute erledigt</p><p class="row-title">${esc(d.done[0].name)}</p></div></div>${icon('right', 'muted')}</a>`;
  if (d.brk) return `<div class="panel today-card"><div>${badge('calendar', 'blue')}<div><p class="label">Heute</p><p class="row-title">Pause${d.brk.note ? `: ${esc(d.brk.note)}` : ''}</p></div></div></div>`;
  if (d.planned) {
    return `<div class="panel today-card"><div>${badge('dumbbell', 'red')}<div><p class="label">Heute · ${d.planned.items.length} Übungen</p><p class="row-title">${esc(d.planned.name)}</p></div></div>
      <button class="btn primary small" data-act="startUnit" data-id="${d.planned.id}">Starten</button></div>`;
  }
  return `<div class="panel today-card"><div>${badge('calendar', 'blue')}<div><p class="label">Heute</p><p class="row-title">Ruhetag</p></div></div>
    <button class="btn small" data-act="startPicker">Trainieren</button></div>`;
}

export function balancePanel({ compact = false } = {}) {
  const bal = muscleBalance();
  if (bal.score == null) {
    return `<section class="panel">${label('Muskelbalance')}<p class="muted small">Leg Einheiten an und verteile sie auf feste Wochentage – dann bewertet die App, ob alle Muskelgruppen genug Training bekommen.</p></section>`;
  }
  const ok = bal.rows.filter((r) => r.pct >= 1).length;
  const gaps = bal.rows.filter((r) => r.pct < 0.5).map((r) => r.id);
  return `<section class="panel">
    <div class="hero">
      ${ring(bal.score / 100, `<b>${bal.score}%</b><span>Balance</span>`, { size: 104, color: bal.score >= 80 ? 'var(--green)' : bal.score >= 50 ? 'var(--orange)' : 'var(--red)' })}
      <div><p class="row-title">Muskelbalance</p>
        <p class="muted small">${ok} von ${bal.rows.length} Muskelgruppen erreichen ihr Wochenziel.</p>
        ${gaps.length ? `<p class="small accent mt">Zu wenig: ${gaps.join(', ')}</p>` : ''}</div>
    </div>
    ${compact ? '' : `<details class="sub-coll">
      <summary>Sätze pro Muskelgruppe ${icon('chevron', 'coll-ic')}</summary>
      <div class="balance">${bal.rows.map((r) => `
      <div class="bal-row ${r.sets === 0 ? 'gap' : ''}"><span>${r.id}</span>${bar(r.sets, r.target, { accent: r.pct < 0.5, overWarn: false })}<span class="mono">${num(r.sets, 1)}/${r.target}</span></div>`).join('')}</div>
    </details>`}
  </section>`;
}

export function insightList(max = 6, key = 'hinweise') {
  const list = insights().slice(0, max);
  if (!list.length) return '';
  const warn = list.filter((i) => i.level === 'warn').length;
  return collapsible(key,
    `<span class="coll-title">${badge('bulb', warn ? 'orange' : 'blue')}<span>Hinweise</span><span class="count">${list.length}</span></span>`,
    `<ul class="insights">${list.map((i) => `<li class="${i.level}">${esc(i.text)}</li>`).join('')}</ul>`);
}

// --- Übersicht -------------------------------------------------------------------

defineRoute(/^#\/training$/, () => {
  const a = adherence(4);
  const counts = weeklyCounts(12);
  const exs = trainedExercises();
  const modified = Object.keys(state.weekPlan).some((k) => k >= weekStart(isoDate()));
  return `
  ${pageHead('Training')}
  ${todayAction()}

  <section class="panel cal">
    ${weekScroller({ anchor: anchorWs })}
    <div class="row between mt">
      <button class="link" data-act="scheduleSheet">Fester Rhythmus</button>
      <span class="muted small">Tag antippen zum Ändern</span>
    </div>
  </section>

  ${balancePanel()}
  ${insightList()}

  ${collapsible('frequenz',
    `<span class="coll-title">${badge('calendar', 'blue')}<span>Trainings pro Woche</span>${a.pct != null ? `<span class="count">${a.done}/${a.planned}</span>` : ''}</span>`,
    `${weekBars(counts.map((c) => ({ label: String(weekNumber(c.ws)), value: c.count, target: c.planned, muted: c.brk })))}
    <p class="muted small mt">Gepunktete Linie = geplant · gedimmt = Woche mit Pause</p>`)}

  ${exs.length ? collapsible('uebungen',
    `<span class="coll-title">${badge('trend', 'green')}<span>Fortschritt pro Übung</span><span class="count">${exs.length}</span></span>`,
    `<div class="rows">${exs.map((t) => `
      <a class="row-item" href="#/training/uebung/${t.id}">
        <span class="row-main"><span class="row-title">${esc(t.ex.name)}</span><span class="row-sub">${t.sessions}× · zuletzt ${relDay(t.lastDate)}</span></span>
        ${sparkline(t.series.map((s) => s.y))}
        <span class="mono change ${t.change > 0.005 ? 'up' : t.change < -0.005 ? 'down' : ''}">${t.sessions > 1 ? pct(t.change) : '–'}</span>
      </a>`).join('')}</div>`, { cls: 'flush-body' }) : ''}

  <div class="label-row section"><p class="label">Einheiten</p><button class="link" data-act="newUnit">${icon('plus')} Neue Einheit</button></div>
  ${state.units.length ? `<div class="panel flush rows">${state.units.map((u) => `
    <a class="row-item" href="#/training/einheit/${u.id}"><span class="row-main"><span class="row-title">${esc(u.name)}</span>
    <span class="row-sub">${u.items.length ? u.items.map((i) => esc(getExercise(i.exId).name)).join(' · ') : 'Noch leer'}</span></span>${icon('right')}</a>`).join('')}</div>`
  : empty('Noch keine Einheiten', 'Leg z. B. „Oberkörper“ und „Unterkörper“ an und trag deine Übungen ein.', '<button class="btn primary" data-act="newUnit">Erste Einheit anlegen</button>')}

  ${state.workouts.length ? collapsible('verlauf',
    `<span class="coll-title">${badge('clock', 'blue')}<span>Verlauf</span><span class="count">${state.workouts.length}</span></span>`,
    `<div class="rows">${state.workouts.slice(0, 8).map((w) => `
    <a class="row-item" href="#/training/verlauf/${w.id}"><span class="row-main"><span class="row-title">${esc(w.name)}</span>
    <span class="row-sub">${relDay(w.date)} · ${fmtMin(w.end - w.start)} · ${setCount(w)} Sätze</span></span>${icon('right')}</a>`).join('')}</div>`, { cls: 'flush-body' }) : ''}`;
}, 'training');

// --- Tag im Kalender -------------------------------------------------------------------

function dayMenuSheet(i) {
  const d = weekDays(ws)[i];
  const title = fmtLong(d.date);
  if (d.done.length) {
    return `${sheetHead(title)}<div class="rows">${d.done.map((w) => `<a class="row-item" href="#/training/verlauf/${w.id}"><span class="row-main"><span class="row-title">${esc(w.name)}</span><span class="row-sub">${setCount(w)} Sätze</span></span>${icon('right')}</a>`).join('')}</div>`;
  }
  if (d.planned) {
    return `${sheetHead(title, esc(d.planned.name))}
      <button class="btn primary block" data-act="startUnit" data-id="${d.planned.id}">Jetzt starten</button>
      ${label('Verschieben auf (nur diese Woche)')}
      <div class="wd-grid">${WEEKDAYS.map((wd, j) => `<button class="btn small ${j === i ? 'on' : ''}" data-act="moveDay" data-from="${i}" data-to="${j}" ${j === i ? 'disabled' : ''}>${wd}</button>`).join('')}</div>
      <button class="btn block mt danger" data-act="clearDay" data-i="${i}">Diese Woche streichen</button>
      ${state.weekPlan[ws] ? '<button class="btn block ghost" data-act="resetWeek">Woche auf festen Rhythmus zurücksetzen</button>' : ''}`;
  }
  return `${sheetHead(title, d.brk ? 'Pause eingetragen' : 'Ruhetag')}
    ${state.units.length ? `${label('Einheit eintragen (nur diese Woche)')}
    <div class="rows">${state.units.map((u) => `<button class="row-item" data-act="assignDay" data-i="${i}" data-id="${u.id}"><span class="row-main"><span class="row-title">${esc(u.name)}</span></span>${icon('plus')}</button>`).join('')}</div>` : '<p class="muted small">Leg zuerst eine Einheit an.</p>'}
    ${state.weekPlan[ws] ? '<button class="btn block ghost mt" data-act="resetWeek">Woche auf festen Rhythmus zurücksetzen</button>' : ''}`;
}

function scheduleSheet() {
  return `${sheetHead('Fester Rhythmus', 'Gilt für jede Woche, Änderungen im Kalender betreffen nur die einzelne Woche.')}
    <div class="rows">${WEEKDAYS.map((wd, i) => `
      <label class="row-item"><span class="row-title wd">${wd}</span>
      <select data-change="setSchedule" data-i="${i}">
        <option value="">Ruhetag</option>
        ${state.units.map((u) => `<option value="${u.id}" ${state.schedule[i] === u.id ? 'selected' : ''}>${esc(u.name)}</option>`).join('')}
      </select></label>`).join('')}</div>`;
}

function startPickerSheet() {
  return `${sheetHead('Training starten')}
    <div class="rows">${state.units.map((u) => `<button class="row-item" data-act="startUnit" data-id="${u.id}"><span class="row-main"><span class="row-title">${esc(u.name)}</span><span class="row-sub">${u.items.length} Übungen</span></span>${icon('right')}</button>`).join('')}
    <button class="row-item" data-act="startUnit" data-id=""><span class="row-main"><span class="row-title">Freies Training</span><span class="row-sub">Übungen unterwegs hinzufügen</span></span>${icon('right')}</button></div>`;
}

// --- Einheit bearbeiten --------------------------------------------------------------------

defineRoute(/^#\/training\/einheit\/([\w-]+)$/, (id) => {
  const u = unit(id);
  if (!u) return `${pageHead('Einheit', { back: '#/training' })}${empty('Nicht gefunden', '')}`;
  let letter = 0;
  const rows = blocksOf(u.items).map((block) => {
    letter += 1;
    const L = String.fromCharCode(64 + letter);
    return `<div class="block ${block.length > 1 ? 'superset' : ''}">${block.length > 1 ? '<span class="ss-tag">Superset</span>' : ''}${block.map((it, k) => {
      const idx = u.items.indexOf(it);
      const ex = getExercise(it.exId);
      return `<div class="row-item">
        ${exerciseBadge(ex)}
        <button class="row-main" data-act="itemSheet" data-unit="${u.id}" data-i="${idx}"><span class="row-title">${esc(ex.name)}</span>
        <span class="row-sub"><span class="mono">${L}${block.length > 1 ? k + 1 : ''}</span> · ${it.sets} × ${fmtReps(it.reps)} · ${EQUIPMENT[ex.eq]}</span></button>
        ${stepper(it.sets, { dec: { act: 'itemSets', attrs: `data-unit="${u.id}" data-i="${idx}" data-d="-1"` }, inc: { act: 'itemSets', attrs: `data-unit="${u.id}" data-i="${idx}" data-d="1"` }, size: 'sm' })}
      </div>`;
    }).join('')}</div>`;
  }).join('');
  return `
  ${pageHead('Einheit', { back: '#/training', right: `<button class="icon-btn" data-act="deleteUnit" data-id="${u.id}" aria-label="Löschen">${icon('trash')}</button>` })}
  <label class="field"><span class="label">Name</span><input value="${esc(u.name)}" data-change="renameUnit" data-id="${u.id}"></label>
  <section class="panel flush mt">${rows || '<p class="muted small pad">Noch keine Übungen.</p>'}</section>
  <button class="btn block" data-act="pickExercise" data-unit="${u.id}">${icon('plus')} Übung</button>
  <p class="muted small mt">Tippe auf eine Übung, um Wiederholungsbereich, Reihenfolge oder ein Superset festzulegen.</p>`;
}, 'training');

function itemSheet(unitId, i) {
  const u = unit(unitId);
  const it = u.items[i];
  const ex = getExercise(it.exId);
  const last = i === u.items.length - 1;
  return `${sheetHead(ex.name, [...ex.m, ...ex.s.map((s) => `(${s})`)].join(' · '))}
    <div class="stack">
      <div class="row between"><span>Sätze</span>${stepper(it.sets, { dec: { act: 'itemSets', attrs: `data-unit="${unitId}" data-i="${i}" data-d="-1"` }, inc: { act: 'itemSets', attrs: `data-unit="${unitId}" data-i="${i}" data-d="1"` }, size: 'sm' })}</div>
      <label class="field"><span class="label">Wiederholungsbereich (z. B. 8-12)</span><input value="${esc(it.reps || '8-12')}" inputmode="numeric" data-change="itemReps" data-unit="${unitId}" data-i="${i}"></label>
      <button class="toggle ${it.ss ? 'on' : ''}" data-act="itemSuperset" data-unit="${unitId}" data-i="${i}" ${last ? 'disabled' : ''}>
        <span>${icon('link')} Superset mit der nächsten Übung</span><span class="mono">${it.ss ? 'AN' : 'AUS'}</span></button>
      <div class="row gap">
        <button class="btn grow" data-act="itemMove" data-unit="${unitId}" data-i="${i}" data-d="-1" ${i === 0 ? 'disabled' : ''}>${icon('up')} Hoch</button>
        <button class="btn grow" data-act="itemMove" data-unit="${unitId}" data-i="${i}" data-d="1" ${last ? 'disabled' : ''}>${icon('down')} Runter</button>
      </div>
      <button class="btn block danger" data-act="itemRemove" data-unit="${unitId}" data-i="${i}">Entfernen</button>
    </div>`;
}

// --- Übungsauswahl --------------------------------------------------------------------------

function pickerList() {
  const q = pickerQuery.trim().toLowerCase();
  const list = allExercises().filter((e) => !q || e.name.toLowerCase().includes(q) || e.m.some((m) => m.toLowerCase().includes(q)));
  const groups = MUSCLES.map((m) => [m.id, list.filter((e) => e.m[0] === m.id)]).filter(([, l]) => l.length);
  return `${groups.map(([m, l]) => `${label(m)}${l.map((e) => `
      <button class="row-item" data-act="chooseExercise" data-id="${e.id}">${exerciseBadge(getExercise(e.id))}<span class="row-main"><span class="row-title">${esc(e.name)}</span>
      <span class="row-sub">${EQUIPMENT[getExercise(e.id).eq]}</span></span>${icon('plus')}</button>`).join('')}`).join('')}
    ${q ? `<form data-submit="customExercise" class="panel stack mt">
      ${label('Eigene Übung anlegen')}
      <input name="name" value="${esc(pickerQuery.trim())}" required>
      <div class="seg">${Object.entries(EQUIPMENT).map(([k, l], n) => `<label><input type="radio" name="eq" value="${k}" ${n === 0 ? 'checked' : ''}><span>${l.split(' ')[0]}</span></label>`).join('')}</div>
      <select name="muscle">${MUSCLES.map((m) => `<option>${m.id}</option>`).join('')}</select>
      <button class="btn block" type="submit">Anlegen</button></form>` : ''}`;
}

const pickerSheet = () => `${sheetHead('Übung hinzufügen')}
  <label class="search">${icon('search')}<input type="search" placeholder="Suchen oder eigene Übung" value="${esc(pickerQuery)}" data-input="exSearch" autocomplete="off"></label>
  <div class="rows" id="picker-list">${pickerList()}</div>`;

function addExercise(exId) {
  if (picker.mode === 'live') {
    state.live.blocks.push(newBlock([{ exId, sets: 3, reps: '8-12' }]));
    closeSheet();
    save();
    return go(`#/training/live/${state.live.blocks.length - 1}`);
  }
  unit(picker.unitId).items.push({ id: uid(), exId, sets: 3, reps: '8-12', ss: false });
  closeSheet();
  update();
}

// --- Laufendes Training: Kacheln ----------------------------------------------------------------

defineRoute(/^#\/training\/live$/, () => {
  const l = state.live;
  if (!l) return `${pageHead('Training', { back: '#/training' })}${empty('Kein laufendes Training', '', '<a class="btn primary" href="#/training">Zum Training</a>')}`;
  const anyDone = l.blocks.some((b) => blockSetsDone(b));
  return `
  <header class="head sub">
    <a class="icon-btn" href="#/training" aria-label="Zurück">${icon('left')}</a>
    <div class="head-title"><p class="label" data-elapsed="${l.start}">${fmtDuration(Date.now() - l.start)}</p><h1>${esc(l.name)}</h1></div>
    <span class="icon-btn ghost"></span>
  </header>
  <div class="tiles">${l.blocks.map((b, i) => {
    const done = b.phase === 'done';
    const started = blockSetsDone(b) > 0;
    const first = getExercise(b.items[0].exId);
    return `<a class="tile ${done ? 'done' : started ? 'active' : ''}" href="#/training/live/${i}">
      <span class="tile-top">${done ? badge('check', 'green') : exerciseBadge(first)}<span class="label ${b.items.length > 1 ? 'accent' : ''}">${b.items.length > 1 ? 'Superset' : first.m[0] ?? ''}</span></span>
      <span class="tile-name">${b.items.map((it) => esc(getExercise(it.exId).name)).join('<br>')}</span>
      <span class="tile-foot mono">${done ? 'Fertig' : `${blockSetsDone(b)}/${blockSetsTotal(b)} Sätze`}${b.items[0].w ? ` · ${num(b.items[0].w, 2)} kg` : ''}</span>
    </a>`;
  }).join('')}
    <button class="tile add" data-act="pickExerciseLive">${icon('plus')}<span>Übung</span></button>
  </div>
  <button class="btn ${anyDone ? 'primary' : ''} block mt" data-act="finishWorkout">Training beenden</button>
  <button class="btn block ghost danger" data-act="discardWorkout">Verwerfen</button>`;
}, 'training');

// --- Laufendes Training: eine Übung (bzw. ein Superset) ------------------------------------------------

defineRoute(/^#\/training\/live\/(\d+)$/, (bi) => {
  const l = state.live;
  const b = l?.blocks[Number(bi)];
  if (!b) return `${pageHead('Training', { back: '#/training/live' })}${empty('Übung nicht gefunden', '')}`;
  const names = b.items.map((it) => getExercise(it.exId).name);
  const head = `<header class="head sub">
    <a class="icon-btn" href="#/training/live" aria-label="Zur Übersicht">${icon('left')}</a>
    <div class="head-title"><p class="label">${b.items.length > 1 ? 'Superset' : `Übung ${Number(bi) + 1}`}</p><h1>${esc(names.join(' + '))}</h1></div>
    ${b.phase === 'weight' || b.phase === 'done' ? '<span class="icon-btn ghost"></span>' : `<button class="btn small" data-act="finishBlock" data-b="${bi}">Finish</button>`}
  </header>`;

  if (b.phase === 'weight') {
    return `${head}
    ${b.items.map((it, i) => {
      const ex = getExercise(it.exId);
      const last = lastPerformance(it.exId);
      const arrow = { up: 'arrowUp', down: 'arrowDown', hold: 'arrowRight' }[it.tip.dir];
      return `<section class="panel">
        ${b.items.length > 1 ? label(esc(ex.name)) : ''}
        ${last ? `<p class="label">Letztes Mal · ${relDay(last.date)}</p><p class="mono">${setsText(last.sets)}</p>` : ''}
        <p class="tip ${it.tip.dir}">${arrow ? icon(arrow) : ''}<span>${esc(it.tip.text)}</span></p>
        ${ex.eq === 'bw'
          ? `<details class="sub-coll" ${it.w ? 'open' : ''}><summary>Zusatzgewicht (optional) ${icon('chevron', 'coll-ic')}</summary>${weightStepper(bi, i, it)}</details>`
          : `<p class="label mt">Gewicht</p>${weightStepper(bi, i, it)}`}
      </section>`;
    }).join('')}
    <button class="btn primary block xl" data-act="startBlock" data-b="${bi}">Start</button>`;
  }

  if (b.phase === 'done') {
    return `${head}
    <section class="panel">${label('Übung abgeschlossen')}
      ${b.items.map((it) => `<p class="row-title">${esc(getExercise(it.exId).name)}</p><p class="mono muted">${setsText(it.log) || '–'}</p>`).join('')}
    </section>
    <a class="btn primary block xl" href="#/training/live">Weiter zur nächsten Übung</a>
    <button class="btn block mt" data-act="extraSet" data-b="${bi}">${icon('plus')} Noch ein Satz</button>`;
  }

  const it = b.items[b.pos];
  const ex = getExercise(it.exId);
  const setNo = it.log.length + 1;
  const log = `<div class="set-log">${it.log.map((s, k) => `<span><i>${k + 1}</i>${s.w ? `${num(s.w, 2)} × ` : ''}${s.r}${s.p ? ` +${s.p}P` : ''}</span>`).join('')}</div>`;

  if (b.phase === 'reps') {
    const pend = b.pending;
    return `${head}
    <section class="panel center-panel">
      <p class="label">Satz ${setNo} · ${esc(ex.name)}</p>
      <p class="label mt">${ex.timed ? 'Sekunden' : 'Wiederholungen'}</p>
      ${stepper(pend.r, { dec: { act: 'pendStep', attrs: 'data-f="r" data-d="-1"' }, inc: { act: 'pendStep', attrs: 'data-f="r" data-d="1"' }, size: 'xl' })}
      ${ex.timed ? '' : `<p class="label mt">Partials</p>
      ${stepper(pend.p, { dec: { act: 'pendStep', attrs: 'data-f="p" data-d="-1"' }, inc: { act: 'pendStep', attrs: 'data-f="p" data-d="1"' } })}`}
    </section>
    <button class="btn primary block xl" data-act="saveSet" data-b="${bi}">Speichern</button>
    <button class="btn block ghost" data-act="backToSet" data-b="${bi}">Zurück</button>`;
  }

  // phase === 'set'
  return `${head}
  <section class="panel center-panel">
    ${b.items.length > 1 ? `<p class="label accent">${esc(ex.name)}</p>` : ''}
    <p class="set-big mono">Satz ${setNo}<span>/${it.sets}</span></p>
    ${editWeight ? weightStepper(bi, b.pos, it) : `<button class="weight-show" data-act="toggleWeight"><span class="mono">${it.w ? `${num(it.w, 2)} kg` : ex.eq === 'bw' ? 'Körpergewicht' : 'ohne Gewicht'}</span><span class="link">ändern</span></button>`}
    <p class="muted small">Ziel ${fmtReps(it.reps)} ${ex.timed ? 'Sekunden' : 'Wdh.'}</p>
  </section>
  <button class="btn primary block xl" data-act="setDone" data-b="${bi}">Satz fertig</button>
  ${it.log.length ? log : ''}`;
}, 'training');

function weightStepper(bi, i, it) {
  const ex = getExercise(it.exId);
  const step = ex.inc || 2.5;
  return `<div class="stepper xl">
    <button class="step" data-act="liveWeight" data-b="${bi}" data-i="${i}" data-d="-${step}" aria-label="Leichter">${icon('minus')}</button>
    <label class="step-value"><input class="mono" inputmode="decimal" value="${it.w != null ? num(it.w, 2) : ''}" placeholder="0" data-change="liveWeightInput" data-b="${bi}" data-i="${i}"><span>kg</span></label>
    <button class="step" data-act="liveWeight" data-b="${bi}" data-i="${i}" data-d="${step}" aria-label="Schwerer">${icon('plus')}</button>
  </div>`;
}

// --- Verlauf & Übungsfortschritt -------------------------------------------------------------------

defineRoute(/^#\/training\/verlauf\/([\w-]+)$/, (id) => {
  const w = state.workouts.find((x) => x.id === id);
  if (!w) return `${pageHead('Training', { back: '#/training' })}${empty('Nicht gefunden', '')}`;
  return `
  ${pageHead(w.name, { back: '#/training', sub: fmtShort(w.date), right: `<button class="icon-btn" data-act="deleteWorkout" data-id="${w.id}" aria-label="Löschen">${icon('trash')}</button>` })}
  <section class="panel"><div class="cells cells3">
    <div><p class="label">Dauer</p><p class="val">${fmtMin(w.end - w.start)}</p></div>
    <div><p class="label">Sätze</p><p class="val">${setCount(w)}</p></div>
    <div><p class="label">Volumen</p><p class="val">${num(volume(w) / 1000, 1)} t</p></div>
  </div></section>
  ${w.ex.map((e) => `<a class="panel block-link" href="#/training/uebung/${e.exId}"><p class="row-title">${esc(getExercise(e.exId).name)}</p>
    <div class="set-log">${e.sets.map((s, k) => `<span><i>${k + 1}</i>${s.w ? `${num(s.w, 2)} × ` : ''}${s.r}${s.p ? ` +${s.p}P` : ''}</span>`).join('')}</div></a>`).join('')}`;
}, 'training');

defineRoute(/^#\/training\/uebung\/([\w-]+)$/, (id) => {
  const ex = getExercise(id);
  const h = exerciseHistory(id);
  const weighted = h.some((x) => x.best > 0);
  const points = [...h].reverse().map((x) => ({ x: x.date, y: Math.round(score(x) * 10) / 10 }));
  const best = h.length ? Math.max(...h.map(score)) : 0;
  return `
  ${pageHead(ex.name, { back: '#/training', sub: ex.m.join(' · ') })}
  ${h.length ? `
  <section class="panel">
    ${label(weighted ? 'Geschätztes Maximum (1 Wdh.)' : 'Beste Wiederholungen')}
    <p class="big">${num(best, 1)}<span class="unit">${weighted ? 'kg' : 'Wdh.'}</span></p>
    ${lineChart(points, { unit: weighted ? 'kg' : '', digits: 0, bands: state.breaks })}
  </section>
  ${label('Einheiten')}
  <div class="panel flush rows">${h.map((x) => `<a class="row-item" href="#/training/verlauf/${x.workoutId}"><span class="row-main">
    <span class="row-title">${relDay(x.date)}</span><span class="row-sub mono">${setsText(x.sets)}</span></span>${icon('right')}</a>`).join('')}</div>`
  : empty('Noch keine Daten', 'Sobald du die Übung trainiert hast, siehst du hier deinen Fortschritt.')}`;
}, 'training');

// --- Aktionen ---------------------------------------------------------------------------------

function begin(u) {
  if (state.live && !confirm('Es läuft bereits ein Training. Verwerfen und neu starten?')) return;
  startLive(u);
  closeSheet();
  save();
  go('#/training/live');
}

defineActions({
  dayMenu(el) {
    const date = el.dataset.date;
    ws = weekStart(date);
    anchorWs = ws;
    const i = dayIndex(date);
    openSheet(() => dayMenuSheet(i));
  },
  moveDay(el) {
    moveDay(ws, Number(el.dataset.from), Number(el.dataset.to));
    closeSheet();
    update();
    toast('Nur für diese Woche verschoben');
  },
  clearDay(el) {
    setDay(ws, Number(el.dataset.i), null);
    closeSheet();
    update();
  },
  assignDay(el) {
    setDay(ws, Number(el.dataset.i), el.dataset.id);
    closeSheet();
    update();
  },
  resetWeek() {
    resetWeek(ws);
    closeSheet();
    update();
  },
  scheduleSheet() {
    openSheet(scheduleSheet);
  },
  setSchedule(el) {
    state.scheduleSince ??= isoDate();
    if (el.value) state.schedule[el.dataset.i] = el.value;
    else delete state.schedule[el.dataset.i];
    update();
  },
  startPicker() {
    openSheet(startPickerSheet);
  },
  startUnit(el) {
    begin(unit(el.dataset.id));
  },

  newUnit() {
    const u = { id: uid(), name: `Einheit ${String.fromCharCode(65 + state.units.length)}`, items: [] };
    state.units.push(u);
    save();
    go(`#/training/einheit/${u.id}`);
  },
  renameUnit(el) {
    unit(el.dataset.id).name = el.value.trim() || 'Einheit';
    save();
  },
  deleteUnit(el) {
    if (!confirm('Einheit löschen? Der Verlauf bleibt erhalten.')) return;
    const id = el.dataset.id;
    state.units = state.units.filter((u) => u.id !== id);
    for (const k of Object.keys(state.schedule)) if (state.schedule[k] === id) delete state.schedule[k];
    for (const w of Object.values(state.weekPlan)) for (const k of Object.keys(w)) if (w[k] === id) w[k] = null;
    save();
    go('#/training');
  },
  itemSheet(el) {
    const { unit: u, i } = el.dataset;
    openSheet(() => itemSheet(u, Number(i)));
  },
  itemSets(el) {
    const it = unit(el.dataset.unit).items[el.dataset.i];
    it.sets = Math.max(1, Math.min(10, it.sets + Number(el.dataset.d)));
    update();
  },
  itemReps(el) {
    const { min, max } = parseReps(el.value);
    unit(el.dataset.unit).items[el.dataset.i].reps = min === max ? String(min) : `${min}-${max}`;
    update();
  },
  itemSuperset(el) {
    const it = unit(el.dataset.unit).items[el.dataset.i];
    it.ss = !it.ss;
    update();
  },
  itemMove(el) {
    const items = unit(el.dataset.unit).items;
    const i = Number(el.dataset.i);
    const j = i + Number(el.dataset.d);
    [items[i], items[j]] = [items[j], items[i]];
    closeSheet();
    update();
  },
  itemRemove(el) {
    unit(el.dataset.unit).items.splice(Number(el.dataset.i), 1);
    closeSheet();
    update();
  },
  pickExercise(el) {
    picker = { mode: 'unit', unitId: el.dataset.unit };
    pickerQuery = '';
    openSheet(pickerSheet);
  },
  pickExerciseLive() {
    picker = { mode: 'live' };
    pickerQuery = '';
    openSheet(pickerSheet);
  },
  exSearch(el) {
    pickerQuery = el.value;
    document.getElementById('picker-list').innerHTML = pickerList();
  },
  chooseExercise(el) {
    addExercise(el.dataset.id);
  },
  customExercise(form) {
    const fd = new FormData(form);
    const eq = fd.get('eq') || 'free';
    const ex = { id: `c-${uid()}`, name: fd.get('name').trim(), m: [fd.get('muscle')], s: [], inc: 2.5, eq, bw: eq === 'bw' };
    if (!ex.name) return;
    state.customExercises.push(ex);
    addExercise(ex.id);
  },

  liveWeight(el) {
    const it = state.live.blocks[el.dataset.b].items[el.dataset.i];
    it.w = Math.max(0, Math.round(((it.w || 0) + Number(el.dataset.d)) * 100) / 100);
    update();
  },
  liveWeightInput(el) {
    const v = parseNum(el.value);
    state.live.blocks[el.dataset.b].items[el.dataset.i].w = v != null && v >= 0 ? v : null;
    update();
  },
  toggleWeight() {
    editWeight = !editWeight;
    update();
  },
  startBlock(el) {
    unlockAudio();
    const b = state.live.blocks[el.dataset.b];
    b.phase = 'set';
    b.round = 0;
    b.pos = 0;
    editWeight = false;
    update();
  },
  setDone(el) {
    unlockAudio();
    stopRest();
    const b = state.live.blocks[el.dataset.b];
    const it = b.items[b.pos];
    const prev = it.log[it.log.length - 1];
    const lastTime = lastPerformance(it.exId)?.sets[it.log.length];
    b.pending = { r: prev?.r ?? lastTime?.r ?? parseReps(it.reps).max, p: 0 };
    b.phase = 'reps';
    editWeight = false;
    update();
  },
  pendStep(el) {
    const b = state.live.blocks.find((x) => x.phase === 'reps');
    const f = el.dataset.f;
    b.pending[f] = Math.max(0, b.pending[f] + Number(el.dataset.d));
    update();
  },
  backToSet(el) {
    state.live.blocks[el.dataset.b].phase = 'set';
    update();
  },
  saveSet(el) {
    const b = state.live.blocks[el.dataset.b];
    const it = b.items[b.pos];
    it.log.push({ w: it.w || 0, r: b.pending.r, p: b.pending.p });
    const { restAfter } = advance(b);
    if (restAfter || b.phase === 'done') startRest(state.prefs.rest || 120);
    update();
  },
  finishBlock(el) {
    const b = state.live.blocks[el.dataset.b];
    b.phase = 'done';
    save();
    go('#/training/live');
  },
  extraSet(el) {
    const b = state.live.blocks[el.dataset.b];
    b.items.forEach((it) => { it.sets = it.log.length + 1; });
    b.round = Math.min(...b.items.map((it) => it.log.length));
    b.pos = 0;
    b.phase = 'set';
    update();
  },
  finishWorkout() {
    const l = state.live;
    if (!l.blocks.some((b) => blockSetsDone(b))) {
      if (confirm('Noch kein Satz gespeichert. Training verwerfen?')) {
        state.live = null;
        stopRest();
        go('#/training');
      }
      return;
    }
    const saved = finishLive();
    stopRest();
    save();
    go(`#/training/verlauf/${saved.id}`);
    toast('Training gespeichert');
  },
  discardWorkout() {
    if (!confirm('Training verwerfen? Die Eingaben gehen verloren.')) return;
    state.live = null;
    stopRest();
    go('#/training');
  },
  deleteWorkout(el) {
    if (!confirm('Dieses Training löschen?')) return;
    state.workouts = state.workouts.filter((w) => w.id !== el.dataset.id);
    save();
    go('#/training');
  },
  restAdd(el) {
    adjustRest(Number(el.dataset.s));
  },
  restSkip() {
    stopRest();
  },
});

