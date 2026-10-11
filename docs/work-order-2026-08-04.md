# BufferLab 處理書 — 2026-08-04

**執行者**：Codex／AI coding agent
**前置閱讀**：[AGENTS.md](../AGENTS.md)（必讀，本文件不重複其內容）、[ISSUE.md](../ISSUE.md)、[docs/data-sources.md](data-sources.md)

本文件是一次程式碼審查的產出。所有標記「已實測」的問題，都是在 headless Edge（Edge 151）裡實際跑出來確認的，不是讀碼推測。基準狀態：`dist/index.html` 與 `src/` 同步，28 項測試全數通過。

---

## 0. 執行前必讀

### 0.1 不可違反的規則

1. **不要手動編輯 `dist/index.html`。** 改 `src/`，然後跑建置腳本重新產生。
2. **每一批改動結束都要重新建置，並把 `dist/index.html` 一起 commit。** 只改 `src/` 而沒有重建，等於使用者拿到的檔案沒有變。
3. **不要新增任何外部依賴。** 沒有 npm、沒有 CDN、沒有 `fetch`／`XMLHttpRequest`／`WebSocket`／`eval`／外部 `<script src>`／外部 `<link rel=stylesheet>`／`@import`。
4. **所有 UI 文字、錯誤訊息、註解使用繁體中文（台灣用語）。** 程式碼識別字用英文。
5. **不要更動 `Constants.STORAGE_KEYS` 的任何字串。** 改了會讓既有使用者的自訂試劑、自訂配方與配製紀錄全部消失。

### 0.2 明確不在本次範圍內

以下即使你覺得可以順手改，也**不要動**：

- 內建 vs 自訂的信任模型（`builtIn` / `status: "verified"` / `"user-unverified"` / `Object.freeze`）不可弱化。
- 不可新增「輸出 HCl／NaOH 精確滴定體積」的功能。
- 不可新增自動溶解度上限。
- 不可新增「配製結果合格與否」的判定。
- 不要重構分層架構、不要引入模組系統、不要改成 ES module。
- 不要改 `.gitignore`、不要新增 CI 設定檔。

### 0.3 驗證指令

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\build.ps1
```

建置成功 == 全部測試通過（腳本會用 headless Edge 跑內建測試，沒過就不會寫出 `dist/index.html`）。**不需要另外找測試指令。**

需要在瀏覽器裡手動檢查 UI 時：開 `dist/index.html?dev=1`。

### 0.4 建議的 commit 分批

| Commit | 內容 | 說明 |
| --- | --- | --- |
| 1 | A 批（A1–A3） | 正確性缺陷，優先度最高 |
| 2 | D 批（測試補強） | 補上能抓到 A 批問題的迴歸測試 |
| 3 | B 批（B1–B5） | 使用者可見的行為缺陷 |
| 4 | C 批（建置腳本） | 與應用程式碼無關，可獨立驗證 |
| 5 | E 批（資料與新功能） | 需要更新 `DATA_VERSION` 與來源台帳 |
| 6 | F 批（可選） | 體質整理，時間不夠可略過 |

每個 commit 都必須包含重新建置後的 `dist/index.html`。

### 0.5 動到科學資料時的連帶義務

只要改動了 **分子量、pKa、配方組成、水合型態、新增／移除試劑或緩衝液**，必須同步做完這四件事，缺一不可：

1. 更新 `src/js/core/constants.js` 的 `DATA_VERSION`（格式 `YYYY-MM-DD`，用實際改動日期）。
2. 更新 `docs/data-sources.md` 的對應表格列，以及第 3 行的「資料審查日期」。
3. 在 `src/js/tests/test-runner.js` 加上或更新對應的數值測試。
4. **注意 `verifiedOn` 的陷阱**：`src/js/data/reagents.js` 頂端用一個共用的 `const verifiedOn = "2026-07-31"` 套用到**所有**試劑。新增一個試劑時，**不要**去改這個共用常數（那會把所有既有試劑的查證日期一起改掉，是不實的紀錄）。請在新增的那一筆裡明確帶入自己的 `verifiedOn: "YYYY-MM-DD"`。

---

## 1. 任務總覽

| ID | 優先度 | 標題 | 狀態 |
| --- | --- | --- | --- |
| A1 | P1 | `validateResult` 忽略液體組成的體積，超量不報錯 | 待處理 |
| A2 | P1 | Tris 配方的 key 與 id 不一致，導致「複製」按鈕失效 | 待處理 |
| A3 | P1 | 化學式在三個顯示路徑缺漏（對應 ISSUE.md） | 待處理 |
| B1 | P2 | 非 Tris 的動態緩衝液，溫度輸入被無聲忽略 | 待處理 |
| B2 | P2 | localStorage 寫入失敗被靜默吞掉；`lastError` 不會清除 | 待處理 |
| B3 | P2 | history 的 `entry.id` 未經跳脫就插入 HTML 屬性 | 待處理 |
| B4 | P2 | 平滑捲動沒有尊重 `prefers-reduced-motion` | 待處理 |
| B5 | P2 | 首次開啟一律淺色，不看系統主題偏好 | 待處理 |
| C1 | P2 | `build.ps1`：stderr 重導地雷、Edge 路徑不全、多餘的安全旗標 | 待處理 |
| C2 | P3 | `Assert-SafeSource` 黑名單有洞 | 待處理 |
| C3 | P3 | 建置腳本缺少「檢查 dist 是否過期」模式 | 待處理 |
| D1 | P2 | 補測試：`fixedMass` / `fixedVolume` 縮放（TAE／TBE 完全沒測過） | 待處理 |
| D2 | P2 | 補測試：水合物切換（`reagentOverrides`）路徑 | 待處理 |
| D3 | P2 | 補測試：液體體積總和超量（A1 的迴歸測試） | 待處理 |
| D4 | P3 | 補測試：`Formatter` 單位切換邊界、資料不變式 | 待處理 |
| E1 | **阻塞** | MES 的 pKa 標為 6.27，與通用值對不上 — **需要人為確認，不要自行改** | 待確認 |
| E2 | P3 | SSC 的檸檬酸三鈉只有二水合物，缺無水鹽選項 | 待處理 |
| E3 | P3 | `edta_stock_05m` 的 `formula` 文案不符 ISSUE.md 要求 | 待處理 |
| E4 | P2 | 新增獨立的 KH₂PO₄／Na₂HPO₄ phosphate buffer（ISSUE.md 需求） | 待處理 |
| F1 | P4 | `optionalText` / `byId` 等工具函式重複三次 | 可選 |
| F2 | P4 | `deleteReagent` 用 `JSON.stringify().includes()` 檢查相依，會誤判 | 可選 |
| F3 | P4 | 切換到動態配方後，標準配方的 DOM 沒清空，產生髒資料 | 可選 |

---

## A 批 — 正確性缺陷（P1）

### A1 — `validateResult` 忽略液體組成的體積，超量不報錯

**檔案**：`src/js/engines/validation.js`（`validateResult` 函式）

**問題**

`validateResult` 只檢查 `component.stockVolumeL`，但標準配方的液體組成（冰醋酸、0.5 M EDTA 庫存液）走的是另一條路：`StandardRecipeEngine` 對 `kind: "fixedVolume"` 產生的是 `{ kind: "volume", volumeL }`，**沒有** `stockVolumeL`。所以這些體積從來沒有被驗證過。

**已實測的重現**

```
1 L 的 500× TAE：
  液體試劑合計 = 1.571 L（冰醋酸 571 mL + EDTA 庫存液 1000 mL）
  validateResult -> hasErrors = false
