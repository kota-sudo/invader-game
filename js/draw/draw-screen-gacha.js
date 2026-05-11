/**
 * Gacha-related screen drawing (extracted from draw-screens.js)
 */
import { game } from '../game/game-store.js';
import { CANVAS_W as W, CANVAS_H as H } from '../game/constants.js';
import {
  ALL_GACHA_POOL,
  RARITY_COLORS,
  LR_RAINBOW,
  getLRColor,
  appendColorAlpha,
  currentPickupId,
} from '../game-data.js';
import { drawPetShape } from './draw-pet-shape.js';
import { drawEquipShape } from './draw-equip-shape.js';
import { drawShipShape } from './draw-ship-shape.js';
import { drawDragonLordPortrait, isDragonLordChar } from './dragon-lord-portrait.js';
import { hexToRgb } from '../game/color-utils.js';
import { wrapFillJp, truncateLine } from './canvas-utils.js';
import {
  getStardustShopItems,
  getStardustShopCycleIndex,
  getMsUntilNextStardustShopCycle,
  formatStardustShopRotationCountdownJa,
  getNextStardustShopPreviewLines,
  STARDUST_SHOP_WEEK_COUNT,
} from '../game/stardust-shop.js';
import { canDailyGacha } from '../game/gacha.js';
import { playSound } from '../game/audio.js';

let drawDeps;
let pickCharShipShape;

const GATE_OPEN = 60, GATE_WARPOUT = 50, GATE_FADEIN = 40;
function gateStall(r) { return r === 'LR' ? 180 : r === 'SSR' ? 110 : r === 'SR' ? 55 : 14; }
function gateTotal(r) { return GATE_OPEN + gateStall(r) + GATE_WARPOUT + GATE_FADEIN; }


export function setGachaScreensDrawDeps(deps) {
  drawDeps = deps;
  ({ pickCharShipShape } = deps);
}

export function getGachaResultCardLayout() {
  const cx = W / 2, cy = H / 2;
  const cw = 340, ch = 372, cxl = cx - cw / 2, cyl = cy - ch / 2 - 12;
  return { cx, cy, cw, ch, cxl, cyl };
}

export function getGachaAuxStripLayout() {
  if (game.gachaTab === 0) {
    const pityBottom = 388 + 34;
    const stripY = pityBottom + 10;
    return { stripY, ratesBtn: { x: 436, y: stripY, w: 124, h: 42 }, dustBtn: { x: 566, y: stripY, w: 196, h: 42 } };
  }
  if (game.gachaTab === 1) {
    const pityBottom = 450 + 56;
    const stripY = pityBottom + 10;
    return { stripY, ratesBtn: { x: 436, y: stripY, w: 124, h: 42 }, dustBtn: { x: 566, y: stripY, w: 196, h: 42 } };
  }
  return null;
}

export function getGachaInsufficientModalRect() {
  const mw = Math.min(W - 120, 380), mh = 186;
  return { mx: (W - mw) / 2, my: (H - mh) / 2, mw, mh };
}

export function getGachaZukanFilterPools() {
  return [
    ALL_GACHA_POOL.filter(i => i.type === 'char' || i.type === 'skin'),
    ALL_GACHA_POOL.filter(i => i.type === 'equip'),
    ALL_GACHA_POOL.filter(i => i.type === 'pet'),
    ALL_GACHA_POOL.filter(i => i.type === 'weapon'),
  ];
}

const ZUKAN_GRID_COLS = 4;
export function computeZukanGridMetrics(fY, fH) {
  const cols = ZUKAN_GRID_COLS, gPad = 6;
  const zukanPanelL = 426, zukanPanelW = W - 430;
  const sideM = 8;
  const avail = Math.max(120, zukanPanelW - sideM * 2);
  const cellW = Math.floor((avail - (cols - 1) * gPad) / cols);
  const cellH = Math.min(88, Math.max(70, cellW));
  const totalGridW = cols * cellW + (cols - 1) * gPad;
  const gStartX = zukanPanelL + Math.floor((zukanPanelW - totalGridW) / 2);
  const gStartY = fY + fH + 8;
  const gAreaH = H - gStartY - 54;
  const maxRows = Math.max(1, Math.floor(gAreaH / (cellH + gPad)));
  return { cols, cellW, cellH, gPad, gStartX, gStartY, maxRows };
}

function gachaTypeLabelJp(tp) {
  const m = { char: '機体', skin: 'スキン', equip: '装備', pet: 'ペット', weapon: '武器', passive: 'パッシブ' };
  return m[tp] || tp || '';
}

function drawGachaAuxInfoStrip(L) {
  const ctx = drawDeps.ctx;
  const { ratesBtn, dustBtn } = L;
  const prem = game.gachaTab === 1;
  const rGrad = ctx.createLinearGradient(ratesBtn.x, ratesBtn.y, ratesBtn.x + ratesBtn.w, ratesBtn.y + ratesBtn.h);
  rGrad.addColorStop(0, prem ? 'rgba(48,22,72,0.96)' : 'rgba(22,28,48,0.96)');
  rGrad.addColorStop(1, prem ? 'rgba(24,12,40,0.98)' : 'rgba(12,14,24,0.98)');
  ctx.fillStyle = rGrad; ctx.strokeStyle = prem ? 'rgba(190,130,230,0.45)' : 'rgba(100,130,180,0.42)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.roundRect(ratesBtn.x, ratesBtn.y, ratesBtn.w, ratesBtn.h, 10); ctx.fill(); ctx.stroke();
  ctx.fillStyle = prem ? '#d8b8f0' : '#8aa0c8'; ctx.font = 'bold 11px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('ℹ 排出率', ratesBtn.x + ratesBtn.w / 2, ratesBtn.y + ratesBtn.h / 2 + 3);
  const g = ctx.createLinearGradient(dustBtn.x, dustBtn.y, dustBtn.x + dustBtn.w, dustBtn.y + dustBtn.h);
  g.addColorStop(0, 'rgba(96,70,14,0.98)'); g.addColorStop(1, 'rgba(48,34,8,0.98)');
  ctx.shadowColor = 'rgba(255,210,120,0.14)'; ctx.shadowBlur = 4;
  ctx.fillStyle = g; ctx.strokeStyle = 'rgba(220,180,90,0.55)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.roundRect(dustBtn.x, dustBtn.y, dustBtn.w, dustBtn.h, 10); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;
  ctx.fillStyle = '#ffe7a8'; ctx.font = 'bold 11px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif'; ctx.textAlign = 'left';
  ctx.fillText('スターダスト交換', dustBtn.x + 12, dustBtn.y + 19);
  ctx.fillStyle = '#ffd86a'; ctx.font = 'bold 18px Orbitron,Courier New'; ctx.textAlign = 'right';
  ctx.fillText(`✦ ${game.gachaStardust}`, dustBtn.x + dustBtn.w - 10, dustBtn.y + 31);
  ctx.textAlign = 'left';
}

function drawGachaInsufficientModal() {
  const ctx = drawDeps.ctx;
  const m = game.gachaInsufficientModal;
  if (!m || !m.open) return;
  const R = getGachaInsufficientModalRect();
  ctx.fillStyle = 'rgba(0,0,0,0.65)'; ctx.fillRect(0, 0, W, H);
  const bod = ctx.createLinearGradient(R.mx, R.my, R.mx + R.mw, R.my + R.mh);
  bod.addColorStop(0, 'rgba(28,14,40,0.98)'); bod.addColorStop(0.5, 'rgba(14,10,24,0.99)'); bod.addColorStop(1, 'rgba(22,12,36,0.98)');
  ctx.fillStyle = bod; ctx.strokeStyle = 'rgba(255,140,180,0.85)'; ctx.lineWidth = 2.2;
  ctx.shadowColor = 'rgba(200,80,160,0.35)'; ctx.shadowBlur = 18;
  ctx.beginPath(); ctx.roundRect(R.mx, R.my, R.mw, R.mh, 14); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;
  ctx.fillStyle = '#ffd8e8'; ctx.font = 'bold 16px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('ジェムが不足しています', R.mx + R.mw / 2, R.my + 48);
  ctx.fillStyle = '#c8b8e8'; ctx.font = 'bold 12px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif';
  ctx.fillText(`あと ${m.need} ジェムで引けます`, R.mx + R.mw / 2, R.my + 72);
  ctx.fillStyle = '#e5d6ff'; ctx.font = 'bold 13px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif';
  ctx.fillText('ショップでジェムを購入しますか？', R.mx + R.mw / 2, R.my + 94);
  const by = R.my + 112, bw = 132, bh = 40, gap = 12;
  const bx1 = R.mx + R.mw / 2 - bw - gap / 2, bx2 = R.mx + R.mw / 2 + gap / 2;
  const g1 = ctx.createLinearGradient(bx1, by, bx1 + bw, by + bh);
  g1.addColorStop(0, 'rgba(36,38,54,0.98)'); g1.addColorStop(1, 'rgba(22,24,36,0.99)');
  ctx.fillStyle = g1; ctx.strokeStyle = '#8890b0'; ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.roundRect(bx1, by, bw, bh, 9); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#dce0f2'; ctx.font = 'bold 13px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif';
  ctx.fillText('いいえ', bx1 + bw / 2, by + 25);
  const g2 = ctx.createLinearGradient(bx2, by, bx2 + bw, by + bh);
  g2.addColorStop(0, 'rgba(120,70,20,0.98)'); g2.addColorStop(1, 'rgba(72,38,10,0.99)');
  ctx.shadowColor = 'rgba(255,200,100,0.25)'; ctx.shadowBlur = 10;
  ctx.fillStyle = g2; ctx.strokeStyle = '#ffcc88'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.roundRect(bx2, by, bw, bh, 9); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;
  ctx.fillStyle = '#fff0d8'; ctx.font = 'bold 13px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif';
  ctx.fillText('はい（ショップへ）', bx2 + bw / 2, by + 25);
  ctx.textAlign = 'left';
}

