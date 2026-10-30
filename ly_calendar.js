// ==========================================
// ★ Lunar.js 台灣在地化與繁簡轉換引擎
// ==========================================

// 1. 輕量級日曆專用繁簡字典 (僅針對 Lunar.js 常輸出的簡體字)
const lunarS2TDict = {
    '农': '農', '历': '曆', '闰': '閏', '腊': '臘', '岁': '歲',
    '阴': '陰', '阳': '陽', '冲': '沖', '煞': '煞', '猪': '豬',
    '鸡': '雞', '龙': '龍', '马': '馬', '龟': '龜', '国': '國',
    '庆': '慶', '节': '節', '纪': '紀', '念': '念', '儿': '兒',
    '童': '童', '妇': '婦', '劳': '勞', '动': '動', '万': '萬',
    '圣': '聖', '诞': '誕', '辞': '辭', '旧': '舊', '迎': '迎', 
    '新': '新', '头': '頭', '兔': '兔', '鼠': '鼠', '牛': '牛',
    '虎': '虎', '羊': '羊', '猴': '猴', '狗': '狗', '蛇': '蛇'
};

// 2. 轉換封裝函式 (供後續渲染 UI 時包裝使用)
window.toTrad = function(str) {
    if (!str) return str;
    return str.split('').map(c => lunarS2TDict[c] || c).join('');
};

// 3. 覆寫 Lunar.js 的內建節日設定 (等待套件載入後執行)
document.addEventListener("DOMContentLoaded", function() {
    // ==========================================
    // 1. 初始化應期抽屜的下拉選單
    // ==========================================
    if(typeof window.initYingqiSelects === 'function') {
        window.initYingqiSelects();
    }

    // ==========================================
    // 2. 覆寫 Lunar.js 的內建節日設定
    // ==========================================
    if (typeof SolarUtil !== 'undefined' && typeof LunarUtil !== 'undefined') {
        // --- 處理陽曆節日 ---
        // 清空預設的陽曆節日 (避免出現非台灣節日)
        SolarUtil.FESTIVAL = {}; 
        
        // 寫入台灣常見陽曆節日
        SolarUtil.FESTIVAL['0101'] = '元旦';
        SolarUtil.FESTIVAL['0228'] = '和平紀念日';
        SolarUtil.FESTIVAL['0404'] = '兒童節';
        SolarUtil.FESTIVAL['0501'] = '勞動節'; 
        SolarUtil.FESTIVAL['0928'] = '教師節'; 
        SolarUtil.FESTIVAL['1010'] = '國慶日';
        SolarUtil.FESTIVAL['1025'] = '台灣光復節'; 
        SolarUtil.FESTIVAL['1225'] = '行憲紀念日'; 
    }
});

// ==========================================
// ★ 易學專屬萬年曆 & 應期雙向同步引擎
// ==========================================
const JIAZHI_LIST = [
    "甲子","乙丑","丙寅","丁卯","戊辰","己巳","庚午","辛未","壬申","癸酉","甲戌","乙亥",
    "丙子","丁丑","戊寅","己卯","庚辰","辛巳","壬午","癸未","甲申","乙酉","丙戌","丁亥",
    "戊子","己丑","庚寅","辛卯","壬辰","癸巳","甲午","乙未","丙申","丁酉","戊戌","己亥",
    "庚子","辛丑","壬寅","癸卯","甲辰","乙巳","丙午","丁未","戊申","己酉","庚戌","辛亥",
    "壬子","癸丑","甲寅","乙卯","丙辰","丁巳","戊午","己未","庚申","辛酉","壬戌","癸亥"
];

const ZHI_TIME_MAP = {
    "子": "00:00", "丑": "02:00", "寅": "04:00", "卯": "06:00",
    "辰": "08:00", "巳": "10:00", "午": "12:00", "未": "14:00",
    "申": "16:00", "酉": "18:00", "戌": "20:00", "亥": "22:00"
};

window.CalState = {
    currentYear: new Date().getFullYear(),
    currentMonth: new Date().getMonth() + 1,
    selectedZhi: "",
    selectedYMD: "" 
};

// ==========================================
// ★ 1. 五行色彩核心運算引擎
// ==========================================
window.getGanZhiColor = function(gz) {
    if (!gz || gz.length < 2) return '#333333';
    const zhi = gz.charAt(1); // 依地支定色
    if (["寅", "卯"].includes(zhi)) return '#198754'; // 木 -> 綠
    if (["巳", "午"].includes(zhi)) return '#dc3545'; // 火 -> 紅
    if (["申", "酉"].includes(zhi)) return '#e6a23c'; // 金 -> 黃
    if (["亥", "子"].includes(zhi)) return '#0d6efd'; // 水 -> 藍
    if (["辰", "戌", "丑", "未"].includes(zhi)) return '#8B4513'; // 土 -> 褐
    return '#333333';
};

window.refreshYingqiColors = function() {
    ["yq-y-sel", "yq-m-sel", "yq-d-sel", "yq-h-sel"].forEach(id => {
        let sel = document.getElementById(id);
        if (sel && sel.value) {
            sel.style.color = window.getGanZhiColor(sel.value);
            sel.style.fontWeight = "bold";
        }
    });
};

