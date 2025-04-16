'use server';

import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr'; // Use ssr
import type { Database } from '@/types/supabase'; // Assuming Database type
import { z } from 'zod';

import { stripe } from '@/lib/stripe/client'; // Import backend stripe instance
import { db } from '@/lib/db';
import { users, packages } from '@/lib/db/schema'; // Assuming you might need user/package info
import { eq } from 'drizzle-orm';

// Helper to get user record from DB (using ssr)
async function getAuthenticatedUser() {
    const cookieStore = await cookies();
    const supabase = createServerClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    return cookieStore.get(name)?.value;
                },
                set(name: string, value: string, options: any) {
                    cookieStore.set({ name, value, ...options });
                },
                remove(name: string, options: any) {
                    cookieStore.set({ name, value: '', ...options });
                },
            },
        }
    );
    // Use getUser for verified user data
    const { data: { user }, error } = await supabase.auth.getUser(); 
    if (error || !user) {
        console.error("[getAuthenticatedUser StripeActions] Auth Error:", error);
        throw new Error("User is not authenticated.");
    }

    // Fetch the user record from our public.users table
    const userRecords = await db.select().from(users).where(eq(users.id, user.id)).limit(1);
    if (!userRecords || userRecords.length === 0) {
        console.error(`[StripeActions] User record not found in DB for Supabase user ID: ${user.id}`);
        throw new Error("Authenticated user record not found in database.");
    }

    return userRecords[0]; // Return the full user record from DB
}

// Zod schema for payload validation
const PaymentIntentPayloadSchema = z.object({
    amount: z.number().positive('Amount must be positive'), // Amount in cents
    currency: z.string().length(3, 'Currency code must be 3 letters'),
    packageId: z.string().uuid('Invalid Package ID').optional(),
});

export async function createPaymentIntent(payload: z.infer<typeof PaymentIntentPayloadSchema>): Promise<{ success: boolean; clientSecret?: string | null; message: string; }> {
    try {
        // Validate payload first
        const validatedPayload = PaymentIntentPayloadSchema.parse(payload);
        const { amount, currency, packageId } = validatedPayload;

        const user = await getAuthenticatedUser(); // Get user record from DB

        let stripeCustomerId = user.stripe_customer_id;

        // 1. Retrieve or Create Stripe Customer ID
        if (!stripeCustomerId) {
            console.log(`[Stripe] No Stripe Customer ID found for user ${user.id}. Creating one.`);
            try {
                const customer = await stripe.customers.create({
                    email: user.email, // Use email from DB user record
                    name: `${user.email}`, // Optional: Set a name
                    metadata: {
                        supabase_user_id: user.id, // Link back to your user ID
                    },
                });
                stripeCustomerId = customer.id;
                console.log(`[Stripe] Created Stripe Customer ${stripeCustomerId} for user ${user.id}`);

                // Save the new Stripe Customer ID back to your user record
                await db.update(users)
                    .set({ stripe_customer_id: stripeCustomerId, updated_at: new Date() })
                    .where(eq(users.id, user.id));

            } catch (customerError) {
                console.error(`[Stripe] Failed to create Stripe customer for user ${user.id}:`, customerError);
                throw new Error("Failed to create associated payment customer.");
            }
        } else {
            console.log(`[Stripe] Using existing Stripe Customer ID ${stripeCustomerId} for user ${user.id}`);
        }

        // 2. Optional: Verify packageId and amount match package price
        // (Add this logic if necessary, fetching package details from DB)
        if (packageId) {
            // Example: Fetch package and compare amount
             const pkg = await db.select({ cost: packages.monthly_cost }).from(packages).where(eq(packages.id, packageId)).limit(1);
             if (!pkg.length) {
                 throw new Error(`Package with ID ${packageId} not found.`);
             }
             // Explicitly parse the decimal string cost and type it as number
             const costAsString: string = pkg[0].cost;
             const costAsNumber: number = parseFloat(costAsString);

             // Add a check to ensure parsing was successful
             if (isNaN(costAsNumber)) {
                 console.error(`[Stripe] Failed to parse package cost '${costAsString}' as number for package ${packageId}`);
                 throw new Error(`Invalid cost format for package ${packageId}.`);
             }

             // Convert package cost to cents (number) for comparison
             const expectedAmount = Math.round(costAsNumber * 100);
             if (amount !== expectedAmount) {
                 console.warn(`[Stripe] Mismatched amount for package ${packageId}. Payload: ${amount}, Expected: ${expectedAmount}`);
                 // Decide whether to throw error or proceed
                 // throw new Error(`Payment amount ${amount} does not match package price ${expectedAmount}.`);
             }
        }

        console.log(`[Stripe] Creating payment intent for user ${user.id}, customer ${stripeCustomerId}, amount ${amount} ${currency}`);

        // 3. Create the Payment Intent with the Customer ID
        const paymentIntent = await stripe.paymentIntents.create({
            amount: amount,
            currency: currency,
            customer: stripeCustomerId, // Associate with the Stripe Customer
            metadata: {
                 user_id: user.id,
                 package_id: packageId || 'N/A',
            },
            automatic_payment_methods: {
                enabled: true,
            },
            // Consider adding setup_future_usage: 'off_session' if you plan to save cards
            // setup_future_usage: 'off_session',
        });

        console.log(`[Stripe] Payment intent ${paymentIntent.id} created for customer ${stripeCustomerId}`);

        return {
            success: true,
            clientSecret: paymentIntent.client_secret,
            message: 'Payment Intent created successfully.'
        };

    } catch (error) {
        console.error("[Stripe] Error creating Payment Intent:", error);
        const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
         if (error instanceof z.ZodError) {
            return {
                success: false,
                message: `Invalid payment data: ${error.errors.map(e => `${e.path.join('.')} - ${e.message}`).join(', ')}`,
            };
        }
        return {
            success: false,
            message: `Failed to create Payment Intent: ${errorMessage}`,
        };
    }
}

// TODO: Add other Stripe-related server actions if needed
// e.g., handle webhooks, update subscription, etc. 