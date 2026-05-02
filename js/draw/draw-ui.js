/**
 * UI drawing functions separated from main.js
 * Contains HUD, overlays, buttons, and other UI elements
 */

import { game } from '../game/game-store.js';
import { CANVAS_W as W, CANVAS_H as H, POWERUP_DURATION } from '../game/constants.js';
import { ACHIEVEMENT_DEFS, EXP_TABLE, STAGE_TYPE_LABELS, WEAPON_COLOR, WEAPON_LABEL } from '../game-data.js';

let drawDeps;
let ctx;
let currentWeapon;
let DASH_COOLDOWN;
let ULTIMATE_MAX;
let getPlanet;
let getWaveCount;
let getTheme;
let UI_BUTTONS;
let drawInvaderSprite;

export function setDrawDependencies(deps) {
  drawDeps = deps;
  ctx = deps.ctx;
  ({
    currentWeapon,
    DASH_COOLDOWN,
    ULTIMATE_MAX,
    getPlanet,
    getWaveCount,
    getTheme,
    UI_BUTTONS,
    drawInvaderSprite,
  } = deps);
}

function drawUIButtons() {
  const ctx = drawDeps.ctx;
  const btns = UI_BUTTONS[game.state];
  if (!btns) return;
  const hasBack = btns.some(b => b.id === 'back' || b.id === 'close');
  btns.forEach(btn => {
    const x = btn.x || 0, y = btn.y || 0, w = btn.w || 80, h = btn.h || 30;
    const hovered = game.hoveredBtn === btn;
    const isBack = btn.id === 'back' || btn.id === 'close';
    const col = isBack ? '#ff8844' : '#0cf';
    ctx.shadowColor = col; ctx.shadowBlur = hovered ? 18 : 8;
    ctx.fillStyle = hovered ? (isBack ? 'rgba(80,30,0,0.97)' : 'rgba(0,80,120,0.97)') : (isBack ? 'rgba(40,12,0,0.92)' : 'rgba(0,40,70,0.92)');
    ctx.strokeStyle = hovered ? col : (isBack ? 'rgba(180,80,0,0.7)' : '#0a6080');
    ctx.lineWidth = hovered ? 2 : 1;
    ctx.beginPath(); ctx.roundRect(x, y, w, h, 8); ctx.fill(); ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = hovered ? '#fff' : col; ctx.font = 'bold 11px Orbitron,Courier New'; ctx.textAlign = 'center';
    ctx.fillText(btn.label, x + w / 2, y + h / 2 + 4);
    ctx.textAlign = 'left';
  });
}

function drawPauseOverlay() {
  const ctx = drawDeps.ctx;
  ctx.fillStyle = 'rgba(0,0,0,0.78)'; ctx.fillRect(0, 0, W, H);
  const cx = W / 2;
  const pAccent = getTheme().accent;
  ctx.shadowColor = pAccent; ctx.shadowBlur = 30;
  ctx.fillStyle = '#fff'; ctx.font = 'bold 40px Orbitron,Courier New'; ctx.textAlign = 'center';
  ctx.fillText('PAUSED', cx, 120); ctx.shadowBlur = 0;
  ctx.fillStyle = '#556'; ctx.font = '11px Orbitron,Courier New';
  ctx.fillText('ESC / P to resume', cx, 148);

  const hpRatio = game.playerStats?.maxHp > 0 ? game.playerStats.hp / game.playerStats.maxHp : 1;
  const hpColor = hpRatio > 0.5 ? '#00ff88' : hpRatio > 0.25 ? '#ffaa00' : '#ff3333';
  ctx.fillStyle = '#111'; ctx.beginPath(); ctx.roundRect(cx - 160, 168, 320, 14, 4); ctx.fill();
  ctx.fillStyle = hpColor; ctx.shadowColor = hpColor; ctx.shadowBlur = 8;
  ctx.beginPath(); ctx.roundRect(cx - 160, 168, 320 * Math.max(0, Math.min(1, hpRatio)), 14, 4); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#ccc'; ctx.font = '11px Orbitron,Courier New'; ctx.textAlign = 'center';
  ctx.fillText(`HP  ${game.playerStats?.hp ?? 0} / ${game.playerStats?.maxHp ?? 0}`, cx, 194);

  const stats = [
    { l: 'ATK', v: `×${(game.playerStats?.atk ?? 1).toFixed(2)}`, c: '#ff8844' },
    { l: 'DEF', v: `${game.playerStats?.def ?? 0}%`, c: '#44aaff' },
    { l: 'CRIT', v: `${game.playerStats?.crit ?? 0}%`, c: '#ffdd00' },
    { l: 'SPD', v: `+${game.playerStats?.spd ?? 0}`, c: '#88ffcc' },
  ];
  stats.forEach((s, i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const bx = cx - 158 + col * 162, by = 210 + row * 48;
    ctx.fillStyle = '#111'; ctx.beginPath(); ctx.roundRect(bx, by, 150, 38, 5); ctx.fill();
    ctx.strokeStyle = '#1a2a1a'; ctx.lineWidth = 1; ctx.beginPath(); ctx.roundRect(bx, by, 150, 38, 5); ctx.stroke();
    ctx.fillStyle = '#445'; ctx.font = '10px Orbitron,Courier New'; ctx.textAlign = 'left';
    ctx.fillText(s.l, bx + 10, by + 14);
    ctx.fillStyle = s.c; ctx.shadowColor = s.c; ctx.shadowBlur = 5;
    ctx.font = 'bold 15px Orbitron,Courier New'; ctx.textAlign = 'right';
    ctx.fillText(s.v, bx + 140, by + 28); ctx.shadowBlur = 0;
  });

  ctx.fillStyle = '#334'; ctx.font = '11px Orbitron,Courier New'; ctx.textAlign = 'center';
  ctx.fillText(`STAGE ${game.stage}  ·  SCORE ${game.score}  ·  COMBO ${game.combo}`, cx, 432);
  ctx.textAlign = 'left';
}

