param(
  [int]$MaxSize = 2200,
  [int]$Quality = 82,
  [string]$OutputFolder = "optimized"
)

$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $PSScriptRoot
$siteFile = Join-Path $root "data/site.json"
$uploadDir = Join-Path $root "public/uploads"
$optimizedDir = Join-Path $uploadDir $OutputFolder

if (!(Test-Path $siteFile)) {
  throw "Cannot find data/site.json"
}

New-Item -ItemType Directory -Force -Path $optimizedDir | Out-Null

$jsonText = Get-Content -LiteralPath $siteFile -Raw -Encoding UTF8
$matches = [regex]::Matches($jsonText, '"/uploads/[^"#?]+\.(?:jpg|jpeg|png)"', "IgnoreCase")
$urls = @{}
foreach ($match in $matches) {
  $url = $match.Value.Trim('"')
  if (!$url.StartsWith("/uploads/$OutputFolder/")) {
    $urls[$url] = $true
  }
}

function Get-JpegCodec {
  [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() |
    Where-Object { $_.MimeType -eq "image/jpeg" } |
    Select-Object -First 1
}

function Apply-Orientation($image) {
  $orientationId = 274
  if (-not ($image.PropertyIdList -contains $orientationId)) { return }
  $orientation = [BitConverter]::ToUInt16($image.GetPropertyItem($orientationId).Value, 0)
  switch ($orientation) {
    2 { $image.RotateFlip([System.Drawing.RotateFlipType]::RotateNoneFlipX) }
    3 { $image.RotateFlip([System.Drawing.RotateFlipType]::Rotate180FlipNone) }
    4 { $image.RotateFlip([System.Drawing.RotateFlipType]::Rotate180FlipX) }
    5 { $image.RotateFlip([System.Drawing.RotateFlipType]::Rotate90FlipX) }
    6 { $image.RotateFlip([System.Drawing.RotateFlipType]::Rotate90FlipNone) }
    7 { $image.RotateFlip([System.Drawing.RotateFlipType]::Rotate270FlipX) }
    8 { $image.RotateFlip([System.Drawing.RotateFlipType]::Rotate270FlipNone) }
  }
  try { $image.RemovePropertyItem($orientationId) } catch {}
}

function Save-OptimizedImage($source, $target, $maxSize, $quality) {
  $image = [System.Drawing.Image]::FromFile($source)
  try {
    Apply-Orientation $image
    $width = $image.Width
    $height = $image.Height
    $scale = [Math]::Min(1, $maxSize / [Math]::Max($width, $height))
    $newWidth = [Math]::Max(1, [int][Math]::Round($width * $scale))
    $newHeight = [Math]::Max(1, [int][Math]::Round($height * $scale))

    $bitmap = New-Object System.Drawing.Bitmap($newWidth, $newHeight)
    try {
      $bitmap.SetResolution(72, 72)
      $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
      try {
        $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
        $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
        $graphics.Clear([System.Drawing.Color]::Black)
        $graphics.DrawImage($image, 0, 0, $newWidth, $newHeight)
      } finally {
        $graphics.Dispose()
      }

      $encoder = Get-JpegCodec
      $params = New-Object System.Drawing.Imaging.EncoderParameters(1)
      $params.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter(
        [System.Drawing.Imaging.Encoder]::Quality,
        [int64]$quality
      )
      try {
        $bitmap.Save($target, $encoder, $params)
      } finally {
        $params.Dispose()
      }
    } finally {
      if ($bitmap) { $bitmap.Dispose() }
    }
  } finally {
    $image.Dispose()
  }
}

$replacements = @{}
$processed = 0
$savedBytes = 0L

foreach ($url in $urls.Keys) {
  $relative = $url.TrimStart("/") -replace "/", [IO.Path]::DirectorySeparatorChar
  $source = Join-Path (Join-Path $root "public") $relative
  if (!(Test-Path -LiteralPath $source)) { continue }

  $name = [IO.Path]::GetFileNameWithoutExtension($source)
  $targetName = "$name-q$Quality-$MaxSize.jpg"
  $target = Join-Path $optimizedDir $targetName
  $newUrl = "/uploads/$OutputFolder/$targetName"

  if (!(Test-Path -LiteralPath $target)) {
    Save-OptimizedImage $source $target $MaxSize $Quality
  }

  $sourceSize = (Get-Item -LiteralPath $source).Length
  $targetSize = (Get-Item -LiteralPath $target).Length
  if ($targetSize -gt 0 -and $targetSize -lt $sourceSize) {
    $replacements[$url] = $newUrl
    $processed++
    $savedBytes += ($sourceSize - $targetSize)
  }
}

if ($replacements.Count -gt 0) {
  $backup = "$siteFile.bak-$(Get-Date -Format yyyyMMdd-HHmmss)"
  Copy-Item -LiteralPath $siteFile -Destination $backup
  foreach ($old in $replacements.Keys) {
    $jsonText = $jsonText.Replace($old, $replacements[$old])
  }
  Set-Content -LiteralPath $siteFile -Value $jsonText -Encoding UTF8
}

"optimized=$processed savedMB=$([Math]::Round($savedBytes / 1MB, 1))"
