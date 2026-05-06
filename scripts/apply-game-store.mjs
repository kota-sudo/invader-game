import fs from 'fs';
import * as acorn from 'acorn';

const MAIN = new URL('../main.js', import.meta.url);

const IDS = new Set([
  'stageClearAnimTimer', 'stageMapScrollOffset', 'invaderSpawnInterval', 'stageResultData', 'stageBannerTimer',
  'bossWarningTimer', 'playerUpgrades', 'invaderBullets', 'gachaInventory', 'formationTimer', 'sessionProgress',
  'levelUpDisplay', 'ultimateActive', 'ultimateTimer', 'passiveRegenTimer', 'waveBannerTimer', 'lifeGainDisplay',
  'comboDisplay', 'muzzleFlashes', 'hitFlashTimer', 'bossRushDelay', 'survivalTimer', 'playerShield', 'skillChoices',
  'currentEvent', 'groundPulse', 'stageCharTX', 'stageCharTY', 'chargeTimer', 'chargeReady', 'playerStats',
  'stageCharX', 'stageCharY', 'frameCount', 'comboTimer', 'dashCooldown', 'dashTrail', 'shakeTimer', 'bossPhase',
  'stageType', 'waveState', 'waveDelay', 'marsWaveAwaitMiniBossClear', 'lastShot', 'powerupActive', 'powerupTimer', 'matPopups', 'dashTimer',
  'particles', 'powerups', 'invaders', 'bullets', 'miniBosses', 'damageNumbers', 'upgradeChoices', 'playerLevel',
  'stageSelectIdx', 'gachaMaterials', 'gachaStardust', 'gachaResults', 'gachaCurrentIdx', 'gachaAnimFrame',
  'gachaPityCount', 'premiumPityCount', 'premiumLrPityCount', 'playerLoadout', 'bossRushModeActive', 'stardustShopCursor',
  'healerSpawnTimer', 'minionSpawnTimer', 'invaderSpawnTimer', 'bossCutinTimer', 'meteorRainTimer', 'meteorRainWarning',
  'waveTargetKills', 'missionClaimedSet', 'isAsteroidStage', 'eventCooldown', 'screenFlash', 'nextLifeScore',
  'lastGachaKeyTime', 'gachaRatesScroll', 'gachaRatesModal', 'gachaIsPremium', 'loadoutCursor', 'ultimateGauge', 'stageResultTimer',
  'waveKills', 'sessionMissions', 'lrPityCount', 'gachaNewItems', 'shipWeaponIdx', 'customizeCursor', 'shipTraitIdx',
  'shipColorIdx', 'shipShapeIdx', 'weaponAmmo', 'bgmPhraseIdx', 'bgmBassTimer', 'weaponIdx', 'bgmBassIdx', 'audioCtx',
  'meteors', 'asteroids', 'healers', 'barriers', 'stars', 'paused', 'score', 'lives', 'stage', 'combo', 'state',
  'player', 'ufo', 'boss', 'hiScores', 'hiScore', 'exp', 'gems', 'coins', 'waveNum', 'escortShip', 'petBullets',
  'petTimers', 'loadoutTab', 'gachaTab', 'materials', 'shopUpgrades', 'shopCursor', 'shopTab', 'mapRoutes', 'hoveredBtn',
  'bossMinions', 'achievements', 'bossKillTotal', 'highestStage', 'startStage', 'seenUpgradeIds', 'gravityZones',
  'emFields', 'blackHoles', 'bossRushCount', 'bossRushMax', 'eventTimer', 'shakeIntensity', 'maxInvaders', 'bgmTimer',
  'bgmOn', 'bgmIdx', 'stageStats', 'stageRank'
]);

const isWordChar = c => c !== undefined && /[0-9a-zA-Z_$]/.test(c);

