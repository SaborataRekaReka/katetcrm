import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { LeadsService } from './leads.service';
import {
  ChangeStageDto,
  CreateLeadDto,
  LeadListQueryDto,
  UpdateLeadDto,
} from './leads.dto';
import { JwtAuthGuard } from '../../common/jwt-auth.guard';
import { CurrentUser } from '../../common/current-user.decorator';
import { projectLead, projectLeads } from '../../common/projections/lead.projection';
import type { JwtPayload } from '../auth/jwt.strategy';

@Controller('leads')
@UseGuards(JwtAuthGuard)
export class LeadsController {
  constructor(private readonly leads: LeadsService) {}

  @Get()
  async list(@Query() query: LeadListQueryDto, @CurrentUser() user: JwtPayload) {
    const { items, total } = await this.leads.list(query, { id: user.sub, role: user.role });
    return { items: projectLeads(items), total };
  }

  @Get('duplicates')
  async duplicates(@Query('phone') phone?: string, @Query('company') company?: string) {
    const items = await this.leads.findDuplicates(phone, company);
    return projectLeads(items);
  }

  @Get(':id')
  async get(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    const lead = await this.leads.get(id, { id: user.sub, role: user.role });
    return projectLead(lead);
  }

  @Post()
  async create(@Body() dto: CreateLeadDto, @CurrentUser() user: JwtPayload) {
    const { lead, duplicates } = await this.leads.create(dto, { id: user.sub, role: user.role });
    return {
      lead: projectLead(lead),
      duplicates: projectLeads(duplicates),
    };
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateLeadDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const lead = await this.leads.update(id, dto, { id: user.sub, role: user.role });
    return projectLead(lead);
  }

  @Post(':id/stage')
  async changeStage(
    @Param('id') id: string,
    @Body() dto: ChangeStageDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const lead = await this.leads.changeStage(id, dto, { id: user.sub, role: user.role });
    return projectLead(lead);
  }
}
