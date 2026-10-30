// 1. 定義系統的初始狀態
const initialState = {
    // UI 狀態
    activeYaoIdx: -1,         // 目前選中的爻 (例如: "tgt_2")，-1 代表未選取
    currentRelFilter: '全',    // 目前的關係線過濾器
    availableRels: new Set(['全', '無']), // 當前爻擁有的關係種類

    // 排盤與計算狀態
    curData: null,            // 目前的排盤結果資料
    curRecIndex: -1,          // 目前載入的歷史紀錄索引
    isTrueMode: true,         // 是否為真太陽時模式
    strictSanheList: [],      // 嚴格計算後的三合局清單
    isScoreDetailsOpen: false, // 用來記住下方分數大表此時是打開還是關閉

    // 雲端同步狀態
    localLastSync: 0,         // 本機最後同步的毫秒時間戳

    // 動畫與流程狀態
    currentCastStep: 0        // 手動起爻進行到的步驟 (0~5)
};

// 當你成功將卦盤存入資料庫後，務必加上這兩行更新系統認知：
window.comesFromRecords = true;
// ★ 使用統一的全域快照函數 (加上備用空字串以防剛載入時函數還沒準備好)
window.recordNotesSnapshot = typeof window.getCurrentStateSnapshotString === 'function'
    ? window.getCurrentStateSnapshotString()
    : "";

// ==========================================
// ★ 效能優化：全域高亮元素快取追蹤器
// ==========================================
window.lastHighlightedElements = []; // 儲存上一次被高光的 DOM 節點

window.clearAllHighlights = function () {
    // 放棄記憶體快取，直接抓取當下畫面上所有帶有高光 Class 的實體 DOM
    let activeNodes = document.querySelectorAll('.yao-highlight, .same-zhi-highlight, .year-he-highlight, .sanhe-red, .sanhe-black, .sanhe-marker, .bi-highlight');

    // 一次性暴力拔除所有高光
    activeNodes.forEach(el => {
        el.classList.remove(
            'yao-highlight', 'same-zhi-highlight', 'year-he-highlight',
            'sanhe-red', 'sanhe-black', 'sanhe-marker', 'bi-highlight'
        );
    });
};

// 由於改用直接讀取 DOM，這個紀錄函數可以留空，避免浪費資源
window.recordCurrentHighlights = function () {
    // 已棄用，留空即可
};

// 2. 建立 Proxy 代理器
window.AppState = new Proxy(initialState, {
    set(target, property, value) {
        // ★ 核心修復 1：防止重複賦值觸發無謂的渲染
        if (target[property] === value) return true;

        // 將新值寫入原始物件
        target[property] = value;

        // A. 畫線與過濾器系統連動 (僅控制 UI 面板顯示與隱藏，拔除所有繪圖運算)
        if (property === 'activeYaoIdx') {
            let filterBar = document.getElementById("rel-filter-bar");
            if (value === -1) {
                if (filterBar) filterBar.style.display = "none";
                let relLinesGroup = document.getElementById("rel-lines");
                if (relLinesGroup) relLinesGroup.innerHTML = "";
                if (typeof window.clearAllHighlights === 'function') window.clearAllHighlights();
            } else {
                if (filterBar) filterBar.style.display = "flex";
            }
        }

        if (property === 'availableRels') {
            const btnMap = {
                '全+': '.btn-all-plus', '全': '.btn-all', '明': '.btn-ming',
                '無': '.btn-none', '生': '.btn-sheng', '生⁺': '.btn-chain-sheng',
                '剋': '.btn-ke', '沖': '.btn-chong', '合': '.btn-he',
                '比': '.btn-bi', '墓': '.btn-mu', '形墓': '.btn-xingmu'
            };
            for (let [relName, selector] of Object.entries(btnMap)) {
                let btn = document.querySelector(selector);
                if (btn) btn.style.display = value.has(relName) ? 'inline-block' : 'none';
            }
        }

        return true;
    }
});

window.saveSettings = async function () {
    const timeFields = ['prep', 'toss', 'sy', 'oy', 'sn', 'on'];
    timeFields.forEach(key => {
        let propName = 'tm' + key.charAt(0).toUpperCase() + key.slice(1);
        animCfg[propName] = parseFloat(document.getElementById(`img-tm-${key}`).value);
    });

    // ★ 核心變更：讀取新的三選一觸發方式
    let triggerRadio = document.querySelector('input[name="toss-trigger"]:checked');
    animCfg.tossTrigger = triggerRadio ? triggerRadio.value : 'press';

    animCfg.turtleSpeed = parseInt(document.getElementById("set-turtle-speed").value) || 6;
    animCfg.turtleMoveSpeed = document.getElementById("set-turtle-move-speed").checked;
    animCfg.turtleVibrate = document.getElementById("set-turtle-vibrate").checked;
    animCfg.turtleAutoNext = document.getElementById("set-turtle-auto-next").checked;

    animCfg.endMode = document.querySelector('input[name="anim-end"]:checked').value;
    animCfg.endTime = parseFloat(document.getElementById("set-end-time").value);
    animCfg.tossMode = document.querySelector('input[name="toss-mode"]:checked').value;

    if (document.getElementById("set-south-adjust")) {
        animCfg.southAdjust = document.getElementById("set-south-adjust").checked;
    }

    await localforage.setItem('ly_animCfg', animCfg);
    let customDbStr = document.getElementById("custom-db-config").value.trim();
    await localforage.setItem('customDbConfig', customDbStr);

    const saveImg = (id, key) => {
        let el = document.getElementById(id);
        if (el && el.files.length > 0) {
            let file = el.files[0];
            let r = new FileReader();
            r.onload = e => localforage.setItem(key, e.target.result);
            r.readAsDataURL(file);
        }
    };

    saveImg('img-coin-front', 'img_coin_front'); saveImg('img-coin-back', 'img_coin_back');
    saveImg('img-up-prep', 'img_prep'); saveImg('img-up-toss', 'img_toss');
    saveImg('img-up-sy', 'img_sy'); saveImg('img-up-oy', 'img_oy');
    saveImg('img-up-sn', 'img_sn'); saveImg('img-up-on', 'img_on');

    if (window.showToast) window.showToast("✅ 設定已成功儲存！");
    if (typeof getSettingsSnapshotObj === 'function') window.settingsSnapshot = JSON.stringify(getSettingsSnapshotObj());
    history.back();
};

window.loadSettings = async function () {
    let saved = await localforage.getItem('ly_animCfg');
    if (saved) animCfg = { ...animCfg, ...saved };

    if ($("img-tm-prep")) $("img-tm-prep").value = animCfg.tmPrep;
    if ($("img-tm-toss")) $("img-tm-toss").value = animCfg.tmToss;
    if ($("img-tm-sy")) $("img-tm-sy").value = animCfg.tmSy;
    if ($("img-tm-oy")) $("img-tm-oy").value = animCfg.tmOy;
    if ($("img-tm-sn")) $("img-tm-sn").value = animCfg.tmSn;
    if ($("img-tm-on")) $("img-tm-on").value = animCfg.tmOn;
    if ($("set-end-time")) $("set-end-time").value = animCfg.endTime;
    if ($("set-south-adjust")) $("set-south-adjust").checked = animCfg.southAdjust || false;

    if (animCfg.southAdjust !== undefined && typeof window.syncSouthAdjust === 'function') {
        window.syncSouthAdjust(animCfg.southAdjust);
    }

    // ★ 讀取觸發方式 (相容舊版 useShake)
    let savedTrigger = animCfg.tossTrigger;
    if (!savedTrigger) savedTrigger = (animCfg.useShake === true) ? 'shake' : 'click';
    if (!animCfg.tossTrigger && animCfg.tossMode === 'qianlong') savedTrigger = 'press'; // 乾隆預設按壓
    let triggerRadio = document.querySelector(`input[name="toss-trigger"][value="${savedTrigger}"]`);
    if (triggerRadio) triggerRadio.checked = true;
    // ★ 讀取龜殼專屬設定與初始化迷你預覽
    if ($("set-turtle-speed")) {
        // ★ 預設 fallback 改為 1
        let speed = animCfg.turtleSpeed !== undefined ? animCfg.turtleSpeed : 1;
        $("set-turtle-speed").value = speed;
        if ($("turtle-speed-disp")) $("turtle-speed-disp").innerText = speed;

        let previewBox = document.getElementById('turtle-preview-container');
        if (previewBox) {
            const rawShell = `<svg viewBox="0 0 100 120" xmlns="http://www.w3.org/2000/svg"><ellipse cx="50" cy="60" rx="45" ry="55" fill="#5c4033" stroke="#2a1610" stroke-width="4"/><path d="M 50 15 L 75 35 L 75 85 L 50 105 L 25 85 L 25 35 Z" fill="#7a5441" stroke="#2a1610" stroke-width="3"/><path d="M 25 35 L 9 25 M 75 35 L 91 25 M 25 85 L 9 95 M 75 85 L 91 95 M 50 15 L 50 5 M 50 105 L 50 115 M 25 60 L 75 60" stroke="#2a1610" stroke-width="3"/></svg>`;
            previewBox.style.backgroundImage = `url("data:image/svg+xml;utf8,${encodeURIComponent(rawShell)}")`;
            let baseDur = 0.45 - (speed - 1) * 0.03;
            previewBox.style.animation = `turtle-shake-mini ${baseDur}s infinite`;
        }
    }

    // ★ 預設 fallback 全部改為 true
    if ($("set-turtle-move-speed")) $("set-turtle-move-speed").checked = animCfg.turtleMoveSpeed !== undefined ? animCfg.turtleMoveSpeed : true;
    if ($("set-turtle-vibrate")) $("set-turtle-vibrate").checked = animCfg.turtleVibrate !== undefined ? animCfg.turtleVibrate : true;
    if ($("set-turtle-auto-next")) $("set-turtle-auto-next").checked = animCfg.turtleAutoNext !== undefined ? animCfg.turtleAutoNext : true;

    // 讀取動畫結束方式
    let savedEndMode = animCfg.endMode || "click";
    let endModeRadio = document.querySelector(`input[name="anim-end"][value="${savedEndMode}"]`);
    if (endModeRadio) endModeRadio.checked = true;

    let customDb = await localforage.getItem('customDbConfig');
    if (customDb && $("custom-db-config")) $("custom-db-config").value = customDb;

    let modeRadios = document.querySelectorAll('input[name="toss-mode"]');
    if (modeRadios.length > 0) {
        let savedTossMode = animCfg.tossMode || 'qianlong';
        let tossRadio = document.querySelector(`input[name="toss-mode"][value="${savedTossMode}"]`);
        if (tossRadio) tossRadio.checked = true;

        const updateCoinUI = (mode) => {
            // ★ 新增這行：當選到乾隆通寶時，才顯示龜殼設定面板
            if ($('settings-turtle-box')) $('settings-turtle-box').style.display = mode === 'qianlong' ? 'block' : 'none';

            if ($('settings-3d-coin')) $('settings-3d-coin').style.display = mode === '3d' ? 'block' : 'none';
            if ($('original-image-settings-content')) $('original-image-settings-content').style.display = mode === 'video' ? 'block' : 'none';
            if ($('reset-coins-container') && mode !== 'video' && mode !== '3d') $('reset-coins-container').style.display = 'none';
        };
        updateCoinUI(savedTossMode);

        modeRadios.forEach(radio => {
            radio.onchange = (e) => {
                updateCoinUI(e.target.value);

                // ★ 雙重智慧綁定：切換到乾隆通寶時，自動勾選「點擊繼續」與「按壓搖卦」
                if (e.target.value === 'qianlong') {
                    let clickRadio = document.querySelector('input[name="anim-end"][value="click"]');
                    if (clickRadio) { clickRadio.checked = true; animCfg.endMode = 'click'; }

                    let pressRadio = document.querySelector('input[name="toss-trigger"][value="press"]');
                    if (pressRadio) { pressRadio.checked = true; animCfg.tossTrigger = 'press'; }

                    if (document.getElementById("set-time-group")) document.getElementById("set-time-group").style.display = 'none';
                }
            };
        });
    }
};

