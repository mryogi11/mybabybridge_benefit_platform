import EventNoteIcon from '@mui/icons-material/EventNote';

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
// ... rest of component ... 