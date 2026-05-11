import { game } from './game-store.js';
import { getProfileHpBonusPoints } from './profile-progress.js';
import { CHAR_POOL, EQUIP_POOL, PET_POOL, WEAPON_GACHA_POOL } from '../game-data.js';
import { applyLevelToAtkMult, applyLevelToStatAdd, getItemLevelBonus } from './gacha-level-math.js';
import { safeLocalStorageSetItem } from './storage-helpers.js';

export function saveLoadout() { safeLocalStorageSetItem('invader_loadout', JSON.stringify(game.playerLoadout)); }

export function rarityRank(r) {
  switch (r) {
    case 'LR': return 5;
    case 'SSR': return 4;
    case 'SR': return 3;
    case 'R': return 2;
    case 'N': return 1;
    default: return 0;
  }
}

export function equipEffectScore(eq) {
  if (!eq) return 0;
  const slot = eq.slot || 'atk';
  if (slot === 'atk') {
    return ((eq.atk || 1) - 1) * 1000 + (eq.crit || 0) * 10 + (eq.spd || 0) * 6 + (eq.hp || 0) * 0.2 + (eq.def || 0) * 0.3;
  }
  if (slot === 'def') {
    return (eq.def || 0) * 100 + (eq.hp || 0) * 2 + (eq.crit || 0) * 5 + ((eq.atk || 1) - 1) * 30 + (eq.spd || 0) * 4;
  }
  return (eq.crit || 0) * 30 + (eq.spd || 0) * 25 + ((eq.atk || 1) - 1) * 120 + (eq.def || 0) * 8 + (eq.hp || 0) * 0.5;
}

export function getEquipMainEffectText(eq) {
  if (!eq || !eq.id) return '';
  const b = getItemLevelBonus(eq.id);
  const slot = eq.slot || 'atk';
  if (slot === 'atk') {
    const mult = applyLevelToAtkMult(eq.atk || 1, b);
    const pct = (mult - 1) * 100;
    return `ATK ${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`;
  }
  if (slot === 'def') {
    const val = Math.round(applyLevelToStatAdd(eq.def || 0, b));
    return `DEF +${val}%`;
  }
  const crit = Math.round(applyLevelToStatAdd(eq.crit || 0, b));
  const spd = Math.round(applyLevelToStatAdd(eq.spd || 0, b));
  const hp = Math.round(applyLevelToStatAdd(eq.hp || 0, b));
  if (crit) return `CRIT +${crit}%`;
  if (spd) return `SPD +${spd}`;
  if (hp) return `HP +${hp}`;
  return '特殊';
}

export function equipPresetScore(eq, preset = 'all') {
  if (!eq) return 0;
  const atk = ((eq.atk || 1) - 1);
  const def = (eq.def || 0);
  const crit = (eq.crit || 0);
  const spd = (eq.spd || 0);
  const hp = (eq.hp || 0);
  if (preset === 'atk') return atk * 1200 + crit * 35 + spd * 10 + hp * 0.2 + def * 0.4;
  if (preset === 'def') return def * 140 + hp * 3.0 + crit * 8 + atk * 60 + spd * 6;
  if (preset === 'crit') return crit * 160 + atk * 260 + spd * 40 + def * 6 + hp * 0.5;
  return equipEffectScore(eq);
}

export function equipMatchesQuickFilter(eq, preset = 'all') {
  if (!eq) return false;
  if (preset === 'all') return true;
  if (preset === 'atk') return (eq.slot === 'atk') || ((eq.atk || 1) > 1);
  if (preset === 'def') return (eq.slot === 'def') || ((eq.def || 0) > 0) || ((eq.hp || 0) > 0);
  if (preset === 'crit') return ((eq.crit || 0) > 0);
  return true;
}