```

介面照常輸出一份物理上不可能配製的配方。`#strength-input` 是自由數字輸入，HTML 沒有把它限制在 `strengthOptions` 內，所以使用者真的碰得到這條路徑。

**改法**

在 `validateResult` 內加一個取「該組成佔用的液體體積」的小函式，同時涵蓋兩種來源，然後單項檢查與總和檢查都改用它：

```js
function liquidVolumeL(component) {
  if (component.stockVolumeL != null) return component.stockVolumeL;
  if (component.volumeL != null) return component.volumeL;
  return 0;
}
```

- 單項檢查：`liquidVolumeL(component) > input.volumeL` → `error`
- 總和檢查：所有組成的 `liquidVolumeL` 加總 `> input.volumeL` → `error`

**訊息代碼與文案**：現有代碼 `STOCK_EXCEEDS_FINAL` / `STOCK_TOTAL_EXCEEDS_FINAL` 的文案寫「庫存液體積」，套用到冰醋酸這種純液體試劑會不準確。請改成 `LIQUID_EXCEEDS_FINAL` / `LIQUID_TOTAL_EXCEEDS_FINAL`，文案改用「液體體積」。

> 代碼可以安全改名：全專案只有 `test-runner.js` 依代碼字串做斷言，而且只針對 `TRIS_TEMPERATURE_RANGE` 與 `TITRATION_REQUIRED` 兩個。既有配製紀錄裡雖然存了舊代碼字串，但沒有任何程式碼會依代碼去讀取或分支，不影響相容性。

**選配（建議做）**：加一個提前的 `warning`，當液體體積總和超過最終體積的 90%（但還沒超過）時提醒使用者定容空間不足。代碼 `LIQUID_NEAR_FINAL`。

**驗收條件**

- 1 L 500× TAE 產生 `error`，介面不輸出配方表格。
- 1 L 1× TAE、1 L 0.5× TBE 等正常配方不產生任何新的 error 或 warning。
- 既有 28 項測試全數仍通過。
- D3 的新測試通過。

---

### A2 — Tris 配方的 key 與 id 不一致，導致「複製」按鈕失效

**檔案**：`src/js/data/buffers.js`、`src/js/services/library.js`、`src/js/ui/controller.js`、`src/js/tests/test-runner.js`

**問題**

`app.Buffers` 裡 Tris 的 key 是 `tris`，但物件的 `id` 是 `tris-buffer` — 全專案十個內建配方中唯一一個 key ≠ id 的。

`Library.allBuffers()` 是用 **key** 建索引的，但 `library-manager.js` 的 `renderRecipes()` 是用 **id** 產生 `data-recipe-copy` 屬性，點擊處理器再拿這個 id 去 `Library.getBuffer()` 反查。

**已實測的重現**

```
getBuffer("tris")                       -> 找得到
getBuffer("tris-buffer")                -> null
DOM 上的屬性值                            -> data-recipe-copy="tris-buffer"
```

結果：在「自訂資料庫」對內建 Tris 配方按「複製」，**什麼都不會發生，也沒有錯誤訊息**。其他九個配方都正常。

**改法（兩步都要做）**

**第一步：把 key 改成 `"tris-buffer"`，讓不變式成立。**

選 id 而不是選 key，是因為 `tris-buffer` 這個字串已經被寫進所有既有配製紀錄的 `provenance.recipeId` 與 `bufferId` 裡了，改 id 會讓紀錄檔前後不一致。

需要一併更新的引用點：

