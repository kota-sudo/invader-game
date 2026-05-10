import { game, actions } from './game-store.js';
import { CANVAS_W as W, CANVAS_H as H, INVADER_BULLET_SPEED } from './constants.js';
import { playSound, stopBGM, startBGM } from './audio.js';
import { spawnExplosion, spawnDmgNum } from './spawn-helpers.js';
import { addExp } from './exp-level.js';
import { addGems } from './economy.js';
import { getPlanet } from '../game-data.js';
import { addMaterial } from './materials.js';
import { safeLocalStorageSetItem } from './storage-helpers.js';
import { computeStageStarMedal } from './stage-medals.js';
import { ensureBossRenderState, updateBossAttackAnim, startBossAttackAnim } from './boss-render.js';
import { pickBossPattern as _pickBossPattern, fireBossPattern as _fireBossPattern } from './boss-patterns.js';
import { spawnMiniBoss, spawnHealer } from './enemy-spawning.js';
import { rectsOverlap, absorbWithShield, onPlayerHit } from './player-combat.js';
import { BOSS_SELECT_DATA } from './boss-select-data.js';

export function killBoss() {
  const _bossAbility = game.boss?.ability;
  spawnExplosion(game.boss.x + game.boss.w / 2, game.boss.y + game.boss.h / 2, '#ff0', 30);
  actions.triggerShake(10, 20); actions.triggerFlash(255, 150, 0, 0.7);
  game.score += 500 + game.stage * 100; actions.updateHUD(); addExp(150);
  actions.addCoins(80 + game.stage * 8 + Math.floor(Math.random() * 40));
  addGems(3 + Math.floor(game.stage / 5));
  const bp = getPlanet(game.stage).name;
  if (bp === 'SATURN') addMaterial('crystal', 2);
  else if (bp === 'JUPITER') addMaterial('crystal', 1);
  else addMaterial('core', 2);
  addMaterial('scrap', 3);
  if (game.bossDifficulty === 2) { addMaterial('scrap', 2); addMaterial('core', 1); actions.addCoins(60); addGems(1); }
  const _featIdx = Math.floor(Date.now() / (7 * 24 * 3600 * 1000)) % BOSS_SELECT_DATA.length;
  if (_bossAbility && _bossAbility === BOSS_SELECT_DATA[_featIdx]?.id) { addMaterial('scrap', 2); actions.addCoins(60); addGems(2); }
  playSound('boss_die');
  game.bossKillTotal++;
  safeLocalStorageSetItem('invader_boss_kills', String(game.bossKillTotal));
  if (game.bossKillTotal >= 5) actions.unlockAchievement('boss5');
  if (game.boss?.ability) {
    const ab = game.boss.ability;
    const _dk = `${ab}_${game.bossDifficulty ?? 1}`;
    game.bossKillsByType[_dk] = (game.bossKillsByType[_dk] || 0) + 1;
    safeLocalStorageSetItem('invader_boss_kills_type', JSON.stringify(game.bossKillsByType));
    if (game.score > (game.bossBestScoreByType[_dk] || 0)) {
      game.bossBestScoreByType[_dk] = game.score;
      safeLocalStorageSetItem('invader_boss_best_score', JSON.stringify(game.bossBestScoreByType));
    }
  }
  actions.ensureNormalQuestProfile();
  game.questLifetime.totalBossKills++;
  game.sessionProgress.bossKills++; actions.checkAndClaimMissions();
  if (game.stageStats.hits === 0) actions.unlockAchievement('nodamage');
  game.boss = null; game.miniBosses = [];
  if (game.stageType === 'boss_rush' && game.bossRushCount < game.bossRushMax - 1) {
    game.bossRushCount++;
    game.bossRushDelay = 90;
    return;
  }
  game.stageRank = actions.calcRank();
  if (_bossAbility) {
    const _dk2 = `${_bossAbility}_${game.bossDifficulty ?? 1}`;
    const _rv = { S: 4, A: 3, B: 2, C: 1 };
    if ((_rv[game.stageRank] || 0) > (_rv[game.bossBestRankByType?.[_dk2]] || 0)) {
      game.bossBestRankByType[_dk2] = game.stageRank;
      safeLocalStorageSetItem('invader_boss_best_rank', JSON.stringify(game.bossBestRankByType));
    }
  }
  const rankBonus = { S: 50, A: 35, B: 20, C: 10 }[game.stageRank] || 10;
  const rankGems = { S: 5, A: 3, B: 1, C: 0 }[game.stageRank] || 0;
  actions.addCoins(rankBonus); if (rankGems > 0) addGems(rankGems);
  if (game.stageType === 'endless') {
    actions.addCoins(rankBonus); if (rankGems > 0) addGems(rankGems);
    addExp(60);
    game.boss = null; game.bossPhase = false; game.bossMinions = [];
    game.stage++;
    game.waveNum = 0; game.waveState = 'wait'; game.waveDelay = 150;
    game.invaders = []; game.invaderBullets = [];
    game.stageStats = { hits: 0, maxCombo: 0, kills: 0 };
    actions.triggerFlash(0, 200, 255, 0.4);
    startBGM(); return;
  }
  stopBGM();
  if (game.bossRushModeActive) { game.stageType = 'boss_rush'; actions.nextStage(); return; }
  const _skipStars = !!game.continueNoStarsThisRun;
  const _starsEarned = _skipStars ? 0 : computeStageStarMedal(game.stageStats.hits, game.stageStats.maxCombo, game.stageType);
  actions.commitStageStarMedalForCurrentClear();
  game.stageResultData = {
    stage: game.stage,
    stageType: game.stageType,
    rank: game.stageRank,
    kills: game.stageStats.kills,
    hits: game.stageStats.hits,
    maxCombo: game.stageStats.maxCombo,
    rankBonus,
    rankGems,
    score: game.score,
    starsEarned: _starsEarned,
    starsSkippedMedal: _skipStars,
  };
  game.stageResultTimer = 0;
  game.bullets = []; game.invaderBullets = []; game.stageClearAnimTimer = 80;
}

