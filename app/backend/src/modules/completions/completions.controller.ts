import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/jwt-auth.guard';
import { CurrentUser } from '../../common/current-user.decorator';
import type { JwtPayload } from '../auth/jwt.strategy';
import { CompletionsService } from './completions.service';
import {
  CompletionListQueryDto,
  CreateCompletionDto,
  UpdateCompletionDto,
} from './completions.dto';
import {
  projectCompletion,
  projectCompletions,
} from '../../common/projections/completion.projection';
import { projectDepartures } from '../../common/projections/departure.projection';

@Controller('completions')
@UseGuards(JwtAuthGuard)
export class CompletionsController {
  constructor(private readonly svc: CompletionsService) {}

  @Get()
  async list(
    @Query() query: CompletionListQueryDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const result = await this.svc.list(query, { id: user.sub, role: user.role });
    return { items: projectCompletions(result.items as any), total: result.total };
  }

  @Get('pending')
  async listPending(
    @Query() query: CompletionListQueryDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const result = await this.svc.listPending(query, { id: user.sub, role: user.role });
    return { items: projectDepartures(result.items as any), total: result.total };
  }

  @Get(':id')
  async get(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    const c = await this.svc.get(id, { id: user.sub, role: user.role });
    return projectCompletion(c as any);
  }

  @Post()
  async create(
    @Body() dto: CreateCompletionDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const created = await this.svc.create(dto, { id: user.sub, role: user.role });
    const full = await this.svc.get(created.id, { id: user.sub, role: user.role });
    return projectCompletion(full as any);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateCompletionDto,
    @CurrentUser() user: JwtPayload,
  ) {
    await this.svc.update(id, dto, { id: user.sub, role: user.role });
    const full = await this.svc.get(id, { id: user.sub, role: user.role });
    return projectCompletion(full as any);
  }
}
