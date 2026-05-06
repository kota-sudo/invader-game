/**
 * IAP shop screen (split from draw-screen-system.js)
 */
import { game } from '../game/game-store.js';
import { CANVAS_W as W, CANVAS_H as H } from '../game/constants.js';

let drawDeps;
let IAP_PACKAGES;

export function setIapScreenDrawDeps(deps) {
  drawDeps = deps;
  ({ IAP_PACKAGES } = deps);
}

export function drawIAPScreen() {
  const ctx = drawDeps.ctx;
  const cx = W / 2;
  ctx.fillStyle = '#020408'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(6,10,22,1)'; ctx.fillRect(0, 0, W, 48);
  ctx.strokeStyle = 'rgba(50,80,140,0.5)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(0, 48); ctx.lineTo(W, 48); ctx.stroke();
  ctx.fillStyle = '#cce8ff'; ctx.font = 'bold 20px Orbitron,Courier New'; ctx.textAlign = 'left';
  ctx.shadowColor = '#ffdd44'; ctx.shadowBlur = 8;
  ctx.fillText('アイテム購入', 20, 30); ctx.shadowBlur = 0;
  if (!game.ageVerified) {
    ctx.fillStyle = 'rgba(0,0,0,0.88)'; ctx.fillRect(0, 48, W, H - 48);
    const pw = 440, ph = 250, px = cx - pw / 2, py = H / 2 - ph / 2;
    ctx.fillStyle = 'rgba(10,12,24,0.97)'; ctx.beginPath(); ctx.roundRect(px, py, pw, ph, 14); ctx.fill();
    ctx.strokeStyle = '#ffcc44'; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(px, py, pw, ph, 14); ctx.stroke();
    ctx.fillStyle = '#ffcc44'; ctx.font = 'bold 18px Orbitron,Courier New'; ctx.textAlign = 'center';
    ctx.shadowColor = '#ffcc44'; ctx.shadowBlur = 10;
    ctx.fillText('年齢確認', cx, py + 44); ctx.shadowBlur = 0;
    ctx.fillStyle = '#aab'; ctx.font = '12px Orbitron,Courier New';
    ctx.fillText('このコンテンツは18歳以上を対象としています。', cx, py + 80);
    ctx.fillText('あなたは18歳以上ですか？', cx, py + 104);
    const bw = 160, bh = 40;
    ctx.fillStyle = 'rgba(0,180,80,0.25)'; ctx.beginPath(); ctx.roundRect(cx - bw - 12, py + 140, bw, bh, 8); ctx.fill();
    ctx.strokeStyle = '#00cc44'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.roundRect(cx - bw - 12, py + 140, bw, bh, 8); ctx.stroke();
    ctx.fillStyle = '#00ff88'; ctx.shadowColor = '#00ff88'; ctx.shadowBlur = 6;
    ctx.font = 'bold 13px Orbitron,Courier New';
    ctx.fillText('はい（18歳以上）', cx - bw / 2 - 12, py + 140 + bh / 2 + 5); ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(180,50,50,0.2)'; ctx.beginPath(); ctx.roundRect(cx + 12, py + 140, bw, bh, 8); ctx.fill();
    ctx.strokeStyle = '#cc3333'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.roundRect(cx + 12, py + 140, bw, bh, 8); ctx.stroke();
    ctx.fillStyle = '#ff7777'; ctx.font = 'bold 13px Orbitron,Courier New';
    ctx.fillText('いいえ', cx + bw / 2 + 12, py + 140 + bh / 2 + 5);
    game._iapAgeHits = [
      { type: 'yes', x: cx - bw - 12, y: py + 140, w: bw, h: bh },
      { type: 'no', x: cx + 12, y: py + 140, w: bw, h: bh },
    ];
    ctx.textAlign = 'left'; return;
  }
  game._iapAgeHits = null;
  const GX = 16, GW = (W - GX * 2 - 12) / 2, GH = 90, GAP = 12;
  game._iapHits = [];
  IAP_PACKAGES.forEach((pkg, i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const px = GX + col * (GW + GAP), py = 58 + row * (GH + GAP);
    ctx.fillStyle = 'rgba(10,16,32,0.95)'; ctx.beginPath(); ctx.roundRect(px, py, GW, GH, 8); ctx.fill();
    ctx.strokeStyle = 'rgba(80,120,200,0.4)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.roundRect(px, py, GW, GH, 8); ctx.stroke();
    if (pkg.tag) {
      ctx.fillStyle = '#ff8800'; ctx.beginPath(); ctx.roundRect(px + GW - 52, py, 50, 18, 4); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = 'bold 9px Orbitron,Courier New'; ctx.textAlign = 'center';
      ctx.fillText(pkg.tag, px + GW - 27, py + 12);
    }
    ctx.font = '20px Courier New'; ctx.textAlign = 'left';
    ctx.fillText(pkg.icon, px + 10, py + 28);
    ctx.fillStyle = '#cce8ff'; ctx.font = 'bold 12px Orbitron,Courier New';
    ctx.fillText(pkg.label, px + 44, py + 22);
    if (pkg.bonus) { ctx.fillStyle = '#ffcc44'; ctx.font = '10px Orbitron,Courier New'; ctx.fillText(pkg.bonus, px + 44, py + 38); }
    if (pkg.sub) { ctx.fillStyle = '#88aaff'; ctx.font = '10px Orbitron,Courier New'; ctx.fillText('サブスクリプション', px + 10, py + 54); }
    const pbw = GW - 16, pbh = 26, pbx = px + 8, pby = py + GH - 34;
    ctx.fillStyle = 'rgba(255,200,0,0.2)'; ctx.beginPath(); ctx.roundRect(pbx, pby, pbw, pbh, 5); ctx.fill();
    ctx.strokeStyle = '#ffcc44'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.roundRect(pbx, pby, pbw, pbh, 5); ctx.stroke();
    ctx.fillStyle = '#ffdd44'; ctx.shadowColor = '#ffdd44'; ctx.shadowBlur = 5;
    ctx.font = 'bold 13px Orbitron,Courier New'; ctx.textAlign = 'center';
    ctx.fillText(`¥${pkg.price.toLocaleString()}${pkg.sub ? '/月' : ''}`, pbx + pbw / 2, pby + pbh / 2 + 5); ctx.shadowBlur = 0;
    game._iapHits.push({ id: pkg.id, x: pbx, y: pby, w: pbw, h: pbh, pkg });
  });
  const noteY = 58 + Math.ceil(IAP_PACKAGES.length / 2) * (GH + GAP) + 4;
  if (noteY < H - 30) {
    ctx.fillStyle = '#334'; ctx.font = '9px Orbitron,Courier New'; ctx.textAlign = 'center';
    ctx.fillText('※ 現在テスト表示中です。実際の購入機能は未実装です。', cx, noteY);
    ctx.fillText('※ 18歳未満の方はご利用になれません。', cx, noteY + 14);
  }
  ctx.textAlign = 'left';
}
