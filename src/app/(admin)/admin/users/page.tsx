'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  LinearProgress,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Alert,
  Menu,
  ListItemIcon,
  IconButton,
} from '@mui/material';
import {
    Add as AddIcon,
  MoreVert as MoreVertIcon,
    Edit as EditIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { supabase } from '@/lib/supabase/client';
import { User, UserRole } from '@/types';
import { DataGrid, GridColDef, GridRenderCellParams, GridToolbarContainer, GridToolbarQuickFilter, GridToolbarProps } from '@mui/x-data-grid';
import { format } from 'date-fns';
import { createUserAction } from '@/actions/userActions';

// Define the type for the complete new user data payload
interface NewUserData {
    first_name: string;
    last_name: string;
    email: string;
    password?: string; // Password is required logic-wise, but keep optional for type flexibility if needed initially
    role: UserRole;
    // Add optional provider fields
    specialization?: string;
    bio?: string;
    experience_years?: number;
}

// --- AddUserDialog Component ---
interface AddUserDialogProps {
  open: boolean;
  onClose: () => void;
  // Prop expects a function accepting the full payload
  onAddUser: (userData: NewUserData) => Promise<void>; 
  error: string | null; 
}

function AddUserDialog({ open, onClose, onAddUser, error }: AddUserDialogProps) {
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [roles, setRoles] = useState<UserRole[]>(['patient']);
    // Add state for provider fields
    const [specialization, setSpecialization] = useState('');
    const [bio, setBio] = useState('');
    const [experienceYears, setExperienceYears] = useState<number | ''>('');

    const [dialogError, setDialogError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    // Reset form when dialog opens/closes or external error changes
    useEffect(() => {
        if (open) {
            setFirstName('');
            setLastName('');
            setEmail('');
            setPassword('');
            setRoles(['patient']);
            // Reset provider fields
            setSpecialization('');
            setBio('');
            setExperienceYears('');
            setDialogError(error); // Set external error if passed
            setLoading(false);
        } else {
             setDialogError(null); // Clear internal dialog error on close
        }
    }, [open, error]); // Depend on external error prop as well

    const handleRoleChange = (event: any) => {
        const { value } = event.target;
        setRoles([value] as UserRole[]); // Assume single role selection
    };

    const handleAddClick = async () => {
        // Adjust validation
        if (!firstName.trim()) { setDialogError('First Name is required.'); return; }
        if (!lastName.trim()) { setDialogError('Last Name is required.'); return; }
        if (!email.trim() || !/\S+@\S+\.\S+/.test(email.trim())) { setDialogError('Valid Email is required.'); return; }
        if (!password || password.length < 6) { setDialogError('Password must be at least 6 characters.'); return; }
        if (roles.length === 0) { setDialogError('A role must be selected.'); return; }

        const currentRole = roles[0];
        // Provider specific validation
        if (currentRole === 'provider') {
            if (!specialization.trim()) { setDialogError('Specialization is required for providers.'); return; }
            if (experienceYears === '' || experienceYears < 0) { setDialogError('Valid Experience Years is required for providers.'); return; }
        }

        setDialogError(null);
        setLoading(true);
        try {
            const userDataPayload: NewUserData = {
                first_name: firstName.trim(),
                last_name: lastName.trim(),
                email: email.trim(),
                password, // Include password
                role: currentRole, // Send the selected role
            };

            // Add provider details if role is provider
            if (currentRole === 'provider') {
                userDataPayload.specialization = specialization.trim();
                userDataPayload.bio = bio.trim(); // Bio is optional
                userDataPayload.experience_years = Number(experienceYears);
            }

            // Call onAddUser with the complete payload
            await onAddUser(userDataPayload);
            // If onAddUser doesn't throw, assume success and close dialog
            // onClose(); // Let parent decide if dialog should close on success
        } catch (err) {
           // Error is now handled by the parent via the error prop
           // No need to setDialogError here as the parent controls it via `addUserError` state
        } finally {
            setLoading(false);
        }
    };

  return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth> {/* Increased maxWidth for more fields */}
            <DialogTitle>Add New User</DialogTitle>
            <DialogContent>
                {/* Display external error passed via props */}
                {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
                {/* Display internal validation error */}
                {dialogError && !error && <Alert severity="warning" sx={{ mb: 2 }}>{dialogError}</Alert>}
                <TextField
                    autoFocus
                    margin="dense"
                    id="firstName"
                    label="First Name"
                    type="text"
                    fullWidth
                    variant="outlined"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    disabled={loading}
                />
                 <TextField
                    margin="dense"
                    id="lastName"
                    label="Last Name"
                    type="text"
                    fullWidth
                    variant="outlined"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    disabled={loading}
                />
                <TextField
                    margin="dense"
                    id="email"
                    label="Email Address"
                    type="email"
                    fullWidth
                    variant="outlined"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                />
                <TextField
                    margin="dense"
                    id="password"
                    label="Password (min 6 characters)"
                    type="password"
                    fullWidth
                    variant="outlined"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                />
                <FormControl fullWidth margin="dense" disabled={loading}>
                    <InputLabel id="role-label">Role</InputLabel>
                    <Select
                        labelId="role-label"
                        id="role"
                        value={roles[0] || ''} // Use first element of roles array
                        onChange={handleRoleChange}
                        label="Role"
                    >
                        <MenuItem value="admin">Admin</MenuItem>
                        <MenuItem value="provider">Provider</MenuItem>
                        <MenuItem value="patient">Patient</MenuItem>
                        {/* Add 'staff' if needed */}
                        {/* <MenuItem value="staff">Staff</MenuItem> */}
                    </Select>
                </FormControl>

                {/* Conditional Provider Fields */}
                {roles[0] === 'provider' && (
                    <>
                        <TextField
                            margin="dense"
                            id="specialization"
                            label="Specialization"
                            type="text"
                            fullWidth
                            variant="outlined"
                            value={specialization}
                            onChange={(e) => setSpecialization(e.target.value)}
                            disabled={loading}
                            required // Mark as visually required
                        />
                        <TextField
                            margin="dense"
                            id="bio"
                            label="Bio (Optional)"
                            type="text"
                            fullWidth
                            multiline
                            rows={3}
                            variant="outlined"
                            value={bio}
                            onChange={(e) => setBio(e.target.value)}
                            disabled={loading}
                        />
                        <TextField
                            margin="dense"
                            id="experienceYears"
                            label="Years of Experience"
                            type="number"
                            fullWidth
                            variant="outlined"
                            value={experienceYears}
                            onChange={(e) => {
                                const val = e.target.value;
                                // Allow empty string or positive numbers
                                if (val === '' || parseInt(val) >= 0) {
                                    setExperienceYears(val === '' ? '' : parseInt(val));
                                }
                            }}
                            InputProps={{ inputProps: { min: 0 } }} // Basic HTML5 validation
                            disabled={loading}
                            required // Mark as visually required
                        />
                    </>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} disabled={loading}>Cancel</Button>
                <Button onClick={handleAddClick} disabled={loading} variant="contained">
                    {loading ? <LinearProgress sx={{ width: '80px' }} /> : 'Add User'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}

// --- UsersManagementPage Component ---
export default function UsersManagementPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null); // For fetch errors
  const [addUserDialogOpen, setAddUserDialogOpen] = useState(false);
  const [addUserError, setAddUserError] = useState<string | null>(null); // For AddUserDialog submission error
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const menuOpen = Boolean(anchorEl);

  // Define the Custom Toolbar Component *inside* UsersManagementPage
  // It now accepts GridToolbarProps and accesses setAddUserDialogOpen from the outer scope
  function UserTableToolbarWithAdd(props: GridToolbarProps) {
    return (
      <GridToolbarContainer {...props} sx={{ p: 1, pb: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <GridToolbarQuickFilter 
          sx={{ 
              width: { xs: 1, sm: 'auto' },
              mr: { xs: 0, sm: 2 },
              mb: { xs: 1, sm: 0 },
          }} 
        />
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setAddUserDialogOpen(true)} // Directly use the state setter from the parent scope
          sx={{ flexShrink: 0 }} // Prevent button from shrinking
        >
          Add User
        </Button>
      </GridToolbarContainer>
    );
  }

  // --- Handlers ---
   const handleMenuClick = (event: React.MouseEvent<HTMLElement>, userId: string) => {
     setAnchorEl(event.currentTarget);
     setSelectedUserId(userId);
   };
   const handleMenuClose = () => {
     setAnchorEl(null);
     setSelectedUserId(null);
   };

  const fetchUsers = useCallback(async () => {
    // Keep loading true until fetch completes or fails critically
    setLoading(true);
    setError(null);
    try {
      // Sync users first - non-critical failure
      const syncResponse = await fetch('/api/auth/sync-users');
      if (!syncResponse.ok) {
           console.warn("User sync failed (non-critical):", await syncResponse.text());
      }

      // Fetch from the users table
      const { data, error: fetchError } = await supabase
        .from('users')
        .select('*')
        // Use snake_case for ordering
        .order('created_at', { ascending: false });

      if (fetchError) {
        throw fetchError; // Throw error to be caught below
      }
      setUsers(data || []);
    } catch (err: any) {
      console.error("Error fetching users:", err);
      setError(err.message || 'Failed to load users.');
      setUsers([]); // Clear users on critical error
    } finally {
      setLoading(false); // Set loading false after fetch attempt
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Update handleAddUser function signature to accept NewUserData
  const handleAddUser = async (userData: NewUserData) => {
    setAddUserError(null); // Clear previous errors
    console.log("Calling createUserAction with:", userData);

    // Call the Server Action
    const result = await createUserAction(userData);

    if (result.success) {
      console.log("Server Action successful. Closing dialog and refreshing users.");
      setAddUserDialogOpen(false); // Close the dialog on success
      await fetchUsers(); // Refresh the user list
    } else {
      // Server action failed, display the error from the action
      console.error("Server Action failed:", result.error);
      setAddUserError(result.error || "An unexpected error occurred on the server.");
      // Keep the dialog open so the user sees the error
    }
  };

    // --- Column Definitions ---
    const columns: GridColDef<User>[] = [
        { 
            field: 'name', 
            headerName: 'Name', 
            flex: 1, 
            minWidth: 150,
            valueGetter: (value, row: User) => `${row.first_name || ''} ${row.last_name || ''}`,
        }, 
        { field: 'email', headerName: 'Email', flex: 1, minWidth: 200 },
        {
            field: 'role',
            headerName: 'Role',
            width: 150,
            renderCell: (params: GridRenderCellParams<User, UserRole>) => (
                 params.value ? <Chip label={params.value} size="small" sx={{ mr: 0.5 }} variant="outlined" /> : null
            ),
            sortComparator: (v1: UserRole, v2: UserRole) => (v1 || '').localeCompare(v2 || ''),
        },
        {
            field: 'created_at',
            headerName: 'Created At',
            width: 180,
            type: 'dateTime', 
            valueGetter: (value: string | null | undefined) => value ? new Date(value) : null,
            renderCell: (params: GridRenderCellParams<User, Date | null>) =>
                params.value ? format(params.value, 'MMM d, yyyy h:mm a') : 'N/A',
        },
        {
            field: 'last_sign_in_at',
            headerName: 'Last Sign In',
            width: 180,
            type: 'dateTime', 
             valueGetter: (value: string | null | undefined) => value ? new Date(value) : null, 
            renderCell: (params: GridRenderCellParams<User, Date | null>) =>
                params.value ? format(params.value, 'MMM d, yyyy h:mm a') : 'N/A',
        },
        {
            field: 'actions',
            headerName: 'Actions',
            width: 100,
            sortable: false,
            disableColumnMenu: true,
            align: 'center',
            headerAlign: 'center',
            renderCell: (params: GridRenderCellParams<User>) => (
                <IconButton
                    aria-label="actions"
                    onClick={(event) => handleMenuClick(event, params.row.id)}
                >
                    <MoreVertIcon />
                </IconButton>
            ),
      },
    ];


  // --- Render Logic ---
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 64px - 48px)', width: '100%' }}>
      {/* Title Row - Remove Add User Button */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexShrink: 0 }}>
        <Typography variant="h4" gutterBottom sx={{ mb: 0 }}>
          Users Management
        </Typography>
        {/* <Button /> Removed from here */}
      </Box>

      {/* Loading Indicator */}
      {loading && <LinearProgress sx={{ width: '100%', mb: 2, flexShrink: 0 }} />}

      {/* Fetch Error Alert */}
      {error && !loading && (
          <Alert severity="error" sx={{ mb: 2, flexShrink: 0 }}>{error}</Alert>
      )}

      {/* Data Grid Section */} 
      {!loading && !error && (
          <Paper sx={{ flexGrow: 1, width: '100%', border: 'none', display: 'flex', overflow: 'hidden' }}> 
            <DataGrid
              rows={users}
              columns={columns}
              initialState={{
                pagination: {
                  paginationModel: { pageSize: 10, page: 0 },
                },
                sorting: {
                  sortModel: [{ field: 'created_at', sort: 'desc' }],
                },
              }}
              pageSizeOptions={[5, 10, 25, 50]}
              checkboxSelection
              disableRowSelectionOnClick
              getRowId={(row) => row.id}
              autoHeight={false} 
              // Add slots prop for the custom toolbar
              slots={{ toolbar: UserTableToolbarWithAdd }}
              sx={{ 
                border: 0,
                flexGrow: 1,
                '& .MuiDataGrid-columnHeaders': {
                  backgroundColor: '#F4F6F8',
                  borderRadius: 0, 
                  borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
                },
                '& .MuiDataGrid-cell': {
                  borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
                },
                '& .MuiDataGrid-footerContainer': {
                   borderTop: (theme) => `1px solid ${theme.palette.divider}`,
                },
                '& .MuiDataGrid-columnSeparator': {
                    display: 'none',
                },
                '& .MuiTablePagination-root': {},
                 '& .MuiDataGrid-toolbarContainer .MuiButton-text': {
                     color: 'text.secondary',
                 },
              }}
        />
      </Paper>
      )}

      {/* Action Menu */}
      <Menu
        anchorEl={anchorEl}
            open={menuOpen}
        onClose={handleMenuClose}
            // TODO: Add PaperProps for styling consistency if needed
        >
            {/* TODO: Implement Edit/Delete functionality */}
            <MenuItem onClick={handleMenuClose}>
                <ListItemIcon><EditIcon fontSize="small"/></ListItemIcon>
                Edit
        </MenuItem>
            <MenuItem onClick={handleMenuClose} sx={{ color: 'error.main' }}>
                 <ListItemIcon sx={{ color: 'error.main' }}><DeleteIcon fontSize="small"/></ListItemIcon>
                 Delete
        </MenuItem>
            {/* TODO: Implement Role Change if needed */}
      </Menu>

      {/* Add User Dialog */}
      <AddUserDialog
         open={addUserDialogOpen}
         onClose={() => { setAddUserDialogOpen(false); setAddUserError(null); }}
         onAddUser={handleAddUser} 
         error={addUserError} 
       />

    </Box>
  );
} 