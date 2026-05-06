import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function normalizeText(value: string | null | undefined): string | null {
  const next = value?.trim();
  return next ? next : null;
}

async function main() {
  const candidates = await prisma.client.findMany({
    where: {
      contacts: { none: {} },
    },
    select: {
      id: true,
      name: true,
      company: true,
      phone: true,
      email: true,
      leads: {
        orderBy: [{ createdAt: 'desc' }],
        take: 1,
        select: {
          contactName: true,
          contactPhone: true,
        },
      },
    },
  });

  let created = 0;
  let skipped = 0;

  for (const client of candidates) {
    const latestLead = client.leads[0] ?? null;
    const contactName =
      normalizeText(latestLead?.contactName)
      ?? normalizeText(client.name)
      ?? normalizeText(client.company)
      ?? 'Контакт';
    const contactPhone =
      normalizeText(latestLead?.contactPhone)
      ?? normalizeText(client.phone);
    const contactEmail = normalizeText(client.email);

    if (!contactName && !contactPhone && !contactEmail) {
      skipped += 1;
      continue;
    }

    await prisma.clientContact.create({
      data: {
        clientId: client.id,
        name: contactName,
        role: client.company ? 'Контактное лицо' : 'Основной контакт',
        phone: contactPhone,
        email: contactEmail,
        isPrimary: true,
      },
    });
    created += 1;
  }

  console.log(
    `[backfill-client-contacts] clientsWithoutContacts=${candidates.length} created=${created} skipped=${skipped}`,
  );
}

main()
  .catch((error) => {
    console.error('[backfill-client-contacts] failed', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
