import { BGM_BASS, BGM_PHRASES } from '../game-data.js';
import { game } from './game-store.js';
import { safeLocalStorageSetItem } from './storage-helpers.js';

function loadMasterVolume() {
  return Math.max(0, Math.min(1, parseFloat(localStorage.getItem('invader_volume') || '0.7')));
}

export function initMasterVolumeFromStorage() {
  game.masterVolume = loadMasterVolume();
}

export function saveVolume() {
  safeLocalStorageSetItem('invader_volume', String(game.masterVolume));
}

export function vibrate(pattern) {
  if (game.settings?.vibration === false) return;
  try { navigator.vibrate && navigator.vibrate(pattern); } catch (e) { }
}

export function initAudio() {
  try { game.audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { }
}

function beep(freq, type, dur, vol, delay = 0) {
  if (!game.audioCtx) return;
  const v = vol * (game.masterVolume ?? 0.7);
  if (v < 0.001) return;
  const o = game.audioCtx.createOscillator(), g = game.audioCtx.createGain();
  o.connect(g); g.connect(game.audioCtx.destination);
  o.type = type;
  o.frequency.setValueAtTime(freq, game.audioCtx.currentTime + delay);
  g.gain.setValueAtTime(v, game.audioCtx.currentTime + delay);
  g.gain.exponentialRampToValueAtTime(0.001, game.audioCtx.currentTime + delay + dur);
  o.start(game.audioCtx.currentTime + delay);
  o.stop(game.audioCtx.currentTime + delay + dur + 0.01);
}

function noiseSound(dur, vol) {
  if (!game.audioCtx) return;
  const v = vol * (game.masterVolume ?? 0.7);
  if (v < 0.001) return;
  const len = Math.floor(game.audioCtx.sampleRate * dur);
  const buf = game.audioCtx.createBuffer(1, len, game.audioCtx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1);
  const src = game.audioCtx.createBufferSource(), g = game.audioCtx.createGain();
  src.buffer = buf; src.connect(g); g.connect(game.audioCtx.destination);
  g.gain.setValueAtTime(v, game.audioCtx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, game.audioCtx.currentTime + dur);
  src.start(); src.stop(game.audioCtx.currentTime + dur + 0.01);
}

export function playSound(type) {
  if (!game.audioCtx) return;
  switch (type) {
    case 'shoot': beep(880, 'square', 0.07, 0.12); break;
    case 'shoot_charge': beep(220, 'sawtooth', 0.05, 0.25); beep(440, 'sawtooth', 0.08, 0.2, 0.05); beep(880, 'square', 0.12, 0.25, 0.1); break;
    case 'shoot_laser': beep(1400, 'sawtooth', 0.12, 0.18); beep(900, 'sawtooth', 0.12, 0.1, 0.02); break;
    case 'shoot_homing': beep(660, 'sine', 0.08, 0.14); beep(880, 'sine', 0.08, 0.1, 0.06); break;
    case 'shoot_expl': beep(350, 'square', 0.1, 0.18); break;
    case 'explosion': noiseSound(0.18, 0.28); beep(100, 'sawtooth', 0.18, 0.18); break;
    case 'boss_hit': beep(180, 'square', 0.08, 0.25); noiseSound(0.04, 0.08); break;
    case 'boss_die': noiseSound(0.5, 0.4);[100, 150, 200, 260, 320, 400, 500, 600].forEach((f, i) => beep(f, 'sawtooth', 0.3, 0.25, i * 0.06)); break;
    case 'powerup': [440, 550, 660, 880].forEach((f, i) => beep(f, 'sine', 0.1, 0.2, i * 0.08)); break;
    case 'upgrade_pick': [660, 880, 1100, 1320].forEach((f, i) => beep(f, 'sine', 0.12, 0.22, i * 0.07)); break;
    case 'player_hit': noiseSound(0.25, 0.35); beep(130, 'sawtooth', 0.25, 0.28); break;
    case 'stage_clear': noiseSound(0.18, 0.28);[523, 659, 784].forEach(f => beep(f, 'sine', 0.0, 0.28, 0));[523, 659, 784, 1047, 1319, 1568].forEach((f, i) => beep(f, 'sine', 0.2, 0.24, 0.06 + i * 0.12)); beep(2093, 'sine', 0.55, 0.22, 0.88); break;
    case 'ssr_stall': beep(55, 'sawtooth', 1.8, 0.12); beep(80, 'sawtooth', 1.4, 0.1, 0.35); beep(120, 'sawtooth', 0.9, 0.08, 0.75); beep(180, 'sine', 0.5, 0.08, 1.15); noiseSound(0.07, 0.13); break;
    case 'ssr_reveal': noiseSound(0.55, 0.5);[523, 659, 784].forEach(f => beep(f, 'sine', 0.0, 0.5, 0));[1047, 1319, 1568, 2093].forEach((f, i) => beep(f, 'sine', 0.2, 0.22, 0.12 + i * 0.1)); beep(2093, 'sine', 0.55, 0.38, 0.58); break;
    case 'login_bonus': [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => beep(f, 'sine', 0.1, 0.18, i * 0.08)); noiseSound(0.06, 0.08); beep(1568, 'sine', 0.4, 0.22, 0.62); break;
    case 'gameover': [440, 370, 330, 220].forEach((f, i) => beep(f, 'square', 0.22, 0.28, i * 0.16)); break;
    case 'healer_die': beep(330, 'sine', 0.08, 0.18); beep(440, 'sine', 0.08, 0.18, 0.06); break;
    case 'event_start': beep(440, 'square', 0.08, 0.2); beep(660, 'square', 0.08, 0.2, 0.1); break;
    case 'dash': beep(600, 'sine', 0.06, 0.15); beep(800, 'sine', 0.04, 0.1, 0.04); break;
    case 'levelup': [523, 659, 784, 523, 659, 784, 1047].forEach((f, i) => beep(f, 'sine', 0.1, 0.25, i * 0.07)); break;
    case 'asteroid_hit': noiseSound(0.12, 0.2); beep(150, 'sawtooth', 0.1, 0.15); break;
    case 'boss_teleport': beep(800, 'sine', 0.04, 0.2); beep(400, 'sine', 0.08, 0.2, 0.04); break;
    case 'boss_shield': beep(300, 'square', 0.1, 0.2); beep(500, 'square', 0.1, 0.2, 0.05); break;
    case 'boss_split': noiseSound(0.3, 0.3); beep(200, 'sawtooth', 0.3, 0.3); break;
    case 'charge_full': beep(1200, 'sine', 0.05, 0.2); break;
    case 'warp': noiseSound(0.12, 0.18); beep(1600, 'sine', 0.04, 0.12); beep(1200, 'sine', 0.06, 0.14, 0.03); beep(900, 'sine', 0.08, 0.16, 0.08); break;
    /** タイトル TAP 確定（短い UI ブリップ） */
    case 'title_tap': beep(920, 'sine', 0.05, 0.12); beep(1320, 'sine', 0.04, 0.1, 0.05); break;
  }
}

// BGM: 2フレーズ交互でループ、サイン波・低音量でアンビエント風
export function startBGM() {
  if (!game.audioCtx || game.bgmOn) return;
  game.bgmOn = true; game.bgmIdx = 0; game.bgmPhraseIdx = 0; game.bgmBassIdx = 0;
  bgmTick(); bgmBassTick();
}

function bgmTick() {
  if (!game.bgmOn) return;
  const phrase = BGM_PHRASES[game.bgmPhraseIdx % BGM_PHRASES.length];
  const [f, ms] = phrase[game.bgmIdx % phrase.length];
  const tempo = Math.max(0.65, 1 - (game.stage - 1) * 0.03);
  const pitch = 1 + Math.floor((game.stage - 1) / 5) * 0.25;
  if (f > 0) beep(f * pitch, 'sine', ms * tempo * 0.001 * 0.75, 0.022);
  const nextIdx = game.bgmIdx + 1;
  if (nextIdx >= phrase.length) { game.bgmIdx = 0; game.bgmPhraseIdx++; }
  else { game.bgmIdx = nextIdx; }
  game.bgmTimer = setTimeout(bgmTick, ms * tempo);
}

function bgmBassTick() {
  if (!game.bgmOn) return;
  const bassLine = BGM_BASS[game.bgmPhraseIdx % BGM_BASS.length];
  const [f, ms] = bassLine[game.bgmBassIdx % bassLine.length];
  const tempo = Math.max(0.65, 1 - (game.stage - 1) * 0.03);
  if (f > 0) beep(f, 'triangle', ms * tempo * 0.001 * 0.7, 0.014);
  game.bgmBassIdx++;
  game.bgmBassTimer = setTimeout(bgmBassTick, ms * tempo);
}

export function stopBGM() {
  game.bgmOn = false;
  if (game.bgmTimer) { clearTimeout(game.bgmTimer); game.bgmTimer = null; }
  if (game.bgmBassTimer) { clearTimeout(game.bgmBassTimer); game.bgmBassTimer = null; }
}