- `src/js/data/buffers.js`：`tris: freezeBuffer({...})` → `"tris-buffer": freezeBuffer({...})`（有連字號，key 必須加引號）。
- `src/js/ui/controller.js` 的 `loadExample()`：範例 `"tris-1l"` 的 `bufferKey: "tris"` → `"tris-buffer"`。
- `src/js/tests/test-runner.js`：`app.Buffers.tris` 出現兩處（測試「1 L 50 mM Tris 範例」與「Tris 溫度修正與範圍」），改成 `app.Buffers["tris-buffer"]`。
- 全專案搜尋 `Buffers.tris` 與 `"tris"` 確認沒有遺漏（注意：試劑 id `tris` 與 `tris_hcl` **不要動**，那是不同的東西）。

**第二步：加舊 key 的別名，保住既有使用者的「最近計算」。**

既有 localStorage 的 history 紀錄裡存的是 `state.bufferKey: "tris"`。`Controller.restoreState()` 開頭有 `if (!state || !app.Library.getBuffer(state.bufferKey)) return;` — 查不到就**靜默 return**。不處理的話，老使用者按舊 Tris 紀錄的「載入」會變成無反應。

在 `src/js/services/library.js` 加：

```js
const legacyBufferKeys = Object.freeze({ tris: "tris-buffer" });

function getBuffer(id) {
  const map = allBuffers();
  return map[id] || map[legacyBufferKeys[id]] || null;
}
```

註解要寫清楚這是給 V2 早期 localStorage 紀錄用的相容層，不是新程式碼可以依賴的查找方式。

**第三步：加不變式測試，防止再犯。** 見 D4。

**驗收條件**

- 在「自訂資料庫」對內建 Tris 按「複製」，配方表單會被填入「Tris / Tris-HCl buffer 副本」，且 `custom-recipe-id` 為空（代表會另存新配方而非覆寫）。
- 「載入範例 → 1 L 50 mM Tris」仍正常運作。
- 手動在 localStorage 塞一筆 `state.bufferKey: "tris"` 的舊 history 紀錄，按「載入」仍能還原。
- 新增的 key/id 不變式測試通過。

---

### A3 — 化學式在三個顯示路徑缺漏

**檔案**：`src/js/ui/controller.js`、`src/js/ui/records.js`
**對應**：ISSUE.md「部分化合物未顯示化學式」

**問題**

ISSUE.md 描述的症狀是「化學式部分顯示、部分沒有」。審查後確認是**三個具體位置**，不是全面性缺漏：

**位置 1 — 水合物切換下拉選單（已實測）**

`src/js/ui/controller.js` 的 `renderStandardReagents()`，水合物 `<select>` 的 option 只輸出名稱與分子量：

```
實際輸出：磷酸氫二鈉（無水）｜141.958 g/mol
```

諷刺的是，同一個函式的另一個分支（沒有水合物選項時的唯讀 `<input>`）**有**化學式，`fillSelect()`（動態模式的酸／鹼型試劑選單）也**有**。就只有這個 select 漏掉。

**位置 2 — 配製紀錄的「試劑實際使用」欄位**

`src/js/ui/records.js` 的 `renderComponents()`，每列只顯示 `reagent.zhName`，使用者在填實際秤量時看不到自己選的是哪個水合物。

**位置 3 — 列印／PDF 的紀錄表格**

`src/js/ui/records.js` 的 `updatePrintSummary()`，「試劑」欄只有 `reagent.zhName`。這直接牴觸 ISSUE.md 的驗收條件：「配方結果與列印內容會保留所選試劑的完整化學式及水合物資訊」。

**改法**

三處都補上 `component.reagent.formula`（或水合物 select 的 `item.formula`），格式與專案既有慣例一致，用全形直豎線 `｜` 分隔：

- 位置 1：option 文字改為 `名稱｜化學式｜分子量 g/mol`。
- 位置 2：在名稱下方的 `.muted` 區塊加上化學式。
- 位置 3：「試劑」欄改為名稱 + 化學式。

**同時修正跳脫的一致性**：位置 1 目前 `<option value="${id}">` 的 `id` 與 `item.formula` 都沒有過 `F.escapeHtml`（只有 `zhName` 有）。全部補上。專案其他地方都做了，這裡是缺口。

**驗收條件（照 ISSUE.md 的驗收條件逐條核對）**

- 任何可選試劑清單中都看得到化學式，或明確的無單一化學式說明。
- 選了 `Na₂HPO₄·7H₂O` 之後，結果表格、紀錄編輯區、列印輸出三處都顯示 `Na₂HPO₄·7H₂O`，不會只顯示無水鹽名稱。
- `NaH₂PO₄`、`Na₂HPO₄`、`KH₂PO₄` 及各水合物的顯示內容與分子量互相一致。
- D4 的試劑不變式測試通過。

> ISSUE.md 的另一半需求（新增 KH₂PO₄／Na₂HPO₄ 配方）是獨立任務 E4。兩者都完成後才能關掉 ISSUE.md。

---

## B 批 — 使用者可見的行為缺陷（P2）

### B1 — 非 Tris 的動態緩衝液，溫度輸入被無聲忽略

**檔案**：`src/js/engines/dynamic-buffer.js`、`src/js/ui/renderer.js`

**問題**

`calculatePka()` 開頭是 `if (!dynamic.temperatureCoefficient) return dynamic.pKa25;` — 直接回傳，**不推任何訊息**。

使用者把 HEPES 的配製溫度填 4°C，結果區的「計算溫度」摘要卡照樣顯示「4.0°C」，但實際用的是 25°C 的 pKa。HEPES 的 dpKa/dT 約 -0.014/°C，21 度的差距約等於 0.3 個 pH 單位。對一個以防呆為賣點的工具來說，這個沉默不恰當。表單下方那行小字「僅 Tris 在 5–37°C 內套用溫度修正」不足以取代結果區的警告。

**改法**

