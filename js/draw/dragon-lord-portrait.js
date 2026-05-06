/**
 * 竜王（char_dragon_lord）の写真スプライト — バトル・編成UI・ヘッダ等で共有
 */
import { getImage } from '../game/image-cache.js';

export const DRAGON_LORD_CHAR_ID = 'char_dragon_lord';
export const DRAGON_LORD_SPRITE_SRC = './assets/player/dragon-lord.png';

const _dlChromaCache = new Map();
function getDragonLordChromaCanvas() {
  if (_dlChromaCache.has(DRAGON_LORD_SPRITE_SRC)) return _dlChromaCache.get(DRAGON_LORD_SPRITE_SRC);
  const img = getImage(DRAGON_LORD_SPRITE_SRC);
  if (!img?.complete || !img.naturalWidth || img.naturalHeight <= 0) return null;
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  const cv = (typeof OffscreenCanvas !== 'undefined')
    ? new OffscreenCanvas(w, h)
    : Object.assign(document.createElement('canvas'), { width: w, height: h });
  const c = cv.getContext('2d', { willReadFrequently: true });
  if (!c) return null;
  c.drawImage(img, 0, 0);
  try {
    const im = c.getImageData(0, 0, w, h);
    const d = im.data;
    for (let i = 0; i < d.length; i += 4) {
      const r = d[i], g = d[i + 1], b = d[i + 2];
      if (g > 210 && r < 110 && b < 110) d[i + 3] = 0; // greenscreen
    }
    c.putImageData(im, 0, 0);
  } catch (_) {
    return null;
  }
  _dlChromaCache.set(DRAGON_LORD_SPRITE_SRC, cv);
  return cv;
}

function drawMaskedOverlayAfterSprite(ctx, drawOverlayFn) {
  // Mask overlay to current destination alpha (i.e., the sprite we just drew).
  ctx.save();
  ctx.globalCompositeOperation = 'source-atop';
  try {
    drawOverlayFn();
  } finally {
    ctx.restore();
  }
}

export function isDragonLordChar(itemOrId) {
  const id = typeof itemOrId === 'string' ? itemOrId : itemOrId?.id;
  return id === DRAGON_LORD_CHAR_ID;
}

/**
 * 編成・カスタマイズ等の UI 用（ctx は既に適宜 translate 済みでも、cx,cy は絶対座標で渡す）
 * @param tier 'detail' | 'customize' | 'compact' | 'micro'
 */
