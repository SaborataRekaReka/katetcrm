import { useMemo, useState } from 'react';
import {
  ArrowRight,
  Ban,
  Calendar,
  CheckCircle2,
  CheckSquare,
  Circle,
  CircleDot,
  Clock,
  Flag,
  Plus,
  Sparkles,
  Tag,
  Timer,
  User,
  UserCircle2,
} from 'lucide-react';
import {
  TASK_DOMAIN_LABEL,
  TASK_PRIORITY_LABEL,
  TASK_STATUS_LABEL,
  Task,
  TaskDomain,
  TaskPriority,
  TaskStatus,
} from '../../data/mockTasks';
import { Button } from '../ui/button';
import { Dialog, DialogContent } from '../ui/dialog';
import {
  Breadcrumb,
  DetailShell,
  EmptyValue,
  PropertyRow,
  SidebarField,
  ToolbarPill,
  sidebarTokens,
} from './DetailShell';
import {
  EntityActivityList,
  EntityCommentList,
  EntityCommentsComposer,
  EntityCommentsPanel,
  EntityMetaGrid,
  EntityModalHeader,
  EntityModalShell,
  EntitySection,
  EntitySidebarSection,
  EntitySummarySidebar,
} from './EntityModalFramework';

export interface TaskDetailViewProps {
  task: Task | null;
  open: boolean;
  onClose: () => void;
  onOpenLinkedEntity?: (domain: TaskDomain, id: string) => void;
}

export function TaskDetailView({ task, open, onClose, onOpenLinkedEntity }: TaskDetailViewProps) {
  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent
        className="!max-w-none w-[96vw] h-[92vh] p-0 gap-0 rounded-lg overflow-hidden [&>button]:hidden"
        aria-describedby={undefined}
      >
        {task ? <TaskDetailBody task={task} onClose={onClose} onOpenLinkedEntity={onOpenLinkedEntity} /> : null}
      </DialogContent>
    </Dialog>
  );
}

