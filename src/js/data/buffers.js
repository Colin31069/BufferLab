(function (root) {
  "use strict";

  const app = root.BufferLab;

  function freezeBuffer(data) {
    data.builtIn = true;
    data.status = "verified";
    data.version = data.version || 1;
    if (data.standardRecipe) {
      data.standardRecipe.components = Object.freeze(data.standardRecipe.components.map(Object.freeze));
      data.standardRecipe = Object.freeze(data.standardRecipe);
    }
    if (data.dynamic) data.dynamic = Object.freeze(data.dynamic);
    return Object.freeze(data);
  }

  app.Buffers = Object.freeze({
    pbs: freezeBuffer({
      id: "pbs", name: "PBS（磷酸鹽緩衝生理食鹽水）", mode: "standard", defaultPH: 7.4,
      referenceRef: "thermoPbsTbs", referenceNote: "依 1× 終濃度組成建立；不同機構 PBS 配方可能略有差異。",
      standardRecipe: { baseVolumeL: 1, baseStrength: 1, strengthOptions: [0.5, 1, 5, 10], components: [
        { reagentId: "nacl", kind: "moles", amount: 0.137 },
        { reagentId: "kcl", kind: "moles", amount: 0.0027 },
        { reagentId: "na2hpo4", kind: "moles", amount: 0.008 },
        { reagentId: "kh2po4", kind: "moles", amount: 0.002 }
      ] }
    }),
    tbs: freezeBuffer({
      id: "tbs", name: "TBS（Tris 緩衝生理食鹽水）", mode: "standard", defaultPH: 7.4,
      referenceRef: "thermoPbsTbs", referenceNote: "50 mM Tris、150 mM NaCl、pH 7.4。",
      standardRecipe: { baseVolumeL: 1, baseStrength: 1, strengthOptions: [0.5, 1, 5, 10], components: [
        { reagentId: "tris", kind: "moles", amount: 0.05 },
        { reagentId: "nacl", kind: "moles", amount: 0.15 }
      ] }
    }),
    tae: freezeBuffer({
      id: "tae", name: "TAE 電泳緩衝液", mode: "standard", defaultPH: 8.3,
      referenceRef: "bioRadElectrophoresis", referenceNote: "以 Bio-Rad 50× TAE 配方作為基準。",
      standardRecipe: { baseVolumeL: 1, baseStrength: 50, strengthOptions: [0.5, 1, 10, 50], components: [
        { reagentId: "tris", kind: "fixedMass", amount: 242, unit: "g" },
        { reagentId: "acetic_acid_glacial", kind: "fixedVolume", amount: 57.1, unit: "mL" },
        { reagentId: "edta_stock_05m", kind: "fixedVolume", amount: 100, unit: "mL" }
      ] }
    }),
    tbe: freezeBuffer({
      id: "tbe", name: "TBE 電泳緩衝液", mode: "standard", defaultPH: 8.3,
      referenceRef: "bioRadElectrophoresis", referenceNote: "以 Bio-Rad 10× TBE 配方作為基準。",
      standardRecipe: { baseVolumeL: 1, baseStrength: 10, strengthOptions: [0.5, 1, 5, 10], components: [
        { reagentId: "tris", kind: "fixedMass", amount: 108, unit: "g" },
        { reagentId: "boric_acid", kind: "fixedMass", amount: 55, unit: "g" },
        { reagentId: "edta_stock_05m", kind: "fixedVolume", amount: 40, unit: "mL" }
      ] }
    }),
    ssc: freezeBuffer({
      id: "ssc", name: "SSC（生理食鹽水－檸檬酸鈉）", mode: "standard", defaultPH: 7.0,
      referenceRef: "thermoSsc", referenceNote: "20× SSC 為 3 M NaCl、0.3 M sodium citrate；依倍數縮放。",
      standardRecipe: { baseVolumeL: 1, baseStrength: 20, strengthOptions: [0.5, 1, 2, 5, 10, 20], components: [
        { reagentId: "nacl", kind: "moles", amount: 3 },
        { reagentId: "sodium_citrate_2h2o", kind: "moles", amount: 0.3 }
      ] }
    }),
    phosphate: freezeBuffer({
      id: "phosphate", name: "Phosphate buffer（NaH₂PO₄ / Na₂HPO₄）", mode: "dynamic", defaultPH: 7.2, defaultConcentrationM: 0.1,
      referenceRef: "sigmaBuffers", referenceNote: "使用第二解離階段 H₂PO₄⁻/HPO₄²⁻ 的近似模型。",
      dynamic: { strategy: "paired", pKa25: 7.21, usefulRange: [6.2, 8.2], acidLabel: "H₂PO₄⁻", baseLabel: "HPO₄²⁻", acidOptions: ["nah2po4", "nah2po4_h2o", "nah2po4_2h2o"], baseOptions: ["na2hpo4", "na2hpo4_2h2o", "na2hpo4_7h2o", "na2hpo4_12h2o"], polyproticApproximation: true }
    }),
    "phosphate-kh2po4": freezeBuffer({
      id: "phosphate-kh2po4", name: "Phosphate buffer（KH₂PO₄ / Na₂HPO₄）", mode: "dynamic", defaultPH: 7.2, defaultConcentrationM: 0.1,
      referenceRef: "sigmaBuffers", referenceNote: "使用第二解離階段近似；酸型固定為 KH₂PO₄、鹼型為 Na₂HPO₄，不含 NaCl 或 KCl。",
      dynamic: { strategy: "paired", pKa25: 7.21, usefulRange: [6.2, 8.2], acidLabel: "H₂PO₄⁻", baseLabel: "HPO₄²⁻", acidOptions: ["kh2po4"], baseOptions: ["na2hpo4", "na2hpo4_2h2o", "na2hpo4_7h2o", "na2hpo4_12h2o"], polyproticApproximation: true }
    }),
    "tris-buffer": freezeBuffer({
      id: "tris-buffer", name: "Tris / Tris-HCl buffer", mode: "dynamic", defaultPH: 8.0, defaultConcentrationM: 0.05,
      referenceRef: "sigmaBuffers", referenceNote: "使用 Tris-HCl/Tris 成對試劑；5–37°C 內套用溫度修正。",
      dynamic: { strategy: "paired", pKa25: 8.06, usefulRange: [7.0, 9.0], acidLabel: "Tris-H⁺", baseLabel: "Tris", acidOptions: ["tris_hcl"], baseOptions: ["tris"], temperatureCoefficient: -0.028, temperatureRange: [5, 37] }
    }),
    hepes: freezeBuffer({
      id: "hepes", name: "HEPES buffer", mode: "dynamic", defaultPH: 7.4, defaultConcentrationM: 0.02,
      referenceRef: "sigmaBuffers", referenceNote: "25°C pKa；自由酸配製後以 pH meter 滴定。",
      dynamic: { strategy: "titration", pKa25: 7.56, usefulRange: [6.8, 8.2], acidLabel: "HEPES-H", baseLabel: "HEPES⁻", reagentId: "hepes" }
    }),
    mes: freezeBuffer({
      id: "mes", name: "MES buffer", mode: "dynamic", defaultPH: 6.1, defaultConcentrationM: 0.05,
      referenceRef: "sigmaBuffers", referenceNote: "25°C pKa；自由酸配製後以 pH meter 滴定。",
      dynamic: { strategy: "titration", pKa25: 6.27, usefulRange: [5.5, 6.7], acidLabel: "MES-H", baseLabel: "MES⁻", reagentId: "mes" }
    }),
    mops: freezeBuffer({
      id: "mops", name: "MOPS buffer", mode: "dynamic", defaultPH: 7.2, defaultConcentrationM: 0.02,
      referenceRef: "sigmaBuffers", referenceNote: "25°C pKa；自由酸配製後以 pH meter 滴定。",
      dynamic: { strategy: "titration", pKa25: 7.18, usefulRange: [6.5, 7.9], acidLabel: "MOPS-H", baseLabel: "MOPS⁻", reagentId: "mops" }
    })
  });
})(window);
