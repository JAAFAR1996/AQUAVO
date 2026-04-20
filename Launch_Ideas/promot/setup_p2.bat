@echo off
echo ========================================
echo   P2 Samurai - Setup Script
echo ========================================
echo.

echo [1/3] Installing Python dependencies...
pip install moviepy pillow arabic-reshaper python-bidi numpy
echo.

echo [2/3] Downloading fonts from Google Fonts...
echo Downloading Cairo Bold...
curl -L -o fonts\Cairo-Bold.ttf "https://github.com/google/fonts/raw/main/ofl/cairo/static/Cairo-Bold.ttf"
echo Downloading Cairo ExtraBold...
curl -L -o fonts\Cairo-ExtraBold.ttf "https://github.com/google/fonts/raw/main/ofl/cairo/static/Cairo-ExtraBold.ttf"
echo Downloading Tajawal Medium...
curl -L -o fonts\Tajawal-Medium.ttf "https://github.com/google/fonts/raw/main/ofl/tajawal/Tajawal-Medium.ttf"
echo Downloading Tajawal Regular...
curl -L -o fonts\Tajawal-Regular.ttf "https://github.com/google/fonts/raw/main/ofl/tajawal/Tajawal-Regular.ttf"
echo Downloading Inter Medium...
curl -L -o fonts\Inter-Medium.ttf "https://github.com/google/fonts/raw/main/ofl/inter/static/Inter-Medium.ttf"
echo.

echo [3/3] Checking folder structure...
if not exist input mkdir input
if not exist output mkdir output
if not exist fonts mkdir fonts
echo.

echo ========================================
echo   Setup complete!
echo ========================================
echo.
echo Next steps:
echo   1. Place your 4 video clips in the input/ folder:
echo      - input\VID-01.mp4  (ugly heater - 4sec)
echo      - input\VID-02.mp4  (samurai reveal - 11sec)
echo      - input\VID-03.mp4  (stealth in tank - 7sec)
echo      - input\VID-04.mp4  (final reveal - 8sec)
echo.
echo   2. Run the script:
echo      python p2_burn_text.py
echo.
echo   3. Find your video in: output\P2_SAMURAI_FINAL.mp4
echo.
pause
