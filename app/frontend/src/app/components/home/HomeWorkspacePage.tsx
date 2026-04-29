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
import {
  mockTasks,
  groupTasksByDue,
  Task,
  TaskDomain,
  TaskDueKind,
  TaskPriority,
  TaskStatus,
} from '../../data/mockTasks';
import { TaskDetailView, type TaskUpdatePatch } from '../detail/TaskDetailView';
import { Button } from '../ui/button';
import { USE_API } from '../../lib/featureFlags';
import { useStatsQuery } from '../../hooks/useStatsQuery';
import { useActivitySearchQuery } from '../../hooks/useActivityQuery';
import { useLeadsQuery } from '../../hooks/useLeadsQuery';
import { useTasksQuery } from '../../hooks/useTasksQuery';
import {
  useAddTaskSubtaskMutation,
  useArchiveTaskMutation,
  useCreateTaskMutation,
  useDuplicateTaskMutation,
  useUpdateTaskMutation,
  useUpdateTaskStatusMutation,
} from '../../hooks/useTaskMutations';

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
  const statsQuery = useStatsQuery(USE_API);
  const recentActivityQuery = useActivitySearchQuery({ take: 6 }, USE_API);

  const isStatsPending = USE_API && statsQuery.isPending && !statsQuery.data;
  const isStatsError = USE_API && statsQuery.isError && !statsQuery.data;
  const isRecentPending = USE_API && recentActivityQuery.isPending && !recentActivityQuery.data;
  const isRecentError = USE_API && recentActivityQuery.isError && !recentActivityQuery.data;

  const stats = useMemo(() => {
    if (USE_API) {
      if (!statsQuery.data) return null;
      return {
        leads: statsQuery.data.pipeline.lead,
        applications: statsQuery.data.pipeline.application,
        reservations: statsQuery.data.pipeline.reservation,
        departures: statsQuery.data.pipeline.departure,
        completed: statsQuery.data.pipeline.completed,
        urgent: statsQuery.data.operations.urgentLeads,
        conflicts: statsQuery.data.operations.conflicts,
        today: statsQuery.data.operations.departuresToday,
        stale: statsQuery.data.operations.staleLeads,
      };
    }

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
  }, [statsQuery.data]);

  const recentRows = useMemo(() => {
    if (USE_API) {
      if (!recentActivityQuery.data?.items?.length) return [];
      return recentActivityQuery.data.items.slice(0, 6).map((e) => ({
        id: e.id,
        leading: <Activity className="h-3.5 w-3.5 text-violet-500" />,
        primary: e.summary,
        secondary: `${e.entityType} · ${e.actor?.fullName ?? 'Система'}`,
        trailing: new Date(e.createdAt).toLocaleTimeString('ru-RU', {
          hour: '2-digit',
          minute: '2-digit',
        }),
      }));
    }

    return mockLeads.slice(0, 6).map((l) => ({
      id: l.id,
      leading: <StageDot stage={l.stage} />,
      primary: l.company ?? l.client,
      secondary: `${stageLabel(l.stage)} · ${l.manager}`,
      trailing: l.lastActivity,
    }));
  }, [recentActivityQuery.data]);

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

      {isStatsPending ? (
        <div className="rounded border border-dashed border-border/70 px-3 py-2 text-[12px] text-muted-foreground">
          Загружаем данные dashboard...
        </div>
      ) : isStatsError ? (
        <div className="rounded border border-rose-200 bg-rose-50 px-3 py-2 text-[12px] text-rose-700">
          Не удалось загрузить агрегаты. Проверьте API и авторизацию.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <StatCard icon={<TrendingUp className="h-3.5 w-3.5" />} label="Лиды" value={stats?.leads ?? '—'} tone="progress" onClick={() => go('sales', 'leads')} />
          <StatCard icon={<FileText className="h-3.5 w-3.5" />} label="Заявки" value={stats?.applications ?? '—'} tone="progress" onClick={() => go('sales', 'applications')} />
          <StatCard icon={<CalendarClock className="h-3.5 w-3.5" />} label="Брони" value={stats?.reservations ?? '—'} tone="progress" onClick={() => go('ops', 'reservations')} />
          <StatCard icon={<Truck className="h-3.5 w-3.5" />} label="Выезды" value={stats?.departures ?? '—'} tone="progress" onClick={() => go('ops', 'departures')} />
          <StatCard icon={<CheckSquare className="h-3.5 w-3.5" />} label="Завершено" value={stats?.completed ?? '—'} tone="success" onClick={() => go('ops', 'completion')} />
        </div>
      )}

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
              trailing={<span className="tabular-nums text-rose-600">{stats?.urgent ?? '—'}</span>}
              onClick={() => go('sales', 'view-urgent')}
            />
            <InsightRow
              leading={<AlertTriangle className="h-3.5 w-3.5 text-amber-500" />}
              primary="Конфликты броней"
              secondary="Пересечения по датам"
              trailing={<span className="tabular-nums text-amber-600">{stats?.conflicts ?? '—'}</span>}
              onClick={() => go('ops', 'view-conflict')}
            />
            <InsightRow
              leading={<Truck className="h-3.5 w-3.5 text-sky-500" />}
              primary="Выезды сегодня"
              secondary="Должны стартовать"
              trailing={<span className="tabular-nums text-[#2a6af0]">{stats?.today ?? '—'}</span>}
              onClick={() => go('ops', 'view-departures-today')}
            />
            <InsightRow
              leading={<Activity className="h-3.5 w-3.5 text-slate-500" />}
              primary="Зависшие лиды"
              secondary="Без активности > 3 дней"
              trailing={<span className="tabular-nums text-muted-foreground">{stats?.stale ?? '—'}</span>}
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
            {isRecentPending ? (
              <div className="px-3 py-4 text-[12px] text-muted-foreground">Загружаем ленту...</div>
            ) : isRecentError ? (
              <div className="px-3 py-4 text-[12px] text-rose-700">Не удалось загрузить ленту активности.</div>
            ) : recentRows.length === 0 ? (
              <div className="px-3 py-4 text-[12px] text-muted-foreground">Пока нет событий.</div>
            ) : (
              recentRows.map((row) => (
                <InsightRow
                  key={row.id}
                  leading={row.leading}
                  primary={row.primary}
                  secondary={row.secondary}
                  trailing={row.trailing}
                />
              ))
            )}
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

