// ★ 抽象同構設定：八字四柱的視覺排列方向
// 'rtl' (Right-to-Left): 年在最右，視覺上為 [時] [日] [月] [年] (日左月右) - 目前系統預設
// 'ltr' (Left-to-Right): 年在最左，視覺上為 [年] [月] [日] [時] (月左日右)
window.baziLayoutOrder = 'rtl';

// 初始化應用程式
// ==========================================
// ★ 全域常駐狀態同步器 (讓首頁與設定視窗的狀態保持一致)
// ==========================================
window.syncStatusMsg = function (timeMsg, locMsg) {
    let msg = `${timeMsg} ｜ ${locMsg}`;
    let pMsg = document.getElementById("portal-msg");
    let mMsg = document.getElementById("modal-msg");

    // ★ 修正：從 innerText 改為 innerHTML，支援紅字標籤渲染
    if (pMsg) pMsg.innerHTML = msg;
    if (mMsg) mMsg.innerHTML = msg;
};

// ★ 新增：全域的南半球選項同步函數
window.syncSouthAdjust = async function (isChecked) {
    // 1. 同步三個 Checkbox 的打勾狀態
    if ($("set-south-adjust")) $("set-south-adjust").checked = isChecked;
    if ($("cb-south-adjust")) $("cb-south-adjust").checked = isChecked;
    if ($("modal-cb-south-adjust")) $("modal-cb-south-adjust").checked = isChecked;

    // 2. 如果是打勾狀態，強制把首頁與 Modal 的隱藏區塊「顯示」出來
    if (isChecked) {
        if ($("south-adjust-wrapper")) $("south-adjust-wrapper").style.display = "block";
        if ($("modal-south-adjust-wrapper")) $("modal-south-adjust-wrapper").style.display = "block";
    }

    // 3. 儲存設定，確保重整網頁後設定不會消失
    if (!window.animCfg) window.animCfg = {};
    window.animCfg.southAdjust = isChecked;
    if (typeof localforage !== 'undefined') {
        await localforage.setItem('ly_animCfg', window.animCfg);
    }
};

// ★ 全全新功能：全域深色模式控制與記憶引擎
window.toggleGlobalDarkMode = async function (isChecked) {
    // 1. 同步切換 CSS Class (★ 關鍵：改為綁定在 html 根元素上)
    if (isChecked) {
        document.documentElement.classList.add("global-dark-mode");
    } else {
        document.documentElement.classList.remove("global-dark-mode");
    }

    // 2. 同步設定 Checkbox
    let cb = document.getElementById("set-global-dark-mode");
    if (cb) cb.checked = isChecked;

    // 3. 更新 localStorage (為了開場動畫防閃爍)
    localStorage.setItem("ly_early_dark_mode", isChecked ? "true" : "false");

    // 4. 儲存設定至 localforage (維持一致性)
    if (!window.animCfg) window.animCfg = {};
    window.animCfg.globalDarkMode = isChecked;

    if (typeof localforage !== 'undefined') {
        try {
            await localforage.setItem('ly_animCfg', window.animCfg);
        } catch (e) {
            console.error("儲存深色模式設定失敗:", e);
        }
    }
};

// 初始化應用程式
async function initApp() {
    // ★ 魔法 1：在函數的最開頭，立刻啟動一個「最短演出時間」的計時器 (例如 1500 毫秒)
    // 這保證了無論手機載入多快，太極跟靈氣文字都至少有 1.5 秒的時間完整展現！
    const minSplashTime = new Promise(resolve => setTimeout(resolve, 1500));
    try {
        let oldData = localStorage.getItem('iching_final_v60');
        if (oldData) {
            let parsed = JSON.parse(oldData);
            await localforage.setItem('iching_final_v60', parsed);
            localStorage.removeItem('iching_final_v60'); // 轉移後清除舊版，避免重複執行
            console.log("太棒了！舊資料已無縫轉移至 IndexedDB。");
        }
    } catch (e) {
        console.error("資料轉移過程發生錯誤", e);
    }

    // ★ 核心優化 1：確保在初始化時，等待「設定」與「歷史紀錄」載入完畢
    if (typeof loadSettings === 'function') await loadSettings();
    //if (typeof showRecords === 'function') await showRecords();

    // 產生六個手動選擇爻的 UI
    let manualRowsHTML = "";
    let yaoNames = ['初爻', '二爻', '三爻', '四爻', '五爻', '上爻'];

    // ★ 關鍵修正：六爻排盤視覺是「由下往上」，所以我們從 5 倒數到 0，讓上爻在最上面
    for (let i = 5; i >= 0; i--) {
        manualRowsHTML += `
        <div class="form-row" style="background:${i % 2 === 0 ? '#fff' : '#f9f9f9'}; padding:6px 4px; border-radius:4px; margin-bottom:5px;">
            <div style="display: grid; grid-template-columns: repeat(4, 1fr); align-items: center; gap: 1px; width: 100%;">
                
                <div style="text-align:center; font-size:0.95rem; font-weight:bold; color:#555;">${yaoNames[i]}</div>
                
                <select id="yao-sel-${i}" class="yao-select-centered" style="width:100%; padding:5px 0; font-size:0.85rem; font-family:monospace;" onchange="updateYaoSeal(${i})">
                    <option value="">-選擇-</option>
                    <option value="少陽">少陽━━</option>
                    <option value="老陽">老陽━━◯</option>
                    <option value="少陰">少陰━ ━</option>
                    <option value="老陰">老陰━ ━✕</option>
                </select>
                
                <div style="display:flex; justify-content:center;">
                    <span id="yao-seal-${i}" class="yin-seal" style="display:none; width:100%; max-width:55px; padding:4px 0; font-size:0.85rem;"></span>
                </div>
                
                <button type="button" class="btn-blue" style="width:100%; padding:5px 0; font-size:0.9rem; border:none; border-radius:3px; color:#fff; cursor:pointer; box-shadow:0 1px 2px rgba(0,0,0,0.2);" onclick="castSingleYao(${i})">起爻</button>
                
            </div>
        </div>`;
    }

    if ($("manual-yao-rows")) $("manual-yao-rows").innerHTML = manualRowsHTML;

    // 綁定三個 Checkbox 的變化事件，任一個被點擊就呼叫同步函數
    ["set-south-adjust", "cb-south-adjust", "modal-cb-south-adjust"].forEach(id => {
        let cb = document.getElementById(id);
        if (cb) {
            cb.addEventListener('change', (e) => {
                if (typeof window.syncSouthAdjust === 'function') {
                    window.syncSouthAdjust(e.target.checked);
                }
            });
        }
    });

    if (typeof initTimeSelects === 'function') initTimeSelects();
    if (typeof initGanzhiSelects === 'function') initGanzhiSelects();
    if (typeof toggleDatePanel === 'function') toggleDatePanel();
    if (window.initRealTimeSync) { window.initRealTimeSync(applyCloudData); }

    // ★ 核心修復：在動畫消失前，強制將底層畫面切回「首頁」，抵消 showRecords 造成的切換
    if ($("portal-view")) $("portal-view").style.display = "block";
    if ($("records-view")) $("records-view").style.display = "none";
    if ($("result-view")) $("result-view").style.display = "none";

    // =========================================
    // ★ 魔法 2：在準備關閉開頭動畫之前，等待計時器跑完！
    await minSplashTime;
    // =========================================

    // ★ 核心優化 2：一切準備就緒後，將開頭載入畫面（Splash Screen）淡出銷毀
    const splash = document.getElementById('ly-splash-screen');
    if (splash) {
        // 先把透明度歸零 (觸發 CSS transition 淡出)
        splash.style.opacity = '0';

        // 等待淡出動畫 (0.4秒) 播完後，徹底將它隱藏，避免擋住點擊
        setTimeout(() => {
            splash.style.visibility = 'hidden';
            splash.style.display = 'none';
        }, 400);
    }

    // ★ 載入網頁時，自動去 localforage 讀取並還原使用者的深色模式設定
    if (typeof localforage !== 'undefined') {
        let savedCfg = await localforage.getItem('ly_animCfg');
        let isDark = true; // 系統預設值

        // 判斷使用者的儲存狀態
        if (savedCfg && savedCfg.globalDarkMode !== undefined) {
            isDark = savedCfg.globalDarkMode;
        } else {
            let earlyDark = localStorage.getItem("ly_early_dark_mode");
            if (earlyDark === "false") isDark = false;
        }

        // ★ 核心修復：不論是 True 還是 False，都強制呼叫 toggleGlobalDarkMode
        // 這樣就能保證畫面樣式與 Checkbox 的打勾狀態 100% 同步！
        window.toggleGlobalDarkMode(isDark);
    }
    // ... (上方是原本深色模式的讀取邏輯)
    if (typeof localforage !== 'undefined') {
        let savedCfg = await localforage.getItem('ly_animCfg');
        let isDark = true; // 系統預設值

        if (savedCfg && savedCfg.globalDarkMode !== undefined) {
            isDark = savedCfg.globalDarkMode;
        } else {
            let earlyDark = localStorage.getItem("ly_early_dark_mode");
            if (earlyDark === "false") isDark = false;
        }

        window.toggleGlobalDarkMode(isDark);
    }

    // ==========================================
    // ★ 新增：APP 載入完成後，自動觸發「帶入時位」
    // ==========================================
    setTimeout(() => {
        if (typeof autoLocateCity === 'function') {
            autoLocateCity();
        }
    }, 800);
}

window.onload = initApp;

function process(ls, method, preserveNotes = null) {
    document.documentElement.classList.remove('recycle-bin-preview-mode');
    AppState.curRecIndex = -1;
    let bazi,
        timeNote = "",
        jieQiInfo = null,
        dateObj = null;
    let useCustomTime = true;
    let isSouthAdjust = false;

    if (window.tempEditSouthAdjust !== undefined) {
        isSouthAdjust = window.tempEditSouthAdjust;
    } else if (
        $("cb-south-adjust") &&
        $("south-adjust-wrapper").style.display !== "none"
    ) {
        isSouthAdjust = $("cb-south-adjust").checked;
    } else if (
        $("modal-cb-south-adjust") &&
        $("modal-south-adjust-wrapper").style.display !== "none"
    ) {
        isSouthAdjust = $("modal-cb-south-adjust").checked;
    } else {
        isSouthAdjust = window.animCfg
            ? window.animCfg.southAdjust || false
            : false;
    }

    if (useCustomTime) {
        if (AppState.isTrueMode) {
            let y = parseInt($("ts-year").value),
                m = parseInt($("ts-month").value),
                d = parseInt($("ts-day").value);
            let h = parseInt($("ts-hour").value),
                min = parseInt($("ts-minute").value);

            dateObj = new Date(y, m, d, h, min);
            let lon = parseFloat($("ts-lon").value);

            // ==========================================
            // ★ 究極真太陽時運算：經度平太陽時 + 均時差
            // ==========================================
            // 1. 計算當天是一年中的第幾天 (Day of Year)
            let startOfYear = new Date(y, 0, 0);
            let diffTime = dateObj.getTime() - startOfYear.getTime();
            let dayOfYear = Math.floor(diffTime / (1000 * 60 * 60 * 24));
            // 2. 均時差簡化逼近公式 (結果為分鐘)
            let b = (2 * Math.PI * (dayOfYear - 81)) / 365;
            let eot = 9.87 * Math.sin(2 * b) - 7.53 * Math.cos(b) - 1.5 * Math.sin(b);
            // 3. 經度時差 (以中原標準時間 UTC+8 的 120 度為基準，每度 4 分鐘)
            let lonDiff = (lon - 120) * 4;
            // 4. 總時差 = 經度時差 + 均時差
            let totalDiff = lonDiff + eot;
            // 5. 算出最終真正的「真太陽時」
            let realD = new Date(dateObj.getTime() + totalDiff * 60000);
            // 記錄修正了多少分鐘供畫面顯示
            timeNote = `(真太陽時: ${totalDiff > 0 ? "+" : ""}${totalDiff.toFixed(1)}分)`;
            bazi = getBazi(realD, isSouthAdjust);
        } else {
            let yg = Gan[parseInt($("gz-y-gan").value)],
                yz = Zhi[parseInt($("gz-y-zhi").value)];
            let mg = Gan[parseInt($("gz-m-gan").value)],
                mz = Zhi[parseInt($("gz-m-zhi").value)];
            let dg = Gan[parseInt($("gz-d-gan").value)],
                dz = Zhi[parseInt($("gz-d-zhi").value)];
            let hg = Gan[parseInt($("gz-h-gan").value)],
                hz = Zhi[parseInt($("gz-h-zhi").value)];
            bazi = {
                Y: yg + yz,
                M: mg + mz,
                D: dg + dz,
                H: hg + hz,
                dG: parseInt($("gz-d-gan").value),
                dZ: parseInt($("gz-d-zhi").value),
                mZ: parseInt($("gz-m-zhi").value),
            };
            timeNote = "(自訂干支)";
            dateObj = new Date();
        }
    } else {
        dateObj = new Date();
        bazi = getBazi(dateObj);
        bazi = getBazi(dateObj, isSouthAdjust);
    }

    if (dateObj) jieQiInfo = getJieQiRange(dateObj);

    let najia = $("set-najia").value;
    let fushen = $("set-fushen").value;
    let bianView = $("set-bian-view").value;

    let res = solve(ls, bazi, najia, fushen);

    AppState.curData = {
        ...res,
        isSouthAdjust: isSouthAdjust,
        lines: ls,
        najiaValue: najia,
        fushenValue: fushen,
        bianViewValue: bianView,
        isDrawModeEnabled: false, // ★ 解決問題3：每支新卦預設關閉繪圖，確保狀態獨立
        method,
        dateStr:
            useCustomTime && !AppState.isTrueMode ? "自訂時間" : fmtDate(dateObj),
        solarNote: timeNote,
        jieQiInfo,
        gender: document.querySelector('input[name="gender"]:checked').value,
        najia: $("set-najia").options[$("set-najia").selectedIndex].text,
        fushen: $("set-fushen").options[$("set-fushen").selectedIndex].text,
        showCi: $("set-show-ci").value === "1",
        question: $("p-question").value,
        subject:
            preserveNotes && preserveNotes.subject ? preserveNotes.subject : "",
        judge: preserveNotes && preserveNotes.judge ? preserveNotes.judge : "",
        feedback:
            preserveNotes && preserveNotes.feedback ? preserveNotes.feedback : "",
        note: preserveNotes && preserveNotes.note ? preserveNotes.note : "",
        currentStatus: preserveNotes && preserveNotes.currentStatus ? preserveNotes.currentStatus : "", // ★ 新增
        copyAddon: preserveNotes && preserveNotes.copyAddon !== undefined ? preserveNotes.copyAddon : "請參照來源資料《六爻解卦標準流程》的步驟與規範詳細解卦，並以問卦日期前輟生成解卦結果檔案。", // ★ 新增
        history:
            preserveNotes && preserveNotes.history ? preserveNotes.history : [],
    };

    // ★ 全域繪圖狀態同步歸零
    AppState.isDrawModeEnabled = false;

    $("res-set-najia").value = najia;
    $("res-set-fushen").value = fushen;
    $("res-set-bian").value = bianView;

    window.comesFromRecords = false;
    window.hasUnsavedChanges = true;
    window.location.hash = "#result";

    renderRes();

    // ==========================================
    // ★ 解決問題1：起卦完畢，立刻強制背景存檔 (Auto-Save)
    // ==========================================
    setTimeout(async () => {
        if (AppState.curRecIndex === -1 || AppState.curRecIndex === undefined) {
            let recs = (await localforage.getItem("iching_final_v60")) || [];
            let cloneData = JSON.parse(JSON.stringify(AppState.curData));
            recs.unshift(cloneData); // 存入最新一筆
            AppState.curRecIndex = 0; // 鎖定當前索引
            await localforage.setItem("iching_final_v60", recs);

            // 標記為已存檔，解除返回攔截警告
            window.hasUnsavedChanges = false;
            window.comesFromRecords = true;

            // 若雲端自動同步開啟，順便上傳
            if (typeof window.syncToCloud === "function") window.syncToCloud();
        }
    }, 100); // 給予 0.1 秒緩衝，讓畫面先順暢渲染
    // ★ 新增這行：排盤完成後，將自訂時間鎖解除，讓下一次起卦能再次自動抓最新時間！
    window.isCustomTimeSet = false;
}

