import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ClientsService } from './clients.service';
import { CreateClientDto, UpdateClientDto } from './clients.dto';
import { JwtAuthGuard } from '../../common/jwt-auth.guard';
import { CurrentUser } from '../../common/current-user.decorator';
import type { JwtPayload } from '../auth/jwt.strategy';
import {
  projectClientDetail,
  projectClientListItems,
} from '../../common/projections/client.projection';

@Controller('clients')
@UseGuards(JwtAuthGuard)
export class ClientsController {
  constructor(private readonly clients: ClientsService) {}

  @Get()
  async list(
    @Query('query') query?: string,
    @Query('take') take?: string,
    @Query('skip') skip?: string,
  ) {
    const result = await this.clients.list({
      query,
      take: take ? Number.parseInt(take, 10) : undefined,
      skip: skip ? Number.parseInt(skip, 10) : undefined,
    });
    return { items: projectClientListItems(result.items as any), total: result.total };
  }

  @Get('duplicates')
  duplicates(@Query('phone') phone?: string, @Query('company') company?: string) {
    return this.clients.findDuplicates(phone, company);
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    const c = await this.clients.get(id);
    return projectClientDetail(c as any);
  }

  @Post()
  create(@Body() dto: CreateClientDto, @CurrentUser() user: JwtPayload) {
    return this.clients.create(dto, user.sub);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateClientDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const updated = await this.clients.update(id, dto, user.sub);
    return projectClientDetail(updated as any);
  }
}
