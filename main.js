import {
  getPlanet,
  getWorldInfo,
  getPlanetEnemyColors,
  ENEMY_PREVIEW_COLORS,
  ENEMY_PREVIEW_LABELS,
  getStageEnemyTypes,
  drawEnemyPreviewIcon,
  WEAPONS,
  WEAPON_LABEL,
  WEAPON_COLOR,
  UPGRADE_POOL,
  RARITY_COLORS,
  LR_RAINBOW,
  getLRColor,
  appendColorAlpha,
  CHAR_POOL,
  EQUIP_POOL,
  PET_POOL,
  WEAPON_GACHA_POOL,
  ALL_GACHA_POOL,
  EXP_TABLE,
  LEVEL_BONUSES,
  EVENT_LIST,
  SHIP_SHAPES,
  SHIP_COLORS,
  SHIP_TRAITS,
  SHIP_WEAPONS,
  ACHIEVEMENT_DEFS,
  BOSS_NAMES,
  MAT_LABEL,
  MAT_COLOR,
  UPGRADE_LV_COSTS,
  SHOP_MAX_LV,
  SHOP_ITEMS,
  SYNTH_RECIPES,
  STAGE_TYPE_LABELS,
  STAGE_TYPE_DESCS,
  STAGE_TYPE_COLORS,
  MARS_BATTLE_BACKGROUNDS,
  MARS_STAGE_MAP_BG,

} from './js/game-data.js';
import {
  ensureBossRenderState,
  updateBossAttackAnim,
  startBossAttackAnim,
} from './js/game/boss-render.js';
import {
  getMarsWavePreset,
  marsPresetShouldAutoSpawnBossAfterWaves,
  expandMarsWaveSpawnTypes,
  countMarsWaveRegularEnemies,
  marsWaveHasMidBoss,
  marsWaveHasBoss,
} from './js/game/mars-wave-presets.js';
import { getStageSelectShipTarget, getStageSelectShipFollowStage } from './js/game/stage-select-map-geometry.js';
import {
  CHARGE_MAX,
  WAVE_CLEAR_DELAY,
  INVADER_W,
  INVADER_H,
  POWERUP_DURATION,
  BULLET_SPEED,
  INVADER_BULLET_SPEED,
  PLAYER_SPEED_BASE
} from './js/game/constants.js';
import { keys, bindDocumentKeys } from './js/game/input.js';
import { registerPointerInput } from './js/game/pointer-handlers.js';
import { paintFrame } from './js/game/draw-dispatch.js';
import { installCanvasPolyfills } from './js/app/polyfills.js';
import { isDevUnlockAllEquips } from './js/app/dev-flags.js';
import { installGlobalErrorHandlers } from './js/app/global-error-handlers.js';
import { startGameLoop } from './js/app/game-loop.js';
import { checkLoginBonus } from './js/game/login-bonus.js';
import {
  ensureDailyMissions,
  persistDailyMissionState,
  checkAndClaimMissions,
  checkAndClaimNormalQuests,
  ensureNormalQuestProfile,
  claimActiveMission,
  claimDailyMissionSlot,
  ensureActiveMissions,
  missionEffectiveProgress,
} from './js/game/missions-runtime.js';
import { safeLocalStorageSetItem } from './js/game/storage-helpers.js';
import { getGameDomElements } from './js/ui/dom-elements.js';
import { createMessageController } from './js/ui/message.js';
import { mountStageSelectOverlay, setStageSelectOverlayHelpers } from './js/ui/stage-select-overlay.js';
import { mountGalaxyMapOverlay, setGalaxyMapOverlayHelpers } from './js/ui/galaxy-map-overlay.js';
import { runUpdate } from './js/game/update-tick.js';
import {
  game,
  actions,
  setTitleBgQuality,
  readTitleBackgroundImageSrc,
  setTitleBackgroundImageSrc,
  disableTitleBackgroundImage,
  enableDefaultTitleBackgroundImage,
} from './js/game/game-store.js';
import {
  evaluateMilestoneAchievements,
  claimNextMilestoneTier,
} from './js/game/achievements-milestones.js';
import { buildDailyMissionSnapshot, countDailyDoneUnclaimed } from './js/game/daily-hub.js';
import { hexToRgb } from './js/game/color-utils.js';
import {
  FUEL_CAP,
  FUEL_COST_PER_RUN,
  CONTINUE_GEM_COST,
  syncFuel,
  fuelNextRegenMs,
  addFuel,
  tryConsumeFuelForRun,
  stageSelectFuelLaunchOk,
  formatFuelMmSs,
} from './js/game/fuel.js';
import {
  initAudio,
  playSound,
  startBGM,
  stopBGM,
  vibrate,
  saveVolume,
  initMasterVolumeFromStorage,
} from './js/game/audio.js';
import { getImage } from './js/game/image-cache.js';
import { currentWeapon, cycleWeapon, getAvailableWeapons } from './js/game/weapon.js';
import { saveCoins, saveGems, addGems } from './js/game/economy.js';
import {
  applyLevelToAtkMult,
  applyLevelToStatAdd,
  getItemLevelBonus,
  upgradeBonusNowNext,
} from './js/game/gacha-level-math.js';
import {
  saveGachaData,
  ensureAllCharsUpgradable,
  ensureAllEquipsOwnedForTest,
  gachaRollOne,
  addGachaItem,
  doPremiumPull,
  canDailyGacha,
  doDailyGacha,
  getLevelUpCost,
  tryLevelUpItem,
  doWeaponFusion,
  tryPetLevelUp,
  getPetUpgradeCost,
  canPetUpgrade,
  doGachaPull,
} from './js/game/gacha.js';
import { IAP_PACKAGES, NOTICES } from './js/game/iap-notices-data.js';
import { createUiButtons } from './js/game/ui-buttons.js';
import { createHandleKey } from './js/game/handle-key.js';
import { getLocalWeekEpoch, pushWeeklyLocalScore, readWeeklyLocalBoard } from './js/game/weekly-board.js';
import { drawShopHex, shopHexPan, shopHexZoomAt, setShopHexSel, clearShopHexSel, getShopHexSel, resetShopHexCamera, setShopHexOverview, triggerShopHexBurst, getShopHexNodeInfo, getShopHexMysteryHint } from './js/game/draw-shop-hex.js';
import { drawPetShape } from './js/draw/draw-pet-shape.js';
import { drawEquipShape } from './js/draw/draw-equip-shape.js';
import { drawShipShape } from './js/draw/draw-ship-shape.js';
import {
  setDrawDependencies as setScreenDrawDeps,
  drawUpgradeScreen,
  drawStageSelectScreen,
  drawCustomizeScreen,
  drawMissionsScreen,
  drawLoadoutScreen,
  drawBossSelectScreen,
  drawModeSelectScreen,
  drawMapScreen,
  drawGachaScreen,
  drawGachaRatesModalIfOpen,
  drawGachaResult,
  drawGachaSummary,
  drawGachaRates,
  drawStardustShop,
  drawShopScreen,
  drawNotificationsScreen,
  drawSettingsScreen,
  drawInboxScreen,
  drawEventsScreen,
  drawIAPScreen,
  drawStageResult
} from './js/draw/draw-screens.js';
import { drawSynthesisScreen, setSynthScreenDrawDeps } from './js/draw/draw-screen-synthesis.js';
import { drawFusionScreen, setFusionScreenDrawDeps } from './js/draw/draw-screen-fusion.js';
import {
  getGachaResultCardLayout,
  getGachaAuxStripLayout,
  getGachaRatesModalRect,
  getGachaRatesModalLinkRect,
  getGachaInsufficientModalRect,
  getGachaZukanFilterPools,
  computeZukanGridMetrics,
} from './js/draw/draw-screen-gacha.js';
import {
  setDrawDependencies as setEntityDrawDeps,
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
} from './js/draw/draw-entities.js';
import {
  setDrawDependencies as setUIDrawDeps,
  drawUIButtons,
  drawPauseOverlay,
  drawGameOverOverlay,
  drawCriticalVignette,
  drawJoystick,
  drawScreenFlash,
  drawVignette,
  drawBattleBackground,
  drawStarfield,
  drawTitleDistantSilhouette,
  drawTitleWarp,
  drawTitle,
  drawTitleTermBezel,
  updateDamageNumbers,
  drawDamageNumbers,
  drawParticles,
  drawGroundLine,
  drawHUD,
  drawLifeGainDisplay,
  drawLevelUpDisplay,
  drawEventBanner,
  drawMatPopups,
  drawStageClearAnim,
  drawBossWarning,
  drawStageBanner,
  drawHitFlash,
  drawScanlines,
  drawSurvivalTimer,
  drawWaveBanner
} from './js/draw/draw-ui.js';
import { createHudController } from './js/ui/hud.js';
import { loadSettings as _loadSettings, saveSettings as _saveSettings } from './js/game/settings-storage.js';
import {
  loadInbox as _loadInbox,
  saveInbox as _saveInbox,
  addInboxItem as _addInboxItem,
  claimInboxItem as _claimInboxItem,
  claimAllInbox as _claimAllInbox,
} from './js/game/inbox-storage.js';
import {
  computeStageStarMedal,
  computeStageRankTotal,
  rankFromTotal,
  commitStageStarMedalForCurrentClear as _commitStageStarMedalForCurrentClear,
  getStageMedalCount as _getStageMedalCount,
  getStageStarsForMap as _getStageStarsForMap,
} from './js/game/stage-medals.js';
import { wrapFillJp, truncateLine } from './js/draw/canvas-utils.js';
import { drawHexagon, drawStar, hexBoundaryPoint, circleBoundaryPoint } from './js/draw/geometry.js';
import { drawWorldBgObjects, setWorldBgDrawDeps } from './js/draw/draw-world-bg.js';
import { BOSS_SELECT_DATA } from './js/game/boss-select-data.js';
import { drawBossCardSprite, setBossCardDrawDeps } from './js/draw/draw-boss-card.js';
import { pickBossPattern as _pickBossPattern, fireBossPattern as _fireBossPattern } from './js/game/boss-patterns.js';
import { STARDUST_SHOP_ITEMS, applyStardustShop as _applyStardustShop } from './js/game/stardust-shop.js';
import {
  handleGachaResultPrimaryAction,
  handleGachaMainClick,
  handleGachaResultClick,
  handleGachaSummaryClick,
  handleGachaRatesClick,
  handleStardustShopClick,
} from './js/ui/gacha-click-handlers.js';
import {
  initEnvGimmicks,
  updateEnvGimmicks,
  drawEnvGimmicks,
  setEnvGimmicksDrawDeps,
} from './js/game/env-gimmicks.js';
import {
  pickInvaderType,
  spawnInvader,
  spawnInvaderOfType,
  spawnFormation,
  spawnHealer,
  spawnMiniBoss,
} from './js/game/enemy-spawning.js';
import {
  saveLoadout,
  rarityRank,
  equipEffectScore,
  getEquipMainEffectText,
  equipPresetScore,
  equipMatchesQuickFilter,
  buildEquipPool,
  buildLoadoutPool,
  applyLoadoutSelection,
  computeBaseStats,
} from './js/game/equipment.js';

initMasterVolumeFromStorage();
installCanvasPolyfills();

const { canvas, ctx, stageEl, messageEl, W, H } = getGameDomElements();
const { showMessage } = createMessageController(messageEl);

{
  const src = readTitleBackgroundImageSrc();
  if (src) getImage(src);
  getImage('./assets/stage-select-world1-left.png');
  getImage(MARS_STAGE_MAP_BG);
  for (const url of Object.values(MARS_BATTLE_BACKGROUNDS)) getImage(url);
  getImage('./assets/enemies/mars/normal-1-1.png');
  getImage('./assets/player/dragon-lord.png');
  getImage('./assets/enemies/mars/boss-1-1.png');
  getImage('./assets/ui/stage-result-mars-bg.png');
}

if (typeof window !== 'undefined') {
  window.invaderTitleBackground = {
    setSrc: setTitleBackgroundImageSrc,
    disable: disableTitleBackgroundImage,
    useDefaultFile: enableDefaultTitleBackgroundImage,
    readSrc: readTitleBackgroundImageSrc,
  };
}

function getTheme() {
  const p = getPlanet(game.stage);
  return { bg: p.bg, accent: p.accent, nebula: p.nebula, ground: p.ground };
}

function formatStageId(stageNum) {
  const s = Math.max(1, Math.floor(stageNum || 1));
  const w = Math.floor((s - 1) / 10) + 1;
  const local = ((s - 1) % 10) + 1;
  return `${w}-${local}`;
}

const hudController = createHudController({ game, stageEl, formatStageId, syncFuel, FUEL_CAP, formatFuelMmSs, fuelNextRegenMs });
function updateHUD() { hudController.updateHUD(); }

function isUpgradeMaxed(id) {
  switch (id) {
    case 'speed': return game.playerUpgrades.speed >= 4;
    case 'firerate': return game.playerUpgrades.firerate >= 4;
    case 'damage': return game.playerUpgrades.damage >= 5;
    case 'bulletspd': return game.playerUpgrades.bulletSpd >= 9;
    case 'spread': return game.playerUpgrades.spread;
    default: return false;
  }
}
function pickUpgradeChoices() {
  // 上限済みを除外し、未出現を優先する
  const available = UPGRADE_POOL.filter(u => !isUpgradeMaxed(u.id));
  const unseen = available.filter(u => !game.seenUpgradeIds.has(u.id));
  const seen = available.filter(u => game.seenUpgradeIds.has(u.id));
  const pool = [...unseen.sort(() => Math.random() - 0.5), ...seen.sort(() => Math.random() - 0.5)];
  // 既出かつ上限未満のものは「強化版」ラベルを付与
  game.upgradeChoices = pool.slice(0, 3).map(u => {
    if (game.seenUpgradeIds.has(u.id) && !isUpgradeMaxed(u.id)) {
      return { ...u, label: u.label + ' ++', enhanced: true };
    }
    return { ...u, enhanced: false };
  });
}
function applyUpgrade(idx) {
  if (idx >= game.upgradeChoices.length) return;
  const up = game.upgradeChoices[idx];
  const mult = up.enhanced ? 2 : 1;
  game.seenUpgradeIds.add(up.id);
  playSound('upgrade_pick');
  switch (up.id) {
    case 'speed': game.playerUpgrades.speed = Math.min(game.playerUpgrades.speed + mult, 4); break;
    case 'firerate': game.playerUpgrades.firerate = Math.min(game.playerUpgrades.firerate + mult, 4); break;
    case 'life': game.playerStats.hp = Math.min(game.playerStats.maxHp, game.playerStats.hp + 30 * mult); updateHUD(); break;
    case 'laser': game.weaponAmmo.laser += 15 * mult; break;
    case 'homing': game.weaponAmmo.homing += 8 * mult; break;
    case 'explosive': game.weaponAmmo.explosive += 8 * mult; break;
    case 'damage': game.playerUpgrades.damage = Math.min(game.playerUpgrades.damage + mult, 5); break;
    case 'spread': game.playerUpgrades.spread = true; break;
    case 'invincible': game.playerUpgrades.invincibleBonus += 60 * mult; break;
    case 'bulletspd': game.playerUpgrades.bulletSpd = Math.min(game.playerUpgrades.bulletSpd + 3 * mult, 9); break;
    case 'shieldUp': game.playerShield = true; break;
  }
  genMapRoutes();
  game.state = 'map';
}

function addCoins(amount) {
  const spc3Mult = 1 + (game.shopUpgrades?.spc3 || 0) * 0.10;
  const boost = (game.gachaInventory['passive_coin']?.level >= 1 ? 1.25 : 1) * (getPetEffect('fairy') ? 1.2 : 1) * spc3Mult;
  game.coins += Math.floor(amount * boost);
  saveCoins();
  const el = document.getElementById('coins');
  if (el) el.textContent = game.coins;
}

