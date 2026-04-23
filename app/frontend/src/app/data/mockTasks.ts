export type TaskStatus = 'open' | 'in_progress' | 'blocked' | 'done';
export type TaskPriority = 'urgent' | 'high' | 'normal' | 'low';
export type TaskDomain = 'lead' | 'application' | 'reservation' | 'departure' | 'completion' | 'client';
export type TaskDueKind = 'overdue' | 'today' | 'tomorrow' | 'later' | 'none';

export interface TaskLinkedEntity {
  domain: TaskDomain;
  id: string;
  label: string;
}

export interface TaskSubtask {
  id: string;
  title: string;
  assignee?: string;
  priority?: TaskPriority;
  done?: boolean;
}

export interface TaskComment {
  id: string;
  author: string;
  avatar: string;
  color: string;
  time: string;
  text: string;
}

export interface TaskActivityEntry {
  id: string;
  actor: string;
  text: string;
  entity?: string;
  time: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignee: string;
  reporter: string;
  startDate?: string;
  dueDate?: string;
  dueLabel: string;
  dueKind: TaskDueKind;
  estimate?: string;
  tracked?: string;
  tags: string[];
  linkedEntity?: TaskLinkedEntity;
  subtasks: TaskSubtask[];
  comments: TaskComment[];
  activity: TaskActivityEntry[];
  createdAt: string;
  createdBy: string;
}

export const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
  open: 'Открыта',
  in_progress: 'В работе',
  blocked: 'Заблокирована',
  done: 'Выполнена',
};

export const TASK_PRIORITY_LABEL: Record<TaskPriority, string> = {
  urgent: 'Срочный',
  high: 'Высокий',
  normal: 'Средний',
  low: 'Низкий',
};

export const TASK_DOMAIN_LABEL: Record<TaskDomain, string> = {
  lead: 'Лид',
  application: 'Заявка',
  reservation: 'Бронь',
  departure: 'Выезд',
  completion: 'Завершение',
  client: 'Клиент',
};

