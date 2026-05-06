import { useEffect, useMemo, useState } from 'react';
import {
  Layers,
  Package,
  Building2,
  Archive,
  CheckCircle2,
  List,
  FolderTree,
  Star,
  Phone,
  Plus,
} from 'lucide-react';
import { useLayout } from '../shell/layoutStore';
import { getModuleMeta } from '../shell/navConfig';
import { ListScaffold } from '../shell/ListScaffold';
import { SimpleToolbar } from '../shell/SimpleToolbar';
import { EntityPresetTabs, type EntityPreset } from '../shell/EntityPresetTabs';
import { EntityListTable, type EntityColumn } from '../shell/EntityListTable';
import { parseInitialRoute, writeRoute } from '../shell/routeSync';
import { cn } from '../ui/utils';
import { USE_API } from '../../lib/featureFlags';
import {
  useEquipmentCategoriesQuery,
  useEquipmentTypesQuery,
  useEquipmentUnitsQuery,
  useSubcontractorsQuery,
} from '../../hooks/useDirectoriesQuery';
import type {
  EquipmentTypeApi,
  EquipmentUnitApi,
  SubcontractorApi,
  EquipmentCategoryApi,
} from '../../lib/directoriesApi';
import { useRegisterPrimaryCta } from '../shell/primaryCtaStore';
import {
  CategoryDialog,
  SubcontractorDialog,
  TypeDialog,
  UnitDialog,
} from './CatalogDialogs';

/**
 * Catalogs = back-office registry module.
 * Status-axis by sub-section:
 *   equipment-types        master-data registry          (no presets)
 *   equipment-units        semi-operational registry     (Все / Активные / Неактивные)
 *   subcontractors         semi-operational registry     (Все / Активные / Архив)
 *   equipment-categories   master-data registry          (no presets)
 *
 * Columns are domain-semantic (no abstract "Связано"); dense rows; single
 * primary CTA in WorkspaceHeader; table rendered through EntityListTable.
 */

type Status = 'active' | 'inactive' | 'archived';

interface EquipmentTypeRow {
  id: string;
  apiId?: string;
  name: string;
  categoryName: string;
  subcategories: string;
  unitsCount: number;
  activeApplications: number;
}

interface EquipmentUnitRow {
  id: string;
  apiId?: string;
  name: string;
  type: string;
  categoryName: string;
  year: number;
  activeBookings: number;
  status: Status;
}

interface SubcontractorRow {
  id: string;
  apiId?: string;
  name: string;
  specialization: string;
  region: string;
  phone: string;
  email: string;
  activeBookings: number;
  rating: number; // 0–5
  status: Status;
}

interface CategoryRow {
  id: string;
  apiId?: string;
  name: string;
  typesCount: number;
}

const EQUIPMENT_TYPES: EquipmentTypeRow[] = [
  { id: 'T-001', name: 'Экскаватор', categoryName: 'Землеройная', subcategories: 'гусеничный, колёсный', unitsCount: 12, activeApplications: 8 },
  { id: 'T-002', name: 'Бульдозер', categoryName: 'Землеройная', subcategories: '70–400 л.с.', unitsCount: 6, activeApplications: 3 },
  { id: 'T-003', name: 'Кран', categoryName: 'Подъёмная', subcategories: 'автокран, башенный', unitsCount: 4, activeApplications: 2 },
  { id: 'T-004', name: 'Погрузчик', categoryName: 'Землеройная', subcategories: 'фронтальный, вилочный', unitsCount: 8, activeApplications: 4 },
  { id: 'T-005', name: 'Самосвал', categoryName: 'Транспортная', subcategories: '10–40 т', unitsCount: 15, activeApplications: 11 },
  { id: 'T-006', name: 'Каток', categoryName: 'Вспомогательная', subcategories: 'вибрационный', unitsCount: 3, activeApplications: 0 },
];

