'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  LinearProgress,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
} from '@mui/material';
// import { supabase } from '@/lib/supabase/client'; // Not directly used now
import { Package, PackageTier } from '@/types'; // PurchaseType removed if not used
import { ShoppingBasket } from '@mui/icons-material';
import { getUserDashboardData, selectPackageForUser } from '@/actions/benefitActions';

// Cache for package data (can be kept if useful for future caching strategies)
let packageCache: Package[] | null = null;
let packageCacheTimestamp: number = 0;
const CACHE_DURATION = 1000 * 60 * 5; // 5 minutes

export default function PackagesPage() {
  const [packages, setPackages] = useState<Package[]>([]);
  const [currentPackageId, setCurrentPackageId] = useState<string | null>(null);
  // const [userId, setUserId] = useState<string | null>(null); // Removed as selectPackageForUser will get it from auth
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);
  const [purchaseDialogOpen, setPurchaseDialogOpen] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);

  // getMockPackages function has been removed.

  const fetchPackagesAndUserData = useCallback(async (forceFresh = false) => {
    setLoading(true);
    setError(null);
    const now = Date.now();

    // Basic caching check (optional, as action might have its own caching or be quick)
    if (!forceFresh && packageCache && (now - packageCacheTimestamp < CACHE_DURATION)) {
      console.log('Using cached package data for initial render hint, action will still run.');
      // setPackages(packageCache); // Potentially set from cache, but action will overwrite
    }

    try {
      console.log("Fetching user dashboard data for package page...");
      const userDataResult = await getUserDashboardData();
      if (userDataResult.success && userDataResult.data) {
        if (userDataResult.data.currentPackage) {
          setCurrentPackageId(userDataResult.data.currentPackage.id);
          console.log("Current package ID:", userDataResult.data.currentPackage.id);
        } else {
          setCurrentPackageId(null);
        }
        // setUserId(userDataResult.data.userId); // Not needed if action gets it
        // console.log("User ID:", userDataResult.data.userId); // Not needed

        const fetchedPackages = (userDataResult.data.allPackages || []) as Package[]; // Cast to Package[]
        setPackages(fetchedPackages);
        packageCache = fetchedPackages; // Update cache with fresh data
        packageCacheTimestamp = now;

      } else if (!userDataResult.success) {
          console.error("Error fetching user data:", userDataResult.message);
          setError(userDataResult.message || "Could not load your current plan information or available packages.");
          setPackages([]);
      }
    } catch (userError: any) {
        console.error('Error fetching user data:', userError);
        setError(userError.message || "Could not load your current plan information or available packages.");
        setPackages([]);
    } finally { // Ensure loading is always set to false
        setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPackagesAndUserData();
  }, [fetchPackagesAndUserData]);

  const handlePurchaseClick = (pkg: Package) => {
    setSelectedPackage(pkg);
    setPurchaseError(null);
    setPurchaseDialogOpen(true);
  };

  const handlePurchaseClose = () => {
    setPurchaseDialogOpen(false);
    setSelectedPackage(null);
    setPurchaseError(null);
    setPurchasing(false);
  };

  const handlePurchase = async () => {
    if (!selectedPackage) { // Removed userId check
      setPurchaseError('Selected package information is missing. Please refresh.');
      return;
    }
    
    setPurchasing(true);
    setPurchaseError(null);

    try {
      console.log(`Attempting to purchase package ${selectedPackage.id}`);
      // Call selectPackageForUser without userId, as it should get it from auth
      const result = await selectPackageForUser(selectedPackage.id);

      if (result.success) {
        console.log('Purchase successful:', result.message);
        handlePurchaseClose();
        await fetchPackagesAndUserData(true); // Refresh data
      } else {
        console.error('Purchase failed:', result.message, result.error);
        setPurchaseError(result.message || 'An unknown error occurred during purchase.');
      }
    } catch (error: any) {
      console.error('Error processing purchase:', error);
      setPurchaseError(error.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setPurchasing(false);
    }
  };

  const handleRefresh = () => {
    setLoading(true);
    setError(null);
    fetchPackagesAndUserData(true); // Force fresh data
  };

  const getTierColor = (tier: PackageTier) => {
    switch (tier) {
      case 'platinum': return 'primary';
      case 'gold': return 'warning';
      case 'silver': return 'info';
      case 'basic': default: return 'default';
    }
  };

  const packageCards = useMemo(() => {
    return packages.map((pkg) => {
      const isActive = pkg.id === currentPackageId;
      return (
        <Grid item xs={12} sm={6} md={4} key={pkg.id}>
          <Card sx={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            transition: 'transform 0.2s, box-shadow 0.2s',
            border: isActive ? '2px solid' : '1px solid',
            borderColor: isActive ? 'primary.main' : 'divider',
            backgroundColor: isActive ? 'action.hover' : 'background.paper',
            '&:hover': {
              transform: isActive ? 'none' : 'translateY(-4px)',
              boxShadow: isActive ? 2 : 3,
            }
          }}>
            <CardContent sx={{ flexGrow: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" component="div">
                  {pkg.name}
                </Typography>
                <Chip
                  label={pkg.tier.charAt(0).toUpperCase() + pkg.tier.slice(1)}
                  color={getTierColor(pkg.tier)}
                  size="small"
                />
              </Box>
              <Typography color="text.secondary" gutterBottom sx={{ minHeight: '3em' }}>
                {pkg.description}
              </Typography>
              <Typography variant="h6" color="primary" sx={{ mt: 2 }}>
                ${pkg.monthly_cost}
              </Typography>
              {pkg.key_benefits && pkg.key_benefits.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>Key Benefits:</Typography>
                  <ul style={{ paddingLeft: 20, margin: 0 }}>
                    {pkg.key_benefits.map((benefit, index) => (
                      <li key={index}><Typography variant="body2">{benefit}</Typography></li>
                    ))}
                  </ul>
                </Box>
              )}
            </CardContent>
            <CardActions sx={{ justifyContent: 'center', pb: 2 }}>
              {isActive ? (
                <Chip label="Current Plan" color="success" variant="outlined" />
              ) : (
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<ShoppingBasket />}
                  onClick={() => handlePurchaseClick(pkg)}
                  disabled={loading || purchasing}
                >
                  Select Plan
                </Button>
              )}
            </CardActions>
          </Card>
        </Grid>
      );
    });
  }, [packages, currentPackageId, loading, purchasing, handlePurchaseClick]);

  if (loading && packages.length === 0) {
    return <LinearProgress sx={{ width: '100%' }} />;
  }

  if (error) {
    return (
      <Box sx={{ textAlign: 'center', mt: 4 }}>
        <Alert severity="error" action={<Button color="inherit" size="small" onClick={handleRefresh}>Retry</Button>}>
          {error}
        </Alert>
      </Box>
    );
  }

  if (packages.length === 0 && !loading) {
    return (
        <Box sx={{ textAlign: 'center', mt: 4 }}>
            <Typography variant="h6">No packages available at the moment.</Typography>
            <Button onClick={handleRefresh} sx={{ mt: 2 }}>Refresh Packages</Button>
        </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ mb: 3, textAlign: 'center' }}>
        Available Benefit Packages {/* Removed (Test - Cards Removed) */}
      </Typography>
      <Grid container spacing={3}>
        {packageCards} {/* Restored packageCards usage */}
      </Grid>

      {selectedPackage && (
        <Dialog open={purchaseDialogOpen} onClose={handlePurchaseClose} maxWidth="xs" fullWidth>
          <DialogTitle>Confirm Purchase: {selectedPackage.name}</DialogTitle>
          <DialogContent dividers>
            <Typography variant="body1" gutterBottom>
              You are about to select the package: <strong>{selectedPackage.name}</strong>.
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Description: {selectedPackage.description}
            </Typography>
            <Typography variant="h6" color="primary" sx={{ my: 2 }}>
              Price: ${selectedPackage.monthly_cost}
            </Typography>
            {purchaseError && (
              <Alert severity="error" sx={{ mt: 2 }}>{purchaseError}</Alert>
            )}
            {purchasing && (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', mt: 2 }}>
                <CircularProgress size={24} sx={{ mr: 1 }} />
                <Typography>Processing...</Typography>
              </Box>
            )}
          </DialogContent>
          <DialogActions sx={{ p: '16px 24px' }}>
            <Button onClick={handlePurchaseClose} color="inherit" disabled={purchasing}>
              Cancel
            </Button>
            <Button 
              onClick={handlePurchase} 
              variant="contained" 
              color="primary" 
              disabled={purchasing}
              startIcon={purchasing ? <CircularProgress size={20} color="inherit" /> : <ShoppingBasket />}
            >
              {purchasing ? 'Processing...' : 'Confirm Purchase'}
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </Box>
  );
}

// Make sure to add ChipProps to your MUI imports if you use it for getTierColor return type:
// import { ChipProps } from '@mui/material';
// For the above code, direct ChipProps isn't strictly necessary for `getTierColor` as MUI
// infers the string literal types for `color` prop of `Chip`.