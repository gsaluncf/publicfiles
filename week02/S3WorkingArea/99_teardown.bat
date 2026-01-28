@echo off
setlocal EnableExtensions EnableDelayedExpansion

REM ============================================================
REM Week 2 - Teardown Script
REM Purpose: Delete S3 bucket and all contents to avoid charges
REM ============================================================

echo ============================================================
echo Week 2: TEARDOWN - Delete S3 Bucket
echo ============================================================
echo.

REM ---------- Load bucket name ----------
if not exist "bucket_name.txt" (
    echo [ERROR] bucket_name.txt not found
    echo.
    echo If you created a bucket manually, enter the name:
    set /p BUCKET_NAME="Bucket name (or press Enter to cancel): "
    
    if "!BUCKET_NAME!"=="" (
        echo Cancelled.
        pause
        exit /b 0
    )
) else (
    set /p BUCKET_NAME=<bucket_name.txt
)

echo.
echo ============================================================
echo WARNING: This will DELETE the following:
echo ============================================================
echo   Bucket: %BUCKET_NAME%
echo   All files in the bucket
echo   All bucket configurations
echo.
echo This action CANNOT be undone!
echo.
set /p CONFIRM1="Type the bucket name to confirm: "

if not "%CONFIRM1%"=="%BUCKET_NAME%" (
    echo Bucket name does not match. Cancelled.
    pause
    exit /b 0
)

set /p CONFIRM2="Are you absolutely sure? (yes/no): "

if /i not "%CONFIRM2%"=="yes" (
    echo Cancelled.
    pause
    exit /b 0
)

echo.
echo ============================================================
echo Step 1: Listing bucket contents
echo ============================================================
echo.

aws s3 ls s3://%BUCKET_NAME%/

echo.
echo ============================================================
echo Step 2: Deleting all objects in bucket
echo ============================================================
echo.

REM Delete all objects (including versioned objects if versioning is enabled)
aws s3 rm s3://%BUCKET_NAME% --recursive

if errorlevel 1 (
    echo [WARNING] Some objects may not have been deleted
    echo Continuing anyway...
    echo.
)

echo.
echo ============================================================
echo Step 3: Deleting bucket
echo ============================================================
echo.

aws s3api delete-bucket --bucket %BUCKET_NAME%

if errorlevel 1 (
    echo.
    echo [ERROR] Failed to delete bucket
    echo.
    echo Common issues:
    echo   - Bucket not empty (versioned objects remaining)
    echo   - Bucket has delete protection
    echo.
    echo Try manually:
    echo   1. Go to S3 console
    echo   2. Select bucket: %BUCKET_NAME%
    echo   3. Empty bucket (this deletes all versions)
    echo   4. Delete bucket
    echo.
    pause
    exit /b 1
)

echo [OK] Bucket deleted successfully
echo.

REM ---------- Clean up local files ----------
echo ============================================================
echo Step 4: Cleaning up local configuration files
echo ============================================================
echo.

if exist "bucket_name.txt" (
    del bucket_name.txt
    echo Deleted: bucket_name.txt
)

if exist "bucket_region.txt" (
    del bucket_region.txt
    echo Deleted: bucket_region.txt
)

if exist "bucket_policy.json" (
    del bucket_policy.json
    echo Deleted: bucket_policy.json
)

echo.
echo ============================================================
echo Teardown Complete!
echo ============================================================
echo.
echo All AWS resources have been deleted.
echo You can now start fresh by running 01_create_bucket.bat
echo.
echo Cost impact: $0.00 (assuming minimal usage)
echo.
pause
exit /b 0

