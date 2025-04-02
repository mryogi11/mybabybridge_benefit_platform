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
  { email: 'admin.test@mybaby.com', role: 'admin' },
  { email: 'provider.test@mybaby.com', role: 'provider' }
];

// Try to update users in various possible tables
async function updateUserRoles() {
  console.log('Attempting to update user roles...');
  
  // First, find the users to get their IDs
  for (const user of userUpdates) {
    console.log(`\nProcessing user: ${user.email}`);
    
    try {
      // Find user by email
      const { data: userData, error: userError } = await supabase.auth.admin.listUsers();
      
      if (userError) {
        console.log(`Error fetching users: ${userError.message}`);
        console.log('Trying alternative approach...');
      } else if (userData) {
        const matchedUser = userData.users.find(u => u.email === user.email);
        if (matchedUser) {
          console.log(`Found user with ID: ${matchedUser.id}`);
          
          // Try updating in profiles table
          await updateUserInTable('profiles', matchedUser.id, user.email, user.role);
          
          // Try updating in users table
          await updateUserInTable('users', matchedUser.id, user.email, user.role);
        } else {
          console.log(`User with email ${user.email} not found`);
        }
      }
    } catch (error) {
      console.error(`Error processing user ${user.email}:`, error.message);
      
      // Try alternative approach - search by email directly
      try {
        // Try profiles table
        const { data: profilesByEmail } = await supabase
          .from('profiles')
          .select('id, email, role')
          .eq('email', user.email);
          
        if (profilesByEmail && profilesByEmail.length > 0) {
          console.log(`Found user in profiles table with ID: ${profilesByEmail[0].id}`);
          await updateUserInTable('profiles', profilesByEmail[0].id, user.email, user.role);
        }
        
        // Try users table
        const { data: usersByEmail } = await supabase
          .from('users')
          .select('id, email, role')
          .eq('email', user.email);
          
        if (usersByEmail && usersByEmail.length > 0) {
          console.log(`Found user in users table with ID: ${usersByEmail[0].id}`);
          await updateUserInTable('users', usersByEmail[0].id, user.email, user.role);
        }
      } catch (searchError) {
        console.log('Error in alternative search:', searchError.message);
      }
    }
  }

  console.log('\nRole update attempts completed');
  console.log('If updates were not successful, try directly using the Supabase dashboard');
}

// Helper function to update a user role in a specific table
async function updateUserInTable(tableName, userId, email, role) {
  try {
    const { error } = await supabase
      .from(tableName)
      .update({ role })
      .eq('id', userId);
      
    if (error) {
      if (error.message.includes('does not exist')) {
        console.log(`Table ${tableName} does not exist. Skipping.`);
      } else if (error.message.includes('column "role" of relation') && error.message.includes('does not exist')) {
        console.log(`No role column in ${tableName} table. Skipping.`);
      } else {
        console.log(`Error updating ${tableName} table: ${error.message}`);
      }
    } else {
      console.log(`✅ Successfully updated role to '${role}' for ${email} in ${tableName} table`);
    }
  } catch (err) {
    console.log(`Error updating ${tableName}: ${err.message}`);
  }
}

// Run the script
updateUserRoles()
  .catch(error => {
    console.error('Script execution failed:', error);
  }); 