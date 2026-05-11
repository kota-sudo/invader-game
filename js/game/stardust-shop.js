import { game } from './game-store.js';
import { gachaRollOne, addGachaItem, saveGachaData } from './gacha.js';
import { saveCoins } from './economy.js';
import {
  STARDUST_SHOP_ROTATIONS,
  getStardustShopCycleIndex,
  getMsUntilNextStardustShopCycle,
} from './stardust-shop-cycle.js';

export {
  STARDUST_SHOP_CYCLE_MS,
  STARDUST_SHOP_WEEK_COUNT,
  getStardustShopCycleIndex,
  getMsUntilNextStardustShopCycle,
  formatStardustShopRotationCountdownJa,
} from './stardust-shop-cycle.js';

function runCoin1000() {
  game.coins += 1000;
  saveCoins();
}
function runCoin5000() {
  game.coins += 5000;
  saveCoins();
}
function runSrGacha(playSound) {
  game.gachaResults = [];
  game.gachaNewItems = new Set();
  const item = gachaRollOne(true, false);
  game.gachaResults.push(item);
  addGachaItem(item);
  game.gachaCurrentIdx = 0;
  game.gachaAnimFrame = 0;
  game.state = 'gacha_result';
  playSound('warp');
}

const BASE_ITEMS = [
  {
    label: 'コイン  +1000',
    desc: 'スターダストをコインに変換',
    baseCost: 100,
    color: '#ffd700',
    tag: null,
    run: ({ playSound }) => {
      runCoin1000();
    },
  },
  {
    label: 'コイン  +5000',
    desc: 'まとめて大量変換 お得版',
    baseCost: 300,
    color: '#ffd700',
    tag: 'お得',
    run: ({ playSound }) => {
      runCoin5000();
    },
  },
  {
    label: 'SR 確定 単発ガチャ',
    desc: 'SR以上が1枚確定で入手できる',
    baseCost: 500,
    color: '#cc88ff',
    tag: 'おすすめ',
    run: ({ playSound }) => {
      runSrGacha(playSound);
    },
  },
];

/** 現在の交換アイテム一覧（コストは週で変動） */
export function getStardustShopItems(now = Date.now()) {
  const ri = getStardustShopCycleIndex(now);
  const { costMult } = STARDUST_SHOP_ROTATIONS[ri];
  return BASE_ITEMS.map((b) => ({
    label: b.label,
    desc: b.desc,
    cost: Math.max(1, Math.round(b.baseCost * costMult)),
    color: b.color,
    tag: b.tag,
    rotationIndex: ri,
    rotationLineJa: STARDUST_SHOP_ROTATIONS[ri].lineJa,
    _run: b.run,
  }));
}

/** 次サイクル開始直後の想定ラインナップ（ラベル + コスト） */
export function getNextStardustShopPreviewLines(now = Date.now()) {
  const tNext = now + getMsUntilNextStardustShopCycle(now);
  return getStardustShopItems(tNext).map((it) => `${it.label} · ✦${it.cost}`);
}

export function applyStardustShop(idx, { playSound }, now = Date.now()) {
  const items = getStardustShopItems(now);
  const item = items[idx];
  if (!item || game.gachaStardust < item.cost) return;
  game.gachaStardust -= item.cost;
  saveGachaData();
  item._run({ playSound });
}