export function killMiniBoss(mb) {
  spawnExplosion(mb.x + mb.w / 2, mb.y + mb.h / 2, '#f80', 16);
  actions.triggerShake(6, 10); game.score += 200 + game.stage * 50; actions.updateHUD(); addExp(60);
  actions.addCoins(25 + Math.floor(Math.random() * 15));
  playSound('boss_die');
  mb.alive = false;
  if (game.miniBosses.every(m => !m.alive)) {
    game.miniBosses = [];
    game.stageRank = actions.calcRank();
    const rankBonus = { S: 50, A: 35, B: 20, C: 10 }[game.stageRank] || 10;
    actions.addCoins(rankBonus); stopBGM();
    const _skipStars2 = !!game.continueNoStarsThisRun;
    const _starsEarned2 = _skipStars2 ? 0 : computeStageStarMedal(game.stageStats.hits, game.stageStats.maxCombo, game.stageType);
    actions.commitStageStarMedalForCurrentClear();
    game.stageResultData = {
      stage: game.stage,
      stageType: game.stageType,
      rank: game.stageRank,
      kills: game.stageStats.kills,
      hits: game.stageStats.hits,
      maxCombo: game.stageStats.maxCombo,
      rankBonus,
      rankGems: 0,
      score: game.score,
      starsEarned: _starsEarned2,
      starsSkippedMedal: _skipStars2,
    };
    game.stageResultTimer = 0; game.bullets = []; game.invaderBullets = []; game.stageClearAnimTimer = 80;
  }
}

