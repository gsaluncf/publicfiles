@echo off
setlocal EnableExtensions EnableDelayedExpansion

REM ============================================================
REM Week 2 - AWS CLI Verification Script
REM Purpose: Verify AWS CLI is installed and configured
REM ============================================================

echo ============================================================
echo Week 2: AWS CLI Verification
echo ============================================================
echo.

REM ---------- Check if AWS CLI is installed ----------
where aws >nul 2>&1
if errorlevel 1 (
    echo [ERROR] AWS CLI not found in PATH
    echo.
    echo Please install AWS CLI first:
    echo   Windows: https://awscli.amazonaws.com/AWSCLIV2.msi
    echo   Or see week01/aws-cli-setup.html
    echo.
    pause
    exit /b 1
)

echo [OK] AWS CLI found
echo.

REM ---------- Check AWS CLI version ----------
echo [AWS CLI Version]
aws --version
echo.

REM ---------- Check AWS credentials ----------
echo [Checking AWS Credentials]
echo Running: aws sts get-caller-identity
echo.

aws sts get-caller-identity
if errorlevel 1 (
    echo.
    echo [ERROR] AWS credentials not configured or invalid
    echo.
    echo Please run: aws configure
    echo.
    echo You will need:
    echo   - AWS Access Key ID
    echo   - AWS Secret Access Key
    echo   - Default region (e.g., us-east-1)
    echo   - Default output format (json)
    echo.
    pause
    exit /b 1
)

echo.
echo [OK] AWS credentials are valid
echo.

REM ---------- Test S3 access ----------
echo [Testing S3 Access]
echo Running: aws s3 ls
echo.

aws s3 ls
if errorlevel 1 (
    echo.
    echo [WARNING] Could not list S3 buckets
    echo Your credentials may not have S3 permissions
    echo.
    pause
    exit /b 1
)

echo.
echo [OK] S3 access confirmed
echo.

REM ---------- Summary ----------
echo ============================================================
echo Verification Complete!
echo ============================================================
echo.
echo You are ready to proceed with the S3 assignment.
echo.
echo Next steps:
echo   1. Run: 01_create_bucket.bat
echo   2. Run: 02_sync_site.bat
echo   3. Run: 03_verify_website.bat
echo.
pause
exit /b 0