export function buildEquipPool() {
  const owned = EQUIP_POOL.filter(e => game.gachaInventory?.[e.id]);
  const fs = game.equipFilterSlot || 'all';
  const fr = game.equipFilterRarity || 'ALL';
  const onlyEq = !!game.equipFilterEquippedOnly;
  const onlyUnLv = !!game.equipFilterUnleveledOnly;
  const qf = (game.equipQuickFilter || 'all');
  const sortPreset = (game.equipSortPreset || 0);

  const equipIds = Array.isArray(game.playerLoadout?.equip) ? game.playerLoadout.equip : [];
  let pool = owned.filter(e => {
    if (!equipMatchesQuickFilter(e, qf)) return false;
    if (fs !== 'all' && e.slot !== fs) return false;
    if (fr !== 'ALL' && e.rarity !== fr) return false;
    if (onlyEq && !equipIds.includes(e.id)) return false;
    if (onlyUnLv) {
      const lv = (game.gachaInventory?.[e.id]?.level || 1);
      if (lv > 1) return false;
    }
    return true;
  });

  const mode = game.equipSortMode || 0;
  pool.sort((a, b) => {
    const alv = (game.gachaInventory?.[a.id]?.level || 1);
    const blv = (game.gachaInventory?.[b.id]?.level || 1);
    const ar = rarityRank(a.rarity), br = rarityRank(b.rarity);
    const ae = (qf !== 'all') ? equipPresetScore(a, qf) : equipEffectScore(a);
    const be = (qf !== 'all') ? equipPresetScore(b, qf) : equipEffectScore(b);
    const aPow = (qf !== 'all') ? equipPresetScore(a, qf) : equipEffectScore(a);
    const bPow = (qf !== 'all') ? equipPresetScore(b, qf) : equipEffectScore(b);

    if (sortPreset === 2) {
      if (blv !== alv) return blv - alv;
      if (br !== ar) return br - ar;
      if (bPow !== aPow) return bPow - aPow;
      return (a.label || '').localeCompare(b.label || '');
    }
    if (sortPreset === 1) {
      if (br !== ar) return br - ar;
      if (blv !== alv) return blv - alv;
      if (bPow !== aPow) return bPow - aPow;
      return (a.label || '').localeCompare(b.label || '');
    }
    if (sortPreset === 0) {
      if (bPow !== aPow) return bPow - aPow;
      if (br !== ar) return br - ar;
      if (blv !== alv) return blv - alv;
      return (a.label || '').localeCompare(b.label || '');
    }
    if (qf !== 'all') {
      if (be !== ae) return be - ae;
      if (br !== ar) return br - ar;
      if (blv !== alv) return blv - alv;
      return (a.label || '').localeCompare(b.label || '');
    } else if (mode === 1) {
      if (be !== ae) return be - ae;
      if (br !== ar) return br - ar;
      if (blv !== alv) return blv - alv;
    } else if (mode === 2) {
      if (blv !== alv) return blv - alv;
      if (br !== ar) return br - ar;
      if (be !== ae) return be - ae;
    } else {
      if (br !== ar) return br - ar;
      if (blv !== alv) return blv - alv;
      if (be !== ae) return be - ae;
    }
    return (a.label || '').localeCompare(b.label || '');
  });
  return pool;
}

export function buildLoadoutPool() {
  if (game.loadoutTab === 0) return CHAR_POOL;
  if (game.loadoutTab === 1) return buildEquipPool();
  if (game.loadoutTab === 2) return PET_POOL.filter(p => game.gachaInventory[p.id]);
  return [{ id: null }, ...WEAPON_GACHA_POOL.filter(w => game.gachaInventory[w.id])];
}