window.resetSettings = async function () {
    let isOk = await showConfirm("⚠️ 確定要清除所有自訂設定嗎？\n(別擔心，您的「歷史紀錄」會安全保留)");
    if (isOk) {
        // 1. 精準打擊：只刪除「設定檔」的 key，千萬不要用 .clear()！
        await localforage.removeItem('ly_animCfg');

        // 如果你未來有存自訂背景圖片等其他 Key，也用 removeItem 單獨刪除
        // await localforage.removeItem('custom_image_key');

        if (window.showToast) window.showToast("✅ 已還原預設值！系統將重新載入...");

        // 2. 終極魔法：直接重整網頁，保證所有畫面上的輸入框都恢復成 HTML 預設的乾淨狀態
        setTimeout(() => {
            window.location.reload();
        }, 1200);
    }
};

// ==========================================
// ★ 讀取單筆紀錄 (加入已讀標記與完美路由時序)
// ==========================================
window.loadRec = async function (i) {
    document.documentElement.classList.remove('recycle-bin-preview-mode');
    window.comesFromRecords = true;

    // ★ 雙管齊下：同時抓取內部與外部捲軸，取最大值保證絕對不漏抓！
    let recView = document.getElementById("records-view");
    let scrollY = window.scrollY || document.documentElement.scrollTop;
    if (recView) {
        window.lastRecScrollPos = Math.max(recView.scrollTop, scrollY);
    }
    // 2. 等待資料庫讀取完成 (這步有時間差，必須先做)
    let recs = await localforage.getItem('iching_final_v60') || [];

    if (!recs[i].isRead) {
        recs[i].isRead = true;
        await localforage.setItem('iching_final_v60', recs);
    }

    // 3. 更新記憶體資料
    window.activeRecHighlight = i;
    AppState.curRecIndex = i;
    let loadedData = JSON.parse(JSON.stringify(recs[i]));
    AppState.curData = loadedData;

    // 4. 設定畫面上方選單 (加上全域變數做緩衝，避免直接污染 AppState.curData)
    if (loadedData.najiaValue) {
        document.getElementById("res-set-najia").value = loadedData.najiaValue;
        window.currentNajiaView = loadedData.najiaValue; // ★ 新增緩衝
    }
    if (loadedData.fushenValue) {
        document.getElementById("res-set-fushen").value = loadedData.fushenValue;
        window.currentFushenView = loadedData.fushenValue; // ★ 新增緩衝
    }
    if (loadedData.bianViewValue) {
        document.getElementById("res-set-bian").value = loadedData.bianViewValue;
        window.currentBianView = loadedData.bianViewValue; // ★ 新增緩衝
    }

    // 5. 隱藏更新按鈕並標記狀態
    let uBtn = document.getElementById("btn-update-rec");
    if (uBtn) uBtn.style.display = "none";
    window.comesFromRecords = true;
    window.hasUnsavedChanges = false;

    // 6. 先將資料渲染到畫面上 (填滿文字框)
    if (typeof renderRes === 'function') renderRes();

    // 7. 所有資料跟畫面都準備好後，最後才發送 Hash 切換給 Router！
    window.location.hash = "#result";
};

// ==========================================
// ★ 歷史紀錄：列表渲染 (終極實體節點動態監聽版)
// ==========================================
window.showRecords = async function (isReturning = false) {
    // 1. 路由與畫面切換判斷
    if (!isReturning && window.location.hash !== "#records") {
        window.location.hash = "#records";
        return;
    }

    let pView = document.getElementById("portal-view");
    let rView = document.getElementById("records-view");
    if (pView) pView.style.display = "none";
    if (rView) rView.style.display = "block";

    // 2. 瞬間拉起大閘：注入太極動畫覆蓋層
    let container = document.getElementById("rec-list-container");
    if (container && !isReturning) {
        container.innerHTML = `
            <div id="ly-records-loading-gate" class="records-loader-overlay" style="position: absolute; top:0; left:0; right:0; bottom:0; z-index: 9999; display: flex; flex-direction: column; align-items: center; justify-content: center;">
                <div class="taichi-spinner">☯</div>
                <div class="records-loader-text">實體紀錄監聽中...</div>
            </div>
            <div id="ly-real-data-pool" style="opacity: 0; transition: opacity 0.2s ease;"></div>
        `;
        await new Promise(r => setTimeout(r, 30));
    }

    await new Promise(r => setTimeout(r, 30));

    // 3. 從本機資料庫撈取紀錄
    let recs = [];
    try {
        recs = await localforage.getItem('iching_final_v60') || [];
    } catch (e) {
        console.error("資料庫讀取異常:", e);
    }

    // 4. 精準空狀態判定
    if (recs.length === 0) {
        let gate = document.getElementById("ly-records-loading-gate");
        if (gate) gate.remove();
        if (container) {
            container.innerHTML = `
                <div style="text-align:center; padding:40px 20px; color:#999; animation: fadeIn 0.3s;">
                    <div style="font-size:3.5rem; margin-bottom:15px; opacity:0.6;">📭</div>
                    <div style="margin-bottom:20px; font-size:1.1rem; font-weight:bold;">目前確認暫無歷史紀錄</div>
                    <button onclick="restoreFromCloud()" style="background:var(--blue-primary); color:#fff; border:none; padding:10px 24px; border-radius:6px; font-size:1.05rem; box-shadow:0 2px 4px rgba(0,0,0,0.2); cursor:pointer; font-weight:bold; transition:transform 0.1s;" onmousedown="this.style.transform='scale(0.95)'" onmouseup="this.style.transform='scale(1)'">☁️ 從雲端下載 / 還原紀錄</button>
                </div>`;
        }
        let hint = document.getElementById("scroll-hint");
        if (hint) hint.style.display = 'none';
        return;
    }

    // 5. 若有資料，先把 HTML 塞進隱藏的資料池
    let h = `
    <style>
        .rec-item-wrap { position: relative; background: #eee; border: 1px solid #ddd; border-radius: 8px; margin-bottom: 12px; display: flex; box-shadow: 0 2px 4px rgba(0,0,0,0.05); overflow: hidden; }
        .rec-actions { display: flex; flex-direction: row; position: absolute; right: 0; top: 0; bottom: 0; width: 160px; z-index: 1; }
        .rec-actions button { border: none; color: white; font-weight: bold; cursor: pointer; font-size: 1em; flex: 1; white-space: nowrap; }
        .rec-content { flex: 1; padding: 12px; cursor: pointer; position: relative; z-index: 10; display: flex; justify-content: space-between; align-items: center; border-radius: 8px; transition: background 0.2s; background: #fff; width: 100%; box-sizing: border-box; }
        .rec-content.read { background-color: #f0f7ff !important; border-left: 5px solid #b3d7ff; }
        .rec-content.unread { background-color: #fff; }
        @media (min-width: 769px) {
            .rec-item-wrap { position: relative; display: flex; flex-direction: row; align-items: stretch; }
            .rec-actions { position: static; width: 160px; z-index: 1; border-radius: 0 8px 8px 0; }
            .rec-content { flex: 1; border-radius: 8px 0 0 8px; border-right: 1px solid #eee; transform: none !important; transition: none !important; }
        }
    </style>`;

    const isMobile = window.innerWidth <= 768;

    recs.forEach((r, i) => {
        let readClass = (i === window.activeRecHighlight) ? "read" : "unread";
        let swipeEvents = isMobile ? `ontouchstart="handleSwipeStart(event, this, ${i})" ontouchmove="handleSwipeMove(event, this)" ontouchend="handleSwipeEnd(event, this)"` : "";

        let displayTitle = r.subject || r.question || '無標題';
        let titleHtml = "";
        let guaNameDisplay = "";
        let clickAction = "";

        // ★ 核心升級：判斷這筆紀錄是否為「草稿」
        if (r.status === 'draft') {
            titleHtml = `<span style="color: #ff9800; font-weight: bold; margin-right: 4px;">[草稿]</span> <span>${displayTitle}</span>`;
            let stepCount = r.draftYaos ? r.draftYaos.filter(y => y !== "").length : 0;
            guaNameDisplay = `⏳ 尚未成卦 (已完成 ${stepCount} 爻)`;
            // 草稿的點擊事件：呼叫專屬的 resumeDraft 函數
            clickAction = `onclick="window.activeRecHighlight=${i}; if(!window.isSwiping) resumeDraft(${i})"`;
        } else {
            // 已經成卦的正常紀錄
            guaNameDisplay = r.ben.name;
            if (r.bian && r.ben.name !== r.bian.name) guaNameDisplay = `${r.ben.name} ｜ ${r.bian.name}`;

            let questionSub = (r.subject && r.question && r.subject !== r.question) ? `<span style="color:#888; font-size:0.82em; font-weight:normal; margin-left:8px;">(原問: ${r.question})</span>` : "";
            titleHtml = r.subject
                ? `<span style="color: #888888; font-weight: bold; font-size: 1.05em; margin-right: 4px;">${r.subject}</span>${questionSub}`
                : `<span>${displayTitle}</span>`;

            // 正常紀錄的點擊事件：呼叫原本的 loadRec 函數
            clickAction = `onclick="window.activeRecHighlight=${i}; if(!window.isSwiping) loadRec(${i})"`;
        }

        h += `
        <div class="rec-item-wrap">
            <div class="rec-content ${readClass}" ${clickAction} ${swipeEvents}>
                <div style="flex: 1;">
                    <div style="font-weight:bold; font-size:1.1em; margin-bottom:4px; color:#333; display:flex; align-items:center; flex-wrap:wrap;">
                        ${titleHtml}
                    </div>
                    <div style="font-size:0.9em; color:#666;">
                        <span style="margin-right:10px;">${r.dateStr || "未記錄時間"}</span>
                        <span style="color:${r.status === 'draft' ? '#ff9800' : 'var(--blue-primary)'}; font-weight:bold;">${guaNameDisplay}</span>
                    </div>
                </div>
            </div>
            <div class="rec-actions">
                <!-- 草稿也可以直接刪除，但不能進入修改大表 -->
                ${r.status !== 'draft' ? `<button style="background:#198754;" onclick="window.activeRecHighlight=${i}; editRecSetup(event,${i})">修改</button>` : `<button style="background:#6c757d; cursor:not-allowed;" disabled>修改</button>`}
                <button style="background:#dc3545;" onclick="deleteRecHistory(event, ${i})">刪除</button>
            </div>
        </div>`;
    });

    let pool = document.getElementById("ly-real-data-pool");
    if (!pool && container) {
        container.innerHTML = `<div id="ly-real-data-pool" style="opacity: 0; transition: opacity 0.2s ease;"></div>`;
        pool = document.getElementById("ly-real-data-pool");
    }

    // ★ 絕殺 1：鎖住容器高度，防止替換資料時高度瞬間塌陷
    if (pool) {
        let currentHeight = pool.scrollHeight;
        if (currentHeight > 0) {
            pool.style.minHeight = currentHeight + "px";
        }

        pool.innerHTML = h;

        // 渲染完後解除高度鎖定
        setTimeout(() => { pool.style.minHeight = ""; }, 850);
    }

    // 6. 動畫完美退場
    await new Promise((resolve) => {
        requestAnimationFrame(() => {
            requestAnimationFrame(resolve);
        });
    });

    let gate = document.getElementById("ly-records-loading-gate");
    if (gate) gate.remove();
    if (pool) pool.style.opacity = "1";

    setTimeout(() => {
        let hint = document.getElementById("scroll-hint");
        if (rView && hint) {
            if (rView.scrollHeight > rView.clientHeight) {
                hint.style.display = 'flex';
                hint.style.opacity = '1';
                if (window.lyScrollTimeout) clearTimeout(window.lyScrollTimeout);
                window.lyScrollTimeout = setTimeout(() => { hint.style.opacity = '0'; }, 1500);
            } else {
                hint.style.display = 'none';
            }
        }
    }, 50);
};