// ===== EXP / レベル =====
function applyLevelUpBonusRow(bonus) {
  if (!bonus || !bonus.stat) return;
  switch (bonus.stat) {
    case 'firerate':
      game.playerUpgrades.firerate = Math.min((game.playerUpgrades.firerate || 0) + 1, 6);
      break;
    case 'speed':
      game.playerUpgrades.speed = Math.min((game.playerUpgrades.speed || 0) + 1, 6);
      break;
    case 'damage':
      game.playerUpgrades.damage = Math.min((game.playerUpgrades.damage || 1) + 1, 8);
      break;
    case 'life':
      game.playerStats.maxHp += 15;
      game.playerStats.hp = Math.min(game.playerStats.maxHp, game.playerStats.hp + 15);
      updateHUD();
      break;
    case 'bulletspd':
      game.playerUpgrades.bulletSpd = Math.min((game.playerUpgrades.bulletSpd || 0) + 2, 10);
      break;
    case 'spread':
      game.playerUpgrades.spread = true;
      break;
    default:
      break;
  }
}

function addExp(amount) {
  const expBoost = (game.gachaInventory['passive_exp']?.level >= 1 ? 1.2 : 1) * (getPetEffect('exp') ? 1.15 : 1);
  game.exp += Math.floor(amount * expBoost);
  const nextThreshold = EXP_TABLE[Math.min(game.playerLevel, EXP_TABLE.length - 1)];
  if (game.exp >= nextThreshold && game.playerLevel < 10) {
    game.exp -= nextThreshold;
    game.playerLevel++;
    const bonus = LEVEL_BONUSES[(game.playerLevel - 2) % LEVEL_BONUSES.length];
    applyLevelUpBonusRow(bonus);
    game.levelUpDisplay = { text: bonus.label, timer: 180, color: '#ff0' };
    triggerFlash(255, 220, 0, 0.25);
    playSound('levelup');
  }
}
// ===== チャージショット =====

// ===== ダッシュ =====
const DASH_DURATION = 10, DASH_COOLDOWN = 70, DASH_SPEED = 18;

// ===== ランダムイベント =====

// ===== 小惑星ステージ =====

// ===== 編隊 / ヒーラー =====

// ===== 設定 / 受け取りボックス / 課金定義 =====
function loadSettings() { _loadSettings(game); }
function saveSettings() { _saveSettings(game); }

function loadInbox() { _loadInbox(game); }
function saveInbox() { _saveInbox(game); }
function addInboxItem(item) { _addInboxItem(game, item); }

/** 段階型実績（`invader_achievements_v1`）の次段階を受取 → 受け取りBOX */
function claimMilestoneAchievementToInbox(achievementId) {
  const r = claimNextMilestoneTier(game, achievementId);
  if (!r.ok) return r;
  addInboxItem({
    label: `🏅 実績: ${r.label} (段階 ${r.tierIndex + 1})`,
    coins: r.reward.coins || 0,
    gems: r.reward.gems || 0,
    dust: r.reward.dust || 0,
    icon: 'milestone',
  });
  playSound('upgrade_pick');
  game.lifeGainDisplay = { text: '📬 実績報酬を受け取りBOXに送りました', timer: 200, color: '#ff0' };
  return r;
}
function claimInboxItem(id) { _claimInboxItem(game, id, { addCoins, addGems, addFuel, saveGachaData }); }
function claimAllInbox() { _claimAllInbox(game, { addCoins, addGems, addFuel, saveGachaData }); }

// ===== ゲーム変数 =====
function saveScore(s) {
  game.hiScores = [s, ...game.hiScores].sort((a, b) => b - a).slice(0, 5);
  game.hiScore = game.hiScores[0];
  safeLocalStorageSetItem('invader_hiscores', JSON.stringify(game.hiScores));
}

function commitStageStarMedalForCurrentClear() { _commitStageStarMedalForCurrentClear(game); }
/** マップの ★ 表示：右パネルのメダル（getStageMedalCount）と同じ 0〜3 */
function getStageStarsForMap(stageNum) { return _getStageStarsForMap(game, stageNum); }
/** 右パネル条件用：実際のメダル 0〜3（保存値。未保存のクリア済みは 3 とみなす） */
function getStageMedalCount(stageNum) { return _getStageMedalCount(game, stageNum); }
function saveDisplayName(name) {
  const n = String(name || '').trim().slice(0, 12) || 'PLAYER';
  game.displayName = n;
  safeLocalStorageSetItem('invader_display_name', n);
}
// ゲートアニメ定数
const GATE_OPEN = 60, GATE_WARPOUT = 50, GATE_FADEIN = 40;
function gateStall(r) { return r === 'LR' ? 180 : r === 'SSR' ? 110 : r === 'SR' ? 55 : 14; }
function gateTotal(r) { return GATE_OPEN + gateStall(r) + GATE_WARPOUT + GATE_FADEIN; }
// ===== ロードアウト / スタット =====
const GACHA_ANIM_INTRO = 50, GACHA_ANIM_SPIN = 50, GACHA_ANIM_BURST = 20;
const GACHA_ANIM_TOTAL = GACHA_ANIM_INTRO + GACHA_ANIM_SPIN + GACHA_ANIM_BURST;

// ===== 機体カスタマイズ =====
function unlockAchievement(id) {
  if (game.achievements[id]) return;
  game.achievements[id] = true;
  safeLocalStorageSetItem('invader_achievements', JSON.stringify(game.achievements));
  const def = ACHIEVEMENT_DEFS.find(d => d.id === id);
  if (def) game.lifeGainDisplay = { text: `実績解除: ${def.label}`, timer: 180, color: '#ff0' };
}

// ===== ステージ進行 =====

// ===== アップグレード重複防止 =====

// ===== ボスカットイン =====
const BOSS_CUTIN_DURATION = 155;

// ===== 環境ギミック =====

// ===== 必殺技ゲージ =====
const ULTIMATE_MAX = 100;
const ULTIMATE_DURATION = 40;

// ===== ステージタイプ =====
const SURVIVAL_DURATION = 1800;

// ===== ステージ評価 =====

// ===== ウェーブシステム =====
function useMarsWavePresetNow() {
  return (
    (game.stageType === 'normal' || game.stageType === 'endless') &&
    !!getMarsWavePreset(game.stage)
  );
}

function getWaveCount() {
  if (useMarsWavePresetNow()) {
    const p = getMarsWavePreset(game.stage);
    if (p) return p.length;
  }
  return Math.min(4, 2 + Math.floor(game.stage / 5));
}

function getWaveSize(wn) { return Math.max(4, 3 + Math.floor(game.stage / 2) + (wn - 1) * 2); }

function shouldSpawnBossAfterWavesClear() {
  if (!useMarsWavePresetNow()) return true;
  return marsPresetShouldAutoSpawnBossAfterWaves(game.stage);
}

// ===== デイリー／アクティブ任務／常設クエスト → js/game/missions-runtime.js =====

// ===== ショップ =====
// ===== 素材システム =====
// scrap=🔩スクラップ core=⚡エネルギーコア crystal=💎量子結晶 composite=🔷コンポジットコア fusionStone=🔮融合石 starCrystal=💫星結晶
function saveMaterials() { safeLocalStorageSetItem('invader_materials', JSON.stringify(game.materials)); }
function saveEquipStars() { safeLocalStorageSetItem('invader_equip_stars', JSON.stringify(game.equipStars || {})); }
function addMaterial(type, n = 1) {
  game.materials[type] = (game.materials[type] || 0) + n; saveMaterials();
  if (game.state === 'playing' && game.player) {
    const icons = { scrap: '🔩', core: '⚡', crystal: '💎', composite: '🔷' };
    game.matPopups.push({ x: game.player.x + game.player.w / 2 + (Math.random() - 0.5) * 50, y: game.player.y, text: `+${n}${icons[type] || type}`, timer: 55, vy: -0.9 });
  }
}
function saveShop() { safeLocalStorageSetItem('invader_shop', JSON.stringify(game.shopUpgrades)); }

function getUpgradeLvCost(lv) { return UPGRADE_LV_COSTS[Math.min(lv, UPGRADE_LV_COSTS.length - 1)]; }

// ===== ショップ（強化）: スキルツリー前提条件（段階解放）=====
// - ゴースト表示: 「次の枝」がうっすら見える（増えていく感）
// - 実体化（強化可能）: 前提Lvを満たした瞬間に枝が伸びてノードがポップ
// 新ツリー解放ルール（細かく枝が広がる）:
// - 各カテゴリの1本目は最初から強化可
// - Lv2/Lv3 で同カテゴリ内の枝が開く
// - 一部は「カテゴリ合計Lv」で横枝が見える
const SHOP_PREREQS_SOLID = {
  // エンジン/移動（青）
  speed: [],                       // 入口
  // 攻撃（赤）
  firerate: [],                       // 入口
  critrate: [{ id: 'firerate', lv: 2 }],  // Lv2で横枝解放
  // 防御（緑）
  maxhp: [],                       // 入口
  dashcd: [{ id: 'maxhp', lv: 2 }],   // Lv2で枝解放
  def_regen: [{ id: 'maxhp', lv: 3 }],
  // エネルギー（黄）
  bulletspd: [{ id: 'speed', lv: 2 }],   // 移動強化が進むと見える
  ene_over: [{ id: 'bulletspd', lv: 2 }],
  // 機動（紫）
  spd_boost: [{ id: 'speed', lv: 2 }],
  spd_phase: [{ id: 'spd_boost', lv: 1 }],
  atk_burst: [{ id: 'firerate', lv: 2 }],
  ene_chain: [{ id: 'bulletspd', lv: 2 }],
  arm1: [{ id: 'maxhp', lv: 3 }],
  arm3: [{ id: 'arm1', lv: 2 }],
  spc1: [{ id: 'speed', lv: 2 }],
  spc2: [{ id: 'spc1', lv: 2 }],
  spc3: [{ id: 'spc2', lv: 2 }],
};
const SHOP_PREREQS_GHOST = {
  speed: [],
  firerate: [],
  critrate: [{ id: 'firerate', lv: 1 }],
  maxhp: [],
  dashcd: [{ id: 'maxhp', lv: 1 }],
  def_regen: [{ id: 'maxhp', lv: 2 }],
  bulletspd: [{ id: 'speed', lv: 1 }],
  ene_over: [{ id: 'bulletspd', lv: 1 }],
  spd_boost: [{ id: 'speed', lv: 1 }],
  spd_phase: [{ id: 'spd_boost', lv: 1 }],
  atk_burst: [{ id: 'firerate', lv: 1 }],
  ene_chain: [{ id: 'bulletspd', lv: 1 }],
  arm1: [{ id: 'maxhp', lv: 2 }],
  arm3: [{ id: 'arm1', lv: 1 }],
  spc1: [{ id: 'speed', lv: 1 }],
  spc2: [{ id: 'spc1', lv: 1 }],
  spc3: [{ id: 'spc2', lv: 1 }],
};
const _MILESTONE_BRANCHES = {
  t3_overclock: ['firerate', 'critrate', 'atk_burst'],
  t3_reflect: ['maxhp', 'dashcd', 'def_regen'],
  t3_ghost: ['speed', 'spd_boost', 'spd_phase'],
  t3_nova: ['bulletspd', 'ene_over', 'ene_chain'],
  t3_chaos: ['spc1', 'spc2', 'spc3'],
};
function isMilestoneComplete(id) {
  const branch = _MILESTONE_BRANCHES[id];
  if (!branch) return false;
  return branch.every(n => (game.shopUpgrades?.[n] || 0) >= SHOP_MAX_LV);
}
function getShopLv(id) { return game.shopUpgrades?.[id] || 0; }
function getShopItemById(id) { return SHOP_ITEMS.find(it => it.id === id) || null; }
function getShopPrereqs(id, mode = 'solid') {
  const src = (mode === 'ghost') ? SHOP_PREREQS_GHOST : SHOP_PREREQS_SOLID;
  return Array.isArray(src[id]) ? src[id] : [];
}
function isShopPrereqsMet(id, mode = 'solid') {
  const reqs = getShopPrereqs(id, mode);
  for (const r of reqs) {
    if (getShopLv(r.id) < (r.lv || 0)) return false;
  }
  return true;
}
function getShopPrereqText(id, mode = 'solid') {
  const reqs = getShopPrereqs(id, mode);
  if (!reqs.length) return '';
  const parts = reqs.map(r => {
    const it = getShopItemById(r.id);
    const name = it ? it.label : r.id;
    return `${name}Lv${r.lv || 0}`;
  });
  return `必要: ${parts.join(' / ')}`;
}

