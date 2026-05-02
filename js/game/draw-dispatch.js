/**
 * Main draw router (state → scene). All draw helpers stay on main; passed via `d`.
 * @param {object} d
 */
export function paintFrame(d) {
  const theme = d.getTheme();
  d.ctx.save();
  if (d.shakeTimer > 0 && d.state === 'playing') {
    d.ctx.translate((Math.random() - 0.5) * d.shakeIntensity, (Math.random() - 0.5) * d.shakeIntensity);
  }
  d.ctx.fillStyle = theme.bg;
  d.ctx.fillRect(-20, -20, d.W + 40, d.H + 40);

  const hudEl = document.getElementById('hud');
  const showHUD =
    d.state === 'playing' ||
    d.state === 'gameover' ||
    d.state === 'clear-stage' ||
    d.state === 'paused';
  if (hudEl) hudEl.style.display = showHUD ? 'flex' : 'none';

  if (d.state === 'title') {
    d.drawStarfield();
    d.drawTitle();
    d.drawVignette();
    d.ctx.restore();
    return;
  }
  if (d.state === 'title_warp') {
    d.drawStarfield();
    d.drawTitleWarp();
    d.drawVignette();
    d.ctx.restore();
    return;
  }
  if (d.state === 'customize') {
    d.drawStarfield();
    d.drawVignette();
    try {
      d.drawCustomizeScreen();
    } catch (e) {
      console.error('drawCustomizeScreen', e);
    }
    d.ctx.restore();
    return;
  }
  if (d.state === 'loadout') {
    d.drawStarfield();
    d.drawVignette();
    d.drawLoadoutScreen();
    d.drawUIButtons();
    d.ctx.restore();
    return;
  }
  if (d.state === 'stage_select') {
    d.drawStarfield();
    d.drawVignette();
    d.drawStageSelectScreen();
    d.drawUIButtons();
    d.ctx.restore();
    return;
  }
  if (d.state === 'map') {
    d.drawStarfield();
    d.drawVignette();
    d.drawMapScreen();
    d.drawUIButtons();
    d.ctx.restore();
    return;
  }
  if (d.state === 'shop') {
    d.drawStarfield();
    d.drawVignette();
    d.drawShopScreen();
    d.drawUIButtons();
    d.ctx.restore();
    return;
  }
  if (d.state === 'gacha') {
    d.drawStarfield();
    d.drawVignette();
    d.drawGachaScreen();
    d.drawUIButtons();
    d.drawGachaRatesModalIfOpen();
    d.ctx.restore();
    return;
  }
  if (d.state === 'gacha_result') {
    d.drawStarfield();
    d.drawGachaResult();
    d.ctx.restore();
    d.bumpGachaAnimFrame();
    return;
  }
  if (d.state === 'gacha_summary') {
    d.drawStarfield();
    d.drawVignette();
    d.drawGachaSummary();
    d.ctx.restore();
    return;
  }
  if (d.state === 'gacha_rates') {
    d.drawStarfield();
    d.drawVignette();
    d.drawGachaRates();
    d.drawUIButtons();
    d.ctx.restore();
    return;
  }
  if (d.state === 'stardust_shop') {
    d.drawStarfield();
    d.drawVignette();
    d.drawStardustShop();
    d.drawUIButtons();
    d.ctx.restore();
    return;
  }
  if (d.state === 'missions') {
    d.drawStarfield();
    d.drawVignette();
    try {
      d.drawMissionsScreen();
    } catch (e) {
      console.error('drawMissionsScreen', e);
      try { d.ctx.restore(); } catch (_) {}
    }
    d.drawUIButtons();
    d.ctx.restore();
    return;
  }
  if (d.state === 'mode_select') {
    d.drawStarfield();
    d.drawVignette();
    d.drawModeSelectScreen();
    d.drawUIButtons();
    d.ctx.restore();
    return;
  }
  if (d.state === 'boss_select') {
    d.drawStarfield();
    d.drawVignette();
    d.drawBossSelectScreen();
    d.drawUIButtons();
    d.ctx.restore();
    return;
  }
  if (d.state === 'stage_result') {
    d.drawStarfield();
    d.drawVignette();
    d.drawStageResult();
    d.ctx.restore();
    return;
  }
  if (d.state === 'settings') {
    d.drawStarfield();
    d.drawSettingsScreen();
    d.drawUIButtons();
    d.ctx.restore();
    return;
  }
  if (d.state === 'notifications') {
    d.drawStarfield();
    d.drawNotificationsScreen();
    d.drawUIButtons();
    d.ctx.restore();
    return;
  }
  if (d.state === 'inbox') {
    d.drawStarfield();
    d.drawInboxScreen();
    d.drawUIButtons();
    d.ctx.restore();
    return;
  }
  if (d.state === 'events') {
    d.drawStarfield();
    d.drawEventsScreen();
    d.drawUIButtons();
    d.ctx.restore();
    return;
  }
  if (d.state === 'iap') {
    d.drawStarfield();
    d.drawIAPScreen();
    d.drawUIButtons();
    d.ctx.restore();
    return;
  }

  d.drawStarfield();
  d.ctx.fillStyle = theme.nebula;
  d.ctx.fillRect(0, 0, d.W, d.H);

  d.drawAsteroids();
  d.drawMeteors();
  if (d.escortShip) d.drawEscortShip();
  d.drawDashTrail();
  d.drawInvaders();
  d.drawHealers();
  if (d.boss) d.drawBoss();
  d.drawMiniBosses();
  d.drawBossMinions();
  if (d.ufo) d.drawUFO();
  d.drawPowerups();
  d.drawPlayer();
  d.drawPets();
  d.drawBullets();
  d.drawMuzzleFlashes();
  d.drawParticles();
  d.updateDamageNumbers();
  d.drawDamageNumbers();
  d.drawGroundLine(theme.ground);
  d.drawHUD(theme.accent);
  d.drawBossWarning(theme);
  d.drawSurvivalTimer();
  d.drawStageBanner(theme.accent);
  d.drawWaveBanner();
  d.drawLifeGainDisplay();
  d.drawLevelUpDisplay();
  if (d.skillChoices) d.drawSkillChoice();
  d.drawEventBanner();
  d.drawMatPopups();
  if (d.stageClearAnimTimer > 0) d.drawStageClearAnim();
  d.drawJoystick();
  d.drawHitFlash();
  d.drawScreenFlash();
  d.drawVignette();
  d.drawCriticalVignette();
  d.drawScanlines();
  if (d.paused) d.drawPauseOverlay();
  if (d.state === 'gameover') d.drawGameOverOverlay();
  d.ctx.restore();
}
