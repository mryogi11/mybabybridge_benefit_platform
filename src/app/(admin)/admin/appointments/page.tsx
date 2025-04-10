'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  CircularProgress,
  Alert
} from '@mui/material';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase/client';
import { Appointment } from '@/types'; // Assuming this is the correct type
// TODO: Add Table components from MUI (Table, TableBody, TableCell, etc.)
// TODO: Add filtering components (TextField, DatePicker, Select)

export default function AdminAppointmentsPage() {
  const { user, profile, isProfileLoading } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // TODO: Add state for filters (searchTerm, dateRange, statusFilter, etc.)

  useEffect(() => {
    // Initial check: Ensure user is loaded and is an admin
    if (!isProfileLoading && (!profile || profile.role !== 'admin')) {
      setError('Access denied. You must be an admin to view this page.');
      setLoading(false);
      return;
    }

    if (profile?.role === 'admin') {
      fetchAppointments();
    }
  }, [profile, isProfileLoading]);

  const fetchAppointments = async () => {
    setLoading(true);
    setError(null);
    try {
      // Admins fetch ALL appointments, joining patient and provider names
      const { data, error: fetchError } = await supabase
        .from('appointments')
        .select(`
          *,
          patient:patient_profiles (id, user_id, first_name, last_name),
          provider:providers (id, user_id, first_name, last_name, specialization)
        `)
        .order('appointment_date', { ascending: false }); // Default order

      if (fetchError) {
        throw fetchError;
      }

      console.log("Admin: Fetched appointments:", data);
      setAppointments((data || []) as Appointment[]); // Use base type

    } catch (err: any) {
      console.error("Error fetching appointments for admin:", err);
      setError(err.message || "Failed to fetch appointments.");
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  };

  // TODO: Implement filtering logic based on state
  // const filteredAppointments = appointments.filter(...);

  // Render Logic
  if (loading || isProfileLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom mb={3}>
        Manage All Appointments
      </Typography>

      {/* TODO: Add Filter Controls (Search, Date, Status) */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography>Filter controls will go here...</Typography>
      </Paper>

      {/* TODO: Add Appointment Table */}
      <Paper sx={{ p: 2 }}>
        <Typography>Appointments table will go here...</Typography>
         <pre>{JSON.stringify(appointments, null, 2)}</pre> {/* Temporary data display */}
      </Paper>

    </Container>
  );
} 