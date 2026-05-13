import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ActivityService } from './activity.service';
import { JwtAuthGuard } from '../../common/jwt-auth.guard';
import { ActivitySearchQueryDto } from './activity.dto';
import { Roles } from '../../common/roles.decorator';
import { RolesGuard } from '../../common/roles.guard';

@Controller('activity')
@UseGuards(JwtAuthGuard)
export class ActivityController {
  constructor(private readonly activity: ActivityService) {}

  @Get('search')
  @UseGuards(RolesGuard)
  @Roles('admin')
  listFiltered(@Query() query: ActivitySearchQueryDto) {
    return this.activity.listFiltered({
      entityType: query.entityType,
      entityId: query.entityId,
      actorId: query.actorId,
      action: query.action,
      module: query.module,
      query: query.query,
      from: query.from ? new Date(query.from) : undefined,
      to: query.to ? new Date(query.to) : undefined,
      take: query.take,
      skip: query.skip,
    });
  }

  @Get()
  list(
    @Query('entityType') entityType?: string,
    @Query('entityId') entityId?: string,
    @Query('take') take?: string,
  ) {
    const n = take ? Math.min(Number.parseInt(take, 10) || 100, 500) : 100;
    if (entityType && entityId) return this.activity.listForEntity(entityType, entityId, n);
    return this.activity.listRecent(n);
  }
}