1. **在 `calculatePka()` 補警告**：無溫度係數且 `Math.abs(temperatureC - 25) > 0.5` 時，推一則 `warning`，代碼 `NO_TEMPERATURE_MODEL`，`field` 為 `"temperature"`。文案要說清楚三件事：本配方沒有經來源確認的溫度係數、計算一律使用 25°C pKa、你輸入的溫度沒有被套用，請以 pH meter 在實際使用溫度量測。

2. **修正結果摘要卡的誤導**：`renderer.js` 的 `summaryCards()` 目前無條件顯示 `input.temperatureC`。請在 `calculate()` 產生的 `calculation` 物件中加一個布林欄位（例如 `temperatureApplied`），由 `calculatePka` 決定；`summaryCards()` 在 `false` 時顯示「25°C（未套用溫度修正）」。

**注意**：不要因此推導或輸出 HEPES／MES／MOPS 的溫度係數。專案的科學界線是「溫度修正只在有明確來源與適用範圍時套用」，目前只有 Tris 符合。這個任務是**讓沉默變成明示**，不是擴大模型。

**驗收條件**

- HEPES + 4°C → 結果區出現 `NO_TEMPERATURE_MODEL` 警告，摘要卡不再宣稱「計算溫度 4.0°C」。
- HEPES + 25°C → 不出現該警告（避免雜訊）。
- Tris + 37°C → 行為完全不變，仍套用 -0.028 修正，仍出現 `TEMPERATURE_CORRECTION` 提示。
- Tris + 50°C → 行為完全不變，仍出現 `TRIS_TEMPERATURE_RANGE` 警告（既有測試會驗這個）。

---

### B2 — localStorage 寫入失敗被靜默吞掉

**檔案**：`src/js/services/storage.js`、`src/js/ui/controller.js`

**問題（兩個）**

1. `Controller.calculate()` 呼叫 `app.Storage.addHistory({...})` 但**不看回傳值**；`setTheme()` 同理。`Storage.write()` 在配額用罄時會回 `false` 並設定 `lastError`，但使用者只會發現「計算紀錄怎麼都沒存下來」，沒有任何說明。`src/index.template.html` 裡的 `#storage-notice` 元素已經存在（目前只用於 V1 遷移通知），可以直接拿來用。

2. `Storage.read()` 失敗時會設定 `lastError`，但**成功時不清除**（只有 `write()` 會清）。所以一次讀取失敗之後，下一次儲存失敗顯示的可能是舊的讀取錯誤訊息，誤導除錯。

**改法**

1. `read()` 成功路徑補 `lastError = null`。
2. 在 `controller.js` 加一個小函式，把文字寫進 `#storage-notice` 並取消 `hidden`；`addHistory` 與 `setTheme` 回傳 `false` 時呼叫它，內容取 `app.Storage.getLastError()`。
3. `#storage-notice` 目前被 V1 遷移通知佔用。用後到的訊息覆蓋先到的即可，不需要做訊息佇列。

**驗收條件**

- 把 localStorage 灌滿到寫入失敗，執行計算後 `#storage-notice` 會顯示「瀏覽器儲存空間不足…」而不是靜默。
- 正常情況下 `#storage-notice` 保持 `hidden`（除非有 V1 遷移通知）。
- 既有測試「損壞的本機資料不阻止啟動」仍通過。

---

### B3 — history 的 `entry.id` 未經跳脫就插入 HTML 屬性

**檔案**：`src/js/ui/controller.js`（`renderHistory()`）

**問題**

`data-history-load="${entry.id}"` 與 `data-history-delete="${entry.id}"` 兩處直接字串插值，沒有過 `F.escapeHtml`。專案其他所有插入 HTML 的地方（records、library-manager）都做了跳脫，只有這裡漏掉。

id 平常是內部產生的，但 **V1 遷移路徑會把 localStorage 裡的舊資料原封不動搬進 V2 history**，來源不完全受控。以 `file://` 的威脅模型來說實際風險很低，但這是一致性缺口，修正成本是零。

**改法**：兩處都包上 `F.escapeHtml()`。

**同時檢查**：`renderStandardReagents()` 裡的 `data-standard-reagent="${component.reagentId}"`、`data-standard-purity="${component.reagentId}"` 與 `<option value="${id}">` 也是未跳脫（A3 已涵蓋 option 那一處，這裡把其餘補齊）。

**驗收條件**：全專案搜尋 `="${`，確認所有插入 HTML 屬性的動態值都經過 `F.escapeHtml`。

---

### B4 — 平滑捲動沒有尊重 `prefers-reduced-motion`

**檔案**：`src/styles/base.css`、`src/js/ui/controller.js`、`src/js/ui/records.js`、`src/js/ui/library-manager.js`

**問題**

`base.css` 全域啟用 `html { scroll-behavior: smooth; }`，另有 6 處 JS 呼叫 `scrollIntoView({ behavior: "smooth" })`（controller 3 處、records 1 處、library-manager 2 處）。前庭系統敏感的使用者無法關閉，是可及性缺陷。

**改法**

1. CSS 加：

```css
@media (prefers-reduced-motion: reduce) {
  html { scroll-behavior: auto; }
}
```

2. JS：加一個共用小函式決定 behavior，6 處呼叫都改用它。放哪裡由你判斷 — 若 F1 有做就放 core 層，否則就近放在 `controller.js` 並掛到 `app` 上供其他 UI 模組使用（注意載入順序：`controller.js` 在 `records.js`／`library-manager.js` **之後**載入，所以不能在後兩者的模組初始化階段直接取用，只能在事件處理器裡呼叫 — 這剛好符合現況，但要留意）。

