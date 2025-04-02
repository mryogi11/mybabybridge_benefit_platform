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

// Users to update - try with all possible table structures we might have
const updates = [
  // Update admin account
  { 
    email: 'admin.test@mybaby.com', 
    updates: [
      { table: 'users', values: { role: 'admin' } },
      { table: 'profiles', values: { role: 'admin' } },
      { table: 'auth.users', values: { role: 'admin' } }
    ]
  },
  // Update provider account
  { 
    email: 'provider.test@mybaby.com', 
    updates: [
      { table: 'users', values: { role: 'provider' } },
      { table: 'profiles', values: { role: 'provider' } },
      { table: 'auth.users', values: { role: 'provider' } }
    ] 
  }
];

async function updateRoles() {
  console.log('Starting role updates...');
  
  for (const user of updates) {
    console.log(`\nProcessing ${user.email}...`);
    
    for (const update of user.updates) {
      try {
        console.log(`Attempting to update role in ${update.table} table...`);
        
        const { data, error } = await supabase
          .from(update.table)
          .update(update.values)
          .eq('email', user.email);
        
        if (error) {
          if (error.message.includes('does not exist')) {
            console.log(`Table '${update.table}' doesn't exist. Skipping.`);
          } else {
            console.log(`Error updating ${update.table}: ${error.message}`);
          }
        } else {
          console.log(`✅ Successfully updated role in ${update.table} for ${user.email}`);
        }
      } catch (err) {
        console.log(`Error with ${update.table}: ${err.message}`);
      }
    }
  }
  
  // Try SQL approach as a last resort
  console.log('\nTrying SQL approach as fallback...');
  try {
    const queries = [
      `UPDATE users SET role = 'admin' WHERE email = 'admin.test@mybaby.com';`,
      `UPDATE users SET role = 'provider' WHERE email = 'provider.test@mybaby.com';`,
      `UPDATE profiles SET role = 'admin' WHERE email = 'admin.test@mybaby.com';`,
      `UPDATE profiles SET role = 'provider' WHERE email = 'provider.test@mybaby.com';`
    ];
    
    for (const query of queries) {
      try {
        const { error } = await supabase.rpc('execute_sql', { sql: query });
        if (error) {
          console.log(`SQL Error: ${error.message}`);
        } else {
          console.log(`✅ SQL executed successfully: ${query}`);
        }
      } catch (err) {
        console.log(`Error executing SQL: ${err.message}`);
      }
    }
  } catch (err) {
    console.log('Error with SQL approach:', err.message);
  }
  
  console.log('\nRole update attempts completed.');
  console.log('If the updates were not successful, you may need to:');
  console.log('1. Log in to the Supabase dashboard and update the roles directly');
  console.log('2. Or log in as an existing admin user and update the roles through the admin UI');
}

updateRoles().catch(err => {
  console.error('Script failed:', err);
}); 