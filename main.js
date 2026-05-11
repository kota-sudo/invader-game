import {
  getPlanet,
  getWorldInfo,
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
import {
  getStageSelectShipTarget,
  getStageSelectShipFollowStage,
  getStageSelectIdealScroll,
} from './js/game/stage-select-map-geometry.js';
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
import { recordProfileExpForStageClear } from './js/game/profile-progress.js';
import { getGameDomElements } from './js/ui/dom-elements.js';
import { createMessageController } from './js/ui/message.js';
import { SAVE_IMPORT_SESSION_KEY } from './js/game/save-backup.js';
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
import { formatStageForHud, buildGameOverAccessibilityMessage } from './js/game/gameover-copy.js';
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
import { DRAGON_LORD_ALL_SPRITE_SRCS } from './js/draw/dragon-lord-portrait.js';
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
import { loadIapFlags } from './js/game/iap-purchase.js';
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
  drawCoinPickups,
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
  drawMeteorRainEnvOverlay,
  drawCombatPlayerVignette,
  drawMatPopups,
  drawStageClearAnim,
  drawBossWarning,
  drawStageBanner,
  drawHitFlash,
  drawScanlines,
  drawSurvivalTimer,
  drawWaveBanner,
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
import { getStardustShopItems, applyStardustShop as _applyStardustShop } from './js/game/stardust-shop.js';
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
import { saveMaterials, saveEquipStars, addMaterial, saveShop } from './js/game/materials.js';
import { addCombo } from './js/game/combo.js';
import { initStars, genMapRoutes, chooseRoute } from './js/game/star-map.js';
import { initAsteroids, spawnBoss, spawnDmgNum, spawnExplosion, trySpawnUFO, spawnPowerup } from './js/game/spawn-helpers.js';
import { getWaveCount, getWaveSize, shouldSpawnBossAfterWavesClear, startWave } from './js/game/wave-system.js';
import { isUpgradeMaxed, pickUpgradeChoices, applyUpgrade, applyLevelUpBonusRow, addExp } from './js/game/exp-level.js';
import { getPetParams, updatePets } from './js/game/pets.js';
import {
  getUpgradeLvCost,
  isMilestoneComplete,
  getShopLv,
  getShopItemById,
  getShopPrereqs,
  isShopPrereqsMet,
  getShopPrereqText,
  canUpgradeShopItem,
  applyShopUpgrade,
  getStatPreviewText,
  getShopCurrentEffectOneLine,
  updateShopPanel,
  tryCompose,
  tryCustomSynth,
  tryEquipFusion,
  saveLoadoutPreset,
  applyLoadoutPreset,
  dropMaterial,
} from './js/game/shop-logic.js';
import { rectsOverlap, checkPlayerHit, fireCounterShot, absorbWithShield, onPlayerHit } from './js/game/player-combat.js';

initMasterVolumeFromStorage();
installCanvasPolyfills();

const { canvas, ctx, stageEl, messageEl, W, H } = getGameDomElements();
const { showMessage } = createMessageController(messageEl);

try {
  const raw = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(SAVE_IMPORT_SESSION_KEY) : null;
  if (raw) {
    sessionStorage.removeItem(SAVE_IMPORT_SESSION_KEY);
    const j = JSON.parse(raw);
    if (j && j.ok) {
      showMessage('セーブを読み込みました（再読み込み済み）');
      setTimeout(() => showMessage(null), 4000);
    }
  }
} catch (_) {
  /* ignore */
}

{
  const src = readTitleBackgroundImageSrc();
  if (src) getImage(src);
  getImage('./assets/stage-select-world1-left.png');
  getImage(MARS_STAGE_MAP_BG);
  for (const url of Object.values(MARS_BATTLE_BACKGROUNDS)) getImage(url);
  getImage('./assets/customize-stage-mars.png');
  getImage('./assets/enemies/mars/normal-1-1.png');
  for (const url of DRAGON_LORD_ALL_SPRITE_SRCS) getImage(url);
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
  return formatStageForHud(stageNum);
}

const hudController = createHudController({ game, stageEl, formatStageId, syncFuel });
function updateHUD() { hudController.updateHUD(); }


function addCoins(amount) {
  const spc3Mult = 1 + (game.shopUpgrades?.spc3 || 0) * 0.10;
  const boost = (game.gachaInventory['passive_coin']?.level >= 1 ? 1.25 : 1) * (getPetEffect('fairy') ? 1.2 : 1) * spc3Mult;
  game.coins += Math.floor(amount * boost);
  saveCoins();
  const el = document.getElementById('coins');
  if (el) el.textContent = game.coins;
}

// ===== EXP / レベル =====
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

// ===== デイリー／アクティブ任務／常設クエスト → js/game/missions-runtime.js =====

// ===== ショップ =====
// ===== 素材システム =====
// scrap=🔩スクラップ core=⚡エネルギーコア crystal=💎量子結晶 composite=🔷コンポジットコア fusionStone=🔮融合石 starCrystal=💫星結晶


// ===== マップ =====

// ===== 星 =====
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

function calcRank() {
  return rankFromTotal(computeStageRankTotal(game.stageStats, game.stageType));
}

function getPetEffect(eff) {
  return game.playerLoadout.pets.some(pid => {
    const p = PET_POOL.find(p => p.id === pid);
    return p && p.effect === eff && game.gachaInventory[pid];
  });
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
  game.chargeTimer = 0; game.chargeReady = false; game.dragonLordFirePoseTimer = 0;
  game.dashTimer = 0; game.dashCooldown = 0; game.dashTrail = [];
  game.stageType = game.bossRushModeActive ? 'boss_rush' : game.endlessModeActive ? 'endless' : 'normal'; game.stageRank = null; game.mapRoutes = [];
  game.continueNoStarsThisRun = false;
  game.stageStats = { hits: 0, maxCombo: 0, kills: 0 };
  game.runStartCoins = game.coins | 0;
  game.runEnemyKills = 0;
  game.runPlayFrames = 0;
  game.bossRushCount = 0; game.bossRushDelay = 0; game.escortShip = null; game.survivalTimer = 0;
  game.ultimateGauge = 0; game.ultimateActive = false; game.ultimateTimer = 0;
  game.bossCutinTimer = 0; game.gravityZones = []; game.emFields = []; game.blackHoles = []; game.meteorRainTimer = 0; game.meteorRainWarning = 0;
  initStars(); updateHUD(); initStage();
  showMessage(null); game.state = 'playing';
}
/** ステージが進んだ直後：スコア・HP は引き継がず新ステージ用に初期化 */
function resetStageCarryoverStats() {
  game.score = 0;
  game.nextLifeScore = 5000;
  if (game.playerStats) game.playerStats.hp = game.playerStats.maxHp;
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
  resetStageCarryoverStats();
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
  game.currentEvent = null; game.eventTimer = 0; game.eventCooldown = 300; game.meteorEventLanes = null;
  game.formationTimer = 500; game.healerSpawnTimer = 0;
  game.chargeTimer = 0; game.chargeReady = false; game.dragonLordFirePoseTimer = 0; game.dashTrail = [];
  game.petTimers = { dragon: 0, hawk: 0, bomber: 0, ghost: 0, fenrir: 0 }; game.petBullets = [];
  triggerFlash(0, 100, 255, 0.3);
  const _dims = getShipDims();
  game.player = { x: W / 2 - _dims.w / 2, y: H - 100, w: _dims.w, h: _dims.h, invincibleTimer: 0, _valkyrieUsed: false };
  game.barriers = [];
  stageEl.textContent = formatStageId(game.stage);
  game.stageStats = { hits: 0, maxCombo: 0, kills: 0 };
  game.stageRewardLedger = { coins: 0, gems: 0 };
  game.bossRushCount = 0; game.bossRushDelay = 0; game.escortShip = null;
  game.survivalTimer = SURVIVAL_DURATION; game.minionSpawnTimer = 0;
  game.bossCutinTimer = 0; game.gravityZones = []; game.emFields = []; game.blackHoles = []; game.meteorRainTimer = 0; game.meteorRainWarning = 0;
  game.waveNum = 0; game.waveState = 'idle'; game.waveKills = 0; game.waveTargetKills = 0; game.waveDelay = 0;   game.waveBannerTimer = 0;
  game.marsWaveAwaitMiniBossClear = false;
  game.matPopups = [];
  game.coinPickups = [];
  game._lastHudScore = game.score | 0;
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

function respawn() {
  game.bullets = []; game.invaderBullets = []; game.particles = [];
  game.dragonLordFirePoseTimer = 0;
  const _d = getShipDims(); game.player.w = _d.w; game.player.h = _d.h;
  game.player.x = W / 2 - game.player.w / 2; game.player.y = H - 100;
  game.player.invincibleTimer = 180 + game.playerUpgrades.invincibleBonus;
  showMessage(null); game.state = 'playing';
}

// ===== 小惑星 =====

// ===== スポーン =====

// Boss render/attackAnim scaffold now lives in js/game/boss-render.js

// ===== コンボ =====

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
  game.muzzleFlashes.push({ x: cx, y: game.player.y - 10, timer: 14, maxTimer: 14, kind: 'charge' });
  game.dragonLordFirePoseTimer = 22;
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
    game.bullets.push({ x: cx - 3.5, y: game.player.y, w: 7, h: 17, laser: true, bspd });
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
    const cands = [...game.invaders.filter(i => i.alive), ...(game.boss ? [game.boss] : []), ...game.miniBosses.filter(m => m.alive), ...game.healers.filter(h => h.alive)];
    for (const t of cands) {
      const dx = (t.x + t.w / 2) - cx, dy = (t.y + t.h / 2) - game.player.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < minDist) { minDist = dist; target = t; }
    }
    game.bullets.push({ x: cx - 3.5, y: game.player.y - 10, w: 7, h: 16, homing: true, target, bspd, vx: 0, vy: -bspd });
    playSound('shoot_homing'); return;
  }
  if (w === 'explosive') {
    game.weaponAmmo.explosive--;
    if (game.weaponAmmo.explosive <= 0 && currentWeapon() === 'explosive') cycleWeapon();
    game.bullets.push({ x: cx - 4.5, y: game.player.y, w: 9, h: 9, explosive: true, bspd });
    playSound('shoot_expl'); return;
  }
  const _piercing = game.playerUpgrades.piercing > 0 ? { piercesLeft: game.playerUpgrades.piercing } : {};
  if (game.playerUpgrades.spread) {
    [[-0.25, 0], [0, -0.1], [0.25, 0]].forEach(([ax, ay]) => {
      game.bullets.push({ x: cx - 2.5, y: game.player.y, w: 5, h: 16, vx: ax * bspd, vy: -(bspd + ay * bspd), bspd, ..._piercing });
    });
  } else {
    game.bullets.push({ x: cx - 2.5, y: game.player.y, w: 5, h: 16, bspd, ..._piercing });
  }
  playSound('shoot');
}

