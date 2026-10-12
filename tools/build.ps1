[CmdletBinding()]
param(
  [switch]$SkipBrowserTests,
  [switch]$Check
)

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
$templatePath = Join-Path $projectRoot "src\index.template.html"
$outputPath = Join-Path $projectRoot "dist\index.html"

$styleFiles = @(
  "src\styles\base.css",
  "src\styles\components.css",
  "src\styles\print.css"
)

$scriptFiles = @(
  "src\js\core\constants.js",
  "src\js\core\units.js",
  "src\js\core\formatter.js",
  "src\js\data\references.js",
  "src\js\data\reagents.js",
  "src\js\data\buffers.js",
  "src\js\services\storage.js",
  "src\js\services\library.js",
  "src\js\services\provenance.js",
  "src\js\engines\validation.js",
  "src\js\engines\standard-recipe.js",
  "src\js\engines\dynamic-buffer.js",
  "src\js\services\records.js",
  "src\js\services\result-state.js",
  "src\js\ui\renderer.js",
  "src\js\ui\library-manager.js",
  "src\js\ui\records.js",
  "src\js\tests\test-runner.js",
  "src\js\ui\controller.js",
  "src\js\app.js"
)

function Read-ProjectFile([string]$relativePath) {
  $absolutePath = Join-Path $projectRoot $relativePath
  if (-not (Test-Path -LiteralPath $absolutePath -PathType Leaf)) {
    throw "Missing required source file: $relativePath"
  }
  return [IO.File]::ReadAllText($absolutePath, [Text.Encoding]::UTF8)
}

function Assert-SafeSource([string]$content) {
  $forbiddenPatterns = @(
    '(?i)<script[^>]+src\s*=',
    '(?i)<link[^>]+rel\s*=\s*["'']?stylesheet',
    '(?i)@import\s+',
    '(?i)\bfetch\s*\(',
    '(?i)\bXMLHttpRequest\b',
    '(?i)\bWebSocket\s*\(',
    '(?i)\beval\s*\(',
    '(?i)\bnew\s+Function\s*\(',
    '(?i)(?<![A-Za-z0-9_$])import\s*\(',
    '(?i)<iframe\b',
    '(?i)\bsrcdoc\s*=',
    '(?i)\bdocument\.write\s*\(',
    '(?i)\bnavigator\.sendBeacon\s*\('
  )
  foreach ($pattern in $forbiddenPatterns) {
    if ($content -match $pattern) {
      throw "Forbidden runtime dependency or unsafe construct matched: $pattern"
    }
  }
}

$template = Read-ProjectFile "src\index.template.html"
$cssMarker = "/*__INLINE_CSS__*/"
$scriptMarker = "/*__INLINE_JS__*/"
if ([regex]::Matches($template, [regex]::Escape($cssMarker)).Count -ne 1) { throw "CSS injection marker must appear exactly once." }
if ([regex]::Matches($template, [regex]::Escape($scriptMarker)).Count -ne 1) { throw "JavaScript injection marker must appear exactly once." }

$css = ($styleFiles | ForEach-Object { Read-ProjectFile $_ }) -join "`n"
$javascript = ($scriptFiles | ForEach-Object { Read-ProjectFile $_ }) -join "`n"
$html = $template.Replace($cssMarker, $css).Replace($scriptMarker, $javascript).Replace("`r`n", "`n").Replace("`r", "`n")

Assert-SafeSource $html
if ($html.Contains("/*__INLINE_CSS__*/") -or $html.Contains("/*__INLINE_JS__*/")) {
  throw "An injection marker remains in the generated file."
}

$utf8 = [Text.UTF8Encoding]::new($false)
$candidatePath = Join-Path ([IO.Path]::GetTempPath()) ("bufferlab-" + [Guid]::NewGuid().ToString("N") + ".html")
[IO.File]::WriteAllText($candidatePath, $html, $utf8)

try {
  if (-not $SkipBrowserTests) {
    $browserCandidates = @(
      (Join-Path ${env:ProgramFiles(x86)} "Microsoft\Edge\Application\msedge.exe"),
      (Join-Path $env:ProgramFiles "Microsoft\Edge\Application\msedge.exe"),
      (Join-Path $env:LOCALAPPDATA "Microsoft\Edge\Application\msedge.exe"),
      (Join-Path ${env:ProgramFiles(x86)} "Google\Chrome\Application\chrome.exe"),
      (Join-Path $env:ProgramFiles "Google\Chrome\Application\chrome.exe"),
      (Join-Path $env:LOCALAPPDATA "Google\Chrome\Application\chrome.exe")
    ) | Where-Object { $_ -and (Test-Path -LiteralPath $_ -PathType Leaf) }
    if (-not $browserCandidates) {
      throw "Microsoft Edge or Google Chrome was not found. Run tests manually with dist/index.html?dev=1 or use -SkipBrowserTests only in a reviewed environment."
    }
    $candidateUri = ([Uri]$candidatePath).AbsoluteUri + "?dev=1"
    $browser = [string]($browserCandidates | Select-Object -First 1)
    $processInfo = [Diagnostics.ProcessStartInfo]::new()
    $processInfo.FileName = $browser
    $processInfo.Arguments = "--headless --disable-gpu --dump-dom `"$candidateUri`""
    $processInfo.UseShellExecute = $false
    $processInfo.RedirectStandardOutput = $true
    $process = [Diagnostics.Process]::Start($processInfo)
    $dom = $process.StandardOutput.ReadToEnd()
    $process.WaitForExit()
    if ($process.ExitCode -ne 0) {
      throw "Headless browser test process failed with exit code: $($process.ExitCode)."
    }
    if ($dom -notmatch 'data-test-status="passed"') {
      throw "Embedded browser tests did not pass. Open the candidate with ?dev=1 for details."
    }
  }

  if ($Check) {
    if (-not (Test-Path -LiteralPath $outputPath -PathType Leaf)) { throw "dist/index.html does not exist. Rebuild before running -Check." }
    $existing = [IO.File]::ReadAllText($outputPath, [Text.Encoding]::UTF8)
    if ($existing -ne $html) { throw "dist is stale. Rebuild before running -Check." }
    Write-Output "dist/index.html is in sync with source."
  } else {
    [IO.Directory]::CreateDirectory((Split-Path -Parent $outputPath)) | Out-Null
    [IO.File]::WriteAllText($outputPath, $html, $utf8)
    Write-Output "Built: $outputPath"
    Write-Output "Size: $((Get-Item -LiteralPath $outputPath).Length) bytes"
  }
}
finally {
  if (Test-Path -LiteralPath $candidatePath) {
    Remove-Item -LiteralPath $candidatePath -Force
  }
}
