import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { Capabilities } from '../../common/capabilities.decorator';
import { CapabilitiesGuard } from '../../common/capabilities.guard';
import { CurrentUser } from '../../common/current-user.decorator';
import { JwtAuthGuard } from '../../common/jwt-auth.guard';
import { Roles } from '../../common/roles.decorator';
import { RolesGuard } from '../../common/roles.guard';
import type { JwtPayload } from '../auth/jwt.strategy';
import { ImportPreviewDto, RunImportDto } from './imports.dto';
import { ImportsService } from './imports.service';
@Controller('imports')
@UseGuards(JwtAuthGuard, RolesGuard, CapabilitiesGuard)
@Roles('admin')
@Capabilities('admin.imports')
export class ImportsController {
  constructor(private readonly imports: ImportsService) {}

  @Post('preview')
  preview(@Body() dto: ImportPreviewDto): Promise<unknown> {
    return this.imports.preview(dto);
  }

  @Post('run')
  run(@Body() dto: RunImportDto, @CurrentUser() user: JwtPayload): Promise<unknown> {
    return this.imports.run(dto, user.sub);
  }

  @Get(':importId/report')
  async report(@Param('importId') importId: string): Promise<unknown> {
    return this.imports.getReport(importId);
  }
}