function canUpgradeShopItem(item) {
  const lv = game.shopUpgrades[item.id] || 0;
  if (lv >= SHOP_MAX_LV) return false;
  const [cost, mats, stReq] = getUpgradeLvCost(lv);
  if (game.highestStage < stReq) return false;
  if (!isShopPrereqsMet(item.id, 'solid')) return false;
  if (game.coins < cost) return false;
  for (const [k, v] of Object.entries(mats)) {
    if (k === 'gems') { if (game.gems < v) return false; }
    else if ((game.materials[k] || 0) < v) return false;
  }
  return true;
}
function applyShopUpgrade(idx) {
  const item = SHOP_ITEMS[idx];
  if (!item) return;
  // 解放アニメ差分検出のため、事前に solid 状態を記録
  const beforeSolid = {};
  try {
    for (const it of SHOP_ITEMS) beforeSolid[it.id] = isShopPrereqsMet(it.id, 'solid') || (getShopLv(it.id) > 0);
  } catch (e) { }
  const lv = game.shopUpgrades[item.id] || 0;
  if (lv >= SHOP_MAX_LV) return;
  const [cost, mats, stReq] = getUpgradeLvCost(lv);
  if (game.highestStage < stReq) return;
  if (!isShopPrereqsMet(item.id, 'solid')) return;
  if (game.coins < cost) return;
  for (const [k, v] of Object.entries(mats)) {
    if (k === 'gems') { if (game.gems < v) return; }
    else if ((game.materials[k] || 0) < v) return;
  }
  game.coins -= cost; saveCoins();
  for (const [k, v] of Object.entries(mats)) {
    if (k === 'gems') { game.gems -= v; saveGems(); }
    else { game.materials[k] -= v; }
  }
  saveMaterials();
  game.shopUpgrades[item.id]++;
  saveShop();
  // ツリー解放: 前提が繋がった／幹の初回強化で短い発光ライン
  try {
    if (!Array.isArray(game.shopTreeRevealAnims)) game.shopTreeRevealAnims = [];
    const afterLv = (game.shopUpgrades[item.id] || 0);
    const lvBefore = afterLv - 1;
    if (lvBefore === 0 && afterLv >= 1) {
      const reqs0 = getShopPrereqs(item.id, 'solid');
      if (!reqs0.length) game.shopTreeRevealAnims.push({ from: 'core', to: item.id, start: game.frameCount, p: 0 });
    }
    for (const child of SHOP_ITEMS) {
      const nowSolid = isShopPrereqsMet(child.id, 'solid') || (getShopLv(child.id) > 0);
      if (!nowSolid || beforeSolid[child.id]) continue;
      const reqs = getShopPrereqs(child.id, 'solid');
      if (reqs.length) {
        for (const r of reqs) game.shopTreeRevealAnims.push({ from: r.id, to: child.id, start: game.frameCount, p: 0 });
      } else {
        game.shopTreeRevealAnims.push({ from: 'core', to: child.id, start: game.frameCount, p: 0 });
      }
    }
  } catch (e) { }
  playSound('upgrade_pick');
  updateHUD();
  try { triggerShopHexBurst(item.id); } catch (e) { }
}
function getStatPreviewText(item, lv) {
  if (lv >= SHOP_MAX_LV) return '';
  const n = lv + 1;
  switch (item.id) {
    case 'speed': return `移動速度  +${lv} → +${n}`;
    case 'firerate': return `連射速度  +${lv} → +${n}`;
    case 'maxhp': return `最大HP  +${lv * 20} → +${n * 20}`;
    case 'bulletspd': return `弾速  +${lv * 3} → +${n * 3}`;
    case 'critrate': return `CRIT率  +${lv * 5}% → +${n * 5}%`;
    case 'dashcd': return `無敵F  +${lv * 10} → +${n * 10}`;
    case 'def_regen': return `自動回復 +${lv}/5sec → +${n}/5sec HP`;
    case 'spd_boost': return `ダッシュ速度 +${lv * 10}% → +${n * 10}%`;
    case 'spd_phase': return `ダッシュ無敵 +${lv * 5}F → +${n * 5}F${n === 1 ? ' (有効化)' : ''}`;
    case 'ene_over': return `弾速 +${lv * 2} → +${n * 2}${n === 1 ? ' (貫通解放)' : ''}`;
    case 'atk_burst': { const w = 2 + Math.ceil(lv / 2), wn = 2 + Math.ceil(n / 2), iv = Math.max(90, 300 - (lv - 1) * 22), ivn = Math.max(90, 300 - (n - 1) * 22); return `${w}way ${(iv / 60).toFixed(1)}s毎 → ${wn}way ${(ivn / 60).toFixed(1)}s`; }
    case 'ene_chain': { const c = Math.ceil(lv / 2), cn = Math.ceil(n / 2), r = 70 + lv * 8, rn = 70 + n * 8; return `${c}連鎖 半径${r} → ${cn}連鎖 半径${rn}`; }
    case 'arm1': return `被弾軽減 -${lv * 2}ダメ → -${n * 2}ダメ`;
    case 'arm3': return `スパイク ${lv * 30}%反射 → ${n * 30}%`;
    case 'spc1': return `ドロップ率 +${lv * 4}% → +${n * 4}%`;
    case 'spc2': return `吸引半径 ${60 + lv * 20} → ${60 + n * 20}`;
    case 'spc3': return `コイン +${lv * 10}% → +${n * 10}%`;
    default: return '';
  }
}
/** ショップツリー／詳細パネル用: 現在Lvの効果を1行で */
function getShopCurrentEffectOneLine(item, lv) {
  if (!item) return '';
  const v = Math.max(0, Math.min(Number(lv) || 0, SHOP_MAX_LV));
  switch (item.id) {
    case 'speed': return `移動速度 +${v}`;
    case 'firerate': return `連射速度 +${v}`;
    case 'maxhp': return `最大HP +${v * 20}`;
    case 'bulletspd': return `弾速 +${v * 3}`;
    case 'critrate': return `CRIT率 +${v * 5}%`;
    case 'dashcd': return `無敵F +${v * 10}`;
    case 'def_regen': return `HP +${v}/5sec 自動回復`;
    case 'spd_boost': return `ダッシュ速度 +${v * 10}%`;
    case 'spd_phase': return `ダッシュ無敵 +${v * 5}F`;
    case 'ene_over': return `弾速 +${v * 2}${v >= 1 ? ' (貫通中)' : ''}`;
    case 'atk_burst': { const w = 2 + Math.ceil(v / 2), iv = Math.max(90, 300 - (v - 1) * 22); return `${w}way バースト ${(iv / 60).toFixed(1)}s毎`; }
    case 'ene_chain': { const c = Math.ceil(v / 2), r = 70 + v * 8; return `${c}連鎖 半径${r}px`; }
    case 'arm1': return `被弾軽減 -${v * 2}ダメ`;
    case 'arm3': return `スパイク ${v * 30}%反射ダメ`;
    case 'spc1': return `ドロップ率 +${v * 4}%`;
    case 'spc2': return `吸引半径 ${60 + v * 20}px`;
    case 'spc3': return `コイン +${v * 10}%`;
    default: return '';
  }
}
// ── HTML Shop Panel (HTML overlay, replaces canvas panel) ───────
const _SP_ROLE_COL = {
  core: '#a0d4ff', atk: '#ff4d5e', def: '#39e58f',
  spd: '#b266ff', ene: '#ffdd55', arm: '#44aaff',
  spc: '#ff8833', omega: '#e8e0ff',
};
const _SP_ROLE_NAMES = {
  core: 'CORE', atk: 'ATK系統', def: 'DEF系統', spd: '機動系統',
  ene: 'ENE系統', arm: '装甲系統', spc: '特殊系統', omega: 'OMEGA',
};
const _SP_MAT_ICON = { scrap: '🔩', core: '⚙', crystal: '💎', composite: '🔮', gems: '💠' };

function _spRgb(hex) {
  if (!hex || hex.length < 7) return '136,136,255';
  return `${parseInt(hex.slice(1, 3), 16)},${parseInt(hex.slice(3, 5), 16)},${parseInt(hex.slice(5, 7), 16)}`;
}

function updateShopPanel(id) {
  const panel = document.getElementById('shop-panel');
  if (!panel) return;
  const btn = document.getElementById('sp-btn');

  if (!id) {
    panel.classList.remove('open');
    if (btn) btn.onclick = null;
    return;
  }

  const nodeInfo = getShopHexNodeInfo(id);
  if (!nodeInfo) return;

  const { role, label, icon, tier, mystery, milestone, isShopItem, comingSoon, planned, desc } = nodeInfo;
  const col = _SP_ROLE_COL[role] || '#88ccff';
  const rgb = _spRgb(col);

  const item = SHOP_ITEMS.find(it => it.id === id);
  const lv = game.shopUpgrades?.[id] || 0;
  const maxLv = SHOP_MAX_LV;
  const showMystery = mystery && lv === 0;

  // Header
  const iconEl = document.getElementById('sp-icon');
  if (iconEl) {
    iconEl.textContent = (showMystery && !comingSoon) ? '?' : icon;
    iconEl.style.cssText = `background:rgba(${rgb},0.12);border-color:${col};color:${col};`;
  }
  const nameEl = document.getElementById('sp-name');
  if (nameEl) {
    nameEl.textContent = (showMystery && (label === '???' || !comingSoon)) ? '???' : label;
    nameEl.style.color = col;
  }
  const tagEl = document.getElementById('sp-tag');
  if (tagEl) {
    const tl = comingSoon ? 'COMING SOON' : (planned && !isShopItem && !showMystery) ? 'PLANNED' : tier === 0 ? 'CORE' : milestone ? 'MILESTONE' : tier === 4 ? 'ULTIMATE' : `TIER ${tier}`;
    const tagCol = comingSoon ? 'rgba(255,170,80,0.80)' : (planned && !isShopItem && !showMystery) ? 'rgba(120,190,255,0.80)' : col;
    tagEl.textContent = tl; tagEl.style.color = tagCol; tagEl.style.borderColor = tagCol;
  }

  // Level dots
  const dotsEl = document.getElementById('sp-lvdots');
  const lvTextEl = document.getElementById('sp-lvtext');
  if (dotsEl) {
    dotsEl.innerHTML = '';
    if (isShopItem) {
      for (let i = 0; i < maxLv; i++) {
        const dot = document.createElement('div');
        dot.className = 'sp-lvdot' + (i < lv ? ' on' : '');
        if (i < lv) dot.style.cssText = `background:${col};box-shadow:0 0 5px ${col};`;
        dotsEl.appendChild(dot);
      }
    }
  }
  if (lvTextEl) lvTextEl.textContent = !isShopItem ? (planned ? '近日実装予定' : '') : lv >= maxLv ? 'MAX' : lv === 0 ? '未解放' : `Lv ${lv} / ${maxLv}`;

  // Effect text (combines current + next level in one line)
  const effEl = document.getElementById('sp-effect');
  if (effEl) {
    if (comingSoon) {
      effEl.textContent = '次のアップデートで実装予定のブランチです。';
      effEl.style.color = 'rgba(255,170,80,0.60)';
    } else if (showMystery) {
      const hint = getShopHexMysteryHint(id);
      effEl.textContent = hint || 'この先に何があるかは、解放した者だけが知る。';
      effEl.style.color = showMystery && planned ? 'rgba(180,210,255,0.65)' : 'rgba(100,120,160,0.50)';
    } else if (planned && !isShopItem && desc) {
      effEl.textContent = desc;
      effEl.style.color = 'rgba(180,210,255,0.75)';
    } else if (isShopItem && item) {
      if (lv === 0) {
        effEl.textContent = item.desc || '-';
      } else if (lv >= maxLv) {
        effEl.textContent = getShopCurrentEffectOneLine(item, lv) + '  [MAX]';
      } else {
        effEl.textContent = getStatPreviewText(item, lv);
      }
      effEl.style.color = 'rgba(188,212,255,0.78)';
    } else {
      effEl.textContent = '';
    }
  }

  // Prerequisite warning
  const reqInfoEl = document.getElementById('sp-req');
  if (reqInfoEl) {
    reqInfoEl.style.display = 'none';
    if (isShopItem && lv < maxLv && !isShopPrereqsMet(id)) {
      const pt = getShopPrereqText(id);
      if (pt) {
        reqInfoEl.textContent = `⚠ ${pt}`;
        reqInfoEl.style.display = 'block';
      }
    }
  }

  // Cost row
  const costRow = document.getElementById('sp-costrow');
  if (costRow) {
    costRow.innerHTML = '';
    if (isShopItem && lv < maxLv && !showMystery) {
      const [coinCost, mats] = getUpgradeLvCost(lv);
      const coinOk = game.coins >= coinCost;
      const cs = document.createElement('span');
      cs.className = 'sp-citem ' + (coinOk ? 'ok' : 'ng');
      cs.textContent = `🪙 ${coinCost.toLocaleString()}${coinOk ? '' : ` (あと${(coinCost - game.coins).toLocaleString()})`}`;
      costRow.appendChild(cs);
      for (const [k, v] of Object.entries(mats)) {
        const have = k === 'gems' ? (game.gems || 0) : (game.materials?.[k] || 0);
        const ok2 = have >= v;
        const ms = document.createElement('span');
        ms.className = 'sp-mitem ' + (ok2 ? 'ok' : 'ng');
        ms.textContent = `${_SP_MAT_ICON[k] || k}×${v}${ok2 ? '' : ` (あと${v - have})`}`;
        costRow.appendChild(ms);
      }
    } else if (isShopItem && lv >= maxLv) {
      const sp = document.createElement('span');
      sp.className = 'sp-citem ok'; sp.textContent = '解放済み'; costRow.appendChild(sp);
    }
  }

  // Button
  if (btn) {
    btn.className = '';
    btn.onclick = null;
    if (comingSoon) {
      btn.textContent = '— COMING SOON —';
      btn.className = 'maxed';
    } else if (planned && !isShopItem) {
      btn.textContent = '— 近日実装予定 —';
      btn.className = 'maxed';
    } else if (!isShopItem || id === 'core') {
      btn.textContent = id === 'core' ? '— CORE —' : '強化不可';
      btn.className = 'maxed';
    } else if (lv >= maxLv) {
      btn.textContent = '✦  MAX  LEVEL';
      btn.className = 'maxed';
    } else if (!isShopPrereqsMet(id)) {
      btn.textContent = `🔒  ${getShopPrereqText(id)}`;
      btn.className = 'off';
    } else {
      const [coinCost] = getUpgradeLvCost(lv);
      const [, , stReq] = getUpgradeLvCost(lv);
      if (game.highestStage < stReq) {
        btn.textContent = `🔒 ステージ${stReq}クリアが必要 (現在: ${game.highestStage})`;
        btn.className = 'off';
      } else if (!canUpgradeShopItem(item)) {
        btn.textContent = game.coins < coinCost ? '🪙 コイン不足' : '素材が足りない';
        btn.className = 'off';
      } else {
        const itemIdx = SHOP_ITEMS.indexOf(item);
        btn.textContent = lv === 0
          ? `解放する  —  🪙 ${coinCost.toLocaleString()}`
          : `▲ 強化する  Lv${lv + 1}へ  —  🪙 ${coinCost.toLocaleString()}`;
        btn.onclick = () => { applyShopUpgrade(itemIdx); updateShopPanel(id); };
      }
    }
  }

  panel.classList.add('open');
}

function tryCompose(n = 1) {
  const maxN = Math.min(Math.floor((game.materials.scrap || 0) / 5), Math.floor((game.materials.core || 0) / 3));
  const times = n === 'max' ? maxN : Math.min(Number(n), maxN);
  if (times <= 0) return;
  game.materials.scrap -= 5 * times; game.materials.core -= 3 * times;
  game.materials.composite = (game.materials.composite || 0) + times;
  saveMaterials(); playSound('powerup');
  game.lifeGainDisplay = { text: `🔷 コンポジット×${times} 合成完了!`, timer: 120, color: '#ffaa44' };
}

function tryCustomSynth(recipeId, times = 1) {
  const recipe = SYNTH_RECIPES.find(r => r.id === recipeId);
  if (!recipe) return;
  const maxN = Object.entries(recipe.input).reduce(
    (mn, [k, v]) => Math.min(mn, Math.floor((game.materials[k] || 0) / v)), Infinity);
  const n = times === 'max' ? maxN : Math.min(Number(times), maxN);
  if (n <= 0) return;
  for (const [k, v] of Object.entries(recipe.input)) game.materials[k] = (game.materials[k] || 0) - v * n;
  game.materials[recipe.output.type] = (game.materials[recipe.output.type] || 0) + recipe.output.n * n;
  saveMaterials(); playSound('powerup');
  const icon = { scrap: '🔩', core: '⚡', crystal: '💎', composite: '🔷', fusionStone: '🔮', starCrystal: '💫' }[recipe.output.type] || '◆';
  game.lifeGainDisplay = { text: `${icon} ${recipe.label} ×${n} 完了!`, timer: 120, color: '#aaddff' };
}

const _FUSION_STAR_COSTS = [200, 500, 1000, 2000, 4000];
const _FUSION_STONE_COSTS = [1, 2, 3, 4, 5];

function tryEquipFusion(itemId) {
  if (!itemId) return;
  const curStars = game.equipStars?.[itemId] || 0;
  if (curStars >= 5) return;
  const stoneCost = _FUSION_STONE_COSTS[curStars];
  const coinCost = _FUSION_STAR_COSTS[curStars];
  if ((game.materials?.fusionStone || 0) < stoneCost) return;
  if ((game.coins || 0) < coinCost) return;
  game.materials.fusionStone -= stoneCost;
  game.coins -= coinCost;
  game.equipStars = game.equipStars || {};
  game.equipStars[itemId] = curStars + 1;
  saveEquipStars(); saveMaterials();
  const item = [...EQUIP_POOL].find(e => e.id === itemId);
  game.lifeGainDisplay = { text: `✨ ${item?.label || itemId} ★${curStars + 1} 融合完了!`, timer: 150, color: '#ffdd44' };
  playSound('powerup');
}
// ⑪ ビルドプリセット
function saveLoadoutPreset(slot) {
  if (slot < 0 || slot > 2) return;
  const presets = Array.isArray(game.loadoutPresets) ? [...game.loadoutPresets] : [];
  while (presets.length < 3) presets.push(null);
  presets[slot] = {
    charId: game.playerLoadout.charId || null,
    equip: (game.playerLoadout.equip || [null,null,null]).slice(),
    pets: (game.playerLoadout.pets || [null,null,null]).slice(),
    weaponId: game.playerLoadout.weaponId || null,
  };
  game.loadoutPresets = presets;
  safeLocalStorageSetItem('invader_loadout_presets', JSON.stringify(presets));
  game.lifeGainDisplay = { text: `📋 プリセット P${slot+1} を保存`, timer: 120, color: '#ffdd44' };
  playSound('powerup');
}
function applyLoadoutPreset(slot) {
  const presets = Array.isArray(game.loadoutPresets) ? game.loadoutPresets : [];
  const p = presets[slot];
  if (!p) {
    // 空スロット: 現在の編成を保存
    saveLoadoutPreset(slot);
    return;
  }
  game.playerLoadout.charId = p.charId;
  game.playerLoadout.equip = Array.isArray(p.equip) ? p.equip.slice() : [null,null,null];
  game.playerLoadout.pets = Array.isArray(p.pets) ? p.pets.slice() : [null,null,null];
  game.playerLoadout.weaponId = p.weaponId;
  saveLoadout();
  game.lifeGainDisplay = { text: `📋 プリセット P${slot+1} を適用`, timer: 120, color: '#88ffcc' };
  playSound('powerup');
}

