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
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    setUserRole(null);

    try {
      const result = await signIn(email, password);

      console.log("Sign-in call completed. Waiting for AuthContext update...");

    } catch (err: any) {
      console.error('Login handleSubmit error:', err);
      setError(err?.message || 'An unexpected error occurred during login.');
      setLoading(false);
    }
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
    console.log("Redirect Check Effect: User:", user?.id, "Profile Role:", profile?.role);
    if (user && profile?.role) {
        if (!isAuthLoading && !isProfileLoading) { 
            const path = getRedirectPath(profile.role as User['role']);
            console.log(`AuthContext ready. Redirecting to: ${path}`);
            setLoginSuccess(true); 
            router.push(path);
        }
    }
  }, [user, profile, isAuthLoading, isProfileLoading, router]);

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
                  <Typography variant="caption" display="block" align="center" sx={{ mt: 1, mb: 1, color: 'text.secondary' }}>
                    By signing in, you agree to our data collection and analytics usage as outlined in our terms of service and privacy policy.
                  </Typography>
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