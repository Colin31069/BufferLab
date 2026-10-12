(function (root) {
  "use strict";

  const app = root.BufferLab;
  const F = app.Formatter;

  function messageIcon(level) {
    return level === "error" ? "✕" : level === "warning" ? "!" : "i";
  }

  function renderMessages(container, messages) {
    if (!messages.length) {
      container.innerHTML = "";
      return;
    }
    container.innerHTML = `<div class="messages">${messages.map((item) => `
      <div class="message message-${F.escapeHtml(item.level)}" role="${item.level === "error" ? "alert" : "note"}">
        <strong aria-hidden="true">${messageIcon(item.level)}</strong>
        <span><strong>${F.escapeHtml(app.Constants.MESSAGE_LEVELS[item.level])}：</strong>${F.escapeHtml(item.text)}</span>
      </div>`).join("")}</div>`;
  }

  function componentAmount(component) {
    if (component.kind === "stock") return F.volume(component.stockVolumeL);
    if (component.kind === "volume") return F.volume(component.volumeL);
    if (Math.abs(component.correctedMassG - component.theoreticalMassG) < 1e-12) return F.mass(component.correctedMassG);
    return `${F.mass(component.correctedMassG)}（理論 ${F.mass(component.theoreticalMassG)}）`;
  }

  function scrollBehavior() {
    return root.matchMedia && root.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
  }

  function componentRows(result) {
    return result.components.map((component) => `
      <tr>
        <td><strong>${F.escapeHtml(component.reagent.zhName)}</strong><br><span class="muted">${F.escapeHtml(component.reagent.enName)}</span></td>
        <td>${F.escapeHtml(component.reagent.formula)}</td>
        <td>${component.reagent.molarMass ? `${F.number(component.reagent.molarMass, 4)} g/mol` : "—"}</td>
        <td>${component.moles == null ? "—" : F.moles(component.moles)}</td>
        <td><strong>${componentAmount(component)}</strong>${component.purityPercent != null ? `<br><span class="muted">純度 ${F.number(component.purityPercent, 2)}%</span>` : ""}${component.stockConcentrationM ? `<br><span class="muted">庫存液 ${F.concentration(component.stockConcentrationM)}</span>` : ""}</td>
      </tr>`).join("");
  }

  function summaryCards(result) {
    const input = result.input;
    const concentration = result.mode === "dynamic" ? F.concentration(input.concentrationM) : `${F.number(input.strength, 3)}×`;
    return `
      <div class="recipe-summary">
        <div class="summary-card"><span>緩衝液</span><strong>${F.escapeHtml(result.buffer.name)}</strong></div>
        <div class="summary-card"><span>目標體積</span><strong>${F.volume(input.volumeL)}</strong></div>
        <div class="summary-card"><span>${result.mode === "dynamic" ? "總濃度" : "目標倍數"}</span><strong>${concentration}</strong></div>
        <div class="summary-card"><span>配製模式</span><strong>${result.mode === "standard" ? "標準配方縮放" : "動態酸鹼計算"}</strong></div>
        <div class="summary-card"><span>目標 pH</span><strong>${F.number(result.mode === "dynamic" ? input.pH : result.buffer.defaultPH, 2)}</strong></div>
        <div class="summary-card"><span>計算溫度</span><strong>${result.mode === "dynamic" ? result.calculation.temperatureApplied ? `${F.number(input.temperatureC, 1)}°C` : "25°C（未套用溫度修正）" : "依來源配方"}</strong></div>
      </div>`;
  }

  function calculationDetails(result) {
    if (result.mode === "standard") {
      return `<p><strong>公式：</strong>${F.escapeHtml(result.calculation.formula)}</p><p><strong>本次縮放係數：</strong>${F.number(result.calculation.scale, 8)}</p>`;
    }
    const calc = result.calculation;
    return `
      <p><strong>公式：</strong>${F.escapeHtml(calc.formula)}</p>
      <p><strong>使用 pKa：</strong>${F.number(calc.pKa, 4)}；<strong>${F.escapeHtml(calc.baseLabel)}/${F.escapeHtml(calc.acidLabel)}：</strong>${F.number(calc.ratio, 6)}</p>
      <p><strong>${F.escapeHtml(calc.acidLabel)}：</strong>${F.concentration(calc.acidConcentrationM)}；<strong>${F.escapeHtml(calc.baseLabel)}：</strong>${F.concentration(calc.baseConcentrationM)}</p>`;
  }

  function sop(result) {
    const input = result.input;
    const liquidVolumeL = result.components.reduce((sum, component) => {
      if (component.stockVolumeL != null) return sum + component.stockVolumeL;
      if (component.volumeL != null) return sum + component.volumeL;
      return sum;
    }, 0);
    const availableVolumeL = Math.max(0, input.volumeL - liquidVolumeL);
    const initialWater = Math.min(input.volumeL * app.Constants.INITIAL_WATER_FRACTION, availableVolumeL * app.Constants.INITIAL_WATER_FRACTION);
    const waterStep = liquidVolumeL > 0
      ? `先加入約 ${F.volume(initialWater)} DI water；起始水量已先為 ${F.volume(liquidVolumeL)} 的液體試劑預留空間。`
      : `先加入約 ${F.volume(initialWater)} DI water（約目標體積的 80%），供初步溶解使用。`;
    const names = result.components.map((item) => item.reagent.zhName).join("、");
    const titration = result.mode === "dynamic" && result.buffer.dynamic.strategy === "titration";
    return [
      "準備乾淨容器、適用天平或量器，以及校正完成的 pH meter。",
      waterStep,
      `依序加入 ${names}，攪拌至完全溶解或混合均勻。`,
      result.mode === "dynamic" ? `在約 ${F.number(input.temperatureC, 1)}°C 量測 pH。` : `確認配方建議 pH 約為 ${F.number(result.buffer.defaultPH, 2)}。`,
      titration ? "本模式使用自由酸試劑；以適當濃度 NaOH 少量逐步滴定，若過量不可用理論值回推修正。" : "如需調整，使用適當濃度的 HCl 或 NaOH 少量逐步加入並持續量測。",
      `以 DI water 分次定容至 ${F.volume(input.volumeL)}；起始水量不是精確用水量，固體溶解後的體積變化無法由本工具推算。`,
      "充分混合後再次確認 pH，並記錄實際溫度與讀值。",
      "依實驗室 SOP 決定是否過濾除菌、滅菌、分裝及保存。"
    ];
  }

  function renderRecipe(container, result) {
    const reference = result.provenance && result.provenance.reference || app.References[result.buffer.referenceRef] || { title: result.buffer.referenceNote || "使用者自訂來源", url: "" };
    const source = reference.url ? `<a href="${F.escapeHtml(reference.url)}" target="_blank" rel="noreferrer">${F.escapeHtml(reference.title)}</a>` : F.escapeHtml(reference.title);
    const verified = result.provenance && result.provenance.recipeStatus === "verified";
    container.innerHTML = `
      <div class="provenance-strip"><span class="status-badge${verified ? "" : " unverified"}">${verified ? "內建已驗證" : "使用者自訂／未經 BufferLab 驗證"}</span><span class="status-badge">配方 v${F.escapeHtml(result.provenance && result.provenance.recipeVersion || 1)}</span><span class="status-badge">Schema v${F.escapeHtml(result.schemaVersion)}</span></div>
      ${summaryCards(result)}
      <h3>試劑需求</h3>
      <div class="table-wrap"><table><thead><tr><th>試劑</th><th>化學式</th><th>分子量</th><th>莫耳數</th><th>秤取／移取量</th></tr></thead><tbody>${componentRows(result)}</tbody></table></div>
      <details open><summary><strong>計算依據</strong></summary><div class="formula-box">${calculationDetails(result)}</div></details>
      <h3>配製 SOP</h3>
      <ol class="sop-list">${sop(result).map((step) => `<li>${F.escapeHtml(step)}</li>`).join("")}</ol>
      <p class="source-note"><strong>資料來源：</strong>${source}<br>${F.escapeHtml(result.buffer.referenceNote)} 資料版本：${F.escapeHtml(result.dataVersion)}；App：${F.escapeHtml(result.provenance && result.provenance.appVersion || app.Constants.VERSION)}。</p>`;
  }

  function toPlainText(result) {
    const lines = [
      `${app.Constants.APP_NAME} — ${result.buffer.name}`,
      `模式：${result.mode === "standard" ? "標準配方縮放" : "動態酸鹼計算"}`,
      `目標體積：${F.volume(result.input.volumeL)}`,
      result.mode === "standard" ? `目標倍數：${F.number(result.input.strength, 3)}×` : `目標濃度：${F.concentration(result.input.concentrationM)}；目標 pH：${F.number(result.input.pH, 2)}`,
      "",
      "試劑需求："
    ];
    result.components.forEach((component) => lines.push(`- ${component.reagent.zhName}（${component.reagent.formula}）：${componentAmount(component)}`));
    lines.push("", "配製步驟：");
    sop(result).forEach((step, index) => lines.push(`${index + 1}. ${step}`));
    lines.push("", "安全提醒：理論計算不取代 pH meter、試劑標示與實驗室 SOP。");
    lines.push(`追溯資訊：BufferLab ${result.provenance && result.provenance.appVersion || app.Constants.VERSION}；配方 v${result.provenance && result.provenance.recipeVersion || 1}；${result.provenance && result.provenance.recipeStatus === "verified" ? "內建已驗證" : "使用者自訂／未經 BufferLab 驗證"}。`);
    return lines.join("\n");
  }

  app.Renderer = Object.freeze({ renderMessages, renderRecipe, toPlainText, scrollBehavior });
})(window);
