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
    let y = document.getElementById("ts-year").value;
    let m = parseInt(document.getElementById("ts-month").value) + 1;
    let d = document.getElementById("ts-day").value;
    let h = document.getElementById("ts-hour").value;
    let min = document.getElementById("ts-minute").value;
    let timeStr = `${y}/${m}/${d} ${h}:${min.padStart(2, '0')}`;

    let citySel = document.getElementById("city-select");
    let locStr = "自訂位置";
    if (citySel && citySel.selectedIndex > -1) {
        locStr = citySel.options[citySel.selectedIndex].text.replace("📍 ", "");
    }

    if (typeof window.syncStatusMsg === 'function') {
        window.syncStatusMsg(`<span style="color:#dc3545; font-weight:bold;">🕒 ${timeStr}</span>`, `<span style="color:#dc3545; font-weight:bold;">📍 ${locStr}</span>`);
    }

    // ★ 新增標記：使用者已經自訂過時間了，接下來起卦請勿自動覆蓋成現在時間
    window.isCustomTimeSet = true;

    if (window.showToast) window.showToast("✅ 自訂時位已儲存！");
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
        // ★ 加上 div 包覆置中
        nextHint.innerHTML = `<div style="text-align:center;">${endMsg}<br><span style='font-size:0.8em; opacity:0.8;'>請點擊畫面以繼續</span></div>`;
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
                // ★ 加上 div 包覆置中
                nextHint.innerHTML = `<div style="text-align:center;">${endMsg}<br><span style='font-size:0.8em; opacity:0.8;'>請等待 ${left.toFixed(2)} 秒以繼續</span></div>`;
                if (left <= 0) { clearInterval(timer); r(); }
            }, 20);
            // ★ 加上 div 包覆置中
            nextHint.innerHTML = `<div style="text-align:center;">${endMsg}<br><span style='font-size:0.8em; opacity:0.8;'>請等待 ${animCfg.endTime.toFixed(2)} 秒以繼續</span></div>`;
        });
    }
    return result;
}

