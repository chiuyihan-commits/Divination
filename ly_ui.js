// ==========================================
// ★ 彈出視窗控制 (修復置中問題與新增取消功能)
// ==========================================
window.openTimeModal = function () {
    let modal = document.getElementById("time-modal");
    if (modal) {
        modal.style.display = "flex"; // ★ 關鍵：必須是 flex 才能完美置中！
        document.body.style.overflow = "hidden";
        history.pushState({ modal: 'time' }, null, document.URL);
    }
};

// 新增：不儲存直接關閉 (按紅色 X 觸發)
window.cancelTimeModal = function () {
    let modal = document.getElementById("time-modal");
    if (modal) {
        modal.style.display = "none";
        document.body.style.overflow = "";
        history.back(); // 退回一步歷史紀錄
    }
};

window.closeTimeModal = function (fromPopState = false) {
    let modal = document.getElementById("time-modal");
    if (modal) {
        modal.style.display = "none";
        document.body.style.overflow = ""; // 解除背景鎖定

        // 如果是用戶「點擊畫面上的按鈕」關閉的，我們手動幫他退回一步歷史紀錄
        if (!fromPopState) {
            history.back();
        }

        // ★ 解決問題一：觸發儲存並顯示 Toast
        if (window.showToast) {
            window.showToast("✅ 時間與地區已儲存並返回！");
        }
    }
};

// ==========================================
// ★ 儀式感動畫引擎
// ==========================================
// 全域控管搖晃監聽器，避免重複綁定或洩漏
window._activeMotionHandler = null;

function waitForShakeOrClick() {
    return new Promise(resolve => {
        $("shake-hint").style.display = "block";
        let resolved = false;

        const finish = () => {
            if (resolved) return; resolved = true;
            $("anim-overlay").removeEventListener('click', finish);
            if (window._activeMotionHandler) {
                window.removeEventListener('devicemotion', window._activeMotionHandler);
                window._activeMotionHandler = null;
            }
            $("shake-hint").style.display = "none";
            resolve();
        };

        $("anim-overlay").addEventListener('click', finish);

        let lastX, lastY, lastZ, shakeThreshold = 15;
        window._activeMotionHandler = (e) => {
            if (!animCfg.useShake) return;
            let acc = e.accelerationIncludingGravity; if (!acc) return;
            if (lastX !== undefined) {
                let delta = Math.abs(acc.x - lastX) + Math.abs(acc.y - lastY) + Math.abs(acc.z - lastZ);
                if (delta > shakeThreshold) finish();
            }
            lastX = acc.x; lastY = acc.y; lastZ = acc.z;
        };

        if (animCfg.useShake && typeof DeviceMotionEvent.requestPermission === 'function') {
            DeviceMotionEvent.requestPermission().then(state => {
                if (state === 'granted') window.addEventListener('devicemotion', window._activeMotionHandler);
            }).catch(console.error);
        } else if (animCfg.useShake) {
            window.addEventListener('devicemotion', window._activeMotionHandler);
        }
    });
}

// 播放單一畫面的非同步函數
async function playPhase(imgKey, defaultHtml, displaySeconds) {
    let base64Img = await localforage.getItem(imgKey);
    let imgEl = $("anim-img"), defEl = $("anim-default");

    if (base64Img) {
        imgEl.src = base64Img; imgEl.style.display = "block"; defEl.style.display = "none";
    } else {
        imgEl.style.display = "none"; defEl.innerHTML = defaultHtml; defEl.style.display = "block";
    }

    // 如果是等待階段 (時間設定為 0)，就卡住不往下走，交給外部 resolve
    if (displaySeconds > 0) {
        await new Promise(r => setTimeout(r, displaySeconds * 1000));
    }
}

// ★ 將結束判定獨立抽到外面，避免每次擲幣都重新宣告一次函式 (節省記憶體)
async function handleRitualEnd(result, nextHint, overlay, msgEl) {
    let endMsg = (AppState.currentCastStep < 5) ? "起爻完成" : "六爻已成，即將排盤";
    if (animCfg.endMode === 'click') {
        nextHint.innerHTML = `${endMsg}<br><span style='font-size:0.8em; opacity:0.8;'>請點擊畫面以繼續</span>`;
        nextHint.style.display = "block";
        await new Promise(r => {
            const endFn = () => { overlay.removeEventListener('click', endFn); r(); };
            overlay.addEventListener('click', endFn);
        });
    } else {
        nextHint.style.display = "block";
        let duration = animCfg.endTime * 1000;
        let startTime = Date.now();
        await new Promise(r => {
            let timer = setInterval(() => {
                let elapsed = Date.now() - startTime;
                let left = Math.max(0, duration - elapsed) / 1000;
                nextHint.innerHTML = `${endMsg}<br><span style='font-size:0.8em; opacity:0.8;'>請等待 ${left.toFixed(2)} 秒以繼續</span>`;
                if (left <= 0) { clearInterval(timer); r(); }
            }, 20);
            nextHint.innerHTML = `${endMsg}<br><span style='font-size:0.8em; opacity:0.8;'>請等待 ${animCfg.endTime.toFixed(2)} 秒以繼續</span>`;
        });
    }
    return result;
}

