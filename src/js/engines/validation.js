(function (root) {
  "use strict";

  const app = root.BufferLab;

  function message(level, code, text, field) {
    return { level, code, text, field: field || null };
  }

  function validateCommon(input, buffer) {
    const messages = [];
    if (!Number.isFinite(input.volumeL) || input.volumeL <= 0) {
      messages.push(message("error", "INVALID_VOLUME", "目標體積必須大於 0。", "volume"));
    }
    if (!buffer) messages.push(message("error", "UNKNOWN_BUFFER", "找不到選取的緩衝液。", "buffer"));

    if (buffer && buffer.mode === "standard") {
      if (!Number.isFinite(input.strength) || input.strength <= 0) {
        messages.push(message("error", "INVALID_STRENGTH", "標準倍數必須大於 0。", "strength"));
      }
    }

    if (buffer && buffer.mode === "dynamic") {
      if (!Number.isFinite(input.concentrationM) || input.concentrationM <= 0) {
        messages.push(message("error", "INVALID_CONCENTRATION", "目標濃度必須大於 0。", "concentration"));
      }
      if (!Number.isFinite(input.pH) || input.pH < 0 || input.pH > 14) {
        messages.push(message("error", "INVALID_PH", "目標 pH 必須介於 0 與 14。", "ph"));
      }
      if (!Number.isFinite(input.temperatureC)) {
        messages.push(message("error", "INVALID_TEMPERATURE", "配製溫度必須是有限數值。", "temperature"));
      }
      if (Number.isFinite(input.pH) && buffer.dynamic) {
        const limits = buffer.dynamic.usefulRange;
        if (input.pH < limits[0] || input.pH > limits[1]) {
          messages.push(message("warning", "OUTSIDE_BUFFER_RANGE", `目標 pH 超出建議緩衝範圍 ${limits[0]}–${limits[1]}。`, "ph"));
        }
      }
    }

    return messages;
  }

  function validatePurity(value, field) {
    if (!Number.isFinite(value) || value <= 0 || value > 100) {
      return message("error", "INVALID_PURITY", "純度必須大於 0 且不超過 100%。", field);
    }
    return null;
  }

  function liquidVolumeL(component) {
    if (component.stockVolumeL != null) return component.stockVolumeL;
    if (component.volumeL != null) return component.volumeL;
    return 0;
  }

  function validateResult(result, input) {
    const messages = [];
    result.components.forEach((component) => {
      if (component.correctedMassG != null && component.correctedMassG < app.Constants.MIN_RELIABLE_MASS_G) {
        messages.push(message("warning", "LOW_MASS", `${component.reagent.zhName} 的秤量低於 1 mg；請確認天平能力或先配製庫存液。`));
      }
      if (!component.reagent || (component.kind === "mass" && !Number.isFinite(component.reagent.molarMass) && component.moles != null)) {
        messages.push(message("error", "MISSING_MOLAR_MASS", "試劑缺少可驗證的分子量，無法計算。"));
      }
      if (liquidVolumeL(component) > input.volumeL) {
        messages.push(message("error", "LIQUID_EXCEEDS_FINAL", `${component.reagent.zhName} 的液體體積大於最終體積。`));
      }
    });
    const liquidTotal = result.components.reduce((sum, item) => sum + liquidVolumeL(item), 0);
    if (liquidTotal > input.volumeL) {
      messages.push(message("error", "LIQUID_TOTAL_EXCEEDS_FINAL", "所有液體體積總和大於最終體積。"));
    } else if (liquidTotal > input.volumeL * 0.9) {
      messages.push(message("warning", "LIQUID_NEAR_FINAL", "所有液體體積已超過最終體積的 90%；請保留足夠定容空間。"));
    }
    return messages;
  }

  function hasErrors(messages) {
    return messages.some((item) => item.level === "error");
  }

  app.Validation = Object.freeze({ message, validateCommon, validatePurity, validateResult, hasErrors });
})(window);
