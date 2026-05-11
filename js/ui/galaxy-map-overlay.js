/**
 * 銀河マップ（タイトルワープ後 → 惑星選択 → 既存ステージ選択）
 */
import { escapeHtml } from '../app/escape-html.js';
import { game } from '../game/game-store.js';
import { CANVAS_H } from '../game/constants.js';
import { CHAR_POOL, SHIP_COLORS, SHIP_SHAPES } from '../game-data.js';
import { safeLocalStorageSetItem } from '../game/storage-helpers.js';
import {
  PROFILE_MAX_LEVEL,
  getProfileLevelProgressFraction,
  getProfileHeaderTooltipJa,
} from '../game/profile-progress.js';
import { drawShipShape } from '../draw/draw-ship-shape.js';
import { drawDragonLordPortrait, isDragonLordChar } from '../draw/dragon-lord-portrait.js';
import {
  GALAXY_PLANETS,
  GALAXY_MAP_HUB_PCT,
  formatGalaxyStars,
  getGalaxyBossStageLabel,
  getGalaxyPlanetReachLabel,
  getGalaxyPlanetStarCount,
  getGalaxyStageRangeLabel,
  isGalaxyPlanetPlayable,
  isGalaxyPlanetUnlocked,
  isGalaxyPlanetUnlockedVisual,
} from '../game/galaxy-data.js';
import {
  getStageSelectIdealScroll,
  getStageSelectShipFollowStage,
  getStageSelectShipTarget,
} from '../game/stage-select-map-geometry.js';

const PANEL_LEFT = 478;
const GM_FONT = "Orbitron, 'Zen Kaku Gothic New', sans-serif";

/** `assets/galaxy/` のベース URL（末尾スラッシュ付き） */
function galaxyAssetDirHref() {
  try {
    return new URL('assets/galaxy/', document.baseURI || window.location.href).href;
  } catch (e) {
    return './assets/galaxy/';
  }
}

/** @param {string} file 例 `galaxy-map-bg.png` */
function galaxyAssetUrl(file) {
  try {
    return new URL(file, galaxyAssetDirHref()).href;
  } catch (e) {
    return `${galaxyAssetDirHref()}${file}`;
  }
}

/** @param {string} planetId */
function galaxyPlanetImageSrc(planetId) {
  return galaxyAssetUrl(`galaxy-planet-${planetId}.png`);
}

let lastGalaxyAssetProbeMs = 0;

/**
 * 読み込み成功時だけ root に .gm-asset-* を付与。未配置のときは何度か再試行する。
 * @param {HTMLElement} root
 */
function probeGalaxyOptionalAssets(root) {
  const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
  if (now - lastGalaxyAssetProbeMs < 900) return;
  lastGalaxyAssetProbeMs = now;

  const tryOne = (/** @type {string} */ file, /** @type {string} */ cls, /** @type {string | null} */ cssVar, /** @type {string | undefined} */ bust) => {
    if (root.classList.contains(cls)) return;
    const base = galaxyAssetUrl(file);
    const resolved = bust != null ? `${base}?v=${encodeURIComponent(bust)}` : base;
    const im = new Image();
    im.onload = () => {
      if (cssVar) root.style.setProperty(cssVar, `url(${JSON.stringify(resolved)})`);
      root.classList.add(cls);
    };
    im.onerror = () => { };
    im.src = resolved;
  };
  tryOne('galaxy-map-bg.png', 'gm-asset-bg', '--gm-asset-bg-url');
  tryOne('galaxy-map-nebula.png', 'gm-asset-nebula', '--gm-asset-nebula-url');
  tryOne('galaxy-core-nexus.png', 'gm-asset-core', '--gm-asset-core-url', '4');
  // 枠 PNG にチェック柄や白地が不透明で焼き込まれている場合はコードだけでは除去不可。透過アルファのみの再エクスポート推奨（css/galaxy-map.css の ::after 参照）。
  tryOne('galaxy-map-panel-frame.png', 'gm-asset-panel', '--gm-asset-panel-frame-url');
}

/** @param {HTMLImageElement} img */
function bindGalaxyPlanetImgFallback(img) {
  img.addEventListener('error', () => img.classList.add('gm-img-broken'));
  img.addEventListener('load', () => {
    if (img.naturalWidth > 0) img.classList.remove('gm-img-broken');
  });
}

/** @type {{ playSound?: (id: string) => void } | null} */
let helpers = null;

/** マップ内トースト（Date.now ベース） */
let mapToastMsg = '';
let mapToastUntil = 0;

export function setGalaxyMapOverlayHelpers(h) {
  helpers = h;
}

export function isGalaxyMapOverlayBlockingCanvasPointer() {
  const el = document.getElementById('galaxy-map-overlay');
  return !!(el && !el.classList.contains('gm-hidden'));
}

let mounted = false;
/** @type {Record<string, HTMLElement | null | NodeListOf<Element>>} */
let els = {};

function showMapToast(msg) {
  mapToastMsg = msg;
  mapToastUntil = Date.now() + 2400;
}

