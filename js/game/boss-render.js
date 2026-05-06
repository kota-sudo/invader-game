/**
 * Boss render/attack animation scaffold.
 * IMPORTANT: Must not mutate hitbox coords (boss.x/y/w/h). Render offsets apply only at draw time.
 */
import { game } from './game-store.js';
import { getPlanet } from '../game-data.js';

export function isDragonLordBoss(boss) {
  if (!boss) return false;
  if (boss.bossId) return boss.bossId === 'dragonLord';
  // Fallback: stage 1 Mars boss
  try {
    return game.stage === 1 && getPlanet(game.stage)?.name === 'MARS';
  } catch (_) {
    return game.stage === 1;
  }
}

export function ensureBossRenderState(boss) {
  if (!boss || !isDragonLordBoss(boss)) return;

  if (!boss.render || typeof boss.render !== 'object') {
    boss.render = {};
  }
  if (!boss.attackAnim || typeof boss.attackAnim !== 'object') {
    boss.attackAnim = {};
  }

  const r = boss.render;
  if (!Number.isFinite(r.offsetX)) r.offsetX = 0;
  if (!Number.isFinite(r.offsetY)) r.offsetY = 0;
  if (!Number.isFinite(r.rotation)) r.rotation = 0;
  if (!Number.isFinite(r.scaleX) || r.scaleX === 0) r.scaleX = 1;
  if (!Number.isFinite(r.scaleY) || r.scaleY === 0) r.scaleY = 1;
  if (!Number.isFinite(r.glowAlpha)) r.glowAlpha = 0;
  if (!Number.isFinite(r.flashAlpha)) r.flashAlpha = 0;
  if (!Number.isFinite(r.shakeX)) r.shakeX = 0;
  if (!Number.isFinite(r.shakeY)) r.shakeY = 0;
  if (!Number.isFinite(r.afterimageAlpha)) r.afterimageAlpha = 0;

  const a = boss.attackAnim;
  if (a.type === undefined) a.type = null;
  if (!a.phase) a.phase = 'idle';
  if (!Number.isFinite(a.timer)) a.timer = 0;
  if (!Number.isFinite(a.totalTimer)) a.totalTimer = 0;
}

export function resetBossRenderState(boss) {
  if (!boss || !isDragonLordBoss(boss)) return;
  ensureBossRenderState(boss);
  const r = boss.render;
  r.offsetX = 0;
  r.offsetY = 0;
  r.rotation = 0;
  r.scaleX = 1;
  r.scaleY = 1;
  r.glowAlpha = 0;
  r.flashAlpha = 0;
  r.shakeX = 0;
  r.shakeY = 0;
  r.afterimageAlpha = 0;
}

/**
 * Safe start: don't stomp an ongoing anim unless it's idle/recover.
 * Returns true if started.
 */
export function startBossAttackAnim(boss, type) {
  if (!boss || !isDragonLordBoss(boss)) return false;
  ensureBossRenderState(boss);
  const a = boss.attackAnim;
  // Backward compatible signature: startBossAttackAnim(boss, type, opts?)
  const opts = arguments.length >= 3 ? (arguments[2] || {}) : {};
  const priorityOf = (t) => (t === 'wingBarrage' ? 3 : t === 'spearDash' ? 2 : t === 'coreShot' ? 1 : 0);
  const curP = priorityOf(a.type);
  const nextP = priorityOf(type);

  const allowOverride = !!opts.allowOverride;
  const force = !!opts.force;
  const canOverride = force || (allowOverride && nextP > curP);

  if (a.type && a.phase !== 'idle' && a.phase !== 'recover' && !canOverride) return false;

  a.type = type || null;
  a.phase = type ? 'telegraph' : 'idle';
  a.timer = 0;
  a.totalTimer = 0;
  return true;
}