function drawGameOverOverlay() {
  const ctx = drawDeps.ctx;
  game._gameoverHits = [];
  const cx = W / 2, y0 = Math.floor(H * 0.38);
  ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#f00'; ctx.font = 'bold 36px Orbitron,Courier New'; ctx.textAlign = 'center';
  ctx.fillText('GAME OVER', cx, y0);
  ctx.fillStyle = '#aaa'; ctx.font = '16px Orbitron,Courier New';
  ctx.fillText(`Stage ${game.stage}`, cx, y0 + 40);
  ctx.fillText(`Score ${game.score}`, cx, y0 + 65);
  ctx.fillText('Press ENTER to continue', cx, y0 + 100);
}

function drawCriticalVignette() {
  const ctx = drawDeps.ctx;
  const ratio = game.playerStats?.maxHp > 0 ? game.playerStats.hp / game.playerStats.maxHp : 1;
  if (ratio >= 0.3) return;
  const danger = (0.3 - ratio) / 0.3;
  const alpha = 0.15 + danger * 0.35 + Math.sin(game.frameCount * 0.2) * 0.08;
  const grad = ctx.createRadialGradient(W / 2, H / 2, H * 0.25, W / 2, H / 2, H * 0.85);
  grad.addColorStop(0, 'rgba(255,0,0,0)');
  grad.addColorStop(1, `rgba(255,0,0,${alpha})`);
  ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);
}

