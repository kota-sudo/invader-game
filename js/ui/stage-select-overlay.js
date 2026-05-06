/**
 * ステージ選択 — HTML/CSS/SVG オーバーレイ（SF レトロ HUD）
 */
import { game } from '../game/game-store.js';
import { CANVAS_H } from '../game/constants.js';
import {
  drawEnemyPreviewIcon,
  ENEMY_PREVIEW_COLORS,
  ENEMY_PREVIEW_LABELS,
  getPlanet,
  getStageEnemyTypes,
  getWorldInfo,
  SHIP_COLORS,
} from '../game-data.js';
import { syncFuel, stageSelectFuelLaunchOk, FUEL_CAP } from '../game/fuel.js';
import {
  getStageSelectIdealScroll,
  getStageSelectMapSpatialConstants,
  getStageSelectNodeWorldPos,
  getStageSelectShipFollowStage,
  getStageSelectShipTarget,
} from '../game/stage-select-map-geometry.js';

const PANEL_LEFT = 478;
const VB_H = CANVAS_H;
/** SVG <text> 用（DOM と同じスタック） */
const SS_SVG_FONT = "Orbitron, 'Zen Kaku Gothic New', sans-serif";

/** ステージ選択の敵プレビューはこの数までアイコン表示し、超過分は「+N」に集約 */
const SS_ENEMY_PREVIEW_MAX_ICONS = 4;

/** 敵アイコン下ラベル（読みやすい表記） */
const STAGE_SELECT_ENEMY_LBL = {
  normal: 'NORMAL',
  fast: 'FAST',
  spider: 'SPIDER',
  ufo_drone: 'UFO',
  bomber: 'BOMB',
  sniper: 'SNIPER',
  tank: 'TANK',
  heavy: 'HEAVY',
  crystal: 'CRYSTAL',
};

/** @type {{ getStageStarsForMap: (n: number) => number; getStageMedalCount: (n: number) => number; playSound?: (id: string) => void; startGame?: () => void } | null} */
let helpers = null;

export function setStageSelectOverlayHelpers(h) {
  helpers = h;
}

export function isStageSelectOverlayBlockingCanvasPointer() {
  const el = document.getElementById('stage-select-overlay');
  return !!(el && !el.classList.contains('ss-hidden'));
}

export function mountStageSelectOverlay(canvas) {
  ensureMounted(canvas);
}

export function syncStageSelectOverlay(canvas) {
  if (!canvas) return;
  ensureMounted(canvas);
  const root = els.root;
  if (game.state !== 'stage_select') {
    root.classList.add('ss-hidden');
    root.setAttribute('aria-hidden', 'true');
    lastRightPanelStage = 0;
    lastScrollSyncSelStage = 0;
    return;
  }
  root.classList.remove('ss-hidden');
  root.setAttribute('aria-hidden', 'false');
  const selStage = game.stageSelectIdx + 1;
  const world = getWorldInfo(selStage);
  const H = CANVAS_H;
  const S0 = getStageSelectMapSpatialConstants(H, PANEL_LEFT);
  let scrollRaw = Math.max(
    0,
    Math.min(S0.maxScroll, Number.isFinite(game.stageMapScrollOffset) ? game.stageMapScrollOffset : 0)
  );

  if (selStage !== lastScrollSyncSelStage) {
    game._stageSelectMapSnapAt = 0;
    lastScrollSyncSelStage = selStage;
    scrollRaw = getStageSelectIdealScroll(selStage, H, PANEL_LEFT);
    game.stageMapScrollOffset = scrollRaw;
  } else if (game._stageSelectMapSnapAt && Date.now() >= game._stageSelectMapSnapAt) {
    game._stageSelectMapSnapAt = 0;
    scrollRaw = getStageSelectIdealScroll(selStage, H, PANEL_LEFT);
    game.stageMapScrollOffset = scrollRaw;
  } else if (!game._stageSelectMapSnapAt) {
    const pSel = getStageSelectNodeWorldPos(H, selStage, PANEL_LEFT);
    const pad = 80;
    const bandLo = scrollRaw + pad;
    const bandHi = scrollRaw + H - pad;
    if (pSel && (pSel.y < bandLo || pSel.y > bandHi)) {
      scrollRaw = getStageSelectIdealScroll(selStage, H, PANEL_LEFT);
      game.stageMapScrollOffset = scrollRaw;
    }
  }

  const layout = computeLayout(selStage, H, scrollRaw);
  game._stageSelectMapMaxScroll = layout.maxScroll;
  game.stageMapScrollOffset = layout.scrollY;

  syncFuel();
  game._stageSelectLaunchFuelBlocked = selStage <= game.highestStage && !stageSelectFuelLaunchOk();

  const staticKey = `${selStage}|${game.highestStage}|${layout.scrollY}|${layout.groupStart}`;
  if (staticKey !== lastLayoutKey) {
    lastLayoutKey = staticKey;
    els.scrollG.innerHTML = buildMapSvg(layout);
    bindNodeClicksOnce();
  }

  els.hPlanet.textContent = world.name;
  els.hReach.textContent = `最高到達：${formatStageId(game.highestStage)}`;
  els.hSel.textContent = `選択中：${formatStageId(selStage)}`;

  updateRightPanel(selStage, world);
  paintEnemyPreview(selStage);

  const fuelHave = Math.max(0, Math.floor(game.fuel || 0));
  els.fuelTxt.textContent = `FUEL ${fuelHave}/${FUEL_CAP}`;
  els.fuelFill.style.width = `${Math.min(100, (fuelHave / FUEL_CAP) * 100)}%`;

  const launchLocked = selStage > game.highestStage;
  const fuelBl = !!game._stageSelectLaunchFuelBlocked;
  if (els.prep) els.prep.disabled = launchLocked || fuelBl;
  els.launch.disabled = launchLocked || fuelBl;
  const launchPlay = els.launch.querySelector('.ss-launch-play');
  const launchWord = els.launch.querySelector('.ss-launch-word');
  if (fuelBl) {
    if (launchPlay) launchPlay.style.display = 'none';
    if (launchWord) launchWord.textContent = '燃料が足りません';
  } else if (launchLocked) {
    if (launchPlay) launchPlay.style.display = 'none';
    if (launchWord) launchWord.textContent = '🔒 未解放';
  } else {
    if (launchPlay) launchPlay.style.display = '';
    if (launchWord) launchWord.textContent = '出撃';
  }

  positionShip(layout);

  if (game.stageSelectBossModal?.open && game.stageSelectBossModal.src) {
    els.modalImg.src = game.stageSelectBossModal.src;
    els.modal.classList.remove('ss-hidden');
  } else {
    els.modal.classList.add('ss-hidden');
  }
}