function dropMaterial() {
  const p = getPlanet(game.stage).name;
  const r = Math.random();
  if (p === 'MARS') {
    if (r < 0.45) addMaterial('scrap');
  } else if (p === 'VENUS' || p === 'JUPITER') {
    if (r < 0.25) addMaterial('scrap');
    if (r >= 0.25 && r < 0.55) addMaterial('core');
  } else { // SATURN
    if (r < 0.30) addMaterial('crystal');
    if (r >= 0.30 && r < 0.50) addMaterial('core', Math.random() < 0.4 ? 2 : 1);
  }
}

// ===== マップ =====

// ===== 星 =====
function initStars() {
  game.stars = [];
  for (let i = 0; i < 200; i++) game.stars.push({
    x: Math.random() * W, y: Math.random() * H,
    size: Math.random() < 0.6 ? 1 : Math.random() < 0.8 ? 1.5 : 2,
    speed: 0.08 + Math.random() * 0.4, twinkle: Math.random() * Math.PI * 2, layer: Math.floor(Math.random() * 3),
  });
}
/** decayDiv 大きいほど短いフラッシュ（タイトルは 6 程度で約 0.1s） */
function triggerFlash(r, g, b, alpha = 0.5, decayDiv = 25) { game.screenFlash = { r, g, b, alpha, decay: alpha / decayDiv }; }
function triggerShake(i, d) { game.shakeIntensity = i; game.shakeTimer = d; }
function getShipDims() {
  const s = SHIP_SHAPES[game.shipShapeIdx].id;
  const m = 3;
  if (s === 'agile') return { w: 36 * m, h: 24 * m };
  if (s === 'heavy') return { w: 56 * m, h: 32 * m };
  return { w: 48 * m, h: 28 * m };
}

function beginTitleWarp() {
  initAudio(); startBGM();
  game.titleWarpTimer = 0;
  game.state = 'title_warp';
}

/** タイトル CONTINUE：ワープを省略して出撃準備（カスタマイズ）へ */
function beginTitleContinue() {
  initAudio(); startBGM();
  game.customizeCursor = 0;
  game.state = 'customize';
}

/**
 * タイトル：TAP / 画面クリック → ワープ演出のあと銀河マップへ。
 */
function beginTitleFromTap() {
  safeLocalStorageSetItem('invader_title_tap_hint_seen', '1');
  playSound('title_tap');
  game.titleTapFeedbackUntil = game.frameCount + 16;
  triggerFlash(90, 210, 255, 0.22, 8);
  beginTitleWarp();
}

// ===== ボタン定義 (state → [{x,y,w,h,action}]) =====
const UI_BUTTONS = createUiButtons({
  applyLoadoutSelection,
  buildLoadoutPool,
  checkAndClaimNormalQuests,
  ensureActiveMissions,
  ensureNormalQuestProfile,
  getLevelUpCost,
  loadInbox,
  saveLoadout,
  startGame,
  updateShopPanel,
});


/** Space/Enter と同じ（ガチャ結果: スキップ / 次カード / 一覧へ） */
// B: バックグラウンド遷移で自動ポーズ
document.addEventListener('visibilitychange', () => {
  if (document.hidden && game.state === 'playing') game.paused = true;
});

// ===== ボス攻撃パターン =====
function pickBossPattern() { return _pickBossPattern(); }
function fireBossPattern(pattern) { _fireBossPattern(pattern, { playSound }); }

function tryUltimate() {
  if (game.ultimateGauge < ULTIMATE_MAX || game.ultimateActive) return;
  game.ultimateGauge = 0; game.ultimateActive = true; game.ultimateTimer = ULTIMATE_DURATION;
  ensureNormalQuestProfile();
  game.questLifetime.totalUltimates++;
  game.sessionProgress.ultimateUses++; checkAndClaimMissions();
  unlockAchievement('ultimate');
  triggerFlash(255, 200, 50, 0.7); triggerShake(14, 25);
  playSound('boss_die');
  // 全敵にダメージ
  for (const inv of game.invaders) {
    if (!inv.alive) continue;
    spawnExplosion(inv.x + inv.w / 2, inv.y + inv.h / 2, '#ff0', 8);
    inv.alive = false; addCombo(inv.x + inv.w / 2, inv.y, 20); addExp(5);
  }
  for (const mb of game.miniBosses) {
    if (!mb.alive) continue;
    mb.hp -= 20;
    spawnExplosion(mb.x + mb.w / 2, mb.y + mb.h / 2, '#ff0', 10);
    if (mb.hp <= 0) killMiniBoss(mb);
  }
  if (game.boss && game.boss.entryDone) {
    const { val: dmg, isCrit: uc } = calcPlayerDmg(15 * game.playerUpgrades.damage);
    game.boss.hp -= dmg; spawnDmgNum(game.boss.x + game.boss.w / 2, game.boss.y, dmg, uc);
    spawnExplosion(game.boss.x + game.boss.w / 2, game.boss.y + game.boss.h / 2, '#ff0', 20);
    playSound('boss_hit');
    if (game.boss.hp <= 0) { killBoss(); return; }
  }
  game.invaderBullets = [];
}

function addUltimateGauge(amount) {
  if (game.ultimateGauge >= ULTIMATE_MAX) return;
  game.ultimateGauge = Math.min(ULTIMATE_MAX, game.ultimateGauge + amount);
  if (game.ultimateGauge >= ULTIMATE_MAX) playSound('charge_full');
}

function genMapRoutes() {
  const pool = game.stage <= 2 ? ['normal', 'survival'] : ['normal', 'survival', 'boss_rush'];
  const a = pool[Math.floor(Math.random() * pool.length)];
  let b; do { b = pool[Math.floor(Math.random() * pool.length)]; } while (b === a);
  game.mapRoutes = [a, b];
}
function chooseRoute(idx) {
  if (idx >= game.mapRoutes.length) return;
  let t = game.mapRoutes[idx];
  if (t === 'escort') t = 'normal';
  game.stageType = t;
  nextStage();
}
function calcRank() {
  return rankFromTotal(computeStageRankTotal(game.stageStats, game.stageType));
}

function getPetEffect(eff) {
  return game.playerLoadout.pets.some(pid => {
    const p = PET_POOL.find(p => p.id === pid);
    return p && p.effect === eff && game.gachaInventory[pid];
  });
}

function getPetParams(effect, level) {
  const lv = Math.max(1, level || 1);
  const bonus = (lv - 1) * 0.01; // 1Lvごとに+1%
  const FPS = 60;
  const base = {
    dragon: { intervalFrames: 180 },
    hawk: { intervalFrames: 180 },
    bomber: { intervalFrames: 480 },
    ghost: { intervalFrames: 600, durationFrames: 70 },
    fenrir: { intervalFrames: 180 },
  }[effect] || { intervalFrames: 180 };

  const intervalFrames = Math.max(FPS, Math.round(base.intervalFrames / (1 + bonus))); // 最低1秒
  const durationFrames = base.durationFrames ? Math.max(1, Math.round(base.durationFrames * (1 + bonus))) : 0;
  return { intervalFrames, durationFrames, bonus };
}
function calcPlayerDmg(base) {
  const isCrit = Math.random() * 100 < game.playerStats.crit;
  const berserk = (game.gachaInventory['passive_berserker']?.level >= 1 && game.playerStats.hp <= game.playerStats.maxHp * 0.5) ? 1.5 : 1;
  const chaosMult = (game.chaosBuff?.type === 'atk2x' && (game.chaosBuff.timer || 0) > 0) ? 2 : 1;
  const val = Math.round(base * game.playerStats.atk * (isCrit ? 2 : 1) * berserk * chaosMult);
  return { val, isCrit };
}

// ===== ゲームフロー =====
/** ラン開始（燃料消費〜プレイ突入）。タイトルからは beginTitleFromTap → title_warp → galaxy_map → stage_select。 */
function startGame() {
  // 燃料消費（開始ボタンを押した瞬間）
  // 失敗/クリアに関係なく消費。足りない場合は開始をブロックし、💎での補給を許可。
  if (!tryConsumeFuelForRun()) return;
  ensureDailyMissions();
  ensureNormalQuestProfile();
  game.score = 0; game.lives = 1; game.stage = game.startStage;
  game.powerupActive = null; game.powerupTimer = 0;
  game.playerShield = false; game.nextLifeScore = 5000; game.lifeGainDisplay = null;
  game.passiveRegenTimer = 0;
  game.defRegenTimer = 0;
  game.autoburstTimer = 0;
  game.weaponIdx = 0; game.weaponAmmo = { laser: 0, homing: 0, explosive: 0 };
  game.playerUpgrades = { speed: 0, firerate: 0, damage: 1, spread: false, invincibleBonus: 0, bulletSpd: 0 };
  // ベースステータス計算（キャラ+装備）
  computeBaseStats();
  // ガチャパッシブ適用
  if (game.gachaInventory['passive_shield']?.level >= 1) game.playerShield = true;
  if (game.gachaInventory['passive_ammo']?.level >= 1) game.weaponAmmo.laser += 5;
  // ガチャ武器適用
  if (game.playerLoadout.weaponId && game.gachaInventory[game.playerLoadout.weaponId]) {
    const wp = WEAPON_GACHA_POOL.find(w => w.id === game.playerLoadout.weaponId);
    if (wp) {
      const b = getItemLevelBonus(wp.id);
      const add = Math.max(0, Math.round((wp.ammo || 0) * (1 + b)));
      game.weaponAmmo[wp.weapon] = (game.weaponAmmo[wp.weapon] || 0) + add;
      game.weaponIdx = WEAPONS.indexOf(wp.weapon);
    }
  } else {
    // カスタマイズ武器適用
    const sw = SHIP_WEAPONS[game.shipWeaponIdx];
    if (sw.weapon) { game.weaponAmmo[sw.weapon] = sw.ammo; game.weaponIdx = WEAPONS.indexOf(sw.weapon); }
  }
  // ペット適用
  if (getPetEffect('fairy')) { /* coin boost handled in addCoins */ }
  game.petTimers = { dragon: 0, hawk: 0, bomber: 0, ghost: 0, fenrir: 0 }; game.petBullets = [];
  switch (SHIP_TRAITS[game.shipTraitIdx].id) {
    case 'speedy': game.playerUpgrades.speed = 2; game.playerUpgrades.firerate = 1; break;
    case 'tank': game.playerStats.maxHp += 40; game.playerStats.hp += 40; game.playerUpgrades.invincibleBonus = 60; break;
    case 'gunner': game.playerUpgrades.damage = 2; game.playerUpgrades.bulletSpd = 3; game.playerUpgrades.firerate = 1; break;
  }
  // ショップ強化を適用
  game.playerUpgrades.speed += game.shopUpgrades.speed || 0;
  game.playerUpgrades.firerate += game.shopUpgrades.firerate || 0;
  game.playerUpgrades.bulletSpd += (game.shopUpgrades.bulletspd || 0) * 3;
  game.playerStats.maxHp += (game.shopUpgrades.maxhp || 0) * 20;
  game.playerStats.hp += (game.shopUpgrades.maxhp || 0) * 20;
  game.playerStats.crit += Math.min(50 - game.playerStats.crit, (game.shopUpgrades.critrate || 0) * 5);
  if (game.shopUpgrades.dashcd) game.playerUpgrades.invincibleBonus += (game.shopUpgrades.dashcd) * 10;
  game.playerUpgrades.bulletSpd += (game.shopUpgrades.ene_over || 0) * 2;
  game.playerUpgrades.piercing = (game.shopUpgrades.ene_over || 0) >= 1
    ? 1 + Math.floor(((game.shopUpgrades.ene_over || 0) - 1) / 4) : 0;
  // Tier-3 マイルストーン効果
  if (isMilestoneComplete('t3_overclock')) game.playerUpgrades.damage *= 1.20;
  // タイマー初期化
  game.novaTimer = 0; game.chaosTimer = 0; game.chaosBuff = null;
  game.seenUpgradeIds = new Set();
  game.exp = 0; game.playerLevel = 1; game.levelUpDisplay = null;
  game.chargeTimer = 0; game.chargeReady = false; game.dashTimer = 0; game.dashCooldown = 0; game.dashTrail = [];
  game.stageType = game.bossRushModeActive ? 'boss_rush' : game.endlessModeActive ? 'endless' : 'normal'; game.stageRank = null; game.mapRoutes = [];
  game.continueNoStarsThisRun = false;
  game.stageStats = { hits: 0, maxCombo: 0, kills: 0 };
  game.bossRushCount = 0; game.bossRushDelay = 0; game.escortShip = null; game.survivalTimer = 0;
  game.ultimateGauge = 0; game.ultimateActive = false; game.ultimateTimer = 0;
  game.bossCutinTimer = 0; game.gravityZones = []; game.emFields = []; game.blackHoles = []; game.meteorRainTimer = 0; game.meteorRainWarning = 0;
  initStars(); updateHUD(); initStage();
  showMessage(null); game.state = 'playing';
}
function nextStage() {
  ensureNormalQuestProfile();
  game.questLifetime.totalStageClears++;
  game.sessionProgress.stageClears++;
  if (game.stageStats.hits === 0) {
    game.sessionProgress.noDmgStages++;
    game.questLifetime.totalNoDmgClears++;
  }
  game.stage++;
  if (game.stage > game.highestStage) {
    game.highestStage = game.stage;
    safeLocalStorageSetItem('invader_highest_stage', String(game.highestStage));
  }
  checkAndClaimMissions();
  ensureActiveMissions();
  if (game.stage >= 5) unlockAchievement('stage5');
  if (game.stage >= 10) unlockAchievement('stage10');
  updateHUD(); initStage(); game.state = 'playing';
}

function initStage() {
  game.frameCount = 0;
  game.bullets = []; game.invaderBullets = [];
  game.invaders = []; game.particles = []; game.powerups = []; game.ufo = null; game.boss = null; game.miniBosses = [];
  game.healers = []; game.meteors = [];
  game.combo = 0; game.comboTimer = 0; game.comboDisplay = null;
  game.bossPhase = false;
  game.invaderSpawnTimer = 0; game.lastShot = 0;
  game.invaderSpawnInterval = Math.max(40, 130 - (game.stage - 1) * 8);
  game.maxInvaders = Math.min(15, 4 + game.stage * 2);
  game.muzzleFlashes = []; game.bossWarningTimer = 0; game.stageBannerTimer = 120;
  game.currentEvent = null; game.eventTimer = 0; game.eventCooldown = 300;
  game.formationTimer = 500; game.healerSpawnTimer = 0;
  game.chargeTimer = 0; game.chargeReady = false; game.dashTrail = [];
  game.petTimers = { dragon: 0, hawk: 0, bomber: 0, ghost: 0, fenrir: 0 }; game.petBullets = [];
  triggerFlash(0, 100, 255, 0.3);
  const _dims = getShipDims();
  game.player = { x: W / 2 - _dims.w / 2, y: H - 100, w: _dims.w, h: _dims.h, invincibleTimer: 0, _valkyrieUsed: false };
  game.barriers = [];
  stageEl.textContent = game.stage;
  game.stageStats = { hits: 0, maxCombo: 0, kills: 0 };
  game.bossRushCount = 0; game.bossRushDelay = 0; game.escortShip = null;
  game.survivalTimer = SURVIVAL_DURATION; game.minionSpawnTimer = 0;
  game.bossCutinTimer = 0; game.gravityZones = []; game.emFields = []; game.blackHoles = []; game.meteorRainTimer = 0; game.meteorRainWarning = 0;
  game.waveNum = 0; game.waveState = 'idle'; game.waveKills = 0; game.waveTargetKills = 0; game.waveDelay = 0; game.waveBannerTimer = 0;
  game.marsWaveAwaitMiniBossClear = false;
  if (game.stageType === 'normal' || game.stageType === 'endless') initEnvGimmicks();

  // 小惑星ステージ判定
  game.isAsteroidStage = game.stage >= 2 && game.stage % 2 === 0 && (game.stageType === 'normal' || game.stageType === 'endless');
  game.asteroids = [];
  if (game.isAsteroidStage) initAsteroids();

  // ボス連戦: 即ボスフェーズ
  if (game.stageType === 'boss_rush') {
    game.bossPhase = true; spawnBoss(); return;
  }
  // ウェーブ1開始
  startWave(1);
}