// ==========================================
// ★ 單一爻的完整動畫儀式 (陣列脈衝震動 + 掉落震動版)
// ==========================================
async function castRitualFlow(isFirst, yaoName) {
    await loadSettings();
    let overlay = document.getElementById("anim-overlay");
    let nextHint = document.getElementById("next-yao-hint");
    let msgEl = document.getElementById("anim-msg");
    let shakeHint = document.getElementById("shake-hint");

    // ★ 終極鎖定 1：讓下方提示文字絕對定位，脫離排版流，絕對不推擠上方龜殼！
    shakeHint.style.position = "absolute";
    shakeHint.style.bottom = "12%";
    shakeHint.style.left = "0";
    shakeHint.style.width = "100%";
    shakeHint.style.textAlign = "center";
    shakeHint.style.margin = "0";

    nextHint.style.position = "absolute";
    nextHint.style.bottom = "12%";
    nextHint.style.left = "0";
    nextHint.style.width = "100%";
    nextHint.style.textAlign = "center";
    nextHint.style.margin = "0";

    overlay.style.display = "flex";
    nextHint.style.display = "none";
    shakeHint.style.display = "none";

    overlay.style.userSelect = "none";
    overlay.style.webkitUserSelect = "none";
    overlay.style.webkitTouchCallout = "none";
    overlay.oncontextmenu = (e) => { e.preventDefault(); return false; };

    const rawChar = `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="47" fill="#b67c33" stroke="#3e210b" stroke-width="6"/><rect x="35" y="35" width="30" height="30" fill="none" stroke="#3e210b" stroke-width="5"/><text x="50" y="30" font-family="sans-serif" font-size="24" font-weight="900" fill="#1f0f04" text-anchor="middle">乾</text><text x="50" y="86" font-family="sans-serif" font-size="24" font-weight="900" fill="#1f0f04" text-anchor="middle">隆</text><text x="84" y="58" font-family="sans-serif" font-size="24" font-weight="900" fill="#1f0f04" text-anchor="middle">通</text><text x="16" y="58" font-family="sans-serif" font-size="24" font-weight="900" fill="#1f0f04" text-anchor="middle">寶</text></svg>`;
    const rawManchu = `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="47" fill="#b67c33" stroke="#3e210b" stroke-width="6"/><rect x="35" y="35" width="30" height="30" fill="none" stroke="#3e210b" stroke-width="5"/><path d="M 20 40 Q 15 50 25 65 M 25 35 L 25 45" fill="none" stroke="#1f0f04" stroke-width="8" stroke-linecap="round"/><path d="M 80 35 L 80 65 Q 85 55 75 45" fill="none" stroke="#1f0f04" stroke-width="8" stroke-linecap="round"/></svg>`;
    const rawShell = `<svg viewBox="0 0 100 120" xmlns="http://www.w3.org/2000/svg"><ellipse cx="50" cy="60" rx="45" ry="55" fill="#5c4033" stroke="#2a1610" stroke-width="4"/><path d="M 50 15 L 75 35 L 75 85 L 50 105 L 25 85 L 25 35 Z" fill="#7a5441" stroke="#2a1610" stroke-width="3"/><path d="M 25 35 L 9 25 M 75 35 L 91 25 M 25 85 L 9 95 M 75 85 L 91 95 M 50 15 L 50 5 M 50 105 L 50 115 M 25 60 L 75 60" stroke="#2a1610" stroke-width="3"/></svg>`;

    const yinSvg = `data:image/svg+xml;utf8,${encodeURIComponent(rawChar)}`;
    const yangSvg = `data:image/svg+xml;utf8,${encodeURIComponent(rawManchu)}`;
    const shellSvg = `data:image/svg+xml;utf8,${encodeURIComponent(rawShell)}`;

    let uiSpeed = animCfg.turtleSpeed || 1;
    let baseDuration = 0.45 - (uiSpeed - 1) * 0.03;
    let shakeDuration = baseDuration;

    // 1. 靜止等待狀態
    const qianlongStaticHtml = `
        <div style="position:relative; width:100vw; height:320px;">
            <div style="position:absolute; top:10px; left:calc(50% - 50px); width:100px; height:120px; background-image:url('${shellSvg}'); background-size:cover; filter: drop-shadow(0 10px 8px rgba(0,0,0,0.5)); transition: transform 0.2s;"></div>
        </div>`;

    // 2. 搖晃狀態
    const qianlongShakeHtml = `
        <style>
            @keyframes turtle-shake { 
                0% { transform: translate(1px, 1px) rotate(0deg); } 
                20% { transform: translate(-4px, 0px) rotate(5deg); } 
                40% { transform: translate(2px, -2px) rotate(5deg); } 
                60% { transform: translate(-4px, 2px) rotate(0deg); } 
                80% { transform: translate(-2px, -2px) rotate(5deg); } 
                100% { transform: translate(2px, -3px) rotate(-5deg); } 
            }
            /* 硬幣維持 65px，調整位移幅度讓大硬幣的推擠感更真實 */
            @keyframes coin-rattle-1 { 
                0% { transform: translate(0,0) rotate(0deg); } 
                25% { transform: translate(-8px, -12px) rotate(90deg); } 
                50% { transform: translate(10px, 6px) rotate(180deg); } 
                75% { transform: translate(-6px, 14px) rotate(270deg); } 
                100% { transform: translate(0,0) rotate(360deg); } 
            }
            @keyframes coin-rattle-2 { 
                0% { transform: translate(0,0) rotate(0deg); } 
                25% { transform: translate(12px, 8px) rotate(120deg); } 
                50% { transform: translate(-10px, -8px) rotate(240deg); } 
                75% { transform: translate(8px, -15px) rotate(300deg); } 
                100% { transform: translate(0,0) rotate(360deg); } 
            }
            @keyframes coin-rattle-3 { 
                0% { transform: translate(0,0) rotate(0deg); } 
                25% { transform: translate(-10px, 15px) rotate(-90deg); } 
                50% { transform: translate(8px, -12px) rotate(-180deg); } 
                75% { transform: translate(-8px, 8px) rotate(-270deg); } 
                100% { transform: translate(0,0) rotate(-360deg); } 
            }
        </style>
        <div style="position:relative; width:100vw; height:320px;">
            <!-- 將硬幣恢復為 65px (與落幣時完全一致)，精準藏在龜殼中心點正後方 -->
            <div style="position:absolute; width:65px; height:65px; border-radius:50%; background-image:url('${yangSvg}'); background-size:cover; animation: coin-rattle-1 0.15s linear infinite; top:30px; left:calc(50% - 32.5px); z-index:1;"></div>
            <div style="position:absolute; width:65px; height:65px; border-radius:50%; background-image:url('${yinSvg}'); background-size:cover; animation: coin-rattle-2 0.18s linear infinite; top:30px; left:calc(50% - 32.5px); z-index:1;"></div>
            <div style="position:absolute; width:65px; height:65px; border-radius:50%; background-image:url('${yangSvg}'); background-size:cover; animation: coin-rattle-3 0.2s linear infinite; top:30px; left:calc(50% - 32.5px); z-index:1;"></div>
            
            <!-- 龜殼本體在最上層 (z-index: 3) -->
            <div id="turtle-anim-box" style="position:absolute; top:10px; left:calc(50% - 50px); width:100px; height:120px; background-image:url('${shellSvg}'); background-size:cover; animation: turtle-shake ${shakeDuration}s infinite; filter: drop-shadow(0 15px 10px rgba(0,0,0,0.6)); z-index:3;"></div>
        </div>`;

    const tossThreeCoins = () => { /* ...原本的函式保留... */
        let c = 0;
        for (let j = 0; j < 3; j++) { if (Math.random() > 0.5) c++; }
        return ["老陰", "少陽", "少陰", "老陽"][c];
    };

    if (isFirst) {
        msgEl.innerText = "請誠心思考占卜事情......";
        shakeHint.innerText = "思考完畢後，點擊畫面開始";
        shakeHint.style.display = "block";
        window.lastCastCoins = null;

        let taichiHtml = `<style>@keyframes breathe { 0% { transform: scale(1); opacity: 0.8; } 50% { transform: scale(1.15); opacity: 1; filter: drop-shadow(0 0 15px rgba(255,255,255,0.6)); } 100% { transform: scale(1); opacity: 0.8; } }</style>
        <div class="anim-emoji" style="animation: breathe 2.5s ease-in-out infinite;">☯️</div>`;

        await playPhase('img_prep', taichiHtml, 0);
        await new Promise(resolve => {
            const startCasting = () => { overlay.removeEventListener('click', startCasting); resolve(); };
            overlay.addEventListener('click', startCasting);
        });
        shakeHint.style.display = "none";
    }

    msgEl.innerText = `正在起【${yaoName}】`;
    let result = "";
    let classMap = { "少陽": "seal-sy", "老陽": "seal-oy", "少陰": "seal-sn", "老陰": "seal-on" };

    let defaultBox = document.getElementById("anim-default");
    document.getElementById("anim-img").style.display = "none";

    // 3. 銅錢收回狀態
    if (!isFirst && animCfg.tossMode === 'qianlong' && window.lastCastCoins) {
        msgEl.innerText = "收起銅錢...";
        let retractHtml = `
        <style>
            @keyframes retract1 { 0% { transform: translate(-45px, 80px) scale(0.9); opacity: 1; } 100% { transform: translate(0, 30px) scale(0.3); opacity: 0; } }
            @keyframes retract2 { 0% { transform: translate(45px, 80px) scale(0.9); opacity: 1; } 100% { transform: translate(0, 30px) scale(0.3); opacity: 0; } }
            @keyframes retract3 { 0% { transform: translate(0px, 115px) scale(0.9); opacity: 1; } 100% { transform: translate(0, 30px) scale(0.3); opacity: 0; } }
        </style>
        <div style="position:relative; width:100vw; height:320px;">
            <div style="position:absolute; top:10px; left:calc(50% - 50px); width:100px; height:120px; background-image:url('${shellSvg}'); background-size:cover; filter: drop-shadow(0 15px 10px rgba(0,0,0,0.6)); z-index:4;"></div>
            <div style="position:absolute; left:calc(50% - 32.5px); width:65px; height:65px; border-radius:50%; background-image:url('${window.lastCastCoins[0]}'); background-size:cover; animation: retract1 0.4s ease-in forwards; z-index:2; top: 30px;"></div>
            <div style="position:absolute; left:calc(50% - 32.5px); width:65px; height:65px; border-radius:50%; background-image:url('${window.lastCastCoins[1]}'); background-size:cover; animation: retract2 0.4s ease-in forwards; z-index:2; top: 30px;"></div>
            <div style="position:absolute; left:calc(50% - 32.5px); width:65px; height:65px; border-radius:50%; background-image:url('${window.lastCastCoins[2]}'); background-size:cover; animation: retract3 0.4s ease-in forwards; z-index:2; top: 30px;"></div>
        </div>`;
        defaultBox.innerHTML = retractHtml;
        defaultBox.style.display = "block";
        await new Promise(r => setTimeout(r, 450));
        msgEl.innerText = `正在起【${yaoName}】`;
    }

    defaultBox.innerHTML = animCfg.tossMode === 'qianlong' ? qianlongStaticHtml : '<div class="anim-emoji">🌗</div>';
    defaultBox.style.display = "block";

    let tossTrigger = animCfg.tossTrigger || 'press';
    let skipFixedTossDelay = false;

    if (tossTrigger === 'press') {
        shakeHint.innerText = "👆 按住畫面不放開始搖卦，鬆開即落幣";
        shakeHint.style.display = "block";
        overlay.style.touchAction = 'none';

        result = await new Promise(resolve => {
            let currentRes = tossThreeCoins();
            // ★ 保留未來的 APP 震動變數
            let disturbTimer = null, vibTimer = null, isShaking = false, isDone = false, maxTimeFallback = null;
            let pressStartTime = 0, startX = 0, startY = 0;
            let currentVibTime = 20;

            const startShaking = (e) => {
                if (e && e.cancelable) e.preventDefault();
                if (isDone || isShaking) return;
                isShaking = true;
                pressStartTime = Date.now();

                if (e && e.clientX !== undefined) {
                    startX = e.clientX;
                    startY = e.clientY;
                }

                let moveHint = animCfg.turtleMoveSpeed ? " (滑動可加速)" : "";
                shakeHint.innerText = `搖動中...${moveHint} (鬆開即可落幣)`;
                defaultBox.innerHTML = animCfg.tossMode === 'qianlong' ? qianlongShakeHtml : '<div class="anim-emoji" style="animation: spin 0.2s linear infinite;">🌗</div>';

                // ==========================================
                // TODO: 未來打包為原生 Android APP 時，解開此註解可實現拖曳變速震動
                // ==========================================
                /*
                if (animCfg.turtleVibrate && navigator.vibrate) {
                    vibTimer = setInterval(() => { 
                        navigator.vibrate(currentVibTime); 
                    }, 80); 
                }
                */

                disturbTimer = setInterval(() => { currentRes = tossThreeCoins(); }, 30);
                maxTimeFallback = setTimeout(() => { stopShaking(null); }, 5000);
            };

            const onMove = (e) => {
                if (!isShaking || !animCfg.turtleMoveSpeed || animCfg.tossMode !== 'qianlong') return;
                if (e.clientX === undefined || e.clientY === undefined) return;

                let dist = Math.sqrt(Math.pow(e.clientX - startX, 2) + Math.pow(e.clientY - startY, 2));
                let effort = Math.min(15, Math.floor(dist / 15));
                let finalDur = Math.max(0.02, baseDuration - (effort * 0.015));

                currentVibTime = 20 + (effort * 3);

                let turtleBox = document.getElementById('turtle-anim-box');
                if (turtleBox) {
                    turtleBox.style.animationDuration = `${finalDur}s`;
                }
            };

            const stopShaking = (e) => {
                if (e && e.cancelable && e.type !== 'pointercancel') e.preventDefault();
                if (isDone || !isShaking) return;

                let duration = Date.now() - pressStartTime;
                if (duration < 500 && e !== null) {
                    isShaking = false;
                    clearInterval(disturbTimer);
                    // if (vibTimer) clearInterval(vibTimer); // 未來 APP 用
                    if (navigator.vibrate) navigator.vibrate(0);
                    clearTimeout(maxTimeFallback);

                    shakeHint.innerHTML = "⚠️ <span style='color:#dc3545;'>按壓時間太短</span>，請長按不要放";
                    defaultBox.innerHTML = animCfg.tossMode === 'qianlong' ? qianlongStaticHtml : '<div class="anim-emoji">🌗</div>';

                    setTimeout(() => {
                        if (!isShaking && !isDone) shakeHint.innerText = "👆 按住畫面不放開始搖卦，鬆開即落幣";
                    }, 1500);
                    return;
                }

                isDone = true;
                clearInterval(disturbTimer);
                // if (vibTimer) clearInterval(vibTimer); // 未來 APP 用
                clearTimeout(maxTimeFallback);

                // ==========================================
                // ★ 網頁版核心破解：在放開手指的瞬間發送「預約震動」
                // [微震1ms(騙過瀏覽器), 靜音500ms(等銅錢飛), 震動40ms... (模擬三枚落地)]
                // ==========================================
                if (animCfg.tossMode === 'qianlong' && animCfg.turtleVibrate && navigator.vibrate) {
                    navigator.vibrate([1, 500, 30, 40, 40, 40, 50]);
                }

                cleanup();
                resolve(currentRes);
            };

            const onDown = (e) => startShaking(e);
            const onUp = (e) => stopShaking(e);
            const onPointerMove = (e) => onMove(e);

            const cleanup = () => {
                overlay.style.touchAction = 'auto';
                overlay.removeEventListener('pointerdown', onDown);
                document.removeEventListener('pointerup', onUp);
                document.removeEventListener('pointercancel', onUp);
                document.removeEventListener('pointermove', onPointerMove);
            };

            overlay.addEventListener('pointerdown', onDown, { passive: false });
            document.addEventListener('pointerup', onUp, { passive: false });
            document.addEventListener('pointercancel', onUp, { passive: false });
            document.addEventListener('pointermove', onPointerMove, { passive: false });
        });

        if (animCfg.tossMode !== '3d') skipFixedTossDelay = true;
    }
    else {
        shakeHint.innerText = tossTrigger === 'shake' ? "📳 請搖晃手機開始搖卦..." : "👆 點擊畫面開始搖卦...";
        shakeHint.style.display = "block";
        await waitForShakeOrClick();
        result = tossThreeCoins();
    }

    shakeHint.style.display = "none";
    msgEl.innerText = "";

    // 4. 落幣階段
    if (animCfg.tossMode === 'qianlong') {
        let coins = [];
        if (result === "老陽") coins = [yangSvg, yangSvg, yangSvg];
        else if (result === "少陰") coins = [yangSvg, yangSvg, yinSvg];
        else if (result === "少陽") coins = [yangSvg, yinSvg, yinSvg];
        else if (result === "老陰") coins = [yinSvg, yinSvg, yinSvg];
        coins.sort(() => Math.random() - 0.5);

        let dropHtml = `
        <style>
            @keyframes drop1 { 0% { transform: translate(0, 30px) scale(0.3); opacity: 0; } 30% { opacity: 1; } 100% { transform: translate(-45px, 80px) scale(0.9); opacity: 1; } }
            @keyframes drop2 { 0% { transform: translate(0, 30px) scale(0.3); opacity: 0; } 30% { opacity: 1; } 100% { transform: translate(45px, 80px) scale(0.9); opacity: 1; } }
            @keyframes drop3 { 0% { transform: translate(0, 30px) scale(0.3); opacity: 0; } 30% { opacity: 1; } 100% { transform: translate(0px, 115px) scale(0.9); opacity: 1; } }
        </style>
        <div style="position:relative; width:100vw; height:320px;">
            <div style="position:absolute; top:10px; left:calc(50% - 50px); width:100px; height:120px; background-image:url('${shellSvg}'); background-size:cover; filter: drop-shadow(0 15px 10px rgba(0,0,0,0.6)); z-index:4;"></div>
            <div style="position:absolute; left:calc(50% - 32.5px); width:65px; height:65px; border-radius:50%; background-image:url('${coins[0]}'); background-size:cover; animation: drop1 0.5s cubic-bezier(0.25, 1, 0.5, 1) forwards; z-index:2; top: 30px; box-shadow:0 5px 8px rgba(0,0,0,0.5);"></div>
            <div style="position:absolute; left:calc(50% - 32.5px); width:65px; height:65px; border-radius:50%; background-image:url('${coins[1]}'); background-size:cover; animation: drop2 0.5s cubic-bezier(0.25, 1, 0.5, 1) forwards; z-index:2; top: 30px; box-shadow:0 5px 8px rgba(0,0,0,0.5);"></div>
            <div style="position:absolute; left:calc(50% - 32.5px); width:65px; height:65px; border-radius:50%; background-image:url('${coins[2]}'); background-size:cover; animation: drop3 0.5s cubic-bezier(0.25, 1, 0.5, 1) forwards; z-index:2; top: 30px; box-shadow:0 5px 8px rgba(0,0,0,0.5);"></div>
        </div>`;

        defaultBox.innerHTML = dropHtml;
        await new Promise(r => setTimeout(r, 600));

        // 5. 最終印章顯示階段 (絕對定位將印章死死釘在 320px 的最底部)
        let resultHtml = `
        <div style="position:relative; width:100vw; height:320px;">
            <div style="position:absolute; top:10px; left:calc(50% - 50px); width:100px; height:120px; background-image:url('${shellSvg}'); background-size:cover; filter: drop-shadow(0 15px 10px rgba(0,0,0,0.6)); z-index:4;"></div>
            <div style="position:absolute; left:calc(50% - 32.5px); width:65px; height:65px; border-radius:50%; background-image:url('${coins[0]}'); background-size:cover; transform: translate(-45px, 80px) scale(0.9); z-index:2; top: 30px; box-shadow:0 5px 8px rgba(0,0,0,0.5);"></div>
            <div style="position:absolute; left:calc(50% - 32.5px); width:65px; height:65px; border-radius:50%; background-image:url('${coins[1]}'); background-size:cover; transform: translate(45px, 80px) scale(0.9); z-index:2; top: 30px; box-shadow:0 5px 8px rgba(0,0,0,0.5);"></div>
            <div style="position:absolute; left:calc(50% - 32.5px); width:65px; height:65px; border-radius:50%; background-image:url('${coins[2]}'); background-size:cover; transform: translate(0px, 115px) scale(0.9); z-index:2; top: 30px; box-shadow:0 5px 8px rgba(0,0,0,0.5);"></div>
            <div class="yin-seal ${classMap[result]}" style="position:absolute; bottom:15px; left:50%; transform:translateX(-50%); font-size: 2.5rem; padding: 5px 20px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.3); z-index: 10;">${result.slice(0, 2)}</div>
        </div>`;

        defaultBox.innerHTML = resultHtml;
        window.lastCastCoins = coins;
        await new Promise(r => setTimeout(r, animCfg.tmSy * 1000));
    }
    else if (animCfg.tossMode === '3d') {
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
                <div class="coin-wrapper" style="animation: flip-${face} ${animCfg.tmToss}s cubic-bezier(0.2, 0.8, 0.3, 1) forwards; animation-delay:${i * 0.15}s;">
                    <div class="coin-face coin-front" style="background-image: url('${frontImg}')"></div>
                    <div class="coin-face coin-back" style="background-image: url('${backImg}')"></div>
                </div>
            `).join('')}
        </div>`;

        defaultBox.innerHTML = coinHtml;
        await new Promise(r => setTimeout(r, (animCfg.tmToss + 0.3) * 1000));

        let sealHtml = `<div class="yin-seal ${classMap[result]}" style="font-size: 3.5rem; padding: 15px 30px; border-radius: 10px;">${result.slice(0, 2)}</div>`;
        await playPhase(`img_${classMap[result].split('-')[1]}`, sealHtml, animCfg.tmSy);
    }
    else {
        if (!skipFixedTossDelay) {
            defaultBox.innerHTML = '<div class="anim-emoji" style="animation: spin 0.5s linear infinite;">🌗</div>';
            await new Promise(r => setTimeout(r, animCfg.tmToss * 1000));
        }
        let sealHtml = `<div class="yin-seal ${classMap[result]}" style="font-size: 3.5rem; padding: 15px 30px; border-radius: 10px;">${result.slice(0, 2)}</div>`;
        await playPhase(`img_${classMap[result].split('-')[1]}`, sealHtml, animCfg.tmSy);
    }

    let yaoOrder = ["初爻", "二爻", "三爻", "四爻", "五爻", "上爻"];
    let currIdx = yaoOrder.indexOf(yaoName);
    if (currIdx !== -1) {
        let rowContainer = document.getElementById("yao-sel-" + currIdx);
        if (rowContainer) {
            let castBtn = rowContainer.parentElement.querySelector('button');
            if (castBtn) {
                castBtn.style.opacity = '0.3';
                castBtn.style.pointerEvents = 'none';
                castBtn.style.filter = 'grayscale(100%)';
                castBtn.style.boxShadow = 'none';
            }
        }
    }

    let tempEndMode = animCfg.endMode;
    let tempEndTime = animCfg.endTime;
    if (animCfg.tossMode === 'qianlong' && animCfg.turtleAutoNext) {
        animCfg.endMode = 'auto';
        animCfg.endTime = 0.8;
    }

    let finalRes = await handleRitualEnd(result, nextHint, overlay, msgEl);

    if (animCfg.tossMode === 'qianlong' && animCfg.turtleAutoNext) {
        animCfg.endMode = tempEndMode;
        animCfg.endTime = tempEndTime;
    }

    return finalRes;
}

