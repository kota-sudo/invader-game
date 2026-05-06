/**
 * 素材合成画面
 */
import { game } from '../game/game-store.js';
import { CANVAS_W as W, CANVAS_H as H } from '../game/constants.js';
import * as GD from '../game-data.js';

/** SW が古い game-data を返したときのフォールバック（MAT_ICON 追加前のキャッシュ対策） */
const MAT_ICON = GD.MAT_ICON ?? {
  scrap: '🔩', core: '⚡', crystal: '💎', composite: '🔷', fusionStone: '🔮', starCrystal: '💫',
};
const SYNTH_RECIPES = GD.SYNTH_RECIPES;
const MAT_COLOR = GD.MAT_COLOR;
const MAT_LABEL = GD.MAT_LABEL;

let drawDeps;
export function setSynthScreenDrawDeps(deps) { drawDeps = deps; }

const BG     = '#020408';
const HDR_H  = 48;
const COL1_X = 10, COL1_W = 360;
const COL2_X = 382, COL2_W = W - COL2_X - 10;
const LIST_Y = HDR_H + 8;
const CARD_H = 74, CARD_GAP = 6;

function matHave(k) { return game.materials?.[k] || 0; }

function maxTimes(recipe) {
  return Object.entries(recipe.input).reduce((mn, [k, v]) => Math.min(mn, Math.floor(matHave(k) / v)), Infinity);
}

function drawBg(ctx) {
  ctx.fillStyle = BG; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = 'rgba(0,180,255,0.04)'; ctx.lineWidth = 1;
  for (let x = 0; x < W; x += 36) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
  for (let y = 0; y < H; y += 36) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  const t = game.frameCount;
  const scanY = ((t * 1.4) % H);
  const sg = ctx.createLinearGradient(0, scanY - 30, 0, scanY + 30);
  sg.addColorStop(0, 'rgba(100,220,255,0)');
  sg.addColorStop(0.5, 'rgba(100,220,255,0.05)');
  sg.addColorStop(1, 'rgba(100,220,255,0)');
  ctx.fillStyle = sg; ctx.fillRect(0, scanY - 30, W, 60);
}

function drawHeader(ctx) {
  ctx.save();
  ctx.fillStyle = '#00ccff'; ctx.shadowColor = '#00ccff'; ctx.shadowBlur = 20;
  ctx.font = 'bold 22px Orbitron,Courier New'; ctx.textAlign = 'center';
  ctx.fillText('素材合成', W / 2, 34);
  ctx.shadowBlur = 0;
  ctx.strokeStyle = 'rgba(0,200,255,0.3)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(10, 42); ctx.lineTo(W - 10, 42); ctx.stroke();
  ctx.restore();
  // 所持素材バー
  const mats = ['scrap','core','crystal','composite','fusionStone','starCrystal'];
  const slotW = (W - 20) / mats.length;
  mats.forEach((m, i) => {
    const bx = 10 + i * slotW;
    const col = MAT_COLOR[m] || '#888';
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.04)';
    ctx.beginPath(); ctx.roundRect(bx + 1, 2, slotW - 3, HDR_H - 6, 4); ctx.fill();
    ctx.fillStyle = col; ctx.font = 'bold 10px Orbitron,Courier New'; ctx.textAlign = 'center';
    ctx.fillText(`${MAT_ICON[m] || '?'} ${matHave(m)}`, bx + slotW / 2, 22);
    ctx.restore();
  });
}

function drawRecipeList(ctx) {
  const hits = [];
  SYNTH_RECIPES.forEach((r, i) => {
    const ry = LIST_Y + i * (CARD_H + CARD_GAP);
    const sel = game.synthCursor === i;
    const can = maxTimes(r) > 0;
    const col = can ? '#00ccff' : 'rgba(100,140,160,0.4)';
    ctx.save();
    ctx.fillStyle = sel ? 'rgba(0,180,255,0.18)' : 'rgba(0,80,120,0.10)';
    ctx.strokeStyle = sel ? 'rgba(0,200,255,0.8)' : (can ? 'rgba(0,150,200,0.35)' : 'rgba(80,100,120,0.2)');
    ctx.lineWidth = sel ? 1.5 : 1;
    ctx.beginPath(); ctx.roundRect(COL1_X, ry, COL1_W, CARD_H, 7); ctx.fill(); ctx.stroke();
    // アイコン
    ctx.font = '22px serif'; ctx.textAlign = 'left';
    ctx.fillText(r.icon, COL1_X + 10, ry + 28);
    // ラベル
    ctx.fillStyle = sel ? '#fff' : col;
    ctx.font = `bold 11px Orbitron,Courier New`; ctx.textAlign = 'left';
    ctx.fillText(r.label, COL1_X + 40, ry + 22);
    // 材料
    ctx.font = '10px Orbitron,Courier New'; ctx.fillStyle = 'rgba(200,220,240,0.7)';
    const parts = Object.entries(r.input).map(([k, v]) => `${MAT_ICON[k]}×${v}`).join('  ');
    ctx.fillText(parts, COL1_X + 40, ry + 40);
    // 結果
    const outCol = MAT_COLOR[r.output.type] || '#aaa';
    ctx.fillStyle = outCol; ctx.font = 'bold 11px Orbitron,Courier New'; ctx.textAlign = 'right';
    ctx.fillText(`→ ${MAT_ICON[r.output.type] || '?'}×${r.output.n}`, COL1_X + COL1_W - 10, ry + 22);
    // 可能数
    const mn = maxTimes(r);
    ctx.fillStyle = mn > 0 ? '#88ffcc' : 'rgba(100,120,140,0.5)';
    ctx.font = '9px Orbitron,Courier New'; ctx.textAlign = 'right';
    ctx.fillText(mn > 0 ? `最大 ${mn}回` : '素材不足', COL1_X + COL1_W - 10, ry + 38);
    ctx.restore();
    hits.push({ i, x: COL1_X, y: ry, w: COL1_W, h: CARD_H });
  });
  game._synthRecipeHits = hits;
}

