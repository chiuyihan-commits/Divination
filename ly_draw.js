// ==========================================
// ★ 背景靜默存檔精靈 (專為繪圖與快照設計，完美解鎖返回警告)
// ==========================================
window.silentAutoSaveRecord = async function () {
    let isRecord = (AppState.curRecIndex !== undefined && AppState.curRecIndex !== -1) || window.comesFromRecords === true;
    if (isRecord && AppState.curData) {
        try {
            // ★ 修正：確保寫入正確的主資料庫 iching_final_v60
            let records = await localforage.getItem('iching_final_v60') || [];
            if (records[AppState.curRecIndex]) {

                // 存檔前，同步抓取畫面上最新的筆記內容，避免被洗掉
                AppState.curData.subject = document.getElementById("edit-subject")?.value || AppState.curData.subject || "";
                AppState.curData.judge = document.getElementById("edit-judge")?.value || AppState.curData.judge || "";
                AppState.curData.feedback = document.getElementById("edit-feedback")?.value || AppState.curData.feedback || "";
                AppState.curData.note = document.getElementById("edit-note")?.value || AppState.curData.note || "";
                AppState.curData.currentStatus = document.getElementById("edit-current-status")?.value || AppState.curData.currentStatus || "";
                AppState.curData.copyAddon = document.getElementById("edit-copy-addon")?.value || AppState.curData.copyAddon || "";

                // 👇 ★ 新增應期儲存
                AppState.curData.yingqi = typeof window.getSettingsYingqiSnapshot === 'function' ? window.getSettingsYingqiSnapshot() : {};

                records[AppState.curRecIndex] = AppState.curData;
                await localforage.setItem('iching_final_v60', records);

                if (typeof window.syncToCloud === 'function') window.syncToCloud();

                // ★ 終極解鎖：徹底重置未儲存狀態與筆記快照，讓 Router 放心放行
                window.hasUnsavedChanges = false;
                // ★ 使用統一的全域快照函數
                if (typeof window.getCurrentStateSnapshotString === 'function') {
                    window.recordNotesSnapshot = window.getCurrentStateSnapshotString();
                }
            }
        } catch (err) {
            console.error("背景存檔失敗", err);
        }
    }
};

// ★ 修正後的繪圖開關：切換時強迫底層重算，自動產出對應印章
window.toggleDrawMode = function (isEnabled) {
    let changed = (AppState.isDrawModeEnabled !== isEnabled);
    AppState.isDrawModeEnabled = isEnabled;

    // 讓目前這筆盤，記住自己的專屬開關狀態
    if (AppState.curData) {
        AppState.curData.isDrawModeEnabled = isEnabled;
    }

    if (changed) {
        // 如果將繪圖模式「關閉」，同步收合並隱藏分數細節計算盒子
        if (!isEnabled) {
            AppState.scoreDetailOpen = false;
            let box = document.getElementById("score-detail-box");
            if (box) box.style.display = "none";
        }

        // 在大表渲染前，先將畫面上最新的文字同步回記憶體，防止被覆蓋
        if (AppState.curData) {
            AppState.curData.subject = document.getElementById("edit-subject")?.value || AppState.curData.subject || "";
            AppState.curData.judge = document.getElementById("edit-judge")?.value || AppState.curData.judge || "";
            AppState.curData.feedback = document.getElementById("edit-feedback")?.value || AppState.curData.feedback || "";
            AppState.curData.note = document.getElementById("edit-note")?.value || AppState.curData.note || "";
            AppState.curData.currentStatus = document.getElementById("edit-current-status")?.value || AppState.curData.currentStatus || "";
            AppState.curData.copyAddon = document.getElementById("edit-copy-addon")?.value || AppState.curData.copyAddon || "";
        }

        if (typeof window.renderRes === 'function') window.renderRes();

        // 切換開關後直接背景存檔
        if (typeof window.silentAutoSaveRecord === 'function') {
            window.silentAutoSaveRecord();
        }
    }
};

