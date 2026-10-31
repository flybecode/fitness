import { defineRoute, defineActions, update, render } from '../core.js';
import { state, save } from '../store.js';
import { esc, num, uid, isoDate, weekStart, weekNumber, fmtDM, fmtShort, daysBetween, parseNum, relDay } from '../util.js';
import { GOALS } from '../nutrition.js';
import { BREAK_KINDS, inBreak, sortedLog, weeklySeries, checkThisWeek, weightTrend, trendAdvice } from '../progress.js';
import { adherence, trainedExercises } from '../training.js';
import { putPhoto, getPhoto, deletePhoto, prepareImage } from '../photos.js';
import { icon } from '../icons.js';
import { openSheet, closeSheet, sheetHead, toast, pageHead, label, lineChart, sparkline, empty } from '../ui.js';

let editCheck = false;
let compareA = null;

export const fmtRate = (r) => `${r > 0 ? '+' : r < 0 ? '−' : '±'}${num(Math.abs(r), 2)} kg/Woche`;

export function checkPanel() {
  const c = checkThisWeek();
  const ws = weekStart(isoDate());
  if (c && !editCheck) {
    return `<section class="panel">
      ${label(`Check · KW ${weekNumber(ws)}`, '<button class="link" data-act="editCheck">Ändern</button>')}
      <p class="big">${num(c.weight, 1)}<span class="unit">kg</span>${c.bodyfat != null ? `<span class="big-sub mono">${num(c.bodyfat, 1)} % KFA</span>` : ''}</p>
      <p class="muted small">Erledigt ${relDay(c.date).toLowerCase()}. Nächster Check ab Montag.</p>
    </section>`;
  }
  return `<form class="panel attention" data-submit="saveCheck">
    ${label(`Wöchentlicher Check · KW ${weekNumber(ws)}`)}
    <p class="muted small">Am besten morgens nüchtern, immer unter gleichen Bedingungen.</p>
    <div class="cells cells2 tight mt">
      <label class="field"><span class="label">Gewicht (kg)</span><input name="weight" inputmode="decimal" value="${c ? num(c.weight, 1) : ''}" required></label>
      <label class="field"><span class="label">Körperfett % (optional)</span><input name="bodyfat" inputmode="decimal" value="${c?.bodyfat != null ? num(c.bodyfat, 1) : ''}"></label>
    </div>
    <button class="btn primary block mt" type="submit">Speichern</button>
  </form>`;
}

