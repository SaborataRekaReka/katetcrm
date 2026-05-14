import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ActivityService } from '../activity/activity.service';
import { projectApplication } from '../../common/projections/application.projection';
import {
  ApplicationListQueryDto,
  CreateApplicationItemDto,
  UpdateApplicationDto,
  UpdateApplicationItemDto,
} from './applications.dto';

export interface ActorContext {
  id: string;
  role: UserRole;
}

@Injectable()
export class ApplicationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activity: ActivityService,
  ) {}

  async list(params: ApplicationListQueryDto, actor: ActorContext) {
    const where: Prisma.ApplicationWhereInput = {};
    if (params.clientId) where.clientId = params.clientId;
    if (params.leadId) where.leadId = params.leadId;
    if (params.stage) where.stage = params.stage;
    if (params.isActive !== undefined) {
      where.isActive = params.isActive === 'true' || params.isActive === '1';
    }
    if (actor.role === 'manager' && params.scope !== 'all') {
      where.responsibleManagerId = actor.id;
    } else if (params.managerId) {
      where.responsibleManagerId = params.managerId;
    }
    const q = params.query?.trim();
    if (q) {
      where.OR = [
        { number: { contains: q, mode: 'insensitive' } },
        { address: { contains: q, mode: 'insensitive' } },
        { comment: { contains: q, mode: 'insensitive' } },
        { client: { name: { contains: q, mode: 'insensitive' } } },
        { client: { company: { contains: q, mode: 'insensitive' } } },
        { client: { phone: { contains: q, mode: 'insensitive' } } },
        { responsibleManager: { fullName: { contains: q, mode: 'insensitive' } } },
        {
          items: {
            some: {
              equipmentTypeLabel: { contains: q, mode: 'insensitive' },
            },
          },
        },
      ];
    }
    const items = await this.prisma.application.findMany({
      where,
      orderBy: [{ lastActivityAt: 'desc' }],
      take: 500,
      include: {
        client: { select: { id: true, name: true, company: true, phone: true } },
        lead: { select: { id: true, stage: true } },
        responsibleManager: { select: { id: true, fullName: true } },
        items: {
          orderBy: { createdAt: 'asc' },
          include: {
            equipmentType: true,
            reservations: {
              orderBy: [{ createdAt: 'desc' }],
              take: 3,
              include: {
                equipmentUnit: true,
                subcontractor: true,
                departures: {
                  orderBy: [{ scheduledAt: 'desc' }],
                  take: 3,
                  include: {
                    completion: { select: { id: true } },
                  },
                },
              },
            },
          },
        },
        _count: { select: { items: true } },
      },
    });

    const hasDerivedFilters =
      Boolean(params.sourcing) ||
      Boolean(params.equipment?.trim()) ||
      Boolean(params.readinessReservation) ||
      typeof params.readyForDeparture === 'boolean' ||
      typeof params.conflict === 'boolean';

    const filteredItems = hasDerivedFilters
      ? items.filter((item) => this.matchesListDerivedFilters(projectApplication(item as any), params))
      : items;

    return { items: filteredItems, total: filteredItems.length };
  }

  private matchesListDerivedFilters(
    projected: ReturnType<typeof projectApplication>,
    params: ApplicationListQueryDto,
  ): boolean {
    if (params.sourcing && projected.dominantSourcing !== params.sourcing) {
      return false;
    }

    if (params.equipment?.trim()) {
      const needle = params.equipment.trim().toLowerCase();
      const hasEquipment = projected.positions.some((position) =>
        position.equipmentTypeLabel.toLowerCase().includes(needle),
      );
      if (!hasEquipment) return false;
    }

    if (params.readinessReservation) {
      if (
        params.readinessReservation === 'ready'
        && projected.applicationGroup !== 'ready_for_departure'
      ) {
        return false;
      }

      if (
        params.readinessReservation === 'waiting'
        && projected.applicationGroup !== 'in_reservation_work'
      ) {
        return false;
      }

      if (
        params.readinessReservation === 'no_data'
        && projected.applicationGroup !== 'no_reservation'
      ) {
        return false;
      }
    }

    if (
      typeof params.readyForDeparture === 'boolean'
      && projected.readyForDeparture !== params.readyForDeparture
    ) {
      return false;
    }

    if (typeof params.conflict === 'boolean' && projected.hasAnyConflict !== params.conflict) {
      return false;
    }

    return true;
  }

  async get(id: string, actor: ActorContext) {
    const app = await this.prisma.application.findUnique({
      where: { id },
      include: {
        client: true,
        lead: true,
        responsibleManager: { select: { id: true, fullName: true, email: true } },
        items: {
          orderBy: { createdAt: 'asc' },
          include: {
            equipmentType: true,
            reservations: {
              orderBy: [{ createdAt: 'desc' }],
              take: 3,
              include: {
                equipmentUnit: true,
                subcontractor: true,
                departures: {
                  orderBy: [{ scheduledAt: 'desc' }],
                  take: 3,
                  include: {
                    completion: { select: { id: true } },
                  },
                },
              },
            },
          },
        },
      },
    });
    if (!app) throw new NotFoundException('Заявка не найдена');
    if (actor.role === 'manager' && app.responsibleManagerId !== actor.id) {
      throw new ForbiddenException('Недоступно');
    }
    return app;
  }

  async update(id: string, dto: UpdateApplicationDto, actor: ActorContext) {
    const existing = await this.get(id, actor);
    if (!existing.isActive) {
      throw new BadRequestException('Заявка неактивна и не может быть изменена');
    }
    const updated = await this.prisma.application.update({
      where: { id },
      data: {
        ...dto,
        requestedDate: dto.requestedDate ? new Date(dto.requestedDate) : undefined,
        lastActivityAt: new Date(),
      },
    });
    await this.activity.log({
      action: 'updated',
      entityType: 'application',
      entityId: id,
      summary: `Обновлена заявка ${updated.number}`,
      actorId: actor.id,
    });
    return updated;
  }

  // --------------- Items ---------------

  private toDecimal(value: number | string | undefined, field: string): string | undefined {
    if (value === undefined || value === null || value === '') return undefined;

    const normalized = String(value).trim().replace(',', '.');
    if (!/^\d+(\.\d{1,2})?$/.test(normalized)) {
      throw new BadRequestException(
        `Поле ${field} должно быть числом с максимум двумя знаками после запятой`,
      );
    }
    return normalized;
  }

  private validateReadyForReservation(input: {
    readyForReservation: boolean;
    quantity: number;
    plannedDate: string | Date | null;
    plannedTimeFrom: string | null;
    plannedTimeTo: string | null;
    address: string | null;
  }) {
    if (!input.readyForReservation) return;

    const missing: string[] = [];
    if (!input.quantity || input.quantity < 1) missing.push('quantity');
    if (!input.plannedDate) missing.push('plannedDate');
    if (!input.plannedTimeFrom || !input.plannedTimeTo) missing.push('plannedTimeFrom/plannedTimeTo');
    if (!input.address?.trim()) missing.push('address');

    if (missing.length > 0) {
      throw new BadRequestException(
        `readyForReservation=true requires fields: ${missing.join(', ')}`,
      );
    }
  }

  async addItem(appId: string, dto: CreateApplicationItemDto, actor: ActorContext) {
    const app = await this.get(appId, actor);
    if (!app.isActive) {
      throw new BadRequestException('Нельзя добавлять позиции в неактивную заявку');
    }
    if (dto.equipmentTypeId) {
      const t = await this.prisma.equipmentType.findUnique({ where: { id: dto.equipmentTypeId } });
      if (!t) throw new BadRequestException('Указанный тип техники не найден');
    }

    const nextQuantity = dto.quantity ?? 1;
    const nextSourcingType = dto.sourcingType ?? 'undecided';
    const nextReadyForReservation = dto.readyForReservation ?? false;

    this.validateReadyForReservation({
      readyForReservation: nextReadyForReservation,
      quantity: nextQuantity,
      plannedDate: dto.plannedDate ?? null,
      plannedTimeFrom: dto.plannedTimeFrom ?? null,
      plannedTimeTo: dto.plannedTimeTo ?? null,
      address: dto.address ?? null,
    });

    const item = await this.prisma.applicationItem.create({
      data: {
        applicationId: appId,
        equipmentTypeId: dto.equipmentTypeId,
        equipmentTypeLabel: dto.equipmentTypeLabel,
        quantity: nextQuantity,
        shiftCount: dto.shiftCount ?? 1,
        overtimeHours: dto.overtimeHours,
        downtimeHours: dto.downtimeHours,
        plannedDate: dto.plannedDate ? new Date(dto.plannedDate) : undefined,
        plannedTimeFrom: dto.plannedTimeFrom,
        plannedTimeTo: dto.plannedTimeTo,
        address: dto.address,
        comment: dto.comment,
        sourcingType: nextSourcingType,
        pricePerShift: this.toDecimal(dto.pricePerShift, 'pricePerShift'),
        deliveryPrice: this.toDecimal(dto.deliveryPrice, 'deliveryPrice'),
        surcharge: this.toDecimal(dto.surcharge, 'surcharge'),
        readyForReservation: nextReadyForReservation,
      },
    });
    await this.prisma.application.update({
      where: { id: appId },
      data: { lastActivityAt: new Date() },
    });
    await this.activity.log({
      action: 'updated',
      entityType: 'application',
      entityId: appId,
      summary: `Добавлена позиция «${item.equipmentTypeLabel}» в заявку`,
      actorId: actor.id,
      payload: { itemId: item.id },
    });
    return item;
  }

  async getItem(itemId: string, actor: ActorContext) {
    const item = await this.prisma.applicationItem.findUnique({
      where: { id: itemId },
      include: {
        application: true,
        equipmentType: true,
        reservations: { where: { isActive: true } },
      },
    });
    if (!item) throw new NotFoundException('Позиция не найдена');
    if (actor.role === 'manager' && item.application.responsibleManagerId !== actor.id) {
      throw new ForbiddenException('Недоступно');
    }
    return item;
  }

  async updateItem(itemId: string, dto: UpdateApplicationItemDto, actor: ActorContext) {
    const item = await this.getItem(itemId, actor);
    const nextSourcingType = dto.sourcingType ?? item.sourcingType;
    const nextReadyForReservation = dto.readyForReservation ?? item.readyForReservation;
    const nextQuantity = dto.quantity ?? item.quantity;
    const nextPlannedDate =
      dto.plannedDate ?? (item.plannedDate ? item.plannedDate.toISOString() : null);
    const nextPlannedTimeFrom = dto.plannedTimeFrom ?? item.plannedTimeFrom;
    const nextPlannedTimeTo = dto.plannedTimeTo ?? item.plannedTimeTo;
    const nextAddress = dto.address ?? item.address;

    this.validateReadyForReservation({
      readyForReservation: nextReadyForReservation,
      quantity: nextQuantity,
      plannedDate: nextPlannedDate,
      plannedTimeFrom: nextPlannedTimeFrom,
      plannedTimeTo: nextPlannedTimeTo,
      address: nextAddress,
    });

    const updated = await this.prisma.applicationItem.update({
      where: { id: itemId },
      data: {
        equipmentTypeId: dto.equipmentTypeId,
        equipmentTypeLabel: dto.equipmentTypeLabel,
        quantity: dto.quantity,
        shiftCount: dto.shiftCount,
        overtimeHours: dto.overtimeHours,
        downtimeHours: dto.downtimeHours,
        plannedDate: dto.plannedDate ? new Date(dto.plannedDate) : undefined,
        plannedTimeFrom: dto.plannedTimeFrom,
        plannedTimeTo: dto.plannedTimeTo,
        address: dto.address,
        comment: dto.comment,
        sourcingType: dto.sourcingType,
        pricePerShift: this.toDecimal(dto.pricePerShift, 'pricePerShift'),
        deliveryPrice: this.toDecimal(dto.deliveryPrice, 'deliveryPrice'),
        surcharge: this.toDecimal(dto.surcharge, 'surcharge'),
        readyForReservation: dto.readyForReservation,
      },
    });
    await this.prisma.application.update({
      where: { id: item.applicationId },
      data: { lastActivityAt: new Date() },
    });
    await this.activity.log({
      action: 'updated',
      entityType: 'application_item',
      entityId: itemId,
      summary: `Обновлена позиция «${updated.equipmentTypeLabel}»`,
      actorId: actor.id,
    });
    return updated;
  }

  async deleteItem(itemId: string, actor: ActorContext) {
    const item = await this.getItem(itemId, actor);
    const active = item.reservations?.length ?? 0;
    if (active > 0) {
      throw new BadRequestException(
        'Нельзя удалить позицию с активной бронью — сначала освободите бронь',
      );
    }
    await this.prisma.applicationItem.delete({ where: { id: itemId } });
    await this.activity.log({
      action: 'updated',
      entityType: 'application_item',
      entityId: itemId,
      summary: `Удалена позиция «${item.equipmentTypeLabel}»`,
      actorId: actor.id,
    });
    return { ok: true };
  }

  async cancel(id: string, reason: string | undefined, actor: ActorContext) {
    const existing = await this.get(id, actor);
    if (!existing.isActive) {
      throw new BadRequestException('Заявка уже неактивна');
    }
    const activeReservations = existing.items.reduce(
      (sum, i) => sum + (i.reservations?.length ?? 0),
      0,
    );
    if (activeReservations > 0) {
      throw new BadRequestException(
        'Нельзя отменить заявку с активными бронями — сначала освободите их',
      );
    }
    const now = new Date();
    await this.prisma.application.update({
      where: { id },
      data: {
        isActive: false,
        stage: 'cancelled',
        cancelledAt: now,
        lastActivityAt: now,
      },
    });
    await this.activity.log({
      action: 'stage_changed',
      entityType: 'application',
      entityId: id,
      summary: reason
        ? `Заявка ${existing.number} отменена: ${reason}`
        : `Заявка ${existing.number} отменена`,
      actorId: actor.id,
      payload: reason ? { reason } : undefined,
    });
  }
}
