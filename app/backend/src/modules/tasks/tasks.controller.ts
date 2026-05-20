import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/current-user.decorator';
import { JwtAuthGuard } from '../../common/jwt-auth.guard';
import type { JwtPayload } from '../auth/jwt.strategy';
import {
  AddTaskSubtaskDto,
  CreateTaskDto,
  TaskListQueryDto,
  UpdateTaskDto,
  UpdateTaskStatusDto,
} from './tasks.dto';
import { TasksService } from './tasks.service';

@Controller('tasks')
@UseGuards(JwtAuthGuard)
export class TasksController {
  constructor(private readonly tasks: TasksService) {}

  @Get()
  list(@CurrentUser() user: JwtPayload, @Query() query: TaskListQueryDto) {
    return this.tasks.list(query, { id: user.sub, role: user.role });
  }

  @Get(':id')
  get(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.tasks.get(id, { id: user.sub, role: user.role });
  }

  @Post()
  create(@Body() dto: CreateTaskDto, @CurrentUser() user: JwtPayload) {
    return this.tasks.create(dto, { id: user.sub, role: user.role });
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateTaskDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.tasks.update(id, dto, { id: user.sub, role: user.role });
  }

  @Post(':id/status')
  setStatus(
    @Param('id') id: string,
    @Body() dto: UpdateTaskStatusDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.tasks.setStatus(id, dto, { id: user.sub, role: user.role });
  }

  @Post(':id/duplicate')
  duplicate(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.tasks.duplicate(id, { id: user.sub, role: user.role });
  }

  @Post(':id/archive')
  archive(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.tasks.archive(id, { id: user.sub, role: user.role });
  }

  @Post(':id/subtasks')
  addSubtask(
    @Param('id') id: string,
    @Body() dto: AddTaskSubtaskDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.tasks.addSubtask(id, dto, { id: user.sub, role: user.role });
  }
}
