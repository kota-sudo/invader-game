/**
 * 装備融合画面
 */
import { game } from '../game/game-store.js';
import { CANVAS_W as W, CANVAS_H as H } from '../game/constants.js';
import * as GD from '../game-data.js';

const { EQUIP_POOL, RARITY_COLORS, MAT_COLOR } = GD;
const MAT_ICON = GD.MAT_ICON ?? {
  scrap: '🔩', core: '⚡', crystal: '💎', composite: '🔷', fusionStone: '🔮', starCrystal: '💫',
};
import { drawEquipShape } from './draw-equip-shape.js';

let drawDeps;
let getEquipMainEffectText;
export function setFusionScreenDrawDeps(deps) {
  drawDeps = deps;
  ({ getEquipMainEffectText } = deps);
}

const BG      = '#020408';
const HDR_H   = 52;
const COL1_X  = 8,  COL1_W = 368;
const COL2_X  = 390, COL2_W = W - COL2_X - 8;
const GRID_Y  = HDR_H + 4;
const CARD_W  = (COL1_W - 6) / 3, CARD_H = 100, CARD_GAP = 4;
const STAR_COSTS = [200, 500, 1000, 2000, 4000];
const STONE_COSTS = [1, 2, 3, 4, 5];

function ownedEquips() {
  return EQUIP_POOL.filter(e => game.gachaInventory?.[e.id]);
}

function getStars(id) { return game.equipStars?.[id] || 0; }

function starBonus(id) {
  const s = getStars(id);
  return s > 0 ? `+${s * 5}% 全ステ` : '補正なし';
}

function drawBg(ctx) {
  ctx.fillStyle = BG; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = 'rgba(255,180,0,0.035)'; ctx.lineWidth = 1;
  for (let x = 0; x < W; x += 36) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
  for (let y = 0; y < H; y += 36) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  const t = game.frameCount;
  const scanY = ((t * 1.2) % H);
  const sg = ctx.createLinearGradient(0, scanY - 30, 0, scanY + 30);
  sg.addColorStop(0, 'rgba(255,200,0,0)');
  sg.addColorStop(0.5, 'rgba(255,200,0,0.04)');
  sg.addColorStop(1, 'rgba(255,200,0,0)');
  ctx.fillStyle = sg; ctx.fillRect(0, scanY - 30, W, 60);
}

function drawHeader(ctx) {
  ctx.save();
  ctx.fillStyle = '#ffcc44'; ctx.shadowColor = '#ffcc44'; ctx.shadowBlur = 18;
  ctx.font = 'bold 22px Orbitron,Courier New'; ctx.textAlign = 'center';
  ctx.fillText('装備融合', W / 2, 34); ctx.shadowBlur = 0;
  // 融合石残数
  ctx.font = '11px Orbitron,Courier New'; ctx.textAlign = 'right';
  ctx.fillStyle = MAT_COLOR.fusionStone; ctx.shadowColor = MAT_COLOR.fusionStone; ctx.shadowBlur = 6;
  ctx.fillText(`🔮 融合石: ${game.materials?.fusionStone || 0}`, W - 12, 34); ctx.shadowBlur = 0;
  ctx.strokeStyle = 'rgba(255,200,0,0.25)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(10, 42); ctx.lineTo(W - 10, 42); ctx.stroke();
  ctx.restore();
}

