'use client';

import React, { useState, useTransition, useEffect } from 'react';
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
    Grid,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    CircularProgress,
    Alert
} from '@mui/material';

import { submitVerificationInfo } from '@/actions/benefitActions';
import { useBenefitVerification } from '@/contexts/BenefitVerificationContext';

// Zod schema for validation
const personalInfoSchema = z.object({
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    dobMonth: z.string().min(1, 'Month is required'),
    dobDay: z.string().regex(/^\d{1,2}$/, 'Invalid day').transform(Number).refine(v => v >= 1 && v <= 31, 'Invalid day'),
    dobYear: z.string().regex(/^\d{4}$/, 'Invalid year').transform(Number).refine(v => v >= 1900 && v <= new Date().getFullYear(), 'Invalid year'),
    // Basic phone validation - could be enhanced
    countryCode: z.string().min(1, 'Country code required'), 
    phoneNumber: z.string().min(5, 'Phone number is required').regex(/^[\d\s\-\(\)]+$/, 'Invalid phone number'),
    // Add workEmail - optional, but must be valid email if provided
    workEmail: z.string().email('Invalid email address').optional().or(z.literal('')),
    // Add address fields
    addressLine1: z.string().min(3, 'Street address is required'),
    addressLine2: z.string().optional(), // Optional field
    addressCity: z.string().min(2, 'City is required'),
    addressState: z.string().min(2, 'State / Province is required'), // State/Province
    addressPostalCode: z.string().min(3, 'Postal code is required'), // Zip/Postal Code
    addressCountry: z.string().min(2, 'Country is required'), // E.g., 'US', 'CA'
});

type PersonalInfoFormData = z.infer<typeof personalInfoSchema>;

const steps = ['Benefit Verification', 'Organization Search', 'Personal Information', 'Package Selection'];
const months = [
    { value: '01', label: 'January' }, { value: '02', label: 'February' }, { value: '03', label: 'March' },
    { value: '04', label: 'April' }, { value: '05', label: 'May' }, { value: '06', label: 'June' },
    { value: '07', label: 'July' }, { value: '08', label: 'August' }, { value: '09', label: 'September' },
    { value: '10', label: 'October' }, { value: '11', label: 'November' }, { value: '12', label: 'December' },
];
// TODO: Add more comprehensive country code list
const countryCodes = [{ value: '+1', label: '+1 (USA/CAN)' }, { value: '+44', label: '+44 (UK)' }];

