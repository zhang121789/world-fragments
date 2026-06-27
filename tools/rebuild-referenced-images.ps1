param(
  [string]$SiteJson = "data/site.json",
  [string]$PublicDir = "public",
  [string]$BackupDir = "D:\world-fragments-backup\backup-original-uploads-20260626",
  [int]$MaxDimension = 1600,
  [long]$SmallFileBytes = 2048,
  [long]$JpegQuality = 74
)

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing

function Get-ImageId([string]$fileName) {
  $base = [System.IO.Path]::GetFileNameWithoutExtension($fileName)
  if ($base -match '^(\d+-[0-9a-fA-F]+)') {
    return $matches[1]
  }
  return $base -replace '-q\d+-\d+.*$', ''
}

function Get-JpegEncoder {
  [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() |
    Where-Object { $_.MimeType -eq "image/jpeg" } |
    Select-Object -First 1
}

function Save-Jpeg([System.Drawing.Bitmap]$bitmap, [string]$targetPath, [long]$quality) {
  $encoder = Get-JpegEncoder
  $encoderParams = New-Object System.Drawing.Imaging.EncoderParameters(1)
  $encoderParams.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter(
    [System.Drawing.Imaging.Encoder]::Quality,
    $quality
  )
  $bitmap.Save($targetPath, $encoder, $encoderParams)
  $encoderParams.Dispose()
}

function Convert-Image([string]$sourcePath, [string]$targetPath) {
  $source = [System.Drawing.Image]::FromFile($sourcePath)
  try {
    $ratio = [Math]::Min($MaxDimension / [double]$source.Width, $MaxDimension / [double]$source.Height)
    if ($ratio -gt 1) { $ratio = 1 }

    $width = [Math]::Max(1, [int][Math]::Round($source.Width * $ratio))
    $height = [Math]::Max(1, [int][Math]::Round($source.Height * $ratio))

    $bitmap = New-Object System.Drawing.Bitmap($width, $height)
    try {
      $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
      try {
        $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
        $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
        $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        $graphics.DrawImage($source, 0, 0, $width, $height)
      } finally {
        $graphics.Dispose()
      }

      $targetFolder = Split-Path -Parent $targetPath
      if (!(Test-Path $targetFolder)) {
        New-Item -ItemType Directory -Path $targetFolder | Out-Null
      }
      Save-Jpeg $bitmap $targetPath $JpegQuality
    } finally {
      $bitmap.Dispose()
    }
  } finally {
    $source.Dispose()
  }
}

$site = Get-Content -LiteralPath $SiteJson -Raw -Encoding UTF8 | ConvertFrom-Json
$urls = New-Object "System.Collections.Generic.HashSet[string]"

function Add-UploadUrls($value) {
  if ($null -eq $value) { return }
  if ($value -is [string]) {
    if ($value.StartsWith("/uploads/")) {
      [void]$urls.Add(($value -split "\?")[0])
    }
    return
  }
  if ($value -is [System.Collections.IEnumerable] -and -not ($value -is [string])) {
    foreach ($item in $value) { Add-UploadUrls $item }
    return
  }
  if ($value.PSObject -and $value.PSObject.Properties) {
    foreach ($property in $value.PSObject.Properties) {
      Add-UploadUrls $property.Value
    }
  }
}

Add-UploadUrls $site

$backupIndex = @{}
Get-ChildItem -LiteralPath $BackupDir -File | ForEach-Object {
  $id = Get-ImageId $_.Name
  if (!$backupIndex.ContainsKey($id)) {
    $backupIndex[$id] = $_.FullName
  }
}

$rebuilt = 0
$skipped = 0
$missingSource = @()

foreach ($url in $urls) {
  $relative = $url.TrimStart("/") -replace "/", [System.IO.Path]::DirectorySeparatorChar
  $target = Join-Path $PublicDir $relative
  if (!(Test-Path -LiteralPath $target)) {
    $missingSource += $url
    continue
  }

  $targetItem = Get-Item -LiteralPath $target
  if ($targetItem.Length -ge $SmallFileBytes) {
    $skipped++
    continue
  }

  $id = Get-ImageId $targetItem.Name
  if (!$backupIndex.ContainsKey($id)) {
    $missingSource += $url
    continue
  }

  Convert-Image $backupIndex[$id] $target
  $rebuilt++
}

Write-Host "referenced=$($urls.Count) rebuilt=$rebuilt skipped=$skipped missingSource=$($missingSource.Count)"
if ($missingSource.Count -gt 0) {
  $missingSource | Select-Object -First 30 | ForEach-Object { Write-Host "missing-source $_" }
}
