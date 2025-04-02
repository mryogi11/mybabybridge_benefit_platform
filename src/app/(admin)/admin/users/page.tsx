'use client';

import React, { useEffect, useState } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
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
  Checkbox,
  FormControlLabel,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  Divider,
} from '@mui/material';
import {
  MoreVert as MoreVertIcon,
  Search as SearchIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  History as HistoryIcon,
} from '@mui/icons-material';
import { supabase } from '@/lib/supabase/client';
import { User, UserRole, UserActivity } from '@/types';

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

export default function UsersManagementPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
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

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, user: User) => {
    setAnchorEl(event.currentTarget);
    setSelectedUser(user);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedUser(null);
  };

  const handleRoleChange = async (newRole: UserRole) => {
    if (!selectedUser) return;

    try {
      const { error } = await supabase
        .from('users')
        .update({ role: newRole })
        .eq('id', selectedUser.id);

      if (error) throw error;

      setUsers(users.map(user =>
        user.id === selectedUser.id
          ? { ...user, role: newRole }
          : user
      ));
    } catch (error) {
      console.error('Error updating user role:', error);
    } finally {
      handleMenuClose();
    }
  };

  const handleBulkDelete = async () => {
    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .in('id', selectedUsers);

      if (error) throw error;

      setUsers(users.filter(user => !selectedUsers.includes(user.id)));
      setSelectedUsers([]);
    } catch (error) {
      console.error('Error deleting users:', error);
    }
  };

  const handleDetailsOpen = async (user: User) => {
    setSelectedUser(user);
    setDetailsOpen(true);
    await fetchUserActivities(user.id);
  };

  const handleDetailsClose = () => {
    setDetailsOpen(false);
    setSelectedUser(null);
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const getRoleColor = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return 'error';
      case 'staff':
        return 'warning';
      default:
        return 'default';
    }
  };

  const filteredUsers = users.filter(user =>
    user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

  if (loading) {
    return <LinearProgress />;
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">
          User Management
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          {selectedUsers.length > 0 && (
            <Button
              variant="contained"
              color="error"
              startIcon={<DeleteIcon />}
              onClick={handleBulkDelete}
            >
              Delete Selected
            </Button>
          )}
          <Button 
            variant="contained" 
            color="primary" 
            onClick={handleAddUserOpen}
          >
            Add User
          </Button>
          <TextField
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
            }}
          />
        </Box>
      </Box>

      {users.length === 0 ? (
        <Paper sx={{ p: 4, mb: 3, textAlign: 'center' }}>
          <Typography variant="h5" color="error" gutterBottom>
            Database Tables Not Found
          </Typography>
          <Typography paragraph>
            The database tables required for user management do not exist yet. 
            You need to initialize your Supabase database with the project migrations.
          </Typography>
          <Box sx={{ textAlign: 'left', mt: 3, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
            <Typography variant="h6" gutterBottom>
              To initialize the database:
            </Typography>
            <Typography component="div" sx={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
              1. Install Supabase CLI:<br />
              npm install -g supabase<br /><br />
              
              2. Navigate to the supabase directory:<br />
              cd supabase<br /><br />
              
              3. Run migrations:<br />
              supabase db reset
            </Typography>
          </Box>
          <Typography paragraph sx={{ mt: 3 }}>
            Alternatively, you can manually create the users table using the Supabase dashboard.
          </Typography>
          <Button 
            variant="contained" 
            color="primary"
            href="https://app.supabase.com"
            target="_blank"
            sx={{ mt: 2 }}
          >
            Go to Supabase Dashboard
          </Button>
        </Paper>
      ) : (
        <Paper>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={selectedUsers.length === filteredUsers.length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedUsers(filteredUsers.map(user => user.id));
                        } else {
                          setSelectedUsers([]);
                        }
                      }}
                    />
                  </TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell>Created At</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredUsers
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((user) => (
                    <TableRow key={user.id}>
                      <TableCell padding="checkbox">
                        <Checkbox
                          checked={selectedUsers.includes(user.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedUsers([...selectedUsers, user.id]);
                            } else {
                              setSelectedUsers(selectedUsers.filter(id => id !== user.id));
                            }
                          }}
                        />
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Chip
                          label={user.role}
                          color={getRoleColor(user.role)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        {new Date(user.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <IconButton onClick={() => handleDetailsOpen(user)}>
                          <EditIcon />
                        </IconButton>
                        <IconButton onClick={(e) => handleMenuOpen(e, user)}>
                          <MoreVertIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
            <TablePagination
              rowsPerPageOptions={[5, 10, 25]}
              component="div"
              count={filteredUsers.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
            />
          </TableContainer>
        </Paper>
      )}

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => handleRoleChange('admin')}>
          Set as Admin
        </MenuItem>
        <MenuItem onClick={() => handleRoleChange('staff')}>
          Set as Staff
        </MenuItem>
        <MenuItem onClick={() => handleRoleChange('patient')}>
          Set as Patient
        </MenuItem>
      </Menu>

      <Dialog
        open={detailsOpen}
        onClose={handleDetailsClose}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          User Details
        </DialogTitle>
        <DialogContent>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs value={tabValue} onChange={handleTabChange}>
              <Tab label="Profile" />
              <Tab label="Activity Log" />
            </Tabs>
          </Box>
          <TabPanel value={tabValue} index={0}>
            {selectedUser && (
              <Box>
                <Typography variant="h6" gutterBottom>Profile Information</Typography>
                <List>
                  <ListItem>
                    <ListItemText
                      primary="Email"
                      secondary={selectedUser.email}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Role"
                      secondary={
                        <Chip
                          label={selectedUser.role}
                          color={getRoleColor(selectedUser.role)}
                          size="small"
                        />
                      }
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Created At"
                      secondary={new Date(selectedUser.created_at).toLocaleString()}
                    />
                  </ListItem>
                </List>
              </Box>
            )}
          </TabPanel>
          <TabPanel value={tabValue} index={1}>
            <Typography variant="h6" gutterBottom>Activity History</Typography>
            <List>
              {userActivities.map((activity, index) => (
                <React.Fragment key={activity.id}>
                  <ListItem>
                    <ListItemText
                      primary={activity.action}
                      secondary={new Date(activity.created_at).toLocaleString()}
                    />
                  </ListItem>
                  {index < userActivities.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          </TabPanel>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDetailsClose}>Close</Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={addUserOpen}
        onClose={handleAddUserClose}
        maxWidth="sm"
        fullWidth
      >
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