function startWave(n) {
  game.waveNum = n;
  game.waveState = 'active';
  game.waveKills = 0;
  game.waveBannerTimer = 90;
  game.invaders = [];
  game.invaderBullets = [];
  game.sessionProgress.maxWave = Math.max(game.sessionProgress.maxWave, n);
  game.questLifetime.maxWaveEver = Math.max(game.questLifetime.maxWaveEver || 0, n);
  persistDailyMissionState();

  game.marsWaveAwaitMiniBossClear = false;

  const preset = useMarsWavePresetNow() ? getMarsWavePreset(game.stage) : null;
  const spec = preset && preset[n - 1];

  if (preset && spec) {
    game.waveTargetKills = countMarsWaveRegularEnemies(spec);

    if (marsWaveHasBoss(spec)) {
      spawnBoss();
      game.bossPhase = true;
      playSound('event_start');
      return;
    }

    game.marsWaveAwaitMiniBossClear = marsWaveHasMidBoss(spec);

    const midN = Math.max(0, Math.floor(spec.MID_BOSS || 0));
    if (midN > 0) {
      const mbHp = Math.round(12 + game.stage * 5);
      for (let i = 0; i < midN; i++) {
        const spread = (i - (midN - 1) / 2) * 85;
        spawnMiniBoss(W / 2 - 35 + spread, 72 + i * 5, mbHp);
      }
    }

    const types = expandMarsWaveSpawnTypes(spec);
    for (const t of types) spawnInvaderOfType(t);

    playSound('event_start');
    return;
  }

  game.waveTargetKills = getWaveSize(n);
  const count = game.waveTargetKills;
  for (let i = 0; i < count; i++) spawnInvader();
  playSound('event_start');
}

function respawn() {
  game.bullets = []; game.invaderBullets = []; game.particles = [];
  const _d = getShipDims(); game.player.w = _d.w; game.player.h = _d.h;
  game.player.x = W / 2 - game.player.w / 2; game.player.y = H - 100;
  game.player.invincibleTimer = 180 + game.playerUpgrades.invincibleBonus;
  showMessage(null); game.state = 'playing';
}

// ===== 小惑星 =====
function initAsteroids() {
  const count = 2 + Math.floor(game.stage / 2);
  for (let i = 0; i < count; i++) {
    const sz = 30 + Math.random() * 40;
    game.asteroids.push({
      x: Math.random() * (W - sz), y: 30 + Math.random() * (H * 0.55 - sz),
      w: sz, h: sz, vx: (Math.random() - 0.5) * 1.2, vy: (Math.random() - 0.5) * 0.8,
      hp: 3, maxHp: 3, angle: Math.random() * Math.PI * 2, rotSpeed: (Math.random() - 0.5) * 0.02,
      alive: true,
    });
  }
}

// ===== スポーン =====
function spawnBoss() {
  const _d = game.bossDifficulty ?? 1;
  const _hpMul = [0.65, 1.0, 1.6][_d], _spdMul = [0.8, 1.0, 1.25][_d], _fireMul = [1.4, 1.0, 0.75][_d];
  const hp = Math.round((12 + game.stage * 6) * _hpMul);
  const ability = game.selectedBossAbility || (game.stage <= 2 ? 'burst' : game.stage <= 4 ? 'split' : game.stage <= 6 ? 'teleport' : game.stage <= 8 ? 'shield' : game.stage <= 10 ? 'dasher' : 'barrage');
  game.boss = {
    bossId: (game.stage === 1 ? 'dragonLord' : null),
    x: W / 2 - 60, y: -80, w: 120, h: 60, hp, maxHp: hp, dir: 1,
    speed: (ability === 'dasher' ? 2.8 + game.stage * 0.2 : ability === 'barrage' ? 0.8 + game.stage * 0.15 : 1.5 + game.stage * 0.3) * _spdMul,
    shootTimer: 0,
    shootInterval: Math.round((ability === 'barrage' ? Math.max(35, 110 - game.stage * 5) : Math.max(25, 90 - game.stage * 5)) * _fireMul),
    frame: 0, frameTimer: 0, phase: 0, entryDone: false,
    ability,
    teleportTimer: 150,
    shieldHp: 0, shieldMax: 0, shielded: false,
    splitDone: false,
    attackCharge: 0, nextPattern: null, aimTarget: null,
    dying: false, dyingTimer: 0,
    // DASHER用
    dashTimer: Math.max(60, 120 - game.stage * 5), _dashing: false, _dashVx: 0, _dashDuration: 0,
    // BARRAGE用
    barrageCharge: 0,
  };
  if (ability === 'shield') {
    game.boss.shieldMax = 10 + game.stage * 2;
    game.boss.shieldHp = game.boss.shieldMax;
    game.boss.shielded = true;
  }
  game.bossWarningTimer = 150; game.healerSpawnTimer = 0;
}

// Boss render/attackAnim scaffold now lives in js/game/boss-render.js

function spawnDmgNum(x, y, val, isCrit = false, isHeal = false) {
  game.damageNumbers.push({ x, y: y - 10, val, isCrit, isHeal, timer: 55, vy: -1.8 });
}
function spawnExplosion(x, y, color, count = 12) {
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
    const spd = 2 + Math.random() * 3;
    game.particles.push({
      x, y, vx: Math.cos(angle) * spd, vy: Math.sin(angle) * spd,
      life: 1.0, decay: 0.03 + Math.random() * 0.02, size: 3 + Math.random() * 4, color
    });
  }
}

function trySpawnUFO() {
  if (useMarsWavePresetNow() && game.stage < 7) return;
  if (!game.ufo && !game.bossPhase && Math.random() < 0.003)
    game.ufo = {
      x: -60, y: 30, w: 56, h: 24, speed: 2 + Math.random(),
      points: [50, 100, 150, 200, 300][Math.floor(Math.random() * 5)]
    };
}

function spawnPowerup(x, y) {
  const r = Math.random();
  if (r < 0.04) game.powerups.push({ x: x - 12, y, w: 24, h: 16, vy: 1.5, type: 'heal' });
  else if (r < 0.07) game.powerups.push({ x: x - 12, y, w: 24, h: 16, vy: 1.5, type: 'shield' });
  else if (r < 0.19) {
    const types = ['double', 'invincible', 'wide'];
    game.powerups.push({ x: x - 12, y, w: 24, h: 16, vy: 1.5, type: types[Math.floor(Math.random() * 3)] });
  }
}

// ===== コンボ =====
function addCombo(x, y, baseScore) {
  ensureNormalQuestProfile();
  game.questLifetime.totalKills++;
  game.combo++; game.comboTimer = 90; game.stageStats.kills++;
  game.stageStats.maxCombo = Math.max(game.stageStats.maxCombo, game.combo);
  game.sessionProgress.maxCombo = Math.max(game.sessionProgress.maxCombo, game.combo);
  game.questLifetime.maxComboEver = Math.max(game.questLifetime.maxComboEver, game.combo);
  checkAndClaimMissions();
  if (game.combo >= 10) unlockAchievement('combo10');
  addUltimateGauge(6);
  const mult = Math.min(game.combo, 8);
  const bonus = baseScore * mult;
  game.score += bonus;
  game.comboDisplay = { x, y, text: game.combo > 1 ? `x${mult} COMBO! +${bonus}` : `+${bonus}`, timer: 60 };
  if (game.combo >= 5) triggerFlash(255, 255, 0, 0.08 + game.combo * 0.02);
  if (game.score >= game.nextLifeScore) {
    game.nextLifeScore += 5000; game.playerStats.hp = Math.min(game.playerStats.maxHp, game.playerStats.hp + 20); updateHUD();
    game.lifeGainDisplay = { text: 'SCORE BONUS  HP +20', timer: 120, color: '#ff0' };
    triggerFlash(255, 200, 0, 0.2); playSound('stage_clear');
  }
  updateHUD();
}

// ===== ダッシュ =====
function tryDash() {
  if (game.dashCooldown > 0 || game.dashTimer > 0) return;
  let dx = 0, dy = 0;
  if (keys['ArrowLeft'] || keys['KeyA']) dx = -1;
  if (keys['ArrowRight'] || keys['KeyD']) dx = 1;
  if (keys['ArrowUp'] || keys['KeyW']) dy = -1;
  if (keys['ArrowDown'] || keys['KeyS']) dy = 1;
  if (dx === 0 && dy === 0) dy = -1; // no direction → dash forward (up)
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  const _spdBoostMult = 1 + (game.shopUpgrades?.spd_boost || 0) * 0.1;
  game.player._dashVx = dx / len * DASH_SPEED * _spdBoostMult;
  game.player._dashVy = dy / len * DASH_SPEED * _spdBoostMult;
  const _shapeMod = SHIP_SHAPES[game.shipShapeIdx].id === 'agile' ? 0.55 : SHIP_SHAPES[game.shipShapeIdx].id === 'heavy' ? 1.4 : 1;
  game.dashTimer = DASH_DURATION; game.dashCooldown = Math.floor(DASH_COOLDOWN * _shapeMod);
  const _phaseBonus = (game.shopUpgrades?.spd_phase || 0) * 5;
  game.player.invincibleTimer = Math.max(game.player.invincibleTimer, DASH_DURATION + 4 + _phaseBonus);
  playSound('dash');
  triggerFlash(100, 200, 255, 0.1);
}

// ===== チャージ発射 =====
function fireChargedShot() {
  const cx = game.player.x + game.player.w / 2;
  const isHeavy = SHIP_SHAPES[game.shipShapeIdx].id === 'heavy';
  const cwBase = isHeavy ? 46 : 30;
  const wBase = isHeavy ? 56 : 48;
  const cw = Math.max(cwBase, Math.round((cwBase * game.player.w) / wBase));
  const pierces = isHeavy ? 8 : 5;
  game.bullets.push({
    x: cx - cw / 2, y: game.player.y - 10, w: cw, h: cw, charged: true,
    bspd: BULLET_SPEED + game.playerUpgrades.bulletSpd, piercesLeft: pierces
  });
  game.muzzleFlashes.push({ x: cx, y: game.player.y - 10, timer: 12, maxTimer: 12 });
  playSound('shoot_charge');
  triggerFlash(255, 200, 0, 0.15);
}

// ===== 武器発射 =====
function fireBullet() {
  const w = currentWeapon();
  const bspd = BULLET_SPEED + game.playerUpgrades.bulletSpd;
  const cx = game.player.x + game.player.w / 2;
  if (w === 'laser') {
    game.weaponAmmo.laser--;
    if (game.weaponAmmo.laser <= 0 && currentWeapon() === 'laser') cycleWeapon();
    game.bullets.push({ x: cx - 3, y: game.player.y, w: 6, h: 14, laser: true, bspd });
    playSound('shoot_laser');
    for (const inv of game.invaders) {
      if (!inv.alive) continue;
      if (cx >= inv.x && cx <= inv.x + inv.w) {
        inv.alive = false; addCombo(inv.x + inv.w / 2, inv.y, (3 - inv.row) * 10);
        spawnExplosion(inv.x + inv.w / 2, inv.y + inv.h / 2, ['#f55', '#ff0', '#0ff'][inv.row <= 0 ? 0 : inv.row <= 1 ? 1 : 2]);
        spawnPowerup(inv.x + inv.w / 2, inv.y + inv.h); addExp(12); playSound('explosion');
      }
    }
    if (game.boss && game.boss.entryDone && !game.boss.shielded && cx >= game.boss.x && cx <= game.boss.x + game.boss.w) {
      const { val: bd, isCrit: bc } = calcPlayerDmg(game.playerUpgrades.damage); game.boss.hp -= bd; spawnDmgNum(cx, game.boss.y, bd, bc); spawnExplosion(cx, game.boss.y + game.boss.h / 2, '#f80', 4); playSound('boss_hit');
      if (game.boss.hp <= 0) { killBoss(); }
    }
    return;
  }
  if (w === 'homing') {
    game.weaponAmmo.homing--;
    if (game.weaponAmmo.homing <= 0 && currentWeapon() === 'homing') cycleWeapon();
    let target = null, minDist = Infinity;
    const cands = [...invaders.filter(i => i.alive), ...(game.boss ? [game.boss] : []), ...miniBosses.filter(m => m.alive), ...healers.filter(h => h.alive)];
    for (const t of cands) {
      const dx = (t.x + t.w / 2) - cx, dy = (t.y + t.h / 2) - game.player.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < minDist) { minDist = dist; target = t; }
    }
    game.bullets.push({ x: cx - 3, y: game.player.y - 10, w: 6, h: 14, homing: true, target, bspd, vx: 0, vy: -bspd });
    playSound('shoot_homing'); return;
  }
  if (w === 'explosive') {
    game.weaponAmmo.explosive--;
    if (game.weaponAmmo.explosive <= 0 && currentWeapon() === 'explosive') cycleWeapon();
    game.bullets.push({ x: cx - 4, y: game.player.y, w: 8, h: 8, explosive: true, bspd });
    playSound('shoot_expl'); return;
  }
  const _piercing = game.playerUpgrades.piercing > 0 ? { piercesLeft: game.playerUpgrades.piercing } : {};
  if (game.playerUpgrades.spread) {
    [[-0.25, 0], [0, -0.1], [0.25, 0]].forEach(([ax, ay]) => {
      game.bullets.push({ x: cx - 2, y: game.player.y, w: 4, h: 14, vx: ax * bspd, vy: -(bspd + ay * bspd), bspd, ..._piercing });
    });
  } else {
    game.bullets.push({ x: cx - 2, y: game.player.y, w: 4, h: 14, bspd, ..._piercing });
  }
  playSound('shoot');
}

