# Adobe Analytics Cross-Domain Tracking Test Environment

Adobe Analyticsのクロスドメイントラッキングをローカル環境でテストするためのダミーサイト環境です。

## 概要

このプロジェクトは、異なるポート（＝擬似的な異なるドメイン）で動作する3つのサイトを提供し、クロスドメイントラッキングの動作を確認・テストできます。

- **Site A** (localhost:3001): 商品閲覧サイト - クロスドメイン有効
- **Site B** (localhost:3002): 購入・コンバージョンサイト - クロスドメイン有効
- **Site C** (localhost:3003): 独立サイト - **クロスドメイン無効**

## 機能

- ビジターIDの生成と管理
- セッションIDの管理
- クロスドメインリンクへのパラメータ自動付与（`adobe_mc`パラメータ互換）
- ページビュー/イベントのトラッキング（デモ）
- リアルタイムデバッグパネル
- **クロスドメイン無効時の挙動確認（Site C）**

## セットアップ

### 必要条件

- Node.js v14以上

### インストール

```bash
# リポジトリをクローン
git clone https://github.com/tomohisay/test-crossdomaintracking.git
cd test-crossdomaintracking

# 依存関係のインストール（オプション：concurrentlyを使う場合）
npm install
```

### サーバーの起動

#### 方法1: Node.jsスクリプト（推奨）

```bash
node start.js
```

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

1. サーバーを起動
2. ブラウザで http://localhost:3001/ （Site A）にアクセス
3. 画面右下のデバッグパネルでトラッキング状況を確認
4. ナビゲーションの「Site Bへ移動」をクリックしてクロスドメイン遷移
5. Site Bでビジターがつながっているか確認
6. 「Site Cへ（パラメータなし）」をクリックしてクロスドメイン無効の遷移をテスト

## クロスドメイントラッキングの仕組み

### クロスドメイン有効時（Site A ↔ Site B）

```
Site A (localhost:3001)              Site B (localhost:3002)
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
Site A/B                              Site C (localhost:3003)
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
├── site-a/                 # Site A (localhost:3001) - Cross-Domain Enabled
│   ├── server.js           # HTTPサーバー
│   └── public/
│       ├── index.html      # トップページ
│       ├── page2.html      # 商品一覧
│       └── page3.html      # お問い合わせ
│
├── site-b/                 # Site B (localhost:3002) - Cross-Domain Enabled
│   ├── server.js           # HTTPサーバー
│   └── public/
│       ├── index.html      # トップページ
│       ├── landing.html    # ランディングページ
│       └── checkout.html   # チェックアウト
│
├── site-c/                 # Site C (localhost:3003) - Cross-Domain DISABLED
│   ├── server.js           # HTTPサーバー
│   └── public/
│       ├── index.html      # トップページ（比較表示あり）
│       └── about.html      # 会社概要
│
├── shared/                 # 共通ファイル
│   ├── tracking-core.js    # トラッキングコアライブラリ
│   ├── debug-panel.js      # デバッグパネル
│   └── styles.css          # 共通スタイル
│
├── start.js                # 起動スクリプト (Node.js)
├── start.sh                # 起動スクリプト (Bash)
├── package.json
└── README.md
```

## Adobe Analytics 実装の追加

### AppMeasurement.js の場合

`shared/tracking-core.js` の該当箇所にコードを追加:

```javascript
// trackPageView メソッド内
s.pageName = data.pageName;
s.pageURL = data.pageUrl;
s.t();

// trackEvent メソッド内
s.linkTrackVars = 'events,eVar1,prop1';
s.linkTrackEvents = 'event1';
s.events = 'event1';
s.tl(this, 'o', data.eventName);
```

### Web SDK (alloy.js) の場合

```javascript
// trackPageView メソッド内
alloy('sendEvent', {
  xdm: {
    web: {
      webPageDetails: {
        name: data.pageName,
        URL: data.pageUrl
      }
    }
  }
});
```

### 設定の変更

各HTMLファイルの `adobeAnalyticsConfig` を実際の値に更新:

```javascript
window.adobeAnalyticsConfig = {
  trackingServer: 'your-actual-server.sc.omtrdc.net',
  trackingServerSecure: 'your-actual-server.sc.omtrdc.net',
  reportSuiteId: 'your-actual-rsid',
  marketingCloudOrgId: 'your-actual-org@AdobeOrg',
  crossDomainEnabled: true,  // Site Cではfalse
  // ...
};
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
http://localhost:3002/landing.html?utm_source=test&utm_medium=email&utm_campaign=demo
```

### シナリオ5: クロスドメイン有効/無効の比較

1. Site A でビジターIDを確認
2. Site B に遷移 → 同じビジターID（クロスドメイン有効）
3. Site A に戻る
4. Site C に遷移 → 別のビジターID（クロスドメイン無効）
5. デバッグパネルで「初回訪問サイト」が異なることを確認

## ライセンス

MIT
