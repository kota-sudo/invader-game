import { SHOP_ITEMS } from '../game-data.js';

export function readHiScores() {
  try {
    const v = JSON.parse(localStorage.getItem('invader_hiscores') || '[]');
    if (!Array.isArray(v)) return [];
    return v.map(Number).filter(n => Number.isFinite(n));
  } catch (e) {
    return [];
  }
}

export function readStoredObject(key, fallbackJson) {
  try {
    const v = JSON.parse(localStorage.getItem(key) || fallbackJson);
    if (v && typeof v === 'object' && !Array.isArray(v)) return v;
  } catch (e) {}
  return JSON.parse(fallbackJson);
}

/** タイトル背景の品質（将来オプション画面から切替）: full | minimal */
const STORAGE_TITLE_BG = 'invader_title_bg_quality';

export function readTitleBgQuality() {
  try {
    const v = localStorage.getItem(STORAGE_TITLE_BG);
    if (v === 'minimal' || v === 'full') return v;
  } catch (e) {}
  return 'full';
}

export function setTitleBgQuality(mode) {
  if (mode !== 'minimal' && mode !== 'full') return;
  game.titleBgQuality = mode;
  try {
    localStorage.setItem(STORAGE_TITLE_BG, mode);
  } catch (e) {}
}

/** main が起動後に登録（update モジュールから参照、循環 import 回避） */
export const actions = {};

const _coins = parseInt(localStorage.getItem('invader_coins') || '0', 10);
const _gems = parseInt(localStorage.getItem('invader_gems') || '0', 10);
const _fuel = parseInt(localStorage.getItem('invader_fuel') || '10', 10);
const _fuelTs = parseInt(localStorage.getItem('invader_fuel_ts') || String(Date.now()), 10);
const _fuelDaily = localStorage.getItem('invader_fuel_daily') || '';