function getGalaxyPortraitChar() {
  const gid = game.galaxyPortraitCharId;
  if (gid && game.gachaInventory?.[gid]) {
    const c = CHAR_POOL.find((ch) => ch.id === gid);
    if (c) return c;
  }
  const loadId = game.playerLoadout?.charId || 'char_basic';
  const owned = CHAR_POOL.find((c) => c.id === loadId && game.gachaInventory?.[c.id]);
  return owned || CHAR_POOL.find((c) => c.id === 'char_basic') || CHAR_POOL[0];
}

function persistGalaxyPortraitChar() {
  const v = game.galaxyPortraitCharId && String(game.galaxyPortraitCharId).trim();
  safeLocalStorageSetItem('invader_galaxy_portrait_char', v ? v.slice(0, 32) : '');
}

function fmtNum(n) {
  const x = Math.floor(Number(n) || 0);
  try {
    return x.toLocaleString('en-US');
  } catch (e) {
    return String(x);
  }
}

/** モックの「ID_PLAYER」風表示（英数字のみなら大文字化、それ以外はそのまま） */
function formatGalaxyHeaderPlayerId(raw) {
  const s = (raw && String(raw).trim()) || 'PLAYER';
  const slug = s.replace(/\s+/g, '_').slice(0, 12) || 'PLAYER';
  const asciiOnly = /^[a-zA-Z0-9_]+$/.test(slug);
  return `ID_${asciiOnly ? slug.toUpperCase() : slug}`;
}

/** 二次ベジエ Q（t=0..1） */
function quadBezierPoint(t, x0, y0, cx, cy, x1, y1) {
  const u = 1 - t;
  return {
    x: u * u * x0 + 2 * u * t * cx + t * t * x1,
    y: u * u * y0 + 2 * u * t * cy + t * t * y1,
  };
}

/**
 * ハブ〜惑星の航路をわずかに弧らせる（viewBox 0〜100）
 * @param {number} sag 制御点の外へのしゃくみ（符号で左右）
 */
function buildCurvedRoutePath(hubX, hubY, ax, ay, t0, t1, sag) {
  const x0 = hubX + (ax - hubX) * t0;
  const y0 = hubY + (ay - hubY) * t0;
  const x1 = hubX + (ax - hubX) * t1;
  const y1 = hubY + (ay - hubY) * t1;
  const mx = (x0 + x1) / 2;
  const my = (y0 + y1) / 2;
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len = Math.hypot(dx, dy) || 1;
  const px = -dy / len;
  const py = dx / len;
  const cx = mx + px * sag;
  const cy = my + py * sag;
  const d = `M ${x0.toFixed(3)} ${y0.toFixed(3)} Q ${cx.toFixed(3)} ${cy.toFixed(3)} ${x1.toFixed(3)} ${y1.toFixed(3)}`;
  return { d, x0, y0, cx, cy, x1, y1 };
}

function syncAreaModalDom() {
  const bd = els.areaBackdrop;
  if (!bd) return;
  const open = game.state === 'galaxy_map' && game.galaxyMapModal === 'area';
  bd.classList.toggle('gm-hidden', !open);
  bd.setAttribute('aria-hidden', open ? 'false' : 'true');
}

function syncPortraitModalDom() {
  const bd = els.portraitBackdrop;
  if (!bd) return;
  const open = game.state === 'galaxy_map' && game.galaxyMapModal === 'portrait';
  bd.classList.toggle('gm-hidden', !open);
  bd.setAttribute('aria-hidden', open ? 'false' : 'true');
}

function fillAreaModalBody() {
  const body = els.areaBody;
  if (!body) return;
  const sel = game.galaxyMapSelectedPlanetId || 'mars';
  const p = GALAXY_PLANETS.find((x) => x.id === sel) || GALAXY_PLANETS[0];
  const un = isGalaxyPlanetUnlocked(p, game);
  const range = escapeHtml(getGalaxyStageRangeLabel(p));
  const boss = escapeHtml(getGalaxyBossStageLabel(p));
  const pw = escapeHtml(p.recommendedPower != null ? fmtNum(p.recommendedPower) : '—');
  if (un) {
    body.innerHTML = `
<p class="gm-modal-lead">${escapeHtml(p.nameJa)} <span class="gm-modal-en">${escapeHtml(p.nameEn)}</span></p>
<p class="gm-modal-p">${escapeHtml(p.descriptionJa || '')}</p>
<ul class="gm-modal-ul">
<li><span class="gm-modal-k">特徴</span> ${escapeHtml(p.featureJa || '—')}</li>
<li><span class="gm-modal-k">推奨戦力</span> ${pw}</li>
<li><span class="gm-modal-k">ステージ</span> ${range}　<span class="gm-modal-k">ボス</span> ${boss}</li>
</ul>`;
  } else {
    body.innerHTML = `
<p class="gm-modal-lead">${escapeHtml(p.nameJa)} <span class="gm-modal-en">${escapeHtml(p.nameEn)}</span></p>
<p class="gm-modal-p gm-modal-locked">${escapeHtml(p.unlockHintJa || '条件を満たすと解放されます。')}</p>`;
  }
}

function closeAreaModal() {
  game.galaxyMapModal = null;
  syncAreaModalDom();
}

