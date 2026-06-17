# tray.ps1 — 独立启动托盘应用（关终端不会死）
$python = (Get-Command pythonw -ErrorAction SilentlyContinue).Source
if (-not $python) { $python = "python" }
$script = Join-Path $PSScriptRoot "tray.py"
Start-Process -FilePath "uv" -ArgumentList "run", $script -WorkingDirectory $PSScriptRoot -WindowStyle Hidden
