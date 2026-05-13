import {
  ActivityAction,
  CompletionOutcome,
  DeliveryMode,
  DepartureStatus,
  EquipmentUnitStatus,
  IntegrationChannel,
  IntegrationEventStatus,
  PipelineStage,
  Prisma,
  PrismaClient,
  ReservationInternalStage,
  SourceChannel,
  SourcingType,
  SubcontractorConfirmationStatus,
  SubcontractorStatus,
  TagTone,
  TaskPriority,
  TaskStatus,
  UserRole,
} from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const BASE_TIME = new Date('2026-04-28T09:00:00.000Z');

const at = (days: number, hours = 0): Date =>
  new Date(BASE_TIME.getTime() + days * DAY_MS + hours * HOUR_MS);
const fromHours = (hours: number): Date =>
  new Date(BASE_TIME.getTime() + hours * HOUR_MS);
const normalizePhone = (phone: string): string => phone.replace(/\D/g, '');
const asJson = <T>(value: T): Prisma.InputJsonValue => value as unknown as Prisma.InputJsonValue;

function ensure<T>(value: T | undefined | null, label: string): T {
  if (value === undefined || value === null) {
    throw new Error(`Seed reference not found: ${label}`);
  }
  return value;
}

type SeedUserKey = 'admin' | 'manager' | 'ops' | 'sales' | 'inactiveManager';
type EquipmentTypeKey = 'excavator' | 'crane' | 'bulldozer' | 'dumpTruck' | 'concretePump';

interface SeedUser {
  id: string;
  email: string;
}

interface SeedClient {
  id: string;
  name: string;
  company: string | null;
}

interface DirectorySeed {
  equipmentTypes: Record<EquipmentTypeKey, string>;
  equipmentUnits: Record<string, string>;
  subcontractors: Record<string, string>;
  tags: Record<string, string>;
}

interface ClientContactSeed {
  name: string;
  role?: string;
  phone?: string;
  email?: string;
  isPrimary?: boolean;
}

interface ClientRequisitesSeed {
  inn?: string;
  kpp?: string;
  ogrn?: string;
  legalAddress?: string;
  bankName?: string;
  bankAccount?: string;
  correspondentAccount?: string;
  bik?: string;
}

interface ClientSeedInput {
  key: string;
  name: string;
  company?: string;
  phone: string;
  email?: string;
  notes?: string;
  workingNotes?: string;
  favoriteEquipment?: string[];
  contacts?: ClientContactSeed[];
  requisites?: ClientRequisitesSeed;
  tagLabels?: string[];
}

interface LeadSeedInput {
  key: string;
  stage: PipelineStage;
  source: SourceChannel;
  clientKey?: string;
  contactName: string;
  contactCompany?: string;
  contactPhone: string;
  equipmentTypeHint?: string;
  requestedDateOffsetDays?: number;
  timeWindow?: string;
  address?: string;
  comment?: string;
  manager: SeedUserKey;
  isDuplicate?: boolean;
  isUrgent?: boolean;
  isStale?: boolean;
  hasNoContact?: boolean;
  incompleteData?: boolean;
  unqualifiedReason?: string;
  lastActivityOffsetHours: number;
}

interface ApplicationSeedInput {
  key: string;
  number: string;
  stage: PipelineStage;
  leadKey: string;
  clientKey: string;
  manager: SeedUserKey;
  requestedDateOffsetDays?: number;
  requestedTimeFrom?: string;
  requestedTimeTo?: string;
  address?: string;
  comment?: string;
  isUrgent?: boolean;
  deliveryMode?: DeliveryMode;
  nightWork?: boolean;
  isActive: boolean;
  cancelledAtOffsetHours?: number;
  completedAtOffsetHours?: number;
  lastActivityOffsetHours: number;
}

interface ApplicationItemSeedInput {
  key: string;
  appKey: string;
  equipmentType: EquipmentTypeKey;
  equipmentTypeLabel: string;
  quantity: number;
  shiftCount?: number;
  overtimeHours?: number;
  downtimeHours?: number;
  plannedDateOffsetDays?: number;
  plannedTimeFrom?: string;
  plannedTimeTo?: string;
  address?: string;
  comment?: string;
  sourcingType: SourcingType;
  readyForReservation: boolean;
  pricePerShift?: string;
  deliveryPrice?: string;
  surcharge?: string;
}

interface ReservationSeedInput {
  key: string;
  itemKey: string;
  sourcingType: SourcingType;
  internalStage: ReservationInternalStage;
  equipmentType: EquipmentTypeKey;
  equipmentUnitKey?: string;
  subcontractorKey?: string;
  subcontractorConfirmation: SubcontractorConfirmationStatus;
  promisedModelOrUnit?: string;
  subcontractorNote?: string;
  comment?: string;
  plannedDayOffset: number;
  plannedStartHour: number;
  durationHours: number;
  hasConflictWarning?: boolean;
  isActive: boolean;
  createdBy: SeedUserKey;
  releasedAtOffsetHours?: number;
  releaseReason?: string;
}

interface DepartureSeedInput {
  key: string;
  reservationKey: string;
  status: DepartureStatus;
  scheduledAtOffsetHours: number;
  startedAtOffsetHours?: number;
  arrivedAtOffsetHours?: number;
  completedAtOffsetHours?: number;
  cancelledAtOffsetHours?: number;
  cancellationReason?: string;
  notes?: string;
  deliveryNotes?: string;
}

interface CompletionSeedInput {
  departureKey: string;
  outcome: CompletionOutcome;
  completionNote?: string;
  unqualifiedReason?: string;
  completedBy: SeedUserKey;
  completedAtOffsetHours: number;
}

interface TaskSeedInput {
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignee: SeedUserKey;
  reporter: SeedUserKey;
  createdBy: SeedUserKey;
  startOffsetHours?: number;
  dueOffsetHours?: number;
  estimateMinutes?: number;
  trackedMinutes?: number;
  tags: string[];
  linkedEntityDomain?: string;
  linkedEntityId?: string;
  linkedEntityLabel?: string;
  isArchived?: boolean;
  subtasks?: Array<{ label: string; done: boolean }>;
  comments?: Array<{ author: string; text: string; at: string }>;
}

interface ActivitySeedInput {
  action: ActivityAction;
  entityType: string;
  entityId: string;
  summary: string;
  actor?: SeedUserKey;
  payload?: Record<string, unknown>;
  createdAtOffsetHours: number;
}

interface IntegrationEventSeedInput {
  channel: IntegrationChannel;
  externalId: string;
  idempotencyKey: string;
  correlationId?: string;
  payload: Record<string, unknown>;
  payloadSummary?: Record<string, unknown>;
  status: IntegrationEventStatus;
  retryCount?: number;
  errorCode?: string;
  errorClass?: string;
  errorMessage?: string;
  relatedLeadKey?: string;
  receivedAtOffsetHours: number;
  processedAtOffsetHours?: number;
  replayedAtOffsetHours?: number;
}

async function resetDatabase() {
  await prisma.completion.deleteMany();
  await prisma.departure.deleteMany();
  await prisma.reservation.deleteMany();
  await prisma.applicationItem.deleteMany();
  await prisma.application.deleteMany();
  await prisma.lead.deleteMany();

  await prisma.clientTag.deleteMany();
  await prisma.clientContact.deleteMany();
  await prisma.clientRequisites.deleteMany();
  await prisma.client.deleteMany();

  await prisma.task.deleteMany();
  await prisma.activityLogEntry.deleteMany();
  await prisma.integrationEvent.deleteMany();
  await prisma.systemConfig.deleteMany();

  await prisma.tag.deleteMany();
  await prisma.subcontractor.deleteMany();
  await prisma.equipmentUnit.deleteMany();
  await prisma.equipmentType.deleteMany();
  await prisma.equipmentCategory.deleteMany();

  await prisma.user.deleteMany();
}

async function seedUsers(): Promise<Record<SeedUserKey, SeedUser>> {
  const adminPassword = await bcrypt.hash('admin123', 10);
  const managerPassword = await bcrypt.hash('manager123', 10);

  const userRows: Array<{
    key: SeedUserKey;
    email: string;
    fullName: string;
    role: UserRole;
    isActive: boolean;
    passwordHash: string;
  }> = [
    {
      key: 'admin',
      email: 'admin@katet.local',
      fullName: 'System Admin',
      role: 'admin',
      isActive: true,
      passwordHash: adminPassword,
    },
    {
      key: 'manager',
      email: 'manager@katet.local',
      fullName: 'Иван Менеджер',
      role: 'manager',
      isActive: true,
      passwordHash: managerPassword,
    },
    {
      key: 'ops',
      email: 'ops@katet.local',
      fullName: 'Ольга Операции',
      role: 'manager',
      isActive: true,
      passwordHash: managerPassword,
    },
    {
      key: 'sales',
      email: 'sales@katet.local',
      fullName: 'Сергей Продажи',
      role: 'manager',
      isActive: true,
      passwordHash: managerPassword,
    },
    {
      key: 'inactiveManager',
      email: 'inactive-manager@katet.local',
      fullName: 'Архив Менеджер',
      role: 'manager',
      isActive: false,
      passwordHash: managerPassword,
    },
  ];

  const users = {} as Record<SeedUserKey, SeedUser>;
  for (const row of userRows) {
    const created = await prisma.user.create({
      data: {
        email: row.email,
        passwordHash: row.passwordHash,
        fullName: row.fullName,
        role: row.role,
        isActive: row.isActive,
      },
    });
    users[row.key] = { id: created.id, email: created.email };
  }

  return users;
}

