import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, TaskPriority, TaskStatus, UserRole } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { ActivityService } from '../activity/activity.service';
import {
  AddTaskSubtaskDto,
  CreateTaskDto,
  TaskCommentView,
  TaskDueKind,
  TaskListQueryDto,
  TaskListResponse,
  TaskSubtaskView,
  TaskView,
  UpdateTaskDto,
  UpdateTaskStatusDto,
} from './tasks.dto';

export interface TaskActorContext {
  id: string;
  role: UserRole;
}

const TASK_INCLUDE = {
  assignee: {
    select: {
      id: true,
      fullName: true,
      email: true,
      isActive: true,
    },
  },
  reporter: {
    select: {
      id: true,
      fullName: true,
      email: true,
      isActive: true,
    },
  },
  createdBy: {
    select: {
      id: true,
      fullName: true,
      email: true,
      isActive: true,
    },
  },
} satisfies Prisma.TaskInclude;

type TaskWithRelations = Prisma.TaskGetPayload<{ include: typeof TASK_INCLUDE }>;

@Injectable()
export class TasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activity: ActivityService,
  ) {}

  async list(query: TaskListQueryDto, actor: TaskActorContext): Promise<TaskListResponse> {
    const where = this.buildListWhere(query, actor);
    const take = Math.min(Math.max(query.take ?? 200, 1), 200);
    const skip = Math.max(query.skip ?? 0, 0);

    const [items, total] = await this.prisma.$transaction([
      this.prisma.task.findMany({
        where,
        orderBy: [
          { isArchived: 'asc' },
          { dueDate: 'asc' },
          { createdAt: 'desc' },
        ],
        include: TASK_INCLUDE,
        take,
        skip,
      }),
      this.prisma.task.count({ where }),
    ]);

    const activityMap = await this.loadActivityMap(items.map((item) => item.id));

    return {
      items: items.map((item) => this.toTaskView(item, activityMap.get(item.id) ?? [])),
      total,
    };
  }

  async get(id: string, actor: TaskActorContext): Promise<TaskView> {
    const task = await this.prisma.task.findUnique({
      where: { id },
      include: TASK_INCLUDE,
    });
    if (!task) throw new NotFoundException('Задача не найдена.');

    this.assertTaskAccess(task, actor);
    const activityMap = await this.loadActivityMap([id]);
    return this.toTaskView(task, activityMap.get(id) ?? []);
  }

  async create(dto: CreateTaskDto, actor: TaskActorContext): Promise<TaskView> {
    const assigneeId = await this.resolveAssigneeId(dto.assigneeId, actor);
    const linked = dto.linkedEntity;

    const created = await this.prisma.task.create({
      data: {
        title: dto.title.trim(),
        description: dto.description?.trim() || null,
        status: dto.status ?? 'open',
        priority: dto.priority ?? 'normal',
        assigneeId,
        reporterId: actor.id,
        startDate: dto.startDate ? new Date(dto.startDate) : null,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        estimateMinutes: dto.estimateMinutes,
        tags: dto.tags ?? [],
        linkedEntityDomain: linked?.domain,
        linkedEntityId: linked?.id,
        linkedEntityLabel: linked?.label,
        subtasks: [] as unknown as Prisma.InputJsonValue,
        comments: [] as unknown as Prisma.InputJsonValue,
        createdById: actor.id,
      },
      include: TASK_INCLUDE,
    });

    await this.activity.log({
      action: 'created',
      entityType: 'task',
      entityId: created.id,
      actorId: actor.id,
      summary: `Создана задача ${created.title}`,
    });

    const activityMap = await this.loadActivityMap([created.id]);
    return this.toTaskView(created, activityMap.get(created.id) ?? []);
  }

  async update(id: string, dto: UpdateTaskDto, actor: TaskActorContext): Promise<TaskView> {
    const existing = await this.prisma.task.findUnique({
      where: { id },
      include: TASK_INCLUDE,
    });
    if (!existing) throw new NotFoundException('Задача не найдена.');

    this.assertTaskAccess(existing, actor);

    const patch: Prisma.TaskUpdateInput = {};

    if (dto.title !== undefined) patch.title = dto.title.trim();
    if (dto.description !== undefined) patch.description = dto.description.trim() || null;
    if (dto.status !== undefined) patch.status = dto.status;
    if (dto.priority !== undefined) patch.priority = dto.priority;
    if (dto.startDate !== undefined) patch.startDate = new Date(dto.startDate);
    if (dto.dueDate !== undefined) patch.dueDate = dto.dueDate ? new Date(dto.dueDate) : null;
    if (dto.estimateMinutes !== undefined) patch.estimateMinutes = dto.estimateMinutes;
    if (dto.trackedMinutes !== undefined) patch.trackedMinutes = dto.trackedMinutes;
    if (dto.tags !== undefined) patch.tags = dto.tags;

    if (dto.linkedEntity !== undefined) {
      patch.linkedEntityDomain = dto.linkedEntity.domain;
      patch.linkedEntityId = dto.linkedEntity.id;
      patch.linkedEntityLabel = dto.linkedEntity.label;
    }

    if (dto.assigneeId !== undefined) {
      if (actor.role === 'manager' && dto.assigneeId !== actor.id) {
        throw new ForbiddenException('Менеджер не может назначить задачу другому пользователю.');
      }
      await this.ensureUserExists(dto.assigneeId);
      patch.assignee = { connect: { id: dto.assigneeId } };
    }

    if (Object.keys(patch).length === 0) {
      throw new BadRequestException('Нет изменений для сохранения.');
    }

    const updated = await this.prisma.task.update({
      where: { id },
      data: patch,
      include: TASK_INCLUDE,
    });

    await this.activity.log({
      action: 'updated',
      entityType: 'task',
      entityId: id,
      actorId: actor.id,
      summary: `Обновлена задача ${updated.title}`,
    });

    const activityMap = await this.loadActivityMap([id]);
    return this.toTaskView(updated, activityMap.get(id) ?? []);
  }

  async setStatus(id: string, dto: UpdateTaskStatusDto, actor: TaskActorContext): Promise<TaskView> {
    const existing = await this.prisma.task.findUnique({
      where: { id },
      include: TASK_INCLUDE,
    });
    if (!existing) throw new NotFoundException('Задача не найдена.');
    this.assertTaskAccess(existing, actor);

    const updated = await this.prisma.task.update({
      where: { id },
      data: { status: dto.status },
      include: TASK_INCLUDE,
    });

    await this.activity.log({
      action: 'updated',
      entityType: 'task',
      entityId: id,
      actorId: actor.id,
      summary: `Изменён статус задачи на ${dto.status}`,
      payload: { status: dto.status },
    });

    const activityMap = await this.loadActivityMap([id]);
    return this.toTaskView(updated, activityMap.get(id) ?? []);
  }

  async duplicate(id: string, actor: TaskActorContext): Promise<TaskView> {
    const source = await this.prisma.task.findUnique({
      where: { id },
      include: TASK_INCLUDE,
    });
    if (!source) throw new NotFoundException('Задача не найдена.');
    this.assertTaskAccess(source, actor);

    const duplicatedSubtasks = this.parseSubtasks(source.subtasks).map((subtask) => ({
      ...subtask,
      done: false,
    }));

    const duplicated = await this.prisma.task.create({
      data: {
        title: `${source.title} (копия)`,
        description: source.description,
        status: 'open',
        priority: source.priority,
        assigneeId: source.assigneeId,
        reporterId: actor.id,
        startDate: null,
        dueDate: null,
        estimateMinutes: source.estimateMinutes,
        trackedMinutes: 0,
        tags: source.tags,
        linkedEntityDomain: source.linkedEntityDomain,
        linkedEntityId: source.linkedEntityId,
        linkedEntityLabel: source.linkedEntityLabel,
        subtasks: duplicatedSubtasks as unknown as Prisma.InputJsonValue,
        comments: [] as unknown as Prisma.InputJsonValue,
        createdById: actor.id,
      },
      include: TASK_INCLUDE,
    });

    await this.activity.log({
      action: 'created',
      entityType: 'task',
      entityId: duplicated.id,
      actorId: actor.id,
      summary: `Создана копия задачи ${id}`,
    });

    const activityMap = await this.loadActivityMap([duplicated.id]);
    return this.toTaskView(duplicated, activityMap.get(duplicated.id) ?? []);
  }

  async archive(id: string, actor: TaskActorContext): Promise<TaskView> {
    const existing = await this.prisma.task.findUnique({
      where: { id },
      include: TASK_INCLUDE,
    });
    if (!existing) throw new NotFoundException('Задача не найдена.');
    this.assertTaskAccess(existing, actor);

    const archived = await this.prisma.task.update({
      where: { id },
      data: { isArchived: true },
      include: TASK_INCLUDE,
    });

    await this.activity.log({
      action: 'updated',
      entityType: 'task',
      entityId: id,
      actorId: actor.id,
      summary: `Задача архивирована`,
    });

    const activityMap = await this.loadActivityMap([id]);
    return this.toTaskView(archived, activityMap.get(id) ?? []);
  }

  async addSubtask(id: string, dto: AddTaskSubtaskDto, actor: TaskActorContext): Promise<TaskView> {
    const existing = await this.prisma.task.findUnique({
      where: { id },
      include: TASK_INCLUDE,
    });
    if (!existing) throw new NotFoundException('Задача не найдена.');
    this.assertTaskAccess(existing, actor);

    const subtasks = this.parseSubtasks(existing.subtasks);
    const nextSubtask: TaskSubtaskView = {
      id: `st-${subtasks.length + 1}-${randomUUID().slice(0, 4)}`,
      title: dto.title.trim(),
      assignee: dto.assignee?.trim() || existing.assignee.fullName,
      priority: dto.priority ?? 'normal',
      done: false,
    };

    const updated = await this.prisma.task.update({
      where: { id },
      data: {
        subtasks: [...subtasks, nextSubtask] as unknown as Prisma.InputJsonValue,
      },
      include: TASK_INCLUDE,
    });

    await this.activity.log({
      action: 'updated',
      entityType: 'task',
      entityId: id,
      actorId: actor.id,
      summary: `Добавлена подзадача`,
      payload: { title: nextSubtask.title },
    });

    const activityMap = await this.loadActivityMap([id]);
    return this.toTaskView(updated, activityMap.get(id) ?? []);
  }

  private buildListWhere(query: TaskListQueryDto, actor: TaskActorContext): Prisma.TaskWhereInput {
    const where: Prisma.TaskWhereInput = {};

    if (!query.includeArchived) {
      where.isArchived = false;
    }

    if (query.status) where.status = query.status;
    if (query.priority) where.priority = query.priority;

    const scope = query.scope ?? 'mine';
    if (actor.role === 'manager' || scope !== 'all') {
      where.assigneeId = actor.id;
    }

    const q = query.query?.trim();
    if (q) {
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
      ];
    }

    return where;
  }

  private async resolveAssigneeId(
    requestedAssigneeId: string | undefined,
    actor: TaskActorContext,
  ): Promise<string> {
    if (actor.role === 'manager') {
      return actor.id;
    }

    const nextAssigneeId = requestedAssigneeId ?? actor.id;
    await this.ensureUserExists(nextAssigneeId);
    return nextAssigneeId;
  }

  private async ensureUserExists(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, isActive: true },
    });
    if (!user || !user.isActive) {
      throw new BadRequestException('Исполнитель не найден или неактивен.');
    }
  }

  private assertTaskAccess(
    task: Pick<TaskWithRelations, 'assigneeId' | 'reporterId' | 'createdById'>,
    actor: TaskActorContext,
  ) {
    if (actor.role === 'admin') return;

    const canAccess =
      task.assigneeId === actor.id
      || task.reporterId === actor.id
      || task.createdById === actor.id;

    if (!canAccess) {
      throw new ForbiddenException('Недоступно');
    }
  }

  private async loadActivityMap(taskIds: string[]) {
    const map = new Map<string, TaskView['activity']>();
    if (taskIds.length === 0) return map;

    const rows = await this.prisma.activityLogEntry.findMany({
      where: {
        entityType: 'task',
        entityId: { in: taskIds },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        actor: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    });

    for (const row of rows) {
      const list = map.get(row.entityId) ?? [];
      list.push({
        id: row.id,
        actor: row.actor?.fullName ?? 'Система',
        text: row.summary,
        entity: this.extractActivityEntity(row.payload),
        time: this.formatRelative(row.createdAt),
      });
      map.set(row.entityId, list);
    }

    return map;
  }

  private toTaskView(task: TaskWithRelations, activity: TaskView['activity']): TaskView {
    const due = this.buildDue(task.dueDate);

    const linkedEntity =
      task.linkedEntityDomain && task.linkedEntityId && task.linkedEntityLabel
        ? {
            domain: task.linkedEntityDomain,
            id: task.linkedEntityId,
            label: task.linkedEntityLabel,
          }
        : undefined;

    return {
      id: task.id,
      title: task.title,
      description: task.description ?? undefined,
      status: task.status,
      priority: task.priority,
      assignee: task.assignee.fullName,
      reporter: task.reporter.fullName,
      startDate: task.startDate ? task.startDate.toISOString().slice(0, 10) : undefined,
      dueDate: task.dueDate ? task.dueDate.toISOString().slice(0, 10) : undefined,
      dueLabel: due.label,
      dueKind: due.kind,
      estimate: this.formatMinutes(task.estimateMinutes),
      tracked: this.formatMinutes(task.trackedMinutes),
      tags: task.tags,
      linkedEntity,
      subtasks: this.parseSubtasks(task.subtasks),
      comments: this.parseComments(task.comments),
      activity,
      createdAt: task.createdAt.toISOString().slice(0, 16).replace('T', ' '),
      createdBy: task.createdBy?.fullName ?? task.reporter.fullName,
    };
  }

  private buildDue(dueDate: Date | null): { kind: TaskDueKind; label: string } {
    if (!dueDate) return { kind: 'none', label: 'Без срока' };

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const dayAfterTomorrow = new Date(today);
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);

    if (dueDate.getTime() < today.getTime()) {
      return {
        kind: 'overdue',
        label: `Просрочено · ${this.formatShortDate(dueDate)}`,
      };
    }

    if (dueDate.getTime() < tomorrow.getTime()) {
      return { kind: 'today', label: 'Сегодня' };
    }

    if (dueDate.getTime() < dayAfterTomorrow.getTime()) {
      return { kind: 'tomorrow', label: 'Завтра' };
    }

    return {
      kind: 'later',
      label: this.formatShortDate(dueDate),
    };
  }

  private formatShortDate(date: Date) {
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
    });
  }

  private formatMinutes(minutes: number | null | undefined) {
    if (minutes === null || minutes === undefined) return undefined;
    if (minutes < 60) return `${minutes} мин`;

    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    if (rest === 0) return `${hours} ч`;
    return `${hours} ч ${rest} мин`;
  }

  private formatRelative(date: Date) {
    const diffMs = Date.now() - date.getTime();
    const minutes = Math.floor(diffMs / 60_000);

    if (minutes < 1) return 'только что';
    if (minutes < 60) return `${minutes} мин назад`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} ч назад`;

    return date.toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  private parseSubtasks(value: Prisma.JsonValue | null): TaskSubtaskView[] {
    if (!Array.isArray(value)) return [];

    const out: TaskSubtaskView[] = [];
    for (const row of value) {
      if (!row || typeof row !== 'object' || Array.isArray(row)) continue;
      const rec = row as Record<string, unknown>;
      if (typeof rec.id !== 'string' || typeof rec.title !== 'string') continue;

      out.push({
        id: rec.id,
        title: rec.title,
        assignee: typeof rec.assignee === 'string' ? rec.assignee : undefined,
        priority: this.toTaskPriority(rec.priority),
        done: typeof rec.done === 'boolean' ? rec.done : undefined,
      });
    }

    return out;
  }

  private parseComments(value: Prisma.JsonValue | null): TaskCommentView[] {
    if (!Array.isArray(value)) return [];

    const out: TaskCommentView[] = [];
    for (const row of value) {
      if (!row || typeof row !== 'object' || Array.isArray(row)) continue;
      const rec = row as Record<string, unknown>;
      if (typeof rec.id !== 'string' || typeof rec.text !== 'string') continue;

      out.push({
        id: rec.id,
        author: typeof rec.author === 'string' ? rec.author : 'Система',
        avatar: typeof rec.avatar === 'string' ? rec.avatar : 'S',
        color: typeof rec.color === 'string' ? rec.color : 'from-slate-400 to-slate-500',
        time: typeof rec.time === 'string' ? rec.time : 'только что',
        text: rec.text,
      });
    }

    return out;
  }

  private extractActivityEntity(payload: Prisma.JsonValue | null) {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return undefined;
    const rec = payload as Record<string, unknown>;
    const value = rec.entity;
    return typeof value === 'string' ? value : undefined;
  }

  private toTaskPriority(value: unknown): TaskPriority | undefined {
    if (value === 'urgent' || value === 'high' || value === 'normal' || value === 'low') {
      return value;
    }
    return undefined;
  }
}
