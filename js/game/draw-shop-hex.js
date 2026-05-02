/**
 * draw-shop-hex.js — PoE-style hex upgrade tree for shop Tab 0
 * ES module; exports drawShopHex + camera/selection helpers.
 */
import { SHOP_ITEMS, SHOP_MAX_LV, UPGRADE_LV_COSTS } from '../game-data.js';

// ── Constants ─────────────────────────────────────────────────
const HEX_PX = 54;
const ZOOM_MIN = 0.18;
const ZOOM_MAX = 3.0;
const PANEL_H = 180;
const CONTENT_TOP = 114; // below header/tabs

const ROLE_COL = {
  core: '#a0d4ff', atk: '#ff4d5e', def: '#39e58f',
  spd: '#b266ff',  ene: '#ffdd55',  arm: '#44aaff',
  spc: '#ff8833',  omega: '#e8e0ff',
};

// Set of ids that map to actual SHOP_ITEMS
const SHOP_IDS = new Set(SHOP_ITEMS.map(it => it.id));

// ── Node / Edge definitions ────────────────────────────────────
const NODES = [
  {id:'core', q:0,  r:0,  tier:0,role:'core', label:'CORE',         icon:'◈', sz:1.7},
  {id:'atk',  q:0,  r:-3, tier:1,role:'atk',  label:'攻撃',         icon:'✷', sz:1.15},
  {id:'def',  q:3,  r:-3, tier:1,role:'def',  label:'防御',         icon:'▣', sz:1.15},
  {id:'spd',  q:3,  r:0,  tier:1,role:'spd',  label:'機動',         icon:'≫', sz:1.15},
  {id:'ene',  q:0,  r:3,  tier:1,role:'ene',  label:'ENE',          icon:'⚡', sz:1.15},
  {id:'arm',  q:-3, r:3,  tier:1,role:'arm',  label:'装甲',         icon:'⬡', sz:1.15, mystery:true},
  {id:'spc',  q:-3, r:0,  tier:1,role:'spc',  label:'特殊',         icon:'◆', sz:1.15, mystery:true},
  // ATK fan
  {id:'atk_burst', q:-1,r:-4, tier:2,role:'atk',label:'バースト',     icon:'✦', mystery:true},
  {id:'firerate',  q:0, r:-5, tier:2,role:'atk',label:'速射強化',     icon:'»'},
  {id:'critrate',  q:1, r:-5, tier:2,role:'atk',label:'照準AI',       icon:'◎'},
  // DEF fan
  {id:'maxhp',     q:4, r:-5, tier:2,role:'def',label:'装甲強化',     icon:'♥'},
  {id:'dashcd',    q:5, r:-5, tier:2,role:'def',label:'スラスターCD', icon:'⟳'},
  {id:'def_regen', q:5, r:-4, tier:2,role:'def',label:'自動修復',     icon:'✚', mystery:true},
  // SPD fan
  {id:'spd_boost', q:5, r:-1, tier:2,role:'spd',label:'加速ブースト', icon:'»»', mystery:true},
  {id:'speed',     q:5, r:0,  tier:2,role:'spd',label:'エンジン',     icon:'▶'},
  {id:'spd_phase', q:4, r:1,  tier:2,role:'spd',label:'フェーズD',    icon:'◌', mystery:true},
  // ENE fan
  {id:'bulletspd', q:1, r:4,  tier:2,role:'ene',label:'弾速強化',     icon:'→'},
  {id:'ene_over',  q:0, r:5,  tier:2,role:'ene',label:'オーバーロード',icon:'⚡', mystery:true},
  {id:'ene_chain', q:-1,r:5,  tier:2,role:'ene',label:'チェーンボルト',icon:'⌁', mystery:true},
  // ARM fan (all mystery)
  {id:'arm1',q:-5,r:4, tier:2,role:'arm',label:'???',icon:'?',mystery:true},
  {id:'arm2',q:-5,r:5, tier:2,role:'arm',label:'???',icon:'?',mystery:true},
  {id:'arm3',q:-4,r:5, tier:2,role:'arm',label:'???',icon:'?',mystery:true},
  // SPC fan (all mystery)
  {id:'spc1',q:-4,r:-1,tier:2,role:'spc',label:'???',icon:'?',mystery:true},
  {id:'spc2',q:-5,r:0, tier:2,role:'spc',label:'???',icon:'?',mystery:true},
  {id:'spc3',q:-5,r:1, tier:2,role:'spc',label:'???',icon:'?',mystery:true},
  // Tier3 milestones
  {id:'t3_overclock',q:0,  r:-7, tier:3,role:'atk',label:'OVERCLOCK', icon:'⚠', milestone:true,sz:1.3,mystery:true},
  {id:'t3_reflect',  q:7,  r:-7, tier:3,role:'def',label:'REFLECT',   icon:'◫', milestone:true,sz:1.3,mystery:true},
  {id:'t3_ghost',    q:7,  r:0,  tier:3,role:'spd',label:'GHOST FORM',icon:'◌', milestone:true,sz:1.3,mystery:true},
  {id:'t3_nova',     q:0,  r:7,  tier:3,role:'ene',label:'NOVA BURST',icon:'★', milestone:true,sz:1.3,mystery:true},
  {id:'t3_titan',    q:-7, r:7,  tier:3,role:'arm',label:'???',        icon:'?', milestone:true,sz:1.3,mystery:true},
  {id:'t3_chaos',    q:-7, r:0,  tier:3,role:'spc',label:'???',        icon:'?', milestone:true,sz:1.3,mystery:true},
  {id:'omega',q:0,r:-9,tier:4,role:'omega',label:'ΩMEGA',icon:'Ω',sz:2.0,mystery:true},
];