function drawJoystick() {
  const ctx = drawDeps.ctx;
  if (!game.joystick?.active) return;
  const cx = game.joystick.baseX ?? game.joystick.cx, cy = game.joystick.baseY ?? game.joystick.cy;
  const dx = game.joystick.dx, dy = game.joystick.dy;
  const JR = 65;
  ctx.save();
  ctx.globalAlpha = 0.62;
  ctx.strokeStyle = 'rgba(0,220,255,0.9)'; ctx.lineWidth = 2;
  ctx.shadowColor = '#00ccff'; ctx.shadowBlur = 10;
  ctx.beginPath(); ctx.arc(cx, cy, JR, 0, Math.PI * 2); ctx.stroke();
  ctx.globalAlpha = 0.28; ctx.fillStyle = 'rgba(0,120,180,0.45)';
  ctx.beginPath(); ctx.arc(cx, cy, JR, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 0.8; ctx.fillStyle = 'rgba(0,255,255,0.7)';
  ctx.beginPath(); ctx.arc(cx + dx, cy + dy, 22, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawSkillChoice() {
  const ctx = drawDeps.ctx;
  if (!game.skillChoices) return;
  ctx.fillStyle = 'rgba(0,0,0,0.72)'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#ffdd00'; ctx.shadowColor = '#ffdd00'; ctx.shadowBlur = 20;
  ctx.font = 'bold 18px Orbitron,Courier New'; ctx.textAlign = 'center';
  ctx.fillText(`LEVEL UP!  LV.${game.playerLevel}  —  スキルを選択`, W / 2, H / 2 - 120);
  ctx.shadowBlur = 0;
  if (!Array.isArray(game._skillChoiceHits)) game._skillChoiceHits = [];
  game._skillChoiceHits = [];
  game.skillChoices.forEach((sk, i) => {
    const bx = W / 2 - 310 + i * 212, by = H / 2 - 90, bw = 200, bh = 200;
    game._skillChoiceHits.push({ idx: i, x: bx, y: by, w: bw, h: bh });
    ctx.fillStyle = 'rgba(8,8,20,0.95)'; ctx.strokeStyle = sk.color; ctx.lineWidth = 2;
    ctx.shadowColor = sk.color; ctx.shadowBlur = 16;
    ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 12); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;
    ctx.fillStyle = sk.color; ctx.font = 'bold 28px Orbitron,Courier New'; ctx.textAlign = 'center';
    ctx.fillText(`[${i + 1}]`, bx + bw / 2, by + 36);
    ctx.save(); ctx.globalAlpha = 0.18; ctx.fillStyle = sk.color;
    ctx.beginPath(); ctx.arc(bx + bw / 2, by + 90, 44, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    ctx.fillStyle = sk.color; ctx.shadowColor = sk.color; ctx.shadowBlur = 10;
    ctx.font = 'bold 14px Orbitron,Courier New'; ctx.fillText(sk.label, bx + bw / 2, by + 106); ctx.shadowBlur = 0;
    ctx.fillStyle = '#aaa'; ctx.font = '11px Orbitron,Courier New';
    ctx.fillText(sk.desc, bx + bw / 2, by + 130);
    const pulse = 0.7 + Math.sin(game.frameCount * 0.1 + i) * 0.3;
    ctx.save(); ctx.globalAlpha = pulse * 0.4; ctx.strokeStyle = sk.color; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(bx + 4, by + 4, bw - 8, bh - 8, 10); ctx.stroke(); ctx.restore();
  });
}

function drawScreenFlash() {
  const ctx = drawDeps.ctx;
  if (!game.screenFlash) return;
  ctx.fillStyle = `rgba(${game.screenFlash.r},${game.screenFlash.g},${game.screenFlash.b},${game.screenFlash.alpha})`;
  ctx.fillRect(0, 0, W, H);
  game.screenFlash.alpha -= game.screenFlash.decay;
  if (game.screenFlash.alpha <= 0) game.screenFlash = null;
}

function drawVignette() {
  const ctx = drawDeps.ctx;
  const grad = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.82);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(1, 'rgba(0,0,0,0.55)');
  ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);
}

function drawStarfield() {
  const ctx = drawDeps.ctx;
  const isTitleFull = game.state === 'title' && game.titleBgQuality === 'full';
  for (const s of game.stars) {
    const tw = 0.4 + Math.sin(s.twinkle) * 0.6;
    ctx.globalAlpha = isTitleFull ? Math.min(1, tw * (0.55 + (s.layer || 1) * 0.22)) : tw * (0.4 + (s.layer || 1) * 0.18);
    ctx.fillStyle = isTitleFull ? ((s.layer || 1) >= 2 ? '#ddf' : '#fff') : ((s.layer || 1) >= 2 ? '#aaf' : '#fff');
    ctx.fillRect(s.x, s.y, s.size, s.size);
  }
  ctx.globalAlpha = 1;
}

function drawTitleDistantSilhouette(t) {
  const ctx = drawDeps.ctx;
  if (game.titleBgQuality !== 'full') return;
  if (game.state === 'title_warp') return;
  ctx.save();
  ctx.globalAlpha = 0.15;
  ctx.fillStyle = '#001122';
  // Simplified distant silhouette
  for (let i = 0; i < 5; i++) {
    const x = i * 200 + Math.sin(t + i) * 20, y = H * 0.6 + Math.cos(t * 0.7 + i) * 10;
    ctx.fillRect(x, y, 150, 200);
  }
  ctx.restore();
}

function drawTitlePlanets(t) {
  const ctx = drawDeps.ctx;
  if (game.titleBgQuality !== 'full') return;
  // Saturn
  const px = W * 0.22 + Math.sin(t * 0.10) * 3;
  const py = H * 0.35 + Math.cos(t * 0.08) * 2;
  const grad = ctx.createRadialGradient(px, py, 0, px, py, 60);
  grad.addColorStop(0, '#ccbbaa');
  grad.addColorStop(1, 'rgba(204,187,170,0)');
  ctx.fillStyle = grad; ctx.fillRect(px - 60, py - 60, 120, 120);
  // Ring
  ctx.strokeStyle = 'rgba(204,187,170,0.3)'; ctx.lineWidth = 8;
  ctx.beginPath(); ctx.ellipse(px, py, 80, 20, Math.PI * 0.1, 0, Math.PI * 2); ctx.stroke();
}

function drawTitleWarp() {
  const ctx = drawDeps.ctx;
  const total = 48;
  const warpEnd = 42;
  const p = Math.min(1, game.titleWarpTimer / total);
  const intensity = p * p;
  ctx.fillStyle = `rgba(100,200,255,${intensity * 0.3})`;
  ctx.fillRect(0, 0, W, H);
  // Warp lines
  ctx.strokeStyle = `rgba(255,255,255,${intensity})`; ctx.lineWidth = 2;
  for (let i = 0; i < 20; i++) {
    const y = (i / 20) * H;
    const offset = p * 100;
    ctx.beginPath(); ctx.moveTo(0, y);
    ctx.lineTo(offset, y);
    ctx.stroke();
  }
}

function drawTitle() {
  const ctx = drawDeps.ctx;
  const t = Date.now() / 1000;
  const cx = W / 2, titleY = H / 2 - 120;
  const bgFull = game.titleBgQuality === 'full';

  // Background elements
  if (bgFull) {
    drawTitleDistantSilhouette(t);
    drawTitlePlanets(t);
  }

  ctx.shadowColor = '#ff4422'; ctx.shadowBlur = 30;
  ctx.fillStyle = '#ff8855'; ctx.font = 'bold 42px Orbitron,Courier New'; ctx.textAlign = 'center';
  ctx.fillText('PLANET SHOOTING', cx, titleY); ctx.shadowBlur = 0;
  ctx.fillStyle = '#ff6633'; ctx.font = '11px Orbitron,Courier New';
  ctx.fillText('惑星をめぐり敵を倒せ', cx, titleY + 25);
  ctx.font = '15px Orbitron,Courier New'; ctx.fillStyle = '#ffff44';
  ctx.shadowColor = '#ff0'; ctx.shadowBlur = 10;
  ctx.fillText(`HI-SCORE  ${game.hiScore || 0}`, cx, titleY + 48); ctx.shadowBlur = 0;
  if ((game.hiScores || []).length > 1) {
    ctx.fillStyle = '#666'; ctx.font = '10px Orbitron,Courier New';
    game.hiScores.slice(0, 5).forEach((s, i) => {
      ctx.fillStyle = i === 0 ? '#ff0' : i === 1 ? '#aaa' : i === 2 ? '#c84' : '#555';
      ctx.fillText(`${i + 1}. ${s}`, cx - 60 + i * 30, titleY + 68);
    });
  }
  ctx.fillStyle = '#88ff88'; ctx.font = '13px Orbitron,Courier New';
  ctx.fillText('← → ↑ ↓  MOVE    Z/SPACE  FIRE (hold=CHARGE)    Q  WEAPON', cx, H / 2 - 20);
  ctx.fillText('SHIFT  DASH', cx, H / 2 + 4);
  if (Math.sin(t * 3) > 0) {
    ctx.fillStyle = '#fff'; ctx.shadowColor = '#fff'; ctx.shadowBlur = 15;
    ctx.font = 'bold 20px Orbitron,Courier New';
    ctx.fillText('SPACE :  CUSTOMIZE  &  START', cx, H / 2 + 46); ctx.shadowBlur = 0;
  }
  ctx.fillStyle = '#44bbff'; ctx.font = '12px Orbitron,Courier New';
  ctx.fillText('DEFEAT ENEMIES → BOSS → ROUTE SELECT → NEXT STAGE', cx, H / 2 + 82);
  ctx.fillText('MARS → VENUS → JUPITER → SATURN  /  BOSS ENCOUNTERS', cx, H / 2 + 104);
  [0, 1, 2].forEach(i => {
    const bob = Math.sin(t * 2 + i) * 4;
    drawInvaderSprite(ctx, cx - 80 + i * 50, H / 2 + 145 + bob, Math.floor(t * 2) % 2, i);
  });
  const unlocked = ACHIEVEMENT_DEFS.filter(d => game.achievements?.[d.id]);
  if (unlocked.length > 0) {
    ctx.fillStyle = '#444'; ctx.font = '10px Orbitron,Courier New'; ctx.textAlign = 'center';
    ctx.fillText(`ACHIEVEMENTS  ${unlocked.length} / ${ACHIEVEMENT_DEFS.length}`, cx, H / 2 + 188);
  }
  if ((game.highestStage || 1) > 1) {
    ctx.fillStyle = '#555'; ctx.font = '10px Orbitron,Courier New'; ctx.textAlign = 'right';
    ctx.fillText(`BEST STAGE: ${game.highestStage}`, W - 12, H - 8);
  }
  ctx.textAlign = 'left';
}

function updateDamageNumbers() {
  for (let i = game.damageNumbers.length - 1; i >= 0; i--) {
    const d = game.damageNumbers[i];
    d.y += d.vy; d.vy *= 0.94; d.timer--;
    if (d.timer <= 0) game.damageNumbers.splice(i, 1);
  }
}

function drawDamageNumbers() {
  ctx.textAlign = 'center';
  for (const d of game.damageNumbers) {
    const a = Math.min(1, d.timer / 20);
    const scale = d.isCrit ? (d.timer > 45 ? 1 + (55 - d.timer) * 0.08 : 1) : 1;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.translate(d.x, d.y);
    if (scale !== 1) ctx.scale(scale, scale);
    const col = d.isHeal ? '#00ff88' : d.isCrit ? '#ff4444' : '#ffffff';
    ctx.shadowColor = col; ctx.shadowBlur = d.isCrit ? 12 : 6;
    ctx.fillStyle = col;
    ctx.font = `bold ${d.isCrit ? 18 : 13}px Orbitron,Courier New`;
    ctx.fillText(d.isCrit ? `${d.val}!!` : String(d.val), 0, 0);
    ctx.shadowBlur = 0; ctx.restore();
  }
  ctx.textAlign = 'left';
}

function drawParticles() {
  game.particles.forEach(p => {
    ctx.globalAlpha = p.life; ctx.shadowColor = p.color; ctx.shadowBlur = 6; ctx.fillStyle = p.color;
    ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
  });
  ctx.globalAlpha = 1; ctx.shadowBlur = 0;
}

function drawGroundLine(color) {
  const glow = 4 + Math.sin(game.groundPulse) * 2;
  ctx.shadowColor = color; ctx.shadowBlur = glow * 3; ctx.strokeStyle = color; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(0, H - 30); ctx.lineTo(W, H - 30); ctx.stroke();
  ctx.shadowBlur = 0;
}

function drawHUD(accent) {
  // ── ボトムバー背景 (y = H-52 to H-4) ──
  const BAR_Y = H - 52, BAR_H = 48;
  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  ctx.fillRect(0, BAR_Y, W, BAR_H);
  ctx.strokeStyle = 'rgba(255,255,255,0.06)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(0, BAR_Y); ctx.lineTo(W, BAR_Y); ctx.stroke();

  // ── 左: HPバー ──
  const hpRatio = game.playerStats.maxHp > 0 ? game.playerStats.hp / game.playerStats.maxHp : 0;
  const hpCol = hpRatio > 0.5 ? '#00ff88' : hpRatio > 0.25 ? '#ffaa00' : '#ff3344';
  ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.beginPath(); ctx.roundRect(8, BAR_Y + 8, 180, 10, 3); ctx.fill();
  ctx.shadowColor = hpCol; ctx.shadowBlur = 6;
  ctx.fillStyle = hpCol; ctx.beginPath(); ctx.roundRect(8, BAR_Y + 8, Math.max(0, 180 * hpRatio), 10, 3); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#aaa'; ctx.font = '9px Orbitron,Courier New'; ctx.textAlign = 'left';
  ctx.fillText(`HP  ${game.playerStats.hp} / ${game.playerStats.maxHp}`, 8, BAR_Y + 32);

  // ── 中央: ULTゲージ ──
  const uRatio = game.ultimateGauge / ULTIMATE_MAX;
  const uReady = game.ultimateGauge >= ULTIMATE_MAX;
  const uCol = uReady ? '#ffdd00' : '#ff8833';
  const UX = W / 2 - 90, UW = 180;
  ctx.fillStyle = 'rgba(255,120,0,0.1)'; ctx.beginPath(); ctx.roundRect(UX, BAR_Y + 8, UW, 10, 3); ctx.fill();
  ctx.shadowColor = uCol; ctx.shadowBlur = uReady ? 14 : 3;
  ctx.fillStyle = uCol; ctx.beginPath(); ctx.roundRect(UX, BAR_Y + 8, UW * uRatio, 10, 3); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = uCol; ctx.font = '9px Orbitron,Courier New'; ctx.textAlign = 'center';
  if (uReady) {
    ctx.globalAlpha = 0.6 + Math.sin(game.frameCount * 0.25) * 0.4;
    ctx.shadowColor = uCol; ctx.shadowBlur = 10;
    ctx.fillText('★ E : ULTIMATE READY ★', W / 2, BAR_Y + 32);
    ctx.shadowBlur = 0; ctx.globalAlpha = 1;
  } else {
    ctx.fillStyle = '#666';
    ctx.fillText(`ULT  ${Math.floor(uRatio * 100)}%`, W / 2, BAR_Y + 32);
  }

  // ── 右: 武器 + ダッシュ ──
  const w = currentWeapon(), wcol = WEAPON_COLOR[w];
  const ammo = w === 'normal' ? '∞' : game.weaponAmmo[w];
  ctx.shadowColor = wcol; ctx.shadowBlur = 6; ctx.fillStyle = wcol;
  ctx.font = 'bold 12px Orbitron,Courier New'; ctx.textAlign = 'right';
  ctx.fillText(`[${WEAPON_LABEL[w]}]  ${ammo}`, W - 8, BAR_Y + 18);
  ctx.shadowBlur = 0;
  // ダッシュ
  if (game.dashCooldown > 0) {
    ctx.fillStyle = 'rgba(100,180,255,0.25)'; ctx.beginPath(); ctx.roundRect(W - 104, BAR_Y + 24, 96, 7, 2); ctx.fill();
    ctx.fillStyle = '#4af'; ctx.shadowColor = '#4af'; ctx.shadowBlur = 4;
    ctx.beginPath(); ctx.roundRect(W - 104, BAR_Y + 24, 96 * (1 - game.dashCooldown / DASH_COOLDOWN), 7, 2); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#4af'; ctx.font = '9px Orbitron,Courier New'; ctx.textAlign = 'right';
    ctx.fillText('DASH', W - 8, BAR_Y + 40);
  } else {
    ctx.fillStyle = '#4af'; ctx.font = '9px Orbitron,Courier New'; ctx.textAlign = 'right';
    ctx.shadowColor = '#4af'; ctx.shadowBlur = 4;
    ctx.fillText('DASH  READY', W - 8, BAR_Y + 40);
    ctx.shadowBlur = 0;
  }

  // ── 最下部: EXPストリップ (4px) ──
  const expRatio = game.playerLevel >= 10 ? 1 : (game.exp / (EXP_TABLE[Math.min(game.playerLevel, EXP_TABLE.length - 1)] || 1));
  ctx.fillStyle = 'rgba(255,220,0,0.15)'; ctx.fillRect(0, H - 4, W, 4);
  ctx.shadowColor = '#ff0'; ctx.shadowBlur = 4;
  ctx.fillStyle = '#dd0'; ctx.fillRect(0, H - 4, W * expRatio, 4);
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#886'; ctx.font = '9px Orbitron,Courier New'; ctx.textAlign = 'center';
  ctx.fillText(`LV.${game.playerLevel}`, W / 2, H - 14);

  // パワーアップ (バーの上)
  if (game.powerupActive) {
    const pcol = { double: '#ff0', invincible: '#0ff', wide: '#f0f' }[game.powerupActive];
    const plabel = { double: '2x SHOT', invincible: 'SHIELD', wide: 'WIDE' }[game.powerupActive];
    ctx.shadowColor = pcol; ctx.shadowBlur = 8; ctx.fillStyle = pcol;
    ctx.font = '11px Orbitron,Courier New'; ctx.textAlign = 'right';
    ctx.fillText(`[${plabel}]`, W - 8, BAR_Y - 22);
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.beginPath(); ctx.roundRect(W - 104, BAR_Y - 14, 96, 6, 2); ctx.fill();
    ctx.fillStyle = pcol; ctx.beginPath(); ctx.roundRect(W - 104, BAR_Y - 14, 96 * (game.powerupTimer / POWERUP_DURATION), 6, 2); ctx.fill();
    ctx.shadowBlur = 0; ctx.textAlign = 'left';
  }

  // コンボ
  if (game.comboDisplay) {
    ctx.globalAlpha = Math.min(1, game.comboDisplay.timer / 20);
    ctx.shadowColor = '#ff0'; ctx.shadowBlur = 10;
    ctx.fillStyle = '#ff0'; ctx.font = 'bold 16px Orbitron,Courier New'; ctx.textAlign = 'center';
    ctx.fillText(game.comboDisplay.text, game.comboDisplay.x, game.comboDisplay.y);
    ctx.textAlign = 'left'; ctx.shadowBlur = 0; ctx.globalAlpha = 1;
  }

  // ボスまでカウンター
  if (game.bossPhase) {
    const pulse = Math.sin(game.frameCount * 0.1) * 0.3 + 0.7;
    ctx.globalAlpha = pulse; ctx.shadowColor = '#f44'; ctx.shadowBlur = 15;
    ctx.fillStyle = '#f44'; ctx.font = 'bold 14px Orbitron,Courier New'; ctx.textAlign = 'center';
    const bossLabel = game.stageType === 'boss_rush' ? `!! BOSS  ${game.bossRushCount + 1}/${game.bossRushMax} !!` : '!! BOSS !!';
    ctx.fillText(bossLabel, W / 2, 22); ctx.shadowBlur = 0; ctx.textAlign = 'left'; ctx.globalAlpha = 1;
    if (game.healers.filter(h => h.alive).length > 0) {
      ctx.fillStyle = '#0f0'; ctx.font = '12px Orbitron,Courier New'; ctx.textAlign = 'center';
      ctx.fillText('▲ HEALERS INCOMING ▲', W / 2, 40); ctx.textAlign = 'left';
    }
  } else {
    ctx.textAlign = 'right';
    if (game.stageType === 'normal' || game.stageType === 'escort') {
      const maxWave = getWaveCount();
      const alive = game.invaders.filter(i => i.alive).length;
      ctx.fillStyle = accent; ctx.font = '12px Orbitron,Courier New';
      ctx.fillText(`WAVE ${game.waveNum}/${maxWave}  ×${alive}`, W - 8, 22);
    } else if (game.stageType === 'survival') {
      const sec = Math.ceil(game.survivalTimer / 60);
      ctx.fillStyle = '#0ff'; ctx.font = '12px Orbitron,Courier New';
      ctx.fillText(`SURVIVE: ${sec}s`, W - 8, 22);
    }
    ctx.textAlign = 'left';
    if (game.isAsteroidStage) {
      ctx.fillStyle = '#888'; ctx.font = '10px Orbitron,Courier New'; ctx.textAlign = 'right';
      ctx.fillText('☄ ASTEROID STAGE', W - 8, 38); ctx.textAlign = 'left';
    }
  }
  ctx.textAlign = 'left';

  // ── MENUボタン（右上）──
  const MBX = W - 50, MBY = 6, MBW = 44, MBH = 22;
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.beginPath(); ctx.roundRect(MBX, MBY, MBW, MBH, 4); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.roundRect(MBX, MBY, MBW, MBH, 4); ctx.stroke();
  ctx.fillStyle = '#aac'; ctx.font = 'bold 10px Orbitron,Courier New'; ctx.textAlign = 'center';
  ctx.fillText('≡ MENU', MBX + MBW / 2, MBY + 15);
  ctx.textAlign = 'left';
  game._menuBtnHit = { x: MBX, y: MBY, w: MBW, h: MBH };
}

function drawLifeGainDisplay() {
  if (!game.lifeGainDisplay) return;
  const a = Math.min(1, game.lifeGainDisplay.timer / 20);
  ctx.globalAlpha = a; ctx.shadowColor = game.lifeGainDisplay.color; ctx.shadowBlur = 20;
  ctx.fillStyle = game.lifeGainDisplay.color; ctx.font = 'bold 22px Orbitron,Courier New'; ctx.textAlign = 'center';
  ctx.fillText(game.lifeGainDisplay.text, W / 2, H / 2 - 20);
  ctx.shadowBlur = 0; ctx.textAlign = 'left'; ctx.globalAlpha = 1;
}

function drawLevelUpDisplay() {
  if (!game.levelUpDisplay) return;
  const a = Math.min(1, game.levelUpDisplay.timer / 20);
  ctx.globalAlpha = a; ctx.shadowColor = '#ff0'; ctx.shadowBlur = 25;
  ctx.fillStyle = '#ff0'; ctx.font = 'bold 26px Orbitron,Courier New'; ctx.textAlign = 'center';
  ctx.fillText(game.levelUpDisplay.text, W / 2, H / 2 - 50);
  ctx.shadowBlur = 0; ctx.textAlign = 'left'; ctx.globalAlpha = 1;
}

function drawEventBanner() {
  if (!game.currentEvent || game.eventTimer <= 0) return;
  const pulse = Math.sin(game.frameCount * 0.15) * 0.3 + 0.7;
  ctx.globalAlpha = pulse * 0.9; ctx.fillStyle = game.currentEvent.color;
  ctx.font = 'bold 18px Orbitron,Courier New'; ctx.textAlign = 'center';
  ctx.shadowColor = game.currentEvent.color; ctx.shadowBlur = 15;
  ctx.fillText(game.currentEvent.label, W / 2, H - 100);
  ctx.shadowBlur = 0; ctx.textAlign = 'left'; ctx.globalAlpha = 1;
}

function drawMatPopups() {
  if (!game.matPopups.length) return;
  ctx.textAlign = 'center';
  for (const p of game.matPopups) {
    const a = p.timer / 55;
    ctx.globalAlpha = Math.min(1, a * 2);
    ctx.font = 'bold 14px Orbitron,Courier New';
    ctx.shadowColor = '#fff'; ctx.shadowBlur = 8;
    ctx.fillStyle = '#fff';
    ctx.fillText(p.text, p.x, p.y);
    ctx.shadowBlur = 0;
  }
  ctx.globalAlpha = 1; ctx.textAlign = 'left';
}

function drawStageClearAnim() {
  const t = game.stageClearAnimTimer;
  const prog = 1 - (t / 80);
  const flashAlpha = t > 60 ? (t - 60) / 20 * 0.8 : t < 15 ? t / 15 * 0.5 : 0.5;
  ctx.fillStyle = `rgba(0,255,120,${flashAlpha * 0.18})`; ctx.fillRect(0, 0, W, H);
  const textAlpha = t > 60 ? 0 : (t < 50 && t > 10) ? (50 - t) / 40 : 0;
  if (textAlpha > 0) {
    ctx.save();
    ctx.globalAlpha = textAlpha;
    ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(0, H / 2 - 60, W, 120);
    ctx.shadowColor = '#00ff88'; ctx.shadowBlur = 40;
    ctx.fillStyle = '#fff'; ctx.font = 'bold 52px Orbitron,Courier New'; ctx.textAlign = 'center';
    ctx.fillText('STAGE  CLEAR!', W / 2, H / 2 + 18);
    ctx.shadowBlur = 0;
    ctx.restore();
  }
  // border flash
  if (t > 55) {
    ctx.strokeStyle = `rgba(0,255,120,${(t - 55) / 25})`; ctx.lineWidth = 6;
    ctx.strokeRect(3, 3, W - 6, H - 6); ctx.lineWidth = 1;
  }
  ctx.textAlign = 'left';
}

function drawBossWarning(theme) {
  if (game.bossWarningTimer <= 0) return;
  const t = game.bossWarningTimer, pulse = Math.sin(t * 0.25) * 0.5 + 0.5;
  ctx.strokeStyle = `rgba(255,30,30,${pulse * 0.9})`; ctx.lineWidth = 8;
  ctx.strokeRect(4, 4, W - 8, H - 8); ctx.lineWidth = 1;
  if (t > 40) {
    ctx.globalAlpha = pulse * 0.9;
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(0, H / 2 - 70, W, 140);
    ctx.shadowColor = '#ff0000'; ctx.shadowBlur = 30;
    ctx.fillStyle = '#ff2222'; ctx.font = 'bold 56px Orbitron,Courier New'; ctx.textAlign = 'center';
    ctx.fillText('!! WARNING !!', W / 2, H / 2 - 5);
    ctx.shadowBlur = 10; ctx.fillStyle = '#ffaa00'; ctx.font = 'bold 20px Orbitron,Courier New';
    ctx.fillText('BOSS  APPROACHING', W / 2, H / 2 + 36);
    ctx.shadowBlur = 0; ctx.textAlign = 'left'; ctx.globalAlpha = 1;
  }
}

function drawStageBanner(accent) {
  if (game.stageBannerTimer <= 0) return;
  const progress = game.stageBannerTimer / 120;
  const alpha = progress < 0.2 ? progress / 0.2 : progress > 0.7 ? (progress - 0.7) / 0.3 : 1;
  ctx.globalAlpha = alpha * 0.95;
  ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(0, H / 2 - 44, W, 88);
  ctx.shadowColor = accent; ctx.shadowBlur = 20; ctx.fillStyle = accent;
  ctx.font = 'bold 42px Orbitron,Courier New'; ctx.textAlign = 'center';
  const stageLabel = game.stageType === 'normal' ? (game.isAsteroidStage ? ' ☄' : '') : ` [${STAGE_TYPE_LABELS[game.stageType]}]`;
  ctx.fillText(`STAGE  ${game.stage}${stageLabel}`, W / 2, H / 2 + 15);
  ctx.shadowBlur = 0; ctx.textAlign = 'left'; ctx.globalAlpha = 1;
}

function drawHitFlash() {
  if (game.hitFlashTimer <= 0) return;
  const alpha = (game.hitFlashTimer / 40) * 0.55;
  const grad = ctx.createRadialGradient(W / 2, H / 2, H * 0.25, W / 2, H / 2, H * 0.85);
  grad.addColorStop(0, 'rgba(255,0,0,0)');
  grad.addColorStop(1, `rgba(255,0,0,${alpha})`);
  ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);
}

