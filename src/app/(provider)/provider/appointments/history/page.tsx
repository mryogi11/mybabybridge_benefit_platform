'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  Stack,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
} from '@mui/material';
import { format, parseISO, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { supabase } from '@/lib/supabase';
import { Appointment } from '@/types';

export default function ProviderAppointmentHistoryPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<{
    start: Date | null;
    end: Date | null;
  }>({
    start: null,
    end: null,
  });

  useEffect(() => {
    fetchAppointments();
    const subscription = supabase
      .channel('appointments')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, fetchAppointments)
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchAppointments = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('appointments')
      .select(`
        *,
        patient:patients (
          first_name,
          last_name,
          phone
        )
      `)
      .eq('provider_id', user.id)
      .order('appointment_date', { ascending: false });

    if (error) {
      console.error('Error fetching appointments:', error);
      return;
    }

    setAppointments(data || []);
  };

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'primary';
      case 'completed':
        return 'success';
      case 'cancelled':
        return 'error';
      default:
        return 'default';
    }
  };

  const filteredAppointments = appointments.filter(appointment => {
    // Search term filter
    const searchMatch = searchTerm === '' || 
      appointment.patient?.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      appointment.patient?.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      appointment.patient?.phone?.includes(searchTerm);

    // Status filter
    const statusMatch = statusFilter === 'all' || appointment.status === statusFilter;

    // Date range filter
    const dateMatch = !dateRange.start || !dateRange.end || 
      isWithinInterval(parseISO(appointment.appointment_date), {
        start: startOfDay(dateRange.start),
        end: endOfDay(dateRange.end),
      });

    return searchMatch && statusMatch && dateMatch;
  });

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Appointment History
      </Typography>

      <Paper sx={{ p: 2, mb: 3 }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <TextField
            label="Search"
            variant="outlined"
            size="small"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            sx={{ width: 300 }}
          />
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={statusFilter}
              label="Status"
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="scheduled">Scheduled</MenuItem>
              <MenuItem value="completed">Completed</MenuItem>
              <MenuItem value="cancelled">Cancelled</MenuItem>
            </Select>
          </FormControl>
          <TextField
            label="Start Date"
            type="date"
            value={dateRange.start ? format(dateRange.start, 'yyyy-MM-dd') : ''}
            onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value ? new Date(e.target.value) : null }))}
            InputLabelProps={{ shrink: true }}
            size="small"
          />
          <TextField
            label="End Date"
            type="date"
            value={dateRange.end ? format(dateRange.end, 'yyyy-MM-dd') : ''}
            onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value ? new Date(e.target.value) : null }))}
            InputLabelProps={{ shrink: true }}
            size="small"
          />
        </Stack>
      </Paper>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Date & Time</TableCell>
              <TableCell>Patient</TableCell>
              <TableCell>Phone</TableCell>
              <TableCell>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredAppointments
              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
              .map((appointment) => (
                <TableRow key={appointment.id}>
                  <TableCell>
                    {format(parseISO(appointment.appointment_date), 'MMM d, yyyy h:mm a')}
                  </TableCell>
                  <TableCell>
                    {appointment.patient?.first_name} {appointment.patient?.last_name}
                  </TableCell>
                  <TableCell>{appointment.patient?.phone}</TableCell>
                  <TableCell>
                    <Chip
                      label={appointment.status}
                      color={getStatusColor(appointment.status)}
                      size="small"
                    />
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={filteredAppointments.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </TableContainer>
    </Box>
  );
} 