// ==========================================
// ★ 2. 初始化與事件綁定
// ==========================================
window.initYingqiSelects = function() {
    let ySel = document.getElementById("yq-y-sel");
    let mSel = document.getElementById("yq-m-sel");
    let dSel = document.getElementById("yq-d-sel");
    let hSel = document.getElementById("yq-h-sel");
    if(!ySel) return;
    
    // 初始化時先給 option 條目上色
    let optsHtml = JIAZHI_LIST.map(gz => {
        return `<option value="${gz}" style="color: ${window.getGanZhiColor(gz)}; font-weight: bold;">${gz}</option>`;
    }).join("");
    
    ySel.innerHTML = optsHtml; 
    mSel.innerHTML = optsHtml; 
    dSel.innerHTML = optsHtml;
    if(hSel) hSel.innerHTML = optsHtml;

    // 綁定手動切換時的顏色連動
    [ySel, mSel, dSel, hSel].forEach(sel => {
        if(sel) sel.addEventListener('change', window.refreshYingqiColors);
    });
};

// ==========================================
// ★ 3. 應期抽屜控制器 (開抽屜時強制上色)
// ==========================================
window.toggleYingqiDrawer = function(show, fromBackBtn = false) {
    let overlay = document.getElementById('yingqi-drawer-overlay');
    let panel = document.getElementById('yingqi-drawer-panel');
    if (!overlay || !panel) return;

    if (show) {
        history.pushState({ panel: "yingqi" }, "");
        
        let dateInput = document.getElementById("yq-date-input");
        let timeInput = document.getElementById("yq-time-input");
        
        if (dateInput && !dateInput.value) {
            let now = new Date();
            dateInput.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
            if (timeInput) timeInput.value = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
            // 延遲觸發，讓引擎推算並上色
            setTimeout(() => window.syncYingqi('datetime'), 50);
        } else {
            // 如果已經有日期，直接強制刷新一次顏色確保無死角
            window.refreshYingqiColors();
        }

        overlay.style.display = 'block';
        void overlay.offsetWidth; 
        overlay.style.opacity = '1';
        panel.style.right = '0';
    } else {
        overlay.style.opacity = '0';
        panel.style.right = '-250px';
        setTimeout(() => { overlay.style.display = 'none'; }, 250);
        
        if (!fromBackBtn && history.state && history.state.panel === "yingqi") {
            history.back();
        }
    }
};

// ==========================================
// ★ 4. 終極雙向同步引擎 (內建上色機制)
// ==========================================
window.syncYingqi = function(source) {
    let dateInput = document.getElementById("yq-date-input");
    let timeInput = document.getElementById("yq-time-input");
    let ySel = document.getElementById("yq-y-sel");
    let mSel = document.getElementById("yq-m-sel");
    let dSel = document.getElementById("yq-d-sel");
    let hSel = document.getElementById("yq-h-sel");
    
    if (!dateInput || !dateInput.value) return;

    if (source === 'datetime') {
        let parts = dateInput.value.split('-');
        let timeStr = (timeInput && timeInput.value) ? timeInput.value : "12:00";
        let tParts = timeStr.split(':');
        
        let solarObj = Solar.fromYmdHms(parseInt(parts[0]), parseInt(parts[1]), parseInt(parts[2]), parseInt(tParts[0]), parseInt(tParts[1]), 0);
        let lunarObj = Lunar.fromSolar(solarObj);
        
        if(ySel) ySel.value = lunarObj.getYearInGanZhi();
        if(mSel) mSel.value = lunarObj.getMonthInGanZhiExact();
        if(dSel) dSel.value = lunarObj.getDayInGanZhi();
        if(hSel) hSel.value = lunarObj.getTimeInGanZhi();
    } 
    else if (source === 'ganzhi') {
        let targetDayGz = dSel.value;
        let targetHourZhi = hSel && hSel.value ? hSel.value.charAt(1) : ""; 
        
        let parts = dateInput.value.split('-');
        let currentSolar = Solar.fromYmd(parseInt(parts[0]), parseInt(parts[1]), parseInt(parts[2]));
        
        for (let i = 0; i < 60; i++) {
            let checkSolar = currentSolar.next(i);
            let checkLunar = Lunar.fromSolar(checkSolar);
            
            if (checkLunar.getDayInGanZhi() === targetDayGz) {
                let mStr = String(checkSolar.getMonth()).padStart(2, '0');
                let dStr = String(checkSolar.getDay()).padStart(2, '0');
                dateInput.value = `${checkSolar.getYear()}-${mStr}-${dStr}`;
                
                if (targetHourZhi && ZHI_TIME_MAP[targetHourZhi] && timeInput) {
                    timeInput.value = ZHI_TIME_MAP[targetHourZhi];
                }
                
                // 遞迴調用 datetime 校正，校正完會自己上色，所以這裡 return 中斷
                window.syncYingqi('datetime'); 
                return; 
            }
        }
    }
    
    // ★ 關鍵：不管怎麼推算，最後一律強制執行上色！
    window.refreshYingqiColors();
};

// ==========================================
// ★ 萬年曆面板開關 (升級版：動態 z-index 置頂防擋機制)
// ==========================================
window.toggleCalendarSheet = function(show, fromBackBtn = false) {
    let overlay = document.getElementById('calendar-sheet-overlay');
    let panel = document.getElementById('calendar-sheet-panel');
    if (!overlay || !panel) return;

    if (show) {
        // ★ 動態判斷：如果是從首頁點進來，隱藏帶入按鈕
        let applyBtn = document.getElementById("cal-btn-apply");
        if (applyBtn) {
            applyBtn.style.display = (window.location.hash === '#result') ? 'block' : 'none';
        }

        // ★ 關鍵修正：強制將萬年曆的圖層拉到最高 (2000 以上)
        // 確保它能直接覆蓋在 ☰ 抽屜 (1000) 與首頁所有元素之上！
        overlay.style.zIndex = "2000";
        panel.style.zIndex = "2001";

        history.pushState({ panel: "calendar" }, "");
        
        overlay.style.display = 'block';
        void overlay.offsetWidth; 
        overlay.style.opacity = '1';
        panel.style.bottom = '0';
        window.renderCalendarGrid();
    } else {
        overlay.style.opacity = '0';
        panel.style.bottom = '-100%';
        setTimeout(() => { overlay.style.display = 'none'; }, 300);
        
        if (!fromBackBtn && history.state && history.state.panel === "calendar") {
            history.back();
        }
    }
};

