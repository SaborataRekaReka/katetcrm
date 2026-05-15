import { useEffect, useMemo, useState } from 'react';
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
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { Dialog, DialogContent } from '../ui/dialog';
import { Input } from '../ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Textarea } from '../ui/textarea';
import { useLayout } from '../shell/layoutStore';
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
  onUpdateTask?: (taskId: string, patch: TaskUpdatePatch) => Promise<void> | void;
  onSetStatus?: (taskId: string, status: TaskStatus) => void;
  onDuplicateTask?: (taskId: string) => void;
  onArchiveTask?: (taskId: string) => void;
  onAddSubtask?: (taskId: string) => void;
  onAddComment?: (taskId: string, text: string) => Promise<void> | void;
}

export interface TaskUpdatePatch {
  title?: string;
  description?: string;
  priority?: TaskPriority;
  dueDate?: string;
  tags?: string[];
}

const TASK_EDIT_FIELD_CLASS =
  'h-6 min-h-6 rounded px-1.5 py-0 text-[11px] leading-5 bg-transparent border-transparent shadow-none hover:border-gray-200 text-gray-800 focus-visible:border-blue-400 focus-visible:bg-white focus-visible:ring-0 disabled:cursor-not-allowed disabled:opacity-60 md:text-[11px]';

const TASK_EDIT_TEXTAREA_CLASS =
  'min-h-[88px] rounded px-1.5 py-1 text-[11px] leading-5 bg-transparent border-transparent shadow-none hover:border-gray-200 text-gray-800 focus-visible:border-blue-400 focus-visible:bg-white focus-visible:ring-0 disabled:cursor-not-allowed disabled:opacity-60 resize-none md:text-[11px]';

const TASK_SELECT_TRIGGER_CLASS =
  'h-6 min-h-6 rounded px-1.5 py-0 text-[11px] leading-5 bg-transparent border-transparent shadow-none hover:border-gray-200 text-gray-800 focus-visible:border-blue-400 focus-visible:bg-white focus-visible:ring-0 data-[size=sm]:h-6 md:text-[11px] *:data-[slot=select-value]:text-[11px]';

const TASK_EDIT_LABEL_CLASS = 'text-[10px] uppercase tracking-wide text-gray-500';

