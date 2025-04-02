require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Missing Supabase credentials in .env.local file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Users to update
const userUpdates = [
  { email: 'admin@test.com', role: 'admin' },
  { email: 'provider@test.com', role: 'provider' }
];

// Function to display all users and their roles
async function listAllUsers() {
  console.log('\nCurrent users in the database:');
  
  try {
    const { data: users, error } = await supabase
      .from('profiles')
      .select('id, email, first_name, last_name, role');
      
    if (error) {
      console.error('Error fetching users:', error.message);
      return;
    }
    
    if (!users || users.length === 0) {
      console.log('No users found in the database.');
      return;
    }
    
    // Display users
    console.log('----------------------------------------');
    console.log('| ID (truncated) | Email            | Role     |');
    console.log('----------------------------------------');
    
    users.forEach(user => {
      const idShort = user.id.substring(0, 8) + '...';
      console.log(`| ${idShort} | ${user.email.padEnd(15)} | ${(user.role || 'unknown').padEnd(8)} |`);
    });
    
    console.log('----------------------------------------');
  } catch (err) {
    console.error('Error listing users:', err.message);
  }
}

// Update user roles
async function updateUserRoles() {
  console.log('Checking for user tables...');
  
  // Check tables in the database
  try {
    const { data: tables, error } = await supabase
      .rpc('get_tables');
    
    if (error) {
      if (error.message.includes('function "get_tables" does not exist')) {
        console.log('Cannot retrieve table list. Attempting direct updates...');
      } else {
        console.error('Database query error:', error.message);
      }
    } else {
      console.log('Available tables:');
      tables.forEach(table => console.log(`- ${table}`));
    }
  } catch (err) {
    console.log('Error checking tables:', err.message);
  }

  // Try updating profiles (common table name in Supabase)
  for (const user of userUpdates) {
    console.log(`\nAttempting to update ${user.email} to role: ${user.role}`);
    
    // Try profiles table first
    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .update({ role: user.role })
        .eq('email', user.email);
      
      if (profileError) {
        if (profileError.message.includes('relation "profiles" does not exist')) {
          console.log('Profiles table not found. Trying users table...');
        } else if (profileError.message.includes('column "role" of relation "profiles" does not exist')) {
          console.log('Role column not found in profiles table. Trying users table...');
        } else {
          console.log(`Error updating profile: ${profileError.message}`);
        }
      } else {
        console.log(`✅ Successfully updated role in profiles table for ${user.email}`);
        continue;
      }
    } catch (err) {
      console.log(`Error with profiles table: ${err.message}`);
    }
    
    // Try users table as fallback
    try {
      const { data: userData, error: userError } = await supabase
        .from('users')
        .update({ role: user.role })
        .eq('email', user.email);
      
      if (userError) {
        if (userError.message.includes('relation "users" does not exist')) {
          console.log('Users table not found.');
        } else {
          console.log(`Error updating user: ${userError.message}`);
        }
      } else {
        console.log(`✅ Successfully updated role in users table for ${user.email}`);
      }
    } catch (err) {
      console.log(`Error with users table: ${err.message}`);
    }
  }

  // Display current users and roles
  await listAllUsers();
}

// Run the script
updateUserRoles()
  .then(() => {
    console.log('\nRole update process completed.');
  })
  .catch(error => {
    console.error('Script execution failed:', error);
  }); 