const EDGES = [
  ['core','atk'],['core','def'],['core','spd'],['core','ene'],['core','arm'],['core','spc'],
  ['atk','atk_burst'],['atk','firerate'],['atk','critrate'],
  ['def','maxhp'],['def','dashcd'],['def','def_regen'],
  ['spd','spd_boost'],['spd','speed'],['spd','spd_phase'],
  ['ene','bulletspd'],['ene','ene_over'],['ene','ene_chain'],
  ['arm','arm1'],['arm','arm2'],['arm','arm3'],
  ['spc','spc1'],['spc','spc2'],['spc','spc3'],
  ['atk_burst','t3_overclock'],['firerate','t3_overclock'],['critrate','t3_overclock'],
  ['maxhp','t3_reflect'],['dashcd','t3_reflect'],['def_regen','t3_reflect'],
  ['spd_boost','t3_ghost'],['speed','t3_ghost'],['spd_phase','t3_ghost'],
  ['bulletspd','t3_nova'],['ene_over','t3_nova'],['ene_chain','t3_nova'],
  ['arm1','t3_titan'],['arm2','t3_titan'],
  ['spc1','t3_chaos'],['spc2','t3_chaos'],
  ['t3_overclock','omega'],['t3_reflect','omega'],['t3_ghost','omega'],
  ['t3_nova','omega'],['t3_titan','omega'],['t3_chaos','omega'],
];

// ── Axial → world coords ──────────────────────────────────────
function axialToWorld(q, r) {
  return { x: HEX_PX * Math.sqrt(3) * (q + r / 2), y: HEX_PX * 1.5 * r };
}
NODES.forEach(n => Object.assign(n, axialToWorld(n.q, n.r)));

const nodeMap = Object.fromEntries(NODES.map(n => [n.id, n]));
const parentMap = {};
EDGES.forEach(([a, b]) => { (parentMap[b] || (parentMap[b] = [])).push(a); });

// ── Camera state (module-level) ────────────────────────────────
let camX = 0, camY = -30, hexZoom = 0.72;
let selId = null;
let focusTargetX = 0, focusTargetY = -30, focusAnimating = false;

// req path highlight & burst effect state
let reqNodes = new Set();
let reqEdges = new Set(); // edges on the required unlock path
const bursts = []; // { wx, wy, color, t }

// ── Exported camera/selection helpers ─────────────────────────
export function shopHexPan(dx, dy) {
  focusAnimating = false;
  camX += dx / hexZoom;
  camY += dy / hexZoom;
}

export function shopHexZoomAt(factor, mx, my, W, H) {
  focusAnimating = false;
  const wx = (mx - W / 2) / hexZoom + camX;
  const wy = (my - H / 2) / hexZoom + camY;
  hexZoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, hexZoom * factor));
  camX = wx - (mx - W / 2) / hexZoom;
  camY = wy - (my - H / 2) / hexZoom;
}

export function setShopHexSel(id) {
  selId = id;
  const n = nodeMap[id];
  if (n) {
    focusTargetX = n.x; focusTargetY = n.y; focusAnimating = true;
    bursts.push({ wx: n.x, wy: n.y, color: ROLE_COL[n.role] || '#88ccff', t: 0 });
  }
}
export function clearShopHexSel() { selId = null; reqNodes = new Set(); reqEdges = new Set(); }
export function getShopHexSel() { return selId; }
export function resetShopHexCamera() {
  camX = 0; camY = -30; hexZoom = 0.72;
  focusTargetX = 0; focusTargetY = -30; focusAnimating = false;
}
export function setShopHexOverview() {
  camX = 0; camY = 30; hexZoom = 0.28;
  focusAnimating = false;
}

// Burst on upgrade — called from main.js after applyShopUpgrade
export function triggerShopHexBurst(id) {
  const n = nodeMap[id]; if (!n) return;
  const col = ROLE_COL[n.role] || '#88ccff';
  // 3 staggered bursts for normal upgrade
  bursts.push({ wx: n.x, wy: n.y, color: col, t: 0 });
  setTimeout(() => bursts.push({ wx: n.x, wy: n.y, color: col, t: 0 }), 80);
  setTimeout(() => bursts.push({ wx: n.x, wy: n.y, color: col, t: 0 }), 160);
  if (n.milestone || n.id === 'omega') {
    // milestone: extra 3 more waves
    for (let i = 1; i <= 3; i++) setTimeout(() => bursts.push({ wx: n.x, wy: n.y, color: col, t: 0 }), i * 140 + 200);
  }
}

// ── Prereqs (must mirror SHOP_PREREQS_SOLID in main.js) ──────────
const SHOP_PREREQS = {
  speed:    [],
  firerate: [],
  critrate: [{ id: 'firerate', lv: 2 }],
  maxhp:    [],
  dashcd:   [{ id: 'maxhp',   lv: 2 }],
  bulletspd:[{ id: 'speed',   lv: 2 }],
};

function computeRequiredPath(id, game) {
  reqNodes = new Set();
  reqEdges = new Set();
  function trace(nodeId) {
    if (isUnlocked(nodeId, game)) return;
    reqNodes.add(nodeId);
    (parentMap[nodeId] || []).forEach(pid => {
      reqEdges.add(`${pid}-${nodeId}`);
      trace(pid);
    });
  }
  trace(id);
}