export function updateBoss() {
  if (!game.boss) return;
  ensureBossRenderState(game.boss);
  updateBossAttackAnim(game.boss);
  if (game.boss.dying) {
    game.boss.dyingTimer--;
    const prog = 1 - game.boss.dyingTimer / 100;
    const freq = Math.max(1, 7 - Math.floor(prog * 5));
    if (game.boss.dyingTimer % freq === 0)
      spawnExplosion(game.boss.x + Math.random() * game.boss.w, game.boss.y + Math.random() * game.boss.h,
        ['#ff0', '#f80', '#f44'][Math.floor(Math.random() * 3)], 8);
    if (game.boss.dyingTimer === 60) { actions.triggerShake(8, 14); }
    if (game.boss.dyingTimer === 30) { actions.triggerFlash(255, 200, 0, 0.65); }
    if (game.boss.dyingTimer <= 0) killBoss();
    return;
  }
  game.boss.frameTimer++;
  if (game.boss.frameTimer >= 20) { game.boss.frame ^= 1; game.boss.frameTimer = 0; }
  if (!game.boss.entryDone) {
    game.boss.y += 2;
    if (game.boss.y >= 40) { game.boss.y = 40; game.boss.entryDone = true; game.bossCutinTimer = actions.BOSS_CUTIN_DURATION; }
    return;
  }

  game.boss.phase = game.boss.hp < game.boss.maxHp * 0.33 ? 2 : game.boss.hp < game.boss.maxHp * 0.66 ? 1 : 0;

  if (game.boss.ability === 'shield' && game.boss.shielded) {
    for (let i = game.bullets.length - 1; i >= 0; i--) {
      if (rectsOverlap(game.bullets[i], game.boss) && !game.bullets[i].charged) {
        spawnExplosion(game.bullets[i].x, game.bullets[i].y, '#4af', 4);
        game.bullets.splice(i, 1);
        game.boss.shieldHp -= 1;
        playSound('boss_shield');
        if (game.boss.shieldHp <= 0) { game.boss.shielded = false; actions.triggerFlash(50, 150, 255, 0.3); }
      }
    }
    if (game.boss.phase > 0) { game.boss.shielded = true; game.boss.shieldHp = game.boss.shieldMax; }
  }

  if (game.boss.ability === 'teleport' && game.boss.entryDone) {
    game.boss.teleportTimer--;
    if (game.boss.teleportTimer <= 0) {
      game.boss.x = Math.random() * (W - game.boss.w);
      game.boss.teleportTimer = Math.max(80, 150 - game.stage * 10);
      actions.triggerFlash(150, 0, 255, 0.15);
      spawnExplosion(game.boss.x + game.boss.w / 2, game.boss.y + game.boss.h / 2, '#f0f', 12);
      playSound('boss_teleport');
    }
  }

  const spd = game.boss.speed * (game.boss.phase >= 1 ? 1.4 : 1) * (game.boss.phase >= 2 ? 1.3 : 1);
  game.boss.x += game.boss.dir * spd;
  if (game.boss.x + game.boss.w >= W) game.boss.dir = -1;
  if (game.boss.x <= 0) game.boss.dir = 1;

  const interval = game.boss.phase >= 2 ? Math.floor(game.boss.shootInterval * 0.5) : game.boss.phase === 1 ? Math.floor(game.boss.shootInterval * 0.7) : game.boss.shootInterval;
  if (game.boss.attackCharge > 0) {
    game.boss.attackCharge--;
    if (game.boss.attackCharge === 0) {
      if (game.boss.attackAnim?.type === 'coreShot') {
        game.boss.attackAnim.phase = 'active';
        game.boss.attackAnim.timer = 0;
      } else if (game.boss.attackAnim?.type === 'wingBarrage') {
        game.boss.attackAnim.phase = 'active';
        game.boss.attackAnim.timer = 0;
      }
      _fireBossPattern(game.boss.nextPattern, { playSound });
    }
  } else {
    game.boss.shootTimer++;
    if (game.boss.shootTimer >= interval) {
      game.boss.shootTimer = 0;
      game.boss.nextPattern = _pickBossPattern();
      game.boss.attackCharge = 28;
      if (game.boss.nextPattern === 'aimed') {
        game.boss.aimTarget = { x: game.player.x + game.player.w / 2, y: game.player.y + game.player.h / 2 };
      }
      if (game.boss.nextPattern === 'aimed' || game.boss.nextPattern === 'triple' || game.boss.nextPattern === 'spread') {
        startBossAttackAnim(game.boss, 'coreShot', { allowOverride: false });
      } else if (game.boss.nextPattern === 'circle' || game.boss.nextPattern === 'wall' || game.boss.nextPattern === 'sweep') {
        startBossAttackAnim(game.boss, 'wingBarrage', { allowOverride: true });
      }
    }
  }

  if (game.boss.ability === 'dasher' && game.boss.entryDone) {
    if (!game.boss._dashing) {
      game.boss.dashTimer--;
      if (game.boss.dashTimer <= 0) {
        game.boss.dashTimer = Math.max(50, 110 - game.stage * 5);
        game.boss._dashing = true;
        game.boss._dashVx = game.boss.dir * 24;
        game.boss._dashDuration = 16;
        spawnExplosion(game.boss.x + game.boss.w / 2, game.boss.y + game.boss.h / 2, '#0cf', 6);
        playSound('dash');
        startBossAttackAnim(game.boss, 'spearDash', { allowOverride: true });
        if (game.boss.attackAnim?.type === 'spearDash') { game.boss.attackAnim.phase = 'active'; game.boss.attackAnim.timer = 0; }
      }
    } else {
      game.boss._dashDuration--;
      game.boss.x = Math.max(0, Math.min(W - game.boss.w, game.boss.x + game.boss._dashVx));
      if (game.boss._dashDuration <= 0 || game.boss.x <= 0 || game.boss.x + game.boss.w >= W) {
        game.boss._dashing = false; game.boss.dir *= -1;
        spawnExplosion(game.boss.x + game.boss.w / 2, game.boss.y + game.boss.h / 2, '#0cf', 8);
        actions.triggerShake(4, 5);
      }
    }
  }

  if (game.boss.ability === 'barrage' && game.boss.entryDone) {
    game.boss.barrageCharge++;
    const bInt = Math.max(55, 130 - game.stage * 6);
    if (game.boss.barrageCharge >= bInt) {
      game.boss.barrageCharge = 0;
      const cnt = 10 + game.boss.phase * 4;
      const cx2 = game.boss.x + game.boss.w / 2, cy2 = game.boss.y + game.boss.h / 2;
      for (let i = 0; i < cnt; i++) {
        const a = Math.PI * 2 * i / cnt;
        game.invaderBullets.push({
          x: cx2 - 3, y: cy2, w: 6, h: 6,
          vx: Math.cos(a) * INVADER_BULLET_SPEED * 0.85, vy: Math.sin(a) * INVADER_BULLET_SPEED * 0.85
        });
      }
      actions.triggerFlash(200, 0, 80, 0.15); playSound('boss_split');
    }
  }

  if (game.boss.ability === 'split' && game.boss.phase >= 1 && !game.boss.splitDone) {
    game.boss.splitDone = true;
    const halfHp = Math.floor(game.boss.hp / 2);
    spawnMiniBoss(game.boss.x - 30, game.boss.y, halfHp);
    spawnMiniBoss(game.boss.x + game.boss.w - 40, game.boss.y, halfHp);
    spawnExplosion(game.boss.x + game.boss.w / 2, game.boss.y + game.boss.h / 2, '#f80', 20);
    actions.triggerFlash(255, 100, 0, 0.35);
    playSound('boss_split');
    game.boss = null;
    return;
  }

  if (game.boss.phase >= 1) {
    game.minionSpawnTimer++;
    const mInterval = game.boss.phase >= 2 ? 200 : 240;
    const mCap = 6;
    if (game.minionSpawnTimer >= mInterval) {
      game.minionSpawnTimer = 0;
      const count = game.boss.phase >= 2 ? 2 : 1;
      for (let i = 0; i < count && game.bossMinions.length < mCap; i++) spawnBossMinion();
    }
  }

  if (!game.boss.shielded && !game.boss.dying) {
    for (let i = game.bullets.length - 1; i >= 0; i--) {
      if (rectsOverlap(game.bullets[i], game.boss)) {
        const { val: dmg, isCrit: dc } = actions.calcPlayerDmg(game.bullets[i].charged ? game.playerUpgrades.damage * 4 : game.playerUpgrades.damage);
        game.bullets.splice(i, 1);
        spawnDmgNum(game.boss.x + game.boss.w / 2, game.boss.y, dmg, dc);
        game.boss.hp = Math.max(0, game.boss.hp - dmg);
        actions.addUltimateGauge(3);
        spawnExplosion(game.boss.x + Math.random() * game.boss.w, game.boss.y + Math.random() * game.boss.h, '#f80', 5);
        playSound('boss_hit');
        if (game.boss.hp <= 0) {
          game.boss.dying = true; game.boss.dyingTimer = 100;
          game.invaderBullets = []; game.bossCutinTimer = 0;
          actions.triggerFlash(255, 220, 80, 0.4);
          return;
        }
      }
    }
  }
}

