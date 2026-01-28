@echo off
setlocal EnableExtensions EnableDelayedExpansion

REM ============================================================
REM Week 2 - Verify S3 Website
REM Purpose: Test website endpoint and display URL
REM ============================================================

echo ============================================================
echo Week 2: Verify S3 Static Website
echo ============================================================
echo.

REM ---------- Load bucket info ----------
if not exist "bucket_name.txt" (
    echo [ERROR] bucket_name.txt not found
    echo Please run 01_create_bucket.bat first
    pause
    exit /b 1
)

if not exist "bucket_region.txt" (
    echo [ERROR] bucket_region.txt not found
    echo Please run 01_create_bucket.bat first
    pause
    exit /b 1
)

set /p BUCKET_NAME=<bucket_name.txt
set /p AWS_REGION=<bucket_region.txt

echo Bucket: %BUCKET_NAME%
echo Region: %AWS_REGION%
echo.

REM ---------- Construct website endpoint URL ----------
set WEBSITE_URL=http://%BUCKET_NAME%.s3-website-%AWS_REGION%.amazonaws.com

echo ============================================================
echo Website Endpoint URL:
echo ============================================================
echo.
echo %WEBSITE_URL%
echo.

REM ---------- Test with curl if available ----------
where curl >nul 2>&1
if not errorlevel 1 (
    echo ============================================================
    echo Testing website with curl...
    echo ============================================================
    echo.
    
    curl -I %WEBSITE_URL% 2>nul
    
    if errorlevel 1 (
        echo [WARNING] Could not reach website
        echo.
        echo Possible issues:
        echo   - Bucket policy not set (run 03_set_bucket_policy.bat)
        echo   - Files not uploaded (run 02_sync_site.bat)
        echo   - Website hosting not enabled
        echo.
    ) else (
        echo.
        echo [OK] Website is responding
        echo.
    )
) else (
    echo [INFO] curl not found - skipping HTTP test
    echo.
)

REM ---------- List bucket contents ----------
echo ============================================================
echo Bucket Contents:
echo ============================================================
echo.

aws s3 ls s3://%BUCKET_NAME%/

echo.

REM ---------- Get bucket website configuration ----------
echo ============================================================
echo Website Configuration:
echo ============================================================
echo.

aws s3api get-bucket-website --bucket %BUCKET_NAME%

if errorlevel 1 (
    echo [ERROR] Website hosting not configured
    echo Run 01_create_bucket.bat to enable it
    echo.
)

echo.

REM ---------- Summary ----------
echo ============================================================
echo Verification Complete!
echo ============================================================
echo.
echo Your S3 static website URL:
echo   %WEBSITE_URL%
echo.
echo Copy this URL and paste it into your browser to view the site.
echo.
echo For Canvas submission:
echo   1. Copy the URL above
echo   2. Paste into Canvas assignment
echo   3. Take a screenshot of the live site
echo.
echo To update the site:
echo   1. Edit files in the site\ directory
echo   2. Run: 02_sync_site.bat
echo.
echo To clean up (delete everything):
echo   Run: 99_teardown.bat
echo.

REM ---------- Open in browser ----------
set /p OPEN_BROWSER="Open website in browser now? (y/n): "

if /i "%OPEN_BROWSER%"=="y" (
    start %WEBSITE_URL%
)

pause
exit /b 0

