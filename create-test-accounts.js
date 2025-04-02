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

// Test user details
const testUsers = [
  {
    email: 'admin.test@mybaby.com',
    password: 'Password123!',
    firstName: 'Admin',
    lastName: 'User',
    role: 'admin'
  },
  {
    email: 'provider.test@mybaby.com',
    password: 'Password123!',
    firstName: 'Provider',
    lastName: 'User',
    role: 'provider'
  }
];

// Function to discover database structure
async function discoverDatabaseStructure() {
  console.log('Attempting to discover database structure...');
  
  // Try to list all tables (requires appropriate permissions)
  try {
    const { data, error } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public');
    
    if (error) {
      console.log('Could not query schema information:', error.message);
    } else if (data) {
      console.log('Found tables:');
      data.forEach(table => console.log(`- ${table.table_name}`));
      return data.map(table => table.table_name);
    }
  } catch (err) {
    console.log('Error querying schema:', err.message);
  }
  
  // Alternative approach: try common table names
  const commonTables = ['users', 'profiles', 'auth_users', 'user_profiles'];
  const foundTables = [];
  
  for (const tableName of commonTables) {
    try {
      const { data, error } = await supabase
        .from(tableName)
        .select('count(*)')
        .limit(1);
      
      if (!error) {
        console.log(`Table '${tableName}' exists`);
        foundTables.push(tableName);
      }
    } catch (err) {
      // Table likely doesn't exist - skip
    }
  }
  
  return foundTables;
}

async function createTestUsers() {
  console.log('Starting test user creation...');
  
  // Discover database structure
  const tables = await discoverDatabaseStructure();
  
  for (const user of testUsers) {
    console.log(`\nProcessing user: ${user.email}`);
    
    try {
      // Step 1: Create user in Auth system
      console.log(`Creating authentication for ${user.email}...`);
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: user.email,
        password: user.password,
        options: {
          data: {
            first_name: user.firstName,
            last_name: user.lastName,
            role: user.role
          }
        }
      });
      
      if (authError) {
        console.error(`Error creating auth for ${user.email}:`, authError.message);
        continue;
      }
      
      if (!authData?.user?.id) {
        console.error(`No user ID returned for ${user.email}`);
        continue;
      }
      
      console.log(`✅ Auth created for ${user.email} with ID: ${authData.user.id}`);
      
      // Step 2: Try to update profile in various possible tables
      if (tables.includes('profiles')) {
        const { error } = await supabase
          .from('profiles')
          .upsert({
            id: authData.user.id,
            email: user.email,
            first_name: user.firstName,
            last_name: user.lastName,
            role: user.role,
            created_at: new Date().toISOString()
          });
          
        if (error) {
          console.log(`Error updating profiles table: ${error.message}`);
        } else {
          console.log(`✅ Updated 'profiles' table for ${user.email}`);
        }
      }
      
      if (tables.includes('users')) {
        const { error } = await supabase
          .from('users')
          .upsert({
            id: authData.user.id,
            email: user.email,
            first_name: user.firstName,
            last_name: user.lastName,
            role: user.role,
            created_at: new Date().toISOString()
          });
          
        if (error) {
          console.log(`Error updating users table: ${error.message}`);
        } else {
          console.log(`✅ Updated 'users' table for ${user.email}`);
        }
      }
      
      console.log(`✅ User ${user.email} processed successfully`);
    } catch (error) {
      console.error(`❌ Error processing user ${user.email}:`, error.message);
    }
  }
  
  console.log('\nTest user creation complete');
  console.log('\nLogin Credentials:');
  testUsers.forEach(user => {
    console.log(`- ${user.role.toUpperCase()}: ${user.email} / ${user.password}`);
  });
}

// Run the script
createTestUsers()
  .catch(error => {
    console.error('Script execution failed:', error);
    process.exit(1);
  }); 