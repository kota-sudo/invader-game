/**
 * Player ship silhouette for previews, customize, stage map, and gameplay.
 * Local coords are absolute canvas coords (caller may ctx.translate first).
 */
import { game } from '../game/game-store.js';
import { SHIP_SHAPES, SHIP_COLORS } from '../game-data.js';
import { hexToRgb } from '../game/color-utils.js';

export function drawShipShape(ctx, x, y, w, h, shapeId, fillColor = null, rarity = null) {
  const shape = shapeId || SHIP_SHAPES[game.shipShapeIdx].id;
  const col = fillColor || SHIP_COLORS[game.shipColorIdx].hex;
  const rar = String(rarity || '');
  const fx = (() => {
    if (rar === 'LR') return { strokeA: 0.26, rimA: 0.70, rimB: 16, rr: 3.2 };
    if (rar === 'SSR') return { strokeA: 0.22, rimA: 0.55, rimB: 12, rr: 2.8 };
    if (rar === 'SR') return { strokeA: 0.18, rimA: 0.40, rimB: 9, rr: 2.4 };
    if (rar === 'R') return { strokeA: 0.14, rimA: 0.28, rimB: 7, rr: 2.0 };
    if (rar === 'N') return { strokeA: 0.12, rimA: 0.20, rimB: 6, rr: 1.8 };
    return { strokeA: 0.10, rimA: 0.18, rimB: 5, rr: 1.6 };
  })();

  const rgb = (() => { try { return hexToRgb(col); } catch (e) { return null; } })();
  const rgba = (a) => rgb ? `rgba(${rgb},${a})` : col;

  const fillGrad = (x0, y0, x1, y1, a0, a1, a2) => {
    const g = ctx.createLinearGradient(x0, y0, x1, y1);
    g.addColorStop(0, rgba(a0));
    g.addColorStop(0.55, rgba(a1));
    g.addColorStop(1, rgba(a2));
    return g;
  };
  const part = (rx, ry, rw, rh, r = 2) => {
    ctx.fillStyle = fillGrad(rx, ry, rx + rw, ry + rh, 0.95, 0.58, 0.95);
    ctx.beginPath(); ctx.roundRect(rx, ry, rw, rh, r); ctx.fill();
    ctx.strokeStyle = `rgba(255,255,255,${fx.strokeA})`; ctx.lineWidth = 1.0;
    ctx.stroke();
    /* ハイライトはごく弱く（当たり枠／デバッグ感を抑える） */
    ctx.globalAlpha = 0.045;
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.roundRect(rx + 1, ry + 1, rw - 2, Math.max(2, rh * 0.22), Math.max(1, r - 1)); ctx.fill();
    ctx.globalAlpha = 1;
  };

  if (shape === 'fighter') {
    part(x + 8, y + 10, w - 16, h - 10, fx.rr);
    part(x + w / 2 - 4, y, 8, 14, 2.2);
    part(x, y + h - 8, 14, 8, 2.0);
    part(x + w - 14, y + h - 8, 14, 8, 2.0);
  } else if (shape === 'agile') {
    part(x + 14, y + 10, w - 28, h - 10, fx.rr);
    part(x + w / 2 - 3, y, 6, 18, 2.2);
    part(x + 4, y + h - 6, 12, 6, 2.0);
    part(x + w - 16, y + h - 6, 12, 6, 2.0);
  } else if (shape === 'heavy') {
    part(x + 4, y + 8, w - 8, h - 8, fx.rr + 0.4);
    part(x + w / 2 - 6, y + 2, 12, 10, 2.4);
    part(x, y + h - 10, 18, 10, 2.2);
    part(x + w - 18, y + h - 10, 18, 10, 2.2);
    part(x + 2, y + 12, 6, 8, 1.8);
    part(x + w - 8, y + 12, 6, 8, 1.8);
  }

  if (rar) {
    const cx = x + w / 2, cy = y + h / 2, rx = w * 0.62, ry = h * 0.62;
    ctx.save();
    ctx.globalAlpha = 0.22 + fx.rimA * 0.22;
    ctx.shadowColor = rgba(fx.rimA);
    ctx.shadowBlur = fx.rimB;
    ctx.strokeStyle = rgba(0.45);
    ctx.lineWidth = 1.0;
    ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }
}
