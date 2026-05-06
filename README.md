# INVADER CORE — GALAXY WAR

ブラウザ上で動作する 2D シューティングゲームです。クライアントは HTML5 Canvas と ES Modules のみで構成され、ビルド後は静的ファイルとして任意のホスティングに配置できます。

**リポジトリ:** [github.com/kota-sudo/invader-game](https://github.com/kota-sudo/invader-game)

---

## 概要

本作は Canvas を用いた縦／横スクロールに近い戦闘画面と、ステージ選択・ギャラクシーマップ・ロードアウト・ショップ・ガチャなどのメタ進行を組み合わせた構成です。開発時はルートの `index.html` からモジュール分割されたソースを直接読み込み、リリース時は esbuild により単一バンドルへまとめて `dist/` に出力します。

---

## 主な機能

- **戦闘**: Canvas ベースの描画・入力・当たり判定・オーディオ
- **進行**: ステージ／ウェーブ、ボス、ミッション・実績などのゲームデータ連携
- **メタゲーム**: ギャラクシーマップ、装備・カスタマイズ、ショップ・ガチャ、資源・燃料などの経済周り
- **オフライン対応の下地**: Web App Manifest、`Service Worker`（`sw.js`）によるキャッシュ方針（用途に応じて調整）
- **国際化の準備**: `js/app/i18n.js` による `t()` キー方式（全面置換は未完了）

※詳細な仕様はソースツリー（特に `js/game/`）を参照してください。

---

## 技術スタック

| 区分 | 内容 |
|------|------|
| ランタイム | モダンブラウザ（ES Modules、Canvas API） |
| 言語 | JavaScript（ES modules、`"type": "module"`） |
| バンドル | esbuild（本番用単一バンドル） |
| ビルド／ツール | Node.js（npm スクリプト、画像生成スクリプト等） |
| テスト | Node.js 組み込み `node --test` |

---

## 動作要件

- **Node.js**: 現在の LTS 推奨（開発・ビルド・テスト用）
- **ブラウザ**: ES Modules と Canvas をサポートする環境（モバイルでは横向き利用を想定した UI あり）

---

## インストール

```bash
git clone https://github.com/kota-sudo/invader-game.git
cd invader-game
npm install
```

---

## 開発サーバの起動

ルートディレクトリを静的配信し、ルートの `index.html` をエントリとして開発します。**この段階ではバンドルは不要**です。

```bash
npm run dev
```

ブラウザで **http://localhost:8080** を開いてください。

開発時の主な編集対象は **`index.html`**、**`main.js`**、および **`js/`** 以下です。配布用に別途生成される `dist/index.html` とは役割が異なります。

---

## 本番ビルド

アイコン生成、JavaScript のバンドル、静的アセットのコピーを一括で実行します。

```bash
npm run build
```

### 生成物（`dist/`）

| パス | 説明 |
|------|------|
| `dist/index.html` | バンドル読み込み用エントリ（ルートの `index.html` とは別物） |
| `dist/main.bundle.js` | esbuild による縮小済み単一バンドル（ソースマップ付き） |
| `dist/style.css`、`dist/css/` | スタイルシート |
| `dist/manifest.json`、`dist/sw.js`、`dist/icons/` | PWA 関連 |
| `dist/assets/` | ルートに `assets/` がある場合にコピー |

### ビルド結果の確認

```bash
npm run preview
```

**http://localhost:4173** で `dist/` の内容を配信して確認できます。

---

## npm スクリプト一覧

| コマンド | 説明 |
|----------|------|
| `npm run dev` | 開発用静的サーバ（ポート 8080） |
| `npm run build` | フルビルド（アイコン → JS バンドル → `dist/` へコピー） |
| `npm run build:js` | JavaScript のバンドルのみ |
| `npm run icons` | PNG アイコン生成 |
| `npm run preview` | `dist/` のプレビュー（ポート 4173） |
| `npm test` | `test/` 以下のテスト実行 |

---

## ディレクトリ構成（抜粋）

```
invader-game/
├── index.html          # 開発用 HTML エントリ
├── main.js             # 開発用 JS エントリ
├── manifest.json       # Web App Manifest（開発／ルート参照用）
├── sw.js               # Service Worker
├── style.css / css/    # グローバルおよび画面別スタイル
├── js/
│   ├── app/            # アプリ全体（ループ、i18n、ビルドバージョン等）
│   ├── game/           # ゲームロジック・データ連携
│   ├── draw/           # Canvas 描画・画面別ドロー
│   └── ui/             # DOM オーバーレイ・UI 操作
├── assets/             # 画像等アセット（ビルド時に dist へコピー可）
├── icons/              # アイコンソース（SVG 等）
├── scripts/            # ビルド・ユーティリティ（Node）
├── test/               # 自動テスト
└── dist/               # ビルド出力（リポジトリに含めるかは運用次第）
```

---

## テスト

```bash
npm test
```

`test/` ディレクトリ内のテストを Node.js のテストランナで実行します。

---

## 国際化（i18n）

文言の全面差し替えは未完了です。キーと `t()` は **`js/app/i18n.js`** で管理され、初期言語は日本語（`currentLang` の初期値 `"ja"`）です。新規 UI では同ファイルから `t` をインポートして利用できます（モジュール間の相対パスに注意）。

---

## リリース時のキャッシュ対策

同一リリース内では、**`js/app/build-version.js`** の `INVADER_ASSET_VERSION` と、**`index.html`** 内のクエリパラメータ **`?v=`** を揃えると、ブラウザキャッシュと整合しやすくなります。

---

## デプロイ

`npm run build` で生成した **`dist/` ディレクトリの内容**を、GitHub Pages、Netlify、Cloudflare Pages、S3 静的サイトなど、任意の静的ホスティングにアップロードしてください。サーバサイドの実行環境は不要です。

---

## フレームワークとの併用について

実行時はブラウザのみですが、ビルド・テストで Node.js を利用しています。**Next.js 等のフレームワークは後から導入可能**です。典型的には、本ゲームを静的アセット（本リポジトリの `dist/` 出力など）として配置し、フレームワーク側はルーティング・ランディングページ・API 等の外枠を担当する構成が取りやすいです。ゲーム本体を一度に書き換えず、`public` 配下への配置や別パスでの提供から始めることも可能です。

---

## ライセンス

本リポジトリに **LICENSE** ファイルがない場合、利用条件はリポジトリ所有者に確認してください。
