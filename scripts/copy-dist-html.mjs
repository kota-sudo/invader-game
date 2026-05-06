/**
 * 配布用 `dist/` を組み立てる。
 * - ルートの `index.html` をベースに、エントリのみ `main.bundle.js` に差し替えた `dist/index.html` を出力する。
 * - CSS / manifest / SW / icons / assets（存在時）をコピーする。
 *
 * 開発時はルートの `index.html` のまま `main.js` を読む（混同しないこと）。
 */
import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { INVADER_ASSET_VERSION } from '../js/app/build-version.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
mkdirSync(dist, { recursive: true });

let html = readFileSync(join(root, 'index.html'), 'utf8');
html = html.replace(/src="main\.js\?v=\d+"/, `src="main.bundle.js?v=${INVADER_ASSET_VERSION}"`);
// ルート index にある「開発用」とわかるコメントは配布 HTML では削除（誤解防止）
html = html.replace(/<!-- 開発用エントリ:[\s\S]*?-->\s*/g, '');
html = html.replace(/\s*<!-- 開発:[\s\S]*?-->\s*/g, '\n  ');

html = html.replace(
  /<!DOCTYPE html>/i,
  `<!DOCTYPE html>\n<!-- INVADER CORE 配布用 HTML（npm run build / npm run preview）。開発はルート index.html + main.js を使用。 -->`
);
writeFileSync(join(dist, 'index.html'), html);

for (const name of ['style.css', 'manifest.json', 'sw.js']) {
  const src = join(root, name);
  if (existsSync(src)) cpSync(src, join(dist, name));
}

const cssDir = join(root, 'css');
if (existsSync(cssDir)) cpSync(cssDir, join(dist, 'css'), { recursive: true });

const iconsDir = join(root, 'icons');
if (existsSync(iconsDir)) cpSync(iconsDir, join(dist, 'icons'), { recursive: true });

const assetsDir = join(root, 'assets');
if (existsSync(assetsDir)) cpSync(assetsDir, join(dist, 'assets'), { recursive: true });

console.log(`dist/ を生成しました（エントリ: main.bundle.js?v=${INVADER_ASSET_VERSION}）`);
