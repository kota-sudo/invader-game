import { game } from './game-store.js';
import { safeLocalStorageSetItem } from './storage-helpers.js';

export function getLocalWeekEpoch() {
  return Math.floor(Date.now() / (7 * 24 * 3600 * 1000));
}

export function readWeeklyLocalBoard() {
  try {
    const raw = localStorage.getItem('invader_weekly_local_v1');
    const j = raw ? JSON.parse(raw) : null;
    const ep = getLocalWeekEpoch();
    if (!j || typeof j !== 'object' || j.epoch !== ep) return { epoch: ep, boss: [], endless: [] };
    return { epoch: ep, boss: Array.isArray(j.boss) ? j.boss : [], endless: Array.isArray(j.endless) ? j.endless : [] };
  } catch (e) { return { epoch: getLocalWeekEpoch(), boss: [], endless: [] }; }
}

export function pushWeeklyLocalScore(mode, score) {
  if (!mode || !Number.isFinite(score) || score <= 0) return;
  const ep = getLocalWeekEpoch();
  const cur = readWeeklyLocalBoard();
  if (cur.epoch !== ep) { cur.boss = []; cur.endless = []; cur.epoch = ep; }
  const name = (game.displayName || 'PLAYER').slice(0, 12);
  const row = { score: Math.floor(score), name, t: Date.now() };
  const key = mode === 'boss_rush' ? 'boss' : 'endless';
  if (key !== 'boss' && key !== 'endless') return;
  const arr = [...(cur[key] || []), row].sort((a, b) => b.score - a.score).slice(0, 5);
  cur[key] = arr;
  safeLocalStorageSetItem('invader_weekly_local_v1', JSON.stringify(cur));
}
