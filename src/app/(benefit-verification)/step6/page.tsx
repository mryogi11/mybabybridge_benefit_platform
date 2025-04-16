'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
    Box,
    Typography,
    Button,
    Container,
    Paper,
    Divider,
    CircularProgress,
    Alert
} from '@mui/material';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { loadStripe, StripeElementsOptions } from '@stripe/stripe-js';

import { completeBenefitSetup, getUserWithSelectedPackage } from '@/actions/benefitActions';
import { createPaymentIntent } from '@/actions/stripeActions';

// --- Helper Types --- 
interface SelectedPackageDetails {
    id: string;
    name: string;
    monthly_cost: number;
    description: string | null;
}

// --- Stripe Promise Loader ---
const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
    ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
    : null; // Set to null if key is missing

if (!stripePromise) {
    console.error("Stripe publishable key is missing. Payment functionality will be disabled.");
}

// --- Main Exported Component --- 
export default function ConfirmationScreen() {
    const router = useRouter();
    
    const [packageDetails, setPackageDetails] = useState<SelectedPackageDetails | null>(null);
    const [clientSecret, setClientSecret] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let isMounted = true;
        setIsLoading(true);
        setError(null);
        setClientSecret(null);
        setPackageDetails(null);

        const loadDataAndSetupPayment = async () => {
            try {
                const userResult = await getUserWithSelectedPackage();
                if (!isMounted) return;

                if (!userResult.success || !userResult.user) {
                    throw new Error(userResult.message || "Could not load user information.");
                }
                const user = userResult.user;

                // Explicitly check if selected_package_id is available
                if (!user.selected_package_id) {
                     throw new Error("User has not selected a package yet.");
                }

                // Now we know selected_package_id is a string
                const details: SelectedPackageDetails = {
                    id: user.selected_package_id, // Safe now
                    name: user.selected_package_name || 'Unknown Package',
                    monthly_cost: user.selected_package_cost || 0,
                    description: user.selected_package_description
                };
                setPackageDetails(details);

                // 2. If package has a cost, create Payment Intent
                if (details.monthly_cost > 0) {
                    console.log(`Package cost > 0 (${details.monthly_cost}), creating Payment Intent...`);
                    const intentResult = await createPaymentIntent({
                        amount: details.monthly_cost * 100, // Use fetched cost
                        currency: 'usd', 
                        packageId: details.id
                    });
                    if (!isMounted) return;
                    if (intentResult.success && intentResult.clientSecret) {
                        console.log("Payment Intent created, clientSecret obtained.");
                        setClientSecret(intentResult.clientSecret);
                    } else {
                        throw new Error(intentResult.message || "Failed to initialize payment.");
                    }
                } else {
                    console.log("Package has no cost, skipping Payment Intent creation.");
                }
            } catch (err) {
                 if (isMounted) {
                     console.error("Error during confirmation setup:", err);
                     setError(err instanceof Error ? err.message : "Failed to load confirmation details.");
                 }
            } finally {
                 if (isMounted) {
                     setIsLoading(false);
                 }
            }
        };

        loadDataAndSetupPayment();

        return () => { isMounted = false; };

    }, []); // Run only once on mount

    // --- Prepare Stripe Elements Options --- 
    // Options should only be created when clientSecret is a string
    const elementsOptions: StripeElementsOptions | undefined = clientSecret
        ? {
            clientSecret: clientSecret, // Now it's definitely a string here
            appearance: { theme: 'stripe' },
          }
        : undefined;

    // --- Render Logic --- 
    if (isLoading) {
        return (
             <Container maxWidth="sm">
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
                    <CircularProgress /> <Typography sx={{ml: 2}}>Loading Confirmation...</Typography>
                </Box>
            </Container>
        );
    }
    
    if (error || !packageDetails) { 
         return (
            <Container maxWidth="sm">
                 <Box sx={{ my: 4, textAlign: 'center' }}>
                    <Alert severity="error">{error || "Failed to load package details."}</Alert>
                 </Box>
            </Container>
         );
    }

    const requiresPayment = packageDetails.monthly_cost > 0;
    const showPaymentForm = requiresPayment && elementsOptions && stripePromise;

    // Render ConfirmationForm, wrapped with Elements only if needed and possible
    const confirmationContent = <ConfirmationForm packageDetails={packageDetails} requiresPayment={requiresPayment} />; 
    
    if (showPaymentForm) {
        return (
            <Elements options={elementsOptions} stripe={stripePromise}>
                {confirmationContent}
            </Elements>
        );
    } else {
        // Render directly if no payment needed or stripe couldn't load/initialize
        return confirmationContent;
    }
}

