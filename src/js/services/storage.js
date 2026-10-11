(function (root) {
  "use strict";

  const app = root.BufferLab;
  const keys = app.Constants.STORAGE_KEYS;
  let lastError = null;
  let migrationNotice = null;

  function clone(value) {
    return value == null ? value : JSON.parse(JSON.stringify(value));
  }

  function read(key, fallback) {
    try {
      const raw = root.localStorage.getItem(key);
      if (raw == null) { lastError = null; return clone(fallback); }
      const parsed = JSON.parse(raw);
      lastError = null;
      return parsed == null ? clone(fallback) : parsed;
    } catch (_error) {
      lastError = `無法讀取本機資料：${key}`;
      return clone(fallback);
    }
  }

  function write(key, value) {
    const serialized = JSON.stringify(value);
    try {
      root.localStorage.setItem(key, serialized);
      lastError = null;
      return true;
    } catch (_error) {
      lastError = "瀏覽器儲存空間不足或目前不允許寫入；既有資料未被變更。";
      return false;
    }
  }

  function migrateV1() {
    if (read(keys.migrated, false) === true) return migrationNotice;
    const legacy = app.Constants.LEGACY_STORAGE_KEYS;
    let copied = 0;
    try {
      if (root.localStorage.getItem(keys.history) == null) {
        const history = read(legacy.history, []);
        if (Array.isArray(history) && history.length && write(keys.history, history.slice(0, app.Constants.HISTORY_LIMIT))) copied += 1;
      }
      if (root.localStorage.getItem(keys.theme) == null) {
        const theme = read(legacy.theme, null);
        if ((theme === "light" || theme === "dark") && write(keys.theme, theme)) copied += 1;
      }
      if (root.localStorage.getItem(keys.preferences) == null) {
        const preferences = read(legacy.preferences, null);
        if (preferences && typeof preferences === "object" && write(keys.preferences, preferences)) copied += 1;
      }
      if (!write(keys.migrated, true)) return lastError;
      migrationNotice = copied ? "已將 V1 的主題與最近計算複製到 V2；原始 V1 資料仍保留。" : null;
    } catch (_error) {
      migrationNotice = "部分舊資料無法遷移，但不影響 V2 計算功能。";
    }
    return migrationNotice;
  }

  function getCollection(key) {
    const value = read(key, []);
    return Array.isArray(value) ? value : [];
  }

  function setCollection(key, items) {
    return write(key, items);
  }

  function getHistory() {
    return getCollection(keys.history).slice(0, app.Constants.HISTORY_LIMIT);
  }

  function addHistory(entry) {
    const history = getHistory();
    history.unshift(clone(entry));
    return write(keys.history, history.slice(0, app.Constants.HISTORY_LIMIT));
  }

  function deleteHistory(id) {
    return write(keys.history, getHistory().filter((entry) => entry.id !== id));
  }

  function clearHistory() {
    return write(keys.history, []);
  }

  function getTheme() {
    const theme = read(keys.theme, null);
    if (theme === "dark" || theme === "light") return theme;
    return root.matchMedia && root.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  function setTheme(theme) {
    return write(keys.theme, theme === "dark" ? "dark" : "light");
  }

  function getCustomReagents() { return getCollection(keys.customReagents); }
  function setCustomReagents(items) { return setCollection(keys.customReagents, items); }
  function getCustomRecipes() { return getCollection(keys.customRecipes); }
  function setCustomRecipes(items) { return setCollection(keys.customRecipes, items); }
  function getRecords() {
    return getCollection(keys.records).filter((item) => item && item.schemaVersion === 2 && item.id && item.result && item.result.schemaVersion === 2 && item.result.provenance && Array.isArray(item.result.components));
  }
  function setRecords(items) { return setCollection(keys.records, items); }
  function getLastError() { return lastError; }

  app.Storage = Object.freeze({
    clone, read, write, migrateV1, getHistory, addHistory, deleteHistory, clearHistory,
    getTheme, setTheme, getCustomReagents, setCustomReagents, getCustomRecipes,
    setCustomRecipes, getRecords, setRecords, getLastError
  });
})(window);
