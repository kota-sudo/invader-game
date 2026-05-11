/**
 * 竜王ボス — 攻撃状態機械・弾生成・予兆描画データ・接触判定
 * 世界観: 火星・ネオン・ダークファンタジー（赤翼・槍・胸コア）
 *
 * Phase1: HP > 50%  /  Phase2: HP ≤ 50%
 */
import { game } from './game-store.js';
import { CANVAS_W as W, CANVAS_H as H, INVADER_BULLET_SPEED } from './constants.js';
import { isDragonLordBoss } from './boss-render.js';
import { rectsOverlap, onPlayerHit, absorbWithShield } from './player-combat.js';
import { playSound } from './audio.js';
import { spawnExplosion } from './spawn-helpers.js';

const FPS = 60;
const sec = (s) => Math.max(1, Math.round(s * FPS));

/** ─── 紅槍ショット: 槍先 0.4s 発光後、0.4 / 0.65 / 0.9 s で 3 連射 ─── */
const CRIMSON_TELEGRAPH = sec(0.4);
const CRIMSON_T1 = sec(0.4);
const CRIMSON_T2 = sec(0.65);
const CRIMSON_T3 = sec(0.9);
const CRIMSON_RECOVERY = sec(0.22);

/** ─── ヘルランスチャージ: 0.8s 予兆 → 突進 → 約 0.5s 硬直 ─── */
const HELL_TELEGRAPH = sec(0.8);
const HELL_WINDUP = sec(0.12);
const HELL_ACTIVE = sec(0.28);
const HELL_RECOVER = sec(0.5);

/** ─── ダークウィングバラージ ─── */
const WING_TELEGRAPH = sec(0.6);
const WING_WINDUP = sec(0.15);
const WING_WAVE_GAP = 10;
const WING_RECOVERY = sec(0.35);

/** ─── アビスコアレーザー（Phase2 のみ）─── */
const LASER_MOVE = sec(0.45);
const LASER_CHARGE = sec(1.0);
const LASER_BEAM = sec(1.2);
const LASER_RECOVER = sec(0.45);

/** ─── 魔竜覇槍・終焉突き（Phase2 のみ）─── */
const FINALE_TELEGRAPH = sec(1.0);
const FINALE_WINDUP = sec(0.22);
const FINALE_DASH = sec(0.32);
const FINALE_SLAM = sec(0.38);
const FINALE_RECOVER = sec(1.45);

function clamp(x, a, b) {
  return Math.max(a, Math.min(b, x));
}

function ensureDragon(boss) {
  if (!boss.dragon || typeof boss.dragon !== 'object') {
    boss.dragon = {};
  }
  const d = boss.dragon;
  if (!Number.isFinite(d.cooldown)) d.cooldown = 50;
  if (!d.phaseLocal) d.phaseLocal = 'idle';
  if (!Number.isFinite(d.phaseTimer)) d.phaseTimer = 0;
  if (!Number.isFinite(d.attackTimer)) d.attackTimer = 0;
  if (d.currentAttack === undefined) d.currentAttack = null;
  if (d.lastAttack === undefined) d.lastAttack = null;
}

export function initDragonLordBoss(boss) {
  boss.dragon = {
    cooldown: 55,
    phaseLocal: 'idle',
    phaseTimer: 0,
    attackTimer: 0,
    currentAttack: null,
    lastAttack: null,
    lockPx: 0,
    lockPy: 0,
    firedBits: 0,
    waveIdx: 0,
    laserAngle: 0,
    laserSweep0: 0,
    finaleDx: 0,
    finaleDy: 0,
    slamCx: 0,
    slamTimer: 0,
    retreatDone: false,
  };
  boss.dragonHitboxes = [];
  boss.dragonDraw = emptyDraw();
}

function emptyDraw() {
  return {
    spearTipGlow: 0,
    coreCharge: 0,
    wingSpread: 0,
    warningLine: null,
    laserAim: null,
    laserBeam: null,
    shockwaves: [],
    warningBanner: false,
  };
}

/** Phase: 1 = HP > 50%, 2 = HP ≤ 50% */
export function getDragonLordBattlePhase(boss) {
  if (!boss?.maxHp) return 1;
  return boss.hp / boss.maxHp > 0.5 ? 1 : 2;
}

