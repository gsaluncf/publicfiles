# Week 2 Assignment: AWS S3 Static Website Hosting

## Overview

In this assignment, you'll deploy a static website to Amazon S3 and make it publicly accessible. You'll learn about cloud storage, static website hosting, and AWS infrastructure.

**Time estimate:** 45-60 minutes

## Prerequisites

Before you begin, verify you have:

1. ✅ AWS account created (from Week 1)
2. ✅ AWS CLI installed and configured (`aws configure`)
3. ✅ Valid AWS credentials that work: `aws sts get-caller-identity`
4. ✅ This repository cloned to your local machine

## What You're Starting With

This repository contains starter files for your website:

```
site/
├── index.html    # Main HTML page
├── styles.css    # CSS styling
└── script.js     # JavaScript functionality
```

**Your task:** Deploy these files to AWS S3 and make them publicly accessible as a website.

## Deployment Instructions

You have **two methods** to complete this assignment. Choose the one that works best for you:

### Method 1: AWS Console UI (Click-Through)

Follow the step-by-step instructions in Canvas under "Week 2 Lab" to deploy using the AWS web console. This method helps you understand what's happening at each step.

**Key steps:**
1. Create an S3 bucket with a unique name
2. Enable static website hosting
3. Upload your website files
4. Configure public access settings
5. Add a bucket policy for public read access
6. Test your website

### Method 2: AWS CLI Scripts (Automated)

Create automation scripts to deploy your website using the AWS CLI. This method is faster and more repeatable.

**You'll create these scripts yourself** (following the lab instructions):
- `00_verify_aws_cli.bat` - Verify AWS CLI setup
- `01_create_bucket.bat` - Create bucket and enable hosting
- `02_sync_site.bat` - Upload website files
- `03_set_bucket_policy.bat` - Configure public access
- `04_verify_website.bat` - Test your website
- `99_teardown.bat` - Clean up resources (IMPORTANT!)

## Customizing Your Website

Once deployed, customize the starter files to make the site your own:

1. Edit `site/index.html` - Change the content, add your name, etc.
2. Edit `site/styles.css` - Modify colors, fonts, layout
3. Edit `site/script.js` - Add interactive features

After making changes, re-upload the files to S3 (either via Console or CLI).

## Important: Cost Management

⚠️ **AWS charges for S3 storage and requests.** While costs are minimal for this assignment (typically $0.01-0.10), you should:

1. **Delete your bucket when done** using the teardown script or Console
2. **Don't leave resources running** after the assignment is complete
3. **Monitor your AWS billing** dashboard regularly

## Submission Requirements

Submit to Canvas:

1. **Screenshot** of your live website showing the URL in the browser
2. **Website URL** (your S3 website endpoint)
3. **Brief reflection** (3-5 sentences):
   - What method did you use (Console UI or CLI)?
   - What challenges did you encounter?
   - What did you learn about cloud infrastructure?

## Troubleshooting

**Website shows 403 Forbidden:**
- Check that Block Public Access is disabled
- Verify bucket policy is correct and includes your bucket name
- Ensure bucket policy has `"Principal": "*"` for public access

**Website shows 404 Not Found:**
- Verify files are uploaded to the bucket root (not in a folder)
- Check that `index.html` is spelled correctly
- Ensure static website hosting is enabled

**AWS CLI commands fail:**
- Run `aws sts get-caller-identity` to verify credentials
- Check that you ran `aws configure` with valid access keys
- Verify you're in the correct directory

## Extra Credit Opportunities

See Canvas for optional extra credit assignments:
- **CloudFront CDN Integration** (+5 to +15 points)
- **Custom Domain Setup** (if you completed Week 1 extra credit)

## Resources

- [Official AWS S3 Static Website Tutorial](https://docs.aws.amazon.com/AmazonS3/latest/userguide/HostingWebsiteOnS3Setup.html)
- [AWS S3 Documentation](https://docs.aws.amazon.com/s3/)
- [AWS CLI S3 Commands Reference](https://docs.aws.amazon.com/cli/latest/reference/s3/)

## Questions?

If you get stuck:
1. Check the troubleshooting section above
2. Review the Canvas lab instructions
3. Ask in the course discussion forum
4. Attend office hours

---

**Good luck! 🚀**

