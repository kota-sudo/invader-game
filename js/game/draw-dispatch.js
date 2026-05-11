import { syncStageSelectOverlay } from '../ui/stage-select-overlay.js';
import { syncGalaxyMapOverlay } from '../ui/galaxy-map-overlay.js';

/**
 * Main draw router (state → scene). All draw helpers stay on main; passed via `d`.
 * @param {object} d
 */
export function paintFrame(d) {
  if (!d?.ctx?.save || typeof d.ctx.fillRect !== 'function') return;
  try {
    paintFrameBody(d);
  } catch (err) {
    console.error('paintFrame', err);
    drawPaintFrameFallback(d, err);
  }
}

function drawPaintFrameFallback(d, e) {
  try {
    const ctx = d.ctx;
    const W = Number(d.W) || 800;
    const H = Number(d.H) || 600;
    const canvas = ctx.canvas;
    if (canvas && typeof canvas.width === 'number') canvas.width = canvas.width;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#140814';
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = '#ff4466';
    ctx.lineWidth = 2;
    ctx.strokeRect(12, 12, Math.max(0, W - 24), Math.max(0, H - 24));
    ctx.fillStyle = '#ff99aa';
    ctx.font = 'bold 14px Orbitron,Courier New,sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('DRAW ERROR — Open console (F12)', 22, 40);
    ctx.fillStyle = '#ddeeff';
    ctx.font = '11px monospace';
    const msg = String((e && e.message) || e || '').slice(0, 400);
    for (let i = 0, y = 62; i < msg.length && y < H - 16; i += 72, y += 14) {
      ctx.fillText(msg.slice(i, i + 72), 22, y);
    }
    ctx.restore();
  } catch (_) {}
}

function paintFrameBody(d) {
  const canvasEl = typeof document !== 'undefined' ? document.getElementById('canvas') : null;
  if (canvasEl) {
    try {
      syncStageSelectOverlay(canvasEl);
      syncGalaxyMapOverlay(canvasEl);
    } catch (e) {
      console.error('paintFrame overlay sync', e);
    }
  }

  const theme = d.getTheme();
  d.ctx.save();
  if (d.shakeTimer > 0 && d.state === 'playing' && !d.paused) {
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
    const g = d.ctx.createLinearGradient(0, 0, 0, d.H);
    g.addColorStop(0, '#0c0406');
    g.addColorStop(0.42, '#120608');
    g.addColorStop(0.78, '#14060a');
    g.addColorStop(1, '#080204');
    d.ctx.fillStyle = g;
    d.ctx.fillRect(-20, -20, d.W + 40, d.H + 40);
    d.drawTitle();
    d.drawVignette();
    d.drawTitleTermBezel();
    d.drawUIButtons();
    d.drawScreenFlash();
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
  if (d.state === 'galaxy_map') {
    d.ctx.fillStyle = '#04060e';
    d.ctx.fillRect(-20, -20, d.W + 40, d.H + 40);
    d.drawStarfield();
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
    d.ctx.fillStyle = '#07090d';
    d.ctx.fillRect(-20, -20, d.W + 40, d.H + 40);
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
  if (d.state === 'synthesis') {
    d.drawStarfield();
    d.drawVignette();
    d.drawSynthesisScreen();
    d.drawUIButtons();
    d.ctx.restore();
    return;
  }
  if (d.state === 'fusion') {
    d.drawStarfield();
    d.drawVignette();
    d.drawFusionScreen();
    d.drawUIButtons();
    d.ctx.restore();
    return;
  }

  const g = d.game;
  const realFrameCount = g.frameCount;
  if (!d.paused) {
    g.pauseAnimFrame = null;
  } else if (g.pauseAnimFrame == null) {
    g.pauseAnimFrame = realFrameCount;
  }
  if (d.paused) g.frameCount = g.pauseAnimFrame;

  try {
    const drewBattleBackdrop =
      typeof d.drawBattleBackground === 'function' ? d.drawBattleBackground() : false;
    d.drawStarfield();
    // プレイ優先：星雲ティントは背景ムード用なので戦闘中は控えめ（自機・弾・敵が前面に）
    d.ctx.fillStyle = theme.nebula;
    if (drewBattleBackdrop) {
      d.ctx.globalAlpha = 0.11;
      d.ctx.fillRect(0, 0, d.W, d.H);
      d.ctx.globalAlpha = 1;
    } else {
      d.ctx.globalAlpha = 0.88;
      d.ctx.fillRect(0, 0, d.W, d.H);
      d.ctx.globalAlpha = 1;
    }
    // 戦闘中のみ背景主張を一段抑える（岩・星の情報量はそのまま、全体トーンをゲーム層に譲る）
    if (d.state === 'playing') {
      d.ctx.fillStyle = 'rgba(1, 3, 12, 0.12)';
      d.ctx.fillRect(0, 0, d.W, d.H);
    }

    d.drawAsteroids();
    d.drawMeteors();
    if (d.drawEnvGimmicks) d.drawEnvGimmicks();
    d.drawDashTrail();
    d.drawInvaders();
    d.drawHealers();
    if (d.boss) d.drawBoss();
    d.drawMiniBosses();
    d.drawBossMinions();
    if (d.ufo) d.drawUFO();
    d.drawPowerups();
    if (d.drawCoinPickups) d.drawCoinPickups();
    d.drawPlayer();
    d.drawPets();
    d.drawBullets();
    d.drawMuzzleFlashes();
    d.drawParticles();
    if (!d.paused) d.updateDamageNumbers();
    d.drawDamageNumbers();
    if (d.drawCombatPlayerVignette) d.drawCombatPlayerVignette();
    d.drawGroundLine(theme.ground);
    d.drawHUD(theme.accent);
    d.drawBossWarning(theme);
    d.drawSurvivalTimer();
    d.drawStageBanner(theme.accent);
    d.drawWaveBanner();
    d.drawLifeGainDisplay();
    d.drawLevelUpDisplay();
    d.drawEventBanner();
    if (d.drawMeteorRainEnvOverlay) d.drawMeteorRainEnvOverlay();
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
  } finally {
    if (d.paused) g.frameCount = realFrameCount;
    d.ctx.restore();
  }
}

