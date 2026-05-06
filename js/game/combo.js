import { game, actions } from './game-store.js';
import { playSound } from './audio.js';

export function addCombo(x, y, baseScore) {
  actions.ensureNormalQuestProfile();
  game.questLifetime.totalKills++;
  game.combo++; game.comboTimer = 90; game.stageStats.kills++;
  game.stageStats.maxCombo = Math.max(game.stageStats.maxCombo, game.combo);
  game.sessionProgress.maxCombo = Math.max(game.sessionProgress.maxCombo, game.combo);
  game.questLifetime.maxComboEver = Math.max(game.questLifetime.maxComboEver, game.combo);
  actions.checkAndClaimMissions();
  if (game.combo >= 10) actions.unlockAchievement('combo10');
  actions.addUltimateGauge(6);
  const mult = Math.min(game.combo, 8);
  const bonus = baseScore * mult;
  game.score += bonus;
  game.comboDisplay = { x, y, text: game.combo > 1 ? `x${mult} COMBO! +${bonus}` : `+${bonus}`, timer: 60 };
  if (game.combo >= 5) actions.triggerFlash(255, 255, 0, 0.08 + game.combo * 0.02);
  if (game.score >= game.nextLifeScore) {
    game.nextLifeScore += 5000; game.playerStats.hp = Math.min(game.playerStats.maxHp, game.playerStats.hp + 20); actions.updateHUD();
    game.lifeGainDisplay = { text: 'SCORE BONUS  HP +20', timer: 120, color: '#ff0' };
    actions.triggerFlash(255, 200, 0, 0.2); playSound('stage_clear');
  }
  actions.updateHUD();
}
