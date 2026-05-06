import { playSound } from './audio.js';
import {
  ALL_GACHA_POOL,
  CHAR_POOL,
  currentPickupId,
  EQUIP_POOL,
  PET_POOL,
  PREMIUM_POOL,
  WEAPON_GACHA_POOL,
} from '../game-data.js';
import { saveCoins, saveGems } from './economy.js';
import { applyLevelToAtkMult, applyLevelToStatAdd } from './gacha-level-math.js';
import { game, actions } from './game-store.js';
import { safeLocalStorageSetItem } from './storage-helpers.js';

export function saveGachaData() {
  safeLocalStorageSetItem('invader_gacha_inv', JSON.stringify(game.gachaInventory));
  safeLocalStorageSetItem('invader_gacha_mat', JSON.stringify(game.gachaMaterials));
  safeLocalStorageSetItem('invader_stardust', String(game.gachaStardust));
}

export function savePremiumPity() {
  safeLocalStorageSetItem('invader_premium_pity', String(game.premiumPityCount));
}

export function saveLrPity() {
  safeLocalStorageSetItem('invader_lr_pity', String(game.lrPityCount));
  safeLocalStorageSetItem('invader_premium_lr_pity', String(game.premiumLrPityCount));
}

export function savePity() {
  safeLocalStorageSetItem('invader_pity', String(game.gachaPityCount));
}

export function ensureAllCharsUpgradable() {
  // ユーザー要望: 全キャラを強化できるようにする（未所持でもLv1として解放）
  // char_basic(ROOKIE) は例外で強化不可のまま
  if (!game.gachaInventory || typeof game.gachaInventory !== 'object') game.gachaInventory = {};
  let changed = false;
  for (const c of CHAR_POOL) {
    if (!c || !c.id || c.id === 'char_basic') continue;
    if (!game.gachaInventory[c.id]) {
      game.gachaInventory[c.id] = { level: 1 };
      changed = true;
    } else if (!game.gachaInventory[c.id].level) {
      game.gachaInventory[c.id].level = 1;
      changed = true;
    }
  }
  if (changed) saveGachaData();
}

/** 本番では呼ばない。`?dev_equips=1` または `localStorage.invader_dev_unlock_equips=1` のときのみ main から実行。 */
export function ensureAllEquipsOwnedForTest() {
  // 装備画面を試すため、全装備を所持状態にする（Lv1）
  if (!game.gachaInventory || typeof game.gachaInventory !== 'object') game.gachaInventory = {};
  let changed = false;
  for (const e of EQUIP_POOL) {
    if (!e || !e.id) continue;
    if (!game.gachaInventory[e.id]) {
      game.gachaInventory[e.id] = { level: 1 };
      changed = true;
    } else if (!game.gachaInventory[e.id].level) {
      game.gachaInventory[e.id].level = 1;
      changed = true;
    }
  }
  if (changed) saveGachaData();
}

export function gachaRollRarity(forceSR = false, forceSSR = false, forceLR = false) {
  if (forceSSR) return 'SSR';
  const r = Math.random();
  if (forceSR) return r < 0.25 ? 'SSR' : 'SR';
  if (r < 0.05) return 'SSR';
  if (r < 0.20) return 'SR';
  if (r < 0.50) return 'R';
  return 'N';
}

export function premiumRollRarity(forceSR = false, forceSSR = false, forceLR = false) {
  if (forceLR) return 'LR';
  if (forceSSR) return 'SSR';
  const r = Math.random();
  if (forceSR) return r < 0.40 ? 'SSR' : 'SR';
  if (r < 0.015) return 'LR';
  if (r < 0.20) return 'SSR';
  if (r < 0.75) return 'SR';
  return 'R';
}

export function gachaRollOne(forceSR = false, forceSSR = false, forceLR = false) {
  const rarity = gachaRollRarity(forceSR, forceSSR, forceLR);
  const pool = ALL_GACHA_POOL.filter(i => i.rarity === rarity);
  return pool[Math.floor(Math.random() * pool.length)] || ALL_GACHA_POOL[0];
}

export function premiumRollOne(forceSR = false, forceSSR = false, forceLR = false) {
  const rarity = premiumRollRarity(forceSR, forceSSR, forceLR);
  const pool = PREMIUM_POOL.filter(i => i.rarity === rarity);
  // ピックアップ: 対象レアリティ内で50%確率でフィーチャーアイテム優先
  if (rarity === 'SSR' && Math.random() < 0.5) {
    const pk = PREMIUM_POOL.find(i => i.id === currentPickupId && i.rarity === 'SSR');
    if (pk) return pk;
  }
  return pool[Math.floor(Math.random() * pool.length)] || PREMIUM_POOL[0];
}

