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

import { submitVerificationInfo, updateBasicProfile } from '@/actions/benefitActions';
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
    const { sponsoringOrganizationId, setBenefitStatus, benefitSource } = useBenefitVerification();
    const [error, setError] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();
    const [isVerifyingStep, setIsVerifyingStep] = useState(!benefitSource);
    
    // Determine if this is the employer verification path
    const isEmployerVerificationPath = benefitSource === 'employer_or_plan';

    // UseEffect for prerequisite check - modified logic
    useEffect(() => {
        console.log('[Step 3] Checking prerequisite state...', { sponsoringOrganizationId, benefitSource });
        
        // If the source hasn't loaded yet, wait.
        if (!benefitSource) {
            console.log('[Step 3] Benefit source not yet loaded. Waiting...');
            setIsVerifyingStep(true);
            return; 
        }

        // Only redirect if it's the employer path AND the org ID is missing
        if (isEmployerVerificationPath && !sponsoringOrganizationId) {
            console.log(`[Step 3] Employer path selected but Sponsoring Organization ID missing. Redirecting to Step 2.`);
            router.replace('/step2'); 
        } else {
            // For non-employer path OR employer path with org ID present, allow rendering
            console.log('[Step 3] Prerequisite check passed or not required for this path.');
            setIsVerifyingStep(false); 
        }
    }, [benefitSource, sponsoringOrganizationId, router, isEmployerVerificationPath]); // Add benefitSource and isEmployerVerificationPath to dependencies

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
            dobDay: '' as any, // Use empty string as default, cast as any to bypass initial type mismatch if necessary
            dobYear: '' as any, // Use empty string as default
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

    // Modified onSubmit logic
    const onSubmit = (data: PersonalInfoFormData) => {
        setError(null);

        if (isEmployerVerificationPath) {
            // --- Employer Verification Path (using submitVerificationInfo) ---
             if (!sponsoringOrganizationId) {
                 setError("Cannot submit verification without a selected organization.");
                 console.error("[Step 3] Employer path: Attempted submission without org ID.");
                 return; 
            }
            startTransition(async () => {
                const dateOfBirth = `${data.dobYear}-${data.dobMonth}-${String(data.dobDay).padStart(2, '0')}`;
                const fullPhoneNumber = `${data.countryCode}${data.phoneNumber.replace(/\D/g, '')}`;
                // Prepare full data for verification 
                const verificationData = {
                    sponsoringOrganizationId: sponsoringOrganizationId, // Required for verification
                    firstName: data.firstName,
                    lastName: data.lastName,
                    dateOfBirth: dateOfBirth, 
                    phoneNumber: fullPhoneNumber,
                    workEmail: data.workEmail || '', // Required for verification schema
                    addressLine1: data.addressLine1,
                    addressLine2: data.addressLine2,
                    addressCity: data.addressCity,
                    addressState: data.addressState,
                    addressPostalCode: data.addressPostalCode,
                    addressCountry: data.addressCountry,
                };
                console.log("[Step 3] Employer path: Calling submitVerificationInfo with:", verificationData);
                const result = await submitVerificationInfo(verificationData);
                if (result.success) {
                    // Update context with the status from the verification result
                    setBenefitStatus(result.verificationStatus || 'declined'); 
                    console.log("Verification action successful (", result.verificationStatus,"). Navigating to Step 5.");
                    router.push('/step5'); 
                } else {
                    setError(result.message || 'Failed to submit verification information.');
                    setBenefitStatus('declined'); 
                    console.error("[Step 3] Verification submission failed:", result.message);
                }
            });

        } else {
            // --- Non-Employer Path (using updateBasicProfile) ---
            console.log("[Step 3] Non-employer path selected. Updating basic profile info...");
            
            startTransition(async () => {
                 // Prepare data matching BasicProfileSchema (name and address only)
                 const profileData = {
                    firstName: data.firstName,
                    lastName: data.lastName,
                    // DOB and Phone are not in BasicProfileSchema, not sent
                    addressLine1: data.addressLine1,
                    addressLine2: data.addressLine2,
                    addressCity: data.addressCity,
                    addressState: data.addressState,
                    addressPostalCode: data.addressPostalCode,
                    addressCountry: data.addressCountry,
                 };

                 console.log("[Step 3] Non-employer path: Calling updateBasicProfile with:", profileData);
                 const result = await updateBasicProfile(profileData);

                 if (result.success) {
                     console.log("[Step 3] Basic profile update successful. Navigating to Step 5.");
                     // DO NOT update benefitStatus in context here
                     // setBenefitStatus(...);
                     router.push('/step5');
                 } else {
                      console.error("[Step 3] updateBasicProfile failed:", result.message);
                      setError(result.message || "Failed to save profile information.");
                 }
             });
        }
    };

    // Show loading indicator while verifying step access OR if benefitSource isn't loaded
    if (isVerifyingStep) {
        return (
            <Container maxWidth="sm">
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
                    <CircularProgress />
                    <Typography sx={{ ml: 2 }}>Loading step...</Typography> 
                </Box>
            </Container>
        );
    }

    // Determine stepper active step
    const activeStep = isEmployerVerificationPath ? 2 : 1; // Step 3 (index 2) for employer, Step 2 (index 1) visually for others as they skip Org Search

    // Dynamic Titles/Subtitles
    const title = isEmployerVerificationPath 
        ? "Let's verify your information for benefit eligibility" 
        : "Please provide your personal information";
    const subtitle = isEmployerVerificationPath 
        ? "Please use the information your organization has on file"
        : "We need some basic details to proceed.";


    // Original return logic with conditional elements
    return (
        <Container maxWidth="sm">
            <Box sx={{ width: '100%', my: 4 }}>
                {/* Update activeStep dynamically */}
                <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 4 }}>
                    {steps.map((label, index) => {
                        // Optionally style the skipped step differently
                        const stepProps: { completed?: boolean } = {};
                        const labelProps: { optional?: React.ReactNode } = {};
                        // If not employer path and this is the Org Search step (index 1)
                        if (!isEmployerVerificationPath && index === 1) {
                             labelProps.optional = (
                                <Typography variant="caption" color="text.secondary">Skipped</Typography>
                             );
                             // Decide if you want to mark it completed or keep it pending
                             // stepProps.completed = true; // Or false depending on desired look
                        }
                         // Mark steps before active as completed
                        if (index < activeStep) {
                             stepProps.completed = true;
                        }

                        return (
                            <Step key={label} {...stepProps}>
                                <StepLabel {...labelProps}>{label}</StepLabel>
                            </Step>
                        );
                    })}
                </Stepper>

                {/* Use dynamic title and subtitle */}
                <Typography variant="h4" component="h1" gutterBottom align="center">
                    {title}
                </Typography>
                <Typography variant="subtitle1" gutterBottom align="center" sx={{ mb: 3 }}>
                    {subtitle}
                </Typography>

                {error && (
                    <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
                )}

                {/* Form remains largely the same */}
                <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate sx={{ mt: 1 }}>
                    <Grid container spacing={2}>
                        {/* --- First Name --- */}
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
                                        disabled={isPending} // Removed isVerifyingStep here as form is rendered only after check
                                    />
                                )}
                            />
                        </Grid>
                        {/* --- Last Name --- */}
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
                                        disabled={isPending}
                                    />
                                )}
                            />
                        </Grid>
                        
                        {/* --- Date of Birth Fields --- */}
                        <Grid item xs={12}>
                             <Typography variant="subtitle2" gutterBottom>Date of Birth</Typography>
                        </Grid>
                         <Grid item xs={5} > {/* Adjusted grid size slightly */}
                             <Controller
                                name="dobMonth"
                                control={control}
                                render={({ field }) => (
                                    <FormControl fullWidth error={!!errors.dobMonth} disabled={isPending}>
                                        <InputLabel id="dob-month-label">Month</InputLabel>
                                        <Select
                                            {...field}
                                            labelId="dob-month-label"
                                            id="dobMonth"
                                            label="Month"
                                            required // Mark Select as required
                                        >
                                            <MenuItem value="" disabled><em>Month</em></MenuItem>
                                            {months.map((month) => (
                                                <MenuItem key={month.value} value={month.value}>
                                                    {month.label}
                                                </MenuItem>
                                            ))}
                                        </Select>
                                        {errors.dobMonth && <Typography color="error" variant="caption">{errors.dobMonth.message}</Typography>}
                                    </FormControl>
                                )}/>
                        </Grid>
                         <Grid item xs={3} > {/* Adjusted grid size slightly */}
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
                                        inputProps={{ min: 1, max: 31 }}
                                        error={!!errors.dobDay}
                                        helperText={errors.dobDay?.message}
                                        disabled={isPending}
                                    />
                                )}
                             />
                        </Grid>
                         <Grid item xs={4} > {/* Adjusted grid size slightly */}
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
                                        inputProps={{ min: 1900, max: new Date().getFullYear() }}
                                        error={!!errors.dobYear}
                                        helperText={errors.dobYear?.message}
                                        disabled={isPending}
                                    />
                                )}
                            />
                        </Grid>

                        {/* --- Phone Number --- */}
                         <Grid item xs={12}>
                             <Typography variant="subtitle2" gutterBottom sx={{ mt: 1 }}>Phone Number</Typography>
                        </Grid>
                        <Grid item xs={4} sm={3}>
                             <Controller
                                name="countryCode"
                                control={control}
                                render={({ field }) => (
                                     <FormControl fullWidth error={!!errors.countryCode} disabled={isPending}>
                                        <InputLabel id="country-code-label">Code</InputLabel>
                                        <Select
                                            {...field}
                                            labelId="country-code-label"
                                            id="countryCode"
                                            label="Code"
                                            required
                                        >
                                             {countryCodes.map((code) => (
                                                <MenuItem key={code.value} value={code.value}>
                                                    {code.label}
                                                </MenuItem>
                                            ))}
                                        </Select>
                                         {errors.countryCode && <Typography color="error" variant="caption">{errors.countryCode.message}</Typography>}
                                    </FormControl>
                                )}/>
                        </Grid>
                         <Grid item xs={8} sm={9}>
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
                                        disabled={isPending}
                                    />
                                )}
                            />
                        </Grid>

                         {/* --- Work Email (Optional) --- */}
                         {isEmployerVerificationPath && (
                             <Grid item xs={12}>
                                 <Typography variant="subtitle2" gutterBottom sx={{ mt: 1 }}>Work Email (Optional)</Typography>
                                 <Controller
                                    name="workEmail"
                                    control={control}
                                    render={({ field }) => (
                                        <TextField
                                            {...field}
                                            fullWidth
                                            id="workEmail"
                                            label="Work Email Address"
                                            autoComplete="email"
                                            error={!!errors.workEmail}
                                            helperText={errors.workEmail?.message || "Used only if required by your benefit provider."}
                                            disabled={isPending}
                                        />
                                    )}
                                />
                            </Grid>
                         )}

                        {/* --- Address Fields --- */}
                         <Grid item xs={12}>
                             <Typography variant="subtitle2" gutterBottom sx={{ mt: 1 }}>Home Address</Typography>
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
                                        disabled={isPending}
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
                                        error={!!errors.addressLine2} // Optional field might not have errors unless specific validation added
                                        helperText={errors.addressLine2?.message}
                                        disabled={isPending}
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
                                        disabled={isPending}
                                    />
                                )}
                            />
                        </Grid>
                         <Grid item xs={12} sm={6}>
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
                                        disabled={isPending}
                                    />
                                )}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <Controller
                                name="addressPostalCode"
                                control={control}
                                render={({ field }) => (
                                    <TextField
                                        {...field}
                                        required
                                        fullWidth
                                        id="addressPostalCode"
                                        label="ZIP / Postal Code"
                                        autoComplete="postal-code"
                                        error={!!errors.addressPostalCode}
                                        helperText={errors.addressPostalCode?.message}
                                        disabled={isPending}
                                    />
                                )}
                            />
                        </Grid>
                         <Grid item xs={12} sm={6}>
                             <Controller
                                name="addressCountry"
                                control={control}
                                render={({ field }) => (
                                    // Consider using a Select for Country if list is predefined
                                     <TextField
                                        {...field}
                                        required
                                        fullWidth
                                        id="addressCountry"
                                        label="Country"
                                        autoComplete="country-name" // Or country for code
                                        error={!!errors.addressCountry}
                                        helperText={errors.addressCountry?.message}
                                        disabled={isPending}
                                     />
                                     // Example using Select (would need countries list)
                                     /* <FormControl fullWidth error={!!errors.addressCountry} disabled={isPending}>
                                         <InputLabel id="country-label">Country</InputLabel>
                                         <Select {...field} labelId="country-label" id="addressCountry" label="Country" required>
                                             <MenuItem value="US">United States</MenuItem>
                                             <MenuItem value="CA">Canada</MenuItem>
                                             {/* ... more countries * /}
                                         </Select>
                                         {errors.addressCountry && <Typography color="error" variant="caption">{errors.addressCountry.message}</Typography>}
                                     </FormControl> */
                                )}/>
                        </Grid>
                    </Grid>

                    {/* Submit Button */}
                    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                        <Button
                            type="submit"
                            variant="contained"
                            disabled={!isValid || isPending || isVerifyingStep} // Disable if form invalid or processing
                            sx={{
                                bgcolor: '#e0f2f1', // Light mint color 
                                color: '#004d40', // Darker text
                                '&:hover': { bgcolor: '#b2dfdb' },
                                py: 1.5, px: 5, textTransform: 'none'
                            }}
                             startIcon={isPending ? <CircularProgress size={20} color="inherit" /> : null}
                        >
                            {isPending ? 'Submitting...' : 'Continue'}
                        </Button>
                    </Box>
                </Box>
            </Box>
        </Container>
    );
} 