function clamp01(x) {
  return Math.max(0, Math.min(1, x || 0));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function easeOutCubic(t) {
  return 1 - Math.pow(1 - Math.max(0, Math.min(1, t)), 3);
}

function easeInOutCubic(t) {
  const x = Math.max(0, Math.min(1, t));
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

export function updateCoreShotAnim(boss, anim) {
  if (!boss || !anim) return;
  const r = boss.render;

  // phase durations (frames) — tweak here
  const TELEGRAPH_F = 22; // 18–24
  const WINDUP_F = 12; // 10–14
  const ACTIVE_F = 7; // 6–8
  const RECOVER_F = 16; // 14–18

  // phase transitions
  if (anim.phase === 'telegraph' && anim.timer >= TELEGRAPH_F) { anim.phase = 'windup'; anim.timer = 0; }
  else if (anim.phase === 'windup' && anim.timer >= WINDUP_F) { anim.phase = 'active'; anim.timer = 0; anim._firedVisual = false; }
  else if (anim.phase === 'active' && anim.timer >= ACTIVE_F) { anim.phase = 'recover'; anim.timer = 0; }
  else if (anim.phase === 'recover' && anim.timer >= RECOVER_F) { anim.phase = 'idle'; anim.type = null; anim.timer = 0; anim.totalTimer = 0; }

  const dir = boss.dir || 1;

  // defaults for coreShot (on top of reset+idle sway)
  r.scaleX = 1;
  r.scaleY = 1;

  if (anim.phase === 'telegraph') {
    const p = anim.timer / TELEGRAPH_F;
    const pulse = (Math.sin(anim.timer * 0.45) * 0.5 + 0.5);
    // slightly stronger/clearer core pulse
    r.glowAlpha = lerp(0.42, 0.72, pulse);
    r.offsetY += Math.sin(anim.timer * 0.2) * 2.2;
    const s = 1 + 0.03 * (0.35 + 0.65 * pulse) * easeOutCubic(p);
    r.scaleX *= s;
    r.scaleY *= s;
    r.rotation += dir * (0.006 + 0.005 * Math.sin(anim.timer * 0.22));
    r.afterimageAlpha = 0.05;
  } else if (anim.phase === 'windup') {
    const p = easeOutCubic(anim.timer / WINDUP_F);
    r.offsetX += -dir * lerp(6, 16, p);
    r.offsetY += lerp(-5, -9, p);
    r.scaleX *= lerp(1.0, 0.985, p);
    r.scaleY *= lerp(1.0, 0.985, p);
    r.glowAlpha = lerp(0.72, 0.82, p);
    r.rotation += -dir * lerp(0.0, 0.045, p);
    r.afterimageAlpha = 0.12;
  } else if (anim.phase === 'active') {
    const p = easeInOutCubic(anim.timer / ACTIVE_F);
    // clearer kick forward + recoil down/up without going wild
    r.offsetX += dir * lerp(12, 26, p);
    r.offsetY += lerp(7, 11, p);
    r.scaleX *= lerp(1.02, 1.055, p);
    r.scaleY *= lerp(1.02, 1.055, p);
    r.glowAlpha = 1.0;
    r.rotation += dir * lerp(0.0, 0.08, p);
    r.afterimageAlpha = 0.22;
    r.shakeY += Math.sin((game.frameCount || 0) * 0.9) * 0.6;

    // visual flash: first 2 frames only
    if (anim.timer <= 2) {
      r.flashAlpha = Math.max(r.flashAlpha, 0.28);
    }
  } else if (anim.phase === 'recover') {
    const p = easeOutCubic(anim.timer / RECOVER_F);
    const k = 1 - p;
    // pull everything back towards neutral (while keeping the base idle sway)
    r.offsetX *= k;
    r.offsetY *= k;
    r.rotation *= k;
    r.scaleX = lerp(r.scaleX, 1, p);
    r.scaleY = lerp(r.scaleY, 1, p);
    r.glowAlpha *= k;
    r.afterimageAlpha *= k;
    r.shakeX *= k;
    r.shakeY *= k;
    r.flashAlpha *= k;
  }

  // clamp
  r.glowAlpha = clamp01(r.glowAlpha);
  r.flashAlpha = clamp01(r.flashAlpha);
  r.afterimageAlpha = clamp01(r.afterimageAlpha);
}

export function updateSpearDashAnim(boss, anim) {
  if (!boss || !anim) return;
  const r = boss.render;

  // phase durations (frames) — tweak here
  const TELEGRAPH_F = 24; // 20–26
  const WINDUP_F = 14; // 12–16
  const ACTIVE_F = 10; // 8–12
  const RECOVER_F = 14; // slightly faster for tempo (was 18)

  // phase transitions
  if (anim.phase === 'telegraph' && anim.timer >= TELEGRAPH_F) { anim.phase = 'windup'; anim.timer = 0; }
  else if (anim.phase === 'windup' && anim.timer >= WINDUP_F) { anim.phase = 'active'; anim.timer = 0; anim._didShake = false; }
  else if (anim.phase === 'active' && anim.timer >= ACTIVE_F) { anim.phase = 'recover'; anim.timer = 0; }
  else if (anim.phase === 'recover' && anim.timer >= RECOVER_F) { anim.phase = 'idle'; anim.type = null; anim.timer = 0; anim.totalTimer = 0; }

  const dir = boss.dir || 1;

  // defaults for spearDash (on top of reset+idle sway)
  r.scaleX = 1;
  r.scaleY = 1;

  if (anim.phase === 'telegraph') {
    const pulse = (Math.sin(anim.timer * 0.42) * 0.5 + 0.5);
    r.glowAlpha = lerp(0.5, 0.8, pulse);
    r.offsetY += (-4 + Math.sin(anim.timer * 0.2) * 2);
    r.scaleX *= 1.03;
    r.scaleY *= 1.03;
    r.rotation += -dir * (0.01 + 0.012 * Math.sin(anim.timer * 0.18));
    r.afterimageAlpha = 0.08;
  } else if (anim.phase === 'windup') {
    const p = easeOutCubic(anim.timer / WINDUP_F);
    r.offsetX += -dir * lerp(12, 24, p);
    r.offsetY += lerp(-6, -10, p);
    r.rotation += -dir * lerp(0.05, 0.10, p);
    r.scaleX *= 1.05;
    r.scaleY *= 1.05;
    r.glowAlpha = 0.8;
    r.afterimageAlpha = 0.16;
  } else if (anim.phase === 'active') {
    const p = easeInOutCubic(anim.timer / ACTIVE_F);
    // bigger slide to read as "dash" even when boss is small
    r.offsetX += dir * lerp(70, 125, p);
    r.rotation += -dir * lerp(0.10, 0.16, p);
    r.scaleX *= lerp(1.05, 1.08, p);
    r.scaleY *= lerp(1.03, 1.05, p);
    r.glowAlpha = 0.78;
    r.afterimageAlpha = 0.35;

    // light boss-local shake; plus one-time global screen shake on active start
    r.shakeX += Math.sin((game.frameCount || 0) * 1.1) * 0.55;
    r.shakeY += Math.cos((game.frameCount || 0) * 1.05) * 0.45;

    if (!anim._didShake) {
      anim._didShake = true;
      // Use existing screen shake fields (draw-dispatch reads them)
      game.shakeIntensity = Math.max(game.shakeIntensity || 0, 5);
      game.shakeTimer = Math.max(game.shakeTimer || 0, 6);
    }

    // flash: first 2 frames only
    if (anim.timer <= 2) {
      r.flashAlpha = Math.max(r.flashAlpha, 0.25);
    }
  } else if (anim.phase === 'recover') {
    const p = easeOutCubic(anim.timer / RECOVER_F);
    const k = 1 - p;
    r.offsetX *= k;
    r.offsetY *= k;
    r.rotation *= k;
    r.scaleX = lerp(r.scaleX, 1, p);
    r.scaleY = lerp(r.scaleY, 1, p);
    r.glowAlpha *= k;
    r.afterimageAlpha *= k;
    r.shakeX *= k;
    r.shakeY *= k;
    r.flashAlpha *= k;
  }

  r.glowAlpha = clamp01(r.glowAlpha);
  r.flashAlpha = clamp01(r.flashAlpha);
  r.afterimageAlpha = clamp01(r.afterimageAlpha);
}

export function updateWingBarrageAnim(boss, anim) {
  if (!boss || !anim) return;
  const r = boss.render;

  // phase durations (frames) — tweak here
  const TELEGRAPH_F = 28; // 24–30
  const WINDUP_F = 16; // 14–18
  const ACTIVE_F = 16; // 12–18
  const RECOVER_F = 22; // 18–24

  if (anim.phase === 'telegraph' && anim.timer >= TELEGRAPH_F) { anim.phase = 'windup'; anim.timer = 0; }
  else if (anim.phase === 'windup' && anim.timer >= WINDUP_F) { anim.phase = 'active'; anim.timer = 0; anim._didShake = false; }
  else if (anim.phase === 'active' && anim.timer >= ACTIVE_F) { anim.phase = 'recover'; anim.timer = 0; }
  else if (anim.phase === 'recover' && anim.timer >= RECOVER_F) { anim.phase = 'idle'; anim.type = null; anim.timer = 0; anim.totalTimer = 0; }

  const dir = boss.dir || 1;

  // defaults for wingBarrage (on top of reset+idle sway)
  r.scaleX = 1;
  r.scaleY = 1;

  if (anim.phase === 'telegraph') {
    const p = anim.timer / TELEGRAPH_F;
    const pulse = (Math.sin(anim.timer * 0.32) * 0.5 + 0.5);
    r.offsetY += lerp(-3, -7, easeOutCubic(p)) + Math.sin(anim.timer * 0.18) * 1.6;
    r.rotation += dir * (0.005 * Math.sin(anim.timer * 0.16));
    r.glowAlpha = lerp(0.45, 0.75, pulse);
    r.afterimageAlpha = 0.10;
  } else if (anim.phase === 'windup') {
    const p = easeOutCubic(anim.timer / WINDUP_F);
    // “翼を広げる” ＝ 横を少し広げる + 縦も少し
    r.scaleX *= lerp(1.05, 1.12, p);
    r.scaleY *= lerp(1.02, 1.06, p);
    r.offsetY += lerp(-5, -10, p);
    r.rotation += -dir * lerp(0.02, 0.06, p);
    r.glowAlpha = lerp(0.68, 0.92, p); // keep bright but avoid washout
    r.afterimageAlpha = 0.14;
  } else if (anim.phase === 'active') {
    const p = easeInOutCubic(anim.timer / ACTIVE_F);
    r.scaleX *= lerp(1.14, 1.19, p);
    r.scaleY *= lerp(1.06, 1.10, p);
    r.offsetY += lerp(-8, -14, p);
    r.rotation += dir * lerp(0.0, 0.03, p);
    r.glowAlpha = 1.0;
    r.flashAlpha = Math.max(r.flashAlpha, anim.timer <= 2 ? 0.24 : 0.0);
    r.afterimageAlpha = 0.18;

    // one-time punchy shake at activation
    if (!anim._didShake) {
      anim._didShake = true;
      game.shakeIntensity = Math.max(game.shakeIntensity || 0, 7);
      game.shakeTimer = Math.max(game.shakeTimer || 0, 10);
    }
  } else if (anim.phase === 'recover') {
    const p = easeOutCubic(anim.timer / RECOVER_F);
    const k = 1 - p;
    r.offsetX *= k;
    r.offsetY *= k;
    r.rotation *= k;
    r.scaleX = lerp(r.scaleX, 1, p);
    r.scaleY = lerp(r.scaleY, 1, p);
    r.glowAlpha *= k;
    r.afterimageAlpha *= k;
    r.shakeX *= k;
    r.shakeY *= k;
    r.flashAlpha *= k;
  }

  r.glowAlpha = clamp01(r.glowAlpha);
  r.flashAlpha = clamp01(r.flashAlpha);
  r.afterimageAlpha = clamp01(r.afterimageAlpha);
}

export function updateBossAttackAnim(boss) {
  if (!boss || !isDragonLordBoss(boss)) return;
  ensureBossRenderState(boss);
  resetBossRenderState(boss);

  const a = boss.attackAnim;
  const r = boss.render;

  // passive idle micro-motion (kept subtle; does not affect hitbox)
  const t = (game.frameCount || 0) * 0.04;
  // small readable float: offsetY ±1–2px, slight X, tiny rotation
  r.offsetX += Math.sin(t) * 0.8;
  r.offsetY += Math.sin(t * 0.7) * 1.4;
  r.rotation += Math.sin(t * 0.55) * 0.008;

  if (!a.type) {
    a.phase = 'idle';
    a.timer = 0;
    a.totalTimer = 0;
    return;
  }

  a.timer += 1;
  a.totalTimer += 1;

  // Attack-specific updates are intentionally not implemented yet.
  switch (a.type) {
    case 'coreShot':
      updateCoreShotAnim(boss, a);
      break;
    case 'spearDash':
      updateSpearDashAnim(boss, a);
      break;
    case 'wingBarrage':
      updateWingBarrageAnim(boss, a);
      break;
    default:
      break;
  }
}

/**
 * Apply boss.render transforms at draw-time only.
 * drawFn is called with local-space origin (0,0) and size (w,h).
 */
export function applyBossRenderTransform(ctx, boss, drawFn) {
  if (!boss || typeof drawFn !== 'function') return;
  if (!ctx?.save) return drawFn({ x: boss.x, y: boss.y, w: boss.w, h: boss.h });
  if (!isDragonLordBoss(boss)) return drawFn({ x: boss.x, y: boss.y, w: boss.w, h: boss.h });

  ensureBossRenderState(boss);
  const r = boss.render;
  const ox = (r.offsetX || 0) + (r.shakeX || 0);
  const oy = (r.offsetY || 0) + (r.shakeY || 0);
  const rot = r.rotation || 0;
  const sx = (Number.isFinite(r.scaleX) ? r.scaleX : 1) || 1;
  const sy = (Number.isFinite(r.scaleY) ? r.scaleY : 1) || 1;

  const cx = boss.x + boss.w / 2 + ox;
  const cy = boss.y + boss.h / 2 + oy;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rot);
  ctx.scale(sx, sy);
  ctx.translate(-boss.w / 2, -boss.h / 2);
  try {
    drawFn({ x: 0, y: 0, w: boss.w, h: boss.h });
  } finally {
    ctx.restore();
  }
}