// ==========================================
// ★ 獨門模組 1：進階爻位理氣與分數計算引擎 (包含沖中逢合/合處逢沖)
// ==========================================
window.pro_getAdvancedYaoInfo = function (opts) {
    let { i, z, zB, fZhiIdx, isMoving, bazi, lines, ben, bian, fuIsHidden, fGZ, isFuOut, GBase } = opts;

    const mk = (targetZ, score = null, isMoving = false, overrideM = null, overrideD = null, advState = null, isBian = false) => {
        let s = ""; if (targetZ == null) return { html: s, isAD: false, isDPo: false };
        let k1 = (10 - bazi.dG + bazi.dZ) % 12; if (k1 < 0) k1 += 12;
        let k2 = (11 - bazi.dG + bazi.dZ) % 12; if (k2 < 0) k2 += 12;

        const colorMap = { 0: "#e6a23c", 1: "#198754", 2: "#0d6efd", 3: "#dc3545", 4: "#8B4513" };
        let elTgt = ZhiFiveMap[targetZ], elM = ZhiFiveMap[bazi.mZ], elD = ZhiFiveMap[bazi.dZ];
        let colM = colorMap[elM], colD = colorMap[elD];

        let isZhiM = (targetZ === bazi.mZ);
        let isMPo = Math.abs(targetZ - bazi.mZ) === 6;
        let isMHe = (targetZ + bazi.mZ) % 12 === 1;

        let isZhiRi = (targetZ === bazi.dZ);
        let isDChong = Math.abs(targetZ - bazi.dZ) === 6;
        let isDHe = (targetZ + bazi.dZ) % 12 === 1;

        let isDMu = (elTgt !== 4 && window.WuXingRels.tomb[elTgt] === bazi.dZ);
        let isDSheng = window.WuXingRels.sheng[elD] === elTgt;
        let isDJue = (window.WuXingRels.jue && window.WuXingRels.jue[elTgt] === bazi.dZ && elTgt !== 4);

        let isDPo = false, isAD = false, isKM = false;

        if (isDChong) {
            if (isMoving) isKM = true;
            else if (score !== null) {
                if (score >= 0) isAD = true;
                else isDPo = true;
            } else {
                let hasQi = false;
                if (targetZ === bazi.mZ) hasQi = true;
                else if (elM === elTgt || window.WuXingRels.sheng[elM] === elTgt) hasQi = true;
                if (isMPo) hasQi = false;

                if (hasQi) isAD = true;
                else isDPo = true;
            }
        }

        let dExtraClass = "";
        if (isDMu) {
            let isTrueRiMu = (score !== null && score < 0);
            dExtraClass = isTrueRiMu ? "anim-true-tomb" : "anim-false-tomb";
        }

        const renderSingle = (txt, bgCol, extraStyle = "", extraClass = "", dataDesc = "") => {
            if (!txt) return "";
            let descAttr = dataDesc ? ` data-desc="${dataDesc}"` : "";
            return `<span class="mark-break ${extraClass}" style="background-color:${bgCol}; ${extraStyle}"${descAttr}>${txt}</span>`;
        };

        if (targetZ === k1 || targetZ === k2) s += '<span class="mark-break">空亡</span>';

        let isChongHe = false, isHeChong = false;
        let chongZ = null, heZ = null;

        if (isMoving && zB !== undefined) {
            let isHuiTouHe = (targetZ + zB) % 12 === 1;
            let isHuiTouChong = Math.abs(targetZ - zB) === 6;

            if (isHuiTouHe && isMPo) { isHeChong = true; heZ = zB; chongZ = bazi.mZ; }
            else if (isHuiTouHe && isDChong) { isHeChong = true; heZ = zB; chongZ = bazi.dZ; }

            if (isHuiTouChong && isMHe) { isChongHe = true; chongZ = zB; heZ = bazi.mZ; }
            else if (isHuiTouChong && isDHe) { isChongHe = true; chongZ = zB; heZ = bazi.dZ; }
        }

        if (!isChongHe && !isHeChong && advState && typeof advState === 'object') {
            if (advState.type === "沖中逢合") { isChongHe = true; chongZ = advState.chongZ; heZ = advState.heZ; }
            if (advState.type === "合處逢沖") { isHeChong = true; chongZ = advState.chongZ; heZ = advState.heZ; }
        }

        if (!isChongHe && !isHeChong) {
            if (isMPo && isDHe) { isChongHe = true; chongZ = bazi.mZ; heZ = bazi.dZ; }
            else if (isMHe && isDChong) { isHeChong = true; heZ = bazi.mZ; chongZ = bazi.dZ; }
        }

        let localTriNames = ["坤", "震", "坎", "兌", "艮", "離", "巽", "乾"];
        let yZhiIdx = Zhi.indexOf(bazi.Y.slice(1, 2));

        let isYChong = (yZhiIdx !== -1) && (Math.abs(targetZ - yZhiIdx) === 6);

        let cond1 = isYChong && isMPo;
        let cond2 = isMPo && isDChong;
        let cond3 = false;

        if (isMPo) {
            let skipCond3 = (isBian && z !== undefined && zB !== undefined && z === zB);
            if (!skipCond3 && lines && ben && bian && GBase) {
                for (let j = 0; j < 6; j++) {
                    // 只檢查「其他」發動的爻
                    if (i !== j && (lines[j] === 6 || lines[j] === 9)) {
                        let upN = localTriNames[j >= 3 ? (ben.id >> 3) : (ben.id & 7)];
                        let z_j = GBase[upN][j >= 3 ? "out" : "in"][j % 3];
                        //if (z_j === bazi.mZ) { cond3 = true; break; }

                        //let bUpN = localTriNames[j >= 3 ? (bian.id >> 3) : (bian.id & 7)];
                        //let zB_j = GBase[bUpN][j >= 3 ? "out" : "in"][j % 3];
                        //if (zB_j === bazi.mZ) { cond3 = true; break; }
                    }
                }
            }
        }

        let isBingShang = cond1 || cond2 || cond3;

        let isDoubleHe = (isMHe && isDHe && !isZhiM && !isZhiRi);

        // ==========================================
        // ★ 印章渲染輸出
        // ==========================================
        if (isDoubleHe) {
            s += renderSingle("明合", "#0d6efd", "box-shadow: 1px 1px 2px rgba(0,0,0,0.2);", "", "日月雙合");
            isChongHe = false; isHeChong = false;
        } else if (isBingShang) {
            let bsDesc = [];
            if (isMPo) bsDesc.push("月破");
            if (isDPo || isDChong) bsDesc.push("日破");
            if (isYChong) bsDesc.push("年破");
            if (cond3) bsDesc.push("動爻沖破");
            let bsStr = bsDesc.join("、") + " (併傷無權)";
            s += renderSingle("併傷", "#212529", "color: #ff6b6b; border: 1px solid #ff6b6b; box-shadow: 0 0 4px rgba(220,53,69,0.6);", "", bsStr);
            isChongHe = false; isHeChong = false;
        } else if (isChongHe || isHeChong) {
            let colC = chongZ !== null ? colorMap[ZhiFiveMap[chongZ]] : "#6f42c1";
            let colH = heZ !== null ? colorMap[ZhiFiveMap[heZ]] : "#0d6efd";

            let txtM = "", bgM = "", txtD = "", bgD = "";

            const getSrcName = (zId, action) => {
                if (zId === bazi.mZ) return `月${action}`;
                if (zId === bazi.dZ) return `日${action}`;
                return `動爻${action}`;
            };

            let cDesc = getSrcName(chongZ, "沖");
            let hDesc = getSrcName(heZ, "合");

            if (chongZ === bazi.mZ) { txtM = "沖"; bgM = colC; }
            else if (chongZ === bazi.dZ) { txtD = "沖"; bgD = colC; }

            if (heZ === bazi.mZ) { txtM = "合"; bgM = colH; }
            else if (heZ === bazi.dZ) { txtD = "合"; bgD = colH; }

            // ✅ 修正：精準分配動爻提供的沖合文字，避免重複
            if (!txtM) {
                txtM = (txtD === "合" || (!txtD && isChongHe)) ? "沖" : "合";
                bgM = (txtM === "沖") ? colC : colH;
            }
            if (!txtD) {
                txtD = (txtM === "沖") ? "合" : "沖";
                bgD = (txtD === "沖") ? colC : colH;
            }

            let baziOrder = window.baziLayoutOrder || 'rtl';
            let chongType = isChongHe ? '沖中逢合' : '合處逢沖';

            let fullDesc = `${cDesc}、${hDesc} (${chongType})`;
            let titleAttr = `title="${chongType}" data-desc="${fullDesc}"`;

            // ✅ 先宣告 dualStamp 變數，避免未定義錯誤
            let dualStamp = "";
            if (baziOrder === 'rtl') {
                dualStamp = `<span class="perfect-yinke-seal" ${titleAttr}><span style="background-color:${bgD}; color:#fff;">${txtD}</span><span style="background-color:${bgM}; color:#fff;">${txtM}</span></span>`;
            } else {
                dualStamp = `<span class="perfect-yinke-seal" ${titleAttr}><span style="background-color:${bgM}; color:#fff;">${txtM}</span><span style="background-color:${bgD}; color:#fff;">${txtD}</span></span>`;
            }

            // ✅ 判斷是否需要附加底部小印章
            let extraTags = [];

            if (isBian) {
                // ★ 變爻：徹底回歸並讀取系統原本就算好的真破、假破、退盡、暗動判定！
                if (isMPo && overrideM) {
                    let mStyle = overrideM === "真破" ? "color:#ffc107; background-color:#171717 !important; border:1px solid #333; box-shadow:0 0 6px rgba(220,53,69,0.5);" : "box-shadow: 1px 1px 2px rgba(0,0,0,0.2);";
                    let mCol = overrideM === "真破" ? "#171717" : colM;
                    extraTags.push(renderSingle(overrideM, mCol, mStyle, "", "變爻月令狀態"));
                }
                if (isDChong && overrideD) {
                    let dStyle = overrideD === "真破" ? "color:#ffc107; background-color:#171717 !important; border:1px solid #333; box-shadow:0 0 6px rgba(220,53,69,0.5);" : "box-shadow: 1px 1px 2px rgba(0,0,0,0.2);";
                    let dCol = colD;
                    if (overrideD === "真破") dCol = "#171717";
                    else if (overrideD === "暗動") dCol = "#6f42c1";
                    else if (overrideD === "退盡") dCol = "#6c757d";

                    extraTags.push(renderSingle(overrideD, dCol, dStyle, "", "變爻日辰狀態"));
                }
            } else {
                // ★ 靜爻與動爻的專屬邏輯 (保留您精心設計的逢補與假破)
                if (isHeChong && !isMoving) {
                    // 靜爻合處逢沖
                    if (isDChong) {
                        if (isAD) extraTags.push(renderSingle("暗動", "#6f42c1", "box-shadow: 1px 1px 2px rgba(0,0,0,0.2);", "", "氣數足，合處逢沖為暗動"));
                        else if (isDPo) extraTags.push(renderSingle("日破", colD, "box-shadow: 1px 1px 2px rgba(0,0,0,0.2);", "", "氣數衰，合處逢沖為日破"));
                    }
                } else if (isChongHe) {
                    if (!isMoving) {
                        // 靜爻沖中逢合 (月破日合)
                        if (isMPo && isDHe) extraTags.push(renderSingle("逢補", "#28a745", "box-shadow: 1px 1px 2px rgba(0,0,0,0.2);", "", "月破日合，沖中逢補"));
                    } else {
                        // 動爻沖中逢合 (月破日合)
                        if (isMPo && isDHe) extraTags.push(renderSingle("假破", "#e6a23c", "box-shadow: 1px 1px 2px rgba(0,0,0,0.2);", "", "動爻月破日合，逢補為假破"));
                    }
                }
            }

            // ✅ 將原本的 s += 改為判斷：有附加印章時，用 Flex 容器完美置中包覆
            if (extraTags.length > 0) {
                let tagsHtml = `<div style="display:flex; gap:3px; justify-content:center; margin-top:1px;">${extraTags.join("")}</div>`;
                s += `<div style="display:inline-flex; flex-direction:column; gap:1px; align-items:center;">${dualStamp}${tagsHtml}</div>`;
            } else {
                s += dualStamp;
            }
        } else {
            let mTxt = null;
            let dTxt = null;

            if (isZhiM) mTxt = overrideM || "月建";
            else if (isMPo) mTxt = overrideM || "月破";
            else if (isMHe) mTxt = overrideM || "月合";

            if (isZhiRi) dTxt = overrideD || "值日";
            else if (isKM) dTxt = "快馬";
            else if (isDPo) dTxt = overrideD ? overrideD : "日破";
            else if (isAD) dTxt = "暗動";
            else if (isDHe) dTxt = overrideD || "日合";
            else if (isDMu) dTxt = "日墓";
            else if (isDJue) dTxt = "日絕";
            else if (isDSheng && isMPo) dTxt = "日生";

            if (mTxt && dTxt) {
                let mShort = mTxt.replace("月", "");
                let dShort = dTxt.replace("日", "").replace("值日", "值");

                if (dTxt === "快馬") dShort = "馬";
                if (dTxt === "暗動") dShort = "暗";
                if (dTxt === "日破") dShort = "破";

                let mStyle = `background-color:${colM}; color:#fff;`;
                let dStyle = `background-color:${colD}; color:#fff;`;

                if (mTxt === "真破") { mShort = "破"; mStyle = "color:#ffc107; background-color:#171717 !important; border:1px solid #333; box-shadow:0 0 6px rgba(220,53,69,0.5);"; }
                else if (mTxt === "假破") { mShort = "破"; }

                if (dTxt === "真破") { dShort = "破"; dStyle = "color:#ffc107; background-color:#171717 !important; border:1px solid #333; box-shadow:0 0 6px rgba(220,53,69,0.5);"; }
                else if (dTxt === "假破") { dShort = "破"; }
                else if (dTxt === "絕" || dTxt === "日絕") { dStyle = "background-color:#6c757d; color:#fff;"; }
                else if (dTxt === "快馬") { dStyle = "background-color:#dc3545; color:#fff;"; }
                else if (dTxt === "暗動") { dStyle = "background-color:#6f42c1; color:#fff;"; }

                let extCls = dTxt.includes("墓") ? dExtraClass : "";
                let baziOrder = window.baziLayoutOrder || 'rtl';
                let fullDesc = `${mTxt}、${dTxt}`;

                if (mShort === "建" && (dShort === "值" || dShort === "建")) {
                    s += renderSingle("明值", colM, "box-shadow: 1px 1px 2px rgba(0,0,0,0.2);", "", "臨日月建(大旺)");
                } else {
                    if (mShort === "建") mShort = "建";
                    if (mTxt === "激動") mShort = "激";
                    if (dTxt === "激動") dShort = "激";

                    if (baziOrder === 'rtl') {
                        s += `<span class="perfect-yinke-seal ${extCls}" data-desc="${fullDesc}"><span style="${dStyle}">${dShort}</span><span style="${mStyle}">${mShort}</span></span>`;
                    } else {
                        s += `<span class="perfect-yinke-seal ${extCls}" data-desc="${fullDesc}"><span style="${mStyle}">${mShort}</span><span style="${dStyle}">${dShort}</span></span>`;
                    }
                }
            }
            else if (mTxt) {
                let fontStyle = mTxt === "真破" ? "color: #ffc107; background-color: #171717 !important; border: 1px solid #333; box-shadow: 0 0 6px rgba(220,53,69,0.5);" : "";
                let displayTxt = (mTxt === "真破" || mTxt === "假破") ? "破" : mTxt;
                s += renderSingle(displayTxt, colM, `box-shadow: 1px 1px 2px rgba(0,0,0,0.2); ${fontStyle}`, "", mTxt);
            }
            else if (dTxt) {
                let fontStyle = dTxt === "真破" ? "color: #ffc107; background-color: #171717 !important; border: 1px solid #333; box-shadow: 0 0 6px rgba(220,53,69,0.5);" : "";
                let displayTxt = (dTxt === "真破" || dTxt === "假破") ? "破" : dTxt;

                let bgCol = colD;
                if (dTxt === "日絕") bgCol = "#6c757d";
                else if (dTxt === "快馬") bgCol = "#dc3545";
                else if (dTxt === "暗動") bgCol = "#6f42c1";

                s += renderSingle(displayTxt, bgCol, `box-shadow: 1px 1px 2px rgba(0,0,0,0.2); ${fontStyle}`, dTxt.includes("墓") ? dExtraClass : "", dTxt);
            }
        }

        let finalHtml = s;
        if (window.AppState && !window.AppState.isDrawModeEnabled) {
            let basicS = "";
            if (targetZ === k1 || targetZ === k2) basicS += renderSingle("空亡", "#ffc107", "color:#333;");
            if (isMPo) basicS += renderSingle("月破", colM, "box-shadow: 1px 1px 2px rgba(0,0,0,0.2);");
            if (isDChong) {
                let dTxt = isAD ? "暗動" : (isDPo ? "日破" : (isKM ? "快馬" : "日沖"));
                let bgCol = isAD ? "#6f42c1" : colD;
                basicS += renderSingle(dTxt, bgCol, "box-shadow: 1px 1px 2px rgba(0,0,0,0.2);");
            }
            finalHtml = basicS;
        }

        return { html: finalHtml, isAD, isDPo };
    };

    let elM = ZhiFiveMap[bazi.mZ], elD = ZhiFiveMap[bazi.dZ];

    // ==========================================
    // ★ 伏神分數與推演 
    // ==========================================
    let scoreF = 0;
    if (fGZ) {
        let elFu = ZhiFiveMap[fZhiIdx];

        if (fZhiIdx === bazi.mZ) scoreF += 1;
        else if (Math.abs(fZhiIdx - bazi.mZ) === 6) scoreF -= 1;
        else if (!(elM === 4 && elFu === 4 && Math.abs(fZhiIdx - bazi.mZ) === 6)) {
            if (elM === elFu || window.WuXingRels.sheng[elM] === elFu) scoreF += 1;
            else if (window.WuXingRels.ke[elM] === elFu) scoreF -= 1;
        }

        if (fZhiIdx === bazi.dZ) scoreF += 1;
        else if (Math.abs(fZhiIdx - bazi.dZ) !== 6) {
            if (!(elD === 4 && elFu === 4 && Math.abs(fZhiIdx - bazi.dZ) === 6)) {
                if (elD === elFu || window.WuXingRels.sheng[elD] === elFu) scoreF += 1;
                else if (window.WuXingRels.ke[elD] === elFu) scoreF -= 1;
            }
        }

        let hasQi_fu = (scoreF >= 0);

        if (Math.abs(fZhiIdx - bazi.dZ) === 6) {
            if (hasQi_fu) scoreF += 1;
            else scoreF -= 1;
        }
    }
    let fuStatus = mk(fZhiIdx, scoreF, false);
    let fuStatusHtml = fuStatus.html;
    if (isFuOut) fuStatusHtml += `<span class="mark-break" style="background-color:#28a745; box-shadow: 1px 1px 2px rgba(0,0,0,0.2);">出伏</span>`;

    // ==========================================
    // ★ 本卦分數計算 
    // ==========================================
    let elTgt = ZhiFiveMap[z], score = 0;

    // 1. 月建分數
    if (z === bazi.mZ) score += 1;
    else if (Math.abs(z - bazi.mZ) === 6) score -= 1;
    else if (!(elM === 4 && elTgt === 4 && Math.abs(z - bazi.mZ) === 6)) {
        if (elM === elTgt || window.WuXingRels.sheng[elM] === elTgt) score += 1;
        else if (window.WuXingRels.ke[elM] === elTgt) score -= 1;
    }

    let baseScore_tgt = score;
    let movingScore_tgt = 0; // ★ 新增：專門記錄動爻支援的分數

    let k1_score = (10 - bazi.dG + bazi.dZ) % 12; if (k1_score < 0) k1_score += 12;
    let k2_score = (11 - bazi.dG + bazi.dZ) % 12; if (k2_score < 0) k2_score += 12;

    // 2. 他爻傳導 (在日辰之前先算！)
    for (let j = 0; j < 6; j++) {
        if (i !== j) {
            let isMv = (lines[j] === 6 || lines[j] === 9);
            let z_j = GBase[TriNames[j >= 3 ? (ben.id >> 3) : (ben.id & 7)]][j >= 3 ? "out" : "in"][j % 3];
            let elMove = ZhiFiveMap[z_j];

            let score_j = 0;

            if (z_j === bazi.mZ) score_j += 1;
            else if (Math.abs(z_j - bazi.mZ) === 6) score_j -= 1;
            else if (elM === elMove || window.WuXingRels.sheng[elM] === elMove) score_j += 1;
            else if (window.WuXingRels.ke[elM] === elMove) score_j -= 1;

            let baseScore_j = score_j;

            if (z_j === bazi.dZ) score_j += 1;
            else if (Math.abs(z_j - bazi.dZ) !== 6) {
                if (elD === elMove || window.WuXingRels.sheng[elD] === elMove) score_j += 1;
                else if (window.WuXingRels.ke[elD] === elMove) score_j -= 1;
            }

            let isDPo_j = Math.abs(z_j - bazi.dZ) === 6;
            let isDayKe_j = window.WuXingRels.ke[elD] === elMove;
            let isAD = false;
            let isRiPo = false;

            if (isDPo_j) {
                if (baseScore_j > 0) {
                    score_j += 1;
                    if (!isMv) isAD = true;
                } else if (baseScore_j < 0) {
                    score_j -= 1;
                    if (!isMv) isRiPo = true;
                } else {
                    if (isDayKe_j) {
                        score_j -= 1;
                    } else {
                        score_j += 1;
                        if (!isMv) isAD = true;
                    }
                }
            }

            if (isMv || isAD) {
                if (isRiPo) continue;

                let bUpN = TriNames[j >= 3 ? (bian.id >> 3) : (bian.id & 7)];
                let zB_j = isMv ? GBase[bUpN][j >= 3 ? "out" : "in"][j % 3] : null;
                let elOB = zB_j !== null ? ZhiFiveMap[zB_j] : null;

                let isKong_j = (z_j === k1_score || z_j === k2_score);
                let isMPo_j = (Math.abs(z_j - bazi.mZ) === 6);
                let isDPo_j_real = (Math.abs(z_j - bazi.dZ) === 6);
                let isDHe_j = ((z_j + bazi.dZ) % 12 === 1);
                let isMHe_j = ((z_j + bazi.mZ) % 12 === 1);
                let isZhiD_j = (z_j === bazi.dZ);
                let isZhiM_j = (z_j === bazi.mZ);
                let isMu_j = (elMove !== 4 && window.WuXingRels.tomb[elMove] === bazi.dZ);

                let isHuiTouKe_j = isMv && (window.WuXingRels.ke[elOB] === elMove);
                let isHuaMu_j = isMv && (zB_j === window.WuXingRels.tomb[elMove] && z_j !== zB_j && elMove !== 4);
                let isHuaJue_j = isMv && (z_j === 0 && zB_j === 5);

                let isDoubleInjury_j = (isMPo_j && isDPo_j_real);
                let isHuaZhenPo_j = false;
                if (isMv && zB_j !== null) {
                    isHuaZhenPo_j = (Math.abs(zB_j - bazi.mZ) === 6 || Math.abs(zB_j - bazi.dZ) === 6);
                }

                let isMutHe_j = false;
                for (let k = 0; k < 6; k++) {
                    if (k !== i && k !== j && (lines[k] === 6 || lines[k] === 9)) {
                        let z_k = GBase[TriNames[k >= 3 ? (ben.id >> 3) : (ben.id & 7)]][k >= 3 ? "out" : "in"][k % 3];
                        if ((z_j + z_k) % 12 === 1) { isMutHe_j = true; break; }
                    }
                }

                let hasPower = true;
                if (isDoubleInjury_j || isHuaZhenPo_j) hasPower = false;
                else if (isHuaMu_j || isHuaJue_j) hasPower = false;
                else if (isKong_j) hasPower = false;
                else if (isDHe_j || isMHe_j || isMutHe_j) hasPower = false;
                else if (score_j < 0 && isMu_j) hasPower = false;
                else if (isHuiTouKe_j && !isZhiD_j && !isZhiM_j) hasPower = false;
                else if (isMPo_j && !isZhiD_j) hasPower = false;

                if (hasPower) {
                    if (elMove === 4 && elTgt === 4 && Math.abs(z_j - z) === 6) {
                    } else if (window.WuXingRels.sheng[elMove] === elTgt) movingScore_tgt += 1;
                    else if (window.WuXingRels.ke[elMove] === elTgt) movingScore_tgt -= 1;
                }
            }
        }
    }

    // 3. 結算總氣數與日辰判定
    let totalSupport = baseScore_tgt + movingScore_tgt;
    score = totalSupport; // 匯總月建與動爻分數

    if (z === bazi.dZ) {
        score += 1;
    } else if (Math.abs(z - bazi.dZ) === 6) {
        // ★ 核心微調：綜合氣數 >= 0，逢沖即為暗動！
        if (totalSupport >= 0) score += 1;
        else score -= 1;
    } else {
        if (elD === elTgt || window.WuXingRels.sheng[elD] === elTgt) score += 1;
        else if (window.WuXingRels.ke[elD] === elTgt) score -= 1;
    }

    let advState = null;
    let z_isMPo = Math.abs(z - bazi.mZ) === 6;
    let z_isDPo = Math.abs(z - bazi.dZ) === 6;
    let z_isMHe = (z + bazi.mZ) % 12 === 1;
    let z_isDHe = (z + bazi.dZ) % 12 === 1;

    if (isMoving) {
        let isHuiTouHe = (z + zB) % 12 === 1;
        let isHuiTouChong = Math.abs(z - zB) === 6;

        if (isHuiTouHe && (z_isMPo || z_isDPo)) {
            advState = "合處逢沖";
        }

        for (let j = 0; j < 6; j++) {
            if (i !== j && (lines[j] === 6 || lines[j] === 9)) {
                let otherZ = GBase[TriNames[j >= 3 ? (ben.id >> 3) : (ben.id & 7)]][j >= 3 ? "out" : "in"][j % 3];
                if (Math.abs(z - otherZ) === 6) {
                    if (z_isMHe) advState = { type: "沖中逢合", chongZ: otherZ, heZ: bazi.mZ };
                    else if (z_isDHe) advState = { type: "沖中逢合", chongZ: otherZ, heZ: bazi.dZ };
                }
                if ((z + otherZ) % 12 === 1) {
                    if (z_isMPo) advState = { type: "合處逢沖", heZ: otherZ, chongZ: bazi.mZ };
                    else if (z_isDPo) advState = { type: "合處逢沖", heZ: otherZ, chongZ: bazi.dZ };
                }
                if (isHuiTouHe && Math.abs(z - otherZ) === 6) {
                    advState = { type: "沖中逢合", chongZ: otherZ, heZ: zB };
                }
                if (isHuiTouChong && (z + otherZ) % 12 === 1) {
                    advState = { type: "合處逢沖", heZ: otherZ, chongZ: zB };
                }
            }
        }
    }

    let myStatus = mk(z, score, isMoving, null, null, advState);

    let wangCount = 0;
    if (z === bazi.mZ) wangCount++;
    if (z === bazi.dZ) wangCount++;
    if (window.WuXingRels.sheng[elM] === elTgt) wangCount++;
    if (window.WuXingRels.sheng[elD] === elTgt) wangCount++;
    if (isMoving || myStatus.isAD) wangCount++;

    if (isMoving && zB !== undefined) {
        if (window.WuXingRels.jin[z] === zB) wangCount++;
        if (window.WuXingRels.sheng[ZhiFiveMap[zB]] === elTgt) wangCount++;
    }

    let otherDongSheng = false;
    let activeZhisForSanhe = [bazi.dZ, bazi.mZ, z];
    if (isMoving && zB !== undefined) activeZhisForSanhe.push(zB);

    for (let j = 0; j < 6; j++) {
        if (i !== j && (lines[j] === 6 || lines[j] === 9)) {
            let z_j = GBase[TriNames[j >= 3 ? (ben.id >> 3) : (ben.id & 7)]][j >= 3 ? "out" : "in"][j % 3];
            let zB_j = GBase[TriNames[j >= 3 ? (bian.id >> 3) : (bian.id & 7)]][j >= 3 ? "out" : "in"][j % 3];
            if (window.WuXingRels.sheng[ZhiFiveMap[z_j]] === elTgt) otherDongSheng = true;
            activeZhisForSanhe.push(z_j, zB_j);
        }
    }
    if (otherDongSheng) wangCount++;

    let isZInSanhe = false;
    let k1 = (10 - bazi.dG + bazi.dZ) % 12; if (k1 < 0) k1 += 12;
    let k2 = (11 - bazi.dG + bazi.dZ) % 12; if (k2 < 0) k2 += 12;

    const shGroupsAll = [{ req: [2, 6, 10] }, { req: [11, 3, 7] }, { req: [8, 0, 4] }, { req: [5, 9, 1] }];
    shGroupsAll.forEach(sh => {
        if (sh.req.includes(z) && sh.req.every(reqZhi => activeZhisForSanhe.includes(reqZhi))) {
            let isKong = sh.req.some(reqZhi => reqZhi === k1 || reqZhi === k2);
            if (!isKong) isZInSanhe = true;
        }
    });

    if (wangCount >= 4 && !isZInSanhe) {
        myStatus.html += '<span class="mark-break" style="background-color:#dc3545; color:#fff; border-radius:3px; letter-spacing:1px; box-shadow: 1px 1px 2px rgba(0,0,0,0.3);">過旺</span>';
    }

    // ==========================================
    // ★ 變爻 分數與專屬高級理氣掃描
    // ==========================================
    let scoreB = 0, bStatusObj = { html: "" };
    if (isMoving) {
        let elB = ZhiFiveMap[zB];

        if (zB === bazi.mZ) scoreB += 1;
        else if (Math.abs(zB - bazi.mZ) === 6) scoreB -= 1;
        else if (!(elM === 4 && elB === 4 && Math.abs(zB - bazi.mZ) === 6)) {
            if (elM === elB || window.WuXingRels.sheng[elM] === elB) scoreB += 1;
            else if (window.WuXingRels.ke[elM] === elB) scoreB -= 1;
        }

        let baseScore_B = scoreB;

        if (zB === bazi.dZ) scoreB += 1;
        else if (Math.abs(zB - bazi.dZ) !== 6) {
            if (!(elD === 4 && elB === 4 && Math.abs(zB - bazi.dZ) === 6)) {
                if (elD === elB || window.WuXingRels.sheng[elD] === elB) scoreB += 1;
                else if (window.WuXingRels.ke[elD] === elB) scoreB -= 1;
            }
        }

        if (Math.abs(zB - bazi.dZ) === 6) {
            let isDayKe_B = window.WuXingRels.ke[elD] === elB;
            if (baseScore_B > 0) scoreB += 1;
            else if (baseScore_B < 0) scoreB -= 1;
            else {
                if (isDayKe_B) scoreB -= 1;
                else scoreB += 1;
            }
        }

        let overrideM = null, overrideD = null;
        let isHuaMu = (zB === window.WuXingRels.tomb[elTgt] && z !== zB && elTgt !== 4);
        let isTrueHuaMu = isHuaMu && (elTgt !== 0);
        let isHuaJue = (z === 0 && zB === 5);
        let zbShengZ = window.WuXingRels.sheng[elB] === elTgt, zbKeZ = window.WuXingRels.ke[elB] === elTgt;

        let advStateB = null;
        let isHuiTouChong = Math.abs(z - zB) === 6;
        let isHuiTouHe = (z + zB) % 12 === 1;

        let zb_isMPo = Math.abs(zB - bazi.mZ) === 6;
        let zb_isDPo = Math.abs(zB - bazi.dZ) === 6;
        let zb_isMHe = (zB + bazi.mZ) % 12 === 1;
        let zb_isDHe = (zB + bazi.dZ) % 12 === 1;

        let kw1 = (10 - bazi.dG + bazi.dZ) % 12; if (kw1 < 0) kw1 += 12;
        let kw2 = (11 - bazi.dG + bazi.dZ) % 12; if (kw2 < 0) kw2 += 12;
        let zb_isKong = (zB === kw1 || zB === kw2);

        let isHuaSanHe = false;
        let activeZhis = [bazi.dZ, bazi.mZ, z];
        for (let sh of shGroupsAll) {
            if (sh.req.includes(zB)) {
                let count = 1;
                if (activeZhis.includes(sh.req[0]) && sh.req[0] !== zB) count++;
                if (activeZhis.includes(sh.req[1]) && sh.req[1] !== zB) count++;
                if (activeZhis.includes(sh.req[2]) && sh.req[2] !== zB) count++;
                if (count >= 3) isHuaSanHe = true;
            }
        }

        let isRule2 = zbShengZ || zbKeZ || isHuiTouChong || isHuiTouHe;
        let isHuaJin = window.WuXingRels.jin[z] === zB;
        let isHuaTui = window.WuXingRels.tui[z] === zB;
        let isFuYin = (z === zB);
        let isRule3 = isHuaMu || isHuaJue || isHuaJin || isHuaSanHe || isFuYin;

        if (zb_isMPo) {
            if (isHuaTui) overrideM = "真破";
            else if (isRule2 || isRule3) overrideM = "假破";
            else overrideM = "真破";
        }

        if (zb_isDPo) {
            let isM_Ke_zB = window.WuXingRels.ke[elM] === elB;
            if (zb_isMPo || isM_Ke_zB) {
                if (isHuaTui) overrideD = "退盡";
                else if (isRule2 || isRule3) overrideD = "假破";
                else overrideD = "日破";
            } else {
                if (isHuaTui) overrideD = "退盡";
                else if (isRule2 || isRule3) overrideD = "假破";
                else overrideD = "暗動";
            }
        }

        if (isHuiTouChong && (zb_isMHe || zb_isDHe)) advStateB = "沖中逢合";
        if (isHuiTouHe && (zb_isMPo || zb_isDPo)) advStateB = "合處逢沖";

        bStatusObj = mk(zB, scoreB, false, overrideM, overrideD, advStateB, true);

        if (isHuiTouHe && zb_isDPo) {
            bStatusObj.html += '<span class="mark-break" style="background-color:#6c757d; color:#fff; border: 1px dashed #333; letter-spacing:1px; box-shadow: 1px 1px 2px rgba(0,0,0,0.3);">負面</span>';
        }

        if (isHuaMu) {
            let tombClass = isTrueHuaMu ? "anim-true-tomb" : "anim-false-tomb";
            bStatusObj.html += `<span class="mark-break ${tombClass}" style="background-color:#8B4513;">化墓</span>`;
        }
        if (isHuaJue) bStatusObj.html += `<span class="mark-break" style="background-color:#6c757d;">化絕</span>`;

        if (z === zB) {
            bStatusObj.html += '<span class="mark-break" style="background-color:#23272b; border: 1px solid #111; letter-spacing:1px; box-shadow: 1px 1px 2px rgba(0,0,0,0.3);">伏吟</span>';
        }
        else if (Math.abs(z - zB) === 6) {
            if (zbKeZ) bStatusObj.html += '<span class="mark-break" style="background-color:#dc3545; letter-spacing:1px; box-shadow: 1px 1px 2px rgba(0,0,0,0.3);">回沖剋</span>';
            else bStatusObj.html += '<span class="mark-break" style="background-color:#23272b; border: 1px solid #111; letter-spacing:1px; box-shadow: 1px 1px 2px rgba(0,0,0,0.3);">反吟</span>';
        }
        else if (window.WuXingRels.jin[z] === zB) bStatusObj.html += '<span class="mark-break" style="background-color:#e6a23c; letter-spacing:1px;">進神</span>';
        else if (window.WuXingRels.tui[z] === zB) bStatusObj.html += '<span class="mark-break" style="background-color:#6c757d; letter-spacing:1px;">退神</span>';
        else if (zbKeZ) {
            if (!zb_isKong && !zb_isMPo && !zb_isDPo) {
                score -= 1;
                bStatusObj.html += `<span class="mark-break" style="background-color:#dc3545;">回剋</span>`;
            } else if (zb_isMPo || zb_isDPo) {
                bStatusObj.html += `<span class="mark-break" style="background-color:#e6a23c; color:#000;">回剋</span>`;
            } else if (zb_isKong) {
                bStatusObj.html += `<span class="mark-break" style="background-color:#ea9999; color:#000;">回剋</span>`;
            }
        }
        else if (zbShengZ) bStatusObj.html += `<span class="mark-break" style="background-color:#198754;">回生</span>`;

        if (!fuIsHidden && fGZ && zB === fZhiIdx) bStatusObj.html += '<span class="mark-break" style="background-color:#20c997; letter-spacing:1px;">伏顯</span>';
    }

    // ==========================================
    // ★ 飛伏神進階理氣與印章判定
    // ==========================================
    if (fGZ) {
        let elFu = ZhiFiveMap[fZhiIdx];
        let k1 = (10 - bazi.dG + bazi.dZ) % 12; if (k1 < 0) k1 += 12;
        let k2 = (11 - bazi.dG + bazi.dZ) % 12; if (k2 < 0) k2 += 12;

        let isFeiKong = (z === k1 || z === k2);
        let isFeiPo = Math.abs(z - bazi.mZ) === 6 || Math.abs(z - bazi.dZ) === 6;
        let isFeiHe = (z + bazi.mZ) % 12 === 1 || (z + bazi.dZ) % 12 === 1;
        let isFeiMuDay = (elTgt !== 4 && window.WuXingRels.tomb[elTgt] === bazi.dZ);

        let isFuKong = (fZhiIdx === k1 || fZhiIdx === k2);
        let isFuMPo = Math.abs(fZhiIdx - bazi.mZ) === 6;
        let isFuDPo = Math.abs(fZhiIdx - bazi.dZ) === 6 && scoreF < 0;
        let isFuPo = isFuMPo || isFuDPo;
        let isFuInjured = isFuKong || isFuPo;
        let fuHasQi = scoreF >= 0;

        let meetsGeneralChuFu = (isFeiKong || isFeiPo || isFeiMuDay || isFeiHe) && !isFuInjured && fuHasQi;

        const renderStamp = (txt, bg, color = "#fff") => `<span class="mark-break" style="background-color:${bg}; color:${color}; box-shadow: 1px 1px 2px rgba(0,0,0,0.2); border:1px solid #111;">${txt}</span>`;

        let extraFuStamp = "";
        if (window.WuXingRels.sheng[elTgt] === elFu) {
            if (fZhiIdx === bazi.dZ) meetsGeneralChuFu = true;
        }
        else if (window.WuXingRels.ke[elTgt] === elFu) {
            if (score < scoreF || isFeiKong || isFeiPo) {
                extraFuStamp += renderStamp("假壓", "#6c757d");
                meetsGeneralChuFu = true;
            } else {
                extraFuStamp += renderStamp("壓制", "#212529");
            }
        }
        else if (window.WuXingRels.sheng[elFu] === elTgt) {
            if (scoreF > score || (!isFuInjured && scoreF >= 0)) {
                extraFuStamp += renderStamp("假洩", "#17a2b8");
            } else {
                extraFuStamp += renderStamp("洩氣", "#0dcaf0", "#000");
            }
        }
        else if (window.WuXingRels.ke[elFu] === elTgt) {
            if (!isFuInjured && fuHasQi && (isFeiKong || isFeiHe || isFeiMuDay || isFeiPo || score < scoreF)) {
                extraFuStamp += renderStamp("出暴", "#dc3545");
                meetsGeneralChuFu = true;
            } else {
                extraFuStamp += renderStamp("假暴", "#e6a23c");
            }
        }

        if (isMoving) {
            meetsGeneralChuFu = false;
        }

        if (meetsGeneralChuFu && !isFuOut) {
            isFuOut = true;
            fuStatusHtml += renderStamp("出伏", "#28a745");
        }

        fuStatusHtml += extraFuStamp;
    }

    return { score, statusHtml: myStatus.html, isAD: myStatus.isAD, isDPo: myStatus.isDPo, bstatusHtml: bStatusObj.html, fuStatusHtml };
};

