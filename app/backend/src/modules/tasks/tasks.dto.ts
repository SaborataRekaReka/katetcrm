import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { TaskPriority, TaskStatus } from '@prisma/client';

export const TASK_SCOPES = ['mine', 'all'] as const;
export type TaskScope = (typeof TASK_SCOPES)[number];

export const TASK_DUE_KINDS = ['overdue', 'today', 'tomorrow', 'later', 'none'] as const;
export type TaskDueKind = (typeof TASK_DUE_KINDS)[number];

export class TaskLinkedEntityDto {
  @IsString()
  @MaxLength(40)
  domain!: string;

  @IsString()
  @MaxLength(64)
  id!: string;

  @IsString()
  @MaxLength(240)
  label!: string;
}

export class TaskSubtaskInputDto {
  @IsString()
  @MinLength(2)
  @MaxLength(240)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  assignee?: string;

  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @IsOptional()
  @IsBoolean()
  done?: boolean;
}

export class TaskListQueryDto {
  @IsOptional()
  @IsIn(TASK_SCOPES)
  scope?: TaskScope;

  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  query?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  take?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(5000)
  skip?: number;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') return undefined;
    if (value === true || value === 'true') return true;
    if (value === false || value === 'false') return false;
    return value;
  })
  @IsBoolean()
  includeArchived?: boolean;
}

export class CreateTaskDto {
  @IsString()
  @MinLength(2)
  @MaxLength(240)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  description?: string;

  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @IsOptional()
  @IsString()
  assigneeId?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @Transform(({ value }) => (value === '' ? null : value))
  @IsDateString()
  dueDate?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100000)
  estimateMinutes?: number;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  @MaxLength(40, { each: true })
  tags?: string[];

  @IsOptional()
  @ValidateNested()
  @Type(() => TaskLinkedEntityDto)
  linkedEntity?: TaskLinkedEntityDto;
}

export class UpdateTaskDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(240)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  description?: string;

  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @IsOptional()
  @IsString()
  assigneeId?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @Transform(({ value }) => (value === '' ? null : value))
  @IsDateString()
  dueDate?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100000)
  estimateMinutes?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1000000)
  trackedMinutes?: number;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  @MaxLength(40, { each: true })
  tags?: string[];

  @IsOptional()
  @ValidateNested()
  @Type(() => TaskLinkedEntityDto)
  linkedEntity?: TaskLinkedEntityDto;
}

export class UpdateTaskStatusDto {
  @IsEnum(TaskStatus)
  status!: TaskStatus;
}

export class AddTaskSubtaskDto {
  @IsString()
  @MinLength(2)
  @MaxLength(240)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  assignee?: string;

  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;
}

export interface TaskSubtaskView {
  id: string;
  title: string;
  assignee?: string;
  priority?: TaskPriority;
  done?: boolean;
}

export interface TaskCommentView {
  id: string;
  author: string;
  avatar: string;
  color: string;
  time: string;
  text: string;
}

export interface TaskActivityView {
  id: string;
  actor: string;
  text: string;
  entity?: string;
  time: string;
}

export interface TaskView {
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
  linkedEntity?: TaskLinkedEntityDto;
  subtasks: TaskSubtaskView[];
  comments: TaskCommentView[];
  activity: TaskActivityView[];
  createdAt: string;
  createdBy: string;
}

export interface TaskListResponse {
  items: TaskView[];
  total: number;
}
