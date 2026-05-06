import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  readDailyMissionBlob,
  writeDailyMissionBlob,
  readMissionV3Blob,
  writeMissionV3Blob,
} from '../js/game/mission-persist.js';

beforeEach(() => {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => void store.set(k, String(v)),
    removeItem: (k) => void store.delete(k),
    _store: store,
  };
});

test('daily mission blob roundtrip', () => {
  const blob = { date: '2026-05-06', missionIds: ['a', 'b', 'c'], progress: { kills: 1 }, claimed: [] };
  writeDailyMissionBlob(blob);
  const r = readDailyMissionBlob();
  assert.deepEqual(r, blob);
});

test('mission v3 blob roundtrip', () => {
  writeMissionV3Blob([{ missionId: 'm1', baseline: {} }], ['m0']);
  const r = readMissionV3Blob();
  assert.equal(r.slots.length, 1);
  assert.equal(r.recent.length, 1);
});
