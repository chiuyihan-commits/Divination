// ==========================================
// ★ 彈出視窗控制 (全數改為 Hash Router 驅動)
// ==========================================

// --- 1. 時間與定位視窗 ---
window.openTimeModal = function () {
    window.location.hash = "#time"; // 交給 Router 打開
};
window.cancelTimeModal = function () {
    history.back(); // 觸發返回，Router 會自動關閉它
};
window.closeTimeModal = function () {
    if (window.showToast) window.showToast("✅ 時間與地區已儲存並返回！");
    history.back();
};

// ==========================================
// ★ 系統設定快照與彈窗控制
// ==========================================
let settingsSnapshot = "";
window.isSettingsPopstate = false;

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

window.openSettings = function () {
    if (typeof getSettingsSnapshotObj === 'function') {
        window.settingsSnapshot = JSON.stringify(getSettingsSnapshotObj());
    }
    document.querySelectorAll('#settings-modal details').forEach(d => d.open = false);

    // ★ 核心觸發：每次打開設定視窗前，動態決定要不要秀出還原按鈕
    if (typeof window.checkCustomCoinsStatus === 'function') {
        window.checkCustomCoinsStatus();
    }
    window.location.hash = "#settings"; // 交給 Router 打開
};

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

window.requestCloseSettings = function () {
    history.back(); // 觸發返回，由 Router 檢查是否需要攔截
};
function executeSettingsClose(doSave) {
    document.getElementById("settings-modal").style.display = "none";
    let confirmModal = document.getElementById("settings-confirm-modal");
    if (confirmModal) confirmModal.style.display = "none";
    document.body.style.overflow = "";

    if (doSave && typeof window.saveSettings === 'function') window.saveSettings();
    if (!window.isSettingsPopstate) history.back();
}

window.confirmDiscardSettings = async function () {
    document.getElementById("settings-confirm-modal").style.display = "none";
    if (typeof loadSettings === 'function') await loadSettings(); // 還原設定
    window.settingsSnapshot = JSON.stringify(getSettingsSnapshotObj()); // 重置快照
    history.back();
};

window.confirmSaveSettings = function () {
    document.getElementById("settings-confirm-modal").style.display = "none";
    if (typeof window.saveSettings === 'function') window.saveSettings();
    window.settingsSnapshot = JSON.stringify(getSettingsSnapshotObj()); // 重置快照
    if (window.showToast) window.showToast("💾 設定已儲存，返回首頁");
    history.back();
};

window.confirmContinueSettings = function () {
    document.getElementById("settings-confirm-modal").style.display = "none";
    // 什麼都不做，留在 #settings 繼續編輯
};

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

// ★ 加入全域鎖，防止狂點按鈕引發的時序錯亂
window.isCastingYao = false;

// ★ 手動單爻起卦控制 (強化防護版)
async function castSingleYao(idx) {
    // 1. 防連點：如果正在播放動畫或正在處理中，直接攔截不反應
    if (window.isCastingYao) return;

    // 2. 順序防呆：檢查是不是按照順序點擊
    if (idx !== AppState.currentCastStep) {
        if (window.showAlert) {
            window.showAlert(AppState.currentCastStep === 0
                ? "請從第一爻 (初爻) 擲起！\n(若欲手動選爻，請選完六爻後按「手動起卦」)"
                : `請先擲第 ${AppState.currentCastStep + 1} 爻！`);
        }
        return;
    }

    // 3. 正式進入儀式：上鎖！
    window.isCastingYao = true;

    // ★ 4. 鎖死下拉選單：一旦開始擲幣，不允許再手動偷改任何選單
    for (let i = 0; i < 6; i++) {
        let sel = document.getElementById("yao-sel-" + i);
        if (sel) sel.disabled = true;
    }

    // 5. 播放儀式動畫並取得結果
    let yaoNames = ['初爻', '二爻', '三爻', '四爻', '五爻', '上爻'];
    let result = await castRitualFlow(idx === 0, yaoNames[idx]);

    // 填入資料並更新印章
    $(`yao-sel-${idx}`).value = result;
    updateYaoSeal(idx);

    $("anim-overlay").style.display = "none";
    AppState.currentCastStep++;

    // 6. 儀式結束：解鎖！
    window.isCastingYao = false;

    // 若六爻皆已完成，歸零並觸發排盤
    if (AppState.currentCastStep >= 6) {
        AppState.currentCastStep = 0;
        startManual();
    }
}