function shootCrimsonBurst(boss, spread = 0.12) {
  const cx = boss.x + boss.w / 2;
  const cy = boss.y + boss.h - 4;
  const spd = INVADER_BULLET_SPEED * 1.65;
  const base = Math.PI / 2 + (Math.random() - 0.5) * spread;
  [-0.22, 0, 0.22].forEach((da) => {
    const a = base + da;
    game.invaderBullets.push({
      x: cx - 4,
      y: cy,
      w: 8,
      h: 11,
      vx: Math.cos(a) * spd * 0.35,
      vy: Math.sin(a) * spd,
      dragonCrimson: true,
    });
  });
  playSound('boss_hit');
}

function shootDarkWingFan(boss, waveIndex, phase2) {
  const cx = boss.x + boss.w / 2;
  const cy = boss.y + boss.h * 0.55;
  const n = phase2 ? 11 : 8;
  const spread = phase2 ? 0.85 + waveIndex * 0.06 : 0.72 + waveIndex * 0.04;
  const spd = INVADER_BULLET_SPEED * (phase2 ? 1.05 : 0.92);
  const off = (waveIndex % 2) * 0.09;
  for (let i = 0; i < n; i++) {
    const u = i / (n - 1 || 1);
    const a = Math.PI * 0.15 + spread * u + off;
    game.invaderBullets.push({
      x: cx - 3,
      y: cy,
      w: 7,
      h: 9,
      vx: Math.cos(a) * spd * 0.42,
      vy: Math.sin(a) * spd,
      dragonWing: true,
    });
  }
  playSound('boss_hit');
}

function finishAttack(boss) {
  const d = boss.dragon;
  d.phaseLocal = 'idle';
  d.phaseTimer = 0;
  d.attackTimer = 0;
  d.currentAttack = null;
  d.cooldown = 38 + Math.floor(Math.random() * 28);
  if (getDragonLordBattlePhase(boss) >= 2) d.cooldown = Math.max(28, d.cooldown - 8);
  boss.attackAnim = boss.attackAnim || {};
  boss.attackAnim.type = null;
  boss.attackAnim.phase = 'idle';
  boss.attackAnim.timer = 0;
}

function applyIdleRender(boss) {
  const r = boss.render || (boss.render = {});
  const t = (game.frameCount || 0) * 0.04;
  r.offsetX = Math.sin(t) * 0.8;
  r.offsetY = Math.sin(t * 0.7) * 1.4;
  r.rotation = Math.sin(t * 0.55) * 0.008;
  r.scaleX = 1;
  r.scaleY = 1;
  r.glowAlpha = 0.38 + Math.sin(t * 0.5) * 0.08;
  r.flashAlpha = 0;
  r.afterimageAlpha = 0;
}

function patrolDragonLord(boss) {
  const spd = boss.speed * (getDragonLordBattlePhase(boss) >= 2 ? 1.15 : 1);
  boss.x += boss.dir * spd;
  if (boss.x + boss.w >= W - 8) boss.dir = -1;
  if (boss.x <= 8) boss.dir = 1;
}

export function chooseDragonLordAttack(boss) {
  const d = boss.dragon;
  const phase = getDragonLordBattlePhase(boss);
  const pool = ['crimsonSpear', 'hellLance', 'darkWing'];
  if (phase >= 2) {
    pool.push('abyssLaser');
    if (Math.random() < 0.38) pool.push('demonFinale');
  }
  let pick = pool[Math.floor(Math.random() * pool.length)];
  if (pick === d.lastAttack && pool.length > 1) {
    const rest = pool.filter((x) => x !== pick);
    pick = rest[Math.floor(Math.random() * rest.length)];
  }
  if (pick === 'abyssLaser' && phase < 2) pick = 'darkWing';
  if (pick === 'demonFinale' && phase < 2) pick = 'hellLance';

  d.lastAttack = pick;
  d.currentAttack = pick;
  d.phaseLocal = 'telegraph';
  d.phaseTimer = 0;
  d.attackTimer = 0;
  d.firedBits = 0;
  d.waveIdx = 0;
  d.retreatDone = false;
  d.slamTimer = 0;

  if (pick === 'hellLance' || pick === 'demonFinale') {
    d.lockPx = game.player.x + game.player.w / 2;
    d.lockPy = game.player.y + game.player.h / 2;
  }

  if (pick === 'demonFinale') {
    const pcx = game.player.x + game.player.w / 2;
    d.finaleDx = pcx < boss.x + boss.w / 2 ? -1 : 1;
    d.finaleDy = 1;
    const len = Math.hypot(d.finaleDx, d.finaleDy) || 1;
    d.finaleDx /= len;
    d.finaleDy /= len;
  }

  boss.attackAnim = boss.attackAnim || {};
  boss.attackAnim.type = pick;
  boss.attackAnim.phase = 'telegraph';
  boss.attackAnim.timer = 0;

  boss.dragonDraw = emptyDraw();
  if (pick === 'demonFinale') boss.dragonDraw.warningBanner = true;
}

