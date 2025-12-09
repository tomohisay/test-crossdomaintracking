/**
 * Debug Panel
 *
 * トラッキング状況を可視化するためのデバッグパネル
 * ページ右下に固定表示され、以下の情報を表示します:
 * - 現在のビジターID / セッションID
 * - クロスドメイン設定
 * - トラッキングログ（リアルタイム）
 * - 送信されたビーコン一覧
 */

(function(window) {
  'use strict';

  class DebugPanel {
    constructor() {
      this.container = null;
      this.isMinimized = false;
      this.trackingEntries = [];
      this.maxEntries = 50;
    }

    /**
     * パネルを初期化
     */
    init() {
      this.createPanel();
      this.attachEventListeners();
    }

    /**
     * パネルのHTML構造を作成
     */
    createPanel() {
      const panel = document.createElement('div');
      panel.id = 'debug-panel';
      panel.innerHTML = `
        <div class="debug-panel-header">
          <span class="debug-panel-title">Tracking Debug Panel</span>
          <div class="debug-panel-controls">
            <button class="debug-btn debug-btn-reset" title="Reset Tracking Data">Reset</button>
            <button class="debug-btn debug-btn-toggle" title="Toggle Panel">_</button>
          </div>
        </div>
        <div class="debug-panel-body">
          <div class="debug-section">
            <h4>Visitor Information</h4>
            <div class="debug-info">
              <div class="debug-row">
                <span class="debug-label">Visitor ID:</span>
                <span class="debug-value" id="debug-visitor-id">-</span>
              </div>
              <div class="debug-row">
                <span class="debug-label">Session ID:</span>
                <span class="debug-value" id="debug-session-id">-</span>
              </div>
              <div class="debug-row">
                <span class="debug-label">First Touch:</span>
                <span class="debug-value" id="debug-first-touch">-</span>
              </div>
            </div>
          </div>

          <div class="debug-section">
            <h4>Current Site</h4>
            <div class="debug-info">
              <div class="debug-row">
                <span class="debug-label">Site:</span>
                <span class="debug-value" id="debug-current-site">-</span>
              </div>
              <div class="debug-row">
                <span class="debug-label">Domain:</span>
                <span class="debug-value" id="debug-current-domain">-</span>
              </div>
              <div class="debug-row">
                <span class="debug-label">Cross-Domain:</span>
                <span class="debug-value" id="debug-crossdomain-enabled">-</span>
              </div>
            </div>
          </div>

          <div class="debug-section">
            <h4>Tracking Log</h4>
            <div class="debug-log" id="debug-log">
              <div class="debug-log-empty">No tracking events yet</div>
            </div>
          </div>

          <div class="debug-section">
            <h4>Beacon Queue</h4>
            <div class="debug-beacons" id="debug-beacons">
              <div class="debug-log-empty">No beacons sent</div>
            </div>
          </div>
        </div>
      `;

      // スタイルを追加
      this.addStyles();

      document.body.appendChild(panel);
      this.container = panel;
    }

    /**
     * スタイルを追加
     */
    addStyles() {
      const style = document.createElement('style');
      style.textContent = `
        #debug-panel {
          position: fixed;
          bottom: 20px;
          right: 20px;
          width: 380px;
          max-height: 500px;
          background: #1a1a2e;
          border: 1px solid #4a4a6a;
          border-radius: 8px;
          font-family: 'Monaco', 'Menlo', monospace;
          font-size: 11px;
          color: #e0e0e0;
          z-index: 10000;
          box-shadow: 0 4px 20px rgba(0,0,0,0.4);
          overflow: hidden;
        }

        #debug-panel.minimized .debug-panel-body {
          display: none;
        }

        .debug-panel-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 12px;
          background: #16213e;
          border-bottom: 1px solid #4a4a6a;
          cursor: move;
        }

        .debug-panel-title {
          font-weight: bold;
          color: #00d4ff;
        }

        .debug-panel-controls {
          display: flex;
          gap: 8px;
        }

        .debug-btn {
          padding: 4px 8px;
          border: 1px solid #4a4a6a;
          border-radius: 4px;
          background: #0f3460;
          color: #e0e0e0;
          cursor: pointer;
          font-size: 10px;
        }

        .debug-btn:hover {
          background: #1a4a7a;
        }

        .debug-btn-reset {
          background: #6a1a1a;
        }

        .debug-btn-reset:hover {
          background: #8a2a2a;
        }

        .debug-panel-body {
          max-height: 420px;
          overflow-y: auto;
          padding: 10px;
        }

        .debug-section {
          margin-bottom: 12px;
        }

        .debug-section h4 {
          margin: 0 0 8px 0;
          padding-bottom: 4px;
          border-bottom: 1px solid #3a3a5a;
          color: #ff6b6b;
          font-size: 11px;
        }

        .debug-info {
          background: #0f0f23;
          border-radius: 4px;
          padding: 8px;
        }

        .debug-row {
          display: flex;
          margin-bottom: 4px;
        }

        .debug-row:last-child {
          margin-bottom: 0;
        }

        .debug-label {
          width: 100px;
          color: #888;
          flex-shrink: 0;
        }

        .debug-value {
          color: #4ade80;
          word-break: break-all;
        }

        .debug-log, .debug-beacons {
          background: #0f0f23;
          border-radius: 4px;
          padding: 8px;
          max-height: 150px;
          overflow-y: auto;
        }

        .debug-log-entry {
          padding: 4px 0;
          border-bottom: 1px solid #2a2a3a;
          font-size: 10px;
        }

        .debug-log-entry:last-child {
          border-bottom: none;
        }

        .debug-log-time {
          color: #666;
          margin-right: 8px;
        }

        .debug-log-category {
          display: inline-block;
          padding: 1px 4px;
          border-radius: 3px;
          margin-right: 6px;
          font-size: 9px;
          text-transform: uppercase;
        }

        .debug-log-category.system { background: #2a4a6a; color: #7dd3fc; }
        .debug-log-category.visitor { background: #3a4a3a; color: #86efac; }
        .debug-log-category.session { background: #4a3a4a; color: #d8b4fe; }
        .debug-log-category.pageview { background: #4a4a2a; color: #fde047; }
        .debug-log-category.event { background: #5a3a3a; color: #fca5a5; }
        .debug-log-category.crossdomain { background: #2a3a5a; color: #93c5fd; }
        .debug-log-category.error { background: #6a2a2a; color: #fca5a5; }

        .debug-log-message {
          color: #e0e0e0;
        }

        .debug-log-empty {
          color: #666;
          font-style: italic;
          text-align: center;
          padding: 10px;
        }

        .debug-beacon-entry {
          padding: 6px;
          margin-bottom: 6px;
          background: #1a1a3a;
          border-radius: 4px;
          border-left: 3px solid #00d4ff;
        }

        .debug-beacon-entry:last-child {
          margin-bottom: 0;
        }

        .debug-beacon-type {
          font-weight: bold;
          color: #00d4ff;
          margin-bottom: 4px;
        }

        .debug-beacon-data {
          color: #888;
          font-size: 9px;
          word-break: break-all;
        }
      `;
      document.head.appendChild(style);
    }

    /**
     * イベントリスナーを設定
     */
    attachEventListeners() {
      // トグルボタン
      const toggleBtn = this.container.querySelector('.debug-btn-toggle');
      toggleBtn.addEventListener('click', () => this.toggle());

      // リセットボタン
      const resetBtn = this.container.querySelector('.debug-btn-reset');
      resetBtn.addEventListener('click', () => {
        if (confirm('トラッキングデータをリセットしますか？')) {
          if (window.trackingCore) {
            window.trackingCore.reset();
          }
          this.trackingEntries = [];
          this.updateBeacons();
        }
      });
    }

    /**
     * パネルの表示/非表示を切り替え
     */
    toggle() {
      this.isMinimized = !this.isMinimized;
      this.container.classList.toggle('minimized', this.isMinimized);
      const toggleBtn = this.container.querySelector('.debug-btn-toggle');
      toggleBtn.textContent = this.isMinimized ? '+' : '_';
    }

    /**
     * パネルを更新
     */
    update(data) {
      if (!this.container) return;

      // Visitor Information
      document.getElementById('debug-visitor-id').textContent = data.visitorId || '-';
      document.getElementById('debug-session-id').textContent = data.sessionId || '-';
      document.getElementById('debug-first-touch').textContent = data.firstTouchSite || '-';

      // Current Site
      if (data.config) {
        document.getElementById('debug-current-site').textContent = data.config.currentSite || '-';
        document.getElementById('debug-current-domain').textContent = data.config.currentDomain || '-';
        document.getElementById('debug-crossdomain-enabled').textContent =
          data.config.crossDomainEnabled ? 'Enabled' : 'Disabled';
      }

      // Tracking Log
      if (data.log) {
        this.updateLog(data.log);
      }
    }

    /**
     * ログを更新
     */
    updateLog(log) {
      const logContainer = document.getElementById('debug-log');
      if (!logContainer) return;

      if (log.length === 0) {
        logContainer.innerHTML = '<div class="debug-log-empty">No tracking events yet</div>';
        return;
      }

      const html = log.slice(-20).reverse().map(entry => {
        const time = new Date(entry.timestamp).toLocaleTimeString();
        return `
          <div class="debug-log-entry">
            <span class="debug-log-time">${time}</span>
            <span class="debug-log-category ${entry.category}">${entry.category}</span>
            <span class="debug-log-message">${entry.message}</span>
          </div>
        `;
      }).join('');

      logContainer.innerHTML = html;
    }

    /**
     * トラッキングエントリを追加
     */
    addTrackingEntry(payload) {
      this.trackingEntries.push(payload);
      if (this.trackingEntries.length > this.maxEntries) {
        this.trackingEntries.shift();
      }
      this.updateBeacons();
    }

    /**
     * ビーコン一覧を更新
     */
    updateBeacons() {
      const beaconsContainer = document.getElementById('debug-beacons');
      if (!beaconsContainer) return;

      if (this.trackingEntries.length === 0) {
        beaconsContainer.innerHTML = '<div class="debug-log-empty">No beacons sent</div>';
        return;
      }

      const html = this.trackingEntries.slice(-10).reverse().map(entry => {
        const time = new Date(entry.timestamp).toLocaleTimeString();
        const dataStr = JSON.stringify(entry, null, 0).substring(0, 150);
        return `
          <div class="debug-beacon-entry">
            <div class="debug-beacon-type">${entry.type} (${time})</div>
            <div class="debug-beacon-data">${dataStr}...</div>
          </div>
        `;
      }).join('');

      beaconsContainer.innerHTML = html;
    }
  }

  // グローバルにエクスポート
  window.debugPanel = new DebugPanel();

  // DOMContentLoaded で初期化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => window.debugPanel.init());
  } else {
    window.debugPanel.init();
  }

})(window);
