import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { Capabilities } from '../../common/capabilities.decorator';
import { CapabilitiesGuard } from '../../common/capabilities.guard';
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
  @UseGuards(RolesGuard, CapabilitiesGuard)
  @Roles('admin')
  @Capabilities('admin.settings')
  workspaceSettings() {
    return this.settings.getWorkspaceSettings();
  }

  @Patch('workspace/sections/:sectionId')
  @UseGuards(RolesGuard, CapabilitiesGuard)
  @Roles('admin')
  @Capabilities('admin.settings')
  updateWorkspaceSection(
    @Param('sectionId') sectionId: string,
    @Body() dto: UpdateWorkspaceSectionDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.settings.updateWorkspaceSection(sectionId, dto, user.sub);
  }
}