/** 予兆ライン（ヘルランス） */
function setHellWarningLine(boss, alpha) {
  const cx = boss.x + boss.w / 2;
  const cy = boss.y + boss.h * 0.65;
  const d = boss.dragon;
  boss.dragonDraw.warningLine = {
    x1: cx,
    y1: cy,
    x2: d.lockPx,
    y2: d.lockPy,
    alpha,
  };
}

export function tickDragonLordAttack(boss) {
  const d = boss.dragon;
  const draw = boss.dragonDraw;
  const phase2 = getDragonLordBattlePhase(boss) >= 2;

  d.phaseTimer++;
  d.attackTimer++;

  switch (d.currentAttack) {
    case 'crimsonSpear': {
      /** 紅槍ショット */
      draw.spearTipGlow = d.phaseLocal === 'telegraph' ? clamp(d.phaseTimer / CRIMSON_TELEGRAPH, 0, 1) : 0.35;
      draw.coreCharge = draw.spearTipGlow * 0.7;

      if (d.phaseLocal === 'telegraph' && d.phaseTimer >= CRIMSON_TELEGRAPH) {
        d.phaseLocal = 'active';
        d.phaseTimer = 0;
      }
      if (d.phaseLocal === 'active') {
        const t = d.attackTimer;
        if (t === CRIMSON_T1 && !(d.firedBits & 1)) {
          d.firedBits |= 1;
          shootCrimsonBurst(boss);
        }
        if (t === CRIMSON_T2 && !(d.firedBits & 2)) {
          d.firedBits |= 2;
          shootCrimsonBurst(boss, 0.18);
        }
        if (t === CRIMSON_T3 && !(d.firedBits & 4)) {
          d.firedBits |= 4;
          shootCrimsonBurst(boss, 0.15);
        }
        if (t >= CRIMSON_T3) {
          d.phaseLocal = 'recovery';
          d.phaseTimer = 0;
        }
      }
      if (d.phaseLocal === 'recovery' && d.phaseTimer >= CRIMSON_RECOVERY) finishAttack(boss);
      boss.render.glowAlpha = Math.max(boss.render.glowAlpha || 0, 0.45 + draw.spearTipGlow * 0.35);
      break;
    }

    case 'hellLance': {
      /** ヘルランスチャージ */
      draw.wingSpread = clamp(d.phaseTimer / HELL_TELEGRAPH, 0, 1);
      draw.coreCharge = draw.wingSpread;
      setHellWarningLine(boss, 0.35 + draw.wingSpread * 0.45);

      if (d.phaseLocal === 'telegraph' && d.phaseTimer >= HELL_TELEGRAPH) {
        d.phaseLocal = 'windup';
        d.phaseTimer = 0;
        draw.warningLine = null;
      } else if (d.phaseLocal === 'windup' && d.phaseTimer >= HELL_WINDUP) {
        d.phaseLocal = 'active';
        d.phaseTimer = 0;
        d._dashT = 0;
      } else if (d.phaseLocal === 'active') {
        d._dashT = (d._dashT || 0) + 1;
        const u = clamp(d._dashT / HELL_ACTIVE, 0, 1);
        const tx = clamp(d.lockPx - boss.w / 2, 4, W - boss.w - 4);
        const ty = clamp(d.lockPy - boss.h * 0.55, 24, H - boss.h - 80);
        boss.x += (tx - boss.x) * 0.38;
        boss.y += (ty - boss.y) * 0.38;

        const hx = boss.x + boss.w * 0.65 * (boss.dir >= 0 ? 1 : -1);
        boss.dragonHitboxes.push({
          x: hx - 22,
          y: boss.y + boss.h * 0.35,
          w: 44,
          h: 28,
        });
        boss.dragonHitboxes.push({
          x: boss.x + boss.w * 0.15,
          y: boss.y + boss.h * 0.25,
          w: boss.w * 0.55,
          h: boss.h * 0.5,
        });
        boss.render.afterimageAlpha = 0.35;
        boss.render.glowAlpha = 0.95;

        if (d._dashT >= HELL_ACTIVE) {
          d.phaseLocal = 'recovery';
          d.phaseTimer = 0;
          spawnExplosion(boss.x + boss.w / 2, boss.y + boss.h * 0.7, '#ff5530', 10);
          playSound('explosion');
        }
      } else if (d.phaseLocal === 'recovery' && d.phaseTimer >= HELL_RECOVER) {
        finishAttack(boss);
      }
      break;
    }

    case 'darkWing': {
      /** ダークウィングバラージ */
      draw.wingSpread = clamp(d.phaseTimer / (WING_TELEGRAPH + WING_WINDUP), 0, 1);
      draw.coreCharge = draw.wingSpread * 0.55;

      if (d.phaseLocal === 'telegraph' && d.phaseTimer >= WING_TELEGRAPH) {
        d.phaseLocal = 'windup';
        d.phaseTimer = 0;
      } else if (d.phaseLocal === 'windup' && d.phaseTimer >= WING_WINDUP) {
        d.phaseLocal = 'active';
        d.phaseTimer = 0;
        d.waveIdx = 0;
        d._nextWaveAt = 0;
      } else if (d.phaseLocal === 'active') {
        const maxWaves = phase2 ? 5 : 3;
        if (d.phaseTimer >= d._nextWaveAt && d.waveIdx < maxWaves) {
          shootDarkWingFan(boss, d.waveIdx, phase2);
          d.waveIdx++;
          d._nextWaveAt = d.phaseTimer + WING_WAVE_GAP;
        }
        boss.render.glowAlpha = 0.88;
        if (d.waveIdx >= maxWaves && d.phaseTimer > d._nextWaveAt + 4) {
          d.phaseLocal = 'recovery';
          d.phaseTimer = 0;
        }
      } else if (d.phaseLocal === 'recovery' && d.phaseTimer >= WING_RECOVERY) {
        finishAttack(boss);
      }
      break;
    }

    case 'abyssLaser': {
      /** アビスコアレーザー（Phase2） */
      if (d.phaseLocal === 'telegraph') {
        const tx = W / 2 - boss.w / 2;
        const ty = 32;
        boss.x += (tx - boss.x) * 0.12;
        boss.y += (ty - boss.y) * 0.12;
        draw.coreCharge = clamp(d.phaseTimer / LASER_MOVE, 0, 1);
        if (d.phaseTimer >= LASER_MOVE) {
          d.phaseLocal = 'windup';
          d.phaseTimer = 0;
        }
      } else if (d.phaseLocal === 'windup') {
        draw.coreCharge = clamp(d.phaseTimer / LASER_CHARGE, 0, 1);
        const pcx = game.player.x + game.player.w / 2;
        const pcy = game.player.y + game.player.h / 2;
        const bx = boss.x + boss.w / 2;
        const by = boss.y + boss.h * 0.52;
        const aimA = Math.atan2(pcy - by, pcx - bx);
        draw.laserAim = { x1: bx, y1: by, x2: bx + Math.cos(aimA) * 420, y2: by + Math.sin(aimA) * 420, alpha: 0.35 + draw.coreCharge * 0.45 };

        if (d.phaseTimer >= LASER_CHARGE) {
          d.phaseLocal = 'active';
          d.phaseTimer = 0;
          d._laserAimEnd = aimA;
        }
      } else if (d.phaseLocal === 'active') {
        const u = clamp(d.phaseTimer / LASER_BEAM, 0, 1);
        const aim0 = d._laserAimEnd ?? d.laserSweep0;
        d.laserAngle = aim0 - 0.14 + u * 0.28;
        const bx = boss.x + boss.w / 2;
        const by = boss.y + boss.h * 0.55;
        const len = H - by + 40;
        draw.laserBeam = { cx: bx, cy: by, angle: d.laserAngle, length: len, width: 34, alpha: 0.82 };

        const midX = bx + Math.cos(d.laserAngle) * (len * 0.45);
        const midY = by + Math.sin(d.laserAngle) * (len * 0.45);
        const perp = d.laserAngle + Math.PI / 2;
        for (let k = -1; k <= 1; k++) {
          const ox = Math.cos(perp) * k * 9;
          const oy = Math.sin(perp) * k * 9;
          boss.dragonHitboxes.push({
            x: midX + ox - 15,
            y: midY + oy - 220,
            w: 30,
            h: H,
          });
        }
        boss.render.glowAlpha = 1;
        if (d.phaseTimer >= LASER_BEAM) {
          d.phaseLocal = 'recovery';
          d.phaseTimer = 0;
          draw.laserBeam = null;
          draw.laserAim = null;
        }
      } else if (d.phaseLocal === 'recovery' && d.phaseTimer >= LASER_RECOVER) {
        finishAttack(boss);
      }
      break;
    }

    case 'demonFinale': {
      /** 魔竜覇槍・終焉突き */
      draw.warningBanner = d.phaseLocal === 'telegraph';
      draw.wingSpread = d.phaseLocal === 'telegraph' ? clamp(d.phaseTimer / FINALE_TELEGRAPH, 0, 1) : 1;
      draw.coreCharge = draw.wingSpread;

      if (d.phaseLocal === 'telegraph' && d.phaseTimer >= FINALE_TELEGRAPH) {
        d.phaseLocal = 'windup';
        d.phaseTimer = 0;
        draw.warningBanner = false;
      } else if (d.phaseLocal === 'windup') {
        boss.x -= d.finaleDx * 2.4;
        boss.y -= 1.2;
        if (d.phaseTimer >= FINALE_WINDUP) {
          d.phaseLocal = 'active';
          d.phaseTimer = 0;
          d._dashFr = 0;
        }
      } else if (d.phaseLocal === 'active') {
        d._dashFr = (d._dashFr || 0) + 1;
        if (d._dashFr <= FINALE_DASH) {
          boss.x += d.finaleDx * 14;
          boss.y += d.finaleDy * 11;
          boss.dragonHitboxes.push({
            x: boss.x + boss.w * 0.2,
            y: boss.y + boss.h * 0.2,
            w: boss.w * 0.75,
            h: boss.h * 0.65,
          });
          boss.render.afterimageAlpha = 0.42;
        } else if (d._dashFr <= FINALE_DASH + FINALE_SLAM) {
          if (d.slamTimer === 0) {
            d.slamCx = boss.x + boss.w / 2;
            playSound('boss_hit');
          }
          d.slamTimer++;
          const prog = clamp(d.slamTimer / FINALE_SLAM, 0, 1);
          const spread = 40 + prog * (W * 0.42);
          boss.dragonDraw.shockwaves = [
            { cx: d.slamCx, spread, alpha: 0.55 * (1 - prog * 0.5), side: -1 },
            { cx: d.slamCx, spread, alpha: 0.55 * (1 - prog * 0.5), side: 1 },
          ];
          boss.dragonHitboxes.push({
            x: d.slamCx - spread - 20,
            y: boss.y + boss.h - 18,
            w: spread * 0.55,
            h: 22,
          });
          boss.dragonHitboxes.push({
            x: d.slamCx + 20,
            y: boss.y + boss.h - 18,
            w: spread * 0.55,
            h: 22,
          });
          boss.render.glowAlpha = 1;
        } else {
          d.phaseLocal = 'recovery';
          d.phaseTimer = 0;
          boss.dragonDraw.shockwaves = [];
        }
      } else if (d.phaseLocal === 'recovery' && d.phaseTimer >= FINALE_RECOVER) {
        finishAttack(boss);
      }
      break;
    }

    default:
      finishAttack(boss);
  }

  const a = boss.attackAnim || (boss.attackAnim = {});
  if (d.phaseLocal !== 'idle' && d.currentAttack) {
    if (d.currentAttack === 'hellLance' && d.phaseLocal === 'active') {
      a.type = 'spearDash';
      a.phase = 'active';
    } else if (d.currentAttack === 'darkWing') {
      a.type = 'wingBarrage';
      a.phase = d.phaseLocal === 'active' ? 'active' : 'charge';
    } else if (d.currentAttack === 'crimsonSpear') {
      a.type = 'coreShot';
      a.phase = d.phaseLocal === 'active' ? 'active' : 'charge';
    } else {
      a.type = d.currentAttack;
      a.phase = d.phaseLocal;
    }
    a.timer = d.phaseTimer;
  }
}

