// 1. 本地設定檔不受斷網影響，保留靜態載入
import { firebaseConfig } from "./kraneprivatekey.js";

// ★ 新增：將內建 KEY 是否存在的狀態，暴露給外面的 UI 系統
window.hasBuiltInFirebaseKey = (firebaseConfig && Object.keys(firebaseConfig).length > 0);

// ==================================================
// ★ 1. 先定義空函數與變數 (離線備用：避免 UI 呼叫時找不到函數報錯)
// ==================================================
let app;
let db;
window.uploadEverything = async () => { console.warn("📴 目前為純離線模式，暫停上傳"); };
window.restoreSystemFromCloud = async () => { console.warn("📴 目前為純離線模式，無法還原"); return null; };
window.initRealTimeSync = () => { };

// ==================================================
// ★ 2. 動態載入 Firebase 模組 (優雅降級核心)
// ==================================================
async function initFirebaseModule() {
    try {
        // 使用動態 import()，斷網時如果連 SW 快取都沒命中，會拋出錯誤被 catch 接住
        const { initializeApp, getApps, getApp } = await import("https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js");
        const { getFirestore, doc, setDoc, getDoc, onSnapshot, serverTimestamp } = await import("https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js");

        if (!getApps().length) {
            app = initializeApp(firebaseConfig);
        } else {
            app = getApp();
        }
        db = getFirestore(app);
        const userDocRef = doc(db, "user_sync", "main_profile");

        // --------------------------------------------------
        // 以下把原本需要用到 Firebase 模組的實作，真正賦予進去
        // --------------------------------------------------

        // ★ 核心同步路由 (上傳)
        window.uploadEverything = async (allData) => {
            try {
                if (window.showToast) window.showToast("⏳ 正在準備同步...");

                let customStr = await localforage.getItem('customDbConfig') || "";
                customStr = customStr.trim();

                if (customStr.startsWith("http")) {
                    // 模式 A：Google 表單 / Webhook (GAS)
                    let res = await fetch(customStr, {
                        method: 'POST',
                        body: JSON.stringify({ action: "upload", data: allData }),
                        headers: { 'Content-Type': 'text/plain;charset=utf-8' }
                    });

                    let result = await res.json();
                    if (result.success || result.status === "ok") {
                        if (window.AppState) window.AppState.localLastSync = new Date().getTime();
                        if (window.showToast) window.showToast("✅ Webhook 備份成功！");
                    } else {
                        throw new Error(result.error || "Webhook 伺服器回傳失敗");
                    }
                } else {
                    // 模式 B & C：自訂 Firebase 或 預設 Firebase
                    let dbToUse = db;

                    if (customStr.startsWith("{")) {
                        try {
                            let customCfg = JSON.parse(customStr);
                            let customApp = getApps().find(a => a.name === "CustomApp");
                            if (!customApp) customApp = initializeApp(customCfg, "CustomApp");
                            dbToUse = getFirestore(customApp);
                        } catch (e) {
                            if (window.showAlert) window.showAlert("❌ 自訂 Firebase 金鑰格式錯誤，請檢查 JSON 括號是否完整。");
                            return;
                        }
                    }

                    const currentUserDocRef = doc(dbToUse, "user_sync", "main_profile");
                    await setDoc(currentUserDocRef, {
                        ...allData,
                        lastSync: serverTimestamp()
                    });

                    if (window.AppState) window.AppState.localLastSync = new Date().getTime() + 10000;
                    if (window.showToast) window.showToast("✅ Firebase 雲端同步成功！");
                }
            } catch (e) {
                console.error("同步失敗", e);
                if (window.showAlert) window.showAlert("❌ 同步失敗：" + e.message);
            }
        };

        // ★ 核心同步路由 (還原)
        window.restoreSystemFromCloud = async function () {
            //let isOk = await window.showAlert("⚠️ 確定要拉取雲端紀錄嗎？\n(系統將自動保留本機新卦，並與雲端無縫合併)");
            //if (!isOk) return;

            try {
                if (window.showToast) window.showToast("⏳ 正在從雲端下載...");
                let customStr = await localforage.getItem('customDbConfig') || "";
                customStr = customStr.trim();

                let cloudData = null;

                if (customStr.startsWith("http")) {
                    let res = await fetch(customStr + "?action=download");
                    let result = await res.json();
                    if (result.success || result.status === "ok") {
                        cloudData = result.data;
                    } else {
                        // ★ 新增：Webhook 雲端為空，自動解鎖！
                        await localforage.setItem('ly_cloud_unlocked', true);
                        if (window.showToast) window.showToast("✅ 雲端目前為空，已為您解除上傳鎖定！");
                        return;
                    }
                } else {
                    let dbToUse = db;
                    // ... (解析 config 邏輯不變)

                    const currentUserDocRef = doc(dbToUse, "user_sync", "main_profile");
                    let snap = await getDoc(currentUserDocRef);
                    if (snap.exists()) {
                        cloudData = snap.data();
                    } else {
                        // ★ 新增：Firebase 雲端為空，自動解鎖！
                        await localforage.setItem('ly_cloud_unlocked', true);
                        if (window.showToast) window.showToast("✅ 雲端目前無紀錄，已為您解除上傳鎖定！");
                        return;
                    }
                }

                if (cloudData) {
                    if (typeof window.applyCloudData === 'function') {
                        await window.applyCloudData(cloudData);
                    }
                    if (window.showToast) window.showToast("✅ 雲端還原與合併成功！");
                }
            } catch (e) {
                console.error("還原失敗", e);
                if (window.showAlert) window.showAlert("❌ 還原失敗：" + e.message);
            }
        };

        // ★ 實時偵測雲端異動 (最終極致版：防呆時間戳記 + 空白強制下載)
        window.initRealTimeSync = async (onDataChange) => {
            let customStr = await localforage.getItem('customDbConfig') || "";
            customStr = customStr.trim();

            // 如果使用者填的是 Webhook (Google 表單/GAS)，不支援 Firebase 的即時監聽
            if (customStr.startsWith("http")) {
                console.log("☁️ 目前使用 Webhook，不支援即時同步，請透過按鈕手動下載。");
                return;
            }

            // 決定要監聽哪個資料庫
            let dbToUse = db;
            if (customStr.startsWith("{")) {
                try {
                    let customCfg = JSON.parse(customStr);
                    let customApp = getApps().find(a => a.name === "CustomApp");
                    if (!customApp) customApp = initializeApp(customCfg, "CustomApp");
                    dbToUse = getFirestore(customApp);
                } catch (e) {
                    console.log("自訂 Firebase 格式解析失敗，退回預設連線");
                }
            }

            const currentUserDocRef = doc(dbToUse, "user_sync", "main_profile");

            // 🌟 注意這裡加上了 async，讓我們可以在裡面讀取本地資料庫
            onSnapshot(currentUserDocRef, async (docSnap) => {
                if (docSnap.exists()) {
                    if (docSnap.metadata.hasPendingWrites) {
                        return; // 忽略自己正在上傳的暫存狀態
                    }
                    let data = docSnap.data();
                    // 防呆抓取時間：如果沒有時間，就預設為 0
                    let serverTime = data.lastSync ? (typeof data.lastSync.toMillis === 'function' ? data.lastSync.toMillis() : data.lastSync) : 0;

                    // 🌟 核心修復 1：立刻檢查本機資料庫是不是空的
                    let localRecords = await localforage.getItem('iching_final_v60') || [];
                    let isLocalEmpty = (localRecords.length === 0);

                    // 🌟 核心修復 2：如果本機「不是」空的，而且雲端時間沒有比較新，才忽略
                    if (!isLocalEmpty && serverTime <= (window.AppState ? window.AppState.localLastSync : 0)) {
                        console.log("☁️ 忽略：雲端時間未更新（迴聲或舊資料）");
                        return;
                    }

                    // 更新本機記憶的時間，如果伺服器沒時間，就先用當下時間代替
                    if (window.AppState) window.AppState.localLastSync = serverTime || Date.now();
                    console.log("☁️ 偵測到雲端資料（或本機無資料），開始無縫自動下載...");
                    onDataChange(data);
                }
            });
        };

        // 通知 UI 模組載入完成
        if (typeof window.checkCloudKeyStatus === 'function') window.checkCloudKeyStatus();
        if (typeof window.bindRealTimeSyncUI === 'function')
            console.log("🔥 Firebase 模組載入成功");

    } catch (error) {
        // ★ 斷網且無快取時的優雅降級：攔截崩潰，切換為單機模式
        console.warn("📴 無法連接 Firebase 伺服器，已自動切換為純離線模式。", error);
        window.hasBuiltInFirebaseKey = false;
        if (typeof window.checkCloudKeyStatus === 'function') window.checkCloudKeyStatus();
    }
}

