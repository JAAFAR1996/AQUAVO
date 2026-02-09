@echo off
setlocal
chcp 65001 >nul

:: ==========================================
:: AQUAVO AUTO-EDITOR SCRIPT (V3 - Stable)
:: ==========================================
:: Description: Two-Pass Render (Merge -> Edit)
:: Priority: Stability & Sync
:: ==========================================

echo [INFO] Starting AQUAVO Auto-Editor V3...

:: 1. Check Files
if not exist "1.mp4" (
    echo [ERROR] Clip '1.mp4' not found!
    pause
    exit /b
)
if not exist "download (2).wav" (
    echo [ERROR] Audio file not found!
    pause
    exit /b
)

:: 2. Create Clip List
echo [INFO] Step 1/3: Preparing clip list...
(
    echo file '1.mp4'
    echo file '2.mp4'
    echo file '3.mp4'
    echo file '4.mp4'
    echo file '5.mp4'
    echo file '6.mp4'
    echo file 'The_teaching_fish_1080p_202601181958.mp4'
) > cliplist.txt

:: 3. PASS 1: Merge Clips (Safe Concatenation)
echo [INFO] Step 2/3: Merging clips into one raw file...
ffmpeg -y -hide_banner -loglevel error -f concat -safe 0 -i cliplist.txt -c copy "temp_merged.mp4"

if not exist "temp_merged.mp4" (
    echo [ERROR] Failed to merge clips. Check inputs.
    pause
    exit /b
)

:: 4. PASS 2: Edit & Brand (The Magic Step)
echo [INFO] Step 3/3: Applying cuts, sync, and branding...
echo [INFO] This might take a minute...

:: Note: Command flattened to single line to prevent batch errors.
:: Note: Using simple Arial with escaped path.

ffmpeg -y -hide_banner -loglevel error -i "temp_merged.mp4" -i "download (2).wav" -filter_complex "[0:v]trim=0:12,setpts=PTS-STARTPTS[v0];[0:v]trim=20.36:24,setpts=PTS-STARTPTS[v1];[0:v]trim=29:56,setpts=PTS-STARTPTS[v2];[v0][v1][v2]concat=n=3:v=1:a=0[vcat];[vcat]tpad=stop_mode=clone:stop_duration=5.05,scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920[v_extended];[v_extended]drawbox=x=0:y=1300:w=1080:h=400:color=black@0.6:t=fill[v_bg];[v_bg]drawtext=fontfile='C\:/Windows/Fonts/arial.ttf':text='@AQUAVO':x=(w-text_w)/2:y=1400:fontsize=80:fontcolor=white:borderw=5:bordercolor=black,drawtext=fontfile='C\:/Windows/Fonts/arial.ttf':text='Follow ^& Save':x=(w-text_w)/2:y=1550:fontsize=60:fontcolor=white:borderw=3:bordercolor=black[vout];[1:a]aresample=48000[aout]" -map "[vout]" -map "[aout]" -c:v libx264 -preset fast -crf 23 -pix_fmt yuv420p -c:a aac -b:a 192k -ar 48000 -movflags +faststart "AQUAVO_FINAL_OPTION2.mp4"

:: Cleanup
del cliplist.txt
del temp_merged.mp4

if %errorlevel% equ 0 (
    echo.
    echo ==========================================
    echo [SUCCESS] Video created: AQUAVO_FINAL_OPTION2.mp4
    echo ==========================================
) else (
    echo.
    echo [ERROR] Final rendering failed.
)

pause