async function seedDirectories(): Promise<DirectorySeed> {
  const earth = await prisma.equipmentCategory.create({ data: { name: 'Землеройная' } });
  const lifting = await prisma.equipmentCategory.create({ data: { name: 'Подъёмная' } });
  const transport = await prisma.equipmentCategory.create({ data: { name: 'Транспортная' } });
  const concrete = await prisma.equipmentCategory.create({ data: { name: 'Бетоноработы' } });

  const excavator = await prisma.equipmentType.create({
    data: { name: 'Экскаватор', categoryId: earth.id },
  });
  const crane = await prisma.equipmentType.create({
    data: { name: 'Кран', categoryId: lifting.id },
  });
  const bulldozer = await prisma.equipmentType.create({
    data: { name: 'Бульдозер', categoryId: earth.id },
  });
  const dumpTruck = await prisma.equipmentType.create({
    data: { name: 'Самосвал', categoryId: transport.id },
  });
  const concretePump = await prisma.equipmentType.create({
    data: { name: 'Бетононасос', categoryId: concrete.id },
  });

  const equipmentTypes: Record<EquipmentTypeKey, string> = {
    excavator: excavator.id,
    crane: crane.id,
    bulldozer: bulldozer.id,
    dumpTruck: dumpTruck.id,
    concretePump: concretePump.id,
  };

  const unitRows: Array<{
    key: string;
    name: string;
    equipmentType: EquipmentTypeKey;
    year: number;
    plateNumber?: string;
    status: EquipmentUnitStatus;
    notes?: string;
  }> = [
    {
      key: 'unit_ex_active_1',
      name: 'ЭКС-01',
      equipmentType: 'excavator',
      year: 2022,
      plateNumber: 'А111АА777',
      status: 'active',
    },
    {
      key: 'unit_ex_inactive_1',
      name: 'ЭКС-02',
      equipmentType: 'excavator',
      year: 2019,
      plateNumber: 'А222АА777',
      status: 'inactive',
      notes: 'На длительном ТО',
    },
    {
      key: 'unit_ex_archived_1',
      name: 'ЭКС-03',
      equipmentType: 'excavator',
      year: 2016,
      plateNumber: 'А333АА777',
      status: 'archived',
    },
    {
      key: 'unit_cr_active_1',
      name: 'КРН-01',
      equipmentType: 'crane',
      year: 2021,
      plateNumber: 'В101ВВ777',
      status: 'active',
    },
    {
      key: 'unit_cr_active_2',
      name: 'КРН-02',
      equipmentType: 'crane',
      year: 2020,
      plateNumber: 'В202ВВ777',
      status: 'active',
    },
    {
      key: 'unit_bd_active_1',
      name: 'БУЛ-01',
      equipmentType: 'bulldozer',
      year: 2023,
      plateNumber: 'С101СС777',
      status: 'active',
    },
    {
      key: 'unit_dt_inactive_1',
      name: 'САМ-01',
      equipmentType: 'dumpTruck',
      year: 2018,
      plateNumber: 'Е101ЕЕ777',
      status: 'inactive',
      notes: 'Замена гидравлики',
    },
    {
      key: 'unit_cp_archived_1',
      name: 'БН-01',
      equipmentType: 'concretePump',
      year: 2015,
      plateNumber: 'К101КК777',
      status: 'archived',
    },
  ];

  const equipmentUnits: Record<string, string> = {};
  for (const row of unitRows) {
    const created = await prisma.equipmentUnit.create({
      data: {
        name: row.name,
        equipmentTypeId: equipmentTypes[row.equipmentType],
        year: row.year,
        plateNumber: row.plateNumber,
        status: row.status,
        notes: row.notes,
      },
    });
    equipmentUnits[row.key] = created.id;
  }

  const subcontractorRows: Array<{
    key: string;
    name: string;
    specialization: string;
    region: string;
    contactPhone: string;
    contactEmail: string;
    rating: number;
    status: SubcontractorStatus;
  }> = [
    {
      key: 'sub_active',
      name: 'СпецТехПартнёр Актив',
      specialization: 'Краны и землеройная техника',
      region: 'Москва и МО',
      contactPhone: '+7 (495) 000-10-01',
      contactEmail: 'active@sub.local',
      rating: 5,
      status: 'active',
    },
    {
      key: 'sub_inactive',
      name: 'Субконтракт Инактив',
      specialization: 'Самосвалы',
      region: 'Тула',
      contactPhone: '+7 (4872) 200-200',
      contactEmail: 'inactive@sub.local',
      rating: 3,
      status: 'inactive',
    },
    {
      key: 'sub_archived',
      name: 'АрхивТех',
      specialization: 'Бетононасосы',
      region: 'Рязань',
      contactPhone: '+7 (4912) 300-300',
      contactEmail: 'archived@sub.local',
      rating: 2,
      status: 'archived',
    },
  ];

  const subcontractors: Record<string, string> = {};
  for (const row of subcontractorRows) {
    const created = await prisma.subcontractor.create({
      data: {
        name: row.name,
        specialization: row.specialization,
        region: row.region,
        contactPhone: row.contactPhone,
        contactEmail: row.contactEmail,
        rating: row.rating,
        status: row.status,
      },
    });
    subcontractors[row.key] = created.id;
  }

  const tagRows: Array<{ label: string; tone: TagTone }> = [
    { label: 'Новый', tone: 'source' },
    { label: 'Повторный', tone: 'success' },
    { label: 'VIP', tone: 'warning' },
    { label: 'Должник', tone: 'caution' },
    { label: 'В работе', tone: 'progress' },
    { label: 'Архив', tone: 'muted' },
  ];

  const tags: Record<string, string> = {};
  for (const row of tagRows) {
    const created = await prisma.tag.create({
      data: {
        label: row.label,
        tone: row.tone,
        isSystem: true,
      },
    });
    tags[row.label] = created.id;
  }

  return {
    equipmentTypes,
    equipmentUnits,
    subcontractors,
    tags,
  };
}

async function seedClients(
  users: Record<SeedUserKey, SeedUser>,
  tags: Record<string, string>,
): Promise<Record<string, SeedClient>> {
  const clientRows: ClientSeedInput[] = [
    {
      key: 'alpha',
      name: 'Ольга Романова',
      company: 'ООО АльфаСтрой',
      phone: '+7 (999) 100-00-01',
      email: 'ops@alpha.local',
      notes: 'Работают по договору с постоплатой 15 дней.',
      workingNotes: 'Любят фиксированные окна времени и фотоотчёты.',
      favoriteEquipment: ['Экскаватор', 'Самосвал'],
      contacts: [
        {
          name: 'Ольга Романова',
          role: 'Операционный менеджер',
          phone: '+7 (999) 100-00-01',
          email: 'ops@alpha.local',
          isPrimary: true,
        },
        {
          name: 'Илья Романов',
          role: 'Прораб',
          phone: '+7 (999) 100-00-09',
        },
      ],
      requisites: {
        inn: '7701000001',
        kpp: '770101001',
        ogrn: '1187746000001',
        legalAddress: 'г. Москва, ул. Складочная, д. 8',
        bankName: 'АО Банк Развития',
        bankAccount: '40702810000000000001',
        correspondentAccount: '30101810000000000001',
        bik: '044525001',
      },
      tagLabels: ['VIP', 'Повторный'],
    },
    {
      key: 'beta',
      name: 'Павел Макаров',
      company: 'ООО БетонИнвест',
      phone: '+7 (999) 100-00-02',
      email: 'pm@beton.local',
      notes: 'Часто берут кран + бетононасос пакетно.',
      workingNotes: 'Просит отдельную строку по доставке.',
      favoriteEquipment: ['Кран', 'Бетононасос'],
      contacts: [
        {
          name: 'Павел Макаров',
          role: 'Руководитель проекта',
          phone: '+7 (999) 100-00-02',
          email: 'pm@beton.local',
          isPrimary: true,
        },
      ],
      requisites: {
        inn: '7702000002',
        kpp: '770201001',
      },
      tagLabels: ['В работе'],
    },
    {
      key: 'gamma',
      name: 'ИП Смирнов Андрей',
      phone: '+7 (999) 100-00-03',
      email: 'smirnov@ip.local',
      notes: 'Физлицо/ИП. Быстрые разовые заказы.',
      favoriteEquipment: ['Экскаватор'],
      contacts: [
        {
          name: 'Смирнов Андрей',
          role: 'Владелец',
          phone: '+7 (999) 100-00-03',
          email: 'smirnov@ip.local',
          isPrimary: true,
        },
      ],
      tagLabels: ['Новый'],
    },
    {
      key: 'delta',
      name: 'Марина Кузнецова',
      company: 'ЗАО ТехМонтаж',
      phone: '+7 (999) 100-00-04',
      email: 'mk@techmont.local',
      notes: 'Стабильные повторные заявки.',
      workingNotes: 'Важна ночная смена, заранее согласовывать доплаты.',
      favoriteEquipment: ['Бульдозер', 'Самосвал'],
      tagLabels: ['Повторный'],
    },
    {
      key: 'epsilon',
      name: 'Алексей Томин',
      company: 'ООО Дорожник',
      phone: '+7 (999) 100-00-05',
      email: 'at@road.local',
      notes: 'Есть споры по последнему закрытию.',
      tagLabels: ['Должник', 'В работе'],
    },
    {
      key: 'zeta',
      name: 'Виктор Громов',
      company: 'ООО ЛогистикТранс',
      phone: '+7 (999) 100-00-06',
      email: 'log@lt.local',
      favoriteEquipment: ['Самосвал'],
      tagLabels: ['В работе'],
    },
    {
      key: 'eta',
      name: 'Егор Климов',
      company: 'ООО СеверПром',
      phone: '+7 (999) 100-00-07',
      email: 'ek@north.local',
      favoriteEquipment: ['Кран'],
      tagLabels: ['Архив', 'Повторный'],
    },
    {
      key: 'theta',
      name: 'Пётр Лунёв',
      company: 'ООО ГородПроект',
      phone: '+7 (999) 100-00-08',
      email: 'pl@city.local',
      tagLabels: ['Новый'],
    },
    {
      key: 'iota',
      name: 'Анна Воронцова',
      company: 'ООО МостСервис',
      phone: '+7 (999) 100-00-10',
      email: 'av@bridge.local',
      tagLabels: ['Архив'],
    },
    {
      key: 'kappa',
      name: 'Станислав Левин',
      company: 'ООО ИнфраТрест',
      phone: '+7 (999) 100-00-11',
      email: 'sl@infra.local',
      workingNotes: 'Долго согласуют закрывающие документы.',
      tagLabels: ['В работе'],
    },
  ];

  const clients: Record<string, SeedClient> = {};

  for (const row of clientRows) {
    const created = await prisma.client.create({
      data: {
        name: row.name,
        company: row.company ?? null,
        phone: row.phone,
        phoneNormalized: normalizePhone(row.phone),
        companyNormalized: row.company ? row.company.toLowerCase() : null,
        email: row.email ?? null,
        notes: row.notes ?? null,
        workingNotes: row.workingNotes ?? null,
        favoriteEquipment: row.favoriteEquipment ?? [],
        contacts: row.contacts && row.contacts.length > 0
          ? {
              create: row.contacts.map((c) => ({
                name: c.name,
                role: c.role,
                phone: c.phone,
                email: c.email,
                isPrimary: c.isPrimary ?? false,
              })),
            }
          : undefined,
        requisites: row.requisites ? { create: row.requisites } : undefined,
      },
    });

    clients[row.key] = {
      id: created.id,
      name: created.name,
      company: created.company,
    };

    for (const tagLabel of row.tagLabels ?? []) {
      const tagId = ensure(tags[tagLabel], `tag:${tagLabel}`);
      await prisma.clientTag.create({
        data: {
          clientId: created.id,
          tagId,
          assignedById: users.manager.id,
        },
      });
    }
  }

  return clients;
}