// ===== ボス撃破 =====
function killBoss() {
  const _bossAbility = game.boss?.ability;
  spawnExplosion(game.boss.x + game.boss.w / 2, game.boss.y + game.boss.h / 2, '#ff0', 30);
  triggerShake(10, 20); triggerFlash(255, 150, 0, 0.7);
  game.score += 500 + game.stage * 100; updateHUD(); addExp(150);
  addCoins(80 + game.stage * 8 + Math.floor(Math.random() * 40));
  addGems(3 + Math.floor(game.stage / 5));
  // ボス撃破 素材ドロップ
  const bp = getPlanet(game.stage).name;
  if (bp === 'SATURN') addMaterial('crystal', 2);
  else if (bp === 'JUPITER') addMaterial('crystal', 1);
  else addMaterial('core', 2);
  addMaterial('scrap', 3);
  // 難易度 HARD ボーナス
  if (game.bossDifficulty === 2) { addMaterial('scrap', 2); addMaterial('core', 1); addCoins(60); addGems(1); }
  // 週替わり FEATURED ボーナス
  const _featIdx = Math.floor(Date.now() / (7 * 24 * 3600 * 1000)) % BOSS_SELECT_DATA.length;
  if (_bossAbility && _bossAbility === BOSS_SELECT_DATA[_featIdx]?.id) { addMaterial('scrap', 2); addCoins(60); addGems(2); }
  playSound('boss_die');
  game.bossKillTotal++;
  safeLocalStorageSetItem('invader_boss_kills', String(game.bossKillTotal));
  if (game.bossKillTotal >= 5) unlockAchievement('boss5');
  // ボス種別ごとの討伐数・最高スコアを保存（難易度別キー）
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
  ensureNormalQuestProfile();
  game.questLifetime.totalBossKills++;
  game.sessionProgress.bossKills++; checkAndClaimMissions();
  if (game.stageStats.hits === 0) unlockAchievement('nodamage');
  game.boss = null; game.miniBosses = [];
  // ボス連戦: まだ次のボスがいる
  if (game.stageType === 'boss_rush' && game.bossRushCount < game.bossRushMax - 1) {
    game.bossRushCount++;
    game.bossRushDelay = 90;
    return;
  }
  game.stageRank = calcRank();
  // ボス種別ベストランク保存（難易度別キー）
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
  addCoins(rankBonus); if (rankGems > 0) addGems(rankGems);
  if (game.stageType === 'endless') {
    addCoins(rankBonus); if (rankGems > 0) addGems(rankGems); // double reward
    addExp(60);
    game.boss = null; game.bossPhase = false; game.bossMinions = [];
    game.stage++;
    game.waveNum = 0; game.waveState = 'wait'; game.waveDelay = 150;
    game.invaders = []; game.invaderBullets = [];
    game.stageStats = { hits: 0, maxCombo: 0, kills: 0 };
    triggerFlash(0, 200, 255, 0.4);
    startBGM(); return;
  }
  stopBGM();
  if (game.bossRushModeActive) { game.stageType = 'boss_rush'; nextStage(); return; }
  const _skipStars = !!game.continueNoStarsThisRun;
  const _starsEarned = _skipStars ? 0 : computeStageStarMedal(game.stageStats.hits, game.stageStats.maxCombo, game.stageType);
  commitStageStarMedalForCurrentClear();
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

function killMiniBoss(mb) {
  spawnExplosion(mb.x + mb.w / 2, mb.y + mb.h / 2, '#f80', 16);
  triggerShake(6, 10); game.score += 200 + game.stage * 50; updateHUD(); addExp(60);
  addCoins(25 + Math.floor(Math.random() * 15));
  playSound('boss_die');
  mb.alive = false;
  if (game.miniBosses.every(m => !m.alive)) {
    game.miniBosses = [];
    game.stageRank = calcRank();
    const rankBonus = { S: 50, A: 35, B: 20, C: 10 }[game.stageRank] || 10;
    addCoins(rankBonus); stopBGM();
    const _skipStars2 = !!game.continueNoStarsThisRun;
    const _starsEarned2 = _skipStars2 ? 0 : computeStageStarMedal(game.stageStats.hits, game.stageStats.maxCombo, game.stageType);
    commitStageStarMedalForCurrentClear();
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

// ===== ボス更新 =====
function updateBoss() {
  if (!game.boss) return;
  ensureBossRenderState(game.boss);
  updateBossAttackAnim(game.boss);
  // シネマティック撃破中
  if (game.boss.dying) {
    game.boss.dyingTimer--;
    const prog = 1 - game.boss.dyingTimer / 100;
    const freq = Math.max(1, 7 - Math.floor(prog * 5));
    if (game.boss.dyingTimer % freq === 0)
      spawnExplosion(game.boss.x + Math.random() * game.boss.w, game.boss.y + Math.random() * game.boss.h,
        ['#ff0', '#f80', '#f44'][Math.floor(Math.random() * 3)], 8);
    if (game.boss.dyingTimer === 60) { triggerShake(8, 14); }
    if (game.boss.dyingTimer === 30) { triggerFlash(255, 200, 0, 0.65); }
    if (game.boss.dyingTimer <= 0) killBoss();
    return;
  }
  game.boss.frameTimer++;
  if (game.boss.frameTimer >= 20) { game.boss.frame ^= 1; game.boss.frameTimer = 0; }
  if (!game.boss.entryDone) {
    game.boss.y += 2;
    if (game.boss.y >= 40) { game.boss.y = 40; game.boss.entryDone = true; game.bossCutinTimer = BOSS_CUTIN_DURATION; }
    return;
  }

  game.boss.phase = game.boss.hp < game.boss.maxHp * 0.33 ? 2 : game.boss.hp < game.boss.maxHp * 0.66 ? 1 : 0;

  // シールド
  if (game.boss.ability === 'shield' && game.boss.shielded) {
    for (let i = game.bullets.length - 1; i >= 0; i--) {
      if (rectsOverlap(game.bullets[i], game.boss) && !game.bullets[i].charged) {
        spawnExplosion(game.bullets[i].x, game.bullets[i].y, '#4af', 4);
        game.bullets.splice(i, 1);
        game.boss.shieldHp -= 1;
        playSound('boss_shield');
        if (game.boss.shieldHp <= 0) { game.boss.shielded = false; triggerFlash(50, 150, 255, 0.3); }
      }
    }
    // フェーズ変化でシールド再生成
    if (game.boss.phase > 0) { game.boss.shielded = true; game.boss.shieldHp = game.boss.shieldMax; }
  }

  // テレポート
  if (game.boss.ability === 'teleport' && game.boss.entryDone) {
    game.boss.teleportTimer--;
    if (game.boss.teleportTimer <= 0) {
      game.boss.x = Math.random() * (W - game.boss.w);
      game.boss.teleportTimer = Math.max(80, 150 - game.stage * 10);
      triggerFlash(150, 0, 255, 0.15);
      spawnExplosion(game.boss.x + game.boss.w / 2, game.boss.y + game.boss.h / 2, '#f0f', 12);
      playSound('boss_teleport');
    }
  }

  const spd = game.boss.speed * (game.boss.phase >= 1 ? 1.4 : 1) * (game.boss.phase >= 2 ? 1.3 : 1);
  game.boss.x += game.boss.dir * spd;
  if (game.boss.x + game.boss.w >= W) game.boss.dir = -1;
  if (game.boss.x <= 0) game.boss.dir = 1;

  // 攻撃テレグラフ→発射
  const interval = game.boss.phase >= 2 ? Math.floor(game.boss.shootInterval * 0.5) : game.boss.phase === 1 ? Math.floor(game.boss.shootInterval * 0.7) : game.boss.shootInterval;
  if (game.boss.attackCharge > 0) {
    game.boss.attackCharge--;
    if (game.boss.attackCharge === 0) {
      // 発射タイミング（pattern弾）：coreShot / wingBarrage が走っているなら active に同期（見た目だけ）
      if (game.boss.attackAnim?.type === 'coreShot') {
        game.boss.attackAnim.phase = 'active';
        game.boss.attackAnim.timer = 0;
      } else if (game.boss.attackAnim?.type === 'wingBarrage') {
        game.boss.attackAnim.phase = 'active';
        game.boss.attackAnim.timer = 0;
      }
      fireBossPattern(game.boss.nextPattern);
    }
  } else {
    game.boss.shootTimer++;
    if (game.boss.shootTimer >= interval) {
      game.boss.shootTimer = 0;
      game.boss.nextPattern = pickBossPattern();
      game.boss.attackCharge = 28;
      // 既存攻撃 → 見た目アニメ割り当て（竜王のみ / ロジックは変更しない）
      // - aimed / triple / spread（通常〜3WAY）→ coreShot
      // - circle / wall / sweep（広範囲・弾幕系）→ wingBarrage
      if (game.boss.nextPattern === 'aimed') {
        game.boss.aimTarget = { x: game.player.x + game.player.w / 2, y: game.player.y + game.player.h / 2 };
      }
      if (game.boss.nextPattern === 'aimed' || game.boss.nextPattern === 'triple' || game.boss.nextPattern === 'spread') {
        startBossAttackAnim(game.boss, 'coreShot', { allowOverride: false });
      } else if (game.boss.nextPattern === 'circle' || game.boss.nextPattern === 'wall' || game.boss.nextPattern === 'sweep') {
        // 強攻撃は他アニメより優先して上書き可
        startBossAttackAnim(game.boss, 'wingBarrage', { allowOverride: true });
      }
    }
  }

  // DASHER: 高速ダッシュ
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
        // 既存「突進」系（移動攻撃っぽい）→ spearDash（見た目のみ / 強制上書きはしないが coreShot より優先）
        startBossAttackAnim(game.boss, 'spearDash', { allowOverride: true });
        if (game.boss.attackAnim?.type === 'spearDash') { game.boss.attackAnim.phase = 'active'; game.boss.attackAnim.timer = 0; }
      }
    } else {
      game.boss._dashDuration--;
      game.boss.x = Math.max(0, Math.min(W - game.boss.w, game.boss.x + game.boss._dashVx));
      if (game.boss._dashDuration <= 0 || game.boss.x <= 0 || game.boss.x + game.boss.w >= W) {
        game.boss._dashing = false; game.boss.dir *= -1;
        spawnExplosion(game.boss.x + game.boss.w / 2, game.boss.y + game.boss.h / 2, '#0cf', 8);
        triggerShake(4, 5);
      }
    }
  }
  // BARRAGE: 定期的な全方位弾幕
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
      triggerFlash(200, 0, 80, 0.15); playSound('boss_split');
    }
  }
  // 分裂（フェーズ1移行時 1回）
  if (game.boss.ability === 'split' && game.boss.phase >= 1 && !game.boss.splitDone) {
    game.boss.splitDone = true;
    const halfHp = Math.floor(game.boss.hp / 2);
    spawnMiniBoss(game.boss.x - 30, game.boss.y, halfHp);
    spawnMiniBoss(game.boss.x + game.boss.w - 40, game.boss.y, halfHp);
    spawnExplosion(game.boss.x + game.boss.w / 2, game.boss.y + game.boss.h / 2, '#f80', 20);
    triggerFlash(255, 100, 0, 0.35);
    playSound('boss_split');
    game.boss = null;
    return;
  }

  // ミニオン召喚（フェーズ1以降）
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
        const { val: dmg, isCrit: dc } = calcPlayerDmg(game.bullets[i].charged ? game.playerUpgrades.damage * 4 : game.playerUpgrades.damage);
        game.bullets.splice(i, 1);
        spawnDmgNum(game.boss.x + game.boss.w / 2, game.boss.y, dmg, dc);
        game.boss.hp = Math.max(0, game.boss.hp - dmg);
        addUltimateGauge(3);
        spawnExplosion(game.boss.x + Math.random() * game.boss.w, game.boss.y + Math.random() * game.boss.h, '#f80', 5);
        playSound('boss_hit');
        if (game.boss.hp <= 0) {
          game.boss.dying = true; game.boss.dyingTimer = 100;
          game.invaderBullets = []; game.bossCutinTimer = 0;
          triggerFlash(255, 220, 80, 0.4);
          return;
        }
      }
    }
  }
}

function updateMiniBosses() {
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
        const { val: dmg, isCrit: mdc } = calcPlayerDmg(game.bullets[i].charged ? game.playerUpgrades.damage * 4 : game.playerUpgrades.damage);
        game.bullets.splice(i, 1);
        mb.hp -= dmg; spawnDmgNum(mb.x + mb.w / 2, mb.y, dmg, mdc);
        spawnExplosion(mb.x + Math.random() * mb.w, mb.y + Math.random() * mb.h, '#f80', 4);
        playSound('boss_hit');
        if (mb.hp <= 0) { killMiniBoss(mb); break; }
      }
    }
  }
}

function updateHealers() {
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
      h.alive = false; triggerFlash(0, 255, 0, 0.15); continue;
    }
    for (let j = game.bullets.length - 1; j >= 0; j--) {
      if (rectsOverlap(game.bullets[j], h)) {
        game.bullets.splice(j, 1); h.alive = false;
        spawnExplosion(h.x + h.w / 2, h.y + h.h / 2, '#0f0', 10);
        game.score += 80; updateHUD(); addExp(20); playSound('healer_die'); break;
      }
    }
    if (h.y > H) h.alive = false;
  }
}

// ===== ボスミニオン =====
function spawnBossMinion() {
  const side = Math.random() < 0.5 ? -1 : 1;
  game.bossMinions.push({
    x: side < 0 ? -36 : W + 36, y: game.boss ? game.boss.y + game.boss.h * 0.5 + Math.random() * game.boss.h * 0.3 : 60,
    w: 32, h: 26, hp: 3, maxHp: 3,
    vx: side < 0 ? 1.4 : -1.4, vy: 0.5, alive: true, frame: 0, frameTimer: 0,
  });
}
function updateBossMinions() {
  if (!game.bossPhase) { game.bossMinions = []; return; }
  for (let i = game.bossMinions.length - 1; i >= 0; i--) {
    const m = game.bossMinions[i];
    if (!m.alive) { game.bossMinions.splice(i, 1); continue; }
    m.frameTimer = (m.frameTimer || 0) + 1;
    if (m.frameTimer >= 14) { m.frame ^= 1; m.frameTimer = 0; }
    // プレイヤーに向かう (速度を抑制)
    const px = game.player.x + game.player.w / 2, py = game.player.y + game.player.h / 2;
    const dx = px - (m.x + m.w / 2), dy = py - (m.y + m.h / 2);
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const spd = Math.min(2.4, 0.9 + game.stage * 0.06);
    m.x += dx / len * spd; m.y += dy / len * spd;
    if (m.y > H + 60 || m.x < -80 || m.x > W + 80) { game.bossMinions.splice(i, 1); continue; }
    // 弾との衝突 (レーザー対応)
    for (let j = game.bullets.length - 1; j >= 0; j--) {
      if (!rectsOverlap(game.bullets[j], m)) continue;
      const b = game.bullets[j];
      const dmg = b.laser ? 999 : b.charged ? 4 : 1;
      m.hp -= dmg;
      if (!b.laser) game.bullets.splice(j, 1); // レーザーは消えない
      if (m.hp <= 0) {
        spawnExplosion(m.x + m.w / 2, m.y + m.h / 2, '#ff44ff', 10);
        game.score += 50; addExp(12); addUltimateGauge(6); updateHUD();
        m.alive = false; playSound('explosion'); break;
      } else {
        spawnExplosion(m.x + m.w / 2, m.y + m.h / 2, '#aa00aa', 3);
        if (!b.laser) break;
      }
    }
    // プレイヤーに当たる
    if (m.alive && rectsOverlap(m, game.player) && !(game.powerupActive === 'invincible' || game.player.invincibleTimer > 0)) {
      m.alive = false;
      spawnExplosion(m.x + m.w / 2, m.y + m.h / 2, '#ff44ff', 8);
      if (game.playerShield) { absorbWithShield(); } else { onPlayerHit(); }
    }
  }
}

