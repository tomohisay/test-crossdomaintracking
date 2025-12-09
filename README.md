# Adobe Analytics Cross-Domain Tracking Test Environment

Adobe Analyticsのクロスドメイントラッキングをローカル環境でテストするためのダミーサイト環境です。

## 概要

このプロジェクトは、異なるホスト名で動作する3つのサイトを提供し、クロスドメイントラッキングの動作を確認・テストできます。

- **Site A** (site-a.local:3001): 商品閲覧サイト - クロスドメイン有効
- **Site B** (site-b.local:3002): 購入・コンバージョンサイト - クロスドメイン有効
- **Site C** (site-c.local:3003): 独立サイト - **クロスドメイン無効**

> **重要**: 真のクロスドメイン環境を再現するため、異なるホスト名（`site-a.local`, `site-b.local`, `site-c.local`）を使用しています。ポート番号の違いだけでは、ブラウザのCookie/localStorageが共有されてしまい、正確なテストができません。

## 機能

- ビジターIDの生成と管理
- セッションIDの管理
- クロスドメインリンクへのパラメータ自動付与（`adobe_mc`パラメータ互換）
- ページビュー/イベントのトラッキング（デモ）
- リアルタイムデバッグパネル
- **クロスドメイン無効時の挙動確認（Site C）**
- **Adobe Tags (Launch) 対応**

## セットアップ

### 必要条件

- Node.js v14以上
- （オプション）Adobe Tags プロパティ

### 1. hostsファイルの設定（必須）

真のクロスドメイン環境を再現するため、`/etc/hosts` ファイルを編集して異なるホスト名を設定します。

#### macOS / Linux

```bash
sudo nano /etc/hosts
```

以下の行を追加:

```
127.0.0.1 site-a.local
127.0.0.1 site-b.local
127.0.0.1 site-c.local
```

#### Windows

管理者権限でメモ帳を開き、以下のファイルを編集:

```
C:\Windows\System32\drivers\etc\hosts
```

以下の行を追加:

```
127.0.0.1 site-a.local
127.0.0.1 site-b.local
127.0.0.1 site-c.local
```

#### なぜhosts設定が必要なのか？

| 方式 | Cookie/localStorage | クロスドメイン再現 |
|------|---------------------|-------------------|
| `localhost:3001` と `localhost:3002` | 共有される | ❌ 不可 |
| `site-a.local` と `site-b.local` | 分離される | ✅ 可能 |

ポート番号が異なるだけでは、ブラウザは同じドメイン（`localhost`）とみなし、Cookie や localStorage を共有してしまいます。異なるホスト名を使用することで、実際のクロスドメイン環境と同じ挙動を再現できます。

### 2. インストール

```bash
# リポジトリをクローン
git clone https://github.com/tomohisay/test-crossdomaintracking.git
cd test-crossdomaintracking

# 依存関係のインストール（オプション：concurrentlyを使う場合）
npm install
```

### Adobe Tags の設定

自身のAdobe Tagsプロパティを使用する場合は、`shared/config.js` を編集してください。

```javascript
// shared/config.js

const config = {
  /**
   * Adobe Tags (Launch) の埋め込みURL
   *
   * 取得方法:
   * 1. Adobe Experience Platform Data Collection にログイン
   * 2. Tags > プロパティを選択
   * 3. 環境 > 本番環境の「インストール」をクリック
   * 4. スクリプトタグのsrc URLをコピー
   */
  adobeTagsUrl: '//assets.adobedtm.com/xxxxx/xxxxx/launch-xxxxx.min.js',

  // その他の設定...
  marketingCloudOrgId: 'YOUR_ORG_ID@AdobeOrg',
  trackingServer: 'your-company.sc.omtrdc.net',
};
```

**Adobe Tags URLが未設定の場合**は、デバッグモードで動作し、デバッグパネルでトラッキング状況を確認できます。

### 3. サーバーの起動

#### 方法1: Node.jsスクリプト（推奨）

```bash
node start.js
```

