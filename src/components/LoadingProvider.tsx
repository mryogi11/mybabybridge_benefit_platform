'use client';

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { 
  Backdrop, 
  CircularProgress, 
  Box, 
  Typography, 
  Paper,
  useTheme
} from '@mui/material';
import { usePathname, useSearchParams } from 'next/navigation';

// Create context
interface LoadingContextType {
  isLoading: boolean;
  setLoading: (loading: boolean) => void;
  showLoading: (message?: string) => void;
  hideLoading: () => void;
}

const LoadingContext = createContext<LoadingContextType>({
  isLoading: false,
  setLoading: () => {},
  showLoading: () => {},
  hideLoading: () => {},
});

// Custom hook to use the loading context
export const useLoading = () => useContext(LoadingContext);

export default function LoadingProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState<string | undefined>(undefined);
  
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const theme = useTheme();
  const loadingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const maxLoadingTime = 10000; // Maximum loading time in milliseconds (10 seconds)

  // Reset loading state on route change
  useEffect(() => {
    setIsLoading(false);
    if (loadingTimerRef.current) {
      clearTimeout(loadingTimerRef.current);
      loadingTimerRef.current = null;
    }
  }, [pathname, searchParams]);

  // Create a debounced version of setIsLoading to prevent flashing for quick operations
  useEffect(() => {
    if (!isLoading) {
      setLoadingMessage(undefined);
      if (loadingTimerRef.current) {
        clearTimeout(loadingTimerRef.current);
        loadingTimerRef.current = null;
      }
    }
    
    return () => {
      if (loadingTimerRef.current) {
        clearTimeout(loadingTimerRef.current);
        loadingTimerRef.current = null;
      }
    };
  }, [isLoading]);

  const showLoading = (message?: string) => {
    // Clear any existing timers
    if (loadingTimerRef.current) {
      clearTimeout(loadingTimerRef.current);
    }
    
    // Set a safety timeout to automatically hide loading after maxLoadingTime
    loadingTimerRef.current = setTimeout(() => {
      console.warn(`Loading state automatically cleared after ${maxLoadingTime/1000} seconds`);
      setIsLoading(false);
      setLoadingMessage(undefined);
      loadingTimerRef.current = null;
    }, maxLoadingTime);
    
    setLoadingMessage(message);
    setIsLoading(true);
  };

  const hideLoading = () => {
    if (loadingTimerRef.current) {
      clearTimeout(loadingTimerRef.current);
      loadingTimerRef.current = null;
    }
    setIsLoading(false);
  };

  return (
    <LoadingContext.Provider value={{ isLoading, setLoading: setIsLoading, showLoading, hideLoading }}>
      {children}
      <Backdrop
        sx={{
          zIndex: theme.zIndex.drawer + 1,
          color: '#fff',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        open={isLoading}
      >
        <Box sx={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <CircularProgress color="primary" size={60} thickness={4} />
          {loadingMessage && (
            <Paper 
              elevation={3}
              sx={{ 
                mt: 3, 
                py: 1.5, 
                px: 3, 
                borderRadius: 2,
                backgroundColor: 'rgba(255,255,255,0.9)',
                maxWidth: 350
              }}
            >
              <Typography variant="body1" color="text.primary" textAlign="center">
                {loadingMessage}
              </Typography>
            </Paper>
          )}
        </Box>
      </Backdrop>
    </LoadingContext.Provider>
  );
} 