function ensureMounted(canvas) {
  if (mounted) return;
  let root = document.getElementById('galaxy-map-overlay');
  const wrap = canvas?.parentElement;
  if (!root && wrap) {
    root = document.createElement('div');
    root.id = 'galaxy-map-overlay';
    wrap.appendChild(root);
  }
  if (!root) return;

  root.className = 'galaxy-map-root gm-hidden';
  root.setAttribute('aria-hidden', 'true');

  const hubX = GALAXY_MAP_HUB_PCT.x;
  const hubY = GALAXY_MAP_HUB_PCT.y;
  /** コア縁〜惑星ディスク手前まで（真ん中からの生線を避ける） */
  const ROUTE_T0 = 0.075;
  const ROUTE_T1 = 0.905;
  /** コア〜リング内に航路が透けると十字／縦線に見えるので、ハブ周りをマスクで抜く */
  const routeHubMaskR = 12.2;
  const routesBody = GALAXY_PLANETS.map((p, i) => {
    const ax = p.routeAnchorPct?.x ?? p.nodePct.x;
    const ay = p.routeAnchorPct?.y ?? p.nodePct.y;
    const sag = (i % 2 === 0 ? 1 : -1) * (3.5 + i * 0.5);
    const { d, x0, y0, cx, cy, x1: qx1, y1: qy1 } = buildCurvedRoutePath(hubX, hubY, ax, ay, ROUTE_T0, ROUTE_T1, sag);
    const dots = [0.28, 0.52, 0.76]
      .map((k) => {
        const pt = quadBezierPoint(k, x0, y0, cx, cy, qx1, qy1);
        return `<circle class="gm-route-dot" data-planet="${p.id}" cx="${pt.x.toFixed(2)}" cy="${pt.y.toFixed(2)}" r="0.48" />`;
      })
      .join('');
    return `<g data-planet="${p.id}" class="gm-route-wrap">
  <path class="gm-route-halo" d="${d}" fill="none" vector-effect="non-scaling-stroke" />
  <path class="gm-route-line" d="${d}" fill="none" vector-effect="non-scaling-stroke" />
</g>${dots}`;
  }).join('');
  const routesSvg = `<defs>
  <mask id="gm-route-hub-mask" maskUnits="userSpaceOnUse" maskContentUnits="userSpaceOnUse" x="0" y="0" width="100" height="100">
    <rect width="100" height="100" fill="white"/>
    <circle cx="${hubX}" cy="${hubY}" r="${routeHubMaskR}" fill="black"/>
  </mask>
</defs>
<g mask="url(#gm-route-hub-mask)">${routesBody}</g>`;

  const nodesHtml = GALAXY_PLANETS.map((p) => {
    const tc = p.themeColor || '#888';
    const psrc = galaxyPlanetImageSrc(p.id);
    return `<button type="button" class="gm-node" data-planet="${p.id}" style="left:${p.nodePct.x}%;top:${p.nodePct.y}%;--gm-theme:${tc}">
  <span class="gm-node-sel-ring" aria-hidden="true"></span>
  <span class="gm-node-planet" aria-hidden="true">
    <img class="gm-node-planet-img" src="${psrc}" alt="" draggable="false" />
  </span>
  <span class="gm-node-lock" aria-hidden="true"><svg class="gm-lock-svg" viewBox="0 0 24 24" width="14" height="14" focusable="false" aria-hidden="true"><path d="M7 11V8a5 5 0 0 1 10 0v3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><rect x="5" y="11" width="14" height="10" rx="2" fill="none" stroke="currentColor" stroke-width="2"/></svg></span>
  <span class="gm-node-label"><span class="gm-node-ja">${escapeHtml(p.nameJa)}</span></span>
  <span class="gm-node-meta">
    <span class="gm-node-chip"></span>
    <span class="gm-node-stars" aria-hidden="true"></span>
  </span>
</button>`;
  }).join('');

  root.innerHTML = `
<div class="gm-layout">
  <header class="gm-header-bar">
    <div class="gm-h-profile">
      <div class="gm-h-profile-inner" id="gm-profile-tip-anchor">
        <div class="gm-h-avatar-wrap" id="gm-avatar-hit" role="button" tabindex="0" title="タップで所持キャラから選択" aria-label="マップ表示キャラを選択">
          <canvas class="gm-h-avatar-canvas" id="gm-h-avatar-canvas" width="40" height="40" aria-hidden="true"></canvas>
        </div>
        <div class="gm-h-profile-text">
          <div class="gm-h-profile-id" id="gm-profile-id">ID_PLAYER</div>
          <div class="gm-h-profile-row">
            <div class="gm-h-exp-track" aria-hidden="true" title="プロフィール経験値">
              <div class="gm-h-exp-fill" id="gm-exp-fill"></div>
            </div>
            <span class="gm-h-exp-pct" id="gm-exp-pct">Lv.1</span>
          </div>
        </div>
      </div>
    </div>
    <div class="gm-h-title-block">
      <div class="gm-h-title-en">銀河マップ</div>
      <div class="gm-h-title-sub">惑星を選択</div>
    </div>
    <div class="gm-h-resources">
      <div class="gm-h-resources-strips">
        <div class="gm-res-strip">
          <span class="gm-res-icon gm-res-gem" aria-hidden="true">💎</span>
          <span class="gm-res-val" id="gm-res-gems">0</span>
          <button type="button" class="gm-res-plus" id="gm-gem-plus" aria-label="ショップへ">+</button>
        </div>
        <div class="gm-res-strip">
          <span class="gm-res-icon gm-res-shard" aria-hidden="true">●</span>
          <span class="gm-res-val" id="gm-res-stardust">0</span>
          <button type="button" class="gm-res-plus" id="gm-dust-plus" aria-label="ショップへ">+</button>
        </div>
      </div>
      <button type="button" class="gm-h-settings" id="gm-header-settings" aria-label="設定">⚙</button>
    </div>
  </header>

  <div class="gm-main">
    <div class="gm-map-col">
      <div class="gm-map-area">
        <div class="gm-nebula"></div>
        <div class="gm-route-glow-layer" aria-hidden="true"></div>
        <svg class="gm-routes-svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${routesSvg}</svg>
        <div class="gm-hub" style="left:${hubX}%;top:${hubY}%">
          <div class="gm-hub-spiral" aria-hidden="true"></div>
          <div class="gm-hub-core"></div>
          <div class="gm-hub-ring gm-hub-ring-a"></div>
          <div class="gm-hub-ring gm-hub-ring-b"></div>
          <div class="gm-hub-label">中枢</div>
        </div>
        <div class="gm-nodes">${nodesHtml}</div>
        <div class="gm-map-actions">
          <button type="button" class="gm-map-act" id="gm-area-info">エリア情報</button>
          <button type="button" class="gm-map-act" id="gm-mission-list">ミッション一覧</button>
        </div>
      </div>
    </div>
    <div class="gm-selection-link" id="gm-selection-link" aria-hidden="true"></div>
    <aside class="gm-side">
      <div class="gm-card" id="gm-card">
        <div class="gm-card-accent" aria-hidden="true"></div>
        <div class="gm-card-hero">
          <div class="gm-card-planet-wrap">
            <div class="gm-card-planet" id="gm-card-planet" aria-hidden="true">
              <img class="gm-card-planet-img" id="gm-card-planet-img" alt="" draggable="false" width="112" height="112" src="${galaxyPlanetImageSrc(game.galaxyMapSelectedPlanetId || 'mars')}" />
            </div>
          </div>
        </div>
        <div class="gm-card-head">
          <div class="gm-card-title" id="gm-card-title">—</div>
          <div class="gm-card-badge gm-card-badge-ok" id="gm-card-badge">解放済み</div>
        </div>
        <div class="gm-card-rows" id="gm-card-rows"></div>
        <p class="gm-card-desc gm-hidden" id="gm-card-desc"></p>
        <div class="gm-card-actions">
          <button type="button" class="gm-go" id="gm-go" disabled><span class="gm-go-inner"><span class="gm-go-ic" aria-hidden="true">▶</span><span class="gm-go-txt">ステージ選択へ</span></span></button>
          <button type="button" class="gm-go-sub" id="gm-go-sub"><span class="gm-go-sub-inner"><span class="gm-go-sub-ic" aria-hidden="true">▸</span><span class="gm-go-sub-txt">出撃準備へ</span></span></button>
        </div>
      </div>
    </aside>
  </div>

  <footer class="gm-footer">
    <nav class="gm-f-nav" aria-label="メインメニュー">
      <button type="button" class="gm-f-nav-btn" data-gm-nav="home" title="ホーム"><span class="gm-f-nav-ic">⌂</span><span class="gm-f-nav-lab">ホーム</span></button>
      <button type="button" class="gm-f-nav-btn" data-gm-nav="hangar" title="出撃準備"><span class="gm-f-nav-ic">⛟</span><span class="gm-f-nav-lab">出撃準備</span></button>
      <button type="button" class="gm-f-nav-btn" data-gm-nav="upgrade" title="装備"><span class="gm-f-nav-ic">◆</span><span class="gm-f-nav-lab">装備</span></button>
      <button type="button" class="gm-f-nav-btn" data-gm-nav="research" title="ガチャ"><span class="gm-f-nav-ic">▤</span><span class="gm-f-nav-lab">ガチャ</span></button>
      <button type="button" class="gm-f-nav-btn" data-gm-nav="shop" title="強化"><span class="gm-f-nav-ic">▲</span><span class="gm-f-nav-lab">強化</span></button>
    </nav>
    <div class="gm-f-crumb"><span class="gm-f-crumb-glow" aria-hidden="true"></span><span class="gm-f-crumb-txt">銀河マップ</span></div>
  </footer>

  <div class="gm-toast gm-hidden" id="gm-toast" role="status"></div>

  <div class="gm-modal-backdrop gm-hidden" id="gm-area-backdrop" aria-hidden="true">
    <div class="gm-modal-panel" id="gm-area-panel" role="dialog" aria-modal="true" aria-labelledby="gm-area-modal-title">
      <div class="gm-modal-head">
        <h2 class="gm-modal-title" id="gm-area-modal-title">エリア情報</h2>
        <button type="button" class="gm-modal-close" id="gm-area-modal-close" aria-label="閉じる">×</button>
      </div>
      <div class="gm-modal-body" id="gm-area-modal-body"></div>
    </div>
  </div>

  <div class="gm-modal-backdrop gm-hidden" id="gm-portrait-backdrop" aria-hidden="true">
    <div class="gm-modal-panel" id="gm-portrait-panel" role="dialog" aria-modal="true" aria-labelledby="gm-portrait-modal-title">
      <div class="gm-modal-head">
        <h2 class="gm-modal-title" id="gm-portrait-modal-title">マップ表示キャラ</h2>
        <button type="button" class="gm-modal-close" id="gm-portrait-modal-close" aria-label="閉じる">×</button>
      </div>
      <div class="gm-modal-body">
        <p class="gm-portrait-hint">所持しているキャラから選べます。編成と同じにすると出撃準備のキャラに追従します。</p>
        <button type="button" class="gm-map-act gm-portrait-follow" id="gm-portrait-follow-loadout">編成と同じ（自動）</button>
        <div class="gm-portrait-grid" id="gm-portrait-grid"></div>
      </div>
    </div>
  </div>
</div>`;

  els = {
    root,
    nodes: root.querySelectorAll('.gm-node'),
    cardTitle: root.querySelector('#gm-card-title'),
    cardBadge: root.querySelector('#gm-card-badge'),
    cardRows: root.querySelector('#gm-card-rows'),
    cardDesc: root.querySelector('#gm-card-desc'),
    cardPlanet: root.querySelector('#gm-card-planet'),
    cardPlanetImg: root.querySelector('#gm-card-planet-img'),
    goBtn: root.querySelector('#gm-go'),
    goSub: root.querySelector('#gm-go-sub'),
    selectionLink: root.querySelector('#gm-selection-link'),
    profileId: root.querySelector('#gm-profile-id'),
    avatarCanvas: root.querySelector('#gm-h-avatar-canvas'),
    expFill: root.querySelector('#gm-exp-fill'),
    expPct: root.querySelector('#gm-exp-pct'),
    profileTipAnchor: root.querySelector('#gm-profile-tip-anchor'),
    avatarHit: root.querySelector('#gm-avatar-hit'),
    resGems: root.querySelector('#gm-res-gems'),
    resStardust: root.querySelector('#gm-res-stardust'),
    toast: root.querySelector('#gm-toast'),
    routes: root.querySelectorAll('.gm-route-wrap'),
    routeDots: root.querySelectorAll('.gm-route-dot'),
    areaBackdrop: root.querySelector('#gm-area-backdrop'),
    areaBody: root.querySelector('#gm-area-modal-body'),
    portraitBackdrop: root.querySelector('#gm-portrait-backdrop'),
    portraitGrid: root.querySelector('#gm-portrait-grid'),
    portraitFollow: root.querySelector('#gm-portrait-follow-loadout'),
  };

  for (const btn of els.nodes) {
    btn.addEventListener('click', () => onPlanetClick(btn.getAttribute('data-planet')));
  }
  for (const im of root.querySelectorAll('.gm-node-planet-img')) {
    if (im instanceof HTMLImageElement) bindGalaxyPlanetImgFallback(im);
  }
  if (els.cardPlanetImg instanceof HTMLImageElement) bindGalaxyPlanetImgFallback(els.cardPlanetImg);
  els.goBtn?.addEventListener('click', () => goToStageSelectForPlanet(game.galaxyMapSelectedPlanetId));
  els.goSub?.addEventListener('click', () => {
    helpers?.playSound?.('select');
    game.returnToGalaxyAfterOverlay = false;
    game.state = 'customize';
    game.customizeCursor = 0;
  });

  root.querySelector('#gm-area-info')?.addEventListener('click', () => {
    helpers?.playSound?.('select');
    fillAreaModalBody();
    game.galaxyMapModal = 'area';
    syncAreaModalDom();
  });
  root.querySelector('#gm-mission-list')?.addEventListener('click', () => {
    helpers?.playSound?.('select');
    game.missionsReturnState = 'galaxy_map';
    game.state = 'missions';
  });

  els.areaBackdrop?.addEventListener('click', (ev) => {
    if (ev.target === els.areaBackdrop) closeAreaModal();
  });
  root.querySelector('#gm-area-modal-close')?.addEventListener('click', () => {
    helpers?.playSound?.('select');
    closeAreaModal();
  });
  root.querySelector('#gm-area-panel')?.addEventListener('click', (ev) => ev.stopPropagation());

  els.portraitBackdrop?.addEventListener('click', (ev) => {
    if (ev.target === els.portraitBackdrop) closePortraitModal();
  });
  root.querySelector('#gm-portrait-modal-close')?.addEventListener('click', () => {
    helpers?.playSound?.('select');
    closePortraitModal();
  });
  root.querySelector('#gm-portrait-panel')?.addEventListener('click', (ev) => ev.stopPropagation());
  els.portraitFollow?.addEventListener('click', () => {
    helpers?.playSound?.('select');
    game.galaxyPortraitCharId = null;
    persistGalaxyPortraitChar();
    showMapToast('マップ表示を編成に合わせました');
    syncHeaderDom();
    closePortraitModal();
  });

  root.querySelector('#gm-gem-plus')?.addEventListener('click', () => {
    helpers?.playSound?.('select');
    game.returnToGalaxyAfterOverlay = true;
    game.state = 'shop';
  });
  root.querySelector('#gm-dust-plus')?.addEventListener('click', () => {
    helpers?.playSound?.('select');
    game.returnToGalaxyAfterOverlay = true;
    game.state = 'shop';
  });
  root.querySelector('#gm-header-settings')?.addEventListener('click', () => {
    helpers?.playSound?.('select');
    game.settingsReturnState = 'galaxy_map';
    game.state = 'settings';
  });

  root.querySelector('.gm-f-nav')?.addEventListener('click', (ev) => {
    const t = ev.target;
    const btn = t instanceof Element ? t.closest('[data-gm-nav]') : null;
    if (!btn) return;
    const nav = btn.getAttribute('data-gm-nav');
    helpers?.playSound?.('select');
    if (nav === 'home') {
      game.returnToGalaxyAfterOverlay = false;
      game.state = 'title';
      return;
    }
    if (nav === 'hangar') {
      game.returnToGalaxyAfterOverlay = false;
      game.state = 'customize';
      game.customizeCursor = 0;
      return;
    }
    if (nav === 'upgrade') {
      game.returnToGalaxyAfterOverlay = true;
      game.loadoutTab = 1;
      game.loadoutCursor = 0;
      game.state = 'loadout';
      return;
    }
    if (nav === 'research') {
      game.returnToGalaxyAfterOverlay = true;
      game.state = 'gacha';
      return;
    }
    if (nav === 'shop') {
      game.returnToGalaxyAfterOverlay = true;
      game.state = 'shop';
    }
  });

  const avHit = els.avatarHit;
  if (avHit) {
    avHit.addEventListener('click', (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      helpers?.playSound?.('select');
      openPortraitPickerModal();
    });
    avHit.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter' || ev.key === ' ') {
        ev.preventDefault();
        helpers?.playSound?.('select');
        openPortraitPickerModal();
      }
    });
  }

  mounted = true;
}

