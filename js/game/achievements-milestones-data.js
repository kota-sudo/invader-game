/**
 * 段階型実績（オフライン・localStorage `invader_achievements_v1`）。
 * 既存の NORMAL_QUEST_POOL としきい値が被りすぎないよう段差を変えている。
 */

/**
 * @typedef {{ coins?: number; gems?: number; dust?: number }} MilestoneReward
 */

/**
 * @typedef {{
 *   id: string;
 *   label: string;
 *   description: string;
 *   getValue: (game: object) => number;
 *   tiers: { threshold: number; reward: MilestoneReward }[];
 * }} MilestoneAchievementDef
 */

/** @type {MilestoneAchievementDef[]} */
export const MILESTONE_ACHIEVEMENT_DEFS = [
  {
    id: 'ms_kills',
    label: '撃破の軌跡',
    description: '累計撃破数のマイルストーン報酬。',
    getValue: (g) => (g.questLifetime && g.questLifetime.totalKills) || 0,
    tiers: [
      { threshold: 50, reward: { coins: 150, dust: 3 } },
      { threshold: 300, reward: { coins: 600, dust: 12, gems: 1 } },
      { threshold: 1000, reward: { coins: 2000, dust: 35, gems: 3 } },
    ],
  },
  {
    id: 'ms_boss',
    label: 'ボス殲滅戦',
    description: '累計ボス撃破数。',
    getValue: (g) => (g.questLifetime && g.questLifetime.totalBossKills) || 0,
    tiers: [
      { threshold: 1, reward: { coins: 400, dust: 8 } },
      { threshold: 10, reward: { coins: 2500, dust: 40, gems: 3 } },
      { threshold: 25, reward: { coins: 7000, dust: 90, gems: 8 } },
    ],
  },
  {
    id: 'ms_stage',
    label: '前線突破',
    description: '最高到達ステージ番号。',
    getValue: (g) => Math.max(0, Math.floor(Number(g.highestStage) || 0)),
    tiers: [
      { threshold: 5, reward: { coins: 300, dust: 5 } },
      { threshold: 15, reward: { coins: 1800, dust: 28, gems: 2 } },
      { threshold: 30, reward: { coins: 6500, dust: 85, gems: 8 } },
    ],
  },
  {
    id: 'ms_ultimate',
    label: '奥義の習熟',
    description: '必殺技の通算使用回数。',
    getValue: (g) => (g.questLifetime && g.questLifetime.totalUltimates) || 0,
    tiers: [
      { threshold: 3, reward: { coins: 250, dust: 6 } },
      { threshold: 15, reward: { coins: 1600, dust: 28, gems: 2 } },
      { threshold: 40, reward: { coins: 4500, dust: 70, gems: 6 } },
    ],
  },
  {
    id: 'ms_combo',
    label: 'コンボの極み',
    description: '歴代最高コンボ。',
    getValue: (g) => (g.questLifetime && g.questLifetime.maxComboEver) || 0,
    tiers: [
      { threshold: 20, reward: { coins: 500, dust: 10 } },
      { threshold: 50, reward: { coins: 2200, dust: 45, gems: 4 } },
    ],
  },
  {
    id: 'ms_nodmg',
    label: '無傷の勲章',
    description: 'ノーダメージクリアの累計。',
    getValue: (g) => (g.questLifetime && g.questLifetime.totalNoDmgClears) || 0,
    tiers: [
      { threshold: 1, reward: { coins: 600, dust: 15, gems: 1 } },
      { threshold: 5, reward: { coins: 2800, dust: 50, gems: 4 } },
      { threshold: 12, reward: { coins: 7500, dust: 110, gems: 10 } },
    ],
  },
];
