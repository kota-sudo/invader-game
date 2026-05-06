import test from 'node:test';
import assert from 'node:assert/strict';
import {
  expandMarsWaveSpawnTypes,
  countMarsWaveRegularEnemies,
  marsPresetShouldAutoSpawnBossAfterWaves,
  getMarsWavePreset,
} from '../js/game/mars-wave-presets.js';

test('1-1 preset: 3 waves, normal counts only', () => {
  const p = getMarsWavePreset(1);
  assert.equal(p.length, 3);
  for (const spec of p) {
    const a = expandMarsWaveSpawnTypes(spec).sort();
    const b = Array(countMarsWaveRegularEnemies(spec)).fill('normal').sort();
    assert.deepEqual(a, b);
  }
});

test('1-8 preset: bomber first appears in stage 8 waves', () => {
  for (let s = 1; s <= 7; s++) {
    const p = getMarsWavePreset(s);
    for (const spec of p) {
      assert.ok(!Object.prototype.hasOwnProperty.call(spec, 'BOMBER') || spec.BOMBER === undefined || spec.BOMBER === 0);
      assert.ok(!expandMarsWaveSpawnTypes(spec).includes('bomber'));
    }
  }
  const p8 = getMarsWavePreset(8);
  assert.ok(p8.some((spec) => (spec.BOMBER || 0) > 0));
});

test('auto boss after waves: off for 1-5 finale and 1-10 boss wave', () => {
  assert.equal(marsPresetShouldAutoSpawnBossAfterWaves(5), false);
  assert.equal(marsPresetShouldAutoSpawnBossAfterWaves(10), false);
  assert.equal(marsPresetShouldAutoSpawnBossAfterWaves(1), true);
});