async function seedLeads(
  users: Record<SeedUserKey, SeedUser>,
  clients: Record<string, SeedClient>,
): Promise<Record<string, string>> {
  const leadRows: LeadSeedInput[] = [
    {
      key: 'lead_site_new',
      stage: 'lead',
      source: 'site',
      clientKey: 'alpha',
      contactName: 'Ольга Романова',
      contactPhone: '+7 (999) 700-10-01',
      equipmentTypeHint: 'Экскаватор',
      requestedDateOffsetDays: 2,
      timeWindow: '09:00-13:00',
      address: 'Москва, Варшавское ш., 11',
      comment: 'Новый входящий лид с сайта.',
      manager: 'manager',
      lastActivityOffsetHours: -2,
    },
    {
      key: 'lead_mango_duplicate',
      stage: 'lead',
      source: 'mango',
      clientKey: 'beta',
      contactName: 'Павел Макаров',
      contactPhone: '+7 (999) 700-10-02',
      equipmentTypeHint: 'Кран',
      requestedDateOffsetDays: 3,
      timeWindow: '10:00-14:00',
      address: 'Москва, ул. Марксистская, 18',
      comment: 'Повторный звонок, потенциальный дубль.',
      manager: 'manager',
      isDuplicate: true,
      lastActivityOffsetHours: -6,
    },
    {
      key: 'lead_telegram_urgent',
      stage: 'lead',
      source: 'telegram',
      clientKey: 'gamma',
      contactName: 'Смирнов Андрей',
      contactPhone: '+7 (999) 700-10-03',
      equipmentTypeHint: 'Самосвал',
      requestedDateOffsetDays: 1,
      timeWindow: '08:00-11:00',
      address: 'Химки, ул. Совхозная, 5',
      comment: 'Срочный лид из Telegram.',
      manager: 'sales',
      isUrgent: true,
      lastActivityOffsetHours: -1,
    },
    {
      key: 'lead_max_application',
      stage: 'application',
      source: 'max',
      clientKey: 'delta',
      contactName: 'Марина Кузнецова',
      contactPhone: '+7 (999) 700-10-04',
      equipmentTypeHint: 'Бульдозер',
      requestedDateOffsetDays: 4,
      timeWindow: '11:00-16:00',
      address: 'Москва, ул. Лётчика Бабушкина, 20',
      comment: 'Лид уже переведен в стадию заявки.',
      manager: 'sales',
      lastActivityOffsetHours: -10,
    },
    {
      key: 'lead_manual_reservation',
      stage: 'reservation',
      source: 'manual',
      clientKey: 'epsilon',
      contactName: 'Алексей Томин',
      contactPhone: '+7 (999) 700-10-05',
      equipmentTypeHint: 'Кран',
      requestedDateOffsetDays: 2,
      timeWindow: '07:00-12:00',
      address: 'Балашиха, ш. Энтузиастов, 2',
      comment: 'Ручной лид, работа в резервации.',
      manager: 'manager',
      lastActivityOffsetHours: -8,
    },
    {
      key: 'lead_other_departure',
      stage: 'departure',
      source: 'other',
      clientKey: 'zeta',
      contactName: 'Виктор Громов',
      contactPhone: '+7 (999) 700-10-06',
      equipmentTypeHint: 'Бульдозер',
      requestedDateOffsetDays: 0,
      timeWindow: '06:00-12:00',
      address: 'Москва, ул. Нижние Поля, 31',
      comment: 'В активной стадии выезда.',
      manager: 'ops',
      lastActivityOffsetHours: -3,
    },
    {
      key: 'lead_completed_case',
      stage: 'completed',
      source: 'site',
      clientKey: 'eta',
      contactName: 'Егор Климов',
      contactPhone: '+7 (999) 700-10-07',
      equipmentTypeHint: 'Кран',
      requestedDateOffsetDays: -6,
      timeWindow: '09:00-18:00',
      address: 'Мытищи, ул. Мира, 9',
      comment: 'Исторический закрытый кейс.',
      manager: 'ops',
      lastActivityOffsetHours: -70,
    },
    {
      key: 'lead_unqualified_case',
      stage: 'unqualified',
      source: 'telegram',
      clientKey: 'theta',
      contactName: 'Пётр Лунёв',
      contactPhone: '+7 (999) 700-10-08',
      equipmentTypeHint: 'Бетононасос',
      requestedDateOffsetDays: -2,
      timeWindow: '12:00-16:00',
      address: 'Москва, ул. Двинцев, 3',
      comment: 'Некачественный запрос, закрыт без конверсии.',
      manager: 'sales',
      unqualifiedReason: 'Недостаточно подтверждённых данных по объекту',
      lastActivityOffsetHours: -30,
    },
    {
      key: 'lead_cancelled_case',
      stage: 'cancelled',
      source: 'other',
      clientKey: 'iota',
      contactName: 'Анна Воронцова',
      contactPhone: '+7 (999) 700-10-09',
      equipmentTypeHint: 'Экскаватор',
      requestedDateOffsetDays: -1,
      timeWindow: '08:00-13:00',
      address: 'Люберцы, Октябрьский пр-т, 56',
      comment: 'Кейс отменён клиентом после согласования.',
      manager: 'manager',
      lastActivityOffsetHours: -20,
    },
    {
      key: 'lead_no_contact',
      stage: 'lead',
      source: 'manual',
      contactName: 'Контакт не подтвержден',
      contactCompany: 'ООО Потенциал',
      contactPhone: '+7 (999) 700-10-10',
      equipmentTypeHint: 'Самосвал',
      requestedDateOffsetDays: 5,
      timeWindow: '10:00-15:00',
      comment: 'Проблема с контактными данными.',
      manager: 'manager',
      hasNoContact: true,
      lastActivityOffsetHours: -18,
    },
    {
      key: 'lead_stale_case',
      stage: 'application',
      source: 'max',
      clientKey: 'kappa',
      contactName: 'Станислав Левин',
      contactPhone: '+7 (999) 700-10-11',
      equipmentTypeHint: 'Кран',
      requestedDateOffsetDays: -3,
      timeWindow: '09:00-15:00',
      address: 'Подольск, ул. Кирова, 20',
      comment: 'Завис в стадии заявки, нужна реактивация.',
      manager: 'sales',
      isStale: true,
      lastActivityOffsetHours: -96,
    },
    {
      key: 'lead_incomplete_case',
      stage: 'lead',
      source: 'other',
      clientKey: 'alpha',
      contactName: 'Ольга Романова',
      contactPhone: '+7 (999) 700-10-12',
      equipmentTypeHint: 'Экскаватор',
      comment: 'Недостаточно данных по адресу и окну времени.',
      manager: 'manager',
      incompleteData: true,
      lastActivityOffsetHours: -15,
    },
    {
      key: 'lead_reservation_matrix',
      stage: 'reservation',
      source: 'site',
      clientKey: 'beta',
      contactName: 'Павел Макаров',
      contactPhone: '+7 (999) 700-10-13',
      equipmentTypeHint: 'Кран',
      requestedDateOffsetDays: 2,
      timeWindow: '08:00-20:00',
      address: 'Москва, 1-й Грайвороновский проезд, 9',
      comment: 'Матрица состояний резервирования.',
      manager: 'ops',
      lastActivityOffsetHours: -4,
    },
    {
      key: 'lead_departure_matrix',
      stage: 'departure',
      source: 'mango',
      clientKey: 'gamma',
      contactName: 'Смирнов Андрей',
      contactPhone: '+7 (999) 700-10-14',
      equipmentTypeHint: 'Экскаватор',
      requestedDateOffsetDays: 1,
      timeWindow: '06:00-14:00',
      address: 'Красногорск, ул. Ленина, 31',
      comment: 'Матрица статусов выездов и завершений.',
      manager: 'ops',
      lastActivityOffsetHours: -2,
    },
    {
      key: 'lead_tasks_case',
      stage: 'application',
      source: 'manual',
      clientKey: 'delta',
      contactName: 'Марина Кузнецова',
      contactPhone: '+7 (999) 700-10-15',
      equipmentTypeHint: 'Бульдозер',
      requestedDateOffsetDays: 3,
      timeWindow: '10:00-18:00',
      address: 'Москва, ул. Ильинка, 4',
      comment: 'Кейс с богатым task-контекстом.',
      manager: 'sales',
      lastActivityOffsetHours: -5,
    },
  ];

  const leads: Record<string, string> = {};

  for (const row of leadRows) {
    const client = row.clientKey ? ensure(clients[row.clientKey], `client:${row.clientKey}`) : null;
    const created = await prisma.lead.create({
      data: {
        stage: row.stage,
        source: row.source,
        sourceLabel: `seed_${row.source}`,
        clientId: client?.id ?? null,
        contactName: row.contactName,
        contactCompany: row.contactCompany ?? client?.company ?? null,
        contactPhone: row.contactPhone,
        phoneNormalized: normalizePhone(row.contactPhone),
        equipmentTypeHint: row.equipmentTypeHint ?? null,
        requestedDate: row.requestedDateOffsetDays !== undefined
          ? at(row.requestedDateOffsetDays, 9)
          : null,
        timeWindow: row.timeWindow ?? null,
        address: row.address ?? null,
        comment: row.comment ?? null,
        managerId: users[row.manager].id,
        isDuplicate: row.isDuplicate ?? false,
        isUrgent: row.isUrgent ?? false,
        isStale: row.isStale ?? false,
        hasNoContact: row.hasNoContact ?? false,
        incompleteData: row.incompleteData ?? false,
        unqualifiedReason: row.unqualifiedReason ?? null,
        lastActivityAt: fromHours(row.lastActivityOffsetHours),
      },
    });
    leads[row.key] = created.id;
  }

  return leads;
}

