'use client';

import React, { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Button,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    FormControlLabel,
    Checkbox,
    FormHelperText,
    CircularProgress,
    Box,
    Chip,
    InputAdornment,
} from '@mui/material';
import { packageTierEnum } from '@/lib/db/schema'; // Assuming schema defines the enum

// Define the shape of the package data for the form
interface PackageFormData {
    name: string;
    tier: typeof packageTierEnum.enumValues[number];
    monthly_cost: number;
    description: string;
    key_benefits: string; // Handle as comma-separated string in form for simplicity
    is_base_employer_package: boolean;
    organization_id: string; // Add organization ID
}

// Define the shape of the package data expected by the API (subset of Package type on page)
// Useful for the onSave prop type
export interface PackageSaveData extends Omit<PackageFormData, 'key_benefits'> {
    id?: string; // ID is optional for create, required for update
    key_benefits: string[]; // Convert back to array for saving
    organization_id: string; // Ensure org ID is included
}


// Zod schema for validation
const PackageFormSchema = z.object({
    name: z.string().min(1, 'Package name is required'),
    tier: z.enum(packageTierEnum.enumValues, { required_error: 'Tier is required' }),
    monthly_cost: z.coerce // Use coerce for TextField which gives string initially
        .number({ invalid_type_error: 'Cost must be a number' })
        .min(0, 'Monthly cost cannot be negative'),
    description: z.string().optional().default(''),
    // For simplicity, we'll handle benefits as a single string in the form, then parse
    key_benefits: z.string().optional().default(''),
    is_base_employer_package: z.boolean().default(false),
    organization_id: z.string().uuid('Invalid Organization ID format').min(1, 'Organization is required'), // Add required organization ID validation
});


interface PackageFormModalProps {
    open: boolean;
    onClose: () => void;
    onSave: (data: PackageSaveData) => Promise<void>; // Make onSave async
    initialData?: PackageSaveData | null; // Use PackageSaveData which includes optional id
    isSaving?: boolean; // Add prop to indicate parent is saving
    organizations: { id: string; name: string }[]; // Add organizations prop
}

