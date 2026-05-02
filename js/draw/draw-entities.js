/**
 * Game entity drawing functions separated from main.js
 * Contains drawing functions for player, enemies, bullets, etc.
 */

import { game } from '../game/game-store.js';
import { CANVAS_W as W, CANVAS_H as H } from '../game/constants.js';
import { 
  SHIP_SHAPES, 
  SHIP_COLORS, 
  PET_POOL 
} from '../game-data.js';

let drawDeps;

export function setDrawDependencies(deps) {
  drawDeps = deps;
}

function drawPlayer(){
  const ctx = drawDeps.ctx;
  if(game.powerupActive==='invincible'||game.player.invincibleTimer>0){
    if(Math.floor(game.frameCount/4)%2===0) return;
  }
  drawDeps.drawShipShape(game.player.x,game.player.y,game.player.w,game.player.h);
  // ダッシュ中の残像はdashTrailで描画
  // シールド
  if(game.playerShield){
    ctx.strokeStyle='rgba(0,255,255,0.6)'; ctx.lineWidth=2;
    ctx.strokeRect(game.player.x-4,game.player.y-4,game.player.w+8,game.player.h+8);
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

function drawInvaders(){
  const ctx = drawDeps.ctx;
  game.invaders.forEach(inv=>{
    if(!inv.alive) return;
    if(inv.invType==='ufo_drone'){ drawUFODrone(inv); return; }
    if(inv.invType==='spider'){ drawSpider(inv); return; }
    if(inv.invType==='crystal'){ drawCrystal(inv); return; }
    if(inv.invType==='heavy'){ drawHeavy(inv); return; }
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
  for(const a of game.asteroids){
    if(!a.alive) continue;
    ctx.save();
    ctx.translate(a.x+a.w/2,a.y+a.h/2);
    ctx.rotate(a.rot||0);
    ctx.fillStyle='#666';
    ctx.beginPath();
    for(let i=0;i<8;i++){
      const a=i*Math.PI/4;
      const r=(a.w/2)*(0.8+Math.random()*0.4);
      const x=Math.cos(a)*r, y=Math.sin(a)*r;
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
  // シールド
  if(b.shielded){
    ctx.strokeStyle='rgba(255,0,255,0.6)'; ctx.lineWidth=3;
    ctx.strokeRect(b.x-10,b.y-10,b.w+20,b.h+20);
  }
  // ボス本体（簡易描画）
  ctx.fillStyle='#f80';
  ctx.fillRect(b.x,b.y,b.w,b.h);
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
    if(!b.alive) continue;
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
    if(!b.alive) continue;
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
  activePets.forEach((def,i)=>{
    // Simple pet drawing - circle with color
    ctx.fillStyle=def.color||'#0ff';
    ctx.beginPath(); ctx.arc(game.player.x+30+i*25,game.player.y-10,8,0,Math.PI*2); ctx.fill();
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
