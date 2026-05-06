/**
 * Sortie prep layout metrics shared by UI hit targets and customize screen drawing.
 */
import { CANVAS_W as W, CANVAS_H as H } from './constants.js';
import { game } from './game-store.js';

export function getCustomizeLayout() {
  const MX = 20, CW = W - MX * 2;
  const hH = 72;
  const eY = hH + 10;
  const eH = game.customizeEquipExpanded ? 158 : Math.round(158 * 0.7);
  const infoY = eY + eH + 14;
  const startH2 = 92;
  const startY2 = Math.min(492, H - startH2 - 10);
  const infoH = Math.max(120, startY2 - 4 - infoY);
  const bMX = MX + 10, bCW = CW - 20;
  const stageSelH = 40;
  const stageSelY = infoY + infoH - stageSelH - 8;
  const navTabY = 36, navTabH = 36, navTabW = W / 6;
  return { MX, CW, hH, eY, eH, infoY, infoH, startY2, startH2, bMX, bCW, stageSelY, stageSelH, navTabY, navTabH, navTabW };
}

export function getCustomizeHeaderLayout() {
  const MX = 20;
  const settings = { x: W - MX - 38, y: 6, w: 36, h: 26 };
  const gemPlus = { x: 648, y: 8, w: 16, h: 20 };
  const resources = {
    fuel: { x: 454, w: 76 },
    coins: { x: 536, w: 108 },
    gems: { x: 668, w: 58 },
  };
  return { settings, gemPlus, resources };
}

export function estimateSortieWinPct(ratioP, sortieOk) {
  const r = Number.isFinite(ratioP) ? ratioP : 0;
  if (!sortieOk) {
    const u = Math.max(0, Math.min(1, r / 0.72));
    return Math.round(10 + 24 * u);
  }
  if (r >= 1.35) return Math.min(97, Math.round(88 + (r - 1.35) * 20));
  if (r >= 1.15) return Math.round(70 + (Math.min(1, (r - 1.15) / 0.2)) * 22);
  if (r >= 0.92) return Math.round(46 + (Math.min(1, (r - 0.92) / 0.23)) * 24);
  return Math.round(30 + (Math.min(1, (r - 0.72) / 0.2)) * 16);
}
