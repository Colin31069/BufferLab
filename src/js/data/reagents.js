(function (root) {
  "use strict";

  const app = root.BufferLab;
  const verifiedOn = "2026-07-31";

  function reagent(data) {
    return Object.freeze(Object.assign({
      purityDefault: 100,
      physicalForm: "solid",
      unit: "g",
      hydration: "anhydrous",
      sourceRef: "pubChem",
      verifiedOn,
      status: "verified",
      builtIn: true,
      version: 1,
      notes: "使用前請核對試劑瓶標示。"
    }, data));
  }

  app.Reagents = Object.freeze({
    nacl: reagent({ id: "nacl", zhName: "氯化鈉", enName: "Sodium chloride", formula: "NaCl", cas: "7647-14-5", molarMass: 58.44 }),
    kcl: reagent({ id: "kcl", zhName: "氯化鉀", enName: "Potassium chloride", formula: "KCl", cas: "7447-40-7", molarMass: 74.5513 }),
    kh2po4: reagent({ id: "kh2po4", zhName: "磷酸二氫鉀", enName: "Potassium phosphate monobasic", formula: "KH₂PO₄", cas: "7778-77-0", molarMass: 136.086 }),
    na2hpo4: reagent({ id: "na2hpo4", zhName: "磷酸氫二鈉（無水）", enName: "Sodium phosphate dibasic, anhydrous", formula: "Na₂HPO₄", cas: "7558-79-4", molarMass: 141.958 }),
    na2hpo4_2h2o: reagent({ id: "na2hpo4_2h2o", zhName: "磷酸氫二鈉二水合物", enName: "Sodium phosphate dibasic dihydrate", formula: "Na₂HPO₄·2H₂O", cas: "10028-24-7", molarMass: 177.99, hydration: "dihydrate" }),
    na2hpo4_7h2o: reagent({ id: "na2hpo4_7h2o", zhName: "磷酸氫二鈉七水合物", enName: "Sodium phosphate dibasic heptahydrate", formula: "Na₂HPO₄·7H₂O", cas: "7782-85-6", molarMass: 268.07, hydration: "heptahydrate" }),
    na2hpo4_12h2o: reagent({ id: "na2hpo4_12h2o", zhName: "磷酸氫二鈉十二水合物", enName: "Sodium phosphate dibasic dodecahydrate", formula: "Na₂HPO₄·12H₂O", cas: "10039-32-4", molarMass: 358.14, hydration: "dodecahydrate", sourceRef: "sigmaBuffers" }),
    nah2po4: reagent({ id: "nah2po4", zhName: "磷酸二氫鈉（無水）", enName: "Sodium phosphate monobasic, anhydrous", formula: "NaH₂PO₄", cas: "7558-80-7", molarMass: 119.977 }),
    nah2po4_h2o: reagent({ id: "nah2po4_h2o", zhName: "磷酸二氫鈉一水合物", enName: "Sodium phosphate monobasic monohydrate", formula: "NaH₂PO₄·H₂O", cas: "10049-21-5", molarMass: 137.99, hydration: "monohydrate" }),
    nah2po4_2h2o: reagent({ id: "nah2po4_2h2o", zhName: "磷酸二氫鈉二水合物", enName: "Sodium phosphate monobasic dihydrate", formula: "NaH₂PO₄·2H₂O", cas: "13472-35-0", molarMass: 156.01, hydration: "dihydrate" }),
    tris: reagent({ id: "tris", zhName: "Tris 鹼", enName: "Tris base", formula: "C₄H₁₁NO₃", cas: "77-86-1", molarMass: 121.14, sourceRef: "sigmaBuffers", notes: "pH 對溫度敏感；請在使用溫度附近量測。" }),
    tris_hcl: reagent({ id: "tris_hcl", zhName: "Tris-HCl", enName: "Tris hydrochloride", formula: "C₄H₁₂ClNO₃", cas: "1185-53-1", molarMass: 157.60, sourceRef: "sigmaBuffers" }),
    hepes: reagent({ id: "hepes", zhName: "HEPES", enName: "HEPES free acid", formula: "C₈H₁₈N₂O₄S", cas: "7365-45-9", molarMass: 238.30, sourceRef: "sigmaBuffers" }),
    mes: reagent({ id: "mes", zhName: "MES", enName: "MES free acid", formula: "C₆H₁₃NO₄S", cas: "4432-31-9", molarMass: 195.24, sourceRef: "sigmaBuffers" }),
    mops: reagent({ id: "mops", zhName: "MOPS", enName: "MOPS free acid", formula: "C₇H₁₅NO₄S", cas: "1132-61-2", molarMass: 209.26, sourceRef: "sigmaBuffers" }),
    boric_acid: reagent({ id: "boric_acid", zhName: "硼酸", enName: "Boric acid", formula: "H₃BO₃", cas: "10043-35-3", molarMass: 61.83 }),
    sodium_citrate_2h2o: reagent({ id: "sodium_citrate_2h2o", zhName: "檸檬酸三鈉二水合物", enName: "Trisodium citrate dihydrate", formula: "Na₃C₆H₅O₇·2H₂O", cas: "6132-04-3", molarMass: 294.10, hydration: "dihydrate" }),
    sodium_citrate: reagent({ id: "sodium_citrate", zhName: "檸檬酸三鈉（無水）", enName: "Trisodium citrate, anhydrous", formula: "Na₃C₆H₅O₇", cas: "68-04-2", molarMass: 258.07, verifiedOn: "2026-08-04" }),
    edta_stock_05m: reagent({ id: "edta_stock_05m", zhName: "0.5 M EDTA（pH 8.0）", enName: "0.5 M EDTA stock, pH 8.0", formula: "無單一化學式（0.5 M EDTA 二鈉鹽水溶液，pH 8.0）", cas: "—", molarMass: null, physicalForm: "stock", unit: "mL", notes: "使用已校正至 pH 8.0 的 0.5 M 庫存液。", sourceRef: "bioRadElectrophoresis" }),
    acetic_acid_glacial: reagent({ id: "acetic_acid_glacial", zhName: "冰醋酸", enName: "Glacial acetic acid", formula: "CH₃COOH", cas: "64-19-7", molarMass: 60.052, physicalForm: "liquid", unit: "mL", notes: "具腐蝕性；應於合適防護與通風條件下操作。", sourceRef: "bioRadElectrophoresis" })
  });
})(window);
