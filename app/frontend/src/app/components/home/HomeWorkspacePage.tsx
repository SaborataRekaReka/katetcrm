import { useMemo, useState } from 'react';
import {
  TrendingUp,
  Flame,
  Activity,
  Rocket,
  CheckSquare,
  CalendarClock,
  AlertTriangle,
  Users,
  FileText,
  Truck,
  Sparkles,
  PlusCircle,
  ArrowRight,
  Settings,
  History,
  MessageSquare,
  Paperclip,
} from 'lucide-react';
import { useLayout } from '../shell/layoutStore';
import { ListScaffold } from '../shell/ListScaffold';
import {
  DashboardPage,
  CompactPageHeader,
  StatCard,
  WidgetCard,
  InsightList,
  InsightRow,
  QuickLinkTile,
} from '../shell/dashboard';
import {
  GroupedListPage,
  ListGroupHeader,
  ListGroup,
  TaskListRow,
  PriorityRow,
  ActivityFeedRow,
} from '../shell/list';
import { mockLeads } from '../../data/mockLeads';
import { mockTasks, groupTasksByDue, Task, TaskDomain } from '../../data/mockTasks';
import { TaskDetailView } from '../detail/TaskDetailView';
import { Button } from '../ui/button';

export function HomeWorkspacePage() {
  const { activeSecondaryNav } = useLayout();

  return (
    <ListScaffold>
      {activeSecondaryNav === 'my-tasks' ? (
        <MyTasksPage />
      ) : activeSecondaryNav === 'urgent-today' ? (
        <UrgentTodayPage />
      ) : activeSecondaryNav === 'recent-activity' ? (
        <RecentActivityPage />
      ) : activeSecondaryNav === 'quick-links' ? (
        <QuickLinksPage />
      ) : (
        <OverviewPage />
      )}
    </ListScaffold>
  );
}

/* ------------------------------- Overview ------------------------------- */

