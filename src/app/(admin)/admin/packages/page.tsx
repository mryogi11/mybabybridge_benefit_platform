'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
    Box, 
    Typography, 
    Button, 
    CircularProgress, 
    Alert, 
    IconButton,
    Paper,
    Chip,
    Snackbar
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { DataGrid, GridColDef, GridActionsCellItem, GridRowParams } from '@mui/x-data-grid';

// Import the modal, dialog, and necessary types
import PackageFormModal, { PackageSaveData } from './_components/PackageFormModal';
import DeleteConfirmationDialog from '../../_components/DeleteConfirmationDialog';
import { packageTierEnum } from '@/lib/db/schema'; // Import the enum for casting

// Define the shape of the package data expected from the API
interface Package {
    id: string;
    name: string;
    tier: string;
    monthly_cost: number;
    description: string | null;
    key_benefits: string[] | null;
    is_base_employer_package: boolean;
    created_at: string;
    updated_at: string;
    organization_id: string | null;
    organization_name: string | null;
}

// Define the shape of the organization data
interface Organization {
    id: string;
    name: string;
    // Add other fields if needed later
}

export default function AdminPackagesPage() {
    const [packages, setPackages] = useState<Package[]>([]);
    const [organizations, setOrganizations] = useState<Organization[]>([]); // State for organizations
    const [loading, setLoading] = useState(true);
    const [pageError, setPageError] = useState<string | null>(null); // Renamed main error state

    // State for Modals/Dialogs
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingPackage, setEditingPackage] = useState<Package | null>(null); // Use Package type for editing
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [deletingPackageId, setDeletingPackageId] = useState<string | null>(null);

    // Loading states for API calls
    const [isSaving, setIsSaving] = useState(false);
    const [isDeletingState, setIsDeletingState] = useState(false); // Renamed to avoid conflict

    // Snackbar state
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState("");
    const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error' | 'info' | 'warning'>('success');

    // Ref to track mounted state
    const isMounted = React.useRef(true);

    useEffect(() => {
        isMounted.current = true;
        return () => {
            isMounted.current = false;
        };
    }, []);

    const handleCloseSnackbar = (event?: React.SyntheticEvent | Event, reason?: string) => {
        if (reason === 'clickaway') {
            return;
        }
        setSnackbarOpen(false);
    };

    const showSnackbar = (message: string, severity: 'success' | 'error' | 'info' | 'warning' = 'success') => {
        setSnackbarMessage(message);
        setSnackbarSeverity(severity);
        setSnackbarOpen(true);
    };

    const fetchData = useCallback(async () => {
        if (!isMounted.current) return;
        setLoading(true);
        setPageError(null);
        try {
            const [packagesResponse, organizationsResponse] = await Promise.all([
                fetch('/api/admin/packages'),
                fetch('/api/admin/organizations')
            ]);

            if (!isMounted.current) return;

            if (!packagesResponse.ok) {
                const errorData = await packagesResponse.json();
                throw new Error(`Packages: ${errorData.message || 'Failed to load'}`);
            }
            if (!organizationsResponse.ok) {
                const errorData = await organizationsResponse.json();
                throw new Error(`Organizations: ${errorData.message || 'Failed to load'}`);
            }

            const packagesData: Package[] = await packagesResponse.json();
            const organizationsDataResponse = await organizationsResponse.json();
            const organizationsData: Organization[] = organizationsDataResponse.success ? organizationsDataResponse.data : organizationsDataResponse;
            
            if (isMounted.current) {
                setPackages(packagesData);
                setOrganizations(organizationsData);
            }
        } catch (err) {
            console.error("Failed to fetch page data:", err);
            if (isMounted.current) {
                setPageError(err instanceof Error ? err.message : 'Failed to load page data.');
            }
        } finally {
            if (isMounted.current) {
                setLoading(false);
            }
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // --- Modal/Dialog Handlers --- 
    const handleOpenCreateModal = () => {
        setEditingPackage(null); // Clear any lingering edit data first
        setIsCreateModalOpen(true);
    };
    const handleCloseCreateModal = () => setIsCreateModalOpen(false);
    
    const handleOpenEditModal = (pkg: Package) => {
        setEditingPackage(pkg);
        setIsEditModalOpen(true);
    };
    const handleCloseEditModal = () => {
        setIsEditModalOpen(false);
    };

    const handleOpenDeleteDialog = (id: string) => {
        setDeletingPackageId(id);
        setIsDeleteDialogOpen(true);
    };
    const handleCloseDeleteDialog = () => {
        setDeletingPackageId(null);
        setIsDeleteDialogOpen(false);
    };
    
    const handleConfirmDelete = async () => {
        if (!deletingPackageId) return;
        if (!isMounted.current) return; // Check mounted state
        setIsDeletingState(true);
        setPageError(null);
        try {
            const response = await fetch(`/api/admin/packages/${deletingPackageId}`, {
                method: 'DELETE',
            });

            if (!isMounted.current) return; // Check after await

            if (!response.ok) {
                let errorMsg = `HTTP error! status: ${response.status}`;
                try {
                     const errorData = await response.json();
                     errorMsg = errorData.message || errorMsg;
                } catch (e) { /* Ignore JSON parsing error if body is empty */ }
                throw new Error(errorMsg);
            }

            console.log(`Package ${deletingPackageId} deleted successfully.`);
            showSnackbar("Package deleted successfully.", "success");
            await fetchData(); // fetchData itself has mounted checks

        } catch (err) {
            console.error("Failed to delete package:", err);
            const errorMsg = err instanceof Error ? err.message : 'Failed to delete package.';
            if (isMounted.current) {
                showSnackbar(errorMsg, "error");
            }
        } finally {
            if (isMounted.current) {
                setIsDeletingState(false);
                handleCloseDeleteDialog();
            }
        }
    };
    
    const handleSavePackage = async (packageData: PackageSaveData) => {
        if (!isMounted.current) return; // Check mounted state
        setIsSaving(true);
        setPageError(null);
        const isEditing = !!packageData.id;
        const url = isEditing ? `/api/admin/packages/${packageData.id}` : '/api/admin/packages';
        const method = isEditing ? 'PUT' : 'POST';

        try {
            const response = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(packageData),
            });

            if (!isMounted.current) return; // Check after await

            if (!response.ok) {
                let errorMsg = `HTTP error! status: ${response.status}`;
                 try {
                     const errorData = await response.json();
                     // Handle potential validation errors array
                     if (errorData.errors) {
                         errorMsg = errorData.errors.map((e: any) => e.message).join(', ');
                     } else {
                        errorMsg = errorData.message || errorMsg;
                     }
                } catch (e) { /* Ignore JSON parsing error if body is empty */ }
                throw new Error(errorMsg);
            }

            const result = await response.json();
            const successMsg = `Package ${isEditing ? 'updated' : 'created'} successfully.`;
            console.log(successMsg, result);
            showSnackbar(successMsg, "success");
            
            if (isMounted.current) {
                if (isEditing) {
                    handleCloseEditModal();
                } else {
                    handleCloseCreateModal();
                }
            }
            await fetchData(); // fetchData itself has mounted checks

        } catch (err) {
             console.error(`Failed to ${isEditing ? 'update' : 'create'} package:`, err);
             const errorMsg = err instanceof Error ? err.message : `Failed to ${isEditing ? 'update' : 'create'} package.`;
            if (isMounted.current) {
                showSnackbar(errorMsg, "error");
            }
        } finally {
            if (isMounted.current) {
                setIsSaving(false);
            }
        }
    };

    // --- DataGrid Columns --- 
    const columns: GridColDef<Package>[] = [
        { field: 'name', headerName: 'Name', flex: 1, minWidth: 150 },
        { 
            field: 'organization_name', 
            headerName: 'Organization', 
            flex: 1, 
            minWidth: 150, 
            valueGetter: (value: string | null) => value || '-', // Display '-' if null
        },
        { field: 'tier', headerName: 'Tier', width: 100 },
        {
            field: 'monthly_cost',
            headerName: 'Cost ($/mo)',
            type: 'number',
            width: 120,
            valueFormatter: (value: number | null | undefined) => {
                if (typeof value === 'number') {
                    return value.toFixed(2);
                }
                return ''; // Or return '-', 'N/A', or handle as appropriate
            },
        },
        { 
            field: 'is_base_employer_package', 
            headerName: 'Base Pkg?', 
            type: 'boolean', 
            width: 100,
            renderCell: (params) => (
                params.value ? <Chip label="Yes" color="success" size="small" /> : <Chip label="No" size="small" />
            )
         },
        { field: 'description', headerName: 'Description', flex: 2, minWidth: 200 },
        {
            field: 'actions',
            type: 'actions',
            headerName: 'Actions',
            width: 100,
            cellClassName: 'actions',
            getActions: ({ id, row }) => {
                return [
                    <GridActionsCellItem
                        icon={<EditIcon />}
                        label="Edit"
                        onClick={() => handleOpenEditModal(row)}
                        color="inherit"
                    />,
                    <GridActionsCellItem
                        icon={<DeleteIcon />}
                        label="Delete"
                        onClick={() => handleOpenDeleteDialog(id as string)}
                        color="inherit"
                    />,
                ];
            },
        },
    ];

    return (
        <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h4" gutterBottom={false}>
                    Manage Benefit Packages
                </Typography>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={handleOpenCreateModal}
                >
                    Create Package
                </Button>
            </Box>

            {pageError && (
                <Alert severity="error" sx={{ mb: 2 }}>{pageError}</Alert>
            )} 
            {/* Display general page errors */}

            <Paper sx={{ height: 600, width: '100%' }}>
                <DataGrid
                    rows={packages}
                    columns={columns}
                    loading={loading}
                    initialState={{
                        pagination: {
                            paginationModel: { page: 0, pageSize: 10 },
                        },
                    }}
                    pageSizeOptions={[5, 10, 25]}
                    // checkboxSelection // Optional
                    disableRowSelectionOnClick
                />
            </Paper>

            {/* Create/Edit Modal Component */}
            <PackageFormModal
                open={isCreateModalOpen || isEditModalOpen}
                onClose={isEditModalOpen ? handleCloseEditModal : handleCloseCreateModal}
                onSave={handleSavePackage}
                initialData={editingPackage ? {
                    id: editingPackage.id,
                    name: editingPackage.name,
                    tier: editingPackage.tier as typeof packageTierEnum.enumValues[number],
                    monthly_cost: editingPackage.monthly_cost,
                    description: editingPackage.description || '',
                    key_benefits: editingPackage.key_benefits || [],
                    is_base_employer_package: editingPackage.is_base_employer_package,
                    organization_id: editingPackage.organization_id || '',
                } : null}
                isSaving={isSaving}
                organizations={organizations}
            />

            {/* Delete Confirmation Dialog Component */}
            <DeleteConfirmationDialog
                open={isDeleteDialogOpen}
                onClose={handleCloseDeleteDialog}
                onConfirm={handleConfirmDelete}
                title="Delete Package?"
                message={`Are you sure you want to delete the package${deletingPackageId ? ': ' + (packages.find(p => p.id === deletingPackageId)?.name || deletingPackageId) : ''}? This action cannot be undone.`}
                isDeleting={isDeletingState} // Pass deleting state
            />

            {/* Snackbar for feedback */}
            <Snackbar 
                open={snackbarOpen} 
                autoHideDuration={6000} // Hide after 6 seconds
                onClose={handleCloseSnackbar}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }} // Position
            >
                {/* Use Alert inside Snackbar for consistent styling and severity icon */}
                {/* Use a key to force re-render if message/severity changes while open */}
                <Alert 
                    onClose={handleCloseSnackbar} 
                    severity={snackbarSeverity} 
                    variant="filled" 
                    sx={{ width: '100%' }}
                    key={snackbarMessage} 
                >
                    {snackbarMessage}
                </Alert>
            </Snackbar>
        </Box>
    );
} 