function drawScanlines() {
  ctx.fillStyle = 'rgba(0,0,0,0.12)';
  for (let y = 0; y < H; y += 4) ctx.fillRect(0, y, W, 2);
}

function drawEscortShip() {
  if (!game.escortShip || !game.escortShip.alive) return;
  const { x, y, w, h } = game.escortShip;
  const pulse = 0.7 + Math.sin(game.frameCount * 0.12) * 0.3;
  ctx.shadowColor = '#f80'; ctx.shadowBlur = 12 * pulse; ctx.fillStyle = '#f80';
  ctx.fillRect(x + 10, y, w - 20, h);
  ctx.fillRect(x, y + 8, 14, h - 12); ctx.fillRect(x + w - 14, y + 8, 14, h - 12);
  ctx.fillRect(x + w / 2 - 5, y - 10, 10, 14);
  ctx.fillStyle = '#ff0';
  ctx.fillRect(x + w / 2 - 3, y + 6, 6, 6);
  ctx.shadowBlur = 0;
  // HPバー
  const ratio = game.escortShip.hp / game.escortShip.maxHp;
  ctx.fillStyle = '#333'; ctx.fillRect(x, y - 12, w, 7);
  ctx.fillStyle = ratio > 0.5 ? '#0f0' : ratio > 0.25 ? '#ff0' : '#f44';
  ctx.fillRect(x, y - 12, w * ratio, 7);
  ctx.fillStyle = '#fff'; ctx.font = '9px Orbitron,Courier New'; ctx.textAlign = 'center';
  ctx.fillText('ESCORT', x + w / 2, y - 15); ctx.textAlign = 'left';
}

