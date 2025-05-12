import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
  Alert,
  Button,
  CircularProgress,
} from '@mui/material';
import Link from 'next/link';
import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/supabase';

interface ActivityLog {
  id: string;
  timestamp: string;
  user_email: string | null;
  action_type: string | null;
  target_entity_type: string | null;
  description: string | null;
  status: string | null;
}

const LOG_PREVIEW_LIMIT = 5;

export default function ActivityLogs() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionFilter, setActionFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [availableActionTypes, setAvailableActionTypes] = useState<string[]>([]);

  const supabase = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

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
    }
  }, [supabase]);

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('activity_logs')
        .select('id, timestamp, user_email, action_type, target_entity_type, description, status');

      if (actionFilter && actionFilter !== 'all') {
        query = query.eq('action_type', actionFilter);
      }
      
      if (searchTerm) {
        query = query.or(
          `user_email.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`
        );
      }
      
      const { data, error: fetchError } = await query
        .order('timestamp', { ascending: false })
        .limit(LOG_PREVIEW_LIMIT);

      if (fetchError) {
        throw fetchError;
      }

      setLogs(data || []);
    } catch (err: any) {
      console.error('Error fetching activity logs preview:', err);
      setError(`Failed to fetch activity logs preview: ${err.message || 'Unknown error'}`);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [supabase, actionFilter, searchTerm]);

  useEffect(() => {
    fetchActionTypes();
  }, [fetchActionTypes]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleActionFilterChange = (event: any) => {
    setActionFilter(event.target.value);
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  return (
    <Paper sx={{ p: 3, mt: 4 }}>
      <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
        Activity Logs Preview
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <TextField fullWidth label="Search Preview" value={searchTerm} onChange={handleSearchChange} size="small" placeholder="Email or description"/>
        </Grid>
        <Grid item xs={12} md={6}>
          <FormControl fullWidth size="small">
            <InputLabel>Action Type</InputLabel>
            <Select value={actionFilter} label="Action Type" onChange={handleActionFilterChange}>
              <MenuItem value="all">All Actions</MenuItem>
              {availableActionTypes.map((type) => (
                <MenuItem key={type} value={type}>{type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
      </Grid>

      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Timestamp</TableCell>
              <TableCell>User</TableCell>
              <TableCell>Action</TableCell>
              <TableCell>Entity Type</TableCell>
              <TableCell>Description</TableCell>
              <TableCell>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} align="center"><CircularProgress size={24} sx={{ my: 1 }} /></TableCell>
              </TableRow>
            ) : logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  {searchTerm || actionFilter !== 'all' 
                    ? 'No matching logs found in preview'
                    : 'No recent activity logs'}
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log) => (
                <TableRow key={log.id} hover>
                  <TableCell>{new Date(log.timestamp).toLocaleString()}</TableCell>
                  <TableCell sx={{ wordBreak: 'break-all' }}>{log.user_email || '-'}</TableCell>
                  <TableCell>{log.action_type || '-'}</TableCell>
                  <TableCell>{log.target_entity_type || '-'}</TableCell>
                  <TableCell sx={{ maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {log.description || '-'}
                  </TableCell>
                  <TableCell>{log.status || '-'}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
        <Button 
          variant="contained" 
          component={Link} 
          href="/admin/analytics/logs"
        >
          Show All Logs
        </Button>
      </Box>
    </Paper>
  );
} 