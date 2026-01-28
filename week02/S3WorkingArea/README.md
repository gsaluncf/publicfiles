# Week 2: S3 Static Website - Working Area

## Purpose
This directory contains scripts and starter files for the Week 2 S3 static website assignment. These scripts automate the process of creating an S3 bucket, uploading files, configuring public access, and testing the website.

## Prerequisites
- AWS account (from Week 1)
- AWS CLI installed and configured (from Week 1)
- Windows Command Prompt (cmd.exe) - **NOT PowerShell**

## Directory Structure
```
S3WorkingArea/
├── site/                      # Starter website files
│   ├── index.html            # Main HTML file
│   ├── styles.css            # CSS styling
│   └── script.js             # JavaScript functionality
├── 00_verify_aws_cli.bat     # Verify AWS CLI setup
├── 01_create_bucket.bat      # Create S3 bucket
├── 02_sync_site.bat          # Upload files to S3
├── 03_set_bucket_policy.bat  # Configure public access
├── 04_verify_website.bat     # Test website endpoint
└── 99_teardown.bat           # Delete everything (cleanup)
```

## Quick Start

### Step 1: Verify AWS CLI
```cmd
00_verify_aws_cli.bat
```
This checks that AWS CLI is installed and your credentials work.

### Step 2: Create S3 Bucket
```cmd
01_create_bucket.bat
```
- Enter a globally unique bucket name (e.g., `ncf-s26-yourname-site`)
- Choose AWS region (default: us-east-1)
- Script creates bucket and enables static website hosting

### Step 3: Upload Site Files
```cmd
02_sync_site.bat
```
- Uploads all files from `site/` directory to S3
- Uses `aws s3 sync` command (same as students will use)

### Step 4: Configure Public Access
```cmd
03_set_bucket_policy.bat
```
- Disables Block Public Access
- Applies bucket policy for public read access
- Required for website to be accessible

### Step 5: Verify Website
```cmd
04_verify_website.bat
```
- Displays website URL
- Tests HTTP connectivity
- Opens site in browser

### Step 6: Teardown (When Done)
```cmd
99_teardown.bat
```
- **IMPORTANT**: Run this to avoid AWS charges
- Deletes all objects in bucket
- Deletes the bucket itself
- Cleans up local configuration files

## What Gets Created in AWS
1. **S3 Bucket** with static website hosting enabled
2. **Bucket Policy** allowing public read access
3. **Website Endpoint** (e.g., `http://bucket-name.s3-website-us-east-1.amazonaws.com`)

## What Gets Created Locally
- `bucket_name.txt` - Stores bucket name for other scripts
- `bucket_region.txt` - Stores AWS region
- `bucket_policy.json` - Generated bucket policy

## Customizing the Starter Site

### For Students: LLM Enhancement
The starter site includes an "LLM Enhancement Zone" with ideas for improvements:
- Add dark mode toggle
- Create interactive forms
- Add animations and transitions
- Integrate data visualizations
- Build a simple game or quiz

Students can use AI coding assistants (GitHub Copilot, Cursor, Augment) to enhance the site while keeping it static and S3-compatible.

### Editing Files
1. Edit files in `site/` directory
2. Run `02_sync_site.bat` to upload changes
3. Refresh browser to see updates

## Troubleshooting

### "Bucket already exists"
Bucket names are globally unique across all AWS accounts. Choose a different name.

### "403 Forbidden" when accessing website
- Run `03_set_bucket_policy.bat` to configure public access
- Check that Block Public Access is disabled
- Verify bucket policy is applied

### "AWS CLI not found"
- Install AWS CLI: https://awscli.amazonaws.com/AWSCLIV2.msi
- Restart Command Prompt after installation

### "Unable to locate credentials"
- Run `aws configure` and enter your access keys
- See Week 1 AWS CLI setup instructions

## Cost Considerations
- S3 storage: ~$0.023 per GB per month
- S3 requests: ~$0.0004 per 1,000 GET requests
- Data transfer: First 100 GB/month free
- **This assignment should cost less than $0.01 if cleaned up promptly**

## Assignment Submission
1. Run all scripts successfully
2. Copy website URL from `04_verify_website.bat`
3. Submit URL to Canvas
4. Take screenshot of live website
5. **Run `99_teardown.bat` after grading to avoid charges**

## CloudFront (Optional)
CloudFront is a CDN that can be added in front of S3 for:
- HTTPS support
- Custom domain names
- Better global performance
- Edge caching

This is covered as optional extra credit. Scripts for CloudFront may be added later.

## GitHub Classroom
This repository will be distributed via GitHub Classroom. Students will:
1. Accept assignment link
2. Clone their personal copy
3. Customize the site
4. Deploy to S3
5. Submit website URL

## Testing Notes
These scripts are designed to:
- Match the exact workflow students will follow
- Provide clear error messages
- Save configuration between steps
- Allow easy cleanup and restart

