import {
  Home,
  TrendingUp,
  Truck,
  Layers,
  BarChart3,
  Shield,
  Target,
  FileText,
  Users,
  CalendarClock,
  CheckSquare,
  Package,
  Building2,
  FolderTree,
  History,
  Upload,
  Settings,
  UserCog,
  KeyRound,
  Sparkles,
  Flame,
  PhoneOff,
  ArrowRightCircle,
  CalendarCheck,
  Clock,
  Copy,
  AlertTriangle,
  Gauge,
  Archive,
  Rocket,
  ClipboardList,
  Activity,
} from 'lucide-react';
import type { ComponentType } from 'react';
import type { UserRole } from './layoutStore';

type IconType = ComponentType<{ className?: string }>;

export type DomainId =
  | 'home'
  | 'sales'
  | 'clients'
  | 'ops'
  | 'catalogs'
  | 'control'
  | 'admin';

export type NavLeaf = {
  id: string;
  label: string;
  icon: IconType;
  iconClassName?: string;
};

export type NavGroup = {
  id: string;
  title?: string;
  items: NavLeaf[];
};

export type DomainConfig = {
  id: DomainId;
  label: string;
  icon: IconType;
  allowedRoles?: UserRole[];
  defaultSecondary: string;
  searchPlaceholder: string;
  groups: NavGroup[];
  savedViews?: NavLeaf[];
  savedViewsTitle?: string;
};

export type ModuleMeta = {
  domain: DomainId;
  title: string;
  searchPlaceholder: string;
  ctaLabel?: string;
  tabs?: { id: string; label: string }[];
};

