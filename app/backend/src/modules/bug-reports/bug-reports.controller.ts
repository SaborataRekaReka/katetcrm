import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../../common/current-user.decorator';
import { JwtAuthGuard } from '../../common/jwt-auth.guard';
import { Roles } from '../../common/roles.decorator';
import { RolesGuard } from '../../common/roles.guard';
import type { JwtPayload } from '../auth/jwt.strategy';
import {
  BugReportListQueryDto,
  CreateBugReportDto,
  UpdateBugReportStatusDto,
} from './bug-reports.dto';
import { BugReportsService } from './bug-reports.service';

@Controller('bug-reports')
@UseGuards(JwtAuthGuard)
export class BugReportsController {
  constructor(private readonly bugReports: BugReportsService) {}

  @Post()
  create(@Body() dto: CreateBugReportDto, @CurrentUser() user: JwtPayload) {
    return this.bugReports.create(dto, { id: user.sub, role: user.role });
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles('admin')
  list(@Query() query: BugReportListQueryDto, @CurrentUser() user: JwtPayload) {
    return this.bugReports.list(query, { id: user.sub, role: user.role });
  }

  @Post(':id/status')
  @UseGuards(RolesGuard)
  @Roles('admin')
  setStatus(
    @Param('id') id: string,
    @Body() dto: UpdateBugReportStatusDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.bugReports.setStatus(id, dto, { id: user.sub, role: user.role });
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.bugReports.remove(id, { id: user.sub, role: user.role });
  }
}