// ★ 加入全域鎖，防止狂點按鈕引發的時序錯亂
window.isCastingYao = false;

// ==========================================
// ★ 手動/連續單爻起卦控制 (包含草稿儲存與黑幕無縫接力)
// ==========================================
async function castSingleYao(idx) {
    // 1. 防連點
    if (window.isCastingYao) return;

    // 2. 順序防呆
    if (idx !== AppState.currentCastStep) {
        if (window.showAlert) {
            window.showAlert(AppState.currentCastStep === 0
                ? "請從第一爻 (初爻) 擲起！\n(若欲手動選爻，請選完六爻後按「手動起卦」)"
                : `請先擲第 ${AppState.currentCastStep + 1} 爻！`);
        }
        return;
    }

    // 3. 上鎖
    window.isCastingYao = true;

    // 鎖死下拉選單
    for (let i = 0; i < 6; i++) {
        let sel = document.getElementById("yao-sel-" + i);
        if (sel) sel.disabled = true;
    }

    let yaoNames = ['初爻', '二爻', '三爻', '四爻', '五爻', '上爻'];
    let result = await castRitualFlow(idx === 0, yaoNames[idx]);

    // 填入資料並更新印章
    let selTarget = document.getElementById(`yao-sel-${idx}`);
    if (selTarget) selTarget.value = result;
    updateYaoSeal(idx);

    AppState.currentCastStep++;

    // ★ 在前 5 爻時才存草稿，第 6 爻會直接正式排盤
    if (AppState.currentCastStep < 6 && typeof window.saveDraftToHistory === 'function') {
        window.saveDraftToHistory();
    }

    // ★ 檢查是否啟用「連續起爻」
    let autoNextCb = document.getElementById("auto-next-yao");
    let isAutoNext = autoNextCb && autoNextCb.checked && AppState.currentCastStep < 6;

    // 如果沒有勾連續起爻，才把防護黑幕關掉
    if (!isAutoNext) {
        document.getElementById("anim-overlay").style.display = "none";
    } else {
        // 若勾選連續，黑幕保持常駐！直接將文字切換為下一爻的準備狀態
        let msgEl = document.getElementById("anim-msg");
        if (msgEl) msgEl.innerText = `準備起【${yaoNames[AppState.currentCastStep]}】...`;
    }

    // 暫時解鎖，以利觸發下一爻或排盤
    window.isCastingYao = false;

    // ★ 路由分發
    if (AppState.currentCastStep >= 6) {
        document.getElementById("anim-overlay").style.display = "none"; // 六爻完畢，強制關閉黑幕
        AppState.currentCastStep = 0;

        // ★ 完美修復：正確帶入起卦方式標籤
        startManual("A 電腦起爻");

    } else if (isAutoNext) {
        // ★ 無縫接力：延遲 400 毫秒後，直接在背景自動呼叫下一爻 (黑幕全程保護)
        setTimeout(() => {
            castSingleYao(AppState.currentCastStep);
        }, 400);
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
    if (typeof startManual === 'function') startManual("A 電腦起卦");
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
// ★ 清空首頁起卦面板狀態 (包含解鎖與解除反灰)
// ==========================================
function resetManualUI() {
    for (let i = 0; i < 6; i++) {
        let sel = document.getElementById("yao-sel-" + i);
        let seal = document.getElementById("yao-seal-" + i);

        // 1. 清空下拉選單，並【解除禁用鎖定】
        if (sel) {
            sel.value = "";
            sel.disabled = false;
        }

        // 2. 隱藏並清空印章
        if (seal) {
            seal.className = "yin-seal";
            seal.style.display = "none";
            seal.innerText = "";
        }

        // 3. ★ 核心修復：解除按鈕的反灰鎖死狀態
        let rowContainer = document.getElementById("yao-sel-" + i);
        if (rowContainer) {
            let castBtn = rowContainer.parentElement.querySelector('button');
            if (castBtn) {
                castBtn.style.opacity = '1';
                castBtn.style.pointerEvents = 'auto';
                castBtn.style.filter = 'none';
                castBtn.style.boxShadow = '0 1px 2px rgba(0,0,0,0.2)'; // 恢復原本 CSS 的立體陰影
            }
        }
    }

    // 4. 清空占卜問題欄位
    let qInput = document.getElementById("p-question");
    if (qInput) qInput.value = "";

    // 5. 把起爻進度歸零
    if (window.AppState) {
        window.AppState.currentCastStep = 0;
    }

    // 6. 解除全域起卦鎖定，避免有時中斷造成的按鈕卡死
    window.isCastingYao = false;

    // 7. 清除緊急儲存草稿
    localStorage.removeItem("ly_yao_draft");

    // 8. 當正式排盤完成後，自動從資料庫把剛才的草稿刪除！
    if (window.currentDraftId) {
        localforage.getItem('iching_final_v60').then(recs => {
            if (recs) {
                let draftIdx = recs.findIndex(r => r.id === window.currentDraftId);
                if (draftIdx !== -1) {
                    recs.splice(draftIdx, 1);
                    localforage.setItem('iching_final_v60', recs).then(() => {
                        // 如果背景剛好在紀錄列表，順便幫它重整畫面
                        if (window.location.hash === '#records' && typeof window.showRecords === 'function') {
                            window.showRecords(true);
                        }
                    });
                }
            }
            window.currentDraftId = null;
        });
    }

    // 9. 恢復首頁標題 (若從草稿進來的話)
    if (typeof window.restorePortalUI === 'function') {
        window.restorePortalUI();
    }

    // 10. 核心修復：強制關閉起爻動畫黑幕與震動 (防返回鍵卡死)
    let overlay = document.getElementById("anim-overlay");
    if (overlay) overlay.style.display = "none";
    if (navigator.vibrate) navigator.vibrate(0);
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
    // ★ 處理修改紀錄彈窗 (#editrec) 手機返回鍵攔截
    // ==========================================
    if (oldHash === "#editrec" && hash !== "#editrec") {
        let overlay = document.getElementById('smart-edit-overlay');
        if (overlay) {
            overlay.style.animation = "fadeOut 0.2s forwards";
            if (overlay.firstChild) overlay.firstChild.style.animation = "fadeOut 0.2s forwards";
            setTimeout(() => {
                overlay.remove();
                document.body.style.overflow = "";
                document.body.style.height = "";
                let recView = document.getElementById("records-view");
                if (recView) recView.style.overflow = "auto";
            }, 200);
        }
    }

    // ★ 處理自訂警告彈窗 (#lymodal) 的清除與 Promise 釋放
    if (oldHash === "#lymodal" && hash !== "#lymodal") {
        let overlay = document.getElementById('ly-smart-modal-overlay');
        if (overlay) {
            overlay.style.animation = "smartFadeOut 0.2s forwards";
            if (overlay.firstChild) overlay.firstChild.style.animation = "smartBoxFadeOut 0.2s forwards";
            setTimeout(() => {
                overlay.remove();
                if (typeof window._lyModalPromiseResolver === 'function') {
                    window._lyModalPromiseResolver(window._lyModalCancelValue);
                    window._lyModalPromiseResolver = null;
                }
            }, 200);
        }
    }

    // 如果進入了彈窗，直接中斷路由渲染，讓背後的結果頁維持原樣！
    if (hash === "#lymodal" || hash === "#editrec") {
        return;
    }

    // ⛔ 攔截 1：離開排盤結果頁 (#result)
    if (oldHash === "#result" && hash !== "#result") {
        if (window._isConfirmingExit) {
            history.pushState(null, "", "#result");
            return;
        }

        let currentStateStr = typeof window.getCurrentStateSnapshotString === 'function' ? window.getCurrentStateSnapshotString() : "";
        let notesChanged = (currentStateStr !== window.recordNotesSnapshot);
        window.recordNotesSnapshot = window.getCurrentStateSnapshotString();

        let hasValidData = window.AppState && window.AppState.curData && window.AppState.curData.lines;
        let noteInput = document.getElementById("edit-note");
        let isUnlocked = noteInput && !noteInput.readOnly;

        if (hasValidData) {
            if (isUnlocked && notesChanged) {
                window._isConfirmingExit = true;
                history.pushState(null, "", "#result");

                window.showConfirm("⚠️ 您的筆記有修改但尚未更新（上鎖），確定要直接離開嗎？\n(離開將為您暫存目前的輸入狀態)").then(ok => {
                    window._isConfirmingExit = false;
                    if (ok) {
                        window.emergencySave();
                        window.comesFromRecords = true;
                        window.location.replace(hash);
                    }
                });
                return;
            } else {
                window.emergencySave();
            }
        }
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
            window.location.hash = "#settings";

            let diffMsgBox = document.getElementById("settings-diff-msg");
            if (diffMsgBox) diffMsgBox.innerHTML = `📝 <b>您變更了：</b><br>${changedNames.join("、")}`;
            let confirmModal = document.getElementById("settings-confirm-modal");
            if (confirmModal) confirmModal.style.display = "flex";
            return;
        }
    }

    // --- 視窗顯示控制 ---
    let tModal = document.getElementById("time-modal");
    let sModal = document.getElementById("settings-modal");
    if (tModal) tModal.style.display = "none";
    if (sModal) sModal.style.display = "none";
    document.body.style.overflow = "";

    if (hash === "#time") {
        if (tModal) { tModal.style.display = "flex"; document.body.style.overflow = "hidden"; }
        return;
    }
    if (hash === "#settings") {
        if (sModal) { sModal.style.display = "flex"; document.body.style.overflow = "hidden"; }
        return;
    }

    // ==========================================
    // ★ 捲軸記憶與精準隱藏系統 (已修復大括號與塌陷問題)
    // ==========================================
    let pView = document.getElementById("portal-view");
    let rView = document.getElementById("records-view");
    let resView = document.getElementById("result-view");
    let tView = document.getElementById("trash-view");

    // 1. 離開列表時，紀錄高度
    if (oldHash === "#records" && rView && rView.style.display !== "none") {
        window.lastRecScrollPos = rView.scrollTop;
    }

    // ★ 絕殺 1：精準隱藏！只隱藏「不是目標」的畫面，絕對不讓目標畫面經歷 display: none
    if (hash !== "#home" && hash !== "" && pView) pView.style.display = "none";
    if (hash !== "#records" && rView) rView.style.display = "none";
    if (hash !== "#result" && resView) resView.style.display = "none";
    if (hash !== "#trash" && tView) tView.style.display = "none";

    // 脫掉暗黑濾鏡
    if (hash !== "#result" && hash !== "#editrec" && hash !== "#lymodal") {
        document.documentElement.classList.remove('recycle-bin-preview-mode');
    }

    // --- 路由畫面切換 ---
    if (hash === "#records") {
        if (rView) {
            rView.style.display = "block";
        }

        let renderPromise = null;
        if (typeof showRecords === 'function') {
            renderPromise = showRecords(oldHash === "#result");
        }

        // ★ 絕殺：列表專屬還原，同時釘死內部與外部捲軸！
        const restoreScroll = () => {
            let targetPos = window.lastRecScrollPos || 0;
            if (rView) rView.scrollTop = targetPos;
            window.scrollTo(0, targetPos);

            let retryCount = 0;
            if (window.lyScrollInterval) clearInterval(window.lyScrollInterval);
            window.lyScrollInterval = setInterval(() => {
                if (rView && rView.scrollTop !== targetPos) rView.scrollTop = targetPos;
                if (window.scrollY !== targetPos) window.scrollTo(0, targetPos);
                retryCount++;
                if (retryCount >= 10) clearInterval(window.lyScrollInterval);
            }, 30);
        };

        if (renderPromise && typeof renderPromise.then === 'function') {
            renderPromise.then(() => setTimeout(restoreScroll, 20));
        } else {
            setTimeout(restoreScroll, 300);
        }
    }
    else if (hash === "#trash") {
        if (tView) tView.style.display = "flex";
        if (typeof showTrash === 'function') showTrash();
    }
    else if (hash === "#result") {
        // 防呆：如果是重新整理，記憶體被清空，強制退回首頁
        if (!window.AppState || !window.AppState.curData || !window.AppState.curData.lines) {
            window._ignoreHashChange = true;
            window.location.hash = "#home";
            handleRouting();
            return;
        }

        let resView = document.getElementById("result-view");
        if (resView) {
            resView.style.display = "flex";
        }

        // 1. 強制歸零，防止被舊記錄的捲軸殘留干擾
        if (resView) resView.scrollTop = 0;
        window.scrollTo(0, 0);

        // ==========================================
        // ★ 終極修復：四柱精準定位 (放棄動畫，直接絕對賦值)
        // ==========================================
        setTimeout(() => {
            let bzDay = document.getElementById("bz-d");

            if (bzDay && resView) {
                let parentLine = bzDay.closest('div[style*="border-top"]');
                let anchor = parentLine ? parentLine : document.getElementById("bazi-anchor") || bzDay;

                // 遞迴計算元素的絕對物理高度 (最穩定，完全不受捲動狀態干擾)
                let offset = 0;
                let curr = anchor;
                while (curr && curr !== resView && curr !== document.body) {
                    offset += curr.offsetTop;
                    curr = curr.offsetParent;
                }

                // 扣除 55px (閃過導覽列並保留呼吸空間)
                let targetOffset = Math.max(0, offset - 55);

                // ★ 暴力直接寫入，不依賴任何瀏覽器動畫行為
                resView.scrollTop = targetOffset;

                // 補槍防護：延遲 100 毫秒後，若捲軸被其他 DOM 撐開擠掉，強制再拉回！
                setTimeout(() => {
                    if (resView.scrollTop !== targetOffset) {
                        resView.scrollTop = targetOffset;
                    }
                }, 100);
            }
        }, 150); // 確保畫面 100% 渲染完成才計算

        if (oldHash !== "#result") {
            let editSub = document.getElementById("edit-subject");
            if (editSub && window.AppState && window.AppState.curData) {
                editSub.value = window.AppState.curData.subject || window.AppState.curData.question || "";
            }
            if (typeof window.getCurrentStateSnapshotString === 'function') {
                window.recordNotesSnapshot = window.getCurrentStateSnapshotString();
            }
        }
    }
    else {
        // #home 以及其他預設情況
        if (pView) pView.style.display = "block";
        window.comesFromRecords = false;
        window.lastRecScrollPos = 0; // 首頁歸零，確保新進列表置頂

        if (!history.state || history.state.trap !== 'active') {
            history.replaceState({ trap: 'base' }, "", "#home");
            history.pushState({ trap: 'active' }, "", "#home");
        }

        // ✅ 只有從「結果頁」返回、或「剛開網頁」時才執行
        if (oldHash === "#result" || oldHash === "") {
            let subjectInput = document.getElementById("p-question");
            if (subjectInput) subjectInput.value = "";

            // ★ 修正 3：返回首頁時，自動呼叫「帶入時位」，讓經緯度與最新時間自動歸位！
            if (typeof window.autoLocateCity === 'function') {
                setTimeout(window.autoLocateCity, 150);
            } else {
                // 降級備用方案
                let d = new Date();
                let yearEl = document.getElementById("ts-year");
                if (yearEl) {
                    yearEl.value = d.getFullYear();
                    document.getElementById("ts-month").value = d.getMonth();
                    document.getElementById("ts-day").value = d.getDate();
                    document.getElementById("ts-hour").value = d.getHours();
                    document.getElementById("ts-minute").value = d.getMinutes();
                }
                if (typeof window.syncStatusMsg === 'function') {
                    window.syncStatusMsg("🕒 目前時間", "📍 預設地點");
                }
            }
        }
    }
}
window.addEventListener("hashchange", handleRouting);

// ==========================================
// ★ 絕對起卦時間排序引擎 (永遠依據起卦時間降冪排序)
// ==========================================
window.sortRecordsByDivinationTime = function (recs) {
    recs.sort((a, b) => {
        // 抓取 dateStr (如 "2026-03-15 14:30" 或 "2026/03/15") 並轉換為時間戳
        let timeA = new Date((a.dateStr || "").replace(/-/g, '/')).getTime() || 0;
        let timeB = new Date((b.dateStr || "").replace(/-/g, '/')).getTime() || 0;
        return timeB - timeA; // 降冪排序：最新起卦的在最上方
    });
};

// ==========================================
// ★ 全域狀態快照擷取器 (包含筆記、應期、繪圖與排盤 UI 設定)
// ==========================================
window.getCurrentStateSnapshotString = function () {
    if (!window.AppState || !window.AppState.curData) return "";
    return JSON.stringify({
        subject: document.getElementById("edit-subject")?.value || window.AppState.curData.question || "未命名卦象",
        judge: document.getElementById("edit-judge")?.value || "",
        feedback: document.getElementById("edit-feedback")?.value || "",
        note: document.getElementById("edit-note")?.value || "",
        currentStatus: document.getElementById("edit-current-status")?.value || "", // ★ 新增
        copyAddon: document.getElementById("edit-copy-addon")?.value || "", // ★ 新增
        yingqi: typeof window.getSettingsYingqiSnapshot === 'function' ? window.getSettingsYingqiSnapshot() : {},
        najia: window.AppState.curData.najiaValue,
        fushen: window.AppState.curData.fushenValue,
        bian: window.AppState.curData.bianViewValue,
        draw: window.AppState.isDrawModeEnabled
    });
};

// ==========================================
// ★ 終極防線：離開時自動儲存 (僅限 UI 與應期狀態，絕對不偷存文字)
// ==========================================
window.emergencySave = function () {
    if (!window.AppState || !window.AppState.curData || !window.AppState.curData.lines) return;
    // ★ 新增防線：如果是回收桶預覽模式，絕對禁止背景偷存！
    if (window.AppState.curData.isTrashPreview) return;
    let currentStateStr = window.getCurrentStateSnapshotString();
    let stateObj = JSON.parse(currentStateStr);

    // ★ 權責分離：嚴格判定 UI 與應期狀態是否有變 (完全不管文字欄位)
    let isUiChanged = false;
    let oldYingqiStr = JSON.stringify(window.AppState.curData.yingqi || {});
    let newYingqiStr = JSON.stringify(stateObj.yingqi || {});

    if (oldYingqiStr !== newYingqiStr) isUiChanged = true;
    if (window.AppState.curData.isDrawModeEnabled !== stateObj.draw) isUiChanged = true;
    if (window.AppState.curData.najiaValue !== stateObj.najia) isUiChanged = true;
    if (window.AppState.curData.fushenValue !== stateObj.fushen) isUiChanged = true;
    if (window.AppState.curData.bianViewValue !== stateObj.bian) isUiChanged = true;

    // 如果 UI 狀態有變，或者這是一支尚未存過的新卦
    if (window.hasUnsavedChanges || isUiChanged) {
        // 【核心精神】只將 UI 與應期寫入記憶體，文字欄位(subject/note等)放生不存，維持原狀！
        window.AppState.curData.yingqi = stateObj.yingqi;
        window.AppState.curData.isDrawModeEnabled = stateObj.draw;
        if (stateObj.najia) window.AppState.curData.najiaValue = stateObj.najia;
        if (stateObj.fushen) window.AppState.curData.fushenValue = stateObj.fushen;
        if (stateObj.bian) window.AppState.curData.bianViewValue = stateObj.bian;

        // 寫入資料庫並強制套用起卦時間排序
        localforage.getItem('iching_final_v60').then(recs => {
            recs = recs || [];
            let cloneData = JSON.parse(JSON.stringify(window.AppState.curData));

            if (window.AppState.curRecIndex > -1) {
                recs[window.AppState.curRecIndex] = cloneData;
            } else {
                recs.unshift(cloneData);
            }

            // ★ 套用絕對起卦時間排序
            if (typeof window.sortRecordsByDivinationTime === 'function') {
                window.sortRecordsByDivinationTime(recs);
                // 排序後位置會變，重新定位當前索引
                window.AppState.curRecIndex = recs.findIndex(r => r.id === cloneData.id);
            }

            localforage.setItem('iching_final_v60', recs);
        }).catch(e => console.log("預防暫存失敗", e));

        window.hasUnsavedChanges = false;
    }

    // 無論如何，更新防線基準，這樣下一次就不會誤判
    window.recordNotesSnapshot = window.getCurrentStateSnapshotString();
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
    // ★ 優先防線：如果使用者按返回鍵時有面板開著，先將其關閉，並直接攔截後續的退出系統邏輯
    if (typeof window.closeActivePanels === 'function' && window.closeActivePanels()) {
        return;
    }

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
            exitSystem();
        }
    }
});