// ==========================================
// ★ 核心時間同步器 (起卦瞬間抓取最新時間)
// ==========================================
window.isCustomTimeSet = false; // 全域標記：使用者是否有自訂時間

function refreshTimeToNow() {
    // 智慧防呆：如果使用者有進去「自訂時位」修改過時間，就尊重他的設定，絕對不自動覆蓋
    if (window.isCustomTimeSet) return;

    let d = new Date();
    let yEl = document.getElementById("ts-year");
    if (yEl) {
        yEl.value = d.getFullYear();
        document.getElementById("ts-month").value = d.getMonth();
        document.getElementById("ts-day").value = d.getDate();
        document.getElementById("ts-hour").value = d.getHours();
        document.getElementById("ts-minute").value = d.getMinutes();
    }
}

// ★ 新增 customMethod 參數
function startManual(customMethod) {
    document.documentElement.classList.remove('recycle-bin-preview-mode');
    window.comesFromRecords = false;

    refreshTimeToNow();

    let ls = [];
    const valMap = { "少陽": 7, "老陽": 9, "少陰": 8, "老陰": 6 };

    for (let i = 0; i < 6; i++) {
        let sel = document.getElementById("yao-sel-" + i);
        if (!sel || !sel.value) {
            if (window.showAlert) window.showAlert(`請確認【${['初爻', '二爻', '三爻', '四爻', '五爻', '上爻'][i]}】已選擇爻象！`);
            return;
        }
        ls.push(valMap[sel.value]);
    }

    // ★ 判斷：如果有傳入自訂標示，就用自訂的，否則預設為手動起卦
    let methodStr = (typeof customMethod === 'string') ? customMethod : "M 手動起卦";
    process(ls, methodStr);

    resetManualUI();
}

function startAuto() {
    document.documentElement.classList.remove('recycle-bin-preview-mode');
    window.comesFromRecords = false;

    let hasManualInput = false;
    for (let i = 0; i < 6; i++) {
        let sel = document.getElementById("yao-sel-" + i);
        if (sel && sel.value !== "") hasManualInput = true;
    }
    if (window.AppState && window.AppState.currentCastStep > 0) hasManualInput = true;

    const executeAuto = () => {
        // ★ 核心新增：點下去的瞬間，重新定時！
        refreshTimeToNow();

        let ls = [];
        for (let i = 0; i < 6; i++) {
            let c = 0;
            for (let j = 0; j < 3; j++) {
                if (Math.random() > 0.5) c++;
            }
            ls.push([6, 7, 8, 9][c]);
        }
        process(ls, "A 電腦起卦");
    };

    if (hasManualInput) {
        window.showConfirm("⚠️ 警告：目前卦盤已有手動起卦進度。\n\n確定要放棄當前輸入，改由電腦重新起卦嗎？\n(此動作將清空目前的盤面)").then(ok => {
            if (ok) {
                if (typeof window.resetManualUI === 'function') window.resetManualUI();
                executeAuto();
            }
        });
    } else {
        executeAuto();
    }
}

// ==========================================
// ★ 系統設定與自動定位模組
// ==========================================
let animCfg = {
    tmPrep: 1.5, tmToss: 2.0, tmSy: 1.5, tmOy: 2.0, tmSn: 1.5, tmOn: 2.0,
    useShake: false,
    endMode: 'click',
    endTime: 2.0,
    tossMode: 'qianlong',
    tossTrigger: 'press',
    southAdjust: false,

    // ★ 龜殼預設四大金剛
    turtleSpeed: 1,           // 速度預設為最穩重的 1
    turtleMoveSpeed: true,    // 預設開啟按移變速
    turtleVibrate: true,      // 預設開啟震動
    turtleAutoNext: true      // 預設開啟連續免點擊
};

let msgTimer = null; // 放在全域避免多次點擊計時器重疊
// ==========================================
// ★ 射線法演算法 (Ray Casting Algorithm)
// ==========================================
function isPointInPolygon(point, vs) {
    let x = point[0], y = point[1]; // 這是使用者的 [經度, 緯度]
    let inside = false;             // 初始狀態設為「在多邊形外」

    // 迴圈遍歷多邊形 (vs) 的每一個邊緣線段
    for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
        let xi = vs[i][0], yi = vs[i][1]; // 線段的起點
        let xj = vs[j][0], yj = vs[j][1]; // 線段的終點

        // ★ 核心數學邏輯：從使用者的點 (x, y) 向水平方向發射一條無限長的虛擬射線
        // 判斷這條射線是否與目前這條邊緣線段產生「交叉 (intersect)」
        let intersect = ((yi > y) != (yj > y))
            && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);

        // 如果射線穿過了邊界，狀態就會反轉 (外變內，內變外)
        // 也就是著名的：「穿過奇數次代表在內部，偶數次代表在外部」
        if (intersect) inside = !inside;
    }

    return inside; // 最終回傳 true (在縣市內) 或 false (在縣市外)
}

// ==========================================
// ★ 離線地理運算引擎 (支援鄉鎮市區級別)
// ==========================================
function findCountyByOfflineMap(lon, lat, geojsonData) {
    if (!geojsonData || !geojsonData.features) return "other";
    let point = [lon, lat];

    for (let feature of geojsonData.features) {
        let polygons = feature.geometry.type === 'Polygon'
            ? [feature.geometry.coordinates]
            : feature.geometry.coordinates;

        for (let polygon of polygons) {
            if (isPointInPolygon(point, polygon[0])) {
                // 嘗試抓取縣市名與鄉鎮名 (相容於政府開放資料的屬性命名)
                let county = feature.properties.COUNTYNAME || feature.properties.COUNTY_ENG || feature.properties.name || "";
                let town = feature.properties.TOWNNAME || feature.properties.TOWN_ENG || "";

                // 將縣市與鄉鎮組合，例如："苗栗縣 頭份市"
                let fullName = `${county} ${town}`.trim();
                return fullName || "other";
            }
        }
    }
    return "other";
}

