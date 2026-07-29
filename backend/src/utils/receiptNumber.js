async function generateReceiptNumber(pharmacyId, prisma) {
  const pharmacy = await prisma.pharmacy.findUnique({
    where: { id: pharmacyId },
    select: { pharmacyCode: true },
  });

  const code = pharmacy?.pharmacyCode || 'NA';

  const now = new Date();
  const dd = String(now.getDate()).padStart(2, '0');
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const yyyy = now.getFullYear();
  const datePart = `${dd}/${mm}/${yyyy}`;

  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);

  const todayCount = await prisma.receipt.count({
    where: {
      pharmacyId,
      createdAt: { gte: todayStart, lt: todayEnd },
    },
  });

  const seq = String(todayCount + 1).padStart(3, '0');
  return `${code}/${datePart}/${seq}`;
}

module.exports = { generateReceiptNumber };
