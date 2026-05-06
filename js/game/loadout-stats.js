import { CHAR_POOL, EQUIP_POOL } from '../game-data.js';
import { game } from './game-store.js';
import { applyLevelToAtkMult, applyLevelToStatAdd, getItemLevelBonus } from './gacha-level-math.js';

export function computeTotalStatsForLoadout(charId, equipIds) {
  const charDef = CHAR_POOL.find(c => c.id === 'char_basic') || { hp: 100, atk: 1, def: 0, crit: 5, spd: 0 };
  const char = (charId && CHAR_POOL.find(c => c.id === charId)) || charDef;
  const cBonus = (char && char.id && char.id !== 'char_basic') ? getItemLevelBonus(char.id) : 0;
  let hp = applyLevelToStatAdd(char.hp || 0, cBonus);
  let atk = applyLevelToAtkMult(char.atk || 1, cBonus);
  let def = applyLevelToStatAdd(char.def || 0, cBonus);
  let crit = applyLevelToStatAdd(char.crit || 0, cBonus);
  let spd = applyLevelToStatAdd(char.spd || 0, cBonus);
  const ids = Array.isArray(equipIds) ? equipIds : [null, null, null];
  for (const eid of ids) {
    if (!eid) continue;
    const eq = EQUIP_POOL.find(e => e.id === eid);
    if (!eq || !game.gachaInventory?.[eid]) continue;
    const eBonus = getItemLevelBonus(eid);
    hp += applyLevelToStatAdd(eq.hp || 0, eBonus);
    atk *= applyLevelToAtkMult(eq.atk || 1, eBonus);
    def += applyLevelToStatAdd(eq.def || 0, eBonus);
    crit += applyLevelToStatAdd(eq.crit || 0, eBonus);
    spd += applyLevelToStatAdd(eq.spd || 0, eBonus);
  }
  return {
    hp: Math.round(hp),
    atk,
    def: Math.min(Math.round(def), 50),
    crit: Math.min(Math.round(crit), 40),
    spd: Math.round(spd),
  };
}