// ==========================================
// ★ 獨門模組 2：嚴格三合局運算引擎
// ==========================================
window.pro_calcSanheTable = function (curData, cEl) {
    let dZhiIdx = curData.bazi.dZ;
    let nodes = [];
    nodes.push({ id: 'bz-d', z: dZhiIdx, active: true, type: 'day' });
    nodes.push({ id: 'bz-m', z: curData.bazi.mZ, active: true, type: 'month' });

    let isShiIdx = curData.ben.shi - 1;

    for (let i = 0; i < 6; i++) {
        let zRow = Zhi.indexOf(curData.rows[i].gz.slice(1, 2));
        let isMv = curData.rows[i].move !== "";
        let isActiveNode = (isMv || curData.rows[i].isAnDong) && !curData.rows[i].isRiPo;

        // ★ 世爻三合局遇回頭剋判定
        if (i === isShiIdx && isMv && curData.rows[i].bgz) {
            let elTgt = ZhiFiveMap[zRow];
            let elBian = ZhiFiveMap[Zhi.indexOf(curData.rows[i].bgz.slice(1, 2))];
            if (window.WuXingRels.ke[elBian] === elTgt) {
                isActiveNode = false; // 剝奪世爻結局資格，交給日月建
            }
        }

        nodes.push({ id: `yao-tgt-${i}`, z: zRow, active: isActiveNode, type: 'tgt', idx: i });
        if (isMv && curData.rows[i].bgz) {
            nodes.push({ id: `yao-src-${i}`, z: Zhi.indexOf(curData.rows[i].bgz.slice(1, 2)), active: true, type: 'src', idx: i });
        }
    }

    let activeNodes = nodes.filter(n => n.active);
    const sanHeAll = [
        { req: [2, 6, 10], center: 6, name: "寅午戌", el: "火" },
        { req: [11, 3, 7], center: 3, name: "亥卯未", el: "木" },
        { req: [8, 0, 4], center: 0, name: "申子辰", el: "水" },
        { req: [5, 9, 1], center: 9, name: "巳酉丑", el: "金" }
    ];

    let formedSanhe = [];
    sanHeAll.forEach(sh => {
        for (let i = 0; i < activeNodes.length - 2; i++) {
            for (let j = i + 1; j < activeNodes.length - 1; j++) {
                for (let k = j + 1; k < activeNodes.length; k++) {
                    let triplet = [activeNodes[i], activeNodes[j], activeNodes[k]];
                    let zSet = new Set(triplet.map(n => n.z));

                    if (zSet.has(sh.req[0]) && zSet.has(sh.req[1]) && zSet.has(sh.req[2])) {
                        let isValid = true;
                        for (let node of triplet) {
                            if (node.type === 'src') {
                                let hasOwnTgt = triplet.some(t => t.type === 'tgt' && t.idx === node.idx);
                                if (!hasOwnTgt) { isValid = false; break; }
                            }
                        }

                        if (isValid) {
                            let mZ = curData.bazi.mZ, dZ = curData.bazi.dZ;
                            let kIdx1 = (10 - curData.bazi.dG + dZ) % 12; if (kIdx1 < 0) kIdx1 += 12;
                            let kIdx2 = (11 - curData.bazi.dG + dZ) % 12; if (kIdx2 < 0) kIdx2 += 12;

                            let totalInjuries = 0, totalIllnesses = 0, hasDoubleKill = false;
                            let isShiIdx = curData.ben.shi - 1; // 取得當前世爻的正確索引 (0-5)

                            for (let node of triplet) {
                                let z = node.z, el = ZhiFiveMap[z];
                                let isMPo = (Math.abs(z - mZ) === 6), isDPo = (Math.abs(z - dZ) === 6);

                                // ==========================================
                                // ★ 核心易理修正：動不怕破、日月為造化之源
                                // ==========================================
                                let isStrongNode = false;
                                if (node.type === 'tgt' && node.idx !== undefined) {
                                    // 若本卦的本爻為發動之爻，取得豁免權 (動不怕破 / 沖為快馬)
                                    if (curData.rows[node.idx].move && curData.rows[node.idx].move !== "") {
                                        isStrongNode = true;
                                    }
                                } else if (node.type === 'day' || node.type === 'month') {
                                    // 日辰、月建為造化之源，本身不論破
                                    isStrongNode = true;
                                }
                                // ★ 變爻 (node.type === 'src') 刻意不給予豁免！逢月破即為「化破無權」，無法替補本卦成局。

                                // 若擁有強勢豁免權，強制消除破與沖的負面標記
                                if (isStrongNode) {
                                    isMPo = false;
                                    isDPo = false;
                                }

                                // ✅ 修正：變爻 (src) 沒有豁免權，只要遭遇月破或日破 (化破)，直接一擊必殺宣告破局！
                                if (node.type === 'src' && (isMPo || isDPo)) {
                                    isValid = false;
                                }

                                if (isMPo && isDPo) hasDoubleKill = true;
                                if (isMPo || isDPo) totalInjuries++;

                                let isKong = (z === kIdx1 || z === kIdx2);

                                // ✅ 修正：動爻不入月墓，只論日墓。還給巳酉丑成局的權利！
                                let isRuMu = false;
                                if (el !== 4) {
                                    if (isStrongNode) {
                                        isRuMu = (dZ === window.WuXingRels.tomb[el]);
                                    } else {
                                        isRuMu = (mZ === window.WuXingRels.tomb[el] || dZ === window.WuXingRels.tomb[el]);
                                    }
                                }
                                let isHuaMu = false, isHuaJue = false;

                                if (node.type === 'tgt' && node.idx !== undefined) {
                                    let row = curData.rows[node.idx];
                                    if (row.move && row.bgz) {
                                        let zB = Zhi.indexOf(row.bgz.slice(1, 2));

                                        // 核心易理：只有當「發動化墓的爻剛好是世爻」時，才算入化墓病灶！
                                        if (zB === window.WuXingRels.tomb[el] && z !== zB && el !== 4) {
                                            if (node.idx === isShiIdx) {
                                                isHuaMu = true;
                                            }
                                        }
                                        if (z === 0 && zB === 5) isHuaJue = true;
                                    }
                                }

                                // 結算該節點病灶
                                if (isKong || isRuMu || isHuaMu || isHuaJue) totalIllnesses++;
                            }

                            if (hasDoubleKill || (totalInjuries >= 1 && totalIllnesses >= 1) || totalInjuries >= 2) {
                                isValid = false;
                            }
                        }
                        if (isValid && !formedSanhe.some(f => f.name === sh.name)) formedSanhe.push(sh);
                    }
                }
            }
        }
    });

    curData.strictSanheList = formedSanhe; // 存回全域供畫線使用
    let sanheRows = [], benGongStr = curData.ben.gong;
    let gongF = FiveEl.indexOf(GuaElMap[benGongStr]);

    if (formedSanhe.length === 0) {
        sanheRows.push(`<td colspan="4" rowspan="4" style="color:#999; text-align:center; vertical-align:middle; font-weight:normal; letter-spacing:2px;">無三合局</td>`);
        sanheRows.push(""); sanheRows.push(""); sanheRows.push("");
    } else {
        for (let i = 0; i < 4; i++) {
            if (i < formedSanhe.length) {
                let sh = formedSanhe[i];
                let lq = getRel(gongF, FiveEl.indexOf(sh.el));
                sanheRows.push(`<td class="bg-light">${cEl(sh.name)}</td> <td class="bg-light">${cEl(sh.el)}</td> <td>${lq}</td> <td><span style="color:var(--red);">成局</span></td>`);
            } else { sanheRows.push(`<td class="bg-light">-</td><td class="bg-light">-</td><td>-</td><td>-</td>`); }
        }
    }
    return sanheRows;
};

// ==========================================
// ★ 動態 UI 植入 (當 ly_draw.js 載入時，自動產生專屬按鈕)
// ==========================================
(function initDrawUI() {
    let filterBar = document.getElementById("rel-filter-bar");
    if (filterBar) {
        // ★ 強制加入橫向滑動能力，避免小螢幕切掉右側按鈕
        filterBar.style.display = "flex";
        filterBar.style.overflowX = "auto";
        filterBar.style.flexWrap = "nowrap";
        filterBar.style.scrollbarWidth = "none"; // 隱藏醜醜的捲軸列
        filterBar.innerHTML = `
            <div id="yao-score-display" onclick="toggleScoreDetail()"
                style="cursor:pointer; display:flex; align-items:center; justify-content:center; background:#111; color:#e6a23c; font-weight:bold; width:38px; height:38px; border:2px solid #e6a23c; border-radius:6px; margin-right:8px; font-size:1.05rem; box-shadow: 0 0 6px rgba(230,162,60,0.4); flex-shrink:0; box-sizing:border-box; transition: all 0.2s ease;">☯</div>
            <button class="seal-btn btn-none" onclick="setRelFilter('無')">無</button>
            <button class="seal-btn btn-all-plus" onclick="setRelFilter('全+')">全<sup>+</sup></button>
            <button class="seal-btn btn-all active" onclick="setRelFilter('全')">全</button>
            <button class="seal-btn btn-ming" onclick="setRelFilter('明')">明</button>
            <button class="seal-btn btn-sheng" onclick="setRelFilter('生')">生</button>
            <button class="seal-btn btn-chain-sheng" onclick="setRelFilter('生⁺')">生<sup>+</sup></button>
            <button class="seal-btn btn-ke" onclick="setRelFilter('剋')">剋</button>
            <button class="seal-btn btn-chong" onclick="setRelFilter('沖')">沖</button>
            <button class="seal-btn btn-he" onclick="setRelFilter('合')">合</button>
            <button class="seal-btn btn-bi" onclick="setRelFilter('比')">比</button>
            <button class="seal-btn btn-mu" onclick="setRelFilter('墓')">墓</button>
            <button class="seal-btn btn-xingmu" onclick="setRelFilter('形墓')">墓<sup>形</sup></button>
        `;
    }
})();


// ==========================================
// ★ 3. 視圖渲染器 (View Engine)
// ==========================================
function renderSVGFromPayload(relationsArray) {
    let svg = $("rel-svg"), g = $("rel-lines");
    svg.style.height = $("result-view").scrollHeight + "px";
    let svgRect = svg.getBoundingClientRect();

    const isMobile = window.matchMedia("(max-width: 768px) and (orientation: portrait)").matches;
    const UI = isMobile
        ? { baseOff: 18, spanS: 0.05, spanL: 0.1, pushLeft: 25, pushRight: 25, step: 15, curveX: 15, curveY: 15, textX: 30, textY: 13, font: "11px", mergeMid: 10, backOff2: 15 }
        : { baseOff: 40, spanS: 0.15, spanL: 0.35, pushLeft: 50, pushRight: 60, step: 35, curveX: 30, curveY: 35, textX: 40, textY: 16, font: "13px", mergeMid: 20, backOff2: 30 };

    let placedTexts = [], placedCurves = [];
    let svgBuffer = [];

    // 將邏輯陣列轉為 SVG 字串
    relationsArray.forEach(rel => {
        if (rel.type === 'normal') {
            svgBuffer.push(getLineSvgString(rel, svgRect, UI, placedCurves, placedTexts));
        } else if (rel.type === 'merge') {
            svgBuffer.push(getMergeLineSvgString(rel, svgRect, UI, placedCurves, placedTexts));
        } else if (rel.type === 'triangle_marker') {
            svgBuffer.push(getTriangleMarkerSvgString(rel, svgRect));
        } else if (rel.type === 'bounding_box') {
            svgBuffer.push(getBoundingBoxSvgString(rel, svgRect));
        }
    });

    // ★ 效能優化：一次性寫入 DOM
    g.innerHTML = svgBuffer.join('');
}

// ==========================================
// ★ 4. SVG 幾何計算工廠 (Math Helpers)
// ==========================================
function getLineSvgString(rel, svgRect, UI, placedCurves, placedTexts) {
    let srcEl = $(rel.srcId), tgtEl = $(rel.tgtId);
    if (!srcEl || !tgtEl) return "";

    let srcNode = srcEl.querySelector('.zhi-char') || srcEl;
    let tgtNode = tgtEl.querySelector('.zhi-char') || tgtEl;
    let srcRect = srcNode.getBoundingClientRect(), tgtRect = tgtNode.getBoundingClientRect();

    let sx = srcRect.left + srcRect.width / 2 - svgRect.left, sy = srcRect.top + srcRect.height / 2 - svgRect.top;
    let tx = tgtRect.left + tgtRect.width / 2 - svgRect.left, ty = tgtRect.top + tgtRect.height / 2 - svgRect.top;
    let cx, cy, dx = tx - sx, dy = ty - sy, span = Math.abs(dy);

    if (rel.routeType === "fu_in" || rel.routeType === "fu_out") {
        sx = srcRect.right - svgRect.left + 2; tx = tgtRect.left - svgRect.left - 2;
        cx = sx + (tx - sx) / 2; cy = sy + dy / 2 - UI.baseOff - span * UI.spanS;
    } else if (rel.routeType === "bian_in" || rel.routeType === "bian_out") {
        sx = srcRect.left - svgRect.left - 2; tx = tgtRect.right - svgRect.left + 2;
        cx = sx + (tx - sx) / 2; cy = sy + dy / 2 - UI.baseOff - span * UI.spanS;
    } else if (rel.routeType === "self_forward") {
        sx = srcRect.right - svgRect.left + 2; tx = tgtRect.left - svgRect.left - 2;
        cx = (sx + tx) / 2; cy = sy - UI.baseOff - Math.abs(dx) * UI.spanS;
    } else if (rel.routeType === "self_backward_1") {
        sx = srcRect.left - svgRect.left - 2; tx = tgtRect.right - svgRect.left + 2;
        cx = (sx + tx) / 2; cy = sy + UI.baseOff + Math.abs(dx) * UI.spanS;
    } else if (rel.routeType === "yao_right") {
        sx = srcRect.right - svgRect.left - 2; tx = tgtRect.right - svgRect.left - 2;
        cx = Math.max(sx, tx) + UI.pushRight + span * UI.spanL; cy = sy + dy / 2;
    } else {
        cx = Math.min(sx, tx) - UI.pushLeft - span * UI.spanL; cy = sy + dy / 2;
    }

    let pushDirX = 0, pushDirY = 0;
    if (rel.routeType === "normal") { pushDirX = -UI.step; pushDirY = 0; }
    else if (rel.routeType === "yao_right") { pushDirX = UI.step; pushDirY = 0; }
    else if (rel.routeType.includes("fu") || rel.routeType === "self_forward") { pushDirX = 0; pushDirY = -UI.step; }
    else { pushDirX = 0; pushDirY = UI.step; }

    for (let tries = 0; tries < 15; tries++) {
        if (!placedCurves.some(pc => Math.abs(pc.cx - cx) < UI.curveX && Math.abs(pc.cy - cy) < UI.curveY)) break;
        cx += pushDirX; cy += pushDirY;
    }
    placedCurves.push({ cx: cx, cy: cy });

    let markerAttr = rel.marker ? `marker-end="url(#${rel.marker})"` : "";
    let customClass = rel.className ? `class="${rel.className}"` : "";
    let finalPath = `<path ${customClass} d="M ${sx} ${sy} Q ${cx} ${cy} ${tx} ${ty}" fill="none" stroke="${rel.color}" stroke-width="${rel.weight}" stroke-dasharray="${rel.dash}" ${markerAttr} style="opacity:0.9; filter: drop-shadow(1px 2px 3px ${rel.shadow});"/>`;

    let midX = sx * 0.25 + cx * 0.5 + tx * 0.25, midY = sy * 0.25 + cy * 0.5 + ty * 0.25;
    let shiftY = 0, textStep = UI.textY, sign = 1;
    for (let tries = 0; tries < 15; tries++) {
        if (!placedTexts.some(pt => Math.abs(pt.x - midX) < UI.textX && Math.abs(pt.y - (midY + shiftY)) < UI.textY)) break;
        shiftY = textStep * sign;
        if (sign === 1) sign = -1; else { sign = 1; textStep += UI.textY; }
    }
    placedTexts.push({ x: midX, y: midY + shiftY });

    let labelClassBg = rel.labelClassName ? `rel-label-bg ${rel.labelClassName}` : "rel-label-bg";
    let labelClassFg = rel.labelClassName ? `rel-label ${rel.labelClassName}` : "rel-label";
    return finalPath + `<text class="${labelClassBg}" style="font-size:${UI.font};" x="${midX}" y="${midY + shiftY}" dy="-5">${rel.text}</text><text class="${labelClassFg}" style="font-size:${UI.font};" x="${midX}" y="${midY + shiftY}" dy="-5" fill="${rel.color}">${rel.text}</text>`;
}

function getMergeLineSvgString(rel, svgRect, UI, placedCurves, placedTexts) {
    let srcEl1 = $(rel.srcId1), srcEl2 = $(rel.srcId2), tgtEl = $(rel.tgtId);
    if (!srcEl1 || !srcEl2 || !tgtEl) return "";

    let r1 = (srcEl1.querySelector('.zhi-char') || srcEl1).getBoundingClientRect();
    let r2 = (srcEl2.querySelector('.zhi-char') || srcEl2).getBoundingClientRect();
    let rt = (tgtEl.querySelector('.zhi-char') || tgtEl).getBoundingClientRect();

    let sx1 = r1.left + r1.width / 2 - svgRect.left, sy1 = r1.bottom - svgRect.top;
    let sx2 = r2.left + r2.width / 2 - svgRect.left, sy2 = r2.bottom - svgRect.top;
    let tx = rt.left + rt.width / 2 - svgRect.left, ty = rt.top + rt.height / 2 - svgRect.top;

    let midX = (sx1 + sx2) / 2, midY = Math.max(sy1, sy2) + UI.mergeMid;
    let path1 = `M ${sx1} ${sy1} L ${midX} ${midY}`, path2 = `M ${sx2} ${sy2} L ${midX} ${midY}`;
    let span = Math.abs(ty - midY);
    let cx = Math.min(midX, tx) - UI.pushLeft - span * UI.spanL, cy = midY + span / 2;

    let markerAttr = rel.marker ? `marker-end="url(#${rel.marker})"` : "";
    let customClass = rel.className ? `class="${rel.className}"` : "";
    let finalPath = `<path ${customClass} d="${path1} ${path2} M ${midX} ${midY} Q ${cx} ${cy} ${tx} ${ty}" fill="none" stroke="${rel.color}" stroke-width="${rel.weight}" stroke-dasharray="${rel.dash}" ${markerAttr} style="opacity:0.9; filter: drop-shadow(1px 2px 3px ${rel.shadow});"/>`;

    let txtX = midX * 0.25 + cx * 0.5 + tx * 0.25, txtY = midY * 0.25 + cy * 0.5 + ty * 0.25;
    let shiftY = 0, textStep = UI.textY, sign = 1;
    for (let tries = 0; tries < 15; tries++) {
        if (!placedTexts.some(pt => Math.abs(pt.x - txtX) < UI.textX && Math.abs(pt.y - (txtY + shiftY)) < UI.textY)) break;
        shiftY = textStep * sign;
        if (sign === 1) sign = -1; else { sign = 1; textStep += UI.textY; }
    }
    placedTexts.push({ x: txtX, y: txtY + shiftY });

    let labelClassBg = rel.labelClassName ? `rel-label-bg ${rel.labelClassName}` : "rel-label-bg";
    let labelClassFg = rel.labelClassName ? `rel-label ${rel.labelClassName}` : "rel-label";
    return finalPath + `<text class="${labelClassBg}" style="font-size:${UI.font};" x="${txtX}" y="${txtY + shiftY}" dy="-5">${rel.text}</text><text class="${labelClassFg}" style="font-size:${UI.font};" x="${txtX}" y="${txtY + shiftY}" dy="-5" fill="${rel.color}">${rel.text}</text>`;
}

