import EventNoteIcon from '@mui/icons-material/EventNote';
import BarChartIcon from '@mui/icons-material/BarChart';
import PeopleIcon from '@mui/icons-material/People';
import { ListItem, ListItemButton, ListItemIcon, ListItemText } from '@mui/material';
import Link from 'next/link';

export default function AdminSideDrawerContent() {
  return (
    <>
      {/* Analytics Link */}
      <ListItem disablePadding>
        <ListItemButton component={Link} href="/admin/analytics">
          <ListItemIcon>
            <BarChartIcon />
          </ListItemIcon>
          <ListItemText primary="Analytics" />
        </ListItemButton>
      </ListItem>

      {/* Appointments Management Link */}
      <ListItem disablePadding>
        <ListItemButton component={Link} href="/admin/appointments">
          <ListItemIcon>
            <EventNoteIcon />
          </ListItemIcon>
          <ListItemText primary="Appointments" />
        </ListItemButton>
      </ListItem>

      {/* Users Management Link */}
      <ListItem disablePadding>
        <ListItemButton component={Link} href="/admin/users">
          <ListItemIcon>
            <PeopleIcon />
          </ListItemIcon>
          <ListItemText primary="Users" />
        </ListItemButton>
      </ListItem>
    </>
  );
} 