export const mockTasks: Task[] = [
  {
    id: 'TASK-00021',
    title: 'Перезвонить клиенту ООО «Стройтех»',
    description:
      'Клиент запросил детали по доступности экскаватора 2 класса на следующую неделю. Уточнить объём работ и сроки, подтвердить бюджет.',
    status: 'in_progress',
    priority: 'urgent',
    assignee: 'Петров А.',
    reporter: 'Сидоров Б.',
    startDate: '2026-04-22',
    dueDate: '2026-04-22',
    dueLabel: 'Сегодня · 14:00',
    dueKind: 'today',
    estimate: '30 мин',
    tracked: '0 мин',
    tags: ['звонок', 'клиент'],
    linkedEntity: { domain: 'lead', id: 'LEAD-00014', label: 'ООО «Стройтех»' },
    subtasks: [
      { id: 'st1', title: 'Подготовить коммерческое предложение', assignee: 'Петров А.', priority: 'high' },
      { id: 'st2', title: 'Проверить доступность техники в графике', assignee: 'Иванова С.', priority: 'normal', done: true },
    ],
    comments: [
      {
        id: 'c1',
        author: 'Сидоров Б.',
        avatar: 'С',
        color: 'from-sky-400 to-sky-600',
        time: '2 ч назад',
        text: 'Клиент просил перезвонить сразу после 13:00.',
      },
    ],
    activity: [
      { id: 'a1', actor: 'Сидоров Б.', text: 'создал задачу', time: '3 ч назад' },
      { id: 'a2', actor: 'Сидоров Б.', text: 'назначил исполнителя', entity: 'Петров А.', time: '3 ч назад' },
      { id: 'a3', actor: 'Петров А.', text: 'изменил статус на', entity: 'В работе', time: '1 ч назад' },
    ],
    createdAt: '2026-04-22 10:15',
    createdBy: 'Сидоров Б.',
  },
  {
    id: 'TASK-00022',
    title: 'Согласовать бронь RSV-00012 с подрядчиком',
    description: 'Нужно подтвердить у подрядчика «СпецТехПартнёр» готовность техники на 24 апреля.',
    status: 'open',
    priority: 'high',
    assignee: 'Петров А.',
    reporter: 'Петров А.',
    dueDate: '2026-04-22',
    dueLabel: 'Сегодня · 16:30',
    dueKind: 'today',
    estimate: '1 ч',
    tracked: '0 мин',
    tags: ['подрядчик', 'бронь'],
    linkedEntity: { domain: 'reservation', id: 'RSV-00012', label: 'RSV-00012 · ЖК «Южный квартал»' },
    subtasks: [],
    comments: [],
    activity: [
      { id: 'a1', actor: 'Петров А.', text: 'создал задачу', time: 'вчера' },
    ],
    createdAt: '2026-04-21 18:42',
    createdBy: 'Петров А.',
  },
  {
    id: 'TASK-00023',
    title: 'Подтвердить выезд DEP-00009',
    description: 'Проверить, что водитель и техника готовы. Связаться с заказчиком за 30 мин до выезда.',
    status: 'open',
    priority: 'normal',
    assignee: 'Иванова С.',
    reporter: 'Петров А.',
    dueDate: '2026-04-23',
    dueLabel: 'Завтра · 08:00',
    dueKind: 'tomorrow',
    estimate: '20 мин',
    tags: ['выезд'],
    linkedEntity: { domain: 'departure', id: 'DEP-00009', label: 'DEP-00009 · Химки, ул. Ленинградская' },
    subtasks: [],
    comments: [],
    activity: [{ id: 'a1', actor: 'Петров А.', text: 'создал задачу', time: 'вчера' }],
    createdAt: '2026-04-21 14:10',
    createdBy: 'Петров А.',
  },
  {
    id: 'TASK-00024',
    title: 'Оформить завершение CMP-00011',
    description: 'Собрать акт выполненных работ, сверить часы и километраж, передать клиенту на подпись.',
    status: 'in_progress',
    priority: 'normal',
    assignee: 'Сидоров Б.',
    reporter: 'Сидоров Б.',
    dueDate: '2026-04-25',
    dueLabel: 'До пятницы',
    dueKind: 'later',
    estimate: '45 мин',
    tracked: '15 мин',
    tags: ['акт', 'завершение'],
    linkedEntity: { domain: 'completion', id: 'CMP-00011', label: 'CMP-00011' },
    subtasks: [
      { id: 'st1', title: 'Получить подписанный акт', assignee: 'Сидоров Б.', priority: 'normal' },
    ],
    comments: [],
    activity: [{ id: 'a1', actor: 'Сидоров Б.', text: 'создал задачу', time: '2 дня назад' }],
    createdAt: '2026-04-20 09:05',
    createdBy: 'Сидоров Б.',
  },
  {
    id: 'TASK-00025',
    title: 'Проверить дубликат лида LEAD-00014',
    description: 'Возможный повтор из заявки прошлой недели. Сверить контакты и объединить.',
    status: 'blocked',
    priority: 'low',
    assignee: 'Петров А.',
    reporter: 'Admin',
    dueLabel: 'Без срока',
    dueKind: 'none',
    tags: ['дубликат'],
    linkedEntity: { domain: 'lead', id: 'LEAD-00014', label: 'ООО «Стройтех»' },
    subtasks: [],
    comments: [],
    activity: [{ id: 'a1', actor: 'Admin', text: 'создал задачу', time: '3 дня назад' }],
    createdAt: '2026-04-19 11:20',
    createdBy: 'Admin',
  },
  {
    id: 'TASK-00026',
    title: 'Позвонить новому клиенту «ИП Морозов»',
    description: 'Первичный контакт по входящему лиду.',
    status: 'open',
    priority: 'urgent',
    assignee: 'Петров А.',
    reporter: 'Сидоров Б.',
    dueDate: '2026-04-21',
    dueLabel: 'Вчера · 18:00',
    dueKind: 'overdue',
    estimate: '15 мин',
    tags: ['звонок'],
    linkedEntity: { domain: 'lead', id: 'LEAD-00015', label: 'ИП Морозов' },
    subtasks: [],
    comments: [],
    activity: [{ id: 'a1', actor: 'Сидоров Б.', text: 'создал задачу', time: '1 день назад' }],
    createdAt: '2026-04-21 10:00',
    createdBy: 'Сидоров Б.',
  },
];

export function groupTasksByDue(tasks: Task[]): Record<TaskDueKind, Task[]> {
  const groups: Record<TaskDueKind, Task[]> = {
    overdue: [],
    today: [],
    tomorrow: [],
    later: [],
    none: [],
  };
  for (const t of tasks) groups[t.dueKind].push(t);
  return groups;
}
