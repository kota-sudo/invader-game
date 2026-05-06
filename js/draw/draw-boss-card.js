import { hexToRgb } from '../game/color-utils.js';

let drawDeps;
export function setBossCardDrawDeps(deps) { drawDeps = deps; }

export function drawBossCardSprite(sx, sy, boss, t, r, isLit) {
  const ctx = drawDeps.ctx;
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
