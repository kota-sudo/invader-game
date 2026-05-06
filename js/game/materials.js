import { game } from './game-store.js';
import { safeLocalStorageSetItem } from './storage-helpers.js';

export function saveMaterials() { safeLocalStorageSetItem('invader_materials', JSON.stringify(game.materials)); }
export function saveEquipStars() { safeLocalStorageSetItem('invader_equip_stars', JSON.stringify(game.equipStars || {})); }

export function addMaterial(type, n = 1) {
  game.materials[type] = (game.materials[type] || 0) + n; saveMaterials();
  if (game.state === 'playing' && game.player) {
    const icons = { scrap: '🔩', core: '⚡', crystal: '💎', composite: '🔷' };
    game.matPopups.push({ x: game.player.x + game.player.w / 2 + (Math.random() - 0.5) * 50, y: game.player.y, text: `+${n}${icons[type] || type}`, timer: 55, vy: -0.9 });
  }
}

export function saveShop() { safeLocalStorageSetItem('invader_shop', JSON.stringify(game.shopUpgrades)); }
