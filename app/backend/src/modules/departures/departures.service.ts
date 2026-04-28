import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  DepartureStatus,
  Prisma,
  UserRole,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ActivityService } from '../activity/activity.service';
import {
  CancelDepartureDto,
  CreateDepartureDto,
  DepartureListQueryDto,
  UpdateDepartureDto,
} from './departures.dto';

export interface ActorContext {
  id: string;
  role: UserRole;
}

const ACTIVE_DEPARTURE_STATUSES: DepartureStatus[] = [
  'scheduled',
  'in_transit',
  'arrived',
];

const ALLOWED_STATUS_TRANSITIONS: Record<DepartureStatus, DepartureStatus[]> = {
  scheduled: ['in_transit', 'cancelled'],
  in_transit: ['arrived', 'cancelled'],
  arrived: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
};

const DEPARTURE_INCLUDE = {
  completion: {
    select: {
      id: true,
      outcome: true,
      completedAt: true,
    },
  },
  reservation: {
    select: {
      id: true,
      plannedStart: true,
      plannedEnd: true,
      comment: true,
      equipmentTypeId: true,
      equipmentType: { select: { id: true, name: true } },
      equipmentUnitId: true,
      equipmentUnit: { select: { id: true, name: true, plateNumber: true } },
      subcontractorId: true,
      subcontractor: { select: { id: true, name: true } },
      applicationItem: {
        select: {
          id: true,
          applicationId: true,
          equipmentTypeLabel: true,
          quantity: true,
          address: true,
          plannedDate: true,
          plannedTimeFrom: true,
          plannedTimeTo: true,
          application: {
            select: {
              id: true,
              number: true,
              leadId: true,
              clientId: true,
              client: {
                select: { id: true, name: true, company: true, phone: true },
              },
              responsibleManagerId: true,
              responsibleManager: {
                select: { id: true, fullName: true },
              },
            },
          },
        },
      },
    },
  },
} as const;

