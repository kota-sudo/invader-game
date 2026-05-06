/**
 * Events / notices tab screen (split from draw-screen-system.js)
 */
import { game } from '../game/game-store.js';
import { CANVAS_W as W, CANVAS_H as H } from '../game/constants.js';

let drawDeps;
let NOTICES;

export function setEventsScreenDrawDeps(deps) {
  drawDeps = deps;
  ({ NOTICES } = deps);
}

export function drawEventsScreen() {
  const ctx = drawDeps.ctx;
  const cx = W / 2;
  ctx.fillStyle = '#020408'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(6,10,22,1)'; ctx.fillRect(0, 0, W, 48);
  ctx.strokeStyle = 'rgba(50,80,140,0.5)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(0, 48); ctx.lineTo(W, 48); ctx.stroke();
  ctx.fillStyle = '#cce8ff'; ctx.font = 'bold 20px Orbitron,Courier New'; ctx.textAlign = 'left';
  ctx.shadowColor = '#44aaff'; ctx.shadowBlur = 8;
  ctx.fillText('イベント / お知らせ', 20, 30); ctx.shadowBlur = 0;
  const tabs = ['イベント', 'お知らせ'];
  const tabW = W / 2;
  if (!Number.isFinite(game.eventsTab)) game.eventsTab = 0;
  game._eventsTabHits = [];
  tabs.forEach((t, i) => {
    const active = game.eventsTab === i;
    ctx.fillStyle = active ? 'rgba(50,150,255,0.18)' : 'rgba(20,20,40,0.5)';
    ctx.fillRect(i * tabW, 48, tabW, 36);
    ctx.strokeStyle = active ? '#44aaff' : '#223'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(i * tabW, 84); ctx.lineTo((i + 1) * tabW, 84); ctx.stroke();
    ctx.fillStyle = active ? '#aaddff' : '#556'; ctx.font = '13px Orbitron,Courier New'; ctx.textAlign = 'center';
    ctx.fillText(t, i * tabW + tabW / 2, 70);
    game._eventsTabHits.push({ idx: i, x: i * tabW, y: 48, w: tabW, h: 36 });
  });
  const contentY = 92;
  if (game.eventsTab === 0) {
    const dow = new Date().getDay(), isWeekend = dow === 0 || dow === 6;
    const events = [
      { label: '週末EXP＆コインボーナス', active: isWeekend, desc: '土日はEXP・コイン獲得量が1.5倍！', color: '#ffcc44' },
      { label: 'デイリーミッション', active: true, desc: '毎日ミッションをクリアしてコインを獲得！', color: '#44ccff' },
      { label: 'ログインボーナス', active: true, desc: '連続ログインでジェムを集めよう！', color: '#ff88aa' },
    ];
    events.forEach((ev, i) => {
      const ey = contentY + i * 90;
      ctx.fillStyle = ev.active ? 'rgba(255,200,50,0.08)' : 'rgba(60,60,80,0.3)';
      ctx.beginPath(); ctx.roundRect(16, ey, W - 32, 76, 8); ctx.fill();
      ctx.strokeStyle = ev.active ? ev.color : '#334'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.roundRect(16, ey, W - 32, 76, 8); ctx.stroke();
      ctx.fillStyle = ev.active ? ev.color : '#446'; ctx.font = 'bold 10px Orbitron,Courier New'; ctx.textAlign = 'right';
      ctx.fillText(ev.active ? '開催中' : '準備中', W - 28, ey + 16);
      ctx.fillStyle = ev.active ? '#eee' : '#667'; ctx.font = 'bold 14px Orbitron,Courier New'; ctx.textAlign = 'left';
      ctx.fillText(ev.label, 28, ey + 22);
      ctx.fillStyle = '#889'; ctx.font = '11px Orbitron,Courier New';
      ctx.fillText(ev.desc, 28, ey + 44);
    });
  } else {
    NOTICES.forEach((n, i) => {
      const ny = contentY + i * 110;
      ctx.fillStyle = 'rgba(255,255,255,0.04)'; ctx.beginPath(); ctx.roundRect(16, ny, W - 32, 96, 8); ctx.fill();
      ctx.strokeStyle = '#234'; ctx.lineWidth = 1; ctx.beginPath(); ctx.roundRect(16, ny, W - 32, 96, 8); ctx.stroke();
      ctx.fillStyle = '#556'; ctx.font = '10px Orbitron,Courier New'; ctx.textAlign = 'right';
      ctx.fillText(n.date, W - 28, ny + 16);
      ctx.fillStyle = '#ccddff'; ctx.font = 'bold 13px Orbitron,Courier New'; ctx.textAlign = 'left';
      ctx.fillText(n.title, 28, ny + 24);
      ctx.fillStyle = '#778'; ctx.font = '11px Orbitron,Courier New';
      n.body.split('\n').forEach((line, li) => ctx.fillText(line, 28, ny + 44 + li * 16));
    });
  }
  ctx.textAlign = 'left';
}