// ==========================================
// ★ 究極七軌制定位引擎 (加入防連點鎖 & GPS 硬體快取)
// ==========================================
window.autoLocateCity = async function () {
    // ★ 修復 1：防連點機制 (Debounce Lock)
    // 如果系統正在定位中，直接阻擋使用者的重複點擊，防止 API 狂刷
    if (window.isLocating) return;
    window.isLocating = true;

    let timeOk = false;
    let locOk = false;
    let customLocMsg = "";

    const toggleSouthCb = (show) => {
        let forceShow = window.animCfg ? (window.animCfg.southAdjust === true) : false;
        let finalShow = show || forceShow;
        if (document.getElementById("south-adjust-wrapper")) document.getElementById("south-adjust-wrapper").style.display = finalShow ? "block" : "none";
        if (document.getElementById("modal-south-adjust-wrapper")) document.getElementById("modal-south-adjust-wrapper").style.display = finalShow ? "block" : "none";
    };

    const showStatus = () => {
        let timeMsg = timeOk ? "🕒 定時成功" : "🕒 定時失敗(請手動)";
        let locMsg = "";

        if (locOk) {
            locMsg = customLocMsg;
        } else {
            let citySel = document.getElementById("city-select");
            if (citySel && citySel.value !== "" && citySel.value !== "other" && citySel.value !== "api_temp") {
                let cityName = citySel.options[citySel.selectedIndex].text.replace("📍 ", "");
                locMsg = `📍 手動定位：${cityName}`;
            } else {
                let dLat = document.getElementById('ts-lat') ? parseFloat(document.getElementById('ts-lat').value).toFixed(2) : "25.00";
                let dLon = document.getElementById('ts-lon') ? parseFloat(document.getElementById('ts-lon').value).toFixed(2) : "121.50";
                let dirLat = dLat >= 0 ? "N" : "S";
                let dirLon = dLon >= 0 ? "E" : "W";
                locMsg = `❌ 定位失敗 (帶入預設: ${dirLat}${Math.abs(dLat)}, ${dirLon}${Math.abs(dLon)})`;
            }
        }
        window.syncStatusMsg(timeMsg, locMsg);

        // ★ 任務結束，解開防連點鎖
        window.isLocating = false;
    };

    try {
        let d = new Date();
        let yEl = document.getElementById("ts-year");
        if (yEl) {
            yEl.value = d.getFullYear();
            document.getElementById("ts-month").value = d.getMonth();
            document.getElementById("ts-day").value = d.getDate();
            document.getElementById("ts-hour").value = d.getHours();
            document.getElementById("ts-minute").value = d.getMinutes();
        }
        timeOk = true;
    } catch (e) {
        timeOk = false;
    }

    const processApiData = (data, fallbackLat, fallbackLon, modeMsg) => {
        let lat = data.latitude || fallbackLat;
        let lon = data.longitude || fallbackLon;
        let locName = data.city || data.locality || data.principalSubdivision || "";
        let country = data.countryName || "";

        let latEl = document.getElementById('ts-lat');
        if (latEl) {
            latEl.value = parseFloat(lat).toFixed(4);
            document.getElementById('ts-lon').value = parseFloat(lon).toFixed(4);
            document.getElementById('ts-zone').value = -(new Date()).getTimezoneOffset();
        }

        localStorage.setItem('ly_last_lat', lat);
        localStorage.setItem('ly_last_lon', lon);
        localStorage.setItem('ly_last_locName', locName);

        toggleSouthCb(lat < 0);
        locOk = true;

        if (country || locName) {
            let preciseName = `${country} ${locName}`.trim();
            customLocMsg = `📍 ${modeMsg}：${preciseName}`;

            let selectObj = document.getElementById("city-select");
            if (selectObj) {
                let oldApiOpt = selectObj.querySelector("option[value='api_temp']");
                if (oldApiOpt) oldApiOpt.remove();

                let newOpt = document.createElement("option");
                newOpt.value = "api_temp";
                newOpt.text = `📍 ${preciseName}`;
                selectObj.insertBefore(newOpt, selectObj.options[1]);
                selectObj.value = "api_temp";
            }
        }
    };

    if (navigator.geolocation) {
        window.syncStatusMsg(timeOk ? "🕒 定時成功" : "🕒 定時失敗", "⏳ 正在取得多重定位資訊...");

        navigator.geolocation.getCurrentPosition(
            async pos => {
                let lat = pos.coords.latitude, lon = pos.coords.longitude;
                let locationResolved = false;

                if (typeof taiwanGeoJson !== 'undefined') {
                    let myCounty = findCountyByOfflineMap(lon, lat, taiwanGeoJson);
                    let selectObj = document.getElementById("city-select");

                    if (myCounty !== "other" && selectObj) {
                        // ★ 直接為離線定位創建一個專屬選項，不再依賴舊有字串配對！
                        let oldApiOpt = selectObj.querySelector("option[value='api_temp']");
                        if (oldApiOpt) oldApiOpt.remove();

                        let newOpt = document.createElement("option");
                        newOpt.value = "api_temp";
                        newOpt.text = `📍 ${myCounty}`; // 完美顯示如：📍 臺東縣 成功鎮
                        selectObj.insertBefore(newOpt, selectObj.options[1]);
                        selectObj.value = "api_temp";

                        // 寫入座標與時區
                        document.getElementById('ts-lat').value = lat.toFixed(4);
                        document.getElementById('ts-lon').value = lon.toFixed(4);
                        document.getElementById('ts-zone').value = -(new Date()).getTimezoneOffset();

                        // 儲存至記憶體
                        localStorage.setItem('ly_last_lat', lat);
                        localStorage.setItem('ly_last_lon', lon);
                        localStorage.setItem('ly_last_locName', myCounty);

                        locOk = true;
                        toggleSouthCb(lat < 0);
                        customLocMsg = `📍 離線極速定位：${myCounty}`;
                        locationResolved = true; // 標記完成，攔截後續 API
                    }
                }

                if (!locationResolved) {
                    try {
                        let url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=zh`;
                        let res = await fetch(url);
                        if (!res.ok) throw new Error("API failed");
                        let data = await res.json();

                        processApiData(data, lat, lon, "GPS 雲端定位");
                    }
                    catch (e1) {
                        locOk = true;
                        toggleSouthCb(lat < 0);
                        if (document.getElementById('ts-lat')) {
                            document.getElementById('ts-lat').value = lat.toFixed(4);
                            document.getElementById('ts-lon').value = lon.toFixed(4);
                            document.getElementById('ts-zone').value = -(new Date()).getTimezoneOffset();
                        }

                        localStorage.setItem('ly_last_lat', lat);
                        localStorage.setItem('ly_last_lon', lon);

                        let latDir = lat >= 0 ? "N" : "S";
                        let lonDir = lon >= 0 ? "E" : "W";
                        customLocMsg = `📍 GPS 成功 (座標: ${latDir}${Math.abs(lat).toFixed(2)}, ${lonDir}${Math.abs(lon).toFixed(2)})`;

                        let selectObj = document.getElementById("city-select");
                        if (selectObj) {
                            let bestMatch = "other", minDiff = 999;
                            for (let i = 1; i < selectObj.options.length; i++) {
                                if (selectObj.options[i].value === "other" || selectObj.options[i].value === "api_temp" || !selectObj.options[i].value) continue;
                                let parts = selectObj.options[i].value.split(',');
                                let diff = Math.pow(lon - parseFloat(parts[0]), 2) + Math.pow(lat - parseFloat(parts[1]), 2);
                                if (diff < minDiff) { minDiff = diff; bestMatch = selectObj.options[i].value; }
                            }
                            selectObj.value = (minDiff < 3) ? bestMatch : "other";
                        }
                    }
                }
                showStatus();
            },
            async err => {
                try {
                    let url = `https://api.bigdatacloud.net/data/reverse-geocode-client?localityLanguage=zh`;
                    let res = await fetch(url);
                    if (!res.ok) throw new Error("IP API failed");
                    let data = await res.json();

                    processApiData(data, 25.0329, 121.5654, "網路定位");
                } catch (e4) {
                    let cachedLat = localStorage.getItem('ly_last_lat');
                    let cachedLon = localStorage.getItem('ly_last_lon');
                    let cachedName = localStorage.getItem('ly_last_locName');

                    if (cachedLat && cachedLon) {
                        document.getElementById('ts-lat').value = parseFloat(cachedLat).toFixed(4);
                        document.getElementById('ts-lon').value = parseFloat(cachedLon).toFixed(4);
                        document.getElementById('ts-zone').value = -(new Date()).getTimezoneOffset();
                        locOk = true;
                        toggleSouthCb(cachedLat < 0);
                        customLocMsg = `📍 歷史記憶定位：${cachedName || "上次成功座標"}`;
                    }
                    else {
                        try {
                            let tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
                            if (tz === 'Asia/Taipei') {
                                document.getElementById('ts-lat').value = "25.0329";
                                document.getElementById('ts-lon').value = "121.5654";
                                document.getElementById('ts-zone').value = -480;
                                locOk = true;
                                customLocMsg = `📍 時區推測定位：台灣 台北市`;
                            }
                            else if (tz === 'Asia/Hong_Kong' || tz === 'Asia/Macau') {
                                document.getElementById('ts-lat').value = "22.3193";
                                document.getElementById('ts-lon').value = "114.1694";
                                document.getElementById('ts-zone').value = -480;
                                locOk = true;
                                customLocMsg = `📍 時區推測定位：香港/澳門`;
                            }
                        } catch (e6) {
                            locOk = false;
                            toggleSouthCb(true);
                        }
                    }
                }
                showStatus();
            },
            // ★ 修復 2：極致優化的 GPS 硬體設定
            // enableHighAccuracy: 開啟高精度
            // timeout: 10000 (給予硬體更寬鬆的 10 秒去抓取衛星，避免隨便報錯降級)
            // maximumAge: 60000 (如果使用者在 60 秒內連續點擊，直接拿上一次的經緯度，不再重新喚醒硬體)
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
        );
    } else {
        locOk = false;
        toggleSouthCb(true);
        showStatus();
    }
};

// 將 getElClass 移至全域，供 solve 和 renderRes 使用
const getElClass = (str) => {
    if (!str) return "";
    let last = str.slice(-1);
    if ("金申酉庚辛".includes(last)) return "c-gold";
    if ("木寅卯甲乙".includes(last)) return "c-wood";
    if ("水子亥壬癸".includes(last)) return "c-water";
    if ("火巳午丙丁".includes(last)) return "c-fire";
    if ("土辰戌丑未戊己".includes(last)) return "c-earth";
    return "";
};

// --- 節氣計算邏輯 (精確到分) ---
function getJieQiDate(y, n) {
    const offDate = new Date((31556925974.7 * (y - 1900) + [0, 21208, 42467, 63836, 85337, 107014, 128867, 150921, 173149, 195551, 218072, 240693, 263343, 285989, 308563, 331033, 353350, 375494, 397447, 419210, 440795, 462224, 483532, 504758][n] * 60000) + Date.UTC(1900, 0, 6, 2, 5));
    return offDate;
}
function getJieQiRange(d) {
    let y = d.getFullYear();
    let terms = [];
    for (let yr of [y - 1, y, y + 1]) {
        for (let i = 0; i < 24; i++) {
            terms.push({ name: JieQiNames[i], date: getJieQiDate(yr, i) });
        }
    }
    terms.sort((a, b) => a.date - b.date);
    let idx = terms.findIndex(t => t.date > d);
    return { prev: terms[idx - 1], next: terms[idx] };
}
function fmtDate(d) {
    // 1. 防呆：如果是空值直接回傳空字串
    if (!d) return "";

    // 2. 強制轉換：無論 d 是字串、數字時間戳，還是已經是 Date 物件，一律轉為正規 Date
    let dateObj = (d instanceof Date) ? d : new Date(d);

    // 3. 防呆：如果轉換後是無效日期 (Invalid Date)，回傳空字串
    if (isNaN(dateObj.getTime())) return "";

    // 4. 安全地抓取時間參數
    let m = dateObj.getMonth() + 1;
    let dd = dateObj.getDate();
    let h = dateObj.getHours();
    let mm = dateObj.getMinutes();

    return `${dateObj.getFullYear()}/${m}/${dd} ${h < 10 ? '0' + h : h}:${mm < 10 ? '0' + mm : mm}`;
}

function getSolarTerm(y, n) {
    return getJieQiDate(y, n); // 直接回傳精確到分鐘的 Date 物件
}

function getBazi(d, isSouthAdjust = false) {
    let y = d.getFullYear(), m = d.getMonth(), dt = d.getDate(), h = d.getHours();

    // 取得今年的立春時間 (精確到分)
    let lichun = getSolarTerm(y, 2);

    let yIdx = (y - 4) % 60;
    if (yIdx < 0) yIdx += 60;

    // ★ 修正：使用 getTime() 進行毫秒級的絕對時間比對
    if (d.getTime() < lichun.getTime()) {
        yIdx = (yIdx - 1 + 60) % 60;
    }

    // 取得當年的 12 個「節」(決定月柱的基準)
    // 索引：0小寒, 2立春, 4驚蟄, 6清明, 8立夏, 10芒種, 12小暑, 14立秋, 16白露, 18寒露, 20立冬, 22大雪
    let termDates = [];
    for (let i = 0; i < 24; i += 2) {
        termDates.push(getSolarTerm(y, i));
    }

    // 為了跨年計算 (例如一月小寒前屬於去年的子月)，我們需要補上去年底的大雪與小寒
    let prevDecTerm = getSolarTerm(y - 1, 22); // 去年大雪 (子月起點)
    let prevJanTerm = getSolarTerm(y, 0);      // 今年小寒 (丑月起點)

    // ★ 修正：精準尋找當前時間落在哪個節氣區間
    let mZhi;
    let tTime = d.getTime();

    if (tTime < prevJanTerm.getTime()) mZhi = 0; // 子月
    else if (tTime < termDates[1].getTime()) mZhi = 1; // 丑月
    else if (tTime < termDates[2].getTime()) mZhi = 2; // 寅月 (立春後)
    else if (tTime < termDates[3].getTime()) mZhi = 3; // 卯月
    else if (tTime < termDates[4].getTime()) mZhi = 4; // 辰月
    else if (tTime < termDates[5].getTime()) mZhi = 5; // 巳月
    else if (tTime < termDates[6].getTime()) mZhi = 6; // 午月
    else if (tTime < termDates[7].getTime()) mZhi = 7; // 未月
    else if (tTime < termDates[8].getTime()) mZhi = 8; // 申月
    else if (tTime < termDates[9].getTime()) mZhi = 9; // 酉月
    else if (tTime < termDates[10].getTime()) mZhi = 10; // 戌月
    else if (tTime < termDates[11].getTime()) mZhi = 11; // 亥月
    else mZhi = 0; // 過了大雪，進入明年的子月

    // ★ 新增：南半球節氣對沖攔截器 (加 6 個月)
    if (isSouthAdjust) {
        mZhi = (mZhi + 6) % 12;
    }

    // 五虎遁月干
    let mBase = (yIdx % 5) * 2 + 2;
    let mGan = (mBase + (mZhi >= 2 ? mZhi - 2 : mZhi + 10)) % 10;

    // 處理日柱 (使用 UTC 天數計算，這裡原本的寫法是正確的)
    let utcDiff = Math.floor(Date.UTC(y, m, dt) / 86400000);
    let dbEl = document.getElementById("ts-day-break");
    let dayBreak = dbEl ? parseInt(dbEl.value) : 0;
    if (dayBreak === 0 && h >= 23) utcDiff++;
    let dIdx = (utcDiff + 17) % 60;
    if (dIdx < 0) dIdx += 60;

    // 處理時柱
    let hZhi = Math.floor((h + 1) / 2) % 12;
    if (h === 23) hZhi = 0;
    let hGan = ((dIdx % 10) % 5 * 2 + hZhi) % 10;

    return {
        Y: Gan[yIdx % 10] + Zhi[yIdx % 12],
        M: Gan[mGan % 10] + Zhi[mZhi],
        D: Gan[dIdx % 10] + Zhi[dIdx % 12],
        H: Gan[hGan] + Zhi[hZhi],
        dG: dIdx % 10,
        dZ: dIdx % 12,
        mZ: mZhi
    };
}

function getGuaBase(mode) {
    let base = {
        "乾": { in: [0, 2, 4], out: [6, 8, 10], f: 0, gIn: "甲", gOut: "壬" },
        "坎": { in: [2, 4, 6], out: [8, 10, 0], f: 2, gIn: "戊", gOut: "戊" },
        "艮": { in: [4, 6, 8], out: [10, 0, 2], f: 4, gIn: "丙", gOut: "丙" },
        "震": { in: [0, 2, 4], out: [6, 8, 10], f: 1, gIn: "庚", gOut: "庚" },
        "巽": { in: [1, 11, 9], out: [7, 5, 3], f: 1, gIn: "辛", gOut: "辛" },
        "離": { in: [3, 1, 11], out: [9, 7, 5], f: 3, gIn: "己", gOut: "己" },
        "坤": { in: [7, 5, 3], out: [1, 11, 9], f: 4, gIn: "乙", gOut: "癸" },
        "兌": { in: [5, 3, 1], out: [11, 9, 7], f: 0, gIn: "丁", gOut: "丁" }
    };

    if (mode === "wu") {
        base["乾"] = { in: [6, 8, 10], out: [0, 2, 4], f: 0, gIn: "壬", gOut: "甲" };
    }

    if (mode === "zang") {
        base["乾"] = { in: [10, 8, 6], out: [4, 2, 0], f: 0, gIn: ["庚", "壬", "甲"], gOut: ["戊", "丙", "庚"] };
        base["坎"] = { in: [0, 10, 8], out: [6, 4, 2], f: 2, gIn: ["丙", "庚", "壬"], gOut: ["甲", "戊", "丙"] };
        base["艮"] = { in: [2, 0, 10], out: [8, 6, 4], f: 4, gIn: ["戊", "丙", "庚"], gOut: ["壬", "甲", "戊"] };
        base["震"] = { in: [3, 1, 11], out: [9, 7, 5], f: 1, gIn: ["乙", "丁", "己"], gOut: ["辛", "癸", "乙"] };
        base["巽"] = { in: [5, 7, 9], out: [11, 1, 3], f: 1, gIn: ["癸", "辛", "己"], gOut: ["丁", "乙", "癸"] };
        base["離"] = { in: [7, 9, 11], out: [1, 3, 5], f: 3, gIn: ["辛", "己", "丁"], gOut: ["乙", "癸", "辛"] };
        base["坤"] = { in: [7, 9, 11], out: [1, 3, 5], f: 4, gIn: ["己", "丁", "乙"], gOut: ["癸", "辛", "己"] };
        base["兌"] = { in: [9, 11, 1], out: [3, 5, 7], f: 0, gIn: ["丁", "乙", "癸"], gOut: ["辛", "己", "丁"] };
    }
    return base;
}

function getRel(me, o) {
    const gen = { 0: 2, 2: 1, 1: 3, 3: 4, 4: 0 }, res = { 0: 1, 1: 4, 4: 2, 2: 3, 3: 0 };
    if (me === o) return "兄弟";
    if (gen[me] === o) return "子孫";
    if (gen[o] === me) return "父母";
    if (res[me] === o) return "妻財";
    return "官鬼";
}

function getBaseLines(gn, f, gBase) {
    let ls = [];
    for (let i = 0; i < 3; i++) {
        let stem = Array.isArray(gBase[gn].gIn) ? gBase[gn].gIn[i] : gBase[gn].gIn;
        ls.push({ rel: getRel(f, ZhiFiveMap[gBase[gn].in[i]]), gz: stem + Zhi[gBase[gn].in[i]] + FiveEl[ZhiFiveMap[gBase[gn].in[i]]] });
    }
    for (let i = 0; i < 3; i++) {
        let stem = Array.isArray(gBase[gn].gOut) ? gBase[gn].gOut[i] : gBase[gn].gOut;
        ls.push({ rel: getRel(f, ZhiFiveMap[gBase[gn].out[i]]), gz: stem + Zhi[gBase[gn].out[i]] + FiveEl[ZhiFiveMap[gBase[gn].out[i]]] });
    }
    return ls;
}

// ==========================================
// ★★★ 核心起卦與排盤邏輯 ★★★
// ==========================================
function solve(lines, bazi, najiaMode, fushenMode) {
    let benB = [], bianB = [];
    lines.forEach(v => {
        benB.push((v === 7 || v === 9) ? 1 : 0);
        if (v === 9) bianB.push(0); else if (v === 6) bianB.push(1); else bianB.push((v === 7) ? 1 : 0);
    });

    const getI = (b) => {
        let low = b[0] + b[1] * 2 + b[2] * 4, up = b[3] + b[4] * 2 + b[5] * 4, id = up * 8 + low;
        let name = NameMap[id];
        let meta = GuaMetaMap[name];
        return { name: name, gong: meta.gong, shi: meta.shi, id: id };
    };

    let ben = getI(benB), bian = getI(bianB);
    let GBase = getGuaBase(najiaMode);
    let gongF = FiveEl.indexOf(GuaElMap[ben.gong]);

    let rows = [], beasts = Beasts[bazi.dG], presentRels = new Set();
    for (let i = 0; i < 6; i++) {
        let tri = GBase[TriNames[i >= 3 ? (ben.id >> 3) : (ben.id & 7)]];
        presentRels.add(getRel(gongF, ZhiFiveMap[tri[i >= 3 ? "out" : "in"][i % 3]]));
    }

    let fuGuaName = ben.gong;
    if (fushenMode === "jing" && (ben.id >> 3) === (ben.id & 7)) {
        const jingPair = { "乾": "兌", "兌": "乾", "震": "離", "離": "震", "巽": "坎", "坎": "巽", "艮": "坤", "坤": "艮" };
        fuGuaName = jingPair[ben.gong];
    }
    let fuLines = getBaseLines(fuGuaName, gongF, GBase);

    const basicMk = (targetZ) => {
        let s = ""; if (targetZ == null) return { html: s, isAD: false, isDPo: false };
        let k1 = (10 - bazi.dG + bazi.dZ) % 12; if (k1 < 0) k1 += 12;
        let k2 = (11 - bazi.dG + bazi.dZ) % 12; if (k2 < 0) k2 += 12;

        // 1. 空亡
        if (targetZ === k1 || targetZ === k2) s += '<span class="mark-break">空亡</span>';

        // 2. 月破
        if (Math.abs(targetZ - bazi.mZ) === 6) s += '<span class="mark-break" style="background-color:#dc3545; box-shadow: 1px 1px 2px rgba(0,0,0,0.2);">月破</span>';

        // 3. 日沖 (嚴格只有日沖)
        let isDChong = Math.abs(targetZ - bazi.dZ) === 6;
        if (isDChong) s += '<span class="mark-break" style="background-color:#6f42c1; box-shadow: 1px 1px 2px rgba(0,0,0,0.2);">日沖</span>';

        return { html: s, isAD: false, isDPo: isDChong };
    };

    for (let i = 5; i >= 0; i--) {
        let upN = TriNames[i >= 3 ? (ben.id >> 3) : (ben.id & 7)], bUpN = TriNames[i >= 3 ? (bian.id >> 3) : (bian.id & 7)];
        let z = GBase[upN][i >= 3 ? "out" : "in"][i % 3], rawG = GBase[upN][i >= 3 ? "gOut" : "gIn"], g = Array.isArray(rawG) ? rawG[i % 3] : rawG;
        let zB = GBase[bUpN][i >= 3 ? "out" : "in"][i % 3], rawGB = GBase[bUpN][i >= 3 ? "gOut" : "gIn"], gB = Array.isArray(rawGB) ? rawGB[i % 3] : rawGB;
        let barHtml = (lines[i] === 7 || lines[i] === 9) ? `solid` : `broken`;
        let bBarHtml = (lines[i] === 6 || lines[i] === 9) ? ((lines[i] === 6) ? `solid` : `broken`) : barHtml;

        let fGZ = fuLines[i].gz, fZhiIdx = Zhi.indexOf(fGZ.slice(1, 2));
        const getTombZhi = (elIdx) => ({ 0: 1, 1: 7, 2: 4, 3: 10, 4: null }[elIdx]);

        let isMoving = (lines[i] === 6 || lines[i] === 9);

        // 算出出伏狀態 (給大眾版或外掛套件參考用)
        let isFuOut = false;
        if (fGZ) {
            let zFeiIdx = z;
            isFuOut = (Math.abs(bazi.mZ - zFeiIdx) === 6 || (bazi.mZ + zFeiIdx) % 12 === 1) ||
                (Math.abs(bazi.dZ - zFeiIdx) === 6 || (bazi.dZ + zFeiIdx) % 12 === 1) ||
                ((bazi.dZ === getTombZhi(ZhiFiveMap[zFeiIdx])) && (zFeiIdx !== bazi.dZ)) ||
                (zFeiIdx === ((10 - bazi.dG + bazi.dZ) % 12 + (zFeiIdx < 0 ? 12 : 0)) || zFeiIdx === ((11 - bazi.dG + bazi.dZ) % 12 + (zFeiIdx < 0 ? 12 : 0)));

            // ★ 新增修正：當飛神（本爻）為動爻時，伏神絕對無法出伏
            if (isMoving) {
                isFuOut = false;
            }
        }

        let fuIsHidden = (fushenMode === "wang" && presentRels.has(fuLines[i].rel));

        let fuStatusHtml = "", myStatus = { html: "", isAD: false, isDPo: false }, bStatusObj = { html: "" }, score = 0;

        // ==========================================
        // ★ 核心防護罩：呼叫外掛大腦處理進階分數與理氣
        // ==========================================
        if (typeof window.pro_getAdvancedYaoInfo === 'function') {
            let advInfo = window.pro_getAdvancedYaoInfo({
                i, z, zB, fZhiIdx, isMoving, bazi, lines, ben, bian, fuIsHidden, fGZ, isFuOut, GBase
            });
            score = advInfo.score;
            myStatus = { html: advInfo.statusHtml, isAD: advInfo.isAD, isDPo: advInfo.isDPo };
            bStatusObj = { html: advInfo.bstatusHtml };
            fuStatusHtml = advInfo.fuStatusHtml;
        } else {
            // 完全由 ly_engine.js 獨立處理基礎印章
            myStatus = basicMk(z);
            if (isMoving && zB !== undefined) {
                bStatusObj = basicMk(zB);
            }
            if (fGZ && !fuIsHidden) {
                fuStatusHtml = basicMk(fZhiIdx).html;
            }
        }

        // 把結算好的這一個爻推入 rows 陣列中
        rows.push({
            bst: beasts[i],
            fuGz: fuIsHidden ? "" : fGZ, fuRel: fuIsHidden ? "" : fuLines[i].rel, fuKp: fuIsHidden ? "" : fuStatusHtml,
            shi: (i + 1 === ben.shi) ? "世" : ((i + 1 === (ben.shi + 3 > 6 ? ben.shi - 3 : ben.shi + 3)) ? "應" : ""),
            rel: getRel(gongF, ZhiFiveMap[z]), bar: barHtml, gz: g + Zhi[z] + FiveEl[ZhiFiveMap[z]],
            status: myStatus.html,
            score: score,
            isAnDong: myStatus.isAD, // 從 mk 狀態同步
            isRiPo: myStatus.isDPo,  // 從 mk 狀態同步
            move: isMoving ? (lines[i] === 9 ? "O" : "X") : "",
            br: getRel(gongF, ZhiFiveMap[zB]), bgz: gB + Zhi[zB] + FiveEl[ZhiFiveMap[zB]], bbar: bBarHtml,
            bstatus: bStatusObj.html, // ★ 套用 HTML
            bShi: (i + 1 === bian.shi) ? "世" : ((i + 1 === (bian.shi + 3 > 6 ? bian.shi - 3 : bian.shi + 3)) ? "應" : "")
        });
    }
    return { ben, bian, rows, bazi };
}

// ★ 升級版：支援雙向同步與繪圖快照重置的設定更新函式
window.applyResultSettings = function (source = 'nav') {
    // ==========================================
    // ★ 核心修復：在變更設定與重繪大表前，先將畫面上最新的筆記內容同步回記憶體，防止被覆蓋
    // ==========================================
    if (AppState.curData) {
        AppState.curData.subject = document.getElementById("edit-subject")?.value || AppState.curData.subject || "";
        AppState.curData.judge = document.getElementById("edit-judge")?.value || AppState.curData.judge || "";
        AppState.curData.feedback = document.getElementById("edit-feedback")?.value || AppState.curData.feedback || "";
        AppState.curData.note = document.getElementById("edit-note")?.value || AppState.curData.note || "";
        AppState.curData.currentStatus = document.getElementById("edit-current-status")?.value || AppState.curData.currentStatus || ""; // ★ 新增
        AppState.curData.copyAddon = document.getElementById("edit-copy-addon")?.value || AppState.curData.copyAddon || ""; // ★ 新增
        AppState.curData.yingqi = typeof window.getSettingsYingqiSnapshot === 'function' ? window.getSettingsYingqiSnapshot() : (AppState.curData.yingqi || null);
    }

    if (!AppState.curData || !AppState.curData.lines) {
        if (window.showAlert) window.showAlert("這筆紀錄缺少原始爻資料，無法即時切換。請重新起卦！");
        return;
    }

    let newNajiaVal, newFushenVal, newBianVal;

    // 判斷是從導覽列(nav)還是電腦版右上角(pc)觸發的
    if (source === 'pc') {
        newNajiaVal = $("pc-res-set-najia").value;
        newFushenVal = $("pc-res-set-fushen").value;
        newBianVal = $("pc-res-set-bian").value;
    } else {
        newNajiaVal = $("res-set-najia").value;
        newFushenVal = $("res-set-fushen").value;
        newBianVal = $("res-set-bian").value;
    }

    let needReCalc = (newNajiaVal !== AppState.curData.najiaValue || newFushenVal !== AppState.curData.fushenValue);

    // 更新狀態
    AppState.curData.najiaValue = newNajiaVal;
    AppState.curData.fushenValue = newFushenVal;
    AppState.curData.bianViewValue = newBianVal;

    if (AppState.curData.drawSnapshot) {
        delete AppState.curData.drawSnapshot;
    }

    if (needReCalc) {
        let res = solve(AppState.curData.lines, AppState.curData.bazi, newNajiaVal, newFushenVal);
        AppState.curData.ben = res.ben;
        AppState.curData.bian = res.bian;
        AppState.curData.rows = res.rows;
    }

    if (typeof window.renderRes === 'function') window.renderRes();

    // 強制將「所有」選單同步為最新數值
    if ($("res-set-najia")) $("res-set-najia").value = newNajiaVal;
    if ($("res-set-fushen")) $("res-set-fushen").value = newFushenVal;
    if ($("res-set-bian")) $("res-set-bian").value = newBianVal;
    if ($("pc-res-set-najia")) $("pc-res-set-najia").value = newNajiaVal;
    if ($("pc-res-set-fushen")) $("pc-res-set-fushen").value = newFushenVal;
    if ($("pc-res-set-bian")) $("pc-res-set-bian").value = newBianVal;
};

window.renderCi = function () {
    let area = $("ci-area"); area.style.display = "block";
    const build = (name, type) => {
        let d = YiData[name]; if (!d) return `<div class="ci-section"><div class="ci-title">${type === "ci-ben" ? '本卦' : '變卦'}：${name}</div>(資料庫未收錄)</div>`;
        let h = `<div class="ci-section"><div class="ci-title">${type === "ci-ben" ? '本卦' : '變卦'}：${name}</div><div class="ci-gua-text">${d.g}</div><div class="ci-xiang">${d.x}</div>`;
        for (let i = d.l.length - 1; i >= 0; i--) h += `<div class="ci-line-item">${d.l[i]}</div>`; return h + "</div>";
    };
    area.innerHTML = build(AppState.curData.ben.name, "ci-ben") + (AppState.curData.ben.name !== AppState.curData.bian.name ? build(AppState.curData.bian.name, "ci-bian") : "");
}

// ★ 新增：天干五行顏色判定 (支援藏山與一般納甲)
const getGanClass = (gan) => {
    if ("甲乙".includes(gan)) return "c-wood";
    if ("丙丁".includes(gan)) return "c-fire";
    if ("戊己".includes(gan)) return "c-earth";
    if ("庚辛".includes(gan)) return "c-gold";
    if ("壬癸".includes(gan)) return "c-water";
    return "";
};

// ==========================================
// ★★★ 表格與大表渲染 (啟用 2x2 網格與 Flex 水平鎖定) ★★★
// ==========================================
window.renderRes = function () {
    if (!AppState.curData || !AppState.curData.rows) return;

    // ====================================================
    // ★ 核心優化：載入歷史紀錄時，自動套用該盤的專屬繪圖開關
    // ====================================================
    if (AppState.curData.isDrawModeEnabled !== undefined) {
        AppState.isDrawModeEnabled = AppState.curData.isDrawModeEnabled;
    }

    // 1. 先取得目前「變爻顯示規則」的設定
    let showBianRule = AppState.curData.bianViewValue || "move";
    $("result-view").style.overflow = "visible";
    $("result-view").style.display = "block"; // 確保不是 flex，flex 容易讓 sticky 失效
    AppState.activeYaoIdx = -1;
    AppState.currentRelFilter = '全';
    //let filterBar = $("rel-filter-bar");
    //if (filterBar && typeof window.toggleRelation === 'function') {
    //    filterBar.style.display = "none";
    //    document.querySelectorAll('.seal-btn').forEach(btn => {
    //        btn.classList.toggle('active', btn.innerText === '全');
    //    });
    //}

    let relLinesGroup = $("rel-lines"); if (relLinesGroup) relLinesGroup.innerHTML = "";
    $("portal-view").style.display = "none"; $("result-view").style.display = "flex"; $("records-view").style.display = "none";

    let k1 = Zhi[(10 - AppState.curData.bazi.dG + AppState.curData.bazi.dZ) % 12], k2 = Zhi[(11 - AppState.curData.bazi.dG + AppState.curData.bazi.dZ) % 12];
    let hM = { 8: 2, 0: 2, 4: 2, 2: 8, 6: 8, 10: 8, 11: 5, 3: 5, 7: 5, 5: 11, 9: 11, 1: 11 }, fM = { 8: 9, 0: 9, 4: 9, 2: 3, 6: 3, 10: 3, 11: 0, 3: 0, 7: 0, 5: 6, 9: 6, 1: 6 }, gM = { 0: "丑未", 1: "子申", 2: "亥酉", 3: "亥酉", 4: "丑未", 5: "子申", 6: "丑未", 7: "午寅", 8: "卯巳", 9: "卯巳" };
    let rM = { 0: 3, 1: 4, 2: 6, 3: 7, 4: 6, 5: 7, 6: 9, 7: 10, 8: 0, 9: 1 };
    let ma = Zhi[hM[AppState.curData.bazi.dZ]], hua = Zhi[fM[AppState.curData.bazi.dZ]];
    let gui = gM[AppState.curData.bazi.dG], ren = Zhi[rM[AppState.curData.bazi.dG]];

    const cHTML = (txt) => {
        if (!txt) return "";
        let isZang = AppState.curData.najiaValue === "zang";
        return txt.split('').map((c, i) => {
            let cls = "";
            if (i === 1) cls = getElClass(c) + " zhi-char";
            else if (i === 0 && isZang) cls = getGanClass(c); // 天干顏色僅限藏山
            return `<span class="${cls}">${c}</span>`;
        }).join('');
    };

    const cEl = (txt) => { if (!txt) return ""; return txt.split('').map(c => `<span class="${getElClass(c)}">${c}</span>`).join(''); };
    const isMobileMode = window.matchMedia("(max-width: 768px) and (orientation: portrait)").matches;

    // ★ 專門給神煞用的上色工具 (不論幾個字，通通賦予五行顏色)
    const ssHTML = (txt) => {
        if (!txt) return "";
        return txt.split('').map(c => `<span class="${getElClass(c)}">${c}</span>`).join('');
    };
    // 用來組裝神煞直行的工具
    const buildSSCol = (title, valStr, isRed = false) => `
        <div style="display:flex; flex-direction:column; align-items:center; align-self:stretch;">
            <span style="font-size: clamp(0.75em, 3vw, 0.85em); color:#666; line-height:1.1; margin-bottom:2px; text-align:center;">${title}</span>
            <!-- ★ justify-content: flex-start 讓字元永遠向上對齊 -->
            <div style="font-weight:bold; font-size: clamp(1.05em, 4vw, 1.15em); ${isRed ? 'color:var(--red);' : ''} display:flex; flex-direction:column; justify-content:flex-start; align-items:center; gap:2px; flex:1; width:100%; min-height:40px; padding-top:2px;">
                ${ssHTML(valStr)}
            </div>
        </div>`;
    // ★ 智能 2x2 網格方塊產生器
    const buildGzBlock = (gzStr, statusHtml, id, isClickable) => {
        if (!gzStr) return "";
        let gan = gzStr.slice(0, 1), zhi = gzStr.slice(1, 2), wx = gzStr.slice(2);
        let colorCls = getElClass(gzStr);

        // ★ 嚴謹判斷：僅藏山納甲系統才替天干上五行顏色
        let isZang = AppState.curData.najiaValue === "zang";
        let ganCls = isZang ? getGanClass(gan) : "";

        let type = id.split('-')[1];

        let clickAttr = "";
        let cursorCss = "";
        if (isClickable && typeof window.toggleRelation === 'function') {
            clickAttr = `onclick="toggleRelation(${id.split('-')[2]}, '${type}')"`;
            cursorCss = "cursor:pointer;";
        }

        return `
        <div class="gz-block ${colorCls}" id="${id}" ${clickAttr} style="${cursorCss}">
            <span class="gz-zhi zhi-char">${zhi}</span>
            <span class="gz-gan ${ganCls}" style="font-weight:bold;">${gan}</span>
            <span class="gz-wx">${wx}</span>
            <div class="gz-tags">${statusHtml || ""}</div>
        </div>`;
    };

    // ★ 專屬伏神的網格方塊 (極致壓縮：天干與六親同列極小，地支五行與印章分列左右，利用 zoom 縮小印章)
    const buildFuBlock = (gzStr, relStr, statusHtml, id) => {
        if (!gzStr) return "";
        let gan = gzStr.slice(0, 1), zhi = gzStr.slice(1, 2), wx = gzStr.slice(2);
        let colorCls = getElClass(gzStr);
        let isZang = AppState.curData.najiaValue === "zang";
        let ganCls = isZang ? getGanClass(gan) : "";
        let clickAttr = "";
        let cursorCss = "cursor:default;";
        if (typeof window.toggleRelation === 'function') {
            clickAttr = `onclick="toggleRelation(${id.split('-')[2]}, 'fu')"`;
            cursorCss = "cursor:pointer;";
        }

        // ★ 空間變大，將基底字體調回 0.85em (原本是 0.75em)
        return `
        <div class="gz-block-fu" id="${id}" ${clickAttr} style="cursor:pointer; display:grid; grid-template-columns: auto 1fr; gap:2px 5px; align-items:center; margin-top:2px; font-size:0.85em; line-height:1;">
            <span class="${ganCls}" style="grid-column:1; grid-row:1; font-size:1em; font-weight:bold; text-align:center; color:${isZang ? '' : '#555'};">${gan}</span>
            <span style="grid-column:2; grid-row:1; font-size:0.85em; border:1px solid #999; border-radius:2px; padding:0 3px; color:#555; white-space:nowrap; width:fit-content;">${relStr.substr(0, 2)}</span>
            <div style="grid-column:1; grid-row:2; display:flex; flex-direction:column; align-items:center;">
                <span class="${colorCls} zhi-char" style="font-weight:bold; font-size:1.15em;">${zhi}</span>
                <span class="${colorCls}" style="font-size:0.95em; font-weight:bold; margin-top:2px;">${wx}</span>
            </div>
            <div class="gz-tags" style="grid-column:2; grid-row:2; display:flex; flex-direction:column; gap:0px; align-items:flex-start;">
                ${statusHtml || ""}
            </div>
        </div>`;
    };

    // ==========================================
    // ★ 準備頂部工具列 (複製 ➡️ 繪圖 ➡️ 重繪)
    // ==========================================
    let isDrawOn = (AppState.isDrawModeEnabled === true);
    let hasDrawModule = typeof window.pro_getAdvancedYaoInfo === 'function';
    let isRecord = (AppState.curRecIndex !== undefined && AppState.curRecIndex !== -1) || window.comesFromRecords === true;

    // 1. 複製按鈕
    //let copyBtnHtml = `<button onclick="copyResultAsText()" style="padding: 2px 8px; font-size: 0.85rem; background: #6c757d; color: #fff; border: none; border-radius: 4px; cursor: pointer; font-family: inherit; box-shadow: 0 1px 2px rgba(0,0,0,0.15);">📋 複製</button>`;
    let copyBtnHtml = '';

    // 2. 繪圖開關
    let drawBtnHtml = hasDrawModule ? `
    <button id="btn-toggle-draw" onclick="toggleDrawMode(!AppState.isDrawModeEnabled)" style="padding: 2px 8px; font-size: 0.85rem; border: none; border-radius: 4px; cursor: pointer; font-family: inherit; background: ${isDrawOn ? '#0d6efd' : '#6c757d'}; color: #fff; font-weight: bold; box-shadow: 0 1px 2px rgba(0,0,0,0.15); transition: background 0.2s; white-space: nowrap;">
        🖌️ 繪圖
    </button>` : '';

    // 3. 重繪按鈕 (★ 修正 1：只有在歷史紀錄模式中，才會產生這顆按鈕)
    let redrawBtnHtml = '';
    if (isRecord) {
        let isRedrawDisabled = !isDrawOn;
        let disabledAttr = isRedrawDisabled ? "disabled" : "";

        // ★ 修正 2：高級實體按鍵反灰質感 (淺灰底、灰字、無陰影)
        let disabledStyle = isRedrawDisabled
            ? "background: #e9ecef; color: #adb5bd; border: 1px solid #dee2e6; cursor: not-allowed; box-shadow: none;"
            : "background: #17a2b8; color: #fff; border: 1px solid #17a2b8; cursor: pointer; box-shadow: 0 1px 2px rgba(0,0,0,0.15); transition: all 0.2s;";

        redrawBtnHtml = `
        <button onclick="redrawAndSaveSnapshot()" ${disabledAttr} style="padding: 2px 8px; font-size: 0.85rem; border-radius: 4px; font-family: inherit; font-weight: bold; white-space: nowrap; ${disabledStyle}">
            🔄 重繪
        </button>`;
    }

    // 4. 打包工具列
    //let toolBarHtml = `
    //<span style="display:inline-flex; align-items:center; gap: 6px;">
    //    ${copyBtnHtml}
    //    ${drawBtnHtml}
    //    ${redrawBtnHtml}
    //</span>`;

    let toolBarHtml = `
    <span style="display:inline-flex; align-items:center; gap: 6px;">
        ${drawBtnHtml}
        ${redrawBtnHtml}
    </span>`;

    // ==========================================
    // ★ 產生排盤標頭 HTML (手機版與電腦版)
    // ==========================================
    let headerHTML = "";
    if (isMobileMode) {
        let prevTerm = AppState.curData.jieQiInfo ? `本節: ${AppState.curData.jieQiInfo.prev.name} ${fmtDate(AppState.curData.jieQiInfo.prev.date)}` : "";
        let nextTerm = AppState.curData.jieQiInfo ? `次節: ${AppState.curData.jieQiInfo.next.name} ${fmtDate(AppState.curData.jieQiInfo.next.date)}` : "";

        let southBadgeMobile = AppState.curData.isSouthAdjust ?
            `<div style="text-align:center; margin-bottom:4px;"><span style="background-color:#dc3545; color:#fff; font-size:0.8em; padding:2px 8px; border-radius:12px; box-shadow:0 1px 2px rgba(0,0,0,0.2);">🌏 已啟用南半球節氣對沖</span></div>` : "";

        headerHTML = `
        <div id="bazi-anchor" class="mobile-info-wrapper" style="scroll-margin-top: 65px; padding:5px 4px; background:#fff; border-bottom:1px solid #ddd; margin-bottom:4px;">
           
            <div style="font-weight:bold; text-align:center; font-size:1.05em; color:#333; margin-bottom:2px; display: flex; align-items: center; justify-content: center; gap: 8px; flex-wrap: wrap;">
                <span>${AppState.curData.dateStr} ${(AppState.curData.method || "預設手動起卦").slice(2)}</span>
                
                ${toolBarHtml}
            </div>
            
            ${southBadgeMobile}

            <div class="term-info" style="display:flex; align-items:center; justify-content:center; font-size:0.8em; color:#666; margin-bottom:6px; width:100%;">
                <div style="flex:1; text-align:right;">${prevTerm}</div>
                <div style="padding:0 6px; color:#ccc;">|</div>
                <div style="flex:1; text-align:left;">${nextTerm}</div>
            </div>
            
            <div style="display: flex; width: 100%; border-top: 1px dashed #eee; padding-top: 6px; align-items: stretch; margin-bottom: 2px;">
                <div style="flex: 1; display: flex; justify-content: space-around; border-right: 1px solid #ccc; min-width: 0; padding-right: 2px;">
                    ${(() => {
                let bzH = `<div style="display:flex; flex-direction:column; align-items:center;"><span style="font-size:0.75em; color:#666; margin-bottom:2px;">時</span><div style="font-weight:bold; font-size:1.35em; display:flex; flex-direction:column; line-height:1.2;">${cHTML(AppState.curData.bazi.H)}</div></div>`;
                let bzD = `<div style="display:flex; flex-direction:column; align-items:center; background:#fff9e6; border-radius:2px; padding:0 2px;" id="bz-d"><span style="font-size:0.75em; color:#666; margin-bottom:2px;">日</span><div style="font-weight:bold; font-size:1.35em; display:flex; flex-direction:column; line-height:1.2;">${cHTML(AppState.curData.bazi.D)}</div></div>`;
                let bzM = `<div style="display:flex; flex-direction:column; align-items:center;" id="bz-m"><span style="font-size:0.75em; color:#666; margin-bottom:2px;">月</span><div style="font-weight:bold; font-size:1.35em; display:flex; flex-direction:column; line-height:1.2;">${cHTML(AppState.curData.bazi.M)}</div></div>`;
                let bzY = `<div style="display:flex; flex-direction:column; align-items:center;" id="bz-y"><span style="font-size:0.75em; color:#666; margin-bottom:2px;">年</span><div style="font-weight:bold; font-size:1.35em; display:flex; flex-direction:column; line-height:1.2;">${cHTML(AppState.curData.bazi.Y)}</div></div>`;
                // ★ 抽象同構：動態決定陣列順序
                return (window.baziLayoutOrder === 'ltr') ? [bzY, bzM, bzD, bzH].join('') : [bzH, bzD, bzM, bzY].join('');
            })()}
                </div>

                <div style="flex: 1; display: flex; justify-content: space-around; min-width: 0; padding-left: 2px;">
                    ${buildSSCol('空<br>亡', k1 + k2, true)}
                    ${buildSSCol('驛<br>馬', ma)}
                    ${buildSSCol('桃<br>花', hua)}
                    ${buildSSCol('貴<br>人', gui)}
                    ${buildSSCol('羊<br>刃', ren)}
                </div>
            </div>
        </div>`;
    } else {
        let termStr = AppState.curData.jieQiInfo ? `<br><span style="font-size:0.9em; color:#666;">本節：${AppState.curData.jieQiInfo.prev.name} (${fmtDate(AppState.curData.jieQiInfo.prev.date)})<br>次節：${AppState.curData.jieQiInfo.next.name} (${fmtDate(AppState.curData.jieQiInfo.next.date)})</span>` : "";
        let najiaOpts = `<option value="standard" ${AppState.curData.najiaValue === 'standard' ? 'selected' : ''}>標準京房</option><option value="wu" ${AppState.curData.najiaValue === 'wu' ? 'selected' : ''}>乾自午起</option><option value="zang" ${AppState.curData.najiaValue === 'zang' ? 'selected' : ''}>藏山卜</option>`;
        let fushenOpts = `<option value="wang" ${AppState.curData.fushenValue === 'wang' ? 'selected' : ''}>卜筮正宗</option><option value="jing" ${AppState.curData.fushenValue === 'jing' ? 'selected' : ''}>京房易卦</option>`;
        let bianOpts = `<option value="move" ${AppState.curData.bianViewValue !== 'all' ? 'selected' : ''}>僅顯動爻</option><option value="all" ${AppState.curData.bianViewValue === 'all' ? 'selected' : ''}>全顯變爻</option>`;
        let southBadgeDesktop = AppState.curData.isSouthAdjust ? `<br><span style="display:inline-block; margin-top:4px; background-color:#dc3545; color:#fff; font-size:0.85em; padding:2px 6px; border-radius:4px;">🌏 啟用南半球節氣對沖</span>` : "";

        headerHTML = `
        <div id="bazi-anchor" style="display: flex; justify-content: space-between; align-items: stretch; width: 100%; border-bottom: 1px solid #ddd; padding-bottom: 8px; margin-bottom: 10px;">
            <div class="classic-info" style="flex: 1; padding-right: 15px; border-right: 1px dashed #eee;">
                性別：<span>${AppState.curData.gender}</span><br>西元 <span>${AppState.curData.dateStr}</span><br>
                <span style="color:var(--red); font-weight:bold; display: inline-flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                    ${(AppState.curData.method || "預設手動起卦").slice(2)}
                    
                    ${toolBarHtml}
                </span>
                
                ${southBadgeDesktop}<br>
                
                <span style="color:var(--green); font-size:0.9em;">${AppState.curData.solarNote}</span>${termStr}
            </div>
            
            <div class="right-header-group" style="flex: 2; display: flex; justify-content: center; align-items: center; gap: 35px; padding: 0 15px;">
                
                <div class="bazi-box" style="display: flex; gap: 15px;">
                    ${(() => {
                let deskBzH = `<div class="bazi-col" style="width: 38px; display: flex; flex-direction: column; align-items: center;"><div style="font-size: 1.1em; margin-bottom: 4px; color: #666;">時</div><div style="font-size: 1.5em; display: flex; flex-direction: column; line-height: 1.2; align-items: center; font-weight: bold; color: #333 !important;">${cHTML(AppState.curData.bazi.H)}</div></div>`;
                let deskBzD = `<div class="bazi-col" style="width: 38px; display: flex; flex-direction: column; align-items: center; background:#fff9e6; border-radius: 4px;"><div style="font-size: 1.1em; margin-bottom: 4px; color: #666;">日</div><div id="bz-d" style="font-size: 1.5em; display: flex; flex-direction: column; line-height: 1.2; align-items: center; font-weight: bold; color: #333 !important;">${cHTML(AppState.curData.bazi.D)}</div></div>`;
                let deskBzM = `<div class="bazi-col" style="width: 38px; display: flex; flex-direction: column; align-items: center;"><div style="font-size: 1.1em; margin-bottom: 4px; color: #666;">月</div><div id="bz-m" style="font-size: 1.5em; display: flex; flex-direction: column; line-height: 1.2; align-items: center; font-weight: bold; color: #333 !important;">${cHTML(AppState.curData.bazi.M)}</div></div>`;
                let deskBzY = `<div class="bazi-col" style="width: 38px; display: flex; flex-direction: column; align-items: center;"><div style="font-size: 1.1em; margin-bottom: 4px; color: #666;">年</div><div id="bz-y" style="font-size: 1.5em; display: flex; flex-direction: column; line-height: 1.2; align-items: center; font-weight: bold; color: #333 !important;">${cHTML(AppState.curData.bazi.Y)}</div></div>`;
                // ★ 抽象同構：動態決定陣列順序
                return (window.baziLayoutOrder === 'ltr') ? [deskBzY, deskBzM, deskBzD, deskBzH].join('') : [deskBzH, deskBzD, deskBzM, deskBzY].join('');
            })()}
                </div>

                <table class="ss-table" style="border-collapse: collapse;">
                    <tbody><tr>
                        <td style="padding: 0 10px; text-align: center; vertical-align: top;">
                            <div style="font-size: 1.1em; margin-bottom: 6px; display: flex; flex-direction: column; align-items: center; color: #666;"><span>空</span><span>亡</span></div>
                            <div style="font-size: 1.3em; display: flex; flex-direction: column; align-items: center; gap: 3px; font-weight: bold; color: #333 !important;"><span>${cEl(k1)}</span><span>${cEl(k2)}</span></div>
                        </td>
                        <td style="padding: 0 10px; text-align: center; vertical-align: top;">
                            <div style="font-size: 1.1em; margin-bottom: 6px; display: flex; flex-direction: column; align-items: center; color: #666;"><span>驛</span><span>馬</span></div>
                            <div style="font-size: 1.3em; display: flex; flex-direction: column; align-items: center; gap: 3px; font-weight: bold; color: #333 !important;"><span>${cEl(ma)}</span></div>
                        </td>
                        <td style="padding: 0 10px; text-align: center; vertical-align: top;">
                            <div style="font-size: 1.1em; margin-bottom: 6px; display: flex; flex-direction: column; align-items: center; color: #666;"><span>桃</span><span>花</span></div>
                            <div style="font-size: 1.3em; display: flex; flex-direction: column; align-items: center; gap: 3px; font-weight: bold; color: #333 !important;"><span>${cEl(hua)}</span></div>
                        </td>
                        <td style="padding: 0 10px; text-align: center; vertical-align: top;">
                            <div style="font-size: 1.1em; margin-bottom: 6px; display: flex; flex-direction: column; align-items: center; color: #666;"><span>貴</span><span>人</span></div>
                            <div style="font-size: 1.3em; display: flex; flex-direction: column; align-items: center; gap: 3px; font-weight: bold; color: #333 !important;">${gui.length > 1 ? `<span>${cEl(gui[0])}</span><span>${cEl(gui[1])}</span>` : `<span>${cEl(gui)}</span>`}</div>
                        </td>
                        <td style="padding: 0 10px; text-align: center; vertical-align: top;">
                            <div style="font-size: 1.1em; margin-bottom: 6px; display: flex; flex-direction: column; align-items: center; color: #666;"><span>羊</span><span>刃</span></div>
                            <div style="font-size: 1.3em; display: flex; flex-direction: column; align-items: center; gap: 3px; font-weight: bold; color: #333 !important;"><span>${cEl(ren)}</span></div>
                        </td>
                    </tr></tbody>
                </table>
            </div>

            <div style="flex: 1; display: flex; flex-direction: column; justify-content: center; gap: 8px; border-left: 1px dashed #eee; padding-left: 15px; font-size: 0.9em;">
                <div style="display:flex; align-items:center; justify-content:flex-end; gap:5px;">
                    <label style="color:#666; white-space:nowrap;">納甲:</label>
                    <select id="pc-res-set-najia" onchange="applyResultSettings('pc')" style="border:1px solid #ccc; border-radius:3px; padding:3px; width:100px;">${najiaOpts}</select>
                </div>
                <div style="display:flex; align-items:center; justify-content:flex-end; gap:5px;">
                    <label style="color:#666; white-space:nowrap;">伏神:</label>
                    <select id="pc-res-set-fushen" onchange="applyResultSettings('pc')" style="border:1px solid #ccc; border-radius:3px; padding:3px; width:100px;">${fushenOpts}</select>
                </div>
                <div style="display:flex; align-items:center; justify-content:flex-end; gap:5px;">
                    <label style="color:#666; white-space:nowrap;">變爻:</label>
                    <select id="pc-res-set-bian" onchange="applyResultSettings('pc')" style="border:1px solid #ccc; border-radius:3px; padding:3px; width:100px;">${bianOpts}</select>
                </div>
            </div>
        </div>`;
    }
    document.querySelector(".classic-header").innerHTML = headerHTML;

    // ★ 準備本卦與變卦的全新對稱分割 Header (包含幾世卦資訊與六合六沖)
    const getShiStr = (name, shi) => {
        if (shi === 6) return "八純卦";
        return ['', '一', '二', '三', '四', '五', '八純'][shi] + '世卦';
    };

    let isGuaChanged = AppState.curData.ben.name !== AppState.curData.bian.name;
    let benShiStr = getShiStr(AppState.curData.ben.name, AppState.curData.ben.shi);
    let bianShiStr = getShiStr(AppState.curData.bian.name, AppState.curData.bian.shi);

    // ★ 卦象屬性優先權：若同時具備六沖/合與遊/歸魂，合併顯示
    const formatGuaType = (name) => {
        let t = GuaTypes[name];
        if (!t) return `<div style="height:1.2em; margin-top:2px;"></div>`;
        // 將 "六沖 / 遊魂" 美化顯示
        return `<div style="color:var(--red); font-size:0.85em; font-weight:bold; margin-top:2px;">(${t})</div>`;
    };

    let benTypeStr = formatGuaType(AppState.curData.ben.name);
    let bianTypeStr = formatGuaType(AppState.curData.bian.name);

    // 全新的 Flex 對稱佈局 (極致壓縮 padding 與 margin)
    let headerFlex = "";
    if (isGuaChanged) {
        headerFlex = `
        <div style="display:flex; justify-content:center; align-items:center; width:100%; text-align:center; margin-bottom: 2px; background:#f8f9fa; padding:2px 0; border-radius:6px; border:1px solid #ddd; box-shadow:0 1px 3px rgba(0,0,0,0.05);">
            <div style="flex:1;">
                <div style="font-size:0.85em; color:#666; margin-bottom:2px; font-weight:bold;">${AppState.curData.ben.gong}宮 ${benShiStr}</div>
                <div style="font-size:1.35em; font-weight:bold; color:var(--blue-primary); letter-spacing:2px; line-height:1.1;">${AppState.curData.ben.name}</div>
                ${benTypeStr}
            </div>
            <div style="width:30px; color:var(--red); font-weight:bold; font-size:1.4em; opacity:0.8;">→</div>
            <div style="flex:1;">
                <div style="font-size:0.85em; color:#666; margin-bottom:2px; font-weight:bold;">${AppState.curData.bian.gong}宮 ${bianShiStr}</div>
                <div style="font-size:1.35em; font-weight:bold; color:var(--blue-primary); letter-spacing:2px; line-height:1.1;">${AppState.curData.bian.name}</div>
                ${bianTypeStr}
            </div>
        </div>`;
    } else {
        // 沒有變卦時，大字置中獨秀！
        headerFlex = `
        <div style="display:flex; justify-content:center; align-items:center; width:100%; text-align:center; margin-bottom: 4px; background:#f8f9fa; padding:4px 0; border-radius:6px; border:1px solid #ddd; box-shadow:0 1px 3px rgba(0,0,0,0.05);">
            <div style="flex:1;">
                <div style="font-size:0.85em; color:#666; margin-bottom:2px; font-weight:bold;">${AppState.curData.ben.gong}宮 ${benShiStr}</div>
                <div style="font-size:1.5em; font-weight:bold; color:var(--blue-primary); letter-spacing:4px; line-height:1.1;">${AppState.curData.ben.name}</div>
                ${benTypeStr}
            </div>
        </div>`;
    }
    $("res-gong-title").innerHTML = headerFlex;

    let html = "";
    if (isMobileMode) {
        // ★ 新增「伏親」欄位
        document.querySelector(".gua-table thead").innerHTML = `<tr><th>伏親</th><th>伏神</th><th>六獸</th><th>本卦</th><th>六親</th><th>干支</th><th>變親</th><th>干支</th></tr>`;
    } else {
        // ★ 電腦版也獨立抽出「伏親」
        document.querySelector(".gua-table thead").innerHTML = `<tr>
            <th width="8%">六獸</th>
            <th width="6%">伏親</th>
            <th width="12%">伏神</th>
            <th width="32%">【 本 卦 】(點干支看關係)</th>
            <th width="8%">動爻</th>
            <th width="34%">【 變 卦 】</th>
        </tr>`;
    }

    if (!showBianRule) { showBianRule = "move"; if ($("res-set-bian")) $("res-set-bian").value = "move"; }
    // 將目前的變爻顯示狀態，綁定在整個表格的外層
    document.querySelector(".gua-table").setAttribute("data-bian", showBianRule);

    // ==========================================
    // ★ 獨立精簡版：未開啟繪圖時的基礎三印章
    // ==========================================
    const generateBasicStamps = (targetGz) => {
        try {
            if (!targetGz) return "";
            let targetZ = Zhi.indexOf(targetGz.slice(1, 2));
            if (targetZ === -1) return "";

            let mZ = AppState.curData.bazi.mZ;
            let dZ = AppState.curData.bazi.dZ;
            let s = "";

            // 1. 空亡
            let dG = AppState.curData.bazi.dG;
            let k1 = (10 - dG + dZ) % 12; if (k1 < 0) k1 += 12;
            let k2 = (11 - dG + dZ) % 12; if (k2 < 0) k2 += 12;
            if (targetZ === k1 || targetZ === k2) {
                s += '<span class="mark-break">空亡</span>';
            }

            // 2. 月破
            if (Math.abs(targetZ - mZ) === 6) {
                s += `<span class="mark-break" style="background-color:#dc3545; box-shadow: 1px 1px 2px rgba(0,0,0,0.2);">月破</span>`;
            }

            // 3. 日沖 (嚴格限制只顯示「日沖」二字)
            if (Math.abs(targetZ - dZ) === 6) {
                s += `<span class="mark-break" style="background-color:#6f42c1; box-shadow: 1px 1px 2px rgba(0,0,0,0.2);">日沖</span>`;
            }
            return s;
        } catch (e) {
            console.error("基礎印章產生錯誤:", e);
            return "";
        }
    };

    // ★ 修正 1：在進入迴圈前，先取得目前「變爻顯示規則」的設定
    AppState.curData.rows.forEach((r, i) => {

        let showThisBian = isGuaChanged;
        if (showBianRule === "move" && (!r.move || r.move === "")) {
            showThisBian = false;
        }

        let isDrawOn = AppState.isDrawModeEnabled === true;
        let staticBianClass = (!r.move || r.move === "") ? "ly-static-bian" : "";

        // ★ 核心切換：開繪圖才讀取外掛印章 (r.status)，關繪圖一律自己算 (generateBasicStamps)
        let finalTgtStatus = isDrawOn ? (r.status || "") : generateBasicStamps(r.gz);
        let tgtHtml = buildGzBlock(r.gz, finalTgtStatus, `yao-tgt-${i}`, isDrawOn);

        let fuRelText = r.fuRel ? r.fuRel.substr(0, 2) : "";
        let fuHtml = "", fuHtmlDesk = "";

        // 處理伏神
        if (r.fuGz) {
            let finalFuStatus = isDrawOn ? (r.fuKp || "") : generateBasicStamps(r.fuGz);
            let fuBlock = buildGzBlock(r.fuGz, finalFuStatus, `yao-fu-${i}`, isDrawOn);
            if (isMobileMode) fuHtml = fuBlock;
            else fuHtmlDesk = fuBlock;
        }

        let barHtml = (r.bar === "solid") ? `<div class="yao-bar y-s"></div>` : `<div class="yao-bar y-b"><span></span><span></span></div>`;
        let syMark = r.shi ? `<div class="sy-mark">${r.shi}</div>` : `<div class="sy-mark" style="opacity:0;">無</div>`;
        let moveMark = r.move ? `<div class="move-mark">${r.move.includes("O") ? "○" : "×"}</div>` : `<div style="width:12px;"></div>`;

        let barHtmlDesk = (r.bar === "solid") ? `<div class="y-solid"></div>` : `<div class="y-broken"><span></span><span></span></div>`;
        let deskShi = r.shi ? `<span class="ly-core-badge ${r.shi === '世' ? 'badge-shi' : 'badge-ying'}">${r.shi}</span>` : `<span style="display:inline-block;width:29px;"></span>`;
        let deskMoveDisplay = r.move ? `<div class="desk-move-box"><span class="ly-core-badge ${r.move.includes("O") ? 'badge-old-yang' : 'badge-old-yin'}">${r.move.includes("O") ? "○" : "✕"}</span><div class="desk-long-arrow"></div></div>` : "";
        let bianGan = "", bianQin = "", bianContentHtml = "";

        if (showThisBian && r.bgz) {
            let finalBianStatus = isDrawOn ? (r.bstatus || "") : generateBasicStamps(r.bgz, false);
            let bBlock = buildGzBlock(r.bgz, finalBianStatus, `yao-src-${i}`, isDrawOn);
            if (isMobileMode) {
                bianGan = bBlock;
                bianQin = `<div style="font-size:0.9rem; font-weight:bold; margin-top:5px; color:#555;">${r.br}</div>`;
            }
            else {
                let bBarHtml = (r.bbar === "solid") ? `<div class="y-solid"></div>` : `<div class="y-broken"><span></span><span></span></div>`;
                let bShi = r.bShi ? `<span class="${r.bShi === '世' ? 'marker-shi' : 'marker-ying'}">${r.bShi}</span>` : "";
                bianContentHtml = `<div class="bian-container flex-center gap-10"><div class="yao-visual">${bBarHtml}</div>${bBlock}<span class="col-rel" style="font-size:1.05em; font-weight:bold; color:#333;">${r.br}</span>${bShi}</div>`;
            }
        }

        if (isMobileMode) {
            const verticalStyle = `style="writing-mode: vertical-rl; text-orientation: upright; font-size: 1.1rem !important; font-weight: bold; text-align: center; padding: 4px 2px; vertical-align: middle;"`;
            const verticalStyleGray = `style="writing-mode: vertical-rl; text-orientation: upright; font-size: 1.1rem !important; font-weight: bold; text-align: center; padding: 4px 2px; vertical-align: middle; color: #666;"`;

            // ★ 修正 3：改用 mobileMoveDisplay 變數名稱
            //let mobileMoveDisplay = r.move ? `<div class="move-mark" style="font-size: ${r.move.includes("O") ? 'inherit' : '1.15em'}; font-family: sans-serif;">${r.move.includes("O") ? "○" : "✕"}</div>` : `<div class="move-mark" style="opacity:0;">○</div>`;
            //let syDisplay = r.shi ? `<div class="sy-mark">${r.shi}</div>` : `<div class="sy-mark" style="opacity:0; border-color:transparent; background:transparent;">無</div>`;
            let mobileMoveDisplay = r.move ? `<div class="ly-core-badge ${r.move.includes("O") ? 'badge-old-yang' : 'badge-old-yin'}">${r.move.includes("O") ? "○" : "✕"}</div>` : `<div class="ly-core-badge" style="opacity:0;">○</div>`;
            let syDisplay = r.shi ? `<div class="ly-core-badge ${r.shi === '世' ? 'badge-shi' : 'badge-ying'}">${r.shi}</div>` : `<div class="ly-core-badge" style="opacity:0;">無</div>`;
            html += `<tr>
                <td class="col-rel" ${verticalStyleGray}>${fuRelText}</td>
                <td>${fuHtml}</td>
                <td class="beast-col" ${verticalStyle}>${r.bst}</td>
                <td>
                    <div class="ben-wrapper">
                        <div class="ben-line-row">${barHtml}</div>
                        <div class="ben-meta-row">${syDisplay}${mobileMoveDisplay}</div>
                    </div>
                </td>
                <td class="col-rel" ${verticalStyle}>${r.rel.substr(0, 2)}</td>
                <td>${tgtHtml}</td>
                
                <td class="col-rel ${staticBianClass}" ${verticalStyle}>${(showThisBian && r.bgz) ? r.br.substr(0, 2) : ''}</td>
                
                <td class="${staticBianClass}">${showThisBian ? bianGan : ''}</td>
            </tr>`;
        } else {
            html += `<tr>
                <td>${r.bst}</td>
                <td class="col-rel text-gray" style="font-size:0.9em; font-weight:bold;">${fuRelText}</td>
                <td class="col-fu">${fuHtmlDesk}</td>
                <td class="text-center">
                    <div class="desk-yao-row">
                        ${deskShi}<b class="col-rel">${r.rel}</b><div class="yao-visual">${barHtmlDesk}</div>${tgtHtml}
                    </div>
                </td>
                <td class="move-arrow">${deskMoveDisplay}</td>
                <td class="text-center ${staticBianClass}">${bianContentHtml}</td>
            </tr>`;
        }
    });
    $("gua-tbody").innerHTML = html;

    // 以下大表與三合局渲染維持不變
    let benGongStr = AppState.curData.ben.gong, bianGongStr = AppState.curData.bian.gong;
    let gongF = FiveEl.indexOf(GuaElMap[benGongStr]);
    let mZhiStr = Zhi[AppState.curData.bazi.mZ], mElStr = FiveEl[ZhiFiveMap[AppState.curData.bazi.mZ]];
    const wxOrder = { "木": ["木", "火", "土", "金", "水"], "火": ["火", "土", "金", "水", "木"], "土": ["土", "金", "水", "木", "火"], "金": ["金", "水", "木", "火", "土"], "水": ["水", "木", "火", "土", "金"] };
    let wxArr = wxOrder[mElStr];
    let lqArr = wxArr.map(el => getRel(gongF, FiveEl.indexOf(el)));

    let syArr = ["", "", "", "", ""];
    AppState.curData.rows.forEach(r => { if (r.shi) { let idx = wxArr.indexOf(r.gz.slice(-1)); if (idx > -1) syArr[idx] += r.shi; } });

    let dZhiIdx = AppState.curData.bazi.dZ, dZhiStr = Zhi[dZhiIdx], dElStr = FiveEl[ZhiFiveMap[dZhiIdx]];
    const phases = ["長生", "沐浴", "冠帶", "臨官", "帝旺", "衰", "病", "死", "墓庫", "絕", "胎", "養"];
    const phaseStart = { "木": 11, "火": 2, "土": 8, "金": 5, "水": 8 };
    let phaseArr = wxArr.map(el => phases[(dZhiIdx - phaseStart[el] + 12) % 12]);
    let dayInfoArrDisplay = ["-", "-", "-", "-", "-"];

    let bianArr = ["", "", "", "", ""];
    AppState.curData.rows.forEach(r => {
        if (r.move && r.bgz) {
            let el = r.gz.slice(-1);
            let phase = phases[(Zhi.indexOf(r.bgz.slice(1, 2)) - phaseStart[el] + 12) % 12];
            let idx = wxArr.indexOf(el);
            if (idx > -1) { if (bianArr[idx]) bianArr[idx] += "<br>"; bianArr[idx] += `化${phase}`; }
        }
    });

    let sanheRows = [];
    if (typeof window.pro_calcSanheTable === 'function') {
        sanheRows = window.pro_calcSanheTable(AppState.curData, cEl);
    } else {
        sanheRows.push(`<td colspan="4" rowspan="4" style="color:#999; text-align:center; vertical-align:middle; font-weight:normal; letter-spacing:2px;">無三合局 (進階功能)</td>`);
        sanheRows.push(""); sanheRows.push(""); sanheRows.push("");
    }

    let spOut = [], spIn = [];
    const fanYinGua = ["乾巽", "巽乾", "坤艮", "艮坤", "坎離", "離坎", "震兌", "兌震"];
    let isUpMove = AppState.curData.rows.slice(3, 6).some(r => r.move), isLowMove = AppState.curData.rows.slice(0, 3).some(r => r.move);
    if (isUpMove && fanYinGua.includes(TriNames[AppState.curData.ben.id >> 3] + TriNames[AppState.curData.bian.id >> 3])) spOut.push({ t: "反吟", info: "宮沖" });
    if (isLowMove && fanYinGua.includes(TriNames[AppState.curData.ben.id & 7] + TriNames[AppState.curData.bian.id & 7])) spIn.push({ t: "反吟", info: "宮沖" });

    let benZhi = AppState.curData.rows.map(r => r.gz.slice(1, 2)), bianZhi = AppState.curData.rows.map(r => r.bgz ? r.bgz.slice(1, 2) : "");
    if (isUpMove && benZhi[3] === bianZhi[3] && benZhi[4] === bianZhi[4] && benZhi[5] === bianZhi[5]) spOut.push({ t: "伏吟", info: "支同" });
    if (isLowMove && benZhi[0] === bianZhi[0] && benZhi[1] === bianZhi[1] && benZhi[2] === bianZhi[2]) spIn.push({ t: "伏吟", info: "支同" });

    let yaoFan = [], yaoFu = [], yaoNames = ['上', '五', '四', '三', '二', '初'];
    AppState.curData.rows.forEach((r, idx) => {
        if (r.move && r.bgz) {
            let z1 = Zhi.indexOf(benZhi[idx]), z2 = Zhi.indexOf(bianZhi[idx]);
            if (z1 === z2) yaoFu.push(yaoNames[5 - idx] + "爻");
            if (Math.abs(z1 - z2) === 6) yaoFan.push(yaoNames[5 - idx] + "爻");
        }
    });

    let spYaoText = "", spYaoType = "";
    if (yaoFu.length > 0) { spYaoType += "伏吟 "; spYaoText += yaoFu.join(","); }
    if (yaoFan.length > 0) { spYaoType += "反吟 "; spYaoText += yaoFan.join(","); }

    if (spOut.length === 0) spOut.push({ t: "-", info: "-" }); if (spIn.length === 0) spIn.push({ t: "-", info: "-" });
    if (spYaoType === "") { spYaoType = "-"; spYaoText = "-"; }
    while (spOut.length < 2) spOut.push({ t: "", info: "" }); while (spIn.length < 2) spIn.push({ t: "", info: "" });

    let syArrDisplay = syArr.map(s => s === "" ? "-" : `<span style="color:var(--red);">${s}</span>`);
    let bianArrDisplay = bianArr.map(b => b === "" ? "-" : `<span style="color:var(--blue-primary);">${b}</span>`);
    let dayPo = Zhi[(AppState.curData.bazi.dZ + 6) % 12], monthPo = Zhi[(AppState.curData.bazi.mZ + 6) % 12];

    let promptsHTML = `
    <details id="details-table" class="notes-section" style="margin-top: 10px; margin-bottom: 5px;" 
             ontoggle="window.AppState.isScoreDetailsOpen = this.open"> 
        <summary class="notes-summary">📊 綜合五行理氣大表 (點擊展開)</summary>
        <div style="overflow-x: auto; padding: 5px; background: #fff;">
        <style>
    .adv-table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 0.9rem; border: 2px solid #555; flex-shrink: 0; }
    .adv-table th, .adv-table td { border: 1px solid #999; padding: 6px 2px; text-align: center; vertical-align: middle; line-height: 1.3; }
    .adv-table th { background: #f0f0f0; color: #222; font-weight: bold; }
    .adv-table td { background: #fff; color: #000; font-weight: bold; }
    .adv-table .bg-light { background: #fafafa; font-weight: normal; color: #555; }
    
    /* ★ 新增：卦名專屬樣式，確保不換行 */
    .gua-name-cell { white-space: nowrap; font-size: 0.95em; }

    @media only screen and (max-width: 768px) and (orientation: portrait) { 
        .adv-table { font-size: 0.7rem; } 
        .adv-table th, .adv-table td { padding: 3px 1px; } 
        /* ★ 手機版：針對卦名極限縮小字體並壓縮字距，防止撐爆表格 */
        .gua-name-cell { font-size: 0.65rem; letter-spacing: -1px; }
    }
    </style>
            <table class="adv-table" style="margin-top: 0;">
                <tr><th rowspan="2">卦宮</th><th class="bg-light">本卦</th> <td class="gua-name-cell">${AppState.curData.ben.name}</td> <td><span style="color:var(--red);">${GuaTypes[AppState.curData.ben.name] || '-'}</span></td> <td>${benGongStr}宮</td> <td>${cEl(GuaElMap[benGongStr])}</td><th rowspan="4">三合</th>${sanheRows[0]}</tr>
                <tr><th class="bg-light">變卦</th> <td class="gua-name-cell">${AppState.curData.bian.name}</td> <td><span style="color:var(--red);">${GuaTypes[AppState.curData.bian.name] || '-'}</span></td> <td>${bianGongStr}宮</td> <td>${cEl(GuaElMap[bianGongStr])}</td>${sanheRows[1]}</tr>    
                <tr><th class="bg-light">月建</th> <th>旺</th> <th>相</th> <th>死</th> <th>囚</th> <th>休</th>${sanheRows[2]}</tr>
                <tr><th class="bg-light">${cEl(mZhiStr + mElStr)}</th> <td>${cEl(wxArr[0])}</td> <td>${cEl(wxArr[1])}</td> <td>${cEl(wxArr[2])}</td> <td>${cEl(wxArr[3])}</td> <td>${cEl(wxArr[4])}</td>${sanheRows[3]}</tr>
                <tr><th class="bg-light">六親</th> <td>${lqArr[0]}</td> <td>${lqArr[1]}</td> <td>${lqArr[2]}</td> <td>${lqArr[3]}</td> <td>${lqArr[4]}</td><th rowspan="5">特<br>殊<br>局<br>象</th><th rowspan="2" class="bg-light">外卦</th><td><span style="color:var(--red);">${spOut[0].t}</span></td> <td colspan="2">${spOut[0].info}</td></tr>
                <tr><th class="bg-light">世應</th> <td>${syArrDisplay[0]}</td> <td>${syArrDisplay[1]}</td> <td>${syArrDisplay[2]}</td> <td>${syArrDisplay[3]}</td> <td>${syArrDisplay[4]}</td><td><span style="color:var(--red);">${spOut[1].t}</span></td> <td colspan="2">${spOut[1].info}</td></tr>
                <tr><th class="bg-light">日辰</th> <td>${phaseArr[0]}</td> <td>${phaseArr[1]}</td> <td>${phaseArr[2]}</td> <td>${phaseArr[3]}</td> <td>${phaseArr[4]}</td><th rowspan="2" class="bg-light">內卦</th><td><span style="color:var(--red);">${spIn[0].t}</span></td> <td colspan="2">${spIn[0].info}</td></tr>
                <tr><th class="bg-light">${cEl(dZhiStr + dElStr)}</th> <td>${dayInfoArrDisplay[0]}</td> <td>${dayInfoArrDisplay[1]}</td> <td>${dayInfoArrDisplay[2]}</td> <td>${dayInfoArrDisplay[3]}</td> <td>${dayInfoArrDisplay[4]}</td><td><span style="color:var(--red);">${spIn[1].t}</span></td> <td colspan="2">${spIn[1].info}</td></tr>
                <tr><th class="bg-light">變爻</th> <td>${bianArrDisplay[0]}</td> <td>${bianArrDisplay[1]}</td> <td>${bianArrDisplay[2]}</td> <td>${bianArrDisplay[3]}</td> <td>${bianArrDisplay[4]}</td><th class="bg-light">爻位</th><td><span style="color:var(--red);">${spYaoType}</span></td> <td colspan="2">${spYaoText}</td></tr>
                <tr><th class="bg-light">神煞</th><td colspan="10" style="text-align:left; padding-left:15px; font-weight:bold;"><span style="margin-right:20px;">空亡：<b>${cEl(k1 + k2)}</b></span><span style="margin-right:20px;">日沖：<b>${cEl(dayPo)}</b></span><span>月破：<b>${cEl(monthPo)}</b></span></td></tr>
            </table>
        </div>
    </details>`;

    $("extra-prompts").innerHTML = promptsHTML;
    if (AppState.curData.showCi) renderCi(); else $("ci-area").style.display = "none";

    // 填寫欄位內容
    if ($("edit-subject")) $("edit-subject").value = AppState.curData.subject || ""; // ★ 補上這行，主旨就讀出來了！
    if ($("edit-judge")) $("edit-judge").value = AppState.curData.judge || "";
    if ($("edit-feedback")) $("edit-feedback").value = AppState.curData.feedback || "";
    if ($("edit-note")) $("edit-note").value = AppState.curData.note || "";
    // ★ 新增現況與加註填寫
    if ($("edit-current-status")) $("edit-current-status").value = AppState.curData.currentStatus || "";
    if ($("edit-copy-addon")) {
        let defaultAddonText = "請參照來源資料《六爻解卦標準流程》的步驟與規範詳細解卦，並以問卦日期前輟生成解卦結果檔案。";
        let addonVal = AppState.curData.copyAddon !== undefined ? AppState.curData.copyAddon : defaultAddonText;
        $("edit-copy-addon").value = addonVal;
        
        let cbAddon = $("cb-default-addon");
        if (cbAddon) {
            // 如果內容與預設文字相同，則勾選；否則取消勾選
            cbAddon.checked = (addonVal === defaultAddonText);
        }
    }
    // 讀取時一併還原專屬應期與萬年曆狀態
    if (AppState.curData.yingqi && typeof window.restoreYingqiSnapshot === 'function') {
        window.restoreYingqiSnapshot(AppState.curData.yingqi);
    } else if (typeof window.restoreYingqiSnapshot === 'function') {
        window.restoreYingqiSnapshot(null); // 新盤清空應期
    }

    // ★ 唯讀與按鈕顯示邏輯 (已修復：加入主旨，且新盤也預設上鎖)
    let isHistory = window.comesFromRecords || AppState.curRecIndex > -1;

    // ★ 1. 加入主旨、現況與加註
    let sEl = $("edit-subject"), jEl = $("edit-judge"), fEl = $("edit-feedback"), nEl = $("edit-note");
    let csEl = $("edit-current-status"), caEl = $("edit-copy-addon");
    let cbAddon = $("cb-default-addon"); // ★ 抓取 checkbox
    let eBtn = $("btn-edit-notes"), uBtn = $("btn-update-rec");

    let tablePanel = document.getElementById("details-table");
    let notesPanel = document.querySelector(".edit-area") ? document.querySelector(".edit-area").closest("details") : null;
    let isEditingNotes = uBtn && (uBtn.style.display === "inline-block" || uBtn.style.display === "block");

    // ★ 唯讀與按鈕顯示邏輯 (外框常駐與立體感美化版)
    if (!isEditingNotes) {
        [sEl, jEl, fEl, nEl, csEl, caEl].forEach(el => {
            if (el) {
                el.readOnly = true;
                el.style.backgroundColor = "transparent";
                el.style.color = "#555";
                el.style.border = "1px solid #e2e8f0";
                el.style.borderRadius = "4px";
                el.style.boxShadow = "none";
                el.style.padding = "6px 8px";
            }
        });
        if (cbAddon) cbAddon.disabled = true; // ★ 鎖定 checkbox
        if (eBtn) eBtn.style.display = "inline-block";
        if (uBtn) uBtn.style.display = "none";

        // ★ 核心變更：不再盲目寫死為 false，而是讀取使用者的記憶狀態！
        if (tablePanel) tablePanel.open = window.AppState.isScoreDetailsOpen;
        if (notesPanel) notesPanel.open = true;
    } else {
        // 解鎖狀態 (編輯中)
        [sEl, jEl, fEl, nEl, csEl, caEl].forEach(el => {
            if (el) {
                el.readOnly = false;
                el.style.backgroundColor = "#fff";
                el.style.color = "#000";
                el.style.border = "1px solid #80bdff";
                el.style.borderRadius = "4px";
                el.style.boxShadow = "0 0 0 0.2rem rgba(0,123,255,.25)";
                el.style.padding = "6px 8px";
            }
        });
        if (cbAddon) cbAddon.disabled = false; // ★ 解鎖 checkbox
        if (eBtn) eBtn.style.display = "none";
        if (uBtn) uBtn.style.display = isHistory ? "inline-block" : "none";

        // ★ 核心變更：解鎖編輯時，也依照記憶體狀態決定是否展開大表
        if (tablePanel) tablePanel.open = window.AppState.isScoreDetailsOpen;
        if (notesPanel) notesPanel.open = true;
    }

    // ★ 新增：回收桶預覽模式的「視覺隱藏防線」
    let topSaveBtn = document.querySelector('.nav-btn-save'); // 抓取上方的儲存按鈕

    if (AppState.curData && AppState.curData.isTrashPreview) {
        // 如果是回收桶預覽，把所有跟存檔、修改有關的按鈕全部藏起來
        if (topSaveBtn) topSaveBtn.style.display = "none";
        if (eBtn) eBtn.style.display = "none";
        if (uBtn) uBtn.style.display = "none";
    } else {
        // 恢復正常狀態下的顯示
        if (topSaveBtn) topSaveBtn.style.display = "inline-block";
    }

    if (typeof window.renderHistoryLog === 'function') {
        window.renderHistoryLog();
    }
    // ===================================================
    // ★ 工具列與畫布最尾端受控管理
    // ===================================================
    let filterBar = document.getElementById("rel-filter-bar");
    let svgCanvas = document.getElementById("rel-svg");

    if (AppState.isDrawModeEnabled) {
        if (filterBar) filterBar.style.display = "flex";
        if (svgCanvas) svgCanvas.style.display = "block";

        // 1. 如果有存過快照，就直接還原之前的樣貌
        if (AppState.curData.drawSnapshot && typeof window.restoreDrawSnapshot === 'function') {
            window.restoreDrawSnapshot();
        }
        // 2. ★ 核心升級：如果沒有快照，不再等待點擊，直接發動「全盤連線」並自動拍下初始快照！
        else {
            if (typeof window.drawRelations === 'function') {
                window.drawRelations('all', null);
                AppState.activeYaoIdx = 'all';
                if (typeof window.createDrawSnapshot === 'function') {
                    AppState.curData.drawSnapshot = window.createDrawSnapshot();
                    if (typeof window.silentAutoSaveRecord === 'function') window.silentAutoSaveRecord();
                }

                // ★ 新增：首次開啟繪圖，展示全盤 2.5 秒後自動切換到「無」
                if (window.showToast) window.showToast("✅ 繪圖模式已啟動，全盤解析完成！", 2500);
                setTimeout(() => {
                    if (AppState.isDrawModeEnabled && typeof window.setRelFilter === 'function') {
                        window.setRelFilter('無');
                    }
                }, 1200);

            } else {
                AppState.activeYaoIdx = -1;
            }
        }
    } else {
        if (filterBar) filterBar.style.display = "none";
        if (svgCanvas) {
            svgCanvas.style.display = "none";
            let relLines = document.getElementById("rel-lines");
            if (relLines) relLines.innerHTML = "";
        }
        AppState.activeYaoIdx = -1;

        // ★ 新增修復：重新起卦或未開啟繪圖時，徹底隱藏殘留的分數明細框與重置狀態
        AppState.scoreDetailOpen = false;
        let detailBox = document.getElementById("score-detail-box");
        if (detailBox) detailBox.style.display = "none";
    }

    // ==========================================
    // 大表渲染時，自動初始化並喚醒頂部「核心應期主控區」
    // ==========================================
    if (typeof window.initCoreHUDSelects === 'function') {
        window.initCoreHUDSelects(); // 灌入下拉選單字典
    }

    if (AppState.curData && AppState.curData.dateStr) {
        // 如果有存好的應期快照，優先使用應期；否則預設使用起卦時間
        let baseTimeStr = AppState.curData.yingqi?.date
            ? `${AppState.curData.yingqi.date} ${AppState.curData.yingqi.time || '12:00'}`
            : AppState.curData.dateStr;

        let baseDate = new Date(baseTimeStr.replace(/\//g, '-'));
        if (!isNaN(baseDate.getTime()) && typeof window.renderDateToCoreHUD === 'function') {
            window.renderDateToCoreHUD(baseDate); // 讓核心區浮現時間
        }
    }

    // ==========================================
    // ★ 依照使用者的五大規則還原應期面板的展開狀態
    // ==========================================
    if (typeof window.toggleCoreYingqiHud === 'function') {
        let wasOpen = AppState.curData.yingqi && AppState.curData.yingqi.isOpen;

        // ★ 放寬規則：不再綁定 isApplied，只要離開時是展開的，下次就維持展開
        if (wasOpen) {
            window.toggleCoreYingqiHud(true);
        } else {
            window.toggleCoreYingqiHud(false);
        }
    }
};

// 點擊「編輯」按鈕時觸發
window.enableNotesEdit = function (e) {
    if (e) e.preventDefault();

    // ★ 4. 加入 sEl (主旨)
    let sEl = $("edit-subject"), jEl = $("edit-judge"), fEl = $("edit-feedback"), nEl = $("edit-note");
    let csEl = $("edit-current-status"), caEl = $("edit-copy-addon");
    let cbAddon = $("cb-default-addon"); // ★ 抓取 checkbox

    [sEl, jEl, fEl, nEl, csEl, caEl].forEach(el => {
        if (el) {
            el.readOnly = false;
            el.style.backgroundColor = "#fff";
            el.style.color = "#000";
            el.style.borderColor = "#80bdff";
            el.style.boxShadow = "0 0 0 0.2rem rgba(0,123,255,.25)";
        }
    });
    if (cbAddon) cbAddon.disabled = false; // ★ 解鎖 checkbox
    // 切換按鈕
    if ($("btn-edit-notes")) $("btn-edit-notes").style.display = "none";

    let uBtn = $("btn-update-rec");
    if (uBtn) {
        // ★ 5. 確保剛排完的新盤，點了編輯也不會跑出更新按鈕
        uBtn.style.display = (window.comesFromRecords || AppState.curRecIndex >= 0) ? "inline-block" : "none";
    }

    // 將游標自動移到主旨
    if (sEl) sEl.focus();
    else if (jEl) jEl.focus();
};

// ★ 排盤結果轉換為純文字複製功能 (最終對齊與設定連動版)
window.copyResultAsText = function () {
    // ==========================================
    // ★ 複製前強制同步：抓取畫面上最新的輸入框內容
    // ==========================================
    if (window.AppState && window.AppState.curData) {
        let curSubject = document.getElementById("edit-subject")?.value;
        if (curSubject !== undefined) {
            window.AppState.curData.question = curSubject;
            window.AppState.curData.subject = curSubject;
        }

        let curJudge = document.getElementById("edit-judge")?.value;
        if (curJudge !== undefined) window.AppState.curData.judge = curJudge;

        let curFeedback = document.getElementById("edit-feedback")?.value;
        if (curFeedback !== undefined) window.AppState.curData.feedback = curFeedback;

        let curNote = document.getElementById("edit-note")?.value;
        if (curNote !== undefined) window.AppState.curData.note = curNote;

        let curStatus = document.getElementById("edit-current-status")?.value;
        if (curStatus !== undefined) window.AppState.curData.currentStatus = curStatus;

        let copyAddon = document.getElementById("edit-copy-addon")?.value;
        if (copyAddon !== undefined) window.AppState.curData.copyAddon = copyAddon;
    }

    let d = AppState.curData;
    if (!d || !d.lines) {
        if (window.showToast) window.showToast("⚠️ 沒有可複製的排盤資料！");
        return;
    }

    const padZW = (str, len) => {
        let s = str || "";
        while (s.length < len) s += " ";
        return s;
    };

    const ZhiList = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];
    let k1_idx = (10 - d.bazi.dG + d.bazi.dZ) % 12; if (k1_idx < 0) k1_idx += 12;
    let k2_idx = (11 - d.bazi.dG + d.bazi.dZ) % 12; if (k2_idx < 0) k2_idx += 12;
    let kongwang = ZhiList[k1_idx] + ZhiList[k2_idx];

    let lines = [];
    lines.push("【 ☯ 六爻排盤 ☯ 】");
    if (d.question) lines.push(`占問事項：${d.question}`);
    lines.push(`起卦時間：${d.dateStr} ${d.solarNote || ''}`);
    lines.push(`起卦方式：${(d.method || "").slice(2) || "手動起卦"}`);
    lines.push(`八字干支：${d.bazi.Y}年 ${d.bazi.M}月 ${d.bazi.D}日 ${d.bazi.H}時`);
    lines.push(`當日空亡：${kongwang}`);
    lines.push("");

    const getShiStr = (name, shi) => {
        if (shi === 6) return "八純卦";
        return ['', '一', '二', '三', '四', '五', '八純'][shi] + '世卦';
    };

    let isGuaChanged = d.ben.name !== d.bian.name;
    if (isGuaChanged) {
        lines.push(`【本卦】${d.ben.gong}宮 ${getShiStr(d.ben.name, d.ben.shi)}：${d.ben.name} → 【變卦】${d.bian.gong}宮 ${getShiStr(d.bian.name, d.bian.shi)}：${d.bian.name}`);
    } else {
        lines.push(`【本卦】${d.ben.gong}宮 ${getShiStr(d.ben.name, d.ben.shi)}：${d.ben.name}`);
    }
    lines.push("");

    lines.push("伏  神 六獸 【本  卦】     【變  卦】");

    // ★ 抓取目前的 UI 設定：僅顯動爻 (move) 或 全顯變爻 (all)
    let bianViewMode = document.getElementById('res-set-bian') ? document.getElementById('res-set-bian').value : "move";

    // ★ 核心修正：從 rows[0] (上爻) 往下印到 rows[5] (初爻)，確保不會頭下腳上！
    for (let i = 0; i <= 5; i++) {
        let r = d.rows[i];

        let fuStr = padZW(r.fuGz ? (r.fuRel.substr(0, 2) + r.fuGz) : "", 5);
        let bst = padZW(r.bst, 2);

        let shiStr = r.shi ? r.shi : " ";
        let relFull = r.rel || "";
        if (relFull.length <= 2 && r.gz) relFull += r.gz;
        let benStr = padZW(shiStr + relFull, 6);

        let yaoSym = (r.bar === "solid") ? "━━━" : "━ ━";
        let moveSym = r.move ? (r.move.includes("O") ? "○" : "✕") : " ";
        let centerStr = `${yaoSym} ${moveSym}`;

        // ★ 變卦顯示邏輯連動：若無變卦或選擇不顯示，就維持乾淨的空白
        let bianStr = "";
        if (isGuaChanged) {
            let shouldShowBian = (bianViewMode === "all" || r.move);
            if (shouldShowBian && r.bgz) {
                let bShiStr = r.bShi ? r.bShi : " ";
                let brFull = r.br || "";
                if (brFull.length <= 2 && r.bgz) brFull += r.bgz;
                bianStr = `→ ${bShiStr}${brFull}`;
            } else {
                bianStr = `       `; // 隱藏變卦時保持寬度
            }
        }

        lines.push(`${fuStr} ${bst} ${benStr} ${centerStr} ${bianStr}`);
    }
    lines.push("");
    lines.push("------------------------------");
    lines.push("");

    // ★ 根據文字內容決定是否加入複製內容 (有輸入文字才會顯示)
    if (d.copyAddon && d.copyAddon.trim()) lines.push(`【注意】\n${d.copyAddon.trim()}\n`);
    if (d.currentStatus && d.currentStatus.trim()) lines.push(`【現況說明】\n${d.currentStatus.trim()}\n`);
    if (d.judge && d.judge.trim()) lines.push(`【占斷結果】\n${d.judge.trim()}\n`);
    if (d.feedback && d.feedback.trim()) lines.push(`【事後回饋】\n${d.feedback.trim()}\n`);
    if (d.note && d.note.trim()) lines.push(`【備註】\n${d.note.trim()}\n`);

    let finalTxt = lines.join("\n").trim(); // 去除尾部多餘換行

    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(finalTxt).then(() => {
            if (window.showToast) window.showToast("📋 排盤結果已成功複製！");
        }).catch(err => {
            console.error("複製失敗", err);
            fallbackCopyTextToClipboard(finalTxt);
        });
    } else {
        fallbackCopyTextToClipboard(finalTxt);
    }
};

// 傳統剪貼簿降級方案
function fallbackCopyTextToClipboard(text) {
    let ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.top = "0";
    ta.style.left = "0";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    try {
        let successful = document.execCommand("copy");
        if (successful && window.showToast) {
            window.showToast("📋 排盤結果已成功複製！");
        } else if (window.showAlert) {
            window.showAlert("您的瀏覽器不支援自動複製，請手動圈選複製。");
        }
    } catch (err) {
        if (window.showAlert) window.showAlert("複製失敗，請手動複製。");
    }
    document.body.removeChild(ta);
}