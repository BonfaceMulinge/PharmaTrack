/**
 * Cleanup script — removes all demo/test data from the database.
 * Preserves: Super Admin account.
 *
 * Usage: node prisma/cleanup.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('[Cleanup] Starting database cleanup...');

  const superAdmin = await prisma.user.findFirst({
    where: { isSuperAdmin: true, deletedAt: null },
  });

  if (superAdmin) {
    console.log(`[Cleanup] Preserving Super Admin: ${superAdmin.email} (id: ${superAdmin.id})`);
  }

  const deletedNotifications = await prisma.notification.deleteMany({});
  console.log(`[Cleanup] Deleted ${deletedNotifications.count} notifications`);

  const deletedAuditLogs = await prisma.auditLog.deleteMany({});
  console.log(`[Cleanup] Deleted ${deletedAuditLogs.count} audit logs`);

  const deletedSaleItems = await prisma.saleItem.deleteMany({});
  console.log(`[Cleanup] Deleted ${deletedSaleItems.count} sale items`);

  const deletedPayments = await prisma.payment.deleteMany({});
  console.log(`[Cleanup] Deleted ${deletedPayments.count} payments`);

  const deletedSales = await prisma.sale.deleteMany({});
  console.log(`[Cleanup] Deleted ${deletedSales.count} sales`);

  const deletedMovements = await prisma.stockMovement.deleteMany({});
  console.log(`[Cleanup] Deleted ${deletedMovements.count} stock movements`);

  const deletedMedicines = await prisma.medicine.deleteMany({});
  console.log(`[Cleanup] Deleted ${deletedMedicines.count} medicines`);

  const deletedNonAdminUsers = await prisma.user.deleteMany({
    where: { isSuperAdmin: false, deletedAt: null },
  });
  console.log(`[Cleanup] Deleted ${deletedNonAdminUsers.count} non-admin user(s)`);

  const deletedPharmacies = await prisma.pharmacy.deleteMany({
    where: { deletedAt: null },
  });
  console.log(`[Cleanup] Deleted ${deletedPharmacies.count} pharmacy record(s)`);

  console.log('[Cleanup] Database cleanup complete. Only the Super Admin account remains.');
}

main()
  .then(() => prisma.$disconnect())
  .catch((err) => {
    console.error('[Cleanup] Error:', err);
    prisma.$disconnect();
    process.exit(1);
  });
