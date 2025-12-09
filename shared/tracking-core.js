/**
 * Cross-Domain Tracking Core
 *
 * このファイルはAdobe Analyticsのクロスドメイントラッキングをシミュレートするためのコアライブラリです。
 * 実際のAdobe Analytics実装はAdobe Tags (Launch) 経由で読み込まれます。
 * config.js で Adobe Tags の URL を設定してください。
 *
 * 主な機能:
 * - ビジターIDの生成と管理
 * - セッションIDの生成と管理
 * - クロスドメインリンクへのパラメータ付与
 * - ページビュー/イベントのトラッキング（デモ用）
 * - デバッグパネルへのログ出力
 * - Adobe Tags との連携
 */

(function(window) {
  'use strict';

  // ストレージキー
  const STORAGE_KEYS = {
    VISITOR_ID: 'xdomain_visitor_id',
    SESSION_ID: 'xdomain_session_id',
    FIRST_TOUCH_SITE: 'xdomain_first_touch_site',
    FIRST_TOUCH_TIME: 'xdomain_first_touch_time',
    TRACKING_LOG: 'xdomain_tracking_log'
  };

  // URLパラメータキー（Adobe Analytics互換）
  const URL_PARAMS = {
    VISITOR_ID: 'MCID',           // Marketing Cloud ID
    SUPPLEMENTAL_ID: 'MCORGID',   // Organization ID
    ANALYTICS_ID: 'MCAID',        // Analytics ID
    TIMESTAMP: 'TS',              // Timestamp
    ADOBE_MC: 'adobe_mc'          // Adobe MC parameter (combined)
  };

  class TrackingCore {
    constructor() {
      // config.js から設定を取得、なければ旧形式の設定を参照
      this.config = this.loadConfig();
      this.visitorId = null;
      this.sessionId = null;
      this.initialized = false;
      this.trackingLog = [];
      this.adobeTagsLoaded = false;
    }

    /**
     * 設定を読み込み
     */
    loadConfig() {
      // 新形式: config.js からサイト設定を取得
      if (window.adobeConfig && window.adobeConfig.getCurrentSiteConfig) {
        const siteConfig = window.adobeConfig.getCurrentSiteConfig();
        if (siteConfig) {
          return {
            currentSite: siteConfig.siteName,
            currentDomain: siteConfig.domain,
            crossDomainEnabled: siteConfig.crossDomainEnabled,
            linkInternalFilters: siteConfig.linkInternalFilters,
            marketingCloudOrgId: siteConfig.marketingCloudOrgId,
            trackingServer: siteConfig.trackingServer,
            trackingServerSecure: siteConfig.trackingServerSecure,
            crossDomainDomains: siteConfig.crossDomainDomains
          };
        }
      }

      // フォールバック: 旧形式の設定
      return window.adobeAnalyticsConfig || {};
    }

    /**
     * 初期化
     */
    init() {
      if (this.initialized) return;

      // Adobe Tags の読み込み状態を確認
      this.adobeTagsLoaded = window._adobeTagsLoaded || false;
      const adobeTagsConfigured = window.adobeConfig && window.adobeConfig.isConfigured && window.adobeConfig.isConfigured();

      this.log('system', 'Tracking Core initializing...', {
        adobeTagsConfigured: adobeTagsConfigured,
        adobeTagsLoaded: this.adobeTagsLoaded
      });

      // URLパラメータからクロスドメイン情報を取得
      this.processCrossDomainParams();

      // ビジターIDを取得または生成
      this.visitorId = this.getOrCreateVisitorId();

      // セッションIDを取得または生成
      this.sessionId = this.getOrCreateSessionId();

      // 初回訪問サイトを記録
      this.recordFirstTouchSite();

      // クロスドメインリンクにパラメータを付与
      this.decorateLinks();

      // リンククリックをインターセプト
      this.setupLinkInterception();

      this.initialized = true;

      this.log('system', 'Tracking Core initialized', {
        visitorId: this.visitorId,
        sessionId: this.sessionId,
        currentSite: this.config.currentSite,
        crossDomainEnabled: this.config.crossDomainEnabled
      });

      // デバッグパネルを更新
      this.updateDebugPanel();
    }

    /**
     * クロスドメインパラメータを処理
     */
    processCrossDomainParams() {
      const urlParams = new URLSearchParams(window.location.search);

      // adobe_mc パラメータを解析
      const adobeMc = urlParams.get(URL_PARAMS.ADOBE_MC);
      if (adobeMc) {
        this.log('crossdomain', 'Received adobe_mc parameter', { adobe_mc: adobeMc });
        this.parseAdobeMcParam(adobeMc);
      }

      // 個別パラメータを解析
      const mcid = urlParams.get(URL_PARAMS.VISITOR_ID);
      if (mcid) {
        this.log('crossdomain', 'Received MCID from URL', { mcid: mcid });
        localStorage.setItem(STORAGE_KEYS.VISITOR_ID, mcid);
      }
    }

    /**
     * adobe_mc パラメータを解析
     */
    parseAdobeMcParam(param) {
      // adobe_mc format: MCID=xxx|MCORGID=xxx|TS=xxx
      const parts = param.split('|');
      parts.forEach(part => {
        const [key, value] = part.split('=');
        if (key === 'MCMID' || key === 'MCID') {
          localStorage.setItem(STORAGE_KEYS.VISITOR_ID, value);
          this.log('crossdomain', 'Stored visitor ID from adobe_mc', { visitorId: value });
        }
      });
    }

    /**
     * ビジターIDを取得または生成
     */
    getOrCreateVisitorId() {
      let visitorId = localStorage.getItem(STORAGE_KEYS.VISITOR_ID);

      if (!visitorId) {
        visitorId = this.generateId('VID');
        localStorage.setItem(STORAGE_KEYS.VISITOR_ID, visitorId);
        this.log('visitor', 'Generated new visitor ID', { visitorId: visitorId });
      } else {
        this.log('visitor', 'Retrieved existing visitor ID', { visitorId: visitorId });
      }

      return visitorId;
    }

    /**
     * セッションIDを取得または生成
     */
    getOrCreateSessionId() {
      let sessionId = sessionStorage.getItem(STORAGE_KEYS.SESSION_ID);

      if (!sessionId) {
        sessionId = this.generateId('SID');
        sessionStorage.setItem(STORAGE_KEYS.SESSION_ID, sessionId);
        this.log('session', 'Generated new session ID', { sessionId: sessionId });
      } else {
        this.log('session', 'Retrieved existing session ID', { sessionId: sessionId });
      }

      return sessionId;
    }

    /**
     * 初回訪問サイトを記録
     */
    recordFirstTouchSite() {
      let firstTouchSite = localStorage.getItem(STORAGE_KEYS.FIRST_TOUCH_SITE);

      if (!firstTouchSite) {
        firstTouchSite = this.config.currentSite || window.location.host;
        localStorage.setItem(STORAGE_KEYS.FIRST_TOUCH_SITE, firstTouchSite);
        localStorage.setItem(STORAGE_KEYS.FIRST_TOUCH_TIME, new Date().toISOString());
        this.log('visitor', 'Recorded first touch site', { firstTouchSite: firstTouchSite });
      }
    }

    /**
     * IDを生成
     */
    generateId(prefix) {
      const timestamp = Date.now().toString(36);
      const randomPart = Math.random().toString(36).substring(2, 15);
      return `${prefix}-${timestamp}-${randomPart}`;
    }

    /**
     * クロスドメインリンクにパラメータを付与
     */
    decorateLinks() {
      const links = document.querySelectorAll('a.cross-domain-link');

      links.forEach(link => {
        this.decorateLink(link);
      });

      this.log('crossdomain', `Decorated ${links.length} cross-domain links`);
    }

    /**
     * 単一リンクにパラメータを付与
     */
    decorateLink(link) {
      const href = link.getAttribute('href');
      if (!href) return;

      try {
        const url = new URL(href, window.location.origin);

        // adobe_mc パラメータを構築
        const adobeMc = this.buildAdobeMcParam();
        url.searchParams.set(URL_PARAMS.ADOBE_MC, adobeMc);

        // 個別パラメータも付与（デバッグ用）
        url.searchParams.set(URL_PARAMS.VISITOR_ID, this.visitorId);
        url.searchParams.set(URL_PARAMS.TIMESTAMP, Date.now().toString());

        link.setAttribute('href', url.toString());
      } catch (e) {
        this.log('error', 'Failed to decorate link', { href: href, error: e.message });
      }
    }

    /**
     * adobe_mc パラメータを構築
     */
    buildAdobeMcParam() {
      const parts = [
        `MCMID=${this.visitorId}`,
        `MCORGID=${this.config.marketingCloudOrgId || 'test-org@AdobeOrg'}`,
        `TS=${Date.now()}`
      ];
      return parts.join('|');
    }

    /**
     * リンククリックをインターセプト
     */
    setupLinkInterception() {
      document.addEventListener('click', (e) => {
        const link = e.target.closest('a.cross-domain-link');
        if (link) {
          // リンクを再装飾（最新のIDを使用）
          this.decorateLink(link);

          const targetDomain = link.getAttribute('data-target-domain') || 'unknown';
          this.log('crossdomain', 'Cross-domain link clicked', {
            targetDomain: targetDomain,
            href: link.getAttribute('href'),
            visitorId: this.visitorId
          });
        }
      });
    }

    /**
     * ページビューをトラッキング
     */
    trackPageView(data) {
      const payload = {
        type: 'pageView',
        timestamp: new Date().toISOString(),
        visitorId: this.visitorId,
        sessionId: this.sessionId,
        site: this.config.currentSite,
        domain: this.config.currentDomain,
        referrer: document.referrer,
        ...data
      };

      this.log('pageview', 'Page view tracked', payload);
      this.sendToDebugPanel(payload);

      // ============================================
      // Adobe Analytics 実装プレースホルダー
      // 実際の実装では以下のようなコードになります:
      //
      // AppMeasurement の場合:
      // s.pageName = data.pageName;
      // s.pageURL = data.pageUrl;
      // s.t();
      //
      // Web SDK (alloy.js) の場合:
      // alloy('sendEvent', {
      //   xdm: {
      //     web: {
      //       webPageDetails: {
      //         name: data.pageName,
      //         URL: data.pageUrl
      //       }
      //     }
      //   }
      // });
      // ============================================

      return payload;
    }

    /**
     * イベントをトラッキング
     */
    trackEvent(data) {
      const payload = {
        type: 'event',
        timestamp: new Date().toISOString(),
        visitorId: this.visitorId,
        sessionId: this.sessionId,
        site: this.config.currentSite,
        domain: this.config.currentDomain,
        ...data
      };

      this.log('event', `Event tracked: ${data.eventType}`, payload);
      this.sendToDebugPanel(payload);

      // ============================================
      // Adobe Analytics 実装プレースホルダー
      //
      // AppMeasurement の場合:
      // s.linkTrackVars = 'events,eVar1,prop1';
      // s.linkTrackEvents = 'event1';
      // s.events = 'event1';
      // s.tl(this, 'o', data.eventName);
      //
      // Web SDK (alloy.js) の場合:
      // alloy('sendEvent', {
      //   xdm: {
      //     eventType: data.eventType,
      //     ...
      //   }
      // });
      // ============================================

      return payload;
    }

    /**
     * ログを記録
     */
    log(category, message, data = {}) {
      const logEntry = {
        timestamp: new Date().toISOString(),
        category: category,
        message: message,
        data: data
      };

      this.trackingLog.push(logEntry);

      // コンソールにも出力
      console.log(`[Tracking ${category}]`, message, data);

      // localStorage に保存（最新100件）
      const storedLog = JSON.parse(localStorage.getItem(STORAGE_KEYS.TRACKING_LOG) || '[]');
      storedLog.push(logEntry);
      if (storedLog.length > 100) storedLog.shift();
      localStorage.setItem(STORAGE_KEYS.TRACKING_LOG, JSON.stringify(storedLog));

      // デバッグパネルを更新
      this.updateDebugPanel();
    }

    /**
     * デバッグパネルにデータを送信
     */
    sendToDebugPanel(payload) {
      if (window.debugPanel) {
        window.debugPanel.addTrackingEntry(payload);
      }
    }

    /**
     * デバッグパネルを更新
     */
    updateDebugPanel() {
      if (window.debugPanel) {
        window.debugPanel.update({
          visitorId: this.visitorId,
          sessionId: this.sessionId,
          firstTouchSite: this.getFirstTouchSite(),
          config: this.config,
          log: this.trackingLog.slice(-20)
        });
      }
    }

    /**
     * ビジターIDを取得
     */
    getVisitorId() {
      return this.visitorId || localStorage.getItem(STORAGE_KEYS.VISITOR_ID);
    }

    /**
     * セッションIDを取得
     */
    getSessionId() {
      return this.sessionId || sessionStorage.getItem(STORAGE_KEYS.SESSION_ID);
    }

    /**
     * 初回訪問サイトを取得
     */
    getFirstTouchSite() {
      return localStorage.getItem(STORAGE_KEYS.FIRST_TOUCH_SITE);
    }

    /**
     * トラッキングログを取得
     */
    getTrackingLog() {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.TRACKING_LOG) || '[]');
    }

    /**
     * トラッキングデータをリセット
     */
    reset() {
      localStorage.removeItem(STORAGE_KEYS.VISITOR_ID);
      localStorage.removeItem(STORAGE_KEYS.FIRST_TOUCH_SITE);
      localStorage.removeItem(STORAGE_KEYS.FIRST_TOUCH_TIME);
      localStorage.removeItem(STORAGE_KEYS.TRACKING_LOG);
      sessionStorage.removeItem(STORAGE_KEYS.SESSION_ID);

      this.visitorId = null;
      this.sessionId = null;
      this.trackingLog = [];
      this.initialized = false;

      this.log('system', 'Tracking data reset');
      this.init();
    }
  }

  // グローバルにエクスポート
  window.trackingCore = new TrackingCore();

})(window);