// --- 2. 攔截按鈕：精確控制返回節點 ---
window.goBackPortal = function () {
    document.documentElement.classList.remove('recycle-bin-preview-mode');
    if (typeof window.emergencySave === 'function') {
        window.emergencySave();
    }
    // ★ 優先防線：檢查是否有開啟的萬年曆或抽屜，有話就先收合它，不跳轉頁面
    if (typeof window.closeActivePanels === 'function' && window.closeActivePanels()) {
        return;
    }

    let editOverlay = document.getElementById("smart-edit-overlay");
    if (editOverlay) {
        let btnCancel = document.getElementById("smart-btn-cancel");
        if (btnCancel) { btnCancel.click(); return; }
    }

    // ★ 系統原有的智慧路由判斷
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
    // ==========================================
    // ★ 模組解耦：檢查萬年曆與應期系統是否存在
    // ==========================================
    if (typeof window.renderCalendarGrid !== 'function' || typeof Lunar === 'undefined') {
        // 隱藏核心應期區塊
        let coreHud = document.getElementById("core-yingqi-hud");
        if (coreHud) coreHud.style.display = "none";

        // 隱藏右側漂浮的尋找應期按鈕 (包含舊版🎯與新版扁長按鈕)
        let yqBtn = document.querySelector('button[title="尋找應期"], #yingqi-toggle-btn, #btn-show-core-yingqi');
        if (yqBtn) yqBtn.style.display = "none";

        // 隱藏側拉抽屜裡的萬年曆按鈕
        let drawerCalBtn = document.getElementById("drawer-btn-calendar");
        if (drawerCalBtn) drawerCalBtn.style.display = "none";
    }
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
    // ★ 檢查雲端模組狀態，決定是否顯示雲端開關與提示
    // ==========================================
    window.checkCloudKeyStatus = async function () {
        let containerHome = document.getElementById("auto-sync-container-home");
        let containerSettings = document.getElementById("auto-sync-container-settings");
        let hintMsg = document.getElementById("built-in-key-hint");

        // 抓取側拉抽屜裡的備份與還原按鈕
        let btnUpload = document.getElementById("drawer-btn-upload");
        let btnDownload = document.getElementById("drawer-btn-download");

        let customKey = await localforage.getItem('customDbConfig');
        let hasCustomKey = customKey && customKey.trim().length > 0;
        let hasBuiltInKey = window.hasBuiltInFirebaseKey === true;

        // ★ 核心防護：如果 Firebase 模組載入失敗 (成為純離線模式)，強制關閉所有雲端 UI
        if (typeof window.uploadEverything !== 'function' || window.uploadEverything.toString().includes('純離線模式')) {
            hasBuiltInKey = false;
            hasCustomKey = false;
        }

        let shouldShow = hasCustomKey || hasBuiltInKey;

        // 控制首頁與設定頁的自動同步開關
        if (containerHome) containerHome.style.display = shouldShow ? "flex" : "none";
        if (containerSettings) containerSettings.style.display = shouldShow ? "flex" : "none";

        // 控制側拉抽屜的上下傳按鈕
        if (btnUpload) btnUpload.style.display = shouldShow ? "flex" : "none";
        if (btnDownload) btnDownload.style.display = shouldShow ? "flex" : "none";

        // 控制內建連線的綠字提示
        if (hintMsg) {
            hintMsg.style.display = (hasBuiltInKey && !hasCustomKey) ? "block" : "none";
        }
    };

    // 啟動 APP 時立刻檢查一次
    checkCloudKeyStatus();
});