function drawEquipGrid(ctx) {
  const equips = ownedEquips();
  const hits = [];
  equips.forEach((e, i) => {
    const col = Math.floor(i % 3), row = Math.floor(i / 3);
    const cx = COL1_X + col * (CARD_W + CARD_GAP);
    const cy = GRID_Y + row * (CARD_H + CARD_GAP) - (game.fusionScrollY || 0);
    if (cy + CARD_H < GRID_Y - 10 || cy > H + 10) return;
    const sel = game.fusionCursor === i;
    const stars = getStars(e.id);
    const rc = RARITY_COLORS[e.rarity] || e.color || '#aaa';
    ctx.save();
    ctx.fillStyle = sel ? 'rgba(255,200,50,0.18)' : 'rgba(30,25,10,0.6)';
    ctx.strokeStyle = sel ? 'rgba(255,200,50,0.9)' : (stars >= 5 ? 'rgba(255,220,100,0.7)' : rc + '44');
    ctx.lineWidth = sel ? 2 : 1;
    ctx.beginPath(); ctx.roundRect(cx, cy, CARD_W, CARD_H, 6); ctx.fill(); ctx.stroke();
    // レアリティ帯
    ctx.fillStyle = rc + '33';
    ctx.beginPath(); ctx.roundRect(cx + 1, cy + 1, CARD_W - 2, 22, [5, 5, 0, 0]); ctx.fill();
    ctx.fillStyle = rc; ctx.font = 'bold 8px Orbitron,Courier New'; ctx.textAlign = 'left';
    ctx.fillText(e.rarity, cx + 6, cy + 14);
    // 装備アイコン
    try { drawEquipShape(ctx, cx + CARD_W / 2 - 14, cy + 22, 28, 28, e); } catch (_) {
      ctx.fillStyle = rc; ctx.font = '22px serif'; ctx.textAlign = 'center';
      ctx.fillText('⚔', cx + CARD_W / 2, cy + 46);
    }
    // 装備名
    ctx.fillStyle = '#ddd'; ctx.font = '8px Orbitron,Courier New'; ctx.textAlign = 'center';
    const label = e.label.length > 8 ? e.label.slice(0, 7) + '…' : e.label;
    ctx.fillText(label, cx + CARD_W / 2, cy + 56);
    // 星
    const starStr = '★'.repeat(stars) + '☆'.repeat(5 - stars);
    ctx.fillStyle = stars > 0 ? '#ffdd44' : 'rgba(120,120,120,0.5)';
    ctx.font = `${stars > 0 ? 'bold ' : ''}9px serif`; ctx.textAlign = 'center';
    ctx.fillText(starStr, cx + CARD_W / 2, cy + 70);
    // スロット
    ctx.fillStyle = 'rgba(150,170,200,0.5)'; ctx.font = '8px Courier New'; ctx.textAlign = 'center';
    ctx.fillText((e.slot || '').toUpperCase(), cx + CARD_W / 2, cy + 84);
    ctx.restore();
    hits.push({ i, x: cx, y: cy, w: CARD_W, h: CARD_H });
  });
  game._fusionItemHits = hits;

  if (equips.length === 0) {
    ctx.save();
    ctx.fillStyle = 'rgba(140,160,180,0.5)'; ctx.font = '13px Orbitron,Courier New'; ctx.textAlign = 'center';
    ctx.fillText('装備なし — ガチャで入手', COL1_X + COL1_W / 2, H / 2);
    ctx.restore();
  }
}

