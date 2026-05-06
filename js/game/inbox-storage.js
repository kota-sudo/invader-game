import { readJsonArray, safeLocalStorageSetItem } from './storage-helpers.js';

export function loadInbox(game) {
  const raw = readJsonArray('invader_inbox', []);
  const now = Date.now();
  game.inbox = raw.filter((it) => it && !it.claimed && it.expiresAt > now);
}

export function saveInbox(game) {
  safeLocalStorageSetItem('invader_inbox', JSON.stringify(game.inbox));
}

export function addInboxItem(game, item) {
  if (!Array.isArray(game.inbox)) game.inbox = [];
  game.inbox.unshift({ ...item, id: `${Date.now()}_${Math.random().toString(36).slice(2)}`, claimed: false, expiresAt: Date.now() + 30 * 86400000 });
  saveInbox(game);
}

export function claimInboxItem(game, id, { addCoins, addGems, addFuel, saveGachaData }) {
  const it = game.inbox.find(x => x.id === id); if (!it || it.claimed) return;
  it.claimed = true;
  if (it.coins) addCoins(it.coins);
  if (it.gems) addGems(it.gems);
  if (it.fuel) addFuel(it.fuel);
  if (it.dust > 0) { game.gachaStardust += it.dust; saveGachaData(); }
  saveInbox(game);
  game.inbox = game.inbox.filter(x => !x.claimed);
}

export function claimAllInbox(game, { addCoins, addGems, addFuel, saveGachaData }) {
  game.inbox.filter(x => !x.claimed).forEach(it => {
    it.claimed = true;
    if (it.coins) addCoins(it.coins);
    if (it.gems) addGems(it.gems);
    if (it.fuel) addFuel(it.fuel);
    if (it.dust > 0) { game.gachaStardust += it.dust; saveGachaData(); }
  });
  saveInbox(game); game.inbox = [];
}