function transformCode(src) {
  let out = '';
  let i = 0;
  const n = src.length;
  while (i < n) {
    const ch = src[i];
    const ch2 = src[i + 1];
    if (ch === '/' && ch2 === '/') {
      let j = i;
      while (j < n && src[j] !== '\n') j++;
      out += src.slice(i, j);
      i = j;
      continue;
    }
    if (ch === '/' && ch2 === '*') {
      let j = i + 2;
      while (j < n - 1 && !(src[j] === '*' && src[j + 1] === '/')) j++;
      out += src.slice(i, Math.min(j + 2, n));
      i = j + 2;
      continue;
    }
    if (ch === "'" || ch === '"') {
      const q = ch;
      let j = i + 1;
      while (j < n) {
        if (src[j] === '\\') {
          j += 2;
          continue;
        }
        if (src[j] === q) {
          j++;
          break;
        }
        j++;
      }
      out += src.slice(i, j);
      i = j;
      continue;
    }
    if (ch === '`') {
      out += '`';
      i++;
      while (i < n) {
        if (src[i] === '\\') {
          out += src[i++];
          if (i < n) out += src[i++];
          continue;
        }
        if (src[i] === '$' && src[i + 1] === '{') {
          out += '${';
          i += 2;
          const exprStart = i;
          let end = -1;
          try {
            const node = acorn.parseExpressionAt(src, exprStart, {
              ecmaVersion: 2022,
              sourceType: 'module',
              allowAwaitOutsideFunction: true
            });
            end = node.end;
          } catch {
            end = exprStart;
            while (end < n && src[end] !== '}') end++;
          }
          const inner = src.slice(exprStart, end);
          out += transformCode(inner) + '}';
          i = end + 1;
          continue;
        }
        if (src[i] === '`') {
          out += '`';
          i++;
          break;
        }
        out += src[i++];
      }
      continue;
    }
    if (!isWordChar(ch)) {
      out += ch;
      i++;
      continue;
    }
    let j = i;
    while (j < n && isWordChar(src[j])) j++;
    const word = src.slice(i, j);
    const before = i > 0 ? src[i - 1] : '';
    const after = j < n ? src[j] : '';
    if (
      before !== '.' &&
      !isWordChar(before) &&
      !isWordChar(after) &&
      IDS.has(word)
    ) {
      out += `game.${word}`;
    } else {
      out += word;
    }
    i = j;
  }
  return out;
}

let s = fs.readFileSync(MAIN, 'utf8');

const STRIPS = [
  `  shipShapeIdx,
  shipColorIdx,
  shipTraitIdx,
  customizeCursor,
  shipWeaponIdx`,
  `import { setGameTickEnv } from './js/game/tick-scope.js';
`,
  `import { runUpdate } from './js/game/update-tick.js';
`,
];

for (const st of STRIPS) {
  s = s.split(st).join('');
}

s = s.replace(
  /import \{ paintFrame \} from '\.\/js\/game\/draw-dispatch\.js';\n/,
  `import { paintFrame } from './js/game/draw-dispatch.js';
import { runUpdate } from './js/game/update-tick.js';
import { game, actions } from './js/game/game-store.js';
`
);

const READHI = `function readHiScores(){
  try{
    const v=JSON.parse(localStorage.getItem('invader_hiscores')||'[]');
    if(!Array.isArray(v)) return [];
    return v.map(Number).filter(n=>Number.isFinite(n));
  }catch(e){ return []; }
}
`;
const READSTORED = `function readStoredObject(key,fallbackJson){
  try{
    const v=JSON.parse(localStorage.getItem(key)||fallbackJson);
    if(v&&typeof v==='object'&&!Array.isArray(v)) return v;
  }catch(e){}
  return JSON.parse(fallbackJson);
}

`;
s = s.split(READHI).join('');
s = s.split(READSTORED).join('');