// ★ 新增：為單一地支字體繪製外圍三角形框
function getTriangleMarkerSvgString(rel, svgRect) {
    let el = document.getElementById(rel.nodeId);
    if (!el) return "";

    // 抓取地支字體元素來計算中心點
    let node = el.querySelector('.zhi-char') || el;
    let rect = node.getBoundingClientRect();

    let cx = rect.left + rect.width / 2 - svgRect.left;
    let cy = rect.top + rect.height / 2 - svgRect.top;

    // 設定三角形的大小半徑 (預設 16px，剛好能完美包覆 1.1rem 的文字)
    let r = 16;

    // 計算正三角形的三個頂點 (稍微往下偏移一點點，讓文字置中感更好)
    let pt1 = `${cx},${cy - r - 4}`;       // 頂點 (中上)
    let pt2 = `${cx + r + 4},${cy + r}`;   // 右下角
    let pt3 = `${cx - r - 4},${cy + r}`;   // 左下角

    // 回傳空心三角形的 SVG 字串
    return `<polygon points="${pt1} ${pt2} ${pt3}" fill="none" stroke="${rel.color}" stroke-width="2" stroke-dasharray="${rel.dash}" stroke-linejoin="round" style="filter: drop-shadow(1px 1px 2px rgba(0,0,0,0.3));" />`;
}

// ==========================================
// ★ 分數明細開關控制 (加入防呆)
// ==========================================
window.toggleScoreDetail = function () {
    if (AppState.activeYaoIdx === 'all' || AppState.activeYaoIdx === -1) {
        return; // 全覽模式下禁止展開
    }

    // 切換記憶體狀態
    AppState.scoreDetailOpen = !AppState.scoreDetailOpen;

    // ★ 改良：直接切換 UI 顯示，不用耗費資源去重新運算整組 UI
    let box = document.getElementById("score-detail-box");
    if (box) box.style.display = AppState.scoreDetailOpen ? "block" : "none";

    let arrow = document.getElementById("score-arrow");
    if (arrow) arrow.innerText = AppState.scoreDetailOpen ? "▲" : "▼";
};

// ★ 互動畫線核心邏輯
window.toggleRelation = function (idx, type = 'tgt') {
    // 1. 防呆：如果沒開啟繪圖模式，點擊地支就不會有畫線反應
    if (!AppState.isDrawModeEnabled) return;

    let currentId = type + "_" + idx;

    // ==========================================
    // ★ 核心優化：只要點擊單一爻，自動將過濾器狀態切回「全」
    // ==========================================
    AppState.currentRelFilter = '全';

    // 更新畫面上方工具列的按鈕反藍狀態
    document.querySelectorAll('.seal-btn').forEach(btn => {
        let bText = btn.innerText;
        if (btn.classList.contains('btn-all-plus')) bText = '全+';
        if (btn.classList.contains('btn-xingmu')) bText = '形墓';
        if (bText !== '✖' && bText !== '🔄 重繪') {
            btn.classList.toggle('active', bText === '全');
        }
    });

    // 2. 狀態更新與 UI 整理
    if (AppState.activeYaoIdx !== currentId) {
        AppState.activeYaoIdx = currentId;

        // ★ 關鍵修復：切換爻時，自動將分數明細框的狀態設為「展開」
        AppState.scoreDetailOpen = true;
    }

    // 3. 呼叫繪圖引擎，針對該爻畫出「全」的關係線段
    if (typeof window.drawRelations === 'function') {
        window.drawRelations(idx, type);
    }
};

// ==========================================
// ★ 1. 核心控制器 (Controller)
// ==========================================
window.drawRelations = function (idx, type = 'tgt') {
    let appData = AppState.curData;
    // ★ 如果盤面資料還沒準備好，直接忽略，避免崩潰
    if (!appData || !appData.rows) return;

    let filter = AppState.currentRelFilter || '全';
    let finalLines = [];

    if (idx === 'all') {
        let globalRels = new Set(['全', '無', '全+', '明']);

        if (typeof updateYaoHighlightsAndScore === 'function') {
            updateYaoHighlightsAndScore(-1, null, appData);
        }

        for (let i = 0; i < 6; i++) {
            let r = appData.rows[i];
            let typesToCheck = [];
            if ((r.move !== "" || r.isAnDong) && !r.isRiPo) typesToCheck.push('tgt');
            if (r.move !== "" && r.bgz) typesToCheck.push('src');
            if (r.fuGz) typesToCheck.push('fu');

            typesToCheck.forEach(t => {
                let logicResult = calculateAllRelations(i, t, appData, filter);
                finalLines = finalLines.concat(logicResult.lines);
                logicResult.availableRels.forEach(rel => globalRels.add(rel));
            });
        }

        let uniqueLinesMap = new Map();
        finalLines.forEach(l => {
            let key = l.type === 'triangle_marker' ? `tri-${l.nodeId}-${l.text}` :
                l.type === 'merge' ? `merge-${l.srcId1}-${l.srcId2}-${l.tgtId}-${l.text}` :
                    `norm-${l.srcId}-${l.tgtId}-${l.text}`;
            if (!uniqueLinesMap.has(key)) uniqueLinesMap.set(key, l);
        });

        finalLines = Array.from(uniqueLinesMap.values());
        AppState.availableRels = globalRels;

    } else {
        // ==========================================
        // ★ 核心修復：擋下底層 Storage Proxy 誤傳的 NaN 或錯誤格式
        // ==========================================
        let validIdx = parseInt(idx);
        if (isNaN(validIdx) || validIdx < 0 || validIdx > 5) {
            return; // 遇到無效索引直接忽略，不做任何處理與報錯
        }

        updateYaoHighlightsAndScore(validIdx, type, appData);
        let logicResult = calculateAllRelations(validIdx, type, appData, filter);
        finalLines = logicResult.lines;
        AppState.availableRels = logicResult.availableRels;
    }

    if (typeof renderSVGFromPayload === 'function') {
        renderSVGFromPayload(finalLines);
    }

    if (typeof updateFilterButtonsDisplay === 'function') {
        updateFilterButtonsDisplay(AppState.availableRels);
    }

    // ★ 核心修復 3：畫線與上色結束後，立即快取當下的高光節點，供下次點擊時秒殺清除
    if (typeof window.recordCurrentHighlights === 'function') {
        window.recordCurrentHighlights();
    }
};

// 輔助函式：更新按鈕顯示
function updateFilterButtonsDisplay(availableRels) {
    const btnMap = {
        '全+': '.btn-all-plus', '全': '.btn-all', '明': '.btn-ming',
        '無': '.btn-none', '生': '.btn-sheng', '生⁺': '.btn-chain-sheng',
        '剋': '.btn-ke', '沖': '.btn-chong', '合': '.btn-he', '比': '.btn-bi',
        '墓': '.btn-mu', '形墓': '.btn-xingmu'
    };
    for (let [relName, selector] of Object.entries(btnMap)) {
        let btn = document.querySelector(selector);
        if (btn) btn.style.display = availableRels.has(relName) ? 'inline-block' : 'none';
    }
}