// ==========================================
// ★ 回收桶：列表渲染 (暗黑沉穩風格)
// ==========================================
window.showTrash = async function () {
    let container = document.getElementById("trash-list-container");
    if (!container) return;

    let trash = [];
    try {
        trash = await localforage.getItem('iching_trash_v60') || [];
    } catch (e) {
        console.error("資料庫讀取異常:", e);
    }

    if (trash.length === 0) {
        container.innerHTML = `
            <div style="text-align:center; padding:40px 20px; color:#888; animation: fadeIn 0.3s;">
                <div style="font-size:3.5rem; margin-bottom:15px; opacity:0.4;">🗑️</div>
                <div style="margin-bottom:20px; font-size:1.1rem; font-weight:bold; color:#adb5bd;">回收桶是空的</div>
            </div>`;
        return;
    }

    let h = `
    <style>
        .trash-item-wrap { position: relative; background: #495057; border: 1px solid #6c757d; border-radius: 8px; margin-bottom: 12px; display: flex; box-shadow: 0 2px 4px rgba(0,0,0,0.3); overflow: hidden; }
        .trash-actions { display: flex; flex-direction: row; position: absolute; right: 0; top: 0; bottom: 0; width: 160px; z-index: 1; }
        .trash-actions button { border: none; color: white; font-weight: bold; cursor: pointer; font-size: 1em; flex: 1; white-space: nowrap; }
        /* ★ 修改 1：將 cursor: default; 改為 cursor: pointer; */
        .trash-content { flex: 1; padding: 12px; cursor: pointer; position: relative; z-index: 10; display: flex; justify-content: space-between; align-items: center; border-radius: 8px; background: #343a40; width: 100%; box-sizing: border-box; }
        @media (min-width: 769px) {
            .trash-item-wrap { display: flex; flex-direction: row; align-items: stretch; }
            .trash-actions { position: static; width: 160px; z-index: 1; border-radius: 0 8px 8px 0; }
            .trash-content { border-radius: 8px 0 0 8px; border-right: 1px solid #495057; transform: none !important; transition: none !important; }
        }
    </style>`;

    const isMobile = window.innerWidth <= 768;

    trash.forEach((r, i) => {
        let guaNameDisplay = r.ben.name;
        if (r.bian && r.ben.name !== r.bian.name) guaNameDisplay = `${r.ben.name} ｜ ${r.bian.name}`;

        // 綁定滑動事件
        let swipeEvents = isMobile ? `ontouchstart="handleSwipeStart(event, this, ${i})" ontouchmove="handleSwipeMove(event, this)" ontouchend="handleSwipeEnd(event, this)"` : "";

        // 廢棄狀態的視覺處理：加上刪除線與透明度
        let displayTitle = r.subject || r.question || '無標題';
        let titleHtml = r.subject
            ? `<span style="color: #ced4da; font-weight: bold; font-size: 1.05em; margin-right: 4px; text-decoration: line-through;">${r.subject}</span>`
            : `<span style="color: #ced4da; text-decoration: line-through;">${displayTitle}</span>`;

        // ★ 修改 2：在 trash-content 加上 onclick="previewDeletedRecord(${i})"
        h += `
        <div class="trash-item-wrap">
            <div class="trash-content" ${swipeEvents} onclick="previewDeletedRecord(${i})">
                <div style="flex: 1; opacity: 0.6;">
                    <div style="font-weight:bold; font-size:1.1em; margin-bottom:4px; display:flex; align-items:center; flex-wrap:wrap;">
                        ${titleHtml}
                    </div>
                    <div style="font-size:0.9em; color:#adb5bd;">
                        <span style="margin-right:10px;">${r.dateStr}</span>
                        <span style="color:#0dcaf0; font-weight:bold;">${guaNameDisplay}</span>
                    </div>
                </div>
            </div>
            <div class="trash-actions">
                <button style="background:#198754;" onclick="restoreFromTrash(event, ${i})">回復</button>
                <button style="background:#dc3545;" onclick="permanentDeleteTrash(event, ${i})">刪除</button>
            </div>
        </div>`;
    });

    container.innerHTML = h;
};

// ==========================================
// ★ 回收桶：預覽已刪除的紀錄 (啟動暗黑模式)
// ==========================================
window.previewDeletedRecord = async function (i) {
    let trash = [];
    try {
        trash = await localforage.getItem('iching_trash_v60') || [];
    } catch (e) {
        console.error("資料庫讀取異常:", e);
        return;
    }

    // ★ 修正：先深拷貝資料，避免操作時污染到回收桶原本的物件
    let record = JSON.parse(JSON.stringify(trash[i]));
    if (!record) return;

    // 1. 替整個網頁套上暗黑模式濾鏡 (配合上一題的 html 修正)
    document.documentElement.classList.add('recycle-bin-preview-mode');

    // 2. 注入資料，欺騙大表讓它以為這是要讀取的紀錄
    window.AppState.curData = record;
    window.AppState.curData.isTrashPreview = true; // ★ 新增：明確標記這是一筆垃圾預覽
    window.AppState.curRecIndex = -1;
    window.comesFromRecords = true;
    window.hasUnsavedChanges = false; // ★ 確保離開時不會觸發未儲存警告

    // 3. 隱藏回收桶介面，切換到排盤結果頁
    let trashView = document.getElementById("trash-view");
    if (trashView) trashView.style.display = "none";
    window.location.hash = "#result";

    // 4. 重繪大表
    if (typeof window.renderRes === 'function') {
        window.renderRes();
    }

    if (window.showToast) {
        window.showToast("🗑️ 目前正在預覽已刪除的紀錄 (暗黑模式)", 2500);
    }
};