export function updateDragonLordBoss(boss) {
  if (!boss || !isDragonLordBoss(boss)) return;
  if (!boss._dragonLordInitialized) {
    initDragonLordBoss(boss);
    boss._dragonLordInitialized = true;
  }

  boss.dragonHitboxes = [];
  boss.dragonDraw = boss.dragonDraw || emptyDraw();
  ensureDragon(boss);

  applyIdleRender(boss);

  const d = boss.dragon;
  if (d.phaseLocal === 'idle') {
    if (d.cooldown > 0) d.cooldown--;
    patrolDragonLord(boss);
    if (d.cooldown <= 0) chooseDragonLordAttack(boss);
    return;
  }

  tickDragonLordAttack(boss);
}

export function checkDragonLordBossPlayerHits(boss) {
  if (!boss?.dragonHitboxes?.length) return;
  if (game.powerupActive === 'invincible' || game.player.invincibleTimer > 0) return;
  for (const hb of boss.dragonHitboxes) {
    if (rectsOverlap(hb, game.player)) {
      if (game.playerShield || (game.chaosBuff?.type === 'shield' && (game.chaosBuff.timer || 0) > 0)) {
        absorbWithShield();
      } else {
        onPlayerHit();
      }
      break;
    }
  }
}

/**
 * 竜王の予兆オーバーレイ（スプライトの外側・ワールド座標）
 */
