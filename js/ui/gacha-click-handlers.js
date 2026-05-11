import { game } from '../game/game-store.js';
import { CANVAS_W as W, CANVAS_H as H } from '../game/constants.js';
import {
  getGachaInsufficientModalRect,
  getGachaRatesModalRect,
  getGachaRatesModalLinkRect,
  getGachaResultCardLayout,
  getGachaAuxStripLayout,
  getGachaZukanFilterPools,
  computeZukanGridMetrics,
} from '../draw/draw-screen-gacha.js';
import { canDailyGacha, doDailyGacha, doGachaPull, doPremiumPull } from '../game/gacha.js';
import { getStardustShopItems, applyStardustShop as _applyStardustShop } from '../game/stardust-shop.js';
import { playSound } from '../game/audio.js';

const GATE_OPEN = 60, GATE_WARPOUT = 50, GATE_FADEIN = 40;
function gateStall(r) { return r === 'LR' ? 180 : r === 'SSR' ? 110 : r === 'SR' ? 55 : 14; }
function gateTotal(r) { return GATE_OPEN + gateStall(r) + GATE_WARPOUT + GATE_FADEIN; }

export function handleGachaResultPrimaryAction() {
  const now = Date.now();
  if (game.gachaResults.length >= 10 && now - game.lastGachaKeyTime < 450) {
    game.state = 'gacha_summary'; game.lastGachaKeyTime = 0; return;
  }
  game.lastGachaKeyTime = now;
  const item = game.gachaResults[game.gachaCurrentIdx];
  const total = item ? gateTotal(item.rarity) : 999;
  if (game.gachaAnimFrame < total) { game.gachaAnimFrame = total; return; }
  if (game.gachaCurrentIdx < game.gachaResults.length - 1) { game.gachaCurrentIdx++; game.gachaAnimFrame = 0; return; }
  game.state = game.gachaResults.length >= 10 ? 'gacha_summary' : 'gacha';
}

