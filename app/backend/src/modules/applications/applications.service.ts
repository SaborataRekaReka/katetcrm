import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ActivityService } from '../activity/activity.service';
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
              where: { isActive: true },
              include: {
                equipmentUnit: true,
                subcontractor: true,
              },
            },
          },
        },
        _count: { select: { items: true } },
      },
    });
    return { items, total: items.length };
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
              where: { isActive: true },
              include: {
                equipmentUnit: true,
                subcontractor: true,
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

  async addItem(appId: string, dto: CreateApplicationItemDto, actor: ActorContext) {
    const app = await this.get(appId, actor);
    if (!app.isActive) {
      throw new BadRequestException('Нельзя добавлять позиции в неактивную заявку');
    }
    if (dto.equipmentTypeId) {
      const t = await this.prisma.equipmentType.findUnique({ where: { id: dto.equipmentTypeId } });
      if (!t) throw new BadRequestException('Указанный тип техники не найден');
    }
    const item = await this.prisma.applicationItem.create({
      data: {
        applicationId: appId,
        equipmentTypeId: dto.equipmentTypeId,
        equipmentTypeLabel: dto.equipmentTypeLabel,
        quantity: dto.quantity ?? 1,
        shiftCount: dto.shiftCount ?? 1,
        overtimeHours: dto.overtimeHours,
        downtimeHours: dto.downtimeHours,
        plannedDate: dto.plannedDate ? new Date(dto.plannedDate) : undefined,
        plannedTimeFrom: dto.plannedTimeFrom,
        plannedTimeTo: dto.plannedTimeTo,
        address: dto.address,
        comment: dto.comment,
        sourcingType: dto.sourcingType ?? 'undecided',
        pricePerShift: this.toDecimal(dto.pricePerShift, 'pricePerShift'),
        deliveryPrice: this.toDecimal(dto.deliveryPrice, 'deliveryPrice'),
        surcharge: this.toDecimal(dto.surcharge, 'surcharge'),
        readyForReservation: dto.readyForReservation ?? false,
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
