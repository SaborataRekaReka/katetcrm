import { Lead } from '../types/kanban';

export interface ClientsListItem {
  id: string;
  name: string;
  type: 'company' | 'person';
  company?: string;
  phone: string;
  manager: string;
  totalOrders: number;
  activeApplications: number;
  activeReservations: number;
  lastOrderDate?: string;
  lastActivity: string;
  createdAt: string;
  tags: Array<'vip' | 'new' | 'repeat' | 'debt'>;
  /** Source lead record used when opening ClientWorkspace modal. */
  sourceLead: Lead;
}

function baseLead(partial: Partial<Lead> & { id: string; client: string; manager: string; phone: string }): Lead {
  return {
    stage: 'completed',
    source: 'Сайт',
    sourceChannel: 'site',
    equipmentType: 'Экскаватор',
    lastActivity: '1 час назад',
    ...partial,
  } as Lead;
}

export const mockClientsList: ClientsListItem[] = [
  {
    id: 'CL-00001',
    name: 'ООО Стройтех',
    type: 'company',
    company: 'ООО Стройтех',
    phone: '+7 (999) 123-45-67',
    manager: 'Петров А.',
    totalOrders: 12,
    activeApplications: 1,
    activeReservations: 1,
    lastOrderDate: '2026-04-12',
    lastActivity: '3 часа назад',
    createdAt: '2025-11-03',
    tags: ['vip', 'repeat'],
    sourceLead: baseLead({
      id: '1',
      client: 'Иванов Иван',
      company: 'ООО Стройтех',
      phone: '+7 (999) 123-45-67',
      manager: 'Петров А.',
      stage: 'application',
    }),
  },
  {
    id: 'CL-00002',
    name: 'Смирнова Анна',
    type: 'person',
    phone: '+7 (999) 234-56-78',
    manager: 'Сидоров Б.',
    totalOrders: 2,
    activeApplications: 0,
    activeReservations: 0,
    lastOrderDate: '2026-03-28',
    lastActivity: '1 день назад',
    createdAt: '2026-02-15',
    tags: ['repeat'],
    sourceLead: baseLead({
      id: '2',
      client: 'Смирнова Анна',
      phone: '+7 (999) 234-56-78',
      manager: 'Сидоров Б.',
      stage: 'completed',
    }),
  },
  {
    id: 'CL-00003',
    name: 'ООО ДорогаПлюс',
    type: 'company',
    company: 'ООО ДорогаПлюс',
    phone: '+7 (499) 111-22-33',
    manager: 'Иванова С.',
    totalOrders: 7,
    activeApplications: 0,
    activeReservations: 2,
    lastOrderDate: '2026-04-18',
    lastActivity: '45 мин назад',
    createdAt: '2025-08-12',
    tags: ['repeat'],
    sourceLead: baseLead({
      id: '3',
      client: 'Кузнецов С.',
      company: 'ООО ДорогаПлюс',
      phone: '+7 (499) 111-22-33',
      manager: 'Иванова С.',
      stage: 'reservation',
    }),
  },
  {
    id: 'CL-00004',
    name: 'ИП Морозов',
    type: 'person',
    company: 'ИП Морозов',
    phone: '+7 (903) 555-11-22',
    manager: 'Петров А.',
    totalOrders: 1,
    activeApplications: 1,
    activeReservations: 0,
    lastOrderDate: undefined,
    lastActivity: '10 мин назад',
    createdAt: '2026-04-20',
    tags: ['new'],
    sourceLead: baseLead({
      id: '4',
      client: 'Морозов А.',
      company: 'ИП Морозов',
      phone: '+7 (903) 555-11-22',
      manager: 'Петров А.',
      stage: 'application',
    }),
  },
  {
    id: 'CL-00005',
    name: 'ООО ГрадСтрой',
    type: 'company',
    company: 'ООО ГрадСтрой',
    phone: '+7 (495) 777-88-99',
    manager: 'Сидоров Б.',
    totalOrders: 24,
    activeApplications: 2,
    activeReservations: 1,
    lastOrderDate: '2026-04-20',
    lastActivity: '2 часа назад',
    createdAt: '2024-05-01',
    tags: ['vip', 'repeat'],
    sourceLead: baseLead({
      id: '5',
      client: 'Васильев С.',
      company: 'ООО ГрадСтрой',
      phone: '+7 (495) 777-88-99',
      manager: 'Сидоров Б.',
      stage: 'reservation',
    }),
  },
  {
    id: 'CL-00006',
    name: 'Кузнецова Е.',
    type: 'person',
    phone: '+7 (926) 200-00-11',
    manager: 'Иванова С.',
    totalOrders: 1,
    activeApplications: 0,
    activeReservations: 0,
    lastOrderDate: '2026-02-02',
    lastActivity: '2 месяца назад',
    createdAt: '2026-01-22',
    tags: [],
    sourceLead: baseLead({
      id: '6',
      client: 'Кузнецова Е.',
      phone: '+7 (926) 200-00-11',
      manager: 'Иванова С.',
    }),
  },
  {
    id: 'CL-00007',
    name: 'ООО АвтоТрест',
    type: 'company',
    company: 'ООО АвтоТрест',
    phone: '+7 (812) 333-44-55',
    manager: 'Петров А.',
    totalOrders: 5,
    activeApplications: 0,
    activeReservations: 0,
    lastOrderDate: '2026-04-05',
    lastActivity: '5 дней назад',
    createdAt: '2025-10-10',
    tags: ['debt'],
    sourceLead: baseLead({
      id: '7',
      client: 'Овчинников Д.',
      company: 'ООО АвтоТрест',
      phone: '+7 (812) 333-44-55',
      manager: 'Петров А.',
    }),
  },
  {
    id: 'CL-00008',
    name: 'ООО МегаСтрой',
    type: 'company',
    company: 'ООО МегаСтрой',
    phone: '+7 (495) 100-20-30',
    manager: 'Иванова С.',
    totalOrders: 3,
    activeApplications: 0,
    activeReservations: 0,
    lastOrderDate: '2026-04-19',
    lastActivity: '20 мин назад',
    createdAt: '2026-04-01',
    tags: ['new'],
    sourceLead: baseLead({
      id: '8',
      client: 'Орлов М.',
      company: 'ООО МегаСтрой',
      phone: '+7 (495) 100-20-30',
      manager: 'Иванова С.',
    }),
  },
];
