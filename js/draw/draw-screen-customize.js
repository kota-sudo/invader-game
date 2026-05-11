/**
 * Customize / sortie prep screen (restored from initial commit draw-screens.js)
 */
import { game } from '../game/game-store.js';
import { CANVAS_W as W, CANVAS_H as H } from '../game/constants.js';
import {
  CHAR_POOL,
  EQUIP_POOL,
  getStageBattleBackground,
  MISSION_POOL,
  PET_POOL,
  RARITY_COLORS,
  WEAPON_GACHA_POOL,
} from '../game-data.js';
import { estimateSortieWinPct, getCustomizeHeaderLayout, getCustomizeLayout } from '../game/customize-layout.js';
import { drawCustomizeNeonBrackets, fillRoundHex } from './customize-draw-helpers.js';
import { drawShipShape } from './draw-ship-shape.js';
import { drawDragonLordPortrait, isDragonLordChar } from './dragon-lord-portrait.js';

let drawDeps;
let ensureDailyMissions;
let ensureNormalQuestProfile;
let formatStageId;
let getPlanet;
let missionEffectiveProgress;
let pickCharShipShape;
let syncFuel;

const CUSTOMIZE_FONT = "Orbitron, 'Zen Kaku Gothic New', sans-serif";
/** 火星で戦闘背景の読み込みが間に合わないときの互換フォールバック */
const CUSTOMIZE_STAGE_BG_FALLBACK = './assets/customize-stage-mars.png';

export function setCustomizeScreenDrawDeps(deps) {
  drawDeps = deps;
  ({
    ensureDailyMissions,
    ensureNormalQuestProfile,
    formatStageId,
    getPlanet,
    missionEffectiveProgress,
    pickCharShipShape,
    syncFuel,
  } = deps);
}