const LET_LINES = [
  'let weaponIdx=0;',
  'let weaponAmmo={laser:0,homing:0,explosive:0};',
  'let audioCtx = null;',
  'let bgmIdx=0,bgmPhraseIdx=0,bgmTimer=null,bgmOn=false;',
  'let bgmBassIdx=0,bgmBassTimer=null;',
  'let playerUpgrades={speed:0,firerate:0,damage:1,spread:false,invincibleBonus:0,bulletSpd:0};',
  'let upgradeChoices=[];',
  'let exp=0, playerLevel=1;',
  'let levelUpDisplay=null;',
  'let skillChoices=null;',
  'let chargeTimer=0;',
  'let chargeReady=false;',
  'let dashTimer=0, dashCooldown=0;',
  'let dashTrail=[];',
  'let currentEvent=null, eventTimer=0, eventCooldown=0;',
  'let meteors=[];',
  'let asteroids=[];',
  'let isAsteroidStage=false;',
  'let formationTimer=0;',
  'let healers=[];',
  'let healerSpawnTimer=0;',
  'let minionSpawnTimer=0;',
  "let state='title', paused=false;",
  'let stageSelectIdx=0, stageCharX=90, stageCharY=165, stageCharTX=90, stageCharTY=165;',
  'let stageMapScrollOffset=0;',
  'let score=0, lives=3, stage=1, frameCount=0;',
  'let hiScores=readHiScores();',
  'let hiScore=hiScores[0]||0;',
  'let player, bullets=[], invaderBullets=[], invaders=[], barriers=[];',
  'let particles=[], powerups=[], ufo=null, boss=null, miniBosses=[];',
  'let damageNumbers=[];',
  'let combo=0, comboTimer=0, comboDisplay=null;',
  'let shakeTimer=0, shakeIntensity=0;',
  'let powerupActive=null, powerupTimer=0;',
  'let lastShot=0, bossPhase=false;',
  'let invaderSpawnTimer=0, invaderSpawnInterval=90, maxInvaders=8;',
  'let stars=[], screenFlash=null, bossWarningTimer=0;',
  'let hitFlashTimer=0, muzzleFlashes=[], stageBannerTimer=0, groundPulse=0;',
  'let playerShield=false, nextLifeScore=5000, lifeGainDisplay=null;',
  'let passiveRegenTimer=0;',
  "let coins=parseInt(localStorage.getItem('invader_coins')||'0',10);",
  "if(!Number.isFinite(coins)||coins<0) coins=0;",
  "let gachaInventory=readStoredObject('invader_gacha_inv','{}');",
  `let gachaMaterials=readStoredObject('invader_gacha_mat','{"SSR":0,"SR":0,"R":0,"N":0}');`,
  "let gachaStardust=parseInt(localStorage.getItem('invader_stardust')||'0');",
  'let gachaResults=[], gachaCurrentIdx=0, gachaAnimFrame=0;',
  'let lastGachaKeyTime=0;',
  'let gachaRatesScroll=0;',
  'let gachaRatesModal=false;',
  "let gachaPityCount=parseInt(localStorage.getItem('invader_pity')||'0');",
  "let premiumPityCount=parseInt(localStorage.getItem('invader_premium_pity')||'0');",
  "let lrPityCount=parseInt(localStorage.getItem('invader_lr_pity')||'0');",
  "let premiumLrPityCount=parseInt(localStorage.getItem('invader_premium_lr_pity')||'0');",
  "let gems=parseInt(localStorage.getItem('invader_gems')||'0',10);",
  "if(!Number.isFinite(gems)||gems<0) gems=0;",
  'let gachaNewItems=new Set();',
  'let gachaIsPremium=false;',
  'let gachaTab=0; // 0=normal(coins), 1=premium(gems)',
  `let playerLoadout=readStoredObject('invader_loadout','{"charId":null,"equip":[null,null,null],"pets":[null,null,null],"weaponId":null}');`,
  'let playerStats={hp:100,maxHp:100,atk:1.0,def:0,crit:5,spd:0};',
  'let loadoutTab=0, loadoutCursor=0; // 0=char,1=equip,2=pet,3=weapon',
  "let petTimers={dragon:0,hawk:0,bomber:0,ghost:0,fenrir:0};",
  'let petBullets=[];',
  'let bossRushModeActive=false;',
  'let stardustShopCursor=0;',
  "let achievements=readStoredObject('invader_achievements','{}');",
  "let bossKillTotal=parseInt(localStorage.getItem('invader_boss_kills')||'0');",
  "let highestStage=parseInt(localStorage.getItem('invader_highest_stage')||'1');",
  'let startStage=1;',
  'let seenUpgradeIds=new Set();',
  'let bossCutinTimer=0;',
  'let gravityZones=[], emFields=[], blackHoles=[];',
  'let meteorRainTimer=0, meteorRainWarning=0;',
  'let ultimateGauge=0;',
  'let ultimateActive=false, ultimateTimer=0;',
  "let stageType='normal'; // 'normal'|'boss_rush'|'survival'|'endless'",
  'let survivalTimer=0, bossRushCount=0, bossRushMax=2, bossRushDelay=0;',
  'let escortShip=null;',
  'let stageStats={hits:0,maxCombo:0,kills:0};',
  'let stageRank=null;',
  'let stageResultTimer=0;',
  'let stageResultData=null;',
  'let stageClearAnimTimer=0;',
  'let matPopups=[];',
  "let waveNum=0, waveState='idle'; // 'idle'|'active'|'wait'|'boss'",
  'let waveKills=0, waveTargetKills=0, waveDelay=0, waveBannerTimer=0;',
  'let sessionMissions=[];',
  'let sessionProgress={kills:0,maxCombo:0,noDmgStages:0,bossKills:0,stageClears:0,ultimateUses:0,maxWave:0};',
  'let missionClaimedSet=new Set();',
  `let materials=readStoredObject('invader_materials','{"scrap":0,"core":0,"crystal":0,"composite":0}');`,
  "let shopUpgrades=readStoredObject('invader_shop','{}');",
  'let shopCursor=0, shopTab=0; // tab 0=upgrade 1=compose',
  'let mapRoutes=[];',
  'let hoveredBtn=null;',
  'let bossMinions=[];'
];