// 輔助函式：清空畫布與處理高亮、分數
window.updateYaoHighlightsAndScore = function (idx, type, appData) {
    let svg = document.getElementById("rel-svg"), g = document.getElementById("rel-lines");
    if (g) g.innerHTML = "";

    // ★ 核心修復 2：使用快取系統精準移除舊高光
    if (typeof window.clearAllHighlights === 'function') {
        window.clearAllHighlights();
    } else {
        document.querySelectorAll('.yao-highlight, .same-zhi-highlight, .year-he-highlight, .sanhe-red, .sanhe-black, .sanhe-marker, .bi-highlight').forEach(el => {
            el.classList.remove('yao-highlight', 'same-zhi-highlight', 'year-he-highlight', 'sanhe-red', 'sanhe-black', 'sanhe-marker', 'bi-highlight');
        });
    }

    if (idx === 'all' || idx === -1 || isNaN(idx) || idx === null || idx === undefined || !appData || !appData.rows) {
        let scoreBox = document.getElementById("yao-score-display");
        if (scoreBox) {
            scoreBox.style.display = "flex";
            scoreBox.innerHTML = `☯`;
            scoreBox.style.color = "#e6a23c";
        }
        let detailBox = document.getElementById("score-detail-box");
        if (detailBox) detailBox.style.display = "none";
        return;
    }

    let scoreBox = document.getElementById("yao-score-display");
    if (scoreBox) scoreBox.style.display = "flex";

    let tgtId = type === 'fu' ? "yao-fu-" + idx : (type === 'src' ? "yao-src-" + idx : "yao-tgt-" + idx);
    let targetYao = document.getElementById(tgtId), targetZhiSpan = targetYao ? targetYao.querySelector('.zhi-char') : null;
    if (targetYao) {
        (appData.najiaValue === "zang" || !targetZhiSpan) ? targetYao.classList.add('yao-highlight') : targetZhiSpan.classList.add('yao-highlight');
    }

    let tgtGz = type === 'fu' ? appData.rows[idx].fuGz : (type === 'src' ? appData.rows[idx].bgz : appData.rows[idx].gz);
    let zTgtIdx = Zhi.indexOf(tgtGz.slice(1, 2)), elTgt = ZhiFiveMap[zTgtIdx];
    let dZhiIdx = appData.bazi.dZ, mIdx = appData.bazi.mZ;
    let dElIdx = ZhiFiveMap[dZhiIdx], mElIdx = ZhiFiveMap[mIdx];
    let currentScore = 0, scoreDetails = [];

    // ★ HTML 標籤智慧解析器 (抓取雙拼隱藏說明)
    const parseTags = (htmlStr) => {
        if (!htmlStr) return "";
        let div = document.createElement("div");
        div.innerHTML = htmlStr;
        let labels = [];
        Array.from(div.children).forEach(child => {
            if (child.getAttribute('data-desc')) {
                labels.push(child.getAttribute('data-desc'));
            } else {
                let txt = child.textContent.trim();
                if (txt) labels.push(txt);
            }
        });
        return labels.join("、");
    };

    // 第一層次：月建與日辰
    let isMPo_tgt = Math.abs(zTgtIdx - mIdx) === 6;
    let isDZhi_tgt = (zTgtIdx === dZhiIdx);

    if (isMPo_tgt && isDZhi_tgt) {
        currentScore += 0;
        scoreDetails.push("月破值日(0)");
    } else {
        if (zTgtIdx === mIdx) { currentScore += 1; scoreDetails.push("值月(+1)"); }
        else if (isMPo_tgt) { currentScore -= 1; scoreDetails.push("月破(-1)"); }
        else if (mElIdx === elTgt || window.WuXingRels.sheng[mElIdx] === elTgt) {
            currentScore += 1; scoreDetails.push(mElIdx === elTgt ? "月建比旺(+1)" : "月建生扶(+1)");
        } else if (window.WuXingRels.ke[mElIdx] === elTgt) {
            currentScore -= 1; scoreDetails.push("月建相剋(-1)");
        } else {
            scoreDetails.push("月建平相(+-0)");
        }

        if (isDZhi_tgt) { currentScore += 1; scoreDetails.push("值日(+1)"); }
        else if (Math.abs(zTgtIdx - dZhiIdx) === 6) {
            let isMv_tgt = (appData.rows[idx] && appData.rows[idx].move && appData.rows[idx].move !== "");
            let isDayKe = window.WuXingRels.ke[dElIdx] === elTgt;

            if (isMv_tgt) {
                currentScore += 1;
                scoreDetails.push("發動逢沖為快馬(+1)");
            } else if (currentScore > 0) {
                currentScore += 1;
                scoreDetails.push("旺相逢沖為暗動(+1)");
            } else if (currentScore < 0) {
                currentScore -= 1;
                scoreDetails.push("衰弱無氣為日破(-1)");
            } else {
                if (isDayKe) {
                    currentScore -= 1;
                    scoreDetails.push("平相逢日沖剋，受損(-1)");
                } else {
                    currentScore += 1;
                    scoreDetails.push("平相逢沖不帶剋，激起為暗動(+1)");
                }
            }
        }
        else if (dElIdx === elTgt || window.WuXingRels.sheng[dElIdx] === elTgt) {
            currentScore += 1; scoreDetails.push(dElIdx === elTgt ? "日辰比旺(+1)" : "日辰生扶(+1)");
        } else if (window.WuXingRels.ke[dElIdx] === elTgt) {
            currentScore -= 1; scoreDetails.push("日辰相剋(-1)");
        } else {
            scoreDetails.push("日辰平相(+-0)");
        }
    }

    // 第三層次：他爻 (動爻、暗動、出伏) 的生剋與動態應期
    if (type !== 'src' && type !== 'fu') {
        // 1. 月建分數
        let isMPo_tgt = Math.abs(zTgtIdx - mIdx) === 6;
        let isDZhi_tgt = (zTgtIdx === dZhiIdx);
        let monthScore = 0;

        if (zTgtIdx === mIdx) { monthScore += 1; scoreDetails.push("值月(+1)"); }
        else if (isMPo_tgt) { monthScore -= 1; scoreDetails.push("月破(-1)"); }
        else if (mElIdx === elTgt || window.WuXingRels.sheng[mElIdx] === elTgt) {
            monthScore += 1; scoreDetails.push(mElIdx === elTgt ? "月建比旺(+1)" : "月建生扶(+1)");
        } else if (window.WuXingRels.ke[mElIdx] === elTgt) {
            monthScore -= 1; scoreDetails.push("月建相剋(-1)");
        } else {
            scoreDetails.push("月建平相(+-0)");
        }
        currentScore += monthScore;

        // 2. 他爻傳導 (在日辰文字前先印出)
        let k1_score = (10 - appData.bazi.dG + dZhiIdx) % 12; if (k1_score < 0) k1_score += 12;
        let k2_score = (11 - appData.bazi.dG + dZhiIdx) % 12; if (k2_score < 0) k2_score += 12;
        let movingScore = 0;

        for (let j = 0; j < 6; j++) {
            if (j === idx) continue;

            let r_j = appData.rows[j];
            let z_j = Zhi.indexOf(r_j.gz.slice(1, 2));
            let elMove = ZhiFiveMap[z_j];
            let score_j = 0;

            if (z_j === mIdx) score_j += 1;
            else if (Math.abs(z_j - mIdx) === 6) score_j -= 1;
            else if (mElIdx === elMove || window.WuXingRels.sheng[mElIdx] === elMove) score_j += 1;
            else if (window.WuXingRels.ke[mElIdx] === elMove) score_j -= 1;

            let baseScore_j = score_j;

            if (z_j === dZhiIdx) {
                score_j += 1;
            }
            else if (Math.abs(z_j - dZhiIdx) !== 6) {
                if (dElIdx === elMove || window.WuXingRels.sheng[dElIdx] === elMove) score_j += 1;
                else if (window.WuXingRels.ke[dElIdx] === elMove) score_j -= 1;
            }

            let isDPo_j = Math.abs(z_j - dZhiIdx) === 6;
            let isDayKe_j = window.WuXingRels.ke[dElIdx] === elMove;
            let isMv = (r_j.move && r_j.move !== "");
            let isAD = false;
            let isRiPo = false;

            if (isDPo_j) {
                if (baseScore_j > 0) {
                    score_j += 1;
                    if (!isMv) isAD = true;
                } else if (baseScore_j < 0) {
                    score_j -= 1;
                    if (!isMv) isRiPo = true;
                } else {
                    if (isDayKe_j) {
                        score_j -= 1;
                    } else {
                        score_j += 1;
                        if (!isMv) isAD = true;
                    }
                }
            }

            let yaoName = ['上', '五', '四', '三', '二', '初'][j] + '爻';

            if (isMv || isAD) {
                if (isRiPo) continue;
                let zB_j = isMv ? Zhi.indexOf(r_j.bgz.slice(1, 2)) : null;
                let elOB = zB_j !== null ? ZhiFiveMap[zB_j] : null;
                let typeName = isMv ? '動' : '暗動';

                let isEarthChong = (elMove === 4 && elTgt === 4 && Math.abs(z_j - zTgtIdx) === 6);
                let isShengTgt = window.WuXingRels.sheng[elMove] === elTgt;
                let isKeTgt = window.WuXingRels.ke[elMove] === elTgt;

                let actionStr = "", actionScore = 0;
                if (isEarthChong) { actionStr = "同土相沖(0)"; actionScore = 0; }
                else if (isShengTgt) { actionStr = "生(+1)"; actionScore = 1; }
                else if (isKeTgt) { actionStr = "剋(-1)"; actionScore = -1; }
                else if (elMove === elTgt) { actionStr = "扶持(+1)"; actionScore = 1; }
                else continue;

                let isKong_j = (z_j === k1_score || z_j === k2_score);
                let isMPo_j = (Math.abs(z_j - mIdx) === 6);
                let isDHe_j = ((z_j + dZhiIdx) % 12 === 1);
                let isMHe_j = ((z_j + mIdx) % 12 === 1);
                let isZhiD_j = (z_j === dZhiIdx);
                let isZhiM_j = (z_j === mIdx);
                let isMu_j = (elMove !== 4 && window.WuXingRels.tomb[elMove] === dZhiIdx);

                let isHuiTouKe_j = isMv && (window.WuXingRels.ke[elOB] === elMove);
                let isHuaMu_j = isMv && (zB_j === window.WuXingRels.tomb[elMove] && z_j !== zB_j && elMove !== 4);
                let isHuaJue_j = isMv && (z_j === 0 && zB_j === 5);
                let isDoubleInjury_j = (isMPo_j && isDPo_j);
                let isHuaZhenPo_j = false;

                if (isMv && zB_j !== null) {
                    isHuaZhenPo_j = (Math.abs(zB_j - mIdx) === 6 || Math.abs(zB_j - dZhiIdx) === 6);
                }

                let isMutHe_j = false, heZhi = -1;
                for (let k = 0; k < 6; k++) {
                    if (k !== idx && k !== j && appData.rows[k].move !== "") {
                        let z_k = Zhi.indexOf(appData.rows[k].gz.slice(1, 2));
                        if ((z_j + z_k) % 12 === 1) { isMutHe_j = true; heZhi = z_k; break; }
                    }
                }

                if (isDoubleInjury_j) {
                    scoreDetails.push(`${yaoName}${typeName}${actionStr}，併傷無權(0)`);
                } else if (isHuiTouKe_j) {
                    if (isZhiD_j || isZhiM_j) {
                        movingScore += actionScore;
                        scoreDetails.push(`${yaoName}${typeName}${actionStr}，值建不傷但過值-1分`);
                    } else {
                        scoreDetails.push(`${yaoName}${typeName}${actionStr}，化回剋無權(0)`);
                    }
                } else if (isHuaZhenPo_j) {
                    scoreDetails.push(`${yaoName}${typeName}${actionStr}，化真破無權(0)`);
                } else if (isHuaMu_j) {
                    scoreDetails.push(`${yaoName}${typeName}${actionStr}，化真墓無權(0)`);
                } else if (isHuaJue_j) {
                    scoreDetails.push(`${yaoName}${typeName}${actionStr}，化絕無權(0)`);
                } else if (isKong_j) {
                    let kwStr = score_j >= 0 ? "沖實" : "沖散(無氣逢沖)";
                    scoreDetails.push(`${yaoName}${typeName}${actionStr}，待${Zhi[z_j]}值臨出空或逢沖${kwStr}(${actionScore > 0 ? "+" + actionScore : actionScore}分)`);
                } else if (isDHe_j) {
                    let chongYaoZhi = Zhi[(z_j + 6) % 12], chongRiZhi = Zhi[(dZhiIdx + 6) % 12];
                    scoreDetails.push(`${yaoName}${typeName}${actionStr}，被日合絆待${chongYaoZhi}或${chongRiZhi}沖開(${actionScore > 0 ? "+" + actionScore : actionScore}分)`);
                } else if (isMHe_j) {
                    let chongYaoZhi = Zhi[(z_j + 6) % 12], chongYueZhi = Zhi[(mIdx + 6) % 12];
                    scoreDetails.push(`${yaoName}${typeName}${actionStr}，被月合絆待${chongYaoZhi}或${chongYueZhi}沖開(${actionScore > 0 ? "+" + actionScore : actionScore}分)`);
                } else if (isMutHe_j) {
                    let chongZhi1 = Zhi[(z_j + 6) % 12], chongZhi2 = Zhi[(heZhi + 6) % 12];
                    scoreDetails.push(`${yaoName}${typeName}${actionStr}，被合絆待${chongZhi1}${chongZhi2}沖開(${actionScore > 0 ? "+" + actionScore : actionScore}分)`);
                } else if (isMu_j && score_j < 0) {
                    let chongZhi1 = Zhi[(dZhiIdx + 6) % 12], chongZhi2 = Zhi[(z_j + 6) % 12];
                    scoreDetails.push(`${yaoName}${typeName}${actionStr}，入墓待${chongZhi1}${chongZhi2}沖開(${actionScore > 0 ? "+" + actionScore : actionScore}分)`);
                } else if (isMPo_j && !isZhiD_j) {
                    scoreDetails.push(`${yaoName}${typeName}${actionStr}，月破無權(0)`);
                } else {
                    movingScore += actionScore;
                    scoreDetails.push(`${yaoName}${typeName}${actionStr}`);
                }
            }

            if (r_j.fuGz && !isMv) {
                let fuZhi_j = Zhi.indexOf(r_j.fuGz.slice(1, 2));
                let fuEl_j = ZhiFiveMap[fuZhi_j];

                let feiMovedByMonth = Math.abs(mIdx - z_j) === 6 || (mIdx + z_j) % 12 === 1;
                let feiMovedByDay = Math.abs(dZhiIdx - z_j) === 6 || (dZhiIdx + z_j) % 12 === 1;
                let feiMuDay = (elMove !== 4) && (dZhiIdx === window.WuXingRels.tomb[elMove]) && (z_j !== dZhiIdx);
                let feiKong = (z_j === k1_score || z_j === k2_score);
                let isActive = feiMovedByMonth || feiMovedByDay || feiMuDay || feiKong;
                let inDayTomb = (fuEl_j !== 4) && (dZhiIdx === window.WuXingRels.tomb[fuEl_j]);
                let inFeiTomb = (fuEl_j !== 4) && (z_j === window.WuXingRels.tomb[fuEl_j]);

                if (isActive && !inDayTomb && !inFeiTomb) {
                    let isEarthChongF = (fuEl_j === 4 && elTgt === 4 && Math.abs(fuZhi_j - zTgtIdx) === 6);
                    let isShengTgtF = window.WuXingRels.sheng[fuEl_j] === elTgt;
                    let isKeTgtF = window.WuXingRels.ke[fuEl_j] === elTgt;

                    let actionStrF = "", actionScoreF = 0;
                    if (isEarthChongF) { actionStrF = "同土相沖(0)"; actionScoreF = 0; }
                    else if (isShengTgtF) { actionStrF = "生(+1)"; actionScoreF = 1; }
                    else if (isKeTgtF) { actionStrF = "剋(-1)"; actionScoreF = -1; }

                    if (actionStrF !== "") {
                        let isKongF = (fuZhi_j === k1_score || fuZhi_j === k2_score);
                        if (isKongF) {
                            scoreDetails.push(`${yaoName}出伏${actionStrF}，但伏空待${Zhi[fuZhi_j]}值沖(${actionScoreF > 0 ? "+" + actionScoreF : actionScoreF})`);
                        } else {
                            movingScore += actionScoreF;
                            scoreDetails.push(`${yaoName}出伏${actionStrF}`);
                        }
                    }
                }
            }
        }
        currentScore += movingScore;

        // 3. 日辰判定 (綜合氣數評估)
        let isDChong_tgt = Math.abs(zTgtIdx - dZhiIdx) === 6;

        if (isDZhi_tgt) {
            currentScore += 1; scoreDetails.push("值日(+1)");
        }
        else if (isDChong_tgt) {
            let isMv_tgt = (appData.rows[idx] && appData.rows[idx].move && appData.rows[idx].move !== "");
            let totalSupport = monthScore + movingScore; // 綜合氣數評估

            if (isMv_tgt) {
                currentScore += 1;
                scoreDetails.push("發動逢沖為快馬(+1)");
            } else if (totalSupport >= 0) { // ★ 核心微調：>= 0 逢沖即為暗動
                currentScore += 1;
                scoreDetails.push("氣數不弱，逢沖為暗動(+1)");
            } else {
                currentScore -= 1;
                scoreDetails.push("衰弱無氣，逢沖為日破(-1)");
            }
        }
        else if (dElIdx === elTgt || window.WuXingRels.sheng[dElIdx] === elTgt) {
            currentScore += 1; scoreDetails.push(dElIdx === elTgt ? "日辰比旺(+1)" : "日辰生扶(+1)");
        } else if (window.WuXingRels.ke[dElIdx] === elTgt) {
            currentScore -= 1; scoreDetails.push("日辰相剋(-1)");
        } else {
            scoreDetails.push("日辰平相(+-0)");
        }
    }

    // ==========================================
    // ★ 終極修復：雙軌分數系統 (原相/吉凶)
    // ==========================================
    let r_self = appData.rows[idx];
    let isMv_self = r_self.move !== "";
    let baseScore = currentScore;
    let jiXiongScore = currentScore;
    let hasDualScore = false;

    if (type === 'tgt') {
        let k1_self = (10 - appData.bazi.dG + dZhiIdx) % 12; if (k1_self < 0) k1_self += 12;
        let k2_self = (11 - appData.bazi.dG + dZhiIdx) % 12; if (k2_self < 0) k2_self += 12;

        if (zTgtIdx === k1_self || zTgtIdx === k2_self) scoreDetails.push("爻臨旬空（待填實逢沖）");

        if (zTgtIdx === mIdx) scoreDetails.push("爻臨月建（大旺）");
        else if (Math.abs(zTgtIdx - mIdx) === 6) scoreDetails.push("爻逢月破（本月無權）");

        if (zTgtIdx === dZhiIdx) scoreDetails.push("爻值日辰（大旺）");
        else if (Math.abs(zTgtIdx - dZhiIdx) === 6) {
            let tempMonthScore = 0;
            if (zTgtIdx === mIdx) tempMonthScore += 1;
            else if (Math.abs(zTgtIdx - mIdx) === 6) tempMonthScore -= 1;
            else if (mElIdx === elTgt || window.WuXingRels.sheng[mElIdx] === elTgt) tempMonthScore += 1;
            else if (window.WuXingRels.ke[mElIdx] === elTgt) tempMonthScore -= 1;

            let isDayKe = window.WuXingRels.ke[dElIdx] === elTgt;

            if (isMv_self) scoreDetails.push("發動逢沖 (快馬)");
            else if (tempMonthScore > 0) scoreDetails.push("旺相逢沖 (暗動)");
            else if (tempMonthScore < 0) scoreDetails.push("衰弱逢沖 (日破)");
            else {
                if (isDayKe) scoreDetails.push("平相逢日沖剋 (受損)");
                else scoreDetails.push("平相逢沖不帶剋 (激起暗動)");
            }
        }

        if (isMv_self && r_self.bgz) {
            let zBian_self = Zhi.indexOf(r_self.bgz.slice(1, 2)), elBian_self = ZhiFiveMap[zBian_self];
            let zb_isKong = (zBian_self === k1_self || zBian_self === k2_self);
            let zb_isMPo = Math.abs(zBian_self - mIdx) === 6;
            let zb_isDPo = Math.abs(zBian_self - dZhiIdx) === 6;

            if (window.WuXingRels.ke[elBian_self] === elTgt) {
                hasDualScore = true;
                if (!zb_isKong && !zb_isMPo && !zb_isDPo) {
                    baseScore -= 1;
                    jiXiongScore -= 1;
                    scoreDetails.push("自化回剋：原相(-1) 吉凶(-1)");
                } else if (zb_isMPo || zb_isDPo) {
                    jiXiongScore -= 1;
                    scoreDetails.push("自化回剋：變爻日月破無權(原相-0, 吉凶-1)");
                } else if (zb_isKong) {
                    jiXiongScore -= 1;
                    scoreDetails.push("自化回剋：變爻空亡暫無權(原相-0, 吉凶-1)");
                }
            }
            else if (window.WuXingRels.sheng[elBian_self] === elTgt) {
                hasDualScore = true;
                if (!zb_isKong && !zb_isMPo && !zb_isDPo) {
                    baseScore += 1;
                    jiXiongScore += 1;
                    scoreDetails.push("自化回生：原相(+1) 吉凶(+1)");
                } else if (zb_isMPo || zb_isDPo) {
                    jiXiongScore += 1;
                    scoreDetails.push("自化回生：變爻日月破無權(原相+0, 吉凶+1)");
                } else if (zb_isKong) {
                    jiXiongScore += 1;
                    scoreDetails.push("自化回生：變爻空亡暫無權(原相+0, 吉凶+1)");
                }
            }
            else if (window.WuXingRels.jin[zTgtIdx] === zBian_self) {
                hasDualScore = true;
                if (!zb_isKong && !zb_isMPo && !zb_isDPo) {
                    baseScore += 1;
                    jiXiongScore += 1;
                    scoreDetails.push("自化進神：原相(+1) 吉凶(+1)");
                } else if (zb_isMPo || zb_isDPo) {
                    jiXiongScore += 1;
                    scoreDetails.push("自化進神：變爻日月破無權(原相+0, 吉凶+1)");
                } else if (zb_isKong) {
                    jiXiongScore += 1;
                    scoreDetails.push("自化進神：變爻空亡暫無權(原相+0, 吉凶+1)");
                }
            }
            else if (window.WuXingRels.tui[zTgtIdx] === zBian_self) {
                hasDualScore = true;
                if (!zb_isKong && !zb_isMPo && !zb_isDPo) {
                    baseScore -= 1;
                    jiXiongScore -= 1;
                    scoreDetails.push("自化退神：原相(-1) 吉凶(-1)");
                } else if (zb_isMPo || zb_isDPo) {
                    jiXiongScore -= 1;
                    scoreDetails.push("自化退神：變爻日月破無權(原相-0, 吉凶-1)");
                } else if (zb_isKong) {
                    jiXiongScore -= 1;
                    scoreDetails.push("自化退神：變爻空亡暫無權(原相-0, 吉凶-1)");
                }
            }
            else if (zTgtIdx === zBian_self) scoreDetails.push("爻化伏吟");
            else if (Math.abs(zTgtIdx - zBian_self) === 6) scoreDetails.push("爻化反吟");
        }

        let cleanStatus = parseTags(r_self.status);
        scoreDetails.unshift(`【本爻狀態】${cleanStatus || "平穩無傷"}`);

        if (r_self.move) {
            let cleanBStatus = parseTags(r_self.bstatus);
            scoreDetails.push(`【變爻狀態】${cleanBStatus || "平穩無傷"}`);
        }
    }
    else if (type === 'src') {
        scoreDetails = [];
        let bStatusList = [];

        let isM = (zTgtIdx === mIdx);
        let isMPo = (Math.abs(zTgtIdx - mIdx) === 6);
        let isMHe = ((zTgtIdx + mIdx) % 12 === 1);
        let isMSheng = (!isMPo && window.WuXingRels.sheng[mElIdx] === elTgt);
        let isMBi = (!isMPo && mElIdx === elTgt && !isM);
        let isMKe = (!isMPo && window.WuXingRels.ke[mElIdx] === elTgt);

        let isD = (zTgtIdx === dZhiIdx);
        let isDPo_raw = (Math.abs(zTgtIdx - dZhiIdx) === 6);
        let isDHe = ((zTgtIdx + dZhiIdx) % 12 === 1);
        let isDSheng = (!isDPo_raw && window.WuXingRels.sheng[dElIdx] === elTgt);
        let isDBi = (!isDPo_raw && dElIdx === elTgt && !isD);
        let isDKe = (!isDPo_raw && window.WuXingRels.ke[dElIdx] === elTgt);

        let kw1_self = (10 - appData.bazi.dG + dZhiIdx) % 12; if (kw1_self < 0) kw1_self += 12;
        let kw2_self = (11 - appData.bazi.dG + dZhiIdx) % 12; if (kw2_self < 0) kw2_self += 12;
        let isKong = (zTgtIdx === kw1_self || zTgtIdx === kw2_self);

        let bScoreM = 0;
        if (isM) { bStatusList.push("月建(+1分)"); bScoreM += 1; }
        else if (isMPo) { bStatusList.push("月破(-1分)"); bScoreM -= 1; }
        else {
            if (isMHe) bStatusList.push("月合絆(+-0分)");
            if (isMSheng) { bStatusList.push("月生(+1分)"); bScoreM += 1; }
            else if (isMBi) { bStatusList.push("月比(+1分)"); bScoreM += 1; }
            else if (isMKe) { bStatusList.push("月剋(-1分)"); bScoreM -= 1; }
        }

        let bScoreD = 0;
        if (isD) { bStatusList.push("值日(+1分)"); bScoreD += 1; }
        else if (isDPo_raw) {
            if (bScoreM > 0) {
                if (isM) bStatusList.push("月建日沖升格暗動(+1分)");
                else if (isMBi) bStatusList.push("月比日沖升格暗動(+1分)");
                else if (isMSheng) bStatusList.push("月生日沖升格暗動(+1分)");
                else bStatusList.push("暗動(+1分)");
                bScoreD += 1;
            } else if (bScoreM < 0) {
                bStatusList.push("衰弱日破(-1分)");
                bScoreD -= 1;
            } else {
                if (isDKe) {
                    bStatusList.push("平相逢日沖剋，受損(-1分)");
                    bScoreD -= 1;
                } else {
                    bStatusList.push("平相逢沖不帶剋，激起暗動(+1分)");
                    bScoreD += 1;
                }
            }
        }
        else {
            if (isDHe) bStatusList.push("日合絆(+-0分)");
            if (isDSheng) { bStatusList.push("日生(+1分)"); bScoreD += 1; }
            else if (isDBi) { bStatusList.push("日比(+1分)"); bScoreD += 1; }
            else if (isDKe) { bStatusList.push("日剋(-1分)"); bScoreD -= 1; }
        }

        if (bScoreM === 0 && bScoreD === 0 && !isMPo && !isDPo_raw) {
            bStatusList.push("平相休囚(不生不剋，+-0分)");
        }

        let noInjury = (!isKong && !isMPo && !isDPo_raw);
        if (noInjury && !bStatusList.some(s => s.includes("暗動") || s.includes("日沖"))) {
            bStatusList.push("健全無傷");
        }

        if (isKong) bStatusList.push("旬空(待出空值臨)");

        if (bStatusList.length > 0) {
            scoreDetails.push(`【變爻狀態】${bStatusList.join("、")}`);
        }

        let cleanBStatus = parseTags(appData.rows[idx].bstatus);
        scoreDetails.push(`【進階變化】${cleanBStatus || "無"}`);

        currentScore = bScoreM + bScoreD;
        baseScore = currentScore;
        jiXiongScore = currentScore;
    }
    else if (type === 'fu') {
        let r_self = appData.rows[idx];
        let cleanFuStatus = parseTags(r_self.fuKp);
        scoreDetails.unshift(`【伏神狀態】${cleanFuStatus || "平穩無傷"}`);
    }

    if (scoreBox) {
        const formatScore = (val) => {
            let sign = val > 0 ? "+" : "";
            let color = val > 0 ? "#ff6b6b" : (val < 0 ? "#4dabf7" : "#adb5bd");
            return `<span style="color:${color};">${sign}${val}</span>`;
        };

        let scoreHtml = hasDualScore
            ? `(${formatScore(baseScore)})(${formatScore(jiXiongScore)})`
            : `${formatScore(baseScore)}`;

        scoreBox.innerHTML = `<span style="font-size: ${hasDualScore ? '0.85rem' : '1.1rem'}; font-weight:bold; letter-spacing:-0.5px;">${scoreHtml}</span><span id="score-arrow" style="font-size:0.55em; margin-left:2px; opacity:0.6; color:#fff;">${window.AppState.scoreDetailOpen ? "▲" : "▼"}</span>`;
        scoreBox.style.width = "auto";
        scoreBox.style.minWidth = "38px";
        scoreBox.style.padding = "0 6px";
    }

    let detailBox = document.getElementById("score-detail-box");
    if (detailBox) {
        detailBox.innerHTML = scoreDetails.length > 0 ? scoreDetails.join("<br>") : "無生剋條件";
        detailBox.style.display = window.AppState.scoreDetailOpen ? "block" : "none";
    }
};