export function drawCustomizeScreen() {
  const ctx = drawDeps.ctx;
  try { ensureDailyMissions(); ensureNormalQuestProfile(); } catch (e) { console.error(e); }
  if (!(game.missionClaimedSet instanceof Set)) game.missionClaimedSet = new Set();
  if (!(game.questClaimedIds instanceof Set)) game.questClaimedIds = new Set();

  const t = Date.now() / 1000;
  const L = getCustomizeLayout();
  const headerL = getCustomizeHeaderLayout();
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
        ctx.globalAlpha = 0.01 + 0.008 * Math.sin(laneT + li * 1.4);
        const lg = ctx.createLinearGradient(lx, 0, lx + 2, H);
        lg.addColorStop(0, 'rgba(255,80,40,0)');
        lg.addColorStop(0.5, 'rgba(255,120,60,0.12)');
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
      vg.addColorStop(0.5, lowFx ? 'rgba(255,140,70,0.02)' : 'rgba(255,140,70,0.035)');
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

    ctx.shadowColor = 'rgba(0,0,0,0.65)'; ctx.shadowBlur = 0;
    ctx.font = "900 17px Orbitron, 'Zen Kaku Gothic New', sans-serif"; ctx.textAlign = 'left';
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(0,10,24,0.92)';
    ctx.strokeText('出撃準備', MX, 22);
    ctx.fillStyle = '#fff4e8';
    ctx.fillText('出撃準備', MX, 22);
    ctx.shadowBlur = 0;

    syncFuel();
    const drawResourceChip = (x, w, label, value, col, glowCol) => {
      ctx.fillStyle = 'rgba(7,14,28,0.72)';
      ctx.strokeStyle = 'rgba(75,130,200,0.24)';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.roundRect(x, 7, w, 22, 5); ctx.fill(); ctx.stroke();
      ctx.fillStyle = col;
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.font = `800 11px ${CUSTOMIZE_FONT}`;
      ctx.textAlign = 'left';
      ctx.fillText(label, x + 7, 22);
      ctx.textAlign = 'right';
      ctx.fillText(value, x + w - 7, 22);
      ctx.shadowBlur = 0;
    };
    drawResourceChip(headerL.resources.fuel.x, headerL.resources.fuel.w, '⛽', `${Math.max(0, Math.floor(game.fuel || 0))}/${drawDeps.FUEL_CAP}`, '#9ed8ff', '#66ccff');
    drawResourceChip(headerL.resources.coins.x, headerL.resources.coins.w, '●', game.coins.toLocaleString(), '#ffd700', '#ffd700');
    drawResourceChip(headerL.resources.gems.x, headerL.resources.gems.w, '💎', game.gems.toLocaleString(), '#bbddff', '#aaddff');

    const plusHov = game.hoveredBtn && game.hoveredBtn.id === 'ui_gem_plus';
    ctx.fillStyle = plusHov ? 'rgba(80,160,255,0.5)' : 'rgba(80,160,255,0.25)';
    ctx.beginPath(); ctx.roundRect(headerL.gemPlus.x, headerL.gemPlus.y, headerL.gemPlus.w, headerL.gemPlus.h, 4); ctx.fill();
    ctx.strokeStyle = plusHov ? '#88ccff' : '#44aaff'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.roundRect(headerL.gemPlus.x, headerL.gemPlus.y, headerL.gemPlus.w, headerL.gemPlus.h, 4); ctx.stroke();
    ctx.fillStyle = '#b8e4ff'; ctx.shadowColor = 'rgba(0,0,0,0.35)'; ctx.shadowBlur = 1;
    ctx.font = `800 14px ${CUSTOMIZE_FONT}`; ctx.textAlign = 'center';
    ctx.fillText('+', headerL.gemPlus.x + headerL.gemPlus.w / 2, headerL.gemPlus.y + 14); ctx.shadowBlur = 0;

    const setHov = game.hoveredBtn && game.hoveredBtn.id === 'ui_hdr_set';
    ctx.fillStyle = setHov ? 'rgba(50,90,160,0.48)' : 'rgba(30,50,90,0.38)';
    ctx.strokeStyle = setHov ? 'rgba(120,180,255,0.72)' : 'rgba(70,110,170,0.46)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(headerL.settings.x, headerL.settings.y, headerL.settings.w, headerL.settings.h, 7); ctx.fill(); ctx.stroke();
    ctx.fillStyle = setHov ? '#eaf4ff' : 'rgba(200,220,255,0.88)'; ctx.font = `800 16px ${CUSTOMIZE_FONT}`; ctx.textAlign = 'center';
    ctx.fillText('⚙', headerL.settings.x + headerL.settings.w / 2, headerL.settings.y + 19);

    const _missHasPending = Array.isArray(game.activeMissions) && game.activeMissions.some(slot => {
      const mDef = MISSION_POOL.find(m => m.id === slot.missionId);
      if (!mDef) return false;
      try { return mDef.check(missionEffectiveProgress(slot)); } catch (e) { return false; }
    });
    const _gachaAlert = game.gachaPityCount >= 60;
    const topTabs = [
      {
        id: 'ui_hdr_notif', icon: '▣', label: '受け取り', sub: '', col: '#55ddff', cur: -1,
        badge: (Array.isArray(game.inbox) ? game.inbox.filter(x => !x.claimed).length : 0)
      },
      { id: 'ui_hdr_event', icon: '♜', label: 'イベント', sub: '', col: '#ff88cc', cur: -2, badge: 0 },
      { id: 'ui_gach', icon: '▤', label: 'ガチャ', sub: '', col: '#ffcc44', cur: 1, badge: _gachaAlert ? 1 : 0 },
      { id: 'ui_shop', icon: '▲', label: '強化', sub: '', col: '#ff9955', cur: 2, badge: 0 },
      { id: 'ui_miss', icon: '▥', label: 'ミッション', sub: '', col: '#66ccff', cur: 3, badge: _missHasPending ? 1 : 0 },
      { id: 'ui_boss', icon: '☠', label: 'ボス戦', sub: '', col: '#ff7744', cur: 5, badge: 0 },
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
        ctx.strokeStyle = '#ffdd55'; ctx.lineWidth = 2.2; ctx.shadowColor = 'rgba(255,204,51,0.45)'; ctx.shadowBlur = lowFx ? 2 : 5;
        ctx.beginPath(); ctx.moveTo(tx + 6, ty + th - 2); ctx.lineTo(tx + tw - 6, ty + th - 2); ctx.stroke(); ctx.shadowBlur = 0;
      } else if (hov) {
        ctx.strokeStyle = 'rgba(120,200,255,0.55)'; ctx.lineWidth = 1.3;
        ctx.strokeRect(tx + 4, ty + 4, tw - 8, th - 8);
      }
      ctx.globalAlpha = active ? 1 : (hov ? 0.82 : 0.58);
      const tabDim = 'rgba(188,206,232,0.88)';
      ctx.fillStyle = active ? '#fffce8' : (hov ? '#f4f8ff' : tabDim);
      if (active && !lowFx) { ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; }
      const tabText = tab.label;
      ctx.font = `900 13px ${CUSTOMIZE_FONT}`; ctx.textAlign = 'right';
      ctx.fillText(tab.icon, tx + tw / 2 - 27, ty + 24);
      ctx.font = `900 ${tabText.length > 4 ? 11 : 12}px ${CUSTOMIZE_FONT}`; ctx.textAlign = 'left';
      ctx.fillText(tabText, tx + tw / 2 - 18, ty + 23);
      ctx.shadowBlur = 0;
      if (active && tab.id === 'ui_gach') {
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#ffee66'; ctx.shadowColor = 'rgba(0,0,0,0.35)'; ctx.shadowBlur = 2;
        ctx.font = `800 15px ${CUSTOMIZE_FONT}`;
        ctx.fillText('★', tx + tw - 12, ty + 20);
        ctx.shadowBlur = 0;
      }
      if (tab.badge > 0) {
        ctx.fillStyle = '#ff2244'; ctx.shadowColor = '#ff0022'; ctx.shadowBlur = 5;
        ctx.beginPath(); ctx.arc(tx + tw - 10, ty + 8, 5.5, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
        ctx.fillStyle = '#fff'; ctx.font = `800 8px ${CUSTOMIZE_FONT}`;
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
      ctx.fillStyle = 'rgba(235,245,255,0.72)'; ctx.font = `800 11px ${CUSTOMIZE_FONT}`; ctx.textAlign = 'left';
      ctx.fillText('装備', MX + 12, eY + 15);
      const expHov = game.hoveredBtn && game.hoveredBtn.id === 'ui_equip_expand';
      ctx.fillStyle = expHov ? 'rgba(60,90,140,0.5)' : 'rgba(30,45,80,0.4)';
      ctx.strokeStyle = expHov ? 'rgba(120,180,255,0.55)' : 'rgba(70,100,150,0.35)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.roundRect(MX + CW - 106, eY + 3, 94, 18, 6); ctx.fill(); ctx.stroke();
      ctx.fillStyle = expHov ? '#eef6ff' : 'rgba(215,232,255,0.86)'; ctx.font = `800 10px ${CUSTOMIZE_FONT}`; ctx.textAlign = 'center';
      ctx.fillText('▸ 詳細', MX + CW - 59, eY + 16);
      const icx = MX + CW / 2, icy = eY + eH * 0.38;
      ctx.save(); ctx.globalAlpha = 0.5;
      ctx.strokeStyle = 'rgba(140,190,255,0.5)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(icx, icy - 18); ctx.lineTo(icx + 16, icy - 4); ctx.lineTo(icx + 16, icy + 12);
      ctx.lineTo(icx - 16, icy + 12); ctx.lineTo(icx - 16, icy - 4); ctx.closePath(); ctx.stroke();
      ctx.fillStyle = 'rgba(80,120,180,0.25)'; ctx.fill();
      ctx.fillStyle = 'rgba(180,215,255,0.48)'; ctx.font = `18px ${CUSTOMIZE_FONT}`; ctx.textAlign = 'center';
      ctx.fillText('◇', icx, icy + 6);
      ctx.restore();
      ctx.fillStyle = 'rgba(220,235,255,0.72)'; ctx.font = `800 10px ${CUSTOMIZE_FONT}`; ctx.textAlign = 'center';
      ctx.fillText('タップで詳細 >', MX + CW / 2, eY + eH * 0.72);
    } else {
      ctx.fillStyle = 'rgba(0,185,255,0.06)';
      ctx.beginPath(); ctx.roundRect(MX + 1, eY + 1, CW - 2, 26, 11); ctx.fill();
      ctx.fillStyle = 'rgba(120,210,255,0.95)'; ctx.font = `900 10px ${CUSTOMIZE_FONT}`; ctx.textAlign = 'left';
      ctx.fillText('出撃ユニット', MX + 14, eY + 17);
      const expHov = game.hoveredBtn && game.hoveredBtn.id === 'ui_equip_expand';
      ctx.fillStyle = expHov ? 'rgba(60,90,140,0.55)' : 'rgba(30,45,80,0.45)';
      ctx.strokeStyle = expHov ? 'rgba(120,180,255,0.65)' : 'rgba(70,100,150,0.4)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.roundRect(MX + CW - 106, eY + 3, 94, 18, 6); ctx.fill(); ctx.stroke();
      ctx.fillStyle = expHov ? '#eef6ff' : 'rgba(215,232,255,0.86)'; ctx.font = `800 10px ${CUSTOMIZE_FONT}`; ctx.textAlign = 'center';
      ctx.fillText('▾ 折りたたむ', MX + CW - 59, eY + 16);
      ctx.fillStyle = 'rgba(225,242,255,0.88)'; ctx.font = `800 11px ${CUSTOMIZE_FONT}`; ctx.textAlign = 'right';
      ctx.fillText('タップで編成 ▶', MX + CW - 118, eY + 17);

      const r1Y = eY + 30;
      const shipCardX = MX + 14, shipCardY = r1Y + 4, shipCardS = 78;
      const shipIcX = shipCardX + shipCardS / 2, shipIcY = shipCardY + shipCardS / 2;
      const shipCardG = ctx.createLinearGradient(shipCardX, shipCardY, shipCardX + shipCardS, shipCardY + shipCardS);
      shipCardG.addColorStop(0, charCol + '44');
      shipCardG.addColorStop(0.52, 'rgba(12,12,24,0.96)');
      shipCardG.addColorStop(1, 'rgba(255,80,120,0.18)');
      ctx.fillStyle = shipCardG;
      ctx.strokeStyle = charCol + 'aa';
      ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.roundRect(shipCardX, shipCardY, shipCardS, shipCardS, 7); ctx.fill(); ctx.stroke();
      if (!lowFx) {
        ctx.strokeStyle = 'rgba(255,255,255,0.13)';
        ctx.beginPath(); ctx.moveTo(shipCardX + 8, shipCardY + 8); ctx.lineTo(shipCardX + shipCardS - 8, shipCardY + shipCardS - 8); ctx.stroke();
      }
      ctx.save(); ctx.translate(shipIcX, shipIcY);
      const photo = isDragonLordChar(char)
        && drawDragonLordPortrait(ctx, 0, 0, 62, 52, {
          glowColor: charCol,
          frameCount: game.frameCount,
          tier: 'customize',
          lowFx,
        });
      if (!photo) {
        const shipGlow = (char.rarity === 'LR' && !lowFx) ? 38 : (char.rarity === 'LR' ? 22 : 18);
        ctx.fillStyle = charCol; ctx.shadowColor = charCol; ctx.shadowBlur = shipGlow;
        drawShipShape(ctx, -30, -20, 60, 40, pickCharShipShape(char), charCol, char.rarity);
        ctx.shadowBlur = 0;
      }
      ctx.restore();
      ctx.fillStyle = rCol + '22'; ctx.strokeStyle = rCol + '88'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.roundRect(MX + 104, r1Y + 2, 34, 16, 4); ctx.fill(); ctx.stroke();
      ctx.fillStyle = rCol; ctx.font = `900 10px ${CUSTOMIZE_FONT}`; ctx.textAlign = 'center';
      ctx.fillText(char.rarity, MX + 121, r1Y + 13);
      const equipPanelX = MX + Math.floor(CW * 0.64);
      const equipPanelW = CW - (equipPanelX - MX) - 14;
      const sbx = MX + 276, sbw = Math.max(190, equipPanelX - sbx - 58);
      ctx.fillStyle = '#fffdf5'; ctx.font = `900 15px ${CUSTOMIZE_FONT}`; ctx.textAlign = 'left';
      ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0;
      ctx.fillText(char.label, MX + 148, r1Y + 15); ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(190,225,255,0.96)'; ctx.font = `900 10px ${CUSTOMIZE_FONT}`;
      ctx.fillText('TYPE : ATTACKER', MX + 148, r1Y + 32);
      ctx.fillStyle = 'rgba(8,12,24,0.84)';
      ctx.strokeStyle = 'rgba(120,190,255,0.34)';
      ctx.beginPath(); ctx.roundRect(MX + 112, eY + eH - 54, 116, 24, 4); ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(220,235,255,0.92)'; ctx.font = `900 10px ${CUSTOMIZE_FONT}`; ctx.textAlign = 'center';
      ctx.fillText('機体詳細  ›', MX + 170, eY + eH - 38);
      ctx.strokeStyle = 'rgba(120,190,255,0.22)';
      ctx.beginPath(); ctx.moveTo(MX + 238, eY + 36); ctx.lineTo(MX + 238, eY + eH - 18); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(equipPanelX - 16, eY + 36); ctx.lineTo(equipPanelX - 16, eY + eH - 18); ctx.stroke();

      let hp2 = char.hp, atk2 = char.atk, def2 = char.def;
      const eids = Array.isArray(game.playerLoadout?.equip) ? game.playerLoadout.equip : [];
      try {
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
        ctx.fillStyle = s.empty ? '#9aa7bb' : '#f4fbff'; ctx.font = `900 11px ${CUSTOMIZE_FONT}`; ctx.textAlign = 'left';
        ctx.fillText(s.empty ? `${s.l}  なし` : `${s.l}  ${s.v}`, sbx, sby + 8);
        ctx.fillStyle = '#06090f'; ctx.fillRect(sbx, sby + 11, sbw, 8);
        if (!s.empty) {
          const sg = ctx.createLinearGradient(sbx, 0, sbx + sbw, 0);
          sg.addColorStop(0, s.c + '55'); sg.addColorStop(1, s.c);
          ctx.fillStyle = sg; ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0;
          ctx.fillRect(sbx, sby + 11, Math.max(barMinW, sbw * ratio), 8); ctx.shadowBlur = 0;
          ctx.fillStyle = 'rgba(0,0,0,0.62)';
          ctx.font = `900 10px ${CUSTOMIZE_FONT}`; ctx.textAlign = 'right';
          ctx.fillText(String(s.v), sbx + sbw - 2, sby + 18);
        } else {
          ctx.fillStyle = 'rgba(80,90,110,0.45)';
          ctx.fillRect(sbx, sby + 11, barMinW, 8);
        }
      });

      ctx.fillStyle = 'rgba(4,8,18,0.54)';
      ctx.strokeStyle = 'rgba(120,190,255,0.18)';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.roundRect(equipPanelX, eY + 34, equipPanelW, eH - 54, 8); ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(120,190,255,0.86)'; ctx.font = `900 10px ${CUSTOMIZE_FONT}`; ctx.textAlign = 'left';
      ctx.fillText('装備サマリー', equipPanelX + 10, eY + 50);
      const slotY = eY + 62;
      const slotSize = 38;
      for (let si = 0; si < 4; si++) {
        const sx = equipPanelX + 10 + si * 48;
        const eid = eids[si];
        const eq = EQUIP_POOL.find(e => e.id === eid);
        const owned = eid && game.gachaInventory?.[eid];
        const sc = owned && eq ? (eq.color || '#66ccff') : 'rgba(80,95,125,0.7)';
        ctx.fillStyle = owned ? 'rgba(8,12,28,0.84)' : 'rgba(6,8,18,0.62)';
        ctx.strokeStyle = owned ? `${sc}cc` : 'rgba(70,90,130,0.32)';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.roundRect(sx, slotY, slotSize, slotSize, 5); ctx.fill(); ctx.stroke();
        ctx.fillStyle = owned ? sc : 'rgba(90,105,135,0.75)';
        ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0;
        ctx.font = `900 18px ${CUSTOMIZE_FONT}`; ctx.textAlign = 'center';
        ctx.fillText(owned ? '◆' : '◇', sx + slotSize / 2, slotY + 25); ctx.shadowBlur = 0;
        ctx.font = `900 10px ${CUSTOMIZE_FONT}`;
        ctx.fillText(owned && eq ? eq.rarity : '空き', sx + slotSize / 2, slotY + 36);
      }
      ctx.fillStyle = 'rgba(18,12,20,0.48)';
      ctx.strokeStyle = 'rgba(255,90,55,0.12)';
      const setFxY = eY + eH - 36;
      ctx.beginPath(); ctx.roundRect(equipPanelX + 14, setFxY, equipPanelW - 28, 18, 5); ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(200,225,255,0.95)'; ctx.font = `900 10px ${CUSTOMIZE_FONT}`; ctx.textAlign = 'left';
      ctx.fillText('セット効果', equipPanelX + 24, setFxY + 13);
      ctx.fillStyle = 'rgba(255,150,95,0.98)'; ctx.textAlign = 'right';
      ctx.fillText(eids.filter(Boolean).length ? '攻撃 +15%' : 'なし', equipPanelX + equipPanelW - 24, setFxY + 13);

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
    const stageBandH = Math.max(118, stageSelY - infoY - 8);
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(MX + 1, infoY + 1, CW - 2, stageBandH, 10);
    const battleBgPath = getStageBattleBackground(game.startStage);
    let stageBgImg = battleBgPath && drawDeps.getImage ? drawDeps.getImage(battleBgPath) : null;
    if (
      (!stageBgImg || !stageBgImg.complete || stageBgImg.naturalWidth <= 0)
      && pStage.name === 'MARS'
      && drawDeps.getImage
    ) {
      stageBgImg = drawDeps.getImage(CUSTOMIZE_STAGE_BG_FALLBACK);
    }
    const hasStageBg = stageBgImg && stageBgImg.complete && stageBgImg.naturalWidth > 0;
    if (hasStageBg) {
      const iw = stageBgImg.naturalWidth;
      const ih = stageBgImg.naturalHeight;
      const targetAspect = CW / stageBandH;
      let sx = 0, sy = 0, sw = iw, sh = ih;
      if (iw / ih > targetAspect) {
        sw = ih * targetAspect;
        sx = (iw - sw) / 2;
      } else {
        sh = iw / targetAspect;
        sy = Math.max(0, Math.min(ih - sh, ih * 0.04));
      }
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(MX + 1, infoY + 1, CW - 2, stageBandH, 10);
      ctx.clip();
      ctx.globalAlpha = 0.96;
      ctx.drawImage(stageBgImg, sx, sy, sw, sh, MX, infoY, CW, stageBandH);
      ctx.globalAlpha = 1;
      const bgShade = ctx.createLinearGradient(0, infoY, 0, infoY + stageBandH);
      bgShade.addColorStop(0, 'rgba(0,0,0,0.16)');
      bgShade.addColorStop(0.35, 'rgba(0,0,0,0.08)');
      bgShade.addColorStop(0.68, 'rgba(2,4,12,0.42)');
      bgShade.addColorStop(1, 'rgba(3,6,18,0.76)');
      ctx.fillStyle = bgShade;
      ctx.fillRect(MX, infoY, CW, stageBandH);
      ctx.restore();
    }
    if (!hasStageBg) {
      ctx.fillStyle = pStage.bg || '#040208';
      ctx.fillRect(MX, infoY, CW, stageBandH);
      const skyG = ctx.createLinearGradient(MX, infoY, MX + CW, infoY + stageBandH);
      skyG.addColorStop(0, 'rgba(0,0,0,0.25)');
      skyG.addColorStop(0.45, pStage.nebula || 'rgba(40,20,10,0.35)');
      skyG.addColorStop(1, 'rgba(0,0,0,0.72)');
      ctx.fillStyle = skyG; ctx.fillRect(MX, infoY, CW, stageBandH);
      const mBase = infoY + stageBandH - 2;
      ctx.fillStyle = pStage.ground || '#331100';
      ctx.globalAlpha = 0.92;
      ctx.beginPath(); ctx.moveTo(MX - 4, mBase + 8);
      for (let mi = 0; mi <= 14; mi++) {
        const px = MX - 6 + (mi / 14) * (CW + 12);
        const ph = 10 + ((mi * 19) % 26) + (mi % 4) * 5;
        ctx.lineTo(px, mBase + 8 - ph);
      }
      ctx.lineTo(MX + CW + 6, mBase + 8); ctx.lineTo(MX + CW + 6, mBase + 40); ctx.lineTo(MX - 4, mBase + 40); ctx.closePath(); ctx.fill();
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = pStage.accent || '#aa2200';
      ctx.beginPath(); ctx.moveTo(MX - 8, mBase + 4);
      for (let mi = 0; mi <= 10; mi++) {
        const px = MX - 14 + (mi / 10) * (CW + 28);
        const ph = 5 + ((mi * 13) % 12);
        ctx.lineTo(px, mBase + 4 - ph);
      }
      ctx.lineTo(MX + CW + 18, mBase + 4); ctx.lineTo(MX + CW + 18, mBase + 36); ctx.lineTo(MX - 8, mBase + 36); ctx.closePath(); ctx.fill();
      ctx.globalAlpha = 1;
    }
    if (!lowFx) {
      const emT = t * 38;
      const emberTop = infoY + 28;
      for (let ei = 0; ei < 32; ei++) {
        const ex = MX + ((ei * 131 + emT * 2.8) % CW);
        const ey = emberTop + ((stageBandH - 36) - ((ei * 47 + emT * 11) % (stageBandH - 36)));
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
      rg.addColorStop(0, `rgba(255,50,35,${0.1 * stagePulse})`);
      rg.addColorStop(0.45, `rgba(180,25,18,${0.05 * stagePulse})`);
      rg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = rg; ctx.fillRect(MX, infoY, CW, Math.min(128, infoH));
    }
    ctx.textAlign = 'center';
    const stageTitleY = heroY + 40;
    const stageFs = Math.round(26 * 1.48);
    ctx.font = `900 ${stageFs}px ${CUSTOMIZE_FONT}`;
    const stTxt = `STAGE  ${formatStageId(game.startStage)}`;
    ctx.lineWidth = lowFx ? 2 : 3.2;
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.strokeText(stTxt, W / 2, stageTitleY);
    ctx.fillStyle = '#fff7f2';
    ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0;
    ctx.fillText(stTxt, W / 2, stageTitleY); ctx.shadowBlur = 0;
    ctx.fillStyle = pStage.accent; ctx.font = `900 12px ${CUSTOMIZE_FONT}`;
    ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0;
    ctx.fillText(`${pStage.kanji}  ${pStage.name}`, W / 2, stageTitleY + 14); ctx.shadowBlur = 0;
    ctx.save();
    ctx.globalAlpha = 0.88;
    const m1 = 'ミッション';
    const m2 = 'ノーダメージ / 2回攻撃 / 1ターン';
    ctx.font = `900 10px ${CUSTOMIZE_FONT}`;
    const mw1 = ctx.measureText(m1).width;
    ctx.font = `900 12px ${CUSTOMIZE_FONT}`;
    const mw = Math.max(mw1, ctx.measureText(m2).width);
    const padX = 14;
    const pillBgY = stageTitleY + 18;
    const pillBgH = 36;
    ctx.fillStyle = 'rgba(4,8,18,0.58)';
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(W / 2 - mw / 2 - padX, pillBgY, mw + padX * 2, pillBgH, 8);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(210,220,235,0.92)'; ctx.font = `900 10px ${CUSTOMIZE_FONT}`;
    ctx.fillText(m1, W / 2, stageTitleY + 30);
    ctx.fillStyle = 'rgba(248,250,255,0.98)'; ctx.font = `900 12px ${CUSTOMIZE_FONT}`;
    ctx.fillText(m2, W / 2, stageTitleY + 44);
    ctx.restore();

    const summaryY = Math.max(infoY + 112, stageSelY - 72);
    const summaryH = 30;
    const summaryW = Math.min(560, CW - 180);
    const summaryX = MX + (CW - summaryW) / 2;
    const enemyPower = recPower;
    const statusText = tierOk ? '推奨OK' : (tierWarn ? '注意' : '危険');
    const statusColor = tierOk ? '#66ffcc' : (tierWarn ? '#ffdd88' : '#ff9988');
    ctx.fillStyle = tierOk ? 'rgba(3,28,16,0.82)' : (tierWarn ? 'rgba(32,24,8,0.84)' : 'rgba(34,8,10,0.84)');
    ctx.strokeStyle = tierOk ? 'rgba(60,255,150,0.56)' : (tierWarn ? 'rgba(255,200,80,0.5)' : 'rgba(255,100,100,0.5)');
    ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.roundRect(summaryX, summaryY + 2, summaryW, summaryH, 8); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = tierOk ? 'rgba(120,255,190,0.18)' : 'rgba(255,220,160,0.16)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(summaryX + summaryW / 3, summaryY + 9);
    ctx.lineTo(summaryX + summaryW / 3, summaryY + summaryH - 2);
    ctx.moveTo(summaryX + summaryW * 2 / 3, summaryY + 9);
    ctx.lineTo(summaryX + summaryW * 2 / 3, summaryY + summaryH - 2);
    ctx.stroke();
    ctx.fillStyle = statusColor; ctx.font = `900 13px ${CUSTOMIZE_FONT}`; ctx.textAlign = 'center';
    ctx.fillText(statusText, summaryX + summaryW / 6, summaryY + 22);
    ctx.fillStyle = statusColor; ctx.font = `900 15px ${CUSTOMIZE_FONT}`;
    ctx.fillText(`勝率 ${winPct}%`, summaryX + summaryW / 2, summaryY + 22);
    ctx.fillStyle = 'rgba(190,210,230,0.94)'; ctx.font = `900 11px ${CUSTOMIZE_FONT}`;
    ctx.fillText(`戦力 ${curPower} / ${enemyPower}`, summaryX + summaryW * 5 / 6, summaryY + 22);

    const rewardY = stageSelY - 26;
    ctx.fillStyle = 'rgba(4,6,14,0.78)'; ctx.strokeStyle = 'rgba(255,110,70,0.18)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(MX + 10, rewardY, CW - 20, 22, 5); ctx.fill(); ctx.stroke();
    ctx.font = `900 11px ${CUSTOMIZE_FONT}`; ctx.textAlign = 'left';
    const rewardTextY = rewardY + 15;
    const rewardStartX = MX + 250;
    ctx.fillStyle = 'rgba(150,210,255,0.98)';
    ctx.fillText(`消費 🧃${drawDeps.FUEL_COST_PER_RUN}`, rewardStartX, rewardTextY);
    ctx.fillStyle = 'rgba(255,105,70,0.92)';
    ctx.fillText('報酬', rewardStartX + 112, rewardTextY);
    ctx.fillStyle = '#ffd75a';
    ctx.fillText('●120', rewardStartX + 164, rewardTextY);
    ctx.fillStyle = 'rgba(220,235,255,0.96)';
    ctx.fillText('EXP60', rewardStartX + 224, rewardTextY);
    ctx.fillStyle = '#88ddff';
    ctx.fillText('初回 ◆50', rewardStartX + 292, rewardTextY);

    const stageRowHov = game.hoveredBtn && game.hoveredBtn.id === 'ui_stage_sel';
    ctx.fillStyle = stageRowHov ? 'rgba(28,68,158,0.56)' : 'rgba(10,20,48,0.62)';
    ctx.strokeStyle = stageRowHov ? 'rgba(80,160,255,0.54)' : 'rgba(44,90,190,0.2)'; ctx.lineWidth = 1;
    if (stageRowHov) { ctx.shadowColor = '#4488ff'; ctx.shadowBlur = 6; }
    ctx.beginPath(); ctx.roundRect(MX + 8, stageSelY, CW - 16, stageSelH, 8); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;
    drawCustomizeNeonBrackets(ctx, MX + 8, stageSelY, CW - 16, stageSelH, 8, 10, 'rgba(100,200,255,0.22)', 0.45);
    ctx.fillStyle = 'rgba(235,244,255,0.98)'; ctx.font = `900 12px ${CUSTOMIZE_FONT}`; ctx.textAlign = 'left';
    ctx.fillText(`出撃ステージ  ${formatStageId(game.startStage)}`, MX + 18, stageSelY + 24);
    const chgW = 124, chgX = MX + CW - 12 - chgW;
    ctx.fillStyle = stageRowHov ? 'rgba(40,110,255,0.42)' : 'rgba(20,55,160,0.28)';
    ctx.strokeStyle = stageRowHov ? 'rgba(90,170,255,0.75)' : 'rgba(50,110,220,0.4)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(chgX, stageSelY + 7, chgW, 22, 5); ctx.fill(); ctx.stroke();
    ctx.fillStyle = stageRowHov ? '#ffffff' : 'rgba(220,235,255,0.98)'; ctx.font = `900 10px ${CUSTOMIZE_FONT}`; ctx.textAlign = 'center';
    ctx.fillText('ステージ変更 >', chgX + chgW / 2, stageSelY + 22);
  } catch (e) { console.error('[drawCustomize:info]', e); }

  // ── 出撃ボタン（全幅・高さ大・外周グロー・1.5秒パルス＋微スケール）──────
  try {
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1;
    const startPulse = 0.5 + 0.5 * Math.sin((t * Math.PI * 2) / 1.5);
    const redFlash = 0.5 + 0.5 * Math.sin(t * 10);
    const startFocused = game.customizeCursor === 4;
    const strHov = game.hoveredBtn && game.hoveredBtn.id === 'ui_strt';
    const btnCx = bMX + bCW / 2, btnCy = startY2 + startH2 / 2 + 8;
    const idlePulse = 1 + 0.015 * Math.sin((t * Math.PI * 2) / 1.5);

    const btnW = Math.min(420, bCW * 0.56);
    const btnH = 68;
    const btnX = btnCx - btnW / 2;
    const btnY = btnCy - btnH / 2;
    const galaxyHov = game.hoveredBtn && game.hoveredBtn.id === 'ui_galaxy_map';
    const galW = 136, galH = 34;
    const galX = Math.max(bMX + 2, btnX - galW - 48);
    const galY = btnCy - galH / 2 + 10;
    ctx.fillStyle = galaxyHov ? 'rgba(42,92,150,0.58)' : 'rgba(12,28,58,0.72)';
    ctx.strokeStyle = galaxyHov ? 'rgba(145,220,255,0.78)' : 'rgba(90,165,230,0.42)';
    ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.roundRect(galX, galY, galW, galH, 8); ctx.fill(); ctx.stroke();
    ctx.fillStyle = galaxyHov ? '#ffffff' : 'rgba(200,230,255,0.94)';
    ctx.font = `900 10px ${CUSTOMIZE_FONT}`; ctx.textAlign = 'center';
    ctx.fillText('◀ 銀河マップへ', galX + galW / 2, galY + 22);
    const sideCut = 28;
    const drawDeployPanel = (pad = 0) => {
      ctx.beginPath();
      ctx.moveTo(btnX + sideCut - pad, btnY - pad);
      ctx.lineTo(btnX + btnW - sideCut + pad, btnY - pad);
      ctx.lineTo(btnX + btnW + pad, btnY + btnH / 2);
      ctx.lineTo(btnX + btnW - sideCut + pad, btnY + btnH + pad);
      ctx.lineTo(btnX + sideCut - pad, btnY + btnH + pad);
      ctx.lineTo(btnX - pad, btnY + btnH / 2);
      ctx.closePath();
    };
    withTap('ui_strt', btnX, btnY, btnW, btnH, () => {
      ctx.save();
      ctx.translate(btnCx, btnCy); ctx.scale(idlePulse, idlePulse); ctx.translate(-btnCx, -btnCy);
      drawDeployPanel(0);
      const rg = ctx.createLinearGradient(btnX, btnY, btnX + btnW, btnY + btnH);
      rg.addColorStop(0, shortageSevere ? '#331010' : '#691508');
      rg.addColorStop(0.5, shortageSevere ? '#663322' : '#ff3a12');
      rg.addColorStop(1, shortageSevere ? '#190505' : '#7a1808');
      ctx.fillStyle = rg;
      const glowAmt = (lowFx ? 10 : 26) + (14 * startPulse) + (strHov ? 14 : 0);
      ctx.shadowColor = '#ff4e00'; ctx.shadowBlur = glowAmt;
      ctx.fill(); ctx.shadowBlur = 0;
      ctx.strokeStyle = 'rgba(255,245,230,0.95)'; ctx.lineWidth = 2;
      drawDeployPanel(0); ctx.stroke();
      ctx.strokeStyle = `rgba(255,80,40,${0.45 + 0.25 * startPulse})`; ctx.lineWidth = 3;
      ctx.shadowColor = 'rgba(255,40,20,0.65)'; ctx.shadowBlur = lowFx ? 4 : 14 + 8 * startPulse;
      drawDeployPanel(4); ctx.stroke(); ctx.shadowBlur = 0;
      ctx.restore();
    });
    const showDeployPill = !tierOk;
    const pillMsg = !sortieOk ? '危険！' : '注意';
    const pillW = !sortieOk ? 74 : 56;
    const pillH = 21;
    const pillX = btnCx - pillW / 2;
    const pillY = btnY - pillH - 14;
    if (showDeployPill) {
      ctx.save();
      const pillDanger = !sortieOk;
      ctx.fillStyle = pillDanger ? 'rgba(36,8,10,0.96)' : 'rgba(36,28,8,0.96)';
      ctx.strokeStyle = pillDanger ? 'rgba(255,110,110,0.92)' : 'rgba(255,200,90,0.92)';
      ctx.lineWidth = 1.5;
      ctx.shadowColor = pillDanger ? '#ff3333' : '#ffcc44'; ctx.shadowBlur = lowFx ? 3 : 6;
      ctx.beginPath(); ctx.roundRect(pillX, pillY, pillW, pillH, 10); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;
      ctx.fillStyle = pillDanger ? '#ffe0e0' : '#fff4d8'; ctx.font = `900 10px ${CUSTOMIZE_FONT}`; ctx.textAlign = 'center';
      ctx.fillText(pillMsg, btnCx, pillY + 15);
      ctx.restore();
    }
    ctx.fillStyle = '#ffffff'; ctx.font = `900 26px ${CUSTOMIZE_FONT}`; ctx.textAlign = 'center';
    ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0;
    ctx.fillText('出 撃', btnCx, btnCy - 4); ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255,230,205,0.96)'; ctx.font = `900 10px ${CUSTOMIZE_FONT}`;
    ctx.fillText('タップして開始', btnCx, btnCy + 17);
    ctx.textAlign = 'left';
  } catch (e) { console.error('[drawCustomize:start]', e); }
}