export const game = {
  weaponIdx: 0,
  weaponAmmo: { laser: 0, homing: 0, explosive: 0 },
  audioCtx: null,
  bgmIdx: 0,
  bgmPhraseIdx: 0,
  bgmTimer: null,
  bgmOn: false,
  bgmBassIdx: 0,
  bgmBassTimer: null,
  playerUpgrades: { speed: 0, firerate: 0, damage: 1, spread: false, invincibleBonus: 0, bulletSpd: 0 },
  upgradeChoices: [],
  exp: 0,
  playerLevel: 1,
  levelUpDisplay: null,
  skillChoices: null,
  chargeTimer: 0,
  chargeReady: false,
  dashTimer: 0,
  dashCooldown: 0,
  dashTrail: [],
  currentEvent: null,
  eventTimer: 0,
  eventCooldown: 0,
  meteors: [],
  asteroids: [],
  isAsteroidStage: false,
  formationTimer: 0,
  healers: [],
  healerSpawnTimer: 0,
  minionSpawnTimer: 0,
  state: 'title',
  paused: false,
  stageSelectIdx: 0,
  stageCharX: 90,
  stageCharY: 165,
  stageCharTX: 90,
  stageCharTY: 165,
  stageMapScrollOffset: 0,
  score: 0,
  lives: 3,
  stage: 1,
  frameCount: 0,
  hiScores: readHiScores(),
  hiScore: 0,
  bullets: [],
  invaderBullets: [],
  invaders: [],
  barriers: [],
  particles: [],
  powerups: [],
  ufo: null,
  boss: null,
  miniBosses: [],
  damageNumbers: [],
  combo: 0,
  comboTimer: 0,
  comboDisplay: null,
  shakeTimer: 0,
  shakeIntensity: 0,
  powerupActive: null,
  powerupTimer: 0,
  lastShot: 0,
  bossPhase: false,
  invaderSpawnTimer: 0,
  invaderSpawnInterval: 90,
  maxInvaders: 8,
  stars: [],
  screenFlash: null,
  bossWarningTimer: 0,
  hitFlashTimer: 0,
  muzzleFlashes: [],
  stageBannerTimer: 0,
  groundPulse: 0,
  playerShield: false,
  nextLifeScore: 5000,
  lifeGainDisplay: null,
  passiveRegenTimer: 0,
  coins: Number.isFinite(_coins) && _coins >= 0 ? _coins : 0,
  gachaInventory: readStoredObject('invader_gacha_inv', '{}'),
  gachaMaterials: readStoredObject('invader_gacha_mat', '{"SSR":0,"SR":0,"R":0,"N":0}'),
  gachaStardust: parseInt(localStorage.getItem('invader_stardust') || '0', 10) || 0,
  gachaResults: [],
  gachaCurrentIdx: 0,
  gachaAnimFrame: 0,
  lastGachaKeyTime: 0,
  gachaRatesScroll: 0,
  /** ガチャ画面で排出率をモーダル表示中 */
  gachaRatesModal: false,
  gachaPityCount: parseInt(localStorage.getItem('invader_pity') || '0', 10),
  premiumPityCount: parseInt(localStorage.getItem('invader_premium_pity') || '0', 10),
  lrPityCount: parseInt(localStorage.getItem('invader_lr_pity') || '0', 10),
  premiumLrPityCount: parseInt(localStorage.getItem('invader_premium_lr_pity') || '0', 10),
  gems: Number.isFinite(_gems) && _gems >= 0 ? _gems : 0,
  // ===== 燃料（スタミナ）=====
  fuel: Number.isFinite(_fuel) && _fuel >= 0 ? _fuel : 10,
  fuelTs: Number.isFinite(_fuelTs) && _fuelTs > 0 ? _fuelTs : Date.now(),
  fuelDaily: typeof _fuelDaily === 'string' ? _fuelDaily : '',
  gachaNewItems: new Set(),
  gachaIsPremium: false,
  gachaTab: 0,
  collectionFilter: 0,
  collectionCursor: 0,
  playerLoadout: readStoredObject(
    'invader_loadout',
    '{"charId":null,"equip":[null,null,null],"pets":[null,null,null],"weaponId":null}'
  ),
  playerStats: { hp: 100, maxHp: 100, atk: 1.0, def: 0, crit: 5, spd: 0 },
  loadoutTab: 0,
  loadoutCursor: 0,
  // 装備タブのフィルタ/ソート（所持数増加に備えて）
  equipFilterSlot: 'all', // all | atk | def | sp
  equipFilterRarity: 'ALL', // ALL | LR | SSR | SR | R | N
  equipFilterEquippedOnly: false,
  equipFilterUnleveledOnly: false, // 未強化(=Lv1)のみ
  equipSortMode: 0, // 0: rarity->lv->effect, 1: effect->rarity->lv, 2: lv->rarity->effect
  petTimers: { dragon: 0, hawk: 0, bomber: 0, ghost: 0, fenrir: 0 },
  petBullets: [],
  bossRushModeActive: false,
  endlessModeActive: false,
  selectedBossAbility: null,
  bossSelectCursor: 0,
  bossKillsByType: JSON.parse(localStorage.getItem('invader_boss_kills_type') || '{}'),
  bossBestScoreByType: JSON.parse(localStorage.getItem('invader_boss_best_score') || '{}'),
  bossBestRankByType: JSON.parse(localStorage.getItem('invader_boss_best_rank') || '{}'),
  bossDifficulty: 1,
  fusionCursor: 0,
  petLevelUpOverlay: null,
  stardustShopCursor: 0,
  achievements: readStoredObject('invader_achievements', '{}'),
  bossKillTotal: parseInt(localStorage.getItem('invader_boss_kills') || '0', 10),
  highestStage: parseInt(localStorage.getItem('invader_highest_stage') || '1', 10),
  startStage: 1,
  seenUpgradeIds: new Set(),
  bossCutinTimer: 0,
  gravityZones: [],
  emFields: [],
  blackHoles: [],
  meteorRainTimer: 0,
  meteorRainWarning: 0,
  ultimateGauge: 0,
  ultimateActive: false,
  ultimateTimer: 0,
  stageType: 'normal',
  survivalTimer: 0,
  bossRushCount: 0,
  bossRushMax: 2,
  bossRushDelay: 0,
  escortShip: null,
  stageStats: { hits: 0, maxCombo: 0, kills: 0 },
  stageRank: null,
  stageResultTimer: 0,
  stageResultData: null,
  stageClearAnimTimer: 0,
  matPopups: [],
  waveNum: 0,
  waveState: 'idle',
  waveKills: 0,
  waveTargetKills: 0,
  waveDelay: 0,
  waveBannerTimer: 0,
  sessionMissions: [],
  sessionProgress: {
    kills: 0,
    maxCombo: 0,
    noDmgStages: 0,
    bossKills: 0,
    stageClears: 0,
    ultimateUses: 0,
    maxWave: 0
  },
  missionClaimedSet: new Set(),
  /** ローカル日付キー（YYYY-MM-DD）。`ensureDailyMissions` が一致なら再読込を省略 */
  dailyMissionLoadedDate: '',
  questLifetime: {
    totalKills: 0,
    totalBossKills: 0,
    totalStageClears: 0,
    totalUltimates: 0,
    totalNoDmgClears: 0,
    maxComboEver: 0,
    maxWaveEver: 0,
  },
  questClaimedIds: new Set(),
  questProfileLoaded: false,
  activeMissions: [],
  recentMissionIds: [],
  materials: readStoredObject('invader_materials', '{"scrap":0,"core":0,"crystal":0,"composite":0}'),
  shopUpgrades: readStoredObject('invader_shop', '{}'),
  shopCursor: 0,
  /** UPGRADEツリーで未解放ノードをタップしたときのフォーカス（null=通常の強化カード） */
  shopTreeFocusId: null,
  /** ハイブリッドA: カテゴリ別「拡張ルート」オーバーレイ（atk/def/spd/ene / null） */
  shopSubgraphCatId: null,
  shopSubgraphScrollY: 0,
  shopTab: 0,
  mapRoutes: [],
  hoveredBtn: null,
  bossMinions: [],
  shipShapeIdx: 0,
  shipColorIdx: 0,
  shipTraitIdx: 0,
  customizeCursor: 0,
  statusCardExpanded: false,
  /** 出撃準備の装備カード（最新モックは展開装備表示） */
  customizeEquipExpanded: true,
  uiLastTap: {id:null, frame:-99},
  shipWeaponIdx: 0,
  titleWarpTimer: 0,
  // タイトルの「つきまわり」用（マウス追従）
  titlePointerX: 0,
  titlePointerY: 0,
  titleMoonFX: 0,
  titleMoonFY: 0,
  // タイトル遠景戦闘（リズム型）
  titleBattlePhase: 'idle', // idle | engage
  titleBattleTimer: 0,
  titleBattleCooldown: 0,
  titleBgQuality: readTitleBgQuality(),
  /** コンティニュー（💎）使用後〜次のクリア確定まで、そのクリアの★更新をスキップ */
  continueNoStarsThisRun: false,
  /** ローカル表示名（ランキング・週次用。サーバなし） */
  displayName: (() => {
    try {
      const v = localStorage.getItem('invader_display_name');
      if (typeof v === 'string' && v.trim()) return v.trim().slice(0, 12);
    } catch (e) {}
    return 'PLAYER';
  })()
};

