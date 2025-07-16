#!/usr/bin/env node

/**
 * Supabase Setup Helper Script
 * 
 * This script helps you set up environment files and verify your Supabase connection.
 * Run with: node scripts/setup-supabase.js
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

function readExistingEnv(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const env = {};
    content.split('\n').forEach(line => {
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length > 0) {
        env[key.trim()] = valueParts.join('=').trim().replace(/['"]/g, '');
      }
    });
    return env;
  } catch (error) {
    return {};
  }
}

async function main() {
  console.log('🚀 Supabase Setup Helper for Quizzz Platform\n');
  
  // Check if backend .env already exists
  const backendEnvPath = path.join('packages', 'backend', '.env');
  const existingEnv = readExistingEnv(backendEnvPath);
  
  if (Object.keys(existingEnv).length > 0) {
    console.log('✅ Found existing .env file. I\'ll preserve your current settings.\n');
    console.log('Current variables found:');
    Object.keys(existingEnv).forEach(key => {
      const value = existingEnv[key];
      console.log(`  ${key}: ${value ? '✅ set' : '❌ empty'}`);
    });
    console.log('');
  }
  
  console.log('Please have the following information ready from your Supabase dashboard:');
  console.log('- Database URL (Settings → Database → Connection string)');
  console.log('- Project URL (Settings → API → Project URL)');
  console.log('- Anon/Public Key (Settings → API → Project API keys)\n');

  // Get Supabase credentials
  const supabaseUrl = await question('Enter your Supabase Project URL: ');
  const supabaseAnonKey = await question('Enter your Supabase Anon Key: ');
  const databaseUrl = await question('Enter your Database URL: ');
  
  // Use existing JWT secrets or generate new ones
  const jwtSecret = existingEnv.JWT_SECRET || 
    await question('Enter a JWT Secret (or press Enter for generated): ') || 
    generateRandomString(64);
    
  const refreshTokenSecret = existingEnv.REFRESH_TOKEN_SECRET || 
    await question('Enter a Refresh Token Secret (or press Enter for generated): ') || 
    generateRandomString(64);

  // Create backend .env preserving existing values
  const backendEnv = `# Database Configuration
DATABASE_URL="${databaseUrl}"

# Supabase Configuration
SUPABASE_URL="${supabaseUrl}"
SUPABASE_ANON_KEY="${supabaseAnonKey}"

# Server Configuration
PORT=${existingEnv.PORT || '5000'}
NODE_ENV=${existingEnv.NODE_ENV || 'development'}

# JWT Configuration
JWT_SECRET="${jwtSecret}"
REFRESH_TOKEN_SECRET="${refreshTokenSecret}"
JWT_EXPIRES_IN="${existingEnv.JWT_EXPIRES_IN || '15m'}"

# CORS Configuration
CORS_ORIGIN="${existingEnv.CORS_ORIGIN || 'http://localhost:5173'}"

# File Upload Configuration
MAX_FILE_SIZE=${existingEnv.MAX_FILE_SIZE || '10485760'}
UPLOAD_DIRECTORY="uploads"

# Logging
LOG_LEVEL="${existingEnv.LOG_LEVEL || 'info'}"

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
`;

  // Create frontend .env
  const backendPort = existingEnv.PORT || '5000';
  
  const frontendEnv = `# API Configuration
VITE_API_URL="http://localhost:${backendPort}/api"
VITE_API_BASE_URL="http://localhost:${backendPort}"

# Supabase Configuration
VITE_SUPABASE_URL="${supabaseUrl}"
VITE_SUPABASE_ANON_KEY="${supabaseAnonKey}"

# Environment
VITE_NODE_ENV="development"

# WebSocket Configuration
VITE_SOCKET_URL="http://localhost:${backendPort}"
`;

  // Write files
  try {
    fs.writeFileSync(backendEnvPath, backendEnv);
    console.log('✅ Updated packages/backend/.env');
    
    fs.writeFileSync(path.join('packages', 'frontend', '.env'), frontendEnv);
    console.log('✅ Created packages/frontend/.env');
    
    console.log('\n🎉 Environment files updated successfully!');
    
    console.log('\nNext steps:');
    console.log('1. cd packages/backend && npm run db:migrate');
    console.log('2. cd packages/backend && npm run db:generate');
    console.log('3. cd packages/backend && npm run dev');
    console.log('4. In another terminal: cd packages/frontend && npm run dev');
    console.log(`\nCheck http://localhost:${backendPort}/api/health to verify the connection.`);
    
  } catch (error) {
    console.error('❌ Error creating environment files:', error.message);
    console.log('\nPlease create the files manually using the content from SUPABASE_SETUP.md');
  }

  rl.close();
}

function generateRandomString(length) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

main().catch(console.error); 