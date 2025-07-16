#!/usr/bin/env node

/**
 * Supabase Connection Verification Script
 * 
 * This script verifies your Supabase setup and database connection.
 * Run with: node scripts/verify-supabase.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function checkFile(filePath, description) {
  if (fs.existsSync(filePath)) {
    console.log(`✅ ${description} exists`);
    return true;
  } else {
    console.log(`❌ ${description} missing`);
    return false;
  }
}

function checkEnvVar(envPath, varName) {
  try {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const hasVar = envContent.includes(`${varName}=`);
    const isEmpty = envContent.includes(`${varName}=""`);
    
    if (hasVar && !isEmpty) {
      console.log(`✅ ${varName} is configured`);
      return true;
    } else if (hasVar && isEmpty) {
      console.log(`⚠️  ${varName} is empty`);
      return false;
    } else {
      console.log(`❌ ${varName} is missing`);
      return false;
    }
  } catch (error) {
    console.log(`❌ Cannot read environment file: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('🔍 Verifying Supabase Setup...\n');

  // Check if environment files exist
  console.log('📁 Checking environment files:');
  const backendEnvExists = checkFile('packages/backend/.env', 'Backend .env');
  const frontendEnvExists = checkFile('packages/frontend/.env', 'Frontend .env');
  
  if (!backendEnvExists || !frontendEnvExists) {
    console.log('\n❌ Missing environment files. Run: node scripts/setup-supabase.js');
    return;
  }

  // Check backend environment variables
  console.log('\n🔧 Checking backend environment variables:');
  const backendEnvPath = 'packages/backend/.env';
  checkEnvVar(backendEnvPath, 'DATABASE_URL');
  checkEnvVar(backendEnvPath, 'SUPABASE_URL');
  checkEnvVar(backendEnvPath, 'SUPABASE_ANON_KEY');
  checkEnvVar(backendEnvPath, 'JWT_SECRET');
  checkEnvVar(backendEnvPath, 'REFRESH_TOKEN_SECRET');
  checkEnvVar(backendEnvPath, 'CORS_ORIGIN');

  // Check frontend environment variables
  console.log('\n🎨 Checking frontend environment variables:');
  const frontendEnvPath = 'packages/frontend/.env';
  checkEnvVar(frontendEnvPath, 'VITE_API_URL');
  checkEnvVar(frontendEnvPath, 'VITE_SUPABASE_URL');
  checkEnvVar(frontendEnvPath, 'VITE_SUPABASE_ANON_KEY');

  // Check if Prisma is set up
  console.log('\n🗄️  Checking Prisma setup:');
  checkFile('packages/backend/prisma/schema.prisma', 'Prisma schema');
  
  try {
    console.log('\n⚙️  Testing Prisma database connection...');
    process.chdir('packages/backend');
    
    // Check if node_modules exists
    if (!fs.existsSync('node_modules')) {
      console.log('📦 Installing backend dependencies...');
      execSync('npm install', { stdio: 'inherit' });
    }

    // Test database connection
    execSync('npx prisma db push --accept-data-loss', { stdio: 'inherit' });
    console.log('✅ Database connection successful!');
    
    // Generate Prisma client
    execSync('npx prisma generate', { stdio: 'inherit' });
    console.log('✅ Prisma client generated!');

  } catch (error) {
    console.log('❌ Database connection failed:', error.message);
    console.log('\nTroubleshooting:');
    console.log('1. Verify your DATABASE_URL is correct');
    console.log('2. Check if your Supabase project is active');
    console.log('3. Ensure your IP is allowed in Supabase Network Restrictions');
    console.log('4. Try running: cd packages/backend && npx prisma studio');
  }

  // Check package.json scripts
  console.log('\n📋 Available commands:');
  console.log('Backend:');
  console.log('  cd packages/backend && npm run dev           # Start backend server');
  console.log('  cd packages/backend && npm run db:studio     # Open Prisma Studio');
  console.log('  cd packages/backend && npm run db:migrate    # Run migrations');
  
  console.log('\nFrontend:');
  console.log('  cd packages/frontend && npm run dev          # Start frontend dev server');
  console.log('  cd packages/frontend && npm run build        # Build for production');

  console.log('\n🎉 Setup verification complete!');
  console.log('Visit http://localhost:5000/api/health after starting the backend to test the API.');
}

main().catch(console.error); 