// ===== ペット更新 =====
function updatePets() {
  if (!game.player || game.state !== 'playing') return;
  const activePets = game.playerLoadout.pets.map((pid, i) => {
    if (!pid || !game.gachaInventory[pid]) return null;
    return { def: PET_POOL.find(p => p.id === pid), idx: i, pid, inv: game.gachaInventory[pid] };
  }).filter(Boolean);
  for (const { def, idx, pid, inv } of activePets) {
    const lv = (inv?.level) || 1;
    const pp = getPetParams(def.effect, lv);
    // dragon: 180フレーム(3秒)毎に前方に火球
    if (def.effect === 'dragon') {
      game.petTimers.dragon = (game.petTimers.dragon || 0) + 1;
      if (game.petTimers.dragon >= pp.intervalFrames) {
        game.petTimers.dragon = 0;
        const cx = game.player.x + game.player.w / 2;
        game.bullets.push({ x: cx - 5, y: game.player.y - 10, w: 10, h: 10, explosive: true, bspd: BULLET_SPEED + 2, petBullet: true });
        playSound('shoot_expl');
      }
    }
    // hawk: 180フレーム毎にホーミング
    if (def.effect === 'hawk') {
      game.petTimers.hawk = (game.petTimers.hawk || 0) + 1;
      if (game.petTimers.hawk >= pp.intervalFrames) {
        game.petTimers.hawk = 0;
        let target = null, minDist = Infinity;
        const cands = [...invaders.filter(i => i.alive), ...(game.boss ? [game.boss] : []), ...miniBosses.filter(m => m.alive)];
        const cx = game.player.x + game.player.w / 2;
        for (const t of cands) { const d = Math.hypot((t.x + t.w / 2) - cx, (t.y + t.h / 2) - game.player.y); if (d < minDist) { minDist = d; target = t; } }
        game.bullets.push({ x: cx - 3, y: game.player.y - 10, w: 6, h: 14, homing: true, target, bspd: BULLET_SPEED, vx: 0, vy: -BULLET_SPEED, petBullet: true });
        playSound('shoot_homing');
      }
    }
    // turtle: 被ダメージ軽減 (onPlayerHit側で処理)
    // coin: プレイヤー周辺のコインパワーアップを自動取得 (addCoins内でboostで対応)
    // bomber: 480フレーム毎に爆弾投下
    if (def.effect === 'bomber') {
      game.petTimers.bomber = (game.petTimers.bomber || 0) + 1;
      if (game.petTimers.bomber >= pp.intervalFrames) {
        game.petTimers.bomber = 0;
        const cands = [...invaders.filter(i => i.alive), ...(game.boss ? [game.boss] : [])];
        const tgt = cands.length > 0 ? cands[Math.floor(Math.random() * cands.length)] : null;
        const tx = tgt ? tgt.x + tgt.w / 2 : game.player.x + (Math.random() - 0.5) * 200;
        const ty = tgt ? tgt.y : 100;
        const cx = game.player.x + game.player.w / 2;
        const dist = Math.sqrt((tx - cx) ** 2 + (ty - game.player.y) ** 2) || 1;
        game.bullets.push({
          x: cx - 5, y: game.player.y - 10, w: 10, h: 10, explosive: true, bspd: 7,
          vx: (tx - cx) / dist * 7, vy: (ty - game.player.y) / dist * 7, petBullet: true
        });
        playSound('shoot_expl');
      }
    }
    // ghost: 600フレーム毎に1秒無敵
    if (def.effect === 'ghost') {
      game.petTimers.ghost = (game.petTimers.ghost || 0) + 1;
      if (game.petTimers.ghost >= pp.intervalFrames) {
        game.petTimers.ghost = 0;
        game.player.invincibleTimer = Math.max(game.player.invincibleTimer || 0, (pp.durationFrames || 70));
        triggerFlash(180, 180, 255, 0.25);
        game.lifeGainDisplay = { text: 'GHOST: 無敵発動!', timer: 90, color: '#aaaaff' };
      }
    }
    // fenrir (LR): 180フレーム毎に8方向全弾幕
    if (def.effect === 'fenrir') {
      game.petTimers.fenrir = (game.petTimers.fenrir || 0) + 1;
      if (game.petTimers.fenrir >= pp.intervalFrames) {
        game.petTimers.fenrir = 0;
        const cx = game.player.x + game.player.w / 2, cy = game.player.y + game.player.h / 2;
        for (let d = 0; d < 8; d++) {
          const a = (d / 8) * Math.PI * 2;
          game.bullets.push({ x: cx - 4, y: cy - 4, w: 8, h: 8, vx: Math.cos(a) * (BULLET_SPEED + 3), vy: Math.sin(a) * (BULLET_SPEED + 3), bspd: BULLET_SPEED + 3, petBullet: true });
        }
        triggerFlash(255, 34, 102, 0.2);
        playSound('shoot_expl');
      }
    }
  }
  // valkyrie (LR): HP0になった時に一度だけ復活 (onPlayerHit側で処理)
}

// ===== イベント =====
function tryTriggerEvent() {
  if (game.currentEvent || game.bossPhase) return;
  game.eventCooldown--;
  if (game.eventCooldown > 0) return;
  game.eventCooldown = 600 + Math.floor(Math.random() * 400);
  game.currentEvent = EVENT_LIST[Math.floor(Math.random() * EVENT_LIST.length)];
  game.eventTimer = 300; playSound('event_start');
  if (game.currentEvent.id === 'supply') {
    const types = ['double', 'invincible', 'wide'];
    for (let i = 0; i < 5; i++) game.powerups.push({ x: Math.random() * (W - 24), y: -20 - i * 60, w: 24, h: 16, vy: 2, type: types[Math.floor(Math.random() * 3)] });
  }
  if (game.currentEvent.id === 'emp') {
    game.invaderBullets = [];
    game.invaders.filter(i => i.alive).forEach(inv => { inv._stunTimer = 120; });
  }
}
function updateEvent() {
  if (!game.currentEvent) return;
  game.eventTimer--;
  if (game.currentEvent.id === 'meteor' && Math.random() < 0.08)
    game.meteors.push({ x: Math.random() * W, y: -20, w: 16, h: 16, vy: 3 + Math.random() * 3, alive: true });
  if (game.eventTimer <= 0) game.currentEvent = null;
}
function updateMeteors() {
  for (let i = game.meteors.length - 1; i >= 0; i--) {
    const m = game.meteors[i]; m.y += m.vy;
    if (m.y > H) { game.meteors.splice(i, 1); continue; }
    // 弾を消す
    for (let j = game.invaderBullets.length - 1; j >= 0; j--) {
      if (rectsOverlap(m, game.invaderBullets[j])) { game.invaderBullets.splice(j, 1); }
    }
    if (rectsOverlap(m, game.player) && !(game.powerupActive === 'invincible' || game.player.invincibleTimer > 0)) {
      game.meteors.splice(i, 1); if (game.playerShield) { absorbWithShield(); return; }
      playSound('meteor_hit'); onPlayerHit(); return;
    }
  }
}

// ===== 小惑星更新 =====
function updateAsteroids() {
  if (!game.isAsteroidStage) return;
  for (let i = game.asteroids.length - 1; i >= 0; i--) {
    const a = game.asteroids[i];
    if (!a.alive) { game.asteroids.splice(i, 1); continue; }
    a.x += a.vx; a.y += a.vy; a.angle += a.rotSpeed;
    if (a.x < 0 || a.x + a.w > W) a.vx *= -1;
    if (a.y < 0 || a.y + a.h > H * 0.75) a.vy *= -1;
    // プレイヤー弾を消す
    for (let j = game.bullets.length - 1; j >= 0; j--) {
      if (rectsOverlap(game.bullets[j], a)) {
        game.bullets.splice(j, 1);
        a.hp--;
        spawnExplosion(a.x + a.w / 2, a.y + a.h / 2, '#888', 4);
        playSound('asteroid_hit');
        if (a.hp <= 0) {
          spawnExplosion(a.x + a.w / 2, a.y + a.h / 2, '#aaa', 12);
          a.alive = false;
          addExp(15); game.score += 30; updateHUD();
        }
        break;
      }
    }
    // プレイヤーに当たる
    if (rectsOverlap(a, game.player) && !(game.powerupActive === 'invincible' || game.player.invincibleTimer > 0)) {
      if (game.playerShield) { absorbWithShield(); } else { onPlayerHit(); }
      return;
    }
  }
}

// ===== 爆発弾 =====
function explodeBomb(cx, cy) {
  const R = 70;
  spawnExplosion(cx, cy, '#f0f', 20); triggerFlash(255, 0, 255, 0.15);
  for (const inv of game.invaders) {
    if (!inv.alive) continue;
    const dx = (inv.x + inv.w / 2) - cx, dy = (inv.y + inv.h / 2) - cy;
    if (Math.sqrt(dx * dx + dy * dy) < R) {
      inv.alive = false;
      addCombo(inv.x + inv.w / 2, inv.y, (3 - inv.row) * 10);
      spawnExplosion(inv.x + inv.w / 2, inv.y + inv.h / 2, '#f0f'); addExp(10); playSound('explosion');
    }
  }
  if (game.boss && game.boss.entryDone && !game.boss.shielded) {
    const dx = (game.boss.x + game.boss.w / 2) - cx, dy = (game.boss.y + game.boss.h / 2) - cy;
    if (Math.sqrt(dx * dx + dy * dy) < R + game.boss.w / 2) {
      const { val: ud, isCrit: uc2 } = calcPlayerDmg(game.playerUpgrades.damage * 2); game.boss.hp -= ud; spawnDmgNum(game.boss.x + game.boss.w / 2, game.boss.y, ud, uc2); playSound('boss_hit');
      if (game.boss.hp <= 0) { killBoss(); return; }
    }
  }
}

// ===== プレイヤー被弾 =====
function checkPlayerHit() {
  if (game.powerupActive === 'invincible' || game.player.invincibleTimer > 0) return;
  for (let i = game.invaderBullets.length - 1; i >= 0; i--) {
    if (rectsOverlap(game.invaderBullets[i], game.player)) {
      const _rb = game.invaderBullets[i];
      game.invaderBullets.splice(i, 1);
      if (isMilestoneComplete('t3_reflect')) {
        const _rv = Math.abs(_rb.vy || 4) * 1.3;
        game.bullets.push({
          x: _rb.x, y: _rb.y, w: _rb.w || 6, h: _rb.h || 6,
          vx: -(_rb.vx || 0), vy: -_rv, bspd: _rv, reflected: true
        });
      }
      if (game.playerShield || (game.chaosBuff?.type === 'shield' && (game.chaosBuff.timer || 0) > 0)) { absorbWithShield(); return; }
      onPlayerHit(); return;
    }
  }
  for (const inv of game.invaders.filter(i => i.alive)) {
    if (rectsOverlap(inv, game.player)) {
      inv.alive = false;
      if (game.playerShield || (game.chaosBuff?.type === 'shield' && (game.chaosBuff.timer || 0) > 0)) { absorbWithShield(); return; }
      onPlayerHit(); return;
    }
  }
}

function fireCounterShot() {
  if (!game.player) return;
  const cx = game.player.x + game.player.w / 2, cy = game.player.y + game.player.h / 2;
  for (let a = -30; a <= 30; a += 30) {
    const rad = (-Math.PI / 2) + (a * Math.PI / 180);
    game.bullets.push({ x: cx - 3, y: cy, w: 6, h: 12, vx: Math.cos(rad) * (BULLET_SPEED + 2), vy: Math.sin(rad) * (BULLET_SPEED + 2), bspd: BULLET_SPEED + 2, petBullet: true });
  }
  playSound('shoot');
}

function absorbWithShield() {
  game.playerShield = false; triggerFlash(50, 150, 255, 0.4); triggerShake(6, 8);
  game.lifeGainDisplay = { text: 'SHIELD BREAK', timer: 90, color: '#4af' };
  spawnExplosion(game.player.x + game.player.w / 2, game.player.y + game.player.h / 2, '#4af', 16);
  game.player.invincibleTimer = 60; playSound('powerup');
  if (game.gachaInventory['passive_shield_burst']?.level >= 1) {
    const cx = game.player.x + game.player.w / 2, cy = game.player.y + game.player.h / 2;
    for (let a = 0; a < 360; a += 45) {
      const rad = a * Math.PI / 180;
      game.bullets.push({ x: cx - 3, y: cy, w: 8, h: 8, vx: Math.cos(rad) * 6, vy: Math.sin(rad) * 6, bspd: 6, explosive: true, petBullet: true });
    }
    game.lifeGainDisplay = { text: 'SHIELD BURST!', timer: 90, color: '#ffdd00' };
    playSound('shoot_expl');
  }
}

function onPlayerHit() {
  game.stageStats.hits++;
  addUltimateGauge(12);
  const turtleMod = getPetEffect('turtle') ? 0.85 : 1;
  const _arm1Red = (game.shopUpgrades?.arm1 || 0) * 2;
  const dmg = Math.max(1, Math.floor(25 * (1 - game.playerStats.def / 100) * turtleMod) - _arm1Red);
  game.playerStats.hp = Math.max(0, game.playerStats.hp - dmg);
  // arm3: スパイクアーマー（被弾時に近接敵へ反射ダメージ）
  if ((game.shopUpgrades?.arm3 || 0) >= 1) {
    const _spikeDmg = Math.max(1, Math.floor(dmg * (game.shopUpgrades.arm3 * 0.30)));
    const _pcx = game.player.x + game.player.w / 2, _pcy = game.player.y + game.player.h / 2;
    for (const inv of game.invaders) {
      if (!inv.alive) continue;
      const _dx = inv.x + inv.w / 2 - _pcx, _dy = inv.y + inv.h / 2 - _pcy;
      if (Math.sqrt(_dx * _dx + _dy * _dy) < 100) {
        inv.hp = Math.max(0, (inv.hp || 1) - _spikeDmg);
        if (inv.hp <= 0) inv.alive = false;
        spawnExplosion(inv.x + inv.w / 2, inv.y + inv.h / 2, '#ffaa44', 5);
      }
    }
  }
  // ペット: slime heal
  if (getPetEffect('heal') && game.playerStats.hp > 0) game.playerStats.hp = Math.min(game.playerStats.maxHp, game.playerStats.hp + 15);
  updateHUD();
  spawnExplosion(game.player.x + game.player.w / 2, game.player.y + game.player.h / 2, '#0f0', 20);
  triggerShake(12, 15); triggerFlash(255, 0, 0, 0.4); game.hitFlashTimer = 40;
  playSound('player_hit'); vibrate([80, 30, 30]);
  if (game.playerStats.hp <= 0) {
    // valkyrie (LR): 一度だけHP60で復活
    if (getPetEffect('valkyrie') && !game.player._valkyrieUsed) {
      game.player._valkyrieUsed = true;
      game.playerStats.hp = 60; updateHUD();
      game.player.invincibleTimer = 180;
      triggerFlash(255, 34, 102, 0.6);
      game.lifeGainDisplay = { text: '★ VALKYRIE 復活!! HP60 ★', timer: 120, color: '#ff2266' };
      return;
    }
    triggerGameOver(); return;
  }
  // phoenix: 30%以下で無敵
  if (getPetEffect('phoenix') && game.playerStats.hp <= game.playerStats.maxHp * 0.3) {
    game.player.invincibleTimer = Math.max(game.player.invincibleTimer, 120);
    game.lifeGainDisplay = { text: 'PHOENIX  無敵発動！', timer: 90, color: '#f80' };
  } else {
    game.lifeGainDisplay = { text: `HP  -${dmg}  (${game.playerStats.hp}/${game.playerStats.maxHp})`, timer: 90, color: '#f44' };
  }
  game.player.invincibleTimer = Math.max(game.player.invincibleTimer, 120 + game.playerUpgrades.invincibleBonus);
  if (game.gachaInventory['passive_counter']?.level >= 1) fireCounterShot();
}

function rectsOverlap(a, b) { return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; }

function tryContinueFromGameOver() {
  if (game.state !== 'gameover') return false;
  if ((game.gems || 0) < CONTINUE_GEM_COST) return false;
  game.gems -= CONTINUE_GEM_COST; saveGems(); updateHUD();
  game.continueNoStarsThisRun = true;
  game.playerStats.hp = game.playerStats.maxHp; updateHUD();
  showMessage(null); startBGM();
  initStars(); initStage();
  game.state = 'playing';
  game.lifeGainDisplay = { text: `💎${CONTINUE_GEM_COST} コンティニュー（このクリアは★更新なし）`, timer: 140, color: '#cc88ff' };
  return true;
}

function triggerGameOver() {
  const wasRecord = game.score > 0 && game.score >= (game.hiScores[0] || 0);
  if (game.score > 0) saveScore(game.score);
  if (game.bossRushModeActive) pushWeeklyLocalScore('boss_rush', game.score);
  else if (game.endlessModeActive) pushWeeklyLocalScore('endless', game.score);
  const nr = wasRecord ? '\n★ NEW RECORD! ★' : '';
  game.playerStats.hp = 0; updateHUD();
  game.state = 'gameover'; stopBGM();
  triggerFlash(255, 0, 0, 0.6); playSound('gameover'); vibrate([200, 100, 200]);
  const _bRetry = game.selectedBossAbility ? '\nB: 同ボス再挑戦' : '';
  const _gemOk = (game.gems || 0) >= CONTINUE_GEM_COST;
  const _cLine = _gemOk ? `\nC / タップ: 💎${CONTINUE_GEM_COST} コンティニュー（★更新なし・同ステージ先頭）` : `\nC: 💎${CONTINUE_GEM_COST} コンティニュー（ジェム不足）`;
  showMessage(`ゲームオーバー\nスコア: ${game.score}${nr}\nSPACE: タイトルへ  /  R: 即リトライ${_bRetry}${_cLine}`);
}

