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
    const { benefitStatus, benefitSource } = useBenefitVerification();
    const [packages, setPackages] = useState<any[]>([]);
    const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();
    const router = useRouter();

    const isVerified = benefitStatus === 'verified';
    const mightHaveSponsorship = benefitSource === 'employer_or_plan' || benefitStatus === 'verified';

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            setError(null);
            setSelectedPackageId(null);
            try {
                 const fetchedPackages = await getBenefitPackages();
                 
                 setPackages(fetchedPackages);
                 setSelectedPackageId(fetchedPackages.find(pkg => pkg.isEmployerSponsored)?.id || null);

            } catch (err) {
                console.error("Failed to load package data:", err);
                setError("Could not load package options. Please try again later.");
            } finally {
                 setLoading(false);
            }
        };
        loadData(); 
    }, [benefitStatus]);

    const handleSelectPackage = (packageId: string) => {
        setSelectedPackageId(packageId);
        setError(null);
    };

    const handleContinue = () => {
        if (!selectedPackageId) return;
        setError(null);
        startTransition(async () => {
             const formData = new FormData();
             formData.append('packageId', selectedPackageId);
             const result = await updateSelectedPackage(formData);
             if (result.success) {
                router.push('/step6'); 
             } else {
                 setError(result.message || 'Failed to save package selection.');
             }
        });
    };

    if (loading) {
        return (
            <Container maxWidth="lg">
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
                    <CircularProgress />
                </Box>
            </Container>
        );
    }

    const employerSponsoredPackageId = packages.find(pkg => pkg.isEmployerSponsored)?.id || null;

    const filteredPackages = mightHaveSponsorship 
        ? packages 
        : packages.filter(pkg => !pkg.isEmployerSponsored && pkg.monthly_cost > 0);

    return (
        <Container maxWidth="lg">
            <Box sx={{ width: '100%', my: 4 }}>
                <Stepper activeStep={3} alternativeLabel sx={{ mb: 4 }}>
                    {steps.map((label) => (
                        <Step key={label}>
                            <StepLabel>{label}</StepLabel>
                        </Step>
                    ))}
                </Stepper>

                <Typography variant="h4" component="h1" gutterBottom align="center">
                    {isVerified ? 'Your Fertility Benefit Options' : 'Available Fertility Packages'} 
                </Typography>
                 
                 {isVerified && employerSponsoredPackageId && (
                    <Typography variant="subtitle1" gutterBottom align="center" sx={{ mb: 3 }}>
                        Your employer provides the {packages.find(p => p.id === employerSponsoredPackageId)?.name || 'base'} coverage. You can upgrade to enhance your benefits.
                    </Typography>
                 )}
                 {!isVerified && mightHaveSponsorship && (
                     <Alert severity="warning" sx={{ mb: 2, justifyContent: 'center' }}>
                        We couldn't verify your employer-sponsored benefit. Please review the available packages below or contact support.
                    </Alert>
                 )}
                  {!mightHaveSponsorship && (
                     <Typography variant="subtitle1" gutterBottom align="center" sx={{ mb: 3 }}>
                        Please select a package to get started.
                    </Typography>
                 )}

                 {error && (
                    <Alert severity="error" sx={{ mb: 2, justifyContent: 'center' }}>{error}</Alert>
                 )}

                <Grid container spacing={3} justifyContent="center">
                    {filteredPackages.length === 0 && !loading && (
                        <Typography sx={{mt: 4}}>No packages available.</Typography>
                    )}
                    {filteredPackages.map((pkg) => {
                        const isSelected = selectedPackageId === pkg.id;
                        const isSponsored = pkg.isEmployerSponsored;
                        return (
                            <Grid item key={pkg.id} xs={12} sm={6} md={3}>
                                <Card sx={{ 
                                    height: '100%', 
                                    display: 'flex', 
                                    flexDirection: 'column',
                                    border: isSelected ? '2px solid' : (isSponsored ? '1px dashed' : '1px solid'),
                                    borderColor: isSelected ? 'primary.main' : 'divider',
                                    boxShadow: isSelected ? 3 : (isSponsored ? 2 : 1),
                                    opacity: isPending ? 0.7 : 1, 
                                    pointerEvents: isPending ? 'none' : 'auto' 
                                }}>
                                    <CardContent sx={{ flexGrow: 1 }}>
                                        <Typography variant="h6" component="div" gutterBottom>
                                            {pkg.name} {isSponsored && "(Your Plan)"}
                                        </Typography>
                                        <Typography variant="h5" color="text.secondary" gutterBottom>
                                            ${pkg.monthly_cost}/mo
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary" paragraph>
                                            {pkg.description}
                                        </Typography>
                                        <Box component="ul" sx={{ pl: 2, mb: 0, mt: 1 }}>
                                            {pkg.benefits.map((benefit: string, index: number) => (
                                                <Typography component="li" key={index} variant="body2" sx={{ mb: 0.5 }}>
                                                    {benefit}
                                                </Typography>
                                            ))}
                                        </Box>
                                    </CardContent>
                                    <CardActions sx={{ justifyContent: 'center', pb: 2 }}>
                                        <Button 
                                            size="small" 
                                            variant={isSelected ? "contained" : "outlined"} 
                                            onClick={() => handleSelectPackage(pkg.id)}
                                            disabled={isSelected || isPending || (isSponsored && selectedPackageId === pkg.id)}
                                        >
                                            {isSelected ? "Selected" : (isSponsored ? "Current Plan" : (isVerified ? "Select Upgrade" : "Select Plan"))}
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
                        disabled={!selectedPackageId || isPending} 
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