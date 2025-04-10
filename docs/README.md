### Environment Variables

Create a `.env.local` file in the project root with the following variables:

```dotenv
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key # Optional for certain server-side actions

# Stripe
STRIPE_SECRET_KEY=<YOUR_STRIPE_TEST_SECRET_KEY> # Replace with placeholder
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=<YOUR_STRIPE_PUBLIC_KEY> # Replace with placeholder
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret # For handling webhook events
``` 