import { Lead } from '../types/kanban';
import {
  Client,
  ClientLeadHistoryItem,
  ClientOrderHistoryItem,
  ClientActivityItem,
} from '../types/client';

export function buildMockClient(lead?: Lead): Client {
  const isCompany = !!lead?.company;
  const displayName = isCompany ? (lead?.company ?? 'ООО Стройтех') : (lead?.client ?? 'Иванов И.И.');
  const idBase = lead?.id ?? '1';
  const id = `CL-${idBase.padStart(5, '0')}`;
  const manager = lead?.manager ?? 'Петров А.';
  const phone = lead?.phone ?? '+7 (999) 123-45-67';

  // Active records derived from lead context
  const stage = lead?.stage;
  const activeApplication = stage === 'application'
    ? { id: 'APP-00123', title: 'Заявка #APP-00123' }
    : undefined;
  const activeReservation = stage === 'reservation'
    ? { id: `RSV-${idBase.padStart(5, '0')}`, title: `Бронь RSV-${idBase.padStart(5, '0')}` }
    : undefined;
  const activeDeparture = stage === 'departure'
    ? { id: `DEP-${idBase.padStart(5, '0')}`, title: `Выезд DEP-${idBase.padStart(5, '0')}` }
    : undefined;

  const ordersHistory: ClientOrderHistoryItem[] = [
    {
      id: 'APP-00120',
      number: 'APP-00120',
      date: '2026-04-12',
      status: 'completed',
      positions: [
        { equipmentType: 'Экскаватор CAT-320', quantity: 1, unit: 'EXC-001' },
        { equipmentType: 'Самосвал', quantity: 2, subcontractor: 'СпецТехПартнёр' },
      ],
      equipmentSummary: 'Экскаватор CAT-320 · Самосвал ×2',
      address: 'г. Москва, ул. Ленина, 10',
      amount: '187 500 ₽',
      completionId: 'CMP-00120',
      comment: 'Подача со стороны двора. Пропуск на водителя.',
    },
    {
      id: 'APP-00112',
      number: 'APP-00112',
      date: '2026-03-28',
      status: 'completed',
      positions: [
        { equipmentType: 'Экскаватор CAT-320', quantity: 1, unit: 'EXC-002' },
      ],
      equipmentSummary: 'Экскаватор CAT-320',
      address: 'г. Москва, ул. Ленина, 10',
      amount: '92 000 ₽',
      completionId: 'CMP-00112',
    },
    {
      id: 'APP-00098',
      number: 'APP-00098',
      date: '2026-02-14',
      status: 'completed',
      positions: [
        { equipmentType: 'Бульдозер Komatsu D65', quantity: 1, subcontractor: 'СтройАренда' },
      ],
      equipmentSummary: 'Бульдозер Komatsu D65',
      address: 'МО, Балашиха',
      amount: '124 000 ₽',
      completionId: 'CMP-00098',
    },
    {
      id: 'APP-00081',
      number: 'APP-00081',
      date: '2026-01-22',
      status: 'cancelled',
      positions: [
        { equipmentType: 'Кран 25т', quantity: 1, subcontractor: 'Кран-Сервис' },
      ],
      equipmentSummary: 'Кран 25т',
      address: 'г. Москва',
      comment: 'Отменили по просьбе клиента, перенос даты.',
    },
  ];

  if (activeApplication) {
    ordersHistory.unshift({
      id: activeApplication.id,
      number: activeApplication.id,
      date: lead?.date ?? '2026-04-25',
      status: 'in_progress',
      positions: [
        { equipmentType: lead?.equipmentType ?? 'Экскаватор', quantity: 1 },
      ],
      equipmentSummary: lead?.equipmentType ?? 'Экскаватор',
      address: lead?.address,
      hasActiveReservation: stage === 'reservation' || stage === 'departure',
      hasActiveDeparture: stage === 'departure',
      reservationId: activeReservation?.id,
      departureId: activeDeparture?.id,
    });
  }

  const leadsHistory: ClientLeadHistoryItem[] = [
    {
      id: 'LEAD-00231',
      date: '2026-04-12',
      source: 'Сайт',
      status: 'converted',
      equipmentType: 'Экскаватор',
      address: 'г. Москва, ул. Ленина, 10',
      manager,
    },
    {
      id: 'LEAD-00198',
      date: '2026-03-28',
      source: 'Mango',
      status: 'converted',
      equipmentType: 'Экскаватор',
      address: 'г. Москва, ул. Ленина, 10',
      manager,
    },
    {
      id: 'LEAD-00154',
      date: '2026-02-14',
      source: 'Telegram',
      status: 'converted',
      equipmentType: 'Бульдозер',
      address: 'МО, Балашиха',
      manager,
    },
    {
      id: 'LEAD-00132',
      date: '2026-01-22',
      source: 'Сайт',
      status: 'lost',
      equipmentType: 'Кран 25т',
      address: 'г. Москва',
      manager,
    },
    {
      id: 'LEAD-00110',
      date: '2025-12-09',
      source: 'MAX',
      status: 'unqualified',
      equipmentType: 'Погрузчик',
      manager,
    },
  ];

  if (lead) {
    leadsHistory.unshift({
      id: `LEAD-${lead.id.padStart(5, '0')}`,
      date: lead.date ?? '2026-04-22',
      source: lead.source,
      status:
        stage === 'completed' ? 'converted'
        : stage === 'unqualified' ? 'unqualified'
        : 'in_progress',
      equipmentType: lead.equipmentType,
      address: lead.address,
      manager,
    });
  }

  const activity: ClientActivityItem[] = [
    {
      id: 'cl-1',
      at: '2025-11-08 10:12',
      actor: 'Система',
      kind: 'created',
      message: 'Карточка клиента создана',
    },
    {
      id: 'cl-2',
      at: '2025-11-08 11:30',
      actor: manager,
      kind: 'requisites_changed',
      message: 'Заполнены реквизиты компании',
    },
    {
      id: 'cl-3',
      at: '2026-02-14 18:40',
      actor: manager,
      kind: 'order_completed',
      message: 'Завершён заказ APP-00098',
    },
    {
      id: 'cl-4',
      at: '2026-03-28 19:05',
      actor: manager,
      kind: 'order_completed',
      message: 'Завершён заказ APP-00112',
    },
    {
      id: 'cl-5',
      at: '2026-04-12 18:05',
      actor: manager,
      kind: 'order_completed',
      message: 'Завершён заказ APP-00120',
    },
  ];

  if (activeApplication) {
    activity.push({
      id: 'cl-6',
      at: '2026-04-21 09:42',
      actor: manager,
      kind: 'application_created',
      message: `Создана заявка ${activeApplication.id}`,
    });
  }

  return {
    id,
    type: isCompany ? 'company' : 'person',
    displayName,
    shortName: isCompany ? lead?.client : undefined,
    primaryPhone: phone,
    primaryEmail: isCompany ? 'office@stroytech.ru' : 'ivanov@example.com',
    manager,
    createdAt: '2025-11-08 10:12',
    updatedAt: lead?.lastActivity ?? '10 мин назад',
    lastActivity: lead?.lastActivity ?? '10 мин назад',
    totalOrders: 8,
    totalRevenue: '1 248 500 ₽',
    daysSinceLastOrder: 10,
    tags: [
      { label: 'Постоянный клиент', tone: 'success' },
      ...(stage && stage !== 'completed' && stage !== 'unqualified'
        ? [{ label: 'Есть активный заказ', tone: 'progress' as const }]
        : []),
      ...(stage === 'departure' ? [{ label: 'Незавершённый выезд', tone: 'caution' as const }] : []),
    ],
    contacts: isCompany
      ? [
          {
            id: 'p1',
            name: lead?.client ?? 'Иванов И.И.',
            role: 'Прораб',
            phone,
            email: 'ivanov@stroytech.ru',
            isPrimary: true,
          },
          {
            id: 'p2',
            name: 'Смирнова Анна',
            role: 'Бухгалтер',
            phone: '+7 (999) 555-44-33',
            email: 'smirnova@stroytech.ru',
          },
          {
            id: 'p3',
            name: 'Кузнецов Олег',
            role: 'Снабжение',
            phone: '+7 (999) 555-77-88',
          },
        ]
      : [
          {
            id: 'p1',
            name: displayName,
            phone,
            email: 'ivanov@example.com',
            isPrimary: true,
          },
        ],
    requisites: isCompany
      ? {
          inn: '7701234567',
          kpp: '770101001',
          ogrn: '1027700123456',
          legalAddress: 'г. Москва, ул. Тверская, 12, оф. 305',
          bankName: 'АО «Тинькофф Банк»',
          bankAccount: '40702810100000123456',
          correspondentAccount: '30101810145250000974',
          bik: '044525974',
        }
      : {
          inn: '770112345678',
        },
    favoriteCategories: [
      { category: 'Экскаватор', count: 5 },
      { category: 'Бульдозер', count: 2 },
      { category: 'Самосвал', count: 2 },
    ],
    workingNotes: 'Звонить до 17:00. Оплата по факту, договор по шаблону. Пропуск оформляется заранее.',
    comment: 'Постоянный клиент с ноября 2025. Чаще берёт экскаватор на 1–2 смены.',
    leadsHistory,
    ordersHistory,
    activeRecords: {
      leadsCount: stage === 'lead' ? 1 : 0,
      applicationsCount: activeApplication ? 1 : 0,
      reservationsCount: activeReservation ? 1 : 0,
      departuresCount: activeDeparture ? 1 : 0,
      topActiveApplication: activeApplication,
      topActiveReservation: activeReservation,
      topActiveDeparture: activeDeparture,
    },
    possibleDuplicates: isCompany
      ? [
          { id: 'CL-00099', name: 'ООО Стройтех-М', reason: 'Похожее название' },
          { id: 'CL-00121', name: 'Стройтех ИП', reason: 'Совпадает телефон в одном из контактов' },
        ]
      : [],
    activity,
  };
}
