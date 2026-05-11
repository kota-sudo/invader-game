import { game, actions } from './game-store.js';
import { EXP_TABLE, LEVEL_BONUSES, UPGRADE_POOL } from '../game-data.js';
import { playSound } from './audio.js';
export function isUpgradeMaxed(id) {
  switch (id) {
    case 'speed': return game.playerUpgrades.speed >= 4;
    case 'firerate': return game.playerUpgrades.firerate >= 4;
    case 'damage': return game.playerUpgrades.damage >= 5;
    case 'bulletspd': return game.playerUpgrades.bulletSpd >= 9;
    case 'spread': return game.playerUpgrades.spread;
    default: return false;
  }
}

export function pickUpgradeChoices() {
  const available = UPGRADE_POOL.filter(u => !isUpgradeMaxed(u.id));
  const unseen = available.filter(u => !game.seenUpgradeIds.has(u.id));
  const seen = available.filter(u => game.seenUpgradeIds.has(u.id));
  const pool = [...unseen.sort(() => Math.random() - 0.5), ...seen.sort(() => Math.random() - 0.5)];
  game.upgradeChoices = pool.slice(0, 3).map(u => {
    if (game.seenUpgradeIds.has(u.id) && !isUpgradeMaxed(u.id)) {
      return { ...u, label: u.label + ' ++', enhanced: true };
    }
    return { ...u, enhanced: false };
  });
}

export function applyUpgrade(idx) {
  if (idx >= game.upgradeChoices.length) return;
  const up = game.upgradeChoices[idx];
  const mult = up.enhanced ? 2 : 1;
  game.seenUpgradeIds.add(up.id);
  playSound('upgrade_pick');
  switch (up.id) {
    case 'speed': game.playerUpgrades.speed = Math.min(game.playerUpgrades.speed + mult, 4); break;
    case 'firerate': game.playerUpgrades.firerate = Math.min(game.playerUpgrades.firerate + mult, 4); break;
    case 'life': game.playerStats.hp = Math.min(game.playerStats.maxHp, game.playerStats.hp + 30 * mult); actions.updateHUD(); break;
    case 'laser': game.weaponAmmo.laser += 15 * mult; break;
    case 'homing': game.weaponAmmo.homing += 8 * mult; break;
    case 'explosive': game.weaponAmmo.explosive += 8 * mult; break;
    case 'damage': game.playerUpgrades.damage = Math.min(game.playerUpgrades.damage + mult, 5); break;
    case 'spread': game.playerUpgrades.spread = true; break;
    case 'invincible': game.playerUpgrades.invincibleBonus += 60 * mult; break;
    case 'bulletspd': game.playerUpgrades.bulletSpd = Math.min(game.playerUpgrades.bulletSpd + 3 * mult, 9); break;
    case 'shieldUp': game.playerShield = true; break;
  }
  actions.genMapRoutes();
  game.state = 'map';
}

export function applyLevelUpBonusRow(bonus) {
  if (!bonus || !bonus.stat) return;
  switch (bonus.stat) {
    case 'firerate': game.playerUpgrades.firerate = Math.min((game.playerUpgrades.firerate || 0) + 1, 6); break;
    case 'speed': game.playerUpgrades.speed = Math.min((game.playerUpgrades.speed || 0) + 1, 6); break;
    case 'damage': game.playerUpgrades.damage = Math.min((game.playerUpgrades.damage || 1) + 1, 8); break;
    case 'life':
      game.playerStats.maxHp += 15;
      game.playerStats.hp = Math.min(game.playerStats.maxHp, game.playerStats.hp + 15);
      actions.updateHUD();
      break;
    case 'bulletspd': game.playerUpgrades.bulletSpd = Math.min((game.playerUpgrades.bulletSpd || 0) + 2, 10); break;
    case 'spread': game.playerUpgrades.spread = true; break;
  }
}

export function addExp(amount) {
  const expBoost = (game.gachaInventory['passive_exp']?.level >= 1 ? 1.2 : 1) * (actions.getPetEffect?.('exp') ? 1.15 : 1);
  game.exp += Math.floor(amount * expBoost);
  const nextThreshold = EXP_TABLE[Math.min(game.playerLevel, EXP_TABLE.length - 1)];
  if (game.exp >= nextThreshold && game.playerLevel < 10) {
    game.exp -= nextThreshold;
    game.playerLevel++;
    const bonus = LEVEL_BONUSES[(game.playerLevel - 2) % LEVEL_BONUSES.length];
    applyLevelUpBonusRow(bonus);
    game.levelUpDisplay = { text: bonus.label, timer: 180, color: '#ff0' };
    actions.triggerFlash(255, 220, 0, 0.25);
    playSound('levelup');
  }
}
