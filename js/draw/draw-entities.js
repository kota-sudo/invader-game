/**
 * Game entity drawing functions separated from main.js
 * Contains drawing functions for player, enemies, bullets, etc.
 */

import { game } from '../game/game-store.js';
import { CANVAS_W as W, CANVAS_H as H, CHARGE_MAX } from '../game/constants.js';
import { keyOutGreenAndFlatBackdrop } from './sprite-alpha-key.js';
import { PET_POOL, getPlanetEnemyColors } from '../game-data.js';
import { drawShipShape } from './draw-ship-shape.js';
import { DRAGON_LORD_CHAR_ID, drawDragonLordBattle } from './dragon-lord-portrait.js';
import { getImage } from '../game/image-cache.js';
import { applyBossRenderTransform, ensureBossRenderState, isDragonLordBoss } from '../game/boss-render.js';
import { drawDragonLordTelegraphs } from '../game/dragon-lord-boss.js';

let drawDeps;

const _bossChromaCache = new Map();
const _BOSS_CHROMA_VER = 'v3';
function getChromaKeyedCanvas(src) {
  const cacheKey = `${src}\0${_BOSS_CHROMA_VER}`;
  if (_bossChromaCache.has(cacheKey)) return _bossChromaCache.get(cacheKey);
  const img = getImage(src);
  if (!img?.complete || !img.naturalWidth || img.naturalHeight <= 0) return null;
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  const cv = (typeof OffscreenCanvas !== 'undefined')
    ? new OffscreenCanvas(w, h)
    : Object.assign(document.createElement('canvas'), { width: w, height: h });
  const c = cv.getContext('2d', { willReadFrequently: true });
  if (!c) return null;
  c.drawImage(img, 0, 0);
  try {
    const im = c.getImageData(0, 0, w, h);
    keyOutGreenAndFlatBackdrop(im);
    c.putImageData(im, 0, 0);
  } catch (_) {
    // If ImageData is blocked (rare), fallback to raw image.
    return null;
  }
  _bossChromaCache.set(cacheKey, cv);
  return cv;
}

export function setDrawDependencies(deps) {
  drawDeps = deps;
}

/** 竜王キャラ装備時：プレイヤー矩形内にスプライトを収めて描画（当たり判定はその矩形のまま）。 */
function tryDrawDragonLordSprite(ctx) {
  if (game.playerLoadout?.charId !== DRAGON_LORD_CHAR_ID) return false;
  const p = game.player;
  if (!p || !Number.isFinite(p.x)) return false;
  try {
    return drawDragonLordBattle(ctx, p, game.frameCount);
  } catch (err) {
    console.warn('tryDrawDragonLordSprite', err);
    try {
      ctx.restore();
    } catch (_) {}
    return false;
  }
}