export function TaskDetailView({
  task,
  open,
  onClose,
  onOpenLinkedEntity,
  onUpdateTask,
  onSetStatus,
  onDuplicateTask,
  onArchiveTask,
  onAddSubtask,
  onAddComment,
}: TaskDetailViewProps) {
  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent
        className="!max-w-none w-[calc(100vw-1rem)] h-[calc(100dvh-1rem)] sm:w-[96vw] sm:h-[92vh] p-0 gap-0 rounded-lg overflow-hidden [&>button]:hidden"
        aria-describedby={undefined}
      >
        {task ? (
          <TaskDetailBody
            task={task}
            onClose={onClose}
            onOpenLinkedEntity={onOpenLinkedEntity}
            onUpdateTask={onUpdateTask}
            onSetStatus={onSetStatus}
            onDuplicateTask={onDuplicateTask}
            onArchiveTask={onArchiveTask}
            onAddSubtask={onAddSubtask}
            onAddComment={onAddComment}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function TaskDetailBody({
  task,
  onClose,
  onOpenLinkedEntity,
  onUpdateTask,
  onSetStatus,
  onDuplicateTask,
  onArchiveTask,
  onAddSubtask,
  onAddComment,
}: {
  task: Task;
  onClose: () => void;
  onOpenLinkedEntity?: (domain: TaskDomain, id: string) => void;
  onUpdateTask?: (taskId: string, patch: TaskUpdatePatch) => Promise<void> | void;
  onSetStatus?: (taskId: string, status: TaskStatus) => void;
  onDuplicateTask?: (taskId: string) => void;
  onArchiveTask?: (taskId: string) => void;
  onAddSubtask?: (taskId: string) => void;
  onAddComment?: (taskId: string, text: string) => Promise<void> | void;
}) {
  const [tab, setTab] = useState<'comments' | 'activity'>('comments');
  const [editTitle, setEditTitle] = useState(task.title);
  const [editDescription, setEditDescription] = useState(task.description ?? '');
  const [editPriority, setEditPriority] = useState<TaskPriority>(task.priority);
  const [editDueDate, setEditDueDate] = useState(task.dueDate ?? '');
  const [editTags, setEditTags] = useState(task.tags.join(', '));
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const { setActiveSecondaryNav } = useLayout();

  useEffect(() => {
    setEditTitle(task.title);
    setEditDescription(task.description ?? '');
    setEditPriority(task.priority);
    setEditDueDate(task.dueDate ?? '');
    setEditTags(task.tags.join(', '));
    setIsSaving(false);
    setSaveError(null);
  }, [task.id, task.title, task.description, task.priority, task.dueDate, task.tags]);

  const openSecondary = (secondaryId: string) => {
    setActiveSecondaryNav(secondaryId);
    onClose();
  };

  const openLinkedFromBreadcrumb = () => {
    if (!task.linkedEntity || !onOpenLinkedEntity) return;
    onClose();
    onOpenLinkedEntity(task.linkedEntity.domain, task.linkedEntity.id);
  };

  const breadcrumbItems: Array<{ label: string; onClick?: () => void }> = [
    { label: 'CRM', onClick: () => openSecondary('overview') },
    { label: 'Задачи', onClick: () => openSecondary('my-tasks') },
  ];
  if (task.linkedEntity) {
    breadcrumbItems.push({
      label: `${TASK_DOMAIN_LABEL[task.linkedEntity.domain]} · ${task.linkedEntity.id}`,
      onClick: onOpenLinkedEntity ? openLinkedFromBreadcrumb : undefined,
    });
  }
  breadcrumbItems.push({ label: task.id });

  const cta = getTaskCta(task);
  const titleTrim = editTitle.trim();
  const descriptionTrim = editDescription.trim();
  const dueDateTrim = editDueDate.trim();
  const originalDescription = task.description ?? '';
  const nextTags = useMemo(() => normalizeTags(editTags), [editTags]);
  const originalTags = task.tags.join('|');
  const nextTagsKey = nextTags.join('|');
  const hasUnsavedChanges =
    titleTrim !== task.title
    || descriptionTrim !== originalDescription
    || editPriority !== task.priority
    || dueDateTrim !== (task.dueDate ?? '')
    || nextTagsKey !== originalTags;
  const canSaveChanges =
    !!onUpdateTask
    && titleTrim.length >= 2
    && hasUnsavedChanges
    && !isSaving;

  const headerChips = [
    <StatusChip key="status" status={task.status} size="md" />,
    <PriorityChip key="priority" priority={task.priority} size="md" />,
    <ToolbarPill key="assignee" icon={<User className="w-3 h-3" />} label={task.assignee} />,
    <ToolbarPill
      key="due"
      icon={<Calendar className="w-3 h-3" />}
      label={<span className={dueToneClass(task.dueKind)}>{task.dueLabel}</span>}
      muted={false}
    />,
  ];

  if (task.linkedEntity) {
    headerChips.push(<LinkedEntityChip key="linked" entity={task.linkedEntity} size="md" />);
  }

  const handlePrimaryAction = () => {
    if (task.status === 'done') {
      onDuplicateTask?.(task.id);
      return;
    }
    if (task.status === 'blocked') {
      onSetStatus?.(task.id, 'in_progress');
      return;
    }
    onSetStatus?.(task.id, 'done');
  };

  const canRunPrimaryAction =
    task.status === 'done'
      ? !!onDuplicateTask
      : !!onSetStatus;

  const headerSecondaryAction =
    task.status === 'done' && cta.secondary && onArchiveTask
      ? {
          label: cta.secondary,
          onClick: () => onArchiveTask(task.id),
        }
      : undefined;

  const handleSave = async () => {
    if (!onUpdateTask || !canSaveChanges) return;

    const patch: TaskUpdatePatch = {};
    if (titleTrim !== task.title) patch.title = titleTrim;
    if (descriptionTrim !== originalDescription) patch.description = descriptionTrim;
    if (editPriority !== task.priority) patch.priority = editPriority;
    if (dueDateTrim !== (task.dueDate ?? '')) patch.dueDate = dueDateTrim;
    if (nextTagsKey !== originalTags) patch.tags = nextTags;

    if (Object.keys(patch).length === 0) return;

    setSaveError(null);
    setIsSaving(true);
    try {
      await onUpdateTask(task.id, patch);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Не удалось сохранить изменения задачи.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setEditTitle(task.title);
    setEditDescription(task.description ?? '');
    setEditPriority(task.priority);
    setEditDueDate(task.dueDate ?? '');
    setEditTags(task.tags.join(', '));
    setSaveError(null);
  };

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
        primaryAction={
          canRunPrimaryAction
            ? {
                label: cta.primary,
                icon: <ArrowRight className="w-3 h-3" />,
                onClick: handlePrimaryAction,
              }
            : undefined
        }
        secondaryAction={headerSecondaryAction}
      />

      <EntitySection title="Редактирование">
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <label className="space-y-1">
              <span className={TASK_EDIT_LABEL_CLASS}>Заголовок</span>
              <Input
                type="text"
                value={editTitle}
                onChange={(event) => setEditTitle(event.target.value)}
                disabled={!onUpdateTask || isSaving}
                className={TASK_EDIT_FIELD_CLASS}
                placeholder="Название задачи"
              />
            </label>

            <label className="space-y-1">
              <span className={TASK_EDIT_LABEL_CLASS}>Приоритет</span>
              <Select
                value={editPriority}
                onValueChange={(value) => setEditPriority(value as TaskPriority)}
                disabled={!onUpdateTask || isSaving}
              >
                <SelectTrigger size="sm" className={TASK_SELECT_TRIGGER_CLASS}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="urgent">{TASK_PRIORITY_LABEL.urgent}</SelectItem>
                  <SelectItem value="high">{TASK_PRIORITY_LABEL.high}</SelectItem>
                  <SelectItem value="normal">{TASK_PRIORITY_LABEL.normal}</SelectItem>
                  <SelectItem value="low">{TASK_PRIORITY_LABEL.low}</SelectItem>
                </SelectContent>
              </Select>
            </label>

            <label className="space-y-1">
              <span className={TASK_EDIT_LABEL_CLASS}>Дедлайн (дата)</span>
              <Input
                type="date"
                value={editDueDate}
                onChange={(event) => setEditDueDate(event.target.value)}
                disabled={!onUpdateTask || isSaving}
                className={`${TASK_EDIT_FIELD_CLASS} [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-60`}
              />
            </label>

            <label className="space-y-1">
              <span className={TASK_EDIT_LABEL_CLASS}>Теги</span>
              <Input
                type="text"
                value={editTags}
                onChange={(event) => setEditTags(event.target.value)}
                disabled={!onUpdateTask || isSaving}
                className={TASK_EDIT_FIELD_CLASS}
                placeholder="например: звонок, клиент"
              />
            </label>
          </div>

          <label className="space-y-1 block">
            <span className={TASK_EDIT_LABEL_CLASS}>Описание</span>
            <Textarea
              value={editDescription}
              onChange={(event) => setEditDescription(event.target.value)}
              disabled={!onUpdateTask || isSaving}
              rows={4}
              className={TASK_EDIT_TEXTAREA_CLASS}
              placeholder="Описание задачи"
            />
          </label>

          {saveError ? (
            <Alert variant="destructive" className="border-rose-200 bg-rose-50 px-2 py-1.5 text-[11px] text-rose-700">
              <AlertDescription className="text-[11px] text-rose-700">{saveError}</AlertDescription>
            </Alert>
          ) : null}

          <div className="flex items-center justify-end gap-1.5">
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-[11px]"
              onClick={handleReset}
              disabled={!onUpdateTask || isSaving || !hasUnsavedChanges}
            >
              Сбросить
            </Button>
            <Button
              size="sm"
              className="h-7 text-[11px]"
              onClick={() => {
                void handleSave();
              }}
              disabled={!canSaveChanges}
            >
              {isSaving ? 'Сохраняем...' : 'Сохранить'}
            </Button>
          </div>
        </div>
      </EntitySection>

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
                    <Badge
                      key={tag}
                      variant="outline"
                      className="rounded border-gray-200 bg-white px-1 py-0 text-[10px] font-normal text-gray-700"
                    >
                      {tag}
                    </Badge>
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
                onOpenLinkedEntity ? (
                  <Button
                    type="button"
                    variant="link"
                    className="h-auto max-w-full justify-start gap-1.5 truncate p-0 text-[12px] text-blue-600"
                    onClick={() => onOpenLinkedEntity(task.linkedEntity!.domain, task.linkedEntity!.id)}
                  >
                    <span className="text-gray-500">{TASK_DOMAIN_LABEL[task.linkedEntity.domain]}:</span>
                    <span>{task.linkedEntity.label}</span>
                    <span className="font-mono text-[10px] text-gray-400">{task.linkedEntity.id}</span>
                  </Button>
                ) : (
                  <span className="inline-flex items-center gap-1.5 max-w-full truncate text-gray-700">
                    <span className="text-gray-500">{TASK_DOMAIN_LABEL[task.linkedEntity.domain]}:</span>
                    <span>{task.linkedEntity.label}</span>
                    <span className="font-mono text-[10px] text-gray-400">{task.linkedEntity.id}</span>
                  </span>
                )
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
          onAddSubtask ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onAddSubtask(task.id)}
              className="h-6 gap-1 px-1.5 text-[10px] text-gray-500 hover:text-gray-700"
            >
              <Plus className="w-3 h-3" />
              <span>Добавить</span>
            </Button>
          ) : null
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
      title: 'Связанные записи',
      content: task.linkedEntity ? (
        <>
          <SidebarField label="Тип" value={TASK_DOMAIN_LABEL[task.linkedEntity.domain]} />
          <SidebarField
            label="Запись"
            value={
              onOpenLinkedEntity ? (
                <Button
                  type="button"
                  variant="link"
                  className={`${sidebarTokens.link} h-auto p-0 text-[11px]`}
                  onClick={() => onOpenLinkedEntity(task.linkedEntity!.domain, task.linkedEntity!.id)}
                >
                  {task.linkedEntity.label}
                </Button>
              ) : (
                <span>{task.linkedEntity.label}</span>
              )
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

  const footer = onAddComment ? (
    <EntityCommentsComposer
      placeholder="Написать комментарий и нажать Enter"
      avatar="A"
      avatarGradient="from-indigo-400 to-purple-500"
      onSubmit={(text) => onAddComment(task.id, text)}
    />
  ) : undefined;

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
              <Button
                size="sm"
                variant="outline"
                className="h-6 w-full justify-start text-[11px]"
                onClick={() => onSetStatus?.(task.id, 'done')}
                disabled={!onSetStatus}
              >
                Отметить выполненной
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-6 w-full justify-start text-[11px]"
                onClick={() => onDuplicateTask?.(task.id)}
                disabled={!onDuplicateTask}
              >
                Дублировать задачу
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-6 w-full justify-start text-[11px]"
                onClick={() => onArchiveTask?.(task.id)}
                disabled={!onArchiveTask}
              >
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

const TASK_BADGE_SIZE_CLASS: Record<'sm' | 'md', string> = {
  sm: 'h-5 px-1.5 text-[10px]',
  md: 'h-6 px-2 text-[11px]',
};

function StatusChip({ status, size = 'sm' }: { status: TaskStatus; size?: 'sm' | 'md' }) {
  const config = STATUS_CONFIG[status];
  const Icon = config.Icon;

  return (
    <Badge variant="outline" className={`gap-1 font-normal ${TASK_BADGE_SIZE_CLASS[size]} ${config.cls}`}>
      <Icon className="w-3 h-3" />
      {TASK_STATUS_LABEL[status]}
    </Badge>
  );
}

const PRIORITY_CONFIG: Record<TaskPriority, string> = {
  urgent: 'text-rose-700 border-rose-200 bg-rose-50',
  high: 'text-amber-700 border-amber-200 bg-amber-50',
  normal: 'text-gray-700 border-gray-200 bg-gray-50',
  low: 'text-gray-500 border-gray-200 bg-white',
};

function PriorityChip({ priority, size = 'sm' }: { priority: TaskPriority; size?: 'sm' | 'md' }) {
  return (
    <Badge variant="outline" className={`gap-1 font-normal ${TASK_BADGE_SIZE_CLASS[size]} ${PRIORITY_CONFIG[priority]}`}>
      <Flag className="w-3 h-3" />
      {TASK_PRIORITY_LABEL[priority]}
    </Badge>
  );
}

function LinkedEntityChip({ entity, size = 'sm' }: { entity: { domain: TaskDomain; id: string }; size?: 'sm' | 'md' }) {
  return (
    <Badge variant="outline" className={`gap-1 border-gray-200 bg-white font-normal ${TASK_BADGE_SIZE_CLASS[size]} text-gray-600`}>
      {TASK_DOMAIN_LABEL[entity.domain]} · {entity.id}
    </Badge>
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

function normalizeTags(raw: string): string[] {
  const tags = raw
    .split(',')
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);

  return Array.from(new Set(tags)).slice(0, 30);
}

