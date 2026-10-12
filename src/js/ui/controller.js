(function (root) {
  "use strict";

  const app = root.BufferLab;
  const F = app.Formatter;
  const hydrateGroups = Object.freeze({
    na2hpo4: ["na2hpo4", "na2hpo4_2h2o", "na2hpo4_7h2o", "na2hpo4_12h2o"],
    sodium_citrate_2h2o: ["sodium_citrate_2h2o", "sodium_citrate"]
  });

  let elements;

  function byId(id) { return document.getElementById(id); }
  function setHidden(element, hidden) { element.hidden = Boolean(hidden); }

  function cacheElements() {
    elements = {
      form: byId("buffer-form"), buffer: byId("buffer-select"), bufferHelp: byId("buffer-help"), mode: byId("mode-display"),
      volume: byId("volume-input"), volumeUnit: byId("volume-unit"), strength: byId("strength-input"), pH: byId("ph-input"),
      concentration: byId("concentration-input"), concentrationUnit: byId("concentration-unit"), temperature: byId("temperature-input"),
      prepMethod: byId("prep-method"), standardFields: byId("standard-fields"), phField: byId("ph-field"), concentrationField: byId("concentration-field"),
      temperatureField: byId("temperature-field"), prepMethodField: byId("prep-method-field"), pairedSettings: byId("paired-settings"),
      standardReagentSettings: byId("standard-reagent-settings"), standardReagentList: byId("standard-reagent-list"), singleSettings: byId("single-settings"),
      acidReagent: byId("acid-reagent"), baseReagent: byId("base-reagent"), singleReagent: byId("single-reagent"),
      acidPurity: byId("acid-purity"), basePurity: byId("base-purity"), singlePurity: byId("single-purity"),
      acidStock: byId("acid-stock"), baseStock: byId("base-stock"), singleStock: byId("single-stock"),
      resultPanel: byId("result-panel"), recipeOutput: byId("recipe-output"), messages: byId("message-summary"),
      historyList: byId("history-list"), example: byId("example-select"), theme: byId("theme-toggle"), tests: byId("developer-tests"), storageNotice: byId("storage-notice"),
      resultActions: byId("result-actions"), resultStaleNotice: byId("result-stale-notice"), historyCount: byId("history-count")
    };
  }

  function selectedBufferEntry() {
    return { key: elements.buffer.value, buffer: app.Library.getBuffer(elements.buffer.value) };
  }

  function fillSelect(select, reagentIds) {
    select.innerHTML = reagentIds.map((id) => {
      const reagent = app.Library.getReagent(id);
      return `<option value="${F.escapeHtml(id)}">${F.escapeHtml(reagent.zhName)}｜${F.escapeHtml(reagent.formula)}｜${F.number(reagent.molarMass, 3)} g/mol</option>`;
    }).join("");
  }

  function renderStandardReagents(buffer) {
    elements.standardReagentList.innerHTML = buffer.standardRecipe.components.map((component) => {
      const reagent = app.Library.getReagent(component.reagentId);
      const variants = hydrateGroups[component.reagentId];
      const selector = variants ? `<select data-standard-reagent="${F.escapeHtml(component.reagentId)}">${variants.map((id) => {
        const item = app.Library.getReagent(id);
        return `<option value="${F.escapeHtml(id)}">${F.escapeHtml(item.zhName)}｜${F.escapeHtml(item.formula)}｜${F.number(item.molarMass, 3)} g/mol</option>`;
      }).join("")}</select>` : `<input type="text" value="${F.escapeHtml(reagent.zhName)}｜${F.escapeHtml(reagent.formula)}" readonly>`;
      const purity = reagent.physicalForm === "solid" ? `<label>純度<div class="input-suffix"><input data-standard-purity="${F.escapeHtml(component.reagentId)}" type="number" min="0.01" max="100" step="0.01" value="${reagent.purityDefault}"><span>%</span></div></label>` : `<p class="field-help">依來源配方以體積量取。</p>`;
      return `<div class="field"><label>${F.escapeHtml(reagent.zhName)}</label>${selector}${purity}</div>`;
    }).join("");
  }

  function updatePrepUI() {
    const useStock = elements.prepMethod.value === "stock";
    document.querySelectorAll(".solid-only").forEach((node) => node.classList.toggle("hidden", useStock));
    document.querySelectorAll(".stock-only").forEach((node) => node.classList.toggle("hidden", !useStock));
  }

  function updateBufferUI(useDefaults) {
    const { buffer } = selectedBufferEntry();
    const standard = buffer.mode === "standard";
    elements.mode.value = standard ? "標準配方縮放" : buffer.dynamic.strategy === "paired" ? "動態成對試劑" : "動態滴定指引";
    elements.bufferHelp.textContent = `${buffer.referenceNote} 建議 pH：${buffer.defaultPH}。`;
    setHidden(elements.standardFields, !standard);
    setHidden(elements.standardReagentSettings, !standard);
    setHidden(elements.phField, standard);
    setHidden(elements.concentrationField, standard);
    setHidden(elements.temperatureField, standard);
    setHidden(elements.prepMethodField, standard);
    elements.temperature.required = !standard;
    setHidden(elements.pairedSettings, standard || buffer.dynamic && buffer.dynamic.strategy !== "paired");
    setHidden(elements.singleSettings, standard || buffer.dynamic && buffer.dynamic.strategy !== "titration");

    if (standard) {
      renderStandardReagents(buffer);
      if (useDefaults) elements.strength.value = buffer.standardRecipe.strengthOptions.includes(1) ? 1 : buffer.standardRecipe.baseStrength;
    } else {
      elements.standardReagentList.innerHTML = "";
      if (useDefaults) {
        elements.pH.value = buffer.defaultPH;
        elements.concentration.value = buffer.defaultConcentrationM * 1000;
        elements.concentrationUnit.value = "mM";
        elements.temperature.value = 25;
        elements.prepMethod.value = "solid";
      }
      if (buffer.dynamic.strategy === "paired") {
        fillSelect(elements.acidReagent, buffer.dynamic.acidOptions);
        fillSelect(elements.baseReagent, buffer.dynamic.baseOptions);
      } else {
        fillSelect(elements.singleReagent, [buffer.dynamic.reagentId]);
      }
    }
    updatePrepUI();
  }

  function populateBuffers() {
    const selected = elements.buffer.value;
    elements.buffer.innerHTML = Object.entries(app.Library.allBuffers()).map(([key, buffer]) => `<option value="${F.escapeHtml(key)}">${F.escapeHtml(buffer.name)}${buffer.builtIn ? "" : "｜自訂未驗證"}</option>`).join("");
    if (selected && app.Library.getBuffer(selected)) elements.buffer.value = selected;
  }

  function clearErrors() {
    document.querySelectorAll(".field-error").forEach((node) => { node.textContent = ""; });
    document.querySelectorAll('[aria-invalid="true"]').forEach((node) => node.removeAttribute("aria-invalid"));
  }

  function showFieldErrors(messages) {
    clearErrors();
    messages.filter((item) => item.level === "error" && item.field).forEach((item) => {
      const node = document.querySelector(`[data-error-for="${item.field}"]`);
      const input = ({
        buffer: elements.buffer, volume: elements.volume, strength: elements.strength, ph: elements.pH,
        concentration: elements.concentration, temperature: elements.temperature,
        acidPurity: elements.acidPurity, basePurity: elements.basePurity, singlePurity: elements.singlePurity
      })[item.field];
      if (node && !node.textContent) node.textContent = item.text;
      if (input) input.setAttribute("aria-invalid", "true");
      const advanced = input && input.closest("#advanced-settings");
      if (advanced) advanced.open = true;
    });
  }

  function invalidateCurrentResult(showNotice) {
    const hadResult = app.ResultState.clear();
    const wasStale = !elements.resultStaleNotice.hidden;
    if (hadResult) app.RecordsUI.clearCurrentResult();
    if (hadResult || wasStale || !showNotice) {
      setHidden(elements.resultPanel, true);
      setHidden(elements.resultActions, true);
      elements.messages.innerHTML = "";
      elements.recipeOutput.innerHTML = "";
    }
    setHidden(elements.resultStaleNotice, !app.ResultState.shouldShowStaleNotice(showNotice, hadResult, wasStale));
  }

  function readNumber(element) {
    const value = element.value.trim();
    return value === "" ? NaN : Number(value);
  }

  function readStandardOverrides() {
    const purities = {};
    const reagentOverrides = {};
    elements.standardReagentList.querySelectorAll("[data-standard-purity]").forEach((node) => { purities[node.dataset.standardPurity] = Number(node.value); });
    elements.standardReagentList.querySelectorAll("[data-standard-reagent]").forEach((node) => { reagentOverrides[node.dataset.standardReagent] = node.value; });
    return { purities, reagentOverrides };
  }

  function readInput() {
    const { key, buffer } = selectedBufferEntry();
    let volumeL = NaN;
    let concentrationM = NaN;
    try { volumeL = app.Units.toLiters(elements.volume.value, elements.volumeUnit.value); } catch (_error) { volumeL = NaN; }
    if (buffer.mode === "dynamic") {
      try { concentrationM = app.Units.toMolar(elements.concentration.value, elements.concentrationUnit.value); } catch (_error) { concentrationM = NaN; }
    }
    const input = {
      bufferKey: key,
      volumeL,
      strength: readNumber(elements.strength),
      concentrationM,
      pH: readNumber(elements.pH),
      temperatureC: readNumber(elements.temperature),
      useStock: elements.prepMethod.value === "stock",
      acidReagentId: elements.acidReagent.value,
      baseReagentId: elements.baseReagent.value,
      acidPurity: Number(elements.acidPurity.value),
      basePurity: Number(elements.basePurity.value),
      singlePurity: Number(elements.singlePurity.value),
      acidStockM: Number(elements.acidStock.value),
      baseStockM: Number(elements.baseStock.value),
      singleStockM: Number(elements.singleStock.value)
    };
    Object.assign(input, readStandardOverrides());
    return { input, buffer };
  }

  function additionalValidation(input, buffer) {
    const messages = [];
    if (buffer.mode === "standard") {
      Object.entries(input.purities).forEach(([id, purity]) => {
        const issue = app.Validation.validatePurity(purity, null);
        if (issue) issue.text = `${app.Library.getReagent(id).zhName}：${issue.text}`;
        if (issue) messages.push(issue);
      });
      return messages;
    }
    if (input.useStock) {
      const stocks = buffer.dynamic.strategy === "paired" ? [input.acidStockM, input.baseStockM] : [input.singleStockM];
      if (stocks.some((value) => !Number.isFinite(value) || value <= 0)) messages.push(app.Validation.message("error", "INVALID_STOCK", "庫存液濃度必須大於 0。"));
    } else {
      const values = buffer.dynamic.strategy === "paired" ? [[input.acidPurity, "acidPurity"], [input.basePurity, "basePurity"]] : [[input.singlePurity, "singlePurity"]];
      values.forEach(([value, field]) => { const issue = app.Validation.validatePurity(value, field); if (issue) messages.push(issue); });
    }
    return messages;
  }

  function captureFormState() {
    const overrides = readStandardOverrides();
    return {
      bufferKey: elements.buffer.value, volume: elements.volume.value, volumeUnit: elements.volumeUnit.value,
      strength: elements.strength.value, pH: elements.pH.value, concentration: elements.concentration.value,
      concentrationUnit: elements.concentrationUnit.value, temperature: elements.temperature.value, prepMethod: elements.prepMethod.value,
      acidReagent: elements.acidReagent.value, baseReagent: elements.baseReagent.value,
      acidPurity: elements.acidPurity.value, basePurity: elements.basePurity.value, singlePurity: elements.singlePurity.value,
      acidStock: elements.acidStock.value, baseStock: elements.baseStock.value, singleStock: elements.singleStock.value,
      purities: overrides.purities, reagentOverrides: overrides.reagentOverrides
    };
  }

  function historySummary(result) {
    return result.mode === "standard" ? `${F.volume(result.input.volumeL)} · ${F.number(result.input.strength, 3)}×` : `${F.volume(result.input.volumeL)} · ${F.concentration(result.input.concentrationM)} · pH ${F.number(result.input.pH, 2)}`;
  }

  function showStorageNotice() {
    const error = app.Storage.getLastError();
    if (!error) return;
    elements.storageNotice.hidden = false;
    elements.storageNotice.textContent = error;
  }

  function calculate(saveHistory) {
    invalidateCurrentResult(false);
    clearErrors();
    const { input, buffer } = readInput();
    let messages = app.Validation.validateCommon(input, buffer).concat(additionalValidation(input, buffer));
    showFieldErrors(messages);
    if (app.Validation.hasErrors(messages)) {
      setHidden(elements.resultPanel, false);
      setHidden(elements.resultActions, true);
      elements.recipeOutput.innerHTML = "";
      app.Renderer.renderMessages(elements.messages, messages);
      elements.resultPanel.scrollIntoView({ behavior: app.Renderer.scrollBehavior(), block: "start" });
      return null;
    }

    try {
      const result = buffer.mode === "standard" ? app.StandardRecipeEngine.calculate(input, buffer) : app.DynamicBufferEngine.calculate(input, buffer);
      messages = messages.concat(result.messages, app.Validation.validateResult(result, input));
      result.messages = messages;
      if (app.Validation.hasErrors(messages)) {
        setHidden(elements.resultPanel, false);
        setHidden(elements.resultActions, true);
        app.Renderer.renderMessages(elements.messages, messages);
        elements.recipeOutput.innerHTML = "";
        elements.resultPanel.scrollIntoView({ behavior: app.Renderer.scrollBehavior(), block: "start" });
        return null;
      }
      app.ResultState.set(result);
      setHidden(elements.resultPanel, false);
      setHidden(elements.resultActions, false);
      setHidden(elements.resultStaleNotice, true);
      app.Renderer.renderMessages(elements.messages, messages);
      app.Renderer.renderRecipe(elements.recipeOutput, result);
      app.RecordsUI.setCurrentResult(result);
      if (saveHistory !== false) {
        if (!app.Storage.addHistory({ id: `${Date.now()}-${Math.random().toString(16).slice(2)}`, name: buffer.name, summary: historySummary(result), createdAt: result.createdAt, status: buffer.status, state: captureFormState() })) showStorageNotice();
        renderHistory();
      }
      elements.resultPanel.scrollIntoView({ behavior: app.Renderer.scrollBehavior(), block: "start" });
      return result;
    } catch (error) {
      app.ResultState.clear();
      setHidden(elements.resultActions, true);
      messages.push(app.Validation.message("error", "CALCULATION_FAILED", error.message || "計算失敗。"));
      app.Renderer.renderMessages(elements.messages, messages);
      elements.recipeOutput.innerHTML = "";
      setHidden(elements.resultPanel, false);
      return null;
    }
  }

  function renderHistory() {
    const history = app.Storage.getHistory();
    elements.historyCount.textContent = history.length ? `${history.length} 筆` : "尚無紀錄";
    elements.historyList.innerHTML = history.length ? history.map((entry) => `
      <article class="history-item">
        <strong>${F.escapeHtml(entry.name || "未命名計算")}</strong>${entry.status === "user-unverified" ? `<span class="status-badge unverified">自訂未驗證</span>` : ""}<span>${F.escapeHtml(entry.summary || "資料不完整")}</span><span>${entry.createdAt ? new Date(entry.createdAt).toLocaleString("zh-TW") : "時間未記錄"}</span>
        <div class="history-actions"><button type="button" data-history-load="${F.escapeHtml(entry.id)}">載入</button><button type="button" data-history-delete="${F.escapeHtml(entry.id)}">刪除</button></div>
      </article>`).join("") : `<p class="history-empty">尚無計算紀錄。完成計算後會保留最近 10 筆。</p>`;
  }

  function restoreState(state) {
    if (!state || !app.Library.getBuffer(state.bufferKey)) return;
    elements.buffer.value = app.Library.getBuffer(state.bufferKey).id;
    updateBufferUI(true);
    const values = [[elements.volume, state.volume], [elements.volumeUnit, state.volumeUnit], [elements.strength, state.strength], [elements.pH, state.pH], [elements.concentration, state.concentration], [elements.concentrationUnit, state.concentrationUnit], [elements.temperature, state.temperature], [elements.prepMethod, state.prepMethod], [elements.acidReagent, state.acidReagent], [elements.baseReagent, state.baseReagent], [elements.acidPurity, state.acidPurity], [elements.basePurity, state.basePurity], [elements.singlePurity, state.singlePurity], [elements.acidStock, state.acidStock], [elements.baseStock, state.baseStock], [elements.singleStock, state.singleStock]];
    values.forEach(([node, value]) => { if (value != null) node.value = value; });
    Object.entries(state.purities || {}).forEach(([id, value]) => { const node = elements.standardReagentList.querySelector(`[data-standard-purity="${id}"]`); if (node) node.value = value; });
    Object.entries(state.reagentOverrides || {}).forEach(([id, value]) => { const node = elements.standardReagentList.querySelector(`[data-standard-reagent="${id}"]`); if (node) node.value = value; });
    updatePrepUI();
    calculate(false);
  }

  function loadExample(id) {
    const examples = {
      "pbs-1l": { bufferKey: "pbs", volume: 1, volumeUnit: "L", strength: 1 },
      "pbs-500ml": { bufferKey: "pbs", volume: 500, volumeUnit: "mL", strength: 1 },
      "phosphate-100ml": { bufferKey: "phosphate", volume: 100, volumeUnit: "mL", pH: 7.2, concentration: 0.1, concentrationUnit: "M", temperature: 25, prepMethod: "solid" },
      "tris-1l": { bufferKey: "tris-buffer", volume: 1, volumeUnit: "L", pH: 8, concentration: 50, concentrationUnit: "mM", temperature: 25, prepMethod: "solid" },
      "hepes-500ml": { bufferKey: "hepes", volume: 500, volumeUnit: "mL", pH: 7.4, concentration: 20, concentrationUnit: "mM", temperature: 25, prepMethod: "solid" }
    };
    restoreState(examples[id]);
  }

  function setTheme(theme, persist) {
    document.documentElement.dataset.theme = theme;
    elements.theme.textContent = theme === "dark" ? "淺色模式" : "深色模式";
    elements.theme.setAttribute("aria-label", `切換為${theme === "dark" ? "淺色" : "深色"}模式`);
    if (persist !== false && !app.Storage.setTheme(theme)) showStorageNotice();
  }

  async function copyRecipe() {
    const result = app.ResultState.get();
    if (!result) return;
    const text = app.Renderer.toPlainText(result);
    let copied = false;
    if (navigator.clipboard && root.isSecureContext) {
      try { await navigator.clipboard.writeText(text); copied = true; } catch (_error) { copied = false; }
    }
    if (!copied) {
      const area = document.createElement("textarea");
      area.value = text;
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      copied = document.execCommand("copy");
      area.remove();
    }
    const button = byId("copy-button");
    button.textContent = copied ? "已複製" : "複製失敗";
    root.setTimeout(() => { button.textContent = "複製配方"; }, 1600);
  }

  function bindEvents() {
    elements.form.addEventListener("input", () => { clearErrors(); invalidateCurrentResult(true); });
    elements.form.addEventListener("change", () => { clearErrors(); invalidateCurrentResult(true); });
    elements.form.addEventListener("submit", (event) => { event.preventDefault(); calculate(true); });
    elements.buffer.addEventListener("change", () => updateBufferUI(true));
    elements.prepMethod.addEventListener("change", updatePrepUI);
    elements.example.addEventListener("change", () => { if (elements.example.value) loadExample(elements.example.value); elements.example.value = ""; });
    byId("reset-button").addEventListener("click", () => { elements.form.reset(); elements.buffer.value = "pbs"; updateBufferUI(true); clearErrors(); invalidateCurrentResult(false); setHidden(elements.resultPanel, true); setHidden(byId("record-editor-panel"), true); });
    byId("copy-button").addEventListener("click", copyRecipe);
    byId("print-button").addEventListener("click", () => root.print());
    elements.theme.addEventListener("click", () => setTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark"));
    byId("clear-history").addEventListener("click", () => { app.Storage.clearHistory(); renderHistory(); });
    elements.historyList.addEventListener("click", (event) => {
      const loadButton = event.target.closest("[data-history-load]");
      const deleteButton = event.target.closest("[data-history-delete]");
      if (loadButton) { const entry = app.Storage.getHistory().find((item) => item.id === loadButton.dataset.historyLoad); if (entry && entry.state) restoreState(entry.state); }
      if (deleteButton) { app.Storage.deleteHistory(deleteButton.dataset.historyDelete); renderHistory(); }
    });
    byId("run-tests").addEventListener("click", () => app.TestRunner.render(byId("test-output")));
    root.addEventListener("bufferlab:library-changed", () => { populateBuffers(); updateBufferUI(false); });
  }

  function displayResult(result) {
    const snapshot = app.Storage.clone(result);
    app.ResultState.set(snapshot);
    setHidden(elements.resultPanel, false);
    setHidden(elements.resultActions, false);
    setHidden(elements.resultStaleNotice, true);
    app.Renderer.renderMessages(elements.messages, snapshot.messages || []);
    app.Renderer.renderRecipe(elements.recipeOutput, snapshot);
  }

  function init() {
    const migrationNotice = app.Storage.migrateV1();
    cacheElements();
    populateBuffers();
    setTheme(app.Storage.getTheme(), false);
    elements.buffer.value = "pbs";
    updateBufferUI(true);
    renderHistory();
    bindEvents();
    app.RecordsUI.init();
    app.LibraryUI.init();
    byId("app-version").textContent = app.Constants.VERSION;
    byId("data-version").textContent = app.Constants.DATA_VERSION;
    const devMode = new URLSearchParams(root.location.search).get("dev") === "1";
    setHidden(elements.tests, !devMode);
    if (devMode) app.TestRunner.render(byId("test-output"));
    if (migrationNotice) { const notice = byId("storage-notice"); notice.hidden = false; notice.textContent = migrationNotice; }
  }

  app.Controller = Object.freeze({ init, calculate, restoreState, displayResult });
})(window);
