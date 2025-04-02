'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Stack,
  Button,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Menu,
  MenuItem,
  Chip,
  Alert,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import ShareIcon from '@mui/icons-material/Share';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import DownloadIcon from '@mui/icons-material/Download';
import { supabase } from '@/lib/supabase/client';
import { format } from 'date-fns';

interface DocumentCategory {
  id: string;
  name: string;
  description: string;
}

interface Document {
  id: string;
  title: string;
  description: string;
  file_path: string;
  file_type: string;
  file_size: number;
  category_id: string;
  is_private: boolean;
  created_at: string;
  category?: DocumentCategory;
}

export default function DocumentsPage() {
  const [loading, setLoading] = useState(true);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [categories, setCategories] = useState<DocumentCategory[]>([]);
  const [uploadDialog, setUploadDialog] = useState(false);
  const [shareDialog, setShareDialog] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [newDocument, setNewDocument] = useState({
    title: '',
    description: '',
    category_id: '',
    is_private: false,
    file: null as File | null,
  });
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDocuments();
    fetchCategories();
  }, []);

  const fetchDocuments = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('documents')
      .select(`
        *,
        category:document_categories(*)
      `)
      .eq('patient_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching documents:', error);
      setError('Failed to load documents');
      return;
    }

    setDocuments(data);
    setLoading(false);
  };

  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from('document_categories')
      .select('*')
      .order('name');

    if (error) {
      console.error('Error fetching categories:', error);
      return;
    }

    setCategories(data);
  };

  const handleFileUpload = async () => {
    if (!newDocument.file) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      // Upload file to Supabase Storage
      const fileExt = newDocument.file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      const filePath = `documents/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, newDocument.file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Create document record
      const { data, error: insertError } = await supabase
        .from('documents')
        .insert({
          patient_id: user.id,
          title: newDocument.title,
          description: newDocument.description,
          category_id: newDocument.category_id,
          file_path: filePath,
          file_type: newDocument.file.type,
          file_size: newDocument.file.size,
          is_private: newDocument.is_private,
          uploaded_by: user.id,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      setDocuments([data, ...documents]);
      setUploadDialog(false);
      setNewDocument({
        title: '',
        description: '',
        category_id: '',
        is_private: false,
        file: null,
      });
      setUploadProgress(0);
    } catch (error) {
      console.error('Error uploading document:', error);
      setError('Failed to upload document');
    }
  };

  const handleDeleteDocument = async (id: string) => {
    try {
      const document = documents.find(d => d.id === id);
      if (!document) return;

      // Delete file from storage
      const { error: storageError } = await supabase.storage
        .from('documents')
        .remove([document.file_path]);

      if (storageError) throw storageError;

      // Delete document record
      const { error: deleteError } = await supabase
        .from('documents')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      setDocuments(documents.filter(d => d.id !== id));
    } catch (error) {
      console.error('Error deleting document:', error);
      setError('Failed to delete document');
    }
  };

  const handleDownloadDocument = async (doc: Document) => {
    try {
      const { data, error } = await supabase.storage
        .from('documents')
        .download(doc.file_path);

      if (error) throw error;

      const url = window.URL.createObjectURL(data);
      const link = window.document.createElement('a');
      link.href = url;
      link.download = doc.title;
      window.document.body.appendChild(link);
      link.click();
      window.document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading document:', error);
      setError('Failed to download document');
    }
  };

  const handleShareDocument = async (document: Document) => {
    setSelectedDocument(document);
    setShareDialog(true);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Stack spacing={3}>
        <Typography variant="h4">My Documents</Typography>

        {error && (
          <Alert severity="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Card>
          <CardContent>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">All Documents</Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setUploadDialog(true)}
              >
                Upload Document
              </Button>
            </Stack>

            <Stack spacing={2}>
              {documents.map((document) => (
                <Box
                  key={document.id}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    p: 2,
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1,
                  }}
                >
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="subtitle1">{document.title}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {document.description}
                    </Typography>
                    <Stack direction="row" spacing={1} mt={1}>
                      <Chip
                        label={document.category?.name || 'Uncategorized'}
                        size="small"
                        color="primary"
                        variant="outlined"
                      />
                      {document.is_private && (
                        <Chip
                          label="Private"
                          size="small"
                          color="error"
                          variant="outlined"
                        />
                      )}
                    </Stack>
                    <Typography variant="caption" color="text.secondary">
                      Uploaded {format(new Date(document.created_at), 'MMM d, yyyy')}
                    </Typography>
                  </Box>
                  <Stack direction="row" spacing={1}>
                    <IconButton
                      onClick={() => handleDownloadDocument(document)}
                      color="primary"
                    >
                      <DownloadIcon />
                    </IconButton>
                    <IconButton
                      onClick={() => handleShareDocument(document)}
                      color="primary"
                    >
                      <ShareIcon />
                    </IconButton>
                    <IconButton
                      onClick={(e) => setAnchorEl(e.currentTarget)}
                      color="primary"
                    >
                      <MoreVertIcon />
                    </IconButton>
                  </Stack>
                </Box>
              ))}
            </Stack>
          </CardContent>
        </Card>
      </Stack>

      {/* Upload Dialog */}
      <Dialog open={uploadDialog} onClose={() => setUploadDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Upload Document</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 2 }}>
            <TextField
              label="Title"
              fullWidth
              value={newDocument.title}
              onChange={(e) => setNewDocument({ ...newDocument, title: e.target.value })}
            />
            <TextField
              label="Description"
              fullWidth
              multiline
              rows={3}
              value={newDocument.description}
              onChange={(e) => setNewDocument({ ...newDocument, description: e.target.value })}
            />
            <TextField
              select
              label="Category"
              fullWidth
              value={newDocument.category_id}
              onChange={(e) => setNewDocument({ ...newDocument, category_id: e.target.value })}
            >
              {categories.map((category) => (
                <MenuItem key={category.id} value={category.id}>
                  {category.name}
                </MenuItem>
              ))}
            </TextField>
            <Button
              variant="outlined"
              component="label"
              fullWidth
            >
              Choose File
              <input
                type="file"
                hidden
                onChange={(e) => setNewDocument({ ...newDocument, file: e.target.files?.[0] || null })}
              />
            </Button>
            {newDocument.file && (
              <Typography variant="body2" color="text.secondary">
                Selected file: {newDocument.file.name}
              </Typography>
            )}
            {uploadProgress > 0 && (
              <Box sx={{ width: '100%' }}>
                <CircularProgress variant="determinate" value={uploadProgress} />
                <Typography variant="body2" color="text.secondary">
                  Uploading: {Math.round(uploadProgress)}%
                </Typography>
              </Box>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUploadDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleFileUpload}
            disabled={!newDocument.title || !newDocument.file || uploadProgress > 0}
          >
            Upload
          </Button>
        </DialogActions>
      </Dialog>

      {/* Share Dialog */}
      <Dialog open={shareDialog} onClose={() => setShareDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Share Document</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 2 }}>
            <Typography variant="body1">
              Share "{selectedDocument?.title}" with:
            </Typography>
            <TextField
              label="Email Address"
              fullWidth
              placeholder="Enter email address"
            />
            <TextField
              select
              label="Permission"
              fullWidth
              defaultValue="view"
            >
              <MenuItem value="view">View Only</MenuItem>
              <MenuItem value="download">Download</MenuItem>
              <MenuItem value="edit">Edit</MenuItem>
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShareDialog(false)}>Cancel</Button>
          <Button variant="contained">Share</Button>
        </DialogActions>
      </Dialog>

      {/* Document Actions Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
      >
        <MenuItem onClick={() => {
          if (selectedDocument) {
            handleDeleteDocument(selectedDocument.id);
          }
          setAnchorEl(null);
        }}>
          <DeleteIcon sx={{ mr: 1 }} /> Delete
        </MenuItem>
      </Menu>
    </Box>
  );
} 