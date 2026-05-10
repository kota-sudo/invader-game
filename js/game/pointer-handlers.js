import { game, setTitleBgQuality } from './game-store.js';
import { safeLocalStorageSetItem } from './storage-helpers.js';
import { bindCanvasPointer, bindCanvasTouch } from './input.js';
import {
  CHAR_POOL, EQUIP_POOL, PET_POOL, WEAPON_GACHA_POOL,
} from '../game-data.js';
import {
  shopHexPan, shopHexZoomAt,
  getShopHexSel, setShopHexSel, clearShopHexSel,
  resetShopHexCamera, setShopHexOverview,
} from './draw-shop-hex.js';
import {
  getStageSelectIdealScroll,
  getStageSelectShipFollowStage,
  getStageSelectShipTarget,
} from './stage-select-map-geometry.js';
import { isTitleTapLabelHovered } from './title-layout.js';
import { isStageSelectOverlayBlockingCanvasPointer } from '../ui/stage-select-overlay.js';

/**
 * Canvas mouse, wheel, and touch wiring (moved from main.js).
 * Call once at startup after all game functions exist.
 */
export function registerPointerInput(canvas, deps) {
  const {
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
  } = deps;
  const hideMessage = deps.hideMessage;

  bindCanvasPointer(canvas, {
  onMouseMove(e) {
    const W = canvas.width;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width, scaleY = canvas.height / rect.height;
    const mx = (e.clientX - rect.left) * scaleX, my = (e.clientY - rect.top) * scaleY;
    // タイトル背景の追従用（ボタンホバーとは独立）
    game.titlePointerX = mx; game.titlePointerY = my;
    const btns = UI_BUTTONS[game.state] || [];
    let hover = btns.find(b => mx >= b.x && mx <= b.x + b.w && my >= b.y && my <= b.y + b.h) || null;
    // stage_select: ノード/出撃ボタンもホバー対象にする
    if (!hover && game.state === 'stage_select' && !isStageSelectOverlayBlockingCanvasPointer()) {
      const hits = Array.isArray(game._stageSelectNodeHits) ? game._stageSelectNodeHits : [];
      const nHit = hits.find(h => { const dx = mx - h.x, dy = my - h.y; return dx * dx + dy * dy <= h.r * h.r; });
      if (nHit) hover = { id: 'ss_node', stage: nHit.stage, x: nHit.x - nHit.r, y: nHit.y - nHit.r, w: nHit.r * 2, h: nHit.r * 2 };
      else if (game._stageSelectLaunchHit) {
        const b = game._stageSelectLaunchHit;
        if (mx >= b.x && mx <= b.x + b.w && my >= b.y && my <= b.y + b.h) hover = { id: 'ss_launch', ...b };
      }
      if (!hover && game._stageSelectBossCardHit) {
        const h = game._stageSelectBossCardHit;
        if (mx >= h.x && mx <= h.x + h.w && my >= h.y && my <= h.y + h.h) hover = { id: 'ss_boss_card', ...h };
      }
      if (!hover && game._stageSelectBackHit) {
        const h = game._stageSelectBackHit;
        if (mx >= h.x && mx <= h.x + h.w && my >= h.y && my <= h.y + h.h) hover = { id: 'ss_back', ...h };
      }
    }
    if (!hover && game.state === 'gameover' && Array.isArray(game._gameoverHits)) {
      const tp = 14;
      const gh = game._gameoverHits.find(h => !h.disabled && mx >= h.x - tp && mx <= h.x + h.w + tp && my >= h.y - tp && my <= h.y + h.h + tp);
      if (gh) hover = { id: `go_${gh.type}`, ...gh };
    }
    if (!hover && game.paused && game.state === 'playing' && Array.isArray(game._pauseBtnHits)) {
      const tp = 6;
      const ph = game._pauseBtnHits.find(h => mx >= h.x - tp && mx <= h.x + h.w + tp && my >= h.y - tp && my <= h.y + h.h + tp);
      if (ph) {
        hover = {
          id: ph.type === 'resume' ? 'pause_resume' : 'pause_quit',
          pauseHitType: ph.type,
          x: ph.x,
          y: ph.y,
          w: ph.w,
          h: ph.h,
        };
      }
    }
    if (!hover && game.state === 'stage_result' && game.stageResultTimer > 60 && Array.isArray(game._stageResultHits)) {
      const tp = 4;
      const rh = game._stageResultHits.find(h =>
        mx >= h.x - tp && mx <= h.x + h.w + tp && my >= h.y - tp && my <= h.y + h.h + tp,
      );
      if (rh) {
        hover = {
          id: `sr_${rh.type}`,
          stageResultType: rh.type,
          x: rh.x,
          y: rh.y,
          w: rh.w,
          h: rh.h,
        };
      }
    }
    if (!hover && game.state === 'loadout' && my >= 0 && my <= 47) {
      hover = { id: 'ld_tab', x: 0, y: 0, w: W, h: 47 };
    }
    game.hoveredBtn = hover;
    if (game.state === 'title' || game.state === 'galaxy_map') {
      game.titleTapHovered = game.state === 'title' && !hover && isTitleTapLabelHovered(mx, my);
      canvas.style.cursor = game.state === 'title' ? 'pointer' : 'default';
    } else {
      game.titleTapHovered = false;
      canvas.style.cursor = game.hoveredBtn ? 'pointer' : 'default';
    }
  },
  onClick(e) {
    const W = canvas.width, H = canvas.height;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width, scaleY = canvas.height / rect.height;
    const mx = (e.clientX - rect.left) * scaleX, my = (e.clientY - rect.top) * scaleY;

    const btns = UI_BUTTONS[game.state] || [];
    const _tp = 6; // C: タッチ用パディング
    const btn = btns.find(b => mx >= b.x - _tp && mx <= b.x + b.w + _tp && my >= b.y - _tp && my <= b.y + b.h + _tp);
    if (btn) {
      game.uiLastTap = { id: btn.id, frame: game.frameCount };
      if (game.state === 'title' && typeof btn.id === 'string' && btn.id.startsWith('title_')) {
        safeLocalStorageSetItem('invader_title_tap_hint_seen', '1');
        game.titleBtnPressFx = { id: btn.id, until: game.frameCount + 9 };
        if (typeof triggerFlash === 'function') triggerFlash(255, 72, 48, 0.34, 6);
      }
      btn.action();
      return;
    }

    if (game.state === 'title' && typeof beginTitleFromTap === 'function') {
      beginTitleFromTap();
      return;
    }

    if (game.state === 'gameover' && Array.isArray(game._gameoverHits)) {
      const tp = 14;
      const gh = game._gameoverHits.find(h => !h.disabled && mx >= h.x - tp && mx <= h.x + h.w + tp && my >= h.y - tp && my <= h.y + h.h + tp);
      if (gh) {
        if (gh.type === 'continue') { if (tryContinueFromGameOver()) return; }
        else if (gh.type === 'retry') {
          game.continueNoStarsThisRun = false;
          showMessage(null); startBGM(); game.stage = game.startStage; initStars(); updateHUD(); initStage(); game.state = 'playing';
          return;
        } else if (gh.type === 'boss_retry' && game.selectedBossAbility) {
          showMessage(null); game.bossRushModeActive = true; game.endlessModeActive = false; startGame(); return;
        }
      }
    }
    // ステージリザルト: ボタンタップ
    if (game.state === 'stage_result' && game.stageResultTimer > 60 && Array.isArray(game._stageResultHits)) {
      const tp = 4;
      const rh = game._stageResultHits.find(h =>
        mx >= h.x - tp && mx <= h.x + h.w + tp && my >= h.y - tp && my <= h.y + h.h + tp,
      );
      if (rh) {
        if (rh.type === 'next') { game.stageResultData = null; genMapRoutes(); chooseRoute(Math.floor(Math.random() * 2)); }
        else if (rh.type === 'retry') {
          const st = game.stageResultData?.stage;
          game.stageResultData = null;
          if (typeof st === 'number' && st >= 1) game.startStage = st;
          startGame();
        }
        else {
          game.stageResultData = null;
          game.stageSelectIdx = Math.min(game.stage, game.highestStage) - 1;
          game.stageMapScrollOffset = getStageSelectIdealScroll(game.stageSelectIdx + 1, H, 478);
          const pos = getStageSelectShipTarget(H, getStageSelectShipFollowStage(game.stageSelectIdx + 1, game.highestStage), 478, game.highestStage);
          if (pos) { game.stageCharX = pos.x; game.stageCharY = pos.y; game.stageCharTX = pos.x; game.stageCharTY = pos.y; }
          game.state = 'stage_select';
        }
        return;
      }
    }
    // ≡ MENUボタン（プレイ中・ポーズ中共通）
    if ((game.state === 'playing' || game.paused) && game._menuBtnHit) {
      const m = game._menuBtnHit;
      if (mx >= m.x - 4 && mx <= m.x + m.w + 4 && my >= m.y - 4 && my <= m.y + m.h + 4) {
        game.paused = !game.paused; return;
      }
    }
    // ポーズ画面の 再開/やめる ボタン
    if (game.paused && Array.isArray(game._pauseBtnHits)) {
      const ph = game._pauseBtnHits.find(b => mx >= b.x - 4 && mx <= b.x + b.w + 4 && my >= b.y - 4 && my <= b.y + b.h + 4);
      if (ph) {
        if (ph.type === 'resume') { game.paused = false; return; }
        if (ph.type === 'quit') {
          game.continueNoStarsThisRun = false;
          game.paused = false;
          showMessage(null);
          startBGM();
          game.customizeCursor = 0;
          game.bossRushModeActive = false;
          game.endlessModeActive = false;
          game.state = 'customize';
          return;
        }
      }
    }

    if (game.state === 'gacha' && handleGachaMainClick(mx, my)) return;
    if (game.state === 'gacha_result' && handleGachaResultClick(mx, my)) return;
    if (game.state === 'gacha_summary' && handleGachaSummaryClick(mx, my)) return;
    if (game.state === 'gacha_rates' && handleGachaRatesClick(mx, my)) return;
    if (game.state === 'stardust_shop' && handleStardustShopClick(mx, my)) return;

    // 設定画面
    if (game.state === 'settings' && Array.isArray(game._settingsHits)) {
      const sh = game._settingsHits.find(h => mx >= h.x && mx <= h.x + h.w && my >= h.y && my <= h.y + h.h);
      if (sh) {
        if (sh.type === 'toggle') {
          if (!game.settings) game.settings = { bgm: true, vibration: true, quality: 'high', language: 'ja', titleScanlines: true };
          game.settings[sh.key] = !game.settings[sh.key];
          if (sh.key === 'bgm') { game.settings.bgm ? startBGM() : stopBGM(); }
          saveSettings();
        } else if (sh.type === 'select') {
          if (!game.settings) game.settings = { bgm: true, vibration: true, quality: 'high', language: 'ja', titleScanlines: true };
          game.settings[sh.key] = sh.val;
          if (sh.key === 'quality') setTitleBgQuality(sh.val === 'high' ? 'full' : sh.val === 'mid' ? 'fast' : 'low');
          saveSettings();
        } else if (sh.type === 'slider') {
          const ratio = Math.max(0, Math.min(1, (mx - sh.x) / sh.w));
          game.masterVolume = Math.round(ratio * 10) / 10; saveVolume();
        } else if (sh.type === 'name_btn') {
          const raw = typeof window !== 'undefined' && window.prompt ? window.prompt('プレイヤー名（12文字まで・週次ランキング表示用）', game.displayName || 'PLAYER') : null;
          if (raw != null) saveDisplayName(raw);
        }
        return;
      }
    }
    // 受け取りボックス（単独 or 通知画面内）
    if ((game.state === 'inbox' || game.state === 'notifications') && Array.isArray(game._inboxHits)) {
      const ih = game._inboxHits.find(h => mx >= h.x && mx <= h.x + h.w && my >= h.y && my <= h.y + h.h);
      if (ih) { ih.id === 'all' ? claimAllInbox() : claimInboxItem(ih.id); playSound('powerup'); return; }
    }
    // 通知画面タブ切替
    if (game.state === 'notifications' && Array.isArray(game._notifTabHits)) {
      const nt = game._notifTabHits.find(h => mx >= h.x && mx <= h.x + h.w && my >= h.y && my <= h.y + h.h);
      if (nt) { game.notifTab = nt.idx; return; }
    }
    // イベントタブ切替（単独画面）
    if (game.state === 'events' && Array.isArray(game._eventsTabHits)) {
      const et = game._eventsTabHits.find(h => mx >= h.x && mx <= h.x + h.w && my >= h.y && my <= h.y + h.h);
      if (et) { game.eventsTab = et.idx; return; }
    }
    // 課金画面
    if (game.state === 'iap') {
      if (Array.isArray(game._iapAgeHits)) {
        const ah = game._iapAgeHits.find(h => mx >= h.x && mx <= h.x + h.w && my >= h.y && my <= h.y + h.h);
        if (ah) { if (ah.type === 'yes') { game.ageVerified = true; safeLocalStorageSetItem('invader_age_verified', '1'); } else { game.state = 'customize'; } return; }
      }
      if (Array.isArray(game._iapHits)) {
        const ih = game._iapHits.find(h => mx >= h.x && mx <= h.x + h.w && my >= h.y && my <= h.y + h.h);
        if (ih) { showMessage(`テスト購入: ${ih.pkg.label}\n¥${ih.pkg.price.toLocaleString()}\n（実装準備中）`); setTimeout(() => { if (game.state !== 'iap') return; game.state = 'iap'; hideMessage?.(); }, 2000); return; }
      }
    }
    // loadout: equip filter tabs / grid click
    if (game.state === 'loadout') {
      // Top tabs (キャラ/装備/ペット/武器) — drawLoadoutScreen と座標一致（y=0..47, TW=W/4）
      if (my >= 0 && my <= 47) {
        const TW = W / 4;
        const ti = Math.max(0, Math.min(3, Math.floor(mx / TW)));
        if (ti !== game.loadoutTab) {
          game.loadoutTab = ti;
          game.loadoutCursor = 0;
          game.loadoutSelAnimFrame = game.frameCount;
          game.loadoutSelAnimDir = 0;
          // タブ切替時は下部オーバーレイを閉じる（誤操作防止）
          if (game.loadoutUpgradeOverlay) game.loadoutUpgradeOverlay.open = false;
          if (game.petUpgradePanel) game.petUpgradePanel.open = false;
        }
        return;
      }
      // Equip quick filter tabs (全て/攻撃/耐久/会心)
      if (game.loadoutTab === 1 && Array.isArray(game._equipQuickFilterHits)) {
        const hit = game._equipQuickFilterHits.find(h => mx >= h.x && mx <= h.x + h.w && my >= h.y && my <= h.y + h.h);
        if (hit) {
          game.equipQuickFilter = hit.id;
          game.loadoutCursor = 0;
          game.loadoutSelAnimFrame = game.frameCount;
          game.loadoutSelAnimDir = 0;
          return;
        }
      }
      // ④ Char rarity filter tabs
      if (game.loadoutTab === 0 && Array.isArray(game._charRarityFilterHits)) {
        const hit = game._charRarityFilterHits.find(h => mx >= h.x && mx <= h.x + h.w && my >= h.y && my <= h.y + h.h);
        if (hit) {
          game.charRarityFilter = hit.id;
          game.loadoutCursor = 0;
          game.loadoutSelAnimFrame = game.frameCount;
          game.loadoutSelAnimDir = 0;
          return;
        }
      }
      // Total stats compare toggle (left panel)
      if (game.loadoutTab === 1 && game._equipTotalCompareHit) {
        const h = game._equipTotalCompareHit;
        if (mx >= h.x && mx <= h.x + h.w && my >= h.y && my <= h.y + h.h) {
          game.equipTotalCompareOpen = !game.equipTotalCompareOpen;
          return;
        }
      }
      // Equip sort preset button
      if (game.loadoutTab === 1 && game._equipSortHit) {
        const h = game._equipSortHit;
        if (mx >= h.x && mx <= h.x + h.w && my >= h.y && my <= h.y + h.h) {
          game.equipSortPreset = ((game.equipSortPreset || 0) + 1) % 3;
          game.loadoutCursor = 0;
          game.loadoutSelAnimFrame = game.frameCount;
          game.loadoutSelAnimDir = 0;
          return;
        }
      }

      // ⑮ Long press overlay close
      if (game.loadoutLongPressOverlay) {
        game.loadoutLongPressOverlay = null;
        return;
      }
      // ⑪ Preset buttons
      if (Array.isArray(game._presetHits)) {
        const ph2 = game._presetHits.find(h => mx >= h.x && mx <= h.x + h.w && my >= h.y && my <= h.y + h.h);
        if (ph2) {
          applyLoadoutPreset(ph2.i);
          return;
        }
      }

      // Grid click selects item (left detail updates immediately)
      // Recompute same layout as drawLoadoutScreen
      const PX = 4, PY = 50, PW = 290, PH = H - PY - 48;
      const LX = PX + PW + 6, LY = PY, LW = W - LX - 4, LH = PH;
      let equipHudH = 0;
      if (game.loadoutTab === 1) equipHudH = 34;
      if (game.loadoutTab === 0) equipHudH = 30;
      let pool = [];
      if (game.loadoutTab === 0) {
        const rf2 = game.charRarityFilter || 'all';
        pool = CHAR_POOL.filter(c => (game.gachaInventory[c.id] || c.id === 'char_basic') && (rf2 === 'all' || c.rarity === rf2));
        if (pool.length === 0) pool = CHAR_POOL.filter(c => game.gachaInventory[c.id] || c.id === 'char_basic');
      }
      else if (game.loadoutTab === 1) pool = buildEquipPool();
      else if (game.loadoutTab === 2) pool = PET_POOL.filter(p => game.gachaInventory[p.id]);
      else pool = [{ id: null, rarity: 'N', type: 'weapon', label: 'CLASSIC', desc: '通常弾・無限', color: '#aaa', weapon: 'normal', ammo: 0 }, ...WEAPON_GACHA_POOL.filter(w => game.gachaInventory[w.id])];
      if (pool.length > 0) {
        const COLS = (game.loadoutTab === 0 ? (LW < 320 ? 2 : 3) : 4);
        const sidePad = 8, basePadY = 8, gap = (game.loadoutTab === 1 ? 8 : 6);
        const padY = basePadY + (equipHudH || 0);
        const cellW = Math.floor((LW - sidePad * 2 - gap * (COLS - 1)) / COLS);
        const cellH = Math.min(cellW, (game.loadoutTab === 1 ? 80 : 72));
        const visRows = Math.max(1, Math.floor((LH - padY - basePadY - 24) / (cellH + gap)));
        const maxIdx = pool.length - 1;
        const cur = Math.min(game.loadoutCursor, Math.max(0, maxIdx));
        const curRow = Math.floor(cur / COLS);
        const startRow = Math.max(0, Math.min(curRow - Math.floor(visRows / 2), Math.ceil(pool.length / COLS) - visRows));

        const gx0 = LX + sidePad;
        const gy0 = LY + padY;
        const gx1 = gx0 + COLS * (cellW + gap) - gap;
        const gy1 = gy0 + visRows * (cellH + gap) - gap;
        if (mx >= gx0 && mx <= gx1 && my >= gy0 && my <= gy1) {
          const col = Math.floor((mx - gx0) / (cellW + gap));
          const row = Math.floor((my - gy0) / (cellH + gap));
          const cx = gx0 + col * (cellW + gap);
          const cy = gy0 + row * (cellH + gap);
          // inside cell bounds (exclude gap area)
          if (mx >= cx && mx <= cx + cellW && my >= cy && my <= cy + cellH) {
            const idx = (startRow + row) * COLS + col;
            if (idx >= 0 && idx < pool.length) {
              const prev = game.loadoutCursor;
              game.loadoutCursor = idx;
              if (game.loadoutCursor !== prev) {
                game.loadoutSelAnimFrame = game.frameCount;
                game.loadoutSelAnimDir = (idx > prev ? 1 : -1);
              }
              return;
            }
          }
        }
      }
    }
    // loadout: upgrade panel (Lv-up button / outside close)
    if (game.state === 'loadout' && game.loadoutUpgradeOverlay && game.loadoutUpgradeOverlay.open) {
      const panelH = 252;
      const yTop = H - 48 - panelH;
      const btnW = 260, btnH = 46;
      const bx = W / 2 - btnW / 2, by = yTop + panelH - (btnH + 10);
      // inside panel?
      if (my >= yTop && my <= yTop + panelH) {
        if (mx >= bx && mx <= bx + btnW && my >= by && my <= by + btnH) {
          const tab = game.loadoutUpgradeOverlay.tab;
          const itemId = game.loadoutUpgradeOverlay.itemId;
          const pool = (tab === 0 ? CHAR_POOL : tab === 1 ? EQUIP_POOL : tab === 2 ? PET_POOL : WEAPON_GACHA_POOL);
          const it = pool.find(x => x.id === itemId);
          if (it && getLevelUpCost(it)) {
            tryLevelUpItem(it);
          }
          // 実行後は閉じる（成功しない場合はそのまま）
          game.loadoutUpgradeOverlay.open = false;
          game.loadoutUpgradeOverlay.changedAt = game.frameCount;
          return;
        }
        return;
      }
      // tap outside closes
      game.loadoutUpgradeOverlay.open = false;
      game.loadoutUpgradeOverlay.changedAt = game.frameCount;
      return;
    }
    // loadout: pet upgrade panel (Lv-up button / outside close)
    if (game.state === 'loadout' && game.loadoutTab === 2 && game.petUpgradePanel && game.petUpgradePanel.open && game.petUpgradePanel.petId) {
      const panelH = 228;
      const yTop = H - 48 - panelH;
      const btnW = 240, btnH = 44;
      const bx = W / 2 - btnW / 2, by = yTop + panelH - 60;
      // inside panel?
      if (my >= yTop && my <= yTop + panelH) {
        // Lv-up button
        if (mx >= bx && mx <= bx + btnW && my >= by && my <= by + btnH) {
          const petId = game.petUpgradePanel.petId;
          if (canPetUpgrade(petId)) {
            tryPetLevelUp(petId);
          }
          return;
        }
        // taps inside panel do nothing
        return;
      }
      // tap outside closes
      game.petUpgradePanel.open = false;
      game.petUpgradePanel.changedAt = game.frameCount;
      return;
    }
    // 任務画面: タブ / デイリー・実績・任務 v3 の受取
    if (game.state === 'missions') {
      const tp = 4;
      if (Array.isArray(game._missionsTabHits)) {
        const th = game._missionsTabHits.find(h =>
          mx >= h.x - tp && mx <= h.x + h.w + tp && my >= h.y - tp && my <= h.y + h.h + tp);
        if (th) {
          if (game.missionsTab !== th.tab) game.missionsScrollY = 0;
          game.missionsTab = th.tab;
          return;
        }
      }
      const mTab = game.missionsTab === 'track' || game.missionsTab === 'milestones' ? game.missionsTab : 'daily';
      if (mTab === 'daily' && Array.isArray(game._dailyClaimHits)) {
        const dh = game._dailyClaimHits.find(h =>
          mx >= h.x - tp && mx <= h.x + h.w + tp && my >= h.y - tp && my <= h.y + h.h + tp);
        if (dh) { claimDailyMissionSlot(dh.index); return; }
      }
      if (mTab === 'milestones' && Array.isArray(game._milestoneClaimHits)) {
        const mh = game._milestoneClaimHits.find(h =>
          mx >= h.x - tp && mx <= h.x + h.w + tp && my >= h.y - tp && my <= h.y + h.h + tp);
        if (mh) { claimMilestoneAchievementToInbox(mh.id); return; }
      }
      if (mTab === 'track' && Array.isArray(game._missionClaimHits)) {
        const hit = game._missionClaimHits.find(h =>
          mx >= h.x - tp && mx <= h.x + h.w + tp && my >= h.y - tp && my <= h.y + h.h + tp);
        if (hit) { claimActiveMission(hit.missionId); return; }
      }
    }
    // 素材合成: レシピ選択 / 合成ボタン
    if (game.state === 'synthesis') {
      const tp = 6;
      if (Array.isArray(game._synthRecipeHits)) {
        const rh = game._synthRecipeHits.find(h => mx >= h.x - tp && mx <= h.x + h.w + tp && my >= h.y - tp && my <= h.y + h.h + tp);
        if (rh) { game.synthCursor = rh.i; return; }
      }
      if (game._synthBtn1Hit) {
        const b = game._synthBtn1Hit;
        if (b.enabled && mx >= b.x - tp && mx <= b.x + b.w + tp && my >= b.y - tp && my <= b.y + b.h + tp) {
          const rec = (SYNTH_RECIPES || [])[game.synthCursor];
          if (rec) tryCustomSynth(rec.id, 1);
          return;
        }
      }
      if (game._synthBtnMaxHit) {
        const b = game._synthBtnMaxHit;
        if (b.enabled && mx >= b.x - tp && mx <= b.x + b.w + tp && my >= b.y - tp && my <= b.y + b.h + tp) {
          const rec = (SYNTH_RECIPES || [])[game.synthCursor];
          if (rec) tryCustomSynth(rec.id, 'max');
          return;
        }
      }
    }
    // 融合: アイテム選択 / 融合ボタン
    if (game.state === 'fusion') {
      const tp = 6;
      if (Array.isArray(game._fusionItemHits)) {
        const fh = game._fusionItemHits.find(h => mx >= h.x - tp && mx <= h.x + h.w + tp && my >= h.y - tp && my <= h.y + h.h + tp);
        if (fh) { game.fusionCursor = fh.i; return; }
      }
      if (game._fusionBtnHit) {
        const b = game._fusionBtnHit;
        if (b.enabled && mx >= b.x - tp && mx <= b.x + b.w + tp && my >= b.y - tp && my <= b.y + b.h + tp) {
          tryEquipFusion(b.itemId);
          return;
        }
      }
    }
    // ボス選択: 難易度タブ
    if (game.state === 'boss_select' && Array.isArray(game._bossDiffHits)) {
      const dh = game._bossDiffHits.find(h => mx >= h.x - 3 && mx <= h.x + h.w + 3 && my >= h.y - 3 && my <= h.y + h.h + 3);
      if (dh) { game.bossDifficulty = dh.idx; return; }
    }
    // ボス選択: カードタップで即挑戦
    if (game.state === 'boss_select' && Array.isArray(game._bossSelectHits)) {
      const hit = game._bossSelectHits.find(h => mx >= h.x && mx <= h.x + h.w && my >= h.y && my <= h.y + h.h);
      if (hit) {
        game.bossSelectCursor = hit.idx;
        if (game.highestStage >= BOSS_SELECT_DATA[hit.idx].stageReq) {
          game.selectedBossAbility = hit.bossId; game.bossRushModeActive = true; game.endlessModeActive = false; startGame();
        }
        return;
      }
    }
    // ショップ: タブ切替 / カード選択 / ボタン実行
    if (game.state === 'shop' && Array.isArray(game._shopHits)) {
      // A: タブクリック（最優先）
      const tabHit = game._shopHits.find(h => h.type === 'tab' && mx >= h.x && mx <= h.x + h.w && my >= h.y && my <= h.y + h.h);
      if (tabHit) {
        const was = game.shopTab;
        game.shopTab = tabHit.idx;
        game.shopSubgraphCatId = null;
        game.shopSubgraphScrollY = 0;
        if (tabHit.idx !== 0) { game.shopTreeFocusId = null; clearShopHexSel(); updateShopPanel(null); }
        if (tabHit.idx === 2) game.fusionCursor = 0;
        if (tabHit.idx === 0 && was !== 0) { game.shopTreeFocusId = null; game._shopTreeAutoCenter = true; }
        return;
      }
      // ボタン系を優先（カード選択より前にチェック）
      if (game.shopTab === 0 && game.shopSubgraphCatId && game._shopSubgraphPanel) {
        const R = game._shopSubgraphPanel;
        const ch = game._shopHits.find(h => h.type === 'closesg' && mx >= h.x && mx <= h.x + h.w && my >= h.y && my <= h.y + h.h);
        if (ch) { game.shopSubgraphCatId = null; game.shopSubgraphScrollY = 0; game.shopTreeFocusId = null; return; }
        const sg = game._shopHits.find(h => h.type === 'sgfnode' && mx >= h.x && mx <= h.x + h.w && my >= h.y && my <= h.y + h.h);
        if (sg) { game.shopTreeFocusId = sg.nodeId; return; }
        if (mx >= R.x && mx <= R.x + R.w && my >= R.y && my <= R.y + R.h) return;
        game.shopSubgraphCatId = null;
        game.shopSubgraphScrollY = 0;
        game.shopTreeFocusId = null;
      }
      const openSg = game._shopHits.find(h => h.type === 'opensg' && mx >= h.x && mx <= h.x + h.w && my >= h.y && my <= h.y + h.h);
      if (openSg && game.shopTab === 0 && !game.shopSubgraphCatId) {
        game.shopSubgraphCatId = openSg.catId;
        game.shopSubgraphScrollY = 0;
        game.shopTreeFocusId = null;
        return;
      }
      // hex カメラボタン（Tab 0）
      if (game.shopTab === 0) {
        const homehit = game._shopHits.find(h => h.type === 'hexhome' && mx >= h.x && mx <= h.x + h.w && my >= h.y && my <= h.y + h.h);
        if (homehit) { resetShopHexCamera(); return; }
        const ovhit = game._shopHits.find(h => h.type === 'hexoverview' && mx >= h.x && mx <= h.x + h.w && my >= h.y && my <= h.y + h.h);
        if (ovhit) { setShopHexOverview(); return; }
      }
      // hex ノードタップ（Tab 0）
      const hexnode = game._shopHits.find(h => h.type === 'hexnode' && mx >= h.x && mx <= h.x + h.w && my >= h.y && my <= h.y + h.h);
      if (hexnode && game.shopTab === 0) {
        if (getShopHexSel() === hexnode.id) { clearShopHexSel(); updateShopPanel(null); }
        else { setShopHexSel(hexnode.id); updateShopPanel(hexnode.id); }
        return;
      }
      const btn = game._shopHits.find(h => (h.type === 'unlock' || h.type === 'upgrade' || h.type === 'compose' || h.type === 'fuse') && mx >= h.x && mx <= h.x + h.w && my >= h.y && my <= h.y + h.h);
      if (btn) {
        if (btn.type === 'unlock') { applyShopUpgrade(btn.idx); return; }
        if (btn.type === 'upgrade') { applyShopUpgrade(btn.idx); return; }
        if (btn.type === 'compose') { tryCompose(btn.count ?? 1); return; }
        if (btn.type === 'fuse') { doWeaponFusion(btn.weaponId); return; }
      }
      // ツリー: ノード選択 / 再タップで強化（UPGRADEタブ）
      const node = game._shopHits.find(h => h.type === 'node' && mx >= h.x && mx <= h.x + h.w && my >= h.y && my <= h.y + h.h);
      if (node) {
        if (game.shopTab === 0) {
          // スマホ向け: タップで選択、確定は下部の「解放」ボタン
          game.shopTreeFocusId = null;
          game.shopSubgraphCatId = null;
          game.shopSubgraphScrollY = 0;
          game.shopCursor = node.idx;
          return;
        }
        // FUSION タブのノード（将来用）: いまは無視
        return;
      }
      const fnode = game._shopHits.find(h => h.type === 'fnode' && mx >= h.x && mx <= h.x + h.w && my >= h.y && my <= h.y + h.h);
      if (fnode && game.shopTab === 0) {
        game.shopSubgraphCatId = null;
        game.shopSubgraphScrollY = 0;
        game.shopTreeFocusId = fnode.nodeId;
        return;
      }
      const sel = game._shopHits.find(h => (h.type === 'select' || h.type === 'fselect') && mx >= h.x && mx <= h.x + h.w && my >= h.y && my <= h.y + h.h);
      if (sel) {
        if (sel.type === 'select') { game.shopTreeFocusId = null; game.shopSubgraphCatId = null; game.shopSubgraphScrollY = 0; game.shopCursor = sel.idx; return; }
        if (sel.type === 'fselect') { game.fusionCursor = sel.idx; return; }
      }
      // ヘックスツリーの空白タップ → パネルを閉じる
      if (game.shopTab === 0 && getShopHexSel()) {
        clearShopHexSel();
        updateShopPanel(null);
        return;
      }
    }
    // stage_select: 戻るボタン
    if (game.state === 'stage_select' && !isStageSelectOverlayBlockingCanvasPointer() && game._stageSelectBackHit) {
      const h = game._stageSelectBackHit;
      if (mx >= h.x && mx <= h.x + h.w && my >= h.y && my <= h.y + h.h) {
        game.state = 'galaxy_map';
        return;
      }
    }
    // stage_select: 出撃準備ボタンタップ
    if (game.state === 'stage_select' && !isStageSelectOverlayBlockingCanvasPointer() && game._stageSelectLaunchHit) {
      const b = game._stageSelectLaunchHit;
      if (mx >= b.x && mx <= b.x + b.w && my >= b.y && my <= b.y + b.h) {
        // クリック時の縮み演出用
        game.uiLastTap = { id: 'ss_launch', frame: game.frameCount };
        if (game._stageSelectLaunchFuelBlocked) {
          game.lifeGainDisplay = { text: '燃料が足りません', timer: 150, color: '#ff8866' };
          return;
        }
        const selS = game.stageSelectIdx + 1;
        if (selS <= game.highestStage) {
          game.startStage = selS; game.customizeCursor = 4; game.state = 'customize';
        }
        return;
      }
    }
    // stage_select: ボスカード（画像）タップで拡大
    if (game.state === 'stage_select' && !isStageSelectOverlayBlockingCanvasPointer() && game._stageSelectBossCardHit) {
      const h = game._stageSelectBossCardHit;
      if (mx >= h.x && mx <= h.x + h.w && my >= h.y && my <= h.y + h.h) {
        game.stageSelectBossModal = { open: true, src: h.src, title: h.title || '' };
        return;
      }
    }
    // stage_select: ボス拡大モーダルを閉じる
    if (game.state === 'stage_select' && !isStageSelectOverlayBlockingCanvasPointer() && game.stageSelectBossModal?.open) {
      game.stageSelectBossModal.open = false;
      return;
    }
    // stage_select: ノードタップ（初回=選択、同じノード再タップ=出撃準備へ）
    if (game.state === 'stage_select' && !isStageSelectOverlayBlockingCanvasPointer()) {
      const hits = Array.isArray(game._stageSelectNodeHits) ? game._stageSelectNodeHits : [];
      for (const h of hits) {
        const dx = mx - h.x, dy = my - h.y;
        if (dx * dx + dy * dy <= h.r * h.r) {
          const s = h.stage;
          // 右パネルへ光ガイド（短い）
          if (game.stageSelectIdx === s - 1 && s <= game.highestStage) {
            if (game._stageSelectLaunchFuelBlocked) {
              game.lifeGainDisplay = { text: '燃料が足りません', timer: 150, color: '#ff8866' };
              return;
            }
            // 選択済みを再タップ → 出撃準備へ
            game.startStage = s; game.customizeCursor = 4; game.state = 'customize';
          } else {
            // 初回タップ → 選択のみ
            game.stageSelectIdx = s - 1;
            game.startStage = s;
            game.stageMapScrollOffset = getStageSelectIdealScroll(game.stageSelectIdx + 1, H, 478);
          }
          return;
        }
      }
    }
  },
});
canvas.addEventListener('wheel', (e) => {
  if (game.state === 'fusion') {
    game.fusionScrollY = Math.max(0, (game.fusionScrollY || 0) + e.deltaY * 0.6);
    e.preventDefault(); return;
  }
  if (game.state === 'missions' && game.missionsTab === 'track') {
    game.missionsScrollY = Math.max(0, (game.missionsScrollY || 0) + e.deltaY * 0.6);
    e.preventDefault();
  }
  // stage_select: 左マップのみ軽い縦スクロール（スナップは描画側で）
  if (game.state === 'stage_select' && !isStageSelectOverlayBlockingCanvasPointer()) {
    const cap = Number.isFinite(game._stageSelectMapMaxScroll) ? game._stageSelectMapMaxScroll : 1200;
    game.stageMapScrollOffset = Math.max(0, Math.min(cap, (game.stageMapScrollOffset || 0) + e.deltaY * 0.65));
    game._stageSelectMapSnapAt = Date.now() + 140;
    e.preventDefault();
    return;
  }
  // shop: hex ツリー ズーム/パン
  if (game.state === 'shop' && game.shopTab === 0) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width, scaleY = canvas.height / rect.height;
    const mx = (e.clientX - rect.left) * scaleX, my = (e.clientY - rect.top) * scaleY;
    const f = e.deltaY < 0 ? 1.1 : 0.9;
    shopHexZoomAt(f, mx, my, canvas.width, canvas.height);
    e.preventDefault();
  }
  if (game.state === 'gacha_rates' || (game.state === 'gacha' && game.gachaRatesModal)) {
    game.gachaRatesScroll = Math.max(0, game.gachaRatesScroll + (e.deltaY > 0 ? 1 : -1));
    e.preventDefault();
  }
}, { passive: false });