// ==========================================
// ★ 單一爻的完整動畫儀式 (極簡優化版)
// ==========================================
async function castRitualFlow(isFirst, yaoName) {
    await loadSettings();
    let overlay = $("anim-overlay");
    let nextHint = $("next-yao-hint");
    let msgEl = $("anim-msg");
    let shakeHint = $("shake-hint");

    overlay.style.display = "flex";
    nextHint.style.display = "none";
    shakeHint.style.display = "none";

    // 1. 增加「誠心思考」點擊啟動邏輯
    if (isFirst) {
        msgEl.innerText = "請誠心思考占卜事情......";
        shakeHint.innerText = "思考完畢後，點擊畫面開始擲幣";
        shakeHint.style.display = "block";
        await playPhase('img_prep', '<div class="anim-emoji">🙏</div>', 0);
        await new Promise(resolve => {
            const startCasting = () => { overlay.removeEventListener('click', startCasting); resolve(); };
            overlay.addEventListener('click', startCasting);
        });
        shakeHint.style.display = "none";
    }

    // 2. 等待搖晃或點擊
    msgEl.innerText = `正在起【${yaoName}】`;
    await playPhase('img_toss', '<div class="anim-emoji">🌗</div>', 0);
    shakeHint.innerText = animCfg.useShake ? "📳 請搖晃手機擲幣..." : "👆 點擊畫面擲幣...";
    shakeHint.style.display = "block";
    await waitForShakeOrClick();
    shakeHint.style.display = "none";

    // 3. ★ 提前計算這一次的卦象結果 (兩種模式共用)
    let outcomes = ["少陰", "少陽", "老陰", "老陽"];
    let result = outcomes[Math.floor(Math.random() * 4)];

    // 4. 根據模式播放「擲幣掉落過程」的動畫
    if (animCfg.tossMode === '3d') {
        let defaultFront = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100'><circle cx='50' cy='50' r='50' fill='%23f1c40f'/><text x='50' y='65' font-size='35' font-weight='bold' font-family='sans-serif' text-anchor='middle' fill='%23bba14f'>人</text></svg>";
        let defaultBack = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100'><circle cx='50' cy='50' r='50' fill='%23bdc3c7'/><text x='50' y='65' font-size='35' font-weight='bold' font-family='sans-serif' text-anchor='middle' fill='%237f8c8d'>字</text></svg>";
        let frontImg = await localforage.getItem('img_coin_front') || defaultFront;
        let backImg = await localforage.getItem('img_coin_back') || defaultBack;

        let coinsConfig = [];
        if (result === "老陽") coinsConfig = ['yang', 'yang', 'yang'];
        else if (result === "少陰") coinsConfig = ['yang', 'yang', 'yin'];
        else if (result === "少陽") coinsConfig = ['yang', 'yin', 'yin'];
        else if (result === "老陰") coinsConfig = ['yin', 'yin', 'yin'];
        coinsConfig.sort(() => Math.random() - 0.5);

        let coinHtml = `
        <div class="coin-scene">
            ${coinsConfig.map((face, i) => `
                <div class="coin-wrapper" style="animation: flip-${face} ${animCfg.tmToss}s cubic-bezier(0.2, 0.8, 0.3, 1) forwards; animation-delay: ${i * 0.15}s;">
                    <div class="coin-face coin-front" style="background-image: url('${frontImg}')"></div>
                    <div class="coin-face coin-back" style="background-image: url('${backImg}')"></div>
                </div>
            `).join('')}
        </div>`;

        $("anim-img").style.display = "none";
        $("anim-default").innerHTML = coinHtml;
        $("anim-default").style.display = "block";
        await new Promise(r => setTimeout(r, (animCfg.tmToss + 0.3) * 1000));

    } else {
        // 傳統影片/GIF模式
        await playPhase('img_toss', '<div class="anim-emoji" style="animation: spin 0.5s linear infinite;">🌗</div>', animCfg.tmToss);
    }

    // 5. ★ 播放結束，顯示最終印章結果 (兩種模式共用)
    let classMap = { "少陽": "seal-sy", "老陽": "seal-oy", "少陰": "seal-sn", "老陰": "seal-on" };
    let sealHtml = `<div class="yin-seal ${classMap[result]}" style="font-size: 3.5rem; padding: 15px 30px; border-radius: 10px;">${result.slice(0, 2)}</div>`;

    msgEl.innerText = "";
    await playPhase(`img_${classMap[result].split('-')[1]}`, sealHtml, animCfg.tmSy);

    // 6. 等待使用者點擊或倒數結束，並回傳結果
    return await handleRitualEnd(result, nextHint, overlay, msgEl);
}

