/**
 * Game entity drawing functions separated from main.js
 * Contains drawing functions for player, enemies, bullets, etc.
 */

import { game } from '../game/game-store.js';
import { CANVAS_W as W, CANVAS_H as H } from '../game/constants.js';
import { PET_POOL } from '../game-data.js';
import { drawShipShape } from './draw-ship-shape.js';
import { DRAGON_LORD_CHAR_ID, drawDragonLordBattle } from './dragon-lord-portrait.js';
import { getImage } from '../game/image-cache.js';
import { applyBossRenderTransform, ensureBossRenderState, isDragonLordBoss } from '../game/boss-render.js';

let drawDeps;

const _bossChromaCache = new Map();
function getChromaKeyedCanvas(src) {
  if (_bossChromaCache.has(src)) return _bossChromaCache.get(src);
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
    const d = im.data;
    for (let i = 0; i < d.length; i += 4) {
      const r = d[i], g = d[i + 1], b = d[i + 2];
      // greenscreen: strong green + low red/blue
      if (g > 210 && r < 110 && b < 110) d[i + 3] = 0;
    }
    c.putImageData(im, 0, 0);
  } catch (_) {
    // If ImageData is blocked (rare), fallback to raw image.
    return null;
  }
  _bossChromaCache.set(src, cv);
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

  hexStroke(outerR * 0.91, frameCount * 0.0115, 0.30, 1.15, 5);
  hexStroke(outerR * 0.79, -frameCount * 0.009 + Math.PI / 7, 0.20, 0.85, 3);

  ctx.restore();
}

function drawPlayer(){
  const ctx = drawDeps.ctx;
  if (!game.player) return;
  if(game.powerupActive==='invincible'||game.player.invincibleTimer>0){
    if(Math.floor(game.frameCount/4)%2===0) return;
  }
  if (!tryDrawDragonLordSprite(ctx)) {
    drawShipShape(ctx, game.player.x, game.player.y, game.player.w, game.player.h);
  }
  // ダッシュ中の残像はdashTrailで描画
  const barrierOn = game.playerShield
    || (game.chaosBuff?.type === 'shield' && (game.chaosBuff.timer || 0) > 0);
  if (barrierOn) {
    const cx = game.player.x + game.player.w / 2;
    const cy = game.player.y + game.player.h / 2;
    drawPlayerBarrierField(ctx, cx, cy, game.player.w, game.player.h, game.frameCount);
  }
}

function drawMuzzleFlashes(){
  const ctx = drawDeps.ctx;
  for(const m of game.muzzleFlashes){
    const a=m.timer/m.maxTimer,r=(1-a)*16+4;
    const gr=ctx.createRadialGradient(m.x,m.y,0,m.x,m.y,r);
    gr.addColorStop(0,`rgba(255,255,200,${a*0.8})`);
    gr.addColorStop(1,'transparent');
    ctx.fillStyle=gr; ctx.fillRect(m.x-r,m.y-r,r*2,r*2);
  }
}

