/**
 * デイリー／アクティブ任務（v3）／常設クエストのランタイム。
 */
import { playSound } from './audio.js';
import { getLocalDateKey } from './date-utils.js';
import { game } from './game-store.js';
import { MISSION_POOL, NORMAL_QUEST_POOL } from '../game-data.js';
import { addInboxItem } from './inbox-storage.js';
import {
  readDailyMissionBlob,
  writeDailyMissionBlob,
  readMissionV3Blob,
  writeMissionV3Blob,
  readNormalQuestBlob,
  writeNormalQuestBlob,
} from './mission-persist.js';

function emptyMissionProgress() {
  return { kills: 0, maxCombo: 0, noDmgStages: 0, bossKills: 0, stageClears: 0, ultimateUses: 0, maxWave: 0 };
}

export function persistDailyMissionState() {
  const missionIds = (Array.isArray(game.sessionMissions) ? game.sessionMissions : [])
    .map((m) => m && m.id)
    .filter((id) => typeof id === 'string');
  const claimed =
    game.missionClaimedSet instanceof Set ? [...game.missionClaimedSet].sort((a, b) => a - b) : [];
  writeDailyMissionBlob({
    date: getLocalDateKey(),
    missionIds,
    progress: { ...game.sessionProgress },
    claimed,
  });
}

function pickThreeMissions() {
  const pool = [...MISSION_POOL].sort(() => Math.random() - 0.5);
  return pool.slice(0, 3);
}

function missionsFromStoredIds(ids) {
  const list = (ids || []).map((id) => MISSION_POOL.find((m) => m.id === id)).filter(Boolean);
  const used = new Set(list.map((m) => m.id));
  while (list.length < 3) {
    const add = MISSION_POOL.find((m) => !used.has(m.id)) || MISSION_POOL[0];
    used.add(add.id);
    list.push(add);
  }
  return list.slice(0, 3);
}

function dailySessionMissionsOk() {
  return (
    Array.isArray(game.sessionMissions) &&
    game.sessionMissions.length === 3 &&
    game.sessionMissions.every(
      (m) =>
        m &&
        typeof m.id === 'string' &&
        typeof m.label === 'string' &&
        typeof m.check === 'function' &&
        m.reward &&
        typeof m.reward === 'object' &&
        typeof m.reward.coins === 'number'
    )
  );
}

/** カスタマイズ表示前・出撃前に呼ぶ。日付が変わったらミッション抽選と進捗をリセット */
export function ensureDailyMissions() {
  const today = getLocalDateKey();
  if (game.dailyMissionLoadedDate === today && dailySessionMissionsOk()) return;
  game.dailyMissionLoadedDate = today;
  const blob = readDailyMissionBlob();
  if (!blob || blob.date !== today) {
    const picked = pickThreeMissions();
    game.sessionMissions = picked;
    game.sessionProgress = emptyMissionProgress();
    game.missionClaimedSet = new Set();
    writeDailyMissionBlob({
      date: today,
      missionIds: picked.map((m) => m.id),
      progress: { ...game.sessionProgress },
      claimed: [],
    });
    return;
  }
  game.sessionMissions = missionsFromStoredIds(blob.missionIds);
  const merged = emptyMissionProgress();
  Object.assign(merged, blob.progress || {});
  game.sessionProgress = merged;
  game.missionClaimedSet = new Set(blob.claimed || []);
  if (!dailySessionMissionsOk()) {
    const picked = pickThreeMissions();
    game.sessionMissions = picked;
    game.sessionProgress = emptyMissionProgress();
    game.missionClaimedSet = new Set();
    writeDailyMissionBlob({
      date: today,
      missionIds: picked.map((m) => m.id),
      progress: { ...game.sessionProgress },
      claimed: [],
    });
  }
}

function missionBaseline() {
  const L = game.questLifetime;
  return {
    kills: L.totalKills,
    bossKills: L.totalBossKills,
    stageClears: L.totalStageClears,
    ultimates: L.totalUltimates,
    noDmgClears: L.totalNoDmgClears,
  };
}

export function missionEffectiveProgress(slot) {
  const L = game.questLifetime;
  const b = slot.baseline || {};
  return {
    kills: Math.max(0, (L.totalKills || 0) - (b.kills || 0)),
    maxCombo: L.maxComboEver || 0,
    noDmgStages: Math.max(0, (L.totalNoDmgClears || 0) - (b.noDmgClears || 0)),
    bossKills: Math.max(0, (L.totalBossKills || 0) - (b.bossKills || 0)),
    stageClears: Math.max(0, (L.totalStageClears || 0) - (b.stageClears || 0)),
    ultimateUses: Math.max(0, (L.totalUltimates || 0) - (b.ultimates || 0)),
    maxWave: L.maxWaveEver || 0,
  };
}

function saveActiveMissions() {
  writeMissionV3Blob(game.activeMissions, game.recentMissionIds);
}

function loadActiveMissions() {
  const v = readMissionV3Blob();
  if (v) {
    game.activeMissions = v.slots;
    game.recentMissionIds = v.recent || [];
  }
}

