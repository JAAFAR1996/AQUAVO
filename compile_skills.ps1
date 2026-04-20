$outputFile = "AQUAVO_ALL_SKILLS_RAW.md"
$output = "# ===================================================================`n"
$output += "# AQUAVO — جميع ملفات SKILL.md المحملة (النسخ الحقيقية)`n"
$output += "# للاستخدام مع أي AI: ChatGPT, Claude, Gemini, Copilot, etc.`n"
$output += "# ===================================================================`n`n"

$skills = Get-ChildItem ".agents\skills" -Directory
foreach ($skill in $skills) {
    $skillFile = Join-Path $skill.FullName "SKILL.md"
    if (Test-Path $skillFile) {
        $content = Get-Content $skillFile -Raw -Encoding UTF8
        $output += "`n`n========================================`n"
        $output += "### SKILL: $($skill.Name)`n"
        $output += "========================================`n`n"
        $output += $content
        $output += "`n"
    } else {
        $output += "`n`n========================================`n"
        $output += "### SKILL: $($skill.Name)`n"
        $output += "========================================`n"
        $output += "[ملف SKILL.md غير موجود — المجلد فارغ]`n"
    }
}

Set-Content -Path $outputFile -Value $output -Encoding UTF8
Write-Host "تم تجميع كل المهارات في ملف: $outputFile"
