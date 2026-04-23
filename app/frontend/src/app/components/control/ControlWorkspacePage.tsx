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

export function ControlWorkspacePage() {
  const { activeSecondaryNav } = useLayout();
  if (activeSecondaryNav === 'dashboard') return <ControlDashboardPage />;
  if (activeSecondaryNav === 'reports') return <ReportsCatalogPage />;
  if (activeSecondaryNav === 'audit') return <AuditPage />;
  return <AnalyticsViewPage viewId={activeSecondaryNav} />;
}

/* -------------------------------- Dashboard ------------------------------ */

function ControlDashboardPage() {
  const counts = STAGE_ORDER.map((s) => ({
    stage: s,
    count: mockLeads.filter((l) => (l.stage as PipelineStage) === s).length,
  }));
  const max = Math.max(...counts.map((c) => c.count), 1);

  const total = mockLeads.length;
  const active = mockLeads.filter((l) => !['completed', 'unqualified'].includes(l.stage)).length;
  const closed = mockLeads.filter((l) => l.stage === 'completed').length;
  const lost = mockLeads.filter((l) => l.stage === 'unqualified').length;

  const byManager = useMemo(() => {
    const map = new Map<string, number>();
    for (const l of mockLeads) map.set(l.manager, (map.get(l.manager) ?? 0) + 1);
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, []);
  const managerMax = Math.max(...byManager.map(([, v]) => v), 1);

  return (
    <ListScaffold>
      <DashboardPage>
        <CompactPageHeader title="Дашборд" subtitle="Сводная аналитика модуля «Контроль» · Апрель 2026" />

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Всего в воронке" value={total} icon={<TrendingUp className="h-3.5 w-3.5" />} />
          <StatCard label="Активные" value={active} tone="progress" icon={<Sparkles className="h-3.5 w-3.5" />} />
          <StatCard label="Завершено" value={closed} tone="success" icon={<CalendarCheck className="h-3.5 w-3.5" />} />
          <StatCard label="Потеряно" value={lost} tone="danger" icon={<AlertTriangle className="h-3.5 w-3.5" />} />
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <WidgetCard title="Распределение по этапам" description="Количество записей на каждой стадии">
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
          </WidgetCard>

          <WidgetCard title="Нагрузка менеджеров" description="Открытых записей на менеджера">
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
          </WidgetCard>
        </div>
      </DashboardPage>
    </ListScaffold>
  );
}

/* --------------------------------- Reports ------------------------------- */

interface ReportRow {
  id: string;
  name: string;
  category: 'Продажи' | 'Операции' | 'Финансы';
  period: string;
  owner: string;
}

const REPORTS: ReportRow[] = [
  { id: 'R-001', name: 'Воронка продаж', category: 'Продажи', period: 'Апрель 2026', owner: 'Иванова С.' },
  { id: 'R-002', name: 'Нагрузка менеджеров', category: 'Продажи', period: 'Апрель 2026', owner: 'Иванова С.' },
  { id: 'R-003', name: 'Загрузка парка', category: 'Операции', period: 'Апрель 2026', owner: 'Петров А.' },
  { id: 'R-004', name: 'Конверсия по источникам', category: 'Продажи', period: 'Март 2026', owner: 'Иванова С.' },
  { id: 'R-005', name: 'Выполнение выездов', category: 'Операции', period: 'Апрель 2026', owner: 'Петров А.' },
  { id: 'R-006', name: 'Завершённые сделки', category: 'Финансы', period: 'Апрель 2026', owner: 'Admin' },
];

function ReportsCatalogPage() {
  const meta = getModuleMeta('reports');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');

  const categories = Array.from(new Set(REPORTS.map((r) => r.category)));
  const filtered = REPORTS.filter((r) => {
    if (category !== 'all' && r.category !== category) return false;
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return `${r.id} ${r.name} ${r.category} ${r.owner}`.toLowerCase().includes(q);
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
    { id: 'period', header: 'Период', width: '140px', render: (r) => <span className="text-muted-foreground tabular-nums">{r.period}</span> },
    { id: 'owner', header: 'Ответственный', width: '160px', render: (r) => <span className="text-foreground/80">{r.owner}</span> },
  ];

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
      ]}
      hasActive={query.length > 0 || category !== 'all'}
      onReset={() => {
        setQuery('');
        setCategory('all');
      }}
    />
  );

  return (
    <ListScaffold toolbar={toolbar}>
      <EntityListTable rows={filtered} columns={columns} minWidth={780} onRowClick={() => {}} />
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

function AuditPage() {
  const { currentView } = useLayout();
  const meta = getModuleMeta('audit');
  const view: 'table' | 'feed' = currentView === 'feed' ? 'feed' : 'table';

  const [query, setQuery] = useState('');
  const [actor, setActor] = useState('all');
  const [kind, setKind] = useState<'all' | AuditEventKind>('all');
  const [mod, setMod] = useState<'all' | AuditModule>('all');
  const [period, setPeriod] = useState<AuditPeriod>('all');

  useEffect(() => {
    // Reset kind if it doesn't match currently selected module
    if (mod !== 'all' && kind !== 'all' && AUDIT_EVENTS[kind].module !== mod) {
      setKind('all');
    }
  }, [mod, kind]);

  const actors = Array.from(new Set(mockAuditLog.map((e) => e.actor)));
  const kindOptions = (Object.entries(AUDIT_EVENTS) as [AuditEventKind, (typeof AUDIT_EVENTS)[AuditEventKind]][])
    .filter(([, meta]) => mod === 'all' || meta.module === mod)
    .map(([k, m]) => ({ value: k, label: m.label }));

  const filtered = mockAuditLog.filter((e) => {
    if (actor !== 'all' && e.actor !== actor) return false;
    if (kind !== 'all' && e.kind !== kind) return false;
    if (mod !== 'all' && AUDIT_EVENTS[e.kind].module !== mod) return false;
    if (!withinPeriod(e.at, period)) return false;
    const q = query.trim().toLowerCase();
    if (!q) return true;
    const label = AUDIT_EVENTS[e.kind].label;
    return `${e.target} ${label} ${e.actor} ${e.detail ?? ''}`.toLowerCase().includes(q);
  });

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
          options: [{ value: 'all', label: 'Все авторы' }, ...actors.map((a) => ({ value: a, label: a }))],
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
      {view === 'table' ? <AuditTable rows={filtered} /> : <AuditFeed rows={filtered} />}
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

  const subset = useMemo(() => {
    if (viewId === 'view-stale-leads') return mockLeads.filter((l) => l.isStale);
    if (viewId === 'view-lost-leads') return mockLeads.filter((l) => l.stage === 'unqualified');
    if (viewId === 'view-active-reservations') return mockLeads.filter((l) => l.stage === 'reservation');
    return mockLeads;
  }, [viewId]);

  const byManager = useMemo(() => {
    const map = new Map<string, number>();
    for (const l of subset) map.set(l.manager, (map.get(l.manager) ?? 0) + 1);
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [subset]);
  const max = Math.max(...byManager.map(([, v]) => v), 1);

  return (
    <ListScaffold>
      <DashboardPage>
        <CompactPageHeader title={cfg.title} subtitle={cfg.subtitle} icon={cfg.icon} />

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Всего" value={subset.length} tone={cfg.tone} icon={cfg.icon} />
          <StatCard label="Менеджеров" value={byManager.length} tone="default" icon={<User className="h-3.5 w-3.5" />} />
          <StatCard
            label="Срочные"
            value={subset.filter((l) => l.isUrgent).length}
            tone="danger"
            icon={<AlertTriangle className="h-3.5 w-3.5" />}
          />
          <StatCard
            label="С конфликтом"
            value={subset.filter((l) => l.hasConflict).length}
            tone="warning"
            icon={<AlertTriangle className="h-3.5 w-3.5" />}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
          <WidgetCard className="lg:col-span-3" title="По менеджерам" description="Количество записей у каждого ответственного">
            {byManager.length === 0 ? (
              <EmptyPanelState
                icon={<Sparkles className="h-6 w-6" />}
                title="Нет данных"
                description="В этом представлении нет записей"
              />
            ) : (
              <div className="flex flex-col gap-2">
                {byManager.map(([m, v]) => (
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
      </DashboardPage>
    </ListScaffold>
  );
}
