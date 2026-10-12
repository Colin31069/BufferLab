# BufferLab 離線緩衝液配製計算器

繁體中文、研究實驗室用途的離線緩衝液計算工具。正式使用者只需要 `dist/index.html`，不需要安裝套件、啟動伺服器或連線。

## V2 功能

- 標準配方縮放：PBS、TBS、TAE、TBE、SSC。
- 動態計算：phosphate、Tris/Tris-HCl、HEPES、MES、MOPS。
- 單位轉換、純度校正、磷酸鹽水合物切換及庫存液換算。
- ResultSchema V2 來源快照、配方版本、試劑快照與驗證狀態。
- 自訂試劑、固定配方、成對酸鹼模型及滴定指引模型。
- 可編輯的實際配製紀錄、修訂次數、搜尋、批次複製及理論／實測差異。
- 分級錯誤與警告、完整 SOP、複製及強化 A4 列印／PDF。
- 深色模式、最近 10 筆計算、五個範例與 42 項內建數值測試。

## 建置

在專案根目錄執行：

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\build.ps1
```

建置腳本會先檢查所有來源、禁止的外部依賴與注入標記，再以 Microsoft Edge headless 執行內建測試。通過後才寫入 `dist/index.html`。

macOS 或其他跨平台環境可用 Node.js 內建模組建置及檢查，不需安裝套件：

```sh
node tools/build.mjs
node tools/build.mjs --check
```

此路徑會先執行內建邏輯測試。若要追加瀏覽器測試，提供 Chrome／Edge headless 執行檔路徑：

```sh
node tools/build.mjs --browser "/path/to/chrome"
```

若 Windows 建置環境沒有 Edge，可在已另行完成瀏覽器測試的受控環境使用：

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\build.ps1 -SkipBrowserTests
```

## 使用與驗證

1. 直接以近期瀏覽器開啟 `dist/index.html`。
2. 選擇緩衝液、體積、濃度或倍數，以及適用的試劑型態。
3. 按「計算配方」，核對試劑需求、警示、計算依據及 SOP。
4. 在「實際配製紀錄」填寫批號、實際用量、溫度與實測 pH，再明確儲存。
5. 從「配製紀錄」搜尋、編輯、複製批次或列印／另存 PDF。
6. 在「自訂資料庫」建立試劑或三類配方；自訂內容一律顯示未驗證標示。
7. 以 `dist/index.html?dev=1` 開啟開發者測試區。

詳細操作與資料行為見 `docs/v2-guide.md`。

## 科學與安全界線

本工具只提供理論計算與操作輔助，不取代 pH meter、試劑瓶標示、實驗室 SOP 或人工覆核。HCl／NaOH 實際滴定量、活度、離子強度、完整多質子平衡與多數溫度效應不在 V2 精確模型內。V2 記錄實際滴定與量測結果，但不自行判定合格。資料來源與限制記錄於 `docs/data-sources.md`。

所有自訂資料與配製紀錄只保存在開啟此檔案的瀏覽器儲存空間。V2 不提供 JSON／CSV 備份或匯入；重要紀錄請另存 PDF。清除瀏覽器資料後，PDF 無法還原為可編輯紀錄。