for (const line of LET_LINES) {
  s = s.split(line + '\n').join('');
  s = s.split(line + '\r\n').join('');
}

s = s.split(`SHOP_ITEMS.forEach(s=>{ if(shopUpgrades[s.id]===undefined) shopUpgrades[s.id]=0; });\n`).join('');

s = s.split(
  "function saveScore(s){ hiScores=[s,...hiScores].sort((a,b)=>b-a).slice(0,5); hiScore=hiScores[0]; localStorage.setItem('invader_hiscores',JSON.stringify(hiScores)); }"
).join(
  "function saveScore(s){ game.hiScores=[s,...game.hiScores].sort((a,b)=>b-a).slice(0,5); game.hiScore=game.hiScores[0]; localStorage.setItem('invader_hiscores',JSON.stringify(game.hiScores)); }"
);

const OLD_TICK =
  /\/\/ ===== メイン更新（本体は js\/game\/update-tick\.js）=====[\s\S]*?setGameTickEnv\(buildGameTickEnv\(\)\);\n\n/;

const NEW_TICK = `// ===== メイン更新（update-tick + game-store）=====
Object.assign(actions, {
  playSound,
  fireBullet,
  explodeBomb,
  rectsOverlap,
  trySpawnUFO,
  updateMeteors,
  updateAsteroids,
  tryTriggerEvent,
  updateEvent,
  spawnBoss,
  updateBoss,
  updateMiniBosses,
  updateBossMinions,
  updateHealers,
  checkPlayerHit,
  updatePets,
  spawnExplosion,
  spawnFormation,
  startWave,
  getWaveCount,
  updateHUD,
  triggerFlash,
  addExp,
  addCoins,
  checkAndClaimMissions,
  spawnPowerup,
  spawnDmgNum,
  calcPlayerDmg,
  dropMaterial,
  addCombo
});

`;

s = s.replace(OLD_TICK, NEW_TICK);

s = transformCode(s);

while (s.includes('game.game.')) s = s.replace(/game\.game\./g, 'game.');

fs.writeFileSync(MAIN, s);
console.log('OK', MAIN.pathname);
