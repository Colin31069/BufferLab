(function (root) {
  "use strict";

  const app = root.BufferLab;

  function now() { return new Date().toISOString(); }

  function optionalText(value, maximum, label) {
    const text = String(value == null ? "" : value).trim();
    if (text.length > maximum) throw new Error(`${label}不可超過 ${maximum} 個字元。`);
    return text;
  }

  function optionalNumber(value, label, minimum, maximum) {
    if (value == null || value === "") return null;
    const number = Number(value);
    if (!Number.isFinite(number) || number < minimum || (maximum != null && number > maximum)) throw new Error(`${label}超出允許範圍。`);
    return number;
  }

  function volume(value, label) {
    if (!value) return null;
    if (!["µL", "mL", "L"].includes(value.unit)) throw new Error(`${label}單位不正確。`);
    const amount = optionalNumber(value.value, label, 0);
    return amount == null ? null : { value: amount, unit: value.unit };
  }

  function components(items, result) {
    if (!Array.isArray(items)) return [];
    if (items.length > result.components.length) throw new Error("實際試劑紀錄數量與計算結果不符。 ");
    return items.map((item, index) => {
      const theory = result.components[index];
      if (!theory || item.reagentId !== theory.reagent.id) throw new Error("實際試劑順序與計算結果不符。 ");
      const allowedUnits = theory.kind === "mass" ? ["µg", "mg", "g"] : ["µL", "mL", "L"];
      if (!allowedUnits.includes(item.unit)) throw new Error(`${theory.reagent.zhName} 的實際用量單位不正確。`);
      return {
        reagentId: item.reagentId,
        amount: optionalNumber(item.amount, `${theory.reagent.zhName} 實際用量`, 0),
        unit: item.unit,
        lot: optionalText(item.lot, 120, "批號"),
        expiry: optionalText(item.expiry, 20, "效期")
      };
    });
  }

  function normalize(input, existing) {
    if (!input || !input.result || input.result.schemaVersion !== 2) throw new Error("配製紀錄缺少有效的 V2 計算結果。 ");
    const title = String(input.title || "").trim();
    if (!title) throw new Error("請填寫紀錄標題／實驗名稱。 ");
    if (title.length > 120) throw new Error("紀錄標題不可超過 120 個字元。 ");
    const notes = String(input.notes || "");
    if (notes.length > 2000) throw new Error("備註不可超過 2000 個字元。 ");
    const timestamp = now();
    return {
      schemaVersion: 2,
      id: existing ? existing.id : app.Library.uid("record"),
      title,
      bufferId: input.result.buffer.id,
      bufferName: input.result.buffer.name,
      createdAt: existing ? existing.createdAt : timestamp,
      updatedAt: timestamp,
      revision: existing ? (existing.revision || 1) + 1 : 1,
      result: app.Storage.clone(input.result),
      preparedAt: optionalText(input.preparedAt, 40, "配製時間"),
      actualVolume: volume(input.actualVolume, "實際體積"),
      actualTemperatureC: optionalNumber(input.actualTemperatureC, "操作溫度", -273.15),
      measuredPH: optionalNumber(input.measuredPH, "實測 pH", 0, 14),
      adjuster: optionalText(input.adjuster, 120, "pH 調整劑"),
      adjusterVolume: volume(input.adjusterVolume, "調整劑體積"),
      components: components(input.components || [], input.result),
      notes
    };
  }

  function save(input) {
    const records = app.Storage.getRecords();
    const index = records.findIndex((item) => item.id === input.id);
    const saved = normalize(input, index >= 0 ? records[index] : null);
    if (index >= 0) records[index] = saved; else records.unshift(saved);
    if (!app.Storage.setRecords(records)) throw new Error(app.Storage.getLastError());
    return saved;
  }

  function get(id) { return app.Storage.getRecords().find((item) => item.id === id) || null; }

  function duplicate(id) {
    const source = get(id);
    if (!source) throw new Error("找不到要複製的紀錄。 ");
    const copy = app.Storage.clone(source);
    copy.id = "";
    copy.title = `${source.title} 副本`;
    copy.preparedAt = "";
    return save(copy);
  }

  function remove(id) {
    return app.Storage.setRecords(app.Storage.getRecords().filter((item) => item.id !== id));
  }

  app.Records = Object.freeze({ save, get, duplicate, remove });
})(window);
