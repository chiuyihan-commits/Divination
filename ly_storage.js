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

    // 雲端同步狀態
    localLastSync: 0,         // 本機最後同步的毫秒時間戳

    // 動畫與流程狀態
    currentCastStep: 0        // 手動起爻進行到的步驟 (0~5)
};

// ==========================================
// ★ 效能優化：全域高亮元素快取追蹤器
// ==========================================
window.lastHighlightedElements = []; // 儲存上一次被高光的 DOM 節點

// 函式 1：精準拔除舊高光（完全不使用全域 querySelectorAll）
window.clearAllHighlights = function () {
    if (window.lastHighlightedElements.length > 0) {
        const classesToRemove = [
            'yao-highlight', 'same-zhi-highlight', 'year-he-highlight',
            'sanhe-red', 'sanhe-black', 'sanhe-marker', 'bi-highlight'
        ];

        window.lastHighlightedElements.forEach(el => {
            if (el) {
                // 使用解構運算子一次移除所有相關 class，效率最高
                el.classList.remove(...classesToRemove);
            }
        });

        window.lastHighlightedElements = []; // 釋放記憶體參照
    }
};

// 函式 2：動態快取當前的高光元素（僅在畫線/排盤結束後，精準掃描一次留作下次清除）
window.recordCurrentHighlights = function () {
    window.lastHighlightedElements = Array.from(
        document.querySelectorAll('.yao-highlight, .same-zhi-highlight, .year-he-highlight, .sanhe-red, .sanhe-black, .sanhe-marker, .bi-highlight')
    );
};


// 2. 建立 Proxy 代理器
window.AppState = new Proxy(initialState, {
    set(target, property, value) {
        // 先將新值寫入原始物件
        target[property] = value;

        // --- 根據屬性改變，自動觸發對應的 UI 更新 ---

        // A. 畫線與過濾器系統連動
        if (property === 'activeYaoIdx') {
            let filterBar = document.getElementById("rel-filter-bar");

            // 💡 核心優化：不管是切換新爻還是取消選取，第一步都先用快取「精準清除」舊高光
            if (typeof window.clearAllHighlights === 'function') {
                window.clearAllHighlights();
            }

            if (value === -1) {
                // 取消選取時：隱藏按鈕、清除畫線
                if (filterBar) filterBar.style.display = "none";
                let relLinesGroup = document.getElementById("rel-lines");
                if (relLinesGroup) relLinesGroup.innerHTML = "";
            } else {
                // 選取新爻時：顯示按鈕、觸發畫線
                if (filterBar) filterBar.style.display = "flex";
                let parts = value.split('_');
                if (typeof window.drawRelations === 'function') {
                    window.drawRelations(parseInt(parts[1]), parts[0]);

                    // 💡 核心優化：當新關係線畫完、高光貼好後，立刻掃描並記住這次的高光節點
                    if (typeof window.recordCurrentHighlights === 'function') {
                        window.recordCurrentHighlights();
                    }
                }
            }
        }

        if (property === 'currentRelFilter') {
            // 切換過濾器時：更新按鈕視覺狀態
            document.querySelectorAll('.seal-btn').forEach(btn => {
                let btnFilter = btn.innerText;
                if (btn.classList.contains('btn-all-plus')) btnFilter = '全+';
                if (btn.classList.contains('btn-xingmu')) btnFilter = '形墓';

                if (btnFilter === value) btn.classList.add('active');
                else btn.classList.remove('active');
            });

            // 💡 核心優化：當切換關係印章（過濾器）時，也會引發重新畫線，同樣進行「先精準清空、再重新記錄」
            if (target.activeYaoIdx !== -1 && typeof window.drawRelations === 'function') {
                if (typeof window.clearAllHighlights === 'function') {
                    window.clearAllHighlights();
                }

                let parts = target.activeYaoIdx.split('_');
                window.drawRelations(parseInt(parts[1]), parts[0]);

                if (typeof window.recordCurrentHighlights === 'function') {
                    window.recordCurrentHighlights();
                }
            }
        }

        if (property === 'availableRels') {
            const btnMap = {
                '全': '.btn-all', '無': '.btn-none', '生': '.btn-sheng',
                '剋': '.btn-ke', '沖': '.btn-chong', '合': '.btn-he',
                '墓': '.btn-mu', '比': '.btn-bi'
            };
            for (let [relName, selector] of Object.entries(btnMap)) {
                let btn = document.querySelector(selector);
                if (btn) btn.style.display = value.has(relName) ? 'inline-block' : 'none';
            }

            if (!value.has(target.currentRelFilter)) {
                setTimeout(() => { window.setRelFilter('全'); }, 0);
            }
        }

        return true;
    }
});

