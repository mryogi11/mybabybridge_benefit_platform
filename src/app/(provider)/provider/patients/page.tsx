'use client';

import React, { useState, useEffect } from 'react';
import { Box, Typography, Container, Paper, CircularProgress, Alert } from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { getPatientsForProvider, ProviderPatientListItem } from '@/actions/providerActions';
import { format } from 'date-fns';

// Define an extended interface for the DataGrid if we add fullName directly
interface ProviderPatientGridItem extends ProviderPatientListItem {
  fullName?: string;
}

const columns: GridColDef<ProviderPatientGridItem>[] = [
  {
    field: 'fullName', // Now a direct field
    headerName: 'Name',
    width: 200,
    // No valueGetter needed
  },
  {
    field: 'email',
    headerName: 'Email',
    width: 250,
    // No valueGetter - direct access works
  },
  {
    field: 'phone',
    headerName: 'Phone',
    width: 150,
    // No valueGetter - direct access, nulls will be blank or we can add a formatter if needed
  },
  {
    field: 'lastAppointmentDate',
    headerName: 'Last Appointment',
    width: 180,
    valueFormatter: (cellValue: string | null | undefined) => { // cellValue is string | null based on ProviderPatientListItem
        // console.log('[lastAppointmentDate valueFormatter] cellValue:', cellValue);
        if (cellValue === undefined || cellValue === null) return 'N/A'; 
        const date = new Date(cellValue); 
        return date.toString() !== 'Invalid Date' ? format(date, 'PPpp') : 'Invalid Date';
    },
  },
  {
    field: 'dateOfBirth',
    headerName: 'DOB',
    width: 120,
    // Use valueFormatter as dateOfBirth is a string (or null) from ProviderPatientListItem
    valueFormatter: (cellValue: string | null | undefined) => { 
        // console.log('[dob valueFormatter] cellValue:', cellValue);
        if (cellValue === undefined || cellValue === null) return 'N/A';
        const date = new Date(cellValue);
        return date.toString() !== 'Invalid Date' ? format(date, 'P') : 'Invalid Date';
    },
  },
  // Add more columns as needed, e.g., for actions like 'View Profile' or 'Send Message'
];

export default function ProviderPatientsPage() {
  // Use the extended item type for state
  const [patients, setPatients] = useState<ProviderPatientGridItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPatients = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await getPatientsForProvider();
        if (result.success && result.data) {
          // Pre-process data to add fullName
          const processedData = result.data.map(patient => ({
            ...patient,
            fullName: `${patient.firstName || ''} ${patient.lastName || ''}`.trim(),
          }));
          setPatients(processedData);
        } else {
          setError(result.error || 'Failed to load patients.');
          setPatients([]);
        }
      } catch (err: any) {
        setError(err.message || 'An unexpected error occurred.');
        setPatients([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPatients();
  }, []);

  // console.log('[ProviderPatientsPage] Patients data:', patients);

  if (isLoading) {
    return (
      <Container maxWidth="lg" sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 'calc(100vh - 128px)' }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Typography variant="h4" sx={{ mb: 3 }}>
        My Patients
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Paper sx={{ p: 0, height: '70vh', width: '100%' }}>
        <DataGrid
          rows={patients}
          columns={columns}
          getRowId={(row) => row.userId} // Use userId as the unique ID for rows
          initialState={{
            pagination: {
              paginationModel: { page: 0, pageSize: 10 },
            },
          }}
          pageSizeOptions={[5, 10, 20]}
          // checkboxSelection (optional)
          disableRowSelectionOnClick
        />
      </Paper>
    </Container>
  );
} 