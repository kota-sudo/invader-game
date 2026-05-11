import { game, actions } from './game-store.js';
import { CANVAS_W as W, CANVAS_H as H, BULLET_SPEED, INVADER_BULLET_SPEED } from './constants.js';

let drawDeps;
export function setEnvGimmicksDrawDeps(deps) { drawDeps = deps; }

export function initEnvGimmicks() {
  game.gravityZones = []; game.emFields = []; game.blackHoles = [];
  game.meteorRainTimer = 0; game.meteorRainWarning = 0;
  if (game.stage < 3) return;
  const gCount = game.stage >= 6 ? 2 : 1;
  for (let i = 0; i < gCount; i++) {
    game.gravityZones.push({
      x: 120 + Math.random() * (W - 240), y: 50 + Math.random() * (H * 0.42),
      r: 72, strength: 0.32, angle: 0, timer: 900, alive: true
    });
  }
  if (game.stage >= 5) {
    game.emFields.push({
      x: 120 + Math.random() * (W - 240), y: 70 + Math.random() * (H * 0.38),
      r: 58, vx: (Math.random() - 0.5) * 0.6, vy: (Math.random() - 0.5) * 0.4, timer: 700, alive: true
    });
  }
  if (game.stage >= 8) {
    game.blackHoles.push({
      x: 160 + Math.random() * (W - 320), y: 60 + Math.random() * (H * 0.38),
      r: 52, strength: 1.6, angle: 0, timer: 600, alive: true
    });
  }
}

