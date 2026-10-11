(function (root) {
  "use strict";

  const app = root.BufferLab;
  const volumeFactors = Object.freeze({ L: 1, mL: 1e-3, "µL": 1e-6 });
  const concentrationFactors = Object.freeze({ M: 1, mM: 1e-3 });
  const massFactors = Object.freeze({ g: 1, mg: 1e-3, "µg": 1e-6 });

  function finiteNumber(value, label) {
    const number = Number(value);
    if (!Number.isFinite(number)) {
      throw new TypeError(`${label || "數值"}必須是有限數字`);
    }
    return number;
  }

  function toLiters(value, unit) {
    if (!(unit in volumeFactors)) throw new RangeError(`不支援的體積單位：${unit}`);
    return finiteNumber(value, "體積") * volumeFactors[unit];
  }

  function fromLiters(value, unit) {
    if (!(unit in volumeFactors)) throw new RangeError(`不支援的體積單位：${unit}`);
    return finiteNumber(value, "體積") / volumeFactors[unit];
  }

  function toMolar(value, unit) {
    if (!(unit in concentrationFactors)) throw new RangeError(`不支援的濃度單位：${unit}`);
    return finiteNumber(value, "濃度") * concentrationFactors[unit];
  }

  function fromMolar(value, unit) {
    if (!(unit in concentrationFactors)) throw new RangeError(`不支援的濃度單位：${unit}`);
    return finiteNumber(value, "濃度") / concentrationFactors[unit];
  }

  function molesToMass(moles, molarMass, purityPercent) {
    const theory = finiteNumber(moles, "莫耳數") * finiteNumber(molarMass, "分子量");
    const purity = finiteNumber(purityPercent == null ? 100 : purityPercent, "純度") / 100;
    if (purity <= 0 || purity > 1) throw new RangeError("純度必須大於 0 且不超過 100% ");
    return { theoreticalG: theory, correctedG: theory / purity, purityPercent: purity * 100 };
  }

  function stockVolumeLiters(moles, stockConcentrationM) {
    const concentration = finiteNumber(stockConcentrationM, "庫存液濃度");
    if (concentration <= 0) throw new RangeError("庫存液濃度必須大於 0");
    return finiteNumber(moles, "莫耳數") / concentration;
  }

  function toGrams(value, unit) {
    if (!(unit in massFactors)) throw new RangeError(`不支援的質量單位：${unit}`);
    return finiteNumber(value, "質量") * massFactors[unit];
  }

  function fromGrams(value, unit) {
    if (!(unit in massFactors)) throw new RangeError(`不支援的質量單位：${unit}`);
    return finiteNumber(value, "質量") / massFactors[unit];
  }

  app.Units = Object.freeze({
    finiteNumber,
    toLiters,
    fromLiters,
    toMolar,
    fromMolar,
    molesToMass,
    stockVolumeLiters,
    toGrams,
    fromGrams
  });
})(window);
