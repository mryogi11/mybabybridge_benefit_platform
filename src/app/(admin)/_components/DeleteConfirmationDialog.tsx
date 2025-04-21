'use client';

import React from 'react';
import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    CircularProgress
} from '@mui/material';

interface DeleteConfirmationDialogProps {
    open: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    isDeleting?: boolean; // Optional prop to show loading state
}

export default function DeleteConfirmationDialog({
    open,
    onClose,
    onConfirm,
    title,
    message,
    isDeleting = false // Default to false
}: DeleteConfirmationDialogProps) {
    return (
        <Dialog
            open={open}
            onClose={onClose}
            aria-labelledby="alert-dialog-title"
            aria-describedby="alert-dialog-description"
        >
            <DialogTitle id="alert-dialog-title">{title}</DialogTitle>
            <DialogContent>
                <DialogContentText id="alert-dialog-description">
                    {message}
                </DialogContentText>
            </DialogContent>
            <DialogActions sx={{ p: '16px 24px'}}>
                <Button onClick={onClose} color="inherit" disabled={isDeleting}>
                    Cancel
                </Button>
                <Button onClick={onConfirm} color="error" variant="contained" disabled={isDeleting} autoFocus>
                    {isDeleting ? <CircularProgress size={24} color="inherit" /> : 'Confirm Delete'}
                </Button>
            </DialogActions>
        </Dialog>
    );
} 