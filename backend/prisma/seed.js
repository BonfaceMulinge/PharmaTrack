const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const existing = await prisma.user.findFirst({
    where: { isSuperAdmin: true, deletedAt: null },
  });

  if (existing) {
    console.log('Super Admin already exists, skipping seed.');
    return;
  }

  const email = 'bonnymulonzi1@gmail.com';
  const password = 'Bonny100%';
  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.user.create({
    data: {
      email,
      username: 'superadmin',
      passwordHash,
      fullName: 'Bonface Mulinge',
      role: 'SUPER_ADMIN',
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
