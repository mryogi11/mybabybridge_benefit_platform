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
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
} from '@mui/material';
import { supabase } from '@/lib/supabase/client';
import { Package, PurchaseType, PackageTier, UserDashboardData } from '@/types';
import { ShoppingBasket } from '@mui/icons-material';
import { getUserDashboardData } from '@/actions/benefitActions';

// Cache for package data
let packageCache: Package[] | null = null;
let packageCacheTimestamp: number = 0;
const CACHE_DURATION = 1000 * 60 * 5; // 5 minutes

export default function PackagesPage() {
  const [packages, setPackages] = useState<Package[]>([]);
  const [currentPackageId, setCurrentPackageId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);
  const [purchaseDialogOpen, setPurchaseDialogOpen] = useState(false);
  const [purchaseType, setPurchaseType] = useState<PurchaseType>('one-time');

  // Create a memoized mock data function to avoid recreating the data every render
  const getMockPackages = useCallback((): Package[] => {
    return [
      {
        id: '1',
        name: 'Basic Treatment Package',
        description: 'Essential therapy sessions to address developmental needs. Includes initial assessment and 4 therapy sessions.',
        price: 299,
        tier: 'basic' as PackageTier,
        validity_period: 30,
        purchase_type: 'one-time' as PurchaseType,
        features: ['Initial assessment', '4 therapy sessions', 'Basic progress tracking'],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: '2',
        name: 'Advanced Care Package',
        description: 'Comprehensive therapy plan with regular sessions and progress tracking. Includes assessment, 8 therapy sessions, and 2 progress reviews.',
        price: 599,
        tier: 'premium' as PackageTier,
        validity_period: 60,
        purchase_type: 'one-time' as PurchaseType,
        features: ['Comprehensive assessment', '8 therapy sessions', '2 progress reviews', 'Home program'],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: '3',
        name: 'Family Support Bundle',
        description: 'Complete care package for families. Includes assessments, therapy sessions, parent coaching, and home program development.',
        price: 899,
        tier: 'premium' as PackageTier,
        validity_period: 90,
        purchase_type: 'subscription' as PurchaseType,
        features: ['Comprehensive assessment', '12 therapy sessions', 'Parent coaching', 'Home program', 'Monthly reviews'],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];
  }, []);

  const fetchPackagesAndUserData = useCallback(async (forceFresh = false) => {
    setLoading(true);
    setError(null);
    const now = Date.now();

    // Fetch User Data first to know current package
    let userPackageId: string | null = null;
    try {
      // TODO: Consider caching user dashboard data too?
      console.log("Fetching user dashboard data for package page...");
      const userDataResult = await getUserDashboardData();
      if (userDataResult.success && userDataResult.data?.currentPackage) {
        userPackageId = userDataResult.data.currentPackage.id;
        setCurrentPackageId(userPackageId);
        console.log("Current package ID:", userPackageId);
      } else if (!userDataResult.success) {
          // Handle error fetching user data, maybe set a specific error
          console.error("Error fetching user data:", userDataResult.message);
          setError("Could not load your current plan information.");
          // Optionally return early if current plan is crucial
          // setLoading(false); return;
      }
    } catch (userError) {
        console.error('Error fetching user data:', userError);
        setError("Could not load your current plan information.");
        // setLoading(false); return; 
    }
    
    // Fetch Packages List (using cache if available)
    if (!forceFresh && packageCache && (now - packageCacheTimestamp < CACHE_DURATION)) {
      console.log('Using cached package data');
      setPackages(packageCache);
      setLoading(false);
      return;
    }
    
    try {
      console.log('Fetching packages list from DB...');
      const { data, error: packagesError } = await supabase
        .from('packages')
        .select('*')
        .order('monthly_cost', { ascending: true });

      if (packagesError) {
        console.warn('Error fetching packages:', packagesError.message);
        if (packagesError.message.includes('relation "public.packages" does not exist')) {
          // Fallback to mock data removed for now, rely on error display
          console.log('Packages table does not exist.');
          setError('Package information is currently unavailable.');
          setPackages([]);
        } else {
             throw packagesError;
        }
      } else {
          packageCache = data as any || [];
          packageCacheTimestamp = now;
          setPackages(data as any || []);
      }
    } catch (fetchError) {
      console.error('Error fetching packages:', fetchError);
      // Set error only if not already set by user data fetch failure
      if (!error) {
           setError('Failed to load available packages. Please try again later.');
      }
      setPackages([]); // Ensure packages are empty on error
    } finally {
      setLoading(false);
    }
  }, []);

  // Load data on initial component mount
  useEffect(() => {
    fetchPackagesAndUserData();
  }, [fetchPackagesAndUserData]);

  const handlePurchaseClick = (pkg: Package) => {
    setSelectedPackage(pkg);
    setPurchaseDialogOpen(true);
  };

  const handlePurchaseClose = () => {
    setPurchaseDialogOpen(false);
    setSelectedPackage(null);
  };

  const handlePurchase = async () => {
    if (!selectedPackage) return;
    
    try {
      // TODO: Implement Stripe payment integration
      console.log('Processing purchase:', {
        package: selectedPackage,
        purchaseType,
      });
      
      // Close dialog after successful purchase
      handlePurchaseClose();
    } catch (error) {
      console.error('Error processing purchase:', error);
    }
  };

  const handleRefresh = () => {
    setLoading(true);
    setError(null);
    fetchPackagesAndUserData(true); // force fresh data
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'premium':
        return 'primary';
      case 'custom':
        return 'secondary';
      default:
        return 'default';
    }
  };

  // Memoize the package cards to prevent unnecessary re-renders
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
              transform: isActive ? 'none' : 'translateY(-4px)', // Prevent hover move for active
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
                ${pkg.price !== undefined ? pkg.price : pkg.monthly_cost}
              </Typography>
              {pkg.validity_period && (
                <Typography variant="body2" color="text.secondary">
                  Valid for {pkg.validity_period} days
                </Typography>
              )}
            </CardContent>
            <CardActions sx={{ justifyContent: 'center', pb: 2 }}>
              {isActive ? (
                <Chip label="Current Plan" color="success" variant="outlined" />
              ) : (
                <Button
                  size="small"
                  color="primary"
                  onClick={() => handlePurchaseClick(pkg)}
                  variant="contained"
                >
                  Purchase
                </Button>
              )}
            </CardActions>
          </Card>
        </Grid>
      );
    });
  }, [packages, currentPackageId, getTierColor, handlePurchaseClick]);

  if (loading) {
    return (
      <Box sx={{ width: '100%', py: 4 }}>
        <LinearProgress />
        <Typography variant="body2" sx={{ mt: 2, textAlign: 'center' }}>
          Loading available packages...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ width: '100%', py: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button 
          variant="outlined" 
          onClick={handleRefresh}
        >
          Try Again
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">
          Treatment Packages
        </Typography>
        <Button 
          variant="outlined" 
          onClick={handleRefresh}
        >
          Refresh
        </Button>
      </Box>

      {packages.length === 0 ? (
        <Card variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
          <ShoppingBasket sx={{ fontSize: 60, color: 'primary.light', mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            No packages available
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            There are currently no treatment packages available for purchase.
            Please check back later or contact your healthcare provider for more information.
          </Typography>
          <Button 
            variant="outlined" 
            onClick={handleRefresh}
          >
            Refresh
          </Button>
        </Card>
      ) : (
        <Grid container spacing={3}>
          {packageCards}
        </Grid>
      )}

      <Dialog
        open={purchaseDialogOpen}
        onClose={handlePurchaseClose}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Purchase Package
        </DialogTitle>
        <DialogContent>
          {selectedPackage && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="h6" gutterBottom>
                {selectedPackage.name}
              </Typography>
              <Typography variant="body1" gutterBottom>
                ${selectedPackage.price}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                {selectedPackage.description}
              </Typography>
              {selectedPackage.purchase_type === 'subscription' && (
                <FormControl fullWidth margin="normal">
                  <InputLabel>Purchase Type</InputLabel>
                  <Select
                    value={purchaseType}
                    onChange={(e) => setPurchaseType(e.target.value as PurchaseType)}
                    label="Purchase Type"
                  >
                    <MenuItem value="one-time">One-time Purchase</MenuItem>
                    <MenuItem value="subscription">Monthly Subscription</MenuItem>
                  </Select>
                </FormControl>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handlePurchaseClose}>Cancel</Button>
          <Button onClick={handlePurchase} variant="contained" color="primary">
            Purchase
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
} 