window.changeCalMonth = function(delta) {
    let m = window.CalState.currentMonth + delta;
    let y = window.CalState.currentYear;
    while (m > 12) { m -= 12; y += 1; }
    while (m < 1) { m += 12; y -= 1; }
    window.CalState.currentYear = y;
    window.CalState.currentMonth = m;
    window.renderCalendarGrid();
};

window.jumpToCurrentCal = function() {
    window.CalState.currentYear = new Date().getFullYear();
    window.CalState.currentMonth = new Date().getMonth() + 1;
    window.renderCalendarGrid();
};

window.jumpCalToRadar = function(type) {
    let targetZhi = "";
    if (type === 'year') targetZhi = document.getElementById("cal-radar-y").value;
    else if (type === 'month') targetZhi = document.getElementById("cal-radar-m").value;
    
    if (!targetZhi) return;

    let cy = window.CalState.currentYear;
    let cm = window.CalState.currentMonth;

    if (type === 'year') {
        for (let i = 0; i <= 12; i++) {
            let checkLunar = Lunar.fromSolar(Solar.fromYmd(cy + i, cm, 1));
            if (checkLunar.getYearInGanZhi().charAt(1) === targetZhi) {
                window.CalState.currentYear = cy + i;
                break;
            }
        }
    } else if (type === 'month') {
        for (let i = 0; i <= 12; i++) {
            let m = cm + i, y = cy;
            while (m > 12) { m -= 12; y++; }
            let checkLunar = Lunar.fromSolar(Solar.fromYmd(y, m, 1));
            if (checkLunar.getMonthInGanZhiExact().charAt(1) === targetZhi) {
                window.CalState.currentYear = y;
                window.CalState.currentMonth = m;
                break;
            }
        }
    }
    window.renderCalendarGrid();
    if (window.showToast) window.showToast(`已跳轉至 ${targetZhi} ${type === 'year' ? '年' : '月'}`, 1000);
};

