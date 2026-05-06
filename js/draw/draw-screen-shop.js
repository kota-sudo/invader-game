/**
 * Shop screen drawing (extracted from draw-screens.js)
 */
import { game } from '../game/game-store.js';
import { CANVAS_W as W, CANVAS_H as H } from '../game/constants.js';
import {
  MAT_COLOR,
  RARITY_COLORS,
  SHOP_ITEMS,
  SHOP_MAX_LV,
  WEAPON_GACHA_POOL,
} from '../game-data.js';
import { drawShopHex } from '../game/draw-shop-hex.js';
import { hexToRgb } from '../game/color-utils.js';

let drawDeps;
let getUpgradeLvCost;
let truncateLine;

export function setShopScreenDrawDeps(deps) {
  drawDeps = deps;
  ({ getUpgradeLvCost, truncateLine } = deps);
}

export function drawShopScreen() {
  const ctx = drawDeps.ctx;
  const t = game.frameCount;

  // ── 背景: SF グリッド ──
  ctx.fillStyle = '#020408'; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = 'rgba(0,180,255,0.045)'; ctx.lineWidth = 1;
  for (let x = 0; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
  for (let y = 0; y < H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  // コーナー装飾
  [[0, 0, 1, 1], [W, 0, -1, 1], [0, H, 1, -1], [W, H, -1, -1]].forEach(([cx, cy, sx, sy]) => {
    ctx.strokeStyle = 'rgba(255,140,0,0.5)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(cx + sx * 6, cy); ctx.lineTo(cx + sx * 36, cy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, cy + sy * 6); ctx.lineTo(cx, cy + sy * 36); ctx.stroke();
  });
  // スキャンライン
  const scanY = ((t * 1.8) % H);
  const scanGrad = ctx.createLinearGradient(0, scanY - 40, 0, scanY + 40);
  scanGrad.addColorStop(0, 'rgba(255,140,0,0)');
  scanGrad.addColorStop(0.5, 'rgba(255,140,0,0.06)');
  scanGrad.addColorStop(1, 'rgba(255,140,0,0)');
  ctx.fillStyle = scanGrad; ctx.fillRect(0, scanY - 40, W, 80);

  // ── ヘッダー ──
  ctx.save();
  ctx.shadowColor = '#ff8833'; ctx.shadowBlur = 40;
  ctx.fillStyle = '#ff8833'; ctx.font = 'bold 30px Orbitron,Courier New'; ctx.textAlign = 'center';
  ctx.fillText('UPGRADE  SHOP', W / 2, 36); ctx.shadowBlur = 0;
  // 左デコレーションライン
  ctx.strokeStyle = '#ff8833'; ctx.lineWidth = 1; ctx.globalAlpha = 0.5;
  ctx.beginPath(); ctx.moveTo(30, 28); ctx.lineTo(200, 28); ctx.stroke();
  ctx.globalAlpha = 1;
  // E: 右側に総合進捗バー
  const _totalLv = SHOP_ITEMS.reduce((s, it) => s + (game.shopUpgrades[it.id] || 0), 0);
  const _totalMax = SHOP_ITEMS.length * SHOP_MAX_LV;
  const _pct = _totalLv / _totalMax;
  const _pbW = 160, _pbH = 5, _pbX = W - 196, _pbY = 22;
  ctx.fillStyle = '#1a1a2e'; ctx.beginPath(); ctx.roundRect(_pbX, _pbY, _pbW, _pbH, 2); ctx.fill();
  const _pgCol = _pct >= 1 ? '#00ff88' : '#ff8833';
  ctx.shadowColor = _pgCol; ctx.shadowBlur = _pct >= 1 ? 10 : 4;
  ctx.fillStyle = _pgCol; ctx.beginPath(); ctx.roundRect(_pbX, _pbY, Math.max(0, _pbW * _pct), _pbH, 2); ctx.fill(); ctx.shadowBlur = 0;
  ctx.fillStyle = _pct >= 1 ? '#00ff88' : '#ff8833'; ctx.font = '10px Orbitron,Courier New'; ctx.textAlign = 'right';
  ctx.fillText(`強化 ${_totalLv}/${_totalMax}`, W - 30, 33);
  ctx.restore();

  // ── リソースバー ──
  const resData = [
    { key: 'coins', v: `${game.coins.toLocaleString()}`, icon: '●', col: '#ffdd00', bg: 'rgba(60,50,0,0.8)' },
    { key: 'gems', v: `${game.gems}`, icon: '💎', col: '#cc88ff', bg: 'rgba(50,0,80,0.8)' },
    { key: 'scrap', v: `${game.materials.scrap || 0}`, icon: '🔩', col: '#bbbbbb', bg: 'rgba(30,30,30,0.8)' },
    { key: 'core', v: `${game.materials.core || 0}`, icon: '⚡', col: '#44ccff', bg: 'rgba(0,30,60,0.8)' },
    { key: 'crystal', v: `${game.materials.crystal || 0}`, icon: '💠', col: '#cc88ff', bg: 'rgba(40,0,60,0.8)' },
    { key: 'composite', v: `${game.materials.composite || 0}`, icon: '🔷', col: '#ffaa44', bg: 'rgba(60,30,0,0.8)' },
  ];
  // G: 選択アイテムの不足リソースを事前計算
  const _deficitKeys = new Set();
  if (game.shopTab === 0) {
    const _si = SHOP_ITEMS[game.shopCursor];
    if (_si) {
      const _sl = game.shopUpgrades[_si.id] || 0;
      if (_sl < SHOP_MAX_LV) {
        const [_sc, _sm] = getUpgradeLvCost(_sl);
        if (game.coins < _sc) _deficitKeys.add('coins');
        Object.entries(_sm).forEach(([k, v]) => {
          const h = k === 'gems' ? game.gems : (game.materials[k] || 0);
          if (h < v) _deficitKeys.add(k);
        });
      }
    }
  }
  const rbW = 108, rbH = 28, rbGap = 8, rbStartX = (W - (resData.length * (rbW + rbGap) - rbGap)) / 2;
  resData.forEach((r, i) => {
    const rx = rbStartX + i * (rbW + rbGap), ry = 48;
    const deficit = _deficitKeys.has(r.key);
    const dp = deficit ? (0.55 + Math.sin(t * 0.2) * 0.45) : 0;
    ctx.save();
    if (deficit) { ctx.shadowColor = '#ff3333'; ctx.shadowBlur = 10 * dp; }
    ctx.fillStyle = deficit ? `rgba(60,8,8,0.9)` : r.bg;
    ctx.strokeStyle = deficit ? `rgba(255,60,60,${0.3 + dp * 0.7})` : r.col + '55';
    ctx.lineWidth = deficit ? 2 : 1;
    ctx.beginPath(); ctx.roundRect(rx, ry, rbW, rbH, 14); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;
    ctx.fillStyle = deficit ? `rgba(255,${Math.floor(80 + dp * 175)},${Math.floor(80 + dp * 80)},1)` : r.col;
    ctx.font = 'bold 12px Orbitron,Courier New'; ctx.textAlign = 'center';
    ctx.fillText(`${r.icon} ${r.v}`, rx + rbW / 2, ry + 19);
    ctx.restore();
  });

  // ── タブ ──
  game._shopHits = [];
  // 画面幅が小さい時に「[ Q ] ◈ 強化」等が潰れやすいので、
  // キーは左バッジ、ラベルは右に可変幅で描画（擬似レスポンシブ）。
  const tabDefs = [
    { icon: '◈', full: '強化' },
    { icon: '◆', full: '素材合成' },
    { icon: '⚔', full: '融合' },
  ];
  const shopTabW = (W - 64) / 3;
  tabDefs.forEach((def, i) => {
    const active = game.shopTab === i;
    const tx = 32 + i * (shopTabW + 4), tw = shopTabW;
    const pulse = active ? (0.9 + Math.sin(t * 0.08) * 0.1) : 1;
    const tabCol = i === 2 ? '#44aaff' : '#ff8833';
    ctx.save();
    if (active) {
      ctx.shadowColor = tabCol; ctx.shadowBlur = 16 * pulse;
      ctx.fillStyle = i === 2 ? 'rgba(0,28,60,0.95)' : 'rgba(60,28,0,0.95)';
    } else {
      ctx.fillStyle = 'rgba(10,10,18,0.85)';
    }
    ctx.strokeStyle = active ? tabCol : '#2a2a3a'; ctx.lineWidth = active ? 2 : 1;
    ctx.beginPath(); ctx.roundRect(tx, 82, tw, 26, 4); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;
    if (active) {
      ctx.strokeStyle = tabCol; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(tx + 8, 108); ctx.lineTo(tx + tw - 8, 108); ctx.stroke();
    }
    const yText = 100;
    const tabFontActive = Math.max(10, Math.min(13, Math.floor(tw / 22) + 2));
    const labelFont = active ? tabFontActive : Math.max(9, tabFontActive - 2);
    ctx.fillStyle = active ? tabCol : '#444';
    ctx.font = `bold ${labelFont}px Orbitron,Courier New`;
    ctx.textAlign = 'center';
    const labelMaxW = tw - 16;
    const labelFull = `${def.icon} ${def.full}`;
    const labelShort = def.full;
    let labelToDraw = labelFull;
    if (ctx.measureText(labelFull).width > labelMaxW) labelToDraw = labelShort;
    ctx.fillText(truncateLine(ctx, labelToDraw, labelMaxW), tx + tw / 2, yText);
    ctx.restore();
    // A: タブクリック判定
    game._shopHits.push({ type: 'tab', idx: i, x: tx, y: 82, w: tw, h: 26 });
  });

  // タブ説明は省略（ツリー領域を広く確保）

  if (game.shopTab === 0) {
    drawShopHex(ctx, W, H, game, game.frameCount);

  } else if (game.shopTab === 1) {
    // ══════════════════════════════════════
    // COMPOSE タブ
    // ══════════════════════════════════════
    ctx.save();
    const cpW = Math.min(480, W - 40), cpX = W / 2 - cpW / 2, cpY = 112;
    // 背景パネル
    const panelG = ctx.createLinearGradient(cpX, cpY, cpX + cpW, cpY + 350);
    panelG.addColorStop(0, 'rgba(30,18,0,0.95)'); panelG.addColorStop(1, 'rgba(10,8,0,0.95)');
    ctx.fillStyle = panelG; ctx.strokeStyle = '#ffaa4488'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(cpX, cpY, cpW, 350, 14); ctx.fill(); ctx.stroke();
    [[cpX, cpY], [cpX + cpW, cpY], [cpX, cpY + 350], [cpX + cpW, cpY + 350]].forEach(([cx, cy]) => {
      ctx.strokeStyle = '#ffaa44'; ctx.lineWidth = 2;
      const sx = cx === cpX ? 1 : -1, sy = cy === cpY ? 1 : -1;
      ctx.beginPath(); ctx.moveTo(cx, cy + sy * 6); ctx.lineTo(cx, cy + sy * 20); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx + sx * 6, cy); ctx.lineTo(cx + sx * 20, cy); ctx.stroke();
    });

    ctx.textAlign = 'center';
    ctx.shadowColor = '#ffaa44'; ctx.shadowBlur = 20;
    ctx.fillStyle = '#ffaa44'; ctx.font = 'bold 18px Orbitron,Courier New';
    ctx.fillText('◆  コンポジットコア合成', W / 2, cpY + 34); ctx.shadowBlur = 0;

    const haveScrap = game.materials.scrap || 0, haveCore = game.materials.core || 0;
    const maxBatch = Math.min(Math.floor(haveScrap / 5), Math.floor(haveCore / 3));
    const canCompose = maxBatch >= 1;

    // 素材カード (b: あとX個表示)
    [{ mat: '🔩 スクラップ', need: 5, have: haveScrap, col: MAT_COLOR.scrap },
    { mat: '⚡ エネルギーコア', need: 3, have: haveCore, col: MAT_COLOR.core }].forEach((r, ri) => {
      const cx = W / 2 + (ri === 0 ? -cpW / 4 : cpW / 4), cy = cpY + 108;
      const enough = r.have >= r.need;
      ctx.shadowColor = enough ? r.col : 'transparent'; ctx.shadowBlur = enough ? 10 : 0;
      ctx.fillStyle = enough ? `rgba(${hexToRgb(r.col)},0.15)` : 'rgba(15,15,15,0.9)';
      ctx.strokeStyle = enough ? r.col : '#333'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.roundRect(cx - cpW / 4 + 6, cy - 28, cpW / 2 - 12, 58, 8); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;
      ctx.fillStyle = enough ? r.col : '#443'; ctx.font = 'bold 13px Orbitron,Courier New';
      ctx.fillText(r.mat, cx, cy - 8);
      // b: 不足なら「あとX個」赤表示
      if (enough) {
        ctx.fillStyle = '#fff'; ctx.font = '12px Orbitron,Courier New';
        ctx.fillText(`×${r.need}  所持:${r.have}`, cx, cy + 12);
      } else {
        ctx.fillStyle = 'rgba(255,80,80,0.95)'; ctx.font = 'bold 12px Orbitron,Courier New';
        ctx.fillText(`×${r.need}  あと${r.need - r.have}個`, cx, cy + 12);
      }
    });
    ctx.fillStyle = '#665'; ctx.font = 'bold 22px Orbitron,Courier New';
    ctx.fillText('+', W / 2, cpY + 116);

    // 矢印
    const arrowPulse = canCompose ? (0.7 + Math.sin(t * 0.12) * 0.3) : 0.3;
    ctx.globalAlpha = arrowPulse;
    ctx.fillStyle = canCompose ? '#ffaa44' : '#333'; ctx.font = '26px Orbitron,Courier New';
    ctx.fillText('↓', W / 2, cpY + 168); ctx.globalAlpha = 1;

    // 出力カード
    const pulse = canCompose ? (0.85 + Math.sin(t * 0.1) * 0.15) : 1;
    ctx.shadowColor = canCompose ? '#ffaa44' : 'transparent'; ctx.shadowBlur = canCompose ? 20 * pulse : 0;
    ctx.fillStyle = canCompose ? 'rgba(70,35,0,0.95)' : 'rgba(15,12,5,0.9)';
    ctx.strokeStyle = canCompose ? '#ffaa44' : '#332'; ctx.lineWidth = canCompose ? 2 : 1;
    ctx.beginPath(); ctx.roundRect(W / 2 - 90, cpY + 186, 180, 62, 10); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;
    ctx.fillStyle = canCompose ? '#ffaa44' : '#443'; ctx.font = 'bold 15px Orbitron,Courier New';
    ctx.fillText('🔷 コンポジットコア', W / 2, cpY + 208);
    ctx.fillStyle = canCompose ? '#cc8833' : '#332'; ctx.font = '12px Orbitron,Courier New';
    ctx.fillText('× 1  獲得', W / 2, cpY + 228);

    // a: 一括合成ボタン ×1 / ×5 / ×MAX
    const btnCounts = [1, 5, 'max'];
    const btnLabels = ['× 1', '× 5', `×MAX(${maxBatch})`];
    const btnW3 = Math.min(100, (cpW - 40) / 3 - 6), btnH3 = 42, btnY3 = cpY + 262, btnGap = 6;
    const totalBtnW = btnW3 * 3 + btnGap * 2, btnStartX = W / 2 - totalBtnW / 2;
    btnCounts.forEach((cnt, bi) => {
      const n = cnt === 'max' ? maxBatch : cnt;
      const ok = maxBatch >= n && n > 0;
      const bx = btnStartX + bi * (btnW3 + btnGap);
      const bp = ok ? (0.8 + Math.sin(t * 0.15 + bi) * 0.2) : 1;
      ctx.shadowColor = ok ? '#ffaa44' : 'transparent'; ctx.shadowBlur = ok ? 18 * bp : 0;
      ctx.fillStyle = ok ? 'rgba(90,45,0,0.95)' : 'rgba(18,18,18,0.85)';
      ctx.strokeStyle = ok ? '#ffaa44' : '#2a2a2a'; ctx.lineWidth = ok ? 2 : 1;
      ctx.beginPath(); ctx.roundRect(bx, btnY3, btnW3, btnH3, 9); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;
      ctx.fillStyle = ok ? '#ffdd88' : '#333'; ctx.font = `bold ${ok ? 13 : 11}px Orbitron,Courier New`;
      ctx.fillText(btnLabels[bi], bx + btnW3 / 2, btnY3 + btnH3 / 2 + 1);
      if (ok) game._shopHits.push({ type: 'compose', count: cnt, x: bx, y: btnY3, w: btnW3, h: btnH3 });
    });

    // 所持数
    ctx.fillStyle = '#556'; ctx.font = '10px Orbitron,Courier New';
    ctx.fillText(`🔷 所持: ${game.materials.composite || 0}  /  Lv9→10 強化に使用`, W / 2, cpY + 322);
    ctx.restore();
  } else if (game.shopTab === 2) {
    // ══════════════════════════════════════
    // FUSION タブ（武器限界突破）
    // ══════════════════════════════════════
    const fPool = WEAPON_GACHA_POOL.filter(w => game.gachaInventory[w.id]);
    game.fusionCursor = Math.max(0, Math.min(game.fusionCursor, fPool.length - 1));
    const fusionCosts = { N: { mat: 1, scrap: 10 }, R: { mat: 1, scrap: 20, core: 5 }, SR: { mat: 2, scrap: 30, core: 10, crystal: 3 }, SSR: { mat: 2, scrap: 50, core: 20, crystal: 8 } };

    ctx.save();
    if (fPool.length === 0) {
      ctx.fillStyle = '#445'; ctx.font = '14px Orbitron,Courier New'; ctx.textAlign = 'center';
      ctx.fillText('武器未所持  —  ガチャで入手しよう', W / 2, 300);
    } else {
      // e: レスポンシブ — 幅に合わせてリスト/詳細を分割
      const listX = 12, listW = Math.round(W * 0.46) - listX, rowH = 52;
      const fpx = listX + listW + 10, fpw = W - fpx - 12, fpy = 112;
      const visRows = Math.min(fPool.length, 8);
      const startR = Math.max(0, Math.min(game.fusionCursor - 3, fPool.length - visRows));
      for (let vi = 0; vi < visRows; vi++) {
        const wi = startR + vi;
        if (wi >= fPool.length) continue;
        const wp = fPool[wi];
        const inv = game.gachaInventory[wp.id];
        const lv = inv ? inv.level || 1 : 1;
        const mat = inv ? inv.mat || 0 : 0;
        const maxed = lv >= 5;
        const isActive = wi === game.fusionCursor;
        const wc = wp.color || RARITY_COLORS[wp.rarity] || '#aaa';
        const ry = fpy + vi * rowH;

        ctx.fillStyle = isActive ? `rgba(${hexToRgb(wc)},0.18)` : 'rgba(8,10,20,0.88)';
        ctx.strokeStyle = isActive ? wc : (maxed ? '#225522' : '#1a1a2e'); ctx.lineWidth = isActive ? 2 : 1;
        if (isActive) { ctx.shadowColor = wc; ctx.shadowBlur = 14; }
        ctx.beginPath(); ctx.roundRect(listX, ry, listW, rowH - 4, 6); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;

        ctx.fillStyle = isActive ? '#fff' : '#bbc'; ctx.font = `bold ${isActive ? 14 : 13}px Orbitron,Courier New`; ctx.textAlign = 'left';
        ctx.fillText(wp.label, listX + 8, ry + 20);
        ctx.fillStyle = wc + 'bb'; ctx.font = '10px Orbitron,Courier New';
        ctx.fillText(`${wp.rarity}  Lv${lv}/5  複製:${mat}`, listX + 8, ry + 36);
        if (maxed) { ctx.fillStyle = '#00ff88'; ctx.font = 'bold 10px Orbitron,Courier New'; ctx.textAlign = 'right'; ctx.fillText('MAX', listX + listW - 6, ry + 20); }
        game._shopHits.push({ type: 'fselect', idx: wi, x: listX, y: ry, w: listW, h: rowH - 4 });
      }
      ctx.textAlign = 'center';

      // 詳細パネル（右）— e: fpx/fpw でレスポンシブ
      const selWp = fPool[game.fusionCursor];
      const selInv = selWp && game.gachaInventory[selWp.id];
      if (selWp && selInv) {
        const wc2 = selWp.color || RARITY_COLORS[selWp.rarity] || '#aaa';
        const lv2 = selInv.level || 1;
        const mat2 = selInv.mat || 0;
        const maxed2 = lv2 >= 5;
        const cost = fusionCosts[selWp.rarity];
        const matOk = !cost || mat2 >= cost.mat;
        const scrapOk = !cost || !cost.scrap || (game.materials.scrap || 0) >= cost.scrap;
        const coreOk = !cost || !cost.core || (game.materials.core || 0) >= cost.core;
        const crystalOk = !cost || !cost.crystal || (game.materials.crystal || 0) >= cost.crystal;
        const canFuse = cost && matOk && scrapOk && coreOk && crystalOk && !maxed2;

        ctx.fillStyle = 'rgba(4,8,18,0.96)'; ctx.strokeStyle = wc2 + '55'; ctx.lineWidth = 1.5;
        ctx.shadowColor = wc2; ctx.shadowBlur = 8;
        ctx.beginPath(); ctx.roundRect(fpx, fpy, fpw, 370, 12); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;

        ctx.fillStyle = wc2; ctx.font = `bold ${Math.min(18, fpw * 0.05 + 10)}px Orbitron,Courier New`;
        ctx.fillText(selWp.label, fpx + fpw / 2, fpy + 30);
        ctx.fillStyle = '#999'; ctx.font = '11px Orbitron,Courier New';
        ctx.fillText(selWp.desc || selWp.rarity, fpx + fpw / 2, fpy + 48);

        ctx.fillStyle = wc2 + 'cc'; ctx.font = 'bold 14px Orbitron,Courier New';
        ctx.fillText(`Lv ${lv2}  →  Lv ${lv2 + 1}`, fpx + fpw / 2, fpy + 82);
        ctx.fillStyle = 'rgba(160,200,255,0.7)'; ctx.font = '12px Orbitron,Courier New';
        const _FPCT = [0, 0, 10, 22, 38, 58];
        const _fpct = _FPCT[Math.min(lv2, 5)] || 0;
        const _fpctNext = _FPCT[Math.min(lv2 + 1, 5)] || 0;
        ctx.fillText(`+${_fpct}% 攻撃力  →  +${_fpctNext}%`, fpx + fpw / 2, fpy + 100);

        if (!maxed2 && cost) {
          // c: 消費素材あとX個表示
          const costLines = [
            { label: `複製×${cost.mat}`, ok: matOk, have: mat2, need: cost.mat },
            cost.scrap ? { label: `🔩×${cost.scrap}`, ok: scrapOk, have: game.materials.scrap || 0, need: cost.scrap } : null,
            cost.core ? { label: `⚡×${cost.core}`, ok: coreOk, have: game.materials.core || 0, need: cost.core } : null,
            cost.crystal ? { label: `💠×${cost.crystal}`, ok: crystalOk, have: game.materials.crystal || 0, need: cost.crystal } : null,
          ].filter(Boolean);
          ctx.fillStyle = 'rgba(200,220,255,0.6)'; ctx.font = '11px Orbitron,Courier New';
          ctx.fillText('── 消費素材 ──', fpx + fpw / 2, fpy + 128);
          costLines.forEach((cl, ci) => {
            ctx.fillStyle = cl.ok ? 'rgba(200,230,255,0.9)' : 'rgba(255,100,80,0.9)'; ctx.font = '12px Orbitron,Courier New';
            const shortStr = cl.ok ? `所持:${cl.have}` : `あと${cl.need - cl.have}個`;
            ctx.fillText(`${cl.label}  (${shortStr})`, fpx + fpw / 2, fpy + 148 + ci * 22);
          });

          const btnPulse2 = canFuse ? (0.8 + Math.sin(t * 0.14) * 0.2) : 1;
          ctx.shadowColor = canFuse ? wc2 : 'transparent'; ctx.shadowBlur = canFuse ? 18 * btnPulse2 : 0;
          ctx.fillStyle = canFuse ? `rgba(${hexToRgb(wc2)},0.25)` : 'rgba(14,14,22,0.8)';
          ctx.strokeStyle = canFuse ? wc2 : '#223'; ctx.lineWidth = canFuse ? 2 : 1;
          ctx.beginPath(); ctx.roundRect(fpx + 20, fpy + 268, fpw - 40, 46, 10); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;
          ctx.fillStyle = canFuse ? wc2 : '#334'; ctx.font = `bold ${canFuse ? 13 : 11}px Orbitron,Courier New`;
          ctx.fillText(canFuse ? '[ 決定 ]  限界突破' : '素材不足', fpx + fpw / 2, fpy + 297);
          if (canFuse) game._shopHits.push({ type: 'fuse', weaponId: selWp.id, x: fpx + 20, y: fpy + 268, w: fpw - 40, h: 46 });
        } else if (maxed2) {
          ctx.fillStyle = '#44ff88'; ctx.font = 'bold 14px Orbitron,Courier New';
          ctx.fillText('✓  最大レベル (Lv5)', fpx + fpw / 2, fpy + 200);
        }
      }
    }
    ctx.restore();
  }

  // フッター
  ctx.fillStyle = 'rgba(255,140,0,0.12)'; ctx.fillRect(0, H - 28, W, 28);
  ctx.strokeStyle = 'rgba(255,140,0,0.2)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(0, H - 28); ctx.lineTo(W, H - 28); ctx.stroke();
  // 操作ガイド（選択/決定など）は非表示にする
  ctx.textAlign = 'left'; ctx.lineWidth = 1;
}