export function ensureActiveMissions() {
  if (!Array.isArray(game.activeMissions)) game.activeMissions = [];
  if (!Array.isArray(game.recentMissionIds)) game.recentMissionIds = [];
  const activeIds = new Set(game.activeMissions.map((s) => s.missionId));
  const recentSet = new Set(game.recentMissionIds);
  while (game.activeMissions.length < 3) {
    let pool = MISSION_POOL.filter((m) => !activeIds.has(m.id) && !recentSet.has(m.id));
    if (!pool.length) pool = MISSION_POOL.filter((m) => !activeIds.has(m.id));
    if (!pool.length) break;
    const picked = pool[Math.floor(Math.random() * pool.length)];
    game.activeMissions.push({ missionId: picked.id, baseline: missionBaseline() });
    activeIds.add(picked.id);
  }
  saveActiveMissions();
}

export function claimActiveMission(missionId) {
  const idx = game.activeMissions.findIndex((s) => s.missionId === missionId);
  if (idx === -1) return;
  const mDef = MISSION_POOL.find((m) => m.id === missionId);
  if (!mDef) return;
  const ep = missionEffectiveProgress(game.activeMissions[idx]);
  let ok = false;
  try {
    ok = mDef.check(ep);
  } catch (e) {
    /* ignore */
  }
  if (!ok) return;
  addInboxItem(game, {
    label: `🏆 ミッション: ${mDef.label}`,
    coins: mDef.reward.coins,
    gems: mDef.reward.gems || 0,
    dust: mDef.reward.dust || 0,
    fuel: 1,
    icon: 'mission',
  });
  game.lifeGainDisplay = { text: `📬 ミッション達成！受け取りBOXに追加しました`, timer: 200, color: '#ff0' };
  playSound('upgrade_pick');
  game.activeMissions.splice(idx, 1);
  game.recentMissionIds.push(missionId);
  if (game.recentMissionIds.length > 15) game.recentMissionIds.shift();
  ensureActiveMissions();
}

export function ensureNormalQuestProfile() {
  if (game.questProfileLoaded) return;
  game.questProfileLoaded = true;
  const b = readNormalQuestBlob();
  if (b?.lifetime) Object.assign(game.questLifetime, b.lifetime);
  game.questClaimedIds = new Set(b.claimed || []);
  loadActiveMissions();
  ensureActiveMissions();
}

function persistNormalQuestState() {
  const claimed = game.questClaimedIds instanceof Set ? game.questClaimedIds : [];
  writeNormalQuestBlob({
    lifetime: { ...game.questLifetime },
    claimed: [...claimed],
  });
}

export function checkAndClaimNormalQuests() {
  ensureNormalQuestProfile();
  let lastClaim = null;
  for (const q of NORMAL_QUEST_POOL) {
    if (game.questClaimedIds.has(q.id)) continue;
    if (!q.check(game.questLifetime, game)) continue;
    game.questClaimedIds.add(q.id);
    const r = q.reward;
    addInboxItem(game, {
      label: `📋 クエスト: ${q.label}`,
      coins: r.coins,
      gems: r.gems || 0,
      dust: r.dust || 0,
      icon: 'quest',
    });
    lastClaim = q;
  }
  if (lastClaim) {
    game.lifeGainDisplay = {
      text: `📬 クエスト達成！受け取りBOXに追加しました`,
      timer: 200,
      color: '#ccf',
    };
  }
  persistNormalQuestState();
}

export function checkAndClaimMissions() {
  ensureNormalQuestProfile();
  checkAndClaimNormalQuests();
  if (!(game.missionClaimedSet instanceof Set)) game.missionClaimedSet = new Set();
  game.sessionMissions.forEach((m, i) => {
    if (game.missionClaimedSet.has(i)) return;
    if (m.check(game.sessionProgress)) {
      game.missionClaimedSet.add(i);
      addInboxItem(game, {
        label: `📅 デイリー: ${m.label}`,
        coins: m.reward.coins,
        gems: m.reward.gems || 0,
        dust: m.reward.dust || 0,
        fuel: 1,
        icon: 'daily',
      });
      game.lifeGainDisplay = {
        text: `📬 デイリーミッション達成！受け取りBOXに追加しました`,
        timer: 200,
        color: '#ff0',
      };
    }
  });
  persistDailyMissionState();
}

/** デイリー1枠を手動受取（達成済み・未受取のみ）。`checkAndClaimMissions` と同じ報酬・永続化。 */
export function claimDailyMissionSlot(index) {
  ensureDailyMissions();
  ensureNormalQuestProfile();
  const i = Math.floor(Number(index));
  if (!Number.isFinite(i) || i < 0 || i >= game.sessionMissions.length) return false;
  if (!(game.missionClaimedSet instanceof Set)) game.missionClaimedSet = new Set();
  if (game.missionClaimedSet.has(i)) return false;
  const m = game.sessionMissions[i];
  if (!m || typeof m.check !== 'function') return false;
  let ok = false;
  try {
    ok = !!m.check(game.sessionProgress);
  } catch (e) {
    /* ignore */
  }
  if (!ok) return false;
  game.missionClaimedSet.add(i);
  addInboxItem(game, {
    label: `📅 デイリー: ${m.label}`,
    coins: m.reward.coins,
    gems: m.reward.gems || 0,
    dust: m.reward.dust || 0,
    fuel: 1,
    icon: 'daily',
  });
  playSound('upgrade_pick');
  game.missionClaimToast = {
    coins: m.reward.coins || 0,
    gems: m.reward.gems || 0,
    dust: m.reward.dust || 0,
    timer: 90,
  };
  persistDailyMissionState();
  game.lifeGainDisplay = {
    text: '📬 デイリーミッション達成！受け取りBOXに追加しました',
    timer: 200,
    color: '#ff0',
  };
  return true;
}
