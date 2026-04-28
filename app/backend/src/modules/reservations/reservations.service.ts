import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  Prisma,
  Reservation,
  ReservationInternalStage,
  SourcingType,
  UserRole,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ActivityService } from '../activity/activity.service';
import type { ReservationConflictView } from '../../common/projections/reservation.projection';
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

const RESERVATION_PROJECTION_INCLUDE = {
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
  createdBy: {
    select: { id: true, fullName: true },
  },
  equipmentType: { select: { id: true, name: true } },
  equipmentUnit: { select: { id: true, name: true } },
  subcontractor: { select: { id: true, name: true } },
} satisfies Prisma.ReservationInclude;

type ReservationProjectionRecord = Prisma.ReservationGetPayload<{
  include: typeof RESERVATION_PROJECTION_INCLUDE;
}>;

type ReservationProjectionRecordWithConflict = ReservationProjectionRecord & {
  conflictContext?: ReservationConflictView | null;
};

@Injectable()
export class ReservationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activity: ActivityService,
  ) {}

  private inferDefaultInternalStage(
    sourcingType: SourcingType,
  ): ReservationInternalStage {
    if (sourcingType === 'own') return 'searching_own_equipment';
    if (sourcingType === 'subcontractor') return 'searching_subcontractor';
    return 'needs_source_selection';
  }

  private validateStageSelectionConsistency(params: {
    sourcingType: SourcingType;
    internalStage: ReservationInternalStage;
    equipmentUnitId: string | null;
    subcontractorId: string | null;
  }) {
    const {
      sourcingType,
      internalStage,
      equipmentUnitId,
      subcontractorId,
    } = params;

    if (internalStage === 'unit_defined' && !equipmentUnitId) {
      throw new BadRequestException(
        'Для стадии unit_defined требуется выбранный unit',
      );
    }
    if (internalStage === 'subcontractor_selected' && !subcontractorId) {
      throw new BadRequestException(
        'Для стадии subcontractor_selected требуется выбранный подрядчик',
      );
    }
    if (internalStage === 'ready_for_departure') {
      if (sourcingType === 'undecided') {
        throw new BadRequestException(
          'Нельзя перевести бронь в ready_for_departure без выбора источника',
        );
      }
      if (sourcingType === 'own' && !equipmentUnitId) {
        throw new BadRequestException(
          'Для ready_for_departure при source=own требуется выбранный unit',
        );
      }
      if (sourcingType === 'subcontractor' && !subcontractorId) {
        throw new BadRequestException(
          'Для ready_for_departure при source=subcontractor требуется выбранный подрядчик',
        );
      }
    }
  }

  private async validateAndResolveSelection(params: {
    sourcingType: SourcingType;
    equipmentTypeId: string | null;
    equipmentUnitId: string | null;
    subcontractorId: string | null;
  }): Promise<{
    equipmentTypeId: string | null;
    equipmentUnitId: string | null;
    subcontractorId: string | null;
  }> {
    let { equipmentTypeId } = params;
    const { sourcingType, equipmentUnitId, subcontractorId } = params;

    if (sourcingType === 'undecided' && (equipmentUnitId || subcontractorId)) {
      throw new BadRequestException(
        'Для source=undecided нельзя указывать unit или подрядчика',
      );
    }
    if (sourcingType === 'own' && subcontractorId) {
      throw new BadRequestException(
        'Для source=own нельзя указывать подрядчика',
      );
    }
    if (sourcingType === 'subcontractor' && equipmentUnitId) {
      throw new BadRequestException(
        'Для source=subcontractor нельзя указывать unit',
      );
    }

    if (equipmentTypeId) {
      const equipmentType = await this.prisma.equipmentType.findUnique({
        where: { id: equipmentTypeId },
        select: { id: true },
      });
      if (!equipmentType) {
        throw new BadRequestException('Указанный тип техники не найден');
      }
    }

    if (equipmentUnitId) {
      const unit = await this.prisma.equipmentUnit.findUnique({
        where: { id: equipmentUnitId },
        select: { id: true, status: true, equipmentTypeId: true },
      });
      if (!unit) {
        throw new BadRequestException('Указанный unit не найден');
      }
      if (unit.status !== 'active') {
        throw new BadRequestException('Назначать можно только активный unit');
      }
      if (equipmentTypeId && unit.equipmentTypeId !== equipmentTypeId) {
        throw new BadRequestException(
          'Выбранный unit не соответствует типу техники брони',
        );
      }
      equipmentTypeId = equipmentTypeId ?? unit.equipmentTypeId;
    }

    if (subcontractorId) {
      const subcontractor = await this.prisma.subcontractor.findUnique({
        where: { id: subcontractorId },
        select: { id: true, status: true },
      });
      if (!subcontractor) {
        throw new BadRequestException('Указанный подрядчик не найден');
      }
      if (subcontractor.status !== 'active') {
        throw new BadRequestException(
          'Назначать можно только активного подрядчика',
        );
      }
    }

    return {
      equipmentTypeId,
      equipmentUnitId,
      subcontractorId,
    };
  }

  private formatConflictWindow(start: Date, end: Date): string {
    const startIso = start.toISOString();
    const endIso = end.toISOString();
    return `${startIso.slice(0, 10)} ${startIso.slice(11, 16)}–${endIso.slice(11, 16)}`;
  }

  private async resolveConflictContext(
    reservation: Pick<
      ReservationProjectionRecord,
      | 'id'
      | 'hasConflictWarning'
      | 'equipmentUnitId'
      | 'subcontractorId'
      | 'plannedStart'
      | 'plannedEnd'
    >,
  ): Promise<ReservationConflictView | null> {
    if (!reservation.hasConflictWarning) return null;

    const overlap: Prisma.ReservationWhereInput = {
      id: { not: reservation.id },
      isActive: true,
      plannedStart: { lt: reservation.plannedEnd },
      plannedEnd: { gt: reservation.plannedStart },
    };

    const byResource: Prisma.ReservationWhereInput[] = [];
    if (reservation.equipmentUnitId) {
      byResource.push({ equipmentUnitId: reservation.equipmentUnitId });
    }
    if (reservation.subcontractorId) {
      byResource.push({ subcontractorId: reservation.subcontractorId });
    }
    if (byResource.length === 0) return null;

    overlap.OR = byResource;

    const conflicting = await this.prisma.reservation.findFirst({
      where: overlap,
      orderBy: [{ plannedStart: 'asc' }],
      include: {
        applicationItem: {
          select: {
            equipmentTypeLabel: true,
            application: { select: { number: true } },
          },
        },
        equipmentUnit: { select: { name: true } },
        subcontractor: { select: { name: true } },
      },
    });

    if (!conflicting) return null;

    const isUnitConflict =
      !!reservation.equipmentUnitId &&
      reservation.equipmentUnitId === conflicting.equipmentUnitId;
    const isSubcontractorConflict =
      !!reservation.subcontractorId &&
      reservation.subcontractorId === conflicting.subcontractorId;

    let summary = 'Обнаружено пересечение по интервалу брони';
    if (isUnitConflict) {
      summary = `Конфликт по unit ${conflicting.equipmentUnit?.name ?? ''}`.trim();
    } else if (isSubcontractorConflict) {
      summary = `Конфликт по подрядчику ${conflicting.subcontractor?.name ?? ''}`.trim();
    }
    if (conflicting.applicationItem?.application?.number) {
      summary = `${summary} · заявка #${conflicting.applicationItem.application.number}`;
    }

    return {
      id: conflicting.id,
      summary,
      conflictingReservationId: conflicting.id,
      conflictingAt: this.formatConflictWindow(
        conflicting.plannedStart,
        conflicting.plannedEnd,
      ),
    };
  }

  private async attachConflictContext(
    reservations: ReservationProjectionRecord[],
  ): Promise<ReservationProjectionRecordWithConflict[]> {
    const contexts = await Promise.all(
      reservations.map((reservation) => this.resolveConflictContext(reservation)),
    );

    return reservations.map((reservation, index) => ({
      ...reservation,
      conflictContext: contexts[index],
    }));
  }

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
      include: RESERVATION_PROJECTION_INCLUDE,
    });
    const withConflictContext = await this.attachConflictContext(items);
    return { items: withConflictContext, total: withConflictContext.length };
  }

  async get(id: string, actor: ActorContext) {
    const r = await this.prisma.reservation.findUnique({
      where: { id },
      include: RESERVATION_PROJECTION_INCLUDE,
    });
    if (!r) throw new NotFoundException('Бронь не найдена');
    if (
      actor.role === 'manager' &&
      r.applicationItem.application.responsibleManagerId !== actor.id
    ) {
      throw new NotFoundException('Бронь не найдена');
    }
    const withConflictContext = (await this.attachConflictContext([r]))[0];
    if (!withConflictContext) throw new NotFoundException('Бронь не найдена');
    return withConflictContext;
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

    const internalStage =
      dto.internalStage ?? this.inferDefaultInternalStage(dto.sourcingType);
    const selection = await this.validateAndResolveSelection({
      sourcingType: dto.sourcingType,
      equipmentTypeId: dto.equipmentTypeId ?? item.equipmentTypeId,
      equipmentUnitId: dto.equipmentUnitId ?? null,
      subcontractorId: dto.subcontractorId ?? null,
    });
    this.validateStageSelectionConsistency({
      sourcingType: dto.sourcingType,
      internalStage,
      equipmentUnitId: selection.equipmentUnitId,
      subcontractorId: selection.subcontractorId,
    });

    const subcontractorConfirmation =
      dto.sourcingType === 'subcontractor'
        ? dto.subcontractorConfirmation ?? 'not_requested'
        : 'not_requested';
    const promisedModelOrUnit =
      dto.sourcingType === 'subcontractor' ? dto.promisedModelOrUnit : null;
    const subcontractorNote =
      dto.sourcingType === 'subcontractor' ? dto.subcontractorNote : null;

    const conflict = await this.detectConflict({
      equipmentUnitId: selection.equipmentUnitId,
      subcontractorId: selection.subcontractorId,
      plannedStart,
      plannedEnd,
    });

    try {
      const created = await this.prisma.reservation.create({
        data: {
          applicationItemId: dto.applicationItemId,
          sourcingType: dto.sourcingType,
          internalStage,
          equipmentTypeId: selection.equipmentTypeId,
          equipmentUnitId: selection.equipmentUnitId,
          subcontractorId: selection.subcontractorId,
          subcontractorConfirmation,
          promisedModelOrUnit,
          subcontractorNote,
          plannedStart,
          plannedEnd,
          hasConflictWarning: conflict,
          isActive: true,
          createdById: actor.id,
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

    const nextSourcingType = dto.sourcingType ?? existing.sourcingType;
    const nextInternalStage = dto.internalStage ?? existing.internalStage;

    let nextEquipmentUnitId =
      dto.equipmentUnitId !== undefined
        ? dto.equipmentUnitId
        : existing.equipmentUnitId;
    let nextSubcontractorId =
      dto.subcontractorId !== undefined
        ? dto.subcontractorId
        : existing.subcontractorId;

    // При смене source сбрасываем несовместимый selection, если он не был
    // явно задан в патче.
    if (nextSourcingType !== 'own' && dto.equipmentUnitId === undefined) {
      nextEquipmentUnitId = null;
    }
    if (nextSourcingType !== 'subcontractor' && dto.subcontractorId === undefined) {
      nextSubcontractorId = null;
    }

    const selection = await this.validateAndResolveSelection({
      sourcingType: nextSourcingType,
      equipmentTypeId:
        dto.equipmentTypeId !== undefined
          ? dto.equipmentTypeId
          : existing.equipmentTypeId,
      equipmentUnitId: nextEquipmentUnitId,
      subcontractorId: nextSubcontractorId,
    });
    this.validateStageSelectionConsistency({
      sourcingType: nextSourcingType,
      internalStage: nextInternalStage,
      equipmentUnitId: selection.equipmentUnitId,
      subcontractorId: selection.subcontractorId,
    });

    const subcontractorConfirmation =
      nextSourcingType === 'subcontractor'
        ? dto.subcontractorConfirmation ?? existing.subcontractorConfirmation
        : 'not_requested';
    const promisedModelOrUnit =
      nextSourcingType === 'subcontractor'
        ? dto.promisedModelOrUnit !== undefined
          ? dto.promisedModelOrUnit
          : existing.promisedModelOrUnit
        : null;
    const subcontractorNote =
      nextSourcingType === 'subcontractor'
        ? dto.subcontractorNote !== undefined
          ? dto.subcontractorNote
          : existing.subcontractorNote
        : null;

    const plannedStart = dto.plannedStart ? new Date(dto.plannedStart) : existing.plannedStart;
    const plannedEnd = dto.plannedEnd ? new Date(dto.plannedEnd) : existing.plannedEnd;
    if (!(plannedEnd > plannedStart)) {
      throw new BadRequestException('plannedEnd должен быть позже plannedStart');
    }

    const conflict = await this.detectConflict({
      excludeId: id,
      equipmentUnitId: selection.equipmentUnitId,
      subcontractorId: selection.subcontractorId,
      plannedStart,
      plannedEnd,
    });

    const updated = await this.prisma.reservation.update({
      where: { id },
      data: {
        sourcingType: nextSourcingType,
        internalStage: nextInternalStage,
        equipmentTypeId: selection.equipmentTypeId,
        equipmentUnitId: selection.equipmentUnitId,
        subcontractorId: selection.subcontractorId,
        subcontractorConfirmation,
        promisedModelOrUnit,
        subcontractorNote,
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