function drawRecipeDetail(ctx) {
  const r = SYNTH_RECIPES[game.synthCursor];
  if (!r) return;
  const can = maxTimes(r) > 0;
  const x = COL2_X, w = COL2_W;
  let y = LIST_Y;

  // アイコン大
  ctx.save();
  ctx.font = '40px serif'; ctx.textAlign = 'center';
  ctx.fillText(r.icon, x + w / 2, y + 44); y += 55;
  // レシピ名
  ctx.fillStyle = '#00ccff'; ctx.shadowColor = '#00ccff'; ctx.shadowBlur = 8;
  ctx.font = 'bold 14px Orbitron,Courier New'; ctx.textAlign = 'center';
  ctx.fillText(r.label, x + w / 2, y + 6); ctx.shadowBlur = 0; y += 24;
  // 区切り
  ctx.strokeStyle = 'rgba(0,200,255,0.2)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(x + 10, y); ctx.lineTo(x + w - 10, y); ctx.stroke(); y += 14;
  // 材料リスト
  ctx.fillStyle = 'rgba(180,210,230,0.7)'; ctx.font = 'bold 10px Orbitron,Courier New'; ctx.textAlign = 'left';
  ctx.fillText('必要素材', x + 10, y); y += 16;
  for (const [k, v] of Object.entries(r.input)) {
    const have = matHave(k);
    const ok = have >= v;
    ctx.fillStyle = ok ? '#88ffcc' : '#ff6666';
    ctx.font = '12px Courier New'; ctx.textAlign = 'left';
    ctx.fillText(`${MAT_ICON[k]} ${MAT_LABEL[k]?.replace(/^[^\s]+\s/,'') || k}`, x + 16, y);
    ctx.textAlign = 'right';
    ctx.fillText(`${have} / ${v}`, x + w - 12, y); y += 20;
  }
  y += 8;
  // 結果
  const outCol = MAT_COLOR[r.output.type] || '#aaa';
  ctx.fillStyle = 'rgba(180,210,230,0.7)'; ctx.font = 'bold 10px Orbitron,Courier New'; ctx.textAlign = 'left';
  ctx.fillText('合成結果', x + 10, y); y += 16;
  ctx.fillStyle = outCol; ctx.font = '14px Courier New'; ctx.textAlign = 'left';
  ctx.fillText(`${MAT_ICON[r.output.type]} ${MAT_LABEL[r.output.type]?.replace(/^[^\s]+\s/,'') || r.output.type} × ${r.output.n}`, x + 16, y); y += 30;
  // ボタン ×1
  const btnY1 = y, btnH = 42;
  const btn1Col = can ? '#00aaff' : 'rgba(60,80,100,0.5)';
  ctx.fillStyle = can ? 'rgba(0,150,220,0.22)' : 'rgba(30,40,60,0.4)';
  ctx.strokeStyle = btn1Col; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.roundRect(x + 8, btnY1, w - 16, btnH, 8); ctx.fill(); ctx.stroke();
  ctx.fillStyle = can ? '#fff' : 'rgba(100,130,160,0.4)';
  ctx.font = 'bold 12px Orbitron,Courier New'; ctx.textAlign = 'center';
  ctx.fillText('合成 × 1', x + w / 2, btnY1 + 26); y += btnH + 8;
  // ボタン 最大
  const btnY2 = y;
  const mn = maxTimes(r);
  const canMax = mn > 1;
  ctx.fillStyle = canMax ? 'rgba(0,180,120,0.18)' : 'rgba(30,40,60,0.4)';
  ctx.strokeStyle = canMax ? '#00ffaa' : 'rgba(60,80,100,0.5)'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.roundRect(x + 8, btnY2, w - 16, btnH, 8); ctx.fill(); ctx.stroke();
  ctx.fillStyle = canMax ? '#00ffaa' : 'rgba(100,130,160,0.4)';
  ctx.font = 'bold 12px Orbitron,Courier New'; ctx.textAlign = 'center';
  ctx.fillText(`最大合成 (×${mn})`, x + w / 2, btnY2 + 26);
  ctx.restore();
  game._synthBtn1Hit  = { x: x + 8, y: btnY1, w: w - 16, h: btnH, enabled: can };
  game._synthBtnMaxHit = { x: x + 8, y: btnY2, w: w - 16, h: btnH, enabled: canMax };
}

export function drawSynthesisScreen() {
  const ctx = drawDeps.ctx;
  drawBg(ctx);
  drawHeader(ctx);
  drawRecipeList(ctx);
  drawRecipeDetail(ctx);
}
