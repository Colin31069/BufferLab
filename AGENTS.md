# AGENTS.md — BufferLab 開發指引

給 AI coding agent 與新加入的開發者。人類使用說明請看 [README.md](README.md) 與 [docs/v2-guide.md](docs/v2-guide.md)。

## 專案本質

單一檔案的離線緩衝液配製計算器。**最終產物只有 `dist/index.html`** — 一個把 CSS 與 JS 全部內嵌的 HTML，可以直接用 `file://` 開啟，不需要伺服器、不需要 npm、不連任何網路。

`src/` 是可維護的分割原始碼，`tools/build.ps1` 負責把它們串接成 `dist/index.html`。

## 最重要的規則

1. **永遠不要手動編輯 `dist/index.html`。** 它是建置產物。改 `src/`，然後重新建置。
2. **`dist/index.html` 必須跟著原始碼一起 commit**，而且必須與 `src/` 同步。它是使用者唯一會拿到的檔案。
3. **零外部依賴、零網路存取。** 不可加入 CDN、`fetch`、`XMLHttpRequest`、`WebSocket`、`eval`、外部 `<script src>`、外部 `<link rel=stylesheet>`、`@import`。建置腳本的 `Assert-SafeSource` 會擋下這些，並讓建置失敗。
4. **所有 UI 文字使用繁體中文（台灣用語）。** 程式碼識別字用英文。
5. **改動科學數值（分子量、pKa、配方組成、水合型態）時，必須同步更新三處**：`src/js/constants.js` 的 `DATA_VERSION`、`docs/data-sources.md` 的來源台帳、以及 `src/js/tests/test-runner.js` 的對應數值測試。

## 建置與測試

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\build.ps1
```

建置流程：檢查來源檔存在 → 檢查注入標記各出現一次 → 串接 CSS/JS → 掃描禁止的外部依賴 → 寫入暫存檔 → **用 headless Edge 執行內建測試，要求 DOM 出現 `data-test-status="passed"`** → 才寫入 `dist/index.html`。

沒有 Edge 的環境（僅限已另行完成瀏覽器測試的受控環境）：

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\build.ps1 -SkipBrowserTests
```

檢查 `dist/index.html` 是否與來源同步（不寫入檔案）：

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\build.ps1 -Check
```

手動跑測試：用瀏覽器開 `dist/index.html?dev=1`，展開「開發者測試」。目前 38 項測試全部必須通過。

沒有 linter、沒有 formatter、沒有 CI。測試就是 `src/js/tests/test-runner.js`，它是一個手寫的 runner，跑在真實瀏覽器裡。

## 架構

沒有模組系統。每個檔案都是 IIFE，掛在共用的 `window.BufferLab` 命名空間上：

```js
(function (root) {
  "use strict";
  const app = root.BufferLab;          // constants.js 是唯一用 `root.BufferLab = root.BufferLab || {}` 建立它的
  app.SomeModule = Object.freeze({ /* ... */ });
})(window);
```

**載入順序有意義。** `tools/build.ps1` 的 `$scriptFiles` 陣列就是唯一的相依順序來源：

```
core/constants → core/units → core/formatter
  → data/references → data/reagents → data/buffers
  → services/storage → services/library → services/provenance
  → engines/validation → engines/standard-recipe → engines/dynamic-buffer
  → services/records
  → ui/renderer → ui/library-manager → ui/records → tests/test-runner → ui/controller
  → app.js（DOMContentLoaded 時呼叫 Controller.init）
