/**
 * OBIC7自動入力ツール - ポップアップスクリプト
 */

class PopupController {
  constructor() {
    this.init();
  }

  async init() {
    // DOM読み込み完了を待つ
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.setupEventListeners());
    } else {
      this.setupEventListeners();
    }

    // 設定とステータスを読み込み
    await this.loadSettings();
    await this.loadStats();
    this.updateStatus();
  }

  setupEventListeners() {
    // 設定変更イベント
    document.getElementById('autoFillEnabled').addEventListener('change', (e) => {
      this.saveSetting('autoFillEnabled', e.target.checked);
    });

    document.getElementById('showNotifications').addEventListener('change', (e) => {
      this.saveSetting('showNotifications', e.target.checked);
    });

    // ボタンイベント
    document.getElementById('resetStats').addEventListener('click', () => {
      this.resetStats();
    });

    document.getElementById('openOptions').addEventListener('click', () => {
      this.openOptionsPage();
    });
  }

  // 設定の読み込み
  async loadSettings() {
    try {
      const result = await chrome.storage.sync.get(['settings']);
      const settings = result.settings || this.getDefaultSettings();

      document.getElementById('autoFillEnabled').checked = settings.autoFillEnabled;
      document.getElementById('showNotifications').checked = settings.showNotifications;
    } catch (error) {
      console.error('設定読み込みエラー:', error);
    }
  }

  // 統計の読み込み
  async loadStats() {
    try {
      const result = await chrome.storage.local.get(['stats']);
      const stats = result.stats || { todayCount: 0, totalCount: 0, lastUsed: null };

      // 日付が変わっていたら今日のカウントをリセット
      const today = new Date().toDateString();
      if (stats.lastUsed !== today) {
        stats.todayCount = 0;
        stats.lastUsed = today;
        await chrome.storage.local.set({ stats });
      }

      document.getElementById('todayCount').textContent = stats.todayCount;
      document.getElementById('totalCount').textContent = stats.totalCount;
    } catch (error) {
      console.error('統計読み込みエラー:', error);
    }
  }

  // ステータス更新
  async updateStatus() {
    try {
      // アクティブタブがOBIC7ページかチェック
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const currentTab = tabs[0];

      const statusElement = document.getElementById('status');
      const indicator = statusElement.querySelector('.status-indicator');
      const text = statusElement.querySelector('.status-text');

      if (currentTab && currentTab.url && currentTab.url.includes('obic.gk-net.jp')) {
        if (currentTab.url.includes('KozinbetuKinmuhyou')) {
          // 勤務表ページ
          statusElement.style.backgroundColor = '#e8f5e8';
          statusElement.style.borderLeftColor = '#4CAF50';
          indicator.style.backgroundColor = '#4CAF50';
          text.textContent = '勤務表ページで利用可能';
          text.style.color = '#2e7d32';
        } else {
          // OBIC7の他のページ
          statusElement.style.backgroundColor = '#fff3cd';
          statusElement.style.borderLeftColor = '#ffc107';
          indicator.style.backgroundColor = '#ffc107';
          text.textContent = 'OBIC7ページ（勤務表以外）';
          text.style.color = '#856404';
        }
      } else {
        // OBIC7以外のページ
        statusElement.style.backgroundColor = '#f8d7da';
        statusElement.style.borderLeftColor = '#dc3545';
        indicator.style.backgroundColor = '#dc3545';
        text.textContent = 'OBIC7ページではありません';
        text.style.color = '#721c24';
      }
    } catch (error) {
      console.error('ステータス更新エラー:', error);
    }
  }

  // 設定の保存
  async saveSetting(key, value) {
    try {
      const result = await chrome.storage.sync.get(['settings']);
      const settings = result.settings || this.getDefaultSettings();
      settings[key] = value;
      await chrome.storage.sync.set({ settings });
    } catch (error) {
      console.error('設定保存エラー:', error);
    }
  }

  // 統計のリセット
  async resetStats() {
    try {
      const stats = { todayCount: 0, totalCount: 0, lastUsed: new Date().toDateString() };
      await chrome.storage.local.set({ stats });
      
      document.getElementById('todayCount').textContent = '0';
      document.getElementById('totalCount').textContent = '0';
      
      // 確認メッセージ
      this.showMessage('統計をリセットしました', 'success');
    } catch (error) {
      console.error('統計リセットエラー:', error);
      this.showMessage('統計のリセットに失敗しました', 'error');
    }
  }

  // オプションページを開く
  openOptionsPage() {
    chrome.runtime.openOptionsPage();
    window.close();
  }

  // メッセージ表示
  showMessage(message, type = 'info') {
    // 簡易的なメッセージ表示（アラートの代替）
    const messageDiv = document.createElement('div');
    messageDiv.style.cssText = `
      position: fixed;
      top: 10px;
      left: 50%;
      transform: translateX(-50%);
      padding: 8px 16px;
      border-radius: 4px;
      font-size: 12px;
      z-index: 1000;
      color: white;
      background-color: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#2196F3'};
    `;
    messageDiv.textContent = message;
    
    document.body.appendChild(messageDiv);
    
    setTimeout(() => {
      if (messageDiv.parentElement) {
        messageDiv.remove();
      }
    }, 2000);
  }

  // デフォルト設定
  getDefaultSettings() {
    return {
      autoFillEnabled: true,
      showNotifications: true,
      copyClockTimes: true,
      fillRemoteWork: false,
      fillRemarks: false
    };
  }
}

// ポップアップ初期化
new PopupController();