window.renderCalendarGrid = function() {
    let grid = document.getElementById("calendar-days-grid");
    if (!grid) return;
    grid.innerHTML = ""; 

    let year = window.CalState.currentYear;
    let month = window.CalState.currentMonth;

    document.getElementById("cal-title-gregorian").innerText = `${year} 年 ${month} 月`;
    
    // ==========================================
    // ★ 新增：同步連動帶入按鈕左側的年、月地支下拉選單
    // ==========================================
    if (typeof Solar !== 'undefined' && typeof Lunar !== 'undefined') {
        // 取當月 15 日作為該月的代表干支，避免跨月交節氣的邊界誤差
        let repSolar = Solar.fromYmd(year, month, 15);
        let repLunar = Lunar.fromSolar(repSolar);
        
        let ySel = document.getElementById("cal-radar-y");
        let mSel = document.getElementById("cal-radar-m");
        
        // 只更新年、月。日的選單 (cal-radar-select) 刻意不作任何修改，自然維持使用者的選擇
        if (ySel) ySel.value = repLunar.getYearInGanZhi().charAt(1);
        if (mSel) mSel.value = repLunar.getMonthInGanZhiExact().charAt(1);
    }

    let firstDayIdx = new Date(year, month - 1, 1).getDay(); 
    let totalDays = new Date(year, month, 0).getDate();

    for (let i = 0; i < firstDayIdx; i++) {
        grid.appendChild(document.createElement("div"));
    }

    let todayStr = `${new Date().getFullYear()}-${String(new Date().getMonth()+1).padStart(2,'0')}-${String(new Date().getDate()).padStart(2,'0')}`;

    // ==========================================
    // ★ 台灣國定假日字典 (MMDD)
    // ==========================================
    // 國曆對應放假日期：加入 0501(勞動)、0928(教師)、1025(光復)、1225(行憲)
    const twNationalHolidaysSolar = ['0101', '0228', '0404', '0501', '0928', '1010', '1025', '1225'];
    // 農曆對應放假日期：(初一到初五)、端午、中秋
    const twNationalHolidaysLunar = ['0101', '0102', '0103', '0104', '0105', '0505', '0815']; 

    for (let day = 1; day <= totalDays; day++) {
        let cell = document.createElement("div");
        let solarObj = Solar.fromYmd(year, month, day);
        let lunarObj = Lunar.fromSolar(solarObj);
        
        let dayZhi = lunarObj.getDayInGanZhi().slice(1, 2); 
        let dayGanZhi = lunarObj.getDayInGanZhi();
        let lunarDayName = lunarObj.getDayInChinese(); 

        let currentIterStr = `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
        let isToday = (currentIterStr === todayStr);

        // ==========================================
        // ★ 節日與節氣判定邏輯
        // ==========================================
        // 若有繁簡轉換引擎則套用，否則直接取值
        let jieQi = typeof window.toTrad === 'function' ? window.toTrad(lunarObj.getJieQi()) : lunarObj.getJieQi();
        
        let sMMDD = String(solarObj.getMonth()).padStart(2, '0') + String(solarObj.getDay()).padStart(2, '0');
        let lMMDD = String(Math.abs(lunarObj.getMonth())).padStart(2, '0') + String(lunarObj.getDay()).padStart(2, '0');
        
        let isQingMing = (jieQi === '清明');
        let isChuXi = lunarObj.getFestivals().includes('除夕');

        // 判定是否為紅字國定假日 (清明與除夕是動態的，單獨拉出來判斷)
        let isNationalHoliday = 
            twNationalHolidaysSolar.includes(sMMDD) || 
            (twNationalHolidaysLunar.includes(lMMDD) && lunarObj.getMonth() > 0) || // 確保農曆不抓到閏月
            isQingMing || 
            isChuXi;

        // 取得要顯示的節日名稱
        let festName = "";
        if (sMMDD === '0101') festName = '元旦';
        else if (sMMDD === '0228') festName = '和平紀念';
        else if (sMMDD === '0404') festName = '兒童節';
        else if (sMMDD === '0501') festName = '勞動節'; // ★ 新增
        else if (sMMDD === '0928') festName = '教師節'; // ★ 新增
        else if (sMMDD === '1010') festName = '國慶日';
        else if (sMMDD === '1025') festName = '光復節'; // ★ 新增
        else if (sMMDD === '1225') festName = '行憲紀念'; // ★ 新增
        else if (isChuXi) festName = '除夕';
        else if (lMMDD === '0101') festName = '春節';
        else if (lMMDD === '0102') festName = '初二';
        else if (lMMDD === '0103') festName = '初三';
        else if (lMMDD === '0104') festName = '初四';
        else if (lMMDD === '0105') festName = '初五';
        else if (lMMDD === '0815') festName = '中秋節';
        else if (lMMDD === '0505') festName = '端午節';
        else if (lMMDD === '0815') festName = '中秋節';
        
        else {
            // 抓取非放假的傳統節日 (如：元宵、七夕等)
            let lFests = lunarObj.getFestivals();
            if (lFests.length > 0) festName = typeof window.toTrad === 'function' ? window.toTrad(lFests[0]) : lFests[0];
        }

        // ==========================================
        // ★ 決定最終標籤文字與顏色 (節氣優先但保留紅字)
        // ==========================================
        let displayTag = "";
        let tagColor = "#e67e22"; // 預設：橘色 (普通節氣或傳統節日)
        let tagBg = "#fdf5e6";

        // 1. 如果是國定假日，直接把基底顏色刷成紅色
        if (isNationalHoliday) {
            tagColor = "#dc3545"; // 紅字
            tagBg = "#fff5f5";
        }

        // 2. 決定文字：節氣絕對優先 > 節日
        if (jieQi) {
            displayTag = jieQi;
        } else if (festName) {
            displayTag = festName;
        }

        // 產生標籤 HTML (加入 nowrap 防破版)
        let jqHtml = displayTag ? `<span style="font-size:0.7rem; color:${tagColor}; font-weight:bold; margin-top:2px; background:${tagBg}; padding:0 2px; border-radius:2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:100%;">${displayTag}</span>` : "";

        // 順便讓放假的日期數字本身也變成紅色 (星期日與國定假日標紅、星期六標綠)
        let dayNumColor = (isNationalHoliday || solarObj.getWeek() === 0) ? "#dc3545" : (solarObj.getWeek() === 6 ? "#198754" : "#333");

        // --- 以下為原本的 CSS 與點擊事件邏輯 ---
        cell.className = "cal-day-cell";
        cell.setAttribute("data-zhi", dayZhi); 
        cell.setAttribute("data-is-today", isToday);
        
        cell.style.cssText = `
            background: #fff; border: 1px solid #eee; border-radius: 6px;
            padding: 4px 2px; display: flex; flex-direction: column;
            align-items: center; justify-content: space-between; min-height: 44px;
            box-shadow: 0 1px 2px rgba(0,0,0,0.02); position: relative; cursor: pointer;
            transition: all 0.2s;
        `;
        
        if (isToday) {
            cell.style.background = "#f4f8ff";
            cell.style.border = "2px solid #aecbfa";
        }
        
        if (window.CalState.selectedYMD === currentIterStr) {
            cell.style.border = "2px solid #0d6efd";
        }

        cell.innerHTML = `
            <span style="font-size: 1rem; font-weight: bold; color: ${dayNumColor};">${day}</span>
            <span style="font-size: 0.75rem; font-weight: bold; color: #555; margin: 2px 0;">${dayGanZhi}</span>
            <span style="font-size: 0.7rem; color: #aaa;">${lunarDayName}</span>
            ${jqHtml}
        `;

        cell.onclick = function(e) {
            e.stopPropagation(); 
            
            document.querySelectorAll(".cal-day-cell").forEach(c => {
                let isTodayCell = c.getAttribute("data-is-today") === "true";
                c.style.border = isTodayCell ? "2px solid #aecbfa" : "1px solid #eee";
            });
            
            cell.style.border = "2px solid #0d6efd";
            
            window.CalState.selectedYMD = currentIterStr;
            document.getElementById("cal-title-lunar").innerText = `【${lunarObj.getYearInGanZhi()}年 ${lunarObj.getMonthInGanZhiExact()}月 ${dayGanZhi}日】`;
        };

        grid.appendChild(cell);
    }
    
    // 渲染完網格後，依據「日」下拉選單的值重新補上黃底光暈
    window.highlightRadarDays();
};

window.highlightRadarDays = function() {
    let select = document.getElementById("cal-radar-select");
    if (!select) return;
    let targetZhi = select.value;
    window.CalState.selectedZhi = targetZhi;

    let cells = document.querySelectorAll(".cal-day-cell");
    cells.forEach(cell => {
        let zhi = cell.getAttribute("data-zhi");
        if (!targetZhi) {
            cell.style.opacity = "1";
            cell.style.transform = "scale(1)";
            if(cell.style.boxShadow.includes("255")) cell.style.boxShadow = "0 1px 2px rgba(0,0,0,0.02)";
            if (cell.style.border.includes("gold")) cell.style.border = "1px solid #eee";
        } else {
            if (zhi === targetZhi) {
                cell.style.opacity = "1";
                cell.style.transform = "scale(1.04)";
                cell.style.border = "2px solid #ffc107";
                cell.style.boxShadow = "0 0 8px rgba(255,193,7,0.5)";
                cell.style.background = "#fffdf0";
            } else {
                cell.style.opacity = "0.35";
                cell.style.transform = "scale(0.96)";
                cell.style.background = "#fff";
                if(cell.style.boxShadow.includes("255")) cell.style.boxShadow = "none";
                if (cell.style.border.includes("gold")) cell.style.border = "1px solid #eee";
            }
        }
    });
};

// ==========================================
// ★ 修正版：統一排查當前是否有任何開啟中的面板
// ==========================================
window.closeActivePanels = function() {
    let cal = document.getElementById('calendar-sheet-panel');
    let yq = document.getElementById('yingqi-drawer-panel');
    let rec = document.getElementById('records-drawer-panel');
    let closed = false;

    if (cal && (cal.style.bottom === '0px' || cal.style.bottom === '0')) {
        window.toggleCalendarSheet(false, true); 
        closed = true;
    }
    if (yq && (yq.style.right === '0px' || yq.style.right === '0')) {
        window.toggleYingqiDrawer(false, true);
        closed = true;
    }
    if (rec && (rec.style.right === '0px' || rec.style.right === '0')) {
        // ★ 智慧判斷當前所在頁面，決定收合時維持哪種模式
        let currentMode = 'home';
        if (window.location.hash === '#records') currentMode = 'records';
        else if (window.location.hash === '#result') currentMode = 'result';
        
        window.toggleRecordsDrawer(false, currentMode, true);
        closed = true;
    }
    
    return closed;
};

// ==========================================
// ★ 應期面板：西元日期快速微調與星期計算引擎
// ==========================================
window.updateYingqiDOW = function() {
    let dateInput = document.getElementById("yq-date-input");
    let dowSpan = document.getElementById("yq-dow-span");
    if (!dateInput || !dowSpan) return;
    
    if (!dateInput.value) {
        dowSpan.innerText = "";
        return;
    }
    
    // 取得日期並轉換為星期幾
    let d = new Date(dateInput.value);
    if (!isNaN(d.getTime())) {
        let days = ['日', '一', '二', '三', '四', '五', '六'];
        dowSpan.innerText = `(${days[d.getDay()]})`;
    }
};

window.adjustYingqiDate = function(type, offset) {
    let dateInput = document.getElementById("yq-date-input");
    if (!dateInput) return;

    if (!dateInput.value) {
        let today = new Date();
        dateInput.value = today.toISOString().split('T')[0];
    }
    
    let d = new Date(dateInput.value);
    if (isNaN(d.getTime())) return;

    if (type === 'month') {
        d.setMonth(d.getMonth() + offset);
    } else if (type === 'day') {
        d.setDate(d.getDate() + offset);
    }

    let y = d.getFullYear();
    let m = String(d.getMonth() + 1).padStart(2, '0');
    let day = String(d.getDate()).padStart(2, '0');
    
    dateInput.value = `${y}-${m}-${day}`;
    
    // ★ 更新日期後，同步刷新星期顯示
    window.updateYingqiDOW();

    if (typeof window.syncYingqi === 'function') {
        window.syncYingqi('datetime');
    }
};

// ==========================================
// ★ 應期面板：快捷起卦與今日按鈕
// ==========================================
window.setYingqiToCastDate = function() {
    if (!window.AppState || !window.AppState.curData || !window.AppState.curData.dateStr) {
        if(window.showToast) window.showToast("找不到此卦的起卦時間！");
        return;
    }
    
    // dateStr 格式通常為 "2026/07/10 12:49"
    let d = new Date(window.AppState.curData.dateStr);
    if (isNaN(d.getTime())) return;
    
    let y = d.getFullYear();
    let m = String(d.getMonth() + 1).padStart(2, '0');
    let day = String(d.getDate()).padStart(2, '0');
    let h = String(d.getHours()).padStart(2, '0');
    let min = String(d.getMinutes()).padStart(2, '0');
    
    document.getElementById("yq-date-input").value = `${y}-${m}-${day}`;
    document.getElementById("yq-time-input").value = `${h}:${min}`;
    
    // 觸發星期的計算與下方干支的同步
    if(typeof window.updateYingqiDOW === 'function') window.updateYingqiDOW();
    if(typeof window.syncYingqi === 'function') window.syncYingqi('datetime');
};

window.setYingqiToToday = function() {
    let d = new Date();
    let y = d.getFullYear();
    let m = String(d.getMonth() + 1).padStart(2, '0');
    let day = String(d.getDate()).padStart(2, '0');
    let h = String(d.getHours()).padStart(2, '0');
    let min = String(d.getMinutes()).padStart(2, '0');
    
    document.getElementById("yq-date-input").value = `${y}-${m}-${day}`;
    document.getElementById("yq-time-input").value = `${h}:${min}`;
    
    // 觸發星期的計算與下方干支的同步
    if(typeof window.updateYingqiDOW === 'function') window.updateYingqiDOW();
    if(typeof window.syncYingqi === 'function') window.syncYingqi('datetime');
};

// ==========================================
// ★ 核心修復：在抽屜打開時強制觸發星期計算
// ==========================================
// 攔截原有的 toggleYingqiDrawer，確保每次展開抽屜時，就算系統自填了預設日期，也能準確顯示星期
const _originalToggleYingqiDrawer = window.toggleYingqiDrawer;
window.toggleYingqiDrawer = function(show, skipHistory) {
    if (_originalToggleYingqiDrawer) {
        _originalToggleYingqiDrawer(show, skipHistory);
    }
    if (show && typeof window.updateYingqiDOW === 'function') {
        setTimeout(() => {
            window.updateYingqiDOW();
        }, 50); // 延遲一點點，確保 DOM 的 value 已經被系統寫入
    }
};

// ==========================================
// ★ 核心應期主控區 (HUD) 智能連鎖驅動引擎
// ==========================================
window.currentCoreHUDDate = null; // 全域儲存當前主控區的精確西元時間物件

// 1. 初始化核心區的下拉選單 (與原本的應期抽屜共用常數字典)
window.initCoreHUDSelects = function() {
    let hSel = document.getElementById("hud-h-sel");
    let dSel = document.getElementById("hud-d-sel");
    let mSel = document.getElementById("hud-m-sel");
    let ySel = document.getElementById("hud-y-sel");
    if (!hSel || !dSel || !mSel || !ySel) return;

    hSel.innerHTML = ""; dSel.innerHTML = ""; mSel.innerHTML = ""; ySel.innerHTML = "";
    JIAZHI_LIST.forEach(gz => {
        let opt = `<option value="${gz}">${gz}</option>`;
        ySel.innerHTML += opt; mSel.innerHTML += opt; dSel.innerHTML += opt;
    });
    // 時辰固定為十二地支
    ["子","丑","寅","卯","辰","巳","午","未","申","酉","戌","亥"].forEach(z => {
        hSel.innerHTML += `<option value="${z}">${z}時</option>`;
    });
};

// 2. 將精確的西元時間渲染到核心主控區上 (同步更新星期)
window.renderDateToCoreHUD = function(dateObj) {
    if (!dateObj || isNaN(dateObj.getTime())) return;
    window.currentCoreHUDDate = new Date(dateObj); // 儲存副本

    let hSel = document.getElementById("hud-h-sel");
    let dSel = document.getElementById("hud-d-sel");
    let mSel = document.getElementById("hud-m-sel");
    let ySel = document.getElementById("hud-y-sel");
    let dateBtn = document.getElementById("hud-date-btn");
    let hudDiv = document.getElementById("core-yingqi-hud");

    if (hudDiv) hudDiv.style.display = "flex"; // 強制顯示核心區

    // 利用內建萬年曆核心算出精確八字干支
    let lunar = Lunar.fromDate(window.currentCoreHUDDate);
    let solar = Solar.fromDate(window.currentCoreHUDDate);
    let eightChar = lunar.getEightChar();

    // 寫入下拉選單
    if (ySel) ySel.value = eightChar.getYear();
    if (mSel) mSel.value = eightChar.getMonth();
    if (dSel) dSel.value = eightChar.getDay();
    if (hSel) hSel.value = eightChar.getTime().slice(1, 2); // 取地支，如"子"

    // 格式化西元日期字串與星期
    let days = ['日', '一', '二', '三', '四', '五', '六'];
    let dowStr = `(${days[window.currentCoreHUDDate.getDay()]})`;
    // (在 window.renderDateToCoreHUD 函式裡面找到這段)
    if (dateBtn) {
        dateBtn.innerText = `${solar.getYear()}/${solar.getMonth()}/${solar.getDay()} ${String(window.currentCoreHUDDate.getHours()).padStart(2,'0')}:${String(window.currentCoreHUDDate.getMinutes()).padStart(2,'0')} ${dowStr}`;
        dateBtn.style.color = "#0d6efd"; // ★ 補上這行：恢復正常的藍色
    }
};

// ==========================================
// ★ 萬年曆與應期核心連動小精靈
// ==========================================
window.syncCalStateWithDate = function(dateObj) {
    if (!dateObj || isNaN(dateObj.getTime())) return;
    if (window.CalState) {
        let y = dateObj.getFullYear();
        let m = String(dateObj.getMonth() + 1).padStart(2, '0');
        let day = String(dateObj.getDate()).padStart(2, '0');
        window.CalState.selectedYMD = `${y}-${m}-${day}`;
        window.CalState.currentYear = y;
        window.CalState.currentMonth = dateObj.getMonth() + 1;
    }
};

// ==========================================
// ★ 應期與萬年曆狀態快照 (供紀錄儲存與還原使用)
// ==========================================
window.getSettingsYingqiSnapshot = function() {
    let innerHud = document.getElementById('core-yingqi-hud-inner');
    let isOpen = innerHud && innerHud.style.display !== 'none';
    return {
        date: document.getElementById("yq-date-input")?.value || "",
        time: document.getElementById("yq-time-input")?.value || "",
        y: document.getElementById("yq-y-sel")?.value || "",
        m: document.getElementById("yq-m-sel")?.value || "",
        d: document.getElementById("yq-d-sel")?.value || "",
        h: document.getElementById("yq-h-sel")?.value || "",
        calYMD: window.CalState ? window.CalState.selectedYMD : "",
        calZhi: window.CalState ? window.CalState.selectedZhi : "",
        isOpen: isOpen,
        isApplied: window.isYingqiApplied || false // ★ 記住使用者是否有「帶入」過應期
    };
};

window.restoreYingqiSnapshot = function(snap) {
    if (!snap) {
        // 新盤或沒有紀錄：清空欄位與狀態
        window.isYingqiApplied = false;
        ["yq-date-input", "yq-time-input", "yq-y-sel", "yq-m-sel", "yq-d-sel", "yq-h-sel"].forEach(id => {
            let el = document.getElementById(id); if (el) el.value = "";
        });
        if (window.CalState) {
            window.CalState.selectedYMD = ""; window.CalState.selectedZhi = "";
        }
        if (typeof window.refreshYingqiColors === 'function') window.refreshYingqiColors();
        if (typeof window.updateYingqiDOW === 'function') window.updateYingqiDOW();
        return;
    }
    
    // 讀取該筆紀錄的狀態
    window.isYingqiApplied = snap.isApplied || false;

    let setVal = (id, val) => { let el = document.getElementById(id); if (el && val !== undefined) el.value = val; };
    setVal("yq-date-input", snap.date);
    setVal("yq-time-input", snap.time);
    setVal("yq-y-sel", snap.y);
    setVal("yq-m-sel", snap.m);
    setVal("yq-d-sel", snap.d);
    setVal("yq-h-sel", snap.h);
    
    if (window.CalState) {
        window.CalState.selectedYMD = snap.calYMD || "";
        window.CalState.selectedZhi = snap.calZhi || "";
        
        // ★ 自動將萬年曆的首頁跳轉到儲存的應期月份與日期
        if (snap.calYMD) {
            let parts = snap.calYMD.split('-');
            if (parts.length >= 2) {
                window.CalState.currentYear = parseInt(parts[0]);
                window.CalState.currentMonth = parseInt(parts[1]);
            }
        }
    }
    if (typeof window.refreshYingqiColors === 'function') window.refreshYingqiColors();
    if (typeof window.updateYingqiDOW === 'function') window.updateYingqiDOW();
};

// ==========================================
// ★ 核心應期主控區 (HUD) 智能連鎖驅動引擎
// ==========================================
window.adjustCoreHour = function(offset) {
    if (!window.currentCoreHUDDate) window.currentCoreHUDDate = new Date(); 
    window.currentCoreHUDDate.setHours(window.currentCoreHUDDate.getHours() + (offset * 2));
    window.renderDateToCoreHUD(window.currentCoreHUDDate);
    
    // ★ 標記並連動萬年曆與抽屜
    window.isYingqiApplied = true;
    window.syncCalStateWithDate(window.currentCoreHUDDate);
    window.syncCoreDateToDrawer(window.currentCoreHUDDate);
};

// ==========================================
// ★ 同步核心時間至應期抽屜 Helper
// ==========================================
window.syncCoreDateToDrawer = function(dateObj) {
    let yqDateInput = document.getElementById("yq-date-input");
    let yqTimeInput = document.getElementById("yq-time-input");
    if (yqDateInput) yqDateInput.value = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
    if (yqTimeInput) yqTimeInput.value = `${String(dateObj.getHours()).padStart(2, '0')}:${String(dateObj.getMinutes()).padStart(2, '0')}`;
    if (typeof window.updateYingqiDOW === 'function') window.updateYingqiDOW();
    if (typeof window.syncYingqi === 'function') window.syncYingqi('datetime');
};

window.syncCoreHUDToGanzhi = function() {
    if (!window.currentCoreHUDDate) window.currentCoreHUDDate = new Date();
    let selH = document.getElementById("hud-h-sel").value;
    let selD = document.getElementById("hud-d-sel").value;
    let selM = document.getElementById("hud-m-sel").value;
    let selY = document.getElementById("hud-y-sel").value;
    let lunar = Lunar.fromDate(window.currentCoreHUDDate);
    let eightChar = lunar.getEightChar();
    let curH = eightChar.getTime().substring(1, 2);
    let curD = eightChar.getDay();
    let curM = eightChar.getMonth();
    let curY = eightChar.getYear();
    let date = new Date(window.currentCoreHUDDate.getTime());
    const getDiff = (cur, tgt, arr) => {
        let cIdx = arr.indexOf(cur), tIdx = arr.indexOf(tgt);
        if (cIdx === -1 || tIdx === -1) return 0;
        let diff = tIdx - cIdx, half = arr.length / 2;
        if (diff > half) diff -= arr.length;
        if (diff < -half) diff += arr.length;
        return diff;
    };
    let JIAZHI = window.JIAZHI_LIST || [];
    if (JIAZHI.length === 0) { 
        let gan = ["甲","乙","丙","丁","戊","己","庚","辛","壬","癸"];
        let zhi = ["子","丑","寅","卯","辰","巳","午","未","申","酉","戌","亥"];
        for(let i=0; i<60; i++) JIAZHI.push(gan[i%10] + zhi[i%12]);
    }
    let ZHI = ["子","丑","寅","卯","辰","巳","午","未","申","酉","戌","亥"];

    if (selY !== curY) date.setFullYear(date.getFullYear() + getDiff(curY, selY, JIAZHI));
    if (selM !== curM) {
        date.setMonth(date.getMonth() + getDiff(curM, selM, JIAZHI));
        let safe = 0;
        while(Lunar.fromDate(date).getEightChar().getMonth() !== selM && safe < 35) {
            let testM = Lunar.fromDate(date).getEightChar().getMonth();
            let tempDiff = getDiff(testM, selM, JIAZHI);
            if (tempDiff === 0) break;
            date.setDate(date.getDate() + (tempDiff > 0 ? 1 : -1));
            safe++;
        }
    }
    if (selD !== curD) date.setDate(date.getDate() + getDiff(curD, selD, JIAZHI));
    if (selH !== curH) date.setHours(date.getHours() + (getDiff(curH, selH, ZHI) * 2));

    window.renderDateToCoreHUD(date);
    
    // ★ 標記並連動萬年曆與抽屜
    window.isYingqiApplied = true;
    window.syncCalStateWithDate(date);
    window.syncCoreDateToDrawer(date);
};

// ==========================================
// ★ 帶入農民曆 / 帶入尋找應期 (更新連動)
// ==========================================
window.applyCalendarToYingqi = function () {
    if (!window.CalState || !window.CalState.selectedYMD) {
        if (window.showToast) window.showToast("⚠️ 請先在萬年曆上點選一個日期！");
        return;
    }
    let parts = window.CalState.selectedYMD.split('-');
    let targetDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]), 
        window.currentCoreHUDDate ? window.currentCoreHUDDate.getHours() : new Date().getHours(), 
        window.currentCoreHUDDate ? window.currentCoreHUDDate.getMinutes() : new Date().getMinutes());

    if (typeof window.renderDateToCoreHUD === 'function') window.renderDateToCoreHUD(targetDate);
    
    let yqDateInput = document.getElementById("yq-date-input");
    let yqTimeInput = document.getElementById("yq-time-input");
    if (yqDateInput) yqDateInput.value = `${parseInt(parts[0])}-${String(parseInt(parts[1])).padStart(2, '0')}-${String(parseInt(parts[2])).padStart(2, '0')}`;
    if (yqTimeInput) yqTimeInput.value = `${String(targetDate.getHours()).padStart(2, '0')}:${String(targetDate.getMinutes()).padStart(2, '0')}`;
    
    if (typeof window.updateYingqiDOW === 'function') window.updateYingqiDOW();
    if (typeof window.syncYingqi === 'function') window.syncYingqi('datetime');
    if (typeof window.toggleCalendarSheet === 'function') window.toggleCalendarSheet(false);
    
    // ★ 標記並連動萬年曆、自動展開面板
    window.isYingqiApplied = true;
    window.syncCalStateWithDate(targetDate);
    if (typeof window.toggleCoreYingqiHud === 'function') window.toggleCoreYingqiHud(true);
    if (window.showToast) window.showToast("📅 日期已同步至主控區！", 1500);
};

window.selectCalendarDate = function (ymdStr) {
    if (!ymdStr) return;
    let parts = ymdStr.split('-'); 
    let targetDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]), 
        window.currentCoreHUDDate ? window.currentCoreHUDDate.getHours() : new Date().getHours(), 
        window.currentCoreHUDDate ? window.currentCoreHUDDate.getMinutes() : new Date().getMinutes());

    if (typeof window.renderDateToCoreHUD === 'function') window.renderDateToCoreHUD(targetDate);
    
    let yqDateInput = document.getElementById("yq-date-input");
    let yqTimeInput = document.getElementById("yq-time-input");
    if (yqDateInput) yqDateInput.value = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}-${String(targetDate.getDate()).padStart(2, '0')}`;
    if (yqTimeInput) yqTimeInput.value = `${String(targetDate.getHours()).padStart(2, '0')}:${String(targetDate.getMinutes()).padStart(2, '0')}`;
    
    if (typeof window.updateYingqiDOW === 'function') window.updateYingqiDOW();
    if (typeof window.syncYingqi === 'function') window.syncYingqi('datetime');
    if (typeof window.toggleCalendarSheet === 'function') window.toggleCalendarSheet(false);
    
    // ★ 標記並連動萬年曆、自動展開面板
    window.isYingqiApplied = true;
    window.syncCalStateWithDate(targetDate);
    if (typeof window.toggleCoreYingqiHud === 'function') window.toggleCoreYingqiHud(true);
    if (window.showToast) window.showToast("📅 日期已同步至主控區與底層應期面板！", 1500);
};

window.bringYingqiToCoreHUD = function() {
    let yqDate = document.getElementById("yq-date-input")?.value; 
    let yqTime = document.getElementById("yq-time-input")?.value || "12:00"; 
    if (!yqDate) {
        if (window.showToast) window.showToast("⚠️ 請先在應期抽屜中選擇有效的西元日期！");
        return;
    }
    let dParts = yqDate.split('-');
    let tParts = yqTime.split(':');
    let targetDate = new Date(parseInt(dParts[0]), parseInt(dParts[1]) - 1, parseInt(dParts[2]), parseInt(tParts[0] || 0), parseInt(tParts[1] || 0));

    window.renderDateToCoreHUD(targetDate);
    window.toggleYingqiDrawer(false);
    
    // ★ 標記並連動萬年曆、自動展開面板
    window.isYingqiApplied = true;
    window.syncCalStateWithDate(targetDate);
    if (typeof window.toggleCoreYingqiHud === 'function') window.toggleCoreYingqiHud(true);
    if (window.showToast) window.showToast("📥 應期已完美同步至中央主控區！");
};