// 啟動非同步載入
initFirebaseModule();


// ==================================================
// ★ 3. 本機打包區 (不需依賴 Firebase，放最外層)
// ==================================================
window.syncToCloud = async function(isManual = false) {
    let isUnlocked = await localforage.getItem('ly_cloud_unlocked');
    if (!isUnlocked) {
        if (isManual) {
            window.showAlert("⚠️ 系統保護機制：<br><br>偵測到您尚未進行首次雲端還原！<br>為避免本機新卦意外覆蓋掉雲端的舊紀錄，請先至抽屜點選「📥 雲端還原」拉取舊資料，系統將為您自動比對合併！");
        }
        return; 
    }

    let isAutoSync = await localforage.getItem('ly_autoSync');
    if (isAutoSync === null) isAutoSync = true; 

    if (!isAutoSync && !isManual) {
        console.log("☁️ 雲端自動同步已關閉，本次變更僅儲存於本機。");
        return; 
    }

    const records = await localforage.getItem('iching_final_v60') || [];
    const trash = await localforage.getItem('iching_trash_v60') || []; 
    const tombstones = await localforage.getItem('iching_tombstones_v60') || []; // ★ 新增：撈取墓碑資料
    const settings = await localforage.getItem('ly_animCfg') || {};

    let settingsToUpload = { ...settings };
    delete settingsToUpload.customSplashImg; 

    // 將 正式紀錄、回收桶、墓碑(永久刪除標記) 全部包裝送上雲端
    await window.uploadEverything({
        records: records,
        trash: trash,
        tombstones: tombstones, // ★ 新增：上傳墓碑
        settings: settingsToUpload
    });
};