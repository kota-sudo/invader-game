import { readJsonObject, safeLocalStorageSetItem } from './storage-helpers.js';

/**
 * ステージ評価スコア（main.js の旧 calcRank と同一式）。
 * @param {{ hits?: number, maxCombo?: number }} stats
 * @param {string} [stageType]
 */
export function computeStageRankTotal(stats, stageType = 'normal') {
  const hits = stats.hits ?? 0;
  const maxCombo = stats.maxCombo ?? 0;
  const hitScore = hits === 0 ? 40 : hits <= 1 ? 25 : hits <= 3 ? 10 : 0;
  const comboScore = maxCombo >= 8 ? 30 : maxCombo >= 5 ? 20 : maxCombo >= 3 ? 10 : 0;
  const typeBonus = stageType === 'boss_rush' ? 20 : stageType === 'survival' ? 15 : 0;
  return hitScore + comboScore + typeBonus;
}

/** @param {number} total */
export function rankFromTotal(total) {
  return total >= 75 ? 'S' : total >= 50 ? 'A' : total >= 25 ? 'B' : 'C';
}

/**
 * ★はランク（評価スコア）と同じ閾値に連動。
 * - C（未満25）: 1
 * - B（25〜49）: 2
 * - A/S（50以上）: 3
 */
export function computeStageStarMedal(hits, maxCombo, stageType = 'normal') {
  const total = computeStageRankTotal({ hits, maxCombo }, stageType);
  if (total >= 50) return 3;
  if (total >= 25) return 2;
  return 1;
}

export function readStageStarMedals() {
  const o = readJsonObject('invader_stage_stars', {});
  return o && typeof o === 'object' && !Array.isArray(o) ? o : {};
}

export function saveStageStarMedals(obj) {
  safeLocalStorageSetItem('invader_stage_stars', JSON.stringify(obj));
}

export function commitStageStarMedalForCurrentClear(game) {
  if (game.bossRushModeActive || game.endlessModeActive) return;
  const skipStars = !!game.continueNoStarsThisRun;
  const st = String(game.stage);
  const medals = { ...readStageStarMedals() };
  const prev = medals[st];
  const computed = computeStageStarMedal(
    game.stageStats.hits,
    game.stageStats.maxCombo,
    game.stageType,
  );
  let next;
  if (skipStars) next = (typeof prev === 'number' && !Number.isNaN(prev)) ? prev : 0;
  else next = Math.max(typeof prev === 'number' && !Number.isNaN(prev) ? prev : 0, computed);
  medals[st] = next;
  saveStageStarMedals(medals);
  game.continueNoStarsThisRun = false;
}

export function getStageMedalCount(game, stageNum) {
  const s = Math.floor(stageNum);
  const hs = Math.max(1, game.highestStage | 0);
  if (s > hs) return 0;
  const medals = readStageStarMedals();
  const k = String(s);
  if (Object.prototype.hasOwnProperty.call(medals, k)) return Math.min(3, Math.max(0, Number(medals[k]) || 0));
  if (s < hs) return 3;
  return 0;
}

export function getStageStarsForMap(game, stageNum) {
  return getStageMedalCount(game, Math.floor(stageNum));
}