export const PRIMARY_DOMAINS: DomainConfig[] = [
  {
    id: 'home',
    label: 'Главная',
    icon: Home,
    defaultSecondary: 'overview',
    searchPlaceholder: 'Быстрый поиск',
    groups: [
      {
        id: 'home-main',
        items: [
          { id: 'overview', label: 'Обзор', icon: Gauge },
          { id: 'my-tasks', label: 'Мои задачи', icon: CheckSquare },
          { id: 'urgent-today', label: 'Срочное сегодня', icon: Flame, iconClassName: 'text-rose-500' },
          { id: 'recent-activity', label: 'Последние действия', icon: Activity },
          { id: 'quick-links', label: 'Быстрые переходы', icon: Rocket },
        ],
      },
    ],
  },
  {
    id: 'sales',
    label: 'Продажи',
    icon: TrendingUp,
    defaultSecondary: 'leads',
    searchPlaceholder: 'Поиск по лидам, заявкам, клиентам',
    groups: [
      {
        id: 'sales-leads',
        title: 'Лиды',
        items: [
          { id: 'leads', label: 'Все лиды', icon: Target },
          { id: 'my-leads', label: 'Мои лиды', icon: Target },
        ],
      },
      {
        id: 'sales-apps',
        title: 'Заявки',
        items: [
          { id: 'applications', label: 'Все заявки', icon: FileText },
          { id: 'my-applications', label: 'Мои заявки', icon: FileText },
          { id: 'apps-no-reservation', label: 'Без брони', icon: CalendarClock },
          { id: 'apps-ready', label: 'Готовы к выезду', icon: Truck },
        ],
      },
    ],
    savedViewsTitle: 'Представления продаж',
    savedViews: [
      { id: 'view-urgent', label: 'Срочные лиды', icon: Flame, iconClassName: 'text-rose-500' },
      { id: 'view-no-contact', label: 'Без первого контакта', icon: PhoneOff, iconClassName: 'text-amber-500' },
      { id: 'view-to-application', label: 'Ждут перевода в заявку', icon: ArrowRightCircle, iconClassName: 'text-violet-500' },
      { id: 'view-needs-reservation', label: 'Требуют брони', icon: CalendarCheck, iconClassName: 'text-sky-500' },
      { id: 'view-stale', label: 'Зависшие', icon: Clock, iconClassName: 'text-orange-500' },
      { id: 'view-duplicates', label: 'Дубли', icon: Copy, iconClassName: 'text-slate-500' },
    ],
  },
  {
    id: 'clients',
    label: 'Клиенты',
    icon: Users,
    defaultSecondary: 'clients',
    searchPlaceholder: 'Поиск по клиентам',
    groups: [
      {
        id: 'clients-main',
        title: 'Клиенты',
        items: [
          { id: 'clients', label: 'Все · 8', icon: Users },
          { id: 'clients-new', label: 'Новые · 2', icon: Sparkles, iconClassName: 'text-sky-500' },
          { id: 'clients-repeat', label: 'Повторные · 4', icon: Copy, iconClassName: 'text-violet-500' },
          { id: 'clients-vip', label: 'VIP · 2', icon: Sparkles, iconClassName: 'text-amber-500' },
          { id: 'clients-debt', label: 'С долгом · 1', icon: AlertTriangle, iconClassName: 'text-rose-500' },
        ],
      },
    ],
  },
  {
    id: 'ops',
    label: 'Операции',
    icon: Truck,
    defaultSecondary: 'reservations',
    searchPlaceholder: 'Поиск по броням и выездам',
    groups: [
      {
        id: 'ops-main',
        items: [
          { id: 'reservations', label: 'Брони', icon: CalendarClock },
          { id: 'departures', label: 'Выезды', icon: Truck },
          { id: 'completion', label: 'Завершение', icon: CheckSquare },
        ],
      },
    ],
    savedViewsTitle: 'Представления операций',
    savedViews: [
      { id: 'view-conflict', label: 'Конфликт брони', icon: AlertTriangle, iconClassName: 'text-red-500' },
      { id: 'view-need-confirm', label: 'Требуют подтверждения', icon: CalendarCheck, iconClassName: 'text-sky-500' },
      { id: 'view-no-unit', label: 'Unit не выбран', icon: Package, iconClassName: 'text-amber-500' },
      { id: 'view-no-subcontractor', label: 'Подрядчик не выбран', icon: Building2, iconClassName: 'text-amber-500' },
      { id: 'view-ready-departure', label: 'Готовы к выезду', icon: Truck, iconClassName: 'text-emerald-500' },
      { id: 'view-released', label: 'Снятые брони', icon: Archive, iconClassName: 'text-slate-500' },
      { id: 'view-departures-today', label: 'Выезды сегодня', icon: Truck, iconClassName: 'text-emerald-500' },
      { id: 'view-overdue-departures', label: 'Просроченные выезды', icon: Clock, iconClassName: 'text-orange-500' },
      { id: 'view-no-completion', label: 'Без завершения', icon: ClipboardList, iconClassName: 'text-slate-500' },
    ],
  },
  {
    id: 'catalogs',
    label: 'Справочники',
    icon: Layers,
    defaultSecondary: 'equipment-types',
    searchPlaceholder: 'Поиск по технике и подрядчикам',
    groups: [
      {
        id: 'catalogs-main',
        items: [
          { id: 'equipment-types', label: 'Типы техники', icon: Layers },
          { id: 'equipment-units', label: 'Единицы техники', icon: Package },
          { id: 'subcontractors', label: 'Подрядчики', icon: Building2 },
          { id: 'equipment-categories', label: 'Категории', icon: FolderTree },
        ],
      },
    ],
  },
  {
    id: 'control',
    label: 'Контроль',
    icon: BarChart3,
    defaultSecondary: 'dashboard',
    searchPlaceholder: 'Поиск по отчётам и событиям',
    groups: [
      {
        id: 'control-main',
        items: [
          { id: 'dashboard', label: 'Дашборд', icon: Gauge },
          { id: 'reports', label: 'Отчёты', icon: BarChart3 },
          { id: 'audit', label: 'Журнал действий', icon: History },
        ],
      },
    ],
    savedViewsTitle: 'Аналитика',
    savedViews: [
      { id: 'view-stale-leads', label: 'Зависшие лиды', icon: Clock, iconClassName: 'text-orange-500' },
      { id: 'view-lost-leads', label: 'Потерянные лиды', icon: AlertTriangle, iconClassName: 'text-rose-500' },
      { id: 'view-active-reservations', label: 'Активные брони', icon: CalendarCheck, iconClassName: 'text-sky-500' },
      { id: 'view-manager-load', label: 'Нагрузка менеджеров', icon: Sparkles, iconClassName: 'text-violet-500' },
    ],
  },
  {
    id: 'admin',
    label: 'Админ',
    icon: Shield,
    allowedRoles: ['admin'],
    defaultSecondary: 'imports',
    searchPlaceholder: 'Поиск по настройкам, импортам и журналу событий',
    groups: [
      {
        id: 'admin-main',
        items: [
          { id: 'imports', label: 'Импорт', icon: Upload },
          { id: 'integrations', label: 'Журнал событий', icon: Activity },
          { id: 'settings', label: 'Настройки', icon: Settings },
          { id: 'users', label: 'Пользователи', icon: UserCog },
          { id: 'permissions', label: 'Права доступа', icon: KeyRound },
        ],
      },
    ],
  },
];

