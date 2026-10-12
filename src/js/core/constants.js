(function (root) {
  "use strict";

  const app = root.BufferLab = root.BufferLab || {};

  app.Constants = Object.freeze({
    APP_NAME: "緩衝液配製計算器",
    VERSION: "2.0.1",
    DATA_VERSION: "2026-08-04",
    INITIAL_WATER_FRACTION: 0.8,
    MIN_RELIABLE_MASS_G: 0.001,
    HISTORY_LIMIT: 10,
    STORAGE_KEYS: Object.freeze({
      history: "bufferlab:v2:history",
      theme: "bufferlab:v2:theme",
      preferences: "bufferlab:v2:preferences",
      customReagents: "bufferlab:v2:custom-reagents",
      customRecipes: "bufferlab:v2:custom-recipes",
      records: "bufferlab:v2:records",
      migrated: "bufferlab:v2:migrated"
    }),
    LEGACY_STORAGE_KEYS: Object.freeze({
      history: "bufferlab:v1:history",
      theme: "bufferlab:v1:theme",
      preferences: "bufferlab:v1:preferences"
    }),
    MESSAGE_LEVELS: Object.freeze({
      error: "錯誤",
      warning: "警告",
      info: "提示"
    })
  });
})(window);