async function seedApplications(
  users: Record<SeedUserKey, SeedUser>,
  clients: Record<string, SeedClient>,
  leads: Record<string, string>,
): Promise<Record<string, string>> {
  const rows: ApplicationSeedInput[] = [
    {
      key: 'app_application_active',
      number: 'APP-2026-0001',
      stage: 'application',
      leadKey: 'lead_max_application',
      clientKey: 'delta',
      manager: 'sales',
      requestedDateOffsetDays: 3,
      requestedTimeFrom: '09:00',
      requestedTimeTo: '14:00',
      address: 'Москва, ул. Лётчика Бабушкина, 20',
      comment: 'Активная заявка в работе менеджера.',
      isUrgent: false,
      deliveryMode: 'pickup',
      nightWork: false,
      isActive: true,
      lastActivityOffsetHours: -4,
    },
    {
      key: 'app_reservation_active',
      number: 'APP-2026-0002',
      stage: 'reservation',
      leadKey: 'lead_manual_reservation',
      clientKey: 'epsilon',
      manager: 'manager',
      requestedDateOffsetDays: 2,
      requestedTimeFrom: '07:00',
      requestedTimeTo: '12:00',
      address: 'Балашиха, ш. Энтузиастов, 2',
      comment: 'Заявка перешла в резервацию.',
      isUrgent: true,
      deliveryMode: 'delivery',
      nightWork: false,
      isActive: true,
      lastActivityOffsetHours: -6,
    },
    {
      key: 'app_departure_active',
      number: 'APP-2026-0003',
      stage: 'departure',
      leadKey: 'lead_other_departure',
      clientKey: 'zeta',
      manager: 'ops',
      requestedDateOffsetDays: 0,
      requestedTimeFrom: '06:00',
      requestedTimeTo: '12:00',
      address: 'Москва, ул. Нижние Поля, 31',
      comment: 'Заявка находится на выезде.',
      isUrgent: true,
      deliveryMode: 'delivery',
      nightWork: true,
      isActive: true,
      lastActivityOffsetHours: -2,
    },
    {
      key: 'app_completed_history',
      number: 'APP-2026-0004',
      stage: 'completed',
      leadKey: 'lead_completed_case',
      clientKey: 'eta',
      manager: 'ops',
      requestedDateOffsetDays: -8,
      requestedTimeFrom: '09:00',
      requestedTimeTo: '18:00',
      address: 'Мытищи, ул. Мира, 9',
      comment: 'Исторически завершённая заявка.',
      isUrgent: false,
      deliveryMode: 'pickup',
      nightWork: false,
      isActive: false,
      completedAtOffsetHours: -160,
      lastActivityOffsetHours: -158,
    },
    {
      key: 'app_cancelled_history',
      number: 'APP-2026-0005',
      stage: 'cancelled',
      leadKey: 'lead_cancelled_case',
      clientKey: 'iota',
      manager: 'manager',
      requestedDateOffsetDays: -4,
      requestedTimeFrom: '08:00',
      requestedTimeTo: '13:00',
      address: 'Люберцы, Октябрьский пр-т, 56',
      comment: 'Отменена по инициативе клиента.',
      isUrgent: false,
      deliveryMode: 'delivery',
      nightWork: false,
      isActive: false,
      cancelledAtOffsetHours: -96,
      lastActivityOffsetHours: -96,
    },
    {
      key: 'app_stale_active',
      number: 'APP-2026-0006',
      stage: 'application',
      leadKey: 'lead_stale_case',
      clientKey: 'kappa',
      manager: 'sales',
      requestedDateOffsetDays: -2,
      requestedTimeFrom: '10:00',
      requestedTimeTo: '16:00',
      address: 'Подольск, ул. Кирова, 20',
      comment: 'Заявка зависла и отмечена как stale.',
      isUrgent: false,
      deliveryMode: 'delivery',
      nightWork: false,
      isActive: true,
      lastActivityOffsetHours: -120,
    },
    {
      key: 'app_reservation_matrix',
      number: 'APP-2026-0007',
      stage: 'reservation',
      leadKey: 'lead_reservation_matrix',
      clientKey: 'beta',
      manager: 'ops',
      requestedDateOffsetDays: 1,
      requestedTimeFrom: '08:00',
      requestedTimeTo: '20:00',
      address: 'Москва, 1-й Грайвороновский проезд, 9',
      comment: 'Матрица всех внутренних стадий брони.',
      isUrgent: false,
      deliveryMode: 'delivery',
      nightWork: false,
      isActive: true,
      lastActivityOffsetHours: -3,
    },
    {
      key: 'app_departure_matrix',
      number: 'APP-2026-0008',
      stage: 'departure',
      leadKey: 'lead_departure_matrix',
      clientKey: 'gamma',
      manager: 'ops',
      requestedDateOffsetDays: 1,
      requestedTimeFrom: '06:00',
      requestedTimeTo: '14:00',
      address: 'Красногорск, ул. Ленина, 31',
      comment: 'Матрица статусов выезда + завершений.',
      isUrgent: true,
      deliveryMode: 'delivery',
      nightWork: false,
      isActive: true,
      lastActivityOffsetHours: -1,
    },
    {
      key: 'app_tasks_active',
      number: 'APP-2026-0009',
      stage: 'application',
      leadKey: 'lead_tasks_case',
      clientKey: 'delta',
      manager: 'sales',
      requestedDateOffsetDays: 4,
      requestedTimeFrom: '10:00',
      requestedTimeTo: '18:00',
      address: 'Москва, ул. Ильинка, 4',
      comment: 'Заявка для сценариев task board.',
      isUrgent: false,
      deliveryMode: 'pickup',
      nightWork: false,
      isActive: true,
      lastActivityOffsetHours: -2,
    },
  ];

  const applications: Record<string, string> = {};

  for (const row of rows) {
    const created = await prisma.application.create({
      data: {
        number: row.number,
        stage: row.stage,
        leadId: ensure(leads[row.leadKey], `lead:${row.leadKey}`),
        clientId: ensure(clients[row.clientKey], `client:${row.clientKey}`).id,
        responsibleManagerId: users[row.manager].id,
        requestedDate: row.requestedDateOffsetDays !== undefined
          ? at(row.requestedDateOffsetDays, 8)
          : null,
        requestedTimeFrom: row.requestedTimeFrom ?? null,
        requestedTimeTo: row.requestedTimeTo ?? null,
        address: row.address ?? null,
        comment: row.comment ?? null,
        isUrgent: row.isUrgent ?? false,
        deliveryMode: row.deliveryMode ?? null,
        nightWork: row.nightWork ?? false,
        isActive: row.isActive,
        cancelledAt: row.cancelledAtOffsetHours !== undefined
          ? fromHours(row.cancelledAtOffsetHours)
          : null,
        completedAt: row.completedAtOffsetHours !== undefined
          ? fromHours(row.completedAtOffsetHours)
          : null,
        lastActivityAt: fromHours(row.lastActivityOffsetHours),
      },
    });
    applications[row.key] = created.id;
  }

  return applications;
}

