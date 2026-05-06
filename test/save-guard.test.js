import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applySaveSanityClamps } from '../js/game/save-guard.js';

test('applySaveSanityClamps clamps negative and huge numbers', () => {
  const game = {
    coins: -10,
    gems: 9e99,
    gachaStardust: NaN,
    fuel: 3.9,
    gachaPityCount: -1,
    premiumPityCount: 1,
    lrPityCount: 2,
    premiumLrPityCount: 3,
    bossKillTotal: 100,
    highestStage: 0,
    playerLevel: -3,
    exp: 1e12,
  };
  applySaveSanityClamps(game);
  assert.equal(game.coins, 0);
  assert.ok(game.gems <= 2_000_000_000);
  assert.equal(game.gachaStardust, 0);
  assert.equal(game.fuel, 3);
  assert.equal(game.gachaPityCount, 0);
  assert.equal(game.highestStage, 1);
  assert.equal(game.playerLevel, 1);
  assert.ok(Number.isFinite(game.exp));
});

test('applySaveSanityClamps ignores null game', () => {
  assert.doesNotThrow(() => applySaveSanityClamps(null));
});
