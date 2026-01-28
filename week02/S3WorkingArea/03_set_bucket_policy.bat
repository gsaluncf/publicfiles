@echo off
setlocal EnableExtensions EnableDelayedExpansion

REM ============================================================
REM Week 2 - Set S3 Bucket Policy
REM Purpose: Configure public read access for website
REM ============================================================

echo ============================================================
echo Week 2: Set Bucket Policy for Public Access
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

REM ---------- Create bucket policy JSON ----------
echo Creating bucket policy...
echo.

(
echo {
echo   "Version": "2012-10-17",
echo   "Statement": [
echo     {
echo       "Sid": "PublicReadGetObject",
echo       "Effect": "Allow",
echo       "Principal": "*",
echo       "Action": "s3:GetObject",
echo       "Resource": "arn:aws:s3:::%BUCKET_NAME%/*"
echo     }
echo   ]
echo }
) > bucket_policy.json

echo Bucket policy saved to: bucket_policy.json
echo.

REM ---------- Show policy ----------
echo ============================================================
echo Policy to apply:
echo ============================================================
type bucket_policy.json
echo.
echo.

echo WARNING: This will make all objects in the bucket publicly readable.
echo This is required for S3 static website hosting.
echo.
set /p CONFIRM="Apply this policy? (y/n): "

if /i not "%CONFIRM%"=="y" (
    echo Cancelled.
    pause
    exit /b 0
)

echo.
echo ============================================================
echo Step 1: Disable Block Public Access (if needed)
echo ============================================================
echo.

REM Try to disable block public access
aws s3api put-public-access-block --bucket %BUCKET_NAME% --public-access-block-configuration "BlockPublicAcls=false,IgnorePublicAcls=false,BlockPublicPolicy=false,RestrictPublicBuckets=false"

if errorlevel 1 (
    echo [WARNING] Could not modify Block Public Access settings
    echo You may need to do this manually in the AWS Console
    echo.
)

echo.
echo ============================================================
echo Step 2: Applying bucket policy
echo ============================================================
echo.

aws s3api put-bucket-policy --bucket %BUCKET_NAME% --policy file://bucket_policy.json

if errorlevel 1 (
    echo.
    echo [ERROR] Failed to apply bucket policy
    echo.
    echo Common issues:
    echo   - Block Public Access is still enabled
    echo   - Insufficient permissions
    echo.
    echo Try manually in AWS Console:
    echo   1. Go to S3 console
    echo   2. Select bucket: %BUCKET_NAME%
    echo   3. Permissions tab
    echo   4. Block Public Access - Edit - Uncheck all
    echo   5. Bucket Policy - Edit - Paste policy from bucket_policy.json
    echo.
    pause
    exit /b 1
)

echo [OK] Bucket policy applied successfully
echo.

echo ============================================================
echo Public Access Configured!
echo ============================================================
echo.
echo Your bucket is now publicly readable for website hosting.
echo.
echo Next step:
echo   Run: 04_verify_website.bat (test the site)
echo.
pause
exit /b 0