// ===== メイン更新（update-tick + game-store）=====
Object.assign(actions, {
  playSound,
  vibrate,
  saveGems,
  fireBullet,
  explodeBomb,
  rectsOverlap,
  trySpawnUFO,
  updateMeteors,
  updateAsteroids,
  updateEnvGimmicks,
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
  shouldSpawnBossAfterWavesClear,
  updateHUD,
  triggerFlash,
  addExp,
  addCoins,
  checkAndClaimMissions,
  ensureNormalQuestProfile,
  persistDailyMissionState,
  buildDailyMissionSnapshot: () => buildDailyMissionSnapshot(game),
  countDailyDoneUnclaimed: () => countDailyDoneUnclaimed(game),
  evaluateMilestoneAchievements: () => evaluateMilestoneAchievements(game),
  claimMilestoneAchievementToInbox,
  claimDailyMissionSlot,
  spawnPowerup,
  spawnDmgNum,
  calcPlayerDmg,
  dropMaterial,
  addCombo,
  setTitleBgQuality,
  isMilestoneComplete
});

// ===== 描画モジュールの依存関係設定 =====
// Initialize draw dependencies for all drawing modules
const drawDeps = {
  get ctx() { return ctx; },
  get W() { return W; },
  get H() { return H; },
  get state() { return game.state; },
  get shakeTimer() { return game.shakeTimer; },
  get shakeIntensity() { return game.shakeIntensity; },
  get boss() { return game.boss; },
  get ufo() { return game.ufo; },
  get stageClearAnimTimer() { return game.stageClearAnimTimer; },
  get paused() { return game.paused; },
  currentWeapon,
  DASH_COOLDOWN,
  ULTIMATE_MAX,
  getTheme,
  UI_BUTTONS,
  drawBattleBackground: () => drawBattleBackground(),
  drawStarfield,
  drawTitle,
  drawTitleWarp,
  drawTitleTermBezel,
  drawVignette,
  get BOSS_SELECT_DATA() { return BOSS_SELECT_DATA; },
  get IAP_PACKAGES() { return IAP_PACKAGES; },
  get NOTICES() { return NOTICES; },
  get STARDUST_SHOP_ITEMS() { return STARDUST_SHOP_ITEMS; },
  applyLevelToAtkMult,
  applyLevelToStatAdd,
  buildEquipPool,
  canPetUpgrade,
  computeStageStarMedal,
  drawBossCardSprite,
  ensureDailyMissions,
  ensureNormalQuestProfile,
  formatStageId,
  getEquipMainEffectText,
  getLevelUpCost,
  getPetParams,
  getPetUpgradeCost,
  getPlanet,
  getUpgradeLvCost,
  getWorldInfo,
  missionEffectiveProgress,
  pickCharShipShape,
  readWeeklyLocalBoard,
  stageSelectFuelLaunchOk,
  syncFuel,
  truncateLine,
  upgradeBonusNowNext,
  wrapFillJp,
  playSound,
  drawAsteroids,
  drawMeteors,
  drawEnvGimmicks,
  drawDashTrail,
  drawInvaders,
  drawHealers,
  drawBoss,
  drawMiniBosses,
  drawBossMinions,
  drawUFO,
  drawPowerups,
  drawPlayer,
  drawPets,
  drawBullets,
  drawMuzzleFlashes,
  drawParticles,
  updateDamageNumbers,
  drawDamageNumbers,
  drawGroundLine,
  drawHUD,
  drawBossWarning,
  drawSurvivalTimer,
  drawStageBanner,
  drawWaveBanner,
  drawLifeGainDisplay,
  drawLevelUpDisplay,
  drawEventBanner,
  drawMatPopups,
  drawStageClearAnim,
  drawHitFlash,
  drawScanlines,
  drawGachaRatesModalIfOpen,
  drawGachaResult,
  drawGachaSummary,
  drawGachaRates,
  drawStardustShop,
  drawStageResult,
  bumpGachaAnimFrame: () => { game.gachaAnimFrame++; },
  drawInvaderSprite,
  // Use functions from new modules
  drawPauseOverlay: () => drawPauseOverlay(),
  drawGameOverOverlay: () => drawGameOverOverlay(),
  drawCriticalVignette: () => drawCriticalVignette(),
  drawJoystick: () => drawJoystick(),
  drawScreenFlash: () => drawScreenFlash(),
  drawUIButtons: () => drawUIButtons(),
  drawCustomizeScreen: () => drawCustomizeScreen(),
  drawLoadoutScreen: () => drawLoadoutScreen(),
  drawStageSelectScreen: () => drawStageSelectScreen(),
  drawMapScreen: () => drawMapScreen(),
  drawShopScreen: () => drawShopScreen(),
  drawGachaScreen: () => drawGachaScreen(),
  drawMissionsScreen: () => drawMissionsScreen(),
  drawModeSelectScreen: () => drawModeSelectScreen(),
  drawBossSelectScreen: () => drawBossSelectScreen(),
  drawNotificationsScreen: () => drawNotificationsScreen(),
  drawSettingsScreen: () => drawSettingsScreen(),
  drawInboxScreen: () => drawInboxScreen(),
  drawEventsScreen: () => drawEventsScreen(),
  drawIAPScreen: () => drawIAPScreen(),
  drawSynthesisScreen: () => drawSynthesisScreen(),
  drawFusionScreen: () => drawFusionScreen(),
};

const screenDrawDeps = {
  get ctx() { return ctx; },
  get BOSS_SELECT_DATA() { return BOSS_SELECT_DATA; },
  get IAP_PACKAGES() { return IAP_PACKAGES; },
  get NOTICES() { return NOTICES; },
  get STARDUST_SHOP_ITEMS() { return STARDUST_SHOP_ITEMS; },
  get ENEMY_PREVIEW_COLORS() { return ENEMY_PREVIEW_COLORS; },
  get ENEMY_PREVIEW_LABELS() { return ENEMY_PREVIEW_LABELS; },
  get FUEL_CAP() { return FUEL_CAP; },
  get FUEL_COST_PER_RUN() { return FUEL_COST_PER_RUN; },
  get SHIP_COLORS() { return SHIP_COLORS; },
  applyLevelToAtkMult,
  applyLevelToStatAdd,
  buildEquipPool,
  canPetUpgrade,
  circleBoundaryPoint,
  computeStageStarMedal,
  drawBossCardSprite,
  drawEnemyPreviewIcon,
  drawHexagon,
  drawStar,
  drawStarfield,
  drawWorldBgObjects,
  ensureDailyMissions,
  ensureNormalQuestProfile,
  formatStageId,
  getEquipMainEffectText,
  getImage,
  getLevelUpCost,
  getPetParams,
  getPetUpgradeCost,
  getPlanet,
  getStageEnemyTypes,
  getStageStarsForMap,
  getStageMedalCount,
  getUpgradeLvCost,
  getWorldInfo,
  hexBoundaryPoint,
  missionEffectiveProgress,
  pickCharShipShape,
  readWeeklyLocalBoard,
  stageSelectFuelLaunchOk,
  syncFuel,
  truncateLine,
  upgradeBonusNowNext,
  wrapFillJp,
  playSound,
};

const entityDrawDeps = {
  get ctx() { return ctx; },
  drawInvaderSprite,
};

const uiDrawDeps = {
  get ctx() { return ctx; },
  currentWeapon,
  DASH_COOLDOWN,
  ULTIMATE_MAX,
  getPlanet,
  getWaveCount,
  getTheme,
  UI_BUTTONS,
};

// ===== 描画（ルーティングは js/game/draw-dispatch.js）=====
function draw() { paintFrame(drawDeps); }
// All draw functions are now modularized and imported








function pickCharShipShape(item) {
  if (!item || item.type !== 'char') return SHIP_SHAPES[game.shipShapeIdx].id;
  const id = item.id || '';
  if (id === 'char_dragon_lord') return 'heavy';
  if (id === 'char_reaper') return 'agile';
  if (id === 'char_nova') return 'heavy';
  if (id === 'char_phantom') return 'agile';
  if (id === 'char_iron') return 'heavy';
  if (id === 'char_flame') return 'agile';
  if (id === 'char_swift') return 'agile';
  if (id === 'char_guard') return 'heavy';
  if (id === 'char_basic') return 'fighter';
  const spd = item.spd || 0, def = item.def || 0, atk = item.atk || 1;
  const hp = item.hp || 0;
  if (spd >= 3) return 'agile';
  if (def >= 20 || hp >= 160) return 'heavy';
  if (atk >= 1.35) return 'heavy';
  return 'fighter';
}





function drawInvaderSprite(ctx, x, y, frame, row, overrideColor) {
  const type = row <= 0 ? 0 : row <= 1 ? 1 : 2;
  const planetCols = getPlanetEnemyColors(game.stage);
  ctx.fillStyle = overrideColor || planetCols[type] || ['#f55', '#ff0', '#0ff'][type];
  if (type === 0) {
    ctx.fillRect(x + 10, y, 16, 6); ctx.fillRect(x + 4, y + 6, 28, 6); ctx.fillRect(x, y + 12, 36, 8);
    if (frame === 0) { ctx.fillRect(x + 4, y + 20, 8, 6); ctx.fillRect(x + 24, y + 20, 8, 6); }
    else { ctx.fillRect(x, y + 20, 8, 6); ctx.fillRect(x + 28, y + 20, 8, 6); }
  } else if (type === 1) {
    ctx.fillRect(x + 8, y, 20, 6); ctx.fillRect(x + 4, y + 6, 28, 6); ctx.fillRect(x, y + 12, 36, 6);
    ctx.fillRect(x + 4, y + 18, 10, 6); ctx.fillRect(x + 22, y + 18, 10, 6);
    if (frame === 0) { ctx.fillRect(x + 2, y + 20, 6, 6); ctx.fillRect(x + 28, y + 20, 6, 6); }
    else { ctx.fillRect(x + 6, y + 22, 6, 4); ctx.fillRect(x + 24, y + 22, 6, 4); }
  } else {
    ctx.fillRect(x + 6, y, 24, 6); ctx.fillRect(x + 2, y + 6, 32, 6); ctx.fillRect(x, y + 12, 36, 8);
    if (frame === 0) { ctx.fillRect(x + 2, y + 20, 8, 6); ctx.fillRect(x + 14, y + 20, 8, 6); ctx.fillRect(x + 26, y + 20, 8, 6); }
    else { ctx.fillRect(x + 4, y + 20, 8, 6); ctx.fillRect(x + 18, y + 20, 8, 6); ctx.fillRect(x + 28, y + 22, 8, 4); }
  }
}





















// ===== カスタマイズ画面 =====

// ===== ミッション一覧画面 =====

// ===== ロードアウト画面 =====

// ===== ボス選択画面 =====
// ===== モード選択画面 =====

// ===== マップ画面 =====

// ===== サバイバルタイマー描画（HUD内で呼ぶ） =====

// STARDUST_SHOP_ITEMS, applyStardustShop → js/game/stardust-shop.js
function applyStardustShop(idx) { _applyStardustShop(idx, { playSound }); }

// ===== ステージリザルト画面 =====

// ===== ショップ画面 =====
const SHOP_ITEM_COLORS = ['#00ffcc', '#ff4455', '#00ff88', '#44aaff', '#ffdd00', '#ff8833'];
const SHOP_ITEM_ICONS = ['▲', '★', '◆', '→', '◎', '⚡'];
/** 強化ツリー: CORE → 4カテゴリ → SHOP_ITEMS（規則配置・対称） */
const SHOP_TREE_CAT_DEFS = [
  { id: 'atk', label: '攻撃', angle: -Math.PI / 2, accent: '#d88870', items: ['firerate', 'critrate'] },
  { id: 'def', label: '防御', angle: 0, accent: '#6cc898', items: ['maxhp', 'dashcd'] },
  { id: 'spd', label: '速度', angle: Math.PI / 2, accent: '#6eb8f0', items: ['speed'] },
  { id: 'en', label: 'エネルギー', angle: Math.PI, accent: '#d4b868', items: ['bulletspd'] },
];
// ショップ強化: 役割カラー（高級感SFの統一ルール）
function getShopRoleColor(id) {
  // 攻撃＝赤 / 防御＝緑 / 速度/汎用＝青 / 特殊＝黄
  if (id === 'firerate' || id === 'critrate') return '#ff4d5e'; // atk
  if (id === 'maxhp' || id === 'dashcd') return '#39e58f';      // def
  if (id === 'speed') return '#44aaff';                     // spd
  if (id === 'bulletspd') return '#ffdd55';                 // special
  return '#88a';
}

// ===== ウェーブバナー =====

// ===== 通知画面（受け取り / イベント / お知らせ） =====

// ===== 設定画面 =====

// ===== 受け取りボックス画面 =====

// ===== イベント / お知らせ画面 =====

// ===== 課金画面 =====

updateHUD();
installGlobalErrorHandlers();

setScreenDrawDeps(screenDrawDeps);
setEntityDrawDeps(entityDrawDeps);
setUIDrawDeps(uiDrawDeps);
setSynthScreenDrawDeps({ get ctx() { return ctx; } });
setFusionScreenDrawDeps({ get ctx() { return ctx; }, getEquipMainEffectText });
setEnvGimmicksDrawDeps({ get ctx() { return ctx; } });
setWorldBgDrawDeps({ get ctx() { return ctx; } });
setBossCardDrawDeps({ get ctx() { return ctx; } });

const handleKey = createHandleKey({
  applyLoadoutSelection,
  applyShopUpgrade,
  applyStardustShop,
  BOSS_SELECT_DATA,
  buildLoadoutPool,
  beginTitleFromTap,
  chooseRoute,
  fireChargedShot,
  genMapRoutes,
  handleGachaResultPrimaryAction,
  initAudio,
  initStage,
  initStars,
  nextStage,
  saveLoadout,
  showMessage,
  startBGM,
  startGame,
  tryCompose,
  tryContinueFromGameOver,
  tryDash,
  tryUltimate,
  updateHUD,
  updateShopPanel,
});
bindDocumentKeys({
  onKeyDown(code) { handleKey(code); },
  onKeyUp(code) {
    if ((code === 'KeyZ' || code === 'Space') && game.state === 'playing') {
      if (game.chargeTimer >= CHARGE_MAX) { fireChargedShot(); }
      game.chargeTimer = 0; game.chargeReady = false;
    }
  },
});

setStageSelectOverlayHelpers({ getStageStarsForMap, getStageMedalCount, playSound, startGame });
setGalaxyMapOverlayHelpers({ playSound });
mountStageSelectOverlay(canvas);
mountGalaxyMapOverlay(canvas);

registerPointerInput(canvas, {
  UI_BUTTONS,
  triggerFlash,
  tryContinueFromGameOver,
  showMessage,
  startBGM,
  initStars,
  updateHUD,
  initStage,
  genMapRoutes,
  chooseRoute,
  handleGachaMainClick,
  handleGachaResultClick,
  handleGachaSummaryClick,
  handleGachaRatesClick,
  handleStardustShopClick,
  saveSettings,
  saveVolume,
  saveDisplayName,
  claimAllInbox,
  claimInboxItem,
  playSound,
  buildEquipPool,
  getLevelUpCost,
  tryLevelUpItem,
  canPetUpgrade,
  tryPetLevelUp,
  BOSS_SELECT_DATA,
  startGame,
  updateShopPanel,
  applyShopUpgrade,
  tryCompose,
  tryCustomSynth,
  tryEquipFusion,
  SYNTH_RECIPES,
  doWeaponFusion,
  applyLoadoutPreset,
  saveLoadoutPreset,
  claimActiveMission,
  claimDailyMissionSlot,
  claimMilestoneAchievementToInbox,
  beginTitleFromTap,
});

initStars();
ensureAllCharsUpgradable();
if (isDevUnlockAllEquips()) ensureAllEquipsOwnedForTest();
loadSettings();
loadInbox();
game.ageVerified = localStorage.getItem('invader_age_verified') === '1';
game.state = 'title';
checkLoginBonus(playSound);
startGameLoop({ runUpdate, draw, updateHUD, game, getCtx: () => ctx, getW: () => W, getH: () => H });

if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
  navigator.serviceWorker.register(new URL('./sw.js', import.meta.url)).catch(() => {});
}
