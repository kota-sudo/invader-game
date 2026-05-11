/**
 * プロフィール（指揮官）経験値・レベル：ステージクリアで獲得。最大HPと強化の解放条件に使う。
 */
import { UPGRADE_PROFILE_LV_REQ } from '../game-data.js';
import { safeLocalStorageSetItem } from './storage-helpers.js';

export const PROFILE_MAX_LEVEL = 60;

/** Lv `level` から Lv `level+1` に上がるのに必要な経験値（level は 1 始まり） */
export function getProfileExpToNextLevel(level) {
  const L = Math.max(1, Math.min(PROFILE_MAX_LEVEL - 1, Math.floor(Number(level) || 1)));
  return 80 + (L - 1) * 42;
}

export function getProfileHpBonusPoints(profileLevel) {
  const lv = Math.max(1, Math.min(PROFILE_MAX_LEVEL, Math.floor(Number(profileLevel) || 1)));
  return (lv - 1) * 10;
}

/** 現在 Lv 内の進捗 0〜1（UI バー用） */
export function getProfileLevelProgressFraction(game) {
  if (!game) return 0;
  const lv = Math.max(1, Math.min(PROFILE_MAX_LEVEL, Math.floor(game.profileLevel || 1)));
  if (lv >= PROFILE_MAX_LEVEL) return 1;
  const need = getProfileExpToNextLevel(lv);
  const cur = Math.max(0, Math.floor(game.profileExp || 0));
  return Math.min(1, need > 0 ? cur / need : 0);
}

/** 強化 Lv0→1 … の段階 `upgradeFromLv` に必要なプロフィール Lv（game-data の配列） */
export function getProfileLevelRequirementForUpgradeStep(upgradeFromLv) {
  const j = Math.max(0, Math.min(UPGRADE_PROFILE_LV_REQ.length - 1, Math.floor(upgradeFromLv || 0)));
  return UPGRADE_PROFILE_LV_REQ[j] ?? 1;
}

export function persistProfileProgress(game) {
  if (!game || typeof game !== 'object') return;
  safeLocalStorageSetItem('invader_profile_level', String(Math.max(1, Math.min(PROFILE_MAX_LEVEL, Math.floor(game.profileLevel || 1)))));
  safeLocalStorageSetItem('invader_profile_exp', String(Math.max(0, Math.floor(game.profileExp || 0))));
}

/**
 * ステージクリア時に呼ぶ。`clearedStageNum` はクリアしたステージ番号。
 * @returns {{ leveled: boolean, newLevel?: number, expGained: number }}
 */
export function recordProfileExpForStageClear(game, clearedStageNum) {
  if (!game || typeof game !== 'object') return { leveled: false, expGained: 0 };
  let lv = Math.max(1, Math.min(PROFILE_MAX_LEVEL, Math.floor(game.profileLevel || 1)));
  let exp = Math.max(0, Math.floor(game.profileExp || 0));
  if (lv >= PROFILE_MAX_LEVEL) {
    game.profileLevel = lv;
    game.profileExp = 0;
    persistProfileProgress(game);
    return { leveled: false, expGained: 0 };
  }
  const st = Math.max(1, Math.floor(Number(clearedStageNum) || 1));
  const gain = 20 + st * 8;
  exp += gain;
  let leveled = false;
  let newLevel = lv;
  while (lv < PROFILE_MAX_LEVEL) {
    const need = getProfileExpToNextLevel(lv);
    if (exp < need) break;
    exp -= need;
    lv++;
    leveled = true;
    newLevel = lv;
  }
  if (lv >= PROFILE_MAX_LEVEL) {
    lv = PROFILE_MAX_LEVEL;
    exp = 0;
  }
  game.profileLevel = lv;
  game.profileExp = exp;
  persistProfileProgress(game);
  return leveled ? { leveled: true, newLevel, expGained: gain } : { leveled: false, expGained: gain };
}

export function getProfileHeaderTooltipJa(game) {
  if (!game || typeof game !== 'object') return '';
  const lv = Math.max(1, Math.min(PROFILE_MAX_LEVEL, Math.floor(game.profileLevel || 1)));
  const hpBonus = getProfileHpBonusPoints(lv);
  const prog = getProfileLevelProgressFraction(game);
  const pct = Math.round(prog * 100);
  const need = lv < PROFILE_MAX_LEVEL ? getProfileExpToNextLevel(lv) : 0;
  const cur = Math.floor(game.profileExp || 0);
  const tail = lv >= PROFILE_MAX_LEVEL
    ? '\nプロフィール Lv は最大です。'
    : `\n次の Lv まで EXP ${cur} / ${need}（${pct}%）`;
  return `プロフィール Lv.${lv}\nステージクリアで EXP を獲得し Lv が上がります。\n最大HP +${hpBonus}（ベースに加算）\n強化の高ティアにはプロフィール Lv が必要です。${tail}`;
}