/* ---------- 小ユーティリティ ---------- */

/** HTML 属性用（チップ title など） */
function escapeAttr(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;');
}

/** 現在ロードアウト強化から目安の出撃戦闘力（推奨値と同スケール感） */
function computePlayerSortiePower() {
  const u = game.playerUpgrades || {};
  const dmg = Math.max(0, Number(u.damage) || 0);
  const fr = Math.max(0, Number(u.firerate) || 0);
  const sp = Math.max(0, Number(u.speed) || 0);
  const bs = Math.max(0, Number(u.bulletSpd) || 0);
  const inv = Math.max(0, Number(u.invincibleBonus) || 0);
  const spread = !!u.spread;
  let p = 68;
  p += dmg * 24;
  p += fr * 17;
  p += sp * 11;
  p += bs * 8;
  if (spread) p += 30;
  p += Math.floor(inv / 22);
  return Math.round(Math.min(99999, Math.max(1, p)));
}

function formatStageId(stageNum) {
  const s = Math.max(1, Math.floor(stageNum || 1));
  const w = Math.floor((s - 1) / 10) + 1;
  const local = ((s - 1) % 10) + 1;
  return `${w}-${local}`;
}

function _hexVertices(x, y, r) {
  const pts = [];
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 180) * (60 * i - 30);
    pts.push({ x: x + r * Math.cos(a), y: y + r * Math.sin(a) });
  }
  return pts;
}
function _raySegIntersect(ox, oy, dx, dy, ax, ay, bx, by) {
  const vx = bx - ax;
  const vy = by - ay;
  const det = dx * -vy - dy * -vx;
  if (Math.abs(det) < 1e-6) return null;
  const rx = ax - ox;
  const ry = ay - oy;
  const t = (rx * -vy - ry * -vx) / det;
  const u = (dx * ry - dy * rx) / det;
  if (t >= 0 && u >= 0 && u <= 1) return { t, x: ox + dx * t, y: oy + dy * t };
  return null;
}
function hexBoundaryPoint(cx, cy, r, tx, ty) {
  const dx = tx - cx;
  const dy = ty - cy;
  const len = Math.hypot(dx, dy);
  if (len < 1e-6) return { x: cx, y: cy };
  const ux = dx / len;
  const uy = dy / len;
  const pts = _hexVertices(cx, cy, r);
  let best = null;
  for (let i = 0; i < 6; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % 6];
    const hit = _raySegIntersect(cx, cy, ux, uy, a.x, a.y, b.x, b.y);
    if (hit && (!best || hit.t < best.t)) best = hit;
  }
  return best ? { x: best.x, y: best.y } : { x: cx + ux * r, y: cy + uy * r };
}
function circleBoundaryPoint(cx, cy, r, tx, ty) {
  const dx = tx - cx;
  const dy = ty - cy;
  const len = Math.hypot(dx, dy);
  if (len < 1e-6) return { x: cx, y: cy };
  const ux = dx / len;
  const uy = dy / len;
  return { x: cx + ux * r, y: cy + uy * r };
}

function starPoints(cx, cy, outerR, innerR, points = 5) {
  const out = [];
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const a = (Math.PI / points) * i - Math.PI / 2;
    out.push(`${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`);
  }
  return out.join(' ');
}