起動時にhosts設定の確認案内が表示されます。

#### 方法2: シェルスクリプト

```bash
./start.sh
```

#### 方法3: npm scripts（concurrently使用）

```bash
npm install
npm run dev
```

#### 方法4: 個別に起動

```bash
# ターミナル1
node site-a/server.js

# ターミナル2
node site-b/server.js

# ターミナル3
node site-c/server.js
```

## 使い方

1. hostsファイルを設定（上記参照）
2. サーバーを起動
3. ブラウザで http://site-a.local:3001/ （Site A）にアクセス
4. 画面右下のデバッグパネルでトラッキング状況を確認
5. ナビゲーションの「Site Bへ移動」をクリックしてクロスドメイン遷移
6. Site Bでビジターがつながっているか確認
7. 「Site Cへ（パラメータなし）」をクリックしてクロスドメイン無効の遷移をテスト

## Adobe Tags (Launch) 連携

### アーキテクチャ

```
┌─────────────────────────────────────────────────────────────┐
│  HTML <head>                                                │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ <script src="/config.js">  ← 設定ファイル読み込み       ││
│  │ <script> adobeConfig.inject() ← Adobe Tags を挿入      ││
│  │                                                         ││
│  │ ↓ 動的に挿入                                            ││
│  │ <script src="//assets.adobedtm.com/.../launch-xxx.js"> ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

### 設定ファイル構成

| ファイル | 役割 |
|----------|------|
| `shared/config.js` | Adobe Tags URL、Organization ID などの一括設定 |
| `shared/tracking-core.js` | クロスドメイントラッキングのコアロジック |
| `shared/debug-panel.js` | デバッグパネルUI |

### Adobe Tags プロパティの準備

Adobe Tags (Launch) でクロスドメイントラッキングを設定する場合:

1. **拡張機能をインストール**
   - Adobe Analytics
   - Experience Cloud ID Service

2. **ECID 拡張機能の設定**
   - Organization ID を設定
   - 「クロスドメイントラッキングを有効にする」にチェック

3. **データ要素を作成**
   - ページ名、URL などのデータ要素

4. **ルールを作成**
   - Page Load ルール（s.t() 呼び出し）
   - イベントトラッキングルール（s.tl() 呼び出し）

5. **ライブラリをビルド・公開**
   - 本番環境の埋め込みコードを取得
   - `config.js` の `adobeTagsUrl` に設定

## クロスドメイントラッキングの仕組み

### クロスドメイン有効時（Site A ↔ Site B）

```
Site A (site-a.local:3001)           Site B (site-b.local:3002)
┌─────────────────────┐              ┌─────────────────────┐
│  ビジターID生成      │              │  パラメータ受信      │
│  VID-xxx-yyy        │──────────────▶│  MCID=VID-xxx-yyy   │
│                     │   リンクに     │                     │
│  ページビュー送信    │   パラメータ   │  同一ビジターとして  │
│                     │   付与        │  認識               │
└─────────────────────┘              └─────────────────────┘
```

### クロスドメイン無効時（→ Site C）

```
Site A/B                              Site C (site-c.local:3003)
┌─────────────────────┐              ┌─────────────────────┐
│  ビジターID          │              │  新規ビジターID生成  │
│  VID-xxx-yyy        │──────────────▶│  VID-aaa-bbb        │
│                     │   パラメータ   │                     │
│                     │   なし        │  別訪問者として      │
│                     │              │  記録される         │
└─────────────────────┘              └─────────────────────┘
```

### Site A/B と Site C の違い

| 機能 | Site A/B | Site C |
|------|----------|--------|
| クロスドメインパラメータ付与 | ✅ 有効 | ❌ 無効 |
| ビジターID引き継ぎ | ✅ あり | ❌ なし |
| 遷移元との紐付け | ✅ 可能 | ❌ 不可 |

### URLパラメータ

クロスドメインリンク（Site A ↔ Site B）をクリックすると、以下のパラメータが自動付与されます:

- `adobe_mc`: MCMID, MCORGID, TSを含む統合パラメータ
- `MCID`: Marketing Cloud ID（ビジターID）
- `TS`: タイムスタンプ

Site Cへのリンクにはこれらのパラメータは付与されません。

## ディレクトリ構成

```
.
├── site-a/                 # Site A (site-a.local:3001) - Cross-Domain Enabled
│   ├── server.js           # HTTPサーバー
│   └── public/
│       ├── index.html      # トップページ
│       ├── page2.html      # 商品一覧
│       └── page3.html      # お問い合わせ
│
├── site-b/                 # Site B (site-b.local:3002) - Cross-Domain Enabled
│   ├── server.js           # HTTPサーバー
│   └── public/
│       ├── index.html      # トップページ
│       ├── landing.html    # ランディングページ
│       └── checkout.html   # チェックアウト
│
├── site-c/                 # Site C (site-c.local:3003) - Cross-Domain DISABLED
│   ├── server.js           # HTTPサーバー
│   └── public/
│       ├── index.html      # トップページ（比較表示あり）
│       └── about.html      # 会社概要
│
├── shared/                 # 共通ファイル
│   ├── config.js           # Adobe Tags 設定（★ここを編集）
│   ├── tracking-core.js    # トラッキングコアライブラリ
│   ├── debug-panel.js      # デバッグパネル
│   └── styles.css          # 共通スタイル
│
├── start.js                # 起動スクリプト (Node.js)
├── start.sh                # 起動スクリプト (Bash)
├── package.json
└── README.md
```

## デバッグパネル

画面右下に表示されるデバッグパネルでは以下の情報を確認できます:

- **Visitor Information**: ビジターID、セッションID、初回訪問サイト
- **Current Site**: 現在のサイト情報、クロスドメイン設定
- **Tracking Log**: トラッキングイベントのリアルタイムログ
- **Beacon Queue**: 送信されたビーコン一覧

### 操作

- **Reset**: トラッキングデータをリセット
- **_/+**: パネルの最小化/展開

## テストシナリオ

### シナリオ1: 基本的なクロスドメイン遷移（有効）

1. Site A のトップページにアクセス
2. デバッグパネルでビジターIDを確認（例: `VID-xxx-yyy`）
3. 「Site Bへ移動」をクリック
4. Site B で**同じビジターID**が引き継がれていることを確認

### シナリオ2: クロスドメイン無効時の遷移

1. Site A のトップページにアクセス
2. デバッグパネルでビジターIDを確認（例: `VID-xxx-yyy`）
3. 「Site Cへ（パラメータなし）」をクリック
4. Site C で**新しいビジターID**が生成されていることを確認
5. 遷移元ドメインは表示されるが、ビジターIDは紐付かない

### シナリオ3: 購入フロー

1. Site A で商品を閲覧（page2.html）
2. 「Site B ランディング」をクリック
3. Site B でランディングページ → チェックアウトへ遷移
4. 購入完了イベントを送信
5. 同一ビジターとして紐付けられていることを確認

### シナリオ4: UTMパラメータテスト

Site B のランディングページに UTM パラメータ付きでアクセス:

```
http://site-b.local:3002/landing.html?utm_source=test&utm_medium=email&utm_campaign=demo
```

### シナリオ5: クロスドメイン有効/無効の比較

1. Site A でビジターIDを確認
2. Site B に遷移 → 同じビジターID（クロスドメイン有効）
3. Site A に戻る
4. Site C に遷移 → 別のビジターID（クロスドメイン無効）
5. デバッグパネルで「初回訪問サイト」が異なることを確認

### シナリオ6: Adobe Tags 読み込み確認

1. `shared/config.js` に Adobe Tags URL を設定
2. サーバーを再起動
3. Site A にアクセス
4. 「Adobe Tags 設定状況」で「読み込み完了」と表示されることを確認
5. ブラウザの開発者ツールで Adobe Tags のリクエストを確認

## ライセンス

MIT