export function doPremiumPull(count) {
  const cost = count === 1 ? 5 : 50; // gems
  if (game.gems < cost) return false;
  game.gems -= cost; saveGems(); actions.updateHUD?.();
  game.gachaResults = []; game.gachaNewItems = new Set(); game.gachaIsPremium = true;
  let hasSR = false;
  for (let i = 0; i < count; i++) {
    const forcePity = game.premiumPityCount >= 50;
    const forceLRPity = game.premiumLrPityCount >= 100;
    const force10SR = count === 10 && i === 9 && !hasSR;
    const item = premiumRollOne(force10SR, forcePity && !forceLRPity, forceLRPity);
    game.premiumPityCount++;
    game.premiumLrPityCount++;
    if (item.rarity === 'LR') { game.premiumPityCount = 0; game.premiumLrPityCount = 0; }
    else if (item.rarity === 'SSR') game.premiumPityCount = 0;
    if (item.rarity === 'LR' || item.rarity === 'SSR' || item.rarity === 'SR') hasSR = true;
    game.gachaResults.push(item);
    addGachaItem(item);
  }
  savePremiumPity(); saveLrPity();
  game.gachaCurrentIdx = 0; game.gachaAnimFrame = 0;
  game.state = 'gacha_result';
  playSound('warp');
  return true;
}

export function canDailyGacha() {
  return localStorage.getItem('invader_daily_gacha') !== new Date().toISOString().split('T')[0];
}

export function doDailyGacha() {
  if (!canDailyGacha()) return;
  // N〜R限定
  const pool = ALL_GACHA_POOL.filter(i => i.rarity === 'R' || i.rarity === 'N');
  if (!pool.length) return;
  safeLocalStorageSetItem('invader_daily_gacha', new Date().toISOString().split('T')[0]);
  const item = pool[Math.floor(Math.random() * pool.length)];
  game.gachaResults = [item]; game.gachaNewItems = new Set(); game.gachaIsPremium = false;
  addGachaItem(item);
  game.gachaCurrentIdx = 0; game.gachaAnimFrame = 0;
  game.state = 'gacha_result';
  playSound('powerup');
}

export function addGachaItem(item) {
  if (!item || !item.id || !item.rarity) return;
  const isNew = !game.gachaInventory[item.id];
  if (isNew) {
    game.gachaInventory[item.id] = { level: 1, mat: 0 };
    game.gachaNewItems.add(item.id);
  } else if (game.gachaInventory[item.id].level < 30) {
    game.gachaInventory[item.id].mat = (game.gachaInventory[item.id].mat || 0) + 1;
    game.gachaMaterials[item.rarity] = (game.gachaMaterials[item.rarity] || 0) + 1;
  } else {
    game.gachaStardust += { LR: 200, SSR: 50, SR: 20, R: 10, N: 5 }[item.rarity] || 5;
  }
  saveGachaData();
}

export function getLevelUpCost(item) {
  const inv = game.gachaInventory[item.id]; if (!inv) return null;
  const lv = inv.level || 1;
  if (lv >= 30) return null;
  const dustCost = { LR: 50, SSR: 20, SR: 10, R: 5, N: 2 }[item.rarity] * (1 + Math.floor(lv / 5));
  const coinCost = 200 * (1 + Math.floor(lv / 10));
  return { dust: dustCost, coins: coinCost };
}