game.hiScore = game.hiScores[0] || 0;
if (!Number.isFinite(game.highestStage) || game.highestStage < 1) game.highestStage = 1;
if (game.shopTreeFocusId === undefined) game.shopTreeFocusId = null;
if (game.shopSubgraphCatId === undefined) game.shopSubgraphCatId = null;
if (!Number.isFinite(game.shopSubgraphScrollY)) game.shopSubgraphScrollY = 0;
if (game.customizeEquipExpanded === undefined) game.customizeEquipExpanded = true;

// loadout の後方互換（古い保存データ対策）
if (!game.playerLoadout || typeof game.playerLoadout !== 'object') {
  game.playerLoadout = { charId: null, equip: [null, null, null], pets: [null, null, null], weaponId: null, _equipSlot: 0 };
}
if (!Array.isArray(game.playerLoadout.equip)) game.playerLoadout.equip = [null, null, null];
if (game.playerLoadout.equip.length < 3) game.playerLoadout.equip = [...game.playerLoadout.equip, null, null, null].slice(0, 3);
if (!Array.isArray(game.playerLoadout.pets)) game.playerLoadout.pets = [null, null, null];
if (game.playerLoadout.pets.length < 3) game.playerLoadout.pets = [...game.playerLoadout.pets, null, null, null].slice(0, 3);
if (!Number.isFinite(+game.playerLoadout._equipSlot)) game.playerLoadout._equipSlot = 0;
game.playerLoadout._equipSlot = Math.max(0, Math.min(2, game.playerLoadout._equipSlot));

SHOP_ITEMS.forEach(s => {
  if (game.shopUpgrades[s.id] === undefined) game.shopUpgrades[s.id] = 0;
});