defineRoute(/^#\/progress$/, () => {
  const log = sortedLog();
  const weights = log.filter((e) => e.weight);
  const series = weeklySeries('weight');
  const fat = weeklySeries('bodyfat');
  const first = weights[0];
  const last = weights[weights.length - 1];
  const four = weights.filter((e) => daysBetween(e.date, isoDate()) >= 25).pop();
  const rate = weightTrend();
  const advice = trendAdvice();
  const a = adherence(4);
  const exs = trainedExercises().filter((t) => t.sessions > 1).sort((x, y) => y.change - x.change).slice(0, 4);
  const photos = [...state.photos].sort((x, y) => y.date.localeCompare(x.date));
  const breaks = [...state.breaks].sort((x, y) => y.from.localeCompare(x.from));
  const today = isoDate();

  return `
  ${pageHead('Progress')}
  ${checkPanel()}

  <section class="panel">
    ${label('Gewicht', `<span class="label">Ziel: ${esc(GOALS[state.profile.goal].label)}</span>`)}
    ${last ? `
      <div class="cells cells3">
        <div><p class="label">Aktuell</p><p class="val">${num(last.weight, 1)} kg</p></div>
        <div><p class="label">4 Wochen</p><p class="val">${four ? `${last.weight - four.weight > 0 ? '+' : ''}${num(last.weight - four.weight, 1)}` : '–'}</p></div>
        <div><p class="label">Gesamt</p><p class="val">${first !== last ? `${last.weight - first.weight > 0 ? '+' : ''}${num(last.weight - first.weight, 1)}` : '–'}</p></div>
      </div>
      ${lineChart(series, { unit: 'kg', bands: state.breaks })}
      ${state.breaks.length ? '<p class="muted small">Schraffiert = Pause. Hohle Punkte zählen nicht zum Trend.</p>' : ''}
      ${rate != null ? `<p class="trend mt"><span class="mono">${fmtRate(rate)}</span> ${advice?.ok ? '– passt zum Ziel.' : advice ? `– ${advice.text}` : ''}</p>` : '<p class="muted small mt">Nach etwa zwei Wochen mit Checks erscheint hier dein Trend.</p>'}
      ${advice && !advice.ok && advice.delta ? `<button class="btn block mt" data-act="applyAdjust" data-d="${advice.delta}">Ziel ${advice.delta > 0 ? "+" : "−"}${Math.abs(advice.delta)} kcal übernehmen</button>` : ''}
      <button class="link mt" data-act="logSheet">Alle Einträge</button>`
    : '<p class="muted small">Noch kein Gewicht eingetragen.</p>'}
  </section>

  ${fat.length ? `<section class="panel">${label('Körperfett')}<p class="big">${num(fat[fat.length - 1].y, 1)}<span class="unit">%</span></p>${lineChart(fat, { unit: '%', bands: state.breaks })}</section>` : ''}

  <section class="panel">
    ${label('Training', '<a class="link" href="#/training">Details</a>')}
    <div class="cells cells2">
      <div><p class="label">Quote 4 Wochen</p><p class="val">${a.pct != null ? `${Math.round(a.pct * 100)} %` : '–'}</p></div>
      <div><p class="label">Trainings gesamt</p><p class="val">${state.workouts.length}</p></div>
    </div>
    ${exs.length ? `<div class="rows mt">${exs.map((t) => `<a class="row-item" href="#/training/uebung/${t.id}"><span class="row-main"><span class="row-title">${esc(t.ex.name)}</span></span>
      ${sparkline(t.series.map((s) => s.y))}<span class="mono change ${t.change > 0.005 ? 'up' : t.change < -0.005 ? 'down' : ''}">${t.change > 0 ? '+' : ''}${Math.round(t.change * 100)} %</span></a>`).join('')}</div>`
    : '<p class="muted small mt">Ab der zweiten Einheit pro Übung siehst du hier, wie du stärker wirst.</p>'}
  </section>

  <section class="panel">
    ${label('Fotos · optional', `<label class="link">${icon('plus')} Foto<input type="file" accept="image/*" hidden data-change="addPhoto"></label>`)}
    ${photos.length ? `<div class="photos">${photos.map((p) => `<button class="photo" data-act="openPhoto" data-id="${p.id}"><img src="${p.thumb}" alt="Foto vom ${fmtShort(p.date)}"><span class="mono">${fmtDM(p.date)}</span></button>`).join('')}</div>
      ${photos.length > 1 ? '<p class="muted small mt">Foto antippen, um es mit einem anderen zu vergleichen.</p>' : ''}`
    : '<p class="muted small">Fotos bleiben nur auf diesem Gerät. Am besten alle 2–4 Wochen, gleiches Licht, gleiche Pose.</p>'}
  </section>

  <section class="panel">
    ${label('Pausen · Urlaub, Reise, Krankheit', '<button class="link" data-act="breakSheet">' + icon('plus') + ' Eintragen</button>')}
    ${breaks.length ? `<div class="rows">${breaks.map((b) => `<div class="row-item">
      <span class="row-main"><span class="row-title">${BREAK_KINDS[b.kind]}${b.note ? ` · ${esc(b.note)}` : ''}</span>
      <span class="row-sub mono">${fmtDM(b.from)} – ${fmtDM(b.to)}${b.from <= today && today <= b.to ? ' · läuft' : ''}</span></span>
      <button class="icon-btn small" data-act="deleteBreak" data-id="${b.id}" aria-label="Löschen">${icon('x')}</button></div>`).join('')}</div>`
    : ''}
    <p class="muted small ${breaks.length ? 'mt' : ''}">Pausen werden bei Trainingsquote, Hinweisen und Gewichtstrend herausgerechnet.</p>
  </section>`;
}, 'progress');

function logSheet() {
  const log = sortedLog().reverse();
  return `${sheetHead('Einträge')}
    <div class="rows">${log.map((e) => `<div class="row-item"><span class="row-main"><span class="row-title mono">${num(e.weight, 1)} kg${e.bodyfat != null ? ` · ${num(e.bodyfat, 1)} %` : ''}</span>
      <span class="row-sub">${fmtShort(e.date)}${inBreak(e.date) ? ' · Pause' : ''}</span></span>
      <button class="icon-btn small" data-act="deleteLog" data-date="${e.date}">${icon('x')}</button></div>`).join('')}</div>`;
}

function breakSheet() {
  const today = isoDate();
  return `${sheetHead('Pause eintragen')}
    <form data-submit="saveBreak" class="stack">
      <div class="seg">${Object.entries(BREAK_KINDS).map(([k, l], i) => `<label><input type="radio" name="kind" value="${k}" ${i === 0 ? 'checked' : ''}><span>${l}</span></label>`).join('')}</div>
      <div class="cells cells2 tight">
        <label class="field"><span class="label">Von</span><input type="date" name="from" value="${today}" required></label>
        <label class="field"><span class="label">Bis</span><input type="date" name="to" value="${today}" required></label>
      </div>
      <label class="field"><span class="label">Notiz (optional)</span><input name="note" placeholder="z. B. Mallorca"></label>
      <button class="btn primary block" type="submit">Speichern</button>
    </form>`;
}

