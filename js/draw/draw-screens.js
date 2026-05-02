/**
 * Screen drawing functions separated from main.js
 * Contains all draw*Screen functions
 */

import { game } from '../game/game-store.js';
import { CANVAS_W as W, CANVAS_H as H } from '../game/constants.js';
import {
  ALL_GACHA_POOL,
  CHAR_POOL,
  EQUIP_POOL,
  MAT_COLOR,
  MISSION_POOL,
  NORMAL_QUEST_POOL,
  PET_POOL,
  RARITY_COLORS,
  LR_RAINBOW,
  getLRColor,
  appendColorAlpha,
  SHOP_ITEMS,
  SHOP_MAX_LV,
  STAGE_TYPE_COLORS,
  STAGE_TYPE_DESCS,
  STAGE_TYPE_LABELS,
  WEAPON_GACHA_POOL,
  currentPickupId,
} from '../game-data.js';
import { drawShopHex } from '../game/draw-shop-hex.js';

// Draw dependencies will be passed from main.js
let drawDeps;
let ctx;
let BOSS_SELECT_DATA;
let IAP_PACKAGES;
let NOTICES;
let STARDUST_SHOP_ITEMS;
let applyLevelToAtkMult;
let applyLevelToStatAdd;
let buildEquipPool;
let canDailyGacha;
let canPetUpgrade;
let computeZukanGridMetrics;
let computeStageStarMedal;
let drawBossCardSprite;
let drawCoinInlineIcon;
let drawCustomizeNeonBrackets;
let drawEquipShape;
let drawGachaAuxInfoStrip;
let drawGachaInsufficientModal;
let drawGachaItemIcon;
let drawGachaLeftColumn;
let drawGemInlineIcon;
let drawPetShape;
let drawShipShape;
let gachaTypeLabelJp;
let ensureDailyMissions;
let ensureNormalQuestProfile;
let estimateSortieWinPct;
let fillRoundHex;
let formatStageId;
let getCustomizeLayout;
let getEquipMainEffectText;
let getGachaAuxStripLayout;
let getGachaZukanFilterPools;
let getLevelUpCost;
let getPetParams;
let getPetUpgradeCost;
let getPlanet;
let getUpgradeLvCost;
let getWorldInfo;
let hexToRgb;
let missionEffectiveProgress;
let pickCharShipShape;
let readWeeklyLocalBoard;
let stageSelectFuelLaunchOk;
let syncFuel;
let truncateLine;
let upgradeBonusNowNext;
let wrapFillJp;
let playSound;

const GATE_OPEN = 60, GATE_WARPOUT = 50, GATE_FADEIN = 40;
function gateStall(r) { return r === 'LR' ? 180 : r === 'SSR' ? 110 : r === 'SR' ? 55 : 14; }
function gateTotal(r) { return GATE_OPEN + gateStall(r) + GATE_WARPOUT + GATE_FADEIN; }

export function setDrawDependencies(deps) {
  drawDeps = deps;
  ctx = deps.ctx;
  ({
    BOSS_SELECT_DATA,
    IAP_PACKAGES,
    NOTICES,
    STARDUST_SHOP_ITEMS,
    applyLevelToAtkMult,
    applyLevelToStatAdd,
    buildEquipPool,
    canDailyGacha,
    canPetUpgrade,
    computeZukanGridMetrics,
    computeStageStarMedal,
    drawBossCardSprite,
    drawCoinInlineIcon,
    drawCustomizeNeonBrackets,
    drawEquipShape,
    drawGachaAuxInfoStrip,
    drawGachaInsufficientModal,
    drawGachaItemIcon,
    drawGachaLeftColumn,
    drawGemInlineIcon,
    drawPetShape,
    drawShipShape,
    gachaTypeLabelJp,
    ensureDailyMissions,
    ensureNormalQuestProfile,
    estimateSortieWinPct,
    fillRoundHex,
    formatStageId,
    getCustomizeLayout,
    getEquipMainEffectText,
    getGachaAuxStripLayout,
    getGachaZukanFilterPools,
    getLevelUpCost,
    getPetParams,
    getPetUpgradeCost,
    getPlanet,
    getUpgradeLvCost,
    getWorldInfo,
    hexToRgb,
    missionEffectiveProgress,
    pickCharShipShape,
    readWeeklyLocalBoard,
    stageSelectFuelLaunchOk,
    syncFuel,
    truncateLine,
    upgradeBonusNowNext,
    wrapFillJp,
    playSound,
  } = deps);
}

export function drawUpgradeScreen() {
  const ctx = drawDeps.ctx;
  ctx.fillStyle = 'rgba(0,0,0,0.85)'; ctx.fillRect(0, 0, W, H);
  // ランクバッジ
  if (game.stageRank) {
    const rcol = { S: '#ff0', A: '#0f0', B: '#0cf', C: '#aaa' }[game.stageRank];
    ctx.shadowColor = rcol; ctx.shadowBlur = 30;
    ctx.fillStyle = rcol; ctx.font = 'bold 72px Orbitron,Courier New'; ctx.textAlign = 'right';
    ctx.fillText(game.stageRank, W - 40, 100); ctx.shadowBlur = 0;
    ctx.fillStyle = rcol; ctx.font = '11px Orbitron,Courier New';
    ctx.fillText(`HIT:${game.stageStats.hits}  COMBO:${game.stageStats.maxCombo}`, W - 40, 115);
  }
  ctx.fillStyle = '#fff'; ctx.font = 'bold 28px Orbitron,Courier New'; ctx.textAlign = 'center';
  ctx.shadowColor = '#ff0'; ctx.shadowBlur = 20;
  ctx.fillText('UPGRADE  SELECT', W / 2, 80); ctx.shadowBlur = 0;
  ctx.font = '14px Orbitron,Courier New'; ctx.fillStyle = '#aaa';
  ctx.fillText('1 / 2 / 3 キーで選択', W / 2, 115);
  game.upgradeChoices.forEach((up, i) => {
    const x = 80 + i * 230, y = 160, w = 200, h = 260;
    ctx.fillStyle = 'rgba(10,10,30,0.9)'; ctx.strokeStyle = up.color; ctx.lineWidth = 2;
    ctx.shadowColor = up.color; ctx.shadowBlur = 15;
    ctx.beginPath(); ctx.roundRect(x, y, w, h, 12); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;
    ctx.fillStyle = up.color; ctx.font = 'bold 36px Orbitron,Courier New'; ctx.textAlign = 'center';
    ctx.fillText(`${i + 1}`, x + w / 2, y + 52);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 14px Orbitron,Courier New';
    ctx.fillText(up.label, x + w / 2, y + 96);
    ctx.fillStyle = '#aaa'; ctx.font = '12px Orbitron,Courier New';
    const words = up.desc; let line = '', ly = y + 126;
    for (const ch of words) {
      if (ctx.measureText(line + ch).width > w - 20) { ctx.fillText(line, x + w / 2, ly); line = ch; ly += 20; }
      else line += ch;
    }
    if (line) ctx.fillText(line, x + w / 2, ly);
  });
  ctx.textAlign = 'left'; ctx.lineWidth = 1;
}

export function drawStageSelectScreen() {
  const ctx = drawDeps.ctx;
  const selStage = game.stageSelectIdx + 1;
  const world = getWorldInfo(selStage);
  const PANEL_X = 478;
  const localInWorld = ((selStage - 1) % 10) + 1;
  const isMidBossStage = (localInWorld === 5);
  const isBossStage = (localInWorld === 10);
  const isAppliedStage = (localInWorld >= 6 && localInWorld <= 9);
  const isNormalStage = (localInWorld >= 1 && localInWorld <= 4);
  let customRightPanel = false;

  syncFuel();
  game._stageSelectLaunchFuelBlocked = (selStage <= game.highestStage) && !stageSelectFuelLaunchOk();

  ctx.fillStyle = world.bg; ctx.fillRect(0, 0, W, H);
  drawDeps.drawStarfield();
  drawDeps.drawWorldBgObjects(world.num);
  // 深み（火星感）：赤い霧グラデ＋薄い惑星（ぼかし風）
  {
    const fog = ctx.createRadialGradient(240, 240, 80, 240, 240, 520);
    fog.addColorStop(0, 'rgba(255,60,30,0.08)');
    fog.addColorStop(0.55, 'rgba(180,30,10,0.04)');
    fog.addColorStop(1, 'transparent');
    ctx.fillStyle = fog; ctx.fillRect(0, 0, W, H);
    // 薄い惑星（左上）
    ctx.save();
    ctx.globalAlpha = 0.10;
    const px2 = 120, py2 = 120, pr2 = 86;
    const pg = ctx.createRadialGradient(px2 - 20, py2 - 20, 10, px2, py2, pr2);
    pg.addColorStop(0, 'rgba(255,120,80,0.25)');
    pg.addColorStop(1, 'rgba(40,10,8,0.0)');
    ctx.fillStyle = pg;
    ctx.beginPath(); ctx.arc(px2, py2, pr2, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  // MID BOSS: 画面全体をわずかに暗くする（イベント戦の重み）
  if (isMidBossStage) {
    ctx.fillStyle = 'rgba(0,0,0,0.16)';
    ctx.fillRect(0, 0, W, H);
  }

  // 右パネル連動：0.1秒遅れてフェードイン（操作感）
  if (game._lastStageSelectIdx !== game.stageSelectIdx) {
    game._lastStageSelectIdx = game.stageSelectIdx;
    game.stageSelectPanelFxAt = game.frameCount;
  }
  const panelFxAt = Number.isFinite(game.stageSelectPanelFxAt) ? game.stageSelectPanelFxAt : -999;
  const panelDelay = 6; // ~0.1秒
  const panelT = Math.max(0, Math.min(1, (game.frameCount - (panelFxAt + panelDelay)) / 10));
  const panelAlpha = 0.86 + 0.14 * panelT;

  // ===== 右側情報パネル =====
  ctx.save();
  ctx.globalAlpha = panelAlpha;
  ctx.fillStyle = 'rgba(0,0,0,0.78)'; ctx.strokeStyle = world.accent + '44'; ctx.lineWidth = 1;
  const panelY = 8;
  const panelH = Math.max(340, H - 16);
  ctx.beginPath(); ctx.roundRect(PANEL_X + 2, panelY, 316, panelH, 8); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = world.accent + '30'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(PANEL_X, 0); ctx.lineTo(PANEL_X, H); ctx.stroke();

  const px = PANEL_X + 158;

  // ===== 右パネル：情報構造（統一）=====
  // 1) ステージ番号を最優先（最大） 2) 惑星名はサブ 3) MID/BOSS はタグ化
  const stageId = formatStageId(selStage);
  const RX = PANEL_X + 16, RW = 288;
  const headerTop = 44;

  // 惑星名（小さく）
  ctx.fillStyle = 'rgba(200,220,255,0.55)';
  ctx.font = 'bold 10px Orbitron,Courier New';
  ctx.textAlign = 'center';
  ctx.fillText(world.name, px, headerTop + 18);

  // ステージ番号（最大）
  // 視線誘導：+15%（強く）。にじみ防止でグローは少し抑える
  ctx.shadowColor = world.accent; ctx.shadowBlur = 16;
  ctx.fillStyle = world.accent;
  ctx.font = 'bold 72px Orbitron,Courier New';
  ctx.fillText(stageId, px, headerTop + 76);
  ctx.shadowBlur = 0;

  // タグ（MID BOSS / WARNING BOSS）
  if (isMidBossStage || isBossStage) {
    const blink = isBossStage ? (0.70 + 0.30 * Math.sin((Date.now() / 1000) * (Math.PI * 2 / 0.8))) : 1;
    const tagTxt = isBossStage ? '⚠ WARNING BOSS' : 'MID BOSS';
    const tagCol = isBossStage ? `rgba(255,80,60,${0.95 * blink})` : 'rgba(255,160,80,0.92)';
    ctx.fillStyle = isBossStage ? `rgba(255,80,60,${0.16 * blink})` : 'rgba(255,160,80,0.14)';
    ctx.strokeStyle = isBossStage ? `rgba(255,80,60,${0.28 * blink})` : 'rgba(255,160,80,0.24)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(RX + 72, headerTop + 82, 144, 20, 10); ctx.fill(); ctx.stroke();
    ctx.fillStyle = tagCol;
    ctx.font = 'bold 11px Orbitron,Courier New';
    ctx.fillText(tagTxt, px, headerTop + 97);
  }
  ctx.textAlign = 'left';

  // セパレーター
  ctx.fillStyle = world.accent + '22'; ctx.fillRect(PANEL_X + 18, headerTop + 120, 300, 1);

  // 中間ボス/ボス情報（1-5 / 1-10 のときだけ表示）
  if (isMidBossStage) {
    customRightPanel = true;
    // ===== MID BOSS 右パネル（指定レイアウト）=====
    const RX = PANEL_X + 16, RW = 288;
    const topY = 170;
    const t = Date.now() / 1000;
    const pulse = 0.65 + 0.35 * Math.sin(game.frameCount * 0.08);
    const zoom = 1.03 + 0.02 * Math.sin(t * 0.65);
    const teleportBlink = 0.55 + 0.45 * Math.sin((t) * (Math.PI * 2 / 0.8));
    // 画像
    const bossImg = drawDeps.getImage('./assets/midboss_mars_sentinel.png');
    const imgX = RX, imgY = topY, imgW = RW, imgH = 178;
    // カード化＋背景にぼかしオーバーレイ
    ctx.fillStyle = 'rgba(6,8,18,0.70)';
    ctx.strokeStyle = 'rgba(255,70,50,0.45)';
    ctx.lineWidth = 1.6;
    ctx.shadowColor = 'rgba(255,70,50,0.55)'; ctx.shadowBlur = 10 + 10 * pulse;
    ctx.beginPath(); ctx.roundRect(imgX, imgY, imgW, imgH, 12); ctx.fill(); ctx.stroke();
    ctx.shadowBlur = 0;
    if (bossImg.complete && bossImg.naturalWidth > 0) {
      const sw = bossImg.naturalWidth, sh = bossImg.naturalHeight;
      // cover（ズームアニメ）
      const sc = Math.max(imgW / sw, imgH / sh) * zoom;
      const cw = Math.floor(imgW / sc), ch = Math.floor(imgH / sc);
      const sx = Math.floor((sw - cw) / 2), sy = Math.floor((sh - ch) / 2);
      // ぼかし背景
      ctx.save();
      ctx.beginPath(); ctx.roundRect(imgX, imgY, imgW, imgH, 12); ctx.clip();
      ctx.filter = 'blur(6px)';
      ctx.globalAlpha = 0.55;
      ctx.drawImage(bossImg, sx, sy, cw, ch, imgX, imgY, imgW, imgH);
      ctx.filter = 'none';
      ctx.globalAlpha = 1;
      // 前景（シャープ）
      ctx.drawImage(bossImg, sx, sy, cw, ch, imgX, imgY, imgW, imgH);
      // 画像周辺に赤いグロー＋パルス
      const glow = ctx.createRadialGradient(imgX + imgW * 0.55, imgY + imgH * 0.45, 20, imgX + imgW * 0.55, imgY + imgH * 0.45, Math.max(imgW, imgH) * 0.65);
      glow.addColorStop(0, `rgba(255,70,50,${0.18 + 0.10 * pulse})`);
      glow.addColorStop(1, 'transparent');
      ctx.fillStyle = glow;
      ctx.fillRect(imgX, imgY, imgW, imgH);
      // 下に暗グラデ
      const gg = ctx.createLinearGradient(0, imgY, 0, imgY + imgH);
      gg.addColorStop(0, 'transparent');
      gg.addColorStop(1, 'rgba(0,0,0,0.45)');
      ctx.fillStyle = gg; ctx.fillRect(imgX, imgY, imgW, imgH);
      ctx.restore();
    }
    game._stageSelectBossCardHit = { x: imgX, y: imgY, w: imgW, h: imgH, src: './assets/midboss_mars_sentinel.png', title: 'MID BOSS' };

    // 能力（中央軸） + 特徴タグ（ピル）
    let y = imgY + imgH + 28;
    ctx.fillStyle = `rgba(255,160,140,${0.78 + 0.22 * teleportBlink})`;
    ctx.font = 'bold 18px Orbitron,Courier New';
    ctx.fillText('TELEPORT', RX + 10, y);
    y += 22;
    // タグ化（アイコン＋短文）
    const pills = [
      { txt: '🌀 ワープ攻撃', col: 'rgba(255,190,120,0.92)' },
      { txt: '👥 分身', col: 'rgba(255,190,120,0.92)' },
    ];
    let px0 = RX + 10;
    pills.forEach(p => {
      const w = Math.min(170, Math.ceil(ctx.measureText(p.txt).width + 26));
      ctx.fillStyle = 'rgba(255,160,80,0.14)';
      ctx.strokeStyle = 'rgba(255,160,80,0.22)';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.roundRect(px0, y - 14, w, 22, 11); ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(255,230,190,0.92)';
      ctx.font = 'bold 11px Orbitron,Courier New';
      ctx.fillText(p.txt, px0 + 12, y + 2);
      px0 += w + 10;
    });

    // 推奨戦力 / 報酬
    y += 34;
    ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(RX, y, RW, 1);
    y += 24;
    const recPower = Math.max(80, selStage * 120);
    const coinMin = 80 + selStage * 8;
    const coinMax = coinMin + 39;
    const gemBase = 3 + Math.floor(selStage / 5);
    // 推奨（強調）
    ctx.fillStyle = 'rgba(255,220,120,0.95)'; ctx.font = 'bold 13px Orbitron,Courier New';
    ctx.shadowColor = 'rgba(255,200,80,0.65)'; ctx.shadowBlur = 8;
    ctx.fillText(`推奨 ⚡ ${recPower}`, RX + 10, y);
    ctx.shadowBlur = 0;
    y += 22;
    // 報酬：コイン/ジェム優先、素材は小さく
    ctx.fillStyle = 'rgba(255,120,60,0.14)';
    ctx.strokeStyle = 'rgba(255,120,60,0.24)';
    ctx.beginPath(); ctx.roundRect(RX, y - 14, RW, 42, 10); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,210,190,0.92)'; ctx.font = 'bold 11px Orbitron,Courier New';
    ctx.fillText('報酬', RX + 10, y);
    ctx.fillStyle = 'rgba(255,235,190,0.95)'; ctx.font = 'bold 12px Orbitron,Courier New';
    ctx.fillText(`💰 +${coinMin}〜${coinMax}   💎${gemBase}`, RX + 58, y);
    ctx.fillStyle = 'rgba(255,235,190,0.62)'; ctx.font = 'bold 10px Orbitron,Courier New';
    ctx.fillText('🔧×2', RX + 214, y);

    // 出現する敵
    y += 26;
    ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(RX, y, RW, 1);
    y += 22;
    ctx.fillStyle = 'rgba(255,150,130,0.90)'; ctx.font = 'bold 12px Orbitron,Courier New';
    ctx.fillText('敵', RX + 10, y);
    y += 26;
    const types = drawDeps.getStageEnemyTypes(selStage);
    const iconSize = 20, gap = 32;
    const startX = RX + 18;
    types.slice(0, 6).forEach((t, i) => {
      const ex = startX + i * gap, ey = y;
      const tc = drawDeps.ENEMY_PREVIEW_COLORS[t] || '#aaa';
      ctx.save(); ctx.translate(ex, ey);
      ctx.shadowColor = tc; ctx.shadowBlur = 8; ctx.fillStyle = tc;
      drawDeps.drawEnemyPreviewIcon(ctx, t, iconSize);
      ctx.restore();
    });

    // 下部：FUEL + 出撃ボタン（少し小さめ + hoverで強発光）
    const bx = RX, bw = RW, bh = 74;
    const by = Math.min(520, (H - Math.max(12, Math.round(H * 0.03))) - bh);
    const fuelY = by - 10;
    syncFuel();
    const fuelHave = Math.max(0, Math.floor(game.fuel || 0));
    ctx.fillStyle = 'rgba(10,16,34,0.80)';
    ctx.strokeStyle = 'rgba(255,80,60,0.25)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(bx, fuelY - 12, bw, 18, 6); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,210,200,0.92)';
    ctx.font = 'bold 12px Orbitron,Courier New'; ctx.textAlign = 'left';
    ctx.fillText(`FUEL  ${fuelHave}/${drawDeps.FUEL_CAP}`, bx + 10, fuelY);

    const fuelBl = !!game._stageSelectLaunchFuelBlocked;
    const hov = game.hoveredBtn && game.hoveredBtn.id === 'ss_launch' && !fuelBl;
    const s = hov ? 1.03 : 1;
    ctx.save();
    ctx.translate(bx + bw / 2, by + bh / 2); ctx.scale(s, s); ctx.translate(-(bx + bw / 2), -(by + bh / 2));
    const g = ctx.createLinearGradient(0, by, 0, by + bh);
    const blink = 0.84 + 0.16 * Math.sin((Date.now() / 1000) * (Math.PI * 2 / 0.8));
    g.addColorStop(0, `rgba(255,70,40,${0.95 * blink})`);
    g.addColorStop(1, `rgba(255,150,60,${0.95 * blink})`);
    ctx.globalAlpha = fuelBl ? 0.48 : 1;
    ctx.fillStyle = g;
    ctx.strokeStyle = fuelBl ? 'rgba(110,95,90,0.55)' : 'rgba(255,200,120,0.85)';
    ctx.lineWidth = 2.4;
    if (fuelBl) ctx.setLineDash([4, 3]); else ctx.setLineDash([]);
    ctx.shadowColor = fuelBl ? 'transparent' : 'rgba(255,120,60,0.85)';
    ctx.shadowBlur = fuelBl ? 0 : ((hov ? 30 : 22) * blink);
    ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 16); ctx.fill(); ctx.stroke();
    ctx.setLineDash([]);
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
    ctx.fillStyle = fuelBl ? 'rgba(255,210,200,0.90)' : 'rgba(255,255,255,0.92)';
    ctx.font = fuelBl ? 'bold 14px Orbitron,Courier New' : 'bold 22px Orbitron,Courier New'; ctx.textAlign = 'center';
    if (fuelBl) ctx.fillText('燃料が足りません', bx + bw / 2, by + bh / 2 + 8);
    else ctx.fillText('▶ 出撃', bx + bw / 2, by + bh / 2 + 8);
    ctx.restore();

    game._stageSelectLaunchHit = { x: bx, y: by, w: bw, h: bh };
    ctx.textAlign = 'left';
  }
  else if (isBossStage) {
    customRightPanel = true;
    // ===== FINAL BOSS 右パネル（指定レイアウト）=====
    const RX = PANEL_X + 16, RW = 288;
    const topY = 170;

    // ボス画像（中央軸）
    const bossImg = drawDeps.getImage('./assets/boss_burst.png');
    const imgX = RX, imgY = topY, imgW = RW, imgH = 178;
    ctx.fillStyle = 'rgba(6,8,18,0.70)';
    ctx.strokeStyle = 'rgba(255,70,50,0.45)';
    ctx.lineWidth = 1.6;
    ctx.shadowColor = 'rgba(255,70,50,0.55)'; ctx.shadowBlur = 14;
    ctx.beginPath(); ctx.roundRect(imgX, imgY, imgW, imgH, 12); ctx.fill(); ctx.stroke();
    ctx.shadowBlur = 0;
    if (bossImg.complete && bossImg.naturalWidth > 0) {
      const sw = bossImg.naturalWidth, sh = bossImg.naturalHeight;
      const sc = Math.max(imgW / sw, imgH / sh);
      const cw = Math.floor(imgW / sc), ch = Math.floor(imgH / sc);
      const sx = Math.floor((sw - cw) / 2), sy = Math.floor((sh - ch) / 2);
      ctx.save();
      ctx.beginPath(); ctx.roundRect(imgX, imgY, imgW, imgH, 12); ctx.clip();
      ctx.drawImage(bossImg, sx, sy, cw, ch, imgX, imgY, imgW, imgH);
      const gg = ctx.createLinearGradient(0, imgY, 0, imgY + imgH);
      gg.addColorStop(0, 'transparent');
      gg.addColorStop(1, 'rgba(0,0,0,0.55)');
      ctx.fillStyle = gg; ctx.fillRect(imgX, imgY, imgW, imgH);
      ctx.restore();
    }
    game._stageSelectBossCardHit = { x: imgX, y: imgY, w: imgW, h: imgH, src: './assets/boss_burst.png', title: 'WARNING' };

    // コア名
    let y = imgY + imgH + 28;
    ctx.fillStyle = 'rgba(255,160,140,0.92)';
    ctx.font = 'bold 18px Orbitron,Courier New';
    ctx.fillText('BURST CORE', RX + 10, y);

    // 攻撃（タグ形式）
    y += 22;
    const atkPills = ['全方位弾幕', 'レーザー', '追尾'];
    let ax = RX + 10;
    atkPills.forEach(txt => {
      const w = Math.min(170, Math.ceil(ctx.measureText(txt).width + 24));
      ctx.fillStyle = 'rgba(255,80,60,0.14)';
      ctx.strokeStyle = 'rgba(255,80,60,0.22)';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.roundRect(ax, y - 14, w, 22, 11); ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(255,230,220,0.92)';
      ctx.font = 'bold 11px Orbitron,Courier New';
      ctx.fillText(txt, ax + 12, y + 2);
      ax += w + 10;
    });

    // 推奨戦力
    y += 34;
    ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(RX, y, RW, 1);
    y += 24;
    const recPower = Math.max(80, selStage * 120);
    ctx.fillStyle = 'rgba(255,180,160,0.92)';
    ctx.font = 'bold 13px Orbitron,Courier New';
    ctx.fillText(`推奨 ⚡ ${recPower}`, RX + 10, y);

    // 報酬（強調）
    y += 22;
    ctx.fillStyle = 'rgba(255,80,60,0.16)';
    ctx.strokeStyle = 'rgba(255,80,60,0.25)';
    ctx.beginPath(); ctx.roundRect(RX, y - 14, RW, 42, 10); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,210,190,0.92)'; ctx.font = 'bold 11px Orbitron,Courier New';
    ctx.fillText('報酬', RX + 10, y);
    ctx.fillStyle = 'rgba(255,235,190,0.95)'; ctx.font = 'bold 13px Orbitron,Courier New';
    ctx.fillText('💰 +500   💎10', RX + 58, y);
    ctx.fillStyle = 'rgba(255,235,190,0.62)'; ctx.font = 'bold 10px Orbitron,Courier New';
    ctx.fillText('SSR確定', RX + 210, y);

    // 下部：FUEL + 出撃ボタン（最大サイズ＋点滅）
    const bx = RX, bw = RW, bh = 78;
    const by = Math.min(520, (H - Math.max(12, Math.round(H * 0.03))) - bh);
    const fuelY = by - 10;
    syncFuel();
    const fuelHave = Math.max(0, Math.floor(game.fuel || 0));
    ctx.fillStyle = 'rgba(10,16,34,0.80)';
    ctx.strokeStyle = 'rgba(255,80,60,0.25)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(bx, fuelY - 12, bw, 18, 6); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,210,200,0.92)';
    ctx.font = 'bold 12px Orbitron,Courier New'; ctx.textAlign = 'left';
    ctx.fillText(`FUEL  ${fuelHave}/${drawDeps.FUEL_CAP}`, bx + 10, fuelY);

    const fuelBl = !!game._stageSelectLaunchFuelBlocked;
    const hov = game.hoveredBtn && game.hoveredBtn.id === 'ss_launch' && !fuelBl;
    const blink = 0.70 + 0.30 * Math.sin((Date.now() / 1000) * (Math.PI * 2 / 0.8));
    const s = (hov ? 1.03 : 1) * (0.98 + 0.02 * blink);
    ctx.save();
    ctx.translate(bx + bw / 2, by + bh / 2); ctx.scale(s, s); ctx.translate(-(bx + bw / 2), -(by + bh / 2));
    const g = ctx.createLinearGradient(0, by, 0, by + bh);
    g.addColorStop(0, `rgba(255,50,40,${0.95 * blink})`);
    g.addColorStop(1, `rgba(255,140,60,${0.95 * blink})`);
    ctx.globalAlpha = fuelBl ? 0.48 : 1;
    ctx.fillStyle = g;
    ctx.strokeStyle = fuelBl ? 'rgba(110,95,90,0.55)' : 'rgba(255,210,190,0.90)';
    ctx.lineWidth = 2.4;
    if (fuelBl) ctx.setLineDash([4, 3]); else ctx.setLineDash([]);
    ctx.shadowColor = fuelBl ? 'transparent' : 'rgba(255,70,50,0.85)';
    ctx.shadowBlur = fuelBl ? 0 : ((hov ? 30 : 24) * blink);
    ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 16); ctx.fill(); ctx.stroke();
    ctx.setLineDash([]);
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
    ctx.fillStyle = fuelBl ? 'rgba(255,210,200,0.90)' : 'rgba(255,255,255,0.95)';
    ctx.font = fuelBl ? 'bold 14px Orbitron,Courier New' : 'bold 22px Orbitron,Courier New'; ctx.textAlign = 'center';
    if (fuelBl) ctx.fillText('燃料が足りません', bx + bw / 2, by + bh / 2 + 8);
    else ctx.fillText('▶ 出撃', bx + bw / 2, by + bh / 2 + 8);
    ctx.restore();

    game._stageSelectLaunchHit = { x: bx, y: by, w: bw, h: bh };
    ctx.textAlign = 'left';
  }
  else {
    // ボスカードが無いステージはヒット領域をクリア
    game._stageSelectBossCardHit = null;
  }

  // 応用ステージの小ラベル（右パネル）
  if (isAppliedStage) {
    ctx.fillStyle = 'rgba(255,160,80,0.18)';
    ctx.strokeStyle = 'rgba(255,160,80,0.25)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(PANEL_X + 20, 184, 86, 18, 6); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,200,140,0.88)';
    ctx.font = 'bold 10px Orbitron,Courier New'; ctx.textAlign = 'center';
    ctx.fillText('応用ステージ', PANEL_X + 63, 197);
    ctx.textAlign = 'left';
  }

  // MID BOSS は右パネルを専用描画したので、以降の汎用ブロックはスキップ
  if (customRightPanel) {
    // 左マップ描画へ進む（右パネルの汎用要素は描画しない）
  } else {

    // ===== 通常/応用ステージ（1-1〜1-4, 1-6〜1-9）：高速選択UI =====
    if (isNormalStage || isAppliedStage) {
      const isLocked = selStage > game.highestStage;
      const recPower = Math.max(80, selStage * 120);
      const coinMin = 80 + selStage * 8;
      const coinMax = coinMin + 39;
      const gemBase = 3 + Math.floor(selStage / 5);
      const pName = getPlanet(selStage).name;
      const matStr = pName === 'SATURN' ? '💠×2  🔩×3'
        : pName === 'JUPITER' ? '💠×1  🔩×3'
          : '⚡×2  🔩×3';

      // 状態（サブ情報・読みやすく）
      ctx.fillStyle = 'rgba(210,230,255,0.52)';
      ctx.font = 'bold 13px Orbitron,Courier New';
      ctx.textAlign = 'center';
      if (isLocked) {
        ctx.font = 'bold 11px Orbitron,Courier New';
        const lt = '🔒 未解放';
        const tw = ctx.measureText(lt).width;
        const badgeW = 36, gapB = 6;
        const totalW = badgeW + gapB + tw;
        const startX = px - totalW / 2;
        ctx.fillStyle = 'rgba(36,40,54,0.92)';
        ctx.strokeStyle = 'rgba(210,220,240,0.55)';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.roundRect(startX, 168, badgeW, 22, 4); ctx.fill(); ctx.stroke();
        ctx.fillStyle = 'rgba(235,240,250,0.92)';
        ctx.font = 'bold 9px Orbitron,Courier New'; ctx.textAlign = 'center';
        ctx.fillText('LOCK', startX + badgeW / 2, 183);
        ctx.font = 'bold 13px Orbitron,Courier New';
        ctx.fillStyle = 'rgba(210,230,255,0.46)';
        ctx.fillText(lt, startX + badgeW + gapB + tw / 2, 184);
      }
      else if (selStage < game.highestStage) ctx.fillText('✓ クリア済み', px, 184);
      else ctx.fillText('▶ 挑戦中', px, 184);

      // 報酬＋推奨＋★条件を1ブロック（縦方向は等間ピッチで配置）
      const boxX = PANEL_X + 14, boxY = 200, boxW = 300, boxH = 122;
      ctx.fillStyle = 'rgba(8,10,18,0.70)';
      // 通常/応用は青寄りで統一（ボスとの差別化）
      ctx.strokeStyle = 'rgba(120,190,255,0.16)';
      ctx.lineWidth = 1;
      ctx.shadowColor = 'rgba(120,190,255,0.18)';
      ctx.shadowBlur = 6;
      ctx.beginPath(); ctx.roundRect(boxX, boxY, boxW, boxH, 10); ctx.fill(); ctx.stroke();
      ctx.shadowBlur = 0;

      // 内側パディング統一：ラベル左・数値右で横方向を使い切る
      const boxPad = 12;
      const innerL = boxX + boxPad;
      const innerR = boxX + boxW - boxPad;

      const row = (i) => boxY + 16 + i * 22;
      ctx.textAlign = 'left';
      ctx.fillStyle = 'rgba(255,220,160,0.94)';
      ctx.font = 'bold 12px Orbitron,Courier New';
      ctx.fillText('報酬', innerL, row(0));
      ctx.fillStyle = 'rgba(255,235,190,0.96)';
      ctx.font = 'bold 15px Orbitron,Courier New';
      const rewardMain = `●${coinMin}〜${coinMax}  💎${gemBase}`;
      ctx.textAlign = 'right';
      ctx.fillText(rewardMain, innerR, row(0) + 1);
      ctx.fillStyle = 'rgba(255,235,190,0.62)';
      ctx.font = 'bold 11px Orbitron,Courier New';
      ctx.fillText(matStr, innerR, row(1));

      ctx.textAlign = 'left';
      ctx.fillStyle = 'rgba(170,205,250,0.72)';
      ctx.font = 'bold 12px Orbitron,Courier New';
      ctx.fillText('推奨 ⚡', innerL, row(2));
      ctx.fillStyle = 'rgba(235,248,255,0.94)';
      ctx.font = 'bold 14px Orbitron,Courier New';
      ctx.textAlign = 'right';
      ctx.fillText(String(recPower), innerR, row(2) + 1);

      // ★条件（3ピル＝等幅、文字は読みやすいサイズから縮小のみ）
      ctx.fillStyle = 'rgba(255,255,255,0.10)';
      ctx.fillRect(boxX, row(2) + 14, boxW, 1);
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(255,220,160,0.84)';
      ctx.font = 'bold 13px Orbitron,Courier New';
      ctx.fillText('★ 条件', boxX + boxW / 2, row(3) + 2);
      {
        const pillY = row(4) + 10;
        const pills = [
          { t: '★1 クリア', a: 0.38 },
          { t: '★2 最大コンボ5', a: 0.44 },
          { t: '★3 ノーダメ', a: 0.52 },
        ];
        const pillGap = 6;
        const pillAreaW = boxW - 2 * boxPad;
        const eachW = (pillAreaW - pillGap * (pills.length - 1)) / pills.length;
        let fs = 11;
        for (; ;) {
          ctx.font = `bold ${fs}px Orbitron,Courier New`;
          const maxTw = Math.max(...pills.map(p => ctx.measureText(p.t).width));
          if (maxTw <= eachW - 8 || fs <= 8) break;
          fs--;
        }
        let xx = innerL;
        pills.forEach(p => {
          ctx.fillStyle = `rgba(120,190,255,${0.12 * p.a})`;
          ctx.strokeStyle = `rgba(120,190,255,${0.26 * p.a})`;
          ctx.lineWidth = 1;
          ctx.beginPath(); ctx.roundRect(xx, pillY - 13, eachW, 21, 8); ctx.fill(); ctx.stroke();
          ctx.fillStyle = `rgba(220,235,255,${0.78 * p.a + 0.18})`;
          ctx.font = `bold ${fs}px Orbitron,Courier New`;
          ctx.fillText(p.t, xx + eachW / 2, pillY + 2);
          xx += eachW + pillGap;
        });
      }
      ctx.textAlign = 'center';
      game._stageSelectInfoBottomY = boxY + boxH;
    }
    else {
      // 既存（通常以外）の汎用表示は維持
      ctx.fillStyle = world.accent + '30'; ctx.fillRect(PANEL_X + 12, 266, 304, 1);

      // クリア状態
      const isLocked = selStage > game.highestStage;
      if (isLocked) {
        ctx.font = 'bold 14px Orbitron,Courier New';
        const lt = '🔒 未解放';
        const tw = ctx.measureText(lt).width;
        const badgeW = 40, gapB = 8;
        const totalW = badgeW + gapB + tw;
        const startX = px - totalW / 2;
        ctx.fillStyle = 'rgba(36,40,54,0.92)';
        ctx.strokeStyle = 'rgba(210,220,240,0.55)';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.roundRect(startX, 278, badgeW, 20, 5); ctx.fill(); ctx.stroke();
        ctx.fillStyle = 'rgba(235,240,250,0.92)';
        ctx.font = 'bold 9px Orbitron,Courier New'; ctx.textAlign = 'center';
        ctx.fillText('LOCK', startX + badgeW / 2, 292);
        ctx.font = 'bold 14px Orbitron,Courier New';
        ctx.fillStyle = '#444';
        ctx.fillText(lt, startX + badgeW + gapB + tw / 2, 292);
        ctx.fillStyle = '#444'; ctx.font = '10px Orbitron,Courier New';
        ctx.textAlign = 'center';
        ctx.fillText(`ステージ${selStage - 1}をクリアして解放`, px, 308);
      } else if (selStage < game.highestStage) {
        ctx.shadowColor = '#ffdd00'; ctx.shadowBlur = 8;
        ctx.fillStyle = '#ffdd00'; ctx.font = 'bold 14px Orbitron,Courier New';
        ctx.fillText('✓ クリア済み', px, 292); ctx.shadowBlur = 0;
      } else {
        ctx.fillStyle = '#00ccff'; ctx.font = 'bold 14px Orbitron,Courier New';
        ctx.fillText('▶ 挑戦中', px, 292);
      }

      // 推奨戦力 / 報酬（目安）ミニ行
      {
        const recPower = Math.max(80, selStage * 120);
        // ボス撃破時の報酬ロジック（killBoss）に合わせた目安表示
        const coinMin = 80 + selStage * 8;
        const coinMax = coinMin + 39;
        const gemBase = 3 + Math.floor(selStage / 5);
        const pName = getPlanet(selStage).name;
        const matStr = pName === 'SATURN' ? '💠×2  🔩×3'
          : pName === 'JUPITER' ? '💠×1  🔩×3'
            : '⚡×2  🔩×3';
        const note = (selStage > 1 && !isLocked) ? `★ ステージ${selStage}から開始` : '';

        // 右情報パネル内で「報酬」が詰まりやすいので2段にして読みやすくする
        const boxX = PANEL_X + 12, boxY = 316, boxW = 304, boxH = note ? 72 : 52;
        ctx.fillStyle = 'rgba(10,14,26,0.78)';
        ctx.strokeStyle = world.accent + '55';
        ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.roundRect(boxX, boxY, boxW, boxH, 6); ctx.fill(); ctx.stroke();

        ctx.fillStyle = 'rgba(170,205,250,0.70)';
        ctx.font = 'bold 10px Orbitron,Courier New'; ctx.textAlign = 'left';
        ctx.fillText('推奨 ⚡', boxX + 10, boxY + 15);
        ctx.fillStyle = 'rgba(235,248,255,0.92)';
        ctx.font = 'bold 12px Orbitron,Courier New';
        ctx.fillText(String(recPower), boxX + 56, boxY + 15);

        ctx.fillStyle = 'rgba(170,205,250,0.62)';
        ctx.font = 'bold 10px Orbitron,Courier New';
        ctx.fillText('報酬', boxX + 120, boxY + 15);

        // 1段目: コイン/ジェム
        ctx.fillStyle = 'rgba(255,235,190,0.92)';
        ctx.font = 'bold 11px Orbitron,Courier New';
        ctx.fillText(`●${coinMin}〜${coinMax}  💎${gemBase}`, boxX + 160, boxY + 15);
        // 2段目: 素材（少し控えめ）
        ctx.fillStyle = 'rgba(255,235,190,0.75)';
        ctx.font = 'bold 10px Orbitron,Courier New';
        ctx.fillText(matStr, boxX + 160, boxY + 32);

        if (note) {
          ctx.fillStyle = '#ff8800';
          ctx.font = 'bold 9px Orbitron,Courier New'; ctx.textAlign = 'center';
          ctx.fillText(note, px, boxY + 50);
          ctx.textAlign = 'left';
        }

        // この下から敵プレビューを開始する
        game._stageSelectInfoBottomY = boxY + boxH;
      }
    }

    // ===== 右パネル下部（燃料 + 出撃準備ボタン）レイアウトを先に確定 =====
    const bx = PANEL_X + 16, bw = 288, bh = 60;
    const footerPad = Math.max(6, Math.round(H * 0.016));
    const bottomY = H - footerPad;
    const by = bottomY - bh;
    const fuelLineY = by - 10;

    // ===== 敵プレビュー =====
    const _infoBottom = Number.isFinite(game._stageSelectInfoBottomY) ? game._stageSelectInfoBottomY : 402;
    const typesPre = drawDeps.getStageEnemyTypes(selStage);
    const enemyBlockNeed = ((isNormalStage || isAppliedStage) ? 94 : 102) + Math.max(0, typesPre.length - 4) * 8;
    const zoneTop = _infoBottom + 6;
    const zoneBot = fuelLineY - 20;
    const slack = Math.max(0, zoneBot - zoneTop - enemyBlockNeed);
    const enemyTop = Math.max(276, Math.min(zoneBot - enemyBlockNeed - 4, zoneTop + Math.floor(slack * 0.4)));
    ctx.fillStyle = world.accent + '30'; ctx.fillRect(PANEL_X + 12, enemyTop, 304, 1);
    // 見出しを見やすく（背景＋明るめ文字＋薄いグロー）
    ctx.fillStyle = 'rgba(10,12,22,0.65)';
    ctx.strokeStyle = world.accent + '22';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(PANEL_X + 14, enemyTop + 5, 300, 22, 7); ctx.fill(); ctx.stroke();
    ctx.shadowColor = world.accent; ctx.shadowBlur = 12;
    ctx.fillStyle = 'rgba(230,245,255,0.94)'; ctx.font = 'bold 13px Orbitron,Courier New'; ctx.textAlign = 'center';
    ctx.fillText('出現する敵', px, enemyTop + 21);
    ctx.shadowBlur = 0;
    {
      const types = typesPre;
      const maxIconBottom = fuelLineY - 20;
      const tight = (maxIconBottom - (enemyTop + 26)) < 86;
      const bigIcons = (isNormalStage || isAppliedStage);
      let iconSize = bigIcons ? (tight ? 21 : 25) : (tight ? 19 : 23);
      if (types.length >= 5) iconSize = Math.max(18, iconSize - 3);
      if (types.length >= 6) iconSize = Math.max(17, iconSize - 2);
      const trackL = PANEL_X + 14, trackW = 300;
      types.forEach((t, i) => {
        const areaTop = enemyTop + 40 + iconSize * 0.35;
        const lblH = (isNormalStage || isAppliedStage) ? 14 : 16;
        const gapAboveFuel = 8;
        const iconBottom = maxIconBottom - gapAboveFuel;
        // アイコン＋下ラベルが FUEL ラインにかからないよう、下から位置を決める
        const ey = Math.max(areaTop, iconBottom - lblH - iconSize * 0.75);
        const ex = trackL + (trackW / (types.length + 1)) * (i + 1);
        const tc = drawDeps.ENEMY_PREVIEW_COLORS[t] || '#aaa';
        ctx.save(); ctx.translate(ex, ey);
        ctx.shadowColor = tc; ctx.shadowBlur = 8; ctx.fillStyle = tc;
        drawDeps.drawEnemyPreviewIcon(ctx, t, iconSize);
        ctx.shadowBlur = 0; ctx.restore();
        // 敵情報を"UI化"：小ラベル（通常/応用は短く・薄く）
        const lbl = drawDeps.ENEMY_PREVIEW_LABELS[t] || t;
        const showLbl = (lbl && !(isNormalStage || isAppliedStage)) || (lbl && (isNormalStage || isAppliedStage));
        if (showLbl) {
          const short = (isNormalStage || isAppliedStage) ? String(lbl).slice(0, 10) : String(lbl);
          ctx.fillStyle = (isNormalStage || isAppliedStage) ? 'rgba(190,215,250,0.55)' : (tc + 'aa');
          ctx.font = (isNormalStage || isAppliedStage) ? 'bold 10px Orbitron,Courier New' : 'bold 11px Orbitron,Courier New';
          ctx.textAlign = 'center';
          ctx.fillText(short, ex, ey + iconSize + 12);
        }
      });
    }
    ctx.textAlign = 'left';

    // 出撃準備ボタン（パネル下部・大）
    {
      const isLocked = (game.stageSelectIdx + 1) > game.highestStage;
      // 燃料（スタミナ）表示：右パネルにも出す
      syncFuel();
      const fuelHave = Math.max(0, Math.floor(game.fuel || 0));
      // FUELを"判断材料"に（少し太く、満タンで光る / 不足で赤点滅）
      const fuelH = 26;
      const fuelNeed = (typeof drawDeps.FUEL_COST_PER_RUN === 'number' ? drawDeps.FUEL_COST_PER_RUN : 1);
      const fuelOk = (fuelHave >= fuelNeed);
      const full = (fuelHave >= drawDeps.FUEL_CAP);
      const blink = (!fuelOk) ? (0.55 + 0.45 * Math.sin((Date.now() / 1000) * (Math.PI * 2 / 0.8))) : 1;
      ctx.fillStyle = 'rgba(10,16,34,0.86)';
      ctx.strokeStyle = (!fuelOk) ? `rgba(255,80,60,${0.55 * blink})` : (full ? 'rgba(120,255,190,0.42)' : 'rgba(90,170,255,0.38)');
      ctx.lineWidth = 1;
      ctx.shadowColor = full ? 'rgba(120,255,190,0.35)' : (!fuelOk ? `rgba(255,80,60,${0.45 * blink})` : 'transparent');
      ctx.shadowBlur = full ? 10 : (!fuelOk ? 12 * blink : 0);
      ctx.beginPath(); ctx.roundRect(bx, fuelLineY - 16, bw, fuelH, 7); ctx.fill(); ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(210,240,255,0.95)';
      ctx.font = 'bold 14px Orbitron,Courier New';
      ctx.textAlign = 'left';
      // タイマーはHUD側に寄せ、右パネルは数値だけにする
      ctx.fillText(`⛽ FUEL  ${fuelHave}/${drawDeps.FUEL_CAP}`, bx + 10, fuelLineY + 1);
      ctx.textAlign = 'left';

      // 出撃ボタン：通常は落ち着く / hoverで強発光 + 1.05 / clickで縮む
      const fuelBl = !!game._stageSelectLaunchFuelBlocked;
      const launchDisabled = isLocked || fuelBl;
      const pulse = isLocked ? 1 : 0.8 + Math.sin(game.frameCount * 0.09) * 0.2;
      // クリック時：一瞬縮む（0.95）→戻る
      const e2 = game.frameCount - ((game.uiLastTap && game.uiLastTap.id === 'ss_launch') ? game.uiLastTap.frame : -999);
      const clickScale = (e2 >= 0 && e2 < 10) ? (0.95 + 0.05 * (e2 / 10)) : 1;
      const hov = (game.hoveredBtn && game.hoveredBtn.id === 'ss_launch') && !launchDisabled;
      const weakGlow = (isNormalStage || isAppliedStage) ? 0.40 : 0.80;
      const hovGlow = hov ? 1.35 : 1;
      ctx.save();
      const hovScale = hov ? 1.05 : 1;
      ctx.translate(bx + bw / 2, by + bh / 2);
      ctx.scale(clickScale * hovScale, clickScale * hovScale);
      ctx.translate(-(bx + bw / 2), -(by + bh / 2));
      ctx.fillStyle = isLocked ? 'rgba(20,20,20,0.7)' : (fuelBl ? 'rgba(28,24,22,0.78)' : 'rgba(0,40,80,0.88)');
      ctx.strokeStyle = isLocked ? '#333' : (fuelBl ? 'rgba(130,100,90,0.55)' : world.accent);
      ctx.lineWidth = isLocked ? 1 : 2;
      ctx.shadowColor = isLocked || fuelBl ? 'transparent' : world.accent;
      ctx.shadowBlur = isLocked || fuelBl ? 0 : 12 * pulse * weakGlow * hovGlow;
      if (isLocked) ctx.setLineDash([6, 5]);
      else if (fuelBl) ctx.setLineDash([3, 3]);
      else ctx.setLineDash([]);
      ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 12); ctx.fill(); ctx.stroke(); ctx.setLineDash([]); ctx.shadowBlur = 0;
      ctx.fillStyle = isLocked ? '#444' : (fuelBl ? 'rgba(255,210,200,0.90)' : world.accent);
      ctx.textAlign = 'center';
      if (isLocked) {
        ctx.font = 'bold 14px Orbitron,Courier New';
        ctx.fillText('🔒 未解放', bx + bw / 2, by + bh / 2 + 2);
        ctx.font = 'bold 9px Orbitron,Courier New';
        ctx.fillStyle = 'rgba(200,210,230,0.88)';
        ctx.fillText('LOCK', bx + bw / 2, by + bh / 2 + 16);
      } else if (fuelBl) {
        ctx.font = 'bold 14px Orbitron,Courier New';
        ctx.fillText('燃料が足りません', bx + bw / 2, by + bh / 2 + 7);
      } else {
        ctx.font = 'bold 18px Orbitron,Courier New';
        ctx.fillText('▶  出撃', bx + bw / 2, by + bh / 2 + 7);
      }
      ctx.restore();
      game._stageSelectLaunchHit = isLocked ? null : { x: bx, y: by, w: bw, h: bh };
    }

  } // end: !customRightPanel

  // 右パネルのフェード（globalAlpha）をここで閉じる
  ctx.restore(); // right panel fade group

  // ===== 左：ステージマップ（ゲームっぽい没入感）=====
  // 仕様: 縦ジグザグ 1→2→3→4→5（5はボスを中央に）
  {
    const leftW = PANEL_X;
    const cx = leftW / 2;
    const scrollY = Math.max(0, Number.isFinite(game.stageMapScrollOffset) ? game.stageMapScrollOffset : 0);
    // 上部の空白を進行エリアにする（余白広め）
    const topY = Math.max(96, Math.min(140, Math.round(H * 0.16)));
    const bottomPad = 120;
    // 空間の間延び対策：縦間隔を少し詰める（-10〜15%） + 左右振れ幅を少し広げる
    const vGap = Math.max(86, Math.min(124, Math.floor((H - topY - bottomPad) / 4) * 0.88));
    const zigX = Math.max(80, Math.min(132, Math.floor(leftW * 0.27)));
    const leftX = cx - zigX;
    const rightX = cx + zigX;
    const rNode = 26;
    const rSel = 30;
    const pulse = 0.55 + 0.45 * Math.sin(game.frameCount * 0.08);
    const enterAt = Number.isFinite(game.stageSelectEnterAt) ? game.stageSelectEnterAt : game.frameCount;
    const enterT = Math.max(0, Math.min(1, (game.frameCount - enterAt) / 45)); // 0.75秒くらいで描ききる
    const nodeStaggerT = (i) => Math.max(0, Math.min(1, ((game.frameCount - enterAt) - (i * 6)) / 18)); // 0.2秒ずつ

    const worldStart = (Math.floor((selStage - 1) / 10)) * 10 + 1;
    const local = ((selStage - 1) % 10) + 1;
    const groupStart = worldStart + Math.floor((local - 1) / 5) * 5; // 1..5, 6..10
    const stages = [0, 1, 2, 3, 4].map(i => groupStart + i);
    // 1-5 は中間ボス、1-10 がボス（ページの最後ノードがどちらかは local で判定）
    const bossStage = groupStart + 4;
    const bossLocal = ((bossStage - 1) % 10) + 1;
    const isBossNode = (bossLocal === 10);
    const isMidBossNode = (bossLocal === 5);
    const nextStage = Math.min(groupStart + 4, Math.max(selStage + 1, selStage));

    // ヒット判定を記録（クリック用）
    game._stageSelectNodeHits = [];

    // 背景HUD（左上のワールド名）
    ctx.shadowColor = world.accent; ctx.shadowBlur = 18;
    ctx.fillStyle = world.accent; ctx.font = 'bold 18px Orbitron,Courier New'; ctx.textAlign = 'left';
    ctx.fillText(world.name, 18, 34); ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(200,220,255,0.55)'; ctx.font = '11px Orbitron,Courier New';
    ctx.fillText(`最高到達: ${formatStageId(game.highestStage)}`, 18, 54);

    // ノード座標（線が六角形の中に入らないよう半径も持たせる）
    const totalH = vGap * 4;
    const nodePos = stages.map((s, i) => {
      const isSel = s === selStage;
      const localS = ((s - 1) % 10) + 1;
      const isMidBoss = (localS === 5);
      const isFinalBoss = (localS === 10);
      const mul = isFinalBoss ? 1.5 : (isMidBoss ? 1.2 : 1); // MID=1.2 / BOSS=1.5
      const shape = (isMidBoss || isFinalBoss) ? 'star' : 'hex';
      const t = i / 4;
      // 上は詰め、下は広げる（扇状の導線）。y は全体距離を維持しつつ少しイージング
      const y = topY + (t * t * 0.12 + t * 0.88) * totalH;
      // 左右交互 + 軽いカーブ（世界観）
      const fan = (0.90 + 0.34 * t);
      const sway = Math.sin((t * 1.15 + 0.15) * Math.PI) * 10;
      // 左右を完全対称にしない（±20px程度のゆらぎ：ステージで決定）
      const jitter = ((Math.sin(s * 12.9898) * 0.5 + 0.5) * 2 - 1) * 20;
      const x = (i === 4) ? (cx + jitter * 0.25) : (((i % 2 === 0) ? (leftX * fan) : (rightX * fan)) + sway * (i % 2 === 0 ? -1 : 1) + jitter);
      return { stage: s, local: localS, x, y, r: (isSel ? rSel : rNode) * mul, shape };
    });
    const bossPos = nodePos[nodePos.length - 1];

    // スクロール範囲（左マップのみ）
    const mapTop = topY - 72;
    const mapBottom = nodePos[nodePos.length - 1].y + 110;
    const maxScroll = Math.max(0, Math.floor(mapBottom - (H - 72)));
    game._stageSelectMapMaxScroll = maxScroll;
    const clampedScroll = Math.max(0, Math.min(maxScroll, scrollY));
    if (clampedScroll !== scrollY) game.stageMapScrollOffset = clampedScroll;

    // スナップ（ホイール/ドラッグ後にノード単位で止まる）
    if (game._stageSelectMapSnapAt && Date.now() >= game._stageSelectMapSnapAt) {
      game._stageSelectMapSnapAt = 0;
      const targetStage = game.stageSelectIdx + 1;
      const n = nodePos.find(p => p.stage === targetStage) || nodePos[0];
      const want = n.y - (H * 0.42);
      game.stageMapScrollOffset = Math.max(0, Math.min(maxScroll, Math.round(want)));
    }

    // 進行レーンは残し、START/GOAL テキストは非表示にする

    // マップ描画はスクロールさせる
    ctx.save();
    ctx.translate(0, -clampedScroll);

    // ボス直前の緊張感：背景をほんの少し暗く（約5%）
    {
      const bossIsNext = (game.highestStage === bossStage - 1);
      const bossSelected = (selStage === bossStage);
      if (bossIsNext || bossSelected) {
        const blink = (bossSelected ? (0.70 + 0.30 * Math.sin((Date.now() / 1000) * (Math.PI * 2 / 0.8))) : 1);
        ctx.save();
        ctx.globalAlpha = 0.05 * (bossSelected ? blink : 1);
        ctx.fillStyle = '#000';
        ctx.fillRect(0, mapTop, leftW, (mapBottom - mapTop));
        ctx.restore();
      }
    }
    // 中央の薄いグラデ帯（進行レーン）
    {
      const laneW = 116;
      const y0 = mapTop, y1 = mapBottom;
      const g = ctx.createLinearGradient(cx, y0, cx, y1);
      // 強度を少し上げる（+10〜15%）
      g.addColorStop(0, 'rgba(70,160,255,0.075)');
      g.addColorStop(0.45, 'rgba(255,200,90,0.062)');
      g.addColorStop(1, 'rgba(255,90,70,0.075)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.roundRect(cx - laneW / 2, y0, laneW, (y1 - y0), 40);
      ctx.fill();
      // うっすら星パーティクル + パララックス（スクロールで少し動く）
      const par = (clampedScroll * 0.08);
      const seed = ((groupStart * 9197) ^ 0x9e3779b9) >>> 0;
      ctx.save();
      ctx.globalAlpha = 0.22;
      ctx.fillStyle = 'rgba(220,240,255,0.22)';
      for (let k = 0; k < 28; k++) {
        const rx = (Math.sin(seed + k * 12.17) * 0.5 + 0.5) * laneW + (cx - laneW / 2);
        const ry = (Math.sin(seed + k * 5.31 + 1.7) * 0.5 + 0.5) * (y1 - y0) + y0;
        const yy = ry + ((k % 3) - 1) * par;
        ctx.fillRect(rx, yy, 1.2, 1.2);
      }
      ctx.restore();
    }

    // ライン描画（ベジェ + グラデ + 進行方向パルス + ボス点線）
    function drawFlowLine(x1, y1, x2, y2, colA, colB, active = false, dashed = false, curve = 0, progressed = false, isBossPath = false) {
      ctx.save();
      if (dashed) ctx.setLineDash([10, 8]);
      const g = ctx.createLinearGradient(x1, y1, x2, y2);
      g.addColorStop(0, colA);
      g.addColorStop(1, colB);
      // 未解放は破線＋低透明度
      ctx.strokeStyle = active ? g : (dashed ? 'rgba(200,220,255,0.06)' : 'rgba(255,255,255,0.04)');
      ctx.lineWidth = active ? (isBossPath ? 6 : 5) : (isBossPath ? 4 : 3);
      if (active) {
        ctx.shadowColor = colB; ctx.shadowBlur = 18;
      }
      // 左→右に描かれる演出
      const dx = x2 - x1, dy = y2 - y1;
      const ex = x1 + dx * enterT, ey = y1 + dy * enterT;
      const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
      const cx2 = mx, cy2 = my + curve;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.quadraticCurveTo(cx2, cy2, ex, ey);
      ctx.stroke();
      // 流れる粒子（上→下）：到達済みのみ表示。現在地までのラインは少し速く
      if (progressed) {
        const fast = active ? 1.35 : 1.0;
        const sp = 0.010 * fast;
        const t0 = (game.frameCount * sp) % 1;
        // 緩急（加速→減速）
        const t = 0.5 - 0.5 * Math.cos(Math.PI * t0);
        const px = (1 - t) * (1 - t) * x1 + 2 * (1 - t) * t * cx2 + t * t * x2;
        const py = (1 - t) * (1 - t) * y1 + 2 * (1 - t) * t * cy2 + t * t * y2;
        ctx.fillStyle = colB;
        ctx.shadowColor = colB; ctx.shadowBlur = 16;
        ctx.beginPath(); ctx.arc(px, py, 3.6, 0, Math.PI * 2); ctx.fill();
        // 余韻（短い尾）
        ctx.globalAlpha = 0.20;
        ctx.strokeStyle = colA;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(px, py - 10);
        ctx.lineTo(px, py + 10);
        ctx.stroke();
      }
      ctx.restore();
    }

    for (let i = 0; i < nodePos.length - 1; i++) {
      const a = nodePos[i], b = nodePos[i + 1];
      const isActive = (a.stage <= game.highestStage && b.stage <= game.highestStage);
      const progressed = (b.stage <= game.highestStage); // 現在地まで（含む）
      const isLast = (b.stage === bossStage);
      const toBoss = isLast && isBossNode;
      const toMidBoss = isLast && isMidBossNode;
      const colA = toBoss ? 'rgba(255,120,80,0.95)' : toMidBoss ? 'rgba(255,190,120,0.95)' : 'rgba(255,200,90,0.95)';
      const colB = toBoss ? 'rgba(255,60,40,0.95)' : toMidBoss ? 'rgba(255,120,60,0.95)' : 'rgba(255,120,40,0.95)';
      // 線はノードの縁まで（六角形の中に入れない）
      {
        const p1 = (a.shape === 'hex')
          ? drawDeps.hexBoundaryPoint(a.x, a.y, a.r || rNode, b.x, b.y)
          : drawDeps.circleBoundaryPoint(a.x, a.y, a.r || rNode, b.x, b.y);
        const p2 = (b.shape === 'hex')
          ? drawDeps.hexBoundaryPoint(b.x, b.y, b.r || rNode, a.x, a.y)
          : drawDeps.circleBoundaryPoint(b.x, b.y, b.r || rNode, a.x, a.y);
        const x1 = p1.x, y1 = p1.y;
        const x2 = p2.x, y2 = p2.y;
        // ボス導線：点線ではなく発光実線 + 収束感
        const dashed = false;
        // ジグザグに合わせて曲率を左右方向に付ける（ボスは中央へ吸い込む）
        const dir = (b.x - a.x);
        const baseCurve = toBoss ? 0 : (toMidBoss ? -10 : -18);
        const curve = (toBoss || toMidBoss) ? baseCurve : ((dir >= 0) ? -26 : 26);
        drawFlowLine(x1, y1, x2, y2, colA, colB, isActive, dashed, curve, progressed, (toBoss || toMidBoss));
        // 収束エフェクト（最後だけ、光が集まる）
        if ((toBoss || toMidBoss) && (isActive || progressed)) {
          const tt = (game.frameCount * 0.06) % (Math.PI * 2);
          ctx.save();
          ctx.shadowColor = colB; ctx.shadowBlur = 18;
          ctx.globalAlpha = 0.55;
          for (let p = 0; p < 5; p++) {
            const a = tt + p * 1.1;
            const rr = 12 + p * 3;
            ctx.fillStyle = colB;
            ctx.beginPath();
            ctx.arc(x2 + Math.cos(a) * rr, y2 + Math.sin(a) * rr, 1.6, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
        }
      }
    }

    // ノード描画
    nodePos.forEach((n, i) => {
      const s = n.stage;
      const cleared = s < game.highestStage;
      const current = s === game.highestStage;
      const next = s === game.highestStage + 1;
      const locked = s > game.highestStage + 1;
      const local = n.local || ((s - 1) % 10) + 1;
      const isNormal = (local >= 1 && local <= 4);
      const isApplied = (local >= 6 && local <= 9);

      let fill = 'rgba(10,10,24,0.95)';
      let stroke = 'rgba(255,120,80,0.45)';
      let glow = 'transparent';
      let glowBlur = 0;
      let label = '';
      let labelCol = 'rgba(255,255,255,0.75)';

      if (cleared) {
        fill = 'rgba(0,20,10,0.75)';
        stroke = 'rgba(0,220,90,0.55)';
      }
      if (current) {
        glow = 'rgba(255,70,50,0.95)';
        glowBlur = 26 * pulse;
        stroke = 'rgba(255,70,50,0.95)';
        label = '現在地';
        labelCol = 'rgba(255,90,60,0.95)';
      } else if (next) {
        glow = 'rgba(255,210,80,0.9)';
        glowBlur = 18 * (0.7 + 0.3 * pulse);
        stroke = 'rgba(255,210,80,0.9)';
        label = 'NEXT';
        labelCol = 'rgba(255,220,120,0.95)';
      }
      if (locked) {
        // 未解放はさらに暗く（-30%輝度イメージ）
        fill = 'rgba(4,4,10,0.88)';
        stroke = 'rgba(70,80,110,0.28)';
      }
      // 応用ステージは少しだけ硬質に（通常はシンプル）
      if (isApplied && !locked && !cleared && !current && !next) {
        stroke = 'rgba(255,170,110,0.55)';
        fill = 'rgba(14,10,8,0.90)';
      }
      // 通常ノードは少し暗め・発光弱め（ランク差の底上げ）
      if (isNormal && !locked && !cleared && !current && !next) {
        fill = 'rgba(6,6,16,0.95)';
        stroke = 'rgba(160,190,255,0.18)';
      }
      // 5番目ノードは「中間ボス」か「ボス」になる
      const isLastNode = (s === bossStage);
      const isMidBoss = isLastNode && isMidBossNode;
      const isFinalBoss = isLastNode && isBossNode;
      if (isMidBoss) {
        stroke = 'rgba(255,140,60,0.90)';
        glow = 'rgba(255,140,60,0.70)';
        glowBlur = 18 * (0.7 + 0.3 * pulse);
      }
      if (isFinalBoss) {
        stroke = 'rgba(255,70,50,0.95)';
        glow = 'rgba(255,70,50,0.85)';
        glowBlur = 22 * (0.7 + 0.3 * pulse);
      }

      // 現在地：脈動（scale 1.0 ↔ 1.05）
      const pulseScale = (current || isMidBoss || isFinalBoss)
        ? (1.0 + 0.05 * (0.5 + 0.5 * Math.sin(game.frameCount * 0.10)))
        : 1;
      const rr = (n.r || ((s === selStage) ? rSel : rNode)) * pulseScale;
      const fade = nodeStaggerT(i);
      ctx.save();
      ctx.globalAlpha = fade;
      ctx.translate(n.x, n.y);
      // ボス演出：薄いレーダーリング（背面）
      if (isMidBoss || isFinalBoss) {
        const ringR = rr + 18;
        const ang = game.frameCount * (isFinalBoss ? 0.013 : 0.015);
        ctx.save();
        ctx.globalAlpha = (isFinalBoss ? 0.18 : 0.22) + 0.12 * pulse;
        ctx.strokeStyle = isFinalBoss ? 'rgba(255,90,70,0.55)' : 'rgba(255,160,90,0.55)';
        ctx.lineWidth = 2;
        ctx.shadowColor = isFinalBoss ? 'rgba(255,70,50,0.55)' : 'rgba(255,140,60,0.55)';
        ctx.shadowBlur = 18;
        ctx.beginPath();
        ctx.arc(0, 0, ringR, ang, ang + Math.PI * 1.65);
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 0.12;
        ctx.setLineDash([6, 10]);
        ctx.beginPath();
        ctx.arc(0, 0, ringR + 10, -ang, -ang + Math.PI * 1.8);
        ctx.stroke();
        // うっすら波紋（レーダー）
        ctx.setLineDash([]);
        ctx.globalAlpha *= 0.75;
        ctx.strokeStyle = isFinalBoss ? 'rgba(255,90,70,0.22)' : 'rgba(255,160,90,0.22)';
        const wave = (game.frameCount * 0.5) % 30;
        ctx.beginPath(); ctx.arc(0, 0, ringR + 18 + wave, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
      }
      // 立体風（内側グラデ + 外側グロー）
      const coreG = ctx.createRadialGradient(-rr * 0.25, -rr * 0.35, 2, 0, 0, rr * 1.35);
      if (cleared) {
        coreG.addColorStop(0, 'rgba(80,255,140,0.30)');
        coreG.addColorStop(1, 'rgba(0,40,20,0.85)');
      } else if (locked) {
        coreG.addColorStop(0, 'rgba(120,140,180,0.10)');
        coreG.addColorStop(1, 'rgba(6,6,14,0.85)');
      } else if (current) {
        coreG.addColorStop(0, 'rgba(255,120,90,0.35)');
        coreG.addColorStop(1, 'rgba(30,10,10,0.90)');
      } else if (next) {
        coreG.addColorStop(0, 'rgba(255,230,120,0.25)');
        coreG.addColorStop(1, 'rgba(20,16,6,0.92)');
      } else {
        coreG.addColorStop(0, 'rgba(120,140,200,0.12)');
        coreG.addColorStop(1, fill);
      }
      ctx.shadowColor = glow; ctx.shadowBlur = glowBlur;
      ctx.fillStyle = coreG;
      // 2重枠（内側細線＋外側グロー）
      const lwOuter = (s === selStage) ? 3 : 2;
      ctx.strokeStyle = stroke; ctx.lineWidth = lwOuter;
      // 形状
      if (n.shape === 'star') {
        const inner = rr * 0.48;
        ctx.beginPath(); drawDeps.drawStar(ctx, 0, 0, 5, rr, inner);
        ctx.fill();
      } else {
        ctx.beginPath(); drawDeps.drawHexagon(ctx, 0, 0, rr);
        ctx.fill();
      }
      // 外側グロー
      ctx.save();
      ctx.shadowColor = stroke; ctx.shadowBlur = 10;
      if (n.shape === 'star') {
        ctx.strokeStyle = stroke;
        ctx.lineWidth = lwOuter;
        ctx.beginPath(); drawDeps.drawStar(ctx, 0, 0, 5, rr, rr * 0.48); ctx.stroke();
      } else {
        ctx.stroke();
      }
      ctx.restore();
      // 内側細線
      ctx.strokeStyle = 'rgba(255,255,255,0.10)';
      ctx.lineWidth = 1;
      if (n.shape === 'star') {
        ctx.beginPath(); drawDeps.drawStar(ctx, 0, 0, 5, rr - 3, (rr - 3) * 0.48); ctx.stroke();
      } else {
        ctx.beginPath(); drawDeps.drawHexagon(ctx, 0, 0, rr - 3); ctx.stroke();
      }
      ctx.shadowBlur = 0;

      // ノイズ質感（軽量）：六角形内に微ドット
      ctx.save();
      if (n.shape === 'star') { ctx.beginPath(); drawDeps.drawStar(ctx, 0, 0, 5, rr - 4, (rr - 4) * 0.48); }
      else { ctx.beginPath(); drawDeps.drawHexagon(ctx, 0, 0, rr - 4); }
      ctx.clip();
      ctx.globalAlpha = 0.10;
      ctx.fillStyle = locked ? 'rgba(180,200,240,0.22)' : current ? 'rgba(255,120,90,0.22)' : next ? 'rgba(255,230,120,0.20)' : 'rgba(200,220,255,0.16)';
      const seed = (s * 9973 + (game.frameCount >> 2) * 17) >>> 0;
      for (let k = 0; k < 28; k++) {
        const rx = ((Math.sin(seed + k * 12.3) * 0.5 + 0.5) * 2 - 1) * (rr - 6);
        const ry = ((Math.sin(seed + k * 5.7 + 2.1) * 0.5 + 0.5) * 2 - 1) * (rr - 6);
        ctx.fillRect(rx, ry, 1, 1);
      }
      ctx.restore();
      ctx.shadowBlur = 0;

      // 数字（未解放は交差線→🔒の順で、色以外の手掛かりを付ける）
      const localNum = ((s - 1) % 10) + 1;
      if (locked) {
        ctx.strokeStyle = 'rgba(255,255,255,0.48)';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(-rr * 0.52, -rr * 0.4); ctx.lineTo(rr * 0.52, rr * 0.4);
        ctx.moveTo(rr * 0.52, -rr * 0.4); ctx.lineTo(-rr * 0.52, rr * 0.4);
        ctx.stroke();
      }
      ctx.fillStyle = locked ? 'rgba(160,180,210,0.25)' : (current ? '#000' : 'rgba(255,255,255,0.85)');
      ctx.font = `bold ${s === selStage ? 15 : 13}px Orbitron,Courier New`; ctx.textAlign = 'center';
      ctx.fillText(locked ? '🔒' : String(localNum), 0, 5);

      // クリアチェック
      if (cleared) {
        ctx.fillStyle = 'rgba(0,255,120,0.95)';
        ctx.font = 'bold 14px Orbitron,Courier New';
        ctx.fillText('✓', -rr + 10, -rr + 14);
      }
      // 中間ボス/ボス：アイコン
      if (isFinalBoss) {
        ctx.fillStyle = 'rgba(255,80,80,0.95)';
        ctx.font = 'bold 16px Orbitron,Courier New';
        ctx.fillText('☠', 0, -2);
      } else if (isMidBoss) {
        ctx.fillStyle = 'rgba(255,160,80,0.95)';
        ctx.font = 'bold 14px Orbitron,Courier New';
        ctx.fillText('⚠', 0, -1);
      }
      ctx.restore();

      // ボスはマークだけ（テキストラベルは出さない）

      // 現在地：外周リングを2重にして、ゆっくり回転＋パルス強化
      if (current) {
        const ringPulse = (0.7 + 0.3 * pulse);
        const ringR = rr + 8 + Math.sin(game.frameCount * 0.05) * 3;
        const ringR2 = ringR + 7;
        ctx.save();
        ctx.globalAlpha = 0.58 + 0.34 * ringPulse;
        ctx.strokeStyle = 'rgba(255,70,50,0.95)';
        ctx.lineWidth = 2.2;
        ctx.shadowColor = 'rgba(255,70,50,0.95)';
        ctx.shadowBlur = 20 * ringPulse;
        // 回転リング（少し回す）
        const ang = game.frameCount * 0.018;
        ctx.beginPath();
        ctx.arc(n.x, n.y, ringR, ang, ang + Math.PI * 1.6);
        ctx.stroke();
        // 2本目（逆回転）
        ctx.globalAlpha *= 0.85;
        ctx.strokeStyle = 'rgba(255,120,90,0.75)';
        ctx.shadowColor = 'rgba(255,120,90,0.75)';
        ctx.shadowBlur = 14 * ringPulse;
        const ang2 = -game.frameCount * 0.014;
        ctx.beginPath();
        ctx.arc(n.x, n.y, ringR2, ang2, ang2 + Math.PI * 1.3);
        ctx.stroke();
        ctx.restore();
      }

      // ラベル（現在地/NEXT）
      if (label) {
        // NEXT は0.8秒周期で点滅
        const blink = next ? (0.55 + 0.45 * Math.sin((Date.now() / 1000) * (Math.PI * 2 / 0.8))) : 1;
        ctx.fillStyle = labelCol; ctx.font = 'bold 12px Orbitron,Courier New'; ctx.textAlign = 'center';
        ctx.shadowColor = labelCol; ctx.shadowBlur = 12;
        ctx.globalAlpha *= blink;
        ctx.fillText(label, n.x, n.y - 46);
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
      }
      // NEXT：下矢印（▼）
      if (next) {
        const blink = 0.55 + 0.45 * Math.sin((Date.now() / 1000) * (Math.PI * 2 / 0.8));
        ctx.save();
        ctx.globalAlpha = 0.55 * blink;
        ctx.fillStyle = 'rgba(255,230,140,0.92)';
        ctx.font = 'bold 14px Orbitron,Courier New';
        ctx.textAlign = 'center';
        ctx.fillText('▼', n.x, n.y + 64);
        ctx.restore();
      }

      const stars = drawDeps.getStageStarsForMap(s);
      if (stars > 0) {
        ctx.fillStyle = 'rgba(255,220,80,0.92)';
        ctx.shadowColor = 'rgba(255,200,60,0.9)'; ctx.shadowBlur = 10;
        ctx.font = 'bold 12px Orbitron,Courier New'; ctx.textAlign = 'center';
        ctx.fillText('★'.repeat(stars), n.x, n.y + 44);
        ctx.shadowBlur = 0;
      }

      // NEXT：軽いパーティクル
      if (next) {
        ctx.save();
        const blink = 0.55 + 0.45 * Math.sin((Date.now() / 1000) * (Math.PI * 2 / 0.8));
        ctx.globalAlpha = 0.35 * blink;
        ctx.fillStyle = 'rgba(255,220,120,0.85)';
        for (let p = 0; p < 6; p++) {
          const a = (game.frameCount * 0.08 + p * 1.2);
          const pr = rr + 10 + (p % 3) * 3;
          ctx.beginPath();
          ctx.arc(n.x + Math.cos(a) * pr, n.y + Math.sin(a) * pr, 1.6, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      // ヒット（ロックでも選択だけはできる）
      game._stageSelectNodeHits.push({ stage: s, x: n.x, y: n.y, r: rr });
    });

    // 自機：選択ステージのノード付近にスムーズ追従（座標は update-tick）
    {
      const bob = Math.sin(game.frameCount * 0.14) * 2.5;
      const sw = 42, sh = 27;
      const cx = game.stageCharX, cy = game.stageCharY + bob;
      ctx.save();
      ctx.translate(cx, cy);
      const col = drawDeps.SHIP_COLORS[game.shipColorIdx].hex;
      ctx.shadowColor = col;
      ctx.shadowBlur = 16;
      drawDeps.drawShipShape(-sw / 2, -sh / 2, sw, sh, undefined, col, null);
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 0.88;
      const fh = 3 + Math.sin(game.frameCount * 0.22) * 2;
      ctx.fillStyle = '#f63';
      ctx.fillRect(-5, sh / 2 - 4, 10, fh + 1);
      ctx.fillStyle = '#ffcc66';
      ctx.fillRect(-3, sh / 2 - 2, 6, fh * 0.45);
      ctx.globalAlpha = 1;
      ctx.restore();
    }

    ctx.textAlign = 'left';
    // 右パネル連動：細い光ガイド（短い）
    if (game.stageSelectLinkFx && game.stageSelectLinkFx.until && game.frameCount <= game.stageSelectLinkFx.until) {
      const fx = game.stageSelectLinkFx;
      const p = Math.max(0, Math.min(1, (fx.until - game.frameCount) / 18));
      const ax = fx.x, ay = fx.y;
      const bx = PANEL_X + 10, by2 = Math.max(110, Math.min(H - 120, ay));
      ctx.save();
      ctx.globalAlpha = 0.75 * (1 - p);
      const g = ctx.createLinearGradient(ax, ay, bx, by2);
      g.addColorStop(0, 'rgba(255,230,140,0.0)');
      g.addColorStop(0.4, 'rgba(255,230,140,0.35)');
      g.addColorStop(1, 'rgba(255,120,60,0.0)');
      ctx.strokeStyle = g;
      ctx.lineWidth = 2;
      ctx.shadowColor = 'rgba(255,200,90,0.55)';
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.quadraticCurveTo((ax + bx) / 2, ay - 18, bx, by2);
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore(); // scroll group
  }
}

export function drawCustomizeScreen() {
  try { ensureDailyMissions(); ensureNormalQuestProfile(); } catch (e) { console.error(e); }
  if (!(game.missionClaimedSet instanceof Set)) game.missionClaimedSet = new Set();
  if (!(game.questClaimedIds instanceof Set)) game.questClaimedIds = new Set();

  const t = Date.now() / 1000;
  const L = getCustomizeLayout();
  const { MX, CW, eY, eH, infoY, infoH, startY2, startH2, bMX, bCW, stageSelY, stageSelH, navTabY, navTabH, navTabW } = L;
  const customizeSpineX = W / 2 + 24;
  const pAccent = getPlanet(game.highestStage).accent;
  const pStage = getPlanet(game.startStage);
  const compact = !game.customizeEquipExpanded;
  const lowFx = game.settings?.quality === 'low';
  const tapScale = (id) => {
    const e2 = game.frameCount - ((game.uiLastTap && game.uiLastTap.id === id) ? game.uiLastTap.frame : -99);
    if (id === 'ui_strt') return (e2 >= 0 && e2 < 12) ? (0.95 + 0.05 * e2 / 12) : 1;
    return (e2 >= 0 && e2 < 10) ? (0.95 + 0.05 * e2 / 10) : 1;
  };
  const withTap = (id, bx, by, bw, bh, fn) => {
    const s = tapScale(id);
    ctx.save(); ctx.translate(bx + bw / 2, by + bh / 2); ctx.scale(s, s); ctx.translate(-(bx + bw / 2), -(by + bh / 2));
    fn(); ctx.restore();
  };

  // 共有データ（tryブロック外で事前計算）
  const char = CHAR_POOL.find(c => c.id === game.playerLoadout.charId) || CHAR_POOL.find(c => c.id === 'char_basic')
    || { label: 'ROOKIE', hp: 100, atk: 1, def: 0, crit: 5, spd: 0, rarity: 'N', color: '#aaa' };
  const charCol = char.color || '#0cf';
  const rCol = RARITY_COLORS[char.rarity] || '#aaa';
  const wpDef = WEAPON_GACHA_POOL.find(w => w.id === game.playerLoadout.weaponId);
  const petSlots = Array.isArray(game.playerLoadout && game.playerLoadout.pets) ? game.playerLoadout.pets : [];
  const curPower = Math.round(
    char.hp * 0.6 + (char.atk - 1) * 250 + char.def * 4
    + (wpDef ? ({ 'N': 30, 'R': 80, 'SR': 160, 'SSR': 280, 'LR': 450 }[wpDef.rarity] || 0) : 0)
    + petSlots.filter(pid => pid && game.gachaInventory[pid]).length * 60
  );
  const recPower = Math.max(80, game.startStage * 120);
  const deltaPower = curPower - recPower;
  const sortieOk = curPower >= recPower;
  const ratioP = curPower / Math.max(recPower, 1);
  const recStageNum = Math.max(1, Math.round(curPower / 120));
  const tierOk = sortieOk && ratioP >= 1.15;
  const tierWarn = sortieOk && ratioP < 1.15;
  const diffLabel = tierOk ? '余裕' : tierWarn ? 'ギリ' : '不足';
  const diffCol = tierOk ? '#44ff88' : tierWarn ? '#ffdd44' : '#ff5544';
  const shortageSevere = !sortieOk && ratioP < 0.72;
  const diffChipNum = deltaPower >= 0 ? `+${deltaPower}` : `${deltaPower}`;
  const winPct = estimateSortieWinPct(ratioP, sortieOk);
  const stateStrip = `${diffLabel}  ${diffChipNum}`;

  try {
    const gTop = ctx.createLinearGradient(0, 0, 0, H);
    gTop.addColorStop(0, 'rgba(2,3,10,0.82)');
    gTop.addColorStop(0.55, 'rgba(8,4,12,0.78)');
    gTop.addColorStop(1, 'rgba(28,6,10,0.55)');
    ctx.fillStyle = gTop; ctx.fillRect(0, 0, W, H);
    if (!lowFx) {
      const laneT = t * 0.35;
      for (let li = 0; li < 2; li++) {
        const lx = W * 0.28 + li * W * 0.44;
        ctx.save();
        ctx.globalAlpha = 0.028 + 0.018 * Math.sin(laneT + li * 1.4);
        const lg = ctx.createLinearGradient(lx, 0, lx + 2, H);
        lg.addColorStop(0, 'rgba(255,80,40,0)');
        lg.addColorStop(0.5, 'rgba(255,120,60,0.22)');
        lg.addColorStop(1, 'rgba(255,40,20,0)');
        ctx.fillStyle = lg; ctx.fillRect(lx, 0, 3, H);
        ctx.restore();
      }
      const drift = (Date.now() / 1000) * 34;
      for (let pi = 0; pi < 36; pi++) {
        const sx = ((pi * 97) % W) + (pi % 3) * 0.5;
        const sy = ((pi * 53 + drift * (0.022 + 0.03 * (pi % 5))) % (H + 40)) - 20;
        const sz = 1.2 + (pi % 4) * 0.35;
        ctx.globalAlpha = 0.12 + 0.08 * (pi % 3);
        ctx.fillStyle = pi % 7 === 0 ? '#ffcca0' : '#aac8ff';
        ctx.fillRect(sx, sy, sz, sz + 1.2);
      }
      ctx.globalAlpha = 1;
    }
    const pg = ctx.createRadialGradient(W * 0.82, H * 0.34, 0, W * 0.82, H * 0.34, Math.min(W, H) * 0.38);
    pg.addColorStop(0, lowFx ? 'rgba(255,120,70,0.2)' : 'rgba(255,130,80,0.32)');
    pg.addColorStop(0.22, lowFx ? 'rgba(160,45,30,0.1)' : 'rgba(200,50,35,0.16)');
    pg.addColorStop(0.5, 'rgba(60,15,30,0.08)');
    pg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = pg; ctx.fillRect(0, 0, W, H);
    {
      const sx = customizeSpineX;
      const vg = ctx.createLinearGradient(sx - 4, 0, sx + 4, 0);
      vg.addColorStop(0, 'rgba(255,90,40,0)');
      vg.addColorStop(0.5, lowFx ? 'rgba(255,140,70,0.08)' : 'rgba(255,140,70,0.14)');
      vg.addColorStop(1, 'rgba(255,90,40,0)');
      ctx.fillStyle = vg; ctx.fillRect(sx - 3, 72, 7, H - 88);
    }
  } catch (e) { console.error('[drawCustomize:bg]', e); }

  // ── ヘッダー 2行（上：タイトル・資源・設定 / 下：6タブ）──────────────────
  try {
    ctx.fillStyle = 'rgba(4,8,18,0.94)'; ctx.fillRect(0, 0, W, 36);
    ctx.fillStyle = 'rgba(6,10,22,0.96)'; ctx.fillRect(0, 36, W, 36);
    ctx.strokeStyle = 'rgba(60,100,180,0.45)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, 72); ctx.lineTo(W, 72); ctx.stroke();
    ctx.strokeStyle = 'rgba(40,70,130,0.35)';
    ctx.beginPath(); ctx.moveTo(0, 36); ctx.lineTo(W, 36); ctx.stroke();

    ctx.shadowColor = pAccent; ctx.shadowBlur = 6;
    ctx.fillStyle = '#ddeeff'; ctx.font = 'bold 15px Orbitron,Courier New'; ctx.textAlign = 'left';
    ctx.fillText('出撃準備', MX, 24); ctx.shadowBlur = 0;

    const setHov = game.hoveredBtn && game.hoveredBtn.id === 'ui_hdr_set';
    ctx.fillStyle = setHov ? 'rgba(50,90,160,0.45)' : 'rgba(30,50,90,0.35)';
    ctx.strokeStyle = setHov ? 'rgba(120,180,255,0.65)' : 'rgba(70,110,170,0.4)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(MX + 108, 6, 34, 26, 6); ctx.fill(); ctx.stroke();
    ctx.fillStyle = setHov ? '#eaf4ff' : 'rgba(200,220,255,0.85)'; ctx.font = 'bold 14px Courier New'; ctx.textAlign = 'center';
    ctx.fillText('⚙', MX + 125, 24);

    syncFuel();
    ctx.fillStyle = 'rgba(160,200,255,0.92)'; ctx.font = 'bold 12px Orbitron,Courier New';
    ctx.shadowColor = '#66ccff'; ctx.shadowBlur = 3;
    ctx.textAlign = 'right';
    ctx.fillText(`⛽ ${Math.max(0, Math.floor(game.fuel || 0))}/${drawDeps.FUEL_CAP}`, 560, 23);
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(50,70,110,0.5)'; ctx.font = '13px Courier New'; ctx.textAlign = 'center';
    ctx.fillText('|', 572, 23);

    ctx.fillStyle = '#ffd700'; ctx.font = 'bold 12px Orbitron,Courier New';
    ctx.shadowColor = '#ffd700'; ctx.shadowBlur = 4;
    ctx.textAlign = 'right'; ctx.fillText(`● ${game.coins.toLocaleString()}`, 640, 23); ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(50,70,110,0.5)'; ctx.font = '13px Courier New'; ctx.textAlign = 'center';
    ctx.fillText('|', 652, 23);

    const plusHov = game.hoveredBtn && game.hoveredBtn.id === 'ui_gem_plus';
    ctx.fillStyle = plusHov ? 'rgba(80,160,255,0.5)' : 'rgba(80,160,255,0.25)';
    ctx.beginPath(); ctx.roundRect(700, 8, 26, 20, 4); ctx.fill();
    ctx.strokeStyle = plusHov ? '#88ccff' : '#44aaff'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.roundRect(700, 8, 26, 20, 4); ctx.stroke();
    ctx.fillStyle = '#88ccff'; ctx.shadowColor = '#88ccff'; ctx.shadowBlur = 4;
    ctx.font = 'bold 14px Orbitron,Courier New'; ctx.textAlign = 'center';
    ctx.fillText('+', 713, 22); ctx.shadowBlur = 0;
    ctx.fillStyle = '#bbddff'; ctx.font = 'bold 12px Orbitron,Courier New';
    ctx.shadowColor = '#aaddff'; ctx.shadowBlur = 4;
    ctx.textAlign = 'right'; ctx.fillText(`💎 ${game.gems.toLocaleString()}`, W - MX, 23); ctx.shadowBlur = 0;

    const _missHasPending = Array.isArray(game.activeMissions) && game.activeMissions.some(slot => {
      const mDef = MISSION_POOL.find(m => m.id === slot.missionId);
      if (!mDef) return false;
      try { return mDef.check(missionEffectiveProgress(slot)); } catch (e) { return false; }
    });
    const _gachaAlert = game.gachaPityCount >= 60;
    const topTabs = [
      {
        id: 'ui_hdr_notif', label: '受取', col: '#55ddff', cur: -1,
        badge: (Array.isArray(game.inbox) ? game.inbox.filter(x => !x.claimed).length : 0)
      },
      { id: 'ui_hdr_event', label: 'イベント', col: '#ff88cc', cur: -2, badge: 0 },
      { id: 'ui_gach', label: 'ガチャ', col: '#ffcc44', cur: 1, badge: _gachaAlert ? 1 : 0 },
      { id: 'ui_shop', label: '強化', col: '#ff9955', cur: 2, badge: 0 },
      { id: 'ui_miss', label: '任務', col: '#66ccff', cur: 3, badge: _missHasPending ? 1 : 0 },
      { id: 'ui_boss', label: 'ボス', col: '#ff7744', cur: 5, badge: 0 },
    ];
    topTabs.forEach((tab, i) => {
      const tx = i * navTabW, ty = navTabY, tw = navTabW, th = navTabH;
      const hov = game.hoveredBtn && game.hoveredBtn.id === tab.id;
      const active = tab.cur >= 0 && game.customizeCursor === tab.cur;
      const tap = tapScale(tab.id);
      ctx.save();
      ctx.translate(tx + tw / 2, ty + th / 2); ctx.scale(tap, tap); ctx.translate(-(tx + tw / 2), -(ty + th / 2));
      ctx.globalAlpha = 1;
      ctx.strokeStyle = active ? 'rgba(255,210,140,0.95)' : 'rgba(70,140,220,0.5)';
      ctx.lineWidth = active ? 2.2 : 1.1;
      ctx.beginPath(); ctx.roundRect(tx + 3, ty + 3, tw - 6, th - 6, 6); ctx.stroke();
      if (active) {
        ctx.fillStyle = 'rgba(255,220,140,0.1)';
        ctx.beginPath(); ctx.roundRect(tx + 4, ty + 4, tw - 8, th - 8, 5); ctx.fill();
        ctx.strokeStyle = '#ffdd55'; ctx.lineWidth = 2.4; ctx.shadowColor = '#ffcc33'; ctx.shadowBlur = lowFx ? 6 : 14;
        ctx.beginPath(); ctx.moveTo(tx + 6, ty + th - 2); ctx.lineTo(tx + tw - 6, ty + th - 2); ctx.stroke(); ctx.shadowBlur = 0;
      } else if (hov) {
        ctx.strokeStyle = 'rgba(120,200,255,0.55)'; ctx.lineWidth = 1.3;
        ctx.strokeRect(tx + 4, ty + 4, tw - 8, th - 8);
      }
      ctx.globalAlpha = active ? 1 : (hov ? 0.82 : 0.48);
      const tabDim = 'rgba(188,206,232,0.88)';
      ctx.fillStyle = active ? '#fffce8' : (hov ? '#f4f8ff' : tabDim);
      if (active && !lowFx) { ctx.shadowColor = '#ffdd55'; ctx.shadowBlur = 9; }
      ctx.font = 'bold 9px Orbitron,Courier New'; ctx.textAlign = 'center';
      ctx.fillText(tab.label, tx + tw / 2, ty + 22); ctx.shadowBlur = 0;
      if (active && tab.id === 'ui_gach') {
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#ffee66'; ctx.shadowColor = '#ffd700'; ctx.shadowBlur = 12;
        ctx.font = 'bold 15px Courier New';
        ctx.fillText('★', tx + tw - 12, ty + 20);
        ctx.shadowBlur = 0;
      }
      if (tab.badge > 0) {
        ctx.fillStyle = '#ff2244'; ctx.shadowColor = '#ff0022'; ctx.shadowBlur = 5;
        ctx.beginPath(); ctx.arc(tx + tw - 10, ty + 8, 5.5, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
        ctx.fillStyle = '#fff'; ctx.font = 'bold 7px Orbitron,Courier New';
        ctx.fillText('!', tx + tw - 10, ty + 10);
      }
      ctx.globalAlpha = 1;
      ctx.restore();
      if (i > 0) {
        ctx.strokeStyle = 'rgba(40,65,120,0.35)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(tx, ty + 6); ctx.lineTo(tx, ty + th - 6); ctx.stroke();
      }
    });
  } catch (e) { console.error('[drawCustomize:header]', e); }

  // ── 装備カード（折りたたみ時は最小情報・半透明）──────────────────────────
  try {
    const loadHov = game.hoveredBtn && game.hoveredBtn.id === 'ui_load';
    withTap('ui_load', MX, eY, CW, eH, () => {
      ctx.save();
      ctx.globalAlpha = compact ? 0.6 : 0.94;
      ctx.fillStyle = 'rgba(4,10,24,0.9)';
      ctx.strokeStyle = loadHov ? 'rgba(100,200,255,0.55)' : 'rgba(0,160,255,0.32)'; ctx.lineWidth = 1.2;
      ctx.shadowColor = '#0af'; ctx.shadowBlur = compact ? (loadHov ? 8 : 3) : (loadHov ? 10 : 6);
      ctx.beginPath(); ctx.roundRect(MX, eY, CW, eH, 12); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;
      drawCustomizeNeonBrackets(ctx, MX, eY, CW, eH, 12, 13, 'rgba(95,215,255,0.5)', 0.85);
      ctx.globalAlpha = 1;
      ctx.restore();
    });
    if (compact) {
      ctx.save(); ctx.globalAlpha = 0.6;
      ctx.fillStyle = 'rgba(0,140,255,0.06)';
      ctx.beginPath(); ctx.roundRect(MX + 1, eY + 1, CW - 2, 22, 10); ctx.fill();
      ctx.restore();
      ctx.fillStyle = 'rgba(200,220,255,0.45)'; ctx.font = 'bold 9px Orbitron,Courier New'; ctx.textAlign = 'left';
      ctx.fillText('装備', MX + 12, eY + 15);
      const expHov = game.hoveredBtn && game.hoveredBtn.id === 'ui_equip_expand';
      ctx.fillStyle = expHov ? 'rgba(60,90,140,0.5)' : 'rgba(30,45,80,0.4)';
      ctx.strokeStyle = expHov ? 'rgba(120,180,255,0.55)' : 'rgba(70,100,150,0.35)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.roundRect(MX + CW - 106, eY + 3, 94, 18, 6); ctx.fill(); ctx.stroke();
      ctx.fillStyle = expHov ? '#eef6ff' : 'rgba(200,220,255,0.72)'; ctx.font = 'bold 9px Orbitron,Courier New'; ctx.textAlign = 'center';
      ctx.fillText('▸ 詳細', MX + CW - 59, eY + 16);
      const icx = MX + CW / 2, icy = eY + eH * 0.38;
      ctx.save(); ctx.globalAlpha = 0.5;
      ctx.strokeStyle = 'rgba(140,190,255,0.5)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(icx, icy - 18); ctx.lineTo(icx + 16, icy - 4); ctx.lineTo(icx + 16, icy + 12);
      ctx.lineTo(icx - 16, icy + 12); ctx.lineTo(icx - 16, icy - 4); ctx.closePath(); ctx.stroke();
      ctx.fillStyle = 'rgba(80,120,180,0.25)'; ctx.fill();
      ctx.fillStyle = 'rgba(160,200,255,0.35)'; ctx.font = '18px Courier New'; ctx.textAlign = 'center';
      ctx.fillText('◇', icx, icy + 6);
      ctx.restore();
      ctx.fillStyle = 'rgba(210,230,255,0.5)'; ctx.font = '9px Orbitron,Courier New'; ctx.textAlign = 'center';
      ctx.fillText('タップで詳細 >', MX + CW / 2, eY + eH * 0.72);
    } else {
      ctx.fillStyle = 'rgba(0,185,255,0.08)';
      ctx.beginPath(); ctx.roundRect(MX + 1, eY + 1, CW - 2, 26, 11); ctx.fill();
      ctx.fillStyle = '#dff3ff'; ctx.font = 'bold 12px Orbitron,Courier New'; ctx.textAlign = 'left';
      ctx.fillText('装  備', MX + 14, eY + 17);
      const expHov = game.hoveredBtn && game.hoveredBtn.id === 'ui_equip_expand';
      ctx.fillStyle = expHov ? 'rgba(60,90,140,0.55)' : 'rgba(30,45,80,0.45)';
      ctx.strokeStyle = expHov ? 'rgba(120,180,255,0.65)' : 'rgba(70,100,150,0.4)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.roundRect(MX + CW - 106, eY + 3, 94, 18, 6); ctx.fill(); ctx.stroke();
      ctx.fillStyle = expHov ? '#eef6ff' : 'rgba(200,220,255,0.75)'; ctx.font = 'bold 9px Orbitron,Courier New'; ctx.textAlign = 'center';
      ctx.fillText('▾ 折りたたむ', MX + CW - 59, eY + 16);
      ctx.fillStyle = 'rgba(210,240,255,0.70)'; ctx.font = 'bold 10px Orbitron,Courier New'; ctx.textAlign = 'right';
      ctx.fillText('タップで編集 ▶', MX + CW - 118, eY + 17);

      const r1Y = eY + 30;
      const shipIcX = MX + 26, shipIcY = r1Y + 14;
      ctx.fillStyle = charCol + '1a';
      ctx.beginPath(); ctx.arc(shipIcX, shipIcY, 22, 0, Math.PI * 2); ctx.fill();
      ctx.save(); ctx.translate(shipIcX, shipIcY);
      const shipGlow = (char.rarity === 'LR' && !lowFx) ? 38 : (char.rarity === 'LR' ? 22 : 18);
      ctx.fillStyle = charCol; ctx.shadowColor = charCol; ctx.shadowBlur = shipGlow;
      drawDeps.drawShipShape(-20, -13, 40, 26, pickCharShipShape(char), charCol, char.rarity);
      ctx.shadowBlur = 0; ctx.restore();
      ctx.fillStyle = rCol + '22'; ctx.strokeStyle = rCol + '88'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.roundRect(MX + 70, r1Y + 2, 34, 16, 4); ctx.fill(); ctx.stroke();
      ctx.fillStyle = rCol; ctx.font = 'bold 9px Orbitron,Courier New'; ctx.textAlign = 'center';
      ctx.fillText(char.rarity, MX + 87, r1Y + 13);
      ctx.fillStyle = '#f4fbff'; ctx.font = 'bold 14px Orbitron,Courier New'; ctx.textAlign = 'left';
      ctx.shadowColor = charCol; ctx.shadowBlur = 2;
      ctx.fillText(char.label, MX + 112, r1Y + 15); ctx.shadowBlur = 0;

      const sbx = MX + 12, sbw = CW - 24;
      let hp2 = char.hp, atk2 = char.atk, def2 = char.def;
      try {
        const eids = Array.isArray(game.playerLoadout?.equip) ? game.playerLoadout.equip : [];
        for (const eid of eids) {
          if (!eid) continue;
          const eq = EQUIP_POOL.find(e => e.id === eid);
          if (!eq || !game.gachaInventory?.[eid]) continue;
          hp2 += eq.hp || 0;
          atk2 *= eq.atk || 1;
          def2 += eq.def || 0;
        }
      } catch (e) { }
      const atkPct = Math.round((atk2 - 1) * 100);
      const atkEmpty = atkPct <= 0;
      const keyStatsAll = [
        { l: 'HP', v: Math.round(hp2), max: 230, c: '#00ff88', empty: false },
        { l: 'ATK', v: atkPct, max: 60, c: '#ff8844', empty: atkEmpty },
        { l: 'DEF', v: Math.round(def2), max: 50, c: '#44aaff', empty: false },
      ];
      const statGap = 26;
      const sbBase = eY + 56;
      const barMinW = 6;
      keyStatsAll.forEach((s, i) => {
        const sby = sbBase + i * statGap;
        const ratio = s.empty ? 0 : Math.min(1, Math.max(0, s.v) / s.max);
        ctx.fillStyle = s.empty ? '#7e8ca2' : '#e8f5ff'; ctx.font = 'bold 11px Orbitron,Courier New'; ctx.textAlign = 'left';
        ctx.fillText(s.empty ? `${s.l}  未装備` : `${s.l}  ${s.v}`, sbx, sby + 8);
        ctx.fillStyle = '#06090f'; ctx.fillRect(sbx, sby + 11, sbw, 8);
        if (!s.empty) {
          const sg = ctx.createLinearGradient(sbx, 0, sbx + sbw, 0);
          sg.addColorStop(0, s.c + '55'); sg.addColorStop(1, s.c);
          ctx.fillStyle = sg; ctx.shadowColor = s.c; ctx.shadowBlur = 3;
          ctx.fillRect(sbx, sby + 11, Math.max(barMinW, sbw * ratio), 8); ctx.shadowBlur = 0;
          ctx.fillStyle = 'rgba(0,0,0,0.62)';
          ctx.font = 'bold 9px Orbitron,Courier New'; ctx.textAlign = 'right';
          ctx.fillText(String(s.v), sbx + Math.max(barMinW + 14, sbw * ratio) - 2, sby + 18);
        } else {
          ctx.fillStyle = 'rgba(80,90,110,0.45)';
          ctx.fillRect(sbx, sby + 11, barMinW, 8);
        }
      });

      const botY = eY + eH - 28;
      ctx.strokeStyle = 'rgba(30,50,80,0.5)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(MX + 10, botY - 3); ctx.lineTo(MX + CW - 10, botY - 3); ctx.stroke();
      ctx.fillStyle = 'rgba(230,245,255,0.70)'; ctx.font = 'bold 10px Orbitron,Courier New'; ctx.textAlign = 'left';
      ctx.fillText('武器', sbx, botY + 11);
      ctx.fillStyle = wpDef ? (wpDef.color || '#ffe7aa') : 'rgba(190,210,230,0.45)'; ctx.font = 'bold 11px Orbitron,Courier New';
      ctx.fillText(wpDef ? wpDef.label : 'なし', sbx + 34, botY + 11);
      ctx.fillStyle = 'rgba(230,245,255,0.70)'; ctx.font = 'bold 10px Orbitron,Courier New'; ctx.textAlign = 'right';
      ctx.fillText('ペット', MX + CW - 100, botY + 11);
      for (let pi = 0; pi < 3; pi++) {
        const pid = petSlots[pi];
        const pDef = PET_POOL.find(x => x.id === pid);
        const pix = MX + CW - 74 + pi * 24;
        if (pDef && game.gachaInventory[pid]) {
          ctx.fillStyle = pDef.color; ctx.shadowColor = pDef.color; ctx.shadowBlur = 4;
          ctx.beginPath(); ctx.arc(pix, botY + 7, 7, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
        } else {
          ctx.strokeStyle = '#222240'; ctx.fillStyle = 'rgba(10,10,22,0.8)';
          ctx.beginPath(); ctx.arc(pix, botY + 7, 7, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        }
      }
    }

  } catch (e) { console.error('[drawCustomize:equip]', e); }

  // ── 出撃前パネル（中央：STAGE主役 → 戦力バー → 状態行 → ステージ変更）──
  try {
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1;
    ctx.fillStyle = 'rgba(3,6,16,0.72)';
    ctx.strokeStyle = 'rgba(80,180,255,0.42)'; ctx.lineWidth = 1.25;
    ctx.beginPath(); ctx.roundRect(MX, infoY, CW, infoH, 12); ctx.fill(); ctx.stroke();
    drawCustomizeNeonBrackets(ctx, MX, infoY, CW, infoH, 12, 15, 'rgba(110,230,255,0.55)', 0.9);

    const heroY = infoY + 10;
    const hx = W / 2, hy = heroY + 26;
    const stageBandH = Math.min(118, infoH - 8);
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(MX + 1, infoY + 1, CW - 2, stageBandH, 10);
    ctx.clip();
    const skyG = ctx.createLinearGradient(0, infoY, 0, infoY + stageBandH);
    skyG.addColorStop(0, 'rgba(6,3,16,0.98)');
    skyG.addColorStop(0.5, 'rgba(28,8,14,0.94)');
    skyG.addColorStop(1, 'rgba(62,14,8,0.99)');
    ctx.fillStyle = skyG; ctx.fillRect(MX, infoY, CW, stageBandH);
    const mBase = infoY + stageBandH - 2;
    ctx.fillStyle = 'rgba(12,3,6,0.99)';
    ctx.beginPath(); ctx.moveTo(MX - 4, mBase + 8);
    for (let mi = 0; mi <= 14; mi++) {
      const px = MX - 6 + (mi / 14) * (CW + 12);
      const ph = 10 + ((mi * 19) % 26) + (mi % 4) * 5;
      ctx.lineTo(px, mBase + 8 - ph);
    }
    ctx.lineTo(MX + CW + 6, mBase + 8); ctx.lineTo(MX + CW + 6, mBase + 40); ctx.lineTo(MX - 4, mBase + 40); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(90,22,12,0.55)';
    ctx.beginPath(); ctx.moveTo(MX - 8, mBase + 4);
    for (let mi = 0; mi <= 10; mi++) {
      const px = MX - 14 + (mi / 10) * (CW + 28);
      const ph = 5 + ((mi * 13) % 12);
      ctx.lineTo(px, mBase + 4 - ph);
    }
    ctx.lineTo(MX + CW + 18, mBase + 4); ctx.lineTo(MX + CW + 18, mBase + 36); ctx.lineTo(MX - 8, mBase + 36); ctx.closePath(); ctx.fill();
    if (!lowFx) {
      const emT = t * 38;
      for (let ei = 0; ei < 32; ei++) {
        const ex = MX + ((ei * 131 + emT * 2.8) % CW);
        const ey = infoY + stageBandH - ((ei * 47 + emT * 11) % (stageBandH + 40));
        ctx.globalAlpha = 0.12 + 0.42 * (((ei * 7 + emT) % 13) / 13);
        ctx.fillStyle = ei % 5 === 0 ? '#ffcc88' : '#ff5522';
        ctx.shadowColor = '#ff3300'; ctx.shadowBlur = 5;
        ctx.fillRect(ex, ey, 1.2 + (ei & 1), 2 + (ei & 2)); ctx.shadowBlur = 0;
      }
      ctx.globalAlpha = 1;
    }
    ctx.restore();
    const stagePulse = 0.55 + 0.45 * Math.sin(t * Math.PI);
    if (!lowFx) {
      const rg = ctx.createRadialGradient(hx, hy, 0, hx, hy, 140);
      rg.addColorStop(0, `rgba(255,50,35,${0.16 * stagePulse})`);
      rg.addColorStop(0.45, `rgba(180,25,18,${0.08 * stagePulse})`);
      rg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = rg; ctx.fillRect(MX, infoY, CW, Math.min(128, infoH));
    }
    ctx.textAlign = 'center';
    const stageFs = Math.round(26 * 1.42);
    ctx.font = `bold ${stageFs}px Orbitron,Courier New`;
    const stTxt = `STAGE  ${formatStageId(game.startStage)}`;
    ctx.lineWidth = lowFx ? 2 : 3.2;
    ctx.strokeStyle = 'rgba(0,242,255,0.28)';
    ctx.strokeText(stTxt, W / 2, heroY + 32);
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(255,255,255,0.75)'; ctx.shadowBlur = lowFx ? 8 : 20;
    ctx.fillText(stTxt, W / 2, heroY + 32); ctx.shadowBlur = 0;
    ctx.fillStyle = pStage.accent; ctx.font = 'bold 11px Orbitron,Courier New';
    ctx.shadowColor = pStage.accent; ctx.shadowBlur = lowFx ? 2 : 5;
    ctx.fillText(`${pStage.kanji}  ${pStage.name}`, W / 2, heroY + 46); ctx.shadowBlur = 0;
    ctx.save();
    ctx.globalAlpha = 0.6;
    ctx.fillStyle = 'rgba(200,215,240,0.9)'; ctx.font = 'bold 8px Orbitron,Courier New';
    ctx.fillText('★ 条件', W / 2, heroY + 58);
    ctx.fillStyle = 'rgba(220,230,250,0.9)'; ctx.font = 'bold 8px Orbitron,Courier New';
    ctx.fillText('★3 ノーダメ  ★2 最大コンボ5  ★1 クリア', W / 2, heroY + 70);
    ctx.restore();

    const powTop = infoY + 88;
    const winBoxW = 102;
    const sideW = winBoxW + 6;
    const iBarX = MX + 14, iBarW = CW - 28 - sideW;
    const scaleMax = Math.max(curPower, recPower) * 1.15;
    const barH = 8, barY = powTop + 24;
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(120,220,255,0.92)'; ctx.font = 'bold 9px Orbitron,Courier New';
    ctx.shadowColor = '#00d8ff'; ctx.shadowBlur = lowFx ? 0 : 6;
    ctx.fillText('戦力', iBarX, powTop - 2); ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(248,252,255,0.92)'; ctx.font = 'bold 9px Orbitron,Courier New';
    ctx.fillText('現在', iBarX, powTop + 10);
    ctx.fillStyle = diffCol; ctx.font = 'bold 20px Orbitron,Courier New';
    const curPowW = ctx.measureText(String(curPower)).width;
    ctx.shadowColor = diffCol; ctx.shadowBlur = lowFx ? 3 : 9;
    ctx.fillText(String(curPower), iBarX + 36, powTop + 10); ctx.shadowBlur = 0;
    ctx.font = 'bold 11px Orbitron,Courier New';
    ctx.fillStyle = diffCol;
    ctx.fillText(`差 ${diffChipNum}`, iBarX + 36 + curPowW + 8, powTop + 10);

    ctx.fillStyle = 'rgba(12,18,40,0.98)'; ctx.strokeStyle = 'rgba(40,70,130,0.65)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(iBarX, barY, iBarW, barH, 4); ctx.fill(); ctx.stroke();
    const innerPad = 2, innerW = iBarW - innerPad * 2, fillW = Math.max(6, Math.min(1, curPower / scaleMax) * innerW);
    const bx0 = iBarX + innerPad, bx1 = bx0 + fillW;
    const barGrad = ctx.createLinearGradient(bx0, 0, bx1, 0);
    barGrad.addColorStop(0, '#0a8f44');
    barGrad.addColorStop(0.45, '#c8e020');
    barGrad.addColorStop(1, '#ff4422');
    ctx.fillStyle = barGrad; ctx.shadowColor = 'rgba(255,200,80,0.35)'; ctx.shadowBlur = lowFx ? 0 : 4;
    ctx.beginPath(); ctx.roundRect(bx0, barY + innerPad, fillW, barH - innerPad * 2, 3); ctx.fill(); ctx.shadowBlur = 0;
    const curPx = iBarX + (curPower / scaleMax) * iBarW;
    const curDotX = Math.min(iBarX + iBarW - innerPad - 3, Math.max(iBarX + innerPad + 3, curPx));
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.95)'; ctx.shadowColor = '#aef'; ctx.shadowBlur = lowFx ? 2 : 8;
    ctx.beginPath(); ctx.arc(curDotX, barY + barH / 2, 4.2, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.restore();
    if (!lowFx) {
      const sweep = (Date.now() % 1500) / 1500;
      const sx = bx0 + 4 + (innerW - 8) * sweep;
      ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.lineWidth = 2; ctx.globalAlpha = 0.7;
      ctx.beginPath(); ctx.moveTo(sx, barY + 1); ctx.lineTo(sx, barY + barH - 1); ctx.stroke();
      ctx.globalAlpha = 1;
    }
    const recX = iBarX + (recPower / scaleMax) * iBarW;
    const recBlink = 0.45 + 0.55 * Math.sin((Date.now() / 800) * Math.PI * 2);
    ctx.strokeStyle = `rgba(255,255,255,${0.55 + 0.4 * recBlink})`;
    ctx.shadowColor = `rgba(255,255,255,${0.35 * recBlink})`; ctx.shadowBlur = lowFx ? 0 : 6 * recBlink;
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(recX, barY - 2); ctx.lineTo(recX, barY + barH + 2); ctx.stroke(); ctx.shadowBlur = 0;
    ctx.textAlign = 'center';
    ctx.fillStyle = `rgba(200,215,240,${0.45 + 0.35 * recBlink})`; ctx.font = 'bold 7px Orbitron,Courier New';
    ctx.fillText(`推奨${recPower}`, recX, barY - 3);
    const winBoxX = MX + CW - winBoxW - 12;
    const winBoxY = powTop - 10;
    const winBoxH = 56;
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(3,28,16,0.94)';
    ctx.strokeStyle = tierOk ? 'rgba(0,255,136,0.82)' : (tierWarn ? 'rgba(255,200,80,0.75)' : 'rgba(255,90,90,0.78)');
    ctx.lineWidth = 1.4;
    ctx.shadowColor = tierOk ? '#00ff88' : (tierWarn ? '#ffcc44' : '#ff5544');
    ctx.shadowBlur = lowFx ? 4 : 12;
    ctx.beginPath(); ctx.roundRect(winBoxX, winBoxY, winBoxW, winBoxH, 8); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;
    drawCustomizeNeonBrackets(ctx, winBoxX, winBoxY, winBoxW, winBoxH, 8, 8, tierOk ? 'rgba(0,255,160,0.45)' : 'rgba(255,160,100,0.4)', 0.7);
    ctx.fillStyle = 'rgba(180,240,210,0.88)'; ctx.font = 'bold 8px Orbitron,Courier New';
    ctx.fillText('勝率見積', winBoxX + winBoxW / 2, winBoxY + 16);
    ctx.fillStyle = tierOk ? '#66ffcc' : (tierWarn ? '#ffdd88' : '#ff9988');
    ctx.font = 'bold 22px Orbitron,Courier New';
    ctx.shadowColor = tierOk ? '#00ffaa' : (tierWarn ? '#ffcc55' : '#ff6655');
    ctx.shadowBlur = lowFx ? 4 : 10;
    ctx.fillText(`${winPct}%`, winBoxX + winBoxW / 2, winBoxY + 42); ctx.shadowBlur = 0;
    ctx.textAlign = 'left';

    const tipY = barY + barH + 12;
    ctx.font = 'bold 8px Orbitron,Courier New';
    if (!sortieOk) {
      ctx.fillStyle = 'rgba(255,150,100,0.85)';
      ctx.fillText(`あと ${-deltaPower} で推奨到達`, iBarX, tipY);
    } else {
      ctx.fillStyle = 'rgba(100,200,160,0.65)';
      ctx.fillText(`対応目安 〜 STAGE ${recStageNum}`, iBarX, tipY);
    }

    const stripY = stageSelY - 26;
    ctx.fillStyle = 'rgba(6,10,20,0.92)'; ctx.strokeStyle = diffCol + '66'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(MX + 10, stripY, CW - 20, 22, 6); ctx.fill(); ctx.stroke();
    ctx.fillStyle = diffCol; ctx.font = 'bold 14px Courier New'; ctx.textAlign = 'left';
    ctx.fillText('■', MX + 18, stripY + 15);
    ctx.font = 'bold 11px Orbitron,Courier New';
    ctx.fillText(stateStrip, MX + 34, stripY + 15);

    const stageRowHov = game.hoveredBtn && game.hoveredBtn.id === 'ui_stage_sel';
    ctx.fillStyle = stageRowHov ? 'rgba(28,68,158,0.55)' : 'rgba(14,28,64,0.55)';
    ctx.strokeStyle = stageRowHov ? 'rgba(80,160,255,0.65)' : 'rgba(44,90,190,0.35)'; ctx.lineWidth = 1.2;
    if (stageRowHov) { ctx.shadowColor = '#4488ff'; ctx.shadowBlur = 10; }
    ctx.beginPath(); ctx.roundRect(MX + 8, stageSelY, CW - 16, stageSelH, 8); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;
    drawCustomizeNeonBrackets(ctx, MX + 8, stageSelY, CW - 16, stageSelH, 8, 10, 'rgba(100,200,255,0.4)', 0.75);
    ctx.fillStyle = 'rgba(190,215,250,0.88)'; ctx.font = 'bold 10px Orbitron,Courier New'; ctx.textAlign = 'left';
    ctx.fillText(`出撃ステージ  ${formatStageId(game.startStage)}`, MX + 18, stageSelY + 24);
    const chgW = 124, chgX = MX + CW - 12 - chgW;
    ctx.fillStyle = stageRowHov ? 'rgba(40,110,255,0.42)' : 'rgba(20,55,160,0.28)';
    ctx.strokeStyle = stageRowHov ? 'rgba(90,170,255,0.75)' : 'rgba(50,110,220,0.4)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(chgX, stageSelY + 7, chgW, 22, 5); ctx.fill(); ctx.stroke();
    ctx.fillStyle = stageRowHov ? '#eaf4ff' : 'rgba(180,205,255,0.88)'; ctx.font = 'bold 8px Orbitron,Courier New'; ctx.textAlign = 'center';
    ctx.fillText('ステージ変更 >', chgX + chgW / 2, stageSelY + 22);

  } catch (e) { console.error('[drawCustomize:info]', e); }

  const btnCxPre = bMX + bCW / 2;
  const btnCyPre = startY2 + startH2 / 2;
  const hexRPre = Math.min(bCW, startH2) * 0.44;
  const yLineEnd = btnCyPre - hexRPre - 4;
  const ey0Line = eY + eH - 8;
  const xSpine = customizeSpineX;
  const yBend = ey0Line + (yLineEnd - ey0Line) * 0.5;
  const hitBoost = lowFx ? 0 : (0.2 + 0.2 * Math.sin(t * 2.6));

  // ⑥ 装備〜出撃：直交ルートの細ライン（旧オレンジ曲線・粒子は廃止）
  ctx.save();
  ctx.lineCap = 'square';
  ctx.lineJoin = 'miter';
  ctx.globalAlpha = lowFx ? 0.26 : 0.48;
  ctx.strokeStyle = `rgba(120,230,255,${0.45 + 0.2 * Math.sin(t * 1.6)})`;
  ctx.shadowColor = 'rgba(0,210,255,0.4)';
  ctx.shadowBlur = lowFx ? 0 : 5;
  ctx.lineWidth = lowFx ? 0.85 : 1.1;
  ctx.setLineDash(lowFx ? [] : [4, 6]);
  ctx.beginPath();
  ctx.moveTo(xSpine, ey0Line);
  ctx.lineTo(xSpine, yBend);
  ctx.lineTo(btnCxPre, yBend);
  ctx.lineTo(btnCxPre, yLineEnd);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.shadowBlur = 0;
  ctx.globalAlpha *= 0.55;
  ctx.strokeStyle = 'rgba(255,130,70,0.35)';
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.moveTo(xSpine + 3, ey0Line + 2);
  ctx.lineTo(xSpine + 3, yBend);
  ctx.lineTo(btnCxPre - 3, yBend);
  ctx.lineTo(btnCxPre - 3, yLineEnd);
  ctx.stroke();
  ctx.restore();

  // ── 出撃ボタン（全幅・高さ大・外周グロー・1.5秒パルス＋微スケール）──────
  try {
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1;
    const startPulse = 0.5 + 0.5 * Math.sin((t * Math.PI * 2) / 1.5);
    const redFlash = 0.5 + 0.5 * Math.sin(t * 10);
    const startFocused = game.customizeCursor === 4;
    const strHov = game.hoveredBtn && game.hoveredBtn.id === 'ui_strt';
    const btnCx = bMX + bCW / 2, btnCy = startY2 + startH2 / 2;
    const idlePulse = 1 + 0.015 * Math.sin((t * Math.PI * 2) / 1.5);

    const hexR = Math.min(bCW, startH2) * 0.44;
    const hexHalf = hexR * (Math.sqrt(3) / 2);
    const strokeHexGlow = (R, lw, col, blur) => {
      fillRoundHex(ctx, btnCx, btnCy, R);
      ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.shadowColor = col; ctx.shadowBlur = blur;
      ctx.stroke(); ctx.shadowBlur = 0;
    };
    if (sortieOk) {
      strokeHexGlow(hexR + 7, 2, `rgba(0,255,136,${0.12 + 0.1 * startPulse})`, lowFx ? 5 : 12 + 8 * startPulse);
    } else if (shortageSevere) {
      strokeHexGlow(hexR + 6, 2, `rgba(255,40,40,${0.3 + 0.35 * redFlash})`, lowFx ? 6 : 14 + 12 * redFlash);
    }
    if (startFocused) {
      strokeHexGlow(hexR + 9, 2.5, `rgba(80,200,255,${0.2 + 0.14 * startPulse})`, 16 + 10 * startPulse);
    }

    withTap('ui_strt', bMX, startY2, bCW, startH2, () => {
      ctx.save();
      ctx.translate(btnCx, btnCy); ctx.scale(idlePulse, idlePulse); ctx.translate(-btnCx, -btnCy);
      fillRoundHex(ctx, btnCx, btnCy, hexR);
      const rg = ctx.createRadialGradient(btnCx, btnCy, hexR * 0.1, btnCx, btnCy, hexR * 1.05);
      if (sortieOk) {
        rg.addColorStop(0, 'rgba(255,255,250,0.98)'); rg.addColorStop(0.14, '#fff2e8'); rg.addColorStop(0.38, '#ff8833');
        rg.addColorStop(0.72, '#ff2208'); rg.addColorStop(1, '#1a0504');
      } else if (shortageSevere) {
        rg.addColorStop(0, '#886666'); rg.addColorStop(0.5, '#331010'); rg.addColorStop(1, '#0a0202');
      } else {
        rg.addColorStop(0, 'rgba(255,240,230,0.95)'); rg.addColorStop(0.35, '#ffaa44'); rg.addColorStop(0.7, '#cc3310'); rg.addColorStop(1, '#200808');
      }
      ctx.fillStyle = rg;
      const glowAmt = (lowFx ? 12 : 32) + (18 * startPulse) + (hitBoost * 28) + (strHov ? 14 : 0);
      ctx.shadowColor = '#ff4e00'; ctx.shadowBlur = glowAmt;
      ctx.fill(); ctx.shadowBlur = 0;
      ctx.strokeStyle = 'rgba(255,245,230,0.95)'; ctx.lineWidth = 2;
      if (strHov) { ctx.shadowColor = 'rgba(255,220,180,0.55)'; ctx.shadowBlur = 16; }
      fillRoundHex(ctx, btnCx, btnCy, hexR); ctx.stroke(); ctx.shadowBlur = 0;
      ctx.strokeStyle = `rgba(255,80,40,${0.4 + 0.22 * startPulse})`; ctx.lineWidth = 2.4;
      ctx.shadowColor = 'rgba(255,40,20,0.6)'; ctx.shadowBlur = 12 + 10 * startPulse;
      fillRoundHex(ctx, btnCx, btnCy, hexR + 2.8); ctx.stroke(); ctx.shadowBlur = 0;
      ctx.restore();
    });
    const arrCol = `rgba(255,120,50,${0.55 + 0.35 * startPulse})`;
    ctx.strokeStyle = arrCol; ctx.lineWidth = 2.8; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.shadowColor = 'rgba(255,90,30,0.65)'; ctx.shadowBlur = lowFx ? 0 : 8;
    const tipL = btnCx - hexHalf - 2, tipR = btnCx + hexHalf + 2;
    const arrIn = 10;
    ctx.beginPath();
    ctx.moveTo(bMX + 8, btnCy); ctx.lineTo(tipL - arrIn, btnCy);
    ctx.moveTo(tipL - arrIn - 2, btnCy - 9); ctx.lineTo(tipL - 2, btnCy); ctx.lineTo(tipL - arrIn - 2, btnCy + 9);
    ctx.moveTo(bMX + bCW - 8, btnCy); ctx.lineTo(tipR + arrIn, btnCy);
    ctx.moveTo(tipR + arrIn + 2, btnCy - 9); ctx.lineTo(tipR + 2, btnCy); ctx.lineTo(tipR + arrIn + 2, btnCy + 9);
    ctx.stroke(); ctx.shadowBlur = 0;
    const pillW = sortieOk ? 104 : 78, pillH = 23, pillX = btnCx - pillW / 2, pillY = btnCy - hexR - pillH - 8;
    ctx.save();
    if (sortieOk) {
      ctx.fillStyle = 'rgba(5,28,14,0.96)'; ctx.strokeStyle = 'rgba(70,255,150,0.92)'; ctx.lineWidth = 1.5;
      ctx.shadowColor = '#44ff88'; ctx.shadowBlur = lowFx ? 5 : 12;
    } else {
      ctx.fillStyle = 'rgba(36,8,10,0.96)'; ctx.strokeStyle = 'rgba(255,110,110,0.92)'; ctx.lineWidth = 1.5;
      ctx.shadowColor = '#ff3333'; ctx.shadowBlur = lowFx ? 5 : 12;
    }
    ctx.beginPath(); ctx.roundRect(pillX, pillY, pillW, pillH, 10); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;
    ctx.fillStyle = sortieOk ? '#d8ffe8' : '#ffe0e0'; ctx.font = 'bold 10px Orbitron,Courier New'; ctx.textAlign = 'center';
    ctx.fillText(sortieOk ? '推奨OK！' : '危険！', btnCx, pillY + 16);
    ctx.restore();
    ctx.fillStyle = '#fffaf8'; ctx.font = 'bold 24px Orbitron,Courier New'; ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(0,0,0,0.55)'; ctx.shadowBlur = 5;
    ctx.fillText('出撃', btnCx, btnCy - 2); ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255,250,245,0.85)'; ctx.font = 'bold 9px Orbitron,Courier New';
    ctx.fillText('タップして開始', btnCx, btnCy + 14);
    const costY = btnCy + hexR - 10, chipR = bMX + bCW - 8;
    ctx.fillStyle = 'rgba(30,8,8,0.95)'; ctx.strokeStyle = 'rgba(255,90,90,0.55)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(chipR - 46, costY - 15, 44, 15, 3); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ff3333'; ctx.fillRect(chipR - 42, costY - 12, 9, 8);
    ctx.fillStyle = '#ffc8c8'; ctx.font = 'bold 9px Orbitron,Courier New'; ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(255,60,60,0.45)'; ctx.shadowBlur = 4;
    ctx.fillText(`−${drawDeps.FUEL_COST_PER_RUN}`, chipR - 24, costY - 2); ctx.shadowBlur = 0;
    ctx.textAlign = 'left';
  } catch (e) { console.error('[drawCustomize:start]', e); }
}

export function drawMissionsScreen() {
  try { ensureDailyMissions(); ensureNormalQuestProfile(); } catch (e) { console.error(e); }
  if (!(game.missionClaimedSet instanceof Set)) game.missionClaimedSet = new Set();
  if (!(game.questClaimedIds instanceof Set)) game.questClaimedIds = new Set();
  if (!Number.isFinite(game.missionsScrollY)) game.missionsScrollY = 0;

  const MX = 16, CW = W - MX * 2;
  const pAccent = getPlanet(game.highestStage).accent;
  const HEADER_H = 46;
  const FOOTER_Y = 546;
  const VIEW_H = FOOTER_Y - HEADER_H;
  const dbx = MX + 6, dbw = CW - 12;

  // 背景
  ctx.fillStyle = '#030609'; ctx.fillRect(0, 0, W, H);

  // ── コンテンツ高さ計算 ──
  const DAILY_CARD_H = 76;
  const QUEST_ROW_H = 54;
  const PAD = 12;
  const activeSlotCount = Array.isArray(game.activeMissions) ? game.activeMissions.length : 0;
  const dailySectionH = 32 + activeSlotCount * DAILY_CARD_H;
  const _qClaimed0 = game.questClaimedIds instanceof Set ? game.questClaimedIds : new Set();
  const _visibleQuests = NORMAL_QUEST_POOL.filter(q => !_qClaimed0.has(q.id));
  const questSectionH = 32 + _visibleQuests.length * QUEST_ROW_H + PAD;
  const totalContentH = PAD + dailySectionH + 14 + questSectionH;
  const maxScroll = Math.max(0, totalContentH - VIEW_H);
  game.missionsScrollY = Math.min(maxScroll, game.missionsScrollY);
  game._missionClaimHits = [];

  // ── スクロール領域クリップ ──
  ctx.save();
  ctx.beginPath(); ctx.rect(0, HEADER_H, W, VIEW_H); ctx.clip();
  const oy = HEADER_H - game.missionsScrollY;

  // ─── DAILY MISSION セクション ───────────────────
  let dailyDone = 0;
  for (let i = 0; i < 3; i++) if (game.missionClaimedSet.has(i)) dailyDone++;
  const dy = oy + PAD;
  const slots = Array.isArray(game.activeMissions) ? game.activeMissions : [];

  // ─── ACTIVE MISSION セクション ────────────────────
  ctx.fillStyle = 'rgba(255,140,50,0.1)';
  ctx.beginPath(); ctx.roundRect(dbx, dy, dbw, 28, 4); ctx.fill();
  ctx.fillStyle = '#ffaa55'; ctx.font = 'bold 13px Orbitron,Courier New'; ctx.textAlign = 'left';
  ctx.shadowColor = '#ff9933'; ctx.shadowBlur = 6;
  ctx.fillText('MISSION', dbx + 10, dy + 19); ctx.shadowBlur = 0;
  ctx.fillStyle = '#778899'; ctx.font = '9px Orbitron,Courier New'; ctx.textAlign = 'right';
  ctx.fillText('達成したらタップで受取', dbx + dbw - 8, dy + 19);

  if (!Array.isArray(game.missionClaimAnim)) game.missionClaimAnim = [];
  const pulse3 = 0.85 + Math.sin(game.frameCount * 0.09) * 0.15;

  for (let mi = 0; mi < slots.length; mi++) {
    const slot = slots[mi];
    const mDef = MISSION_POOL.find(m => m.id === slot.missionId);
    if (!mDef) continue;
    const ep = missionEffectiveProgress(slot);
    let completed = false; try { completed = mDef.check(ep); } catch (e2) { }
    let pr = null; try { pr = mDef.progress(ep); } catch (e2) { }

    const ry = dy + 32 + mi * DAILY_CARD_H;
    const cardH = DAILY_CARD_H - 4;

    ctx.fillStyle = completed ? 'rgba(0,40,15,0.97)' : 'rgba(8,14,30,0.95)';
    ctx.strokeStyle = completed ? `rgba(0,220,80,${0.5 + pulse3 * 0.3})` : 'rgba(60,90,150,0.6)';
    ctx.lineWidth = completed ? 2 : 1.5;
    if (completed) { ctx.shadowColor = '#00ff88'; ctx.shadowBlur = 8 * pulse3; }
    ctx.beginPath(); ctx.roundRect(dbx, ry, dbw, cardH, 8); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;

    // アイコン
    const icx = dbx + 26, icy = ry + cardH / 2;
    ctx.fillStyle = completed ? 'rgba(0,180,60,0.9)' : 'rgba(8,18,42,0.9)';
    ctx.strokeStyle = completed ? '#00ee55' : '#3a5070'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(icx, icy, 14, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = completed ? '#fff' : '#4d6080'; ctx.font = 'bold 15px Courier New'; ctx.textAlign = 'center';
    ctx.fillText(completed ? '✓' : '○', icx, icy + 5.5);

    const tx = dbx + 50;
    ctx.fillStyle = completed ? '#66ee99' : '#e0eeff'; ctx.font = 'bold 13px Orbitron,Courier New'; ctx.textAlign = 'left';
    ctx.shadowColor = completed ? '#00ff88' : 'transparent'; ctx.shadowBlur = completed ? 5 : 0;
    ctx.fillText(mDef.label, tx, ry + 20); ctx.shadowBlur = 0;

    // 報酬
    const r = mDef.reward;
    const rStr = `● ${r.coins}${r.gems ? `  💎 ${r.gems}` : ''}${r.dust ? `  ✦ ${r.dust}` : ''}  ⛽ 1`;
    ctx.fillStyle = '#bbaa55'; ctx.font = '10px Orbitron,Courier New'; ctx.textAlign = 'left';
    ctx.fillText(rStr, tx, ry + 36);

    if (completed) {
      // 受取ボタン
      const bw3 = 80, bh3 = 18, bx3 = dbx + dbw - bw3 - 6, by3 = ry + cardH - bh3 - 6;
      ctx.fillStyle = `rgba(0,${Math.round(120 + 60 * pulse3)},40,0.9)`; ctx.strokeStyle = '#00ff88'; ctx.lineWidth = 1.5;
      ctx.shadowColor = '#00ff88'; ctx.shadowBlur = 8 * pulse3;
      ctx.beginPath(); ctx.roundRect(bx3, by3, bw3, bh3, 5); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;
      ctx.fillStyle = '#ffffff'; ctx.font = 'bold 10px Orbitron,Courier New'; ctx.textAlign = 'center';
      ctx.fillText('受取', bx3 + bw3 / 2, by3 + bh3 / 2 + 4);
      // ヒット領域を game に記録（クリック判定用）
      if (!game._missionClaimHits) game._missionClaimHits = [];
      game._missionClaimHits.push({ missionId: slot.missionId, x: dbx, y: ry - game.missionsScrollY + HEADER_H, w: dbw, h: cardH });
    } else {
      // 進捗バー
      const ratio2 = pr && pr.max > 0 ? Math.min(1, (pr.cur || 0) / pr.max) : 0;
      const bx2 = tx, bw2 = Math.max(0, (dbx + dbw - 90) - tx);
      ctx.fillStyle = '#050810'; ctx.beginPath(); ctx.roundRect(bx2, ry + 46, bw2, 7, 3); ctx.fill();
      if (ratio2 > 0) {
        const bg2 = ctx.createLinearGradient(bx2, 0, bx2 + bw2, 0);
        bg2.addColorStop(0, '#aa4400'); bg2.addColorStop(1, '#ff9933');
        ctx.fillStyle = bg2; ctx.shadowColor = '#ff8800'; ctx.shadowBlur = 4;
        ctx.beginPath(); ctx.roundRect(bx2, ry + 46, bw2 * ratio2, 7, 3); ctx.fill(); ctx.shadowBlur = 0;
      }
      ctx.fillStyle = '#7799bb'; ctx.font = 'bold 10px Orbitron,Courier New'; ctx.textAlign = 'right';
      ctx.fillText(pr && pr.max > 0 ? `${pr.cur} / ${pr.max}` : '0 / ?', dbx + dbw - 8, ry + 58);
    }
  }

  // ─── NORMAL QUEST セクション ────────────────────
  const qy = dy + dailySectionH + 14;
  const qClaimed = game.questClaimedIds instanceof Set ? game.questClaimedIds : new Set();
  const lifeDone = NORMAL_QUEST_POOL.filter(q => qClaimed.has(q.id)).length;

  ctx.fillStyle = 'rgba(40,110,255,0.1)';
  ctx.beginPath(); ctx.roundRect(dbx, qy, dbw, 28, 4); ctx.fill();
  ctx.fillStyle = '#55aaff'; ctx.font = 'bold 13px Orbitron,Courier New'; ctx.textAlign = 'left';
  ctx.shadowColor = '#3388ff'; ctx.shadowBlur = 6;
  ctx.fillText('QUEST', dbx + 10, qy + 19); ctx.shadowBlur = 0;
  ctx.fillStyle = '#6699cc'; ctx.font = 'bold 12px Orbitron,Courier New'; ctx.textAlign = 'right';
  ctx.fillText(`${lifeDone} / ${NORMAL_QUEST_POOL.length}`, dbx + dbw - 10, qy + 19);

  for (let qi = 0; qi < _visibleQuests.length; qi++) {
    const q = _visibleQuests[qi];
    let pr; try { pr = q.progress(game.questLifetime, game); } catch (e) { pr = null; }
    let completed = false; try { completed = q.check(game.questLifetime, game); } catch (e) { }
    const qry = qy + 32 + qi * QUEST_ROW_H;
    const rowH = QUEST_ROW_H - 4;

    ctx.fillStyle = completed ? 'rgba(0,26,60,0.55)' : 'rgba(6,10,22,0.92)';
    ctx.strokeStyle = completed ? 'rgba(50,140,255,0.55)' : 'rgba(35,55,90,0.45)';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.roundRect(dbx, qry, dbw, rowH, 6); ctx.fill(); ctx.stroke();

    // インジケータードット
    const dotp = completed ? '#44aaff' : '#253550';
    ctx.fillStyle = dotp;
    ctx.shadowColor = completed ? dotp : 'transparent'; ctx.shadowBlur = completed ? 7 : 0;
    ctx.beginPath(); ctx.arc(dbx + 14, qry + rowH / 2, 7, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;

    // ラベル
    ctx.fillStyle = completed ? '#88ccff' : '#aabccc';
    ctx.font = `bold 12px Orbitron,Courier New`; ctx.textAlign = 'left';
    ctx.shadowColor = completed ? '#66aaff' : 'transparent'; ctx.shadowBlur = completed ? 4 : 0;
    ctx.fillText(q.label, dbx + 28, qry + 17); ctx.shadowBlur = 0;

    // 報酬
    ctx.fillStyle = '#998855'; ctx.font = '10px Orbitron,Courier New'; ctx.textAlign = 'right';
    ctx.fillText(`● ${q.reward.coins}${q.reward.gems ? `  💎 ${q.reward.gems}` : ''}${q.reward.dust ? `  ✦ ${q.reward.dust}` : ''}`, dbx + dbw - 8, qry + 17);

    // 進捗バー & テキスト
    if (pr && pr.max > 0) {
      const ratio2 = Math.min(1, (pr.cur || 0) / pr.max);
      const bx = dbx + 28, bw2 = Math.floor((dbw - 140) * 0.65);
      ctx.fillStyle = '#040812'; ctx.beginPath(); ctx.roundRect(bx, qry + 27, bw2, 5, 2); ctx.fill();
      ctx.fillStyle = completed ? '#2277cc' : '#163060';
      ctx.shadowColor = completed ? '#4499ff' : 'transparent'; ctx.shadowBlur = completed ? 4 : 0;
      ctx.beginPath(); ctx.roundRect(bx, qry + 27, bw2 * ratio2, 5, 2); ctx.fill(); ctx.shadowBlur = 0;
      ctx.fillStyle = completed ? '#88bbee' : '#5577aa'; ctx.font = 'bold 10px Orbitron,Courier New'; ctx.textAlign = 'left';
      ctx.fillText(`${pr.cur} / ${pr.max}`, bx + bw2 + 8, qry + 33);
    } else {
      ctx.fillStyle = '#334455'; ctx.font = '10px Orbitron,Courier New'; ctx.textAlign = 'left';
      ctx.fillText('進行中', dbx + 28, qry + 37);
    }
  }

  ctx.restore();

  // ── スクロールバー (クリップ外) ──
  if (maxScroll > 0) {
    const sbX = W - 6, sbW = 3;
    const sbTrackH = VIEW_H - 10;
    const sbThumbH = Math.max(20, sbTrackH * (VIEW_H / totalContentH));
    const sbThumbY = HEADER_H + 5 + (sbTrackH - sbThumbH) * (game.missionsScrollY / maxScroll);
    ctx.fillStyle = 'rgba(20,35,60,0.6)';
    ctx.beginPath(); ctx.roundRect(sbX, HEADER_H + 5, sbW, sbTrackH, 2); ctx.fill();
    ctx.fillStyle = 'rgba(90,160,240,0.75)';
    ctx.beginPath(); ctx.roundRect(sbX, sbThumbY, sbW, sbThumbH, 2); ctx.fill();
  }

  // ── ヘッダー (スクロール領域の上に固定) ──
  ctx.fillStyle = 'rgba(4,8,20,1)'; ctx.fillRect(0, 0, W, HEADER_H);
  ctx.strokeStyle = 'rgba(50,80,140,0.5)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(0, HEADER_H); ctx.lineTo(W, HEADER_H); ctx.stroke();
  ctx.fillStyle = '#cce8ff'; ctx.font = 'bold 16px Orbitron,Courier New'; ctx.textAlign = 'left';
  ctx.shadowColor = pAccent; ctx.shadowBlur = 8;
  ctx.fillText('MISSIONS', MX, 30); ctx.shadowBlur = 0;
  if (maxScroll > 0) {
    ctx.fillStyle = '#334455'; ctx.font = '9px Orbitron,Courier New'; ctx.textAlign = 'right';
    ctx.fillText('↑↓ スクロール', W - MX, 30);
  }

  // 受取トースト
  if (game.missionClaimToast && game.missionClaimToast.timer > 0) {
    const toast = game.missionClaimToast;
    toast.timer--;
    const t = toast.timer;
    const fadeIn = Math.min(1, t / 10);
    const fadeOut = Math.min(1, (90 - t) / 8);
    const a = Math.min(fadeIn, fadeOut);
    const slideOff = t < 10 ? ((10 - t) / 10) * 30 : 0;
    ctx.save();
    ctx.globalAlpha = a;
    const tw = 300, th = 56, tx2 = (W - tw) / 2, ty2 = HEADER_H + 14 + slideOff;
    ctx.fillStyle = 'rgba(0,30,15,0.97)';
    ctx.strokeStyle = '#00ff88'; ctx.lineWidth = 2;
    ctx.shadowColor = '#00ff88'; ctx.shadowBlur = 18;
    ctx.beginPath(); ctx.roundRect(tx2, ty2, tw, th, 10); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;
    ctx.fillStyle = '#00ff88'; ctx.font = 'bold 14px Orbitron,Courier New'; ctx.textAlign = 'center';
    ctx.fillText('✓  受取完了！', W / 2, ty2 + 22);
    const rStr = `+${toast.coins}●${toast.gems ? `  +${toast.gems}💎` : ''}${toast.dust ? `  +${toast.dust}✦` : ''}`;
    ctx.fillStyle = '#aaffcc'; ctx.font = '11px Orbitron,Courier New';
    ctx.fillText(rStr, W / 2, ty2 + 42);
    ctx.restore();
  }
}

export function drawLoadoutScreen() {
  ctx.fillStyle = 'rgba(0,0,0,0.97)'; ctx.fillRect(0, 0, W, H);

  const TAB_COLORS = ['#00ccff', '#ff8844', '#cc88ff', '#44aaff'];
  const tc = TAB_COLORS[game.loadoutTab];
  const bgG = ctx.createRadialGradient(148, 330, 0, 148, 330, 270);
  bgG.addColorStop(0, tc + '11'); bgG.addColorStop(1, 'transparent');
  ctx.fillStyle = bgG; ctx.fillRect(0, 0, W, H);

  // ── TABS ──
  const TAB_LABELS = ['◈  キャラ', '⚙  装備', '♦  ペット', '▶  武器'];
  const TW = W / 4;
  TAB_LABELS.forEach((label, i) => {
    const tx = i * TW, active = game.loadoutTab === i, col = TAB_COLORS[i];
    ctx.fillStyle = 'rgba(7,8,18,0.92)'; ctx.fillRect(tx, 0, TW, 47);
    if (active) { ctx.save(); ctx.globalAlpha = 0.14; ctx.fillStyle = col; ctx.fillRect(tx, 0, TW, 47); ctx.restore(); }
    if (i > 0) { ctx.strokeStyle = '#18182a'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(tx, 4); ctx.lineTo(tx, 42); ctx.stroke(); }
    ctx.fillStyle = active ? col : '#3a3a55'; ctx.font = `${active ? 'bold ' : ''} 13px Orbitron,Courier New`; ctx.textAlign = 'center';
    ctx.shadowColor = active ? col : 'transparent'; ctx.shadowBlur = active ? 10 : 0;
    ctx.fillText(label, tx + TW / 2, 28); ctx.shadowBlur = 0;
    // Bottom bar
    if (active) { ctx.fillStyle = col; ctx.shadowColor = col; ctx.shadowBlur = 10; ctx.fillRect(tx + 2, 44, TW - 4, 3); ctx.shadowBlur = 0; }
    else { ctx.fillStyle = '#18182a'; ctx.fillRect(tx, 44, TW, 3); }
  });

  // Build pool
  let pool = [];
  if (game.loadoutTab === 0) pool = CHAR_POOL.filter(c => game.gachaInventory[c.id] || c.id === 'char_basic');
  else if (game.loadoutTab === 1) pool = buildEquipPool();
  else if (game.loadoutTab === 2) pool = PET_POOL.filter(p => game.gachaInventory[p.id]);
  else pool = [{ id: null, rarity: 'N', type: 'weapon', label: 'CLASSIC', desc: '通常弾・無限', color: '#aaa', weapon: 'normal', ammo: 0 }, ...WEAPON_GACHA_POOL.filter(w => game.gachaInventory[w.id])];
  const cur = Math.min(game.loadoutCursor, Math.max(0, pool.length - 1));
  const curItem = pool[cur];
  if (game.loadoutSelAnimFrame === undefined) game.loadoutSelAnimFrame = game.frameCount;
  if (game.loadoutSelAnimDir === undefined) game.loadoutSelAnimDir = 0;

  // Panel dimensions (PH shorter to leave room for BACK button at y=558)
  const PX = 4, PY = 50, PW = 290, PH = H - PY - 48;
  const LX = PX + PW + 6, LY = PY, LW = W - LX - 4, LH = PH;

  // Left panel bg
  ctx.fillStyle = 'rgba(6,8,20,0.96)'; ctx.strokeStyle = '#161c36'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.roundRect(PX, PY, PW, PH, 8); ctx.fill(); ctx.stroke();
  // Right panel bg
  ctx.fillStyle = 'rgba(5,6,16,0.96)'; ctx.strokeStyle = '#161c36'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.roundRect(LX, LY, LW, LH, 8); ctx.fill(); ctx.stroke();

  // ── LEFT: PREVIEW ──
  if (curItem) {
    // 左右連動演出（選択変更時に軽いスライド＋フェード）
    const start = game.loadoutSelAnimFrame || 0;
    const dt = Math.max(0, game.frameCount - start);
    const dur = 10;
    const t = Math.min(1, dt / dur);
    const ease = 1 - Math.pow(1 - t, 3);
    const dir = game.loadoutSelAnimDir || 0;
    const dx = (1 - ease) * dir * 10;
    ctx.save();
    ctx.globalAlpha = 0.65 + 0.35 * ease;
    ctx.translate(dx, 0);
    drawDeps.drawLoadoutPreview(PX, PY, PW, PH, curItem);
    ctx.restore();
  }
  else {
    ctx.fillStyle = '#2a2a40'; ctx.font = '13px Orbitron,Courier New'; ctx.textAlign = 'center';
    ctx.fillText('アイテムなし', PX + PW / 2, PY + PH / 2 - 10);
    ctx.fillStyle = '#445'; ctx.font = '11px Orbitron,Courier New';
    ctx.fillText('ガチャで入手しよう！', PX + PW / 2, PY + PH / 2 + 12);
  }

  // ── EQUIP TAB: top space ──
  // ユーザー要望: スロット枠HUDは非表示。代わりにフィルタタブ分の高さだけ確保する
  let equipHudH = 0;
  if (game.loadoutTab === 1) equipHudH = 34;

  // 装備タブ: おすすめフィルタタブ（全て/攻撃/耐久/会心）
  // 非選択はグレー・枠なし、選択中のみ色＋下線＋軽い発光
  if (game.loadoutTab === 1) {
    const qf = game.equipQuickFilter || 'all';
    const tabs = [
      { id: 'all', t: '全て', c: 'rgba(200,220,255,0.28)' },
      { id: 'atk', t: '攻撃', c: '#ff8844' },
      { id: 'def', t: '耐久', c: '#44aaff' },
      { id: 'crit', t: '会心', c: '#cc88ff' },
    ];
    // 右リストの最上部に配置（グリッドに被せない）
    const tabY = LY + 10;
    const tabX = LX + 12;
    const tw = 52, th = 20, gap = 12;
    game._equipQuickFilterHits = [];
    tabs.forEach((tb, i) => {
      const x = tabX + i * (tw + gap), y = tabY;
      const active = qf === tb.id;
      // hit
      game._equipQuickFilterHits.push({ id: tb.id, x, y, w: tw, h: th });
      // label
      ctx.textAlign = 'left';
      ctx.font = 'bold 12px Orbitron,Courier New';
      ctx.fillStyle = active ? tb.c : 'rgba(200,220,255,0.35)';
      ctx.shadowColor = active ? tb.c : 'transparent'; ctx.shadowBlur = active ? 8 : 0;
      const labelY = y + 15;
      ctx.fillText(tb.t, x, labelY);
      ctx.shadowBlur = 0;
      // underline only when active
      if (active) {
        const uw = Math.min(tw - 8, ctx.measureText(tb.t).width);
        ctx.fillStyle = tb.c;
        ctx.fillRect(x, Math.round(labelY + 4), Math.max(10, uw), 2);
      }
    });
    ctx.textAlign = 'left';

    // ソートプリセット（強い/レア/Lv）: 右上に1ボタンでサイクル
    const sp = game.equipSortPreset || 0;
    const spLbl = sp === 1 ? 'レア順' : sp === 2 ? 'Lv順' : '強い順';
    const bx = LX + LW - 90, by = LY + 8, bw = 78, bh = 22;
    game._equipSortHit = { x: bx, y: by, w: bw, h: bh };
    ctx.fillStyle = 'rgba(10,12,26,0.70)';
    ctx.strokeStyle = 'rgba(120,150,220,0.28)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 8); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(200,220,255,0.55)'; ctx.font = 'bold 10px Orbitron,Courier New'; ctx.textAlign = 'center';
    ctx.fillText(spLbl, bx + bw / 2, by + 15);
    ctx.textAlign = 'left';
  }

  // ── RIGHT: ITEM GRID (4 per row) ──
  if (pool.length === 0) {
    ctx.fillStyle = '#2a2a40'; ctx.font = '13px Orbitron,Courier New'; ctx.textAlign = 'center';
    ctx.fillText('まだアイテムがありません', LX + LW / 2, LY + LH / 2 - 10);
    ctx.fillStyle = '#445'; ctx.font = '11px Orbitron,Courier New';
    ctx.fillText('ガチャで入手しよう！', LX + LW / 2, LY + LH / 2 + 14);
  } else {
    // キャラは右側の空白が出やすいので3列（狭い場合は2列）
    const COLS = (game.loadoutTab === 0 ? (LW < 320 ? 2 : 3) : 4);
    const sidePad = 8, basePadY = 8, gap = (game.loadoutTab === 1 ? 8 : 6);
    const padY = basePadY + (equipHudH || 0);
    const cellW = Math.floor((LW - sidePad * 2 - gap * (COLS - 1)) / COLS);
    const cellH = Math.min(cellW, (game.loadoutTab === 1 ? 80 : 72));
    const visRows = Math.max(1, Math.floor((LH - padY - basePadY - 24) / (cellH + gap)));
    const curRow = Math.floor(cur / COLS);
    const startRow = Math.max(0, Math.min(curRow - Math.floor(visRows / 2), Math.ceil(pool.length / COLS) - visRows));

    for (let vi = 0; vi < visRows; vi++) {
      for (let col = 0; col < COLS; col++) {
        const pi = (startRow + vi) * COLS + col;
        if (pi >= pool.length) continue;
        const item = pool[pi];
        const isActive = pi === cur;
        const rc = RARITY_COLORS[item.rarity] || item.color || '#aaa';
        const cx2 = LX + sidePad + col * (cellW + gap);
        const cy2 = LY + padY + vi * (cellH + gap);

        // Card bg
        ctx.save();
        if (isActive) {
          // 選択中カードを少し拡大（1.05倍）＋発光強化
          const s = 1.05;
          ctx.translate(cx2 + cellW / 2, cy2 + cellH / 2);
          ctx.scale(s, s);
          ctx.translate(-(cx2 + cellW / 2), -(cy2 + cellH / 2));
        }
        ctx.fillStyle = isActive ? `rgba(${hexToRgb(rc) || '60,60,80'},0.24)` : 'rgba(10,12,28,0.88)';
        ctx.strokeStyle = isActive ? rc : '#1a1e38';
        ctx.lineWidth = isActive ? 2.4 : 1;
        ctx.shadowColor = isActive ? rc : 'transparent'; ctx.shadowBlur = isActive ? 22 : 0;
        ctx.beginPath(); ctx.roundRect(cx2, cy2, cellW, cellH, 7); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;

        // Top rarity bar
        ctx.fillStyle = rc; ctx.globalAlpha = isActive ? 0.9 : 0.5;
        ctx.beginPath(); ctx.roundRect(cx2, cy2, cellW, 3, 2); ctx.fill(); ctx.globalAlpha = 1;

        // 装備カード上の ATK/DEF/SP バッジは非表示（右上フィルタに統一）

        // Icon
        ctx.save(); ctx.translate(cx2 + cellW / 2, cy2 + cellH / 2 - 8);
        ctx.fillStyle = rc; ctx.shadowColor = rc; ctx.shadowBlur = isActive ? 12 : 4;
        if (item.type === 'char' || item.type === 'skin') {
          drawDeps.drawShipShape(-10, -6, 20, 12, pickCharShipShape(item), item.color || rc, item.rarity);
        } else if (item.type === 'pet' && item.effect) {
          ctx.scale(0.64, 0.64); drawPetShape(item.effect, rc, item.rarity);
        } else if (item.type === 'equip') {
          ctx.scale(0.68, 0.68); drawEquipShape(item, rc, item.rarity);
        } else {
          ctx.beginPath(); ctx.moveTo(0, -9); ctx.lineTo(7, 0); ctx.lineTo(0, 9); ctx.lineTo(-7, 0); ctx.closePath(); ctx.fill();
        }
        ctx.shadowBlur = 0; ctx.restore();

        // Equip: main effect line (decision helper)
        if (game.loadoutTab === 1 && item && item.type === 'equip') {
          const eff = getEquipMainEffectText(item);
          ctx.fillStyle = isActive ? 'rgba(230,245,255,0.82)' : 'rgba(200,220,255,0.45)';
          ctx.font = 'bold 9px Orbitron,Courier New'; ctx.textAlign = 'center';
          ctx.fillText(eff, cx2 + cellW / 2, cy2 + cellH - 22);
        }

        // Char: one-line stat summary (HP / ATK% / DEF%)
        if (game.loadoutTab === 0 && item && (item.type === 'char' || item.type === 'skin')) {
          const hp = Math.round(item.hp || 0);
          const atkPct = Math.round(((item.atk || 1) - 1) * 100);
          const defPct = Math.round(item.def || 0);
          let sum = `HP ${hp} / ATK ${atkPct >= 0 ? '+' : ''}${atkPct}% / DEF ${defPct >= 0 ? '+' : ''}${defPct}%`;
          if (sum.length > 26) sum = sum.slice(0, 25) + '…';
          ctx.fillStyle = isActive ? 'rgba(230,245,255,0.78)' : 'rgba(200,220,255,0.40)';
          ctx.font = 'bold 8px Orbitron,Courier New'; ctx.textAlign = 'center';
          ctx.fillText(sum, cx2 + cellW / 2, cy2 + cellH - 22);
        }

        // Label (truncate)
        const lbl = item.label.length > 9 ? item.label.slice(0, 8) + '…' : item.label;
        ctx.fillStyle = isActive ? '#ffffff' : 'rgba(205,225,255,0.55)';
        ctx.font = `${isActive ? 'bold ' : ''} 10px Orbitron,Courier New`; ctx.textAlign = 'center';
        ctx.fillText(lbl, cx2 + cellW / 2, cy2 + cellH - 6);

        // Level badge (equip only)
        if (game.loadoutTab === 1 && item && item.id && game.gachaInventory?.[item.id]) {
          const lv = (game.gachaInventory[item.id].level || 1);
          ctx.fillStyle = 'rgba(0,0,0,0.35)';
          ctx.strokeStyle = 'rgba(200,220,255,0.18)'; ctx.lineWidth = 1;
          // Lvは左上へ（右上は装備中アイコン/光用に空ける）
          ctx.beginPath(); ctx.roundRect(cx2 + 6, cy2 + 6, 28, 14, 5); ctx.fill(); ctx.stroke();
          ctx.fillStyle = 'rgba(230,245,255,0.60)'; ctx.font = 'bold 9px Orbitron,Courier New'; ctx.textAlign = 'center';
          ctx.fillText(`Lv${lv}`, cx2 + 20, cy2 + 16);
          ctx.textAlign = 'left';
        }

        // Equipped dot
        let equipped = false;
        if (game.loadoutTab === 0) equipped = game.playerLoadout.charId === item.id || (item.id === 'char_basic' && !game.playerLoadout.charId);
        else if (game.loadoutTab === 1) equipped = game.playerLoadout.equip.includes(item.id);
        else if (game.loadoutTab === 2) equipped = game.playerLoadout.pets.includes(item.id);
        else equipped = game.playerLoadout.weaponId === item.id || (item.id === null && !game.playerLoadout.weaponId);
        if (equipped) {
          ctx.fillStyle = '#00ee44'; ctx.shadowColor = '#0f0'; ctx.shadowBlur = 6;
          ctx.beginPath(); ctx.arc(cx2 + cellW - 10, cy2 + 10, 4, 0, Math.PI * 2); ctx.fill();
          ctx.shadowBlur = 0;
          // 装備タブは「どのスロットで装備中か」をアイコンで明示
          if (game.loadoutTab === 1) {
            const ids = Array.isArray(game.playerLoadout?.equip) ? game.playerLoadout.equip : [];
            const idx = ids.indexOf(item.id);
            const iconMap = [
              { t: '⚔', c: '#ff8844' },
              { t: '🛡', c: '#44aaff' },
              { t: '✦', c: '#cc88ff' },
            ];
            const m = iconMap[idx] || { t: '●', c: '#00ee44' };
            ctx.fillStyle = m.c; ctx.font = 'bold 11px Orbitron,Courier New'; ctx.textAlign = 'right';
            ctx.shadowColor = m.c; ctx.shadowBlur = 6;
            ctx.fillText(m.t, cx2 + cellW - 16, cy2 + 14);
            ctx.shadowBlur = 0; ctx.textAlign = 'left';
          }
        }

        // Card transform end
        ctx.restore();
      }
    }

    ctx.textAlign = 'center';
    if (Math.ceil(pool.length / COLS) > visRows) {
      ctx.fillStyle = 'rgba(205,225,255,0.32)'; ctx.font = '11px Orbitron,Courier New';
      ctx.fillText(`${cur + 1}  /  ${pool.length}  ▲▼`, LX + LW / 2, LY + LH - 8);
    }
  }

  // Bottom hint (left panel) は非表示（常時点滅はノイズになりやすい）

  // ペットレベルアップオーバーレイ
  if (game.petLevelUpOverlay && game.loadoutTab === 2) {
    const pet = PET_POOL.find(p => p.id === game.petLevelUpOverlay.petId);
    const inv = pet && game.gachaInventory[pet.id];
    if (pet && inv) {
      const lv = inv.level || 1;
      const petCosts = [{ mat: 1, scrap: 5 }, { mat: 1, scrap: 10, core: 2 }, { mat: 2, scrap: 20, core: 5 }, { mat: 2, scrap: 30, core: 10, crystal: 2 }];
      const cost = lv <= 4 ? petCosts[lv - 1] : null;
      // 背景をしっかり暗くして可読性UP
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(0, 0, W, H);

      const ow = 360, oh = 260;
      const ox = W / 2 - ow / 2, oy = H / 2 - oh / 2;
      const col = pet.color || '#cc88ff';
      ctx.fillStyle = 'rgba(2,4,14,0.97)'; ctx.strokeStyle = col; ctx.lineWidth = 2;
      ctx.shadowColor = col; ctx.shadowBlur = 22;
      ctx.beginPath(); ctx.roundRect(ox, oy, ow, oh, 16); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;

      // Title
      ctx.fillStyle = col; ctx.font = 'bold 16px Orbitron,Courier New'; ctx.textAlign = 'center';
      ctx.fillText(`♦  ${pet.label}  Lv${lv} → Lv${lv + 1}`, W / 2, oy + 30);
      ctx.fillStyle = 'rgba(180,210,255,0.78)'; ctx.font = '12px Orbitron,Courier New';
      ctx.fillText(pet.desc || 'ペット強化', W / 2, oy + 54);

      ctx.strokeStyle = 'rgba(60,90,150,0.45)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(ox + 18, oy + 70); ctx.lineTo(ox + ow - 18, oy + 70); ctx.stroke();
      ctx.fillStyle = 'rgba(230,245,255,0.60)'; ctx.font = '600 11px Orbitron,Courier New'; ctx.textAlign = 'left';
      ctx.fillText('必要素材（次Lv）', ox + 22, oy + 92);
      if (cost) {
        const matOk = (inv.mat || 0) >= cost.mat;
        const scrapOk = !cost.scrap || (game.materials.scrap || 0) >= cost.scrap;
        const coreOk = !cost.core || (game.materials.core || 0) >= cost.core;
        const crystalOk = !cost.crystal || (game.materials.crystal || 0) >= cost.crystal;
        const allOk = matOk && scrapOk && coreOk && crystalOk;

        const parts = [
          { t: `複製`, need: cost.mat, have: (inv.mat || 0), ok: matOk },
          cost.scrap ? { t: `🔩`, need: cost.scrap, have: (game.materials.scrap || 0), ok: scrapOk } : null,
          cost.core ? { t: `⚡`, need: cost.core, have: (game.materials.core || 0), ok: coreOk } : null,
          cost.crystal ? { t: `💠`, need: cost.crystal, have: (game.materials.crystal || 0), ok: crystalOk } : null,
        ].filter(Boolean);

        const startX = ox + 22, startY = oy + 110;
        const rowH = 18;
        parts.forEach((p, i) => {
          const y = startY + i * rowH;
          ctx.fillStyle = 'rgba(200,220,255,0.42)'; ctx.font = '11px Orbitron,Courier New'; ctx.textAlign = 'left';
          ctx.fillText(`${p.t}`, startX, y);
          ctx.fillStyle = p.ok ? 'rgba(255,230,160,0.85)' : 'rgba(255,120,120,0.92)';
          ctx.font = 'bold 11px Orbitron,Courier New';
          ctx.fillText(`×${p.need}`, startX + 48, y);
          ctx.fillStyle = 'rgba(200,220,255,0.35)'; ctx.font = '11px Orbitron,Courier New';
          ctx.fillText(`（所持:${p.have}）`, startX + 112, y);
        });

        const btnY = oy + oh - 76;
        ctx.fillStyle = allOk ? 'rgba(0,200,100,0.95)' : 'rgba(110,110,140,0.35)';
        ctx.strokeStyle = allOk ? '#00cc66' : 'rgba(120,140,190,0.25)'; ctx.lineWidth = 1.5;
        ctx.shadowColor = allOk ? '#00ff88' : 'transparent'; ctx.shadowBlur = allOk ? 14 : 0;
        ctx.beginPath(); ctx.roundRect(ox + 40, btnY, ow - 80, 46, 12); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;
        ctx.fillStyle = allOk ? '#fff' : 'rgba(220,230,255,0.35)'; ctx.font = 'bold 14px Orbitron,Courier New'; ctx.textAlign = 'center';
        ctx.fillText(allOk ? '強化する' : '素材不足', W / 2, btnY + 30);
      } else {
        ctx.fillStyle = '#44ff88'; ctx.font = 'bold 13px Orbitron,Courier New';
        ctx.fillText('✓  MAX LEVEL', W / 2, oy + 120);
      }
      ctx.fillStyle = 'rgba(200,220,255,0.35)'; ctx.font = '10px Orbitron,Courier New'; ctx.textAlign = 'center';
      ctx.fillText('ESC / 画面タップで閉じる', W / 2, oy + oh - 18);
    }
  }

  // 強化パネル（キャラ/装備/武器）: 下部に展開（ペットと同じ方式）
  if (game.state === 'loadout' && game.loadoutUpgradeOverlay && game.loadoutUpgradeOverlay.itemId && game.loadoutUpgradeOverlay.tab !== 2) {
    const itemId = game.loadoutUpgradeOverlay.itemId;
    const tab = game.loadoutUpgradeOverlay.tab;
    const pool = (tab === 0 ? CHAR_POOL : tab === 1 ? EQUIP_POOL : tab === 2 ? PET_POOL : WEAPON_GACHA_POOL);
    const item = pool.find(x => x.id === itemId);
    if (item) {
      const changedAt = game.loadoutUpgradeOverlay.changedAt || 0;
      const dt = Math.max(0, game.frameCount - changedAt);
      const dur = 10;
      const t = Math.min(1, dt / dur);
      const ease = 1 - Math.pow(1 - t, 3);
      const open = !!game.loadoutUpgradeOverlay.open;
      const p = open ? ease : (1 - ease);

      // ペット強化パネルと同じ密度/余白に揃える
      const panelH = 252;
      const yTop = H - 48 - panelH * p;
      if (p > 0.01) {
        ctx.save();
        if (open) { ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.fillRect(0, 0, W, H); }
        const col = item.color || RARITY_COLORS[item.rarity] || '#0cf';
        ctx.fillStyle = 'rgba(2,4,14,0.92)';
        ctx.strokeStyle = col + '88'; ctx.lineWidth = 2;
        ctx.shadowColor = col; ctx.shadowBlur = 18;
        ctx.beginPath(); ctx.roundRect(12, yTop, W - 24, panelH, 16); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;

        const inv = game.gachaInventory?.[itemId];
        const lv = inv ? (inv.level || 1) : 1;
        const nextLv = Math.min(30, lv + 1);
        const cost = getLevelUpCost(item);
        const can = !!(cost && (game.gachaStardust || 0) >= cost.dust && (game.coins || 0) >= cost.coins);
        const btnW = 260, btnH = 46;
        const bx = W / 2 - btnW / 2, by = yTop + panelH - (btnH + 10); // 下端(H-48)から10px上

        // タイトル（目的を明確化）
        ctx.fillStyle = 'rgba(255,220,180,0.90)'; ctx.font = 'bold 16px Orbitron,Courier New'; ctx.textAlign = 'left';
        ctx.fillText(`強化  ${item.label || ''}  Lv${lv} → Lv${nextLv}`, 28, yTop + 30);
        // サブ（効果/説明）
        if (item.desc) {
          ctx.fillStyle = 'rgba(220,235,255,0.62)'; ctx.font = '12px Orbitron,Courier New';
          ctx.fillText(item.desc, 28, yTop + 50);
        }

        // Before/After（列揃え）
        const xLabel = 28, xBefore = 168, xAfter = 276, xDelta = 392;
        const yHead = yTop + 76;
        const rowH = 20;
        ctx.textAlign = 'left';
        ctx.font = 'bold 12px Orbitron,Courier New'; ctx.fillStyle = 'rgba(230,245,255,0.55)';
        ctx.fillText('強化後', xLabel, yHead);
        ctx.font = '11px Orbitron,Courier New'; ctx.fillStyle = 'rgba(200,220,255,0.38)';
        ctx.fillText('Before', xBefore, yHead);
        ctx.fillText('After', xAfter, yHead);
        ctx.fillText('差分', xDelta, yHead);

        let rows = [];
        const { b, next } = upgradeBonusNowNext(itemId);
        if (item.type === 'weapon') {
          const base = item.ammo || 0;
          const now = Math.max(0, Math.round(base * (1 + b)));
          const nxt = Math.max(0, Math.round(base * (1 + next)));
          if (base > 0) rows.push({ l: '弾数', now, nxt, fmt: v => `${v}`, c: '#88ccff' });
        } else if (item.type === 'char') {
          const hp0 = item.hp || 0, def0 = item.def || 0, crit0 = item.crit || 0, spd0 = item.spd || 0;
          const atk0 = item.atk || 1;
          rows.push({ l: 'HP', now: Math.round(applyLevelToStatAdd(hp0, b)), nxt: Math.round(applyLevelToStatAdd(hp0, next)), fmt: v => `${v}`, c: '#00ff88' });
          rows.push({
            l: 'ATK', now: applyLevelToAtkMult(atk0, b), nxt: applyLevelToAtkMult(atk0, next),
            fmt: v => `${((v - 1) * 100 >= 0 ? '+' : '')}${((v - 1) * 100).toFixed(1)}%`, c: '#ff8844', isPct: true
          });
          rows.push({ l: 'DEF', now: Math.round(applyLevelToStatAdd(def0, b)), nxt: Math.round(applyLevelToStatAdd(def0, next)), fmt: v => `${v}%`, c: '#44aaff' });
          if (crit0) rows.push({ l: 'CRIT', now: Math.round(applyLevelToStatAdd(crit0, b)), nxt: Math.round(applyLevelToStatAdd(crit0, next)), fmt: v => `${v}%`, c: '#ffdd00' });
          if (spd0) rows.push({ l: 'SPD', now: Math.round(applyLevelToStatAdd(spd0, b)), nxt: Math.round(applyLevelToStatAdd(spd0, next)), fmt: v => `+${v}`, c: '#88ffcc' });
        } else if (item.type === 'equip') {
          const hp0 = item.hp || 0, def0 = item.def || 0, crit0 = item.crit || 0, spd0 = item.spd || 0;
          const atk0 = item.atk || 1;
          if (hp0) rows.push({ l: 'HP', now: Math.round(applyLevelToStatAdd(hp0, b)), nxt: Math.round(applyLevelToStatAdd(hp0, next)), fmt: v => `+${v}`, c: '#00ff88' });
          if (atk0 > 1) rows.push({
            l: 'ATK', now: applyLevelToAtkMult(atk0, b), nxt: applyLevelToAtkMult(atk0, next),
            fmt: v => `${((v - 1) * 100 >= 0 ? '+' : '')}${((v - 1) * 100).toFixed(1)}%`, c: '#ff8844', isPct: true
          });
          if (def0) rows.push({ l: 'DEF', now: Math.round(applyLevelToStatAdd(def0, b)), nxt: Math.round(applyLevelToStatAdd(def0, next)), fmt: v => `+${v}%`, c: '#44aaff' });
          if (crit0) rows.push({ l: 'CRIT', now: Math.round(applyLevelToStatAdd(crit0, b)), nxt: Math.round(applyLevelToStatAdd(crit0, next)), fmt: v => `+${v}%`, c: '#ffdd00' });
          if (spd0) rows.push({ l: 'SPD', now: Math.round(applyLevelToStatAdd(spd0, b)), nxt: Math.round(applyLevelToStatAdd(spd0, next)), fmt: v => `+${v}`, c: '#88ffcc' });
        }

        ctx.font = 'bold 12px Orbitron,Courier New';
        // 変化なしは非表示（差分0は情報ノイズ）
        const eps = 1e-6;
        rows = rows.filter(r => Math.abs((r.nxt || 0) - (r.now || 0)) > eps);
        rows.slice(0, 3).forEach((r, ri) => {
          const y = yHead + rowH * (ri + 1);
          ctx.fillStyle = 'rgba(220,235,255,0.72)'; ctx.fillText(r.l, xLabel, y);
          ctx.fillStyle = 'rgba(200,220,255,0.60)'; ctx.fillText(r.fmt(r.now), xBefore, y);
          ctx.fillStyle = 'rgba(70,255,150,0.95)'; ctx.fillText(r.fmt(r.nxt), xAfter, y);
          // 差分を最も目立たせる（明るい緑・太字・軽い発光）
          const d = (typeof r.now === 'number' && typeof r.nxt === 'number') ? (r.nxt - r.now) : 0;
          const dTxt = r.isPct ? `${(d * 100 >= 0 ? '+' : '')}${(d * 100).toFixed(1)}%` : `${d >= 0 ? '+' : ''}${Math.round(d)}`;
          const pulse = 0.9 + 0.1 * Math.sin(game.frameCount * 0.12 + ri);
          ctx.fillStyle = 'rgba(120,255,190,0.98)';
          ctx.shadowColor = 'rgba(70,255,150,0.95)'; ctx.shadowBlur = 10 * pulse;
          ctx.font = 'bold 13px Orbitron,Courier New';
          ctx.fillText(dTxt, xDelta, y);
          ctx.shadowBlur = 0;
          ctx.font = 'bold 12px Orbitron,Courier New';
        });

        // 必要素材（ペットと同じチップUI）
        if (cost) {
          const dustOk = (game.gachaStardust || 0) >= cost.dust;
          const coinOk = (game.coins || 0) >= cost.coins;
          ctx.textAlign = 'left';
          ctx.font = 'bold 12px Orbitron,Courier New';
          ctx.fillStyle = 'rgba(230,245,255,0.55)';
          // ボタンと重ならないよう、数値行の直下に詰めて配置
          const yMatTitle = Math.min(yHead + rowH * 3 + 2, by - 58);
          ctx.fillText('必要素材', 28, yMatTitle);

          const chips = [
            { name: 'スターダスト', icon: '⊕', need: cost.dust, have: (game.gachaStardust || 0), ok: dustOk },
            { name: 'コイン', icon: 'C', need: cost.coins, have: (game.coins || 0), ok: coinOk },
          ];
          let x = 28;
          let yChip = yMatTitle + 14;
          const maxY = by - 44; // ボタンと重ならない上限
          let lastChipBottom = yChip;
          ctx.font = 'bold 11px Orbitron,Courier New';
          for (const ch of chips) {
            const lack = Math.max(0, (ch.need || 0) - (ch.have || 0));
            let txt = ch.ok
              ? `${ch.icon}${ch.name} ${ch.have}/${ch.need}`
              : `${ch.icon}${ch.name} ${ch.have}/${ch.need}（不足${lack}）`;
            let w2 = Math.min(W - 56, ctx.measureText(txt).width + 30);
            if (x + w2 > W - 28) { x = 28; yChip += 28; }
            if (yChip > maxY) break;

            ctx.fillStyle = ch.ok ? 'rgba(255,180,90,0.18)' : 'rgba(255,80,80,0.16)';
            ctx.strokeStyle = ch.ok ? 'rgba(255,180,90,0.55)' : 'rgba(255,80,80,0.55)'; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.roundRect(x, yChip, w2, 22, 10); ctx.fill(); ctx.stroke();

            ctx.fillStyle = ch.ok ? 'rgba(255,220,160,0.85)' : 'rgba(255,120,120,0.92)';
            ctx.textAlign = 'left';
            const maxTextW = w2 - 24;
            if (ctx.measureText(txt).width > maxTextW) {
              const ell = '…';
              while (txt.length > 1 && ctx.measureText(txt + ell).width > maxTextW) { txt = txt.slice(0, -1); }
              txt = txt + ell;
            }
            ctx.fillText(txt, x + 12, yChip + 15);

            lastChipBottom = Math.max(lastChipBottom, yChip + 22);
            x += w2 + 10;
          }
        }

        // Lvアップボタン
        ctx.fillStyle = can ? 'rgba(255,140,40,0.92)' : 'rgba(120,120,140,0.30)';
        ctx.strokeStyle = can ? 'rgba(255,180,90,0.95)' : 'rgba(120,140,190,0.25)'; ctx.lineWidth = 2;
        ctx.shadowColor = can ? 'rgba(255,140,40,0.9)' : 'transparent'; ctx.shadowBlur = can ? 18 : 0;
        ctx.beginPath(); ctx.roundRect(bx, by, btnW, btnH, 14); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;
        ctx.fillStyle = can ? '#1a0a00' : 'rgba(220,230,255,0.35)'; ctx.font = 'bold 16px Orbitron,Courier New'; ctx.textAlign = 'center';
        ctx.fillText(can ? 'Lvアップ' : '素材不足', W / 2, by + 30);

        ctx.restore();
      }
    }
  }

  // ペット強化: 下部に展開する「強化モード」UI（モーダル廃止）
  if (game.state === 'loadout' && game.loadoutTab === 2 && game.petUpgradePanel && game.petUpgradePanel.petId) {
    const petId = game.petUpgradePanel.petId;
    const pet = PET_POOL.find(p => p.id === petId);
    const inv = petId ? game.gachaInventory?.[petId] : null;
    if (pet && inv) {
      const changedAt = game.petUpgradePanel.changedAt || 0;
      const dt = Math.max(0, game.frameCount - changedAt);
      const dur = 10;
      const t = Math.min(1, dt / dur);
      const ease = 1 - Math.pow(1 - t, 3);
      const open = !!game.petUpgradePanel.open;
      const p = open ? ease : (1 - ease);

      // 置き換え用：内容が切れない高さを確保（可読性のため少し高く）
      const panelH = 252;
      const yTop = H - 48 - panelH * p; // footer(546〜)の上
      if (p > 0.01) {
        ctx.save();
        // 背景
        // 強化モードの強調：背景を少し暗く
        if (open) { ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.fillRect(0, 0, W, H); }
        ctx.fillStyle = 'rgba(2,4,14,0.92)';
        ctx.strokeStyle = 'rgba(255,160,60,0.55)'; ctx.lineWidth = 2;
        ctx.shadowColor = 'rgba(255,140,40,0.6)'; ctx.shadowBlur = 18;
        ctx.beginPath(); ctx.roundRect(12, yTop, W - 24, panelH, 16); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;

        const lv = inv.level || 1;
        const nextLv = Math.min(5, lv + 1);
        const cost = getPetUpgradeCost(petId);
        const can = canPetUpgrade(petId);
        const btnW = 260, btnH = 46;
        const bx = W / 2 - btnW / 2, by = yTop + panelH - (btnH + 10); // 下端(H-48)から10px上

        ctx.fillStyle = 'rgba(255,220,180,0.90)'; ctx.font = 'bold 16px Orbitron,Courier New'; ctx.textAlign = 'left';
        ctx.fillText(`強化  ${pet.label}  Lv${lv} → Lv${nextLv}`, 28, yTop + 30);

        ctx.fillStyle = 'rgba(220,235,255,0.62)'; ctx.font = '12px Orbitron,Courier New';
        ctx.fillText(pet.desc || 'スキル', 28, yTop + 50);
        const b0 = getPetParams(pet.effect, lv);
        const b1 = getPetParams(pet.effect, nextLv);
        const sec0 = (b0.intervalFrames / 60);
        const sec1 = (b1.intervalFrames / 60);
        const perMin0 = 60 / sec0;
        const perMin1 = 60 / sec1;
        const fmtS = v => `${v.toFixed(2)}秒`;
        const fmtN = v => `${v.toFixed(1)}`;

        // 強化後プレビュー（スキル直下）: 列を揃える（余白広め）
        const xLabel = 28;
        const xBefore = 168;
        const xAfter = 276;
        const xDelta = 392;
        const yHead = yTop + 76;
        const rowH = 20;
        ctx.textAlign = 'left';
        ctx.font = 'bold 12px Orbitron,Courier New';
        ctx.fillStyle = 'rgba(230,245,255,0.55)';
        ctx.fillText('強化後', xLabel, yHead);
        ctx.font = '11px Orbitron,Courier New';
        ctx.fillStyle = 'rgba(200,220,255,0.38)';
        ctx.fillText('Before', xBefore, yHead);
        ctx.fillStyle = 'rgba(200,220,255,0.38)';
        ctx.fillText('After', xAfter, yHead);
        ctx.fillStyle = 'rgba(200,220,255,0.38)';
        ctx.fillText('差分', xDelta, yHead);

        const row1 = yHead + rowH;
        const row2 = yHead + rowH * 2;
        const fmtDeltaS = (a, b) => `${(b - a) >= 0 ? '+' : ''}${(b - a).toFixed(2)}秒`;
        const fmtDeltaN = (a, b) => `${(b - a) >= 0 ? '+' : ''}${(b - a).toFixed(1)}`;

        // 1行目: 発動間隔（％は誤解されやすいので秒差分を優先）
        ctx.font = 'bold 12px Orbitron,Courier New';
        ctx.fillStyle = 'rgba(220,235,255,0.72)';
        ctx.fillText('発動間隔', xLabel, row1);
        ctx.fillStyle = 'rgba(200,220,255,0.60)';
        ctx.fillText(fmtS(sec0), xBefore, row1);
        ctx.fillStyle = 'rgba(70,255,150,0.95)';
        ctx.fillText(fmtS(sec1), xAfter, row1);
        {
          const dTxt = fmtDeltaS(sec0, sec1);
          const pulse = 0.9 + 0.1 * Math.sin(game.frameCount * 0.12);
          ctx.fillStyle = 'rgba(120,255,190,0.98)';
          ctx.shadowColor = 'rgba(70,255,150,0.95)'; ctx.shadowBlur = 10 * pulse;
          ctx.font = 'bold 13px Orbitron,Courier New';
          ctx.fillText(dTxt, xDelta, row1);
          ctx.shadowBlur = 0;
          ctx.font = 'bold 12px Orbitron,Courier New';
        }

        // 2行目: 指標（回/分 = 擬似DPS指標）
        ctx.fillStyle = 'rgba(220,235,255,0.72)';
        ctx.fillText('発動回数/分', xLabel, row2);
        ctx.fillStyle = 'rgba(200,220,255,0.60)';
        ctx.fillText(fmtN(perMin0), xBefore, row2);
        ctx.fillStyle = 'rgba(70,255,150,0.95)';
        ctx.fillText(fmtN(perMin1), xAfter, row2);
        {
          const dTxt = fmtDeltaN(perMin0, perMin1);
          const pulse = 0.9 + 0.1 * Math.sin(game.frameCount * 0.12 + 1);
          ctx.fillStyle = 'rgba(120,255,190,0.98)';
          ctx.shadowColor = 'rgba(70,255,150,0.95)'; ctx.shadowBlur = 10 * pulse;
          ctx.font = 'bold 13px Orbitron,Courier New';
          ctx.fillText(dTxt, xDelta, row2);
          ctx.shadowBlur = 0;
          ctx.font = 'bold 12px Orbitron,Courier New';
        }

        // DPS強調（右上に目立つピル）
        const dpsPct = (perMin0 > 0) ? ((perMin1 / perMin0 - 1) * 100) : 0;
        const dpsTxt = `DPS ${dpsPct >= 0 ? '+' : ''}${dpsPct.toFixed(1)}%`;
        ctx.save(); {
          ctx.font = 'bold 14px Orbitron,Courier New';
          const tw = ctx.measureText(dpsTxt).width;
          const padX = 12, padY = 7;
          const px = W - 28 - (tw + padX * 2);
          const py = yTop + 38;
          ctx.fillStyle = 'rgba(20,60,40,0.55)';
          ctx.strokeStyle = 'rgba(70,255,150,0.65)'; ctx.lineWidth = 1.5;
          ctx.shadowColor = 'rgba(70,255,150,0.95)'; ctx.shadowBlur = 16;
          ctx.beginPath(); ctx.roundRect(px, py, tw + padX * 2, 22 + padY * 0.0, 12); ctx.fill(); ctx.stroke();
          ctx.shadowBlur = 0;
          ctx.fillStyle = 'rgba(120,255,190,0.98)';
          ctx.fillText(dpsTxt, px + padX, py + 16);
        } ctx.restore();

        // ghostだけ無敵時間も明示（同じ列揃え）
        if (pet.effect === 'ghost') {
          const inv0 = (b0.durationFrames || 70) / 60;
          const inv1 = (b1.durationFrames || 70) / 60;
          const row3 = yHead + rowH * 3;
          ctx.font = 'bold 12px Orbitron,Courier New';
          ctx.fillStyle = 'rgba(220,235,255,0.72)';
          ctx.fillText('無敵時間', xLabel, row3);
          ctx.fillStyle = 'rgba(200,220,255,0.60)';
          ctx.fillText(fmtS(inv0), xBefore, row3);
          ctx.fillStyle = 'rgba(70,255,150,0.95)';
          ctx.fillText(fmtS(inv1), xAfter, row3);
          {
            const dTxt = fmtDeltaS(inv0, inv1);
            const pulse = 0.9 + 0.1 * Math.sin(game.frameCount * 0.12 + 2);
            ctx.fillStyle = 'rgba(120,255,190,0.98)';
            ctx.shadowColor = 'rgba(70,255,150,0.95)'; ctx.shadowBlur = 10 * pulse;
            ctx.font = 'bold 13px Orbitron,Courier New';
            ctx.fillText(dTxt, xDelta, row3);
            ctx.shadowBlur = 0;
            ctx.font = 'bold 12px Orbitron,Courier New';
          }
        }

        // 必要素材（アイコン＋数）
        if (cost) {
          const matOk = (inv.mat || 0) >= cost.mat;
          const scrapOk = !cost.scrap || (game.materials.scrap || 0) >= cost.scrap;
          const coreOk = !cost.core || (game.materials.core || 0) >= cost.core;
          const cryOk = !cost.crystal || (game.materials.crystal || 0) >= cost.crystal;
          // 素材タイトル
          ctx.textAlign = 'left';
          ctx.font = 'bold 12px Orbitron,Courier New';
          ctx.fillStyle = 'rgba(230,245,255,0.55)';
          const yMatTitle = (pet.effect === 'ghost') ? (yHead + rowH * 4) : (yHead + rowH * 3);
          ctx.fillText('必要素材', 28, yMatTitle);

          const chips = [
            { name: '複製素材', icon: '⧉', need: cost.mat, have: (inv.mat || 0), ok: matOk },
            cost.scrap ? { name: 'スクラップ', icon: '🔩', need: cost.scrap, have: (game.materials.scrap || 0), ok: scrapOk } : null,
            cost.core ? { name: 'コア', icon: '⚡', need: cost.core, have: (game.materials.core || 0), ok: coreOk } : null,
            cost.crystal ? { name: 'クリスタル', icon: '💠', need: cost.crystal, have: (game.materials.crystal || 0), ok: cryOk } : null,
          ].filter(Boolean);
          let x = 28;
          const yChipBase = yMatTitle + 14;
          let yChip = yChipBase;
          let anyLack = false;
          const lacks = [];
          let lastChipBottom = yChipBase;
          const maxY = by - 44; // ボタンと重ならない上限
          let hidden = 0;
          for (let i = 0; i < chips.length; i++) {
            const ch = chips[i];
            const lack = Math.max(0, (ch.need || 0) - (ch.have || 0));
            if (lack > 0) { anyLack = true; lacks.push(`${ch.icon}${ch.name} 不足${lack}`); }
            let txt = ch.ok
              ? `${ch.icon}${ch.name} ${(ch.have || 0)}/${ch.need}`
              : `${ch.icon}${ch.name} ${(ch.have || 0)}/${ch.need}（不足${lack}）`;
            // 幅計算と描画で同じフォントを使う（はみ出し防止）
            ctx.font = 'bold 11px Orbitron,Courier New';
            let w2 = Math.min(W - 56, ctx.measureText(txt).width + 30);
            if (x + w2 > W - 28) { x = 28; yChip += 28; }
            if (yChip > maxY) { hidden = chips.length - i; break; }
            ctx.fillStyle = ch.ok ? 'rgba(255,180,90,0.18)' : 'rgba(255,80,80,0.16)';
            ctx.strokeStyle = ch.ok ? 'rgba(255,180,90,0.55)' : 'rgba(255,80,80,0.55)'; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.roundRect(x, yChip, w2, 22, 10); ctx.fill(); ctx.stroke();
            ctx.fillStyle = ch.ok ? 'rgba(255,220,160,0.85)' : 'rgba(255,120,120,0.92)';
            ctx.textAlign = 'left';
            // 収まらない場合は省略
            const maxTextW = w2 - 24;
            if (ctx.measureText(txt).width > maxTextW) {
              const ell = '…';
              while (txt.length > 1 && ctx.measureText(txt + ell).width > maxTextW) {
                txt = txt.slice(0, -1);
              }
              txt = txt + ell;
            }
            ctx.fillText(txt, x + 12, yChip + 15);
            lastChipBottom = Math.max(lastChipBottom, yChip + 22);
            x += w2 + 10;
          }
          if (hidden > 0) {
            ctx.fillStyle = 'rgba(200,220,255,0.35)'; ctx.font = '10px Orbitron,Courier New'; ctx.textAlign = 'left';
            ctx.fillText(`…他${hidden}種`, 28, Math.min(lastChipBottom + 14, maxY + 18));
          }

          // 行動誘導: まとめて不足を明示
          // 1種類不足のときはチップ内の「あとN」で十分なので、サマリーは複数不足時だけ表示
          if (anyLack && lacks.length >= 2) {
            const yHint = Math.min(lastChipBottom + 22, by - 14);
            const msg = `不足: ${lacks.join(' / ')}`;
            ctx.font = 'bold 10px Orbitron,Courier New';
            const mw = ctx.measureText(msg).width;
            ctx.fillStyle = 'rgba(255,120,120,0.92)';
            // 長い時は2行にする（簡易）
            if (mw <= W - 56) {
              ctx.fillText(msg, 28, yHint);
            } else {
              const mid = Math.ceil(lacks.length / 2);
              const a = `不足: ${lacks.slice(0, mid).join(' / ')}`;
              const b = `      ${lacks.slice(mid).join(' / ')}`;
              ctx.fillText(a, 28, Math.min(yHint, by - 26));
              ctx.fillText(b, 28, Math.min(yHint + 14, by - 12));
            }
          }
        }

        // Lvアップボタン（オレンジで最強）
        ctx.fillStyle = can ? 'rgba(255,140,40,0.92)' : 'rgba(120,120,140,0.30)';
        ctx.strokeStyle = can ? 'rgba(255,180,90,0.95)' : 'rgba(120,140,190,0.25)'; ctx.lineWidth = 2;
        ctx.shadowColor = can ? 'rgba(255,140,40,0.9)' : 'transparent'; ctx.shadowBlur = can ? 18 : 0;
        ctx.beginPath(); ctx.roundRect(bx, by, btnW, btnH, 14); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;
        ctx.fillStyle = can ? '#1a0a00' : 'rgba(220,230,255,0.35)'; ctx.font = 'bold 16px Orbitron,Courier New'; ctx.textAlign = 'center';
        ctx.fillText(can ? 'Lvアップ' : '素材不足', W / 2, by + 30);

        // 操作ガイド文は非表示（タップ外で閉じる挙動は維持）
        ctx.restore();
      }
    }
  }

  ctx.textAlign = 'left'; ctx.lineWidth = 1;
}

export function drawBossSelectScreen() {
  const t = game.frameCount * 0.016;
  ctx.fillStyle = '#020408'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(8,16,40,0.7)'; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = 'rgba(0,100,255,0.04)'; ctx.lineWidth = 1;
  for (let x = 0; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
  for (let y = 0; y < H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

  ctx.shadowColor = '#ff8844'; ctx.shadowBlur = 28;
  ctx.fillStyle = '#ff8844'; ctx.font = 'bold 22px Orbitron,Courier New'; ctx.textAlign = 'center';
  ctx.fillText('BOSS  SELECT', W / 2, 26); ctx.shadowBlur = 0;

  // 難易度タブ
  const DIFF_LABELS = ['🌙 EASY', '⚡ NORMAL', '🔥 HARD'];
  const DIFF_COLS = ['#44ff88', '#88aaff', '#ff5544'];
  const tabW = 106, tabH = 22, tabGap = 8;
  const tabX0 = Math.floor((W - 3 * tabW - 2 * tabGap) / 2), tabY = 34;
  game._bossDiffHits = [];
  DIFF_LABELS.forEach((lbl, i) => {
    const tx = tabX0 + i * (tabW + tabGap), isAct = (game.bossDifficulty ?? 1) === i, tc = DIFF_COLS[i];
    ctx.fillStyle = isAct ? `rgba(${hexToRgb(tc)},0.22)` : 'rgba(10,12,22,0.8)';
    ctx.strokeStyle = isAct ? tc : tc + '44'; ctx.lineWidth = isAct ? 1.5 : 1;
    if (isAct) { ctx.shadowColor = tc; ctx.shadowBlur = 10; }
    ctx.beginPath(); ctx.roundRect(tx, tabY, tabW, tabH, 5); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;
    ctx.fillStyle = isAct ? '#fff' : tc + '99';
    ctx.font = `bold ${isAct ? 10 : 9}px Orbitron,Courier New`; ctx.textAlign = 'center';
    ctx.fillText(lbl, tx + tabW / 2, tabY + 15);
    game._bossDiffHits.push({ idx: i, x: tx, y: tabY, w: tabW, h: tabH });
  });
  ctx.textAlign = 'left';

  // ── 通算統計バー ──
  {
    const totalKills = Object.values(game.bossKillsByType || {}).reduce((s, v) => s + (v || 0), 0);
    let bestDiff = -1;
    for (const k of Object.keys(game.bossKillsByType || {})) {
      const d2 = parseInt(k.split('_')[1] || 0, 10);
      if ((game.bossKillsByType[k] || 0) > 0) bestDiff = Math.max(bestDiff, d2);
    }
    const bestDiffLabel = ['EASY', 'NORMAL', 'HARD'][bestDiff] || '-';
    const bestDiffCol = ['#44ff88', '#88aaff', '#ff5544'][bestDiff] || '#556';
    const sRanks = Object.values(game.bossBestRankByType || {}).filter(r => r === 'S').length;
    const statBarY = 59;
    ctx.fillStyle = 'rgba(6,10,28,0.7)';
    ctx.beginPath(); ctx.roundRect(12, statBarY, W - 24, 18, 4); ctx.fill();
    ctx.strokeStyle = 'rgba(80,100,180,0.25)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(12, statBarY, W - 24, 18, 4); ctx.stroke();
    const stats = [
      { label: '総討伐', val: `${totalKills}回`, col: '#88ffaa' },
      { label: 'MAX難易度', val: bestDiffLabel, col: bestDiffCol },
      { label: 'Sランク', val: `${sRanks} / ${BOSS_SELECT_DATA.length}`, col: '#ffdd00' },
    ];
    const sw = (W - 24) / stats.length;
    stats.forEach((s, i) => {
      const sx = 12 + i * sw + sw / 2;
      ctx.textAlign = 'center'; ctx.font = '8px Orbitron,Courier New'; ctx.fillStyle = 'rgba(150,160,200,0.6)';
      ctx.fillText(s.label, sx, statBarY + 8);
      ctx.fillStyle = s.col; ctx.font = 'bold 9px Orbitron,Courier New';
      ctx.fillText(s.val, sx, statBarY + 17);
    });
    ctx.textAlign = 'left';
  }

  const featuredIdx = Math.floor(Date.now() / (7 * 24 * 3600 * 1000)) % BOSS_SELECT_DATA.length;
  const showDouble = (game.bossDifficulty ?? 1) === 2;
  game._bossSelectHits = [];
  const cols = 3, cardW = 248, cardH = 228, gapX = 12, gapY = 12;
  const startX = Math.floor((W - cols * cardW - (cols - 1) * gapX) / 2), startY = 80;

  BOSS_SELECT_DATA.forEach((boss, i) => {
    const col = i % cols, row = Math.floor(i / cols);
    const cx = startX + col * (cardW + gapX), cy = startY + row * (cardH + gapY);
    const locked = game.highestStage < boss.stageReq;
    const _dk = `${boss.id}_${game.bossDifficulty ?? 1}`;
    const kills = game.bossKillsByType?.[_dk] || 0;
    const best = game.bossBestScoreByType?.[_dk] || 0;
    const bestRank = game.bossBestRankByType?.[_dk] || null;
    const isCur = game.bossSelectCursor === i;
    const isFeat = i === featuredIdx && !locked;
    const pulse = 0.75 + 0.25 * Math.sin(t * 2.2 + i * 0.9);

    ctx.save();
    if (!locked) {
      const grad = ctx.createLinearGradient(cx, cy, cx + cardW, cy + cardH);
      grad.addColorStop(0, `rgba(${hexToRgb(boss.col)},${isCur ? 0.20 : 0.07})`);
      grad.addColorStop(1, 'rgba(4,6,14,0.97)');
      ctx.fillStyle = grad;
      ctx.strokeStyle = isFeat ? (isCur ? '#ffd700' : '#ffd70066') : (isCur ? boss.col : boss.col + '44');
      ctx.lineWidth = isCur ? 2.5 : (isFeat ? 2 : 1);
      if (isCur) { ctx.shadowColor = boss.col; ctx.shadowBlur = 22 * pulse; }
      else if (isFeat) { ctx.shadowColor = '#ffd700'; ctx.shadowBlur = 10 + 5 * Math.sin(t * 2.5); }
    } else {
      ctx.fillStyle = 'rgba(10,10,16,0.95)'; ctx.strokeStyle = '#1a1a2a'; ctx.lineWidth = 1;
    }
    ctx.beginPath(); ctx.roundRect(cx, cy, cardW, cardH, 10); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;

    if (!locked) {
      ctx.fillStyle = (isFeat ? '#ffd700' : boss.col) + (isCur ? 'cc' : (isFeat ? '88' : '44'));
      ctx.beginPath(); ctx.roundRect(cx, cy, cardW, 3, [10, 10, 0, 0]); ctx.fill();

      // 左上: 討伐ティア
      if (kills > 0) {
        const tierLabel = kills >= 30 ? 'MASTER' : kills >= 10 ? 'GOLD' : kills >= 5 ? 'SILVER' : 'BRONZE';
        const tierCol = kills >= 30 ? '#ff88ff' : kills >= 10 ? '#ffd700' : kills >= 5 ? '#c0c0dd' : '#cc8855';
        ctx.fillStyle = `rgba(${hexToRgb(tierCol)},0.22)`;
        ctx.strokeStyle = tierCol; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.roundRect(cx + 6, cy + 7, 56, 16, 3); ctx.fill(); ctx.stroke();
        ctx.fillStyle = tierCol; ctx.font = 'bold 8px Orbitron,Courier New'; ctx.textAlign = 'center';
        ctx.fillText(tierLabel, cx + 34, cy + 19);
      }
      // 右上: ランクバッジ
      if (bestRank) {
        const rankCol = { S: '#ffdd00', A: '#ff8833', B: '#44aaff', C: '#cccccc' }[bestRank];
        ctx.fillStyle = `rgba(${hexToRgb(rankCol)},0.22)`;
        ctx.strokeStyle = rankCol; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.roundRect(cx + cardW - 36, cy + 7, 30, 16, 3); ctx.fill(); ctx.stroke();
        ctx.fillStyle = rankCol; ctx.shadowColor = rankCol; ctx.shadowBlur = 6;
        ctx.font = 'bold 11px Orbitron,Courier New'; ctx.textAlign = 'center';
        ctx.fillText(bestRank, cx + cardW - 21, cy + 19); ctx.shadowBlur = 0;
      }
      // FEATURED バッジ
      if (isFeat) {
        const fby = bestRank ? cy + 27 : cy + 7;
        ctx.globalAlpha = 0.7 + 0.3 * Math.sin(t * 3.2);
        ctx.fillStyle = 'rgba(255,215,0,0.22)'; ctx.strokeStyle = '#ffd700'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.roundRect(cx + cardW - 54, fby, 48, 16, 3); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#ffd700'; ctx.shadowColor = '#ffd700'; ctx.shadowBlur = 6;
        ctx.font = 'bold 8px Orbitron,Courier New'; ctx.textAlign = 'center';
        ctx.fillText('★ FEAT', cx + cardW - 30, fby + 12); ctx.shadowBlur = 0; ctx.globalAlpha = 1;
      }

      drawBossCardSprite(cx + cardW / 2, cy + 38, boss, t, 24, isCur);

      // ボス名
      ctx.fillStyle = isCur ? '#ffffff' : '#ddeeff';
      ctx.font = `bold ${isCur ? 15 : 14}px Orbitron,Courier New`; ctx.textAlign = 'center';
      ctx.shadowColor = boss.col; ctx.shadowBlur = isCur ? 8 : 0;
      ctx.fillText(boss.nameJp, cx + cardW / 2, cy + 77); ctx.shadowBlur = 0;
      ctx.fillStyle = boss.col + (isCur ? 'ff' : 'bb'); ctx.font = '10px Orbitron,Courier New';
      ctx.fillText(boss.nameEn, cx + cardW / 2, cy + 90);

      ctx.strokeStyle = boss.col + (isCur ? '55' : '28'); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(cx + 14, cy + 96); ctx.lineTo(cx + cardW - 14, cy + 96); ctx.stroke();

      // 説明
      ctx.fillStyle = isCur ? 'rgba(200,220,255,0.85)' : 'rgba(180,200,255,0.70)';
      ctx.font = '11px Orbitron,Courier New'; ctx.textAlign = 'center';
      ctx.fillText(boss.desc, cx + cardW / 2, cy + 110);

      // ドロップ
      const isBonusDrop = isFeat || showDouble;
      ctx.fillStyle = isBonusDrop ? 'rgba(255,220,60,0.85)' : 'rgba(160,170,185,0.70)';
      ctx.font = '9px Orbitron,Courier New';
      ctx.fillText(isBonusDrop ? 'DROP ×2' : 'DROP', cx + cardW / 2, cy + 124);
      boss.drops.forEach((d, di) => {
        ctx.fillStyle = isBonusDrop ? 'rgba(255,225,90,0.95)' : 'rgba(255,210,120,0.90)';
        ctx.font = '11px Orbitron,Courier New';
        ctx.fillText(d, cx + cardW / 2 + (di === 0 ? -40 : 40), cy + 139);
      });

      // 統計
      ctx.textAlign = 'left';
      ctx.fillStyle = kills > 0 ? '#aaffaa' : '#556'; ctx.font = 'bold 10px Orbitron,Courier New';
      ctx.fillText(`討伐 ${kills}`, cx + 10, cy + 156);
      ctx.textAlign = 'right';
      ctx.fillStyle = best > 0 ? '#ffe8aa' : '#556'; ctx.font = '10px Orbitron,Courier New';
      ctx.fillText(best > 0 ? `Best ${best.toLocaleString()}` : '-', cx + cardW - 10, cy + 156);
      ctx.textAlign = 'center';

      const bpulse = isCur ? pulse : 0.6, btnCol = isFeat && isCur ? '#ffd700' : boss.col;
      ctx.shadowColor = btnCol; ctx.shadowBlur = isCur ? 14 * bpulse : 3;
      ctx.fillStyle = isCur ? `rgba(${hexToRgb(btnCol)},0.25)` : 'rgba(10,12,22,0.8)';
      ctx.strokeStyle = btnCol + (isCur ? 'cc' : '55'); ctx.lineWidth = isCur ? 1.5 : 1;
      ctx.beginPath(); ctx.roundRect(cx + 10, cy + 162, cardW - 20, 36, 8); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;
      ctx.fillStyle = isCur ? '#fff' : btnCol + 'cc';
      ctx.font = `bold ${isCur ? 14 : 12}px Orbitron,Courier New`;
      ctx.fillText(isFeat ? '★  挑  戦' : '▶  挑  戦', cx + cardW / 2, cy + 186);

      game._bossSelectHits.push({ bossId: boss.id, x: cx, y: cy, w: cardW, h: cardH, idx: i });
    } else {
      ctx.fillStyle = '#2a2a3a'; ctx.font = '28px Orbitron,Courier New'; ctx.textAlign = 'center';
      ctx.fillText('🔒', cx + cardW / 2, cy + cardH / 2 - 16);
      ctx.fillStyle = '#443'; ctx.font = '10px Orbitron,Courier New';
      ctx.fillText(`Stage ${boss.stageReq}  でアンロック`, cx + cardW / 2, cy + cardH / 2 + 10);
      ctx.fillStyle = '#334'; ctx.font = 'bold 11px Orbitron,Courier New';
      ctx.fillText(boss.nameJp, cx + cardW / 2, cy + cardH / 2 + 28);
    }
    ctx.restore();
  });

  ctx.fillStyle = 'rgba(4,6,14,0.95)'; ctx.fillRect(0, H - 26, W, 26);
  ctx.strokeStyle = 'rgba(50,80,140,0.4)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(0, H - 26); ctx.lineTo(W, H - 26); ctx.stroke();
  ctx.fillStyle = 'rgba(150,170,220,0.4)'; ctx.font = '10px Orbitron,Courier New'; ctx.textAlign = 'center';
  ctx.fillText('[ ← → ↑ ↓ ]  選択  ·  [ Enter ]  挑戦  ·  [ Q / E ]  難易度  ·  [ ESC ]  戻る', W / 2, H - 8);
  ctx.textAlign = 'left'; ctx.lineWidth = 1;
}

export function drawModeSelectScreen() {
  const t = game.frameCount * 0.016;
  ctx.fillStyle = '#020408'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(10,18,40,0.6)'; ctx.fillRect(0, 0, W, H);
  ctx.shadowColor = '#88aaff'; ctx.shadowBlur = 24;
  ctx.fillStyle = '#ccdeff'; ctx.font = 'bold 22px Orbitron,Courier New'; ctx.textAlign = 'center';
  ctx.fillText('MODE  SELECT', W / 2, 54); ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(100,140,220,0.3)'; ctx.font = '11px Orbitron,Courier New';
  ctx.fillText('対戦形式を選んで出撃', W / 2, 72);

  const cards = [
    {
      id: 'ms_boss', x: 60, y: 88, w: 320, h: 400, col: '#ff8844',
      icon: '!!', title: 'ボスラッシュ', sub: 'BOSS RUSH',
      desc: '連続ボス戦。2体討伐で\nクリア。高リワード。',
      diff: '★★★', hint: '[ 1 / B ]'
    },
    {
      id: 'ms_endless', x: 420, y: 88, w: 320, h: 400, col: '#44ccff',
      icon: '∞', title: 'エンドレス', sub: 'ENDLESS WAVE',
      desc: '無限ウェーブ。ボスを倒す\nたびに難易度上昇。',
      diff: '★★☆', hint: '[ 2 / N ]'
    },
  ];

  cards.forEach(c => {
    const hov = game.hoveredBtn && game.hoveredBtn.id === c.id;
    const pulse = 0.7 + 0.3 * Math.sin(t * 2 + cards.indexOf(c));
    ctx.save();
    ctx.shadowColor = c.col; ctx.shadowBlur = hov ? 30 * pulse : 14 * pulse;
    ctx.fillStyle = hov ? `rgba(${hexToRgb(c.col)},0.18)` : 'rgba(6,10,22,0.96)';
    ctx.strokeStyle = c.col; ctx.lineWidth = hov ? 2.5 : 1.5;
    ctx.beginPath(); ctx.roundRect(c.x, c.y, c.w, c.h, 16); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;

    // カラートップバー
    const tg = ctx.createLinearGradient(c.x, c.y, c.x + c.w, c.y);
    tg.addColorStop(0, 'transparent'); tg.addColorStop(0.5, c.col + '55'); tg.addColorStop(1, 'transparent');
    ctx.fillStyle = tg; ctx.fillRect(c.x, c.y, c.w, 3);

    // ヒントキー
    ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.font = '10px Orbitron,Courier New'; ctx.textAlign = 'center';
    ctx.fillText(c.hint, c.x + c.w / 2, c.y + 22);

    // 大アイコン
    ctx.fillStyle = c.col; ctx.font = 'bold 56px Orbitron,Courier New';
    ctx.shadowColor = c.col; ctx.shadowBlur = hov ? 28 : 14;
    ctx.fillText(c.icon, c.x + c.w / 2, c.y + 130); ctx.shadowBlur = 0;

    // タイトル
    ctx.fillStyle = '#ffffff'; ctx.font = 'bold 18px Orbitron,Courier New';
    ctx.fillText(c.title, c.x + c.w / 2, c.y + 170);
    ctx.fillStyle = c.col + 'aa'; ctx.font = '10px Orbitron,Courier New';
    ctx.fillText(c.sub, c.x + c.w / 2, c.y + 188);

    // 説明
    c.desc.split('\n').forEach((line, li) => {
      ctx.fillStyle = 'rgba(180,210,255,0.70)'; ctx.font = '11px Orbitron,Courier New';
      ctx.fillText(line, c.x + c.w / 2, c.y + 218 + li * 18);
    });

    // 難易度
    ctx.fillStyle = 'rgba(255,220,100,0.7)'; ctx.font = 'bold 13px Orbitron,Courier New';
    ctx.fillText(`難易度: ${c.diff}`, c.x + c.w / 2, c.y + 268);

    // 出撃ボタン
    const bg2 = ctx.createLinearGradient(c.x + 20, c.y + 300, c.x + c.w - 20, c.y + 348);
    bg2.addColorStop(0, c.col + '33'); bg2.addColorStop(1, c.col + '11');
    ctx.fillStyle = bg2; ctx.strokeStyle = c.col; ctx.lineWidth = 1.5;
    ctx.shadowColor = c.col; ctx.shadowBlur = hov ? 18 * pulse : 6;
    ctx.beginPath(); ctx.roundRect(c.x + 20, c.y + 308, c.w - 40, 46, 10); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;
    ctx.fillStyle = hov ? '#fff' : c.col; ctx.font = 'bold 14px Orbitron,Courier New';
    ctx.fillText('▶  出  撃', c.x + c.w / 2, c.y + 337);

    ctx.restore();
  });

  const wk = readWeeklyLocalBoard();
  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(100,130,200,0.45)'; ctx.font = 'bold 10px Orbitron,Courier New';
  ctx.fillText('週次スコア（端末内・自動で週切替）', 24, H - 118);
  ctx.font = '9px Orbitron,Courier New';
  const fmtTop = (arr, x0, y0) => {
    (arr || []).slice(0, 3).forEach((e, i) => {
      ctx.fillStyle = 'rgba(180,200,240,0.75)';
      ctx.fillText(`${i + 1}. ${(e.name || '?').slice(0, 10)}  ${e.score}`, x0, y0 + i * 12);
    });
    if (!(arr || []).length) {
      ctx.fillStyle = 'rgba(120, 130, 150, 0.6)';
      ctx.fillText('—', x0, y0);
    }
  };
  ctx.fillStyle = 'rgba(255,160,100,0.85)'; ctx.fillText('ボスラッシュ', 34, H - 100);
  fmtTop(wk.boss, 34, H - 86);
  ctx.fillStyle = 'rgba(100,200,255,0.85)'; ctx.fillText('エンドレス', W / 2 + 10, H - 100);
  fmtTop(wk.endless, W / 2 + 10, H - 86);

  ctx.fillStyle = 'rgba(120,150,220,0.30)'; ctx.font = '10px Orbitron,Courier New'; ctx.textAlign = 'center';
  ctx.fillText('[ ESC ]  出撃準備に戻る', W / 2, H - 16);
  ctx.textAlign = 'left'; ctx.lineWidth = 1;
}

export function drawMapScreen() {
  ctx.fillStyle = 'rgba(0,0,0,0.88)'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#fff'; ctx.font = 'bold 30px Orbitron,Courier New'; ctx.textAlign = 'center';
  ctx.shadowColor = '#00ff55'; ctx.shadowBlur = 20;
  ctx.fillText('ROUTE  SELECT', W / 2, 80); ctx.shadowBlur = 0;
  ctx.fillStyle = '#aaa'; ctx.font = '13px Orbitron,Courier New';
  ctx.fillText(`STAGE ${game.stage + 1}  /  1 または 2 キーで選択`, W / 2, 112);
  game.mapRoutes.forEach((type, i) => {
    const x = 80 + i * 340, y = 148, w = 300, h = 260;
    const col = STAGE_TYPE_COLORS[type];
    ctx.fillStyle = 'rgba(8,8,24,0.92)'; ctx.strokeStyle = col; ctx.lineWidth = 2;
    ctx.shadowColor = col; ctx.shadowBlur = 18;
    ctx.beginPath(); ctx.roundRect(x, y, w, h, 14); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;
    // 番号
    ctx.fillStyle = col; ctx.font = 'bold 44px Orbitron,Courier New'; ctx.textAlign = 'center';
    ctx.fillText(`${i + 1}`, x + w / 2, y + 60);
    // タイプ名
    ctx.fillStyle = '#fff'; ctx.font = 'bold 17px Orbitron,Courier New';
    ctx.fillText(STAGE_TYPE_LABELS[type], x + w / 2, y + 105);
    // 説明
    ctx.fillStyle = '#aaa'; ctx.font = '12px Orbitron,Courier New';
    ctx.fillText(STAGE_TYPE_DESCS[type], x + w / 2, y + 138);
    // アイコン
    ctx.fillStyle = col; ctx.font = '36px Orbitron,Courier New';
    const icons = { normal: '★', boss_rush: '!!', survival: '⏱', escort: '▲' };
    ctx.fillText(icons[type], x + w / 2, y + 200);
    // 難易度
    const diff = { normal: '★★☆', boss_rush: '★★★', survival: '★★☆', escort: '★★★' };
    ctx.fillStyle = '#888'; ctx.font = '11px Orbitron,Courier New';
    ctx.fillText(diff[type], x + w / 2, y + 238);
  });
  ctx.textAlign = 'left'; ctx.lineWidth = 1;
}

export function drawGachaScreen() {
  ctx.fillStyle = '#02010d'; ctx.fillRect(0, 0, W, H);
  const t = game.frameCount * 0.012;
  const tab = game.gachaTab;
  if (tab !== 2) {
    const blobs = tab === 0
      ? [[220, 300, 240, '#cc8800'], [520, 360, 200, '#886622'], [380, 520, 160, '#554422'], [640, 200, 120, '#442200']]
      : [[160, 260, 200, '#3300aa'], [320, 380, 140, '#660033'], [80, 420, 120, '#001166']];
    blobs.forEach(([nx, ny, nr, nc]) => {
      const ng = ctx.createRadialGradient(nx, ny, 0, nx, ny, nr);
      ng.addColorStop(0, nc + (tab === 0 ? '38' : '44')); ng.addColorStop(0.55, nc + (tab === 0 ? '12' : '14')); ng.addColorStop(1, 'transparent');
      ctx.fillStyle = ng; ctx.fillRect(0, 0, W, H);
    });
  } else {
    ctx.fillStyle = '#080a10'; ctx.fillRect(418, 0, W - 418, H);
  }

  ctx.strokeStyle = tab === 2 ? 'rgba(80,140,200,0.35)' : 'rgba(100,60,180,0.28)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(420, 0); ctx.lineTo(420, H); ctx.stroke();

  drawGachaLeftColumn(tab, t);

  // ===== RIGHT: タブ切り替え =====
  const tabW = 120, tabH = 34, tab1x = 434, tab2x = 556, tab3x = 678;
  const gachaTabs = [
    { x: tab1x, label: '通常', active: game.gachaTab === 0, col: '#ffd700', bg: 'rgba(80,56,0,0.95)' },
    { x: tab2x, label: 'プレミアム', active: game.gachaTab === 1, col: '#cc44ff', bg: 'rgba(60,0,100,0.97)' },
    { x: tab3x, label: '図鑑', active: game.gachaTab === 2, col: '#44ccff', bg: 'rgba(0,40,80,0.97)' },
  ];
  gachaTabs.forEach(gt => {
    ctx.fillStyle = gt.active ? gt.bg : 'rgba(18,18,24,0.85)';
    ctx.strokeStyle = gt.active ? gt.col : '#2a2a3a'; ctx.lineWidth = gt.active ? 2 : 1;
    ctx.beginPath(); ctx.roundRect(gt.x, 6, tabW, tabH, 8); ctx.fill(); ctx.stroke();
    ctx.fillStyle = gt.active ? gt.col : '#c8d0e0'; ctx.font = 'bold 12px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif'; ctx.textAlign = 'center';
    ctx.shadowColor = gt.active ? gt.col : 'transparent'; ctx.shadowBlur = gt.active ? 8 : 0;
    ctx.fillText(gt.label, gt.x + tabW / 2, 28); ctx.shadowBlur = 0;
  });
  const pkItem = ALL_GACHA_POOL.find(i => i.id === currentPickupId);
  const panelX = 430, panelY = 44, panelW = 334;
  const panelH = game.gachaTab === 1 ? 472 : 400;
  if (game.gachaTab === 0 || game.gachaTab === 1) {
    const baseCol = game.gachaTab === 0 ? 'rgba(86,62,12,0.35)' : 'rgba(110,36,140,0.34)';
    const rimCol = game.gachaTab === 0 ? 'rgba(255,210,90,0.45)' : 'rgba(222,120,255,0.45)';
    const panelG = ctx.createLinearGradient(panelX, panelY, panelX, panelY + panelH);
    panelG.addColorStop(0, 'rgba(12,14,24,0.94)');
    panelG.addColorStop(0.55, 'rgba(9,10,18,0.96)');
    panelG.addColorStop(1, 'rgba(7,8,14,0.98)');
    ctx.fillStyle = panelG; ctx.strokeStyle = rimCol; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.roundRect(panelX, panelY, panelW, panelH, 12); ctx.fill(); ctx.stroke();
    ctx.fillStyle = baseCol;
    ctx.beginPath(); ctx.roundRect(panelX + 6, panelY + 6, panelW - 12, 44, 9); ctx.fill();
    ctx.strokeStyle = 'rgba(190,210,255,0.09)';
    ctx.beginPath(); ctx.moveTo(panelX + 8, panelY + 86); ctx.lineTo(panelX + panelW - 8, panelY + 86); ctx.stroke();
  }

  if (game.gachaTab === 0) {
    // ===== 通常ガチャ (COINS) =====
    const coinPulse = 0.88 + Math.sin(t * 3.5) * 0.12;
    ctx.shadowColor = '#ffd700'; ctx.shadowBlur = 14 * coinPulse;
    ctx.fillStyle = '#887700'; ctx.font = '10px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif'; ctx.textAlign = 'left';
    ctx.fillText('● コイン', 434, 58);
    ctx.fillStyle = '#ffd700'; ctx.font = 'bold 26px Orbitron,Courier New';
    ctx.fillText(game.coins.toLocaleString(), 434, 86); ctx.shadowBlur = 0;
    // デイリー無料ボタン
    const canDaily = canDailyGacha();
    const bdY = 96;
    ctx.fillStyle = canDaily ? 'rgba(0,50,30,0.95)' : 'rgba(14,14,14,0.7)';
    ctx.strokeStyle = canDaily ? '#00ff88' : '#1a2a1a'; ctx.lineWidth = canDaily ? 2 : 1;
    ctx.beginPath(); ctx.roundRect(432, bdY, 328, 38, 8); ctx.fill(); ctx.stroke();
    ctx.fillStyle = canDaily ? '#00ff88' : '#334'; ctx.font = 'bold 11px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(canDaily ? 'デイリー無料ガチャ ★' : '本日のデイリーは済み', 596, bdY + 24);
    // 1回ボタン
    const can1 = game.coins >= 500;
    const b1y = 144;
    ctx.shadowColor = can1 ? '#ffd700' : 'transparent'; ctx.shadowBlur = can1 ? 12 : 0;
    const bg1 = ctx.createLinearGradient(432, b1y, 760, b1y + 90);
    bg1.addColorStop(0, can1 ? 'rgba(130,95,28,0.98)' : 'rgba(20,20,20,0.85)');
    bg1.addColorStop(0.55, can1 ? 'rgba(88,62,18,0.96)' : 'rgba(16,16,16,0.88)');
    bg1.addColorStop(1, can1 ? 'rgba(48,34,8,0.96)' : 'rgba(14,14,14,0.85)');
    ctx.fillStyle = bg1; ctx.strokeStyle = can1 ? '#ffd700' : '#252525'; ctx.lineWidth = can1 ? 2 : 1;
    ctx.beginPath(); ctx.roundRect(432, b1y, 328, 90, 12); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;
    ctx.fillStyle = can1 ? '#ffd700' : '#2a2a2a'; ctx.beginPath(); ctx.roundRect(432, b1y, 50, 24, 6); ctx.fill();
    ctx.fillStyle = '#000'; ctx.font = 'bold 9px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif'; ctx.textAlign = 'center'; ctx.fillText('1回', 457, b1y + 16);
    drawCoinInlineIcon(442, b1y + 42, 11);
    ctx.fillStyle = can1 ? '#ffe566' : '#dbe2f0'; ctx.font = '900 20px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif'; ctx.textAlign = 'left';
    ctx.fillText('コインで1回まわす', 456, b1y + 48);
    const c1cw = 122, c1ch = 28, c1cx = 756 - c1cw, c1cy = b1y + 62;
    ctx.fillStyle = can1 ? 'rgba(84,56,8,0.98)' : 'rgba(44,44,52,0.95)';
    ctx.strokeStyle = can1 ? '#ffd978' : '#9aa3b6'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.roundRect(c1cx, c1cy, c1cw, c1ch, 7); ctx.fill(); ctx.stroke();
    drawCoinInlineIcon(c1cx + 18, b1y + 78, 10);
    ctx.fillStyle = can1 ? '#fff4c8' : '#e2e6ef'; ctx.font = 'bold 16px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif'; ctx.textAlign = 'right';
    ctx.fillText('コイン500', c1cx + c1cw - 10, b1y + 84);
    ctx.textAlign = 'left';
    ctx.fillStyle = can1 ? '#66ee66' : '#9aa3b8'; ctx.font = 'bold 11px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif';
    ctx.fillText('タップで引く', 448, b1y + 80);
    // 10連ボタン
    const can10 = game.coins >= 5000;
    const b2y = 244;
    ctx.shadowColor = can10 ? '#ffd700' : 'transparent'; ctx.shadowBlur = can10 ? 12 : 0;
    const bg2 = ctx.createLinearGradient(432, b2y, 760, b2y + 102);
    bg2.addColorStop(0, can10 ? 'rgba(130,95,28,0.98)' : 'rgba(20,20,20,0.85)');
    bg2.addColorStop(0.55, can10 ? 'rgba(88,62,18,0.96)' : 'rgba(16,16,16,0.88)');
    bg2.addColorStop(1, can10 ? 'rgba(48,34,8,0.96)' : 'rgba(14,14,14,0.85)');
    ctx.fillStyle = bg2; ctx.strokeStyle = can10 ? '#ffd700' : '#252525'; ctx.lineWidth = can10 ? 2 : 1;
    ctx.beginPath(); ctx.roundRect(432, b2y, 328, 102, 12); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;
    ctx.fillStyle = can10 ? '#ffd700' : '#2a2a2a'; ctx.beginPath(); ctx.roundRect(432, b2y, 50, 24, 6); ctx.fill();
    ctx.fillStyle = '#000'; ctx.font = 'bold 9px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif'; ctx.textAlign = 'center'; ctx.fillText('10連', 457, b2y + 16);
    ctx.shadowColor = can10 ? '#ff9900' : 'transparent'; ctx.shadowBlur = can10 ? 8 : 0;
    ctx.fillStyle = can10 ? 'rgba(80,40,0,0.92)' : 'rgba(25,18,0,0.7)'; ctx.strokeStyle = can10 ? '#ff9900' : '#2a2000'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(570, b2y + 5, 182, 20, 4); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;
    ctx.fillStyle = can10 ? '#ff9900' : '#3a2800'; ctx.font = 'bold 9px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('★ SR以上1枚確定', 661, b2y + 19);
    drawCoinInlineIcon(442, b2y + 52, 11);
    ctx.fillStyle = can10 ? '#ffe566' : '#e3d9ee'; ctx.font = '900 20px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif'; ctx.textAlign = 'left';
    ctx.fillText('コインで10回まわす', 456, b2y + 58);
    const c10cw = 132, c10ch = 28, c10cx = 756 - c10cw, c10cy = b2y + 66;
    ctx.fillStyle = can10 ? 'rgba(84,56,8,0.98)' : 'rgba(44,44,52,0.95)';
    ctx.strokeStyle = can10 ? '#ffd978' : '#9aa3b6'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.roundRect(c10cx, c10cy, c10cw, c10ch, 7); ctx.fill(); ctx.stroke();
    drawCoinInlineIcon(c10cx + 18, b2y + 82, 10);
    ctx.fillStyle = can10 ? '#fff4c8' : '#e2e6ef'; ctx.font = 'bold 16px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif'; ctx.textAlign = 'right';
    ctx.fillText('コイン5000', c10cx + c10cw - 10, b2y + 88);
    ctx.textAlign = 'left';
    ctx.fillStyle = can10 ? '#66ee66' : '#9aa3b8'; ctx.font = 'bold 11px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif';
    ctx.fillText('タップで引く', 448, b2y + 88);
    // 天井バー
    const b3y = 356; const pityLeft = 80 - game.gachaPityCount;
    const pityCol = pityLeft <= 10 ? '#ff4444' : pityLeft <= 20 ? '#ff9900' : '#445566';
    ctx.fillStyle = 'rgba(14,14,28,0.92)'; ctx.strokeStyle = pityLeft <= 10 ? '#ff4444' : '#1a2a3a'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(432, b3y, 328, 30, 8); ctx.fill(); ctx.stroke();
    ctx.fillStyle = pityCol; ctx.shadowColor = pityCol; ctx.shadowBlur = pityLeft <= 10 ? 6 : 0;
    ctx.font = 'bold 12px Orbitron,Courier New'; ctx.textAlign = 'left';
    ctx.fillText('SSR天井 まで', 442, b3y + 19);
    ctx.textAlign = 'right'; ctx.font = 'bold 14px Orbitron,Courier New';
    ctx.fillText(`${pityLeft} 回`, 750, b3y + 19); ctx.shadowBlur = 0;
    ctx.fillStyle = '#1a1a2a'; ctx.fillRect(436, b3y + 24, 320, 4);
    ctx.fillStyle = pityCol; ctx.fillRect(436, b3y + 24, 320 * (game.gachaPityCount / 80), 4);

  } else {
    // ===== プレミアムガチャ (GEMS) =====
    ctx.shadowColor = 'rgba(240,180,255,0.25)'; ctx.shadowBlur = 6;
    ctx.fillStyle = '#f1d7ff'; ctx.font = 'bold 11px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif'; ctx.textAlign = 'left'; ctx.fillText('所持ジェム', 434, 56);
    const gemHeldText = String(game.gems);
    drawGemInlineIcon(448, 84, 12, '#68dfff');
    ctx.fillStyle = '#f08fff'; ctx.font = 'bold 26px Orbitron,Courier New'; ctx.fillText(gemHeldText, 462, 92); ctx.shadowBlur = 0;

    // ピックアップバナー
    if (pkItem) {
      const pkc = RARITY_COLORS[pkItem.rarity] || '#ffdd00';
      ctx.save(); ctx.globalAlpha = 0.12; ctx.fillStyle = pkc;
      ctx.beginPath(); ctx.roundRect(432, 96, 328, 60, 10); ctx.fill(); ctx.restore();
      ctx.fillStyle = 'rgba(10,6,20,0.9)'; ctx.strokeStyle = pkc; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.roundRect(432, 96, 328, 60, 10); ctx.fill(); ctx.stroke();
      ctx.shadowColor = pkc; ctx.shadowBlur = 10;
      ctx.fillStyle = '#ff4'; ctx.font = 'bold 9px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif'; ctx.textAlign = 'left';
      ctx.fillText('★ ピックアップ', 440, 113); ctx.shadowBlur = 0;
      ctx.fillStyle = pkc; ctx.font = 'bold 14px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif'; ctx.fillText(pkItem.label, 440, 130);
      ctx.fillStyle = '#9aa2b8'; ctx.font = '10px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif';
      ctx.fillText(`${pkItem.rarity}  ${truncateLine(ctx, pkItem.desc || '', 188)}`, 440, 146);
      // mini icon
      ctx.save(); ctx.translate(742, 126); ctx.scale(0.7, 0.7); ctx.fillStyle = pkc; ctx.shadowColor = pkc; ctx.shadowBlur = 12;
      drawGachaItemIcon(pkItem); ctx.restore();
    }

    // 1回 (5gems)
    const canP1 = game.gems >= 5;
    const pb1y = 166;
    ctx.shadowColor = canP1 ? '#cc44ff' : 'transparent'; ctx.shadowBlur = canP1 ? 6 : 0;
    const pbg1 = ctx.createLinearGradient(432, pb1y, 760, pb1y + 90);
    pbg1.addColorStop(0, canP1 ? 'rgba(80,0,140,0.97)' : 'rgba(20,20,20,0.85)');
    pbg1.addColorStop(1, canP1 ? 'rgba(50,0,90,0.95)' : 'rgba(14,14,14,0.85)');
    ctx.fillStyle = pbg1; ctx.strokeStyle = canP1 ? '#cc44ff' : '#252525'; ctx.lineWidth = canP1 ? 2 : 1;
    ctx.beginPath(); ctx.roundRect(432, pb1y, 328, 90, 12); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;
    ctx.fillStyle = canP1 ? '#cc44ff' : '#2a2a2a'; ctx.beginPath(); ctx.roundRect(432, pb1y, 50, 24, 6); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = 'bold 9px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif'; ctx.textAlign = 'center'; ctx.fillText('1回', 457, pb1y + 16);
    drawGemInlineIcon(442, pb1y + 42, 11, canP1 ? '#7de6ff' : '#b7bccd');
    ctx.fillStyle = canP1 ? '#f6c0ff' : '#e6d8f2'; ctx.font = '900 20px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif'; ctx.textAlign = 'left';
    ctx.fillText('ジェムで1回まわす', 456, pb1y + 48);
    ctx.fillStyle = canP1 ? '#ffd8ff' : '#f0e2ff'; ctx.font = 'bold 16px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif'; ctx.textAlign = 'right';
    const gemCostText = 'ジェム5';
    const c1w = 118, c1h = 28, c1x = 756 - c1w, c1y = pb1y + 62;
    ctx.fillStyle = canP1 ? 'rgba(72,32,108,0.98)' : 'rgba(42,42,52,0.95)';
    ctx.strokeStyle = canP1 ? '#efb8ff' : '#9aa3b6'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.roundRect(c1x, c1y, c1w, c1h, 7); ctx.fill(); ctx.stroke();
    drawGemInlineIcon(c1x + 18, pb1y + 78, 10, canP1 ? '#7de6ff' : '#b7bccd');
    ctx.fillStyle = canP1 ? '#fff2ff' : '#e2e6ef';
    ctx.fillText(gemCostText, c1x + c1w - 10, pb1y + 84);
    ctx.textAlign = 'left';
    ctx.fillStyle = canP1 ? '#cc88ff' : '#9aa3b8'; ctx.font = 'bold 11px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif';
    ctx.fillText('タップで引く', 448, pb1y + 80);

    // 10連 (50gems)
    const canP10 = game.gems >= 50;
    const pb2y = 266;
    ctx.shadowColor = canP10 ? '#ff88ff' : 'transparent'; ctx.shadowBlur = canP10 ? 14 : 0;
    const pbg2 = ctx.createLinearGradient(432, pb2y, 760, pb2y + 102);
    pbg2.addColorStop(0, canP10 ? 'rgba(120,0,160,0.97)' : 'rgba(20,20,20,0.85)');
    pbg2.addColorStop(1, canP10 ? 'rgba(80,0,110,0.95)' : 'rgba(14,14,14,0.85)');
    ctx.fillStyle = pbg2; ctx.strokeStyle = canP10 ? '#ff88ff' : '#252525'; ctx.lineWidth = canP10 ? 2 : 1;
    ctx.beginPath(); ctx.roundRect(432, pb2y, 328, 102, 12); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;
    ctx.fillStyle = canP10 ? '#ff88ff' : '#2a2a2a'; ctx.beginPath(); ctx.roundRect(432, pb2y, 50, 24, 6); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = 'bold 9px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif'; ctx.textAlign = 'center'; ctx.fillText('10連', 457, pb2y + 16);
    ctx.shadowColor = canP10 ? '#ffdd00' : 'transparent'; ctx.shadowBlur = canP10 ? 8 : 0;
    ctx.fillStyle = canP10 ? 'rgba(80,60,0,0.9)' : 'rgba(25,18,0,0.7)'; ctx.strokeStyle = canP10 ? '#ffdd00' : '#2a2000'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(570, pb2y + 5, 182, 20, 4); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;
    ctx.fillStyle = canP10 ? '#ffdd00' : '#3a2800'; ctx.font = 'bold 9px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('★ 10連はSSR20%', 661, pb2y + 19);
    drawGemInlineIcon(442, pb2y + 52, 11, canP10 ? '#7de6ff' : '#b7bccd');
    ctx.fillStyle = canP10 ? '#ff88ff' : '#e0cfea'; ctx.font = '900 20px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif'; ctx.textAlign = 'left';
    ctx.fillText('ジェムで10回まわす', 456, pb2y + 58);
    const c10w = 116, c10h = 28, c10x = 756 - c10w, c10y = pb2y + 66;
    ctx.fillStyle = canP10 ? 'rgba(62,26,92,0.95)' : 'rgba(42,42,52,0.92)';
    ctx.strokeStyle = canP10 ? '#dda0ff' : '#888fa3'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.roundRect(c10x, c10y, c10w, c10h, 7); ctx.fill(); ctx.stroke();
    drawGemInlineIcon(c10x + 18, pb2y + 82, 10, canP10 ? '#7de6ff' : '#b7bccd');
    ctx.fillStyle = canP10 ? '#ffd8ff' : '#f0e2ff'; ctx.font = 'bold 16px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif'; ctx.textAlign = 'right';
    ctx.fillText('ジェム50', c10x + c10w - 10, pb2y + 88);
    ctx.textAlign = 'left';
    ctx.fillStyle = canP10 ? '#ee88ff' : '#9aa3b8'; ctx.font = 'bold 11px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif';
    ctx.fillText('タップで引く', 448, pb2y + 92);
    // 天井情報 (premium): SSR/LRを1ブロックに統合
    const pb3y = 378;
    const ppLeft = 50 - game.premiumPityCount;
    const plrLeft = 100 - game.premiumLrPityCount;
    const ppCol = ppLeft <= 5 ? '#ff5555' : ppLeft <= 15 ? '#ffb347' : '#b38cff';
    const plrCol = plrLeft <= 10 ? '#ff4b80' : plrLeft <= 25 ? '#ff9d57' : '#9d5aa6';
    ctx.fillStyle = 'rgba(15,10,26,0.94)'; ctx.strokeStyle = 'rgba(148,110,190,0.6)'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.roundRect(432, pb3y, 328, 56, 8); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#d5c4f3'; ctx.font = 'bold 11px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif'; ctx.textAlign = 'left';
    ctx.fillText('天井', 442, pb3y + 14);
    ctx.fillStyle = ppCol; ctx.font = 'bold 11px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif';
    ctx.fillText(`SSRまで ${ppLeft}回`, 442, pb3y + 30);
    ctx.fillStyle = plrCol;
    ctx.fillText(`LRまで ${plrLeft}回`, 442, pb3y + 46);
    ctx.fillStyle = 'rgba(38,28,58,0.95)'; ctx.fillRect(582, pb3y + 23, 170, 4);
    ctx.fillStyle = ppCol; ctx.fillRect(582, pb3y + 23, 170 * (game.premiumPityCount / 50), 4);
    ctx.fillStyle = 'rgba(38,20,36,0.95)'; ctx.fillRect(582, pb3y + 39, 170, 4);
    ctx.fillStyle = plrCol; ctx.fillRect(582, pb3y + 39, 170 * (game.premiumLrPityCount / 100), 4);
  }

  if (game.gachaTab === 0 || game.gachaTab === 1) {
    const auxL = getGachaAuxStripLayout();
    if (auxL) drawGachaAuxInfoStrip(auxL);
  }
  drawGachaInsufficientModal();

  // 図鑑タブ
  if (game.gachaTab === 2) {
    ctx.fillStyle = 'rgba(8,10,16,0.98)';
    ctx.beginPath(); ctx.roundRect(426, 38, W - 430, H - 46, 12); ctx.fill();
    ctx.strokeStyle = 'rgba(70,150,210,0.45)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.roundRect(426, 38, W - 430, H - 46, 12); ctx.stroke();
    const filters = ['キャラ', '装備', 'ペット', '武器'];
    const filterPools = getGachaZukanFilterPools();
    const fPool = filterPools[game.collectionFilter] || [];

    // フィルタタブ
    const fW = 88, fH = 30, fStartX = 432, fY = 42;
    filters.forEach((label, fi) => {
      const active = game.collectionFilter === fi;
      const fCol = ['#00ccff', '#ff8844', '#cc88ff', '#44aaff'][fi];
      ctx.fillStyle = active ? `rgba(${hexToRgb(fCol)},0.32)` : 'rgba(26,30,42,0.96)';
      ctx.strokeStyle = active ? fCol : '#4a5568'; ctx.lineWidth = active ? 2 : 1;
      ctx.beginPath(); ctx.roundRect(fStartX + fi * fW, fY, fW - 2, fH, 6); ctx.fill(); ctx.stroke();
      ctx.fillStyle = active ? fCol : '#dde6f5'; ctx.font = `bold ${active ? 13 : 12}px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif`; ctx.textAlign = 'center';
      ctx.shadowColor = active ? fCol : 'transparent'; ctx.shadowBlur = active ? 8 : 0;
      ctx.fillText(label, fStartX + fi * fW + fW / 2 - 1, fY + 20); ctx.shadowBlur = 0;
    });

    // グリッド表示（右パネル内で横方向センター・列少なめでラベル幅を確保）
    const { cols: COLS, cellW, cellH, gPad, gStartX, gStartY, maxRows } = computeZukanGridMetrics(fY, fH);
    const maxCursor = Math.max(0, fPool.length - 1);
    game.collectionCursor = Math.max(0, Math.min(game.collectionCursor, maxCursor));
    const cursorRow = Math.floor(game.collectionCursor / COLS);
    const startRow = Math.max(0, Math.min(cursorRow - Math.floor(maxRows / 2), Math.ceil(fPool.length / COLS) - maxRows));

    for (let row = 0; row < maxRows; row++) {
      for (let col = 0; col < COLS; col++) {
        const idx = (startRow + row) * COLS + col;
        if (idx >= fPool.length) continue;
        const item = fPool[idx];
        const owned = !!game.gachaInventory[item.id];
        const isCur = idx === game.collectionCursor;
        const rc = RARITY_COLORS[item.rarity] || item.color || '#888';
        const cx2 = gStartX + col * (cellW + gPad), cy2 = gStartY + row * (cellH + gPad);

        ctx.fillStyle = owned ? (isCur ? `rgba(${hexToRgb(rc)},0.32)` : 'rgba(26,30,44,0.98)') : 'rgba(16,18,28,0.96)';
        ctx.strokeStyle = owned ? (isCur ? rc : 'rgba(100,130,180,0.55)') : 'rgba(50,60,85,0.65)';
        ctx.lineWidth = isCur ? 2 : 1;
        if (isCur) { ctx.shadowColor = rc; ctx.shadowBlur = 14; }
        ctx.beginPath(); ctx.roundRect(cx2, cy2, cellW, cellH, 6); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;

        // レアリティバー
        ctx.fillStyle = owned ? rc + '99' : '#22283444'; ctx.globalAlpha = owned ? 0.8 : 0.3;
        ctx.fillRect(cx2, cy2, cellW, 2); ctx.globalAlpha = 1;

        // アイコン or ?
        ctx.save(); ctx.translate(cx2 + cellW / 2, cy2 + cellH / 2 - 6);
        if (owned) {
          ctx.fillStyle = rc; ctx.shadowColor = rc; ctx.shadowBlur = isCur ? 12 : 4;
          if (item.type === 'char' || item.type === 'skin') drawShipShape(-9, -5, 18, 11, pickCharShipShape(item), item.color || rc, item.rarity);
          else if (item.type === 'pet' && item.effect) { ctx.scale(0.58, 0.58); drawPetShape(item.effect, rc, item.rarity); }
          else if (item.type === 'equip') { ctx.scale(0.62, 0.62); drawEquipShape(item, rc, item.rarity); }
          else { ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(6, 0); ctx.lineTo(0, 8); ctx.lineTo(-6, 0); ctx.closePath(); ctx.fill(); }
          ctx.shadowBlur = 0;
        } else {
          ctx.fillStyle = 'rgba(60,70,100,0.5)'; ctx.font = 'bold 20px Orbitron,Courier New'; ctx.textAlign = 'center';
          ctx.fillText('?', 0, 8);
        }
        ctx.restore();

        // ラベル（セル幅に合わせて省略）
        ctx.fillStyle = owned ? (isCur ? '#ffffff' : '#e8eef8') : '#aab8d0'; ctx.font = 'bold 10px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif'; ctx.textAlign = 'center';
        const lblPad = 10;
        const lbl = owned ? truncateLine(ctx, item.label, Math.max(24, cellW - lblPad)) : '？？？';
        ctx.fillText(lbl, cx2 + cellW / 2, cy2 + cellH - 3);

        // 所持Lvバッジ
        if (owned && game.gachaInventory[item.id] && (game.gachaInventory[item.id].level || 1) > 1) {
          const lv = game.gachaInventory[item.id].level;
          ctx.fillStyle = 'rgba(255,200,60,0.85)'; ctx.font = 'bold 7px Orbitron,Courier New'; ctx.textAlign = 'center';
          ctx.fillText(`Lv${lv}`, cx2 + 10, cy2 + 10);
        }
      }
    }

    // 図鑑タブ: 天井付近と同系の補助ボタン（排出率はモーダル）
    const fty = H - 50, fth = 40, fgap = 6;
    const fw1 = Math.floor((W - 434 - fgap * 3) / 2);
    const fx2 = 434 + fw1 + fgap;
    ctx.fillStyle = 'rgba(26,28,44,0.96)'; ctx.strokeStyle = 'rgba(120,140,200,0.55)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.roundRect(434, fty, fw1, fth, 10); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#aab8e8'; ctx.font = 'bold 12px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('ℹ 排出率', 434 + fw1 / 2, fty + fth / 2 + 4);
    const dg = ctx.createLinearGradient(fx2, fty, fx2 + fw1, fty + fth);
    dg.addColorStop(0, 'rgba(90,65,0,0.98)'); dg.addColorStop(1, 'rgba(40,28,0,0.96)');
    ctx.shadowColor = '#ffd700'; ctx.shadowBlur = 7;
    ctx.fillStyle = dg; ctx.strokeStyle = 'rgba(255,204,68,0.7)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.roundRect(fx2, fty, fw1, fth, 10); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;
    ctx.fillStyle = '#ffe8a0'; ctx.font = 'bold 11px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif'; ctx.textAlign = 'left';
    ctx.fillText('スターダスト交換', fx2 + 10, fty + 18);
    ctx.fillStyle = '#ffd700'; ctx.font = 'bold 18px Orbitron,Courier New'; ctx.textAlign = 'right';
    ctx.fillText(`✦ ${game.gachaStardust}`, fx2 + fw1 - 8, fty + 28);
    ctx.fillStyle = '#c8d4e8'; ctx.font = '10px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif';
    ctx.fillText('フィルタ・マス・下のボタンはタップ', 596, H - 8);
  } else {
    // ナビヒント
    ctx.fillStyle = '#889'; ctx.font = '9px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('R: 排出率モーダル　S: スターダスト交換', 596, H - 8);
  }

  ctx.textAlign = 'left'; ctx.lineWidth = 1;
}

export function drawShopScreen() {
  const t = game.frameCount;

  // ── 背景: SF グリッド ──
  ctx.fillStyle = '#020408'; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = 'rgba(0,180,255,0.045)'; ctx.lineWidth = 1;
  for (let x = 0; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
  for (let y = 0; y < H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  // コーナー装飾
  [[0, 0, 1, 1], [W, 0, -1, 1], [0, H, 1, -1], [W, H, -1, -1]].forEach(([cx, cy, sx, sy]) => {
    ctx.strokeStyle = 'rgba(255,140,0,0.5)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(cx + sx * 6, cy); ctx.lineTo(cx + sx * 36, cy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, cy + sy * 6); ctx.lineTo(cx, cy + sy * 36); ctx.stroke();
  });
  // スキャンライン
  const scanY = ((t * 1.8) % H);
  const scanGrad = ctx.createLinearGradient(0, scanY - 40, 0, scanY + 40);
  scanGrad.addColorStop(0, 'rgba(255,140,0,0)');
  scanGrad.addColorStop(0.5, 'rgba(255,140,0,0.06)');
  scanGrad.addColorStop(1, 'rgba(255,140,0,0)');
  ctx.fillStyle = scanGrad; ctx.fillRect(0, scanY - 40, W, 80);

  // ── ヘッダー ──
  ctx.save();
  ctx.shadowColor = '#ff8833'; ctx.shadowBlur = 40;
  ctx.fillStyle = '#ff8833'; ctx.font = 'bold 30px Orbitron,Courier New'; ctx.textAlign = 'center';
  ctx.fillText('UPGRADE  SHOP', W / 2, 36); ctx.shadowBlur = 0;
  // 左デコレーションライン
  ctx.strokeStyle = '#ff8833'; ctx.lineWidth = 1; ctx.globalAlpha = 0.5;
  ctx.beginPath(); ctx.moveTo(30, 28); ctx.lineTo(200, 28); ctx.stroke();
  ctx.globalAlpha = 1;
  // E: 右側に総合進捗バー
  const _totalLv = SHOP_ITEMS.reduce((s, it) => s + (game.shopUpgrades[it.id] || 0), 0);
  const _totalMax = SHOP_ITEMS.length * SHOP_MAX_LV;
  const _pct = _totalLv / _totalMax;
  const _pbW = 160, _pbH = 5, _pbX = W - 196, _pbY = 22;
  ctx.fillStyle = '#1a1a2e'; ctx.beginPath(); ctx.roundRect(_pbX, _pbY, _pbW, _pbH, 2); ctx.fill();
  const _pgCol = _pct >= 1 ? '#00ff88' : '#ff8833';
  ctx.shadowColor = _pgCol; ctx.shadowBlur = _pct >= 1 ? 10 : 4;
  ctx.fillStyle = _pgCol; ctx.beginPath(); ctx.roundRect(_pbX, _pbY, Math.max(0, _pbW * _pct), _pbH, 2); ctx.fill(); ctx.shadowBlur = 0;
  ctx.fillStyle = _pct >= 1 ? '#00ff88' : '#ff8833'; ctx.font = '10px Orbitron,Courier New'; ctx.textAlign = 'right';
  ctx.fillText(`強化 ${_totalLv}/${_totalMax}`, W - 30, 33);
  ctx.restore();

  // ── リソースバー ──
  const resData = [
    { key: 'coins', v: `${game.coins.toLocaleString()}`, icon: '●', col: '#ffdd00', bg: 'rgba(60,50,0,0.8)' },
    { key: 'gems', v: `${game.gems}`, icon: '💎', col: '#cc88ff', bg: 'rgba(50,0,80,0.8)' },
    { key: 'scrap', v: `${game.materials.scrap || 0}`, icon: '🔩', col: '#bbbbbb', bg: 'rgba(30,30,30,0.8)' },
    { key: 'core', v: `${game.materials.core || 0}`, icon: '⚡', col: '#44ccff', bg: 'rgba(0,30,60,0.8)' },
    { key: 'crystal', v: `${game.materials.crystal || 0}`, icon: '💠', col: '#cc88ff', bg: 'rgba(40,0,60,0.8)' },
    { key: 'composite', v: `${game.materials.composite || 0}`, icon: '🔷', col: '#ffaa44', bg: 'rgba(60,30,0,0.8)' },
  ];
  // G: 選択アイテムの不足リソースを事前計算
  const _deficitKeys = new Set();
  if (game.shopTab === 0) {
    const _si = SHOP_ITEMS[game.shopCursor];
    if (_si) {
      const _sl = game.shopUpgrades[_si.id] || 0;
      if (_sl < SHOP_MAX_LV) {
        const [_sc, _sm] = getUpgradeLvCost(_sl);
        if (game.coins < _sc) _deficitKeys.add('coins');
        Object.entries(_sm).forEach(([k, v]) => {
          const h = k === 'gems' ? game.gems : (game.materials[k] || 0);
          if (h < v) _deficitKeys.add(k);
        });
      }
    }
  }
  const rbW = 108, rbH = 28, rbGap = 8, rbStartX = (W - (resData.length * (rbW + rbGap) - rbGap)) / 2;
  resData.forEach((r, i) => {
    const rx = rbStartX + i * (rbW + rbGap), ry = 48;
    const deficit = _deficitKeys.has(r.key);
    const dp = deficit ? (0.55 + Math.sin(t * 0.2) * 0.45) : 0;
    ctx.save();
    if (deficit) { ctx.shadowColor = '#ff3333'; ctx.shadowBlur = 10 * dp; }
    ctx.fillStyle = deficit ? `rgba(60,8,8,0.9)` : r.bg;
    ctx.strokeStyle = deficit ? `rgba(255,60,60,${0.3 + dp * 0.7})` : r.col + '55';
    ctx.lineWidth = deficit ? 2 : 1;
    ctx.beginPath(); ctx.roundRect(rx, ry, rbW, rbH, 14); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;
    ctx.fillStyle = deficit ? `rgba(255,${Math.floor(80 + dp * 175)},${Math.floor(80 + dp * 80)},1)` : r.col;
    ctx.font = 'bold 12px Orbitron,Courier New'; ctx.textAlign = 'center';
    ctx.fillText(`${r.icon} ${r.v}`, rx + rbW / 2, ry + 19);
    ctx.restore();
  });

  // ── タブ ──
  game._shopHits = [];
  // 画面幅が小さい時に「[ Q ] ◈ 強化」等が潰れやすいので、
  // キーは左バッジ、ラベルは右に可変幅で描画（擬似レスポンシブ）。
  const tabDefs = [
    { key: 'Q', icon: '◈', full: '強化' },
    { key: 'E', icon: '◆', full: '素材合成' },
    { key: 'R', icon: '⚔', full: '融合' },
  ];
  const shopTabW = (W - 64) / 3;
  tabDefs.forEach((def, i) => {
    const active = game.shopTab === i;
    const tx = 32 + i * (shopTabW + 4), tw = shopTabW;
    const pulse = active ? (0.9 + Math.sin(t * 0.08) * 0.1) : 1;
    const tabCol = i === 2 ? '#44aaff' : '#ff8833';
    ctx.save();
    if (active) {
      ctx.shadowColor = tabCol; ctx.shadowBlur = 16 * pulse;
      ctx.fillStyle = i === 2 ? 'rgba(0,28,60,0.95)' : 'rgba(60,28,0,0.95)';
    } else {
      ctx.fillStyle = 'rgba(10,10,18,0.85)';
    }
    ctx.strokeStyle = active ? tabCol : '#2a2a3a'; ctx.lineWidth = active ? 2 : 1;
    ctx.beginPath(); ctx.roundRect(tx, 82, tw, 26, 4); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;
    if (active) {
      ctx.strokeStyle = tabCol; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(tx + 8, 108); ctx.lineTo(tx + tw - 8, 108); ctx.stroke();
    }
    const yText = 100;
    const tabFontActive = Math.max(10, Math.min(13, Math.floor(tw / 22) + 2));
    const tabFont = active ? tabFontActive : Math.max(9, tabFontActive - 2);
    const labelFont = Math.max(8, tabFont - 1);
    const keyStr = `[${def.key}]`;
    ctx.fillStyle = active ? tabCol : '#444';
    ctx.font = `bold ${tabFont}px Orbitron,Courier New`;
    ctx.textAlign = 'left';
    const keyX = tx + 10;
    ctx.fillText(keyStr, keyX, yText);
    const keyW = ctx.measureText(keyStr).width;
    const labelX = keyX + keyW + 6;
    const labelMaxW = Math.max(20, tw - (labelX - tx) - 8);
    // 幅が足りない時はアイコンを落として短くする
    const labelFull = `${def.icon} ${def.full}`;
    const labelShort = def.full;
    ctx.font = `bold ${labelFont}px Orbitron,Courier New`;
    let labelToDraw = labelFull;
    if (ctx.measureText(labelFull).width > labelMaxW) labelToDraw = labelShort;
    ctx.fillText(truncateLine(ctx, labelToDraw, labelMaxW), labelX, yText);
    ctx.restore();
    // A: タブクリック判定
    game._shopHits.push({ type: 'tab', idx: i, x: tx, y: 82, w: tw, h: 26 });
  });

  // タブ説明は省略（ツリー領域を広く確保）

  if (game.shopTab === 0) {
    drawShopHex(ctx, W, H, game, game.frameCount);

  } else if (game.shopTab === 1) {
    // ══════════════════════════════════════
    // COMPOSE タブ
    // ══════════════════════════════════════
    ctx.save();
    const cpW = Math.min(480, W - 40), cpX = W / 2 - cpW / 2, cpY = 112;
    // 背景パネル
    const panelG = ctx.createLinearGradient(cpX, cpY, cpX + cpW, cpY + 350);
    panelG.addColorStop(0, 'rgba(30,18,0,0.95)'); panelG.addColorStop(1, 'rgba(10,8,0,0.95)');
    ctx.fillStyle = panelG; ctx.strokeStyle = '#ffaa4488'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(cpX, cpY, cpW, 350, 14); ctx.fill(); ctx.stroke();
    [[cpX, cpY], [cpX + cpW, cpY], [cpX, cpY + 350], [cpX + cpW, cpY + 350]].forEach(([cx, cy]) => {
      ctx.strokeStyle = '#ffaa44'; ctx.lineWidth = 2;
      const sx = cx === cpX ? 1 : -1, sy = cy === cpY ? 1 : -1;
      ctx.beginPath(); ctx.moveTo(cx, cy + sy * 6); ctx.lineTo(cx, cy + sy * 20); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx + sx * 6, cy); ctx.lineTo(cx + sx * 20, cy); ctx.stroke();
    });

    ctx.textAlign = 'center';
    ctx.shadowColor = '#ffaa44'; ctx.shadowBlur = 20;
    ctx.fillStyle = '#ffaa44'; ctx.font = 'bold 18px Orbitron,Courier New';
    ctx.fillText('◆  コンポジットコア合成', W / 2, cpY + 34); ctx.shadowBlur = 0;

    const haveScrap = game.materials.scrap || 0, haveCore = game.materials.core || 0;
    const maxBatch = Math.min(Math.floor(haveScrap / 5), Math.floor(haveCore / 3));
    const canCompose = maxBatch >= 1;

    // 素材カード (b: あとX個表示)
    [{ mat: '🔩 スクラップ', need: 5, have: haveScrap, col: MAT_COLOR.scrap },
    { mat: '⚡ エネルギーコア', need: 3, have: haveCore, col: MAT_COLOR.core }].forEach((r, ri) => {
      const cx = W / 2 + (ri === 0 ? -cpW / 4 : cpW / 4), cy = cpY + 108;
      const enough = r.have >= r.need;
      ctx.shadowColor = enough ? r.col : 'transparent'; ctx.shadowBlur = enough ? 10 : 0;
      ctx.fillStyle = enough ? `rgba(${hexToRgb(r.col)},0.15)` : 'rgba(15,15,15,0.9)';
      ctx.strokeStyle = enough ? r.col : '#333'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.roundRect(cx - cpW / 4 + 6, cy - 28, cpW / 2 - 12, 58, 8); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;
      ctx.fillStyle = enough ? r.col : '#443'; ctx.font = 'bold 13px Orbitron,Courier New';
      ctx.fillText(r.mat, cx, cy - 8);
      // b: 不足なら「あとX個」赤表示
      if (enough) {
        ctx.fillStyle = '#fff'; ctx.font = '12px Orbitron,Courier New';
        ctx.fillText(`×${r.need}  所持:${r.have}`, cx, cy + 12);
      } else {
        ctx.fillStyle = 'rgba(255,80,80,0.95)'; ctx.font = 'bold 12px Orbitron,Courier New';
        ctx.fillText(`×${r.need}  あと${r.need - r.have}個`, cx, cy + 12);
      }
    });
    ctx.fillStyle = '#665'; ctx.font = 'bold 22px Orbitron,Courier New';
    ctx.fillText('+', W / 2, cpY + 116);

    // 矢印
    const arrowPulse = canCompose ? (0.7 + Math.sin(t * 0.12) * 0.3) : 0.3;
    ctx.globalAlpha = arrowPulse;
    ctx.fillStyle = canCompose ? '#ffaa44' : '#333'; ctx.font = '26px Orbitron,Courier New';
    ctx.fillText('↓', W / 2, cpY + 168); ctx.globalAlpha = 1;

    // 出力カード
    const pulse = canCompose ? (0.85 + Math.sin(t * 0.1) * 0.15) : 1;
    ctx.shadowColor = canCompose ? '#ffaa44' : 'transparent'; ctx.shadowBlur = canCompose ? 20 * pulse : 0;
    ctx.fillStyle = canCompose ? 'rgba(70,35,0,0.95)' : 'rgba(15,12,5,0.9)';
    ctx.strokeStyle = canCompose ? '#ffaa44' : '#332'; ctx.lineWidth = canCompose ? 2 : 1;
    ctx.beginPath(); ctx.roundRect(W / 2 - 90, cpY + 186, 180, 62, 10); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;
    ctx.fillStyle = canCompose ? '#ffaa44' : '#443'; ctx.font = 'bold 15px Orbitron,Courier New';
    ctx.fillText('🔷 コンポジットコア', W / 2, cpY + 208);
    ctx.fillStyle = canCompose ? '#cc8833' : '#332'; ctx.font = '12px Orbitron,Courier New';
    ctx.fillText('× 1  獲得', W / 2, cpY + 228);

    // a: 一括合成ボタン ×1 / ×5 / ×MAX
    const btnCounts = [1, 5, 'max'];
    const btnLabels = ['× 1', '× 5', `×MAX(${maxBatch})`];
    const btnW3 = Math.min(100, (cpW - 40) / 3 - 6), btnH3 = 42, btnY3 = cpY + 262, btnGap = 6;
    const totalBtnW = btnW3 * 3 + btnGap * 2, btnStartX = W / 2 - totalBtnW / 2;
    btnCounts.forEach((cnt, bi) => {
      const n = cnt === 'max' ? maxBatch : cnt;
      const ok = maxBatch >= n && n > 0;
      const bx = btnStartX + bi * (btnW3 + btnGap);
      const bp = ok ? (0.8 + Math.sin(t * 0.15 + bi) * 0.2) : 1;
      ctx.shadowColor = ok ? '#ffaa44' : 'transparent'; ctx.shadowBlur = ok ? 18 * bp : 0;
      ctx.fillStyle = ok ? 'rgba(90,45,0,0.95)' : 'rgba(18,18,18,0.85)';
      ctx.strokeStyle = ok ? '#ffaa44' : '#2a2a2a'; ctx.lineWidth = ok ? 2 : 1;
      ctx.beginPath(); ctx.roundRect(bx, btnY3, btnW3, btnH3, 9); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;
      ctx.fillStyle = ok ? '#ffdd88' : '#333'; ctx.font = `bold ${ok ? 13 : 11}px Orbitron,Courier New`;
      ctx.fillText(btnLabels[bi], bx + btnW3 / 2, btnY3 + btnH3 / 2 + 1);
      if (ok) game._shopHits.push({ type: 'compose', count: cnt, x: bx, y: btnY3, w: btnW3, h: btnH3 });
    });

    // 所持数
    ctx.fillStyle = '#556'; ctx.font = '10px Orbitron,Courier New';
    ctx.fillText(`🔷 所持: ${game.materials.composite || 0}  /  Lv9→10 強化に使用`, W / 2, cpY + 322);
    ctx.restore();
  } else if (game.shopTab === 2) {
    // ══════════════════════════════════════
    // FUSION タブ（武器限界突破）
    // ══════════════════════════════════════
    const fPool = WEAPON_GACHA_POOL.filter(w => game.gachaInventory[w.id]);
    game.fusionCursor = Math.max(0, Math.min(game.fusionCursor, fPool.length - 1));
    const fusionCosts = { N: { mat: 1, scrap: 10 }, R: { mat: 1, scrap: 20, core: 5 }, SR: { mat: 2, scrap: 30, core: 10, crystal: 3 }, SSR: { mat: 2, scrap: 50, core: 20, crystal: 8 } };

    ctx.save();
    if (fPool.length === 0) {
      ctx.fillStyle = '#445'; ctx.font = '14px Orbitron,Courier New'; ctx.textAlign = 'center';
      ctx.fillText('武器未所持  —  ガチャで入手しよう', W / 2, 300);
    } else {
      // e: レスポンシブ — 幅に合わせてリスト/詳細を分割
      const listX = 12, listW = Math.round(W * 0.46) - listX, rowH = 52;
      const fpx = listX + listW + 10, fpw = W - fpx - 12, fpy = 112;
      const visRows = Math.min(fPool.length, 8);
      const startR = Math.max(0, Math.min(game.fusionCursor - 3, fPool.length - visRows));
      for (let vi = 0; vi < visRows; vi++) {
        const wi = startR + vi;
        if (wi >= fPool.length) continue;
        const wp = fPool[wi];
        const inv = game.gachaInventory[wp.id];
        const lv = inv ? inv.level || 1 : 1;
        const mat = inv ? inv.mat || 0 : 0;
        const maxed = lv >= 5;
        const isActive = wi === game.fusionCursor;
        const wc = wp.color || RARITY_COLORS[wp.rarity] || '#aaa';
        const ry = fpy + vi * rowH;

        ctx.fillStyle = isActive ? `rgba(${hexToRgb(wc)},0.18)` : 'rgba(8,10,20,0.88)';
        ctx.strokeStyle = isActive ? wc : (maxed ? '#225522' : '#1a1a2e'); ctx.lineWidth = isActive ? 2 : 1;
        if (isActive) { ctx.shadowColor = wc; ctx.shadowBlur = 14; }
        ctx.beginPath(); ctx.roundRect(listX, ry, listW, rowH - 4, 6); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;

        ctx.fillStyle = isActive ? '#fff' : '#bbc'; ctx.font = `bold ${isActive ? 14 : 13}px Orbitron,Courier New`; ctx.textAlign = 'left';
        ctx.fillText(wp.label, listX + 8, ry + 20);
        ctx.fillStyle = wc + 'bb'; ctx.font = '10px Orbitron,Courier New';
        ctx.fillText(`${wp.rarity}  Lv${lv}/5  複製:${mat}`, listX + 8, ry + 36);
        if (maxed) { ctx.fillStyle = '#00ff88'; ctx.font = 'bold 10px Orbitron,Courier New'; ctx.textAlign = 'right'; ctx.fillText('MAX', listX + listW - 6, ry + 20); }
        game._shopHits.push({ type: 'fselect', idx: wi, x: listX, y: ry, w: listW, h: rowH - 4 });
      }
      ctx.textAlign = 'center';

      // 詳細パネル（右）— e: fpx/fpw でレスポンシブ
      const selWp = fPool[game.fusionCursor];
      const selInv = selWp && game.gachaInventory[selWp.id];
      if (selWp && selInv) {
        const wc2 = selWp.color || RARITY_COLORS[selWp.rarity] || '#aaa';
        const lv2 = selInv.level || 1;
        const mat2 = selInv.mat || 0;
        const maxed2 = lv2 >= 5;
        const cost = fusionCosts[selWp.rarity];
        const matOk = !cost || mat2 >= cost.mat;
        const scrapOk = !cost || !cost.scrap || (game.materials.scrap || 0) >= cost.scrap;
        const coreOk = !cost || !cost.core || (game.materials.core || 0) >= cost.core;
        const crystalOk = !cost || !cost.crystal || (game.materials.crystal || 0) >= cost.crystal;
        const canFuse = cost && matOk && scrapOk && coreOk && crystalOk && !maxed2;

        ctx.fillStyle = 'rgba(4,8,18,0.96)'; ctx.strokeStyle = wc2 + '55'; ctx.lineWidth = 1.5;
        ctx.shadowColor = wc2; ctx.shadowBlur = 8;
        ctx.beginPath(); ctx.roundRect(fpx, fpy, fpw, 370, 12); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;

        ctx.fillStyle = wc2; ctx.font = `bold ${Math.min(18, fpw * 0.05 + 10)}px Orbitron,Courier New`;
        ctx.fillText(selWp.label, fpx + fpw / 2, fpy + 30);
        ctx.fillStyle = '#999'; ctx.font = '11px Orbitron,Courier New';
        ctx.fillText(selWp.desc || selWp.rarity, fpx + fpw / 2, fpy + 48);

        ctx.fillStyle = wc2 + 'cc'; ctx.font = 'bold 14px Orbitron,Courier New';
        ctx.fillText(`Lv ${lv2}  →  Lv ${lv2 + 1}`, fpx + fpw / 2, fpy + 82);
        ctx.fillStyle = 'rgba(160,200,255,0.7)'; ctx.font = '12px Orbitron,Courier New';
        ctx.fillText(`+${lv2}% 攻撃力  →  +${lv2 + 1}%`, fpx + fpw / 2, fpy + 100);

        if (!maxed2 && cost) {
          // c: 消費素材あとX個表示
          const costLines = [
            { label: `複製×${cost.mat}`, ok: matOk, have: mat2, need: cost.mat },
            cost.scrap ? { label: `🔩×${cost.scrap}`, ok: scrapOk, have: game.materials.scrap || 0, need: cost.scrap } : null,
            cost.core ? { label: `⚡×${cost.core}`, ok: coreOk, have: game.materials.core || 0, need: cost.core } : null,
            cost.crystal ? { label: `💠×${cost.crystal}`, ok: crystalOk, have: game.materials.crystal || 0, need: cost.crystal } : null,
          ].filter(Boolean);
          ctx.fillStyle = 'rgba(200,220,255,0.6)'; ctx.font = '11px Orbitron,Courier New';
          ctx.fillText('── 消費素材 ──', fpx + fpw / 2, fpy + 128);
          costLines.forEach((cl, ci) => {
            ctx.fillStyle = cl.ok ? 'rgba(200,230,255,0.9)' : 'rgba(255,100,80,0.9)'; ctx.font = '12px Orbitron,Courier New';
            const shortStr = cl.ok ? `所持:${cl.have}` : `あと${cl.need - cl.have}個`;
            ctx.fillText(`${cl.label}  (${shortStr})`, fpx + fpw / 2, fpy + 148 + ci * 22);
          });

          const btnPulse2 = canFuse ? (0.8 + Math.sin(t * 0.14) * 0.2) : 1;
          ctx.shadowColor = canFuse ? wc2 : 'transparent'; ctx.shadowBlur = canFuse ? 18 * btnPulse2 : 0;
          ctx.fillStyle = canFuse ? `rgba(${hexToRgb(wc2)},0.25)` : 'rgba(14,14,22,0.8)';
          ctx.strokeStyle = canFuse ? wc2 : '#223'; ctx.lineWidth = canFuse ? 2 : 1;
          ctx.beginPath(); ctx.roundRect(fpx + 20, fpy + 268, fpw - 40, 46, 10); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;
          ctx.fillStyle = canFuse ? wc2 : '#334'; ctx.font = `bold ${canFuse ? 13 : 11}px Orbitron,Courier New`;
          ctx.fillText(canFuse ? '[ 決定 ]  限界突破' : '素材不足', fpx + fpw / 2, fpy + 297);
          if (canFuse) game._shopHits.push({ type: 'fuse', weaponId: selWp.id, x: fpx + 20, y: fpy + 268, w: fpw - 40, h: 46 });
        } else if (maxed2) {
          ctx.fillStyle = '#44ff88'; ctx.font = 'bold 14px Orbitron,Courier New';
          ctx.fillText('✓  最大レベル (Lv5)', fpx + fpw / 2, fpy + 200);
        }
      }
    }
    ctx.restore();
  }

  // フッター
  ctx.fillStyle = 'rgba(255,140,0,0.12)'; ctx.fillRect(0, H - 28, W, 28);
  ctx.strokeStyle = 'rgba(255,140,0,0.2)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(0, H - 28); ctx.lineTo(W, H - 28); ctx.stroke();
  // 操作ガイド（選択/決定など）は非表示にする
  ctx.textAlign = 'left'; ctx.lineWidth = 1;
}

export function drawNotificationsScreen() {
  const cx = W / 2;
  ctx.fillStyle = '#020408'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(6,10,22,1)'; ctx.fillRect(0, 0, W, 48);
  ctx.strokeStyle = 'rgba(50,80,140,0.5)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(0, 48); ctx.lineTo(W, 48); ctx.stroke();
  ctx.fillStyle = '#cce8ff'; ctx.font = 'bold 20px Orbitron,Courier New'; ctx.textAlign = 'left';
  ctx.shadowColor = '#44aaff'; ctx.shadowBlur = 8;
  ctx.fillText('🔔  通知', 20, 30); ctx.shadowBlur = 0;

  // 3タブ
  const tabs = ['📬 受け取り', '📅 イベント', '📢 お知らせ'];
  const tabW = W / 3;
  if (!Number.isFinite(game.notifTab)) game.notifTab = 0;
  game._notifTabHits = [];
  tabs.forEach((t, i) => {
    const active = game.notifTab === i;
    ctx.fillStyle = active ? 'rgba(50,150,255,0.18)' : 'rgba(20,20,40,0.5)';
    ctx.fillRect(i * tabW, 48, tabW, 36);
    ctx.strokeStyle = active ? '#44aaff' : '#223'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(i * tabW, 84); ctx.lineTo((i + 1) * tabW, 84); ctx.stroke();
    ctx.fillStyle = active ? '#aaddff' : '#556'; ctx.font = '11px Orbitron,Courier New'; ctx.textAlign = 'center';
    ctx.fillText(t, i * tabW + tabW / 2, 70);
    game._notifTabHits.push({ idx: i, x: i * tabW, y: 48, w: tabW, h: 36 });
    // バッジ（受け取りのみ）
    if (i === 0) {
      const cnt = Array.isArray(game.inbox) ? game.inbox.filter(x => !x.claimed).length : 0;
      if (cnt > 0) {
        ctx.fillStyle = '#ff3344'; ctx.beginPath(); ctx.arc(i * tabW + tabW / 2 + 28, 56, 9, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.font = 'bold 9px Orbitron,Courier New';
        ctx.fillText(String(cnt), i * tabW + tabW / 2 + 28, 60);
      }
    }
  });

  const contentY = 92;
  ctx.save();
  if (game.notifTab === 0) {
    // 受け取り
    const items = Array.isArray(game.inbox) ? game.inbox.filter(x => !x.claimed) : [];
    game._inboxHits = [];
    if (items.length === 0) {
      ctx.fillStyle = '#445'; ctx.font = '13px Orbitron,Courier New'; ctx.textAlign = 'center';
      ctx.fillText('受け取れるアイテムはありません', cx, 300);
    } else {
      const allBW = 190, allBH = 32, allBX = cx - allBW / 2, allBY = contentY + 2;
      ctx.fillStyle = 'rgba(0,180,80,0.2)'; ctx.beginPath(); ctx.roundRect(allBX, allBY, allBW, allBH, 6); ctx.fill();
      ctx.strokeStyle = '#00cc44'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.roundRect(allBX, allBY, allBW, allBH, 6); ctx.stroke();
      ctx.fillStyle = '#00ff88'; ctx.shadowColor = '#00ff88'; ctx.shadowBlur = 5;
      ctx.font = 'bold 12px Orbitron,Courier New'; ctx.textAlign = 'center';
      ctx.fillText('全て受け取る', cx, allBY + allBH / 2 + 4); ctx.shadowBlur = 0;
      game._inboxHits.push({ id: 'all', x: allBX, y: allBY, w: allBW, h: allBH });
      const iH = 60;
      items.slice(0, 6).forEach((it, i) => {
        const iy = contentY + 38 + i * iH;
        ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.04)' : 'transparent';
        ctx.fillRect(0, iy, W, iH);
        ctx.fillStyle = '#cce8ff'; ctx.font = 'bold 12px Orbitron,Courier New'; ctx.textAlign = 'left';
        ctx.fillText(it.label || '報酬', 16, iy + 16);
        const parts = []; if (it.coins) parts.push(`● ${it.coins}`); if (it.gems) parts.push(`💎 ${it.gems}`); if (it.fuel) parts.push(`⛽ ${it.fuel}`);
        ctx.fillStyle = '#ffd700'; ctx.font = '12px Orbitron,Courier New';
        ctx.fillText(parts.join('  '), 16, iy + 34);
        const daysLeft = Math.ceil((it.expiresAt - Date.now()) / 86400000);
        ctx.fillStyle = daysLeft <= 3 ? '#ff6644' : '#445'; ctx.font = '9px Orbitron,Courier New'; ctx.textAlign = 'right';
        ctx.fillText(`残り${daysLeft}日`, W - 110, iy + 16);
        const bw = 86, bh = 26, bx = W - bw - 10, by = iy + 16;
        ctx.fillStyle = 'rgba(0,180,80,0.2)'; ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 5); ctx.fill();
        ctx.strokeStyle = '#00cc44'; ctx.lineWidth = 1; ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 5); ctx.stroke();
        ctx.fillStyle = '#00ff88'; ctx.font = '11px Orbitron,Courier New'; ctx.textAlign = 'center';
        ctx.fillText('受け取る', bx + bw / 2, by + bh / 2 + 4);
        game._inboxHits.push({ id: it.id, x: bx, y: by, w: bw, h: bh });
      });
    }
  } else if (game.notifTab === 1) {
    // イベント
    const dow = new Date().getDay(), isWeekend = dow === 0 || dow === 6;
    const events = [
      { label: '週末EXP＆コインボーナス', active: isWeekend, desc: '土日はEXP・コイン獲得量が1.5倍！', color: '#ffcc44' },
      { label: 'デイリーミッション', active: true, desc: '毎日ミッションをクリアしてコインを獲得！', color: '#44ccff' },
      { label: 'ログインボーナス', active: true, desc: '連続ログインでジェムを集めよう！', color: '#ff88aa' },
    ];
    events.forEach((ev, i) => {
      const ey = contentY + i * 96;
      ctx.fillStyle = ev.active ? 'rgba(255,200,50,0.08)' : 'rgba(60,60,80,0.3)';
      ctx.beginPath(); ctx.roundRect(16, ey, W - 32, 82, 8); ctx.fill();
      ctx.strokeStyle = ev.active ? ev.color : '#334'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.roundRect(16, ey, W - 32, 82, 8); ctx.stroke();
      ctx.fillStyle = ev.active ? ev.color : '#446'; ctx.font = 'bold 10px Orbitron,Courier New'; ctx.textAlign = 'right';
      ctx.fillText(ev.active ? '開催中' : '準備中', W - 28, ey + 16);
      ctx.fillStyle = ev.active ? '#eee' : '#667'; ctx.font = 'bold 13px Orbitron,Courier New'; ctx.textAlign = 'left';
      ctx.fillText(ev.label, 28, ey + 22);
      ctx.fillStyle = '#889'; ctx.font = '11px Orbitron,Courier New';
      ctx.fillText(ev.desc, 28, ey + 44);
    });
  } else {
    // お知らせ
    NOTICES.forEach((n, i) => {
      const ny = contentY + i * 110;
      ctx.fillStyle = 'rgba(255,255,255,0.04)'; ctx.beginPath(); ctx.roundRect(16, ny, W - 32, 96, 8); ctx.fill();
      ctx.strokeStyle = '#234'; ctx.lineWidth = 1; ctx.beginPath(); ctx.roundRect(16, ny, W - 32, 96, 8); ctx.stroke();
      ctx.fillStyle = '#445'; ctx.font = '10px Orbitron,Courier New'; ctx.textAlign = 'right';
      ctx.fillText(n.date, W - 28, ny + 16);
      ctx.fillStyle = '#ccddff'; ctx.font = 'bold 13px Orbitron,Courier New'; ctx.textAlign = 'left';
      ctx.fillText(n.title, 28, ny + 24);
      ctx.fillStyle = '#778'; ctx.font = '11px Orbitron,Courier New';
      n.body.split('\n').forEach((line, li) => ctx.fillText(line, 28, ny + 44 + li * 16));
    });
  }
  ctx.restore();
  ctx.textAlign = 'left';
}

// ===== 設定画面 =====
export function drawSettingsScreen() {
  const cx = W / 2;
  ctx.fillStyle = '#020408'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(6,10,22,1)'; ctx.fillRect(0, 0, W, 48);
  ctx.strokeStyle = 'rgba(50,80,140,0.5)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(0, 48); ctx.lineTo(W, 48); ctx.stroke();
  ctx.fillStyle = '#cce8ff'; ctx.font = 'bold 20px Orbitron,Courier New'; ctx.textAlign = 'left';
  ctx.shadowColor = '#44aaff'; ctx.shadowBlur = 8;
  ctx.fillText('設定', 20, 30); ctx.shadowBlur = 0;

  const ROW = 60, startY = 70, LX = 40, VX = W - 40;
  const rows = [
    { key: 'bgm', label: 'BGM', type: 'toggle' },
    { key: 'se', label: 'SE 音量', type: 'volume' },
    { key: 'vibration', label: 'バイブレーション', type: 'toggle' },
    { key: 'quality', label: '画質', type: 'select', opts: ['low', 'mid', 'high'], labels: ['低', '中', '高'] },
    { key: 'language', label: '言語', type: 'select', opts: ['ja', 'en'], labels: ['日本語', 'English'] },
  ];
  game._settingsHits = [];
  rows.forEach((row, i) => {
    const ry = startY + i * ROW;
    ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.03)' : 'transparent';
    ctx.fillRect(0, ry - 8, W, ROW);
    ctx.fillStyle = '#aabbcc'; ctx.font = '14px Orbitron,Courier New'; ctx.textAlign = 'left';
    ctx.fillText(row.label, LX, ry + 14);
    if (row.type === 'toggle') {
      const val = game.settings?.[row.key] !== false;
      const tw = 76, th = 30, tx = VX - tw, ty = ry - 2;
      ctx.fillStyle = val ? 'rgba(0,180,80,0.3)' : 'rgba(60,60,60,0.3)';
      ctx.beginPath(); ctx.roundRect(tx, ty, tw, th, 15); ctx.fill();
      ctx.strokeStyle = val ? '#00cc44' : '#444'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.roundRect(tx, ty, tw, th, 15); ctx.stroke();
      const kx = val ? tx + tw - 14 - 4 : tx + 4;
      ctx.fillStyle = val ? '#00ff66' : '#666'; ctx.shadowColor = val ? '#00ff66' : 'transparent'; ctx.shadowBlur = val ? 6 : 0;
      ctx.beginPath(); ctx.arc(kx + 7, ty + th / 2, 9, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
      ctx.fillStyle = val ? '#00ff88' : '#555'; ctx.font = '9px Orbitron,Courier New'; ctx.textAlign = 'center';
      ctx.fillText(val ? 'ON' : 'OFF', tx + tw / 2, ty + th / 2 + 3);
      game._settingsHits.push({ key: row.key, type: 'toggle', x: tx - 8, y: ty - 4, w: tw + 16, h: th + 8 });
    } else if (row.type === 'volume') {
      const sv = game.masterVolume ?? 0.7;
      const sw = 260, sh = 22, sx = VX - sw, sy = ry - 2;
      ctx.fillStyle = '#111'; ctx.beginPath(); ctx.roundRect(sx, sy, sw, sh, 4); ctx.fill();
      ctx.fillStyle = '#006633'; ctx.beginPath(); ctx.roundRect(sx, sy, sw * sv, sh, 4); ctx.fill();
      ctx.fillStyle = '#00ff88'; ctx.shadowColor = '#00ff88'; ctx.shadowBlur = 5;
      ctx.beginPath(); ctx.roundRect(sx + sw * sv - 9, sy + 2, 18, sh - 4, 3); ctx.fill(); ctx.shadowBlur = 0;
      ctx.fillStyle = '#aaa'; ctx.font = '10px Orbitron,Courier New'; ctx.textAlign = 'right';
      ctx.fillText(`${Math.round(sv * 100)}%`, VX, sy - 3);
      game._settingsHits.push({ key: 'se_slider', type: 'slider', x: sx, y: sy - 8, w: sw, h: sh + 16 });
    } else if (row.type === 'select') {
      const n = row.opts.length, bw = 70, bh = 28, gap = 6;
      const totalW = n * (bw + gap) - gap, bx = VX - totalW;
      row.opts.forEach((opt, j) => {
        const ox = bx + j * (bw + gap), oy = ry - 2;
        const active = game.settings?.[row.key] === opt;
        ctx.fillStyle = active ? 'rgba(50,150,255,0.3)' : 'rgba(30,30,50,0.5)';
        ctx.beginPath(); ctx.roundRect(ox, oy, bw, bh, 5); ctx.fill();
        ctx.strokeStyle = active ? '#44aaff' : '#334'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.roundRect(ox, oy, bw, bh, 5); ctx.stroke();
        ctx.fillStyle = active ? '#aaddff' : '#556'; ctx.shadowColor = active ? '#44aaff' : 'transparent'; ctx.shadowBlur = active ? 4 : 0;
        ctx.font = '11px Orbitron,Courier New'; ctx.textAlign = 'center';
        ctx.fillText(row.labels[j], ox + bw / 2, oy + bh / 2 + 4); ctx.shadowBlur = 0;
        game._settingsHits.push({ key: row.key, type: 'select', val: opt, x: ox, y: oy, w: bw, h: bh });
      });
    }
  });
  const nameY = startY + rows.length * ROW + 8;
  ctx.fillStyle = rows.length % 2 === 0 ? 'rgba(255,255,255,0.03)' : 'transparent';
  ctx.fillRect(0, nameY - 8, W, ROW);
  ctx.fillStyle = '#aabbcc'; ctx.font = '14px Orbitron,Courier New'; ctx.textAlign = 'left';
  ctx.fillText('プレイヤー名（ローカル）', LX, nameY + 14);
  const ntx = VX - 200, nty = nameY - 2, ntw = 200, nth = 30;
  ctx.fillStyle = 'rgba(20,24,40,0.95)'; ctx.strokeStyle = '#556'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.roundRect(ntx, nty, ntw, nth, 8); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#dff'; ctx.font = '12px Orbitron,Courier New'; ctx.textAlign = 'center';
  ctx.fillText((game.displayName || 'PLAYER').slice(0, 12), ntx + ntw / 2, nty + nth / 2 + 4);
  game._settingsHits.push({ key: 'display_name', type: 'name_btn', x: ntx - 4, y: nty - 4, w: ntw + 8, h: nth + 8 });
  ctx.textAlign = 'left';
}

// ===== 受け取りボックス画面 =====
export function drawInboxScreen() {
  const cx = W / 2;
  ctx.fillStyle = '#020408'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(6,10,22,1)'; ctx.fillRect(0, 0, W, 48);
  ctx.strokeStyle = 'rgba(50,80,140,0.5)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(0, 48); ctx.lineTo(W, 48); ctx.stroke();
  ctx.fillStyle = '#cce8ff'; ctx.font = 'bold 20px Orbitron,Courier New'; ctx.textAlign = 'left';
  ctx.shadowColor = '#44aaff'; ctx.shadowBlur = 8;
  ctx.fillText('受け取りボックス', 20, 30); ctx.shadowBlur = 0;

  const items = Array.isArray(game.inbox) ? game.inbox.filter(x => !x.claimed) : [];
  game._inboxHits = [];
  if (items.length === 0) {
    ctx.fillStyle = '#445'; ctx.font = '14px Orbitron,Courier New'; ctx.textAlign = 'center';
    ctx.fillText('受け取れるアイテムはありません', cx, 300);
    ctx.textAlign = 'left'; return;
  }
  const allBW = 200, allBH = 34, allBX = cx - allBW / 2, allBY = 56;
  ctx.fillStyle = 'rgba(0,180,80,0.2)'; ctx.beginPath(); ctx.roundRect(allBX, allBY, allBW, allBH, 6); ctx.fill();
  ctx.strokeStyle = '#00cc44'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.roundRect(allBX, allBY, allBW, allBH, 6); ctx.stroke();
  ctx.fillStyle = '#00ff88'; ctx.shadowColor = '#00ff88'; ctx.shadowBlur = 6;
  ctx.font = 'bold 13px Orbitron,Courier New'; ctx.textAlign = 'center';
  ctx.fillText('全て受け取る', cx, allBY + allBH / 2 + 5); ctx.shadowBlur = 0;
  game._inboxHits.push({ id: 'all', x: allBX, y: allBY, w: allBW, h: allBH });

  const iH = 70, startY = 100;
  items.slice(0, 8).forEach((it, i) => {
    const iy = startY + i * iH;
    ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.04)' : 'transparent';
    ctx.fillRect(0, iy, W, iH);
    ctx.fillStyle = '#cce8ff'; ctx.font = 'bold 13px Orbitron,Courier New'; ctx.textAlign = 'left';
    ctx.fillText(it.label || '報酬', 16, iy + 20);
    const parts = [];
    if (it.coins) parts.push(`● ${it.coins}`);
    if (it.gems) parts.push(`💎 ${it.gems}`);
    if (it.dust) parts.push(`✦ ${it.dust}`);
    if (it.fuel) parts.push(`⛽ ${it.fuel}`);
    ctx.fillStyle = '#ffd700'; ctx.font = '12px Orbitron,Courier New';
    ctx.fillText(parts.join('  '), 16, iy + 40);
    const daysLeft = Math.ceil((it.expiresAt - Date.now()) / 86400000);
    ctx.fillStyle = daysLeft <= 3 ? '#ff6644' : '#556'; ctx.font = '10px Orbitron,Courier New'; ctx.textAlign = 'right';
    ctx.fillText(`残り${daysLeft}日`, W - 110, iy + 20);
    const bw = 90, bh = 30, bx = W - bw - 10, by = iy + 20;
    ctx.fillStyle = 'rgba(0,180,80,0.2)'; ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 5); ctx.fill();
    ctx.strokeStyle = '#00cc44'; ctx.lineWidth = 1; ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 5); ctx.stroke();
    ctx.fillStyle = '#00ff88'; ctx.font = 'bold 11px Orbitron,Courier New'; ctx.textAlign = 'center';
    ctx.fillText('受け取る', bx + bw / 2, by + bh / 2 + 4);
    game._inboxHits.push({ id: it.id, x: bx, y: by, w: bw, h: bh });
  });
  if (items.length > 8) {
    ctx.fillStyle = '#445'; ctx.font = '10px Orbitron,Courier New'; ctx.textAlign = 'center';
    ctx.fillText(`他 ${items.length - 8} 件`, cx, startY + 8 * iH + 16);
  }
  ctx.textAlign = 'left';
}

// ===== イベント / お知らせ画面 =====
export function drawEventsScreen() {
  const cx = W / 2;
  ctx.fillStyle = '#020408'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(6,10,22,1)'; ctx.fillRect(0, 0, W, 48);
  ctx.strokeStyle = 'rgba(50,80,140,0.5)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(0, 48); ctx.lineTo(W, 48); ctx.stroke();
  ctx.fillStyle = '#cce8ff'; ctx.font = 'bold 20px Orbitron,Courier New'; ctx.textAlign = 'left';
  ctx.shadowColor = '#44aaff'; ctx.shadowBlur = 8;
  ctx.fillText('イベント / お知らせ', 20, 30); ctx.shadowBlur = 0;
  const tabs = ['イベント', 'お知らせ'];
  const tabW = W / 2;
  if (!Number.isFinite(game.eventsTab)) game.eventsTab = 0;
  game._eventsTabHits = [];
  tabs.forEach((t, i) => {
    const active = game.eventsTab === i;
    ctx.fillStyle = active ? 'rgba(50,150,255,0.18)' : 'rgba(20,20,40,0.5)';
    ctx.fillRect(i * tabW, 48, tabW, 36);
    ctx.strokeStyle = active ? '#44aaff' : '#223'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(i * tabW, 84); ctx.lineTo((i + 1) * tabW, 84); ctx.stroke();
    ctx.fillStyle = active ? '#aaddff' : '#556'; ctx.font = '13px Orbitron,Courier New'; ctx.textAlign = 'center';
    ctx.fillText(t, i * tabW + tabW / 2, 70);
    game._eventsTabHits.push({ idx: i, x: i * tabW, y: 48, w: tabW, h: 36 });
  });
  const contentY = 92;
  if (game.eventsTab === 0) {
    const dow = new Date().getDay(), isWeekend = dow === 0 || dow === 6;
    const events = [
      { label: '週末EXP＆コインボーナス', active: isWeekend, desc: '土日はEXP・コイン獲得量が1.5倍！', color: '#ffcc44' },
      { label: 'デイリーミッション', active: true, desc: '毎日ミッションをクリアしてコインを獲得！', color: '#44ccff' },
      { label: 'ログインボーナス', active: true, desc: '連続ログインでジェムを集めよう！', color: '#ff88aa' },
    ];
    events.forEach((ev, i) => {
      const ey = contentY + i * 90;
      ctx.fillStyle = ev.active ? 'rgba(255,200,50,0.08)' : 'rgba(60,60,80,0.3)';
      ctx.beginPath(); ctx.roundRect(16, ey, W - 32, 76, 8); ctx.fill();
      ctx.strokeStyle = ev.active ? ev.color : '#334'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.roundRect(16, ey, W - 32, 76, 8); ctx.stroke();
      ctx.fillStyle = ev.active ? ev.color : '#446'; ctx.font = 'bold 10px Orbitron,Courier New'; ctx.textAlign = 'right';
      ctx.fillText(ev.active ? '開催中' : '準備中', W - 28, ey + 16);
      ctx.fillStyle = ev.active ? '#eee' : '#667'; ctx.font = 'bold 14px Orbitron,Courier New'; ctx.textAlign = 'left';
      ctx.fillText(ev.label, 28, ey + 22);
      ctx.fillStyle = '#889'; ctx.font = '11px Orbitron,Courier New';
      ctx.fillText(ev.desc, 28, ey + 44);
    });
  } else {
    NOTICES.forEach((n, i) => {
      const ny = contentY + i * 110;
      ctx.fillStyle = 'rgba(255,255,255,0.04)'; ctx.beginPath(); ctx.roundRect(16, ny, W - 32, 96, 8); ctx.fill();
      ctx.strokeStyle = '#234'; ctx.lineWidth = 1; ctx.beginPath(); ctx.roundRect(16, ny, W - 32, 96, 8); ctx.stroke();
      ctx.fillStyle = '#556'; ctx.font = '10px Orbitron,Courier New'; ctx.textAlign = 'right';
      ctx.fillText(n.date, W - 28, ny + 16);
      ctx.fillStyle = '#ccddff'; ctx.font = 'bold 13px Orbitron,Courier New'; ctx.textAlign = 'left';
      ctx.fillText(n.title, 28, ny + 24);
      ctx.fillStyle = '#778'; ctx.font = '11px Orbitron,Courier New';
      n.body.split('\n').forEach((line, li) => ctx.fillText(line, 28, ny + 44 + li * 16));
    });
  }
  ctx.textAlign = 'left';
}

// ===== 課金画面 =====
export function drawIAPScreen() {
  const cx = W / 2;
  ctx.fillStyle = '#020408'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(6,10,22,1)'; ctx.fillRect(0, 0, W, 48);
  ctx.strokeStyle = 'rgba(50,80,140,0.5)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(0, 48); ctx.lineTo(W, 48); ctx.stroke();
  ctx.fillStyle = '#cce8ff'; ctx.font = 'bold 20px Orbitron,Courier New'; ctx.textAlign = 'left';
  ctx.shadowColor = '#ffdd44'; ctx.shadowBlur = 8;
  ctx.fillText('アイテム購入', 20, 30); ctx.shadowBlur = 0;
  if (!game.ageVerified) {
    ctx.fillStyle = 'rgba(0,0,0,0.88)'; ctx.fillRect(0, 48, W, H - 48);
    const pw = 440, ph = 250, px = cx - pw / 2, py = H / 2 - ph / 2;
    ctx.fillStyle = 'rgba(10,12,24,0.97)'; ctx.beginPath(); ctx.roundRect(px, py, pw, ph, 14); ctx.fill();
    ctx.strokeStyle = '#ffcc44'; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(px, py, pw, ph, 14); ctx.stroke();
    ctx.fillStyle = '#ffcc44'; ctx.font = 'bold 18px Orbitron,Courier New'; ctx.textAlign = 'center';
    ctx.shadowColor = '#ffcc44'; ctx.shadowBlur = 10;
    ctx.fillText('年齢確認', cx, py + 44); ctx.shadowBlur = 0;
    ctx.fillStyle = '#aab'; ctx.font = '12px Orbitron,Courier New';
    ctx.fillText('このコンテンツは18歳以上を対象としています。', cx, py + 80);
    ctx.fillText('あなたは18歳以上ですか？', cx, py + 104);
    const bw = 160, bh = 40;
    ctx.fillStyle = 'rgba(0,180,80,0.25)'; ctx.beginPath(); ctx.roundRect(cx - bw - 12, py + 140, bw, bh, 8); ctx.fill();
    ctx.strokeStyle = '#00cc44'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.roundRect(cx - bw - 12, py + 140, bw, bh, 8); ctx.stroke();
    ctx.fillStyle = '#00ff88'; ctx.shadowColor = '#00ff88'; ctx.shadowBlur = 6;
    ctx.font = 'bold 13px Orbitron,Courier New';
    ctx.fillText('はい（18歳以上）', cx - bw / 2 - 12, py + 140 + bh / 2 + 5); ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(180,50,50,0.2)'; ctx.beginPath(); ctx.roundRect(cx + 12, py + 140, bw, bh, 8); ctx.fill();
    ctx.strokeStyle = '#cc3333'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.roundRect(cx + 12, py + 140, bw, bh, 8); ctx.stroke();
    ctx.fillStyle = '#ff7777'; ctx.font = 'bold 13px Orbitron,Courier New';
    ctx.fillText('いいえ', cx + bw / 2 + 12, py + 140 + bh / 2 + 5);
    game._iapAgeHits = [
      { type: 'yes', x: cx - bw - 12, y: py + 140, w: bw, h: bh },
      { type: 'no', x: cx + 12, y: py + 140, w: bw, h: bh },
    ];
    ctx.textAlign = 'left'; return;
  }
  game._iapAgeHits = null;
  const GX = 16, GW = (W - GX * 2 - 12) / 2, GH = 90, GAP = 12;
  game._iapHits = [];
  IAP_PACKAGES.forEach((pkg, i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const px = GX + col * (GW + GAP), py = 58 + row * (GH + GAP);
    ctx.fillStyle = 'rgba(10,16,32,0.95)'; ctx.beginPath(); ctx.roundRect(px, py, GW, GH, 8); ctx.fill();
    ctx.strokeStyle = 'rgba(80,120,200,0.4)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.roundRect(px, py, GW, GH, 8); ctx.stroke();
    if (pkg.tag) {
      ctx.fillStyle = '#ff8800'; ctx.beginPath(); ctx.roundRect(px + GW - 52, py, 50, 18, 4); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = 'bold 9px Orbitron,Courier New'; ctx.textAlign = 'center';
      ctx.fillText(pkg.tag, px + GW - 27, py + 12);
    }
    ctx.font = '20px Courier New'; ctx.textAlign = 'left';
    ctx.fillText(pkg.icon, px + 10, py + 28);
    ctx.fillStyle = '#cce8ff'; ctx.font = 'bold 12px Orbitron,Courier New';
    ctx.fillText(pkg.label, px + 44, py + 22);
    if (pkg.bonus) { ctx.fillStyle = '#ffcc44'; ctx.font = '10px Orbitron,Courier New'; ctx.fillText(pkg.bonus, px + 44, py + 38); }
    if (pkg.sub) { ctx.fillStyle = '#88aaff'; ctx.font = '10px Orbitron,Courier New'; ctx.fillText('サブスクリプション', px + 10, py + 54); }
    const pbw = GW - 16, pbh = 26, pbx = px + 8, pby = py + GH - 34;
    ctx.fillStyle = 'rgba(255,200,0,0.2)'; ctx.beginPath(); ctx.roundRect(pbx, pby, pbw, pbh, 5); ctx.fill();
    ctx.strokeStyle = '#ffcc44'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.roundRect(pbx, pby, pbw, pbh, 5); ctx.stroke();
    ctx.fillStyle = '#ffdd44'; ctx.shadowColor = '#ffdd44'; ctx.shadowBlur = 5;
    ctx.font = 'bold 13px Orbitron,Courier New'; ctx.textAlign = 'center';
    ctx.fillText(`¥${pkg.price.toLocaleString()}${pkg.sub ? '/月' : ''}`, pbx + pbw / 2, pby + pbh / 2 + 5); ctx.shadowBlur = 0;
    game._iapHits.push({ id: pkg.id, x: pbx, y: pby, w: pbw, h: pbh, pkg });
  });
  const noteY = 58 + Math.ceil(IAP_PACKAGES.length / 2) * (GH + GAP) + 4;
  if (noteY < H - 30) {
    ctx.fillStyle = '#334'; ctx.font = '9px Orbitron,Courier New'; ctx.textAlign = 'center';
    ctx.fillText('※ 現在テスト表示中です。実際の購入機能は未実装です。', cx, noteY);
    ctx.fillText('※ 18歳未満の方はご利用になれません。', cx, noteY + 14);
  }
  ctx.textAlign = 'left';
}

function getGachaResultCardLayout() {
  const cx = W / 2, cy = H / 2;
  const cw = 340, ch = 372, cxl = cx - cw / 2, cyl = cy - ch / 2 - 12;
  return { cx, cy, cw, ch, cxl, cyl };
}

function getGachaRatesModalRect() {
  const mw = Math.min(W - 32, 720), mh = Math.min(H - 48, 580);
  return { mx: (W - mw) / 2, my: (H - mh) / 2, mw, mh };
}

function getGachaRatesModalLinkRect() {
  const R = getGachaRatesModalRect();
  return { x: R.mx + 14, y: R.my + R.mh - 40, w: R.mw - 28, h: 28 };
}

function drawGachaRatesContent(boxX, boxY, boxW, boxH) {
  const cx = boxX + boxW / 2;
  ctx.fillStyle = '#bbaaff'; ctx.font = `bold ${boxW < 420 ? 11 : 13}px Orbitron,Courier New`; ctx.textAlign = 'center';
  ctx.fillText('排出率 / アイテム一覧', cx, boxY + 14);

  const ratesRowCoin = [{ r: 'LR', v: '0%' }, { r: 'SSR', v: '5%' }, { r: 'SR', v: '15%' }, { r: 'R', v: '30%' }, { r: 'N', v: '50%' }];
  const ratesRowPrem = [{ r: 'LR', v: '1.5%' }, { r: 'SSR', v: '18.5%' }, { r: 'SR', v: '55%' }, { r: 'R', v: '25%' }, { r: 'N', v: '0%' }];
  const isPremRate = game.gachaTab === 1;
  const ratesRow = isPremRate ? ratesRowPrem : ratesRowCoin;
  const gap = boxW < 420 ? 2 : 4, nx = 5, bh = boxH < 380 ? 20 : 24;
  const innerW = boxW - 16;
  const boxRW = (innerW - (nx - 1) * gap) / nx;
  const rx0 = boxX + 8;
  const ry = boxY + 22;
  ratesRow.forEach((rt, i) => {
    const rx = rx0 + i * (boxRW + gap);
    const isLR = rt.r === 'LR';
    const col = isLR ? getLRColor(game.frameCount * 0.06) : RARITY_COLORS[rt.r];
    ctx.fillStyle = 'rgba(15,15,25,0.85)'; ctx.strokeStyle = col; ctx.lineWidth = isLR ? 2 : 1;
    ctx.beginPath(); ctx.roundRect(rx, ry, boxRW, bh, 5); ctx.fill(); ctx.stroke();
    ctx.fillStyle = col; ctx.font = `bold ${boxW < 420 ? 9 : 10}px Orbitron,Courier New`; ctx.textAlign = 'center';
    ctx.fillText(`${rt.r} ${rt.v}`, rx + boxRW / 2, ry + bh * 0.62);
  });
  const fy = ry + bh + 8;
  ctx.fillStyle = '#c1cbe0'; ctx.font = `bold ${boxW < 420 ? 9 : 11}px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif`; ctx.textAlign = 'center';
  ctx.fillText(isPremRate ? 'プレミアム排出率（Nなし）' : '通常(コイン)排出率（LRなし）', cx, fy);
  ctx.fillStyle = '#9da9c6'; ctx.font = `${boxW < 420 ? 8 : 10}px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif`;
  ctx.fillText('10連は通常SR以上1枚確定', cx, fy + 13);

  const order = ['LR', 'SSR', 'SR', 'R', 'N'];
  const sorted = [...ALL_GACHA_POOL].sort((a, b) => order.indexOf(a.rarity) - order.indexOf(b.rarity));
  const listStartY = fy + 26;
  const listEndY = boxY + boxH - 6;
  const cols = 2, colGap = 8;
  const colW = (boxW - 20 - (cols - 1) * colGap) / cols;
  const rows = Math.ceil(sorted.length / cols);
  const ih = 46;
  const visibleRows = Math.max(1, Math.floor((listEndY - listStartY) / ih));
  const maxScroll = Math.max(0, rows - visibleRows);
  game.gachaRatesScroll = Math.max(0, Math.min(game.gachaRatesScroll, maxScroll));
  const startX = boxX + 10;
  sorted.forEach((item, i) => {
    const col = i % cols, row = Math.floor(i / cols);
    const rr = row - game.gachaRatesScroll;
    if (rr < 0 || rr >= visibleRows) return;
    const x = startX + col * (colW + colGap);
    const y = listStartY + rr * ih;
    const owned = !!game.gachaInventory[item.id];
    const isLR = item.rarity === 'LR';
    const rc = isLR ? getLRColor(game.frameCount * 0.05 + i * 0.1) : RARITY_COLORS[item.rarity];
    ctx.fillStyle = owned ? 'rgba(18,18,36,0.92)' : 'rgba(8,8,12,0.75)';
    ctx.strokeStyle = owned ? rc : '#1e1e1e'; ctx.lineWidth = owned ? 1.5 : 1;
    ctx.beginPath(); ctx.roundRect(x, y, colW, ih - 4, 4); ctx.fill(); ctx.stroke();
    ctx.shadowColor = owned ? rc : 'transparent'; ctx.shadowBlur = owned ? 3 : 0;
    ctx.fillStyle = rc; ctx.font = 'bold 10px Orbitron,Courier New'; ctx.textAlign = 'left';
    const titleStr = `[${item.rarity}] ${item.label}`;
    const titleMaxW = colW - (owned ? 48 : 12);
    ctx.fillText(truncateLine(ctx, titleStr, titleMaxW), x + 6, y + 14); ctx.shadowBlur = 0;
    if (owned) {
      const ent = game.gachaInventory[item.id];
      ctx.fillStyle = '#8ef5c4'; ctx.font = 'bold 9px Orbitron,Courier New'; ctx.textAlign = 'right';
      ctx.fillText(`Lv.${ent.level}`, x + colW - 6, y + 14);
      ctx.textAlign = 'left';
    }
    ctx.fillStyle = '#a8b6d0'; ctx.font = '9px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif';
    wrapFillJp(ctx, (item.desc || '').replace(/\r/g, ''), x + 6, y + 26, colW - 12, 11, boxW < 480 ? 2 : 3);
    ctx.textAlign = 'left';
  });
  if (maxScroll > 0) {
    ctx.fillStyle = '#556'; ctx.font = '9px Orbitron,Courier New'; ctx.textAlign = 'center';
    ctx.fillText(`スクロール ${game.gachaRatesScroll + 1}/${maxScroll + 1}（ホイール / ↑↓）`, cx, listEndY + 10);
  }
}

export function drawGachaRatesModalIfOpen() {
  if (game.gachaRatesModal) drawGachaRatesModalOverlay();
}

function drawGachaRatesModalOverlay() {
  const R = getGachaRatesModalRect();
  ctx.fillStyle = 'rgba(2,4,14,0.72)'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(14,12,26,0.98)'; ctx.strokeStyle = 'rgba(140,120,220,0.65)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.roundRect(R.mx, R.my, R.mw, R.mh, 14); ctx.fill(); ctx.stroke();
  const hx = R.mx + R.mw - 40, hy = R.my + 8;
  ctx.fillStyle = 'rgba(60,50,90,0.95)'; ctx.strokeStyle = '#8877aa'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.roundRect(hx, hy, 32, 30, 8); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#dde0ff'; ctx.font = 'bold 18px Orbitron,Courier New'; ctx.textAlign = 'center';
  ctx.fillText('×', hx + 16, hy + 22);
  ctx.textAlign = 'left';
  drawGachaRatesContent(R.mx + 10, R.my + 42, R.mw - 20, R.mh - 92);
  const Lk = getGachaRatesModalLinkRect();
  ctx.fillStyle = 'rgba(40,36,70,0.9)'; ctx.strokeStyle = 'rgba(100,90,160,0.5)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.roundRect(Lk.x, Lk.y, Lk.w, Lk.h, 6); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#99aacc'; ctx.font = '10px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('全画面で一覧を開く', Lk.x + Lk.w / 2, Lk.y + Lk.h / 2 + 4);
  ctx.textAlign = 'left';
}

export function drawGachaResult() {
  const item = game.gachaResults[game.gachaCurrentIdx];
  if (!item) return;
  const isLR = item.rarity === 'LR';
  const rc = isLR ? getLRColor(game.frameCount * 0.06) : RARITY_COLORS[item.rarity];
  const isSSR = item.rarity === 'SSR', isSR = item.rarity === 'SR';
  const stall = gateStall(item.rarity), total = gateTotal(item.rarity);
  const f = game.gachaAnimFrame;
  const cx = W / 2, cy = H / 2;

  if ((isSSR || isLR) && f === GATE_OPEN + 1) playSound('ssr_stall');
  if ((isSSR || isLR) && f === GATE_OPEN + stall + GATE_WARPOUT + 1) playSound('ssr_reveal');

  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(24,22,36,0.92)'; ctx.strokeStyle = '#3a3a50'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.roundRect(10, 8, 88, 32, 6); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#889'; ctx.font = 'bold 11px Orbitron,Courier New'; ctx.textAlign = 'center';
  ctx.fillText('◀ 戻る', 54, 28);

  // LR: 背景レインボーオーラ（SSR比で控えめ）
  if (isLR) {
    for (let i = 0; i < 4; i++) {
      const a = i / 4, col = getLRColor(i + game.frameCount * 0.04);
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, 320);
      g.addColorStop(a, 'transparent'); g.addColorStop(Math.min(1, a + 0.12), appendColorAlpha(col, '12')); g.addColorStop(Math.min(1, a + 0.28), 'transparent');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    }
  }

  // ===== フェーズ1: ゲートが開く =====
  if (f <= GATE_OPEN + stall + GATE_WARPOUT) {
    const openProg = Math.min(1, f / GATE_OPEN);
    const maxR = isLR ? 205 : isSSR ? 200 : isSR ? 170 : 130;
    const gateR = maxR * openProg;

    const glowSize = isLR ? 300 : isSSR ? 360 : isSR ? 290 : 230;
    const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowSize);
    glow.addColorStop(0, RARITY_COLORS[item.rarity] + (isLR ? '55' : isSSR ? '44' : isSR ? '30' : '22')); glow.addColorStop(1, 'transparent');
    ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H);

    if (gateR > 10) {
      ctx.save(); ctx.translate(cx, cy);
      const rot = f * 0.05;

      ctx.strokeStyle = rc; ctx.lineWidth = isLR ? 4 : isSSR ? 4 : 3;
      ctx.shadowColor = rc; ctx.shadowBlur = isLR ? 28 : isSSR ? 32 : 18;
      ctx.globalAlpha = openProg;
      ctx.beginPath(); ctx.arc(0, 0, gateR, 0, Math.PI * 2); ctx.stroke();

      ctx.rotate(-rot * 1.6);
      ctx.strokeStyle = isSSR ? '#fff' : rc; ctx.lineWidth = isSSR ? 2 : 1.5; ctx.shadowBlur = isSSR ? 16 : 8;
      ctx.setLineDash([12, 8]);
      ctx.beginPath(); ctx.arc(0, 0, gateR * 0.72, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);

      ctx.rotate(rot * 3.2);
      ctx.strokeStyle = rc; ctx.lineWidth = isSSR ? 3 : 2; ctx.shadowBlur = isSSR ? 22 : 12;
      ctx.beginPath(); ctx.arc(0, 0, gateR * 0.44, 0, Math.PI * 2); ctx.stroke();
      ctx.shadowBlur = 0;

      const spCount = isSSR ? 16 : isSR ? 12 : 8;
      for (let i = 0; i < spCount; i++) {
        const a = (Math.PI * 2 / spCount) * i + f * 0.025;
        const sx = Math.cos(a) * gateR, sy = Math.sin(a) * gateR;
        ctx.fillStyle = isSSR ? '#fff' : rc;
        ctx.shadowColor = rc; ctx.shadowBlur = isSSR ? 14 : 8;
        const sp = isSSR ? 4 : isSR ? 3 : 2;
        ctx.beginPath(); ctx.arc(sx, sy, sp, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
        if (isSSR) {
          ctx.strokeStyle = 'rgba(255,255,180,0.3)'; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx * 1.35, sy * 1.35); ctx.stroke();
        }
      }

      const innerR = gateR * 0.38;
      ctx.globalAlpha = Math.min(1, openProg * 1.5);
      const hole = ctx.createRadialGradient(0, 0, 0, 0, 0, innerR);
      hole.addColorStop(0, '#000'); hole.addColorStop(0.7, '#000'); hole.addColorStop(1, 'transparent');
      ctx.fillStyle = hole; ctx.beginPath(); ctx.arc(0, 0, innerR, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.restore();
    }

    // ===== フェーズ1.5: STALL =====
    if (f > GATE_OPEN && f <= GATE_OPEN + stall) {
      const stallProg = (f - GATE_OPEN) / stall;
      const flicker = Math.sin(f * 0.8) > 0;
      const fastFlick = Math.sin(f * 1.8) > 0;

      if (isLR) {
        // レインボー全画面パルス
        const rainCol = getLRColor(game.frameCount * 0.1);
        ctx.globalAlpha = Math.abs(Math.sin(f * 0.12)) * 0.18;
        ctx.fillStyle = rainCol; ctx.fillRect(0, 0, W, H);
        ctx.globalAlpha = 1;

        // レインボーライトニング
        ctx.save(); ctx.translate(cx, cy);
        for (let b = 0; b < 6; b++) {
          if ((b + Math.floor(f / 3)) % 2 !== 0) continue;
          const baseA = (Math.PI * 2 / 6) * b + f * 0.03;
          ctx.strokeStyle = getLRColor(b * 0.5 + game.frameCount * 0.08);
          ctx.lineWidth = 1.2 + Math.random() * 1.2;
          ctx.shadowColor = getLRColor(b * 0.5); ctx.shadowBlur = 10;
          ctx.beginPath(); ctx.moveTo(0, 0);
          let lx = 0, ly = 0;
          for (let s = 1; s <= 7; s++) {
            const d = (180 + Math.random() * 80) / 7 * s;
            const j = (Math.random() - 0.5) * 40;
            lx = Math.cos(baseA) * d + Math.cos(baseA + Math.PI / 2) * j;
            ly = Math.sin(baseA) * d + Math.sin(baseA + Math.PI / 2) * j;
            ctx.lineTo(lx, ly);
          }
          ctx.stroke(); ctx.shadowBlur = 0;
        }
        ctx.restore();

        // "???" 大文字レインボー
        ctx.globalAlpha = fastFlick ? 1.0 : 0.5;
        ctx.shadowColor = getLRColor(game.frameCount * 0.1); ctx.shadowBlur = 32;
        ctx.fillStyle = '#fff'; ctx.font = 'bold 90px Orbitron,Courier New'; ctx.textAlign = 'center';
        ctx.fillText('???', cx, cy + 32); ctx.shadowBlur = 0; ctx.globalAlpha = 1;

        // "LEGEND !!" テキスト
        ctx.globalAlpha = Math.min(1, stallProg * 2.5) * (flicker ? 1 : 0.6);
        const lc = getLRColor(game.frameCount * 0.08);
        ctx.shadowColor = lc; ctx.shadowBlur = 26;
        ctx.fillStyle = lc; ctx.font = 'bold 32px Orbitron,Courier New';
        ctx.fillText('★★  LEGEND  !!  ★★', cx, cy - 130);
        ctx.shadowBlur = 0; ctx.globalAlpha = 1;

        // レインボーコーナーフレーム
        if (fastFlick) {
          for (let i = 0; i < 2; i++) {
            ctx.strokeStyle = getLRColor(i * 1.5 + game.frameCount * 0.05);
            ctx.lineWidth = 4 - i; ctx.shadowColor = ctx.strokeStyle; ctx.shadowBlur = 12;
            ctx.strokeRect(5 + i * 5, 5 + i * 5, W - 10 - i * 10, H - 10 - i * 10);
            ctx.shadowBlur = 0;
          }
        }

        // レインボースピードライン
        ctx.globalAlpha = 0.11 + Math.sin(f * 0.3) * 0.05;
        for (let i = 0; i < 22; i++) {
          const a = (Math.PI * 2 / 22) * i;
          ctx.strokeStyle = getLRColor(i * 0.17);
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(cx + Math.cos(a) * 320, cy + Math.sin(a) * 320);
          ctx.lineTo(cx + Math.cos(a) * 180, cy + Math.sin(a) * 180);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;

      } else if (isSSR) {
        // 金色パルス全画面
        ctx.globalAlpha = Math.abs(Math.sin(f * 0.15)) * 0.28;
        ctx.fillStyle = '#ffcc00'; ctx.fillRect(0, 0, W, H);
        ctx.globalAlpha = 1;

        // ライトニングボルト放射
        ctx.save(); ctx.translate(cx, cy);
        for (let b = 0; b < 8; b++) {
          if ((b + Math.floor(f / 4)) % 3 !== 0) continue;
          const baseA = (Math.PI * 2 / 8) * b + f * 0.02;
          ctx.strokeStyle = `rgba(255,255,120,${0.3 + Math.random() * 0.5})`;
          ctx.lineWidth = 1 + Math.random() * 1.5;
          ctx.shadowColor = '#ffee00'; ctx.shadowBlur = 12;
          ctx.beginPath(); ctx.moveTo(0, 0);
          let lx = 0, ly = 0;
          for (let s = 1; s <= 6; s++) {
            const d = (160 + Math.random() * 70) / 6 * s;
            const j = (Math.random() - 0.5) * 35;
            lx = Math.cos(baseA) * d + Math.cos(baseA + Math.PI / 2) * j;
            ly = Math.sin(baseA) * d + Math.sin(baseA + Math.PI / 2) * j;
            ctx.lineTo(lx, ly);
          }
          ctx.stroke(); ctx.shadowBlur = 0;
        }
        ctx.restore();

        // "???" 大文字
        ctx.globalAlpha = fastFlick ? 1.0 : 0.5;
        ctx.shadowColor = '#ffdd00'; ctx.shadowBlur = 60;
        ctx.fillStyle = '#fff'; ctx.font = 'bold 80px Orbitron,Courier New'; ctx.textAlign = 'center';
        ctx.fillText('???', cx, cy + 28); ctx.shadowBlur = 0; ctx.globalAlpha = 1;

        // "LEGENDARY !!" テキスト
        ctx.globalAlpha = Math.min(1, stallProg * 3) * (flicker ? 1 : 0.7);
        ctx.shadowColor = '#ffdd00'; ctx.shadowBlur = 40;
        ctx.fillStyle = '#ffee44'; ctx.font = 'bold 28px Orbitron,Courier New';
        ctx.fillText('★  LEGENDARY  !!  ★', cx, cy - 115);
        ctx.shadowBlur = 0; ctx.globalAlpha = 1;

        // コーナーフラッシュ枠
        if (fastFlick) {
          ctx.strokeStyle = '#ffdd00'; ctx.lineWidth = 8;
          ctx.shadowColor = '#ffdd00'; ctx.shadowBlur = 30;
          ctx.strokeRect(4, 4, W - 8, H - 8);
          ctx.lineWidth = 2; ctx.strokeRect(16, 16, W - 32, H - 32);
          ctx.shadowBlur = 0;
        }

        // 収束スピードライン
        ctx.globalAlpha = 0.22 + Math.sin(f * 0.3) * 0.08;
        ctx.strokeStyle = '#ffdd00'; ctx.lineWidth = 1;
        for (let i = 0; i < 28; i++) {
          const a = (Math.PI * 2 / 28) * i;
          ctx.beginPath();
          ctx.moveTo(cx + Math.cos(a) * 300, cy + Math.sin(a) * 300);
          ctx.lineTo(cx + Math.cos(a) * 170, cy + Math.sin(a) * 170);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;

      } else if (isSR) {
        ctx.globalAlpha = flicker ? 0.9 : 0.45;
        ctx.shadowColor = rc; ctx.shadowBlur = 35;
        ctx.fillStyle = '#fff'; ctx.font = 'bold 58px Orbitron,Courier New'; ctx.textAlign = 'center';
        ctx.fillText('???', cx, cy + 10); ctx.shadowBlur = 0; ctx.globalAlpha = 1;

        ctx.globalAlpha = Math.min(1, stallProg * 3) * (flicker ? 1 : 0.65);
        ctx.shadowColor = rc; ctx.shadowBlur = 30;
        ctx.fillStyle = rc; ctx.font = 'bold 22px Orbitron,Courier New';
        ctx.fillText('⚡  EPIC  !  ⚡', cx, cy - 90);
        ctx.shadowBlur = 0; ctx.globalAlpha = 1;

        if (flicker) {
          ctx.strokeStyle = rc; ctx.lineWidth = 5;
          ctx.shadowColor = rc; ctx.shadowBlur = 22;
          ctx.strokeRect(3, 3, W - 6, H - 6); ctx.shadowBlur = 0;
        }
        ctx.globalAlpha = 0.16;
        ctx.strokeStyle = rc; ctx.lineWidth = 1;
        for (let i = 0; i < 18; i++) {
          const lx = (i / 18) * W;
          ctx.beginPath(); ctx.moveTo(lx, 0); ctx.lineTo(lx + 60, H); ctx.stroke();
        }
        ctx.globalAlpha = 1;

      } else {
        ctx.globalAlpha = flicker ? 0.85 : 0.4;
        ctx.shadowColor = rc; ctx.shadowBlur = 22;
        ctx.fillStyle = '#fff'; ctx.font = 'bold 42px Orbitron,Courier New'; ctx.textAlign = 'center';
        ctx.fillText('???', cx, cy + 10); ctx.shadowBlur = 0; ctx.globalAlpha = 1;
      }
    }
  }

  // ===== フェーズ2: ワープアウト =====
  const warpStart = GATE_OPEN + stall;
  if (f > warpStart && f <= warpStart + GATE_WARPOUT) {
    const wp = (f - warpStart) / GATE_WARPOUT;
    const gateR = (isSSR ? 200 : isSR ? 170 : 130) * (1 - wp * 0.7);
    ctx.save(); ctx.translate(cx, cy);
    ctx.strokeStyle = rc; ctx.lineWidth = 3 * (1 - wp);
    ctx.shadowColor = rc; ctx.shadowBlur = 22 * (1 - wp);
    ctx.globalAlpha = 1 - wp * 0.8;
    ctx.beginPath(); ctx.arc(0, 0, gateR, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();

    // 衝撃波リング
    if (wp > 0.25) {
      const sp = (wp - 0.25) / 0.75;
      const shockR = sp * 280;
      ctx.strokeStyle = rc; ctx.lineWidth = Math.max(0.5, 3 * (1 - sp));
      ctx.globalAlpha = (1 - sp) * 0.85;
      ctx.shadowColor = rc; ctx.shadowBlur = 12;
      ctx.beginPath(); ctx.arc(cx, cy, shockR, 0, Math.PI * 2); ctx.stroke();
      if (sp > 0.35) {
        const sp2 = (sp - 0.35) / 0.65;
        ctx.strokeStyle = '#fff'; ctx.lineWidth = Math.max(0.5, 2 * (1 - sp2));
        ctx.globalAlpha = (1 - sp2) * 0.5;
        ctx.beginPath(); ctx.arc(cx, cy, sp2 * 220, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.shadowBlur = 0; ctx.globalAlpha = 1;
    }

    const itemScale = wp * wp * 1.6;
    ctx.save(); ctx.translate(cx, cy); ctx.scale(itemScale, itemScale);
    ctx.shadowColor = rc; ctx.shadowBlur = 45 * wp;
    ctx.fillStyle = rc; ctx.globalAlpha = wp;
    ctx.beginPath(); ctx.moveTo(0, -22); ctx.lineTo(16, 13); ctx.lineTo(0, 8); ctx.lineTo(-16, 13); ctx.closePath(); ctx.fill();
    ctx.shadowBlur = 0; ctx.restore();

    if (wp > 0.55) {
      ctx.globalAlpha = (wp - 0.55) / 0.45 * (isLR ? 0.55 : isSSR ? 0.9 : 0.65);
      ctx.fillStyle = isLR ? getLRColor(game.frameCount * 0.08) : isSSR ? '#ffcc00' : rc; ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;
    }
  }

  // ===== フェーズ3: リベール =====
  const revealStart = warpStart + GATE_WARPOUT;
  if (f > revealStart) {
    const rp = Math.min(1, (f - revealStart) / GATE_FADEIN);
    const rAge = f - revealStart;

    const glowR = isLR ? 360 : isSSR ? 420 : isSR ? 330 : 270;
    const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowR);
    bg.addColorStop(0, RARITY_COLORS[item.rarity] + (isLR ? '66' : isSSR ? '55' : isSR ? '3a' : '28')); bg.addColorStop(1, 'transparent');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

    // LR: レインボーキラキラ
    if (isLR) {
      for (let i = 0; i < 14; i++) {
        const a = game.frameCount * 0.05 + i * (Math.PI * 2 / 14);
        const r2 = 110 + Math.sin(game.frameCount * 0.08 + i * 1.2) * 55;
        const px = cx + Math.cos(a) * r2, py = cy + Math.sin(a) * r2 - 20;
        ctx.globalAlpha = rp * (0.35 + Math.sin(game.frameCount * 0.12 + i) * 0.22);
        ctx.fillStyle = getLRColor(i * 0.25 + game.frameCount * 0.04);
        ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 8;
        ctx.beginPath(); ctx.arc(px, py, 2.5, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
      }
      ctx.globalAlpha = 1;
    }

    // SSR背景キラキラ
    if (isSSR) {
      for (let i = 0; i < 14; i++) {
        const a = game.frameCount * 0.04 + i * (Math.PI * 2 / 14);
        const r = 95 + Math.sin(game.frameCount * 0.07 + i * 1.3) * 45;
        const px = cx + Math.cos(a) * r, py = cy + Math.sin(a) * r - 20;
        ctx.globalAlpha = rp * (0.4 + Math.sin(game.frameCount * 0.1 + i) * 0.3);
        ctx.fillStyle = '#ffee88'; ctx.shadowColor = '#ffdd00'; ctx.shadowBlur = 10;
        ctx.beginPath(); ctx.arc(px, py, 2.5, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
      }
      ctx.globalAlpha = 1;
    }

    ctx.globalAlpha = rp;
    const cw = 340, ch = 372, cxl = cx - cw / 2, cyl = cy - ch / 2 - 12;

    // SSR 外枠ゴールドグロー
    if (isSSR) {
      ctx.shadowColor = '#ffdd00'; ctx.shadowBlur = 55;
      ctx.strokeStyle = '#ffaa00'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.roundRect(cxl - 4, cyl - 4, cw + 8, ch + 8, 20); ctx.stroke(); ctx.shadowBlur = 0;
    }

    ctx.shadowColor = rc; ctx.shadowBlur = isSSR ? 44 : 26;
    ctx.fillStyle = 'rgba(5,4,18,0.98)'; ctx.strokeStyle = rc; ctx.lineWidth = isSSR ? 3 : 2.5;
    ctx.beginPath(); ctx.roundRect(cxl, cyl, cw, ch, 16); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;

    // SSR 斜めゴールドストライプ
    if (isSSR) {
      ctx.save();
      ctx.beginPath(); ctx.roundRect(cxl, cyl, cw, ch, 16); ctx.clip();
      ctx.globalAlpha = rp * 0.11;
      ctx.fillStyle = '#ffdd00';
      for (let s = 0; s < 4; s++) {
        const sx = cxl - 60 + s * 110;
        ctx.beginPath();
        ctx.moveTo(sx, cyl); ctx.lineTo(sx + 60, cyl);
        ctx.lineTo(sx + 60 + ch * 0.45, cyl + ch); ctx.lineTo(sx + ch * 0.45, cyl + ch);
        ctx.closePath(); ctx.fill();
      }
      ctx.globalAlpha = rp; ctx.restore();
    }

    // LR: 外枠レインボーグロー
    if (isLR) {
      for (let i = 0; i < 3; i++) {
        ctx.strokeStyle = getLRColor(i * 1.0 + game.frameCount * 0.06);
        ctx.lineWidth = 2.2 - i * 0.35; ctx.shadowColor = ctx.strokeStyle; ctx.shadowBlur = 14;
        ctx.globalAlpha = rp * (0.55 - i * 0.12);
        ctx.beginPath(); ctx.roundRect(cxl - 4 - i * 3, cyl - 4 - i * 3, cw + 8 + i * 6, ch + 8 + i * 6, 22); ctx.stroke();
        ctx.shadowBlur = 0;
      }
      ctx.globalAlpha = rp;
    }

    // SSR 外枠ゴールドグロー
    if (isSSR) {
      ctx.shadowColor = '#ffdd00'; ctx.shadowBlur = 55;
      ctx.strokeStyle = '#ffaa00'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.roundRect(cxl - 4, cyl - 4, cw + 8, ch + 8, 20); ctx.stroke(); ctx.shadowBlur = 0;
    }

    ctx.shadowColor = isLR ? getLRColor(game.frameCount * 0.06) : rc; ctx.shadowBlur = isLR ? 26 : isSSR ? 44 : 26;
    ctx.fillStyle = 'rgba(5,4,18,0.98)'; ctx.strokeStyle = isLR ? getLRColor(game.frameCount * 0.06) : rc; ctx.lineWidth = isLR ? 4 : isSSR ? 3 : 2.5;
    ctx.beginPath(); ctx.roundRect(cxl, cyl, cw, ch, 16); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;

    // LR レインボーストライプ
    if (isLR) {
      ctx.save();
      ctx.beginPath(); ctx.roundRect(cxl, cyl, cw, ch, 16); ctx.clip();
      for (let s = 0; s < 6; s++) {
        ctx.globalAlpha = rp * 0.07;
        ctx.fillStyle = getLRColor(s + game.frameCount * 0.02);
        const sx = cxl - 60 + s * 90;
        ctx.beginPath();
        ctx.moveTo(sx, cyl); ctx.lineTo(sx + 50, cyl);
        ctx.lineTo(sx + 50 + ch * 0.45, cyl + ch); ctx.lineTo(sx + ch * 0.45, cyl + ch);
        ctx.closePath(); ctx.fill();
      }
      ctx.globalAlpha = rp; ctx.restore();
    }

    // SSR 斜めゴールドストライプ
    if (isSSR) {
      ctx.save();
      ctx.beginPath(); ctx.roundRect(cxl, cyl, cw, ch, 16); ctx.clip();
      ctx.globalAlpha = rp * 0.11;
      ctx.fillStyle = '#ffdd00';
      for (let s = 0; s < 4; s++) {
        const sx = cxl - 60 + s * 110;
        ctx.beginPath();
        ctx.moveTo(sx, cyl); ctx.lineTo(sx + 60, cyl);
        ctx.lineTo(sx + 60 + ch * 0.45, cyl + ch); ctx.lineTo(sx + ch * 0.45, cyl + ch);
        ctx.closePath(); ctx.fill();
      }
      ctx.globalAlpha = rp; ctx.restore();
    }

    // レアリティバナー
    if (isLR) {
      const banG = ctx.createLinearGradient(cxl, cyl, cxl + cw, cyl + 58);
      LR_RAINBOW.forEach((c, i) => banG.addColorStop(i / 6, c));
      ctx.fillStyle = banG;
    } else if (isSSR) {
      const banG = ctx.createLinearGradient(cxl, cyl, cxl + cw, cyl + 58);
      banG.addColorStop(0, '#996600'); banG.addColorStop(0.5, '#ffdd00'); banG.addColorStop(1, '#996600');
      ctx.fillStyle = banG;
    } else { ctx.fillStyle = rc; }
    ctx.beginPath(); ctx.roundRect(cxl, cyl, cw, 58, 12); ctx.fill();
    ctx.fillStyle = '#000'; ctx.font = `bold ${isLR ? 36 : isSSR ? 32 : 26}px Orbitron,Courier New`; ctx.textAlign = 'center';
    ctx.fillText(item.rarity, cx, cyl + 42);

    // LR / LEGENDARY / EPIC コールアウト（カード上）
    if (isLR) {
      ctx.globalAlpha = rp * (0.7 + Math.sin(game.frameCount * 0.25) * 0.3);
      const lc = getLRColor(game.frameCount * 0.07);
      ctx.shadowColor = lc; ctx.shadowBlur = 55;
      ctx.fillStyle = '#fff'; ctx.font = 'bold 24px Orbitron,Courier New';
      ctx.fillText('★★  LEGEND  !!  ★★', cx, cyl - 30);
      ctx.shadowBlur = 0;
    } else if (isSSR) {
      ctx.globalAlpha = rp * (0.7 + Math.sin(game.frameCount * 0.22) * 0.3);
      ctx.shadowColor = '#ffdd00'; ctx.shadowBlur = 38;
      ctx.fillStyle = '#ffee44'; ctx.font = 'bold 20px Orbitron,Courier New';
      ctx.fillText('★  LEGENDARY  !!  ★', cx, cyl - 26);
      ctx.shadowBlur = 0;
    } else if (isSR) {
      ctx.globalAlpha = rp * (0.7 + Math.sin(game.frameCount * 0.2) * 0.3);
      ctx.shadowColor = rc; ctx.shadowBlur = 22;
      ctx.fillStyle = rc; ctx.font = 'bold 16px Orbitron,Courier New';
      ctx.fillText('⚡  EPIC  !  ⚡', cx, cyl - 20);
      ctx.shadowBlur = 0;
    }
    ctx.globalAlpha = rp;

    // NEWバッジ
    if (game.gachaNewItems.has(item.id)) {
      ctx.shadowColor = '#00ff66'; ctx.shadowBlur = 16;
      ctx.fillStyle = '#00ff66'; ctx.font = 'bold 13px Orbitron,Courier New';
      ctx.fillText('★ 初入手', cx + 126, cyl + 22); ctx.shadowBlur = 0;
    }

    // アイコン（大きく）
    ctx.save(); ctx.translate(cx, cyl + 160);
    const iconS = isLR ? 2.0 : isSSR ? 1.7 : isSR ? 1.4 : 1.2;
    ctx.scale(iconS, iconS);
    ctx.shadowColor = isLR ? getLRColor(game.frameCount * 0.06) : rc; ctx.shadowBlur = isLR ? 45 : isSSR ? 32 : 22; ctx.globalAlpha = rp * 0.95;
    drawGachaItemIcon(item);
    if (isLR) {
      ctx.globalAlpha = rp * (0.35 + Math.sin(game.frameCount * 0.12) * 0.2);
      for (let ri = 0; ri < 3; ri++) {
        ctx.strokeStyle = getLRColor(ri * 2 + game.frameCount * 0.06);
        ctx.lineWidth = (2 - ri * 0.5) / iconS;
        ctx.beginPath(); ctx.arc(0, 0, (35 + ri * 12) / iconS, 0, Math.PI * 2); ctx.stroke();
      }
    }
    if (isSSR) {
      ctx.globalAlpha = rp * (0.28 + Math.sin(game.frameCount * 0.1) * 0.18);
      ctx.strokeStyle = '#ffdd00'; ctx.lineWidth = 1.5 / iconS;
      ctx.beginPath(); ctx.arc(0, 0, 40 / iconS, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, 54 / iconS, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.shadowBlur = 0; ctx.restore();
    ctx.globalAlpha = rp;

    ctx.textAlign = 'center';
    ctx.fillStyle = '#c8dcf5'; ctx.font = 'bold 12px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif';
    ctx.shadowColor = 'rgba(120,160,220,0.35)'; ctx.shadowBlur = 4;
    ctx.fillText(gachaTypeLabelJp(item.type), cx, cyl + 214); ctx.shadowBlur = 0;

    ctx.shadowColor = rc; ctx.shadowBlur = isSSR ? 20 : 10;
    ctx.fillStyle = '#fff'; ctx.font = `bold ${isSSR ? 23 : 21}px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif`;
    ctx.fillText(item.label, cx, cyl + 240); ctx.shadowBlur = 0;

    ctx.textAlign = 'left';
    ctx.fillStyle = '#eef6ff'; ctx.font = 'bold 12px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif';
    const descNextY = wrapFillJp(ctx, (item.desc || '').replace(/\r/g, ''), cxl + 18, cyl + 262, cw - 36, 17, 4);
    ctx.textAlign = 'center';

    const inv = game.gachaInventory[item.id];
    let bonusY = descNextY + 10;
    if (!game.gachaNewItems.has(item.id) && inv) {
      if (inv.level >= 30) {
        ctx.fillStyle = '#ffe8a0'; ctx.font = 'bold 12px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif';
        ctx.shadowColor = '#ffd700'; ctx.shadowBlur = 8;
        ctx.fillText(`Lv.MAX時 スターダスト +${{ SSR: 50, SR: 20, R: 10, N: 5 }[item.rarity]}`, cx, bonusY);
        ctx.shadowBlur = 0;
      } else {
        ctx.fillStyle = '#ffd4b8'; ctx.font = 'bold 12px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif';
        ctx.shadowColor = 'rgba(255,160,100,0.25)'; ctx.shadowBlur = 6;
        ctx.fillText(`重複時：${item.rarity}素材 +1`, cx, bonusY);
        ctx.shadowBlur = 0;
      }
    }

    // プログレスドット
    if (game.gachaResults.length > 1) {
      ctx.fillStyle = '#8899aa'; ctx.font = 'bold 10px Orbitron,Courier New';
      ctx.fillText(`${game.gachaCurrentIdx + 1}  /  ${game.gachaResults.length}`, cx, cyl + ch - 10);
      game.gachaResults.forEach((r, i) => {
        const dx = cx - game.gachaResults.length * 9 + i * 18;
        ctx.fillStyle = i === game.gachaCurrentIdx ? RARITY_COLORS[r.rarity] : i < game.gachaCurrentIdx ? RARITY_COLORS[r.rarity] + '66' : '#2a2a2a';
        ctx.beginPath(); ctx.arc(dx, cyl + ch + 8, i === game.gachaCurrentIdx ? 6 : 4, 0, Math.PI * 2); ctx.fill();
      });
    }

    // 最後のカード: 再ガチャボタン
    const isLast = game.gachaCurrentIdx >= game.gachaResults.length - 1;
    if (isLast) {
      const btny = cyl + ch + 22, btnw = 155, btnh = 36;
      const btn1x = cx - 168, btn2x = cx + 14;
      const prem = game.gachaTab === 1;
      const can1 = prem ? game.gems >= 5 : game.coins >= 500;
      ctx.shadowColor = can1 ? '#ffd700' : 'transparent'; ctx.shadowBlur = can1 ? 12 : 0;
      const bg1 = ctx.createLinearGradient(btn1x, btny, btn1x + btnw, btny + btnh);
      bg1.addColorStop(0, can1 ? 'rgba(120,88,0,0.97)' : 'rgba(28,28,28,0.9)');
      bg1.addColorStop(1, can1 ? 'rgba(72,52,0,0.95)' : 'rgba(18,18,18,0.9)');
      ctx.fillStyle = bg1; ctx.strokeStyle = can1 ? '#ffd700' : '#5a5a68'; ctx.lineWidth = can1 ? 2 : 1;
      ctx.beginPath(); ctx.roundRect(btn1x, btny, btnw, btnh, 8); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;
      ctx.fillStyle = can1 ? '#ffe566' : '#c8d0e0'; ctx.font = 'bold 11px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(prem ? 'プレミアム1回 5💎' : '単発 500コイン', btn1x + btnw / 2, btny + 15);
      ctx.fillStyle = can1 ? '#aa8822' : '#9aa8bc'; ctx.font = 'bold 10px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif';
      ctx.fillText('もう一度引く', btn1x + btnw / 2, btny + 29);

      const can10 = prem ? game.gems >= 50 : game.coins >= 5000;
      ctx.shadowColor = can10 ? '#cc88ff' : 'transparent'; ctx.shadowBlur = can10 ? 12 : 0;
      const bg2 = ctx.createLinearGradient(btn2x, btny, btn2x + btnw, btny + btnh);
      bg2.addColorStop(0, can10 ? 'rgba(82,14,140,0.97)' : 'rgba(42,38,58,0.94)');
      bg2.addColorStop(1, can10 ? 'rgba(50,8,88,0.95)' : 'rgba(28,26,40,0.94)');
      ctx.fillStyle = bg2; ctx.strokeStyle = can10 ? '#cc88ff' : '#6a6088'; ctx.lineWidth = can10 ? 2 : 1;
      ctx.beginPath(); ctx.roundRect(btn2x, btny, btnw, btnh, 8); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;
      ctx.fillStyle = can10 ? '#f0d8ff' : '#d4c8f0'; ctx.font = 'bold 11px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif';
      ctx.fillText(prem ? 'プレミアム10連 50💎' : '10連 5000コイン', btn2x + btnw / 2, btny + 15);
      ctx.fillStyle = can10 ? '#c9a6ee' : '#b8a8d8'; ctx.font = 'bold 10px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif';
      ctx.fillText('まとめて引く', btn2x + btnw / 2, btny + 29);
    } else {
      if (Math.sin(game.frameCount * 0.14) > 0) {
        ctx.fillStyle = '#445'; ctx.font = '10px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('タップで次へ', cx, cyl + ch + 42);
      }
    }

    if (rAge < GATE_FADEIN * 0.6 && Math.sin(game.frameCount * 0.22) > 0) {
      ctx.fillStyle = '#2a2a3a'; ctx.font = '9px Orbitron,Courier New';
      const skipHint = game.gachaResults.length >= 10 ? 'タップ×2で一覧 / タップで次へ' : 'タップでスキップ';
      ctx.fillText(skipHint, cx, H - 26);
    }
    if (game.gachaResults.length >= 10 && rAge >= GATE_FADEIN * 0.5) {
      const sbx = cx - 120, sby = H - 44, sbw = 240, sbh = 34;
      ctx.fillStyle = 'rgba(40,36,70,0.92)'; ctx.strokeStyle = '#6655aa'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.roundRect(sbx, sby, sbw, sbh, 8); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#aac'; ctx.font = 'bold 11px Orbitron,Courier New'; ctx.textAlign = 'center';
      ctx.fillText('10連: 一覧を見る', cx, sby + 22);
    }
    ctx.globalAlpha = 1;
  }

  ctx.textAlign = 'left'; ctx.lineWidth = 1;
}

export function drawGachaSummary() {
  ctx.fillStyle = 'rgba(0,0,0,0.97)'; ctx.fillRect(0, 0, W, H);

  const hasSSR = game.gachaResults.some(r => r.rarity === 'SSR');

  // SSR全画面ゴールドエフェクト
  if (hasSSR) {
    const pulse = 0.5 + Math.sin(game.frameCount * 0.1) * 0.5;
    const bgG = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, 420);
    bgG.addColorStop(0, `rgba(85,65,0,${pulse * 0.28})`); bgG.addColorStop(1, 'transparent');
    ctx.fillStyle = bgG; ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = `rgba(255,220,0,${pulse * 0.65})`; ctx.lineWidth = 5;
    ctx.shadowColor = '#ffdd00'; ctx.shadowBlur = 22;
    ctx.strokeRect(3, 3, W - 6, H - 6);
    ctx.strokeStyle = `rgba(255,220,0,${pulse * 0.3})`; ctx.lineWidth = 2;
    ctx.strokeRect(12, 12, W - 24, H - 24);
    ctx.shadowBlur = 0; ctx.lineWidth = 1;

    for (let i = 0; i < 10; i++) {
      const a = game.frameCount * 0.03 + i * (Math.PI * 2 / 10);
      const r = 230 + Math.sin(game.frameCount * 0.07 + i * 1.3) * 35;
      ctx.globalAlpha = 0.45 + Math.sin(game.frameCount * 0.1 + i) * 0.3;
      ctx.fillStyle = '#ffee88'; ctx.shadowColor = '#ffdd00'; ctx.shadowBlur = 8;
      ctx.beginPath(); ctx.arc(W / 2 + Math.cos(a) * r, H / 2 + Math.sin(a) * r, 3, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
    }
    ctx.globalAlpha = 1;
  }

  const hasLR = game.gachaResults.some(r => r.rarity === 'LR');
  // タイトル
  const titleCol = hasLR ? getLRColor(game.frameCount * 0.06) : hasSSR ? '#ffdd00' : '#cc88ff';
  ctx.shadowColor = titleCol; ctx.shadowBlur = hasLR ? 50 : hasSSR ? 35 : 20;
  ctx.fillStyle = titleCol;
  ctx.font = `bold ${hasLR || hasSSR ? 26 : 22}px Orbitron,Courier New`; ctx.textAlign = 'center';
  ctx.fillText(hasLR ? '★★ レジェンド獲得 ★★' : hasSSR ? '★ ガチャ結果 ★' : 'ガチャ結果', W / 2, 36); ctx.shadowBlur = 0;

  if (hasLR && Math.sin(game.frameCount * 0.12) > 0) {
    ctx.fillStyle = `rgba(255,34,102,0.1)`; ctx.fillRect(0, 42, W, 18);
    ctx.fillStyle = '#ff2266'; ctx.font = 'bold 9px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif';
    ctx.fillText('★★ レジェンド !! ★★', W / 2, 55);
  } else if (hasSSR && Math.sin(game.frameCount * 0.12) > 0) {
    ctx.fillStyle = 'rgba(255,220,0,0.08)'; ctx.fillRect(0, 42, W, 18);
    ctx.fillStyle = '#aa8800'; ctx.font = 'bold 9px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif';
    ctx.fillText('伝説レアを獲得 !!', W / 2, 55);
  }

  const cols = 5, rows = 2, cw = 148, ch = 114, gapX = 5, gapY = 6;
  const totalW = cols * cw + (cols - 1) * gapX;
  const startX = (W - totalW) / 2, startY = 64;

  game.gachaResults.forEach((item, i) => {
    const col = i % cols, row = Math.floor(i / cols);
    const x = startX + col * (cw + gapX);
    const isItemLR = item.rarity === 'LR';
    const isItemSSR = item.rarity === 'SSR';
    const rc = isItemLR ? getLRColor(game.frameCount * 0.05 + i) : RARITY_COLORS[item.rarity];
    const y = startY + row * (ch + gapY) + ((isItemLR || isItemSSR) ? Math.sin(game.frameCount * 0.12 + i) * 2.5 : 0);
    const isNew = game.gachaNewItems.has(item.id);

    if (isItemLR) {
      for (let ri = 0; ri < 3; ri++) {
        ctx.shadowColor = getLRColor(ri + game.frameCount * 0.04); ctx.shadowBlur = 20 - ri * 5;
        ctx.strokeStyle = getLRColor(ri + game.frameCount * 0.04); ctx.lineWidth = 2.5 - ri * 0.5;
        ctx.fillStyle = 'rgba(18,4,12,0.98)';
        ctx.beginPath(); ctx.roundRect(x - ri * 2, y - ri * 2, cw + ri * 4, ch + ri * 4, 8 + ri * 2); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;
      }
    } else if (isItemSSR) {
      ctx.shadowColor = '#ffdd00'; ctx.shadowBlur = 22;
      ctx.strokeStyle = '#aa7700'; ctx.lineWidth = 2.5;
      ctx.fillStyle = 'rgba(12,10,24,0.98)';
      ctx.beginPath(); ctx.roundRect(x, y, cw, ch, 8); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;
    } else {
      ctx.shadowColor = rc; ctx.shadowBlur = item.rarity === 'SR' ? 10 : 5;
      ctx.strokeStyle = rc; ctx.lineWidth = item.rarity === 'SR' ? 2 : 1.5;
      ctx.fillStyle = 'rgba(8,8,20,0.95)';
      ctx.beginPath(); ctx.roundRect(x, y, cw, ch, 8); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;
    }

    // LRレインボーストライプ
    if (isItemLR) {
      ctx.save();
      ctx.beginPath(); ctx.roundRect(x, y, cw, ch, 8); ctx.clip();
      for (let s = 0; s < 5; s++) {
        ctx.globalAlpha = 0.07; ctx.fillStyle = getLRColor(s + game.frameCount * 0.02);
        const sx = x - 30 + s * 44;
        ctx.beginPath(); ctx.moveTo(sx, y); ctx.lineTo(sx + 36, y); ctx.lineTo(sx + 36 + ch * 0.5, y + ch); ctx.lineTo(sx + ch * 0.5, y + ch); ctx.closePath(); ctx.fill();
      }
      ctx.globalAlpha = 1; ctx.restore();
    }

    // SSR斜めストライプ
    if (isItemSSR) {
      ctx.save();
      ctx.beginPath(); ctx.roundRect(x, y, cw, ch, 8); ctx.clip();
      ctx.globalAlpha = 0.09; ctx.fillStyle = '#ffdd00';
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 50, y); ctx.lineTo(x + 50 + ch * 0.55, y + ch); ctx.lineTo(x + ch * 0.55, y + ch); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(x + 82, y); ctx.lineTo(x + 112, y); ctx.lineTo(x + 112 + ch * 0.55, y + ch); ctx.lineTo(x + 82 + ch * 0.55, y + ch); ctx.closePath(); ctx.fill();
      ctx.globalAlpha = 1; ctx.restore();
    }

    // レアリティ帯
    if (isItemLR) {
      const banG = ctx.createLinearGradient(x, y, x + cw, y + 24);
      LR_RAINBOW.forEach((c, i2) => banG.addColorStop(i2 / 6, c));
      ctx.fillStyle = banG;
    } else if (isItemSSR) {
      const banG = ctx.createLinearGradient(x, y, x + cw, y + 24);
      banG.addColorStop(0, '#886600'); banG.addColorStop(0.5, '#ffdd00'); banG.addColorStop(1, '#886600');
      ctx.fillStyle = banG;
    } else { ctx.fillStyle = RARITY_COLORS[item.rarity]; }
    ctx.beginPath(); ctx.roundRect(x, y, cw, 24, 8); ctx.fill();
    ctx.fillStyle = '#000'; ctx.font = 'bold 11px Orbitron,Courier New'; ctx.textAlign = 'center';
    ctx.fillText(item.rarity, x + cw / 2, y + 16);

    if (isNew) {
      ctx.fillStyle = '#00ff66'; ctx.shadowColor = '#00ff66'; ctx.shadowBlur = 8;
      ctx.font = 'bold 9px Orbitron,Courier New';
      ctx.fillText('★新', x + cw - 22, y + 15); ctx.shadowBlur = 0;
    }

    // アイコン
    ctx.save(); ctx.translate(x + cw / 2, y + 60);
    const iconS = isItemLR ? 1.4 : isItemSSR ? 1.2 : item.rarity === 'SR' ? 1.0 : 0.85;
    ctx.scale(iconS, iconS);
    ctx.shadowColor = isItemLR ? getLRColor(game.frameCount * 0.06) : rc; ctx.shadowBlur = isItemLR ? 24 : isItemSSR ? 16 : 8;
    drawGachaItemIcon(item);
    ctx.shadowBlur = 0; ctx.restore();

    ctx.shadowColor = rc; ctx.shadowBlur = isNew ? 10 : isItemSSR ? 8 : 0;
    ctx.fillStyle = '#fff'; ctx.font = `bold ${item.label.length > 10 ? 9 : 11}px Orbitron,Courier New`;
    ctx.fillText(item.label, x + cw / 2, y + 88); ctx.shadowBlur = 0;

    ctx.fillStyle = '#445'; ctx.font = '8px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif';
    ctx.fillText(gachaTypeLabelJp(item.type), x + cw / 2, y + 100);

    const inv = game.gachaInventory[item.id];
    if (!isNew && inv) {
      ctx.fillStyle = inv.level >= 30 ? '#ffd700' : '#445'; ctx.font = '7px Orbitron,Courier New';
      ctx.fillText(inv.level >= 30 ? 'MAX→星塵' : '重複', x + cw / 2, y + 111);
    }

    // SSR軌道パーティクル
    if (isItemSSR) {
      for (let p = 0; p < 5; p++) {
        const pa = game.frameCount * 0.10 + p * (Math.PI * 2 / 5), pr = 22 + Math.sin(game.frameCount * 0.07 + p) * 5;
        ctx.globalAlpha = 0.85; ctx.fillStyle = '#ffd700';
        ctx.shadowColor = '#ffaa00'; ctx.shadowBlur = 6;
        ctx.beginPath(); ctx.arc(x + cw / 2 + Math.cos(pa) * pr, y + ch / 2 + Math.sin(pa) * pr, 2.5, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0; ctx.globalAlpha = 1;
      }
    }
  });

  // 再ガチャボタン（目立つ）
  const boty = startY + rows * ch + (rows - 1) * gapY + 16;
  const btn1x = W / 2 - 318, btn2x = W / 2 + 10, btnw = 304, btnh = 44;
  const prem = game.gachaTab === 1;

  const can1 = prem ? game.gems >= 5 : game.coins >= 500;
  ctx.shadowColor = can1 ? '#ffd700' : 'transparent'; ctx.shadowBlur = can1 ? 18 : 0;
  const bg1 = ctx.createLinearGradient(btn1x, boty, btn1x + btnw, boty + btnh);
  bg1.addColorStop(0, can1 ? 'rgba(140,100,0,0.97)' : 'rgba(30,30,30,0.9)');
  bg1.addColorStop(1, can1 ? 'rgba(82,58,0,0.95)' : 'rgba(20,20,20,0.9)');
  ctx.fillStyle = bg1; ctx.strokeStyle = can1 ? '#ffd700' : '#444'; ctx.lineWidth = can1 ? 2.5 : 1;
  ctx.beginPath(); ctx.roundRect(btn1x, boty, btnw, btnh, 10); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;
  ctx.fillStyle = can1 ? '#ffe566' : '#666'; ctx.font = 'bold 13px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif'; ctx.textAlign = 'center';
  ctx.fillText(prem ? 'プレミアム1回 5💎' : '単発 500コイン', btn1x + btnw / 2, boty + 18);
  ctx.fillStyle = can1 ? '#aa8822' : '#444'; ctx.font = '10px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif';
  ctx.fillText('もう一度引く', btn1x + btnw / 2, boty + 35);

  const can10 = prem ? game.gems >= 50 : game.coins >= 5000;
  ctx.shadowColor = can10 ? '#cc88ff' : 'transparent'; ctx.shadowBlur = can10 ? 18 : 0;
  const bg2 = ctx.createLinearGradient(btn2x, boty, btn2x + btnw, boty + btnh);
  bg2.addColorStop(0, can10 ? 'rgba(90,16,150,0.97)' : 'rgba(30,30,30,0.9)');
  bg2.addColorStop(1, can10 ? 'rgba(55,9,90,0.95)' : 'rgba(20,20,20,0.9)');
  ctx.fillStyle = bg2; ctx.strokeStyle = can10 ? '#cc88ff' : '#444'; ctx.lineWidth = can10 ? 2.5 : 1;
  ctx.beginPath(); ctx.roundRect(btn2x, boty, btnw, btnh, 10); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;
  ctx.fillStyle = can10 ? '#dd99ff' : '#666'; ctx.font = 'bold 13px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif';
  ctx.fillText(prem ? 'プレミアム10連 50💎' : '10連 5000コイン', btn2x + btnw / 2, boty + 18);
  ctx.fillStyle = can10 ? '#9955bb' : '#444'; ctx.font = '10px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif';
  ctx.fillText('まとめて引く', btn2x + btnw / 2, boty + 35);

  ctx.fillStyle = 'rgba(32,30,48,0.95)'; ctx.strokeStyle = '#445'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.roundRect(W / 2 - 160, H - 48, 320, 36, 8); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#889'; ctx.font = 'bold 12px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('ガチャ画面に戻る', W / 2, H - 26);

  if (Math.sin(game.frameCount * 0.1) > 0) {
    ctx.fillStyle = '#333'; ctx.font = '9px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('下のボタンで戻る・再抽選', W / 2, H - 8);
  }
  ctx.textAlign = 'left'; ctx.lineWidth = 1;
}

export function drawGachaRates() {
  ctx.fillStyle = 'rgba(0,0,0,0.97)'; ctx.fillRect(0, 0, W, H);
  ctx.shadowColor = '#cc88ff'; ctx.shadowBlur = 20;
  ctx.fillStyle = '#cc88ff'; ctx.font = 'bold 20px Orbitron,Courier New'; ctx.textAlign = 'center';
  ctx.fillText('排出率 / アイテム詳細', W / 2, 30); ctx.shadowBlur = 0;
  drawGachaRatesContent(12, 38, W - 24, H - 96);
  ctx.fillStyle = '#333'; ctx.font = '9px Orbitron,Courier New'; ctx.textAlign = 'center';
  ctx.fillText('下の「戻る」でガチャへ', W / 2, Math.min(H - 14, 586));
  ctx.textAlign = 'left'; ctx.lineWidth = 1;
}

export function drawStardustShop() {
  ctx.fillStyle = 'rgba(0,0,0,0.96)'; ctx.fillRect(0, 0, W, H);
  // 背景グロー
  const bg = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, 300);
  bg.addColorStop(0, 'rgba(80,40,120,0.18)'); bg.addColorStop(1, 'transparent');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

  ctx.shadowColor = 'rgba(255,215,120,0.5)'; ctx.shadowBlur = 16;
  ctx.fillStyle = '#ffd700'; ctx.font = 'bold 26px Orbitron,Courier New'; ctx.textAlign = 'center';
  ctx.fillText('✦ スターダスト交換所 ✦', W / 2, 46); ctx.shadowBlur = 0;

  // 所持スターダスト（大きく表示）
  const dustPulse = 0.85 + Math.sin(game.frameCount * 0.12) * 0.15;
  ctx.shadowColor = 'rgba(255,215,120,0.35)'; ctx.shadowBlur = 10 * dustPulse;
  ctx.fillStyle = '#e5c97f'; ctx.font = 'bold 22px Orbitron,Courier New';
  ctx.fillText(`スターダスト：${game.gachaStardust}`, W / 2, 84); ctx.shadowBlur = 0;
  ctx.fillStyle = '#555'; ctx.font = '11px Orbitron,Courier New';
  ctx.fillText('ガチャの重複で獲得 / 上限MAX時に変換', W / 2, 102);

  const itemH = 118, startY = 124, itemW = 600, startX = (W - itemW) / 2;
  const costBoxW = 120, costBoxH = 48, rightPad = 12;
  STARDUST_SHOP_ITEMS.forEach((item, i) => {
    const y = startY + i * (itemH + 10);
    const active = game.stardustShopCursor === i;
    const canAfford = game.gachaStardust >= item.cost;
    const col = canAfford ? item.color : '#555';

    ctx.shadowColor = canAfford ? col : 'transparent'; ctx.shadowBlur = active ? (canAfford ? 12 : 0) : (canAfford ? 4 : 0);
    const bg2 = ctx.createLinearGradient(startX, y, startX + itemW, y + itemH);
    if (canAfford) {
      bg2.addColorStop(0, active ? `rgba(${item.color === '#ffd700' ? '76,62,20' : '58,28,92'},0.96)` : `rgba(${item.color === '#ffd700' ? '54,45,24' : '40,20,72'},0.9)`);
      bg2.addColorStop(1, active ? `rgba(${item.color === '#ffd700' ? '46,36,18' : '34,14,64'},0.92)` : 'rgba(18,16,28,0.9)');
    } else {
      bg2.addColorStop(0, 'rgba(36,36,42,0.92)');
      bg2.addColorStop(1, 'rgba(22,22,26,0.92)');
    }
    ctx.fillStyle = bg2; ctx.strokeStyle = canAfford ? (active ? col : '#665') : '#3a3a3a'; ctx.lineWidth = active ? 2 : 1;
    ctx.beginPath(); ctx.roundRect(startX, y, itemW, itemH, 12); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;

    const costBoxX = startX + itemW - rightPad - costBoxW;
    const costBoxY = y + 18;
    const costCol = canAfford ? item.color : '#666';
    ctx.fillStyle = canAfford ? `rgba(${item.color === '#ffd700' ? '100,75,0' : '70,12,120'},0.92)` : 'rgba(40,40,40,0.92)';
    ctx.strokeStyle = canAfford ? costCol : '#444'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(costBoxX, costBoxY, costBoxW, costBoxH, 8); ctx.fill(); ctx.stroke();
    ctx.fillStyle = canAfford ? costCol : '#777'; ctx.font = 'bold 16px Orbitron,Courier New'; ctx.textAlign = 'center';
    ctx.fillText(`✦ ${item.cost}`, costBoxX + costBoxW / 2, costBoxY + 22);
    ctx.fillStyle = canAfford ? '#c8d0e8' : '#666'; ctx.font = 'bold 9px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif';
    ctx.fillText('スターダスト', costBoxX + costBoxW / 2, costBoxY + 40);

    const actW = costBoxW, actH = 32, actX = costBoxX, actY = costBoxY + costBoxH + 8;
    ctx.fillStyle = canAfford ? 'rgba(88,55,140,0.96)' : 'rgba(40,40,46,0.95)';
    ctx.strokeStyle = canAfford ? '#cc88ff' : '#666'; ctx.lineWidth = canAfford ? 2 : 1;
    if (canAfford) { ctx.shadowColor = '#cc88ff'; ctx.shadowBlur = active ? 14 : 7; }
    ctx.beginPath(); ctx.roundRect(actX, actY, actW, actH, 8); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;
    ctx.fillStyle = canAfford ? '#f3e8ff' : '#999'; ctx.font = 'bold 12px Orbitron,Courier New';
    ctx.fillText(canAfford ? '交換する' : '交換不可', actX + actW / 2, actY + 21);

    const titleY = item.tag ? y + 40 : y + 28;
    const descY = titleY + 22;
    const statusY = descY + 16;
    ctx.textAlign = 'left';
    ctx.shadowColor = active && canAfford ? col : 'transparent'; ctx.shadowBlur = active ? 8 : 0;
    ctx.fillStyle = canAfford ? (active ? col : '#ddd') : '#666'; ctx.font = `bold ${active ? 18 : 16}px Orbitron,Courier New`;
    ctx.fillText(item.label, startX + 20, titleY); ctx.shadowBlur = 0;
    ctx.fillStyle = canAfford ? '#aab8d0' : '#5a5a62'; ctx.font = '12px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif';
    ctx.fillText(item.desc, startX + 20, descY);

    const statusTxt = canAfford ? '交換可能' : '交換不可';
    if (!canAfford) {
      const lack = item.cost - game.gachaStardust;
      ctx.fillStyle = '#a89880'; ctx.font = 'bold 11px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif';
      ctx.fillText(`${statusTxt} ・ あと ${lack} で交換可能`, startX + 20, statusY);
    } else {
      ctx.fillStyle = '#7dffc4'; ctx.font = 'bold 11px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif';
      ctx.fillText(statusTxt, startX + 20, statusY);
    }

    if (item.tag) {
      const isReco = item.tag === 'おすすめ';
      const tw = isReco ? 88 : 54, th = 20;
      const tx = costBoxX - tw - 8, ty = y + 12;
      ctx.shadowColor = isReco ? '#ff66cc' : '#ffd700'; ctx.shadowBlur = isReco ? 5 : 4;
      ctx.fillStyle = isReco ? 'rgba(120,20,90,0.95)' : 'rgba(95,72,0,0.95)';
      ctx.strokeStyle = isReco ? '#ff66cc' : '#ffd700'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.roundRect(tx, ty, tw, th, 6); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;
      ctx.fillStyle = isReco ? '#ffd6f3' : '#ffe89a'; ctx.font = 'bold 10px Orbitron,Courier New'; ctx.textAlign = 'center';
      ctx.fillText(item.tag, tx + tw / 2, ty + 14); ctx.textAlign = 'left';
    }
  });

  const buyY = H - 50, buyW = 220, buyH = 40, buyX = (W - buyW) / 2;
  const curIt = STARDUST_SHOP_ITEMS[game.stardustShopCursor];
  const canBuy = curIt && game.gachaStardust >= curIt.cost;
  ctx.fillStyle = canBuy ? 'rgba(60,40,100,0.95)' : 'rgba(28,28,32,0.9)'; ctx.strokeStyle = canBuy ? '#cc88ff' : '#333'; ctx.lineWidth = canBuy ? 2 : 1;
  ctx.beginPath(); ctx.roundRect(buyX, buyY, buyW, buyH, 10); ctx.fill(); ctx.stroke();
  ctx.fillStyle = canBuy ? '#eec' : '#555'; ctx.font = 'bold 13px Orbitron,Courier New'; ctx.textAlign = 'center';
  ctx.fillText('✦ 交換する', W / 2, buyY + 26);

  if (Math.sin(game.frameCount * 0.1) > 0) {
    ctx.fillStyle = '#333'; ctx.font = '11px Orbitron,Courier New'; ctx.textAlign = 'center';
    ctx.fillText('上の枠で選択 → 下の購入 / 戻るはフッター', W / 2, H - 14);
  }
  ctx.textAlign = 'left'; ctx.lineWidth = 1;
}

export function drawStageResult() {
  if (!game.stageResultData) return;
  const d = game.stageResultData;
  game.stageResultTimer++;
  const cx = W / 2, cy = H / 2;

  ctx.fillStyle = 'rgba(0,0,0,0.94)'; ctx.fillRect(0, 0, W, H);

  const rankColors = { S: '#ffdd00', A: '#ff8844', B: '#44aaff', C: '#aaaaaa' };
  const rc = rankColors[d.rank] || '#aaa';
  ctx.save(); ctx.globalAlpha = 0.10;
  ctx.fillStyle = rc;
  ctx.beginPath(); ctx.arc(cx, cy - 30, 240, 0, Math.PI * 2); ctx.fill();
  ctx.restore();

  // タイトル
  const titleAlpha = Math.min(1, game.stageResultTimer / 20);
  ctx.save(); ctx.globalAlpha = titleAlpha;
  ctx.fillStyle = '#aaffaa'; ctx.font = 'bold 20px Orbitron,Courier New';
  ctx.textAlign = 'center'; ctx.shadowColor = '#00ff44'; ctx.shadowBlur = 14;
  ctx.fillText(`STAGE  ${d.stage}  COMPLETE`, cx, cy - 178);
  ctx.shadowBlur = 0; ctx.restore();

  // ランク
  const rankAlpha = Math.min(1, Math.max(0, (game.stageResultTimer - 15) / 20));
  const rankScale = rankAlpha < 1 ? 0.5 + rankAlpha * 0.5 : 1 + Math.sin(Math.max(0, game.stageResultTimer - 35) * 0.3) * 0.04;
  ctx.save(); ctx.globalAlpha = rankAlpha;
  ctx.translate(cx, cy - 55); ctx.scale(rankScale, rankScale);
  ctx.fillStyle = rc; ctx.font = 'bold 110px Orbitron,Courier New';
  ctx.textAlign = 'center'; ctx.shadowColor = rc; ctx.shadowBlur = 36;
  ctx.fillText(d.rank, 0, 40);
  ctx.shadowBlur = 0; ctx.restore();

  const starN = typeof d.starsEarned === 'number' ? d.starsEarned : computeStageStarMedal(d.hits, d.maxCombo);
  const starAlpha = Math.min(1, Math.max(0, (game.stageResultTimer - 22) / 18));
  ctx.save(); ctx.globalAlpha = starAlpha;
  ctx.textAlign = 'center';
  const sx = cx, sy = cy + 42;
  for (let i = 0; i < 3; i++) {
    const on = i < starN;
    ctx.fillStyle = on ? 'rgba(255,220,80,0.95)' : 'rgba(60,65,85,0.5)';
    ctx.shadowColor = on ? 'rgba(255,200,60,0.8)' : 'transparent'; ctx.shadowBlur = on ? 10 : 0;
    ctx.font = 'bold 22px Orbitron,Courier New';
    ctx.fillText(on ? '★' : '☆', sx - 28 + i * 28, sy);
  }
  ctx.shadowBlur = 0;
  if (d.starsSkippedMedal) {
    ctx.fillStyle = '#889'; ctx.font = '10px Orbitron,Courier New';
    ctx.fillText('（コンティニュー使用のため、このクリアは★未更新）', cx, sy + 20);
  }
  ctx.restore();

  // 統計行
  const stats = [
    { l: '撃破数', v: d.kills, c: '#00ff88' },
    { l: '被弾数', v: d.hits, c: d.hits === 0 ? '#ffdd00' : '#ff8888' },
    { l: '最大コンボ', v: d.maxCombo, c: '#44ddff' },
    { l: 'ランクボーナス', v: `+${d.rankBonus} コイン`, c: rc },
  ];
  stats.forEach((s, i) => {
    const rowAlpha = Math.min(1, Math.max(0, (game.stageResultTimer - 30 - i * 8) / 15));
    const bx = cx - 185, by = cy + 82 + i * 50;
    ctx.save(); ctx.globalAlpha = rowAlpha;
    ctx.fillStyle = 'rgba(16,20,30,0.9)'; ctx.beginPath(); ctx.roundRect(bx, by - 26, 370, 42, 8); ctx.fill();
    ctx.strokeStyle = 'rgba(60,80,120,0.7)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.roundRect(bx, by - 26, 370, 42, 8); ctx.stroke();
    ctx.fillStyle = '#8899bb'; ctx.font = 'bold 13px Orbitron,Courier New'; ctx.textAlign = 'left';
    ctx.fillText(s.l, bx + 16, by - 4);
    ctx.fillStyle = s.c; ctx.shadowColor = s.c; ctx.shadowBlur = 8;
    ctx.font = 'bold 18px Orbitron,Courier New'; ctx.textAlign = 'right';
    ctx.fillText(s.v, bx + 354, by - 4); ctx.shadowBlur = 0;
    ctx.restore();
  });

  // ボタン
  if (!Array.isArray(game._stageResultHits)) game._stageResultHits = [];
  game._stageResultHits = [];
  if (game.stageResultTimer > 60) {
    const pulse = 0.75 + Math.sin(game.stageResultTimer * 0.08) * 0.25;
    const bw = 260, bh = 52, gap = 16;
    const b1x = cx - bw - gap / 2, b2x = cx + gap / 2, by = cy + 258;
    game._stageResultHits.push({ type: 'next', x: b1x, y: by, w: bw, h: bh });
    game._stageResultHits.push({ type: 'select', x: b2x, y: by, w: bw, h: bh });

    // 次のステージへ
    ctx.save(); ctx.globalAlpha = pulse;
    ctx.fillStyle = 'rgba(0,50,100,0.95)'; ctx.strokeStyle = '#00ccff'; ctx.lineWidth = 2.5;
    ctx.shadowColor = '#00ccff'; ctx.shadowBlur = 16;
    ctx.beginPath(); ctx.roundRect(b1x, by, bw, bh, 10); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;
    ctx.fillStyle = '#00eeff'; ctx.font = 'bold 16px Orbitron,Courier New'; ctx.textAlign = 'center';
    ctx.fillText('次のステージへ', b1x + bw / 2, by + 33);
    ctx.restore();

    // ステージ選択
    ctx.save(); ctx.globalAlpha = pulse * 0.85;
    ctx.fillStyle = 'rgba(20,22,30,0.95)'; ctx.strokeStyle = '#445566'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.roundRect(b2x, by, bw, bh, 10); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#99aabb'; ctx.font = 'bold 16px Orbitron,Courier New'; ctx.textAlign = 'center';
    ctx.fillText('ステージ選択', b2x + bw / 2, by + 33);
    ctx.restore();
  }
}
