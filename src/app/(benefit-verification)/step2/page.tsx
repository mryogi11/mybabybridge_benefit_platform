'use client';

import React, { useState, useTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
    Autocomplete,
    CircularProgress,
    Alert,
    Dialog, 
    DialogTitle, 
    DialogContent, 
    DialogContentText, 
    DialogActions
} from '@mui/material';

import { updateSponsoringOrganization, searchOrganizations } from '@/actions/benefitActions';
import { useBenefitVerification } from '@/contexts/BenefitVerificationContext';

const steps = ['Benefit Verification', 'Organization Search', 'Personal Information', 'Package Selection'];

interface OrganizationOption {
    id: string;
    label: string; 
}

export default function OrganizationSearchScreen() {
    const router = useRouter();
    const { benefitSource, setSponsoringOrganizationId } = useBenefitVerification(); 
    const [inputValue, setInputValue] = useState('');
    const [options, setOptions] = useState<OrganizationOption[]>([]);
    const [selectedOrg, setSelectedOrg] = useState<OrganizationOption | null>(null);
    const [loadingSearch, setLoadingSearch] = useState(false);
    const [searchError, setSearchError] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();
    const [isVerifyingStep, setIsVerifyingStep] = useState(true);
    
    const [isNotSureDialogOpen, setIsNotSureDialogOpen] = useState(false);

    const handleOpenNotSureDialog = () => {
        setIsNotSureDialogOpen(true);
    };

    const handleCloseNotSureDialog = () => {
        setIsNotSureDialogOpen(false);
    };

    useEffect(() => {
        console.log('[Step 2] Checking prerequisite state...', { benefitSource });
        if (benefitSource !== 'employer_or_plan') {
            console.log(`[Step 2] Invalid benefitSource (${benefitSource}). Redirecting to Step 1.`);
            router.replace('/step1');
        } else {
            setIsVerifyingStep(false);
        }
    }, [benefitSource, router]);

    useEffect(() => {
        if (inputValue.length < 2) {
            setOptions([]);
            setLoadingSearch(false);
            return;
        }

        setLoadingSearch(true);
        setSearchError(null);
        const timerId = setTimeout(async () => {
            try {
                 const results = await searchOrganizations(inputValue);
                 setOptions(results);
            } catch (err) {
                 console.error("Organization search failed:", err);
                 setSearchError("Failed to search for organizations.");
                 setOptions([]);
            } finally {
                 setLoadingSearch(false);
            }
        }, 500);

        return () => clearTimeout(timerId);
    }, [inputValue]);

    const handleContinue = () => {
        if (!selectedOrg) return;
        
        startTransition(async () => {
            setSponsoringOrganizationId(selectedOrg.id);

            const formData = new FormData();
            formData.append('organizationId', selectedOrg.id);
            const result = await updateSponsoringOrganization(formData);
            if (result.success) {
                router.push('/step3'); 
            } else {
                 console.error("Failed to update sponsoring organization:", result.message);
                 setSearchError(result.message || "Failed to save organization selection.");
                 setSponsoringOrganizationId(null);
            }
        });
    };

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
                <Stepper activeStep={1} alternativeLabel sx={{ mb: 4 }}>
                    {steps.map((label) => (
                        <Step key={label}>
                            <StepLabel>{label}</StepLabel>
                        </Step>
                    ))}
                </Stepper>

                <Typography variant="h4" component="h1" gutterBottom align="center">
                    Which organization sponsors your fertility benefit?
                </Typography>
                <Typography variant="subtitle1" gutterBottom align="center" sx={{ mb: 3 }}>
                    This may be your employer or health insurance company
                </Typography>

                {searchError && (
                    <Alert severity="error" sx={{ mb: 2 }}>{searchError}</Alert>
                )}

                <Autocomplete
                    id="organization-search"
                    options={options}
                    getOptionLabel={(option) => option.label}
                    isOptionEqualToValue={(option, value) => option.id === value.id}
                    filterOptions={(x) => x}
                    value={selectedOrg}
                    onChange={(event, newValue) => {
                        setSelectedOrg(newValue);
                        setOptions(newValue ? [newValue, ...options.filter(o => o.id !== newValue.id)] : options);
                    }}
                    inputValue={inputValue}
                    onInputChange={(event, newInputValue) => {
                        setInputValue(newInputValue);
                    }}
                    loading={loadingSearch}
                    renderInput={(params) => (
                        <TextField 
                            {...params} 
                            label="Search Organization"
                            variant="outlined" 
                            fullWidth
                            InputProps={{
                                ...params.InputProps,
                                endAdornment: (
                                    <>
                                        {loadingSearch ? <CircularProgress color="inherit" size={20} /> : null}
                                        {params.InputProps.endAdornment}
                                    </>
                                ),
                            }}
                        />
                    )}
                    sx={{ mb: 2 }}
                />
                
                <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3, mt: 1 }}>
                     <Button 
                        variant="text" 
                        onClick={handleOpenNotSureDialog}
                        sx={{ textTransform: 'none' }} 
                     >
                         I'm not sure
                     </Button>
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                    <Button 
                        variant="contained" 
                        onClick={handleContinue}
                        disabled={!selectedOrg || isPending}
                         sx={{ 
                            bgcolor: '#e0f2f1',
                            color: '#004d40',
                            '&:hover': { bgcolor: '#b2dfdb' },
                            py: 1.5, px: 5, textTransform: 'none'
                        }}
                        startIcon={isPending ? <CircularProgress size={20} color="inherit" /> : null}
                    >
                        {isPending ? 'Saving...' : 'Continue'}
                    </Button>
                </Box>
            </Box>

            <Dialog
                open={isNotSureDialogOpen}
                onClose={handleCloseNotSureDialog}
                aria-labelledby="notsure-dialog-title"
                aria-describedby="notsure-dialog-description"
            >
                <DialogTitle id="notsure-dialog-title">
                    {"Need Help Finding Your Organization?"}
                </DialogTitle>
                <DialogContent>
                    <DialogContentText id="notsure-dialog-description">
                        If you're unsure which organization provides your fertility benefit, 
                        please check your employee handbook, benefits portal, or contact your HR department.
                        <br /><br />
                        For further assistance, you can reach out to our support team at: 
                        <MuiLink href="mailto:care@mybabybridge.com" sx={{ fontWeight: 'bold' }}> care@mybabybridge.com</MuiLink>.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseNotSureDialog} autoFocus>
                        Close
                    </Button>
                </DialogActions>
            </Dialog>

        </Container>
    );
} 