// ★ 電腦自動起卦控制 (連續 6 次)
async function startAutoWithAnim() {
    // ★ 微創 1：防呆檢查
    let hasManualInput = false;
    for (let i = 0; i < 6; i++) {
        let sel = document.getElementById("yao-sel-" + i);
        if (sel && sel.value !== "") hasManualInput = true;
    }
    if (window.AppState && window.AppState.currentCastStep > 0) hasManualInput = true;

    // ★ 微創 2：跳出詢問與術後清空 (因為是 async，所以用 await 等待結果)
    if (hasManualInput) {
        let ok = await window.showConfirm("⚠️ 警告：目前卦盤已有手動起卦進度。\n\n確定要放棄當前輸入，改由電腦動畫重新起卦嗎？\n(此動作將清空目前的盤面)");
        if (!ok) return; // 使用者按取消，直接中斷離開

        if (typeof window.resetManualUI === 'function') window.resetManualUI();
    }

    // --- 以下完全保留你原本的邏輯 ---
    let yaoNames = ['初爻', '二爻', '三爻', '四爻', '五爻', '上爻'];
    for (let i = 0; i < 6; i++) {
        let result = await castRitualFlow(i === 0, yaoNames[i]);
        document.getElementById(`yao-sel-${i}`).value = result; // 保險起見改用原生的 getElementById
        updateYaoSeal(i);
    }
    document.getElementById("anim-overlay").style.display = "none";
    if (window.AppState) window.AppState.currentCastStep = 0; // 重置
    // 觸發原本的畫盤流程
    if (typeof startManual === 'function') startManual();
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
// ★ 清空首頁起卦面板狀態 (包含解鎖)
// ==========================================
function resetManualUI() {
    for (let i = 0; i < 6; i++) {
        let sel = document.getElementById("yao-sel-" + i);
        let seal = document.getElementById("yao-seal-" + i);

        // 1. 清空下拉選單，並【解除禁用鎖定】
        if (sel) {
            sel.value = "";
            sel.disabled = false; // ★ 恢復為可手動選擇
        }

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
// ★ 全域 UI 變數與工具 (Toast / Confirm) - 極致靠頂版
// ==========================================
window.showToast = function (msg, duration = 2500) {
    let toast = document.getElementById("ly-toast");

    if (!toast) {
        toast = document.createElement("div");
        toast.id = "ly-toast";
        toast.style.cssText = `
            position: fixed; 
            /* ★ 極致靠頂，並自動避開手機瀏海 */
            top: env(safe-area-inset-top, 5px); 
            left: 50%; 
            transform: translateX(-50%); 
            background: rgba(0, 0, 0, 0.85); 
            color: #fff; 
            /* ★ 稍微縮小一點內距與字體，看起來更精緻 */
            padding: 10px 20px; 
            border-radius: 25px; 
            font-size: 0.95rem; 
            z-index: 9999999 !important; 
            font-family: '標楷體', 'BiauKai', 'DFKai-SB', serif; 
            text-align: center; 
            box-shadow: 0 4px 10px rgba(0,0,0,0.3); 
            transition: opacity 0.3s ease;
            white-space: nowrap; 
            pointer-events: none;
            max-width: 90vw; /* 避免螢幕太小文字被切斷 */
        `;
        document.body.appendChild(toast);
    }

    toast.innerText = msg;
    toast.style.display = "block";
    toast.offsetHeight; // 強制重繪
    toast.style.opacity = "1";

    if (window.toastTimeout) clearTimeout(window.toastTimeout);
    window.toastTimeout = setTimeout(() => {
        toast.style.opacity = "0";
        setTimeout(() => { toast.style.display = "none"; }, 300);
    }, duration);
};

// =======================================================
// ★ 虛擬路由版：底層彈出視窗 (完美呼應 Route-Based Modal)
// =======================================================
window._lyModalPromiseResolver = null;
window._lyModalCancelValue = false;

function createBaseModal(htmlContent, buttonsConfig = []) {
    return new Promise((resolve) => {
        // 防呆：如果畫面上已經有彈窗，不重複開啟
        if (document.getElementById('ly-smart-modal-overlay')) {
            resolve(false); return;
        }

        if (!document.getElementById('smart-modal-styles')) {
            const style = document.createElement('style');
            style.id = 'smart-modal-styles';
            style.innerHTML = `@keyframes smartFadeOut { to { opacity: 0; } } @keyframes smartBoxFadeOut { to { opacity: 0; transform: scale(0.95) translateY(10px); } }`;
            document.head.appendChild(style);
        }

        document.body.style.overflow = "hidden";

        const overlay = document.createElement('div');
        overlay.id = 'ly-smart-modal-overlay';
        overlay.style.cssText = `position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0, 0, 0, 0.65); z-index: 9999998 !important; display: flex; align-items: center; justify-content: center; animation: fadeIn 0.2s forwards; backdrop-filter: blur(2px);`;
        overlay.addEventListener('touchmove', (e) => { e.preventDefault(); }, { passive: false });

        const box = document.createElement('div');
        box.style.cssText = `background: #fff; padding: 20px; border-radius: 8px; width: 88%; max-width: 360px; box-shadow: 0 4px 15px rgba(0,0,0,0.3); z-index: 9999999 !important; animation: popUp 0.2s ease-out forwards;`;

        let buttonsHtml = `<div style="display: flex; justify-content: center; gap: 15px; margin-top: 20px;">`;
        buttonsConfig.forEach((btn, idx) => {
            buttonsHtml += `<button id="smart-btn-${idx}" style="padding: 8px 18px; border: none; border-radius: 4px; font-size: 1rem; cursor: pointer; font-weight: bold; font-family: inherit; transition: transform 0.1s, opacity 0.1s; ${btn.style || ''}">${btn.text}</button>`;
        });
        buttonsHtml += `</div>`;

        box.innerHTML = `<div style="font-size: 1.1rem; line-height: 1.6; color: #333; text-align: center;">${htmlContent}</div>${buttonsHtml}`;
        overlay.appendChild(box);
        document.body.appendChild(overlay);

        // 預設的取消值 (當使用者按手機實體返回鍵時使用)
        let cancelBtn = buttonsConfig.find(b => b.value === false || b.value === "no");
        window._lyModalCancelValue = cancelBtn ? cancelBtn.value : false;
        window._lyModalPromiseResolver = resolve;

        // 綁定按鈕
        buttonsConfig.forEach((btn, idx) => {
            const btnEl = box.querySelector(`#smart-btn-${idx}`);
            if (btnEl) {
                btnEl.ontouchstart = () => btnEl.style.transform = "scale(0.95)";
                btnEl.ontouchend = () => btnEl.style.transform = "scale(1)";
                btnEl.onclick = () => {
                    // ★ 絕殺：點擊按鈕時不直接關閉，而是觸發「返回」，讓 Router 大腦統一處理關閉！
                    overlay.style.pointerEvents = "none"; // 防連點
                    window._lyModalCancelValue = btn.value;
                    history.back();
                };
            }
        });

        // ★ 把彈窗變成一個虛擬頁面！
        window.location.hash = "#lymodal";
    });
}

window.showAlert = function (message, okText = "確定") {
    return createBaseModal(message, [
        {
            text: okText,
            value: true,
            style: "background: var(--blue-primary, #007bff); color: #fff; box-shadow: 0 2px 4px rgba(0,0,0,0.2);"
        }
    ]);
};

window.showConfirm = function (message, okText = "確定", cancelText = "取消") {
    /*
    // ==========================================
    // ★ 舊版自訂路由彈窗 (已註解保留，供未來參考)
    // ==========================================
    // 1. 自動將程式碼中的 \n 轉換為網頁的換行標籤 <br>
    let htmlMsg = message.replace(/\n/g, '<br>');
    let formattedMessage = htmlMsg;

    // 2. 如果訊息開頭是 ⚠️，我們把它切出來，做成置中置頂的大圖示
    if (htmlMsg.trim().startsWith("⚠️")) {
        let textPart = htmlMsg.replace("⚠️", "").trim();
        formattedMessage = `
            <div style="font-size: 3rem; text-align: center; margin-bottom: 12px; line-height: 1;">⚠️</div>
            <div style="font-family: '標楷體', 'BiauKai', 'DFKai-SB', serif; text-align: center; font-size: 1.1rem; color: #333; line-height: 1.6;">
                ${textPart}
            </div>
        `;
    } else {
        formattedMessage = `
            <div style="font-family: '標楷體', 'BiauKai', 'DFKai-SB', serif; text-align: center; font-size: 1.1rem; color: #333; line-height: 1.6;">
                ${htmlMsg}
            </div>
        `;
    }

    // 3. 呼叫底層視窗，並在按鈕上也強制套用標楷體
    return createBaseModal(formattedMessage, [
        {
            text: cancelText,
            value: false,
            style: "background: #e9ecef; color: #555; font-family: '標楷體', 'BiauKai', 'DFKai-SB', serif; font-size: 1.1rem;"
        },
        {
            text: okText,
            value: true,
            style: "background: #dc3545; color: #fff; box-shadow: 0 2px 4px rgba(0,0,0,0.2); font-family: '標楷體', 'BiauKai', 'DFKai-SB', serif; font-size: 1.1rem;"
        }
    ]);
    */

    // ==========================================
    // ★ 新版原生 window.confirm (穩定防護版)
    // ==========================================
    // 原生 confirm 只能回傳 true/false，且不支援自訂按鈕文字 (okText/cancelText)。
    // 我們將結果用 Promise.resolve 包裝，完美相容外部既有的 await / .then() 呼叫寫法。
    return Promise.resolve(window.confirm(message));
};

window.clearCustomSplash = function () {
    animCfg.customSplashImg = "";
    let uploader = document.getElementById('upload-splash');
    if (uploader) uploader.value = "";
    if (window.showToast) window.showToast("🗑️ 已恢復預設太極圖");
}

window.restoreDefaultCoins = async function () {
    let ok = await window.showConfirm("⚠️ 確定要清除自訂圖片，還原為系統預設的擲筊與硬幣嗎？");
    if (ok) {
        // 清除 localforage 中的暫存
        const keys = ['img_coin_front', 'img_coin_back', 'img_prep', 'img_toss', 'img_sy', 'img_oy', 'img_sn', 'img_on'];
        for (let k of keys) {
            await localforage.removeItem(k);
        }

        // 清空設定視窗中，使用者選擇檔案的殘留字串
        const inputs = ['img-coin-front', 'img-coin-back', 'img-up-prep', 'img-up-toss', 'img-up-sy', 'img-up-oy', 'img-up-sn', 'img-up-on'];
        inputs.forEach(id => {
            let el = document.getElementById(id);
            if (el) el.value = "";
        });

        if (window.showToast) window.showToast("✅ 已成功還原為預設圖片！");
    }
};

// ★ 新增：檢查是否存在自訂圖片，以決定是否顯示還原按鈕
window.checkCustomCoinsStatus = async function () {
    let container = document.getElementById("reset-coins-container");
    if (!container) return;

    const keys = ['img_coin_front', 'img_coin_back', 'img_prep', 'img_toss', 'img_sy', 'img_oy', 'img_sn', 'img_on'];
    let hasCustomImage = false;

    // 掃描 LocalForage，只要找到任何一個自訂檔案就判定為 true
    for (let k of keys) {
        let val = await localforage.getItem(k);
        if (val) {
            hasCustomImage = true;
            break;
        }
    }

    // 根據掃描結果決定顯示或隱藏
    container.style.display = hasCustomImage ? "block" : "none";
};

// ★ 更新：還原功能的邏輯 (加入刪除後的隱藏連動)
window.restoreDefaultCoins = async function () {
    let ok = await window.showConfirm("⚠️ 確定要清除自訂圖片，還原為系統預設的擲筊與硬幣嗎？");
    if (ok) {
        const keys = ['img_coin_front', 'img_coin_back', 'img_prep', 'img_toss', 'img_sy', 'img_oy', 'img_sn', 'img_on'];
        for (let k of keys) {
            await localforage.removeItem(k);
        }

        const inputs = ['img-coin-front', 'img-coin-back', 'img-up-prep', 'img-up-toss', 'img-up-sy', 'img-up-oy', 'img-up-sn', 'img-up-on'];
        inputs.forEach(id => {
            let el = document.getElementById(id);
            if (el) el.value = "";
        });

        // 刪除完成後，立刻呼叫檢查器把按鈕隱藏起來
        window.checkCustomCoinsStatus();

        if (window.showToast) window.showToast("✅ 已成功還原為預設圖片！");
    }
};

// =======================================================
// ★ 終極核心：Hash Router 路由與狀態機引擎
// =======================================================
window.hasUnsavedChanges = false;
window.comesFromRecords = false;
window.recordNotesSnapshot = "";
window._ignoreHashChange = false;
window._isConfirmingExit = false; // ★ 防連點金鐘罩鎖定
// --- 1. 中央路由派發器 ---
function handleRouting(event) {
    if (window._ignoreHashChange) {
        window._ignoreHashChange = false;
        return;
    }

    let hash = window.location.hash || "#home";
    let oldHash = event && event.oldURL ? (new URL(event.oldURL)).hash : "";

    // ==========================================
    // ★ 彈窗虛擬路由處理區塊
    // ==========================================
    // 1. 如果離開了 #lymodal，代表要關閉彈窗 (不管是按實體返回鍵還是點擊視窗按鈕)
    if (oldHash === "#lymodal" && hash !== "#lymodal") {
        let overlay = document.getElementById('ly-smart-modal-overlay');
        if (overlay && window._lyModalPromiseResolver) {
            overlay.style.animation = "smartFadeOut 0.2s forwards";
            if (overlay.firstChild) overlay.firstChild.style.animation = "smartBoxFadeOut 0.2s forwards";

            let resolveFn = window._lyModalPromiseResolver;
            let resultVal = window._lyModalCancelValue;
            window._lyModalPromiseResolver = null; // 清空避免重複觸發

            setTimeout(() => {
                overlay.remove();
                document.body.style.overflow = "";
                resolveFn(resultVal);
            }, 200);
        }
    }

    // 2. 如果進入了 #lymodal，直接中斷路由渲染，讓背後的結果頁維持原樣！
    if (hash === "#lymodal") {
        return;
    }
    // ==========================================

    // ⛔ 攔截 1：離開排盤結果頁 (#result)
    if (oldHash === "#result" && hash !== "#result") {

        // ★ 防連點補救：如果正在跳出詢問視窗，直接吸收掉多餘的返回鍵！
        if (window._isConfirmingExit) {
            history.pushState(null, "", "#result"); // 強制拉回，不給穿透
            return;
        }

        let subject = document.getElementById("edit-subject")?.value || "";
        let judge = document.getElementById("edit-judge")?.value || "";
        let feedback = document.getElementById("edit-feedback")?.value || "";
        let note = document.getElementById("edit-note")?.value || "";
        let currentNotes = JSON.stringify({ subject, judge, feedback, note });

        let notesChanged = (currentNotes !== window.recordNotesSnapshot);
        let hasValidData = window.AppState && window.AppState.curData && window.AppState.curData.lines;
        let isNewDivination = !window.comesFromRecords && hasValidData;

        // 只有「全新且未儲存」或「舊紀錄但被改過筆記」，才會攔截
        if (hasValidData && (isNewDivination || notesChanged)) {

            window._isConfirmingExit = true; // ★ 扣上防連點鎖
            history.pushState(null, "", "#result"); // 強制覆蓋回 #result

            window.showConfirm("⚠️ 您有未儲存的紀錄或變更，確定要直接離開嗎？\n(離開後將自動為您「預防暫存」)").then(ok => {

                window._isConfirmingExit = false; // ★ 視窗關閉，解開鎖定

                if (ok) {
                    // 使用者確定要放棄當前進度離開，觸發預防暫存
                    if (typeof window.emergencySave === 'function') window.emergencySave();
                    window.recordNotesSnapshot = currentNotes;
                    window.comesFromRecords = true;
                    window.location.replace(hash);
                }
            });
            return; // 中斷路由
        }

        // 💡 如果已經儲存過 (isNewDivination 為 false 且 notesChanged 為 false)
        // 程式就會順利通過這裡，直接回到首頁或紀錄頁，絕對不會再跳出 showConfirm！
    }

    // ⛔ 攔截 2：離開系統設定頁 (#settings)
    if (oldHash === "#settings" && hash !== "#settings") {
        let currentState = typeof getSettingsSnapshotObj === 'function' ? getSettingsSnapshotObj() : {};
        let oldState = window.settingsSnapshot ? JSON.parse(window.settingsSnapshot) : currentState;
        let changedNames = [];
        for (let key in currentState) {
            if (currentState[key] !== oldState[key]) {
                changedNames.push(window.settingsDictionary ? (window.settingsDictionary[key] || "自訂參數") : "自訂參數");
            }
        }
        changedNames = [...new Set(changedNames)];

        if (changedNames.length > 0) {
            window._ignoreHashChange = true;
            window.location.hash = "#settings"; // 強制鎖回設定頁

            let diffMsgBox = document.getElementById("settings-diff-msg");
            if (diffMsgBox) diffMsgBox.innerHTML = `📝 <b>您變更了：</b><br>${changedNames.join("、")}`;
            let confirmModal = document.getElementById("settings-confirm-modal");
            if (confirmModal) confirmModal.style.display = "flex";
            return;
        }
    }

    // --- 視窗顯示控制 ---
    // 預設先隱藏所有 Modal，確保乾淨
    let tModal = document.getElementById("time-modal");
    let sModal = document.getElementById("settings-modal");
    if (tModal) tModal.style.display = "none";
    if (sModal) sModal.style.display = "none";
    document.body.style.overflow = "";

    // 如果網址是 Modal，打開它並中斷底層渲染
    if (hash === "#time") {
        if (tModal) { tModal.style.display = "flex"; document.body.style.overflow = "hidden"; }
        return;
    }
    if (hash === "#settings") {
        if (sModal) { sModal.style.display = "flex"; document.body.style.overflow = "hidden"; }
        return;
    }

    // --- 主畫面切換 ---
    document.getElementById("portal-view").style.display = "none";
    document.getElementById("records-view").style.display = "none";
    document.getElementById("result-view").style.display = "none";

    if (hash === "#records") {
        document.getElementById("records-view").style.display = "block";
        if (typeof showRecords === 'function') {
            showRecords(oldHash === "#result");
        }
    }
    else if (hash === "#result") {
        // ★ 防呆：如果是重新整理，記憶體被清空，強制退回首頁
        if (!window.AppState || !window.AppState.curData || !window.AppState.curData.lines) {
            window._ignoreHashChange = true;
            window.location.hash = "#home";
            handleRouting();
            return;
        }

        document.getElementById("result-view").style.display = "flex";
        if (oldHash !== "#result") {
            // 進入結果頁時，自動將起卦問題或歷史主旨帶入輸入框
            let editSub = document.getElementById("edit-subject");
            if (editSub && window.AppState && window.AppState.curData) {
                editSub.value = window.AppState.curData.subject || window.AppState.curData.question || "";
            }

            // 建立包含 subject 的完整快照
            let subject = document.getElementById("edit-subject")?.value || "";
            let judge = document.getElementById("edit-judge")?.value || "";
            let feedback = document.getElementById("edit-feedback")?.value || "";
            let note = document.getElementById("edit-note")?.value || "";
            window.recordNotesSnapshot = JSON.stringify({ subject, judge, feedback, note });
        }
    }
    else {
        // #home 以及其他預設情況
        document.getElementById("portal-view").style.display = "block";
        window.comesFromRecords = false; // 確保回到首頁必定洗掉歷史紀錄狀態

        // ★ 核心新增：手機返回鍵的「離開系統」陷阱機制 (Double Push Trap)
        // 只要回到首頁，如果沒有陷阱，我們就悄悄佈置一個
        if (!history.state || history.state.trap !== 'active') {
            history.replaceState({ trap: 'base' }, "", "#home");
            history.pushState({ trap: 'active' }, "", "#home");
        }

        let subjectInput = document.getElementById("p-question");
        if (subjectInput) subjectInput.value = "";

        let d = new Date();
        let yearEl = document.getElementById("ts-year");
        if (yearEl) {
            yearEl.value = d.getFullYear();
            document.getElementById("ts-month").value = d.getMonth();
            document.getElementById("ts-day").value = d.getDate();
            document.getElementById("ts-hour").value = d.getHours();
            document.getElementById("ts-minute").value = d.getMinutes();
        }
    }
}

window.addEventListener("hashchange", handleRouting);

// ==========================================
// ★ 終極防線：預防暫存系統 (Emergency Save)
// ==========================================
window.emergencySave = function () {
    // 1. 確保目前真的有排盤結果資料
    if (!window.AppState || !window.AppState.curData || !window.AppState.curData.lines) return;

    // 2. 抓取畫面上目前的筆記內容
    let subject = document.getElementById("edit-subject")?.value || "";
    let judge = document.getElementById("edit-judge")?.value || "";
    let feedback = document.getElementById("edit-feedback")?.value || "";
    let note = document.getElementById("edit-note")?.value || "";
    let currentNotes = JSON.stringify({ subject, judge, feedback, note });

    // 3. 判斷是否有儲存的價值 (全新未存盤，或舊盤但筆記有修改)
    let notesChanged = (currentNotes !== window.recordNotesSnapshot);
    let isNewDivination = !window.comesFromRecords;

    if (isNewDivination || notesChanged) {
        // ★ 核心要求：在主題後面加上預防暫存標籤
        let q = window.AppState.curData.question || "未命名卦象";
        if (!q.includes("預防暫存")) {
            window.AppState.curData.question = q + " (預防暫存)";
        }

        // 把畫面上的筆記同步進記憶體
        window.AppState.curData.judge = judge;
        window.AppState.curData.feedback = feedback;
        window.AppState.curData.note = note;

        // ★ Fire and forget：搶在網頁被徹底殺死前，將資料寫入 IndexedDB
        localforage.getItem('iching_final_v60').then(recs => {
            recs = recs || [];
            let cloneData = JSON.parse(JSON.stringify(window.AppState.curData));

            if (window.AppState.curRecIndex > -1) {
                recs[window.AppState.curRecIndex] = cloneData; // 覆寫舊紀錄
            } else {
                recs.unshift(cloneData); // 新盤插在最前面
            }
            localforage.setItem('iching_final_v60', recs);
        }).catch(e => console.log("預防暫存失敗", e));

        // 標記為已處理，避免後續重複觸發
        window.comesFromRecords = true;
        window.recordNotesSnapshot = currentNotes;
    }
};

// ==========================================
// ★ 1. 攔截原生的網頁關閉、滑掉 APP 或重新整理
// ==========================================
window.addEventListener('beforeunload', function (e) {
    window.emergencySave(); // 觸發預防暫存

    if (window.hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
    }
});

// ==========================================
// ★ 2. 終極大腦 Popstate：統管首頁退出陷阱與急救
// ==========================================
window.addEventListener('popstate', function (e) {
    // 如果畫面上有彈窗，代表這次返回是為了關閉 #lymodal，直接放行給 Router
    if (document.getElementById('ly-smart-modal-overlay')) return;

    if (e.state && e.state.trap === 'base') {
        let hasData = false;
        if (window.AppState && window.AppState.currentCastStep > 0) hasData = true;
        for (let i = 0; i < 6; i++) {
            let sel = document.getElementById("yao-sel-" + i);
            if (sel && sel.value) hasData = true;
        }
        let qInput = document.getElementById("p-question");
        if (qInput && qInput.value.trim() !== "") hasData = true;

        const exitSystem = () => {
            // ★ 系統被強制登出前，觸發最後的預防暫存！
            window.emergencySave();

            if (window.clearAllHighlights) window.clearAllHighlights();
            window.close();
            history.go(-100);
            setTimeout(() => {
                document.body.innerHTML = `
                    <div style='display:flex; height:100dvh; align-items:center; justify-content:center; flex-direction:column; background:#f8f9fa;'>
                        <div style='font-size:4rem; margin-bottom:15px; color:#555;'>☯</div>
                        <div style='font-size:1.5rem; font-weight:bold; color:#333; font-family:"標楷體", serif; text-align:center;'>您已登出系統<br><span style="font-size:1rem; color:#888; font-weight:normal; margin-top:10px; display:inline-block;'>請關閉此分頁或 App</span></div>
                    </div>`;
            }, 400);
        };

        if (hasData) {
            window.createBaseModal("⚠️ 起卦中（或卦盤有資訊）<br>請問是否要跳出系統？", [
                { text: "否", value: "no", style: "background: #e9ecef; color: #555;" },
                { text: "還原卦盤", value: "reset", style: "background: #17a2b8; color: #fff;" },
                { text: "是", value: "yes", style: "background: #dc3545; color: #fff;" }
            ]).then(res => {
                if (res === "yes") {
                    exitSystem();
                } else if (res === "reset") {
                    if (typeof window.resetManualUI === 'function') window.resetManualUI();
                    history.pushState({ trap: 'active' }, "", "#home");
                    if (window.showToast) window.showToast("🔄 卦盤已還原清空");
                } else {
                    history.pushState({ trap: 'active' }, "", "#home");
                }
            });
        } else {
            //window.showConfirm("⚠️ 確定要結束並離開系統嗎？\n(確認後將為您保留設定並安全跳出)").then(ok => {
            //    if (ok) exitSystem(); else history.pushState({ trap: 'active' }, "", "#home");
            //});
            // 如果完全沒有填寫資料，就直接放行，立刻登出系統！
            exitSystem();
        }
    }
});

// --- 2. 攔截按鈕：精確控制返回節點 ---
window.goBackPortal = function () {
    let editOverlay = document.getElementById("smart-edit-overlay");
    if (editOverlay) {
        let btnCancel = document.getElementById("smart-btn-cancel");
        if (btnCancel) { btnCancel.click(); return; }
    }

    // ★ 智能判斷：從結果頁返回，看來源決定去紀錄頁還是首頁；從紀錄頁則返回首頁。
    if (window.location.hash === "#result") {
        window.location.hash = window.comesFromRecords ? "#records" : "#home";
    } else {
        window.location.hash = "#home";
    }
};

// ==========================================
// ★ 網頁載入完成後的初始化事件綁定
// ==========================================
window.lyScrollTimeout = null;

document.addEventListener('DOMContentLoaded', () => {
    // 1. 初始化路由
    if (!window.location.hash) {
        window.location.hash = "#home";
    } else {
        handleRouting();
    }

    // 2. 處理虛擬鍵盤推擠 (視覺視窗)
    if (window.visualViewport) {
        const viewport = window.visualViewport;
        const initialHeight = window.innerHeight;
        document.body.style.transition = 'padding-bottom 0.3s ease';

        viewport.addEventListener('resize', () => {
            const keyboardHeight = initialHeight - viewport.height;
            if (keyboardHeight > 150) {
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
                document.body.style.paddingBottom = '0px';
            }
        });
    }

    // 3. 處理歷史紀錄的捲動提示
    let recView = document.getElementById("records-view");
    if (recView) {
        recView.addEventListener('scroll', function () {
            let hint = document.getElementById("scroll-hint");
            if (!hint || hint.style.display === 'none') return;
            hint.style.opacity = '1';
            if (window.lyScrollTimeout) clearTimeout(window.lyScrollTimeout);
            window.lyScrollTimeout = setTimeout(() => { hint.style.opacity = '0'; }, 1500);
        });
    }

    // 4. 處理自訂開場圖片上傳
    let splashUploader = document.getElementById('upload-splash');
    if (splashUploader) {
        splashUploader.addEventListener('change', function (e) {
            let file = e.target.files[0];
            if (!file) return;
            if (file.size > 200 * 1024) {
                if (window.showAlert) window.showAlert("❌ 檔案太大了！為了保持 APP 順暢，請上傳 200KB 以下的圖片喔！");
                e.target.value = "";
                return;
            }
            let reader = new FileReader();
            reader.onload = function (event) {
                animCfg.customSplashImg = event.target.result;
                if (window.showToast) window.showToast("✅ 自訂開場圖已載入，記得按下「儲存並返回」！");
            };
            reader.readAsDataURL(file);
        });
    }

    // ==========================================
    // ★ 雲端自動同步開關 (首頁與設定雙向綁定)
    // ==========================================
    let homeToggle = document.getElementById("set-auto-sync-home");
    let settingsToggle = document.getElementById("set-auto-sync-settings");

    // 共用的切換處理函式
    const updateAutoSync = async (e) => {
        let isChecked = e.target.checked;
        await localforage.setItem('ly_autoSync', isChecked); // 存入資料庫

        // ★ 核心：互相更新對方的狀態 (達成雙向綁定)
        if (homeToggle) homeToggle.checked = isChecked;
        if (settingsToggle) settingsToggle.checked = isChecked;

        if (window.showToast) {
            window.showToast(isChecked ? "☁️ 已開啟雲端自動同步" : "🚫 已關閉雲端自動同步");
        }
    };

    // 讀取初始值並綁定事件
    localforage.getItem('ly_autoSync').then(isAutoSync => {
        if (isAutoSync === null) isAutoSync = true;
        if (homeToggle) {
            homeToggle.checked = isAutoSync;
            homeToggle.addEventListener('change', updateAutoSync);
        }
        if (settingsToggle) {
            settingsToggle.checked = isAutoSync;
            settingsToggle.addEventListener('change', updateAutoSync);
        }
    });

    // ==========================================
    // ★ 新增：自訂 KEY 輸入攔截與防呆覆蓋詢問
    // ==========================================
    let customKeyInput = document.getElementById("custom-db-config"); // ⚠️ 請替換為你實際的 input ID

    if (customKeyInput) {
        customKeyInput.addEventListener('change', async function (e) {
            let newVal = e.target.value.trim();

            // 觸發條件：系統已有內建 KEY，且使用者剛輸入了新的字串
            if (window.hasBuiltInFirebaseKey === true && newVal.length > 0) {
                let ok = await window.showConfirm("⚠️ 系統偵測到已有「內建安全連線」。\n您確定要覆蓋它，改為使用您的自訂連線嗎？\n(若選擇取消，將為您清空輸入)");

                if (!ok) {
                    // 使用者反悔，清空輸入框，維持內建連線
                    e.target.value = "";
                    if (window.showToast) window.showToast("✅ 已取消覆蓋，維持系統內建連線。");
                } else {
                    // 使用者堅持覆蓋
                    if (window.showToast) window.showToast("✏️ 系統將優先使用您的自訂連線。");
                }
            }
        });
    }

    // ==========================================
    // ★ 檢查是否存在 KEY，決定是否顯示雲端開關與提示
    // ==========================================
    window.checkCloudKeyStatus = async function () {
        let containerHome = document.getElementById("auto-sync-container-home");
        let containerSettings = document.getElementById("auto-sync-container-settings");
        let hintMsg = document.getElementById("built-in-key-hint");

        let customKey = await localforage.getItem('customDbConfig');
        let hasCustomKey = customKey && customKey.trim().length > 0;
        let hasBuiltInKey = window.hasBuiltInFirebaseKey === true;
        let shouldShow = hasCustomKey || hasBuiltInKey;

        // 1. 同時控制兩個開關的顯示狀態
        if (containerHome) containerHome.style.display = shouldShow ? "flex" : "none";
        if (containerSettings) containerSettings.style.display = shouldShow ? "flex" : "none";

        // 2. 控制內建連線的提示文字
        if (hintMsg) {
            if (hasBuiltInKey && !hasCustomKey) {
                hintMsg.style.display = "block";
            } else {
                hintMsg.style.display = "none";
            }
        }
    };

    // 啟動 APP 時立刻檢查一次
    checkCloudKeyStatus();
});

document.addEventListener('click', function (e) {
    let btn = e.target.closest('#btn-update-rec');
    if (btn) {
        // ★ 抓取 edit-subject 的值
        let subject = document.getElementById("edit-subject")?.value || "";
        let judge = document.getElementById("edit-judge")?.value || "";
        let feedback = document.getElementById("edit-feedback")?.value || "";
        let note = document.getElementById("edit-note")?.value || "";

        // ★ 將 subject 加入要更新的物件中
        let currentNotes = JSON.stringify({ subject, judge, feedback, note });

        if (currentNotes === window.recordNotesSnapshot) {
            e.stopImmediatePropagation();
            e.preventDefault();
            if (window.showToast) window.showToast("ℹ️ 占斷與筆記內容未有任何異動！");

            // 【核心修復】內容沒變時，手動執行欄位鎖定與按鈕還原
            let sEl = document.getElementById("edit-subject");
            let jEl = document.getElementById("edit-judge");
            let fEl = document.getElementById("edit-feedback");
            let nEl = document.getElementById("edit-note");

            [sEl, jEl, fEl, nEl].forEach(el => {
                if (el) {
                    el.readOnly = true;
                    el.style.backgroundColor = "#e9ecef";
                    el.style.color = "#666";
                    el.style.borderColor = "#ddd";
                    el.style.boxShadow = "none";
                }
            });

            let eBtn = document.getElementById("btn-edit-notes");
            let uBtn = document.getElementById("btn-update-rec");
            if (uBtn) uBtn.style.display = "none";
            if (eBtn) eBtn.style.display = "inline-block";
            return false;
        }
    }
}, true);
