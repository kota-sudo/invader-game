/**
 * スプライトの ImageData に対し、グリーンバック・平坦背景・チェッカー状の外周背景を透明化する。
 * 画像端から「背景っぽい」ピクセルを BFS でつなげて除去（キャラ中央は端と繋がりにくい）。
 */

function lumSat(r, g, b) {
  const cmax = Math.max(r, g, b);
  const cmin = Math.min(r, g, b);
  return { lum: (r + g + b) / 3, sat: cmax - cmin };
}

function manhattanRgb(r1, g1, b1, r2, g2, b2) {
  return Math.abs(r1 - r2) + Math.abs(g1 - g2) + Math.abs(b1 - b2);
}

/** 単体ピクセルが典型的なスタジオ背景か（全面スキャン用・控えめ） */
function keySinglePixelBackdrop(r, g, b, a) {
  if (a < 14) return false;
  const { lum, sat } = lumSat(r, g, b);
  if (g > 200 && r < 130 && b < 130) return true;
  if (r > 246 && g > 246 && b > 246) return true;
  if (lum >= 248 && sat < 30) return true;
  if (lum >= 232 && sat < 22) return true;
  return false;
}

/** 外周シード用：チェッカー／薄灰も拾う */
function borderBackdropLike(r, g, b, a) {
  if (a < 20) return false;
  const { lum, sat } = lumSat(r, g, b);
  if (g > 198 && r < 135 && b < 135) return true;
  if (lum >= 248 && sat < 38) return true;
  if (lum >= 168 && sat < 36 && lum <= 252) return true;
  if (lum >= 135 && sat < 18 && lum <= 245) return true;
  return false;
}

/**
 * 画像の境界から、色が近い「背景」領域を透明化（チェッカー・白枠向け）。
 */
function floodBackdropFromEdges(imageData) {
  const d = imageData.data;
  const w = imageData.width;
  const h = imageData.height;
  if (w < 2 || h < 2) return;

  let sr = 0;
  let sg = 0;
  let sb = 0;
  const corners = [
    [0, 0],
    [w - 1, 0],
    [0, h - 1],
    [w - 1, h - 1],
  ];
  for (const [cx, cy] of corners) {
    const i = (cy * w + cx) * 4;
    sr += d[i];
    sg += d[i + 1];
    sb += d[i + 2];
  }
  sr /= 4;
  sg /= 4;
  sb /= 4;

  const vis = new Uint8Array(w * h);
  const qx = new Int32Array(w * h);
  const qy = new Int32Array(w * h);
  let qh = 0;
  let qt = 0;

  const push = (x, y) => {
    const k = y * w + x;
    if (vis[k]) return;
    vis[k] = 1;
    qx[qt] = x;
    qy[qt] = y;
    qt++;
  };

  const onBorderBackdrop = (x, y) => {
    const i = (y * w + x) * 4;
    const r = d[i];
    const g = d[i + 1];
    const b = d[i + 2];
    const a = d[i + 3];
    if (!borderBackdropLike(r, g, b, a)) return false;
    if (manhattanRgb(r, g, b, sr, sg, sb) < 88) return true;
    const { lum, sat } = lumSat(r, g, b);
    if (lum >= 155 && sat < 40) return true;
    return false;
  };

  for (let x = 0; x < w; x++) {
    if (onBorderBackdrop(x, 0)) push(x, 0);
    if (onBorderBackdrop(x, h - 1)) push(x, h - 1);
  }
  for (let y = 0; y < h; y++) {
    if (onBorderBackdrop(0, y)) push(0, y);
    if (onBorderBackdrop(w - 1, y)) push(w - 1, y);
  }

  const neighborSimilar = (r0, g0, b0, r1, g1, b1, a1) => {
    if (a1 < 18) return false;
    const { sat: s1, lum: l1 } = lumSat(r1, g1, b1);
    if (manhattanRgb(r0, g0, b0, r1, g1, b1) <= 52) return true;
    if (l1 > 118 && s1 < 44 && manhattanRgb(sr, sg, sb, r1, g1, b1) < 85) return true;
    return false;
  };

  while (qh < qt) {
    const x = qx[qh];
    const y = qy[qh];
    qh++;
    const i0 = (y * w + x) * 4;
    const r0 = d[i0];
    const g0 = d[i0 + 1];
    const b0 = d[i0 + 2];
    d[i0 + 3] = 0;

    const tryN = (nx, ny) => {
      if (nx < 0 || nx >= w || ny < 0 || ny >= h) return;
      const k = ny * w + nx;
      if (vis[k]) return;
      const j = k * 4;
      const r1 = d[j];
      const g1 = d[j + 1];
      const b1 = d[j + 2];
      const a1 = d[j + 3];
      if (!neighborSimilar(r0, g0, b0, r1, g1, b1, a1)) return;
      vis[k] = 1;
      qx[qt] = nx;
      qy[qt] = ny;
      qt++;
    };

    tryN(x + 1, y);
    tryN(x - 1, y);
    tryN(x, y + 1);
    tryN(x, y - 1);
  }
}

export function keyOutGreenAndFlatBackdrop(imageData) {
  const d = imageData.data;
  const w = imageData.width;
  const h = imageData.height;

  for (let i = 0; i < d.length; i += 4) {
    const r = d[i];
    const g = d[i + 1];
    const b = d[i + 2];
    const a = d[i + 3];
    if (keySinglePixelBackdrop(r, g, b, a)) d[i + 3] = 0;
  }

  floodBackdropFromEdges(imageData);

  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] === 0) continue;
    const r = d[i];
    const g = d[i + 1];
    const b = d[i + 2];
    const { lum, sat } = lumSat(r, g, b);
    if (lum >= 242 && sat < 20) d[i + 3] = 0;
  }
}