async function seedApplicationItems(
  applications: Record<string, string>,
  equipmentTypes: Record<EquipmentTypeKey, string>,
): Promise<Record<string, string>> {
  const rows: ApplicationItemSeedInput[] = [
    {
      key: 'item_app_undecided',
      appKey: 'app_application_active',
      equipmentType: 'excavator',
      equipmentTypeLabel: 'Экскаватор',
      quantity: 1,
      plannedDateOffsetDays: 3,
      plannedTimeFrom: '09:00',
      plannedTimeTo: '13:00',
      address: 'Москва, ул. Лётчика Бабушкина, 20',
      comment: 'Позиция без выбранного источника.',
      sourcingType: 'undecided',
      readyForReservation: false,
    },
    {
      key: 'item_app_ready_own',
      appKey: 'app_application_active',
      equipmentType: 'dumpTruck',
      equipmentTypeLabel: 'Самосвал',
      quantity: 2,
      shiftCount: 2,
      plannedDateOffsetDays: 4,
      plannedTimeFrom: '10:00',
      plannedTimeTo: '16:00',
      address: 'Москва, ул. Лётчика Бабушкина, 20',
      comment: 'Готовая позиция на свою технику.',
      sourcingType: 'own',
      readyForReservation: true,
      pricePerShift: '42000.00',
      deliveryPrice: '8000.00',
      surcharge: '3500.00',
    },
    {
      key: 'item_reservation_main',
      appKey: 'app_reservation_active',
      equipmentType: 'crane',
      equipmentTypeLabel: 'Кран 25т',
      quantity: 1,
      plannedDateOffsetDays: 2,
      plannedTimeFrom: '07:00',
      plannedTimeTo: '12:00',
      address: 'Балашиха, ш. Энтузиастов, 2',
      sourcingType: 'subcontractor',
      readyForReservation: true,
      pricePerShift: '55000.00',
      deliveryPrice: '7000.00',
    },
    {
      key: 'item_departure_main',
      appKey: 'app_departure_active',
      equipmentType: 'bulldozer',
      equipmentTypeLabel: 'Бульдозер',
      quantity: 1,
      plannedDateOffsetDays: 0,
      plannedTimeFrom: '06:00',
      plannedTimeTo: '12:00',
      address: 'Москва, ул. Нижние Поля, 31',
      sourcingType: 'own',
      readyForReservation: true,
      pricePerShift: '60000.00',
    },
    {
      key: 'item_completed_history',
      appKey: 'app_completed_history',
      equipmentType: 'excavator',
      equipmentTypeLabel: 'Экскаватор',
      quantity: 1,
      plannedDateOffsetDays: -8,
      plannedTimeFrom: '09:00',
      plannedTimeTo: '18:00',
      address: 'Мытищи, ул. Мира, 9',
      sourcingType: 'own',
      readyForReservation: true,
      pricePerShift: '47000.00',
    },
    {
      key: 'item_cancelled_history',
      appKey: 'app_cancelled_history',
      equipmentType: 'concretePump',
      equipmentTypeLabel: 'Бетононасос',
      quantity: 1,
      plannedDateOffsetDays: -4,
      plannedTimeFrom: '08:00',
      plannedTimeTo: '13:00',
      address: 'Люберцы, Октябрьский пр-т, 56',
      sourcingType: 'undecided',
      readyForReservation: false,
    },
    {
      key: 'item_stale_main',
      appKey: 'app_stale_active',
      equipmentType: 'crane',
      equipmentTypeLabel: 'Кран 32т',
      quantity: 1,
      plannedDateOffsetDays: -2,
      plannedTimeFrom: '10:00',
      plannedTimeTo: '16:00',
      address: 'Подольск, ул. Кирова, 20',
      sourcingType: 'own',
      readyForReservation: true,
      pricePerShift: '53000.00',
    },
    {
      key: 'item_matrix_needs_source',
      appKey: 'app_reservation_matrix',
      equipmentType: 'excavator',
      equipmentTypeLabel: 'Экскаватор',
      quantity: 1,
      plannedDateOffsetDays: 1,
      plannedTimeFrom: '08:00',
      plannedTimeTo: '12:00',
      address: 'Москва, 1-й Грайвороновский проезд, 9',
      sourcingType: 'undecided',
      readyForReservation: false,
    },
    {
      key: 'item_matrix_search_own',
      appKey: 'app_reservation_matrix',
      equipmentType: 'excavator',
      equipmentTypeLabel: 'Экскаватор',
      quantity: 1,
      plannedDateOffsetDays: 2,
      plannedTimeFrom: '08:00',
      plannedTimeTo: '14:00',
      address: 'Москва, 1-й Грайвороновский проезд, 9',
      sourcingType: 'own',
      readyForReservation: true,
    },
    {
      key: 'item_matrix_search_sub',
      appKey: 'app_reservation_matrix',
      equipmentType: 'crane',
      equipmentTypeLabel: 'Кран 25т',
      quantity: 1,
      plannedDateOffsetDays: 3,
      plannedTimeFrom: '07:00',
      plannedTimeTo: '13:00',
      address: 'Москва, 1-й Грайвороновский проезд, 9',
      sourcingType: 'subcontractor',
      readyForReservation: true,
    },
    {
      key: 'item_matrix_sub_selected',
      appKey: 'app_reservation_matrix',
      equipmentType: 'dumpTruck',
      equipmentTypeLabel: 'Самосвал',
      quantity: 2,
      plannedDateOffsetDays: 4,
      plannedTimeFrom: '09:00',
      plannedTimeTo: '18:00',
      address: 'Москва, 1-й Грайвороновский проезд, 9',
      sourcingType: 'subcontractor',
      readyForReservation: true,
    },
    {
      key: 'item_matrix_type_reserved',
      appKey: 'app_reservation_matrix',
      equipmentType: 'concretePump',
      equipmentTypeLabel: 'Бетононасос',
      quantity: 1,
      plannedDateOffsetDays: 5,
      plannedTimeFrom: '08:00',
      plannedTimeTo: '17:00',
      address: 'Москва, 1-й Грайвороновский проезд, 9',
      sourcingType: 'own',
      readyForReservation: true,
    },
    {
      key: 'item_matrix_unit_defined',
      appKey: 'app_reservation_matrix',
      equipmentType: 'bulldozer',
      equipmentTypeLabel: 'Бульдозер',
      quantity: 1,
      plannedDateOffsetDays: 6,
      plannedTimeFrom: '07:00',
      plannedTimeTo: '15:00',
      address: 'Москва, 1-й Грайвороновский проезд, 9',
      sourcingType: 'own',
      readyForReservation: true,
    },
    {
      key: 'item_matrix_ready_departure',
      appKey: 'app_reservation_matrix',
      equipmentType: 'crane',
      equipmentTypeLabel: 'Кран 32т',
      quantity: 1,
      plannedDateOffsetDays: 7,
      plannedTimeFrom: '06:00',
      plannedTimeTo: '12:00',
      address: 'Москва, 1-й Грайвороновский проезд, 9',
      sourcingType: 'own',
      readyForReservation: true,
    },
    {
      key: 'item_matrix_released',
      appKey: 'app_reservation_matrix',
      equipmentType: 'excavator',
      equipmentTypeLabel: 'Экскаватор',
      quantity: 1,
      plannedDateOffsetDays: -1,
      plannedTimeFrom: '10:00',
      plannedTimeTo: '14:00',
      address: 'Москва, 1-й Грайвороновский проезд, 9',
      sourcingType: 'subcontractor',
      readyForReservation: true,
    },
    {
      key: 'item_dep_scheduled',
      appKey: 'app_departure_matrix',
      equipmentType: 'excavator',
      equipmentTypeLabel: 'Экскаватор',
      quantity: 1,
      plannedDateOffsetDays: 1,
      plannedTimeFrom: '07:00',
      plannedTimeTo: '12:00',
      address: 'Красногорск, ул. Ленина, 31',
      sourcingType: 'own',
      readyForReservation: true,
    },
    {
      key: 'item_dep_transit',
      appKey: 'app_departure_matrix',
      equipmentType: 'crane',
      equipmentTypeLabel: 'Кран 25т',
      quantity: 1,
      plannedDateOffsetDays: 0,
      plannedTimeFrom: '07:00',
      plannedTimeTo: '13:00',
      address: 'Красногорск, ул. Ленина, 31',
      sourcingType: 'subcontractor',
      readyForReservation: true,
    },
    {
      key: 'item_dep_arrived',
      appKey: 'app_departure_matrix',
      equipmentType: 'dumpTruck',
      equipmentTypeLabel: 'Самосвал',
      quantity: 2,
      plannedDateOffsetDays: -1,
      plannedTimeFrom: '06:00',
      plannedTimeTo: '11:00',
      address: 'Красногорск, ул. Ленина, 31',
      sourcingType: 'own',
      readyForReservation: true,
    },
    {
      key: 'item_dep_completed',
      appKey: 'app_departure_matrix',
      equipmentType: 'bulldozer',
      equipmentTypeLabel: 'Бульдозер',
      quantity: 1,
      plannedDateOffsetDays: -2,
      plannedTimeFrom: '08:00',
      plannedTimeTo: '14:00',
      address: 'Красногорск, ул. Ленина, 31',
      sourcingType: 'own',
      readyForReservation: true,
    },
    {
      key: 'item_dep_cancelled',
      appKey: 'app_departure_matrix',
      equipmentType: 'concretePump',
      equipmentTypeLabel: 'Бетононасос',
      quantity: 1,
      plannedDateOffsetDays: -2,
      plannedTimeFrom: '09:00',
      plannedTimeTo: '12:00',
      address: 'Красногорск, ул. Ленина, 31',
      sourcingType: 'subcontractor',
      readyForReservation: true,
    },
    {
      key: 'item_dep_unqualified',
      appKey: 'app_departure_matrix',
      equipmentType: 'excavator',
      equipmentTypeLabel: 'Экскаватор',
      quantity: 1,
      plannedDateOffsetDays: -3,
      plannedTimeFrom: '08:00',
      plannedTimeTo: '13:00',
      address: 'Красногорск, ул. Ленина, 31',
      sourcingType: 'own',
      readyForReservation: true,
    },
    {
      key: 'item_task_main',
      appKey: 'app_tasks_active',
      equipmentType: 'crane',
      equipmentTypeLabel: 'Кран 16т',
      quantity: 1,
      plannedDateOffsetDays: 5,
      plannedTimeFrom: '10:00',
      plannedTimeTo: '18:00',
      address: 'Москва, ул. Ильинка, 4',
      sourcingType: 'own',
      readyForReservation: true,
      pricePerShift: '49000.00',
      deliveryPrice: '6000.00',
    },
  ];

  const items: Record<string, string> = {};

  for (const row of rows) {
    const created = await prisma.applicationItem.create({
      data: {
        applicationId: ensure(applications[row.appKey], `application:${row.appKey}`),
        equipmentTypeId: equipmentTypes[row.equipmentType],
        equipmentTypeLabel: row.equipmentTypeLabel,
        quantity: row.quantity,
        shiftCount: row.shiftCount ?? 1,
        overtimeHours: row.overtimeHours ?? null,
        downtimeHours: row.downtimeHours ?? null,
        plannedDate: row.plannedDateOffsetDays !== undefined
          ? at(row.plannedDateOffsetDays, 0)
          : null,
        plannedTimeFrom: row.plannedTimeFrom ?? null,
        plannedTimeTo: row.plannedTimeTo ?? null,
        address: row.address ?? null,
        comment: row.comment ?? null,
        sourcingType: row.sourcingType,
        readyForReservation: row.readyForReservation,
        pricePerShift: row.pricePerShift ? new Prisma.Decimal(row.pricePerShift) : null,
        deliveryPrice: row.deliveryPrice ? new Prisma.Decimal(row.deliveryPrice) : null,
        surcharge: row.surcharge ? new Prisma.Decimal(row.surcharge) : null,
      },
    });
    items[row.key] = created.id;
  }

  return items;
}

