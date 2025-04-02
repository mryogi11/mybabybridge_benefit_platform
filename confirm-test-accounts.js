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

// Test user emails
const testUserEmails = [
  'admin.test@mybaby.com',
  'provider.test@mybaby.com'
];

// Function to attempt auto-confirmation using admin key
async function confirmTestAccounts() {
  console.log('Attempting to confirm test accounts...');
  console.log('Note: For this to work, you need to use the Supabase service_role key instead of the anon key.');
  console.log('This script is using the public anon key and may not have sufficient permissions.');
  console.log('Consider confirming the accounts through the Supabase dashboard instead.\n');

  for (const email of testUserEmails) {
    try {
      console.log(`Attempting to confirm ${email}...`);
      
      // This approach requires the service_role key, not the anon key
      // This won't work with the anon key, but we're including it for reference
      const { error } = await supabase.auth.admin.updateUserById(
        'user-id-here', // This would be the actual user ID
        { email_confirm: true }
      );
      
      if (error) {
        console.error(`❌ Failed to confirm ${email}: ${error.message}`);
        continue;
      }
      
      console.log(`✅ Successfully confirmed ${email}`);
    } catch (error) {
      console.error(`❌ Error confirming ${email}: ${error.message}`);
    }
  }
  
  console.log('\nAlternative approach for development:');
  console.log('1. Visit the Supabase dashboard: https://app.supabase.io');
  console.log('2. Go to Authentication → Users');
  console.log('3. Find the test users and confirm their email addresses manually');
  console.log('4. Or, use the service_role key with this script instead of the anon key');
  
  console.log('\nWorkaround for testing:');
  console.log('Since we only need these accounts for testing, you can create new accounts through the app UI');
  console.log('and then use this script to verify the credentials:');
  console.log('1. Visit http://localhost:3000/register in your browser');
  console.log('2. Create accounts with these emails:');
  testUserEmails.forEach(email => console.log(`   - ${email}`));
  console.log('3. Log in to your Supabase dashboard and assign the appropriate roles');
}

// Run the script
confirmTestAccounts()
  .catch(error => {
    console.error('Script execution failed:', error);
  }); 