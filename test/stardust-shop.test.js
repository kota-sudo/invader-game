import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  getStardustShopCycleIndex,
  getMsUntilNextStardustShopCycle,
  STARDUST_SHOP_CYCLE_MS,
  STARDUST_SHOP_WEEK_COUNT,
} from '../js/game/stardust-shop-cycle.js';

test('stardust shop cycle index is bounded', () => {
  const a = getStardustShopCycleIndex(0);
  assert.ok(a >= 0 && a < STARDUST_SHOP_WEEK_COUNT);
  const b = getStardustShopCycleIndex(Date.now());
  assert.ok(b >= 0 && b < STARDUST_SHOP_WEEK_COUNT);
});

test('getMsUntilNextStardustShopCycle is in (0, CYCLE]', () => {
  const ms = getMsUntilNextStardustShopCycle(Date.now());
  assert.ok(ms > 0 && ms <= STARDUST_SHOP_CYCLE_MS);
});