function computeLayout(selStage, H, scrollY) {
  const S = getStageSelectMapSpatialConstants(H, PANEL_LEFT);
  const { cx, layoutPos, rNode, rSel, maxScroll } = S;

  const worldStart = (Math.floor((selStage - 1) / 10)) * 10 + 1;
  const groupStart = worldStart;
  const stages = Array.from({ length: 10 }, (_, i) => worldStart + i);
  const bossStage = worldStart + 9;

  const nodePos = stages.map((s) => {
    const isSel = s === selStage;
    const localS = ((s - 1) % 10) + 1;
    const isMidBoss = localS === 5;
    const isFinalBoss = localS === 10;
    const mul = isFinalBoss ? 1.35 : isMidBoss ? 1.12 : 1;
    const shape = isMidBoss || isFinalBoss ? 'star' : 'hex';
    const lp = layoutPos[localS];
    const x = lp.x;
    const y = lp.y;
    return { stage: s, local: localS, x, y, r: (isSel ? rSel : rNode) * mul, shape, isMidBoss, isFinalBoss };
  });

  const segments = [];
  const rNodeBase = rNode;
  for (let i = 0; i < nodePos.length - 1; i++) {
    const a = nodePos[i];
    const b = nodePos[i + 1];
    const edgeToMid = b.local === 5;
    const edgeToFinal = b.local === 10;
    const p1 =
      a.shape === 'hex'
        ? hexBoundaryPoint(a.x, a.y, a.r || rNodeBase, b.x, b.y)
        : circleBoundaryPoint(a.x, a.y, a.r || rNodeBase, b.x, b.y);
    const p2 =
      b.shape === 'hex'
        ? hexBoundaryPoint(b.x, b.y, b.r || rNodeBase, a.x, a.y)
        : circleBoundaryPoint(b.x, b.y, b.r || rNodeBase, a.x, a.y);
    const midX = (p1.x + p2.x) / 2;
    const midY = (p1.y + p2.y) / 2;
    const lateral = Math.abs(p2.x - p1.x);
    const pull = edgeToFinal ? 0.2 : edgeToMid ? 0.28 : 0.38;
    const qx = midX + (cx - midX) * pull;
    const qy = midY + Math.min(30, 8 + lateral * 0.07);
    const d = `M ${p1.x} ${p1.y} Q ${qx} ${qy} ${p2.x} ${p2.y}`;
    const active = a.stage <= game.highestStage && b.stage <= game.highestStage;
    const progressed = b.stage <= game.highestStage;
    segments.push({
      d,
      active,
      progressed,
      toBoss: !!(edgeToMid || edgeToFinal),
      kind: edgeToFinal ? 'final' : edgeToMid ? 'mid' : 'norm',
    });
  }

  return {
    nodePos,
    segments,
    bossStage,
    isBossNode: true,
    isMidBossNode: true,
    groupStart,
    maxScroll,
    scrollY: Math.max(0, Math.min(maxScroll, scrollY)),
  };
}

let mounted = false;
let els = {};
let lastLayoutKey = '';
let nodeClickBound = false;
/** 右パネル本文スクロール：ステージ切替時だけ先頭へ戻す */
let lastRightPanelStage = 0;
/** 左マップ：選択変更時に理想スクロールへ寄せる */
let lastScrollSyncSelStage = 0;

