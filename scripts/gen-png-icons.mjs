/**
 * PWA 向け PNG アイコン生成（テーマ色 #cc2200 の単色タイル）
 */
import { createRequire } from 'module';
import { mkdirSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const { PNG } = require('pngjs');

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const iconsDir = join(root, 'icons');
mkdirSync(iconsDir, { recursive: true });

function writeSolidPng(size, filename) {
  const png = new PNG({ width: size, height: size });
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (size * y + x) << 2;
      png.data[i] = 204;
      png.data[i + 1] = 34;
      png.data[i + 2] = 0;
      png.data[i + 3] = 255;
    }
  }
  writeFileSync(join(iconsDir, filename), PNG.sync.write(png));
}

writeSolidPng(192, 'icon-192.png');
writeSolidPng(512, 'icon-512.png');
console.log('icons/icon-192.png, icons/icon-512.png を書き込みました');
