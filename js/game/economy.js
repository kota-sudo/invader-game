import { game, actions } from './game-store.js';
import { safeLocalStorageSetItem } from './storage-helpers.js';

export function saveCoins() {
  safeLocalStorageSetItem('invader_coins', String(game.coins));
}

export function saveGems() {
  safeLocalStorageSetItem('invader_gems', String(game.gems));
}

export function addGems(amount) {
  game.gems += amount;
  saveGems();
  actions.updateHUD?.();
}
