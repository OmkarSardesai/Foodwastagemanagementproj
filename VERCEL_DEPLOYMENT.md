# Vercel Deployment Guide for Food Wastage Management System

## Steps to Deploy on Vercel:

### 1. **Push to GitHub**
   - Create a GitHub repository
   - Push your entire project to GitHub

### 2. **Sign up on Vercel**
   - Go to https://vercel.com
   - Sign up/Login with your GitHub account

### 3. **Import Your Project**
   - Click "Add New" → "Project"
   - Select your GitHub repository
   - Leave default settings and click "Deploy"

### 4. **Set Environment Variables**
   After deployment fails (expected on first try), go to:
   - Project → Settings → Environment Variables
   - Add these variables:
     ```
     DB_HOST = your_mysql_host
     DB_USER = your_mysql_user
     DB_PASS = your_mysql_password
     DB_NAME = food_waste_proj
     ```

### 5. **Redeploy**
   - Go to Deployments tab
   - Click "Redeploy" on the latest failed deployment
   - It should now work with environment variables!

## What Changed in Your Project:

✅ **Connection Pooling** - Uses mysql2 pool instead of single connection (better for serverless)
✅ **vercel.json** - Configuration file for Vercel deployment
✅ **.vercelignore** - Tells Vercel what files to ignore
✅ **Serverless Exports** - App now exports for Vercel functions
✅ **Better Error Handling** - Improved connection and query error messages

## Important Notes:

⚠️ **MySQL Database Required** - Your MySQL database must be accessible from the internet
   - Options: AWS RDS, PlanetScale, DigitalOcean, or any hosted MySQL service

⚠️ **Database Credentials** - Never commit .env file with real credentials
   - Use Vercel's Environment Variables feature instead

## Local Testing Before Deploy:

```bash
cd backend
npm install
node server.js
```

Then test your API at http://localhost:5000

## After Deployment:

Your backend will be at: `https://your-project.vercel.app`
Update your frontend API calls to use this URL.
