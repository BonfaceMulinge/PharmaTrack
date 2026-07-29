const STOP_WORDS = new Set(['and', 'the', 'of', 'for', '&', 'at', 'in', 'on', 'by', 'to', 'a', 'an', 'is', 'or']);

function generatePharmacyCode(name) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return 'NA';
  const significant = words.filter((w) => !STOP_WORDS.has(w.toLowerCase()));
  if (significant.length === 0) return words[0].slice(0, 3).toUpperCase();
  if (significant.length === 1) return significant[0].slice(0, 3).toUpperCase();
  const code = significant.map((w) => w[0].toUpperCase()).join('').slice(0, 6);
  return code;
}

async function ensureUniqueCode(baseCode, prisma, excludeId) {
  const where = { pharmacyCode: { not: null }, deletedAt: null };
  if (excludeId) where.id = { not: excludeId };

  const existing = await prisma.pharmacy.findFirst({ where: { pharmacyCode: baseCode, deletedAt: null } });
  if (!existing) return baseCode;

  let counter = 1;
  while (true) {
    const candidate = `${baseCode}${counter}`;
    if (candidate.length > 6) {
      const trimmed = baseCode.slice(0, 6 - String(counter).length);
      const shortCandidate = `${trimmed}${counter}`;
      const found = await prisma.pharmacy.findFirst({ where: { pharmacyCode: shortCandidate, deletedAt: null } });
      if (!found) return shortCandidate;
    } else {
      const found = await prisma.pharmacy.findFirst({ where: { pharmacyCode: candidate, deletedAt: null } });
      if (!found) return candidate;
    }
    counter++;
  }
}

module.exports = { generatePharmacyCode, ensureUniqueCode };
