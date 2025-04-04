'use client';

import React from 'react';
import { Box, Typography, Container, Paper } from '@mui/material';

export default function ProviderPatientsPage() {

  // TODO: Fetch assigned patients list
  // TODO: Implement patient list display (DataGrid?)
  // TODO: Link to individual patient view?

  return (
    <Container maxWidth="lg">
      <Typography variant="h4" sx={{ mb: 3 }}>
        My Patients
      </Typography>

      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Patient List
        </Typography>
        <Typography sx={{ color: 'text.secondary' }}>
          Placeholder for displaying the list of patients assigned to this provider.
        </Typography>
        {/* Add patient list display here */}
      </Paper>
    </Container>
  );
} 