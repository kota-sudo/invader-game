import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeStageRankTotal,
  rankFromTotal,
  computeStageStarMedal,
} from '../js/game/stage-medals.js';

test('rank total matches legacy calcRank scoring', () => {
  assert.equal(computeStageRankTotal({ hits: 0, maxCombo: 2 }, 'normal'), 40); // 40 + 0
  assert.equal(computeStageRankTotal({ hits: 0, maxCombo: 3 }, 'normal'), 50); // 40 + 10
  assert.equal(computeStageRankTotal({ hits: 0, maxCombo: 4 }, 'normal'), 50); // 40 + 10
  assert.equal(rankFromTotal(40), 'B');
  assert.equal(rankFromTotal(50), 'A');
  assert.equal(rankFromTotal(75), 'S');
});

test('stars follow same total thresholds as letter rank (B=2, A/S=3)', () => {
  assert.equal(computeStageStarMedal(0, 2, 'normal'), 2); // total 40 → B
  assert.equal(computeStageStarMedal(0, 3, 'normal'), 3); // total 50 → A
  assert.equal(computeStageStarMedal(4, 0, 'normal'), 1); // total 0 → C
  assert.equal(computeStageStarMedal(0, 8, 'boss_rush'), 3); // 40+30+20
});
