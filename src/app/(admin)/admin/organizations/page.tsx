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
import DeleteIcon from '@mui/icons-material/Delete'; // Uncomment DeleteIcon
import EditIcon from '@mui/icons-material/Edit'; // Add EditIcon
// import DeleteIcon from '@mui/icons-material/Delete'; // REMOVE DeleteIcon
import { getOrganizations } from '@/actions/adminActions'; // Import server action
import type { organizations as OrganizationTableType } from '@/lib/db/schema'; // Import type from schema

// Define the type for the state based on the schema type
type Organization = typeof OrganizationTableType.$inferSelect;

// Re-use generic Delete Confirmation Dialog if available and suitable
// Assuming a component like this exists or needs creation:
// import DeleteConfirmationDialog from '@/components/admin/DeleteConfirmationDialog';
// For now, define inline for simplicity
interface DeleteDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  title: string;
  contentText: string;
  loading: boolean;
  error: string | null;
}
function DeleteConfirmationDialog({ open, onClose, onConfirm, title, contentText, loading, error }: DeleteDialogProps) {
  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <DialogContentText>{contentText}</DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>Cancel</Button>
        <Button onClick={onConfirm} color="error" variant="contained" disabled={loading}>
          {loading ? <CircularProgress size={24} color="inherit" /> : 'Delete'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// --- Edit Organization Dialog Component (Similar to Add) ---
interface EditDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (event: React.FormEvent) => Promise<void>;
  initialData: Organization | null;
  loading: boolean;
  error: string | null;
  // Need state setters from parent for controlled components
  name: string;
  setName: (value: string) => void;
  domain: string;
  setDomain: (value: string) => void;
}
function EditOrganizationDialog({ 
    open, onClose, onSubmit, initialData, loading, error, 
    name, setName, domain, setDomain
}: EditDialogProps) {
  
  // Reset form fields when initialData changes (dialog opens)
  useEffect(() => {
    if (initialData) {
        setName(initialData.name || '');
        setDomain(initialData.domain || '');
    } else {
        // Clear if initialData is null (e.g., dialog closed before opening)
        setName('');
        setDomain('');
    }
  }, [initialData, setName, setDomain]); // Depend on initialData and setters

  return (
    <Dialog open={open} onClose={onClose} PaperProps={{ component: 'form', onSubmit: onSubmit }}>
      <DialogTitle>Edit Organization: {initialData?.name || ''}</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <DialogContentText sx={{ mb: 2 }}>
          Update the organization details below.
        </DialogContentText>
        <TextField
          autoFocus
          required
          margin="dense"
          id="editOrgName"
          label="Organization Name"
          type="text"
          fullWidth
          variant="standard"
          value={name} // Controlled component
          onChange={(e) => setName(e.target.value)}
          disabled={loading}
        />
        <TextField
          margin="dense"
          id="editOrgDomain"
          label="Approved Domain (Optional, e.g., company.com)"
          type="text"
          fullWidth
          variant="standard"
          value={domain} // Controlled component
          onChange={(e) => setDomain(e.target.value)}
          placeholder="example.com"
          disabled={loading}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>Cancel</Button>
        <Button type="submit" variant="contained" disabled={loading}>
           {loading ? <CircularProgress size={24} color="inherit" /> : 'Save Changes'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default function AdminOrganizationsPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // State for the Add modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');
  const [newOrgDomain, setNewOrgDomain] = useState('');
  const [isSubmittingAdd, setIsSubmittingAdd] = useState(false);
  const [addModalError, setAddModalError] = useState<string | null>(null);
  const [showAddSuccessSnackbar, setShowAddSuccessSnackbar] = useState(false);

  // --- Uncomment Delete Dialog State ---
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingOrgId, setDeletingOrgId] = useState<string | null>(null);
  const [deletingOrgName, setDeletingOrgName] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [showDeleteSuccessSnackbar, setShowDeleteSuccessSnackbar] = useState(false);
  // --- End Uncomment Delete Dialog State ---

  // --- Add Edit Modal State ---
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null);
  const [editOrgName, setEditOrgName] = useState(''); // State for controlled input
  const [editOrgDomain, setEditOrgDomain] = useState(''); // State for controlled input
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const [editModalError, setEditModalError] = useState<string | null>(null);
  const [showEditSuccessSnackbar, setShowEditSuccessSnackbar] = useState(false);
  // --- End Edit Modal State ---

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

  // Add Modal Handlers
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

  // --- Add Edit Modal Handlers ---
  const handleOpenEditModal = (org: Organization) => {
    setEditingOrg(org); // Store the org being edited
    // Initialize controlled state - EditOrganizationDialog useEffect will also set this
    setEditOrgName(org.name || '');
    setEditOrgDomain(org.domain || '');
    setEditModalError(null); // Clear previous errors
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    if (isSubmittingEdit) return;
    setIsEditModalOpen(false);
    // Consider resetting editingOrg and controlled state here or on open
    // setEditingOrg(null); 
  };

  const handleSaveEdit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editingOrg) return;

    setIsSubmittingEdit(true);
    setEditModalError(null);

    const dataToUpdate: { name?: string; domain?: string | null } = {};
    let hasChanges = false;

    if (editOrgName !== editingOrg.name) {
      dataToUpdate.name = editOrgName;
      hasChanges = true;
    }
    // Handle domain: allow setting empty string (to remove it) or new value
    if (editOrgDomain !== (editingOrg.domain || '')) {
        dataToUpdate.domain = editOrgDomain.trim() === '' ? null : editOrgDomain.trim();
        hasChanges = true;
    }

    if (!hasChanges) {
        setEditModalError("No changes detected.");
        setIsSubmittingEdit(false);
        return;
    }

    try {
      const response = await fetch(`/api/admin/organizations/${editingOrg.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToUpdate), 
      });

      if (!response.ok) {
        let errorMsg = `HTTP error! status: ${response.status}`;
        try {
            const result = await response.json();
            errorMsg = result.message || result.error || errorMsg;
            if (result.errors?._errors?.length) errorMsg = result.errors._errors.join(', ');
        } catch (e) { /* Ignore JSON parsing error */ }
        throw new Error(errorMsg);
      }

      handleCloseEditModal();
      setShowEditSuccessSnackbar(true);
      fetchOrgs(); // Refresh list

    } catch (err) {
      setEditModalError(err instanceof Error ? err.message : 'Failed to update organization');
    } finally {
      setIsSubmittingEdit(false);
    }
  };
  // --- End Edit Modal Handlers ---

  // --- Uncomment Delete Dialog Handlers ---
  const handleOpenDeleteDialog = (org: Organization) => {
    setDeletingOrgId(org.id);
    setDeletingOrgName(org.name);
    setDeleteError(null);
    setIsDeleteDialogOpen(true);
  };

  const handleCloseDeleteDialog = () => {
    if (isDeleting) return; // Prevent closing while delete is in progress
    setIsDeleteDialogOpen(false);
    // Reset state after dialog closes (e.g., on animation end if desired, or immediately)
    // setTimeout(() => { // Optional delay
        setDeletingOrgId(null);
        setDeletingOrgName(null);
    // }, 300); 
  };

  const handleConfirmDelete = async () => {
    if (!deletingOrgId) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      const response = await fetch(`/api/admin/organizations/${deletingOrgId}`, {
          method: 'DELETE' 
      });
      // Check if response is ok, otherwise try to parse error
      if (!response.ok) {
          let errorMsg = `HTTP error! status: ${response.status}`;
          try {
              const result = await response.json();
              errorMsg = result.message || result.error || errorMsg;
          } catch (e) { /* Ignore if response body is not JSON */ }
          throw new Error(errorMsg);
      }
      // Assuming success if response.ok is true
      // const result = await response.json(); // Can parse if needed, e.g. for success message
      
      setShowDeleteSuccessSnackbar(true); // Show success message
      fetchOrgs(); // Refresh the list
      handleCloseDeleteDialog(); // Close the dialog *after* success

    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete organization');
      // Keep dialog open on error
    } finally {
      setIsDeleting(false);
    }
  };
  // --- End Uncomment Delete Dialog Handlers ---

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
                     {/* --- Add Edit Button --- */}
                     <IconButton 
                       edge="end" 
                       aria-label="edit" 
                       title="Edit Organization"
                       onClick={() => handleOpenEditModal(org)}
                     >
                       <EditIcon />
                     </IconButton>
                     {/* --- End Edit Button --- */}
                     <IconButton 
                       edge="end" 
                       aria-label="manage emails" 
                       component={Link}
                       href={`/admin/organizations/${org.id}`}
                       title="Manage Approved Emails"
                     >
                       <EmailIcon />
                     </IconButton>
                     {/* Delete Button */}
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

      {/* --- Add Edit Organization Dialog Instance --- */}
      <EditOrganizationDialog
        open={isEditModalOpen}
        onClose={handleCloseEditModal}
        onSubmit={handleSaveEdit}
        initialData={editingOrg}
        loading={isSubmittingEdit}
        error={editModalError}
        // Pass state and setters for controlled inputs
        name={editOrgName}
        setName={setEditOrgName}
        domain={editOrgDomain}
        setDomain={setEditOrgDomain}
      />
      {/* --- End Edit Organization Dialog Instance --- */}

      {/* --- Add Delete Confirmation Dialog Instance --- */}
      <DeleteConfirmationDialog
        open={isDeleteDialogOpen}
        onClose={handleCloseDeleteDialog}
        onConfirm={handleConfirmDelete}
        title="Confirm Deletion"
        contentText={`Are you sure you want to delete the organization "${deletingOrgName || ''}"? This action cannot be undone.`}
        loading={isDeleting}
        error={deleteError}
      />
      {/* --- End Delete Confirmation Dialog Instance --- */}

       {/* SnackBar for Success Messages */}
        <Snackbar
            open={showAddSuccessSnackbar}
            autoHideDuration={4000}
            onClose={() => setShowAddSuccessSnackbar(false)}
            message="Organization added successfully!"
        />
         <Snackbar
            open={showDeleteSuccessSnackbar}
            autoHideDuration={4000}
            onClose={() => setShowDeleteSuccessSnackbar(false)}
            message="Organization deleted successfully!"
        />
        <Snackbar
            open={showEditSuccessSnackbar}
            autoHideDuration={4000}
            onClose={() => setShowEditSuccessSnackbar(false)}
            message="Organization updated successfully!"
        />
    </Box>
  );
} 