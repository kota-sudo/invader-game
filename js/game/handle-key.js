/**
 * Keyboard routing by game.state (depends on main flow + gacha/shop helpers).
 */
import { SHOP_ITEMS, WEAPON_GACHA_POOL } from '../game-data.js';
import { CHARGE_MAX, CANVAS_H as H } from './constants.js';
import { clearShopHexSel } from './draw-shop-hex.js';
import {
  canPetUpgrade,
  doDailyGacha,
  doGachaPull,
  doPremiumPull,
  doWeaponFusion,
  tryLevelUpItem,
  tryPetLevelUp,
} from './gacha.js';
import { game } from './game-store.js';
import {
  getStageSelectIdealScroll,
  getStageSelectShipFollowStage,
  getStageSelectShipTarget,
} from './stage-select-map-geometry.js';
import { cycleWeapon } from './weapon.js';

const ZUKAN_GRID_COLS = 4;

export function createHandleKey(deps) {
  const {
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
  } = deps;

  return function handleKey(code) {
  // ポーズ
  if (code === 'Escape') {
    if (game.state === 'playing') { game.paused = !game.paused; return; }
    if (game.state === 'paused') { game.paused = false; game.state = 'playing'; return; }
    if (game.state === 'galaxy_map') {
      if (game.galaxyMapModal) {
        game.galaxyMapModal = null;
        return;
      }
      game.state = 'title';
      return;
    }
    if (game.state === 'stage_select') { game.state = 'customize'; return; }
    if (game.state === 'map') { game.state = 'customize'; return; }
    if (game.state === 'loadout') {
      game.petLevelUpOverlay = null;
      if (game.returnToGalaxyAfterOverlay) {
        game.returnToGalaxyAfterOverlay = false;
        game.state = 'galaxy_map';
      } else game.state = 'customize';
      return;
    }
    if (game.state === 'shop') {
      if (game.returnToGalaxyAfterOverlay) {
        game.returnToGalaxyAfterOverlay = false;
        game.state = 'galaxy_map';
      } else game.state = 'customize';
      return;
    }
    if (game.state === 'gacha_result') { game.state = 'gacha'; return; }
    if (game.state === 'gacha' && game.gachaInsufficientModal && game.gachaInsufficientModal.open) { game.gachaInsufficientModal.open = false; return; }
    if (game.state === 'gacha' && game.gachaRatesModal) { game.gachaRatesModal = false; return; }
    if (game.state === 'gacha') {
      if (game.returnToGalaxyAfterOverlay) {
        game.returnToGalaxyAfterOverlay = false;
        game.state = 'galaxy_map';
      } else game.state = 'customize';
      return;
    }
    if (game.state === 'mode_select') { game.state = 'customize'; return; }
    if (game.state === 'boss_select') { game.state = 'customize'; return; }
    if (game.state === 'gacha_rates') { game.state = 'gacha'; return; }
    if (game.state === 'stardust_shop') { game.state = 'gacha'; return; }
    if (game.state === 'settings') {
      let back = 'customize';
      if (game.settingsReturnState === 'title') back = 'title';
      else if (game.settingsReturnState === 'galaxy_map') back = 'galaxy_map';
      game.settingsReturnState = null;
      game.state = back;
      return;
    }
    if (game.state === 'notifications') { game.state = 'customize'; return; }
    if (game.state === 'inbox') { game.state = 'customize'; return; }
    if (game.state === 'events') { game.state = 'customize'; return; }
    if (game.state === 'iap') { game.state = 'customize'; return; }
  }
  if (game.paused && game.state === 'playing' && (code === 'Enter' || code === 'NumpadEnter' || code === 'Space')) {
    game.paused = false;
    return;
  }
  if (game.paused) return;
  // ステージ選択
  if (game.state === 'stage_select') {
    const hs = Math.max(1, Number.isFinite(game.highestStage) ? game.highestStage : 1);
    /** マップタップと同じく NEXT（hs+1）まで選択可能。idx = hs → 選択ステージ hs+1 */
    const maxIdx = Math.max(0, hs);
    if (game.stageSelectIdx < 0) game.stageSelectIdx = 0;
    if (game.stageSelectIdx > maxIdx) game.stageSelectIdx = maxIdx;
    const prevK = game.stageSelectIdx;
    if (code === 'ArrowLeft' || code === 'KeyA') game.stageSelectIdx = Math.max(0, game.stageSelectIdx - 1);
    else if (code === 'ArrowRight' || code === 'KeyD') game.stageSelectIdx = Math.min(maxIdx, game.stageSelectIdx + 1);
    else if (code === 'ArrowUp' || code === 'KeyW') game.stageSelectIdx = Math.max(0, game.stageSelectIdx - 5);
    else if (code === 'ArrowDown' || code === 'KeyS') game.stageSelectIdx = Math.min(maxIdx, game.stageSelectIdx + 5);
    if (prevK !== game.stageSelectIdx) {
      game.startStage = game.stageSelectIdx + 1;
    }
    if (code === 'Space' || code === 'Enter') {
      const selS = game.stageSelectIdx + 1;
      if (selS > hs) return;
      game.startStage = selS;
      // Enter/Space でも出撃ボタンにフォーカスした状態で「出撃準備」へ戻す
      game.customizeCursor = 4;
      game.state = 'customize';
      return;
    }
    game.stageMapScrollOffset = getStageSelectIdealScroll(game.stageSelectIdx + 1, H, 478);
    return;
  }
  if (game.state === 'gacha') {
    if (code === 'KeyQ') game.gachaTab = 0;
    else if (code === 'KeyE') game.gachaTab = 1;
    else if (code === 'KeyT') game.gachaTab = 2;
    else if (code === 'KeyD' && game.gachaTab === 0) doDailyGacha();
    else if (code === 'Digit1' && game.gachaTab < 2) game.gachaTab === 0 ? doGachaPull(1) : doPremiumPull(1);
    else if (code === 'Digit2' && game.gachaTab < 2) game.gachaTab === 0 ? doGachaPull(10) : doPremiumPull(10);
    else if (code === 'ArrowLeft' && game.gachaTab === 2) game.collectionFilter = Math.max(0, game.collectionFilter - 1);
    else if (code === 'ArrowRight' && game.gachaTab === 2) game.collectionFilter = Math.min(3, game.collectionFilter + 1);
    else if (code === 'ArrowUp' && game.gachaTab === 2) game.collectionCursor = Math.max(0, game.collectionCursor - ZUKAN_GRID_COLS);
    else if (code === 'ArrowDown' && game.gachaTab === 2) game.collectionCursor++;
    else if (code === 'KeyR') game.gachaRatesModal = true;
    else if (code === 'KeyS') { game.gachaRatesModal = false; game.stardustShopCursor = 0; game.state = 'stardust_shop'; }
    return;
  }
  if (game.state === 'stardust_shop') {
    if (code === 'Escape') { game.state = 'gacha'; return; }
    if (code === 'ArrowUp' || code === 'KeyW') game.stardustShopCursor = Math.max(0, game.stardustShopCursor - 1);
    else if (code === 'ArrowDown' || code === 'KeyS') game.stardustShopCursor = Math.min(2, game.stardustShopCursor + 1);
    else if (code === 'Space' || code === 'Enter') applyStardustShop(game.stardustShopCursor);
    return;
  }
  if (game.state === 'gacha_result') {
    if (code === 'Digit1') { (game.gachaTab === 1 ? doPremiumPull : doGachaPull)(1); return; }
    if (code === 'Digit2') { (game.gachaTab === 1 ? doPremiumPull : doGachaPull)(10); return; }
    if (code === 'Space' || code === 'Enter') { handleGachaResultPrimaryAction(); return; }
    return;
  }
  if (game.state === 'gacha_summary') {
    if (code === 'Digit1') { game.gachaTab === 0 ? doGachaPull(1) : doPremiumPull(1); return; }
    if (code === 'Digit2') { game.gachaTab === 0 ? doGachaPull(10) : doPremiumPull(10); return; }
    if (code === 'Space' || code === 'Enter' || code === 'Escape') game.state = 'gacha';
    return;
  }
  if (game.state === 'stage_result') {
    if (game.stageResultTimer > 30) {
      if (code === 'KeyR') {
        const st = game.stageResultData?.stage;
        game.stageResultData = null;
        if (typeof st === 'number' && st >= 1) game.startStage = st;
        startGame();
      } else if (code === 'Escape' || code === 'KeyS' || code === 'Digit2') {
        game.stageResultData = null;
        game.stageSelectIdx = Math.min(game.stage, game.highestStage) - 1;
        game.stageMapScrollOffset = getStageSelectIdealScroll(game.stageSelectIdx + 1, H, 478);
        const pos = getStageSelectShipTarget(H, getStageSelectShipFollowStage(game.stageSelectIdx + 1, game.highestStage), 478, game.highestStage);
        if (pos) { game.stageCharX = pos.x; game.stageCharY = pos.y; game.stageCharTX = pos.x; game.stageCharTY = pos.y; }
        game.state = 'stage_select';
      } else {
        game.stageResultData = null;
        genMapRoutes(); chooseRoute(Math.floor(Math.random() * 2));
      }
    }
    return;
  }
  if (game.state === 'gacha_rates') {
    if (code === 'Escape') game.state = 'gacha';
    else if (code === 'ArrowDown' || code === 'KeyS') game.gachaRatesScroll++;
    else if (code === 'ArrowUp' || code === 'KeyW') game.gachaRatesScroll = Math.max(0, game.gachaRatesScroll - 1);
    return;
  }
  if (game.state === 'missions') {
    if (code === 'Escape') {
      game.missionsScrollY = 0;
      if (game.missionsReturnState === 'galaxy_map') {
        game.missionsReturnState = null;
        game.state = 'galaxy_map';
      } else {
        game.missionsReturnState = null;
        game.state = 'customize';
      }
      return;
    }
    const STEP = 60;
    if (game.missionsTab === 'track') {
      if (code === 'ArrowDown' || code === 'KeyS') game.missionsScrollY = (game.missionsScrollY || 0) + STEP;
      else if (code === 'ArrowUp' || code === 'KeyW') game.missionsScrollY = Math.max(0, (game.missionsScrollY || 0) - STEP);
    }
    return;
  }
  if (game.state === 'loadout') {
    if (code === 'Escape') {
      if (game.petUpgradePanel && game.petUpgradePanel.open) { game.petUpgradePanel.open = false; game.petUpgradePanel.changedAt = game.frameCount; return; }
      if (game.petLevelUpOverlay) { game.petLevelUpOverlay = null; return; }
      if (game.loadoutUpgradeOverlay) { game.loadoutUpgradeOverlay = null; return; }
      game.state = 'customize'; return;
    }
    {
      const _pool = buildLoadoutPool();
      // キャラ一覧は3列で密度UP
      const COLS = game.loadoutTab === 0 ? 3 : 4;
      const maxIdx = _pool.length - 1;
      const curIt = _pool[Math.min(game.loadoutCursor, _pool.length - 1)];
      if (code === 'KeyQ' || code === 'BracketLeft') { game.loadoutTab = Math.max(0, game.loadoutTab - 1); game.loadoutCursor = 0; game.petLevelUpOverlay = null; }
      else if (code === 'KeyE' || code === 'BracketRight') { game.loadoutTab = Math.min(3, game.loadoutTab + 1); game.loadoutCursor = 0; game.petLevelUpOverlay = null; }
      // 装備タブ: フィルタ/ソート
      else if (game.loadoutTab === 1 && code === 'Digit0') { game.equipFilterSlot = 'all'; game.loadoutCursor = 0; }
      else if (game.loadoutTab === 1 && code === 'Digit1') { game.equipFilterSlot = 'atk'; game.loadoutCursor = 0; }
      else if (game.loadoutTab === 1 && code === 'Digit2') { game.equipFilterSlot = 'def'; game.loadoutCursor = 0; }
      else if (game.loadoutTab === 1 && code === 'Digit3') { game.equipFilterSlot = 'sp'; game.loadoutCursor = 0; }
      else if (game.loadoutTab === 1 && code === 'KeyR') {
        const order = ['ALL', 'LR', 'SSR', 'SR', 'R', 'N'];
        const ci = order.indexOf(game.equipFilterRarity || 'ALL');
        game.equipFilterRarity = order[(ci + 1 + order.length) % order.length];
        game.loadoutCursor = 0;
      }
      else if (game.loadoutTab === 1 && code === 'KeyF') { game.equipFilterEquippedOnly = !game.equipFilterEquippedOnly; game.loadoutCursor = 0; }
      else if (game.loadoutTab === 1 && code === 'KeyU') { game.equipFilterUnleveledOnly = !game.equipFilterUnleveledOnly; game.loadoutCursor = 0; }
      else if (game.loadoutTab === 1 && code === 'KeyT') { game.equipSortMode = ((game.equipSortMode || 0) + 1) % 3; game.loadoutCursor = 0; }
      // 装備解除のスロット選択（Z/X/C）＋解除（Backspace/Delete）
      else if (game.loadoutTab === 1 && (code === 'KeyZ' || code === 'KeyX' || code === 'KeyC')) {
        const sm = { KeyZ: 0, KeyX: 1, KeyC: 2 };
        const idx = sm[code];
        if (game.playerLoadout) {
          game.playerLoadout._equipSlot = idx;
          saveLoadout();
        }
      }
      else if (game.loadoutTab === 1 && (code === 'Backspace' || code === 'Delete')) {
        const idx = (game.playerLoadout ? game.playerLoadout._equipSlot : 0) || 0;
        if (Array.isArray(game.playerLoadout?.equip)) {
          game.playerLoadout.equip[idx] = null;
          saveLoadout();
        }
      }
      else if (code === 'ArrowLeft' || code === 'KeyA') {
        const prev = game.loadoutCursor;
        game.loadoutCursor = Math.max(0, game.loadoutCursor - 1); game.petLevelUpOverlay = null;
        if (game.loadoutCursor !== prev) { game.loadoutSelAnimFrame = game.frameCount; game.loadoutSelAnimDir = -1; }
      }
      else if (code === 'ArrowRight' || code === 'KeyD') {
        const prev = game.loadoutCursor;
        game.loadoutCursor = Math.min(maxIdx, game.loadoutCursor + 1); game.petLevelUpOverlay = null;
        if (game.loadoutCursor !== prev) { game.loadoutSelAnimFrame = game.frameCount; game.loadoutSelAnimDir = 1; }
      }
      else if (code === 'ArrowUp' || code === 'KeyW') {
        const prev = game.loadoutCursor;
        game.loadoutCursor = Math.max(0, game.loadoutCursor - COLS); game.petLevelUpOverlay = null;
        if (game.loadoutCursor !== prev) { game.loadoutSelAnimFrame = game.frameCount; game.loadoutSelAnimDir = -1; }
      }
      else if (code === 'ArrowDown' || code === 'KeyS') {
        const prev = game.loadoutCursor;
        game.loadoutCursor = Math.min(maxIdx, game.loadoutCursor + COLS); game.petLevelUpOverlay = null;
        if (game.loadoutCursor !== prev) { game.loadoutSelAnimFrame = game.frameCount; game.loadoutSelAnimDir = 1; }
      }
      else if (code === 'Space' || code === 'Enter') {
        // ENTER は常に「装備/決定」に統一（ペットも同様）
        game.petLevelUpOverlay = null;
        if (curIt) applyLoadoutSelection(curIt);
      }
      else if (code === 'KeyL') {
        const it = _pool[Math.min(game.loadoutCursor, _pool.length - 1)];
        if (!it) return;
        // ペット: L で強化エリア展開/実行
        if (game.loadoutTab === 2 && it.id) {
          if (!game.petUpgradePanel) game.petUpgradePanel = { open: false, petId: it.id, changedAt: game.frameCount };
          if (!game.petUpgradePanel.open || game.petUpgradePanel.petId !== it.id) {
            game.petUpgradePanel = { open: true, petId: it.id, changedAt: game.frameCount };
            return;
          }
          if (canPetUpgrade(it.id)) tryPetLevelUp(it.id);
          return;
        }
        tryLevelUpItem(it);
      }
    }
    return;
  }
  if (game.state === 'shop') {
    if (code === 'Escape') {
      if (game.shopSubgraphCatId) { game.shopSubgraphCatId = null; game.shopSubgraphScrollY = 0; game.shopTreeFocusId = null; return; }
      game.state = 'customize'; return;
    }
    if (code === 'KeyQ') {
      const was = game.shopTab;
      game.shopTab = 0;
      game.shopSubgraphCatId = null;
      game.shopSubgraphScrollY = 0;
      if (was !== 0) { game._shopTreeAutoCenter = true; }
    }
    else if (code === 'KeyE') { game.shopSubgraphCatId = null; game.shopSubgraphScrollY = 0; game.shopTab = 1; clearShopHexSel(); updateShopPanel(null); }
    else if (code === 'KeyR') { game.shopSubgraphCatId = null; game.shopSubgraphScrollY = 0; game.shopTab = 2; game.fusionCursor = 0; clearShopHexSel(); updateShopPanel(null); }
    else if (code === 'ArrowUp' || code === 'KeyW') {
      if (game.shopTab === 0) { game.shopTreeFocusId = null; game.shopSubgraphCatId = null; game.shopSubgraphScrollY = 0; game.shopCursor = Math.max(0, game.shopCursor - 1); }
      else if (game.shopTab === 2) game.fusionCursor = Math.max(0, game.fusionCursor - 1);
    }
    else if (code === 'ArrowDown' || code === 'KeyS') {
      if (game.shopTab === 0) { game.shopTreeFocusId = null; game.shopSubgraphCatId = null; game.shopSubgraphScrollY = 0; game.shopCursor = Math.min(SHOP_ITEMS.length - 1, game.shopCursor + 1); }
      else if (game.shopTab === 2) game.fusionCursor++;
    }
    else if (code === 'Space' || code === 'Enter') {
      if (game.shopTab === 0) applyShopUpgrade(game.shopCursor);
      else if (game.shopTab === 1) tryCompose();
      else if (game.shopTab === 2) {
        const fPool = WEAPON_GACHA_POOL.filter(w => {
          const inv = game.gachaInventory[w.id];
          if (!inv) return false;
          if (inv.locked) return false;
          return (inv.mat || 0) >= 1 && (inv.level || 1) < 5;
        });
        const fw = fPool[Math.min(game.fusionCursor, fPool.length - 1)];
        if (fw) doWeaponFusion(fw.id);
      }
    }
    return;
  }
  if (game.state === 'customize') {
    if (code === 'ArrowUp' || code === 'KeyW') game.customizeCursor = Math.max(0, game.customizeCursor - 1);
    else if (code === 'ArrowDown' || code === 'KeyS') game.customizeCursor = Math.min(5, game.customizeCursor + 1);
    else if (code === 'Space' || code === 'Enter') {
      if (game.customizeCursor === 0) {
        game.returnToGalaxyAfterOverlay = false;
        game.loadoutTab = 0;
        game.loadoutCursor = 0;
        game.state = 'loadout';
        return;
      }
      if (game.customizeCursor === 1) {
        game.returnToGalaxyAfterOverlay = false;
        game.state = 'gacha';
        return;
      }
      if (game.customizeCursor === 2) {
        game.returnToGalaxyAfterOverlay = false;
        game.shopCursor = 0;
        game.shopTab = 0;
        game.shopTreeFocusId = null;
        game.shopSubgraphCatId = null;
        game.shopSubgraphScrollY = 0;
        // 開いた瞬間に CORE が中央に来るよう、ツリーをセンタリング
        game.shopTreeScrollX = 0;
        game.shopTreeScrollY = 0;
        game._shopTreeAutoCenter = true;
        game.state = 'shop';
        return;
      }
      if (game.customizeCursor === 3) {
        game.missionsScrollY = 0;
        game.missionsReturnState = null;
        game.state = 'missions';
        return;
      }
      if (game.customizeCursor === 4) {
        game.bossRushModeActive = false;
        game.startStage = Math.max(1, Math.min(game.startStage, game.highestStage));
        startGame();
        return;
      }
      if (game.customizeCursor === 5) { game.bossSelectCursor = 0; game.state = 'boss_select'; return; }
      game.state = 'mode_select';
    }
    else if (code === 'KeyG') { game.state = 'gacha'; return; }
    return;
  }
  if (game.state === 'mode_select') {
    if (code === 'Digit1' || code === 'KeyB') { game.bossRushModeActive = true; game.endlessModeActive = false; startGame(); return; }
    if (code === 'Digit2' || code === 'KeyN') { game.endlessModeActive = true; game.bossRushModeActive = false; startGame(); return; }
    return;
  }
  if (game.state === 'boss_select') {
    const bLen = BOSS_SELECT_DATA.length;
    if (code === 'ArrowRight' || code === 'KeyD') game.bossSelectCursor = Math.min(bLen - 1, game.bossSelectCursor + 1);
    else if (code === 'ArrowLeft' || code === 'KeyA') game.bossSelectCursor = Math.max(0, game.bossSelectCursor - 1);
    else if (code === 'ArrowDown' || code === 'KeyS') game.bossSelectCursor = Math.min(bLen - 1, game.bossSelectCursor + 3);
    else if (code === 'ArrowUp' || code === 'KeyW') game.bossSelectCursor = Math.max(0, game.bossSelectCursor - 3);
    else if (code === 'KeyQ') game.bossDifficulty = Math.max(0, (game.bossDifficulty ?? 1) - 1);
    else if (code === 'KeyE') game.bossDifficulty = Math.min(2, (game.bossDifficulty ?? 1) + 1);
    else if (code === 'Enter' || code === 'Space') {
      const b = BOSS_SELECT_DATA[game.bossSelectCursor];
      if (b && game.highestStage >= b.stageReq) {
        game.selectedBossAbility = b.id; game.bossRushModeActive = true; game.endlessModeActive = false; startGame();
      }
    }
    return;
  }
  if (game.state === 'map') {
    if (code === 'Digit1') chooseRoute(0);
    else if (code === 'Digit2') chooseRoute(1);
    return;
  }
  if (code === 'KeyR' && game.state === 'gameover') {
    game.continueNoStarsThisRun = false;
    showMessage(null); startBGM(); game.stage = game.startStage; initStars(); updateHUD(); initStage(); game.state = 'playing';
  }
  if (code === 'KeyC' && game.state === 'gameover') {
    if (tryContinueFromGameOver()) return;
  }
  if (code === 'KeyB' && game.state === 'gameover' && game.selectedBossAbility) {
    showMessage(null); game.bossRushModeActive = true; game.endlessModeActive = false; startGame(); return;
  }
  if (game.state === 'title' && (code === 'KeyC' || code === 'Space' || code === 'Enter')) {
    beginTitleFromTap();
    return;
  }
  if (code === 'Space' || code === 'Enter') {
    if (game.state === 'gameover') {
      game.continueNoStarsThisRun = false;
      showMessage(null); startBGM(); game.customizeCursor = 0; game.bossRushModeActive = false; game.endlessModeActive = false; game.state = 'customize';
    }
    else if (game.state === 'clear-stage') { showMessage(null); nextStage(); }
  }
  if (code === 'KeyQ' && game.state === 'playing') cycleWeapon();
  if (code === 'ShiftLeft' && game.state === 'playing') tryDash();
  if ((code === 'KeyE' || code === 'Enter') && game.state === 'playing') tryUltimate();
  }
}
