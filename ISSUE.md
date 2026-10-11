# ISSUE 追蹤

本檔案追蹤 BufferLab 已知但尚未修復的問題。**具體改法、驗證指令與逐項驗收清單見 [docs/work-order-2026-08-04.md](docs/work-order-2026-08-04.md)**；本檔案只記錄「問題是什麼、怎麼重現、修好的標準」，不重複處理書的實作細節。

編號與處理書一致，方便交叉對照。

| ID | 標題 | 嚴重度 | 狀態 |
| --- | --- | --- | --- |
| A1 | 液體試劑體積超過最終體積時不報錯 | P1 | 已完成 |
| A2 | Tris 配方的 key 與 id 不一致，「複製」按鈕失效 | P1 | 已完成 |
| A3 | 部分化合物未顯示化學式 | P1 | 已完成 |
| E4 | 缺少獨立的 KH₂PO₄／Na₂HPO₄ phosphate buffer | P2 | 已完成 |

> A1／A2 由 2026-08-04 的程式碼審查發現，重現數據皆在 headless Edge（Edge 151）實測確認。A3／E4 為使用者原先回報的問題，內容保留，並補上審查後定位到的確切位置。

---

## A1 — 液體試劑體積超過最終體積時不報錯

**嚴重度**：P1（會輸出物理上不可能配製的配方）
**影響檔案**：`src/js/engines/validation.js`（`validateResult`）

### 問題描述

`validateResult` 只檢查 `component.stockVolumeL`，但標準配方的液體組成（冰醋酸、0.5 M EDTA 庫存液）走的是另一條路徑：`StandardRecipeEngine` 對 `kind: "fixedVolume"` 產生的是 `{ kind: "volume", volumeL }`，**沒有 `stockVolumeL` 欄位**。

結果是這些體積從來沒有被任何驗證碰過。單項檢查與總和檢查都漏掉它們。

`#strength-input` 是自由數字輸入，HTML 沒有把它限制在配方的 `strengthOptions` 內，所以使用者真的走得到這條路徑。

### 重現方式（已實測）

計算 1 L 的 500× TAE：

```
液體試劑合計 = 1.571 L
  冰醋酸        571 mL
  0.5 M EDTA   1000 mL
目標最終體積 = 1 L

Validation.hasErrors(...) -> false
```

介面照常輸出完整配方表格與 SOP，沒有任何警告。

### 驗收條件

- 1 L 500× TAE 產生 `error` 等級訊息，介面不輸出配方表格。
- 1 L 1× TAE、1 L 0.5× TBE 等正常配方不產生任何新的 error 或 warning。
- 錯誤訊息的文案適用於純液體試劑（冰醋酸不是「庫存液」）。
- 有對應的迴歸測試，且包含「正常配方不誤判」的對照組。

---

## A2 — Tris 配方的 key 與 id 不一致，「複製」按鈕失效

**嚴重度**：P1（功能靜默失效，無錯誤訊息）
**影響檔案**：`src/js/data/buffers.js`、`src/js/services/library.js`、`src/js/ui/library-manager.js`、`src/js/ui/controller.js`

### 問題描述

`app.Buffers` 裡 Tris 的 key 是 `tris`，但物件的 `id` 是 `tris-buffer`。這是十個內建配方中**唯一**一個 key ≠ id 的。

`Library.allBuffers()` 用 **key** 建索引，但 `library-manager.js` 的 `renderRecipes()` 用 **id** 產生 `data-recipe-copy` 屬性，點擊處理器再拿這個 id 回頭查 `Library.getBuffer()` — 查不到。

### 重現方式（已實測）

```
Library.getBuffer("tris")           -> 找得到
Library.getBuffer("tris-buffer")    -> null
DOM 實際屬性                          -> data-recipe-copy="tris-buffer"
```

操作重現：開啟「自訂資料庫」→ 找到內建的「Tris / Tris-HCl buffer」→ 按「複製」→ **完全沒有反應，也沒有任何錯誤訊息**。其餘九個內建配方的複製功能都正常。

### 連帶風險

既有使用者 localStorage 的「最近計算」紀錄中，Tris 那幾筆存的是 `state.bufferKey: "tris"`。`Controller.restoreState()` 查不到 buffer 時是**靜默 return**，所以修正 key 時若不做舊值相容，老使用者按 Tris 紀錄的「載入」會從「可用」變成「無反應」。

### 驗收條件

- 對內建 Tris 配方按「複製」會把配方表單填入「Tris / Tris-HCl buffer 副本」，且 `custom-recipe-id` 為空（代表另存新配方，不會覆寫內建資料）。
- 「載入範例 → 1 L 50 mM Tris」仍正常運作。
- localStorage 中既有 `bufferKey: "tris"` 的舊紀錄按「載入」仍能還原。
- 新增不變式測試：走訪 `app.Buffers`，斷言每一筆的 key 都等於它的 `id`，避免同類問題再次發生。

---

## A3 — 部分化合物未顯示化學式

**嚴重度**：P1（增加誤用試劑的風險）
**影響檔案**：`src/js/ui/controller.js`（`renderStandardReagents`）、`src/js/ui/records.js`（`renderComponents`、`updatePrintSummary`）

### 問題描述（使用者原始回報）

實際使用 BufferLab 時，部分化合物在試劑選單、配方欄位或結果顯示中沒有呈現化學式，導致使用者難以確認實際使用的化合物、鹽類或水合物型態，也增加誤用試劑的風險。

