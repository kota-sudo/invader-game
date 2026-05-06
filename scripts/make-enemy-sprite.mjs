import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';
import jpeg from 'jpeg-js';

function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }

/**
 * Very small resize helper (bilinear sampling).
 * @param {PNG} src
 * @param {number} dw
 * @param {number} dh
 */
function resizeBilinear(src, dw, dh) {
  const dst = new PNG({ width: dw, height: dh });
  const sw = src.width, sh = src.height;
  for (let y = 0; y < dh; y++) {
    const sy = (y + 0.5) * (sh / dh) - 0.5;
    const y0 = Math.max(0, Math.min(sh - 1, Math.floor(sy)));
    const y1 = Math.max(0, Math.min(sh - 1, y0 + 1));
    const fy = sy - y0;
    for (let x = 0; x < dw; x++) {
      const sx = (x + 0.5) * (sw / dw) - 0.5;
      const x0 = Math.max(0, Math.min(sw - 1, Math.floor(sx)));
      const x1 = Math.max(0, Math.min(sw - 1, x0 + 1));
      const fx = sx - x0;
      const i00 = (y0 * sw + x0) << 2;
      const i10 = (y0 * sw + x1) << 2;
      const i01 = (y1 * sw + x0) << 2;
      const i11 = (y1 * sw + x1) << 2;
      const o = (y * dw + x) << 2;
      for (let c = 0; c < 4; c++) {
        const v00 = src.data[i00 + c];
        const v10 = src.data[i10 + c];
        const v01 = src.data[i01 + c];
        const v11 = src.data[i11 + c];
        const v0 = v00 + (v10 - v00) * fx;
        const v1 = v01 + (v11 - v01) * fx;
        dst.data[o + c] = Math.round(v0 + (v1 - v0) * fy);
      }
    }
  }
  return dst;
}

/**
 * Convert near-black background to transparency (soft threshold).
 * @param {PNG} img
 * @param {number} t0 fully transparent threshold (0-255)
 * @param {number} t1 fully opaque threshold (0-255)
 */
function keyOutDarkBackground(img, t0 = 18, t1 = 52) {
  for (let i = 0; i < img.data.length; i += 4) {
    const r = img.data[i];
    const g = img.data[i + 1];
    const b = img.data[i + 2];
    const a = img.data[i + 3] / 255;
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    const k = clamp01((lum - t0) / (t1 - t0));
    img.data[i + 3] = Math.round(255 * a * k);
  }
  return img;
}

/**
 * Crop center square from a PNG.
 * @param {PNG} src
 * @param {number} size
 */
function cropCenterSquare(src, size) {
  const dst = new PNG({ width: size, height: size });
  const sx0 = Math.floor((src.width - size) / 2);
  const sy0 = Math.floor((src.height - size) / 2);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const sx = Math.max(0, Math.min(src.width - 1, sx0 + x));
      const sy = Math.max(0, Math.min(src.height - 1, sy0 + y));
      const si = (sy * src.width + sx) << 2;
      const di = (y * size + x) << 2;
      dst.data[di] = src.data[si];
      dst.data[di + 1] = src.data[si + 1];
      dst.data[di + 2] = src.data[si + 2];
      dst.data[di + 3] = src.data[si + 3];
    }
  }
  return dst;
}

function main() {
  const [,, inPath, outPath, argW, argH] = process.argv;
  if (!inPath || !outPath) {
    console.error('Usage: node scripts/make-enemy-sprite.mjs <in.png> <out.png> [outW outH]');
    process.exit(2);
  }
  const outW = argW ? Math.max(8, parseInt(argW, 10) || 128) : 128;
  const outH = argH ? Math.max(8, parseInt(argH, 10) || 128) : 128;
  let input = fs.readFileSync(inPath);
  let src;
  // Some chat-exported files have a .png extension but contain JPEG bytes.
  // Detect common signatures and decode appropriately.
  const isJpeg = input.length >= 2 && input[0] === 0xff && input[1] === 0xd8;
  if (isJpeg) {
    const decoded = jpeg.decode(input, { useTArray: true });
    src = new PNG({ width: decoded.width, height: decoded.height });
    src.data = Buffer.from(decoded.data);
  } else {
    // Some PNG exporters append trailing bytes; pngjs sync parser is strict.
    // Truncate after the IEND chunk if extra data exists.
    const iend = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82]);
    const i = input.lastIndexOf(iend);
    if (i >= 0 && i + iend.length < input.length) input = input.subarray(0, i + iend.length);
    src = PNG.sync.read(input);
  }

  // Crop center square, then scale to target size (default 128 for small enemies).
  const cropSize = Math.min(src.width, src.height);
  const cropped = cropCenterSquare(src, cropSize);
  const resized = resizeBilinear(cropped, outW, outH);

  // Make background transparent, keep highlights intact.
  keyOutDarkBackground(resized, 16, 56);

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, PNG.sync.write(resized));
  console.log(`Wrote ${outPath}`);
}

main();

