param(
    [string]$Source = (Join-Path $PSScriptRoot '..\assets\images\java-master-logo-white.png'),
    [string]$OutputDirectory = (Join-Path $PSScriptRoot '..\assets\images')
)

Add-Type -AssemblyName System.Drawing

function Get-AlphaBounds {
    param([System.Drawing.Bitmap]$Bitmap)

    $rect = [System.Drawing.Rectangle]::new(0, 0, $Bitmap.Width, $Bitmap.Height)
    $data = $Bitmap.LockBits(
        $rect,
        [System.Drawing.Imaging.ImageLockMode]::ReadOnly,
        [System.Drawing.Imaging.PixelFormat]::Format32bppArgb
    )

    try {
        $stride = [Math]::Abs($data.Stride)
        $bytes = [byte[]]::new($stride * $Bitmap.Height)
        [Runtime.InteropServices.Marshal]::Copy($data.Scan0, $bytes, 0, $bytes.Length)

        $minX = $Bitmap.Width
        $minY = $Bitmap.Height
        $maxX = -1
        $maxY = -1

        for ($y = 0; $y -lt $Bitmap.Height; $y++) {
            $row = $y * $stride
            for ($x = 0; $x -lt $Bitmap.Width; $x++) {
                if ($bytes[$row + ($x * 4) + 3] -gt 0) {
                    if ($x -lt $minX) { $minX = $x }
                    if ($x -gt $maxX) { $maxX = $x }
                    if ($y -lt $minY) { $minY = $y }
                    if ($y -gt $maxY) { $maxY = $y }
                }
            }
        }
    }
    finally {
        $Bitmap.UnlockBits($data)
    }

    if ($maxX -lt 0 -or $maxY -lt 0) {
        throw 'The source image contains no visible pixels.'
    }

    return [System.Drawing.Rectangle]::FromLTRB($minX, $minY, $maxX + 1, $maxY + 1)
}

function Export-TransparentPng {
    param(
        [System.Drawing.Bitmap]$SourceBitmap,
        [System.Drawing.Rectangle]$Crop,
        [int]$CanvasWidth,
        [int]$CanvasHeight,
        [string]$Destination
    )

    $output = [System.Drawing.Bitmap]::new(
        $CanvasWidth,
        $CanvasHeight,
        [System.Drawing.Imaging.PixelFormat]::Format32bppArgb
    )

    try {
        $graphics = [System.Drawing.Graphics]::FromImage($output)
        try {
            $graphics.Clear([System.Drawing.Color]::Transparent)
            $graphics.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceCopy
            $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
            $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
            $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
            $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality

            $scale = [Math]::Min($CanvasWidth / $Crop.Width, $CanvasHeight / $Crop.Height)
            $drawWidth = [Math]::Max(1, [int][Math]::Round($Crop.Width * $scale))
            $drawHeight = [Math]::Max(1, [int][Math]::Round($Crop.Height * $scale))
            $drawX = [int][Math]::Floor(($CanvasWidth - $drawWidth) / 2)
            $drawY = [int][Math]::Floor(($CanvasHeight - $drawHeight) / 2)

            $destinationRect = [System.Drawing.Rectangle]::new($drawX, $drawY, $drawWidth, $drawHeight)
            $graphics.DrawImage($SourceBitmap, $destinationRect, $Crop, [System.Drawing.GraphicsUnit]::Pixel)
        }
        finally {
            $graphics.Dispose()
        }

        $stream = [System.IO.File]::Open(
            $Destination,
            [System.IO.FileMode]::Create,
            [System.IO.FileAccess]::Write,
            [System.IO.FileShare]::None
        )
        try {
            $output.Save($stream, [System.Drawing.Imaging.ImageFormat]::Png)
        }
        finally {
            $stream.Dispose()
        }
    }
    finally {
        $output.Dispose()
    }
}

$resolvedOutputDirectory = (Resolve-Path -LiteralPath $OutputDirectory).Path
$sourceImage = [System.Drawing.Bitmap]::new((Resolve-Path -LiteralPath $Source).Path)
try {
    $bounds = Get-AlphaBounds -Bitmap $sourceImage
    $sourceMargin = 18
    $left = [Math]::Max(0, $bounds.Left - $sourceMargin)
    $top = [Math]::Max(0, $bounds.Top - $sourceMargin)
    $right = [Math]::Min($sourceImage.Width, $bounds.Right + $sourceMargin)
    $bottom = [Math]::Min($sourceImage.Height, $bounds.Bottom + $sourceMargin)
    $crop = [System.Drawing.Rectangle]::FromLTRB($left, $top, $right, $bottom)

    Export-TransparentPng -SourceBitmap $sourceImage -Crop $crop -CanvasWidth 607 -CanvasHeight 960 `
        -Destination (Join-Path $resolvedOutputDirectory 'java-master-logo-updated.png')
    Export-TransparentPng -SourceBitmap $sourceImage -Crop $crop -CanvasWidth 379 -CanvasHeight 600 `
        -Destination (Join-Path $resolvedOutputDirectory 'java-master-logo-updated-600.png')
    Export-TransparentPng -SourceBitmap $sourceImage -Crop $crop -CanvasWidth 64 -CanvasHeight 64 `
        -Destination (Join-Path $resolvedOutputDirectory 'java-master-favicon-updated.png')

    Write-Output ('Visible bounds: {0},{1} {2}x{3}' -f $bounds.X, $bounds.Y, $bounds.Width, $bounds.Height)
    Write-Output ('Export crop: {0},{1} {2}x{3}' -f $crop.X, $crop.Y, $crop.Width, $crop.Height)
}
finally {
    $sourceImage.Dispose()
}
