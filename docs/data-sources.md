# 科學資料來源台帳

資料審查日期：2026-08-04。應用定位為研究實驗室計算輔助，不是臨床或受規管系統。V2 未修改下列內建配方的科學基準，只增加來源快照、版本與實測紀錄。

## 標準配方

| 配方 | V1 基準 | 使用資料 | 狀態 |
| --- | --- | --- | --- |
| PBS | Thermo Fisher BestProtocols / 10X PBS product information | 1×：137 mM NaCl、2.7 mM KCl、8 mM Na₂HPO₄、2 mM KH₂PO₄；建議 pH 7.4 | 已核對，介面註明不同機構可能有差異 |
| TBS | Thermo Fisher BestProtocols | 1×：50 mM Tris、150 mM NaCl；pH 7.4 | 已核對 |
| TAE | Bio-Rad Bulletin 6230 | 1 L 50×：242 g Tris、57.1 mL glacial acetic acid、100 mL 0.5 M EDTA pH 8.0 | 已核對 |
| TBE | Bio-Rad Bulletin 6230 | 1 L 10×：108 g Tris、55 g boric acid、40 mL 0.5 M EDTA pH 8.0 | 已核對 |
| SSC | Thermo Fisher 20X SSC information | 20×：3 M NaCl、0.3 M sodium citrate；pH 7.0 | 已核對 |

## 動態緩衝液

| 系統 | V1 模型 | 25°C pKa／範圍 | 限制 |
| --- | --- | --- | --- |
| Phosphate | H₂PO₄⁻ / HPO₄²⁻ 成對試劑 | 7.21；建議 6.2–8.2 | 單一步驟近似，未完整處理活度與多重解離 |
| Phosphate（KH₂PO₄ / Na₂HPO₄） | KH₂PO₄ / Na₂HPO₄ 成對試劑 | 7.21；建議 6.2–8.2 | 第二解離步驟近似；不含 NaCl 或 KCl，未完整處理活度與多重解離 |
| Tris | Tris-HCl / Tris 成對試劑 | 8.06；建議 7.0–9.0 | 5–37°C 使用 -0.028 pKa/°C；仍需實測 |
| HEPES | 自由酸總量加實測滴定 | 7.56；建議 6.8–8.2 | 不估算精確 HCl／NaOH 體積 |
| MES | 自由酸總量加實測滴定 | 6.27；建議 5.5–6.7 | 不估算精確 HCl／NaOH 體積 |
| MOPS | 自由酸總量加實測滴定 | 7.18；建議 6.5–7.9 | 不估算精確 HCl／NaOH 體積 |

## 主要來源

- Thermo Fisher Scientific, BestProtocols: ICC Unfixed Cells—Direct Method: https://www.thermofisher.com/tw/zt/home/references/protocols/cell-and-tissue-analysis/protocols/icc-unfixed-cells-direct-method.html
- Thermo Fisher Scientific, 20X SSC Product Information: https://documents.thermofisher.com/TFS-Assets/LSG/manuals/sp_9762.pdf
- Bio-Rad, Recipes for TAE and TBE Electrophoresis Buffers, Bulletin 6230: https://www.bio-rad.com/webroot/web/pdf/lsr/literature/Bulletin_6230.pdf
- MilliporeSigma, Biological Buffers Selection Guide: https://www.sigmaaldrich.com/deepweb/assets/sigmaaldrich/marketing/global/documents/101/257/biological-buffers-selection-guide-ps3138en-ms.pdf
- NIH PubChem Compound Database: https://pubchem.ncbi.nlm.nih.gov/

## 本次資料異動

- 新增無水檸檬酸三鈉（Na₃C₆H₅O₇，258.07 g/mol；CAS 68-04-2），供 SSC 配方切換使用；分子量與化學式依 NIH PubChem 核對。
- 0.5 M EDTA（pH 8.0）庫存液改為明確標示「無單一化學式」，未改動配方組成或體積。
- 新增 KH₂PO₄／Na₂HPO₄ phosphate buffer，採 MilliporeSigma Biological Buffers Selection Guide 的磷酸鹽第二解離 pKa 25°C 近似值 7.21；不包含 NaCl 或 KCl。

## 維護規則

- 分子量、水合型態、pKa 或配方變更時，必須同步更新資料版本、來源台帳與數值測試。
- 不同來源衝突時不合併平均值；選定單一資料集並保留其溫度、濃度與試劑型態條件。
- 無可靠溶解度資料時不建立自動上限，只顯示「未評估溶解度」。
- 內建配方與試劑為唯讀、`verified`；自訂資料固定標示 `user-unverified`，不得冒用內建驗證狀態。
- 配製紀錄保存當時計算使用的配方、試劑及來源快照；日後資料庫變更不得回寫既有紀錄。
- 實際 pH、溫度、用量及滴定體積由使用者記錄；系統只顯示理論差異，不建立通用合格門檻。
