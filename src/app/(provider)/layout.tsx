'use client';

import React from 'react';
import { Box, Container, CircularProgress, Typography } from '@mui/material';
import ProviderMainLayout from '@/components/layouts/ProviderMainLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

export default function ProviderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, profile, isLoading } = useAuth();
  const router = useRouter();

  React.useEffect(() => {
    if (!isLoading && (!user || profile?.role !== 'provider')) {
      console.log('[ProviderLayout] useEffect redirecting to login (Not authenticated or not provider).');
      router.replace('/login');
    }
  }, [isLoading, user, profile, router]);

  if (isLoading) {
    console.log('[ProviderLayout] Initial loading...');
    return (
      <Container>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
          <CircularProgress />
          <Typography variant="h6" sx={{ mt: 4 }}>Loading Provider Dashboard...</Typography>
        </Box>
      </Container>
    );
  }

  if (!user || profile?.role !== 'provider') {
    console.log('[ProviderLayout] Rendering redirect state (Not authenticated or not provider after load).');
    return (
      <Container>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
          <CircularProgress />
          <Typography variant="h6" sx={{ mt: 4 }}>Redirecting...</Typography>
        </Box>
      </Container>
    );
  }

  console.log('[ProviderLayout] User is provider, rendering main layout:', user.id);
  return (
    <ProviderMainLayout>
      {children}
    </ProviderMainLayout>
  );
} 