// --- Internal Confirmation Form Component (remains the same) ---
interface ConfirmationFormProps {
    packageDetails: SelectedPackageDetails;
    requiresPayment: boolean;
}

function ConfirmationForm({ packageDetails, requiresPayment }: ConfirmationFormProps) {
    const router = useRouter();
    const stripe = useStripe(); 
    const elements = useElements(); 
    const [isProcessing, setIsProcessing] = useState(false); 
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [isCompletingSetup, startTransition] = useTransition(); 
    
    const isUpgrade = packageDetails.monthly_cost > 0; 

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        setErrorMessage(null);
        setIsProcessing(true);

        let paymentSuccessful = false;

        if (requiresPayment) {
            if (!stripe || !elements) {
                console.error("Stripe Elements context not available. Payment cannot be processed.");
                setErrorMessage("Payment system failed to load. Please refresh and try again.");
                setIsProcessing(false);
                return;
            }
            
            console.log("Attempting to confirm Stripe payment...");
            const { error: submitError, paymentIntent } = await stripe.confirmPayment({
                elements,
                confirmParams: {
                    // return_url: `${window.location.origin}/order/complete`, 
                },
                 redirect: "if_required" 
            });

            if (submitError) {
                console.error("Stripe payment confirmation error:", submitError);
                setErrorMessage(submitError.message || "An unexpected payment error occurred.");
                setIsProcessing(false);
                return; 
            }
            
            if (paymentIntent?.status === 'succeeded') {
                console.log("Stripe payment successful!", paymentIntent);
                paymentSuccessful = true;
            } else {
                 console.warn("Stripe payment confirmation status:", paymentIntent?.status);
                 setErrorMessage(`Payment status: ${paymentIntent?.status ?? 'unknown'}. Please try again.`);
                 setIsProcessing(false);
                 return; 
            }
        } else {
            paymentSuccessful = true;
        }

        if (paymentSuccessful) {
             console.log("Payment successful or not required, proceeding with completeBenefitSetup...");
             setIsProcessing(false); 
             startTransition(async () => {
                try {
                     const completeResult = await completeBenefitSetup(); 
                    if (completeResult.success) {
                        console.log("Benefit setup marked complete. Redirecting...");
                        router.push('/dashboard'); 
                    } else {
                        setErrorMessage(completeResult.message || 'Failed to finalize setup after payment.');
                    }
                } catch (err) {
                     console.error("Error calling completeBenefitSetup:", err);
                     setErrorMessage("An error occurred while finalizing setup.");
                }
            });
        } else {
             setIsProcessing(false);
        }
    };

    const isLoading = isProcessing || isCompletingSetup; 

    return (
        <Container maxWidth="sm">
            <Box sx={{ my: 4 }}>
                <Paper component="form" onSubmit={handleSubmit} elevation={3} sx={{ p: 3, opacity: isLoading ? 0.7 : 1 }}>
                    <Typography variant="h4" component="h1" gutterBottom align="center">
                        Setup Confirmation
                    </Typography>
                    <Divider sx={{ my: 2 }} />

                     {errorMessage && (
                        <Alert severity="error" sx={{ mb: 2 }}>{errorMessage}</Alert>
                    )}

                    {/* Package Details Display */}
                    <Typography variant="h6" gutterBottom>
                        Your Selected Package:
                    </Typography>
                    <Typography variant="body1" gutterBottom>
                        <strong>{packageDetails.name}</strong>
                    </Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                        {packageDetails.description}
                    </Typography>
                    <Typography variant="h6" sx={{ mt: 1 }}>
                        Monthly Cost: ${packageDetails.monthly_cost}
                    </Typography>
                     {isUpgrade && (
                         <Typography variant="body2" color="primary.main" sx={{ mt: 1 }}>
                           This is an upgrade.
                         </Typography>
                    )}
                   
                    {/* Stripe Payment Element */} 
                    {requiresPayment && (
                        <Box sx={{ mt: 3 }}>
                            <Divider sx={{ my: 2 }} />
                            <Typography variant="h6" gutterBottom>
                                Payment Information
                            </Typography>
                            <PaymentElement id="payment-element" />
                        </Box>
                    )}

                    <Divider sx={{ my: 3 }} />

                    {/* Submit Button */} 
                    <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                        <Button 
                            type="submit"
                            variant="contained" 
                            disabled={isLoading || (requiresPayment && (!stripe || !elements))}
                            sx={{ py: 1.5, px: 5, textTransform: 'none' }}
                            startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : null}
                        >
                             {isLoading ? (isProcessing ? 'Processing Payment...' : 'Completing...') : (requiresPayment ? 'Confirm Payment & Complete' : 'Complete Setup')}
                        </Button>
                    </Box>
                </Paper>
            </Box>
        </Container>
    );
} 