document.addEventListener('click', function (e) {
    let btn = e.target.closest('#btn-update-rec');
    if (btn) {
        // ★ 使用全域狀態快照比對
        let currentStateStr = window.getCurrentStateSnapshotString();

        if (currentStateStr === window.recordNotesSnapshot) {
            e.stopImmediatePropagation();
            e.preventDefault();
            if (window.showToast) window.showToast("ℹ️ 占斷、筆記與應期內容未有任何異動！");

            // 【核心修復】內容沒變時，手動執行欄位鎖定與按鈕還原
            let sEl = document.getElementById("edit-subject");
            let jEl = document.getElementById("edit-judge");
            let fEl = document.getElementById("edit-feedback");
            let nEl = document.getElementById("edit-note");
            let csEl = document.getElementById("edit-current-status"); 
            let caEl = document.getElementById("edit-copy-addon"); 
            let cbAddon = document.getElementById("cb-default-addon"); // ★ 抓取 checkbox

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

            let eBtn = document.getElementById("btn-edit-notes");
            let uBtn = document.getElementById("btn-update-rec");
            if (uBtn) uBtn.style.display = "none";
            if (eBtn) eBtn.style.display = "inline-block";
            return false;
        } else {
            if (window.AppState && window.AppState.curData) {
                window.AppState.curData.yingqi = JSON.parse(currentStateStr).yingqi;
            }
        }
    }
}, true);

