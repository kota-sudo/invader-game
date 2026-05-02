import { keys } from './input.js';
import { SHIP_SHAPES } from '../game-data.js';
import {
  CHARGE_MAX,
  BULLET_SPEED,
  INVADER_BULLET_SPEED,
  PLAYER_SPEED_BASE,
  POWERUP_DURATION,
  WAVE_CLEAR_DELAY,
  CANVAS_W as W,
  CANVAS_H as H,
} from './constants.js';
import { game, actions } from './game-store.js';
import { getStageSelectShipTarget, getStageSelectShipFollowStage } from './stage-select-map-geometry.js';

export function runUpdate() {
  game.groundPulse=(game.groundPulse+0.05)%(Math.PI*2);
    if(game.state==='gacha'||game.state==='gacha_result'||game.state==='gacha_rates') return;
    if(game.paused) return;
    // タイトル背景：マウス追従（つきまわり）
    if(game.state==='title' || game.state==='title_warp'){
      const px=Number.isFinite(game.titlePointerX)?game.titlePointerX:W/2;
      const py=Number.isFinite(game.titlePointerY)?game.titlePointerY:H/2;
      const nx=Math.max(-1,Math.min(1,(px-W/2)/(W/2)));
      const ny=Math.max(-1,Math.min(1,(py-H/2)/(H/2)));
      const targetX=nx*18;
      const targetY=ny*12;
      game.titleMoonFX += (targetX-game.titleMoonFX)*0.08;
      game.titleMoonFY += (targetY-game.titleMoonFY)*0.08;
    }
    // ステージ選択：自機スプライトが選択ノードに追従
    if(game.state==='stage_select'){
      // 画面表示演出（ライン描画/ノードフェード）用の開始フレーム
      if(!Number.isFinite(game.stageSelectEnterAt)) game.stageSelectEnterAt=game.frameCount;
      const followS=getStageSelectShipFollowStage(game.stageSelectIdx+1,game.highestStage);
      const tpos=getStageSelectShipTarget(H,followS);
      if(tpos){
        game.stageCharTX=tpos.x;
        game.stageCharTY=tpos.y;
      }
      game.stageCharX+=(game.stageCharTX-game.stageCharX)*0.2;
      game.stageCharY+=(game.stageCharTY-game.stageCharY)*0.2;
      for(const s of game.stars){s.y+=s.speed*0.3;s.twinkle+=0.03;if(s.y>H){s.y=-2;s.x=Math.random()*W;}}
      game.frameCount++; return;
    }
    // stage_select を抜けたら演出用フラグをクリア
    if(game.state!=='stage_select' && Number.isFinite(game.stageSelectEnterAt)) game.stageSelectEnterAt=NaN;
    if(game.state==='title_warp'){
      // ワープ中：星を強く流して、一定時間で遷移
      for(const s of game.stars){
        const lyr=s.layer;
        const dy=s.speed*(0.55+lyr*0.35);
        const dx=s.speed*(-0.9-lyr*0.55);
        s.y+=dy;
        s.x+=dx;
        s.twinkle+=0.05+lyr*0.02;
        if(s.y>H){s.y=-2;s.x=Math.random()*W;}
        if(s.x<-14)s.x=W+14;
        else if(s.x>W+14)s.x=-14;
      }
      game.titleWarpTimer++;
      // 終了直前にSE（1回だけ）
      if(game.titleWarpTimer===38) actions.playSound('warp');
      if(game.titleWarpTimer>=48){
        game.titleWarpTimer=0;
        // ホーム（タイトル）からはまずステージ選択へ遷移する
        //（ステージを選んだ後に出撃準備画面へ行く）
        game.customizeCursor=0;
        const hs=Math.max(1,Number.isFinite(game.highestStage)?game.highestStage:1);
        const maxIdx=Math.max(0,hs-1);
        if(!Number.isFinite(game.stageSelectIdx)) game.stageSelectIdx=0;
        game.stageSelectIdx=Math.max(0,Math.min(maxIdx,game.stageSelectIdx));
        game.stageMapScrollOffset=Math.floor(game.stageSelectIdx/10)*270;
        const followS=getStageSelectShipFollowStage(game.stageSelectIdx+1,game.highestStage);
        const tpos=getStageSelectShipTarget(H,followS);
        if(tpos){ game.stageCharX=tpos.x; game.stageCharY=tpos.y; game.stageCharTX=tpos.x; game.stageCharTY=tpos.y; }
        game.state='stage_select';
      }
      game.frameCount++;
      return;
    }
    if(game.state==='title'){
      const minimal=game.titleBgQuality==='minimal';
      for(const s of game.stars){
        const lyr=s.layer;
        if(minimal){
          s.y+=s.speed*0.2;
          s.twinkle+=0.02;
        }else{
          // タイトルは常時「進んでる」感を少し強める（ワープとの差は残す）
          const dy=s.speed*(0.18+lyr*0.24);
          const dx=s.speed*(-0.34-lyr*0.34);
          s.y+=dy;
          s.x+=dx;
          s.twinkle+=0.024+lyr*0.014;
        }
        if(s.y>H){s.y=-2;s.x=Math.random()*W;}
        if(!minimal){
          if(s.x<-14)s.x=W+14;
          else if(s.x>W+14)s.x=-14;
        }
      }
      game.frameCount++;
      return;
    }
    if(game.state==='customize'||game.state==='loadout'||game.state==='gameover'||game.state==='dead'||game.state==='clear-stage'){
      for(const s of game.stars){s.y+=s.speed*0.2;s.twinkle+=0.02;if(s.y>H){s.y=-2;s.x=Math.random()*W;}}
      game.frameCount++; return;
    }
    if(game.state!=='playing') return;
    game.frameCount++;
  
    for(const s of game.stars){
      s.y+=s.speed*(1+s.layer*0.4); s.twinkle+=0.04;
      if(s.y>H){s.y=-2;s.x=Math.random()*W;}
    }
    if(game.stageClearAnimTimer>0){ game.stageClearAnimTimer--; if(game.stageClearAnimTimer===0&&game.stageResultData){ game.state='stage_result'; } }
    game.matPopups=game.matPopups.filter(p=>{p.y+=p.vy; p.timer--; return p.timer>0;});
    if(game.stageBannerTimer>0) game.stageBannerTimer--;
    if(game.bossWarningTimer>0) game.bossWarningTimer--;
    if(game.powerupActive){game.powerupTimer--;if(game.powerupTimer<=0)game.powerupActive=null;}
    if(game.player.invincibleTimer>0) game.player.invincibleTimer--;
    if(game.hitFlashTimer>0) game.hitFlashTimer--;
    if(game.comboTimer>0){game.comboTimer--;if(game.comboTimer===0)game.combo=0;}
    if(game.comboDisplay){game.comboDisplay.y-=0.5;game.comboDisplay.timer--;if(game.comboDisplay.timer<=0)game.comboDisplay=null;}
    if(game.lifeGainDisplay){game.lifeGainDisplay.timer--;if(game.lifeGainDisplay.timer<=0)game.lifeGainDisplay=null;}
    if(game.levelUpDisplay){game.levelUpDisplay.timer--;if(game.levelUpDisplay.timer<=0)game.levelUpDisplay=null;}
    game.muzzleFlashes=game.muzzleFlashes.filter(m=>{m.timer--;return m.timer>0;});
    if(game.ultimateActive){
      game.ultimateTimer--;
      if(game.ultimateTimer<=0) game.ultimateActive=false;
      if(game.ultimateTimer%6===0) actions.triggerFlash(255,220,50,0.15);
    }
  
    // ダッシュ
    if(game.dashCooldown>0) game.dashCooldown--;
    if(game.dashTimer>0){
      game.dashTimer--;
      game.player.x=Math.max(0,Math.min(W-game.player.w,game.player.x+(game.player._dashVx||0)));
      game.player.y=Math.max(H/2,Math.min(H-game.player.h-2,game.player.y+(game.player._dashVy||0)));
      game.dashTrail.push({x:game.player.x,y:game.player.y,w:game.player.w,h:game.player.h,alpha:0.5});
    } else { game.player._dashVx=0; game.player._dashVy=0; }
    game.dashTrail=game.dashTrail.filter(t=>{t.alpha-=0.08;return t.alpha>0;});
  
    // チャージ溜め
    if((keys['KeyZ']||keys['Space'])&&game.dashTimer===0){
      if(game.chargeTimer<CHARGE_MAX) game.chargeTimer++;
      if(game.chargeTimer===CHARGE_MAX&&!game.chargeReady){ game.chargeReady=true; actions.playSound('charge_full'); }
    }
  
    const _shSpd=SHIP_SHAPES[game.shipShapeIdx].id==='agile'?1:SHIP_SHAPES[game.shipShapeIdx].id==='heavy'?-1:0;
    const pspd=PLAYER_SPEED_BASE+game.playerUpgrades.speed+_shSpd+game.playerStats.spd;
    if(game.dashTimer===0){
      if(keys['ArrowLeft']||keys['KeyA']) game.player.x=Math.max(0,game.player.x-pspd);
      if(keys['ArrowRight']||keys['KeyD']) game.player.x=Math.min(W-game.player.w,game.player.x+pspd);
      if(keys['ArrowUp']||keys['KeyW']) game.player.y=Math.max(H/2,game.player.y-pspd);
      if(keys['ArrowDown']||keys['KeyS']) game.player.y=Math.min(H-game.player.h-2,game.player.y+pspd);
      // タッチ操作: 仮想ジョイスティック
      if(game.joystick?.active){
        const JR=65, jdx=game.joystick.dx, jdy=game.joystick.dy;
        const jdist=Math.sqrt(jdx*jdx+jdy*jdy);
        if(jdist>4){
          const ratio=jdist/JR;
          const jspd=pspd*ratio*1.4;
          game.player.x=Math.max(0,Math.min(W-game.player.w,game.player.x+jdx/jdist*jspd));
          game.player.y=Math.max(H/2,Math.min(H-game.player.h-2,game.player.y+jdy/jdist*jspd));
        }
      } else if(game.touchPos){
        const tpx=Math.max(0,Math.min(W-game.player.w,game.touchPos.x-game.player.w/2));
        const tpy=Math.max(H/2,Math.min(H-game.player.h-2,game.touchPos.y-game.player.h/2));
        const tdx=tpx-game.player.x, tdy=tpy-game.player.y;
        const td=Math.sqrt(tdx*tdx+tdy*tdy);
        if(td>1){ const ts=Math.min(td*0.3,pspd*2.5); game.player.x+=tdx/td*ts; game.player.y+=tdy/td*ts; }
      }
    }

    // 通常射撃（チャージ中は撃てない）
    if(game.chargeTimer<10){
      const cooldown=Math.max(8,20-game.playerUpgrades.firerate*3-(game.powerupActive==='double'?8:0));
      if((keys['KeyZ']||keys['Space']||game.touchPos||game.joystick?.active)&&game.frameCount-game.lastShot>cooldown){
        actions.fireBullet();
        game.muzzleFlashes.push({x:game.player.x+game.player.w/2,y:game.player.y-4,timer:8,maxTimer:8});
        game.lastShot=game.frameCount;
      }
    }
  
    // 弾更新
    const toExplode=[];
    game.bullets=game.bullets.filter(b=>{
      const bspd=b.bspd||BULLET_SPEED;
      if(b.homing&&b.target&&'alive' in b.target&&b.target.alive===false) b.target=null;
      if(b.homing&&b.target){
        const tx=(b.target.x||0)+(b.target.w||0)/2,ty=b.target.y||0;
        const dx=tx-(b.x+3),dy=ty-(b.y+7);
        const len=Math.sqrt(dx*dx+dy*dy)||1;
        b.vx+=(dx/len)*0.6; b.vy+=(dy/len)*0.6;
        const spd=Math.sqrt(b.vx*b.vx+b.vy*b.vy);
        if(spd>bspd){b.vx=b.vx/spd*bspd;b.vy=b.vy/spd*bspd;}
        b.x+=b.vx; b.y+=b.vy;
      } else if(b.vx!==undefined&&b.vy!==undefined){
        b.x+=b.vx; b.y+=b.vy;
      } else {
        b.y-=bspd;
      }
      // 爆発弾は壁or上端でも爆発
      if(b.explosive&&(b.y<=0)){toExplode.push({x:b.x+b.w/2,y:b.y+b.h/2});return false;}
      return b.y+b.h>0&&b.y<H&&b.x>-20&&b.x<W+20;
    });
    toExplode.forEach(p=>actions.explodeBomb(p.x,p.y));
  
    game.invaderBullets=game.invaderBullets.filter(b=>{
      if(b.zigzag){b.zigzagPhase=(b.zigzagPhase||0)+0.3;b.x+=Math.sin(b.zigzagPhase)*3;}
      else if(b.vx!==undefined) b.x+=b.vx;
      b.y+=b.vy!==undefined?b.vy:INVADER_BULLET_SPEED;
      return b.y<H&&b.x>-20&&b.x<W+20;
    });
  
    game.particles=game.particles.filter(p=>{p.x+=p.vx;p.y+=p.vy;p.vy+=0.1;p.life-=p.decay;return p.life>0;});
    if(game.shakeTimer>0) game.shakeTimer--;
    actions.trySpawnUFO();
    if(game.ufo){game.ufo.x+=game.ufo.speed;if(game.ufo.x>W+game.ufo.w)game.ufo=null;}
  
    for(let i=game.powerups.length-1;i>=0;i--){
      const p=game.powerups[i]; p.y+=p.vy;
      if(p.y>H){game.powerups.splice(i,1);continue;}
      if(actions.rectsOverlap(p,game.player)){
        if(p.type==='heal'){
          game.playerStats.hp=Math.min(game.playerStats.maxHp,game.playerStats.hp+25); actions.updateHUD();
          game.lifeGainDisplay={text:'HP +25',timer:90,color:'#f44'};
          actions.triggerFlash(255,50,50,0.25); actions.playSound('powerup');
        } else if(p.type==='shield'){
          game.playerShield=true;
          game.lifeGainDisplay={text:'SHIELD ON',timer:90,color:'#4af'};
          actions.triggerFlash(50,150,255,0.2); actions.playSound('powerup');
        } else {
          game.powerupActive=p.type; game.powerupTimer=POWERUP_DURATION;
          actions.triggerFlash(100,255,100,0.2); actions.playSound('powerup');
        }
        game.powerups.splice(i,1);
      }
    }
  
    // スキル選択中は敵・弾丸をフリーズ
    if(game.skillChoices) return;
  
    if(!game.bossPhase){actions.tryTriggerEvent();actions.updateEvent();}
    actions.updateMeteors(); actions.updateAsteroids();
  
    // ボスフェーズ
    if(game.bossPhase){
      // ボス連戦: 次のボスを待機
      if(game.bossRushDelay>0){game.bossRushDelay--;if(game.bossRushDelay===0)actions.spawnBoss();}
      if(game.boss) actions.updateBoss();
      actions.updateMiniBosses();
      actions.updateBossMinions();
      if(game.state!=='playing') return;
      actions.updateHealers(); actions.checkPlayerHit(); return;
    }
  
    // サバイバル: タイマー
    if(game.stageType==='survival'){
      game.survivalTimer--;
      if(game.survivalTimer<=0){
        game.invaders.filter(i=>i.alive).forEach(inv=>{actions.spawnExplosion(inv.x+inv.w/2,inv.y+inv.h/2,'#ff0',8);inv.alive=false;});
        game.invaderBullets=[]; game.bossPhase=true; actions.spawnBoss(); return;
      }
    }
  
    // 護衛: 輸送船更新
    if(game.stageType==='escort') actions.updateEscortShip();
    actions.updatePets();
    if(game.state!=='playing') return;
  
    // パッシブ効果
    if(game.gachaInventory['passive_regen']?.level>=1){
      game.passiveRegenTimer++;
      if(game.passiveRegenTimer>=300){
        game.passiveRegenTimer=0;
        game.playerStats.hp=Math.min(game.playerStats.maxHp,game.playerStats.hp+3);
        actions.updateHUD();
      }
    }
    if(game.playerUpgrades.magnet){
      const px=game.player.x+game.player.w/2, py=game.player.y+game.player.h/2;
      for(const p of game.powerups){
        const dx=px-(p.x+p.w/2), dy=py-(p.y+p.h/2);
        const dist=Math.sqrt(dx*dx+dy*dy)||1;
        if(dist<180){p.x+=dx/dist*4; p.y+=dy/dist*4;}
      }
    }
  
    // 編隊 (サバイバルのみ)
    if(game.stageType==='survival'){
      game.formationTimer--;
      if(game.formationTimer<=0){game.formationTimer=Math.max(300,600-game.stage*30);actions.spawnFormation();}
    }
  
    // ウェーブシステム (通常・護衛ステージ)
    if(!game.bossPhase&&(game.stageType==='normal'||game.stageType==='escort'||game.stageType==='endless')){
      if(game.waveBannerTimer>0) game.waveBannerTimer--;
      const aliveCount=game.invaders.filter(i=>i.alive).length;
      if(game.waveState==='active'){
        if(aliveCount===0){
          const maxWave=actions.getWaveCount();
          if(game.waveNum>=maxWave){
            game.invaderBullets=[]; game.bossPhase=true; actions.spawnBoss();
          } else {
            game.waveState='wait'; game.waveDelay=WAVE_CLEAR_DELAY;
          }
        }
      } else if(game.waveState==='wait'){
        game.waveDelay--;
        if(game.waveDelay<=0) actions.startWave(game.waveNum+1);
      }
    }
  
    const alive=game.invaders.filter(i=>i.alive);
    for(const inv of alive){
      inv.frameTimer=(inv.frameTimer||0)+1;
      if(inv.frameTimer>=20){inv.frame^=1;inv.frameTimer=0;}
      if(inv._stunTimer>0){inv._stunTimer--;continue;}
      // 惑星ビヘイビア
      inv.behaviorTimer=(inv.behaviorTimer||0)+1;
      if(inv.behavior==='rush'&&inv.behaviorTimer%60===0){
        // 火星: 定期的にプレイヤーに突進
        const dx=(game.player.x+game.player.w/2)-(inv.x+inv.w/2),dy=(game.player.y+game.player.h/2)-(inv.y+inv.h/2);
        const len=Math.sqrt(dx*dx+dy*dy)||1; const spd=Math.sqrt(inv.vx*inv.vx+inv.vy*inv.vy)||1.5;
        inv.vx=(dx/len)*spd*1.3; inv.vy=(dy/len)*spd*1.2;
      } else if(inv.behavior==='swarm'){
        // 金星: 群れ — 近くの仲間に向かう
        if(inv.behaviorTimer%45===0){
          const neighbors=game.invaders.filter(o=>o.alive&&o!==inv);
          if(neighbors.length>0){
            const nearest=neighbors.reduce((a,b)=>Math.hypot(b.x-inv.x,b.y-inv.y)<Math.hypot(a.x-inv.x,a.y-inv.y)?b:a);
            const dx=nearest.x-inv.x,dy=nearest.y-inv.y,len=Math.sqrt(dx*dx+dy*dy)||1;
            inv.vx=inv.vx*0.7+(dx/len)*0.4;
          }
        }
      } else if(inv.behavior==='orbital'){
        // 土星: 上空を旋回
        if(inv.y>H*0.22) inv.vy=-Math.abs(inv.vy)*0.8;
        inv.vx+=Math.sin(inv.behaviorTimer*0.03)*0.04;
      } else if(inv.behavior==='sine_wave'){
        // UFOドローン: 正弦波飛行
        inv.vx=Math.sin(inv.behaviorTimer*0.05+inv.sineOffset)*2.2;
      } else if(inv.behavior==='zigzag'){
        // スパイダー: ジグザグ
        if(inv.behaviorTimer%35===0) inv.vx+=(Math.random()-0.5)*2.5;
        inv.vx=Math.max(-3,Math.min(3,inv.vx));
      } else if(inv.behavior==='crystal_drift'){
        // クリスタル: ゆっくり回転しながら降下
        inv.vx=Math.sin(inv.behaviorTimer*0.02)*0.6;
      } else if(inv.behavior==='advance'){
        // ヘビー: ゆっくり前進
        if(inv.y<H*0.35) inv.vy=Math.abs(inv.vy)*0.7;
      }
      inv.x+=inv.vx; inv.y+=inv.vy;
      if(inv.x<0) inv.vx=Math.abs(inv.vx);
      if(inv.x+inv.w>W) inv.vx=-Math.abs(inv.vx);
      if(inv.isPatrol){
        if(inv.y<30) inv.vy=Math.abs(inv.vy);
        if(inv.y+inv.h>H*0.42) inv.vy=-Math.abs(inv.vy);
      } else {
        if(inv.y<0) inv.vy=Math.abs(inv.vy);
        if(inv.y+inv.h>=H-30) inv.vy=-Math.abs(inv.vy);
      }
      if(game.currentEvent?.id==='rush'){inv.x+=inv.vx*0.5;inv.y+=inv.vy*0.5;}
      inv.shootTimer++;
      const sInterval=inv.invType==='sniper'?Math.max(50,160-game.stage*8):inv.shootInterval;
      if(inv.shootTimer>=sInterval){
        inv.shootTimer=0;
        if(inv.invType==='sniper'){
          const dx=(game.player.x+game.player.w/2)-(inv.x+inv.w/2),dy=(game.player.y+game.player.h/2)-(inv.y+inv.h/2);
          const len=Math.sqrt(dx*dx+dy*dy)||1;
          game.invaderBullets.push({x:inv.x+inv.w/2-4,y:inv.y+inv.h,w:9,h:18,aimed:true,
            vx:(dx/len)*INVADER_BULLET_SPEED*0.85,vy:(dy/len)*INVADER_BULLET_SPEED*0.85});
        } else if(inv.invType==='bomber'){
          game.invaderBullets.push({x:inv.x+inv.w/2-5,y:inv.y+inv.h,w:10,h:10,vx:0,vy:INVADER_BULLET_SPEED*1.2,bomb:true});
        } else if(inv.invType==='ufo_drone'){
          const dx=(game.player.x+game.player.w/2)-(inv.x+inv.w/2),dy=(game.player.y+game.player.h/2)-(inv.y+inv.h/2);
          const len=Math.sqrt(dx*dx+dy*dy)||1;
          game.invaderBullets.push({x:inv.x+inv.w/2-3,y:inv.y+inv.h,w:6,h:14,aimed:true,
            vx:(dx/len)*INVADER_BULLET_SPEED*0.75,vy:(dy/len)*INVADER_BULLET_SPEED*0.75});
        } else if(inv.invType==='spider'){
          [-0.3,0,0.3].forEach(da=>{
            game.invaderBullets.push({x:inv.x+inv.w/2-3,y:inv.y+inv.h,w:5,h:10,
              vx:Math.sin(da)*INVADER_BULLET_SPEED,vy:Math.cos(da)*INVADER_BULLET_SPEED});
          });
        } else if(inv.invType==='crystal'){
          [[0,1],[1,0],[-1,0],[0.7,0.7],[-0.7,0.7]].forEach(([dx,dy])=>{
            game.invaderBullets.push({x:inv.x+inv.w/2-3,y:inv.y+inv.h/2,w:6,h:6,
              vx:dx*INVADER_BULLET_SPEED*0.6,vy:dy*INVADER_BULLET_SPEED*0.6});
          });
        } else if(inv.invType==='heavy'){
          [-0.35,0,0.35].forEach(da=>{
            game.invaderBullets.push({x:inv.x+inv.w/2-5,y:inv.y+inv.h,w:10,h:10,bomb:da===0,
              vx:Math.sin(da)*INVADER_BULLET_SPEED*1.1,vy:Math.cos(da)*INVADER_BULLET_SPEED*1.1});
          });
        } else {
          const useZigzag=game.stage>=2&&Math.random()<0.3;
          game.invaderBullets.push({x:inv.x+inv.w/2-2,y:inv.y+inv.h,w:4,h:14,zigzag:useZigzag,zigzagPhase:0});
        }
      }
    }
  
  
    // 弾 vs インベーダー
    outer:
    for(let i=game.bullets.length-1;i>=0;i--){
      for(let j=0;j<game.invaders.length;j++){
        const inv=game.invaders[j];
        if(!inv.alive||!actions.rectsOverlap(game.bullets[i],inv)) continue;
        const rawDmg=game.bullets[i].charged?3:1;
        const {val:dmg,isCrit:ic}=game.bullets[i].laser?{val:rawDmg,isCrit:false}:actions.calcPlayerDmg(rawDmg);
        if(game.bullets[i].laser){
          inv.alive=false; actions.spawnDmgNum(inv.x+inv.w/2,inv.y,dmg,ic);
        } else if(game.bullets[i].charged){
          inv.hp=Math.max(0,inv.hp-dmg); actions.spawnDmgNum(inv.x+inv.w/2,inv.y,dmg,ic); if(inv.hp<=0) inv.alive=false;
          game.bullets[i].piercesLeft=(game.bullets[i].piercesLeft||1)-1;
          if(game.bullets[i].piercesLeft<=0){game.bullets.splice(i,1);j--;}
        } else {
          inv.hp=Math.max(0,(inv.hp||1)-dmg);
          actions.spawnDmgNum(inv.x+inv.w/2,inv.y,dmg,ic);
          if(inv.hp>0){
            actions.spawnExplosion(inv.x+inv.w/2,inv.y+inv.h/2,'#888',3);
            game.bullets.splice(i,1); continue outer;
          }
          inv.alive=false;
        }
        if(!inv.alive){
          const typeBonus={normal:1,fast:1.5,tank:3,sniper:2,bomber:2}[inv.invType]||1;
          const base=Math.floor((3-inv.row)*10*typeBonus);
          const color=inv.invType==='tank'?'#fff':inv.invType==='fast'?'#0ff':inv.invType==='sniper'?'#f80':inv.invType==='bomber'?'#f0f':['#f55','#ff0','#0ff'][inv.row<=0?0:inv.row<=1?1:2];
          game.sessionProgress.kills++;
          actions.checkAndClaimMissions();
          actions.addCombo(inv.x+inv.w/2,inv.y,base);
          actions.spawnExplosion(inv.x+inv.w/2,inv.y+inv.h/2,color,inv.invType==='tank'?18:10);
          actions.spawnPowerup(inv.x+inv.w/2,inv.y+inv.h);
          actions.addExp(inv.invType==='tank'?30:inv.invType==='sniper'?20:10); actions.playSound('explosion'); actions.vibrate(15);
          if(Math.random()<0.35) actions.addCoins(inv.invType==='tank'?6:inv.invType==='sniper'?5:3+Math.floor(Math.random()*3));
          actions.dropMaterial();
        }
        if(!game.bullets[i]?.laser&&!(game.bullets[i]?.charged&&game.bullets[i]?.piercesLeft>0)){game.bullets.splice(i,1);continue outer;}
      }
      if(game.bullets[i]?.explosive){
        const b=game.bullets[i];
        let hit=false;
        for(const inv of game.invaders){if(inv.alive&&actions.rectsOverlap(b,inv)){hit=true;break;}}
        if(hit){actions.explodeBomb(b.x+b.w/2,b.y+b.h/2);game.bullets.splice(i,1);}
      }
    }
  
    if(game.ufo){
      for(let i=game.bullets.length-1;i>=0;i--){
        if(actions.rectsOverlap(game.bullets[i],game.ufo)){
          game.bullets.splice(i,1);
          actions.spawnExplosion(game.ufo.x+game.ufo.w/2,game.ufo.y+game.ufo.h/2,'#f0f',16);
          game.score+=game.ufo.points; game.comboDisplay={x:game.ufo.x,y:game.ufo.y,text:`UFO +${game.ufo.points}`,timer:80};
          actions.addExp(25); actions.addCoins(30+Math.floor(Math.random()*30)); actions.updateHUD(); game.ufo=null; break;
        }
      }
    }
  
    actions.checkPlayerHit();
}
