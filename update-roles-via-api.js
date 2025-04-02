// Use import syntax for ES modules
import fetch from 'node-fetch';

// API endpoint (assumes you're running the development server)
const API_URL = 'http://localhost:3000/api/admin/update-role';
const API_SECRET_KEY = 'test-secret-key-123'; // Must match the one in the API route

// Users to update
const usersToUpdate = [
  { email: 'admin.test@mybaby.com', role: 'admin' },
  { email: 'provider.test@mybaby.com', role: 'provider' }
];

async function updateUserRoles() {
  console.log('Updating user roles via API...');

  for (const user of usersToUpdate) {
    try {
      console.log(`\nUpdating ${user.email} to role '${user.role}'...`);
      
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: user.email,
          role: user.role,
          secretKey: API_SECRET_KEY
        }),
      });
      
      const result = await response.json();
      
      if (response.ok) {
        console.log(`✅ Success: ${result.message}`);
      } else {
        console.log(`❌ Error: ${result.error || result.message || 'Unknown error'}`);
        console.log(`Status: ${response.status}`);
      }
    } catch (error) {
      console.error(`❌ Failed to update ${user.email}:`, error.message);
    }
  }
  
  console.log('\nRole update process completed.');
}

// Run the script
updateUserRoles()
  .catch(error => {
    console.error('Script execution failed:', error);
  }); 