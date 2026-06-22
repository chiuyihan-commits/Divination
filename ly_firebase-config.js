import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc, onSnapshot, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { firebaseConfig as firebaseConfig } from "./privatekey.js";

// 在這裡初始化 app
let app;
if (!getApps().length) {
    app = initializeApp(firebaseConfig);
} else {
    app = getApp();
}

const db = getFirestore(app);

// 指定文件 ID (可依需求更改為特定使用者 ID)
const userDocRef = doc(db, "user_sync", "main_profile");// ★ 新增：將內建 KEY 是否存在的狀態，暴露給外面的 UI 系統
window.hasBuiltInFirebaseKey = (firebaseConfig && Object.keys(firebaseConfig).length > 0);

// 在這裡初始化 app
let app;
if (!getApps().length) {
    app = initializeApp(firebaseConfig);
} else {
    app = getApp();
}

const db = getFirestore(app);

// 指定文件 ID (可依需求更改為特定使用者 ID)
const userDocRef = doc(db, "user_sync", "main_profile");

// ★ 核心同步路由 (上傳)
window.uploadEverything = async (allData) => {
    try {
        if (window.showToast) window.showToast("⏳ 正在準備同步...");
        
        let customStr = await localforage.getItem('customDbConfig') || "";
        customStr = customStr.trim();

        if (customStr.startsWith("http")) {
            // 模式 A：Google 表單 / Webhook (GAS)
            // ★ 使用 text/plain 包裝，完美閃避擾人的 CORS Preflight 阻擋
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
                    // 尋找是否已經初始化過這個自訂 App，沒有的話就立刻建立一個
                    let customApp = getApps().find(a => a.name === "CustomApp");
                    if (!customApp) customApp = initializeApp(customCfg, "CustomApp");
                    dbToUse = getFirestore(customApp);
                } catch(e) {
                    if (window.showAlert) window.showAlert("❌ 自訂 Firebase 金鑰格式錯誤，請檢查 JSON 括號是否完整。");
                    return;
                }
            }

            // 執行 Firestore 寫入
            const userDocRef = doc(dbToUse, "user_sync", "main_profile");
            await setDoc(userDocRef, {
                ...allData,
                lastSync: serverTimestamp()
            });
            
            if (window.AppState) window.AppState.localLastSync = new Date().getTime();
            if (window.showToast) window.showToast("✅ Firebase 雲端同步成功！");
        }
    } catch (e) {
        console.error("同步失敗", e);
        if (window.showAlert) window.showAlert("❌ 同步失敗：" + e.message);
    }
};

// ★ 核心同步路由 (還原)
window.restoreSystemFromCloud = async function () {
    let isOk = await window.showConfirm("⚠️ 確定要從雲端覆蓋本機所有紀錄嗎？\n本機現有資料將會遺失！");
    if (!isOk) return;

    try {
        if (window.showToast) window.showToast("⏳ 正在從雲端下載...");
        let customStr = await localforage.getItem('customDbConfig') || "";
        customStr = customStr.trim();
        
        let cloudData = null;

        if (customStr.startsWith("http")) {
            // 模式 A：Webhook 下載 (利用 GET 參數)
            let res = await fetch(customStr + "?action=download");
            let result = await res.json();
            if (result.success || result.status === "ok") {
                cloudData = result.data;
            } else {
                throw new Error("Webhook 無法下載資料或目前沒有備份");
            }
        } else {
            // 模式 B & C：Firebase 下載
            let dbToUse = db;
            if (customStr.startsWith("{")) {
                let customCfg = JSON.parse(customStr);
                let customApp = getApps().find(a => a.name === "CustomApp");
                if (!customApp) customApp = initializeApp(customCfg, "CustomApp");
                dbToUse = getFirestore(customApp);
            }

            const userDocRef = doc(dbToUse, "user_sync", "main_profile");
            let snap = await getDoc(userDocRef);
            if (snap.exists()) {
                cloudData = snap.data();
            } else {
                throw new Error("雲端目前沒有您的備份資料");
            }
        }

        if (cloudData) {
            // 呼叫原本寫好的資料還原套用函式
            if (typeof window.applyCloudData === 'function') {
                await window.applyCloudData(cloudData);
            }
            if (window.showToast) window.showToast("✅ 雲端還原成功！");
        }
    } catch (e) {
        console.error("還原失敗", e);
        if (window.showAlert) window.showAlert("❌ 還原失敗：" + e.message);
    }
};

// 3. 實時偵測雲端異動 (配合 serverTimestamp 微調版)
window.initRealTimeSync = (onDataChange) => {
    // 這裡必須保留 onSnapshot
    onSnapshot(userDocRef, (docSnap) => {
        if (docSnap.exists()) {
            // ★ 專業阻斷邏輯 A：檢查是否為「本地待上傳」的快照
            // 如果這個變動是來自本機剛剛發出的寫入請求，尚未抵達伺服器，hasPendingWrites 會是 true
            if (docSnap.metadata.hasPendingWrites) {
                console.log("☁️ 忽略：這是本機正在上傳中的資料，尚未取得伺服器時間");
                return;
            }

            let data = docSnap.data();

            // ★ 專業阻斷邏輯 B：使用伺服器時間戳比對 (如果您的 lastSync 是毫秒數)
            // 注意：serverTimestamp() 存入後取出會變成 Firestore Timestamp 物件
            let serverTime = data.lastSync ? data.lastSync.toMillis() : 0;

            if (serverTime <= AppState.localLastSync) {
                console.log("☁️ 忽略：雲端時間未更新（迴聲或舊資料）");
                return;
            }

            // 若是真的來自另一台裝置且寫入成功的更新
            AppState.localLastSync = serverTime; // 更新本機時間鎖
            console.log("☁️ 偵測到其他裝置的雲端資料更新，開始下載...");
            onDataChange(data);
        }
    });
};

// ★ 安全版：打包資料並過濾不需要上傳的肥大圖片
window.syncToCloud = async function() {
    // ⛔ 核心攔截：直接從資料庫讀取同步設定
    let isAutoSync = await localforage.getItem('ly_autoSync');
    if (isAutoSync === null) isAutoSync = true; // 預設為開啟

    // 如果自動同步被關閉，且「不是」手動強制備份，就阻擋上傳
    if (!isAutoSync && !isManual) {
        console.log("☁️ 雲端自動同步已關閉，本次變更僅儲存於本機。");
        return; 
    }

    // 檢查 Firebase 貨車是否已經準備好
    if (typeof window.uploadEverything !== 'function') {
        console.warn("Firebase 模組尚未載入完成，本次暫不上傳雲端。");
        return; 
    }
    
    // 1. 從倉庫拿資料
    const records = await localforage.getItem('iching_final_v60') || [];
    const settings = await localforage.getItem('ly_animCfg') || {};

    // ★ 2. 核心防護：上傳雲端前，把巨大的 Base64 圖片字串刪掉！避免塞爆 Firebase
    let settingsToUpload = { ...settings };
    delete settingsToUpload.customSplashImg; // ✂️ 咔嚓！剪掉巨大的圖片字串

    // 3. 將輕量化後的資料交給貨車上傳
    await window.uploadEverything({
        records: records,
        settings: settingsToUpload
    });
};

// ★ 新增：模組與 KEY 載入完成後，主動通知 UI 重新掃描一次開關狀態
if (typeof window.checkCloudKeyStatus === 'function') {
    window.checkCloudKeyStatus();
}