**驗收條件**：作業系統開啟「減少動態效果」後，捲動為瞬間跳轉；關閉時維持平滑捲動。

---

### B5 — 首次開啟一律淺色，不看系統主題偏好

**檔案**：`src/js/services/storage.js`、`src/js/ui/controller.js`

**問題**

`src/index.template.html` 宣告了 `<meta name="color-scheme" content="light dark">`，但 `Storage.getTheme()` 是 `read(keys.theme, "light") === "dark" ? "dark" : "light"` — 沒存過偏好時一律回 `"light"`。系統設為深色的使用者第一次開啟會被閃一臉白。

**改法**

`getTheme()` 改成三段判斷：讀到有效的 `"dark"` / `"light"` 就用它；否則回 `root.matchMedia && root.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"`。

**注意一個副作用**：`Controller.init()` 目前無條件呼叫 `setTheme(app.Storage.getTheme())`，而 `setTheme()` 會寫回 localStorage。這代表首次開啟後系統偏好就被「凍結」成明確值，之後系統切換深淺色不會再跟隨。這個行為可以接受（使用者仍可用切換鈕），但如果要做得更好，可以讓 init 階段只套用主題而不寫入，等使用者真的按了切換鈕才持久化。**由你決定，但請在 commit 訊息裡說明選了哪個。**

**驗收條件**

- 清空 localStorage 後，在系統深色模式下開啟 → 直接是深色。
- 手動切換過主題之後，該選擇會被記住並優先於系統偏好。

---

## C 批 — 建置腳本（`tools/build.ps1`）

> 前提說明：目前建置流程在 Edge 151 上實測正常，`--dump-dom` 有正確回傳 `data-test-status="passed"`。以下是**體質強化**，不是當下的故障修復。

### C1 — stderr 重導地雷、Edge 路徑不全、多餘的安全旗標

**三個獨立問題，都在執行 headless 測試那一段：**

**(a) `2>&1` 是潛在地雷 — 建議直接拿掉。**

目前是 `& $edgeCandidates[0] ... --dump-dom $candidateUri 2>&1 | Out-String`。Windows PowerShell 5.1 會把原生執行檔的 stderr **每一行包成 ErrorRecord**（NativeCommandError）；腳本頂端又設了 `$ErrorActionPreference = "Stop"`，兩者相加會讓建置在 Edge 只是印了警告（GPU／DirectX 之類，在不少機器上很常見）時就整個中止，**即使 Edge 回傳 exit code 0**。

本次實測沒有觸發，是因為這台機器上 Edge 剛好沒輸出 stderr。這是環境相依的偶發失敗，不是穩定行為。

改法：拿掉 `2>&1`。`--dump-dom` 的輸出走 stdout，本來就不需要合併 stderr。

**(b) Edge 搜尋路徑漏了使用者層級安裝。**

目前只找 `${env:ProgramFiles(x86)}` 與 `$env:ProgramFiles` 兩個位置。請補上 `$env:LOCALAPPDATA\Microsoft\Edge\Application\msedge.exe`（使用者層級安裝的預設位置）。

選配：再補 Chrome 作為後備（同樣三個位置的 `Google\Chrome\Application\chrome.exe`），並在錯誤訊息裡說明找不到哪些瀏覽器。`--headless --dump-dom` 在 Chrome 上行為相同。

**(c) 移除 `--allow-file-access-from-files`。**

專案沒有任何 `fetch`／`XMLHttpRequest`（`Assert-SafeSource` 本來就會擋），這個旗標只是無謂放寬瀏覽器的安全限制。移除後測試應該完全不受影響 — 請實際跑一次確認。

**選配**：執行後檢查 `$LASTEXITCODE`，非 0 時給出比「測試沒過」更精確的錯誤訊息。

**驗收條件**：改完後 `tools/build.ps1` 仍能成功建置並產出與改動前位元組相同的 `dist/index.html`（因為 C 批不動 `src/`）。

---

### C2 — `Assert-SafeSource` 黑名單有洞

**問題**：目前擋了 `<script src=`、外部 stylesheet、`@import`、`fetch(`、`XMLHttpRequest`、`WebSocket(`、`eval(`，但沒擋：

- `new Function(` — 與 `eval` 等價的動態程式碼執行
- `import(` — 動態模組載入
- `<iframe` / `srcdoc=`
- `document.write(`
- `navigator.sendBeacon(`

以目前的威脅模型不緊急（這些現在都沒被用到），但既然要建黑名單就該建齊。

**改法**：在 `$forbiddenPatterns` 陣列補上對應的正則。

**注意**：新增樣式必須**先跑一次建置確認沒有誤判**。特別留意 `import(` 這種樣式不要誤中 `important`（CSS 裡有 `!important`）— 請用足夠精確的邊界，例如要求前面是非識別字元且後面緊接括號。這是很容易踩到的坑，改完務必實際建置驗證。

---

### C3 — 缺少「檢查 dist 是否過期」模式

**問題**

目前沒有辦法在不覆寫 `dist/index.html` 的前提下確認它是否與 `src/` 同步。本次審查是靠自行重跑串接邏輯再逐位元組比對，才確認 dist 是同步的。這個能力應該內建在腳本裡。

**改法**

加一個 `-Check` 開關：

- 照常執行來源檢查、串接、`Assert-SafeSource`。
- **不寫入** `dist/index.html`。
- 與現有的 `dist/index.html` 逐字比對（用相同的 UTF-8 無 BOM 讀取方式，避免編碼造成假陽性）。
- 相同 → 輸出訊息並 exit 0；不同 → 輸出「dist 已過期，請重新建置」並 **exit 非 0**。
- `-Check` 與 `-SkipBrowserTests` 可以並用；單獨用 `-Check` 時仍應跑瀏覽器測試。

