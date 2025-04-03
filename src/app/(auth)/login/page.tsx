'use client';

import React, { useState, useEffect } from 'react';
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
  const [redirectCountdown, setRedirectCountdown] = useState(3);
  const [userRole, setUserRole] = useState<User['role'] | null>(null);
  const router = useRouter();
  const { signIn, isLoading } = useAuth();
  const theme = useTheme();
  
  const checkSession = async () => {
    try {
      const { data } = await supabase.auth.getSession();
      
      if (data.session) {
        const { data: profileData, error: profileError } = await supabase
          .from('users')
          .select('role')
          .eq('id', data.session.user.id)
          .single();

        if (profileError) {
           console.warn('Session exists but failed to fetch profile on initial load:', profileError.message);
        } else if (profileData) {
          setUserRole(profileData.role);
          setLoginSuccess(true);
        }
      }
    } catch (err) {
      console.error('Error checking session:', err);
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    setUserRole(null);

    try {
      await supabase.auth.signOut();
      localStorage.removeItem('sb-access-token');
      localStorage.removeItem('sb-refresh-token');
      document.cookie = 'loggedIn=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';

      const result = await signIn(email, password);

      if (result?.session?.user?.id) {
        const { data: profileData, error: profileError } = await supabase
          .from('users')
          .select('role')
          .eq('id', result.session.user.id)
          .single();

        if (profileError) {
          console.error('Error fetching user profile:', profileError);
          setError('Login successful, but failed to retrieve user role. Please contact support.');
          setLoading(false);
          return;
        }

        if (profileData?.role) {
          setUserRole(profileData.role);
          setLoginSuccess(true);

          setLoggedInCookie();

          if (result.session?.access_token) {
              localStorage.setItem('sb-access-token', result.session.access_token);
          }
          if (result.session?.refresh_token) {
              localStorage.setItem('sb-refresh-token', result.session.refresh_token);
          }

        } else {
          setError('Login successful, but no role found for this user. Please contact support.');
          setLoading(false);
        }

      } else {
        setError('Login failed. Please check your credentials or try again.');
        setLoading(false);
      }
    } catch (err: any) {
      console.error('Login error:', err);
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
        return '/provider/provider';
      case 'patient':
      default:
        return '/dashboard';
    }
  };

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;

    if (loginSuccess && redirectCountdown > 0) {
      timer = setTimeout(() => {
        setRedirectCountdown(prev => prev - 1);
      }, 1000);
    }

    if (loginSuccess && userRole && redirectCountdown === 0) {
      const path = getRedirectPath(userRole);
      window.location.href = path;
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [loginSuccess, redirectCountdown, userRole]);

  const goToDesignatedDashboard = () => {
    if (userRole) {
      const path = getRedirectPath(userRole);
      setLoggedInCookie();
      window.location.href = path;
    } else {
       setError("Cannot redirect yet, user role not determined.");
    }
  };

  useEffect(() => {
    const setupAuth = async () => {
    };
    
    setupAuth();
    
    checkSession();
  }, []);

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
                  {userRole ? (
                    <>
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        Redirecting in {redirectCountdown} seconds...
                      </Typography>
                      <Button
                        variant="contained"
                        color="primary"
                        fullWidth
                        size="large"
                        sx={{ mt: 1, py: 1, fontSize: '1rem' }}
                        onClick={goToDesignatedDashboard}
                      >
                        Go Now
                      </Button>
                    </>
                  ) : (
                    <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                      <CircularProgress size={20} sx={{ mr: 1 }}/>
                      <Typography variant="body2">Fetching user details...</Typography>
                    </Box>
                  )}
                </Alert>
              )}

              <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1, opacity: loginSuccess ? 0.5 : 1, pointerEvents: loginSuccess ? 'none' : 'auto' }}>
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
                  disabled={loading || loginSuccess}
                  sx={{ mt: 2, mb: 1.5, py: 1 }}
                >
                  {loading ? <CircularProgress size={24} /> : "Sign In"}
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