function ensureMounted(canvas) {
  if (mounted) return;
  let root = document.getElementById('stage-select-overlay');
  if (!root) {
    root = document.createElement('div');
    root.id = 'stage-select-overlay';
    const wrap = canvas.parentElement;
    if (wrap) wrap.appendChild(root);
    else document.body.appendChild(root);
  }
  root.className = 'stage-select-root ss-hidden';
  root.innerHTML = `
<div class="ss-grid">
  <div class="ss-left">
    <div class="ss-left-bg"></div>
    <div class="ss-stars"></div>
    <div class="ss-lane"></div>
    <div class="ss-grain"></div>
    <div class="ss-scan"></div>
      <div class="ss-map-layer">
      <div class="ss-header">
        <button type="button" class="ss-back-galaxy" id="ss-back-galaxy">◀ 銀河マップへ戻る</button>
        <div class="ss-header-planet" id="ss-h-planet"></div>
        <div class="ss-header-reach" id="ss-h-reach"></div>
        <div class="ss-header-sel" id="ss-h-sel"></div>
      </div>
      <div class="ss-svg-wrap" id="ss-svg-wrap">
        <svg id="ss-svg" viewBox="0 0 ${PANEL_LEFT} ${VB_H}" preserveAspectRatio="xMidYMid meet">
          <defs>
            <filter id="ss-glow" x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur stdDeviation="2.2" result="b" />
              <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>
          <g id="ss-scroll-g"></g>
        </svg>
        <div class="ss-ship" id="ss-ship"></div>
      </div>
    </div>
  </div>
  <div class="ss-right">
    <div class="ss-panel-card" id="ss-panel">
      <div class="ss-panel-summary">
        <div class="ss-panel-hdr-label" id="ss-p-world"></div>
        <div class="ss-panel-stage-id" id="ss-p-id"></div>
        <div class="ss-status-line" id="ss-p-status"></div>
        <div class="ss-hr"></div>
      </div>
      <div class="ss-panel-main" id="ss-panel-main">
        <div id="ss-p-body"></div>
        <div class="ss-enemy-block" id="ss-enemy-block">
          <div class="ss-enemy-title" id="ss-enemy-title">主な敵</div>
          <div class="ss-enemy-row" id="ss-enemy-row"></div>
          <div class="ss-enemy-footnote" id="ss-enemy-footnote"></div>
        </div>
      </div>
      <div class="ss-footer">
        <div class="ss-fuel-row">
          <span class="ss-fuel-icon">⛽</span>
          <span class="ss-fuel-text" id="ss-fuel-txt"></span>
          <div class="ss-fuel-bar"><span id="ss-fuel-fill"></span></div>
        </div>
        <button type="button" class="ss-prep" id="ss-prep"><span aria-hidden="true">⚙</span><span>出撃準備へ</span></button>
        <button type="button" class="ss-launch" id="ss-launch"><span class="ss-launch-play" aria-hidden="true">▶</span><span class="ss-launch-word">出撃</span></button>
      </div>
    </div>
  </div>
</div>
<div class="ss-modal ss-hidden" id="ss-modal" aria-hidden="true">
  <div>
    <div class="ss-modal-inner"><img id="ss-modal-img" alt="" /></div>
    <button type="button" class="ss-modal-close" id="ss-modal-close">閉じる</button>
  </div>
</div>`;

  els = {
    root,
    backGalaxy: root.querySelector('#ss-back-galaxy'),
    hPlanet: root.querySelector('#ss-h-planet'),
    hReach: root.querySelector('#ss-h-reach'),
    hSel: root.querySelector('#ss-h-sel'),
    scrollG: root.querySelector('#ss-scroll-g'),
    ship: root.querySelector('#ss-ship'),
    pWorld: root.querySelector('#ss-p-world'),
    pId: root.querySelector('#ss-p-id'),
    pStatus: root.querySelector('#ss-p-status'),
    pBody: root.querySelector('#ss-p-body'),
    panelMain: root.querySelector('#ss-panel-main'),
    enemyTitle: root.querySelector('#ss-enemy-title'),
    enemyRow: root.querySelector('#ss-enemy-row'),
    enemyFootnote: root.querySelector('#ss-enemy-footnote'),
    fuelTxt: root.querySelector('#ss-fuel-txt'),
    fuelFill: root.querySelector('#ss-fuel-fill'),
    prep: root.querySelector('#ss-prep'),
    launch: root.querySelector('#ss-launch'),
    modal: root.querySelector('#ss-modal'),
    modalImg: root.querySelector('#ss-modal-img'),
    modalClose: root.querySelector('#ss-modal-close'),
    svgWrap: root.querySelector('#ss-svg-wrap'),
    svg: root.querySelector('#ss-svg'),
  };

  els.ship.innerHTML = `<svg viewBox="0 0 42 27" xmlns="http://www.w3.org/2000/svg"><path d="M4 14 L18 6 L38 14 L18 22 Z" fill="currentColor"/><rect x="18" y="12" width="8" height="4" rx="1" fill="#ffcc66"/></svg>`;

  const mapLayer = root.querySelector('.ss-map-layer');
  mapLayer.addEventListener(
    'wheel',
    (e) => {
      if (game.state !== 'stage_select') return;
      const cap = Number.isFinite(game._stageSelectMapMaxScroll) ? game._stageSelectMapMaxScroll : 1200;
      game.stageMapScrollOffset = Math.max(0, Math.min(cap, (game.stageMapScrollOffset || 0) + e.deltaY * 0.65));
      game._stageSelectMapSnapAt = Date.now() + 140;
      e.preventDefault();
    },
    { passive: false }
  );

  const validateSelectedStageForLaunch = () => {
    if (game.state !== 'stage_select') return;
    syncFuel();
    const selS = game.stageSelectIdx + 1;
    const blocked = selS <= game.highestStage && !stageSelectFuelLaunchOk();
    if (blocked) {
      game.lifeGainDisplay = { text: '燃料が足りません', timer: 150, color: '#ff8866' };
      helpers?.playSound?.('error');
      return null;
    }
    if (selS > game.highestStage) return null;
    return selS;
  };

  els.prep.addEventListener('click', () => {
    const selS = validateSelectedStageForLaunch();
    if (!selS) return;
    game.startStage = selS;
    game.customizeCursor = 4;
    game.uiLastTap = { id: 'ss_prep', frame: game.frameCount };
    helpers?.playSound?.('select');
    game.state = 'customize';
  });

  els.launch.addEventListener('click', () => {
    const selS = validateSelectedStageForLaunch();
    if (!selS) return;
    game.startStage = selS;
    game.bossRushModeActive = false;
    game.endlessModeActive = false;
    game.uiLastTap = { id: 'ss_launch', frame: game.frameCount };
    helpers?.playSound?.('select');
    helpers?.startGame?.();
  });

  els.modalClose.addEventListener('click', () => {
    game.stageSelectBossModal = { open: false };
    els.modal.classList.add('ss-hidden');
  });
  els.modal.addEventListener('click', (e) => {
    if (e.target === els.modal) {
      game.stageSelectBossModal = { open: false };
      els.modal.classList.add('ss-hidden');
    }
  });

  els.backGalaxy?.addEventListener('click', () => {
    if (game.state !== 'stage_select') return;
    helpers?.playSound?.('select');
    game.state = 'galaxy_map';
  });

  els.pBody.addEventListener('click', (e) => {
    const card = e.target.closest('#ss-boss-card');
    if (!card || game.state !== 'stage_select') return;
    const src = card.getAttribute('data-src');
    const title = card.getAttribute('data-title') || '';
    if (!src) return;
    game.stageSelectBossModal = { open: true, src, title };
    els.modalImg.src = src;
    els.modalImg.alt = title;
    els.modal.classList.remove('ss-hidden');
  });

  mounted = true;
}

