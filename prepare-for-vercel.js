#!/usr/bin/env node

/**
 * This script prepares the project for deployment to Vercel
 * It verifies the necessary configuration and files
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

// Log function with color support
function log(message, type = 'info') {
  const colorMap = {
    success: colors.green,
    error: colors.red,
    warning: colors.yellow,
    info: colors.blue,
    title: colors.bright,
  };

  console.log(`${colorMap[type] || ''}${message}${colors.reset}`);
}

// Check if a file exists
function checkFile(filePath, required = true) {
  const exists = fs.existsSync(filePath);
  const relPath = path.relative(process.cwd(), filePath);
  
  if (exists) {
    log(`✓ ${relPath} found`, 'success');
    return true;
  } else if (required) {
    log(`✗ Required file ${relPath} not found`, 'error');
    return false;
  } else {
    log(`! ${relPath} not found (optional)`, 'warning');
    return false;
  }
}

// Main function
async function main() {
  log('\n=== MyBabyBridge Vercel Deployment Preparation ===\n', 'title');
  
  // Check essential files
  log('Checking essential files...', 'title');
  const requiredFiles = [
    'package.json',
    'next.config.js',
    'vercel.json'
  ];
  
  let allRequiredFilesExist = true;
  
  for (const file of requiredFiles) {
    if (!checkFile(file)) {
      allRequiredFilesExist = false;
    }
  }
  
  // Check for .env file but don't fail if it doesn't exist
  checkFile('.env.local', false);
  
  // Check for build command in package.json
  try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    if (packageJson.scripts && packageJson.scripts.build) {
      log('✓ Build script found in package.json', 'success');
    } else {
      log('✗ No build script found in package.json', 'error');
      allRequiredFilesExist = false;
    }
  } catch (error) {
    log('✗ Could not parse package.json', 'error');
    allRequiredFilesExist = false;
  }
  
  // Run a test build if all required files exist
  if (allRequiredFilesExist) {
    log('\nAll required files found. Running test build...', 'title');
    
    try {
      // Create a .env.local file if it doesn't exist (Vercel will provide these values)
      if (!fs.existsSync('.env.local')) {
        log('Creating temporary .env.local for test build...', 'info');
        
        const envExample = `
# This is a temporary file for the test build
# Vercel will provide these values in production
NEXT_PUBLIC_SUPABASE_URL=https://example.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_example
STRIPE_SECRET_KEY=sk_test_example
STRIPE_WEBHOOK_SECRET=whsec_example
NEXT_PUBLIC_APP_URL=http://localhost:3000
        `.trim();
        
        fs.writeFileSync('.env.local', envExample);
      }
      
      // Run a test build
      log('Building project (this may take a few minutes)...', 'info');
      execSync('npm run build', { stdio: 'inherit' });
      
      log('\n✓ Test build successful!', 'success');
      log('\nProject is ready for deployment to Vercel.', 'title');
      log('Follow these steps:', 'info');
      log('1. Push this code to your GitHub repository', 'info');
      log('2. Connect the repository to Vercel', 'info');
      log('3. Configure environment variables in Vercel', 'info');
      log('4. Deploy!', 'info');
      
    } catch (error) {
      log('\n✗ Test build failed', 'error');
      log('Please fix the build errors before deploying to Vercel.', 'error');
      process.exit(1);
    }
  } else {
    log('\n✗ Some required files are missing. Please fix these issues before deploying.', 'error');
    process.exit(1);
  }
}

main().catch(error => {
  log(`\n✗ Error: ${error.message}`, 'error');
  process.exit(1);
}); 