// ==========================================
// ★ 雲端備份與還原的 UI 封裝 (加入太極圖動畫過場)
// ==========================================
window.handleCloudBackup = async function () {
    // ==========================================
    // ★ 安全鎖防線：檢查是否已解鎖 (執行過雲端還原)
    // ==========================================
    let isUnlocked = await localforage.getItem('ly_cloud_unlocked');
    if (!isUnlocked) {
        window.showAlert("⚠️ 系統保護機制：<br><br>偵測到您尚未進行首次雲端還原！<br>為避免本機新卦意外覆蓋掉雲端的舊紀錄，請先點選「📥 雲端還原」拉取舊資料，系統將為您自動比對合併！");
        return;
    }

    let container = document.getElementById("rec-list-container");

    if (container) {
        container.innerHTML = `
            <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; min-height:60vh; background:rgba(0,0,0,0.5); border-radius:8px; animation: fadeIn 0.3s ease-in-out;">
                <div class="taichi-spinner" style="font-size: 3.5rem; color: #fff; animation: taichi-spin 1.2s linear infinite; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));">☯</div>
                <div class="records-loader-text" style="margin-top: 15px; font-size: 1.1rem; font-weight: bold; color: #fff; letter-spacing: 2px; text-shadow: 0 1px 3px rgba(0,0,0,0.6);">上傳至雲端道域中...</div>
            </div>
        `;
    }

    // ★ BUG 修復：原先直接呼叫 uploadEverything 卻沒給資料，改為呼叫 syncToCloud(true)
    if (typeof window.syncToCloud === 'function') {
        await window.syncToCloud(true);
    }

    if (typeof window.showRecords === 'function') {
        window.showRecords();
    }
};

// ==========================================
// ★ 複製加註：帶入預設 Checkbox 控制
// ==========================================
window.toggleDefaultAddon = function(isChecked) {
    let caEl = document.getElementById("edit-copy-addon");
    if (!caEl) return;
    
    if (isChecked) {
        caEl.value = "請參照來源資料《六爻解卦標準流程》的步驟與規範詳細解釋此卦，並以問卦日期前輟生成解卦結果檔案。";
    } else {
        caEl.value = "";
    }
};