function OverviewPage() {
  const { setActivePrimaryNav, setActiveSecondaryNav } = useLayout();

  const stats = useMemo(() => {
    const byStage = (s: string) => mockLeads.filter((l) => l.stage === s).length;
    return {
      leads: byStage('lead'),
      applications: byStage('application'),
      reservations: byStage('reservation'),
      departures: byStage('departure'),
      completed: byStage('completed'),
      urgent: mockLeads.filter((l) => l.isUrgent).length,
      conflicts: mockLeads.filter((l) => l.hasConflict).length,
      today: mockLeads.filter((l) => l.departureStatus === 'today').length,
      stale: mockLeads.filter((l) => l.isStale).length,
    };
  }, []);

  const go = (primary: string, secondary: string) => {
    setActivePrimaryNav(primary);
    setActiveSecondaryNav(secondary);
  };

  return (
    <DashboardPage>
      <CompactPageHeader
        title="Обзор"
        subtitle="Ключевые цифры по воронке и сегодняшние приоритеты"
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard icon={<TrendingUp className="h-3.5 w-3.5" />} label="Лиды" value={stats.leads} tone="progress" onClick={() => go('sales', 'leads')} />
        <StatCard icon={<FileText className="h-3.5 w-3.5" />} label="Заявки" value={stats.applications} tone="progress" onClick={() => go('sales', 'applications')} />
        <StatCard icon={<CalendarClock className="h-3.5 w-3.5" />} label="Брони" value={stats.reservations} tone="progress" onClick={() => go('ops', 'reservations')} />
        <StatCard icon={<Truck className="h-3.5 w-3.5" />} label="Выезды" value={stats.departures} tone="progress" onClick={() => go('ops', 'departures')} />
        <StatCard icon={<CheckSquare className="h-3.5 w-3.5" />} label="Завершено" value={stats.completed} tone="success" onClick={() => go('ops', 'completion')} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <WidgetCard
          title="Требует внимания"
          icon={<Flame className="h-3.5 w-3.5 text-rose-500" />}
          bodyPadded={false}
          className="lg:col-span-1"
        >
          <InsightList>
            <InsightRow
              leading={<AlertTriangle className="h-3.5 w-3.5 text-rose-500" />}
              primary="Срочные лиды"
              secondary="Требуют контакта сегодня"
              trailing={<span className="tabular-nums text-rose-600">{stats.urgent}</span>}
              onClick={() => go('sales', 'view-urgent')}
            />
            <InsightRow
              leading={<AlertTriangle className="h-3.5 w-3.5 text-amber-500" />}
              primary="Конфликты броней"
              secondary="Пересечения по датам"
              trailing={<span className="tabular-nums text-amber-600">{stats.conflicts}</span>}
              onClick={() => go('ops', 'view-conflict')}
            />
            <InsightRow
              leading={<Truck className="h-3.5 w-3.5 text-sky-500" />}
              primary="Выезды сегодня"
              secondary="Должны стартовать"
              trailing={<span className="tabular-nums text-[#2a6af0]">{stats.today}</span>}
              onClick={() => go('ops', 'view-departures-today')}
            />
            <InsightRow
              leading={<Activity className="h-3.5 w-3.5 text-slate-500" />}
              primary="Зависшие лиды"
              secondary="Без активности > 3 дней"
              trailing={<span className="tabular-nums text-muted-foreground">{stats.stale}</span>}
              onClick={() => go('control', 'view-stale-leads')}
            />
          </InsightList>
        </WidgetCard>

        <WidgetCard
          title="Последние действия"
          icon={<Activity className="h-3.5 w-3.5 text-violet-500" />}
          bodyPadded={false}
          className="lg:col-span-2"
        >
          <InsightList>
            {mockLeads.slice(0, 6).map((l) => (
              <InsightRow
                key={l.id}
                leading={<StageDot stage={l.stage} />}
                primary={l.company ?? l.client}
                secondary={`${stageLabel(l.stage)} · ${l.manager}`}
                trailing={l.lastActivity}
              />
            ))}
          </InsightList>
        </WidgetCard>
      </div>

      <WidgetCard
        title="Быстрые переходы"
        icon={<Rocket className="h-3.5 w-3.5 text-[#2a6af0]" />}
      >
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          <QuickLinkTile icon={<TrendingUp className="h-4 w-4" />} label="Лиды" onClick={() => go('sales', 'leads')} />
          <QuickLinkTile icon={<FileText className="h-4 w-4" />} label="Заявки" onClick={() => go('sales', 'applications')} />
          <QuickLinkTile icon={<CalendarClock className="h-4 w-4" />} label="Брони" onClick={() => go('ops', 'reservations')} />
          <QuickLinkTile icon={<Truck className="h-4 w-4" />} label="Выезды" onClick={() => go('ops', 'departures')} />
          <QuickLinkTile icon={<CheckSquare className="h-4 w-4" />} label="Завершение" onClick={() => go('ops', 'completion')} />
          <QuickLinkTile icon={<Users className="h-4 w-4" />} label="Клиенты" onClick={() => go('clients', 'clients')} />
        </div>
      </WidgetCard>
    </DashboardPage>
  );
}

/* ------------------------------- My tasks ------------------------------- */

const DUE_GROUPS: Array<{
  key: 'overdue' | 'today' | 'tomorrow' | 'later' | 'none';
  label: string;
  tone?: 'danger' | 'warning' | 'progress' | 'default';
}> = [
  { key: 'overdue', label: 'Просрочено', tone: 'danger' },
  { key: 'today', label: 'Сегодня', tone: 'progress' },
  { key: 'tomorrow', label: 'Завтра' },
  { key: 'later', label: 'Позже' },
  { key: 'none', label: 'Без срока' },
];