function bindNodeClicksOnce() {
  if (nodeClickBound) return;
  nodeClickBound = true;
  els.scrollG.addEventListener('click', (ev) => {
    if (game.state !== 'stage_select') return;
    const g = ev.target.closest('[data-stage]');
    if (!g) return;
    const s = parseInt(g.getAttribute('data-stage'), 10);
    if (!Number.isFinite(s)) return;
    const hs = Math.max(1, game.highestStage | 0);
    if (game.stageSelectIdx === s - 1 && s <= hs) {
      if (game._stageSelectLaunchFuelBlocked) {
        game.lifeGainDisplay = { text: '燃料が足りません', timer: 150, color: '#ff8866' };
        helpers?.playSound?.('error');
        return;
      }
      game.startStage = s;
      game.customizeCursor = 4;
      helpers?.playSound?.('select');
      game.state = 'customize';
      return;
    }
    game.stageSelectIdx = s - 1;
    game.startStage = s;
    lastScrollSyncSelStage = 0;
    game.stageMapScrollOffset = getStageSelectIdealScroll(s, CANVAS_H, PANEL_LEFT);
    lastScrollSyncSelStage = s;
    helpers?.playSound?.('select');
  });
}

function nodeState(s, hs, selStage) {
  return {
    cleared: s < hs,
    current: s === hs,
    next: s === hs + 1,
    locked: s > hs + 1,
    selected: s === selStage,
  };
}

