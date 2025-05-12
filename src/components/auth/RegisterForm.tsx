'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  Alert,
  Link,
} from '@mui/material';
import { useAuth } from '@/contexts/AuthContext';
import { createActivityLog } from '@/services/activityLogService';

const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type RegisterFormData = z.infer<typeof registerSchema>;

export default function RegisterForm() {
  const router = useRouter();
  const { signUp } = useAuth();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterFormData) => {
    try {
      const email = data.email.trim();
      const password = data.password.trim();
      const firstName = data.firstName.trim();
      const lastName = data.lastName.trim();

      await signUp(email, password, firstName, lastName);
      router.push('/login?registered=true');

      // Add activity log after successful registration
      const user = await signUp(email, password, firstName, lastName);
      if (user) {
        await createActivityLog({
          userId: user.id,
          userEmail: user.email,
          actionType: 'USER_REGISTER',
          status: 'SUCCESS',
          description: 'User registered successfully.'
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        bgcolor: 'background.default',
      }}
    >
      <Paper
        elevation={3}
        sx={{
          p: 4,
          width: '100%',
          maxWidth: 400,
        }}
      >
        <Typography variant="h4" component="h1" gutterBottom align="center">
          Register
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit(onSubmit)}>
          <TextField
            fullWidth
            label="Email"
            type="email"
            margin="normal"
            error={!!errors.email}
            helperText={errors.email?.message}
            {...register('email')}
            sx={{ mb: 2 }}
          />

          <TextField
            fullWidth
            label="Password"
            type="password"
            margin="normal"
            error={!!errors.password}
            helperText={errors.password?.message}
            {...register('password')}
            sx={{ mb: 2 }}
          />

          <TextField
            fullWidth
            label="Confirm Password"
            type="password"
            margin="normal"
            error={!!errors.confirmPassword}
            helperText={errors.confirmPassword?.message}
            {...register('confirmPassword')}
            sx={{ mb: 3 }}
          />

          <TextField
            fullWidth
            label="First Name"
            margin="normal"
            error={!!errors.firstName}
            helperText={errors.firstName?.message}
            {...register('firstName')}
            sx={{ mb: 2 }}
          />

          <TextField
            fullWidth
            label="Last Name"
            margin="normal"
            error={!!errors.lastName}
            helperText={errors.lastName?.message}
            {...register('lastName')}
            sx={{ mb: 3 }}
          />

          <Button
            fullWidth
            type="submit"
            variant="contained"
            size="large"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Registering...' : 'Register'}
          </Button>
        </form>

        <Box sx={{ mt: 2, textAlign: 'center' }}>
          <Typography variant="body2">
            Already have an account?{' '}
            <Link href="/login" underline="hover">
              Login
            </Link>
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
} 