// ===== ボス撃破 =====
function bumpStageRewardLedger(coinsDelta, gemsDelta) {
  if (!game.stageRewardLedger) game.stageRewardLedger = { coins: 0, gems: 0 };
  game.stageRewardLedger.coins += coinsDelta;
  game.stageRewardLedger.gems += gemsDelta;
}

function killBoss() {
  if (game.state === 'playing') game.runEnemyKills = (game.runEnemyKills || 0) + 1;
  const _bossAbility = game.boss?.ability;
  spawnExplosion(game.boss.x + game.boss.w / 2, game.boss.y + game.boss.h / 2, '#ff0', 30);
  triggerShake(10, 20); triggerFlash(255, 150, 0, 0.7);
  game.score += 500 + game.stage * 100; updateHUD(); addExp(150);
  const _bossClearCoins = 80 + game.stage * 8 + Math.floor(Math.random() * 40);
  addCoins(_bossClearCoins);
  bumpStageRewardLedger(_bossClearCoins, 0);
  const _bossClearGems = 3 + Math.floor(game.stage / 5);
  addGems(_bossClearGems);
  bumpStageRewardLedger(0, _bossClearGems);
  // ボス撃破 素材ドロップ
  const bp = getPlanet(game.stage).name;
  if (bp === 'SATURN') addMaterial('crystal', 2);
  else if (bp === 'JUPITER') addMaterial('crystal', 1);
  else addMaterial('core', 2);
  addMaterial('scrap', 3);
  // 難易度 HARD ボーナス
  if (game.bossDifficulty === 2) {
    addMaterial('scrap', 2); addMaterial('core', 1); addCoins(60); addGems(1);
    bumpStageRewardLedger(60, 1);
  }
  // 週替わり FEATURED ボーナス
  const _featIdx = Math.floor(Date.now() / (7 * 24 * 3600 * 1000)) % BOSS_SELECT_DATA.length;
  if (_bossAbility && _bossAbility === BOSS_SELECT_DATA[_featIdx]?.id) {
    addMaterial('scrap', 2); addCoins(60); addGems(2);
    bumpStageRewardLedger(60, 2);
  }
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
    const prMid = recordProfileExpForStageClear(game, game.stage);
    if (prMid.leveled) game.lifeGainDisplay = { text: `プロフィール Lv.${prMid.newLevel}！最大HPが伸びました`, timer: 200, color: '#aef' };
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
  const clearRewardCoins = game.stageRewardLedger?.coins ?? 0;
  const clearRewardGems = game.stageRewardLedger?.gems ?? 0;
  game.stageRewardLedger = { coins: 0, gems: 0 };
  addCoins(rankBonus); if (rankGems > 0) addGems(rankGems);
  const prBossClear = recordProfileExpForStageClear(game, game.stage);
  if (prBossClear.leveled) game.lifeGainDisplay = { text: `プロフィール Lv.${prBossClear.newLevel}！最大HPが伸びました`, timer: 220, color: '#aef' };
  if (game.stageType === 'endless') {
    addCoins(rankBonus); if (rankGems > 0) addGems(rankGems); // double reward
    addExp(60);
    game.boss = null; game.bossPhase = false; game.bossMinions = [];
    game.stage++;
    resetStageCarryoverStats();
    game.waveNum = 0; game.waveState = 'wait'; game.waveDelay = 150;
    game.invaders = []; game.invaderBullets = [];
    game.stageStats = { hits: 0, maxCombo: 0, kills: 0 };
    triggerFlash(0, 200, 255, 0.4);
    updateHUD();
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
    clearRewardCoins,
    clearRewardGems,
    rankBonus,
    rankGems,
    score: game.score,
    starsEarned: _starsEarned,
    starsSkippedMedal: _skipStars,
    profileExpGained: prBossClear.expGained,
    profileLeveled: !!prBossClear.leveled,
    profileNewLevel: prBossClear.newLevel,
  };
  game.stageResultTimer = 0;
  game.bullets = []; game.invaderBullets = []; game.stageClearAnimTimer = 80;
}