**驗收條件**

- 在乾淨的工作目錄執行 `.\tools\build.ps1 -Check` → 通過，exit 0，`dist/index.html` 的修改時間沒有變。
- 隨便改一行 `src/` 的程式碼再執行 `-Check` → 失敗，exit 非 0。
- 順手更新 [AGENTS.md](../AGENTS.md) 的「建置與測試」段落，把這個新用法寫進去。

---

## D 批 — 測試補強

現有 28 項測試品質不錯（碰 localStorage 的都有 `finally` 還原，這點做得很好），但有幾條路徑完全沒有覆蓋。

> **重要**：加完測試後，總數會從 28 變成別的數字。請同步更新這三個地方的數字，否則文件會說謊：
> - `README.md`（「28 項內建數值測試」）
> - `AGENTS.md`（「目前 28 項測試全部必須通過」）
> - `docs/v2-guide.md`（若有提及）

### D1 — `fixedMass` / `fixedVolume` 縮放（TAE／TBE 目前一行測試都沒有）

現有測試只涵蓋 `kind: "moles"`（PBS）。TAE 與 TBE 走的 `fixedMass` / `fixedVolume` 分支完全沒被驗證過。

新增測試與預期值（`baseVolumeL: 1`，縮放係數 = `(目標體積 ÷ 基準體積) × (目標倍數 ÷ 基準倍數)`）：

**「TAE 固定質量與固定體積縮放」** — 1 L 1× TAE（基準 50×，係數 0.02）：

| 組成 | kind | 預期 |
| --- | --- | --- |
| Tris | mass | `theoreticalMassG` = 4.84 |
| 冰醋酸 | volume | `volumeL` = 0.001142 |
| 0.5 M EDTA | volume | `volumeL` = 0.002 |

**「TBE 固定質量與固定體積縮放」** — 1 L 0.5× TBE（基準 10×，係數 0.05）：

| 組成 | kind | 預期 |
| --- | --- | --- |
| Tris | mass | `theoreticalMassG` = 5.4 |
| 硼酸 | mass | `theoreticalMassG` = 2.75 |
| 0.5 M EDTA | volume | `volumeL` = 0.002 |

同時斷言液體組成的 `kind === "volume"`（確認沒有被誤判成 `stock`）。

### D2 — 水合物切換（`reagentOverrides`）路徑

`reagentOverrides` 是使用者切換水合物時唯一的傳遞管道，目前零覆蓋。

**「水合物切換會改用正確的分子量與快照」** — 1 L 1× PBS，`reagentOverrides: { na2hpo4: "na2hpo4_7h2o" }`：

- 對應組成的 `reagent.id === "na2hpo4_7h2o"`
- `theoreticalMassG` ≈ 2.14456（0.008 mol × 268.07 g/mol）
- `provenance.reagentSnapshots` 中對應那筆的 `id` 也是 `na2hpo4_7h2o`（確認快照抓的是實際使用的試劑，不是配方預設的）
- 其餘三個組成不受影響

### D3 — 液體體積總和超量（A1 的迴歸測試）

**「液體試劑體積總和超過最終體積時被攔截」**：

- 用 `StandardRecipeEngine.calculate({ volumeL: 1, strength: 500, ... }, app.Buffers.tae)` 產生結果
- `Validation.validateResult(result, { volumeL: 1 })` → `hasErrors` 必須為 `true`
- 對照組：1 L 1× TAE → `hasErrors` 必須為 `false`（確保沒有誤判正常配方）

### D4 — 資料不變式與格式化邊界

**「內建配方的 key 必須等於 id」**（防止 A2 再犯）：走訪 `Object.entries(app.Buffers)`，斷言每個 `key === buffer.id`，失敗訊息要指出是哪一個 key。

**「每個內建試劑都有化學式或明確說明」**（對應 A3 與 ISSUE.md 驗收條件）：走訪 `Object.values(app.Reagents)`，斷言 `formula` 是非空字串且不等於 `"—"`。

**「格式化單位切換邊界」**（選配，P3）：驗 `Formatter.mass` / `volume` / `moles` 在 0.001 與 1 這兩個臨界值上的單位切換。

> **注意**：`Formatter.number` 用的是 `Intl.NumberFormat("zh-TW")`，四位數以上會插入千分位逗號（`1234.5` → `"1,234.5"`）。寫字串斷言時要考慮這點，或者只在不會觸發千分位的數值範圍測試。

---

## E 批 — 資料與新功能

### E1 — MES 的 pKa 需要人為確認【阻塞，不要自行修改】

**現況**：`src/js/data/buffers.js` 的 MES 配方標 `pKa25: 6.27`，`docs/data-sources.md` 的動態緩衝液表格也記 6.27。

**疑慮**：Good's buffer 的通用值與 MilliporeSigma 自家的緩衝液選擇指南（也就是本專案在 `references.js` 裡引用的 `sigmaBuffers`）多半列 **6.15**（25°C），少數來源列 6.10。**6.27 與兩者都對不上。**

**為什麼不直接改**

專案自己的維護規則寫得很好：「不同來源衝突時不合併平均值；選定單一資料集並保留其溫度、濃度與試劑型態條件」。在沒有確認引用來源實際印的數字之前擅自改動，等於違反這條規則。而且 6.27 也可能是某個特定溫度或特定鹽型（例如 MES sodium salt）下的正確值，只是台帳沒記錄條件。

**要做的事**

1. **不要修改任何數值。**
2. 去查 `docs/data-sources.md` 引用的那份 MilliporeSigma Biological Buffers Selection Guide，找出它實際印的 MES pKa 與溫度條件。
3. 把查證結果寫成一段說明回報給使用者（來源、頁碼／表格、印的數字、溫度條件），**等使用者裁示**。

