/**
 * Minimal seed for Stage 1.
 * Покрывает:
 *  - admin + один manager (для тестов auth в Stage 2);
 *  - минимальные справочники: пара категорий, типов, единиц, подрядчиков.
 *
 * Stage 2/3 расширят сид реальными клиентами/лидами/заявками.
 */
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const adminPassword = await bcrypt.hash('admin123', 10);
  const managerPassword = await bcrypt.hash('manager123', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@katet.local' },
    update: {},
    create: {
      email: 'admin@katet.local',
      passwordHash: adminPassword,
      fullName: 'System Admin',
      role: 'admin',
    },
  });

  const manager = await prisma.user.upsert({
    where: { email: 'manager@katet.local' },
    update: {},
    create: {
      email: 'manager@katet.local',
      passwordHash: managerPassword,
      fullName: 'Иван Менеджер',
      role: 'manager',
    },
  });

  const categoryEarth = await prisma.equipmentCategory.upsert({
    where: { name: 'Землеройная' },
    update: {},
    create: { name: 'Землеройная' },
  });
  const categoryLift = await prisma.equipmentCategory.upsert({
    where: { name: 'Подъёмная' },
    update: {},
    create: { name: 'Подъёмная' },
  });

  const typeExcavator = await prisma.equipmentType.upsert({
    where: { name: 'Экскаватор' },
    update: { categoryId: categoryEarth.id },
    create: { name: 'Экскаватор', categoryId: categoryEarth.id },
  });
  const typeCrane = await prisma.equipmentType.upsert({
    where: { name: 'Кран' },
    update: { categoryId: categoryLift.id },
    create: { name: 'Кран', categoryId: categoryLift.id },
  });

  await prisma.equipmentUnit.createMany({
    data: [
      { name: 'ЭО-01', equipmentTypeId: typeExcavator.id, year: 2019 },
      { name: 'ЭО-02', equipmentTypeId: typeExcavator.id, year: 2021 },
      { name: 'КР-01', equipmentTypeId: typeCrane.id, year: 2018 },
    ],
    skipDuplicates: true,
  });

  await prisma.subcontractor.upsert({
    where: { name: 'СпецТехПартнёр' },
    update: {},
    create: {
      name: 'СпецТехПартнёр',
      specialization: 'Землеройная техника',
      region: 'Москва и МО',
      contactPhone: '+7 (495) 000-00-01',
    },
  });

  const systemTags: Array<{ label: string; tone: 'success' | 'caution' | 'warning' | 'source' | 'muted' | 'progress' }> = [
    { label: 'Новый', tone: 'source' },
    { label: 'Повторный', tone: 'success' },
    { label: 'VIP', tone: 'warning' },
    { label: 'Должник', tone: 'caution' },
  ];
  for (const t of systemTags) {
    await prisma.tag.upsert({
      where: { label: t.label },
      update: { tone: t.tone, isSystem: true },
      create: { label: t.label, tone: t.tone, isSystem: true },
    });
  }

  console.log('Seed done:', {
    admin: admin.email,
    manager: manager.email,
    categories: [categoryEarth.name, categoryLift.name],
    types: [typeExcavator.name, typeCrane.name],
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