function killMiniBoss(mb) {
  if (game.state === 'playing') game.runEnemyKills = (game.runEnemyKills || 0) + 1;
  spawnExplosion(mb.x + mb.w / 2, mb.y + mb.h / 2, '#f80', 16);
  triggerShake(6, 10); game.score += 200 + game.stage * 50; updateHUD(); addExp(60);
  const _mbCoin = 25 + Math.floor(Math.random() * 15);
  addCoins(_mbCoin);
  bumpStageRewardLedger(_mbCoin, 0);
  playSound('boss_die');
  mb.alive = false;
  if (game.miniBosses.every(m => !m.alive)) {
    game.miniBosses = [];
    game.stageRank = calcRank();
    const rankBonus = { S: 50, A: 35, B: 20, C: 10 }[game.stageRank] || 10;
    const clearRewardCoins = game.stageRewardLedger?.coins ?? 0;
    const clearRewardGems = game.stageRewardLedger?.gems ?? 0;
    game.stageRewardLedger = { coins: 0, gems: 0 };
    addCoins(rankBonus); stopBGM();
    const _skipStars2 = !!game.continueNoStarsThisRun;
    const _starsEarned2 = _skipStars2 ? 0 : computeStageStarMedal(game.stageStats.hits, game.stageStats.maxCombo, game.stageType);
    commitStageStarMedalForCurrentClear();
    const prMini = recordProfileExpForStageClear(game, game.stage);
    if (prMini.leveled) game.lifeGainDisplay = { text: `プロフィール Lv.${prMini.newLevel}！最大HPが伸びました`, timer: 220, color: '#aef' };
    game.stageResultData = {
      stage: game.stage,
      stageType: game.stageType,
      rank: game.stageRank,
      kills: game.stageStats.kills,
      hits: game.stageStats.hits,
      maxCombo: game.stageStats.maxCombo,
      clearRewardCoins,
      clearRewardGems,
      rankBonus,
      rankGems: 0,
      score: game.score,
      starsEarned: _starsEarned2,
      starsSkippedMedal: _skipStars2,
      profileExpGained: prMini.expGained,
      profileLeveled: !!prMini.leveled,
      profileNewLevel: prMini.newLevel,
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
      if (game.playerShield) { absorbWithShield(); } else { onPlayerHit(); }
    }
  }
}

