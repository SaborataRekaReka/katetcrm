import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/current-user.decorator';
import { JwtAuthGuard } from '../../common/jwt-auth.guard';
import { Roles } from '../../common/roles.decorator';
import { RolesGuard } from '../../common/roles.guard';
import type { JwtPayload } from '../auth/jwt.strategy';
import { UpdateWorkspaceSectionDto } from './settings.dto';
import { SettingsService } from './settings.service';

@Controller('settings')
@UseGuards(JwtAuthGuard)
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  @Get('workspace')
  @UseGuards(RolesGuard)
  @Roles('admin')
  workspaceSettings() {
    return this.settings.getWorkspaceSettings();
  }

  @Patch('workspace/sections/:sectionId')
  @UseGuards(RolesGuard)
  @Roles('admin')
  updateWorkspaceSection(
    @Param('sectionId') sectionId: string,
    @Body() dto: UpdateWorkspaceSectionDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.settings.updateWorkspaceSection(sectionId, dto, user.sub);
  }
}
