/**
 * IAP shop screen (split from draw-screen-system.js)
 */
import { game } from '../game/game-store.js';
import { CANVAS_W as W, CANVAS_H as H } from '../game/constants.js';
import { formatCardDisplay, formatExpDisplay } from '../game/iap-cc-input.js';

let drawDeps;
let IAP_PACKAGES;

export function setIapScreenDrawDeps(deps) {
  drawDeps = deps;
  ({ IAP_PACKAGES } = deps);
}

/** @param {{ pkg: object, phase: string, resultLines?: string[], cvsRef?: string }} modal */
function drawIapPurchaseModal(ctx, cx, modal) {
  const pkg = modal.pkg;
  const phase = modal.phase;
  if (phase !== 'cc') {
    game._iapCcFieldHits = null;
    game._iapCcKeyHits = null;
  }
  ctx.save();
  ctx.fillStyle = 'rgba(0, 6, 18, 0.78)';
  ctx.fillRect(0, 0, W, H);
  const mw = Math.min(440, W - 24);
  let mh = 318;
  if (phase === 'success') mh = Math.min(300, H - 80);
  else if (phase === 'payment') mh = Math.min(340, H - 56);
  else if (phase === 'cc') mh = Math.min(460, H - 36);
  else if (phase === 'cvs') mh = Math.min(350, H - 56);
  mh = Math.min(mh, H - 40);
  const mx = cx - mw / 2;
  const my = Math.floor(H / 2 - mh / 2);
  ctx.fillStyle = 'rgba(6, 12, 26, 0.97)';
  ctx.beginPath(); ctx.roundRect(mx, my, mw, mh, 14); ctx.fill();
  ctx.strokeStyle = 'rgba(80, 255, 160, 0.95)';
  ctx.lineWidth = 3;
  ctx.shadowColor = 'rgba(60, 220, 140, 0.45)'; ctx.shadowBlur = 12;
  ctx.beginPath(); ctx.roundRect(mx, my, mw, mh, 14); ctx.stroke(); ctx.shadowBlur = 0;

  ctx.textAlign = 'center';
  const priceStr = `¥${pkg.price.toLocaleString()}${pkg.sub ? '/月' : ''}`;
  const hits = [];
  const bh = 38;
  const pad = 20;
  const innerW = mw - pad * 2;

  if (phase === 'confirm') {
    ctx.fillStyle = '#88ffcc'; ctx.font = 'bold 15px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif';
    ctx.fillText('テスト購入（決済シミュレーション）', cx, my + 36);
    ctx.fillStyle = '#e8f4ff'; ctx.font = 'bold 18px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif';
    ctx.fillText(`${pkg.icon} ${pkg.label}`, cx, my + 68);
    let ly = my + 92;
    if (pkg.gems > 0) {
      ctx.fillStyle = '#aadeff'; ctx.font = 'bold 22px Orbitron,Courier New';
      ctx.fillText(`ジェム ${pkg.gems}個`, cx, ly); ly += 34;
    }
    if (pkg.bonus) {
      ctx.fillStyle = 'rgba(255, 200, 120, 0.95)'; ctx.font = '11px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif';
      ctx.fillText(pkg.bonus, cx, ly); ly += 22;
    }
    if (!pkg.gems && pkg.id === 'noad') {
      ctx.fillStyle = '#aab'; ctx.font = '12px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif';
      ctx.fillText('広告表示をオフにする権利（保存）', cx, ly); ly += 24;
    }
    if (!pkg.gems && pkg.id === 'pass') {
      ctx.fillStyle = '#aab'; ctx.font = '12px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif';
      ctx.fillText(pkg.bonus || '月額パス（期限延長・広告除去込み）', cx, ly); ly += 24;
    }
    ctx.fillStyle = '#ffee88'; ctx.font = 'bold 26px Orbitron,Courier New';
    ctx.fillText(priceStr, cx, ly + 10);
    ctx.fillStyle = 'rgba(160, 185, 210, 0.92)'; ctx.font = '10px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif';
    ctx.fillText('※ 実際の課金・決済は発生しません（開発用の演出です）', cx, my + mh - 56);

    const bw = Math.floor((mw - 48) / 2);
    const by = my + mh - bh - 18;
    ctx.fillStyle = 'rgba(40, 50, 70, 0.95)'; ctx.strokeStyle = 'rgba(140, 160, 190, 0.7)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.roundRect(mx + 20, by, bw, bh, 8); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ccd8e8'; ctx.font = 'bold 13px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif';
    ctx.fillText('キャンセル', mx + 20 + bw / 2, by + bh / 2 + 5);
    hits.push({ id: 'cancel', x: mx + 20, y: by, w: bw, h: bh });

    ctx.fillStyle = 'rgba(0, 90, 55, 0.45)'; ctx.strokeStyle = 'rgba(80, 255, 160, 0.85)';
    ctx.beginPath(); ctx.roundRect(mx + mw - 20 - bw, by, bw, bh, 8); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ccffee'; ctx.font = 'bold 14px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif';
    ctx.fillText('購入する', mx + mw - 20 - bw / 2, by + bh / 2 + 5);
    hits.push({ id: 'purchase', x: mx + mw - 20 - bw, y: by, w: bw, h: bh });
  } else if (phase === 'payment') {
    ctx.fillStyle = '#88ffcc'; ctx.font = 'bold 16px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif';
    ctx.fillText('お支払い方法', cx, my + 38);
    ctx.fillStyle = '#aab'; ctx.font = '11px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif';
    ctx.fillText(`${pkg.label}　${priceStr}`, cx, my + 62);
    ctx.fillStyle = '#dce8f8'; ctx.font = 'bold 13px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif';
    ctx.fillText('※ テスト用UIです。実際の決済はありません。', cx, my + 84);

    let yb = my + 108;
    const gap = 10;
    const drawPayBtn = (label, hitId, accent) => {
      ctx.fillStyle = accent ? 'rgba(0, 80, 95, 0.55)' : 'rgba(35, 45, 65, 0.95)';
      ctx.strokeStyle = accent ? 'rgba(80, 255, 200, 0.75)' : 'rgba(120, 140, 170, 0.65)';
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.roundRect(mx + pad, yb, innerW, bh, 8); ctx.fill(); ctx.stroke();
      ctx.fillStyle = accent ? '#d8fff4' : '#dde8f8';
      ctx.font = 'bold 13px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif';
      ctx.fillText(label, cx, yb + bh / 2 + 5);
      hits.push({ id: hitId, x: mx + pad, y: yb, w: innerW, h: bh });
      yb += bh + gap;
    };
    drawPayBtn('💳 クレジットカード', 'pick_cc', true);
    drawPayBtn('🏪 コンビニ支払い', 'pick_cvs', true);
    drawPayBtn('← 内容を見直す', 'back_confirm', false);

    ctx.fillStyle = 'rgba(160, 185, 210, 0.85)'; ctx.font = '9px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif';
    ctx.fillText('本番ではカード会社・コンビニ決済会社の画面へ遷移します', cx, my + mh - 22);
  } else if (phase === 'cc') {
    game._iapCcFieldHits = [];
    game._iapCcKeyHits = [];
    if (!game.iapCcForm) game.iapCcForm = { card: '', exp: '', cvv: '' };
    if (!game.iapCcFocus) game.iapCcFocus = 'card';
    const form = game.iapCcForm;
    const cardStr = formatCardDisplay(form);
    const expStr = formatExpDisplay(form);
    const cvvStr = form.cvv || '';

    ctx.fillStyle = '#88ffcc'; ctx.font = 'bold 16px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif';
    ctx.fillText('クレジットカード', cx, my + 32);
    ctx.fillStyle = '#aab'; ctx.font = '11px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif';
    ctx.fillText(`お支払金額 ${priceStr}`, cx, my + 54);

    const drawField = (label, textVal, yLab, fieldKey, bx, bw, bhIn) => {
      ctx.fillStyle = '#aab'; ctx.font = '10px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif'; ctx.textAlign = 'left';
      ctx.fillText(label, bx, yLab);
      const iy = yLab + 10;
      const focusOn = game.iapCcFocus === fieldKey;
      ctx.fillStyle = 'rgba(4, 8, 20, 0.92)';
      ctx.strokeStyle = focusOn ? 'rgba(100, 255, 200, 0.95)' : 'rgba(80, 120, 180, 0.55)';
      ctx.lineWidth = focusOn ? 2 : 1.2;
      ctx.beginPath(); ctx.roundRect(bx, iy, bw, bhIn, 6); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#e8f0ff'; ctx.font = '14px Orbitron,Courier New';
      const disp = textVal.trim() ? textVal : ' ';
      ctx.fillText(disp, bx + 10, iy + bhIn / 2 + 5);
      if (focusOn && (game.frameCount % 36 < 18)) {
        const tw = ctx.measureText(disp.trim() ? disp : '').width;
        ctx.fillStyle = '#88ffcc';
        ctx.fillRect(bx + 10 + tw + 1, iy + 8, 2, bhIn - 16);
      }
      game._iapCcFieldHits.push({ field: fieldKey, x: bx, y: iy, w: bw, h: bhIn });
    };

    const bx0 = mx + pad;
    const fldH = 32;
    drawField('カード番号（半角数字）', cardStr, my + 70, 'card', bx0, innerW, fldH);

    const half = Math.floor((innerW - 10) / 2);
    const bx1 = bx0 + half + 10;
    drawField('有効期限（MMYY）', expStr, my + 122, 'exp', bx0, half, fldH);
    drawField('セキュリティコード', cvvStr, my + 122, 'cvv', bx1, half, fldH);

    const kpTop = my + 192;
    const kg = 6;
    const kw = Math.floor((innerW - kg * 2) / 3);
    const kh = 30;
    const pushKp = (kx, ky, key, lab) => {
      ctx.fillStyle = 'rgba(24, 36, 52, 0.95)';
      ctx.strokeStyle = 'rgba(100, 140, 200, 0.55)';
      ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.roundRect(kx, ky, kw, kh, 6); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#dce8f8'; ctx.font = 'bold 14px Orbitron,Courier New'; ctx.textAlign = 'center';
      ctx.fillText(lab, kx + kw / 2, ky + kh / 2 + 5);
      game._iapCcKeyHits.push({ key, x: kx, y: ky, w: kw, h: kh });
    };
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        const n = r * 3 + c + 1;
        pushKp(bx0 + c * (kw + kg), kpTop + r * (kh + kg), String(n), String(n));
      }
    }
    pushKp(bx0, kpTop + 3 * (kh + kg), 'bs', '⌫');
    pushKp(bx0 + kw + kg, kpTop + 3 * (kh + kg), '0', '0');

    ctx.fillStyle = 'rgba(140, 165, 195, 0.75)'; ctx.font = '9px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('※ テスト用UI（実データは送信されません）・Tabで項目移動', cx, kpTop + 3 * (kh + kg) + kh + 16);

    let yb = my + mh - bh * 2 - 28;
    if (game.iapCcError) {
      ctx.fillStyle = 'rgba(255, 130, 130, 0.98)'; ctx.font = '11px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(game.iapCcError, cx, yb - 10);
    }
    ctx.fillStyle = 'rgba(0, 110, 75, 0.55)'; ctx.strokeStyle = 'rgba(80, 255, 200, 0.85)';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.roundRect(mx + pad, yb, innerW, bh, 8); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#e8fff8'; ctx.font = 'bold 14px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif';
    ctx.fillText('支払う（シミュレーション）', cx, yb + bh / 2 + 5);
    hits.push({ id: 'pay_cc', x: mx + pad, y: yb, w: innerW, h: bh });
    yb += bh + 10;
    ctx.fillStyle = 'rgba(40, 50, 70, 0.95)'; ctx.strokeStyle = 'rgba(140, 160, 190, 0.55)';
    ctx.beginPath(); ctx.roundRect(mx + pad, yb, innerW, bh - 4, 8); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#aab'; ctx.font = 'bold 12px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif';
    ctx.fillText('戻る', cx, yb + (bh - 4) / 2 + 4);
    hits.push({ id: 'back_pay', x: mx + pad, y: yb, w: innerW, h: bh - 4 });
  } else if (phase === 'cvs') {
    if (!modal.cvsRef) {
      modal.cvsRef = `${Math.floor(10000000000000 + Math.random() * 89999999999999)}`;
    }
    ctx.fillStyle = '#88ffcc'; ctx.font = 'bold 16px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif';
    ctx.fillText('コンビニ支払い', cx, my + 34);
    ctx.fillStyle = '#aab'; ctx.font = '11px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif';
    ctx.fillText(`お支払金額 ${priceStr}`, cx, my + 56);

    ctx.fillStyle = '#dce8f8'; ctx.font = 'bold 13px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif';
    ctx.fillText('受付番号（シミュレーション）', cx, my + 88);
    ctx.fillStyle = '#ffee88'; ctx.font = 'bold 20px Orbitron,Courier New';
    ctx.fillText(modal.cvsRef, cx, my + 118);
    ctx.fillStyle = '#aab'; ctx.font = '11px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif';
    ctx.fillText('お支払い期限：3日以内（テスト表示）', cx, my + 142);
    ctx.fillStyle = 'rgba(180, 200, 220, 0.95)'; ctx.font = '10px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif';
    ctx.fillText('※ 本番ではバーコード／番号が発行され、店頭で支払い後に反映されます', cx, my + 168);

    let yb = my + mh - bh * 2 - 28;
    ctx.fillStyle = 'rgba(0, 110, 75, 0.55)'; ctx.strokeStyle = 'rgba(80, 255, 200, 0.85)';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.roundRect(mx + pad, yb, innerW, bh, 8); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#e8fff8'; ctx.font = 'bold 13px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif';
    ctx.fillText('入金完了（シミュレーション）', cx, yb + bh / 2 + 5);
    hits.push({ id: 'pay_cvs', x: mx + pad, y: yb, w: innerW, h: bh });
    yb += bh + 10;
    ctx.fillStyle = 'rgba(40, 50, 70, 0.95)'; ctx.strokeStyle = 'rgba(140, 160, 190, 0.55)';
    ctx.beginPath(); ctx.roundRect(mx + pad, yb, innerW, bh - 4, 8); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#aab'; ctx.font = 'bold 12px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif';
    ctx.fillText('戻る', cx, yb + (bh - 4) / 2 + 4);
    hits.push({ id: 'back_pay', x: mx + pad, y: yb, w: innerW, h: bh - 4 });
  } else if (phase === 'success') {
    ctx.fillStyle = '#88ffcc'; ctx.font = 'bold 16px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif';
    ctx.fillText('購入完了（シミュレーション）', cx, my + 38);
    ctx.fillStyle = '#dce8f8'; ctx.font = '12px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif';
    const lines = Array.isArray(modal.resultLines) ? modal.resultLines : [];
    let ly = my + 70;
    for (const t of lines) {
      ctx.fillText(`・${t}`, cx, ly);
      ly += 18;
      if (ly > my + mh - 100) break;
    }
    const okW = 200;
    const ox = cx - okW / 2;
    const by = my + mh - bh - 18;
    ctx.fillStyle = 'rgba(0, 100, 70, 0.5)'; ctx.strokeStyle = 'rgba(100, 255, 200, 0.75)';
    ctx.beginPath(); ctx.roundRect(ox, by, okW, bh, 8); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#e8fff8'; ctx.font = 'bold 14px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif';
    ctx.fillText('OK', cx, by + bh / 2 + 5);
    hits.push({ id: 'ok', x: ox, y: by, w: okW, h: bh });
  }

  ctx.textAlign = 'left';
  ctx.restore();
  game._iapModalHits = hits;
}

export function drawIAPScreen() {
  const ctx = drawDeps.ctx;
  const cx = W / 2;
  game._iapModalHits = null;
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
    ctx.fillText('※ 価格タップ → 確認 → お支払い方法（カード／コンビニ）→ 完了（実決済なし）。', cx, noteY);
    ctx.fillText('※ 18歳未満の方はご利用になれません。', cx, noteY + 14);
  }
  ctx.textAlign = 'left';

  if (game.ageVerified && game.iapModal && game.iapModal.pkg) {
    drawIapPurchaseModal(ctx, cx, game.iapModal);
  }
}
