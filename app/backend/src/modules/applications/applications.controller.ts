import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/jwt-auth.guard';
import { CurrentUser } from '../../common/current-user.decorator';
import type { JwtPayload } from '../auth/jwt.strategy';
import { ApplicationsService } from './applications.service';
import {
  ApplicationListQueryDto,
  CancelApplicationDto,
  CreateApplicationItemDto,
  UpdateApplicationDto,
  UpdateApplicationItemDto,
} from './applications.dto';
import {
  projectApplication,
  projectApplications,
  projectApplicationItem,
} from '../../common/projections/application.projection';

@Controller()
@UseGuards(JwtAuthGuard)
export class ApplicationsController {
  constructor(private readonly svc: ApplicationsService) {}

  @Get('applications')
  async list(@Query() query: ApplicationListQueryDto, @CurrentUser() user: JwtPayload) {
    const { items, total } = await this.svc.list(query, { id: user.sub, role: user.role });
    return { items: projectApplications(items), total };
  }

  @Get('applications/:id')
  async get(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    const app = await this.svc.get(id, { id: user.sub, role: user.role });
    return projectApplication(app);
  }

  @Patch('applications/:id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateApplicationDto,
    @CurrentUser() user: JwtPayload,
  ) {
    await this.svc.update(id, dto, { id: user.sub, role: user.role });
    const app = await this.svc.get(id, { id: user.sub, role: user.role });
    return projectApplication(app);
  }

  @Post('applications/:id/items')
  async addItem(
    @Param('id') id: string,
    @Body() dto: CreateApplicationItemDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const item = await this.svc.addItem(id, dto, { id: user.sub, role: user.role });
    const full = await this.svc.getItem(item.id, { id: user.sub, role: user.role });
    return projectApplicationItem(full);
  }

  @Get('application-items/:itemId')
  async getItem(@Param('itemId') itemId: string, @CurrentUser() user: JwtPayload) {
    const item = await this.svc.getItem(itemId, { id: user.sub, role: user.role });
    return projectApplicationItem(item);
  }

  @Patch('application-items/:itemId')
  async updateItem(
    @Param('itemId') itemId: string,
    @Body() dto: UpdateApplicationItemDto,
    @CurrentUser() user: JwtPayload,
  ) {
    await this.svc.updateItem(itemId, dto, { id: user.sub, role: user.role });
    const item = await this.svc.getItem(itemId, { id: user.sub, role: user.role });
    return projectApplicationItem(item);
  }

  @Delete('application-items/:itemId')
  deleteItem(@Param('itemId') itemId: string, @CurrentUser() user: JwtPayload) {
    return this.svc.deleteItem(itemId, { id: user.sub, role: user.role });
  }

  @Post('applications/:id/cancel')
  async cancel(
    @Param('id') id: string,
    @Body() dto: CancelApplicationDto,
    @CurrentUser() user: JwtPayload,
  ) {
    await this.svc.cancel(id, dto.reason, { id: user.sub, role: user.role });
    const app = await this.svc.get(id, { id: user.sub, role: user.role });
    return projectApplication(app);
  }
}
