import { game } from './game-store.js';
import { CANVAS_W as W, CANVAS_H as H, INVADER_W, INVADER_H } from './constants.js';
import { getPlanet } from '../game-data.js';

export function spawnMiniBoss(x, y, hp) {
  game.miniBosses.push({
    x, y, w: 70, h: 36, hp, maxHp: hp, dir: Math.random() < 0.5 ? 1 : -1,
    speed: 2 + game.stage * 0.3, shootTimer: Math.floor(Math.random() * 40),
    shootInterval: Math.max(25, 50 - game.stage * 3),
    frame: 0, frameTimer: 0, alive: true,
  });
}

export function pickInvaderType() {
  const r = Math.random();
  const p = getPlanet(game.stage).name;
  if (p === 'MARS') {
    const s = game.stage;
    // 火星ローカル 1〜10（BG ゾーン: 1-2 荒野 / 3-4 前哨 / 5 採掘 / 6-10 研究所）
    if (s <= 2) {
      if (r < 0.07) return 'tank';
      if (r < 0.44) return 'fast';
      return 'normal';
    }
    if (s <= 4) {
      if (r < 0.09) return 'tank';
      if (r < 0.24) return 'spider';
      if (r < 0.40) return 'ufo_drone';
      if (r < 0.68) return 'fast';
      return 'normal';
    }
    if (s === 5) {
      if (r < 0.11) return 'tank';
      if (r < 0.24) return 'bomber';
      if (r < 0.40) return 'spider';
      if (r < 0.56) return 'ufo_drone';
      if (r < 0.78) return 'fast';
      return 'normal';
    }
    const ramp = (s - 6) / 4;
    const tankP = 0.09 + ramp * 0.06;
    const bomP = 0.13 + ramp * 0.10;
    const spiP = 0.14;
    const ufoP = 0.14;
    const fstP = Math.max(0.14, 0.24 - ramp * 0.04);
    let x = r;
    if (x < tankP) return 'tank';
    x -= tankP;
    if (x < bomP) return 'bomber';
    x -= bomP;
    if (x < spiP) return 'spider';
    x -= spiP;
    if (x < ufoP) return 'ufo_drone';
    x -= ufoP;
    if (x < fstP) return 'fast';
    return 'normal';
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

export function spawnInvader() {
  spawnInvaderOfType(pickInvaderType());
}

export function spawnInvaderOfType(invType) {
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

export function spawnFormation() {
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

export function spawnHealer() {
  const side = Math.random() < 0.5 ? -1 : 1;
  game.healers.push({
    x: side < 0 ? -30 : W + 30, y: 80 + Math.random() * 100, w: 24, h: 24,
    vx: side < 0 ? 1.2 : -1.2, vy: 0.3 + Math.random() * 0.3, alive: true
  });
}