const EQUIPMENT_UNITS: EquipmentUnitRow[] = [
  { id: 'EXC-001', name: 'CAT 320D', type: 'Экскаватор', categoryName: 'Землеройная', year: 2019, activeBookings: 2, status: 'active' },
  { id: 'EXC-002', name: 'Hitachi ZX200', type: 'Экскаватор', categoryName: 'Землеройная', year: 2021, activeBookings: 1, status: 'active' },
  { id: 'BLD-001', name: 'Komatsu D65', type: 'Бульдозер', categoryName: 'Землеройная', year: 2018, activeBookings: 0, status: 'active' },
  { id: 'CRN-001', name: 'XCMG QY25K', type: 'Автокран', categoryName: 'Подъёмная', year: 2020, activeBookings: 1, status: 'active' },
  { id: 'LDR-001', name: 'JCB 3CX', type: 'Погрузчик', categoryName: 'Землеройная', year: 2022, activeBookings: 3, status: 'active' },
  { id: 'LDR-002', name: 'Volvo L60H', type: 'Погрузчик', categoryName: 'Землеройная', year: 2017, activeBookings: 0, status: 'inactive' },
  { id: 'TRK-001', name: 'KAMAZ 6520', type: 'Самосвал', categoryName: 'Транспортная', year: 2019, activeBookings: 2, status: 'active' },
];

const SUBCONTRACTORS: SubcontractorRow[] = [
  {
    id: 'SC-001',
    name: 'СпецТехПартнёр',
    specialization: 'Экскаваторы, краны',
    region: 'Москва',
    phone: '+7 (495) 120-45-67',
    email: 'partner1@katet.local',
    activeBookings: 4,
    rating: 4.8,
    status: 'active',
  },
  {
    id: 'SC-002',
    name: 'СтройТехЛизинг',
    specialization: 'Бульдозеры, катки',
    region: 'Московская обл.',
    phone: '+7 (495) 800-11-22',
    email: 'partner2@katet.local',
    activeBookings: 2,
    rating: 4.5,
    status: 'active',
  },
  {
    id: 'SC-003',
    name: 'МегаТехника',
    specialization: 'Погрузчики, самосвалы',
    region: 'Санкт-Петербург',
    phone: '+7 (812) 444-12-34',
    email: 'partner3@katet.local',
    activeBookings: 1,
    rating: 4.2,
    status: 'active',
  },
  {
    id: 'SC-004',
    name: 'АвтоСпец',
    specialization: 'Самосвалы',
    region: 'Москва',
    phone: '+7 (495) 700-00-00',
    email: 'partner4@katet.local',
    activeBookings: 0,
    rating: 3.5,
    status: 'archived',
  },
];

const CATEGORIES: CategoryRow[] = [
  { id: 'C-001', name: 'Землеройная', typesCount: 18 },
  { id: 'C-002', name: 'Подъёмная', typesCount: 7 },
  { id: 'C-003', name: 'Транспортная', typesCount: 12 },
  { id: 'C-004', name: 'Вспомогательная', typesCount: 9 },
];

type PresetId = 'all' | 'active' | 'inactive' | 'archived';
const PRESETS_BY_NAV: Record<string, PresetId[]> = {
  'equipment-units': ['all', 'active', 'inactive'],
  subcontractors: ['all', 'active', 'archived'],
};

function applyStatusPreset<T extends { status?: Status }>(rows: T[], preset: PresetId): T[] {
  if (preset === 'all') return rows;
  return rows.filter((r) => (r.status ?? 'active') === preset);
}

function buildPresets<T extends { status?: Status }>(
  navId: string,
  rows: T[],
): EntityPreset[] | null {
  const ids = PRESETS_BY_NAV[navId];
  if (!ids) return null;
  const mk = (id: PresetId, label: string, icon: React.ReactNode): EntityPreset => ({
    id,
    label,
    icon,
    count: applyStatusPreset(rows, id).length,
  });
  const map: Record<PresetId, EntityPreset> = {
    all: mk('all', 'Все', <List className="h-3 w-3" />),
    active: mk('active', 'Активные', <CheckCircle2 className="h-3 w-3" />),
    inactive: mk('inactive', 'Неактивные', <Archive className="h-3 w-3" />),
    archived: mk('archived', 'Архив', <Archive className="h-3 w-3" />),
  };
  return ids.map((id) => map[id]);
}

function readInitialPreset(supported: PresetId[] | null): PresetId {
  if (!supported) return 'all';
  const { preset } = parseInitialRoute();
  return (supported as string[]).includes(preset ?? '') ? (preset as PresetId) : 'all';
}

