import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma, Reservation, UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ActivityService } from '../activity/activity.service';
import {
  CreateReservationDto,
  ReleaseReservationDto,
  ReservationListQueryDto,
  UpdateReservationDto,
} from './reservations.dto';

export interface ActorContext {
  id: string;
  role: UserRole;
}

@Injectable()
export class ReservationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activity: ActivityService,
  ) {}

  async list(params: ReservationListQueryDto, actor: ActorContext) {
    const where: Prisma.ReservationWhereInput = {};
    if (params.applicationItemId) where.applicationItemId = params.applicationItemId;
    if (params.equipmentUnitId) where.equipmentUnitId = params.equipmentUnitId;
    if (params.subcontractorId) where.subcontractorId = params.subcontractorId;
    if (params.applicationId) {
      where.applicationItem = { applicationId: params.applicationId };
    }
    if (params.isActive !== undefined) {
      where.isActive = params.isActive === 'true' || params.isActive === '1';
    } else {
      where.isActive = true;
    }
    if (actor.role === 'manager') {
      where.applicationItem = {
        ...(where.applicationItem as any),
        application: { responsibleManagerId: actor.id },
      };
    }
    const items = await this.prisma.reservation.findMany({
      where,
      orderBy: [{ plannedStart: 'asc' }],
      take: 500,
      include: {
        applicationItem: {
          select: {
            id: true,
            equipmentTypeLabel: true,
            applicationId: true,
            application: {
              select: {
                id: true,
                number: true,
                clientId: true,
                client: {
                  select: { id: true, name: true, company: true, phone: true },
                },
                responsibleManager: {
                  select: { id: true, fullName: true },
                },
              },
            },
          },
        },
        equipmentType: { select: { id: true, name: true } },
        equipmentUnit: { select: { id: true, name: true } },
        subcontractor: { select: { id: true, name: true } },
      },
    });
    return { items, total: items.length };
  }

  async get(id: string, actor: ActorContext) {
    const r = await this.prisma.reservation.findUnique({
      where: { id },
      include: {
        applicationItem: {
          select: {
            id: true,
            equipmentTypeLabel: true,
            applicationId: true,
            application: {
              select: {
                id: true,
                number: true,
                clientId: true,
                responsibleManagerId: true,
                client: {
                  select: { id: true, name: true, company: true, phone: true },
                },
                responsibleManager: {
                  select: { id: true, fullName: true },
                },
              },
            },
          },
        },
        equipmentType: { select: { id: true, name: true } },
        equipmentUnit: { select: { id: true, name: true } },
        subcontractor: { select: { id: true, name: true } },
      },
    });
    if (!r) throw new NotFoundException('Бронь не найдена');
    if (
      actor.role === 'manager' &&
      r.applicationItem.application.responsibleManagerId !== actor.id
    ) {
      throw new NotFoundException('Бронь не найдена');
    }
    return r;
  }

  /**
   * Soft-conflict: Ð¾Ñ‚Ð¼ÐµÑ‡Ð°ÐµÑ‚ Ð¿ÐµÑ€ÐµÑÐµÑ‡ÐµÐ½Ð¸Ðµ Ð¸Ð½Ñ‚ÐµÑ€Ð²Ð°Ð»Ð¾Ð² (Ð¿Ð¾ unit Ð¸Ð»Ð¸ Ð¿Ð¾ subcontractor).
   * Ð’Ð¾Ð·Ð²Ñ€Ð°Ñ‰Ð°ÐµÑ‚ true, ÐµÑÐ»Ð¸ Ð½Ð°ÑˆÑ‘Ð»ÑÑ Ñ…Ð¾Ñ‚Ñ Ð±Ñ‹ Ð¾Ð´Ð¸Ð½ Ð°ÐºÑ‚Ð¸Ð²Ð½Ñ‹Ð¹ ÐºÐ¾Ð½Ñ„Ð»Ð¸ÐºÑ‚ â€” ÑÑ‚Ð¾ warning, Ð½Ðµ Ð±Ð»Ð¾Ðº.
   */
  private async detectConflict(params: {
    excludeId?: string;
    equipmentUnitId?: string | null;
    subcontractorId?: string | null;
    plannedStart: Date;
    plannedEnd: Date;
  }): Promise<boolean> {
    if (!params.equipmentUnitId && !params.subcontractorId) return false;
    const overlap: Prisma.ReservationWhereInput = {
      id: params.excludeId ? { not: params.excludeId } : undefined,
      isActive: true,
      plannedStart: { lt: params.plannedEnd },
      plannedEnd: { gt: params.plannedStart },
    };
    const or: Prisma.ReservationWhereInput[] = [];
    if (params.equipmentUnitId) or.push({ equipmentUnitId: params.equipmentUnitId });
    if (params.subcontractorId) or.push({ subcontractorId: params.subcontractorId });
    overlap.OR = or;
    const count = await this.prisma.reservation.count({ where: overlap });
    return count > 0;
  }

  async create(dto: CreateReservationDto, actor: ActorContext) {
    const item = await this.prisma.applicationItem.findUnique({
      where: { id: dto.applicationItemId },
      include: { application: true },
    });
    if (!item) throw new NotFoundException('ÐŸÐ¾Ð·Ð¸Ñ†Ð¸Ñ Ð·Ð°ÑÐ²ÐºÐ¸ Ð½Ðµ Ð½Ð°Ð¹Ð´ÐµÐ½Ð°');
    if (!item.application.isActive) {
      throw new BadRequestException('Ð—Ð°ÑÐ²ÐºÐ° Ð½ÐµÐ°ÐºÑ‚Ð¸Ð²Ð½Ð°');
    }
    if (
      actor.role === 'manager' &&
      item.application.responsibleManagerId !== actor.id
    ) {
      throw new NotFoundException('ÐŸÐ¾Ð·Ð¸Ñ†Ð¸Ñ Ð·Ð°ÑÐ²ÐºÐ¸ Ð½Ðµ Ð½Ð°Ð¹Ð´ÐµÐ½Ð°');
    }
    const plannedStart = new Date(dto.plannedStart);
    const plannedEnd = new Date(dto.plannedEnd);
    if (!(plannedEnd > plannedStart)) {
      throw new BadRequestException('plannedEnd должен быть позже plannedStart');
    }

    const conflict = await this.detectConflict({
      equipmentUnitId: dto.equipmentUnitId,
      subcontractorId: dto.subcontractorId,
      plannedStart,
      plannedEnd,
    });

    try {
      const created = await this.prisma.reservation.create({
        data: {
          applicationItemId: dto.applicationItemId,
          sourcingType: dto.sourcingType,
          internalStage: dto.internalStage ?? 'needs_source_selection',
          equipmentTypeId: dto.equipmentTypeId ?? item.equipmentTypeId,
          equipmentUnitId: dto.equipmentUnitId,
          subcontractorId: dto.subcontractorId,
          subcontractorConfirmation: dto.subcontractorConfirmation ?? 'not_requested',
          promisedModelOrUnit: dto.promisedModelOrUnit,
          subcontractorNote: dto.subcontractorNote,
          plannedStart,
          plannedEnd,
          hasConflictWarning: conflict,
          isActive: true,
        },
      });
      await this.activity.log({
        action: 'reservation_set',
        entityType: 'application_item',
        entityId: item.id,
        summary: `Ð¡Ð¾Ð·Ð´Ð°Ð½Ð° Ð±Ñ€Ð¾Ð½ÑŒ Ð´Ð»Ñ Ð¿Ð¾Ð·Ð¸Ñ†Ð¸Ð¸ Â«${item.equipmentTypeLabel}»`,
        actorId: actor.id,
        payload: { reservationId: created.id, hasConflictWarning: conflict },
      });
      return created;
    } catch (e: any) {
      if (e?.code === 'P2002') {
        throw new BadRequestException('Ð£ Ð¿Ð¾Ð·Ð¸Ñ†Ð¸Ð¸ ÑƒÐ¶Ðµ ÐµÑÑ‚ÑŒ Ð°ÐºÑ‚Ð¸Ð²Ð½Ð°Ñ Ð±Ñ€Ð¾Ð½ÑŒ');
      }
      throw e;
    }
  }

  async update(id: string, dto: UpdateReservationDto, actor: ActorContext) {
    const existing = await this.get(id, actor);
    if (!existing.isActive) {
      throw new BadRequestException('ÐÐµÐ°ÐºÑ‚Ð¸Ð²Ð½Ð°Ñ Ð±Ñ€Ð¾Ð½ÑŒ Ð½Ðµ Ð¼Ð¾Ð¶ÐµÑ‚ Ð±Ñ‹Ñ‚ÑŒ Ð¸Ð·Ð¼ÐµÐ½ÐµÐ½Ð°');
    }
    const plannedStart = dto.plannedStart ? new Date(dto.plannedStart) : existing.plannedStart;
    const plannedEnd = dto.plannedEnd ? new Date(dto.plannedEnd) : existing.plannedEnd;
    if (!(plannedEnd > plannedStart)) {
      throw new BadRequestException('plannedEnd должен быть позже plannedStart');
    }
    const equipmentUnitId = dto.equipmentUnitId !== undefined ? dto.equipmentUnitId : existing.equipmentUnitId;
    const subcontractorId = dto.subcontractorId !== undefined ? dto.subcontractorId : existing.subcontractorId;
    const conflict = await this.detectConflict({
      excludeId: id,
      equipmentUnitId,
      subcontractorId,
      plannedStart,
      plannedEnd,
    });
    const updated = await this.prisma.reservation.update({
      where: { id },
      data: {
        sourcingType: dto.sourcingType,
        internalStage: dto.internalStage,
        equipmentTypeId: dto.equipmentTypeId ?? undefined,
        equipmentUnitId: dto.equipmentUnitId ?? undefined,
        subcontractorId: dto.subcontractorId ?? undefined,
        subcontractorConfirmation: dto.subcontractorConfirmation,
        promisedModelOrUnit: dto.promisedModelOrUnit,
        subcontractorNote: dto.subcontractorNote,
        comment: dto.comment === undefined ? undefined : dto.comment,
        plannedStart,
        plannedEnd,
        hasConflictWarning: conflict,
      },
    });
    await this.activity.log({
      action: 'updated',
      entityType: 'reservation',
      entityId: id,
      summary: 'Обновлена бронь',
      actorId: actor.id,
      payload: { hasConflictWarning: conflict },
    });
    return updated;
  }

  async release(id: string, dto: ReleaseReservationDto, actor: ActorContext): Promise<Reservation> {
    const existing = await this.get(id, actor);
    if (!existing.isActive) {
      throw new BadRequestException('Ð‘Ñ€Ð¾Ð½ÑŒ ÑƒÐ¶Ðµ Ð¾ÑÐ²Ð¾Ð±Ð¾Ð¶Ð´ÐµÐ½Ð°');
    }
    const released = await this.prisma.reservation.update({
      where: { id },
      data: {
        isActive: false,
        releasedAt: new Date(),
        releaseReason: dto.reason ?? 'manual',
        internalStage: 'released',
      },
    });
    await this.activity.log({
      action: 'reservation_released',
      entityType: 'reservation',
      entityId: id,
      summary: `Ð‘Ñ€Ð¾Ð½ÑŒ Ð¾ÑÐ²Ð¾Ð±Ð¾Ð¶Ð´ÐµÐ½Ð° (${dto.reason ?? 'manual'})`,
      actorId: actor.id,
    });
    return released;
  }
}