function computeDuePresentation(dueDate?: string): Pick<Task, 'dueDate' | 'dueKind' | 'dueLabel'> {
  if (!dueDate) {
    return {
      dueDate: undefined,
      dueKind: 'none',
      dueLabel: 'Без срока',
    };
  }

  const target = new Date(`${dueDate}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (!Number.isFinite(target.getTime())) {
    return {
      dueDate: undefined,
      dueKind: 'none',
      dueLabel: 'Без срока',
    };
  }

  const diffDays = Math.floor((target.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
  const dateLabel = target.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
  });

  if (diffDays < 0) {
    return {
      dueDate,
      dueKind: 'overdue',
      dueLabel: `Просрочено · ${dateLabel}`,
    };
  }

  if (diffDays === 0) {
    return {
      dueDate,
      dueKind: 'today',
      dueLabel: 'Сегодня',
    };
  }

  if (diffDays === 1) {
    return {
      dueDate,
      dueKind: 'tomorrow',
      dueLabel: 'Завтра',
    };
  }

  return {
    dueDate,
    dueKind: 'later',
    dueLabel: `До ${dateLabel}`,
  };
}

function MyTasksPage() {
  if (USE_API) {
    return <ApiMyTasksPage />;
  }

  const [tasks, setTasks] = useState<Task[]>(mockTasks);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const { setActivePrimaryNav, setActiveSecondaryNav } = useLayout();
  const grouped = useMemo(() => groupTasksByDue(tasks), [tasks]);
  const selectedTask = useMemo(
    () => tasks.find((t) => t.id === selectedTaskId) ?? null,
    [tasks, selectedTaskId],
  );

  const nextTaskId = (rows: Task[]) => {
    const max = rows.reduce((acc, t) => {
      const num = Number(t.id.replace(/[^0-9]/g, ''));
      return Number.isFinite(num) ? Math.max(acc, num) : acc;
    }, 0);
    return `TASK-${String(max + 1).padStart(5, '0')}`;
  };

  const nowStamp = () => {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

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
    setSelectedTaskId(null);
  };

  const handleCreateTask = () => {
    let createdId: string | null = null;
    setTasks((prev) => {
      createdId = nextTaskId(prev);
      const draft: Task = {
        id: createdId,
        title: 'Новая задача',
        status: 'open',
        priority: 'normal',
        assignee: 'Петров А.',
        reporter: 'Петров А.',
        dueLabel: 'Без срока',
        dueKind: 'none',
        tags: ['черновик'],
        subtasks: [],
        comments: [],
        activity: [
          {
            id: `a-create-${Date.now()}`,
            actor: 'Петров А.',
            text: 'создал задачу',
            time: 'только что',
          },
        ],
        createdAt: nowStamp(),
        createdBy: 'Петров А.',
      };
      return [draft, ...prev];
    });
    if (createdId) setSelectedTaskId(createdId);
  };

  const handleSetStatus = (taskId: string, status: 'open' | 'in_progress' | 'blocked' | 'done') => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== taskId) return t;
        return {
          ...t,
          status,
          activity: [
            {
              id: `a-status-${Date.now()}`,
              actor: 'Петров А.',
              text: `изменил статус на ${status === 'done' ? 'Выполнена' : status === 'in_progress' ? 'В работе' : status === 'blocked' ? 'Заблокирована' : 'Открыта'}`,
              time: 'только что',
            },
            ...t.activity,
          ],
        };
      }),
    );
  };

  const handleUpdateTask = (taskId: string, patch: TaskUpdatePatch) => {
    setTasks((prev) =>
      prev.map((task) => {
        if (task.id !== taskId) return task;

        const nextTitle = patch.title?.trim() ?? task.title;
        const nextDescription = patch.description !== undefined ? patch.description.trim() || undefined : task.description;
        const nextPriority = patch.priority ?? task.priority;
        const nextTags = patch.tags ?? task.tags;
        const duePresentation = patch.dueDate !== undefined
          ? computeDuePresentation(patch.dueDate)
          : {
              dueDate: task.dueDate,
              dueKind: task.dueKind,
              dueLabel: task.dueLabel,
            };

        return {
          ...task,
          title: nextTitle,
          description: nextDescription,
          priority: nextPriority,
          tags: nextTags,
          dueDate: duePresentation.dueDate,
          dueKind: duePresentation.dueKind,
          dueLabel: duePresentation.dueLabel,
          activity: [
            {
              id: `a-edit-${Date.now()}`,
              actor: 'Петров А.',
              text: 'обновил реквизиты задачи',
              time: 'только что',
            },
            ...task.activity,
          ],
        };
      }),
    );
  };

  const handleDuplicateTask = (taskId: string) => {
    let duplicatedId: string | null = null;
    setTasks((prev) => {
      const source = prev.find((t) => t.id === taskId);
      if (!source) return prev;
      duplicatedId = nextTaskId(prev);
      const duplicated: Task = {
        ...source,
        id: duplicatedId,
        title: `${source.title} (копия)`,
        status: 'open',
        dueLabel: 'Без срока',
        dueKind: 'none',
        createdAt: nowStamp(),
        createdBy: 'Петров А.',
        activity: [
          {
            id: `a-dup-${Date.now()}`,
            actor: 'Петров А.',
            text: `создал копию из ${source.id}`,
            time: 'только что',
          },
        ],
      };
      return [duplicated, ...prev];
    });
    if (duplicatedId) setSelectedTaskId(duplicatedId);
  };

  const handleArchiveTask = (taskId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    setSelectedTaskId((prev) => (prev === taskId ? null : prev));
  };

  const handleAddSubtask = (taskId: string) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== taskId) return t;
        const nextIndex = t.subtasks.length + 1;
        return {
          ...t,
          subtasks: [
            ...t.subtasks,
            {
              id: `st-${nextIndex}`,
              title: `Новая подзадача ${nextIndex}`,
              assignee: t.assignee,
              priority: 'normal',
            },
          ],
          activity: [
            {
              id: `a-sub-${Date.now()}`,
              actor: 'Петров А.',
              text: 'добавил подзадачу',
              time: 'только что',
            },
            ...t.activity,
          ],
        };
      }),
    );
  };

  const handleAddComment = (taskId: string, text: string) => {
    const body = text.trim();
    if (!body) return;

    setTasks((prev) =>
      prev.map((task) => {
        if (task.id !== taskId) return task;

        const author = task.assignee || 'Петров А.';
        const avatar = author.trim().charAt(0).toUpperCase() || 'A';
        const stamp = Date.now();

        return {
          ...task,
          comments: [
            {
              id: `c-${stamp}`,
              author,
              avatar,
              color: 'from-indigo-400 to-purple-500',
              time: 'только что',
              text: body,
            },
            ...task.comments,
          ],
          activity: [
            {
              id: `a-comment-${stamp}`,
              actor: author,
              text: 'добавил комментарий',
              time: 'только что',
            },
            ...task.activity,
          ],
        };
      }),
    );
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
          <span className="ml-2 text-[11px] text-muted-foreground/80">Всего · {tasks.length}</span>
        </div>
        <Button variant="outline" size="sm" className="h-7 gap-1 text-[12px]" onClick={handleCreateTask}>
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
                    onClick={() => setSelectedTaskId(t.id)}
                  />
                ))}
              </ListGroup>
            </div>
          );
        })}
      </GroupedListPage>

      <TaskDetailView
        task={selectedTask}
        open={selectedTaskId != null}
        onClose={() => setSelectedTaskId(null)}
        onOpenLinkedEntity={openLinked}
        onUpdateTask={handleUpdateTask}
        onSetStatus={handleSetStatus}
        onDuplicateTask={handleDuplicateTask}
        onArchiveTask={handleArchiveTask}
        onAddSubtask={handleAddSubtask}
        onAddComment={handleAddComment}
      />
    </div>
  );
}

function ApiMyTasksPage() {
  const { setActivePrimaryNav, setActiveSecondaryNav } = useLayout();
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);

  const tasksQuery = useTasksQuery({ scope: 'mine', includeArchived: false, take: 500 }, USE_API);
  const createTaskMutation = useCreateTaskMutation();
  const updateTaskMutation = useUpdateTaskMutation();
  const statusMutation = useUpdateTaskStatusMutation();
  const duplicateMutation = useDuplicateTaskMutation();
  const archiveMutation = useArchiveTaskMutation();
  const addSubtaskMutation = useAddTaskSubtaskMutation();

  const isPending = USE_API && tasksQuery.isPending && !tasksQuery.data;
  const isError = USE_API && tasksQuery.isError && !tasksQuery.data;
  const tasks = tasksQuery.data?.items ?? [];
  const selectedTask = useMemo(
    () => tasks.find((t) => t.id === selectedTaskId) ?? null,
    [tasks, selectedTaskId],
  );

  const grouped = useMemo(() => groupTasksByDue(tasks), [tasks]);

  const openLinked = (domain: TaskDomain, _id: string) => {
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
    setSelectedTaskId(null);
  };

  const handleCreateTask = async () => {
    setMutationError(null);
    try {
      const created = await createTaskMutation.mutateAsync({
        title: 'Новая задача',
        status: 'open',
        priority: 'normal',
        tags: ['черновик'],
      });
      setSelectedTaskId(created.id);
    } catch (error) {
      setMutationError(error instanceof Error ? error.message : 'Не удалось создать задачу.');
    }
  };

  const handleSetStatus = async (taskId: string, status: TaskStatus) => {
    setMutationError(null);
    try {
      await statusMutation.mutateAsync({ id: taskId, status });
    } catch (error) {
      setMutationError(error instanceof Error ? error.message : 'Не удалось изменить статус задачи.');
    }
  };

  const handleUpdateTask = async (taskId: string, patch: TaskUpdatePatch) => {
    setMutationError(null);
    try {
      const normalizedPatch = patch.dueDate === ''
        ? { ...patch, dueDate: null }
        : patch;
      await updateTaskMutation.mutateAsync({ id: taskId, patch: normalizedPatch });
    } catch (error) {
      setMutationError(error instanceof Error ? error.message : 'Не удалось сохранить изменения задачи.');
      throw error;
    }
  };

  const handleDuplicateTask = async (taskId: string) => {
    setMutationError(null);
    try {
      const duplicated = await duplicateMutation.mutateAsync({ id: taskId });
      setSelectedTaskId(duplicated.id);
    } catch (error) {
      setMutationError(error instanceof Error ? error.message : 'Не удалось дублировать задачу.');
    }
  };

  const handleArchiveTask = async (taskId: string) => {
    setMutationError(null);
    try {
      await archiveMutation.mutateAsync({ id: taskId });
      setSelectedTaskId((prev) => (prev === taskId ? null : prev));
    } catch (error) {
      setMutationError(error instanceof Error ? error.message : 'Не удалось архивировать задачу.');
    }
  };

  const handleAddSubtask = async (taskId: string) => {
    setMutationError(null);
    const source = tasks.find((task) => task.id === taskId);
    const nextIndex = (source?.subtasks.length ?? 0) + 1;
    try {
      await addSubtaskMutation.mutateAsync({
        id: taskId,
        payload: {
          title: `Новая подзадача ${nextIndex}`,
          assignee: source?.assignee,
          priority: 'normal',
        },
      });
    } catch (error) {
      setMutationError(error instanceof Error ? error.message : 'Не удалось добавить подзадачу.');
    }
  };

  const createBusy = createTaskMutation.isPending;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-center gap-2 border-b border-border/60 bg-white px-4 py-2">
        <div className="flex flex-1 items-center gap-4 text-[12px] text-muted-foreground">
          <SummaryChip tone="danger" label="Просрочено" value={grouped.overdue.length} />
          <SummaryChip tone="progress" label="Сегодня" value={grouped.today.length} />
          <SummaryChip label="Завтра" value={grouped.tomorrow.length} />
          <SummaryChip label="Позже" value={grouped.later.length} />
          <SummaryChip label="Без срока" value={grouped.none.length} />
          <span className="ml-2 text-[11px] text-muted-foreground/80">Всего · {tasks.length}</span>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-7 gap-1 text-[12px]"
          onClick={() => {
            void handleCreateTask();
          }}
          disabled={createBusy}
        >
          <PlusCircle className="h-3.5 w-3.5" />
          {createBusy ? 'Создаём...' : 'Новая задача'}
        </Button>
      </div>

      {mutationError ? (
        <div className="mx-4 mt-3 rounded border border-rose-200 bg-rose-50 px-3 py-2 text-[12px] text-rose-700">
          {mutationError}
        </div>
      ) : null}

      <GroupedListPage>
        {isPending ? (
          <div className="px-4 py-6 text-[12px] text-muted-foreground">Загружаем задачи...</div>
        ) : null}

        {isError ? (
          <div className="px-4 py-6 text-[12px] text-rose-700">
            {tasksQuery.error instanceof Error ? tasksQuery.error.message : 'Не удалось загрузить задачи.'}
          </div>
        ) : null}

        {isPending || isError ? null : tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 px-6 py-20 text-center">
            <Sparkles className="h-8 w-8 text-muted-foreground/50" />
            <h3 className="text-[13px] font-medium text-foreground">Задач нет</h3>
            <p className="max-w-sm text-[12px] text-muted-foreground">
              По текущим лидам нет записей, требующих действия.
            </p>
          </div>
        ) : (
          DUE_GROUPS.map((g) => {
            const dueRows = grouped[g.key];
            if (dueRows.length === 0) return null;
            return (
              <div key={g.key}>
                <ListGroupHeader title={g.label} count={dueRows.length} tone={g.tone} />
                <ListGroup>
                  {dueRows.map((task) => (
                    <TaskListRow
                      key={task.id}
                      id={task.id}
                      title={task.title}
                      status={task.status}
                      priority={task.priority}
                      assignee={task.assignee}
                      dueLabel={task.dueLabel}
                      dueKind={task.dueKind}
                      linkedDomain={task.linkedEntity?.domain}
                      linkedId={task.linkedEntity?.id}
                      onClick={() => setSelectedTaskId(task.id)}
                    />
                  ))}
                </ListGroup>
              </div>
            );
          })
        )}
      </GroupedListPage>

      <TaskDetailView
        task={selectedTask}
        open={selectedTaskId != null}
        onClose={() => setSelectedTaskId(null)}
        onOpenLinkedEntity={openLinked}
        onUpdateTask={(taskId, patch) => handleUpdateTask(taskId, patch)}
        onSetStatus={(taskId, status) => {
          void handleSetStatus(taskId, status);
        }}
        onDuplicateTask={(taskId) => {
          void handleDuplicateTask(taskId);
        }}
        onArchiveTask={(taskId) => {
          void handleArchiveTask(taskId);
        }}
        onAddSubtask={(taskId) => {
          void handleAddSubtask(taskId);
        }}
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
  const leadsQuery = useLeadsQuery({ scope: 'all' }, USE_API);

  const isPending = USE_API && leadsQuery.isPending && !leadsQuery.data;
  const isError = USE_API && leadsQuery.isError && !leadsQuery.data;

  const apiRows = useMemo(() => {
    if (!USE_API) {
      return [] as Array<{
        id: string;
        stage: string;
        company: string | null;
        client: string;
        equipmentType: string;
        manager: string;
        lastActivity: string;
        isUrgent: boolean;
        hasConflict: boolean;
        departureToday: boolean;
      }>;
    }

    const today = new Date().toISOString().slice(0, 10);
    return (leadsQuery.data?.items ?? []).map((l) => {
      const dt = new Date(l.lastActivityAt);
      const lastActivity = Number.isFinite(dt.getTime())
        ? dt.toLocaleString('ru-RU', {
          day: '2-digit',
          month: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        })
        : l.lastActivityAt;

      const departureToday = l.stage === 'departure'
        && !!l.requestedDate
        && l.requestedDate.slice(0, 10) === today;

      return {
        id: l.id,
        stage: l.stage,
        company: l.contactCompany,
        client: l.contactName,
        equipmentType: l.equipmentTypeHint ?? '—',
        manager: l.managerName ?? l.manager?.fullName ?? '—',
        lastActivity,
        isUrgent: l.isUrgent,
        hasConflict: false,
        departureToday,
      };
    });
  }, [leadsQuery.data]);

  const urgent = useMemo(
    () => {
      if (USE_API) {
        return apiRows.filter((l) => l.isUrgent || l.departureToday || l.hasConflict);
      }
      return mockLeads.filter((l) => l.isUrgent || l.departureStatus === 'today' || l.hasConflict);
    },
    [apiRows],
  );

  const groups = useMemo(() => {
    return {
      urgent: urgent.filter((l) => l.isUrgent && !l.hasConflict && !(USE_API ? l.departureToday : l.departureStatus === 'today')),
      conflicts: urgent.filter((l) => l.hasConflict),
      today: urgent.filter((l) => (USE_API ? l.departureToday : l.departureStatus === 'today')),
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
        {isPending ? (
          <div className="px-4 py-6 text-[12px] text-muted-foreground">Загружаем приоритетные записи...</div>
        ) : null}

        {isError ? (
          <div className="px-4 py-6 text-[12px] text-rose-700">
            {leadsQuery.error instanceof Error ? leadsQuery.error.message : 'Не удалось загрузить приоритетные записи.'}
          </div>
        ) : null}

        {isPending || isError ? null : (
          <>
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
          </>
        )}
      </GroupedListPage>
    </div>
  );
}

/* --------------------------- Recent activity ---------------------------- */

function RecentActivityPage() {
  const { setActivePrimaryNav, setActiveSecondaryNav } = useLayout();
  const activityQuery = useActivitySearchQuery({ take: 40 }, USE_API);

  const formatRelative = (iso: string) => {
    const ts = Date.parse(iso);
    if (!Number.isFinite(ts)) return iso;
    const diff = Date.now() - ts;
    const min = Math.floor(diff / 60_000);
    if (min < 1) return 'только что';
    if (min < 60) return `${min} мин назад`;
    const hours = Math.floor(min / 60);
    if (hours < 24) return `${hours} ч назад`;
    return new Date(ts).toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const mapEntityKind = (
    entityType: string,
  ): 'lead' | 'application' | 'reservation' | 'departure' | 'completed' => {
    if (entityType === 'lead') return 'lead';
    if (entityType === 'application' || entityType === 'application_item') return 'application';
    if (entityType === 'reservation') return 'reservation';
    if (entityType === 'departure') return 'departure';
    return 'completed';
  };

  const iconForKind = (kind: 'lead' | 'application' | 'reservation' | 'departure' | 'completed') => {
    if (kind === 'lead') return <PlusCircle className="h-3.5 w-3.5" />;
    if (kind === 'application') return <Activity className="h-3.5 w-3.5" />;
    if (kind === 'reservation') return <Settings className="h-3.5 w-3.5" />;
    if (kind === 'departure') return <Truck className="h-3.5 w-3.5" />;
    return <CheckSquare className="h-3.5 w-3.5" />;
  };

  const items = useMemo(
    () => {
      if (USE_API) {
        return (activityQuery.data?.items ?? []).map((e) => {
          const kind = mapEntityKind(e.entityType);
          return {
            id: e.id,
            at: formatRelative(e.createdAt),
            actor: e.actor?.fullName ?? 'Система',
            text: e.summary,
            entity: `${e.entityType} · ${e.entityId.slice(0, 8)}`,
            kind,
            icon: iconForKind(kind),
          };
        });
      }

      return [
        { id: 'a1', at: '10 мин назад', actor: 'Сидоров Б.', text: 'создал лид', entity: 'ИП Морозов', kind: 'lead' as const, icon: <PlusCircle className="h-3.5 w-3.5" /> },
        { id: 'a2', at: '30 мин назад', actor: 'Петров А.', text: 'перевёл в работу', entity: 'APP-2024-002', kind: 'application' as const, icon: <Activity className="h-3.5 w-3.5" /> },
        { id: 'a3', at: '45 мин назад', actor: 'Иванова С.', text: 'назначила unit EXC-001 на', entity: 'RSV-00012', kind: 'reservation' as const, icon: <Settings className="h-3.5 w-3.5" /> },
        { id: 'a4', at: '1 ч назад', actor: 'Водитель Кузнецов', text: 'прибыл на объект', entity: 'DEP-00009', kind: 'departure' as const, icon: <Truck className="h-3.5 w-3.5" /> },
        { id: 'a5', at: '2 ч назад', actor: 'Сидоров Б.', text: 'подписал акт', entity: 'CMP-00011', kind: 'completed' as const, icon: <CheckSquare className="h-3.5 w-3.5" /> },
        { id: 'a6', at: '3 ч назад', actor: 'Петров А.', text: 'перевёл лид в заявку', entity: 'LEAD-00014', kind: 'application' as const, icon: <ArrowRight className="h-3.5 w-3.5" /> },
        { id: 'a7', at: 'Вчера, 18:20', actor: 'Admin', text: 'оставил комментарий', entity: 'TASK-00021', kind: 'lead' as const, icon: <MessageSquare className="h-3.5 w-3.5" /> },
        { id: 'a8', at: 'Вчера, 17:05', actor: 'Сидоров Б.', text: 'загрузил вложение в', entity: 'APP-2024-001', kind: 'application' as const, icon: <Paperclip className="h-3.5 w-3.5" /> },
        { id: 'a9', at: 'Вчера, 14:45', actor: 'Иванова С.', text: 'подтвердила бронь', entity: 'RSV-00011', kind: 'reservation' as const, icon: <History className="h-3.5 w-3.5" /> },
      ];
    },
    [activityQuery.data],
  );

  const isPending = USE_API && activityQuery.isPending && !activityQuery.data;
  const isError = USE_API && activityQuery.isError && !activityQuery.data;

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const todayItems = items.filter((it) => {
    if (!USE_API) return items.indexOf(it) < 6;
    const raw = activityQuery.data?.items.find((e) => e.id === it.id);
    if (!raw) return false;
    const ts = Date.parse(raw.createdAt);
    return Number.isFinite(ts) && ts >= todayStart.getTime();
  });

  const yesterdayItems = items.filter((it) => !todayItems.some((x) => x.id === it.id));

  const openEntity = (kind: 'lead' | 'application' | 'reservation' | 'departure' | 'completed') => {
    switch (kind) {
      case 'lead':
        setActivePrimaryNav('sales');
        setActiveSecondaryNav('leads');
        return;
      case 'application':
        setActivePrimaryNav('sales');
        setActiveSecondaryNav('applications');
        return;
      case 'reservation':
        setActivePrimaryNav('ops');
        setActiveSecondaryNav('reservations');
        return;
      case 'departure':
        setActivePrimaryNav('ops');
        setActiveSecondaryNav('departures');
        return;
      case 'completed':
        setActivePrimaryNav('ops');
        setActiveSecondaryNav('completion');
        return;
      default:
        return;
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-center gap-2 border-b border-border/60 bg-white px-4 py-2 text-[11px] text-muted-foreground">
        <span>События по воронке за сегодня и вчера</span>
        <span className="ml-auto tabular-nums">{items.length} записей</span>
      </div>
      <GroupedListPage>
        {isPending ? (
          <div className="px-4 py-6 text-[12px] text-muted-foreground">Загружаем события...</div>
        ) : isError ? (
          <div className="px-4 py-6 text-[12px] text-rose-700">Не удалось загрузить события.</div>
        ) : items.length === 0 ? (
          <div className="px-4 py-6 text-[12px] text-muted-foreground">Событий пока нет.</div>
        ) : (
          <>
            <ListGroupHeader title="Сегодня" count={todayItems.length} />
            <ListGroup>
              {todayItems.map((it) => (
                <ActivityFeedRow
                  key={it.id}
                  icon={it.icon}
                  actor={it.actor}
                  text={it.text}
                  entity={it.entity}
                  onEntityClick={() => openEntity(it.kind)}
                  time={it.at}
                />
              ))}
            </ListGroup>
            <ListGroupHeader title="Ранее" count={yesterdayItems.length} />
            <ListGroup>
              {yesterdayItems.map((it) => (
                <ActivityFeedRow
                  key={it.id}
                  icon={it.icon}
                  actor={it.actor}
                  text={it.text}
                  entity={it.entity}
                  onEntityClick={() => openEntity(it.kind)}
                  time={it.at}
                />
              ))}
            </ListGroup>
          </>
        )}
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
