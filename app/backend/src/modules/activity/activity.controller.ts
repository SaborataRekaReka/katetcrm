import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ActivityService } from './activity.service';
import { JwtAuthGuard } from '../../common/jwt-auth.guard';

@Controller('activity')
@UseGuards(JwtAuthGuard)
export class ActivityController {
  constructor(private readonly activity: ActivityService) {}

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
