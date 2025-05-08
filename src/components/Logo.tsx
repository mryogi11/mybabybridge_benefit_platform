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
  collapsed?: boolean;
}

const Logo = forwardRef<HTMLDivElement, LogoProps>(
  ({ sx, width: initialWidth = 240, height: initialHeight, disableLink = false, collapsed = false }, ref) => {
    const aspectRatio = 3.2;
    const collapsedWidth = 40;
    const collapsedHeight = Math.round(collapsedWidth / aspectRatio);

    let renderWidth: number;
    let renderHeight: number;

    if (collapsed) {
      renderWidth = collapsedWidth;
      renderHeight = collapsedHeight;
    } else if (initialHeight) {
      renderHeight = initialHeight;
      renderWidth = Math.round(initialHeight * aspectRatio);
    } else {
      renderWidth = initialWidth;
      renderHeight = Math.round(initialWidth / aspectRatio);
    }
    
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
          width={renderWidth}
          height={renderHeight}
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