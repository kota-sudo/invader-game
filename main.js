import {
  getPlanet,
  getWorldInfo,
  getPlanetEnemyColors,
  ENEMY_PREVIEW_COLORS,
  ENEMY_PREVIEW_LABELS,
  getStageEnemyTypes,
  drawEnemyPreviewIcon,
  BGM_PHRASES,
  BGM_BASS,
  WEAPONS,
  WEAPON_LABEL,
  WEAPON_COLOR,
  UPGRADE_POOL,
  GACHA_POOL,
  RARITY_COLORS,
  LR_RAINBOW,
  getLRColor,
  appendColorAlpha,
  CHAR_POOL,
  EQUIP_POOL,
  PET_POOL,
  WEAPON_GACHA_POOL,
  PREMIUM_POOL,
  PICKUP_ROTATION,
  currentPickupId,
  ALL_GACHA_POOL,
  EXP_TABLE,
  LEVEL_BONUSES,
  EVENT_LIST,
  SHIP_SHAPES,
  SHIP_COLORS,
  SHIP_TRAITS,
  SHIP_WEAPONS,
  ACHIEVEMENT_DEFS,
  BOSS_NAMES,
  MISSION_POOL,
  NORMAL_QUEST_POOL,
  MAT_LABEL,
  MAT_COLOR,
  UPGRADE_LV_COSTS,
  SHOP_MAX_LV,
  SHOP_ITEMS,
  STAGE_TYPE_LABELS,
  STAGE_TYPE_DESCS,
  STAGE_TYPE_COLORS,

} from './js/game-data.js';
import { getStageSelectShipTarget, getStageSelectShipFollowStage } from './js/game/stage-select-map-geometry.js';
import {
  CHARGE_MAX,
  WAVE_CLEAR_DELAY,
  INVADER_W,
  INVADER_H,
  POWERUP_DURATION,
  BULLET_SPEED,
  INVADER_BULLET_SPEED,
  PLAYER_SPEED_BASE
} from './js/game/constants.js';
import { keys, bindDocumentKeys, bindCanvasPointer, bindCanvasTouch } from './js/game/input.js';
import { paintFrame } from './js/game/draw-dispatch.js';
import { runUpdate } from './js/game/update-tick.js';
import { game, actions, setTitleBgQuality } from './js/game/game-store.js';
import { drawShopHex, shopHexPan, shopHexZoomAt, setShopHexSel, clearShopHexSel, getShopHexSel, resetShopHexCamera, setShopHexOverview, triggerShopHexBurst, getShopHexNodeInfo } from './js/game/draw-shop-hex.js';
import {
  setDrawDependencies as setScreenDrawDeps,
  drawUpgradeScreen,
  drawStageSelectScreen,
  drawCustomizeScreen,
  drawMissionsScreen,
  drawLoadoutScreen,
  drawBossSelectScreen,
  drawModeSelectScreen,
  drawMapScreen,
  drawGachaScreen,
  drawGachaRatesModalIfOpen,
  drawGachaResult,
  drawGachaSummary,
  drawGachaRates,
  drawStardustShop,
  drawShopScreen,
  drawNotificationsScreen,
  drawSettingsScreen,
  drawInboxScreen,
  drawEventsScreen,
  drawIAPScreen,
  drawStageResult
} from './js/draw/draw-screens.js';
import {
  setDrawDependencies as setEntityDrawDeps,
  drawPlayer,
  drawMuzzleFlashes,
  drawUFODrone,
  drawSpider,
  drawCrystal,
  drawHeavy,
  drawInvaders,
  drawHealers,
  drawAsteroids,
  drawMeteors,
  drawBoss,
  drawMiniBosses,
  drawUFO,
  drawPowerups,
  drawBullets,
  drawBossMinions,
  drawPets,
  drawDashTrail
} from './js/draw/draw-entities.js';
import {
  setDrawDependencies as setUIDrawDeps,
  drawUIButtons,
  drawPauseOverlay,
  drawGameOverOverlay,
  drawCriticalVignette,
  drawJoystick,
  drawSkillChoice,
  drawScreenFlash,
  drawVignette,
  drawStarfield,
  drawTitleDistantSilhouette,
  drawTitlePlanets,
  drawTitleWarp,
  drawTitle,
  updateDamageNumbers,
  drawDamageNumbers,
  drawParticles,
  drawGroundLine,
  drawHUD,
  drawLifeGainDisplay,
  drawLevelUpDisplay,
  drawEventBanner,
  drawMatPopups,
  drawStageClearAnim,
  drawBossWarning,
  drawStageBanner,
  drawHitFlash,
  drawScanlines,
  drawEscortShip,
  drawSurvivalTimer,
  drawWaveBanner
} from './js/draw/draw-ui.js';

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
/** 古いブラウザ／一部環境で roundRect 未実装だと描画ループが止まるため */
if (typeof CanvasRenderingContext2D !== 'undefined' && typeof CanvasRenderingContext2D.prototype.roundRect !== 'function') {
  CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
    const rr = Math.min(Math.max(0, +r || 0), Math.abs(w) / 2, Math.abs(h) / 2);
    this.moveTo(x + rr, y);
    this.lineTo(x + w - rr, y);
    this.quadraticCurveTo(x + w, y, x + w, y + rr);
    this.lineTo(x + w, y + h - rr);
    this.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
    this.lineTo(x + rr, y + h);
    this.quadraticCurveTo(x, y + h, x, y + h - rr);
    this.lineTo(x, y + rr);
    this.quadraticCurveTo(x, y, x + rr, y);
    this.closePath();
    return this;
  };
}
const scoreEl = document.getElementById('score');
const livesEl = document.getElementById('lives');
const stageEl = document.getElementById('stage');
const messageEl = document.getElementById('message');
const W = canvas.width, H = canvas.height;
let _quitConfirm = false;

// ===== 燃料（スタミナ）=====
const FUEL_CAP = 10;
const FUEL_COST_PER_RUN = 1;
/** ゲームオーバー時のコンティニュー（同一ステージ先頭から再開）。★はそのクリアで更新されない */
const CONTINUE_GEM_COST = 10;
const FUEL_REGEN_MS = 30 * 60 * 1000; // 30分で1回復
const FUEL_DAILY_GRANT = 5; // デイリー配布（カスタム：初期値）
const FUEL_GEM_COST = 1; // 燃料不足時、💎で出撃（1回あたり）

function saveFuel() {
  try {
    localStorage.setItem('invader_fuel', String(Math.max(0, Math.floor(game.fuel || 0))));
    localStorage.setItem('invader_fuel_ts', String(Math.floor(game.fuelTs || Date.now())));
    localStorage.setItem('invader_fuel_daily', String(game.fuelDaily || ''));
  } catch (e) { }
}
function _fmtMMSS(ms) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const mm = String(Math.floor(s / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}
function syncFuel(now = Date.now()) {
  if (!Number.isFinite(game.fuel)) game.fuel = FUEL_CAP;
  if (!Number.isFinite(game.fuelTs) || game.fuelTs <= 0) game.fuelTs = now;

  // 日付更新でデイリー配布（端末ローカル日付）
  const today = getLocalDateKey();
  if (game.fuelDaily !== today) {
    game.fuelDaily = today;
    const before = game.fuel || 0;
    if (before < FUEL_CAP) {
      game.fuel = Math.min(FUEL_CAP, before + FUEL_DAILY_GRANT);
      if (game.fuel > before) {
        game.lifeGainDisplay = { text: `⛽ 燃料 +${game.fuel - before}（デイリー配布）`, timer: 160, color: '#44ddff' };
      }
    }
    saveFuel();
  }

  // 自然回復（オフラインも含む）
  if ((game.fuel || 0) >= FUEL_CAP) {
    game.fuel = FUEL_CAP;
    game.fuelTs = now;
    return;
  }
  const elapsed = Math.max(0, now - game.fuelTs);
  const gain = Math.floor(elapsed / FUEL_REGEN_MS);
  if (gain > 0) {
    game.fuel = Math.min(FUEL_CAP, (game.fuel || 0) + gain);
    game.fuelTs = game.fuelTs + gain * FUEL_REGEN_MS;
    if (game.fuel >= FUEL_CAP) game.fuelTs = now;
    saveFuel();
  }
}
function fuelNextRegenMs(now = Date.now()) {
  syncFuel(now);
  if ((game.fuel || 0) >= FUEL_CAP) return 0;
  const base = Number.isFinite(game.fuelTs) ? game.fuelTs : now;
  const passed = Math.max(0, now - base);
  const rem = FUEL_REGEN_MS - (passed % FUEL_REGEN_MS);
  return rem;
}
function addFuel(n) {
  if (!Number.isFinite(n) || n === 0) return;
  syncFuel();
  game.fuel = Math.max(0, Math.min(FUEL_CAP, (game.fuel || 0) + Math.floor(n)));
  if (game.fuel >= FUEL_CAP) game.fuelTs = Date.now();
  saveFuel();
  updateHUD();
}
function tryConsumeFuelForRun() {
  syncFuel();
  const have = game.fuel || 0;
  if (have >= FUEL_COST_PER_RUN) {
    game.fuel = have - FUEL_COST_PER_RUN;
    saveFuel();
    updateHUD();
    return true;
  }
  const rem = fuelNextRegenMs();
  const msg = `燃料不足（0/${FUEL_CAP}） 次回復: ${_fmtMMSS(rem)}`;
  // 💎で購入して出撃（2タップ確認）
  if ((game.gems || 0) >= FUEL_GEM_COST) {
    const now = Date.now();
    if (game.fuelGemConfirm && (now - game.fuelGemConfirm) < 3000) {
      game.fuelGemConfirm = 0;
      game.gems -= FUEL_GEM_COST;
      saveGems();
      updateHUD();
      game.lifeGainDisplay = { text: `💎${FUEL_GEM_COST} で燃料を補給して出撃`, timer: 160, color: '#cc88ff' };
      return true;
    }
    game.fuelGemConfirm = now;
    game.lifeGainDisplay = { text: `${msg}  ·  💎${FUEL_GEM_COST}で補給して出撃（もう一度タップ）`, timer: 220, color: '#ff6644' };
    return false;
  }
  game.lifeGainDisplay = { text: msg, timer: 220, color: '#ff6644' };
  return false;
}
/** ステージ選択から出撃へ進める燃料／💎補給の可否（描画・クリック判定用） */
function stageSelectFuelLaunchOk() {
  syncFuel();
  if ((game.fuel || 0) >= FUEL_COST_PER_RUN) return true;
  if ((game.gems || 0) >= FUEL_GEM_COST) return true;
  return false;
}

function getTheme() {
  const p = getPlanet(game.stage);
  return { bg: p.bg, accent: p.accent, nebula: p.nebula, ground: p.ground };
}

function formatStageId(stageNum) {
  const s = Math.max(1, Math.floor(stageNum || 1));
  const w = Math.floor((s - 1) / 10) + 1;
  const local = ((s - 1) % 10) + 1;
  return `${w}-${local}`;
}

// ===== 画像（簡易キャッシュ）=====
const _imgCache = new Map();
function getImage(src) {
  if (_imgCache.has(src)) return _imgCache.get(src);
  const img = new Image();
  img.src = src;
  _imgCache.set(src, img);
  return img;
}

// ===== 武器（ロードアウト由来の弾薬・WEAPONS 定数は game-data）=====
function currentWeapon() { return WEAPONS[game.weaponIdx]; }
function cycleWeapon() {
  for (let i = 1; i <= WEAPONS.length; i++) {
    const next = (game.weaponIdx + i) % WEAPONS.length;
    const w = WEAPONS[next];
    if (w === 'normal' || game.weaponAmmo[w] > 0) { game.weaponIdx = next; return; }
  }
}
function getAvailableWeapons() { return WEAPONS.filter(w => w === 'normal' || game.weaponAmmo[w] > 0); }

// ===== 音声 =====
function _loadVolume() { return Math.max(0, Math.min(1, parseFloat(localStorage.getItem('invader_volume') || '0.7'))); }
function saveVolume() { try { localStorage.setItem('invader_volume', String(game.masterVolume)); } catch (e) { } }
game.masterVolume = _loadVolume();

function vibrate(pattern) { if (game.settings?.vibration === false) return; try { navigator.vibrate && navigator.vibrate(pattern); } catch (e) { } }

function initAudio() {
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
function playSound(type) {
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
  }
}

// BGM
// BGM: 2フレーズ交互でループ、サイン波・低音量でアンビエント風
function startBGM() {
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
function stopBGM() {
  game.bgmOn = false;
  if (game.bgmTimer) { clearTimeout(game.bgmTimer); game.bgmTimer = null; }
  if (game.bgmBassTimer) { clearTimeout(game.bgmBassTimer); game.bgmBassTimer = null; }
}

function isUpgradeMaxed(id) {
  switch (id) {
    case 'speed': return game.playerUpgrades.speed >= 4;
    case 'firerate': return game.playerUpgrades.firerate >= 4;
    case 'damage': return game.playerUpgrades.damage >= 5;
    case 'bulletspd': return game.playerUpgrades.bulletSpd >= 9;
    case 'spread': return game.playerUpgrades.spread;
    default: return false;
  }
}
function pickUpgradeChoices() {
  // 上限済みを除外し、未出現を優先する
  const available = UPGRADE_POOL.filter(u => !isUpgradeMaxed(u.id));
  const unseen = available.filter(u => !game.seenUpgradeIds.has(u.id));
  const seen = available.filter(u => game.seenUpgradeIds.has(u.id));
  const pool = [...unseen.sort(() => Math.random() - 0.5), ...seen.sort(() => Math.random() - 0.5)];
  // 既出かつ上限未満のものは「強化版」ラベルを付与
  game.upgradeChoices = pool.slice(0, 3).map(u => {
    if (game.seenUpgradeIds.has(u.id) && !isUpgradeMaxed(u.id)) {
      return { ...u, label: u.label + ' ++', enhanced: true };
    }
    return { ...u, enhanced: false };
  });
}
function applyUpgrade(idx) {
  if (idx >= game.upgradeChoices.length) return;
  const up = game.upgradeChoices[idx];
  const mult = up.enhanced ? 2 : 1;
  game.seenUpgradeIds.add(up.id);
  playSound('upgrade_pick');
  switch (up.id) {
    case 'speed': game.playerUpgrades.speed = Math.min(game.playerUpgrades.speed + mult, 4); break;
    case 'firerate': game.playerUpgrades.firerate = Math.min(game.playerUpgrades.firerate + mult, 4); break;
    case 'life': game.playerStats.hp = Math.min(game.playerStats.maxHp, game.playerStats.hp + 30 * mult); updateHUD(); break;
    case 'laser': game.weaponAmmo.laser += 15 * mult; break;
    case 'homing': game.weaponAmmo.homing += 8 * mult; break;
    case 'explosive': game.weaponAmmo.explosive += 8 * mult; break;
    case 'damage': game.playerUpgrades.damage = Math.min(game.playerUpgrades.damage + mult, 5); break;
    case 'spread': game.playerUpgrades.spread = true; break;
    case 'invincible': game.playerUpgrades.invincibleBonus += 60 * mult; break;
    case 'bulletspd': game.playerUpgrades.bulletSpd = Math.min(game.playerUpgrades.bulletSpd + 3 * mult, 9); break;
    case 'shieldUp': game.playerShield = true; break;
  }
  genMapRoutes();
  game.state = 'map';
}


function saveCoins() { localStorage.setItem('invader_coins', game.coins); }
function saveGems() { localStorage.setItem('invader_gems', String(game.gems)); }
function addGems(amount) { game.gems += amount; saveGems(); updateHUD(); }
function saveGachaData() {
  localStorage.setItem('invader_gacha_inv', JSON.stringify(game.gachaInventory));
  localStorage.setItem('invader_gacha_mat', JSON.stringify(game.gachaMaterials));
  localStorage.setItem('invader_stardust', String(game.gachaStardust));
}

function ensureAllCharsUpgradable() {
  // ユーザー要望: 全キャラを強化できるようにする（未所持でもLv1として解放）
  // char_basic(ROOKIE) は例外で強化不可のまま
  if (!game.gachaInventory || typeof game.gachaInventory !== 'object') game.gachaInventory = {};
  let changed = false;
  for (const c of CHAR_POOL) {
    if (!c || !c.id || c.id === 'char_basic') continue;
    if (!game.gachaInventory[c.id]) {
      game.gachaInventory[c.id] = { level: 1 };
      changed = true;
    } else if (!game.gachaInventory[c.id].level) {
      game.gachaInventory[c.id].level = 1;
      changed = true;
    }
  }
  if (changed) saveGachaData();
}

function ensureAllEquipsOwnedForTest() {
  // ユーザー要望: 装備画面を試すため、全装備を所持状態にする（Lv1）
  if (!game.gachaInventory || typeof game.gachaInventory !== 'object') game.gachaInventory = {};
  let changed = false;
  for (const e of EQUIP_POOL) {
    if (!e || !e.id) continue;
    if (!game.gachaInventory[e.id]) {
      game.gachaInventory[e.id] = { level: 1 };
      changed = true;
    } else if (!game.gachaInventory[e.id].level) {
      game.gachaInventory[e.id].level = 1;
      changed = true;
    }
  }
  if (changed) saveGachaData();
}
function addCoins(amount) {
  const boost = (game.gachaInventory['passive_coin']?.level >= 1 ? 1.25 : 1) * (getPetEffect('fairy') ? 1.2 : 1);
  game.coins += Math.floor(amount * boost);
  saveCoins();
  const el = document.getElementById('coins');
  if (el) el.textContent = game.coins;
}
function gachaRollRarity(forceSR = false, forceSSR = false, forceLR = false) {
  if (forceSSR) return 'SSR';
  const r = Math.random();
  if (forceSR) return r < 0.25 ? 'SSR' : 'SR';
  if (r < 0.05) return 'SSR';
  if (r < 0.20) return 'SR';
  if (r < 0.50) return 'R';
  return 'N';
}
function premiumRollRarity(forceSR = false, forceSSR = false, forceLR = false) {
  if (forceLR) return 'LR';
  if (forceSSR) return 'SSR';
  const r = Math.random();
  if (forceSR) return r < 0.40 ? 'SSR' : 'SR';
  if (r < 0.015) return 'LR';
  if (r < 0.20) return 'SSR';
  if (r < 0.75) return 'SR';
  return 'R';
}
function gachaRollOne(forceSR = false, forceSSR = false, forceLR = false) {
  const rarity = gachaRollRarity(forceSR, forceSSR, forceLR);
  const pool = ALL_GACHA_POOL.filter(i => i.rarity === rarity);
  return pool[Math.floor(Math.random() * pool.length)] || ALL_GACHA_POOL[0];
}
function premiumRollOne(forceSR = false, forceSSR = false, forceLR = false) {
  const rarity = premiumRollRarity(forceSR, forceSSR, forceLR);
  let pool = PREMIUM_POOL.filter(i => i.rarity === rarity);
  // ピックアップ: 対象レアリティ内で50%確率でフィーチャーアイテム優先
  if (rarity === 'SSR' && Math.random() < 0.5) {
    const pk = PREMIUM_POOL.find(i => i.id === currentPickupId && i.rarity === 'SSR');
    if (pk) return pk;
  }
  return pool[Math.floor(Math.random() * pool.length)] || PREMIUM_POOL[0];
}
function doPremiumPull(count) {
  const cost = count === 1 ? 5 : 50; // gems
  if (game.gems < cost) return false;
  game.gems -= cost; saveGems(); updateHUD();
  game.gachaResults = []; game.gachaNewItems = new Set(); game.gachaIsPremium = true;
  let hasSR = false;
  for (let i = 0; i < count; i++) {
    const forcePity = game.premiumPityCount >= 50;
    const forceLRPity = game.premiumLrPityCount >= 100;
    const force10SR = count === 10 && i === 9 && !hasSR;
    const item = premiumRollOne(force10SR, forcePity && !forceLRPity, forceLRPity);
    game.premiumPityCount++;
    game.premiumLrPityCount++;
    if (item.rarity === 'LR') { game.premiumPityCount = 0; game.premiumLrPityCount = 0; }
    else if (item.rarity === 'SSR') game.premiumPityCount = 0;
    if (item.rarity === 'LR' || item.rarity === 'SSR' || item.rarity === 'SR') hasSR = true;
    game.gachaResults.push(item);
    addGachaItem(item);
  }
  savePremiumPity(); saveLrPity();
  game.gachaCurrentIdx = 0; game.gachaAnimFrame = 0;
  game.state = 'gacha_result';
  playSound('warp');
  return true;
}
// デイリーガチャ
function canDailyGacha() {
  return localStorage.getItem('invader_daily_gacha') !== new Date().toISOString().split('T')[0];
}
function doDailyGacha() {
  if (!canDailyGacha()) return;
  // N〜R限定
  const pool = ALL_GACHA_POOL.filter(i => i.rarity === 'R' || i.rarity === 'N');
  if (!pool.length) return;
  localStorage.setItem('invader_daily_gacha', new Date().toISOString().split('T')[0]);
  const item = pool[Math.floor(Math.random() * pool.length)];
  game.gachaResults = [item]; game.gachaNewItems = new Set(); game.gachaIsPremium = false;
  addGachaItem(item);
  game.gachaCurrentIdx = 0; game.gachaAnimFrame = 0;
  game.state = 'gacha_result';
  playSound('powerup');
}
function addGachaItem(item) {
  if (!item || !item.id || !item.rarity) return;
  const isNew = !game.gachaInventory[item.id];
  if (isNew) {
    game.gachaInventory[item.id] = { level: 1, mat: 0 };
    game.gachaNewItems.add(item.id);
  } else if (game.gachaInventory[item.id].level < 30) {
    game.gachaInventory[item.id].mat = (game.gachaInventory[item.id].mat || 0) + 1;
    game.gachaMaterials[item.rarity] = (game.gachaMaterials[item.rarity] || 0) + 1;
  } else {
    game.gachaStardust += { LR: 200, SSR: 50, SR: 20, R: 10, N: 5 }[item.rarity] || 5;
  }
  saveGachaData();
}
function getLevelUpCost(item) {
  const inv = game.gachaInventory[item.id]; if (!inv) return null;
  const lv = inv.level || 1;
  if (lv >= 30) return null;
  const dustCost = { LR: 50, SSR: 20, SR: 10, R: 5, N: 2 }[item.rarity] * (1 + Math.floor(lv / 5));
  const coinCost = 200 * (1 + Math.floor(lv / 10));
  return { dust: dustCost, coins: coinCost };
}
function tryLevelUpItem(item) {
  if (!item || !game.gachaInventory[item.id]) return;
  const cost = getLevelUpCost(item);
  if (!cost) return;
  if (game.gachaStardust < cost.dust || game.coins < cost.coins) return;
  // 強化前→後の増加分を記録（表示用）
  try {
    const inv = game.gachaInventory[item.id];
    const lv = inv?.level || 1;
    const b = (lv - 1) * 0.01;
    const next = Math.min(0.29, b + 0.01);
    const lines = [];
    if (item.type === 'weapon') {
      const base = item.ammo || 0;
      const now = Math.max(0, Math.round(base * (1 + b)));
      const nxt = Math.max(0, Math.round(base * (1 + next)));
      if (nxt !== now) lines.push({ l: '弾数', d: `+${nxt - now}` });
    } else if (item.type === 'char') {
      const hp0 = item.hp || 0, def0 = item.def || 0, crit0 = item.crit || 0, spd0 = item.spd || 0;
      const atk0 = item.atk || 1;
      const nowHp = Math.round(applyLevelToStatAdd(hp0, b));
      const nxtHp = Math.round(applyLevelToStatAdd(hp0, next));
      if (nxtHp !== nowHp) lines.push({ l: 'HP', d: `+${nxtHp - nowHp}` });
      const nowAtk = applyLevelToAtkMult(atk0, b);
      const nxtAtk = applyLevelToAtkMult(atk0, next);
      if (nxtAtk !== nowAtk) lines.push({ l: 'ATK', d: `+${Math.round((nxtAtk - nowAtk) * 100) / 100}` });
      const nowDef = Math.round(applyLevelToStatAdd(def0, b));
      const nxtDef = Math.round(applyLevelToStatAdd(def0, next));
      if (nxtDef !== nowDef) lines.push({ l: 'DEF', d: `+${nxtDef - nowDef}%` });
      const nowC = Math.round(applyLevelToStatAdd(crit0, b));
      const nxtC = Math.round(applyLevelToStatAdd(crit0, next));
      if (crit0 && nxtC !== nowC) lines.push({ l: 'CRIT', d: `+${nxtC - nowC}%` });
      const nowS = Math.round(applyLevelToStatAdd(spd0, b));
      const nxtS = Math.round(applyLevelToStatAdd(spd0, next));
      if (spd0 && nxtS !== nowS) lines.push({ l: 'SPD', d: `+${nxtS - nowS}` });
    } else if (item.type === 'equip') {
      const hp0 = item.hp || 0, def0 = item.def || 0, crit0 = item.crit || 0, spd0 = item.spd || 0;
      const atk0 = item.atk || 1;
      const nowHp = Math.round(applyLevelToStatAdd(hp0, b));
      const nxtHp = Math.round(applyLevelToStatAdd(hp0, next));
      if (hp0 && nxtHp !== nowHp) lines.push({ l: 'HP', d: `+${nxtHp - nowHp}` });
      const nowAtk = applyLevelToAtkMult(atk0, b);
      const nxtAtk = applyLevelToAtkMult(atk0, next);
      if (atk0 > 1 && nxtAtk !== nowAtk) lines.push({ l: 'ATK', d: `+${Math.round((nxtAtk - nowAtk) * 100) / 100}` });
      const nowDef = Math.round(applyLevelToStatAdd(def0, b));
      const nxtDef = Math.round(applyLevelToStatAdd(def0, next));
      if (def0 && nxtDef !== nowDef) lines.push({ l: 'DEF', d: `+${nxtDef - nowDef}%` });
      const nowC = Math.round(applyLevelToStatAdd(crit0, b));
      const nxtC = Math.round(applyLevelToStatAdd(crit0, next));
      if (crit0 && nxtC !== nowC) lines.push({ l: 'CRIT', d: `+${nxtC - nowC}%` });
      const nowS = Math.round(applyLevelToStatAdd(spd0, b));
      const nxtS = Math.round(applyLevelToStatAdd(spd0, next));
      if (spd0 && nxtS !== nowS) lines.push({ l: 'SPD', d: `+${nxtS - nowS}` });
    }
    game.lastUpgradeFlash = { id: item.id, lines, frame: game.frameCount };
  } catch (e) { }
  game.gachaStardust -= cost.dust; game.coins -= cost.coins; saveCoins();
  game.gachaInventory[item.id].level++;
  saveGachaData(); updateHUD();
}
function getItemLevelBonus(itemId) {
  const inv = game.gachaInventory[itemId]; if (!inv) return 0;
  return (inv.level - 1) * 0.01; // +1% per level over 1
}
function applyLevelToStatAdd(v, bonus) {
  if (!Number.isFinite(v)) return 0;
  return v * (1 + bonus);
}
function applyLevelToAtkMult(atkMult, bonus) {
  const base = Number.isFinite(atkMult) ? atkMult : 1;
  return 1 + Math.max(0, base - 1) * (1 + bonus);
}
function upgradeBonusNowNext(itemId) {
  const b = getItemLevelBonus(itemId);
  const next = Math.min(0.29, b + 0.01);
  return { b, next };
}
function doWeaponFusion(weaponId) {
  const item = WEAPON_GACHA_POOL.find(w => w.id === weaponId);
  if (!item) return;
  const inv = game.gachaInventory[weaponId];
  if (!inv) return;
  const lv = inv.level || 1;
  if (lv >= 5) return;
  const fusionCosts = {
    N: { mat: 1, scrap: 10 },
    R: { mat: 1, scrap: 20, core: 5 },
    SR: { mat: 2, scrap: 30, core: 10, crystal: 3 },
    SSR: { mat: 2, scrap: 50, core: 20, crystal: 8 },
  };
  const cost = fusionCosts[item.rarity];
  if (!cost) return;
  if ((inv.mat || 0) < cost.mat) return;
  if (cost.scrap && (game.materials.scrap || 0) < cost.scrap) return;
  if (cost.core && (game.materials.core || 0) < cost.core) return;
  if (cost.crystal && (game.materials.crystal || 0) < cost.crystal) return;
  inv.mat = (inv.mat || 0) - cost.mat;
  if (cost.scrap) game.materials.scrap = (game.materials.scrap || 0) - cost.scrap;
  if (cost.core) game.materials.core = (game.materials.core || 0) - cost.core;
  if (cost.crystal) game.materials.crystal = (game.materials.crystal || 0) - cost.crystal;
  inv.level = lv + 1;
  try { localStorage.setItem('invader_materials', JSON.stringify(game.materials)); } catch (e) { }
  saveGachaData(); updateHUD();
}
function tryPetLevelUp(petId) {
  const item = PET_POOL.find(p => p.id === petId);
  if (!item || !game.gachaInventory[petId]) return false;
  const inv = game.gachaInventory[petId];
  const lv = inv.level || 1;
  if (lv >= 5) return false;
  const petCosts = [
    { mat: 1, scrap: 5 },
    { mat: 1, scrap: 10, core: 2 },
    { mat: 2, scrap: 20, core: 5 },
    { mat: 2, scrap: 30, core: 10, crystal: 2 },
  ];
  const cost = petCosts[lv - 1];
  if (!cost) return false;
  if ((inv.mat || 0) < cost.mat) return false;
  if (cost.scrap && (game.materials.scrap || 0) < cost.scrap) return false;
  if (cost.core && (game.materials.core || 0) < cost.core) return false;
  if (cost.crystal && (game.materials.crystal || 0) < cost.crystal) return false;
  inv.mat = (inv.mat || 0) - cost.mat;
  if (cost.scrap) game.materials.scrap = (game.materials.scrap || 0) - cost.scrap;
  if (cost.core) game.materials.core = (game.materials.core || 0) - cost.core;
  if (cost.crystal) game.materials.crystal = (game.materials.crystal || 0) - cost.crystal;
  inv.level = lv + 1;
  try { localStorage.setItem('invader_materials', JSON.stringify(game.materials)); } catch (e) { }
  saveGachaData(); updateHUD();
  game.lastUpgradeFlash = { id: petId, lines: [{ l: 'Lv', d: '+1' }], frame: game.frameCount };
  return true;
}

function getPetUpgradeCost(petId) {
  const inv = game.gachaInventory?.[petId];
  if (!inv) return null;
  const lv = inv.level || 1;
  if (lv >= 5) return null;
  const petCosts = [
    { mat: 1, scrap: 5 },
    { mat: 1, scrap: 10, core: 2 },
    { mat: 2, scrap: 20, core: 5 },
    { mat: 2, scrap: 30, core: 10, crystal: 2 },
  ];
  return petCosts[lv - 1] || null;
}
function canPetUpgrade(petId) {
  const inv = game.gachaInventory?.[petId];
  if (!inv) return false;
  const cost = getPetUpgradeCost(petId);
  if (!cost) return false;
  if ((inv.mat || 0) < cost.mat) return false;
  if (cost.scrap && (game.materials.scrap || 0) < cost.scrap) return false;
  if (cost.core && (game.materials.core || 0) < cost.core) return false;
  if (cost.crystal && (game.materials.crystal || 0) < cost.crystal) return false;
  return true;
}
function doGachaPull(count) {
  const cost = count === 1 ? 500 : 5000;
  if (game.coins < cost) return false;
  game.gachaIsPremium = false;
  game.coins -= cost; saveCoins();
  const el = document.getElementById('coins');
  if (el) el.textContent = game.coins;
  game.gachaResults = []; game.gachaNewItems = new Set();
  let hasSR = false;
  for (let i = 0; i < count; i++) {
    const forcePity = game.gachaPityCount >= 79;
    const force10SR = count === 10 && i === 9 && !hasSR;
    const item = gachaRollOne(force10SR, forcePity, false);
    game.gachaPityCount++;
    if (item.rarity === 'SSR') { game.gachaPityCount = 0; }
    if (item.rarity === 'SSR' || item.rarity === 'SR') hasSR = true;
    game.gachaResults.push(item);
    addGachaItem(item);
  }
  savePity();
  game.gachaCurrentIdx = 0; game.gachaAnimFrame = 0;
  game.state = 'gacha_result';
  playSound('warp');
  return true;
}

// ===== EXP / レベル =====
function addExp(amount) {
  const expBoost = (game.gachaInventory['passive_exp']?.level >= 1 ? 1.2 : 1) * (getPetEffect('exp') ? 1.15 : 1);
  game.exp += Math.floor(amount * expBoost);
  const nextThreshold = EXP_TABLE[Math.min(game.playerLevel, EXP_TABLE.length - 1)];
  if (game.exp >= nextThreshold && game.playerLevel < 10) {
    game.exp -= nextThreshold;
    game.playerLevel++;
    const bonus = LEVEL_BONUSES[(game.playerLevel - 2) % LEVEL_BONUSES.length];
    // 3択スキル選択を表示
    showSkillChoice();
    triggerFlash(255, 220, 0, 0.25);
    playSound('levelup');
  }
}

// ===== スキル選択システム =====
const SKILL_POOL = [
  { id: 'firerate', label: 'RAPID FIRE', desc: '連射速度 +1', color: '#ff8844', apply: () => { game.playerUpgrades.firerate = Math.min(game.playerUpgrades.firerate + 1, 6); } },
  { id: 'speed', label: 'ENGINE BOOST', desc: '移動速度 +1', color: '#00ffcc', apply: () => { game.playerUpgrades.speed = Math.min(game.playerUpgrades.speed + 1, 6); } },
  { id: 'damage', label: 'ATK UP', desc: '攻撃力 +10%', color: '#ff4444', apply: () => { game.playerUpgrades.damage = Math.min(game.playerUpgrades.damage + 1, 8); } },
  { id: 'heal', label: 'HULL REPAIR', desc: 'HP +25 回復', color: '#00ff88', apply: () => { game.playerStats.hp = Math.min(game.playerStats.maxHp, game.playerStats.hp + 25); updateHUD(); } },
  { id: 'bulletspd', label: 'RAILGUN MOD', desc: '弾速 +2', color: '#44aaff', apply: () => { game.playerUpgrades.bulletSpd = Math.min(game.playerUpgrades.bulletSpd + 2, 10); } },
  { id: 'spread', label: 'SPREAD SHOT', desc: '拡散弾を解放', color: '#ffdd00', apply: () => { game.playerUpgrades.spread = true; } },
  { id: 'maxhp', label: 'HULL EXPAND', desc: '最大HP +20', color: '#00ff88', apply: () => { game.playerStats.maxHp += 20; game.playerStats.hp += 20; updateHUD(); } },
  { id: 'crit', label: 'TARGETING AI', desc: 'CRIT率 +5%', color: '#ffdd00', apply: () => { game.playerStats.crit = Math.min(game.playerStats.crit + 5, 50); } },
  { id: 'shield', label: 'BARRIER', desc: 'バリア 1回付与', color: '#44aaff', apply: () => { game.playerShield = true; } },
  { id: 'magnet', label: 'COIN MAGNET', desc: 'コイン自動吸引', color: '#ffd700', apply: () => { game.playerUpgrades.magnet = true; } },
];
function showSkillChoice() {
  const shuffled = [...SKILL_POOL].sort(() => Math.random() - 0.5);
  game.skillChoices = shuffled.slice(0, 3);
}
function applySkill(idx) {
  if (!game.skillChoices || idx < 0 || idx >= game.skillChoices.length) return;
  game.skillChoices[idx].apply();
  game.levelUpDisplay = { text: `LV.${game.playerLevel}  ${game.skillChoices[idx].label}`, timer: 180, color: '#ff0' };
  game.skillChoices = null;
}
// ===== チャージショット =====

// ===== ダッシュ =====
const DASH_DURATION = 10, DASH_COOLDOWN = 70, DASH_SPEED = 18;

// ===== ランダムイベント =====

// ===== 小惑星ステージ =====

// ===== 編隊 / ヒーラー =====

// ===== 設定 / 受け取りボックス / 課金定義 =====
const IAP_PACKAGES = [
  { id: 'gem5', icon: '💎', label: 'ジェム 5個', gems: 5, price: 120, tag: '' },
  { id: 'gem10', icon: '💎', label: 'ジェム 10個', gems: 10, price: 240, tag: '' },
  { id: 'gem25', icon: '💎', label: 'ジェム 25個', gems: 25, price: 600, tag: 'おトク' },
  { id: 'gem50', icon: '💎', label: 'ジェム 50個', gems: 50, price: 1200, tag: 'おトク' },
  { id: 'gem100', icon: '💎', label: 'ジェム 100個', gems: 100, price: 2400, tag: 'ベスト' },
  { id: 'starter', icon: '👾', label: 'スターターパック', gems: 5, price: 360, tag: '人気', bonus: 'キャラ1人＋ジェム5個' },
  { id: 'noad', icon: '🚫', label: '広告除去', gems: 0, price: 240, tag: '' },
  { id: 'pass', icon: '👑', label: '月額パス', gems: 0, price: 360, tag: '', sub: true, bonus: '毎日ジェム2個＋広告除去' },
];

const NOTICES = [
  { id: 'n1', date: '2026-04-30', title: 'サービス開始のお知らせ', body: 'プラネットシューティングをリリースしました！\nご意見・ご要望はお気軽にどうぞ。' },
  { id: 'n2', date: '2026-04-30', title: 'ゲームの遊び方', body: '敵を倒してコイン・ジェムを集め\nガチャでキャラや装備を強化しよう！\nステージが進むほど強力な敵が出現します。' },
];

function loadSettings() {
  try {
    const s = JSON.parse(localStorage.getItem('invader_settings') || '{}');
    game.settings = Object.assign({ bgm: true, vibration: true, quality: 'high', language: 'ja' }, s);
  } catch (e) { game.settings = { bgm: true, vibration: true, quality: 'high', language: 'ja' }; }
}
function saveSettings() { try { localStorage.setItem('invader_settings', JSON.stringify(game.settings)); } catch (e) { } }

function loadInbox() {
  try {
    const raw = JSON.parse(localStorage.getItem('invader_inbox') || '[]');
    const now = Date.now();
    game.inbox = raw.filter(it => !it.claimed && it.expiresAt > now);
  } catch (e) { game.inbox = []; }
}
function saveInbox() { try { localStorage.setItem('invader_inbox', JSON.stringify(game.inbox)); } catch (e) { } }
function addInboxItem(item) {
  if (!Array.isArray(game.inbox)) game.inbox = [];
  game.inbox.unshift({ ...item, id: `${Date.now()}_${Math.random().toString(36).slice(2)}`, claimed: false, expiresAt: Date.now() + 30 * 86400000 });
  saveInbox();
}
function claimInboxItem(id) {
  const it = game.inbox.find(x => x.id === id); if (!it || it.claimed) return;
  it.claimed = true;
  if (it.coins) addCoins(it.coins);
  if (it.gems) addGems(it.gems);
  if (it.fuel) addFuel(it.fuel);
  if (it.dust > 0) { game.gachaStardust += it.dust; saveGachaData(); }
  saveInbox();
  game.inbox = game.inbox.filter(x => !x.claimed);
}
function claimAllInbox() {
  game.inbox.filter(x => !x.claimed).forEach(it => {
    it.claimed = true;
    if (it.coins) addCoins(it.coins);
    if (it.gems) addGems(it.gems);
    if (it.fuel) addFuel(it.fuel);
    if (it.dust > 0) { game.gachaStardust += it.dust; saveGachaData(); }
  });
  saveInbox(); game.inbox = [];
}

// ===== ゲーム変数 =====
function saveScore(s) { game.hiScores = [s, ...game.hiScores].sort((a, b) => b - a).slice(0, 5); game.hiScore = game.hiScores[0]; localStorage.setItem('invader_hiscores', JSON.stringify(game.hiScores)); }

function getLocalWeekEpoch() { return Math.floor(Date.now() / (7 * 24 * 3600 * 1000)); }
function readWeeklyLocalBoard() {
  try {
    const raw = localStorage.getItem('invader_weekly_local_v1');
    const j = raw ? JSON.parse(raw) : null;
    const ep = getLocalWeekEpoch();
    if (!j || typeof j !== 'object' || j.epoch !== ep) return { epoch: ep, boss: [], endless: [] };
    return { epoch: ep, boss: Array.isArray(j.boss) ? j.boss : [], endless: Array.isArray(j.endless) ? j.endless : [] };
  } catch (e) { return { epoch: getLocalWeekEpoch(), boss: [], endless: [] }; }
}
function pushWeeklyLocalScore(mode, score) {
  if (!mode || !Number.isFinite(score) || score <= 0) return;
  const ep = getLocalWeekEpoch();
  const cur = readWeeklyLocalBoard();
  if (cur.epoch !== ep) { cur.boss = []; cur.endless = []; cur.epoch = ep; }
  const name = (game.displayName || 'PLAYER').slice(0, 12);
  const row = { score: Math.floor(score), name, t: Date.now() };
  const key = mode === 'boss_rush' ? 'boss' : 'endless';
  if (key !== 'boss' && key !== 'endless') return;
  const arr = [...(cur[key] || []), row].sort((a, b) => b.score - a.score).slice(0, 5);
  cur[key] = arr;
  try { localStorage.setItem('invader_weekly_local_v1', JSON.stringify(cur)); } catch (e) { }
}

function computeStageStarMedal(hits, maxCombo) {
  let n = 1;
  if (maxCombo >= 5) n++;
  if (hits === 0) n++;
  return Math.min(3, n);
}
function readStageStarMedals() {
  try {
    const o = JSON.parse(localStorage.getItem('invader_stage_stars') || '{}');
    return o && typeof o === 'object' && !Array.isArray(o) ? o : {};
  } catch (e) { return {}; }
}
function saveStageStarMedals(obj) {
  try { localStorage.setItem('invader_stage_stars', JSON.stringify(obj)); } catch (e) { }
}
function commitStageStarMedalForCurrentClear() {
  if (game.bossRushModeActive || game.endlessModeActive) return;
  const skipStars = !!game.continueNoStarsThisRun;
  const st = String(game.stage);
  const medals = { ...readStageStarMedals() };
  const prev = medals[st];
  const computed = computeStageStarMedal(game.stageStats.hits, game.stageStats.maxCombo);
  let next;
  if (skipStars) next = (typeof prev === 'number' && !Number.isNaN(prev)) ? prev : 0;
  else next = Math.max(typeof prev === 'number' && !Number.isNaN(prev) ? prev : 0, computed);
  medals[st] = next;
  saveStageStarMedals(medals);
  game.continueNoStarsThisRun = false;
}
function getStageStarsForMap(stageNum) {
  const s = Math.floor(stageNum);
  const cleared = s < game.highestStage;
  if (!cleared) return 0;
  const medals = readStageStarMedals();
  const k = String(s);
  if (Object.prototype.hasOwnProperty.call(medals, k)) return Math.min(3, Math.max(0, Number(medals[k]) || 0));
  return 3;
}
function saveDisplayName(name) {
  const n = String(name || '').trim().slice(0, 12) || 'PLAYER';
  game.displayName = n;
  try { localStorage.setItem('invader_display_name', n); } catch (e) { }
}
function savePremiumPity() { localStorage.setItem('invader_premium_pity', game.premiumPityCount); }
function saveLrPity() { localStorage.setItem('invader_lr_pity', game.lrPityCount); localStorage.setItem('invader_premium_lr_pity', game.premiumLrPityCount); }
// ゲートアニメ定数
const GATE_OPEN = 60, GATE_WARPOUT = 50, GATE_FADEIN = 40;
function gateStall(r) { return r === 'LR' ? 180 : r === 'SSR' ? 110 : r === 'SR' ? 55 : 14; }
function gateTotal(r) { return GATE_OPEN + gateStall(r) + GATE_WARPOUT + GATE_FADEIN; }
function savePity() { localStorage.setItem('invader_pity', game.gachaPityCount); }
// ===== ロードアウト / スタット =====
const GACHA_ANIM_INTRO = 50, GACHA_ANIM_SPIN = 50, GACHA_ANIM_BURST = 20;
const GACHA_ANIM_TOTAL = GACHA_ANIM_INTRO + GACHA_ANIM_SPIN + GACHA_ANIM_BURST;

// ===== 機体カスタマイズ =====
function unlockAchievement(id) {
  if (game.achievements[id]) return;
  game.achievements[id] = true;
  localStorage.setItem('invader_achievements', JSON.stringify(game.achievements));
  const def = ACHIEVEMENT_DEFS.find(d => d.id === id);
  if (def) game.lifeGainDisplay = { text: `実績解除: ${def.label}`, timer: 180, color: '#ff0' };
}

// ===== ステージ進行 =====

// ===== アップグレード重複防止 =====

// ===== ボスカットイン =====
const BOSS_CUTIN_DURATION = 155;

// ===== 環境ギミック =====

// ===== 必殺技ゲージ =====
const ULTIMATE_MAX = 100;
const ULTIMATE_DURATION = 40;

// ===== ステージタイプ =====
const SURVIVAL_DURATION = 1800;

// ===== ステージ評価 =====

// ===== ウェーブシステム =====
function getWaveCount() { return Math.min(4, 2 + Math.floor(game.stage / 5)); }
function getWaveSize(wn) { return Math.max(4, 3 + Math.floor(game.stage / 2) + (wn - 1) * 2); }

// ===== デイリーミッション（端末ローカル日付で更新、進捗は1日中超えて蓄積）=====
const DAILY_MISSION_STORAGE_KEY = 'invader_daily_missions_v1';
function getLocalDateKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function emptyMissionProgress() {
  return { kills: 0, maxCombo: 0, noDmgStages: 0, bossKills: 0, stageClears: 0, ultimateUses: 0, maxWave: 0 };
}
function readDailyMissionBlob() {
  try {
    const v = JSON.parse(localStorage.getItem(DAILY_MISSION_STORAGE_KEY) || 'null');
    if (v && typeof v === 'object' && typeof v.date === 'string' && Array.isArray(v.missionIds)) return v;
  } catch (e) { }
  return null;
}
function writeDailyMissionBlob(data) {
  try { localStorage.setItem(DAILY_MISSION_STORAGE_KEY, JSON.stringify(data)); } catch (e) { }
}
function persistDailyMissionState() {
  const missionIds = (Array.isArray(game.sessionMissions) ? game.sessionMissions : [])
    .map(m => m && m.id).filter(id => typeof id === 'string');
  const claimed = game.missionClaimedSet instanceof Set
    ? [...game.missionClaimedSet].sort((a, b) => a - b)
    : [];
  writeDailyMissionBlob({
    date: getLocalDateKey(),
    missionIds,
    progress: { ...game.sessionProgress },
    claimed,
  });
}
function pickThreeMissions() {
  const pool = [...MISSION_POOL].sort(() => Math.random() - 0.5);
  return pool.slice(0, 3);
}
function missionsFromStoredIds(ids) {
  const list = (ids || []).map(id => MISSION_POOL.find(m => m.id === id)).filter(Boolean);
  const used = new Set(list.map(m => m.id));
  while (list.length < 3) {
    const add = MISSION_POOL.find(m => !used.has(m.id)) || MISSION_POOL[0];
    used.add(add.id);
    list.push(add);
  }
  return list.slice(0, 3);
}
function dailySessionMissionsOk() {
  return Array.isArray(game.sessionMissions) && game.sessionMissions.length === 3 &&
    game.sessionMissions.every(m => m && typeof m.id === 'string' && typeof m.label === 'string' && typeof m.check === 'function' &&
      m.reward && typeof m.reward === 'object' && typeof m.reward.coins === 'number');
}
/** カスタマイズ表示前・出撃前に呼ぶ。日付が変わったらミッション抽選と進捗をリセット */
function ensureDailyMissions() {
  const today = getLocalDateKey();
  if (game.dailyMissionLoadedDate === today && dailySessionMissionsOk()) return;
  game.dailyMissionLoadedDate = today;
  const blob = readDailyMissionBlob();
  if (!blob || blob.date !== today) {
    const picked = pickThreeMissions();
    game.sessionMissions = picked;
    game.sessionProgress = emptyMissionProgress();
    game.missionClaimedSet = new Set();
    writeDailyMissionBlob({
      date: today,
      missionIds: picked.map(m => m.id),
      progress: { ...game.sessionProgress },
      claimed: [],
    });
    return;
  }
  game.sessionMissions = missionsFromStoredIds(blob.missionIds);
  const merged = emptyMissionProgress();
  Object.assign(merged, blob.progress || {});
  game.sessionProgress = merged;
  game.missionClaimedSet = new Set(blob.claimed || []);
  if (!dailySessionMissionsOk()) {
    const picked = pickThreeMissions();
    game.sessionMissions = picked;
    game.sessionProgress = emptyMissionProgress();
    game.missionClaimedSet = new Set();
    writeDailyMissionBlob({
      date: today,
      missionIds: picked.map(m => m.id),
      progress: { ...game.sessionProgress },
      claimed: [],
    });
  }
}
// ===== アクティブ任務システム v3 =====
const MISSION_V3_KEY = 'invader_missions_v3';
function missionBaseline() {
  const L = game.questLifetime;
  return {
    kills: L.totalKills, bossKills: L.totalBossKills, stageClears: L.totalStageClears,
    ultimates: L.totalUltimates, noDmgClears: L.totalNoDmgClears
  };
}
function missionEffectiveProgress(slot) {
  const L = game.questLifetime, b = slot.baseline || {};
  return {
    kills: Math.max(0, (L.totalKills || 0) - (b.kills || 0)),
    maxCombo: L.maxComboEver || 0,
    noDmgStages: Math.max(0, (L.totalNoDmgClears || 0) - (b.noDmgClears || 0)),
    bossKills: Math.max(0, (L.totalBossKills || 0) - (b.bossKills || 0)),
    stageClears: Math.max(0, (L.totalStageClears || 0) - (b.stageClears || 0)),
    ultimateUses: Math.max(0, (L.totalUltimates || 0) - (b.ultimates || 0)),
    maxWave: L.maxWaveEver || 0,
  };
}
function saveActiveMissions() {
  try { localStorage.setItem(MISSION_V3_KEY, JSON.stringify({ slots: game.activeMissions, recent: game.recentMissionIds })); } catch (e) { }
}
function loadActiveMissions() {
  try {
    const v = JSON.parse(localStorage.getItem(MISSION_V3_KEY) || 'null');
    if (v && Array.isArray(v.slots)) { game.activeMissions = v.slots; game.recentMissionIds = v.recent || []; }
  } catch (e) { }
}
function ensureActiveMissions() {
  if (!Array.isArray(game.activeMissions)) game.activeMissions = [];
  if (!Array.isArray(game.recentMissionIds)) game.recentMissionIds = [];
  const activeIds = new Set(game.activeMissions.map(s => s.missionId));
  const recentSet = new Set(game.recentMissionIds);
  while (game.activeMissions.length < 3) {
    let pool = MISSION_POOL.filter(m => !activeIds.has(m.id) && !recentSet.has(m.id));
    if (!pool.length) pool = MISSION_POOL.filter(m => !activeIds.has(m.id));
    if (!pool.length) break;
    const picked = pool[Math.floor(Math.random() * pool.length)];
    game.activeMissions.push({ missionId: picked.id, baseline: missionBaseline() });
    activeIds.add(picked.id);
  }
  saveActiveMissions();
}
function claimActiveMission(missionId) {
  const idx = game.activeMissions.findIndex(s => s.missionId === missionId);
  if (idx === -1) return;
  const mDef = MISSION_POOL.find(m => m.id === missionId);
  if (!mDef) return;
  const ep = missionEffectiveProgress(game.activeMissions[idx]);
  let ok = false; try { ok = mDef.check(ep); } catch (e) { }
  if (!ok) return;
  addInboxItem({ label: `🏆 ミッション: ${mDef.label}`, coins: mDef.reward.coins, gems: mDef.reward.gems || 0, dust: mDef.reward.dust || 0, fuel: 1, icon: 'mission' });
  game.lifeGainDisplay = { text: `📬 ミッション達成！受け取りBOXに追加しました`, timer: 200, color: '#ff0' };
  playSound('upgrade_pick');
  game.activeMissions.splice(idx, 1);
  game.recentMissionIds.push(missionId);
  if (game.recentMissionIds.length > 15) game.recentMissionIds.shift();
  ensureActiveMissions();
}

const NORMAL_QUEST_STORAGE_KEY = 'invader_normal_quests_v1';
function readNormalQuestBlob() {
  try {
    const v = JSON.parse(localStorage.getItem(NORMAL_QUEST_STORAGE_KEY) || 'null');
    if (v && typeof v === 'object' && v.lifetime && typeof v.lifetime === 'object') {
      return { ...v, claimed: Array.isArray(v.claimed) ? v.claimed : [] };
    }
  } catch (e) { }
  return null;
}
function writeNormalQuestBlob(data) {
  try { localStorage.setItem(NORMAL_QUEST_STORAGE_KEY, JSON.stringify(data)); } catch (e) { }
}
function ensureNormalQuestProfile() {
  if (game.questProfileLoaded) return;
  game.questProfileLoaded = true;
  const b = readNormalQuestBlob();
  if (b?.lifetime) Object.assign(game.questLifetime, b.lifetime);
  game.questClaimedIds = new Set(b.claimed || []);
  loadActiveMissions();
  ensureActiveMissions();
}
function persistNormalQuestState() {
  const claimed = game.questClaimedIds instanceof Set ? game.questClaimedIds : [];
  writeNormalQuestBlob({
    lifetime: { ...game.questLifetime },
    claimed: [...claimed],
  });
}
function checkAndClaimNormalQuests() {
  ensureNormalQuestProfile();
  let lastClaim = null;
  for (const q of NORMAL_QUEST_POOL) {
    if (game.questClaimedIds.has(q.id)) continue;
    if (!q.check(game.questLifetime, game)) continue;
    game.questClaimedIds.add(q.id);
    const r = q.reward;
    addInboxItem({ label: `📋 クエスト: ${q.label}`, coins: r.coins, gems: r.gems || 0, dust: r.dust || 0, icon: 'quest' });
    lastClaim = q;
  }
  if (lastClaim) {
    game.lifeGainDisplay = { text: `📬 クエスト達成！受け取りBOXに追加しました`, timer: 200, color: '#ccf' };
  }
  persistNormalQuestState();
}
function checkAndClaimMissions() {
  ensureNormalQuestProfile();
  checkAndClaimNormalQuests();
  if (!(game.missionClaimedSet instanceof Set)) game.missionClaimedSet = new Set();
  game.sessionMissions.forEach((m, i) => {
    if (game.missionClaimedSet.has(i)) return;
    if (m.check(game.sessionProgress)) {
      game.missionClaimedSet.add(i);
      addInboxItem({ label: `📅 デイリー: ${m.label}`, coins: m.reward.coins, gems: m.reward.gems || 0, dust: m.reward.dust || 0, fuel: 1, icon: 'daily' });
      game.lifeGainDisplay = { text: `📬 デイリーミッション達成！受け取りBOXに追加しました`, timer: 200, color: '#ff0' };
    }
  });
  persistDailyMissionState();
}

// ===== ショップ =====
// ===== 素材システム =====
// scrap=🔩スクラップ core=⚡エネルギーコア crystal=💎量子結晶 composite=🔷コンポジットコア
function saveMaterials() { localStorage.setItem('invader_materials', JSON.stringify(game.materials)); }
function addMaterial(type, n = 1) {
  game.materials[type] = (game.materials[type] || 0) + n; saveMaterials();
  if (game.state === 'playing' && game.player) {
    const icons = { scrap: '🔩', core: '⚡', crystal: '💎', composite: '🔷' };
    game.matPopups.push({ x: game.player.x + game.player.w / 2 + (Math.random() - 0.5) * 50, y: game.player.y, text: `+${n}${icons[type] || type}`, timer: 55, vy: -0.9 });
  }
}
function saveShop() { localStorage.setItem('invader_shop', JSON.stringify(game.shopUpgrades)); }

function getUpgradeLvCost(lv) { return UPGRADE_LV_COSTS[Math.min(lv, UPGRADE_LV_COSTS.length - 1)]; }

// ===== ショップ（強化）: スキルツリー前提条件（段階解放）=====
// - ゴースト表示: 「次の枝」がうっすら見える（増えていく感）
// - 実体化（強化可能）: 前提Lvを満たした瞬間に枝が伸びてノードがポップ
// 新ツリー解放ルール（細かく枝が広がる）:
// - 各カテゴリの1本目は最初から強化可
// - Lv2/Lv3 で同カテゴリ内の枝が開く
// - 一部は「カテゴリ合計Lv」で横枝が見える
const SHOP_PREREQS_SOLID = {
  // エンジン/移動（青）
  speed: [],                       // 入口
  // 攻撃（赤）
  firerate: [],                       // 入口
  critrate: [{ id: 'firerate', lv: 2 }],  // Lv2で横枝解放
  // 防御（緑）
  maxhp: [],                       // 入口
  dashcd: [{ id: 'maxhp', lv: 2 }],   // Lv2で枝解放
  // エネルギー（黄）
  bulletspd: [{ id: 'speed', lv: 2 }],   // 移動強化が進むと見える
};
const SHOP_PREREQS_GHOST = {
  speed: [],
  firerate: [],
  critrate: [{ id: 'firerate', lv: 1 }],
  maxhp: [],
  dashcd: [{ id: 'maxhp', lv: 1 }],
  bulletspd: [{ id: 'speed', lv: 1 }],
};
function getShopLv(id) { return game.shopUpgrades?.[id] || 0; }
function getShopItemById(id) { return SHOP_ITEMS.find(it => it.id === id) || null; }
function getShopPrereqs(id, mode = 'solid') {
  const src = (mode === 'ghost') ? SHOP_PREREQS_GHOST : SHOP_PREREQS_SOLID;
  return Array.isArray(src[id]) ? src[id] : [];
}
function isShopPrereqsMet(id, mode = 'solid') {
  const reqs = getShopPrereqs(id, mode);
  for (const r of reqs) {
    if (getShopLv(r.id) < (r.lv || 0)) return false;
  }
  return true;
}
function getShopPrereqText(id, mode = 'solid') {
  const reqs = getShopPrereqs(id, mode);
  if (!reqs.length) return '';
  const parts = reqs.map(r => {
    const it = getShopItemById(r.id);
    const name = it ? it.label : r.id;
    return `${name}Lv${r.lv || 0}`;
  });
  return `必要: ${parts.join(' / ')}`;
}

function canUpgradeShopItem(item) {
  const lv = game.shopUpgrades[item.id] || 0;
  if (lv >= SHOP_MAX_LV) return false;
  const [cost, mats, stReq] = getUpgradeLvCost(lv);
  if (game.highestStage < stReq) return false;
  if (!isShopPrereqsMet(item.id, 'solid')) return false;
  if (game.coins < cost) return false;
  for (const [k, v] of Object.entries(mats)) {
    if (k === 'gems') { if (game.gems < v) return false; }
    else if ((game.materials[k] || 0) < v) return false;
  }
  return true;
}
function applyShopUpgrade(idx) {
  const item = SHOP_ITEMS[idx];
  if (!item) return;
  // 解放アニメ差分検出のため、事前に solid 状態を記録
  const beforeSolid = {};
  try {
    for (const it of SHOP_ITEMS) beforeSolid[it.id] = isShopPrereqsMet(it.id, 'solid') || (getShopLv(it.id) > 0);
  } catch (e) { }
  const lv = game.shopUpgrades[item.id] || 0;
  if (lv >= SHOP_MAX_LV) return;
  const [cost, mats, stReq] = getUpgradeLvCost(lv);
  if (game.highestStage < stReq) return;
  if (!isShopPrereqsMet(item.id, 'solid')) return;
  if (game.coins < cost) return;
  for (const [k, v] of Object.entries(mats)) {
    if (k === 'gems') { if (game.gems < v) return; }
    else if ((game.materials[k] || 0) < v) return;
  }
  game.coins -= cost; saveCoins();
  for (const [k, v] of Object.entries(mats)) {
    if (k === 'gems') { game.gems -= v; saveGems(); }
    else { game.materials[k] -= v; }
  }
  saveMaterials();
  game.shopUpgrades[item.id]++;
  saveShop();
  // ツリー解放: 前提が繋がった／幹の初回強化で短い発光ライン
  try {
    if (!Array.isArray(game.shopTreeRevealAnims)) game.shopTreeRevealAnims = [];
    const afterLv = (game.shopUpgrades[item.id] || 0);
    const lvBefore = afterLv - 1;
    if (lvBefore === 0 && afterLv >= 1) {
      const reqs0 = getShopPrereqs(item.id, 'solid');
      if (!reqs0.length) game.shopTreeRevealAnims.push({ from: 'core', to: item.id, start: game.frameCount, p: 0 });
    }
    for (const child of SHOP_ITEMS) {
      const nowSolid = isShopPrereqsMet(child.id, 'solid') || (getShopLv(child.id) > 0);
      if (!nowSolid || beforeSolid[child.id]) continue;
      const reqs = getShopPrereqs(child.id, 'solid');
      if (reqs.length) {
        for (const r of reqs) game.shopTreeRevealAnims.push({ from: r.id, to: child.id, start: game.frameCount, p: 0 });
      } else {
        game.shopTreeRevealAnims.push({ from: 'core', to: child.id, start: game.frameCount, p: 0 });
      }
    }
  } catch (e) { }
  playSound('upgrade_pick');
  updateHUD();
  try { triggerShopHexBurst(item.id); } catch (e) { }
}
function getStatPreviewText(item, lv) {
  if (lv >= SHOP_MAX_LV) return '';
  const n = lv + 1;
  switch (item.id) {
    case 'speed': return `移動速度  +${lv} → +${n}`;
    case 'firerate': return `連射速度  +${lv} → +${n}`;
    case 'maxhp': return `最大HP  +${lv * 20} → +${n * 20}`;
    case 'bulletspd': return `弾速  +${lv * 3} → +${n * 3}`;
    case 'critrate': return `CRIT率  +${lv * 5}% → +${n * 5}%`;
    case 'dashcd': return `無敵F  +${lv * 10} → +${n * 10}`;
    default: return '';
  }
}
/** ショップツリー／詳細パネル用: 現在Lvの効果を1行で */
function getShopCurrentEffectOneLine(item, lv) {
  if (!item) return '';
  const v = Math.max(0, Math.min(Number(lv) || 0, SHOP_MAX_LV));
  switch (item.id) {
    case 'speed': return `移動速度 +${v}`;
    case 'firerate': return `連射速度 +${v}`;
    case 'maxhp': return `最大HP +${v * 20}`;
    case 'bulletspd': return `弾速 +${v * 3}`;
    case 'critrate': return `CRIT率 +${v * 5}%`;
    case 'dashcd': return `無敵F +${v * 10}`;
    default: return '';
  }
}
// ── HTML Shop Panel (HTML overlay, replaces canvas panel) ───────
const _SP_ROLE_COL = {
  core: '#a0d4ff', atk: '#ff4d5e', def: '#39e58f',
  spd: '#b266ff', ene: '#ffdd55', arm: '#44aaff',
  spc: '#ff8833', omega: '#e8e0ff',
};
const _SP_ROLE_NAMES = {
  core: 'CORE', atk: 'ATK系統', def: 'DEF系統', spd: '機動系統',
  ene: 'ENE系統', arm: '装甲系統', spc: '特殊系統', omega: 'OMEGA',
};
const _SP_MAT_ICON = { scrap: '🔩', core: '⚙', crystal: '💎', composite: '🔮', gems: '💠' };

function _spRgb(hex) {
  if (!hex || hex.length < 7) return '136,136,255';
  return `${parseInt(hex.slice(1, 3), 16)},${parseInt(hex.slice(3, 5), 16)},${parseInt(hex.slice(5, 7), 16)}`;
}

function updateShopPanel(id) {
  const panel = document.getElementById('shop-panel');
  if (!panel) return;
  const btn = document.getElementById('sp-btn');

  if (!id) {
    panel.classList.remove('open');
    if (btn) btn.onclick = null;
    return;
  }

  const nodeInfo = getShopHexNodeInfo(id);
  if (!nodeInfo) return;

  const { role, label, icon, tier, mystery, milestone, isShopItem } = nodeInfo;
  const col = _SP_ROLE_COL[role] || '#88ccff';
  const rgb = _spRgb(col);

  const item = SHOP_ITEMS.find(it => it.id === id);
  const lv = game.shopUpgrades?.[id] || 0;
  const maxLv = SHOP_MAX_LV;
  const showMystery = mystery && lv === 0;

  // Header
  const iconEl = document.getElementById('sp-icon');
  if (iconEl) {
    iconEl.textContent = showMystery ? '?' : icon;
    iconEl.style.cssText = `background:rgba(${rgb},0.12);border-color:${col};color:${col};font-size:20px;`;
  }
  const nameEl = document.getElementById('sp-name');
  if (nameEl) { nameEl.textContent = showMystery ? '???' : label; nameEl.style.color = col; }
  const roleEl = document.getElementById('sp-role');
  if (roleEl) roleEl.textContent = _SP_ROLE_NAMES[role] || role;
  const tagEl = document.getElementById('sp-tag');
  if (tagEl) {
    const tl = tier === 0 ? 'CORE' : milestone ? 'MILESTONE' : tier === 4 ? 'ULTIMATE' : `TIER ${tier}`;
    tagEl.textContent = tl; tagEl.style.color = col; tagEl.style.borderColor = col;
  }

  // Level dots
  const dotsEl = document.getElementById('sp-lvdots');
  const lvTextEl = document.getElementById('sp-lvtext');
  if (dotsEl) {
    dotsEl.innerHTML = '';
    if (isShopItem) {
      for (let i = 0; i < maxLv; i++) {
        const dot = document.createElement('div');
        dot.className = 'sp-lvdot' + (i < lv ? ' on' : '');
        if (i < lv) dot.style.cssText = `background:${col};box-shadow:0 0 5px ${col};`;
        dotsEl.appendChild(dot);
      }
    }
  }
  if (lvTextEl) lvTextEl.textContent = !isShopItem ? '' : lv >= maxLv ? 'MAX' : lv === 0 ? '未解放' : `Lv ${lv} / ${maxLv}`;

  // Effect text
  const effEl = document.getElementById('sp-effect');
  if (effEl) {
    if (showMystery) {
      effEl.textContent = 'この先に何があるかは、解放した者だけが知る。';
      effEl.style.color = 'rgba(100,120,160,0.50)';
    } else if (isShopItem && item) {
      effEl.textContent = lv > 0 ? `現在: ${getShopCurrentEffectOneLine(item, lv)}` : item.desc || '-';
      effEl.style.color = 'rgba(188,212,255,0.70)';
    } else {
      effEl.textContent = '';
    }
  }

  // Next level preview
  const nextEl = document.getElementById('sp-next');
  if (nextEl) {
    if (isShopItem && item && lv > 0 && lv < maxLv) {
      const txt = getStatPreviewText(item, lv);
      const after = txt.split('→')[1]?.trim() || '';
      nextEl.textContent = `▶ 次Lv: ${after}`;
      nextEl.style.display = 'block';
    } else { nextEl.style.display = 'none'; }
  }

  // Prerequisite warning
  const reqInfoEl = document.getElementById('sp-req');
  if (reqInfoEl) {
    reqInfoEl.style.display = 'none';
    if (isShopItem && lv < maxLv && !isShopPrereqsMet(id)) {
      const pt = getShopPrereqText(id);
      if (pt) { reqInfoEl.innerHTML = `⚠ ${pt}`; reqInfoEl.style.display = 'block'; }
    }
  }

  // Cost row
  const costRow = document.getElementById('sp-costrow');
  if (costRow) {
    costRow.innerHTML = '';
    if (isShopItem && lv < maxLv && !showMystery) {
      const [coinCost, mats] = getUpgradeLvCost(lv);
      const coinOk = game.coins >= coinCost;
      const cs = document.createElement('span');
      cs.className = 'sp-citem ' + (coinOk ? 'ok' : 'ng');
      cs.textContent = `🪙 ${coinCost.toLocaleString()}${coinOk ? '' : ` (あと${(coinCost - game.coins).toLocaleString()})`}`;
      costRow.appendChild(cs);
      for (const [k, v] of Object.entries(mats)) {
        const have = k === 'gems' ? (game.gems || 0) : (game.materials?.[k] || 0);
        const ok2 = have >= v;
        const ms = document.createElement('span');
        ms.className = 'sp-mitem ' + (ok2 ? 'ok' : 'ng');
        ms.textContent = `${_SP_MAT_ICON[k] || k}×${v}${ok2 ? '' : ` (あと${v - have})`}`;
        costRow.appendChild(ms);
      }
    } else if (isShopItem && lv >= maxLv) {
      const sp = document.createElement('span');
      sp.className = 'sp-citem ok'; sp.textContent = '解放済み'; costRow.appendChild(sp);
    }
  }

  // Button
  if (btn) {
    btn.className = '';
    btn.onclick = null;
    if (!isShopItem || id === 'core') {
      btn.textContent = id === 'core' ? '— CORE —' : '強化不可';
      btn.className = 'maxed';
    } else if (lv >= maxLv) {
      btn.textContent = '✦  MAX  LEVEL';
      btn.className = 'maxed';
    } else if (!isShopPrereqsMet(id)) {
      btn.textContent = `🔒  ${getShopPrereqText(id)}`;
      btn.className = 'off';
    } else {
      const [coinCost] = getUpgradeLvCost(lv);
      const [, , stReq] = getUpgradeLvCost(lv);
      if (game.highestStage < stReq) {
        btn.textContent = `🔒 ステージ${stReq}クリアが必要`;
        btn.className = 'off';
      } else if (!canUpgradeShopItem(item)) {
        btn.textContent = game.coins < coinCost ? '🪙 コイン不足' : '素材が足りない';
        btn.className = 'off';
      } else {
        const itemIdx = SHOP_ITEMS.indexOf(item);
        btn.textContent = lv === 0
          ? `解放する  —  🪙 ${coinCost.toLocaleString()}`
          : `▲ 強化する  Lv${lv + 1}へ  —  🪙 ${coinCost.toLocaleString()}`;
        btn.onclick = () => { applyShopUpgrade(itemIdx); updateShopPanel(id); };
      }
    }
  }

  panel.classList.add('open');
}

function tryCompose(n = 1) {
  const maxN = Math.min(Math.floor((game.materials.scrap || 0) / 5), Math.floor((game.materials.core || 0) / 3));
  const times = n === 'max' ? maxN : Math.min(Number(n), maxN);
  if (times <= 0) return;
  game.materials.scrap -= 5 * times; game.materials.core -= 3 * times;
  game.materials.composite = (game.materials.composite || 0) + times;
  saveMaterials(); playSound('powerup');
  game.lifeGainDisplay = { text: `🔷 コンポジット×${times} 合成完了!`, timer: 120, color: '#ffaa44' };
}
function dropMaterial() {
  const p = getPlanet(game.stage).name;
  const r = Math.random();
  if (p === 'MARS') {
    if (r < 0.30) addMaterial('scrap');
  } else if (p === 'VENUS' || p === 'JUPITER') {
    if (r < 0.15) addMaterial('scrap');
    if (r >= 0.15 && r < 0.40) addMaterial('core');
  } else { // SATURN
    if (r < 0.20) addMaterial('crystal');
    if (r >= 0.20 && r < 0.35) addMaterial('core', Math.random() < 0.3 ? 2 : 1);
  }
}

// ===== マップ =====

// ===== 星 =====
function initStars() {
  game.stars = [];
  for (let i = 0; i < 200; i++) game.stars.push({
    x: Math.random() * W, y: Math.random() * H,
    size: Math.random() < 0.6 ? 1 : Math.random() < 0.8 ? 1.5 : 2,
    speed: 0.08 + Math.random() * 0.4, twinkle: Math.random() * Math.PI * 2, layer: Math.floor(Math.random() * 3),
  });
}
function triggerFlash(r, g, b, alpha = 0.5) { game.screenFlash = { r, g, b, alpha, decay: alpha / 25 }; }
function triggerShake(i, d) { game.shakeIntensity = i; game.shakeTimer = d; }
function hexToRgb(hex) { const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16); return `${r},${g},${b}`; }
function getShipDims() {
  const s = SHIP_SHAPES[game.shipShapeIdx].id;
  if (s === 'agile') return { w: 36, h: 24 };
  if (s === 'heavy') return { w: 56, h: 32 };
  return { w: 48, h: 28 };
}

// ===== ボタン定義 (state → [{x,y,w,h,action}]) =====
const BACK_BTN = { id: 'back', x: 14, y: 558, w: 196, h: 34, label: '◀  BACK', action: () => { game.state = 'customize'; } };
const UI_BUTTONS = {
  settings: [{ ...BACK_BTN, label: '◀ 戻る', action: () => { game.state = 'customize'; } }],
  notifications: [{ ...BACK_BTN, label: '◀ 戻る', action: () => { game.state = 'customize'; } }],
  inbox: [{ ...BACK_BTN, label: '◀ 戻る', action: () => { game.state = 'customize'; } }],
  events: [{ ...BACK_BTN, label: '◀ 戻る', action: () => { game.state = 'customize'; } }],
  iap: [{ ...BACK_BTN, label: '◀ 戻る', action: () => { game.state = 'customize'; } }],
  gacha: [{ ...BACK_BTN, label: '◀ 戻る', action: () => { if (game.gachaRatesModal) game.gachaRatesModal = false; else game.state = 'customize'; } }],
  gacha_rates: [{ id: 'close', x: 14, y: 558, w: 160, h: 34, label: '◀  ガチャに戻る', action: () => { game.state = 'gacha'; } }],
  stage_select: [],
  get loadout() {
    // 左パネルにタップ用ボタン（スマホ操作用）
    const btns = [{ ...BACK_BTN, y: 564, label: '◀ 戻る' }];
    try {
      const pool = buildLoadoutPool();
      const cur = Math.min(game.loadoutCursor, Math.max(0, pool.length - 1));
      const item = pool[cur];
      // Left panel dimensions (drawLoadoutScreen と一致)
      const PX = 4, PY = 50, PW = 290, PH = H - PY - 48;
      // 下部にボタン（装備/外す/強化 + 装備タブのみおすすめ）
      // BACKフッター(546〜)と被らないよう、左パネル下端に固定して配置する
      const baseY = PY + PH - 44; // toggle button bottom row
      const bw = 92, bh = 30, gap = 6;
      // 「装着 / 外す」は1ボタンに統一（装備中なら外す、未装備なら装着）
      const toggleBtn = { id: 'ld_toggle', x: PX + 14, y: baseY, w: PW - 28, h: bh, label: '◎ 装着', action: () => { } };
      // 強化は1段上に配置
      // 強化はフル幅・中央（孤立させない）
      const upBtn = { id: 'ld_upgrade', x: PX + 14, y: baseY - bh - 8, w: PW - 28, h: bh, label: '▲ 強化', action: () => { } };
      const recY = baseY - bh - 8 - 28;
      const recAtk = { id: 'ld_rec_atk', x: PX + PW - (bw * 3 + gap * 2) - 14, y: recY, w: bw, h: 24, label: 'おすすめ:攻撃', action: () => { recommendEquips('atk'); } };
      const recDef = { id: 'ld_rec_def', x: PX + PW - (bw * 2 + gap) - 14, y: recY, w: bw, h: 24, label: 'おすすめ:耐久', action: () => { recommendEquips('def'); } };
      const recCrit = { id: 'ld_rec_crt', x: PX + PW - (bw + 0) - 14, y: recY, w: bw, h: 24, label: 'おすすめ:会心', action: () => { recommendEquips('crit'); } };

      const isEquipped = (() => {
        if (!item) return false;
        if (game.loadoutTab === 0) return (game.playerLoadout.charId === item.id) || (item.id === 'char_basic' && !game.playerLoadout.charId);
        if (game.loadoutTab === 1) return Array.isArray(game.playerLoadout?.equip) && game.playerLoadout.equip.includes(item.id);
        if (game.loadoutTab === 2) return Array.isArray(game.playerLoadout?.pets) && game.playerLoadout.pets.includes(item.id);
        if (game.loadoutTab === 3) return (game.playerLoadout.weaponId === item.id) || (!item.id && !game.playerLoadout.weaponId);
        return false;
      })();

      // ペット強化モード中は下部UIを置き換える（通常の装備中ボタン等は非表示）
      if (game.loadoutTab === 2 && game.petUpgradePanel && game.petUpgradePanel.open) {
        return btns;
      }
      // 強化パネル（キャラ/装備/武器）表示中も下部UIを置き換える
      if (game.loadoutUpgradeOverlay && game.loadoutUpgradeOverlay.open) {
        return btns;
      }
      // 装備中は「状態表示＋押せる」扱い（タップで外す）
      toggleBtn.label = isEquipped ? '● 装備中（タップで外す）' : '◎ 装着';
      // 装着をメインに強調
      toggleBtn.glowMult = 1.25;
      toggleBtn.color = isEquipped ? '#66ffaa' : '#66ccff';
      // 強化はサブ
      upBtn.glowMult = 0.95;
      upBtn.color = '#0cf';
      toggleBtn.action = () => {
        if (!item) return;
        // 外す（装備中の“そのアイテム”を外す）
        if (isEquipped) {
          if (game.loadoutTab === 0) {
            game.playerLoadout.charId = null; saveLoadout(); return;
          }
          if (game.loadoutTab === 1) {
            if (Array.isArray(game.playerLoadout?.equip)) {
              game.playerLoadout.equip = game.playerLoadout.equip.map(eid => eid === item.id ? null : eid);
              saveLoadout();
            }
            return;
          }
          if (game.loadoutTab === 2) {
            if (Array.isArray(game.playerLoadout?.pets)) {
              game.playerLoadout.pets = game.playerLoadout.pets.map(pid => pid === item.id ? null : pid);
              saveLoadout();
            }
            return;
          }
          if (game.loadoutTab === 3) {
            game.playerLoadout.weaponId = null; saveLoadout(); return;
          }
          return;
        }
        // 装着
        game.petLevelUpOverlay = null;
        applyLoadoutSelection(item);
      };
      btns.push(toggleBtn);

      // 「おすすめ」操作は右上のフィルタータブに統一（左ボタンは廃止）

      const inv = item && item.id ? game.gachaInventory?.[item.id] : null;
      const canGachaUp = !!(item && item.id && getLevelUpCost(item));
      const canPetUp = !!(game.loadoutTab === 2 && item && item.id && inv && (inv.level || 1) < 5);
      const can = canGachaUp || canPetUp;
      if (can) {
        upBtn.action = () => {
          if (!item || !item.id) return;
          // 強化ボタンは「詳細を開く」に統一（もう一度押すと実行）
          if (game.loadoutTab === 2) {
            // ペットはモーダルではなく「強化モード」展開
            const open = !!(game.petUpgradePanel && game.petUpgradePanel.open && game.petUpgradePanel.petId === item.id);
            game.petUpgradePanel = { open: !open, petId: item.id, changedAt: game.frameCount };
            return;
          }
          const open = !!(game.loadoutUpgradeOverlay && game.loadoutUpgradeOverlay.open && game.loadoutUpgradeOverlay.itemId === item.id);
          game.loadoutUpgradeOverlay = { itemId: item.id, tab: game.loadoutTab, open: !open, changedAt: game.frameCount };
        };
        btns.push(upBtn);
      }
    } catch (e) { }
    return btns;
  },
  map: [BACK_BTN],
  shop: [BACK_BTN],
  stardust_shop: [{ id: 'back', x: 14, y: 558, w: 196, h: 34, label: '◀  ガチャに戻る', action: () => { game.state = 'gacha'; } }],
  missions: [{ id: 'back', x: 14, y: 558, w: 196, h: 34, label: '◀  BACK', action: () => { game.state = 'customize'; } }],
  mode_select: [
    { id: 'ms_boss', x: 60, y: 80, w: 320, h: 400, action: () => { game.bossRushModeActive = true; game.endlessModeActive = false; startGame(); } },
    { id: 'ms_endless', x: 420, y: 80, w: 320, h: 400, action: () => { game.endlessModeActive = true; game.bossRushModeActive = false; startGame(); } },
    { id: 'back', x: 14, y: 558, w: 196, h: 34, label: '◀  BACK', action: () => { game.state = 'customize'; } },
  ],
  boss_select: [
    { id: 'back', x: 14, y: 558, w: 196, h: 34, label: '◀  BACK', action: () => { game.state = 'customize'; } },
  ],
  get customize() {
    const L = getCustomizeLayout();
    const { MX, CW, eY, eH, infoY, infoH, startY2, startH2, bMX, bCW, stageSelY, stageSelH, navTabY, navTabH, navTabW } = L;
    const strtAction = () => {
      game.bossRushModeActive = false;
      game.startStage = Math.max(1, Math.min(game.startStage, game.highestStage));
      startGame();
    };
    const stageSelAction = () => {
      game.bossRushModeActive = false;
      game.startStage = Math.max(1, Math.min(game.startStage, game.highestStage));
      const hs = Math.max(1, game.highestStage);
      const maxI = Math.max(0, hs - 1);
      game.stageSelectIdx = Math.max(0, Math.min(maxI, game.startStage - 1));
      game.stageMapScrollOffset = Math.floor(game.stageSelectIdx / 10) * 270;
      const pos = getStageSelectShipTarget(H, getStageSelectShipFollowStage(game.stageSelectIdx + 1, game.highestStage));
      if (pos) { game.stageCharX = pos.x; game.stageCharY = pos.y; game.stageCharTX = pos.x; game.stageCharTY = pos.y; }
      game.state = 'stage_select';
    };
    return [
      { id: 'ui_load', x: MX, y: eY, w: CW, h: eH, action: () => { game.customizeCursor = 0; game.loadoutTab = 0; game.loadoutCursor = 0; game.state = 'loadout'; } },
      { id: 'ui_hdr_notif', x: 0 * navTabW, y: navTabY, w: navTabW, h: navTabH, action: () => { loadInbox(); game.notifTab = 0; game.state = 'notifications'; } },
      { id: 'ui_hdr_event', x: 1 * navTabW, y: navTabY, w: navTabW, h: navTabH, action: () => { game.notifTab = 1; game.state = 'notifications'; } },
      { id: 'ui_gach', x: 2 * navTabW, y: navTabY, w: navTabW, h: navTabH, action: () => { game.customizeCursor = 1; game.state = 'gacha'; } },
      { id: 'ui_shop', x: 3 * navTabW, y: navTabY, w: navTabW, h: navTabH, action: () => { game.customizeCursor = 2; game.shopCursor = 0; game.shopTreeFocusId = null; game.shopSubgraphCatId = null; game.shopSubgraphScrollY = 0; game.shopTab = 0; resetShopHexCamera(); clearShopHexSel(); updateShopPanel(null); game.state = 'shop'; } },
      { id: 'ui_miss', x: 4 * navTabW, y: navTabY, w: navTabW, h: navTabH, action: () => { game.customizeCursor = 3; game.missionsScrollY = 0; ensureNormalQuestProfile(); checkAndClaimNormalQuests(); ensureActiveMissions(); game.state = 'missions'; } },
      { id: 'ui_boss', x: 5 * navTabW, y: navTabY, w: navTabW, h: navTabH, action: () => { game.customizeCursor = 5; game.bossSelectCursor = 0; game.state = 'boss_select'; } },
      { id: 'ui_stage_sel', x: MX + 8, y: stageSelY, w: CW - 16, h: stageSelH, action: stageSelAction },
      { id: 'ui_equip_expand', x: MX + CW - 104, y: eY + 4, w: 92, h: 20, action: () => { game.customizeEquipExpanded = !game.customizeEquipExpanded; } },
      { id: 'ui_hdr_set', x: MX + 108, y: 6, w: 34, h: 26, action: () => { game.state = 'settings'; } },
      { id: 'ui_gem_plus', x: 700, y: 8, w: 26, h: 20, action: () => { game.iapScroll = 0; game.state = 'iap'; } },
      { id: 'ui_strt', x: bMX, y: startY2, w: bCW, h: startH2, action: strtAction },
    ];
  },
};


function handleKey(code) {
  // ポーズ
  if (code === 'Escape') {
    if (game.state === 'playing') { game.paused = !game.paused; return; }
    if (game.state === 'paused') { game.paused = false; game.state = 'playing'; return; }
    if (game.state === 'stage_select') { game.state = 'customize'; return; }
    if (game.state === 'map') { game.state = 'customize'; return; }
    if (game.state === 'loadout') { game.petLevelUpOverlay = null; game.state = 'customize'; return; }
    if (game.state === 'shop') { game.state = 'customize'; return; }
    if (game.state === 'gacha_result') { game.state = 'gacha'; return; }
    if (game.state === 'gacha' && game.gachaInsufficientModal && game.gachaInsufficientModal.open) { game.gachaInsufficientModal.open = false; return; }
    if (game.state === 'gacha' && game.gachaRatesModal) { game.gachaRatesModal = false; return; }
    if (game.state === 'gacha') { game.state = 'customize'; return; }
    if (game.state === 'mode_select') { game.state = 'customize'; return; }
    if (game.state === 'boss_select') { game.state = 'customize'; return; }
    if (game.state === 'gacha_rates') { game.state = 'gacha'; return; }
    if (game.state === 'stardust_shop') { game.state = 'gacha'; return; }
    if (game.state === 'settings') { game.state = 'customize'; return; }
    if (game.state === 'notifications') { game.state = 'customize'; return; }
    if (game.state === 'inbox') { game.state = 'customize'; return; }
    if (game.state === 'events') { game.state = 'customize'; return; }
    if (game.state === 'iap') { game.state = 'customize'; return; }
  }
  if (game.paused) return;
  // ステージ選択
  if (game.state === 'stage_select') {
    const hs = Math.max(1, Number.isFinite(game.highestStage) ? game.highestStage : 1);
    const maxIdx = Math.max(0, hs - 1);
    if (game.stageSelectIdx < 0) game.stageSelectIdx = 0;
    if (game.stageSelectIdx > maxIdx) game.stageSelectIdx = maxIdx;
    if (code === 'ArrowLeft' || code === 'KeyA') game.stageSelectIdx = Math.max(0, game.stageSelectIdx - 1);
    else if (code === 'ArrowRight' || code === 'KeyD') game.stageSelectIdx = Math.min(maxIdx, game.stageSelectIdx + 1);
    else if (code === 'ArrowUp' || code === 'KeyW') game.stageSelectIdx = Math.max(0, game.stageSelectIdx - 5);
    else if (code === 'ArrowDown' || code === 'KeyS') game.stageSelectIdx = Math.min(maxIdx, game.stageSelectIdx + 5);
    else if (code === 'Space' || code === 'Enter') {
      const selS = game.stageSelectIdx + 1;
      if (selS > hs) return;
      game.startStage = selS;
      // Enter/Space でも出撃ボタンにフォーカスした状態で「出撃準備」へ戻す
      game.customizeCursor = 4;
      game.state = 'customize';
      return;
    }
    game.stageMapScrollOffset = Math.floor(game.stageSelectIdx / 10) * 270;
    return;
  }
  if (game.state === 'gacha') {
    if (code === 'KeyQ') game.gachaTab = 0;
    else if (code === 'KeyE') game.gachaTab = 1;
    else if (code === 'KeyT') game.gachaTab = 2;
    else if (code === 'KeyD' && game.gachaTab === 0) doDailyGacha();
    else if (code === 'Digit1' && game.gachaTab < 2) game.gachaTab === 0 ? doGachaPull(1) : doPremiumPull(1);
    else if (code === 'Digit2' && game.gachaTab < 2) game.gachaTab === 0 ? doGachaPull(10) : doPremiumPull(10);
    else if (code === 'ArrowLeft' && game.gachaTab === 2) game.collectionFilter = Math.max(0, game.collectionFilter - 1);
    else if (code === 'ArrowRight' && game.gachaTab === 2) game.collectionFilter = Math.min(3, game.collectionFilter + 1);
    else if (code === 'ArrowUp' && game.gachaTab === 2) game.collectionCursor = Math.max(0, game.collectionCursor - ZUKAN_GRID_COLS);
    else if (code === 'ArrowDown' && game.gachaTab === 2) game.collectionCursor++;
    else if (code === 'KeyR') game.gachaRatesModal = true;
    else if (code === 'KeyS') { game.gachaRatesModal = false; game.stardustShopCursor = 0; game.state = 'stardust_shop'; }
    return;
  }
  if (game.state === 'stardust_shop') {
    if (code === 'Escape') { game.state = 'gacha'; return; }
    if (code === 'ArrowUp' || code === 'KeyW') game.stardustShopCursor = Math.max(0, game.stardustShopCursor - 1);
    else if (code === 'ArrowDown' || code === 'KeyS') game.stardustShopCursor = Math.min(2, game.stardustShopCursor + 1);
    else if (code === 'Space' || code === 'Enter') applyStardustShop(game.stardustShopCursor);
    return;
  }
  if (game.state === 'gacha_result') {
    if (code === 'Digit1') { (game.gachaTab === 1 ? doPremiumPull : doGachaPull)(1); return; }
    if (code === 'Digit2') { (game.gachaTab === 1 ? doPremiumPull : doGachaPull)(10); return; }
    if (code === 'Space' || code === 'Enter') { handleGachaResultPrimaryAction(); return; }
    return;
  }
  if (game.state === 'gacha_summary') {
    if (code === 'Digit1') { game.gachaTab === 0 ? doGachaPull(1) : doPremiumPull(1); return; }
    if (code === 'Digit2') { game.gachaTab === 0 ? doGachaPull(10) : doPremiumPull(10); return; }
    if (code === 'Space' || code === 'Enter' || code === 'Escape') game.state = 'gacha';
    return;
  }
  if (game.state === 'stage_result') {
    if (game.stageResultTimer > 30) {
      if (code === 'Escape' || code === 'KeyS' || code === 'Digit2') {
        game.stageResultData = null;
        game.stageSelectIdx = Math.min(game.stage, game.highestStage) - 1;
        game.stageMapScrollOffset = Math.floor(game.stageSelectIdx / 10) * 270;
        const pos = getStageSelectShipTarget(H, getStageSelectShipFollowStage(game.stageSelectIdx + 1, game.highestStage));
        if (pos) { game.stageCharX = pos.x; game.stageCharY = pos.y; game.stageCharTX = pos.x; game.stageCharTY = pos.y; }
        game.state = 'stage_select';
      } else {
        game.stageResultData = null;
        genMapRoutes(); chooseRoute(Math.floor(Math.random() * 2));
      }
    }
    return;
  }
  if (game.state === 'gacha_rates') {
    if (code === 'Escape') game.state = 'gacha';
    else if (code === 'ArrowDown' || code === 'KeyS') game.gachaRatesScroll++;
    else if (code === 'ArrowUp' || code === 'KeyW') game.gachaRatesScroll = Math.max(0, game.gachaRatesScroll - 1);
    return;
  }
  if (game.state === 'missions') {
    if (code === 'Escape') { game.missionsScrollY = 0; game.state = 'customize'; return; }
    const STEP = 60;
    if (code === 'ArrowDown' || code === 'KeyS') game.missionsScrollY = (game.missionsScrollY || 0) + STEP;
    else if (code === 'ArrowUp' || code === 'KeyW') game.missionsScrollY = Math.max(0, (game.missionsScrollY || 0) - STEP);
    return;
  }
  if (game.state === 'loadout') {
    if (code === 'Escape') {
      if (game.petUpgradePanel && game.petUpgradePanel.open) { game.petUpgradePanel.open = false; game.petUpgradePanel.changedAt = game.frameCount; return; }
      if (game.petLevelUpOverlay) { game.petLevelUpOverlay = null; return; }
      if (game.loadoutUpgradeOverlay) { game.loadoutUpgradeOverlay = null; return; }
      game.state = 'customize'; return;
    }
    {
      const _pool = buildLoadoutPool();
      // キャラ一覧は3列で密度UP
      const COLS = game.loadoutTab === 0 ? 3 : 4;
      const maxIdx = _pool.length - 1;
      const curIt = _pool[Math.min(game.loadoutCursor, _pool.length - 1)];
      if (code === 'KeyQ' || code === 'BracketLeft') { game.loadoutTab = Math.max(0, game.loadoutTab - 1); game.loadoutCursor = 0; game.petLevelUpOverlay = null; }
      else if (code === 'KeyE' || code === 'BracketRight') { game.loadoutTab = Math.min(3, game.loadoutTab + 1); game.loadoutCursor = 0; game.petLevelUpOverlay = null; }
      // 装備タブ: フィルタ/ソート
      else if (game.loadoutTab === 1 && code === 'Digit0') { game.equipFilterSlot = 'all'; game.loadoutCursor = 0; }
      else if (game.loadoutTab === 1 && code === 'Digit1') { game.equipFilterSlot = 'atk'; game.loadoutCursor = 0; }
      else if (game.loadoutTab === 1 && code === 'Digit2') { game.equipFilterSlot = 'def'; game.loadoutCursor = 0; }
      else if (game.loadoutTab === 1 && code === 'Digit3') { game.equipFilterSlot = 'sp'; game.loadoutCursor = 0; }
      else if (game.loadoutTab === 1 && code === 'KeyR') {
        const order = ['ALL', 'LR', 'SSR', 'SR', 'R', 'N'];
        const ci = order.indexOf(game.equipFilterRarity || 'ALL');
        game.equipFilterRarity = order[(ci + 1 + order.length) % order.length];
        game.loadoutCursor = 0;
      }
      else if (game.loadoutTab === 1 && code === 'KeyF') { game.equipFilterEquippedOnly = !game.equipFilterEquippedOnly; game.loadoutCursor = 0; }
      else if (game.loadoutTab === 1 && code === 'KeyU') { game.equipFilterUnleveledOnly = !game.equipFilterUnleveledOnly; game.loadoutCursor = 0; }
      else if (game.loadoutTab === 1 && code === 'KeyT') { game.equipSortMode = ((game.equipSortMode || 0) + 1) % 3; game.loadoutCursor = 0; }
      // 装備解除のスロット選択（Z/X/C）＋解除（Backspace/Delete）
      else if (game.loadoutTab === 1 && (code === 'KeyZ' || code === 'KeyX' || code === 'KeyC')) {
        const sm = { KeyZ: 0, KeyX: 1, KeyC: 2 };
        const idx = sm[code];
        if (game.playerLoadout) {
          game.playerLoadout._equipSlot = idx;
          saveLoadout();
        }
      }
      else if (game.loadoutTab === 1 && (code === 'Backspace' || code === 'Delete')) {
        const idx = (game.playerLoadout ? game.playerLoadout._equipSlot : 0) || 0;
        if (Array.isArray(game.playerLoadout?.equip)) {
          game.playerLoadout.equip[idx] = null;
          saveLoadout();
        }
      }
      else if (code === 'ArrowLeft' || code === 'KeyA') {
        const prev = game.loadoutCursor;
        game.loadoutCursor = Math.max(0, game.loadoutCursor - 1); game.petLevelUpOverlay = null;
        if (game.loadoutCursor !== prev) { game.loadoutSelAnimFrame = game.frameCount; game.loadoutSelAnimDir = -1; }
      }
      else if (code === 'ArrowRight' || code === 'KeyD') {
        const prev = game.loadoutCursor;
        game.loadoutCursor = Math.min(maxIdx, game.loadoutCursor + 1); game.petLevelUpOverlay = null;
        if (game.loadoutCursor !== prev) { game.loadoutSelAnimFrame = game.frameCount; game.loadoutSelAnimDir = 1; }
      }
      else if (code === 'ArrowUp' || code === 'KeyW') {
        const prev = game.loadoutCursor;
        game.loadoutCursor = Math.max(0, game.loadoutCursor - COLS); game.petLevelUpOverlay = null;
        if (game.loadoutCursor !== prev) { game.loadoutSelAnimFrame = game.frameCount; game.loadoutSelAnimDir = -1; }
      }
      else if (code === 'ArrowDown' || code === 'KeyS') {
        const prev = game.loadoutCursor;
        game.loadoutCursor = Math.min(maxIdx, game.loadoutCursor + COLS); game.petLevelUpOverlay = null;
        if (game.loadoutCursor !== prev) { game.loadoutSelAnimFrame = game.frameCount; game.loadoutSelAnimDir = 1; }
      }
      else if (code === 'Space' || code === 'Enter') {
        // ENTER は常に「装備/決定」に統一（ペットも同様）
        game.petLevelUpOverlay = null;
        if (curIt) applyLoadoutSelection(curIt);
      }
      else if (code === 'KeyL') {
        const it = _pool[Math.min(game.loadoutCursor, _pool.length - 1)];
        if (!it) return;
        // ペット: L で強化エリア展開/実行
        if (game.loadoutTab === 2 && it.id) {
          if (!game.petUpgradePanel) game.petUpgradePanel = { open: false, petId: it.id, changedAt: game.frameCount };
          if (!game.petUpgradePanel.open || game.petUpgradePanel.petId !== it.id) {
            game.petUpgradePanel = { open: true, petId: it.id, changedAt: game.frameCount };
            return;
          }
          if (canPetUpgrade(it.id)) tryPetLevelUp(it.id);
          return;
        }
        tryLevelUpItem(it);
      }
    }
    return;
  }
  if (game.state === 'shop') {
    if (code === 'Escape') {
      if (game.shopSubgraphCatId) { game.shopSubgraphCatId = null; game.shopSubgraphScrollY = 0; game.shopTreeFocusId = null; return; }
      game.state = 'customize'; return;
    }
    if (code === 'KeyQ') {
      const was = game.shopTab;
      game.shopTab = 0;
      game.shopSubgraphCatId = null;
      game.shopSubgraphScrollY = 0;
      if (was !== 0) { game._shopTreeAutoCenter = true; }
    }
    else if (code === 'KeyE') { game.shopSubgraphCatId = null; game.shopSubgraphScrollY = 0; game.shopTab = 1; clearShopHexSel(); updateShopPanel(null); }
    else if (code === 'KeyR') { game.shopSubgraphCatId = null; game.shopSubgraphScrollY = 0; game.shopTab = 2; game.fusionCursor = 0; clearShopHexSel(); updateShopPanel(null); }
    else if (code === 'ArrowUp' || code === 'KeyW') {
      if (game.shopTab === 0) { game.shopTreeFocusId = null; game.shopSubgraphCatId = null; game.shopSubgraphScrollY = 0; game.shopCursor = Math.max(0, game.shopCursor - 1); }
      else if (game.shopTab === 2) game.fusionCursor = Math.max(0, game.fusionCursor - 1);
    }
    else if (code === 'ArrowDown' || code === 'KeyS') {
      if (game.shopTab === 0) { game.shopTreeFocusId = null; game.shopSubgraphCatId = null; game.shopSubgraphScrollY = 0; game.shopCursor = Math.min(SHOP_ITEMS.length - 1, game.shopCursor + 1); }
      else if (game.shopTab === 2) game.fusionCursor++;
    }
    else if (code === 'Space' || code === 'Enter') {
      if (game.shopTab === 0) applyShopUpgrade(game.shopCursor);
      else if (game.shopTab === 1) tryCompose();
      else if (game.shopTab === 2) {
        const fPool = WEAPON_GACHA_POOL.filter(w => {
          const inv = game.gachaInventory[w.id];
          if (!inv) return false;
          if (inv.locked) return false;
          return (inv.mat || 0) >= 1 && (inv.level || 1) < 5;
        });
        const fw = fPool[Math.min(game.fusionCursor, fPool.length - 1)];
        if (fw) doWeaponFusion(fw.id);
      }
    }
    return;
  }
  if (game.state === 'customize') {
    if (code === 'ArrowUp' || code === 'KeyW') game.customizeCursor = Math.max(0, game.customizeCursor - 1);
    else if (code === 'ArrowDown' || code === 'KeyS') game.customizeCursor = Math.min(5, game.customizeCursor + 1);
    else if (code === 'Space' || code === 'Enter') {
      if (game.customizeCursor === 0) { game.loadoutTab = 0; game.loadoutCursor = 0; game.state = 'loadout'; return; }
      if (game.customizeCursor === 1) { game.state = 'gacha'; return; }
      if (game.customizeCursor === 2) {
        game.shopCursor = 0;
        game.shopTab = 0;
        game.shopTreeFocusId = null;
        game.shopSubgraphCatId = null;
        game.shopSubgraphScrollY = 0;
        // 開いた瞬間に CORE が中央に来るよう、ツリーをセンタリング
        game.shopTreeScrollX = 0;
        game.shopTreeScrollY = 0;
        game._shopTreeAutoCenter = true;
        game.state = 'shop';
        return;
      }
      if (game.customizeCursor === 3) { game.missionsScrollY = 0; game.state = 'missions'; return; }
      if (game.customizeCursor === 4) {
        game.bossRushModeActive = false;
        game.startStage = Math.max(1, Math.min(game.startStage, game.highestStage));
        startGame();
        return;
      }
      if (game.customizeCursor === 5) { game.bossSelectCursor = 0; game.state = 'boss_select'; return; }
      game.state = 'mode_select';
    }
    else if (code === 'KeyG') { game.state = 'gacha'; return; }
    return;
  }
  if (game.state === 'mode_select') {
    if (code === 'Digit1' || code === 'KeyB') { game.bossRushModeActive = true; game.endlessModeActive = false; startGame(); return; }
    if (code === 'Digit2' || code === 'KeyN') { game.endlessModeActive = true; game.bossRushModeActive = false; startGame(); return; }
    return;
  }
  if (game.state === 'boss_select') {
    const bLen = BOSS_SELECT_DATA.length;
    if (code === 'ArrowRight' || code === 'KeyD') game.bossSelectCursor = Math.min(bLen - 1, game.bossSelectCursor + 1);
    else if (code === 'ArrowLeft' || code === 'KeyA') game.bossSelectCursor = Math.max(0, game.bossSelectCursor - 1);
    else if (code === 'ArrowDown' || code === 'KeyS') game.bossSelectCursor = Math.min(bLen - 1, game.bossSelectCursor + 3);
    else if (code === 'ArrowUp' || code === 'KeyW') game.bossSelectCursor = Math.max(0, game.bossSelectCursor - 3);
    else if (code === 'KeyQ') game.bossDifficulty = Math.max(0, (game.bossDifficulty ?? 1) - 1);
    else if (code === 'KeyE') game.bossDifficulty = Math.min(2, (game.bossDifficulty ?? 1) + 1);
    else if (code === 'Enter' || code === 'Space') {
      const b = BOSS_SELECT_DATA[game.bossSelectCursor];
      if (b && game.highestStage >= b.stageReq) {
        game.selectedBossAbility = b.id; game.bossRushModeActive = true; game.endlessModeActive = false; startGame();
      }
    }
    return;
  }
  if (game.state === 'map') {
    if (code === 'Digit1') chooseRoute(0);
    else if (code === 'Digit2') chooseRoute(1);
    return;
  }
  if (code === 'KeyR' && game.state === 'gameover') {
    game.continueNoStarsThisRun = false;
    showMessage(null); startBGM(); game.stage = game.startStage; initStars(); updateHUD(); initStage(); game.state = 'playing';
  }
  if (code === 'KeyC' && game.state === 'gameover') {
    if (tryContinueFromGameOver()) return;
  }
  if (code === 'KeyB' && game.state === 'gameover' && game.selectedBossAbility) {
    showMessage(null); game.bossRushModeActive = true; game.endlessModeActive = false; startGame(); return;
  }
  if (code === 'Space' || code === 'Enter') {
    if (game.state === 'title') {
      initAudio(); startBGM();
      game.titleWarpTimer = 0;
      game.state = 'title_warp';
    }
    else if (game.state === 'gameover') {
      game.continueNoStarsThisRun = false;
      showMessage(null); startBGM(); game.customizeCursor = 0; game.bossRushModeActive = false; game.endlessModeActive = false; game.state = 'customize';
    }
    else if (game.state === 'clear-stage') { showMessage(null); nextStage(); }
  }
  if (game.state === 'playing' && game.skillChoices) {
    if (code === 'Digit1') applySkill(0);
    else if (code === 'Digit2') applySkill(1);
    else if (code === 'Digit3') applySkill(2);
    return;
  }
  if (code === 'KeyQ' && game.state === 'playing') cycleWeapon();
  if (code === 'ShiftLeft' && game.state === 'playing') tryDash();
  if ((code === 'KeyE' || code === 'Enter') && game.state === 'playing') tryUltimate();
}

bindDocumentKeys({
  onKeyDown(code) { handleKey(code); },
  onKeyUp(code) {
    if ((code === 'KeyZ' || code === 'Space') && game.state === 'playing') {
      if (game.chargeTimer >= CHARGE_MAX) { fireChargedShot(); }
      game.chargeTimer = 0; game.chargeReady = false;
    }
  },
});

/** Space/Enter と同じ（ガチャ結果: スキップ / 次カード / 一覧へ） */
function handleGachaResultPrimaryAction() {
  const now = Date.now();
  if (game.gachaResults.length >= 10 && now - game.lastGachaKeyTime < 450) {
    game.state = 'gacha_summary'; game.lastGachaKeyTime = 0; return;
  }
  game.lastGachaKeyTime = now;
  const item = game.gachaResults[game.gachaCurrentIdx];
  const total = item ? gateTotal(item.rarity) : 999;
  if (game.gachaAnimFrame < total) { game.gachaAnimFrame = total; return; }
  if (game.gachaCurrentIdx < game.gachaResults.length - 1) { game.gachaCurrentIdx++; game.gachaAnimFrame = 0; return; }
  game.state = game.gachaResults.length >= 10 ? 'gacha_summary' : 'gacha';
}

function getGachaResultCardLayout() {
  const cx = W / 2, cy = H / 2;
  const cw = 340, ch = 372, cxl = cx - cw / 2, cyl = cy - ch / 2 - 12;
  return { cx, cy, cw, ch, cxl, cyl };
}

/** 通常/プレミアムタブの天井ブロック直下の補助ボタン行 */
function getGachaAuxStripLayout() {
  if (game.gachaTab === 0) {
    const pityBottom = 356 + 30;
    const stripY = pityBottom + 4;
    return { stripY, ratesBtn: { x: 432, y: stripY, w: 122, h: 42 }, dustBtn: { x: 558, y: stripY, w: 202, h: 42 } };
  }
  if (game.gachaTab === 1) {
    const pityBottom = 378 + 30 + 34 + 22;
    const stripY = pityBottom + 4;
    return { stripY, ratesBtn: { x: 432, y: stripY, w: 122, h: 42 }, dustBtn: { x: 558, y: stripY, w: 202, h: 42 } };
  }
  return null;
}

function getGachaRatesModalRect() {
  const mw = Math.min(W - 32, 720), mh = Math.min(H - 48, 580);
  return { mx: (W - mw) / 2, my: (H - mh) / 2, mw, mh };
}

function getGachaRatesModalLinkRect() {
  const R = getGachaRatesModalRect();
  return { x: R.mx + 14, y: R.my + R.mh - 40, w: R.mw - 28, h: 28 };
}

function drawGachaAuxInfoStrip(L) {
  const { ratesBtn, dustBtn } = L;
  ctx.fillStyle = 'rgba(20,22,34,0.9)'; ctx.strokeStyle = 'rgba(90,110,160,0.45)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.roundRect(ratesBtn.x, ratesBtn.y, ratesBtn.w, ratesBtn.h, 10); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#6f82ad'; ctx.font = 'bold 10px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('ℹ 排出率', ratesBtn.x + ratesBtn.w / 2, ratesBtn.y + ratesBtn.h / 2 + 4);

  const g = ctx.createLinearGradient(dustBtn.x, dustBtn.y, dustBtn.x + dustBtn.w, dustBtn.y + dustBtn.h);
  g.addColorStop(0, 'rgba(96,70,14,0.98)'); g.addColorStop(1, 'rgba(48,34,8,0.98)');
  // 黄色強調が強いので、グロー/枠の強度を弱める
  ctx.shadowColor = 'rgba(255,210,120,0.28)'; ctx.shadowBlur = 7;
  ctx.fillStyle = g; ctx.strokeStyle = 'rgba(255,214,110,0.65)'; ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.roundRect(dustBtn.x, dustBtn.y, dustBtn.w, dustBtn.h, 10); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;
  ctx.fillStyle = '#ffe7a8'; ctx.font = 'bold 11px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif'; ctx.textAlign = 'left';
  ctx.fillText('スターダスト交換', dustBtn.x + 12, dustBtn.y + 18);
  ctx.fillStyle = '#ffd86a'; ctx.font = 'bold 18px Orbitron,Courier New'; ctx.textAlign = 'right';
  ctx.fillText(`✦ ${game.gachaStardust}`, dustBtn.x + dustBtn.w - 10, dustBtn.y + 30);
  ctx.textAlign = 'left';
}

/** @param {number} boxX @param {number} boxY @param {number} boxW @param {number} boxH */
function drawGachaRatesContent(boxX, boxY, boxW, boxH) {
  const cx = boxX + boxW / 2;
  ctx.fillStyle = '#bbaaff'; ctx.font = `bold ${boxW < 420 ? 11 : 13}px Orbitron,Courier New`; ctx.textAlign = 'center';
  ctx.fillText('排出率 / アイテム一覧', cx, boxY + 14);

  const ratesRowCoin = [{ r: 'LR', v: '0%' }, { r: 'SSR', v: '5%' }, { r: 'SR', v: '15%' }, { r: 'R', v: '30%' }, { r: 'N', v: '50%' }];
  const ratesRowPrem = [{ r: 'LR', v: '1.5%' }, { r: 'SSR', v: '18.5%' }, { r: 'SR', v: '55%' }, { r: 'R', v: '25%' }, { r: 'N', v: '0%' }];
  const isPremRate = game.gachaTab === 1;
  const ratesRow = isPremRate ? ratesRowPrem : ratesRowCoin;
  const gap = boxW < 420 ? 2 : 4, nx = 5, bh = boxH < 380 ? 20 : 24;
  const innerW = boxW - 16;
  const boxRW = (innerW - (nx - 1) * gap) / nx;
  const rx0 = boxX + 8;
  const ry = boxY + 22;
  ratesRow.forEach((rt, i) => {
    const rx = rx0 + i * (boxRW + gap);
    const isLR = rt.r === 'LR';
    const col = isLR ? getLRColor(game.frameCount * 0.06) : RARITY_COLORS[rt.r];
    ctx.fillStyle = 'rgba(15,15,25,0.85)'; ctx.strokeStyle = col; ctx.lineWidth = isLR ? 2 : 1;
    ctx.beginPath(); ctx.roundRect(rx, ry, boxRW, bh, 5); ctx.fill(); ctx.stroke();
    ctx.fillStyle = col; ctx.font = `bold ${boxW < 420 ? 9 : 10}px Orbitron,Courier New`; ctx.textAlign = 'center';
    ctx.fillText(`${rt.r} ${rt.v}`, rx + boxRW / 2, ry + bh * 0.62);
  });
  const fy = ry + bh + 8;
  ctx.fillStyle = '#c1cbe0'; ctx.font = `bold ${boxW < 420 ? 9 : 11}px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif`; ctx.textAlign = 'center';
  ctx.fillText(isPremRate ? 'プレミアム排出率（Nなし）' : '通常(コイン)排出率（LRなし）', cx, fy);
  ctx.fillStyle = '#9da9c6'; ctx.font = `${boxW < 420 ? 8 : 10}px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif`;
  ctx.fillText('10連は通常SR以上1枚確定', cx, fy + 13);

  const order = ['LR', 'SSR', 'SR', 'R', 'N'];
  const sorted = [...ALL_GACHA_POOL].sort((a, b) => order.indexOf(a.rarity) - order.indexOf(b.rarity));
  const listStartY = fy + 26;
  const listEndY = boxY + boxH - 6;
  const cols = 2, colGap = 8;
  const colW = (boxW - 20 - (cols - 1) * colGap) / cols;
  const rows = Math.ceil(sorted.length / cols);
  const ih = 46;
  const visibleRows = Math.max(1, Math.floor((listEndY - listStartY) / ih));
  const maxScroll = Math.max(0, rows - visibleRows);
  game.gachaRatesScroll = Math.max(0, Math.min(game.gachaRatesScroll, maxScroll));
  const startX = boxX + 10;
  sorted.forEach((item, i) => {
    const col = i % cols, row = Math.floor(i / cols);
    const rr = row - game.gachaRatesScroll;
    if (rr < 0 || rr >= visibleRows) return;
    const x = startX + col * (colW + colGap);
    const y = listStartY + rr * ih;
    const owned = !!game.gachaInventory[item.id];
    const isLR = item.rarity === 'LR';
    const rc = isLR ? getLRColor(game.frameCount * 0.05 + i * 0.1) : RARITY_COLORS[item.rarity];
    ctx.fillStyle = owned ? 'rgba(18,18,36,0.92)' : 'rgba(8,8,12,0.75)';
    ctx.strokeStyle = owned ? rc : '#1e1e1e'; ctx.lineWidth = owned ? 1.5 : 1;
    ctx.beginPath(); ctx.roundRect(x, y, colW, ih - 4, 4); ctx.fill(); ctx.stroke();
    ctx.shadowColor = owned ? rc : 'transparent'; ctx.shadowBlur = owned ? 3 : 0;
    ctx.fillStyle = rc; ctx.font = 'bold 10px Orbitron,Courier New'; ctx.textAlign = 'left';
    const titleStr = `[${item.rarity}] ${item.label}`;
    const titleMaxW = colW - (owned ? 48 : 12);
    ctx.fillText(truncateLine(ctx, titleStr, titleMaxW), x + 6, y + 14); ctx.shadowBlur = 0;
    if (owned) {
      const ent = game.gachaInventory[item.id];
      ctx.fillStyle = '#8ef5c4'; ctx.font = 'bold 9px Orbitron,Courier New'; ctx.textAlign = 'right';
      ctx.fillText(`Lv.${ent.level}`, x + colW - 6, y + 14);
      ctx.textAlign = 'left';
    }
    ctx.fillStyle = '#a8b6d0'; ctx.font = '9px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif';
    wrapFillJp(ctx, (item.desc || '').replace(/\r/g, ''), x + 6, y + 26, colW - 12, 11, boxW < 480 ? 2 : 3);
    ctx.textAlign = 'left';
  });
  if (maxScroll > 0) {
    ctx.fillStyle = '#556'; ctx.font = '9px Orbitron,Courier New'; ctx.textAlign = 'center';
    ctx.fillText(`スクロール ${game.gachaRatesScroll + 1}/${maxScroll + 1}（ホイール / ↑↓）`, cx, listEndY + 10);
  }
}


function drawGachaRatesModalOverlay() {
  const R = getGachaRatesModalRect();
  ctx.fillStyle = 'rgba(2,4,14,0.72)'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(14,12,26,0.98)'; ctx.strokeStyle = 'rgba(140,120,220,0.65)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.roundRect(R.mx, R.my, R.mw, R.mh, 14); ctx.fill(); ctx.stroke();
  const hx = R.mx + R.mw - 40, hy = R.my + 8;
  ctx.fillStyle = 'rgba(60,50,90,0.95)'; ctx.strokeStyle = '#8877aa'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.roundRect(hx, hy, 32, 30, 8); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#dde0ff'; ctx.font = 'bold 18px Orbitron,Courier New'; ctx.textAlign = 'center';
  ctx.fillText('×', hx + 16, hy + 22);
  ctx.textAlign = 'left';
  drawGachaRatesContent(R.mx + 10, R.my + 42, R.mw - 20, R.mh - 92);
  const Lk = getGachaRatesModalLinkRect();
  ctx.fillStyle = 'rgba(40,36,70,0.9)'; ctx.strokeStyle = 'rgba(100,90,160,0.5)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.roundRect(Lk.x, Lk.y, Lk.w, Lk.h, 6); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#99aacc'; ctx.font = '10px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('全画面で一覧を開く', Lk.x + Lk.w / 2, Lk.y + Lk.h / 2 + 4);
  ctx.textAlign = 'left';
}

function getGachaInsufficientModalRect() {
  const mw = Math.min(W - 120, 360), mh = 170;
  return { mx: (W - mw) / 2, my: (H - mh) / 2, mw, mh };
}

function drawGachaInsufficientModal() {
  const m = game.gachaInsufficientModal;
  if (!m || !m.open) return;
  const R = getGachaInsufficientModalRect();
  ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(18,12,30,0.97)'; ctx.strokeStyle = 'rgba(255,110,110,0.8)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.roundRect(R.mx, R.my, R.mw, R.mh, 12); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#ffd8d8'; ctx.font = 'bold 15px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('ジェムが不足しています', R.mx + R.mw / 2, R.my + 52);
  ctx.fillStyle = '#e5d6ff'; ctx.font = 'bold 13px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif';
  ctx.fillText('ジェムを購入しますか？', R.mx + R.mw / 2, R.my + 78);
  const by = R.my + 108, bw = 132, bh = 40, gap = 12;
  const bx1 = R.mx + R.mw / 2 - bw - gap / 2, bx2 = R.mx + R.mw / 2 + gap / 2;
  ctx.fillStyle = 'rgba(28,30,44,0.95)'; ctx.strokeStyle = '#7983a5'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.roundRect(bx1, by, bw, bh, 8); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#d4d9ea'; ctx.font = 'bold 13px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif';
  ctx.fillText('いいえ', bx1 + bw / 2, by + 25);
  ctx.fillStyle = 'rgba(88,44,20,0.98)'; ctx.strokeStyle = '#ffbb66'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.roundRect(bx2, by, bw, bh, 8); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#ffe2b0';
  ctx.fillText('はい', bx2 + bw / 2, by + 25);
  ctx.textAlign = 'left';
}

/** @returns {boolean} 処理したら true */
function handleGachaMainClick(mx, my) {
  if (game.gachaInsufficientModal && game.gachaInsufficientModal.open) {
    const R = getGachaInsufficientModalRect();
    const by = R.my + 108, bw = 132, bh = 40, gap = 12;
    const bx1 = R.mx + R.mw / 2 - bw - gap / 2, bx2 = R.mx + R.mw / 2 + gap / 2;
    if (mx >= bx1 && mx <= bx1 + bw && my >= by && my <= by + bh) {
      game.gachaInsufficientModal.open = false;
      return true;
    }
    if (mx >= bx2 && mx <= bx2 + bw && my >= by && my <= by + bh) {
      game.gachaInsufficientModal.open = false;
      game.shopCursor = 2;
      game.shopTreeFocusId = null;
      game.shopSubgraphCatId = null;
      game.shopSubgraphScrollY = 0;
      game.state = 'shop';
      return true;
    }
    if (mx < R.mx || mx > R.mx + R.mw || my < R.my || my > R.my + R.mh) {
      game.gachaInsufficientModal.open = false;
      return true;
    }
    return true;
  }
  if (game.gachaRatesModal) {
    const R = getGachaRatesModalRect();
    const hx = R.mx + R.mw - 40, hy = R.my + 8;
    if (mx >= hx && mx <= hx + 32 && my >= hy && my <= hy + 30) { game.gachaRatesModal = false; return true; }
    const Lk = getGachaRatesModalLinkRect();
    if (mx >= Lk.x && mx <= Lk.x + Lk.w && my >= Lk.y && my <= Lk.y + Lk.h) {
      game.gachaRatesModal = false; game.state = 'gacha_rates'; return true;
    }
    if (mx < R.mx || mx > R.mx + R.mw || my < R.my || my > R.my + R.mh) { game.gachaRatesModal = false; return true; }
    return true;
  }
  const tabW = 120, tabH = 34, tabTy = 6;
  const tabXs = [434, 556, 678];
  for (let ti = 0; ti < 3; ti++) {
    const tx = tabXs[ti];
    if (mx >= tx && mx <= tx + tabW && my >= tabTy && my <= tabTy + tabH) {
      game.gachaTab = ti;
      return true;
    }
  }
  const aux = getGachaAuxStripLayout();
  let hitRates = false, hitDust = false;
  if (aux) {
    const { ratesBtn, dustBtn } = aux;
    hitRates = mx >= ratesBtn.x && mx <= ratesBtn.x + ratesBtn.w && my >= ratesBtn.y && my <= ratesBtn.y + ratesBtn.h;
    hitDust = mx >= dustBtn.x && mx <= dustBtn.x + dustBtn.w && my >= dustBtn.y && my <= dustBtn.y + dustBtn.h;
  }

  if (game.gachaTab === 2) {
    const fW = 88, fH = 30, fStartX = 432, fY = 42;
    for (let fi = 0; fi < 4; fi++) {
      if (mx >= fStartX + fi * fW && mx <= fStartX + fi * fW + (fW - 2) && my >= fY && my <= fY + fH) {
        game.collectionFilter = fi;
        return true;
      }
    }
    const filterPools = getGachaZukanFilterPools();
    const fPool = filterPools[game.collectionFilter] || [];
    const { cols: COLS, cellW, cellH, gPad, gStartX, gStartY, maxRows } = computeZukanGridMetrics(fY, fH);
    const maxCursor = Math.max(0, fPool.length - 1);
    game.collectionCursor = Math.max(0, Math.min(game.collectionCursor, maxCursor));
    const cursorRow = Math.floor(game.collectionCursor / COLS);
    const startRow = Math.max(0, Math.min(cursorRow - Math.floor(maxRows / 2), Math.ceil(fPool.length / COLS) - maxRows));
    for (let row = 0; row < maxRows; row++) {
      for (let col = 0; col < COLS; col++) {
        const idx = (startRow + row) * COLS + col;
        if (idx >= fPool.length) continue;
        const cx2 = gStartX + col * (cellW + gPad), cy2 = gStartY + row * (cellH + gPad);
        if (mx >= cx2 && mx <= cx2 + cellW && my >= cy2 && my <= cy2 + cellH) {
          game.collectionCursor = idx;
          return true;
        }
      }
    }
    const fty = H - 50, fth = 40, fgap = 6;
    const fw1 = Math.floor((W - 434 - fgap * 3) / 2);
    const fx2 = 434 + fw1 + fgap;
    if (mx >= 434 && mx <= 434 + fw1 && my >= fty && my <= fty + fth) {
      game.gachaRatesModal = true;
      return true;
    }
    if (mx >= fx2 && mx <= fx2 + fw1 && my >= fty && my <= fty + fth) {
      game.gachaRatesModal = false;
      game.stardustShopCursor = 0;
      game.state = 'stardust_shop';
      return true;
    }
    return false;
  }

  if (hitRates) { game.gachaRatesModal = true; return true; }
  if (hitDust) { game.gachaRatesModal = false; game.stardustShopCursor = 0; game.state = 'stardust_shop'; return true; }

  if (game.gachaTab === 0) {
    const bdY = 96;
    if (mx >= 432 && mx <= 760 && my >= bdY && my <= bdY + 38 && canDailyGacha()) {
      doDailyGacha();
      return true;
    }
    const b1y = 144;
    if (mx >= 432 && mx <= 760 && my >= b1y && my <= b1y + 90 && game.coins >= 500) {
      doGachaPull(1);
      return true;
    }
    const b2y = 244;
    if (mx >= 432 && mx <= 760 && my >= b2y && my <= b2y + 102 && game.coins >= 5000) {
      doGachaPull(10);
      return true;
    }
    return false;
  }
  const pb1y = 166, pb2y = 266;
  if (mx >= 432 && mx <= 760 && my >= pb1y && my <= pb1y + 90) {
    if (game.gems >= 5) doPremiumPull(1);
    else game.gachaInsufficientModal = { open: true, need: 5 };
    return true;
  }
  if (mx >= 432 && mx <= 760 && my >= pb2y && my <= pb2y + 102) {
    if (game.gems >= 50) doPremiumPull(10);
    else game.gachaInsufficientModal = { open: true, need: 50 };
    return true;
  }
  return false;
}

function handleGachaResultClick(mx, my) {
  const item = game.gachaResults[game.gachaCurrentIdx];
  if (!item) return false;
  if (mx >= 10 && mx <= 10 + 88 && my >= 8 && my <= 8 + 32) {
    game.state = 'gacha';
    return true;
  }
  const { cx, cyl, cw, ch } = getGachaResultCardLayout();
  const total = gateTotal(item.rarity);
  const animDone = game.gachaAnimFrame >= total;
  const isLast = game.gachaCurrentIdx >= game.gachaResults.length - 1;
  if (isLast && animDone) {
    const btnw = 155, btnh = 36;
    const btny = cyl + ch + 22, btn1x = cx - 168, btn2x = cx + 14;
    const can1 = game.gachaTab === 1 ? game.gems >= 5 : game.coins >= 500;
    const can10 = game.gachaTab === 1 ? game.gems >= 50 : game.coins >= 5000;
    if (can1 && mx >= btn1x && mx <= btn1x + btnw && my >= btny && my <= btny + btnh) {
      (game.gachaTab === 1 ? doPremiumPull : doGachaPull)(1);
      return true;
    }
    if (can10 && mx >= btn2x && mx <= btn2x + btnw && my >= btny && my <= btny + btnh) {
      (game.gachaTab === 1 ? doPremiumPull : doGachaPull)(10);
      return true;
    }
  }
  if (game.gachaResults.length > 1 && animDone) {
    for (let i = 0; i < game.gachaResults.length; i++) {
      const dx = cx - game.gachaResults.length * 9 + i * 18;
      const dy = cyl + ch + 8;
      const ddx = mx - dx, ddy = my - dy;
      if (ddx * ddx + ddy * ddy <= 64) {
        game.gachaCurrentIdx = i;
        game.gachaAnimFrame = 0;
        return true;
      }
    }
  }
  if (game.gachaResults.length >= 10 && animDone) {
    const sbx = cx - 120, sby = H - 44, sbw = 240, sbh = 34;
    if (mx >= sbx && mx <= sbx + sbw && my >= sby && my <= sby + sbh) {
      game.state = 'gacha_summary';
      return true;
    }
  }
  const cardL = cx - cw / 2, cardR = cx + cw / 2, cardT = cyl, cardB = cyl + ch + 12;
  if (mx >= cardL && mx <= cardR && my >= cardT && my <= cardB) {
    handleGachaResultPrimaryAction();
    return true;
  }
  if (my >= cardT && my <= H - 8 && mx >= 40 && mx <= W - 40) {
    handleGachaResultPrimaryAction();
    return true;
  }
  return false;
}

function handleGachaSummaryClick(mx, my) {
  const cols = 5, rows = 2, cw = 148, ch = 114, gapX = 5, gapY = 6;
  const totalW = cols * cw + (cols - 1) * gapX;
  const startX = (W - totalW) / 2, startY = 64;
  const boty = startY + rows * ch + (rows - 1) * gapY + 16;
  const btn1x = W / 2 - 318, btn2x = W / 2 + 10, btnw = 304, btnh = 44;
  const can1 = game.gachaTab === 1 ? game.gems >= 5 : game.coins >= 500;
  const can10 = game.gachaTab === 1 ? game.gems >= 50 : game.coins >= 5000;
  if (can1 && mx >= btn1x && mx <= btn1x + btnw && my >= boty && my <= boty + btnh) {
    (game.gachaTab === 1 ? doPremiumPull : doGachaPull)(1);
    return true;
  }
  if (can10 && mx >= btn2x && mx <= btn2x + btnw && my >= boty && my <= boty + btnh) {
    (game.gachaTab === 1 ? doPremiumPull : doGachaPull)(10);
    return true;
  }
  if (mx >= W / 2 - 160 && mx <= W / 2 + 160 && my >= H - 48 && my <= H - 12) {
    game.state = 'gacha';
    return true;
  }
  return false;
}

function handleGachaRatesClick(mx, my) {
  return false;
}

function handleStardustShopClick(mx, my) {
  const itemH = 118, startY = 124, itemW = 600, startX = (W - itemW) / 2;
  const costBoxW = 120, costBoxH = 48, rightPad = 12;
  for (let i = 0; i < STARDUST_SHOP_ITEMS.length; i++) {
    const item = STARDUST_SHOP_ITEMS[i];
    const y = startY + i * (itemH + 10);
    const canAfford = game.gachaStardust >= item.cost;
    const costBoxX = startX + itemW - rightPad - costBoxW;
    const costBoxY = y + 18;
    const actW = costBoxW, actH = 32, actX = costBoxX, actY = costBoxY + costBoxH + 8;
    if (mx >= actX && mx <= actX + actW && my >= actY && my <= actY + actH) {
      game.stardustShopCursor = i;
      if (canAfford) applyStardustShop(i);
      return true;
    }
    if (mx >= startX && mx <= startX + itemW && my >= y && my <= y + itemH) {
      game.stardustShopCursor = i;
      return true;
    }
  }
  const buyY = H - 50, buyW = 220, buyH = 40, buyX = (W - buyW) / 2;
  if (mx >= buyX && mx <= buyX + buyW && my >= buyY && my <= buyY + buyH) {
    applyStardustShop(game.stardustShopCursor);
    return true;
  }
  return false;
}

bindCanvasPointer(canvas, {
  onMouseMove(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width, scaleY = canvas.height / rect.height;
    const mx = (e.clientX - rect.left) * scaleX, my = (e.clientY - rect.top) * scaleY;
    // タイトル背景の追従用（ボタンホバーとは独立）
    game.titlePointerX = mx; game.titlePointerY = my;
    const btns = UI_BUTTONS[game.state] || [];
    let hover = btns.find(b => mx >= b.x && mx <= b.x + b.w && my >= b.y && my <= b.y + b.h) || null;
    // stage_select: ノード/出撃ボタンもホバー対象にする
    if (!hover && game.state === 'stage_select') {
      const hits = Array.isArray(game._stageSelectNodeHits) ? game._stageSelectNodeHits : [];
      const nHit = hits.find(h => { const dx = mx - h.x, dy = my - h.y; return dx * dx + dy * dy <= h.r * h.r; });
      if (nHit) hover = { id: 'ss_node', stage: nHit.stage, x: nHit.x - nHit.r, y: nHit.y - nHit.r, w: nHit.r * 2, h: nHit.r * 2 };
      else if (game._stageSelectLaunchHit) {
        const b = game._stageSelectLaunchHit;
        if (mx >= b.x && mx <= b.x + b.w && my >= b.y && my <= b.y + b.h) hover = { id: 'ss_launch', ...b };
      }
      if (!hover && game._stageSelectBossCardHit) {
        const h = game._stageSelectBossCardHit;
        if (mx >= h.x && mx <= h.x + h.w && my >= h.y && my <= h.y + h.h) hover = { id: 'ss_boss_card', ...h };
      }
    }
    if (!hover && game.state === 'gameover' && Array.isArray(game._gameoverHits)) {
      const tp = 6;
      const gh = game._gameoverHits.find(h => !h.disabled && mx >= h.x - tp && mx <= h.x + h.w + tp && my >= h.y - tp && my <= h.y + h.h + tp);
      if (gh) hover = { id: `go_${gh.type}`, ...gh };
    }
    if (!hover && game.state === 'loadout' && my >= 0 && my <= 47) {
      hover = { id: 'ld_tab', x: 0, y: 0, w: W, h: 47 };
    }
    game.hoveredBtn = hover;
    canvas.style.cursor = game.hoveredBtn ? 'pointer' : 'default';
  },
  onClick(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width, scaleY = canvas.height / rect.height;
    const mx = (e.clientX - rect.left) * scaleX, my = (e.clientY - rect.top) * scaleY;

    const btns = UI_BUTTONS[game.state] || [];
    const _tp = 6; // C: タッチ用パディング
    const btn = btns.find(b => mx >= b.x - _tp && mx <= b.x + b.w + _tp && my >= b.y - _tp && my <= b.y + b.h + _tp);
    if (btn) { game.uiLastTap = { id: btn.id, frame: game.frameCount }; btn.action(); return; }

    // スキル選択タップ
    if (game.state === 'playing' && game.skillChoices && Array.isArray(game._skillChoiceHits)) {
      const sh = game._skillChoiceHits.find(h => mx >= h.x && mx <= h.x + h.w && my >= h.y && my <= h.y + h.h);
      if (sh) { applySkill(sh.idx); return; }
    }
    if (game.state === 'gameover' && Array.isArray(game._gameoverHits)) {
      const tp = 6;
      const gh = game._gameoverHits.find(h => !h.disabled && mx >= h.x - tp && mx <= h.x + h.w + tp && my >= h.y - tp && my <= h.y + h.h + tp);
      if (gh) {
        if (gh.type === 'continue') { if (tryContinueFromGameOver()) return; }
        else if (gh.type === 'retry') {
          game.continueNoStarsThisRun = false;
          showMessage(null); startBGM(); game.stage = game.startStage; initStars(); updateHUD(); initStage(); game.state = 'playing';
          return;
        } else if (gh.type === 'title') {
          game.continueNoStarsThisRun = false;
          showMessage(null); startBGM(); game.customizeCursor = 0; game.bossRushModeActive = false; game.endlessModeActive = false; game.state = 'customize';
          return;
        }
      }
    }
    // ステージリザルト: ボタンタップ
    if (game.state === 'stage_result' && game.stageResultTimer > 60 && Array.isArray(game._stageResultHits)) {
      const rh = game._stageResultHits.find(h => mx >= h.x && mx <= h.x + h.w && my >= h.y && my <= h.y + h.h);
      if (rh) {
        if (rh.type === 'next') { game.stageResultData = null; genMapRoutes(); chooseRoute(Math.floor(Math.random() * 2)); }
        else { game.stageResultData = null; game.stageSelectIdx = Math.min(game.stage, game.highestStage) - 1; game.stageMapScrollOffset = Math.floor(game.stageSelectIdx / 10) * 270; const pos = getStageSelectShipTarget(H, getStageSelectShipFollowStage(game.stageSelectIdx + 1, game.highestStage)); if (pos) { game.stageCharX = pos.x; game.stageCharY = pos.y; game.stageCharTX = pos.x; game.stageCharTY = pos.y; } game.state = 'stage_select'; }
        return;
      }
    }
    // ≡ MENUボタン（プレイ中・ポーズ中共通）
    if ((game.state === 'playing' || game.paused) && game._menuBtnHit) {
      const m = game._menuBtnHit;
      if (mx >= m.x - 4 && mx <= m.x + m.w + 4 && my >= m.y - 4 && my <= m.y + m.h + 4) {
        game.paused = !game.paused; return;
      }
    }
    // ポーズ画面の 再開/やめる ボタン
    if (game.paused && Array.isArray(game._pauseBtnHits)) {
      const ph = game._pauseBtnHits.find(b => mx >= b.x - 4 && mx <= b.x + b.w + 4 && my >= b.y - 4 && my <= b.y + b.h + 4);
      if (ph) {
        if (ph.type === 'resume') { game.paused = false; _quitConfirm = false; return; }
        if (ph.type === 'quit') { _quitConfirm = true; return; }
        if (ph.type === 'volume_slider') {
          const ratio = Math.max(0, Math.min(1, (mx - ph.x) / ph.w));
          game.masterVolume = Math.round(ratio * 10) / 10;
          saveVolume(); return;
        }
      }
    }

    if (game.state === 'gacha' && handleGachaMainClick(mx, my)) return;
    if (game.state === 'gacha_result' && handleGachaResultClick(mx, my)) return;
    if (game.state === 'gacha_summary' && handleGachaSummaryClick(mx, my)) return;
    if (game.state === 'gacha_rates' && handleGachaRatesClick(mx, my)) return;
    if (game.state === 'stardust_shop' && handleStardustShopClick(mx, my)) return;

    // 設定画面
    if (game.state === 'settings' && Array.isArray(game._settingsHits)) {
      const sh = game._settingsHits.find(h => mx >= h.x && mx <= h.x + h.w && my >= h.y && my <= h.y + h.h);
      if (sh) {
        if (sh.type === 'toggle') {
          if (!game.settings) game.settings = { bgm: true, vibration: true, quality: 'high', language: 'ja' };
          game.settings[sh.key] = !game.settings[sh.key];
          if (sh.key === 'bgm') { game.settings.bgm ? startBGM() : stopBGM(); }
          saveSettings();
        } else if (sh.type === 'select') {
          if (!game.settings) game.settings = { bgm: true, vibration: true, quality: 'high', language: 'ja' };
          game.settings[sh.key] = sh.val;
          if (sh.key === 'quality') setTitleBgQuality(sh.val === 'high' ? 'full' : sh.val === 'mid' ? 'fast' : 'low');
          saveSettings();
        } else if (sh.type === 'slider') {
          const ratio = Math.max(0, Math.min(1, (mx - sh.x) / sh.w));
          game.masterVolume = Math.round(ratio * 10) / 10; saveVolume();
        } else if (sh.type === 'name_btn') {
          const raw = typeof window !== 'undefined' && window.prompt ? window.prompt('プレイヤー名（12文字まで・週次ランキング表示用）', game.displayName || 'PLAYER') : null;
          if (raw != null) saveDisplayName(raw);
        }
        return;
      }
    }
    // 受け取りボックス（単独 or 通知画面内）
    if ((game.state === 'inbox' || game.state === 'notifications') && Array.isArray(game._inboxHits)) {
      const ih = game._inboxHits.find(h => mx >= h.x && mx <= h.x + h.w && my >= h.y && my <= h.y + h.h);
      if (ih) { ih.id === 'all' ? claimAllInbox() : claimInboxItem(ih.id); playSound('powerup'); return; }
    }
    // 通知画面タブ切替
    if (game.state === 'notifications' && Array.isArray(game._notifTabHits)) {
      const nt = game._notifTabHits.find(h => mx >= h.x && mx <= h.x + h.w && my >= h.y && my <= h.y + h.h);
      if (nt) { game.notifTab = nt.idx; return; }
    }
    // イベントタブ切替（単独画面）
    if (game.state === 'events' && Array.isArray(game._eventsTabHits)) {
      const et = game._eventsTabHits.find(h => mx >= h.x && mx <= h.x + h.w && my >= h.y && my <= h.y + h.h);
      if (et) { game.eventsTab = et.idx; return; }
    }
    // 課金画面
    if (game.state === 'iap') {
      if (Array.isArray(game._iapAgeHits)) {
        const ah = game._iapAgeHits.find(h => mx >= h.x && mx <= h.x + h.w && my >= h.y && my <= h.y + h.h);
        if (ah) { if (ah.type === 'yes') { game.ageVerified = true; try { localStorage.setItem('invader_age_verified', '1'); } catch (e) { } } else { game.state = 'customize'; } return; }
      }
      if (Array.isArray(game._iapHits)) {
        const ih = game._iapHits.find(h => mx >= h.x && mx <= h.x + h.w && my >= h.y && my <= h.y + h.h);
        if (ih) { showMessage(`テスト購入: ${ih.pkg.label}\n¥${ih.pkg.price.toLocaleString()}\n（実装準備中）`); setTimeout(() => { if (game.state !== 'iap') return; game.state = 'iap'; hideMessage?.(); }, 2000); return; }
      }
    }
    // loadout: equip filter tabs / grid click
    if (game.state === 'loadout') {
      // Top tabs (キャラ/装備/ペット/武器) — drawLoadoutScreen と座標一致（y=0..47, TW=W/4）
      if (my >= 0 && my <= 47) {
        const TW = W / 4;
        const ti = Math.max(0, Math.min(3, Math.floor(mx / TW)));
        if (ti !== game.loadoutTab) {
          game.loadoutTab = ti;
          game.loadoutCursor = 0;
          game.loadoutSelAnimFrame = game.frameCount;
          game.loadoutSelAnimDir = 0;
          // タブ切替時は下部オーバーレイを閉じる（誤操作防止）
          if (game.loadoutUpgradeOverlay) game.loadoutUpgradeOverlay.open = false;
          if (game.petUpgradePanel) game.petUpgradePanel.open = false;
        }
        return;
      }
      // Equip quick filter tabs (全て/攻撃/耐久/会心)
      if (game.loadoutTab === 1 && Array.isArray(game._equipQuickFilterHits)) {
        const hit = game._equipQuickFilterHits.find(h => mx >= h.x && mx <= h.x + h.w && my >= h.y && my <= h.y + h.h);
        if (hit) {
          game.equipQuickFilter = hit.id;
          // 自動選択: 先頭に合わせて左詳細も更新
          game.loadoutCursor = 0;
          game.loadoutSelAnimFrame = game.frameCount;
          game.loadoutSelAnimDir = 0;
          return;
        }
      }
      // Total stats compare toggle (left panel)
      if (game.loadoutTab === 1 && game._equipTotalCompareHit) {
        const h = game._equipTotalCompareHit;
        if (mx >= h.x && mx <= h.x + h.w && my >= h.y && my <= h.y + h.h) {
          game.equipTotalCompareOpen = !game.equipTotalCompareOpen;
          return;
        }
      }
      // Equip sort preset button
      if (game.loadoutTab === 1 && game._equipSortHit) {
        const h = game._equipSortHit;
        if (mx >= h.x && mx <= h.x + h.w && my >= h.y && my <= h.y + h.h) {
          game.equipSortPreset = ((game.equipSortPreset || 0) + 1) % 3;
          game.loadoutCursor = 0;
          game.loadoutSelAnimFrame = game.frameCount;
          game.loadoutSelAnimDir = 0;
          return;
        }
      }

      // Grid click selects item (left detail updates immediately)
      // Recompute same layout as drawLoadoutScreen
      const PX = 4, PY = 50, PW = 290, PH = H - PY - 48;
      const LX = PX + PW + 6, LY = PY, LW = W - LX - 4, LH = PH;
      let equipHudH = 0;
      if (game.loadoutTab === 1) equipHudH = 34;
      let pool = [];
      if (game.loadoutTab === 0) pool = CHAR_POOL.filter(c => game.gachaInventory[c.id] || c.id === 'char_basic');
      else if (game.loadoutTab === 1) pool = buildEquipPool();
      else if (game.loadoutTab === 2) pool = PET_POOL.filter(p => game.gachaInventory[p.id]);
      else pool = [{ id: null, rarity: 'N', type: 'weapon', label: 'CLASSIC', desc: '通常弾・無限', color: '#aaa', weapon: 'normal', ammo: 0 }, ...WEAPON_GACHA_POOL.filter(w => game.gachaInventory[w.id])];
      if (pool.length > 0) {
        const COLS = (game.loadoutTab === 0 ? (LW < 320 ? 2 : 3) : 4);
        const sidePad = 8, basePadY = 8, gap = (game.loadoutTab === 1 ? 8 : 6);
        const padY = basePadY + (equipHudH || 0);
        const cellW = Math.floor((LW - sidePad * 2 - gap * (COLS - 1)) / COLS);
        const cellH = Math.min(cellW, (game.loadoutTab === 1 ? 80 : 72));
        const visRows = Math.max(1, Math.floor((LH - padY - basePadY - 24) / (cellH + gap)));
        const maxIdx = pool.length - 1;
        const cur = Math.min(game.loadoutCursor, Math.max(0, maxIdx));
        const curRow = Math.floor(cur / COLS);
        const startRow = Math.max(0, Math.min(curRow - Math.floor(visRows / 2), Math.ceil(pool.length / COLS) - visRows));

        const gx0 = LX + sidePad;
        const gy0 = LY + padY;
        const gx1 = gx0 + COLS * (cellW + gap) - gap;
        const gy1 = gy0 + visRows * (cellH + gap) - gap;
        if (mx >= gx0 && mx <= gx1 && my >= gy0 && my <= gy1) {
          const col = Math.floor((mx - gx0) / (cellW + gap));
          const row = Math.floor((my - gy0) / (cellH + gap));
          const cx = gx0 + col * (cellW + gap);
          const cy = gy0 + row * (cellH + gap);
          // inside cell bounds (exclude gap area)
          if (mx >= cx && mx <= cx + cellW && my >= cy && my <= cy + cellH) {
            const idx = (startRow + row) * COLS + col;
            if (idx >= 0 && idx < pool.length) {
              const prev = game.loadoutCursor;
              game.loadoutCursor = idx;
              if (game.loadoutCursor !== prev) {
                game.loadoutSelAnimFrame = game.frameCount;
                game.loadoutSelAnimDir = (idx > prev ? 1 : -1);
              }
              return;
            }
          }
        }
      }
    }
    // loadout: upgrade panel (Lv-up button / outside close)
    if (game.state === 'loadout' && game.loadoutUpgradeOverlay && game.loadoutUpgradeOverlay.open) {
      const panelH = 252;
      const yTop = H - 48 - panelH;
      const btnW = 260, btnH = 46;
      const bx = W / 2 - btnW / 2, by = yTop + panelH - (btnH + 10);
      // inside panel?
      if (my >= yTop && my <= yTop + panelH) {
        if (mx >= bx && mx <= bx + btnW && my >= by && my <= by + btnH) {
          const tab = game.loadoutUpgradeOverlay.tab;
          const itemId = game.loadoutUpgradeOverlay.itemId;
          const pool = (tab === 0 ? CHAR_POOL : tab === 1 ? EQUIP_POOL : tab === 2 ? PET_POOL : WEAPON_GACHA_POOL);
          const it = pool.find(x => x.id === itemId);
          if (it && getLevelUpCost(it)) {
            tryLevelUpItem(it);
          }
          // 実行後は閉じる（成功しない場合はそのまま）
          game.loadoutUpgradeOverlay.open = false;
          game.loadoutUpgradeOverlay.changedAt = game.frameCount;
          return;
        }
        return;
      }
      // tap outside closes
      game.loadoutUpgradeOverlay.open = false;
      game.loadoutUpgradeOverlay.changedAt = game.frameCount;
      return;
    }
    // loadout: pet upgrade panel (Lv-up button / outside close)
    if (game.state === 'loadout' && game.loadoutTab === 2 && game.petUpgradePanel && game.petUpgradePanel.open && game.petUpgradePanel.petId) {
      const panelH = 228;
      const yTop = H - 48 - panelH;
      const btnW = 240, btnH = 44;
      const bx = W / 2 - btnW / 2, by = yTop + panelH - 60;
      // inside panel?
      if (my >= yTop && my <= yTop + panelH) {
        // Lv-up button
        if (mx >= bx && mx <= bx + btnW && my >= by && my <= by + btnH) {
          const petId = game.petUpgradePanel.petId;
          if (canPetUpgrade(petId)) {
            tryPetLevelUp(petId);
          }
          return;
        }
        // taps inside panel do nothing
        return;
      }
      // tap outside closes
      game.petUpgradePanel.open = false;
      game.petUpgradePanel.changedAt = game.frameCount;
      return;
    }
    // 任務画面: 達成ミッションの受取クリック
    if (game.state === 'missions' && Array.isArray(game._missionClaimHits)) {
      const hit = game._missionClaimHits.find(h => mx >= h.x && mx <= h.x + h.w && my >= h.y && my <= h.y + h.h);
      if (hit) { claimActiveMission(hit.missionId); return; }
    }
    // ボス選択: 難易度タブ
    if (game.state === 'boss_select' && Array.isArray(game._bossDiffHits)) {
      const dh = game._bossDiffHits.find(h => mx >= h.x - 3 && mx <= h.x + h.w + 3 && my >= h.y - 3 && my <= h.y + h.h + 3);
      if (dh) { game.bossDifficulty = dh.idx; return; }
    }
    // ボス選択: カードタップで即挑戦
    if (game.state === 'boss_select' && Array.isArray(game._bossSelectHits)) {
      const hit = game._bossSelectHits.find(h => mx >= h.x && mx <= h.x + h.w && my >= h.y && my <= h.y + h.h);
      if (hit) {
        game.bossSelectCursor = hit.idx;
        if (game.highestStage >= BOSS_SELECT_DATA[hit.idx].stageReq) {
          game.selectedBossAbility = hit.bossId; game.bossRushModeActive = true; game.endlessModeActive = false; startGame();
        }
        return;
      }
    }
    // ショップ: タブ切替 / カード選択 / ボタン実行
    if (game.state === 'shop' && Array.isArray(game._shopHits)) {
      // A: タブクリック（最優先）
      const tabHit = game._shopHits.find(h => h.type === 'tab' && mx >= h.x && mx <= h.x + h.w && my >= h.y && my <= h.y + h.h);
      if (tabHit) {
        const was = game.shopTab;
        game.shopTab = tabHit.idx;
        game.shopSubgraphCatId = null;
        game.shopSubgraphScrollY = 0;
        if (tabHit.idx !== 0) { game.shopTreeFocusId = null; clearShopHexSel(); updateShopPanel(null); }
        if (tabHit.idx === 2) game.fusionCursor = 0;
        if (tabHit.idx === 0 && was !== 0) { game.shopTreeFocusId = null; game._shopTreeAutoCenter = true; }
        return;
      }
      // ボタン系を優先（カード選択より前にチェック）
      if (game.shopTab === 0 && game.shopSubgraphCatId && game._shopSubgraphPanel) {
        const R = game._shopSubgraphPanel;
        const ch = game._shopHits.find(h => h.type === 'closesg' && mx >= h.x && mx <= h.x + h.w && my >= h.y && my <= h.y + h.h);
        if (ch) { game.shopSubgraphCatId = null; game.shopSubgraphScrollY = 0; game.shopTreeFocusId = null; return; }
        const sg = game._shopHits.find(h => h.type === 'sgfnode' && mx >= h.x && mx <= h.x + h.w && my >= h.y && my <= h.y + h.h);
        if (sg) { game.shopTreeFocusId = sg.nodeId; return; }
        if (mx >= R.x && mx <= R.x + R.w && my >= R.y && my <= R.y + R.h) return;
        game.shopSubgraphCatId = null;
        game.shopSubgraphScrollY = 0;
        game.shopTreeFocusId = null;
      }
      const openSg = game._shopHits.find(h => h.type === 'opensg' && mx >= h.x && mx <= h.x + h.w && my >= h.y && my <= h.y + h.h);
      if (openSg && game.shopTab === 0 && !game.shopSubgraphCatId) {
        game.shopSubgraphCatId = openSg.catId;
        game.shopSubgraphScrollY = 0;
        game.shopTreeFocusId = null;
        return;
      }
      // hex カメラボタン（Tab 0）
      if (game.shopTab === 0) {
        const homehit = game._shopHits.find(h => h.type === 'hexhome' && mx >= h.x && mx <= h.x + h.w && my >= h.y && my <= h.y + h.h);
        if (homehit) { resetShopHexCamera(); return; }
        const ovhit = game._shopHits.find(h => h.type === 'hexoverview' && mx >= h.x && mx <= h.x + h.w && my >= h.y && my <= h.y + h.h);
        if (ovhit) { setShopHexOverview(); return; }
      }
      // hex ノードタップ（Tab 0）
      const hexnode = game._shopHits.find(h => h.type === 'hexnode' && mx >= h.x && mx <= h.x + h.w && my >= h.y && my <= h.y + h.h);
      if (hexnode && game.shopTab === 0) {
        if (getShopHexSel() === hexnode.id) { clearShopHexSel(); updateShopPanel(null); }
        else { setShopHexSel(hexnode.id); updateShopPanel(hexnode.id); }
        return;
      }
      const btn = game._shopHits.find(h => (h.type === 'unlock' || h.type === 'upgrade' || h.type === 'compose' || h.type === 'fuse') && mx >= h.x && mx <= h.x + h.w && my >= h.y && my <= h.y + h.h);
      if (btn) {
        if (btn.type === 'unlock') { applyShopUpgrade(btn.idx); return; }
        if (btn.type === 'upgrade') { applyShopUpgrade(btn.idx); return; }
        if (btn.type === 'compose') { tryCompose(btn.count ?? 1); return; }
        if (btn.type === 'fuse') { doWeaponFusion(btn.weaponId); return; }
      }
      // ツリー: ノード選択 / 再タップで強化（UPGRADEタブ）
      const node = game._shopHits.find(h => h.type === 'node' && mx >= h.x && mx <= h.x + h.w && my >= h.y && my <= h.y + h.h);
      if (node) {
        if (game.shopTab === 0) {
          // スマホ向け: タップで選択、確定は下部の「解放」ボタン
          game.shopTreeFocusId = null;
          game.shopSubgraphCatId = null;
          game.shopSubgraphScrollY = 0;
          game.shopCursor = node.idx;
          return;
        }
        // FUSION タブのノード（将来用）: いまは無視
        return;
      }
      const fnode = game._shopHits.find(h => h.type === 'fnode' && mx >= h.x && mx <= h.x + h.w && my >= h.y && my <= h.y + h.h);
      if (fnode && game.shopTab === 0) {
        game.shopSubgraphCatId = null;
        game.shopSubgraphScrollY = 0;
        game.shopTreeFocusId = fnode.nodeId;
        return;
      }
      const sel = game._shopHits.find(h => (h.type === 'select' || h.type === 'fselect') && mx >= h.x && mx <= h.x + h.w && my >= h.y && my <= h.y + h.h);
      if (sel) {
        if (sel.type === 'select') { game.shopTreeFocusId = null; game.shopSubgraphCatId = null; game.shopSubgraphScrollY = 0; game.shopCursor = sel.idx; return; }
        if (sel.type === 'fselect') { game.fusionCursor = sel.idx; return; }
      }
    }
    // stage_select: 出撃準備ボタンタップ
    if (game.state === 'stage_select' && game._stageSelectLaunchHit) {
      const b = game._stageSelectLaunchHit;
      if (mx >= b.x && mx <= b.x + b.w && my >= b.y && my <= b.y + b.h) {
        // クリック時の縮み演出用
        game.uiLastTap = { id: 'ss_launch', frame: game.frameCount };
        if (game._stageSelectLaunchFuelBlocked) {
          game.lifeGainDisplay = { text: '燃料が足りません', timer: 150, color: '#ff8866' };
          return;
        }
        const selS = game.stageSelectIdx + 1;
        if (selS <= game.highestStage) {
          game.startStage = selS; game.customizeCursor = 4; game.state = 'customize';
        }
        return;
      }
    }
    // stage_select: ボスカード（画像）タップで拡大
    if (game.state === 'stage_select' && game._stageSelectBossCardHit) {
      const h = game._stageSelectBossCardHit;
      if (mx >= h.x && mx <= h.x + h.w && my >= h.y && my <= h.y + h.h) {
        game.stageSelectBossModal = { open: true, src: h.src, title: h.title || '' };
        return;
      }
    }
    // stage_select: ボス拡大モーダルを閉じる
    if (game.state === 'stage_select' && game.stageSelectBossModal?.open) {
      game.stageSelectBossModal.open = false;
      return;
    }
    // stage_select: ノードタップ（初回=選択、同じノード再タップ=出撃準備へ）
    if (game.state === 'stage_select') {
      const hits = Array.isArray(game._stageSelectNodeHits) ? game._stageSelectNodeHits : [];
      for (const h of hits) {
        const dx = mx - h.x, dy = my - h.y;
        if (dx * dx + dy * dy <= h.r * h.r) {
          const s = h.stage;
          // 右パネルへ光ガイド（短い）
          game.stageSelectLinkFx = { x: h.x, y: h.y, until: game.frameCount + 20 };
          if (game.stageSelectIdx === s - 1 && s <= game.highestStage) {
            if (game._stageSelectLaunchFuelBlocked) {
              game.lifeGainDisplay = { text: '燃料が足りません', timer: 150, color: '#ff8866' };
              return;
            }
            // 選択済みを再タップ → 出撃準備へ
            game.startStage = s; game.customizeCursor = 4; game.state = 'customize';
          } else {
            // 初回タップ → 選択のみ
            game.stageSelectIdx = s - 1;
            game.startStage = s;
            game.stageMapScrollOffset = Math.floor(game.stageSelectIdx / 10) * 270;
          }
          return;
        }
      }
    }
  },
});
canvas.addEventListener('wheel', (e) => {
  if (game.state === 'missions') {
    game.missionsScrollY = Math.max(0, (game.missionsScrollY || 0) + e.deltaY * 0.6);
    e.preventDefault();
  }
  // stage_select: 左マップのみ軽い縦スクロール（スナップは描画側で）
  if (game.state === 'stage_select') {
    const cap = Number.isFinite(game._stageSelectMapMaxScroll) ? game._stageSelectMapMaxScroll : 1200;
    game.stageMapScrollOffset = Math.max(0, Math.min(cap, (game.stageMapScrollOffset || 0) + e.deltaY * 0.65));
    game._stageSelectMapSnapAt = Date.now() + 140;
    e.preventDefault();
    return;
  }
  // shop: hex ツリー ズーム/パン
  if (game.state === 'shop' && game.shopTab === 0) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width, scaleY = canvas.height / rect.height;
    const mx = (e.clientX - rect.left) * scaleX, my = (e.clientY - rect.top) * scaleY;
    const f = e.deltaY < 0 ? 1.1 : 0.9;
    shopHexZoomAt(f, mx, my, W, H);
    e.preventDefault();
  }
  if (game.state === 'gacha_rates' || (game.state === 'gacha' && game.gachaRatesModal)) {
    game.gachaRatesScroll = Math.max(0, game.gachaRatesScroll + (e.deltaY > 0 ? 1 : -1));
    e.preventDefault();
  }
}, { passive: false });

// ===== タッチ入力（スマホ対応） =====
let _lastTouchClientX = 0, _lastTouchClientY = 0, _touchStartTime = 0;
let _touchStartCanvasX = 0, _touchLastCanvasX = 0, _touchStartCanvasY = 0, _touchLastCanvasY = 0, _touchIsDrag = false;
function _getTouchPos(touch) {
  const rect = canvas.getBoundingClientRect();
  const sx = canvas.width / rect.width, sy = canvas.height / rect.height;
  return { x: (touch.clientX - rect.left) * sx, y: (touch.clientY - rect.top) * sy };
}
bindCanvasTouch(canvas, {
  onTouchStart(e) {
    const t = e.changedTouches[0];
    _lastTouchClientX = t.clientX; _lastTouchClientY = t.clientY;
    _touchStartTime = Date.now();
    _touchIsDrag = false;
    const { x: mx, y: my } = _getTouchPos(t);
    _touchStartCanvasX = mx; _touchLastCanvasX = mx;
    _touchStartCanvasY = my; _touchLastCanvasY = my;
    game.titlePointerX = mx; game.titlePointerY = my;
    if (game.state === 'playing' && !game.paused && !game.skillChoices) {
      game.joystick = { active: true, baseX: mx, baseY: my, dx: 0, dy: 0 };
      game.touchPos = null;
    } else {
      game.touchPos = { x: mx, y: my };
    }
    const btns = UI_BUTTONS[game.state] || [];
    game.hoveredBtn = btns.find(b => mx >= b.x && mx <= b.x + b.w && my >= b.y && my <= b.y + b.h) || null;
  },
  onTouchMove(e) {
    const t = e.changedTouches[0];
    _lastTouchClientX = t.clientX; _lastTouchClientY = t.clientY;
    const { x: mx, y: my } = _getTouchPos(t);
    const totalDx = mx - _touchStartCanvasX;
    const totalDy = my - _touchStartCanvasY;
    const stepDx = mx - _touchLastCanvasX;
    const stepDy = my - _touchLastCanvasY;
    if (game.state === 'playing' && !game.paused && game.joystick?.active) {
      const JR = 65;
      const rdx = mx - game.joystick.baseX, rdy = my - game.joystick.baseY;
      const dist = Math.sqrt(rdx * rdx + rdy * rdy);
      if (dist > JR) { game.joystick.dx = rdx / dist * JR; game.joystick.dy = rdy / dist * JR; }
      else { game.joystick.dx = rdx; game.joystick.dy = rdy; }
      _touchLastCanvasY = my;
      game.titlePointerX = mx; game.titlePointerY = my;
      return;
    }
    // F: スワイプ閾値を超えたらスクロールモード（縦/横どちらでもOK）
    if (Math.abs(totalDy) > 12 || Math.abs(totalDx) > 12) _touchIsDrag = true;
    if (_touchIsDrag) {
      game.touchPos = null; // スクロール中はプレイヤー追従しない
      // F: ミッション画面スクロール
      if (game.state === 'missions') {
        game.missionsScrollY = Math.max(0, (game.missionsScrollY || 0) - stepDy);
      }
      // F: ステージ選択マップスクロール
      if (game.state === 'stage_select') {
        // cap は描画側で正確に計算する（ここではざっくり進める）
        const cap = Number.isFinite(game._stageSelectMapMaxScroll) ? game._stageSelectMapMaxScroll : 1200;
        game.stageMapScrollOffset = Math.max(0, Math.min(cap, (game.stageMapScrollOffset || 0) - stepDy));
      }
      // shop: ツリー（UPGRADE）スクロール / hex pan
      if (game.state === 'shop' && game.shopTab === 0) {
        shopHexPan(-stepDx, -stepDy);
      }
      // F: 融合タブリストスクロール
      if (game.state === 'shop' && game.shopTab === 2) {
        const rowH = 52;
        if (stepDy < -rowH * 0.5) { game.fusionCursor++; }
        else if (stepDy > rowH * 0.5) { game.fusionCursor = Math.max(0, game.fusionCursor - 1); }
      }
    } else {
      game.touchPos = { x: mx, y: my };
    }
    _touchLastCanvasX = mx;
    _touchLastCanvasY = my;
    game.titlePointerX = mx; game.titlePointerY = my;
    const btns = UI_BUTTONS[game.state] || [];
    game.hoveredBtn = btns.find(b => mx >= b.x && mx <= b.x + b.w && my >= b.y && my <= b.y + b.h) || null;
  },
  onTouchEnd(e) {
    const wasJoystickActive = game.joystick?.active;
    game.touchPos = null;
    game.hoveredBtn = null;
    if (game.joystick) game.joystick = { active: false, baseX: 0, baseY: 0, dx: 0, dy: 0 };
    // F: ドラッグ中・ジョイスティック使用中はタップ判定しない
    const moved = wasJoystickActive && (Math.abs(game.joystick?.dx || 0) > 8 || Math.abs(game.joystick?.dy || 0) > 8);
    if (!_touchIsDrag && !moved && Date.now() - _touchStartTime < 250) {
      canvas.dispatchEvent(new MouseEvent('click', {
        clientX: _lastTouchClientX, clientY: _lastTouchClientY,
        bubbles: true, cancelable: true
      }));
    } else if (_touchIsDrag && game.state === 'stage_select') {
      // スナップ（ノード単位で止まる）
      game._stageSelectMapSnapAt = Date.now() + 10;
    }
  },
});

// B: バックグラウンド遷移で自動ポーズ
document.addEventListener('visibilitychange', () => {
  if (document.hidden && game.state === 'playing') game.paused = true;
});

// ===== ボス攻撃パターン =====
function pickBossPattern() {
  if (!game.boss) return 'triple';
  const p = game.boss.phase, ab = game.boss.ability;
  if (p === 0) return Math.random() < 0.55 ? 'triple' : 'aimed';
  if (p === 1) {
    const sets = {
      burst: ['sweep', 'aimed', 'triple'], split: ['spread', 'aimed', 'triple'],
      teleport: ['aimed', 'circle', 'triple'], shield: ['wall', 'aimed', 'spread']
    };
    const pool = sets[ab] || ['spread', 'aimed'];
    return pool[Math.floor(Math.random() * pool.length)];
  }
  if (ab === 'dasher') return p === 0 ? 'aimed' : p === 1 ? ['aimed', 'sweep'][Math.floor(Math.random() * 2)] : 'circle';
  if (ab === 'barrage') return p === 0 ? 'spread' : p === 1 ? ['spread', 'circle'][Math.floor(Math.random() * 2)] : 'wall';
  // phase2: 全パターン
  const all = {
    burst: ['sweep', 'circle', 'aimed', 'spread'], split: ['spread', 'circle', 'aimed', 'wall'],
    teleport: ['aimed', 'circle', 'wall', 'sweep'], shield: ['wall', 'circle', 'aimed', 'spread']
  };
  const pool = (all[ab] || ['spread', 'circle', 'wall', 'aimed']);
  return pool[Math.floor(Math.random() * pool.length)];
}

function fireBossPattern(pattern) {
  if (!game.boss) return;
  const cx = game.boss.x + game.boss.w / 2, cy = game.boss.y + game.boss.h;
  const bspd = INVADER_BULLET_SPEED;
  const mk = (vx, vy, opts = {}) => ({ x: cx - 3, y: cy, w: 6, h: 14, vx, vy, ...opts });
  switch (pattern) {
    case 'triple':
      // 3方向・明確な隙間
      [-0.38, 0, 0.38].forEach(a => game.invaderBullets.push(mk(Math.sin(a) * bspd * 0.85, Math.cos(a) * bspd * 0.72)));
      break;
    case 'aimed': {
      // プレイヤー狙い1発（やや遅い・大きい弾）
      const tx = game.boss.aimTarget?.x ?? game.player.x + game.player.w / 2;
      const ty = game.boss.aimTarget?.y ?? game.player.y + game.player.h / 2;
      const dx = tx - cx, dy = ty - cy, len = Math.sqrt(dx * dx + dy * dy) || 1;
      game.invaderBullets.push({
        x: cx - 4, y: cy, w: 9, h: 18, aimed: true,
        vx: (dx / len) * bspd * 0.75, vy: (dy / len) * bspd * 0.75
      });
      break;
    }
    case 'spread':
      // 5方向扇形・隙間あり
      [-0.55, -0.26, 0, 0.26, 0.55].forEach(a => game.invaderBullets.push(mk(Math.sin(a) * bspd, Math.cos(a) * bspd * 0.68)));
      break;
    case 'circle':
      // 8方向全方位（隙間を縫える）
      for (let i = 0; i < 8; i++) {
        const a = Math.PI * 2 * i / 8 + Math.PI / 8;
        game.invaderBullets.push(mk(Math.cos(a) * bspd * 0.82, Math.sin(a) * bspd * 0.82));
      }
      break;
    case 'sweep':
      // 時間差掃射5発（左→右）
      [-0.55, -0.27, 0, 0.27, 0.55].forEach((a, i) => {
        setTimeout(() => {
          if (!game.boss) return;
          const bx = game.boss.x + game.boss.w / 2;
          game.invaderBullets.push({
            x: bx - 3, y: game.boss.y + game.boss.h, w: 6, h: 14,
            vx: Math.sin(a) * bspd * 0.9, vy: Math.cos(a) * bspd * 0.65
          });
        }, i * 110);
      });
      break;
    case 'wall': {
      // 横一列・2か所に穴
      const gaps = new Set();
      while (gaps.size < 2) gaps.add(Math.floor(Math.random() * 7));
      for (let i = 0; i < 7; i++) {
        if (gaps.has(i)) continue;
        game.invaderBullets.push({ x: 60 + i * 105 - 3, y: cy + 8, w: 7, h: 14, vx: 0, vy: bspd * 0.72 });
      }
      break;
    }
  }
  playSound('boss_hit');
}

function tryUltimate() {
  if (game.ultimateGauge < ULTIMATE_MAX || game.ultimateActive) return;
  game.ultimateGauge = 0; game.ultimateActive = true; game.ultimateTimer = ULTIMATE_DURATION;
  ensureNormalQuestProfile();
  game.questLifetime.totalUltimates++;
  game.sessionProgress.ultimateUses++; checkAndClaimMissions();
  unlockAchievement('ultimate');
  triggerFlash(255, 200, 50, 0.7); triggerShake(14, 25);
  playSound('boss_die');
  // 全敵にダメージ
  for (const inv of game.invaders) {
    if (!inv.alive) continue;
    spawnExplosion(inv.x + inv.w / 2, inv.y + inv.h / 2, '#ff0', 8);
    inv.alive = false; addCombo(inv.x + inv.w / 2, inv.y, 20); addExp(5);
  }
  for (const mb of game.miniBosses) {
    if (!mb.alive) continue;
    mb.hp -= 20;
    spawnExplosion(mb.x + mb.w / 2, mb.y + mb.h / 2, '#ff0', 10);
    if (mb.hp <= 0) killMiniBoss(mb);
  }
  if (game.boss && game.boss.entryDone) {
    const { val: dmg, isCrit: uc } = calcPlayerDmg(15 * game.playerUpgrades.damage);
    game.boss.hp -= dmg; spawnDmgNum(game.boss.x + game.boss.w / 2, game.boss.y, dmg, uc);
    spawnExplosion(game.boss.x + game.boss.w / 2, game.boss.y + game.boss.h / 2, '#ff0', 20);
    playSound('boss_hit');
    if (game.boss.hp <= 0) { killBoss(); return; }
  }
  game.invaderBullets = [];
}

function addUltimateGauge(amount) {
  if (game.ultimateGauge >= ULTIMATE_MAX) return;
  game.ultimateGauge = Math.min(ULTIMATE_MAX, game.ultimateGauge + amount);
  if (game.ultimateGauge >= ULTIMATE_MAX) playSound('charge_full');
}

function genMapRoutes() {
  const pool = game.stage <= 2 ? ['normal', 'survival'] : ['normal', 'survival', 'boss_rush', 'escort'];
  const a = pool[Math.floor(Math.random() * pool.length)];
  let b; do { b = pool[Math.floor(Math.random() * pool.length)]; } while (b === a);
  game.mapRoutes = [a, b];
}
function chooseRoute(idx) {
  if (idx >= game.mapRoutes.length) return;
  game.stageType = game.mapRoutes[idx];
  nextStage();
}
function calcRank() {
  const hitScore = game.stageStats.hits === 0 ? 40 : game.stageStats.hits <= 1 ? 25 : game.stageStats.hits <= 3 ? 10 : 0;
  const comboScore = game.stageStats.maxCombo >= 8 ? 30 : game.stageStats.maxCombo >= 5 ? 20 : game.stageStats.maxCombo >= 3 ? 10 : 0;
  const typeBonus = game.stageType === 'boss_rush' ? 20 : game.stageType === 'survival' || game.stageType === 'escort' ? 15 : 0;
  const total = hitScore + comboScore + typeBonus;
  return total >= 75 ? 'S' : total >= 50 ? 'A' : total >= 25 ? 'B' : 'C';
}

function saveLoadout() { localStorage.setItem('invader_loadout', JSON.stringify(game.playerLoadout)); }

function rarityRank(r) {
  switch (r) {
    case 'LR': return 5;
    case 'SSR': return 4;
    case 'SR': return 3;
    case 'R': return 2;
    case 'N': return 1;
    default: return 0;
  }
}
function equipEffectScore(eq) {
  if (!eq) return 0;
  const slot = eq.slot || 'atk';
  if (slot === 'atk') {
    // ATK倍率を最優先（僅差は CRIT/SPD/HP/DEF で補助）
    return ((eq.atk || 1) - 1) * 1000 + (eq.crit || 0) * 10 + (eq.spd || 0) * 6 + (eq.hp || 0) * 0.2 + (eq.def || 0) * 0.3;
  }
  if (slot === 'def') {
    // DEF% を最優先、次に HP
    return (eq.def || 0) * 100 + (eq.hp || 0) * 2 + (eq.crit || 0) * 5 + ((eq.atk || 1) - 1) * 30 + (eq.spd || 0) * 4;
  }
  // sp
  return (eq.crit || 0) * 30 + (eq.spd || 0) * 25 + ((eq.atk || 1) - 1) * 120 + (eq.def || 0) * 8 + (eq.hp || 0) * 0.5;
}

function getEquipMainEffectText(eq) {
  if (!eq || !eq.id) return '';
  const b = getItemLevelBonus(eq.id);
  const slot = eq.slot || 'atk';
  if (slot === 'atk') {
    const mult = applyLevelToAtkMult(eq.atk || 1, b);
    const pct = (mult - 1) * 100;
    return `ATK ${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`;
  }
  if (slot === 'def') {
    const val = Math.round(applyLevelToStatAdd(eq.def || 0, b));
    return `DEF +${val}%`;
  }
  const crit = Math.round(applyLevelToStatAdd(eq.crit || 0, b));
  const spd = Math.round(applyLevelToStatAdd(eq.spd || 0, b));
  const hp = Math.round(applyLevelToStatAdd(eq.hp || 0, b));
  if (crit) return `CRIT +${crit}%`;
  if (spd) return `SPD +${spd}`;
  if (hp) return `HP +${hp}`;
  return '特殊';
}

function equipPresetScore(eq, preset = 'all') {
  if (!eq) return 0;
  const atk = ((eq.atk || 1) - 1);
  const def = (eq.def || 0);
  const crit = (eq.crit || 0);
  const spd = (eq.spd || 0);
  const hp = (eq.hp || 0);
  if (preset === 'atk') return atk * 1200 + crit * 35 + spd * 10 + hp * 0.2 + def * 0.4;
  if (preset === 'def') return def * 140 + hp * 3.0 + crit * 8 + atk * 60 + spd * 6;
  if (preset === 'crit') return crit * 160 + atk * 260 + spd * 40 + def * 6 + hp * 0.5;
  return equipEffectScore(eq);
}

function equipMatchesQuickFilter(eq, preset = 'all') {
  if (!eq) return false;
  if (preset === 'all') return true;
  if (preset === 'atk') return (eq.slot === 'atk') || ((eq.atk || 1) > 1);
  if (preset === 'def') return (eq.slot === 'def') || ((eq.def || 0) > 0) || ((eq.hp || 0) > 0);
  if (preset === 'crit') return ((eq.crit || 0) > 0);
  return true;
}

function computeTotalStatsForLoadout(charId, equipIds) {
  const charDef = CHAR_POOL.find(c => c.id === 'char_basic') || { hp: 100, atk: 1, def: 0, crit: 5, spd: 0 };
  const char = (charId && CHAR_POOL.find(c => c.id === charId)) || charDef;
  const cBonus = (char && char.id && char.id !== 'char_basic') ? getItemLevelBonus(char.id) : 0;
  let hp = applyLevelToStatAdd(char.hp || 0, cBonus);
  let atk = applyLevelToAtkMult(char.atk || 1, cBonus);
  let def = applyLevelToStatAdd(char.def || 0, cBonus);
  let crit = applyLevelToStatAdd(char.crit || 0, cBonus);
  let spd = applyLevelToStatAdd(char.spd || 0, cBonus);
  const ids = Array.isArray(equipIds) ? equipIds : [null, null, null];
  for (const eid of ids) {
    if (!eid) continue;
    const eq = EQUIP_POOL.find(e => e.id === eid);
    if (!eq || !game.gachaInventory?.[eid]) continue;
    const eBonus = getItemLevelBonus(eid);
    hp += applyLevelToStatAdd(eq.hp || 0, eBonus);
    atk *= applyLevelToAtkMult(eq.atk || 1, eBonus);
    def += applyLevelToStatAdd(eq.def || 0, eBonus);
    crit += applyLevelToStatAdd(eq.crit || 0, eBonus);
    spd += applyLevelToStatAdd(eq.spd || 0, eBonus);
  }
  return {
    hp: Math.round(hp),
    atk,
    def: Math.min(Math.round(def), 50),
    crit: Math.min(Math.round(crit), 40),
    spd: Math.round(spd),
  };
}
function buildEquipPool() {
  const owned = EQUIP_POOL.filter(e => game.gachaInventory?.[e.id]);
  const fs = game.equipFilterSlot || 'all';
  const fr = game.equipFilterRarity || 'ALL';
  const onlyEq = !!game.equipFilterEquippedOnly;
  const onlyUnLv = !!game.equipFilterUnleveledOnly;
  const qf = (game.equipQuickFilter || 'all'); // all | atk | def | crit
  const sortPreset = (game.equipSortPreset || 0); // 0:強い 1:レア 2:Lv

  const equipIds = Array.isArray(game.playerLoadout?.equip) ? game.playerLoadout.equip : [];
  let pool = owned.filter(e => {
    if (!equipMatchesQuickFilter(e, qf)) return false;
    if (fs !== 'all' && e.slot !== fs) return false;
    if (fr !== 'ALL' && e.rarity !== fr) return false;
    if (onlyEq && !equipIds.includes(e.id)) return false;
    if (onlyUnLv) {
      const lv = (game.gachaInventory?.[e.id]?.level || 1);
      if (lv > 1) return false;
    }
    return true;
  });

  const mode = game.equipSortMode || 0;
  pool.sort((a, b) => {
    const alv = (game.gachaInventory?.[a.id]?.level || 1);
    const blv = (game.gachaInventory?.[b.id]?.level || 1);
    const ar = rarityRank(a.rarity), br = rarityRank(b.rarity);
    const ae = (qf !== 'all') ? equipPresetScore(a, qf) : equipEffectScore(a);
    const be = (qf !== 'all') ? equipPresetScore(b, qf) : equipEffectScore(b);
    const aPow = (qf !== 'all') ? equipPresetScore(a, qf) : equipEffectScore(a);
    const bPow = (qf !== 'all') ? equipPresetScore(b, qf) : equipEffectScore(b);

    // ソートプリセット（UI優先）
    if (sortPreset === 2) {
      if (blv !== alv) return blv - alv;
      if (br !== ar) return br - ar;
      if (bPow !== aPow) return bPow - aPow;
      return (a.label || '').localeCompare(b.label || '');
    }
    if (sortPreset === 1) {
      if (br !== ar) return br - ar;
      if (blv !== alv) return blv - alv;
      if (bPow !== aPow) return bPow - aPow;
      return (a.label || '').localeCompare(b.label || '');
    }
    if (sortPreset === 0) {
      if (bPow !== aPow) return bPow - aPow;
      if (br !== ar) return br - ar;
      if (blv !== alv) return blv - alv;
      return (a.label || '').localeCompare(b.label || '');
    }
    // fallback: 既存キー操作のmode
    if (qf !== 'all') {
      if (be !== ae) return be - ae;
      if (br !== ar) return br - ar;
      if (blv !== alv) return blv - alv;
      return (a.label || '').localeCompare(b.label || '');
    } else if (mode === 1) {
      if (be !== ae) return be - ae;
      if (br !== ar) return br - ar;
      if (blv !== alv) return blv - alv;
    } else if (mode === 2) {
      if (blv !== alv) return blv - alv;
      if (br !== ar) return br - ar;
      if (be !== ae) return be - ae;
    } else {
      if (br !== ar) return br - ar;
      if (blv !== alv) return blv - alv;
      if (be !== ae) return be - ae;
    }
    return (a.label || '').localeCompare(b.label || '');
  });
  return pool;
}
function buildLoadoutPool() {
  if (game.loadoutTab === 0) return CHAR_POOL; // 全キャラ表示（強化可能）
  if (game.loadoutTab === 1) return buildEquipPool();
  if (game.loadoutTab === 2) return PET_POOL.filter(p => game.gachaInventory[p.id]);
  return [{ id: null }, ...WEAPON_GACHA_POOL.filter(w => game.gachaInventory[w.id])];
}

function recommendEquips(preset = 'atk') {
  const owned = EQUIP_POOL.filter(e => game.gachaInventory?.[e.id]);
  const pickBest = (slot) => {
    const cand = owned.filter(e => e.slot === slot);
    if (cand.length === 0) return null;
    const score = (e) => {
      const atk = ((e.atk || 1) - 1);
      const def = (e.def || 0);
      const hp = (e.hp || 0);
      const crit = (e.crit || 0);
      const spd = (e.spd || 0);
      if (preset === 'def') {
        return def * 12 + hp * 0.7 + crit * 1.2 + atk * 60 + spd * 2;
      }
      if (preset === 'crit') {
        return crit * 10 + spd * 9 + atk * 80 + def * 2 + hp * 0.2;
      }
      // atk
      return atk * 140 + crit * 3 + spd * 4 + def * 1 + hp * 0.1;
    };
    return cand.slice().sort((a, b) => score(b) - score(a))[0];
  };
  const atk = pickBest('atk');
  const def = pickBest('def');
  const sp = pickBest('sp');
  game.playerLoadout.equip = [atk ? atk.id : null, def ? def.id : null, sp ? sp.id : null];
  saveLoadout();
}

function applyLoadoutSelection(selectedItem = null) {
  // 選択中アイテムを直接使う（フィルタ/ソートで pool が再生成されてもズレないように）
  if (game.loadoutTab === 0) {
    // char_basic は「ROOKIEに戻す（charId=null）」として扱う
    const it = selectedItem && selectedItem.id ? selectedItem : null;
    if (it && it.id === 'char_basic') {
      game.playerLoadout.charId = null; saveLoadout(); return;
    }
    if (it && game.gachaInventory?.[it.id]) {
      game.playerLoadout.charId = it.id; saveLoadout(); return;
    }
    // フォールバック: 現在の pool から（全キャラ）
    const pool = CHAR_POOL.filter(c => c && c.id); // char_basic含む
    if (pool.length === 0) { game.playerLoadout.charId = null; saveLoadout(); return; }
    const pick = pool[Math.min(game.loadoutCursor, pool.length - 1)];
    if (pick) { game.playerLoadout.charId = pick.id; saveLoadout(); }
  } else if (game.loadoutTab === 1) {
    const owned = buildEquipPool();
    if (owned.length === 0) return;
    const eq = (selectedItem && selectedItem.id) ? owned.find(x => x.id === selectedItem.id) : null;
    const pick = eq || owned[Math.min(game.loadoutCursor, owned.length - 1)];
    if (!pick) return;
    const slotMap = { atk: 0, def: 1, sp: 2 };
    const slotIdx = slotMap[pick.slot] ?? 0;
    if (Array.isArray(game.playerLoadout?.equip)) {
      game.playerLoadout.equip[slotIdx] = pick.id;
      saveLoadout();
    }
  } else if (game.loadoutTab === 2) {
    const owned = PET_POOL.filter(p => game.gachaInventory[p.id]);
    if (owned.length === 0) return;
    const maxPetSlots = game.stage >= 10 ? 3 : game.stage >= 5 ? 2 : 1;
    const pet = (selectedItem && selectedItem.id) ? owned.find(x => x.id === selectedItem.id) : null;
    const pick = pet || owned[Math.min(game.loadoutCursor, owned.length - 1)];
    if (!pick) return;
    const emptySlot = game.playerLoadout.pets.slice(0, maxPetSlots).findIndex(p => !p);
    const idx = emptySlot >= 0 ? emptySlot : 0;
    game.playerLoadout.pets[idx] = pick.id; saveLoadout();
  } else if (game.loadoutTab === 3) {
    const owned = [{ id: null, rarity: 'N', type: 'weapon', label: 'CLASSIC', desc: '通常弾・無限', color: '#aaa', weapon: 'normal', ammo: 0 }, ...WEAPON_GACHA_POOL.filter(w => game.gachaInventory[w.id])];
    const w = (selectedItem ? owned.find(x => x.id === selectedItem.id) : null) || owned[Math.min(game.loadoutCursor, owned.length - 1)];
    if (!w) return;
    game.playerLoadout.weaponId = w.id; saveLoadout();
  }
}

function computeBaseStats() {
  const charDef = CHAR_POOL.find(c => c.id === 'char_basic');
  const char = CHAR_POOL.find(c => c.id === game.playerLoadout.charId && game.gachaInventory[c.id]) || charDef;
  const cBonus = char && char.id ? getItemLevelBonus(char.id) : 0;
  let hp = applyLevelToStatAdd(char.hp, cBonus);
  let atk = applyLevelToAtkMult(char.atk, cBonus);
  let def = applyLevelToStatAdd(char.def, cBonus);
  let crit = applyLevelToStatAdd(char.crit, cBonus);
  let spd = applyLevelToStatAdd(char.spd, cBonus);
  for (const eid of game.playerLoadout.equip) {
    if (!eid) continue;
    const eq = EQUIP_POOL.find(e => e.id === eid);
    if (!eq || !game.gachaInventory[eid]) continue;
    const eBonus = getItemLevelBonus(eid);
    hp += applyLevelToStatAdd(eq.hp || 0, eBonus);
    atk *= applyLevelToAtkMult(eq.atk || 1, eBonus);
    def += applyLevelToStatAdd(eq.def || 0, eBonus);
    crit += applyLevelToStatAdd(eq.crit || 0, eBonus);
    spd += applyLevelToStatAdd(eq.spd || 0, eBonus);
  }
  game.playerStats = { hp: Math.round(hp), maxHp: Math.round(hp), atk, def: Math.min(Math.round(def), 50), crit: Math.min(Math.round(crit), 40), spd: Math.round(spd) };
}

function getPetEffect(eff) {
  return game.playerLoadout.pets.some(pid => {
    const p = PET_POOL.find(p => p.id === pid);
    return p && p.effect === eff && game.gachaInventory[pid];
  });
}

function getPetParams(effect, level) {
  const lv = Math.max(1, level || 1);
  const bonus = (lv - 1) * 0.01; // 1Lvごとに+1%
  const FPS = 60;
  const base = {
    dragon: { intervalFrames: 180 },
    hawk: { intervalFrames: 180 },
    bomber: { intervalFrames: 480 },
    ghost: { intervalFrames: 600, durationFrames: 70 },
    fenrir: { intervalFrames: 180 },
  }[effect] || { intervalFrames: 180 };

  const intervalFrames = Math.max(FPS, Math.round(base.intervalFrames / (1 + bonus))); // 最低1秒
  const durationFrames = base.durationFrames ? Math.max(1, Math.round(base.durationFrames * (1 + bonus))) : 0;
  return { intervalFrames, durationFrames, bonus };
}
function calcPlayerDmg(base) {
  const isCrit = Math.random() * 100 < game.playerStats.crit;
  const berserk = (game.gachaInventory['passive_berserker']?.level >= 1 && game.playerStats.hp <= game.playerStats.maxHp * 0.5) ? 1.5 : 1;
  const val = Math.round(base * game.playerStats.atk * (isCrit ? 2 : 1) * berserk);
  return { val, isCrit };
}

// ===== ゲームフロー =====
function startGame() {
  // 燃料消費（開始ボタンを押した瞬間）
  // 失敗/クリアに関係なく消費。足りない場合は開始をブロックし、💎での補給を許可。
  if (!tryConsumeFuelForRun()) return;
  ensureDailyMissions();
  ensureNormalQuestProfile();
  game.score = 0; game.lives = 1; game.stage = game.startStage;
  game.powerupActive = null; game.powerupTimer = 0;
  game.playerShield = false; game.nextLifeScore = 5000; game.lifeGainDisplay = null;
  game.passiveRegenTimer = 0;
  game.weaponIdx = 0; game.weaponAmmo = { laser: 0, homing: 0, explosive: 0 };
  game.playerUpgrades = { speed: 0, firerate: 0, damage: 1, spread: false, invincibleBonus: 0, bulletSpd: 0 };
  // ベースステータス計算（キャラ+装備）
  computeBaseStats();
  // ガチャパッシブ適用
  if (game.gachaInventory['passive_shield']?.level >= 1) game.playerShield = true;
  if (game.gachaInventory['passive_ammo']?.level >= 1) game.weaponAmmo.laser += 5;
  // ガチャ武器適用
  if (game.playerLoadout.weaponId && game.gachaInventory[game.playerLoadout.weaponId]) {
    const wp = WEAPON_GACHA_POOL.find(w => w.id === game.playerLoadout.weaponId);
    if (wp) {
      const b = getItemLevelBonus(wp.id);
      const add = Math.max(0, Math.round((wp.ammo || 0) * (1 + b)));
      game.weaponAmmo[wp.weapon] = (game.weaponAmmo[wp.weapon] || 0) + add;
      game.weaponIdx = WEAPONS.indexOf(wp.weapon);
    }
  } else {
    // カスタマイズ武器適用
    const sw = SHIP_WEAPONS[game.shipWeaponIdx];
    if (sw.weapon) { game.weaponAmmo[sw.weapon] = sw.ammo; game.weaponIdx = WEAPONS.indexOf(sw.weapon); }
  }
  // ペット適用
  if (getPetEffect('fairy')) { /* coin boost handled in addCoins */ }
  game.petTimers = { dragon: 0, hawk: 0, bomber: 0, ghost: 0, fenrir: 0 }; game.petBullets = [];
  switch (SHIP_TRAITS[game.shipTraitIdx].id) {
    case 'speedy': game.playerUpgrades.speed = 2; game.playerUpgrades.firerate = 1; break;
    case 'tank': game.playerStats.maxHp += 40; game.playerStats.hp += 40; game.playerUpgrades.invincibleBonus = 60; break;
    case 'gunner': game.playerUpgrades.damage = 2; game.playerUpgrades.bulletSpd = 3; game.playerUpgrades.firerate = 1; break;
  }
  // ショップ強化を適用
  game.playerUpgrades.speed += game.shopUpgrades.speed || 0;
  game.playerUpgrades.firerate += game.shopUpgrades.firerate || 0;
  game.playerUpgrades.bulletSpd += (game.shopUpgrades.bulletspd || 0) * 3;
  game.playerStats.maxHp += (game.shopUpgrades.maxhp || 0) * 20;
  game.playerStats.hp += (game.shopUpgrades.maxhp || 0) * 20;
  game.playerStats.crit += Math.min(50 - game.playerStats.crit, (game.shopUpgrades.critrate || 0) * 5);
  if (game.shopUpgrades.dashcd) game.playerUpgrades.invincibleBonus += (game.shopUpgrades.dashcd) * 10;
  game.seenUpgradeIds = new Set();
  game.exp = 0; game.playerLevel = 1; game.levelUpDisplay = null;
  game.chargeTimer = 0; game.chargeReady = false; game.dashTimer = 0; game.dashCooldown = 0; game.dashTrail = [];
  game.stageType = game.bossRushModeActive ? 'boss_rush' : game.endlessModeActive ? 'endless' : 'normal'; game.stageRank = null; game.mapRoutes = [];
  game.continueNoStarsThisRun = false;
  game.stageStats = { hits: 0, maxCombo: 0, kills: 0 };
  game.bossRushCount = 0; game.bossRushDelay = 0; game.escortShip = null; game.survivalTimer = 0;
  game.ultimateGauge = 0; game.ultimateActive = false; game.ultimateTimer = 0;
  game.bossCutinTimer = 0; game.gravityZones = []; game.emFields = []; game.blackHoles = []; game.meteorRainTimer = 0; game.meteorRainWarning = 0;
  initStars(); updateHUD(); initStage();
  showMessage(null); game.state = 'playing';
}
function nextStage() {
  ensureNormalQuestProfile();
  game.questLifetime.totalStageClears++;
  game.sessionProgress.stageClears++;
  if (game.stageStats.hits === 0) {
    game.sessionProgress.noDmgStages++;
    game.questLifetime.totalNoDmgClears++;
  }
  game.stage++;
  if (game.stage > game.highestStage) { game.highestStage = game.stage; localStorage.setItem('invader_highest_stage', game.highestStage); }
  checkAndClaimMissions();
  ensureActiveMissions();
  if (game.stage >= 5) unlockAchievement('stage5');
  if (game.stage >= 10) unlockAchievement('stage10');
  updateHUD(); initStage(); game.state = 'playing';
}

function initStage() {
  game.frameCount = 0;
  game.bullets = []; game.invaderBullets = [];
  game.invaders = []; game.particles = []; game.powerups = []; game.ufo = null; game.boss = null; game.miniBosses = [];
  game.healers = []; game.meteors = [];
  game.combo = 0; game.comboTimer = 0; game.comboDisplay = null;
  game.bossPhase = false;
  game.invaderSpawnTimer = 0; game.lastShot = 0;
  game.invaderSpawnInterval = Math.max(40, 130 - (game.stage - 1) * 8);
  game.maxInvaders = Math.min(15, 4 + game.stage * 2);
  game.muzzleFlashes = []; game.bossWarningTimer = 0; game.stageBannerTimer = 120;
  game.currentEvent = null; game.eventTimer = 0; game.eventCooldown = 300;
  game.formationTimer = 500; game.healerSpawnTimer = 0;
  game.chargeTimer = 0; game.chargeReady = false; game.dashTrail = [];
  game.petTimers = { dragon: 0, hawk: 0, bomber: 0, ghost: 0, fenrir: 0 }; game.petBullets = [];
  triggerFlash(0, 100, 255, 0.3);
  const _dims = getShipDims();
  game.player = { x: W / 2 - _dims.w / 2, y: H - 100, w: _dims.w, h: _dims.h, invincibleTimer: 0, _valkyrieUsed: false };
  game.barriers = [];
  stageEl.textContent = game.stage;
  game.stageStats = { hits: 0, maxCombo: 0, kills: 0 };
  game.bossRushCount = 0; game.bossRushDelay = 0; game.escortShip = null;
  game.survivalTimer = SURVIVAL_DURATION; game.minionSpawnTimer = 0;
  game.bossCutinTimer = 0; game.gravityZones = []; game.emFields = []; game.blackHoles = []; game.meteorRainTimer = 0; game.meteorRainWarning = 0;
  game.waveNum = 0; game.waveState = 'idle'; game.waveKills = 0; game.waveTargetKills = 0; game.waveDelay = 0; game.waveBannerTimer = 0;
  if (game.stageType === 'normal' || game.stageType === 'escort' || game.stageType === 'endless') initEnvGimmicks();

  // 小惑星ステージ判定
  game.isAsteroidStage = game.stage >= 2 && game.stage % 2 === 0 && (game.stageType === 'normal' || game.stageType === 'endless');
  game.asteroids = [];
  if (game.isAsteroidStage) initAsteroids();

  // ボス連戦: 即ボスフェーズ
  if (game.stageType === 'boss_rush') {
    game.bossPhase = true; spawnBoss(); return;
  }
  // 護衛: 輸送船を配置
  if (game.stageType === 'escort') initEscortShip();

  // ウェーブ1開始
  startWave(1);
}

function startWave(n) {
  game.waveNum = n; game.waveState = 'active';
  game.waveTargetKills = getWaveSize(n);
  game.waveKills = 0; game.waveBannerTimer = 90;
  game.invaders = []; game.invaderBullets = [];
  game.sessionProgress.maxWave = Math.max(game.sessionProgress.maxWave, n);
  game.questLifetime.maxWaveEver = Math.max(game.questLifetime.maxWaveEver || 0, n);
  persistDailyMissionState();
  // ウェーブサイズ分スポーン
  const count = game.waveTargetKills;
  for (let i = 0; i < count; i++) spawnInvader();
  playSound('event_start');
}

function initEscortShip() {
  game.escortShip = { x: W / 2 - 35, y: H - 170, w: 70, h: 28, hp: 5, maxHp: 5, vx: 0.7, alive: true };
}

function respawn() {
  game.bullets = []; game.invaderBullets = []; game.particles = [];
  const _d = getShipDims(); game.player.w = _d.w; game.player.h = _d.h;
  game.player.x = W / 2 - game.player.w / 2; game.player.y = H - 100;
  game.player.invincibleTimer = 180 + game.playerUpgrades.invincibleBonus;
  showMessage(null); game.state = 'playing';
}

// ===== 小惑星 =====
function initAsteroids() {
  const count = 2 + Math.floor(game.stage / 2);
  for (let i = 0; i < count; i++) {
    const sz = 30 + Math.random() * 40;
    game.asteroids.push({
      x: Math.random() * (W - sz), y: 30 + Math.random() * (H * 0.55 - sz),
      w: sz, h: sz, vx: (Math.random() - 0.5) * 1.2, vy: (Math.random() - 0.5) * 0.8,
      hp: 3, maxHp: 3, angle: Math.random() * Math.PI * 2, rotSpeed: (Math.random() - 0.5) * 0.02,
      alive: true,
    });
  }
}

// ===== スポーン =====
function spawnBoss() {
  const _d = game.bossDifficulty ?? 1;
  const _hpMul = [0.65, 1.0, 1.6][_d], _spdMul = [0.8, 1.0, 1.25][_d], _fireMul = [1.4, 1.0, 0.75][_d];
  const hp = Math.round((12 + game.stage * 6) * _hpMul);
  const ability = game.selectedBossAbility || (game.stage <= 2 ? 'burst' : game.stage <= 4 ? 'split' : game.stage <= 6 ? 'teleport' : game.stage <= 8 ? 'shield' : game.stage <= 10 ? 'dasher' : 'barrage');
  game.boss = {
    x: W / 2 - 60, y: -80, w: 120, h: 60, hp, maxHp: hp, dir: 1,
    speed: (ability === 'dasher' ? 2.8 + game.stage * 0.2 : ability === 'barrage' ? 0.8 + game.stage * 0.15 : 1.5 + game.stage * 0.3) * _spdMul,
    shootTimer: 0,
    shootInterval: Math.round((ability === 'barrage' ? Math.max(35, 110 - game.stage * 5) : Math.max(25, 90 - game.stage * 5)) * _fireMul),
    frame: 0, frameTimer: 0, phase: 0, entryDone: false,
    ability,
    teleportTimer: 150,
    shieldHp: 0, shieldMax: 0, shielded: false,
    splitDone: false,
    attackCharge: 0, nextPattern: null, aimTarget: null,
    dying: false, dyingTimer: 0,
    // DASHER用
    dashTimer: Math.max(60, 120 - game.stage * 5), _dashing: false, _dashVx: 0, _dashDuration: 0,
    // BARRAGE用
    barrageCharge: 0,
  };
  if (ability === 'shield') {
    game.boss.shieldMax = 10 + game.stage * 2;
    game.boss.shieldHp = game.boss.shieldMax;
    game.boss.shielded = true;
  }
  game.bossWarningTimer = 150; game.healerSpawnTimer = 0;
}

function spawnMiniBoss(x, y, hp) {
  game.miniBosses.push({
    x, y, w: 70, h: 36, hp, maxHp: hp, dir: Math.random() < 0.5 ? 1 : -1,
    speed: 2 + game.stage * 0.3, shootTimer: Math.floor(Math.random() * 40),
    shootInterval: Math.max(25, 50 - game.stage * 3),
    frame: 0, frameTimer: 0, alive: true,
  });
}

function pickInvaderType() {
  const r = Math.random();
  const p = getPlanet(game.stage).name;
  if (p === 'MARS') {
    if (r < 0.10) return 'tank';
    if (r < 0.14) return game.stage >= 3 ? 'spider' : 'fast';
    if (r < 0.18) return game.stage >= 3 ? 'ufo_drone' : 'normal';
    if (r < 0.52) return 'fast';
    if (r < 0.78) return 'normal';
    return game.stage >= 6 ? 'bomber' : 'normal';
  }
  if (p === 'VENUS') {
    if (r < 0.08) return 'crystal';
    if (r < 0.16) return 'ufo_drone';
    if (r < 0.46) return 'normal';
    if (r < 0.68) return 'sniper';
    if (r < 0.84) return 'fast';
    return 'bomber';
  }
  if (p === 'JUPITER') {
    if (r < 0.08) return game.stage >= 22 ? 'heavy' : 'tank';
    if (r < 0.14) return 'spider';
    if (r < 0.20) return 'ufo_drone';
    if (r < 0.42) return 'tank';
    if (r < 0.65) return 'bomber';
    if (r < 0.82) return 'normal';
    return 'sniper';
  }
  // SATURN
  if (r < 0.12) return 'heavy';
  if (r < 0.22) return 'crystal';
  if (r < 0.30) return 'ufo_drone';
  if (r < 0.55) return 'sniper';
  if (r < 0.70) return 'fast';
  if (r < 0.84) return 'tank';
  return 'normal';
}
function getPlanetBehavior(invType) {
  const p = getPlanet(game.stage).name;
  if (p === 'MARS') return invType === 'fast' ? 'rush' : 'charge';  // 積極的に突撃
  if (p === 'VENUS') return invType === 'normal' ? 'swarm' : 'snipe'; // 群れで動く
  if (p === 'JUPITER') return invType === 'tank' ? 'heavy' : 'bombard'; // 重く動く
  return invType === 'sniper' ? 'orbital' : 'drift'; // 上空旋回
}
function spawnInvader() {
  const invType = pickInvaderType();
  const isPatrol = Math.random() < 0.55;
  let baseSpeed = 0.7 + game.stage * 0.25 + Math.random() * 0.4;
  let row = Math.floor(Math.random() * 3), hp = 1;
  if (invType === 'fast') { baseSpeed *= 1.9; row = 0; }
  if (invType === 'tank') { baseSpeed *= 0.45; row = 2; hp = 3; }
  if (invType === 'sniper') { baseSpeed *= 0.7; row = 1; }
  if (invType === 'bomber') { baseSpeed *= 0.8; row = 0; }
  if (invType === 'ufo_drone') { baseSpeed *= 1.1; row = 0; hp = 2; }
  if (invType === 'spider') { baseSpeed *= 0.95; row = 1; hp = 2; }
  if (invType === 'crystal') { baseSpeed *= 0.35; row = 1; hp = 4; }
  if (invType === 'heavy') { baseSpeed *= 0.18; row = 2; hp = 8; }
  const speed = baseSpeed;
  let x, y, vx, vy;
  if (isPatrol) {
    x = Math.random() < 0.5 ? -INVADER_W - 10 : W + 10;
    y = 30 + Math.random() * (H * 0.28);
    vx = x < 0 ? speed * (0.8 + Math.random() * 0.4) : -speed * (0.8 + Math.random() * 0.4);
    vy = (Math.random() - 0.5) * speed * 0.4;
  } else {
    const side = Math.floor(Math.random() * 3);
    if (side === 0) { x = Math.random() * (W - INVADER_W); y = -INVADER_H - 10; vx = (Math.random() - 0.5) * speed * 1.2; vy = speed * (0.9 + Math.random() * 0.4); }
    else if (side === 1) { x = -INVADER_W - 10; y = Math.random() * (H * 0.55); vx = speed * (0.8 + Math.random() * 0.5); vy = speed * (0.2 + Math.random() * 0.4); }
    else { x = W + 10; y = Math.random() * (H * 0.55); vx = -speed * (0.8 + Math.random() * 0.5); vy = speed * (0.2 + Math.random() * 0.4); }
  }
  const behavior = invType === 'ufo_drone' ? 'sine_wave' : invType === 'spider' ? 'zigzag' : invType === 'crystal' ? 'crystal_drift' : invType === 'heavy' ? 'advance' : getPlanetBehavior(invType);
  const iw = invType === 'heavy' ? 50 : invType === 'ufo_drone' ? 42 : INVADER_W;
  const ih = invType === 'heavy' ? 40 : invType === 'ufo_drone' ? 18 : INVADER_H;
  game.invaders.push({
    x, y, vx, vy, w: iw, h: ih,
    row, hp, maxHp: hp, invType, behavior, alive: true, frame: 0, frameTimer: 0,
    shootTimer: Math.floor(Math.random() * 120),
    shootInterval: invType === 'heavy' ? Math.max(80, 200 - game.stage * 10) : invType === 'crystal' ? Math.max(70, 180 - game.stage * 8) : Math.max(60, 240 - game.stage * 15),
    isPatrol, behaviorTimer: 0, sineOffset: Math.random() * Math.PI * 2
  });
}

function spawnFormation() {
  const speed = 1.5 + game.stage * 0.25;
  const cx = W / 2 - INVADER_W / 2;
  const positions = [[cx, 0], [cx - 60, 30], [cx + 60, 30], [cx - 120, 60], [cx + 120, 60]];
  const vx = (Math.random() - 0.5) * speed * 0.5, vy = speed * 1.1;
  positions.forEach(([px, py]) => {
    game.invaders.push({
      x: px, y: -INVADER_H - py - 20, vx, vy, w: INVADER_W, h: INVADER_H,
      row: 0, alive: true, frame: 0, frameTimer: 0,
      shootTimer: 60 + Math.floor(Math.random() * 60),
      shootInterval: Math.max(80, 160 - game.stage * 10),
      isPatrol: false, formation: true
    });
  });
}

function spawnHealer() {
  const side = Math.random() < 0.5 ? -1 : 1;
  game.healers.push({
    x: side < 0 ? -30 : W + 30, y: 80 + Math.random() * 100, w: 24, h: 24,
    vx: side < 0 ? 1.2 : -1.2, vy: 0.3 + Math.random() * 0.3, alive: true
  });
}

function spawnDmgNum(x, y, val, isCrit = false, isHeal = false) {
  game.damageNumbers.push({ x, y: y - 10, val, isCrit, isHeal, timer: 55, vy: -1.8 });
}
function spawnExplosion(x, y, color, count = 12) {
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
    const spd = 2 + Math.random() * 3;
    game.particles.push({
      x, y, vx: Math.cos(angle) * spd, vy: Math.sin(angle) * spd,
      life: 1.0, decay: 0.03 + Math.random() * 0.02, size: 3 + Math.random() * 4, color
    });
  }
}

function trySpawnUFO() {
  if (!game.ufo && !game.bossPhase && Math.random() < 0.003)
    game.ufo = {
      x: -60, y: 30, w: 56, h: 24, speed: 2 + Math.random(),
      points: [50, 100, 150, 200, 300][Math.floor(Math.random() * 5)]
    };
}

function spawnPowerup(x, y) {
  const r = Math.random();
  if (r < 0.04) game.powerups.push({ x: x - 12, y, w: 24, h: 16, vy: 1.5, type: 'heal' });
  else if (r < 0.07) game.powerups.push({ x: x - 12, y, w: 24, h: 16, vy: 1.5, type: 'shield' });
  else if (r < 0.19) {
    const types = ['double', 'invincible', 'wide'];
    game.powerups.push({ x: x - 12, y, w: 24, h: 16, vy: 1.5, type: types[Math.floor(Math.random() * 3)] });
  }
}

// ===== コンボ =====
function addCombo(x, y, baseScore) {
  ensureNormalQuestProfile();
  game.questLifetime.totalKills++;
  game.combo++; game.comboTimer = 90; game.stageStats.kills++;
  game.stageStats.maxCombo = Math.max(game.stageStats.maxCombo, game.combo);
  game.sessionProgress.maxCombo = Math.max(game.sessionProgress.maxCombo, game.combo);
  game.questLifetime.maxComboEver = Math.max(game.questLifetime.maxComboEver, game.combo);
  checkAndClaimMissions();
  if (game.combo >= 10) unlockAchievement('combo10');
  addUltimateGauge(6);
  const mult = Math.min(game.combo, 8);
  const bonus = baseScore * mult;
  game.score += bonus;
  game.comboDisplay = { x, y, text: game.combo > 1 ? `x${mult} COMBO! +${bonus}` : `+${bonus}`, timer: 60 };
  if (game.combo >= 5) triggerFlash(255, 255, 0, 0.08 + game.combo * 0.02);
  if (game.score >= game.nextLifeScore) {
    game.nextLifeScore += 5000; game.playerStats.hp = Math.min(game.playerStats.maxHp, game.playerStats.hp + 20); updateHUD();
    game.lifeGainDisplay = { text: 'SCORE BONUS  HP +20', timer: 120, color: '#ff0' };
    triggerFlash(255, 200, 0, 0.2); playSound('stage_clear');
  }
  updateHUD();
}

// ===== ダッシュ =====
function tryDash() {
  if (game.dashCooldown > 0 || game.dashTimer > 0) return;
  let dx = 0, dy = 0;
  if (keys['ArrowLeft'] || keys['KeyA']) dx = -1;
  if (keys['ArrowRight'] || keys['KeyD']) dx = 1;
  if (keys['ArrowUp'] || keys['KeyW']) dy = -1;
  if (keys['ArrowDown'] || keys['KeyS']) dy = 1;
  if (dx === 0 && dy === 0) dy = -1; // no direction → dash forward (up)
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  game.player._dashVx = dx / len * DASH_SPEED; game.player._dashVy = dy / len * DASH_SPEED;
  const _shapeMod = SHIP_SHAPES[game.shipShapeIdx].id === 'agile' ? 0.55 : SHIP_SHAPES[game.shipShapeIdx].id === 'heavy' ? 1.4 : 1;
  game.dashTimer = DASH_DURATION; game.dashCooldown = Math.floor(DASH_COOLDOWN * _shapeMod);
  game.player.invincibleTimer = Math.max(game.player.invincibleTimer, DASH_DURATION + 4);
  playSound('dash');
  triggerFlash(100, 200, 255, 0.1);
}

// ===== チャージ発射 =====
function fireChargedShot() {
  const cx = game.player.x + game.player.w / 2;
  const isHeavy = SHIP_SHAPES[game.shipShapeIdx].id === 'heavy';
  const cw = isHeavy ? 46 : 30, pierces = isHeavy ? 8 : 5;
  game.bullets.push({
    x: cx - cw / 2, y: game.player.y - 10, w: cw, h: cw, charged: true,
    bspd: BULLET_SPEED + game.playerUpgrades.bulletSpd, piercesLeft: pierces
  });
  game.muzzleFlashes.push({ x: cx, y: game.player.y - 10, timer: 12, maxTimer: 12 });
  playSound('shoot_charge');
  triggerFlash(255, 200, 0, 0.15);
}

// ===== 武器発射 =====
function fireBullet() {
  const w = currentWeapon();
  const bspd = BULLET_SPEED + game.playerUpgrades.bulletSpd;
  const cx = game.player.x + game.player.w / 2;
  if (w === 'laser') {
    game.weaponAmmo.laser--;
    if (game.weaponAmmo.laser <= 0 && currentWeapon() === 'laser') cycleWeapon();
    game.bullets.push({ x: cx - 3, y: game.player.y, w: 6, h: 14, laser: true, bspd });
    playSound('shoot_laser');
    for (const inv of game.invaders) {
      if (!inv.alive) continue;
      if (cx >= inv.x && cx <= inv.x + inv.w) {
        inv.alive = false; addCombo(inv.x + inv.w / 2, inv.y, (3 - inv.row) * 10);
        spawnExplosion(inv.x + inv.w / 2, inv.y + inv.h / 2, ['#f55', '#ff0', '#0ff'][inv.row <= 0 ? 0 : inv.row <= 1 ? 1 : 2]);
        spawnPowerup(inv.x + inv.w / 2, inv.y + inv.h); addExp(12); playSound('explosion');
      }
    }
    if (game.boss && game.boss.entryDone && !game.boss.shielded && cx >= game.boss.x && cx <= game.boss.x + game.boss.w) {
      const { val: bd, isCrit: bc } = calcPlayerDmg(game.playerUpgrades.damage); game.boss.hp -= bd; spawnDmgNum(cx, game.boss.y, bd, bc); spawnExplosion(cx, game.boss.y + game.boss.h / 2, '#f80', 4); playSound('boss_hit');
      if (game.boss.hp <= 0) { killBoss(); }
    }
    return;
  }
  if (w === 'homing') {
    game.weaponAmmo.homing--;
    if (game.weaponAmmo.homing <= 0 && currentWeapon() === 'homing') cycleWeapon();
    let target = null, minDist = Infinity;
    const cands = [...invaders.filter(i => i.alive), ...(game.boss ? [game.boss] : []), ...miniBosses.filter(m => m.alive), ...healers.filter(h => h.alive)];
    for (const t of cands) {
      const dx = (t.x + t.w / 2) - cx, dy = (t.y + t.h / 2) - game.player.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < minDist) { minDist = dist; target = t; }
    }
    game.bullets.push({ x: cx - 3, y: game.player.y - 10, w: 6, h: 14, homing: true, target, bspd, vx: 0, vy: -bspd });
    playSound('shoot_homing'); return;
  }
  if (w === 'explosive') {
    game.weaponAmmo.explosive--;
    if (game.weaponAmmo.explosive <= 0 && currentWeapon() === 'explosive') cycleWeapon();
    game.bullets.push({ x: cx - 4, y: game.player.y, w: 8, h: 8, explosive: true, bspd });
    playSound('shoot_expl'); return;
  }
  if (game.playerUpgrades.spread) {
    [[-0.25, 0], [0, -0.1], [0.25, 0]].forEach(([ax, ay]) => {
      game.bullets.push({ x: cx - 2, y: game.player.y, w: 4, h: 14, vx: ax * bspd, vy: -(bspd + ay * bspd), bspd });
    });
  } else {
    game.bullets.push({ x: cx - 2, y: game.player.y, w: 4, h: 14, bspd });
  }
  playSound('shoot');
}

// ===== ボス撃破 =====
function killBoss() {
  const _bossAbility = game.boss?.ability;
  spawnExplosion(game.boss.x + game.boss.w / 2, game.boss.y + game.boss.h / 2, '#ff0', 30);
  triggerShake(10, 20); triggerFlash(255, 150, 0, 0.7);
  game.score += 500 + game.stage * 100; updateHUD(); addExp(150);
  addCoins(80 + game.stage * 8 + Math.floor(Math.random() * 40));
  addGems(3 + Math.floor(game.stage / 5));
  // ボス撃破 素材ドロップ
  const bp = getPlanet(game.stage).name;
  if (bp === 'SATURN') addMaterial('crystal', 2);
  else if (bp === 'JUPITER') addMaterial('crystal', 1);
  else addMaterial('core', 2);
  addMaterial('scrap', 3);
  // 難易度 HARD ボーナス
  if (game.bossDifficulty === 2) { addMaterial('scrap', 2); addMaterial('core', 1); addCoins(60); addGems(1); }
  // 週替わり FEATURED ボーナス
  const _featIdx = Math.floor(Date.now() / (7 * 24 * 3600 * 1000)) % BOSS_SELECT_DATA.length;
  if (_bossAbility && _bossAbility === BOSS_SELECT_DATA[_featIdx]?.id) { addMaterial('scrap', 2); addCoins(60); addGems(2); }
  playSound('boss_die');
  game.bossKillTotal++; localStorage.setItem('invader_boss_kills', game.bossKillTotal);
  if (game.bossKillTotal >= 5) unlockAchievement('boss5');
  // ボス種別ごとの討伐数・最高スコアを保存（難易度別キー）
  if (game.boss?.ability) {
    const ab = game.boss.ability;
    const _dk = `${ab}_${game.bossDifficulty ?? 1}`;
    game.bossKillsByType[_dk] = (game.bossKillsByType[_dk] || 0) + 1;
    try { localStorage.setItem('invader_boss_kills_type', JSON.stringify(game.bossKillsByType)); } catch (e) { }
    if (game.score > (game.bossBestScoreByType[_dk] || 0)) {
      game.bossBestScoreByType[_dk] = game.score;
      try { localStorage.setItem('invader_boss_best_score', JSON.stringify(game.bossBestScoreByType)); } catch (e) { }
    }
  }
  ensureNormalQuestProfile();
  game.questLifetime.totalBossKills++;
  game.sessionProgress.bossKills++; checkAndClaimMissions();
  if (game.stageStats.hits === 0) unlockAchievement('nodamage');
  game.boss = null; game.miniBosses = [];
  // ボス連戦: まだ次のボスがいる
  if (game.stageType === 'boss_rush' && game.bossRushCount < game.bossRushMax - 1) {
    game.bossRushCount++;
    game.bossRushDelay = 90;
    return;
  }
  game.stageRank = calcRank();
  // ボス種別ベストランク保存（難易度別キー）
  if (_bossAbility) {
    const _dk2 = `${_bossAbility}_${game.bossDifficulty ?? 1}`;
    const _rv = { S: 4, A: 3, B: 2, C: 1 };
    if ((_rv[game.stageRank] || 0) > (_rv[game.bossBestRankByType?.[_dk2]] || 0)) {
      game.bossBestRankByType[_dk2] = game.stageRank;
      try { localStorage.setItem('invader_boss_best_rank', JSON.stringify(game.bossBestRankByType)); } catch (e) { }
    }
  }
  const rankBonus = { S: 50, A: 35, B: 20, C: 10 }[game.stageRank] || 10;
  const rankGems = { S: 5, A: 3, B: 1, C: 0 }[game.stageRank] || 0;
  addCoins(rankBonus); if (rankGems > 0) addGems(rankGems);
  if (game.stageType === 'endless') {
    addCoins(rankBonus); if (rankGems > 0) addGems(rankGems); // double reward
    addExp(60);
    game.boss = null; game.bossPhase = false; game.bossMinions = [];
    game.stage++;
    game.waveNum = 0; game.waveState = 'wait'; game.waveDelay = 150;
    game.invaders = []; game.invaderBullets = [];
    game.stageStats = { hits: 0, maxCombo: 0, kills: 0 };
    triggerFlash(0, 200, 255, 0.4);
    startBGM(); return;
  }
  stopBGM();
  if (game.bossRushModeActive) { game.stageType = 'boss_rush'; nextStage(); return; }
  const _skipStars = !!game.continueNoStarsThisRun;
  const _starsEarned = _skipStars ? 0 : computeStageStarMedal(game.stageStats.hits, game.stageStats.maxCombo);
  commitStageStarMedalForCurrentClear();
  game.stageResultData = { stage: game.stage, rank: game.stageRank, kills: game.stageStats.kills, hits: game.stageStats.hits, maxCombo: game.stageStats.maxCombo, rankBonus, rankGems, score: game.score, starsEarned: _starsEarned, starsSkippedMedal: _skipStars };
  game.stageResultTimer = 0;
  game.bullets = []; game.invaderBullets = []; game.stageClearAnimTimer = 80;
}

function killMiniBoss(mb) {
  spawnExplosion(mb.x + mb.w / 2, mb.y + mb.h / 2, '#f80', 16);
  triggerShake(6, 10); game.score += 200 + game.stage * 50; updateHUD(); addExp(60);
  addCoins(25 + Math.floor(Math.random() * 15));
  playSound('boss_die');
  mb.alive = false;
  if (game.miniBosses.every(m => !m.alive)) {
    game.miniBosses = [];
    game.stageRank = calcRank();
    const rankBonus = { S: 50, A: 35, B: 20, C: 10 }[game.stageRank] || 10;
    addCoins(rankBonus); stopBGM();
    const _skipStars2 = !!game.continueNoStarsThisRun;
    const _starsEarned2 = _skipStars2 ? 0 : computeStageStarMedal(game.stageStats.hits, game.stageStats.maxCombo);
    commitStageStarMedalForCurrentClear();
    game.stageResultData = { stage: game.stage, rank: game.stageRank, kills: game.stageStats.kills, hits: game.stageStats.hits, maxCombo: game.stageStats.maxCombo, rankBonus, score: game.score, starsEarned: _starsEarned2, starsSkippedMedal: _skipStars2 };
    game.stageResultTimer = 0; game.bullets = []; game.invaderBullets = []; game.stageClearAnimTimer = 80;
  }
}

// ===== ボス更新 =====
function updateBoss() {
  if (!game.boss) return;
  // シネマティック撃破中
  if (game.boss.dying) {
    game.boss.dyingTimer--;
    const prog = 1 - game.boss.dyingTimer / 100;
    const freq = Math.max(1, 7 - Math.floor(prog * 5));
    if (game.boss.dyingTimer % freq === 0)
      spawnExplosion(game.boss.x + Math.random() * game.boss.w, game.boss.y + Math.random() * game.boss.h,
        ['#ff0', '#f80', '#f44'][Math.floor(Math.random() * 3)], 8);
    if (game.boss.dyingTimer === 60) { triggerShake(8, 14); }
    if (game.boss.dyingTimer === 30) { triggerFlash(255, 200, 0, 0.65); }
    if (game.boss.dyingTimer <= 0) killBoss();
    return;
  }
  game.boss.frameTimer++;
  if (game.boss.frameTimer >= 20) { game.boss.frame ^= 1; game.boss.frameTimer = 0; }
  if (!game.boss.entryDone) {
    game.boss.y += 2;
    if (game.boss.y >= 40) { game.boss.y = 40; game.boss.entryDone = true; game.bossCutinTimer = BOSS_CUTIN_DURATION; }
    return;
  }

  game.boss.phase = game.boss.hp < game.boss.maxHp * 0.33 ? 2 : game.boss.hp < game.boss.maxHp * 0.66 ? 1 : 0;

  // シールド
  if (game.boss.ability === 'shield' && game.boss.shielded) {
    for (let i = game.bullets.length - 1; i >= 0; i--) {
      if (rectsOverlap(game.bullets[i], game.boss) && !game.bullets[i].charged) {
        spawnExplosion(game.bullets[i].x, game.bullets[i].y, '#4af', 4);
        game.bullets.splice(i, 1);
        game.boss.shieldHp -= 1;
        playSound('boss_shield');
        if (game.boss.shieldHp <= 0) { game.boss.shielded = false; triggerFlash(50, 150, 255, 0.3); }
      }
    }
    // フェーズ変化でシールド再生成
    if (game.boss.phase > 0) { game.boss.shielded = true; game.boss.shieldHp = game.boss.shieldMax; }
  }

  // テレポート
  if (game.boss.ability === 'teleport' && game.boss.entryDone) {
    game.boss.teleportTimer--;
    if (game.boss.teleportTimer <= 0) {
      game.boss.x = Math.random() * (W - game.boss.w);
      game.boss.teleportTimer = Math.max(80, 150 - game.stage * 10);
      triggerFlash(150, 0, 255, 0.15);
      spawnExplosion(game.boss.x + game.boss.w / 2, game.boss.y + game.boss.h / 2, '#f0f', 12);
      playSound('boss_teleport');
    }
  }

  const spd = game.boss.speed * (game.boss.phase >= 1 ? 1.4 : 1) * (game.boss.phase >= 2 ? 1.3 : 1);
  game.boss.x += game.boss.dir * spd;
  if (game.boss.x + game.boss.w >= W) game.boss.dir = -1;
  if (game.boss.x <= 0) game.boss.dir = 1;

  // 攻撃テレグラフ→発射
  const interval = game.boss.phase >= 2 ? Math.floor(game.boss.shootInterval * 0.5) : game.boss.phase === 1 ? Math.floor(game.boss.shootInterval * 0.7) : game.boss.shootInterval;
  if (game.boss.attackCharge > 0) {
    game.boss.attackCharge--;
    if (game.boss.attackCharge === 0) fireBossPattern(game.boss.nextPattern);
  } else {
    game.boss.shootTimer++;
    if (game.boss.shootTimer >= interval) {
      game.boss.shootTimer = 0;
      game.boss.nextPattern = pickBossPattern();
      game.boss.attackCharge = 28;
      if (game.boss.nextPattern === 'aimed') {
        game.boss.aimTarget = { x: game.player.x + game.player.w / 2, y: game.player.y + game.player.h / 2 };
      }
    }
  }

  // DASHER: 高速ダッシュ
  if (game.boss.ability === 'dasher' && game.boss.entryDone) {
    if (!game.boss._dashing) {
      game.boss.dashTimer--;
      if (game.boss.dashTimer <= 0) {
        game.boss.dashTimer = Math.max(50, 110 - game.stage * 5);
        game.boss._dashing = true;
        game.boss._dashVx = game.boss.dir * 24;
        game.boss._dashDuration = 16;
        spawnExplosion(game.boss.x + game.boss.w / 2, game.boss.y + game.boss.h / 2, '#0cf', 6);
        playSound('dash');
      }
    } else {
      game.boss._dashDuration--;
      game.boss.x = Math.max(0, Math.min(W - game.boss.w, game.boss.x + game.boss._dashVx));
      if (game.boss._dashDuration <= 0 || game.boss.x <= 0 || game.boss.x + game.boss.w >= W) {
        game.boss._dashing = false; game.boss.dir *= -1;
        spawnExplosion(game.boss.x + game.boss.w / 2, game.boss.y + game.boss.h / 2, '#0cf', 8);
        triggerShake(4, 5);
      }
    }
  }
  // BARRAGE: 定期的な全方位弾幕
  if (game.boss.ability === 'barrage' && game.boss.entryDone) {
    game.boss.barrageCharge++;
    const bInt = Math.max(55, 130 - game.stage * 6);
    if (game.boss.barrageCharge >= bInt) {
      game.boss.barrageCharge = 0;
      const cnt = 10 + game.boss.phase * 4;
      const cx2 = game.boss.x + game.boss.w / 2, cy2 = game.boss.y + game.boss.h / 2;
      for (let i = 0; i < cnt; i++) {
        const a = Math.PI * 2 * i / cnt;
        game.invaderBullets.push({
          x: cx2 - 3, y: cy2, w: 6, h: 6,
          vx: Math.cos(a) * INVADER_BULLET_SPEED * 0.85, vy: Math.sin(a) * INVADER_BULLET_SPEED * 0.85
        });
      }
      triggerFlash(200, 0, 80, 0.15); playSound('boss_split');
    }
  }
  // 分裂（フェーズ1移行時 1回）
  if (game.boss.ability === 'split' && game.boss.phase >= 1 && !game.boss.splitDone) {
    game.boss.splitDone = true;
    const halfHp = Math.floor(game.boss.hp / 2);
    spawnMiniBoss(game.boss.x - 30, game.boss.y, halfHp);
    spawnMiniBoss(game.boss.x + game.boss.w - 40, game.boss.y, halfHp);
    spawnExplosion(game.boss.x + game.boss.w / 2, game.boss.y + game.boss.h / 2, '#f80', 20);
    triggerFlash(255, 100, 0, 0.35);
    playSound('boss_split');
    game.boss = null;
    return;
  }

  // ミニオン召喚（フェーズ1以降）
  if (game.boss.phase >= 1) {
    game.minionSpawnTimer++;
    const mInterval = game.boss.phase >= 2 ? 200 : 240;
    const mCap = 6;
    if (game.minionSpawnTimer >= mInterval) {
      game.minionSpawnTimer = 0;
      const count = game.boss.phase >= 2 ? 2 : 1;
      for (let i = 0; i < count && game.bossMinions.length < mCap; i++) spawnBossMinion();
    }
  }

  if (!game.boss.shielded && !game.boss.dying) {
    for (let i = game.bullets.length - 1; i >= 0; i--) {
      if (rectsOverlap(game.bullets[i], game.boss)) {
        const { val: dmg, isCrit: dc } = calcPlayerDmg(game.bullets[i].charged ? game.playerUpgrades.damage * 4 : game.playerUpgrades.damage);
        game.bullets.splice(i, 1);
        spawnDmgNum(game.boss.x + game.boss.w / 2, game.boss.y, dmg, dc);
        game.boss.hp = Math.max(0, game.boss.hp - dmg);
        addUltimateGauge(3);
        spawnExplosion(game.boss.x + Math.random() * game.boss.w, game.boss.y + Math.random() * game.boss.h, '#f80', 5);
        playSound('boss_hit');
        if (game.boss.hp <= 0) {
          game.boss.dying = true; game.boss.dyingTimer = 100;
          game.invaderBullets = []; game.bossCutinTimer = 0;
          triggerFlash(255, 220, 80, 0.4);
          return;
        }
      }
    }
  }
}

function updateMiniBosses() {
  for (const mb of game.miniBosses) {
    if (!mb.alive) continue;
    mb.frameTimer = (mb.frameTimer || 0) + 1;
    if (mb.frameTimer >= 20) { mb.frame ^= 1; mb.frameTimer = 0; }
    mb.x += mb.dir * mb.speed;
    if (mb.x + mb.w >= W) mb.dir = -1;
    if (mb.x <= 0) mb.dir = 1;
    mb.shootTimer++;
    if (mb.shootTimer >= mb.shootInterval) {
      mb.shootTimer = 0;
      game.invaderBullets.push({
        x: mb.x + mb.w / 2 - 2, y: mb.y + mb.h, w: 5, h: 14,
        vx: (Math.random() - 0.5) * 2, vy: INVADER_BULLET_SPEED, zigzag: false
      });
    }
    for (let i = game.bullets.length - 1; i >= 0; i--) {
      if (rectsOverlap(game.bullets[i], mb)) {
        const { val: dmg, isCrit: mdc } = calcPlayerDmg(game.bullets[i].charged ? game.playerUpgrades.damage * 4 : game.playerUpgrades.damage);
        game.bullets.splice(i, 1);
        mb.hp -= dmg; spawnDmgNum(mb.x + mb.w / 2, mb.y, dmg, mdc);
        spawnExplosion(mb.x + Math.random() * mb.w, mb.y + Math.random() * mb.h, '#f80', 4);
        playSound('boss_hit');
        if (mb.hp <= 0) { killMiniBoss(mb); break; }
      }
    }
  }
}

function updateHealers() {
  if (!game.bossPhase) return;
  if ((game.boss || game.miniBosses.some(m => m.alive))) {
    game.healerSpawnTimer++;
    if (game.healerSpawnTimer >= Math.max(180, 360 - game.stage * 20)) { game.healerSpawnTimer = 0; spawnHealer(); }
  }
  for (let i = game.healers.length - 1; i >= 0; i--) {
    const h = game.healers[i];
    if (!h.alive) { game.healers.splice(i, 1); continue; }
    if (h.x < 0) h.vx = Math.abs(h.vx);
    if (h.x + h.w > W) h.vx = -Math.abs(h.vx);
    h.x += h.vx; h.y += h.vy;
    const bossTgt = game.boss || (game.miniBosses.find(m => m.alive));
    if (bossTgt && rectsOverlap(h, bossTgt)) {
      bossTgt.hp = Math.min(bossTgt.maxHp, bossTgt.hp + 5);
      spawnExplosion(h.x + h.w / 2, h.y + h.h / 2, '#0f0', 8);
      h.alive = false; triggerFlash(0, 255, 0, 0.15); continue;
    }
    for (let j = game.bullets.length - 1; j >= 0; j--) {
      if (rectsOverlap(game.bullets[j], h)) {
        game.bullets.splice(j, 1); h.alive = false;
        spawnExplosion(h.x + h.w / 2, h.y + h.h / 2, '#0f0', 10);
        game.score += 80; updateHUD(); addExp(20); playSound('healer_die'); break;
      }
    }
    if (h.y > H) h.alive = false;
  }
}

// ===== ボスミニオン =====
function spawnBossMinion() {
  const side = Math.random() < 0.5 ? -1 : 1;
  game.bossMinions.push({
    x: side < 0 ? -36 : W + 36, y: game.boss ? game.boss.y + game.boss.h * 0.5 + Math.random() * game.boss.h * 0.3 : 60,
    w: 32, h: 26, hp: 3, maxHp: 3,
    vx: side < 0 ? 1.4 : -1.4, vy: 0.5, alive: true, frame: 0, frameTimer: 0,
  });
}
function updateBossMinions() {
  if (!game.bossPhase) { game.bossMinions = []; return; }
  for (let i = game.bossMinions.length - 1; i >= 0; i--) {
    const m = game.bossMinions[i];
    if (!m.alive) { game.bossMinions.splice(i, 1); continue; }
    m.frameTimer = (m.frameTimer || 0) + 1;
    if (m.frameTimer >= 14) { m.frame ^= 1; m.frameTimer = 0; }
    // プレイヤーに向かう (速度を抑制)
    const px = game.player.x + game.player.w / 2, py = game.player.y + game.player.h / 2;
    const dx = px - (m.x + m.w / 2), dy = py - (m.y + m.h / 2);
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const spd = Math.min(2.4, 0.9 + game.stage * 0.06);
    m.x += dx / len * spd; m.y += dy / len * spd;
    if (m.y > H + 60 || m.x < -80 || m.x > W + 80) { game.bossMinions.splice(i, 1); continue; }
    // 弾との衝突 (レーザー対応)
    for (let j = game.bullets.length - 1; j >= 0; j--) {
      if (!rectsOverlap(game.bullets[j], m)) continue;
      const b = game.bullets[j];
      const dmg = b.laser ? 999 : b.charged ? 4 : 1;
      m.hp -= dmg;
      if (!b.laser) game.bullets.splice(j, 1); // レーザーは消えない
      if (m.hp <= 0) {
        spawnExplosion(m.x + m.w / 2, m.y + m.h / 2, '#ff44ff', 10);
        game.score += 50; addExp(12); addUltimateGauge(6); updateHUD();
        m.alive = false; playSound('explosion'); break;
      } else {
        spawnExplosion(m.x + m.w / 2, m.y + m.h / 2, '#aa00aa', 3);
        if (!b.laser) break;
      }
    }
    // プレイヤーに当たる
    if (m.alive && rectsOverlap(m, game.player) && !(game.powerupActive === 'invincible' || game.player.invincibleTimer > 0)) {
      m.alive = false;
      spawnExplosion(m.x + m.w / 2, m.y + m.h / 2, '#ff44ff', 8);
      if (game.playerShield) { absorbWithShield(); } else { onPlayerHit(); }
    }
  }
}

// ===== ペット更新 =====
function updatePets() {
  if (!game.player || game.state !== 'playing') return;
  const activePets = game.playerLoadout.pets.map((pid, i) => {
    if (!pid || !game.gachaInventory[pid]) return null;
    return { def: PET_POOL.find(p => p.id === pid), idx: i, pid, inv: game.gachaInventory[pid] };
  }).filter(Boolean);
  for (const { def, idx, pid, inv } of activePets) {
    const lv = (inv?.level) || 1;
    const pp = getPetParams(def.effect, lv);
    // dragon: 180フレーム(3秒)毎に前方に火球
    if (def.effect === 'dragon') {
      game.petTimers.dragon = (game.petTimers.dragon || 0) + 1;
      if (game.petTimers.dragon >= pp.intervalFrames) {
        game.petTimers.dragon = 0;
        const cx = game.player.x + game.player.w / 2;
        game.bullets.push({ x: cx - 5, y: game.player.y - 10, w: 10, h: 10, explosive: true, bspd: BULLET_SPEED + 2, petBullet: true });
        playSound('shoot_expl');
      }
    }
    // hawk: 180フレーム毎にホーミング
    if (def.effect === 'hawk') {
      game.petTimers.hawk = (game.petTimers.hawk || 0) + 1;
      if (game.petTimers.hawk >= pp.intervalFrames) {
        game.petTimers.hawk = 0;
        let target = null, minDist = Infinity;
        const cands = [...invaders.filter(i => i.alive), ...(game.boss ? [game.boss] : []), ...miniBosses.filter(m => m.alive)];
        const cx = game.player.x + game.player.w / 2;
        for (const t of cands) { const d = Math.hypot((t.x + t.w / 2) - cx, (t.y + t.h / 2) - game.player.y); if (d < minDist) { minDist = d; target = t; } }
        game.bullets.push({ x: cx - 3, y: game.player.y - 10, w: 6, h: 14, homing: true, target, bspd: BULLET_SPEED, vx: 0, vy: -BULLET_SPEED, petBullet: true });
        playSound('shoot_homing');
      }
    }
    // turtle: 被ダメージ軽減 (onPlayerHit側で処理)
    // coin: プレイヤー周辺のコインパワーアップを自動取得 (addCoins内でboostで対応)
    // bomber: 480フレーム毎に爆弾投下
    if (def.effect === 'bomber') {
      game.petTimers.bomber = (game.petTimers.bomber || 0) + 1;
      if (game.petTimers.bomber >= pp.intervalFrames) {
        game.petTimers.bomber = 0;
        const cands = [...invaders.filter(i => i.alive), ...(game.boss ? [game.boss] : [])];
        const tgt = cands.length > 0 ? cands[Math.floor(Math.random() * cands.length)] : null;
        const tx = tgt ? tgt.x + tgt.w / 2 : game.player.x + (Math.random() - 0.5) * 200;
        const ty = tgt ? tgt.y : 100;
        const cx = game.player.x + game.player.w / 2;
        const dist = Math.sqrt((tx - cx) ** 2 + (ty - game.player.y) ** 2) || 1;
        game.bullets.push({
          x: cx - 5, y: game.player.y - 10, w: 10, h: 10, explosive: true, bspd: 7,
          vx: (tx - cx) / dist * 7, vy: (ty - game.player.y) / dist * 7, petBullet: true
        });
        playSound('shoot_expl');
      }
    }
    // ghost: 600フレーム毎に1秒無敵
    if (def.effect === 'ghost') {
      game.petTimers.ghost = (game.petTimers.ghost || 0) + 1;
      if (game.petTimers.ghost >= pp.intervalFrames) {
        game.petTimers.ghost = 0;
        game.player.invincibleTimer = Math.max(game.player.invincibleTimer || 0, (pp.durationFrames || 70));
        triggerFlash(180, 180, 255, 0.25);
        game.lifeGainDisplay = { text: 'GHOST: 無敵発動!', timer: 90, color: '#aaaaff' };
      }
    }
    // fenrir (LR): 180フレーム毎に8方向全弾幕
    if (def.effect === 'fenrir') {
      game.petTimers.fenrir = (game.petTimers.fenrir || 0) + 1;
      if (game.petTimers.fenrir >= pp.intervalFrames) {
        game.petTimers.fenrir = 0;
        const cx = game.player.x + game.player.w / 2, cy = game.player.y + game.player.h / 2;
        for (let d = 0; d < 8; d++) {
          const a = (d / 8) * Math.PI * 2;
          game.bullets.push({ x: cx - 4, y: cy - 4, w: 8, h: 8, vx: Math.cos(a) * (BULLET_SPEED + 3), vy: Math.sin(a) * (BULLET_SPEED + 3), bspd: BULLET_SPEED + 3, petBullet: true });
        }
        triggerFlash(255, 34, 102, 0.2);
        playSound('shoot_expl');
      }
    }
  }
  // valkyrie (LR): HP0になった時に一度だけ復活 (onPlayerHit側で処理)
}

// ===== 護衛艦更新 =====
function updateEscortShip() {
  if (!game.escortShip || !game.escortShip.alive) return;
  game.escortShip.x += game.escortShip.vx;
  if (game.escortShip.x <= 0 || game.escortShip.x + game.escortShip.w >= W) game.escortShip.vx *= -1;
  for (let i = game.invaderBullets.length - 1; i >= 0; i--) {
    if (rectsOverlap(game.invaderBullets[i], game.escortShip)) {
      game.invaderBullets.splice(i, 1);
      game.escortShip.hp--;
      spawnExplosion(game.escortShip.x + game.escortShip.w / 2, game.escortShip.y + game.escortShip.h / 2, '#f80', 4);
      triggerFlash(255, 120, 0, 0.2);
      if (game.escortShip.hp <= 0) { game.escortShip.alive = false; triggerShake(10, 20); triggerGameOver(); return; }
    }
  }
  for (const inv of game.invaders.filter(i => i.alive)) {
    if (rectsOverlap(inv, game.escortShip)) {
      inv.alive = false;
      game.escortShip.hp = Math.max(0, game.escortShip.hp - 2);
      spawnExplosion(game.escortShip.x + game.escortShip.w / 2, game.escortShip.y + game.escortShip.h / 2, '#f80', 6);
      if (game.escortShip.hp <= 0) { game.escortShip.alive = false; triggerGameOver(); return; }
    }
  }
}

// ===== イベント =====
function tryTriggerEvent() {
  if (game.currentEvent || game.bossPhase) return;
  game.eventCooldown--;
  if (game.eventCooldown > 0) return;
  game.eventCooldown = 600 + Math.floor(Math.random() * 400);
  game.currentEvent = EVENT_LIST[Math.floor(Math.random() * EVENT_LIST.length)];
  game.eventTimer = 300; playSound('event_start');
  if (game.currentEvent.id === 'supply') {
    const types = ['double', 'invincible', 'wide'];
    for (let i = 0; i < 5; i++) game.powerups.push({ x: Math.random() * (W - 24), y: -20 - i * 60, w: 24, h: 16, vy: 2, type: types[Math.floor(Math.random() * 3)] });
  }
  if (game.currentEvent.id === 'emp') {
    game.invaderBullets = [];
    game.invaders.filter(i => i.alive).forEach(inv => { inv._stunTimer = 120; });
  }
}
function updateEvent() {
  if (!game.currentEvent) return;
  game.eventTimer--;
  if (game.currentEvent.id === 'meteor' && Math.random() < 0.08)
    game.meteors.push({ x: Math.random() * W, y: -20, w: 16, h: 16, vy: 3 + Math.random() * 3, alive: true });
  if (game.eventTimer <= 0) game.currentEvent = null;
}
function updateMeteors() {
  for (let i = game.meteors.length - 1; i >= 0; i--) {
    const m = game.meteors[i]; m.y += m.vy;
    if (m.y > H) { game.meteors.splice(i, 1); continue; }
    // 弾を消す
    for (let j = game.invaderBullets.length - 1; j >= 0; j--) {
      if (rectsOverlap(m, game.invaderBullets[j])) { game.invaderBullets.splice(j, 1); }
    }
    if (rectsOverlap(m, game.player) && !(game.powerupActive === 'invincible' || game.player.invincibleTimer > 0)) {
      game.meteors.splice(i, 1); if (game.playerShield) { absorbWithShield(); return; }
      playSound('meteor_hit'); onPlayerHit(); return;
    }
  }
}

// ===== 小惑星更新 =====
function updateAsteroids() {
  if (!game.isAsteroidStage) return;
  for (let i = game.asteroids.length - 1; i >= 0; i--) {
    const a = game.asteroids[i];
    if (!a.alive) { game.asteroids.splice(i, 1); continue; }
    a.x += a.vx; a.y += a.vy; a.angle += a.rotSpeed;
    if (a.x < 0 || a.x + a.w > W) a.vx *= -1;
    if (a.y < 0 || a.y + a.h > H * 0.75) a.vy *= -1;
    // プレイヤー弾を消す
    for (let j = game.bullets.length - 1; j >= 0; j--) {
      if (rectsOverlap(game.bullets[j], a)) {
        game.bullets.splice(j, 1);
        a.hp--;
        spawnExplosion(a.x + a.w / 2, a.y + a.h / 2, '#888', 4);
        playSound('asteroid_hit');
        if (a.hp <= 0) {
          spawnExplosion(a.x + a.w / 2, a.y + a.h / 2, '#aaa', 12);
          a.alive = false;
          addExp(15); game.score += 30; updateHUD();
        }
        break;
      }
    }
    // プレイヤーに当たる
    if (rectsOverlap(a, game.player) && !(game.powerupActive === 'invincible' || game.player.invincibleTimer > 0)) {
      if (game.playerShield) { absorbWithShield(); } else { onPlayerHit(); }
      return;
    }
  }
}

// ===== 爆発弾 =====
function explodeBomb(cx, cy) {
  const R = 70;
  spawnExplosion(cx, cy, '#f0f', 20); triggerFlash(255, 0, 255, 0.15);
  for (const inv of game.invaders) {
    if (!inv.alive) continue;
    const dx = (inv.x + inv.w / 2) - cx, dy = (inv.y + inv.h / 2) - cy;
    if (Math.sqrt(dx * dx + dy * dy) < R) {
      inv.alive = false;
      addCombo(inv.x + inv.w / 2, inv.y, (3 - inv.row) * 10);
      spawnExplosion(inv.x + inv.w / 2, inv.y + inv.h / 2, '#f0f'); addExp(10); playSound('explosion');
    }
  }
  if (game.boss && game.boss.entryDone && !game.boss.shielded) {
    const dx = (game.boss.x + game.boss.w / 2) - cx, dy = (game.boss.y + game.boss.h / 2) - cy;
    if (Math.sqrt(dx * dx + dy * dy) < R + game.boss.w / 2) {
      const { val: ud, isCrit: uc2 } = calcPlayerDmg(game.playerUpgrades.damage * 2); game.boss.hp -= ud; spawnDmgNum(game.boss.x + game.boss.w / 2, game.boss.y, ud, uc2); playSound('boss_hit');
      if (game.boss.hp <= 0) { killBoss(); return; }
    }
  }
}

// ===== プレイヤー被弾 =====
function checkPlayerHit() {
  if (game.powerupActive === 'invincible' || game.player.invincibleTimer > 0) return;
  for (let i = game.invaderBullets.length - 1; i >= 0; i--) {
    if (rectsOverlap(game.invaderBullets[i], game.player)) {
      game.invaderBullets.splice(i, 1);
      if (game.playerShield) { absorbWithShield(); return; }
      onPlayerHit(); return;
    }
  }
  for (const inv of game.invaders.filter(i => i.alive)) {
    if (rectsOverlap(inv, game.player)) {
      inv.alive = false;
      if (game.playerShield) { absorbWithShield(); return; }
      onPlayerHit(); return;
    }
  }
}

function fireCounterShot() {
  if (!game.player) return;
  const cx = game.player.x + game.player.w / 2, cy = game.player.y + game.player.h / 2;
  for (let a = -30; a <= 30; a += 30) {
    const rad = (-Math.PI / 2) + (a * Math.PI / 180);
    game.bullets.push({ x: cx - 3, y: cy, w: 6, h: 12, vx: Math.cos(rad) * (BULLET_SPEED + 2), vy: Math.sin(rad) * (BULLET_SPEED + 2), bspd: BULLET_SPEED + 2, petBullet: true });
  }
  playSound('shoot');
}

function absorbWithShield() {
  game.playerShield = false; triggerFlash(50, 150, 255, 0.4); triggerShake(6, 8);
  game.lifeGainDisplay = { text: 'SHIELD BREAK', timer: 90, color: '#4af' };
  spawnExplosion(game.player.x + game.player.w / 2, game.player.y + game.player.h / 2, '#4af', 16);
  game.player.invincibleTimer = 60; playSound('powerup');
  if (game.gachaInventory['passive_shield_burst']?.level >= 1) {
    const cx = game.player.x + game.player.w / 2, cy = game.player.y + game.player.h / 2;
    for (let a = 0; a < 360; a += 45) {
      const rad = a * Math.PI / 180;
      game.bullets.push({ x: cx - 3, y: cy, w: 8, h: 8, vx: Math.cos(rad) * 6, vy: Math.sin(rad) * 6, bspd: 6, explosive: true, petBullet: true });
    }
    game.lifeGainDisplay = { text: 'SHIELD BURST!', timer: 90, color: '#ffdd00' };
    playSound('shoot_expl');
  }
}

function onPlayerHit() {
  game.stageStats.hits++;
  addUltimateGauge(12);
  const turtleMod = getPetEffect('turtle') ? 0.85 : 1;
  const dmg = Math.max(5, Math.floor(25 * (1 - game.playerStats.def / 100) * turtleMod));
  game.playerStats.hp = Math.max(0, game.playerStats.hp - dmg);
  // ペット: slime heal
  if (getPetEffect('heal') && game.playerStats.hp > 0) game.playerStats.hp = Math.min(game.playerStats.maxHp, game.playerStats.hp + 15);
  updateHUD();
  spawnExplosion(game.player.x + game.player.w / 2, game.player.y + game.player.h / 2, '#0f0', 20);
  triggerShake(12, 15); triggerFlash(255, 0, 0, 0.4); game.hitFlashTimer = 40;
  playSound('player_hit'); vibrate([80, 30, 30]);
  if (game.playerStats.hp <= 0) {
    // valkyrie (LR): 一度だけHP60で復活
    if (getPetEffect('valkyrie') && !game.player._valkyrieUsed) {
      game.player._valkyrieUsed = true;
      game.playerStats.hp = 60; updateHUD();
      game.player.invincibleTimer = 180;
      triggerFlash(255, 34, 102, 0.6);
      game.lifeGainDisplay = { text: '★ VALKYRIE 復活!! HP60 ★', timer: 120, color: '#ff2266' };
      return;
    }
    triggerGameOver(); return;
  }
  // phoenix: 30%以下で無敵
  if (getPetEffect('phoenix') && game.playerStats.hp <= game.playerStats.maxHp * 0.3) {
    game.player.invincibleTimer = Math.max(game.player.invincibleTimer, 120);
    game.lifeGainDisplay = { text: 'PHOENIX  無敵発動！', timer: 90, color: '#f80' };
  } else {
    game.lifeGainDisplay = { text: `HP  -${dmg}  (${game.playerStats.hp}/${game.playerStats.maxHp})`, timer: 90, color: '#f44' };
  }
  game.player.invincibleTimer = Math.max(game.player.invincibleTimer, 120 + game.playerUpgrades.invincibleBonus);
  if (game.gachaInventory['passive_counter']?.level >= 1) fireCounterShot();
}

function rectsOverlap(a, b) { return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; }

function tryContinueFromGameOver() {
  if (game.state !== 'gameover') return false;
  if ((game.gems || 0) < CONTINUE_GEM_COST) return false;
  game.gems -= CONTINUE_GEM_COST; saveGems(); updateHUD();
  game.continueNoStarsThisRun = true;
  game.playerStats.hp = game.playerStats.maxHp; updateHUD();
  showMessage(null); startBGM();
  initStars(); initStage();
  game.state = 'playing';
  game.lifeGainDisplay = { text: `💎${CONTINUE_GEM_COST} コンティニュー（このクリアは★更新なし）`, timer: 140, color: '#cc88ff' };
  return true;
}

function triggerGameOver() {
  const wasRecord = game.score > 0 && game.score >= (game.hiScores[0] || 0);
  if (game.score > 0) saveScore(game.score);
  if (game.bossRushModeActive) pushWeeklyLocalScore('boss_rush', game.score);
  else if (game.endlessModeActive) pushWeeklyLocalScore('endless', game.score);
  const nr = wasRecord ? '\n★ NEW RECORD! ★' : '';
  game.playerStats.hp = 0; updateHUD();
  game.state = 'gameover'; stopBGM();
  triggerFlash(255, 0, 0, 0.6); playSound('gameover'); vibrate([200, 100, 200]);
  const _bRetry = game.selectedBossAbility ? '\nB: 同ボス再挑戦' : '';
  const _gemOk = (game.gems || 0) >= CONTINUE_GEM_COST;
  const _cLine = _gemOk ? `\nC / タップ: 💎${CONTINUE_GEM_COST} コンティニュー（★更新なし・同ステージ先頭）` : `\nC: 💎${CONTINUE_GEM_COST} コンティニュー（ジェム不足）`;
  showMessage(`ゲームオーバー\nスコア: ${game.score}${nr}\nSPACE: タイトルへ  /  R: 即リトライ${_bRetry}${_cLine}`);
}

function updateHUD() {
  const livesHtmlEl = document.getElementById('lives');
  if (livesHtmlEl) livesHtmlEl.textContent = `${game.playerStats.hp}/${game.playerStats.maxHp}`;
  stageEl.textContent = formatStageId(game.stage);
  const lvEl = document.getElementById('level');
  if (lvEl) lvEl.textContent = game.playerLevel;
  const expNextEl = document.getElementById('exp-next');
  if (expNextEl) {
    if (game.playerLevel >= 10) { expNextEl.textContent = 'MAX'; }
    else {
      const need = EXP_TABLE[Math.min(game.playerLevel, EXP_TABLE.length - 1)] || 0;
      const rem = Math.max(0, need - game.exp);
      expNextEl.textContent = `次まで${rem}`;
    }
  }
  const c = document.getElementById('coins');
  if (c) c.textContent = game.coins;
  const g = document.getElementById('gems');
  if (g) g.textContent = game.gems;

  // 燃料
  syncFuel();
  const f = document.getElementById('fuel');
  if (f) f.textContent = `${Math.max(0, Math.floor(game.fuel || 0))}/${FUEL_CAP}`;
  const fn = document.getElementById('fuel-next');
  if (fn) {
    if ((game.fuel || 0) >= FUEL_CAP) fn.textContent = 'FULL';
    else fn.textContent = `次:${_fmtMMSS(fuelNextRegenMs())}`;
  }
}
function showMessage(text) {
  if (text === null) messageEl.classList.add('hidden');
  else { messageEl.textContent = text; messageEl.classList.remove('hidden'); }
}

// ===== メイン更新（update-tick + game-store）=====
Object.assign(actions, {
  playSound,
  vibrate,
  fireBullet,
  explodeBomb,
  rectsOverlap,
  trySpawnUFO,
  updateMeteors,
  updateAsteroids,
  tryTriggerEvent,
  updateEvent,
  spawnBoss,
  updateBoss,
  updateMiniBosses,
  updateBossMinions,
  updateHealers,
  checkPlayerHit,
  updateEscortShip,
  updatePets,
  spawnExplosion,
  spawnFormation,
  startWave,
  getWaveCount,
  updateHUD,
  triggerFlash,
  addExp,
  addCoins,
  checkAndClaimMissions,
  ensureNormalQuestProfile,
  persistDailyMissionState,
  spawnPowerup,
  spawnDmgNum,
  calcPlayerDmg,
  dropMaterial,
  addCombo,
  setTitleBgQuality
});

// ===== 描画モジュールの依存関係設定 =====
// Initialize draw dependencies for all drawing modules
const drawDeps = {
  get ctx() { return ctx; },
  get W() { return W; },
  get H() { return H; },
  get state() { return game.state; },
  get shakeTimer() { return game.shakeTimer; },
  get shakeIntensity() { return game.shakeIntensity; },
  get escortShip() { return game.escortShip; },
  get boss() { return game.boss; },
  get ufo() { return game.ufo; },
  get skillChoices() { return game.skillChoices; },
  get stageClearAnimTimer() { return game.stageClearAnimTimer; },
  get paused() { return game.paused; },
  currentWeapon,
  DASH_COOLDOWN,
  ULTIMATE_MAX,
  getTheme,
  UI_BUTTONS,
  drawStarfield,
  drawTitle,
  drawTitleWarp,
  drawVignette,
  drawShipShape,
  get BOSS_SELECT_DATA() { return BOSS_SELECT_DATA; },
  get IAP_PACKAGES() { return IAP_PACKAGES; },
  get NOTICES() { return NOTICES; },
  get STARDUST_SHOP_ITEMS() { return STARDUST_SHOP_ITEMS; },
  applyLevelToAtkMult,
  applyLevelToStatAdd,
  buildEquipPool,
  canDailyGacha,
  canPetUpgrade,
  computeZukanGridMetrics,
  computeStageStarMedal,
  drawBossCardSprite,
  drawCoinInlineIcon,
  drawCustomizeNeonBrackets,
  drawEquipShape,
  drawGachaAuxInfoStrip,
  drawGachaInsufficientModal,
  drawGachaItemIcon,
  drawGachaLeftColumn,
  drawGemInlineIcon,
  drawPetShape,
  gachaTypeLabelJp,
  ensureDailyMissions,
  ensureNormalQuestProfile,
  estimateSortieWinPct,
  fillRoundHex,
  formatStageId,
  getCustomizeLayout,
  getEquipMainEffectText,
  getGachaAuxStripLayout,
  getGachaZukanFilterPools,
  getLevelUpCost,
  getPetParams,
  getPetUpgradeCost,
  getPlanet,
  getUpgradeLvCost,
  getWorldInfo,
  hexToRgb,
  missionEffectiveProgress,
  pickCharShipShape,
  readWeeklyLocalBoard,
  stageSelectFuelLaunchOk,
  syncFuel,
  truncateLine,
  upgradeBonusNowNext,
  wrapFillJp,
  playSound,
  drawAsteroids,
  drawMeteors,
  drawDashTrail,
  drawInvaders,
  drawHealers,
  drawBoss,
  drawMiniBosses,
  drawBossMinions,
  drawUFO,
  drawPowerups,
  drawPlayer,
  drawPets,
  drawBullets,
  drawMuzzleFlashes,
  drawParticles,
  updateDamageNumbers,
  drawDamageNumbers,
  drawGroundLine,
  drawHUD,
  drawBossWarning,
  drawSurvivalTimer,
  drawStageBanner,
  drawWaveBanner,
  drawLifeGainDisplay,
  drawLevelUpDisplay,
  drawEventBanner,
  drawMatPopups,
  drawStageClearAnim,
  drawHitFlash,
  drawScanlines,
  drawEscortShip,
  drawGachaRatesModalIfOpen,
  drawGachaResult,
  drawGachaSummary,
  drawGachaRates,
  drawStardustShop,
  drawStageResult,
  bumpGachaAnimFrame: () => { game.gachaAnimFrame++; },
  drawInvaderSprite,
  // Use functions from new modules
  drawPauseOverlay: () => drawPauseOverlay(),
  drawGameOverOverlay: () => drawGameOverOverlay(),
  drawCriticalVignette: () => drawCriticalVignette(),
  drawJoystick: () => drawJoystick(),
  drawScreenFlash: () => drawScreenFlash(),
  drawSkillChoice: () => drawSkillChoice(),
  drawUIButtons: () => drawUIButtons(),
  drawCustomizeScreen: () => drawCustomizeScreen(),
  drawLoadoutScreen: () => drawLoadoutScreen(),
  drawStageSelectScreen: () => drawStageSelectScreen(),
  drawMapScreen: () => drawMapScreen(),
  drawShopScreen: () => drawShopScreen(),
  drawGachaScreen: () => drawGachaScreen(),
  drawMissionsScreen: () => drawMissionsScreen(),
  drawModeSelectScreen: () => drawModeSelectScreen(),
  drawBossSelectScreen: () => drawBossSelectScreen(),
  drawNotificationsScreen: () => drawNotificationsScreen(),
  drawSettingsScreen: () => drawSettingsScreen(),
  drawInboxScreen: () => drawInboxScreen(),
  drawEventsScreen: () => drawEventsScreen(),
  drawIAPScreen: () => drawIAPScreen(),
};

const screenDrawDeps = {
  get ctx() { return ctx; },
  get BOSS_SELECT_DATA() { return BOSS_SELECT_DATA; },
  get IAP_PACKAGES() { return IAP_PACKAGES; },
  get NOTICES() { return NOTICES; },
  get STARDUST_SHOP_ITEMS() { return STARDUST_SHOP_ITEMS; },
  get ENEMY_PREVIEW_COLORS() { return ENEMY_PREVIEW_COLORS; },
  get ENEMY_PREVIEW_LABELS() { return ENEMY_PREVIEW_LABELS; },
  get FUEL_CAP() { return FUEL_CAP; },
  get FUEL_COST_PER_RUN() { return FUEL_COST_PER_RUN; },
  get SHIP_COLORS() { return SHIP_COLORS; },
  applyLevelToAtkMult,
  applyLevelToStatAdd,
  buildEquipPool,
  canDailyGacha,
  canPetUpgrade,
  circleBoundaryPoint,
  computeZukanGridMetrics,
  computeStageStarMedal,
  drawBossCardSprite,
  drawCoinInlineIcon,
  drawCustomizeNeonBrackets,
  drawEnemyPreviewIcon,
  drawEquipShape,
  drawGachaAuxInfoStrip,
  drawGachaInsufficientModal,
  drawGachaItemIcon,
  drawGachaLeftColumn,
  drawGemInlineIcon,
  drawHexagon,
  drawLoadoutPreview,
  drawPetShape,
  drawShipShape,
  drawStar,
  drawStarfield,
  drawWorldBgObjects,
  ensureDailyMissions,
  ensureNormalQuestProfile,
  estimateSortieWinPct,
  fillRoundHex,
  formatStageId,
  gachaTypeLabelJp,
  getCustomizeLayout,
  getEquipMainEffectText,
  getGachaAuxStripLayout,
  getGachaZukanFilterPools,
  getImage,
  getLevelUpCost,
  getPetParams,
  getPetUpgradeCost,
  getPlanet,
  getStageEnemyTypes,
  getStageStarsForMap,
  getUpgradeLvCost,
  getWorldInfo,
  hexBoundaryPoint,
  hexToRgb,
  missionEffectiveProgress,
  pickCharShipShape,
  readWeeklyLocalBoard,
  stageSelectFuelLaunchOk,
  syncFuel,
  truncateLine,
  upgradeBonusNowNext,
  wrapFillJp,
  playSound,
};

const entityDrawDeps = {
  get ctx() { return ctx; },
  drawInvaderSprite,
  drawShipShape,
};

const uiDrawDeps = {
  get ctx() { return ctx; },
  currentWeapon,
  DASH_COOLDOWN,
  ULTIMATE_MAX,
  getPlanet,
  getWaveCount,
  getTheme,
  UI_BUTTONS,
  drawInvaderSprite,
};

// ===== 描画（ルーティングは js/game/draw-dispatch.js）=====
function draw() { paintFrame(drawDeps); }
// All draw functions are now modularized and imported








function pickCharShipShape(item) {
  if (!item || item.type !== 'char') return SHIP_SHAPES[game.shipShapeIdx].id;
  const id = item.id || '';
  if (id === 'char_dragon_lord') return 'heavy';
  if (id === 'char_reaper') return 'agile';
  if (id === 'char_nova') return 'heavy';
  if (id === 'char_phantom') return 'agile';
  if (id === 'char_iron') return 'heavy';
  if (id === 'char_flame') return 'agile';
  if (id === 'char_swift') return 'agile';
  if (id === 'char_guard') return 'heavy';
  if (id === 'char_basic') return 'fighter';
  const spd = item.spd || 0, def = item.def || 0, atk = item.atk || 1;
  const hp = item.hp || 0;
  if (spd >= 3) return 'agile';
  if (def >= 20 || hp >= 160) return 'heavy';
  if (atk >= 1.35) return 'heavy';
  return 'fighter';
}

function drawShipShape(x, y, w, h, shapeId, fillColor = null, rarity = null) {
  const shape = shapeId || SHIP_SHAPES[game.shipShapeIdx].id;
  const col = fillColor || SHIP_COLORS[game.shipColorIdx].hex;
  const rar = String(rarity || '');
  const fx = (() => {
    if (rar === 'LR') return { strokeA: 0.26, rimA: 0.70, rimB: 16, rr: 3.2 };
    if (rar === 'SSR') return { strokeA: 0.22, rimA: 0.55, rimB: 12, rr: 2.8 };
    if (rar === 'SR') return { strokeA: 0.18, rimA: 0.40, rimB: 9, rr: 2.4 };
    if (rar === 'R') return { strokeA: 0.14, rimA: 0.28, rimB: 7, rr: 2.0 };
    if (rar === 'N') return { strokeA: 0.12, rimA: 0.20, rimB: 6, rr: 1.8 };
    return { strokeA: 0.10, rimA: 0.18, rimB: 5, rr: 1.6 };
  })();

  const rgb = (() => { try { return hexToRgb(col); } catch (e) { return null; } })();
  const rgba = (a) => rgb ? `rgba(${rgb},${a})` : col;

  const fillGrad = (x0, y0, x1, y1, a0, a1, a2) => {
    const g = ctx.createLinearGradient(x0, y0, x1, y1);
    g.addColorStop(0, rgba(a0));
    g.addColorStop(0.55, rgba(a1));
    g.addColorStop(1, rgba(a2));
    return g;
  };
  const part = (rx, ry, rw, rh, r = 2) => {
    ctx.fillStyle = fillGrad(rx, ry, rx + rw, ry + rh, 0.95, 0.58, 0.95);
    ctx.beginPath(); ctx.roundRect(rx, ry, rw, rh, r); ctx.fill();
    ctx.strokeStyle = `rgba(255,255,255,${fx.strokeA})`; ctx.lineWidth = 1.0;
    ctx.stroke();
    // subtle top highlight
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.roundRect(rx + 1, ry + 1, rw - 2, Math.max(2, rh * 0.22), Math.max(1, r - 1)); ctx.fill();
    ctx.globalAlpha = 1;
  };

  if (shape === 'fighter') {
    part(x + 8, y + 10, w - 16, h - 10, fx.rr);
    part(x + w / 2 - 4, y, 8, 14, 2.2);
    part(x, y + h - 8, 14, 8, 2.0);
    part(x + w - 14, y + h - 8, 14, 8, 2.0);
  } else if (shape === 'agile') {
    part(x + 14, y + 10, w - 28, h - 10, fx.rr);
    part(x + w / 2 - 3, y, 6, 18, 2.2);
    part(x + 4, y + h - 6, 12, 6, 2.0);
    part(x + w - 16, y + h - 6, 12, 6, 2.0);
  } else if (shape === 'heavy') {
    part(x + 4, y + 8, w - 8, h - 8, fx.rr + 0.4);
    part(x + w / 2 - 6, y + 2, 12, 10, 2.4);
    part(x, y + h - 10, 18, 10, 2.2);
    part(x + w - 18, y + h - 10, 18, 10, 2.2);
    part(x + 2, y + 12, 6, 8, 1.8);
    part(x + w - 8, y + 12, 6, 8, 1.8);
  }

  // Rarity rim (static; no spinning particles)
  if (rar) {
    const cx = x + w / 2, cy = y + h / 2, rx = w * 0.62, ry = h * 0.62;
    ctx.save();
    ctx.globalAlpha = 0.22 + fx.rimA * 0.22;
    ctx.shadowColor = rgba(fx.rimA);
    ctx.shadowBlur = fx.rimB;
    ctx.strokeStyle = rgba(0.45);
    ctx.lineWidth = 1.0;
    ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }
}







function drawInvaderSprite(ctx, x, y, frame, row, overrideColor) {
  const type = row <= 0 ? 0 : row <= 1 ? 1 : 2;
  const planetCols = getPlanetEnemyColors(game.stage);
  ctx.fillStyle = overrideColor || planetCols[type] || ['#f55', '#ff0', '#0ff'][type];
  if (type === 0) {
    ctx.fillRect(x + 10, y, 16, 6); ctx.fillRect(x + 4, y + 6, 28, 6); ctx.fillRect(x, y + 12, 36, 8);
    if (frame === 0) { ctx.fillRect(x + 4, y + 20, 8, 6); ctx.fillRect(x + 24, y + 20, 8, 6); }
    else { ctx.fillRect(x, y + 20, 8, 6); ctx.fillRect(x + 28, y + 20, 8, 6); }
  } else if (type === 1) {
    ctx.fillRect(x + 8, y, 20, 6); ctx.fillRect(x + 4, y + 6, 28, 6); ctx.fillRect(x, y + 12, 36, 6);
    ctx.fillRect(x + 4, y + 18, 10, 6); ctx.fillRect(x + 22, y + 18, 10, 6);
    if (frame === 0) { ctx.fillRect(x + 2, y + 20, 6, 6); ctx.fillRect(x + 28, y + 20, 6, 6); }
    else { ctx.fillRect(x + 6, y + 22, 6, 4); ctx.fillRect(x + 24, y + 22, 6, 4); }
  } else {
    ctx.fillRect(x + 6, y, 24, 6); ctx.fillRect(x + 2, y + 6, 32, 6); ctx.fillRect(x, y + 12, 36, 8);
    if (frame === 0) { ctx.fillRect(x + 2, y + 20, 8, 6); ctx.fillRect(x + 14, y + 20, 8, 6); ctx.fillRect(x + 26, y + 20, 8, 6); }
    else { ctx.fillRect(x + 4, y + 20, 8, 6); ctx.fillRect(x + 18, y + 20, 8, 6); ctx.fillRect(x + 28, y + 22, 8, 4); }
  }
}





















// ===== 環境ギミック =====
function initEnvGimmicks() {
  game.gravityZones = []; game.emFields = []; game.blackHoles = [];
  game.meteorRainTimer = 0; game.meteorRainWarning = 0;
  if (game.stage < 3) return;
  const gCount = game.stage >= 6 ? 2 : 1;
  for (let i = 0; i < gCount; i++) {
    game.gravityZones.push({
      x: 120 + Math.random() * (W - 240), y: 50 + Math.random() * (H * 0.42),
      r: 72, strength: 0.32, angle: 0, timer: 900, alive: true
    });
  }
  if (game.stage >= 5) {
    game.emFields.push({
      x: 120 + Math.random() * (W - 240), y: 70 + Math.random() * (H * 0.38),
      r: 58, vx: (Math.random() - 0.5) * 0.6, vy: (Math.random() - 0.5) * 0.4, timer: 700, alive: true
    });
  }
  if (game.stage >= 8) {
    game.blackHoles.push({
      x: 160 + Math.random() * (W - 320), y: 60 + Math.random() * (H * 0.38),
      r: 52, strength: 1.6, angle: 0, timer: 600, alive: true
    });
  }
}
function updateEnvGimmicks() {
  if (game.bossPhase) { game.gravityZones = []; game.emFields = []; game.blackHoles = []; game.meteorRainTimer = 0; game.meteorRainWarning = 0; return; }

  // 隕石雨フェーズ (stage5+, 1800fに1回)
  if (game.stage >= 5 && !game.bossPhase) {
    if (game.meteorRainWarning > 0) {
      game.meteorRainWarning--;
      if (game.meteorRainWarning === 0) game.meteorRainTimer = 360;
    } else if (game.meteorRainTimer > 0) {
      game.meteorRainTimer--;
      if (Math.random() < 0.18) game.meteors.push({ x: Math.random() * W, y: -20, w: 14, h: 14, vy: 4 + Math.random() * 4, alive: true });
    } else if (Math.random() < 0.00055) {
      game.meteorRainWarning = 120;
    }
  }
  for (let i = game.gravityZones.length - 1; i >= 0; i--) {
    const gz = game.gravityZones[i];
    gz.angle += 0.018; gz.timer--;
    if (gz.timer <= 0) { game.gravityZones.splice(i, 1); continue; }
    // 敵弾を引き寄せる
    for (const b of game.invaderBullets) {
      const dx = gz.x - (b.x + 2.5), dy = gz.y - (b.y + 7), dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < gz.r * 1.6 && dist > 6) { b.vx = (b.vx || 0) + (dx / dist) * gz.strength; b.vy = (b.vy || INVADER_BULLET_SPEED) + (dy / dist) * gz.strength * 0.5; }
    }
    // 自弾にも弱く影響
    for (const b of game.bullets) {
      if (b.laser || b.charged) continue;
      const dx = gz.x - (b.x + 3), dy = gz.y - (b.y + 7), dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < gz.r && dist > 6) { b.vx = (b.vx || 0) + (dx / dist) * gz.strength * 0.35; b.vy = (b.vy || -BULLET_SPEED) + (dy / dist) * gz.strength * 0.25; }
    }
  }
  for (let i = game.emFields.length - 1; i >= 0; i--) {
    const ef = game.emFields[i];
    ef.x += ef.vx; ef.y += ef.vy; ef.timer--;
    if (ef.x < ef.r || ef.x > W - ef.r) ef.vx *= -1;
    if (ef.y < ef.r || ef.y > H * 0.72) ef.vy *= -1;
    if (ef.timer <= 0) { game.emFields.splice(i, 1); continue; }
    for (let j = game.invaderBullets.length - 1; j >= 0; j--) {
      const b = game.invaderBullets[j];
      if (Math.hypot(ef.x - (b.x + 2.5), ef.y - (b.y + 7)) < ef.r) {
        spawnExplosion(b.x, b.y, '#0cf', 3); game.invaderBullets.splice(j, 1);
      }
    }
  }
  for (let i = game.blackHoles.length - 1; i >= 0; i--) {
    const bh = game.blackHoles[i];
    bh.angle -= 0.05; bh.timer--;
    if (bh.timer <= 0) { game.blackHoles.splice(i, 1); continue; }
    // 敵弾を強く吸引→中心到達で消滅
    for (let j = game.invaderBullets.length - 1; j >= 0; j--) {
      const b = game.invaderBullets[j];
      const dx = bh.x - (b.x + 2.5), dy = bh.y - (b.y + 7), dist = Math.sqrt(dx * dx + dy * dy) || 1;
      if (dist < bh.r * 2) {
        b.vx = (b.vx || 0) + (dx / dist) * bh.strength;
        b.vy = (b.vy || INVADER_BULLET_SPEED) + (dy / dist) * bh.strength;
        if (dist < 12) { game.invaderBullets.splice(j, 1); }
      }
    }
    // 自弾も強く引っ張る
    for (const b of game.bullets) {
      if (b.laser || b.charged) continue;
      const dx = bh.x - (b.x + 3), dy = bh.y - (b.y + 7), dist = Math.sqrt(dx * dx + dy * dy) || 1;
      if (dist < bh.r * 1.5) {
        b.vx = (b.vx || 0) + (dx / dist) * bh.strength * 0.9;
        b.vy = (b.vy || -BULLET_SPEED) + (dy / dist) * bh.strength * 0.6;
      }
    }
    // プレイヤーにも微弱な引力
    if (game.player) {
      const dx = bh.x - (game.player.x + game.player.w / 2), dy = bh.y - (game.player.y + game.player.h / 2), dist = Math.sqrt(dx * dx + dy * dy) || 1;
      if (dist < bh.r * 2.2) {
        game.player.x += dx / dist * 0.35; game.player.y += dy / dist * 0.22;
        game.player.x = Math.max(0, Math.min(W - game.player.w, game.player.x));
        game.player.y = Math.max(0, Math.min(H - game.player.h - 10, game.player.y));
      }
    }
  }
}
function drawEnvGimmicks() {
  // 隕石雨警告
  if (game.meteorRainWarning > 0) {
    const blink = Math.floor(game.meteorRainWarning / 8) % 2 === 0;
    if (blink) {
      ctx.fillStyle = 'rgba(255,80,0,0.18)'; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#ff5500'; ctx.font = 'bold 18px Orbitron,Courier New'; ctx.textAlign = 'center';
      ctx.shadowColor = '#ff5500'; ctx.shadowBlur = 20;
      ctx.fillText('⚠ METEOR RAIN INCOMING ⚠', W / 2, H / 2 - 10);
      ctx.shadowBlur = 0; ctx.textAlign = 'left';
    }
  }
  for (const gz of game.gravityZones) {
    const a = Math.min(1, gz.timer / 80) * 0.65;
    ctx.globalAlpha = a;
    ctx.strokeStyle = '#f80'; ctx.lineWidth = 1.5; ctx.shadowColor = '#f80'; ctx.shadowBlur = 10;
    ctx.beginPath(); ctx.arc(gz.x, gz.y, gz.r, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,150,0,0.5)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(gz.x, gz.y, gz.r * 0.55, gz.angle, gz.angle + Math.PI * 1.3); ctx.stroke();
    ctx.beginPath(); ctx.arc(gz.x, gz.y, gz.r * 0.28, gz.angle + Math.PI, gz.angle + Math.PI * 2.3); ctx.stroke();
    ctx.fillStyle = '#f80'; ctx.font = '9px Orbitron,Courier New'; ctx.textAlign = 'center';
    ctx.shadowBlur = 0; ctx.fillText('GRAVITY', gz.x, gz.y + 4);
    ctx.textAlign = 'left'; ctx.globalAlpha = 1;
  }
  for (const ef of game.emFields) {
    const a = Math.min(1, ef.timer / 80) * 0.7;
    ctx.globalAlpha = a;
    const grad = ctx.createRadialGradient(ef.x, ef.y, 0, ef.x, ef.y, ef.r);
    grad.addColorStop(0, 'rgba(0,200,255,0.14)'); grad.addColorStop(1, 'rgba(0,200,255,0)');
    ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(ef.x, ef.y, ef.r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#0cf'; ctx.lineWidth = 2; ctx.shadowColor = '#0cf'; ctx.shadowBlur = 14;
    ctx.beginPath(); ctx.arc(ef.x, ef.y, ef.r, 0, Math.PI * 2); ctx.stroke(); ctx.shadowBlur = 0;
    if (game.frameCount % 5 < 2) {
      const arc = Math.random() * Math.PI * 2;
      ctx.strokeStyle = 'rgba(0,230,255,0.85)'; ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(ef.x + Math.cos(arc) * ef.r * 0.25, ef.y + Math.sin(arc) * ef.r * 0.25);
      ctx.lineTo(ef.x + Math.cos(arc + 0.6) * ef.r * 0.88, ef.y + Math.sin(arc + 0.6) * ef.r * 0.88);
      ctx.stroke();
    }
    ctx.fillStyle = '#0cf'; ctx.font = '9px Orbitron,Courier New'; ctx.textAlign = 'center';
    ctx.fillText('EM FIELD', ef.x, ef.y + 4); ctx.textAlign = 'left'; ctx.globalAlpha = 1; ctx.lineWidth = 1;
  }
  for (const bh of game.blackHoles) {
    const fadeA = Math.min(1, bh.timer / 60);
    ctx.save();
    ctx.globalAlpha = fadeA;
    // 外側の引力リング
    for (let ring = 3; ring >= 1; ring--) {
      const rr = bh.r * (0.6 + ring * 0.35);
      const ga = ctx.createRadialGradient(bh.x, bh.y, 0, bh.x, bh.y, rr);
      ga.addColorStop(0, 'rgba(0,0,0,0)');
      ga.addColorStop(0.6, 'rgba(80,0,120,0.12)');
      ga.addColorStop(1, 'rgba(120,0,200,0.0)');
      ctx.fillStyle = ga; ctx.beginPath(); ctx.arc(bh.x, bh.y, rr, 0, Math.PI * 2); ctx.fill();
    }
    // 渦巻き腕
    ctx.shadowColor = '#aa00ff'; ctx.shadowBlur = 18;
    for (let arm = 0; arm < 3; arm++) {
      const startA = bh.angle + arm * (Math.PI * 2 / 3);
      ctx.strokeStyle = `rgba(160,0,255,0.7)`; ctx.lineWidth = 2;
      ctx.beginPath();
      for (let t = 0; t < 60; t++) {
        const a = startA + t * 0.12, r2 = bh.r * 0.15 + t * (bh.r * 0.015);
        const px2 = bh.x + Math.cos(a) * r2, py2 = bh.y + Math.sin(a) * r2;
        t === 0 ? ctx.moveTo(px2, py2) : ctx.lineTo(px2, py2);
      }
      ctx.stroke();
    }
    // 中心暗黒核
    const gCore = ctx.createRadialGradient(bh.x, bh.y, 0, bh.x, bh.y, bh.r * 0.55);
    gCore.addColorStop(0, 'rgba(0,0,0,1)');
    gCore.addColorStop(0.7, 'rgba(40,0,80,0.9)');
    gCore.addColorStop(1, 'rgba(80,0,160,0)');
    ctx.fillStyle = gCore; ctx.beginPath(); ctx.arc(bh.x, bh.y, bh.r * 0.55, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#cc44ff'; ctx.font = '9px Orbitron,Courier New'; ctx.textAlign = 'center';
    ctx.fillText('BLACK HOLE', bh.x, bh.y + 4); ctx.textAlign = 'left';
    ctx.restore();
  }
}

// ===== ボスカットイン描画 =====
function drawBossCutin() {
  if (game.bossCutinTimer <= 0) return;
  const elapsed = (BOSS_CUTIN_DURATION - game.bossCutinTimer) / BOSS_CUTIN_DURATION;
  let oa = elapsed < 0.12 ? elapsed / 0.12 : elapsed > 0.8 ? (1 - elapsed) / (1 - 0.8) : 1;
  oa = Math.min(1, Math.max(0, oa));
  const theme = getTheme();
  ctx.fillStyle = `rgba(0,0,0,${oa * 0.84})`; ctx.fillRect(0, 0, W, H);
  if (elapsed > 0.1 && elapsed < 0.92) {
    const ta = elapsed < 0.16 ? (elapsed - 0.1) / 0.06 : elapsed > 0.82 ? (1 - elapsed) / (1 - 0.82) : 1;
    // スピードライン
    ctx.globalAlpha = ta * 0.38; ctx.strokeStyle = theme.accent; ctx.lineWidth = 1;
    for (let i = 0; i < 14; i++) {
      const ly = H / 2 - 85 + i * 13;
      const lp = Math.min(1, (elapsed - 0.1) / 0.14);
      ctx.beginPath(); ctx.moveTo(W / 2 - lp * W * 0.58, ly); ctx.lineTo(W / 2 + lp * W * 0.58, ly); ctx.stroke();
    }
    ctx.globalAlpha = ta;
    // WARNING
    ctx.fillStyle = '#f44'; ctx.font = 'bold 13px Orbitron,Courier New'; ctx.textAlign = 'center';
    ctx.shadowColor = '#f44'; ctx.shadowBlur = 8;
    ctx.fillText('!! BOSS APPROACHING !!', W / 2, H / 2 - 100); ctx.shadowBlur = 0;
    // ボス名（ズームイン）
    const zp = Math.min(1, (elapsed - 0.1) / 0.14);
    const fs = Math.floor(88 - zp * 36);
    ctx.font = `bold ${fs}px Orbitron,Courier New`;
    ctx.shadowColor = theme.accent; ctx.shadowBlur = 38; ctx.fillStyle = '#fff';
    ctx.fillText(game.boss ? BOSS_NAMES[game.boss.ability] || 'UNKNOWN' : ' ', W / 2, H / 2 + 12);
    ctx.shadowBlur = 0;
    // アビリティタグ
    if (game.boss) {
      ctx.fillStyle = theme.accent; ctx.font = 'bold 16px Orbitron,Courier New';
      ctx.shadowColor = theme.accent; ctx.shadowBlur = 14;
      ctx.fillText(`[ ${game.boss.ability.toUpperCase()} ]`, W / 2, H / 2 + 50); ctx.shadowBlur = 0;
    }
    // HPバープレビュー
    if (game.boss && elapsed > 0.28) {
      const ba = Math.min(1, (elapsed - 0.28) / 0.1) * ta;
      ctx.globalAlpha = ba;
      ctx.fillStyle = '#333'; ctx.fillRect(W / 2 - 150, H / 2 + 72, 300, 8);
      ctx.fillStyle = '#0f0'; ctx.shadowColor = '#0f0'; ctx.shadowBlur = 6;
      ctx.fillRect(W / 2 - 150, H / 2 + 72, 300, 8); ctx.shadowBlur = 0;
      ctx.fillStyle = '#aaa'; ctx.font = '10px Orbitron,Courier New';
      ctx.fillText(`HP  ${game.boss.maxHp}`, W / 2, H / 2 + 68);
    }
    ctx.globalAlpha = 1; ctx.textAlign = 'left';
  }
}

// ===== ステージ選択ヘルパー =====
function drawHexagon(ctx, x, y, r) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) { const a = Math.PI / 180 * (60 * i - 30); i === 0 ? ctx.moveTo(x + r * Math.cos(a), y + r * Math.sin(a)) : ctx.lineTo(x + r * Math.cos(a), y + r * Math.sin(a)); }
  ctx.closePath();
}
function _hexVertices(x, y, r) {
  const pts = [];
  for (let i = 0; i < 6; i++) {
    const a = Math.PI / 180 * (60 * i - 30);
    pts.push({ x: x + r * Math.cos(a), y: y + r * Math.sin(a) });
  }
  return pts;
}
function _raySegIntersect(ox, oy, dx, dy, ax, ay, bx, by) {
  // Ray: O + tD, t>=0. Segment: A + u(B-A), 0<=u<=1
  const vx = bx - ax, vy = by - ay;
  const det = dx * (-vy) - dy * (-vx); // det([D, A-B])
  if (Math.abs(det) < 1e-6) return null;
  const rx = ax - ox, ry = ay - oy;
  const t = (rx * (-vy) - ry * (-vx)) / det;
  const u = (dx * ry - dy * rx) / det;
  if (t >= 0 && u >= 0 && u <= 1) return { t, x: ox + dx * t, y: oy + dy * t };
  return null;
}
function hexBoundaryPoint(cx, cy, r, tx, ty) {
  const dx = tx - cx, dy = ty - cy;
  const len = Math.hypot(dx, dy);
  if (len < 1e-6) return { x: cx, y: cy };
  const ux = dx / len, uy = dy / len;
  const pts = _hexVertices(cx, cy, r);
  let best = null;
  for (let i = 0; i < 6; i++) {
    const a = pts[i], b = pts[(i + 1) % 6];
    const hit = _raySegIntersect(cx, cy, ux, uy, a.x, a.y, b.x, b.y);
    if (hit && (!best || hit.t < best.t)) best = hit;
  }
  return best ? { x: best.x, y: best.y } : { x: cx + ux * r, y: cy + uy * r };
}
function circleBoundaryPoint(cx, cy, r, tx, ty) {
  const dx = tx - cx, dy = ty - cy;
  const len = Math.hypot(dx, dy);
  if (len < 1e-6) return { x: cx, y: cy };
  const ux = dx / len, uy = dy / len;
  return { x: cx + ux * r, y: cy + uy * r };
}
function drawStar(ctx, x, y, pts, outerR, innerR) {
  ctx.beginPath();
  for (let i = 0; i < pts * 2; i++) { const r = i % 2 === 0 ? outerR : innerR, a = Math.PI / pts * i - Math.PI / 2; i === 0 ? ctx.moveTo(x + r * Math.cos(a), y + r * Math.sin(a)) : ctx.lineTo(x + r * Math.cos(a), y + r * Math.sin(a)); }
  ctx.closePath();
}

// ===== 背景テクスチャ（キャッシュ）=====
const _bgTexCache = new Map();
function _mulberry32(seed) {
  let t = seed >>> 0;
  return function () {
    t += 0x6D2B79F5;
    let x = t;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}
function getMarsPlanetTexture(d) {
  const key = `mars_${d}`;
  if (_bgTexCache.has(key)) return _bgTexCache.get(key);
  const c = document.createElement('canvas');
  c.width = d; c.height = d;
  const g = c.getContext('2d');
  const r = d / 2, cx = r, cy = r;
  const rand = _mulberry32(0x4d415253 ^ d); // "MARS"

  // ベース（陰影＋ターミネーター）
  const base = g.createRadialGradient(cx - r * 0.35, cy - r * 0.35, r * 0.08, cx, cy, r);
  base.addColorStop(0, 'rgba(255,170,130,1)');
  base.addColorStop(0.35, 'rgba(200,80,50,1)');
  base.addColorStop(0.75, 'rgba(90,25,18,1)');
  base.addColorStop(1, 'rgba(20,6,6,1)');
  g.fillStyle = base;
  g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.fill();

  // 砂嵐/雲っぽい薄層（ノイズストリーク）
  g.save();
  g.globalAlpha = 0.18;
  g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.clip();
  for (let i = 0; i < 120; i++) {
    const y = (rand() * 2 - 1) * r * 0.9;
    const h = 1 + rand() * 2.2;
    const x = -r + rand() * r * 0.6;
    const w = r * 2.2 * (0.4 + rand() * 0.8);
    g.fillStyle = `rgba(255,${80 + Math.floor(rand() * 70)},${40 + Math.floor(rand() * 40)},${0.12 + rand() * 0.18})`;
    g.fillRect(cx + x, cy + y, w, h);
  }
  g.restore();

  // 表面ディテール（微粒子）
  g.save();
  g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.clip();
  g.globalAlpha = 0.22;
  for (let i = 0; i < 850; i++) {
    const a = rand() * Math.PI * 2;
    const rr = Math.sqrt(rand()) * r * 0.98;
    const x = cx + Math.cos(a) * rr;
    const y = cy + Math.sin(a) * rr;
    const t = rand();
    g.fillStyle = t < 0.7 ? 'rgba(0,0,0,0.12)' : t < 0.9 ? 'rgba(255,220,190,0.10)' : 'rgba(140,40,25,0.12)';
    g.fillRect(x, y, 1, 1);
  }
  g.restore();

  // クレーター（影＋縁）
  g.save();
  g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.clip();
  for (let i = 0; i < 9; i++) {
    const a = rand() * Math.PI * 2;
    const rr = Math.sqrt(rand()) * r * 0.72;
    const x = cx + Math.cos(a) * rr;
    const y = cy + Math.sin(a) * rr;
    const cr = 4 + rand() * 10;
    g.globalAlpha = 0.35;
    g.fillStyle = 'rgba(0,0,0,0.35)';
    g.beginPath(); g.ellipse(x + cr * 0.18, y + cr * 0.18, cr * 1.05, cr * 0.85, rand() * 0.8, 0, Math.PI * 2); g.fill();
    g.globalAlpha = 0.40;
    g.strokeStyle = 'rgba(255,160,120,0.28)';
    g.lineWidth = 1.2;
    g.beginPath(); g.ellipse(x, y, cr, cr * 0.8, rand() * 0.8, 0, Math.PI * 2); g.stroke();
  }
  g.restore();

  // 大気リム（薄い赤い縁）
  const rim = g.createRadialGradient(cx, cy, r * 0.86, cx, cy, r * 1.02);
  rim.addColorStop(0, 'transparent');
  rim.addColorStop(0.65, 'rgba(255,120,90,0.20)');
  rim.addColorStop(1, 'transparent');
  g.fillStyle = rim;
  g.beginPath(); g.arc(cx, cy, r * 1.02, 0, Math.PI * 2); g.fill();

  _bgTexCache.set(key, c);
  return c;
}

function drawWorldBgObjects(worldNum) {
  ctx.save(); ctx.globalAlpha = 0.18;
  if (worldNum === 1) {
    // 火星: リアル寄り（陰影＋表面テクスチャ＋大気リム）
    const tex = getMarsPlanetTexture(256);
    const x = 388, y = 64, r = 92;
    ctx.save();
    ctx.globalAlpha = 0.22;
    ctx.translate(x, y);
    ctx.drawImage(tex, -r, -r, r * 2, r * 2);
    // ぼかしっぽい外側グロー
    const glow = ctx.createRadialGradient(0, 0, r * 0.8, 0, 0, r * 1.35);
    glow.addColorStop(0, 'rgba(255,100,70,0.12)');
    glow.addColorStop(1, 'transparent');
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(0, 0, r * 1.35, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  } else if (worldNum === 2) {
    // 金星: 黄色い厚い雲の惑星
    [{ x: 380, y: 70, r: 75, c: '#aa8800' }, { x: 25, y: 350, r: 50, c: '#887700' }, { x: 450, y: 400, r: 40, c: '#ccaa00' }].forEach(n => {
      const g = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r);
      g.addColorStop(0, n.c + 'cc'); g.addColorStop(0.5, n.c + '44'); g.addColorStop(1, 'transparent');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2); ctx.fill();
    });
  } else if (worldNum === 3) {
    // 木星: 縞模様の大惑星
    const jx = 390, jy = 65, jr = 72;
    const gj = ctx.createRadialGradient(jx, jy, 0, jx, jy, jr);
    gj.addColorStop(0, '#cc7733'); gj.addColorStop(1, '#442200');
    ctx.fillStyle = gj; ctx.beginPath(); ctx.arc(jx, jy, jr, 0, Math.PI * 2); ctx.fill();
    ctx.save(); ctx.clip();
    ctx.fillStyle = 'rgba(180,90,30,0.5)';
    [-20, -6, 8, 22].forEach(dy => ctx.fillRect(jx - jr, jy + dy, jr * 2, 5));
    ctx.restore();
  } else {
    // 土星: リング惑星
    const sx = 390, sy = 65, sr = 55;
    const gs = ctx.createRadialGradient(sx, sy, 0, sx, sy, sr);
    gs.addColorStop(0, '#ccbbaa'); gs.addColorStop(1, '#443322');
    ctx.fillStyle = gs; ctx.beginPath(); ctx.arc(sx, sy, sr, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#ccbbaa'; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.ellipse(sx, sy, sr * 2.2, sr * 0.45, -0.2, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = '#aa9977'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.ellipse(sx, sy, sr * 1.7, sr * 0.35, -0.2, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.restore();
}

// ===== ステージ選択画面 =====

/** 出撃準備レイアウト（UI_BUTTONS と drawCustomizeScreen で共有） */
function getCustomizeLayout() {
  const MX = 20, CW = W - MX * 2;
  const hH = 72;
  const eY = hH + 10;
  const eH = game.customizeEquipExpanded ? 158 : Math.round(158 * 0.7);
  const infoY = eY + eH + 14;
  const startH2 = 92;
  const startY2 = Math.min(492, H - startH2 - 10);
  const infoH = Math.max(120, startY2 - 4 - infoY);
  const bMX = MX + 10, bCW = CW - 20;
  const stageSelH = 40;
  const stageSelY = infoY + infoH - stageSelH - 8;
  const navTabY = 36, navTabH = 36, navTabW = W / 6;
  return { MX, CW, hH, eY, eH, infoY, infoH, startY2, startH2, bMX, bCW, stageSelY, stageSelH, navTabY, navTabH, navTabW };
}
function estimateSortieWinPct(ratioP, sortieOk) {
  const r = Number.isFinite(ratioP) ? ratioP : 0;
  if (!sortieOk) {
    const u = Math.max(0, Math.min(1, r / 0.72));
    return Math.round(10 + 24 * u);
  }
  if (r >= 1.35) return Math.min(97, Math.round(88 + (r - 1.35) * 20));
  if (r >= 1.15) return Math.round(70 + (Math.min(1, (r - 1.15) / 0.2)) * 22);
  if (r >= 0.92) return Math.round(46 + (Math.min(1, (r - 0.92) / 0.23)) * 24);
  return Math.round(30 + (Math.min(1, (r - 0.72) / 0.2)) * 16);
}
/** 正六角形パス（出撃ボタン用） */
function fillRoundHex(ctx, cx, cy, R) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = -Math.PI / 2 + i * (Math.PI / 3);
    const x = cx + R * Math.cos(a), y = cy + R * Math.sin(a);
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
}
/** モック風：四隅のシアンネオン短線（クリップ角の印象） */
function drawCustomizeNeonBrackets(ctx, x, y, w, h, r, len, col, alpha) {
  const L = Math.max(6, len | 0), rr = Math.max(4, r | 0);
  ctx.save();
  ctx.strokeStyle = col;
  ctx.globalAlpha = alpha;
  ctx.lineWidth = 1.2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x + rr, y); ctx.lineTo(x + rr + L, y);
  ctx.moveTo(x, y + rr); ctx.lineTo(x, y + rr + L);
  ctx.moveTo(x + w - rr, y); ctx.lineTo(x + w - rr - L, y);
  ctx.moveTo(x + w, y + rr); ctx.lineTo(x + w, y + rr + L);
  ctx.moveTo(x + rr, y + h); ctx.lineTo(x + rr + L, y + h);
  ctx.moveTo(x, y + h - rr); ctx.lineTo(x, y + h - rr - L);
  ctx.moveTo(x + w - rr, y + h); ctx.lineTo(x + w - rr - L, y + h);
  ctx.moveTo(x + w, y + h - rr); ctx.lineTo(x + w, y + h - rr + L);
  ctx.stroke();
  ctx.restore();
}
// ===== カスタマイズ画面 =====

// ===== ミッション一覧画面 =====

// ===== ロードアウト画面 =====
function drawPetShape(effect, color, rarity = 'N') {
  const s = 18;
  const rgb = (() => { try { return hexToRgb(color); } catch (e) { return null; } })();
  const rgba = (a) => rgb ? `rgba(${rgb},${a})` : color;
  const rar = String(rarity || 'N');
  const fx = (() => {
    if (rar === 'LR') return { rimA: 0.70, rimB: 16, strokeA: 0.26 };
    if (rar === 'SSR') return { rimA: 0.55, rimB: 12, strokeA: 0.22 };
    if (rar === 'SR') return { rimA: 0.40, rimB: 9, strokeA: 0.18 };
    if (rar === 'R') return { rimA: 0.28, rimB: 7, strokeA: 0.14 };
    return { rimA: 0.20, rimB: 6, strokeA: 0.12 };
  })();
  // Base gradient for all pets (avoid flat look)
  const baseFill = () => {
    const g = ctx.createLinearGradient(-s, -s, s, s);
    g.addColorStop(0, rgba(0.95));
    g.addColorStop(0.55, rgba(0.58));
    g.addColorStop(1, rgba(0.95));
    return g;
  };

  // Keep last drawn path for common outline/rim (except dragon which is custom)
  let didCommon = false;

  switch (effect) {
    case 'dragon':
      // ドラゴンっぽいシルエット（角/翼/胴/しっぽ）
      ctx.save();
      // Body (gradient)
      {
        const g = ctx.createLinearGradient(-s, -s, s, s);
        g.addColorStop(0, rgba(0.95));
        g.addColorStop(0.55, rgba(0.60));
        g.addColorStop(1, rgba(0.95));
        ctx.fillStyle = g;
      }
      ctx.beginPath();
      ctx.moveTo(-s * 0.25, -s * 0.05);
      ctx.quadraticCurveTo(0, -s * 0.55, s * 0.35, -s * 0.18); // head/neck
      ctx.quadraticCurveTo(s * 0.55, 0, s * 0.2, s * 0.22);     // chest
      ctx.quadraticCurveTo(0, s * 0.45, -s * 0.28, s * 0.22);   // belly
      ctx.quadraticCurveTo(-s * 0.62, s * 0.05, -s * 0.25, -s * 0.05); // back
      ctx.closePath(); ctx.fill();
      // Outline（レアほど少し強め）
      ctx.strokeStyle = `rgba(255,255,255,${fx.strokeA})`; ctx.lineWidth = 1.1;
      ctx.stroke();
      // Horns
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = 'rgba(255,240,220,0.85)';
      ctx.beginPath();
      ctx.moveTo(s * 0.28, -s * 0.25); ctx.lineTo(s * 0.44, -s * 0.58); ctx.lineTo(s * 0.18, -s * 0.33);
      ctx.closePath(); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(s * 0.18, -s * 0.20); ctx.lineTo(s * 0.28, -s * 0.52); ctx.lineTo(s * 0.06, -s * 0.28);
      ctx.closePath(); ctx.fill();
      // Wings
      ctx.globalAlpha = 0.75;
      {
        const wg = ctx.createLinearGradient(-s, -s * 0.8, -s * 0.2, s * 0.4);
        wg.addColorStop(0, rgba(0.9));
        wg.addColorStop(1, 'rgba(0,0,0,0.18)');
        ctx.fillStyle = wg;
      }
      ctx.beginPath();
      ctx.moveTo(-s * 0.05, -s * 0.02);
      ctx.lineTo(-s * 0.95, -s * 0.55);
      ctx.lineTo(-s * 0.55, s * 0.05);
      ctx.closePath(); ctx.fill();
      {
        const wg2 = ctx.createLinearGradient(s * 0.15, -s * 0.6, s, s * 0.2);
        wg2.addColorStop(0, rgba(0.9));
        wg2.addColorStop(1, 'rgba(0,0,0,0.18)');
        ctx.fillStyle = wg2;
      }
      ctx.beginPath();
      ctx.moveTo(s * 0.10, -s * 0.02);
      ctx.lineTo(s * 0.85, -s * 0.38);
      ctx.lineTo(s * 0.42, s * 0.04);
      ctx.closePath(); ctx.fill();
      // Tail flame
      ctx.globalAlpha = 0.85;
      ctx.fillStyle = 'rgba(255,140,40,0.95)';
      ctx.beginPath();
      ctx.moveTo(-s * 0.55, s * 0.10);
      ctx.lineTo(-s * 0.95, s * 0.28);
      ctx.lineTo(-s * 0.62, s * 0.30);
      ctx.closePath(); ctx.fill();
      // Eye
      ctx.globalAlpha = 0.95;
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.beginPath(); ctx.arc(s * 0.28, -s * 0.18, 2.2, 0, Math.PI * 2); ctx.fill();
      // Specular highlight
      ctx.globalAlpha = 0.22;
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.ellipse(s * 0.05, -s * 0.28, s * 0.25, s * 0.14, -0.35, 0, Math.PI * 2); ctx.fill();
      // Rarity rim glow（回転スパークルは不使用）
      ctx.globalAlpha = 1;
      ctx.shadowColor = rgba(fx.rimA);
      ctx.shadowBlur = fx.rimB;
      ctx.strokeStyle = rgba(0.45);
      ctx.lineWidth = 1.0;
      ctx.beginPath(); ctx.ellipse(0, 0, s * 1.05, s * 0.86, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.restore();
      break;
    case 'hawk':
      ctx.fillStyle = baseFill();
      ctx.beginPath(); ctx.moveTo(s, 0); ctx.lineTo(-s * 0.5, -s * 0.7); ctx.lineTo(-s * 0.25, 0); ctx.lineTo(-s * 0.5, s * 0.7); ctx.closePath(); ctx.fill();
      didCommon = true;
      ctx.globalAlpha = 0.38; ctx.fillStyle = '#99ccff';
      ctx.beginPath(); ctx.moveTo(-s * 0.1, -s * 0.15); ctx.lineTo(-s, -s * 0.7); ctx.lineTo(-s * 0.3, 0); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-s * 0.1, s * 0.15); ctx.lineTo(-s, s * 0.7); ctx.lineTo(-s * 0.3, 0); ctx.closePath(); ctx.fill();
      break;
    case 'heal':
      ctx.fillStyle = baseFill();
      ctx.beginPath(); ctx.ellipse(0, s * 0.1, s * 0.75, s, 0, 0, Math.PI * 2); ctx.fill();
      didCommon = true;
      ctx.globalAlpha = 0.45; ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.ellipse(-s * 0.22, -s * 0.3, s * 0.2, s * 0.18, 0, 0, Math.PI * 2); ctx.fill();
      break;
    case 'fairy':
      ctx.fillStyle = baseFill();
      for (let p = 0; p < 4; p++) {
        const a = p * Math.PI / 2;
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * s, Math.sin(a) * s); ctx.lineTo(Math.cos(a + Math.PI / 4) * s * 0.35, Math.sin(a + Math.PI / 4) * s * 0.35); ctx.closePath(); ctx.fill();
      }
      didCommon = true;
      break;
    case 'phoenix':
      ctx.save(); ctx.rotate(-Math.PI / 2);
      ctx.fillStyle = baseFill();
      ctx.beginPath(); ctx.moveTo(s, 0); ctx.lineTo(-s * 0.5, -s * 0.85); ctx.lineTo(-s * 0.3, 0); ctx.lineTo(-s * 0.5, s * 0.85); ctx.closePath(); ctx.fill();
      didCommon = true;
      ctx.globalAlpha = 0.5; ctx.fillStyle = '#ffdd00';
      ctx.beginPath(); ctx.arc(s * 0.3, 0, s * 0.32, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      break;
    case 'turtle':
      ctx.fillStyle = baseFill();
      ctx.beginPath(); ctx.ellipse(0, 0, s * 0.85, s * 0.7, 0, 0, Math.PI * 2); ctx.fill();
      didCommon = true;
      ctx.globalAlpha = 0.5; ctx.strokeStyle = '#006600'; ctx.lineWidth = 1.5;
      for (let h = 0; h < 6; h++) { const a = h * Math.PI / 3; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * s * 0.75, Math.sin(a) * s * 0.6); ctx.stroke(); }
      ctx.lineWidth = 1; ctx.globalAlpha = 0.9; ctx.fillStyle = '#88cc88';
      ctx.beginPath(); ctx.ellipse(-s * 0.35, -s * 0.5, s * 0.15, s * 0.25, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(s * 0.35, -s * 0.5, s * 0.15, s * 0.25, 0, 0, Math.PI * 2); ctx.fill();
      break;
    case 'bomber':
      ctx.fillStyle = baseFill();
      ctx.beginPath(); ctx.ellipse(0, 0, s * 0.55, s * 0.4, 0, 0, Math.PI * 2); ctx.fill();
      didCommon = true;
      ctx.globalAlpha = 0.55; ctx.fillStyle = '#111';
      ctx.fillRect(-s * 0.5, -s * 0.15, s * 0.32, s * 0.3); ctx.fillRect(-s * 0.08, -s * 0.15, s * 0.32, s * 0.3);
      ctx.globalAlpha = 0.85; ctx.fillStyle = 'rgba(255,255,80,0.9)';
      ctx.beginPath(); ctx.ellipse(0, -s * 0.52, s * 0.35, s * 0.22, -0.15, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(0, s * 0.52, s * 0.35, s * 0.22, 0.15, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 0.9; ctx.fillStyle = '#ff4400';
      ctx.beginPath(); ctx.arc(0, 0, s * 0.18, 0, Math.PI * 2); ctx.fill();
      break;
    case 'ghost':
      ctx.fillStyle = baseFill();
      ctx.globalAlpha *= 0.78;
      ctx.beginPath(); ctx.arc(0, -s * 0.1, s * 0.65, Math.PI, 0);
      ctx.lineTo(s * 0.65, s * 0.55);
      ctx.quadraticCurveTo(s * 0.42, s * 0.3, s * 0.22, s * 0.55);
      ctx.quadraticCurveTo(0, s * 0.3, -s * 0.22, s * 0.55);
      ctx.quadraticCurveTo(-s * 0.42, s * 0.3, -s * 0.65, s * 0.55);
      ctx.lineTo(-s * 0.65, s * 0.55); ctx.closePath(); ctx.fill();
      didCommon = true;
      ctx.globalAlpha = 0.9; ctx.fillStyle = '#111';
      ctx.beginPath(); ctx.ellipse(-s * 0.22, -s * 0.15, s * 0.13, s * 0.18, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(s * 0.22, -s * 0.15, s * 0.13, s * 0.18, 0, 0, Math.PI * 2); ctx.fill();
      break;
    case 'exp':
      ctx.fillStyle = baseFill();
      ctx.beginPath(); ctx.roundRect(-s * 0.7, -s * 0.7, s * 1.4, s * 1.4, 3); ctx.fill();
      didCommon = true;
      ctx.globalAlpha = 0.8; ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(-s * 0.28, -s * 0.22, s * 0.18, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(s * 0.28, -s * 0.22, s * 0.18, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 0.9; ctx.strokeStyle = color; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(0, -s * 0.7); ctx.lineTo(0, -s * 1.1); ctx.stroke();
      ctx.globalAlpha = 1; ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(0, -s * 1.1, s * 0.16, 0, Math.PI * 2); ctx.fill();
      break;
    default:// coin/cat
      ctx.fillStyle = baseFill();
      ctx.beginPath(); ctx.ellipse(0, s * 0.1, s * 0.75, s, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-s * 0.5, -s * 0.6); ctx.lineTo(-s * 0.8, -s * 1.1); ctx.lineTo(-s * 0.15, -s * 0.7); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(s * 0.5, -s * 0.6); ctx.lineTo(s * 0.8, -s * 1.1); ctx.lineTo(s * 0.15, -s * 0.7); ctx.closePath(); ctx.fill();
      didCommon = true;
      ctx.globalAlpha = 0.85; ctx.fillStyle = '#000';
      ctx.beginPath(); ctx.ellipse(-s * 0.28, -s * 0.1, s * 0.13, s * 0.2, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(s * 0.28, -s * 0.1, s * 0.13, s * 0.2, 0, 0, Math.PI * 2); ctx.fill();
      break;
  }
  // Common rarity outline + rim（回転スパークルは不使用）
  if (effect !== 'dragon') {
    ctx.globalAlpha = 1;
    if (didCommon) {
      ctx.strokeStyle = `rgba(255,255,255,${fx.strokeA})`; ctx.lineWidth = 1.05;
      ctx.stroke();
    }
    ctx.save();
    ctx.globalAlpha = 0.30 + fx.rimA * 0.25;
    ctx.shadowColor = rgba(fx.rimA);
    ctx.shadowBlur = fx.rimB;
    ctx.strokeStyle = rgba(0.45);
    ctx.lineWidth = 1.0;
    ctx.beginPath(); ctx.ellipse(0, 0, s * 1.02, s * 0.92, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }
  ctx.globalAlpha = 1;
}

function drawEquipShape(equip, color, rarity = null) {
  const s = 18;
  const id = (equip && equip.id) || '';
  const label = (equip && equip.label) || '';
  const slot = (equip && equip.slot) || '';
  const rgb = (() => { try { return hexToRgb(color); } catch (e) { return null; } })();
  const rgba = (a) => rgb ? `rgba(${rgb},${a})` : color;
  const rar = String(rarity || equip?.rarity || 'N');
  const fx = (() => {
    if (rar === 'LR') return { rimA: 0.70, rimB: 18, strokeA: 0.26 };
    if (rar === 'SSR') return { rimA: 0.55, rimB: 14, strokeA: 0.22 };
    if (rar === 'SR') return { rimA: 0.40, rimB: 10, strokeA: 0.18 };
    if (rar === 'R') return { rimA: 0.28, rimB: 8, strokeA: 0.14 };
    return { rimA: 0.20, rimB: 6, strokeA: 0.12 };
  })();
  const isShield = (id.includes('shield') || id.includes('def_shield') || id.includes('def_nano') || label.includes('シールド'));
  const isArmor = (slot === 'def' && (label.includes('アーマー') || label.includes('プレート') || id.includes('armor') || id.includes('plating')));
  const isBlade = (slot === 'atk' && (label.includes('ブレード') || label.includes('エッジ') || id.includes('blade') || id.includes('edge')));
  const isCore = (slot === 'atk' && (label.includes('コア') || id.includes('core')));
  const isEngine = (slot === 'sp' && (label.includes('エンジン') || label.includes('バーナー') || id.includes('engine') || id.includes('booster')));
  const isScope = (slot === 'sp' && (label.includes('スコープ') || id.includes('scope')));
  const isAmp = (slot === 'sp' && (label.includes('アンプ') || id.includes('amp')));
  // Base gradient fill for “less flat” look
  const baseFill = () => {
    const g = ctx.createLinearGradient(-s, -s, s, s);
    g.addColorStop(0, rgba(0.95));
    g.addColorStop(0.55, rgba(0.55));
    g.addColorStop(1, rgba(0.95));
    return g;
  };
  ctx.fillStyle = baseFill();
  if (isShield) {
    // Shield silhouette
    ctx.beginPath();
    ctx.moveTo(0, -s);
    ctx.lineTo(s * 0.72, -s * 0.55);
    ctx.quadraticCurveTo(s * 0.78, s * 0.25, 0, s);
    ctx.quadraticCurveTo(-s * 0.78, s * 0.25, -s * 0.72, -s * 0.55);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = `rgba(255,255,255,${fx.strokeA})`; ctx.lineWidth = 1.1; ctx.stroke();
    // Inner highlight
    ctx.globalAlpha = 0.30;
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.78);
    ctx.lineTo(s * 0.52, -s * 0.42);
    ctx.quadraticCurveTo(s * 0.52, s * 0.15, 0, s * 0.72);
    ctx.quadraticCurveTo(-s * 0.52, s * 0.15, -s * 0.52, -s * 0.42);
    ctx.closePath(); ctx.fill();
    ctx.globalAlpha = 1;
    // Center ridge
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(0, -s * 0.72); ctx.lineTo(0, s * 0.62); ctx.stroke();
  } else if (isArmor) {
    // Armor / plating: chest plate + bolts
    ctx.beginPath();
    ctx.moveTo(-s * 0.75, -s * 0.85);
    ctx.lineTo(s * 0.75, -s * 0.85);
    ctx.lineTo(s * 0.55, s * 0.65);
    ctx.quadraticCurveTo(0, s * 1.05, -s * 0.55, s * 0.65);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = `rgba(255,255,255,${fx.strokeA * 0.9})`; ctx.lineWidth = 1.05; ctx.stroke();
    // Inner bevel
    ctx.globalAlpha = 0.22; ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.moveTo(-s * 0.52, -s * 0.65);
    ctx.lineTo(s * 0.52, -s * 0.65);
    ctx.lineTo(s * 0.38, s * 0.45);
    ctx.quadraticCurveTo(0, s * 0.78, -s * 0.38, s * 0.45);
    ctx.closePath(); ctx.fill();
    ctx.globalAlpha = 1;
    // Bolts
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    for (const bx of [-s * 0.42, s * 0.42]) {
      ctx.beginPath(); ctx.arc(bx, -s * 0.62, 1.8, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(bx, s * 0.18, 1.8, 0, Math.PI * 2); ctx.fill();
    }
  } else if (isBlade) {
    // Blade: sword-ish
    ctx.beginPath();
    ctx.moveTo(0, -s);
    ctx.lineTo(s * 0.16, -s * 0.35);
    ctx.lineTo(s * 0.08, s * 0.55);
    ctx.lineTo(0, s * 0.85);
    ctx.lineTo(-s * 0.08, s * 0.55);
    ctx.lineTo(-s * 0.16, -s * 0.35);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = `rgba(255,255,255,${fx.strokeA * 0.85})`; ctx.lineWidth = 1.0; ctx.stroke();
    // Edge highlight
    ctx.globalAlpha = 0.28; ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.92);
    ctx.lineTo(s * 0.08, -s * 0.35);
    ctx.lineTo(0, s * 0.70);
    ctx.closePath(); ctx.fill();
    ctx.globalAlpha = 1;
    // Guard
    ctx.fillStyle = 'rgba(255,255,255,0.30)';
    ctx.beginPath(); ctx.roundRect(-s * 0.32, s * 0.45, s * 0.64, s * 0.12, 2); ctx.fill();
  } else if (isCore) {
    // Core: hex reactor with glow ring
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = Math.PI / 3 * i - Math.PI / 2;
      const x = Math.cos(a) * s * 0.72, y = Math.sin(a) * s * 0.72;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = `rgba(255,255,255,${fx.strokeA * 0.75})`; ctx.lineWidth = 1.0; ctx.stroke();
    // Ring
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.arc(0, 0, s * 0.42, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.65)';
    ctx.beginPath(); ctx.arc(0, 0, 2.2, 0, Math.PI * 2); ctx.fill();
  } else if (isScope) {
    // Scope: reticle
    ctx.beginPath(); ctx.arc(0, 0, s * 0.72, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = `rgba(255,255,255,${fx.strokeA * 0.85})`; ctx.lineWidth = 1.0; ctx.stroke();
    ctx.globalAlpha = 0.28; ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(0, 0, s * 0.50, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(-s * 0.75, 0); ctx.lineTo(s * 0.75, 0); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, -s * 0.75); ctx.lineTo(0, s * 0.75); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, 2.2, 0, Math.PI * 2); ctx.stroke();
  } else if (isAmp) {
    // Amp: signal bars
    const bars = [
      { x: -s * 0.55, h: s * 0.45 },
      { x: -s * 0.20, h: s * 0.65 },
      { x: s * 0.15, h: s * 0.85 },
      { x: s * 0.50, h: s * 0.55 },
    ];
    for (const b of bars) {
      ctx.beginPath(); ctx.roundRect(b.x, -b.h / 2, s * 0.18, b.h, 3); ctx.fill();
    }
    ctx.strokeStyle = `rgba(255,255,255,${fx.strokeA * 0.8})`; ctx.lineWidth = 1.0;
    ctx.beginPath(); ctx.roundRect(-s * 0.72, -s * 0.72, s * 1.44, s * 1.44, 6); ctx.stroke();
    ctx.globalAlpha = 0.25; ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.roundRect(-s * 0.68, -s * 0.68, s * 1.36, s * 1.36, 6); ctx.fill();
    ctx.globalAlpha = 1;
  } else if (isEngine) {
    // Engine: nozzle + flame
    ctx.beginPath();
    ctx.moveTo(-s * 0.55, -s * 0.55);
    ctx.lineTo(s * 0.25, -s * 0.55);
    ctx.lineTo(s * 0.70, 0);
    ctx.lineTo(s * 0.25, s * 0.55);
    ctx.lineTo(-s * 0.55, s * 0.55);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = `rgba(255,255,255,${fx.strokeA * 0.9})`; ctx.lineWidth = 1.0; ctx.stroke();
    // Inner
    ctx.globalAlpha = 0.25; ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.roundRect(-s * 0.45, -s * 0.38, s * 0.70, s * 0.76, 5); ctx.fill();
    ctx.globalAlpha = 1;
    // Flame
    ctx.fillStyle = 'rgba(255,140,40,0.95)';
    ctx.beginPath();
    ctx.moveTo(s * 0.75, 0);
    ctx.lineTo(s * 1.05, -s * 0.22);
    ctx.lineTo(s * 0.95, 0);
    ctx.lineTo(s * 1.05, s * 0.22);
    ctx.closePath(); ctx.fill();
  } else {
    // Default equip gem
    ctx.beginPath(); ctx.moveTo(0, -s * 0.9); ctx.lineTo(s * 0.7, 0); ctx.lineTo(0, s * 0.9); ctx.lineTo(-s * 0.7, 0); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = `rgba(255,255,255,${fx.strokeA * 0.85})`; ctx.lineWidth = 1.0; ctx.stroke();
    ctx.globalAlpha = 0.25; ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.moveTo(0, -s * 0.9); ctx.lineTo(s * 0.7, 0); ctx.lineTo(0, -s * 0.25); ctx.closePath(); ctx.fill();
    ctx.globalAlpha = 1;
  }
  // Outer glow rim（レアほど強く）
  ctx.save();
  ctx.globalAlpha = 0.35 + fx.rimA * 0.25;
  ctx.shadowColor = rgba(fx.rimA);
  ctx.shadowBlur = fx.rimB;
  ctx.strokeStyle = rgba(0.55);
  ctx.lineWidth = 1.0;
  ctx.beginPath(); ctx.arc(0, 0, s * 0.92, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();

}

function drawLoadoutPreview(px, py, pw, ph, item) {
  const cx = px + pw / 2;
  const rc = RARITY_COLORS[item.rarity] || item.color || '#aaa';

  // Top rarity strip
  ctx.save(); ctx.globalAlpha = 0.18; ctx.fillStyle = rc;
  ctx.beginPath(); ctx.roundRect(px + 1, py + 1, pw - 2, 52, 8); ctx.fill(); ctx.restore();
  ctx.fillStyle = rc; ctx.fillRect(px + 1, py + 1, pw - 2, 3);

  ctx.fillStyle = rc; ctx.shadowColor = rc; ctx.shadowBlur = 6;
  ctx.font = 'bold 12px Orbitron,Courier New'; ctx.textAlign = 'left';
  ctx.fillText(`[${item.rarity}]`, px + 12, py + 26); ctx.shadowBlur = 0;
  ctx.fillStyle = '#445'; ctx.font = '10px Orbitron,Courier New'; ctx.textAlign = 'right';
  ctx.fillText(item.type.toUpperCase(), px + pw - 12, py + 26);

  let equipped = false;
  if (game.loadoutTab === 0) equipped = game.playerLoadout.charId === item.id || (item.id === 'char_basic' && !game.playerLoadout.charId);
  else if (game.loadoutTab === 1) equipped = game.playerLoadout.equip.includes(item.id);
  else if (game.loadoutTab === 2) equipped = game.playerLoadout.pets.includes(item.id);
  else equipped = game.playerLoadout.weaponId === item.id || (item.id === null && !game.playerLoadout.weaponId);
  // 装備中表示は右グリッド側に統一（左プレビューの重複を避ける）

  // ────────────────────────────────────────────────
  // キャラ詳細: レイアウトを4ブロックで再構成（スマホ視認性優先）
  // ①ヘッダー(アイコン/名前/効果) ②メインステ(HP/ATK/DEF) ③サブ情報(Lv/EXP/SPD) ④アクション(別UIボタン)
  // ────────────────────────────────────────────────
  if (game.loadoutTab === 0) {
    const PAD = 16;
    const SECTION_GAP = 24;
    const ROW_GAP = 14;
    const left = px + PAD, right = px + pw - PAD, w = right - left;

    // ① ヘッダー
    const headerTop = py + 60;
    const iconCY = headerTop + 54;
    ctx.save(); ctx.translate(cx, iconCY);
    ctx.shadowColor = rc; ctx.shadowBlur = 22;
    ctx.fillStyle = rc;
    drawShipShape(-34, -20, 68, 40, pickCharShipShape(item), item.color || rc, item.rarity);
    const fl = 5 + Math.sin(game.frameCount * 0.2) * 3;
    ctx.globalAlpha = 0.75; ctx.fillStyle = '#f60'; ctx.fillRect(-12, 22, 10, fl);
    ctx.fillStyle = '#ff0'; ctx.fillRect(-11, 22, 8, fl * 0.5);
    ctx.globalAlpha = 1; ctx.shadowBlur = 0; ctx.restore();

    // 名前の横にLv表示（装備と同様のルール）
    const inv = game.gachaInventory?.[item.id];
    const lv = inv ? (inv.level || 1) : 1;
    ctx.fillStyle = '#ffffff'; ctx.font = 'bold 20px Orbitron,Courier New'; ctx.textAlign = 'center';
    ctx.shadowColor = rc; ctx.shadowBlur = 10;
    ctx.fillText(`${item.label}  Lv${lv}`, cx, headerTop + 118); ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(200,220,255,0.68)'; ctx.font = '12px Orbitron,Courier New';
    ctx.fillText(item.desc || '', cx, headerTop + 140);

    // セクション区切り
    let y = headerTop + 140 + SECTION_GAP;
    ctx.strokeStyle = 'rgba(30,40,80,0.7)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(left, y); ctx.lineTo(right, y); ctx.stroke();
    y += SECTION_GAP;

    // ② ステータス（現在）
    ctx.fillStyle = 'rgba(255,255,255,0.90)';
    ctx.font = 'bold 13px Orbitron,Courier New';
    ctx.textAlign = 'left';
    ctx.fillText('ステータス', left, y + 2);
    y += 18;

    // メインステータス（HP/ATK/DEF）
    const hpVal = Math.round(item.hp || 0);
    const atkPct = Math.round(((item.atk || 1) - 1) * 100);
    const defVal = Math.round(item.def || 0);
    const mainStats = [
      // 表示形式を統一：ラベル左 / バー中央 / 数値右
      { l: 'HP', v: hpVal, max: 200, c: '#00ff88', r: `${hpVal}` },
      { l: 'ATK', v: atkPct, max: 60, c: '#ff8844', r: `${atkPct >= 0 ? '+' : ''}${atkPct}%` },
      { l: 'DEF', v: defVal, max: 50, c: '#44aaff', r: `${defVal}%` },
    ];
    const barH = 8;
    const rowH = 34;
    mainStats.forEach((s, i) => {
      const ry = y + i * (rowH + ROW_GAP);
      // label/value aligned
      ctx.fillStyle = 'rgba(225,240,255,0.70)'; ctx.font = 'bold 12px Orbitron,Courier New'; ctx.textAlign = 'left';
      ctx.fillText(s.l, left, ry + 12);
      ctx.fillStyle = s.c; ctx.textAlign = 'right';
      ctx.fillText(s.r, right, ry + 12);
      // 強化直後は増えた分だけを+で強調表示
      try {
        const f = game.lastUpgradeFlash;
        const dt = game.frameCount - (f?.frame || 0);
        if (f && f.id === item.id && dt >= 0 && dt < 90) {
          const ent = f.lines.find(x => x.l === s.l);
          if (ent) {
            const pulse = 0.6 + 0.4 * Math.sin(dt * 0.25);
            ctx.fillStyle = 'rgba(0,255,140,0.85)';
            ctx.shadowColor = 'rgba(0,255,140,0.9)'; ctx.shadowBlur = 10 * pulse;
            ctx.font = 'bold 11px Orbitron,Courier New'; ctx.textAlign = 'right';
            ctx.fillText(ent.d, right, ry + 26);
            ctx.shadowBlur = 0;
          }
        }
      } catch (e) { }
      // bar
      const by = ry + 18;
      ctx.fillStyle = 'rgba(6,8,18,0.95)';
      ctx.beginPath(); ctx.roundRect(left, by, w, barH, 4); ctx.fill();
      const ratio = Math.min(1, Math.max(0, (s.v || 0) / Math.max(1, s.max)));
      const fillW = Math.max(6, w * ratio);
      const g = ctx.createLinearGradient(left, 0, left + w, 0);
      g.addColorStop(0, s.c + '55'); g.addColorStop(1, s.c);
      ctx.fillStyle = g; ctx.shadowColor = s.c; ctx.shadowBlur = 4;
      ctx.beginPath(); ctx.roundRect(left, by, fillW, barH, 4); ctx.fill(); ctx.shadowBlur = 0;
    });
    // ATKの視認性補助（倍率を小さく添える）
    ctx.fillStyle = 'rgba(200,220,255,0.40)'; ctx.font = '10px Orbitron,Courier New'; ctx.textAlign = 'right';
    ctx.fillText(`×${(item.atk || 1).toFixed(1)}`, right, y + 1 * (rowH + ROW_GAP) + 12 + 16);
    y += mainStats.length * (rowH + ROW_GAP) + 16; // DEF→Lvの間隔を最低16px確保

    // 区切り
    ctx.strokeStyle = 'rgba(60,90,150,0.55)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(left, y); ctx.lineTo(right, y); ctx.stroke();
    y += 16;

    // ③ サブ情報（Lvだけ）は廃止（名前横に統合）
    return;
  }

  // Icon area
  // 装備タブは全体を少し上に寄せて、画像〜追加効果〜比較までの間延びを解消
  const equipLift = (game.loadoutTab === 1 ? -12 : 0);
  const iconCY = py + 130 + equipLift;
  ctx.save(); ctx.translate(cx, iconCY);
  ctx.shadowColor = rc; ctx.shadowBlur = 22;
  if (game.loadoutTab === 0) {
    ctx.fillStyle = rc;
    drawShipShape(-28, -18, 56, 34, pickCharShipShape(item), item.color || rc, item.rarity);
    const fl = 4 + Math.sin(game.frameCount * 0.2) * 3;
    ctx.globalAlpha = 0.7; ctx.fillStyle = '#f60'; ctx.fillRect(-10, 16, 8, fl);
    ctx.fillStyle = '#ff0'; ctx.fillRect(-9, 16, 6, fl * 0.5);
    ctx.globalAlpha = 0.18 + Math.sin(game.frameCount * 0.04) * 0.08;
    ctx.strokeStyle = rc; ctx.lineWidth = 1; ctx.setLineDash([4, 5]);
    ctx.beginPath(); ctx.ellipse(0, 0, 48, 27, 0, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
  } else if (game.loadoutTab === 1) {
    const s = 28 + Math.sin(game.frameCount * 0.08) * 3;
    ctx.save();
    ctx.scale(s / 15, s / 15);
    drawEquipShape(item, rc, item.rarity);
    ctx.restore();
  } else if (game.loadoutTab === 2) {
    ctx.save();
    ctx.scale(1.12, 1.12);
    drawPetShape(item.effect, rc, item.rarity);
    ctx.restore();
  } else {
    ctx.fillStyle = rc;
    const wt = item.weapon || 'normal';
    if (wt === 'laser') {
      ctx.fillRect(-4, -28, 8, 38);
      ctx.globalAlpha = 0.35; ctx.fillRect(-12, -22, 24, 5);
    } else if (wt === 'homing') {
      ctx.beginPath(); ctx.moveTo(0, -28); ctx.lineTo(10, 10); ctx.lineTo(0, 4); ctx.lineTo(-10, 10); ctx.closePath(); ctx.fill();
      ctx.globalAlpha = 0.5; ctx.fillStyle = '#f80';
      ctx.beginPath(); ctx.moveTo(-12, 14); ctx.lineTo(12, 14); ctx.lineTo(0, 30); ctx.closePath(); ctx.fill();
    } else if (wt === 'explosive') {
      ctx.beginPath(); ctx.arc(0, 0, 20, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 0.45; ctx.strokeStyle = '#f44'; ctx.lineWidth = 3;
      for (let e = 0; e < 6; e++) {
        const a = e * Math.PI / 3 + game.frameCount * 0.025;
        ctx.beginPath(); ctx.moveTo(Math.cos(a) * 22, Math.sin(a) * 22); ctx.lineTo(Math.cos(a) * 34, Math.sin(a) * 34); ctx.stroke();
      }
    } else {
      for (let b = -1; b <= 1; b++) {
        ctx.beginPath(); ctx.roundRect(b * 14 - 3, -20, 6, 28, 3); ctx.fill();
      }
    }
  }
  ctx.globalAlpha = 1; ctx.shadowBlur = 0; ctx.restore();

  ctx.shadowColor = rc; ctx.shadowBlur = 10;
  ctx.fillStyle = '#fff'; ctx.font = 'bold 17px Orbitron,Courier New'; ctx.textAlign = 'center';
  // 装備以外（ペット/武器）は 名前の横にLv表示
  if (game.loadoutTab !== 1) {
    const inv = game.gachaInventory?.[item.id];
    const lv = inv ? (inv.level || 1) : 1;
    ctx.shadowColor = rc; ctx.shadowBlur = 10;
    ctx.fillStyle = '#fff'; ctx.font = 'bold 17px Orbitron,Courier New'; ctx.textAlign = 'center';
    ctx.fillText(`${item.label}  Lv${lv}`, cx, py + 186 + equipLift);
  }
  // 装備は名前表示のルールが別（装備中表示の移設など）
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#999'; ctx.font = '11px Orbitron,Courier New';
  ctx.fillText(item.desc, cx, py + 205 + equipLift);

  // ユーザー要望: 「下に残ってる 装備名+Lv」を、上（タイトル位置）へ移動
  if (game.loadoutTab === 1) {
    try {
      const slotMap = { atk: 0, def: 1, sp: 2 };
      const slotIdx = slotMap[item.slot] ?? 0;
      const curId = Array.isArray(game.playerLoadout?.equip) ? game.playerLoadout.equip[slotIdx] : null;
      const curEq = curId ? EQUIP_POOL.find(e => e.id === curId) : null;
      const curInv = curId ? game.gachaInventory?.[curId] : null;
      if (curEq && curInv) {
        const name = (curEq.label || '').length > 14 ? (curEq.label || '').slice(0, 13) + '…' : (curEq.label || '');
        const crc = RARITY_COLORS[curEq.rarity] || curEq.color || '#aaa';
        ctx.fillStyle = crc; ctx.font = 'bold 14px Orbitron,Courier New'; ctx.textAlign = 'center';
        ctx.shadowColor = crc; ctx.shadowBlur = 8;
        ctx.fillText(`${name}  Lv${curInv.level || 1}`, cx, py + 186 + equipLift);
        ctx.shadowBlur = 0;
      }
    } catch (e) { }
  }

  // Divider
  const divY = py + 218 + equipLift;
  ctx.strokeStyle = '#1a2040'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(px + 16, divY); ctx.lineTo(px + pw - 16, divY); ctx.stroke();

  // Stats
  const sY = divY + 14, bx = px + 14, bw = pw - 28;
  if (game.loadoutTab === 0 && item.hp) {
    const stats = [
      { l: 'HP', v: item.hp, max: 150, c: '#00ff88', d: `${item.hp}` },
      { l: 'ATK', v: (item.atk - 1) * 100, max: 50, c: '#ff8844', d: `×${item.atk.toFixed(1)}` },
      { l: 'DEF', v: item.def, max: 50, c: '#44aaff', d: `${item.def}%` },
      { l: 'CRIT', v: item.crit, max: 40, c: '#ffdd00', d: `${item.crit}%` },
      { l: 'SPD', v: item.spd, max: 5, c: '#88ffcc', d: `+${item.spd}` },
    ];
    stats.forEach((s, i) => {
      const by = sY + i * 38;
      ctx.fillStyle = '#aaa'; ctx.font = '11px Orbitron,Courier New'; ctx.textAlign = 'left'; ctx.fillText(s.l, bx, by + 12);
      ctx.fillStyle = s.c; ctx.textAlign = 'right'; ctx.fillText(s.d, bx + bw, by + 12);
      ctx.fillStyle = '#141622'; ctx.beginPath(); ctx.roundRect(bx, by + 16, bw, 7, 3); ctx.fill();
      if (s.v > 0) { ctx.fillStyle = s.c; ctx.shadowColor = s.c; ctx.shadowBlur = 4; ctx.beginPath(); ctx.roundRect(bx, by + 16, bw * Math.min(1, s.v / s.max), 7, 3); ctx.fill(); ctx.shadowBlur = 0; }
    });
  } else if (game.loadoutTab === 1) {
    // ユーザー要望: 追加効果は非表示（装備時の比較だけに絞る）
    // 左パネルの役割統一: 基本は「現在の効果」。選択が装備中と異なる時だけ比較を表示。
    try {
      const slotMap = { atk: 0, def: 1, sp: 2 };
      const slotIdx = slotMap[item.slot] ?? 0;
      const curEquip = Array.isArray(game.playerLoadout?.equip) ? game.playerLoadout.equip.slice() : [null, null, null];
      const curId = curEquip[slotIdx] || null;
      const actionTop = py + ph - 82;
      const maxY = actionTop - 14;

      // ── セクションテンプレ（キャラと完全一致） ──
      const PAD = 16;
      const SECTION_GAP = 24;
      const left = px + PAD, right = px + pw - PAD;

      // セクション区切り線（位置/色/太さをキャラと一致させる）
      let ySec = divY + SECTION_GAP;
      ctx.strokeStyle = 'rgba(30,40,80,0.7)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(left, ySec); ctx.lineTo(right, ySec); ctx.stroke();
      ySec += SECTION_GAP;

      // 1=B,2=A 解釈: 装備タブは「比較」を基本表示にする（同一なら「変化なし」）
      const showCompare = true;

      // --- section title (統一) ---
      ctx.fillStyle = 'rgba(255,255,255,0.90)';
      ctx.font = 'bold 13px Orbitron,Courier New';
      ctx.textAlign = 'left';
      ctx.fillText('効果', left, ySec + 2);
      ctx.fillStyle = 'rgba(200,220,255,0.40)'; ctx.font = '11px Orbitron,Courier New';
      ctx.fillText('比較', left + 54, ySec + 2);
      ySec += 18;

      const charId = game.playerLoadout?.charId || null;
      const nextEquip = curEquip.slice();
      nextEquip[slotIdx] = item.id;
      const curS = computeTotalStatsForLoadout(charId, curEquip);
      const nextS = computeTotalStatsForLoadout(charId, nextEquip);

      const rows = [
        { l: 'HP', b: curS.hp, a: nextS.hp, fmt: (v) => `${v}` },
        { l: 'ATK', b: curS.atk, a: nextS.atk, fmt: (v) => `${v.toFixed(1)}` },
        { l: 'DEF', b: curS.def, a: nextS.def, fmt: (v) => `${v}%` },
        { l: 'CRIT', b: curS.crit, a: nextS.crit, fmt: (v) => `${v}%` },
        { l: 'SPD', b: curS.spd, a: nextS.spd, fmt: (v) => `${v}` },
      ];

      const y0 = ySec + 8;
      const colW = right - left;
      // 縦リスト（横並びをやめる）
      // 5行が必ず収まるように、行間は空き高さから自動調整
      const availH = Math.max(0, maxY - y0);
      const listLineH = Math.max(18, Math.min(26, Math.floor(availH / Math.max(1, rows.length))));

      const drawCompareRow = (r, x, y) => {
        const d = r.a - r.b;
        const nz = (r.l === 'ATK') ? Math.abs(d) > 1e-6 : (d !== 0);
        if (!nz) return false; // 変化なしは非表示

        const labelX = x;
        const beforeX = x + 46;

        // label (white)
        ctx.fillStyle = 'rgba(255,255,255,0.92)';
        ctx.font = 'bold 11px Orbitron,Courier New';
        ctx.textAlign = 'left';
        ctx.fillText(r.l, labelX, y);

        // before → after（数値変化を優先して見せる）
        ctx.fillStyle = 'rgba(200,220,255,0.78)';
        ctx.font = '11px Orbitron,Courier New';
        const baseTxt = `${r.fmt(r.b)} → ${r.fmt(r.a)}`;
        ctx.fillText(baseTxt, beforeX, y);

        // delta（数値の近くに配置 / 実数差分を優先）
        let deltaTxt = '';
        if (r.l === 'DEF' || r.l === 'CRIT') {
          deltaTxt = `${d > 0 ? '+' : ''}${d}%`;
        } else if (r.l === 'ATK') {
          // %より実数変化を優先
          deltaTxt = `${d > 0 ? '+' : ''}${d.toFixed(1)}`;
        } else {
          deltaTxt = `${d > 0 ? '+' : ''}${d}`;
        }
        const up = d > 0;
        const col = up ? 'rgba(120,255,190,0.98)' : 'rgba(255,120,120,0.92)';
        const baseW = ctx.measureText(baseTxt).width;
        ctx.fillStyle = col;
        ctx.shadowColor = col;
        ctx.shadowBlur = 6;
        ctx.font = 'bold 13px Orbitron,Courier New'; // 差分は太字で強調
        ctx.textAlign = 'left';
        ctx.fillText(`  ${deltaTxt}`, beforeX + baseW + 4, y);
        ctx.shadowBlur = 0;
        return true;
      };

      let yList = y0;
      let shown = 0;
      for (const r of rows) {
        if (yList > maxY + 1) break;
        const drew = drawCompareRow(r, left, yList);
        if (drew) {
          yList += listLineH;
          shown++;
        }
      }
      if (shown === 0) {
        ctx.fillStyle = 'rgba(200,220,255,0.40)'; ctx.font = '11px Orbitron,Courier New'; ctx.textAlign = 'left';
        ctx.fillText('変化なし', left, y0);
      }
      ctx.textAlign = 'left';
    } catch (e) { }
  } else if (game.loadoutTab === 2) {
    // ---- ペット詳細（可読性改善）----
    // 色ルール: スキル=明るい / 説明=グレー / ラベル=中間色
    const skillMap = {
      dragon: { skill: '3秒毎 炎弾発射', desc: '5秒毎に火球を発射' },
      hawk: { skill: '3秒毎 追尾弾', desc: '3秒毎にホーミング発射' },
      heal: { skill: '被弾時 HP+15', desc: '被弾時に回復' },
      fairy: { skill: 'コイン+20%', desc: 'コイン獲得量UP' },
      exp: { skill: 'EXP+15%', desc: '経験値獲得量UP' },
      phoenix: { skill: 'HP30%以下 無敵', desc: 'ピンチで一時無敵' },
      coin: { skill: 'コイン引き寄せ', desc: 'コインを自動吸引' },
      turtle: { skill: '被ダメ-15%', desc: '被ダメージ軽減' },
      bomber: { skill: '8秒毎 爆弾投下', desc: '周期的に爆弾' },
      ghost: { skill: '10秒毎 無敵1秒', desc: '短時間無敵' },
    };
    const sd = skillMap[item.effect] || { skill: item.desc || 'スキル', desc: '' };

    const SEC_GAP = 18;
    let yy = sY + 14;

    // 1) 主役（スキル）
    ctx.fillStyle = rc; ctx.shadowColor = rc; ctx.shadowBlur = 12;
    ctx.font = 'bold 18px Orbitron,Courier New'; ctx.textAlign = 'center';
    ctx.fillText(sd.skill, cx, yy + 18); ctx.shadowBlur = 0;

    // 2) 説明（弱化）
    if (sd.desc) {
      ctx.fillStyle = 'rgba(200,220,255,0.40)'; ctx.font = '11px Orbitron,Courier New';
      ctx.fillText(sd.desc, cx, yy + 40);
    }
    yy += 48 + SEC_GAP;

    // Divider
    ctx.strokeStyle = 'rgba(60,90,150,0.45)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(px + 18, yy); ctx.lineTo(px + pw - 18, yy); ctx.stroke();
    yy += SEC_GAP;

    // 3) ペットスロット（タイトル強化＋上余白）
    ctx.fillStyle = 'rgba(225,240,255,0.60)'; ctx.font = 'bold 12px Orbitron,Courier New'; ctx.textAlign = 'center';
    ctx.fillText('ペットスロット', cx, yy - 6);
    yy += 10;
    const maxSlots = game.stage >= 10 ? 3 : game.stage >= 5 ? 2 : 1;
    for (let s = 0; s < 3; s++) {
      const pid = game.playerLoadout.pets[s];
      const locked = s >= maxSlots;
      const scx = cx + (s - 1) * 62, scy = yy + 28;
      const isSel = pid === item.id;
      ctx.fillStyle = locked ? 'rgba(8,8,16,0.8)' : 'rgba(10,12,26,0.95)';
      ctx.strokeStyle = locked ? 'rgba(90,110,160,0.25)' : isSel ? '#00ff88' : pid ? 'rgba(200,120,255,0.7)' : 'rgba(90,110,160,0.35)';
      ctx.lineWidth = isSel ? 2.0 : 1.4;
      ctx.shadowColor = isSel ? '#00ff88' : pid ? 'rgba(200,120,255,0.8)' : 'transparent'; ctx.shadowBlur = (!locked && (isSel || pid)) ? 10 : 0;
      ctx.beginPath(); ctx.arc(scx, scy, 22, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;
      if (locked) {
        ctx.fillStyle = 'rgba(200,220,255,0.22)'; ctx.font = 'bold 9px Orbitron,Courier New'; ctx.textAlign = 'center'; ctx.fillText('LOCK', scx, scy + 4);
      } else if (pid) {
        const pet = PET_POOL.find(p => p.id === pid);
        if (pet) { ctx.save(); ctx.translate(scx, scy); ctx.scale(0.72, 0.72); drawPetShape(pet.effect, pet.color, pet.rarity); ctx.restore(); }
      } else {
        ctx.fillStyle = 'rgba(200,220,255,0.22)'; ctx.font = 'bold 18px monospace'; ctx.textAlign = 'center'; ctx.fillText('+', scx, scy + 7);
      }
      ctx.fillStyle = locked ? 'rgba(200,220,255,0.18)' : 'rgba(200,220,255,0.28)'; ctx.font = '9px Orbitron,Courier New'; ctx.textAlign = 'center';
      ctx.fillText(locked ? 'LOCK' : `SLOT ${s + 1}`, scx, scy + 36);
    }

    // 強化情報は「強化モード」時だけ表示（ノイズ削減）
  } else {
    const wDescs = { normal: '通常弾 弾数無制限', laser: '貫通レーザー', homing: '自動追尾ミサイル', explosive: '爆発弾 範囲ダメージ' };
    ctx.fillStyle = '#aaa'; ctx.font = '12px Orbitron,Courier New'; ctx.textAlign = 'center';
    ctx.fillText(wDescs[item.weapon || 'normal'] || item.desc, cx, sY + 18);
    if (item.ammo) {
      ctx.shadowColor = rc; ctx.shadowBlur = 10;
      ctx.fillStyle = rc; ctx.font = 'bold 36px Orbitron,Courier New'; ctx.textAlign = 'center';
      ctx.fillText(`×${item.ammo}`, cx, sY + 62); ctx.shadowBlur = 0;
      ctx.fillStyle = '#556'; ctx.font = '12px Orbitron,Courier New'; ctx.fillText('弾数', cx, sY + 82);
    } else {
      ctx.shadowColor = '#0f0'; ctx.shadowBlur = 8;
      ctx.fillStyle = '#0f0'; ctx.font = 'bold 18px Orbitron,Courier New'; ctx.textAlign = 'center';
      ctx.fillText('無制限  ∞', cx, sY + 60); ctx.shadowBlur = 0;
    }
  }

  // Level-up section (skip for CLASSIC weapon)
  if (item.id !== null) {
    const inv = game.gachaInventory[item.id];
    const lv = inv ? inv.level || 1 : 1;
    const cost = item.id ? getLevelUpCost(item) : null;
    // ペット強化は素材ベースでEXP概念がないため、EXPバーは削除してLvだけ小さく表示
    const lvY = py + ph - 156; // 強化内容表示の基準（バーは描かない）
    if (game.loadoutTab === 2) {
      // ペットLv表示は名前横に統合（下部Lv表示は出さない）
    } else {
      // ユーザー要望: 装備はLvを名前横だけにする（下部のLv表示は出さない）
      if (game.loadoutTab !== 1) {
        ctx.fillStyle = 'rgba(200,220,255,0.38)';
        ctx.font = 'bold 11px Orbitron,Courier New';
        ctx.textAlign = 'left';
        ctx.fillText(`Lv.${lv}`, px + 18, py + ph - 168);
        ctx.textAlign = 'center';
      }
    }

    // ユーザー要望: 「強化で上がる（今→次）」は常時表示しない（強化パネルで確認）
  }

  // プレビュー内の「装備中/セット」ボタンは廃止（スマホは左下の大ボタンで完結）
  // ヒント文はボタンと被りやすいので表示しない
}


// ===== ボス選択画面 =====
const BOSS_SELECT_DATA = [
  { id: 'burst', nameJp: 'バースト司令官', nameEn: 'BURST COMMANDER', stageReq: 1, icon: '★', col: '#ff8844', desc: '全方位バースト弾', drops: ['🔩×3', '●×200'] },
  { id: 'split', nameJp: 'スプリット暴君', nameEn: 'SPLIT TYRANT', stageReq: 3, icon: '◆', col: '#ff4455', desc: '分裂弾＋ミニオン召喚', drops: ['⚡×2', '🔩×4'] },
  { id: 'teleport', nameJp: '幻影の亡霊', nameEn: 'PHANTOM WRAITH', stageReq: 5, icon: '◈', col: '#aa44ff', desc: '瞬間移動で翻弄', drops: ['💠×2', '⚡×3'] },
  { id: 'shield', nameJp: '鉄壁の守護者', nameEn: 'IRON GUARDIAN', stageReq: 7, icon: '■', col: '#4488ff', desc: 'シールド再生＋砲台配置', drops: ['🔷×1', '💠×2'] },
  { id: 'dasher', nameJp: '超高速悪魔', nameEn: 'SPEED DEMON', stageReq: 9, icon: '▶', col: '#00ffaa', desc: '超高速ダッシュ攻撃', drops: ['💎×1', '🔷×1'] },
  { id: 'barrage', nameJp: '嵐の暴君', nameEn: 'STORM TYRANT', stageReq: 11, icon: '▲', col: '#ffdd00', desc: '無差別弾幕乱射', drops: ['💎×2', '💠×2'] },
];
// ── ボスカード用スプライト ──
function drawBossCardSprite(sx, sy, boss, t, r, isLit) {
  ctx.save(); ctx.translate(sx, sy);
  const grd = ctx.createRadialGradient(0, 0, 0, 0, 0, r + 10);
  grd.addColorStop(0, `rgba(${hexToRgb(boss.col)},${isLit ? 0.30 : 0.12})`);
  grd.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grd; ctx.beginPath(); ctx.arc(0, 0, r + 10, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = boss.col; ctx.lineWidth = isLit ? 2 : 1;
  ctx.globalAlpha = isLit ? 0.6 + 0.32 * Math.sin(t * 2.8) : 0.3;
  ctx.shadowColor = boss.col; ctx.shadowBlur = isLit ? 14 : 4;
  ctx.beginPath(); ctx.arc(0, 0, r + 5, 0, Math.PI * 2); ctx.stroke();
  ctx.globalAlpha = 1; ctx.shadowBlur = 0;
  ctx.fillStyle = boss.col; ctx.shadowColor = boss.col; ctx.shadowBlur = isLit ? 18 : 8;
  switch (boss.id) {
    case 'burst': {
      ctx.beginPath();
      for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2 - Math.PI / 2, ri = (i % 2 === 0) ? r * 0.84 : r * 0.44; i === 0 ? ctx.moveTo(Math.cos(a) * ri, Math.sin(a) * ri) : ctx.lineTo(Math.cos(a) * ri, Math.sin(a) * ri); }
      ctx.closePath(); ctx.fill();
      ctx.shadowBlur = 0; ctx.fillStyle = 'rgba(255,255,200,0.9)'; ctx.beginPath(); ctx.arc(0, 0, r * 0.2, 0, Math.PI * 2); ctx.fill(); break;
    }
    case 'split': {
      ctx.beginPath(); ctx.moveTo(0, -r * 0.88); ctx.lineTo(r * 0.68, 0); ctx.lineTo(0, r * 0.88); ctx.lineTo(-r * 0.68, 0); ctx.closePath(); ctx.fill();
      ctx.shadowBlur = 0; ctx.strokeStyle = 'rgba(0,0,0,0.65)'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(0, -r * 0.88); ctx.lineTo(0, r * 0.88); ctx.stroke();
      ctx.globalAlpha = 0.46; ctx.fillStyle = boss.col;
      [[-r * 1.15, r * 0.28], [r * 1.15, r * 0.28]].forEach(([dx, dy]) => {
        ctx.save(); ctx.translate(dx, dy); ctx.scale(0.36, 0.36);
        ctx.beginPath(); ctx.moveTo(0, -r * 0.88); ctx.lineTo(r * 0.68, 0); ctx.lineTo(0, r * 0.88); ctx.lineTo(-r * 0.68, 0); ctx.closePath(); ctx.fill();
        ctx.restore();
      }); ctx.globalAlpha = 1; break;
    }
    case 'teleport': {
      ctx.beginPath();
      for (let i = 0; i <= 44; i++) { const a = (i / 44) * Math.PI * 2, wave = 1 + 0.18 * Math.sin(a * 4 + t * 3), ri = r * 0.8 * wave; i === 0 ? ctx.moveTo(Math.cos(a) * ri, Math.sin(a) * ri) : ctx.lineTo(Math.cos(a) * ri, Math.sin(a) * ri); }
      ctx.closePath(); ctx.fill();
      ctx.shadowBlur = 0; ctx.fillStyle = 'rgba(0,0,0,0.72)';
      [[-r * 0.3, r * 0.08], [r * 0.3, r * 0.08]].forEach(([ex, ey]) => { ctx.beginPath(); ctx.arc(ex, ey, r * 0.15, 0, Math.PI * 2); ctx.fill(); }); break;
    }
    case 'shield': {
      ctx.beginPath();
      for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2 - Math.PI / 6; i === 0 ? ctx.moveTo(Math.cos(a) * r * 0.82, Math.sin(a) * r * 0.82) : ctx.lineTo(Math.cos(a) * r * 0.82, Math.sin(a) * r * 0.82); }
      ctx.closePath(); ctx.fill();
      ctx.shadowBlur = 0; ctx.fillStyle = 'rgba(0,20,70,0.68)';
      ctx.beginPath();
      for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2 - Math.PI / 6; i === 0 ? ctx.moveTo(Math.cos(a) * r * 0.5, Math.sin(a) * r * 0.5) : ctx.lineTo(Math.cos(a) * r * 0.5, Math.sin(a) * r * 0.5); }
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(120,210,255,0.88)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(0, -r * 0.36); ctx.lineTo(0, r * 0.36); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-r * 0.28, 0); ctx.lineTo(r * 0.28, 0); ctx.stroke(); break;
    }
    case 'dasher': {
      ctx.beginPath(); ctx.moveTo(-r * 0.44, -r * 0.58); ctx.lineTo(r * 0.66, 0); ctx.lineTo(-r * 0.44, r * 0.58); ctx.lineTo(-r * 0.06, 0); ctx.closePath(); ctx.fill();
      ctx.shadowBlur = 0; ctx.strokeStyle = boss.col; ctx.lineWidth = 1.5;
      ctx.globalAlpha = 0.5 + 0.32 * Math.sin(t * 4.5);
      for (let i = 0; i < 3; i++) { const yy = -r * 0.34 + i * r * 0.34; ctx.beginPath(); ctx.moveTo(-r * 1.12, yy); ctx.lineTo(-r * 0.56, yy); ctx.stroke(); }
      ctx.globalAlpha = 1; break;
    }
    case 'barrage': {
      ctx.beginPath(); ctx.moveTo(0, -r * 0.9); ctx.lineTo(r * 0.78, r * 0.55); ctx.lineTo(-r * 0.78, r * 0.55); ctx.closePath(); ctx.fill();
      ctx.shadowBlur = 0; ctx.fillStyle = 'rgba(255,240,60,0.92)';
      [[-r * 0.52, -r * 0.82], [r * 0.52, -r * 0.82], [-r * 0.96, r * 0.62], [r * 0.96, r * 0.62], [0, -r * 1.12]].forEach(([bx, by], bi) => {
        const ba = (bi / 5) * Math.PI * 2 + t * 2.2; ctx.beginPath(); ctx.arc(bx + Math.sin(ba) * 2, by + Math.cos(ba) * 1.5, 2.5, 0, Math.PI * 2); ctx.fill();
      }); break;
    }
  }
  ctx.shadowBlur = 0; ctx.restore();
}

// ===== モード選択画面 =====

// ===== マップ画面 =====

// ===== 護衛艦描画 =====

// ===== サバイバルタイマー描画（HUD内で呼ぶ） =====

// ===== ガチャ UI 用（種別の日本語ラベル）=====
function gachaTypeLabelJp(tp) {
  const m = { char: '機体', skin: 'スキン', equip: '装備', pet: 'ペット', weapon: '武器', passive: 'パッシブ' };
  return m[tp] || tp || '';
}

function getGachaZukanFilterPools() {
  return [
    ALL_GACHA_POOL.filter(i => i.type === 'char' || i.type === 'skin'),
    ALL_GACHA_POOL.filter(i => i.type === 'equip'),
    ALL_GACHA_POOL.filter(i => i.type === 'pet'),
    ALL_GACHA_POOL.filter(i => i.type === 'weapon'),
  ];
}

/** 図鑑グリッド：列を減らしてセルを広げ、ラベルがはみ出しにくいようにする */
const ZUKAN_GRID_COLS = 4;
function computeZukanGridMetrics(fY, fH) {
  const cols = ZUKAN_GRID_COLS, gPad = 6;
  const zukanPanelL = 426, zukanPanelW = W - 430;
  const sideM = 8;
  const avail = Math.max(120, zukanPanelW - sideM * 2);
  const cellW = Math.floor((avail - (cols - 1) * gPad) / cols);
  const cellH = Math.min(88, Math.max(70, cellW));
  const totalGridW = cols * cellW + (cols - 1) * gPad;
  const gStartX = zukanPanelL + Math.floor((zukanPanelW - totalGridW) / 2);
  const gStartY = fY + fH + 8;
  const gAreaH = H - gStartY - 54;
  const maxRows = Math.max(1, Math.floor(gAreaH / (cellH + gPad)));
  return { cols, cellW, cellH, gPad, gStartX, gStartY, maxRows };
}

/** 図鑑用：説明を幅に合わせて折り返し描画。次の行の開始 y を返す（\\n で段落改行） */
function wrapFillJp(ctx, str, x, y, maxW, lineH, maxLines) {
  if (!str) return y;
  let ly = y, lineNum = 0;
  const parts = str.split(/\r?\n/);
  for (let pi = 0; pi < parts.length; pi++) {
    const para = parts[pi];
    if (lineNum >= maxLines) break;
    if (para === '') {
      if (pi < parts.length - 1) { ly += lineH; lineNum++; }
      continue;
    }
    let j = 0;
    while (j < para.length && lineNum < maxLines) {
      let end = j + 1;
      while (end <= para.length && ctx.measureText(para.slice(j, end)).width <= maxW) end++;
      end--;
      if (end <= j) end = Math.min(j + 1, para.length);
      let chunk = para.slice(j, end);
      if (end < para.length && lineNum === maxLines - 1) chunk += '…';
      ctx.fillText(chunk, x, ly);
      ly += lineH; lineNum++; j = end;
    }
  }
  return ly;
}

/** 1行を maxW に収まるよう末尾を … で省略 */
function truncateLine(ctx, str, maxW) {
  if (!str) return '';
  if (ctx.measureText(str).width <= maxW) return str;
  let t = str;
  while (t.length > 1 && ctx.measureText(t.slice(0, -1) + '…').width > maxW) t = t.slice(0, -1);
  return t.length ? t.slice(0, -1) + '…' : '…';
}

/** Small gem icon for inline currency labels */
function drawGemInlineIcon(x, y, size, color = '#6be0ff') {
  const s = size;
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, -s * 0.58);
  ctx.lineTo(s * 0.48, 0);
  ctx.lineTo(0, s * 0.58);
  ctx.lineTo(-s * 0.48, 0);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.beginPath();
  ctx.arc(-s * 0.14, -s * 0.16, Math.max(1, s * 0.11), 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** Small coin icon for inline currency labels */
function drawCoinInlineIcon(x, y, size) {
  const s = size;
  ctx.save();
  ctx.translate(x, y);
  const g = ctx.createLinearGradient(-s * 0.5, -s * 0.5, s * 0.5, s * 0.5);
  g.addColorStop(0, '#fff0a8');
  g.addColorStop(0.5, '#ffd34d');
  g.addColorStop(1, '#9b6a00');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.ellipse(0, 0, s * 0.52, s * 0.4, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(120,80,0,0.8)'; ctx.lineWidth = Math.max(1, s * 0.08);
  ctx.stroke();
  ctx.restore();
}

function formatZukanStatsLine(item, owned) {
  if (!owned || !item) return '';
  const t = item.type;
  if (t === 'char' || t === 'skin') {
    const p = [];
    if (item.hp) p.push(`HP ${item.hp}`);
    if (item.atk) p.push(`火力×${item.atk}`);
    if (item.def) p.push(`防御+${item.def}%`);
    if (item.crit) p.push(`会心+${item.crit}%`);
    if (item.spd) p.push(`速攻+${item.spd}`);
    return p.join('　');
  }
  if (t === 'equip') {
    const p = [];
    if (item.hp) p.push(`HP+${item.hp}`);
    if (item.atk && item.atk > 1) p.push(`火力×${item.atk}`);
    if (item.def) p.push(`防御+${item.def}%`);
    if (item.crit) p.push(`会心+${item.crit}%`);
    if (item.spd) p.push(`速攻+${item.spd}`);
    return p.join('　');
  }
  if (t === 'weapon' && item.ammo != null) return `弾数 ${item.ammo}`;
  return '';
}

function drawGachaZukanLeftDetail() {
  const filterPools = getGachaZukanFilterPools();
  const fPool = filterPools[game.collectionFilter] || [];
  if (!fPool.length) return;
  const maxI = fPool.length - 1;
  game.collectionCursor = Math.max(0, Math.min(game.collectionCursor, maxI));
  const item = fPool[game.collectionCursor];
  if (!item) return;
  const owned = !!(item.id && game.gachaInventory[item.id]);
  const rc = RARITY_COLORS[item.rarity] || item.color || '#88aacc';
  const leftColW = 420, pw = 348, ph = 248;
  const px = Math.floor((leftColW - pw) / 2), py = 92;
  ctx.fillStyle = 'rgba(12,16,26,0.96)';
  ctx.strokeStyle = 'rgba(120,190,255,0.55)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.roundRect(px, py, pw, ph, 12); ctx.fill(); ctx.stroke();

  const cx = px + pw / 2, icy = py + 50;
  ctx.save(); ctx.translate(cx, icy);
  if (owned) {
    ctx.shadowColor = rc; ctx.shadowBlur = 16;
    if (item.type === 'char' || item.type === 'skin') {
      ctx.scale(1.68, 1.68);
      drawShipShape(-14, -8, 28, 16, pickCharShipShape(item), item.color || rc, item.rarity);
    } else if (item.type === 'pet' && item.effect) {
      ctx.scale(1.05, 1.05); drawPetShape(item.effect, rc, item.rarity);
    } else if (item.type === 'equip') {
      ctx.scale(1.05, 1.05); drawEquipShape(item, rc, item.rarity);
    } else if (item.type === 'weapon') {
      ctx.scale(1.55, 1.55); drawGachaItemIcon(item);
    } else {
      ctx.scale(1.35, 1.35); drawGachaItemIcon(item);
    }
    ctx.shadowBlur = 0;
  } else {
    ctx.fillStyle = 'rgba(40,48,72,0.95)';
    ctx.beginPath(); ctx.arc(0, 0, 44, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(100,120,160,0.5)'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#6a7390'; ctx.font = 'bold 36px Orbitron,Courier New'; ctx.textAlign = 'center';
    ctx.fillText('?', 0, 12);
  }
  ctx.restore();

  const nameY = py + 94;
  ctx.textAlign = 'center';
  ctx.fillStyle = owned ? '#f2f8ff' : '#aab6cc';
  ctx.font = `bold ${owned ? 16 : 15}px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif`;
  const nameShown = owned ? truncateLine(ctx, item.label, pw - 24) : '？？？';
  ctx.fillText(nameShown, cx, nameY);

  ctx.font = 'bold 12px Orbitron,Courier New';
  ctx.fillStyle = rc;
  ctx.fillText(item.rarity, cx, nameY + 20);

  ctx.fillStyle = '#d0e6fc'; ctx.font = 'bold 12px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif';
  ctx.fillText(`${gachaTypeLabelJp(item.type)}${owned ? '' : '（未入手）'}`, cx, nameY + 38);

  ctx.textAlign = 'left';
  let descStr = 'ガチャで入手すると、名前・説明・性能がここに表示されます。';
  if (owned) {
    const flavor = item.desc || '—';
    const role = item.type === 'char' || item.type === 'skin' ? '戦闘機体' :
      item.type === 'equip' ? '装備' :
        item.type === 'pet' ? 'サポートペット' :
          item.type === 'weapon' ? '主兵装' : '特殊効果';
    const rareTxt = item.rarity === 'LR' ? 'レジェンド級。通常ガチャでは排出されない特別枠。' :
      item.rarity === 'SSR' ? '最高クラス。終盤まで主力になれる高性能。' :
        item.rarity === 'SR' ? '扱いやすく伸びる中核レア。' :
          item.rarity === 'R' ? '序盤〜中盤の強化に有効。' : '基礎を固める通常レア。';
    descStr = `${flavor}\n分類: ${role}\n${rareTxt}`;
  }
  ctx.fillStyle = '#e4eeff'; ctx.font = 'bold 11px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif';
  const descTop = nameY + 50;
  const descMaxLines = owned ? 5 : 4;
  const descLineH = 13;
  const descEndY = wrapFillJp(ctx, descStr, px + 12, descTop, pw - 24, descLineH, descMaxLines);

  const st = formatZukanStatsLine(item, owned);
  let footY = descEndY + 10;
  const footMaxY = py + ph - 8;
  const statLineH = 12;
  if (st) {
    ctx.fillStyle = '#c8dff8'; ctx.font = 'bold 9px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif';
    const maxStatLines = Math.max(1, Math.floor((footMaxY - footY) / statLineH));
    footY = wrapFillJp(ctx, st, px + 12, footY, pw - 24, statLineH, maxStatLines);
  }
  const statsBaseline = st ? footY - statLineH : footY;
  const inv = owned && item.id ? game.gachaInventory[item.id] : null;
  if (inv && (inv.level || 1) > 1) {
    ctx.fillStyle = '#ffd699'; ctx.font = 'bold 10px Orbitron,Courier New'; ctx.textAlign = 'right';
    ctx.fillText(`Lv.${inv.level}`, px + pw - 12, statsBaseline);
    ctx.textAlign = 'left';
  }
}

// ===== ガチャ左カラム（タブで見た目を分ける）=====
function drawGachaHeroNormal(t) {
  const cx = 210, cy = 218, bob = Math.sin(t * 2.2) * 5;
  const pl = ctx.createLinearGradient(cx - 112, cy + 52, cx + 112, cy + 82);
  pl.addColorStop(0, '#1c1a22'); pl.addColorStop(0.35, '#3d3838'); pl.addColorStop(0.55, '#5a5248'); pl.addColorStop(0.78, '#3a342c'); pl.addColorStop(1, '#121016');
  ctx.fillStyle = pl;
  ctx.beginPath(); ctx.roundRect(cx - 104, cy + 52 + bob, 208, 22, 6); ctx.fill();
  ctx.strokeStyle = 'rgba(255,215,140,0.45)'; ctx.lineWidth = 1.25;
  ctx.beginPath(); ctx.roundRect(cx - 104, cy + 52 + bob, 208, 22, 6); ctx.stroke();
  ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.roundRect(cx - 103, cy + 53 + bob, 206, 20, 5); ctx.stroke();
  for (let i = -1; i <= 1; i++) {
    ctx.save();
    const ox = i * 44, oy = Math.sin(t * 2.4 + i * 1.1) * 4 + bob;
    ctx.translate(cx + ox, cy + oy);
    ctx.rotate(i * 0.1 + Math.sin(t * 1.7 + i) * 0.04);
    const topG = ctx.createLinearGradient(-14, -26, 14, -8);
    topG.addColorStop(0, '#fffef8'); topG.addColorStop(0.25, '#fff4d0'); topG.addColorStop(0.55, '#f0c060'); topG.addColorStop(1, '#c07820');
    ctx.fillStyle = topG;
    ctx.beginPath(); ctx.ellipse(0, -10, 16, 20, 0, Math.PI, 0, false); ctx.fill();
    const botG = ctx.createLinearGradient(-4, -4, 4, 26);
    botG.addColorStop(0, '#ffeec8'); botG.addColorStop(0.35, '#e8a038'); botG.addColorStop(0.7, '#985018'); botG.addColorStop(1, '#2a1810');
    ctx.fillStyle = botG;
    ctx.beginPath(); ctx.ellipse(0, -6, 16, 22, 0, 0, Math.PI); ctx.fill();
    ctx.strokeStyle = 'rgba(60,35,12,0.55)'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.ellipse(0, -8, 16.5, 21.5, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(-16, -6); ctx.lineTo(16, -6); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.beginPath(); ctx.ellipse(-6, -18, 4, 2.2, 0.35, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  for (let k = 0; k < 22; k++) {
    const a = t * 1.45 + k * 0.71;
    const r = 48 + Math.sin(t * 2.8 + k * 0.5) * 18;
    ctx.globalAlpha = 0.08 + Math.sin(t * 3.5 + k) * 0.06;
    ctx.fillStyle = k % 3 === 0 ? '#fff2c8' : '#ffd070';
    ctx.beginPath(); ctx.arc(cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.42 + bob, 0.9 + (k % 4) * 0.28, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawGachaHeroPremium(t) {
  const cx = 210, cy = 218, bob = Math.sin(t * 2) * 4;
  ctx.save(); ctx.translate(cx, cy + bob);
  const halo = ctx.createRadialGradient(0, -6, 0, 0, 0, 92);
  halo.addColorStop(0, 'rgba(255,230,255,0.55)'); halo.addColorStop(0.28, 'rgba(220,120,255,0.35)'); halo.addColorStop(0.55, 'rgba(120,40,200,0.15)'); halo.addColorStop(1, 'transparent');
  ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(0, 0, 92, 0, Math.PI * 2); ctx.fill();
  const dg = ctx.createLinearGradient(-42, -54, 44, 58);
  dg.addColorStop(0, '#ffffff'); dg.addColorStop(0.12, '#ffe8ff'); dg.addColorStop(0.28, '#f0a0ff'); dg.addColorStop(0.48, '#c040f0');
  dg.addColorStop(0.68, '#6020a8'); dg.addColorStop(0.88, '#200848'); dg.addColorStop(1, '#080018');
  ctx.fillStyle = dg; ctx.shadowColor = '#e8a0ff'; ctx.shadowBlur = 32;
  ctx.beginPath(); ctx.moveTo(0, -50); ctx.lineTo(36, 4); ctx.lineTo(0, 54); ctx.lineTo(-36, 4); ctx.closePath(); ctx.fill(); ctx.shadowBlur = 0;
  ctx.strokeStyle = 'rgba(255,255,255,0.65)'; ctx.lineWidth = 2.2;
  ctx.beginPath(); ctx.moveTo(-8, -40); ctx.lineTo(0, -50); ctx.lineTo(8, -40); ctx.stroke();
  ctx.strokeStyle = 'rgba(40,0,80,0.45)'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(0, -50); ctx.lineTo(36, 4); ctx.lineTo(0, 54); ctx.lineTo(-36, 4); ctx.closePath(); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.92)'; ctx.beginPath(); ctx.arc(-11, -21, 3.6, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,200,255,0.35)'; ctx.beginPath(); ctx.arc(10, 8, 2.2, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(255,240,255,0.4)'; ctx.lineWidth = 1.3;
  ctx.beginPath(); ctx.moveTo(0, -50); ctx.lineTo(0, 54); ctx.stroke();
  // subtle rotating rings for premium quality feel
  for (let r = 0; r < 2; r++) {
    const rot = t * (r === 0 ? 0.9 : -1.1);
    const rad = r === 0 ? 48 : 62;
    ctx.save(); ctx.rotate(rot);
    ctx.globalAlpha = 0.16;
    ctx.strokeStyle = r === 0 ? '#ffd6ff' : '#c8a6ff'; ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(0, -rad); ctx.lineTo(rad * 0.66, 0); ctx.lineTo(0, rad); ctx.lineTo(-rad * 0.66, 0); ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }
  ctx.globalAlpha = 1;
  for (let s = 0; s < 14; s++) {
    const ang = t * 1.15 + s * 0.45, rr = 58 + s * 6;
    ctx.globalAlpha = 0.1 + Math.sin(t * 2.8 + s) * 0.08;
    ctx.fillStyle = s % 3 === 0 ? '#ffffff' : s % 3 === 1 ? '#ffb8ff' : '#cca0ff';
    ctx.beginPath(); ctx.arc(Math.cos(ang) * rr * 0.38, Math.sin(ang) * rr * 0.3 - 4, 1.1 + s * 0.04, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

function drawGachaLeftColumn(tab, t) {
  const w0 = 420;
  if (tab === 0) {
    const bg = ctx.createLinearGradient(0, 0, w0, H * 0.65);
    bg.addColorStop(0, '#040308'); bg.addColorStop(0.35, '#0a0812'); bg.addColorStop(0.65, '#100c18'); bg.addColorStop(1, '#06040a');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, w0, H);
    const v1 = ctx.createRadialGradient(130, 120, 0, 130, 120, 260);
    v1.addColorStop(0, 'rgba(255,220,140,0.26)'); v1.addColorStop(0.35, 'rgba(200,140,60,0.1)'); v1.addColorStop(1, 'transparent');
    ctx.fillStyle = v1; ctx.fillRect(0, 0, w0, H);
    const v2 = ctx.createRadialGradient(340, H * 0.55, 0, 340, H * 0.55, 220);
    v2.addColorStop(0, 'rgba(100,90,160,0.1)'); v2.addColorStop(1, 'transparent');
    ctx.fillStyle = v2; ctx.fillRect(0, 0, w0, H);
    const topSh = ctx.createLinearGradient(0, 0, 0, 140);
    topSh.addColorStop(0, 'rgba(0,0,0,0.35)'); topSh.addColorStop(1, 'transparent');
    ctx.fillStyle = topSh; ctx.fillRect(0, 0, w0, 140);
  } else if (tab === 1) {
    const bg = ctx.createLinearGradient(0, 0, w0, H);
    bg.addColorStop(0, '#050208'); bg.addColorStop(0.45, '#0c0618'); bg.addColorStop(1, '#080414');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, w0, H);
    const v1 = ctx.createRadialGradient(200, 150, 0, 200, 150, 280);
    v1.addColorStop(0, 'rgba(240,150,255,0.22)'); v1.addColorStop(0.4, 'rgba(140,60,200,0.12)'); v1.addColorStop(1, 'transparent');
    ctx.fillStyle = v1; ctx.fillRect(0, 0, w0, H);
    const v2 = ctx.createRadialGradient(80, H - 120, 0, 80, H - 120, 180);
    v2.addColorStop(0, 'rgba(80,40,140,0.18)'); v2.addColorStop(1, 'transparent');
    ctx.fillStyle = v2; ctx.fillRect(0, 0, w0, H);
    const topSh = ctx.createLinearGradient(0, 0, 0, 120);
    topSh.addColorStop(0, 'rgba(0,0,0,0.3)'); topSh.addColorStop(1, 'transparent');
    ctx.fillStyle = topSh; ctx.fillRect(0, 0, w0, 120);
  } else {
    const bg = ctx.createLinearGradient(0, 0, w0, 0);
    bg.addColorStop(0, '#050a10'); bg.addColorStop(1, '#0e1620');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, w0, H);
    const v = ctx.createRadialGradient(190, 240, 0, 190, 240, 200);
    v.addColorStop(0, 'rgba(80,160,220,0.12)'); v.addColorStop(1, 'transparent');
    ctx.fillStyle = v; ctx.fillRect(0, 0, w0, H);
  }
  ctx.textAlign = 'center';
  ctx.shadowBlur = 0;
  if (tab === 0) {
    ctx.shadowColor = 'rgba(255,200,80,0.45)'; ctx.shadowBlur = 12;
    ctx.fillStyle = '#ffe8b8'; ctx.font = 'bold 19px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif';
    ctx.fillText('コインガチャ', 210, 36); ctx.shadowBlur = 0;
    ctx.fillStyle = '#b8a078'; ctx.font = '11px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif';
    ctx.fillText('毎日無料＋SSR天井あり', 210, 54);
    drawGachaHeroNormal(t);
  } else if (tab === 1) {
    ctx.shadowColor = 'rgba(220,120,255,0.5)'; ctx.shadowBlur = 14;
    ctx.fillStyle = '#f4e0ff'; ctx.font = 'bold 19px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif';
    ctx.fillText('プレミアム', 210, 36); ctx.shadowBlur = 0;
    ctx.fillStyle = '#a080c0'; ctx.font = '11px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif';
    ctx.fillText('ピックアップ＋高レア率', 210, 54);
    drawGachaHeroPremium(t);
  } else {
    ctx.fillStyle = '#e8f8ff'; ctx.font = 'bold 21px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif';
    ctx.fillText('図鑑', 210, 36);
    ctx.fillStyle = '#b0d4f0'; ctx.font = 'bold 12px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif';
    ctx.fillText('右の一覧からタップで詳細表示', 210, 54);
    drawGachaZukanLeftDetail();
  }
  if (tab !== 2) {
    // 図鑑と同じ ALL_GACHA_POOL 基準。レアごとに短いバー＋数値で「棒と下の数字」が対応する。
    const ownedItems = ALL_GACHA_POOL.filter(i => game.gachaInventory[i.id]);
    const bx = 24, bw = 372, baseY = 296;
    const rarities = ['LR', 'SSR', 'SR', 'R', 'N'];
    const colW = bw / rarities.length;
    ctx.textAlign = 'left';
    ctx.fillStyle = '#8a9bb8'; ctx.font = 'bold 10px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif';
    ctx.fillText(`図鑑登録 全体 ${ownedItems.length}/${ALL_GACHA_POOL.length}`, bx, baseY);
    const barY = baseY + 12, barH = 8, padX = 4;
    rarities.forEach((r, ri) => {
      const items = ALL_GACHA_POOL.filter(i => i.rarity === r);
      const tot = items.length;
      const got = tot ? items.filter(i => game.gachaInventory[i.id]).length : 0;
      const x = bx + ri * colW;
      const innerW = Math.max(10, colW - padX * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.beginPath(); ctx.roundRect(x + padX, barY, innerW, barH, 3); ctx.fill();
      if (tot > 0 && got > 0) {
        const pr = got / tot;
        const rc = r === 'LR' ? getLRColor(game.frameCount * 0.06 + ri * 0.2) : RARITY_COLORS[r];
        ctx.fillStyle = rc + 'dd';
        ctx.beginPath(); ctx.roundRect(x + padX, barY, Math.max(2, innerW * pr), barH, 3); ctx.fill();
      }
      ctx.textAlign = 'center';
      const labCol = tot === 0 ? '#556677' : got > 0 ? (r === 'LR' ? getLRColor(game.frameCount * 0.06) : RARITY_COLORS[r]) : '#667788';
      ctx.fillStyle = labCol; ctx.font = 'bold 9px Orbitron,Courier New';
      ctx.fillText(r, x + colW / 2, barY + barH + 12);
      ctx.fillStyle = '#aab8cc'; ctx.font = '8px Orbitron,Courier New';
      ctx.fillText(tot ? `${got}/${tot}` : '—', x + colW / 2, barY + barH + 24);
    });
    ctx.textAlign = 'left';
  }
}

// ===== ガチャ描画 =====

// ===== ガチャアイテムアイコン =====
function drawGachaItemIcon(item) {
  const ic = item.color || RARITY_COLORS[item.rarity] || '#aaa';
  ctx.fillStyle = ic; ctx.strokeStyle = ic;
  const t = item.type;

  if (t === 'char' || t === 'skin') {
    const r = item.rarity;
    if (r === 'SSR') {
      ctx.beginPath(); ctx.moveTo(0, -24); ctx.lineTo(10, 6); ctx.lineTo(7, 18); ctx.lineTo(-7, 18); ctx.lineTo(-10, 6); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-8, -4); ctx.lineTo(-14, -10); ctx.lineTo(-18, 2); ctx.lineTo(-10, 4); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(8, -4); ctx.lineTo(14, -10); ctx.lineTo(18, 2); ctx.lineTo(10, 4); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-9, 4); ctx.lineTo(-22, 16); ctx.lineTo(-18, 8); ctx.lineTo(-11, 6); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(9, 4); ctx.lineTo(22, 16); ctx.lineTo(18, 8); ctx.lineTo(11, 6); ctx.closePath(); ctx.fill();
      ctx.fillRect(-9, 14, 4, 7); ctx.fillRect(-4, 14, 3, 5); ctx.fillRect(1, 14, 3, 5); ctx.fillRect(5, 14, 4, 7);
      ctx.save(); ctx.globalAlpha = 0.35; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(0, 0, 28, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
    } else if (r === 'SR') {
      ctx.beginPath(); ctx.moveTo(0, -22); ctx.lineTo(9, 8); ctx.lineTo(6, 18); ctx.lineTo(-6, 18); ctx.lineTo(-9, 8); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-7, 2); ctx.lineTo(-20, 16); ctx.lineTo(-15, 8); ctx.lineTo(-9, 4); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(7, 2); ctx.lineTo(20, 16); ctx.lineTo(15, 8); ctx.lineTo(9, 4); ctx.closePath(); ctx.fill();
      ctx.save(); ctx.globalAlpha = 0.8; ctx.fillRect(-8, 12, 5, 7); ctx.fillRect(3, 12, 5, 7); ctx.restore();
    } else if (r === 'R') {
      ctx.beginPath(); ctx.moveTo(0, -20); ctx.lineTo(7, 8); ctx.lineTo(0, 14); ctx.lineTo(-7, 8); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-5, 0); ctx.lineTo(-18, 14); ctx.lineTo(-13, 6); ctx.lineTo(-7, 4); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(5, 0); ctx.lineTo(18, 14); ctx.lineTo(13, 6); ctx.lineTo(7, 4); ctx.closePath(); ctx.fill();
    } else {
      ctx.beginPath(); ctx.moveTo(0, -16); ctx.lineTo(8, 10); ctx.lineTo(-8, 10); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-6, 4); ctx.lineTo(-13, 12); ctx.lineTo(-8, 10); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(6, 4); ctx.lineTo(13, 12); ctx.lineTo(8, 10); ctx.closePath(); ctx.fill();
    }

  } else if (t === 'equip') {
    const slot = item.slot || 'atk';
    if (slot === 'def') {
      ctx.beginPath(); ctx.moveTo(0, -20); ctx.lineTo(15, -12); ctx.lineTo(15, 4); ctx.quadraticCurveTo(15, 20, 0, 26); ctx.quadraticCurveTo(-15, 20, -15, 4); ctx.lineTo(-15, -12); ctx.closePath(); ctx.fill();
      ctx.save(); ctx.globalAlpha = 0.28; ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.moveTo(0, -13); ctx.lineTo(9, -7); ctx.lineTo(9, 4); ctx.quadraticCurveTo(9, 14, 0, 18); ctx.quadraticCurveTo(-9, 14, -9, 4); ctx.lineTo(-9, -7); ctx.closePath(); ctx.fill();
      ctx.restore();
    } else if (slot === 'sp') {
      ctx.beginPath(); ctx.moveTo(5, -22); ctx.lineTo(-4, 0); ctx.lineTo(2, 0); ctx.lineTo(-6, 22); ctx.lineTo(12, -2); ctx.lineTo(5, -2); ctx.closePath(); ctx.fill();
    } else {
      ctx.beginPath(); ctx.moveTo(0, -22); ctx.lineTo(13, -6); ctx.lineTo(13, 4); ctx.lineTo(0, 22); ctx.lineTo(-13, 4); ctx.lineTo(-13, -6); ctx.closePath(); ctx.fill();
      ctx.save(); ctx.globalAlpha = 0.32; ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.moveTo(0, -14); ctx.lineTo(8, -4); ctx.lineTo(0, 14); ctx.lineTo(-8, -4); ctx.closePath(); ctx.fill();
      ctx.restore(); ctx.fillStyle = ic;
      ctx.save(); ctx.globalAlpha = 0.45; ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.moveTo(-13, -6); ctx.lineTo(0, -22); ctx.lineTo(13, -6); ctx.moveTo(0, -22); ctx.lineTo(0, -4); ctx.stroke();
      ctx.restore();
    }

  } else if (t === 'pet') {
    const eff = item.effect || '';
    if (eff === 'dragon') {
      ctx.beginPath(); ctx.moveTo(-8, -12); ctx.lineTo(-12, -24); ctx.lineTo(-4, -14); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(8, -12); ctx.lineTo(12, -24); ctx.lineTo(4, -14); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.ellipse(0, 4, 13, 11, 0, 0, Math.PI * 2); ctx.fill();
      ctx.save(); ctx.globalAlpha = 0.35; ctx.fillStyle = '#000';
      ctx.beginPath(); ctx.ellipse(0, 10, 8, 5, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      ctx.fillStyle = '#ff6600';
      ctx.beginPath(); ctx.arc(-4, 0, 2.5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(4, 0, 2.5, 0, Math.PI * 2); ctx.fill();
    } else if (eff === 'hawk') {
      ctx.beginPath(); ctx.ellipse(0, 0, 4, 10, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-3, -2); ctx.lineTo(-22, -5); ctx.lineTo(-16, 6); ctx.lineTo(-4, 4); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(3, -2); ctx.lineTo(22, -5); ctx.lineTo(16, 6); ctx.lineTo(4, 4); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-4, 8); ctx.lineTo(0, 20); ctx.lineTo(4, 8); ctx.closePath(); ctx.fill();
    } else if (eff === 'fairy') {
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const ao = (Math.PI * 2 / 5) * i - Math.PI / 2, ai = ao + Math.PI / 5;
        if (i === 0) ctx.moveTo(Math.cos(ao) * 18, Math.sin(ao) * 18); else ctx.lineTo(Math.cos(ao) * 18, Math.sin(ao) * 18);
        ctx.lineTo(Math.cos(ai) * 8, Math.sin(ai) * 8);
      }
      ctx.closePath(); ctx.fill();
    } else if (eff === 'phoenix') {
      ctx.beginPath(); ctx.moveTo(0, -18); ctx.lineTo(8, -2); ctx.lineTo(0, 4); ctx.lineTo(-8, -2); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-7, 6); ctx.lineTo(-12, 20); ctx.lineTo(-6, 14); ctx.lineTo(-2, 22); ctx.lineTo(0, 14); ctx.lineTo(2, 22); ctx.lineTo(6, 14); ctx.lineTo(12, 20); ctx.lineTo(7, 6); ctx.closePath(); ctx.fill();
      ctx.save(); ctx.globalAlpha = 0.75;
      ctx.beginPath(); ctx.moveTo(-6, -4); ctx.lineTo(-18, 4); ctx.lineTo(-12, 10); ctx.lineTo(-5, 6); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(6, -4); ctx.lineTo(18, 4); ctx.lineTo(12, 10); ctx.lineTo(5, 6); ctx.closePath(); ctx.fill();
      ctx.restore();
    } else if (eff === 'heal') {
      ctx.beginPath(); ctx.arc(-6, -4, 9, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(6, -4, 9, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(0, 6, 13, 0, Math.PI); ctx.fill(); ctx.fillRect(-13, 0, 26, 8);
      ctx.save(); ctx.globalAlpha = 0.6; ctx.fillStyle = '#000';
      ctx.beginPath(); ctx.arc(-5, -2, 3, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(5, -2, 3, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    } else if (eff === 'exp' || eff === 'bot') {
      ctx.fillRect(-13, -12, 26, 22); ctx.fillRect(-2, -22, 4, 12);
      ctx.beginPath(); ctx.arc(0, -24, 4, 0, Math.PI * 2); ctx.fill();
      ctx.save(); ctx.fillStyle = '#000'; ctx.fillRect(-9, -7, 7, 5); ctx.fillRect(2, -7, 7, 5);
      ctx.fillStyle = '#0ff'; ctx.globalAlpha = 0.9; ctx.fillRect(-8, -6, 5, 3); ctx.fillRect(3, -6, 5, 3);
      ctx.fillStyle = '#000'; ctx.globalAlpha = 1; ctx.fillRect(-7, 2, 14, 4); ctx.restore();
    } else if (eff === 'turtle') {
      ctx.beginPath(); ctx.ellipse(0, 2, 18, 14, 0, 0, Math.PI * 2); ctx.fill();
      ctx.save(); ctx.globalAlpha = 0.45; ctx.strokeStyle = '#004400'; ctx.lineWidth = 1.5;
      for (let h = 0; h < 6; h++) { const a = h * Math.PI / 3; ctx.beginPath(); ctx.moveTo(0, 2); ctx.lineTo(Math.cos(a) * 16, 2 + Math.sin(a) * 12); ctx.stroke(); }
      ctx.restore(); ctx.fillStyle = '#88cc88';
      ctx.beginPath(); ctx.ellipse(-6, -14, 3, 5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(6, -14, 3, 5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(0, 18, 3, 5, 0, 0, Math.PI * 2); ctx.fill();
    } else if (eff === 'bomber') {
      ctx.beginPath(); ctx.ellipse(0, 0, 12, 8, 0, 0, Math.PI * 2); ctx.fill();
      ctx.save(); ctx.globalAlpha = 0.55; ctx.fillStyle = '#111';
      ctx.fillRect(-11, -4, 7, 8); ctx.fillRect(-2, -4, 7, 8);
      ctx.restore(); ctx.fillStyle = 'rgba(255,255,80,0.9)';
      ctx.beginPath(); ctx.ellipse(0, -12, 10, 5, -0.2, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(0, 12, 10, 5, 0.2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ff2200'; ctx.beginPath(); ctx.arc(0, 0, 4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ff0'; ctx.beginPath(); ctx.arc(0, 0, 2, 0, Math.PI * 2); ctx.fill();
    } else if (eff === 'ghost') {
      ctx.save(); ctx.globalAlpha = 0.75;
      ctx.beginPath(); ctx.arc(0, -4, 16, Math.PI, 0);
      ctx.lineTo(16, 12);
      ctx.quadraticCurveTo(10, 6, 5, 12); ctx.quadraticCurveTo(0, 6, -5, 12); ctx.quadraticCurveTo(-10, 6, -16, 12);
      ctx.lineTo(-16, 12); ctx.closePath(); ctx.fill();
      ctx.restore(); ctx.fillStyle = '#111';
      ctx.beginPath(); ctx.ellipse(-5, -5, 3, 4, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(5, -5, 3, 4, 0, 0, Math.PI * 2); ctx.fill();
    } else {
      // cat
      ctx.beginPath(); ctx.moveTo(-11, -14); ctx.lineTo(-16, -24); ctx.lineTo(-4, -16); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(11, -14); ctx.lineTo(16, -24); ctx.lineTo(4, -16); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.arc(0, -6, 13, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(0, 10, 9, 12, 0, 0, Math.PI * 2); ctx.fill();
      ctx.save(); ctx.globalAlpha = 0.65; ctx.fillStyle = '#000';
      ctx.beginPath(); ctx.ellipse(-4, -6, 2.5, 3.5, -0.2, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(4, -6, 2.5, 3.5, 0.2, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }

  } else if (t === 'weapon') {
    const wp = item.weapon || '';
    if (wp === 'laser') {
      ctx.fillRect(-3, -28, 6, 36); ctx.fillRect(-2, -32, 4, 6);
      ctx.beginPath(); ctx.roundRect(-10, 2, 20, 14, 3); ctx.fill();
      ctx.save(); ctx.fillStyle = '#fff'; ctx.globalAlpha = 0.65; ctx.fillRect(-1.5, -22, 3, 20); ctx.restore();
    } else if (wp === 'homing') {
      ctx.beginPath(); ctx.ellipse(0, 0, 11, 20, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.moveTo(0, -24); ctx.lineTo(-7, -18); ctx.lineTo(7, -18); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-8, 14); ctx.lineTo(-14, 22); ctx.lineTo(-6, 18); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(8, 14); ctx.lineTo(14, 22); ctx.lineTo(6, 18); ctx.closePath(); ctx.fill();
    } else if (wp === 'explosive') {
      ctx.beginPath(); ctx.arc(0, 4, 17, 0, Math.PI * 2); ctx.fill();
      ctx.save(); ctx.strokeStyle = ic; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(0, -13); ctx.quadraticCurveTo(8, -20, 4, -26); ctx.stroke(); ctx.restore();
      ctx.fillStyle = '#ff4'; ctx.beginPath(); ctx.arc(4, -27, 4, 0, Math.PI * 2); ctx.fill();
      ctx.save(); ctx.fillStyle = '#fff'; ctx.globalAlpha = 0.18;
      ctx.beginPath(); ctx.arc(-5, -2, 6, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    } else if (wp === 'pulse') {
      // pulse cannon: sleek multi-barrel rapid fire
      ctx.fillRect(-2, -30, 4, 36); ctx.fillRect(-8, -28, 4, 32); ctx.fillRect(4, -28, 4, 32);
      ctx.beginPath(); ctx.roundRect(-10, 4, 20, 10, 3); ctx.fill();
      ctx.save(); ctx.fillStyle = '#fff'; ctx.globalAlpha = 0.5;
      ctx.fillRect(-1, -24, 2, 18); ctx.restore();
      ctx.save(); ctx.fillStyle = '#ff8833'; ctx.globalAlpha = 0.7;
      ctx.beginPath(); ctx.arc(0, -30, 3, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    } else if (wp === 'gravity') {
      // gravity bomb: orb with orbit rings
      ctx.beginPath(); ctx.arc(0, 4, 14, 0, Math.PI * 2); ctx.fill();
      ctx.save(); ctx.strokeStyle = ic; ctx.lineWidth = 2; ctx.globalAlpha = 0.6;
      ctx.beginPath(); ctx.ellipse(0, 4, 22, 7, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(0, 4, 7, 22, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
      ctx.save(); ctx.fillStyle = '#fff'; ctx.globalAlpha = 0.22;
      ctx.beginPath(); ctx.arc(-4, -1, 5, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(0, 4, 6, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = ic; ctx.beginPath(); ctx.arc(0, 4, 3, 0, Math.PI * 2); ctx.fill();
    } else {
      // spread/classic
      ctx.fillRect(-9, -22, 5, 28); ctx.fillRect(-3, -26, 6, 30); ctx.fillRect(4, -22, 5, 28);
      ctx.beginPath(); ctx.roundRect(-11, 4, 22, 14, 4); ctx.fill();
    }
  } else {
    ctx.beginPath(); ctx.moveTo(0, -18); ctx.lineTo(13, 0); ctx.lineTo(0, 18); ctx.lineTo(-13, 0); ctx.closePath(); ctx.fill();
  }
}




const STARDUST_SHOP_ITEMS = [
  { label: 'コイン  +1000', desc: 'スターダストをコインに変換', cost: 100, color: '#ffd700', tag: null, action: () => { game.coins += 1000; saveCoins(); } },
  { label: 'コイン  +5000', desc: 'まとめて大量変換 お得版', cost: 300, color: '#ffd700', tag: 'お得', action: () => { game.coins += 5000; saveCoins(); } },
  {
    label: 'SR 確定 単発ガチャ', desc: 'SR以上が1枚確定で入手できる', cost: 500, color: '#cc88ff', tag: 'おすすめ', action: () => {
      game.gachaResults = []; game.gachaNewItems = new Set();
      const item = gachaRollOne(true, false);
      game.gachaResults.push(item); addGachaItem(item);
      game.gachaCurrentIdx = 0; game.gachaAnimFrame = 0;
      game.state = 'gacha_result';
      playSound('warp');
    }
  },
];
function applyStardustShop(idx) {
  const item = STARDUST_SHOP_ITEMS[idx];
  if (game.gachaStardust < item.cost) return;
  game.gachaStardust -= item.cost;
  localStorage.setItem('invader_stardust', game.gachaStardust);
  item.action();
}

// ===== ステージリザルト画面 =====

// ===== ショップ画面 =====
const SHOP_ITEM_COLORS = ['#00ffcc', '#ff4455', '#00ff88', '#44aaff', '#ffdd00', '#ff8833'];
const SHOP_ITEM_ICONS = ['▲', '★', '◆', '→', '◎', '⚡'];
/** 強化ツリー: CORE → 4カテゴリ → SHOP_ITEMS（規則配置・対称） */
const SHOP_TREE_CAT_DEFS = [
  { id: 'atk', label: '攻撃', angle: -Math.PI / 2, accent: '#d88870', items: ['firerate', 'critrate'] },
  { id: 'def', label: '防御', angle: 0, accent: '#6cc898', items: ['maxhp', 'dashcd'] },
  { id: 'spd', label: '速度', angle: Math.PI / 2, accent: '#6eb8f0', items: ['speed'] },
  { id: 'en', label: 'エネルギー', angle: Math.PI, accent: '#d4b868', items: ['bulletspd'] },
];
// ショップ強化: 役割カラー（高級感SFの統一ルール）
function getShopRoleColor(id) {
  // 攻撃＝赤 / 防御＝緑 / 速度/汎用＝青 / 特殊＝黄
  if (id === 'firerate' || id === 'critrate') return '#ff4d5e'; // atk
  if (id === 'maxhp' || id === 'dashcd') return '#39e58f';      // def
  if (id === 'speed') return '#44aaff';                     // spd
  if (id === 'bulletspd') return '#ffdd55';                 // special
  return '#88a';
}

// ===== ウェーブバナー =====

// ===== 通知画面（受け取り / イベント / お知らせ） =====

// ===== 設定画面 =====

// ===== 受け取りボックス画面 =====

// ===== イベント / お知らせ画面 =====

// ===== 課金画面 =====

// ===== ログインボーナス =====
function checkLoginBonus() {
  const today = new Date().toDateString();
  const last = localStorage.getItem('invader_login_date');
  if (last === today) return;
  const yesterday = new Date(Date.now() - 86400000).toDateString();
  const streak = last === yesterday ? Math.min(7, (parseInt(localStorage.getItem('invader_login_streak') || '0') + 1)) : 1;
  localStorage.setItem('invader_login_date', today);
  localStorage.setItem('invader_login_streak', String(streak));
  const coins = 100 + streak * 50;
  const gems = streak >= 7 ? 3 : streak >= 3 ? 1 : 0;
  addInboxItem({ label: `🎁 ログインボーナス（${streak}日連続）`, coins, gems, icon: 'login' });
  playSound('login_bonus');
  game.lifeGainDisplay = { text: `📬 ログインボーナスを受け取りBOXに追加しました`, timer: 220, color: '#00ff88' };
}

// ===== ループ =====
function loop() {
  try { runUpdate(); } catch (e) { console.error('runUpdate', e); }
  // メニュー中も燃料タイマーを進める（次回復表示を更新）
  if (game.frameCount % 30 === 0) { try { updateHUD(); } catch (e) { } }
  try { draw(); }
  catch (e) {
    console.error('draw', e);
    // 描画が落ちた時に真っ黒にならないよう、canvasにエラーを表示
    try {
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.85)'; ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = 'rgba(255,80,80,0.65)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.roundRect(18, 18, W - 36, H - 36, 12); ctx.stroke();
      ctx.fillStyle = 'rgba(255,130,130,0.95)';
      ctx.font = 'bold 14px Orbitron,Courier New';
      ctx.textAlign = 'left';
      const msg = String(e && e.stack || e && e.message || e || 'unknown');
      const lines = msg.split('\n').slice(0, 18);
      ctx.fillText('RENDER ERROR', 34, 48);
      ctx.fillStyle = 'rgba(230,240,255,0.9)'; ctx.font = '12px Orbitron,Courier New';
      for (let i = 0; i < lines.length; i++) {
        ctx.fillText(lines[i].slice(0, 120), 34, 72 + i * 18);
      }
      ctx.restore();
    } catch (_e) { }
    // DOMにも表示（canvas描画が失敗した場合の保険）
    try {
      const el = document.getElementById('message');
      if (el) {
        const msg = String(e && e.stack || e && e.message || e || 'unknown');
        el.textContent = `RENDER ERROR\n\n${msg}`;
        el.classList.remove('hidden');
      }
    } catch (_e) { }
  }
  requestAnimationFrame(loop);
}

updateHUD();

// 起動エラーを画面に表示するデバッグハンドラ
window.addEventListener('error', ev => {
  const el = document.getElementById('message');
  if (el) { el.textContent = `ERROR: ${ev.message}\n${ev.filename}:${ev.lineno}`; el.classList.remove('hidden'); }
});
window.addEventListener('unhandledrejection', ev => {
  const el = document.getElementById('message');
  if (el) { el.textContent = `REJECT: ${ev.reason}`; el.classList.remove('hidden'); }
});

setScreenDrawDeps(screenDrawDeps);
setEntityDrawDeps(entityDrawDeps);
setUIDrawDeps(uiDrawDeps);

initStars();
ensureAllCharsUpgradable();
ensureAllEquipsOwnedForTest();
loadSettings();
loadInbox();
game.ageVerified = localStorage.getItem('invader_age_verified') === '1';
game.state = 'title';
checkLoginBonus();
loop();