export function drawDragonLordPortrait(ctx, cx, cy, maxW, maxH, options = {}) {
  const {
    glowColor = '#ff2266',
    frameCount = 0,
    tier = 'detail',
    lowFx = false,
    active = false,
  } = options;
  const img = getImage(DRAGON_LORD_SPRITE_SRC);
  if (!img?.complete || !img.naturalWidth || img.naturalHeight <= 0) return false;
  const keyed = getDragonLordChromaCanvas();

  const iw = img.naturalWidth;
  const ih = img.naturalHeight;
  const scale = Math.min(maxW / iw, maxH / ih);
  const dw = iw * scale;
  const dh = ih * scale;
  const dx = cx - dw / 2;
  const dy = cy - dh / 2 - (tier === 'detail' || tier === 'customize' ? 4 : tier === 'compact' ? 3 : 0);

  const pulse = 0.65 + Math.sin(frameCount * 0.11) * 0.35;
  const rich = (tier === 'detail' || tier === 'customize') && !lowFx;

  if (rich) {
    const footY = cy + maxH * 0.38;
    ctx.save();
    ctx.translate(cx, footY);
    ctx.scale(1, 0.28);
    const floorG = ctx.createRadialGradient(0, 0, 0, 0, 0, dw * 0.52);
    floorG.addColorStop(0, 'rgba(6, 2, 14, 0.5)');
    floorG.addColorStop(0.55, 'rgba(10, 4, 20, 0.12)');
    floorG.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = floorG;
    ctx.beginPath();
    ctx.arc(0, 0, dw * 0.48, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    const amb = ctx.createRadialGradient(cx, cy - dh * 0.06, dw * 0.12, cx, cy, dw * 0.88);
    amb.addColorStop(0, `rgba(255, 90, 170, ${0.12 * pulse})`);
    amb.addColorStop(0.45, `rgba(140, 40, 100, ${0.06 * pulse})`);
    amb.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = amb;
    ctx.fillRect(dx - 14, dy - 14, dw + 28, dh + 28);
  }

  const tilt = rich ? Math.sin(frameCount * 0.038) * 0.05 : 0;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(tilt);
  ctx.translate(-cx, -cy);

  if (rich) {
    ctx.save();
    ctx.globalAlpha = 0.34;
    if (typeof ctx.filter === 'string') {
      ctx.filter = 'brightness(0.4)';
      const keyed = getDragonLordChromaCanvas();
      if (keyed) ctx.drawImage(keyed, 0, 0, iw, ih, dx + 2, dy + 2.5, dw, dh);
      else ctx.drawImage(img, 0, 0, iw, ih, dx + 2, dy + 2.5, dw, dh);
      ctx.filter = 'none';
    } else {
      const keyed = getDragonLordChromaCanvas();
      if (keyed) ctx.drawImage(keyed, 0, 0, iw, ih, dx + 2, dy + 2.5, dw, dh);
      else ctx.drawImage(img, 0, 0, iw, ih, dx + 2, dy + 2.5, dw, dh);
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  let blur = 8;
  if (tier === 'micro') blur = 5;
  else if (tier === 'compact') blur = active ? 10 : 6;
  else if (rich) blur = 12;

  ctx.shadowColor = glowColor;
  ctx.shadowBlur = blur * (0.75 + 0.25 * pulse);
  if (keyed) ctx.drawImage(keyed, 0, 0, iw, ih, dx, dy, dw, dh);
  else ctx.drawImage(img, 0, 0, iw, ih, dx, dy, dw, dh);
  ctx.shadowBlur = 0;
  if (keyed) ctx.drawImage(keyed, 0, 0, iw, ih, dx, dy, dw, dh);
  else ctx.drawImage(img, 0, 0, iw, ih, dx, dy, dw, dh);

  if (rich) {
    const shade = ctx.createLinearGradient(dx + dw * 0.12, dy, dx + dw * 0.88, dy + dh);
    shade.addColorStop(0, 'rgba(255, 248, 255, 0.35)');
    shade.addColorStop(0.38, 'rgba(255, 255, 255, 0)');
    shade.addColorStop(1, 'rgba(25, 0, 40, 0.45)');
    drawMaskedOverlayAfterSprite(ctx, () => {
      ctx.globalCompositeOperation = 'soft-light';
      ctx.fillStyle = shade;
      ctx.fillRect(dx - 1, dy - 1, dw + 2, dh + 2);
    });
  }

  ctx.restore();
  return true;
}

/** バトル画面：プレイヤー矩形内に立体ライティング付きで描画 */
export function drawDragonLordBattle(ctx, p, frameCount) {
  const img = getImage(DRAGON_LORD_SPRITE_SRC);
  if (!img?.complete || !img.naturalWidth || img.naturalHeight <= 0) return false;
  if (!p || !Number.isFinite(p.x)) return false;
  const keyed = getDragonLordChromaCanvas();

  const iw = img.naturalWidth;
  const ih = img.naturalHeight;
  const scale = Math.min(p.w / iw, p.h / ih);
  const dw = iw * scale;
  const dh = ih * scale;
  const cx = p.x + p.w / 2;
  const dy = p.y + (p.h - dh) / 2 - 6;
  const cy = dy + dh / 2;
  const pulse = 0.65 + Math.sin(frameCount * 0.11) * 0.35;
  const tilt = Math.sin(frameCount * 0.038) * 0.065;

  ctx.save();

  const footY = p.y + p.h - 1;
  ctx.save();
  ctx.translate(cx, footY);
  ctx.scale(1, 0.28);
  const floorG = ctx.createRadialGradient(0, 0, 0, 0, 0, dw * 0.52);
  floorG.addColorStop(0, 'rgba(6, 2, 14, 0.58)');
  floorG.addColorStop(0.55, 'rgba(10, 4, 20, 0.14)');
  floorG.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = floorG;
  ctx.beginPath();
  ctx.arc(0, 0, dw * 0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  const amb = ctx.createRadialGradient(cx, cy - dh * 0.06, dw * 0.12, cx, cy, dw * 0.82);
  amb.addColorStop(0, `rgba(255, 90, 170, ${0.14 * pulse})`);
  amb.addColorStop(0.45, `rgba(140, 40, 100, ${0.07 * pulse})`);
  amb.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = amb;
  ctx.fillRect(p.x - 24, dy - 24, p.w + 48, dh + 48);

  ctx.translate(cx, cy);
  ctx.rotate(tilt);

  ctx.save();
  ctx.globalAlpha = 0.38;
  if (typeof ctx.filter === 'string') {
    ctx.filter = 'brightness(0.38)';
    if (keyed) ctx.drawImage(keyed, 0, 0, iw, ih, -dw / 2 + 2.5, -dh / 2 + 3.5, dw, dh);
    else ctx.drawImage(img, 0, 0, iw, ih, -dw / 2 + 2.5, -dh / 2 + 3.5, dw, dh);
    ctx.filter = 'none';
  } else {
    if (keyed) ctx.drawImage(keyed, 0, 0, iw, ih, -dw / 2 + 2.5, -dh / 2 + 3.5, dw, dh);
    else ctx.drawImage(img, 0, 0, iw, ih, -dw / 2 + 2.5, -dh / 2 + 3.5, dw, dh);
  }
  ctx.globalAlpha = 1;
  ctx.restore();

  ctx.shadowColor = `rgba(255, 55, 140, ${0.3 * pulse})`;
  ctx.shadowBlur = 14;
  if (keyed) ctx.drawImage(keyed, 0, 0, iw, ih, -dw / 2, -dh / 2, dw, dh);
  else ctx.drawImage(img, 0, 0, iw, ih, -dw / 2, -dh / 2, dw, dh);
  ctx.shadowBlur = 0;
  if (keyed) ctx.drawImage(keyed, 0, 0, iw, ih, -dw / 2, -dh / 2, dw, dh);
  else ctx.drawImage(img, 0, 0, iw, ih, -dw / 2, -dh / 2, dw, dh);

  // Masked lighting overlays (avoid rectangular look)
  drawMaskedOverlayAfterSprite(ctx, () => {
    const shade = ctx.createLinearGradient(-dw / 2 + dw * 0.12, -dh / 2, dw / 2 - dw * 0.05, dh / 2);
    shade.addColorStop(0, 'rgba(255, 248, 255, 0.42)');
    shade.addColorStop(0.38, 'rgba(255, 255, 255, 0)');
    shade.addColorStop(1, 'rgba(25, 0, 40, 0.55)');
    ctx.globalCompositeOperation = 'soft-light';
    ctx.fillStyle = shade;
    ctx.fillRect(-dw / 2 - 1, -dh / 2 - 1, dw + 2, dh + 2);

    const spec = ctx.createRadialGradient(
      -dw / 2 + dw * 0.38,
      -dh / 2 + dh * 0.24,
      0,
      -dw / 2 + dw * 0.38,
      -dh / 2 + dh * 0.24,
      dw * 0.55
    );
    spec.addColorStop(0, 'rgba(255, 255, 255, 0.55)');
    spec.addColorStop(0.45, 'rgba(255, 220, 255, 0.1)');
    spec.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = spec;
    ctx.fillRect(-dw / 2 - 1, -dh / 2 - 1, dw + 2, dh + 2);
  });

  ctx.restore();
  return true;
}