export function applyLoadoutSelection(selectedItem = null) {
  if (game.loadoutTab === 0) {
    const it = selectedItem && selectedItem.id ? selectedItem : null;
    if (it && it.id === 'char_basic') {
      game.playerLoadout.charId = null; saveLoadout(); return;
    }
    if (it && game.gachaInventory?.[it.id]) {
      game.playerLoadout.charId = it.id; saveLoadout(); return;
    }
    const pool = CHAR_POOL.filter(c => c && c.id);
    if (pool.length === 0) { game.playerLoadout.charId = null; saveLoadout(); return; }
    const pick = pool[Math.min(game.loadoutCursor, pool.length - 1)];
    if (pick) { game.playerLoadout.charId = pick.id; saveLoadout(); }
  } else if (game.loadoutTab === 1) {
    const owned = buildEquipPool();
    if (owned.length === 0) return;
    const eq = (selectedItem && selectedItem.id) ? owned.find(x => x.id === selectedItem.id) : null;
    const pick = eq || owned[Math.min(game.loadoutCursor, owned.length - 1)];
    if (!pick) return;
    const slotMap = { atk: 0, def: 1, sp: 2 };
    const slotIdx = slotMap[pick.slot] ?? 0;
    if (Array.isArray(game.playerLoadout?.equip)) {
      game.playerLoadout.equip[slotIdx] = pick.id;
      saveLoadout();
    }
  } else if (game.loadoutTab === 2) {
    const owned = PET_POOL.filter(p => game.gachaInventory[p.id]);
    if (owned.length === 0) return;
    const maxPetSlots = game.stage >= 10 ? 3 : game.stage >= 5 ? 2 : 1;
    const pet = (selectedItem && selectedItem.id) ? owned.find(x => x.id === selectedItem.id) : null;
    const pick = pet || owned[Math.min(game.loadoutCursor, owned.length - 1)];
    if (!pick) return;
    const emptySlot = game.playerLoadout.pets.slice(0, maxPetSlots).findIndex(p => !p);
    const idx = emptySlot >= 0 ? emptySlot : 0;
    game.playerLoadout.pets[idx] = pick.id; saveLoadout();
  } else if (game.loadoutTab === 3) {
    const owned = [{ id: null, rarity: 'N', type: 'weapon', label: 'CLASSIC', desc: '通常弾・無限', color: '#aaa', weapon: 'normal', ammo: 0 }, ...WEAPON_GACHA_POOL.filter(w => game.gachaInventory[w.id])];
    const w = (selectedItem ? owned.find(x => x.id === selectedItem.id) : null) || owned[Math.min(game.loadoutCursor, owned.length - 1)];
    if (!w) return;
    game.playerLoadout.weaponId = w.id; saveLoadout();
  }
}

export function computeBaseStats() {
  const charDef = CHAR_POOL.find(c => c.id === 'char_basic');
  const char = CHAR_POOL.find(c => c.id === game.playerLoadout.charId && game.gachaInventory[c.id]) || charDef;
  const cBonus = char && char.id ? getItemLevelBonus(char.id) : 0;
  const profileHp = getProfileHpBonusPoints(game.profileLevel);
  let hp = applyLevelToStatAdd(char.hp, cBonus) + profileHp;
  let atk = applyLevelToAtkMult(char.atk, cBonus);
  let def = applyLevelToStatAdd(char.def, cBonus);
  let crit = applyLevelToStatAdd(char.crit, cBonus);
  let spd = applyLevelToStatAdd(char.spd, cBonus);
  for (const eid of game.playerLoadout.equip) {
    if (!eid) continue;
    const eq = EQUIP_POOL.find(e => e.id === eid);
    if (!eq || !game.gachaInventory[eid]) continue;
    const eBonus = getItemLevelBonus(eid);
    const starMult = 1 + (game.equipStars?.[eid] || 0) * 0.05;
    hp   += applyLevelToStatAdd(eq.hp   || 0, eBonus) * starMult;
    atk  *= applyLevelToAtkMult(eq.atk  || 1, eBonus) * starMult;
    def  += applyLevelToStatAdd(eq.def  || 0, eBonus) * starMult;
    crit += applyLevelToStatAdd(eq.crit || 0, eBonus) * starMult;
    spd  += applyLevelToStatAdd(eq.spd  || 0, eBonus) * starMult;
  }
  game.playerStats = { hp: Math.round(hp), maxHp: Math.round(hp), atk, def: Math.min(Math.round(def), 50), crit: Math.min(Math.round(crit), 40), spd: Math.round(spd) };
}
