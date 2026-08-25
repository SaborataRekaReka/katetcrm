import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Sse, UseGuards } from '@nestjs/common';
import { LeadsService } from './leads.service';
import { LeadsEventsService } from './leads-events.service';
import {
  ChangeStageDto,
  CreateLeadDto,
  LifecycleActionDto,
  LeadListQueryDto,
  UpdateLeadDto,
} from './leads.dto';
import { JwtAuthGuard } from '../../common/jwt-auth.guard';
import { CurrentUser } from '../../common/current-user.decorator';
import { Roles } from '../../common/roles.decorator';
import { RolesGuard } from '../../common/roles.guard';
import { ServiceApiScopes } from '../../common/service-api-scopes.decorator';
import { projectLead, projectLeads } from '../../common/projections/lead.projection';
import type { JwtPayload } from '../auth/jwt.strategy';

@Controller('leads')
@UseGuards(JwtAuthGuard)
export class LeadsController {
  constructor(
    private readonly leads: LeadsService,
    private readonly leadEvents: LeadsEventsService,
  ) {}

  @Sse('stream')
  @ServiceApiScopes('leads:read')
  stream(@CurrentUser() user: JwtPayload) {
    return this.leadEvents.streamLeadEvents({ id: user.sub, role: user.role });
  }

  @Get()
  @ServiceApiScopes('leads:read')
  async list(@Query() query: LeadListQueryDto, @CurrentUser() user: JwtPayload) {
    const { items, total } = await this.leads.list(query, { id: user.sub, role: user.role });
    return { items: projectLeads(items), total };
  }

  @Get('duplicates')
  @ServiceApiScopes('leads:read')
  async duplicates(@Query('phone') phone?: string, @Query('company') company?: string) {
    const items = await this.leads.findDuplicates(phone, company);
    return projectLeads(items);
  }

  @Get(':id')
  @ServiceApiScopes('leads:read')
  async get(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    const lead = await this.leads.get(id, { id: user.sub, role: user.role });
    return projectLead(lead);
  }

  @Post()
  @ServiceApiScopes('leads:create')
  async create(@Body() dto: CreateLeadDto, @CurrentUser() user: JwtPayload) {
    const { lead, duplicates } = await this.leads.create(dto, {
      id: user.sub,
      role: user.role,
      authType: user.authType,
    });
    return {
      lead: projectLead(lead),
      duplicates: projectLeads(duplicates),
    };
  }

  @Patch(':id')
  @ServiceApiScopes('leads:update')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateLeadDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const lead = await this.leads.update(id, dto, { id: user.sub, role: user.role });
    return projectLead(lead);
  }

  @Post(':id/stage')
  @ServiceApiScopes('leads:update')
  async changeStage(
    @Param('id') id: string,
    @Body() dto: ChangeStageDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const lead = await this.leads.changeStage(id, dto, { id: user.sub, role: user.role });
    return projectLead(lead);
  }

  @Post(':id/rollback')
  async rollback(
    @Param('id') id: string,
    @Body() dto: LifecycleActionDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const lead = await this.leads.rollbackStage(id, dto, { id: user.sub, role: user.role });
    return projectLead(lead);
  }

  @Post(':id/delete-current')
  async deleteCurrent(
    @Param('id') id: string,
    @Body() dto: LifecycleActionDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const lead = await this.leads.deleteCurrentRepresentation(id, dto, {
      id: user.sub,
      role: user.role,
    });
    return projectLead(lead);
  }

  @Delete(':id/chain')
  @UseGuards(RolesGuard)
  @Roles('admin')
  deleteChain(
    @Param('id') id: string,
    @Body() dto: LifecycleActionDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.leads.deleteChain(id, dto, { id: user.sub, role: user.role });
  }
}