// ★ 手動單爻起卦控制
async function castSingleYao(idx) {
    if (idx !== AppState.currentCastStep) {
        showAlert(AppState.currentCastStep === 0 ? "請從第一爻 (初爻) 擲起！" : `請先擲第 ${AppState.currentCastStep + 1} 爻！`);
        return;
    }

    let yaoNames = ['初爻', '二爻', '三爻', '四爻', '五爻', '上爻'];
    let result = await castRitualFlow(idx === 0, yaoNames[idx]);

    // 填入資料並更新印章
    $(`yao-sel-${idx}`).value = result;
    updateYaoSeal(idx);

    $("anim-overlay").style.display = "none";
    AppState.currentCastStep++;

    if (AppState.currentCastStep < 6) {
        //showToast(`【${result}】起爻完成！請接著擲下一爻。`);
    } else {
        AppState.currentCastStep = 0; // 重置
        // 觸發原本的畫盤流程
        startManual(); // 假設 startManual 是您原本畫盤的函數
    }
}

// ★ 電腦自動起卦控制 (連續 6 次)
async function startAutoWithAnim() {
    let yaoNames = ['初爻', '二爻', '三爻', '四爻', '五爻', '上爻'];
    for (let i = 0; i < 6; i++) {
        let result = await castRitualFlow(i === 0, yaoNames[i]);
        $(`yao-sel-${i}`).value = result;
        updateYaoSeal(i);
    }
    $("anim-overlay").style.display = "none";
    AppState.currentCastStep = 0; // 重置
    // 觸發原本的畫盤流程
    startManual();
}

// 同步更新陰刻印章與棒棒圖
function updateYaoSeal(idx) {
    let val = $(`yao-sel-${idx}`).value;
    let seal = $(`yao-seal-${idx}`);

    seal.className = "yin-seal"; // 重置 Class
    if (val) {
        seal.innerText = val.slice(0, 2); // 取 "少陽" 等前兩字
        seal.style.display = "inline-block";

        // 加入專屬顏色 Class
        if (val === "少陽") seal.classList.add("seal-sy");
        else if (val === "少陰") seal.classList.add("seal-sn");
        else if (val === "老陽") seal.classList.add("seal-oy");
        else if (val === "老陰") seal.classList.add("seal-on");
    } else {
        seal.style.display = "none";
    }
}

function initTimeSelects() {
    let d = new Date(), yOpt = "";
    for (let i = 1900; i <= 2100; i++) yOpt += `<option value="${i}" ${i === d.getFullYear() ? 'selected' : ''}>西元${i}年 (民國${i - 1911}年)</option>`;
    $("ts-year").innerHTML = yOpt;
    let mOpt = ""; for (let i = 1; i <= 12; i++) mOpt += `<option value="${i - 1}" ${i === d.getMonth() + 1 ? 'selected' : ''}>${i}</option>`; $("ts-month").innerHTML = mOpt;
    let dOpt = ""; for (let i = 1; i <= 31; i++) dOpt += `<option value="${i}" ${i === d.getDate() ? 'selected' : ''}>${i}</option>`; $("ts-day").innerHTML = dOpt;
    let hOpt = ""; for (let i = 0; i <= 23; i++) hOpt += `<option value="${i}" ${i === d.getHours() ? 'selected' : ''}>${i}</option>`; $("ts-hour").innerHTML = hOpt;
    let minOpt = ""; for (let i = 0; i <= 59; i++) minOpt += `<option value="${i}" ${i === d.getMinutes() ? 'selected' : ''}>${i}</option>`; $("ts-minute").innerHTML = minOpt;
}

function initGanzhiSelects() {
    let ganOpt = Gan.map((g, i) => `<option value="${i}">${g}</option>`).join("");
    let zhiOpt = Zhi.map((z, i) => `<option value="${i}">${z}</option>`).join("");
    ["gz-y", "gz-m", "gz-d", "gz-h"].forEach(prefix => {
        // ★ 換成原生 document.getElementById 保證絕對抓得到
        let gEl = document.getElementById(prefix + "-gan");
        let zEl = document.getElementById(prefix + "-zhi");
        if (gEl) gEl.innerHTML = ganOpt;
        if (zEl) zEl.innerHTML = zhiOpt;
    });
}

function toggleDatePanel() {
    let cb = document.getElementById("enable-date-setting");
    let panel = document.getElementById("date-setting-panel");
    if (cb && panel) {
        panel.style.display = cb.checked ? "block" : "none";
    }
}

function setMode(mode) {
    AppState.isTrueMode = mode;
    $("sw-true").className = mode ? "switch-btn switch-active" : "switch-btn switch-inactive";
    $("sw-false").className = !mode ? "switch-btn switch-active" : "switch-btn switch-inactive";
    $("mode-true").style.display = mode ? "block" : "none";
    $("mode-false").style.display = !mode ? "block" : "none";
}