@Injectable()
export class DeparturesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activity: ActivityService,
  ) {}

  async list(params: DepartureListQueryDto, actor: ActorContext) {
    const filters: Prisma.DepartureWhereInput[] = [];

    if (params.reservationId) {
      filters.push({ reservationId: params.reservationId });
    }
    if (params.applicationId) {
      filters.push({
        reservation: { applicationItem: { applicationId: params.applicationId } },
      });
    }
    if (params.status) {
      filters.push({ status: params.status });
    }
    if (actor.role === 'manager') {
      filters.push({
        reservation: {
          applicationItem: {
            application: {
              responsibleManagerId: actor.id,
            },
          },
        },
      });
    }

    const q = params.query?.trim();
    if (q) {
      filters.push({
        OR: [
          {
            reservation: {
              applicationItem: {
                application: {
                  number: { contains: q, mode: 'insensitive' },
                },
              },
            },
          },
          {
            reservation: {
              applicationItem: {
                application: {
                  client: { name: { contains: q, mode: 'insensitive' } },
                },
              },
            },
          },
          {
            reservation: {
              applicationItem: {
                equipmentTypeLabel: { contains: q, mode: 'insensitive' },
              },
            },
          },
        ],
      });
    }

    const where: Prisma.DepartureWhereInput =
      filters.length > 0 ? { AND: filters } : {};

    const items = await this.prisma.departure.findMany({
      where,
      orderBy: [{ scheduledAt: 'asc' }],
      take: 500,
      include: DEPARTURE_INCLUDE,
    });

    return { items, total: items.length };
  }

  async get(id: string, actor: ActorContext) {
    const departure = await this.prisma.departure.findUnique({
      where: { id },
      include: DEPARTURE_INCLUDE,
    });
    if (!departure) throw new NotFoundException('Departure not found');

    if (
      actor.role === 'manager' &&
      departure.reservation.applicationItem.application.responsibleManagerId !== actor.id
    ) {
      throw new NotFoundException('Departure not found');
    }

    return departure;
  }

  private parseDate(input: string, field: string): Date {
    const d = new Date(input);
    if (Number.isNaN(d.getTime())) {
      throw new BadRequestException(`${field} must be a valid ISO datetime`);
    }
    return d;
  }

  private parseOptionalDate(
    input: string | null | undefined,
    field: string,
  ): Date | null | undefined {
    if (input === undefined) return undefined;
    if (input === null) return null;
    return this.parseDate(input, field);
  }

  private assertAllowedTransition(from: DepartureStatus, to: DepartureStatus) {
    if (from === to) return;
    if (!ALLOWED_STATUS_TRANSITIONS[from].includes(to)) {
      throw new BadRequestException(`Invalid departure status transition ${from} -> ${to}`);
    }
  }

  async create(dto: CreateDepartureDto, actor: ActorContext) {
    const reservation = await this.prisma.reservation.findUnique({
      where: { id: dto.reservationId },
      include: {
        applicationItem: {
          select: {
            id: true,
            application: {
              select: {
                id: true,
                responsibleManagerId: true,
              },
            },
          },
        },
      },
    });

    if (!reservation) throw new NotFoundException('Reservation not found');
    if (!reservation.isActive) {
      throw new BadRequestException('Cannot create departure from released reservation');
    }
    if (
      actor.role === 'manager' &&
      reservation.applicationItem.application.responsibleManagerId !== actor.id
    ) {
      throw new NotFoundException('Reservation not found');
    }

    const activeDeparture = await this.prisma.departure.findFirst({
      where: {
        reservationId: dto.reservationId,
        status: { in: ACTIVE_DEPARTURE_STATUSES },
      },
      select: { id: true },
    });
    if (activeDeparture) {
      throw new BadRequestException('Active departure already exists for this reservation');
    }

    const created = await this.prisma.departure.create({
      data: {
        reservationId: dto.reservationId,
        scheduledAt: this.parseDate(dto.scheduledAt, 'scheduledAt'),
        notes: dto.notes,
        deliveryNotes: dto.deliveryNotes,
        status: 'scheduled',
      },
    });

    await this.activity.log({
      action: 'created',
      entityType: 'departure',
      entityId: created.id,
      summary: 'Departure created',
      actorId: actor.id,
      payload: { reservationId: dto.reservationId },
    });

    return created;
  }

  async update(id: string, dto: UpdateDepartureDto, actor: ActorContext) {
    const existing = await this.get(id, actor);
    const nextStatus = dto.status ?? existing.status;
    this.assertAllowedTransition(existing.status, nextStatus);

    const now = new Date();
    let startedAt = this.parseOptionalDate(dto.startedAt, 'startedAt');
    let arrivedAt = this.parseOptionalDate(dto.arrivedAt, 'arrivedAt');
    let completedAt = this.parseOptionalDate(dto.completedAt, 'completedAt');
    let cancelledAt = this.parseOptionalDate(dto.cancelledAt, 'cancelledAt');

    if (nextStatus === 'in_transit' && startedAt === undefined && !existing.startedAt) {
      startedAt = now;
    }
    if (nextStatus === 'arrived' && arrivedAt === undefined && !existing.arrivedAt) {
      arrivedAt = now;
    }
    if (nextStatus === 'completed' && completedAt === undefined && !existing.completedAt) {
      completedAt = now;
    }
    if (nextStatus === 'cancelled' && cancelledAt === undefined && !existing.cancelledAt) {
      cancelledAt = now;
    }

    const updated = await this.prisma.departure.update({
      where: { id },
      data: {
        status: nextStatus,
        scheduledAt:
          dto.scheduledAt !== undefined
            ? this.parseDate(dto.scheduledAt, 'scheduledAt')
            : undefined,
        startedAt,
        arrivedAt,
        completedAt,
        cancelledAt,
        cancellationReason:
          dto.cancellationReason === undefined
            ? undefined
            : dto.cancellationReason,
        notes: dto.notes === undefined ? undefined : dto.notes,
        deliveryNotes:
          dto.deliveryNotes === undefined ? undefined : dto.deliveryNotes,
      },
    });

    await this.activity.log({
      action: existing.status !== nextStatus ? 'stage_changed' : 'updated',
      entityType: 'departure',
      entityId: id,
      summary:
        existing.status !== nextStatus
          ? `Departure status: ${existing.status} -> ${nextStatus}`
          : 'Departure updated',
      actorId: actor.id,
    });

    return updated;
  }

  async start(id: string, actor: ActorContext) {
    const existing = await this.get(id, actor);
    if (existing.status !== 'scheduled') {
      throw new BadRequestException('Only scheduled departures can be started');
    }
    return this.update(
      id,
      { status: 'in_transit', startedAt: new Date().toISOString() },
      actor,
    );
  }

  async arrive(id: string, actor: ActorContext) {
    const existing = await this.get(id, actor);
    if (existing.status !== 'in_transit') {
      throw new BadRequestException('Only in_transit departures can be marked as arrived');
    }
    return this.update(
      id,
      { status: 'arrived', arrivedAt: new Date().toISOString() },
      actor,
    );
  }

  async cancel(id: string, dto: CancelDepartureDto, actor: ActorContext) {
    const existing = await this.get(id, actor);
    if (existing.status === 'completed' || existing.status === 'cancelled') {
      throw new BadRequestException('Departure is already terminal');
    }
    return this.update(
      id,
      {
        status: 'cancelled',
        cancelledAt: new Date().toISOString(),
        cancellationReason: dto.reason ?? 'manual_cancel',
      },
      actor,
    );
  }
}
