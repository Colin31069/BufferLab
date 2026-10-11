(function (root) {
  "use strict";

  const app = root.BufferLab;

  function number(value, maximumFractionDigits) {
    if (!Number.isFinite(value)) return "—";
    return new Intl.NumberFormat("zh-TW", {
      maximumFractionDigits: maximumFractionDigits == null ? 4 : maximumFractionDigits
    }).format(value);
  }

  function mass(grams) {
    const absolute = Math.abs(grams);
    if (absolute < 1e-3) return `${number(grams * 1e6, 3)} µg`;
    if (absolute < 1) return `${number(grams * 1e3, 3)} mg`;
    return `${number(grams, 4)} g`;
  }

  function volume(liters) {
    const absolute = Math.abs(liters);
    if (absolute < 1e-3) return `${number(liters * 1e6, 3)} µL`;
    if (absolute < 1) return `${number(liters * 1e3, 3)} mL`;
    return `${number(liters, 4)} L`;
  }

  function moles(value) {
    const absolute = Math.abs(value);
    if (absolute < 1e-6) return `${number(value * 1e9, 3)} nmol`;
    if (absolute < 1e-3) return `${number(value * 1e6, 3)} µmol`;
    if (absolute < 1) return `${number(value * 1e3, 3)} mmol`;
    return `${number(value, 4)} mol`;
  }

  function concentration(molar) {
    return molar < 1 ? `${number(molar * 1000, 4)} mM` : `${number(molar, 4)} M`;
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  app.Formatter = Object.freeze({ number, mass, volume, moles, concentration, escapeHtml });
})(window);