function closePortraitModal() {
  if (game.galaxyMapModal === 'portrait') game.galaxyMapModal = null;
  syncPortraitModalDom();
}

function fillPortraitGrid() {
  const grid = els.portraitGrid;
  if (!grid) return;
  const owned = CHAR_POOL.filter((c) => game.gachaInventory?.[c.id]);
  const curFixed = game.galaxyPortraitCharId;
  const loadId = game.playerLoadout?.charId || 'char_basic';
  const rows = owned
    .map((c) => {
      const sel = curFixed ? c.id === curFixed : c.id === loadId;
      const cls = sel ? 'gm-portrait-cell gm-portrait-cell-sel' : 'gm-portrait-cell';
      return `<button type="button" class="${cls}" data-char-id="${escapeHtml(c.id)}"><span class="gm-portrait-name">${escapeHtml(
        c.label || c.id,
      )}</span><span class="gm-portrait-r">${escapeHtml(c.rarity || '')}</span></button>`;
    })
    .join('');
  grid.innerHTML = rows || '<p class="gm-modal-p">所持キャラがありません。</p>';
  for (const btn of grid.querySelectorAll('button[data-char-id]')) {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-char-id');
      if (!id || !game.gachaInventory?.[id]) return;
      helpers?.playSound?.('select');
      game.galaxyPortraitCharId = id;
      persistGalaxyPortraitChar();
      showMapToast(`${CHAR_POOL.find((c) => c.id === id)?.label || id} に設定`);
      syncHeaderDom();
      closePortraitModal();
    });
  }
  const fol = els.portraitFollow;
  if (fol) {
    fol.classList.toggle('gm-portrait-follow-sel', !curFixed);
  }
}

