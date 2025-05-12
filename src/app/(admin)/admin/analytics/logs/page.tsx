'use client'; // This page involves client-side interaction (state, effects, UI events)

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
  Alert,
  CircularProgress, // Added CircularProgress
  Dialog, // Added Dialog
  DialogTitle, // Added DialogTitle
  DialogContent, // Added DialogContent
  DialogActions, // Added DialogActions
  Button, // Added Button
  IconButton, // Added IconButton
  Chip, // Added Chip
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close'; // Added CloseIcon
import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/supabase';

// Interface for the log structure
interface ActivityLog {
  id: string;
  timestamp: string;
  user_email: string | null; // Allow null
  action_type: string | null;
  target_entity_type: string | null;
  target_entity_id: string | null;
  description: string | null;
  status: string | null;
  details: Record<string, any> | null; // Keep details as it is part of the DB schema, even if not displayed directly
  ip_address: string | null;
  created_at?: string; // Add created_at as optional, might be selected by '*' 
}

// Helper function to determine Chip color based on status (from previous step)
const getStatusColor = (status: string | null): 'success' | 'error' | 'warning' | 'info' | 'default' => {
    switch (status?.toUpperCase()) {
        case 'SUCCESS': return 'success';
        case 'FAILURE': return 'error';
        case 'ATTEMPT': return 'warning';
        case 'INFO': return 'info';
        default: return 'default';
    }
};

