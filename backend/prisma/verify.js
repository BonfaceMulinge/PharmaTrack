const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function check() {
  const models = ['pharmacy','user','medicine','sale','saleItem','payment','stockMovement','notification','auditLog'];
  const counts = {};
  for (const m of models) {
    counts[m] = await p[m].count();
  }
  console.log('Table row counts:', JSON.stringify(counts, null, 2));
  const sa = await p.user.findFirst({ where: { isSuperAdmin: true } });
  console.log('Super Admin:', sa ? sa.email : 'MISSING');
  await p.$disconnect();
}

check().catch(e => { console.error(e); process.exit(1); });
