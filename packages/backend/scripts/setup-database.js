#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function runCommand(command, description) {
  console.log(`🔄 ${description}...`);
  try {
    execSync(command, { stdio: 'inherit', cwd: __dirname });
    console.log(`✅ ${description} completed!\n`);
  } catch (error) {
    console.error(`❌ ${description} failed:`, error.message);
    process.exit(1);
  }
}

function checkEnvFile() {
  const envPath = path.join(__dirname, '..', '.env');
  if (!fs.existsSync(envPath)) {
    console.error('❌ .env file not found!');
    console.log('Please create a .env file with your Supabase connection details.');
    console.log('You can copy .env.example and fill in your values.');
    process.exit(1);
  }
  console.log('✅ .env file found!\n');
}

async function setupDatabase() {
  console.log('🗃️  Database Setup for Quiz Platform');
  console.log('====================================\n');

  // Check if .env exists
  checkEnvFile();

  // Generate Prisma client
  runCommand('npx prisma generate', 'Generating Prisma client');

  // Push schema to database
  runCommand('npx prisma db push', 'Pushing schema to Supabase');

  // Optionally seed the database
  console.log('🌱 Would you like to seed the database with sample data? (y/N)');
  const shouldSeed = process.argv.includes('--seed') || process.argv.includes('-s');
  
  if (shouldSeed) {
    if (fs.existsSync(path.join(__dirname, '..', 'src', 'seed.ts'))) {
      runCommand('npm run db:seed', 'Seeding database with sample data');
    } else {
      console.log('⚠️  No seed file found, skipping...\n');
    }
  }

  console.log('🎉 Database setup completed successfully!');
  console.log('You can now start your development server with:');
  console.log('  npm run dev\n');
  
  console.log('📊 Useful commands:');
  console.log('  npm run db:studio  - Open Prisma Studio');
  console.log('  npm run db:migrate - Create a new migration');
  console.log('  npm run db:push    - Push schema changes');
}

// Run the setup
setupDatabase().catch(console.error); 