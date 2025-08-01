// ==UserScript==
// @name         OBIC7 勤怠入力の効率化ツール
// @namespace    http://tampermonkey.net/
// @version      3.1
// @description  OBIC7勤務表ページで「出勤/退勤打刻」の時刻を「出勤/退勤」欄に一括でコピーします。
// @author       You
// @match        *://*/JACWeb30Sat/I003_KozinbetuKinmuhyou2.aspx*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';

    console.log("🚀 OBIC7 効率化ツール v3.1 起動中...");

    /**
     * メイン初期化関数
     * ポーリングを使用してObSpreadコンポーネントとDOMの準備完了を待機
     */
    function initialize() {
        let attempts = 0;
        const maxAttempts = 30; // 最大30秒間待機

        const interval = setInterval(() => {
            attempts++;
            // ObSpreadコンストラクタの存在確認とテーブルDOMの描画確認
            if (typeof ObSpread !== 'undefined' && document.getElementById('sprKinmuhyou_vp')) {
                clearInterval(interval);
                console.log(`✅ ObSpreadコンポーネントを検出しました。(${attempts}回試行)`);
                addCopyButton();
            } else if (attempts >= maxAttempts) {
                clearInterval(interval);
                console.error("❌ タイムアウト: ObSpreadコンポーネントが見つかりませんでした。");
            }
        }, 1000);
    }

    /**
     * ページに「打刻コピー」ボタンを追加
     */
    function addCopyButton() {
        // ボタンが既に存在する場合は重複追加を防ぐ
        if (document.getElementById('gemini-autofill-btn')) {
            return;
        }

        const displayButton = document.getElementById('btnHyouzi'); // 「表示」ボタン
        if (!displayButton) {
            console.error("❌ 「表示」ボタンが見つからないため、コピーボタンを配置できません。");
            return;
        }

        const button = document.createElement('input');
        button.type = 'button';
        button.id = 'gemini-autofill-btn';
        button.value = '打刻コピー'; // ボタンテキスト
        button.style.cssText = `
            margin-left: 10px;
            padding: 5px 15px;
            background-color: #ff9800; /* オレンジ */
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            font-weight: bold;
            transition: background-color 0.2s;
        `;

        button.addEventListener('mouseenter', () => button.style.backgroundColor = '#f57c00');
        button.addEventListener('mouseleave', () => button.style.backgroundColor = '#ff9800');
        button.addEventListener('click', executeAPICopy);

        // ボタンを「表示」ボタンの後に挿入
        displayButton.parentNode.insertBefore(button, displayButton.nextSibling);
        console.log("🎉 「打刻コピー」ボタンをページに追加しました。");
    }

    /**
     * API連携による時刻コピーの実行メイン関数
     */
    function executeAPICopy() {
        const button = document.getElementById('gemini-autofill-btn');
        button.disabled = true;
        button.value = '処理中...';
        button.style.backgroundColor = '#cccccc';

        try {
            // ObSpreadコンポーネントのインスタンス作成
            const spread = new ObSpread("sprKinmuhyou");
            
            // 列インデックス定義
            const cols = {
                CLOCK_IN_SOURCE: 63,    // 出勤打刻列
                CLOCK_OUT_SOURCE: 65,   // 退勤打刻列
                WORK_START_TARGET: 68,  // 出勤目標列
                WORK_END_TARGET: 70     // 退勤目標列
            };

            let filledCount = 0;
            const rowCount = spread.rowCount();

            // 全行をループ処理
            for (let i = 0; i < rowCount; i++) {
                // 元データ（打刻時刻）を取得
                const clockInTime = spread.cellValue(i, cols.CLOCK_IN_SOURCE);
                const clockOutTime = spread.cellValue(i, cols.CLOCK_OUT_SOURCE);
                
                // 設定先の現在値を確認
                const currentWorkStart = spread.cellValue(i, cols.WORK_START_TARGET);
                const currentWorkEnd = spread.cellValue(i, cols.WORK_END_TARGET);

                // 出勤時刻をコピー（元データありかつ設定先が空の場合）
                if (clockInTime && !currentWorkStart) {
                    spread.cellValue(i, cols.WORK_START_TARGET, clockInTime);
                    filledCount++;
                }

                // 退勤時刻をコピー（元データありかつ設定先が空の場合）
                if (clockOutTime && !currentWorkEnd) {
                    spread.cellValue(i, cols.WORK_END_TARGET, clockOutTime);
                    filledCount++;
                }
            }

            alert(`処理完了！\n${filledCount}箇所の時刻をコピーしました。`);
            console.log(`✅ 処理完了！${filledCount}箇所の時刻をコピーしました。`);

        } catch (error) {
            alert('スクリプトの実行中にエラーが発生しました。\n詳細はコンソールを確認してください。');
            console.error("❌ APIコピー処理中にエラーが発生しました:", error);
        } finally {
            // ボタン状態を元に戻す
            button.disabled = false;
            button.value = '打刻コピー';
            button.style.backgroundColor = '#ff9800';
        }
    }

    // スクリプト開始
    initialize();

})();
