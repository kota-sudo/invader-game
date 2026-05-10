import { game, actions } from './game-store.js';
import { BULLET_SPEED } from './constants.js';
import { playSound, vibrate } from './audio.js';
import { spawnExplosion } from './spawn-helpers.js';
import { isMilestoneComplete } from './shop-logic.js';

export function rectsOverlap(a, b) { return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; }

export function checkPlayerHit() {
  if (game.powerupActive === 'invincible' || game.player.invincibleTimer > 0) return;
  for (let i = game.invaderBullets.length - 1; i >= 0; i--) {
    if (rectsOverlap(game.invaderBullets[i], game.player)) {
      const _rb = game.invaderBullets[i];
      game.invaderBullets.splice(i, 1);
      if (isMilestoneComplete('t3_reflect')) {
        const _rv = Math.abs(_rb.vy || 4) * 1.3;
        game.bullets.push({
          x: _rb.x, y: _rb.y, w: _rb.w || 6, h: _rb.h || 6,
          vx: -(_rb.vx || 0), vy: -_rv, bspd: _rv, reflected: true
        });
      }
      if (game.playerShield || (game.chaosBuff?.type === 'shield' && (game.chaosBuff.timer || 0) > 0)) { absorbWithShield(); return; }
      onPlayerHit(); return;
    }
  }
  for (const inv of game.invaders.filter(i => i.alive)) {
    if (rectsOverlap(inv, game.player)) {
      if (game.playerShield || (game.chaosBuff?.type === 'shield' && (game.chaosBuff.timer || 0) > 0)) { absorbWithShield(); return; }
      onPlayerHit(); return;
    }
  }
}

export function fireCounterShot() {
  if (!game.player) return;
  const cx = game.player.x + game.player.w / 2, cy = game.player.y + game.player.h / 2;
  for (let a = -30; a <= 30; a += 30) {
    const rad = (-Math.PI / 2) + (a * Math.PI / 180);
    game.bullets.push({ x: cx - 3, y: cy, w: 6, h: 12, vx: Math.cos(rad) * (BULLET_SPEED + 2), vy: Math.sin(rad) * (BULLET_SPEED + 2), bspd: BULLET_SPEED + 2, petBullet: true });
  }
  playSound('shoot');
}

export function absorbWithShield() {
  game.playerShield = false; actions.triggerFlash(50, 150, 255, 0.4); actions.triggerShake(6, 8);
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

export function onPlayerHit() {
  game.stageStats.hits++;
  actions.addUltimateGauge(12);
  const turtleMod = actions.getPetEffect('turtle') ? 0.85 : 1;
  const _arm1Red = (game.shopUpgrades?.arm1 || 0) * 2;
  const dmg = Math.max(1, Math.floor(25 * (1 - game.playerStats.def / 100) * turtleMod) - _arm1Red);
  game.playerStats.hp = Math.max(0, game.playerStats.hp - dmg);
  if ((game.shopUpgrades?.arm3 || 0) >= 1) {
    const _spikeDmg = Math.max(1, Math.floor(dmg * (game.shopUpgrades.arm3 * 0.30)));
    const _pcx = game.player.x + game.player.w / 2, _pcy = game.player.y + game.player.h / 2;
    for (const inv of game.invaders) {
      if (!inv.alive) continue;
      const _dx = inv.x + inv.w / 2 - _pcx, _dy = inv.y + inv.h / 2 - _pcy;
      if (Math.sqrt(_dx * _dx + _dy * _dy) < 100) {
        inv.hp = Math.max(0, (inv.hp || 1) - _spikeDmg);
        if (inv.hp <= 0) inv.alive = false;
        spawnExplosion(inv.x + inv.w / 2, inv.y + inv.h / 2, '#ffaa44', 5);
      }
    }
  }
  if (actions.getPetEffect('heal') && game.playerStats.hp > 0) game.playerStats.hp = Math.min(game.playerStats.maxHp, game.playerStats.hp + 15);
  actions.updateHUD();
  spawnExplosion(game.player.x + game.player.w / 2, game.player.y + game.player.h / 2, '#0f0', 20);
  actions.triggerShake(12, 15); actions.triggerFlash(255, 0, 0, 0.4); game.hitFlashTimer = 40;
  playSound('player_hit'); vibrate([80, 30, 30]);
  if (game.playerStats.hp <= 0) {
    if (actions.getPetEffect('valkyrie') && !game.player._valkyrieUsed) {
      game.player._valkyrieUsed = true;
      game.playerStats.hp = 60; actions.updateHUD();
      game.player.invincibleTimer = 180;
      actions.triggerFlash(255, 34, 102, 0.6);
      game.lifeGainDisplay = { text: '★ VALKYRIE 復活!! HP60 ★', timer: 120, color: '#ff2266' };
      return;
    }
    actions.triggerGameOver(); return;
  }
  if (actions.getPetEffect('phoenix') && game.playerStats.hp <= game.playerStats.maxHp * 0.3) {
    game.player.invincibleTimer = Math.max(game.player.invincibleTimer, 120);
    game.lifeGainDisplay = { text: 'PHOENIX  無敵発動！', timer: 90, color: '#f80' };
  } else {
    game.lifeGainDisplay = { text: `HP  -${dmg}  (${game.playerStats.hp}/${game.playerStats.maxHp})`, timer: 90, color: '#f44' };
  }
  game.player.invincibleTimer = Math.max(game.player.invincibleTimer, 120 + game.playerUpgrades.invincibleBonus);
  if (game.gachaInventory['passive_counter']?.level >= 1) fireCounterShot();
}