export function updateMiniBosses() {
  for (const mb of game.miniBosses) {
    if (!mb.alive) continue;
    mb.frameTimer = (mb.frameTimer || 0) + 1;
    if (mb.frameTimer >= 20) { mb.frame ^= 1; mb.frameTimer = 0; }
    mb.x += mb.dir * mb.speed;
    if (mb.x + mb.w >= W) mb.dir = -1;
    if (mb.x <= 0) mb.dir = 1;
    mb.shootTimer++;
    if (mb.shootTimer >= mb.shootInterval) {
      mb.shootTimer = 0;
      game.invaderBullets.push({
        x: mb.x + mb.w / 2 - 2, y: mb.y + mb.h, w: 5, h: 14,
        vx: (Math.random() - 0.5) * 2, vy: INVADER_BULLET_SPEED, zigzag: false
      });
    }
    for (let i = game.bullets.length - 1; i >= 0; i--) {
      if (rectsOverlap(game.bullets[i], mb)) {
        const { val: dmg, isCrit: mdc } = actions.calcPlayerDmg(game.bullets[i].charged ? game.playerUpgrades.damage * 4 : game.playerUpgrades.damage);
        game.bullets.splice(i, 1);
        mb.hp -= dmg; spawnDmgNum(mb.x + mb.w / 2, mb.y, dmg, mdc);
        spawnExplosion(mb.x + Math.random() * mb.w, mb.y + Math.random() * mb.h, '#f80', 4);
        playSound('boss_hit');
        if (mb.hp <= 0) { killMiniBoss(mb); break; }
      }
    }
  }
}