export default function PackageFormModal({ open, onClose, onSave, initialData, isSaving = false, organizations = [] }: PackageFormModalProps) {
    const isEditing = !!initialData;

    const {
        control,
        register,
        handleSubmit,
        reset,
        formState: { errors, isSubmitting }, // Use isSubmitting from RHF
    } = useForm<PackageFormData>({
        resolver: zodResolver(PackageFormSchema),
        defaultValues: {
            name: '',
            tier: packageTierEnum.enumValues[0], // Default tier
            monthly_cost: 0,
            description: '',
            key_benefits: '',
            is_base_employer_package: false,
            organization_id: '', // Add default
        },
    });

    // Reset form when initialData changes or modal opens/closes, BUT NOT if parent is saving
    useEffect(() => {
        if (open && !isSaving) { // Only reset if modal is open AND parent is not saving
            if (initialData) {
                reset({
                    name: initialData.name || '',
                    tier: initialData.tier || packageTierEnum.enumValues[0],
                    monthly_cost: initialData.monthly_cost || 0,
                    description: initialData.description || '',
                    key_benefits: (initialData.key_benefits || []).join(', '), // Join array for TextField
                    is_base_employer_package: initialData.is_base_employer_package || false,
                    organization_id: initialData.organization_id || '', // Pre-fill org ID (if available in initialData)
                    // TODO: If initialData doesn't include org ID, need to fetch it separately for edit
                });
            } else {
                // Reset to default values for "Create" mode
                 reset({
                    name: '',
                    tier: packageTierEnum.enumValues[0],
                    monthly_cost: 0,
                    description: '',
                    key_benefits: '',
                    is_base_employer_package: false,
                    organization_id: '', // Reset org ID for create
                });
            }
        }
    }, [initialData, open, reset, isSaving]);

    const onSubmit = async (data: PackageFormData) => {
        // Convert key_benefits string back to array, filtering empty strings
        const benefitsArray = data.key_benefits
                                .split(',')
                                .map(s => s.trim())
                                .filter(s => s !== '');

        const saveData: PackageSaveData = {
            ...data,
            id: initialData?.id, // Include id if editing
            key_benefits: benefitsArray,
            organization_id: data.organization_id, // Ensure org ID is included
        };
        await onSave(saveData); // Call the async onSave prop
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>{isEditing ? 'Edit Package' : 'Create New Package'}</DialogTitle>
            <form onSubmit={handleSubmit(onSubmit)}>
                <DialogContent>
                    <TextField
                        autoFocus
                        margin="dense"
                        label="Package Name"
                        fullWidth
                        variant="outlined"
                        {...register('name')}
                        error={!!errors.name}
                        helperText={errors.name?.message}
                        disabled={isSubmitting || isSaving}
                    />
                     <FormControl fullWidth margin="dense" error={!!errors.tier} disabled={isSubmitting || isSaving}>
                        <InputLabel id="tier-select-label">Tier</InputLabel>
                        <Controller
                            name="tier"
                            control={control}
                            render={({ field }) => (
                                <Select
                                    labelId="tier-select-label"
                                    label="Tier"
                                    {...field}
                                >
                                    {packageTierEnum.enumValues.map((tier) => (
                                        <MenuItem key={tier} value={tier}>
                                            {tier}
                                        </MenuItem>
                                    ))}
                                </Select>
                            )}
                        />
                        {errors.tier && <FormHelperText>{errors.tier.message}</FormHelperText>}
                    </FormControl>
                     <TextField
                        margin="dense"
                        label="Monthly Cost"
                        fullWidth
                        variant="outlined"
                        type="number"
                        InputProps={{
                            startAdornment: <InputAdornment position="start">$</InputAdornment>,
                            inputProps: { step: "0.01", min: "0" } // Allow decimals, prevent negative
                        }}
                        {...register('monthly_cost')}
                        error={!!errors.monthly_cost}
                        helperText={errors.monthly_cost?.message}
                        disabled={isSubmitting || isSaving}
                    />
                    <TextField
                        margin="dense"
                        label="Description"
                        fullWidth
                        variant="outlined"
                        multiline
                        rows={3}
                        {...register('description')}
                        error={!!errors.description}
                        helperText={errors.description?.message}
                        disabled={isSubmitting || isSaving}
                    />
                    <TextField
                        margin="dense"
                        label="Key Benefits (comma-separated)"
                        fullWidth
                        variant="outlined"
                        multiline
                        rows={2}
                        {...register('key_benefits')}
                        error={!!errors.key_benefits}
                        helperText={errors.key_benefits?.message || 'Enter benefits separated by commas'}
                        disabled={isSubmitting || isSaving}
                    />
                     <FormControlLabel
                        control={
                            <Controller
                                name="is_base_employer_package"
                                control={control}
                                render={({ field }) => (
                                    <Checkbox 
                                        {...field} 
                                        checked={field.value} 
                                        disabled={isSubmitting || isSaving}
                                    />
                                )}
                            />
                        }
                        label="Is Base Employer Package?"
                    />
                    {errors.is_base_employer_package && <FormHelperText error>{errors.is_base_employer_package.message}</FormHelperText>}

                    {/* Organization Select */}
                    <FormControl fullWidth margin="dense" error={!!errors.organization_id} disabled={isSubmitting || isSaving}>
                        <InputLabel id="organization-select-label">Organization</InputLabel>
                        <Controller
                            name="organization_id"
                            control={control}
                            render={({ field }) => (
                                <Select
                                    labelId="organization-select-label"
                                    label="Organization"
                                    {...field}
                                >
                                    <MenuItem value="" disabled><em>Select Organization</em></MenuItem> 
                                    {organizations.map((org) => (
                                        <MenuItem key={org.id} value={org.id}>
                                            {org.name}
                                        </MenuItem>
                                    ))}
                                </Select>
                            )}
                        />
                        {errors.organization_id && <FormHelperText>{errors.organization_id.message}</FormHelperText>}
                    </FormControl>

                </DialogContent>
                <DialogActions sx={{ p: '16px 24px'}}>
                    <Button onClick={onClose} color="inherit" disabled={isSubmitting || isSaving}>
                        Cancel
                    </Button>
                    <Button type="submit" variant="contained" disabled={isSubmitting || isSaving}>
                        {(isSubmitting || isSaving) ? <CircularProgress size={24} /> : (isEditing ? 'Save Changes' : 'Create Package')}
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
}

// Helper type if needed elsewhere (might duplicate page.tsx type)
// export interface Package extends PackageSaveData {
//     id: string;
//     created_at: string;
//     updated_at: string;
// } 