function buildMapSvg(layout) {
  const { nodePos, segments } = layout;
  const hs = Math.max(1, game.highestStage | 0);
  const selStage = game.stageSelectIdx + 1;

  let svg = `<g transform="translate(0 ${-layout.scrollY})">`;

  segments.forEach((seg) => {
    const col = seg.kind === 'final' ? '#ff7844' : seg.kind === 'mid' ? '#ff9a44' : '#ffb24d';
    const strokeW = seg.active ? (seg.toBoss ? 3.4 : seg.kind === 'norm' ? 3.2 : 2.6) : 1.5;
    const cls = seg.active ? 'ss-flow-path ss-active' : 'ss-flow-path ss-dim';
    const glow = seg.active && seg.kind === 'norm' ? 'filter:url(#ss-glow)' : '';
    svg += `<path class="${cls}" d="${seg.d}" stroke="${seg.active ? col : 'rgba(255,200,160,0.07)'}" stroke-width="${strokeW}" fill="none" style="${glow}" />`;
  });

  nodePos.forEach((n) => {
    const st = nodeState(n.stage, hs, selStage);
    const rr = n.r;
    /** @type {{ text: string; role: 'current' | 'next' | 'sel' }[]} */
    const labelsAbove = [];
    if (st.current) labelsAbove.push({ text: '現在地', role: 'current' });
    if (st.next) labelsAbove.push({ text: 'NEXT', role: 'next' });
    if (st.selected) labelsAbove.push({ text: '選択中', role: 'sel' });
    let fill = 'rgba(10,10,24,0.95)';
    let stroke = 'rgba(160,190,255,0.22)';
    if (st.locked) {
      fill = 'rgba(4,4,10,0.88)';
      stroke = 'rgba(70,80,110,0.28)';
    } else if (st.cleared) {
      fill = 'rgba(0, 26, 12, 0.82)';
      stroke = st.selected ? 'rgba(180, 255, 210, 0.98)' : 'rgba(40, 255, 130, 0.72)';
    } else if (st.current) {
      fill = 'rgba(40, 8, 6, 0.92)';
      stroke = 'rgba(255, 85, 55, 0.98)';
    } else if (st.next) {
      fill = 'rgba(36, 22, 4, 0.92)';
      stroke = 'rgba(255, 200, 90, 0.95)';
    } else if (st.selected) {
      fill = 'rgba(18, 22, 40, 0.92)';
      stroke = 'rgba(200, 245, 255, 0.55)';
    }
    if (n.isMidBoss || n.isFinalBoss) {
      stroke = n.isFinalBoss ? 'rgba(255, 70, 50, 0.95)' : 'rgba(255, 140, 60, 0.9)';
    }

    const stars = helpers ? helpers.getStageStarsForMap(n.stage) : 0;
    const localNum = ((n.stage - 1) % 10) + 1;

    svg += `<g class="ss-node-hit" data-stage="${n.stage}" transform="translate(${n.x},${n.y})">`;
    if (n.isMidBoss && !n.isFinalBoss) {
      const ringR = rr + 12;
      svg += `<circle cx="0" cy="0" r="${ringR}" fill="none" stroke="rgba(255,150,100,0.11)" stroke-width="1" />`;
      svg += `<circle cx="0" cy="0" r="${ringR + 12}" fill="none" stroke="rgba(255,130,80,0.07)" stroke-width="1" />`;
    }
    if (n.isFinalBoss) {
      for (let ri = 1; ri <= 3; ri++) {
        const rad = rr + 10 + ri * 14;
        const op = 0.05 + ri * 0.025;
        svg += `<circle cx="0" cy="0" r="${rad}" fill="none" stroke="rgba(255,120,70,${op})" stroke-width="1" />`;
      }
    }
    if (st.current && n.shape === 'hex') {
      svg += `<circle cx="0" cy="0" r="${rr + 5}" fill="none" stroke="rgba(255,140,70,0.9)" stroke-width="2.2" />`;
      if (!st.selected) {
        svg += `<circle cx="0" cy="0" r="${rr + 11}" fill="none" stroke="rgba(255,90,50,0.45)" stroke-width="1.5" />`;
      }
    }
    if (n.shape === 'star') {
      const inner = rr * 0.48;
      const swStar = st.selected ? 3.35 : n.isMidBoss && !n.isFinalBoss ? 2.75 : 2;
      svg += `<polygon class="ss-node-shape" points="${starPoints(0, 0, rr, inner)}" fill="${fill}" stroke="${stroke}" stroke-width="${swStar}" />`;
    } else {
      const pts = _hexVertices(0, 0, rr);
      const pstr = pts.map((p) => `${p.x},${p.y}`).join(' ');
      const swHex = st.selected ? (st.cleared ? 3.4 : 3.2) : 2;
      svg += `<polygon class="ss-node-shape" points="${pstr}" fill="${fill}" stroke="${stroke}" stroke-width="${swHex}" />`;
    }
    if (st.locked) {
      svg += `<line x1="${-rr * 0.45}" y1="${-rr * 0.35}" x2="${rr * 0.45}" y2="${rr * 0.35}" stroke="rgba(255,255,255,0.45)" stroke-width="2"/>`;
      svg += `<line x1="${rr * 0.45}" y1="${-rr * 0.35}" x2="${-rr * 0.45}" y2="${rr * 0.35}" stroke="rgba(255,255,255,0.45)" stroke-width="2"/>`;
      svg += `<text x="0" text-anchor="middle" y="5" fill="rgba(160,180,210,0.35)" font-size="13" font-weight="bold" font-family="${SS_SVG_FONT}">🔒</text>`;
    } else {
      const mark = n.isFinalBoss && !st.cleared ? '💀' : String(localNum);
      const fs = n.isFinalBoss && !st.cleared ? 18 : st.selected ? 18 : 13;
      const numFill = st.current ? '#000' : st.selected ? '#ffffff' : 'rgba(255,255,255,0.92)';
      const numStroke = st.selected && !st.current ? 'rgba(0,6,18,0.92)' : 'none';
      const swNum = st.selected && !st.current ? 3.4 : 0;
      svg += `<text x="0" text-anchor="middle" y="5" fill="${numFill}" stroke="${numStroke}" stroke-width="${swNum}" paint-order="stroke fill" font-size="${fs}" font-weight="900" font-family="${SS_SVG_FONT}">${mark}</text>`;
    }
    if (labelsAbove.length) {
      const lineDy = 13;
      const topY = -46 - (labelsAbove.length - 1) * lineDy;
      labelsAbove.forEach((lb, li) => {
        const col =
          lb.role === 'next'
            ? n.isFinalBoss
              ? 'rgba(255,88,48,1)'
              : 'rgba(255, 230, 140, 0.98)'
            : lb.role === 'current'
              ? 'rgba(255,110,75,0.98)'
              : 'rgba(255, 210, 170, 0.96)';
        svg += `<text x="0" text-anchor="middle" y="${topY + li * lineDy}" fill="${col}" font-size="11" font-weight="bold" font-family="${SS_SVG_FONT}">${lb.text}</text>`;
      });
    }
    if (stars > 0 && st.cleared) {
      svg += `<text x="0" text-anchor="middle" y="${44}" fill="rgba(255,220,80,0.92)" font-size="12" font-weight="bold">${'★'.repeat(stars)}</text>`;
    }
    if (n.isMidBoss || n.isFinalBoss) {
      const chipW = n.isFinalBoss ? 102 : 78;
      const chipY = rr + 48;
      svg += `<rect x="${-chipW / 2}" y="${chipY - 10}" width="${chipW}" height="19" rx="8" fill="rgba(28,6,6,0.9)" stroke="${n.isFinalBoss ? 'rgba(255,90,70,0.55)' : 'rgba(255,160,90,0.5)'}" stroke-width="1"/>`;
      svg += `<text x="0" text-anchor="middle" y="${chipY + 5}" fill="${n.isFinalBoss ? 'rgba(255,210,200,0.96)' : 'rgba(255,220,180,0.95)'}" font-size="${n.isFinalBoss ? 8 : 9}" font-weight="bold" font-family="${SS_SVG_FONT}">${n.isFinalBoss ? 'WARNING / BOSS' : 'MID BOSS'}</text>`;
    }
    svg += `</g>`;
  });

  svg += `</g>`;
  return svg;
}

