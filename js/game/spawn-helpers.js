import { game } from './game-store.js';
import { CANVAS_W as W, CANVAS_H as H } from './constants.js';

export function initAsteroids() {
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

export function spawnBoss() {
  const _d = game.bossDifficulty ?? 1;
  const _hpMul = [0.65, 1.0, 1.6][_d], _spdMul = [0.8, 1.0, 1.25][_d], _fireMul = [1.4, 1.0, 0.75][_d];
  const hp = Math.round((12 + game.stage * 6) * _hpMul);
  const ability = game.selectedBossAbility || (game.stage <= 2 ? 'burst' : game.stage <= 4 ? 'split' : game.stage <= 6 ? 'teleport' : game.stage <= 8 ? 'shield' : game.stage <= 10 ? 'dasher' : 'barrage');
  game.boss = {
    bossId: (game.stage === 1 ? 'dragonLord' : null),
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
    dashTimer: Math.max(60, 120 - game.stage * 5), _dashing: false, _dashVx: 0, _dashDuration: 0,
    barrageCharge: 0,
  };
  if (ability === 'shield') {
    game.boss.shieldMax = 10 + game.stage * 2;
    game.boss.shieldHp = game.boss.shieldMax;
    game.boss.shielded = true;
  }
  game.bossWarningTimer = 150; game.healerSpawnTimer = 0;
}

export function spawnDmgNum(x, y, val, isCrit = false, isHeal = false) {
  game.damageNumbers.push({ x, y: y - 10, val, isCrit, isHeal, timer: 55, vy: -1.8 });
}

export function spawnExplosion(x, y, color, count = 12) {
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
    const spd = 2 + Math.random() * 3;
    game.particles.push({
      x, y, vx: Math.cos(angle) * spd, vy: Math.sin(angle) * spd,
      life: 1.0, decay: 0.03 + Math.random() * 0.02, size: 3 + Math.random() * 4, color
    });
  }
}

export function trySpawnUFO() {
  if (!game.ufo && !game.bossPhase && Math.random() < 0.003)
    game.ufo = {
      x: -60, y: 30, w: 56, h: 24, speed: 2 + Math.random(),
      points: [50, 100, 150, 200, 300][Math.floor(Math.random() * 5)]
    };
}

export function spawnPowerup(x, y) {
  const r = Math.random();
  if (r < 0.04) game.powerups.push({ x: x - 12, y, w: 24, h: 16, vy: 1.5, type: 'heal' });
  else if (r < 0.07) game.powerups.push({ x: x - 12, y, w: 24, h: 16, vy: 1.5, type: 'shield' });
  else if (r < 0.19) {
    const types = ['double', 'invincible', 'wide'];
    game.powerups.push({ x: x - 12, y, w: 24, h: 16, vy: 1.5, type: types[Math.floor(Math.random() * 3)] });
  }
}