// Component for the dedicated logs page
export default function DetailedActivityLogsPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [actionFilter, setActionFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [totalCount, setTotalCount] = useState(0);
  const [availableActionTypes, setAvailableActionTypes] = useState<string[]>([]);
  
  // State for the dialog
  const [selectedLog, setSelectedLog] = useState<ActivityLog | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const supabase = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Fetch distinct action types
  const fetchActionTypes = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('activity_logs')
        .select('action_type')
        .not('action_type', 'is', null);

      if (error) throw error;
      const uniqueTypes = Array.from(new Set(data.map(log => log.action_type).filter(Boolean) as string[]));
      setAvailableActionTypes(uniqueTypes);
    } catch (error) {
      console.error('Error fetching action types:', error);
      // Handle error silently or show a non-blocking warning
    }
  }, [supabase]);

  // Fetch logs with filters and pagination
  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Select columns needed for table AND dialog
      let query = supabase
        .from('activity_logs')
        .select('id, timestamp, user_email, action_type, target_entity_type, target_entity_id, description, status, ip_address, details', { count: 'exact' });

      if (actionFilter && actionFilter !== 'all') {
        query = query.eq('action_type', actionFilter);
      }
      
      if (searchTerm) {
        // Search across relevant text fields
        query = query.or(
          `user_email.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,action_type.ilike.%${searchTerm}%,target_entity_id.ilike.%${searchTerm}%`
        );
      }

      const from = page * rowsPerPage;
      const to = from + rowsPerPage - 1;
      
      const { data, error: fetchError, count } = await query
        .order('timestamp', { ascending: false })
        .range(from, to);

      if (fetchError) throw fetchError;

      // Explicitly cast the data before setting state
      setLogs((data as ActivityLog[]) || []); 
      setTotalCount(count || 0);
    } catch (err: any) {
      console.error('Error fetching activity logs:', err);
      setError(`Failed to fetch activity logs: ${err.message || 'Unknown error'}`);
      setLogs([]); // Clear logs on error
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [supabase, page, rowsPerPage, actionFilter, searchTerm]);

  // Fetch action types on mount
  useEffect(() => {
    fetchActionTypes();
  }, [fetchActionTypes]);

  // Fetch logs whenever dependencies change
  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Handlers (same as before)
  const handleChangePage = (_: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleActionFilterChange = (event: any) => {
    setActionFilter(event.target.value);
    setPage(0);
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
    setPage(0);
  };

  // Dialog handlers
  const handleRowClick = (log: ActivityLog) => {
    setSelectedLog(log);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedLog(null); // Clear selection on close
  };

  // Render the page
  return (
    <Container maxWidth="xl"> {/* Use wider container if needed */}
      <Box sx={{ py: 4 }}>
        <Typography variant="h4" gutterBottom sx={{ mb: 3 }}>
          Detailed Activity Logs
        </Typography>

        <Paper sx={{ p: 3 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {/* Filters and Search */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Search Logs"
                value={searchTerm}
                onChange={handleSearchChange}
                size="small"
                placeholder="e.g., user email, action, description, entity ID"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Action Type</InputLabel>
                <Select
                  value={actionFilter}
                  label="Action Type"
                  onChange={handleActionFilterChange}
                >
                  <MenuItem value="all">All Actions</MenuItem>
                  {availableActionTypes.map((type) => (
                    <MenuItem key={type} value={type}>
                      {/* Simple formatting */} 
                      {type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>

          {/* Log Table */}
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Timestamp</TableCell>
                  <TableCell>User Email</TableCell>
                  <TableCell>Action Type</TableCell>
                  <TableCell>Target Entity</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                        <CircularProgress size={24} sx={{ my: 2 }} />
                    </TableCell>
                  </TableRow>
                ) : logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      {searchTerm || actionFilter !== 'all' 
                        ? 'No matching activity logs found for the current filters.'
                        : 'No activity logs available.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log) => (
                    <TableRow 
                      key={log.id} 
                      hover 
                      onClick={() => handleRowClick(log)}
                      sx={{ cursor: 'pointer' }} // Make row look clickable
                    >
                      <TableCell>{new Date(log.timestamp).toLocaleString()}</TableCell>
                      <TableCell sx={{ wordBreak: 'break-all' }}>{log.user_email || '-'}</TableCell>
                      <TableCell>{log.action_type || '-'}</TableCell>
                      <TableCell>
                        {log.target_entity_type ? 
                         `${log.target_entity_type}${log.target_entity_id ? ': ' + log.target_entity_id : ''}` 
                         : '-'}
                      </TableCell>
                      <TableCell sx={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {log.description || '-'}
                      </TableCell>
                      <TableCell>{log.status || '-'}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Pagination */}
          <TablePagination
            component="div"
            count={totalCount}
            page={page}
            onPageChange={handleChangePage}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            rowsPerPageOptions={[10, 25, 50, 100]} // Added 100
          />
        </Paper>
      </Box>

      {/* Detail Dialog */}
      <Dialog 
        open={dialogOpen} 
        onClose={handleCloseDialog} 
        maxWidth="md" // Adjust size as needed
        fullWidth
      >
        <DialogTitle sx={{ m: 0, p: 2 }}>
          Log Entry Details
          <IconButton
            aria-label="close"
            onClick={handleCloseDialog}
            sx={{
              position: 'absolute',
              right: 8,
              top: 8,
              color: (theme) => theme.palette.grey[500],
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers> {/* dividers add padding and borders */}
          {selectedLog ? (
            <Grid container spacing={2} sx={{ pt: 1 }}>
               <Grid item xs={12} sm={6}><Typography variant="body1"><strong>ID:</strong></Typography><Typography variant="body2" color="text.secondary">{selectedLog.id}</Typography></Grid>
               <Grid item xs={12} sm={6}><Typography variant="body1"><strong>Timestamp:</strong></Typography><Typography variant="body2" color="text.secondary">{new Date(selectedLog.timestamp).toLocaleString()}</Typography></Grid>
               <Grid item xs={12} sm={6}><Typography variant="body1"><strong>User Email:</strong></Typography><Typography variant="body2" color="text.secondary">{selectedLog.user_email || 'N/A'}</Typography></Grid>
               <Grid item xs={12} sm={6}><Typography variant="body1"><strong>Action Type:</strong></Typography><Typography variant="body2" color="text.secondary">{selectedLog.action_type || 'N/A'}</Typography></Grid>
               <Grid item xs={12} sm={6}><Typography variant="body1"><strong>Status:</strong></Typography><Chip label={selectedLog.status || 'UNKNOWN'} color={getStatusColor(selectedLog.status)} size="small" /></Grid>
               <Grid item xs={12} sm={6}><Typography variant="body1"><strong>IP Address:</strong></Typography><Typography variant="body2" color="text.secondary">{selectedLog.ip_address || 'N/A'}</Typography></Grid>
               <Grid item xs={12} sm={6}><Typography variant="body1"><strong>Target Entity Type:</strong></Typography><Typography variant="body2" color="text.secondary">{selectedLog.target_entity_type || 'N/A'}</Typography></Grid>
               <Grid item xs={12} sm={6}><Typography variant="body1"><strong>Target Entity ID:</strong></Typography><Typography variant="body2" color="text.secondary">{selectedLog.target_entity_id || 'N/A'}</Typography></Grid>
               <Grid item xs={12}><Typography variant="body1"><strong>Description:</strong></Typography><Typography variant="body2" color="text.secondary">{selectedLog.description || 'N/A'}</Typography></Grid>
               
               {selectedLog.details && (
                   <Grid item xs={12}>
                       <Typography variant="body1" sx={{ mb: 1 }}><strong>Details (JSON):</strong></Typography>
                       <Box sx={{ maxHeight: 300, overflow: 'auto', backgroundColor: 'action.hover', p: 1, borderRadius: 1 }}>
                           <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                               {JSON.stringify(selectedLog.details, null, 2)}
                           </pre>
                       </Box>
                   </Grid>
               )}
            </Grid>
          ) : (
            <Typography>No log selected.</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Close</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
} 