export function updateHealers() {
  if (!game.bossPhase) return;
  if ((game.boss || game.miniBosses.some(m => m.alive))) {
    game.healerSpawnTimer++;
    if (game.healerSpawnTimer >= Math.max(180, 360 - game.stage * 20)) { game.healerSpawnTimer = 0; spawnHealer(); }
  }
  for (let i = game.healers.length - 1; i >= 0; i--) {
    const h = game.healers[i];
    if (!h.alive) { game.healers.splice(i, 1); continue; }
    if (h.x < 0) h.vx = Math.abs(h.vx);
    if (h.x + h.w > W) h.vx = -Math.abs(h.vx);
    h.x += h.vx; h.y += h.vy;
    const bossTgt = game.boss || (game.miniBosses.find(m => m.alive));
    if (bossTgt && rectsOverlap(h, bossTgt)) {
      bossTgt.hp = Math.min(bossTgt.maxHp, bossTgt.hp + 5);
      spawnExplosion(h.x + h.w / 2, h.y + h.h / 2, '#0f0', 8);
      h.alive = false; actions.triggerFlash(0, 255, 0, 0.15); continue;
    }
    for (let j = game.bullets.length - 1; j >= 0; j--) {
      if (rectsOverlap(game.bullets[j], h)) {
        game.bullets.splice(j, 1); h.alive = false;
        spawnExplosion(h.x + h.w / 2, h.y + h.h / 2, '#0f0', 10);
        game.score += 80; actions.updateHUD(); addExp(20); playSound('healer_die'); break;
      }
    }
    if (h.y > H) h.alive = false;
  }
}

export function spawnBossMinion() {
  const side = Math.random() < 0.5 ? -1 : 1;
  game.bossMinions.push({
    x: side < 0 ? -36 : W + 36, y: game.boss ? game.boss.y + game.boss.h * 0.5 + Math.random() * game.boss.h * 0.3 : 60,
    w: 32, h: 26, hp: 3, maxHp: 3,
    vx: side < 0 ? 1.4 : -1.4, vy: 0.5, alive: true, frame: 0, frameTimer: 0,
  });
}

export function updateBossMinions() {
  if (!game.bossPhase) { game.bossMinions = []; return; }
  for (let i = game.bossMinions.length - 1; i >= 0; i--) {
    const m = game.bossMinions[i];
    if (!m.alive) { game.bossMinions.splice(i, 1); continue; }
    m.frameTimer = (m.frameTimer || 0) + 1;
    if (m.frameTimer >= 14) { m.frame ^= 1; m.frameTimer = 0; }
    const px = game.player.x + game.player.w / 2, py = game.player.y + game.player.h / 2;
    const dx = px - (m.x + m.w / 2), dy = py - (m.y + m.h / 2);
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const spd = Math.min(2.4, 0.9 + game.stage * 0.06);
    m.x += dx / len * spd; m.y += dy / len * spd;
    if (m.y > H + 60 || m.x < -80 || m.x > W + 80) { game.bossMinions.splice(i, 1); continue; }
    for (let j = game.bullets.length - 1; j >= 0; j--) {
      if (!rectsOverlap(game.bullets[j], m)) continue;
      const b = game.bullets[j];
      const dmg = b.laser ? 999 : b.charged ? 4 : 1;
      m.hp -= dmg;
      if (!b.laser) game.bullets.splice(j, 1);
      if (m.hp <= 0) {
        spawnExplosion(m.x + m.w / 2, m.y + m.h / 2, '#ff44ff', 10);
        game.score += 50; addExp(12); actions.addUltimateGauge(6); actions.updateHUD();
        m.alive = false; playSound('explosion'); break;
      } else {
        spawnExplosion(m.x + m.w / 2, m.y + m.h / 2, '#aa00aa', 3);
        if (!b.laser) break;
      }
    }
    if (m.alive && rectsOverlap(m, game.player) && !(game.powerupActive === 'invincible' || game.player.invincibleTimer > 0)) {
      if (game.playerShield) { absorbWithShield(); } else { onPlayerHit(); }
    }
  }
}