export function tryLevelUpItem(item) {
  if (!item || !game.gachaInventory[item.id]) return;
  const cost = getLevelUpCost(item);
  if (!cost) return;
  if (game.gachaStardust < cost.dust || game.coins < cost.coins) return;
  // 強化前→後の増加分を記録（表示用）
  try {
    const inv = game.gachaInventory[item.id];
    const lv = inv?.level || 1;
    const b = (lv - 1) * 0.01;
    const next = Math.min(0.29, b + 0.01);
    const lines = [];
    if (item.type === 'weapon') {
      const base = item.ammo || 0;
      const now = Math.max(0, Math.round(base * (1 + b)));
      const nxt = Math.max(0, Math.round(base * (1 + next)));
      if (nxt !== now) lines.push({ l: '弾数', d: `+${nxt - now}` });
    } else if (item.type === 'char') {
      const hp0 = item.hp || 0, def0 = item.def || 0, crit0 = item.crit || 0, spd0 = item.spd || 0;
      const atk0 = item.atk || 1;
      const nowHp = Math.round(applyLevelToStatAdd(hp0, b));
      const nxtHp = Math.round(applyLevelToStatAdd(hp0, next));
      if (nxtHp !== nowHp) lines.push({ l: 'HP', d: `+${nxtHp - nowHp}` });
      const nowAtk = applyLevelToAtkMult(atk0, b);
      const nxtAtk = applyLevelToAtkMult(atk0, next);
      if (nxtAtk !== nowAtk) lines.push({ l: 'ATK', d: `+${Math.round((nxtAtk - nowAtk) * 100) / 100}` });
      const nowDef = Math.round(applyLevelToStatAdd(def0, b));
      const nxtDef = Math.round(applyLevelToStatAdd(def0, next));
      if (nxtDef !== nowDef) lines.push({ l: 'DEF', d: `+${nxtDef - nowDef}%` });
      const nowC = Math.round(applyLevelToStatAdd(crit0, b));
      const nxtC = Math.round(applyLevelToStatAdd(crit0, next));
      if (crit0 && nxtC !== nowC) lines.push({ l: 'CRIT', d: `+${nxtC - nowC}%` });
      const nowS = Math.round(applyLevelToStatAdd(spd0, b));
      const nxtS = Math.round(applyLevelToStatAdd(spd0, next));
      if (spd0 && nxtS !== nowS) lines.push({ l: 'SPD', d: `+${nxtS - nowS}` });
    } else if (item.type === 'equip') {
      const hp0 = item.hp || 0, def0 = item.def || 0, crit0 = item.crit || 0, spd0 = item.spd || 0;
      const atk0 = item.atk || 1;
      const nowHp = Math.round(applyLevelToStatAdd(hp0, b));
      const nxtHp = Math.round(applyLevelToStatAdd(hp0, next));
      if (hp0 && nxtHp !== nowHp) lines.push({ l: 'HP', d: `+${nxtHp - nowHp}` });
      const nowAtk = applyLevelToAtkMult(atk0, b);
      const nxtAtk = applyLevelToAtkMult(atk0, next);
      if (atk0 > 1 && nxtAtk !== nowAtk) lines.push({ l: 'ATK', d: `+${Math.round((nxtAtk - nowAtk) * 100) / 100}` });
      const nowDef = Math.round(applyLevelToStatAdd(def0, b));
      const nxtDef = Math.round(applyLevelToStatAdd(def0, next));
      if (def0 && nxtDef !== nowDef) lines.push({ l: 'DEF', d: `+${nxtDef - nowDef}%` });
      const nowC = Math.round(applyLevelToStatAdd(crit0, b));
      const nxtC = Math.round(applyLevelToStatAdd(crit0, next));
      if (crit0 && nxtC !== nowC) lines.push({ l: 'CRIT', d: `+${nxtC - nowC}%` });
      const nowS = Math.round(applyLevelToStatAdd(spd0, b));
      const nxtS = Math.round(applyLevelToStatAdd(spd0, next));
      if (spd0 && nxtS !== nowS) lines.push({ l: 'SPD', d: `+${nxtS - nowS}` });
    }
    game.lastUpgradeFlash = { id: item.id, lines, frame: game.frameCount };
  } catch (e) { }
  game.gachaStardust -= cost.dust; game.coins -= cost.coins; saveCoins();
  game.gachaInventory[item.id].level++;
  saveGachaData(); actions.updateHUD?.();
}

export function doWeaponFusion(weaponId) {
  const item = WEAPON_GACHA_POOL.find(w => w.id === weaponId);
  if (!item) return;
  const inv = game.gachaInventory[weaponId];
  if (!inv) return;
  const lv = inv.level || 1;
  if (lv >= 5) return;
  const fusionCosts = {
    N: { mat: 1, scrap: 10 },
    R: { mat: 1, scrap: 20, core: 5 },
    SR: { mat: 2, scrap: 30, core: 10, crystal: 3 },
    SSR: { mat: 2, scrap: 50, core: 20, crystal: 8 },
  };
  const cost = fusionCosts[item.rarity];
  if (!cost) return;
  if ((inv.mat || 0) < cost.mat) return;
  if (cost.scrap && (game.materials.scrap || 0) < cost.scrap) return;
  if (cost.core && (game.materials.core || 0) < cost.core) return;
  if (cost.crystal && (game.materials.crystal || 0) < cost.crystal) return;
  inv.mat = (inv.mat || 0) - cost.mat;
  if (cost.scrap) game.materials.scrap = (game.materials.scrap || 0) - cost.scrap;
  if (cost.core) game.materials.core = (game.materials.core || 0) - cost.core;
  if (cost.crystal) game.materials.crystal = (game.materials.crystal || 0) - cost.crystal;
  inv.level = lv + 1;
  safeLocalStorageSetItem('invader_materials', JSON.stringify(game.materials));
  saveGachaData(); actions.updateHUD?.();
}