// ==========================================
// ★ 2. 邏輯大腦 (Logic Engine) - 終極完整版
// ==========================================
function calculateAllRelations(idx, type, appData, filter) {
    let lines = [];
    let availableRels = new Set(['全', '無', '全+', '明']);
    let isZang = (appData.najiaValue === "zang");
    let tgtId = type === 'fu' ? "yao-fu-" + idx : (type === 'src' ? "yao-src-" + idx : "yao-tgt-" + idx);

    let dZhiIdx = appData.bazi.dZ, mIdx = appData.bazi.mZ;
    let mElIdx = ZhiFiveMap[mIdx], dElIdx = ZhiFiveMap[dZhiIdx];

    // --- 封裝：自動收集可用按鈕的推入函式 ---
    const addLine = (src, tgt, txt, col, mrk, dsh, route = "normal", wt = "2.5", sh = "rgba(0,0,0,0.3)") => {
        if (txt.includes('生')) availableRels.add('生');
        if (txt.includes('剋') || txt.includes('克')) availableRels.add('剋');
        if (txt.includes('沖') || txt.includes('破')) availableRels.add('沖');
        if (txt.includes('合')) availableRels.add('合');
        if (txt.includes('形墓') || txt.includes('形動墓')) availableRels.add('形墓');
        else if (txt.includes('墓')) availableRels.add('墓');

        lines.push({ type: 'normal', srcId: src, tgtId: tgt, text: txt, color: col, marker: mrk, dash: dsh, routeType: route, weight: wt, shadow: sh });
    };

    const addMerge = (s1, s2, tgt, txt, col, mrk, dsh, wt = "2.5", sh = "rgba(0,0,0,0.3)") => {
        if (txt.includes('生')) availableRels.add('生');
        if (txt.includes('剋') || txt.includes('克')) availableRels.add('剋');
        if (txt.includes('沖') || txt.includes('破')) availableRels.add('沖');
        if (txt.includes('合')) availableRels.add('合');

        lines.push({ type: 'merge', srcId1: s1, srcId2: s2, tgtId: tgt, text: txt, color: col, marker: mrk, dash: dsh, weight: wt, shadow: sh });
    };

    // --- 輔助：伏神狀態計算器 ---
    const getFuState = (rIdx, elFu) => {
        let zFeiIdx = Zhi.indexOf(appData.rows[rIdx].gz.slice(1, 2));
        let feiMovedByMonth = Math.abs(mIdx - zFeiIdx) === 6 || (mIdx + zFeiIdx) % 12 === 1;
        let feiMovedByDay = Math.abs(dZhiIdx - zFeiIdx) === 6 || (dZhiIdx + zFeiIdx) % 12 === 1;
        let elFei = ZhiFiveMap[zFeiIdx];
        // ★ 修正：土不入墓
        let feiMuDay = (elFei !== 4) && (dZhiIdx === window.WuXingRels.tomb[elFei]) && (zFeiIdx !== dZhiIdx);
        let dG = appData.bazi.dG;
        let k1 = (10 - dG + dZhiIdx) % 12; if (k1 < 0) k1 += 12;
        let k2 = (11 - dG + dZhiIdx) % 12; if (k2 < 0) k2 += 12;
        let feiKong = (zFeiIdx === k1 || zFeiIdx === k2);
        let isActive = feiMovedByMonth || feiMovedByDay || feiMuDay || feiKong;

        // ★ 修正：土不入墓
        let inDayTomb = (elFu !== 4) && (dZhiIdx === window.WuXingRels.tomb[elFu]);
        let inFeiTomb = (elFu !== 4) && (zFeiIdx === window.WuXingRels.tomb[elFu]);
        let isFullyActive = isActive && !inDayTomb && !inFeiTomb;
        return { isActive, inDayTomb, inFeiTomb, isFullyActive };
    };

    // --- 輔助：層次論視覺樣式產生器 ---
    const getLayerStyle = (layerType) => {
        switch (layerType) {
            case "bian_to_self": return { color: "#dc3545", dash: "none", weight: "3.5", shadow: "rgba(220,53,69,0.4)" };
            case "anDong_to_other": return { color: "#0d6efd", dash: "5,3", weight: "2.5", shadow: "rgba(13,110,253,0.3)" };
            case "move_to_other": return { color: "#0d6efd", dash: "none", weight: "2.5", shadow: "rgba(13,110,253,0.3)" };
            default: return { color: "#000", dash: "5,3", weight: "2.5", shadow: "rgba(0,0,0,0.3)" };
        }
    };

    // ==========================================================
    // ★ 插入點：前置掃描「全動爻與伏神連環相生」 (進化同盟版 + 伏神防禦機制)
    // ==========================================================
    let replacedRelations = new Set();
    let hasChain = false;

    let kw1 = (10 - appData.bazi.dG + appData.bazi.dZ) % 12; if (kw1 < 0) kw1 += 12;
    let kw2 = (11 - appData.bazi.dG + appData.bazi.dZ) % 12; if (kw2 < 0) kw2 += 12;
    const isZhiKong = (z) => z === kw1 || z === kw2;

    // 統一打包動爻與伏神，做為連環生的運算節點
    let yaosData = [];
    for (let j = 0; j < 6; j++) {
        // 1. 收錄本爻
        let zhiIdx = Zhi.indexOf(appData.rows[j].gz.slice(1, 2));
        let elIdx = ZhiFiveMap[zhiIdx];
        let isMoving = (appData.rows[j].move !== "" || appData.rows[j].isAnDong) && !appData.rows[j].isRiPo;
        let hasHuiTouKe = false;
        if (appData.rows[j].move !== "" && appData.rows[j].bgz) {
            let zBian = Zhi.indexOf(appData.rows[j].bgz.slice(1, 2));
            if (window.WuXingRels.ke[ZhiFiveMap[zBian]] === elIdx) hasHuiTouKe = true;
        }
        yaosData.push({
            id: `yao-tgt-${j}`, idx: j, element: elIdx, isMoving: isMoving,
            isKong: isZhiKong(zhiIdx), hasHuiTouKe: hasHuiTouKe,
            isZhiYueOrRi: (zhiIdx === appData.bazi.mZ || zhiIdx === appData.bazi.dZ),
            isFu: false,            // ★ 標記：這是一般本爻
            isFullyActive: true     // 本爻沒有出不出伏的問題，預設為 true
        });

        // 2. 收錄出伏的伏神 (視同動爻參與運作)
        if (appData.rows[j].fuGz) {
            let fuZhiIdx = Zhi.indexOf(appData.rows[j].fuGz.slice(1, 2));
            let fuElIdx = ZhiFiveMap[fuZhiIdx];
            let fState = getFuState(j, fuElIdx);

            // ★ 新增防呆：精算伏神的底層原相氣數，若為負數(無氣)，剝奪其連環生的傳導資格！
            let scoreF = 0;

            // 1. 先計算月建分數
            if (fuZhiIdx === appData.bazi.mZ) scoreF += 1;
            else if (Math.abs(fuZhiIdx - appData.bazi.mZ) === 6) scoreF -= 1;
            else {
                let elM = ZhiFiveMap[appData.bazi.mZ];
                if (elM === fuElIdx || window.WuXingRels.sheng[elM] === fuElIdx) scoreF += 1;
                else if (window.WuXingRels.ke[elM] === fuElIdx) scoreF -= 1;
            }

            // 2. 計算日辰分數 (先排除日沖)
            if (fuZhiIdx === appData.bazi.dZ) scoreF += 1;
            else if (Math.abs(fuZhiIdx - appData.bazi.dZ) !== 6) {
                let elD = ZhiFiveMap[appData.bazi.dZ];
                if (elD === fuElIdx || window.WuXingRels.sheng[elD] === fuElIdx) scoreF += 1;
                else if (window.WuXingRels.ke[elD] === fuElIdx) scoreF -= 1;
            }

            // 3. 綜合判定是否有氣
            let hasQi_fu = (scoreF >= 0);

            // 4. 計算日沖影響
            if (Math.abs(fuZhiIdx - appData.bazi.dZ) === 6) {
                if (hasQi_fu) scoreF += 1; // 旺相逢沖為暗動
                else scoreF -= 1;          // 衰弱逢沖為日破
            }

            // 必須是已出伏，且氣數大於等於 0，才能作為連環生的橋樑
            let canChain = fState.isFullyActive && (scoreF >= 0);

            yaosData.push({
                id: `yao-fu-${j}`, idx: j, element: fuElIdx,
                isMoving: canChain,             // ★ 只有健康且有氣的出伏，才能發動連環生
                isKong: isZhiKong(fuZhiIdx), hasHuiTouKe: false,
                isZhiYueOrRi: (fuZhiIdx === appData.bazi.mZ || fuZhiIdx === appData.bazi.dZ),
                isFu: true,
                isFullyActive: fState.isFullyActive // 原始出伏狀態保留供其他理氣參考
            });
        }
    }

    const checkSheng = (srcEl, tgtEl) => window.WuXingRels.sheng[srcEl] === tgtEl;
    let addedChainLines = new Set();

    // 改良版畫線器：新增 showText 參數，用來隱藏重複的文字
    const safeCreateChainLine = (srcId, targetId, isKong = false, showText = true) => {
        let key = `${srcId}->${targetId}`;
        if (addedChainLines.has(key)) return;
        addedChainLines.add(key);

        lines.push({
            type: 'normal', srcId: srcId, tgtId: targetId,
            text: showText ? "連環生" : "",
            color: isKong ? "#6c757d" : "#ffc107",
            marker: isKong ? "arrow-gray" : "arrow-gold",
            dash: isKong ? "6,4" : "none",
            routeType: "normal",
            weight: isKong ? "2.5" : "4.5",
            isChainSheng: true,
            className: isKong ? "" : "flowing-line",
            labelClassName: isKong || !showText ? "rel-label-bg" : "flowing-label"
        });
    };

    // 掃描 A -> B -> C
    for (let a = 0; a < yaosData.length; a++) {
        if (!yaosData[a].isMoving) continue;
        for (let b = 0; b < yaosData.length; b++) {
            if (b === a || !yaosData[b].isMoving) continue;
            if (!checkSheng(yaosData[a].element, yaosData[b].element)) continue;

            // 【理則】中繼點 B 若空亡，氣無法傳遞，直接斷鏈
            if (yaosData[b].isKong) continue;

            // ★ 新增防線 (1)：伏神絕對不能做為「連環相生的中繼點 (橋樑)」
            if (yaosData[b].isFu) continue;

            for (let c = 0; c < yaosData.length; c++) {
                if (c === a || c === b) continue;
                if (!checkSheng(yaosData[b].element, yaosData[c].element)) continue;

                // ★ 新增防線 (2)：如果受力終點是伏神，它必須是「已出伏 (isFullyActive)」的狀態
                if (yaosData[c].isFu && !yaosData[c].isFullyActive) continue;

                // 判斷方向是否為嚴格遞增或遞減
                let idxA = yaosData[a].idx;
                let idxB = yaosData[b].idx;
                let idxC = yaosData[c].idx;

                let isAscending = (idxA <= idxB) && (idxB <= idxC) && (idxA < idxC);
                let isDescending = (idxA >= idxB) && (idxB >= idxC) && (idxA > idxC);
                if (!isAscending && !isDescending) continue;

                let chainYaos = [yaosData[a], yaosData[b], yaosData[c]];
                let invalidDueToKe = chainYaos.some(y => y.hasHuiTouKe && !y.isZhiYueOrRi);
                if (invalidDueToKe) continue;

                // 註冊給後方理則清洗器使用
                replacedRelations.add(`${yaosData[a].idx}->${yaosData[b].idx}`);
                replacedRelations.add(`${yaosData[b].idx}->${yaosData[c].idx}`);
                replacedRelations.add(`${yaosData[a].idx}->${yaosData[c].idx}`);

                hasChain = true;

                // 只要目前的目標 ID (tgtId) 有牽涉其中，就把這條線畫出來
                if (yaosData[a].id === tgtId || yaosData[b].id === tgtId || yaosData[c].id === tgtId) {
                    // 第一段 (A -> B)：必定是實線，並且顯示文字
                    safeCreateChainLine(yaosData[a].id, yaosData[b].id, false, true);

                    // 第二段 (B -> C)：處理空亡判定，並且隱藏文字保持畫面乾淨
                    safeCreateChainLine(yaosData[b].id, yaosData[c].id, yaosData[c].isKong, false);
                }
            }
        }
    }

    // ★ 將按鈕名稱改為專屬的「生⁺」 (直接使用 Unicode 上標符號)
    if (hasChain) availableRels.add("生⁺");

    // 取得點擊爻位的地支、五行與活躍狀態
    let tgtGz, isTgtActive = false, fState = null;
    if (type === 'fu') {
        tgtGz = appData.rows[idx].fuGz;
        let elFu = ZhiFiveMap[Zhi.indexOf(tgtGz.slice(1, 2))];
        fState = getFuState(idx, elFu);
        isTgtActive = fState.isFullyActive;
    } else if (type === 'src') {
        tgtGz = appData.rows[idx].bgz;
        isTgtActive = true;
    } else {
        tgtGz = appData.rows[idx].gz;
        isTgtActive = (appData.rows[idx].move !== "" || appData.rows[idx].isAnDong) && !appData.rows[idx].isRiPo;
    }

    let zTgtIdx = Zhi.indexOf(tgtGz.slice(1, 2)), elTgt = ZhiFiveMap[zTgtIdx];

    // 同氣框選系統 (比)
    const checkHighlight = (srcGz, elId) => {
        if (!srcGz) return;
        if (isZang ? (srcGz.slice(0, 2) === tgtGz.slice(0, 2)) : (srcGz.slice(1, 2) === tgtGz.slice(1, 2))) {
            let el = $(elId); if (!el) return;
            let zhiSpan = el.querySelector('.zhi-char');
            (isZang || !zhiSpan) ? el.classList.add("same-zhi-highlight") : zhiSpan.classList.add("same-zhi-highlight");
        }
    };
    checkHighlight(appData.bazi.Y, "bz-y"); checkHighlight(appData.bazi.M, "bz-m"); checkHighlight(appData.bazi.D, "bz-d");
    for (let i = 0; i < 6; i++) {
        if (i !== idx) checkHighlight(appData.rows[i].gz, "yao-tgt-" + i);
        if (appData.rows[i].move && appData.rows[i].bgz) checkHighlight(appData.rows[i].bgz, "yao-src-" + i);
    }

    // --- 日月建關係判定 ---
    let elMonth = ZhiFiveMap[mIdx], elDay = ZhiFiveMap[dZhiIdx];
    let isMonthBi = (elMonth === elTgt) && (Math.abs(mIdx - zTgtIdx) !== 6);
    let isDayBi = (elDay === elTgt) && (Math.abs(dZhiIdx - zTgtIdx) !== 6);
    if (isMonthBi || isDayBi) availableRels.add('比');

    if (filter === '全' || filter === '全+' || filter === '比' || filter === '明') {
        const applyBi = (id) => { let el = $(id); if (el) { let s = el.querySelector('.zhi-char'); (isZang || !s) ? el.classList.add('bi-highlight') : s.classList.add('bi-highlight'); } };
        if (isMonthBi) applyBi("bz-m"); if (isDayBi) applyBi("bz-d");
        if (isMonthBi || isDayBi || filter === '比') applyBi(tgtId);
    }

    let isMonthChong = Math.abs(mIdx - zTgtIdx) === 6, isMonthHe = (mIdx + zTgtIdx) % 12 === 1;
    let isDayChong = Math.abs(dZhiIdx - zTgtIdx) === 6, isDayHe = (dZhiIdx + zTgtIdx) % 12 === 1;
    let isMonthSheng = window.WuXingRels.sheng[elMonth] === elTgt, isDaySheng = window.WuXingRels.sheng[elDay] === elTgt;
    let isMonthKe = window.WuXingRels.ke[elMonth] === elTgt, isDayKe = window.WuXingRels.ke[elDay] === elTgt;

    if (isMonthChong || isDayChong) availableRels.add('沖');
    if (isMonthHe || isDayHe) availableRels.add('合');
    if (isMonthSheng || isDaySheng) availableRels.add('生');
    if (isMonthKe || isDayKe) availableRels.add('剋');

    // 墓庫與層級判定
    let disableXingMu = (elTgt === 4);
    // ★ 修正：若是土爻 (elTgt === 4)，直接切斷所有入墓可能 (設為 -1)
    let myTombZhi = disableXingMu ? -1 : window.WuXingRels.tomb[elTgt];
    let myTombLevel = 99;

    if (type === 'tgt') {
        if (dZhiIdx === myTombZhi) myTombLevel = 1;
        else if (appData.rows[idx].move && Zhi.indexOf(appData.rows[idx].bgz.slice(1, 2)) === myTombZhi) myTombLevel = 2;
        else {
            let hasDong = false;
            for (let j = 0; j < 6; j++) { if (j !== idx && (appData.rows[j].move !== "" || appData.rows[j].isAnDong) && Zhi.indexOf(appData.rows[j].gz.slice(1, 2)) === myTombZhi) hasDong = true; }
            myTombLevel = hasDong ? 3 : 4;
        }
    } else if (type === 'fu') {
        if (dZhiIdx === myTombZhi) myTombLevel = 1;
        else if (!fState.isFullyActive && Zhi.indexOf(appData.rows[idx].gz.slice(1, 2)) === myTombZhi) myTombLevel = 2;
        else {
            let hasDong = false;
            for (let j = 0; j < 6; j++) { if ((appData.rows[j].move !== "" || appData.rows[j].isAnDong) && Zhi.indexOf(appData.rows[j].gz.slice(1, 2)) === myTombZhi) hasDong = true; }
            myTombLevel = hasDong ? 3 : 4;
        }
    }
    if (disableXingMu && myTombLevel >= 3) myTombLevel = 99;
    AppState._myTombLevel = myTombLevel;

    let allowDMDraw = (type === 'tgt') || (type === 'fu' && isTgtActive);
    if (allowDMDraw) {
        if (type === 'tgt') {
            if (myTombLevel === 1) addLine(tgtId, "bz-d", "入日墓", "#8B4513", "arrow-brown", "none");
            if (mIdx === myTombZhi && myTombLevel >= 4 && !disableXingMu) addLine(tgtId, "bz-m", "形墓", "#A0522D", "", "5,3");
        } else if (type === 'fu') {
            if (myTombLevel === 1) addLine(tgtId, "bz-d", "入日墓", "#8B4513", "arrow-brown", "none");
            else if (myTombLevel === 2) addLine(tgtId, "yao-tgt-" + idx, "入飛神墓", "#8B4513", "arrow-brown", "none", "yao_right");
            if (mIdx === myTombZhi && myTombLevel >= 4 && !disableXingMu) addLine(tgtId, "bz-m", "形墓", "#A0522D", "", "5,3");
        }

        //        let drawIndMonthChong = isMonthChong, drawIndMonthHe = isMonthHe, drawIndDayChong = isDayChong, drawIndDayHe = isDayHe;
        //        if (filter === '全+' || filter === '明') {
        //            let mh = false, dh = false;
        //            if (isMonthChong && isDayChong) { addMerge("bz-d", "bz-m", tgtId, "日月雙破", "#6f42c1", "", "5,3", "2.5"); mh=dh=true; }
        //            else if (isMonthHe && isDayChong) { addMerge("bz-d", "bz-m", tgtId, "月合日沖", "#6f42c1", "", "5,3", "2.5"); mh=dh=true; }
        //            else if (isMonthChong && isDayHe) { addMerge("bz-d", "bz-m", tgtId, "月沖日合", "#0d6efd", "", "5,3", "2.5"); mh=dh=true; }
        //            else if (isMonthHe && isDayHe) { addMerge("bz-d", "bz-m", tgtId, "日月俱合", "#0d6efd", "", "5,3", "2.5"); mh=dh=true; }
        //            else if (isMonthKe && isDayKe) { addMerge("bz-d", "bz-m", tgtId, "日月俱剋", "#dc3545", "arrow-red", "none", "2.5"); mh=dh=true; }
        //            else if (isMonthSheng && isDaySheng) { addMerge("bz-d", "bz-m", tgtId, "日月俱生", "#198754", "arrow-green", "none", "2.5"); mh=dh=true; }
        //            
        //            if (mh) { drawIndMonthChong = false; drawIndMonthHe = false; }
        //            if (dh) { drawIndDayChong = false; drawIndDayHe = false; }
        //
        //            if (isMonthSheng && !mh) addLine("bz-m", tgtId, "月生", "#198754", "arrow-green", "none");
        //            else if (isMonthKe && !mh) addLine("bz-m", tgtId, "月剋", "#dc3545", "arrow-red", "none");
        //            if (isDaySheng && !dh) addLine("bz-d", tgtId, "日生", "#198754", "arrow-green", "none");
        //            else if (isDayKe && !dh) addLine("bz-d", tgtId, "日剋", "#dc3545", "arrow-red", "none");
        //        }
        //        
        //        if (drawIndMonthChong) addLine("bz-m", tgtId, "月破", "#6f42c1", "", "5,3");
        //        else if (drawIndMonthHe) addLine("bz-m", tgtId, "月合", "#0d6efd", "", "5,3");
        //        if (drawIndDayChong) addLine("bz-d", tgtId, "日沖", "#6f42c1", "", "5,3");
        //        else if (drawIndDayHe) addLine("bz-d", tgtId, "日合", "#0d6efd", "", "5,3");
        // ★ 徹底重寫日月建複合線條邏輯 (支援合生、合剋、沖剋的分歧判定)
        const getRelData = (isC, isH, isS, isK) => {
            if (isC && isK) return { core: "沖剋", col: "#dc3545", mrk: "arrow-red", dash: "none" };
            if (isC) return { core: "沖", col: "#6f42c1", mrk: "", dash: "5,3" };
            if (isH && isK) return { core: "合剋", col: "#dc3545", mrk: "arrow-red", dash: "none" };
            if (isH && isS) return { core: "合生", col: "#198754", mrk: "arrow-green", dash: "none" };
            if (isH) return { core: "合", col: "#0d6efd", mrk: "", dash: "5,3" };
            if (isS) return { core: "生", col: "#198754", mrk: "arrow-green", dash: "none" };
            if (isK) return { core: "剋", col: "#dc3545", mrk: "arrow-red", dash: "none" };
            return null;
        };

        let mData = getRelData(isMonthChong, isMonthHe, isMonthSheng, isMonthKe);
        let dData = getRelData(isDayChong, isDayHe, isDaySheng, isDayKe);

        if (filter === '全+' || filter === '明') {
            let merged = false;

            // 如果日月建對該爻的關係「完全一模一樣」(例如都是合生，或是都是沖剋)
            if (mData && dData && mData.core === dData.core) {
                let text = mData.core === "沖" ? "日月雙破" : `日月俱${mData.core}`;
                // ★ 修正：改用 addMerge，並將參數轉為新的直接傳遞格式
                addMerge("bz-d", "bz-m", tgtId, text, mData.col, mData.mrk, mData.dash, "2.5");
                merged = true;
            }
            // 處理純沖合的特例 (月合日沖、月沖日合)
            else if (mData && dData && ((mData.core === "合" && dData.core === "沖") || (mData.core === "沖" && dData.core === "合"))) {
                let text = mData.core === "合" ? "月合日沖" : "月沖日合";
                let col = mData.core === "合" ? "#6f42c1" : "#0d6efd";
                // ★ 修正：改用 addMerge
                addMerge("bz-d", "bz-m", tgtId, text, col, "", "5,3", "2.5");
                merged = true;
            }

            // 如果關係不一致，或只有單方發生作用，就分別畫兩條線
            if (!merged) {
                if (mData) {
                    let text = mData.core === "沖" ? "月破" : `月${mData.core}`;
                    // ★ 修正：改用 addLine
                    addLine("bz-m", tgtId, text, mData.col, mData.mrk, mData.dash);
                }
                if (dData) {
                    let text = `日${dData.core}`;
                    // ★ 修正：改用 addLine
                    addLine("bz-d", tgtId, text, dData.col, dData.mrk, dData.dash);
                }
            }
        } else {
            // 在「全」模式下，只畫獨立的純沖合虛線
            // ★ 修正：全部改用 addLine
            if (isMonthChong) addLine("bz-m", tgtId, "月破", "#6f42c1", "", "5,3");
            else if (isMonthHe) addLine("bz-m", tgtId, "月合", "#0d6efd", "", "5,3");

            if (isDayChong) addLine("bz-d", tgtId, "日沖", "#6f42c1", "", "5,3");
            else if (isDayHe) addLine("bz-d", tgtId, "日合", "#0d6efd", "", "5,3");
        }

    }

    // ==========================================
    // ★ 爻與爻之間的動態牽引 (大迴圈完美移植)
    // ==========================================
    let myStyle = (type === 'tgt' && appData.rows[idx].isAnDong) ? getLayerStyle("anDong_to_other") : getLayerStyle("move_to_other");

    for (let i = 0; i < 6; i++) {
        if (i === idx) continue;

        let zOther = Zhi.indexOf(appData.rows[i].gz.slice(1, 2)), elOther = ZhiFiveMap[zOther];
        let isChong = Math.abs(zOther - zTgtIdx) === 6, isHe = (zOther + zTgtIdx) % 12 === 1;

        let isOtherActive = (appData.rows[i].move !== "" || appData.rows[i].isAnDong) && !appData.rows[i].isRiPo;
        let otherStyle = appData.rows[i].isAnDong ? getLayerStyle("anDong_to_other") : getLayerStyle("move_to_other");

        const drawTgtToTgt = (forcePrefix = "") => {
            let isXing = forcePrefix === "形";
            let isSrc = (type === 'src');

            let rInL = isSrc ? 'bian_in' : 'normal', rInR = isSrc ? 'bian_in' : 'yao_right';
            let rOutL = isSrc ? 'bian_out' : 'normal', rOutR = isSrc ? 'bian_out' : 'yao_right';

            let tShengO = window.WuXingRels.sheng[elTgt] === elOther, tKeO = window.WuXingRels.ke[elTgt] === elOther;
            let oShengT = window.WuXingRels.sheng[elOther] === elTgt, oKeT = window.WuXingRels.ke[elOther] === elTgt;

            // ★ 核心修復：把防護用的 Key 提早定義，讓所有的關係（合剋、沖剋）都能被連環生的理則攔截！
            let relKeyOut = `${idx}->${i}`;
            let relKeyIn = `${i}->${idx}`;

            if (isXing) {
                if (isChong) {
                    if (isTgtActive) addLine(tgtId, "yao-tgt-" + i, "形沖", "#6f42c1", "", "5,3", rOutL, myStyle.weight);
                    else if (isOtherActive) addLine("yao-tgt-" + i, tgtId, "形沖", "#6f42c1", "", "5,3", rInL, otherStyle.weight);
                }
                if (isHe) {
                    if (isTgtActive) addLine(tgtId, "yao-tgt-" + i, "形合", "#0d6efd", "", "5,3", rOutR, myStyle.weight);
                    else if (isOtherActive) addLine("yao-tgt-" + i, tgtId, "形合", "#0d6efd", "", "5,3", rInR, otherStyle.weight);
                }
            } else {
                let handledHe = false, handledChong = false;

                if (isHe) {
                    if (isTgtActive && tShengO) {
                        if (!replacedRelations.has(relKeyOut)) addLine(tgtId, "yao-tgt-" + i, forcePrefix + "合生", myStyle.color, "arrow-blue", myStyle.dash, rOutR, myStyle.weight, myStyle.shadow);
                        handledHe = true;
                    }
                    else if (isOtherActive && oShengT) {
                        if (!replacedRelations.has(relKeyIn)) addLine("yao-tgt-" + i, tgtId, forcePrefix + "合生", otherStyle.color, "arrow-blue", otherStyle.dash, rInR, otherStyle.weight, otherStyle.shadow);
                        handledHe = true;
                    }

                    // ★ 貪生忘剋攔截：有連環生就不畫合剋
                    if (isTgtActive && tKeO) {
                        if (!replacedRelations.has(relKeyOut)) addLine(tgtId, "yao-tgt-" + i, forcePrefix + "合剋", "#6f42c1", "arrow-purple", myStyle.dash, rOutL, myStyle.weight, myStyle.shadow);
                        handledHe = true;
                    }
                    else if (isOtherActive && oKeT) {
                        if (!replacedRelations.has(relKeyIn)) addLine("yao-tgt-" + i, tgtId, forcePrefix + "合剋", "#6f42c1", "arrow-purple", otherStyle.dash, rInL, otherStyle.weight, otherStyle.shadow);
                        handledHe = true;
                    }

                    if (!handledHe) {
                        if (isTgtActive) {
                            if (!replacedRelations.has(relKeyOut)) addLine(tgtId, "yao-tgt-" + i, forcePrefix + "合", "#0d6efd", "", "5,3", rOutR, myStyle.weight);
                        }
                        else if (isOtherActive) {
                            if (!replacedRelations.has(relKeyIn)) addLine("yao-tgt-" + i, tgtId, forcePrefix + "合", "#0d6efd", "", "5,3", rInR, otherStyle.weight);
                        }
                    }
                }

                if (isChong) {
                    // ★ 貪生忘剋攔截：有連環生就不畫沖剋
                    if (isTgtActive && tKeO) {
                        if (!replacedRelations.has(relKeyOut)) addLine(tgtId, "yao-tgt-" + i, forcePrefix + "沖剋", "#dc3545", "arrow-red", "5,3", rOutL, myStyle.weight, myStyle.shadow);
                        handledChong = true;
                    }
                    else if (isOtherActive && oKeT) {
                        if (!replacedRelations.has(relKeyIn)) addLine("yao-tgt-" + i, tgtId, forcePrefix + "沖剋", "#dc3545", "arrow-red", "5,3", rInL, otherStyle.weight, otherStyle.shadow);
                        handledChong = true;
                    }

                    if (!handledChong) {
                        if (isTgtActive) {
                            if (!replacedRelations.has(relKeyOut)) addLine(tgtId, "yao-tgt-" + i, forcePrefix + "沖", "#6f42c1", "", "5,3", rOutL, myStyle.weight);
                        }
                        else if (isOtherActive) {
                            if (!replacedRelations.has(relKeyIn)) addLine("yao-tgt-" + i, tgtId, forcePrefix + "沖", "#6f42c1", "", "5,3", rInL, otherStyle.weight);
                        }
                    }
                }

                if (!isHe && !isChong) {
                    if (isTgtActive && tShengO) {
                        if (!replacedRelations.has(relKeyOut)) addLine(tgtId, "yao-tgt-" + i, forcePrefix + "生", myStyle.color, "arrow-blue", myStyle.dash, rOutR, myStyle.weight, myStyle.shadow);
                    }
                    else if (isOtherActive && oShengT) {
                        if (!replacedRelations.has(relKeyIn)) addLine("yao-tgt-" + i, tgtId, forcePrefix + "生", otherStyle.color, "arrow-blue", otherStyle.dash, rInR, otherStyle.weight, otherStyle.shadow);
                    }

                    if (isTgtActive && tKeO) {
                        if (!replacedRelations.has(relKeyOut)) addLine(tgtId, "yao-tgt-" + i, forcePrefix + "剋", "#dc3545", "arrow-red", myStyle.dash, rOutL, myStyle.weight, myStyle.shadow);
                    }
                    else if (isOtherActive && oKeT) {
                        if (!replacedRelations.has(relKeyIn)) addLine("yao-tgt-" + i, tgtId, forcePrefix + "剋", "#dc3545", "arrow-red", otherStyle.dash, rInL, otherStyle.weight, otherStyle.shadow);
                    }
                }
            }

            if (!isXing) {
                let drawTombOut = true, drawTombIn = true;
                if (isTgtActive && (tShengO || tKeO)) drawTombOut = false;
                if (isOtherActive && (oShengT || oKeT)) drawTombIn = false;

                if (zOther === myTombZhi && drawTombOut && !disableXingMu) {
                    let isOtherMoving = appData.rows[i].move !== "" || appData.rows[i].isAnDong;
                    let currentTombLevel = isOtherMoving ? 3 : 4;
                    if (currentTombLevel === myTombLevel) {
                        if (currentTombLevel === 3) addLine(tgtId, "yao-tgt-" + i, "形動墓", "#8B4513", "arrow-brown", "none", rOutR);
                        else if (currentTombLevel === 4) addLine(tgtId, "yao-tgt-" + i, "形墓", "#A0522D", "", "5,3", rOutR);
                    }
                }

                let disableOtherXingMu = (elOther === 4);
                // ★ 修正：若是其他爻為土爻，同樣切斷入墓判斷
                let otherTombZhi = disableOtherXingMu ? -1 : window.WuXingRels.tomb[elOther];

                if (zTgtIdx === otherTombZhi && drawTombIn && !disableOtherXingMu) {
                    let oLevel = 99;
                    if (dZhiIdx === otherTombZhi) oLevel = 1;
                    else if (appData.rows[i].move && Zhi.indexOf(appData.rows[i].bgz.slice(1, 2)) === otherTombZhi) oLevel = 2;
                    else {
                        let hasOtherDongTomb = false;
                        for (let j = 0; j < 6; j++) { if (j !== i && (appData.rows[j].move !== "" || appData.rows[j].isAnDong) && Zhi.indexOf(appData.rows[j].gz.slice(1, 2)) === otherTombZhi) hasOtherDongTomb = true; }
                        oLevel = hasOtherDongTomb ? 3 : 4;
                    }
                    let isTgtMoving = isTgtActive, currentTgtLevelAsTomb = isTgtMoving ? 3 : 4;
                    if (currentTgtLevelAsTomb === oLevel) {
                        if (currentTgtLevelAsTomb === 3) addLine("yao-tgt-" + i, tgtId, "形動墓", "#8B4513", "arrow-brown", "none", rInR);
                        else if (currentTgtLevelAsTomb === 4) addLine("yao-tgt-" + i, tgtId, "形墓", "#A0522D", "", "5,3", rInR);
                    }
                }
            }
        };

        if (type === 'fu') {
            if (!fState.isFullyActive) {
                if (isChong) addLine(tgtId, "yao-tgt-" + i, "形沖", "#6f42c1", "", "5,3", "fu_out");
                if (isHe) addLine(tgtId, "yao-tgt-" + i, "形合", "#0d6efd", "", "5,3", "yao_right");
            } else drawTgtToTgt();
        } else if (type === 'src') {
            drawTgtToTgt("形");
        } else {
            drawTgtToTgt();
            if (filter === '全+') {
                if (appData.rows[i].move !== "" && appData.rows[i].bgz) {
                    let zBianOther = Zhi.indexOf(appData.rows[i].bgz.slice(1, 2));
                    let isC = Math.abs(zBianOther - zTgtIdx) === 6, isH = (zBianOther + zTgtIdx) % 12 === 1;
                    if (isC) addLine("yao-src-" + i, tgtId, "形沖", "#6f42c1", "", "5,3", "bian_in");
                    else if (isH) addLine("yao-src-" + i, tgtId, "形合", "#0d6efd", "", "5,3", "bian_in");
                }
                if (isTgtActive && appData.rows[idx].move !== "" && appData.rows[idx].bgz) {
                    let zBianSelf = Zhi.indexOf(appData.rows[idx].bgz.slice(1, 2));
                    let isC = Math.abs(zBianSelf - zOther) === 6, isH = (zBianSelf + zOther) % 12 === 1;
                    if (isC) addLine("yao-src-" + idx, "yao-tgt-" + i, "形沖", "#6f42c1", "", "5,3", "bian_out");
                    else if (isH) addLine("yao-src-" + idx, "yao-tgt-" + i, "形合", "#0d6efd", "", "5,3", "bian_out");
                }
                if (appData.rows[i].fuGz) {
                    let zFuOther = Zhi.indexOf(appData.rows[i].fuGz.slice(1, 2)), otherFState = getFuState(i, ZhiFiveMap[zFuOther]);
                    let prefixOther = otherFState.isFullyActive ? "" : "形";
                    if (Math.abs(zFuOther - zTgtIdx) === 6) addLine("yao-fu-" + i, tgtId, prefixOther + "沖", "#6f42c1", "", "5,3", "fu_in");
                    else if ((zFuOther + zTgtIdx) % 12 === 1) addLine("yao-fu-" + i, tgtId, prefixOther + "合", "#0d6efd", "", "5,3", "fu_in");
                }
                if (appData.rows[idx].fuGz) {
                    let zFuSelf = Zhi.indexOf(appData.rows[idx].fuGz.slice(1, 2)), selfFState = getFuState(idx, ZhiFiveMap[zFuSelf]);
                    let prefixSelf = selfFState.isFullyActive ? "" : "形";
                    if (Math.abs(zFuSelf - zOther) === 6) addLine("yao-fu-" + idx, "yao-tgt-" + i, prefixSelf + "沖", "#6f42c1", "", "5,3", "fu_out");
                    else if ((zFuSelf + zOther) % 12 === 1) addLine("yao-fu-" + idx, "yao-tgt-" + i, prefixSelf + "合", "#0d6efd", "", "5,3", "fu_out");
                }
            }
        }

        // ==========================================
        // ★ 新增理則：出伏的伏神，若卦中有其墓，必有形墓牽連
        // ==========================================
        if (filter === '全+' || filter === '全' || filter === '形墓' || filter === '墓') {
            // 情況 A：點擊的是伏神 (且已出伏)，對方爻是我的墓
            if (type === 'fu' && isTgtActive && elTgt !== 4) {
                if (zOther === window.WuXingRels.tomb[elTgt]) {
                    // 檢查是否已經有畫過了 (避免跟原本的 drawTgtToTgt 重複)
                    let existing = lines.find(l => l.srcId === tgtId && l.tgtId === ("yao-tgt-" + i) && l.text.includes("墓"));
                    if (!existing) {
                        let isOtherMoving = appData.rows[i].move !== "" || appData.rows[i].isAnDong;
                        let tTxt = isOtherMoving ? "形動墓" : "形墓";
                        let tCol = isOtherMoving ? "#8B4513" : "#A0522D";
                        let tDash = isOtherMoving ? "none" : "5,3";
                        addLine(tgtId, "yao-tgt-" + i, tTxt, tCol, isOtherMoving ? "arrow-brown" : "", tDash, "fu_out");
                    }
                }
            }

            // 情況 B：點擊的是本爻 (tgt)，檢查對方的伏神是否出伏，且我是它的墓
            if (type === 'tgt') {
                if (appData.rows[i].fuGz) {
                    let fuZhiOther = Zhi.indexOf(appData.rows[i].fuGz.slice(1, 2));
                    let fuElOther = ZhiFiveMap[fuZhiOther];
                    let fStateOther = getFuState(i, fuElOther);

                    // 若該爻的伏神已出伏，且五行非土，且我是它的墓庫
                    if (fStateOther.isFullyActive && fuElOther !== 4 && zTgtIdx === window.WuXingRels.tomb[fuElOther]) {
                        let isSelfMoving = isTgtActive; // 點擊的本爻是否有動
                        let tTxt = isSelfMoving ? "形動墓" : "形墓";
                        let tCol = isSelfMoving ? "#8B4513" : "#A0522D";
                        let tDash = isSelfMoving ? "none" : "5,3";
                        addLine("yao-fu-" + i, tgtId, tTxt, tCol, isSelfMoving ? "arrow-brown" : "", tDash, "fu_in");
                    }
                }
            }
        }
    }

    // --- 變爻回頭生剋最強連結 ---
    if ((type === 'tgt' || type === 'src') && appData.rows[idx].move && appData.rows[idx].bgz) {
        let zBian = Zhi.indexOf(appData.rows[idx].bgz.slice(1, 2)), elBian = ZhiFiveMap[zBian];
        let zOrig = Zhi.indexOf(appData.rows[idx].gz.slice(1, 2)), elOrig = ZhiFiveMap[zOrig];
        let srcDomId = "yao-src-" + idx, tgtDomId = "yao-tgt-" + idx;
        let fwdLabels = [], fwdColor = "#8B4513", fwdMarker = "arrow-brown", fwdDash = "none";

        if (zBian === zOrig) { fwdLabels.push("化伏吟"); fwdColor = "#343a40"; fwdMarker = "arrow-dark"; fwdDash = "5,3"; }
        else {
            if (window.WuXingRels.jin[zOrig] === zBian) { fwdLabels.push("化進神"); fwdColor = "#e6a23c"; fwdMarker = "arrow-gold"; }
            if (window.WuXingRels.tui[zOrig] === zBian) { fwdLabels.push("化退神"); fwdColor = "#6c757d"; fwdMarker = "arrow-gray"; }
        }

        let shouldDrawFwd = filter === '全+';
        let isC = Math.abs(zBian - zOrig) === 6, isH = (zBian + zOrig) % 12 === 1;
        let isS = window.WuXingRels.sheng[elBian] === elOrig, isK = window.WuXingRels.ke[elBian] === elOrig;
        let txt = "", col = "#000", mrk = "", dsh = "none";

        // 預先計算此時變爻狀態
        let kw1 = (10 - appData.bazi.dG + dZhiIdx) % 12; if (kw1 < 0) kw1 += 12;
        let kw2 = (11 - appData.bazi.dG + dZhiIdx) % 12; if (kw2 < 0) kw2 += 12;
        let zb_isKong = (zBian === kw1 || zBian === kw2);
        let zb_isMPo = Math.abs(zBian - mIdx) === 6;
        let zb_isDPo = Math.abs(zBian - dZhiIdx) === 6;

        if (isC && isK) { txt = "反吟/回頭沖剋"; col = "#dc3545"; mrk = "arrow-red"; dsh = "none"; availableRels.add("剋"); availableRels.add("沖"); }
        else if (isC) { txt = "反吟/回頭沖"; col = "#6f42c1"; mrk = ""; dsh = "5,3"; availableRels.add("沖"); }
        else if (isH && isK) { txt = "回頭合剋"; col = "#dc3545"; mrk = "arrow-red"; dsh = "none"; availableRels.add("合"); availableRels.add("剋"); }
        else if (isH && isS) { txt = "回頭生合"; col = "#198754"; mrk = "arrow-green"; dsh = "none"; availableRels.add("合"); availableRels.add("生"); }
        else if (isH) { txt = "回頭合"; col = "#0d6efd"; mrk = ""; dsh = "5,3"; availableRels.add("合"); }
        else if (isS) { txt = "回頭生"; col = "#198754"; mrk = "arrow-green"; dsh = "none"; availableRels.add("生"); }
        else if (isK) {
            // ★ 淨化：這裡只負責決定 SVG 關係線上的文字標籤，不再干涉 HTML 總分面板
            availableRels.add("剋");
            mrk = "arrow-red";
            dsh = "none";
            col = "#dc3545";

            if (!zb_isKong && !zb_isMPo && !zb_isDPo) {
                txt = "回頭剋原相(-1)吉凶(-1)";
            } else if (zb_isMPo || zb_isDPo) {
                txt = "回頭剋原相(-0)出月補破、值臨填實或逢合(-1)";
            } else if (zb_isKong) {
                txt = "回頭剋原相(-0)出空值臨(-1)";
            }
        }

        let shouldDrawBwd = true;
        if (filter === '全' && (txt.includes("生") || txt.includes("剋") || txt.includes("沖") || txt.includes("合") || txt.includes("反吟"))) shouldDrawBwd = false;

        if (fwdLabels.length > 0 && shouldDrawFwd) addLine(tgtDomId, srcDomId, fwdLabels.join("/"), fwdColor, fwdMarker, fwdDash, "self_forward", "3.5", "rgba(220,53,69,0.4)");
        if (txt && shouldDrawBwd) {
            addLine(srcDomId, tgtDomId, txt, col, mrk, dsh, "self_backward_1", "3.5", "rgba(220,53,69,0.4)");
        }
    }

    // ==========================================
    // ★ 升級版：三合局動態三角連線與中神代表制
    // ==========================================
    let activeSanheGroups = []; // 供下方淨化器使用

    if (appData.strictSanheList && appData.strictSanheList.length > 0) {
        let k1 = (10 - appData.bazi.dG + dZhiIdx) % 12; if (k1 < 0) k1 += 12;
        let k2 = (11 - appData.bazi.dG + dZhiIdx) % 12; if (k2 < 0) k2 += 12;

        appData.strictSanheList.forEach(sh => {
            let nodesInfo = [];
            let nodesZhi = [];

            // 1. 蒐集符合資格的節點
            if (sh.req.includes(dZhiIdx)) { nodesZhi.push(dZhiIdx); nodesInfo.push({ id: "bz-d", z: dZhiIdx }); }
            if (sh.req.includes(mIdx)) { nodesZhi.push(mIdx); nodesInfo.push({ id: "bz-m", z: mIdx }); }

            for (let k = 0; k < 6; k++) {
                let r = appData.rows[k];
                let gzZhi = Zhi.indexOf(r.gz.slice(1, 2));
                // ★ 實踐需求 4：暗動 (isAnDong) 與明動享有同等成局權利
                if ((r.move !== "" || r.isAnDong) && !r.isRiPo && sh.req.includes(gzZhi)) {
                    nodesZhi.push(gzZhi); nodesInfo.push({ id: "yao-tgt-" + k, z: gzZhi });
                }
                if (r.move !== "" && r.bgz) {
                    let bgzZhi = Zhi.indexOf(r.bgz.slice(1, 2));
                    if (sh.req.includes(bgzZhi)) {
                        nodesZhi.push(bgzZhi); nodesInfo.push({ id: "yao-src-" + k, z: bgzZhi });
                    }
                }
            }

            let isFormed = sh.req.every(reqZhi => nodesZhi.includes(reqZhi));
            let isKong = nodesInfo.some(n => n.z === k1 || n.z === k2);

            if (isFormed) {
                let shElIdx = FiveEl.indexOf(sh.el);
                // 找出中神 (例如巳酉丑的酉)
                let centerNode = nodesInfo.find(n => n.z === sh.center) || nodesInfo[0];

                activeSanheGroups.push({ sh, nodesInfo, isKong, centerId: centerNode.id, shElIdx });

                // 判斷目前點擊的目標，與這個三合局的關係
                let isTgtMember = nodesInfo.some(n => n.id === tgtId);
                let doesSanheShengTgt = (window.WuXingRels.sheng[shElIdx] === elTgt && !isTgtMember);
                let doesSanheKeTgt = (window.WuXingRels.ke[shElIdx] === elTgt && !isTgtMember);

                // ★ 修正 1：若目標是伏神，且未出伏，三合局對其無作用
                if (type === 'fu' && !isTgtActive) {
                    doesSanheShengTgt = false;
                    doesSanheKeTgt = false;
                }

                // ★ 實踐需求 2 & 3：只要點擊的是局內人，或是局外被生剋的目標，都顯示包圍三角形！
                if (isTgtMember || doesSanheShengTgt || doesSanheKeTgt) {
                    let color = isKong ? "#adb5bd" : "#ffc107";
                    let dash = isKong ? "4,3" : "none";
                    nodesInfo.forEach(n => {
                        lines.push({ type: 'triangle_marker', nodeId: n.id, text: "三合", color: color, dash: dash });
                    });
                }

                // 畫出中神對外的三合局連線
                if (!isKong) {
                    if (isTgtMember) {
                        // ★ 實踐需求 3：點擊酉金(中神)時，主動發射三合局生線段給其他爻 (包含本卦與出伏伏神)
                        for (let k = 0; k < 6; k++) {
                            let r = appData.rows[k];

                            // 1. 對其他本卦爻發射
                            let tId = "yao-tgt-" + k;
                            if (tId !== tgtId) {
                                let tZhi = Zhi.indexOf(r.gz.slice(1, 2));
                                let tEl = ZhiFiveMap[tZhi];
                                let isChong = Math.abs(sh.center - tZhi) === 6;
                                let isHe = (sh.center + tZhi) % 12 === 1;

                                if (!sh.req.includes(tZhi)) {
                                    if (window.WuXingRels.sheng[shElIdx] === tEl) {
                                        addLine(centerNode.id, tId, isHe ? "三合局合生" : "三合局生", "#ffc107", "arrow-gold", "none", "normal", "3.5");
                                    } else if (window.WuXingRels.ke[shElIdx] === tEl) {
                                        addLine(centerNode.id, tId, isChong ? "三合局沖剋" : (isHe ? "三合局合剋" : "三合局剋"), "#dc3545", "arrow-red", "none", "normal", "3.5");
                                    }
                                }
                            }

                            // 2. 對伏神發射 (需判斷是否出伏)
                            if (r.fuGz) {
                                let fId = "yao-fu-" + k;
                                if (fId !== tgtId) {
                                    let fZhi = Zhi.indexOf(r.fuGz.slice(1, 2));
                                    let fEl = ZhiFiveMap[fZhi];
                                    let fState = getFuState(k, fEl);

                                    // 伏神必須出伏，三合局才能對其作用
                                    if (fState.isFullyActive && !sh.req.includes(fZhi)) {
                                        let isChongF = Math.abs(sh.center - fZhi) === 6;
                                        let isHeF = (sh.center + fZhi) % 12 === 1;

                                        let drawCenterId = centerNode.id;
                                        // 若目標是伏神，發射起點若為變爻，須強制轉為本爻
                                        //if (drawCenterId.includes('yao-src-')) drawCenterId = drawCenterId.replace('yao-src-', 'yao-tgt-');

                                        if (window.WuXingRels.sheng[shElIdx] === fEl) {
                                            addLine(drawCenterId, fId, isHeF ? "三合局合生" : "三合局生", "#ffc107", "arrow-gold", "none", "normal", "3.5");
                                        } else if (window.WuXingRels.ke[shElIdx] === fEl) {
                                            addLine(drawCenterId, fId, isChongF ? "三合局沖剋" : (isHeF ? "三合局合剋" : "三合局剋"), "#dc3545", "arrow-red", "none", "normal", "3.5");
                                        }
                                    }
                                }
                            }
                        }
                    } else {
                        // 點擊局外人(例如目標為亥水或卯木伏神)，畫出中神來生/剋的線
                        let drawCenterId = centerNode.id;

                        // ★ 修正 2：如果目標是伏神，強制將中神的起點轉為本卦 (tgt) 節點
                        //if (type === 'fu' && drawCenterId.includes('yao-src-')) {
                        //    drawCenterId = drawCenterId.replace('yao-src-', 'yao-tgt-');
                        //}

                        let isChongTgt = Math.abs(sh.center - zTgtIdx) === 6;
                        let isHeTgt = (sh.center + zTgtIdx) % 12 === 1;

                        if (doesSanheShengTgt) {
                            let txt = isHeTgt ? "三合局合生" : "三合局生";
                            addLine(drawCenterId, tgtId, txt, "#ffc107", "arrow-gold", "none", "normal", "3.5");
                        } else if (doesSanheKeTgt) {
                            let txt = isChongTgt ? "三合局沖剋" : (isHeTgt ? "三合局合剋" : "三合局剋");
                            addLine(drawCenterId, tgtId, txt, "#dc3545", "arrow-red", "none", "normal", "3.5");
                        }
                    }
                }
            }
        });
    }

    // ====================================================================
    // ★ 終極理則淨化器 (取消局內互生、中神霸權、貪生忘剋)
    // ====================================================================

    let allSanheMemberIds = new Set();
    let allSanheCenterIds = new Set();
    let sanheActsOnTarget = false;

    activeSanheGroups.forEach(grp => {
        if (!grp.isKong) {
            grp.nodesInfo.forEach(n => allSanheMemberIds.add(n.id));
            allSanheCenterIds.add(grp.centerId);
            // 判斷該局是否對點擊的目標產生作用
            let isTgtMember = grp.nodesInfo.some(n => n.id === tgtId);
            if (!isTgtMember && (window.WuXingRels.sheng[grp.shElIdx] === elTgt || window.WuXingRels.ke[grp.shElIdx] === elTgt)) {
                sanheActsOnTarget = true;
            }
        }
    });

    let chainNodes = new Set();
    lines.forEach(l => { if (l.isChainSheng) { chainNodes.add(l.srcId); chainNodes.add(l.tgtId); } });

    // 執行清洗
    lines = lines.filter(l => {
        if (l.type === 'triangle_marker' || l.text.includes('三合')) return true;

        let s1 = l.srcId || l.srcId1;
        let isDirectShengKe = (l.text.includes('生') || l.text.includes('剋') || l.text.includes('克')) && !l.isChainSheng;
        let isChong = (l.text.includes('沖') || l.text.includes('破'));

        // 【實踐需求 1】：取消三合局「內部」的互生、互剋、互沖
        let isInternalToAnyGroup = activeSanheGroups.some(grp => {
            if (grp.isKong) return false;
            let grpMemberIds = grp.nodesInfo.map(n => n.id);
            return grpMemberIds.includes(s1) && grpMemberIds.includes(l.tgtId);
        });
        if (isInternalToAnyGroup && (isDirectShengKe || isChong)) return false;

        // 【實踐需求 5】：非中神的成員，喪失對外的個別生、剋、沖能力 (例如巳不能沖亥)
        let isS1NonCenter = s1 && allSanheMemberIds.has(s1) && !allSanheCenterIds.has(s1);
        let isOutgoing = s1 !== l.tgtId && !isInternalToAnyGroup;
        if (isS1NonCenter && isOutgoing) {
            if (isDirectShengKe || isChong) return false;
            if (l.isChainSheng) return false;
        }

        // 理則：三合局生剋覆蓋連環相生
        if (sanheActsOnTarget && l.isChainSheng) return false;

        // 理則：三合局生剋覆蓋單獨生剋
        if (sanheActsOnTarget && isDirectShengKe && l.tgtId === tgtId) {
            if (s1 && allSanheMemberIds.has(s1)) return false;
        }

        // 理則：貪生忘剋 (連環相生覆蓋單獨生剋)
        if (!sanheActsOnTarget && isDirectShengKe && l.tgtId === tgtId) {
            if (s1 && chainNodes.has(s1)) return false;
        }

        return true;
    });

    // 清洗重複線條：如果已經有「三合局生」A->B，就刪除原本藍色的「生」A->B
    let sanheLineKeys = new Set(lines.filter(l => l.text.includes('三合')).map(l => `${l.srcId}->${l.tgtId}`));
    lines = lines.filter(l => {
        let isDirectShengKe = (l.text.includes('生') || l.text.includes('剋') || l.text.includes('克')) && !l.isChainSheng && !l.text.includes('三合');
        if (isDirectShengKe && sanheLineKeys.has(`${l.srcId}->${l.tgtId}`)) return false;
        return true;
    });

    // --- 最終過濾 (根據點擊的按鈕洗牌) ---
    let filteredLines = lines.filter(rel => {
        let txt = rel.text || "";
        if (filter === '生+') return rel.isChainSheng === true;
        if (filter === '全' && rel.isChainSheng) return true;
        if (filter === '無' || filter === '比') return false;
        let isSunMoon = (rel.srcId && rel.srcId.includes('bz-')) ||
            (rel.srcId1 && rel.srcId1.includes('bz-')) ||
            (rel.tgtId && rel.tgtId.includes('bz-'));
        if (filter === '全' && isSunMoon && !txt.includes('墓')) return false;
        if (filter === '全' && (txt.includes('形墓') || txt.includes('形動墓'))) return false;
        if (filter !== '全' && filter !== '全+') {
            if (filter === '明') return isSunMoon;
            if (isSunMoon) return false;
            if (filter === '墓') return txt.includes('墓') && !txt.includes('形墓');
            if (filter === '形墓') return txt.includes('形墓') || txt.includes('形動墓');
            return txt.includes(filter) || (filter === '沖' && txt.includes('破'));
        }
        return true;
    });

    // ==========================================
    // ★ 合絆 (He-Ban) 掃描器 (僅在「全+」模式觸發)
    // ==========================================
    if (filter === '全+') {
        let innerCount = 0, outerCount = 0;

        for (let i = 0; i < 3; i++) {
            if (appData.rows[i].move && appData.rows[i].bgz) {
                let z = Zhi.indexOf(appData.rows[i].gz.slice(1, 2));
                let zB = Zhi.indexOf(appData.rows[i].bgz.slice(1, 2));
                if ((z + zB) % 12 === 1) innerCount++;
            }
        }
        for (let i = 3; i < 6; i++) {
            if (appData.rows[i].move && appData.rows[i].bgz) {
                let z = Zhi.indexOf(appData.rows[i].gz.slice(1, 2));
                let zB = Zhi.indexOf(appData.rows[i].bgz.slice(1, 2));
                if ((z + zB) % 12 === 1) outerCount++;
            }
        }

        if (innerCount === 3 && outerCount === 3) {
            filteredLines.push({ type: 'bounding_box', boxType: 'all', text: '全合絆', color: '#6f42c1', dash: '5,5' });
        } else {
            if (innerCount === 3) filteredLines.push({ type: 'bounding_box', boxType: 'inner', text: '內合絆', color: '#0d6efd', dash: '5,5' });
            if (outerCount === 3) filteredLines.push({ type: 'bounding_box', boxType: 'outer', text: '外合絆', color: '#0d6efd', dash: '5,5' });
        }
    }

    return { lines: filteredLines, availableRels: availableRels };
}