// ==========================================
// ★ 存檔邏輯 (注入唯一 ID 與 UpdateAt 時間戳)
// ==========================================
async function saveRec() {
    // ★ 新增防線：預覽模式下若誤觸儲存按鈕，直接攔截並提示
    if (AppState.curData && AppState.curData.isTrashPreview) {
        if (window.showToast) window.showToast("⚠️ 回收桶預覽模式下無法儲存紀錄！");
        return;
    }

    let recs = await localforage.getItem('iching_final_v60') || [];

    if (AppState.isDrawModeEnabled && typeof window.createDrawSnapshot === 'function') {
        AppState.curData.drawSnapshot = window.createDrawSnapshot();
    }

    // ★ 核心修復：直接從全域大腦抓取最新狀態，確保應期、筆記、開關等完美寫入記憶體
    let stateStr = typeof window.getCurrentStateSnapshotString === 'function' ? window.getCurrentStateSnapshotString() : "{}";
    let stateObj = JSON.parse(stateStr);

    AppState.curData.najiaValue = document.getElementById("res-set-najia")?.value || AppState.curData.najiaValue || "standard";
    AppState.curData.fushenValue = document.getElementById("res-set-fushen")?.value || AppState.curData.fushenValue || "wang";
    AppState.curData.bianViewValue = document.getElementById("res-set-bian")?.value || AppState.curData.bianViewValue || "move";

    AppState.curData.subject = stateObj.subject || "";
    AppState.curData.judge = stateObj.judge || "";
    AppState.curData.feedback = stateObj.feedback || "";
    AppState.curData.note = stateObj.note || "";
    AppState.curData.currentStatus = stateObj.currentStatus || ""; // ★ 新增
    AppState.curData.copyAddon = stateObj.copyAddon || ""; // ★ 新增
    AppState.curData.yingqi = stateObj.yingqi || {}; // ★ 確保應期與開闔狀態被寫入
    AppState.curData.isDrawModeEnabled = stateObj.draw || false; // ★ 確保繪圖狀態被寫入

    // ★ 智能比對異動
    let isChanged = true;
    if (AppState.curRecIndex > -1) {
        let oldStr = JSON.stringify(recs[AppState.curRecIndex]);
        let newStr = JSON.stringify(AppState.curData);
        if (oldStr === newStr) isChanged = false;
    }

    if (!isChanged) {
        if (window.showToast) window.showToast("✅ 沒有異動");
        window.hasUnsavedChanges = false;
        return;
    }

    // ★ 核心升級：為每一筆資料注入唯一 ID、狀態與更新時間戳
    if (!AppState.curData.id) {
        // 產生唯一 ID (時間戳 + 隨機亂碼)
        AppState.curData.id = "ly_" + Date.now() + "_" + Math.random().toString(36).substr(2, 6);
    }
    AppState.curData.updatedAt = Date.now(); // 每次存檔更新時間戳
    AppState.curData.status = 'active';      // 明確標記為正式啟用狀態

    let cloneData = JSON.parse(JSON.stringify(AppState.curData));

    if (AppState.curRecIndex > -1) {
        recs[AppState.curRecIndex] = cloneData;
        if (window.showToast) window.showToast("💾 紀錄已更新");
    } else {
        recs.unshift(cloneData);
        AppState.curRecIndex = 0;
        if (window.showToast) window.showToast("💾 已存入紀錄庫");
    }

    // ★ 套用絕對起卦時間排序
    if (typeof window.sortRecordsByDivinationTime === 'function') {
        window.sortRecordsByDivinationTime(recs);
        // 重新找回剛存好的檔案索引
        AppState.curRecIndex = recs.findIndex(r => r.id === cloneData.id);
    }
    // 重新載入列表畫面 (使用您系統中正確的函數)
    if (typeof window.renderHistoryLog === 'function') {
        window.renderHistoryLog();
    }

    await localforage.setItem('iching_final_v60', recs);

    if (typeof window.syncToCloud === 'function') window.syncToCloud();

    window.hasUnsavedChanges = false;
    // 拍下最新的全域狀態快照，作為新的防線基準
    if (typeof window.getCurrentStateSnapshotString === 'function') {
        window.recordNotesSnapshot = window.getCurrentStateSnapshotString();
    }
}

// ==========================================
// ★ 移至回收桶 (更新狀態與時間戳)
// ==========================================
window.deleteRecHistory = function (event, i) {
    if (event) event.stopPropagation();

    window.showConfirm("⚠️ 確定要將這筆紀錄移至回收桶嗎？\n(可在回收桶中還原或永久刪除)").then(async ok => {
        if (ok) {
            let recs = await localforage.getItem('iching_final_v60') || [];
            let trash = await localforage.getItem('iching_trash_v60') || [];

            let deletedItem = recs.splice(i, 1)[0];

            // ★ 核心升級：更新狀態為 trash 與最新時間戳
            deletedItem.status = 'trash';
            deletedItem.updatedAt = Date.now();

            trash.unshift(deletedItem);

            await localforage.setItem('iching_final_v60', recs);
            await localforage.setItem('iching_trash_v60', trash);

            if (typeof showRecords === 'function') showRecords();
            if (window.showToast) window.showToast("🗑️ 紀錄已移至回收桶，正在同步雲端...");
            if (typeof window.syncToCloud === 'function') window.syncToCloud();
        }
    });
};

// ==========================================
// ★ 從回收桶回復 (更新狀態與時間戳)
// ==========================================
window.restoreFromTrash = async function (event, i) {
    if (event) event.stopPropagation();

    let recs = await localforage.getItem('iching_final_v60') || [];
    let trash = await localforage.getItem('iching_trash_v60') || [];

    let item = trash.splice(i, 1)[0];

    // ★ 核心升級：更新狀態為 active 與最新時間戳
    item.status = 'active';
    item.updatedAt = Date.now();

    recs.unshift(item);

    await localforage.setItem('iching_final_v60', recs);
    await localforage.setItem('iching_trash_v60', trash);

    if (window.showToast) window.showToast("✅ 紀錄已成功回復！");
    showTrash();
    if (typeof window.syncToCloud === 'function') window.syncToCloud();
};

// ==========================================
// ★ 永久刪除 (建立墓碑 Tombstone)
// ==========================================
window.permanentDeleteTrash = async function (event, i) {
    if (event) event.stopPropagation();

    window.showConfirm("⚠️ 確定要永久刪除這筆紀錄嗎？\n(此動作無法復原，並將同步刪除雲端資料)").then(async ok => {
        if (ok) {
            let trash = await localforage.getItem('iching_trash_v60') || [];
            let tombstones = await localforage.getItem('iching_tombstones_v60') || [];

            // 從回收桶拔出，但不丟棄
            let item = trash.splice(i, 1)[0];

            // ★ 核心升級：標記為永久刪除 (建立墓碑)
            item.status = 'deleted';
            item.isDeleted = true;
            item.updatedAt = Date.now();

            // 存入墓碑陣列 (同步時用來告訴雲端「這筆已經死透了」)
            tombstones.push(item);

            await localforage.setItem('iching_trash_v60', trash);
            await localforage.setItem('iching_tombstones_v60', tombstones);

            if (window.showToast) window.showToast("🗑️ 紀錄已永久刪除");
            showTrash();
            if (typeof window.syncToCloud === 'function') window.syncToCloud();
        }
    });
};

// 介面上的更新按鈕綁定，更新紀錄後自動上鎖回唯讀狀態
window.updateCurrentRec = async function () {
    // 1. 執行原本的存檔與同步邏輯
    await saveRec();

    // 2. 存檔成功後，把欄位恢復成「反灰唯讀狀態」
    let sEl = document.getElementById("edit-subject"); 
    let jEl = document.getElementById("edit-judge");
    let fEl = document.getElementById("edit-feedback");
    let nEl = document.getElementById("edit-note");
    let csEl = document.getElementById("edit-current-status"); 
    let caEl = document.getElementById("edit-copy-addon"); 
    let cbAddon = document.getElementById("cb-default-addon"); // ★ 抓取 checkbox

    // 將所有文字欄位同步反灰、鎖定不可編輯
    [sEl, jEl, fEl, nEl, csEl, caEl].forEach(el => {
        if (el) {
            el.readOnly = true;
            el.style.backgroundColor = "#e9ecef";
            el.style.color = "#666";
            el.style.borderColor = "#ddd";
            el.style.boxShadow = "none";
        }
    });

    // ★ 強制將 checkbox 設為不可點擊 (鎖死)
    if (cbAddon) cbAddon.disabled = true; 

    // 3. 按鈕切換：隱藏「更新紀錄」，重新顯示「✏️ 編輯」
    let eBtn = document.getElementById("btn-edit-notes");
    let uBtn = document.getElementById("btn-update-rec");
    if (uBtn) uBtn.style.display = "none";
    if (eBtn) eBtn.style.display = "inline-block";
};