**若使用者確認要改成 6.15，才執行以下**（全部都要做）：

- `src/js/data/buffers.js`：`pKa25` 改值；一併重新檢視 `defaultPH: 6.1` 是否仍合理（6.1 與 6.15 相差 0.05，落在建議範圍內，應可維持，但要有意識地確認過）。
- `docs/data-sources.md`：更新 MES 那一列，並在「限制」欄註明採用的溫度條件。
- `src/js/core/constants.js`：更新 `DATA_VERSION`。
- `src/js/tests/test-runner.js`：目前**沒有任何測試斷言 MES 的 pKa**。請補一個，讓未來的數值漂移會被測試抓到。

---

### E2 — SSC 的檸檬酸三鈉缺無水鹽選項

**問題**

SSC 配方鎖定 `sodium_citrate_2h2o`（二水合物，294.10 g/mol），但無水檸檬酸三鈉也是常見庫存品。`src/js/ui/controller.js` 的 `hydrateGroups` 目前只涵蓋 `na2hpo4` 一組，SSC 使用者拿到無水鹽就只能自己換算，違背這個工具存在的目的。

**改法**

1. `src/js/data/reagents.js` 新增：

| 欄位 | 值 |
| --- | --- |
| `id` | `sodium_citrate` |
| `zhName` | 檸檬酸三鈉（無水） |
| `enName` | Trisodium citrate, anhydrous |
| `formula` | `Na₃C₆H₅O₇` |
| `cas` | `68-04-2` |
| `molarMass` | `258.07` |
| `hydration` | `anhydrous`（預設值，可省略） |
| `verifiedOn` | 本次改動日期（**明確帶入，不要改共用常數** — 見 0.5 節） |

2. `src/js/ui/controller.js` 的 `hydrateGroups` 加一組。**key 是配方組成裡用的 reagentId**，也就是 `sodium_citrate_2h2o`，選項陣列的**第一項會是預設選取**，所以二水合物要排第一以維持現有行為：

```js
sodium_citrate_2h2o: ["sodium_citrate_2h2o", "sodium_citrate"]
```

3. 依 0.5 節更新 `DATA_VERSION` 與 `docs/data-sources.md`。

**驗收條件**

- SSC 的「試劑型態與純度」區出現檸檬酸三鈉的下拉選單，預設仍是二水合物，計算結果與改動前完全相同。
- 切換到無水鹽後質量變小（258.07 / 294.10 ≈ 0.878 倍），且結果表格與 provenance 快照都反映無水鹽。

---

### E3 — `edta_stock_05m` 的 `formula` 文案

**問題**

`formula: "EDTA stock"` 介於「化學式」與「說明」之間，兩邊都不像。ISSUE.md 第 4 點要求：「對庫存液或混合物等沒有單一化學式的項目，顯示清楚的組成或『無單一化學式』說明，不要留白。」

**改法**

改成明確的說明文字，例如「無單一化學式（0.5 M EDTA 二鈉鹽水溶液，pH 8.0）」。

**改前先確認四個顯示點不會被撐版**：結果表格的「化學式」欄、`fillSelect` 的下拉選單、自訂資料庫的試劑清單、標準配方的唯讀 `<input>`。若太長就縮短，優先保證「無單一化學式」這個關鍵訊息在所有位置都看得到。

同時檢查 `acetic_acid_glacial`（有真實化學式 `CH₃COOH`，不需改）與任何 `physicalForm` 為 `liquid` / `stock` 的試劑是否有同樣問題。

依 0.5 節更新 `DATA_VERSION` 與台帳。

---

### E4 — 新增獨立的 KH₂PO₄／Na₂HPO₄ phosphate buffer

**對應**：ISSUE.md「需求：新增 KH₂PO₄／Na₂HPO₄ 磷酸鹽緩衝液」

**背景**：目前只有 PBS（含 NaCl + KCl）與 `NaH₂PO₄/Na₂HPO₄` 成對配方兩種。缺少實驗室常用的 KH₂PO₄／Na₂HPO₄ 純磷酸鹽緩衝液。

**改法**

**1. `src/js/data/buffers.js` 新增配方**（key 必須等於 id — 見 A2）：

| 欄位 | 值 |
| --- | --- |
| key / `id` | `phosphate-kh2po4` |
| `name` | Phosphate buffer（KH₂PO₄ / Na₂HPO₄） |
| `mode` | `dynamic` |
| `defaultPH` | `7.2` |
| `defaultConcentrationM` | `0.1` |
| `referenceRef` | `sigmaBuffers` |
| `dynamic.strategy` | `paired` |
| `dynamic.pKa25` | `7.21` |
| `dynamic.usefulRange` | `[6.2, 8.2]` |
| `dynamic.acidLabel` / `baseLabel` | `H₂PO₄⁻` / `HPO₄²⁻` |
| `dynamic.acidOptions` | `["kh2po4"]` |
| `dynamic.baseOptions` | `["na2hpo4", "na2hpo4_2h2o", "na2hpo4_7h2o", "na2hpo4_12h2o"]` |

`referenceNote` 要明確寫出：使用第二解離階段近似、酸型固定為 KH₂PO₄、鹼型為 Na₂HPO₄、**不含 NaCl 或 KCl**。

**2. 必須一併處理：多質子近似警告目前是硬寫死 id 的。**

`src/js/engines/dynamic-buffer.js` 裡有 `if (buffer.id === "phosphate")` 才推 `POLYPROTIC_APPROXIMATION` 警告。新配方套用完全相同的近似，卻拿不到這個警告 — 這是科學誠信問題，不能漏。

