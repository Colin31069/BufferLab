(function (root) {
  "use strict";

  const app = root.BufferLab;
  const F = app.Formatter;
  let elements;

  function byId(id) { return document.getElementById(id); }
  function setMessage(text, error) {
    elements.message.textContent = text || "";
    elements.message.style.color = error ? "var(--danger)" : "var(--accent-strong)";
  }

  function reagentOptions(selected) {
    return Object.values(app.Library.allReagents()).map((item) => `<option value="${F.escapeHtml(item.id)}"${item.id === selected ? " selected" : ""}>${F.escapeHtml(item.zhName)}｜${F.escapeHtml(item.formula)}${item.builtIn ? "" : "｜自訂"}</option>`).join("");
  }

  function refreshReagentSelects() {
    [elements.acidReagent, elements.baseReagent, elements.singleReagent].forEach((select) => {
      const selected = select.value;
      select.innerHTML = reagentOptions(selected);
      if (selected && app.Library.getReagent(selected)) select.value = selected;
    });
    elements.componentList.querySelectorAll("[data-component-reagent]").forEach((select) => {
      const selected = select.value;
      select.innerHTML = reagentOptions(selected);
      if (selected && app.Library.getReagent(selected)) select.value = selected;
    });
  }

  function addComponent(component) {
    const row = document.createElement("div");
    row.className = "component-editor-row";
    row.innerHTML = `
      <label>試劑<select data-component-reagent>${reagentOptions(component && component.reagentId)}</select></label>
      <label>類型<select data-component-kind>
        <option value="moles">莫耳數</option><option value="fixedMass">固定質量</option><option value="fixedVolume">固定體積</option><option value="stock">庫存液體積</option>
      </select></label>
      <label>基準用量<input data-component-amount type="number" min="0" step="any" value="${component ? F.escapeHtml(component.amount) : "0"}"></label>
      <button type="button" data-component-remove aria-label="移除此組成">移除</button>`;
    if (component) row.querySelector("[data-component-kind]").value = component.kind;
    elements.componentList.appendChild(row);
  }

  function renderReagents() {
    elements.reagentList.innerHTML = Object.values(app.Library.allReagents()).map((item) => `
      <article class="library-item">
        <div class="library-item-header"><div><strong>${F.escapeHtml(item.zhName)}</strong><p>${F.escapeHtml(item.formula)}｜${item.molarMass ? `${F.number(item.molarMass, 4)} g/mol` : "無分子量"}｜v${item.version || 1}</p></div><span class="status-badge${item.builtIn ? "" : " unverified"}">${item.builtIn ? "內建已驗證" : "使用者自訂"}</span></div>
        <div class="library-actions">${item.builtIn ? "" : `<button type="button" data-reagent-edit="${F.escapeHtml(item.id)}">編輯</button><button type="button" data-reagent-delete="${F.escapeHtml(item.id)}">刪除</button>`}<button type="button" data-reagent-copy="${F.escapeHtml(item.id)}">複製</button></div>
      </article>`).join("");
  }

  function renderRecipes() {
    elements.recipeList.innerHTML = Object.values(app.Library.allBuffers()).map((item) => `
      <article class="library-item">
        <div class="library-item-header"><div><strong>${F.escapeHtml(item.name)}</strong><p>${item.mode === "standard" ? "固定配方縮放" : item.dynamic.strategy === "paired" ? "成對酸鹼模型" : "滴定指引模型"}｜v${item.version || 1}</p></div><span class="status-badge${item.builtIn ? "" : " unverified"}">${item.builtIn ? "內建已驗證" : "使用者自訂"}</span></div>
        <div class="library-actions">${item.builtIn ? "" : `<button type="button" data-recipe-edit="${F.escapeHtml(item.id)}">編輯</button><button type="button" data-recipe-delete="${F.escapeHtml(item.id)}">刪除</button>`}<button type="button" data-recipe-copy="${F.escapeHtml(item.id)}">複製</button></div>
      </article>`).join("");
  }

  function refresh() {
    refreshReagentSelects();
    renderReagents();
    renderRecipes();
    root.dispatchEvent(new CustomEvent("bufferlab:library-changed"));
  }

  function resetReagentForm() {
    elements.reagentForm.reset();
    byId("custom-reagent-id").value = "";
    byId("custom-reagent-purity").value = 100;
  }

  function reagentFormValue() {
    return {
      id: byId("custom-reagent-id").value,
      zhName: byId("custom-reagent-zh").value,
      enName: byId("custom-reagent-en").value,
      formula: byId("custom-reagent-formula").value,
      cas: byId("custom-reagent-cas").value,
      molarMass: byId("custom-reagent-mass").value,
      physicalForm: byId("custom-reagent-form").value,
      hydration: byId("custom-reagent-hydration").value,
      purityDefault: byId("custom-reagent-purity").value,
      sourceNote: byId("custom-reagent-source").value,
      sourceUrl: byId("custom-reagent-url").value
    };
  }

  function loadReagent(item, asCopy) {
    byId("custom-reagent-id").value = asCopy || item.builtIn ? "" : item.id;
    byId("custom-reagent-zh").value = `${item.zhName}${asCopy ? " 副本" : ""}`;
    byId("custom-reagent-en").value = item.enName || "";
    byId("custom-reagent-formula").value = item.formula === "—" ? "" : item.formula;
    byId("custom-reagent-cas").value = item.cas === "—" ? "" : item.cas;
    byId("custom-reagent-mass").value = item.molarMass == null ? "" : item.molarMass;
    byId("custom-reagent-form").value = item.physicalForm || "solid";
    byId("custom-reagent-hydration").value = item.hydration || "";
    byId("custom-reagent-purity").value = item.purityDefault || 100;
    byId("custom-reagent-source").value = item.sourceNote || item.notes || "";
    byId("custom-reagent-url").value = item.sourceUrl || "";
    elements.reagentForm.scrollIntoView({ behavior: app.Renderer.scrollBehavior(), block: "start" });
  }

  function updateRecipeType() {
    const type = byId("custom-recipe-type").value;
    byId("custom-standard-fields").hidden = type !== "standard";
    byId("custom-dynamic-fields").hidden = type === "standard";
    byId("custom-acid-reagent-field").hidden = type !== "paired";
    byId("custom-base-reagent-field").hidden = type !== "paired";
    byId("custom-single-reagent-field").hidden = type !== "titration";
  }

  function resetRecipeForm() {
    elements.recipeForm.reset();
    byId("custom-recipe-id").value = "";
    elements.componentList.innerHTML = "";
    addComponent();
    refreshReagentSelects();
    updateRecipeType();
  }

  function recipeFormValue() {
    const components = Array.from(elements.componentList.querySelectorAll(".component-editor-row")).map((row) => ({
      reagentId: row.querySelector("[data-component-reagent]").value,
      kind: row.querySelector("[data-component-kind]").value,
      amount: row.querySelector("[data-component-amount]").value
    }));
    return {
      id: byId("custom-recipe-id").value,
      name: byId("custom-recipe-name").value,
      modelType: byId("custom-recipe-type").value,
      defaultPH: byId("custom-recipe-ph").value,
      referenceNote: byId("custom-recipe-note").value,
      sourceUrl: byId("custom-recipe-url").value,
      baseVolumeL: byId("custom-base-volume").value,
      baseStrength: byId("custom-base-strength").value,
      components,
      pKa25: byId("custom-pka").value,
      defaultConcentrationM: byId("custom-default-concentration").value,
      rangeLow: byId("custom-range-low").value,
      rangeHigh: byId("custom-range-high").value,
      acidLabel: byId("custom-acid-label").value,
      baseLabel: byId("custom-base-label").value,
      acidReagentId: byId("custom-acid-reagent").value,
      baseReagentId: byId("custom-base-reagent").value,
      reagentId: byId("custom-single-reagent").value,
      temperatureCoefficient: byId("custom-temp-coefficient").value,
      temperatureLow: byId("custom-temp-low").value,
      temperatureHigh: byId("custom-temp-high").value
    };
  }

  function loadRecipe(item, asCopy) {
    byId("custom-recipe-id").value = asCopy || item.builtIn ? "" : item.id;
    byId("custom-recipe-name").value = `${item.name}${asCopy ? " 副本" : ""}`;
    byId("custom-recipe-ph").value = item.defaultPH;
    byId("custom-recipe-note").value = item.referenceNote || "";
    byId("custom-recipe-url").value = item.sourceUrl || "";
    if (item.mode === "standard") {
      byId("custom-recipe-type").value = "standard";
      byId("custom-base-volume").value = item.standardRecipe.baseVolumeL;
      byId("custom-base-strength").value = item.standardRecipe.baseStrength;
      elements.componentList.innerHTML = "";
      item.standardRecipe.components.forEach(addComponent);
    } else {
      byId("custom-recipe-type").value = item.dynamic.strategy;
      byId("custom-pka").value = item.dynamic.pKa25;
      byId("custom-default-concentration").value = item.defaultConcentrationM;
      byId("custom-range-low").value = item.dynamic.usefulRange[0];
      byId("custom-range-high").value = item.dynamic.usefulRange[1];
      byId("custom-acid-label").value = item.dynamic.acidLabel;
      byId("custom-base-label").value = item.dynamic.baseLabel;
      byId("custom-acid-reagent").value = item.dynamic.acidOptions && item.dynamic.acidOptions[0] || "";
      byId("custom-base-reagent").value = item.dynamic.baseOptions && item.dynamic.baseOptions[0] || "";
      byId("custom-single-reagent").value = item.dynamic.reagentId || "";
      byId("custom-temp-coefficient").value = item.dynamic.temperatureCoefficient == null ? "" : item.dynamic.temperatureCoefficient;
      byId("custom-temp-low").value = item.dynamic.temperatureRange ? item.dynamic.temperatureRange[0] : 5;
      byId("custom-temp-high").value = item.dynamic.temperatureRange ? item.dynamic.temperatureRange[1] : 37;
    }
    refreshReagentSelects();
    updateRecipeType();
    elements.recipeForm.scrollIntoView({ behavior: app.Renderer.scrollBehavior(), block: "start" });
  }

  function bindEvents() {
    elements.reagentForm.addEventListener("submit", (event) => {
      event.preventDefault();
      try { const saved = app.Library.saveReagent(reagentFormValue()); resetReagentForm(); refresh(); setMessage(`已儲存試劑「${saved.zhName}」v${saved.version}。`); }
      catch (error) { setMessage(error.message, true); }
    });
    byId("reagent-form-reset").addEventListener("click", resetReagentForm);
    elements.recipeForm.addEventListener("submit", (event) => {
      event.preventDefault();
      try { const saved = app.Library.saveRecipe(recipeFormValue()); resetRecipeForm(); refresh(); setMessage(`已儲存配方「${saved.name}」v${saved.version}。`); }
      catch (error) { setMessage(error.message, true); }
    });
    byId("recipe-form-reset").addEventListener("click", resetRecipeForm);
    byId("custom-recipe-type").addEventListener("change", updateRecipeType);
    byId("add-recipe-component").addEventListener("click", () => addComponent());
    elements.componentList.addEventListener("click", (event) => { const button = event.target.closest("[data-component-remove]"); if (button) button.closest(".component-editor-row").remove(); });
    elements.reagentList.addEventListener("click", (event) => {
      const edit = event.target.closest("[data-reagent-edit]");
      const copy = event.target.closest("[data-reagent-copy]");
      const remove = event.target.closest("[data-reagent-delete]");
      const id = edit && edit.dataset.reagentEdit || copy && copy.dataset.reagentCopy || remove && remove.dataset.reagentDelete;
      const item = id && app.Library.getReagent(id);
      if (edit && item) loadReagent(item, false);
      if (copy && item) loadReagent(item, true);
      if (remove && item && root.confirm(`確定刪除自訂試劑「${item.zhName}」？`)) { try { if (!app.Library.deleteReagent(id)) throw new Error(app.Storage.getLastError()); refresh(); setMessage("已刪除自訂試劑。 "); } catch (error) { setMessage(error.message, true); } }
    });
    elements.recipeList.addEventListener("click", (event) => {
      const edit = event.target.closest("[data-recipe-edit]");
      const copy = event.target.closest("[data-recipe-copy]");
      const remove = event.target.closest("[data-recipe-delete]");
      const id = edit && edit.dataset.recipeEdit || copy && copy.dataset.recipeCopy || remove && remove.dataset.recipeDelete;
      const item = id && app.Library.getBuffer(id);
      if (edit && item) loadRecipe(item, false);
      if (copy && item) loadRecipe(item, true);
      if (remove && item && root.confirm(`確定刪除自訂配方「${item.name}」？既有配製紀錄不受影響。`)) { if (app.Library.deleteRecipe(id)) { refresh(); setMessage("已刪除自訂配方。 "); } else setMessage(app.Storage.getLastError(), true); }
    });
  }

  function init() {
    elements = {
      message: byId("library-message"), reagentForm: byId("reagent-form"), recipeForm: byId("recipe-form"),
      reagentList: byId("reagent-library-list"), recipeList: byId("recipe-library-list"), componentList: byId("custom-component-list"),
      acidReagent: byId("custom-acid-reagent"), baseReagent: byId("custom-base-reagent"), singleReagent: byId("custom-single-reagent")
    };
    addComponent();
    refreshReagentSelects();
    renderReagents();
    renderRecipes();
    updateRecipeType();
    bindEvents();
  }

  app.LibraryUI = Object.freeze({ init, refresh });
})(window);
