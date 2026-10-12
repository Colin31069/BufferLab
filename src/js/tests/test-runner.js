(function (root) {
  "use strict";

  const app = root.BufferLab;

  function assert(condition, message) {
    if (!condition) throw new Error(message || "斷言失敗");
  }

  function assertApproxEqual(actual, expected, tolerance, message) {
    const scale = Math.max(1, Math.abs(actual), Math.abs(expected));
    if (Math.abs(actual - expected) > tolerance * scale) {
      throw new Error(`${message || "數值不符"}：預期 ${expected}，實際 ${actual}`);
    }
  }

  function run() {
    const tests = [];
    function test(name, callback) {
      try { callback(); tests.push({ name, passed: true }); }
      catch (error) { tests.push({ name, passed: false, error: error.message }); }
    }

    test("M 與 mM 單位轉換", () => assertApproxEqual(app.Units.toMolar(50, "mM"), 0.05, 1e-9));
    test("L、mL、µL 單位轉換", () => {
      assertApproxEqual(app.Units.toLiters(500, "mL"), 0.5, 1e-9);
      assertApproxEqual(app.Units.toLiters(1000, "µL"), 0.001, 1e-9);
    });
    test("PBS 體積縮放", () => {
      const result = app.StandardRecipeEngine.calculate({ volumeL: 0.5, strength: 1, purities: {}, reagentOverrides: {} }, app.Buffers.pbs);
      assertApproxEqual(result.components[0].moles, 0.0685, 1e-9);
    });
    test("1 L 1× PBS 範例", () => {
      const result = app.StandardRecipeEngine.calculate({ volumeL: 1, strength: 1, purities: {}, reagentOverrides: {} }, app.Buffers.pbs);
      assertApproxEqual(result.components[0].correctedMassG, 8.00628, 1e-9);
      assertApproxEqual(result.components[1].correctedMassG, 0.20128851, 1e-9);
    });
    test("500 mL 1× PBS 範例", () => {
      const result = app.StandardRecipeEngine.calculate({ volumeL: 0.5, strength: 1, purities: {}, reagentOverrides: {} }, app.Buffers.pbs);
      assertApproxEqual(result.components[0].correctedMassG, 4.00314, 1e-9);
    });
    test("Henderson–Hasselbalch pH=pKa 比例", () => {
      const buffer = app.Buffers.phosphate;
      const result = app.DynamicBufferEngine.calculate({ volumeL: 1, concentrationM: 0.1, pH: 7.21, temperatureC: 25, useStock: false, acidReagentId: "nah2po4", baseReagentId: "na2hpo4", acidPurity: 100, basePurity: 100 }, buffer);
      assertApproxEqual(result.calculation.ratio, 1, 1e-9);
      assertApproxEqual(result.calculation.acidConcentrationM + result.calculation.baseConcentrationM, 0.1, 1e-9);
    });
    test("Henderson–Hasselbalch 差一 pH 單位比例", () => {
      const result = app.DynamicBufferEngine.calculate({ volumeL: 1, concentrationM: 0.1, pH: 8.21, temperatureC: 25, useStock: false, acidReagentId: "nah2po4", baseReagentId: "na2hpo4", acidPurity: 100, basePurity: 100 }, app.Buffers.phosphate);
      assertApproxEqual(result.calculation.ratio, 10, 1e-9);
    });
    test("100 mL 0.1 M phosphate 範例", () => {
      const result = app.DynamicBufferEngine.calculate({ volumeL: 0.1, concentrationM: 0.1, pH: 7.2, temperatureC: 25, useStock: false, acidReagentId: "nah2po4", baseReagentId: "na2hpo4", acidPurity: 100, basePurity: 100 }, app.Buffers.phosphate);
      assertApproxEqual(result.components[0].moles + result.components[1].moles, 0.01, 1e-9);
    });
    test("空白 pH 與溫度會被拒絕，pH 0 仍可輸入", () => {
      const invalid = app.Validation.validateCommon({ volumeL: 1, concentrationM: 0.1, pH: NaN, temperatureC: NaN }, app.Buffers.phosphate);
      assert(invalid.some((item) => item.code === "INVALID_PH" && item.field === "ph"), "空白 pH 應報錯");
      assert(invalid.some((item) => item.code === "INVALID_TEMPERATURE" && item.field === "temperature"), "空白溫度應報錯");
      const zero = app.Validation.validateCommon({ volumeL: 1, concentrationM: 0.1, pH: 0, temperatureC: 25 }, app.Buffers.phosphate);
      assert(!app.Validation.hasErrors(zero), "明確輸入 pH 0 不應視為空值或錯誤");
    });
    test("1 L 50 mM Tris 範例", () => {
      const result = app.DynamicBufferEngine.calculate({ volumeL: 1, concentrationM: 0.05, pH: 8, temperatureC: 25, useStock: false, acidReagentId: "tris_hcl", baseReagentId: "tris", acidPurity: 100, basePurity: 100 }, app.Buffers["tris-buffer"]);
      assertApproxEqual(result.components[0].moles + result.components[1].moles, 0.05, 1e-9);
    });
    test("98% 純度校正", () => {
      const mass = app.Units.molesToMass(1, 100, 98);
      assertApproxEqual(mass.correctedG, 100 / 0.98, 1e-9);
    });
    test("無水物與水合物質量不同", () => {
      const dry = app.Units.molesToMass(0.1, app.Reagents.na2hpo4.molarMass, 100).correctedG;
      const hydrate = app.Units.molesToMass(0.1, app.Reagents.na2hpo4_7h2o.molarMass, 100).correctedG;
      assert(hydrate > dry, "七水合物質量應高於無水物");
    });
    test("庫存液體積", () => assertApproxEqual(app.Units.stockVolumeLiters(0.05, 1), 0.05, 1e-9));
    test("庫存液超過最終體積時被攔截", () => {
      const component = { reagent: app.Reagents.hepes, kind: "stock", stockVolumeL: 0.2 };
      const messages = app.Validation.validateResult({ components: [component] }, { volumeL: 0.1 });
      assert(app.Validation.hasErrors(messages), "超量庫存液應產生錯誤");
    });
    test("非法輸入被攔截", () => {
      const messages = app.Validation.validateCommon({ volumeL: 0, strength: 1 }, app.Buffers.pbs);
      assert(app.Validation.hasErrors(messages), "零體積應產生錯誤");
    });
    test("Tris 溫度修正與範圍", () => {
      const messages = [];
      assertApproxEqual(app.DynamicBufferEngine.calculatePka(app.Buffers["tris-buffer"], 37, messages).pKa, 7.724, 1e-9);
      const outMessages = [];
      assertApproxEqual(app.DynamicBufferEngine.calculatePka(app.Buffers["tris-buffer"], 50, outMessages).pKa, 8.06, 1e-9);
      assert(outMessages.some((item) => item.code === "TRIS_TEMPERATURE_RANGE"), "超界應警告");
    });
    test("非 Tris 溫度不會被無聲忽略", () => {
      const result = app.DynamicBufferEngine.calculate({ volumeL: 1, concentrationM: 0.02, pH: 7.4, temperatureC: 4, useStock: false, singlePurity: 100 }, app.Buffers.hepes);
      assert(result.calculation.temperatureApplied === false, "HEPES 不應宣稱已套用溫度修正");
      assert(result.messages.some((item) => item.code === "NO_TEMPERATURE_MODEL"), "非 25°C 應提示未套用溫度修正");
    });
    test("HEPES 不輸出精確滴定體積", () => {
      const result = app.DynamicBufferEngine.calculate({ volumeL: 0.5, concentrationM: 0.02, pH: 7.4, temperatureC: 25, useStock: false, singlePurity: 100 }, app.Buffers.hepes);
      assert(result.components.every((item) => item.stockVolumeL == null), "固體模式不應產生滴定體積");
      assert(result.messages.some((item) => item.code === "TITRATION_REQUIRED"), "應要求實測滴定");
      assertApproxEqual(result.components[0].correctedMassG, 2.383, 1e-9);
    });
    test("庫存液 SOP 起始水量會為液體體積預留空間", () => {
      const result = app.DynamicBufferEngine.calculate({ volumeL: 1, concentrationM: 0.1, pH: 7.21, temperatureC: 25, useStock: true, acidReagentId: "nah2po4", baseReagentId: "na2hpo4", acidStockM: 0.2, baseStockM: 0.2 }, app.Buffers.phosphate);
      const liquidVolumeL = result.components.reduce((sum, item) => sum + (item.stockVolumeL || item.volumeL || 0), 0);
      assertApproxEqual(liquidVolumeL, 0.5, 1e-9);
      const text = app.Renderer.toPlainText(result);
      assert(text.includes("先加入約 400 mL DI water"), "半體積庫存液應把起始水量由 800 mL 降至 400 mL");
      assert(text.includes("已先為 500 mL 的液體試劑預留空間"), "SOP 應說明已知液體試劑的體積預留");
      assert(text.includes("固體溶解後的體積變化無法由本工具推算"), "SOP 不可宣稱能精算固體造成的體積變化");
    });
    test("變更條件會清除可用的舊結果", () => {
      const original = app.ResultState.get();
      try {
        const previous = { buffer: { name: "舊配方" } };
        app.ResultState.set(previous);
        assert(app.ResultState.get() === previous, "目前結果應可供複製與列印");
        assert(app.ResultState.clear(), "清除應回報原本有結果");
        assert(app.ResultState.get() === null, "清除後不可再取得舊結果");
        assert(!app.ResultState.clear(), "重複清除不可再回報舊結果");
      } finally {
        if (original) app.ResultState.set(original); else app.ResultState.clear();
      }
    });
    test("舊結果提醒只在結果失效後、重算前顯示", () => {
      const notice = app.ResultState.shouldShowStaleNotice;
      assert(!notice(false, false, false), "首次載入不應顯示提醒");
      assert(notice(true, true, false), "成功計算後修改條件應顯示提醒");
      assert(notice(true, false, true), "連續修改時提醒應保持顯示");
      assert(!notice(false, false, true), "開始重算時應清除提醒");
      assert(!notice(true, false, false), "沒有舊結果時無效輸入不應顯示過期提醒");
    });
    test("localStorage 歷史限制為 10 筆並可還原", () => {
      const key = app.Constants.STORAGE_KEYS.history;
      const original = root.localStorage.getItem(key);
      try {
        root.localStorage.setItem(key, "[]");
        for (let index = 0; index < 12; index += 1) app.Storage.addHistory({ id: String(index) });
        assert(app.Storage.getHistory().length === 10, "歷史紀錄應限制為 10 筆");
      } finally {
        if (original == null) root.localStorage.removeItem(key);
        else root.localStorage.setItem(key, original);
      }
    });
    test("V2 結果包含完整追溯快照", () => {
      const result = app.StandardRecipeEngine.calculate({ volumeL: 1, strength: 1, purities: {}, reagentOverrides: {} }, app.Buffers.pbs);
      assert(result.schemaVersion === 2, "結果 schema 應為 V2");
      assert(result.provenance.recipeSnapshot.id === "pbs", "應保存配方快照");
      assert(result.provenance.reagentSnapshots.length === result.components.length, "應保存所有試劑快照");
      assert(result.provenance.recipeStatus === "verified", "內建配方應標示已驗證");
    });
    test("質量單位轉換", () => {
      assertApproxEqual(app.Units.toGrams(250, "mg"), 0.25, 1e-9);
      assertApproxEqual(app.Units.fromGrams(0.001, "µg"), 1000, 1e-9);
    });
    test("自訂來源連結拒絕危險協定", () => {
      let rejected = false;
      try { app.Library.safeUrl("javascript:alert(1)"); } catch (_error) { rejected = true; }
      assert(rejected, "javascript URL 必須被拒絕");
      assert(app.Formatter.escapeHtml("<img onerror=1>").includes("&lt;"), "自訂文字必須可安全轉義");
    });
    test("自訂固定配方可縮放", () => {
      const recipe = app.Library.validateRecipe({ name: "測試固定配方", modelType: "standard", defaultPH: 7, baseVolumeL: 1, baseStrength: 1, components: [{ reagentId: "nacl", kind: "moles", amount: 0.1 }] });
      const result = app.StandardRecipeEngine.calculate({ volumeL: 0.5, strength: 1, purities: {}, reagentOverrides: {} }, recipe);
      assertApproxEqual(result.components[0].moles, 0.05, 1e-9);
      assert(result.provenance.recipeStatus === "user-unverified", "自訂配方必須標示未驗證");
    });
    test("自訂成對與滴定模型可計算", () => {
      const paired = app.Library.validateRecipe({ name: "測試成對配方", modelType: "paired", defaultPH: 7.2, defaultConcentrationM: 0.1, pKa25: 7.2, rangeLow: 6.2, rangeHigh: 8.2, acidReagentId: "nah2po4", baseReagentId: "na2hpo4", acidLabel: "Acid", baseLabel: "Base" });
      const pairedResult = app.DynamicBufferEngine.calculate({ volumeL: 1, concentrationM: 0.1, pH: 7.2, temperatureC: 25, useStock: false, acidReagentId: "nah2po4", baseReagentId: "na2hpo4", acidPurity: 100, basePurity: 100 }, paired);
      assertApproxEqual(pairedResult.calculation.ratio, 1, 1e-9);
      const titration = app.Library.validateRecipe({ name: "測試滴定配方", modelType: "titration", defaultPH: 7.4, defaultConcentrationM: 0.02, pKa25: 7.56, rangeLow: 6.8, rangeHigh: 8.2, reagentId: "hepes", acidLabel: "HEPES-H", baseLabel: "HEPES-" });
      const titrationResult = app.DynamicBufferEngine.calculate({ volumeL: 0.1, concentrationM: 0.02, pH: 7.4, temperatureC: 25, useStock: false, singlePurity: 100 }, titration);
      assert(titrationResult.messages.some((item) => item.code === "TITRATION_REQUIRED"), "滴定模式應保留實測提醒");
    });
    test("配製紀錄可修改並保留修訂次數與快照", () => {
      const key = app.Constants.STORAGE_KEYS.records;
      const original = root.localStorage.getItem(key);
      try {
        root.localStorage.setItem(key, "[]");
        const result = app.StandardRecipeEngine.calculate({ volumeL: 1, strength: 1, purities: {}, reagentOverrides: {} }, app.Buffers.pbs);
        const first = app.Records.save({ title: "PBS 批次", result, components: [] });
        const second = app.Records.save(Object.assign({}, first, { title: "PBS 批次修訂" }));
        assert(second.id === first.id, "修改時不可更換 ID");
        assert(second.revision === 2, "修改後修訂次數應增加");
        assert(second.result.provenance.recipeSnapshot.name === app.Buffers.pbs.name, "紀錄應保存配方快照");
      } finally {
        if (original == null) root.localStorage.removeItem(key); else root.localStorage.setItem(key, original);
      }
    });
    test("複製批次會建立新 ID", () => {
      const key = app.Constants.STORAGE_KEYS.records;
      const original = root.localStorage.getItem(key);
      try {
        root.localStorage.setItem(key, "[]");
        const result = app.StandardRecipeEngine.calculate({ volumeL: 1, strength: 1, purities: {}, reagentOverrides: {} }, app.Buffers.pbs);
        const source = app.Records.save({ title: "來源批次", result, components: [] });
        const copy = app.Records.duplicate(source.id);
        assert(copy.id !== source.id, "副本必須使用新 ID");
        assert(copy.revision === 1, "副本修訂應從 1 開始");
      } finally {
        if (original == null) root.localStorage.removeItem(key); else root.localStorage.setItem(key, original);
      }
    });
    test("V1 遷移可重複執行且不重複資料", () => {
      const v2History = app.Constants.STORAGE_KEYS.history;
      const migrated = app.Constants.STORAGE_KEYS.migrated;
      const v1History = app.Constants.LEGACY_STORAGE_KEYS.history;
      const backup = [v2History, migrated, v1History].map((key) => [key, root.localStorage.getItem(key)]);
      try {
        root.localStorage.removeItem(v2History);
        root.localStorage.removeItem(migrated);
        root.localStorage.setItem(v1History, JSON.stringify([{ id: "legacy-one", state: { bufferKey: "pbs" } }]));
        app.Storage.migrateV1();
        app.Storage.migrateV1();
        assert(app.Storage.getHistory().filter((item) => item.id === "legacy-one").length === 1, "遷移不得產生重複紀錄");
        assert(root.localStorage.getItem(v1History) != null, "遷移不得刪除 V1 資料");
      } finally {
        backup.forEach(([key, value]) => { if (value == null) root.localStorage.removeItem(key); else root.localStorage.setItem(key, value); });
      }
    });
    test("損壞的本機資料不阻止啟動", () => {
      const key = app.Constants.STORAGE_KEYS.records;
      const original = root.localStorage.getItem(key);
      try {
        root.localStorage.setItem(key, "{not-json");
        assert(Array.isArray(app.Storage.getRecords()) && app.Storage.getRecords().length === 0, "損壞資料應回復空集合");
      } finally {
        if (original == null) root.localStorage.removeItem(key); else root.localStorage.setItem(key, original);
      }
    });
    test("無效實測 pH 被 schema 拒絕", () => {
      const result = app.StandardRecipeEngine.calculate({ volumeL: 1, strength: 1, purities: {}, reagentOverrides: {} }, app.Buffers.pbs);
      let rejected = false;
      try { app.Records.save({ title: "錯誤紀錄", result, measuredPH: 15, components: [] }); } catch (_error) { rejected = true; }
      assert(rejected, "超出範圍的實測 pH 必須被拒絕");
    });
    test("TAE 固定質量與固定體積縮放", () => {
      const result = app.StandardRecipeEngine.calculate({ volumeL: 1, strength: 1, purities: {}, reagentOverrides: {} }, app.Buffers.tae);
      assertApproxEqual(result.components[0].theoreticalMassG, 4.84, 1e-9);
      assert(result.components[1].kind === "volume" && result.components[2].kind === "volume", "液體組成應使用 volume 類型");
      assertApproxEqual(result.components[1].volumeL, 0.001142, 1e-9);
      assertApproxEqual(result.components[2].volumeL, 0.002, 1e-9);
    });
    test("TBE 固定質量與固定體積縮放", () => {
      const result = app.StandardRecipeEngine.calculate({ volumeL: 1, strength: 0.5, purities: {}, reagentOverrides: {} }, app.Buffers.tbe);
      assertApproxEqual(result.components[0].theoreticalMassG, 5.4, 1e-9);
      assertApproxEqual(result.components[1].theoreticalMassG, 2.75, 1e-9);
      assert(result.components[2].kind === "volume", "EDTA 應使用 volume 類型");
      assertApproxEqual(result.components[2].volumeL, 0.002, 1e-9);
    });
    test("水合物切換會改用正確的分子量與快照", () => {
      const result = app.StandardRecipeEngine.calculate({ volumeL: 1, strength: 1, purities: {}, reagentOverrides: { na2hpo4: "na2hpo4_7h2o" } }, app.Buffers.pbs);
      const component = result.components.find((item) => item.reagent.id === "na2hpo4_7h2o");
      assert(component, "應使用七水合物");
      assertApproxEqual(component.theoreticalMassG, 2.14456, 1e-9);
      assert(result.provenance.reagentSnapshots.some((item) => item.id === "na2hpo4_7h2o"), "快照應保存實際使用的水合物");
      assert(result.components.filter((item) => item.reagent.id !== "na2hpo4_7h2o").length === 3, "其他組成不應受影響");
    });
    test("液體試劑體積總和超過最終體積時被攔截", () => {
      const excessive = app.StandardRecipeEngine.calculate({ volumeL: 1, strength: 500, purities: {}, reagentOverrides: {} }, app.Buffers.tae);
      const normal = app.StandardRecipeEngine.calculate({ volumeL: 1, strength: 1, purities: {}, reagentOverrides: {} }, app.Buffers.tae);
      assert(app.Validation.hasErrors(app.Validation.validateResult(excessive, { volumeL: 1 })), "超量液體應產生錯誤");
      assert(!app.Validation.hasErrors(app.Validation.validateResult(normal, { volumeL: 1 })), "正常配方不可誤判");
    });
    test("內建配方的 key 必須等於 id", () => {
      Object.entries(app.Buffers).forEach(([key, buffer]) => assert(key === buffer.id, `配方 key 不一致：${key}`));
    });
    test("每個內建試劑都有化學式或明確說明", () => {
      Object.values(app.Reagents).forEach((reagent) => assert(typeof reagent.formula === "string" && reagent.formula.trim() && reagent.formula !== "—", `試劑缺少化學式：${reagent.id}`));
    });
    test("SSC 可切換無水檸檬酸三鈉", () => {
      const hydrated = app.StandardRecipeEngine.calculate({ volumeL: 1, strength: 1, purities: {}, reagentOverrides: {} }, app.Buffers.ssc);
      const anhydrous = app.StandardRecipeEngine.calculate({ volumeL: 1, strength: 1, purities: {}, reagentOverrides: { sodium_citrate_2h2o: "sodium_citrate" } }, app.Buffers.ssc);
      const hydratedComponent = hydrated.components.find((item) => item.reagent.id === "sodium_citrate_2h2o");
      const anhydrousComponent = anhydrous.components.find((item) => item.reagent.id === "sodium_citrate");
      assert(anhydrousComponent.correctedMassG < hydratedComponent.correctedMassG, "無水鹽質量應較小");
      assertApproxEqual(anhydrousComponent.correctedMassG / hydratedComponent.correctedMassG, 258.07 / 294.10, 1e-9);
    });
    test("KH₂PO₄／Na₂HPO₄ phosphate 配方符合近似前提", () => {
      const buffer = app.Buffers["phosphate-kh2po4"];
      const result = app.DynamicBufferEngine.calculate({ volumeL: 1, concentrationM: 0.1, pH: 7.2, temperatureC: 25, useStock: false, acidReagentId: "kh2po4", baseReagentId: "na2hpo4", acidPurity: 100, basePurity: 100 }, buffer);
      assertApproxEqual(result.components[0].moles + result.components[1].moles, 0.1, 1e-9);
      assert(result.components.every((item) => !["nacl", "kcl"].includes(item.reagent.id)), "配方不可包含 NaCl 或 KCl");
      assert(result.messages.some((item) => item.code === "POLYPROTIC_APPROXIMATION"), "應提示多質子近似");
    });
    test("兩個 phosphate 配方都提示多質子近似", () => {
      [app.Buffers.phosphate, app.Buffers["phosphate-kh2po4"]].forEach((buffer) => {
        const acid = buffer.dynamic.acidOptions[0];
        const result = app.DynamicBufferEngine.calculate({ volumeL: 1, concentrationM: 0.1, pH: 7.2, temperatureC: 25, useStock: false, acidReagentId: acid, baseReagentId: "na2hpo4", acidPurity: 100, basePurity: 100 }, buffer);
        assert(result.messages.some((item) => item.code === "POLYPROTIC_APPROXIMATION"), `${buffer.id} 應提示多質子近似`);
      });
    });
    test("刪除自訂配方不影響既有紀錄快照", () => {
      const recipeKey = app.Constants.STORAGE_KEYS.customRecipes;
      const recordKey = app.Constants.STORAGE_KEYS.records;
      const recipeBackup = root.localStorage.getItem(recipeKey);
      const recordBackup = root.localStorage.getItem(recordKey);
      try {
        root.localStorage.setItem(recipeKey, "[]");
        root.localStorage.setItem(recordKey, "[]");
        const recipe = app.Library.saveRecipe({ name: "可刪除配方", modelType: "standard", defaultPH: 7, baseVolumeL: 1, baseStrength: 1, components: [{ reagentId: "nacl", kind: "moles", amount: 0.1 }] });
        const result = app.StandardRecipeEngine.calculate({ volumeL: 1, strength: 1, purities: {}, reagentOverrides: {} }, recipe);
        const record = app.Records.save({ title: "快照紀錄", result, components: [] });
        app.Library.deleteRecipe(recipe.id);
        assert(app.Records.get(record.id).result.provenance.recipeSnapshot.name === "可刪除配方", "紀錄快照應保留");
      } finally {
        if (recipeBackup == null) root.localStorage.removeItem(recipeKey); else root.localStorage.setItem(recipeKey, recipeBackup);
        if (recordBackup == null) root.localStorage.removeItem(recordKey); else root.localStorage.setItem(recordKey, recordBackup);
      }
    });

    const passed = tests.filter((item) => item.passed).length;
    return { tests, passed, failed: tests.length - passed, total: tests.length };
  }

  function render(container) {
    const result = run();
    document.documentElement.dataset.testStatus = result.failed === 0 ? "passed" : "failed";
    container.innerHTML = `<p class="${result.failed === 0 ? "test-pass" : "test-fail"}"><strong>${result.passed}/${result.total} 通過</strong></p><ul>${result.tests.map((item) => `<li class="${item.passed ? "test-pass" : "test-fail"}">${item.passed ? "✓" : "✕"} ${app.Formatter.escapeHtml(item.name)}${item.error ? `：${app.Formatter.escapeHtml(item.error)}` : ""}</li>`).join("")}</ul>`;
    return result;
  }

  app.TestRunner = Object.freeze({ assertApproxEqual, run, render });
})(window);