function paintEnemyIcons(types) {
  els.enemyRow.innerHTML = '';
  const danger = { bomber: 1, sniper: 1, heavy: 1 };
  const cap = SS_ENEMY_PREVIEW_MAX_ICONS;
  const head = types.slice(0, cap);
  head.forEach((t) => {
    const cell = document.createElement('div');
    cell.className = 'ss-enemy-cell';
    const cvs = document.createElement('canvas');
    cvs.width = 38;
    cvs.height = 38;
    const ctx = cvs.getContext('2d');
    const wrap = document.createElement('div');
    wrap.className = 'ss-enemy-icon';
    if (danger[t]) wrap.style.boxShadow = '0 0 10px rgba(255,120,90,0.45)';
    ctx.save();
    ctx.translate(19, 19);
    ctx.fillStyle = ENEMY_PREVIEW_COLORS[t] || '#aaa';
    drawEnemyPreviewIcon(ctx, t, 22);
    ctx.restore();
    wrap.appendChild(cvs);
    const lbl = document.createElement('div');
    lbl.className = 'ss-enemy-lbl';
    lbl.textContent = (STAGE_SELECT_ENEMY_LBL[t] || ENEMY_PREVIEW_LABELS[t] || t).slice(0, 8);
    cell.appendChild(wrap);
    cell.appendChild(lbl);
    els.enemyRow.appendChild(cell);
  });
  const more = types.length - head.length;
  if (more > 0) {
    const cell = document.createElement('div');
    cell.className = 'ss-enemy-cell ss-enemy-more-cell';
    const chip = document.createElement('div');
    chip.className = 'ss-enemy-more-chip';
    chip.textContent = `+${more}`;
    chip.title = `ほか ${more} タイプ`;
    const lbl = document.createElement('div');
    lbl.className = 'ss-enemy-lbl';
    lbl.textContent = '他';
    cell.appendChild(chip);
    cell.appendChild(lbl);
    els.enemyRow.appendChild(cell);
  }
}

/** 通常〜応用は代表アイコンのみ。ミッド／ラスボスは文言のみで種類のメンテ負荷を避ける */
function paintEnemyPreview(selStage) {
  if (!els.enemyRow || !els.enemyTitle || !els.enemyFootnote) return;
  const localInWorld = ((selStage - 1) % 10) + 1;
  const bossLike = localInWorld === 5 || localInWorld === 10;
  if (bossLike) {
    els.enemyTitle.textContent = '出現傾向';
    els.enemyFootnote.textContent = '';
    els.enemyRow.innerHTML =
      '<div class="ss-enemy-boss-note">ボス戦が中心です。道中に通常クラスの敵も混ざります。</div>';
    return;
  }
  els.enemyTitle.textContent = '主な敵';
  els.enemyFootnote.textContent = '※代表タイプです（全種ではありません）。';
  paintEnemyIcons(getStageEnemyTypes(selStage));
}

/** 報酬・推奨戦闘力・★条件（通常／応用／ボス系で共通） */
function buildConditionChipsHtml(selStage, locked) {
  const medal =
    locked || typeof helpers?.getStageMedalCount !== 'function'
      ? 0
      : helpers.getStageMedalCount(selStage);
  const rows = [
    {
      tier: 1,
      text: '★1 クリア',
      hint: 'このステージをクリアすると達成（被弾・コンボ条件なし）。',
    },
    {
      tier: 2,
      text: '★2 Cmb5',
      hint: '1プレイ中に最大コンボが 5 以上になると達成。',
    },
    {
      tier: 3,
      text: '★3 無傷',
      hint: '1プレイで被弾 0（ライフが減らない）のままクリアすると達成。',
    },
  ];
  return rows
    .map(({ tier, text, hint }) => {
      const done = !locked && medal >= tier;
      const cls = locked ? 'ss-chip ss-chip-locked' : done ? 'ss-chip ss-chip-done' : 'ss-chip ss-chip-todo';
      const tail = done ? ' <span class="ss-chip-mark">✓</span>' : '';
      const state = locked ? '未解放' : done ? '達成済み' : '未達成';
      const title = escapeAttr(`${hint}【${state}】`);
      return `<span class="${cls}" title="${title}">${text}${tail}</span>`;
    })
    .join('');
}

/** 報酬・推奨戦闘力・★条件（ラッパーなし。ボス系はビジュアルの下に続けて使う） */
function buildStageInfoBoxInnerHtml(selStage, locked) {
  const recPower = Math.max(80, selStage * 120);
  const myPower = computePlayerSortiePower();
  const myCls = myPower >= recPower ? 'ss-my-power ss-my-power-ok' : 'ss-my-power ss-my-power-low';
  const coinMin = 80 + selStage * 8;
  const coinMax = coinMin + 39;
  const gemBase = 3 + Math.floor(selStage / 5);
  const pName = getPlanet(selStage).name;
  const matStr = pName === 'SATURN' ? '💠×2  🔩×3' : pName === 'JUPITER' ? '💠×1  🔩×3' : '⚡×2  🔩×3';
  const condChips = buildConditionChipsHtml(selStage, locked);
  return `
  <div class="ss-info-row">
    <span class="ss-info-lbl">報酬</span>
    <div class="ss-info-val ss-info-reward-stack">
      <div class="ss-reward-line" title="獲得コイン・ジェムの目安">
        <span class="ss-reward-coin"><span class="ss-reward-ico" aria-hidden="true">🪙</span>コイン&nbsp;<span class="ss-reward-nums">${coinMin}〜${coinMax}</span></span>
        <span class="ss-reward-sep">·</span>
        <span class="ss-reward-gem"><span aria-hidden="true">💎</span>${gemBase}</span>
      </div>
      <div class="ss-reward-line ss-reward-line-mat" title="素材ドロップ">${matStr}</div>
    </div>
  </div>
  <div class="ss-info-row">
    <span class="ss-info-lbl">推奨戦闘力</span>
    <div class="ss-info-val ss-power-compare" title="推奨はステージ目安。自分は現在の強化から算出した目安です。">
      <span class="ss-rec-power">${recPower}</span>
      <span class="ss-power-slash">/</span>
      <span class="${myCls}">${myPower}</span>
      <span class="ss-my-power-lbl">自分</span>
    </div>
  </div>
  <div class="ss-info-row ss-info-row-cond">
    <span class="ss-info-lbl">条件</span>
    <div class="ss-chip-row">${condChips}</div>
  </div>`;
}