export default function PersonalInfoScreen() {
    const router = useRouter();
    const { sponsoringOrganizationId, setBenefitStatus } = useBenefitVerification();
    const [error, setError] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();
    const [isVerifyingStep, setIsVerifyingStep] = useState(true); // Loading state
    
    // Check if orgId is available from context - Moved check to useEffect
    // const isOrgIdMissing = !sponsoringOrganizationId;

    // UseEffect for prerequisite check
    useEffect(() => {
        console.log('[Step 3] Checking prerequisite state...', { sponsoringOrganizationId });
        // User should only be here if they selected an organization in Step 2
        if (!sponsoringOrganizationId) {
            console.log(`[Step 3] Sponsoring Organization ID missing. Redirecting to Step 2.`);
            router.replace('/step2'); // Redirect if org ID is missing
        } else {
            setIsVerifyingStep(false); // Prerequisite met
        }
    }, [sponsoringOrganizationId, router]);

    const {
        control,
        handleSubmit,
        formState: { errors, isValid },
    } = useForm<PersonalInfoFormData>({
        resolver: zodResolver(personalInfoSchema),
        mode: 'onChange', // Validate on change for better UX
        defaultValues: {
            firstName: '',
            lastName: '',
            dobMonth: '',
            dobDay: undefined,
            dobYear: undefined,
            countryCode: '+1', // Default to +1
            phoneNumber: '',
            workEmail: '', // Add default value
            // Add address defaults
            addressLine1: '',
            addressLine2: '',
            addressCity: '',
            addressState: '',
            addressPostalCode: '',
            addressCountry: 'US', // Default to US
        },
    });

    const onSubmit = (data: PersonalInfoFormData) => {
        // Remove check here, handled by useEffect
        // if (isOrgIdMissing) { ... }
        
        // Ensure orgId is available before proceeding (belt-and-suspenders)
        if (!sponsoringOrganizationId) {
             setError("Cannot submit without a selected organization.");
             return;
        }

        setError(null);
        startTransition(async () => {
            // Construct full DOB and phone
            const dateOfBirth = `${data.dobYear}-${data.dobMonth}-${String(data.dobDay).padStart(2, '0')}`;
            const fullPhoneNumber = `${data.countryCode}${data.phoneNumber.replace(/\D/g, '')}`; // Clean phone number

            // Prepare data for server action (includes address fields now)
            const verificationData = {
                sponsoringOrganizationId: sponsoringOrganizationId, // Use context value
                // Pass all form data including name and address
                ...data,
                // Overwrite specific fields that need formatting
                dateOfBirth: dateOfBirth,
                phoneNumber: fullPhoneNumber,
                workEmail: data.workEmail || '' // Ensure workEmail is empty string if not provided
            };

            // Call server action
            const result = await submitVerificationInfo(verificationData);

            if (result.success) {
                // Update context with the final status from the action
                setBenefitStatus(result.verificationStatus || 'declined'); 
                console.log("Verification action successful (", result.verificationStatus,"). Navigating to package options (Step 5).");
                // Always navigate to Step 5 - it will display content based on the status set in context
                router.push('/step5'); 
            } else {
                // Action itself failed (e.g., database error)
                setError(result.message || 'Failed to submit verification information.');
                setBenefitStatus('declined'); // Set status to declined on error
            }
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

    // Original return logic
    return (
        <Container maxWidth="sm">
            <Box sx={{ width: '100%', my: 4 }}>
                <Stepper activeStep={2} alternativeLabel sx={{ mb: 4 }}>
                    {steps.map((label) => (
                        <Step key={label}>
                            <StepLabel>{label}</StepLabel>
                        </Step>
                    ))}
                </Stepper>

                <Typography variant="h4" component="h1" gutterBottom align="center">
                    Let's verify your information for benefit eligibility
                </Typography>
                <Typography variant="subtitle1" gutterBottom align="center" sx={{ mb: 3 }}>
                    Please use the information your organization has on file
                </Typography>

                {error && (
                    <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
                )}

                {/* Warning if somehow rendered without orgId - maybe remove if useEffect handles it robustly */}
                {/*!sponsoringOrganizationId && !isVerifyingStep && (
                     <Alert severity="warning" sx={{ mb: 2 }}>Could not determine sponsoring organization. Please go back to Step 2.</Alert>
                )*/}

                <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate sx={{ mt: 1 }}>
                    <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                            <Controller
                                name="firstName"
                                control={control}
                                render={({ field }) => (
                                    <TextField
                                        {...field}
                                        required
                                        fullWidth
                                        id="firstName"
                                        label="First Name"
                                        autoComplete="given-name"
                                        error={!!errors.firstName}
                                        helperText={errors.firstName?.message}
                                        disabled={isPending || isVerifyingStep}
                                    />
                                )}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <Controller
                                name="lastName"
                                control={control}
                                render={({ field }) => (
                                    <TextField
                                        {...field}
                                        required
                                        fullWidth
                                        id="lastName"
                                        label="Last Name"
                                        autoComplete="family-name"
                                        error={!!errors.lastName}
                                        helperText={errors.lastName?.message}
                                        disabled={isPending || isVerifyingStep}
                                    />
                                )}
                            />
                        </Grid>
                        
                        {/* Date of Birth Fields */}
                        <Grid item xs={12}>
                             <Typography variant="subtitle2" gutterBottom>Date of Birth</Typography>
                        </Grid>
                         <Grid item xs={5} >
                             <Controller
                                name="dobMonth"
                                control={control}
                                render={({ field }) => (
                                    <FormControl fullWidth error={!!errors.dobMonth} disabled={isPending || isVerifyingStep}>
                                        <InputLabel id="dob-month-label">Month</InputLabel>
                                        <Select
                                            {...field}
                                            labelId="dob-month-label"
                                            id="dobMonth"
                                            label="Month"
                                        >
                                            {months.map((month) => (
                                                <MenuItem key={month.value} value={month.value}>{month.label}</MenuItem>
                                            ))}
                                        </Select>
                                        {errors.dobMonth && <Typography color="error" variant="caption">{errors.dobMonth.message}</Typography>}
                                    </FormControl>
                                )}
                             />
                        </Grid>
                         <Grid item xs={3}>
                             <Controller
                                name="dobDay"
                                control={control}
                                render={({ field }) => (
                                    <TextField
                                        {...field}
                                        required
                                        fullWidth
                                        id="dobDay"
                                        label="Day"
                                        type="number" 
                                        inputProps={{ maxLength: 2 }}
                                        error={!!errors.dobDay}
                                        helperText={errors.dobDay?.message}
                                        disabled={isPending || isVerifyingStep}
                                    />
                                )}
                             />
                        </Grid>
                        <Grid item xs={4}>
                            <Controller
                                name="dobYear"
                                control={control}
                                render={({ field }) => (
                                    <TextField
                                        {...field}
                                        required
                                        fullWidth
                                        id="dobYear"
                                        label="Year"
                                        type="number"
                                        inputProps={{ maxLength: 4 }}
                                        error={!!errors.dobYear}
                                        helperText={errors.dobYear?.message}
                                        disabled={isPending || isVerifyingStep}
                                    />
                                )}
                            />
                        </Grid>

                        {/* Phone Number Fields */}
                         <Grid item xs={12}>
                             <Typography variant="subtitle2" gutterBottom sx={{ mt: 1 }}>Phone Number</Typography>
                        </Grid>
                         <Grid item xs={4}>
                             <Controller
                                name="countryCode"
                                control={control}
                                render={({ field }) => (
                                    <FormControl fullWidth error={!!errors.countryCode} disabled={isPending || isVerifyingStep}>
                                        <InputLabel id="country-code-label">Code</InputLabel>
                                        <Select
                                            {...field}
                                            labelId="country-code-label"
                                            id="countryCode"
                                            label="Code"
                                        >
                                            {countryCodes.map((code) => (
                                                <MenuItem key={code.value} value={code.value}>{code.label}</MenuItem>
                                            ))}
                                        </Select>
                                         {errors.countryCode && <Typography color="error" variant="caption">{errors.countryCode.message}</Typography>}
                                    </FormControl>
                                )}
                            />
                        </Grid>
                         <Grid item xs={8}>
                             <Controller
                                name="phoneNumber"
                                control={control}
                                render={({ field }) => (
                                    <TextField
                                        {...field}
                                        required
                                        fullWidth
                                        id="phoneNumber"
                                        label="Phone Number"
                                        autoComplete="tel-national"
                                        error={!!errors.phoneNumber}
                                        helperText={errors.phoneNumber?.message}
                                        disabled={isPending || isVerifyingStep}
                                    />
                                )}
                            />
                        </Grid>

                        {/* Add Work Email Field */}
                        <Grid item xs={12}>
                             <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>Work Email (Optional)</Typography>
                            <Controller
                                name="workEmail"
                                control={control}
                                render={({ field }) => (
                                    <TextField
                                        {...field}
                                        fullWidth
                                        id="workEmail"
                                        label="Work Email Address"
                                        type="email"
                                        autoComplete="email"
                                        error={!!errors.workEmail}
                                        helperText={errors.workEmail?.message || "Used for verification with some employers."}
                                        disabled={isPending || isVerifyingStep}
                                    />
                                )}
                            />
                            {/* TODO: Add "I don't have a work email" functionality if needed */}
                        </Grid>

                        {/* Address Fields */}
                        <Grid item xs={12}>
                            <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>Address</Typography>
                        </Grid>
                        <Grid item xs={12}>
                            <Controller
                                name="addressLine1"
                                control={control}
                                render={({ field }) => (
                                    <TextField
                                        {...field}
                                        required
                                        fullWidth
                                        id="addressLine1"
                                        label="Street Address"
                                        autoComplete="address-line1"
                                        error={!!errors.addressLine1}
                                        helperText={errors.addressLine1?.message}
                                        disabled={isPending || isVerifyingStep}
                                    />
                                )}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <Controller
                                name="addressLine2"
                                control={control}
                                render={({ field }) => (
                                    <TextField
                                        {...field}
                                        fullWidth
                                        id="addressLine2"
                                        label="Apartment, suite, etc. (Optional)"
                                        autoComplete="address-line2"
                                        error={!!errors.addressLine2}
                                        helperText={errors.addressLine2?.message}
                                        disabled={isPending || isVerifyingStep}
                                    />
                                )}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <Controller
                                name="addressCity"
                                control={control}
                                render={({ field }) => (
                                    <TextField
                                        {...field}
                                        required
                                        fullWidth
                                        id="addressCity"
                                        label="City"
                                        autoComplete="address-level2"
                                        error={!!errors.addressCity}
                                        helperText={errors.addressCity?.message}
                                        disabled={isPending || isVerifyingStep}
                                    />
                                )}
                            />
                        </Grid>
                        <Grid item xs={6} sm={3}>
                            <Controller
                                name="addressState"
                                control={control}
                                render={({ field }) => (
                                    <TextField
                                        {...field}
                                        required
                                        fullWidth
                                        id="addressState"
                                        label="State / Province"
                                        autoComplete="address-level1"
                                        error={!!errors.addressState}
                                        helperText={errors.addressState?.message}
                                        disabled={isPending || isVerifyingStep}
                                    />
                                )}
                            />
                        </Grid>
                        <Grid item xs={6} sm={3}>
                            <Controller
                                name="addressPostalCode"
                                control={control}
                                render={({ field }) => (
                                    <TextField
                                        {...field}
                                        required
                                        fullWidth
                                        id="addressPostalCode"
                                        label="Postal Code"
                                        autoComplete="postal-code"
                                        error={!!errors.addressPostalCode}
                                        helperText={errors.addressPostalCode?.message}
                                        disabled={isPending || isVerifyingStep}
                                    />
                                )}
                            />
                        </Grid>
                         <Grid item xs={12}>
                            <Controller
                                name="addressCountry"
                                control={control}
                                render={({ field }) => (
                                    // TODO: Consider replacing with a Select dropdown for countries
                                    <TextField
                                        {...field}
                                        required
                                        fullWidth
                                        id="addressCountry"
                                        label="Country"
                                        autoComplete="country"
                                        error={!!errors.addressCountry}
                                        helperText={errors.addressCountry?.message}
                                        disabled={isPending || isVerifyingStep}
                                    />
                                )}
                            />
                        </Grid>
                    </Grid>

                    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                        <Button
                            type="submit"
                            fullWidth
                            variant="contained"
                            sx={{ mt: 3, mb: 2, bgcolor: '#e0f2f1', color: '#004d40', '&:hover': { bgcolor: '#b2dfdb' } }}
                            disabled={isPending || !isValid || isVerifyingStep} // Disable if verifying step
                        >
                            {isPending ? <CircularProgress size={24} color="inherit" /> : 'Continue'}
                        </Button>
                    </Box>
                </Box>
            </Box>
        </Container>
    );
} 