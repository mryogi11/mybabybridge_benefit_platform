'use client';

import React, { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { 
    Box, 
    Typography, 
    Card, 
    CardContent, 
    CardActions, 
    Button, 
    Divider, 
    Chip, 
    List, 
    ListItem, 
    ListItemText,
    CircularProgress,
    Alert
} from '@mui/material';
import { Upgrade } from '@mui/icons-material';
import { updateSelectedPackage } from '@/actions/benefitActions'; // Assuming the action exists

// Reuse the DashboardPackageInfo type if possible, or redefine if needed
interface DashboardPackageInfo {
    id: string;
    name: string;
    monthly_cost: number;
    description: string | null;
    key_benefits: string[] | null;
    is_base_employer_package: boolean;
}

interface UpgradeOptionsProps {
    currentPackage: DashboardPackageInfo;
    allPackages: DashboardPackageInfo[];
}

export default function UpgradeOptions({ currentPackage, allPackages }: UpgradeOptionsProps) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [error, setError] = React.useState<string | null>(null);
    const [upgradingPackageId, setUpgradingPackageId] = React.useState<string | null>(null);

    // Filter for packages that cost more than the current one
    const availableUpgrades = allPackages.filter(
        pkg => pkg.id !== currentPackage.id && pkg.monthly_cost > currentPackage.monthly_cost
    );

    const handleUpgrade = (packageId: string, packageCost: number) => {
        setError(null);
        setUpgradingPackageId(packageId); // Set loading state for the specific button
        
        startTransition(async () => {
            try {
                const formData = new FormData();
                formData.append('packageId', packageId);

                const result = await updateSelectedPackage(formData);

                if (result.success) {
                    // If the selected package costs money, redirect to payment step
                    if (packageCost > 0) {
                        console.log("Upgrade successful, redirecting to payment step (Step 6).");
                        router.push('/step6'); // Redirect to confirmation/payment page
                    } else {
                        // If somehow an upgrade costs 0 (unlikely based on filter), just refresh or go to dashboard
                        console.log("Upgrade successful (no cost), refreshing page.");
                        router.refresh(); // Or redirect to dashboard home
                    }
                } else {
                    setError(result.message || 'Failed to update package selection.');
                    setUpgradingPackageId(null); // Reset loading state on error
                }
            } catch (err) {
                console.error("Error upgrading package:", err);
                setError(err instanceof Error ? err.message : 'An unexpected error occurred during upgrade.');
                setUpgradingPackageId(null); // Reset loading state on error
            }
            // Note: isPending from useTransition covers the overall transition state,
            // upgradingPackageId provides specific button state.
        });
    };

    if (availableUpgrades.length === 0) {
        return null; // Don't render anything if no upgrades are available
    }

    return (
        <Box sx={{ mb: 4 }}>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                <Upgrade sx={{ mr: 1 }} color="action" /> Available Upgrades
            </Typography>
             {error && (
                <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
            )}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {availableUpgrades.map((pkg) => {
                    const isLoadingThis = isPending && upgradingPackageId === pkg.id;
                    return (
                        <Card key={pkg.id} variant="outlined">
                            <CardContent>
                                <Typography variant="h6" component="div" gutterBottom>
                                    {pkg.name}
                                </Typography>
                                <Chip 
                                    label={`$${pkg.monthly_cost.toFixed(2)}/month`}
                                    color="primary" 
                                    size="small" 
                                    sx={{ mb: 1 }}
                                />
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                    {pkg.description || 'No description available.'}
                                </Typography>
                                {pkg.key_benefits && pkg.key_benefits.length > 0 && (
                                    <Box>
                                        <Typography variant="subtitle2">Includes Current Benefits Plus:</Typography>
                                        <List dense>
                                            {/* Filter benefits to show only new ones compared to current plan? Or show all? Show all for now. */}
                                            {pkg.key_benefits.map((benefit, index) => (
                                                <ListItem key={index} sx={{ py: 0.5 }}>
                                                    <ListItemText primary={`- ${benefit}`} />
                                                </ListItem>
                                            ))}
                                        </List>
                                    </Box>
                                )}
                            </CardContent>
                            <Divider />
                            <CardActions sx={{ justifyContent: 'flex-end', p: 2 }}>
                                <Button 
                                    variant="contained" 
                                    onClick={() => handleUpgrade(pkg.id, pkg.monthly_cost)}
                                    disabled={isLoadingThis || isPending} // Disable if this or any upgrade is pending
                                    startIcon={isLoadingThis ? <CircularProgress size={20} color="inherit" /> : null}
                                >
                                    {isLoadingThis ? 'Processing...' : 'Upgrade Plan'}
                                </Button>
                            </CardActions>
                        </Card>
                    );
                })}
            </Box>
        </Box>
    );
} 