function MyTasksPage() {
  const grouped = useMemo(() => groupTasksByDue(mockTasks), []);
  const [selected, setSelected] = useState<Task | null>(null);
  const { setActivePrimaryNav, setActiveSecondaryNav } = useLayout();

  const openLinked = (domain: TaskDomain, _id: string) => {
    // Navigate to the domain workspace. Detail-specific routing is not yet wired,
    // so the list view is the closest match.
    switch (domain) {
      case 'lead':
        setActivePrimaryNav('sales');
        setActiveSecondaryNav('leads');
        break;
      case 'application':
        setActivePrimaryNav('sales');
        setActiveSecondaryNav('applications');
        break;
      case 'client':
        setActivePrimaryNav('clients');
        setActiveSecondaryNav('clients');
        break;
      case 'reservation':
        setActivePrimaryNav('ops');
        setActiveSecondaryNav('reservations');
        break;
      case 'departure':
        setActivePrimaryNav('ops');
        setActiveSecondaryNav('departures');
        break;
      case 'completion':
        setActivePrimaryNav('ops');
        setActiveSecondaryNav('completion');
        break;
    }
    setSelected(null);
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-center gap-2 border-b border-border/60 bg-white px-4 py-2">
        <div className="flex flex-1 items-center gap-4 text-[12px] text-muted-foreground">
          <SummaryChip tone="danger" label="Просрочено" value={grouped.overdue.length} />
          <SummaryChip tone="progress" label="Сегодня" value={grouped.today.length} />
          <SummaryChip label="Завтра" value={grouped.tomorrow.length} />
          <SummaryChip label="Позже" value={grouped.later.length} />
          <SummaryChip label="Без срока" value={grouped.none.length} />
          <span className="ml-2 text-[11px] text-muted-foreground/80">Всего · {mockTasks.length}</span>
        </div>
        <Button variant="outline" size="sm" className="h-7 gap-1 text-[12px]">
          <PlusCircle className="h-3.5 w-3.5" />
          Новая задача
        </Button>
      </div>

      <GroupedListPage>
        {DUE_GROUPS.map((g) => {
          const tasks = grouped[g.key];
          if (tasks.length === 0) return null;
          return (
            <div key={g.key}>
              <ListGroupHeader title={g.label} count={tasks.length} tone={g.tone} />
              <ListGroup>
                {tasks.map((t) => (
                  <TaskListRow
                    key={t.id}
                    id={t.id}
                    title={t.title}
                    status={t.status}
                    priority={t.priority}
                    assignee={t.assignee}
                    dueLabel={t.dueLabel}
                    dueKind={t.dueKind}
                    linkedDomain={t.linkedEntity?.domain}
                    linkedId={t.linkedEntity?.id}
                    onClick={() => setSelected(t)}
                  />
                ))}
              </ListGroup>
            </div>
          );
        })}
      </GroupedListPage>

      <TaskDetailView
        task={selected}
        open={selected != null}
        onClose={() => setSelected(null)}
        onOpenLinkedEntity={openLinked}
      />
    </div>
  );
}

function SummaryChip({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: 'danger' | 'progress';
}) {
  const toneCls =
    tone === 'danger'
      ? 'text-rose-600'
      : tone === 'progress'
        ? 'text-[#2a6af0]'
        : 'text-foreground/80';
  return (
    <span className="inline-flex items-center gap-1 text-[11px]">
      <span className="text-muted-foreground">{label}</span>
      <span className={`tabular-nums font-medium ${toneCls}`}>{value}</span>
    </span>
  );
}

/* ---------------------------- Urgent today ------------------------------ */

