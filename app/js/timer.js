// Pausentimer und Trainingsdauer. Läuft unabhängig vom Neu-Rendern der Ansichten.

import { state, save } from './store.js';
import { $, fmtDuration, fmtRest } from './util.js';

let audio = null;
let doneUntil = 0;

// iOS erlaubt Ton nur nach einer Nutzeraktion – daher beim Abhaken eines Satzes aufrufen.
export function unlockAudio() {
  try {
    audio ??= new (window.AudioContext || window.webkitAudioContext)();
    if (audio.state === 'suspended') audio.resume();
  } catch {
    audio = null;
  }
}

function beep() {
  if (!audio) return;
  const now = audio.currentTime;
  [0, 0.25].forEach((offset) => {
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.0001, now + offset);
    gain.gain.exponentialRampToValueAtTime(0.35, now + offset + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.18);
    osc.connect(gain).connect(audio.destination);
    osc.start(now + offset);
    osc.stop(now + offset + 0.2);
  });
  navigator.vibrate?.([200, 100, 200]);
}

export function startRest(seconds) {
  if (!state.activeWorkout || !seconds) return;
  state.activeWorkout.restUntil = Date.now() + seconds * 1000;
  save();
  tick();
}

export function adjustRest(delta) {
  const w = state.activeWorkout;
  if (!w?.restUntil) return;
  w.restUntil = Math.max(Date.now() + 1000, w.restUntil + delta * 1000);
  save();
  tick();
}

export function stopRest() {
  if (state.activeWorkout) state.activeWorkout.restUntil = null;
  doneUntil = 0;
  save();
  tick();
}

function tick() {
  document.querySelectorAll('[data-elapsed]').forEach((el) => {
    el.textContent = fmtDuration(Date.now() - Number(el.dataset.elapsed));
  });

  const bar = $('#timer');
  const w = state.activeWorkout;
  let mode = 'hidden';
  if (w?.restUntil) {
    const left = Math.ceil((w.restUntil - Date.now()) / 1000);
    if (left > 0) {
      mode = 'running';
      $('#timer-time').textContent = fmtRest(left);
      $('#timer-label').textContent = 'Pause';
    } else {
      w.restUntil = null;
      save();
      beep();
      doneUntil = Date.now() + 4000;
    }
  }
  if (mode === 'hidden' && Date.now() < doneUntil) {
    mode = 'done';
    $('#timer-time').textContent = 'Los!';
    $('#timer-label').textContent = 'Pause vorbei – nächster Satz';
  }
  bar.dataset.mode = mode;
  document.body.classList.toggle('has-timer', mode !== 'hidden');
}

export function startTicker() {
  tick();
  setInterval(tick, 500);
}