**不要**改成 `if (id === "phosphate" || id === "phosphate-kh2po4")`。請改成資料驅動：在兩個 phosphate 配方的 `dynamic` 物件裡加一個旗標（例如 `polyproticApproximation: true`），引擎改成檢查這個旗標。這樣未來新增第三個磷酸鹽配方時不會再漏。

> 同一個檔案的 `calculatePka()` 也有類似的硬寫死：`buffer.id === "tris-buffer" ? "TRIS_TEMPERATURE_RANGE" : "TEMPERATURE_RANGE"`。這個**不要動** — 既有測試依賴 `TRIS_TEMPERATURE_RANGE` 這個代碼，改了要連測試一起改，超出本任務範圍。若你想順手清掉，請開成獨立 commit 並同步更新測試。

**3. 讓選單能區分兩個 phosphate 配方（ISSUE.md 驗收條件）。**

把現有 `phosphate` 配方的 `name` 從「Phosphate buffer」改成「Phosphate buffer（NaH₂PO₄ / Na₂HPO₄）」。

> 影響評估：既有配製紀錄存的是自己的 `bufferName` 快照，**不會**被回寫（這是正確且刻意的行為 — 見 AGENTS.md 的資料信任模型）。所以紀錄庫裡會同時存在新舊名稱，這是預期結果，不是 bug。紀錄列表的緩衝液篩選下拉是用 `bufferName` 去重的，會同時列出兩者，同樣是預期行為。

**4. 補測試**：

- 1 L 0.1 M pH 7.2 的 `phosphate-kh2po4`：兩組成莫耳數總和 = 0.1，`ratio` 與 pKa 關係正確。
- 組成中**不含** `nacl` 與 `kcl`（ISSUE.md 明確驗收條件）。
- 訊息中包含 `POLYPROTIC_APPROXIMATION`（驗證第 2 點的旗標重構有生效）。
- 既有 `phosphate` 配方的 `POLYPROTIC_APPROXIMATION` 仍然存在（防止重構時打破舊行為）。

**5.** 依 0.5 節更新 `DATA_VERSION` 與 `docs/data-sources.md`（動態緩衝液表格加一列）。

**6.** A3 與 E4 **兩者都完成**之後，使用者原始回報的「化學式」問題才算完整解決。

---

## F 批 — 體質整理（可選，時間不夠可略過）

### F1 — 工具函式重複

- `optionalText()` 在 `src/js/services/library.js` 與 `src/js/services/records.js` 各寫了一次，實作幾乎相同。
- `byId()` 在 `controller.js`、`records.js`、`library-manager.js` 各寫了一次。
- `setMessage()` / `status()` 在 `library-manager.js` 與 `records.js` 是同一個模式的兩份實作。

建議把 `optionalText` 抽到 core 層（`formatter.js` 或新的 `core/text.js`），`byId` 與訊息設定抽成共用 UI 工具。

**若新增檔案，務必加進 `tools/build.ps1` 的 `$scriptFiles` 陣列的正確位置**，否則不會被打包（載入順序有意義）。

### F2 — `deleteReagent` 的相依檢查會誤判

`src/js/services/library.js` 用 `JSON.stringify(recipe).includes('"' + id + '"')` 判斷試劑是否還被自訂配方使用。能運作，但只要試劑 id 字串碰巧出現在配方名稱、來源備註或任何其他欄位，就會誤判成「仍被使用」而擋下刪除。

改成明確檢查真正的引用欄位：`standardRecipe.components[].reagentId`、`dynamic.acidOptions`、`dynamic.baseOptions`、`dynamic.reagentId`。

### F3 — 切換到動態配方後，標準配方的 DOM 沒清空

`Controller.updateBufferUI()` 只在 `standard` 為真時呼叫 `renderStandardReagents()`。從 PBS 切換到 phosphate 之後，`#standard-reagent-list` 仍留著 PBS 的試劑列，`readStandardOverrides()` 於是把上一個配方的純度值一起塞進動態計算的 input 物件。

引擎會忽略這些欄位，所以**目前無害**，但 `captureFormState()` 會把髒資料存進 history。切換到非標準模式時清空該容器即可。

---

## 附錄：驗證清單

全部改完後，逐項確認：

- [ ] `powershell -ExecutionPolicy Bypass -File .\tools\build.ps1` 成功，所有測試通過
- [ ] `dist/index.html` 已重新產生並包含在 commit 中
- [ ] `.\tools\build.ps1 -Check` 通過（若 C3 已完成）
- [ ] 用瀏覽器開 `dist/index.html?dev=1`，測試區顯示全綠，數量與文件記載一致
- [ ] `README.md`、`AGENTS.md`、`docs/v2-guide.md` 中的測試數量已更新
- [ ] 有動到科學資料 → `DATA_VERSION`、`docs/data-sources.md`（含第 3 行審查日期）、對應測試三者皆已更新
- [ ] 新增試劑有帶自己的 `verifiedOn`，共用常數未被更動
- [ ] 手動走一次：PBS 標準計算 → 切換水合物 → 儲存配製紀錄 → 列印預覽 → 複製配方
- [ ] 手動走一次：Tris 動態計算 → 在自訂資料庫按「複製」 → 確認表單被填入
- [ ] 手動走一次：HEPES 填 4°C → 確認出現溫度警告
- [ ] 深色模式、`prefers-reduced-motion`、A4 列印版面皆正常
- [ ] E1（MES pKa）的查證結果已回報，未擅自修改數值
- [ ] [ISSUE.md](../ISSUE.md) 中已完成的條目（A1／A2／A3／E4）已標註完成日期與對應 commit，**未直接刪除條目**
