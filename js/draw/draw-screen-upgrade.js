/**
 * Post-stage upgrade picker screen (split from draw-screen-system.js)
 */
import { game } from '../game/game-store.js';
import { CANVAS_W as W, CANVAS_H as H } from '../game/constants.js';

let drawDeps;

export function setUpgradeScreenDrawDeps(deps) {
  drawDeps = deps;
}

export function drawUpgradeScreen() {
  const ctx = drawDeps.ctx;
  ctx.fillStyle = 'rgba(0,0,0,0.85)'; ctx.fillRect(0, 0, W, H);
  // ランクバッジ
  if (game.stageRank) {
    const rcol = { S: '#ff0', A: '#0f0', B: '#0cf', C: '#aaa' }[game.stageRank];
    ctx.shadowColor = rcol; ctx.shadowBlur = 30;
    ctx.fillStyle = rcol; ctx.font = 'bold 72px Orbitron,Courier New'; ctx.textAlign = 'right';
    ctx.fillText(game.stageRank, W - 40, 100); ctx.shadowBlur = 0;
    ctx.fillStyle = rcol; ctx.font = '11px Orbitron,Courier New';
    ctx.fillText(`HIT:${game.stageStats.hits}  COMBO:${game.stageStats.maxCombo}`, W - 40, 115);
  }
  ctx.fillStyle = '#fff'; ctx.font = 'bold 28px Orbitron,Courier New'; ctx.textAlign = 'center';
  ctx.shadowColor = '#ff0'; ctx.shadowBlur = 20;
  ctx.fillText('UPGRADE  SELECT', W / 2, 80); ctx.shadowBlur = 0;
  ctx.font = '14px Orbitron,Courier New'; ctx.fillStyle = '#aaa';
  ctx.fillText('1 / 2 / 3 キーで選択', W / 2, 115);
  game.upgradeChoices.forEach((up, i) => {
    const x = 80 + i * 230, y = 160, w = 200, h = 260;
    ctx.fillStyle = 'rgba(10,10,30,0.9)'; ctx.strokeStyle = up.color; ctx.lineWidth = 2;
    ctx.shadowColor = up.color; ctx.shadowBlur = 15;
    ctx.beginPath(); ctx.roundRect(x, y, w, h, 12); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;
    ctx.fillStyle = up.color; ctx.font = 'bold 36px Orbitron,Courier New'; ctx.textAlign = 'center';
    ctx.fillText(`${i + 1}`, x + w / 2, y + 52);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 14px Orbitron,Courier New';
    ctx.fillText(up.label, x + w / 2, y + 96);
    ctx.fillStyle = '#aaa'; ctx.font = '12px Orbitron,Courier New';
    const words = up.desc; let line = '', ly = y + 126;
    for (const ch of words) {
      if (ctx.measureText(line + ch).width > w - 20) { ctx.fillText(line, x + w / 2, ly); line = ch; ly += 20; }
      else line += ch;
    }
    if (line) ctx.fillText(line, x + w / 2, ly);
  });
  ctx.textAlign = 'left'; ctx.lineWidth = 1;
}

