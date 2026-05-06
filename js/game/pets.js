import { game, actions } from './game-store.js';
import { PET_POOL } from '../game-data.js';
import { BULLET_SPEED } from './constants.js';
import { playSound } from './audio.js';

export function getPetParams(effect, level) {
  const lv = Math.max(1, level || 1);
  const bonus = (lv - 1) * 0.01;
  const FPS = 60;
  const base = {
    dragon: { intervalFrames: 180 },
    hawk: { intervalFrames: 180 },
    bomber: { intervalFrames: 480 },
    ghost: { intervalFrames: 600, durationFrames: 70 },
    fenrir: { intervalFrames: 180 },
  }[effect] || { intervalFrames: 180 };
  const intervalFrames = Math.max(FPS, Math.round(base.intervalFrames / (1 + bonus)));
  const durationFrames = base.durationFrames ? Math.max(1, Math.round(base.durationFrames * (1 + bonus))) : 0;
  return { intervalFrames, durationFrames, bonus };
}

export function updatePets() {
  if (!game.player || game.state !== 'playing') return;
  const activePets = game.playerLoadout.pets.map((pid, i) => {
    if (!pid || !game.gachaInventory[pid]) return null;
    return { def: PET_POOL.find(p => p.id === pid), idx: i, pid, inv: game.gachaInventory[pid] };
  }).filter(Boolean);
  for (const { def, idx, pid, inv } of activePets) {
    const lv = (inv?.level) || 1;
    const pp = getPetParams(def.effect, lv);
    if (def.effect === 'dragon') {
      game.petTimers.dragon = (game.petTimers.dragon || 0) + 1;
      if (game.petTimers.dragon >= pp.intervalFrames) {
        game.petTimers.dragon = 0;
        const cx = game.player.x + game.player.w / 2;
        game.bullets.push({ x: cx - 5, y: game.player.y - 10, w: 10, h: 10, explosive: true, bspd: BULLET_SPEED + 2, petBullet: true });
        playSound('shoot_expl');
      }
    }
    if (def.effect === 'hawk') {
      game.petTimers.hawk = (game.petTimers.hawk || 0) + 1;
      if (game.petTimers.hawk >= pp.intervalFrames) {
        game.petTimers.hawk = 0;
        let target = null, minDist = Infinity;
        const cands = [...game.invaders.filter(i => i.alive), ...(game.boss ? [game.boss] : []), ...game.miniBosses.filter(m => m.alive)];
        const cx = game.player.x + game.player.w / 2;
        for (const t of cands) { const d = Math.hypot((t.x + t.w / 2) - cx, (t.y + t.h / 2) - game.player.y); if (d < minDist) { minDist = d; target = t; } }
        game.bullets.push({ x: cx - 3, y: game.player.y - 10, w: 6, h: 14, homing: true, target, bspd: BULLET_SPEED, vx: 0, vy: -BULLET_SPEED, petBullet: true });
        playSound('shoot_homing');
      }
    }
    if (def.effect === 'bomber') {
      game.petTimers.bomber = (game.petTimers.bomber || 0) + 1;
      if (game.petTimers.bomber >= pp.intervalFrames) {
        game.petTimers.bomber = 0;
        const cands = [...game.invaders.filter(i => i.alive), ...(game.boss ? [game.boss] : [])];
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
    if (def.effect === 'ghost') {
      game.petTimers.ghost = (game.petTimers.ghost || 0) + 1;
      if (game.petTimers.ghost >= pp.intervalFrames) {
        game.petTimers.ghost = 0;
        game.player.invincibleTimer = Math.max(game.player.invincibleTimer || 0, (pp.durationFrames || 70));
        actions.triggerFlash(180, 180, 255, 0.25);
        game.lifeGainDisplay = { text: 'GHOST: 無敵発動!', timer: 90, color: '#aaaaff' };
      }
    }
    if (def.effect === 'fenrir') {
      game.petTimers.fenrir = (game.petTimers.fenrir || 0) + 1;
      if (game.petTimers.fenrir >= pp.intervalFrames) {
        game.petTimers.fenrir = 0;
        const cx = game.player.x + game.player.w / 2, cy = game.player.y + game.player.h / 2;
        for (let d = 0; d < 8; d++) {
          const a = (d / 8) * Math.PI * 2;
          game.bullets.push({ x: cx - 4, y: cy - 4, w: 8, h: 8, vx: Math.cos(a) * (BULLET_SPEED + 3), vy: Math.sin(a) * (BULLET_SPEED + 3), bspd: BULLET_SPEED + 3, petBullet: true });
        }
        actions.triggerFlash(255, 34, 102, 0.2);
        playSound('shoot_expl');
      }
    }
  }
}