window.createDrawSnapshot = function () {
    let svgContent = document.getElementById("rel-lines").innerHTML;
    let filter = AppState.currentRelFilter;
    let activeYao = AppState.activeYaoIdx;
    return {
        svg: svgContent,
        filter: filter,
        activeYao: activeYao,
        availableRels: Array.from(AppState.availableRels) // Convert Set to Array
    };
};

// ==========================================
// ★ 快照還原引擎 (升級版：進入開啟繪圖的歷史紀錄時，全盤線條 0.5秒自動消失)
// ==========================================
window.restoreDrawSnapshot = function () {
    let snap = AppState.curData.drawSnapshot;
    if (snap) {
        // 1. 還原 SVG 內容與系統過濾器狀態
        document.getElementById("rel-lines").innerHTML = snap.svg;
        AppState.currentRelFilter = snap.filter;
        AppState.activeYaoIdx = snap.activeYao;
        AppState.availableRels = new Set(snap.availableRels);
        updateFilterButtonsDisplay(AppState.availableRels);

        // 2. 切換工具列按鈕的 Active 狀態
        document.querySelectorAll('.seal-btn').forEach(btn => {
            let btnFilter = btn.innerText;
            if (btn.classList.contains('btn-all-plus')) btnFilter = '全+';
            if (btn.classList.contains('btn-xingmu')) btnFilter = '形墓';
            btn.classList.toggle('active', btnFilter === snap.filter);
        });

        // ===================================================
        // ★ 核心修復：如果加載進來的是全盤線條模式 ('all')，立刻啟動 0.5秒淡出計時器
        // ===================================================
        if (snap.activeYao === 'all') {
            let svgLinesGroup = document.getElementById("rel-lines");
            if (svgLinesGroup) {
                svgLinesGroup.classList.remove("auto-fade-out-lines");
                void svgLinesGroup.offsetWidth; // 觸發 Reflow 刷新動畫時序
                svgLinesGroup.classList.add("auto-fade-out-lines");
            }

            // 0.5秒時間到，自動切回「無」，維持畫面乾淨
            setTimeout(() => {
                // 確保使用者在這 0.5秒內沒有切換到其他爻位，才執行自動隱藏
                if (AppState.isDrawModeEnabled && AppState.activeYaoIdx === 'all') {
                    if (typeof window.setRelFilter === 'function') {
                        window.setRelFilter('無');
                    }
                    if (svgLinesGroup) svgLinesGroup.classList.remove("auto-fade-out-lines");
                }
            }, 500);
        }
    }
};