/** @returns {boolean} */
export function handleGachaMainClick(mx, my) {
  if (game.gachaInsufficientModal && game.gachaInsufficientModal.open) {
    const R = getGachaInsufficientModalRect();
    const by = R.my + 112, bw = 132, bh = 40, gap = 12;
    const bx1 = R.mx + R.mw / 2 - bw - gap / 2, bx2 = R.mx + R.mw / 2 + gap / 2;
    if (mx >= bx1 && mx <= bx1 + bw && my >= by && my <= by + bh) {
      game.gachaInsufficientModal.open = false;
      return true;
    }
    if (mx >= bx2 && mx <= bx2 + bw && my >= by && my <= by + bh) {
      game.gachaInsufficientModal.open = false;
      game.shopCursor = 2;
      game.shopTreeFocusId = null;
      game.shopSubgraphCatId = null;
      game.shopSubgraphScrollY = 0;
      game.state = 'shop';
      return true;
    }
    if (mx < R.mx || mx > R.mx + R.mw || my < R.my || my > R.my + R.mh) {
      game.gachaInsufficientModal.open = false;
      return true;
    }
    return true;
  }
  if (game.gachaRatesModal) {
    const R = getGachaRatesModalRect();
    const hx = R.mx + R.mw - 40, hy = R.my + 8;
    if (mx >= hx && mx <= hx + 32 && my >= hy && my <= hy + 30) { game.gachaRatesModal = false; return true; }
    const Lk = getGachaRatesModalLinkRect();
    if (mx >= Lk.x && mx <= Lk.x + Lk.w && my >= Lk.y && my <= Lk.y + Lk.h) {
      game.gachaRatesModal = false; game.state = 'gacha_rates'; return true;
    }
    if (mx < R.mx || mx > R.mx + R.mw || my < R.my || my > R.my + R.mh) { game.gachaRatesModal = false; return true; }
    return true;
  }
  const tabW = 120, tabH = 34, tabTy = 6;
  const tabXs = [434, 556, 678];
  for (let ti = 0; ti < 3; ti++) {
    const tx = tabXs[ti];
    if (mx >= tx && mx <= tx + tabW && my >= tabTy && my <= tabTy + tabH) {
      game.gachaTab = ti;
      return true;
    }
  }
  const aux = getGachaAuxStripLayout();
  let hitRates = false, hitDust = false;
  if (aux) {
    const { ratesBtn, dustBtn } = aux;
    hitRates = mx >= ratesBtn.x && mx <= ratesBtn.x + ratesBtn.w && my >= ratesBtn.y && my <= ratesBtn.y + ratesBtn.h;
    hitDust = mx >= dustBtn.x && mx <= dustBtn.x + dustBtn.w && my >= dustBtn.y && my <= dustBtn.y + dustBtn.h;
  }
  const gachaColL = 436, gachaColR = 436 + 326;

  if (game.gachaTab === 2) {
    const fW = 88, fH = 30, fStartX = 432, fY = 42;
    for (let fi = 0; fi < 4; fi++) {
      if (mx >= fStartX + fi * fW && mx <= fStartX + fi * fW + (fW - 2) && my >= fY && my <= fY + fH) {
        game.collectionFilter = fi;
        return true;
      }
    }
    const filterPools = getGachaZukanFilterPools();
    const fPool = filterPools[game.collectionFilter] || [];
    const { cols: COLS, cellW, cellH, gPad, gStartX, gStartY, maxRows } = computeZukanGridMetrics(fY, fH);
    const maxCursor = Math.max(0, fPool.length - 1);
    game.collectionCursor = Math.max(0, Math.min(game.collectionCursor, maxCursor));
    const cursorRow = Math.floor(game.collectionCursor / COLS);
    const startRow = Math.max(0, Math.min(cursorRow - Math.floor(maxRows / 2), Math.ceil(fPool.length / COLS) - maxRows));
    for (let row = 0; row < maxRows; row++) {
      for (let col = 0; col < COLS; col++) {
        const idx = (startRow + row) * COLS + col;
        if (idx >= fPool.length) continue;
        const cx2 = gStartX + col * (cellW + gPad), cy2 = gStartY + row * (cellH + gPad);
        if (mx >= cx2 && mx <= cx2 + cellW && my >= cy2 && my <= cy2 + cellH) {
          game.collectionCursor = idx;
          return true;
        }
      }
    }
    const fty = H - 52, fth = 44, fgap = 8;
    const fw1 = Math.floor((W - 434 - fgap * 3) / 2);
    const fx2 = 434 + fw1 + fgap;
    if (mx >= 434 && mx <= 434 + fw1 && my >= fty && my <= fty + fth) {
      game.gachaRatesModal = true;
      return true;
    }
    if (mx >= fx2 && mx <= fx2 + fw1 && my >= fty && my <= fty + fth) {
      game.gachaRatesModal = false;
      game.stardustShopCursor = 0;
      game.state = 'stardust_shop';
      return true;
    }
    return false;
  }

  if (hitRates) { game.gachaRatesModal = true; return true; }
  if (hitDust) { game.gachaRatesModal = false; game.stardustShopCursor = 0; game.state = 'stardust_shop'; return true; }

  if (game.gachaTab === 0) {
    const bdY = 100, bdH = 40;
    if (mx >= gachaColL && mx <= gachaColR && my >= bdY && my <= bdY + bdH && canDailyGacha()) {
      doDailyGacha();
      return true;
    }
    const b1y = 154, b1h = 94;
    if (mx >= gachaColL && mx <= gachaColR && my >= b1y && my <= b1y + b1h && game.coins >= 500) {
      doGachaPull(1);
      return true;
    }
    const b2y = 268, b2h = 106;
    if (mx >= gachaColL && mx <= gachaColR && my >= b2y && my <= b2y + b2h && game.coins >= 5000) {
      doGachaPull(10);
      return true;
    }
    return false;
  }
  const pb1y = 222, pb2y = 328, pb1h = 94, pb2h = 108;
  if (mx >= gachaColL && mx <= gachaColR && my >= pb1y && my <= pb1y + pb1h) {
    if (game.gems >= 5) doPremiumPull(1);
    else game.gachaInsufficientModal = { open: true, need: 5 };
    return true;
  }
  if (mx >= gachaColL && mx <= gachaColR && my >= pb2y && my <= pb2y + pb2h) {
    if (game.gems >= 50) doPremiumPull(10);
    else game.gachaInsufficientModal = { open: true, need: 50 };
    return true;
  }
  return false;
}