// ── Game-state helpers ─────────────────────────────────────────
function isUnlocked(id, game) {
  if (id === 'core') return true;
  if (SHOP_IDS.has(id)) return (game.shopUpgrades?.[id] || 0) >= 1;
  // Category nodes: lit when at least one child SHOP item is upgraded
  const children = EDGES.filter(([a]) => a === id).map(([, b]) => b);
  return children.some(c => SHOP_IDS.has(c) && (game.shopUpgrades?.[c] || 0) >= 1);
}

function getLv(id, game) {
  if (id === 'core') return 1;
  return game.shopUpgrades?.[id] || 0;
}

function getMaxLv(id) {
  return SHOP_IDS.has(id) ? SHOP_MAX_LV : 1;
}

function getNodeCost(id, game) {
  if (!SHOP_IDS.has(id)) return null;
  const lv = getLv(id, game);
  if (lv >= SHOP_MAX_LV) return null;
  const row = UPGRADE_LV_COSTS[Math.min(lv, UPGRADE_LV_COSTS.length - 1)];
  if (!row) return null;
  return { coins: row[0], mats: row[1] || {}, stReq: row[2] || 0 };
}

function canAffordNode(id, game) {
  const c = getNodeCost(id, game);
  if (!c) return false;
  if (game.coins < c.coins) return false;
  for (const [k, v] of Object.entries(c.mats)) {
    const have = k === 'gems' ? (game.gems || 0) : (game.materials?.[k] || 0);
    if (have < v) return false;
  }
  return true;
}

// Match game's isShopPrereqsMet (SHOP_PREREQS_SOLID) exactly
function parentsOk(id, game) {
  const reqs = SHOP_PREREQS[id];
  if (!reqs || reqs.length === 0) return true;
  return reqs.every(r => getLv(r.id, game) >= r.lv);
}

function isUpgradeableNow(id, game) {
  if (!SHOP_IDS.has(id)) return false;
  if (!parentsOk(id, game)) return false;
  return getLv(id, game) < SHOP_MAX_LV;
}

function getShopItemIdx(id) {
  return SHOP_ITEMS.findIndex(it => it.id === id);
}

function getEffectText(id, game) {
  const lv = getLv(id, game);
  switch (id) {
    case 'speed':    return `移動速度 +${lv} → +${lv + 1}`;
    case 'firerate': return `連射速度 +${lv} → +${lv + 1}`;
    case 'maxhp':    return `最大HP +${lv * 20} → +${lv * 20 + 20}`;
    case 'bulletspd':return `弾速 +${lv * 3} → +${lv * 3 + 3}`;
    case 'critrate': return `CRIT率 +${lv * 5}% → +${(lv + 1) * 5}%`;
    case 'dashcd':   return `ダッシュCD Lv${lv} → Lv${lv + 1}`;
    default:         return '-';
  }
}

// ── Draw helpers ───────────────────────────────────────────────
function h2r(hex) {
  return `${parseInt(hex.slice(1,3),16)},${parseInt(hex.slice(3,5),16)},${parseInt(hex.slice(5,7),16)}`;
}

function w2s(wx, wy, W, H) {
  return { x: (wx - camX) * hexZoom + W / 2, y: (wy - camY) * hexZoom + H / 2 };
}

function hexPath(ctx, cx, cy, r) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = Math.PI / 6 + i * Math.PI / 3;
    const px = cx + r * Math.cos(a), py = cy + r * Math.sin(a);
    i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
  }
  ctx.closePath();
}

function drawLock(ctx, cx, cy, s, alpha) {
  ctx.save(); ctx.globalAlpha = alpha;
  const bw = s * 0.52, bh = s * 0.42, by = cy + s * 0.06;
  ctx.beginPath(); ctx.arc(cx, cy - s * 0.14, bw * 0.36, Math.PI, 0);
  ctx.strokeStyle = 'rgba(160,180,220,0.9)'; ctx.lineWidth = s * 0.14;
  ctx.lineCap = 'round'; ctx.stroke();
  ctx.fillStyle = 'rgba(160,180,220,0.9)';
  ctx.beginPath(); ctx.roundRect(cx - bw / 2, by, bw, bh, s * 0.1); ctx.fill();
  ctx.fillStyle = 'rgba(4,6,18,0.95)';
  ctx.beginPath(); ctx.arc(cx, by + bh * 0.38, s * 0.1, 0, Math.PI * 2); ctx.fill();
  ctx.fillRect(cx - s * 0.04, by + bh * 0.38, s * 0.08, bh * 0.32);
  ctx.restore();
}

function trimEdge(sa, sb, ra, rb) {
  const dx = sb.x - sa.x, dy = sb.y - sa.y, L = Math.hypot(dx, dy) || 1;
  if (ra + rb >= L - 2) return null;
  const ux = dx / L, uy = dy / L;
  return { sx: sa.x + ux * ra, sy: sa.y + uy * ra, ex: sb.x - ux * rb, ey: sb.y - uy * rb };
}

function getEdgeMode(aId, bId, game) {
  const a = nodeMap[aId], b = nodeMap[bId];
  if (!a || !b) return 'off';
  const aUnl = isUnlocked(aId, game), bUnl = isUnlocked(bId, game);
  if (selId) {
    const key = `${aId}-${bId}`;
    if (reqEdges.has(key)) return 'req';
    if (selId === bId && aUnl) return 'sel';
  }
  if (aUnl && bUnl) return 'on';
  if (b.mystery) return 'off';
  return 'ghost';
}

