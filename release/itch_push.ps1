# 把試玩 APK 傳到 itch.io（行銷副專，2026-11-27）。在 Ray 自己的終端機跑：
#   powershell -ExecutionPolicy Bypass -File release\itch_push.ps1
# 用 itch 官方上傳工具 butler。第一次會開瀏覽器請 Ray 授權（帳號金鑰存在 butler 自己的設定裡，不進版控）。
$ErrorActionPreference = 'Stop'
$root = Resolve-Path "$PSScriptRoot\.."
$dir = "$env:LOCALAPPDATA\itch-butler"
$exe = "$dir\butler.exe"
if (-not (Test-Path $exe)) {
  Write-Host "=== 下載 butler（itch.io 官方）===" -ForegroundColor Yellow
  New-Item -ItemType Directory -Force $dir | Out-Null
  $ProgressPreference = 'SilentlyContinue'
  Invoke-WebRequest "https://broth.itch.zone/butler/windows-amd64/LATEST/archive/default" -OutFile "$dir\butler.zip"
  Expand-Archive "$dir\butler.zip" $dir -Force
}
& $exe -V
$apk = Get-ChildItem "$root\dist\apk\TIVOT-demo-v*.apk" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
if (-not $apk) { throw "dist\apk 裡沒有 APK" }
$ver = [regex]::Match($apk.Name, 'v(\d+)').Groups[1].Value
Write-Host "=== 登入 itch（第一次會開瀏覽器，請你按授權）===" -ForegroundColor Yellow
& $exe login
if ($LASTEXITCODE -ne 0) { throw "登入失敗" }
Write-Host "=== 上傳 $($apk.Name)（$([math]::Round($apk.Length/1MB)) MB）到 alworks/saint-install 的 android 頻道 ===" -ForegroundColor Yellow
& $exe push $apk.FullName "alworks/saint-install:android" --userversion $ver
if ($LASTEXITCODE -ne 0) { throw "上傳失敗" }
& $exe status "alworks/saint-install"
Write-Host "完成。頁面仍是草稿（Draft），公開前請先看過頁面。" -ForegroundColor Green
