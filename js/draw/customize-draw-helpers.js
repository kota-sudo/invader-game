/** Hex path for sortie button; cyan corner brackets for customize panels */

export function fillRoundHex(ctx, cx, cy, R) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = -Math.PI / 2 + i * (Math.PI / 3);
    const x = cx + R * Math.cos(a), y = cy + R * Math.sin(a);
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

export function drawCustomizeNeonBrackets(ctx, x, y, w, h, r, len, col, alpha) {
  const L = Math.max(6, len | 0), rr = Math.max(4, r | 0);
  ctx.save();
  ctx.strokeStyle = col;
  ctx.globalAlpha = alpha;
  ctx.lineWidth = 1.2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x + rr, y); ctx.lineTo(x + rr + L, y);
  ctx.moveTo(x, y + rr); ctx.lineTo(x, y + rr + L);
  ctx.moveTo(x + w - rr, y); ctx.lineTo(x + w - rr - L, y);
  ctx.moveTo(x + w, y + rr); ctx.lineTo(x + w, y + rr + L);
  ctx.moveTo(x + rr, y + h); ctx.lineTo(x + rr + L, y + h);
  ctx.moveTo(x, y + h - rr); ctx.lineTo(x, y + h - rr - L);
  ctx.moveTo(x + w - rr, y + h); ctx.lineTo(x + w - rr - L, y + h);
  ctx.moveTo(x + w, y + h - rr); ctx.lineTo(x + w, y + h - rr + L);
  ctx.stroke();
  ctx.restore();
}
