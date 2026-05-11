import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  PROFILE_MAX_LEVEL,
  getProfileExpToNextLevel,
  getProfileLevelProgressFraction,
  getProfileHpBonusPoints,
  recordProfileExpForStageClear,
} from '../js/game/profile-progress.js';

test('getProfileExpToNextLevel scales from Lv1', () => {
  assert.equal(getProfileExpToNextLevel(1), 80);
  assert.equal(getProfileExpToNextLevel(2), 122);
});

test('getProfileLevelProgressFraction uses exp toward next level', () => {
  const g = { profileLevel: 1, profileExp: 40 };
  assert.ok(Math.abs(getProfileLevelProgressFraction(g) - 0.5) < 1e-6);
  const maxed = { profileLevel: PROFILE_MAX_LEVEL, profileExp: 0 };
  assert.equal(getProfileLevelProgressFraction(maxed), 1);
});

test('getProfileHpBonusPoints scales with profile level', () => {
  assert.equal(getProfileHpBonusPoints(1), 0);
  assert.equal(getProfileHpBonusPoints(3), 20);
});

test('recordProfileExpForStageClear can level up', () => {
  const game = { profileLevel: 1, profileExp: 75 };
  const r = recordProfileExpForStageClear(game, 1);
  assert.equal(game.profileLevel, 2);
  assert.ok(game.profileExp >= 0);
  assert.equal(r.leveled, true);
  assert.equal(r.expGained, 28);
});

test('recordProfileExpForStageClear reports expGained when not leveling', () => {
  const game = { profileLevel: 1, profileExp: 0 };
  const r = recordProfileExpForStageClear(game, 1);
  assert.equal(r.leveled, false);
  assert.equal(r.expGained, 28);
  assert.equal(game.profileExp, 28);
});