function UrgentTodayPage() {
  const { setActivePrimaryNav, setActiveSecondaryNav } = useLayout();
  const urgent = useMemo(
    () => mockLeads.filter((l) => l.isUrgent || l.departureStatus === 'today' || l.hasConflict),
    [],
  );

  const groups = useMemo(() => {
    return {
      urgent: urgent.filter((l) => l.isUrgent && !l.hasConflict && l.departureStatus !== 'today'),
      conflicts: urgent.filter((l) => l.hasConflict),
      today: urgent.filter((l) => l.departureStatus === 'today'),
    };
  }, [urgent]);

  const goLead = () => {
    setActivePrimaryNav('sales');
    setActiveSecondaryNav('leads');
  };
  const goReservations = () => {
    setActivePrimaryNav('ops');
    setActiveSecondaryNav('reservations');
  };
  const goDepartures = () => {
    setActivePrimaryNav('ops');
    setActiveSecondaryNav('departures');
  };

  const openEntity = (stage: string) => {
    switch (stage) {
      case 'lead':
        goLead();
        break;
      case 'application':
        setActivePrimaryNav('sales');
        setActiveSecondaryNav('applications');
        break;
      case 'reservation':
        goReservations();
        break;
      case 'departure':
        goDepartures();
        break;
      default:
        goLead();
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-center gap-4 border-b border-border/60 bg-white px-4 py-2 text-[12px]">
        <SummaryChip tone="danger" label="Срочные лиды" value={groups.urgent.length} />
        <SummaryChip tone="danger" label="Конфликты" value={groups.conflicts.length} />
        <SummaryChip tone="progress" label="Выезды сегодня" value={groups.today.length} />
        <span className="ml-2 text-[11px] text-muted-foreground/80">Всего · {urgent.length}</span>
      </div>

      <GroupedListPage>
        {groups.urgent.length > 0 ? (
          <div>
            <ListGroupHeader
              title="Срочные лиды"
              count={groups.urgent.length}
              tone="danger"
              icon={<AlertTriangle className="h-3 w-3" />}
              action={
                <button
                  type="button"
                  onClick={goLead}
                  className="inline-flex items-center gap-1 text-[10px] text-[#2a6af0] hover:underline"
                >
                  Все лиды <ArrowRight className="h-3 w-3" />
                </button>
              }
            />
            <ListGroup>
              {groups.urgent.map((l) => (
                <PriorityRow
                  key={l.id}
                  leading={<AlertTriangle className="h-3.5 w-3.5 text-rose-500" />}
                  title={
                    <span>
                      {l.company ?? l.client}
                      <span className="ml-2 text-muted-foreground">· {l.equipmentType}</span>
                    </span>
                  }
                  secondary={`${stageLabel(l.stage)} · ${l.manager}`}
                  badge={<TagPill label="Срочно" tone="danger" />}
                  trailing={l.lastActivity}
                  onClick={() => openEntity(l.stage)}
                />
              ))}
            </ListGroup>
          </div>
        ) : null}

        {groups.conflicts.length > 0 ? (
          <div>
            <ListGroupHeader
              title="Конфликты броней"
              count={groups.conflicts.length}
              tone="warning"
              icon={<AlertTriangle className="h-3 w-3" />}
              action={
                <button
                  type="button"
                  onClick={goReservations}
                  className="inline-flex items-center gap-1 text-[10px] text-[#2a6af0] hover:underline"
                >
                  Все брони <ArrowRight className="h-3 w-3" />
                </button>
              }
            />
            <ListGroup>
              {groups.conflicts.map((l) => (
                <PriorityRow
                  key={l.id}
                  leading={<AlertTriangle className="h-3.5 w-3.5 text-amber-500" />}
                  title={
                    <span>
                      {l.company ?? l.client}
                      <span className="ml-2 text-muted-foreground">· {l.equipmentType}</span>
                    </span>
                  }
                  secondary={`${stageLabel(l.stage)} · ${l.manager}`}
                  badge={<TagPill label="Конфликт" tone="warning" />}
                  trailing={l.lastActivity}
                  onClick={() => openEntity(l.stage)}
                />
              ))}
            </ListGroup>
          </div>
        ) : null}

        {groups.today.length > 0 ? (
          <div>
            <ListGroupHeader
              title="Выезды сегодня"
              count={groups.today.length}
              tone="progress"
              icon={<Truck className="h-3 w-3" />}
              action={
                <button
                  type="button"
                  onClick={goDepartures}
                  className="inline-flex items-center gap-1 text-[10px] text-[#2a6af0] hover:underline"
                >
                  Все выезды <ArrowRight className="h-3 w-3" />
                </button>
              }
            />
            <ListGroup>
              {groups.today.map((l) => (
                <PriorityRow
                  key={l.id}
                  leading={<Truck className="h-3.5 w-3.5 text-sky-500" />}
                  title={
                    <span>
                      {l.company ?? l.client}
                      <span className="ml-2 text-muted-foreground">· {l.equipmentType}</span>
                    </span>
                  }
                  secondary={`${stageLabel(l.stage)} · ${l.manager}`}
                  badge={<TagPill label="Сегодня" tone="progress" />}
                  trailing={l.lastActivity}
                  onClick={() => openEntity(l.stage)}
                />
              ))}
            </ListGroup>
          </div>
        ) : null}

        {urgent.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 px-6 py-20 text-center">
            <Sparkles className="h-8 w-8 text-muted-foreground/50" />
            <h3 className="text-[13px] font-medium text-foreground">Срочных задач нет</h3>
            <p className="max-w-sm text-[12px] text-muted-foreground">
              Всё под контролем — можно заняться плановой работой.
            </p>
          </div>
        ) : null}
      </GroupedListPage>
    </div>
  );
}

