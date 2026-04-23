import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ActivityService } from '../activity/activity.service';
import {
  CreateEquipmentTypeDto,
  CreateEquipmentUnitDto,
  CreateSubcontractorDto,
  UpdateEquipmentTypeDto,
  UpdateEquipmentUnitDto,
  UpdateSubcontractorDto,
  UpsertEquipmentCategoryDto,
} from './directories.dto';

@Injectable()
export class DirectoriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activity: ActivityService,
  ) {}

  // ---------- Equipment categories ----------
  listCategories() {
    return this.prisma.equipmentCategory.findMany({ orderBy: { name: 'asc' } });
  }

  async createCategory(dto: UpsertEquipmentCategoryDto, actorId: string | null) {
    const created = await this.prisma.equipmentCategory.create({ data: { name: dto.name } });
    await this.activity.log({
      action: 'created',
      entityType: 'equipment_category',
      entityId: created.id,
      summary: `Создана категория ${created.name}`,
      actorId,
    });
    return created;
  }

  async updateCategory(id: string, dto: UpsertEquipmentCategoryDto, actorId: string | null) {
    const updated = await this.prisma.equipmentCategory.update({
      where: { id },
      data: { name: dto.name },
    });
    await this.activity.log({
      action: 'updated',
      entityType: 'equipment_category',
      entityId: id,
      summary: `Обновлена категория ${updated.name}`,
      actorId,
    });
    return updated;
  }

  // ---------- Equipment types ----------
  listTypes(params: { categoryId?: string }) {
    return this.prisma.equipmentType.findMany({
      where: params.categoryId ? { categoryId: params.categoryId } : undefined,
      orderBy: { name: 'asc' },
      include: { category: true, _count: { select: { units: true } } },
    });
  }

  async getType(id: string) {
    const t = await this.prisma.equipmentType.findUnique({
      where: { id },
      include: { category: true, units: { orderBy: { name: 'asc' } } },
    });
    if (!t) throw new NotFoundException('Тип техники не найден');
    return t;
  }

  async createType(dto: CreateEquipmentTypeDto, actorId: string | null) {
    const created = await this.prisma.equipmentType.create({
      data: { name: dto.name, description: dto.description, categoryId: dto.categoryId },
    });
    await this.activity.log({
      action: 'created',
      entityType: 'equipment_type',
      entityId: created.id,
      summary: `Создан тип техники ${created.name}`,
      actorId,
    });
    return created;
  }

  async updateType(id: string, dto: UpdateEquipmentTypeDto, actorId: string | null) {
    const updated = await this.prisma.equipmentType.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        categoryId: dto.categoryId ?? undefined,
      },
    });
    await this.activity.log({
      action: 'updated',
      entityType: 'equipment_type',
      entityId: id,
      summary: `Обновлён тип техники ${updated.name}`,
      actorId,
    });
    return updated;
  }

  // ---------- Equipment units ----------
  listUnits(params: { equipmentTypeId?: string; status?: string }) {
    return this.prisma.equipmentUnit.findMany({
      where: {
        equipmentTypeId: params.equipmentTypeId,
        status: params.status as any,
      },
      orderBy: { name: 'asc' },
      include: {
        equipmentType: {
          select: {
            id: true,
            name: true,
            category: { select: { id: true, name: true } },
          },
        },
      },
    });
  }

  async getUnit(id: string) {
    const u = await this.prisma.equipmentUnit.findUnique({
      where: { id },
      include: { equipmentType: true },
    });
    if (!u) throw new NotFoundException('Единица техники не найдена');
    return u;
  }

  async createUnit(dto: CreateEquipmentUnitDto, actorId: string | null) {
    const created = await this.prisma.equipmentUnit.create({
      data: {
        name: dto.name,
        equipmentTypeId: dto.equipmentTypeId,
        year: dto.year,
        plateNumber: dto.plateNumber,
        notes: dto.notes,
        status: dto.status ?? 'active',
      },
    });
    await this.activity.log({
      action: 'created',
      entityType: 'equipment_unit',
      entityId: created.id,
      summary: `Создана единица техники ${created.name}`,
      actorId,
    });
    return created;
  }

  async updateUnit(id: string, dto: UpdateEquipmentUnitDto, actorId: string | null) {
    const updated = await this.prisma.equipmentUnit.update({
      where: { id },
      data: dto,
    });
    await this.activity.log({
      action: 'updated',
      entityType: 'equipment_unit',
      entityId: id,
      summary: `Обновлена единица техники ${updated.name}`,
      actorId,
    });
    return updated;
  }

  // ---------- Subcontractors ----------
  listSubcontractors(params: { status?: string; query?: string }) {
    const q = params.query?.trim();
    return this.prisma.subcontractor.findMany({
      where: {
        status: params.status as any,
        ...(q
          ? {
              OR: [
                { name: { contains: q, mode: 'insensitive' } },
                { specialization: { contains: q, mode: 'insensitive' } },
                { region: { contains: q, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: { name: 'asc' },
    });
  }

  async getSubcontractor(id: string) {
    const s = await this.prisma.subcontractor.findUnique({ where: { id } });
    if (!s) throw new NotFoundException('Субподрядчик не найден');
    return s;
  }

  async createSubcontractor(dto: CreateSubcontractorDto, actorId: string | null) {
    const created = await this.prisma.subcontractor.create({
      data: { ...dto, status: dto.status ?? 'active' },
    });
    await this.activity.log({
      action: 'created',
      entityType: 'subcontractor',
      entityId: created.id,
      summary: `Создан субподрядчик ${created.name}`,
      actorId,
    });
    return created;
  }

  async updateSubcontractor(id: string, dto: UpdateSubcontractorDto, actorId: string | null) {
    const updated = await this.prisma.subcontractor.update({ where: { id }, data: dto });
    await this.activity.log({
      action: 'updated',
      entityType: 'subcontractor',
      entityId: id,
      summary: `Обновлён субподрядчик ${updated.name}`,
      actorId,
    });
    return updated;
  }
}
