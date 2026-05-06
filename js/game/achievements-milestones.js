/**
 * 段階型実績の永続化と評価（フェーズ1: ドメインのみ。UI は後続フェーズ）。
 * ストレージキーは既存のフラグ実績 `invader_achievements` と分離。
 */

import { MILESTONE_ACHIEVEMENT_DEFS } from './achievements-milestones-data.js';
import { safeLocalStorageSetItem } from './storage-helpers.js';

export const MILESTONE_STORAGE_KEY = 'invader_achievements_v1';
export const MILESTONE_SCHEMA_VERSION = 1;

/**
 * @typedef {{
 *   schemaVersion: number;
 *   claimedTier: Record<string, number>;
 * }} MilestonePersistedState
 */

/** @returns {MilestonePersistedState} */
function defaultMilestoneState() {
  return { schemaVersion: MILESTONE_SCHEMA_VERSION, claimedTier: {} };
}

/** @returns {MilestonePersistedState} */
export function readMilestoneAchievementState() {
  try {
    const v = JSON.parse(localStorage.getItem(MILESTONE_STORAGE_KEY) || 'null');
    if (!v || typeof v !== 'object') return defaultMilestoneState();
    if (v.schemaVersion !== MILESTONE_SCHEMA_VERSION) return defaultMilestoneState();
    const claimed = v.claimedTier && typeof v.claimedTier === 'object' ? v.claimedTier : {};
    return { schemaVersion: MILESTONE_SCHEMA_VERSION, claimedTier: { ...claimed } };
  } catch (e) {
    return defaultMilestoneState();
  }
}

/** @param {MilestonePersistedState} state */
export function writeMilestoneAchievementState(state) {
  safeLocalStorageSetItem(MILESTONE_STORAGE_KEY, JSON.stringify(state));
}

/**
 * 各実績の評価行（UI バインド用）
 * @param {object} game
 */
export function evaluateMilestoneAchievements(game) {
  const st = readMilestoneAchievementState();
  return MILESTONE_ACHIEVEMENT_DEFS.map((def) => {
    let value = 0;
    try {
      value = Math.max(0, Math.floor(Number(def.getValue(game)) || 0));
    } catch (e) {
      value = 0;
    }
    let reachedTier = -1;
    for (let i = 0; i < def.tiers.length; i++) {
      if (value >= def.tiers[i].threshold) reachedTier = i;
    }
    const claimedMax = st.claimedTier[def.id];
    const claimed = typeof claimedMax === 'number' && claimedMax >= -1 ? claimedMax : -1;
    const nextTier = claimed + 1;
    const canClaim = nextTier < def.tiers.length && reachedTier >= nextTier;
    return {
      id: def.id,
      label: def.label,
      description: def.description,
      value,
      reachedTierIndex: reachedTier,
      claimedMaxTierIndex: claimed,
      nextTierIndex: nextTier < def.tiers.length ? nextTier : null,
      canClaim,
      nextReward: canClaim ? def.tiers[nextTier].reward : null,
      tiers: def.tiers,
    };
  });
}

/** 未受取の段階がある実績の件数 */
export function countMilestoneClaimable(game) {
  return evaluateMilestoneAchievements(game).filter((r) => r.canClaim).length;
}

/**
 * 指定実績の「次の1段階」だけ受取可能なら報酬を返し、ストレージを更新する。
 * 報酬の付与は呼び出し側（main の addInboxItem 等）。
 * @param {object} game
 * @param {string} achievementId
 * @returns {{ ok: true; reward: Record<string, number>; label: string; tierIndex: number } | { ok: false; reason: string }}
 */
export function claimNextMilestoneTier(game, achievementId) {
  const def = MILESTONE_ACHIEVEMENT_DEFS.find((d) => d.id === achievementId);
  if (!def) return { ok: false, reason: 'unknown_id' };
  const st = readMilestoneAchievementState();
  const claimed = typeof st.claimedTier[achievementId] === 'number' ? st.claimedTier[achievementId] : -1;
  const next = claimed + 1;
  if (next >= def.tiers.length) return { ok: false, reason: 'fully_claimed' };
  let value = 0;
  try {
    value = Math.max(0, Math.floor(Number(def.getValue(game)) || 0));
  } catch (e) {
    value = 0;
  }
  if (value < def.tiers[next].threshold) return { ok: false, reason: 'threshold_not_met' };
  st.claimedTier[achievementId] = next;
  writeMilestoneAchievementState(st);
  return {
    ok: true,
    reward: { ...def.tiers[next].reward },
    label: def.label,
    tierIndex: next,
  };
}
