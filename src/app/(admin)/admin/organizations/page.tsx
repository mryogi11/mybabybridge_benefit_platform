'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link'; // Import Link
import {
  Box,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
  CircularProgress,
  Alert,
  Divider,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  TextField,
  Snackbar,
  IconButton, // Added IconButton
  Stack // Added Stack for buttons
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EmailIcon from '@mui/icons-material/Email'; // Added EmailIcon
import EditIcon from '@mui/icons-material/Edit'; // Added EditIcon (for future use)
import DeleteIcon from '@mui/icons-material/Delete'; // Added DeleteIcon
import { getOrganizations } from '@/actions/adminActions'; // Import server action
import type { organizations as OrganizationTableType } from '@/lib/db/schema'; // Import type from schema

// Define the type for the state based on the schema type
type Organization = typeof OrganizationTableType.$inferSelect;

export default function AdminOrganizationsPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // State for the modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');
  const [newOrgDomain, setNewOrgDomain] = useState('');
  const [isSubmittingAdd, setIsSubmittingAdd] = useState(false);
  const [addModalError, setAddModalError] = useState<string | null>(null);
  const [showAddSuccessSnackbar, setShowAddSuccessSnackbar] = useState(false);

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null);
  const [editOrgName, setEditOrgName] = useState('');
  const [editOrgDomain, setEditOrgDomain] = useState('');
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const [editModalError, setEditModalError] = useState<string | null>(null);
  const [showEditSuccessSnackbar, setShowEditSuccessSnackbar] = useState(false);

  // Delete Dialog State
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingOrgId, setDeletingOrgId] = useState<string | null>(null);
  const [deletingOrgName, setDeletingOrgName] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [showDeleteSuccessSnackbar, setShowDeleteSuccessSnackbar] = useState(false);

  useEffect(() => {
    fetchOrgs();
  }, []);

  const fetchOrgs = async () => {
    if (organizations.length === 0) setLoading(true);
    setError(null);
    try {
      const result = await getOrganizations();
      if (result.success && result.data) {
        setOrganizations(result.data);
      } else {
        throw new Error(result.message || 'Failed to fetch organizations.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      setOrganizations([]);
    } finally {
      setLoading(false);
    }
  };

  // Modal Handlers
  const handleOpenAddModal = () => {
    setIsAddModalOpen(true);
    setNewOrgName('');
    setNewOrgDomain('');
    setAddModalError(null);
  };

  const handleCloseAddModal = () => {
    if (isSubmittingAdd) return;
    setIsAddModalOpen(false);
  };

  const handleAddOrganization = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmittingAdd(true);
    setAddModalError(null);
    try {
      const response = await fetch('/api/admin/organizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newOrgName, domain: newOrgDomain || undefined }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        let errorMessage = result.message || `HTTP error! status: ${response.status}`;
        if (result.errors?._errors?.length) errorMessage = result.errors._errors.join(', ');
        throw new Error(errorMessage);
      }
      handleCloseAddModal();
      setShowAddSuccessSnackbar(true);
      fetchOrgs();
    } catch (err) {
      setAddModalError(err instanceof Error ? err.message : 'Failed to add organization');
    } finally {
      setIsSubmittingAdd(false);
    }
  };

  // Edit Modal Handlers
  const handleOpenEditModal = (org: Organization) => {
    setEditingOrg(org);
    setEditOrgName(org.name);
    setEditOrgDomain(org.domain || '');
    setEditModalError(null);
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    if (isSubmittingEdit) return;
    setIsEditModalOpen(false);
    setEditingOrg(null);
  };

  const handleEditOrganization = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editingOrg) return;
    setIsSubmittingEdit(true);
    setEditModalError(null);
    try {
      // Call the PUT API endpoint
      const response = await fetch(`/api/admin/organizations/${editingOrg.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
              name: editOrgName, 
              domain: editOrgDomain || undefined 
          }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
           let errorMessage = result.message || `HTTP error! status: ${response.status}`;
           if (result.errors?._errors?.length) errorMessage = result.errors._errors.join(', ');
           throw new Error(errorMessage);
      }
      handleCloseEditModal();
      setShowEditSuccessSnackbar(true);
      fetchOrgs(); // Refetch list
    } catch (err) {
      setEditModalError(err instanceof Error ? err.message : 'Failed to update organization');
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // Delete Dialog Handlers
  const handleOpenDeleteDialog = (org: Organization) => {
    setDeletingOrgId(org.id);
    setDeletingOrgName(org.name);
    setDeleteError(null);
    setIsDeleteDialogOpen(true);
  };

  const handleCloseDeleteDialog = () => {
    if (isDeleting) return;
    setIsDeleteDialogOpen(false);
    setDeletingOrgId(null);
    setDeletingOrgName(null);
  };

  const handleConfirmDelete = async () => {
    if (!deletingOrgId) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      const response = await fetch(`/api/admin/organizations/${deletingOrgId}`, {
          method: 'DELETE' 
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
          throw new Error(result.message || `HTTP error! status: ${response.status}`);
      }
      handleCloseDeleteDialog();
      setShowDeleteSuccessSnackbar(true);
      fetchOrgs();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete organization');
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading && organizations.length === 0) { // Show loading only initially
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">
          Manage Organizations
        </Typography>
        {/* Attach handler to open modal */}
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenAddModal}>
          Add Organization
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Display loading indicator during refetch */}
      {loading && organizations.length > 0 && <CircularProgress sx={{ mb: 2 }} size={24} />}

      <Paper>
        <List disablePadding>
          {organizations.length === 0 && !error && !loading && (
             <ListItem>
               <ListItemText primary="No organizations found." />
             </ListItem>
           )}
          {organizations.map((org, index) => (
            <React.Fragment key={org.id}>
              <ListItem
                 secondaryAction={
                   <Stack direction="row" spacing={0.5}> {/* Use Stack for button group */}
                     <IconButton 
                       edge="end" 
                       aria-label="edit" 
                       title="Edit Organization"
                       onClick={() => handleOpenEditModal(org)}
                     >
                       <EditIcon />
                     </IconButton>
                     <IconButton 
                       edge="end" 
                       aria-label="manage emails" 
                       component={Link}
                       href={`/admin/organizations/${org.id}`}
                       title="Manage Approved Emails"
                     >
                       <EmailIcon />
                     </IconButton>
                     <IconButton 
                       edge="end" 
                       aria-label="delete" 
                       title="Delete Organization"
                       onClick={() => handleOpenDeleteDialog(org)}
                     >
                       <DeleteIcon />
                     </IconButton>
                   </Stack>
                 }
              >
                <ListItemText 
                  primary={org.name} 
                  secondary={`ID: ${org.id}${org.domain ? ` | Domain: ${org.domain}` : ''}`} 
                />
              </ListItem>
              {index < organizations.length - 1 && <Divider component="li" />}
            </React.Fragment>
          ))}
        </List>
      </Paper>

      {/* Add Organization Modal */}
      <Dialog open={isAddModalOpen} onClose={handleCloseAddModal} PaperProps={{ component: 'form', onSubmit: handleAddOrganization }}>
        <DialogTitle>Add New Organization</DialogTitle>
        <DialogContent>
          {addModalError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {addModalError}
            </Alert>
          )}
          <DialogContentText sx={{ mb: 2 }}>
            Enter the details for the new organization.
          </DialogContentText>
          <TextField
            autoFocus
            required
            margin="dense"
            id="add-name"
            label="Organization Name"
            type="text"
            fullWidth
            variant="outlined"
            value={newOrgName}
            onChange={(e) => setNewOrgName(e.target.value)}
            disabled={isSubmittingAdd}
          />
          <TextField
            margin="dense"
            id="add-domain"
            label="Domain (Optional)"
            helperText="e.g., example.com (used for email verification)"
            type="text"
            fullWidth
            variant="outlined"
            value={newOrgDomain}
            onChange={(e) => setNewOrgDomain(e.target.value)}
            disabled={isSubmittingAdd}
          />
        </DialogContent>
        <DialogActions sx={{ p: '16px 24px'}}>
          <Button onClick={handleCloseAddModal} disabled={isSubmittingAdd}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={isSubmittingAdd || !newOrgName}>
            {isSubmittingAdd ? <CircularProgress size={24} color="inherit" /> : 'Add Organization'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Organization Modal */}
      <Dialog open={isEditModalOpen} onClose={handleCloseEditModal} PaperProps={{ component: 'form', onSubmit: handleEditOrganization }}>
        <DialogTitle>Edit Organization</DialogTitle>
        <DialogContent>
          {editModalError && <Alert severity="error" sx={{ mb: 2 }}>{editModalError}</Alert>}
          <DialogContentText sx={{ mb: 2 }}>
            Update the details for {editingOrg?.name || 'the organization'}.
          </DialogContentText>
          <TextField autoFocus required margin="dense" id="edit-name" label="Organization Name" type="text" fullWidth variant="outlined" value={editOrgName} onChange={(e) => setEditOrgName(e.target.value)} disabled={isSubmittingEdit} />
          <TextField margin="dense" id="edit-domain" label="Domain (Optional)" helperText="e.g., example.com" type="text" fullWidth variant="outlined" value={editOrgDomain} onChange={(e) => setEditOrgDomain(e.target.value)} disabled={isSubmittingEdit} />
        </DialogContent>
        <DialogActions sx={{ p: '16px 24px'}}>
          <Button onClick={handleCloseEditModal} disabled={isSubmittingEdit}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={isSubmittingEdit || !editOrgName}>
            {isSubmittingEdit ? <CircularProgress size={24} color="inherit" /> : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={isDeleteDialogOpen}
        onClose={handleCloseDeleteDialog}
      >
        <DialogTitle>Confirm Deletion</DialogTitle>
        <DialogContent>
           {deleteError && <Alert severity="error" sx={{ mb: 2 }}>{deleteError}</Alert>}
          <DialogContentText>
            Are you sure you want to delete the organization "{deletingOrgName || ''}"? 
            This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: '16px 24px'}}>
          <Button onClick={handleCloseDeleteDialog} disabled={isDeleting}>Cancel</Button>
          <Button onClick={handleConfirmDelete} color="error" variant="contained" disabled={isDeleting}>
            {isDeleting ? <CircularProgress size={24} color="inherit" /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

       {/* Success Snackbars */}
       <Snackbar open={showAddSuccessSnackbar} autoHideDuration={4000} onClose={() => setShowAddSuccessSnackbar(false)} message="Organization added successfully!" />
       <Snackbar open={showEditSuccessSnackbar} autoHideDuration={4000} onClose={() => setShowEditSuccessSnackbar(false)} message="Organization updated successfully!" />
       <Snackbar open={showDeleteSuccessSnackbar} autoHideDuration={4000} onClose={() => setShowDeleteSuccessSnackbar(false)} message="Organization deleted successfully!" />

    </Box>
  );
} 