// ===== ペット更新 =====
// ===== イベント =====
function tryTriggerEvent() {
  if (game.currentEvent || game.bossPhase) return;
  game.eventCooldown--;
  if (game.eventCooldown > 0) return;
  game.eventCooldown = 600 + Math.floor(Math.random() * 400);
  game.currentEvent = EVENT_LIST[Math.floor(Math.random() * EVENT_LIST.length)];
  game.eventTimer = 300; playSound('event_start');
  game.meteorEventLanes =
    game.currentEvent.id === 'meteor'
      ? Array.from({ length: 14 }, () => 20 + Math.random() * (W - 40))
      : null;
  if (game.currentEvent.id === 'meteor') triggerFlash(255, 35, 25, 0.32);
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
  if (game.currentEvent.id === 'meteor') {
    // 約1.5秒は警告のみ→予測レーン→その後ディップ（見やすさ・回避のため）
    const rainPhase = game.eventTimer <= 210;
    if (rainPhase && Math.random() < 0.112)
      game.meteors.push({
        x: game.meteorEventLanes?.length
          ? game.meteorEventLanes[Math.floor(Math.random() * game.meteorEventLanes.length)] + (Math.random() - 0.5) * 28
          : Math.random() * W,
        y: -28,
        w: 22,
        h: 30,
        vy: 3.2 + Math.random() * 3.4,
        alive: true,
        rot: Math.random() * Math.PI * 2,
      });
  }
  if (game.eventTimer <= 0) {
    game.meteorEventLanes = null;
    game.currentEvent = null;
  }
}
function updateMeteors() {
  for (let i = game.meteors.length - 1; i >= 0; i--) {
    const m = game.meteors[i];
    m.y += m.vy;
    m.rot = (m.rot || 0) + 0.14 + (m.vy || 4) * 0.028;
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

/** ゲームオーバー「はじめから」：ステージ1・スコア／ラン統計リセット・HP全快 */
function gameOverRetryFromStart() {
  game.continueNoStarsThisRun = false;
  game.bossRushModeActive = false;
  game.endlessModeActive = false;
  game.selectedBossAbility = null;
  game.stageType = 'normal';
  game.score = 0;
  game.stage = 1;
  game.startStage = 1;
  game.nextLifeScore = 5000;
  game.runStartCoins = game.coins | 0;
  game.runEnemyKills = 0;
  game.runPlayFrames = 0;
  game.playerStats.hp = game.playerStats.maxHp;
  game.lifeGainDisplay = null;
  game.ultimateGauge = 0;
  game.ultimateActive = false;
  game.ultimateTimer = 0;
  game.powerupActive = null;
  game.powerupTimer = 0;
  showMessage(null);
  startBGM();
  initStars();
  updateHUD();
  initStage();
  game.state = 'playing';
}

/** ゲームオーバーからステージ選択マップへ（ポインタ／キー S 共通） */
function gameOverGoStageSelect() {
  showMessage(null);
  game.continueNoStarsThisRun = false;
  game.bossRushModeActive = false;
  game.endlessModeActive = false;
  game.stageSelectIdx = Math.min(game.stage, game.highestStage) - 1;
  game.stageMapScrollOffset = getStageSelectIdealScroll(game.stageSelectIdx + 1, H, 478);
  const pos = getStageSelectShipTarget(H, getStageSelectShipFollowStage(game.stageSelectIdx + 1, game.highestStage), 478, game.highestStage);
  if (pos) {
    game.stageCharX = pos.x;
    game.stageCharY = pos.y;
    game.stageCharTX = pos.x;
    game.stageCharTY = pos.y;
  }
  game.state = 'stage_select';
}

function triggerGameOver() {
  const wasRecord = game.score > 0 && game.score >= (game.hiScores[0] || 0);
  game.gameOverWasRecord = wasRecord;
  if (game.score > 0) saveScore(game.score);
  if (game.bossRushModeActive) pushWeeklyLocalScore('boss_rush', game.score);
  else if (game.endlessModeActive) pushWeeklyLocalScore('endless', game.score);
  game.playerStats.hp = 0; updateHUD();
  game.state = 'gameover'; stopBGM();
  triggerFlash(255, 0, 0, 0.6); playSound('gameover'); vibrate([200, 100, 200]);
  showMessage(buildGameOverAccessibilityMessage(game, { wasRecord }), { a11yOnly: true });
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
  isMilestoneComplete,
  getPetEffect,
  addUltimateGauge,
  unlockAchievement,
  genMapRoutes,
  nextStage,
  triggerShake,
  triggerGameOver,
  saveScore,
  calcRank,
  commitStageStarMedalForCurrentClear,
  absorbWithShield,
  onPlayerHit,
  showMessage: (...args) => showMessage(...args),
});

// ===== 描画モジュールの依存関係設定 =====
// Initialize draw dependencies for all drawing modules
const drawDeps = {
  get ctx() { return ctx; },
  get W() { return W; },
  get H() { return H; },
  /** paintFrame 内で game-store を import しないための参照（循環・TDZ 回避） */
  get game() { return game; },
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
  get STARDUST_SHOP_ITEMS() { return getStardustShopItems(); },
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
  drawCoinPickups,
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
  drawMeteorRainEnvOverlay,
  drawCombatPlayerVignette,
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
  get STARDUST_SHOP_ITEMS() { return getStardustShopItems(); },
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
  gameOverRetryFromStart,
  gameOverGoStageSelect,
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
  onKeyDown(code, ev) { handleKey(code, ev); },
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
  gameOverRetryFromStart,
  gameOverGoStageSelect,
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
loadIapFlags();
game.state = 'title';
checkLoginBonus(playSound);
startGameLoop({ runUpdate, draw, updateHUD, game, getCtx: () => ctx, getW: () => W, getH: () => H });

if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
  navigator.serviceWorker.register(new URL('./sw.js', import.meta.url)).catch(() => {});
}