async function seedReservations(
  users: Record<SeedUserKey, SeedUser>,
  equipmentTypes: Record<EquipmentTypeKey, string>,
  equipmentUnits: Record<string, string>,
  subcontractors: Record<string, string>,
  items: Record<string, string>,
): Promise<Record<string, string>> {
  const rows: ReservationSeedInput[] = [
    {
      key: 'res_reservation_main',
      itemKey: 'item_reservation_main',
      sourcingType: 'subcontractor',
      internalStage: 'searching_subcontractor',
      equipmentType: 'crane',
      subcontractorConfirmation: 'requested',
      subcontractorNote: 'Ожидаем КП от подрядчика.',
      comment: 'Основная рабочая бронь по подрядчику.',
      plannedDayOffset: 2,
      plannedStartHour: 7,
      durationHours: 5,
      isActive: true,
      createdBy: 'manager',
    },
    {
      key: 'res_departure_main',
      itemKey: 'item_departure_main',
      sourcingType: 'own',
      internalStage: 'ready_for_departure',
      equipmentType: 'bulldozer',
      equipmentUnitKey: 'unit_bd_active_1',
      subcontractorConfirmation: 'not_requested',
      comment: 'Готово к выезду, назначен unit.',
      plannedDayOffset: 0,
      plannedStartHour: 6,
      durationHours: 6,
      isActive: true,
      createdBy: 'ops',
    },
    {
      key: 'res_completed_history',
      itemKey: 'item_completed_history',
      sourcingType: 'own',
      internalStage: 'released',
      equipmentType: 'excavator',
      equipmentUnitKey: 'unit_ex_active_1',
      subcontractorConfirmation: 'not_requested',
      comment: 'Историческая завершённая бронь.',
      plannedDayOffset: -8,
      plannedStartHour: 9,
      durationHours: 9,
      isActive: false,
      createdBy: 'ops',
      releasedAtOffsetHours: -150,
      releaseReason: 'Закрыто после выполнения работ',
    },
    {
      key: 'res_stale_main',
      itemKey: 'item_stale_main',
      sourcingType: 'own',
      internalStage: 'unit_defined',
      equipmentType: 'crane',
      equipmentUnitKey: 'unit_cr_active_1',
      subcontractorConfirmation: 'not_requested',
      comment: 'Старая активная бронь без перевода в выезд.',
      plannedDayOffset: -2,
      plannedStartHour: 10,
      durationHours: 6,
      isActive: true,
      createdBy: 'sales',
    },
    {
      key: 'res_needs_source',
      itemKey: 'item_matrix_needs_source',
      sourcingType: 'undecided',
      internalStage: 'needs_source_selection',
      equipmentType: 'excavator',
      subcontractorConfirmation: 'not_requested',
      comment: 'Матрица: источник ещё не выбран.',
      plannedDayOffset: 1,
      plannedStartHour: 8,
      durationHours: 4,
      isActive: true,
      createdBy: 'ops',
    },
    {
      key: 'res_search_own',
      itemKey: 'item_matrix_search_own',
      sourcingType: 'own',
      internalStage: 'searching_own_equipment',
      equipmentType: 'excavator',
      subcontractorConfirmation: 'requested',
      promisedModelOrUnit: 'Экскаватор Komatsu PC210',
      comment: 'Матрица: ищем подходящий unit.',
      plannedDayOffset: 2,
      plannedStartHour: 8,
      durationHours: 6,
      isActive: true,
      createdBy: 'ops',
    },
    {
      key: 'res_search_sub',
      itemKey: 'item_matrix_search_sub',
      sourcingType: 'subcontractor',
      internalStage: 'searching_subcontractor',
      equipmentType: 'crane',
      subcontractorConfirmation: 'no_response',
      subcontractorNote: 'Запрос отправлен 3 подрядчикам.',
      comment: 'Матрица: ждём ответа подрядчика.',
      plannedDayOffset: 3,
      plannedStartHour: 7,
      durationHours: 6,
      isActive: true,
      createdBy: 'manager',
    },
    {
      key: 'res_sub_selected',
      itemKey: 'item_matrix_sub_selected',
      sourcingType: 'subcontractor',
      internalStage: 'subcontractor_selected',
      equipmentType: 'dumpTruck',
      subcontractorKey: 'sub_active',
      subcontractorConfirmation: 'confirmed',
      subcontractorNote: 'Подрядчик подтверждён по ставке 3900/час.',
      comment: 'Матрица: подрядчик выбран.',
      plannedDayOffset: 4,
      plannedStartHour: 9,
      durationHours: 9,
      isActive: true,
      createdBy: 'manager',
    },
    {
      key: 'res_type_reserved_conflict',
      itemKey: 'item_matrix_type_reserved',
      sourcingType: 'own',
      internalStage: 'type_reserved',
      equipmentType: 'concretePump',
      subcontractorConfirmation: 'declined',
      comment: 'Матрица: тип забронирован, но есть конфликт.',
      plannedDayOffset: 5,
      plannedStartHour: 8,
      durationHours: 8,
      hasConflictWarning: true,
      isActive: true,
      createdBy: 'ops',
    },
    {
      key: 'res_unit_defined',
      itemKey: 'item_matrix_unit_defined',
      sourcingType: 'own',
      internalStage: 'unit_defined',
      equipmentType: 'bulldozer',
      equipmentUnitKey: 'unit_bd_active_1',
      subcontractorConfirmation: 'not_requested',
      comment: 'Матрица: unit определён.',
      plannedDayOffset: 6,
      plannedStartHour: 7,
      durationHours: 8,
      isActive: true,
      createdBy: 'ops',
    },
    {
      key: 'res_ready_for_departure',
      itemKey: 'item_matrix_ready_departure',
      sourcingType: 'own',
      internalStage: 'ready_for_departure',
      equipmentType: 'crane',
      equipmentUnitKey: 'unit_cr_active_2',
      subcontractorConfirmation: 'requested',
      comment: 'Матрица: готово к выезду.',
      plannedDayOffset: 7,
      plannedStartHour: 6,
      durationHours: 6,
      isActive: true,
      createdBy: 'ops',
    },
    {
      key: 'res_released',
      itemKey: 'item_matrix_released',
      sourcingType: 'subcontractor',
      internalStage: 'released',
      equipmentType: 'excavator',
      subcontractorKey: 'sub_inactive',
      subcontractorConfirmation: 'declined',
      subcontractorNote: 'Подрядчик отменил подтверждение.',
      comment: 'Матрица: бронь снята.',
      plannedDayOffset: -1,
      plannedStartHour: 10,
      durationHours: 4,
      isActive: false,
      createdBy: 'manager',
      releasedAtOffsetHours: -20,
      releaseReason: 'Источник не подтверждён в срок',
    },
    {
      key: 'res_dep_scheduled',
      itemKey: 'item_dep_scheduled',
      sourcingType: 'own',
      internalStage: 'ready_for_departure',
      equipmentType: 'excavator',
      equipmentUnitKey: 'unit_ex_active_1',
      subcontractorConfirmation: 'not_requested',
      comment: 'Выезд запланирован.',
      plannedDayOffset: 1,
      plannedStartHour: 7,
      durationHours: 5,
      isActive: true,
      createdBy: 'ops',
    },
    {
      key: 'res_dep_transit',
      itemKey: 'item_dep_transit',
      sourcingType: 'subcontractor',
      internalStage: 'ready_for_departure',
      equipmentType: 'crane',
      subcontractorKey: 'sub_active',
      subcontractorConfirmation: 'confirmed',
      comment: 'Выезд в пути.',
      plannedDayOffset: 0,
      plannedStartHour: 7,
      durationHours: 6,
      isActive: true,
      createdBy: 'ops',
    },
    {
      key: 'res_dep_arrived',
      itemKey: 'item_dep_arrived',
      sourcingType: 'own',
      internalStage: 'ready_for_departure',
      equipmentType: 'dumpTruck',
      equipmentUnitKey: 'unit_cr_active_1',
      subcontractorConfirmation: 'not_requested',
      comment: 'Выезд прибыл, ждёт завершения.',
      plannedDayOffset: -1,
      plannedStartHour: 6,
      durationHours: 5,
      isActive: true,
      createdBy: 'ops',
    },
    {
      key: 'res_dep_completed',
      itemKey: 'item_dep_completed',
      sourcingType: 'own',
      internalStage: 'ready_for_departure',
      equipmentType: 'bulldozer',
      equipmentUnitKey: 'unit_bd_active_1',
      subcontractorConfirmation: 'not_requested',
      comment: 'Выезд успешно завершён.',
      plannedDayOffset: -2,
      plannedStartHour: 8,
      durationHours: 6,
      isActive: true,
      createdBy: 'ops',
    },
    {
      key: 'res_dep_cancelled',
      itemKey: 'item_dep_cancelled',
      sourcingType: 'subcontractor',
      internalStage: 'ready_for_departure',
      equipmentType: 'concretePump',
      subcontractorKey: 'sub_archived',
      subcontractorConfirmation: 'declined',
      comment: 'Выезд будет отменён.',
      plannedDayOffset: -2,
      plannedStartHour: 9,
      durationHours: 3,
      isActive: true,
      createdBy: 'manager',
    },
    {
      key: 'res_dep_unqualified',
      itemKey: 'item_dep_unqualified',
      sourcingType: 'own',
      internalStage: 'ready_for_departure',
      equipmentType: 'excavator',
      equipmentUnitKey: 'unit_ex_active_1',
      subcontractorConfirmation: 'not_requested',
      comment: 'Выезд завершится как некачественный.',
      plannedDayOffset: -3,
      plannedStartHour: 8,
      durationHours: 5,
      isActive: true,
      createdBy: 'ops',
    },
    {
      key: 'res_task_main',
      itemKey: 'item_task_main',
      sourcingType: 'own',
      internalStage: 'type_reserved',
      equipmentType: 'crane',
      subcontractorConfirmation: 'requested',
      comment: 'Резервация для сценариев задач.',
      plannedDayOffset: 5,
      plannedStartHour: 10,
      durationHours: 8,
      isActive: true,
      createdBy: 'sales',
    },
  ];

  const reservations: Record<string, string> = {};

  for (const row of rows) {
    const plannedStart = at(row.plannedDayOffset, row.plannedStartHour);
    const plannedEnd = new Date(plannedStart.getTime() + row.durationHours * HOUR_MS);

    const created = await prisma.reservation.create({
      data: {
        applicationItemId: ensure(items[row.itemKey], `item:${row.itemKey}`),
        sourcingType: row.sourcingType,
        internalStage: row.internalStage,
        equipmentTypeId: equipmentTypes[row.equipmentType],
        equipmentUnitId: row.equipmentUnitKey
          ? ensure(equipmentUnits[row.equipmentUnitKey], `equipmentUnit:${row.equipmentUnitKey}`)
          : null,
        subcontractorId: row.subcontractorKey
          ? ensure(subcontractors[row.subcontractorKey], `subcontractor:${row.subcontractorKey}`)
          : null,
        subcontractorConfirmation: row.subcontractorConfirmation,
        promisedModelOrUnit: row.promisedModelOrUnit ?? null,
        subcontractorNote: row.subcontractorNote ?? null,
        comment: row.comment ?? null,
        plannedStart,
        plannedEnd,
        hasConflictWarning: row.hasConflictWarning ?? false,
        isActive: row.isActive,
        createdById: users[row.createdBy].id,
        releasedAt: row.releasedAtOffsetHours !== undefined
          ? fromHours(row.releasedAtOffsetHours)
          : null,
        releaseReason: row.releaseReason ?? null,
      },
    });
    reservations[row.key] = created.id;
  }

  return reservations;
}

