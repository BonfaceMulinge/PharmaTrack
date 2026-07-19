const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const email = 'admin@pharmatrack.com';
  const password = 'SuperAdmin123!';

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log('Super Admin already exists, skipping seed.');
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.user.create({
    data: {
      email,
      username: 'superadmin',
      passwordHash,
      fullName: 'Super Admin',
      role: 'ADMIN',
      isSuperAdmin: true,
      isActive: true,
    },
  });

  console.log('Super Admin created successfully.');
  console.log('  Email:', email);
  console.log('  Password:', password);
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
