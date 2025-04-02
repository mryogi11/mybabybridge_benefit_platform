'use client';

import React, { useEffect, useState } from 'react';
import { Box, Container, CircularProgress, Typography, Button } from '@mui/material';
import Navigation from '@/components/Navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';

// Helper function to check if the loggedIn cookie exists
const hasLoggedInCookie = () => {
  return document.cookie.split(';').some(item => item.trim().startsWith('loggedIn='));
};

// Force set the loggedIn cookie
const setLoggedInCookie = () => {
  document.cookie = 'loggedIn=true; path=/;';
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [hasManuallyCheckedCookie, setHasManuallyCheckedCookie] = useState(false);
  
  // Set the cookie on component mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Force set the cookie - this ensures we can access the dashboard
      setLoggedInCookie();
      console.log('Dashboard layout - Force set loggedIn cookie');
    }
  }, []);
  
  useEffect(() => {
    async function checkAuth() {
      console.log('Dashboard layout - Checking authentication');
      
      try {
        // First check for the loggedIn cookie (our simple auth approach)
        if (typeof window !== 'undefined') {
          const hasLoginCookie = hasLoggedInCookie();
          console.log('Dashboard layout - Login cookie exists:', hasLoginCookie);
          
          if (hasLoginCookie) {
            console.log('Dashboard layout - Login cookie found, allowing access');
            setHasManuallyCheckedCookie(true);
            setIsCheckingAuth(false);
            return; // Allow access based on cookie alone
          }
          
          // Check for access token in localStorage as a fallback
          const hasAccessToken = localStorage.getItem('sb-access-token');
          if (hasAccessToken) {
            console.log('Dashboard layout - Access token found in localStorage');
            // Set the cookie since we have a token
            setLoggedInCookie();
            setHasManuallyCheckedCookie(true);
            setIsCheckingAuth(false);
            return; // Allow access based on local storage token
          }
        }
        
        // If we don't have the cookie, check Supabase session
        const { data } = await supabase.auth.getSession();
        console.log('Dashboard layout - Session check result:', !!data.session);
        
        if (data.session) {
          // If we have a session but no cookie, set the cookie
          if (typeof window !== 'undefined') {
            setLoggedInCookie();
            console.log('Dashboard layout - Set loggedIn cookie based on session');
          }
          setIsCheckingAuth(false);
          return; // Allow access based on session
        }
        
        // If no cookie and no session, redirect to login
        console.log('Dashboard layout - No authentication found, redirecting to login');
        router.push('/login');
      } catch (error) {
        console.error('Dashboard layout - Error checking auth:', error);
        setIsCheckingAuth(false);
      }
    }
    
    checkAuth();
  }, [router]);
  
  // Show loading state while checking authentication
  if (isLoading || isCheckingAuth) {
    return (
      <Container>
        <Box 
          sx={{ 
            display: 'flex', 
            flexDirection: 'column',
            alignItems: 'center', 
            justifyContent: 'center',
            minHeight: '100vh',
          }}
        >
          <CircularProgress />
          <Typography variant="h6" sx={{ mt: 4 }}>
            Verifying your authentication...
          </Typography>
        </Box>
      </Container>
    );
  }
  
  // If no user from auth context but we've manually verified the cookie, 
  // still show the dashboard
  if (!user && !hasManuallyCheckedCookie) {
    return (
      <Container>
        <Box 
          sx={{ 
            display: 'flex', 
            flexDirection: 'column',
            alignItems: 'center', 
            justifyContent: 'center',
            minHeight: '100vh',
          }}
        >
          <CircularProgress />
          <Typography variant="h6" sx={{ mt: 4 }}>
            Redirecting to login...
          </Typography>
        </Box>
      </Container>
    );
  }

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