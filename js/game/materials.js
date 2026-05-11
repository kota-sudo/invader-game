import { game } from './game-store.js';
import { safeLocalStorageSetItem } from './storage-helpers.js';

export function saveMaterials() { safeLocalStorageSetItem('invader_materials', JSON.stringify(game.materials)); }
export function saveEquipStars() { safeLocalStorageSetItem('invader_equip_stars', JSON.stringify(game.equipStars || {})); }

export function addMaterial(type, n = 1, worldX, worldY) {
  game.materials[type] = (game.materials[type] || 0) + n; saveMaterials();
  if (game.state === 'playing' && game.player) {
    const icons = { scrap: '🔩', core: '⚡', crystal: '💎', composite: '🔷' };
    const cx = Number.isFinite(worldX) ? worldX : game.player.x + game.player.w / 2;
    const cy = Number.isFinite(worldY) ? worldY : game.player.y + game.player.h / 2;
    game.matPopups.push({
      x: cx + (Math.random() - 0.5) * 28,
      y: cy - 8 + (Math.random() - 0.5) * 12,
      text: `+${n}${icons[type] || type}`,
      kind: 'mat',
      timer: 52,
      vy: -1.05,
      vx: (Math.random() - 0.5) * 0.35,
    });
  }
}

export function saveShop() { safeLocalStorageSetItem('invader_shop', JSON.stringify(game.shopUpgrades)); }
