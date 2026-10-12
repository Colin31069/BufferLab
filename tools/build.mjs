#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import vm from "node:vm";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const templatePath = "src/index.template.html";
const outputPath = join(projectRoot, "dist/index.html");
const styleFiles = ["src/styles/base.css", "src/styles/components.css", "src/styles/print.css"];
const scriptFiles = [
  "src/js/core/constants.js",
  "src/js/core/units.js",
  "src/js/core/formatter.js",
  "src/js/data/references.js",
  "src/js/data/reagents.js",
  "src/js/data/buffers.js",
  "src/js/services/storage.js",
  "src/js/services/library.js",
  "src/js/services/provenance.js",
  "src/js/engines/validation.js",
  "src/js/engines/standard-recipe.js",
  "src/js/engines/dynamic-buffer.js",
  "src/js/services/records.js",
  "src/js/services/result-state.js",
  "src/js/ui/renderer.js",
  "src/js/ui/library-manager.js",
  "src/js/ui/records.js",
  "src/js/tests/test-runner.js",
  "src/js/ui/controller.js",
  "src/js/app.js"
];

const forbiddenPatterns = [
  /<script[^>]+src\s*=/i,
  /<link[^>]+rel\s*=\s*["']?stylesheet/i,
  /@import\s+/i,
  /\bfetch\s*\(/i,
  /\bXMLHttpRequest\b/i,
  /\bWebSocket\s*\(/i,
  /\beval\s*\(/i,
  /\bnew\s+Function\s*\(/i,
  /(^|[^A-Za-z0-9_$])import\s*\(/i,
  /<iframe\b/i,
  /\bsrcdoc\s*=/i,
  /\bdocument\.write\s*\(/i,
  /\bnavigator\.sendBeacon\s*\(/i
];

function readProjectFile(relativePath) {
  const path = join(projectRoot, relativePath);
  if (!existsSync(path)) throw new Error("缺少必要來源檔：" + relativePath);
  return readFileSync(path, "utf8");
}

function assemble() {
  const template = readProjectFile(templatePath);
  const cssMarker = "/*__INLINE_CSS__*/";
  const scriptMarker = "/*__INLINE_JS__*/";
  if (template.split(cssMarker).length - 1 !== 1) throw new Error("CSS 注入標記必須恰好出現一次。");
  if (template.split(scriptMarker).length - 1 !== 1) throw new Error("JavaScript 注入標記必須恰好出現一次。");
  const css = styleFiles.map(readProjectFile).join("\n");
  const javascript = scriptFiles.map(readProjectFile).join("\n");
  const html = template.replace(cssMarker, css).replace(scriptMarker, javascript).replace(/\r\n?/g, "\n");
  for (const pattern of forbiddenPatterns) {
    if (pattern.test(html)) throw new Error("來源包含禁止的外部依賴或不安全語法：" + pattern);
  }
  if (html.includes(cssMarker) || html.includes(scriptMarker)) throw new Error("產物仍含有注入標記。");
  return html;
}

class MemoryStorage {
  constructor() { this.values = new Map(); }
  get length() { return this.values.size; }
  key(index) { return Array.from(this.values.keys())[index] || null; }
  getItem(key) { return this.values.has(String(key)) ? this.values.get(String(key)) : null; }
  setItem(key, value) { this.values.set(String(key), String(value)); }
  removeItem(key) { this.values.delete(String(key)); }
  clear() { this.values.clear(); }
}

function runLogicTests() {
  const window = { localStorage: new MemoryStorage() };
  const context = vm.createContext({ window });
  scriptFiles.filter((file) => file !== "src/js/app.js").forEach((file) => {
    vm.runInContext(readProjectFile(file), context, { filename: file });
  });
  const result = context.window.BufferLab.TestRunner.run();
  console.log("內建邏輯測試：" + result.passed + "/" + result.total + " 通過");
  result.tests.filter((item) => !item.passed).forEach((item) => console.error("✕ " + item.name + "：" + item.error));
  if (result.failed) throw new Error("內建邏輯測試失敗；沒有更新 dist。");
}

function runBrowserTests(browser, candidatePath) {
  const uri = pathToFileURL(candidatePath).href + "?dev=1";
  const dom = execFileSync(browser, ["--headless", "--disable-gpu", "--dump-dom", uri], {
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"]
  });
  if (!/data-test-status="passed"/.test(dom)) throw new Error("瀏覽器內建測試未通過；沒有更新 dist。");
  console.log("瀏覽器內建測試通過。");
}

function parseArgs(args) {
  const options = { check: false, skipLogicTests: false, browser: null, help: false };
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === "--check") options.check = true;
    else if (args[index] === "--skip-logic-tests") options.skipLogicTests = true;
    else if (args[index] === "--browser") {
      if (!args[index + 1]) throw new Error("--browser 後請提供瀏覽器執行檔路徑。");
      options.browser = args[++index];
    } else if (args[index] === "--help" || args[index] === "-h") options.help = true;
    else throw new Error("未知參數：" + args[index]);
  }
  return options;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log("用法：node tools/build.mjs [--check] [--skip-logic-tests] [--browser <執行檔路徑>]");
    return;
  }

  const html = assemble();
  const candidatePath = join(tmpdir(), "bufferlab-" + randomUUID() + ".html");
  writeFileSync(candidatePath, html, "utf8");
  try {
    if (!options.skipLogicTests) runLogicTests();
    if (options.browser) runBrowserTests(options.browser, candidatePath);
    else console.log("未執行瀏覽器測試；若要加入，請提供 --browser 執行檔路徑。");

    if (options.check) {
      if (!existsSync(outputPath)) throw new Error("dist/index.html 不存在，請先建置。");
      if (readFileSync(outputPath, "utf8") !== html) throw new Error("dist 已過期，請重新建置。");
      console.log("dist/index.html 與來源同步。");
      return;
    }

    mkdirSync(dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, html, "utf8");
    console.log("已建置 dist/index.html（" + Buffer.byteLength(html, "utf8") + " bytes）。");
  } finally {
    rmSync(candidatePath, { force: true });
  }
}

try { main(); }
catch (error) {
  console.error(error.message || error);
  process.exitCode = 1;
}
