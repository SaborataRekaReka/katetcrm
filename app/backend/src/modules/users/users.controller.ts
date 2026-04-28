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
  @UseGuards(RolesGuard)
  @Roles('admin')
  listUsers(@Query() query: ListUsersQueryDto) {
    return this.users.listUsers(query);
  }

  @Get('managers')
  listManagers() {
    return this.users.listManagers();
  }

  @Get('permissions-matrix')
  @UseGuards(RolesGuard)
  @Roles('admin')
  permissionsMatrix() {
    return this.users.getPermissionsMatrix();
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('admin')
  createUser(@Body() dto: CreateUserDto) {
    return this.users.createUser(dto);
  }

  @Patch('permissions-matrix/:capabilityId')
  @UseGuards(RolesGuard)
  @Roles('admin')
  updatePermissionCapability(
    @Param('capabilityId') capabilityId: string,
    @Body() dto: UpdatePermissionCapabilityDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.users.updatePermissionCapability(capabilityId, dto, user.sub);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  updateUser(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.users.updateUser(id, dto);
  }
}
