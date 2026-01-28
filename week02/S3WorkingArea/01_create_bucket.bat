@echo off
setlocal EnableExtensions EnableDelayedExpansion

REM ============================================================
REM Week 2 - S3 Bucket Creation Script
REM Purpose: Create S3 bucket and enable static website hosting
REM ============================================================

echo ============================================================
echo Week 2: Create S3 Bucket for Static Website
echo ============================================================
echo.

REM ---------- Get bucket name from user ----------
set /p BUCKET_NAME="Enter your bucket name (e.g., ncf-s26-yourname-site): "

if "%BUCKET_NAME%"=="" (
    echo [ERROR] Bucket name cannot be empty
    pause
    exit /b 1
)

echo.
echo Bucket name: %BUCKET_NAME%
echo.

REM ---------- Get AWS region ----------
set /p AWS_REGION="Enter AWS region (default: us-east-1): "

if "%AWS_REGION%"=="" (
    set AWS_REGION=us-east-1
)

echo Region: %AWS_REGION%
echo.

REM ---------- Confirm before proceeding ----------
echo ============================================================
echo Ready to create bucket with these settings:
echo   Bucket: %BUCKET_NAME%
echo   Region: %AWS_REGION%
echo ============================================================
echo.
set /p CONFIRM="Proceed? (y/n): "

if /i not "%CONFIRM%"=="y" (
    echo Cancelled.
    pause
    exit /b 0
)

echo.
echo ============================================================
echo Step 1: Creating S3 bucket
echo ============================================================
echo.

REM Create bucket (us-east-1 doesn't need LocationConstraint)
if "%AWS_REGION%"=="us-east-1" (
    aws s3api create-bucket --bucket %BUCKET_NAME% --region %AWS_REGION%
) else (
    aws s3api create-bucket --bucket %BUCKET_NAME% --region %AWS_REGION% --create-bucket-configuration LocationConstraint=%AWS_REGION%
)

if errorlevel 1 (
    echo.
    echo [ERROR] Failed to create bucket
    echo Common issues:
    echo   - Bucket name already exists globally
    echo   - Invalid bucket name format
    echo   - Insufficient permissions
    echo.
    pause
    exit /b 1
)

echo [OK] Bucket created successfully
echo.

REM ---------- Enable static website hosting ----------
echo ============================================================
echo Step 2: Enabling static website hosting
echo ============================================================
echo.

aws s3 website s3://%BUCKET_NAME%/ --index-document index.html --error-document index.html

if errorlevel 1 (
    echo [ERROR] Failed to enable website hosting
    pause
    exit /b 1
)

echo [OK] Static website hosting enabled
echo.

REM ---------- Save bucket info for other scripts ----------
echo %BUCKET_NAME%> bucket_name.txt
echo %AWS_REGION%> bucket_region.txt

echo ============================================================
echo Bucket Configuration Complete!
echo ============================================================
echo.
echo Bucket name saved to: bucket_name.txt
echo Region saved to: bucket_region.txt
echo.
echo Website endpoint will be:
echo   http://%BUCKET_NAME%.s3-website-%AWS_REGION%.amazonaws.com
echo.
echo Next steps:
echo   1. Run: 02_sync_site.bat (upload files)
echo   2. Run: 03_set_bucket_policy.bat (make public)
echo   3. Run: 04_verify_website.bat (test)
echo.
pause
exit /b 0

