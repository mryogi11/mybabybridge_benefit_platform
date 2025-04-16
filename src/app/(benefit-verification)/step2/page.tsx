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
    Alert
} from '@mui/material';

import { updateSponsoringOrganization, searchOrganizations } from '@/actions/benefitActions';
import { useBenefitVerification } from '@/contexts/BenefitVerificationContext';

const steps = ['Benefit Verification', 'Organization Search', 'Personal Information', 'Package Selection'];

export default function OrganizationSearchScreen() {
    const { sponsoringOrganizationId, sponsoringOrganizationName, setSponsoringOrganization } = useBenefitVerification();
    const [selectedOption, setSelectedOption] = useState<{ label: string; id: string } | null>( sponsoringOrganizationId ? { label: sponsoringOrganizationName || '', id: sponsoringOrganizationId} : null );
    const [inputValue, setInputValue] = useState(sponsoringOrganizationName || '');
    const [options, setOptions] = useState<{ label: string; id: string }[]>([]);
    const [loadingOptions, setLoadingOptions] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();
    const router = useRouter();

    useEffect(() => {
        if (selectedOption && selectedOption.label === inputValue) {
            setOptions(selectedOption ? [selectedOption] : []);
            return undefined; 
        }

        if (inputValue.trim().length < 2) { 
            setOptions([]);
            setLoadingOptions(false);
            return undefined;
        }

        setLoadingOptions(true);
        setOptions([]);
        
        const delayDebounceFn = setTimeout(() => {
            searchOrganizations(inputValue).then(newOptions => {
                setOptions(newOptions);
            }).catch(err => {
                console.error("Failed to search organizations:", err);
                setError("Error searching organizations. Please try again."); 
            }).finally(() => {
                setLoadingOptions(false);
            });
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [inputValue, selectedOption]);

    const handleContinue = () => {
        if (!sponsoringOrganizationId) return;

        setError(null);
        startTransition(async () => {
            const formData = new FormData();
            formData.append('organizationId', sponsoringOrganizationId);

            const result = await updateSponsoringOrganization(formData);

            if (result.success) {
                router.push('/step3'); 
            } else {
                setError(result.message || 'Failed to save organization.');
            }
        });
    };

    const handleNotSure = () => {
        console.log("'I'm not sure' clicked - flow TBD");
        setSponsoringOrganization(null, null);
        // TODO: Decide navigation for unsure users
        // router.push('/step5'); // Maybe go straight to non-sponsored packages?
    };

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

                {error && (
                    <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
                )}

                <Autocomplete
                    id="organization-search-autocomplete"
                    sx={{ width: '100%', mb: 2 }}
                    options={options}
                    autoComplete
                    includeInputInList
                    filterOptions={(x) => x}
                    filterSelectedOptions
                    value={selectedOption}
                    loading={loadingOptions}
                    noOptionsText={inputValue.length < 2 ? "Type at least 2 characters" : "No organizations found"}
                    onChange={(event: any, newValue: { label: string; id: string } | null) => {
                        setOptions(newValue ? [newValue, ...options] : options);
                        setSelectedOption(newValue);
                        setSponsoringOrganization(newValue?.id || null, newValue?.label || null);
                        setError(null);
                    }}
                    onInputChange={(event, newInputValue) => {
                        setInputValue(newInputValue);
                    }}
                    renderInput={(params) => (
                        <TextField 
                            {...params} 
                            label="Search organization name" 
                            InputProps={{
                                ...params.InputProps,
                                endAdornment: (
                                    <React.Fragment>
                                        {loadingOptions ? <CircularProgress color="inherit" size={20} /> : null}
                                        {params.InputProps.endAdornment}
                                    </React.Fragment>
                                ),
                            }}
                        />
                    )}
                    renderOption={(props, option) => {
                        return (
                            <li {...props} key={option.id}> 
                                {option.label}
                            </li>
                        );
                    }}
                    isOptionEqualToValue={(option, value) => option.id === value.id}
                    getOptionLabel={(option) => option.label}
                />

                <Box sx={{ textAlign: 'center', mb: 4 }}>
                    <MuiLink component="button" variant="body2" onClick={handleNotSure} sx={{ cursor: 'pointer' }}>
                        I'm not sure
                    </MuiLink>
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                     <Button 
                        variant="contained" 
                        onClick={handleContinue}
                        disabled={!sponsoringOrganizationId || isPending} 
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
                         {isPending ? 'Saving...' : 'Continue'}
                    </Button>
                </Box>
            </Box>
        </Container>
    );
} 