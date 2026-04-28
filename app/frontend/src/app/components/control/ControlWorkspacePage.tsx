import { useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  User,
  TrendingUp,
  Clock,
  AlertTriangle,
  CalendarCheck,
  Sparkles,
  ArrowRight,
  History,
} from 'lucide-react';
import { cn } from '../ui/utils';
import { useLayout } from '../shell/layoutStore';
import { getModuleMeta } from '../shell/navConfig';
import { ListScaffold } from '../shell/ListScaffold';
import { SimpleToolbar } from '../shell/SimpleToolbar';
import { EntityListTable, type EntityColumn } from '../shell/EntityListTable';
import {
  DashboardPage,
  CompactPageHeader,
  StatCard,
  WidgetCard,
  InsightList,
  InsightRow,
  EmptyPanelState,
} from '../shell/dashboard';
import { mockLeads } from '../../data/mockLeads';
import {
  AUDIT_EVENTS,
  AUDIT_MODULE_LABEL,
  AUDIT_TONE_CLASS,
  mockAuditLog,
  type AuditEntry,
  type AuditEventKind,
  type AuditModule,
} from '../../data/auditEvents';
import {
  STAGE_BAR,
  STAGE_LABEL_SHORT,
  STAGE_ORDER,
  type PipelineStage,
} from '../../lib/stageTokens';
import { USE_API } from '../../lib/featureFlags';
import {
  useStatsAnalyticsViewQuery,
  useStatsQuery,
  useStatsReportsQuery,
} from '../../hooks/useStatsQuery';
import { useActivitySearchQuery } from '../../hooks/useActivityQuery';
import { type ActivityAction, type ActivityLogEntryApi, type ActivityModule } from '../../lib/activityApi';

export function ControlWorkspacePage() {
  const { activeSecondaryNav } = useLayout();
  if (activeSecondaryNav === 'dashboard') return <ControlDashboardPage />;
  if (activeSecondaryNav === 'reports') return <ReportsCatalogPage />;
  if (activeSecondaryNav === 'audit') return <AuditPage />;
  return <AnalyticsViewPage viewId={activeSecondaryNav} />;
}

/* -------------------------------- Dashboard ------------------------------ */

