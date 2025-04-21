'use client';

import React, { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Box, Container, CircularProgress, Typography } from '@mui/material';
import { BenefitVerificationProvider } from '@/contexts/BenefitVerificationContext';

// Helper function to determine the redirect path based on role
const getHomeRouteForRole = (role: string | undefined): string => {
  switch (role) {
    case 'admin':
      return '/admin';
    case 'provider':
      return '/provider/dashboard';
    case 'patient':
    default:
      return '/dashboard'; // Default patient dashboard
  }
};

interface BenefitVerificationLayoutProps {
  children: React.ReactNode;
}

export default function BenefitVerificationLayout({ children }: BenefitVerificationLayoutProps) {
  const { user, profile, isLoading: isAuthLoading, isProfileLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Wait until both auth and profile loading are complete
    if (isAuthLoading || isProfileLoading) {
      console.log('[Benefit Layout] Waiting for auth/profile...');
      return;
    }

    console.log('[Benefit Layout] Checking access...', { user: !!user, profile });

    // 1. Check Authentication
    if (!user) {
      console.log('[Benefit Layout] No user found, redirecting to login.');
      router.replace('/login'); // Use replace to avoid history buildup
      return;
    }

    // 2. Check Role
    if (!profile || profile.role !== 'patient') {
      const homeRoute = getHomeRouteForRole(profile?.role);
      console.log(`[Benefit Layout] User role is not patient ('${profile?.role}'), redirecting to ${homeRoute}.`);
      router.replace(homeRoute);
      return;
    }

    // 3. Check Benefit Status - **REVISED LOGIC**
    // Redirect ONLY if status is 'verified'. Allow all other statuses (not_started, pending, declined, etc.)
    if (profile.benefit_status === 'verified') {
       console.log(`[Benefit Layout] User benefit status is 'verified', redirecting to dashboard.`);
       router.replace('/dashboard'); 
       return;
    }

    // 4. If auth, role=patient, and status is NOT verified, grant access.
    console.log(`[Benefit Layout] Access granted to benefit flow (Status: ${profile.benefit_status}).`);

  }, [user, profile, isAuthLoading, isProfileLoading, router]);

  // Show loading indicator while checks are performed or if redirection is needed
  // Condition revised: Show loading unless user is patient and status is NOT verified.
  const showLoading = isAuthLoading || 
                      isProfileLoading || 
                      !user || 
                      profile?.role !== 'patient' || 
                      profile?.benefit_status === 'verified'; 

  if (showLoading) {
    return (
      <Container maxWidth="sm">
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
          <CircularProgress />
          <Typography sx={{ ml: 2 }}>Verifying access...</Typography>
        </Box>
      </Container>
    );
  }

  // This layout wraps all pages within the (benefit-verification) route group
  // It applies the context provider so all steps share the same verification state.
  return (
    <BenefitVerificationProvider>
      {/* We could add a shared wrapper/styling for the verification flow here if needed */}
      {children}
    </BenefitVerificationProvider>
  );
} 