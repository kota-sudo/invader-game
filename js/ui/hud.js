function buildHudCombatStatus(game) {
  if (game.state !== 'playing') return '';
  const parts = [];
  if ((game.combo || 0) >= 2) parts.push(`COMBO ×${game.combo}`);
  const pu = game.powerupActive;
  if (pu === 'double') parts.push('2x SHOT');
  else if (pu === 'invincible') parts.push('SHIELD');
  else if (pu === 'wide') parts.push('WIDE');
  return parts.join(' · ');
}

export function createHudController({ game, stageEl, formatStageId, syncFuel, FUEL_CAP, formatFuelMmSs, fuelNextRegenMs }) {
  return {
    updateHUD() {
      const livesHtmlEl = document.getElementById('lives');
      if (livesHtmlEl) livesHtmlEl.textContent = `${game.playerStats.hp}/${game.playerStats.maxHp}`;
      stageEl.textContent = formatStageId(game.stage);
      const sc = document.getElementById('score');
      if (sc) sc.textContent = String(game.score | 0);
      const c = document.getElementById('coins');
      if (c) c.textContent = game.coins;
      const g = document.getElementById('gems');
      if (g) g.textContent = game.gems;

      const statusEl = document.getElementById('hud-status');
      if (statusEl) statusEl.textContent = buildHudCombatStatus(game);

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