/** バリア：矩形ではなく円形グラデ＋細い六角リング（デバッグ枠に見えないよう輪郭は円滑にフェード） */
function drawPlayerBarrierField(ctx, cx, cy, bw, bh, frameCount) {
  const base = Math.max(bw, bh) * 0.52 + 14;
  const pulse = 1 + Math.sin(frameCount * 0.065) * 0.038;
  const outerR = base * pulse;

  ctx.save();

  const g = ctx.createRadialGradient(cx, cy - 2, Math.max(6, base * 0.1), cx, cy, outerR);
  g.addColorStop(0, 'rgba(200,252,255,0.11)');
  g.addColorStop(0.38, 'rgba(70,215,255,0.055)');
  g.addColorStop(0.72, 'rgba(40,170,230,0.028)');
  g.addColorStop(1, 'rgba(0,90,160,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, outerR, 0, Math.PI * 2);
  ctx.fill();

  const hexStroke = (r, rot, alpha, lineW, blur) => {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = rot + (i / 6) * Math.PI * 2 - Math.PI / 2;
      const x = cx + Math.cos(a) * r;
      const y = cy + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.strokeStyle = `rgba(160,238,255,${alpha})`;
    ctx.lineWidth = lineW;
    ctx.shadowColor = `rgba(0,230,255,${Math.min(0.55, alpha + 0.15)})`;
    ctx.shadowBlur = blur;
    ctx.stroke();
    ctx.shadowBlur = 0;
  };

  hexStroke(outerR * 0.91, frameCount * 0.0115, 0.26, 1.05, 4);
  hexStroke(outerR * 0.79, -frameCount * 0.009 + Math.PI / 7, 0.17, 0.8, 2.5);

  ctx.restore();
}

/** 機体の手前・赤黒背景でも位置が一目で分かるように（影は機体より先に描く） */
function drawPlayerGroundShadow(ctx, p) {
  const cx = p.x + p.w / 2;
  const foot = p.y + p.h + 2;
  ctx.save();
  ctx.globalAlpha = 0.42;
  const rx = p.w * 0.44;
  const ry = 12;
  const g = ctx.createRadialGradient(cx, foot, 1, cx, foot, Math.max(rx, ry) * 1.15);
  g.addColorStop(0, 'rgba(10,4,18,0.72)');
  g.addColorStop(0.45, 'rgba(6,2,12,0.38)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(cx, foot, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 0.22;
  const lift = ctx.createRadialGradient(cx, foot - 4, 0, cx, foot, Math.max(rx, ry) * 1.45);
  lift.addColorStop(0, 'rgba(80,220,255,0.16)');
  lift.addColorStop(0.55, 'rgba(40,120,200,0.06)');
  lift.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = lift;
  ctx.beginPath();
  ctx.ellipse(cx, foot - 3, rx * 1.05, ry * 1.2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** 楕円リム＋コア（矩形枠は使わずバリア／機体の一体感を優先） */
function drawPlayerVisibilityAccent(ctx, p, frameCount) {
  const cx = p.x + p.w / 2;
  const cy = p.y + p.h / 2;
  const pulse = 0.82 + Math.sin(frameCount * 0.11) * 0.18;
  ctx.save();

  ctx.globalCompositeOperation = 'lighter';
  const cr = Math.min(p.w, p.h) * 0.16;
  const cg = ctx.createRadialGradient(cx, cy - 1, 0, cx, cy, cr * 2.85);
  cg.addColorStop(0, `rgba(255,255,255,${0.38 * pulse})`);
  cg.addColorStop(0.18, `rgba(210,252,255,${0.26 * pulse})`);
  cg.addColorStop(0.45, `rgba(120,230,255,${0.12 * pulse})`);
  cg.addColorStop(1, 'rgba(40,160,255,0)');
  ctx.fillStyle = cg;
  ctx.beginPath();
  ctx.arc(cx, cy - 1, cr * 2.85, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalCompositeOperation = 'source-over';

  ctx.strokeStyle = `rgba(185,250,255,${0.42 + pulse * 0.1})`;
  ctx.lineWidth = 1.05;
  ctx.shadowColor = 'rgba(0,210,255,0.38)';
  ctx.shadowBlur = 7;
  ctx.beginPath();
  ctx.ellipse(cx, cy - 1, p.w * 0.5 + 1.5, p.h * 0.54 + 1.5, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.restore();
}

/** プライマリ（Z長押し）チャージ中：機体周りのオーラ＋リング（HUD と併せて判別しやすく） */
function drawPlayerPrimaryChargeVfx(ctx, p) {
  if (game.chargeTimer < 10 || game.dashTimer > 0) return;
  const ratio = Math.min(1, game.chargeTimer / CHARGE_MAX);
  const ready = !!game.chargeReady;
  const cx = p.x + p.w / 2;
  const cy = p.y + p.h * 0.42;
  const pulse = 0.5 + Math.sin(game.frameCount * (ready ? 0.28 : 0.18)) * 0.5;
  const baseR = Math.max(p.w, p.h) * (0.62 + ratio * 0.38);

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const g1 = ctx.createRadialGradient(cx, cy, 0, cx, cy, baseR * (1.05 + pulse * 0.08));
  if (ready) {
    g1.addColorStop(0, `rgba(255,255,220,${0.42 + pulse * 0.2})`);
    g1.addColorStop(0.35, `rgba(255,200,80,${0.28})`);
    g1.addColorStop(0.65, `rgba(255,80,40,${0.14})`);
    g1.addColorStop(1, 'rgba(255,40,20,0)');
  } else {
    g1.addColorStop(0, `rgba(255,180,100,${0.12 + ratio * 0.2})`);
    g1.addColorStop(0.45, `rgba(255,120,60,${0.08 + ratio * 0.12})`);
    g1.addColorStop(1, 'rgba(200,60,30,0)');
  }
  ctx.fillStyle = g1;
  ctx.beginPath();
  ctx.arc(cx, cy, baseR * 1.12, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalCompositeOperation = 'source-over';

  ctx.strokeStyle = ready
    ? `rgba(255,255,200,${0.55 + pulse * 0.35})`
    : `rgba(255,160,90,${0.35 + ratio * 0.35})`;
  ctx.lineWidth = ready ? 2.4 : 1.6;
  ctx.shadowColor = ready ? 'rgba(255,220,120,0.9)' : 'rgba(255,120,60,0.55)';
  ctx.shadowBlur = ready ? 16 : 8 + ratio * 8;
  const arcR = baseR * 0.72;
  for (let k = 0; k < 3; k++) {
    const a0 = game.frameCount * (ready ? 0.09 : 0.055) + k * (Math.PI * 2 / 3);
    const a1 = a0 + Math.PI * (ready ? 1.15 : 0.85);
    ctx.beginPath();
    ctx.arc(cx, cy, arcR - k * 5, a0, a1);
    ctx.stroke();
  }
  ctx.shadowBlur = 0;
  ctx.restore();
}

function drawPlayer(){
  const ctx = drawDeps.ctx;
  if (!game.player) return;
  if(game.powerupActive==='invincible'||game.player.invincibleTimer>0){
    if(Math.floor(game.frameCount/4)%2===0) return;
  }
  const p = game.player;
  const isDragonLord = game.playerLoadout?.charId === DRAGON_LORD_CHAR_ID;
  if (!isDragonLord) drawPlayerGroundShadow(ctx, p);

  drawPlayerPrimaryChargeVfx(ctx, p);

  const drewDragon = tryDrawDragonLordSprite(ctx);
  if (!drewDragon) {
    drawShipShape(ctx, p.x, p.y, p.w, p.h);
  }
  if (!isDragonLord) {
    drawPlayerVisibilityAccent(ctx, p, game.frameCount);
  }

  const barrierOn = game.playerShield
    || (game.chaosBuff?.type === 'shield' && (game.chaosBuff.timer || 0) > 0);
  if (barrierOn) {
    const cx = p.x + p.w / 2;
    const cy = p.y + p.h / 2;
    drawPlayerBarrierField(ctx, cx, cy, p.w, p.h, game.frameCount);
  }
}

function drawMuzzleFlashes(){
  const ctx = drawDeps.ctx;
  for (const m of game.muzzleFlashes) {
    const a = m.timer / m.maxTimer;
    const charge = m.kind === 'charge';
    const rCore = charge ? (1 - a) * 38 + 10 : (1 - a) * 16 + 4;
    const pulse = 1 + Math.sin((game.frameCount + m.timer * 3) * 0.55) * (charge ? 0.08 : 0.05);

    ctx.save();
    if (charge) {
      const r2 = rCore * 1.35 * pulse;
      const gr2 = ctx.createRadialGradient(m.x, m.y - 2, 0, m.x, m.y - 2, r2);
      gr2.addColorStop(0, `rgba(255,240,180,${a * 0.45})`);
      gr2.addColorStop(0.35, `rgba(255,140,40,${a * 0.28})`);
      gr2.addColorStop(0.7, `rgba(120,220,255,${a * 0.12})`);
      gr2.addColorStop(1, 'transparent');
      ctx.fillStyle = gr2;
      ctx.fillRect(m.x - r2, m.y - r2 - 4, r2 * 2, r2 * 2 + 8);
    }

    const gr = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, rCore * pulse);
    gr.addColorStop(0, charge ? `rgba(255,255,245,${a * 0.95})` : `rgba(255,255,210,${a * 0.85})`);
    gr.addColorStop(0.25, charge ? `rgba(255,220,120,${a * 0.5})` : `rgba(255,255,180,${a * 0.35})`);
    gr.addColorStop(0.55, charge ? `rgba(90,200,255,${a * 0.22})` : `rgba(255,255,200,${a * 0.12})`);
    gr.addColorStop(1, 'transparent');
    ctx.fillStyle = gr;
    ctx.fillRect(m.x - rCore * pulse, m.y - rCore * pulse, rCore * pulse * 2, rCore * pulse * 2);

    if (charge && a > 0.35) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = `rgba(255,255,255,${(a - 0.35) * 0.9})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(m.x, m.y - 3, rCore * 0.55, -Math.PI * 0.25, Math.PI * 0.35);
      ctx.stroke();
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.restore();
  }
}

/** update-tick の発射間隔と揃える（見た目の発射予兆用） */
function getInvShootInterval(inv) {
  return inv.invType === 'sniper'
    ? Math.max(50, 160 - game.stage * 8)
    : (inv.shootInterval ?? 120);
}

/** 次の発射直前の強さ 0〜1 */
function invShootWindupT(inv, frames = 22) {
  const iv = getInvShootInterval(inv);
  const st = inv.shootTimer ?? 0;
  if (iv <= 0) return 0;
  const start = Math.max(0, iv - frames);
  return Math.min(1, Math.max(0, (st - start) / frames));
}

function drawInvaderHpBar(ctx, inv, hover) {
  if (inv.hp >= inv.maxHp) return;
  const barW = inv.w;
  const y = inv.y + hover - 10;
  ctx.fillStyle = 'rgba(255,0,0,0.8)';
  ctx.fillRect(inv.x, y, barW, 5);
  ctx.fillStyle = 'rgba(0,255,0,0.8)';
  ctx.fillRect(inv.x, y, barW * (inv.hp / inv.maxHp), 5);
}

function drawUFODrone(inv){
  const ctx = drawDeps.ctx;
  drawEnemyHoverShadow(ctx, inv, 0);
  const cx=inv.x+inv.w/2, cy=inv.y+inv.h/2;
  ctx.save();
  ctx.translate(cx,cy);
  ctx.rotate(game.frameCount*0.02);
  ctx.fillStyle='#2a5088';
  ctx.beginPath(); ctx.ellipse(0,3,inv.w/2,inv.h/3,0,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='#4af';
  ctx.beginPath(); ctx.ellipse(0,0,inv.w/2,inv.h/3,0,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='rgba(255,255,255,0.6)';
  ctx.beginPath(); ctx.ellipse(0,-inv.h/6,inv.w/3,inv.h/4,0,0,Math.PI*2); ctx.fill();
  const rp = 0.5 + 0.5 * Math.sin(game.frameCount * 0.18);
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = `rgba(255,55,45,${0.42 + rp * 0.38})`;
  ctx.shadowColor = 'rgba(255,60,40,0.85)';
  ctx.shadowBlur = 6;
  ctx.beginPath();
  ctx.arc(-inv.w / 2 + 5, inv.h / 10, 2.4, 0, Math.PI * 2);
  ctx.arc(inv.w / 2 - 5, inv.h / 10, 2.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.globalCompositeOperation = 'source-over';
  ctx.restore();
  drawInvaderHpBar(ctx, inv, 0);
}

function drawSpider(inv){
  const ctx = drawDeps.ctx;
  drawEnemyHoverShadow(ctx, inv, 0);
  const cx=inv.x+inv.w/2, cy=inv.y+inv.h/2;
  ctx.save();
  ctx.translate(cx,cy);
  // 脚
  ctx.strokeStyle='#7dffc8'; ctx.lineWidth=2;
  ctx.shadowColor='rgba(80,255,180,0.35)'; ctx.shadowBlur=4;
  for(let i=0;i<4;i++){
    const a=i*Math.PI/2+game.frameCount*0.01;
    ctx.beginPath(); ctx.moveTo(0,0);
    ctx.lineTo(Math.cos(a)*inv.w/2,Math.sin(a)*inv.h/2);
    ctx.stroke();
  }
  ctx.shadowBlur=0;
  // 本体（緑脚と差別化）
  ctx.fillStyle='#3a2050';
  ctx.beginPath(); ctx.ellipse(0,0,inv.w/2,inv.h/2,0,0,Math.PI*2); ctx.fill();
  ctx.strokeStyle='rgba(160,100,200,0.55)'; ctx.lineWidth=1.5;
  ctx.stroke();
  ctx.globalCompositeOperation='lighter';
  ctx.fillStyle='#ff3038';
  ctx.shadowColor='rgba(255,40,50,0.9)'; ctx.shadowBlur=5;
  ctx.beginPath();
  ctx.arc(-inv.w*0.22, inv.h*0.26, 2.1, 0, Math.PI*2);
  ctx.arc(inv.w*0.22, inv.h*0.26, 2.1, 0, Math.PI*2);
  ctx.fill();
  ctx.shadowBlur=0;
  ctx.globalCompositeOperation='source-over';
  ctx.restore();
  drawInvaderHpBar(ctx, inv, 0);
}

function drawCrystal(inv){
  const ctx = drawDeps.ctx;
  drawEnemyHoverShadow(ctx, inv, 0);
  const cx=inv.x+inv.w/2, cy=inv.y+inv.h/2;
  const wind = invShootWindupT(inv);
  ctx.save();
  ctx.translate(cx,cy);
  ctx.rotate(game.frameCount*0.03);
  ctx.fillStyle='#556080';
  ctx.beginPath();
  for(let i=0;i<6;i++){
    const a=i*Math.PI/3;
    const x=Math.cos(a)*inv.w/2, y=Math.sin(a)*inv.h/2;
    if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
  }
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle=`rgba(120,220,255,${0.35+wind*0.45})`;
  ctx.lineWidth=2;
  ctx.shadowColor=`rgba(100,200,255,${0.25+wind*0.5})`;
  ctx.shadowBlur=4+wind*10;
  ctx.stroke();
  ctx.shadowBlur=0;
  if(wind>0.05){
    ctx.globalCompositeOperation='lighter';
    ctx.fillStyle=`rgba(255,100,220,${wind*0.35})`;
    ctx.beginPath();
    ctx.arc(0,0,inv.w*0.18,0,Math.PI*2);
    ctx.fill();
    ctx.globalCompositeOperation='source-over';
  }
  ctx.restore();
  drawInvaderHpBar(ctx, inv, 0);
}

function drawHeavy(inv){
  const ctx = drawDeps.ctx;
  drawEnemyHoverShadow(ctx, inv, 0);
  const cx=inv.x+inv.w/2, cy=inv.y+inv.h/2;
  const wind = invShootWindupT(inv);
  ctx.save();
  ctx.translate(cx,cy);
  ctx.fillStyle='#8a7860';
  ctx.fillRect(-inv.w/2,-inv.h/2,inv.w,inv.h);
  ctx.strokeStyle=`rgba(255,200,120,${0.25+wind*0.5})`;
  ctx.lineWidth=2;
  ctx.strokeRect(-inv.w/2,-inv.h/2,inv.w,inv.h);
  ctx.fillStyle='rgba(40,35,30,0.75)';
  ctx.fillRect(-inv.w/3,-inv.h/2-4,inv.w*2/3,5);
  ctx.fillStyle='#cca';
  ctx.fillRect(-inv.w/2+3,-inv.h/2+4,inv.w-6,inv.h-10);
  if(wind>0.08){
    ctx.globalCompositeOperation='lighter';
    ctx.strokeStyle=`rgba(255,180,80,${wind*0.55})`;
    ctx.lineWidth=3;
    ctx.beginPath();
    ctx.arc(0,0,Math.max(inv.w,inv.h)*0.58,0,Math.PI*2);
    ctx.stroke();
    ctx.globalCompositeOperation='source-over';
  }
  ctx.restore();
  drawInvaderHpBar(ctx, inv, 0);
}

/** Stage1 NORMAL 用：論理座標の下に薄い楕円影（見た目のみ）。ctx.ellipse 非対応環境向けに arc+scale を使用。 */
function drawEnemyHoverShadow(ctx, inv, hover) {
  ctx.save();
  const cx = inv.x + inv.w / 2;
  const cy = inv.y + inv.h + 2 + hover;
  const rx = Math.max(1, inv.w * 0.38);
  const ry = Math.max(2.2, inv.h * 0.11);
  ctx.translate(cx, cy);
  ctx.scale(1, ry / rx);
  ctx.fillStyle = 'rgba(6, 10, 20, 0.26)';
  ctx.beginPath();
  ctx.arc(0, 0, rx, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** Stage1 NORMAL 用：中央付近の控えめなコア発光（画像の上に重ねる）。 */
function drawNormalEnemyCoreGlow(ctx, inv, hover, frame) {
  const cx = inv.x + inv.w / 2;
  const cy = inv.y + inv.h / 2 + hover;
  const pulse = 0.7 + Math.sin(frame * 0.15) * 0.3;
  const r = 5 + pulse * 2.5;
  ctx.save();
  const gr = ctx.createRadialGradient(cx, cy + 1, 0, cx, cy + 1, r + 4);
  gr.addColorStop(0, `rgba(255, 150, 90, ${0.32 * pulse})`);
  gr.addColorStop(0.4, `rgba(255, 95, 45, ${0.14 * pulse})`);
  gr.addColorStop(1, 'rgba(255, 50, 20, 0)');
  ctx.fillStyle = gr;
  ctx.shadowBlur = 6 + pulse * 4;
  ctx.shadowColor = `rgba(255, 110, 55, ${0.26 * pulse})`;
  ctx.beginPath();
  ctx.arc(cx, cy + 1, r + 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.shadowColor = 'transparent';
  ctx.restore();
}

/** 種類別シルエット（小型でも役割が一目で分かる配色・発光・発射予兆） */
function drawTypedInvaderSilhouette(ctx, inv) {
  const frame = game.frameCount;
  const hover = Math.sin((frame + inv.x) * 0.08) * 1.5;
  const bx = inv.x;
  const by = inv.y + hover;
  const w = inv.w;
  const h = inv.h;
  const kind = inv.invType || 'normal';

  drawEnemyHoverShadow(ctx, inv, hover);

  const wind = invShootWindupT(inv);
  const rushPulse = inv.behavior === 'rush' ? 0.12 * Math.sin(frame * 0.28) : 0;

  ctx.save();

  switch (kind) {
    case 'normal': {
      ctx.fillStyle = '#221c2e';
      ctx.beginPath();
      ctx.roundRect(bx + 2, by + 4, w - 4, h - 8, 3);
      ctx.fill();
      ctx.fillStyle = '#161018';
      ctx.fillRect(bx + 4, by + h * 0.38, w - 8, 3);
      const pulse =
        (0.55 + 0.45 * Math.sin(frame * 0.19 + inv.x * 0.08)) * (1 - wind * 0.35) +
        wind * 0.55;
      ctx.globalCompositeOperation = 'lighter';
      const gunBoost = 1 + wind * 1.35;
      ctx.fillStyle = `rgba(255,55,45,${(0.48 + pulse * 0.42) * gunBoost})`;
      ctx.shadowColor = 'rgba(255,45,35,0.85)';
      ctx.shadowBlur = 4 + pulse * 3 + wind * 10;
      ctx.beginPath();
      ctx.arc(bx + 9, by + h * 0.56, 2.6 + wind * 2.2, 0, Math.PI * 2);
      ctx.arc(bx + w - 9, by + h * 0.56, 2.6 + wind * 2.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = `rgba(255,100,80,${(0.28 + pulse * 0.22) + wind * 0.38})`;
      ctx.beginPath();
      ctx.arc(bx + w / 2, by + h * 0.44, 2.2 + wind * 1.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.globalCompositeOperation = 'source-over';
      if (wind > 0.06) {
        ctx.strokeStyle = `rgba(255,210,140,${0.35 + wind * 0.5})`;
        ctx.lineWidth = 1.5 + wind * 2;
        ctx.beginPath();
        ctx.moveTo(bx + w * 0.28, by + h - 3);
        ctx.lineTo(bx + w * 0.72, by + h - 3);
        ctx.stroke();
      }
      break;
    }
    case 'fast': {
      const tipX = bx + w / 2;
      const tipY = by + h - 1;
      ctx.fillStyle = '#2a1f36';
      ctx.strokeStyle = `rgba(255,115,55,${0.72 + rushPulse})`;
      ctx.lineWidth = 2;
      ctx.shadowColor = 'rgba(255,75,40,0.55)';
      ctx.shadowBlur = 7 + rushPulse * 8;
      ctx.beginPath();
      ctx.moveTo(tipX, tipY);
      ctx.lineTo(bx + 1, by + 4);
      ctx.lineTo(bx + w - 1, by + 4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = 'rgba(255,60,200,0.5)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(tipX, tipY - h * 0.42);
      ctx.lineTo(tipX, tipY - 3);
      ctx.stroke();
      break;
    }
    case 'tank': {
      ctx.fillStyle = '#353440';
      ctx.fillRect(bx + 2, by + 7, w - 4, h - 12);
      ctx.fillStyle = '#0f0e16';
      ctx.fillRect(bx, by + h - 7, w, 6);
      ctx.fillStyle = '#252830';
      ctx.fillRect(bx + 5, by + h - 6, w - 10, 2);
      ctx.fillStyle = '#484653';
      ctx.beginPath();
      ctx.arc(bx + w / 2, by + h * 0.38, Math.min(w, h) * 0.2, 0, Math.PI * 2);
      ctx.fill();
      if (wind > 0.02) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = `rgba(255,210,90,${0.22 + wind * 0.48})`;
        ctx.fillRect(bx + w * 0.22, by + h - 13, w * 0.56, 3);
        ctx.globalCompositeOperation = 'source-over';
      }
      break;
    }
    case 'sniper': {
      ctx.fillStyle = '#2e3448';
      ctx.fillRect(bx + 3, by + 5, w - 6, h * 0.52);
      ctx.fillStyle = '#252a38';
      ctx.fillRect(bx + w * 0.32, by + h * 0.45, w * 0.36, h * 0.38);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const mAlpha = 0.18 + wind * 0.72;
      ctx.fillStyle = `rgba(140,235,255,${mAlpha})`;
      ctx.shadowColor = `rgba(90,210,255,${0.35 + wind * 0.55})`;
      ctx.shadowBlur = 5 + wind * 14;
      ctx.fillRect(bx + w / 2 - 2.5, by + h * 0.52, 5, h * 0.38);
      ctx.beginPath();
      ctx.arc(bx + w / 2, by + h - 4, 3.2 + wind * 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.restore();
      break;
    }
    case 'bomber': {
      ctx.fillStyle = '#322630';
      ctx.beginPath();
      ctx.roundRect(bx + 2, by + 4, w - 4, h - 8, 5);
      ctx.fill();
      ctx.strokeStyle =
        wind > 0.12
          ? `rgba(255,235,90,${0.45 + wind * 0.42})`
          : 'rgba(170,130,200,0.4)';
      ctx.lineWidth = 2;
      if (wind > 0.08) {
        ctx.shadowColor = 'rgba(255,215,70,0.75)';
        ctx.shadowBlur = 9 + wind * 8;
      }
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = `rgba(255,70,200,${0.12 + wind * 0.38})`;
      ctx.fillRect(bx + w * 0.28, by + h - 9, w * 0.44, 4);
      ctx.globalCompositeOperation = 'source-over';
      break;
    }
    default: {
      const row = inv.row ?? 0;
      const tier = row <= 0 ? 0 : row <= 1 ? 1 : 2;
      const cols = getPlanetEnemyColors(game.stage);
      const accent = cols[tier] || '#cc3311';
      ctx.fillStyle = '#251f28';
      ctx.beginPath();
      ctx.roundRect(bx + 2, by + 3, w - 4, h - 6, 2);
      ctx.fill();
      ctx.strokeStyle = accent;
      ctx.lineWidth = 1.5;
      ctx.globalAlpha = 0.88;
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.fillStyle = accent;
      ctx.globalAlpha = 0.62;
      ctx.fillRect(bx + w * 0.35, by + h - 8, w * 0.3, 3);
      ctx.globalAlpha = 1;
      break;
    }
  }

  ctx.restore();

  ctx.save();
  ctx.strokeStyle = `rgba(255, 118, 72, ${0.14 + wind * 0.34})`;
  ctx.lineWidth = 1;
  ctx.strokeRect(bx + 0.5, by + 0.5, w - 1, h - 1);
  ctx.restore();

  const hitT = inv.hitFlashTimer || 0;
  if (hitT > 0) {
    const strength = 0.25 + 0.2 * (hitT / 8) + 0.06 * Math.sin(frame * 0.88);
    ctx.fillStyle = `rgba(255, 236, 230, ${Math.min(0.44, strength)})`;
    ctx.fillRect(bx, by, w, h);
  } else if (inv.hp < inv.maxHp) {
    const a = 0.09 + 0.07 * Math.sin(frame * 0.42);
    ctx.fillStyle = `rgba(255, 232, 224, ${a})`;
    ctx.fillRect(bx, by, w, h);
  }

  drawInvaderHpBar(ctx, inv, hover);
}

/**
 * Stage1 + normal + 画像ロード済み専用。inv の x,y,w,h は変更せず描画のみオフセット。
 */
function drawStage1NormalImageEnemy(ctx, inv, img) {
  const frame = game.frameCount;
  const hover = Math.sin((frame + inv.x) * 0.08) * 1.5;
  const tilt = Math.sin((frame + inv.y) * 0.055) * 0.026;
  const wind = invShootWindupT(inv);

  drawEnemyHoverShadow(ctx, inv, hover);

  ctx.save();
  ctx.translate(inv.x + inv.w / 2, inv.y + inv.h / 2 + hover);
  ctx.rotate(tilt);
  ctx.drawImage(img, -inv.w / 2, -inv.h / 2, inv.w, inv.h);
  ctx.strokeStyle = `rgba(255, 105, 65, ${0.18 + wind * 0.42})`;
  ctx.lineWidth = 1.15;
  ctx.strokeRect(-inv.w / 2 - 0.5, -inv.h / 2 - 0.5, inv.w + 1, inv.h + 1);
  if (wind > 0.05) {
    ctx.globalCompositeOperation = 'lighter';
    const blink = 0.55 + 0.45 * Math.sin(frame * 0.9);
    ctx.fillStyle = `rgba(255, 200, 120, ${wind * blink * 0.35})`;
    ctx.fillRect(-inv.w * 0.22, inv.h * 0.38, inv.w * 0.44, 4 + wind * 5);
    ctx.fillStyle = `rgba(255, 240, 200, ${wind * blink * 0.28})`;
    ctx.beginPath();
    ctx.arc(0, inv.h * 0.08, 3 + wind * 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
  }
  const hitT = inv.hitFlashTimer || 0;
  if (hitT > 0) {
    const strength = 0.25 + 0.2 * (hitT / 8) + 0.06 * Math.sin(frame * 0.88);
    const a = Math.min(0.44, strength);
    ctx.fillStyle = `rgba(255, 236, 230, ${a})`;
    ctx.fillRect(-inv.w / 2, -inv.h / 2, inv.w, inv.h);
  } else if (inv.hp < inv.maxHp) {
    const a = 0.09 + 0.07 * Math.sin(frame * 0.42);
    ctx.fillStyle = `rgba(255, 232, 224, ${a})`;
    ctx.fillRect(-inv.w / 2, -inv.h / 2, inv.w, inv.h);
  }
  ctx.restore();

  drawNormalEnemyCoreGlow(ctx, inv, hover, frame + wind * 8);
}

function drawInvaders(){
  const ctx = drawDeps.ctx;
  const s1NormalSrc = (game.stage === 1) ? './assets/enemies/mars/normal-1-1.png' : null;
  game.invaders.forEach(inv=>{
    const s1NormalCorpseFlash =
      game.stage === 1 &&
      inv.invType === 'normal' &&
      !inv.alive &&
      (inv.hitFlashTimer || 0) > 0;
    if (!inv.alive && !s1NormalCorpseFlash) return;
    if(inv.invType==='ufo_drone'){ drawUFODrone(inv); return; }
    if(inv.invType==='spider'){ drawSpider(inv); return; }
    if(inv.invType==='crystal'){ drawCrystal(inv); return; }
    if(inv.invType==='heavy'){ drawHeavy(inv); return; }
    if (s1NormalSrc && inv.invType === 'normal') {
      const img = getImage(s1NormalSrc);
      if (img?.complete && img.naturalWidth) {
        try {
          drawStage1NormalImageEnemy(ctx, inv, img);
        } catch (e) {
          console.error('drawStage1NormalImageEnemy', e);
          drawTypedInvaderSilhouette(ctx, inv);
        }
        return;
      }
    }
    drawTypedInvaderSilhouette(ctx, inv);
  });
}

function drawHealers(){
  const ctx = drawDeps.ctx;
  for(const h of game.healers){
    if(!h.alive) continue;
    ctx.shadowColor='#0f0'; ctx.shadowBlur=12; ctx.fillStyle='#0f0';
    ctx.beginPath(); ctx.arc(h.x+h.w/2,h.y+h.h/2,h.w/2,0,Math.PI*2); ctx.fill();
    ctx.shadowBlur=0;
    // + mark
    ctx.strokeStyle='#000'; ctx.lineWidth=2;
    ctx.beginPath(); ctx.moveTo(h.x+h.w/2-6,h.y+h.h/2);
    ctx.lineTo(h.x+h.w/2+6,h.y+h.h/2);
    ctx.moveTo(h.x+h.w/2,h.y+h.h/2-6);
    ctx.lineTo(h.x+h.w/2,h.y+h.h/2+6);
    ctx.stroke();
  }
}

function drawAsteroids(){
  const ctx = drawDeps.ctx;
  for(const ast of game.asteroids){
    if(!ast.alive) continue;
    ctx.save();
    ctx.translate(ast.x+ast.w/2,ast.y+ast.h/2);
    ctx.rotate(ast.rot||0);
    ctx.fillStyle='#8a8a90';
    ctx.beginPath();
    for(let i=0;i<8;i++){
      const ang=i*Math.PI/4;
      const rr=(ast.w/2)*(0.8+Math.random()*0.4);
      const x=Math.cos(ang)*rr, y=Math.sin(ang)*rr;
      if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
    }
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle='rgba(200,205,220,0.35)'; ctx.lineWidth=1;
    ctx.stroke();
    ctx.restore();
  }
}

function drawMeteors(){
  const ctx = drawDeps.ctx;
  for (const m of game.meteors) {
    const cx = m.x + m.w / 2;
    const cy = m.y + m.h / 2;
    const vy = m.vy || 4;
    const rot = m.rot || 0;
    const trailH = 14 + vy * 5;

    ctx.save();
    const tg = ctx.createLinearGradient(cx, cy - trailH - m.h * 0.5, cx, cy + m.h * 0.35);
    tg.addColorStop(0, 'rgba(255,220,160,0)');
    tg.addColorStop(0.35, `rgba(255,140,60,${0.15 + Math.min(0.25, vy * 0.03)})`);
    tg.addColorStop(0.72, 'rgba(255,90,30,0.45)');
    tg.addColorStop(1, 'rgba(40,20,10,0.55)');
    ctx.fillStyle = tg;
    ctx.beginPath();
    ctx.moveTo(cx - m.w * 0.35, cy - trailH);
    ctx.lineTo(cx + m.w * 0.35, cy - trailH);
    ctx.lineTo(cx + m.w * 0.22, cy + m.h * 0.2);
    ctx.lineTo(cx - m.w * 0.22, cy + m.h * 0.2);
    ctx.closePath();
    ctx.fill();

    ctx.globalCompositeOperation = 'lighter';
    for (let s = 0; s < 4; s++) {
      const py = cy - trailH * (0.35 + s * 0.22);
      const px = cx + Math.sin(game.frameCount * 0.4 + s + m.x) * (3 + s);
      ctx.fillStyle = `rgba(255,255,200,${0.12 - s * 0.022})`;
      ctx.beginPath();
      ctx.arc(px, py, 1.2 + s * 0.35, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';

    ctx.translate(cx, cy);
    ctx.rotate(rot);
    ctx.shadowColor = 'rgba(255,90,40,0.85)';
    ctx.shadowBlur = 12 + vy;
    const body = ctx.createLinearGradient(-m.w * 0.5, -m.h * 0.5, m.w * 0.45, m.h * 0.5);
    body.addColorStop(0, '#4a3020');
    body.addColorStop(0.45, '#8a5030');
    body.addColorStop(0.75, '#c86838');
    body.addColorStop(1, '#5c3820');
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.moveTo(0, -m.h * 0.48);
    ctx.lineTo(m.w * 0.42, -m.h * 0.08);
    ctx.lineTo(m.w * 0.35, m.h * 0.42);
    ctx.lineTo(-m.w * 0.08, m.h * 0.48);
    ctx.lineTo(-m.w * 0.42, m.h * 0.12);
    ctx.lineTo(-m.w * 0.32, -m.h * 0.28);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = 'rgba(255,200,120,0.35)';
    ctx.beginPath();
    ctx.moveTo(-m.w * 0.08, -m.h * 0.2);
    ctx.lineTo(m.w * 0.18, m.h * 0.05);
    ctx.lineTo(-m.w * 0.05, m.h * 0.25);
    ctx.closePath();
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';

    ctx.fillStyle = `rgba(255,255,220,${0.55 + Math.sin(game.frameCount * 0.5) * 0.15})`;
    ctx.beginPath();
    ctx.arc(m.w * 0.08, -m.h * 0.22, m.w * 0.14, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,160,80,0.9)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.restore();
  }
}

function drawBoss(){
  const ctx = drawDeps.ctx;
  const b=game.boss;
  if (!b) return;
  ensureBossRenderState(b);
  // シールド
  if(b.shielded){
    ctx.strokeStyle='rgba(255,0,255,0.6)'; ctx.lineWidth=3;
    ctx.strokeRect(b.x-10,b.y-10,b.w+20,b.h+20);
  }
  // 竜王だけ: render transform を使って描画（当たり判定 b.x/y/w/h は固定）
  if (isDragonLordBoss(b)) {
    // 1-1ボスは従来画像に戻す（竜王の新立ち絵はプレイヤー用）
    const bossSrc = (game.stage === 1)
      ? './assets/enemies/mars/boss-1-1.png'
      : './assets/enemies/mars/dragon-lord-boss.png';
    const bossImg = getImage(bossSrc);
    const bossKeyed = bossSrc.includes('dragon-lord-boss.png') ? getChromaKeyedCanvas(bossSrc) : null;
    const glowA = Math.max(0, Math.min(1, b.render?.glowAlpha || 0));
    const flashA = Math.max(0, Math.min(1, b.render?.flashAlpha || 0));
    const afterA = Math.max(0, Math.min(1, b.render?.afterimageAlpha || 0));
    const spearDashActive = b.attackAnim?.type === 'spearDash' && b.attackAnim?.phase === 'active' && afterA > 0.001;
    const wingActive = b.attackAnim?.type === 'wingBarrage' && b.attackAnim?.phase === 'active';
    const dir = b.dir || 1;

    applyBossRenderTransform(ctx, b, ({ x, y, w, h }) => {
      // Afterimages (active only): draw 2–3 copies slightly behind.
      if (spearDashActive) {
        ctx.save();
        ctx.globalCompositeOperation = 'source-over';
        for (let i = 1; i <= 3; i++) {
          const a = afterA * (0.18 - i * 0.04);
          if (a <= 0.01) continue;
          const dx = -dir * (12 + i * 12);
          const dy = 2 + i * 1.5;
          ctx.globalAlpha = a;
          if (bossKeyed) ctx.drawImage(bossKeyed, x + dx, y + dy, w, h);
          else if (bossImg?.complete && bossImg.naturalWidth) ctx.drawImage(bossImg, x + dx, y + dy, w, h);
          // tint slightly pink (cheap, safe)
          ctx.globalCompositeOperation = 'screen';
          ctx.fillStyle = 'rgba(255,60,140,0.12)';
          ctx.fillRect(x + dx, y + dy, w, h);
          ctx.globalCompositeOperation = 'source-over';
        }
        ctx.globalAlpha = 1;
        ctx.restore();
      }

      if (bossKeyed) {
        ctx.drawImage(bossKeyed, x, y, w, h);
      } else if (bossImg?.complete && bossImg.naturalWidth) {
        ctx.drawImage(bossImg, x, y, w, h);
      } else {
        ctx.fillStyle='#f80';
        ctx.fillRect(x, y, w, h);
      }

      // Subtle rim light (always on, but weak) — improves readability on dark backgrounds.
      // This is purely visual (draw-time only).
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      ctx.globalAlpha = 0.09;
      ctx.shadowColor = 'rgba(255,60,160,0.35)';
      ctx.shadowBlur = 18;
      if (bossKeyed) ctx.drawImage(bossKeyed, x, y, w, h);
      else if (bossImg?.complete && bossImg.naturalWidth) ctx.drawImage(bossImg, x, y, w, h);
      ctx.restore();

      if (flashA > 0.001) {
        ctx.globalAlpha = flashA;
        // thin white-red overlay (avoid pure white washout)
        ctx.fillStyle = 'rgba(255,170,190,0.55)';
        ctx.fillRect(x, y, w, h);
        ctx.globalAlpha = 1;
      }

      if (glowA > 0.001) {
        const gx = x + w * 0.52;
        const gy = y + h * 0.44; // slightly above center (chest core)
        const rr = Math.max(10, Math.min(w, h) * 0.22);
        const gr = ctx.createRadialGradient(gx, gy, rr * 0.12, gx, gy, rr);
        gr.addColorStop(0, `rgba(255,90,190,${0.75 * glowA})`);
        gr.addColorStop(0.35, `rgba(255,30,140,${0.28 * glowA})`);
        gr.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.save();
        ctx.shadowColor = `rgba(255,40,150,${0.55 * glowA})`;
        ctx.shadowBlur = 12 + glowA * 10; // 12–22
        ctx.globalCompositeOperation = 'screen';
        ctx.fillStyle = gr;
        ctx.fillRect(gx - rr, gy - rr, rr * 2, rr * 2);
        ctx.globalCompositeOperation = 'source-over';
        ctx.restore();
      }

      // Spear tip glow (optional): during spearDash phases, add a small glow near spear.
      if (b.attackAnim?.type === 'spearDash' && glowA > 0.001) {
        const sx = x + w * 0.18;
        const sy = y + h * 0.30;
        const sr = Math.max(8, Math.min(w, h) * 0.14);
        const sg = ctx.createRadialGradient(sx, sy, 0, sx, sy, sr);
        sg.addColorStop(0, `rgba(255,120,220,${0.55 * glowA})`);
        sg.addColorStop(0.5, `rgba(255,40,160,${0.18 * glowA})`);
        sg.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        ctx.shadowColor = `rgba(255,60,170,${0.4 * glowA})`;
        ctx.shadowBlur = 10 + glowA * 10;
        ctx.fillStyle = sg;
        ctx.fillRect(sx - sr, sy - sr, sr * 2, sr * 2);
        ctx.globalCompositeOperation = 'source-over';
        ctx.restore();
      }

      // Wing barrage energy ring (active only)
      if (wingActive) {
        const t = Math.max(0, Math.min(1, (b.attackAnim?.timer || 0) / 16));
        const pulse = 0.65 + 0.35 * Math.sin((game.frameCount || 0) * 0.22);
        const alpha = Math.max(0.18, Math.min(0.32, 0.22 + 0.10 * pulse));
        const cx = x + w / 2;
        const cy = y + h / 2 - h * 0.06;
        const baseR = Math.max(w, h) * 0.55;
        const r0 = baseR * (0.65 + 0.55 * t);

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.globalCompositeOperation = 'screen';
        ctx.strokeStyle = `rgba(255, 40, 160, ${0.78})`;
        ctx.lineWidth = 2.6;
        ctx.shadowColor = `rgba(255, 40, 160, ${0.50})`;
        ctx.shadowBlur = 12 + 8 * pulse; // 12–20
        ctx.beginPath();
        ctx.arc(cx, cy, r0, 0, Math.PI * 2);
        ctx.stroke();
        // second faint ring
        ctx.globalAlpha = alpha * 0.62;
        ctx.lineWidth = 1.7;
        ctx.beginPath();
        ctx.arc(cx, cy, r0 * 0.78, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    });
    drawDragonLordTelegraphs(ctx, b);
  } else {
    // その他ボスは従来通り（影響範囲を竜王に限定）
    ctx.fillStyle='#f80';
    ctx.fillRect(b.x,b.y,b.w,b.h);
  }

  // HP bar
  const barW=b.w;
  ctx.fillStyle='rgba(255,0,0,0.8)'; ctx.fillRect(b.x,b.y-15,barW,8);
  ctx.fillStyle='rgba(0,255,0,0.8)'; ctx.fillRect(b.x,b.y-15,barW*(b.hp/b.maxHp),8);
}

function drawMiniBosses(){
  const ctx = drawDeps.ctx;
  for(const mb of game.miniBosses){
    if(!mb.alive) continue;
    ctx.shadowColor='#f80'; ctx.shadowBlur=16; ctx.fillStyle='#f80';
    ctx.fillRect(mb.x,mb.y,mb.w,mb.h);
    ctx.shadowBlur=0;
    // HP bar
    const barW=mb.w;
    ctx.fillStyle='rgba(255,0,0,0.8)'; ctx.fillRect(mb.x,mb.y-12,barW,6);
    ctx.fillStyle='rgba(0,255,0,0.8)'; ctx.fillRect(mb.x,mb.y-12,barW*(mb.hp/mb.maxHp),6);
  }
}

/** 画面上部を横切るボーナス機（旧マゼンタ円盤＋数字は敵／HP／ダメージと誤認されやすいため、賞品っぽく明示） */
function drawUFO(){
  const ctx = drawDeps.ctx;
  const u = game.ufo;
  if (!u) return;
  const cx = u.x + u.w / 2;
  const cy = u.y + u.h / 2;
  const bob = Math.sin(game.frameCount * 0.11) * 1.8;

  ctx.save();
  ctx.textAlign = 'center';

  ctx.globalAlpha = 0.4;
  ctx.fillStyle = 'rgba(12,8,4,0.55)';
  ctx.beginPath();
  ctx.ellipse(cx, u.y + u.h + 4, u.w * 0.42, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  const pillY = cy + bob - 2;
  const pw = u.w + 10;
  const ph = u.h + 8;
  const px = cx - pw / 2;

  const g = ctx.createLinearGradient(px, pillY - ph / 2, px + pw, pillY + ph / 2);
  g.addColorStop(0, '#fff6d0');
  g.addColorStop(0.35, '#ffd54a');
  g.addColorStop(0.75, '#e8a010');
  g.addColorStop(1, '#b47200');
  ctx.shadowColor = 'rgba(255,210,100,0.9)';
  ctx.shadowBlur = 16;
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.roundRect(px, pillY - ph / 2, pw, ph, Math.min(14, ph / 2));
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = 'rgba(255,248,220,0.92)';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.beginPath();
  ctx.roundRect(cx - 30, pillY - ph / 2 - 15, 60, 13, 4);
  ctx.fill();
  ctx.fillStyle = '#fff3c6';
  ctx.font = 'bold 8px Orbitron,Courier New,sans-serif';
  ctx.fillText('★ BONUS ★', cx, pillY - ph / 2 - 5);

  ctx.fillStyle = '#2c1806';
  ctx.font = 'bold 14px Orbitron,Courier New,sans-serif';
  ctx.shadowColor = 'rgba(255,255,255,0.35)';
  ctx.shadowBlur = 4;
  ctx.fillText(`+${u.points}`, cx, pillY + 5);
  ctx.shadowBlur = 0;

  ctx.restore();
  ctx.textAlign = 'left';
}

function drawPowerups(){
  const ctx = drawDeps.ctx;
  const t=game.frameCount*0.05;
  for(const p of game.powerups){
    if(!p.alive) continue;
    ctx.save();
    ctx.translate(p.x+p.w/2,p.y+p.h/2);
    ctx.rotate(t+p.phase||0);
    ctx.fillStyle=p.color||'#ff0';
    ctx.fillRect(-p.w/2,-p.h/2,p.w,p.h);
    ctx.restore();
  }
}

/** 弾の進行方向（画面座標）。直進弾は上向き。 */
function bulletTravelAngle(b) {
  if (b.vx !== undefined && b.vy !== undefined && (b.vx !== 0 || b.vy !== 0)) {
    return Math.atan2(b.vy, b.vx);
  }
  return -Math.PI / 2;
}

function drawBulletMotionTrail(ctx, b, bw, bh, travelAng) {
  const cx = b.x + bw / 2;
  const cy = b.y + bh / 2;
  const dx = Math.cos(travelAng);
  const dy = Math.sin(travelAng);
  const span = Math.max(bw, bh) * 1.45 + 6;
  const bx = cx - dx * span * 0.15;
  const by = cy - dy * span * 0.15;
  const gx = bx - dx * span;
  const gy = by - dy * span;
  const perpX = -dy * (bw * 0.55 + 2);
  const perpY = dx * (bw * 0.55 + 2);

  const g = ctx.createLinearGradient(bx, by, gx, gy);
  if (b.explosive) {
    g.addColorStop(0, 'rgba(255,200,120,0.42)');
    g.addColorStop(0.5, 'rgba(255,120,60,0.18)');
    g.addColorStop(1, 'rgba(255,80,20,0)');
  } else if (b.reflected) {
    g.addColorStop(0, 'rgba(180,255,200,0.38)');
    g.addColorStop(0.55, 'rgba(100,220,255,0.15)');
    g.addColorStop(1, 'rgba(80,200,255,0)');
  } else {
    g.addColorStop(0, 'rgba(160,255,255,0.4)');
    g.addColorStop(0.45, 'rgba(80,220,250,0.16)');
    g.addColorStop(1, 'rgba(40,180,255,0)');
  }
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(bx + perpX * 0.35, by + perpY * 0.35);
  ctx.lineTo(bx - perpX * 0.35, by - perpY * 0.35);
  ctx.lineTo(gx - perpX * 0.85, gy - perpY * 0.85);
  ctx.lineTo(gx + perpX * 0.85, gy + perpY * 0.85);
  ctx.closePath();
  ctx.fill();
}

function drawPlayerBulletBlob(ctx, b, bw, bh, travelAng) {
  const cx = b.x + bw / 2;
  const cy = b.y + bh / 2;
  const flicker = 0.92 + 0.08 * Math.sin(game.frameCount * 0.35 + b.x * 0.1);

  ctx.save();
  drawBulletMotionTrail(ctx, b, bw, bh, travelAng);

  const explosive = !!b.explosive;
  ctx.shadowColor = explosive ? 'rgba(255,160,80,0.65)' : 'rgba(100,255,255,0.55)';
  ctx.shadowBlur = explosive ? 9 : 7;
  const body = ctx.createLinearGradient(b.x, b.y + bh, b.x, b.y);
  if (explosive) {
    body.addColorStop(0, `rgba(220,90,20,${0.92 * flicker})`);
    body.addColorStop(0.4, `rgba(255,200,80,${0.96 * flicker})`);
    body.addColorStop(1, `rgba(255,255,220,${0.94 * flicker})`);
  } else {
    body.addColorStop(0, `rgba(0,180,220,${0.95 * flicker})`);
    body.addColorStop(0.45, `rgba(120,250,255,${0.98 * flicker})`);
    body.addColorStop(1, `rgba(230,255,255,${0.92 * flicker})`);
  }
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.roundRect(b.x, b.y, bw, bh, Math.min(3, bw * 0.35));
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.globalCompositeOperation = 'lighter';
  const cg = ctx.createRadialGradient(cx, cy + bh * 0.12, 0, cx, cy, Math.max(bw, bh) * 0.72);
  if (explosive) {
    cg.addColorStop(0, `rgba(255,255,255,${0.5 * flicker})`);
    cg.addColorStop(0.4, 'rgba(255,220,120,0.22)');
    cg.addColorStop(1, 'rgba(255,100,40,0)');
  } else {
    cg.addColorStop(0, `rgba(255,255,255,${0.55 * flicker})`);
    cg.addColorStop(0.35, 'rgba(180,255,255,0.28)');
    cg.addColorStop(1, 'rgba(40,200,255,0)');
  }
  ctx.fillStyle = cg;
  ctx.beginPath();
  ctx.roundRect(b.x - 0.5, b.y - 0.5, bw + 1, bh + 1, Math.min(3.5, bw * 0.4));
  ctx.fill();
  ctx.globalCompositeOperation = 'source-over';
  ctx.strokeStyle = explosive ? 'rgba(90,30,8,0.5)' : 'rgba(0,60,90,0.45)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();
}

function drawChargedBullet(ctx, b, bw, bh) {
  const cx = b.x + bw / 2;
  const cy = b.y + bh / 2;
  const t = game.frameCount * 0.09 + (b.x + b.y) * 0.02;
  const pulse = 1 + Math.sin(t * 1.7) * 0.06;
  const r = Math.max(bw, bh) * 0.52 * pulse;

  ctx.save();
  ctx.shadowColor = 'rgba(255,200,100,0.45)';
  ctx.shadowBlur = 18;
  const outer = ctx.createRadialGradient(cx, cy, r * 0.2, cx, cy, r * 1.45);
  outer.addColorStop(0, 'rgba(255,255,240,0.55)');
  outer.addColorStop(0.25, 'rgba(255,220,120,0.35)');
  outer.addColorStop(0.55, 'rgba(90,220,255,0.25)');
  outer.addColorStop(1, 'rgba(40,120,255,0)');
  ctx.fillStyle = outer;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 1.45, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.globalCompositeOperation = 'lighter';
  const core = ctx.createRadialGradient(cx, cy - bh * 0.08, 0, cx, cy, r * 0.95);
  core.addColorStop(0, 'rgba(255,255,255,0.95)');
  core.addColorStop(0.35, 'rgba(255,230,150,0.55)');
  core.addColorStop(0.7, 'rgba(120,240,255,0.35)');
  core.addColorStop(1, 'rgba(60,160,255,0)');
  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.88, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = `rgba(255,255,255,${0.35 + Math.sin(t * 2) * 0.12})`;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(cx, cy, r * (1.05 + Math.sin(t) * 0.04), -t * 0.8, -t * 0.8 + Math.PI * 1.25);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy, r * (0.82 - Math.sin(t * 1.1) * 0.03), t * 0.6, t * 0.6 + Math.PI * 0.9);
  ctx.stroke();

  const streakLen = bh * 1.5;
  const sg = ctx.createLinearGradient(cx, cy + r, cx, cy + r + streakLen);
  sg.addColorStop(0, 'rgba(255,200,120,0.5)');
  sg.addColorStop(0.45, 'rgba(80,200,255,0.22)');
  sg.addColorStop(1, 'rgba(40,140,255,0)');
  ctx.fillStyle = sg;
  ctx.beginPath();
  ctx.moveTo(cx - bw * 0.22, cy + r * 0.4);
  ctx.lineTo(cx + bw * 0.22, cy + r * 0.4);
  ctx.lineTo(cx + bw * 0.08, cy + r + streakLen);
  ctx.lineTo(cx - bw * 0.08, cy + r + streakLen);
  ctx.closePath();
  ctx.fill();

  ctx.globalCompositeOperation = 'source-over';
  ctx.strokeStyle = 'rgba(40,100,160,0.45)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.65, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawBullets(){
  const ctx = drawDeps.ctx;
  for(const b of game.bullets){
    if (b.alive === false) continue;
    const bw = b.w || 5;
    const bh = b.h || 15;
    const travelAng = bulletTravelAngle(b);
    if (b.charged) {
      drawChargedBullet(ctx, b, bw, bh);
    } else if(b.homing){
      const hx = b.x + bw / 2;
      const hy = b.y + bh / 2;
      ctx.save();
      drawBulletMotionTrail(ctx, b, bw, bh, travelAng);
      ctx.shadowColor = 'rgba(255,100,255,0.55)';
      ctx.shadowBlur = 12;
      const hb = ctx.createLinearGradient(b.x, b.y + bh, b.x + bw * 0.3, b.y);
      hb.addColorStop(0, '#c040e8');
      hb.addColorStop(0.45, '#ff88ff');
      hb.addColorStop(1, '#ffd0ff');
      ctx.fillStyle = hb;
      ctx.beginPath();
      ctx.roundRect(b.x, b.y, bw, bh, Math.min(4, bw * 0.4));
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.globalCompositeOperation = 'lighter';
      const hg = ctx.createRadialGradient(hx, hy + bh * 0.1, 0, hx, hy, Math.max(bw, bh) * 0.85);
      hg.addColorStop(0, 'rgba(255,255,255,0.65)');
      hg.addColorStop(0.4, 'rgba(255,200,255,0.35)');
      hg.addColorStop(1, 'rgba(200,80,255,0)');
      ctx.fillStyle = hg;
      ctx.fillRect(b.x - 1, b.y - 1, bw + 2, bh + 2);
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = 1;
      ctx.strokeRect(b.x + 0.5, b.y + 0.5, bw - 1, bh - 1);
      ctx.restore();
    } else if(b.laser){
      ctx.save();
      const shimmer = 0.85 + 0.15 * Math.sin(game.frameCount * 0.42 + b.y * 0.08);
      ctx.shadowColor = `rgba(180,255,255,${0.45 * shimmer})`;
      ctx.shadowBlur = 14 * shimmer;
      const g = ctx.createLinearGradient(b.x - 2, b.y + bh, b.x + 2, b.y);
      g.addColorStop(0, `rgba(0,140,220,${0.95 * shimmer})`);
      g.addColorStop(0.35, '#66ffff');
      g.addColorStop(0.55, '#ffffff');
      g.addColorStop(0.72, '#aaffff');
      g.addColorStop(1, `rgba(220,255,255,${0.92 * shimmer})`);
      ctx.fillStyle = g;
      ctx.fillRect(b.x, b.y, bw, bh);
      ctx.shadowBlur = 0;
      ctx.globalCompositeOperation = 'lighter';
      const slit = ctx.createLinearGradient(b.x + bw / 2, b.y + bh, b.x + bw / 2, b.y);
      slit.addColorStop(0, 'rgba(255,255,255,0)');
      slit.addColorStop(0.48, `rgba(255,255,255,${0.55 * shimmer})`);
      slit.addColorStop(0.52, `rgba(255,255,255,${0.55 * shimmer})`);
      slit.addColorStop(1, 'rgba(200,255,255,0)');
      ctx.fillStyle = slit;
      ctx.fillRect(b.x, b.y, bw, bh);
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = `rgba(0,80,120,${0.45 * shimmer})`;
      ctx.lineWidth = 1;
      ctx.strokeRect(b.x + 0.5, b.y + 0.5, bw - 1, bh - 1);
      ctx.restore();
    } else {
      drawPlayerBulletBlob(ctx, b, bw, bh, travelAng);
    }
  }
  /* 敵弾：エネルギー弾＋進行方向トレイル（菱形のみだとUIマーカーに見えるため） */
  for (const b of game.invaderBullets) {
    if (b.alive === false) continue;
    const bw = b.w || 4;
    const bh = b.h || 4;
    const cx = b.x + bw / 2;
    const cy = b.y + bh / 2;
    const ang = bulletTravelAngle(b);
    const dx = Math.cos(ang);
    const dy = Math.sin(ang);
    const span = Math.max(bw, bh) * 1.8 + 10;

    ctx.save();
    const tg = ctx.createLinearGradient(cx - dx * span, cy - dy * span, cx, cy);
    tg.addColorStop(0, 'rgba(255,200,120,0)');
    tg.addColorStop(0.45, 'rgba(255,100,40,0.35)');
    tg.addColorStop(0.85, 'rgba(255,60,20,0.55)');
    tg.addColorStop(1, 'rgba(120,20,10,0.65)');
    ctx.fillStyle = tg;
    ctx.beginPath();
    const px = -dy * (bw * 0.55 + 1);
    const py = dx * (bw * 0.55 + 1);
    ctx.moveTo(cx - dx * span * 0.85 + px * 0.4, cy - dy * span * 0.85 + py * 0.4);
    ctx.lineTo(cx - dx * span * 0.85 - px * 0.4, cy - dy * span * 0.85 - py * 0.4);
    ctx.lineTo(cx + dx * (bw * 0.35) - px * 0.25, cy + dy * (bw * 0.35) - py * 0.25);
    ctx.lineTo(cx + dx * (bw * 0.35) + px * 0.25, cy + dy * (bw * 0.35) + py * 0.25);
    ctx.closePath();
    ctx.fill();

    ctx.translate(cx, cy);
    ctx.rotate(ang + Math.PI / 4);
    ctx.shadowColor = 'rgba(255,90,40,0.9)';
    ctx.shadowBlur = 10;
    const g = ctx.createLinearGradient(-bw, 0, bw, 0);
    g.addColorStop(0, '#6a1808');
    g.addColorStop(0.35, '#ff5018');
    g.addColorStop(0.55, '#ffcc88');
    g.addColorStop(1, '#ffd7a8');
    ctx.fillStyle = g;
    ctx.fillRect(-bw * 0.72, -bh * 0.72, bw * 1.45, bh * 1.45);
    ctx.shadowBlur = 0;
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = 'rgba(255,255,220,0.5)';
    ctx.beginPath();
    ctx.arc(-bw * 0.15, -bh * 0.12, Math.min(bw, bh) * 0.22, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = 'rgba(40,10,4,0.75)';
    ctx.lineWidth = 1.25;
    ctx.strokeRect(-bw * 0.72, -bh * 0.72, bw * 1.45, bh * 1.45);
    ctx.restore();
  }
}

function drawCoinPickups() {
  const ctx = drawDeps.ctx;
  const drops = game.coinPickups;
  if (!drops?.length) return;
  const t = game.frameCount;
  for (const c of drops) {
    if (!c.alive) continue;
    const flick = 0.72 + 0.28 * Math.sin(t * 0.22 + (c.phase || 0));
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.rotate(c.rot || 0);
    ctx.globalAlpha = 0.88 * flick;
    ctx.shadowColor = 'rgba(255,215,90,0.65)';
    ctx.shadowBlur = 8 + flick * 4;
    ctx.fillStyle = '#ffd84a';
    ctx.beginPath();
    ctx.roundRect(-7, -5, 14, 10, 3);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(180,100,20,0.75)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = `rgba(255,255,220,${0.35 * flick})`;
    ctx.fillRect(-4, -3, 5, 4);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.restore();
  }
}

function drawBossMinions(){
  const ctx = drawDeps.ctx;
  for(const m of game.bossMinions){
    if(!m.alive) continue;
    const hpRatio=m.hp/m.maxHp;
    ctx.fillStyle='#fa0';
    ctx.fillRect(m.x,m.y,m.w,m.h);
    // HP bar
    const barW=m.w;
    ctx.fillStyle='rgba(255,0,0,0.8)'; ctx.fillRect(m.x,m.y-8,barW,4);
    ctx.fillStyle='rgba(0,255,0,0.8)'; ctx.fillRect(m.x,m.y-8,barW*hpRatio,4);
  }
}

function drawPets(){
  const ctx = drawDeps.ctx;
  if(!game.player||game.state!=='playing') return;
  const activePets=game.playerLoadout.pets.filter(pid=>pid&&game.gachaInventory[pid]).map(pid=>PET_POOL.find(p=>p.id===pid)).filter(Boolean);
  const n = activePets.length;
  const spread = Math.max(18, Math.min(32, 12 + game.player.w * 0.14));
  activePets.forEach((def,i)=>{
    // 自機の上に載せるとキャラを隠すので、足元〜やや下に「サテライト」配置
    const px = game.player.x + game.player.w / 2 + (i - (n - 1) / 2) * spread;
    const py = game.player.y + game.player.h + 9;
    const base = def.color || '#0ff';
    const r = 6.5;
    ctx.save();
    ctx.shadowColor = base;
    ctx.shadowBlur = 5;
    const gr = ctx.createRadialGradient(px - 1.5, py - 1.5, 0, px, py, r + 3);
    gr.addColorStop(0, 'rgba(255,255,255,0.22)');
    gr.addColorStop(0.45, base + '99');
    gr.addColorStop(0.78, base + '55');
    gr.addColorStop(1, 'rgba(20,16,32,0.08)');
    ctx.fillStyle = gr;
    ctx.globalAlpha = 0.88;
    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
    ctx.strokeStyle = base;
    ctx.lineWidth = 1.35;
    ctx.globalAlpha = 0.72;
    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.beginPath();
    ctx.arc(px - r * 0.35, py - r * 0.35, 1.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });
}

function drawDashTrail(){
  const ctx = drawDeps.ctx;
  for(const t of game.dashTrail){
    ctx.globalAlpha=t.alpha*0.4;
    ctx.fillStyle='#4af';
    ctx.fillRect(t.x,t.y,t.w,t.h);
  }
  ctx.globalAlpha=1;
}

// Export all entity drawing functions
export {
  drawPlayer,
  drawMuzzleFlashes,
  drawUFODrone,
  drawSpider,
  drawCrystal,
  drawHeavy,
  drawInvaders,
  drawHealers,
  drawAsteroids,
  drawMeteors,
  drawBoss,
  drawMiniBosses,
  drawUFO,
  drawPowerups,
  drawBullets,
  drawCoinPickups,
  drawBossMinions,
  drawPets,
  drawDashTrail
};
