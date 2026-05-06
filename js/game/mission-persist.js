/**
 * デイリー・アクティブ任務・常設クエストの localStorage キーと I/O を一箇所に集約。
 */
import { safeLocalStorageSetItem } from './storage-helpers.js';

export const DAILY_MISSION_STORAGE_KEY = 'invader_daily_missions_v1';
export const MISSION_V3_KEY = 'invader_missions_v3';
export const NORMAL_QUEST_STORAGE_KEY = 'invader_normal_quests_v1';

export function readDailyMissionBlob() {
  try {
    const raw = localStorage.getItem(DAILY_MISSION_STORAGE_KEY);
    const v = raw == null || raw === '' ? null : JSON.parse(raw);
    if (v && typeof v === 'object' && typeof v.date === 'string' && Array.isArray(v.missionIds)) return v;
  } catch (_) {}
  return null;
}

export function writeDailyMissionBlob(data) {
  safeLocalStorageSetItem(DAILY_MISSION_STORAGE_KEY, JSON.stringify(data));
}

export function readMissionV3Blob() {
  try {
    const raw = localStorage.getItem(MISSION_V3_KEY);
    if (!raw) return null;
    const v = JSON.parse(raw);
    if (v && typeof v === 'object' && Array.isArray(v.slots)) return v;
  } catch (_) {}
  return null;
}

export function writeMissionV3Blob(slots, recent) {
  safeLocalStorageSetItem(MISSION_V3_KEY, JSON.stringify({ slots, recent: recent || [] }));
}

export function readNormalQuestBlob() {
  try {
    const raw = localStorage.getItem(NORMAL_QUEST_STORAGE_KEY);
    const v = raw == null || raw === '' ? null : JSON.parse(raw);
    if (v && typeof v === 'object' && v.lifetime && typeof v.lifetime === 'object') {
      return { ...v, claimed: Array.isArray(v.claimed) ? v.claimed : [] };
    }
  } catch (_) {}
  return null;
}

export function writeNormalQuestBlob(data) {
  safeLocalStorageSetItem(NORMAL_QUEST_STORAGE_KEY, JSON.stringify(data));
}