// ==========================================
// ★ 重繪功能
// ==========================================
window.redrawAndSaveSnapshot = function () {
    if (!AppState.curData || !AppState.curData.rows) return;

    // ==========================================
    // ★ 核心修復：重繪前先抓取網頁上最新的筆記內容，避免核心運算後重載時被洗掉
    // ==========================================
    if (AppState.curData) {
        AppState.curData.subject = document.getElementById("edit-subject")?.value || AppState.curData.subject || "";
        AppState.curData.judge = document.getElementById("edit-judge")?.value || AppState.curData.judge || "";
        AppState.curData.feedback = document.getElementById("edit-feedback")?.value || AppState.curData.feedback || "";
        AppState.curData.note = document.getElementById("edit-note")?.value || AppState.curData.note || "";
        AppState.curData.currentStatus = document.getElementById("edit-current-status")?.value || AppState.curData.currentStatus || "";
        AppState.curData.copyAddon = document.getElementById("edit-copy-addon")?.value || AppState.curData.copyAddon || "";
        AppState.curData.yingqi = typeof window.getSettingsYingqiSnapshot === 'function' ? window.getSettingsYingqiSnapshot() : (AppState.curData.yingqi || null);
    }

    // 1. 清除舊快照
    if (AppState.curData) {
        delete AppState.curData.drawSnapshot;
    }

    // 2. 標記進入「全盤模式」
    AppState.activeYaoIdx = 'all';

    // 強迫引擎重新運算一次
    if (typeof window.solve === 'function') {
        let res = window.solve(AppState.curData.lines, AppState.curData.bazi, AppState.curData.najiaValue, AppState.curData.fushenValue);
        AppState.curData.ben = res.ben;
        AppState.curData.bian = res.bian;
        AppState.curData.rows = res.rows;
    }

    // 呼調 renderRes，將最新資料畫上螢幕
    if (typeof window.renderRes === 'function') {
        window.renderRes();
    }

    if (window.showToast) window.showToast("✅ 全盤印章與關係線段已重新計算更新！", 2500);

    // 等待 Toast 顯示 2.5 秒消失後，自動切換為「無」
    setTimeout(() => {
        if (AppState.isDrawModeEnabled && typeof window.setRelFilter === 'function') {
            window.setRelFilter('無');
        }
    }, 1200);
};

window.setRelFilter = function (filter) {
    AppState.currentRelFilter = filter;

    // 切換按鈕的 Active 反藍樣式
    document.querySelectorAll('.seal-btn').forEach(btn => {
        let bText = btn.innerText;
        if (btn.classList.contains('btn-all-plus')) bText = '全+';
        if (btn.classList.contains('btn-xingmu')) bText = '形墓';
        if (bText !== '✖' && bText !== '🔄 重繪') {
            btn.classList.toggle('active', bText === filter);
        }
    });

    // 根據目前的狀態，決定重繪全盤還是單節點
    if (AppState.activeYaoIdx === 'all') {
        if (typeof window.drawRelations === 'function') window.drawRelations('all', null);
    } else if (AppState.activeYaoIdx !== -1) {
        let parts = AppState.activeYaoIdx.split('_');
        if (typeof window.drawRelations === 'function') window.drawRelations(parseInt(parts[1]), parts[0]);
    }

    // ★ 修正 1：切換過濾器後，只在記憶體更新快照，不再觸發背景存檔
    if (typeof window.createDrawSnapshot === 'function') {
        AppState.curData.drawSnapshot = window.createDrawSnapshot();
    }

    // ★ 新增防呆：當過濾器切換為「無」時，強制把可能殘留的淡出 CSS 類別給拔掉，確保下次動畫能順利重複觸發
    if (filter === '無') {
        let svgLinesGroup = document.getElementById("rel-lines");
        if (svgLinesGroup) svgLinesGroup.classList.remove("auto-fade-out-lines");
    }
};

// ==========================================
// ★ 真假墓專屬視覺 CSS 產生器
// ==========================================
(function initTombAnimations() {
    if (!document.getElementById('tomb-anim-styles')) {
        const style = document.createElement('style');
        style.id = 'tomb-anim-styles';
        style.innerHTML = `
            @keyframes trueTombBreath {
                0% { opacity: 1; }
                50% { opacity: 0.4; filter: grayscale(30%); }
                100% { opacity: 1; }
            }
            @keyframes falseTombBreath {
                0% { filter: brightness(1); box-shadow: 0 0 0px transparent; }
                50% { filter: brightness(1.3); box-shadow: 0 0 6px currentColor; }
                100% { filter: brightness(1); box-shadow: 0 0 0px transparent; }
            }
            .anim-true-tomb { animation: trueTombBreath 2.5s infinite ease-in-out; }
            .anim-false-tomb { animation: falseTombBreath 2.5s infinite ease-in-out; }
        `;
        document.head.appendChild(style);
    }
})();

function getBoundingBoxSvgString(rel, svgRect) {
    let startIdx = rel.boxType === 'outer' ? 3 : 0;
    let endIdx = rel.boxType === 'inner' ? 2 : 5;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    let found = false;

    // 計算出涵蓋本爻與變爻的最大矩形邊界
    for (let i = startIdx; i <= endIdx; i++) {
        ['yao-tgt-', 'yao-src-'].forEach(prefix => {
            let el = document.getElementById(prefix + i);
            if (el) {
                let rect = el.getBoundingClientRect();
                minX = Math.min(minX, rect.left - svgRect.left);
                minY = Math.min(minY, rect.top - svgRect.top);
                maxX = Math.max(maxX, rect.right - svgRect.left);
                maxY = Math.max(maxY, rect.bottom - svgRect.top);
                found = true;
            }
        });
    }

    if (!found) return "";

    // 稍微擴張邊距，讓框線包覆更美觀
    let padding = 10;
    minX -= padding; minY -= padding; maxX += padding; maxY += padding;
    let width = maxX - minX, height = maxY - minY;

    let rectSvg = `<rect x="${minX}" y="${minY}" width="${width}" height="${height}" fill="rgba(13,110,253,0.03)" stroke="${rel.color}" stroke-width="2" stroke-dasharray="${rel.dash}" rx="6" ry="6" />`;

    let textX = minX - 15;
    let textY = minY + height / 2;
    // 使用 rotate 讓文字直立靠在左側
    let textSvg = `<text x="${textX}" y="${textY}" fill="${rel.color}" font-size="14px" font-weight="bold" text-anchor="middle" transform="rotate(-90 ${textX} ${textY})">${rel.text}</text>`;

    return rectSvg + textSvg;
}

// ==========================================
// ★ 佈局變動監聽器 (解決跨螢幕與區塊展開的線條跑位)
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    const resultView = document.getElementById('result-view');
    if (resultView && typeof ResizeObserver !== 'undefined') {
        const resizeObserver = new ResizeObserver(() => {
            // 只有在繪圖模式開啟，且確實有畫線的情況下才觸發重繪
            if (window.AppState && window.AppState.isDrawModeEnabled && window.AppState.activeYaoIdx !== -1) {
                if (window.AppState.activeYaoIdx === 'all') {
                    if (typeof window.drawRelations === 'function') window.drawRelations('all', null);
                } else {
                    let parts = window.AppState.activeYaoIdx.split('_');
                    if (parts.length === 2 && typeof window.drawRelations === 'function') {
                        window.drawRelations(parseInt(parts[1]), parts[0]);
                    }
                }
            }
        });
        // 監聽排盤結果視窗的任何尺寸與佈局變動
        resizeObserver.observe(resultView);
    }
});