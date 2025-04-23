'use client';

import React, { useState, useTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
    Box, 
    Typography, 
    Button, 
    Stepper, 
    Step, 
    StepLabel,
    Container,
    Grid,
    Card,
    CardContent,
    CardActions,
    CircularProgress,
    Alert
} from '@mui/material';

import { updateSelectedPackage, getBenefitPackages } from '@/actions/benefitActions';
import { useBenefitVerification } from '@/contexts/BenefitVerificationContext';

const steps = ['Benefit Verification', 'Organization Search', 'Personal Information', 'Package Selection'];

export default function PackageOptionsScreen() {
    const { benefitStatus, benefitSource, sponsoringOrganizationId } = useBenefitVerification();
    const [packages, setPackages] = useState<any[]>([]);
    const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();
    const router = useRouter();
    const [isVerifyingStep, setIsVerifyingStep] = useState(true);

    const isEmployerVerificationPath = benefitSource === 'employer_or_plan';
    const isNonEmployerPath = benefitSource === 'partner_or_parent' || benefitSource === 'none';
    const isVerified = benefitStatus === 'verified';
    const isNotVerified = benefitStatus === 'not_verified';
    const isNotApplicable = benefitStatus === 'not_applicable';

    useEffect(() => {
        console.log('[Step 5] Checking prerequisite state...', { benefitSource, sponsoringOrganizationId, benefitStatus });
        let shouldRedirect = false;
        let redirectPath = '/step1';

        if (benefitSource === 'employer_or_plan') {
            if (!sponsoringOrganizationId || benefitStatus === 'not_started') { 
                console.log('[Step 5] Employer path prerequisites missing (OrgID or Status not ready). Redirecting.');
                shouldRedirect = true;
                redirectPath = !sponsoringOrganizationId ? '/step2' : '/step1';
            }
        } else if (benefitSource === 'partner_or_parent' || benefitSource === 'none') {
            // OK - These paths come directly from Step 1
        } else {
            console.log('[Step 5] Invalid benefitSource. Redirecting to Step 1.');
            shouldRedirect = true;
            redirectPath = '/step1';
        }

        if (shouldRedirect) {
            router.replace(redirectPath);
        } else {
            setIsVerifyingStep(false);
        }
    }, [benefitSource, sponsoringOrganizationId, benefitStatus, router]);

    useEffect(() => {
        if (isVerifyingStep) return;
        
        const loadData = async () => {
            setLoading(true);
            setError(null);
            setSelectedPackageId(null);
            try {
                 console.log("[Step 5] Fetching benefit packages...");
                 const fetchedPackages = await getBenefitPackages();
                 console.log("[Step 5] Fetched packages:", fetchedPackages);
                 setPackages(fetchedPackages);
                 
                 if (isEmployerVerificationPath && isVerified) {
                     const employerPkg = fetchedPackages.find(pkg => pkg.isEmployerSponsored);
                     if (employerPkg) {
                         console.log("[Step 5] Pre-selecting employer sponsored package:", employerPkg.id);
                         setSelectedPackageId(employerPkg.id);
                     } else {
                         console.warn("[Step 5] Verified employer path, but no employer sponsored package found.");
                     }
                 } else {
                     console.log("[Step 5] Not pre-selecting any package.");
                 }

            } catch (err) {
                console.error("[Step 5] Failed to load package data:", err);
                setError("Could not load package options. Please try again later.");
            } finally {
                 setLoading(false);
            }
        };
        loadData(); 
    }, [isVerifyingStep]);

    const handleSelectPackage = (packageId: string) => {
        console.log(`[Step 5] User selected package: ${packageId}`);
        setSelectedPackageId(packageId);
        setError(null);
    };

    const handleContinue = () => {
        if (!selectedPackageId) {
            setError("Please select a package to continue.");
            return;
        }
        setError(null);
        console.log(`[Step 5] Continuing with selected package: ${selectedPackageId}`);
        startTransition(async () => {
             const formData = new FormData();
             formData.append('packageId', selectedPackageId);
             try {
                 const result = await updateSelectedPackage(formData);
                 if (result.success) {
                     console.log("[Step 5] Package selection saved. Navigating to Step 6.");
                     router.push('/step6'); 
                 } else {
                     console.error("[Step 5] Failed to save package selection:", result.message);
                     setError(result.message || 'Failed to save package selection.');
                 }
             } catch (err) {
                 console.error("[Step 5] Error calling updateSelectedPackage:", err);
                 setError("An unexpected error occurred while saving your selection.");
             }
        });
    };

    if (isVerifyingStep || loading) {
        return (
            <Container maxWidth="lg"> 
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
                    <CircularProgress />
                     <Typography sx={{ ml: 2 }}>Loading package options...</Typography> 
                </Box>
            </Container>
        );
    }

    const activeStep = isNonEmployerPath ? 2 : 3;

    const filteredPackages = isNonEmployerPath
        ? packages.filter(pkg => !pkg.isEmployerSponsored && pkg.monthly_cost >= 0)
        : packages;
        
    const employerSponsoredPackage = packages.find(pkg => pkg.isEmployerSponsored);

    let pageTitle = "Available Fertility Packages";
    let pageSubtitle: React.ReactNode = "Please select a package to get started.";

    if (isEmployerVerificationPath) {
        if (isVerified) {
            pageTitle = "Your Fertility Benefit Options";
            pageSubtitle = (
                <>Welcome! 
                Your employer provides the <Typography component="span" fontWeight="bold">{employerSponsoredPackage?.name || 'base'}</Typography> coverage. 
                You can keep this plan or upgrade to enhance your benefits.</>
            );
        } else if (isNotVerified) {
             pageTitle = "Benefit Verification Issue";
             pageSubtitle = (
                 <Alert severity="warning" sx={{ mt: -1, mb: 2, justifyContent: 'center' }}>
                     We couldn't automatically verify your eligibility based on the information provided. 
                     Please review the available standard packages below, or contact support if you believe this is an error.
                 </Alert>
             );
        } else {
             pageTitle = "Processing Verification";
             pageSubtitle = "Please wait while we attempt to verify your benefits. Packages will be shown shortly.";
        }
    } else if (isNonEmployerPath) {
    }

    return (
        <Container maxWidth="lg"> 
            <Box sx={{ width: '100%', my: 4 }}>
                <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 4 }}>
                    {steps.map((label, index) => {
                        const stepProps: { completed?: boolean } = {};
                        const labelProps: { optional?: React.ReactNode } = {};
                        if (isNonEmployerPath && index === 1) {
                             labelProps.optional = <Typography variant="caption" color="text.secondary">Skipped</Typography>;
                        }
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

                <Typography variant="h4" component="h1" gutterBottom align="center">
                    {pageTitle}
                </Typography>
                 <Box sx={{ display: 'flex', justifyContent: 'center', width: '100%', mb: 3 }}>
                     <Box sx={{ maxWidth: 'md' }}>
                        {typeof pageSubtitle === 'string' ? (
                             <Typography variant="subtitle1" gutterBottom align="center" >
                                {pageSubtitle}
                            </Typography>
                         ) : ( pageSubtitle )}
                    </Box>
                </Box>

                 {error && (
                    <Alert severity="error" sx={{ mb: 2, justifyContent: 'center' }}>{error}</Alert>
                 )}

                <Grid container spacing={3} justifyContent="center">
                    {filteredPackages.length === 0 && !loading && (
                        <Grid item xs={12}>
                            <Alert severity="info" sx={{mt: 4, justifyContent: 'center'}}>No packages are currently available. Please check back later or contact support.</Alert>
                        </Grid>
                    )}
                    {filteredPackages.map((pkg) => {
                        const isSelected = selectedPackageId === pkg.id;
                        const isSponsored = employerSponsoredPackage?.id === pkg.id;
                        
                        let buttonText = "Select Plan";
                        if (isSelected) {
                            buttonText = "Selected";
                        } else if (isSponsored) {
                            buttonText = "Current Plan";
                        } else if (isEmployerVerificationPath && isVerified) {
                            buttonText = "Select Upgrade";
                        }
                        
                        return (
                            <Grid item key={pkg.id} xs={12} sm={6} md={4} lg={3}>
                                <Card sx={{ 
                                    height: '100%', 
                                    display: 'flex', 
                                    flexDirection: 'column',
                                    border: isSelected ? '2px solid' : (isSponsored ? '1px dashed' : '1px solid'),
                                    borderColor: isSelected ? 'primary.main' : 'divider',
                                    boxShadow: isSelected ? 4 : (isSponsored ? 1 : 1),
                                    transition: 'box-shadow 0.3s ease-in-out, border-color 0.3s ease-in-out',
                                    opacity: isPending ? 0.7 : 1, 
                                    pointerEvents: isPending ? 'none' : 'auto', 
                                    bgcolor: isSelected ? 'action.hover' : 'background.paper'
                                }}>
                                    <CardContent sx={{ flexGrow: 1 }}>
                                        <Typography variant="h6" component="div" align="center" gutterBottom>
                                            {pkg.name} {isSponsored && "(Your Plan)"}
                                        </Typography>
                                        <Typography variant="h4" color="primary" align="center" gutterBottom>
                                            ${pkg.monthly_cost}/mo
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary" paragraph sx={{ minHeight: '60px'}}>
                                            {pkg.description}
                                        </Typography>
                                        <Box component="ul" sx={{ pl: 2, mb: 0, mt: 1, listStyle: '' }}>
                                            {(pkg.benefits || []).map((benefit: string, index: number) => (
                                                <Typography component="li" key={index} variant="body2" sx={{ mb: 0.5 }}>
                                                    {benefit}
                                                </Typography>
                                            ))}
                                        </Box>
                                    </CardContent>
                                    <CardActions sx={{ justifyContent: 'center', pb: 2, pt: 0 }}>
                                        <Button 
                                            size="medium" 
                                            variant={isSelected ? "contained" : "outlined"} 
                                            onClick={() => handleSelectPackage(pkg.id)}
                                            disabled={isPending || (isSponsored && isSelected)}
                                            fullWidth 
                                            sx={{ mx: 2 }}
                                        >
                                            {buttonText}
                                        </Button>
                                    </CardActions>
                                </Card>
                            </Grid>
                        );
                    })}
                </Grid>

                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 5 }}>
                    <Button 
                        variant="contained" 
                        onClick={handleContinue}
                        disabled={!selectedPackageId || isPending || (employerSponsoredPackage?.id === selectedPackageId && isVerified)} 
                        sx={{ 
                            py: 1.5, 
                            px: 5,
                            textTransform: 'none'
                        }}
                         startIcon={isPending ? <CircularProgress size={20} color="inherit" /> : null}
                    >
                         {isPending ? 'Saving...' : 'Continue'}
                    </Button>
                </Box>
            </Box>
        </Container>
    );
} 