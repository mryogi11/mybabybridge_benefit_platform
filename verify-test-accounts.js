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

// Test user credentials
const testUsers = [
  {
    email: 'admin.test@mybaby.com',
    password: 'Password123!',
    expectedRole: 'admin'
  },
  {
    email: 'provider.test@mybaby.com',
    password: 'Password123!',
    expectedRole: 'provider'
  }
];

async function verifyUserRoles() {
  console.log('Verifying test accounts and roles...\n');

  for (const user of testUsers) {
    try {
      // Sign in as the user
      console.log(`Signing in as ${user.email}...`);
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: user.password
      });

      if (authError) {
        console.error(`❌ Failed to sign in as ${user.email}: ${authError.message}`);
        continue;
      }

      if (!authData?.user) {
        console.error(`❌ No user data returned for ${user.email}`);
        continue;
      }

      console.log(`✅ Successfully signed in as ${user.email}`);
      
      // Get user data
      const userData = authData.user;
      console.log(`User details for ${user.email}:`);
      console.log(`- ID: ${userData.id}`);
      console.log(`- Email: ${userData.email}`);
      console.log(`- Created: ${new Date(userData.created_at).toLocaleString()}`);
      
      // Check user metadata
      const userMetadata = userData.user_metadata || {};
      console.log(`- First Name: ${userMetadata.first_name || 'Not set'}`);
      console.log(`- Last Name: ${userMetadata.last_name || 'Not set'}`);
      console.log(`- Role in metadata: ${userMetadata.role || 'Not set'}`);
      
      if (userMetadata.role === user.expectedRole) {
        console.log(`✅ User has correct role in metadata: ${userMetadata.role}`);
      } else {
        console.log(`⚠️ User role in metadata is '${userMetadata.role || 'not set'}', expected '${user.expectedRole}'`);
      }
      
      // Try to check role in users/profiles table
      try {
        // Try profiles first
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userData.id)
          .single();
          
        if (!profileError && profileData) {
          console.log(`Profile data found in 'profiles' table:`);
          console.log(`- Role in profiles: ${profileData.role || 'Not set'}`);
          
          if (profileData.role === user.expectedRole) {
            console.log(`✅ User has correct role in profiles table: ${profileData.role}`);
          } else {
            console.log(`⚠️ User role in profiles table is '${profileData.role || 'not set'}', expected '${user.expectedRole}'`);
          }
        } else {
          console.log(`No profile data found in 'profiles' table: ${profileError?.message || 'Table might not exist'}`);
        }
        
        // Try users table
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('id', userData.id)
          .single();
          
        if (!userError && userData) {
          console.log(`Profile data found in 'users' table:`);
          console.log(`- Role in users: ${userData.role || 'Not set'}`);
          
          if (userData.role === user.expectedRole) {
            console.log(`✅ User has correct role in users table: ${userData.role}`);
          } else {
            console.log(`⚠️ User role in users table is '${userData.role || 'not set'}', expected '${user.expectedRole}'`);
          }
        } else {
          console.log(`No profile data found in 'users' table: ${userError?.message || 'Table might not exist'}`);
        }
      } catch (error) {
        console.log(`Error checking user tables: ${error.message}`);
      }
      
      // Sign out after checking
      await supabase.auth.signOut();
      console.log(`Signed out from ${user.email}\n`);
      
    } catch (error) {
      console.error(`❌ Error verifying ${user.email}: ${error.message}\n`);
    }
  }
  
  console.log('Verification complete');
}

// Run verification
verifyUserRoles()
  .catch(error => {
    console.error('Script execution failed:', error);
  }); 