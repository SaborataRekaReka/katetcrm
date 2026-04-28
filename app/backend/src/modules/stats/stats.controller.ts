import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/jwt-auth.guard';
import { CurrentUser } from '../../common/current-user.decorator';
import type { JwtPayload } from '../auth/jwt.strategy';
import { StatsService } from './stats.service';
import { StatsAnalyticsQueryDto, StatsReportsQueryDto } from './stats.dto';

@Controller('stats')
@UseGuards(JwtAuthGuard)
export class StatsController {
  constructor(private readonly stats: StatsService) {}

  @Get()
  getSummary(@CurrentUser() user: JwtPayload) {
    return this.stats.getSummary({
      id: user.sub,
      role: user.role,
    });
  }

  @Get('reports')
  getReports(@CurrentUser() user: JwtPayload, @Query() query: StatsReportsQueryDto) {
    return this.stats.getReportSlices(
      {
        id: user.sub,
        role: user.role,
      },
      query.periodDays,
    );
  }

  @Get('analytics')
  getAnalyticsView(
    @CurrentUser() user: JwtPayload,
    @Query() query: StatsAnalyticsQueryDto,
  ) {
    return this.stats.getAnalyticsView(
      {
        id: user.sub,
        role: user.role,
      },
      query.viewId,
      query.sampleTake,
    );
  }
}
