import { game } from './game-store.js';
import { INVADER_BULLET_SPEED } from './constants.js';

export function pickBossPattern() {
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
  const all = {
    burst: ['sweep', 'circle', 'aimed', 'spread'], split: ['spread', 'circle', 'aimed', 'wall'],
    teleport: ['aimed', 'circle', 'wall', 'sweep'], shield: ['wall', 'circle', 'aimed', 'spread']
  };
  const pool = (all[ab] || ['spread', 'circle', 'wall', 'aimed']);
  return pool[Math.floor(Math.random() * pool.length)];
}

export function fireBossPattern(pattern, { playSound }) {
  if (!game.boss) return;
  const cx = game.boss.x + game.boss.w / 2, cy = game.boss.y + game.boss.h;
  const bspd = INVADER_BULLET_SPEED;
  const mk = (vx, vy, opts = {}) => ({ x: cx - 3, y: cy, w: 6, h: 14, vx, vy, ...opts });
  switch (pattern) {
    case 'triple':
      [-0.38, 0, 0.38].forEach(a => game.invaderBullets.push(mk(Math.sin(a) * bspd * 0.85, Math.cos(a) * bspd * 0.72)));
      break;
    case 'aimed': {
      const tx = game.boss.aimTarget?.x ?? game.player.x + game.player.w / 2;
      const ty = game.boss.aimTarget?.y ?? game.player.y + game.player.h / 2;
      const dx = tx - cx, dy = ty - cy, len = Math.sqrt(dx * dx + dy * dy) || 1;
      game.invaderBullets.push({ x: cx - 4, y: cy, w: 9, h: 18, aimed: true, vx: (dx / len) * bspd * 0.75, vy: (dy / len) * bspd * 0.75 });
      break;
    }
    case 'spread':
      [-0.55, -0.26, 0, 0.26, 0.55].forEach(a => game.invaderBullets.push(mk(Math.sin(a) * bspd, Math.cos(a) * bspd * 0.68)));
      break;
    case 'circle':
      for (let i = 0; i < 8; i++) {
        const a = Math.PI * 2 * i / 8 + Math.PI / 8;
        game.invaderBullets.push(mk(Math.cos(a) * bspd * 0.82, Math.sin(a) * bspd * 0.82));
      }
      break;
    case 'sweep':
      [-0.55, -0.27, 0, 0.27, 0.55].forEach((a, i) => {
        setTimeout(() => {
          if (!game.boss) return;
          const bx = game.boss.x + game.boss.w / 2;
          game.invaderBullets.push({ x: bx - 3, y: game.boss.y + game.boss.h, w: 6, h: 14, vx: Math.sin(a) * bspd * 0.9, vy: Math.cos(a) * bspd * 0.65 });
        }, i * 110);
      });
      break;
    case 'wall': {
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
