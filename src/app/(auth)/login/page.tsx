'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Button,
  Container,
  TextField,
  Typography,
  Paper,
  Link as MuiLink,
  Alert,
  CircularProgress,
  Grid,
  useTheme,
} from '@mui/material';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Logo from '@/components/Logo';
import { supabase } from '@/lib/supabase/client';
import { Favorite, ChildCare, FamilyRestroom } from '@mui/icons-material';
import { User } from '@/types/user';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);
  const [userRole, setUserRole] = useState<User['role'] | null>(null);
  const router = useRouter();
  const { signIn, isLoading: isAuthLoading, user, profile, isProfileLoading } = useAuth();
  const theme = useTheme();
  
  const checkSession = useCallback(async () => {
    try {
      console.log("Checking for existing session...");
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        console.error('Error fetching session:', error.message);
        return;
      }

      if (data && data.session && data.session.user) {
        const userId = data.session.user.id;
        console.log('Existing session found for user:', userId);

        const { data: profileData, error: profileError } = await supabase
          .from('users')
          .select('role')
          .eq('id', userId)
          .single();

        if (profileError) {
          console.warn('Session exists but failed to fetch profile on initial load:', profileError.message);
        } else if (profileData && profileData.role) {
          console.log('Profile fetched, user role:', profileData.role);
          setUserRole(profileData.role);
          setLoginSuccess(true);
        } else {
            console.warn('Session exists and profile fetched, but no role found for user:', userId);
        }
      } else {
        console.log('No active session found.');
      }
    } catch (err) {
        if (err instanceof Error) {
            console.error('Error in checkSession function:', err.message);
        } else {
            console.error('An unknown error occurred in checkSession:', err);
        }
    }
  }, []);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    setUserRole(null);

    try {
      const result = await signIn(email, password);

      if (!result || !result.session) {
         setError('Login failed. Please check your credentials.');
         setLoading(false);
         return;
      }

      console.log("Sign-in call potentially successful, waiting for AuthContext update...");

    } catch (err: any) {
      console.error('Login handleSubmit error:', err);
      setError(err?.message || 'An unexpected error occurred during login.');
      setLoading(false);
    }
  };

  const setLoggedInCookie = () => {
    document.cookie = 'loggedIn=true; path=/;';
  };

  const getRedirectPath = (role: User['role'] | null): string => {
    switch (role) {
      case 'admin':
      case 'staff':
        return '/admin';
      case 'provider':
        return '/provider/dashboard';
      case 'patient':
      default:
        return '/dashboard';
    }
  };

  useEffect(() => {
    if (loginSuccess && userRole) {
      const path = getRedirectPath(userRole);
      console.log(`Login successful. Redirecting immediately to: ${path}`);
      setLoggedInCookie();
      router.push(path);
    }
  }, [loginSuccess, userRole, router]);

  useEffect(() => {
    if (loading && !isAuthLoading && !isProfileLoading) {
       console.log("AuthContext updated after login attempt. User:", user?.id, "Profile Role:", profile?.role);
      if (user && profile?.role) {
        console.log("Setting local login success state...");
        setUserRole(profile.role as User['role']);
        setLoginSuccess(true);
        setLoading(false);
      } else if (user && !profile) {
         console.warn("User context updated, but profile role not yet available.");
      } else if (!user) {
          console.error("Login attempt finished, but no user found in AuthContext.");
          setError("Login completed but user session is invalid. Please try again.");
          setLoading(false);
      }
    }
  }, [user, profile, loading, isAuthLoading, isProfileLoading]);

  useEffect(() => {
    const setupAuth = async () => {
    };
    
    setupAuth();
    
    checkSession();
  }, [checkSession]);

  return (
    <Container component="main" maxWidth={false} disableGutters>
      <Grid container sx={{ minHeight: '100vh' }}>
        <Grid item xs={12} md={6} 
          sx={{ 
            display: 'flex', 
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            p: { xs: 2, sm: 3 },
            backgroundColor: '#f5f5f5',
            pt: { xs: 1, sm: 1.5 },
          }}
        >
          <Box
            sx={{
              maxWidth: 450,
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            <Box sx={{ mb: 2 }}>
              <Logo width={220} />
            </Box>

            <Paper
              elevation={3}
              sx={{
                padding: { xs: 2, sm: 3 },
                width: '100%',
                borderRadius: 2,
              }}
            >
              <Typography component="h1" variant="h5" align="center" sx={{ mb: 2 }}>
                Sign in to your account
              </Typography>

              {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {error}
                </Alert>
              )}

              {loginSuccess && (
                <Alert severity="success" sx={{ mb: 2 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>
                    Login successful!
                  </Typography>
                  <Typography variant="body2">
                     Redirecting now...
                  </Typography>
                </Alert>
              )}

              {!loginSuccess && (
                <Box component="form" onSubmit={handleSubmit} noValidate>
                  <TextField
                    margin="normal"
                    required
                    fullWidth
                    id="email"
                    label="Email Address"
                    name="email"
                    autoComplete="email"
                    autoFocus
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    sx={{ mb: 1.5 }}
                  />
                  <TextField
                    margin="normal"
                    required
                    fullWidth
                    name="password"
                    label="Password"
                    type="password"
                    id="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    sx={{ mt: 0 }}
                  />
                  <Button
                    type="submit"
                    fullWidth
                    variant="contained"
                    color="primary"
                    disabled={loading || isAuthLoading || isProfileLoading || loginSuccess}
                    sx={{ mt: 2, mb: 1.5, py: 1 }}
                  >
                    {(loading || isAuthLoading || isProfileLoading) ? <CircularProgress size={24} /> : "Sign In"}
                  </Button>
                  <Box sx={{ mt: 1, textAlign: 'center' }}>
                    <Typography variant="body2">
                      Don't have an account?{' '}
                      <MuiLink component={Link} href="/register" variant="body2" underline="hover">
                        Sign up
                      </MuiLink>
                    </Typography>
                  </Box>
                </Box>
              )}
            </Paper>
          </Box>
        </Grid>

        <Grid item xs={12} md={6} sx={{ display: { xs: 'none', md: 'block' }, position: 'relative' }}>
          <Box
            sx={{
              position: 'relative',
              width: '100%',
              height: '100%',
              background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
              overflow: 'hidden',
            }}
          >
            <Box sx={{ 
              position: 'absolute', 
              top: '20%', 
              left: '20%',
              color: 'rgba(255,255,255,0.2)',
              transform: 'scale(6)',
            }}>
              <FamilyRestroom fontSize="large" />
            </Box>
            
            <Box sx={{ 
              position: 'absolute', 
              top: '50%', 
              right: '20%',
              color: 'rgba(255,255,255,0.2)',
              transform: 'scale(5)',
            }}>
              <ChildCare fontSize="large" />
            </Box>
            
            <Box sx={{ 
              position: 'absolute', 
              bottom: '20%', 
              left: '35%',
              color: 'rgba(255,255,255,0.2)',
              transform: 'scale(4)',
            }}>
              <Favorite fontSize="large" />
            </Box>
            
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                background: 'radial-gradient(circle at 70% 30%, rgba(255,255,255,0.1) 0%, transparent 70%)',
              }}
            />
          </Box>
        </Grid>
      </Grid>
    </Container>
  );
} 