# Generates all CampusRide PWA icons from a single source image.
#
# Usage:
#   1. Save your icon as  client/scripts/app-icon-source.png  (square PNG/JPG works best)
#   2. From the client/ folder run:
#        powershell -ExecutionPolicy Bypass -File scripts\gen-icons-from-image.ps1
#
# Output (client/public/):
#   pwa-192.png, pwa-512.png           -> "any" purpose (full-bleed, cover fit)
#   maskable-192.png, maskable-512.png  -> "maskable" (logo in the 80% safe zone)
#   apple-touch-icon.png (180)          -> iOS home screen (full-bleed)

param(
  [string]$Source = (Join-Path $PSScriptRoot 'app-icon-source.png')
)

Add-Type -AssemblyName System.Drawing

$Source = (Resolve-Path -LiteralPath $Source -ErrorAction Stop).Path
$public = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..\public')).Path
$src = [System.Drawing.Image]::FromFile($Source)
Write-Output ("source: " + $Source + " (" + $src.Width + "x" + $src.Height + ")")

function New-Canvas([int]$Size) {
  $bmp = New-Object -TypeName System.Drawing.Bitmap -ArgumentList $Size, $Size
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $g.Clear([System.Drawing.Color]::Transparent)
  return @($bmp, $g)
}

# Cover-fit the source across the whole square (used for "any" + apple icons).
function Draw-Cover($g, [int]$Size) {
  $scale = [Math]::Max($Size / $src.Width, $Size / $src.Height)
  $dw = [int][Math]::Ceiling($src.Width * $scale)
  $dh = [int][Math]::Ceiling($src.Height * $scale)
  $dx = [int](($Size - $dw) / 2)
  $dy = [int](($Size - $dh) / 2)
  $g.DrawImage($src, $dx, $dy, $dw, $dh)
}

# Sample the image border to pick a solid backdrop for the maskable padding.
function Get-EdgeColor() {
  $sumR = 0; $sumG = 0; $sumB = 0; $n = 0
  $step = [Math]::Max(1, [int]($src.Width / 20))
  for ($x = 0; $x -lt $src.Width; $x += $step) {
    foreach ($y in @(0, ($src.Height - 1))) {
      $c = $src.GetPixel($x, $y); $sumR += $c.R; $sumG += $c.G; $sumB += $c.B; $n++
    }
  }
  $step2 = [Math]::Max(1, [int]($src.Height / 20))
  for ($y = 0; $y -lt $src.Height; $y += $step2) {
    foreach ($x in @(0, ($src.Width - 1))) {
      $c = $src.GetPixel($x, $y); $sumR += $c.R; $sumG += $c.G; $sumB += $c.B; $n++
    }
  }
  if ($n -eq 0) { return [System.Drawing.Color]::White }
  return [System.Drawing.Color]::FromArgb(255, [int]($sumR / $n), [int]($sumG / $n), [int]($sumB / $n))
}

# Maskable: 80% logo centred on an edge-derived backdrop (survives OS masking).
function Draw-Maskable($g, [int]$Size) {
  $bgColor = Get-EdgeColor
  $bg = New-Object -TypeName System.Drawing.SolidBrush -ArgumentList $bgColor
  $g.FillRectangle($bg, 0, 0, $Size, $Size)
  $bg.Dispose()
  $scale = [Math]::Min(0.8 * $Size / $src.Width, 0.8 * $Size / $src.Height)
  $dw = [int]($src.Width * $scale)
  $dh = [int]($src.Height * $scale)
  $dx = [int](($Size - $dw) / 2)
  $dy = [int](($Size - $dh) / 2)
  $g.DrawImage($src, $dx, $dy, $dw, $dh)
}

function Save-Icon([int]$Size, [string]$Name, [bool]$Maskable) {
  $pair = New-Canvas $Size
  $bmp = $pair[0]; $g = $pair[1]
  if ($Maskable) { Draw-Maskable $g $Size } else { Draw-Cover $g $Size }
  $g.Dispose()
  $out = Join-Path $public $Name
  $bmp.Save($out, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
  Write-Output ("wrote " + $Name)
}

Save-Icon -Size 192 -Name 'pwa-192.png' -Maskable $false
Save-Icon -Size 512 -Name 'pwa-512.png' -Maskable $false
Save-Icon -Size 192 -Name 'maskable-192.png' -Maskable $true
Save-Icon -Size 512 -Name 'maskable-512.png' -Maskable $true
Save-Icon -Size 180 -Name 'apple-touch-icon.png' -Maskable $true

$src.Dispose()
Write-Output 'Done. Rebuild with: npm run build'
