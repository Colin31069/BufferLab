(function (root) {
  "use strict";

  const app = root.BufferLab;
  const F = app.Formatter;
  let elements;
  let currentResult = null;
  let currentRecord = null;

  function byId(id) { return document.getElementById(id); }
  function valueOrNull(id) { const value = byId(id).value; return value === "" ? null : Number(value); }
  function status(text, error) { elements.saveMessage.textContent = text || ""; elements.saveMessage.style.color = error ? "var(--danger)" : "var(--accent-strong)"; }

  function theoreticalAmount(component) {
    if (component.kind === "mass") return { value: component.correctedMassG, unit: "g", text: F.mass(component.correctedMassG) };
    const liters = component.kind === "stock" ? component.stockVolumeL : component.volumeL;
    return { value: liters, unit: "L", text: F.volume(liters) };
  }

  function defaultActualUnit(component) {
    if (component.kind === "mass") return component.correctedMassG < 1 ? "mg" : "g";
    const liters = component.kind === "stock" ? component.stockVolumeL : component.volumeL;
    return liters < 0.001 ? "µL" : liters < 1 ? "mL" : "L";
  }

  function componentDelta(component, actual) {
    if (!actual || actual.amount == null || actual.amount === "") return "尚未記錄";
    try {
      const theory = theoreticalAmount(component);
      const normalized = component.kind === "mass" ? app.Units.toGrams(actual.amount, actual.unit) : app.Units.toLiters(actual.amount, actual.unit);
      if (!theory.value) return "差異無法計算";
      const difference = (normalized - theory.value) / theory.value * 100;
      return `${difference >= 0 ? "+" : ""}${F.number(difference, 2)}%`;
    } catch (_error) { return "差異無法計算"; }
  }

  function renderComponents(saved) {
    const actuals = saved && saved.components || [];
    elements.componentList.innerHTML = currentResult.components.map((component, index) => {
      const actual = actuals[index] || {};
      const mass = component.kind === "mass";
      const units = mass ? ["µg", "mg", "g"] : ["µL", "mL", "L"];
      const selectedUnit = actual.unit || defaultActualUnit(component);
      return `<div class="record-component" data-record-component="${index}">
        <div class="record-component-grid">
          <div><strong>${F.escapeHtml(component.reagent.zhName)}</strong><div class="muted">${F.escapeHtml(component.reagent.formula)}</div><div class="muted">理論：${theoreticalAmount(component).text}</div><div class="delta" data-component-delta>${F.escapeHtml(componentDelta(component, actual))}</div></div>
          <label>實際用量<div class="input-pair"><input data-actual-amount type="number" min="0" step="any" value="${actual.amount == null ? "" : F.escapeHtml(actual.amount)}"><select data-actual-unit aria-label="實際用量單位">${units.map((unit) => `<option value="${unit}"${unit === selectedUnit ? " selected" : ""}>${unit}</option>`).join("")}</select></div></label>
          <label>批號<input data-actual-lot maxlength="120" value="${F.escapeHtml(actual.lot || "")}"></label>
          <label>效期<input data-actual-expiry type="date" value="${F.escapeHtml(actual.expiry || "")}"></label>
        </div>
      </div>`;
    }).join("");
  }

  function resetForm() {
    elements.form.reset();
    elements.id.value = "";
    currentRecord = null;
    elements.editState.textContent = "新增紀錄";
    if (currentResult) {
      elements.title.value = `${currentResult.buffer.name} ${new Date().toLocaleDateString("zh-TW")}`;
      renderComponents(null);
    }
    updatePrintSummary();
    status("");
  }

  function setCurrentResult(result, record) {
    currentResult = app.Storage.clone(result);
    elements.panel.hidden = false;
    elements.panel.open = Boolean(record);
    if (record) loadIntoForm(record); else resetForm();
  }

  function clearCurrentResult() {
    if (currentRecord) return false;
    currentResult = null;
    elements.panel.hidden = true;
    elements.printSummary.innerHTML = "";
    status("");
    return true;
  }

  function readComponents() {
    return Array.from(elements.componentList.querySelectorAll("[data-record-component]")).map((row) => ({
      reagentId: currentResult.components[Number(row.dataset.recordComponent)].reagent.id,
      amount: row.querySelector("[data-actual-amount]").value === "" ? null : Number(row.querySelector("[data-actual-amount]").value),
      unit: row.querySelector("[data-actual-unit]").value,
      lot: row.querySelector("[data-actual-lot]").value.trim(),
      expiry: row.querySelector("[data-actual-expiry]").value
    }));
  }

  function readForm() {
    return {
      id: elements.id.value,
      title: elements.title.value,
      result: currentResult,
      preparedAt: byId("record-prepared-at").value,
      actualVolume: valueOrNull("record-actual-volume") == null ? null : { value: valueOrNull("record-actual-volume"), unit: byId("record-actual-volume-unit").value },
      actualTemperatureC: valueOrNull("record-temperature"),
      measuredPH: valueOrNull("record-ph"),
      adjuster: byId("record-adjuster").value.trim(),
      adjusterVolume: valueOrNull("record-adjuster-volume") == null ? null : { value: valueOrNull("record-adjuster-volume"), unit: byId("record-adjuster-volume-unit").value },
      components: readComponents(),
      notes: byId("record-notes").value
    };
  }

  function loadIntoForm(record) {
    currentRecord = app.Storage.clone(record);
    currentResult = app.Storage.clone(record.result);
    elements.id.value = record.id;
    elements.title.value = record.title;
    byId("record-prepared-at").value = record.preparedAt || "";
    byId("record-actual-volume").value = record.actualVolume ? record.actualVolume.value : "";
    byId("record-actual-volume-unit").value = record.actualVolume ? record.actualVolume.unit : "L";
    byId("record-temperature").value = record.actualTemperatureC == null ? "" : record.actualTemperatureC;
    byId("record-ph").value = record.measuredPH == null ? "" : record.measuredPH;
    byId("record-adjuster").value = record.adjuster || "";
    byId("record-adjuster-volume").value = record.adjusterVolume ? record.adjusterVolume.value : "";
    byId("record-adjuster-volume-unit").value = record.adjusterVolume ? record.adjusterVolume.unit : "µL";
    byId("record-notes").value = record.notes || "";
    renderComponents(record);
    elements.editState.textContent = `編輯修訂 v${record.revision}`;
    updatePrintSummary(record);
    status("");
  }

  function save(event) {
    event.preventDefault();
    try {
      const saved = app.Records.save(readForm());
      loadIntoForm(saved);
      renderList();
      status(`已儲存；目前修訂 v${saved.revision}。`);
    } catch (error) { status(error.message, true); }
  }

  function measurementText(value, suffix) { return value == null || value === "" ? "尚未記錄" : `${F.number(Number(value), 4)}${suffix || ""}`; }

  function updatePrintSummary(record) {
    if (!currentResult) { elements.printSummary.innerHTML = ""; return; }
    let data;
    try { data = record || Object.assign(readForm(), { createdAt: "", updatedAt: "", revision: elements.id.value ? currentRecord && currentRecord.revision : 0 }); }
    catch (_error) { return; }
    const components = data.components || [];
    elements.printSummary.innerHTML = `
      <h2>實際配製紀錄</h2>
      <div class="print-meta">
        <p><strong>紀錄 ID：</strong>${F.escapeHtml(data.id || "尚未儲存")}</p><p><strong>標題：</strong>${F.escapeHtml(data.title || "尚未記錄")}</p>
        <p><strong>配製時間：</strong>${F.escapeHtml(data.preparedAt || "尚未記錄")}</p><p><strong>修訂：</strong>${data.revision || "尚未儲存"}</p>
        <p><strong>實際體積：</strong>${data.actualVolume ? `${F.number(data.actualVolume.value, 4)} ${F.escapeHtml(data.actualVolume.unit)}` : "尚未記錄"}</p><p><strong>操作溫度：</strong>${measurementText(data.actualTemperatureC, "°C")}</p>
        <p><strong>實測 pH：</strong>${measurementText(data.measuredPH)}</p><p><strong>調整劑：</strong>${F.escapeHtml(data.adjuster || "尚未記錄")}${data.adjusterVolume ? `；${F.number(data.adjusterVolume.value, 4)} ${F.escapeHtml(data.adjusterVolume.unit)}` : ""}</p>
        <p><strong>建立：</strong>${F.escapeHtml(data.createdAt || "尚未儲存")}</p><p><strong>修改：</strong>${F.escapeHtml(data.updatedAt || "尚未儲存")}</p>
      </div>
      <table><thead><tr><th>試劑</th><th>理論值</th><th>實際值</th><th>差異</th><th>批號／效期</th></tr></thead><tbody>${currentResult.components.map((component, index) => {
        const actual = components[index] || {};
        return `<tr><td>${F.escapeHtml(component.reagent.zhName)}<br><span class="muted">${F.escapeHtml(component.reagent.formula)}</span></td><td>${theoreticalAmount(component).text}</td><td>${actual.amount == null ? "尚未記錄" : `${F.number(actual.amount, 4)} ${F.escapeHtml(actual.unit)}`}</td><td>${F.escapeHtml(componentDelta(component, actual))}</td><td>${F.escapeHtml(actual.lot || "尚未記錄")}／${F.escapeHtml(actual.expiry || "尚未記錄")}</td></tr>`;
      }).join("")}</tbody></table>
      <p class="record-print-notes"><strong>備註：</strong>${F.escapeHtml(data.notes || "尚未記錄")}</p>
      <p><strong>追溯資訊：</strong>BufferLab ${F.escapeHtml(currentResult.provenance.appVersion)}；資料 ${F.escapeHtml(currentResult.provenance.dataVersion)}；配方 ${F.escapeHtml(currentResult.provenance.recipeId)} v${F.escapeHtml(currentResult.provenance.recipeVersion)}；${currentResult.provenance.recipeStatus === "verified" ? "內建已驗證" : "使用者自訂／未經 BufferLab 驗證"}。</p>`;
  }

  function renderFilterOptions(records) {
    const current = elements.bufferFilter.value;
    const names = Array.from(new Set(records.map((item) => item.bufferName))).sort();
    elements.bufferFilter.innerHTML = `<option value="">全部</option>${names.map((name) => `<option value="${F.escapeHtml(name)}">${F.escapeHtml(name)}</option>`).join("")}`;
    if (names.includes(current)) elements.bufferFilter.value = current;
  }

  function renderList() {
    const records = app.Storage.getRecords();
    elements.count.textContent = records.length ? `${records.length} 筆` : "尚無紀錄";
    renderFilterOptions(records);
    const query = elements.search.value.trim().toLocaleLowerCase("zh-TW");
    const buffer = elements.bufferFilter.value;
    const date = elements.dateFilter.value;
    const filtered = records.filter((item) => {
      const matchesText = !query || `${item.title} ${item.bufferName}`.toLocaleLowerCase("zh-TW").includes(query);
      const matchesBuffer = !buffer || item.bufferName === buffer;
      const matchesDate = !date || String(item.preparedAt || "").slice(0, 10) === date;
      return matchesText && matchesBuffer && matchesDate;
    });
    elements.list.innerHTML = filtered.length ? filtered.map((item) => `
      <article class="record-card">
        <div class="record-card-header"><div><strong>${F.escapeHtml(item.title)}</strong><p>${F.escapeHtml(item.bufferName)}｜修訂 v${item.revision}｜${F.escapeHtml(item.preparedAt || "尚未記錄配製時間")}</p></div><span class="status-badge${item.result.provenance.recipeStatus === "verified" ? "" : " unverified"}">${item.result.provenance.recipeStatus === "verified" ? "內建配方" : "自訂未驗證"}</span></div>
        <div class="record-actions"><button type="button" data-record-load="${F.escapeHtml(item.id)}">開啟</button><button type="button" data-record-copy="${F.escapeHtml(item.id)}">複製批次</button><button type="button" data-record-print-one="${F.escapeHtml(item.id)}">列印／PDF</button><button type="button" data-record-delete="${F.escapeHtml(item.id)}">刪除</button></div>
      </article>`).join("") : `<p class="history-empty">沒有符合條件的配製紀錄。</p>`;
  }

  function openRecord(record, scroll) {
    if (!record) return;
    app.Controller.displayResult(record.result);
    setCurrentResult(record.result, record);
    if (scroll !== false) elements.panel.scrollIntoView({ behavior: app.Renderer.scrollBehavior(), block: "start" });
  }

  function bindEvents() {
    elements.form.addEventListener("submit", save);
    byId("record-new").addEventListener("click", resetForm);
    byId("record-print").addEventListener("click", () => { updatePrintSummary(currentRecord); root.print(); });
    elements.componentList.addEventListener("input", (event) => {
      const row = event.target.closest("[data-record-component]");
      if (row) {
        const index = Number(row.dataset.recordComponent);
        const actual = { amount: row.querySelector("[data-actual-amount]").value, unit: row.querySelector("[data-actual-unit]").value };
        row.querySelector("[data-component-delta]").textContent = componentDelta(currentResult.components[index], actual);
      }
      updatePrintSummary();
    });
    elements.form.addEventListener("change", () => updatePrintSummary());
    [elements.search, elements.bufferFilter, elements.dateFilter].forEach((node) => node.addEventListener(node === elements.search ? "input" : "change", renderList));
    elements.list.addEventListener("click", (event) => {
      const load = event.target.closest("[data-record-load]");
      const copy = event.target.closest("[data-record-copy]");
      const print = event.target.closest("[data-record-print-one]");
      const remove = event.target.closest("[data-record-delete]");
      if (load) openRecord(app.Records.get(load.dataset.recordLoad));
      if (copy) { try { const saved = app.Records.duplicate(copy.dataset.recordCopy); renderList(); openRecord(saved); status("已建立可編輯的新批次副本。 "); } catch (error) { status(error.message, true); } }
      if (print) { const record = app.Records.get(print.dataset.recordPrintOne); openRecord(record, false); updatePrintSummary(record); root.print(); }
      if (remove) { const record = app.Records.get(remove.dataset.recordDelete); if (record && root.confirm(`確定刪除配製紀錄「${record.title}」？`)) { if (app.Records.remove(record.id)) { if (currentRecord && currentRecord.id === record.id) resetForm(); renderList(); } else status(app.Storage.getLastError(), true); } }
    });
  }

  function init() {
    elements = {
      panel: byId("record-editor-panel"), form: byId("record-form"), id: byId("record-id"), title: byId("record-title"),
      editState: byId("record-edit-state"), componentList: byId("record-component-list"), saveMessage: byId("record-save-message"),
      printSummary: byId("record-print-summary"), search: byId("record-search"), bufferFilter: byId("record-buffer-filter"),
      dateFilter: byId("record-date-filter"), list: byId("records-list"), count: byId("records-count")
    };
    bindEvents();
    renderList();
  }

  app.RecordsUI = Object.freeze({ init, setCurrentResult, clearCurrentResult, renderList });
})(window);
