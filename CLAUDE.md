# CLAUDE.md

本專案的開發指引集中在 AGENTS.md，避免兩份文件內容分歧。請完整閱讀：

@AGENTS.md

## 給 Claude Code 的補充

- **環境**：Windows + PowerShell。建置腳本是 `.ps1`，路徑用反斜線。專案沒有 npm、沒有 node_modules、沒有 CI。
- **驗證改動的最短路徑**：跑 `tools/build.ps1`。它自帶 headless Edge 測試，測試沒過就不會寫出 `dist/index.html`，所以「建置成功」等同「28 項測試通過」。不需要另外找測試指令。
- **不要手動編輯 `dist/index.html`**。它是 `src/` 的串接產物，任何直接修改都會在下次建置時被覆蓋。
- **改完一定要重新建置並把 `dist/index.html` 一起 commit**。只改 `src/` 而沒有重建，等於使用者拿到的檔案沒有變。
- **新增 `src/js/**` 的檔案時**，必須同時加進 `tools/build.ps1` 的 `$scriptFiles` 陣列（順序有意義），否則不會被打包。
- **想在瀏覽器裡驗證某個行為**時，可以複製 `dist/index.html` 到暫存目錄，在 `</body>` 前插入一段探測 script，然後用
  `msedge --headless --disable-gpu --dump-dom "file:///...?dev=1"` 把結果讀回來（例如寫進 `document.title`）。不要為了除錯而改動 repo 內的檔案。
- **回覆與程式碼註解、UI 字串一律使用繁體中文（台灣用語）。**