function ControlDashboardPage() {
  const statsQuery = useStatsQuery(USE_API);
  const isPending = USE_API && statsQuery.isPending && !statsQuery.data;
  const isError = USE_API && statsQuery.isError && !statsQuery.data;

  const counts = useMemo(() => {
    if (USE_API) {
      if (!statsQuery.data) return [];
      const p = statsQuery.data.pipeline;
      const map: Record<PipelineStage, number> = {
        lead: p.lead,
        application: p.application,
        reservation: p.reservation,
        departure: p.departure,
        completed: p.completed,
        unqualified: p.unqualified,
      };
      return STAGE_ORDER.map((s) => ({ stage: s, count: map[s] ?? 0 }));
    }

    return STAGE_ORDER.map((s) => ({
      stage: s,
      count: mockLeads.filter((l) => (l.stage as PipelineStage) === s).length,
    }));
  }, [statsQuery.data]);

  const max = Math.max(...counts.map((c) => c.count), 1);

  const total = USE_API ? statsQuery.data?.pipeline.total : mockLeads.length;
  const active = USE_API
    ? statsQuery.data?.pipeline.active
    : mockLeads.filter((l) => !['completed', 'unqualified'].includes(l.stage)).length;
  const closed = USE_API
    ? statsQuery.data?.pipeline.completed
    : mockLeads.filter((l) => l.stage === 'completed').length;
  const lost = USE_API
    ? statsQuery.data?.pipeline.unqualified
    : mockLeads.filter((l) => l.stage === 'unqualified').length;

  const byManager = useMemo(() => {
    if (USE_API) {
      if (!statsQuery.data?.managers?.length) return [];
      return statsQuery.data.managers
        .map((m) => [
          m.name,
          m.openLeads + m.openApplications + m.activeReservations + m.activeDepartures,
        ] as const)
        .sort((a, b) => b[1] - a[1]);
    }

    const map = new Map<string, number>();
    for (const l of mockLeads) map.set(l.manager, (map.get(l.manager) ?? 0) + 1);
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [statsQuery.data]);
  const managerMax = Math.max(...byManager.map(([, v]) => v), 1);

  return (
    <ListScaffold>
      <DashboardPage>
        <CompactPageHeader title="Дашборд" subtitle="Сводная аналитика модуля «Контроль» · Апрель 2026" />

        {isPending ? (
          <div className="rounded border border-dashed border-border/70 px-3 py-2 text-[12px] text-muted-foreground">
            Загружаем dashboard-аналитику...
          </div>
        ) : isError ? (
          <div className="rounded border border-rose-200 bg-rose-50 px-3 py-2 text-[12px] text-rose-700">
            {statsQuery.error instanceof Error ? statsQuery.error.message : 'Не удалось загрузить dashboard-аналитику.'}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatCard label="Всего в воронке" value={total ?? '—'} icon={<TrendingUp className="h-3.5 w-3.5" />} />
              <StatCard label="Активные" value={active ?? '—'} tone="progress" icon={<Sparkles className="h-3.5 w-3.5" />} />
              <StatCard label="Завершено" value={closed ?? '—'} tone="success" icon={<CalendarCheck className="h-3.5 w-3.5" />} />
              <StatCard label="Потеряно" value={lost ?? '—'} tone="danger" icon={<AlertTriangle className="h-3.5 w-3.5" />} />
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <WidgetCard title="Распределение по этапам" description="Количество записей на каждой стадии">
                {counts.length === 0 ? (
                  <EmptyPanelState title="Нет данных" description="Пайплайн пока пуст" />
                ) : (
                  <div className="flex flex-col gap-2">
                    {counts.map((c) => (
                      <div key={c.stage} className="flex items-center gap-3 text-[12px]">
                        <div className="w-24 shrink-0 text-foreground/80">{STAGE_LABEL_SHORT[c.stage]}</div>
                        <div className="relative flex-1 overflow-hidden rounded bg-muted/60">
                          <div className={cn('h-4 rounded', STAGE_BAR[c.stage])} style={{ width: `${(c.count / max) * 100}%` }} />
                        </div>
                        <div className="w-10 shrink-0 text-right tabular-nums text-foreground">{c.count}</div>
                      </div>
                    ))}
                  </div>
                )}
              </WidgetCard>

              <WidgetCard title="Нагрузка менеджеров" description="Открытых записей на менеджера">
                {byManager.length === 0 ? (
                  <EmptyPanelState title="Нет данных" description="Менеджерские агрегаты пока не доступны" />
                ) : (
                  <div className="flex flex-col gap-2">
                    {byManager.map(([m, v]) => (
                      <div key={m} className="flex items-center gap-3 text-[12px]">
                        <div className="w-32 shrink-0 truncate text-foreground/80">{m}</div>
                        <div className="relative flex-1 overflow-hidden rounded bg-muted/60">
                          <div className="h-4 rounded bg-[#2a6af0]" style={{ width: `${(v / managerMax) * 100}%` }} />
                        </div>
                        <div className="w-10 shrink-0 text-right tabular-nums text-foreground">{v}</div>
                      </div>
                    ))}
                  </div>
                )}
              </WidgetCard>
            </div>
          </>
        )}
      </DashboardPage>
    </ListScaffold>
  );
}

/* --------------------------------- Reports ------------------------------- */

interface ReportRow {
  id: string;
  name: string;
  category: 'Продажи' | 'Операции' | 'Контроль' | 'Импорт';
  period: string;
  owner: string;
  value: string;
  targetModule: 'dashboard' | 'audit' | 'imports';
}

const REPORTS_FALLBACK: ReportRow[] = [
  {
    id: 'R-001',
    name: 'Активные записи в воронке',
    category: 'Продажи',
    period: 'Сейчас',
    owner: 'Система',
    value: '—',
    targetModule: 'dashboard',
  },
  {
    id: 'R-002',
    name: 'Конверсия lead → application',
    category: 'Продажи',
    period: '30 дней',
    owner: 'Система',
    value: '—',
    targetModule: 'dashboard',
  },
  {
    id: 'R-003',
    name: 'Конфликты бронирований',
    category: 'Операции',
    period: '30 дней',
    owner: 'Система',
    value: '—',
    targetModule: 'dashboard',
  },
  {
    id: 'R-004',
    name: 'События аудита',
    category: 'Контроль',
    period: '30 дней',
    owner: 'Система',
    value: '—',
    targetModule: 'audit',
  },
  {
    id: 'R-005',
    name: 'Импортированные записи',
    category: 'Импорт',
    period: '30 дней',
    owner: 'Система',
    value: '—',
    targetModule: 'imports',
  },
];

type ReportsPeriod = '7d' | '30d';

function ReportsCatalogPage() {
  const { setActivePrimaryNav, setActiveSecondaryNav } = useLayout();
  const meta = getModuleMeta('reports');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [period, setPeriod] = useState<ReportsPeriod>('30d');

  const periodDays: 7 | 30 = period === '7d' ? 7 : 30;
  const reportsQuery = useStatsReportsQuery(periodDays, USE_API);

  const reports = useMemo<ReportRow[]>(() => {
    if (!USE_API) return REPORTS_FALLBACK;
    return reportsQuery.data?.items ?? [];
  }, [reportsQuery.data]);

  const categories = Array.from(new Set(reports.map((r) => r.category)));
  const filtered = reports.filter((r) => {
    if (category !== 'all' && r.category !== category) return false;
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return `${r.id} ${r.name} ${r.category} ${r.owner} ${r.value}`.toLowerCase().includes(q);
  });

  const columns: EntityColumn<ReportRow>[] = [
    { id: 'id', header: 'Код', width: '90px', render: (r) => <span className="font-mono text-[10px] text-muted-foreground">{r.id}</span> },
    {
      id: 'name',
      header: 'Отчёт',
      render: (r) => (
        <div className="flex items-center gap-1.5 text-foreground">
          <BarChart3 className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="truncate font-medium">{r.name}</span>
        </div>
      ),
    },
    { id: 'category', header: 'Категория', width: '140px', render: (r) => <span className="text-foreground/80">{r.category}</span> },
    {
      id: 'value',
      header: 'Значение',
      width: '130px',
      render: (r) => <span className="font-mono text-[11px] text-foreground">{r.value}</span>,
    },
    { id: 'period', header: 'Период', width: '140px', render: (r) => <span className="text-muted-foreground tabular-nums">{r.period}</span> },
    { id: 'owner', header: 'Ответственный', width: '160px', render: (r) => <span className="text-foreground/80">{r.owner}</span> },
  ];

  const openReport = (row: ReportRow) => {
    if (row.targetModule === 'imports') {
      setActivePrimaryNav('admin');
      setActiveSecondaryNav('imports');
      return;
    }
    setActivePrimaryNav('control');
    setActiveSecondaryNav(row.targetModule);
  };

  const toolbar = (
    <SimpleToolbar
      searchPlaceholder={meta.searchPlaceholder}
      query={query}
      onQueryChange={setQuery}
      filters={[
        {
          id: 'category',
          value: category,
          placeholder: 'Категория',
          width: 160,
          options: [
            { value: 'all', label: 'Все категории' },
            ...categories.map((c) => ({ value: c, label: c })),
          ],
          onChange: setCategory,
        },
        {
          id: 'period',
          value: period,
          placeholder: 'Период',
          width: 130,
          options: [
            { value: '7d', label: '7 дней' },
            { value: '30d', label: '30 дней' },
          ],
          onChange: (value) => setPeriod(value as ReportsPeriod),
        },
      ]}
      hasActive={query.length > 0 || category !== 'all' || period !== '30d'}
      onReset={() => {
        setQuery('');
        setCategory('all');
        setPeriod('30d');
      }}
    />
  );

  return (
    <ListScaffold toolbar={toolbar}>
      {USE_API && reportsQuery.isPending && !reportsQuery.data ? (
        <div className="flex flex-1 items-center justify-center p-10 text-[13px] text-muted-foreground">
          Загружаем KPI отчёты...
        </div>
      ) : null}

      {USE_API && reportsQuery.isError && !reportsQuery.data ? (
        <div className="flex flex-1 items-center justify-center p-10 text-[13px] text-muted-foreground">
          {reportsQuery.error instanceof Error ? reportsQuery.error.message : 'Не удалось загрузить отчёты.'}
        </div>
      ) : null}

      {USE_API && (reportsQuery.isPending || reportsQuery.isError) && !reportsQuery.data
        ? null
        : <EntityListTable rows={filtered} columns={columns} minWidth={860} onRowClick={openReport} />}
    </ListScaffold>
  );
}

/* --------------------------------- Audit -------------------------------- */

type AuditPeriod = 'all' | 'today' | '7d' | '30d';

function withinPeriod(at: string, period: AuditPeriod): boolean {
  if (period === 'all') return true;
  const d = new Date(at.replace(' ', 'T'));
  const diffMs = Date.now() - d.getTime();
  const day = 24 * 60 * 60 * 1000;
  if (period === 'today') return diffMs < day;
  if (period === '7d') return diffMs < 7 * day;
  if (period === '30d') return diffMs < 30 * day;
  return true;
}

function periodToFromIso(period: AuditPeriod): string | undefined {
  if (period === 'all') return undefined;
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  if (period === 'today') return new Date(now - day).toISOString();
  if (period === '7d') return new Date(now - 7 * day).toISOString();
  if (period === '30d') return new Date(now - 30 * day).toISOString();
  return undefined;
}

function kindToActivityAction(kind: 'all' | AuditEventKind): ActivityAction | undefined {
  if (kind === 'all') return undefined;
  if (kind.endsWith('_created')) return 'created';
  if (kind === 'lead_converted') return 'stage_changed';
  if (kind === 'departure_completed') return 'completed';
  return undefined;
}

function kindToEntityType(kind: 'all' | AuditEventKind): string | undefined {
  if (kind === 'all') return undefined;
  if (kind.startsWith('lead_')) return 'lead';
  if (kind.startsWith('reservation_')) return 'reservation';
  if (kind.startsWith('departure_')) return 'departure';
  if (kind.startsWith('completion_')) return 'completion';
  if (kind.startsWith('user_')) return 'user';
  if (kind === 'permissions_changed') return 'permissions';
  return undefined;
}

function auditKindByEntry(entry: ActivityLogEntryApi): AuditEventKind {
  const { action, entityType, summary } = entry;
  if (entityType === 'lead') {
    if (action === 'created') return 'lead_created';
    if (action === 'stage_changed' && summary.toLowerCase().includes('application')) return 'lead_converted';
    return 'lead_updated';
  }
  if (entityType === 'application' || entityType === 'application_item') {
    return action === 'created' ? 'application_created' : 'application_updated';
  }
  if (entityType === 'reservation') {
    if (action === 'created') return 'reservation_created';
    if (summary.toLowerCase().includes('снят') || summary.toLowerCase().includes('release')) return 'reservation_released';
    return 'reservation_confirmed';
  }
  if (entityType === 'departure') {
    return action === 'completed' ? 'departure_completed' : 'departure_started';
  }
  if (entityType === 'completion') {
    return 'completion_signed';
  }
  if (entityType === 'user') {
    return action === 'created' ? 'user_created' : 'user_updated';
  }
  if (entityType === 'permissions') {
    return 'permissions_changed';
  }
  return 'lead_updated';
}

function formatAuditTarget(entityType: string, entityId: string): string {
  const suffix = entityId.slice(-6).toUpperCase();
  if (entityType === 'lead') return `LEAD-${suffix}`;
  if (entityType === 'application' || entityType === 'application_item') return `APP-${suffix}`;
  if (entityType === 'reservation') return `RSV-${suffix}`;
  if (entityType === 'departure') return `DEP-${suffix}`;
  if (entityType === 'completion') return `CMP-${suffix}`;
  if (entityType === 'client') return `CL-${suffix}`;
  return `${entityType}:${suffix}`;
}

function mapActivityToAuditEntry(entry: ActivityLogEntryApi): AuditEntry {
  const d = new Date(entry.createdAt);
  const pad = (n: number) => String(n).padStart(2, '0');
  const at = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  return {
    id: entry.id,
    at,
    actor: entry.actor?.fullName ?? 'Система',
    kind: auditKindByEntry(entry),
    target: formatAuditTarget(entry.entityType, entry.entityId),
    detail: entry.summary,
  };
}

function AuditPage() {
  const { currentView } = useLayout();
  const meta = getModuleMeta('audit');
  const view: 'table' | 'feed' = currentView === 'feed' ? 'feed' : 'table';

  const [query, setQuery] = useState('');
  const [actor, setActor] = useState('all');
  const [kind, setKind] = useState<'all' | AuditEventKind>('all');
  const [mod, setMod] = useState<'all' | AuditModule>('all');
  const [period, setPeriod] = useState<AuditPeriod>('all');

  const fromIso = useMemo(() => periodToFromIso(period), [period]);
  const moduleFilter: ActivityModule | undefined =
    mod !== 'all'
      ? (mod as ActivityModule)
      : kind !== 'all'
        ? (AUDIT_EVENTS[kind].module as ActivityModule)
        : undefined;

  const auditQuery = useActivitySearchQuery(
    {
      take: 300,
      query: query.trim() || undefined,
      actorId: actor !== 'all' && USE_API ? actor : undefined,
      module: USE_API ? moduleFilter : undefined,
      action: USE_API ? kindToActivityAction(kind) : undefined,
      entityType: USE_API ? kindToEntityType(kind) : undefined,
      from: USE_API ? fromIso : undefined,
    },
    USE_API,
  );

  useEffect(() => {
    // Reset kind if it doesn't match currently selected module
    if (mod !== 'all' && kind !== 'all' && AUDIT_EVENTS[kind].module !== mod) {
      setKind('all');
    }
  }, [mod, kind]);

  const apiRows = useMemo(
    () => (auditQuery.data?.items ?? []).map(mapActivityToAuditEntry),
    [auditQuery.data],
  );

  const actorOptions = useMemo(() => {
    if (USE_API) {
      const map = new Map<string, string>();
      for (const e of auditQuery.data?.items ?? []) {
        if (e.actor?.id && e.actor.fullName) {
          map.set(e.actor.id, e.actor.fullName);
        }
      }
      return Array.from(map.entries()).map(([value, label]) => ({ value, label }));
    }
    return Array.from(new Set(mockAuditLog.map((e) => e.actor))).map((name) => ({
      value: name,
      label: name,
    }));
  }, [auditQuery.data]);

  const kindOptions = (Object.entries(AUDIT_EVENTS) as [AuditEventKind, (typeof AUDIT_EVENTS)[AuditEventKind]][])
    .filter(([, meta]) => mod === 'all' || meta.module === mod)
    .map(([k, m]) => ({ value: k, label: m.label }));

  const filtered = useMemo(() => {
    const source = USE_API ? apiRows : mockAuditLog;
    return source.filter((e) => {
      if (kind !== 'all' && e.kind !== kind) return false;

      if (!USE_API) {
        if (actor !== 'all' && e.actor !== actor) return false;
        if (mod !== 'all' && AUDIT_EVENTS[e.kind].module !== mod) return false;
        if (!withinPeriod(e.at, period)) return false;
        const q = query.trim().toLowerCase();
        if (q) {
          const label = AUDIT_EVENTS[e.kind].label;
          return `${e.target} ${label} ${e.actor} ${e.detail ?? ''}`.toLowerCase().includes(q);
        }
      }

      return true;
    });
  }, [apiRows, kind, actor, mod, period, query]);

  const hasActive = query.length > 0 || actor !== 'all' || kind !== 'all' || mod !== 'all' || period !== 'all';

  const toolbar = (
    <SimpleToolbar
      searchPlaceholder={meta.searchPlaceholder}
      query={query}
      onQueryChange={setQuery}
      filters={[
        {
          id: 'period',
          value: period,
          placeholder: 'Период',
          width: 130,
          options: [
            { value: 'all', label: 'Всё время' },
            { value: 'today', label: 'Сегодня' },
            { value: '7d', label: 'За 7 дней' },
            { value: '30d', label: 'За 30 дней' },
          ],
          onChange: (v) => setPeriod(v as AuditPeriod),
        },
        {
          id: 'module',
          value: mod,
          placeholder: 'Модуль',
          width: 140,
          options: [
            { value: 'all', label: 'Все модули' },
            { value: 'sales', label: AUDIT_MODULE_LABEL.sales },
            { value: 'ops', label: AUDIT_MODULE_LABEL.ops },
            { value: 'admin', label: AUDIT_MODULE_LABEL.admin },
          ],
          onChange: (v) => setMod(v as 'all' | AuditModule),
        },
        {
          id: 'kind',
          value: kind,
          placeholder: 'Тип события',
          width: 200,
          options: [{ value: 'all', label: 'Все типы' }, ...kindOptions],
          onChange: (v) => setKind(v as 'all' | AuditEventKind),
        },
        {
          id: 'actor',
          value: actor,
          placeholder: 'Автор',
          width: 140,
          options: [{ value: 'all', label: 'Все авторы' }, ...actorOptions],
          onChange: setActor,
        },
      ]}
      hasActive={hasActive}
      onReset={() => {
        setQuery('');
        setActor('all');
        setKind('all');
        setMod('all');
        setPeriod('all');
      }}
    />
  );

  return (
    <ListScaffold toolbar={toolbar}>
      {USE_API && auditQuery.isPending && !auditQuery.data ? (
        <div className="flex flex-1 items-center justify-center p-10 text-[13px] text-muted-foreground">
          Загружаем события...
        </div>
      ) : null}

      {USE_API && auditQuery.isError && !auditQuery.data ? (
        <div className="flex flex-1 items-center justify-center p-10 text-[13px] text-muted-foreground">
          {auditQuery.error instanceof Error ? auditQuery.error.message : 'Не удалось загрузить события'}
        </div>
      ) : null}

      {USE_API && (auditQuery.isPending || auditQuery.isError) && !auditQuery.data
        ? null
        : view === 'table'
          ? <AuditTable rows={filtered} />
          : <AuditFeed rows={filtered} />}
    </ListScaffold>
  );
}

function EventPill({ kind }: { kind: AuditEventKind }) {
  const m = AUDIT_EVENTS[kind];
  return (
    <span
      title={kind}
      className={cn(
        'inline-flex rounded border px-1.5 py-0 text-[10px] leading-4',
        AUDIT_TONE_CLASS[m.tone],
      )}
    >
      {m.label}
    </span>
  );
}

function AuditTable({ rows }: { rows: AuditEntry[] }) {
  return (
    <div className="min-h-0 flex-1 overflow-auto">
      <table className="w-full min-w-[960px] border-collapse text-[12px]">
        <thead className="sticky top-0 z-10 bg-white">
          <tr className="border-b border-gray-100 text-[11px] uppercase tracking-wide text-muted-foreground">
            <th className="px-4 py-2 text-left font-medium">Время</th>
            <th className="px-3 py-2 text-left font-medium">Автор</th>
            <th className="px-3 py-2 text-left font-medium">Модуль</th>
            <th className="px-3 py-2 text-left font-medium">Событие</th>
            <th className="px-3 py-2 text-left font-medium">Объект</th>
            <th className="px-3 py-2 text-left font-medium">Комментарий</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                Событий не найдено
              </td>
            </tr>
          ) : (
            rows.map((e) => (
              <tr key={e.id} className="group border-b border-gray-100 hover:bg-gray-50 active:bg-gray-100">
                <td className="px-4 py-2 font-mono text-[11px] text-muted-foreground">{e.at}</td>
                <td className="px-3 py-2 text-foreground/80">
                  <div className="flex items-center gap-1.5">
                    <User className="h-3 w-3 text-muted-foreground" />
                    {e.actor}
                  </div>
                </td>
                <td className="px-3 py-2 text-muted-foreground">{AUDIT_MODULE_LABEL[AUDIT_EVENTS[e.kind].module]}</td>
                <td className="px-3 py-2">
                  <div className="flex flex-col gap-0.5">
                    <EventPill kind={e.kind} />
                    <span className="font-mono text-[10px] text-muted-foreground/70">{e.kind}</span>
                  </div>
                </td>
                <td className="px-3 py-2 font-mono text-[11px] text-[#2a6af0]">{e.target}</td>
                <td className="px-3 py-2 text-foreground/80">{e.detail ?? '—'}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function AuditFeed({ rows }: { rows: AuditEntry[] }) {
  return (
    <DashboardPage>
      <CompactPageHeader title="Журнал событий" subtitle="Лента действий пользователей по системе" />
      <WidgetCard bodyPadded={false}>
        {rows.length === 0 ? (
          <EmptyPanelState
            icon={<History className="h-6 w-6" />}
            title="Событий не найдено"
            description="Попробуйте сбросить фильтры"
          />
        ) : (
          <InsightList>
            {rows.map((e) => {
              const m = AUDIT_EVENTS[e.kind];
              return (
                <InsightRow
                  key={e.id}
                  leading={<History className="h-3.5 w-3.5" />}
                  primary={
                    <span>
                      <span className="font-medium text-foreground">{e.actor}</span>
                      <span className="ml-1 text-foreground/80">{m.label.toLowerCase()}</span>
                      <span className="ml-1 font-mono text-[11px] text-[#2a6af0]">{e.target}</span>
                    </span>
                  }
                  secondary={e.detail ?? AUDIT_MODULE_LABEL[m.module]}
                  trailing={e.at}
                />
              );
            })}
          </InsightList>
        )}
      </WidgetCard>
    </DashboardPage>
  );
}

/* ----------------------------- Analytics view --------------------------- */

function AnalyticsViewPage({ viewId }: { viewId: string }) {
  const VIEW_META: Record<
    string,
    { title: string; subtitle: string; icon: React.ReactNode; tone: 'progress' | 'warning' | 'danger' | 'default' }
  > = {
    'view-stale-leads': {
      title: 'Зависшие лиды',
      subtitle: 'Лиды без активности более 3 дней',
      icon: <Clock className="h-3.5 w-3.5" />,
      tone: 'warning',
    },
    'view-lost-leads': {
      title: 'Потерянные лиды',
      subtitle: 'Переведены в статус «Не квалиф.»',
      icon: <AlertTriangle className="h-3.5 w-3.5" />,
      tone: 'danger',
    },
    'view-active-reservations': {
      title: 'Активные брони',
      subtitle: 'Брони в статусе «активна»',
      icon: <CalendarCheck className="h-3.5 w-3.5" />,
      tone: 'progress',
    },
    'view-manager-load': {
      title: 'Нагрузка менеджеров',
      subtitle: 'Распределение открытых записей по ответственным',
      icon: <Sparkles className="h-3.5 w-3.5" />,
      tone: 'default',
    },
  };
  const cfg = VIEW_META[viewId] ?? {
    title: 'Аналитика',
    subtitle: '',
    icon: <TrendingUp className="h-3.5 w-3.5" />,
    tone: 'default' as const,
  };

  const safeViewId = (
    viewId === 'view-stale-leads'
    || viewId === 'view-lost-leads'
    || viewId === 'view-active-reservations'
    || viewId === 'view-manager-load'
      ? viewId
      : 'view-stale-leads'
  );

  const analyticsQuery = useStatsAnalyticsViewQuery(safeViewId, 6, USE_API);
  const isPending = USE_API && analyticsQuery.isPending && !analyticsQuery.data;
  const isError = USE_API && analyticsQuery.isError && !analyticsQuery.data;

  const errorMessage = analyticsQuery.error instanceof Error
    ? analyticsQuery.error.message
    : 'Не удалось загрузить аналитику.';

  const apiRows = useMemo(() => {
    if (!USE_API) return [] as Array<{
      id: string;
      stage: string;
      manager: string;
      company: string | null;
      client: string;
      equipmentType: string;
      isUrgent: boolean;
      isStale: boolean;
      hasConflict: boolean;
      lastActivity: string;
    }>;

    return (analyticsQuery.data?.samples ?? []).map((l) => {
      const at = new Date(l.lastActivityAt);
      const lastActivity = Number.isFinite(at.getTime())
        ? at.toLocaleString('ru-RU', {
          day: '2-digit',
          month: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        })
        : l.lastActivityAt;

      return {
        id: l.id,
        stage: l.stage,
        manager: l.manager,
        company: l.company,
        client: l.client,
        equipmentType: l.equipmentType,
        isUrgent: l.isUrgent,
        isStale: l.isStale,
        hasConflict: l.hasConflict,
        lastActivity,
      };
    });
  }, [analyticsQuery.data]);

  const subset = useMemo(() => {
    if (USE_API) {
      return apiRows;
    }

    if (viewId === 'view-stale-leads') return mockLeads.filter((l) => l.isStale);
    if (viewId === 'view-lost-leads') return mockLeads.filter((l) => l.stage === 'unqualified');
    if (viewId === 'view-active-reservations') return mockLeads.filter((l) => l.stage === 'reservation');
    return mockLeads;
  }, [apiRows, viewId]);

  const byManager = useMemo(() => {
    const map = new Map<string, number>();
    for (const l of subset) map.set(l.manager, (map.get(l.manager) ?? 0) + 1);
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [subset]);

  const managerRows = useMemo(() => {
    if (USE_API) {
      return (analyticsQuery.data?.managers ?? []).map((m) => [m.name, m.count] as const);
    }
    return byManager;
  }, [analyticsQuery.data, byManager]);

  const max = Math.max(...managerRows.map(([, v]) => v), 1);

  const total = USE_API
    ? (analyticsQuery.data?.summary.total ?? subset.length)
    : subset.length;

  const managersTotal = USE_API
    ? (analyticsQuery.data?.summary.managers ?? managerRows.length)
    : managerRows.length;

  const urgent = USE_API
    ? (analyticsQuery.data?.summary.urgent ?? subset.filter((l) => l.isUrgent).length)
    : subset.filter((l) => l.isUrgent).length;

  const conflicts = USE_API
    ? (analyticsQuery.data?.summary.conflicts ?? 0)
    : subset.filter((l) => l.hasConflict).length;

  return (
    <ListScaffold>
      <DashboardPage>
        <CompactPageHeader title={cfg.title} subtitle={cfg.subtitle} icon={cfg.icon} />

        {isPending ? (
          <div className="rounded border border-dashed border-border/70 px-3 py-2 text-[12px] text-muted-foreground">
            Загружаем аналитику...
          </div>
        ) : isError ? (
          <div className="rounded border border-rose-200 bg-rose-50 px-3 py-2 text-[12px] text-rose-700">
            {errorMessage}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatCard label="Всего" value={total} tone={cfg.tone} icon={cfg.icon} />
              <StatCard label="Менеджеров" value={managersTotal} tone="default" icon={<User className="h-3.5 w-3.5" />} />
              <StatCard
                label="Срочные"
                value={urgent}
                tone="danger"
                icon={<AlertTriangle className="h-3.5 w-3.5" />}
              />
              <StatCard
                label="С конфликтом"
                value={conflicts}
                tone="warning"
                icon={<AlertTriangle className="h-3.5 w-3.5" />}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
              <WidgetCard className="lg:col-span-3" title="По менеджерам" description="Количество записей у каждого ответственного">
                {managerRows.length === 0 ? (
                  <EmptyPanelState
                    icon={<Sparkles className="h-6 w-6" />}
                    title="Нет данных"
                    description="В этом представлении нет записей"
                  />
                ) : (
                  <div className="flex flex-col gap-2">
                    {managerRows.map(([m, v]) => (
                      <div key={m} className="flex items-center gap-3 text-[12px]">
                        <div className="w-32 shrink-0 truncate text-foreground/80">{m}</div>
                        <div className="relative flex-1 overflow-hidden rounded bg-muted/60">
                          <div className="h-4 rounded bg-[#2a6af0]" style={{ width: `${(v / max) * 100}%` }} />
                        </div>
                        <div className="w-8 shrink-0 text-right tabular-nums text-foreground">{v}</div>
                      </div>
                    ))}
                  </div>
                )}
              </WidgetCard>

              <WidgetCard className="lg:col-span-2" title="Примеры записей" description="Первые 6 из представления" bodyPadded={false}>
                {subset.length === 0 ? (
                  <EmptyPanelState title="Нет записей" />
                ) : (
                  <InsightList>
                    {subset.slice(0, 6).map((l) => (
                      <InsightRow
                        key={l.id}
                        leading={<ArrowRight className="h-3.5 w-3.5" />}
                        primary={l.company ?? l.client}
                        secondary={`${l.equipmentType} · ${l.manager}`}
                        trailing={l.lastActivity}
                        interactive
                      />
                    ))}
                  </InsightList>
                )}
              </WidgetCard>
            </div>
          </>
        )}
      </DashboardPage>
    </ListScaffold>
  );
}