function autoLocateAndTime() {
    let d = new Date();
    $("ts-year").value = d.getFullYear(); $("ts-month").value = d.getMonth(); $("ts-day").value = d.getDate();
    $("ts-hour").value = d.getHours(); $("ts-minute").value = d.getMinutes();
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((p) => {
            $("ts-lon").value = p.coords.longitude.toFixed(4);
            $("ts-lat").value = p.coords.latitude.toFixed(4);
            $("ts-alt").value = p.coords.altitude ? p.coords.altitude.toFixed(0) : 0;
            let offset = Math.round(p.coords.longitude / 15) * 60; $("ts-zone").value = offset;
            showToast("已填入現在時間與定位資訊！");
        }, (e) => { showAlert("定位失敗，僅填入時間。"); });
    } else { showAlert("瀏覽器不支援定位，僅填入時間。"); }
}

// ==========================================
// ★ 手動選擇縣市邏輯 (加入狀態同步)
// ==========================================
window.setCityLoc = function () {
    let sel = document.getElementById("city-select");
    if (sel && sel.value && sel.value !== "other" && sel.value !== "api_temp") {
        let parts = sel.value.split(',');
        if (parts.length === 2) {
            document.getElementById("ts-lon").value = parts[0];
            document.getElementById("ts-lat").value = parts[1];
            document.getElementById("ts-zone").value = -480; // 台灣預設時差
            document.getElementById("ts-alt").value = 0;

            // ★ 手動選擇後，立刻連動更新常駐狀態！
            let cityName = sel.options[sel.selectedIndex].text.replace("📍 ", "");
            window.syncStatusMsg("🕒 定時成功", `📍 手動定位：${cityName}`);
        }
    } else if (sel && sel.value === "other") {
        window.syncStatusMsg("🕒 定時成功", "🌍 海外地區 (請手動輸入座標)");
    }
};

function autoGanzhi() {
    let d = new Date(); let b = getBazi(d);
    const setGZ = (prefix, ganStr, zhiStr) => {
        $(prefix + "-gan").value = Gan.indexOf(ganStr);
        $(prefix + "-zhi").value = Zhi.indexOf(zhiStr);
    };
    setGZ("gz-y", b.Y[0], b.Y[1]); setGZ("gz-m", b.M[0], b.M[1]); setGZ("gz-d", b.D[0], b.D[1]); setGZ("gz-h", b.H[0], b.H[1]);
    showToast("已自動填入目前時間的八字干支！");
}

// ==========================================
// 防止手機滑動時網址列縮放觸發 resize，導致畫線消失
// ==========================================
let lastWinWidth = window.innerWidth;
window.addEventListener('resize', function () {
    if (document.getElementById("result-view").style.display === "flex") {

        // ★ 核心魔法：只判斷「寬度」有沒有變！
        if (window.innerWidth !== lastWinWidth) {
            lastWinWidth = window.innerWidth;
            if (typeof renderRes === 'function') renderRes(); // 只有手機轉向、或電腦拉視窗，才重繪
        }
        else {
            // 如果寬度沒變（只是上下滑動），我們只「重新校準線條位置」，絕對不重繪！
            if (AppState.activeYaoIdx !== -1 && typeof window.drawRelations === 'function') {
                let parts = AppState.activeYaoIdx.split('_');
                window.drawRelations(parseInt(parts[1]), parts[0]);
            }
        }
    }
});

// ==========================================
// ★ 複製 Google Apps Script 教學與程式碼
// ==========================================
const gasCodeString = `function doPost(e) {
  try {
    var payload = JSON.parse(e.postData.contents);
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Backup") || SpreadsheetApp.getActiveSpreadsheet().insertSheet("Backup");
    if (payload.action === 'upload') {
      sheet.getRange("A1").setValue(JSON.stringify(payload.data));
      return ContentService.createTextOutput(JSON.stringify({success: true, message: "備份成功"})).setMimeType(ContentService.MimeType.JSON);
    }
  } catch(err) {
    return ContentService.createTextOutput(JSON.stringify({success: false, error: err.message})).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  try {
    if (e.parameter.action === 'download') {
      var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Backup");
      if(!sheet) throw new Error("尚未備份過資料");
      var dataStr = sheet.getRange("A1").getValue();
      if(!dataStr) throw new Error("無備份資料");
      return ContentService.createTextOutput(JSON.stringify({success: true, data: JSON.parse(dataStr)})).setMimeType(ContentService.MimeType.JSON);
    }
  } catch(err) {
    return ContentService.createTextOutput(JSON.stringify({success: false, error: err.message})).setMimeType(ContentService.MimeType.JSON);
  }
}`;