async function loadSettings() {
    let saved = await localforage.getItem('ly_animCfg');
    if (saved) animCfg = { ...animCfg, ...saved };

    // 1. 一般數值與勾選框 (全面加上 if 防呆保護)
    if ($("img-tm-prep")) $("img-tm-prep").value = animCfg.tmPrep;
    if ($("img-tm-toss")) $("img-tm-toss").value = animCfg.tmToss;
    if ($("img-tm-sy")) $("img-tm-sy").value = animCfg.tmSy;
    if ($("img-tm-oy")) $("img-tm-oy").value = animCfg.tmOy;
    if ($("img-tm-sn")) $("img-tm-sn").value = animCfg.tmSn;
    if ($("img-tm-on")) $("img-tm-on").value = animCfg.tmOn;

    if ($("set-shake")) $("set-shake").checked = animCfg.useShake;
    if ($("set-end-time")) $("set-end-time").value = animCfg.endTime;
    if ($("set-south-adjust")) $("set-south-adjust").checked = animCfg.southAdjust || false;

    // 2. 讀取設定時，直接呼叫同步函數
    if (animCfg.southAdjust !== undefined && typeof window.syncSouthAdjust === 'function') {
        window.syncSouthAdjust(animCfg.southAdjust);
    }

    // 3. 讀取：擲幣結束條件 (完美防呆版)
    let savedEndMode = animCfg.endMode || "auto";
    let endModeRadio = document.querySelector(`input[name="anim-end"][value="${savedEndMode}"]`);
    if (endModeRadio) {
        endModeRadio.checked = true;
    } else {
        let defaultEndRadio = document.querySelector(`input[name="anim-end"][value="auto"]`);
        if (defaultEndRadio) defaultEndRadio.checked = true;
    }

    // 4. 讀取自訂資料庫設定
    let customDb = await localforage.getItem('customDbConfig');
    if (customDb && $("custom-db-config")) {
        $("custom-db-config").value = customDb;
    }

    // 5. 讀取：擲幣模式 (Video vs 3D) 與顯示連動 (完美防呆 + 解決重複綁定)
    let modeRadios = document.querySelectorAll('input[name="toss-mode"]');
    if (modeRadios.length > 0) {
        let savedTossMode = animCfg.tossMode || 'video';
        let tossRadio = document.querySelector(`input[name="toss-mode"][value="${savedTossMode}"]`);

        if (tossRadio) tossRadio.checked = true;
        if ($('settings-3d-coin')) $('settings-3d-coin').style.display = savedTossMode === '3d' ? 'block' : 'none';

        modeRadios.forEach(radio => {
            radio.onchange = (e) => {
                if ($('settings-3d-coin')) {
                    $('settings-3d-coin').style.display = e.target.value === '3d' ? 'block' : 'none';
                }
            };
        });
    }

    // ★ 6. 讀取：自訂開場圖 (取代太極轉圈)
    let splashContainer = document.querySelector('.splash-spinner');
    let taichi = document.querySelector('.splash-taichi');
    if (animCfg.customSplashImg && splashContainer) {
        if (taichi) taichi.style.display = 'none'; // 隱藏原本的太極

        // 拔除 CSS 動畫與邊框
        splashContainer.style.animation = 'none';
        splashContainer.style.border = 'none';

        // 將使用者的 GIF/圖片設為背景
        splashContainer.style.backgroundImage = `url(${animCfg.customSplashImg})`;
        splashContainer.style.backgroundSize = 'contain';
        splashContainer.style.backgroundPosition = 'center';
        splashContainer.style.backgroundRepeat = 'no-repeat';
        splashContainer.style.width = '80px';
        splashContainer.style.height = '80px';
    }
}

