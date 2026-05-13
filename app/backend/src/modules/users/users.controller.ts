import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Capabilities } from '../../common/capabilities.decorator';
import { CapabilitiesGuard } from '../../common/capabilities.guard';
import { CurrentUser } from '../../common/current-user.decorator';
import { Roles } from '../../common/roles.decorator';
import { RolesGuard } from '../../common/roles.guard';
import { JwtAuthGuard } from '../../common/jwt-auth.guard';
import type { JwtPayload } from '../auth/jwt.strategy';
import { UsersService } from './users.service';
import {
  CreateUserDto,
  ListUsersQueryDto,
  UpdatePermissionCapabilityDto,
  UpdateUserDto,
} from './users.dto';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  @UseGuards(RolesGuard, CapabilitiesGuard)
  @Roles('admin')
  @Capabilities('admin.users')
  listUsers(@Query() query: ListUsersQueryDto) {
    return this.users.listUsers(query);
  }

  @Get('managers')
  listManagers() {
    return this.users.listManagers();
  }

  @Get('permissions-matrix')
  @UseGuards(RolesGuard, CapabilitiesGuard)
  @Roles('admin')
  @Capabilities('admin.permissions')
  permissionsMatrix() {
    return this.users.getPermissionsMatrix();
  }

  @Post()
  @UseGuards(RolesGuard, CapabilitiesGuard)
  @Roles('admin')
  @Capabilities('admin.users')
  createUser(@Body() dto: CreateUserDto, @CurrentUser() user: JwtPayload) {
    return this.users.createUser(dto, user.sub);
  }

  @Patch('permissions-matrix/:capabilityId')
  @UseGuards(RolesGuard, CapabilitiesGuard)
  @Roles('admin')
  @Capabilities('admin.permissions')
  updatePermissionCapability(
    @Param('capabilityId') capabilityId: string,
    @Body() dto: UpdatePermissionCapabilityDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.users.updatePermissionCapability(capabilityId, dto, user.sub);
  }

  @Patch(':id')
  @UseGuards(RolesGuard, CapabilitiesGuard)
  @Roles('admin')
  @Capabilities('admin.users')
  updateUser(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.users.updateUser(id, dto, user.sub);
  }
}
