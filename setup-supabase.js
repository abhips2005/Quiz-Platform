#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function setupSupabase() {
  console.log('🚀 Supabase Setup for Quiz Platform');
  console.log('=====================================\n');

  console.log('First, make sure you have:');
  console.log('1. Created a Supabase project at https://supabase.com');
  console.log('2. Noted your database password');
  console.log('3. Found your project reference (in the URL)\n');

  try {
    // Get Supabase details
    const projectRef = await question('Enter your Supabase project reference (e.g., abcdefghijklmnop): ');
    const dbPassword = await question('Enter your database password: ');
    
    // Generate secure secrets
    const jwtSecret = generateRandomString(64);
    const jwtRefreshSecret = generateRandomString(64);
    const sessionSecret = generateRandomString(32);

    // Optional: Get API keys
    console.log('\nOptional: Enter your Supabase API keys (press Enter to skip):');
    const supabaseUrl = `https://${projectRef}.supabase.co`;
    const anonKey = await question('Anon public key (optional): ');
    const serviceRoleKey = await question('Service role key (optional): ');

    // Create .env content
    const envContent = `# Database Configuration
DATABASE_URL="postgresql://postgres:${dbPassword}@db.${projectRef}.supabase.co:5432/postgres"

# JWT Configuration
JWT_SECRET="${jwtSecret}"
JWT_REFRESH_SECRET="${jwtRefreshSecret}"

# Server Configuration
PORT=5000
NODE_ENV=development

# CORS Settings
CORS_ORIGIN=http://localhost:5173

# File Upload Settings
MAX_FILE_SIZE=10485760
UPLOAD_DIR=uploads

# Session Configuration
SESSION_SECRET="${sessionSecret}"

# Security Settings
BCRYPT_ROUNDS=12

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL="${supabaseUrl}"
NEXT_PUBLIC_SUPABASE_ANON_KEY="${anonKey}"
SUPABASE_SERVICE_ROLE_KEY="${serviceRoleKey}"
`;

    // Write .env file
    const envPath = path.join(__dirname, 'packages', 'backend', '.env');
    fs.writeFileSync(envPath, envContent);

    console.log('\n✅ .env file created successfully!');
    console.log(`📁 Location: ${envPath}\n`);

    console.log('🔄 Next steps:');
    console.log('1. cd packages/backend');
    console.log('2. npm run db:generate');
    console.log('3. npm run db:push');
    console.log('4. npm run dev');
    console.log('\n🎉 Your quiz platform should now connect to Supabase!');

  } catch (error) {
    console.error('❌ Error during setup:', error.message);
  } finally {
    rl.close();
  }
}

function generateRandomString(length) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Run the setup
setupSupabase().catch(console.error); 