// ===== タッチ入力（スマホ対応） =====
let _lastTouchClientX = 0, _lastTouchClientY = 0, _touchStartTime = 0;
let _touchStartCanvasX = 0, _touchLastCanvasX = 0, _touchStartCanvasY = 0, _touchLastCanvasY = 0, _touchIsDrag = false;
let _longPressTimer = null, _longPressCanvasX = 0, _longPressCanvasY = 0;
function _getTouchPos(touch) {
  const rect = canvas.getBoundingClientRect();
  const sx = canvas.width / rect.width, sy = canvas.height / rect.height;
  return { x: (touch.clientX - rect.left) * sx, y: (touch.clientY - rect.top) * sy };
}
bindCanvasTouch(canvas, {
  onTouchStart(e) {
    const t = e.changedTouches[0];
    _lastTouchClientX = t.clientX; _lastTouchClientY = t.clientY;
    _touchStartTime = Date.now();
    _touchIsDrag = false;
    const { x: mx, y: my } = _getTouchPos(t);
    _touchStartCanvasX = mx; _touchLastCanvasX = mx;
    _touchStartCanvasY = my; _touchLastCanvasY = my;
    // ⑮ グリッドカード ロングタップ判定開始
    if (_longPressTimer) { clearTimeout(_longPressTimer); _longPressTimer = null; }
    if (game.state === 'loadout') {
      _longPressCanvasX = mx; _longPressCanvasY = my;
      _longPressTimer = setTimeout(() => {
        if (!_touchIsDrag && game.state === 'loadout') {
          const PX = 4, PY = 50, PW = 290, PH = canvas.height - PY - 48;
          const LX = PX + PW + 6, LY = PY, LW = canvas.width - LX - 4, LH = PH;
          const lmx = _longPressCanvasX, lmy = _longPressCanvasY;
          // ⑪ プリセット長押しで保存
          if (Array.isArray(game._presetHits)) {
            const ph3 = game._presetHits.find(h => lmx >= h.x && lmx <= h.x + h.w && lmy >= h.y && lmy <= h.y + h.h);
            if (ph3) { saveLoadoutPreset(ph3.i); _longPressTimer = null; return; }
          }
          if (lmx >= LX && lmx <= LX + LW && lmy >= LY && lmy <= LY + LH) {
            let pool2 = [];
            if (game.loadoutTab === 0) { const rf = game.charRarityFilter || 'all'; pool2 = CHAR_POOL.filter(c => (game.gachaInventory[c.id] || c.id === 'char_basic') && (rf === 'all' || c.rarity === rf)); if (pool2.length === 0) pool2 = CHAR_POOL.filter(c => game.gachaInventory[c.id] || c.id === 'char_basic'); }
            else if (game.loadoutTab === 1) pool2 = buildEquipPool();
            else if (game.loadoutTab === 2) pool2 = PET_POOL.filter(p => game.gachaInventory[p.id]);
            else pool2 = [{ id: null, rarity: 'N', type: 'weapon', label: 'CLASSIC', desc: '通常弾・無限', color: '#aaa', weapon: 'normal', ammo: 0 }, ...WEAPON_GACHA_POOL.filter(w => game.gachaInventory[w.id])];
            const cur2 = Math.min(game.loadoutCursor, Math.max(0, pool2.length - 1));
            const COLS = (game.loadoutTab === 0 ? (LW < 320 ? 2 : 3) : 4);
            const sidePad = 8, basePadY = 8, gap = (game.loadoutTab === 1 ? 8 : 6);
            const eHH = (game.loadoutTab === 1 ? 34 : game.loadoutTab === 0 ? 30 : 0);
            const padY = basePadY + eHH;
            const cellW = Math.floor((LW - sidePad * 2 - gap * (COLS - 1)) / COLS);
            const cellH = Math.min(cellW, (game.loadoutTab === 1 ? 80 : 72));
            const visRows = Math.max(1, Math.floor((LH - padY - basePadY - 24) / (cellH + gap)));
            const curRow = Math.floor(cur2 / COLS);
            const startRow = Math.max(0, Math.min(curRow - Math.floor(visRows / 2), Math.ceil(pool2.length / COLS) - visRows));
            const col2 = Math.floor((lmx - LX - sidePad) / (cellW + gap));
            const row2 = Math.floor((lmy - LY - padY) / (cellH + gap));
            if (col2 >= 0 && col2 < COLS && row2 >= 0 && row2 < visRows) {
              const idx2 = (startRow + row2) * COLS + col2;
              if (idx2 >= 0 && idx2 < pool2.length) {
                game.loadoutLongPressOverlay = { item: pool2[idx2] };
              }
            }
          }
        }
        _longPressTimer = null;
      }, 500);
    }
    game.titlePointerX = mx; game.titlePointerY = my;
    if (game.state === 'playing' && !game.paused) {
      game.joystick = { active: true, baseX: mx, baseY: my, dx: 0, dy: 0 };
      game.touchPos = null;
    } else {
      game.touchPos = { x: mx, y: my };
    }
    const btns = UI_BUTTONS[game.state] || [];
    const th0 = btns.find(b => mx >= b.x && mx <= b.x + b.w && my >= b.y && my <= b.y + b.h) || null;
    game.hoveredBtn = th0;
    if (game.state === 'title') {
      game.titleTapHovered = !th0 && isTitleTapLabelHovered(mx, my);
    } else {
      game.titleTapHovered = false;
    }
  },
  onTouchMove(e) {
    const t = e.changedTouches[0];
    _lastTouchClientX = t.clientX; _lastTouchClientY = t.clientY;
    const { x: mx, y: my } = _getTouchPos(t);
    const totalDx = mx - _touchStartCanvasX;
    const totalDy = my - _touchStartCanvasY;
    const stepDx = mx - _touchLastCanvasX;
    const stepDy = my - _touchLastCanvasY;
    if (game.state === 'playing' && !game.paused && game.joystick?.active) {
      const JR = 65;
      const rdx = mx - game.joystick.baseX, rdy = my - game.joystick.baseY;
      const dist = Math.sqrt(rdx * rdx + rdy * rdy);
      if (dist > JR) { game.joystick.dx = rdx / dist * JR; game.joystick.dy = rdy / dist * JR; }
      else { game.joystick.dx = rdx; game.joystick.dy = rdy; }
      _touchLastCanvasY = my;
      game.titlePointerX = mx; game.titlePointerY = my;
      return;
    }
    // F: スワイプ閾値を超えたらスクロールモード（縦/横どちらでもOK）
    if (Math.abs(totalDy) > 12 || Math.abs(totalDx) > 12) {
      _touchIsDrag = true;
      if (_longPressTimer) { clearTimeout(_longPressTimer); _longPressTimer = null; }
    }
    if (_touchIsDrag) {
      game.touchPos = null; // スクロール中はプレイヤー追従しない
      // ⑭ ロードアウト: 右パネル横スワイプでタブ切替
      if (game.state === 'loadout' && Math.abs(totalDx) > 40 && Math.abs(totalDy) < 40) {
        const W = canvas.width, H = canvas.height;
        const PX = 4, PW = 290, PY = 50;
        const LX = PX + PW + 6, LY = PY, LW = W - LX - 4, LH = H - PY - 48;
        if (_touchStartCanvasX >= LX && _touchStartCanvasX <= LX + LW &&
            _touchStartCanvasY >= LY && _touchStartCanvasY <= LY + LH) {
          const swipedLeft = totalDx < 0;
          const newTab = swipedLeft ? Math.min(3, game.loadoutTab + 1) : Math.max(0, game.loadoutTab - 1);
          if (newTab !== game.loadoutTab) {
            game.loadoutTab = newTab; game.loadoutCursor = 0;
            game.loadoutSelAnimFrame = game.frameCount; game.loadoutSelAnimDir = swipedLeft ? 1 : -1;
            if (game.loadoutUpgradeOverlay) game.loadoutUpgradeOverlay.open = false;
            if (game.petUpgradePanel) game.petUpgradePanel.open = false;
            _touchIsDrag = true; // 確実にクリックを抑制
          }
        }
      }
      // F: ミッション画面スクロール
      if (game.state === 'missions' && game.missionsTab === 'track') {
        game.missionsScrollY = Math.max(0, (game.missionsScrollY || 0) - stepDy);
      }
      // 融合画面スクロール
      if (game.state === 'fusion') {
        game.fusionScrollY = Math.max(0, (game.fusionScrollY || 0) - stepDy);
      }
      // F: ステージ選択マップスクロール
      if (game.state === 'stage_select' && !isStageSelectOverlayBlockingCanvasPointer()) {
        // cap は描画側で正確に計算する（ここではざっくり進める）
        const cap = Number.isFinite(game._stageSelectMapMaxScroll) ? game._stageSelectMapMaxScroll : 1200;
        game.stageMapScrollOffset = Math.max(0, Math.min(cap, (game.stageMapScrollOffset || 0) - stepDy));
      }
      // shop: ツリー（UPGRADE）スクロール / hex pan
      if (game.state === 'shop' && game.shopTab === 0) {
        shopHexPan(-stepDx, -stepDy);
      }
      // F: 融合タブリストスクロール
      if (game.state === 'shop' && game.shopTab === 2) {
        const rowH = 52;
        if (stepDy < -rowH * 0.5) { game.fusionCursor++; }
        else if (stepDy > rowH * 0.5) { game.fusionCursor = Math.max(0, game.fusionCursor - 1); }
      }
    } else {
      game.touchPos = { x: mx, y: my };
    }
    _touchLastCanvasX = mx;
    _touchLastCanvasY = my;
    game.titlePointerX = mx; game.titlePointerY = my;
    const btns = UI_BUTTONS[game.state] || [];
    const th = btns.find(b => mx >= b.x && mx <= b.x + b.w && my >= b.y && my <= b.y + b.h) || null;
    game.hoveredBtn = th;
    if (game.state === 'title') {
      game.titleTapHovered = !th && isTitleTapLabelHovered(mx, my);
    } else {
      game.titleTapHovered = false;
    }
  },
  onTouchEnd(e) {
    if (_longPressTimer) { clearTimeout(_longPressTimer); _longPressTimer = null; }
    const wasJoystickActive = game.joystick?.active;
    game.touchPos = null;
    game.hoveredBtn = null;
    game.titleTapHovered = false;
    if (game.joystick) game.joystick = { active: false, baseX: 0, baseY: 0, dx: 0, dy: 0 };
    // F: ドラッグ中・ジョイスティック使用中はタップ判定しない
    const moved = wasJoystickActive && (Math.abs(game.joystick?.dx || 0) > 8 || Math.abs(game.joystick?.dy || 0) > 8);
    if (!_touchIsDrag && !moved && Date.now() - _touchStartTime < 250) {
      if (game.state === 'stage_select' && isStageSelectOverlayBlockingCanvasPointer()) {
        /* HTML オーバーレイがタッチを受ける */
      } else {
      canvas.dispatchEvent(new MouseEvent('click', {
        clientX: _lastTouchClientX, clientY: _lastTouchClientY,
        bubbles: true, cancelable: true
      }));
      }
    } else if (_touchIsDrag && game.state === 'stage_select' && !isStageSelectOverlayBlockingCanvasPointer()) {
      // スナップ（ノード単位で止まる）
      game._stageSelectMapSnapAt = Date.now() + 10;
    }
  },
});
}
