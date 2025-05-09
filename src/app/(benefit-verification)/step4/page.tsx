'use client';

import React, { useTransition, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
    Box,
    Typography,
    TextField,
    Button,
    Stepper,
    Step,
    StepLabel,
    Container,
    Link as MuiLink,
    CircularProgress,
    Alert
} from '@mui/material';
import { useBenefitVerification } from '@/contexts/BenefitVerificationContext';

// Zod schema for validation
const workEmailSchema = z.object({
    workEmail: z.string().email('Invalid email address').optional().or(z.literal('')), // Optional email
});

type WorkEmailFormData = z.infer<typeof workEmailSchema>;

// Keeping steps same as previous screen, assuming this is part of personal info verification step
const steps = ['Benefit Verification', 'Organization Search', 'Personal Information', 'Package Selection'];

export default function WorkEmailScreen() {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [error, setError] = React.useState<string | null>(null);
    const { sponsoringOrganizationId, personalInfo } = useBenefitVerification();
    const [isVerifyingStep, setIsVerifyingStep] = useState(true);
    
    // TODO: Get the verification attempt ID from the previous step (Step 3)
    // This might require passing it via state, context, or URL param
    const verificationAttemptId = 'placeholder_attempt_id'; // Example placeholder

    const {
        control,
        handleSubmit,
        formState: { errors },
        watch
    } = useForm<WorkEmailFormData>({
        resolver: zodResolver(workEmailSchema),
        mode: 'onChange',
        defaultValues: {
            workEmail: '',
        },
    });

    const workEmailValue = watch('workEmail'); // Watch the value for button logic

    // Check prerequisite data from context
    useEffect(() => {
        console.log('[Step 4] Checking prerequisite state...', { sponsoringOrganizationId, hasPersonalInfo: !!personalInfo });
        // Step 4 requires an organization ID from Step 2 and personal info from Step 3
        // Check for sponsoringOrganizationId (implicitly means Step 2 completed)
        // Check for personalInfo (or specific fields like firstName) to ensure Step 3 was completed
        if (!sponsoringOrganizationId || !personalInfo?.firstName) { // Example check
            console.log(`[Step 4] Prerequisite state missing (OrgID: ${!!sponsoringOrganizationId}, Info: ${!!personalInfo?.firstName}). Redirecting.`);
            // Redirect to Step 3 if info missing, Step 2 if org missing (though Step 3 check should catch that)
            router.replace(!sponsoringOrganizationId ? '/step2' : '/step3'); 
        } else {
            setIsVerifyingStep(false); // Prerequisites met
        }
    }, [sponsoringOrganizationId, personalInfo, router]);

    const onSubmit = (data: WorkEmailFormData) => {
        setError(null);
        console.log('Work Email (Optional):', data.workEmail);
        
        // Option 1: Call a new server action to update the attempt with the email
        /*
        startTransition(async () => {
            if (data.workEmail && verificationAttemptId !== 'placeholder_attempt_id') {
                // const result = await updateVerificationAttemptWithEmail(verificationAttemptId, data.workEmail);
                // if (!result.success) {
                //     setError(result.message || 'Failed to save work email.');
                //     return; // Stop navigation if save fails
                // }
            }
             // If email is empty or save is successful, proceed
            router.push('/step5');
        });
        */

        // Option 2 (Simpler for now): Assume previous step saved necessary info, 
        // and just navigate. Work email handling TBD.
         startTransition(() => {
            router.push('/step5'); 
         });
    };

    const handleNoWorkEmail = () => {
        setError(null);
        console.log("Skipping work email");
         startTransition(() => {
            router.push('/step5');
         });
    };

    // Show loading indicator while verifying step access
    if (isVerifyingStep) {
        return (
            <Container maxWidth="sm">
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
                    <CircularProgress />
                </Box>
            </Container>
        );
    }

    return (
        <Container maxWidth="sm">
            <Box sx={{ width: '100%', my: 4 }}>
                {/* Keeping activeStep at 2, as this is often part of personal info */}
                <Stepper activeStep={2} alternativeLabel sx={{ mb: 4 }}> 
                    {steps.map((label) => (
                        <Step key={label}>
                            <StepLabel>{label}</StepLabel>
                        </Step>
                    ))}
                </Stepper>

                <Typography variant="h4" component="h1" gutterBottom align="center">
                    Let's verify your information for free access
                </Typography>
                <Typography variant="subtitle1" gutterBottom align="center" sx={{ mb: 3 }}>
                    Please use the info that your sponsoring organization has on file
                </Typography>

                {error && (
                    <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
                )}

                <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate sx={{ mt: 1 }}>
                    <Controller
                        name="workEmail"
                        control={control}
                        render={({ field }) => (
                            <TextField
                                {...field}
                                fullWidth
                                id="workEmail"
                                label="Work Email (Optional)"
                                autoComplete="email"
                                error={!!errors.workEmail}
                                helperText={errors.workEmail?.message}
                                sx={{ mb: 2 }}
                                disabled={isPending || isVerifyingStep}
                            />
                        )}
                    />

                    <Box sx={{ textAlign: 'center', mb: 4 }}>
                        <MuiLink component="button" type="button" variant="body2" onClick={handleNoWorkEmail} disabled={isPending || isVerifyingStep} sx={{ cursor: 'pointer' }}>
                            I don't have a work email
                        </MuiLink>
                    </Box>

                    <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                        <Button
                            type="submit"
                            variant="contained"
                            disabled={isPending || isVerifyingStep}
                            sx={{ 
                                bgcolor: '#e0f2f1', 
                                color: '#004d40',
                                '&:hover': { bgcolor: '#b2dfdb' },
                                py: 1.5, 
                                px: 5,
                                textTransform: 'none'
                            }}
                            startIcon={isPending ? <CircularProgress size={20} color="inherit" /> : null}
                        >
                            {isPending ? 'Proceeding...' : 'Next'}
                        </Button>
                    </Box>
                </Box>
            </Box>
        </Container>
    );
} 