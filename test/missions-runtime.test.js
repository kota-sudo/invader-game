import { beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { getLocalDateKey } from '../js/game/date-utils.js';
import { MISSION_POOL, NORMAL_QUEST_POOL } from '../js/game-data.js';
import { readDailyMissionBlob } from '../js/game/mission-persist.js';

const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => void store.set(k, String(v)),
  removeItem: (k) => void store.delete(k),
  key: (i) => [...store.keys()][i] ?? null,
  get length() {
    return store.size;
  },
};

const DAILY_ALL_CLEAR_LABEL = 'デイリーコンプリート報酬';
const ALL_DAILY_DONE_PROGRESS = {
  kills: 999,
  maxCombo: 99,
  noDmgStages: 5,
  bossKills: 3,
  stageClears: 9,
  ultimateUses: 9,
  maxWave: 9,
};
const { game } = await import('../js/game/game-store.js');
const { claimDailyMissionSlot, checkAndClaimMissions, ensureDailyMissions } = await import('../js/game/missions-runtime.js');

function resetMissionState() {
  game.inbox = [];
  game.questProfileLoaded = true;
  game.sessionProgress = { ...ALL_DAILY_DONE_PROGRESS };
  game.sessionMissions = [
    { id: 't0', label: 'T0', check: () => true, reward: { coins: 10, gems: 1, dust: 0 } },
    { id: 't1', label: 'T1', check: () => true, reward: { coins: 20, gems: 0, dust: 2 } },
    { id: 't2', label: 'T2', check: () => true, reward: { coins: 30, gems: 0, dust: 3 } },
  ];
  game.dailyMissionLoadedDate = getLocalDateKey();
  game.missionClaimedSet = new Set();
  game.dailyAllBonusClaimed = false;
}

beforeEach(() => {
  store.clear();
  resetMissionState();
});

test('daily all-clear bonus is granted once after all three claims', () => {
  assert.equal(claimDailyMissionSlot(0), true);
  assert.equal(claimDailyMissionSlot(1), true);
  assert.equal(game.inbox.length, 2);
  assert.equal(game.dailyAllBonusClaimed, false);

  assert.equal(claimDailyMissionSlot(2), true);
  assert.equal(game.dailyAllBonusClaimed, true);
  assert.equal(game.inbox.length, 4);
  assert.equal(game.inbox.filter((it) => it.label.includes(DAILY_ALL_CLEAR_LABEL)).length, 1);

  assert.equal(claimDailyMissionSlot(2), false);
  assert.equal(game.inbox.filter((it) => it.label.includes(DAILY_ALL_CLEAR_LABEL)).length, 1);
});

test('auto claim path also grants all-clear bonus', () => {
  checkAndClaimMissions();
  assert.equal(game.dailyAllBonusClaimed, true);
  assert.equal(game.inbox.length, 4);
  assert.equal(game.inbox.filter((it) => it.label.includes(DAILY_ALL_CLEAR_LABEL)).length, 1);
});

test('ensureDailyMissions resets all-clear bonus state on date change', () => {
  game.dailyMissionLoadedDate = '1999-01-01';
  game.dailyAllBonusClaimed = true;
  game.missionClaimedSet = new Set([0, 1, 2]);
  ensureDailyMissions();

  assert.equal(game.dailyMissionLoadedDate, getLocalDateKey());
  assert.equal(game.dailyAllBonusClaimed, false);
  assert.equal(game.missionClaimedSet.size, 0);
  const blob = readDailyMissionBlob();
  assert.equal(blob?.allClaimed, false);
  assert.equal(Array.isArray(blob?.missionIds), true);
  assert.equal(blob?.missionIds?.length, 3);
});

test('mission and normal quest pools include expanded definitions', () => {
  assert.ok(MISSION_POOL.some((m) => m.id === 'kill150'));
  assert.ok(MISSION_POOL.some((m) => m.id === 'combo20'));
  assert.ok(MISSION_POOL.some((m) => m.id === 'wave6'));
  assert.ok(NORMAL_QUEST_POOL.some((q) => q.id === 'nq_k5000'));
  assert.ok(NORMAL_QUEST_POOL.some((q) => q.id === 'nq_hs40'));
  assert.ok(NORMAL_QUEST_POOL.some((q) => q.id === 'nq_nodmg10'));
});
