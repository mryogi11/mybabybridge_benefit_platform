'use client';

import React, { useEffect, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  LinearProgress,
  IconButton,
  Menu,
  MenuItem,
  Chip,
  TextField,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  Divider,
} from '@mui/material';
import {
  MoreVert as MoreVertIcon,
} from '@mui/icons-material';
import { supabase } from '@/lib/supabase/client';
import { User, UserRole, UserActivity } from '@/types';

import { DataGrid, GridColDef, GridRenderCellParams, GridValueGetter } from '@mui/x-data-grid';
import { format } from 'date-fns';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`user-tabpanel-${index}`}
      aria-labelledby={`user-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const RoleChip = ({ role }: { role: UserRole }) => {
  const getRoleProps = (role: UserRole) => {
    switch (role) {
      case 'admin': return { color: 'error' as const, label: 'Admin' };
      case 'staff': return { color: 'warning' as const, label: 'Staff' };
      case 'provider': return { color: 'info' as const, label: 'Provider' };
      case 'patient': return { color: 'success' as const, label: 'Patient' };
      default: return { color: 'default' as const, label: role };
    }
  };
  const props = getRoleProps(role);
  return <Chip label={props.label} color={props.color} size="small" />;
};

export default function UsersManagementPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedUserForMenu, setSelectedUserForMenu] = useState<User | null>(null);
  const [selectedUserForDetails, setSelectedUserForDetails] = useState<User | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const [userActivities, setUserActivities] = useState<UserActivity[]>([]);
  const [addUserOpen, setAddUserOpen] = useState(false);
  const [newUser, setNewUser] = useState({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    role: 'patient' as UserRole
  });
  const [addUserLoading, setAddUserLoading] = useState(false);
  const [addUserError, setAddUserError] = useState<string | null>(null);

  useEffect(() => {
    const syncAndFetchUsers = async () => {
      try {
        setLoading(true);
        // First sync users to ensure all auth.users are in our users table
        const response = await fetch('/api/auth/sync-users');
        if (!response.ok) {
          console.error('Error syncing users:', await response.text());
        } else {
          const result = await response.json();
          console.log('User sync result:', result);
        }
        
        // Then fetch users
        await fetchUsers();
      } catch (error) {
        console.error('Error in sync and fetch:', error);
        setLoading(false);
      }
    };
    
    syncAndFetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      console.log('Fetching users...');
      
      // Try to fetch from the users_view instead of users table
      const { data: usersData, error: usersError } = await supabase
        .from('users_view')
        .select('*')
        .order('created_at', { ascending: false });

      if (usersError) {
        console.error('Error fetching from users_view:', usersError);
        
        // Fall back to users table if view doesn't exist
        const { data: directUsersData, error: directUsersError } = await supabase
          .from('users')
          .select('*')
          .order('created_at', { ascending: false });
          
        if (directUsersError) {
          console.error('Error fetching from users table directly:', directUsersError);
          setUsers([]);
        } else {
          console.log('Users data from direct table:', directUsersData);
          setUsers(directUsersData || []);
        }
      } else {
        console.log('Users data from view:', usersData);
        setUsers(usersData || []);
      }
    } catch (error) {
      console.error('Unhandled error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserActivities = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_activities')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUserActivities(data || []);
    } catch (error) {
      console.error('Error fetching user activities:', error);
    }
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, user: User) => {
    setAnchorEl(event.currentTarget);
    setSelectedUserForMenu(user);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedUserForMenu(null);
  };

  const handleRoleChange = async (newRole: UserRole) => {
    if (!selectedUserForMenu) return;

    try {
      const { error } = await supabase
        .from('users')
        .update({ role: newRole })
        .eq('id', selectedUserForMenu.id);

      if (error) throw error;

      setUsers(users.map(user =>
        user.id === selectedUserForMenu.id
          ? { ...user, role: newRole }
          : user
      ));
    } catch (error) {
      console.error('Error updating user role:', error);
    } finally {
      handleMenuClose();
    }
  };

  const handleDetailsOpen = async (user: User) => {
    setSelectedUserForDetails(user);
    setDetailsOpen(true);
    await fetchUserActivities(user.id);
  };

  const handleDetailsClose = () => {
    setDetailsOpen(false);
    setSelectedUserForDetails(null);
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleAddUserOpen = () => {
    setAddUserError(null);
    setNewUser({
      first_name: '',
      last_name: '',
      email: '',
      password: '',
      role: 'patient' as UserRole
    });
    setAddUserOpen(true);
  };

  const handleAddUserClose = () => {
    setAddUserOpen(false);
  };

  const handleNewUserChange = (e: React.ChangeEvent<HTMLInputElement | { name?: string; value: unknown }>) => {
    const { name, value } = e.target;
    setNewUser({
      ...newUser,
      [name as string]: value
    });
  };

  const handleAddUser = async () => {
    try {
      setAddUserLoading(true);
      setAddUserError(null);
      
      // Call API to create user
      const response = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newUser),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create user');
      }
      
      // Refresh user list
      await fetchUsers();
      
      // Close dialog
      handleAddUserClose();
    } catch (error: any) {
      console.error('Error adding user:', error);
      setAddUserError(error.message || 'An unknown error occurred');
    } finally {
      setAddUserLoading(false);
    }
  };

  const columns: GridColDef<User>[] = [
    {
      field: 'id',
      headerName: 'User ID',
      width: 250,
      sortable: false,
      filterable: false,
    },
    {
      field: 'fullName',
      headerName: 'Full Name',
      sortable: true,
      width: 200,
      renderCell: (params: GridRenderCellParams) => (
        <>{`${params.row.first_name || ''} ${params.row.last_name || ''}`}</>
      )
    },
    {
      field: 'email',
      headerName: 'Email',
      sortable: true,
      width: 250,
    },
    {
      field: 'role',
      headerName: 'Role',
      width: 120,
      sortable: true,
      renderCell: (params: GridRenderCellParams) => <RoleChip role={params.value as UserRole} />,
    },
    {
      field: 'createdAt',
      headerName: 'Created At',
      width: 180,
      sortable: true,
      valueGetter: (params: { value: unknown }) => 
        params.value ? new Date(params.value as string) : null,
      renderCell: (params: GridRenderCellParams<User, Date | null>) =>
        params.value ? format(params.value, 'MMM d, yyyy h:mm a') : 'N/A',
      type: 'dateTime',
    },
    {
      field: 'lastSignInAt',
      headerName: 'Last Sign In',
      width: 180,
      sortable: true,
      valueGetter: (params: { value: unknown }) => 
        params.value ? new Date(params.value as string) : null,
      renderCell: (params: GridRenderCellParams<User, Date | null>) =>
        params.value ? format(params.value, 'MMM d, yyyy h:mm a') : 'N/A',
      type: 'dateTime',
    },
    {
        field: 'actions',
        headerName: 'Actions',
        width: 150,
        sortable: false,
        filterable: false,
        renderCell: (params: GridRenderCellParams) => (
          <Box>
             <Button size="small" onClick={() => handleDetailsOpen(params.row as User)}>
                Details
             </Button>
             <IconButton
                size="small"
                onClick={(event) => handleMenuOpen(event, params.row as User)}
             >
                <MoreVertIcon fontSize="small" />
             </IconButton>
          </Box>
        ),
    },
  ];

  if (loading) {
    return <LinearProgress />;
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Users Management</Typography>
        <Button variant="contained" onClick={handleAddUserOpen}>
          Add User
        </Button>
      </Box>

      <Paper sx={{ height: 600, width: '100%' }}>
          <DataGrid
            rows={users}
            columns={columns}
            pageSizeOptions={[10, 25, 50]}
            initialState={{
              pagination: {
                paginationModel: { page: 0, pageSize: 10 },
              },
              sorting: {
                sortModel: [{ field: 'created_at', sort: 'desc' }],
              },
            }}
            loading={loading}
            getRowId={(row) => row.id}
            disableRowSelectionOnClick
          />
      </Paper>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem disabled>Change Role To:</MenuItem>
        {(['admin', 'staff', 'provider', 'patient'] as UserRole[]).map((role) => (
          <MenuItem
            key={role}
            selected={selectedUserForMenu?.role === role}
            onClick={() => handleRoleChange(role)}
          >
            {role.charAt(0).toUpperCase() + role.slice(1)}
          </MenuItem>
        ))}
      </Menu>

      <Dialog open={detailsOpen} onClose={handleDetailsClose} maxWidth="md" fullWidth>
          <DialogTitle>User Details: {selectedUserForDetails?.first_name} {selectedUserForDetails?.last_name}</DialogTitle>
          <DialogContent> 
          </DialogContent>
          <DialogActions>
              <Button onClick={handleDetailsClose}>Close</Button>
          </DialogActions>
      </Dialog>

      <Dialog open={addUserOpen} onClose={handleAddUserClose}>
        <DialogTitle>Add New User</DialogTitle>
        <DialogContent>
           {addUserError && (
            <Box sx={{ mb: 2, p: 1, bgcolor: 'error.light', borderRadius: 1 }}>
              <Typography color="error">{addUserError}</Typography>
            </Box>
          )}
          <Box component="form" sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="First Name"
              name="first_name"
              value={newUser.first_name}
              onChange={handleNewUserChange}
              fullWidth
              required
              autoFocus
              margin="dense"
            />
            <TextField
              label="Last Name"
              name="last_name"
              value={newUser.last_name}
              onChange={handleNewUserChange}
              fullWidth
              required
              margin="dense"
            />
            <TextField
              label="Email"
              name="email"
              type="email"
              value={newUser.email}
              onChange={handleNewUserChange}
              fullWidth
              required
              margin="dense"
            />
            <TextField
              label="Password"
              name="password"
              type="password"
              value={newUser.password}
              onChange={handleNewUserChange}
              fullWidth
              required
              margin="dense"
            />
            <TextField
              select
              label="Role"
              name="role"
              value={newUser.role}
              onChange={handleNewUserChange}
              fullWidth
              margin="dense"
            >
              <MenuItem value="admin">Admin</MenuItem>
              <MenuItem value="staff">Staff</MenuItem>
              <MenuItem value="provider">Provider</MenuItem>
              <MenuItem value="patient">Patient</MenuItem>
            </TextField>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleAddUserClose}>Cancel</Button>
          <Button 
            onClick={handleAddUser} 
            variant="contained" 
            color="primary"
            disabled={addUserLoading || !newUser.email || !newUser.password || !newUser.first_name || !newUser.last_name}
          >
            {addUserLoading ? 'Creating...' : 'Create User'}
          </Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
} 