export function drawDragonLordTelegraphs(ctx, boss) {
  if (!boss || !isDragonLordBoss(boss)) return;
  const dr = boss.dragonDraw;
  if (!dr) return;

  ctx.save();
  if (dr.warningLine && dr.warningLine.alpha > 0) {
    const wl = dr.warningLine;
    ctx.strokeStyle = `rgba(255,80,60,${wl.alpha * 0.85})`;
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 8]);
    ctx.beginPath();
    ctx.moveTo(wl.x1, wl.y1);
    ctx.lineTo(wl.x2, wl.y2);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  if (dr.laserAim) {
    const la = dr.laserAim;
    ctx.strokeStyle = `rgba(120,230,255,${la.alpha})`;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 6]);
    ctx.beginPath();
    ctx.moveTo(la.x1, la.y1);
    ctx.lineTo(la.x2, la.y2);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  if (dr.laserBeam) {
    const lb = dr.laserBeam;
    ctx.save();
    ctx.translate(lb.cx, lb.cy);
    ctx.rotate(lb.angle);
    const grd = ctx.createLinearGradient(0, 0, 0, lb.length);
    grd.addColorStop(0, `rgba(255,60,80,${lb.alpha * 0.95})`);
    grd.addColorStop(0.45, `rgba(255,160,120,${lb.alpha * 0.55})`);
    grd.addColorStop(1, 'rgba(255,40,40,0)');
    ctx.fillStyle = grd;
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillRect(-lb.width / 2, 0, lb.width, lb.length);
    ctx.restore();
  }

  for (const sw of dr.shockwaves || []) {
    ctx.strokeStyle = `rgba(255,130,90,${sw.alpha})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(sw.cx, boss.y + boss.h - 8, sw.spread * 0.35, Math.PI * 0.55, Math.PI * 0.95);
    ctx.stroke();
  }

  if (dr.warningBanner) {
    ctx.fillStyle = 'rgba(12,4,10,0.72)';
    ctx.fillRect(W / 2 - 140, 68, 280, 36);
    ctx.strokeStyle = 'rgba(255,60,50,0.75)';
    ctx.lineWidth = 2;
    ctx.strokeRect(W / 2 - 140, 68, 280, 36);
    ctx.font = 'bold 14px Orbitron,Courier New,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255,220,200,0.95)';
    ctx.fillText('⚠ WARNING — DEMON SPEAR', W / 2, 91);
    ctx.textAlign = 'left';
  }

  if (dr.spearTipGlow > 0.1 && boss.dragon?.currentAttack === 'crimsonSpear') {
    const cx = boss.x + boss.w * 0.72;
    const cy = boss.y + boss.h * 0.42;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, 22);
    g.addColorStop(0, `rgba(255,200,120,${0.35 * dr.spearTipGlow})`);
    g.addColorStop(1, 'rgba(255,40,40,0)');
    ctx.fillStyle = g;
    ctx.globalCompositeOperation = 'lighter';
    ctx.beginPath();
    ctx.arc(cx, cy, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
  }

  ctx.restore();
}
