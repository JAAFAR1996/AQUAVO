$sourceDir = "C:\Users\jaafa\Downloads\صناديق"
$destDir = "c:\Users\jaafa\Desktop\upload\FishWebClean\Launch_Ideas\كراتين النقل\factory_specs\images"

# Ensure destination directory exists
if (!(Test-Path -Path $destDir)) {
    New-Item -ItemType Directory -Force -Path $destDir
}

# Define file mappings (Source relative to $sourceDir -> Destination Name)
$filesToCopy = @{
    "بابل\_model_gemini25flashimage_2k_20260 (2).jpeg"                                                                                                                  = "bubble_mailer.jpg"
    "# 📐 القياس 25 × 20 × 10 سم\_model_gemini25flashimage_2k_20260 (34).jpeg"                                                                                          = "small_box.jpg"
    "# 📐 القياس 40 × 30 × 20 سم\_model_gemini25flashimage_2k_20260 (3).jpeg"                                                                                           = "large_box.jpg"
    "# 📐 القياسات Cube 35×35×35  Stream 60×15×15  Large 60×40×40\### ─── 🏞️ الجدول — STREAM TANK — 600 × 150 × 150mm ───\_model_gemini25flashimage_2k_20260 (9).jpeg" = "tank_stream.jpg"
    "# 📐 القياسات Cube 35×35×35  Stream 60×15×15  Large 60×40×40\### ─── 📐 حوض 3 الفاخر — 600 × 300 × 350mm ───\_model_gemini25flashimage_2k_20260 (4).jpeg"          = "tank_standard.jpg"
    "# 📐 القياسات Cube 35×35×35  Stream 60×15×15  Large 60×40×40\🧊 المكعب — CUBE TANK — 350 × 350 × 350mm\_model_gemini25flashimage_2k_20260 (7).jpeg"                = "tank_cube.jpg"
    "# 📐 القياسات Cube 35×35×35  Stream 60×15×15  Large 60×40×40\LARGE TANK — 600 × 400 × 400mm — 16kg\_model_gemini25flashimage_2k_20260 (11).jpeg"                   = "tank_large.jpg"
}

foreach ($file in $filesToCopy.GetEnumerator()) {
    $sourcePath = Join-Path -Path $sourceDir -ChildPath $file.Key
    $destPath = Join-Path -Path $destDir -ChildPath $file.Value
    
    Write-Host "Copying matching file..."
    # Use Get-ChildItem to resolve the path if it contains wildcards or issues, but here we expect exact matches mostly.
    # However, the source paths from the user output were exact. 
    # Let's try Copy-Item -LiteralPath directly.
    
    if (Test-Path -LiteralPath $sourcePath) {
        Copy-Item -LiteralPath $sourcePath -Destination $destPath -Force
        Write-Host "Success: $($file.Value)"
    }
    else {
        Write-Host "Error: Source not found: $sourcePath"
    }
}
