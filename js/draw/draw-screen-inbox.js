/**
 * Inbox screen (split from draw-screen-system.js)
 */
import { game } from '../game/game-store.js';
import { CANVAS_W as W, CANVAS_H as H } from '../game/constants.js';

let drawDeps;

export function setInboxScreenDrawDeps(deps) {
  drawDeps = deps;
}

export function drawInboxScreen() {
  const ctx = drawDeps.ctx;
  const cx = W / 2;
  ctx.fillStyle = '#020408'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(6,10,22,1)'; ctx.fillRect(0, 0, W, 48);
  ctx.strokeStyle = 'rgba(50,80,140,0.5)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(0, 48); ctx.lineTo(W, 48); ctx.stroke();
  ctx.fillStyle = '#cce8ff'; ctx.font = 'bold 20px Orbitron,Courier New'; ctx.textAlign = 'left';
  ctx.shadowColor = '#44aaff'; ctx.shadowBlur = 8;
  ctx.fillText('受け取りボックス', 20, 30); ctx.shadowBlur = 0;

  const items = Array.isArray(game.inbox) ? game.inbox.filter(x => !x.claimed) : [];
  game._inboxHits = [];
  if (items.length === 0) {
    ctx.fillStyle = '#445'; ctx.font = '14px Orbitron,Courier New'; ctx.textAlign = 'center';
    ctx.fillText('受け取れるアイテムはありません', cx, 300);
    ctx.textAlign = 'left'; return;
  }
  const allBW = 200, allBH = 34, allBX = cx - allBW / 2, allBY = 56;
  ctx.fillStyle = 'rgba(0,180,80,0.2)'; ctx.beginPath(); ctx.roundRect(allBX, allBY, allBW, allBH, 6); ctx.fill();
  ctx.strokeStyle = '#00cc44'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.roundRect(allBX, allBY, allBW, allBH, 6); ctx.stroke();
  ctx.fillStyle = '#00ff88'; ctx.shadowColor = '#00ff88'; ctx.shadowBlur = 6;
  ctx.font = 'bold 13px Orbitron,Courier New'; ctx.textAlign = 'center';
  ctx.fillText('全て受け取る', cx, allBY + allBH / 2 + 5); ctx.shadowBlur = 0;
  game._inboxHits.push({ id: 'all', x: allBX, y: allBY, w: allBW, h: allBH });

  const iH = 70, startY = 100;
  items.slice(0, 8).forEach((it, i) => {
    const iy = startY + i * iH;
    ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.04)' : 'transparent';
    ctx.fillRect(0, iy, W, iH);
    ctx.fillStyle = '#cce8ff'; ctx.font = 'bold 13px Orbitron,Courier New'; ctx.textAlign = 'left';
    ctx.fillText(it.label || '報酬', 16, iy + 20);
    const parts = [];
    if (it.coins) parts.push(`● ${it.coins}`);
    if (it.gems) parts.push(`💎 ${it.gems}`);
    if (it.dust) parts.push(`✦ ${it.dust}`);
    if (it.fuel) parts.push(`⛽ ${it.fuel}`);
    ctx.fillStyle = '#ffd700'; ctx.font = '12px Orbitron,Courier New';
    ctx.fillText(parts.join('  '), 16, iy + 40);
    const daysLeft = Math.ceil((it.expiresAt - Date.now()) / 86400000);
    ctx.fillStyle = daysLeft <= 3 ? '#ff6644' : '#556'; ctx.font = '10px Orbitron,Courier New'; ctx.textAlign = 'right';
    ctx.fillText(`残り${daysLeft}日`, W - 110, iy + 20);
    const bw = 90, bh = 30, bx = W - bw - 10, by = iy + 20;
    ctx.fillStyle = 'rgba(0,180,80,0.2)'; ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 5); ctx.fill();
    ctx.strokeStyle = '#00cc44'; ctx.lineWidth = 1; ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 5); ctx.stroke();
    ctx.fillStyle = '#00ff88'; ctx.font = 'bold 11px Orbitron,Courier New'; ctx.textAlign = 'center';
    ctx.fillText('受け取る', bx + bw / 2, by + bh / 2 + 4);
    game._inboxHits.push({ id: it.id, x: bx, y: by, w: bw, h: bh });
  });
  if (items.length > 8) {
    ctx.fillStyle = '#445'; ctx.font = '10px Orbitron,Courier New'; ctx.textAlign = 'center';
    ctx.fillText(`他 ${items.length - 8} 件`, cx, startY + 8 * iH + 16);
  }
  ctx.textAlign = 'left';
}
