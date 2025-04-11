import EventNoteIcon from '@mui/icons-material/EventNote';
import { ListItem, ListItemButton, ListItemIcon, ListItemText } from '@mui/material';
import Link from 'next/link';

export default function AdminSideDrawerContent() {
  return (
    <>
      {/* Appointments Management Link */}
      <ListItem disablePadding>
        <ListItemButton component={Link} href="/admin/appointments">
          <ListItemIcon>
            <EventNoteIcon />
          </ListItemIcon>
          <ListItemText primary="Appointments" />
        </ListItemButton>
      </ListItem>

      {/* Existing items like Users, Providers etc. */}
      <ListItem disablePadding>
        <ListItemButton component={Link} href="/admin/users">
          <ListItemIcon>
            <EventNoteIcon />
          </ListItemIcon>
          <ListItemText primary="Users" />
        </ListItemButton>
      </ListItem>
    </>
  );
} 