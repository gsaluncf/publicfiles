@echo off
setlocal EnableExtensions EnableDelayedExpansion

REM ============================================================
REM Week 2 - S3 Sync Script
REM Purpose: Upload site files to S3 bucket using aws s3 sync
REM ============================================================

echo ============================================================
echo Week 2: Sync Site Files to S3
echo ============================================================
echo.

REM ---------- Load bucket name ----------
if not exist "bucket_name.txt" (
    echo [ERROR] bucket_name.txt not found
    echo Please run 01_create_bucket.bat first
    pause
    exit /b 1
)

set /p BUCKET_NAME=<bucket_name.txt

echo Bucket: %BUCKET_NAME%
echo.

REM ---------- Verify site directory exists ----------
if not exist "site\" (
    echo [ERROR] site\ directory not found
    echo.
    echo Expected structure:
    echo   S3WorkingArea\
    echo     site\
    echo       index.html
    echo       styles.css
    echo       script.js
    echo.
    pause
    exit /b 1
)

REM ---------- Show what will be uploaded ----------
echo ============================================================
echo Files to upload:
echo ============================================================
dir /b site\
echo.

set /p CONFIRM="Proceed with upload? (y/n): "

if /i not "%CONFIRM%"=="y" (
    echo Cancelled.
    pause
    exit /b 0
)

echo.
echo ============================================================
echo Uploading files to S3...
echo ============================================================
echo.
echo Command: aws s3 sync .\site s3://%BUCKET_NAME% --delete
echo.

REM Sync files to S3
aws s3 sync .\site s3://%BUCKET_NAME% --delete

if errorlevel 1 (
    echo.
    echo [ERROR] Failed to sync files
    echo.
    pause
    exit /b 1
)

echo.
echo [OK] Files uploaded successfully
echo.

REM ---------- List uploaded files ----------
echo ============================================================
echo Verifying uploaded files:
echo ============================================================
echo.

aws s3 ls s3://%BUCKET_NAME%/

echo.
echo ============================================================
echo Upload Complete!
echo ============================================================
echo.
echo Next steps:
echo   1. Run: 03_set_bucket_policy.bat (make files public)
echo   2. Run: 04_verify_website.bat (test the site)
echo.
pause
exit /b 0

