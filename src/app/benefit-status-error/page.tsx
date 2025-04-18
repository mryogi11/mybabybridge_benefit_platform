'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    Box,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions,
    Button,
    CircularProgress,
    Container
} from '@mui/material';

export default function BenefitStatusErrorPage() {
    const router = useRouter();
    // Dialog is open by default when this page loads
    const [open, setOpen] = useState(true); 

    // Although the dialog controls navigation, 
    // add a simple loading indicator while the page/dialog mounts.
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Simulate loading/mounting delay if needed, or just set loading false
        setIsLoading(false);
        setOpen(true); // Ensure dialog is open on mount
    }, []);

    const handleOkClick = () => {
        router.push('/'); // Navigate to the homepage
    };

    if (isLoading) {
        return (
            <Container maxWidth="xs">
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                    <CircularProgress />
                </Box>
            </Container>
        );
    }

    return (
        <Container maxWidth="xs">
            {/* Render minimal content behind the dialog or nothing */}
            <Dialog
                open={open}
                aria-labelledby="status-error-dialog-title"
                aria-describedby="status-error-dialog-description"
                disableEscapeKeyDown // Prevent closing with Escape key
                // onClose is intentionally omitted or handled conditionally 
                // to prevent closing on backdrop click
                // onClose={(event, reason) => { 
                //     if (reason !== 'backdropClick') { 
                //        // handle close if needed for other reasons, but we don't want it closeable here
                //     } 
                // }}
            >
                <DialogTitle id="status-error-dialog-title">
                    Benefit Status Issue
                </DialogTitle>
                <DialogContent>
                    <DialogContentText id="status-error-dialog-description">
                        There is an issue regarding your benefit status or verification.
                        Please contact support or try again later.
                    </DialogContentText>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={handleOkClick} variant="contained" autoFocus>
                        OK
                    </Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
} 