/* --------------------------- Recent activity ---------------------------- */

function RecentActivityPage() {
  const items = useMemo(
    () => [
      { id: 'a1', at: '10 мин назад', actor: 'Сидоров Б.', text: 'создал лид', entity: 'ИП Морозов', kind: 'lead' as const, icon: <PlusCircle className="h-3.5 w-3.5" /> },
      { id: 'a2', at: '30 мин назад', actor: 'Петров А.', text: 'перевёл в работу', entity: 'APP-2024-002', kind: 'application' as const, icon: <Activity className="h-3.5 w-3.5" /> },
      { id: 'a3', at: '45 мин назад', actor: 'Иванова С.', text: 'назначила unit EXC-001 на', entity: 'RSV-00012', kind: 'reservation' as const, icon: <Settings className="h-3.5 w-3.5" /> },
      { id: 'a4', at: '1 ч назад', actor: 'Водитель Кузнецов', text: 'прибыл на объект', entity: 'DEP-00009', kind: 'departure' as const, icon: <Truck className="h-3.5 w-3.5" /> },
      { id: 'a5', at: '2 ч назад', actor: 'Сидоров Б.', text: 'подписал акт', entity: 'CMP-00011', kind: 'completed' as const, icon: <CheckSquare className="h-3.5 w-3.5" /> },
      { id: 'a6', at: '3 ч назад', actor: 'Петров А.', text: 'перевёл лид в заявку', entity: 'LEAD-00014', kind: 'application' as const, icon: <ArrowRight className="h-3.5 w-3.5" /> },
      { id: 'a7', at: 'Вчера, 18:20', actor: 'Admin', text: 'оставил комментарий', entity: 'TASK-00021', kind: 'lead' as const, icon: <MessageSquare className="h-3.5 w-3.5" /> },
      { id: 'a8', at: 'Вчера, 17:05', actor: 'Сидоров Б.', text: 'загрузил вложение в', entity: 'APP-2024-001', kind: 'application' as const, icon: <Paperclip className="h-3.5 w-3.5" /> },
      { id: 'a9', at: 'Вчера, 14:45', actor: 'Иванова С.', text: 'подтвердила бронь', entity: 'RSV-00011', kind: 'reservation' as const, icon: <History className="h-3.5 w-3.5" /> },
    ],
    [],
  );

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-center gap-2 border-b border-border/60 bg-white px-4 py-2 text-[11px] text-muted-foreground">
        <span>События по воронке за сегодня и вчера</span>
        <span className="ml-auto tabular-nums">{items.length} записей</span>
      </div>
      <GroupedListPage>
        <ListGroupHeader title="Сегодня" count={6} />
        <ListGroup>
          {items.slice(0, 6).map((it) => (
            <ActivityFeedRow
              key={it.id}
              icon={it.icon}
              actor={it.actor}
              text={it.text}
              entity={it.entity}
              time={it.at}
            />
          ))}
        </ListGroup>
        <ListGroupHeader title="Вчера" count={items.length - 6} />
        <ListGroup>
          {items.slice(6).map((it) => (
            <ActivityFeedRow
              key={it.id}
              icon={it.icon}
              actor={it.actor}
              text={it.text}
              entity={it.entity}
              time={it.at}
            />
          ))}
        </ListGroup>
      </GroupedListPage>
    </div>
  );
}

/* ----------------------------- Quick links ------------------------------ */