function matchesQuery(row: Record<string, unknown>, q: string): boolean {
  if (!q) return true;
  return Object.values(row)
    .filter((v) => typeof v === 'string' || typeof v === 'number')
    .join(' ')
    .toLowerCase()
    .includes(q);
}

/* ---- row-level primitives ------------------------------------------------ */

function RowIdCell({ id }: { id: string }) {
  return <span className="font-mono text-[10px] text-muted-foreground">{id}</span>;
}

function RowNameCell({ icon, name }: { icon: React.ReactNode; name: string }) {
  return (
    <div className="flex items-center gap-1.5 text-foreground">
      <span className="text-muted-foreground">{icon}</span>
      <span className="truncate font-medium">{name}</span>
    </div>
  );
}

function CountCell({ value, tone }: { value: number; tone?: 'brand' | 'danger' }) {
  if (value === 0) return <span className="text-muted-foreground">—</span>;
  return (
    <span
      className={cn(
        'tabular-nums',
        tone === 'brand' && 'text-[#2a6af0]',
        tone === 'danger' && 'text-rose-600',
        !tone && 'text-foreground',
      )}
    >
      {value}
    </span>
  );
}

function StatusPill({ status }: { status: Status }) {
  const map: Record<Status, { label: string; cls: string }> = {
    active: { label: 'Активна', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    inactive: { label: 'Неактивна', cls: 'bg-slate-50 text-slate-600 border-slate-200' },
    archived: { label: 'Архив', cls: 'bg-slate-50 text-slate-500 border-slate-200' },
  };
  const it = map[status];
  return (
    <span className={`inline-flex rounded border px-1.5 py-0 text-[10px] leading-4 ${it.cls}`}>
      {it.label}
    </span>
  );
}

function RatingCell({ value }: { value: number }) {
  if (value <= 0) {
    return <span className="text-muted-foreground">—</span>;
  }
  const tone = value >= 4.5 ? 'text-emerald-600' : value >= 4 ? 'text-amber-600' : 'text-rose-600';
  return (
    <span className={cn('inline-flex items-center gap-1 tabular-nums', tone)}>
      <Star className="h-3 w-3 fill-current" />
      {value.toFixed(1)}
    </span>
  );
}

/* ---- column sets --------------------------------------------------------- */

const typesColumns: EntityColumn<EquipmentTypeRow>[] = [
  { id: 'id', header: 'Код', width: '110px', render: (r) => <RowIdCell id={r.id} /> },
  {
    id: 'name',
    header: 'Название',
    render: (r) => <RowNameCell icon={<Layers className="h-3.5 w-3.5" />} name={r.name} />,
  },
  {
    id: 'category',
    header: 'Категория',
    width: '180px',
    render: (r) => (
      <span className="inline-flex items-center gap-1 text-foreground/80">
        <FolderTree className="h-3 w-3 text-muted-foreground" />
        {r.categoryName}
      </span>
    ),
  },
  { id: 'sub', header: 'Описание', render: (r) => <span className="text-foreground/80">{r.subcategories}</span> },
  {
    id: 'units',
    header: 'Единиц техники',
    width: '130px',
    align: 'right',
    render: (r) => <CountCell value={r.unitsCount} tone="brand" />,
  },
  {
    id: 'apps',
    header: 'Активных заявок',
    width: '140px',
    align: 'right',
    render: (r) => <CountCell value={r.activeApplications} />,
  },
];

const unitsColumns: EntityColumn<EquipmentUnitRow>[] = [
  { id: 'id', header: 'Инв. номер', width: '110px', render: (r) => <RowIdCell id={r.id} /> },
  {
    id: 'name',
    header: 'Название',
    render: (r) => <RowNameCell icon={<Package className="h-3.5 w-3.5" />} name={r.name} />,
  },
  { id: 'type', header: 'Тип', width: '140px', render: (r) => <span className="text-foreground/80">{r.type}</span> },
  {
    id: 'category',
    header: 'Категория',
    width: '160px',
    render: (r) => (
      <span className="inline-flex items-center gap-1 text-foreground/80">
        <FolderTree className="h-3 w-3 text-muted-foreground" />
        {r.categoryName}
      </span>
    ),
  },
  {
    id: 'year',
    header: 'Год',
    width: '70px',
    align: 'right',
    render: (r) => <span className="tabular-nums text-foreground/80">{r.year || '—'}</span>,
  },
  {
    id: 'active',
    header: 'Активных броней',
    width: '140px',
    align: 'right',
    render: (r) => <CountCell value={r.activeBookings} tone="brand" />,
  },
  { id: 'status', header: 'Статус', width: '100px', render: (r) => <StatusPill status={r.status} /> },
];

const subcontractorsColumns: EntityColumn<SubcontractorRow>[] = [
  { id: 'id', header: 'Код', width: '100px', render: (r) => <RowIdCell id={r.id} /> },
  {
    id: 'name',
    header: 'Подрядчик',
    render: (r) => <RowNameCell icon={<Building2 className="h-3.5 w-3.5" />} name={r.name} />,
  },
  {
    id: 'spec',
    header: 'Специализация',
    render: (r) => <span className="text-foreground/80">{r.specialization}</span>,
  },
  { id: 'region', header: 'Регион', width: '160px', render: (r) => <span className="text-foreground/80">{r.region}</span> },
  {
    id: 'contact',
    header: 'Контакт',
    width: '180px',
    render: (r) => (
      <div className="flex flex-col leading-tight">
        <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
          <Phone className="h-2.5 w-2.5" />
          {r.phone}
        </span>
        <span className="text-[11px] text-muted-foreground">{r.email}</span>
      </div>
    ),
  },
  {
    id: 'active',
    header: 'Активных броней',
    width: '150px',
    align: 'right',
    render: (r) => <CountCell value={r.activeBookings} tone="brand" />,
  },
  { id: 'rating', header: 'Рейтинг', width: '90px', align: 'right', render: (r) => <RatingCell value={r.rating} /> },
  { id: 'status', header: 'Статус', width: '110px', render: (r) => <StatusPill status={r.status} /> },
];

const categoriesColumns: EntityColumn<CategoryRow>[] = [
  { id: 'id', header: 'Код', width: '100px', render: (r) => <RowIdCell id={r.id} /> },
  {
    id: 'name',
    header: 'Категория',
    width: '220px',
    render: (r) => <RowNameCell icon={<FolderTree className="h-3.5 w-3.5" />} name={r.name} />,
  },
  {
    id: 'types',
    header: 'Типов в категории',
    width: '160px',
    align: 'right',
    render: (r) => <CountCell value={r.typesCount} tone="brand" />,
  },
];

/* ---- List & Cards views --------------------------------------------------
 * Лёгкие альтернативы табличному виду. `list` = вертикальный плотный список
 * с подзаголовком-дендормализацией. `cards` = плитка 3–4 в ряд с тем же
 * набором полей, но крупнее. Оба вида используют те же Row-объекты, что и
 * таблица — без отдельных мэпперов.
 */

function ViewListRow({
  primary,
  secondary,
  meta,
  badges,
  onClick,
}: {
  primary: React.ReactNode;
  secondary?: React.ReactNode;
  meta?: React.ReactNode;
  badges?: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group w-full flex items-center gap-3 px-3 py-2 border-b border-gray-100 hover:bg-gray-50/70 text-left transition-colors"
    >
      <div className="min-w-0 flex-1">
        <div className="text-[12px] text-foreground truncate">{primary}</div>
        {secondary && (
          <div className="text-[11px] text-muted-foreground truncate mt-0.5">{secondary}</div>
        )}
      </div>
      {meta && <div className="text-[11px] text-muted-foreground whitespace-nowrap">{meta}</div>}
      {badges && <div className="flex items-center gap-1.5 flex-shrink-0">{badges}</div>}
    </button>
  );
}

function ViewCard({
  icon,
  title,
  subtitle,
  rows,
  footer,
  onClick,
}: {
  icon: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  rows: { label: string; value: React.ReactNode }[];
  footer?: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col border border-gray-200 rounded-lg bg-white hover:border-blue-300 hover:shadow-sm transition-all text-left p-3 gap-2 min-w-0"
    >
      <div className="flex items-start gap-2 min-w-0">
        <div className="w-7 h-7 rounded bg-gray-100 flex items-center justify-center text-muted-foreground flex-shrink-0">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[13px] text-foreground truncate font-medium">{title}</div>
          {subtitle && (
            <div className="text-[11px] text-muted-foreground truncate mt-0.5">{subtitle}</div>
          )}
        </div>
      </div>
      <div className="flex flex-col gap-1 pt-1 border-t border-gray-100">
        {rows.map((r, i) => (
          <div key={i} className="flex items-center gap-2 text-[11px]">
            <span className="text-muted-foreground w-[90px] flex-shrink-0">{r.label}</span>
            <span className="min-w-0 flex-1 text-foreground/90 truncate text-right">{r.value}</span>
          </div>
        ))}
      </div>
      {footer && <div className="mt-1">{footer}</div>}
    </button>
  );
}

function CardsGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3 p-3">
      {children}
    </div>
  );
}

