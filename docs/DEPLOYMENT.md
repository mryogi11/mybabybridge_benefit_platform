# MyBabyBridge Deployment Guide

This guide provides detailed instructions for deploying the MyBabyBridge application on Vercel.

## Prerequisites

Before deploying, ensure you have:

- A [Vercel](https://vercel.com) account
- A [GitHub](https://github.com) account (for repository hosting)
- Access to the [Supabase](https://supabase.com) project
- A [Stripe](https://stripe.com) account for payment processing

## Pre-Deployment Checklist

1. Run the verification script to ensure your project is ready for deployment:
   ```
   node prepare-for-vercel.js
   ```

2. Verify that all environment variables are properly set in your `.env.local` file (for reference only, don't commit this file).

3. Ensure your `vercel.json` and `next.config.js` files are configured correctly.

## Deployment Steps

### 1. Push Your Code to GitHub

If you haven't already, push your code to a GitHub repository:

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin YOUR_GITHUB_REPO_URL
git push -u origin main
```

### 2. Connect to Vercel

1. Log in to your [Vercel dashboard](https://vercel.com/dashboard)
2. Click "Add New..." and select "Project"
3. Import your GitHub repository
4. Select the repository containing your MyBabyBridge code

### 3. Configure Project Settings

1. Choose "Next.js" as your framework preset (should be detected automatically)
2. Set the build command to `npm run build` (should be pre-filled)
3. Set the output directory to `.next` (should be pre-filled)

### 4. Configure Environment Variables

Add the following environment variables in the Vercel project settings:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
STRIPE_SECRET_KEY=your_stripe_secret_key
NEXT_PUBLIC_APP_URL=your_vercel_deployment_url
```

For production, you can use:
```
NEXT_PUBLIC_APP_URL=$VERCEL_URL
```

### 5. Deploy

1. Click "Deploy" to start the deployment process
2. Vercel will build and deploy your application
3. Once complete, you will receive a deployment URL

## Post-Deployment

### 1. Configure Domain (Optional)

1. In your Vercel project, go to "Settings" > "Domains"
2. Add and configure your custom domain

### 2. Set Up Webhooks

1. Configure Stripe webhooks to point to your new deployment URL:
   ```
   https://your-deployment-url.vercel.app/api/webhooks/stripe
   ```

2. Configure Supabase webhooks if needed

### 3. Verify Deployment

1. Test the application by navigating to the deployment URL
2. Verify that:
   - Authentication works correctly
   - Database connections are functioning
   - Payment processing is working
   - All pages and features are accessible

## Monitoring and Logs

- Access logs and monitoring through the Vercel dashboard
- Set up error tracking with Vercel Analytics or integrate a third-party service

## Troubleshooting

### Common Issues:

1. **API Routes Not Working**
   - Check that your environment variables are correctly set
   - Verify API route implementations and middleware

2. **Authentication Problems**
   - Ensure Supabase URLs and keys are correct
   - Check for CORS issues

3. **Build Errors**
   - Review build logs in Vercel
   - Test builds locally before deploying

## Continuous Deployment

Vercel automatically sets up continuous deployment from your GitHub repository. Any push to your main branch will trigger a new deployment.

To disable automatic deployments:
1. Go to your project settings in Vercel
2. Navigate to "Git" section
3. Disable "Auto Deploy" 