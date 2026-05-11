export function createHudController({ game, stageEl, formatStageId, syncFuel }) {
  return {
    updateHUD() {
      const curScore = game.score | 0;
      if (game._lastHudScore !== undefined && curScore > game._lastHudScore && game.state === 'playing') {
        game.hudScoreBumpUntil = game.frameCount + 18;
      }
      game._lastHudScore = curScore;

      const livesHtmlEl = document.getElementById('lives');
      if (livesHtmlEl) livesHtmlEl.textContent = `${game.playerStats.hp}/${game.playerStats.maxHp}`;
      stageEl.textContent = formatStageId(game.stage);
      const sc = document.getElementById('score');
      if (sc) sc.textContent = String(curScore);

      const hudRoot = document.getElementById('hud');
      const alertEl = document.getElementById('hud-hp-alert');
      const go = game.state === 'gameover';
      const hpDead = (game.playerStats?.hp ?? 1) <= 0;
      const playing = game.state === 'playing';
      if (hudRoot) {
        hudRoot.classList.toggle(
          'hud-hp-hurt',
          playing && (game.hudHpFlashUntil || 0) > game.frameCount,
        );
        hudRoot.classList.toggle(
          'hud-score-pop',
          playing && (game.hudScoreBumpUntil || 0) > game.frameCount,
        );
        hudRoot.classList.toggle('hud-gameover', go && hpDead);
      }
      if (alertEl) {
        if (go && hpDead) {
          alertEl.hidden = false;
          alertEl.textContent = 'DESTROYED';
        } else {
          alertEl.hidden = true;
          alertEl.textContent = '';
        }
      }

      syncFuel();
    }
  };
}
