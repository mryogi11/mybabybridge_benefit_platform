'use client';

import React from 'react';
import { Box, Container } from '@mui/material';
import Navigation from '@/components/Navigation';

export default function ProviderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Navigation />
      <Container maxWidth="lg" sx={{ mt: 4, mb: 8 }}>
        <Box sx={{ minHeight: 'calc(100vh - 200px)' }}>
          {children}
        </Box>
      </Container>
    </>
  );
} 