async function saveSettings() {
    const timeFields = ['prep', 'toss', 'sy', 'oy', 'sn', 'on'];
    timeFields.forEach(key => {
        let propName = 'tm' + key.charAt(0).toUpperCase() + key.slice(1);
        animCfg[propName] = parseFloat($(`img-tm-${key}`).value);
    });
    animCfg.useShake = $("set-shake").checked;
    animCfg.endMode = document.querySelector('input[name="anim-end"]:checked').value;
    animCfg.endTime = parseFloat($("set-end-time").value);
    animCfg.tossMode = document.querySelector('input[name="toss-mode"]:checked').value;
    await localforage.setItem('ly_animCfg', animCfg);
    let customDbStr = $("custom-db-config").value.trim();
    await localforage.setItem('customDbConfig', customDbStr);
    animCfg.southAdjust = $("set-south-adjust").checked;

    if ($("set-south-adjust")) {
        animCfg.southAdjust = $("set-south-adjust").checked;
    }

    const saveImg = (id, key) => {
        let file = $(id).files[0];
        if (file) { let r = new FileReader(); r.onload = e => localforage.setItem(key, e.target.result); r.readAsDataURL(file); }
    };

    saveImg('img-coin-front', 'img_coin_front');
    saveImg('img-coin-back', 'img_coin_back');
    saveImg('img-up-prep', 'img_prep'); saveImg('img-up-toss', 'img_toss');
    saveImg('img-up-sy', 'img_sy'); saveImg('img-up-oy', 'img_oy');
    saveImg('img-up-sn', 'img_sn'); saveImg('img-up-on', 'img_on');
    showToast("設定已儲存！"); closeSettings();
}

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

// 提供一個全域函式給 HTML 按鈕呼叫，專門用來改變 filter 狀態
window.setRelFilter = (filter) => {
    AppState.currentRelFilter = filter;
};

async function saveRec() {
    let recs = await localforage.getItem('iching_final_v60') || [];

    // 1. 將輸入框的內容寫入當前狀態
    AppState.curData.judge = $("edit-judge").value;
    AppState.curData.feedback = $("edit-feedback").value;
    AppState.curData.note = $("edit-note").value;

    // ★ 核心修正：深度複製！將目前的卦象資料「徹底影印一份」，準備存進資料庫
    let cloneData = JSON.parse(JSON.stringify(AppState.curData));

    if (AppState.curRecIndex > -1) {
        recs[AppState.curRecIndex] = cloneData;
        showToast("紀錄已更新");
    } else {
        recs.unshift(cloneData);
        AppState.curRecIndex = 0;
        showToast("已存入紀錄庫");
    }

    await localforage.setItem('iching_final_v60', recs);

    // ★ 增加這個 typeof 檢查，如果 Firebase 沒載入好就不會噴錯
    if (typeof window.uploadEverything === 'function') {
        syncToCloud();
    } else {
        console.log("Firebase 尚未載入，稍後自動同步。");
    }
    window.hasUnsavedChanges = false;
}

// ==========================================
// ★ 讀取單筆紀錄 (加入已讀標記與捲軸記憶)
// ==========================================
window.loadRec = async function (i) {
    window.activeRecHighlight = i; // ★ 更新高亮索引
    // ★ 點擊卡片時，記住目前的捲動位置
    let recView = document.getElementById("records-view");
    if (recView) window.lastRecScroll = recView.scrollTop;

    let recs = await localforage.getItem('iching_final_v60') || [];

    // ★ 如果是第一次點開，標記為已讀並存檔
    if (!recs[i].isRead) {
        recs[i].isRead = true;
        await localforage.setItem('iching_final_v60', recs);
    }

    AppState.curRecIndex = i;
    let loadedData = JSON.parse(JSON.stringify(recs[i]));
    AppState.curData = loadedData;

    if (loadedData.najiaValue) document.getElementById("res-set-najia").value = loadedData.najiaValue;
    if (loadedData.fushenValue) document.getElementById("res-set-fushen").value = loadedData.fushenValue;
    if (loadedData.bianViewValue) document.getElementById("res-set-bian").value = loadedData.bianViewValue;

    window.comesFromRecords = true;
    window.hasUnsavedChanges = false;

    if (typeof renderRes === 'function') renderRes();
    document.getElementById("records-view").style.display = "none";
};