/**
 * Meta for each secondary nav id — used to drive page title, search placeholder,
 * CTA button and tabs. Kept in one place so shell, toolbar and placeholder stay in sync.
 */
export const MODULE_META: Record<string, ModuleMeta> = {
  // home
  overview: { domain: 'home', title: 'Обзор', searchPlaceholder: 'Быстрый поиск' },
  'my-tasks': { domain: 'home', title: 'Мои задачи', searchPlaceholder: 'Поиск задач' },
  'urgent-today': { domain: 'home', title: 'Срочное сегодня', searchPlaceholder: 'Поиск срочных' },
  'recent-activity': { domain: 'home', title: 'Последние действия', searchPlaceholder: 'Поиск событий' },
  'quick-links': { domain: 'home', title: 'Быстрые переходы', searchPlaceholder: 'Быстрый поиск' },

  // sales
  leads: {
    domain: 'sales',
    title: 'Лиды',
    searchPlaceholder: 'Поиск по лидам',
    ctaLabel: 'Новый лид',
    tabs: [
      { id: 'board', label: 'Доска' },
      { id: 'list', label: 'Список' },
      { id: 'table', label: 'Таблица' },
    ],
  },
  'my-leads': {
    domain: 'sales',
    title: 'Мои лиды',
    searchPlaceholder: 'Поиск по моим лидам',
    ctaLabel: 'Новый лид',
    tabs: [
      { id: 'board', label: 'Доска' },
      { id: 'list', label: 'Список' },
      { id: 'table', label: 'Таблица' },
    ],
  },
  applications: {
    domain: 'sales',
    title: 'Заявки',
    searchPlaceholder: 'Поиск по заявкам',
    // Заявки создаются из карточки лида; в шапке списка/таблицы CTA не показываем,
    // чтобы не плодить "фальшь-кнопки", и ведём пользователя через лид.
    tabs: [
      { id: 'list', label: 'Список' },
      { id: 'table', label: 'Таблица' },
    ],
  },
  'my-applications': {
    domain: 'sales',
    title: 'Мои заявки',
    searchPlaceholder: 'Поиск по моим заявкам',
    tabs: [
      { id: 'list', label: 'Список' },
      { id: 'table', label: 'Таблица' },
    ],
  },
  'apps-no-reservation': {
    domain: 'sales',
    title: 'Заявки без брони',
    searchPlaceholder: 'Поиск по заявкам',
    tabs: [
      { id: 'list', label: 'Список' },
      { id: 'table', label: 'Таблица' },
    ],
  },
  'apps-ready': {
    domain: 'sales',
    title: 'Готовы к выезду',
    searchPlaceholder: 'Поиск по заявкам',
    tabs: [
      { id: 'list', label: 'Список' },
      { id: 'table', label: 'Таблица' },
    ],
  },
  clients: {
    domain: 'clients',
    title: 'Клиенты',
    searchPlaceholder: 'Поиск клиентов',
    ctaLabel: 'Новый клиент',
    tabs: [
      { id: 'list', label: 'Список' },
      { id: 'cards', label: 'Карточки' },
    ],
  },
  'clients-new': {
    domain: 'clients',
    title: 'Клиенты · Новые',
    searchPlaceholder: 'Поиск клиентов',
    ctaLabel: 'Новый клиент',
    tabs: [
      { id: 'list', label: 'Список' },
      { id: 'cards', label: 'Карточки' },
    ],
  },
  'clients-repeat': {
    domain: 'clients',
    title: 'Клиенты · Повторные',
    searchPlaceholder: 'Поиск клиентов',
    ctaLabel: 'Новый клиент',
    tabs: [
      { id: 'list', label: 'Список' },
      { id: 'cards', label: 'Карточки' },
    ],
  },
  'clients-vip': {
    domain: 'clients',
    title: 'Клиенты · VIP',
    searchPlaceholder: 'Поиск клиентов',
    ctaLabel: 'Новый клиент',
    tabs: [
      { id: 'list', label: 'Список' },
      { id: 'cards', label: 'Карточки' },
    ],
  },
  'clients-debt': {
    domain: 'clients',
    title: 'Клиенты · С долгом',
    searchPlaceholder: 'Поиск клиентов',
    ctaLabel: 'Новый клиент',
    tabs: [
      { id: 'list', label: 'Список' },
      { id: 'cards', label: 'Карточки' },
    ],
  },

  // ops
  reservations: {
    domain: 'ops',
    title: 'Брони',
    searchPlaceholder: 'Поиск по бронированиям',
    // В MVP бронь всегда создаётся в контексте позиции заявки, поэтому
    // primary CTA «Новая бронь» не показываем — вместо него на странице
    // выведена secondary-ссылка «Перейти к заявкам».
    tabs: [
      { id: 'list', label: 'Список' },
      { id: 'table', label: 'Таблица' },
    ],
  },
  departures: {
    domain: 'ops',
    title: 'Выезды',
    searchPlaceholder: 'Поиск по выездам',
    tabs: [
      { id: 'list', label: 'Список' },
      { id: 'table', label: 'Таблица' },
    ],
  },
  completion: {
    domain: 'ops',
    title: 'Завершение',
    searchPlaceholder: 'Поиск завершённых',
    tabs: [
      { id: 'list', label: 'Список' },
      { id: 'table', label: 'Таблица' },
    ],
  },

  // catalogs
  'equipment-types': {
    domain: 'catalogs',
    title: 'Типы техники',
    searchPlaceholder: 'Поиск по типам',
    ctaLabel: 'Добавить тип техники',
    tabs: [
      { id: 'table', label: 'Таблица' },
      { id: 'list', label: 'Список' },
      { id: 'cards', label: 'Карточки' },
    ],
  },
  'equipment-units': {
    domain: 'catalogs',
    title: 'Единицы техники',
    searchPlaceholder: 'Поиск по единицам',
    ctaLabel: 'Добавить единицу',
    tabs: [
      { id: 'table', label: 'Таблица' },
      { id: 'list', label: 'Список' },
      { id: 'cards', label: 'Карточки' },
    ],
  },
  subcontractors: {
    domain: 'catalogs',
    title: 'Подрядчики',
    searchPlaceholder: 'Поиск подрядчиков',
    ctaLabel: 'Новый подрядчик',
    tabs: [
      { id: 'table', label: 'Таблица' },
      { id: 'list', label: 'Список' },
      { id: 'cards', label: 'Карточки' },
    ],
  },
  'equipment-categories': {
    domain: 'catalogs',
    title: 'Категории техники',
    searchPlaceholder: 'Поиск категорий',
    ctaLabel: 'Добавить категорию',
    tabs: [
      { id: 'table', label: 'Таблица' },
      { id: 'list', label: 'Список' },
      { id: 'cards', label: 'Карточки' },
    ],
  },

  // control
  dashboard: {
    domain: 'control',
    title: 'Дашборд',
    searchPlaceholder: 'Быстрый поиск',
  },
  reports: {
    domain: 'control',
    title: 'Отчёты',
    searchPlaceholder: 'Поиск отчётов',
  },
  audit: {
    domain: 'control',
    title: 'Журнал действий',
    searchPlaceholder: 'Поиск событий',
    tabs: [
      { id: 'table', label: 'Таблица' },
      { id: 'feed', label: 'Лента' },
    ],
  },
  'view-stale-leads': {
    domain: 'control',
    title: 'Аналитика · Зависшие лиды',
    searchPlaceholder: 'Поиск по аналитике',
  },
  'view-lost-leads': {
    domain: 'control',
    title: 'Аналитика · Потерянные лиды',
    searchPlaceholder: 'Поиск по аналитике',
  },
  'view-active-reservations': {
    domain: 'control',
    title: 'Аналитика · Активные брони',
    searchPlaceholder: 'Поиск по аналитике',
  },
  'view-manager-load': {
    domain: 'control',
    title: 'Аналитика · Нагрузка менеджеров',
    searchPlaceholder: 'Поиск по аналитике',
  },

  // admin
  imports: {
    domain: 'admin',
    title: 'Импорт',
    searchPlaceholder: 'Поиск по журналу импорта',
  },
  integrations: {
    domain: 'admin',
    title: 'Журнал событий',
    searchPlaceholder: 'Поиск по событиям интеграций',
  },
  settings: { domain: 'admin', title: 'Настройки', searchPlaceholder: 'Поиск настроек' },
  users: { domain: 'admin', title: 'Пользователи', searchPlaceholder: 'Поиск пользователей', ctaLabel: 'Новый пользователь' },
  permissions: { domain: 'admin', title: 'Права доступа', searchPlaceholder: 'Поиск ролей' },
};