function AddCard({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center justify-center gap-2 min-h-[100px] border border-dashed border-gray-300 rounded-lg bg-white hover:border-blue-400 hover:bg-blue-50/40 text-gray-500 hover:text-blue-600 transition-colors"
    >
      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-current">
        <Plus className="h-4 w-4" />
      </span>
      <span className="text-[11px]">{label}</span>
    </button>
  );
}

function ListContainer({ children }: { children: React.ReactNode }) {
  return <div className="bg-white">{children}</div>;
}

function EmptyView({ label }: { label: string }) {
  return <div className="p-8 text-center text-[12px] text-muted-foreground">{label}</div>;
}


/* ---- API mappers --------------------------------------------------------- */
function mapTypeApi(api: EquipmentTypeApi): EquipmentTypeRow {
  return {
    id: api.id.slice(0, 8),
    apiId: api.id,
    name: api.name,
    categoryName: api.category?.name ?? '—',
    subcategories: api.description ?? '—',
    unitsCount: api._count?.units ?? 0,
    activeApplications: api.activeApplicationsCount ?? 0,
  };
}

function mapUnitApi(api: EquipmentUnitApi): EquipmentUnitRow {
  return {
    id: api.plateNumber ?? api.id.slice(0, 8),
    apiId: api.id,
    name: api.name,
    type: api.equipmentType?.name ?? '—',
    categoryName: api.equipmentType?.category?.name ?? '—',
    year: api.year ?? 0,
    activeBookings: api.activeBookingsCount ?? 0,
    status: api.status,
  };
}

