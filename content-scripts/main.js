/**
 * OBIC7勤務表自動入力ツール - メインスクリプト
 */

class OBIC7AutoFill {
  constructor() {
    this.initializeAfterLoad();
  }

  // ページ読み込み完了後に初期化
  initializeAfterLoad() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.initialize());
    } else {
      this.initialize();
    }
  }

  // メイン初期化処理
  initialize() {
    console.log('OBIC7 Auto Fill Tool - 初期化開始');
    
    // OBIC7勤務表ページかチェック
    if (!this.isOBIC7WorkTimePage()) {
      console.log('OBIC7勤務表ページではありません');
      return;
    }

    // UIボタンを追加
    this.addCopyButton();
    console.log('OBIC7 Auto Fill Tool - 初期化完了');
  }

  // OBIC7勤務表ページの判定
  isOBIC7WorkTimePage() {
    return document.title.includes('個人別勤務表入力') && 
           document.querySelector('table') !== null;
  }

  // 一括コピーボタンを追加
  addCopyButton() {
    try {
      // ボタン配置位置を探す（表示ボタンの隣）
      const buttonContainer = this.findButtonContainer();
      if (!buttonContainer) {
        console.error('ボタン配置位置が見つかりません');
        return;
      }

      // 既にボタンが存在する場合は削除
      const existingButton = document.getElementById('obic7-auto-copy-btn');
      if (existingButton) {
        existingButton.remove();
      }

      // コピーボタンを作成
      const copyButton = this.createCopyButton();
      buttonContainer.appendChild(copyButton);
      
      console.log('一括コピーボタンを追加しました');
    } catch (error) {
      console.error('ボタン追加エラー:', error);
    }
  }

  // ボタン配置位置を探す
  findButtonContainer() {
    // 複数のパターンで探す
    const selectors = [
      '.button-container',
      'input[type="button"][value="表示"]',
      'td:has(input[value="表示"])',
      'table td'
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) {
        return element.tagName === 'TD' ? element : element.parentElement;
      }
    }

    // フォールバック: テーブルの上部に配置
    const table = document.querySelector('table');
    if (table && table.parentElement) {
      return table.parentElement;
    }

    return null;
  }

  // コピーボタンを作成
  createCopyButton() {
    const button = document.createElement('input');
    button.type = 'button';
    button.id = 'obic7-auto-copy-btn';
    button.value = '一括コピー';
    button.style.cssText = `
      margin: 0 5px;
      padding: 4px 12px;
      background-color: #4CAF50;
      color: white;
      border: none;
      border-radius: 3px;
      cursor: pointer;
      font-size: 12px;
    `;
    
    // ホバー効果
    button.addEventListener('mouseenter', () => {
      button.style.backgroundColor = '#45a049';
    });
    
    button.addEventListener('mouseleave', () => {
      button.style.backgroundColor = '#4CAF50';
    });

    // クリックイベント
    button.addEventListener('click', () => this.copyAllClockTimes());

    return button;
  }

  // 一括コピー処理のメイン関数
  async copyAllClockTimes() {
    const button = document.getElementById('obic7-auto-copy-btn');
    
    try {
      // ボタンを無効化
      button.disabled = true;
      button.value = '処理中...';
      button.style.backgroundColor = '#cccccc';

      // 勤務表の行を取得
      const workRows = this.getWorkRows();
      console.log(`処理対象行数: ${workRows.length}`);

      let successCount = 0;
      let errorCount = 0;

      // 各行を処理
      for (const row of workRows) {
        try {
          if (this.processRow(row)) {
            successCount++;
          } else {
            errorCount++;
          }
        } catch (error) {
          console.error('行処理エラー:', error);
          errorCount++;
        }
      }

      // 結果を表示
      this.showNotification(successCount, errorCount);
      console.log(`処理完了 - 成功: ${successCount}, エラー: ${errorCount}`);

    } catch (error) {
      console.error('一括コピー処理エラー:', error);
      this.showNotification(0, 1, 'システムエラーが発生しました');
    } finally {
      // ボタンを復元
      button.disabled = false;
      button.value = '一括コピー';
      button.style.backgroundColor = '#4CAF50';
    }
  }

  // 勤務表の行を取得
  getWorkRows() {
    const table = document.querySelector('table');
    if (!table) return [];

    const rows = Array.from(table.querySelectorAll('tr'));
    
    // データ行のみを抽出（ヘッダー行を除く）
    return rows.filter(row => {
      const cells = row.querySelectorAll('td');
      return cells.length > 5 && this.isDataRow(row);
    });
  }

  // データ行かどうかを判定
  isDataRow(row) {
    const firstCell = row.querySelector('td');
    if (!firstCell) return false;

    // 日付が含まれているかチェック（07/01 形式）
    const datePattern = /\d{2}\/\d{2}/;
    return datePattern.test(firstCell.textContent);
  }

  // 行の処理
  processRow(row) {
    try {
      const cells = Array.from(row.querySelectorAll('td'));
      
      // 打刻時間を取得
      const clockTimes = this.getClockTimesFromRow(cells);
      if (!clockTimes.startTime || !clockTimes.endTime) {
        console.log('打刻時間が未設定の行をスキップ');
        return false;
      }

      // 勤務時間を設定
      this.setWorkTimesToRow(cells, clockTimes);
      return true;

    } catch (error) {
      console.error('行処理中エラー:', error);
      return false;
    }
  }

  // 行から打刻時間を取得
  getClockTimesFromRow(cells) {
    try {
      // 出勤打刻・退勤打刻の列を探す（一般的に4-5列目あたり）
      let startTime = null;
      let endTime = null;

      // 各セルからselect要素を探して時間を取得
      for (let i = 3; i < Math.min(cells.length, 8); i++) {
        const selects = cells[i].querySelectorAll('select');
        
        if (selects.length >= 2) {
          const hour = selects[0].value;
          const minute = selects[1].value;
          
          if (hour && minute && hour !== '' && minute !== '') {
            const timeString = `${hour}:${minute}`;
            
            // 出勤時刻と退勤時刻を判別
            if (!startTime) {
              startTime = { hour, minute, timeString };
            } else if (!endTime) {
              endTime = { hour, minute, timeString };
              break; // 両方取得したら終了
            }
          }
        }
      }

      return { startTime, endTime };
    } catch (error) {
      console.error('打刻時間取得エラー:', error);
      return { startTime: null, endTime: null };
    }
  }

  // 行に勤務時間を設定
  setWorkTimesToRow(cells, clockTimes) {
    try {
      // 勤務時間設定先の列を探す（出勤・退勤列）
      let setCount = 0;
      
      for (let i = 5; i < Math.min(cells.length, 10); i++) {
        const selects = cells[i].querySelectorAll('select');
        
        if (selects.length >= 2 && setCount < 2) {
          const hourSelect = selects[0];
          const minuteSelect = selects[1];
          
          if (setCount === 0 && clockTimes.startTime) {
            // 出勤時間を設定
            this.setSelectValue(hourSelect, clockTimes.startTime.hour);
            this.setSelectValue(minuteSelect, clockTimes.startTime.minute);
            setCount++;
          } else if (setCount === 1 && clockTimes.endTime) {
            // 退勤時間を設定
            this.setSelectValue(hourSelect, clockTimes.endTime.hour);
            this.setSelectValue(minuteSelect, clockTimes.endTime.minute);
            setCount++;
            break;
          }
        }
      }

      return setCount === 2;
    } catch (error) {
      console.error('勤務時間設定エラー:', error);
      return false;
    }
  }

  // select要素に値を設定
  setSelectValue(selectElement, value) {
    if (!selectElement) return false;

    // 値が存在するかチェック
    const option = Array.from(selectElement.options).find(opt => opt.value === value);
    if (option) {
      selectElement.value = value;
      
      // changeイベントを発火（システムが変更を認識するため）
      const event = new Event('change', { bubbles: true });
      selectElement.dispatchEvent(event);
      
      return true;
    }
    
    return false;
  }

  // 通知表示
  showNotification(successCount, errorCount, customMessage = null) {
    // 既存の通知を削除
    const existingNotification = document.getElementById('obic7-notification');
    if (existingNotification) {
      existingNotification.remove();
    }

    // 通知要素を作成
    const notification = document.createElement('div');
    notification.id = 'obic7-notification';
    
    let message;
    let bgColor;
    
    if (customMessage) {
      message = customMessage;
      bgColor = '#f44336'; // 赤
    } else if (errorCount === 0) {
      message = `✅ ${successCount}件の勤務時間をコピーしました`;
      bgColor = '#4CAF50'; // 緑
    } else if (successCount > 0) {
      message = `⚠️ ${successCount}件成功、${errorCount}件失敗しました`;
      bgColor = '#ff9800'; // オレンジ
    } else {
      message = `❌ ${errorCount}件の処理でエラーが発生しました`;
      bgColor = '#f44336'; // 赤
    }

    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background-color: ${bgColor};
      color: white;
      padding: 12px 20px;
      border-radius: 5px;
      font-size: 14px;
      font-weight: bold;
      z-index: 10000;
      box-shadow: 0 4px 8px rgba(0,0,0,0.3);
      animation: slideIn 0.3s ease-out;
    `;

    notification.textContent = message;
    document.body.appendChild(notification);

    // アニメーション用CSS
    if (!document.getElementById('obic7-animation-styles')) {
      const style = document.createElement('style');
      style.id = 'obic7-animation-styles';
      style.textContent = `
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `;
      document.head.appendChild(style);
    }

    // 3秒後に自動削除
    setTimeout(() => {
      if (notification.parentElement) {
        notification.style.animation = 'slideIn 0.3s ease-out reverse';
        setTimeout(() => notification.remove(), 300);
      }
    }, 3000);
  }
}

// ページロード時に自動実行
new OBIC7AutoFill();