export function tryPetLevelUp(petId) {
  const item = PET_POOL.find(p => p.id === petId);
  if (!item || !game.gachaInventory[petId]) return false;
  const inv = game.gachaInventory[petId];
  const lv = inv.level || 1;
  if (lv >= 5) return false;
  const petCosts = [
    { mat: 1, scrap: 5 },
    { mat: 1, scrap: 10, core: 2 },
    { mat: 2, scrap: 20, core: 5 },
    { mat: 2, scrap: 30, core: 10, crystal: 2 },
  ];
  const cost = petCosts[lv - 1];
  if (!cost) return false;
  if ((inv.mat || 0) < cost.mat) return false;
  if (cost.scrap && (game.materials.scrap || 0) < cost.scrap) return false;
  if (cost.core && (game.materials.core || 0) < cost.core) return false;
  if (cost.crystal && (game.materials.crystal || 0) < cost.crystal) return false;
  inv.mat = (inv.mat || 0) - cost.mat;
  if (cost.scrap) game.materials.scrap = (game.materials.scrap || 0) - cost.scrap;
  if (cost.core) game.materials.core = (game.materials.core || 0) - cost.core;
  if (cost.crystal) game.materials.crystal = (game.materials.crystal || 0) - cost.crystal;
  inv.level = lv + 1;
  safeLocalStorageSetItem('invader_materials', JSON.stringify(game.materials));
  saveGachaData(); actions.updateHUD?.();
  game.lastUpgradeFlash = { id: petId, lines: [{ l: 'Lv', d: '+1' }], frame: game.frameCount };
  return true;
}

export function getPetUpgradeCost(petId) {
  const inv = game.gachaInventory?.[petId];
  if (!inv) return null;
  const lv = inv.level || 1;
  if (lv >= 5) return null;
  const petCosts = [
    { mat: 1, scrap: 5 },
    { mat: 1, scrap: 10, core: 2 },
    { mat: 2, scrap: 20, core: 5 },
    { mat: 2, scrap: 30, core: 10, crystal: 2 },
  ];
  return petCosts[lv - 1] || null;
}

export function canPetUpgrade(petId) {
  const inv = game.gachaInventory?.[petId];
  if (!inv) return false;
  const cost = getPetUpgradeCost(petId);
  if (!cost) return false;
  if ((inv.mat || 0) < cost.mat) return false;
  if (cost.scrap && (game.materials.scrap || 0) < cost.scrap) return false;
  if (cost.core && (game.materials.core || 0) < cost.core) return false;
  if (cost.crystal && (game.materials.crystal || 0) < cost.crystal) return false;
  return true;
}

export function doGachaPull(count) {
  const cost = count === 1 ? 500 : 5000;
  if (game.coins < cost) return false;
  game.gachaIsPremium = false;
  game.coins -= cost; saveCoins();
  const el = document.getElementById('coins');
  if (el) el.textContent = game.coins;
  game.gachaResults = []; game.gachaNewItems = new Set();
  let hasSR = false;
  for (let i = 0; i < count; i++) {
    const forcePity = game.gachaPityCount >= 79;
    const force10SR = count === 10 && i === 9 && !hasSR;
    const item = gachaRollOne(force10SR, forcePity, false);
    game.gachaPityCount++;
    if (item.rarity === 'SSR') { game.gachaPityCount = 0; }
    if (item.rarity === 'SSR' || item.rarity === 'SR') hasSR = true;
    game.gachaResults.push(item);
    addGachaItem(item);
  }
  savePity();
  game.gachaCurrentIdx = 0; game.gachaAnimFrame = 0;
  game.state = 'gacha_result';
  playSound('warp');
  return true;
}
