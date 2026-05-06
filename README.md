# INVADER CORE — GALAXY WAR

ブラウザで動く **2D シューティング**。静的ファイルだけで動くので、GitHub Pages などへの載せやすさを意識した構成です。

## 友達が手元で動かす最短手順

1. **Node.js** を入れる（[LTS](https://nodejs.org/) で OK）
2. このリポジトリを clone する
3. プロジェクトのルートで:

```bash
npm install
npm run dev
```

4. ブラウザで **`http://localhost:8080`** を開く

`npm run dev` はルートをそのまま配信するだけなので、ビルドは不要です（開発用エントリはルートの `index.html`）。

## このプロジェクトでできること（ざっくり）

- Canvas ベースのシューティング・進行・UI
- ギャラクシーマップやボス、ロードアウトなどのゲーム周辺機能（詳細はコード内の `js/` を参照）

## 開発とビルド

### 開発（ルートの `index.html` + `main.js`）

- 編集の主役は **ルートの `index.html`** と **`main.js`**（ES modules で分割読み込み）。
- 本番向けの出力は **`dist/`** 用。開発中はルート側を触れば OK。

### 配布・本番用ビルド（`dist/`）

1. ビルド（PNG アイコン生成 → esbuild でバンドル → `dist/` に静的ファイルコピー）:

```bash
npm run build
```

2. 生成物の例:
   - `dist/index.html` … **`main.bundle.js`** を読み込む（ルートの `index.html` とは別）
   - `dist/main.bundle.js` … esbuild の単一バンドル
   - `dist/style.css`, `dist/css/`, `dist/manifest.json`, `dist/sw.js`, `dist/icons/` など
   - ルートに `assets/` がある場合は `dist/assets/` にもコピー

### ビルド結果の確認

```bash
npm run preview
```

ブラウザで **`http://localhost:4173`**（`dist/` を配信）。

## テスト

```bash
npm test
```

## i18n（準備のみ）

- 文言の全面置換は未実施。
- キーと `t()` は `js/app/i18n.js`（`currentLang` 初期値 `"ja"`）。
- 新規 UI では `import { t } from './js/app/i18n.js'`（モジュールからの相対パスで調整）が利用可能。

## キャッシュバスト

- `js/app/build-version.js` の `INVADER_ASSET_VERSION` と、`index.html` の `?v=` を同じリリース単位で揃えるとよいです。

---

## よくある質問

### 途中から Next.js や「ちゃんとした」Node.js サーバを足せる？

**可能です。** 今もビルドやテストで **Node.js** は使っています（実行時はブラウザだけ）。

- **Next.js を後から足す**典型例:
  - ゲーム本体はこのまま **静的アセット**（ビルド結果の `dist/` や、開発中なら `public/` に置いたファイル）として載せる
  - Next はルーティング・LP・認証・API ルートなど「サイトの枠」だけ担当する  
  いきなり全部 rewrite しなくても、「外側だけ Next、ゲームは iframe / 別パスで既存バンドル」から始められることが多いです。
- **Node で API や SSR が欲しい**場合も、既存の Canvas ゲームロジックはブラウザ向けに残し、サーバ側は別レイヤとして追加する形が現実的です。

つまり「最初から Next 必須」ではなく、**後から段階的に載せ替え・同居**は十分ありです。

---

**リポジトリ:** [github.com/kota-sudo/invader-game](https://github.com/kota-sudo/invader-game)
