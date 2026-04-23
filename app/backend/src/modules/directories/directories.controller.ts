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
import { JwtAuthGuard } from '../../common/jwt-auth.guard';
import { RolesGuard } from '../../common/roles.guard';
import { Roles } from '../../common/roles.decorator';
import { CurrentUser } from '../../common/current-user.decorator';
import type { JwtPayload } from '../auth/jwt.strategy';
import { DirectoriesService } from './directories.service';
import {
  CreateEquipmentTypeDto,
  CreateEquipmentUnitDto,
  CreateSubcontractorDto,
  UpdateEquipmentTypeDto,
  UpdateEquipmentUnitDto,
  UpdateSubcontractorDto,
  UpsertEquipmentCategoryDto,
} from './directories.dto';

@Controller()
@UseGuards(JwtAuthGuard)
export class DirectoriesController {
  constructor(private readonly svc: DirectoriesService) {}

  // ---------- Equipment categories ----------
  @Get('equipment-categories')
  listCategories() {
    return this.svc.listCategories();
  }

  @Post('equipment-categories')
  @UseGuards(RolesGuard)
  @Roles('admin')
  createCategory(@Body() dto: UpsertEquipmentCategoryDto, @CurrentUser() user: JwtPayload) {
    return this.svc.createCategory(dto, user.sub);
  }

  @Patch('equipment-categories/:id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  updateCategory(
    @Param('id') id: string,
    @Body() dto: UpsertEquipmentCategoryDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.svc.updateCategory(id, dto, user.sub);
  }

  // ---------- Equipment types ----------
  @Get('equipment-types')
  listTypes(@Query('categoryId') categoryId?: string) {
    return this.svc.listTypes({ categoryId });
  }

  @Get('equipment-types/:id')
  getType(@Param('id') id: string) {
    return this.svc.getType(id);
  }

  @Post('equipment-types')
  @UseGuards(RolesGuard)
  @Roles('admin')
  createType(@Body() dto: CreateEquipmentTypeDto, @CurrentUser() user: JwtPayload) {
    return this.svc.createType(dto, user.sub);
  }

  @Patch('equipment-types/:id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  updateType(
    @Param('id') id: string,
    @Body() dto: UpdateEquipmentTypeDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.svc.updateType(id, dto, user.sub);
  }

  // ---------- Equipment units ----------
  @Get('equipment-units')
  listUnits(
    @Query('equipmentTypeId') equipmentTypeId?: string,
    @Query('status') status?: string,
  ) {
    return this.svc.listUnits({ equipmentTypeId, status });
  }

  @Get('equipment-units/:id')
  getUnit(@Param('id') id: string) {
    return this.svc.getUnit(id);
  }

  @Post('equipment-units')
  @UseGuards(RolesGuard)
  @Roles('admin')
  createUnit(@Body() dto: CreateEquipmentUnitDto, @CurrentUser() user: JwtPayload) {
    return this.svc.createUnit(dto, user.sub);
  }

  @Patch('equipment-units/:id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  updateUnit(
    @Param('id') id: string,
    @Body() dto: UpdateEquipmentUnitDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.svc.updateUnit(id, dto, user.sub);
  }

  // ---------- Subcontractors ----------
  @Get('subcontractors')
  listSubcontractors(@Query('status') status?: string, @Query('query') query?: string) {
    return this.svc.listSubcontractors({ status, query });
  }

  @Get('subcontractors/:id')
  getSubcontractor(@Param('id') id: string) {
    return this.svc.getSubcontractor(id);
  }

  @Post('subcontractors')
  @UseGuards(RolesGuard)
  @Roles('admin')
  createSubcontractor(@Body() dto: CreateSubcontractorDto, @CurrentUser() user: JwtPayload) {
    return this.svc.createSubcontractor(dto, user.sub);
  }

  @Patch('subcontractors/:id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  updateSubcontractor(
    @Param('id') id: string,
    @Body() dto: UpdateSubcontractorDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.svc.updateSubcontractor(id, dto, user.sub);
  }
}
