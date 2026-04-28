import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
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
    private parseAvailabilityWindow(params: {
      plannedStart?: string;
      plannedEnd?: string;
    }): { start: Date; end: Date } | null {
      const startRaw = params.plannedStart?.trim();
      const endRaw = params.plannedEnd?.trim();

      if (!startRaw && !endRaw) return null;
      if (!startRaw || !endRaw) {
        throw new BadRequestException('Для расчёта доступности нужны plannedStart и plannedEnd');
      }

      const start = new Date(startRaw);
      const end = new Date(endRaw);
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        throw new BadRequestException('plannedStart/plannedEnd должны быть валидными ISO-датами');
      }
      if (start >= end) {
        throw new BadRequestException('plannedStart должен быть меньше plannedEnd');
      }

      return { start, end };
    }

  constructor(
    private readonly prisma: PrismaService,
    private readonly activity: ActivityService,
  ) {}

  // ---------- Equipment categories ----------
  listCategories() {
    return this.prisma.equipmentCategory.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { types: true } },
      },
    });
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

  async deleteCategory(id: string, actorId: string | null) {
    const existing = await this.prisma.equipmentCategory.findUnique({
      where: { id },
      include: {
        _count: { select: { types: true } },
      },
    });
    if (!existing) throw new NotFoundException('Категория техники не найдена');
    if (existing._count.types > 0) {
      throw new BadRequestException(
        'Нельзя удалить категорию: сначала удалите или переназначьте связанные типы техники',
      );
    }

    await this.prisma.equipmentCategory.delete({ where: { id } });
    await this.activity.log({
      action: 'updated',
      entityType: 'equipment_category',
      entityId: id,
      summary: `Удалена категория ${existing.name}`,
      actorId,
    });

    return { ok: true };
  }

  // ---------- Equipment types ----------
  async listTypes(params: { categoryId?: string }) {
    const types = await this.prisma.equipmentType.findMany({
      where: params.categoryId ? { categoryId: params.categoryId } : undefined,
      orderBy: { name: 'asc' },
      include: {
        category: true,
        _count: {
          select: {
            units: true,
            applicationItems: true,
            reservations: true,
          },
        },
      },
    });

    const typeIds = types.map((type) => type.id);
    if (typeIds.length === 0) return types;

    const activeByType = await this.prisma.applicationItem.findMany({
      where: {
        equipmentTypeId: { in: typeIds },
        application: { isActive: true },
      },
      select: {
        equipmentTypeId: true,
        applicationId: true,
      },
      distinct: ['equipmentTypeId', 'applicationId'],
    });

    const activeCountMap = new Map<string, number>();
    for (const row of activeByType) {
      if (!row.equipmentTypeId) continue;
      activeCountMap.set(row.equipmentTypeId, (activeCountMap.get(row.equipmentTypeId) ?? 0) + 1);
    }

    return types.map((type) => ({
      ...type,
      activeApplicationsCount: activeCountMap.get(type.id) ?? 0,
    }));
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

  async deleteType(id: string, actorId: string | null) {
    const existing = await this.prisma.equipmentType.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            units: true,
            applicationItems: true,
            reservations: true,
          },
        },
      },
    });
    if (!existing) throw new NotFoundException('Тип техники не найден');

    const hasDependencies =
      existing._count.units > 0
      || existing._count.applicationItems > 0
      || existing._count.reservations > 0;
    if (hasDependencies) {
      throw new BadRequestException(
        'Нельзя удалить тип техники: есть связанные единицы, позиции заявок или брони',
      );
    }

    await this.prisma.equipmentType.delete({ where: { id } });
    await this.activity.log({
      action: 'updated',
      entityType: 'equipment_type',
      entityId: id,
      summary: `Удалён тип техники ${existing.name}`,
      actorId,
    });

    return { ok: true };
  }

  // ---------- Equipment units ----------
  async listUnits(params: {
    equipmentTypeId?: string;
    status?: string;
    plannedStart?: string;
    plannedEnd?: string;
    excludeReservationId?: string;
  }) {
    const availabilityWindow = this.parseAvailabilityWindow(params);
    const availabilityWhere = availabilityWindow
      ? {
          none: {
            isActive: true,
            ...(params.excludeReservationId
              ? { id: { not: params.excludeReservationId } }
              : {}),
            plannedStart: { lt: availabilityWindow.end },
            plannedEnd: { gt: availabilityWindow.start },
          },
        }
      : undefined;

    const units = await this.prisma.equipmentUnit.findMany({
      where: {
        equipmentTypeId: params.equipmentTypeId,
        status: params.status as any,
        reservations: availabilityWhere,
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

    const unitIds = units.map((unit) => unit.id);
    if (unitIds.length === 0) return units;

    const activeBookings = await this.prisma.reservation.groupBy({
      by: ['equipmentUnitId'],
      where: {
        isActive: true,
        equipmentUnitId: { in: unitIds },
      },
      _count: { _all: true },
    });

    const activeCountMap = new Map<string, number>();
    for (const row of activeBookings) {
      if (!row.equipmentUnitId) continue;
      activeCountMap.set(row.equipmentUnitId, row._count._all);
    }

    return units.map((unit) => ({
      ...unit,
      activeBookingsCount: activeCountMap.get(unit.id) ?? 0,
    }));
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

  async deleteUnit(id: string, actorId: string | null) {
    const existing = await this.prisma.equipmentUnit.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            reservations: true,
          },
        },
      },
    });
    if (!existing) throw new NotFoundException('Единица техники не найдена');
    if (existing._count.reservations > 0) {
      throw new BadRequestException(
        'Нельзя удалить единицу техники: она уже использовалась в бронированиях. Переведите запись в архив.',
      );
    }

    await this.prisma.equipmentUnit.delete({ where: { id } });
    await this.activity.log({
      action: 'updated',
      entityType: 'equipment_unit',
      entityId: id,
      summary: `Удалена единица техники ${existing.name}`,
      actorId,
    });

    return { ok: true };
  }

  // ---------- Subcontractors ----------
  async listSubcontractors(params: {
    status?: string;
    query?: string;
    plannedStart?: string;
    plannedEnd?: string;
    excludeReservationId?: string;
  }) {
    const q = params.query?.trim();
    const availabilityWindow = this.parseAvailabilityWindow(params);
    const availabilityWhere = availabilityWindow
      ? {
          none: {
            isActive: true,
            ...(params.excludeReservationId
              ? { id: { not: params.excludeReservationId } }
              : {}),
            plannedStart: { lt: availabilityWindow.end },
            plannedEnd: { gt: availabilityWindow.start },
          },
        }
      : undefined;

    const items = await this.prisma.subcontractor.findMany({
      where: {
        status: params.status as any,
        reservations: availabilityWhere,
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

    const subcontractorIds = items.map((item) => item.id);
    if (subcontractorIds.length === 0) return items;

    const activeBookings = await this.prisma.reservation.groupBy({
      by: ['subcontractorId'],
      where: {
        isActive: true,
        subcontractorId: { in: subcontractorIds },
      },
      _count: { _all: true },
    });

    const activeCountMap = new Map<string, number>();
    for (const row of activeBookings) {
      if (!row.subcontractorId) continue;
      activeCountMap.set(row.subcontractorId, row._count._all);
    }

    return items.map((item) => ({
      ...item,
      activeBookingsCount: activeCountMap.get(item.id) ?? 0,
    }));
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

  async deleteSubcontractor(id: string, actorId: string | null) {
    const existing = await this.prisma.subcontractor.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            reservations: true,
          },
        },
      },
    });
    if (!existing) throw new NotFoundException('Субподрядчик не найден');
    if (existing._count.reservations > 0) {
      throw new BadRequestException(
        'Нельзя удалить подрядчика: есть связанные бронирования. Переведите запись в архив.',
      );
    }

    await this.prisma.subcontractor.delete({ where: { id } });
    await this.activity.log({
      action: 'updated',
      entityType: 'subcontractor',
      entityId: id,
      summary: `Удалён субподрядчик ${existing.name}`,
      actorId,
    });

    return { ok: true };
  }
}
