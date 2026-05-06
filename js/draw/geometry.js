export function drawHexagon(ctx, x, y, r) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) { const a = Math.PI / 180 * (60 * i - 30); i === 0 ? ctx.moveTo(x + r * Math.cos(a), y + r * Math.sin(a)) : ctx.lineTo(x + r * Math.cos(a), y + r * Math.sin(a)); }
  ctx.closePath();
}

export function drawStar(ctx, x, y, pts, outerR, innerR) {
  ctx.beginPath();
  for (let i = 0; i < pts * 2; i++) { const r = i % 2 === 0 ? outerR : innerR, a = Math.PI / pts * i - Math.PI / 2; i === 0 ? ctx.moveTo(x + r * Math.cos(a), y + r * Math.sin(a)) : ctx.lineTo(x + r * Math.cos(a), y + r * Math.sin(a)); }
  ctx.closePath();
}

function _hexVertices(x, y, r) {
  const pts = [];
  for (let i = 0; i < 6; i++) {
    const a = Math.PI / 180 * (60 * i - 30);
    pts.push({ x: x + r * Math.cos(a), y: y + r * Math.sin(a) });
  }
  return pts;
}

function _raySegIntersect(ox, oy, dx, dy, ax, ay, bx, by) {
  const vx = bx - ax, vy = by - ay;
  const det = dx * (-vy) - dy * (-vx);
  if (Math.abs(det) < 1e-6) return null;
  const rx = ax - ox, ry = ay - oy;
  const t = (rx * (-vy) - ry * (-vx)) / det;
  const u = (dx * ry - dy * rx) / det;
  if (t >= 0 && u >= 0 && u <= 1) return { t, x: ox + dx * t, y: oy + dy * t };
  return null;
}

export function hexBoundaryPoint(cx, cy, r, tx, ty) {
  const dx = tx - cx, dy = ty - cy;
  const len = Math.hypot(dx, dy);
  if (len < 1e-6) return { x: cx, y: cy };
  const ux = dx / len, uy = dy / len;
  const pts = _hexVertices(cx, cy, r);
  let best = null;
  for (let i = 0; i < 6; i++) {
    const a = pts[i], b = pts[(i + 1) % 6];
    const hit = _raySegIntersect(cx, cy, ux, uy, a.x, a.y, b.x, b.y);
    if (hit && (!best || hit.t < best.t)) best = hit;
  }
  return best ? { x: best.x, y: best.y } : { x: cx + ux * r, y: cy + uy * r };
}

export function circleBoundaryPoint(cx, cy, r, tx, ty) {
  const dx = tx - cx, dy = ty - cy;
  const len = Math.hypot(dx, dy);
  if (len < 1e-6) return { x: cx, y: cy };
  const ux = dx / len, uy = dy / len;
  return { x: cx + ux * r, y: cy + uy * r };
}
