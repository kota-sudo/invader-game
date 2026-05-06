import { CANVAS_W as W, CANVAS_H as H } from '../game/constants.js';

let drawDeps;
export function setWorldBgDrawDeps(deps) { drawDeps = deps; }

const _bgTexCache = new Map();

function _mulberry32(seed) {
  let t = seed >>> 0;
  return function () {
    t += 0x6D2B79F5;
    let x = t;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

function getMarsPlanetTexture(d) {
  const key = `mars_${d}`;
  if (_bgTexCache.has(key)) return _bgTexCache.get(key);
  const c = document.createElement('canvas');
  c.width = d; c.height = d;
  const g = c.getContext('2d');
  const r = d / 2, cx = r, cy = r;
  const rand = _mulberry32(0x4d415253 ^ d); // "MARS"

  const base = g.createRadialGradient(cx - r * 0.35, cy - r * 0.35, r * 0.08, cx, cy, r);
  base.addColorStop(0, 'rgba(255,170,130,1)');
  base.addColorStop(0.35, 'rgba(200,80,50,1)');
  base.addColorStop(0.75, 'rgba(90,25,18,1)');
  base.addColorStop(1, 'rgba(20,6,6,1)');
  g.fillStyle = base;
  g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.fill();

  g.save();
  g.globalAlpha = 0.18;
  g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.clip();
  for (let i = 0; i < 120; i++) {
    const y = (rand() * 2 - 1) * r * 0.9;
    const h = 1 + rand() * 2.2;
    const x = -r + rand() * r * 0.6;
    const w = r * 2.2 * (0.4 + rand() * 0.8);
    g.fillStyle = `rgba(255,${80 + Math.floor(rand() * 70)},${40 + Math.floor(rand() * 40)},${0.12 + rand() * 0.18})`;
    g.fillRect(cx + x, cy + y, w, h);
  }
  g.restore();

  g.save();
  g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.clip();
  g.globalAlpha = 0.22;
  for (let i = 0; i < 850; i++) {
    const a = rand() * Math.PI * 2;
    const rr = Math.sqrt(rand()) * r * 0.98;
    const x = cx + Math.cos(a) * rr;
    const y = cy + Math.sin(a) * rr;
    const t = rand();
    g.fillStyle = t < 0.7 ? 'rgba(0,0,0,0.12)' : t < 0.9 ? 'rgba(255,220,190,0.10)' : 'rgba(140,40,25,0.12)';
    g.fillRect(x, y, 1, 1);
  }
  g.restore();

  g.save();
  g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.clip();
  for (let i = 0; i < 9; i++) {
    const a = rand() * Math.PI * 2;
    const rr = Math.sqrt(rand()) * r * 0.72;
    const x = cx + Math.cos(a) * rr;
    const y = cy + Math.sin(a) * rr;
    const cr = 4 + rand() * 10;
    g.globalAlpha = 0.35;
    g.fillStyle = 'rgba(0,0,0,0.35)';
    g.beginPath(); g.ellipse(x + cr * 0.18, y + cr * 0.18, cr * 1.05, cr * 0.85, rand() * 0.8, 0, Math.PI * 2); g.fill();
    g.globalAlpha = 0.40;
    g.strokeStyle = 'rgba(255,160,120,0.28)';
    g.lineWidth = 1.2;
    g.beginPath(); g.ellipse(x, y, cr, cr * 0.8, rand() * 0.8, 0, Math.PI * 2); g.stroke();
  }
  g.restore();

  const rim = g.createRadialGradient(cx, cy, r * 0.86, cx, cy, r * 1.02);
  rim.addColorStop(0, 'transparent');
  rim.addColorStop(0.65, 'rgba(255,120,90,0.20)');
  rim.addColorStop(1, 'transparent');
  g.fillStyle = rim;
  g.beginPath(); g.arc(cx, cy, r * 1.02, 0, Math.PI * 2); g.fill();

  _bgTexCache.set(key, c);
  return c;
}

export function drawWorldBgObjects(worldNum) {
  const ctx = drawDeps.ctx;
  ctx.save(); ctx.globalAlpha = 0.18;
  if (worldNum === 1) {
    const tex = getMarsPlanetTexture(256);
    const x = 388, y = 64, r = 92;
    ctx.save();
    ctx.globalAlpha = 0.22;
    ctx.translate(x, y);
    ctx.drawImage(tex, -r, -r, r * 2, r * 2);
    const glow = ctx.createRadialGradient(0, 0, r * 0.8, 0, 0, r * 1.35);
    glow.addColorStop(0, 'rgba(255,100,70,0.12)');
    glow.addColorStop(1, 'transparent');
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(0, 0, r * 1.35, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  } else if (worldNum === 2) {
    [{ x: 380, y: 70, r: 75, c: '#aa8800' }, { x: 25, y: 350, r: 50, c: '#887700' }, { x: 450, y: 400, r: 40, c: '#ccaa00' }].forEach(n => {
      const g = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r);
      g.addColorStop(0, n.c + 'cc'); g.addColorStop(0.5, n.c + '44'); g.addColorStop(1, 'transparent');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2); ctx.fill();
    });
  } else if (worldNum === 3) {
    const jx = 390, jy = 65, jr = 72;
    const gj = ctx.createRadialGradient(jx, jy, 0, jx, jy, jr);
    gj.addColorStop(0, '#cc7733'); gj.addColorStop(1, '#442200');
    ctx.fillStyle = gj; ctx.beginPath(); ctx.arc(jx, jy, jr, 0, Math.PI * 2); ctx.fill();
    ctx.save(); ctx.clip();
    ctx.fillStyle = 'rgba(180,90,30,0.5)';
    [-20, -6, 8, 22].forEach(dy => ctx.fillRect(jx - jr, jy + dy, jr * 2, 5));
    ctx.restore();
  } else {
    const sx = 390, sy = 65, sr = 55;
    const gs = ctx.createRadialGradient(sx, sy, 0, sx, sy, sr);
    gs.addColorStop(0, '#ccbbaa'); gs.addColorStop(1, '#443322');
    ctx.fillStyle = gs; ctx.beginPath(); ctx.arc(sx, sy, sr, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#ccbbaa'; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.ellipse(sx, sy, sr * 2.2, sr * 0.45, -0.2, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = '#aa9977'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.ellipse(sx, sy, sr * 1.7, sr * 0.35, -0.2, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.restore();
}