// ==========================================
// ★ 資料備份區
// ==========================================
// 1. 本機匯出功能
async function exportDataToFile() {
    const data = {
        records: await localforage.getItem('iching_final_v60') || [],
        trash: await localforage.getItem('iching_trash_v60') || [],
        tombstones: await localforage.getItem('iching_tombstones_v60') || [], // ★ JSON 備份連同墓碑一起打包
        settings: await localforage.getItem('ly_animCfg') || {},
        images: {
            prep: await localforage.getItem('img_prep'),
            sy: await localforage.getItem('img_sy'),
            oy: await localforage.getItem('img_oy'),
            sn: await localforage.getItem('img_sn'),
            on: await localforage.getItem('img_on'),
            toss: await localforage.getItem('img_toss')
        },
        exportTime: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `六爻備份_${new Date().toLocaleDateString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

// 2. 本機匯入功能
function importDataFromFile(input) {
    const file = input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const data = JSON.parse(e.target.result);
            if (!showConfirm("確定要匯入此備份檔並覆蓋目前資料嗎？")) return;

            // 使用現有的 applyCloudData 邏輯來統一處理資料寫入
            await applyCloudData(data);
            showAlert("✅ 本機備份匯入完成！");
            //location.reload(); // 重新整理頁面以套用新資料
        } catch (err) {
            showAlert("❌ 檔案格式錯誤，請確保它是正確的備份檔。");
        }
    };
    reader.readAsText(file);
}

// ==========================================
// ★ 雲端還原觸發器：確保狀態完全同步
// ==========================================
async function restoreFromCloud() {
    if (typeof window.restoreSystemFromCloud === 'function') {
        // 1. 觸發太極動畫，提示使用者正在從雲端抓取
        let container = document.getElementById("rec-list-container");
        if (container) {
            container.innerHTML = `
                <div class="records-loader-overlay">
                    <div class="taichi-spinner">☯</div>
                    <div class="records-loader-text">雲端資料同步中...</div>
                </div>
            `;
        }

        try {
            await window.restoreSystemFromCloud();

            // 🌟 關鍵修復 2：給 showConfirm 的 history.back() 50毫秒的緩衝時間結算網址
            setTimeout(async () => {
                if (typeof window.showRecords === 'function') {
                    await window.showRecords(true);
                }
            }, 50);
        } catch (err) {
            console.error("雲端同步失敗:", err);
            if (typeof window.showRecords === 'function') window.showRecords(true);
        }
    }
}

// ==========================================
// ★ 歷史紀錄：終極防爆滑動 UI (手機左滑 👈 呼叫右側選單)
// ==========================================
window.isSwiping = false;
window.swipeStartX = 0;
window.swipeStartY = 0;
window.currentX = 0;

window.handleSwipeStart = function (e, el, idx) {
    let targetEl = el || e.currentTarget;

    // ★ 核心新增：自動收起其他已經被滑開的紀錄 (包含紀錄列表與回收桶)
    document.querySelectorAll('.rec-content, .trash-content').forEach(item => {
        if (item !== targetEl) {
            item.style.transition = 'transform 0.3s ease';
            item.style.transform = 'translateX(0px)';
        }
    });

    // 僅在一般紀錄列表才觸發高亮與讀取
    if (targetEl.classList.contains('rec-content')) {
        window.activeRecHighlight = idx;
        document.querySelectorAll('.rec-content').forEach((item, i) => {
            item.classList.toggle('read', i === idx);
        });
    }

    window.swipeStartX = e.touches[0].clientX;
    window.swipeStartY = e.touches[0].clientY;

    let match = targetEl.style.transform.match(/translateX\(([-0-9.]+)px\)/);
    window.currentX = match ? parseFloat(match[1]) : 0;
    targetEl.style.transition = 'none';
};

window.handleSwipeMove = function (e, el) {
    let targetEl = el || e.currentTarget;
    let dx = e.touches[0].clientX - window.swipeStartX;
    let dy = e.touches[0].clientY - window.swipeStartY;

    // 偵測橫向滑動 (水平移動大於垂直移動)
    if (Math.abs(dx) > Math.abs(dy)) {
        window.isSwiping = true;

        let newX = window.currentX + dx;
        // ★ 核心修正：往左推最多 -160px (露出右側按鈕)，往右不能超過 0 (封鎖右滑)
        if (newX < -160) newX = -160;
        if (newX > 0) newX = 0;

        targetEl.style.transform = `translateX(${newX}px)`;
    }
};

window.handleSwipeEnd = function (e, el) {
    let targetEl = el || e.currentTarget;
    targetEl.style.transition = 'transform 0.3s ease';

    let match = targetEl.style.transform.match(/translateX\(([-0-9.]+)px\)/);
    let finalX = match ? parseFloat(match[1]) : 0;

    // 判定：手指往左滑超過 -50px，就自動把右側選單完全打開 (-160px)
    if (finalX < -50) {
        targetEl.style.transform = `translateX(-160px)`;
        setTimeout(() => {
            // 點擊畫面其他地方自動收回
            window.addEventListener('click', function closeSwipe(evt) {
                if (evt.target.closest('.rec-actions')) return;
                targetEl.style.transform = `translateX(0px)`;
                window.removeEventListener('click', closeSwipe);
            }, { once: true });
        }, 50);
    } else {
        // 滑動不足，自動彈回
        targetEl.style.transform = `translateX(0px)`;
    }
    setTimeout(() => { window.isSwiping = false; }, 100);
};

// ★ 共用：將首頁變身回原樣的函式
window.restorePortalUI = function () {
    document.documentElement.classList.remove('recycle-bin-preview-mode');
    let title = document.getElementById("portal-header-title");
    if (title) {
        title.innerHTML = "六爻排盤";
        title.style.color = "";
    }
    let normalBtns = document.getElementById("normal-action-btns");
    let editBtns = document.getElementById("edit-action-btns");
    if (normalBtns) normalBtns.style.display = "flex";
    if (editBtns) editBtns.style.display = "none";

    window.editingRecIndex = null;
};

// ==========================================
// ★ 在排盤結果最下方畫出歷史紀錄
// ==========================================
window.renderHistoryLog = function () {
    // 先把舊的紀錄區塊清掉（避免重複畫）
    let oldLog = document.getElementById("history-log-box");
    if (oldLog) oldLog.remove();

    // 如果這筆卦沒有被修改過 (沒有 history)，就不畫
    if (!AppState.curData || !AppState.curData.history || AppState.curData.history.length === 0) return;

    let resultView = document.getElementById("result-view");
    if (!resultView) return;

    // 建立歷史紀錄區塊
    let box = document.createElement("div");
    box.id = "history-log-box";
    box.style.cssText = "margin: 15px 10px 25px 10px; border: 1px solid #ddd; border-radius: 8px; background: #fff; padding: 15px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); flex-shrink: 0;";

    let hHtml = `<h4 style="margin: 0 0 12px 0; color: #555; font-size: 1.05em; border-bottom: 1px solid #eee; padding-bottom: 8px;">🕰️ 歷史修改紀錄</h4><div style="display:flex; flex-direction:column; gap:8px;">`;

    AppState.curData.history.forEach((h, idx) => {
        // 先給本卦名稱
        let gName = h.ben.name;
        // 確認有變卦 (h.bian 存在) 且名稱不同時，才加上變卦名稱
        if (h.bian && h.ben.name !== h.bian.name) {
            gName += ' ｜ ' + h.bian.name;
        }
        let timeStr = h.dateStr || "未知時間";

        // 如果快照中有修改紀錄，就組裝成紅色的提示字串
        let diffHtml = h.diffStr ? `<div style="font-size: 0.85em; color: #dc3545; margin-top: 4px;">📝 變更內容：${h.diffStr}</div>` : '';

        hHtml += `
        <div style="display: flex; justify-content: space-between; align-items: center; background: #f8f9fa; padding: 8px 10px; border-radius: 4px; border: 1px solid #eee;">
            <div style="font-size: 0.9em; color: #333; line-height: 1.4;">
                <span style="font-weight: bold; margin-right: 8px; color: #198754;">${idx + 1}.</span>
                <span style="color: #666; margin-right: 8px;">${timeStr}</span>
                <span style="font-weight: bold; color: var(--blue-primary);">${gName}</span>
                ${diffHtml}
            </div>
            <div style="display: flex; gap: 12px;">
                <div style="cursor: pointer; font-size: 1.1em; padding: 4px; transition: transform 0.1s;" onclick="restoreHistoryItem(${idx})" title="套用此紀錄為當前卦象" onmousedown="this.style.transform='scale(0.9)'" onmouseup="this.style.transform='scale(1)'">⬆️</div>
                <div style="cursor: pointer; font-size: 1.1em; padding: 4px; transition: transform 0.1s;" onclick="deleteHistoryItem(${idx})" title="刪除此紀錄" onmousedown="this.style.transform='scale(0.9)'" onmouseup="this.style.transform='scale(1)'">🗑️</div>
            </div>
        </div>`;
    });
    hHtml += `</div>`;
    box.innerHTML = hHtml;

    // 把區塊附加在 resultView 的最後面
    resultView.appendChild(box);
};

// ==========================================
// ★ 歷史紀錄操作：向上還原為當前卦象
// ==========================================
window.restoreHistoryItem = async function (idx) {
    let ok = await window.showConfirm("🔄 確定要將這筆紀錄還原為「當前卦象」嗎？\n\n(目前的卦象狀態將會被封存，降級退回歷史清單中)");
    if (!ok) return;

    // 1. 備份當前的完整歷史陣列
    let currentHistory = JSON.parse(JSON.stringify(AppState.curData.history));

    // 2. 抓出使用者想還原的目標紀錄
    let targetState = currentHistory[idx];

    // 3. 把「當前畫面上的卦象」(扣除 history 陣列) 打包，準備降級塞進歷史清單
    let currentStateSnapshot = JSON.parse(JSON.stringify(AppState.curData));
    delete currentStateSnapshot.history;
    currentStateSnapshot.diffStr = "由上方降級封存之版本";

    // 4. 從歷史陣列中把目標紀錄抽掉，並把剛才的「當前畫面狀態」塞進清單尾端
    currentHistory.splice(idx, 1);
    currentHistory.push(currentStateSnapshot);

    // 5. 正式將目標紀錄推上王座 (覆寫 AppState.curData)
    AppState.curData = targetState;

    // 6. 把重新整理好的歷史陣列掛回去
    AppState.curData.history = currentHistory;

    // 執行存檔與重新渲染畫面
    await saveRec();
    if (typeof renderRes === 'function') renderRes();
    if (window.showToast) window.showToast("✅ 卦象已成功還原！");
};

// ==========================================
// ★ 歷史紀錄操作：純粹刪除 (修復盲點)
// ==========================================
window.deleteHistoryItem = async function (idx) {
    let ok = await window.showConfirm("⚠️ 確定要刪除這筆歷史紀錄嗎？\n\n(刪除後僅會移除此條紀錄，不會影響您目前的卦象)");
    if (!ok) return;

    // 僅刪除該筆歷史
    AppState.curData.history.splice(idx, 1);

    // 若歷史清空，拔除陣列
    if (AppState.curData.history.length === 0) {
        delete AppState.curData.history;
    }

    // 直接觸發存檔與重繪
    await saveRec();
    if (typeof renderRes === 'function') renderRes();
    if (window.showToast) window.showToast("✅ 歷史紀錄已刪除");
};

window.autoLocateForEdit = function () {
    if (!navigator.geolocation) {
        if (window.showToast) window.showToast("⚠️ 瀏覽器不支援定位功能");
        return;
    }

    if (window.showToast) window.showToast("⏳ 正在獲取經緯度...");

    navigator.geolocation.getCurrentPosition(
        function (position) {
            // 同時抓取經度與緯度，並四捨五入到小數點後 4 位
            let lon = position.coords.longitude.toFixed(4);
            let lat = position.coords.latitude.toFixed(4);

            let lonInput = document.getElementById("smart-lon");
            let latInput = document.getElementById("smart-lat");

            // 寫入對應的欄位
            if (lonInput) lonInput.value = lon;
            if (latInput) latInput.value = lat;

            if (window.showToast) window.showToast("✅ 已精準帶入目前經緯度");
        },
        function (error) {
            if (window.showToast) window.showToast("⚠️ 定位失敗，請確認權限或網路狀態");
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );
};

// ==========================================
// ★ 歷史紀錄：動態生成專屬「修改紀錄 Modal」(完美判定與路由修復版)
// ==========================================
window.editRecSetup = async function (e, idx) {
    e.stopPropagation();

    // ★ 1. 加入路由，讓手機實體返回鍵可以精準關閉彈窗
    window.location.hash = "#editrec";

    window.activeRecHighlight = idx;
    window.editingRecIndex = idx;
    document.body.style.overflow = "hidden";
    document.body.style.height = "100dvh";

    // ★ 同步更新為雙管齊下的精準記憶
    let recView = document.getElementById("records-view");
    let scrollY = window.scrollY || document.documentElement.scrollTop;
    if (recView) {
        window.lastRecScrollPos = Math.max(recView.scrollTop, scrollY);
    }

    let recs = await localforage.getItem('iching_final_v60') || [];
    let r = recs[idx];
    if (!r) return;

    // 建立背景遮罩
    const overlay = document.createElement('div');
    overlay.id = "smart-edit-overlay";
    overlay.style.cssText = `position: fixed; top: 0; left: 0; width: 100vw; height: 100dvh; background: rgba(0, 0, 0, 0.65); backdrop-filter: blur(3px); z-index: 9999999; display: flex; align-items: center; justify-content: center; animation: fadeIn 0.2s ease-out;`;

    // 建立對話框主體
    const box = document.createElement('div');
    box.style.cssText = `background: #f8f9fa; border-radius: 12px; width: 95%; max-width: 420px; max-height: 95dvh; overflow-y: auto; padding: 12px 15px; box-shadow: 0 10px 25px rgba(0,0,0,0.2); transform: scale(0.95); animation: popUp 0.2s forwards; display: flex; flex-direction: column;`;

    let yOpts = document.getElementById("ts-year") ? document.getElementById("ts-year").innerHTML : '';
    let mOpts = document.getElementById("ts-month") ? document.getElementById("ts-month").innerHTML : '';
    let dOpts = document.getElementById("ts-day") ? document.getElementById("ts-day").innerHTML : '';
    let hOpts = document.getElementById("ts-hour") ? document.getElementById("ts-hour").innerHTML : '';
    let minOpts = document.getElementById("ts-minute") ? document.getElementById("ts-minute").innerHTML : '';

    overlay.addEventListener('touchmove', (evt) => {
        if (evt.target === overlay) evt.preventDefault();
    }, { passive: false });

    // 生成 6 爻下拉選單
    let yaoRowsHTML = "";
    let yaoNames = ['初爻', '二爻', '三爻', '四爻', '五爻', '上爻'];
    for (let i = 5; i >= 0; i--) {
        yaoRowsHTML += `
        <div style="display: flex; align-items: center; justify-content: space-between; background: ${i % 2 === 0 ? '#fff' : '#f1f3f5'}; padding: 4px 10px; border-radius: 4px; margin-bottom: 4px; border: 1px solid #e9ecef;">
            <span style="font-weight: bold; color: #555; width: 45px; font-size: 0.9rem;">${yaoNames[i]}</span>
            <select id="smart-yao-${i}" style="flex: 1; padding: 4px; font-size: 0.95rem; border: 1px solid #ccc; border-radius: 4px; text-align: center; font-family: monospace; font-weight: bold; color: var(--blue-primary, #0d6efd); background: #fff;">
                <option value="少陽">少陽━━</option>
                <option value="老陽">老陽━━◯</option>
                <option value="少陰">少陰━ ━</option>
                <option value="老陰">老陰━ ━✕</option>
            </select>
        </div>`;
    }

    // ★ 2. 填入全新 HTML (主旨與原問分離設計)
    box.innerHTML = `
        <h3 style="margin-top:0; color:#198754; text-align:center; margin-bottom:8px; font-size:1.05rem; letter-spacing: 1px;">✏️ 修改排盤紀錄</h3>
        
        <div style="display: flex; flex-direction: column; gap: 6px; margin-bottom: 8px; background: #fff; padding: 6px 8px; border-radius: 6px; border: 1px solid #ddd;">
            <div style="display: flex; gap: 6px; align-items: center;">
                <span style="font-weight:bold; color:#198754; font-size:0.9rem; width:36px; white-space:nowrap;">主旨</span>
                <input type="text" id="smart-subject" placeholder="請輸入主旨..." style="flex: 1; min-width: 0; box-sizing: border-box; padding: 4px 6px; border: 1px solid #ccc; border-radius: 4px; font-size: 0.9rem; font-weight: bold; color: var(--blue-primary);">
            </div>
            <div style="display: flex; gap: 6px; align-items: center;">
                <span style="font-weight:bold; color:#555; font-size:0.9rem; width:36px; white-space:nowrap;">原問</span>
                <input type="text" id="smart-q" placeholder="占卜時的原始問題..." style="flex: 1; min-width: 0; box-sizing: border-box; padding: 4px 6px; border: 1px solid #ccc; border-radius: 4px; font-size: 0.9rem;">
            </div>
            
            <div style="display: flex; justify-content: space-between; align-items: center; background: #fff; padding: 4px 2px; white-space: nowrap; overflow: hidden;">
                <div style="display: flex; font-weight: bold; color: #333; font-size: 0.85rem; align-items: center; gap: 2px;">
                    <span style="margin-right:2px;">性別:</span>
                    <label style="cursor: pointer; display:flex; align-items:center; gap:2px;"><input type="radio" name="smart-gender" value="男" style="margin:0; transform: scale(0.95);">男</label>
                    <label style="cursor: pointer; display:flex; align-items:center; gap:2px; margin-left:4px;"><input type="radio" name="smart-gender" value="女" style="margin:0; transform: scale(0.95);">女</label>
                </div>
                <div style="display: flex; gap: 3px; align-items: center;">
                    <input type="number" id="smart-lon" step="0.0001" placeholder="經度" value="120.906" style="width: 52px; padding: 2px; border: 1px solid #ccc; border-radius: 4px; font-size: 0.75rem; font-family: monospace; text-align: center;">
                    <input type="number" id="smart-lat" step="0.0001" placeholder="緯度" value="24.687" style="width: 52px; padding: 2px; border: 1px solid #ccc; border-radius: 4px; font-size: 0.75rem; font-family: monospace; text-align: center;">
                    <button class="action-btn top-action-btn btn-action-locate" onclick="autoLocateForEdit()" style="padding: 2px 6px; margin: 0; font-size: 0.8rem;">📍</button>
                </div>
            </div>
        </div>

        <div style="display: flex; gap: 2px; margin-bottom: 8px;">
            <div style="flex: 1.6; display: flex; align-items: center; border: 1px solid #ccc; border-radius: 4px; background: #fff; padding: 1px;">
                <select id="smart-y" style="width: 100%; border: none; outline: none; background: transparent; font-size: 0.8rem; padding:0;">${yOpts}</select>
            </div>
            <div style="flex: 1; display: flex; align-items: center; border: 1px solid #ccc; border-radius: 4px; background: #fff; padding: 1px;">
                <select id="smart-m" style="width: 100%; border: none; outline: none; background: transparent; font-size: 0.8rem; padding:0;">${mOpts}</select><span style="color:#666; font-size:0.7rem; margin-left:-2px;">月</span>
            </div>
            <div style="flex: 1; display: flex; align-items: center; border: 1px solid #ccc; border-radius: 4px; background: #fff; padding: 1px;">
                <select id="smart-d" style="width: 100%; border: none; outline: none; background: transparent; font-size: 0.8rem; padding:0;">${dOpts}</select><span style="color:#666; font-size:0.7rem; margin-left:-2px;">日</span>
            </div>
            <div style="flex: 1; display: flex; align-items: center; border: 1px solid #ccc; border-radius: 4px; background: #fff; padding: 1px;">
                <select id="smart-h" style="width: 100%; border: none; outline: none; background: transparent; font-size: 0.8rem; padding:0;">${hOpts}</select><span style="color:#666; font-size:0.7rem; margin-left:-2px;">時</span>
            </div>
            <div style="flex: 1; display: flex; align-items: center; border: 1px solid #ccc; border-radius: 4px; background: #fff; padding: 1px;">
                <select id="smart-min" style="width: 100%; border: none; outline: none; background: transparent; font-size: 0.8rem; padding:0;">${minOpts}</select><span style="color:#666; font-size:0.7rem; margin-left:-2px;">分</span>
            </div>
        </div>

        <div style="margin-bottom: 8px; text-align:center;">
            <label style="color:#dc3545; font-weight:bold; font-size:0.85rem; cursor:pointer;">
                <input type="checkbox" id="edit-cb-south-adjust" style="transform: scale(0.9);"> 🌏 此卦啟用南半球節氣對沖
            </label>
        </div>

        <div style="margin-bottom: 10px; border-top: 1px dashed #ddd; padding-top: 6px;">
            ${yaoRowsHTML}
        </div>

        <div style="display: flex; gap: 8px; margin-top: auto;">
            <button id="smart-btn-cancel" style="flex: 1; padding: 8px; border: 1px solid rgba(0,0,0,0.1); border-radius: 6px; background: #f0f0f0; color: #555; font-weight: bold; font-size: 0.9rem; cursor: pointer;">取消</button>
            <button id="smart-btn-ok" style="flex: 1; padding: 8px; border: none; border-radius: 6px; background: #198754; color: #fff; font-weight: bold; font-size: 0.9rem; cursor: pointer; box-shadow: inset 1px 1px 4px rgba(0,0,0,0.4);">確認修改</button>
        </div>
    `;

    overlay.appendChild(box);
    document.body.appendChild(overlay);

    // ★ 3. 分別載入主旨與原問
    document.getElementById("smart-subject").value = r.subject || "";
    // 讀取該卦當初存檔時的經度，若無則拿目前首頁輸入框的經度當預設防呆
    document.getElementById("smart-lon").value = r.lonValue || document.getElementById("ts-lon").value || "121.5000";
    document.getElementById("smart-q").value = r.question || "";

    let radios = document.getElementsByName("smart-gender");
    radios.forEach(rad => { if (rad.value === r.gender) rad.checked = true; });
    if (!document.querySelector('input[name="smart-gender"]:checked') && radios.length > 0) radios[0].checked = true;

    if (document.getElementById("edit-cb-south-adjust")) {
        document.getElementById("edit-cb-south-adjust").checked = r.isSouthAdjust || false;
    }

    if (r.dateStr && r.dateStr !== "自訂時間") {
        let d = new Date(r.dateStr);
        if (!isNaN(d.getTime())) {
            document.getElementById("smart-y").value = d.getFullYear();
            document.getElementById("smart-m").value = d.getMonth();
            document.getElementById("smart-d").value = d.getDate();
            document.getElementById("smart-h").value = d.getHours();
            document.getElementById("smart-min").value = d.getMinutes();
        } else {
            let nums = r.dateStr.match(/\d+/g);
            if (nums && nums.length >= 5) {
                document.getElementById("smart-y").value = nums[0];
                document.getElementById("smart-m").value = parseInt(nums[1]) - 1;
                document.getElementById("smart-d").value = nums[2];
                let h = parseInt(nums[3]);
                if ((r.dateStr.includes("下午") || r.dateStr.toUpperCase().includes("PM")) && h < 12) h += 12;
                else if ((r.dateStr.includes("上午") || r.dateStr.toUpperCase().includes("AM")) && h === 12) h = 0;
                document.getElementById("smart-h").value = h;
                document.getElementById("smart-min").value = nums[4];
            }
        }
    }

    const revValMap = { 7: "少陽", 9: "老陽", 8: "少陰", 6: "老陰" };
    if (r.lines && r.lines.length === 6) {
        for (let i = 0; i < 6; i++) {
            document.getElementById("smart-yao-" + i).value = revValMap[r.lines[i]];
        }
    }

    // ★ 4. 快照更新：加入 subject
    const getModalState = () => {
        let ls = [];
        for (let i = 0; i < 6; i++) ls.push(document.getElementById("smart-yao-" + i).value);
        return {
            subject: document.getElementById("smart-subject").value,
            lon: document.getElementById("smart-lon").value,
            q: document.getElementById("smart-q").value,
            gender: document.querySelector('input[name="smart-gender"]:checked') ? document.querySelector('input[name="smart-gender"]:checked').value : "",
            y: document.getElementById("smart-y").value,
            m: document.getElementById("smart-m").value,
            d: document.getElementById("smart-d").value,
            h: document.getElementById("smart-h").value,
            min: document.getElementById("smart-min").value,
            lines: ls.join(","),
            isSouth: document.getElementById("edit-cb-south-adjust") ? document.getElementById("edit-cb-south-adjust").checked : false
        };
    };

    const initialState = getModalState();

    // ★ 5. 取消動作：讓路由器去負責關閉視窗
    const closeMod = () => {
        if (window.location.hash === "#editrec") {
            history.back();
        } else {
            overlay.remove();
            document.body.style.overflow = "";
            document.body.style.height = "";
        }
    };

    const btnCancel = document.getElementById("smart-btn-cancel");
    const btnOk = document.getElementById("smart-btn-ok");

    [btnCancel, btnOk].forEach(btn => {
        btn.addEventListener('mousedown', () => btn.style.transform = 'translate(1px, 1px)');
        btn.addEventListener('mouseup', () => btn.style.transform = 'translate(0, 0)');
    });

    btnCancel.onclick = closeMod;

    btnOk.onclick = async () => {
        try {
            const currentState = getModalState();
            let hasChanged = JSON.stringify(initialState) !== JSON.stringify(currentState);

            if (!hasChanged) {
                closeMod();
                if (typeof window.loadRec === 'function') window.loadRec(idx);
                if (window.showToast) window.showToast("✅ 紀錄未變動，已直接載入。");
                return;
            }

            let ls = [];
            const valMap = { "少陽": 7, "老陽": 9, "少陰": 8, "老陰": 6 };

            for (let i = 0; i < 6; i++) {
                let selVal = document.getElementById("smart-yao-" + i).value;
                if (!selVal) {
                    if (window.showAlert) window.showAlert(`請確認【${['初爻', '二爻', '三爻', '四爻', '五爻', '上爻'][i]}】已選擇爻象！`);
                    return;
                }
                ls.push(valMap[selVal]);
            }

            let oldRec = r;
            let history = oldRec.history || [];
            let diffs = [];
            let yaoNames = ['初爻', '二爻', '三爻', '四爻', '五爻', '上爻'];

            for (let i = 0; i < 6; i++) {
                if (oldRec.lines[i] !== ls[i]) {
                    diffs.push(`${yaoNames[i]}: ${revValMap[oldRec.lines[i]]}→${revValMap[ls[i]]}`);
                }
            }

            // ★ 精確比對問題/主旨變動
            if (oldRec.subject !== currentState.subject) {
                diffs.push(`主旨:「${oldRec.subject || '無'}」→「${currentState.subject}」`);
            }
            if (oldRec.question !== currentState.q) {
                diffs.push(`原問:「${oldRec.question || '無'}」→「${currentState.q}」`);
            }

            if (initialState.y !== currentState.y || initialState.m !== currentState.m || initialState.d !== currentState.d || initialState.h !== currentState.h || initialState.min !== currentState.min) {
                let oldTime = `${initialState.y}/${parseInt(initialState.m) + 1}/${initialState.d} ${initialState.h}:${initialState.min}`;
                let newTime = `${currentState.y}/${parseInt(currentState.m) + 1}/${currentState.d} ${currentState.h}:${currentState.min}`;
                diffs.push(`時間:「${oldTime}」→「${newTime}」`);
            }

            if (oldRec.isSouthAdjust !== currentState.isSouth) {
                diffs.push(`南半球:「${oldRec.isSouthAdjust ? '啟' : '關'}」→「${currentState.isSouth ? '啟' : '關'}」`);
            }

            let diffStr = diffs.length > 0 ? diffs.join(", ") : "未偵測到不一致變更";
            let portalLon = document.getElementById("ts-lon");
            if (portalLon) portalLon.value = currentState.lon;
            let snapshot = JSON.parse(JSON.stringify(oldRec));
            delete snapshot.history;
            snapshot.diffStr = diffStr;
            history.push(snapshot);

            let portalQ = document.getElementById("p-question");
            if (portalQ) portalQ.value = currentState.q;

            let portalRadios = document.getElementsByName("gender");
            portalRadios.forEach(rad => { if (rad.value === currentState.gender) rad.checked = true; });

            ["ts-year", "ts-month", "ts-day", "ts-hour", "ts-minute"].forEach((id, index) => {
                let portalEl = document.getElementById(id);
                let smartVal = [currentState.y, currentState.m, currentState.d, currentState.h, currentState.min][index];
                if (portalEl && portalEl.tagName === 'SELECT') portalEl.value = smartVal;
            });

            if (document.getElementById("edit-cb-south-adjust")) {
                window.tempEditSouthAdjust = document.getElementById("edit-cb-south-adjust").checked;
            }

            if (typeof process === 'function') {
                let preserveNotes = {
                    subject: currentState.subject, // ★ 把主旨送進去保存
                    judge: oldRec.judge || "",
                    feedback: oldRec.feedback || "",
                    note: oldRec.note || "",
                    currentStatus: oldRec.currentStatus || "", // ★ 新增
                    copyAddon: oldRec.copyAddon !== undefined ? oldRec.copyAddon : "請參照來源資料《六爻解卦標準流程》的步驟與規範詳細解卦，並以問卦日期前輟生成解卦結果檔案。", // ★ 新增預設
                    history: history
                };
                if (typeof process === 'function') {
                    process(ls, oldRec.method, preserveNotes);
                    // 排盤完畢後，把經度值塞進新生成的 AppState.curData 中保存
                    if (AppState.curData) {
                        AppState.curData.lonValue = currentState.lon;
                    }
                }
                process(ls, oldRec.method, preserveNotes);
            }

            window.tempEditSouthAdjust = undefined;

            AppState.curData.history = history;
            AppState.curData.judge = oldRec.judge || "";
            AppState.curData.feedback = oldRec.feedback || "";
            AppState.curData.note = oldRec.note || "";
            AppState.curRecIndex = window.editingRecIndex;

            if (typeof saveRec === 'function') await saveRec();

            // ★ 觸發返回鍵退下 Modal，並延遲重繪保證路由切換完成
            closeMod();
            setTimeout(() => {
                if (typeof window.loadRec === 'function') {
                    window.loadRec(window.editingRecIndex);
                } else {
                    window.comesFromRecords = true;
                    document.getElementById("records-view").style.display = "none";
                    document.getElementById("portal-view").style.display = "none";
                    document.getElementById("result-view").style.display = "block";
                    if (typeof renderRes === 'function') renderRes();
                }

                if (window.showToast) {
                    window.showToast("✅ 紀錄修改成功！舊版本已封存於最下方。");
                }
            }, 50);

        } catch (err) {
            console.error("修改過程發生錯誤:", err);
            if (window.showAlert) window.showAlert("修改失敗：" + err.message);
        }
    };
};

// ★ 一鍵同步按鈕呼叫的函式
async function syncToCloud() {
    const records = await localforage.getItem('iching_final_v60') || [];
    const settings = await localforage.getItem('ly_animCfg') || {};

    // 包裝所有資料一次上傳
    await window.uploadEverything({
        records: records,
        settings: settings
    });
}

// ==========================================
// ★ 智慧資料合併引擎 (Data Merge)
// ==========================================
window.mergeIchingRecords = function (localArr, cloudArr) {
    let map = new Map();

    // 輔助函式：產生唯一 ID (相容舊紀錄)
    const generateId = (r) => {
        if (r.id) return r.id;
        // 如果舊紀錄沒有 ID，用時間+卦名+原問組合成專屬指紋
        return `id_${r.dateStr}_${r.ben.name}_${r.question || ''}`;
    };

    // 1. 先把雲端資料全部鋪在桌上
    cloudArr.forEach(r => {
        map.set(generateId(r), r);
    });

    // 2. 拿本機資料去比對疊加
    localArr.forEach(r => {
        let id = generateId(r);
        let existing = map.get(id);

        if (existing) {
            // 若發生衝突，比對哪邊的「歷史修改次數」比較多，保留較新的一方
            let existingHistLen = existing.history ? existing.history.length : 0;
            let localHistLen = r.history ? r.history.length : 0;

            if (existingHistLen > localHistLen) {
                // 雲端比較新，保留雲端不動
            } else {
                map.set(id, r); // 本機比較新或一樣，以本機覆蓋
            }
        } else {
            map.set(id, r); // 雲端沒有的本機新卦，無縫加入！
        }
    });

    // 3. 轉回陣列，並按照時間排序 (由新到舊)
    let merged = Array.from(map.values());
    merged.sort((a, b) => {
        let ta = new Date(a.dateStr).getTime() || 0;
        let tb = new Date(b.dateStr).getTime() || 0;
        return tb - ta;
    });

    // 4. 確保所有合併後的紀錄都有 ID 標籤
    merged.forEach(r => { if (!r.id) r.id = generateId(r); });

    return merged;
};

// ==========================================
// ★ 雲端資料本機寫入引擎 (強勢合併版)
// ==========================================
window.applyCloudData = async function (cloudData) {
    if (!cloudData) return;
    try {
        // 1. 撈出本機「所有」狀態的資料
        let localRecs = await localforage.getItem('iching_final_v60') || [];
        let localTrash = await localforage.getItem('iching_trash_v60') || [];
        let localTombstones = await localforage.getItem('iching_tombstones_v60') || [];

        // 幫舊資料貼上狀態標籤 (確保舊資料不會在合併時迷路)
        localRecs.forEach(r => { if (!r.status) r.status = 'active'; });
        localTrash.forEach(r => { if (!r.status) r.status = 'trash'; });
        localTombstones.forEach(r => { r.status = 'deleted'; });

        let localAll = [...localRecs, ...localTrash, ...localTombstones];

        // 2. 撈出雲端「所有」狀態的資料
        let cloudRecs = cloudData.records || [];
        let cloudTrash = cloudData.trash || [];
        let cloudTombstones = cloudData.tombstones || [];

        cloudRecs.forEach(r => { if (!r.status) r.status = 'active'; });
        cloudTrash.forEach(r => { if (!r.status) r.status = 'trash'; });
        cloudTombstones.forEach(r => { r.status = 'deleted'; });

        let cloudAll = [...cloudRecs, ...cloudTrash, ...cloudTombstones];

        // 3. 透過最高法院 (Universal Merge) 裁決誰生誰死、誰最新
        let mergedAll = window.universalMergeIchingRecords(localAll, cloudAll);

        // 4. 將裁決完畢的資料，依照最終的 status 重新分發回對應的陣列
        let newRecs = [];
        let newTrash = [];
        let newTombstones = [];

        mergedAll.forEach(r => {
            if (r.status === 'deleted' || r.isDeleted) {
                newTombstones.push(r);
            } else if (r.status === 'trash') {
                newTrash.push(r);
            } else {
                newRecs.push(r);
            }
        });

        // 5. 確保畫面顯示時，按照時間由新到舊排序
        const sortDesc = (a, b) => (b.updatedAt || 0) - (a.updatedAt || 0);
        newRecs.sort(sortDesc);
        newTrash.sort(sortDesc);

        // 6. 寫回本機資料庫
        await localforage.setItem('iching_final_v60', newRecs);
        await localforage.setItem('iching_trash_v60', newTrash);
        await localforage.setItem('iching_tombstones_v60', newTombstones);

        // 7. 更新設定與同步鎖
        if (cloudData.settings) {
            await localforage.setItem('ly_animCfg', cloudData.settings);

            // ★ 新增：即時重新讀取並套用雲端同步過來的新設定
            if (typeof window.loadSettings === 'function') {
                await window.loadSettings();
            } else if (window.animCfg) {
                window.animCfg = { ...window.animCfg, ...cloudData.settings };
            }
        }
        if (window.AppState && cloudData.lastSync) {
            let serverTime = cloudData.lastSync.toMillis ? cloudData.lastSync.toMillis() : cloudData.lastSync;
            window.AppState.localLastSync = serverTime;
        }

        await localforage.setItem('ly_cloud_unlocked', true);
        console.log("💾 雲端資料 (包含回收桶與墓碑) 已 100% 絕對真理合併完畢！");
        // ★ 新增：將合併後的完整資料包反向推回雲端，達成雙向同步
        if (typeof window.syncToCloud === 'function') {
            await window.syncToCloud(false);
        }
    } catch (e) {
        console.error("本機合併寫入失敗:", e);
    }
};

// ==========================================
// ★ 自動同步監聽器：當背景抓到資料，主動通知畫面更新！
// ==========================================
window.bindRealTimeSyncUI = function () {
    if (typeof window.initRealTimeSync === 'function') {
        // 🌟 這裡是「執行/呼叫」它，並傳入更新畫面的動作 (onDataChange)
        window.initRealTimeSync(async (data) => {
            // 1. 嚴格等待資料確實寫入硬碟
            await window.applyCloudData(data);

            // 2. 如果使用者正停留在「歷史紀錄」畫面，主動幫他重繪 UI！
            if (window.location.hash === "#records") {
                if (typeof window.showRecords === 'function') {
                    window.showRecords(true);
                }
            }
            if (window.showToast) window.showToast("☁️ 雲端紀錄已自動同步更新！");
        });
    }
};

// 雙重保險：網頁載入時綁定 UI 更新機制
window.addEventListener('load', () => {
    if (typeof window.initRealTimeSync === 'function' && !window.initRealTimeSync.toString().includes('() => {}')) {
        window.bindRealTimeSyncUI();
    }
});

// ==========================================
// ★ 智慧資料合併引擎 (單一真理 + 墓碑比對版)
// ==========================================
window.universalMergeIchingRecords = function (localAll, cloudAll) {
    let map = new Map();

    const processItem = (r) => {
        // 相容性處理：補齊舊資料缺少的 ID 與時間戳
        if (!r.id) r.id = "ly_legacy_" + (r.dateStr || "unknown") + "_" + r.ben.name;
        if (!r.updatedAt) r.updatedAt = new Date(r.dateStr).getTime() || 0;
        if (!r.status) r.status = r.isDeleted ? 'deleted' : 'active'; // 預設防呆

        let existing = map.get(r.id);

        if (!existing) {
            map.set(r.id, r); // 第一次遇到這個 ID，直接放入
        } else {
            // ★ 核心邏輯：如果遇到同 ID 的資料，永遠保留 updatedAt (最後修改時間) 較新的那一筆！
            if (r.updatedAt > existing.updatedAt) {
                map.set(r.id, r);
            }
        }
    };

    // 把本機與雲端所有的資料全部丟進去比對
    localAll.forEach(processItem);
    cloudAll.forEach(processItem);

    return Array.from(map.values());
};

// ==========================================
// ★ 草稿儲存引擎 (取代原本的 localStorage)
// ==========================================
window.saveDraftToHistory = async function () {
    let qInput = document.getElementById("p-question");
    let question = qInput ? qInput.value.trim() : "";

    // 如果沒有問題且一爻都沒起，就不存草稿
    if (window.AppState.currentCastStep === 0 && question === "") return;

    let draftYaos = [];
    for (let i = 0; i < 6; i++) {
        let s = document.getElementById("yao-sel-" + i);
        draftYaos.push(s ? s.value : "");
    }

    let recs = await localforage.getItem('iching_final_v60') || [];

    // 檢查全域是否有正在編輯的草稿 ID
    let draftId = window.currentDraftId || "draft_" + Date.now();
    window.currentDraftId = draftId;

    let draftObj = {
        id: draftId,
        status: 'draft',
        question: question,
        dateStr: window.draftStartTime || new Date().toLocaleString('zh-TW', { hour12: false }),
        draftYaos: draftYaos,
        currentStep: window.AppState.currentCastStep,
        updatedAt: Date.now()
    };

    // 如果這筆草稿已經在陣列中，就更新它；否則推入最前方
    let existingIdx = recs.findIndex(r => r.id === draftId);
    if (existingIdx !== -1) {
        recs[existingIdx] = draftObj;
    } else {
        recs.unshift(draftObj);
        window.draftStartTime = draftObj.dateStr; // 鎖定起卦初始時間
    }

    await localforage.setItem('iching_final_v60', recs);
};

// ==========================================
// ★ 草稿還原引擎 (無縫傳送回首頁)
// ==========================================
window.resumeDraft = async function (idx) {
    let recs = await localforage.getItem('iching_final_v60') || [];
    let draft = recs[idx];
    if (!draft || draft.status !== 'draft') return;

    // 1. 切換畫面回首頁
    document.getElementById("records-view").style.display = "none";
    document.getElementById("portal-view").style.display = "block";
    window.location.hash = "#home";

    // 2. 恢復全域變數與草稿綁定
    window.currentDraftId = draft.id;
    window.draftStartTime = draft.dateStr;
    if (!window.AppState) window.AppState = {};
    window.AppState.currentCastStep = draft.currentStep;

    // 3. 填入問題
    let qInput = document.getElementById("p-question");
    if (qInput) qInput.value = draft.question || "";

    // 在草稿模式下，標題列加入返回按鈕
    let title = document.getElementById("portal-header-title");
    if (title) {
        title.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <button onclick="window.resetManualUI(); window.restorePortalUI(); window.location.hash='#records';" style="background:transparent; border:1px solid var(--blue-primary); color:var(--blue-primary); border-radius:4px; padding:4px 8px; font-size:0.85rem; cursor:pointer; font-weight:bold;">← 返回</button>
                <span>草稿起卦</span>
                <div style="width:60px;"></div>
            </div>
        `;
    }

    // 4. 復原起爻狀態與按鈕反灰
    for (let i = 0; i < 6; i++) {
        let sel = document.getElementById("yao-sel-" + i);
        if (sel) sel.value = draft.draftYaos[i] || "";

        if (typeof updateYaoSeal === 'function') updateYaoSeal(i);

        let rowContainer = document.getElementById("yao-sel-" + i);
        if (rowContainer) {
            let castBtn = rowContainer.parentElement.querySelector('button');
            if (castBtn) {
                if (draft.draftYaos[i]) {
                    // 已起的爻：反灰鎖死
                    castBtn.style.opacity = '0.3';
                    castBtn.style.pointerEvents = 'none';
                    castBtn.style.filter = 'grayscale(100%)';
                    castBtn.style.boxShadow = 'none';
                    if (sel) sel.disabled = true; // 鎖定下拉
                } else {
                    // 未起的爻：恢復藍色可點擊狀態
                    castBtn.style.opacity = '1';
                    castBtn.style.pointerEvents = 'auto';
                    castBtn.style.filter = 'none';
                    castBtn.style.boxShadow = '0 1px 2px rgba(0,0,0,0.2)';
                    if (sel) sel.disabled = false;
                }
            }
        }
    }

    if (window.showToast) window.showToast("🔄 已為您恢復草稿進度，請繼續起卦！");
};