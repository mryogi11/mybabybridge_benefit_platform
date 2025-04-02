'use client';

import React, { useState, useEffect } from 'react';
import { Box, Container } from '@mui/material';
import { usePathname } from 'next/navigation';
import dynamic from 'next/dynamic';
import SkeletonLoader from '@/components/SkeletonLoader';

// Create a page loading state
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [loading, setLoading] = useState(false);
  const [pageType, setPageType] = useState<'dashboard' | 'list' | 'form' | 'profile' | 'detail'>('dashboard');

  // Determine the page type based on the pathname for appropriate skeleton
  useEffect(() => {
    // Reset loading state immediately when path changes
    setLoading(true);

    // Determine which type of skeleton to show based on the path
    if (pathname === '/dashboard') {
      setPageType('dashboard');
    } else if (pathname.includes('/profile')) {
      setPageType('profile');
    } else if (
      pathname.includes('/appointments') || 
      pathname.includes('/treatment-plans') || 
      pathname.includes('/packages') ||
      pathname.includes('/notifications')
    ) {
      setPageType('list');
    } else if (pathname.includes('/settings')) {
      setPageType('form');
    } else {
      setPageType('detail');
    }

    // Use a short timeout to simulate page loading and avoid flash
    const timer = setTimeout(() => {
      setLoading(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [pathname]);

  return (
    <Container maxWidth="lg" sx={{ py: 2 }}>
      <Box sx={{ minHeight: 'calc(100vh - 200px)' }}>
        {loading ? <SkeletonLoader type={pageType} /> : children}
      </Box>
    </Container>
  );
} 