function openPortraitPickerModal() {
  game.galaxyMapModal = 'portrait';
  fillPortraitGrid();
  syncAreaModalDom();
  syncPortraitModalDom();
}

function onPlanetClick(planetId) {
  const p = GALAXY_PLANETS.find((x) => x.id === planetId);
  if (!p) return;
  helpers?.playSound?.('select');
  game.galaxyMapSelectedPlanetId = planetId;
  syncCardAndNodes();
}

function syncHeaderDom() {
  const idEl = els.profileId;
  const fill = els.expFill;
  const pctEl = els.expPct;
  const gEl = els.resGems;
  const dustEl = els.resStardust;
  const displayName = (game.displayName && String(game.displayName).trim()) || 'PLAYER';
  const char = getGalaxyPortraitChar();
  if (idEl) {
    const fid = formatGalaxyHeaderPlayerId(displayName);
    idEl.textContent = fid;
    const raw = String(displayName).trim();
    idEl.setAttribute('title', raw && raw !== fid ? `${raw} · ${fid}` : fid);
  }
  const profLv = Math.max(1, Math.min(PROFILE_MAX_LEVEL, Math.floor(game.profileLevel || 1)));
  const profProg = getProfileLevelProgressFraction(game);
  if (fill) fill.style.width = `${Math.round(profProg * 100)}%`;
  if (pctEl) pctEl.textContent = `Lv.${profLv}`;
  if (gEl) gEl.textContent = fmtNum(game.gems);
  if (dustEl) dustEl.textContent = fmtNum(game.gachaStardust | 0);

  const tip = els.profileTipAnchor;
  if (tip) tip.setAttribute('title', getProfileHeaderTooltipJa(game));

  const cv = els.avatarCanvas;
  if (cv instanceof HTMLCanvasElement && cv.getContext) {
    const ctx = cv.getContext('2d');
    if (ctx) {
      const cssPx = 40;
      const dpr = typeof window !== 'undefined' ? Math.min(2, window.devicePixelRatio || 1) : 1;
      cv.width = Math.round(cssPx * dpr);
      cv.height = Math.round(cssPx * dpr);
      cv.style.width = `${cssPx}px`;
      cv.style.height = `${cssPx}px`;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, cssPx, cssPx);
      ctx.fillStyle = 'rgba(5, 9, 20, 0.96)';
      if (typeof ctx.roundRect === 'function') {
        ctx.beginPath();
        ctx.roundRect(0, 0, cssPx, cssPx, 6);
        ctx.fill();
      } else {
        ctx.fillRect(0, 0, cssPx, cssPx);
      }
      ctx.strokeStyle = 'rgba(255, 90, 55, 0.55)';
      ctx.lineWidth = 1.2;
      if (typeof ctx.roundRect === 'function') {
        ctx.beginPath();
        ctx.roundRect(0, 0, cssPx, cssPx, 6);
        ctx.stroke();
      }
      const si = Math.max(0, Math.min(SHIP_SHAPES.length - 1, game.shipShapeIdx | 0));
      const shapeId = SHIP_SHAPES[si]?.id || 'fighter';
      const col = SHIP_COLORS[Math.max(0, Math.min(SHIP_COLORS.length - 1, game.shipColorIdx | 0))]?.hex || '#44aaff';
      try {
        const cpx = cssPx / 2;
        const photo =
          isDragonLordChar(char) &&
          drawDragonLordPortrait(ctx, cpx, cpx, cssPx - 4, cssPx - 4, {
            glowColor: char.color || '#ff2266',
            frameCount: game.frameCount || 0,
            tier: 'micro',
          });
        if (!photo) {
          drawShipShape(ctx, 4, 4, cssPx - 8, cssPx - 8, shapeId, col, char.rarity);
        }
      } catch (e) {
        /* ignore draw errors */
      }
    }
  }
}