```

新增檔案時**必須**把它加進 `$scriptFiles` 的正確位置，否則不會被打包進去。

### 分層

| 層 | 檔案 | 職責 |
| --- | --- | --- |
| core | `constants` `units` `formatter` | 常數、單位換算、數值/HTML 格式化。無副作用。 |
| data | `references` `reagents` `buffers` | 內建唯讀資料，全部 `Object.freeze`，標記 `status: "verified"`、`builtIn: true`。 |
| services | `storage` `library` `provenance` `records` | localStorage 存取、內建＋自訂資料合併、來源快照、配製紀錄 CRUD。 |
| engines | `validation` `standard-recipe` `dynamic-buffer` | 純計算。輸入 plain object，輸出 result object，**不碰 DOM**。 |
| ui | `renderer` `controller` `records` `library-manager` | 讀寫 DOM、綁事件。所有插入 HTML 的字串都要過 `Formatter.escapeHtml`。 |

### 兩種計算模式

- **standard**（PBS/TBS/TAE/TBE/SSC）：`buffer.standardRecipe` 帶基準體積與基準倍數，依 `(目標體積÷基準體積) × (目標倍數÷基準倍數)` 線性縮放。組成型別：`moles`、`fixedMass`、`fixedVolume`。
- **dynamic**：Henderson–Hasselbalch。兩種策略：
  - `paired`（phosphate、Tris）：算出酸型／鹼型莫耳比，直接給兩種試劑的秤量。
  - `titration`（HEPES/MES/MOPS）：只算緩衝劑總量，**絕不輸出 HCl／NaOH 的理論體積**，一律要求使用者用 pH meter 實測滴定。

### 資料信任模型

這是產品的核心安全設計，不可弱化：

- 內建試劑／配方：`builtIn: true`、`status: "verified"`、`Object.freeze`。使用者不可編輯或刪除，只能「複製」成自訂副本。
- 使用者自訂：一律 `status: "user-unverified"`、`builtIn: false`。在選單、結果、列印、PDF 中都必須顯示「使用者自訂／未經 BufferLab 驗證」標示。
- `Provenance.attach()` 會在每次計算結果中嵌入配方快照與試劑快照。**既有配製紀錄不得被日後的資料庫變更回寫。**

## 常見改動的作法

**新增試劑** → 在 `src/js/data/reagents.js` 加一筆 `reagent({ ... })`。必填 `id`、`zhName`、`enName`、`formula`（含水合物的完整式，例：`Na₂HPO₄·2H₂O`）、`cas`、`molarMass`、`sourceRef`。沒有單一化學式的（庫存液、混合物）要給清楚說明，不可留白。

**新增緩衝液** → 在 `src/js/data/buffers.js` 用 `freezeBuffer({ ... })`。`app.Buffers` 的 **key 必須等於 `data.id`**（見下方已知問題），並補上 `referenceRef` 指向 `references.js` 的來源。

**新增水合物切換選項** → 在 `src/js/ui/controller.js` 的 `hydrateGroups` 加一組。

**新增測試** → 在 `src/js/tests/test-runner.js` 的 `run()` 裡加 `test("中文名稱", () => { ... })`，用 `assert` / `assertApproxEqual`。碰 localStorage 的測試務必在 `finally` 中還原原值（照既有寫法）。

**改 UI 結構** → 改 `src/index.template.html`。保留 `/*__INLINE_CSS__*/` 與 `/*__INLINE_JS__*/` 各一次，否則建置會失敗。

## 程式風格

- 兩空格縮排、雙引號、分號、`const`/`let`。
- ES2020+ 語法可用（`?.` 目前未使用但可）；不用 transpile。
- 匯出物件一律 `Object.freeze`。
- 錯誤訊息用繁體中文、面向使用者，直接 `throw new Error("...")`，由 UI 層 catch 後顯示。
- 驗證訊息用 `Validation.message(level, CODE, text, field)`，`level` 為 `error` / `warning` / `info`，`CODE` 為 SCREAMING_SNAKE 英文代碼。
- 短函式偏好單行寫法（既有程式碼大量如此），沿用即可。

## 科學與安全界線

不可放寬：

- 不宣稱處理活度、離子強度、完整多質子平衡。
- 不輸出滴定所需的酸鹼精確體積。
- 不建立溶解度自動上限（無可靠資料時只顯示「未評估溶解度」）。
- 不自行判定配製結果合格與否，只呈現理論與實測的差異。
- 溫度修正只在有明確來源與適用範圍時套用（目前僅 Tris，5–37°C，-0.028 pKa/°C）。

## 已知問題

追蹤中的問題一律記在 [ISSUE.md](ISSUE.md)，**動手前先讀過**。目前包含：

- **A1**：`validateResult` 不檢查 `kind: "volume"` 的組成，液體試劑體積超過最終體積時不會報錯。
- **A2**：`app.Buffers` 中 Tris 的 key 是 `tris` 但 `id` 是 `tris-buffer`，兩者不一致，會讓 `Library.getBuffer(buffer.id)` 對它回傳 `null`（自訂資料庫的「複製」按鈕因此失效）。修這個要同時處理既有 localStorage 紀錄的相容性。
- **A3**：化學式在水合物選單、配製紀錄欄位與列印表格三處缺漏。
- **E4**：缺少獨立的 KH₂PO₄／Na₂HPO₄ phosphate buffer。

具體改法與驗收清單見 [docs/work-order-2026-08-04.md](docs/work-order-2026-08-04.md)。
