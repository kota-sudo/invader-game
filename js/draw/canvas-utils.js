/** Fills text wrapping at word/char boundaries with optional newline support. Returns final y. */
export function wrapFillJp(ctx, str, x, y, maxW, lineH, maxLines) {
  if (!str) return y;
  let ly = y, lineNum = 0;
  const parts = str.split(/\r?\n/);
  for (let pi = 0; pi < parts.length; pi++) {
    const para = parts[pi];
    if (lineNum >= maxLines) break;
    if (para === '') {
      if (pi < parts.length - 1) { ly += lineH; lineNum++; }
      continue;
    }
    let j = 0;
    while (j < para.length && lineNum < maxLines) {
      let end = j + 1;
      while (end <= para.length && ctx.measureText(para.slice(j, end)).width <= maxW) end++;
      end--;
      if (end <= j) end = Math.min(j + 1, para.length);
      let chunk = para.slice(j, end);
      if (end < para.length && lineNum === maxLines - 1) chunk += '…';
      ctx.fillText(chunk, x, ly);
      ly += lineH; lineNum++; j = end;
    }
  }
  return ly;
}

/** Truncates a single line to fit maxW, appending '…' if needed. */
export function truncateLine(ctx, str, maxW) {
  if (!str) return '';
  if (ctx.measureText(str).width <= maxW) return str;
  let t = str;
  while (t.length > 1 && ctx.measureText(t.slice(0, -1) + '…').width > maxW) t = t.slice(0, -1);
  return t.length ? t.slice(0, -1) + '…' : '…';
}
