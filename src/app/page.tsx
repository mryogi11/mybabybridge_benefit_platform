'use client';

import { Box, Button, Typography, Container, Grid, useTheme, Paper } from '@mui/material';
import Link from 'next/link';
import Image from 'next/image';
import Logo from '@/components/Logo';
import FamilyRestroom from '@mui/icons-material/FamilyRestroom';
import ChildCare from '@mui/icons-material/ChildCare';
import Favorite from '@mui/icons-material/Favorite';

export default function HomePage() {
  const theme = useTheme();
  
  return (
    <Container maxWidth="xl" disableGutters>
      <Grid container sx={{ minHeight: '100vh' }}>
        {/* Left side - Content */}
        <Grid item xs={12} md={6} 
          sx={{ 
            display: 'flex', 
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: { xs: 'center', md: 'flex-start' },
            p: 4,
            backgroundColor: '#f5f5f5',
            position: 'relative',
            zIndex: 1
          }}
        >
          <Box 
            sx={{ 
              maxWidth: 600, 
              width: '100%',
              px: { xs: 2, sm: 4 },
              py: { xs: 4, sm: 6 },
              display: 'flex',
              flexDirection: 'column',
              alignItems: { xs: 'center', md: 'flex-start' }
            }}
          >
            <Logo width={280} disableLink={true} />
            
            <Typography 
              variant="h3" 
              component="h1" 
              fontWeight="bold"
              sx={{ 
                mt: 4, 
                mb: 2,
                color: theme.palette.primary.main,
                textAlign: { xs: 'center', md: 'left' }
              }}
            >
              Family-Centered Care for Your Little One
            </Typography>
            
            <Typography 
              variant="h6" 
              sx={{ 
                mb: 4, 
                color: 'text.secondary',
                textAlign: { xs: 'center', md: 'left' }
              }}
            >
              Supporting your journey with compassionate care and innovative treatment plans
            </Typography>
            
            <Box sx={{ 
              display: 'flex', 
              gap: 2, 
              mt: 2,
              flexDirection: { xs: 'column', sm: 'row' },
              width: { xs: '100%', sm: 'auto' }
            }}>
              <Button 
                component={Link} 
                href="/login" 
                variant="contained" 
                color="primary" 
                size="large"
                sx={{ 
                  py: 1.5, 
                  px: 4, 
                  fontWeight: 'bold',
                  width: { xs: '100%', sm: 'auto' }
                }}
              >
                Sign In
              </Button>
              <Button 
                component={Link} 
                href="/register" 
                variant="outlined" 
                color="primary" 
                size="large"
                sx={{ 
                  py: 1.5, 
                  px: 4,
                  fontWeight: 'bold',
                  width: { xs: '100%', sm: 'auto' }
                }}
              >
                Register
              </Button>
            </Box>
          </Box>
        </Grid>
        
        {/* Right side - Home image background */}
        <Grid item xs={12} md={6} sx={{ position: 'relative', display: { xs: 'none', md: 'block' } }}>
          <Box
            sx={{
              position: 'relative',
              width: '100%',
              height: '100%',
              background: `linear-gradient(145deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
              overflow: 'hidden',
            }}
          >
            {/* Home background image with transparency */}
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                opacity: 0.85,
              }}
            >
              <Image
                src="/images/home.png"
                alt="Happy family with baby"
                fill
                style={{
                  objectFit: 'cover',
                  objectPosition: 'center',
                }}
                priority
              />
            </Box>
          </Box>
          
          <Paper 
            elevation={3}
            sx={{
              position: 'absolute',
              bottom: 20,
              left: 20,
              p: 1.5,
              maxWidth: 180,
              backgroundColor: 'rgba(255,255,255,0.9)',
              backdropFilter: 'blur(10px)',
              borderRadius: 2,
              zIndex: 2,
              fontSize: '0.85rem'
            }}
          >
            <Typography variant="body2" fontWeight="bold" color="primary.main" sx={{ mb: 0.5 }}>
              "Our IVF journey led to our beautiful miracle"
            </Typography>
            <Typography variant="caption" display="block">
              The specialized IVF treatments at MyBabyBridge gave us hope when we thought all was lost.
            </Typography>
            <Typography variant="caption" sx={{ mt: 0.5, fontStyle: 'italic', display: 'block', fontSize: '0.7rem' }}>
              - Emma & James, IVF Success Story
            </Typography>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
} 