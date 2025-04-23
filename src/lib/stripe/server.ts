'use server'; // Or import 'server-only';

import Stripe from 'stripe';

let backendStripeClient: Stripe | null = null; // Variable to hold the singleton instance

// Function to get the singleton backend Stripe client instance
export const getServerStripeClient = async (): Promise<Stripe> => {
  if (!backendStripeClient) {
    // Check for the key only when the client is first requested
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error("getServerStripeClient: STRIPE_SECRET_KEY is missing in environment variables");
      throw new Error('STRIPE_SECRET_KEY is missing in environment variables');
    }
    console.log("getServerStripeClient: Initializing backend Stripe client...");
    backendStripeClient = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16', // Use API version expected by installed library types
      typescript: true,
    });
  }
  return backendStripeClient;
}; 