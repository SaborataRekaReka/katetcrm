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
import { DeparturesService } from './departures.service';
import {
  CancelDepartureDto,
  CompleteDepartureDto,
  CreateDepartureDto,
  DepartureListQueryDto,
  UpdateDepartureDto,
} from './departures.dto';
import {
  projectDeparture,
  projectDepartures,
} from '../../common/projections/departure.projection';
import { CompletionsService } from '../completions/completions.service';

@Controller('departures')
@UseGuards(JwtAuthGuard)
export class DeparturesController {
  constructor(
    private readonly svc: DeparturesService,
    private readonly completions: CompletionsService,
  ) {}

  @Get()
  async list(
    @Query() query: DepartureListQueryDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const result = await this.svc.list(query, { id: user.sub, role: user.role });
    return { items: projectDepartures(result.items as any), total: result.total };
  }

  @Get(':id')
  async get(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    const d = await this.svc.get(id, { id: user.sub, role: user.role });
    return projectDeparture(d as any);
  }

  @Post()
  async create(
    @Body() dto: CreateDepartureDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const created = await this.svc.create(dto, { id: user.sub, role: user.role });
    const full = await this.svc.get(created.id, { id: user.sub, role: user.role });
    return projectDeparture(full as any);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateDepartureDto,
    @CurrentUser() user: JwtPayload,
  ) {
    await this.svc.update(id, dto, { id: user.sub, role: user.role });
    const full = await this.svc.get(id, { id: user.sub, role: user.role });
    return projectDeparture(full as any);
  }

  @Post(':id/start')
  async start(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    await this.svc.start(id, { id: user.sub, role: user.role });
    const full = await this.svc.get(id, { id: user.sub, role: user.role });
    return projectDeparture(full as any);
  }

  @Post(':id/arrive')
  async arrive(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    await this.svc.arrive(id, { id: user.sub, role: user.role });
    const full = await this.svc.get(id, { id: user.sub, role: user.role });
    return projectDeparture(full as any);
  }

  @Post(':id/cancel')
  async cancel(
    @Param('id') id: string,
    @Body() dto: CancelDepartureDto,
    @CurrentUser() user: JwtPayload,
  ) {
    await this.svc.cancel(id, dto, { id: user.sub, role: user.role });
    const full = await this.svc.get(id, { id: user.sub, role: user.role });
    return projectDeparture(full as any);
  }

  @Post(':id/complete')
  async complete(
    @Param('id') id: string,
    @Body() dto: CompleteDepartureDto,
    @CurrentUser() user: JwtPayload,
  ) {
    await this.completions.create(
      {
        departureId: id,
        outcome: dto.outcome,
        completionNote: dto.completionNote,
        unqualifiedReason: dto.unqualifiedReason,
      },
      { id: user.sub, role: user.role },
    );
    const full = await this.svc.get(id, { id: user.sub, role: user.role });
    return projectDeparture(full as any);
  }
}