// ── Nebula ────────────────────────────────────────────────────
const NEBULA_CENTERS = [
  {nid:'firerate',role:'atk'},{nid:'dashcd',role:'def'},
  {nid:'speed',role:'spd'},{nid:'ene_over',role:'ene'},
  {nid:'arm2',role:'arm'},{nid:'spc2',role:'spc'},
];

function drawNebula(ctx, W, H, frame) {
  ctx.save();
  NEBULA_CENTERS.forEach(({ nid, role }) => {
    const n = nodeMap[nid]; if (!n) return;
    const sc = w2s(n.x, n.y, W, H);
    const r = Math.max(W, H) * 0.55;
    const col = ROLE_COL[role] || '#88ccff';
    const rgb = h2r(col);
    const b = 0.7 + 0.3 * Math.sin(frame * 0.012 + n.q * 0.5);
    const g = ctx.createRadialGradient(sc.x, sc.y, 0, sc.x, sc.y, r);
    g.addColorStop(0, `rgba(${rgb},${0.052 * b})`);
    g.addColorStop(0.32, `rgba(${rgb},${0.018 * b})`);
    g.addColorStop(1, 'transparent');
    ctx.fillStyle = g; ctx.fillRect(0, CONTENT_TOP, W, H - CONTENT_TOP);
  });
  ctx.restore();
}

// ── Hex grid background ────────────────────────────────────────
function drawHexGrid(ctx, W, H) {
  const margin = HEX_PX * 2;
  const qR = Math.ceil(W / (HEX_PX * Math.sqrt(3) * hexZoom)) + 3;
  const rR = Math.ceil(H / (HEX_PX * 1.5 * hexZoom)) + 3;
  const cq = Math.round(camX / (HEX_PX * Math.sqrt(3)));
  const cr = Math.round(camY / (HEX_PX * 1.5));
  ctx.save();
  ctx.strokeStyle = 'rgba(50,80,140,0.055)'; ctx.lineWidth = 0.6;
  for (let dq = -qR; dq <= qR; dq++) {
    for (let dr = -rR; dr <= rR; dr++) {
      const q = cq + dq, r = cr + dr;
      const wp = axialToWorld(q, r);
      const sc = w2s(wp.x, wp.y, W, H);
      if (sc.x < -margin || sc.x > W + margin || sc.y < -margin || sc.y > H + margin) continue;
      const hr = HEX_PX * hexZoom;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = Math.PI / 6 + i * Math.PI / 3;
        const px = sc.x + hr * Math.cos(a), py = sc.y + hr * Math.sin(a);
        i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
      }
      ctx.closePath(); ctx.stroke();
    }
  }
  ctx.restore();
}

// ── Edge drawing ───────────────────────────────────────────────
function drawEdge(ctx, aId, bId, W, H, frame, game) {
  const a = nodeMap[aId], b = nodeMap[bId]; if (!a || !b) return;
  const sa = w2s(a.x, a.y, W, H), sb = w2s(b.x, b.y, W, H);
  const ra = (a.sz || 1) * 17 * hexZoom * 0.82, rb = (b.sz || 1) * 17 * hexZoom * 0.82;
  const seg = trimEdge(sa, sb, ra, rb); if (!seg) return;
  const { sx, sy, ex, ey } = seg;
  const mode = getEdgeMode(aId, bId, game); if (mode === 'off') return;
  const col = ROLE_COL[b.role] || '#88ccff'; const rgb = h2r(col);
  const pulse = 0.5 + 0.5 * Math.sin(frame * 0.08);
  ctx.save(); ctx.lineCap = 'round';
  if (mode === 'sel') {
    ctx.strokeStyle = col; ctx.lineWidth = 10 * hexZoom; ctx.globalAlpha = 0.12; ctx.shadowBlur = 0;
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke();
    ctx.lineWidth = 4.5 * hexZoom; ctx.globalAlpha = 0.30; ctx.shadowColor = col; ctx.shadowBlur = 18 * hexZoom;
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke(); ctx.shadowBlur = 0;
    ctx.lineWidth = 1.6 * hexZoom; ctx.globalAlpha = 0.92; ctx.shadowColor = col; ctx.shadowBlur = 18 * 0.7 * hexZoom;
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke(); ctx.shadowBlur = 0;
  } else if (mode === 'on') {
    ctx.strokeStyle = col; ctx.lineWidth = 7 * hexZoom; ctx.globalAlpha = 0.06; ctx.shadowBlur = 0;
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke();
    ctx.lineWidth = 3 * hexZoom; ctx.globalAlpha = 0.11; ctx.shadowColor = col; ctx.shadowBlur = 8 * hexZoom;
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke(); ctx.shadowBlur = 0;
    ctx.lineWidth = 0.85 * hexZoom; ctx.globalAlpha = 0.32 + 0.10 * Math.sin(frame * 0.032 + a.q); ctx.shadowColor = col; ctx.shadowBlur = 8 * 0.7 * hexZoom;
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke(); ctx.shadowBlur = 0;
  } else if (mode === 'req') {
    const pulse = 0.5 + 0.5 * Math.sin(frame * 0.08);
    ctx.strokeStyle = '#ff9900'; ctx.lineWidth = 8 * hexZoom; ctx.globalAlpha = 0.09 + 0.06 * pulse;
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke();
    ctx.strokeStyle = '#ffaa33'; ctx.lineWidth = 3.5 * hexZoom; ctx.globalAlpha = 0.22 + 0.18 * pulse;
    ctx.shadowColor = '#ffcc44'; ctx.shadowBlur = 18 * hexZoom * pulse;
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke(); ctx.shadowBlur = 0;
    ctx.strokeStyle = '#ffee88'; ctx.lineWidth = Math.max(1.2, 1.5 * hexZoom); ctx.globalAlpha = 0.75 + 0.22 * pulse;
    ctx.shadowColor = '#fff0a0'; ctx.shadowBlur = 12 * hexZoom * pulse;
    ctx.setLineDash([6 * hexZoom, 4 * hexZoom]);
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke();
    ctx.setLineDash([]); ctx.shadowBlur = 0;
  } else if (mode === 'ghost') {
    ctx.strokeStyle = `rgba(${rgb},0.18)`; ctx.lineWidth = 0.8 * hexZoom;
    ctx.setLineDash([3 * hexZoom, 7 * hexZoom]);
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke(); ctx.setLineDash([]);
  }
  ctx.globalAlpha = 1; ctx.shadowBlur = 0; ctx.restore();
}