function drawFusionDetail(ctx) {
  const equips = ownedEquips();
  if (equips.length === 0) return;
  const e = equips[Math.min(game.fusionCursor, equips.length - 1)];
  if (!e) return;
  const stars = getStars(e.id);
  const x = COL2_X, w = COL2_W;
  let y = GRID_Y;
  const rc = RARITY_COLORS[e.rarity] || e.color || '#aaa';

  ctx.save();
  // 区画背景
  ctx.fillStyle = 'rgba(20,16,6,0.6)'; ctx.strokeStyle = 'rgba(255,200,50,0.15)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.roundRect(x, y, w, H - y - 4, 8); ctx.fill(); ctx.stroke();

  // 装備アイコン大
  try { drawEquipShape(ctx, x + w / 2 - 24, y + 10, 48, 48, e); } catch (_) {
    ctx.font = '40px serif'; ctx.textAlign = 'center'; ctx.fillText('⚔', x + w / 2, y + 52);
  }
  y += 60;

  // レアリティ + 名前
  ctx.fillStyle = rc; ctx.shadowColor = rc; ctx.shadowBlur = 6;
  ctx.font = 'bold 13px Orbitron,Courier New'; ctx.textAlign = 'center';
  ctx.fillText(e.label, x + w / 2, y + 14); ctx.shadowBlur = 0; y += 20;

  // 効果テキスト
  ctx.fillStyle = 'rgba(200,220,240,0.7)'; ctx.font = '10px Courier New'; ctx.textAlign = 'center';
  try { ctx.fillText(getEquipMainEffectText(e), x + w / 2, y + 12); } catch (_) {}
  y += 20;

  // 星表示
  const starStr = '★'.repeat(stars) + '☆'.repeat(5 - stars);
  ctx.font = `bold 20px serif`; ctx.textAlign = 'center';
  ctx.fillStyle = stars > 0 ? '#ffdd44' : 'rgba(120,120,120,0.4)';
  if (stars > 0) { ctx.shadowColor = '#ffdd44'; ctx.shadowBlur = 12; }
  ctx.fillText(starStr, x + w / 2, y + 22); ctx.shadowBlur = 0; y += 28;

  // ボーナス
  ctx.fillStyle = stars > 0 ? '#88ffcc' : 'rgba(130,150,170,0.5)'; ctx.font = 'bold 10px Orbitron,Courier New'; ctx.textAlign = 'center';
  ctx.fillText(starBonus(e.id), x + w / 2, y + 12); y += 22;

  ctx.strokeStyle = 'rgba(255,200,50,0.12)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(x + 14, y); ctx.lineTo(x + w - 14, y); ctx.stroke(); y += 12;

  // 次の星コスト or MAX
  const btnH = 46;
  if (stars >= 5) {
    ctx.fillStyle = '#ffdd44'; ctx.shadowColor = '#ffdd44'; ctx.shadowBlur = 10;
    ctx.font = 'bold 14px Orbitron,Courier New'; ctx.textAlign = 'center';
    ctx.fillText('✨ MAX STAR', x + w / 2, y + 20); ctx.shadowBlur = 0;
    game._fusionBtnHit = null;
  } else {
    const stoneCost = STONE_COSTS[stars];
    const coinCost  = STAR_COSTS[stars];
    const haveStone = (game.materials?.fusionStone || 0) >= stoneCost;
    const haveCoins = (game.coins || 0) >= coinCost;
    const can = haveStone && haveCoins;

    // 必要素材表示
    ctx.font = 'bold 9px Orbitron,Courier New'; ctx.textAlign = 'left'; ctx.fillStyle = 'rgba(180,200,220,0.6)';
    ctx.fillText(`★${stars + 1} 融合コスト`, x + 14, y + 14); y += 20;
    ctx.font = '11px Courier New'; ctx.textAlign = 'left';
    ctx.fillStyle = haveStone ? '#88ffcc' : '#ff6666';
    ctx.fillText(`🔮 融合石 × ${stoneCost}  (所持: ${game.materials?.fusionStone || 0})`, x + 14, y + 12); y += 18;
    ctx.fillStyle = haveCoins ? '#ffdd44' : '#ff6666';
    ctx.fillText(`💰 コイン × ${coinCost.toLocaleString()}  (所持: ${(game.coins || 0).toLocaleString()})`, x + 14, y + 12); y += 20;

    // 融合ボタン
    ctx.fillStyle = can ? 'rgba(255,190,30,0.22)' : 'rgba(30,25,10,0.5)';
    ctx.strokeStyle = can ? 'rgba(255,210,60,0.9)' : 'rgba(80,70,30,0.4)'; ctx.lineWidth = can ? 2 : 1;
    ctx.beginPath(); ctx.roundRect(x + 10, y, w - 20, btnH, 9); ctx.fill(); ctx.stroke();
    if (can) { ctx.shadowColor = '#ffcc33'; ctx.shadowBlur = 12; }
    ctx.fillStyle = can ? '#fff' : 'rgba(120,110,60,0.45)';
    ctx.font = 'bold 13px Orbitron,Courier New'; ctx.textAlign = 'center';
    ctx.fillText(`★${stars + 1} に 融合`, x + w / 2, y + 28); ctx.shadowBlur = 0;
    game._fusionBtnHit = { x: x + 10, y, w: w - 20, h: btnH, enabled: can, itemId: e.id };
  }
  ctx.restore();
}

export function drawFusionScreen() {
  const ctx = drawDeps.ctx;
  drawBg(ctx);
  drawHeader(ctx);
  drawEquipGrid(ctx);
  drawFusionDetail(ctx);
}