async function seedDepartures(reservations: Record<string, string>): Promise<Record<string, string>> {
  const rows: DepartureSeedInput[] = [
    {
      key: 'dep_main_active',
      reservationKey: 'res_departure_main',
      status: 'in_transit',
      scheduledAtOffsetHours: -2,
      startedAtOffsetHours: -1,
      notes: 'Основной активный выезд.',
      deliveryNotes: 'Водитель подтвердил старт.',
    },
    {
      key: 'dep_stale',
      reservationKey: 'res_stale_main',
      status: 'arrived',
      scheduledAtOffsetHours: -120,
      startedAtOffsetHours: -118,
      arrivedAtOffsetHours: -116,
      notes: 'Старый выезд без закрытия.',
      deliveryNotes: 'Ждёт подтверждения заказчика.',
    },
    {
      key: 'dep_scheduled',
      reservationKey: 'res_dep_scheduled',
      status: 'scheduled',
      scheduledAtOffsetHours: 18,
      notes: 'Только запланирован.',
    },
    {
      key: 'dep_in_transit',
      reservationKey: 'res_dep_transit',
      status: 'in_transit',
      scheduledAtOffsetHours: -6,
      startedAtOffsetHours: -5,
      notes: 'В пути к объекту.',
    },
    {
      key: 'dep_arrived',
      reservationKey: 'res_dep_arrived',
      status: 'arrived',
      scheduledAtOffsetHours: -30,
      startedAtOffsetHours: -28,
      arrivedAtOffsetHours: -24,
      notes: 'Прибыл, работы не закрыты.',
    },
    {
      key: 'dep_completed',
      reservationKey: 'res_dep_completed',
      status: 'completed',
      scheduledAtOffsetHours: -48,
      startedAtOffsetHours: -47,
      arrivedAtOffsetHours: -45,
      completedAtOffsetHours: -40,
      notes: 'Успешно завершённый выезд.',
      deliveryNotes: 'Закрыт актом в тот же день.',
    },
    {
      key: 'dep_cancelled',
      reservationKey: 'res_dep_cancelled',
      status: 'cancelled',
      scheduledAtOffsetHours: -26,
      cancelledAtOffsetHours: -25,
      cancellationReason: 'Клиент отменил смену утром',
      notes: 'Отменён до старта.',
    },
    {
      key: 'dep_unqualified',
      reservationKey: 'res_dep_unqualified',
      status: 'completed',
      scheduledAtOffsetHours: -70,
      startedAtOffsetHours: -69,
      arrivedAtOffsetHours: -67,
      completedAtOffsetHours: -60,
      notes: 'Будет помечен как некачественный completion.',
      deliveryNotes: 'Зафиксированы замечания клиента.',
    },
  ];

  const departures: Record<string, string> = {};

  for (const row of rows) {
    const created = await prisma.departure.create({
      data: {
        reservationId: ensure(reservations[row.reservationKey], `reservation:${row.reservationKey}`),
        status: row.status,
        scheduledAt: fromHours(row.scheduledAtOffsetHours),
        startedAt: row.startedAtOffsetHours !== undefined ? fromHours(row.startedAtOffsetHours) : null,
        arrivedAt: row.arrivedAtOffsetHours !== undefined ? fromHours(row.arrivedAtOffsetHours) : null,
        completedAt: row.completedAtOffsetHours !== undefined ? fromHours(row.completedAtOffsetHours) : null,
        cancelledAt: row.cancelledAtOffsetHours !== undefined ? fromHours(row.cancelledAtOffsetHours) : null,
        cancellationReason: row.cancellationReason ?? null,
        notes: row.notes ?? null,
        deliveryNotes: row.deliveryNotes ?? null,
      },
    });
    departures[row.key] = created.id;
  }

  return departures;
}

async function seedCompletions(
  users: Record<SeedUserKey, SeedUser>,
  departures: Record<string, string>,
): Promise<Record<string, string>> {
  const rows: CompletionSeedInput[] = [
    {
      departureKey: 'dep_completed',
      outcome: 'completed',
      completionNote: 'Работы выполнены в полном объёме.',
      completedBy: 'ops',
      completedAtOffsetHours: -39,
    },
    {
      departureKey: 'dep_unqualified',
      outcome: 'unqualified',
      completionNote: 'Клиент принял частично.',
      unqualifiedReason: 'Техника прибыла позже SLA на 2 часа',
      completedBy: 'manager',
      completedAtOffsetHours: -59,
    },
  ];

  const completions: Record<string, string> = {};

  for (const row of rows) {
    const created = await prisma.completion.create({
      data: {
        departureId: ensure(departures[row.departureKey], `departure:${row.departureKey}`),
        outcome: row.outcome,
        completionNote: row.completionNote ?? null,
        unqualifiedReason: row.unqualifiedReason ?? null,
        completedById: users[row.completedBy].id,
        completedAt: fromHours(row.completedAtOffsetHours),
      },
    });
    completions[row.departureKey] = created.id;
  }

  return completions;
}

async function seedTasks(
  users: Record<SeedUserKey, SeedUser>,
  clients: Record<string, SeedClient>,
  leads: Record<string, string>,
  applications: Record<string, string>,
  reservations: Record<string, string>,
  departures: Record<string, string>,
) {
  const rows: TaskSeedInput[] = [
    {
      title: 'Проверить входящий лид с сайта',
      description: 'Нужно уточнить адрес и окно времени у клиента.',
      status: 'open',
      priority: 'urgent',
      assignee: 'manager',
      reporter: 'admin',
      createdBy: 'admin',
      startOffsetHours: -1,
      dueOffsetHours: 6,
      estimateMinutes: 40,
      trackedMinutes: 5,
      tags: ['lead', 'urgent'],
      linkedEntityDomain: 'lead',
      linkedEntityId: leads.lead_site_new,
      linkedEntityLabel: 'Лид: сайт / новый',
      subtasks: [
        { label: 'Проверить контакты', done: true },
        { label: 'Подтвердить адрес', done: false },
      ],
      comments: [
        {
          author: 'System Admin',
          text: 'Создано автоматически из входящего канала.',
          at: fromHours(-1).toISOString(),
        },
      ],
    },
    {
      title: 'Согласовать экономику по заявке APP-2026-0001',
      status: 'in_progress',
      priority: 'high',
      assignee: 'sales',
      reporter: 'manager',
      createdBy: 'manager',
      startOffsetHours: -8,
      dueOffsetHours: 16,
      estimateMinutes: 120,
      trackedMinutes: 45,
      tags: ['application', 'pricing'],
      linkedEntityDomain: 'application',
      linkedEntityId: applications.app_application_active,
      linkedEntityLabel: 'Заявка APP-2026-0001',
      subtasks: [{ label: 'Проверить маржинальность', done: false }],
    },
    {
      title: 'Найти подрядчика для матричной брони',
      status: 'blocked',
      priority: 'normal',
      assignee: 'manager',
      reporter: 'ops',
      createdBy: 'ops',
      startOffsetHours: -20,
      dueOffsetHours: 10,
      estimateMinutes: 90,
      trackedMinutes: 30,
      tags: ['reservation', 'subcontractor'],
      linkedEntityDomain: 'reservation',
      linkedEntityId: reservations.res_search_sub,
      linkedEntityLabel: 'Бронь: поиск подрядчика',
      comments: [
        {
          author: 'Ольга Операции',
          text: 'Ждём ответ по ставке от подрядчика.',
          at: fromHours(-12).toISOString(),
        },
      ],
    },
    {
      title: 'Проверить акт по завершённому выезду',
      status: 'done',
      priority: 'low',
      assignee: 'ops',
      reporter: 'admin',
      createdBy: 'admin',
      startOffsetHours: -60,
      dueOffsetHours: -36,
      estimateMinutes: 30,
      trackedMinutes: 28,
      tags: ['departure', 'documents'],
      linkedEntityDomain: 'departure',
      linkedEntityId: departures.dep_completed,
      linkedEntityLabel: 'Выезд: завершён',
      isArchived: true,
    },
    {
      title: 'Сверить клиента по задолженности',
      status: 'open',
      priority: 'high',
      assignee: 'manager',
      reporter: 'sales',
      createdBy: 'sales',
      startOffsetHours: -3,
      dueOffsetHours: 24,
      estimateMinutes: 50,
      trackedMinutes: 10,
      tags: ['client', 'finance'],
      linkedEntityDomain: 'client',
      linkedEntityId: clients.epsilon.id,
      linkedEntityLabel: 'Клиент: ООО Дорожник',
    },
    {
      title: 'Разобрать некачественное завершение',
      status: 'done',
      priority: 'normal',
      assignee: 'ops',
      reporter: 'manager',
      createdBy: 'manager',
      startOffsetHours: -65,
      dueOffsetHours: -55,
      estimateMinutes: 70,
      trackedMinutes: 72,
      tags: ['completion', 'qa'],
      linkedEntityDomain: 'departure',
      linkedEntityId: departures.dep_unqualified,
      linkedEntityLabel: 'Выезд: некачественный исход',
    },
    {
      title: 'Реанимировать stale кейс',
      status: 'blocked',
      priority: 'urgent',
      assignee: 'sales',
      reporter: 'ops',
      createdBy: 'ops',
      startOffsetHours: -100,
      dueOffsetHours: -70,
      estimateMinutes: 80,
      trackedMinutes: 20,
      tags: ['stale', 'escalation'],
      linkedEntityDomain: 'departure',
      linkedEntityId: departures.dep_stale,
      linkedEntityLabel: 'Выезд: stale',
    },
    {
      title: 'Подготовить КП по новому лиду без контакта',
      status: 'in_progress',
      priority: 'low',
      assignee: 'manager',
      reporter: 'sales',
      createdBy: 'sales',
      startOffsetHours: -5,
      dueOffsetHours: 48,
      estimateMinutes: 100,
      trackedMinutes: 35,
      tags: ['lead', 'proposal'],
      linkedEntityDomain: 'lead',
      linkedEntityId: leads.lead_no_contact,
      linkedEntityLabel: 'Лид: нет контакта',
    },
  ];

  for (const row of rows) {
    await prisma.task.create({
      data: {
        title: row.title,
        description: row.description ?? null,
        status: row.status,
        priority: row.priority,
        assigneeId: users[row.assignee].id,
        reporterId: users[row.reporter].id,
        createdById: users[row.createdBy].id,
        startDate: row.startOffsetHours !== undefined ? fromHours(row.startOffsetHours) : null,
        dueDate: row.dueOffsetHours !== undefined ? fromHours(row.dueOffsetHours) : null,
        estimateMinutes: row.estimateMinutes ?? null,
        trackedMinutes: row.trackedMinutes ?? 0,
        tags: row.tags,
        linkedEntityDomain: row.linkedEntityDomain ?? null,
        linkedEntityId: row.linkedEntityId ?? null,
        linkedEntityLabel: row.linkedEntityLabel ?? null,
        subtasks: row.subtasks ? asJson(row.subtasks) : undefined,
        comments: row.comments ? asJson(row.comments) : undefined,
        isArchived: row.isArchived ?? false,
      },
    });
  }
}