// ==========================================
// ★ 歷史紀錄：列表渲染 (修復 guaNameDisplay 錯誤與樣式優化)
// ==========================================
window.showRecords = async function (isReturning = false) {
    if (!isReturning) {
        window.lastRecScroll = 0;
        window.activeRecHighlight = -1; // ★ 核心修正 2：每次從首頁進入時，清空高亮狀態
    }

    document.getElementById("portal-view").style.display = "none";
    document.getElementById("records-view").style.display = "block";

    let recs = await localforage.getItem('iching_final_v60') || [];

    let h = `
    <style>
        .rec-item-wrap { position: relative; background: #eee; border: 1px solid #ddd; border-radius: 8px; margin-bottom: 12px; display: flex; box-shadow: 0 2px 4px rgba(0,0,0,0.05); overflow: hidden; }
        .rec-actions { display: flex; flex-direction: row; position: absolute; right: 0; top: 0; bottom: 0; width: 160px; z-index: 1; }
        .rec-actions button { border: none; color: white; font-weight: bold; cursor: pointer; font-size: 1em; flex: 1; white-space: nowrap; }
        .rec-content { flex: 1; padding: 12px; cursor: pointer; position: relative; z-index: 10; display: flex; justify-content: space-between; align-items: center; border-radius: 8px; transition: background 0.2s; background: #fff; width: 100%; box-sizing: border-box; }
        
        /* ★ 只針對被選中的項目套用淡藍色與不透明效果 */
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
        let guaNameDisplay = r.ben.name;
        if (r.bian && r.ben.name !== r.bian.name) guaNameDisplay = `${r.ben.name} ｜ ${r.bian.name}`;

        let readClass = (i === window.activeRecHighlight) ? "read" : "unread";

        // ★ 核心優化 2：只有在手機版時，才組裝滑動事件字串
        let swipeEvents = isMobile
            ? `ontouchstart="handleSwipeStart(event, this, ${i})" ontouchmove="handleSwipeMove(event, this)" ontouchend="handleSwipeEnd(event, this)"`
            : "";

        h += `
        <div class="rec-item-wrap">
            <div class="rec-content ${readClass}" onclick="window.activeRecHighlight=${i}; if(!window.isSwiping) loadRec(${i})" ${swipeEvents}>
                <div style="flex: 1;">
                    <div style="font-weight:bold; font-size:1.1em; margin-bottom:4px; color:#333;">${r.question || '無標題'}</div>
                    <div style="font-size:0.9em; color:#666;">
                        <span style="margin-right:10px;">${r.dateStr}</span>
                        <span style="color:var(--blue-primary); font-weight:bold;">${guaNameDisplay}</span>
                    </div>
                </div>
            </div>
            <div class="rec-actions">
                <button style="background:#198754;" onclick="window.activeRecHighlight=${i}; editRecSetup(event, ${i})">修改</button>
                <button style="background:#dc3545;" onclick="deleteRecHistory(event, ${i})">刪除</button>
            </div>
        </div>`;
    });

    document.getElementById("rec-list-container").innerHTML = h || "<div style='text-align:center; padding:20px; color:#999;'>暫無紀錄</div>";

    if (window.lastRecScroll) {
        setTimeout(() => {
            let view = document.getElementById("records-view");
            if (view) view.scrollTop = window.lastRecScroll;
        }, 10);
    }

    // ★ 新增：初始化檢查是否需要顯示「上下滑動」提示燈
    setTimeout(() => {
        let view = document.getElementById("records-view");
        let hint = document.getElementById("scroll-hint");
        if (view && hint) {
            // 如果內容總高度大於視窗高度，代表需要滑動
            if (view.scrollHeight > view.clientHeight) {
                hint.style.display = 'flex'; // 先將 Display 打開
                hint.style.opacity = '1';    // 剛進畫面時強制亮起提示

                // 同樣啟動 1.5 秒的熄滅倒數
                if (window.lyScrollTimeout) clearTimeout(window.lyScrollTimeout);
                window.lyScrollTimeout = setTimeout(() => {
                    hint.style.opacity = '0';
                }, 1500);

            } else {
                // 如果紀錄很少不用滑，直接隱藏
                hint.style.display = 'none';
            }
        }
    }, 50);
};

window.deleteRecHistory = async function (e, idx) {
    e.stopPropagation();
    let ok = await window.showConfirm("⚠️ 確定要永久刪除這筆紀錄嗎？");
    if (!ok) return;

    // 刪除前先記住捲軸位置
    let recView = document.getElementById("records-view");
    if (recView) window.lastRecScroll = recView.scrollTop;

    let recs = await localforage.getItem('iching_final_v60') || [];
    recs.splice(idx, 1);
    await localforage.setItem('iching_final_v60', recs);

    showRecords(true); // 傳入 true，維持捲軸位置
};

// 介面上的更新按鈕綁定，更新紀錄後自動上鎖回唯讀狀態
window.updateCurrentRec = async function () {
    // 1. 執行原本的存檔與同步邏輯
    await saveRec();

    // 2. 存檔成功後，把欄位恢復成「反灰唯讀狀態」
    let jEl = document.getElementById("edit-judge");
    let fEl = document.getElementById("edit-feedback");
    let nEl = document.getElementById("edit-note");

    [jEl, fEl, nEl].forEach(el => {
        if (el) {
            el.readOnly = true;
            el.style.backgroundColor = "#e9ecef";
            el.style.color = "#666";
            el.style.borderColor = "#ddd";
            el.style.boxShadow = "none"; // 移除編輯時的發光特效
        }
    });

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
            location.reload(); // 重新整理頁面以套用新資料
        } catch (err) {
            showAlert("❌ 檔案格式錯誤，請確保它是正確的備份檔。");
        }
    };
    reader.readAsText(file);
}

// 3. 呼叫雲端還原
async function restoreFromCloud() {
    if (typeof window.restoreSystemFromCloud === 'function') {
        const cloudData = await window.restoreSystemFromCloud();
        if (cloudData) {
            await applyCloudData(cloudData);
            showToast("✅ 雲端還原完成！");
            location.reload();
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

    // ★ 核心新增：自動收起其他已經被滑開的紀錄
    document.querySelectorAll('.rec-content').forEach(item => {
        if (item !== targetEl) {
            item.style.transition = 'transform 0.3s ease';
            item.style.transform = 'translateX(0px)';
        }
    });

    // ★ 核心修正 1：觸碰時立即更新高亮索引，並移除其他項目的藍色樣式
    window.activeRecHighlight = idx;
    document.querySelectorAll('.rec-content').forEach((item, i) => {
        item.classList.toggle('read', i === idx);
    });

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

        // ★ 新增：如果快照中有修改紀錄，就組裝成紅色的提示字串
        let diffHtml = h.diffStr ? `<div style="font-size: 0.85em; color: #dc3545; margin-top: 4px;">📝 變更內容：${h.diffStr}</div>` : '';

        hHtml += `
        <div style="display: flex; justify-content: space-between; align-items: center; background: #f8f9fa; padding: 8px 10px; border-radius: 4px; border: 1px solid #eee;">
            <div style="font-size: 0.9em; color: #333; line-height: 1.4;">
                <span style="font-weight: bold; margin-right: 8px; color: #198754;">${idx + 1}.</span>
                <span style="color: #666; margin-right: 8px;">${timeStr}</span>
                <span style="font-weight: bold; color: var(--blue-primary);">${gName}</span>
                ${diffHtml} <!-- ★ 插入修改紀錄 -->
            </div>
            <div style="cursor: pointer; font-size: 1.1em; padding: 4px; transition: transform 0.1s;" onclick="deleteHistoryItem(${idx})" title="刪除此紀錄" onmousedown="this.style.transform='scale(0.9)'" onmouseup="this.style.transform='scale(1)'">🗑️</div>
        </div>`;
    });
    hHtml += `</div>`;
    box.innerHTML = hHtml;

    // 把區塊附加在 resultView 的最後面
    resultView.appendChild(box);
};

// ★ 垃圾桶專屬刪除功能
window.deleteHistoryItem = async function (idx) {
    // ★ 修復：把 smartConfirm 改為我們已經動態美化過的 showConfirm
    let ok = await window.showConfirm("⚠️ 確定要刪除這筆歷史回溯紀錄嗎？\n\n刪除後無法恢復喔！");
    if (!ok) return;

    AppState.curData.history.splice(idx, 1);

    if (AppState.curData.history.length === 0) {
        delete AppState.curData.history;
    }

    await saveRec();
    window.renderHistoryLog();
    if (window.showToast) window.showToast("✅ 歷史紀錄已刪除");
};

// ==========================================
// ★ 歷史紀錄：動態生成專屬「修改紀錄 Modal」(完美判定與路由修復版)
// ==========================================
window.editRecSetup = async function (e, idx) {
    e.stopPropagation();

    window.activeRecHighlight = idx; // ★ 確保修改按鈕也能觸發藍色高亮
    window.editingRecIndex = idx;
    document.body.style.overflow = "hidden";
    document.body.style.height = "100dvh"; // 強制高度與視窗一致
    // ★ 進入編輯時，也記住背景列表的捲軸位置
    let recView = document.getElementById("records-view");
    if (recView) {
        window.lastRecScroll = recView.scrollTop;
    }

    let recs = await localforage.getItem('iching_final_v60') || [];
    let r = recs[idx];
    if (!r) return;
    window.editingRecIndex = idx;

    // 1. 建立背景遮罩
    const overlay = document.createElement('div');
    overlay.id = "smart-edit-overlay";
    overlay.style.cssText = `position: fixed; top: 0; left: 0; width: 100vw; height: 100dvh; background: rgba(0, 0, 0, 0.65); backdrop-filter: blur(3px); z-index: 9999999; display: flex; align-items: center; justify-content: center; animation: fadeIn 0.2s ease-out;`;

    // 2. 建立對話框主體 (壓縮 Padding 並將最大高度放寬至 95dvh)
    const box = document.createElement('div');
    box.style.cssText = `background: #f8f9fa; border-radius: 12px; width: 95%; max-width: 420px; max-height: 95dvh; overflow-y: auto; padding: 12px 15px; box-shadow: 0 10px 25px rgba(0,0,0,0.2); transform: scale(0.95); animation: popUp 0.2s forwards; display: flex; flex-direction: column;`;

    // 抓取首頁的時間選項
    let yOpts = document.getElementById("ts-year") ? document.getElementById("ts-year").innerHTML : '';
    let mOpts = document.getElementById("ts-month") ? document.getElementById("ts-month").innerHTML : '';
    let dOpts = document.getElementById("ts-day") ? document.getElementById("ts-day").innerHTML : '';
    let hOpts = document.getElementById("ts-hour") ? document.getElementById("ts-hour").innerHTML : '';
    let minOpts = document.getElementById("ts-minute") ? document.getElementById("ts-minute").innerHTML : '';

    // ★ 核心修正 2：只阻斷「背景遮罩」的滑動，允許「視窗內部」正常捲動
    overlay.addEventListener('touchmove', (evt) => {
        if (evt.target === overlay) {
            evt.preventDefault();
        }
    }, { passive: false });

    // 生成 6 爻的下拉選單 HTML (極致壓縮上下間距)
    let yaoRowsHTML = "";
    let yaoNames = ['初爻', '二爻', '三爻', '四爻', '五爻', '上爻'];
    for (let i = 5; i >= 0; i--) {
        yaoRowsHTML += `
        <div style="display: flex; align-items: center; justify-content: space-between; background: ${i % 2 === 0 ? '#fff' : '#f1f3f5'}; padding: 4px 10px; border-radius: 4px; margin-bottom: 4px; border: 1px solid #e9ecef;">
            <span style="font-weight: bold; color: #555; width: 45px; font-size: 0.9rem;">${yaoNames[i]}</span>
            <select id="smart-yao-${i}" style="flex: 1; padding: 4px; font-size: 0.95rem; border: 1px solid #ccc; border-radius: 4px; text-align: center; font-family: monospace; font-weight: bold; color: var(--blue-primary, #0d6efd); background: #fff;">
                <option value="少陽">少陽━━━</option>
                <option value="老陽">老陽━━━O</option>
                <option value="少陰">少陰━ ━</option>
                <option value="老陰">老陰━ ━X</option>
            </select>
        </div>`;
    }

    // 3. 填入完整 HTML 結構 (性別與問題同列，年月日時分同列)
    box.innerHTML = `
        <h3 style="margin-top:0; color:#198754; text-align:center; margin-bottom:10px; font-size:1.1rem; letter-spacing: 1px;">✏️ 修改排盤紀錄</h3>
        
        <!-- 第一列：性別與占卜問題 -->
        <div style="display: flex; gap: 8px; margin-bottom: 8px; align-items: center;">
            <div style="display: flex; gap: 6px; font-weight: bold; color: #333; font-size: 0.95rem; white-space: nowrap;">
                <label><input type="radio" name="smart-gender" value="男" style="transform: scale(1.1); margin-right: 2px;">男</label>
                <label><input type="radio" name="smart-gender" value="女" style="transform: scale(1.1); margin-right: 2px;">女</label>
            </div>
            <input type="text" id="smart-q" placeholder="占卜問題..." style="flex: 1; min-width: 0; box-sizing: border-box; padding: 6px 10px; border: 1px solid #ccc; border-radius: 4px; font-size: 0.95rem;">
        </div>

        <!-- 第二列：年月日時分極限壓縮 -->
        <div style="display: flex; gap: 3px; margin-bottom: 10px;">
            <div style="flex: 1.8; display: flex; align-items: center; border: 1px solid #ccc; border-radius: 4px; background: #fff; padding: 2px;">
                <select id="smart-y" style="width: 100%; border: none; outline: none; background: transparent; font-size: 0.85rem; padding:0;">${yOpts}</select>
            </div>
            <div style="flex: 1; display: flex; align-items: center; border: 1px solid #ccc; border-radius: 4px; background: #fff; padding: 2px;">
                <select id="smart-m" style="width: 100%; border: none; outline: none; background: transparent; font-size: 0.85rem; padding:0;">${mOpts}</select><span style="color:#666; font-size:0.75rem; margin-left:-2px;">月</span>
            </div>
            <div style="flex: 1; display: flex; align-items: center; border: 1px solid #ccc; border-radius: 4px; background: #fff; padding: 2px;">
                <select id="smart-d" style="width: 100%; border: none; outline: none; background: transparent; font-size: 0.85rem; padding:0;">${dOpts}</select><span style="color:#666; font-size:0.75rem; margin-left:-2px;">日</span>
            </div>
            <div style="flex: 1; display: flex; align-items: center; border: 1px solid #ccc; border-radius: 4px; background: #fff; padding: 2px;">
                <select id="smart-h" style="width: 100%; border: none; outline: none; background: transparent; font-size: 0.85rem; padding:0;">${hOpts}</select><span style="color:#666; font-size:0.75rem; margin-left:-2px;">時</span>
            </div>
            <div style="flex: 1; display: flex; align-items: center; border: 1px solid #ccc; border-radius: 4px; background: #fff; padding: 2px;">
                <select id="smart-min" style="width: 100%; border: none; outline: none; background: transparent; font-size: 0.85rem; padding:0;">${minOpts}</select><span style="color:#666; font-size:0.75rem; margin-left:-2px;">分</span>
            </div>
        </div>

        <div style="margin-bottom: 12px; text-align:center;">
            <label style="color:#dc3545; font-weight:bold; font-size:0.95rem; cursor:pointer;">
                <input type="checkbox" id="edit-cb-south-adjust"> 🌏 此卦啟用南半球節氣對沖
            </label>
        </div>

        <!-- 第三區塊：爻位選項 -->
        <div style="margin-bottom: 12px; border-top: 1px dashed #ddd; padding-top: 8px;">
            ${yaoRowsHTML}
        </div>

        <!-- 第四區塊：底部按鈕 -->
        <div style="display: flex; gap: 10px; margin-top: auto;">
            <button id="smart-btn-cancel" style="flex: 1; padding: 10px; border: 1px solid rgba(0,0,0,0.1); border-radius: 6px; background: #f0f0f0; color: #555; font-weight: bold; font-size: 0.95rem; cursor: pointer; transition: transform 0.1s;">取消</button>
            <button id="smart-btn-ok" style="flex: 1; padding: 10px; border: none; border-radius: 6px; background: #198754; color: #fff; font-weight: bold; font-size: 0.95rem; cursor: pointer; box-shadow: inset 1px 1px 4px rgba(0,0,0,0.4); transition: transform 0.1s;">確認修改</button>
        </div>
    `;

    overlay.appendChild(box);
    document.body.appendChild(overlay);

    // 4. 載入原始紀錄的資料
    document.getElementById("smart-q").value = r.question || "";
    let radios = document.getElementsByName("smart-gender");
    radios.forEach(rad => { if (rad.value === r.gender) rad.checked = true; });
    if (!document.querySelector('input[name="smart-gender"]:checked') && radios.length > 0) radios[0].checked = true;

    if (document.getElementById("edit-cb-south-adjust")) {
        document.getElementById("edit-cb-south-adjust").checked = r.isSouthAdjust || false;
    }

    if (r.dateStr && r.dateStr !== "自訂時間") {
        // 1. 先嘗試讓瀏覽器原生 Date 解析 (能處理絕大多數 toLocaleString 格式)
        let d = new Date(r.dateStr);
        if (!isNaN(d.getTime())) {
            document.getElementById("smart-y").value = d.getFullYear();
            document.getElementById("smart-m").value = d.getMonth(); // 系統選項是 0-11
            document.getElementById("smart-d").value = d.getDate();
            document.getElementById("smart-h").value = d.getHours();
            document.getElementById("smart-min").value = d.getMinutes();
        } else {
            // 2. 暴力備案：提取字串中的所有數字 (相容 "2026/5/24 下午3:19:12" 等刁鑽格式)
            let nums = r.dateStr.match(/\d+/g);
            if (nums && nums.length >= 5) {
                document.getElementById("smart-y").value = nums[0];
                document.getElementById("smart-m").value = parseInt(nums[1]) - 1;
                document.getElementById("smart-d").value = nums[2];

                let h = parseInt(nums[3]);
                // 處理 12 小時制的下午與上午轉換
                if ((r.dateStr.includes("下午") || r.dateStr.toUpperCase().includes("PM")) && h < 12) {
                    h += 12;
                } else if ((r.dateStr.includes("上午") || r.dateStr.toUpperCase().includes("AM")) && h === 12) {
                    h = 0;
                }

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

    // ==========================================
    // ★ 核心優化：建立「初始狀態快照」用來做 100% 精準比對
    // ==========================================
    const getModalState = () => {
        let ls = [];
        for (let i = 0; i < 6; i++) ls.push(document.getElementById("smart-yao-" + i).value);
        return {
            q: document.getElementById("smart-q").value,
            gender: document.querySelector('input[name="smart-gender"]:checked') ? document.querySelector('input[name="smart-gender"]:checked').value : "",
            y: document.getElementById("smart-y").value,
            m: document.getElementById("smart-m").value,
            d: document.getElementById("smart-d").value,
            h: document.getElementById("smart-h").value,
            min: document.getElementById("smart-min").value,
            lines: ls.join(","), // 轉字串方便比對
            // ★ 將南半球狀態也加入快照中
            isSouth: document.getElementById("edit-cb-south-adjust") ? document.getElementById("edit-cb-south-adjust").checked : false
        };
    };

    // 把剛載入完資料的視窗狀態拍一張照
    const initialState = getModalState();

    // 5. 事件綁定：關閉與儲存邏輯
    const closeMod = () => {
        overlay.style.animation = "fadeOut 0.2s forwards";
        box.style.animation = "fadeOut 0.2s forwards";
        setTimeout(() => {
            overlay.remove();

            // ★ 核心修正 3：還原全域 Body 捲動狀態
            document.body.style.overflow = "";
            document.body.style.height = "";

            // 如果是在紀錄頁，確保紀錄頁可以捲動
            if (recView) recView.style.overflow = "auto";
        }, 200);
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
                if (typeof window.loadRec === 'function') {
                    window.loadRec(idx);
                }
                if (window.showToast) window.showToast("✅ 紀錄未變動，已直接載入。");
                return;
            }

            let ls = [];
            const valMap = { "少陽": 7, "老陽": 9, "少陰": 8, "老陰": 6 };
            const revValMap = { 7: "少陽", 9: "老陽", 8: "少陰", 6: "老陰" };

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

            // ★ 計算修改了什麼爻
            let diffs = [];
            let yaoNames = ['初爻', '二爻', '三爻', '四爻', '五爻', '上爻'];
            for (let i = 0; i < 6; i++) {
                if (oldRec.lines[i] !== ls[i]) {
                    diffs.push(`${yaoNames[i]}: ${revValMap[oldRec.lines[i]]}→${revValMap[ls[i]]}`);
                }
            }
            let diffStr = diffs.length > 0 ? diffs.join(", ") : "僅修改時間或問題";

            // 製作備份並寫入修改紀錄
            let snapshot = JSON.parse(JSON.stringify(oldRec));
            delete snapshot.history;
            snapshot.diffStr = diffStr;
            history.push(snapshot);

            // 同步回首頁底層表單供排盤引擎使用
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

            // ==========================================
            // ★ 核心修正：只在這裡呼叫一次 process
            // 傳入 oldRec.method (維持原本起卦方式)
            // 如果你原本的代碼有 preserveNotes，請加在第三個參數！
            // ==========================================
            if (typeof process === 'function') {
                let preserveNotes = {
                    judge: oldRec.judge || "",
                    feedback: oldRec.feedback || "",
                    note: oldRec.note || "",
                    history: history // 這裡放入剛剛 push 過 snapshot 的新 history
                };
                process(ls, oldRec.method, preserveNotes); 
            }

            window.tempEditSouthAdjust = undefined;

            // 繼承歷史紀錄與筆記
            AppState.curData.history = history;
            AppState.curData.judge = oldRec.judge || "";
            AppState.curData.feedback = oldRec.feedback || "";
            AppState.curData.note = oldRec.note || "";

            AppState.curRecIndex = window.editingRecIndex;
            if (typeof saveRec === 'function') await saveRec();

            // 關閉 Modal
            closeMod();

            // 載入剛修改完的紀錄並顯示
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

// ★ 接收雲端資料並更新本地 (在 initApp 中會被呼叫)
async function applyCloudData(cloudData) {
    if (cloudData.records) {
        await localforage.setItem('iching_final_v60', cloudData.records);
        // ★ 安全防呆：確保元素存在才讀取 style
        let recView = $("records-view");
        if (recView && recView.style.display === "block") {
            showRecords();
        }
    }
    if (cloudData.settings) {
        await localforage.setItem('ly_animCfg', cloudData.settings);
        // ★ 修正 ID 為 settings-modal，並且判斷只要不是 "none" (打開狀態) 就重新載入設定
        let setModal = $("settings-modal");
        if (setModal && setModal.style.display !== "none") {
            if (typeof loadSettings === 'function') loadSettings();
        }
    }
    console.log("📦 本地資料庫已與雲端同步");
}