// ── Particles ─────────────────────────────────────────────────
function drawParticles(ctx, aId, bId, W, H, frame, game) {
  const a = nodeMap[aId], b = nodeMap[bId]; if (!a || !b) return;
  const mode = getEdgeMode(aId, bId, game);
  if (mode !== 'on' && mode !== 'sel' && mode !== 'req') return;
  const sa = w2s(a.x, a.y, W, H), sb = w2s(b.x, b.y, W, H);
  const ra = (a.sz || 1) * 17 * hexZoom * 0.82, rb = (b.sz || 1) * 17 * hexZoom * 0.82;
  const seg = trimEdge(sa, sb, ra, rb); if (!seg) return;
  const { sx, sy, ex, ey } = seg;
  const col = mode === 'req' ? '#ffcc66' : (ROLE_COL[b.role] || '#88ccff');
  const spd = mode === 'req' ? 0.75 : 1.0;
  [0, 0.5].forEach(off => {
    const t = ((frame * spd + off * 110) % 110) / 110;
    const fade = 1 - Math.abs(t - 0.5) * 2.2; if (fade <= 0) return;
    const px = sx + (ex - sx) * t, py = sy + (ey - sy) * t;
    ctx.save(); ctx.fillStyle = col; ctx.shadowColor = col; ctx.shadowBlur = 10 * hexZoom * fade;
    ctx.globalAlpha = 0.88 * fade; ctx.beginPath(); ctx.arc(px, py, 2.5 * hexZoom, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  });
}

// ── Node drawing ───────────────────────────────────────────────
function drawNode(ctx, n, W, H, frame, game) {
  const sc = w2s(n.x, n.y, W, H);
  if (sc.x < -100 || sc.x > W + 100 || sc.y < CONTENT_TOP - 60 || sc.y > H + 100) return;
  const r = (n.sz || 1) * 18 * hexZoom;
  const col = ROLE_COL[n.role] || '#88ccff'; const rgb = h2r(col);
  const sel = selId === n.id;
  const isReq = reqNodes.has(n.id);
  const isOmega = n.id === 'omega';
  const unlocked = isUnlocked(n.id, game);
  const lv = getLv(n.id, game);
  const maxLv = getMaxLv(n.id);
  const isMax = lv >= maxLv && maxLv > 0;
  const pulse = 0.75 + 0.25 * Math.sin(frame * 0.055 + n.q * 0.7 + n.r * 0.4);
  const rp = 0.5 + 0.5 * Math.sin(frame * 0.09); // req pulse
  ctx.save();
  if (sel) { ctx.shadowColor = col; ctx.shadowBlur = Math.max(32, 52 * hexZoom); }
  else if (isReq && !unlocked) { ctx.shadowColor = '#ffcc66'; ctx.shadowBlur = 22 * hexZoom * rp; }
  else if (unlocked) { ctx.shadowColor = col; ctx.shadowBlur = 18 * hexZoom * pulse; }
  else if (n.milestone && !n.mystery) { ctx.shadowColor = col; ctx.shadowBlur = 6 * hexZoom; }
  ctx.fillStyle = isOmega ? `hsl(${(frame * 1.5) % 360},60%,8%)` : n.mystery ? '#030508' : unlocked ? '#080e1c' : '#060810';
  hexPath(ctx, sc.x, sc.y, r); ctx.fill(); ctx.shadowBlur = 0;
  // inner glow clip
  ctx.save(); hexPath(ctx, sc.x, sc.y, r); ctx.clip();
  if (isOmega) {
    const hue = (frame * 1.5) % 360;
    const g = ctx.createRadialGradient(sc.x, sc.y - r * 0.2, 0, sc.x, sc.y, r);
    g.addColorStop(0, `hsla(${hue},100%,65%,0.28)`);
    g.addColorStop(0.6, `hsla(${(hue + 120) % 360},100%,50%,0.10)`);
    g.addColorStop(1, 'transparent');
    ctx.fillStyle = g; ctx.fillRect(sc.x - r, sc.y - r, r * 2, r * 2);
  } else if (sel) {
    const selP = 0.6 + 0.4 * Math.sin(frame * 0.10);
    const g = ctx.createRadialGradient(sc.x, sc.y - r * 0.2, 0, sc.x, sc.y, r);
    g.addColorStop(0, `rgba(${rgb},${0.38 * selP})`);
    g.addColorStop(0.5, `rgba(${rgb},${0.18 * selP})`);
    g.addColorStop(1, 'rgba(0,0,0,0.01)');
    ctx.fillStyle = g; ctx.fillRect(sc.x - r, sc.y - r, r * 2, r * 2);
  } else if (unlocked || isReq || (n.milestone && !n.mystery)) {
    const gcol = isReq ? '255,170,50' : rgb;
    const alpha = unlocked ? 0.20 : isReq ? 0.10 : 0.06;
    const g = ctx.createRadialGradient(sc.x, sc.y - r * 0.2, 0, sc.x, sc.y, r);
    g.addColorStop(0, `rgba(${gcol},${alpha})`); g.addColorStop(1, 'rgba(0,0,0,0.01)');
    ctx.fillStyle = g; ctx.fillRect(sc.x - r, sc.y - r, r * 2, r * 2);
  }
  const hg = ctx.createLinearGradient(sc.x, sc.y - r, sc.x, sc.y + r);
  hg.addColorStop(0, 'rgba(255,255,255,0.07)'); hg.addColorStop(0.4, 'rgba(255,255,255,0.01)');
  hg.addColorStop(1, 'rgba(0,0,0,0.06)');
  ctx.fillStyle = hg; ctx.fillRect(sc.x - r, sc.y - r, r * 2, r * 2); ctx.restore();
  // border
  if (isOmega) {
    const hue = (frame * 1.5) % 360;
    ctx.strokeStyle = `hsl(${hue},100%,68%)`; ctx.lineWidth = 2 * hexZoom;
    ctx.globalAlpha = 0.85 * pulse; ctx.shadowColor = `hsl(${hue},100%,65%)`; ctx.shadowBlur = 14 * hexZoom;
  } else if (sel) {
    ctx.strokeStyle = col; ctx.lineWidth = Math.max(2.5, 3 * hexZoom); ctx.shadowColor = col; ctx.shadowBlur = Math.max(22, 32 * hexZoom);
  } else if (isReq && !unlocked) {
    ctx.strokeStyle = '#ffaa33'; ctx.lineWidth = 1.8 * hexZoom;
    ctx.globalAlpha = 0.6 + 0.35 * rp; ctx.shadowColor = '#ffcc66'; ctx.shadowBlur = 14 * hexZoom * rp;
  } else if (unlocked) {
    ctx.strokeStyle = col; ctx.lineWidth = 1.5 * hexZoom;
    ctx.globalAlpha = 0.82 * pulse; ctx.shadowColor = col; ctx.shadowBlur = 10 * hexZoom * pulse;
  } else if (n.mystery) {
    ctx.strokeStyle = `rgba(${rgb},0.10)`; ctx.lineWidth = 0.8 * hexZoom;
  } else {
    ctx.strokeStyle = `rgba(${rgb},0.34)`; ctx.lineWidth = 1.0 * hexZoom;
  }
  hexPath(ctx, sc.x, sc.y, r); ctx.stroke(); ctx.globalAlpha = 1; ctx.shadowBlur = 0;
  // milestone outer ring
  if (n.milestone && !n.mystery) {
    ctx.strokeStyle = col; ctx.lineWidth = 0.6 * hexZoom;
    ctx.globalAlpha = unlocked ? 0.28 * pulse : 0.13;
    ctx.setLineDash([3 * hexZoom, 4 * hexZoom]); hexPath(ctx, sc.x, sc.y, r + 5 * hexZoom); ctx.stroke();
    ctx.setLineDash([]); ctx.globalAlpha = 1;
  }
  // MAX badge
  if (isMax && unlocked && hexZoom > 0.36 && n.id !== 'core') {
    const bx = sc.x + r * 0.62, by = sc.y - r * 0.62, bsz = Math.max(5, 7 * hexZoom);
    ctx.fillStyle = 'rgba(255,210,40,0.90)'; ctx.shadowColor = '#ffdd00'; ctx.shadowBlur = 8 * hexZoom;
    ctx.beginPath(); ctx.arc(bx, by, bsz * 0.78, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
    ctx.fillStyle = '#1a1000'; ctx.font = `bold ${bsz * 0.72}px 'Courier New',monospace`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('M', bx, by + 0.5);
  }
  // req ! badge
  if (isReq && !unlocked && hexZoom > 0.44) {
    const bx = sc.x + r * 0.64, by = sc.y - r * 0.64, bsz = Math.max(5, 7.5 * hexZoom);
    ctx.fillStyle = 'rgba(255,140,30,0.95)'; ctx.shadowColor = '#ffcc66'; ctx.shadowBlur = 10 * hexZoom;
    ctx.beginPath(); ctx.arc(bx, by, bsz * 0.75, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
    ctx.fillStyle = '#1a0800'; ctx.font = `bold ${bsz * 0.9}px 'Courier New',monospace`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('!', bx, by + 0.5);
  }
  // icon
  if (hexZoom > 0.28) {
    const isz = Math.max(8, (n.sz || 1) * 13 * hexZoom);
    ctx.font = `bold ${isz}px 'Courier New',monospace`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    if (isOmega) {
      const hue = (frame * 1.5) % 360;
      ctx.fillStyle = `hsl(${hue},100%,78%)`; ctx.shadowColor = `hsl(${hue},100%,65%)`; ctx.shadowBlur = 18 * hexZoom;
    } else if (unlocked) {
      ctx.fillStyle = col; ctx.shadowColor = col; ctx.shadowBlur = 9 * hexZoom;
    } else if (n.mystery) {
      ctx.fillStyle = `rgba(${rgb},0.13)`;
    } else {
      ctx.fillStyle = `rgba(${rgb},0.38)`;
    }
    if (!n.mystery) ctx.fillText(n.icon, sc.x, sc.y);
    ctx.shadowBlur = 0;
  }
  // lock (req nodes use higher alpha)
  if (!unlocked && hexZoom > 0.3) {
    drawLock(ctx, sc.x, sc.y, (n.sz || 1) * 8.5 * hexZoom, n.mystery ? 0.14 : isReq ? 0.72 : 0.40);
  }
  // label
  if (hexZoom > 0.44 && !n.mystery) {
    const lsz = Math.max(6, 7 * hexZoom * (n.sz || 1));
    ctx.font = `700 ${lsz}px 'Orbitron','Courier New',monospace`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.fillStyle = unlocked ? 'rgba(225,238,255,0.88)' : isReq ? 'rgba(255,190,100,0.72)' : 'rgba(128,152,192,0.40)';
    const lbl = n.label.length > 9 ? n.label.slice(0, 9) + '…' : n.label;
    ctx.fillText(lbl, sc.x, sc.y + r + 4 * hexZoom);
  }
  // upgradeable pulse
  if (isUpgradeableNow(n.id, game) && hexZoom > 0.22) {
    const upP = 0.5 + 0.5 * Math.sin(frame * 0.055 + n.q * 0.4 + n.r * 0.3);
    const upR = r + (5 + 4 * upP) * hexZoom;
    ctx.strokeStyle = col; ctx.lineWidth = 1.4 * hexZoom;
    ctx.globalAlpha = (unlocked ? 0.12 : 0.22) + 0.18 * upP;
    ctx.shadowColor = col; ctx.shadowBlur = 14 * hexZoom * upP;
    hexPath(ctx, sc.x, sc.y, upR); ctx.stroke();
    ctx.shadowBlur = 0; ctx.globalAlpha = 1;
  }
  // selected dashed ring + solid outer ring
  if (sel) {
    const selPulse = 0.6 + 0.4 * Math.sin(frame * 0.10);
    ctx.strokeStyle = col; ctx.lineWidth = Math.max(1.5, 2.2 * hexZoom);
    ctx.globalAlpha = 0.55 * selPulse; ctx.shadowColor = col; ctx.shadowBlur = Math.max(12, 18 * hexZoom);
    ctx.setLineDash([5 * hexZoom, 3.5 * hexZoom]); hexPath(ctx, sc.x, sc.y, r + 10 * hexZoom); ctx.stroke();
    ctx.setLineDash([]);
    // outer glow ring (solid, faint)
    ctx.lineWidth = Math.max(1, 1.5 * hexZoom); ctx.globalAlpha = 0.22 * selPulse;
    hexPath(ctx, sc.x, sc.y, r + 17 * hexZoom); ctx.stroke();
    ctx.globalAlpha = 1; ctx.shadowBlur = 0;
  }
  ctx.restore();
}

// ── Node info export (for HTML panel in main.js) ───────────────
export function getShopHexNodeInfo(id) {
  const n = nodeMap[id];
  if (!n) return null;
  return {
    role: n.role, label: n.label, icon: n.icon,
    tier: n.tier, mystery: n.mystery, milestone: n.milestone,
    isShopItem: SHOP_IDS.has(id),
  };
}

// ── Stars (static seed per session) ───────────────────────────
const STARS = Array.from({ length: 200 }, () => ({
  x: (Math.random() - 0.5) * 5000, y: (Math.random() - 0.5) * 5000,
  r: Math.random() * 1.2 + 0.2, a: Math.random() * 0.5 + 0.12, d: Math.random() * 0.02,
}));

// ── Branch jump buttons (③) ────────────────────────────────────
const BRANCH_BTNS = [
  { id: 'atk', label: 'ATK', role: 'atk' },
  { id: 'def', label: 'DEF', role: 'def' },
  { id: 'spd', label: 'SPD', role: 'spd' },
  { id: 'ene', label: 'ENE', role: 'ene' },
];

function drawBranchBtns(ctx, W, H, game, frame) {
  const bY = CONTENT_TOP + 8;

  // Left side: Home (⌂) + Overview (⊞) buttons
  const navBtns = [
    { type: 'hexhome',     label: '⌂', title: 'HOME' },
    { type: 'hexoverview', label: '⊡', title: 'ALL'  },
  ];
  const nBW = 30, nBH = 22, nGap = 5;
  navBtns.forEach((nb, i) => {
    const bx = 10 + i * (nBW + nGap);
    ctx.save();
    ctx.fillStyle = 'rgba(255,140,0,0.10)';
    ctx.strokeStyle = 'rgba(255,140,0,0.38)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(bx, bY, nBW, nBH, 5); ctx.fill(); ctx.stroke();
    ctx.font = `bold 11px 'Courier New',monospace`;
    ctx.fillStyle = 'rgba(255,180,80,0.88)';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(nb.label, bx + nBW / 2, bY + nBH / 2);
    ctx.restore();
    game._shopHits.push({ type: nb.type, x: bx, y: bY, w: nBW, h: nBH });
  });

  // Right side: Branch jump buttons
  const bW = 46, bH = 22, gap = 6;
  const totalW = BRANCH_BTNS.length * bW + (BRANCH_BTNS.length - 1) * gap;
  const startX = W - totalW - 10;
  BRANCH_BTNS.forEach((b, i) => {
    const bx = startX + i * (bW + gap);
    const col = ROLE_COL[b.role] || '#88ccff';
    const rgb = h2r(col);
    const isSel = selId === b.id;
    ctx.save();
    ctx.fillStyle = isSel ? `rgba(${rgb},0.28)` : `rgba(${rgb},0.10)`;
    ctx.strokeStyle = isSel ? col : `rgba(${rgb},0.42)`;
    ctx.lineWidth = isSel ? 1.5 : 1;
    if (isSel) { ctx.shadowColor = col; ctx.shadowBlur = 10; }
    ctx.beginPath(); ctx.roundRect(bx, bY, bW, bH, 5); ctx.fill(); ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.font = `bold 9px 'Orbitron','Courier New',monospace`;
    ctx.fillStyle = isSel ? 'rgba(240,248,255,0.95)' : `rgba(${rgb},0.80)`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(b.label, bx + bW / 2, bY + bH / 2);
    ctx.restore();
    game._shopHits.push({ type: 'hexnode', id: b.id, x: bx, y: bY, w: bW, h: bH });
  });
}

// ── Main export ────────────────────────────────────────────────
export function drawShopHex(ctx, W, H, game, frame) {
  if (!game._shopHits) game._shopHits = [];

  // ① smooth camera auto-focus (lerp toward focusTarget)
  if (focusAnimating) {
    const spd = 0.16;
    camX += (focusTargetX - camX) * spd;
    camY += (focusTargetY - camY) * spd;
    if (Math.abs(focusTargetX - camX) < 0.8 && Math.abs(focusTargetY - camY) < 0.8) {
      camX = focusTargetX; camY = focusTargetY; focusAnimating = false;
    }
  }

  // Clip to content area
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, CONTENT_TOP, W, H - CONTENT_TOP);
  ctx.clip();

  // Background
  ctx.fillStyle = '#04060f';
  ctx.fillRect(0, CONTENT_TOP, W, H - CONTENT_TOP);

  // Vignette
  const vg = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H) * 0.72);
  vg.addColorStop(0, 'transparent'); vg.addColorStop(1, 'rgba(0,0,8,0.52)');
  ctx.fillStyle = vg; ctx.fillRect(0, CONTENT_TOP, W, H - CONTENT_TOP);

  drawHexGrid(ctx, W, H);
  drawNebula(ctx, W, H, frame);

  // Stars
  STARS.forEach(s => {
    const p = w2s(s.x, s.y, W, H);
    if (p.x < -2 || p.x > W + 2 || p.y < CONTENT_TOP - 2 || p.y > H + 2) return;
    const tw = s.a * (0.55 + 0.45 * Math.sin(frame * s.d + s.x * 0.01));
    ctx.fillStyle = `rgba(185,210,255,${tw})`;
    ctx.beginPath(); ctx.arc(p.x, p.y, s.r, 0, Math.PI * 2); ctx.fill();
  });

  // Update req path for currently selected node
  if (selId) computeRequiredPath(selId, game);

  // Edges & particles
  EDGES.forEach(([a, b]) => drawEdge(ctx, a, b, W, H, frame, game));
  EDGES.forEach(([a, b]) => drawParticles(ctx, a, b, W, H, frame, game));

  // Nodes + register hit areas
  NODES.forEach(n => {
    const sc = w2s(n.x, n.y, W, H);
    if (sc.x < -100 || sc.x > W + 100 || sc.y < CONTENT_TOP - 60 || sc.y > H + 100) return;
    drawNode(ctx, n, W, H, frame, game);
    const r = (n.sz || 1) * 18 * hexZoom;
    const hitR = Math.max(22, r);
    if (sc.y + r > CONTENT_TOP && sc.y - r < H - (selId ? PANEL_H : 0)) {
      game._shopHits.push({ type: 'hexnode', id: n.id, x: sc.x - hitR, y: sc.y - hitR, w: hitR * 2, h: hitR * 2 });
    }
  });

  // Burst effects
  for (let i = bursts.length - 1; i >= 0; i--) {
    const b = bursts[i];
    b.t += 0.025;
    if (b.t >= 1) { bursts.splice(i, 1); continue; }
    const sc = w2s(b.wx, b.wy, W, H);
    const rgb = h2r(b.color);
    [0, 0.20, 0.40].forEach(off => {
      const t = Math.max(0, b.t - off); if (t <= 0) return;
      const rr = t * 160 * hexZoom, alpha = (1 - t) * (1 - off) * 0.85;
      ctx.save(); ctx.strokeStyle = `rgba(${rgb},${alpha})`;
      ctx.lineWidth = Math.max(2, (1 - t) * 6 * hexZoom);
      ctx.shadowColor = b.color; ctx.shadowBlur = Math.max(16, 32 * (1 - t) * hexZoom);
      hexPath(ctx, sc.x, sc.y, rr); ctx.stroke(); ctx.restore();
    });
    if (b.t < 0.25) {
      // initial bright flash fill
      const fa = (1 - b.t / 0.25) * 0.72;
      const fr = Math.max(60, 110 * hexZoom);
      const g = ctx.createRadialGradient(sc.x, sc.y, 0, sc.x, sc.y, fr);
      g.addColorStop(0, `rgba(255,255,255,${fa * 0.45})`);
      g.addColorStop(0.25, `rgba(${rgb},${fa})`);
      g.addColorStop(1, 'transparent');
      ctx.fillStyle = g; ctx.fillRect(sc.x - fr, sc.y - fr, fr * 2, fr * 2);
    }
  }

  // Zoom indicator
  ctx.fillStyle = 'rgba(255,140,0,0.22)'; ctx.font = `9px 'Courier New',monospace`;
  ctx.textAlign = 'right'; ctx.textBaseline = 'alphabetic';
  ctx.fillText(`×${hexZoom.toFixed(2)}`, W - 12, H - (selId ? PANEL_H : 0) - 6);
  ctx.textAlign = 'left';

  ctx.restore(); // end content clip

  // branch jump buttons (above panel, not clipped)
  drawBranchBtns(ctx, W, H, game, frame);
}