// Saved-view aliases that render the Leads workspace with a pre-applied filter.
const LEADS_VIEW_BASE = {
  domain: 'sales' as const,
  searchPlaceholder: 'Поиск по лидам',
  ctaLabel: 'Новый лид',
  tabs: [
    { id: 'board', label: 'Доска' },
    { id: 'list', label: 'Список' },
    { id: 'table', label: 'Таблица' },
  ],
};
Object.assign(MODULE_META, {
  'view-urgent': { ...LEADS_VIEW_BASE, title: 'Лиды · Срочные' },
  'view-no-contact': { ...LEADS_VIEW_BASE, title: 'Лиды · Без первого контакта' },
  'view-to-application': { ...LEADS_VIEW_BASE, title: 'Лиды · Ждут перевода в заявку' },
  'view-needs-reservation': { ...LEADS_VIEW_BASE, title: 'Лиды · Требуют брони' },
  'view-stale': { ...LEADS_VIEW_BASE, title: 'Лиды · Зависшие' },
  'view-duplicates': { ...LEADS_VIEW_BASE, title: 'Лиды · Дубли' },
});

// Saved-view aliases that render the Reservations workspace with a pre-applied
// filter. All share the same tab set (list/table) and the ops domain.
const RESERVATIONS_VIEW_BASE = {
  domain: 'ops' as const,
  searchPlaceholder: 'Поиск по бронированиям',
  tabs: [
    { id: 'list', label: 'Список' },
    { id: 'table', label: 'Таблица' },
  ],
};
Object.assign(MODULE_META, {
  'view-conflict': { ...RESERVATIONS_VIEW_BASE, title: 'Брони · Конфликт' },
  'view-need-confirm': { ...RESERVATIONS_VIEW_BASE, title: 'Брони · Требуют подтверждения' },
  'view-no-unit': { ...RESERVATIONS_VIEW_BASE, title: 'Брони · Unit не выбран' },
  'view-no-subcontractor': { ...RESERVATIONS_VIEW_BASE, title: 'Брони · Подрядчик не выбран' },
  'view-ready-departure': { ...RESERVATIONS_VIEW_BASE, title: 'Брони · Готовы к выезду' },
  'view-released': { ...RESERVATIONS_VIEW_BASE, title: 'Брони · Снятые' },
});

// Ops saved-view aliases that render Departures / Completion workspaces.
const DEPARTURES_VIEW_BASE = {
  domain: 'ops' as const,
  searchPlaceholder: 'Поиск по выездам',
  tabs: [
    { id: 'list', label: 'Список' },
    { id: 'table', label: 'Таблица' },
  ],
};
Object.assign(MODULE_META, {
  'view-departures-today': { ...DEPARTURES_VIEW_BASE, title: 'Выезды · Сегодня' },
  'view-overdue-departures': { ...DEPARTURES_VIEW_BASE, title: 'Выезды · Просроченные' },
  'view-no-completion': {
    ...DEPARTURES_VIEW_BASE,
    title: 'Завершение · Без акта',
    searchPlaceholder: 'Поиск завершённых',
  },
});

export function getDomainConfig(domain: string): DomainConfig | undefined {
  return PRIMARY_DOMAINS.find((d) => d.id === domain);
}

export function getModuleMeta(secondaryId: string): ModuleMeta {
  return (
    MODULE_META[secondaryId] ?? {
      domain: 'home',
      title: 'Модуль',
      searchPlaceholder: 'Поиск',
    }
  );
}
