'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { useParams } from 'next/navigation'; // Correct hook for App Router
import {
    Box,
    Typography,
    Button,
    TextField,
    Paper,
    List,
    ListItem,
    ListItemText,
    ListItemIcon,
    IconButton,
    CircularProgress,
    Alert,
    Breadcrumbs,
    Link as MuiLink, // Alias to avoid conflict with NextLink
    Dialog, // Added Dialog components
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    Snackbar // Added Snackbar
} from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import EmailIcon from '@mui/icons-material/Email';
import DeleteIcon from '@mui/icons-material/Delete'; // Added DeleteIcon
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import Link from 'next/link'; // Use NextLink for navigation

import { getApprovedEmailsForOrg } from '@/actions/adminActions';
import type { organization_approved_emails as ApprovedEmailTableType } from '@/lib/db/schema'; // Import table type

// Type for the approved email state
type ApprovedEmail = typeof ApprovedEmailTableType.$inferSelect;

export default function ManageApprovedEmailsPage() {
    const params = useParams();
    const orgId = params.orgId as string; // Extract orgId from URL parameters

    const [approvedEmails, setApprovedEmails] = useState<ApprovedEmail[]>([]);
    const [orgName, setOrgName] = useState<string>('Loading...');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [formError, setFormError] = useState<string | null>(null);
    const [isAdding, startTransition] = useTransition();
    
    const [newEmail, setNewEmail] = useState('');
    const [isSubmittingAdd, setIsSubmittingAdd] = useState(false);

    // Delete Email Dialog State
    const [isDeleteEmailDialogOpen, setIsDeleteEmailDialogOpen] = useState(false);
    const [deletingEmailId, setDeletingEmailId] = useState<string | null>(null);
    const [deletingEmailAddress, setDeletingEmailAddress] = useState<string | null>(null);
    const [isDeletingEmail, setIsDeletingEmail] = useState(false);
    const [deleteEmailError, setDeleteEmailError] = useState<string | null>(null);
    const [showDeleteEmailSnackbar, setShowDeleteEmailSnackbar] = useState(false);

    useEffect(() => {
        if (orgId) { // Ensure orgId is available
            fetchEmails();
        }
    }, [orgId]);

    const fetchEmails = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const result = await getApprovedEmailsForOrg(orgId);
            if (result.success && result.data) {
                setApprovedEmails(result.data);
                setOrgName(result.orgName || 'Unknown Organization');
            } else {
                throw new Error(result.message || 'Failed to fetch approved emails');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred');
            setOrgName('Error Loading Name'); // Set org name on error
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddEmail = async (event: React.FormEvent) => {
        event.preventDefault();
        setFormError(null);
        setIsSubmittingAdd(true);

        try {
            const response = await fetch('/api/admin/organizations/emails', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    organizationId: orgId,
                    email: newEmail,
                }),
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.message || `HTTP error! status: ${response.status}`);
            }

            // Add to list optimistically or refetch
            setApprovedEmails(prev => [...prev, result.data].sort((a, b) => a.email.localeCompare(b.email)));
            setNewEmail(''); 
            // Could add a success snackbar here too

        } catch (err) {
            console.error("Error submitting new approved email:", err);
            setFormError(err instanceof Error ? err.message : 'Failed to add email');
        } finally {
            setIsSubmittingAdd(false);
        }
    };

    // --- Delete Email Handlers ---
    const handleOpenDeleteEmailDialog = (email: ApprovedEmail) => {
        setDeletingEmailId(email.id);
        setDeletingEmailAddress(email.email);
        setDeleteEmailError(null);
        setIsDeleteEmailDialogOpen(true);
    };

    const handleCloseDeleteEmailDialog = () => {
        if (isDeletingEmail) return;
        setIsDeleteEmailDialogOpen(false);
        setDeletingEmailId(null);
        setDeletingEmailAddress(null);
    };

    const handleConfirmDeleteEmail = async () => {
        if (!deletingEmailId || !orgId) return;
        setIsDeletingEmail(true);
        setDeleteEmailError(null);
        try {
            const response = await fetch('/api/admin/organizations/emails', { 
               method: 'DELETE', 
               headers: { 'Content-Type': 'application/json' },
               body: JSON.stringify({ organizationId: orgId, emailId: deletingEmailId })
            });
            const result = await response.json();
            if (!response.ok || !result.success) {
                 throw new Error(result.message || `HTTP error! status: ${response.status}`);
            }
            handleCloseDeleteEmailDialog();
            setShowDeleteEmailSnackbar(true);
            setApprovedEmails(prev => prev.filter(email => email.id !== deletingEmailId));
        } catch (err) {
            setDeleteEmailError(err instanceof Error ? err.message : 'Failed to delete email');
        } finally {
            setIsDeletingEmail(false);
        }
    };

    return (
        <Box sx={{ p: 3 }}>
             <Breadcrumbs separator={<NavigateNextIcon fontSize="small" />} aria-label="breadcrumb" sx={{ mb: 2 }}>
                <MuiLink component={Link} underline="hover" color="inherit" href="/admin">
                    Admin
                </MuiLink>
                 <MuiLink component={Link} underline="hover" color="inherit" href="/admin/organizations">
                    Organizations
                </MuiLink>
                <Typography color="text.primary">{isLoading ? 'Loading...' : orgName}</Typography>
            </Breadcrumbs>

            <Typography variant="h4" gutterBottom>Manage Approved Emails</Typography>
            <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>For: {isLoading ? 'Loading...' : orgName}</Typography>

            {/* Add Approved Email Form */}
            <Paper component="form" onSubmit={handleAddEmail} sx={{ p: 2, mb: 3 }}>
                <Typography variant="h6" gutterBottom>Add New Approved Email</Typography>
                {formError && <Alert severity="error" sx={{ mb: 2 }}>{formError}</Alert>}
                <TextField
                    label="Email Address"
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    required
                    fullWidth
                    margin="normal"
                    disabled={isSubmittingAdd}
                />
                 {/* Hidden field for organizationId - already have it from params */}

                <Button 
                    type="submit" 
                    variant="contained" 
                    startIcon={isSubmittingAdd ? <CircularProgress size={20} color="inherit" /> : <AddCircleOutlineIcon />} 
                    disabled={isSubmittingAdd || !newEmail}
                >
                    {isSubmittingAdd ? 'Adding...' : 'Add Email'}
                </Button>
            </Paper>

            {/* Approved Email List */}
            <Typography variant="h6" gutterBottom>Existing Approved Emails</Typography>
            {isLoading && <CircularProgress />} 
            {error && !isLoading && <Alert severity="error">{error}</Alert>}
            {!isLoading && !error && (
                <Paper elevation={2}>
                    <List disablePadding>
                         {approvedEmails.length === 0 && (
                            <ListItem>
                                <ListItemText primary="No approved emails found for this organization." />
                            </ListItem>
                        )}
                        {approvedEmails.map((email) => (
                            <ListItem 
                              key={email.id} 
                              divider
                              secondaryAction={
                                <IconButton 
                                  edge="end" 
                                  aria-label="delete email" 
                                  title="Delete Email"
                                  onClick={() => handleOpenDeleteEmailDialog(email)}
                                >
                                  <DeleteIcon />
                                </IconButton>
                              }
                            >
                                <ListItemIcon>
                                    <EmailIcon />
                                </ListItemIcon>
                                <ListItemText primary={email.email} />
                            </ListItem>
                        ))}
                    </List>
                </Paper>
            )}

            {/* Delete Email Confirmation Dialog */}
             <Dialog
                open={isDeleteEmailDialogOpen}
                onClose={handleCloseDeleteEmailDialog}
              >
                <DialogTitle>Confirm Deletion</DialogTitle>
                <DialogContent>
                   {deleteEmailError && <Alert severity="error" sx={{ mb: 2 }}>{deleteEmailError}</Alert>}
                  <DialogContentText>
                    Are you sure you want to delete the approved email "{deletingEmailAddress || ''}"?
                  </DialogContentText>
                </DialogContent>
                <DialogActions sx={{ p: '16px 24px'}}>
                  <Button onClick={handleCloseDeleteEmailDialog} disabled={isDeletingEmail}>Cancel</Button>
                  <Button onClick={handleConfirmDeleteEmail} color="error" variant="contained" disabled={isDeletingEmail}>
                    {isDeletingEmail ? <CircularProgress size={24} color="inherit" /> : 'Delete Email'}
                  </Button>
                </DialogActions>
              </Dialog>

            {/* Delete Email Success Snackbar */}
            <Snackbar
                open={showDeleteEmailSnackbar}
                autoHideDuration={4000}
                onClose={() => setShowDeleteEmailSnackbar(false)}
                message="Approved email deleted successfully!"
            />

        </Box>
    );
} 