window.copyGasCode = function () {
    navigator.clipboard.writeText(gasCodeString).then(() => {
        if (window.showToast) window.showToast("✅ 程式碼已複製！請前往 Apps Script 貼上");
    }).catch(err => {
        if (window.showAlert) window.showAlert("複製失敗，請手動選取複製。");
    });
};

window.copyGasTutorial = function () {
    const tutorialText = `🎁 如何為六爻排盤APP打造專屬 Google 雲端資料庫：\n\n1️⃣ 開啟一個全新的 Google 試算表，點擊上方選單 [擴充功能] -> [Apps Script]。\n2️⃣ 將編輯器內的程式碼清空，並貼上以下程式碼：\n\n${gasCodeString}\n\n3️⃣ 點擊右上角 [部署] -> [新增部署作業] -> 類型選擇 [網頁應用程式]。將存取權限設為 [所有人]。\n4️⃣ 部署後，複製那串 [Web App URL]，貼回 APP 的自訂連線框中即可無縫串接！`;

    navigator.clipboard.writeText(tutorialText).then(() => {
        if (window.showToast) window.showToast("✅ 完整教學已複製！可以貼到 Line 或筆記本中");
    });
};

// ==========================================
// ★ 清空首頁起卦面板狀態
// ==========================================
function resetManualUI() {
    for (let i = 0; i < 6; i++) {
        let sel = document.getElementById("yao-sel-" + i);
        let seal = document.getElementById("yao-seal-" + i);

        // 1. 清空下拉選單
        if (sel) sel.value = "";

        // 2. 隱藏並清空印章
        if (seal) {
            seal.className = "yin-seal"; // 移除顏色特效 class
            seal.style.display = "none";
            seal.innerText = "";
        }
    }

    // 3. 清空占卜問題欄位
    let qInput = document.getElementById("p-question");
    if (qInput) qInput.value = "";

    // 4. 把起爻進度歸零
    if (window.AppState) {
        window.AppState.currentCastStep = 0;
    }
}

// ==========================================
// ★ 全域 UI 變數與工具 (Toast / Confirm)
// ==========================================
window.hasUnsavedChanges = false;
window.comesFromRecords = false;

window.showToast = (msg) => {
    const toast = document.createElement("div");
    toast.className = "toast-msg";
    toast.innerText = msg;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2500);
};

// ==========================================
// ★ 系統設定快照與防誤觸路由引擎
// ==========================================
let settingsSnapshot = "";
let isSettingsPopstate = false; // 紀錄是否為「手機實體返回鍵」觸發

// 1. 建立快照：蒐集設定視窗內所有輸入框當下的值
function getSettingsSnapshot() {
    let state = {};
    document.querySelectorAll('#settings-modal input, #settings-modal select, #settings-modal textarea').forEach(el => {
        if (el.type === 'checkbox' || el.type === 'radio') {
            state[el.id || el.name + el.value] = el.checked;
        } else {
            state[el.id] = el.value;
        }
    });
    return JSON.stringify(state);
}

// 2. 開啟設定視窗 (擷取最初快照)
window.openSettings = function () {
    let modal = document.getElementById("settings-modal");
    if (modal) {
        // ★ UX 優化：打開設定視窗時，將裡面的所有 details (摺疊面板) 強制收合，保持畫面乾淨
        document.querySelectorAll('#settings-modal details').forEach(d => d.open = false);

        modal.style.display = "flex";
        document.body.style.overflow = "hidden";

        // ★ 核心：打開瞬間拍下「字串快照」，這樣關閉時才能準確比對有沒有被修改
        if (typeof getSettingsSnapshotObj === 'function') {
            settingsSnapshot = JSON.stringify(getSettingsSnapshotObj());
        }

        history.pushState({ modal: 'settings' }, null, document.URL);
    }
};

// ★ 設定項目翻譯字典
const settingsDictionary = {
    "set-south-adjust": "南半球節氣對沖",
    "toss-modevideo": "擲幣模式 (傳統)",
    "toss-mode3d": "擲幣模式 (3D)",
    "set-shake": "搖晃手機擲幣",
    "anim-endmanual": "擲幣結束條件 (手動)",
    "anim-endauto": "擲幣結束條件 (自動)",
    "set-end-time": "自動結束等待時間",
    "img-tm-prep": "準備動畫時間",
    "img-tm-toss": "擲幣動畫時間",
    "img-tm-sy": "少陽動畫時間",
    "img-tm-oy": "老陽動畫時間",
    "img-tm-sn": "少陰動畫時間",
    "img-tm-on": "老陰動畫時間"
};

// 為了比對，我們需要回傳物件而不是字串
function getSettingsSnapshotObj() {
    let state = {};
    document.querySelectorAll('#settings-modal input, #settings-modal select, #settings-modal textarea').forEach(el => {
        let key = el.id || (el.name + el.value);
        if (el.type === 'checkbox' || el.type === 'radio') {
            state[key] = el.checked;
        } else {
            state[key] = el.value;
        }
    });
    return state;
}

