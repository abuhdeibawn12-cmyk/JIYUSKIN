param(
    [string]$Version = "0.1.0"
)

$ErrorActionPreference = "Stop"
$repositoryRoot = Split-Path -Parent $PSScriptRoot
$sourceTheme = Join-Path $repositoryRoot "woocommerce-theme"
$sourceAssets = Join-Path $repositoryRoot "assets"
$distRoot = Join-Path $repositoryRoot "dist"
$stageName = "jiyu-original-woocommerce-$Version-stage-$PID"
$stageRoot = Join-Path $distRoot $stageName
$themeRoot = Join-Path $stageRoot "jiyu-original-woocommerce"
$zipPath = Join-Path $distRoot "jiyu-original-woocommerce-$Version.zip"

New-Item -ItemType Directory -Force -Path $distRoot | Out-Null

try {
    New-Item -ItemType Directory -Force -Path $themeRoot | Out-Null

    Copy-Item -Path (Join-Path $sourceTheme "*") -Destination $themeRoot -Recurse -Force
    New-Item -ItemType Directory -Force -Path (Join-Path $themeRoot "assets") | Out-Null
    Copy-Item -Path (Join-Path $sourceAssets "*") -Destination (Join-Path $themeRoot "assets") -Recurse -Force
    Copy-Item -Path (Join-Path $sourceTheme "assets\*") -Destination (Join-Path $themeRoot "assets") -Recurse -Force

    if (Test-Path -LiteralPath $zipPath) {
        Remove-Item -LiteralPath $zipPath -Force
    }

    Compress-Archive -Path $themeRoot -DestinationPath $zipPath -CompressionLevel Optimal
    Write-Output $zipPath
}
finally {
    if (Test-Path -LiteralPath $stageRoot) {
        Remove-Item -LiteralPath $stageRoot -Recurse -Force
    }
}

