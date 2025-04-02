'use client';

import { useState, useEffect } from 'react';
import { Box, Typography, Paper, Button, CircularProgress, Alert } from '@mui/material';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase/client';

export default function DashboardTestPage() {
  const { user, session, isLoading } = useAuth();
  const [authStatus, setAuthStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        setLoading(true);
        
        // Check auth directly from supabase
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        const { data: userData, error: userError } = await supabase.auth.getUser();
        
        setAuthStatus({
          contextUser: user,
          contextSession: session,
          supabaseSession: sessionData?.session,
          supabaseUser: userData?.user,
          sessionError: sessionError?.message,
          userError: userError?.message
        });
        
        if (sessionError || userError) {
          setError('Error checking authentication: ' + 
            (sessionError?.message || userError?.message));
        }
      } catch (err: any) {
        console.error('Error in auth check:', err);
        setError('Exception checking auth: ' + err.message);
      } finally {
        setLoading(false);
      }
    };
    
    if (!isLoading) {
      checkAuth();
    }
  }, [user, session, isLoading]);
  
  const handleForceLogout = async () => {
    try {
      await supabase.auth.signOut();
      window.location.href = '/login';
    } catch (err) {
      console.error('Error logging out:', err);
    }
  };

  if (isLoading || loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h4" gutterBottom>Dashboard Test Page</Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 4 }}>
          {error}
        </Alert>
      )}
      
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom>Authentication Status</Typography>
        
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1">
            User Authenticated: {user ? 'Yes' : 'No'}
          </Typography>
          <Typography variant="subtitle1">
            Session Active: {session ? 'Yes' : 'No'}
          </Typography>
        </Box>
        
        <Button 
          variant="contained" 
          color="primary"
          onClick={() => window.location.reload()}
          sx={{ mr: 2 }}
        >
          Refresh Page
        </Button>
        
        <Button 
          variant="outlined" 
          color="secondary"
          onClick={handleForceLogout}
        >
          Force Logout
        </Button>
      </Paper>
      
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>Debug Information</Typography>
        <pre style={{ overflowX: 'auto', background: '#f5f5f5', padding: 16 }}>
          {JSON.stringify(authStatus, null, 2)}
        </pre>
      </Paper>
    </Box>
  );
} 