function buildStageInfoBoxHtml(selStage, locked) {
  return `<div class="ss-info-box">${buildStageInfoBoxInnerHtml(selStage, locked)}</div>`;
}

function updateRightPanel(selStage, world) {
  const hs = Math.max(1, game.highestStage | 0);
  const localInWorld = ((selStage - 1) % 10) + 1;
  const isMid = localInWorld === 5;
  const isBoss = localInWorld === 10;
  const isApplied = localInWorld >= 6 && localInWorld <= 9;
  const isNormal = localInWorld >= 1 && localInWorld <= 4;
  const locked = selStage > hs;

  els.pWorld.textContent = world.name;
  els.pId.textContent = formatStageId(selStage);

  els.pStatus.className = 'ss-status-line';
  if (isMid) {
    els.pStatus.textContent = 'MID BOSS';
    els.pStatus.classList.add('ss-warn');
  } else if (isBoss) {
    els.pStatus.textContent = 'WARNING / BOSS';
    els.pStatus.classList.add('ss-warn');
  } else if (selStage < hs) {
    els.pStatus.textContent = '✓ クリア済み';
    els.pStatus.classList.add('ss-green');
  } else if (selStage === hs) {
    els.pStatus.textContent = '▶ 挑戦中';
  } else if (locked) {
    els.pStatus.textContent = '🔒 未解放';
    els.pStatus.classList.add('ss-muted2');
  } else {
    els.pStatus.textContent = '';
  }

  let body = '';
  if (isMid) {
    const infoFollow = `<div class="ss-info-box ss-info-after-boss">${buildStageInfoBoxInnerHtml(selStage, locked)}</div>`;
    body = `<div class="ss-boss-visual-stack">
<div class="ss-boss-card" id="ss-boss-card" data-src="./assets/midboss_mars_sentinel.png" data-title="MID BOSS">
  <img src="./assets/midboss_mars_sentinel.png" alt="MID BOSS" />
</div>
<div style="color:rgba(255,160,140,0.9);font-weight:800;font-size:15px;margin-top:4px">TELEPORT</div>
<div class="ss-boss-tags"><span class="ss-boss-tag">瞬間移動</span><span class="ss-boss-tag">奇襲</span></div>
</div>${infoFollow}`;
    if (locked) {
      body = `<div style="text-align:center;padding:10px;color:rgba(180,195,220,0.8);font-size:11px">未解放</div>` + body;
    }
  } else if (isBoss) {
    const infoFollow = `<div class="ss-info-box ss-info-after-boss">${buildStageInfoBoxInnerHtml(selStage, locked)}</div>`;
    body = `<div class="ss-boss-visual-stack">
<div class="ss-boss-card" id="ss-boss-card" data-src="./assets/boss_burst.png" data-title="WARNING">
  <img src="./assets/boss_burst.png" alt="BOSS" />
</div>
<div style="color:rgba(255,160,140,0.9);font-weight:800;font-size:15px;margin-top:4px">BURST CORE</div>
<div class="ss-boss-tags"><span class="ss-boss-tag">全方位弾幕</span><span class="ss-boss-tag">レーザー</span><span class="ss-boss-tag">追尾</span></div>
</div>${infoFollow}`;
    if (locked) {
      body = `<div style="text-align:center;padding:10px;color:rgba(180,195,220,0.8);font-size:11px">未解放</div>` + body;
    }
  } else if (isNormal || isApplied) {
    body = buildStageInfoBoxHtml(selStage, locked);
    if (locked) {
      body = `<div style="text-align:center;padding:10px;color:rgba(180,195,220,0.8);font-size:11px">未解放</div>` + body;
    }
  } else {
    body = `<div class="ss-info-box" style="font-size:10px;color:rgba(200,210,230,0.75)">このステージの詳細はマップから選択してください。</div>`;
  }

  els.pBody.innerHTML = body;
  if (selStage !== lastRightPanelStage) {
    lastRightPanelStage = selStage;
    if (els.panelMain) els.panelMain.scrollTop = 0;
  }
}

function positionShip(layout) {
  const followS = getStageSelectShipFollowStage(game.stageSelectIdx + 1, game.highestStage);
  const pos = getStageSelectShipTarget(CANVAS_H, followS, PANEL_LEFT, game.highestStage);
  if (!pos || !els.svgWrap) return;
  const wrap = els.svgWrap.getBoundingClientRect();
  const svg = els.svg;
  if (!svg) return;
  const vb = svg.viewBox.baseVal;
  const sx = wrap.width / vb.width;
  const sy = wrap.height / vb.height;
  const worldY = pos.y - layout.scrollY;
  const px = pos.x * sx;
  const py = worldY * sy + Math.sin((game.frameCount || 0) * 0.14) * 2.5;
  els.ship.style.left = `${px}px`;
  els.ship.style.top = `${py}px`;
  const col = SHIP_COLORS[game.shipColorIdx]?.hex || '#6cf';
  els.ship.style.color = col;
}
