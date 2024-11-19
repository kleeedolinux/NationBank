import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function seed() {
  try {
    // Create admin user
    const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD!, 10);
    
    await prisma.user.upsert({
      where: { email: process.env.ADMIN_EMAIL! },
      update: {},
      create: {
        email: process.env.ADMIN_EMAIL!,
        password: hashedPassword,
        name: 'Admin',
        isAdmin: true,
        isApproved: true
      }
    });

    // Create initial system config
    await prisma.systemConfig.upsert({
      where: { id: '1' },
      update: {},
      create: {
        currencySymbol: '$',
        cdiRate: 5.0,
        incomeTaxRate: 15.0
      }
    });

    console.log('✅ Database seeded successfully');
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

seed(); 