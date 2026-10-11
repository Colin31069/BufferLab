(function (root) {
  "use strict";

  const app = root.BufferLab;

  function calculatePka(buffer, temperatureC, messages) {
    const dynamic = buffer.dynamic;
    if (!dynamic.temperatureCoefficient) {
      if (Math.abs(temperatureC - 25) > 0.5) {
        messages.push(app.Validation.message("warning", "NO_TEMPERATURE_MODEL", "本配方沒有經來源確認的溫度係數；計算一律使用 25°C pKa，未套用你輸入的溫度。請以 pH meter 在實際使用溫度量測。", "temperature"));
      }
      return { pKa: dynamic.pKa25, temperatureApplied: false };
    }
    if (temperatureC < dynamic.temperatureRange[0] || temperatureC > dynamic.temperatureRange[1]) {
      messages.push(app.Validation.message("warning", buffer.id === "tris-buffer" ? "TRIS_TEMPERATURE_RANGE" : "TEMPERATURE_RANGE", `溫度修正僅適用 ${dynamic.temperatureRange[0]}–${dynamic.temperatureRange[1]}°C；本次改用 25°C pKa。`, "temperature"));
      return { pKa: dynamic.pKa25, temperatureApplied: false };
    }
    messages.push(app.Validation.message("info", "TEMPERATURE_CORRECTION", "已依配方提供的線性係數修正 pKa；最終 pH 仍須實測。"));
    return { pKa: dynamic.pKa25 + dynamic.temperatureCoefficient * (temperatureC - 25), temperatureApplied: true };
  }

  function makeMassComponent(reagentId, moles, purityPercent, role) {
    const reagent = app.Library.getReagent(reagentId);
    if (!reagent || !Number.isFinite(reagent.molarMass)) throw new Error(`試劑 ${reagentId} 缺少分子量`);
    const masses = app.Units.molesToMass(moles, reagent.molarMass, purityPercent || reagent.purityDefault);
    return { reagent, role, kind: "mass", moles, theoreticalMassG: masses.theoreticalG, correctedMassG: masses.correctedG, purityPercent: masses.purityPercent };
  }

  function makeStockComponent(reagentId, moles, stockConcentrationM, role) {
    const reagent = app.Library.getReagent(reagentId);
    if (!reagent) throw new Error(`試劑 ${reagentId} 不存在`);
    return { reagent, role, kind: "stock", moles, stockConcentrationM, stockVolumeL: app.Units.stockVolumeLiters(moles, stockConcentrationM) };
  }

  function calculate(input, buffer) {
    const messages = [];
    const dynamic = buffer.dynamic;
    const pKaResult = calculatePka(buffer, input.temperatureC, messages);
    const pKa = pKaResult.pKa;
    const ratio = Math.pow(10, input.pH - pKa);
    const acidConcentrationM = input.concentrationM / (1 + ratio);
    const baseConcentrationM = input.concentrationM * ratio / (1 + ratio);
    const totalMoles = input.concentrationM * input.volumeL;
    const acidMoles = acidConcentrationM * input.volumeL;
    const baseMoles = baseConcentrationM * input.volumeL;
    const components = [];

    if (Math.abs(input.pH - pKa) > 1) {
      messages.push(app.Validation.message("warning", "PH_FAR_FROM_PKA", `目標 pH 與本次使用的 pKa ${pKa.toFixed(3)} 相差超過 1，緩衝能力可能不足。`, "ph"));
    }

    if (dynamic.strategy === "paired") {
      const acidId = input.acidReagentId || dynamic.acidOptions[0];
      const baseId = input.baseReagentId || dynamic.baseOptions[0];
      if (input.useStock) {
        components.push(makeStockComponent(acidId, acidMoles, input.acidStockM, "acid"));
        components.push(makeStockComponent(baseId, baseMoles, input.baseStockM, "base"));
      } else {
        components.push(makeMassComponent(acidId, acidMoles, input.acidPurity, "acid"));
        components.push(makeMassComponent(baseId, baseMoles, input.basePurity, "base"));
      }
      if (dynamic.polyproticApproximation) {
        messages.push(app.Validation.message("warning", "POLYPROTIC_APPROXIMATION", "Phosphate 採最接近目標 pH 的 H₂PO₄⁻/HPO₄²⁻ 單一步驟近似，未完整計入活度與多重平衡。"));
      }
    } else {
      if (input.useStock) {
        components.push(makeStockComponent(dynamic.reagentId, totalMoles, input.singleStockM, "buffer"));
      } else {
        components.push(makeMassComponent(dynamic.reagentId, totalMoles, input.singlePurity, "buffer"));
      }
      messages.push(app.Validation.message("warning", "TITRATION_REQUIRED", "理論比例僅供理解；HCl／NaOH 實際用量受試劑型態、活度與離子強度影響，請以 pH meter 逐步滴定。"));
    }

    messages.push(app.Validation.message("info", "SOLUBILITY_NOT_EVALUATED", "本次結果未宣稱完整溶解度上限；若使用高濃度配方，請另查試劑技術資料。"));

    return app.Provenance.attach({
      schemaVersion: 2,
      mode: "dynamic",
      buffer,
      input,
      components,
      calculation: {
        formula: "pH = pKa + log₁₀([Base]/[Acid])",
        pKa,
        temperatureApplied: pKaResult.temperatureApplied,
        ratio,
        acidLabel: dynamic.acidLabel,
        baseLabel: dynamic.baseLabel,
        acidConcentrationM,
        baseConcentrationM,
        totalMoles
      },
      messages,
      createdAt: new Date().toISOString(),
      dataVersion: app.Constants.DATA_VERSION
    });
  }

  app.DynamicBufferEngine = Object.freeze({ calculate, calculatePka });
})(window);
