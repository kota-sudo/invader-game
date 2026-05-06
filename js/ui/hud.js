export function createHudController({ game, stageEl, formatStageId, syncFuel, FUEL_CAP, formatFuelMmSs, fuelNextRegenMs }) {
  return {
    updateHUD() {
      const livesHtmlEl = document.getElementById('lives');
      if (livesHtmlEl) livesHtmlEl.textContent = `${game.playerStats.hp}/${game.playerStats.maxHp}`;
      stageEl.textContent = formatStageId(game.stage);
      const c = document.getElementById('coins');
      if (c) c.textContent = game.coins;
      const g = document.getElementById('gems');
      if (g) g.textContent = game.gems;

      syncFuel();
      const f = document.getElementById('fuel');
      if (f) f.textContent = `${Math.max(0, Math.floor(game.fuel || 0))}/${FUEL_CAP}`;
      const fn = document.getElementById('fuel-next');
      if (fn) {
        if ((game.fuel || 0) >= FUEL_CAP) fn.textContent = 'FULL';
        // 「次:MM:SS」＝燃料が1つ自然回復するまでの残り時間（間隔は fuel.js の FUEL_REGEN_MS）
        else fn.textContent = `次:${formatFuelMmSs(fuelNextRegenMs())}`;
      }
    }
  };
}
