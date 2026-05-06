# INVADER CORE — GALAXY WAR

ブラウザ向け 2D シューティング（静的ホスティング想定）。

## 開発時（ルートの `index.html` + `main.js`）

- **このリポジトリのルート**にある `index.html` が開発用エントリです（`main.js` を ES modules で直接読み込み）。
- ローカルサーバの例（ポート 8080）:

```bash
npm run dev
```

ブラウザで `http://localhost:8080` を開いてください。

> **混同しないように:** 配布用のビルド成果物は **`dist/`** だけが対象です。開発中はルートの `index.html` を編集します。

## 配布・本番ホスト用（`dist/` + バンドル）

1. ビルド（PNG アイコン生成 → esbuild → `dist/` へ静的ファイルコピー）:

```bash
npm run build
```

2. 生成物:
   - `dist/index.html` … **`main.bundle.js`** を読み込む（ルートの `index.html` とは別ファイル）
   - `dist/main.bundle.js` … esbuild の単一バンドル
   - `dist/style.css`, `dist/css/`, `dist/manifest.json`, `dist/sw.js`, `dist/icons/` … コピー
   - `assets/` フォルダがルートに存在する場合は `dist/assets/` にもコピー

## `dist/` の動作確認（プレビュー）

ビルド後:

```bash
npm run preview
```

ブラウザで `http://localhost:4173` を開く（`serve` で `dist/` を配信）。

## テスト

```bash
npm test
```

## i18n（準備のみ）

- 文言の全面置換は未実施。
- キーと `t()` は `js/app/i18n.js`（`currentLang` 初期値 `"ja"`）。
- 新規 UI からは `import { t } from './js/app/i18n.js'`（パスはモジュールからの相対で調整）を利用可能。

## キャッシュバスト

- `js/app/build-version.js` の `INVADER_ASSET_VERSION` と、`index.html` の `?v=` を同じリリース単位で揃えるとよいです。
