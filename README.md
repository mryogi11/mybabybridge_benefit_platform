# MyBabyBridge Fertility Care Platform

A comprehensive fertility care platform for connecting patients with providers, tracking treatment plans, and providing educational resources.

## Deployment to Vercel

### Prerequisites

- A [Vercel](https://vercel.com) account
- A [Supabase](https://supabase.com) project
- A [Stripe](https://stripe.com) account (for payment features)

### Environment Variables

Set up the following environment variables in your Vercel project settings:

```
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# Stripe Configuration
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your-stripe-publishable-key
STRIPE_SECRET_KEY=your-stripe-secret-key
STRIPE_WEBHOOK_SECRET=your-stripe-webhook-secret

# Application Configuration (Vercel automatically sets this)
NEXT_PUBLIC_APP_URL=https://your-project-url.vercel.app
```

### Deployment Steps

1. Connect your GitHub repository to Vercel
2. Configure the environment variables
3. Deploy with the default settings
4. Vercel will automatically detect the Next.js project and use the appropriate build settings

### Using Our Deployment Tools

We've created several tools to make deployment easier:

1. **Verify Deployment Readiness**:
   ```bash
   npm run verify-deployment
   ```
   This will check that your project is properly configured and run a test build without deploying.

2. **Automated Deployment Helper**:
   ```bash
   npm run deploy
   ```
   This script checks your project for proper configuration and guides you through the deployment process.

3. **Pre-Deployment Verification**:
   ```bash
   npm run prepare-vercel
   ```
   This script verifies that your project is ready for Vercel deployment by checking required files and running a test build.

4. **Quick Reference Guide**:
   See `DEPLOYMENT_SUMMARY.md` for a quick reference to deployment steps.

5. **Detailed Deployment Guide**:
   See `DEPLOYMENT.md` for comprehensive deployment instructions and troubleshooting.

### Post-Deployment Configuration

1. **Set up Supabase webhooks** to point to your new Vercel URL
2. **Configure Stripe webhooks** to use your new Vercel URL
3. **Test the application** thoroughly after deployment

## Development

### Running Locally

```bash
# Install dependencies
npm install

# Run the development server
npm run dev
```

### Building for Production

```bash
# Create a production build
npm run build

# Start the production server
npm start
```

## Additional Resources

- See `HANDOVER.md` for complete project documentation
- See `CODE_INDEX.md` for a comprehensive code overview

## Features

- **User Dashboards**: Patient and provider dashboards with role-specific views
- **Treatment Plans**: Creation, tracking, and analytics for fertility treatment plans
- **Appointment Management**: Scheduling, history, and reminders
- **Secure Messaging**: Communication between patients and providers
- **Educational Resources**: Curated content for fertility education
- **Analytics**: Treatment success metrics and insights
- **Payments**: Integration with payment processing

## Prerequisites

- Node.js 18.x or later
- npm 9.x or later
- Supabase account and project
- Stripe account (for payment processing)

## Environment Setup

1. Copy the environment variables file:
   ```bash
   cp .env.example .env.local
   ```

2. Update the following variables in `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anonymous key
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`: Your Stripe publishable key
   - `STRIPE_SECRET_KEY`: Your Stripe secret key
   - `STRIPE_WEBHOOK_SECRET`: Your Stripe webhook secret
   - `NEXT_PUBLIC_APP_URL`: Your application URL (default: http://localhost:3000)
   - `NODE_ENV`: Environment (development/production)

## Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Link Supabase CLI to your hosted project (only needs to be done once):
   ```bash
   # Replace <PROJECT_REF> with your actual Supabase project reference ID
   npx supabase link --project-ref <PROJECT_REF>
   ```

3. Apply database migrations to your **hosted** Supabase project:
   ```bash
   # WARNING: This command resets the linked remote database, deleting all data!
   # It then applies all migrations found in supabase/migrations/
   # Ensure migration filenames use unique timestamps (<YYYYMMDDHHMMSS>_name.sql).
   npx supabase db reset --linked
   
   # Alternatively, to apply only new pending migrations (without resetting):
   # npx supabase migrations up --linked 
   ```

## Project Structure

```
src/
├── app/                    # Next.js app directory
│   ├── (auth)/            # Authentication routes
│   ├── (dashboard)/       # Dashboard routes
│   └── api/               # API routes
├── components/            # Reusable components
├── lib/                   # Utility functions and configurations
└── types/                 # TypeScript type definitions
```

## Contributing

1. Create a new branch for your feature
2. Make your changes
3. Submit a pull request

## License

This project is private and confidential. 