function syncCardAndNodes() {
  const sel = game.galaxyMapSelectedPlanetId || 'mars';
  const p = GALAXY_PLANETS.find((x) => x.id === sel) || GALAXY_PLANETS[0];
  const unlocked = isGalaxyPlanetUnlocked(p, game);
  const playable = isGalaxyPlanetPlayable(p, game);
  els.root?.style.setProperty('--gm-selected-theme', p.themeColor || '#ff5533');
  els.root?.style.setProperty('--gm-link-x', String(p.nodePct?.x ?? 24));
  els.root?.style.setProperty('--gm-link-y', String(p.nodePct?.y ?? 38));

  if (els.cardTitle) els.cardTitle.textContent = p.nameJa;
  if (els.cardBadge) {
    els.cardBadge.classList.toggle('gm-hidden', false);
    if (unlocked) {
      els.cardBadge.textContent = '解放済み';
      els.cardBadge.className = 'gm-card-badge gm-card-badge-ok';
    } else {
      els.cardBadge.textContent = '未解放';
      els.cardBadge.className = 'gm-card-badge gm-card-badge-locked';
    }
  }

  if (els.cardPlanet) {
    const tc = p.themeColor || '#888';
    els.cardPlanet.style.setProperty('--gm-theme', tc);
    els.cardPlanet.classList.toggle('gm-card-planet-dim', !unlocked);
  }
  const cImg = els.cardPlanetImg;
  if (cImg instanceof HTMLImageElement) {
    const src = galaxyPlanetImageSrc(p.id);
    if (cImg.getAttribute('data-gm-planet-src') !== src) {
      cImg.setAttribute('data-gm-planet-src', src);
      cImg.classList.remove('gm-img-broken');
      cImg.src = src;
    }
  }

  if (els.cardRows) {
    if (playable) {
      const reach = escapeHtml(getGalaxyPlanetReachLabel(p, game.highestStage));
      const range = escapeHtml(getGalaxyStageRangeLabel(p));
      const boss = escapeHtml(getGalaxyBossStageLabel(p));
      const pow = escapeHtml(p.recommendedPower != null ? fmtNum(p.recommendedPower) : '—');
      const feat = escapeHtml(p.featureJa || '—');
      els.cardRows.innerHTML = `
<div class="gm-row gm-row-primary"><span class="gm-k"><span class="gm-row-ic" aria-hidden="true">≡</span>ステージ</span><span class="gm-v">${range}</span></div>
<div class="gm-row gm-row-primary"><span class="gm-k"><span class="gm-row-ic" aria-hidden="true">⚡</span>推奨戦力</span><span class="gm-v">${pow}</span></div>
<div class="gm-row gm-row-primary"><span class="gm-k"><span class="gm-row-ic" aria-hidden="true">✦</span>特徴</span><span class="gm-v gm-v-wrap">${feat}</span></div>
<div class="gm-row gm-row-note"><span class="gm-v">最高到達 ${reach}　/　ボス ${boss}</span></div>`;
    } else {
      const hint = escapeHtml(p.unlockHintJa || '条件を満たすと解放されます');
      els.cardRows.innerHTML = `<div class="gm-hint">${hint}</div>`;
    }
  }

  if (els.cardDesc) {
    if (playable && p.descriptionJa) {
      els.cardDesc.textContent = p.descriptionJa;
      els.cardDesc.classList.remove('gm-hidden');
    } else {
      els.cardDesc.textContent = '';
      els.cardDesc.classList.add('gm-hidden');
    }
  }

  if (els.goBtn) {
    els.goBtn.disabled = !playable;
    els.goBtn.classList.toggle('gm-go-glow', playable);
  }

  for (const btn of els.nodes) {
    const id = btn.getAttribute('data-planet');
    const pl = GALAXY_PLANETS.find((x) => x.id === id);
    if (!pl) continue;
    const v = isGalaxyPlanetUnlockedVisual(pl, game);
    const plb = isGalaxyPlanetPlayable(pl, game);
    btn.classList.toggle('gm-node-selected', id === sel);
    btn.classList.toggle('gm-node-muted', id !== sel);
    btn.classList.toggle('gm-node-locked', !plb);
    btn.classList.toggle('gm-node-dim', !v);
    const chip = btn.querySelector('.gm-node-chip');
    const stars = btn.querySelector('.gm-node-stars');
    const un = isGalaxyPlanetUnlocked(pl, game);
    if (chip) chip.textContent = un ? '解放済み' : '未解放';
    if (stars) {
      const sc = un ? getGalaxyPlanetStarCount(pl, game) : 0;
      stars.textContent = formatGalaxyStars(sc);
      stars.classList.toggle('gm-node-stars-muted', !un);
    }
  }

  for (const wrap of els.routes) {
    const id = wrap.getAttribute('data-planet');
    const pl = GALAXY_PLANETS.find((x) => x.id === id);
    const selected = id === sel;
    // 解放済みルートを全部光らせると「メインは火星？」と右パネルがズレて見える。選択中の1本だけ強調する。
    wrap.classList.toggle('gm-route-dim', !selected);
    const col = pl?.routeColor || 'rgba(255, 140, 100, 0.55)';
    for (const path of wrap.querySelectorAll('path')) {
      path.style.stroke = col;
    }
  }

  for (const dot of els.routeDots) {
    const id = dot.getAttribute('data-planet');
    dot.classList.toggle('gm-route-dim', id !== sel);
  }
}

