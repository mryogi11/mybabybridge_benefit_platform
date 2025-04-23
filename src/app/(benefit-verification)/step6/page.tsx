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
    Alert,
    List,
    ListItem,
    ListItemText
} from '@mui/material';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { loadStripe, StripeElementsOptions } from '@stripe/stripe-js';

// Import benefit actions and context hook
import { completeBenefitSetup, getUserWithSelectedPackage } from '@/actions/benefitActions';
import { createPaymentIntent } from '@/actions/stripeActions';
import { useBenefitVerification } from '@/contexts/BenefitVerificationContext';

// Re-define locally the types expected from the modified getUserWithSelectedPackage action
interface SimplePackageDetails {
    id: string;
    name: string;
    monthly_cost: number;
    description: string | null;
    is_base_employer_package: boolean;
}

// --- Stripe Promise Loader --- 
const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
    ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
    : null; 

if (!stripePromise) {
    console.error("Stripe publishable key is missing. Payment functionality will be disabled.");
}

// --- Main Exported Component --- 
export default function ConfirmationScreen() {
    const router = useRouter();
    // Get benefitStatus from context
    const { benefitStatus } = useBenefitVerification(); 
    
    // State for fetched data
    const [selectedPackage, setSelectedPackage] = useState<SimplePackageDetails | null>(null);
    const [employerPackage, setEmployerPackage] = useState<SimplePackageDetails | null>(null);
    const [clientSecret, setClientSecret] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let isMounted = true;
        setIsLoading(true);
        setError(null);
        setClientSecret(null);
        setSelectedPackage(null);
        setEmployerPackage(null);

        const loadDataAndSetupPayment = async () => {
            console.log("[Step 6] useEffect running: Fetching user/package info...");

            try {
                const userResult = await getUserWithSelectedPackage();
                if (!isMounted) return;

                if (!userResult.success || !userResult.user) {
                    throw new Error(userResult.message || "Could not load user information.");
                }
                const fetchedUser = userResult.user;
                console.log("[Step 6] User/package info fetched (DB status=", fetchedUser.benefit_status, "):", fetchedUser);

                if (!fetchedUser.selected_package) {
                     throw new Error("No package selection found. Please go back and select a package.");
                }
                
                setSelectedPackage(fetchedUser.selected_package);
                setEmployerPackage(fetchedUser.employer_sponsored_package);

                if (fetchedUser.selected_package.monthly_cost > 0) {
                    console.log(`[Step 6] Selected package cost > 0 (${fetchedUser.selected_package.monthly_cost}), creating Payment Intent...`);
                    const intentResult = await createPaymentIntent({
                        amount: fetchedUser.selected_package.monthly_cost * 100, 
                        currency: 'usd', 
                        packageId: fetchedUser.selected_package.id
                    });
                    if (!isMounted) return;
                    if (intentResult.success && intentResult.clientSecret) {
                        console.log("[Step 6] Payment Intent created successfully.");
                        setClientSecret(intentResult.clientSecret);
                    } else {
                        throw new Error(intentResult.message || "Failed to initialize payment system.");
                    }
                } else {
                    console.log("[Step 6] Selected package has no cost ($0), skipping Payment Intent creation.");
                }
            } catch (err) {
                 if (isMounted) {
                     console.error("[Step 6] Error during data loading or payment setup:", err);
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

    }, []); 

    // --- Prepare Stripe Elements Options --- 
    const elementsOptions: StripeElementsOptions | undefined = clientSecret
        ? {
            clientSecret: clientSecret,
            appearance: { theme: 'stripe' }, // Or your custom theme
          }
        : undefined;

    // --- Render Logic: Loading State --- 
    if (isLoading) {
        return (
             <Container maxWidth="sm">
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
                    <CircularProgress /> <Typography sx={{ml: 2}}>Loading Confirmation...</Typography>
                </Box>
            </Container>
        );
    }
    
    // --- Render Logic: Error State or Missing Package --- 
    if (error || !selectedPackage) { 
         return (
            <Container maxWidth="sm">
                 <Box sx={{ my: 4, textAlign: 'center' }}>
                    <Alert severity="error" sx={{ mb: 2 }}>{error || "Failed to load selected package details."}</Alert>
                     <Button onClick={() => router.back()} variant="outlined" sx={{ mt: 2 }}>
                         Go Back
                     </Button>
                 </Box>
            </Container>
         );
    }

    // --- Render Logic: Main Content --- 
    const requiresPayment = selectedPackage.monthly_cost > 0;
    // Determine if the Stripe form should be shown
    const showPaymentForm = requiresPayment && elementsOptions && stripePromise;

    // Prepare props for the ConfirmationForm component
    const confirmationContent = (
        <ConfirmationForm 
            selectedPackage={selectedPackage} 
            employerPackage={employerPackage} // Pass employer package (can be null)
            benefitStatus={benefitStatus} // Pass the status from context
            requiresPayment={requiresPayment} // Pass whether payment is needed
        />
    );
    
    // Conditionally wrap with Stripe Elements provider
    if (showPaymentForm) {
        console.log("[Step 6] Rendering form WITH Stripe Elements provider.");
        return (
            <Elements options={elementsOptions} stripe={stripePromise}>
                {confirmationContent}
            </Elements>
        );
    } else {
        console.log("[Step 6] Rendering form WITHOUT Stripe Elements provider (no payment needed or Stripe unavailable).");
        return confirmationContent;
    }
}

// --- Internal Confirmation Form Component --- 
interface ConfirmationFormProps {
    selectedPackage: SimplePackageDetails; 
    employerPackage: SimplePackageDetails | null; 
    benefitStatus: string | null; // Use simple type now
    requiresPayment: boolean;
}

function ConfirmationForm({ 
    selectedPackage, 
    employerPackage, 
    benefitStatus, 
    requiresPayment 
}: ConfirmationFormProps) {
    const router = useRouter();
    const stripe = useStripe(); // Hook to get Stripe instance (null if Elements provider is missing)
    const elements = useElements(); // Hook to get Elements instance
    const [isProcessing, setIsProcessing] = useState(false); // For Stripe processing
    const [errorMessage, setErrorMessage] = useState<string | null>(null); // For displaying errors
    const [isCompletingSetup, startTransition] = useTransition(); // For final setup action transition

    // --- Determine Context for UI Text --- 
    const isVerified = benefitStatus === 'verified';
    const isSelectedPkgSponsored = isVerified && employerPackage?.id === selectedPackage.id;
    const isUpgrade = isVerified && !isSelectedPkgSponsored && requiresPayment;
    const isStandardPurchase = (benefitStatus === 'not_verified' || benefitStatus === 'not_applicable') && requiresPayment;

    // Define default texts
    let title = "Confirm Your Selection";
    let subtitle = "Review your chosen package details below.";
    let buttonText = "Complete Setup";

    // Adjust texts based on context
    if (isSelectedPkgSponsored) {
        title = "Confirm Your Employer Plan";
        subtitle = `You've selected the ${selectedPackage.name} plan provided by your employer at no additional cost.`;
        buttonText = "Start Using Your Benefit";
    } else if (isUpgrade) {
        title = "Confirm Your Upgrade";
        subtitle = `You are upgrading from your employer plan to the ${selectedPackage.name}. Please confirm payment details.`;
        buttonText = "Complete Upgrade & Pay";
    } else if (isStandardPurchase) {
        title = "Complete Your Purchase";
        subtitle = `Please review your selection and confirm payment to activate the ${selectedPackage.name} package.`;
        buttonText = "Complete Purchase & Pay";
    } else if (requiresPayment) {
         // Fallback for unexpected payment cases
         title = "Confirm Payment";
         subtitle = "Please confirm payment details to activate your package.";
         buttonText = "Confirm & Pay";
    } // If !requiresPayment and !isSelectedPkgSponsored (e.g., free standard package), defaults are fine

    // --- Handle Form Submission --- 
    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        setErrorMessage(null);

        // If payment is required, handle Stripe payment confirmation
        if (requiresPayment) {
            setIsProcessing(true); // Show Stripe processing state

            // Check if Stripe is loaded and available
            if (!stripe || !elements) {
                console.error("[Step 6] Stripe.js has not loaded yet or Elements provider missing.");
                setErrorMessage("Payment system failed to load. Please refresh and try again.");
                setIsProcessing(false);
                return;
            }
            
            console.log("[Step 6] Attempting to confirm Stripe payment...");
            // Confirm the payment with Stripe
            const { error: submitError, paymentIntent } = await stripe.confirmPayment({
                elements,
                confirmParams: { 
                    // No return_url needed when using redirect: "if_required"
                },
                 redirect: "if_required" // Handle result directly without redirecting user
            });

            // Handle payment confirmation result
            if (submitError) {
                console.error("[Step 6] Stripe payment confirmation error:", submitError);
                setErrorMessage(submitError.message || "An unexpected payment error occurred.");
                setIsProcessing(false); // Allow user to retry
                return; 
            }
            
            // Check PaymentIntent status after confirmation
            if (paymentIntent?.status === 'succeeded') {
                console.log("[Step 6] Stripe payment successful! PaymentIntent:", paymentIntent);
                 // Payment succeeded, now call the action to finalize setup
                 completeSetupAction(); 
            } else {
                 // Handle unexpected statuses (e.g., requires_action, processing)
                 console.warn("[Step 6] Stripe payment confirmation status unexpected:", paymentIntent?.status);
                 setErrorMessage(`Payment status: ${paymentIntent?.status ?? 'unknown'}. Please try again or contact support.`);
                 setIsProcessing(false); // Allow user to potentially retry or see status
                 return; 
            }
        } else {
            // No payment required, proceed directly to finalizing setup
            console.log("[Step 6] No payment required. Proceeding directly with completeBenefitSetup...");
             completeSetupAction();
        }
    };

    // --- Helper Function to Call Final Server Action --- 
    const completeSetupAction = () => {
         setIsProcessing(false); // Ensure Stripe processing indicator is off
         startTransition(async () => { // Use transition for the server action call
            try {
                 console.log("[Step 6] Calling completeBenefitSetup action...");
                 const completeResult = await completeBenefitSetup(); 
                if (completeResult.success) {
                    console.log("[Step 6] Benefit setup marked complete by server action. Redirecting to dashboard...");
                    // Redirect user to their dashboard upon successful completion
                    router.push('/dashboard'); 
                } else {
                    // Handle failure from the server action
                    console.error("[Step 6] completeBenefitSetup action returned failure:", completeResult.message);
                    setErrorMessage(completeResult.message || 'Failed to finalize your setup. Please contact support.');
                }
            } catch (err) {
                 // Handle unexpected errors during the server action call
                 console.error("[Step 6] Error calling completeBenefitSetup:", err);
                 setErrorMessage("An unexpected error occurred while finalizing your setup. Please contact support.");
            }
        });
    };

    // Combine loading states for the submit button
    const isLoading = isProcessing || isCompletingSetup; 

    // --- Render Form UI --- 
    return (
        <Container maxWidth="sm">
            <Box sx={{ my: 4 }}>
                <Paper component="form" onSubmit={handleSubmit} elevation={3} sx={{ p: { xs: 2, sm: 4 }, opacity: isLoading ? 0.7 : 1 }}> 
                    {/* Dynamic Title and Subtitle */}
                    <Typography variant="h4" component="h1" gutterBottom align="center">
                        {title}
                    </Typography>
                    <Typography variant="subtitle1" align="center" gutterBottom sx={{ mb: 3 }}>
                         {subtitle}
                    </Typography>

                     {/* Display Selected Package Details */}
                     <Typography variant="h6" gutterBottom>Your Selection:</Typography>
                     <Paper variant="outlined" sx={{ p: 2, mb: 3, bgcolor: 'action.selected' }}>
                        <List disablePadding dense>
                            <ListItem disableGutters>
                                <ListItemText primary="Package Name" secondary={selectedPackage.name} />
                            </ListItem>
                             <ListItem disableGutters>
                                <ListItemText primary="Monthly Cost" secondary={`$${selectedPackage.monthly_cost.toFixed(2)}`} />
                            </ListItem>
                             {selectedPackage.description && (
                                <ListItem disableGutters>
                                     <ListItemText primary="Description" secondary={selectedPackage.description} />
                                </ListItem>
                             )}
                         </List>
                     </Paper>

                    {/* Display Error Messages */}
                    {errorMessage && (
                        <Alert severity="error" sx={{ mb: 2 }}>{errorMessage}</Alert>
                    )}

                    {/* Conditionally render Stripe PaymentElement */}
                    {requiresPayment && (
                        <Box sx={{ my: 3 }}>
                            <Typography variant="h6" gutterBottom>Payment Information</Typography>
                            <Divider sx={{ mb: 2 }} />
                            <PaymentElement />
                            <Typography variant="caption" display="block" sx={{ mt: 1, textAlign: 'center', color: 'text.secondary' }}>
                                Secure payment processing by Stripe.
                            </Typography>
                        </Box>
                    )}

                    <Divider sx={{ my: 3 }} />

                    {/* Submit Button */}
                    <Box sx={{ mt: 3, textAlign: 'center' }}> 
                        <Button
                            type="submit"
                            variant="contained"
                            // Disable button while processing or if Stripe isn't ready for payment
                            disabled={isLoading || (requiresPayment && (!stripe || !elements))}
                            size="large"
                            sx={{ minWidth: '200px' }}
                        >
                            {/* Show loading indicator or dynamic button text */}
                            {isLoading ? <CircularProgress size={24} color="inherit" /> : buttonText}
                        </Button>
                    </Box>
                </Paper>
            </Box>
        </Container>
    );
} 