function drawUFODrone(inv){
  const ctx = drawDeps.ctx;
  const cx=inv.x+inv.w/2, cy=inv.y+inv.h/2;
  ctx.save();
  ctx.translate(cx,cy);
  ctx.rotate(game.frameCount*0.02);
  ctx.fillStyle='#4af';
  ctx.beginPath(); ctx.ellipse(0,0,inv.w/2,inv.h/3,0,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='rgba(255,255,255,0.6)';
  ctx.beginPath(); ctx.ellipse(0,-inv.h/6,inv.w/3,inv.h/4,0,0,Math.PI*2); ctx.fill();
  ctx.restore();
  // HP bar
  if(inv.hp<inv.maxHp){
    const barW=inv.w;
    ctx.fillStyle='rgba(255,0,0,0.8)'; ctx.fillRect(inv.x,inv.y-10,barW,5);
    ctx.fillStyle='rgba(0,255,0,0.8)'; ctx.fillRect(inv.x,inv.y-10,barW*(inv.hp/inv.maxHp),5);
  }
}

function drawSpider(inv){
  const ctx = drawDeps.ctx;
  const cx=inv.x+inv.w/2, cy=inv.y+inv.h/2;
  ctx.save();
  ctx.translate(cx,cy);
  // 脚
  ctx.strokeStyle='#afa'; ctx.lineWidth=2;
  for(let i=0;i<4;i++){
    const a=i*Math.PI/2+game.frameCount*0.01;
    ctx.beginPath(); ctx.moveTo(0,0);
    ctx.lineTo(Math.cos(a)*inv.w/2,Math.sin(a)*inv.h/2);
    ctx.stroke();
  }
  // 本体
  ctx.fillStyle='#afa';
  ctx.beginPath(); ctx.ellipse(0,0,inv.w/2,inv.h/2,0,0,Math.PI*2); ctx.fill();
  ctx.restore();
  if(inv.hp<inv.maxHp){
    const barW=inv.w;
    ctx.fillStyle='rgba(255,0,0,0.8)'; ctx.fillRect(inv.x,inv.y-10,barW,5);
    ctx.fillStyle='rgba(0,255,0,0.8)'; ctx.fillRect(inv.x,inv.y-10,barW*(inv.hp/inv.maxHp),5);
  }
}

function drawCrystal(inv){
  const ctx = drawDeps.ctx;
  const cx=inv.x+inv.w/2, cy=inv.y+inv.h/2;
  ctx.save();
  ctx.translate(cx,cy);
  ctx.rotate(game.frameCount*0.03);
  ctx.fillStyle='#88a';
  ctx.beginPath();
  for(let i=0;i<6;i++){
    const a=i*Math.PI/3;
    const x=Math.cos(a)*inv.w/2, y=Math.sin(a)*inv.h/2;
    if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
  }
  ctx.closePath(); ctx.fill();
  ctx.restore();
  if(inv.hp<inv.maxHp){
    const barW=inv.w;
    ctx.fillStyle='rgba(255,0,0,0.8)'; ctx.fillRect(inv.x,inv.y-10,barW,5);
    ctx.fillStyle='rgba(0,255,0,0.8)'; ctx.fillRect(inv.x,inv.y-10,barW*(inv.hp/inv.maxHp),5);
  }
}

function drawHeavy(inv){
  const ctx = drawDeps.ctx;
  const cx=inv.x+inv.w/2, cy=inv.y+inv.h/2;
  ctx.save();
  ctx.translate(cx,cy);
  ctx.fillStyle='#cca';
  ctx.fillRect(-inv.w/2,-inv.h/2,inv.w,inv.h);
  ctx.fillStyle='rgba(0,0,0,0.3)';
  ctx.fillRect(-inv.w/3,-inv.h/2-4,inv.w*2/3,4);
  ctx.restore();
  if(inv.hp<inv.maxHp){
    const barW=inv.w;
    ctx.fillStyle='rgba(255,0,0,0.8)'; ctx.fillRect(inv.x,inv.y-10,barW,5);
    ctx.fillStyle='rgba(0,255,0,0.8)'; ctx.fillRect(inv.x,inv.y-10,barW*(inv.hp/inv.maxHp),5);
  }
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
  const r = 4 + pulse * 2;
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

/**
 * Stage1 + normal + 画像ロード済み専用。inv の x,y,w,h は変更せず描画のみオフセット。
 */
function drawStage1NormalImageEnemy(ctx, inv, img) {
  const frame = game.frameCount;
  const hover = Math.sin((frame + inv.x) * 0.08) * 1.5;
  const tilt = Math.sin((frame + inv.y) * 0.055) * 0.026;

  drawEnemyHoverShadow(ctx, inv, hover);

  ctx.save();
  ctx.translate(inv.x + inv.w / 2, inv.y + inv.h / 2 + hover);
  ctx.rotate(tilt);
  ctx.drawImage(img, -inv.w / 2, -inv.h / 2, inv.w, inv.h);
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

  drawNormalEnemyCoreGlow(ctx, inv, hover, frame);
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
          drawDeps.drawInvaderSprite(ctx, inv.x, inv.y, inv.frame, inv.row);
        }
        return;
      }
    }
    // Default invader sprite
    drawDeps.drawInvaderSprite(ctx,inv.x,inv.y,inv.frame,inv.row);
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
    ctx.fillStyle='#666';
    ctx.beginPath();
    for(let i=0;i<8;i++){
      const ang=i*Math.PI/4;
      const rr=(ast.w/2)*(0.8+Math.random()*0.4);
      const x=Math.cos(ang)*rr, y=Math.sin(ang)*rr;
      if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
    }
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }
}

function drawMeteors(){
  const ctx = drawDeps.ctx;
  for(const m of game.meteors){
    ctx.shadowColor='#f84'; ctx.shadowBlur=10; ctx.fillStyle='#f84';
    ctx.beginPath(); ctx.arc(m.x+m.w/2,m.y+m.h/2,m.w/2,0,Math.PI*2); ctx.fill();
    ctx.shadowBlur=0;
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

function drawUFO(){
  const ctx = drawDeps.ctx;
  ctx.shadowColor='#f0f'; ctx.shadowBlur=16; ctx.fillStyle='#f0f';
  ctx.beginPath(); ctx.ellipse(game.ufo.x+game.ufo.w/2,game.ufo.y+10,16,10,0,Math.PI,0); ctx.fill();
  ctx.beginPath(); ctx.ellipse(game.ufo.x+game.ufo.w/2,game.ufo.y+16,game.ufo.w/2,10,0,0,Math.PI*2); ctx.fill();
  ctx.shadowBlur=0;
  ctx.fillStyle='#000'; ctx.font='bold 10px Courier New'; ctx.textAlign='center';
  ctx.fillText(game.ufo.points,game.ufo.x+game.ufo.w/2,game.ufo.y+14); ctx.textAlign='left';
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

function drawBullets(){
  const ctx = drawDeps.ctx;
  // Player bullets
  ctx.fillStyle='#0f0';
  for(const b of game.bullets){
    if (b.alive === false) continue;
    if(b.homing){
      ctx.fillStyle='#f0f';
    } else if(b.laser){
      ctx.fillStyle='#0ff';
    } else {
      ctx.fillStyle='#0f0';
    }
    ctx.fillRect(b.x,b.y,b.w||4,b.h||8);
  }
  // Enemy bullets
  ctx.fillStyle='#f00';
  for(const b of game.invaderBullets){
    if (b.alive === false) continue;
    ctx.fillRect(b.x,b.y,b.w||4,b.h||4);
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
  drawBossMinions,
  drawPets,
  drawDashTrail
};
