(function (root) {
  "use strict";

  const app = root.BufferLab;

  function calculate(input, buffer) {
    const recipe = buffer.standardRecipe;
    const scale = (input.volumeL / recipe.baseVolumeL) * (input.strength / recipe.baseStrength);
    const components = recipe.components.map((definition) => {
      const resolvedId = input.reagentOverrides && input.reagentOverrides[definition.reagentId] || definition.reagentId;
      const reagent = app.Library.getReagent(resolvedId);
      if (!reagent) throw new Error(`試劑 ${resolvedId} 不存在`);
      const purity = Number(input.purities && input.purities[definition.reagentId]) || reagent.purityDefault;
      if (definition.kind === "moles") {
        const moles = definition.amount * scale;
        const masses = app.Units.molesToMass(moles, reagent.molarMass, purity);
        return {
          reagent,
          kind: "mass",
          moles,
          theoreticalMassG: masses.theoreticalG,
          correctedMassG: masses.correctedG,
          purityPercent: masses.purityPercent,
          basis: `${app.Formatter.number(definition.amount / recipe.baseVolumeL, 4)} mol/L 於 ${recipe.baseStrength}× 基準配方`
        };
      }
      if (definition.kind === "fixedMass") {
        const theory = definition.amount * scale;
        const corrected = theory / (purity / 100);
        return { reagent, kind: "mass", moles: reagent.molarMass ? theory / reagent.molarMass : null, theoreticalMassG: theory, correctedMassG: corrected, purityPercent: purity, basis: `${definition.amount} g／${recipe.baseVolumeL} L ${recipe.baseStrength}×` };
      }
      const volumeL = app.Units.toLiters(definition.amount * scale, definition.unit);
      return { reagent, kind: "volume", volumeL, basis: `${definition.amount} ${definition.unit}／${recipe.baseVolumeL} L ${recipe.baseStrength}×` };
    });

    return app.Provenance.attach({
      schemaVersion: 2,
      mode: "standard",
      buffer,
      input,
      components,
      calculation: {
        formula: "目標用量 = 基準用量 × (目標體積 ÷ 基準體積) × (目標倍數 ÷ 基準倍數)",
        scale
      },
      messages: [app.Validation.message("info", "FINAL_VOLUME", "固體溶解後請以 DI water 定容，不以固體體積推算剩餘水量。")],
      createdAt: new Date().toISOString(),
      dataVersion: app.Constants.DATA_VERSION
    });
  }

  app.StandardRecipeEngine = Object.freeze({ calculate });
})(window);
