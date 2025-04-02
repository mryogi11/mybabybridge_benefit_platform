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
    email: 'admin@test.com',
    password: 'Password123!',
    firstName: 'Admin',
    lastName: 'User',
    role: 'admin'
  },
  {
    email: 'provider@test.com',
    password: 'Password123!',
    firstName: 'Provider',
    lastName: 'User',
    role: 'provider'
  }
];

async function createTestUsers() {
  console.log('Starting test user creation...');

  for (const user of testUsers) {
    try {
      // Check if user already exists
      const { data: existingUsers, error: checkError } = await supabase
        .from('users')
        .select('id, email')
        .eq('email', user.email);

      if (checkError) {
        throw new Error(`Error checking for existing user: ${checkError.message}`);
      }

      if (existingUsers?.length > 0) {
        console.log(`User ${user.email} already exists. Updating role...`);
        
        // Update role for existing user
        const { error: updateError } = await supabase
          .from('users')
          .update({ role: user.role })
          .eq('email', user.email);

        if (updateError) {
          throw new Error(`Error updating user role: ${updateError.message}`);
        }

        console.log(`Updated ${user.email} role to ${user.role}`);
        continue;
      }

      // Create new user with Supabase Auth
      console.log(`Creating user: ${user.email}...`);
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: user.email,
        password: user.password,
      });

      if (authError) {
        throw new Error(`Error signing up user: ${authError.message}`);
      }

      if (!authData?.user?.id) {
        throw new Error('User creation failed: No user ID returned');
      }

      // Add user profile data
      console.log(`Adding profile data for ${user.email}...`);
      const { error: profileError } = await supabase
        .from('users')
        .upsert({
          id: authData.user.id,
          email: user.email,
          first_name: user.firstName,
          last_name: user.lastName,
          role: user.role,
          created_at: new Date().toISOString()
        });

      if (profileError) {
        throw new Error(`Error creating user profile: ${profileError.message}`);
      }

      console.log(`✅ Successfully created ${user.email} with role: ${user.role}`);
    } catch (error) {
      console.error(`❌ Error processing user ${user.email}:`, error.message);
    }
  }

  console.log('Test user setup complete!');
}

// Run the script
createTestUsers()
  .catch(error => {
    console.error('Script execution failed:', error);
    process.exit(1);
  }); 