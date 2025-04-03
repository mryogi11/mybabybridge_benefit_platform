'use client';

import React, { forwardRef } from 'react';
import { Box, SxProps, Theme } from '@mui/material';
import Image from 'next/image';
import Link from 'next/link';

interface LogoProps {
  sx?: SxProps<Theme>;
  width?: number;
  height?: number;
  disableLink?: boolean;
}

const Logo = forwardRef<HTMLDivElement, LogoProps>(
  ({ sx, width = 240, height = 60, disableLink = false }, ref) => {
    // The new logo has a different aspect ratio
    const aspectRatio = 3.2; // Adjusted for the new logo
    
    // Calculate height based on width to maintain aspect ratio
    const calculatedHeight = Math.round(width / aspectRatio);
    
    const logo = (
      <Box 
        ref={ref}
        sx={{ 
          display: 'flex', 
          alignItems: 'center',
          ...sx 
        }}
      >
        <Image
          src="/images/mybabybridge-logo-new.png"
          alt="MyBabyBridge Logo"
          width={width}
          height={calculatedHeight}
          priority
          style={{ 
            objectFit: 'contain',
            width: 'auto',
            height: 'auto',
            maxWidth: '100%'
          }}
        />
      </Box>
    );

    if (disableLink) {
      return logo;
    }

    return logo;
  }
);

Logo.displayName = 'Logo';

export default Logo; 