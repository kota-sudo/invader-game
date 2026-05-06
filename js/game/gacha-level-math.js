import { game } from './game-store.js';

export function applyLevelToStatAdd(v, bonus) {
  if (!Number.isFinite(v)) return 0;
  return v * (1 + bonus);
}

export function applyLevelToAtkMult(atkMult, bonus) {
  const base = Number.isFinite(atkMult) ? atkMult : 1;
  return 1 + Math.max(0, base - 1) * (1 + bonus);
}

const FUSION_BONUS = [0, 0, 0.10, 0.22, 0.38, 0.58];

export function getItemLevelBonus(itemId) {
  const inv = game.gachaInventory[itemId]; if (!inv) return 0;
  const lv = Math.max(1, Math.min(5, inv.level || 1));
  return FUSION_BONUS[lv] || 0;
}

export function upgradeBonusNowNext(itemId) {
  const b = getItemLevelBonus(itemId);
  const inv = game.gachaInventory[itemId];
  const lv = inv ? Math.max(1, Math.min(5, inv.level || 1)) : 1;
  const next = FUSION_BONUS[Math.min(5, lv + 1)] || 0;
  return { b, next };
}
