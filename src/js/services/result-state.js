(function (root) {
  "use strict";

  let current = null;

  function set(result) { current = result || null; }
  function get() { return current; }
  function clear() {
    const hadResult = current !== null;
    current = null;
    return hadResult;
  }
  function shouldShowStaleNotice(showNotice, hadResult, wasStale) {
    return Boolean(showNotice && (hadResult || wasStale));
  }

  root.BufferLab.ResultState = Object.freeze({ set, get, clear, shouldShowStaleNotice });
})(window);
