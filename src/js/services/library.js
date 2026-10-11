(function (root) {
  "use strict";

  const app = root.BufferLab;
  const allowedProtocols = Object.freeze(["http:", "https:"]);
  // V2 早期 history 的 state.bufferKey 使用 tris；僅保留讀取相容性，新程式碼應使用 tris-buffer。
  const legacyBufferKeys = Object.freeze({ tris: "tris-buffer" });

  function uid(prefix) {
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
  }

  function safeText(value, maximum, label) {
    const text = String(value == null ? "" : value).trim();
    if (!text) throw new Error(`${label}不可空白。`);
    if (text.length > maximum) throw new Error(`${label}不可超過 ${maximum} 個字元。`);
    return text;
  }

  function optionalText(value, maximum, label) {
    const text = String(value == null ? "" : value).trim();
    if (text.length > maximum) throw new Error(`${label}不可超過 ${maximum} 個字元。`);
    return text;
  }

  function safeUrl(value) {
    const text = optionalText(value, 500, "來源連結");
    if (!text) return "";
    let parsed;
    try { parsed = new URL(text); } catch (_error) { throw new Error("來源連結格式不正確。"); }
    if (!allowedProtocols.includes(parsed.protocol)) throw new Error("來源連結只接受 http 或 https。");
    return parsed.href;
  }

  function finitePositive(value, label, allowZero) {
    const number = Number(value);
    if (!Number.isFinite(number) || (allowZero ? number < 0 : number <= 0)) throw new Error(`${label}必須是${allowZero ? "非負" : "大於 0 的"}數值。`);
    return number;
  }

  function validateReagent(input, existing) {
    const physicalForm = ["solid", "liquid", "stock"].includes(input.physicalForm) ? input.physicalForm : "solid";
    const molarMass = input.molarMass === "" || input.molarMass == null ? null : finitePositive(input.molarMass, "分子量");
    if (physicalForm === "solid" && molarMass == null) throw new Error("固體試劑必須填寫分子量。");
    const purity = finitePositive(input.purityDefault == null ? 100 : input.purityDefault, "預設純度");
    if (purity > 100) throw new Error("預設純度不可超過 100%。");
    return {
      schemaVersion: 2,
      id: existing ? existing.id : uid("reagent"),
      zhName: safeText(input.zhName, 120, "中文名稱"),
      enName: optionalText(input.enName, 120, "英文名稱"),
      formula: optionalText(input.formula, 80, "化學式") || "—",
      cas: optionalText(input.cas, 80, "CAS") || "—",
      molarMass,
      physicalForm,
      unit: physicalForm === "solid" ? "g" : "mL",
      hydration: optionalText(input.hydration, 80, "水合型態") || "unspecified",
      purityDefault: purity,
      sourceNote: optionalText(input.sourceNote, 500, "來源備註"),
      sourceUrl: safeUrl(input.sourceUrl),
      notes: "使用者自訂試劑；使用前請核對試劑瓶標示。",
      status: "user-unverified",
      builtIn: false,
      version: existing ? existing.version + 1 : 1,
      createdAt: existing ? existing.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  function allReagents() {
    const merged = Object.assign({}, app.Reagents);
    app.Storage.getCustomReagents().forEach((item) => { if (item && item.schemaVersion === 2 && item.id && item.zhName && item.status === "user-unverified") merged[item.id] = item; });
    return merged;
  }

  function getReagent(id) { return allReagents()[id] || null; }

  function validateComponent(component) {
    const reagent = getReagent(component.reagentId);
    if (!reagent) throw new Error("配方包含不存在的試劑。");
    const kinds = ["moles", "fixedMass", "fixedVolume", "stock"];
    if (!kinds.includes(component.kind)) throw new Error("配方組成類型不正確。");
    const amount = finitePositive(component.amount, `${reagent.zhName} 用量`);
    if (component.kind === "moles" && !Number.isFinite(reagent.molarMass)) throw new Error(`${reagent.zhName} 缺少分子量，不能以莫耳數計算。`);
    if (component.kind === "fixedMass" && reagent.physicalForm !== "solid") throw new Error(`${reagent.zhName} 不是固體試劑，不能使用固定質量。`);
    if ((component.kind === "fixedVolume" || component.kind === "stock") && reagent.physicalForm === "solid") throw new Error(`${reagent.zhName} 是固體試劑，不能使用固定體積。`);
    const defaults = { moles: "mol", fixedMass: "g", fixedVolume: "mL", stock: "mL" };
    return { reagentId: reagent.id, kind: component.kind, amount, unit: defaults[component.kind] };
  }

  function validateRecipe(input, existing) {
    const modelType = ["standard", "paired", "titration"].includes(input.modelType) ? input.modelType : "standard";
    const base = {
      schemaVersion: 2,
      id: existing ? existing.id : uid("recipe"),
      name: safeText(input.name, 120, "配方名稱"),
      defaultPH: finitePositive(input.defaultPH, "預設 pH", true),
      referenceNote: optionalText(input.referenceNote, 500, "來源備註") || "使用者自訂配方，未經 BufferLab 驗證。",
      sourceUrl: safeUrl(input.sourceUrl),
      status: "user-unverified",
      builtIn: false,
      version: existing ? existing.version + 1 : 1,
      createdAt: existing ? existing.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    if (base.defaultPH > 14) throw new Error("預設 pH 必須介於 0 與 14。 ");

    if (modelType === "standard") {
      const components = (input.components || []).map(validateComponent);
      if (!components.length) throw new Error("標準配方至少需要一項試劑。 ");
      base.mode = "standard";
      base.standardRecipe = {
        baseVolumeL: finitePositive(input.baseVolumeL, "基準體積"),
        baseStrength: finitePositive(input.baseStrength, "基準倍數"),
        strengthOptions: [1],
        components
      };
    } else {
      const pKa25 = finitePositive(input.pKa25, "pKa", true);
      const rangeLow = finitePositive(input.rangeLow, "有效範圍下限", true);
      const rangeHigh = finitePositive(input.rangeHigh, "有效範圍上限", true);
      if (pKa25 > 14 || rangeHigh > 14 || rangeLow >= rangeHigh) throw new Error("pKa 或有效範圍不正確。 ");
      base.mode = "dynamic";
      base.defaultConcentrationM = finitePositive(input.defaultConcentrationM, "預設濃度");
      base.dynamic = {
        strategy: modelType,
        pKa25,
        usefulRange: [rangeLow, rangeHigh],
        acidLabel: optionalText(input.acidLabel, 80, "酸型標籤") || "Acid",
        baseLabel: optionalText(input.baseLabel, 80, "鹼型標籤") || "Base"
      };
      if (modelType === "paired") {
        if (!getReagent(input.acidReagentId) || !getReagent(input.baseReagentId)) throw new Error("請選擇有效的酸型與鹼型試劑。 ");
        base.dynamic.acidOptions = [input.acidReagentId];
        base.dynamic.baseOptions = [input.baseReagentId];
      } else {
        if (!getReagent(input.reagentId)) throw new Error("請選擇有效的緩衝劑。 ");
        base.dynamic.reagentId = input.reagentId;
      }
      if (input.temperatureCoefficient !== "" && input.temperatureCoefficient != null) {
        const coefficient = Number(input.temperatureCoefficient);
        if (!Number.isFinite(coefficient)) throw new Error("溫度係數必須是有限數值。 ");
        base.dynamic.temperatureCoefficient = coefficient;
        base.dynamic.temperatureRange = [finitePositive(input.temperatureLow, "溫度下限", true), finitePositive(input.temperatureHigh, "溫度上限", true)];
        if (base.dynamic.temperatureRange[0] >= base.dynamic.temperatureRange[1]) throw new Error("溫度適用範圍不正確。 ");
      }
    }
    return base;
  }

  function saveReagent(input) {
    const items = app.Storage.getCustomReagents();
    const index = items.findIndex((item) => item.id === input.id);
    const saved = validateReagent(input, index >= 0 ? items[index] : null);
    if (index >= 0) items[index] = saved; else items.push(saved);
    if (!app.Storage.setCustomReagents(items)) throw new Error(app.Storage.getLastError());
    return saved;
  }

  function saveRecipe(input) {
    const items = app.Storage.getCustomRecipes();
    const index = items.findIndex((item) => item.id === input.id);
    const saved = validateRecipe(input, index >= 0 ? items[index] : null);
    if (index >= 0) items[index] = saved; else items.push(saved);
    if (!app.Storage.setCustomRecipes(items)) throw new Error(app.Storage.getLastError());
    return saved;
  }

  function deleteReagent(id) {
    if (app.Reagents[id]) throw new Error("內建試劑不可刪除。 ");
    if (app.Storage.getCustomRecipes().some((recipe) => JSON.stringify(recipe).includes(`\"${id}\"`))) throw new Error("此試劑仍被自訂配方使用，請先修改配方。 ");
    return app.Storage.setCustomReagents(app.Storage.getCustomReagents().filter((item) => item.id !== id));
  }

  function deleteRecipe(id) {
    if (app.Buffers[id]) throw new Error("內建配方不可刪除。 ");
    return app.Storage.setCustomRecipes(app.Storage.getCustomRecipes().filter((item) => item.id !== id));
  }

  function allBuffers() {
    const merged = Object.assign({}, app.Buffers);
    app.Storage.getCustomRecipes().forEach((item) => { if (item && item.schemaVersion === 2 && item.id && item.name && ["standard", "dynamic"].includes(item.mode) && item.status === "user-unverified") merged[item.id] = item; });
    return merged;
  }

  function getBuffer(id) {
    const buffers = allBuffers();
    return buffers[id] || buffers[legacyBufferKeys[id]] || null;
  }

  app.Library = Object.freeze({
    uid, safeUrl, validateReagent, validateRecipe, allReagents, getReagent,
    allBuffers, getBuffer, saveReagent, saveRecipe, deleteReagent, deleteRecipe
  });
})(window);
