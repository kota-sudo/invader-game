/**
 * State-keyed UI hit targets for touch / drawUIButtons (actions close over main wiring).
 */
import { clearShopHexSel, resetShopHexCamera } from './draw-shop-hex.js';
import { game } from './game-store.js';
import { CANVAS_H as H, CANVAS_W as W } from './constants.js';
import { getCustomizeHeaderLayout, getCustomizeLayout } from './customize-layout.js';
import {
  getStageSelectIdealScroll,
  getStageSelectShipFollowStage,
  getStageSelectShipTarget,
} from './stage-select-map-geometry.js';

export function createUiButtons(deps) {
  const {
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
  } = deps;

  function closeSettingsToCaller() {
    let back = 'customize';
    if (game.settingsReturnState === 'title') back = 'title';
    else if (game.settingsReturnState === 'galaxy_map') back = 'galaxy_map';
    game.settingsReturnState = null;
    game.state = back;
  }

  const BACK_BTN = { id: 'back', x: 14, y: 558, w: 196, h: 34, label: '◀  戻る', action: () => { game.state = 'customize'; } };

  function exitShopToCaller() {
    if (game.returnToGalaxyAfterOverlay) {
      game.returnToGalaxyAfterOverlay = false;
      game.state = 'galaxy_map';
    } else game.state = 'customize';
  }

  const titleGearX = W - 40;
  const titleGearY = 10;
  const titleGearS = 36;

  return {
    /** タイトル：右上設定ギアのみ（開始は画面全体 TAP → beginTitleFromTap） */
    get title() {
      return [
        {
          id: 'title_gear',
          x: titleGearX,
          y: titleGearY,
          w: titleGearS,
          h: titleGearS,
          label: '⚙',
          titleMars: true,
          titleHexIcon: true,
          action: () => { game.settingsReturnState = 'title'; game.state = 'settings'; },
        },
      ];
    },
    settings: [{ ...BACK_BTN, label: '◀ 戻る', action: closeSettingsToCaller }],
    notifications: [{ ...BACK_BTN, label: '◀ 戻る', action: () => { game.state = 'customize'; } }],
    inbox: [{ ...BACK_BTN, label: '◀ 戻る', action: () => { game.state = 'customize'; } }],
    events: [{ ...BACK_BTN, label: '◀ 戻る', action: () => { game.state = 'customize'; } }],
    iap: [{ ...BACK_BTN, label: '◀ 戻る', action: () => { game.iapModal = null; game.state = 'customize'; } }],
    gacha: [
      {
        ...BACK_BTN,
        label: '◀ 戻る',
        action: () => {
          if (game.gachaRatesModal) game.gachaRatesModal = false;
          else if (game.returnToGalaxyAfterOverlay) {
            game.returnToGalaxyAfterOverlay = false;
            game.state = 'galaxy_map';
          } else game.state = 'customize';
        },
      },
    ],
    gacha_rates: [{ id: 'close', x: 14, y: 558, w: 160, h: 34, label: '◀  ガチャに戻る', action: () => { game.state = 'gacha'; } }],
    stage_select: [],
    get loadout() {
      const btns = [
        {
          ...BACK_BTN,
          y: 564,
          label: '◀ 戻る',
          action: () => {
            if (game.returnToGalaxyAfterOverlay) {
              game.returnToGalaxyAfterOverlay = false;
              game.state = 'galaxy_map';
            } else game.state = 'customize';
          },
        },
      ];
      try {
        const pool = buildLoadoutPool();
        const cur = Math.min(game.loadoutCursor, Math.max(0, pool.length - 1));
        const item = pool[cur];
        const PX = 4, PY = 50, PW = 290, PH = H - PY - 48;
        const baseY = PY + PH - 44;
        const bh = 30;
        const toggleBtn = { id: 'ld_toggle', x: PX + 14, y: baseY, w: PW - 28, h: bh, label: '◎ 装着', action: () => { } };
        const upBtn = { id: 'ld_upgrade', x: PX + 14, y: baseY - bh - 8, w: PW - 28, h: bh, label: '▲ 強化', action: () => { } };

        const isEquipped = (() => {
          if (!item) return false;
          if (game.loadoutTab === 0) return (game.playerLoadout.charId === item.id) || (item.id === 'char_basic' && !game.playerLoadout.charId);
          if (game.loadoutTab === 1) return Array.isArray(game.playerLoadout?.equip) && game.playerLoadout.equip.includes(item.id);
          if (game.loadoutTab === 2) return Array.isArray(game.playerLoadout?.pets) && game.playerLoadout.pets.includes(item.id);
          if (game.loadoutTab === 3) return (game.playerLoadout.weaponId === item.id) || (!item.id && !game.playerLoadout.weaponId);
          return false;
        })();

        if (game.loadoutTab === 2 && game.petUpgradePanel && game.petUpgradePanel.open) {
          return btns;
        }
        if (game.loadoutUpgradeOverlay && game.loadoutUpgradeOverlay.open) {
          return btns;
        }
        toggleBtn.label = isEquipped ? '● 装備中（タップで外す）' : '◎ 装着';
        toggleBtn.glowMult = 1.25;
        toggleBtn.color = isEquipped ? '#66ffaa' : '#66ccff';
        upBtn.glowMult = 0.95;
        upBtn.color = '#0cf';
        toggleBtn.action = () => {
          if (!item) return;
          if (isEquipped) {
            if (game.loadoutTab === 0) {
              game.playerLoadout.charId = null; saveLoadout(); return;
            }
            if (game.loadoutTab === 1) {
              if (Array.isArray(game.playerLoadout?.equip)) {
                game.playerLoadout.equip = game.playerLoadout.equip.map(eid => eid === item.id ? null : eid);
                saveLoadout();
              }
              return;
            }
            if (game.loadoutTab === 2) {
              if (Array.isArray(game.playerLoadout?.pets)) {
                game.playerLoadout.pets = game.playerLoadout.pets.map(pid => pid === item.id ? null : pid);
                saveLoadout();
              }
              return;
            }
            if (game.loadoutTab === 3) {
              game.playerLoadout.weaponId = null; saveLoadout(); return;
            }
            return;
          }
          game.petLevelUpOverlay = null;
          applyLoadoutSelection(item);
        };
        btns.push(toggleBtn);

        const inv = item && item.id ? game.gachaInventory?.[item.id] : null;
        const canGachaUp = !!(item && item.id && getLevelUpCost(item));
        const canPetUp = !!(game.loadoutTab === 2 && item && item.id && inv && (inv.level || 1) < 5);
        const can = canGachaUp || canPetUp;
        if (can) {
          upBtn.action = () => {
            if (!item || !item.id) return;
            if (game.loadoutTab === 2) {
              const open = !!(game.petUpgradePanel && game.petUpgradePanel.open && game.petUpgradePanel.petId === item.id);
              game.petUpgradePanel = { open: !open, petId: item.id, changedAt: game.frameCount };
              return;
            }
            const open = !!(game.loadoutUpgradeOverlay && game.loadoutUpgradeOverlay.open && game.loadoutUpgradeOverlay.itemId === item.id);
            game.loadoutUpgradeOverlay = { itemId: item.id, tab: game.loadoutTab, open: !open, changedAt: game.frameCount };
          };
          btns.push(upBtn);
        }
        // 装備タブに融合ボタン
        if (game.loadoutTab === 1 && item && item.type === 'equip') {
          btns.push({
            id: 'ld_fusion', x: W - 206, y: baseY, w: 192, h: bh,
            label: '🔮 融合', color: '#cc88ff',
            action: () => { game.fusionCursor = 0; game.state = 'fusion'; },
          });
        }
      } catch (e) { }
      return btns;
    },
    map: [BACK_BTN],
    shop: [
      { ...BACK_BTN, action: exitShopToCaller },
      { id: 'synth', x: W - 210, y: 558, w: 196, h: 34, label: '🔩 素材合成', action: () => { game.state = 'synthesis'; } },
    ],
    synthesis: [
      { ...BACK_BTN, label: '◀ 強化ショップ', action: () => { game.state = 'shop'; } },
    ],
    fusion: [
      { ...BACK_BTN, label: '◀ ロードアウト', action: () => { game.state = 'loadout'; } },
    ],
    stardust_shop: [{ id: 'back', x: 14, y: 558, w: 196, h: 34, label: '◀  ガチャに戻る', action: () => { game.state = 'gacha'; } }],
    missions: [
      {
        id: 'back',
        x: 14,
        y: 558,
        w: 196,
        h: 34,
        label: '◀  戻る',
        action: () => {
          game.missionsScrollY = 0;
          if (game.missionsReturnState === 'galaxy_map') {
            game.missionsReturnState = null;
            game.state = 'galaxy_map';
          } else {
            game.missionsReturnState = null;
            game.state = 'customize';
          }
        },
      },
    ],
    mode_select: [
      { id: 'ms_boss', x: 60, y: 80, w: 320, h: 400, action: () => { game.bossRushModeActive = true; game.endlessModeActive = false; startGame(); } },
      { id: 'ms_endless', x: 420, y: 80, w: 320, h: 400, action: () => { game.endlessModeActive = true; game.bossRushModeActive = false; startGame(); } },
      { id: 'back', x: 14, y: 558, w: 196, h: 34, label: '◀  戻る', action: () => { game.state = 'customize'; } },
    ],
    boss_select: [
      { id: 'back', x: 14, y: 558, w: 196, h: 34, label: '◀  戻る', action: () => { game.state = 'customize'; } },
    ],
    get customize() {
      const L = getCustomizeLayout();
      const headerL = getCustomizeHeaderLayout();
      const { MX, CW, eY, eH, startY2, startH2, bMX, bCW, stageSelY, stageSelH, navTabY, navTabH, navTabW } = L;
      const strtAction = () => {
        game.bossRushModeActive = false;
        game.startStage = Math.max(1, Math.min(game.startStage, game.highestStage));
        startGame();
      };
      const stageSelAction = () => {
        game.bossRushModeActive = false;
        game.startStage = Math.max(1, Math.min(game.startStage, game.highestStage));
        const hs = Math.max(1, game.highestStage);
        const maxI = Math.max(0, hs);
        game.stageSelectIdx = Math.max(0, Math.min(maxI, game.startStage - 1));
        game.stageMapScrollOffset = getStageSelectIdealScroll(game.stageSelectIdx + 1, H, 478);
        const pos = getStageSelectShipTarget(H, getStageSelectShipFollowStage(game.stageSelectIdx + 1, game.highestStage), 478, game.highestStage);
        if (pos) { game.stageCharX = pos.x; game.stageCharY = pos.y; game.stageCharTX = pos.x; game.stageCharTY = pos.y; }
        game.state = 'stage_select';
      };
      const deployW = Math.min(420, bCW * 0.56);
      const deployH = 68;
      const deployX = bMX + (bCW - deployW) / 2;
      const deployY = startY2 + (startH2 - deployH) / 2 + 8;
      const galaxyW = 136;
      const galaxyH = 34;
      const galaxyX = Math.max(bMX + 2, deployX - galaxyW - 48);
      const galaxyY = deployY + deployH / 2 - galaxyH / 2 + 10;
      return [
        {
          id: 'ui_load',
          x: MX,
          y: eY,
          w: CW,
          h: eH,
          action: () => {
            game.returnToGalaxyAfterOverlay = false;
            game.customizeCursor = 0;
            game.loadoutTab = 0;
            game.loadoutCursor = 0;
            game.state = 'loadout';
          },
        },
        { id: 'ui_hdr_notif', x: 0 * navTabW, y: navTabY, w: navTabW, h: navTabH, action: () => { loadInbox(); game.notifTab = 0; game.state = 'notifications'; } },
        { id: 'ui_hdr_event', x: 1 * navTabW, y: navTabY, w: navTabW, h: navTabH, action: () => { game.notifTab = 1; game.state = 'notifications'; } },
        {
          id: 'ui_gach',
          x: 2 * navTabW,
          y: navTabY,
          w: navTabW,
          h: navTabH,
          action: () => {
            game.returnToGalaxyAfterOverlay = false;
            game.customizeCursor = 1;
            game.state = 'gacha';
          },
        },
        {
          id: 'ui_shop',
          x: 3 * navTabW,
          y: navTabY,
          w: navTabW,
          h: navTabH,
          action: () => {
            game.returnToGalaxyAfterOverlay = false;
            game.customizeCursor = 2;
            game.shopCursor = 0;
            game.shopTreeFocusId = null;
            game.shopSubgraphCatId = null;
            game.shopSubgraphScrollY = 0;
            game.shopTab = 0;
            resetShopHexCamera();
            clearShopHexSel();
            updateShopPanel(null);
            game.state = 'shop';
          },
        },
        {
          id: 'ui_miss',
          x: 4 * navTabW,
          y: navTabY,
          w: navTabW,
          h: navTabH,
          action: () => {
            game.customizeCursor = 3;
            game.missionsScrollY = 0;
            game.missionsReturnState = null;
            ensureNormalQuestProfile();
            checkAndClaimNormalQuests();
            ensureActiveMissions();
            game.state = 'missions';
          },
        },
        { id: 'ui_boss', x: 5 * navTabW, y: navTabY, w: navTabW, h: navTabH, action: () => { game.customizeCursor = 5; game.bossSelectCursor = 0; game.state = 'boss_select'; } },
        { id: 'ui_galaxy_map', x: galaxyX, y: galaxyY, w: galaxyW, h: galaxyH, action: () => { game.returnToGalaxyAfterOverlay = false; game.state = 'galaxy_map'; } },
        { id: 'ui_stage_sel', x: MX + 8, y: stageSelY, w: CW - 16, h: stageSelH, action: stageSelAction },
        { id: 'ui_equip_expand', x: MX + CW - 104, y: eY + 4, w: 92, h: 20, action: () => { game.customizeEquipExpanded = !game.customizeEquipExpanded; } },
        { id: 'ui_hdr_set', ...headerL.settings, action: () => { game.settingsReturnState = 'customize'; game.state = 'settings'; } },
        { id: 'ui_gem_plus', ...headerL.gemPlus, action: () => { game.iapScroll = 0; game.state = 'iap'; } },
        { id: 'ui_strt', x: deployX, y: deployY, w: deployW, h: deployH, action: strtAction },
      ];
    },
  };
}
