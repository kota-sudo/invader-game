import { PROFILE_MAX_LEVEL } from './profile-progress.js';

/**
 * 改ざん耐性はサーバなしでは限定的（ローカルストレージはユーザーが編集可能）。
 * ランキング・本番課金などはサーバ側検証が必須。
 * ここでは異常値による起動不能・表示崩れを防ぐためのクランプのみ行う。
 */
const MAX_INT = 2_000_000_000;

function clampInt(n, min, max) {
  const x = Math.floor(Number(n));
  if (!Number.isFinite(x)) return min;
  return Math.max(min, Math.min(max, x));
}

export function applySaveSanityClamps(game) {
  if (!game || typeof game !== 'object') return;
  game.coins = clampInt(game.coins, 0, MAX_INT);
  game.gems = clampInt(game.gems, 0, MAX_INT);
  game.gachaStardust = clampInt(game.gachaStardust, 0, MAX_INT);
  game.fuel = clampInt(game.fuel, 0, MAX_INT);
  game.gachaPityCount = clampInt(game.gachaPityCount, 0, MAX_INT);
  game.premiumPityCount = clampInt(game.premiumPityCount, 0, MAX_INT);
  game.lrPityCount = clampInt(game.lrPityCount, 0, MAX_INT);
  game.premiumLrPityCount = clampInt(game.premiumLrPityCount, 0, MAX_INT);
  game.bossKillTotal = clampInt(game.bossKillTotal, 0, MAX_INT);
  game.highestStage = clampInt(game.highestStage, 1, MAX_INT);
  game.playerLevel = clampInt(game.playerLevel, 1, 9999);
  game.exp = clampInt(game.exp, 0, MAX_INT);
  game.profileLevel = clampInt(game.profileLevel, 1, PROFILE_MAX_LEVEL);
  game.profileExp = clampInt(game.profileExp, 0, MAX_INT);
}