async function photoSheet(id) {
  const p = state.photos.find((x) => x.id === id);
  const blob = await getPhoto(id);
  const url = blob ? URL.createObjectURL(blob) : p.thumb;
  const other = compareA && compareA !== id ? state.photos.find((x) => x.id === compareA) : null;
  let otherUrl = null;
  if (other) {
    const b2 = await getPhoto(other.id);
    otherUrl = b2 ? URL.createObjectURL(b2) : other.thumb;
  }
  openSheet(() => `${sheetHead(other ? 'Vergleich' : fmtShort(p.date))}
    ${other ? `<div class="compare">
        <figure><img src="${otherUrl}" alt=""><figcaption class="mono">${fmtDM(other.date)}</figcaption></figure>
        <figure><img src="${url}" alt=""><figcaption class="mono">${fmtDM(p.date)}</figcaption></figure>
      </div>
      <p class="muted small mt">${Math.abs(daysBetween(other.date, p.date))} Tage dazwischen</p>
      <button class="btn block mt" data-act="clearCompare">Vergleich beenden</button>`
    : `<img class="photo-full" src="${url}" alt="">
      ${state.photos.length > 1 ? `<button class="btn block mt" data-act="setCompare" data-id="${id}">Mit anderem Foto vergleichen</button>` : ''}
      <button class="btn block mt danger" data-act="deletePhoto" data-id="${id}">Löschen</button>`}`);
}

defineActions({
  editCheck() {
    editCheck = true;
    update();
  },
  saveCheck(form) {
    const fd = new FormData(form);
    const weight = parseNum(fd.get('weight'));
    const bodyfat = parseNum(fd.get('bodyfat'));
    if (!(weight > 30 && weight < 300)) return toast('Bitte ein gültiges Gewicht eintragen');
    const today = isoDate();
    const existing = checkThisWeek();
    const date = existing?.date ?? today;
    state.bodyLog = state.bodyLog.filter((e) => e.date !== date);
    state.bodyLog.push({ date, weight, ...(bodyfat != null && bodyfat > 2 && bodyfat < 60 ? { bodyfat } : {}) });
    editCheck = false;
    update();
    toast('Check gespeichert');
  },
  logSheet() {
    openSheet(logSheet);
  },
  deleteLog(el) {
    if (!confirm('Eintrag löschen?')) return;
    state.bodyLog = state.bodyLog.filter((e) => e.date !== el.dataset.date);
    update();
  },
  applyAdjust(el) {
    state.profile.kcalAdjust = (state.profile.kcalAdjust || 0) + Number(el.dataset.d);
    state.profile.lastAdjust = isoDate();
    update();
    toast('Kalorienziel angepasst');
  },
  breakSheet() {
    openSheet(breakSheet);
  },
  saveBreak(form) {
    const fd = new FormData(form);
    let from = fd.get('from');
    let to = fd.get('to');
    if (to < from) [from, to] = [to, from];
    state.breaks.push({ id: uid(), kind: fd.get('kind'), from, to, note: fd.get('note').trim() });
    closeSheet();
    update();
  },
  deleteBreak(el) {
    if (!confirm('Pause löschen?')) return;
    state.breaks = state.breaks.filter((b) => b.id !== el.dataset.id);
    update();
  },
  async addPhoto(el) {
    const file = el.files?.[0];
    el.value = '';
    if (!file) return;
    try {
      const { blob, thumb } = await prepareImage(file, 1600, 300);
      const id = uid();
      await putPhoto(id, blob);
      state.photos.push({ id, date: isoDate(), thumb });
      save();
      render();
      toast('Foto gespeichert');
    } catch (e) {
      console.error(e);
      toast('Foto konnte nicht gespeichert werden');
    }
  },
  openPhoto(el) {
    photoSheet(el.dataset.id);
  },
  setCompare(el) {
    compareA = el.dataset.id;
    closeSheet();
    toast('Jetzt das zweite Foto antippen');
  },
  clearCompare() {
    compareA = null;
    closeSheet();
  },
  async deletePhoto(el) {
    if (!confirm('Foto löschen?')) return;
    const id = el.dataset.id;
    await deletePhoto(id).catch(() => {});
    state.photos = state.photos.filter((p) => p.id !== id);
    closeSheet();
    update();
  },
});