// 2. 請求關閉設定視窗 (啟動變更偵測引擎)
window.requestCloseSettings = function (fromPopstate = false) {
    window.isSettingsPopstate = fromPopstate; // 記錄是否是從手機實體返回鍵觸發

    let currentState = getSettingsSnapshotObj();
    let oldState = JSON.parse(settingsSnapshot); // 把打開時的字串轉回物件

    let changedItems = [];

    // ★ 核心比對引擎：揪出不一樣的項目
    for (let key in currentState) {
        if (currentState[key] !== oldState[key]) {
            // 從字典找名字，如果找不到就顯示"進階參數"
            changedItems.push(window.settingsDictionary ? (window.settingsDictionary[key] || "自訂進階參數") : "自訂進階參數");
        }
    }

    // 過濾重複的名稱 (例如切換 radio 會同時觸發兩個變更)
    changedItems = [...new Set(changedItems)];

    if (changedItems.length === 0) {
        // 完全沒變動，直接安心關閉
        if (typeof executeSettingsClose === 'function') executeSettingsClose(false);
        if (window.showToast) window.showToast("設定無變動，已返回首頁");
    } else {
        // 偵測到變更，把清單印出來警告使用者！
        let diffMsgBox = document.getElementById("settings-diff-msg");
        if (diffMsgBox) {
            diffMsgBox.innerHTML = `📝 <b>您變更了：</b><br>${changedItems.join("、")}`;
        }

        let confirmModal = document.getElementById("settings-confirm-modal");
        if (confirmModal) confirmModal.style.display = "flex";
    }
};

// 4. 底層強制關閉與歷史路由處理
function executeSettingsClose(doSave) {
    document.getElementById("settings-modal").style.display = "none";
    let confirmModal = document.getElementById("settings-confirm-modal");
    if (confirmModal) confirmModal.style.display = "none";

    document.body.style.overflow = "";

    if (doSave && typeof window.saveSettings === 'function') {
        window.saveSettings();
    }

    if (!isSettingsPopstate) {
        history.back(); // 若不是實體返回鍵觸發，主動退回歷史紀錄
    }
}

// 時光機：將快照的狀態反向覆寫回畫面
function restoreSettingsFromSnapshot(snapshotStr) {
    if (!snapshotStr) return;
    let state = JSON.parse(snapshotStr);
    document.querySelectorAll('#settings-modal input, #settings-modal select, #settings-modal textarea').forEach(el => {
        let key = el.id || el.name + el.value;
        if (state.hasOwnProperty(key)) {
            if (el.type === 'checkbox' || el.type === 'radio') {
                el.checked = state[key];
            } else {
                el.value = state[key];
            }
        }
    });
}

// 5. 三種選項的按鈕觸發事件
window.confirmDiscardSettings = async function () {
    // 1. 關閉設定視窗
    let modal = document.getElementById("settings-modal"); // 請確認你的視窗 ID 叫什麼
    if (modal) modal.style.display = "none";

    // ★ 核心修復：強制重新從資料庫 (IndexedDB) 讀取最後一次的正確設定，
    // 並覆蓋掉畫面上被使用者亂改的輸入框數值！
    if (typeof loadSettings === 'function') {
        await loadSettings();
    }
};

window.confirmSaveSettings = function () {
    executeSettingsClose(true);
    window.showToast("💾 設定已儲存，返回首頁");
};

window.confirmContinueSettings = function () {
    let confirmModal = document.getElementById("settings-confirm-modal");
    if (confirmModal) confirmModal.style.display = "none";

    window.showToast("請繼續編輯");

    // 路由魔法：如果剛才是按手機返回鍵退出的，補回紀錄讓使用者能繼續編輯
    if (isSettingsPopstate) {
        history.pushState({ modal: 'settings' }, null, document.URL);
    }
};

// ==========================================
// ★ 攔截手機實體返回鍵 (單一核心防護網)
// ==========================================
history.pushState(null, null, document.URL); // 啟動時推入根狀態

window.addEventListener('popstate', function (e) {
    // 攔截 1：系統設定視窗
    let settingsModal = document.getElementById("settings-modal");
    if (settingsModal && settingsModal.style.display !== "none") {
        window.requestCloseSettings(true); // 傳入 true 代表是 popstate 觸發的
        return;
    }

    // 攔截 2：自訂時位視窗
    let timeModal = document.getElementById("time-modal");
    if (timeModal && timeModal.style.display !== "none") {
        if (typeof window.cancelTimeModal === 'function') {
            window.cancelTimeModal(); // 直接呼叫我們剛寫的不儲存關閉功能
        } else {
            timeModal.style.display = "none";
            document.body.style.overflow = "";
        }
        return;
    }

    // 攔截 3：從首頁的其他畫面返回
    if (document.getElementById("portal-view") && document.getElementById("portal-view").style.display === "none") {
        history.pushState(null, null, document.URL); // 擋住退出 APP
        window.goBackPortal();
    }
});