function QuickLinksPage() {
  const { setActivePrimaryNav, setActiveSecondaryNav } = useLayout();
  const go = (p: string, s: string) => {
    setActivePrimaryNav(p);
    setActiveSecondaryNav(s);
  };

  const GROUPS: Array<{
    title: string;
    links: Array<{ label: string; description: string; icon: React.ReactNode; primary: string; secondary: string }>;
  }> = [
    {
      title: 'Продажи',
      links: [
        { label: 'Лиды', description: 'Канбан по воронке', icon: <TrendingUp className="h-4 w-4" />, primary: 'sales', secondary: 'leads' },
        { label: 'Заявки', description: 'Список заявок', icon: <FileText className="h-4 w-4" />, primary: 'sales', secondary: 'applications' },
        { label: 'Клиенты', description: 'Все клиенты', icon: <Users className="h-4 w-4" />, primary: 'clients', secondary: 'clients' },
      ],
    },
    {
      title: 'Операции',
      links: [
        { label: 'Брони', description: 'Текущие брони', icon: <CalendarClock className="h-4 w-4" />, primary: 'ops', secondary: 'reservations' },
        { label: 'Выезды', description: 'Плановые и сегодняшние', icon: <Truck className="h-4 w-4" />, primary: 'ops', secondary: 'departures' },
        { label: 'Завершение', description: 'Акты и закрытие', icon: <CheckSquare className="h-4 w-4" />, primary: 'ops', secondary: 'completion' },
      ],
    },
    {
      title: 'Контроль',
      links: [
        { label: 'Отчёты', description: 'Отчёты и дашборд', icon: <Sparkles className="h-4 w-4" />, primary: 'control', secondary: 'reports' },
        { label: 'Аудит', description: 'Журнал действий', icon: <Activity className="h-4 w-4" />, primary: 'control', secondary: 'audit' },
      ],
    },
  ];

  return (
    <DashboardPage>
      <CompactPageHeader title="Быстрые переходы" subtitle="Ярлыки к ключевым разделам CRM" />
      <div className="flex flex-col gap-5">
        {GROUPS.map((g) => (
          <section key={g.title} className="flex flex-col gap-2">
            <h3 className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {g.title}
            </h3>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
              {g.links.map((l) => (
                <QuickLinkTile
                  key={l.secondary}
                  icon={l.icon}
                  label={l.label}
                  description={l.description}
                  onClick={() => go(l.primary, l.secondary)}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    </DashboardPage>
  );
}

/* ------------------------------- Helpers -------------------------------- */

const STAGE_COLOR: Record<string, string> = {
  lead: 'bg-sky-500',
  application: 'bg-violet-500',
  reservation: 'bg-amber-500',
  departure: 'bg-emerald-500',
  completed: 'bg-slate-500',
  unqualified: 'bg-rose-500',
};

const STAGE_LABEL: Record<string, string> = {
  lead: 'Лид',
  application: 'Заявка',
  reservation: 'Бронь',
  departure: 'Выезд',
  completed: 'Завершено',
  unqualified: 'Не квалиф.',
};

function StageDot({ stage }: { stage: string }) {
  return <span className={`block h-2 w-2 rounded-full ${STAGE_COLOR[stage] ?? 'bg-slate-400'}`} />;
}

function stageLabel(s: string) {
  return STAGE_LABEL[s] ?? s;
}

function TagPill({
  label,
  tone,
}: {
  label: string;
  tone: 'progress' | 'success' | 'warning' | 'danger' | 'muted';
}) {
  const map: Record<typeof tone, string> = {
    progress: 'bg-[#eaf1ff] text-[#2a6af0] border-[#cfdcff]',
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    warning: 'bg-amber-50 text-amber-700 border-amber-200',
    danger: 'bg-rose-50 text-rose-700 border-rose-200',
    muted: 'bg-muted/60 text-muted-foreground border-border',
  };
  return (
    <span className={`inline-flex rounded border px-1.5 py-0.5 text-[10px] font-medium ${map[tone]}`}>
      {label}
    </span>
  );
}
