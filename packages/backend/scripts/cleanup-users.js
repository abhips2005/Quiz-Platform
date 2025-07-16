#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

async function cleanupIncompleteUsers() {
  console.log('🧹 Cleaning up incomplete user registrations...\n');

  try {
    // Delete users with specific email/username that were created during failed registration
    const emailsToClean = ['abhips1108@gmail.com'];
    const usernamesToClean = ['abhips1108'];

    for (const email of emailsToClean) {
      const deletedByEmail = await prisma.user.deleteMany({
        where: { email }
      });
      if (deletedByEmail.count > 0) {
        console.log(`✅ Removed ${deletedByEmail.count} user(s) with email: ${email}`);
      }
    }

    for (const username of usernamesToClean) {
      const deletedByUsername = await prisma.user.deleteMany({
        where: { username }
      });
      if (deletedByUsername.count > 0) {
        console.log(`✅ Removed ${deletedByUsername.count} user(s) with username: ${username}`);
      }
    }

    console.log('\n🎉 Database cleanup completed!');
    console.log('You can now register with the cleaned emails/usernames.');

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanupIncompleteUsers(); 