/** @returns {boolean} */
export function handleGachaResultClick(mx, my) {
  const item = game.gachaResults[game.gachaCurrentIdx];
  if (!item) return false;
  if (mx >= 10 && mx <= 10 + 92 && my >= 8 && my <= 8 + 34) {
    game.state = 'gacha';
    return true;
  }
  const { cx, cyl, cw, ch } = getGachaResultCardLayout();
  const total = gateTotal(item.rarity);
  const animDone = game.gachaAnimFrame >= total;
  const isLast = game.gachaCurrentIdx >= game.gachaResults.length - 1;
  if (isLast && animDone) {
    const btnw = 155, btnh = 36;
    const btny = cyl + ch + 22, btn1x = cx - 168, btn2x = cx + 14;
    const can1 = game.gachaTab === 1 ? game.gems >= 5 : game.coins >= 500;
    const can10 = game.gachaTab === 1 ? game.gems >= 50 : game.coins >= 5000;
    if (can1 && mx >= btn1x && mx <= btn1x + btnw && my >= btny && my <= btny + btnh) {
      (game.gachaTab === 1 ? doPremiumPull : doGachaPull)(1);
      return true;
    }
    if (can10 && mx >= btn2x && mx <= btn2x + btnw && my >= btny && my <= btny + btnh) {
      (game.gachaTab === 1 ? doPremiumPull : doGachaPull)(10);
      return true;
    }
  }
  if (game.gachaResults.length > 1 && animDone) {
    for (let i = 0; i < game.gachaResults.length; i++) {
      const dx = cx - game.gachaResults.length * 9 + i * 18;
      const dy = cyl + ch + 8;
      const ddx = mx - dx, ddy = my - dy;
      if (ddx * ddx + ddy * ddy <= 64) {
        game.gachaCurrentIdx = i;
        game.gachaAnimFrame = 0;
        return true;
      }
    }
  }
  if (game.gachaResults.length >= 10 && animDone) {
    const sbx = cx - 120, sby = H - 44, sbw = 240, sbh = 34;
    if (mx >= sbx && mx <= sbx + sbw && my >= sby && my <= sby + sbh) {
      game.state = 'gacha_summary';
      return true;
    }
  }
  const cardL = cx - cw / 2, cardR = cx + cw / 2, cardT = cyl, cardB = cyl + ch + 12;
  if (mx >= cardL && mx <= cardR && my >= cardT && my <= cardB) {
    handleGachaResultPrimaryAction();
    return true;
  }
  if (my >= cardT && my <= H - 8 && mx >= 40 && mx <= W - 40) {
    handleGachaResultPrimaryAction();
    return true;
  }
  return false;
}

/** @returns {boolean} */
export function handleGachaSummaryClick(mx, my) {
  const cols = 5, rows = 2, cw = 148, ch = 114, gapX = 5, gapY = 6;
  const totalW = cols * cw + (cols - 1) * gapX;
  const startX = (W - totalW) / 2, startY = 64;
  const boty = startY + rows * ch + (rows - 1) * gapY + 16;
  const btn1x = W / 2 - 318, btn2x = W / 2 + 10, btnw = 304, btnh = 44;
  const can1 = game.gachaTab === 1 ? game.gems >= 5 : game.coins >= 500;
  const can10 = game.gachaTab === 1 ? game.gems >= 50 : game.coins >= 5000;
  if (can1 && mx >= btn1x && mx <= btn1x + btnw && my >= boty && my <= boty + btnh) {
    (game.gachaTab === 1 ? doPremiumPull : doGachaPull)(1);
    return true;
  }
  if (can10 && mx >= btn2x && mx <= btn2x + btnw && my >= boty && my <= boty + btnh) {
    (game.gachaTab === 1 ? doPremiumPull : doGachaPull)(10);
    return true;
  }
  if (mx >= W / 2 - 160 && mx <= W / 2 + 160 && my >= H - 48 && my <= H - 12) {
    game.state = 'gacha';
    return true;
  }
  return false;
}

/** @returns {boolean} */
export function handleGachaRatesClick(_mx, _my) {
  return false;
}

/** @returns {boolean} */
export function handleStardustShopClick(mx, my) {
  const items = getStardustShopItems();
  const itemH = 118, startY = 148, itemW = 600, startX = (W - itemW) / 2;
  const costBoxW = 120, costBoxH = 48, rightPad = 12;
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const y = startY + i * (itemH + 10);
    const canAfford = game.gachaStardust >= item.cost;
    const costBoxX = startX + itemW - rightPad - costBoxW;
    const costBoxY = y + 18;
    const actW = costBoxW, actH = 32, actX = costBoxX, actY = costBoxY + costBoxH + 8;
    if (mx >= actX && mx <= actX + actW && my >= actY && my <= actY + actH) {
      game.stardustShopCursor = i;
      if (canAfford) _applyStardustShop(i, { playSound });
      return true;
    }
    if (mx >= startX && mx <= startX + itemW && my >= y && my <= y + itemH) {
      game.stardustShopCursor = i;
      return true;
    }
  }
  const buyY = H - 50, buyW = 220, buyH = 40, buyX = (W - buyW) / 2;
  if (mx >= buyX && mx <= buyX + buyW && my >= buyY && my <= buyY + buyH) {
    _applyStardustShop(game.stardustShopCursor, { playSound });
    return true;
  }
  return false;
}
