/**
 * Settings screen (split from draw-screen-system.js)
 */
import { game } from '../game/game-store.js';
import { CANVAS_W as W, CANVAS_H as H } from '../game/constants.js';

let drawDeps;

export function setSettingsScreenDrawDeps(deps) {
  drawDeps = deps;
}

export function drawSettingsScreen() {
  const ctx = drawDeps.ctx;
  const cx = W / 2;
  ctx.fillStyle = '#020408'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(6,10,22,1)'; ctx.fillRect(0, 0, W, 48);
  ctx.strokeStyle = 'rgba(50,80,140,0.5)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(0, 48); ctx.lineTo(W, 48); ctx.stroke();
  ctx.fillStyle = '#cce8ff'; ctx.font = 'bold 20px Orbitron,Courier New'; ctx.textAlign = 'left';
  ctx.shadowColor = '#44aaff'; ctx.shadowBlur = 8;
  ctx.fillText('設定', 20, 30); ctx.shadowBlur = 0;

  const ROW = 52, startY = 58, LX = 40, VX = W - 40;
  const rows = [
    { key: 'bgm', label: 'BGM', type: 'toggle' },
    { key: 'se', label: 'SE 音量', type: 'volume' },
    { key: 'vibration', label: 'バイブレーション', type: 'toggle' },
    { key: 'quality', label: '画質', type: 'select', opts: ['low', 'mid', 'high'], labels: ['低', '中', '高'] },
    { key: 'language', label: '言語', type: 'select', opts: ['ja', 'en'], labels: ['日本語', 'English'] },
    { key: 'titleScanlines', label: 'タイトル走査線', type: 'toggle' },
  ];
  game._settingsHits = [];
  rows.forEach((row, i) => {
    const ry = startY + i * ROW;
    ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.03)' : 'transparent';
    ctx.fillRect(0, ry - 8, W, ROW);
    ctx.fillStyle = '#aabbcc'; ctx.font = '14px Orbitron,Courier New'; ctx.textAlign = 'left';
    ctx.fillText(row.label, LX, ry + 14);
    if (row.type === 'toggle') {
      const val = game.settings?.[row.key] !== false;
      const tw = 76, th = 30, tx = VX - tw, ty = ry - 2;
      ctx.fillStyle = val ? 'rgba(0,180,80,0.3)' : 'rgba(60,60,60,0.3)';
      ctx.beginPath(); ctx.roundRect(tx, ty, tw, th, 15); ctx.fill();
      ctx.strokeStyle = val ? '#00cc44' : '#444'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.roundRect(tx, ty, tw, th, 15); ctx.stroke();
      const kx = val ? tx + tw - 14 - 4 : tx + 4;
      ctx.fillStyle = val ? '#00ff66' : '#666'; ctx.shadowColor = val ? '#00ff66' : 'transparent'; ctx.shadowBlur = val ? 6 : 0;
      ctx.beginPath(); ctx.arc(kx + 7, ty + th / 2, 9, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
      ctx.fillStyle = val ? '#00ff88' : '#555'; ctx.font = '9px Orbitron,Courier New'; ctx.textAlign = 'center';
      ctx.fillText(val ? 'ON' : 'OFF', tx + tw / 2, ty + th / 2 + 3);
      game._settingsHits.push({ key: row.key, type: 'toggle', x: tx - 8, y: ty - 4, w: tw + 16, h: th + 8 });
    } else if (row.type === 'volume') {
      const sv = game.masterVolume ?? 0.7;
      const sw = 260, sh = 22, sx = VX - sw, sy = ry - 2;
      ctx.fillStyle = '#111'; ctx.beginPath(); ctx.roundRect(sx, sy, sw, sh, 4); ctx.fill();
      ctx.fillStyle = '#006633'; ctx.beginPath(); ctx.roundRect(sx, sy, sw * sv, sh, 4); ctx.fill();
      ctx.fillStyle = '#00ff88'; ctx.shadowColor = '#00ff88'; ctx.shadowBlur = 5;
      ctx.beginPath(); ctx.roundRect(sx + sw * sv - 9, sy + 2, 18, sh - 4, 3); ctx.fill(); ctx.shadowBlur = 0;
      ctx.fillStyle = '#aaa'; ctx.font = '10px Orbitron,Courier New'; ctx.textAlign = 'right';
      ctx.fillText(`${Math.round(sv * 100)}%`, VX, sy - 3);
      game._settingsHits.push({ key: 'se_slider', type: 'slider', x: sx, y: sy - 8, w: sw, h: sh + 16 });
    } else if (row.type === 'select') {
      const n = row.opts.length, bw = 70, bh = 28, gap = 6;
      const totalW = n * (bw + gap) - gap, bx = VX - totalW;
      row.opts.forEach((opt, j) => {
        const ox = bx + j * (bw + gap), oy = ry - 2;
        const active = game.settings?.[row.key] === opt;
        ctx.fillStyle = active ? 'rgba(50,150,255,0.3)' : 'rgba(30,30,50,0.5)';
        ctx.beginPath(); ctx.roundRect(ox, oy, bw, bh, 5); ctx.fill();
        ctx.strokeStyle = active ? '#44aaff' : '#334'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.roundRect(ox, oy, bw, bh, 5); ctx.stroke();
        ctx.fillStyle = active ? '#aaddff' : '#556'; ctx.shadowColor = active ? '#44aaff' : 'transparent'; ctx.shadowBlur = active ? 4 : 0;
        ctx.font = '11px Orbitron,Courier New'; ctx.textAlign = 'center';
        ctx.fillText(row.labels[j], ox + bw / 2, oy + bh / 2 + 4); ctx.shadowBlur = 0;
        game._settingsHits.push({ key: row.key, type: 'select', val: opt, x: ox, y: oy, w: bw, h: bh });
      });
    }
  });
  const nameY = startY + rows.length * ROW + 8;
  ctx.fillStyle = rows.length % 2 === 0 ? 'rgba(255,255,255,0.03)' : 'transparent';
  ctx.fillRect(0, nameY - 8, W, ROW);
  ctx.fillStyle = '#aabbcc'; ctx.font = '14px Orbitron,Courier New'; ctx.textAlign = 'left';
  ctx.fillText('プレイヤー名（ローカル）', LX, nameY + 14);
  const ntx = VX - 200, nty = nameY - 2, ntw = 200, nth = 30;
  ctx.fillStyle = 'rgba(20,24,40,0.95)'; ctx.strokeStyle = '#556'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.roundRect(ntx, nty, ntw, nth, 8); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#dff'; ctx.font = '12px Orbitron,Courier New'; ctx.textAlign = 'center';
  ctx.fillText((game.displayName || 'PLAYER').slice(0, 12), ntx + ntw / 2, nty + nth / 2 + 4);
  game._settingsHits.push({ key: 'display_name', type: 'name_btn', x: ntx - 4, y: nty - 4, w: ntw + 8, h: nth + 8 });
  ctx.textAlign = 'left';

  const buY = nameY + ROW + 6;
  ctx.fillStyle = rows.length % 2 === 0 ? 'rgba(255,255,255,0.03)' : 'transparent';
  ctx.fillRect(0, buY - 6, W, ROW * 2 + 8);
  ctx.fillStyle = '#8899aa';
  ctx.font = '12px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif';
  ctx.fillText('セーブデータ（JSON）', LX, buY + 14);
  const bw = Math.floor((VX - LX - 20) / 2);
  const bx1 = LX;
  const bx2 = LX + bw + 12;
  const bty = buY + 22;
  const bh = 30;
  const drawSetBtn = (x, label, key) => {
    ctx.fillStyle = 'rgba(24, 32, 52, 0.92)';
    ctx.strokeStyle = 'rgba(80, 120, 200, 0.55)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(x, bty, bw, bh, 8);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#c8d8f0';
    ctx.font = 'bold 10px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(label, x + bw / 2, bty + bh / 2 + 4);
    ctx.textAlign = 'left';
    game._settingsHits.push({ key, type: key, x, y: bty - 2, w: bw, h: bh + 4 });
  };
  drawSetBtn(bx1, '書き出し', 'save_export');
  drawSetBtn(bx2, '読み込み', 'save_import');
  ctx.fillStyle = 'rgba(100, 115, 135, 0.9)';
  ctx.font = '9px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('※読み込み後はページが再読み込みされます', LX, bty + bh + 14);
}