function mapSubcontractorApi(api: SubcontractorApi): SubcontractorRow {
  return {
    id: api.id.slice(0, 8),
    apiId: api.id,
    name: api.name,
    specialization: api.specialization ?? '—',
    region: api.region ?? '—',
    phone: api.contactPhone ?? '—',
    email: api.contactEmail ?? '—',
    activeBookings: api.activeBookingsCount ?? 0,
    rating: api.rating ?? 0,
    status: api.status,
  };
}

function mapCategoryApi(api: EquipmentCategoryApi): CategoryRow {
  return {
    id: api.id.slice(0, 8),
    apiId: api.id,
    name: api.name,
    typesCount: api._count?.types ?? 0,
  };
}

export function CatalogsWorkspacePage() {
  const { activeSecondaryNav, currentView } = useLayout();
  const meta = getModuleMeta(activeSecondaryNav);
  const supportedIds = PRESETS_BY_NAV[activeSecondaryNav] ?? null;

  const [preset, setPreset] = useState<PresetId>(() => readInitialPreset(supportedIds));
  const [query, setQuery] = useState('');

  useEffect(() => {
    setPreset(readInitialPreset(supportedIds));
    setQuery('');
  }, [activeSecondaryNav, supportedIds]);

  useEffect(() => {
    writeRoute(activeSecondaryNav, { preset: preset === 'all' ? null : preset });
  }, [activeSecondaryNav, preset]);

  const q = query.trim().toLowerCase();

  // Реальные запросы к API. Включены только на нужной под-странице, чтобы
  // не дёргать лишние endpoints при переключении nav.
  const typesQuery = useEquipmentTypesQuery(undefined, USE_API && activeSecondaryNav === 'equipment-types');
  const unitsQuery = useEquipmentUnitsQuery(
    { status: preset !== 'all' ? preset : undefined },
    USE_API && activeSecondaryNav === 'equipment-units',
  );
  const subsQuery = useSubcontractorsQuery(
    { status: preset !== 'all' ? preset : undefined, query: q || undefined },
    USE_API && activeSecondaryNav === 'subcontractors',
  );
  const categoriesQuery = useEquipmentCategoriesQuery(
    USE_API && activeSecondaryNav === 'equipment-categories',
  );

  const typesRows = useMemo<EquipmentTypeRow[]>(
    () =>
      USE_API && typesQuery.data
        ? typesQuery.data.map(mapTypeApi)
        : EQUIPMENT_TYPES,
    [typesQuery.data],
  );

  const unitsRows = useMemo<EquipmentUnitRow[]>(
    () =>
      USE_API && unitsQuery.data
        ? unitsQuery.data.map(mapUnitApi)
        : EQUIPMENT_UNITS,
    [unitsQuery.data],
  );

  const subsRows = useMemo<SubcontractorRow[]>(
    () =>
      USE_API && subsQuery.data
        ? subsQuery.data.map(mapSubcontractorApi)
        : SUBCONTRACTORS,
    [subsQuery.data],
  );

  const categoriesRows = useMemo<CategoryRow[]>(
    () =>
      USE_API && categoriesQuery.data
        ? categoriesQuery.data.map(mapCategoryApi)
        : CATEGORIES,
    [categoriesQuery.data],
  );

  /* ---- CTA + edit dialogs ---- */
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<EquipmentCategoryApi | null>(null);
  const [editingType, setEditingType] = useState<EquipmentTypeApi | null>(null);
  const [editingUnit, setEditingUnit] = useState<EquipmentUnitApi | null>(null);
  const [editingSub, setEditingSub] = useState<SubcontractorApi | null>(null);

  // Primary CTA «Создать …» регистрируется только на страницах справочников и
  // только при USE_API (без API создавать нечего). Обработчик открывает диалог
  // создания для текущей подстраницы.
  const ctaHandler = USE_API
    ? () => setIsCreateOpen(true)
    : null;
  useRegisterPrimaryCta(activeSecondaryNav, ctaHandler);

  const handleRowClick = (apiId: string | undefined) => {
    if (!USE_API || !apiId) return;
    switch (activeSecondaryNav) {
      case 'equipment-categories': {
        const c = categoriesQuery.data?.find((x) => x.id === apiId);
        if (c) setEditingCategory(c);
        break;
      }
      case 'equipment-types': {
        const t = typesQuery.data?.find((x) => x.id === apiId);
        if (t) setEditingType(t);
        break;
      }
      case 'equipment-units': {
        const u = unitsQuery.data?.find((x) => x.id === apiId);
        if (u) setEditingUnit(u);
        break;
      }
      case 'subcontractors': {
        const s = subsQuery.data?.find((x) => x.id === apiId);
        if (s) setEditingSub(s);
        break;
      }
    }
  };

  const renderView = () => {
    // normalize view: default to 'table' если currentView не поддерживается
    // (например, переход с board/list из другого модуля).
    const view: 'table' | 'list' | 'cards' =
      currentView === 'list' || currentView === 'cards' ? currentView : 'table';

    switch (activeSecondaryNav) {
      case 'equipment-types': {
        const rows = typesRows.filter((r) => matchesQuery(r as Record<string, unknown>, q));
        if (rows.length === 0) return <EmptyView label="Типы техники не найдены" />;
        if (view === 'table')
          return (
            <EntityListTable
              rows={rows}
              columns={typesColumns}
              minWidth={900}
              onRowClick={(r) => handleRowClick(r.apiId)}
            />
          );
        if (view === 'list')
          return (
            <ListContainer>
              {rows.map((r) => (
                <ViewListRow
                  key={r.apiId ?? r.id}
                  primary={
                    <span className="inline-flex items-center gap-1.5">
                      <Layers className="h-3.5 w-3.5 text-muted-foreground" />
                      {r.name}
                    </span>
                  }
                  secondary={`${r.categoryName} · ${r.subcategories}`}
                  meta={`Единиц: ${r.unitsCount} · Заявок: ${r.activeApplications}`}
                  onClick={() => handleRowClick(r.apiId)}
                />
              ))}
            </ListContainer>
          );
        return (
          <CardsGrid>
            {rows.map((r) => (
              <ViewCard
                key={r.apiId ?? r.id}
                icon={<Layers className="h-3.5 w-3.5" />}
                title={r.name}
                subtitle={r.categoryName}
                rows={[
                  { label: 'Описание', value: r.subcategories },
                  { label: 'Единиц', value: <CountCell value={r.unitsCount} tone="brand" /> },
                  { label: 'Активных заявок', value: <CountCell value={r.activeApplications} /> },
                ]}
                onClick={() => handleRowClick(r.apiId)}
              />
            ))}
            {USE_API && <AddCard label="Новый тип" onClick={() => setIsCreateOpen(true)} />}
          </CardsGrid>
        );
      }

      case 'equipment-units': {
        const rows = applyStatusPreset(unitsRows, preset).filter((r) =>
          matchesQuery(r as Record<string, unknown>, q),
        );
        if (rows.length === 0) return <EmptyView label="Единицы техники не найдены" />;
        if (view === 'table')
          return (
            <EntityListTable
              rows={rows}
              columns={unitsColumns}
              minWidth={1120}
              onRowClick={(r) => handleRowClick(r.apiId)}
            />
          );
        if (view === 'list')
          return (
            <ListContainer>
              {rows.map((r) => (
                <ViewListRow
                  key={r.apiId ?? r.id}
                  primary={
                    <span className="inline-flex items-center gap-1.5">
                      <Package className="h-3.5 w-3.5 text-muted-foreground" />
                      {r.name}
                    </span>
                  }
                  secondary={`${r.type} · ${r.categoryName}${r.year ? ' · ' + r.year : ''}`}
                  badges={
                    <>
                      <CountCell value={r.activeBookings} tone="brand" />
                      <StatusPill status={r.status} />
                    </>
                  }
                  onClick={() => handleRowClick(r.apiId)}
                />
              ))}
            </ListContainer>
          );
        return (
          <CardsGrid>
            {rows.map((r) => (
              <ViewCard
                key={r.apiId ?? r.id}
                icon={<Package className="h-3.5 w-3.5" />}
                title={r.name}
                subtitle={`${r.type} · ${r.categoryName}`}
                rows={[
                  {
                    label: 'Инв. номер',
                    value: <span className="font-mono text-[10px]">{r.id}</span>,
                  },
                  { label: 'Год', value: r.year || '—' },
                  {
                    label: 'Активных броней',
                    value: <CountCell value={r.activeBookings} tone="brand" />,
                  },
                ]}
                footer={<StatusPill status={r.status} />}
                onClick={() => handleRowClick(r.apiId)}
              />
            ))}
            {USE_API && <AddCard label="Новая единица" onClick={() => setIsCreateOpen(true)} />}
          </CardsGrid>
        );
      }

      case 'subcontractors': {
        const rows = applyStatusPreset(subsRows, preset).filter((r) =>
          matchesQuery(r as Record<string, unknown>, q),
        );
        if (rows.length === 0) return <EmptyView label="Подрядчики не найдены" />;
        if (view === 'table')
          return (
            <EntityListTable
              rows={rows}
              columns={subcontractorsColumns}
              minWidth={1200}
              onRowClick={(r) => handleRowClick(r.apiId)}
            />
          );
        if (view === 'list')
          return (
            <ListContainer>
              {rows.map((r) => (
                <ViewListRow
                  key={r.apiId ?? r.id}
                  primary={
                    <span className="inline-flex items-center gap-1.5">
                      <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                      {r.name}
                    </span>
                  }
                  secondary={`${r.specialization} · ${r.region}`}
                  meta={
                    <span className="inline-flex items-center gap-1">
                      <Phone className="h-2.5 w-2.5" />
                      {r.phone}
                    </span>
                  }
                  badges={
                    <>
                      <RatingCell value={r.rating} />
                      <StatusPill status={r.status} />
                    </>
                  }
                  onClick={() => handleRowClick(r.apiId)}
                />
              ))}
            </ListContainer>
          );
        return (
          <CardsGrid>
            {rows.map((r) => (
              <ViewCard
                key={r.apiId ?? r.id}
                icon={<Building2 className="h-3.5 w-3.5" />}
                title={r.name}
                subtitle={`${r.specialization} · ${r.region}`}
                rows={[
                  { label: 'Телефон', value: r.phone },
                  { label: 'Эл. почта', value: r.email },
                  {
                    label: 'Активных броней',
                    value: <CountCell value={r.activeBookings} tone="brand" />,
                  },
                  { label: 'Рейтинг', value: <RatingCell value={r.rating} /> },
                ]}
                footer={<StatusPill status={r.status} />}
                onClick={() => handleRowClick(r.apiId)}
              />
            ))}
            {USE_API && <AddCard label="Новый подрядчик" onClick={() => setIsCreateOpen(true)} />}
          </CardsGrid>
        );
      }

      case 'equipment-categories': {
        const rows = categoriesRows.filter((r) => matchesQuery(r as Record<string, unknown>, q));
        if (rows.length === 0) return <EmptyView label="Категории не найдены" />;
        if (view === 'table')
          return (
            <EntityListTable
              rows={rows}
              columns={categoriesColumns}
              minWidth={720}
              onRowClick={(r) => handleRowClick(r.apiId)}
            />
          );
        if (view === 'list')
          return (
            <ListContainer>
              {rows.map((r) => (
                <ViewListRow
                  key={r.apiId ?? r.id}
                  primary={
                    <span className="inline-flex items-center gap-1.5">
                      <FolderTree className="h-3.5 w-3.5 text-muted-foreground" />
                      {r.name}
                    </span>
                  }
                  meta={`Типов: ${r.typesCount}`}
                  onClick={() => handleRowClick(r.apiId)}
                />
              ))}
            </ListContainer>
          );
        return (
          <CardsGrid>
            {rows.map((r) => (
              <ViewCard
                key={r.apiId ?? r.id}
                icon={<FolderTree className="h-3.5 w-3.5" />}
                title={r.name}
                rows={[
                  { label: 'Типов', value: <CountCell value={r.typesCount} tone="brand" /> },
                ]}
                onClick={() => handleRowClick(r.apiId)}
              />
            ))}
            {USE_API && <AddCard label="Новая категория" onClick={() => setIsCreateOpen(true)} />}
          </CardsGrid>
        );
      }

      default:
        return null;
    }
  };

  const presets = useMemo(() => {
    if (activeSecondaryNav === 'equipment-units') return buildPresets(activeSecondaryNav, unitsRows);
    if (activeSecondaryNav === 'subcontractors') return buildPresets(activeSecondaryNav, subsRows);
    return null;
  }, [activeSecondaryNav, unitsRows, subsRows]);

  const toolbar = (
    <div className="flex flex-col">
      {presets ? (
        <EntityPresetTabs
          presets={presets}
          activeId={preset}
          onChange={(id) => setPreset(id as PresetId)}
        />
      ) : null}
      <SimpleToolbar
        searchPlaceholder={meta.searchPlaceholder}
        query={query}
        onQueryChange={setQuery}
        hasActive={query.length > 0}
        onReset={() => setQuery('')}
      />
    </div>
  );

  return (
    <ListScaffold toolbar={toolbar}>
      {renderView()}
      {/* Диалоги создания/редактирования справочников. Открываются из primary
          CTA (create) и row-click (edit). Гейт по USE_API + activeSecondaryNav. */}
      {USE_API && (
        <>
          {activeSecondaryNav === 'equipment-categories' && (
            <>
              <CategoryDialog
                open={isCreateOpen}
                onOpenChange={setIsCreateOpen}
              />
              <CategoryDialog
                open={!!editingCategory}
                onOpenChange={(v) => !v && setEditingCategory(null)}
                category={editingCategory}
              />
            </>
          )}
          {activeSecondaryNav === 'equipment-types' && (
            <>
              <TypeDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} />
              <TypeDialog
                open={!!editingType}
                onOpenChange={(v) => !v && setEditingType(null)}
                type={editingType}
              />
            </>
          )}
          {activeSecondaryNav === 'equipment-units' && (
            <>
              <UnitDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} />
              <UnitDialog
                open={!!editingUnit}
                onOpenChange={(v) => !v && setEditingUnit(null)}
                unit={editingUnit}
              />
            </>
          )}
          {activeSecondaryNav === 'subcontractors' && (
            <>
              <SubcontractorDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} />
              <SubcontractorDialog
                open={!!editingSub}
                onOpenChange={(v) => !v && setEditingSub(null)}
                subcontractor={editingSub}
              />
            </>
          )}
        </>
      )}
    </ListScaffold>
  );
}