// ==========================================
// ★ 返回首頁邏輯 (自動還原列表與清空記憶)
// ==========================================
window.goBackPortal = async function () {
    let editOverlay = document.getElementById("smart-edit-overlay");
    if (editOverlay) {
        let btnCancel = document.getElementById("smart-btn-cancel");
        if (btnCancel) { btnCancel.click(); return; }
    }

    let resultView = document.getElementById("result-view");
    if (resultView && (resultView.style.display === "flex" || resultView.style.display === "block")) {
        if (window.hasUnsavedChanges) {
            let ok = await window.showConfirm("⚠️ 尚未儲存卦象，確定離開嗎？\n未儲存卦象將會遺失！");
            if (!ok) return;
            window.hasUnsavedChanges = false;
        }

        resultView.style.display = "none";

        if (window.AppState) {
            window.AppState.curData = null;
            window.AppState.curRecIndex = -1;
            window.AppState.activeYaoIdx = -1;
        }

        if (window.comesFromRecords) {
            window.comesFromRecords = false;
            if (typeof showRecords === 'function') showRecords(true);
        } else {
            document.getElementById("portal-view").style.display = "block";
        }
    }
    else if (document.getElementById("records-view") && (document.getElementById("records-view").style.display === "block" || document.getElementById("records-view").style.display === "flex")) {
        document.getElementById("records-view").style.display = "none";
        document.getElementById("portal-view").style.display = "block";
        window.lastRecScroll = 0;
    }

    let subjectInput = document.getElementById("p-question");
    if (subjectInput) subjectInput.value = "";

    // 每次返回首頁，重新校正時間到當下
    let d = new Date();
    let yearEl = document.getElementById("ts-year");
    if (yearEl) {
        yearEl.value = d.getFullYear();
        document.getElementById("ts-month").value = d.getMonth();
        document.getElementById("ts-day").value = d.getDate();
        document.getElementById("ts-hour").value = d.getHours();
        document.getElementById("ts-minute").value = d.getMinutes();
    }
};

// 瀏覽器重新整理/關閉分頁防呆機制
window.addEventListener('beforeunload', function (e) {
    if (window.hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
    }
});

// =======================================================
// ★ 核心重構：共用底層彈出視窗產生器 (Base Modal Engine)
// =======================================================
function createBaseModal(htmlContent, buttonsConfig = []) {
    return new Promise((resolve) => {
        // 1. 確保全域動畫樣式存在（只在第一次載入時插入，避免重複建立）
        if (!document.getElementById('smart-modal-styles')) {
            const style = document.createElement('style');
            style.id = 'smart-modal-styles';
            style.innerHTML = `
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes fadeOut { to { opacity: 0; transform: translate(-50%, -50%) scale(0.95); } }
                @keyframes popUp { from { transform: translate(-50%, -50%) scale(0.9); opacity: 0; } to { transform: translate(-50%, -50%) scale(1); opacity: 1; } }
            `;
            document.head.appendChild(style);
        }

        // 2. 建立半透明背景遮罩 (Overlay)
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
            background: rgba(0, 0, 0, 0.5); z-index: 10000;
            animation: fadeIn 0.2s forwards; backdrop-filter: blur(2px);
        `;

        // 3. 建立視窗本體 (Box) - 確保在手機與桌機都能完美置中
        const box = document.createElement('div');
        box.style.cssText = `
            position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
            background: #fff; padding: 20px; border-radius: 8px; width: 88%; max-width: 360px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.3); z-index: 10001;
            animation: popUp 0.2s ease-out forwards;
        `;

        // 4. 動態組合按鈕的 HTML
        let buttonsHtml = `<div style="display: flex; justify-content: flex-end; gap: 12px; margin-top: 20px;">`;
        buttonsConfig.forEach((btn, idx) => {
            buttonsHtml += `
                <button id="smart-btn-${idx}" style="
                    padding: 8px 18px; border: none; border-radius: 4px; 
                    font-size: 1rem; cursor: pointer; font-weight: bold;
                    transition: transform 0.1s, opacity 0.1s; ${btn.style || ''}
                ">${btn.text}</button>
            `;
        });
        buttonsHtml += `</div>`;

        // 5. 注入內容並渲染到 Body
        box.innerHTML = `<div style="font-size: 1.1rem; line-height: 1.6; color: #333; text-align: center;">${htmlContent}</div>${buttonsHtml}`;
        overlay.appendChild(box);
        document.body.appendChild(overlay);

        // 6. 點擊按鈕時的通用淡出與銷毀邏輯
        const closeAndResolve = (result) => {
            overlay.style.animation = "fadeOut 0.2s forwards";
            box.style.animation = "fadeOut 0.2s forwards";
            setTimeout(() => {
                overlay.remove();
                resolve(result); // 回傳點擊的結果給外部的 await
            }, 200);
        };

        // 7. 自動綁定事件與按鈕回饋效果
        buttonsConfig.forEach((btn, idx) => {
            const btnEl = box.querySelector(`#smart-btn-${idx}`);
            if (btnEl) {
                // 增加輕微的手機點擊縮放視覺回饋
                btnEl.ontouchstart = () => btnEl.style.transform = "scale(0.95)";
                btnEl.ontouchend = () => btnEl.style.transform = "scale(1)";
                btnEl.onmousedown = () => btnEl.style.transform = "scale(0.95)";
                btnEl.onmouseup = () => btnEl.style.transform = "scale(1)";

                btnEl.onclick = () => closeAndResolve(btn.value);
            }
        });
    });
}

