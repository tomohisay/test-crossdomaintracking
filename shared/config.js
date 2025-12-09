/**
 * Adobe Analytics / Adobe Tags Configuration
 *
 * このファイルでAdobe Tags（Launch）のURLを一括管理します。
 * 各サイトのHTMLファイルから参照され、headタグにタグを動的に挿入します。
 *
 * 使用方法:
 * 1. 下記のADOBE_TAGS_URLを自身のAdobe Tagsプロパティの本番URLに置き換えてください
 * 2. 開発/ステージング環境用のURLも必要に応じて設定してください
 */

(function(window) {
  'use strict';

  // ============================================
  // Adobe Tags (Launch) 設定
  // ============================================

  const config = {
    /**
     * Adobe Tags (Launch) の埋め込みURL
     *
     * 取得方法:
     * 1. Adobe Experience Platform Data Collection (https://experience.adobe.com/) にログイン
     * 2. Tags > プロパティを選択
     * 3. 環境 > 本番環境の「インストール」をクリック
     * 4. スクリプトタグのsrc URLをコピー
     *
     * 例: //assets.adobedtm.com/abc123def456/ghi789jkl012/launch-abc123def456.min.js
     */
    adobeTagsUrl: '',  // ← ここに自身のAdobe Tags URLを設定

    /**
     * 開発環境用URL（オプション）
     */
    adobeTagsUrlDev: '',

    /**
     * ステージング環境用URL（オプション）
     */
    adobeTagsUrlStaging: '',

    /**
     * 非同期読み込み設定
     * true: async属性を付与（推奨）
     * false: 同期読み込み
     */
    async: true,

    /**
     * Adobe Tags が設定されていない場合にデバッグモードを有効にするか
     * true: ダミートラッキングでデバッグパネルに表示
     * false: トラッキングを無効化
     */
    enableDebugWithoutTags: true,

    // ============================================
    // サイト別設定
    // ============================================

    sites: {
      'Site A': {
        domain: 'site-a.local:3001',
        crossDomainEnabled: true,
        linkInternalFilters: 'site-a.local:3001'
      },
      'Site B': {
        domain: 'site-b.local:3002',
        crossDomainEnabled: true,
        linkInternalFilters: 'site-b.local:3002'
      },
      'Site C': {
        domain: 'site-c.local:3003',
        crossDomainEnabled: false,
        linkInternalFilters: 'site-c.local:3003'
      }
    },

    // ============================================
    // クロスドメイントラッキング設定
    // ============================================

    /**
     * クロスドメイン対象ドメインリスト
     * Site A と Site B 間でクロスドメイントラッキングを有効化
     */
    crossDomainDomains: [
      'site-a.local:3001',
      'site-b.local:3002'
      // Site C (site-c.local:3003) は含めない
    ],

    /**
     * Marketing Cloud Organization ID
     * Adobe Admin Console で確認可能
     */
    marketingCloudOrgId: '',  // ← 例: 'XXXXXXXXXXXXXXXX@AdobeOrg'

    /**
     * トラッキングサーバー
     */
    trackingServer: '',  // ← 例: 'your-company.sc.omtrdc.net'
    trackingServerSecure: ''  // ← 例: 'your-company.sc.omtrdc.net'
  };

  /**
   * Adobe Tags スクリプトをheadに挿入
   */
  function injectAdobeTags() {
    const url = config.adobeTagsUrl;

    if (!url) {
      console.log('[Adobe Tags] URL not configured. Running in debug mode.');
      window._adobeTagsDebugMode = true;
      return;
    }

    const script = document.createElement('script');
    script.src = url;
    if (config.async) {
      script.async = true;
    }

    script.onerror = function() {
      console.error('[Adobe Tags] Failed to load:', url);
      window._adobeTagsLoadError = true;
    };

    script.onload = function() {
      console.log('[Adobe Tags] Loaded successfully');
      window._adobeTagsLoaded = true;
    };

    // headの最初に挿入
    const head = document.head || document.getElementsByTagName('head')[0];
    const firstChild = head.firstChild;
    head.insertBefore(script, firstChild);

    console.log('[Adobe Tags] Injecting script:', url);
  }

  /**
   * 現在のサイト設定を取得
   */
  function getCurrentSiteConfig() {
    const host = window.location.host;

    for (const [siteName, siteConfig] of Object.entries(config.sites)) {
      if (siteConfig.domain === host) {
        return {
          siteName: siteName,
          ...siteConfig,
          marketingCloudOrgId: config.marketingCloudOrgId,
          trackingServer: config.trackingServer,
          trackingServerSecure: config.trackingServerSecure,
          crossDomainDomains: config.crossDomainDomains
        };
      }
    }

    return null;
  }

  /**
   * Adobe Tags URLが設定されているかチェック
   */
  function isAdobeTagsConfigured() {
    return !!config.adobeTagsUrl;
  }

  // グローバルにエクスポート
  window.adobeConfig = config;
  window.adobeConfig.inject = injectAdobeTags;
  window.adobeConfig.getCurrentSiteConfig = getCurrentSiteConfig;
  window.adobeConfig.isConfigured = isAdobeTagsConfigured;

  // 設定状態をログ出力
  console.log('[Adobe Config] Loaded. Tags URL configured:', isAdobeTagsConfigured());

})(window);