function drawSurvivalTimer() {
  if (game.stageType !== 'survival' || game.bossPhase) return;
  const sec = Math.ceil(game.survivalTimer / 60);
  const danger = sec <= 10;
  const pulse = danger ? 0.6 + Math.sin(game.frameCount * 0.3) * 0.4 : 1;
  ctx.globalAlpha = pulse;
  ctx.shadowColor = danger ? '#f44' : '#0cf'; ctx.shadowBlur = 15;
  ctx.fillStyle = danger ? '#f44' : '#0cf';
  ctx.font = `bold 20px Orbitron,Courier New`; ctx.textAlign = 'center';
  ctx.fillText(`SURVIVE  ${sec}`, W / 2, 22);
  ctx.shadowBlur = 0; ctx.textAlign = 'left'; ctx.globalAlpha = 1;
}

function drawWaveBanner() {
  if (game.waveBannerTimer <= 0 || game.stageType === 'survival' || game.stageType === 'boss_rush') return;
  const alpha = Math.min(1, game.waveBannerTimer / 20) * Math.min(1, (game.waveBannerTimer) / 20);
  ctx.save(); ctx.globalAlpha = alpha;
  const p = getPlanet(game.stage);
  ctx.shadowColor = p.accent; ctx.shadowBlur = 20;
  ctx.fillStyle = p.accent; ctx.font = 'bold 32px Orbitron,Courier New'; ctx.textAlign = 'center';
  const maxWave = getWaveCount();
  ctx.fillText(game.waveNum < maxWave ? `WAVE  ${game.waveNum}  /  ${maxWave}` : `FINAL  WAVE  —  BOSS  INCOMING`, W / 2, H / 2 - 60);
  ctx.shadowBlur = 0; ctx.restore();
}

// Export all UI drawing functions
export {
  drawUIButtons,
  drawPauseOverlay,
  drawGameOverOverlay,
  drawCriticalVignette,
  drawJoystick,
  drawSkillChoice,
  drawScreenFlash,
  drawVignette,
  drawStarfield,
  drawTitleDistantSilhouette,
  drawTitlePlanets,
  drawTitleWarp,
  drawTitle,
  updateDamageNumbers,
  drawDamageNumbers,
  drawParticles,
  drawGroundLine,
  drawHUD,
  drawLifeGainDisplay,
  drawLevelUpDisplay,
  drawEventBanner,
  drawMatPopups,
  drawStageClearAnim,
  drawBossWarning,
  drawStageBanner,
  drawHitFlash,
  drawScanlines,
  drawEscortShip,
  drawSurvivalTimer,
  drawWaveBanner
};