export function updateEnvGimmicks() {
  if (game.bossPhase) { game.gravityZones = []; game.emFields = []; game.blackHoles = []; game.meteorRainTimer = 0; game.meteorRainWarning = 0; return; }

  // 隕石雨フェーズ (stage5+, 1800fに1回)
  if (game.stage >= 5 && !game.bossPhase) {
    if (game.meteorRainWarning > 0) {
      game.meteorRainWarning--;
      if (game.meteorRainWarning === 0) game.meteorRainTimer = 360;
    } else if (game.meteorRainTimer > 0) {
      game.meteorRainTimer--;
      if (Math.random() < 0.18) {
        game.meteors.push({
          x: Math.random() * W,
          y: -26,
          w: 20,
          h: 28,
          vy: 4 + Math.random() * 4,
          alive: true,
          rot: Math.random() * Math.PI * 2,
        });
      }
    } else if (Math.random() < 0.00055) {
      game.meteorRainWarning = 120;
    }
  }
  for (let i = game.gravityZones.length - 1; i >= 0; i--) {
    const gz = game.gravityZones[i];
    gz.angle += 0.018; gz.timer--;
    if (gz.timer <= 0) { game.gravityZones.splice(i, 1); continue; }
    // 敵弾を引き寄せる
    for (const b of game.invaderBullets) {
      const dx = gz.x - (b.x + 2.5), dy = gz.y - (b.y + 7), dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < gz.r * 1.6 && dist > 6) { b.vx = (b.vx || 0) + (dx / dist) * gz.strength; b.vy = (b.vy || INVADER_BULLET_SPEED) + (dy / dist) * gz.strength * 0.5; }
    }
    // 自弾にも弱く影響
    for (const b of game.bullets) {
      if (b.laser || b.charged) continue;
      const dx = gz.x - (b.x + 3), dy = gz.y - (b.y + 7), dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < gz.r && dist > 6) { b.vx = (b.vx || 0) + (dx / dist) * gz.strength * 0.35; b.vy = (b.vy || -BULLET_SPEED) + (dy / dist) * gz.strength * 0.25; }
    }
  }
  for (let i = game.emFields.length - 1; i >= 0; i--) {
    const ef = game.emFields[i];
    ef.x += ef.vx; ef.y += ef.vy; ef.timer--;
    if (ef.x < ef.r || ef.x > W - ef.r) ef.vx *= -1;
    if (ef.y < ef.r || ef.y > H * 0.72) ef.vy *= -1;
    if (ef.timer <= 0) { game.emFields.splice(i, 1); continue; }
    for (let j = game.invaderBullets.length - 1; j >= 0; j--) {
      const b = game.invaderBullets[j];
      if (Math.hypot(ef.x - (b.x + 2.5), ef.y - (b.y + 7)) < ef.r) {
        actions.spawnExplosion(b.x, b.y, '#0cf', 3); game.invaderBullets.splice(j, 1);
      }
    }
  }
  for (let i = game.blackHoles.length - 1; i >= 0; i--) {
    const bh = game.blackHoles[i];
    bh.angle -= 0.05; bh.timer--;
    if (bh.timer <= 0) { game.blackHoles.splice(i, 1); continue; }
    // 敵弾を強く吸引→中心到達で消滅
    for (let j = game.invaderBullets.length - 1; j >= 0; j--) {
      const b = game.invaderBullets[j];
      const dx = bh.x - (b.x + 2.5), dy = bh.y - (b.y + 7), dist = Math.sqrt(dx * dx + dy * dy) || 1;
      if (dist < bh.r * 2) {
        b.vx = (b.vx || 0) + (dx / dist) * bh.strength;
        b.vy = (b.vy || INVADER_BULLET_SPEED) + (dy / dist) * bh.strength;
        if (dist < 12) { game.invaderBullets.splice(j, 1); }
      }
    }
    // 自弾も強く引っ張る
    for (const b of game.bullets) {
      if (b.laser || b.charged) continue;
      const dx = bh.x - (b.x + 3), dy = bh.y - (b.y + 7), dist = Math.sqrt(dx * dx + dy * dy) || 1;
      if (dist < bh.r * 1.5) {
        b.vx = (b.vx || 0) + (dx / dist) * bh.strength * 0.9;
        b.vy = (b.vy || -BULLET_SPEED) + (dy / dist) * bh.strength * 0.6;
      }
    }
    // プレイヤーにも微弱な引力
    if (game.player) {
      const dx = bh.x - (game.player.x + game.player.w / 2), dy = bh.y - (game.player.y + game.player.h / 2), dist = Math.sqrt(dx * dx + dy * dy) || 1;
      if (dist < bh.r * 2.2) {
        game.player.x += dx / dist * 0.35; game.player.y += dy / dist * 0.22;
        game.player.x = Math.max(0, Math.min(W - game.player.w, game.player.x));
        game.player.y = Math.max(0, Math.min(H - game.player.h - 10, game.player.y));
      }
    }
  }
}

