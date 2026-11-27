# 打包試玩版 release APK（行銷副專，2026-11-27）。在 Ray 自己的終端機跑（簽章密碼由他輸入）：
#   powershell -ExecutionPolicy Bypass -File release\capacitor\build_apk.ps1
# 前置：node tools/release/build_demo.mjs 產好 dist/demo；JDK 21 與 Android SDK 在 %LOCALAPPDATA%\Android；
#       簽章金鑰在 %USERPROFILE%\.tivot-keys\tivot-release.jks（repo 外，密碼不進版控）。
$ErrorActionPreference = 'Stop'
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$root = Resolve-Path "$here\..\.."
$env:JAVA_HOME = "$env:LOCALAPPDATA\Android\jdk-21"
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$ks = "$env:USERPROFILE\.tivot-keys\tivot-release.jks"
$ver = (Select-String -Path "$root\config.js" -Pattern "VERSION = 'ver [0-9.]+-([0-9]+)'").Matches[0].Groups[1].Value

# SDK 路徑寫進 local.properties（不進版控）。用正斜線：properties 檔裡反斜線是跳脫字元，寫錯 Gradle 會報「路徑語法錯誤」。
$sdkFwd = $env:ANDROID_HOME.Replace('\', '/').Replace(':', '\:')
[IO.File]::WriteAllText("$here\android\local.properties", "sdk.dir=$sdkFwd`n")

Write-Host "=== 1/3 把 dist/demo 複製進 Android 專案 ===" -ForegroundColor Yellow
Push-Location $here
npx cap sync android
if ($LASTEXITCODE -ne 0) { Pop-Location; throw "cap sync 失敗" }
Write-Host "=== 2/3 Gradle 打包（第一次會下載 Gradle，要幾分鐘）===" -ForegroundColor Yellow
Push-Location "$here\android"
.\gradlew.bat assembleRelease
$gradleExit = $LASTEXITCODE
Pop-Location; Pop-Location
if ($gradleExit -ne 0) { throw "Gradle 打包失敗（上面有錯誤訊息），沒有東西可以簽章，停止" }

$unsigned = "$here\android\app\build\outputs\apk\release\app-release-unsigned.apk"
$outDir = "$root\dist\apk"; New-Item -ItemType Directory -Force $outDir | Out-Null
$out = "$outDir\TIVOT-demo-v$ver.apk"
$bt = Get-ChildItem "$env:ANDROID_HOME\build-tools" -Directory | Sort-Object Name -Descending | Select-Object -First 1
while (-not (Test-Path $ks)) { Write-Host "還沒有簽章金鑰（$ks），先去建金鑰那個分頁設好密碼，好了按 Enter 繼續…" -ForegroundColor Yellow; [void](Read-Host) }
Write-Host "=== 3/3 簽章：請輸入你剛設的金鑰密碼（畫面不顯示字）===" -ForegroundColor Yellow
& "$($bt.FullName)\apksigner.bat" sign --ks $ks --ks-key-alias tivot --out $out $unsigned
if ($LASTEXITCODE -ne 0) { throw "簽章失敗（密碼打錯的話重跑一次這支即可）" }
& "$($bt.FullName)\apksigner.bat" verify --print-certs $out | Select-Object -First 3
$mb = [math]::Round((Get-Item $out).Length / 1MB)
Write-Host ""
Write-Host "完成：$out（$mb MB）" -ForegroundColor Green