function syncToast() {
  const el = els.toast;
  if (!el) return;
  if (mapToastMsg && Date.now() < mapToastUntil) {
    el.textContent = mapToastMsg;
    el.classList.remove('gm-hidden');
  } else {
    el.classList.add('gm-hidden');
    mapToastMsg = '';
  }
}

export function goToStageSelectForPlanet(planetId) {
  const p = GALAXY_PLANETS.find((x) => x.id === planetId);
  if (!p || !isGalaxyPlanetPlayable(p, game)) return;
  const hs = Math.max(1, game.highestStage | 0);
  const capped = Math.min(hs, p.lastStage);
  const idx = Math.max(p.firstStage - 1, Math.min(p.lastStage - 1, capped - 1));
  game.stageSelectIdx = idx;
  const H = CANVAS_H;
  game.stageMapScrollOffset = getStageSelectIdealScroll(game.stageSelectIdx + 1, H, PANEL_LEFT);
  const followS = getStageSelectShipFollowStage(game.stageSelectIdx + 1, game.highestStage);
  const pos = getStageSelectShipTarget(H, followS, PANEL_LEFT, game.highestStage);
  if (pos) {
    game.stageCharX = pos.x;
    game.stageCharY = pos.y;
    game.stageCharTX = pos.x;
    game.stageCharTY = pos.y;
  }
  helpers?.playSound?.('select');
  game.returnToGalaxyAfterOverlay = false;
  game.state = 'stage_select';
}

export function mountGalaxyMapOverlay(canvas) {
  ensureMounted(canvas);
}

export function syncGalaxyMapOverlay(canvas) {
  if (!canvas) return;
  ensureMounted(canvas);
  const root = els.root;
  if (!root) return;

  if (game.state !== 'galaxy_map') {
    root.classList.add('gm-hidden');
    root.setAttribute('aria-hidden', 'true');
    game.galaxyMapModal = null;
    lastGalaxyAssetProbeMs = 0;
    syncAreaModalDom();
    syncPortraitModalDom();
    return;
  }
  root.classList.remove('gm-hidden');
  root.setAttribute('aria-hidden', 'false');
  root.style.fontFamily = GM_FONT;

  probeGalaxyOptionalAssets(root);

  syncHeaderDom();
  syncCardAndNodes();
  syncToast();
  if (game.galaxyMapModal === 'area') fillAreaModalBody();
  syncAreaModalDom();
  syncPortraitModalDom();
}
