/**
 * デイリー（端末日付・localStorage）の読み取りと UI 向けスナップショット。
 * 永続化キーと read は `mission-persist.js` と共有。
 */

export { DAILY_MISSION_STORAGE_KEY, readDailyMissionBlob } from './mission-persist.js';

/**
 * ミッション画面など用のスナップショット（描画専用・副作用なし）
 * @param {object} game game-store の game
 */
export function buildDailyMissionSnapshot(game) {
  const missions = Array.isArray(game.sessionMissions) ? game.sessionMissions : [];
  const prog = game.sessionProgress && typeof game.sessionProgress === 'object' ? game.sessionProgress : {};
  const claimed = game.missionClaimedSet instanceof Set ? game.missionClaimedSet : new Set();
  const rows = missions.map((m, i) => {
    let done = false;
    let progress = null;
    try {
      done = !!(m && typeof m.check === 'function' && m.check(prog));
    } catch (e) {
      done = false;
    }
    try {
      progress = m && typeof m.progress === 'function' ? m.progress(prog) : null;
    } catch (e) {
      progress = null;
    }
    return {
      index: i,
      id: (m && m.id) || '',
      label: (m && m.label) || '',
      reward: (m && m.reward) || {},
      done,
      claimed: claimed.has(i),
      progress,
    };
  });
  return {
    dateKey: typeof game.dailyMissionLoadedDate === 'string' ? game.dailyMissionLoadedDate : '',
    rows,
  };
}

/** 達成済みだが未受取のデイリー件数 */
export function countDailyDoneUnclaimed(game) {
  return buildDailyMissionSnapshot(game).rows.filter((r) => r.done && !r.claimed).length;
}