async function seedActivity(
  users: Record<SeedUserKey, SeedUser>,
  leads: Record<string, string>,
  applications: Record<string, string>,
  reservations: Record<string, string>,
  departures: Record<string, string>,
  completions: Record<string, string>,
) {
  const rows: ActivitySeedInput[] = [
    {
      action: 'created',
      entityType: 'lead',
      entityId: leads.lead_site_new,
      summary: 'Создан лид из канала site',
      actor: 'manager',
      createdAtOffsetHours: -24,
      payload: { channel: 'site' },
    },
    {
      action: 'updated',
      entityType: 'application',
      entityId: applications.app_application_active,
      summary: 'Обновлены поля заявки',
      actor: 'sales',
      createdAtOffsetHours: -18,
      payload: { changed: ['address', 'requestedTimeTo'] },
    },
    {
      action: 'stage_changed',
      entityType: 'lead',
      entityId: leads.lead_manual_reservation,
      summary: 'Лид переведён в reservation',
      actor: 'manager',
      createdAtOffsetHours: -16,
    },
    {
      action: 'reservation_set',
      entityType: 'reservation',
      entityId: reservations.res_departure_main,
      summary: 'Назначена бронь и unit',
      actor: 'ops',
      createdAtOffsetHours: -12,
    },
    {
      action: 'reservation_released',
      entityType: 'reservation',
      entityId: reservations.res_released,
      summary: 'Бронь снята по причине неподтверждённого источника',
      actor: 'manager',
      createdAtOffsetHours: -10,
    },
    {
      action: 'completed',
      entityType: 'completion',
      entityId: completions.dep_completed,
      summary: 'Заказ завершён успешно',
      actor: 'ops',
      createdAtOffsetHours: -8,
    },
    {
      action: 'unqualified',
      entityType: 'completion',
      entityId: completions.dep_unqualified,
      summary: 'Заказ закрыт как некачественный',
      actor: 'manager',
      createdAtOffsetHours: -7,
      payload: { reason: 'late_arrival' },
    },
    {
      action: 'imported',
      entityType: 'integration_event',
      entityId: 'seed-import-01',
      summary: 'Импортировано событие из Telegram',
      actor: 'admin',
      createdAtOffsetHours: -6,
      payload: { source: 'telegram', status: 'processed' },
    },
    {
      action: 'note_added',
      entityType: 'departure',
      entityId: departures.dep_stale,
      summary: 'Добавлена служебная заметка по stale-выезду',
      actor: 'ops',
      createdAtOffsetHours: -4,
      payload: { note: 'Требуется эскалация' },
    },
  ];

  for (const row of rows) {
    await prisma.activityLogEntry.create({
      data: {
        action: row.action,
        entityType: row.entityType,
        entityId: row.entityId,
        summary: row.summary,
        payload: row.payload ? asJson(row.payload) : undefined,
        actorId: row.actor ? users[row.actor].id : null,
        createdAt: fromHours(row.createdAtOffsetHours),
      },
    });
  }
}

async function seedIntegrationEvents(
  leads: Record<string, string>,
) {
  const rows: IntegrationEventSeedInput[] = [
    {
      channel: 'site',
      externalId: 'SITE-1001',
      idempotencyKey: 'seed-site-1001',
      correlationId: 'corr-site-1001',
      payload: { type: 'lead_create', leadPhone: '+79997001001' },
      payloadSummary: { source: 'site', kind: 'lead' },
      status: 'received',
      relatedLeadKey: 'lead_site_new',
      receivedAtOffsetHours: -5,
    },
    {
      channel: 'mango',
      externalId: 'MANGO-2001',
      idempotencyKey: 'seed-mango-2001',
      correlationId: 'corr-mango-2001',
      payload: { type: 'call', disposition: 'qualified' },
      payloadSummary: { source: 'mango', result: 'ok' },
      status: 'processed',
      relatedLeadKey: 'lead_mango_duplicate',
      receivedAtOffsetHours: -9,
      processedAtOffsetHours: -8,
    },
    {
      channel: 'telegram',
      externalId: 'TG-3001',
      idempotencyKey: 'seed-tg-3001',
      correlationId: 'corr-tg-3001',
      payload: { type: 'message', text: 'Нужен кран завтра' },
      payloadSummary: { source: 'telegram', hasMedia: false },
      status: 'failed',
      retryCount: 2,
      errorCode: 'validation_error',
      errorClass: 'schema',
      errorMessage: 'Отсутствует телефон в payload',
      relatedLeadKey: 'lead_telegram_urgent',
      receivedAtOffsetHours: -11,
      processedAtOffsetHours: -10,
    },
    {
      channel: 'max',
      externalId: 'MAX-4001',
      idempotencyKey: 'seed-max-4001',
      correlationId: 'corr-max-4001',
      payload: { type: 'api_event', action: 'duplicate_detected' },
      payloadSummary: { source: 'max', duplicate: true },
      status: 'duplicate',
      retryCount: 1,
      relatedLeadKey: 'lead_other_departure',
      receivedAtOffsetHours: -14,
      processedAtOffsetHours: -13,
    },
    {
      channel: 'site',
      externalId: 'SITE-1002',
      idempotencyKey: 'seed-site-1002',
      correlationId: 'corr-site-1002',
      payload: { type: 'lead_update', leadId: 'seed' },
      payloadSummary: { source: 'site', replay: true },
      status: 'replayed',
      retryCount: 0,
      relatedLeadKey: 'lead_stale_case',
      receivedAtOffsetHours: -20,
      processedAtOffsetHours: -19,
      replayedAtOffsetHours: -3,
    },
  ];

  for (const row of rows) {
    await prisma.integrationEvent.create({
      data: {
        channel: row.channel,
        externalId: row.externalId,
        idempotencyKey: row.idempotencyKey,
        correlationId: row.correlationId ?? null,
        payload: asJson(row.payload),
        payloadSummary: row.payloadSummary ? asJson(row.payloadSummary) : undefined,
        status: row.status,
        retryCount: row.retryCount ?? 0,
        errorCode: row.errorCode ?? null,
        errorClass: row.errorClass ?? null,
        errorMessage: row.errorMessage ?? null,
        relatedLeadId: row.relatedLeadKey
          ? ensure(leads[row.relatedLeadKey], `lead:${row.relatedLeadKey}`)
          : null,
        receivedAt: fromHours(row.receivedAtOffsetHours),
        processedAt: row.processedAtOffsetHours !== undefined
          ? fromHours(row.processedAtOffsetHours)
          : null,
        replayedAt: row.replayedAtOffsetHours !== undefined
          ? fromHours(row.replayedAtOffsetHours)
          : null,
      },
    });
  }
}

async function seedSystemConfig() {
  const workspacePayload = {
    sections: [
      {
        id: 'general',
        title: 'Общие',
        description: 'Базовые параметры CRM',
        rows: [
          { label: 'Название пространства', value: 'Katet CRM' },
          { label: 'Часовой пояс', value: 'Europe/Moscow' },
          { label: 'Язык интерфейса', value: 'Русский' },
        ],
      },
      {
        id: 'stages',
        title: 'Этапы воронки',
        description: 'Условия перехода между стадиями',
        rows: [
          { label: 'lead → application', value: 'Требуются: контакт, тип техники' },
          { label: 'application → reservation', value: 'Требуется: позиция заявки без активной брони' },
          { label: 'reservation → departure', value: 'Требуется: назначенная единица' },
          { label: 'departure → completed', value: 'Требуется: акт выполнения' },
        ],
      },
      {
        id: 'notifications',
        title: 'Уведомления',
        description: 'Каналы и события',
        rows: [
          { label: 'Срочный лид', value: 'Email + в интерфейсе' },
          { label: 'Конфликт брони', value: 'В интерфейсе' },
          { label: 'Просроченный выезд', value: 'Email + SMS ответственному' },
        ],
      },
    ],
  };

  await prisma.systemConfig.upsert({
    where: { key: 'admin.workspace_settings.v1' },
    create: {
      key: 'admin.workspace_settings.v1',
      payload: asJson(workspacePayload),
    },
    update: {
      payload: asJson(workspacePayload),
    },
  });

  await prisma.systemConfig.upsert({
    where: { key: 'seed.dataset.v1' },
    create: {
      key: 'seed.dataset.v1',
      payload: asJson({
        createdAt: BASE_TIME.toISOString(),
        description: 'Combinatorial demo seed for CRM entities',
      }),
    },
    update: {
      payload: asJson({
        createdAt: BASE_TIME.toISOString(),
        description: 'Combinatorial demo seed for CRM entities',
      }),
    },
  });
}

async function main() {
  await resetDatabase();

  const users = await seedUsers();
  const directories = await seedDirectories();
  const clients = await seedClients(users, directories.tags);
  const leads = await seedLeads(users, clients);
  const applications = await seedApplications(users, clients, leads);
  const items = await seedApplicationItems(applications, directories.equipmentTypes);
  const reservations = await seedReservations(
    users,
    directories.equipmentTypes,
    directories.equipmentUnits,
    directories.subcontractors,
    items,
  );
  const departures = await seedDepartures(reservations);
  const completions = await seedCompletions(users, departures);

  await seedTasks(users, clients, leads, applications, reservations, departures);
  await seedActivity(users, leads, applications, reservations, departures, completions);
  await seedIntegrationEvents(leads);
  await seedSystemConfig();

  const [
    usersCount,
    clientsCount,
    leadsCount,
    applicationsCount,
    itemsCount,
    reservationsCount,
    departuresCount,
    completionsCount,
    tasksCount,
    integrationsCount,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.client.count(),
    prisma.lead.count(),
    prisma.application.count(),
    prisma.applicationItem.count(),
    prisma.reservation.count(),
    prisma.departure.count(),
    prisma.completion.count(),
    prisma.task.count(),
    prisma.integrationEvent.count(),
  ]);

  console.log('Comprehensive seed done:', {
    usersCount,
    clientsCount,
    leadsCount,
    applicationsCount,
    itemsCount,
    reservationsCount,
    departuresCount,
    completionsCount,
    tasksCount,
    integrationsCount,
    auth: {
      admin: 'admin@katet.local / admin123',
      manager: 'manager@katet.local / manager123',
    },
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
