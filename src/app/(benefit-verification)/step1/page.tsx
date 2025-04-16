'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation'; // Use next/navigation for App Router
import { 
    Box, 
    Typography, 
    Radio, 
    RadioGroup, 
    FormControlLabel, 
    FormControl, 
    Button, 
    Stepper, 
    Step, 
    StepLabel,
    Container,
    CircularProgress, // Added for loading
    Alert // Added for errors
} from '@mui/material';

import { updateBenefitSource } from '@/actions/benefitActions'; // Import the action
import { useBenefitVerification } from '@/contexts/BenefitVerificationContext'; // Import the hook

const steps = ['Benefit Verification', 'Organization Search', 'Personal Information', 'Package Selection']; // Simplified steps for progress

export default function BenefitSourceScreen() {
    // Use context state instead of local state for benefitSource
    const { benefitSource, setBenefitSource } = useBenefitVerification(); 
    const [localBenefitSource, setLocalBenefitSource] = useState(benefitSource || ''); // Keep local state for radio group control
    const [error, setError] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition(); // For loading state
    const router = useRouter();

    // Update local state and context when radio changes
    const handleBenefitSourceChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const value = (event.target as HTMLInputElement).value;
        setLocalBenefitSource(value);
        setBenefitSource(value); // Update context
        setError(null); 
    };

    const handleContinue = () => {
        // Use benefitSource from context now
        if (!benefitSource) return;
        
        setError(null);
        startTransition(async () => {
            const formData = new FormData();
            formData.append('benefitSource', benefitSource);

            const result = await updateBenefitSource(formData);

            if (result.success) {
                // Navigate based on the original selection
                if (benefitSource === 'employer_or_plan') {
                    router.push('/step2'); 
                } else if (benefitSource === 'partner_or_parent') {
                    // TODO: Navigate to partner/parent flow
                    console.log("Partner/Parent flow TBD - Navigating to placeholder");
                    router.push('/step5'); // Temp: Go to packages for now 
                } else { // none
                    // TODO: Navigate to standard package purchase/info (no verification needed)
                    console.log("None of the above flow TBD - Navigating to placeholder");
                    router.push('/step5'); // Temp: Go to packages for now
                }
            } else {
                setError(result.message || 'Failed to update benefit source.');
            }
        });
    };

    return (
        <Container maxWidth="sm"> 
            <Box sx={{ width: '100%', my: 4 }}>
                 {/* Simple Progress Indicator - Can be replaced with a dedicated component */}
                <Stepper activeStep={0} alternativeLabel sx={{ mb: 4 }}>
                    {steps.map((label) => (
                        <Step key={label}>
                        <StepLabel>{label}</StepLabel>
                        </Step>
                    ))}
                </Stepper>

                <Typography variant="h4" component="h1" gutterBottom align="center">
                    Who provides your fertility benefit?
                </Typography>
                <Typography variant="subtitle1" gutterBottom align="center" sx={{ mb: 3 }}>
                    (It's usually an employer or health plan)
                </Typography>

                {error && (
                    <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
                )}

                <FormControl component="fieldset" sx={{ width: '100%' }}>
                    <RadioGroup
                        aria-label="benefit-source"
                        name="benefitSource"
                        value={localBenefitSource} // Use local state for controlled component
                        onChange={handleBenefitSourceChange}
                        sx={{ gap: 1 }} // Add some spacing between radio buttons
                    >
                        <FormControlLabel 
                            value="employer_or_plan" 
                            control={<Radio />} 
                            label="My employer or health plan" 
                            sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1.5 }}
                        />
                        <FormControlLabel 
                            value="partner_or_parent" 
                            control={<Radio />} 
                            label="A partner, parent, or someone else" 
                             sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1.5 }}
                        />
                        <FormControlLabel 
                            value="none" 
                            control={<Radio />} 
                            label="None of the above" 
                             sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1.5 }}
                        />
                    </RadioGroup>
                </FormControl>

                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                    <Button 
                        variant="contained" 
                        onClick={handleContinue}
                        disabled={!benefitSource || isPending} 
                        sx={{ 
                            bgcolor: '#e0f2f1', // Light mint color (adjust as needed based on theme)
                            color: '#004d40', // Darker text for contrast (adjust)
                            '&:hover': {
                                bgcolor: '#b2dfdb' // Slightly darker mint on hover
                            },
                            py: 1.5, 
                            px: 5,
                            textTransform: 'none'
                        }}
                        startIcon={isPending ? <CircularProgress size={20} color="inherit" /> : null} // Show loader
                    >
                        {isPending ? 'Saving...' : 'Continue'}
                    </Button>
                </Box>
            </Box>
        </Container>
    );
} 