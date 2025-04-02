#!/usr/bin/env node

/**
 * Deployment helper script for MyBabyBridge
 * Performs pre-deployment checks and assists with Vercel deployment
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Parse command line arguments
const args = process.argv.slice(2);
const checkOnly = args.includes('--check-only');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

// Logger function
function log(message, type = 'info') {
  const colorMap = {
    success: colors.green,
    error: colors.red,
    warning: colors.yellow,
    info: colors.blue,
    title: colors.bright,
    highlight: colors.cyan
  };

  console.log(`${colorMap[type] || ''}${message}${colors.reset}`);
}

// Ask a yes/no question
function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(`${colors.yellow}${question} (y/n) ${colors.reset}`, (answer) => {
      resolve(answer.toLowerCase().startsWith('y'));
    });
  });
}

// Run verification checks
async function verifyProject() {
  log('\n=== Running Pre-Deployment Checks ===\n', 'title');
  
  try {
    log('Checking package.json...', 'info');
    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    
    if (!pkg.scripts?.build) {
      log('❌ No build script found in package.json', 'error');
      return false;
    }
    
    log('✅ package.json verified', 'success');
    
    // Check for essential files
    const essentialFiles = [
      'next.config.js',
      'vercel.json',
    ];
    
    for (const file of essentialFiles) {
      if (!fs.existsSync(file)) {
        log(`❌ Missing essential file: ${file}`, 'error');
        return false;
      }
    }
    
    log('✅ Essential configuration files verified', 'success');
    
    // Check env example
    if (!fs.existsSync('.env.example')) {
      log('⚠️ No .env.example file found. This is recommended for reference.', 'warning');
    } else {
      log('✅ .env.example verified', 'success');
    }
    
    return true;
  } catch (error) {
    log(`❌ Verification failed: ${error.message}`, 'error');
    return false;
  }
}

// Handle deployment to Vercel
async function deployToVercel() {
  log('\n=== Deploying to Vercel ===\n', 'title');
  
  try {
    // Check if Vercel CLI is installed
    try {
      execSync('vercel --version', { stdio: 'ignore' });
      log('✅ Vercel CLI is installed', 'success');
    } catch (error) {
      log('❌ Vercel CLI is not installed', 'error');
      log('Installing Vercel CLI...', 'info');
      execSync('npm install -g vercel', { stdio: 'inherit' });
    }
    
    // Run preparation script
    log('Running preparation script...', 'info');
    execSync('node prepare-for-vercel.js', { stdio: 'inherit' });
    
    if (checkOnly) {
      log('\n✅ Verification completed. Use `npm run deploy` without --check-only to deploy.', 'success');
      return true;
    }
    
    // Ask if user wants to deploy now
    const deployNow = await askQuestion('Would you like to deploy to Vercel now?');
    
    if (deployNow) {
      log('\nInitiating deployment to Vercel...', 'highlight');
      log('You may need to authenticate with Vercel if not already logged in.', 'info');
      log('Follow the prompts to complete deployment.\n', 'info');
      
      // Execute Vercel deploy
      execSync('vercel', { stdio: 'inherit' });
      
      log('\n✅ Deployment initiated!', 'success');
      log('Once complete, verify your deployment in the Vercel dashboard.', 'info');
    } else {
      log('\nDeployment skipped. To deploy manually, run:', 'info');
      log('vercel', 'highlight');
    }
    
    return true;
  } catch (error) {
    log(`❌ Deployment failed: ${error.message}`, 'error');
    return false;
  } finally {
    rl.close();
  }
}

// Main function
async function main() {
  log('\n🌟 MyBabyBridge Deployment Helper 🌟\n', 'title');
  
  const verified = await verifyProject();
  
  if (verified) {
    await deployToVercel();
  } else {
    log('\n❌ Fix the issues above before deploying', 'error');
    rl.close();
    process.exit(1);
  }
}

main().catch(error => {
  log(`\n❌ Error: ${error.message}`, 'error');
  rl.close();
  process.exit(1);
}); 