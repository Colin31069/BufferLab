(function (root) {
  "use strict";

  const app = root.BufferLab;

  function snapshot(value) {
    return app.Storage.clone(value);
  }

  function attach(result) {
    const reference = result.buffer.referenceRef ? app.References[result.buffer.referenceRef] : null;
    result.schemaVersion = 2;
    result.provenance = {
      appVersion: app.Constants.VERSION,
      dataVersion: app.Constants.DATA_VERSION,
      recipeId: result.buffer.id,
      recipeVersion: result.buffer.version || 1,
      recipeStatus: result.buffer.status || "user-unverified",
      recipeSnapshot: snapshot(result.buffer),
      reagentSnapshots: result.components.map((component) => snapshot(component.reagent)),
      reference: reference ? snapshot(reference) : {
        title: result.buffer.referenceNote || "使用者自訂來源",
        url: result.buffer.sourceUrl || "",
        status: "user-provided"
      },
      calculatedAt: result.createdAt
    };
    return result;
  }

  app.Provenance = Object.freeze({ attach, snapshot });
})(window);