磷酸鹽試劑在部分畫面已有顯示化學式，例如 `KH₂PO₄`、`Na₂HPO₄` 及其水合物；但應全面檢查所有內建試劑與所有顯示路徑，避免只有部分項目具備化學式。

### 審查後定位到的確切位置（已實測）

問題不是全面性缺漏，而是三個具體位置：

**位置 1 — 水合物切換下拉選單**（`controller.js` 的 `renderStandardReagents`）

```
實際輸出：磷酸氫二鈉（無水）｜141.958 g/mol
```

同一個函式的另一個分支（無水合物選項時的唯讀 `<input>`）**有**化學式，`fillSelect()`（動態模式的酸／鹼型試劑選單）也**有**。只有這個 `<select>` 漏掉。

**位置 2 — 配製紀錄的「試劑實際使用」欄位**（`records.js` 的 `renderComponents`）

每一列只顯示 `reagent.zhName`。使用者在填實際秤量時，看不到自己選的是哪一種水合物。

**位置 3 — 列印／PDF 的紀錄表格**（`records.js` 的 `updatePrintSummary`）

「試劑」欄只有 `reagent.zhName`。這是本問題中最需要優先修的一處 — 列印出來的紙本是離開系統之後唯一的憑據。

**附帶問題**：位置 1 的 `<option value="${id}">` 與試劑的 `formula` 都沒有經過 `Formatter.escapeHtml`（只有 `zhName` 有）。專案其他所有插入 HTML 的位置都做了跳脫，這裡是一致性缺口。

### 相關試劑確認

- `edta_stock_05m` 的 `formula` 目前是 `"EDTA stock"`，介於「化學式」與「說明」之間，兩邊都不像（處理為 E3，見處理書）。
- `acetic_acid_glacial` 有真實化學式 `CH₃COOH`，無須調整。

### 驗收條件（使用者原始條件，保留）

- 使用者在任何可選試劑清單中，都能看到化學式或明確的無單一化學式說明。
- 配方結果與列印內容會保留所選試劑的完整化學式及水合物資訊。
- 對水合物明確顯示完整化學式，例如 `Na₂HPO₄·2H₂O`，不可只顯示無水鹽名稱。
- 對庫存液或混合物等沒有單一化學式的項目，顯示清楚的組成或「無單一化學式」說明，不要留白。
- `NaH₂PO₄`、`Na₂HPO₄`、`KH₂PO₄` 與各種水合物的顯示內容和摩爾質量一致。
- 補上測試，確認所有可選試劑在使用者介面至少有化學式或合理的替代說明。

---

## E4 — 缺少獨立的 KH₂PO₄／Na₂HPO₄ phosphate buffer

**嚴重度**：P2（功能缺口）
**影響檔案**：`src/js/data/buffers.js`、`src/js/engines/dynamic-buffer.js`

### 問題描述（使用者原始回報）

專案目前只有以下兩種相關情況：

- PBS：`NaCl + KCl + Na₂HPO₄ + KH₂PO₄`
- phosphate buffer：`NaH₂PO₄/Na₂HPO₄` 成對試劑，不含 `NaCl` 或 `KCl`

需要新增一個獨立的 buffer 選項，例如「Phosphate buffer（KH₂PO₄ / Na₂HPO₄）」，固定使用：

- 酸性成分：`KH₂PO₄`（磷酸二氫鉀）
- 鹼性成分：`Na₂HPO₄`（磷酸氫二鈉）

此配方不應加入 `NaCl` 或 `KCl`，也不應直接修改 PBS，避免使用者把 PBS 與單純磷酸鹽緩衝液混淆。配方仍應支援體積、總濃度、目標 pH、純度及水合物型態的計算。

### 審查補充：一個容易漏掉的連帶項

`src/js/engines/dynamic-buffer.js` 中，多質子近似警告 `POLYPROTIC_APPROXIMATION` 目前是**硬寫死 `buffer.id === "phosphate"`** 才推送。新配方套用完全相同的單一步驟近似，若不處理就拿不到這則警告 — 這是科學誠信問題，不是小瑕疵。

修正時不應只是把條件擴充成 `id === "phosphate" || id === "phosphate-kh2po4"`，而應改成資料驅動（在配方的 `dynamic` 物件加旗標），否則未來新增第三個磷酸鹽配方時還會再漏一次。

### 驗收條件

- 選單中可明確區分 PBS、`NaH₂PO₄/Na₂HPO₄` phosphate buffer，以及 `KH₂PO₄/Na₂HPO₄` phosphate buffer。
- `KH₂PO₄/Na₂HPO₄` 配方結果不包含 `NaCl` 或 `KCl`。
- 新配方支援體積、總濃度、目標 pH、純度與 Na₂HPO₄ 的水合物型態切換。
- 新配方與既有 `phosphate` 配方**都**會產生 `POLYPROTIC_APPROXIMATION` 警告。
- 依 AGENTS.md 的規則同步更新 `DATA_VERSION`、`docs/data-sources.md` 與數值測試。

---

## 關閉條件

A3 與 E4 **兩者都完成**之後，使用者原始回報的「化學式」問題才算完整解決。請在完成時於本檔案標註完成日期與對應 commit，不要直接刪除條目。

完成註記（2026-08-04）：A1、A2、A3 與 E4 均已完成並由 38 項內建測試驗證；本次工作樹尚未建立 commit。
