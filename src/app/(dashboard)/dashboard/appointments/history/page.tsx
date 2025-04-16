'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  MenuItem,
  CircularProgress,
  Alert,
  List,
  ListItem,
  ListItemText,
  Chip,
  Stack,
  Divider,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Pagination,
  Select,
  FormControl,
  InputLabel,
  SelectChangeEvent
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFnsV3';
import { format, parseISO, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase/client';
import { Appointment } from '@/types'; // Assuming this is the correct type

// Define a type for the data structure returned by this specific query
// This might differ slightly from the shared Appointment type if that type expects non-null properties
type FetchedAppointment = Omit<Appointment, 'type' | 'provider'> & {
  type: string | null; // Allow null type based on schema
  providers: { // Supabase returns related table name as key when not aliased explicitly
    id: string;
    user_id: string;
    first_name: string | null;
    last_name: string | null;
    specialization: string | null;
  } | null; // Provider might be null if FK is null
};

// Define DateRange type (adjust if needed based on DatePicker component)
interface DateRange {
  start: Date | null;
  end: Date | null;
}

export default function AppointmentHistoryPage() {
  const { user, profile, isProfileLoading } = useAuth();
  const [appointments, setAppointments] = useState<FetchedAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<DateRange>({
    start: null,
    end: null,
  });

  const [supabase] = useState(() => createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ));

  useEffect(() => {
    if (!isProfileLoading && (!profile || profile.role !== 'patient')) {
      setError('Access denied or profile not loaded.');
      setLoading(false);
      return;
    }

    if (profile && profile.role === 'patient' && profile.id) {
      fetchAppointments(profile.id);
    } else if (!isProfileLoading) {
      setError('Could not fetch appointments: Invalid user profile.');
      setLoading(false);
    }
  }, [profile, isProfileLoading]);

  const fetchAppointments = async (patientProfileId: string) => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch appointments for the patient
      const { data: appointmentsData, error: appointmentsError } = await supabase
        .from('appointments')
        .select('*') // Select all appointment fields
        .eq('patient_id', patientProfileId)
        .order('appointment_date', { ascending: false });

      if (appointmentsError) throw appointmentsError;
      if (!appointmentsData) {
        setAppointments([]);
        setLoading(false);
        return;
      }

      // 2. Extract unique provider IDs
      const providerIds = [...new Set(appointmentsData.map(a => a.provider_id).filter(id => id))];

      // 3. Fetch corresponding provider details
      let providersMap: Map<string, { id: string; first_name: string | null; last_name: string | null; specialization: string | null; }> = new Map();
      if (providerIds.length > 0) {
          const { data: providersData, error: providersError } = await supabase
              .from('providers')
              .select('id, first_name, last_name, specialization')
              .in('id', providerIds);

          if (providersError) throw providersError;
          
          providersData?.forEach(p => providersMap.set(p.id, p));
      }

      // 4. Combine appointment data with provider data
      const combinedData = appointmentsData.map(appt => ({
        ...appt,
        type: appt.type || null, // Keep null as per schema
        provider: providersMap.get(appt.provider_id) || null // Get provider from map, or null
      }));

      console.log("Fetched and combined appointments:", combinedData);
      // Use a type assertion here, acknowledging potential mismatch with shared Appointment type
      // Ideally, adjust shared Appointment type or use a specific type for this page.
      setAppointments(combinedData as any); // Use 'as any' to bypass strict check for now

    } catch (err: any) {
      console.error("Fetch appointments error:", err);
      setError(err.message || 'An error occurred fetching appointments');
      setAppointments([]); // Clear appointments on error
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  // Add types for prev
  const handleDateChange = (newRange: DateRange) => {
    setDateRange((prev: DateRange | null) => ({ ...prev, ...newRange }));
  };

  const handleStatusChange = (event: SelectChangeEvent<string>) => {
    setStatusFilter((prev: string) => event.target.value);
  };

  // Filtering logic using state variables
  const filteredAppointments = appointments.filter(appointment => {
    // Status filter
    const statusMatch = statusFilter === 'all' || appointment.status === statusFilter;

    // Date range filter
    const dateMatch = !dateRange.start || !dateRange.end ||
      isWithinInterval(parseISO(appointment.appointment_date), {
        start: startOfDay(dateRange.start),
        end: endOfDay(dateRange.end),
      });

    return statusMatch && dateMatch;
  });

  if (loading || isProfileLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 4 }}>
        <Typography variant="h4" gutterBottom>
          Appointment History
        </Typography>

        <Box sx={{ mb: 4, display: 'flex', gap: 2 }}>
          <TextField
            select
            label="Status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            sx={{ minWidth: 200 }}
          >
            <MenuItem value="all">All</MenuItem>
            <MenuItem value="scheduled">Scheduled</MenuItem>
            <MenuItem value="completed">Completed</MenuItem>
            <MenuItem value="cancelled">Cancelled</MenuItem>
          </TextField>

          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <DatePicker
              label="Start Date"
              value={dateRange.start}
              onChange={(date) => setDateRange(prev => ({ ...prev, start: date }))}
            />
            <DatePicker
              label="End Date"
              value={dateRange.end}
              onChange={(date) => setDateRange(prev => ({ ...prev, end: date }))}
            />
          </LocalizationProvider>
        </Box>

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Notes</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredAppointments.map((appointment) => (
                <TableRow key={appointment.id}>
                  <TableCell>
                    {format(parseISO(appointment.appointment_date), 'PPp')}
                  </TableCell>
                  <TableCell>{appointment.type}</TableCell>
                  <TableCell>{appointment.status}</TableCell>
                  <TableCell>{appointment.notes}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <Paper sx={{ mt: 4, p: 2 }}>
          <Typography>Appointments table will go here...</Typography>
          {/* Adjust display based on combinedData structure (includes provider object) */}
          <pre>{JSON.stringify(filteredAppointments, null, 2)}</pre>
        </Paper>
      </Box>
    </Container>
  );
} 