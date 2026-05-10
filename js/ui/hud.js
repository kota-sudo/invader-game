export function createHudController({ game, stageEl, formatStageId, syncFuel }) {
  return {
    updateHUD() {
      const livesHtmlEl = document.getElementById('lives');
      if (livesHtmlEl) livesHtmlEl.textContent = `${game.playerStats.hp}/${game.playerStats.maxHp}`;
      stageEl.textContent = formatStageId(game.stage);
      const sc = document.getElementById('score');
      if (sc) sc.textContent = String(game.score | 0);
      syncFuel();
    }
  };
}
