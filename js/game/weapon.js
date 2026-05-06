import { WEAPONS } from '../game-data.js';
import { game } from './game-store.js';

export function currentWeapon() {
  return WEAPONS[game.weaponIdx];
}

export function cycleWeapon() {
  for (let i = 1; i <= WEAPONS.length; i++) {
    const next = (game.weaponIdx + i) % WEAPONS.length;
    const w = WEAPONS[next];
    if (w === 'normal' || game.weaponAmmo[w] > 0) { game.weaponIdx = next; return; }
  }
}

export function getAvailableWeapons() {
  return WEAPONS.filter(w => w === 'normal' || game.weaponAmmo[w] > 0);
}
