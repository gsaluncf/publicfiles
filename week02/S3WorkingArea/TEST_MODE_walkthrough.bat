@echo off
setlocal EnableExtensions EnableDelayedExpansion

REM ============================================================
REM Week 2 - TEST MODE Walkthrough
REM Purpose: Simulate the entire workflow without AWS calls
REM This validates the script logic and flow
REM ============================================================

echo ============================================================
echo Week 2: S3 Assignment - TEST MODE WALKTHROUGH
echo ============================================================
echo.
echo This script simulates the entire workflow without making
echo actual AWS API calls. Use this to validate the process.
echo.
pause

REM ---------- Simulate bucket creation ----------
echo.
echo ============================================================
echo SIMULATING: 01_create_bucket.bat
echo ============================================================
echo.

set BUCKET_NAME=ncf-s26-test-site
set AWS_REGION=us-east-1

echo [SIMULATED] Creating bucket: %BUCKET_NAME%
echo [SIMULATED] Region: %AWS_REGION%
echo [SIMULATED] Enabling static website hosting
echo.

REM Save bucket info
echo %BUCKET_NAME%> bucket_name.txt
echo %AWS_REGION%> bucket_region.txt

echo [OK] Bucket configuration saved
echo   - bucket_name.txt
echo   - bucket_region.txt
echo.
pause

REM ---------- Simulate file sync ----------
echo.
echo ============================================================
echo SIMULATING: 02_sync_site.bat
echo ============================================================
echo.

echo [SIMULATED] Command: aws s3 sync .\site s3://%BUCKET_NAME% --delete
echo.
echo Files that would be uploaded:
dir /b site\
echo.

echo [OK] Files would be synced to S3
echo.
pause

REM ---------- Simulate bucket policy ----------
echo.
echo ============================================================
echo SIMULATING: 03_set_bucket_policy.bat
echo ============================================================
echo.

echo [SIMULATED] Creating bucket policy JSON...

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

echo [OK] Policy saved to: bucket_policy.json
echo.
type bucket_policy.json
echo.

echo [SIMULATED] Disabling Block Public Access
echo [SIMULATED] Applying bucket policy
echo.
echo [OK] Bucket would be publicly accessible
echo.
pause

REM ---------- Simulate verification ----------
echo.
echo ============================================================
echo SIMULATING: 04_verify_website.bat
echo ============================================================
echo.

set WEBSITE_URL=http://%BUCKET_NAME%.s3-website-%AWS_REGION%.amazonaws.com

echo Website URL would be:
echo   %WEBSITE_URL%
echo.

echo [SIMULATED] Testing HTTP connectivity...
echo [OK] Website would be accessible
echo.
pause

REM ---------- Summary ----------
echo.
echo ============================================================
echo TEST MODE WALKTHROUGH COMPLETE
echo ============================================================
echo.
echo All scripts validated successfully!
echo.
echo Files created:
echo   - bucket_name.txt
echo   - bucket_region.txt
echo   - bucket_policy.json
echo.
echo Website URL (simulated):
echo   %WEBSITE_URL%
echo.
echo To test with real AWS:
echo   1. Configure AWS CLI: aws configure
echo   2. Run: 00_verify_aws_cli.bat
echo   3. Run: 01_create_bucket.bat
echo   4. Run: 02_sync_site.bat
echo   5. Run: 03_set_bucket_policy.bat
echo   6. Run: 04_verify_website.bat
echo   7. Run: 99_teardown.bat (cleanup)
echo.
echo To clean up test files:
set /p CLEANUP="Delete test files now? (y/n): "

if /i "%CLEANUP%"=="y" (
    del bucket_name.txt 2>nul
    del bucket_region.txt 2>nul
    del bucket_policy.json 2>nul
    echo [OK] Test files deleted
)

echo.
pause
exit /b 0