export function drawGemInlineIcon(x, y, size, color = '#6be0ff') {
  const ctx = drawDeps.ctx;
  const s = size;
  ctx.save(); ctx.translate(x, y);
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.moveTo(0, -s * 0.58); ctx.lineTo(s * 0.48, 0); ctx.lineTo(0, s * 0.58); ctx.lineTo(-s * 0.48, 0); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.beginPath(); ctx.arc(-s * 0.14, -s * 0.16, Math.max(1, s * 0.11), 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

export function drawCoinInlineIcon(x, y, size) {
  const ctx = drawDeps.ctx;
  const s = size;
  ctx.save(); ctx.translate(x, y);
  const g = ctx.createLinearGradient(-s * 0.5, -s * 0.5, s * 0.5, s * 0.5);
  g.addColorStop(0, '#fff0a8'); g.addColorStop(0.5, '#ffd34d'); g.addColorStop(1, '#9b6a00');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.ellipse(0, 0, s * 0.52, s * 0.4, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(120,80,0,0.8)'; ctx.lineWidth = Math.max(1, s * 0.08); ctx.stroke();
  ctx.restore();
}

function formatZukanStatsLine(item, owned) {
  if (!owned || !item) return '';
  const t = item.type;
  if (t === 'char' || t === 'skin') {
    const p = [];
    if (item.hp) p.push(`HP ${item.hp}`);
    if (item.atk) p.push(`火力×${item.atk}`);
    if (item.def) p.push(`防御+${item.def}%`);
    if (item.crit) p.push(`会心+${item.crit}%`);
    if (item.spd) p.push(`速攻+${item.spd}`);
    return p.join('　');
  }
  if (t === 'equip') {
    const p = [];
    if (item.hp) p.push(`HP+${item.hp}`);
    if (item.atk && item.atk > 1) p.push(`火力×${item.atk}`);
    if (item.def) p.push(`防御+${item.def}%`);
    if (item.crit) p.push(`会心+${item.crit}%`);
    if (item.spd) p.push(`速攻+${item.spd}`);
    return p.join('　');
  }
  if (t === 'weapon' && item.ammo != null) return `弾数 ${item.ammo}`;
  return '';
}

function drawGachaZukanLeftDetail() {
  const ctx = drawDeps.ctx;
  const filterPools = getGachaZukanFilterPools();
  const fPool = filterPools[game.collectionFilter] || [];
  if (!fPool.length) return;
  const maxI = fPool.length - 1;
  game.collectionCursor = Math.max(0, Math.min(game.collectionCursor, maxI));
  const item = fPool[game.collectionCursor];
  if (!item) return;
  const owned = !!(item.id && game.gachaInventory[item.id]);
  const rc = RARITY_COLORS[item.rarity] || item.color || '#88aacc';
  const leftColW = 420, pw = 348, ph = 248;
  const px = Math.floor((leftColW - pw) / 2), py = 92;
  const detG = ctx.createLinearGradient(px, py, px, py + ph);
  detG.addColorStop(0, 'rgba(18,28,42,0.98)'); detG.addColorStop(1, 'rgba(8,12,22,0.99)');
  ctx.fillStyle = detG; ctx.strokeStyle = 'rgba(120,200,255,0.6)'; ctx.lineWidth = 2.2;
  ctx.shadowColor = 'rgba(80,160,255,0.2)'; ctx.shadowBlur = 10;
  ctx.beginPath(); ctx.roundRect(px, py, pw, ph, 14); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;
  const cx = px + pw / 2, icy = py + 50;
  ctx.save(); ctx.translate(cx, icy);
  if (owned) {
    ctx.shadowColor = rc; ctx.shadowBlur = 16;
    if (item.type === 'char' || item.type === 'skin') {
      ctx.scale(1.68, 1.68);
      const photo = isDragonLordChar(item)
        && drawDragonLordPortrait(ctx, 0, 0, 30, 22, {
          glowColor: rc,
          frameCount: game.frameCount,
          tier: 'compact',
          active: true,
        });
      if (!photo) {
        drawShipShape(ctx, -14, -8, 28, 16, pickCharShipShape(item), item.color || rc, item.rarity);
      }
    } else if (item.type === 'pet' && item.effect) {
      ctx.scale(1.05, 1.05); drawPetShape(ctx, item.effect, rc, item.rarity);
    } else if (item.type === 'equip') {
      ctx.scale(1.05, 1.05); drawEquipShape(ctx, item, rc, item.rarity);
    } else if (item.type === 'weapon') {
      ctx.scale(1.55, 1.55); drawGachaItemIcon(item);
    } else {
      ctx.scale(1.35, 1.35); drawGachaItemIcon(item);
    }
    ctx.shadowBlur = 0;
  } else {
    ctx.fillStyle = 'rgba(40,48,72,0.95)';
    ctx.beginPath(); ctx.arc(0, 0, 44, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(100,120,160,0.5)'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#6a7390'; ctx.font = 'bold 36px Orbitron,Courier New'; ctx.textAlign = 'center';
    ctx.fillText('?', 0, 12);
  }
  ctx.restore();
  const nameY = py + 94;
  ctx.textAlign = 'center';
  ctx.fillStyle = owned ? '#f2f8ff' : '#aab6cc';
  ctx.font = `bold ${owned ? 16 : 15}px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif`;
  const nameShown = owned ? truncateLine(ctx, item.label, pw - 24) : '？？？';
  ctx.fillText(nameShown, cx, nameY);
  ctx.font = 'bold 12px Orbitron,Courier New'; ctx.fillStyle = rc;
  ctx.fillText(item.rarity, cx, nameY + 20);
  ctx.fillStyle = '#d0e6fc'; ctx.font = 'bold 12px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif';
  ctx.fillText(`${gachaTypeLabelJp(item.type)}${owned ? '' : '（未入手）'}`, cx, nameY + 38);
  ctx.textAlign = 'left';
  let descStr = 'ガチャで入手すると、名前・説明・性能がここに表示されます。';
  if (owned) {
    const flavor = item.desc || '—';
    const role = item.type === 'char' || item.type === 'skin' ? '戦闘機体' :
      item.type === 'equip' ? '装備' : item.type === 'pet' ? 'サポートペット' :
        item.type === 'weapon' ? '主兵装' : '特殊効果';
    const rareTxt = item.rarity === 'LR' ? 'レジェンド級。通常ガチャでは排出されない特別枠。' :
      item.rarity === 'SSR' ? '最高クラス。終盤まで主力になれる高性能。' :
        item.rarity === 'SR' ? '扱いやすく伸びる中核レア。' :
          item.rarity === 'R' ? '序盤〜中盤の強化に有効。' : '基礎を固める通常レア。';
    descStr = `${flavor}\n分類: ${role}\n${rareTxt}`;
  }
  ctx.fillStyle = '#e4eeff'; ctx.font = 'bold 11px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif';
  const descTop = nameY + 50, descMaxLines = owned ? 5 : 4, descLineH = 13;
  const descEndY = wrapFillJp(ctx, descStr, px + 12, descTop, pw - 24, descLineH, descMaxLines);
  const st = formatZukanStatsLine(item, owned);
  let footY = descEndY + 10;
  const footMaxY = py + ph - 8, statLineH = 12;
  if (st) {
    ctx.fillStyle = '#c8dff8'; ctx.font = 'bold 9px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif';
    const maxStatLines = Math.max(1, Math.floor((footMaxY - footY) / statLineH));
    footY = wrapFillJp(ctx, st, px + 12, footY, pw - 24, statLineH, maxStatLines);
  }
  const statsBaseline = st ? footY - statLineH : footY;
  const inv = owned && item.id ? game.gachaInventory[item.id] : null;
  if (inv && (inv.level || 1) > 1) {
    ctx.fillStyle = '#ffd699'; ctx.font = 'bold 10px Orbitron,Courier New'; ctx.textAlign = 'right';
    ctx.fillText(`Lv.${inv.level}`, px + pw - 12, statsBaseline);
    ctx.textAlign = 'left';
  }
}

function drawGachaHeroNormal(t) {
  const ctx = drawDeps.ctx;
  const cx = 210, cy = 218, bob = Math.sin(t * 2.2) * 5;
  const pl = ctx.createLinearGradient(cx - 112, cy + 52, cx + 112, cy + 82);
  pl.addColorStop(0, '#1c1a22'); pl.addColorStop(0.35, '#3d3838'); pl.addColorStop(0.55, '#5a5248'); pl.addColorStop(0.78, '#3a342c'); pl.addColorStop(1, '#121016');
  ctx.fillStyle = pl;
  ctx.beginPath(); ctx.roundRect(cx - 104, cy + 52 + bob, 208, 22, 6); ctx.fill();
  ctx.strokeStyle = 'rgba(255,215,140,0.45)'; ctx.lineWidth = 1.25;
  ctx.beginPath(); ctx.roundRect(cx - 104, cy + 52 + bob, 208, 22, 6); ctx.stroke();
  ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.roundRect(cx - 103, cy + 53 + bob, 206, 20, 5); ctx.stroke();
  for (let i = -1; i <= 1; i++) {
    ctx.save();
    const ox = i * 44, oy = Math.sin(t * 2.4 + i * 1.1) * 4 + bob;
    ctx.translate(cx + ox, cy + oy);
    ctx.rotate(i * 0.1 + Math.sin(t * 1.7 + i) * 0.04);
    const topG = ctx.createLinearGradient(-14, -26, 14, -8);
    topG.addColorStop(0, '#fffef8'); topG.addColorStop(0.25, '#fff4d0'); topG.addColorStop(0.55, '#f0c060'); topG.addColorStop(1, '#c07820');
    ctx.fillStyle = topG;
    ctx.beginPath(); ctx.ellipse(0, -10, 16, 20, 0, Math.PI, 0, false); ctx.fill();
    const botG = ctx.createLinearGradient(-4, -4, 4, 26);
    botG.addColorStop(0, '#ffeec8'); botG.addColorStop(0.35, '#e8a038'); botG.addColorStop(0.7, '#985018'); botG.addColorStop(1, '#2a1810');
    ctx.fillStyle = botG;
    ctx.beginPath(); ctx.ellipse(0, -6, 16, 22, 0, 0, Math.PI); ctx.fill();
    ctx.strokeStyle = 'rgba(60,35,12,0.55)'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.ellipse(0, -8, 16.5, 21.5, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(-16, -6); ctx.lineTo(16, -6); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.beginPath(); ctx.ellipse(-6, -18, 4, 2.2, 0.35, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  for (let k = 0; k < 22; k++) {
    const a = t * 1.45 + k * 0.71;
    const r = 48 + Math.sin(t * 2.8 + k * 0.5) * 18;
    ctx.globalAlpha = 0.08 + Math.sin(t * 3.5 + k) * 0.06;
    ctx.fillStyle = k % 3 === 0 ? '#fff2c8' : '#ffd070';
    ctx.beginPath(); ctx.arc(cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.42 + bob, 0.9 + (k % 4) * 0.28, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

const GACHA_HERO_SRC = { coin: './assets/gacha/coin-hero.png', prem: './assets/gacha/premium-hero.png' };
const gachaHeroImages = { coin: new Image(), prem: new Image() };
(function initGachaHeroImages() {
  gachaHeroImages.coin.src = GACHA_HERO_SRC.coin;
  gachaHeroImages.prem.src = GACHA_HERO_SRC.prem;
})();

function drawGachaHeroImageCover(img, x, y, w, h, clipR) {
  const ctx = drawDeps.ctx;
  if (!img || !img.complete || img.naturalWidth < 2) return false;
  const iw = img.naturalWidth, ih = img.naturalHeight;
  const scale = Math.max(w / iw, h / ih);
  const dw = iw * scale, dh = ih * scale;
  const dx = x + (w - dw) / 2, dy = y + (h - dh) / 2;
  ctx.save();
  if (clipR > 0) { ctx.beginPath(); ctx.roundRect(x, y, w, h, clipR); ctx.clip(); }
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.restore();
  return true;
}

function drawGachaHeroPremium(t) {
  const ctx = drawDeps.ctx;
  const cx = 210, cy = 218, bob = Math.sin(t * 2) * 4;
  ctx.save(); ctx.translate(cx, cy + bob);
  const halo = ctx.createRadialGradient(0, -6, 0, 0, 0, 92);
  halo.addColorStop(0, 'rgba(255,230,255,0.55)'); halo.addColorStop(0.28, 'rgba(220,120,255,0.35)'); halo.addColorStop(0.55, 'rgba(120,40,200,0.15)'); halo.addColorStop(1, 'transparent');
  ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(0, 0, 92, 0, Math.PI * 2); ctx.fill();
  const dg = ctx.createLinearGradient(-42, -54, 44, 58);
  dg.addColorStop(0, '#ffffff'); dg.addColorStop(0.12, '#ffe8ff'); dg.addColorStop(0.28, '#f0a0ff'); dg.addColorStop(0.48, '#c040f0');
  dg.addColorStop(0.68, '#6020a8'); dg.addColorStop(0.88, '#200848'); dg.addColorStop(1, '#080018');
  ctx.fillStyle = dg; ctx.shadowColor = '#e8a0ff'; ctx.shadowBlur = 32;
  ctx.beginPath(); ctx.moveTo(0, -50); ctx.lineTo(36, 4); ctx.lineTo(0, 54); ctx.lineTo(-36, 4); ctx.closePath(); ctx.fill(); ctx.shadowBlur = 0;
  ctx.strokeStyle = 'rgba(255,255,255,0.65)'; ctx.lineWidth = 2.2;
  ctx.beginPath(); ctx.moveTo(-8, -40); ctx.lineTo(0, -50); ctx.lineTo(8, -40); ctx.stroke();
  ctx.strokeStyle = 'rgba(40,0,80,0.45)'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(0, -50); ctx.lineTo(36, 4); ctx.lineTo(0, 54); ctx.lineTo(-36, 4); ctx.closePath(); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.92)'; ctx.beginPath(); ctx.arc(-11, -21, 3.6, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,200,255,0.35)'; ctx.beginPath(); ctx.arc(10, 8, 2.2, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(255,240,255,0.4)'; ctx.lineWidth = 1.3;
  ctx.beginPath(); ctx.moveTo(0, -50); ctx.lineTo(0, 54); ctx.stroke();
  for (let r = 0; r < 2; r++) {
    const rot = t * (r === 0 ? 0.9 : -1.1), rad = r === 0 ? 48 : 62;
    ctx.save(); ctx.rotate(rot); ctx.globalAlpha = 0.16;
    ctx.strokeStyle = r === 0 ? '#ffd6ff' : '#c8a6ff'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(0, -rad); ctx.lineTo(rad * 0.66, 0); ctx.lineTo(0, rad); ctx.lineTo(-rad * 0.66, 0); ctx.closePath(); ctx.stroke();
    ctx.restore();
  }
  ctx.globalAlpha = 1;
  for (let s = 0; s < 14; s++) {
    const ang = t * 1.15 + s * 0.45, rr = 58 + s * 6;
    ctx.globalAlpha = 0.1 + Math.sin(t * 2.8 + s) * 0.08;
    ctx.fillStyle = s % 3 === 0 ? '#ffffff' : s % 3 === 1 ? '#ffb8ff' : '#cca0ff';
    ctx.beginPath(); ctx.arc(Math.cos(ang) * rr * 0.38, Math.sin(ang) * rr * 0.3 - 4, 1.1 + s * 0.04, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

function drawGachaLeftColumn(tab, t) {
  const ctx = drawDeps.ctx;
  const w0 = 420;
  if (tab === 0) {
    const bg = ctx.createLinearGradient(0, 0, w0, H * 0.65);
    bg.addColorStop(0, '#040308'); bg.addColorStop(0.35, '#0a0812'); bg.addColorStop(0.65, '#100c18'); bg.addColorStop(1, '#06040a');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, w0, H);
    const v1 = ctx.createRadialGradient(130, 120, 0, 130, 120, 260);
    v1.addColorStop(0, 'rgba(255,220,140,0.26)'); v1.addColorStop(0.35, 'rgba(200,140,60,0.1)'); v1.addColorStop(1, 'transparent');
    ctx.fillStyle = v1; ctx.fillRect(0, 0, w0, H);
    const v2 = ctx.createRadialGradient(340, H * 0.55, 0, 340, H * 0.55, 220);
    v2.addColorStop(0, 'rgba(100,90,160,0.1)'); v2.addColorStop(1, 'transparent');
    ctx.fillStyle = v2; ctx.fillRect(0, 0, w0, H);
    const topSh = ctx.createLinearGradient(0, 0, 0, 140);
    topSh.addColorStop(0, 'rgba(0,0,0,0.35)'); topSh.addColorStop(1, 'transparent');
    ctx.fillStyle = topSh; ctx.fillRect(0, 0, w0, 140);
  } else if (tab === 1) {
    const bg = ctx.createLinearGradient(0, 0, w0, H);
    bg.addColorStop(0, '#050208'); bg.addColorStop(0.45, '#0c0618'); bg.addColorStop(1, '#080414');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, w0, H);
    const v1 = ctx.createRadialGradient(200, 150, 0, 200, 150, 280);
    v1.addColorStop(0, 'rgba(240,150,255,0.22)'); v1.addColorStop(0.4, 'rgba(140,60,200,0.12)'); v1.addColorStop(1, 'transparent');
    ctx.fillStyle = v1; ctx.fillRect(0, 0, w0, H);
    const v2 = ctx.createRadialGradient(80, H - 120, 0, 80, H - 120, 180);
    v2.addColorStop(0, 'rgba(80,40,140,0.18)'); v2.addColorStop(1, 'transparent');
    ctx.fillStyle = v2; ctx.fillRect(0, 0, w0, H);
    const topSh = ctx.createLinearGradient(0, 0, 0, 120);
    topSh.addColorStop(0, 'rgba(0,0,0,0.3)'); topSh.addColorStop(1, 'transparent');
    ctx.fillStyle = topSh; ctx.fillRect(0, 0, w0, 120);
  } else {
    const bg = ctx.createLinearGradient(0, 0, w0, 0);
    bg.addColorStop(0, '#050a10'); bg.addColorStop(1, '#0e1620');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, w0, H);
    const v = ctx.createRadialGradient(190, 240, 0, 190, 240, 200);
    v.addColorStop(0, 'rgba(80,160,220,0.12)'); v.addColorStop(1, 'transparent');
    ctx.fillStyle = v; ctx.fillRect(0, 0, w0, H);
  }
  ctx.textAlign = 'center'; ctx.shadowBlur = 0;
  const heroCard = { x: 10, y: 52, w: 400, h: 252, r: 16 };
  if (tab === 0) {
    ctx.shadowColor = 'rgba(255,200,80,0.35)'; ctx.shadowBlur = 14;
    ctx.strokeStyle = 'rgba(255,210,130,0.65)'; ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.roundRect(heroCard.x, heroCard.y, heroCard.w, heroCard.h, heroCard.r); ctx.stroke(); ctx.shadowBlur = 0;
    ctx.save();
    ctx.beginPath(); ctx.roundRect(heroCard.x, heroCard.y, heroCard.w, heroCard.h, heroCard.r); ctx.clip();
    const okImg = drawGachaHeroImageCover(gachaHeroImages.coin, heroCard.x, heroCard.y, heroCard.w, heroCard.h, 0);
    if (!okImg) drawGachaHeroNormal(t);
    ctx.restore();
    const vg = ctx.createLinearGradient(0, heroCard.y + heroCard.h * 0.5, 0, heroCard.y + heroCard.h);
    vg.addColorStop(0, 'transparent'); vg.addColorStop(1, 'rgba(4,3,10,0.88)');
    ctx.fillStyle = vg;
    ctx.beginPath(); ctx.roundRect(heroCard.x, heroCard.y, heroCard.w, heroCard.h, heroCard.r); ctx.fill();
    const vTop = ctx.createLinearGradient(0, heroCard.y, 0, heroCard.y + 64);
    vTop.addColorStop(0, 'rgba(0,0,0,0.5)'); vTop.addColorStop(1, 'transparent');
    ctx.fillStyle = vTop; ctx.fillRect(heroCard.x, heroCard.y, heroCard.w, 64);
    ctx.shadowColor = 'rgba(255,210,120,0.55)'; ctx.shadowBlur = 18;
    ctx.fillStyle = '#fff8e8'; ctx.font = 'bold 24px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif';
    ctx.fillText('コインガチャ', 210, 42); ctx.shadowBlur = 0;
    ctx.fillStyle = '#d4c4a8'; ctx.font = '12px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif';
    ctx.fillText('毎日無料 + SSR天井あり', 210, 66);
  } else if (tab === 1) {
    ctx.shadowColor = 'rgba(200,120,255,0.4)'; ctx.shadowBlur = 16;
    ctx.strokeStyle = 'rgba(220,170,255,0.7)'; ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.roundRect(heroCard.x, heroCard.y, heroCard.w, heroCard.h, heroCard.r); ctx.stroke(); ctx.shadowBlur = 0;
    ctx.save();
    ctx.beginPath(); ctx.roundRect(heroCard.x, heroCard.y, heroCard.w, heroCard.h, heroCard.r); ctx.clip();
    const okImg = drawGachaHeroImageCover(gachaHeroImages.prem, heroCard.x, heroCard.y, heroCard.w, heroCard.h, 0);
    if (!okImg) drawGachaHeroPremium(t);
    ctx.restore();
    const vg = ctx.createLinearGradient(0, heroCard.y + heroCard.h * 0.48, 0, heroCard.y + heroCard.h);
    vg.addColorStop(0, 'transparent'); vg.addColorStop(1, 'rgba(6,2,14,0.9)');
    ctx.fillStyle = vg;
    ctx.beginPath(); ctx.roundRect(heroCard.x, heroCard.y, heroCard.w, heroCard.h, heroCard.r); ctx.fill();
    const vTop = ctx.createLinearGradient(0, heroCard.y, 0, heroCard.y + 70);
    vTop.addColorStop(0, 'rgba(0,0,0,0.55)'); vTop.addColorStop(1, 'transparent');
    ctx.fillStyle = vTop; ctx.fillRect(heroCard.x, heroCard.y, heroCard.w, 70);
    ctx.shadowColor = 'rgba(230,160,255,0.55)'; ctx.shadowBlur = 20;
    ctx.fillStyle = '#f8ecff'; ctx.font = 'bold 24px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif';
    ctx.fillText('プレミアムガチャ', 210, 44); ctx.shadowBlur = 0;
    ctx.fillStyle = '#b898d8'; ctx.font = '12px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif';
    ctx.fillText('ピックアップ＋高レア率', 210, 68);
  } else {
    const hx = 14, hy = 22, hw = 392, hh = 64, hr = 14;
    const hg = ctx.createLinearGradient(hx, hy, hx, hy + hh);
    hg.addColorStop(0, 'rgba(16,40,58,0.97)'); hg.addColorStop(1, 'rgba(8,18,32,0.99)');
    ctx.fillStyle = hg; ctx.strokeStyle = 'rgba(100,190,255,0.55)'; ctx.lineWidth = 2;
    ctx.shadowColor = 'rgba(80,170,255,0.25)'; ctx.shadowBlur = 12;
    ctx.beginPath(); ctx.roundRect(hx, hy, hw, hh, hr); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;
    ctx.fillStyle = '#e8f8ff'; ctx.font = 'bold 21px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('図鑑', 210, 48);
    ctx.fillStyle = '#b0d4f0'; ctx.font = 'bold 11px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif';
    ctx.fillText('右の一覧からタップで詳細表示', 210, 66);
    drawGachaZukanLeftDetail();
  }
  if (tab !== 2) {
    const ownedItems = ALL_GACHA_POOL.filter(i => game.gachaInventory[i.id]);
    const bx = 24, bw = 372, baseY = 318;
    const statPx = 12, statPy = 304, statPw = 396, statPh = 92, statPr = 12;
    const sGrad = ctx.createLinearGradient(statPx, statPy, statPx, statPy + statPh);
    sGrad.addColorStop(0, tab === 0 ? 'rgba(40,32,14,0.92)' : 'rgba(36,20,48,0.92)');
    sGrad.addColorStop(1, 'rgba(8,10,18,0.96)');
    ctx.fillStyle = sGrad; ctx.strokeStyle = tab === 0 ? 'rgba(255,200,100,0.35)' : 'rgba(200,140,255,0.4)'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.roundRect(statPx, statPy, statPw, statPh, statPr); ctx.fill(); ctx.stroke();
    const rarities = ['LR', 'SSR', 'SR', 'R', 'N'];
    const colW = bw / rarities.length;
    const totalPool = ALL_GACHA_POOL.length;
    const agg = totalPool > 0 ? ownedItems.length / totalPool : 0;
    ctx.textAlign = 'left';
    ctx.fillStyle = '#9aaec8'; ctx.font = 'bold 11px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif';
    ctx.fillText(`図鑑登録 全体 ${ownedItems.length}/${totalPool}`, bx, baseY);
    const aggBarY = baseY + 6, aggBarH = 6;
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.beginPath(); ctx.roundRect(bx, aggBarY, bw, aggBarH, 3); ctx.fill();
    if (agg > 0) {
      const ag = ctx.createLinearGradient(bx, 0, bx + bw, 0);
      ag.addColorStop(0, tab === 0 ? '#ffcc66' : '#cc88ff');
      ag.addColorStop(1, tab === 0 ? '#ff9933' : '#8866ee');
      ctx.fillStyle = ag;
      ctx.beginPath(); ctx.roundRect(bx, aggBarY, Math.max(3, bw * agg), aggBarH, 3); ctx.fill();
    }
    const barY = baseY + 22, barH = 8, padX = 4;
    rarities.forEach((r, ri) => {
      const items = ALL_GACHA_POOL.filter(i => i.rarity === r);
      const tot = items.length;
      const got = tot ? items.filter(i => game.gachaInventory[i.id]).length : 0;
      const x = bx + ri * colW;
      const innerW = Math.max(10, colW - padX * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.beginPath(); ctx.roundRect(x + padX, barY, innerW, barH, 3); ctx.fill();
      if (tot > 0 && got > 0) {
        const pr = got / tot;
        const rc = r === 'LR' ? getLRColor(game.frameCount * 0.06 + ri * 0.2) : RARITY_COLORS[r];
        ctx.fillStyle = rc + 'dd';
        ctx.beginPath(); ctx.roundRect(x + padX, barY, Math.max(2, innerW * pr), barH, 3); ctx.fill();
      }
      ctx.textAlign = 'center';
      const labCol = tot === 0 ? '#556677' : got > 0 ? (r === 'LR' ? getLRColor(game.frameCount * 0.06) : RARITY_COLORS[r]) : '#667788';
      ctx.fillStyle = labCol; ctx.font = 'bold 9px Orbitron,Courier New';
      ctx.fillText(r, x + colW / 2, barY + barH + 12);
      ctx.fillStyle = '#aab8cc'; ctx.font = '8px Orbitron,Courier New';
      ctx.fillText(tot ? `${got}/${tot}` : '—', x + colW / 2, barY + barH + 24);
    });
    ctx.textAlign = 'left';
  }
}

function drawGachaItemIcon(item) {
  const ctx = drawDeps.ctx;
  const ic = item.color || RARITY_COLORS[item.rarity] || '#aaa';
  ctx.fillStyle = ic; ctx.strokeStyle = ic;
  const t = item.type;
  if (t === 'char' || t === 'skin') {
    const r = item.rarity;
    if (r === 'SSR') {
      ctx.beginPath(); ctx.moveTo(0, -24); ctx.lineTo(10, 6); ctx.lineTo(7, 18); ctx.lineTo(-7, 18); ctx.lineTo(-10, 6); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-8, -4); ctx.lineTo(-14, -10); ctx.lineTo(-18, 2); ctx.lineTo(-10, 4); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(8, -4); ctx.lineTo(14, -10); ctx.lineTo(18, 2); ctx.lineTo(10, 4); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-9, 4); ctx.lineTo(-22, 16); ctx.lineTo(-18, 8); ctx.lineTo(-11, 6); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(9, 4); ctx.lineTo(22, 16); ctx.lineTo(18, 8); ctx.lineTo(11, 6); ctx.closePath(); ctx.fill();
      ctx.fillRect(-9, 14, 4, 7); ctx.fillRect(-4, 14, 3, 5); ctx.fillRect(1, 14, 3, 5); ctx.fillRect(5, 14, 4, 7);
      ctx.save(); ctx.globalAlpha = 0.35; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(0, 0, 28, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
    } else if (r === 'SR') {
      ctx.beginPath(); ctx.moveTo(0, -22); ctx.lineTo(9, 8); ctx.lineTo(6, 18); ctx.lineTo(-6, 18); ctx.lineTo(-9, 8); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-7, 2); ctx.lineTo(-20, 16); ctx.lineTo(-15, 8); ctx.lineTo(-9, 4); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(7, 2); ctx.lineTo(20, 16); ctx.lineTo(15, 8); ctx.lineTo(9, 4); ctx.closePath(); ctx.fill();
      ctx.save(); ctx.globalAlpha = 0.8; ctx.fillRect(-8, 12, 5, 7); ctx.fillRect(3, 12, 5, 7); ctx.restore();
    } else if (r === 'R') {
      ctx.beginPath(); ctx.moveTo(0, -20); ctx.lineTo(7, 8); ctx.lineTo(0, 14); ctx.lineTo(-7, 8); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-5, 0); ctx.lineTo(-18, 14); ctx.lineTo(-13, 6); ctx.lineTo(-7, 4); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(5, 0); ctx.lineTo(18, 14); ctx.lineTo(13, 6); ctx.lineTo(7, 4); ctx.closePath(); ctx.fill();
    } else {
      ctx.beginPath(); ctx.moveTo(0, -16); ctx.lineTo(8, 10); ctx.lineTo(-8, 10); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-6, 4); ctx.lineTo(-13, 12); ctx.lineTo(-8, 10); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(6, 4); ctx.lineTo(13, 12); ctx.lineTo(8, 10); ctx.closePath(); ctx.fill();
    }
  } else if (t === 'equip') {
    const slot = item.slot || 'atk';
    if (slot === 'def') {
      ctx.beginPath(); ctx.moveTo(0, -20); ctx.lineTo(15, -12); ctx.lineTo(15, 4); ctx.quadraticCurveTo(15, 20, 0, 26); ctx.quadraticCurveTo(-15, 20, -15, 4); ctx.lineTo(-15, -12); ctx.closePath(); ctx.fill();
      ctx.save(); ctx.globalAlpha = 0.28; ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.moveTo(0, -13); ctx.lineTo(9, -7); ctx.lineTo(9, 4); ctx.quadraticCurveTo(9, 14, 0, 18); ctx.quadraticCurveTo(-9, 14, -9, 4); ctx.lineTo(-9, -7); ctx.closePath(); ctx.fill(); ctx.restore();
    } else if (slot === 'sp') {
      ctx.beginPath(); ctx.moveTo(5, -22); ctx.lineTo(-4, 0); ctx.lineTo(2, 0); ctx.lineTo(-6, 22); ctx.lineTo(12, -2); ctx.lineTo(5, -2); ctx.closePath(); ctx.fill();
    } else {
      ctx.beginPath(); ctx.moveTo(0, -22); ctx.lineTo(13, -6); ctx.lineTo(13, 4); ctx.lineTo(0, 22); ctx.lineTo(-13, 4); ctx.lineTo(-13, -6); ctx.closePath(); ctx.fill();
      ctx.save(); ctx.globalAlpha = 0.32; ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.moveTo(0, -14); ctx.lineTo(8, -4); ctx.lineTo(0, 14); ctx.lineTo(-8, -4); ctx.closePath(); ctx.fill(); ctx.restore();
      ctx.fillStyle = ic;
      ctx.save(); ctx.globalAlpha = 0.45; ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.moveTo(-13, -6); ctx.lineTo(0, -22); ctx.lineTo(13, -6); ctx.moveTo(0, -22); ctx.lineTo(0, -4); ctx.stroke(); ctx.restore();
    }
  } else if (t === 'pet') {
    const eff = item.effect || '';
    if (eff === 'dragon') {
      ctx.beginPath(); ctx.moveTo(-8, -12); ctx.lineTo(-12, -24); ctx.lineTo(-4, -14); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(8, -12); ctx.lineTo(12, -24); ctx.lineTo(4, -14); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.ellipse(0, 4, 13, 11, 0, 0, Math.PI * 2); ctx.fill();
      ctx.save(); ctx.globalAlpha = 0.35; ctx.fillStyle = '#000';
      ctx.beginPath(); ctx.ellipse(0, 10, 8, 5, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      ctx.fillStyle = '#ff6600';
      ctx.beginPath(); ctx.arc(-4, 0, 2.5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(4, 0, 2.5, 0, Math.PI * 2); ctx.fill();
    } else if (eff === 'hawk') {
      ctx.beginPath(); ctx.ellipse(0, 0, 4, 10, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-3, -2); ctx.lineTo(-22, -5); ctx.lineTo(-16, 6); ctx.lineTo(-4, 4); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(3, -2); ctx.lineTo(22, -5); ctx.lineTo(16, 6); ctx.lineTo(4, 4); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-4, 8); ctx.lineTo(0, 20); ctx.lineTo(4, 8); ctx.closePath(); ctx.fill();
    } else if (eff === 'fairy') {
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const ao = (Math.PI * 2 / 5) * i - Math.PI / 2, ai = ao + Math.PI / 5;
        if (i === 0) ctx.moveTo(Math.cos(ao) * 18, Math.sin(ao) * 18); else ctx.lineTo(Math.cos(ao) * 18, Math.sin(ao) * 18);
        ctx.lineTo(Math.cos(ai) * 8, Math.sin(ai) * 8);
      }
      ctx.closePath(); ctx.fill();
    } else if (eff === 'phoenix') {
      ctx.beginPath(); ctx.moveTo(0, -18); ctx.lineTo(8, -2); ctx.lineTo(0, 4); ctx.lineTo(-8, -2); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-7, 6); ctx.lineTo(-12, 20); ctx.lineTo(-6, 14); ctx.lineTo(-2, 22); ctx.lineTo(0, 14); ctx.lineTo(2, 22); ctx.lineTo(6, 14); ctx.lineTo(12, 20); ctx.lineTo(7, 6); ctx.closePath(); ctx.fill();
      ctx.save(); ctx.globalAlpha = 0.75;
      ctx.beginPath(); ctx.moveTo(-6, -4); ctx.lineTo(-18, 4); ctx.lineTo(-12, 10); ctx.lineTo(-5, 6); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(6, -4); ctx.lineTo(18, 4); ctx.lineTo(12, 10); ctx.lineTo(5, 6); ctx.closePath(); ctx.fill();
      ctx.restore();
    } else if (eff === 'heal') {
      ctx.beginPath(); ctx.arc(-6, -4, 9, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(6, -4, 9, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(0, 6, 13, 0, Math.PI); ctx.fill(); ctx.fillRect(-13, 0, 26, 8);
      ctx.save(); ctx.globalAlpha = 0.6; ctx.fillStyle = '#000';
      ctx.beginPath(); ctx.arc(-5, -2, 3, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(5, -2, 3, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    } else if (eff === 'exp' || eff === 'bot') {
      ctx.fillRect(-13, -12, 26, 22); ctx.fillRect(-2, -22, 4, 12);
      ctx.beginPath(); ctx.arc(0, -24, 4, 0, Math.PI * 2); ctx.fill();
      ctx.save(); ctx.fillStyle = '#000'; ctx.fillRect(-9, -7, 7, 5); ctx.fillRect(2, -7, 7, 5);
      ctx.fillStyle = '#0ff'; ctx.globalAlpha = 0.9; ctx.fillRect(-8, -6, 5, 3); ctx.fillRect(3, -6, 5, 3);
      ctx.fillStyle = '#000'; ctx.globalAlpha = 1; ctx.fillRect(-7, 2, 14, 4); ctx.restore();
    } else if (eff === 'turtle') {
      ctx.beginPath(); ctx.ellipse(0, 2, 18, 14, 0, 0, Math.PI * 2); ctx.fill();
      ctx.save(); ctx.globalAlpha = 0.45; ctx.strokeStyle = '#004400'; ctx.lineWidth = 1.5;
      for (let h = 0; h < 6; h++) { const a = h * Math.PI / 3; ctx.beginPath(); ctx.moveTo(0, 2); ctx.lineTo(Math.cos(a) * 16, 2 + Math.sin(a) * 12); ctx.stroke(); }
      ctx.restore(); ctx.fillStyle = '#88cc88';
      ctx.beginPath(); ctx.ellipse(-6, -14, 3, 5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(6, -14, 3, 5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(0, 18, 3, 5, 0, 0, Math.PI * 2); ctx.fill();
    } else if (eff === 'bomber') {
      ctx.beginPath(); ctx.ellipse(0, 0, 12, 8, 0, 0, Math.PI * 2); ctx.fill();
      ctx.save(); ctx.globalAlpha = 0.55; ctx.fillStyle = '#111';
      ctx.fillRect(-11, -4, 7, 8); ctx.fillRect(-2, -4, 7, 8);
      ctx.restore(); ctx.fillStyle = 'rgba(255,255,80,0.9)';
      ctx.beginPath(); ctx.ellipse(0, -12, 10, 5, -0.2, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(0, 12, 10, 5, 0.2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ff2200'; ctx.beginPath(); ctx.arc(0, 0, 4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ff0'; ctx.beginPath(); ctx.arc(0, 0, 2, 0, Math.PI * 2); ctx.fill();
    } else if (eff === 'ghost') {
      ctx.save(); ctx.globalAlpha = 0.75;
      ctx.beginPath(); ctx.arc(0, -4, 16, Math.PI, 0);
      ctx.lineTo(16, 12);
      ctx.quadraticCurveTo(10, 6, 5, 12); ctx.quadraticCurveTo(0, 6, -5, 12); ctx.quadraticCurveTo(-10, 6, -16, 12);
      ctx.lineTo(-16, 12); ctx.closePath(); ctx.fill();
      ctx.restore(); ctx.fillStyle = '#111';
      ctx.beginPath(); ctx.ellipse(-5, -5, 3, 4, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(5, -5, 3, 4, 0, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.beginPath(); ctx.moveTo(-11, -14); ctx.lineTo(-16, -24); ctx.lineTo(-4, -16); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(11, -14); ctx.lineTo(16, -24); ctx.lineTo(4, -16); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.arc(0, -6, 13, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(0, 10, 9, 12, 0, 0, Math.PI * 2); ctx.fill();
      ctx.save(); ctx.globalAlpha = 0.65; ctx.fillStyle = '#000';
      ctx.beginPath(); ctx.ellipse(-4, -6, 2.5, 3.5, -0.2, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(4, -6, 2.5, 3.5, 0.2, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
  } else if (t === 'weapon') {
    const wp = item.weapon || '';
    if (wp === 'laser') {
      ctx.fillRect(-3, -28, 6, 36); ctx.fillRect(-2, -32, 4, 6);
      ctx.beginPath(); ctx.roundRect(-10, 2, 20, 14, 3); ctx.fill();
      ctx.save(); ctx.fillStyle = '#fff'; ctx.globalAlpha = 0.65; ctx.fillRect(-1.5, -22, 3, 20); ctx.restore();
    } else if (wp === 'homing') {
      ctx.beginPath(); ctx.ellipse(0, 0, 11, 20, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.moveTo(0, -24); ctx.lineTo(-7, -18); ctx.lineTo(7, -18); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-8, 14); ctx.lineTo(-14, 22); ctx.lineTo(-6, 18); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(8, 14); ctx.lineTo(14, 22); ctx.lineTo(6, 18); ctx.closePath(); ctx.fill();
    } else if (wp === 'explosive') {
      ctx.beginPath(); ctx.arc(0, 4, 17, 0, Math.PI * 2); ctx.fill();
      ctx.save(); ctx.strokeStyle = ic; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(0, -13); ctx.quadraticCurveTo(8, -20, 4, -26); ctx.stroke(); ctx.restore();
      ctx.fillStyle = '#ff4'; ctx.beginPath(); ctx.arc(4, -27, 4, 0, Math.PI * 2); ctx.fill();
      ctx.save(); ctx.fillStyle = '#fff'; ctx.globalAlpha = 0.18;
      ctx.beginPath(); ctx.arc(-5, -2, 6, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    } else if (wp === 'pulse') {
      ctx.fillRect(-2, -30, 4, 36); ctx.fillRect(-8, -28, 4, 32); ctx.fillRect(4, -28, 4, 32);
      ctx.beginPath(); ctx.roundRect(-10, 4, 20, 10, 3); ctx.fill();
      ctx.save(); ctx.fillStyle = '#fff'; ctx.globalAlpha = 0.5; ctx.fillRect(-1, -24, 2, 18); ctx.restore();
      ctx.save(); ctx.fillStyle = '#ff8833'; ctx.globalAlpha = 0.7;
      ctx.beginPath(); ctx.arc(0, -30, 3, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    } else if (wp === 'gravity') {
      ctx.beginPath(); ctx.arc(0, 4, 14, 0, Math.PI * 2); ctx.fill();
      ctx.save(); ctx.strokeStyle = ic; ctx.lineWidth = 2; ctx.globalAlpha = 0.6;
      ctx.beginPath(); ctx.ellipse(0, 4, 22, 7, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(0, 4, 7, 22, 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
      ctx.save(); ctx.fillStyle = '#fff'; ctx.globalAlpha = 0.22;
      ctx.beginPath(); ctx.arc(-4, -1, 5, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(0, 4, 6, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = ic; ctx.beginPath(); ctx.arc(0, 4, 3, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.fillRect(-9, -22, 5, 28); ctx.fillRect(-3, -26, 6, 30); ctx.fillRect(4, -22, 5, 28);
      ctx.beginPath(); ctx.roundRect(-11, 4, 22, 14, 4); ctx.fill();
    }
  } else {
    ctx.beginPath(); ctx.moveTo(0, -18); ctx.lineTo(13, 0); ctx.lineTo(0, 18); ctx.lineTo(-13, 0); ctx.closePath(); ctx.fill();
  }
}

export function drawGachaScreen() {
  const ctx = drawDeps.ctx;
  ctx.fillStyle = '#02010d'; ctx.fillRect(0, 0, W, H);
  const t = game.frameCount * 0.012;
  const tab = game.gachaTab;
  if (tab !== 2) {
    const blobs = tab === 0
      ? [[220, 300, 240, '#cc8800'], [520, 360, 200, '#886622'], [380, 520, 160, '#554422'], [640, 200, 120, '#442200']]
      : [[160, 260, 200, '#3300aa'], [320, 380, 140, '#660033'], [80, 420, 120, '#001166']];
    blobs.forEach(([nx, ny, nr, nc]) => {
      const ng = ctx.createRadialGradient(nx, ny, 0, nx, ny, nr);
      ng.addColorStop(0, nc + (tab === 0 ? '38' : '44')); ng.addColorStop(0.55, nc + (tab === 0 ? '12' : '14')); ng.addColorStop(1, 'transparent');
      ctx.fillStyle = ng; ctx.fillRect(0, 0, W, H);
    });
  } else {
    ctx.fillStyle = '#080a10'; ctx.fillRect(418, 0, W - 418, H);
  }

  ctx.strokeStyle = tab === 2 ? 'rgba(100,170,240,0.45)' : 'rgba(255,200,120,0.22)';
  ctx.lineWidth = tab === 2 ? 1.2 : 1.5;
  ctx.shadowColor = tab === 2 ? 'rgba(80,160,255,0.2)' : 'rgba(255,190,80,0.15)'; ctx.shadowBlur = 10;
  ctx.beginPath(); ctx.moveTo(420, 0); ctx.lineTo(420, H); ctx.stroke(); ctx.shadowBlur = 0;

  drawGachaLeftColumn(tab, t);

  // ===== RIGHT: タブ切り替え =====
  const tabW = 120, tabH = 34, tab1x = 434, tab2x = 556, tab3x = 678;
  const gachaTabs = [
    { x: tab1x, label: '通常', active: game.gachaTab === 0, col: '#ffd700', bg: 'rgba(80,56,0,0.95)' },
    { x: tab2x, label: 'プレミアム', active: game.gachaTab === 1, col: '#cc44ff', bg: 'rgba(60,0,100,0.97)' },
    { x: tab3x, label: '図鑑', active: game.gachaTab === 2, col: '#44ccff', bg: 'rgba(0,40,80,0.97)' },
  ];
  gachaTabs.forEach(gt => {
    ctx.fillStyle = gt.active ? gt.bg : 'rgba(14,16,26,0.92)';
    ctx.strokeStyle = gt.active ? gt.col : '#2a3044'; ctx.lineWidth = gt.active ? 2 : 1;
    if (gt.active) { ctx.shadowColor = gt.col; ctx.shadowBlur = 6; }
    ctx.beginPath(); ctx.roundRect(gt.x, 6, tabW, tabH, 8); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;
    ctx.fillStyle = gt.active ? gt.col : '#a8b4cc'; ctx.font = 'bold 12px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif'; ctx.textAlign = 'center';
    ctx.shadowColor = gt.active ? gt.col : 'transparent'; ctx.shadowBlur = gt.active ? 4 : 0;
    ctx.fillText(gt.label, gt.x + tabW / 2, 28); ctx.shadowBlur = 0;
  });
  const pkItem = ALL_GACHA_POOL.find(i => i.id === currentPickupId);
  const panelX = 430, panelY = 44, panelW = 334;
  const panelH = game.gachaTab === 1 ? 528 : 454;
  /** パネル内コンテンツ（外枠とカード枠の二重線を避けるインセット） */
  const gcX = panelX + 6, gcW = panelW - 12;
  if (game.gachaTab === 0 || game.gachaTab === 1) {
    const baseCol = game.gachaTab === 0 ? 'rgba(86,62,12,0.35)' : 'rgba(110,36,140,0.34)';
    const rimCol = game.gachaTab === 0 ? 'rgba(255,210,90,0.42)' : 'rgba(210,130,255,0.42)';
    const glow = game.gachaTab === 0 ? 'rgba(255,200,80,0.16)' : 'rgba(200,120,255,0.2)';
    ctx.shadowColor = glow; ctx.shadowBlur = 12;
    const panelG = ctx.createLinearGradient(panelX, panelY, panelX, panelY + panelH);
    panelG.addColorStop(0, 'rgba(12,14,24,0.94)');
    panelG.addColorStop(0.55, 'rgba(9,10,18,0.96)');
    panelG.addColorStop(1, 'rgba(7,8,14,0.98)');
    ctx.fillStyle = panelG; ctx.strokeStyle = rimCol; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.roundRect(panelX, panelY, panelW, panelH, 12); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;
    ctx.fillStyle = baseCol;
    ctx.beginPath(); ctx.roundRect(panelX + 6, panelY + 6, panelW - 12, 48, 9); ctx.fill();
  }

  if (game.gachaTab === 0) {
    // ===== 通常ガチャ (COINS) =====
    const coinPulse = 0.88 + Math.sin(t * 3.5) * 0.12;
    ctx.shadowColor = 'rgba(255,215,90,0.22)'; ctx.shadowBlur = 6 * coinPulse;
    ctx.fillStyle = '#a89870'; ctx.font = 'bold 11px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif'; ctx.textAlign = 'left';
    ctx.fillText('所持コイン', gcX, 58); ctx.shadowBlur = 0;
    drawCoinInlineIcon(gcX, 74, 13);
    ctx.shadowColor = '#ffd700'; ctx.shadowBlur = 8 * coinPulse;
    ctx.fillStyle = '#ffe8a0'; ctx.font = 'bold 26px Orbitron,Courier New';
    ctx.fillText(game.coins.toLocaleString(), gcX + 20, 88); ctx.shadowBlur = 0;
    // デイリー無料ボタン
    const canDaily = canDailyGacha();
    const bdY = 100, bdH = 40;
    ctx.fillStyle = canDaily ? 'rgba(0,56,36,0.96)' : 'rgba(14,14,14,0.72)';
    ctx.strokeStyle = canDaily ? '#33dd99' : '#2a3238'; ctx.lineWidth = canDaily ? 1.5 : 1;
    if (canDaily) { ctx.shadowColor = '#00ff88'; ctx.shadowBlur = 6; }
    ctx.beginPath(); ctx.roundRect(gcX, bdY, gcW, bdH, 8); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;
    if (canDaily) {
      ctx.font = '16px "Segoe UI Emoji","Apple Color Emoji",sans-serif'; ctx.textAlign = 'left';
      ctx.fillText('🎁', gcX + 10, bdY + bdH / 2 + 6);
    }
    ctx.fillStyle = canDaily ? '#e8fff4' : '#445'; ctx.font = 'bold 11px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(canDaily ? 'デイリー無料ガチャ ★' : '本日のデイリーは済み', gcX + gcW / 2, bdY + bdH / 2 + 5);
    if (canDaily) {
      ctx.fillStyle = '#66ffaa'; ctx.font = 'bold 14px Orbitron,Courier New'; ctx.textAlign = 'right';
      ctx.fillText('›', gcX + gcW - 8, bdY + bdH / 2 + 6); ctx.textAlign = 'left';
    }
    // 1回カード（コイン）
    const can1 = game.coins >= 500;
    const b1x = gcX, b1y = 154, b1w = gcW, b1h = 94, b1r = 12;
    if (can1) { ctx.shadowColor = 'rgba(255,200,60,0.28)'; ctx.shadowBlur = 10; }
    ctx.strokeStyle = can1 ? '#e8c060' : '#3a3e4c'; ctx.lineWidth = can1 ? 1.6 : 1;
    const bg1 = ctx.createLinearGradient(b1x, b1y, b1x, b1y + b1h);
    bg1.addColorStop(0, can1 ? 'rgba(55,42,18,0.98)' : 'rgba(22,22,28,0.92)');
    bg1.addColorStop(0.45, can1 ? 'rgba(38,28,12,0.98)' : 'rgba(16,16,20,0.94)');
    bg1.addColorStop(1, can1 ? 'rgba(18,14,8,0.99)' : 'rgba(10,10,14,0.96)');
    ctx.fillStyle = bg1;
    ctx.beginPath(); ctx.roundRect(b1x, b1y, b1w, b1h, b1r); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;
    const tag1x = b1x + 10, tag1y = b1y + 8, tag1w = 52, tag1h = 22;
    ctx.fillStyle = can1 ? '#ffd54a' : '#3a3a42'; ctx.strokeStyle = can1 ? '#e8c878' : '#4a4e58'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(tag1x, tag1y, tag1w, tag1h, 6); ctx.fill(); ctx.stroke();
    ctx.fillStyle = can1 ? '#1a1204' : '#222'; ctx.font = 'bold 10px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('1回', tag1x + tag1w / 2, tag1y + 15);
    drawCoinInlineIcon(b1x + 26, b1y + 44, 12);
    ctx.fillStyle = can1 ? '#fff2cc' : '#dbe2f0'; ctx.font = '900 19px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif'; ctx.textAlign = 'left';
    ctx.fillText('コインで1回まわす', b1x + 48, b1y + 50);
    const c1cw = 136, c1ch = 30, c1cx = b1x + b1w - c1cw - 12, c1cy = b1y + b1h - c1ch - 8;
    const c1g = ctx.createLinearGradient(c1cx, c1cy, c1cx, c1cy + c1ch);
    c1g.addColorStop(0, can1 ? 'rgba(120,82,20,0.99)' : 'rgba(48,48,56,0.96)');
    c1g.addColorStop(1, can1 ? 'rgba(52,36,8,0.99)' : 'rgba(32,32,40,0.98)');
    ctx.fillStyle = c1g; ctx.strokeStyle = can1 ? '#d4b070' : '#6a7080'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(c1cx, c1cy, c1cw, c1ch, 8); ctx.fill(); ctx.stroke();
    drawCoinInlineIcon(c1cx + 14, c1cy + c1ch / 2, 9);
    ctx.fillStyle = can1 ? '#ffe8c8' : '#a8b0c0'; ctx.font = 'bold 9px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif'; ctx.textAlign = 'right';
    ctx.fillText('コイン', c1cx + c1cw - 58, c1cy + c1ch / 2 + 4);
    ctx.fillStyle = can1 ? '#fff8e8' : '#e2e6ef'; ctx.font = 'bold 14px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif';
    ctx.fillText('500', c1cx + c1cw - 10, c1cy + c1ch / 2 + 5);
    ctx.textAlign = 'left';
    ctx.fillStyle = can1 ? '#88ee99' : '#8a96a8'; ctx.font = 'bold 10px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif';
    ctx.fillText('タップで引く', b1x + 48, b1y + b1h - 14);
    // 10連カード（コイン）
    const can10 = game.coins >= 5000;
    const b2x = gcX, b2y = 268, b2w = gcW, b2h = 106, b2r = 12;
    if (can10) { ctx.shadowColor = 'rgba(255,190,70,0.3)'; ctx.shadowBlur = 10; }
    ctx.strokeStyle = can10 ? '#e8c060' : '#3a3e4c'; ctx.lineWidth = can10 ? 1.6 : 1;
    const bg2 = ctx.createLinearGradient(b2x, b2y, b2x, b2y + b2h);
    bg2.addColorStop(0, can10 ? 'rgba(62,46,16,0.98)' : 'rgba(22,22,28,0.92)');
    bg2.addColorStop(0.5, can10 ? 'rgba(42,30,10,0.98)' : 'rgba(16,16,20,0.94)');
    bg2.addColorStop(1, can10 ? 'rgba(20,14,6,0.99)' : 'rgba(10,10,14,0.96)');
    ctx.fillStyle = bg2;
    ctx.beginPath(); ctx.roundRect(b2x, b2y, b2w, b2h, b2r); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;
    const tag2x = b2x + 10, tag2y = b2y + 8, tag2w = 54, tag2h = 22;
    ctx.fillStyle = can10 ? '#ffd54a' : '#3a3a42'; ctx.strokeStyle = can10 ? '#e8c878' : '#4a4e58'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(tag2x, tag2y, tag2w, tag2h, 6); ctx.fill(); ctx.stroke();
    ctx.fillStyle = can10 ? '#1a1204' : '#222'; ctx.font = 'bold 10px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('10連', tag2x + tag2w / 2, tag2y + 15);
    if (can10) { ctx.shadowColor = '#ffaa44'; ctx.shadowBlur = 4; }
    ctx.fillStyle = can10 ? 'rgba(90,48,8,0.95)' : 'rgba(28,22,10,0.75)'; ctx.strokeStyle = can10 ? '#cc8844' : '#4a3820'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(b2x + b2w - 196, tag2y, 178, 22, 5); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;
    ctx.fillStyle = can10 ? '#ffe8c8' : '#6a5530'; ctx.font = 'bold 9px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('★ SR以上1枚確定', b2x + b2w - 196 + 89, tag2y + 15);
    drawCoinInlineIcon(b2x + 26, b2y + 52, 12);
    ctx.fillStyle = can10 ? '#fff0d0' : '#e3d9ee'; ctx.font = '900 19px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif'; ctx.textAlign = 'left';
    ctx.fillText('コインで10連まわす', b2x + 48, b2y + 58);
    const c10cw = 142, c10ch = 28, c10cx = b2x + b2w - c10cw - 12, c10cy = b2y + b2h - c10ch - 8;
    const c10g = ctx.createLinearGradient(c10cx, c10cy, c10cx, c10cy + c10ch);
    c10g.addColorStop(0, can10 ? 'rgba(120,82,20,0.99)' : 'rgba(48,48,56,0.96)');
    c10g.addColorStop(1, can10 ? 'rgba(52,36,8,0.99)' : 'rgba(32,32,40,0.98)');
    ctx.fillStyle = c10g; ctx.strokeStyle = can10 ? '#d4b070' : '#6a7080'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(c10cx, c10cy, c10cw, c10ch, 8); ctx.fill(); ctx.stroke();
    drawCoinInlineIcon(c10cx + 14, c10cy + c10ch / 2, 9);
    ctx.fillStyle = can10 ? '#ffe8c8' : '#a8b0c0'; ctx.font = 'bold 9px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif'; ctx.textAlign = 'right';
    ctx.fillText('コイン', c10cx + c10cw - 62, c10cy + c10ch / 2 + 4);
    ctx.fillStyle = can10 ? '#fff8e8' : '#e2e6ef'; ctx.font = 'bold 14px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif';
    ctx.fillText('5000', c10cx + c10cw - 10, c10cy + c10ch / 2 + 5);
    ctx.textAlign = 'left';
    ctx.fillStyle = can10 ? '#88ee99' : '#8a96a8'; ctx.font = 'bold 10px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif';
    ctx.fillText('タップで引く', b2x + 48, b2y + b2h - 12);
    // 天井バー
    const b3y = 388, b3h = 34; const pityLeft = 80 - game.gachaPityCount;
    const pityCol = pityLeft <= 10 ? '#ff4444' : pityLeft <= 20 ? '#ff9900' : '#5a6a80';
    ctx.fillStyle = 'rgba(16,18,30,0.95)'; ctx.strokeStyle = pityLeft <= 10 ? '#ff5555' : 'rgba(90,140,210,0.45)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(gcX, b3y, gcW, b3h, 8); ctx.fill(); ctx.stroke();
    ctx.fillStyle = pityCol; ctx.shadowColor = pityLeft <= 10 ? pityCol : 'transparent'; ctx.shadowBlur = pityLeft <= 10 ? 4 : 0;
    ctx.font = 'bold 12px Orbitron,Courier New'; ctx.textAlign = 'left';
    ctx.fillText('SSR天井まで', gcX + 10, b3y + 21);
    ctx.textAlign = 'right'; ctx.font = 'bold 14px Orbitron,Courier New';
    ctx.fillText(`${pityLeft} 回`, gcX + gcW - 10, b3y + 21); ctx.shadowBlur = 0;
    ctx.fillStyle = '#1a1e2a'; ctx.fillRect(gcX + 6, b3y + 26, gcW - 12, 4);
    ctx.fillStyle = pityCol; ctx.fillRect(gcX + 6, b3y + 26, (gcW - 12) * (game.gachaPityCount / 80), 4);

  } else {
    // ===== プレミアムガチャ (GEMS) =====
    ctx.shadowColor = 'rgba(240,180,255,0.12)'; ctx.shadowBlur = 4;
    ctx.fillStyle = '#d8c0f0'; ctx.font = 'bold 11px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif'; ctx.textAlign = 'left';
    ctx.fillText('所持ジェム', gcX, 58); ctx.shadowBlur = 0;
    drawGemInlineIcon(gcX + 8, 80, 13, '#68dfff');
    ctx.shadowColor = 'rgba(255,160,255,0.22)'; ctx.shadowBlur = 8;
    const gemHeldText = String(game.gems);
    ctx.fillStyle = '#f8d0ff'; ctx.font = 'bold 26px Orbitron,Courier New'; ctx.textAlign = 'left';
    ctx.fillText(gemHeldText, gcX + 24, 90); ctx.shadowBlur = 0;

    const canP1 = game.gems >= 5;

    // ピックアップバナー（大きめ・強調）
    if (pkItem) {
      const pkc = RARITY_COLORS[pkItem.rarity] || '#ffdd00';
      const pkX = gcX, pkY = 98, pkW = gcW, pkH = 112, pkR = 12;
      if (canP1) { ctx.shadowColor = pkc; ctx.shadowBlur = 8; }
      const pkg = ctx.createLinearGradient(pkX, pkY, pkX + pkW, pkY + pkH);
      pkg.addColorStop(0, 'rgba(36,18,58,0.98)'); pkg.addColorStop(0.5, 'rgba(16,8,28,0.96)'); pkg.addColorStop(1, 'rgba(28,12,48,0.98)');
      ctx.fillStyle = pkg; ctx.strokeStyle = pkc; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.roundRect(pkX, pkY, pkW, pkH, pkR); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;
      ctx.shadowColor = pkc; ctx.shadowBlur = 6;
      ctx.fillStyle = '#fff6cc'; ctx.font = 'bold 11px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif'; ctx.textAlign = 'left';
      ctx.fillText('★ ピックアップ', pkX + 16, pkY + 26); ctx.shadowBlur = 0;
      ctx.fillStyle = pkc; ctx.font = 'bold 19px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif';
      ctx.fillText(pkItem.label, pkX + 16, pkY + 50);
      ctx.fillStyle = '#aab4cc'; ctx.font = '11px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif';
      ctx.fillText(`${pkItem.rarity}  ${truncateLine(ctx, pkItem.desc || '', 220)}`, pkX + 16, pkY + 76);
      ctx.save(); ctx.translate(pkX + pkW - 50, pkY + pkH / 2 + 4); ctx.scale(0.95, 0.95); ctx.fillStyle = pkc; ctx.shadowColor = pkc; ctx.shadowBlur = 8;
      drawGachaItemIcon(pkItem); ctx.restore(); ctx.shadowBlur = 0;
    }

    // 1回 (5gems) — ピックアップ下端 + 余白
    const p1x = gcX, p1y = 222, p1w = gcW, p1h = 94, p1r = 12;
    if (canP1) { ctx.shadowColor = 'rgba(200,100,255,0.28)'; ctx.shadowBlur = 10; }
    ctx.strokeStyle = canP1 ? '#c070e0' : '#3a3e4c'; ctx.lineWidth = canP1 ? 1.6 : 1;
    const pbg1 = ctx.createLinearGradient(p1x, p1y, p1x, p1y + p1h);
    pbg1.addColorStop(0, canP1 ? 'rgba(72,28,108,0.98)' : 'rgba(22,22,28,0.92)');
    pbg1.addColorStop(0.45, canP1 ? 'rgba(48,18,78,0.98)' : 'rgba(16,16,20,0.94)');
    pbg1.addColorStop(1, canP1 ? 'rgba(22,10,40,0.99)' : 'rgba(10,10,14,0.96)');
    ctx.fillStyle = pbg1;
    ctx.beginPath(); ctx.roundRect(p1x, p1y, p1w, p1h, p1r); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;
    const pt1x = p1x + 10, pt1y = p1y + 8, pt1w = 52, pt1h = 22;
    ctx.fillStyle = canP1 ? '#c878ff' : '#3a3a42'; ctx.strokeStyle = canP1 ? '#c898e8' : '#4a4e58'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(pt1x, pt1y, pt1w, pt1h, 6); ctx.fill(); ctx.stroke();
    ctx.fillStyle = canP1 ? '#1a0618' : '#222'; ctx.font = 'bold 10px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('1回', pt1x + pt1w / 2, pt1y + 15);
    drawGemInlineIcon(p1x + 26, p1y + 48, 12, canP1 ? '#7de6ff' : '#b7bccd');
    ctx.fillStyle = canP1 ? '#f4d8ff' : '#dbe2f0'; ctx.font = '900 19px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif'; ctx.textAlign = 'left';
    ctx.fillText('ジェムで1回まわす', p1x + 48, p1y + 54);
    const gc1w = 128, gc1h = 28, gc1x = p1x + p1w - gc1w - 12, gc1y = p1y + p1h - gc1h - 8;
    const gc1g = ctx.createLinearGradient(gc1x, gc1y, gc1x, gc1y + gc1h);
    gc1g.addColorStop(0, canP1 ? 'rgba(90,40,130,0.99)' : 'rgba(48,48,56,0.96)');
    gc1g.addColorStop(1, canP1 ? 'rgba(44,20,72,0.99)' : 'rgba(32,32,40,0.98)');
    ctx.fillStyle = gc1g; ctx.strokeStyle = canP1 ? '#a070c0' : '#6a7080'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(gc1x, gc1y, gc1w, gc1h, 8); ctx.fill(); ctx.stroke();
    drawGemInlineIcon(gc1x + 14, gc1y + gc1h / 2, 9, canP1 ? '#7de6ff' : '#b7bccd');
    ctx.fillStyle = canP1 ? '#e8d8ff' : '#a8b0c0'; ctx.font = 'bold 9px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif'; ctx.textAlign = 'right';
    ctx.fillText('ジェム', gc1x + gc1w - 48, gc1y + gc1h / 2 + 4);
    ctx.fillStyle = canP1 ? '#fff4ff' : '#e2e6ef'; ctx.font = 'bold 14px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif';
    ctx.fillText('5', gc1x + gc1w - 10, gc1y + gc1h / 2 + 5);
    ctx.textAlign = 'left';
    ctx.fillStyle = canP1 ? '#ccaaee' : '#8a96a8'; ctx.font = 'bold 10px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif';
    ctx.fillText('タップで引く', p1x + 48, p1y + p1h - 12);

    // 10連 (50gems)
    const canP10 = game.gems >= 50;
    const p2x = gcX, p2y = 328, p2w = gcW, p2h = 108, p2r = 12;
    if (canP10) { ctx.shadowColor = 'rgba(255,120,255,0.28)'; ctx.shadowBlur = 10; }
    ctx.strokeStyle = canP10 ? '#d080e8' : '#3a3e4c'; ctx.lineWidth = canP10 ? 1.6 : 1;
    const pbg2 = ctx.createLinearGradient(p2x, p2y, p2x, p2y + p2h);
    pbg2.addColorStop(0, canP10 ? 'rgba(100,24,120,0.98)' : 'rgba(22,22,28,0.92)');
    pbg2.addColorStop(0.5, canP10 ? 'rgba(70,16,92,0.98)' : 'rgba(16,16,20,0.94)');
    pbg2.addColorStop(1, canP10 ? 'rgba(36,10,52,0.99)' : 'rgba(10,10,14,0.96)');
    ctx.fillStyle = pbg2;
    ctx.beginPath(); ctx.roundRect(p2x, p2y, p2w, p2h, p2r); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;
    const pt2x = p2x + 10, pt2y = p2y + 8, pt2w = 54, pt2h = 22;
    ctx.fillStyle = canP10 ? '#e070ff' : '#3a3a42'; ctx.strokeStyle = canP10 ? '#d898f0' : '#4a4e58'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(pt2x, pt2y, pt2w, pt2h, 6); ctx.fill(); ctx.stroke();
    ctx.fillStyle = canP10 ? '#1a0618' : '#222'; ctx.font = 'bold 10px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('10連', pt2x + pt2w / 2, pt2y + 15);
    if (canP10) { ctx.shadowColor = '#ffcc44'; ctx.shadowBlur = 4; }
    ctx.fillStyle = canP10 ? 'rgba(72,48,8,0.95)' : 'rgba(28,22,10,0.75)'; ctx.strokeStyle = canP10 ? '#ccaa44' : '#4a3820'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(p2x + p2w - 196, pt2y, 178, 22, 5); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;
    ctx.fillStyle = canP10 ? '#ffe8a8' : '#6a5530'; ctx.font = 'bold 9px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('★ 10連はSSR20%', p2x + p2w - 196 + 89, pt2y + 15);
    drawGemInlineIcon(p2x + 26, p2y + 58, 12, canP10 ? '#7de6ff' : '#b7bccd');
    ctx.fillStyle = canP10 ? '#ffd0ff' : '#e3d9ee'; ctx.font = '900 19px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif'; ctx.textAlign = 'left';
    ctx.fillText('ジェムで10連まわす', p2x + 48, p2y + 64);
    const gc10w = 134, gc10h = 28, gc10x = p2x + p2w - gc10w - 12, gc10y = p2y + p2h - gc10h - 8;
    const gc10g = ctx.createLinearGradient(gc10x, gc10y, gc10x, gc10y + gc10h);
    gc10g.addColorStop(0, canP10 ? 'rgba(88,36,108,0.99)' : 'rgba(48,48,56,0.96)');
    gc10g.addColorStop(1, canP10 ? 'rgba(48,20,72,0.99)' : 'rgba(32,32,40,0.98)');
    ctx.fillStyle = gc10g; ctx.strokeStyle = canP10 ? '#a070c0' : '#6a7080'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(gc10x, gc10y, gc10w, gc10h, 8); ctx.fill(); ctx.stroke();
    drawGemInlineIcon(gc10x + 14, gc10y + gc10h / 2, 9, canP10 ? '#7de6ff' : '#b7bccd');
    ctx.fillStyle = canP10 ? '#e8d8ff' : '#a8b0c0'; ctx.font = 'bold 9px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif'; ctx.textAlign = 'right';
    ctx.fillText('ジェム', gc10x + gc10w - 52, gc10y + gc10h / 2 + 4);
    ctx.fillStyle = canP10 ? '#fff0ff' : '#e2e6ef'; ctx.font = 'bold 14px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif';
    ctx.fillText('50', gc10x + gc10w - 10, gc10y + gc10h / 2 + 5);
    ctx.textAlign = 'left';
    ctx.fillStyle = canP10 ? '#ee99ee' : '#8a96a8'; ctx.font = 'bold 10px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif';
    ctx.fillText('タップで引く', p2x + 48, p2y + p2h - 12);
    // 天井情報 (premium): SSR/LRを1ブロックに統合
    const pb3y = 450;
    const ppLeft = 50 - game.premiumPityCount;
    const plrLeft = 100 - game.premiumLrPityCount;
    const ppCol = ppLeft <= 5 ? '#ff5555' : ppLeft <= 15 ? '#ffb347' : '#b38cff';
    const plrCol = plrLeft <= 10 ? '#ff4b80' : plrLeft <= 25 ? '#ff9d57' : '#9d5aa6';
    ctx.fillStyle = 'rgba(15,10,26,0.94)'; ctx.strokeStyle = 'rgba(148,110,190,0.4)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(gcX, pb3y, gcW, 56, 8); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#d5c4f3'; ctx.font = 'bold 11px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif'; ctx.textAlign = 'left';
    ctx.fillText('天井', gcX + 10, pb3y + 14);
    ctx.fillStyle = ppCol; ctx.font = 'bold 11px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif';
    ctx.fillText(`SSRまで ${ppLeft}回`, gcX + 10, pb3y + 30);
    ctx.fillStyle = plrCol;
    ctx.fillText(`LRまで ${plrLeft}回`, gcX + 10, pb3y + 46);
    const barW = 166, barX = gcX + gcW - barW - 10;
    ctx.fillStyle = 'rgba(38,28,58,0.95)'; ctx.fillRect(barX, pb3y + 23, barW, 4);
    ctx.fillStyle = ppCol; ctx.fillRect(barX, pb3y + 23, barW * (game.premiumPityCount / 50), 4);
    ctx.fillStyle = 'rgba(38,20,36,0.95)'; ctx.fillRect(barX, pb3y + 39, barW, 4);
    ctx.fillStyle = plrCol; ctx.fillRect(barX, pb3y + 39, barW * (game.premiumLrPityCount / 100), 4);
  }

  if (game.gachaTab === 0 || game.gachaTab === 1) {
    const auxL = getGachaAuxStripLayout();
    if (auxL) drawGachaAuxInfoStrip(auxL);
  }
  drawGachaInsufficientModal();

  // 図鑑タブ
  if (game.gachaTab === 2) {
    const zpX = 426, zpY = 38, zpW = W - 430, zpH = H - 46, zpR = 12;
    const zpG = ctx.createLinearGradient(zpX, zpY, zpX, zpY + zpH);
    zpG.addColorStop(0, 'rgba(10,18,32,0.96)'); zpG.addColorStop(0.5, 'rgba(6,10,20,0.98)'); zpG.addColorStop(1, 'rgba(8,14,24,0.99)');
    ctx.shadowColor = 'rgba(60,140,220,0.22)'; ctx.shadowBlur = 16;
    ctx.fillStyle = zpG; ctx.strokeStyle = 'rgba(90,170,240,0.55)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(zpX, zpY, zpW, zpH, zpR); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;
    const filters = ['キャラ', '装備', 'ペット', '武器'];
    const filterPools = getGachaZukanFilterPools();
    const fPool = filterPools[game.collectionFilter] || [];

    // フィルタタブ
    const fW = 88, fH = 30, fStartX = 432, fY = 42;
    filters.forEach((label, fi) => {
      const active = game.collectionFilter === fi;
      const fCol = ['#00ccff', '#ff8844', '#cc88ff', '#44aaff'][fi];
      const fx = fStartX + fi * fW, fy0 = fY;
      ctx.fillStyle = active ? `rgba(${hexToRgb(fCol)},0.36)` : 'rgba(22,26,38,0.97)';
      ctx.strokeStyle = active ? fCol : '#4a5568'; ctx.lineWidth = active ? 2 : 1;
      ctx.beginPath(); ctx.roundRect(fx, fy0, fW - 2, fH, 8); ctx.fill(); ctx.stroke();
      ctx.fillStyle = active ? fCol : '#dde6f5'; ctx.font = `bold ${active ? 13 : 12}px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif`; ctx.textAlign = 'center';
      ctx.shadowColor = active ? fCol : 'transparent'; ctx.shadowBlur = active ? 8 : 0;
      ctx.fillText(label, fx + fW / 2 - 1, fy0 + 20); ctx.shadowBlur = 0;
    });

    // グリッド表示（右パネル内で横方向センター・列少なめでラベル幅を確保）
    const { cols: COLS, cellW, cellH, gPad, gStartX, gStartY, maxRows } = computeZukanGridMetrics(fY, fH);
    const maxCursor = Math.max(0, fPool.length - 1);
    game.collectionCursor = Math.max(0, Math.min(game.collectionCursor, maxCursor));
    const cursorRow = Math.floor(game.collectionCursor / COLS);
    const startRow = Math.max(0, Math.min(cursorRow - Math.floor(maxRows / 2), Math.ceil(fPool.length / COLS) - maxRows));

    for (let row = 0; row < maxRows; row++) {
      for (let col = 0; col < COLS; col++) {
        const idx = (startRow + row) * COLS + col;
        if (idx >= fPool.length) continue;
        const item = fPool[idx];
        const owned = !!game.gachaInventory[item.id];
        const isCur = idx === game.collectionCursor;
        const rc = RARITY_COLORS[item.rarity] || item.color || '#888';
        const cx2 = gStartX + col * (cellW + gPad), cy2 = gStartY + row * (cellH + gPad);

        ctx.fillStyle = owned ? (isCur ? `rgba(${hexToRgb(rc)},0.34)` : 'rgba(22,26,40,0.98)') : 'rgba(14,16,26,0.97)';
        ctx.strokeStyle = owned ? (isCur ? rc : 'rgba(100,140,200,0.55)') : 'rgba(48,58,82,0.65)';
        ctx.lineWidth = isCur ? 2.2 : 1;
        if (isCur) { ctx.shadowColor = rc; ctx.shadowBlur = 14; }
        ctx.beginPath(); ctx.roundRect(cx2, cy2, cellW, cellH, 8); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;

        // アイコン or ?
        ctx.save(); ctx.translate(cx2 + cellW / 2, cy2 + cellH / 2 - 6);
        if (owned) {
          ctx.fillStyle = rc; ctx.shadowColor = rc; ctx.shadowBlur = isCur ? 12 : 4;
          if (item.type === 'char' || item.type === 'skin') {
            const photo = isDragonLordChar(item)
              && drawDragonLordPortrait(ctx, 0, 0, 22, 32, {
                glowColor: rc,
                frameCount: game.frameCount,
                tier: 'compact',
                active: isCur,
              });
            if (!photo) {
              drawShipShape(ctx, -9, -5, 18, 11, pickCharShipShape(item), item.color || rc, item.rarity);
            }
          }
          else if (item.type === 'pet' && item.effect) { ctx.scale(0.58, 0.58); drawPetShape(ctx, item.effect, rc, item.rarity); }
          else if (item.type === 'equip') { ctx.scale(0.62, 0.62); drawEquipShape(ctx, item, rc, item.rarity); }
          else { ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(6, 0); ctx.lineTo(0, 8); ctx.lineTo(-6, 0); ctx.closePath(); ctx.fill(); }
          ctx.shadowBlur = 0;
        } else {
          ctx.fillStyle = 'rgba(60,70,100,0.5)'; ctx.font = 'bold 20px Orbitron,Courier New'; ctx.textAlign = 'center';
          ctx.fillText('?', 0, 8);
        }
        ctx.restore();

        // ラベル（セル幅に合わせて省略）
        ctx.fillStyle = owned ? (isCur ? '#ffffff' : '#e8eef8') : '#aab8d0'; ctx.font = 'bold 10px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif'; ctx.textAlign = 'center';
        const lblPad = 10;
        const lbl = owned ? truncateLine(ctx, item.label, Math.max(24, cellW - lblPad)) : '？？？';
        ctx.fillText(lbl, cx2 + cellW / 2, cy2 + cellH - 3);

        // 所持Lvバッジ
        if (owned && game.gachaInventory[item.id] && (game.gachaInventory[item.id].level || 1) > 1) {
          const lv = game.gachaInventory[item.id].level;
          ctx.fillStyle = 'rgba(255,200,60,0.85)'; ctx.font = 'bold 7px Orbitron,Courier New'; ctx.textAlign = 'center';
          ctx.fillText(`Lv${lv}`, cx2 + 10, cy2 + 10);
        }
      }
    }

    // 図鑑タブ: 天井付近と同系の補助ボタン（排出率はモーダル）
    const fty = H - 52, fth = 44, fgap = 8;
    const fw1 = Math.floor((W - 434 - fgap * 3) / 2);
    const fx2 = 434 + fw1 + fgap;
    const r1g = ctx.createLinearGradient(434, fty, 434 + fw1, fty + fth);
    r1g.addColorStop(0, 'rgba(28,32,52,0.97)'); r1g.addColorStop(1, 'rgba(12,14,26,0.99)');
    ctx.fillStyle = r1g; ctx.strokeStyle = 'rgba(120,160,220,0.55)'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.roundRect(434, fty, fw1, fth, 10); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#b8c8f0'; ctx.font = 'bold 11px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('ℹ 排出率', 434 + fw1 / 2, fty + fth / 2 + 4);
    const dg = ctx.createLinearGradient(fx2, fty, fx2 + fw1, fty + fth);
    dg.addColorStop(0, 'rgba(96,70,14,0.98)'); dg.addColorStop(1, 'rgba(48,34,8,0.98)');
    ctx.shadowColor = 'rgba(255,210,120,0.24)'; ctx.shadowBlur = 8;
    ctx.fillStyle = dg; ctx.strokeStyle = 'rgba(255,204,68,0.72)'; ctx.lineWidth = 1.7;
    ctx.beginPath(); ctx.roundRect(fx2, fty, fw1, fth, 10); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;
    ctx.fillStyle = '#ffe8a0'; ctx.font = 'bold 11px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif'; ctx.textAlign = 'left';
    ctx.fillText('スターダスト交換', fx2 + 12, fty + 19);
    ctx.fillStyle = '#ffd700'; ctx.font = 'bold 18px Orbitron,Courier New'; ctx.textAlign = 'right';
    ctx.fillText(`✦ ${game.gachaStardust}`, fx2 + fw1 - 10, fty + 30);
    ctx.fillStyle = '#c8d4e8'; ctx.font = '10px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif';
    ctx.fillText('フィルタ・マス・下のボタンはタップ', 596, H - 8);
  } else {
    // ナビヒント
    ctx.fillStyle = '#889'; ctx.font = '9px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('R: 排出率モーダル　S: スターダスト交換', 596, H - 8);
  }

  ctx.textAlign = 'left'; ctx.lineWidth = 1;
}

export function getGachaRatesModalRect() {
  const mw = Math.min(W - 32, 720), mh = Math.min(H - 48, 580);
  return { mx: (W - mw) / 2, my: (H - mh) / 2, mw, mh };
}

export function getGachaRatesModalLinkRect() {
  const R = getGachaRatesModalRect();
  return { x: R.mx + 14, y: R.my + R.mh - 40, w: R.mw - 28, h: 28 };
}

function drawGachaRatesContent(boxX, boxY, boxW, boxH) {
  const ctx = drawDeps.ctx;
  const cx = boxX + boxW / 2;
  ctx.fillStyle = '#bbaaff'; ctx.font = `bold ${boxW < 420 ? 11 : 13}px Orbitron,Courier New`; ctx.textAlign = 'center';
  ctx.fillText('排出率 / アイテム一覧', cx, boxY + 14);

  const ratesRowCoin = [{ r: 'LR', v: '0%' }, { r: 'SSR', v: '5%' }, { r: 'SR', v: '15%' }, { r: 'R', v: '30%' }, { r: 'N', v: '50%' }];
  const ratesRowPrem = [{ r: 'LR', v: '1.5%' }, { r: 'SSR', v: '18.5%' }, { r: 'SR', v: '55%' }, { r: 'R', v: '25%' }, { r: 'N', v: '0%' }];
  const isPremRate = game.gachaTab === 1;
  const ratesRow = isPremRate ? ratesRowPrem : ratesRowCoin;
  const gap = boxW < 420 ? 2 : 4, nx = 5, bh = boxH < 380 ? 20 : 24;
  const innerW = boxW - 16;
  const boxRW = (innerW - (nx - 1) * gap) / nx;
  const rx0 = boxX + 8;
  const ry = boxY + 22;
  ratesRow.forEach((rt, i) => {
    const rx = rx0 + i * (boxRW + gap);
    const isLR = rt.r === 'LR';
    const col = isLR ? getLRColor(game.frameCount * 0.06) : RARITY_COLORS[rt.r];
    ctx.fillStyle = 'rgba(15,15,25,0.85)'; ctx.strokeStyle = col; ctx.lineWidth = isLR ? 2 : 1;
    ctx.beginPath(); ctx.roundRect(rx, ry, boxRW, bh, 5); ctx.fill(); ctx.stroke();
    ctx.fillStyle = col; ctx.font = `bold ${boxW < 420 ? 9 : 10}px Orbitron,Courier New`; ctx.textAlign = 'center';
    ctx.fillText(`${rt.r} ${rt.v}`, rx + boxRW / 2, ry + bh * 0.62);
  });
  const fy = ry + bh + 8;
  ctx.fillStyle = '#c1cbe0'; ctx.font = `bold ${boxW < 420 ? 9 : 11}px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif`; ctx.textAlign = 'center';
  ctx.fillText(isPremRate ? 'プレミアム排出率（Nなし）' : '通常(コイン)排出率（LRなし）', cx, fy);
  ctx.fillStyle = '#9da9c6'; ctx.font = `${boxW < 420 ? 8 : 10}px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif`;
  ctx.fillText('10連は通常SR以上1枚確定', cx, fy + 13);

  const order = ['LR', 'SSR', 'SR', 'R', 'N'];
  const sorted = [...ALL_GACHA_POOL].sort((a, b) => order.indexOf(a.rarity) - order.indexOf(b.rarity));
  const listStartY = fy + 26;
  const listEndY = boxY + boxH - 6;
  const cols = 2, colGap = 8;
  const colW = (boxW - 20 - (cols - 1) * colGap) / cols;
  const rows = Math.ceil(sorted.length / cols);
  const ih = 46;
  const visibleRows = Math.max(1, Math.floor((listEndY - listStartY) / ih));
  const maxScroll = Math.max(0, rows - visibleRows);
  game.gachaRatesScroll = Math.max(0, Math.min(game.gachaRatesScroll, maxScroll));
  const startX = boxX + 10;
  sorted.forEach((item, i) => {
    const col = i % cols, row = Math.floor(i / cols);
    const rr = row - game.gachaRatesScroll;
    if (rr < 0 || rr >= visibleRows) return;
    const x = startX + col * (colW + colGap);
    const y = listStartY + rr * ih;
    const owned = !!game.gachaInventory[item.id];
    const isLR = item.rarity === 'LR';
    const rc = isLR ? getLRColor(game.frameCount * 0.05 + i * 0.1) : RARITY_COLORS[item.rarity];
    ctx.fillStyle = owned ? 'rgba(18,18,36,0.92)' : 'rgba(8,8,12,0.75)';
    ctx.strokeStyle = owned ? rc : '#1e1e1e'; ctx.lineWidth = owned ? 1.5 : 1;
    ctx.beginPath(); ctx.roundRect(x, y, colW, ih - 4, 4); ctx.fill(); ctx.stroke();
    ctx.shadowColor = owned ? rc : 'transparent'; ctx.shadowBlur = owned ? 3 : 0;
    ctx.fillStyle = rc; ctx.font = 'bold 10px Orbitron,Courier New'; ctx.textAlign = 'left';
    const titleStr = `[${item.rarity}] ${item.label}`;
    const titleMaxW = colW - (owned ? 48 : 12);
    ctx.fillText(truncateLine(ctx, titleStr, titleMaxW), x + 6, y + 14); ctx.shadowBlur = 0;
    if (owned) {
      const ent = game.gachaInventory[item.id];
      ctx.fillStyle = '#8ef5c4'; ctx.font = 'bold 9px Orbitron,Courier New'; ctx.textAlign = 'right';
      ctx.fillText(`Lv.${ent.level}`, x + colW - 6, y + 14);
      ctx.textAlign = 'left';
    }
    ctx.fillStyle = '#a8b6d0'; ctx.font = '9px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif';
    wrapFillJp(ctx, (item.desc || '').replace(/\r/g, ''), x + 6, y + 26, colW - 12, 11, boxW < 480 ? 2 : 3);
    ctx.textAlign = 'left';
  });
  if (maxScroll > 0) {
    ctx.fillStyle = '#556'; ctx.font = '9px Orbitron,Courier New'; ctx.textAlign = 'center';
    ctx.fillText(`スクロール ${game.gachaRatesScroll + 1}/${maxScroll + 1}（ホイール / ↑↓）`, cx, listEndY + 10);
  }
}

export function drawGachaRatesModalIfOpen() {
  if (game.gachaRatesModal) drawGachaRatesModalOverlay();
}

function drawGachaRatesModalOverlay() {
  const ctx = drawDeps.ctx;
  const R = getGachaRatesModalRect();
  ctx.fillStyle = 'rgba(2,4,14,0.72)'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(14,12,26,0.98)'; ctx.strokeStyle = 'rgba(140,120,220,0.65)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.roundRect(R.mx, R.my, R.mw, R.mh, 14); ctx.fill(); ctx.stroke();
  const hx = R.mx + R.mw - 40, hy = R.my + 8;
  ctx.fillStyle = 'rgba(60,50,90,0.95)'; ctx.strokeStyle = '#8877aa'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.roundRect(hx, hy, 32, 30, 8); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#dde0ff'; ctx.font = 'bold 18px Orbitron,Courier New'; ctx.textAlign = 'center';
  ctx.fillText('×', hx + 16, hy + 22);
  ctx.textAlign = 'left';
  drawGachaRatesContent(R.mx + 10, R.my + 42, R.mw - 20, R.mh - 92);
  const Lk = getGachaRatesModalLinkRect();
  ctx.fillStyle = 'rgba(40,36,70,0.9)'; ctx.strokeStyle = 'rgba(100,90,160,0.5)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.roundRect(Lk.x, Lk.y, Lk.w, Lk.h, 6); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#99aacc'; ctx.font = '10px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('全画面で一覧を開く', Lk.x + Lk.w / 2, Lk.y + Lk.h / 2 + 4);
  ctx.textAlign = 'left';
}

export function drawGachaResult() {
  const ctx = drawDeps.ctx;
  const item = game.gachaResults[game.gachaCurrentIdx];
  if (!item) return;
  const isLR = item.rarity === 'LR';
  const rc = isLR ? getLRColor(game.frameCount * 0.06) : RARITY_COLORS[item.rarity];
  const isSSR = item.rarity === 'SSR', isSR = item.rarity === 'SR';
  const stall = gateStall(item.rarity), total = gateTotal(item.rarity);
  const f = game.gachaAnimFrame;
  const cx = W / 2, cy = H / 2;

  if ((isSSR || isLR) && f === GATE_OPEN + 1) playSound('ssr_stall');
  if ((isSSR || isLR) && f === GATE_OPEN + stall + GATE_WARPOUT + 1) playSound('ssr_reveal');

  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  const backX = 10, backY = 8, backW = 92, backH = 34, backR = 8;
  const backG = ctx.createLinearGradient(backX, backY, backX + backW, backY + backH);
  backG.addColorStop(0, 'rgba(32,30,48,0.98)'); backG.addColorStop(1, 'rgba(14,12,24,0.99)');
  ctx.fillStyle = backG; ctx.strokeStyle = 'rgba(140,130,190,0.55)'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.roundRect(backX, backY, backW, backH, backR); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#c8cce8'; ctx.font = 'bold 11px Orbitron,Courier New'; ctx.textAlign = 'center';
  ctx.fillText('◀ 戻る', backX + backW / 2, backY + backH / 2 + 4);

  // LR: 背景レインボーオーラ（SSR比で控えめ）
  if (isLR) {
    for (let i = 0; i < 4; i++) {
      const a = i / 4, col = getLRColor(i + game.frameCount * 0.04);
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, 320);
      g.addColorStop(a, 'transparent'); g.addColorStop(Math.min(1, a + 0.12), appendColorAlpha(col, '12')); g.addColorStop(Math.min(1, a + 0.28), 'transparent');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    }
  }

  // ===== フェーズ1: ゲートが開く =====
  if (f <= GATE_OPEN + stall + GATE_WARPOUT) {
    const openProg = Math.min(1, f / GATE_OPEN);
    const maxR = isLR ? 205 : isSSR ? 200 : isSR ? 170 : 130;
    const gateR = maxR * openProg;

    const glowSize = isLR ? 300 : isSSR ? 360 : isSR ? 290 : 230;
    const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowSize);
    glow.addColorStop(0, RARITY_COLORS[item.rarity] + (isLR ? '55' : isSSR ? '44' : isSR ? '30' : '22')); glow.addColorStop(1, 'transparent');
    ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H);

    if (gateR > 10) {
      ctx.save(); ctx.translate(cx, cy);
      const rot = f * 0.05;

      ctx.strokeStyle = rc; ctx.lineWidth = isLR ? 4 : isSSR ? 4 : 3;
      ctx.shadowColor = rc; ctx.shadowBlur = isLR ? 28 : isSSR ? 32 : 18;
      ctx.globalAlpha = openProg;
      ctx.beginPath(); ctx.arc(0, 0, gateR, 0, Math.PI * 2); ctx.stroke();

      ctx.rotate(-rot * 1.6);
      ctx.strokeStyle = isSSR ? '#fff' : rc; ctx.lineWidth = isSSR ? 2 : 1.5; ctx.shadowBlur = isSSR ? 16 : 8;
      ctx.setLineDash([12, 8]);
      ctx.beginPath(); ctx.arc(0, 0, gateR * 0.72, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);

      ctx.rotate(rot * 3.2);
      ctx.strokeStyle = rc; ctx.lineWidth = isSSR ? 3 : 2; ctx.shadowBlur = isSSR ? 22 : 12;
      ctx.beginPath(); ctx.arc(0, 0, gateR * 0.44, 0, Math.PI * 2); ctx.stroke();
      ctx.shadowBlur = 0;

      const spCount = isSSR ? 16 : isSR ? 12 : 8;
      for (let i = 0; i < spCount; i++) {
        const a = (Math.PI * 2 / spCount) * i + f * 0.025;
        const sx = Math.cos(a) * gateR, sy = Math.sin(a) * gateR;
        ctx.fillStyle = isSSR ? '#fff' : rc;
        ctx.shadowColor = rc; ctx.shadowBlur = isSSR ? 14 : 8;
        const sp = isSSR ? 4 : isSR ? 3 : 2;
        ctx.beginPath(); ctx.arc(sx, sy, sp, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
        if (isSSR) {
          ctx.strokeStyle = 'rgba(255,255,180,0.3)'; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx * 1.35, sy * 1.35); ctx.stroke();
        }
      }

      const innerR = gateR * 0.38;
      ctx.globalAlpha = Math.min(1, openProg * 1.5);
      const hole = ctx.createRadialGradient(0, 0, 0, 0, 0, innerR);
      hole.addColorStop(0, '#000'); hole.addColorStop(0.7, '#000'); hole.addColorStop(1, 'transparent');
      ctx.fillStyle = hole; ctx.beginPath(); ctx.arc(0, 0, innerR, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.restore();
    }

    // ===== フェーズ1.5: STALL =====
    if (f > GATE_OPEN && f <= GATE_OPEN + stall) {
      const stallProg = (f - GATE_OPEN) / stall;
      const flicker = Math.sin(f * 0.8) > 0;
      const fastFlick = Math.sin(f * 1.8) > 0;

      if (isLR) {
        // レインボー全画面パルス
        const rainCol = getLRColor(game.frameCount * 0.1);
        ctx.globalAlpha = Math.abs(Math.sin(f * 0.12)) * 0.18;
        ctx.fillStyle = rainCol; ctx.fillRect(0, 0, W, H);
        ctx.globalAlpha = 1;

        // レインボーライトニング
        ctx.save(); ctx.translate(cx, cy);
        for (let b = 0; b < 6; b++) {
          if ((b + Math.floor(f / 3)) % 2 !== 0) continue;
          const baseA = (Math.PI * 2 / 6) * b + f * 0.03;
          ctx.strokeStyle = getLRColor(b * 0.5 + game.frameCount * 0.08);
          ctx.lineWidth = 1.2 + Math.random() * 1.2;
          ctx.shadowColor = getLRColor(b * 0.5); ctx.shadowBlur = 10;
          ctx.beginPath(); ctx.moveTo(0, 0);
          let lx = 0, ly = 0;
          for (let s = 1; s <= 7; s++) {
            const d = (180 + Math.random() * 80) / 7 * s;
            const j = (Math.random() - 0.5) * 40;
            lx = Math.cos(baseA) * d + Math.cos(baseA + Math.PI / 2) * j;
            ly = Math.sin(baseA) * d + Math.sin(baseA + Math.PI / 2) * j;
            ctx.lineTo(lx, ly);
          }
          ctx.stroke(); ctx.shadowBlur = 0;
        }
        ctx.restore();

        // "???" 大文字レインボー
        ctx.globalAlpha = fastFlick ? 1.0 : 0.5;
        ctx.shadowColor = getLRColor(game.frameCount * 0.1); ctx.shadowBlur = 32;
        ctx.fillStyle = '#fff'; ctx.font = 'bold 90px Orbitron,Courier New'; ctx.textAlign = 'center';
        ctx.fillText('???', cx, cy + 32); ctx.shadowBlur = 0; ctx.globalAlpha = 1;

        // "LEGEND !!" テキスト
        ctx.globalAlpha = Math.min(1, stallProg * 2.5) * (flicker ? 1 : 0.6);
        const lc = getLRColor(game.frameCount * 0.08);
        ctx.shadowColor = lc; ctx.shadowBlur = 26;
        ctx.fillStyle = lc; ctx.font = 'bold 32px Orbitron,Courier New';
        ctx.fillText('★★  LEGEND  !!  ★★', cx, cy - 130);
        ctx.shadowBlur = 0; ctx.globalAlpha = 1;

        // レインボーコーナーフレーム
        if (fastFlick) {
          for (let i = 0; i < 2; i++) {
            ctx.strokeStyle = getLRColor(i * 1.5 + game.frameCount * 0.05);
            ctx.lineWidth = 4 - i; ctx.shadowColor = ctx.strokeStyle; ctx.shadowBlur = 12;
            ctx.strokeRect(5 + i * 5, 5 + i * 5, W - 10 - i * 10, H - 10 - i * 10);
            ctx.shadowBlur = 0;
          }
        }

        // レインボースピードライン
        ctx.globalAlpha = 0.11 + Math.sin(f * 0.3) * 0.05;
        for (let i = 0; i < 22; i++) {
          const a = (Math.PI * 2 / 22) * i;
          ctx.strokeStyle = getLRColor(i * 0.17);
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(cx + Math.cos(a) * 320, cy + Math.sin(a) * 320);
          ctx.lineTo(cx + Math.cos(a) * 180, cy + Math.sin(a) * 180);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;

      } else if (isSSR) {
        // 金色パルス全画面
        ctx.globalAlpha = Math.abs(Math.sin(f * 0.15)) * 0.28;
        ctx.fillStyle = '#ffcc00'; ctx.fillRect(0, 0, W, H);
        ctx.globalAlpha = 1;

        // ライトニングボルト放射
        ctx.save(); ctx.translate(cx, cy);
        for (let b = 0; b < 8; b++) {
          if ((b + Math.floor(f / 4)) % 3 !== 0) continue;
          const baseA = (Math.PI * 2 / 8) * b + f * 0.02;
          ctx.strokeStyle = `rgba(255,255,120,${0.3 + Math.random() * 0.5})`;
          ctx.lineWidth = 1 + Math.random() * 1.5;
          ctx.shadowColor = '#ffee00'; ctx.shadowBlur = 12;
          ctx.beginPath(); ctx.moveTo(0, 0);
          let lx = 0, ly = 0;
          for (let s = 1; s <= 6; s++) {
            const d = (160 + Math.random() * 70) / 6 * s;
            const j = (Math.random() - 0.5) * 35;
            lx = Math.cos(baseA) * d + Math.cos(baseA + Math.PI / 2) * j;
            ly = Math.sin(baseA) * d + Math.sin(baseA + Math.PI / 2) * j;
            ctx.lineTo(lx, ly);
          }
          ctx.stroke(); ctx.shadowBlur = 0;
        }
        ctx.restore();

        // "???" 大文字
        ctx.globalAlpha = fastFlick ? 1.0 : 0.5;
        ctx.shadowColor = '#ffdd00'; ctx.shadowBlur = 60;
        ctx.fillStyle = '#fff'; ctx.font = 'bold 80px Orbitron,Courier New'; ctx.textAlign = 'center';
        ctx.fillText('???', cx, cy + 28); ctx.shadowBlur = 0; ctx.globalAlpha = 1;

        // "LEGENDARY !!" テキスト
        ctx.globalAlpha = Math.min(1, stallProg * 3) * (flicker ? 1 : 0.7);
        ctx.shadowColor = '#ffdd00'; ctx.shadowBlur = 40;
        ctx.fillStyle = '#ffee44'; ctx.font = 'bold 28px Orbitron,Courier New';
        ctx.fillText('★  LEGENDARY  !!  ★', cx, cy - 115);
        ctx.shadowBlur = 0; ctx.globalAlpha = 1;

        // コーナーフラッシュ枠
        if (fastFlick) {
          ctx.strokeStyle = '#ffdd00'; ctx.lineWidth = 8;
          ctx.shadowColor = '#ffdd00'; ctx.shadowBlur = 30;
          ctx.strokeRect(4, 4, W - 8, H - 8);
          ctx.lineWidth = 2; ctx.strokeRect(16, 16, W - 32, H - 32);
          ctx.shadowBlur = 0;
        }

        // 収束スピードライン
        ctx.globalAlpha = 0.22 + Math.sin(f * 0.3) * 0.08;
        ctx.strokeStyle = '#ffdd00'; ctx.lineWidth = 1;
        for (let i = 0; i < 28; i++) {
          const a = (Math.PI * 2 / 28) * i;
          ctx.beginPath();
          ctx.moveTo(cx + Math.cos(a) * 300, cy + Math.sin(a) * 300);
          ctx.lineTo(cx + Math.cos(a) * 170, cy + Math.sin(a) * 170);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;

      } else if (isSR) {
        ctx.globalAlpha = flicker ? 0.9 : 0.45;
        ctx.shadowColor = rc; ctx.shadowBlur = 35;
        ctx.fillStyle = '#fff'; ctx.font = 'bold 58px Orbitron,Courier New'; ctx.textAlign = 'center';
        ctx.fillText('???', cx, cy + 10); ctx.shadowBlur = 0; ctx.globalAlpha = 1;

        ctx.globalAlpha = Math.min(1, stallProg * 3) * (flicker ? 1 : 0.65);
        ctx.shadowColor = rc; ctx.shadowBlur = 30;
        ctx.fillStyle = rc; ctx.font = 'bold 22px Orbitron,Courier New';
        ctx.fillText('⚡  EPIC  !  ⚡', cx, cy - 90);
        ctx.shadowBlur = 0; ctx.globalAlpha = 1;

        if (flicker) {
          ctx.strokeStyle = rc; ctx.lineWidth = 5;
          ctx.shadowColor = rc; ctx.shadowBlur = 22;
          ctx.strokeRect(3, 3, W - 6, H - 6); ctx.shadowBlur = 0;
        }
        ctx.globalAlpha = 0.16;
        ctx.strokeStyle = rc; ctx.lineWidth = 1;
        for (let i = 0; i < 18; i++) {
          const lx = (i / 18) * W;
          ctx.beginPath(); ctx.moveTo(lx, 0); ctx.lineTo(lx + 60, H); ctx.stroke();
        }
        ctx.globalAlpha = 1;

      } else {
        ctx.globalAlpha = flicker ? 0.85 : 0.4;
        ctx.shadowColor = rc; ctx.shadowBlur = 22;
        ctx.fillStyle = '#fff'; ctx.font = 'bold 42px Orbitron,Courier New'; ctx.textAlign = 'center';
        ctx.fillText('???', cx, cy + 10); ctx.shadowBlur = 0; ctx.globalAlpha = 1;
      }
    }
  }

  // ===== フェーズ2: ワープアウト =====
  const warpStart = GATE_OPEN + stall;
  if (f > warpStart && f <= warpStart + GATE_WARPOUT) {
    const wp = (f - warpStart) / GATE_WARPOUT;
    const gateR = (isSSR ? 200 : isSR ? 170 : 130) * (1 - wp * 0.7);
    ctx.save(); ctx.translate(cx, cy);
    ctx.strokeStyle = rc; ctx.lineWidth = 3 * (1 - wp);
    ctx.shadowColor = rc; ctx.shadowBlur = 22 * (1 - wp);
    ctx.globalAlpha = 1 - wp * 0.8;
    ctx.beginPath(); ctx.arc(0, 0, gateR, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();

    // 衝撃波リング
    if (wp > 0.25) {
      const sp = (wp - 0.25) / 0.75;
      const shockR = sp * 280;
      ctx.strokeStyle = rc; ctx.lineWidth = Math.max(0.5, 3 * (1 - sp));
      ctx.globalAlpha = (1 - sp) * 0.85;
      ctx.shadowColor = rc; ctx.shadowBlur = 12;
      ctx.beginPath(); ctx.arc(cx, cy, shockR, 0, Math.PI * 2); ctx.stroke();
      if (sp > 0.35) {
        const sp2 = (sp - 0.35) / 0.65;
        ctx.strokeStyle = '#fff'; ctx.lineWidth = Math.max(0.5, 2 * (1 - sp2));
        ctx.globalAlpha = (1 - sp2) * 0.5;
        ctx.beginPath(); ctx.arc(cx, cy, sp2 * 220, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.shadowBlur = 0; ctx.globalAlpha = 1;
    }

    const itemScale = wp * wp * 1.6;
    ctx.save(); ctx.translate(cx, cy); ctx.scale(itemScale, itemScale);
    ctx.shadowColor = rc; ctx.shadowBlur = 45 * wp;
    ctx.fillStyle = rc; ctx.globalAlpha = wp;
    ctx.beginPath(); ctx.moveTo(0, -22); ctx.lineTo(16, 13); ctx.lineTo(0, 8); ctx.lineTo(-16, 13); ctx.closePath(); ctx.fill();
    ctx.shadowBlur = 0; ctx.restore();

    if (wp > 0.55) {
      ctx.globalAlpha = (wp - 0.55) / 0.45 * (isLR ? 0.55 : isSSR ? 0.9 : 0.65);
      ctx.fillStyle = isLR ? getLRColor(game.frameCount * 0.08) : isSSR ? '#ffcc00' : rc; ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;
    }
  }

  // ===== フェーズ3: リベール =====
  const revealStart = warpStart + GATE_WARPOUT;
  if (f > revealStart) {
    const rp = Math.min(1, (f - revealStart) / GATE_FADEIN);
    const rAge = f - revealStart;

    const glowR = isLR ? 360 : isSSR ? 420 : isSR ? 330 : 270;
    const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowR);
    bg.addColorStop(0, RARITY_COLORS[item.rarity] + (isLR ? '66' : isSSR ? '55' : isSR ? '3a' : '28')); bg.addColorStop(1, 'transparent');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

    // LR: レインボーキラキラ
    if (isLR) {
      for (let i = 0; i < 14; i++) {
        const a = game.frameCount * 0.05 + i * (Math.PI * 2 / 14);
        const r2 = 110 + Math.sin(game.frameCount * 0.08 + i * 1.2) * 55;
        const px = cx + Math.cos(a) * r2, py = cy + Math.sin(a) * r2 - 20;
        ctx.globalAlpha = rp * (0.35 + Math.sin(game.frameCount * 0.12 + i) * 0.22);
        ctx.fillStyle = getLRColor(i * 0.25 + game.frameCount * 0.04);
        ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 8;
        ctx.beginPath(); ctx.arc(px, py, 2.5, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
      }
      ctx.globalAlpha = 1;
    }

    // SSR背景キラキラ
    if (isSSR) {
      for (let i = 0; i < 14; i++) {
        const a = game.frameCount * 0.04 + i * (Math.PI * 2 / 14);
        const r = 95 + Math.sin(game.frameCount * 0.07 + i * 1.3) * 45;
        const px = cx + Math.cos(a) * r, py = cy + Math.sin(a) * r - 20;
        ctx.globalAlpha = rp * (0.4 + Math.sin(game.frameCount * 0.1 + i) * 0.3);
        ctx.fillStyle = '#ffee88'; ctx.shadowColor = '#ffdd00'; ctx.shadowBlur = 10;
        ctx.beginPath(); ctx.arc(px, py, 2.5, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
      }
      ctx.globalAlpha = 1;
    }

    ctx.globalAlpha = rp;
    const cw = 340, ch = 372, cxl = cx - cw / 2, cyl = cy - ch / 2 - 12;

    // SSR 外枠ゴールドグロー
    if (isSSR) {
      ctx.shadowColor = '#ffdd00'; ctx.shadowBlur = 55;
      ctx.strokeStyle = '#ffaa00'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.roundRect(cxl - 4, cyl - 4, cw + 8, ch + 8, 20); ctx.stroke(); ctx.shadowBlur = 0;
    }

    ctx.shadowColor = rc; ctx.shadowBlur = isSSR ? 44 : 26;
    ctx.fillStyle = 'rgba(5,4,18,0.98)'; ctx.strokeStyle = rc; ctx.lineWidth = isSSR ? 3 : 2.5;
    ctx.beginPath(); ctx.roundRect(cxl, cyl, cw, ch, 16); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;

    // SSR 斜めゴールドストライプ
    if (isSSR) {
      ctx.save();
      ctx.beginPath(); ctx.roundRect(cxl, cyl, cw, ch, 16); ctx.clip();
      ctx.globalAlpha = rp * 0.11;
      ctx.fillStyle = '#ffdd00';
      for (let s = 0; s < 4; s++) {
        const sx = cxl - 60 + s * 110;
        ctx.beginPath();
        ctx.moveTo(sx, cyl); ctx.lineTo(sx + 60, cyl);
        ctx.lineTo(sx + 60 + ch * 0.45, cyl + ch); ctx.lineTo(sx + ch * 0.45, cyl + ch);
        ctx.closePath(); ctx.fill();
      }
      ctx.globalAlpha = rp; ctx.restore();
    }

    // LR: 外枠レインボーグロー
    if (isLR) {
      for (let i = 0; i < 3; i++) {
        ctx.strokeStyle = getLRColor(i * 1.0 + game.frameCount * 0.06);
        ctx.lineWidth = 2.2 - i * 0.35; ctx.shadowColor = ctx.strokeStyle; ctx.shadowBlur = 14;
        ctx.globalAlpha = rp * (0.55 - i * 0.12);
        ctx.beginPath(); ctx.roundRect(cxl - 4 - i * 3, cyl - 4 - i * 3, cw + 8 + i * 6, ch + 8 + i * 6, 22); ctx.stroke();
        ctx.shadowBlur = 0;
      }
      ctx.globalAlpha = rp;
    }

    // SSR 外枠ゴールドグロー
    if (isSSR) {
      ctx.shadowColor = '#ffdd00'; ctx.shadowBlur = 55;
      ctx.strokeStyle = '#ffaa00'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.roundRect(cxl - 4, cyl - 4, cw + 8, ch + 8, 20); ctx.stroke(); ctx.shadowBlur = 0;
    }

    ctx.shadowColor = isLR ? getLRColor(game.frameCount * 0.06) : rc; ctx.shadowBlur = isLR ? 26 : isSSR ? 44 : 26;
    ctx.fillStyle = 'rgba(5,4,18,0.98)'; ctx.strokeStyle = isLR ? getLRColor(game.frameCount * 0.06) : rc; ctx.lineWidth = isLR ? 4 : isSSR ? 3 : 2.5;
    ctx.beginPath(); ctx.roundRect(cxl, cyl, cw, ch, 16); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;

    // LR レインボーストライプ
    if (isLR) {
      ctx.save();
      ctx.beginPath(); ctx.roundRect(cxl, cyl, cw, ch, 16); ctx.clip();
      for (let s = 0; s < 6; s++) {
        ctx.globalAlpha = rp * 0.07;
        ctx.fillStyle = getLRColor(s + game.frameCount * 0.02);
        const sx = cxl - 60 + s * 90;
        ctx.beginPath();
        ctx.moveTo(sx, cyl); ctx.lineTo(sx + 50, cyl);
        ctx.lineTo(sx + 50 + ch * 0.45, cyl + ch); ctx.lineTo(sx + ch * 0.45, cyl + ch);
        ctx.closePath(); ctx.fill();
      }
      ctx.globalAlpha = rp; ctx.restore();
    }

    // SSR 斜めゴールドストライプ
    if (isSSR) {
      ctx.save();
      ctx.beginPath(); ctx.roundRect(cxl, cyl, cw, ch, 16); ctx.clip();
      ctx.globalAlpha = rp * 0.11;
      ctx.fillStyle = '#ffdd00';
      for (let s = 0; s < 4; s++) {
        const sx = cxl - 60 + s * 110;
        ctx.beginPath();
        ctx.moveTo(sx, cyl); ctx.lineTo(sx + 60, cyl);
        ctx.lineTo(sx + 60 + ch * 0.45, cyl + ch); ctx.lineTo(sx + ch * 0.45, cyl + ch);
        ctx.closePath(); ctx.fill();
      }
      ctx.globalAlpha = rp; ctx.restore();
    }

    // レアリティバナー
    if (isLR) {
      const banG = ctx.createLinearGradient(cxl, cyl, cxl + cw, cyl + 58);
      LR_RAINBOW.forEach((c, i) => banG.addColorStop(i / 6, c));
      ctx.fillStyle = banG;
    } else if (isSSR) {
      const banG = ctx.createLinearGradient(cxl, cyl, cxl + cw, cyl + 58);
      banG.addColorStop(0, '#996600'); banG.addColorStop(0.5, '#ffdd00'); banG.addColorStop(1, '#996600');
      ctx.fillStyle = banG;
    } else { ctx.fillStyle = rc; }
    ctx.beginPath(); ctx.roundRect(cxl, cyl, cw, 58, 12); ctx.fill();
    ctx.fillStyle = '#000'; ctx.font = `bold ${isLR ? 36 : isSSR ? 32 : 26}px Orbitron,Courier New`; ctx.textAlign = 'center';
    ctx.fillText(item.rarity, cx, cyl + 42);

    // LR / LEGENDARY / EPIC コールアウト（カード上）
    if (isLR) {
      ctx.globalAlpha = rp * (0.7 + Math.sin(game.frameCount * 0.25) * 0.3);
      const lc = getLRColor(game.frameCount * 0.07);
      ctx.shadowColor = lc; ctx.shadowBlur = 55;
      ctx.fillStyle = '#fff'; ctx.font = 'bold 24px Orbitron,Courier New';
      ctx.fillText('★★  LEGEND  !!  ★★', cx, cyl - 30);
      ctx.shadowBlur = 0;
    } else if (isSSR) {
      ctx.globalAlpha = rp * (0.7 + Math.sin(game.frameCount * 0.22) * 0.3);
      ctx.shadowColor = '#ffdd00'; ctx.shadowBlur = 38;
      ctx.fillStyle = '#ffee44'; ctx.font = 'bold 20px Orbitron,Courier New';
      ctx.fillText('★  LEGENDARY  !!  ★', cx, cyl - 26);
      ctx.shadowBlur = 0;
    } else if (isSR) {
      ctx.globalAlpha = rp * (0.7 + Math.sin(game.frameCount * 0.2) * 0.3);
      ctx.shadowColor = rc; ctx.shadowBlur = 22;
      ctx.fillStyle = rc; ctx.font = 'bold 16px Orbitron,Courier New';
      ctx.fillText('⚡  EPIC  !  ⚡', cx, cyl - 20);
      ctx.shadowBlur = 0;
    }
    ctx.globalAlpha = rp;

    // NEWバッジ
    if (game.gachaNewItems.has(item.id)) {
      ctx.shadowColor = '#00ff66'; ctx.shadowBlur = 16;
      ctx.fillStyle = '#00ff66'; ctx.font = 'bold 13px Orbitron,Courier New';
      ctx.fillText('★ 初入手', cx + 126, cyl + 22); ctx.shadowBlur = 0;
    }

    // アイコン（大きく）
    ctx.save(); ctx.translate(cx, cyl + 160);
    const iconS = isLR ? 2.0 : isSSR ? 1.7 : isSR ? 1.4 : 1.2;
    ctx.scale(iconS, iconS);
    ctx.shadowColor = isLR ? getLRColor(game.frameCount * 0.06) : rc; ctx.shadowBlur = isLR ? 45 : isSSR ? 32 : 22; ctx.globalAlpha = rp * 0.95;
    drawGachaItemIcon(item);
    if (isLR) {
      ctx.globalAlpha = rp * (0.35 + Math.sin(game.frameCount * 0.12) * 0.2);
      for (let ri = 0; ri < 3; ri++) {
        ctx.strokeStyle = getLRColor(ri * 2 + game.frameCount * 0.06);
        ctx.lineWidth = (2 - ri * 0.5) / iconS;
        ctx.beginPath(); ctx.arc(0, 0, (35 + ri * 12) / iconS, 0, Math.PI * 2); ctx.stroke();
      }
    }
    if (isSSR) {
      ctx.globalAlpha = rp * (0.28 + Math.sin(game.frameCount * 0.1) * 0.18);
      ctx.strokeStyle = '#ffdd00'; ctx.lineWidth = 1.5 / iconS;
      ctx.beginPath(); ctx.arc(0, 0, 40 / iconS, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, 54 / iconS, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.shadowBlur = 0; ctx.restore();
    ctx.globalAlpha = rp;

    ctx.textAlign = 'center';
    ctx.fillStyle = '#c8dcf5'; ctx.font = 'bold 12px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif';
    ctx.shadowColor = 'rgba(120,160,220,0.35)'; ctx.shadowBlur = 4;
    ctx.fillText(gachaTypeLabelJp(item.type), cx, cyl + 214); ctx.shadowBlur = 0;

    ctx.shadowColor = rc; ctx.shadowBlur = isSSR ? 20 : 10;
    ctx.fillStyle = '#fff'; ctx.font = `bold ${isSSR ? 23 : 21}px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif`;
    ctx.fillText(item.label, cx, cyl + 240); ctx.shadowBlur = 0;

    ctx.textAlign = 'left';
    ctx.fillStyle = '#eef6ff'; ctx.font = 'bold 12px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif';
    const descNextY = wrapFillJp(ctx, (item.desc || '').replace(/\r/g, ''), cxl + 18, cyl + 262, cw - 36, 17, 4);
    ctx.textAlign = 'center';

    const inv = game.gachaInventory[item.id];
    let bonusY = descNextY + 10;
    if (!game.gachaNewItems.has(item.id) && inv) {
      if (inv.level >= 30) {
        ctx.fillStyle = '#ffe8a0'; ctx.font = 'bold 12px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif';
        ctx.shadowColor = '#ffd700'; ctx.shadowBlur = 8;
        ctx.fillText(`Lv.MAX時 スターダスト +${{ SSR: 50, SR: 20, R: 10, N: 5 }[item.rarity]}`, cx, bonusY);
        ctx.shadowBlur = 0;
      } else {
        ctx.fillStyle = '#ffd4b8'; ctx.font = 'bold 12px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif';
        ctx.shadowColor = 'rgba(255,160,100,0.25)'; ctx.shadowBlur = 6;
        ctx.fillText(`重複時：${item.rarity}素材 +1`, cx, bonusY);
        ctx.shadowBlur = 0;
      }
    }

    // プログレスドット
    if (game.gachaResults.length > 1) {
      ctx.fillStyle = '#8899aa'; ctx.font = 'bold 10px Orbitron,Courier New';
      ctx.fillText(`${game.gachaCurrentIdx + 1}  /  ${game.gachaResults.length}`, cx, cyl + ch - 10);
      game.gachaResults.forEach((r, i) => {
        const dx = cx - game.gachaResults.length * 9 + i * 18;
        ctx.fillStyle = i === game.gachaCurrentIdx ? RARITY_COLORS[r.rarity] : i < game.gachaCurrentIdx ? RARITY_COLORS[r.rarity] + '66' : '#2a2a2a';
        ctx.beginPath(); ctx.arc(dx, cyl + ch + 8, i === game.gachaCurrentIdx ? 6 : 4, 0, Math.PI * 2); ctx.fill();
      });
    }

    // 最後のカード: 再ガチャボタン
    const isLast = game.gachaCurrentIdx >= game.gachaResults.length - 1;
    if (isLast) {
      const btny = cyl + ch + 22, btnw = 155, btnh = 36;
      const btn1x = cx - 168, btn2x = cx + 14;
      const prem = game.gachaTab === 1;
      const can1 = prem ? game.gems >= 5 : game.coins >= 500;
      ctx.shadowColor = can1 ? '#ffd700' : 'transparent'; ctx.shadowBlur = can1 ? 12 : 0;
      const bg1 = ctx.createLinearGradient(btn1x, btny, btn1x + btnw, btny + btnh);
      bg1.addColorStop(0, can1 ? 'rgba(120,88,0,0.97)' : 'rgba(28,28,28,0.9)');
      bg1.addColorStop(1, can1 ? 'rgba(72,52,0,0.95)' : 'rgba(18,18,18,0.9)');
      ctx.fillStyle = bg1; ctx.strokeStyle = can1 ? '#ffd700' : '#5a5a68'; ctx.lineWidth = can1 ? 2 : 1;
      ctx.beginPath(); ctx.roundRect(btn1x, btny, btnw, btnh, 8); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;
      ctx.fillStyle = can1 ? '#ffe566' : '#c8d0e0'; ctx.font = 'bold 11px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(prem ? 'プレミアム1回 5💎' : '単発 500コイン', btn1x + btnw / 2, btny + 15);
      ctx.fillStyle = can1 ? '#aa8822' : '#9aa8bc'; ctx.font = 'bold 10px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif';
      ctx.fillText('もう一度引く', btn1x + btnw / 2, btny + 29);

      const can10 = prem ? game.gems >= 50 : game.coins >= 5000;
      ctx.shadowColor = can10 ? '#cc88ff' : 'transparent'; ctx.shadowBlur = can10 ? 12 : 0;
      const bg2 = ctx.createLinearGradient(btn2x, btny, btn2x + btnw, btny + btnh);
      bg2.addColorStop(0, can10 ? 'rgba(82,14,140,0.97)' : 'rgba(42,38,58,0.94)');
      bg2.addColorStop(1, can10 ? 'rgba(50,8,88,0.95)' : 'rgba(28,26,40,0.94)');
      ctx.fillStyle = bg2; ctx.strokeStyle = can10 ? '#cc88ff' : '#6a6088'; ctx.lineWidth = can10 ? 2 : 1;
      ctx.beginPath(); ctx.roundRect(btn2x, btny, btnw, btnh, 8); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;
      ctx.fillStyle = can10 ? '#f0d8ff' : '#d4c8f0'; ctx.font = 'bold 11px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif';
      ctx.fillText(prem ? 'プレミアム10連 50💎' : '10連 5000コイン', btn2x + btnw / 2, btny + 15);
      ctx.fillStyle = can10 ? '#c9a6ee' : '#b8a8d8'; ctx.font = 'bold 10px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif';
      ctx.fillText('まとめて引く', btn2x + btnw / 2, btny + 29);
    } else {
      if (Math.sin(game.frameCount * 0.14) > 0) {
        ctx.fillStyle = '#445'; ctx.font = '10px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('タップで次へ', cx, cyl + ch + 42);
      }
    }

    if (rAge < GATE_FADEIN * 0.6 && Math.sin(game.frameCount * 0.22) > 0) {
      ctx.fillStyle = '#2a2a3a'; ctx.font = '9px Orbitron,Courier New';
      const skipHint = game.gachaResults.length >= 10 ? 'タップ×2で一覧 / タップで次へ' : 'タップでスキップ';
      ctx.fillText(skipHint, cx, H - 26);
    }
    if (game.gachaResults.length >= 10 && rAge >= GATE_FADEIN * 0.5) {
      const sbx = cx - 120, sby = H - 44, sbw = 240, sbh = 34;
      const sbG = ctx.createLinearGradient(sbx, sby, sbx + sbw, sby + sbh);
      sbG.addColorStop(0, 'rgba(52,44,88,0.96)'); sbG.addColorStop(1, 'rgba(24,20,44,0.98)');
      ctx.fillStyle = sbG; ctx.strokeStyle = 'rgba(160,140,220,0.65)'; ctx.lineWidth = 1.6;
      ctx.shadowColor = 'rgba(140,120,255,0.2)'; ctx.shadowBlur = 8;
      ctx.beginPath(); ctx.roundRect(sbx, sby, sbw, sbh, 10); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;
      ctx.fillStyle = '#c8d0f0'; ctx.font = 'bold 11px Orbitron,Courier New'; ctx.textAlign = 'center';
      ctx.fillText('10連: 一覧を見る', cx, sby + 22);
    }
    ctx.globalAlpha = 1;
  }

  ctx.textAlign = 'left'; ctx.lineWidth = 1;
}

export function drawGachaSummary() {
  const ctx = drawDeps.ctx;
  ctx.fillStyle = 'rgba(0,0,0,0.97)'; ctx.fillRect(0, 0, W, H);

  const hasSSR = game.gachaResults.some(r => r.rarity === 'SSR');

  // SSR全画面ゴールドエフェクト
  if (hasSSR) {
    const pulse = 0.5 + Math.sin(game.frameCount * 0.1) * 0.5;
    const bgG = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, 420);
    bgG.addColorStop(0, `rgba(85,65,0,${pulse * 0.28})`); bgG.addColorStop(1, 'transparent');
    ctx.fillStyle = bgG; ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = `rgba(255,220,0,${pulse * 0.65})`; ctx.lineWidth = 5;
    ctx.shadowColor = '#ffdd00'; ctx.shadowBlur = 22;
    ctx.strokeRect(3, 3, W - 6, H - 6);
    ctx.strokeStyle = `rgba(255,220,0,${pulse * 0.3})`; ctx.lineWidth = 2;
    ctx.strokeRect(12, 12, W - 24, H - 24);
    ctx.shadowBlur = 0; ctx.lineWidth = 1;

    for (let i = 0; i < 10; i++) {
      const a = game.frameCount * 0.03 + i * (Math.PI * 2 / 10);
      const r = 230 + Math.sin(game.frameCount * 0.07 + i * 1.3) * 35;
      ctx.globalAlpha = 0.45 + Math.sin(game.frameCount * 0.1 + i) * 0.3;
      ctx.fillStyle = '#ffee88'; ctx.shadowColor = '#ffdd00'; ctx.shadowBlur = 8;
      ctx.beginPath(); ctx.arc(W / 2 + Math.cos(a) * r, H / 2 + Math.sin(a) * r, 3, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
    }
    ctx.globalAlpha = 1;
  }

  const hasLR = game.gachaResults.some(r => r.rarity === 'LR');
  const sumBarX = 20, sumBarY = 6, sumBarW = W - 40, sumBarH = 50, sumBarR = 12;
  const sumBarG = ctx.createLinearGradient(sumBarX, sumBarY, sumBarX, sumBarY + sumBarH);
  sumBarG.addColorStop(0, 'rgba(22,20,42,0.94)'); sumBarG.addColorStop(1, 'rgba(8,8,18,0.92)');
  ctx.fillStyle = sumBarG; ctx.strokeStyle = 'rgba(120,100,180,0.45)'; ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.roundRect(sumBarX, sumBarY, sumBarW, sumBarH, sumBarR); ctx.fill(); ctx.stroke();
  // タイトル
  const titleCol = hasLR ? getLRColor(game.frameCount * 0.06) : hasSSR ? '#ffdd00' : '#cc88ff';
  ctx.shadowColor = titleCol; ctx.shadowBlur = hasLR ? 50 : hasSSR ? 35 : 20;
  ctx.fillStyle = titleCol;
  ctx.font = `bold ${hasLR || hasSSR ? 26 : 22}px Orbitron,Courier New`; ctx.textAlign = 'center';
  ctx.fillText(hasLR ? '★★ レジェンド獲得 ★★' : hasSSR ? '★ ガチャ結果 ★' : 'ガチャ結果', W / 2, 36); ctx.shadowBlur = 0;

  if (hasLR && Math.sin(game.frameCount * 0.12) > 0) {
    ctx.fillStyle = `rgba(255,34,102,0.1)`; ctx.fillRect(0, 42, W, 18);
    ctx.fillStyle = '#ff2266'; ctx.font = 'bold 9px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif';
    ctx.fillText('★★ レジェンド !! ★★', W / 2, 55);
  } else if (hasSSR && Math.sin(game.frameCount * 0.12) > 0) {
    ctx.fillStyle = 'rgba(255,220,0,0.08)'; ctx.fillRect(0, 42, W, 18);
    ctx.fillStyle = '#aa8800'; ctx.font = 'bold 9px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif';
    ctx.fillText('伝説レアを獲得 !!', W / 2, 55);
  }

  const cols = 5, rows = 2, cw = 148, ch = 114, gapX = 5, gapY = 6;
  const totalW = cols * cw + (cols - 1) * gapX;
  const startX = (W - totalW) / 2, startY = 64;

  game.gachaResults.forEach((item, i) => {
    const col = i % cols, row = Math.floor(i / cols);
    const x = startX + col * (cw + gapX);
    const isItemLR = item.rarity === 'LR';
    const isItemSSR = item.rarity === 'SSR';
    const rc = isItemLR ? getLRColor(game.frameCount * 0.05 + i) : RARITY_COLORS[item.rarity];
    const y = startY + row * (ch + gapY) + ((isItemLR || isItemSSR) ? Math.sin(game.frameCount * 0.12 + i) * 2.5 : 0);
    const isNew = game.gachaNewItems.has(item.id);

    if (isItemLR) {
      for (let ri = 0; ri < 3; ri++) {
        ctx.shadowColor = getLRColor(ri + game.frameCount * 0.04); ctx.shadowBlur = 20 - ri * 5;
        ctx.strokeStyle = getLRColor(ri + game.frameCount * 0.04); ctx.lineWidth = 2.5 - ri * 0.5;
        ctx.fillStyle = 'rgba(18,4,12,0.98)';
        ctx.beginPath(); ctx.roundRect(x - ri * 2, y - ri * 2, cw + ri * 4, ch + ri * 4, 8 + ri * 2); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;
      }
    } else if (isItemSSR) {
      ctx.shadowColor = '#ffdd00'; ctx.shadowBlur = 22;
      ctx.strokeStyle = '#aa7700'; ctx.lineWidth = 2.5;
      ctx.fillStyle = 'rgba(12,10,24,0.98)';
      ctx.beginPath(); ctx.roundRect(x, y, cw, ch, 8); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;
    } else {
      ctx.shadowColor = rc; ctx.shadowBlur = item.rarity === 'SR' ? 10 : 5;
      ctx.strokeStyle = rc; ctx.lineWidth = item.rarity === 'SR' ? 2 : 1.5;
      ctx.fillStyle = 'rgba(8,8,20,0.95)';
      ctx.beginPath(); ctx.roundRect(x, y, cw, ch, 8); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;
    }

    // LRレインボーストライプ
    if (isItemLR) {
      ctx.save();
      ctx.beginPath(); ctx.roundRect(x, y, cw, ch, 8); ctx.clip();
      for (let s = 0; s < 5; s++) {
        ctx.globalAlpha = 0.07; ctx.fillStyle = getLRColor(s + game.frameCount * 0.02);
        const sx = x - 30 + s * 44;
        ctx.beginPath(); ctx.moveTo(sx, y); ctx.lineTo(sx + 36, y); ctx.lineTo(sx + 36 + ch * 0.5, y + ch); ctx.lineTo(sx + ch * 0.5, y + ch); ctx.closePath(); ctx.fill();
      }
      ctx.globalAlpha = 1; ctx.restore();
    }

    // SSR斜めストライプ
    if (isItemSSR) {
      ctx.save();
      ctx.beginPath(); ctx.roundRect(x, y, cw, ch, 8); ctx.clip();
      ctx.globalAlpha = 0.09; ctx.fillStyle = '#ffdd00';
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 50, y); ctx.lineTo(x + 50 + ch * 0.55, y + ch); ctx.lineTo(x + ch * 0.55, y + ch); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(x + 82, y); ctx.lineTo(x + 112, y); ctx.lineTo(x + 112 + ch * 0.55, y + ch); ctx.lineTo(x + 82 + ch * 0.55, y + ch); ctx.closePath(); ctx.fill();
      ctx.globalAlpha = 1; ctx.restore();
    }

    // レアリティ帯
    if (isItemLR) {
      const banG = ctx.createLinearGradient(x, y, x + cw, y + 24);
      LR_RAINBOW.forEach((c, i2) => banG.addColorStop(i2 / 6, c));
      ctx.fillStyle = banG;
    } else if (isItemSSR) {
      const banG = ctx.createLinearGradient(x, y, x + cw, y + 24);
      banG.addColorStop(0, '#886600'); banG.addColorStop(0.5, '#ffdd00'); banG.addColorStop(1, '#886600');
      ctx.fillStyle = banG;
    } else { ctx.fillStyle = RARITY_COLORS[item.rarity]; }
    ctx.beginPath(); ctx.roundRect(x, y, cw, 24, 8); ctx.fill();
    ctx.fillStyle = '#000'; ctx.font = 'bold 11px Orbitron,Courier New'; ctx.textAlign = 'center';
    ctx.fillText(item.rarity, x + cw / 2, y + 16);

    if (isNew) {
      ctx.fillStyle = '#00ff66'; ctx.shadowColor = '#00ff66'; ctx.shadowBlur = 8;
      ctx.font = 'bold 9px Orbitron,Courier New';
      ctx.fillText('★新', x + cw - 22, y + 15); ctx.shadowBlur = 0;
    }

    // アイコン
    ctx.save(); ctx.translate(x + cw / 2, y + 60);
    const iconS = isItemLR ? 1.4 : isItemSSR ? 1.2 : item.rarity === 'SR' ? 1.0 : 0.85;
    ctx.scale(iconS, iconS);
    ctx.shadowColor = isItemLR ? getLRColor(game.frameCount * 0.06) : rc; ctx.shadowBlur = isItemLR ? 24 : isItemSSR ? 16 : 8;
    drawGachaItemIcon(item);
    ctx.shadowBlur = 0; ctx.restore();

    ctx.shadowColor = rc; ctx.shadowBlur = isNew ? 10 : isItemSSR ? 8 : 0;
    ctx.fillStyle = '#fff'; ctx.font = `bold ${item.label.length > 10 ? 9 : 11}px Orbitron,Courier New`;
    ctx.fillText(item.label, x + cw / 2, y + 88); ctx.shadowBlur = 0;

    ctx.fillStyle = '#445'; ctx.font = '8px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif';
    ctx.fillText(gachaTypeLabelJp(item.type), x + cw / 2, y + 100);

    const inv = game.gachaInventory[item.id];
    if (!isNew && inv) {
      ctx.fillStyle = inv.level >= 30 ? '#ffd700' : '#445'; ctx.font = '7px Orbitron,Courier New';
      ctx.fillText(inv.level >= 30 ? 'MAX→星塵' : '重複', x + cw / 2, y + 111);
    }

    // SSR軌道パーティクル
    if (isItemSSR) {
      for (let p = 0; p < 5; p++) {
        const pa = game.frameCount * 0.10 + p * (Math.PI * 2 / 5), pr = 22 + Math.sin(game.frameCount * 0.07 + p) * 5;
        ctx.globalAlpha = 0.85; ctx.fillStyle = '#ffd700';
        ctx.shadowColor = '#ffaa00'; ctx.shadowBlur = 6;
        ctx.beginPath(); ctx.arc(x + cw / 2 + Math.cos(pa) * pr, y + ch / 2 + Math.sin(pa) * pr, 2.5, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0; ctx.globalAlpha = 1;
      }
    }
  });

  // 再ガチャボタン（目立つ）
  const boty = startY + rows * ch + (rows - 1) * gapY + 16;
  const btn1x = W / 2 - 318, btn2x = W / 2 + 10, btnw = 304, btnh = 44;
  const prem = game.gachaTab === 1;

  const can1 = prem ? game.gems >= 5 : game.coins >= 500;
  ctx.shadowColor = can1 ? '#ffd700' : 'transparent'; ctx.shadowBlur = can1 ? 18 : 0;
  const bg1 = ctx.createLinearGradient(btn1x, boty, btn1x + btnw, boty + btnh);
  bg1.addColorStop(0, can1 ? 'rgba(140,100,0,0.97)' : 'rgba(30,30,30,0.9)');
  bg1.addColorStop(1, can1 ? 'rgba(82,58,0,0.95)' : 'rgba(20,20,20,0.9)');
  ctx.fillStyle = bg1; ctx.strokeStyle = can1 ? '#ffd700' : '#444'; ctx.lineWidth = can1 ? 2.5 : 1;
  ctx.beginPath(); ctx.roundRect(btn1x, boty, btnw, btnh, 10); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;
  ctx.fillStyle = can1 ? '#ffe566' : '#666'; ctx.font = 'bold 13px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif'; ctx.textAlign = 'center';
  ctx.fillText(prem ? 'プレミアム1回 5💎' : '単発 500コイン', btn1x + btnw / 2, boty + 18);
  ctx.fillStyle = can1 ? '#aa8822' : '#444'; ctx.font = '10px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif';
  ctx.fillText('もう一度引く', btn1x + btnw / 2, boty + 35);

  const can10 = prem ? game.gems >= 50 : game.coins >= 5000;
  ctx.shadowColor = can10 ? '#cc88ff' : 'transparent'; ctx.shadowBlur = can10 ? 18 : 0;
  const bg2 = ctx.createLinearGradient(btn2x, boty, btn2x + btnw, boty + btnh);
  bg2.addColorStop(0, can10 ? 'rgba(90,16,150,0.97)' : 'rgba(30,30,30,0.9)');
  bg2.addColorStop(1, can10 ? 'rgba(55,9,90,0.95)' : 'rgba(20,20,20,0.9)');
  ctx.fillStyle = bg2; ctx.strokeStyle = can10 ? '#cc88ff' : '#444'; ctx.lineWidth = can10 ? 2.5 : 1;
  ctx.beginPath(); ctx.roundRect(btn2x, boty, btnw, btnh, 10); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;
  ctx.fillStyle = can10 ? '#dd99ff' : '#666'; ctx.font = 'bold 13px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif';
  ctx.fillText(prem ? 'プレミアム10連 50💎' : '10連 5000コイン', btn2x + btnw / 2, boty + 18);
  ctx.fillStyle = can10 ? '#9955bb' : '#444'; ctx.font = '10px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif';
  ctx.fillText('まとめて引く', btn2x + btnw / 2, boty + 35);

  ctx.fillStyle = 'rgba(32,30,48,0.95)'; ctx.strokeStyle = '#445'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.roundRect(W / 2 - 160, H - 48, 320, 36, 8); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#889'; ctx.font = 'bold 12px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('ガチャ画面に戻る', W / 2, H - 26);

  if (Math.sin(game.frameCount * 0.1) > 0) {
    ctx.fillStyle = '#333'; ctx.font = '9px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('下のボタンで戻る・再抽選', W / 2, H - 8);
  }
  ctx.textAlign = 'left'; ctx.lineWidth = 1;
}

export function drawGachaRates() {
  const ctx = drawDeps.ctx;
  ctx.fillStyle = 'rgba(0,0,0,0.97)'; ctx.fillRect(0, 0, W, H);
  ctx.shadowColor = '#cc88ff'; ctx.shadowBlur = 20;
  ctx.fillStyle = '#cc88ff'; ctx.font = 'bold 20px Orbitron,Courier New'; ctx.textAlign = 'center';
  ctx.fillText('排出率 / アイテム詳細', W / 2, 30); ctx.shadowBlur = 0;
  drawGachaRatesContent(12, 38, W - 24, H - 96);
  ctx.fillStyle = '#333'; ctx.font = '9px Orbitron,Courier New'; ctx.textAlign = 'center';
  ctx.fillText('下の「戻る」でガチャへ', W / 2, Math.min(H - 14, 586));
  ctx.textAlign = 'left'; ctx.lineWidth = 1;
}

export function drawStardustShop() {
  const ctx = drawDeps.ctx;
  ctx.fillStyle = 'rgba(0,0,0,0.96)'; ctx.fillRect(0, 0, W, H);
  // 背景グロー
  const bg = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, 300);
  bg.addColorStop(0, 'rgba(80,40,120,0.18)'); bg.addColorStop(1, 'transparent');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

  ctx.shadowColor = 'rgba(255,215,120,0.5)'; ctx.shadowBlur = 16;
  ctx.fillStyle = '#ffd700'; ctx.font = 'bold 26px Orbitron,Courier New'; ctx.textAlign = 'center';
  ctx.fillText('✦ スターダスト交換所 ✦', W / 2, 46); ctx.shadowBlur = 0;

  // 所持スターダスト（大きく表示）
  const dustPulse = 0.85 + Math.sin(game.frameCount * 0.12) * 0.15;
  ctx.shadowColor = 'rgba(255,215,120,0.35)'; ctx.shadowBlur = 10 * dustPulse;
  ctx.fillStyle = '#e5c97f'; ctx.font = 'bold 22px Orbitron,Courier New';
  ctx.fillText(`スターダスト：${game.gachaStardust}`, W / 2, 84); ctx.shadowBlur = 0;
  ctx.fillStyle = '#555'; ctx.font = '11px Orbitron,Courier New';
  ctx.fillText('ガチャの重複で獲得 / 上限MAX時に変換', W / 2, 102);

  const shopItems = getStardustShopItems();
  game.stardustShopCursor = Math.max(0, Math.min(shopItems.length - 1, game.stardustShopCursor | 0));
  const cyc = getStardustShopCycleIndex();
  const msLeft = getMsUntilNextStardustShopCycle();
  const countdown = formatStardustShopRotationCountdownJa(msLeft);
  ctx.fillStyle = 'rgba(130, 150, 190, 0.95)';
  ctx.font = 'bold 10px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`週替わりラインナップ ${cyc + 1}/${STARDUST_SHOP_WEEK_COUNT} · 次回更新まで ${countdown}`, W / 2, 118);
  const nextLines = getNextStardustShopPreviewLines();
  const preview = nextLines.join('  ·  ');
  const previewShort = preview.length > 76 ? `${preview.slice(0, 74)}…` : preview;
  ctx.fillStyle = 'rgba(160, 175, 210, 0.88)';
  ctx.font = '9px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif';
  ctx.fillText(`次回: ${previewShort}`, W / 2, 134);

  const itemH = 118,
    startY = 148,
    itemW = 600,
    startX = (W - itemW) / 2;
  const costBoxW = 120, costBoxH = 48, rightPad = 12;
  shopItems.forEach((item, i) => {
    const y = startY + i * (itemH + 10);
    const active = game.stardustShopCursor === i;
    const canAfford = game.gachaStardust >= item.cost;
    const col = canAfford ? item.color : '#555';

    ctx.shadowColor = canAfford ? col : 'transparent'; ctx.shadowBlur = active ? (canAfford ? 12 : 0) : (canAfford ? 4 : 0);
    const bg2 = ctx.createLinearGradient(startX, y, startX + itemW, y + itemH);
    if (canAfford) {
      bg2.addColorStop(0, active ? `rgba(${item.color === '#ffd700' ? '76,62,20' : '58,28,92'},0.96)` : `rgba(${item.color === '#ffd700' ? '54,45,24' : '40,20,72'},0.9)`);
      bg2.addColorStop(1, active ? `rgba(${item.color === '#ffd700' ? '46,36,18' : '34,14,64'},0.92)` : 'rgba(18,16,28,0.9)');
    } else {
      bg2.addColorStop(0, 'rgba(36,36,42,0.92)');
      bg2.addColorStop(1, 'rgba(22,22,26,0.92)');
    }
    ctx.fillStyle = bg2; ctx.strokeStyle = canAfford ? (active ? col : '#665') : '#3a3a3a'; ctx.lineWidth = active ? 2 : 1;
    ctx.beginPath(); ctx.roundRect(startX, y, itemW, itemH, 12); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;

    const costBoxX = startX + itemW - rightPad - costBoxW;
    const costBoxY = y + 18;
    const costCol = canAfford ? item.color : '#666';
    ctx.fillStyle = canAfford ? `rgba(${item.color === '#ffd700' ? '100,75,0' : '70,12,120'},0.92)` : 'rgba(40,40,40,0.92)';
    ctx.strokeStyle = canAfford ? costCol : '#444'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(costBoxX, costBoxY, costBoxW, costBoxH, 8); ctx.fill(); ctx.stroke();
    ctx.fillStyle = canAfford ? costCol : '#777'; ctx.font = 'bold 16px Orbitron,Courier New'; ctx.textAlign = 'center';
    ctx.fillText(`✦ ${item.cost}`, costBoxX + costBoxW / 2, costBoxY + 22);
    ctx.fillStyle = canAfford ? '#c8d0e8' : '#666'; ctx.font = 'bold 9px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif';
    ctx.fillText('スターダスト', costBoxX + costBoxW / 2, costBoxY + 40);

    const actW = costBoxW, actH = 32, actX = costBoxX, actY = costBoxY + costBoxH + 8;
    ctx.fillStyle = canAfford ? 'rgba(88,55,140,0.96)' : 'rgba(40,40,46,0.95)';
    ctx.strokeStyle = canAfford ? '#cc88ff' : '#666'; ctx.lineWidth = canAfford ? 2 : 1;
    if (canAfford) { ctx.shadowColor = '#cc88ff'; ctx.shadowBlur = active ? 14 : 7; }
    ctx.beginPath(); ctx.roundRect(actX, actY, actW, actH, 8); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;
    ctx.fillStyle = canAfford ? '#f3e8ff' : '#999'; ctx.font = 'bold 12px Orbitron,Courier New';
    ctx.fillText(canAfford ? '交換する' : '交換不可', actX + actW / 2, actY + 21);

    const titleY = item.tag ? y + 40 : y + 28;
    const descY = titleY + 22;
    const statusY = descY + 16;
    ctx.textAlign = 'left';
    ctx.shadowColor = active && canAfford ? col : 'transparent'; ctx.shadowBlur = active ? 8 : 0;
    ctx.fillStyle = canAfford ? (active ? col : '#ddd') : '#666'; ctx.font = `bold ${active ? 18 : 16}px Orbitron,Courier New`;
    ctx.fillText(item.label, startX + 20, titleY); ctx.shadowBlur = 0;
    ctx.fillStyle = canAfford ? '#aab8d0' : '#5a5a62'; ctx.font = '12px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif';
    ctx.fillText(item.desc, startX + 20, descY);

    const statusTxt = canAfford ? '交換可能' : '交換不可';
    if (!canAfford) {
      const lack = item.cost - game.gachaStardust;
      ctx.fillStyle = '#a89880'; ctx.font = 'bold 11px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif';
      ctx.fillText(`${statusTxt} ・ あと ${lack} で交換可能`, startX + 20, statusY);
    } else {
      ctx.fillStyle = '#7dffc4'; ctx.font = 'bold 11px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif';
      ctx.fillText(statusTxt, startX + 20, statusY);
    }

    if (item.tag) {
      const isReco = item.tag === 'おすすめ';
      const tw = isReco ? 88 : 54, th = 20;
      const tx = costBoxX - tw - 8, ty = y + 12;
      ctx.shadowColor = isReco ? '#ff66cc' : '#ffd700'; ctx.shadowBlur = isReco ? 5 : 4;
      ctx.fillStyle = isReco ? 'rgba(120,20,90,0.95)' : 'rgba(95,72,0,0.95)';
      ctx.strokeStyle = isReco ? '#ff66cc' : '#ffd700'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.roundRect(tx, ty, tw, th, 6); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;
      ctx.fillStyle = isReco ? '#ffd6f3' : '#ffe89a'; ctx.font = 'bold 10px Orbitron,Courier New'; ctx.textAlign = 'center';
      ctx.fillText(item.tag, tx + tw / 2, ty + 14); ctx.textAlign = 'left';
    }
  });

  const buyY = H - 50, buyW = 220, buyH = 40, buyX = (W - buyW) / 2;
  const curIt = shopItems[game.stardustShopCursor];
  const canBuy = curIt && game.gachaStardust >= curIt.cost;
  ctx.fillStyle = canBuy ? 'rgba(60,40,100,0.95)' : 'rgba(28,28,32,0.9)'; ctx.strokeStyle = canBuy ? '#cc88ff' : '#333'; ctx.lineWidth = canBuy ? 2 : 1;
  ctx.beginPath(); ctx.roundRect(buyX, buyY, buyW, buyH, 10); ctx.fill(); ctx.stroke();
  ctx.fillStyle = canBuy ? '#eec' : '#555'; ctx.font = 'bold 13px Orbitron,Courier New'; ctx.textAlign = 'center';
  ctx.fillText('✦ 交換する', W / 2, buyY + 26);

  if (Math.sin(game.frameCount * 0.1) > 0) {
    ctx.fillStyle = '#333'; ctx.font = '11px Orbitron,Courier New'; ctx.textAlign = 'center';
    ctx.fillText('上の枠で選択 → 下の購入 / 戻るはフッター', W / 2, H - 14);
  }
  ctx.textAlign = 'left'; ctx.lineWidth = 1;
}