function TaskDetailBody({
  task,
  onClose,
  onOpenLinkedEntity,
}: {
  task: Task;
  onClose: () => void;
  onOpenLinkedEntity?: (domain: TaskDomain, id: string) => void;
}) {
  const [tab, setTab] = useState<'comments' | 'activity'>('comments');

  const breadcrumbItems = ['CRM', 'Задачи'];
  if (task.linkedEntity) {
    breadcrumbItems.push(`${TASK_DOMAIN_LABEL[task.linkedEntity.domain]} · ${task.linkedEntity.id}`);
  }
  breadcrumbItems.push(task.id);

  const cta = getTaskCta(task);

  const headerChips = [
    <StatusChip key="status" status={task.status} />,
    <PriorityChip key="priority" priority={task.priority} />,
    <ToolbarPill key="assignee" icon={<User className="w-3 h-3" />} label={task.assignee} />,
    <ToolbarPill
      key="due"
      icon={<Calendar className="w-3 h-3" />}
      label={<span className={dueToneClass(task.dueKind)}>{task.dueLabel}</span>}
      muted={false}
    />,
  ];

  if (task.linkedEntity) {
    headerChips.push(<LinkedEntityChip key="linked" entity={task.linkedEntity} />);
  }

  const comments = task.comments;
  const activityEntries = useMemo(
    () =>
      task.activity.map((entry) => ({
        id: entry.id,
        actor: entry.actor,
        text: entry.text,
        entity: entry.entity,
        time: entry.time,
      })),
    [task.activity],
  );

  const main = (
    <EntityModalShell className="pb-10 space-y-6">
      <EntityModalHeader
        entityLabel="Задача"
        title={task.title}
        chips={headerChips}
        primaryAction={{
          label: cta.primary,
          icon: <ArrowRight className="w-3 h-3" />,
        }}
        secondaryAction={cta.secondary ? { label: cta.secondary } : undefined}
      />

      <EntitySection title="Реквизиты задачи">
        <EntityMetaGrid>
          <PropertyRow icon={<CircleDot className="w-3 h-3" />} label="Статус" value={<StatusChip status={task.status} />} />
          <PropertyRow icon={<Flag className="w-3 h-3" />} label="Приоритет" value={<PriorityChip priority={task.priority} />} />
          <PropertyRow icon={<User className="w-3 h-3" />} label="Исполнитель" value={<span className="text-gray-800">{task.assignee}</span>} />
          <PropertyRow
            icon={<UserCircle2 className="w-3 h-3" />}
            label="Постановщик"
            value={<span className="text-gray-800">{task.reporter}</span>}
          />
          <PropertyRow icon={<Calendar className="w-3 h-3" />} label="Старт" value={task.startDate ?? <EmptyValue text="Не задан" />} />
          <PropertyRow
            icon={<Calendar className="w-3 h-3" />}
            label="Дедлайн"
            value={<span className={dueToneClass(task.dueKind)}>{task.dueLabel}</span>}
          />
          <PropertyRow icon={<Timer className="w-3 h-3" />} label="Оценка" value={task.estimate ?? <EmptyValue text="Не задана" />} />
          <PropertyRow icon={<Clock className="w-3 h-3" />} label="Трек времени" value={<span className="text-gray-800">{task.tracked ?? '0 мин'}</span>} />
          <PropertyRow
            icon={<Tag className="w-3 h-3" />}
            label="Теги"
            value={
              task.tags.length === 0 ? (
                <EmptyValue text="Нет" />
              ) : (
                <div className="flex flex-wrap gap-1">
                  {task.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex rounded border border-gray-200 bg-white px-1 py-0 text-[10px] text-gray-700"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )
            }
          />
          <PropertyRow
            icon={<CheckSquare className="w-3 h-3" />}
            label="Связана с"
            value={
              task.linkedEntity ? (
                <button
                  className="inline-flex items-center gap-1.5 max-w-full truncate text-blue-600 hover:underline"
                  onClick={() => onOpenLinkedEntity?.(task.linkedEntity!.domain, task.linkedEntity!.id)}
                >
                  <span className="text-gray-500">{TASK_DOMAIN_LABEL[task.linkedEntity.domain]}:</span>
                  <span>{task.linkedEntity.label}</span>
                  <span className="font-mono text-[10px] text-gray-400">{task.linkedEntity.id}</span>
                </button>
              ) : (
                <EmptyValue text="Не связана" />
              )
            }
          />
        </EntityMetaGrid>
      </EntitySection>

      <EntitySection title="Описание">
        {task.description ? (
          <p className="whitespace-pre-line text-[12px] leading-relaxed text-gray-700">{task.description}</p>
        ) : (
          <div className="flex items-center gap-2 text-[11px] text-gray-400">
            <Sparkles className="w-3 h-3 text-blue-500" />
            Добавить описание или попросить AI написать его
          </div>
        )}
      </EntitySection>

      <EntitySection
        title={`Подзадачи · ${task.subtasks.length}`}
        action={
          <button className="inline-flex items-center gap-1 text-[10px] text-gray-500 hover:text-gray-700">
            <Plus className="w-3 h-3" />
            <span>Добавить</span>
          </button>
        }
      >
        {task.subtasks.length === 0 ? (
          <div className="text-[11px] text-gray-400">Подзадач пока нет</div>
        ) : (
          <div className="divide-y divide-gray-100 border-y border-gray-100">
            {task.subtasks.map((subtask) => (
              <div key={subtask.id} className="flex items-center gap-2 py-1.5 text-[11px]">
                {subtask.done ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                ) : (
                  <Circle className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />
                )}
                <span className={`flex-1 min-w-0 truncate ${subtask.done ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                  {subtask.title}
                </span>
                <span className="text-gray-500 w-32 truncate">{subtask.assignee ?? '-'}</span>
                <span className="w-20">
                  {subtask.priority ? (
                    <PriorityChip priority={subtask.priority} />
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </span>
              </div>
            ))}
          </div>
        )}
      </EntitySection>

      <EntityCommentsPanel
        tab={tab}
        onTabChange={setTab}
        commentsCount={comments.length}
        commentsLabel="Комментарии"
        activityLabel="Журнал изменений"
        commentsContent={<EntityCommentList comments={comments} emptyText="Комментариев пока нет" />}
        activityContent={<EntityActivityList entries={activityEntries} emptyText="Событий пока нет" />}
      />
    </EntityModalShell>
  );

  const sidebarSections: EntitySidebarSection[] = [
    {
      title: 'Связанная запись',
      content: task.linkedEntity ? (
        <>
          <SidebarField label="Тип" value={TASK_DOMAIN_LABEL[task.linkedEntity.domain]} />
          <SidebarField
            label="Запись"
            value={
              <button
                className={sidebarTokens.link}
                onClick={() => onOpenLinkedEntity?.(task.linkedEntity!.domain, task.linkedEntity!.id)}
              >
                {task.linkedEntity.label}
              </button>
            }
          />
          <SidebarField label="ID" value={task.linkedEntity.id} />
        </>
      ) : (
        <EmptyValue text="Не связана" />
      ),
    },
    {
      title: 'История',
      content: <EntityActivityList entries={activityEntries.slice(0, 4)} emptyText="Событий пока нет" />,
    },
    {
      title: 'Метаданные',
      content: (
        <>
          <SidebarField label="Постановщик" value={task.reporter} />
          <SidebarField label="Создана" value={task.createdAt} />
          <SidebarField label="Автор" value={task.createdBy} />
          <SidebarField label="ID" value={task.id} />
        </>
      ),
    },
  ];

  const footer = (
    <EntityCommentsComposer
      placeholder="Написать комментарий. @ - упомянуть, : - emoji."
      avatar="A"
      avatarGradient="from-indigo-400 to-purple-500"
    />
  );

  return (
    <DetailShell
      breadcrumb={<Breadcrumb items={breadcrumbItems} />}
      onClose={onClose}
      main={main}
      sidebar={
        <EntitySummarySidebar
          sections={sidebarSections}
          quickActionsTitle="Быстрые действия"
          quickActions={
            <div className="space-y-1">
              <Button size="sm" variant="outline" className="h-6 w-full justify-start text-[11px]">
                Отметить выполненной
              </Button>
              <Button size="sm" variant="outline" className="h-6 w-full justify-start text-[11px]">
                Дублировать задачу
              </Button>
              <Button size="sm" variant="outline" className="h-6 w-full justify-start text-[11px]">
                Архивировать
              </Button>
            </div>
          }
        />
      }
      footer={footer}
    />
  );
}

function getTaskCta(task: Task): { primary: string; secondary?: string } {
  if (task.status === 'done') {
    return { primary: 'Создать похожую', secondary: 'Архивировать' };
  }
  if (task.status === 'blocked') {
    return { primary: 'Разблокировать', secondary: 'Перенести срок' };
  }
  return { primary: 'Отметить выполненной', secondary: 'Изменить срок' };
}

const STATUS_CONFIG: Record<TaskStatus, { cls: string; Icon: typeof Circle }> = {
  open: { cls: 'bg-gray-100 text-gray-700 border-gray-200', Icon: Circle },
  in_progress: { cls: 'bg-blue-50 text-blue-700 border-blue-200', Icon: CircleDot },
  blocked: { cls: 'bg-rose-50 text-rose-700 border-rose-200', Icon: Ban },
  done: { cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', Icon: CheckCircle2 },
};

function StatusChip({ status }: { status: TaskStatus }) {
  const config = STATUS_CONFIG[status];
  const Icon = config.Icon;

  return (
    <span className={`inline-flex items-center gap-1 rounded border px-1.5 h-5 text-[10px] ${config.cls}`}>
      <Icon className="w-3 h-3" />
      {TASK_STATUS_LABEL[status]}
    </span>
  );
}

const PRIORITY_CONFIG: Record<TaskPriority, string> = {
  urgent: 'text-rose-700 border-rose-200 bg-rose-50',
  high: 'text-amber-700 border-amber-200 bg-amber-50',
  normal: 'text-gray-700 border-gray-200 bg-gray-50',
  low: 'text-gray-500 border-gray-200 bg-white',
};

function PriorityChip({ priority }: { priority: TaskPriority }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded border px-1.5 h-5 text-[10px] ${PRIORITY_CONFIG[priority]}`}>
      <Flag className="w-3 h-3" />
      {TASK_PRIORITY_LABEL[priority]}
    </span>
  );
}

function LinkedEntityChip({ entity }: { entity: { domain: TaskDomain; id: string } }) {
  return (
    <span className="inline-flex items-center gap-1 rounded border border-gray-200 bg-white px-1.5 h-5 text-[10px] text-gray-600">
      {TASK_DOMAIN_LABEL[entity.domain]} · {entity.id}
    </span>
  );
}

function dueToneClass(kind: Task['dueKind']) {
  switch (kind) {
    case 'overdue':
      return 'text-rose-600';
    case 'today':
      return 'text-blue-600';
    case 'tomorrow':
      return 'text-gray-700';
    default:
      return 'text-gray-500';
  }
}
