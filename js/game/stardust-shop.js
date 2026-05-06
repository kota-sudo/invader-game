import { game } from './game-store.js';
import { gachaRollOne, addGachaItem, saveGachaData } from './gacha.js';
import { saveCoins } from './economy.js';

export const STARDUST_SHOP_ITEMS = [
  { label: 'コイン  +1000', desc: 'スターダストをコインに変換', cost: 100, color: '#ffd700', tag: null, action: ({ playSound }) => { game.coins += 1000; saveCoins(); } },
  { label: 'コイン  +5000', desc: 'まとめて大量変換 お得版', cost: 300, color: '#ffd700', tag: 'お得', action: ({ playSound }) => { game.coins += 5000; saveCoins(); } },
  {
    label: 'SR 確定 単発ガチャ', desc: 'SR以上が1枚確定で入手できる', cost: 500, color: '#cc88ff', tag: 'おすすめ',
    action: ({ playSound }) => {
      game.gachaResults = []; game.gachaNewItems = new Set();
      const item = gachaRollOne(true, false);
      game.gachaResults.push(item); addGachaItem(item);
      game.gachaCurrentIdx = 0; game.gachaAnimFrame = 0;
      game.state = 'gacha_result';
      playSound('warp');
    }
  },
];

export function applyStardustShop(idx, { playSound }) {
  const item = STARDUST_SHOP_ITEMS[idx];
  if (game.gachaStardust < item.cost) return;
  game.gachaStardust -= item.cost;
  saveGachaData();
  item.action({ playSound });
}