// =======================================================
// ★ 上層呼叫端：變得極度乾淨清爽
// =======================================================

// 1. 提示視窗 (僅有一個「確定」按鈕)
window.showAlert = function (message, okText = "確定") {
    return createBaseModal(message, [
        {
            text: okText,
            value: true,
            style: "background: var(--blue-primary, #007bff); color: #fff; box-shadow: 0 2px 4px rgba(0,0,0,0.2);"
        }
    ]);
};

// 2. 確認視窗 (包含「取消」與「確定」兩個按鈕)
window.showConfirm = function (message, okText = "確定", cancelText = "取消") {
    return createBaseModal(message, [
        {
            text: cancelText,
            value: false,
            style: "background: #e9ecef; color: #495057;"
        },
        {
            text: okText,
            value: true,
            style: "background: var(--blue-primary, #007bff); color: #fff; box-shadow: 0 2px 4px rgba(0,0,0,0.2);"
        }
    ]);
};

// 清除開場圖的按鈕函式
window.clearCustomSplash = function() {
    animCfg.customSplashImg = "";
    let uploader = document.getElementById('upload-splash');
    if (uploader) uploader.value = "";
    if (window.showToast) window.showToast("🗑️ 已恢復預設太極圖");
}

// ==========================================
// ★ 網頁載入完成後的初始化事件綁定 (合併版)
// ==========================================
// ★ 全域變數：用來記錄計時器
window.lyScrollTimeout = null;

document.addEventListener('DOMContentLoaded', () => {

    // --- 區塊 A：防護虛擬鍵盤遮擋 (Visual Viewport) ---
    if (window.visualViewport) {
        const viewport = window.visualViewport;
        const initialHeight = window.innerHeight; // 記住網頁最初的真實高度
        document.body.style.transition = 'padding-bottom 0.3s ease';

        viewport.addEventListener('resize', () => {
            const keyboardHeight = initialHeight - viewport.height;
            if (keyboardHeight > 150) {
                // 鍵盤彈出
                document.body.style.paddingBottom = `${keyboardHeight}px`;
                const activeElement = document.activeElement;
                if (activeElement && ['edit-judge', 'edit-feedback', 'edit-note', 'p-question'].includes(activeElement.id)) {
                    let container = activeElement.closest('details') || activeElement.closest('.edit-area') || activeElement.parentElement;
                    if (container) {
                        setTimeout(() => {
                            container.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }, 100);
                    }
                }
            } else {
                // 鍵盤收起
                document.body.style.paddingBottom = '0px';
            }
        });
    }

    // --- 區塊 B：歷史紀錄滾動提示燈 (滑動顯示，靜止隱藏) ---
    let recView = document.getElementById("records-view");
    if (recView) {
        recView.addEventListener('scroll', function () {
            let hint = document.getElementById("scroll-hint");
            if (!hint || hint.style.display === 'none') return;

            hint.style.opacity = '1'; // 只要一滾動，立刻顯示

            if (window.lyScrollTimeout) {
                clearTimeout(window.lyScrollTimeout);
            }
            window.lyScrollTimeout = setTimeout(() => {
                hint.style.opacity = '0'; // 1.5 秒沒動作就隱藏
            }, 1500);
        });
    }

    // --- 區塊 C：自訂開場圖 (200KB 限制) 檔案上傳 ---
    let splashUploader = document.getElementById('upload-splash');
    if (splashUploader) {
        splashUploader.addEventListener('change', function(e) {
            let file = e.target.files[0];
            if (!file) return;

            // 嚴格限制 200KB
            if (file.size > 200 * 1024) {
                if (window.showAlert) window.showAlert("❌ 檔案太大了！為了保持 APP 順暢，請上傳 200KB 以下的圖片喔！");
                e.target.value = ""; 
                return;
            }

            // 轉成 Base64
            let reader = new FileReader();
            reader.onload = function(event) {
                animCfg.customSplashImg = event.target.result;
                if (window.showToast) window.showToast("✅ 自訂開場圖已載入，記得按下「儲存並返回」！");
            };
            reader.readAsDataURL(file);
        });
    }

});