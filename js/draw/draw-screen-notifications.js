/**
 * Notifications screen (split from draw-screen-system.js)
 */
import { game } from '../game/game-store.js';
import { CANVAS_W as W, CANVAS_H as H } from '../game/constants.js';

let drawDeps;
let NOTICES;

export function setNotificationsScreenDrawDeps(deps) {
  drawDeps = deps;
  ({ NOTICES } = deps);
}

export function drawNotificationsScreen() {
  const ctx = drawDeps.ctx;
  const cx = W / 2;
  ctx.fillStyle = '#020408'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(6,10,22,1)'; ctx.fillRect(0, 0, W, 48);
  ctx.strokeStyle = 'rgba(50,80,140,0.5)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(0, 48); ctx.lineTo(W, 48); ctx.stroke();
  ctx.fillStyle = '#cce8ff'; ctx.font = 'bold 20px Orbitron,Courier New'; ctx.textAlign = 'left';
  ctx.shadowColor = '#44aaff'; ctx.shadowBlur = 8;
  ctx.fillText('🔔  通知', 20, 30); ctx.shadowBlur = 0;

  // 3タブ
  const tabs = ['📬 受け取り', '📅 イベント', '📢 お知らせ'];
  const tabW = W / 3;
  if (!Number.isFinite(game.notifTab)) game.notifTab = 0;
  game._notifTabHits = [];
  tabs.forEach((t, i) => {
    const active = game.notifTab === i;
    ctx.fillStyle = active ? 'rgba(50,150,255,0.18)' : 'rgba(20,20,40,0.5)';
    ctx.fillRect(i * tabW, 48, tabW, 36);
    ctx.strokeStyle = active ? '#44aaff' : '#223'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(i * tabW, 84); ctx.lineTo((i + 1) * tabW, 84); ctx.stroke();
    ctx.fillStyle = active ? '#aaddff' : '#556'; ctx.font = '11px Orbitron,Courier New'; ctx.textAlign = 'center';
    ctx.fillText(t, i * tabW + tabW / 2, 70);
    game._notifTabHits.push({ idx: i, x: i * tabW, y: 48, w: tabW, h: 36 });
    // バッジ（受け取りのみ）
    if (i === 0) {
      const cnt = Array.isArray(game.inbox) ? game.inbox.filter(x => !x.claimed).length : 0;
      if (cnt > 0) {
        ctx.fillStyle = '#ff3344'; ctx.beginPath(); ctx.arc(i * tabW + tabW / 2 + 28, 56, 9, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.font = 'bold 9px Orbitron,Courier New';
        ctx.fillText(String(cnt), i * tabW + tabW / 2 + 28, 60);
      }
    }
  });

  const contentY = 92;
  ctx.save();
  if (game.notifTab === 0) {
    // 受け取り
    const items = Array.isArray(game.inbox) ? game.inbox.filter(x => !x.claimed) : [];
    game._inboxHits = [];
    if (items.length === 0) {
      ctx.fillStyle = '#445'; ctx.font = '13px Orbitron,Courier New'; ctx.textAlign = 'center';
      ctx.fillText('受け取れるアイテムはありません', cx, 300);
    } else {
      const allBW = 190, allBH = 32, allBX = cx - allBW / 2, allBY = contentY + 2;
      ctx.fillStyle = 'rgba(0,180,80,0.2)'; ctx.beginPath(); ctx.roundRect(allBX, allBY, allBW, allBH, 6); ctx.fill();
      ctx.strokeStyle = '#00cc44'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.roundRect(allBX, allBY, allBW, allBH, 6); ctx.stroke();
      ctx.fillStyle = '#00ff88'; ctx.shadowColor = '#00ff88'; ctx.shadowBlur = 5;
      ctx.font = 'bold 12px Orbitron,Courier New'; ctx.textAlign = 'center';
      ctx.fillText('全て受け取る', cx, allBY + allBH / 2 + 4); ctx.shadowBlur = 0;
      game._inboxHits.push({ id: 'all', x: allBX, y: allBY, w: allBW, h: allBH });
      const iH = 60;
      items.slice(0, 6).forEach((it, i) => {
        const iy = contentY + 38 + i * iH;
        ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.04)' : 'transparent';
        ctx.fillRect(0, iy, W, iH);
        ctx.fillStyle = '#cce8ff'; ctx.font = 'bold 12px Orbitron,Courier New'; ctx.textAlign = 'left';
        ctx.fillText(it.label || '報酬', 16, iy + 16);
        const parts = []; if (it.coins) parts.push(`● ${it.coins}`); if (it.gems) parts.push(`💎 ${it.gems}`); if (it.fuel) parts.push(`⛽ ${it.fuel}`);
        ctx.fillStyle = '#ffd700'; ctx.font = '12px Orbitron,Courier New';
        ctx.fillText(parts.join('  '), 16, iy + 34);
        const daysLeft = Math.ceil((it.expiresAt - Date.now()) / 86400000);
        ctx.fillStyle = daysLeft <= 3 ? '#ff6644' : '#445'; ctx.font = '9px Orbitron,Courier New'; ctx.textAlign = 'right';
        ctx.fillText(`残り${daysLeft}日`, W - 110, iy + 16);
        const bw = 86, bh = 26, bx = W - bw - 10, by = iy + 16;
        ctx.fillStyle = 'rgba(0,180,80,0.2)'; ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 5); ctx.fill();
        ctx.strokeStyle = '#00cc44'; ctx.lineWidth = 1; ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 5); ctx.stroke();
        ctx.fillStyle = '#00ff88'; ctx.font = '11px Orbitron,Courier New'; ctx.textAlign = 'center';
        ctx.fillText('受け取る', bx + bw / 2, by + bh / 2 + 4);
        game._inboxHits.push({ id: it.id, x: bx, y: by, w: bw, h: bh });
      });
    }
  } else if (game.notifTab === 1) {
    // イベント
    const dow = new Date().getDay(), isWeekend = dow === 0 || dow === 6;
    const events = [
      { label: '週末EXP＆コインボーナス', active: isWeekend, desc: '土日はEXP・コイン獲得量が1.5倍！', color: '#ffcc44' },
      { label: 'デイリーミッション', active: true, desc: '毎日ミッションをクリアしてコインを獲得！', color: '#44ccff' },
      { label: 'ログインボーナス', active: true, desc: '連続ログインでジェムを集めよう！', color: '#ff88aa' },
    ];
    events.forEach((ev, i) => {
      const ey = contentY + i * 96;
      ctx.fillStyle = ev.active ? 'rgba(255,200,50,0.08)' : 'rgba(60,60,80,0.3)';
      ctx.beginPath(); ctx.roundRect(16, ey, W - 32, 82, 8); ctx.fill();
      ctx.strokeStyle = ev.active ? ev.color : '#334'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.roundRect(16, ey, W - 32, 82, 8); ctx.stroke();
      ctx.fillStyle = ev.active ? ev.color : '#446'; ctx.font = 'bold 10px Orbitron,Courier New'; ctx.textAlign = 'right';
      ctx.fillText(ev.active ? '開催中' : '準備中', W - 28, ey + 16);
      ctx.fillStyle = ev.active ? '#eee' : '#667'; ctx.font = 'bold 13px Orbitron,Courier New'; ctx.textAlign = 'left';
      ctx.fillText(ev.label, 28, ey + 22);
      ctx.fillStyle = '#889'; ctx.font = '11px Orbitron,Courier New';
      ctx.fillText(ev.desc, 28, ey + 44);
    });
  } else {
    // お知らせ
    NOTICES.forEach((n, i) => {
      const ny = contentY + i * 110;
      ctx.fillStyle = 'rgba(255,255,255,0.04)'; ctx.beginPath(); ctx.roundRect(16, ny, W - 32, 96, 8); ctx.fill();
      ctx.strokeStyle = '#234'; ctx.lineWidth = 1; ctx.beginPath(); ctx.roundRect(16, ny, W - 32, 96, 8); ctx.stroke();
      ctx.fillStyle = '#445'; ctx.font = '10px Orbitron,Courier New'; ctx.textAlign = 'right';
      ctx.fillText(n.date, W - 28, ny + 16);
      ctx.fillStyle = '#ccddff'; ctx.font = 'bold 13px Orbitron,Courier New'; ctx.textAlign = 'left';
      ctx.fillText(n.title, 28, ny + 24);
      ctx.fillStyle = '#778'; ctx.font = '11px Orbitron,Courier New';
      n.body.split('\n').forEach((line, li) => ctx.fillText(line, 28, ny + 44 + li * 16));
    });
  }
  ctx.restore();
  ctx.textAlign = 'left';
}