export function drawEnvGimmicks() {
  const ctx = drawDeps.ctx;
  // 隕石雨警告 UI は機体・弾に隠れないよう draw-ui の drawMeteorRainEnvOverlay で描画
  for (const gz of game.gravityZones) {
    const a = Math.min(1, gz.timer / 80) * 0.82;
    ctx.globalAlpha = a;
    ctx.strokeStyle = '#f80'; ctx.lineWidth = 2; ctx.shadowColor = '#f80'; ctx.shadowBlur = 14;
    ctx.beginPath(); ctx.arc(gz.x, gz.y, gz.r, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,170,40,0.62)'; ctx.lineWidth = 1.25;
    ctx.beginPath(); ctx.arc(gz.x, gz.y, gz.r * 0.55, gz.angle, gz.angle + Math.PI * 1.3); ctx.stroke();
    ctx.beginPath(); ctx.arc(gz.x, gz.y, gz.r * 0.28, gz.angle + Math.PI, gz.angle + Math.PI * 2.3); ctx.stroke();
    ctx.fillStyle = '#f80'; ctx.font = '9px Orbitron,Courier New'; ctx.textAlign = 'center';
    ctx.shadowBlur = 0; ctx.fillText('GRAVITY', gz.x, gz.y + 4);
    ctx.textAlign = 'left'; ctx.globalAlpha = 1;
  }
  for (const ef of game.emFields) {
    const a = Math.min(1, ef.timer / 80) * 0.82;
    ctx.globalAlpha = a;
    const grad = ctx.createRadialGradient(ef.x, ef.y, 0, ef.x, ef.y, ef.r);
    grad.addColorStop(0, 'rgba(0,220,255,0.2)'); grad.addColorStop(1, 'rgba(0,200,255,0)');
    ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(ef.x, ef.y, ef.r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#5ef'; ctx.lineWidth = 2.25; ctx.shadowColor = '#0cf'; ctx.shadowBlur = 18;
    ctx.beginPath(); ctx.arc(ef.x, ef.y, ef.r, 0, Math.PI * 2); ctx.stroke(); ctx.shadowBlur = 0;
    if (game.frameCount % 5 < 2) {
      const arc = Math.random() * Math.PI * 2;
      ctx.strokeStyle = 'rgba(0,230,255,0.85)'; ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(ef.x + Math.cos(arc) * ef.r * 0.25, ef.y + Math.sin(arc) * ef.r * 0.25);
      ctx.lineTo(ef.x + Math.cos(arc + 0.6) * ef.r * 0.88, ef.y + Math.sin(arc + 0.6) * ef.r * 0.88);
      ctx.stroke();
    }
    ctx.fillStyle = '#0cf'; ctx.font = '9px Orbitron,Courier New'; ctx.textAlign = 'center';
    ctx.fillText('EM FIELD', ef.x, ef.y + 4); ctx.textAlign = 'left'; ctx.globalAlpha = 1; ctx.lineWidth = 1;
  }
  for (const bh of game.blackHoles) {
    const fadeA = Math.min(1, bh.timer / 60);
    ctx.save();
    ctx.globalAlpha = fadeA;
    // 外側の引力リング
    for (let ring = 3; ring >= 1; ring--) {
      const rr = bh.r * (0.6 + ring * 0.35);
      const ga = ctx.createRadialGradient(bh.x, bh.y, 0, bh.x, bh.y, rr);
      ga.addColorStop(0, 'rgba(0,0,0,0)');
      ga.addColorStop(0.6, 'rgba(80,0,120,0.12)');
      ga.addColorStop(1, 'rgba(120,0,200,0.0)');
      ctx.fillStyle = ga; ctx.beginPath(); ctx.arc(bh.x, bh.y, rr, 0, Math.PI * 2); ctx.fill();
    }
    // 渦巻き腕
    ctx.shadowColor = '#aa00ff'; ctx.shadowBlur = 18;
    for (let arm = 0; arm < 3; arm++) {
      const startA = bh.angle + arm * (Math.PI * 2 / 3);
      ctx.strokeStyle = `rgba(160,0,255,0.7)`; ctx.lineWidth = 2;
      ctx.beginPath();
      for (let t = 0; t < 60; t++) {
        const a = startA + t * 0.12, r2 = bh.r * 0.15 + t * (bh.r * 0.015);
        const px2 = bh.x + Math.cos(a) * r2, py2 = bh.y + Math.sin(a) * r2;
        t === 0 ? ctx.moveTo(px2, py2) : ctx.lineTo(px2, py2);
      }
      ctx.stroke();
    }
    // 中心暗黒核
    const gCore = ctx.createRadialGradient(bh.x, bh.y, 0, bh.x, bh.y, bh.r * 0.55);
    gCore.addColorStop(0, 'rgba(0,0,0,1)');
    gCore.addColorStop(0.7, 'rgba(40,0,80,0.9)');
    gCore.addColorStop(1, 'rgba(80,0,160,0)');
    ctx.fillStyle = gCore; ctx.beginPath(); ctx.arc(bh.x, bh.y, bh.r * 0.55, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#cc44ff'; ctx.font = '9px Orbitron,Courier New'; ctx.textAlign = 'center';
    ctx.fillText('BLACK HOLE', bh.x, bh.y + 4); ctx.textAlign = 'left';
    ctx.restore();
  }
}
