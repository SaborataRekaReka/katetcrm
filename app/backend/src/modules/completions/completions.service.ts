import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  CompletionOutcome,
  Prisma,
  UserRole,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ActivityService } from '../activity/activity.service';
import {
  CompletionListQueryDto,
  CreateCompletionDto,
  UpdateCompletionDto,
} from './completions.dto';

export interface ActorContext {
  id: string;
  role: UserRole;
}

const COMPLETION_INCLUDE = {
  completedBy: {
    select: {
      id: true,
      fullName: true,
    },
  },
  departure: {
    select: {
      id: true,
      status: true,
      scheduledAt: true,
      startedAt: true,
      arrivedAt: true,
      deliveryNotes: true,
      cancellationReason: true,
      reservationId: true,
      reservation: {
        select: {
          id: true,
          plannedStart: true,
          plannedEnd: true,
          equipmentTypeId: true,
          equipmentType: { select: { id: true, name: true } },
          equipmentUnitId: true,
          equipmentUnit: { select: { id: true, name: true } },
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
    },
  },
} as const;

const PENDING_DEPARTURE_INCLUDE = {
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
                select: {
                  id: true,
                  name: true,
                  company: true,
                  phone: true,
                },
              },
              responsibleManagerId: true,
              responsibleManager: {
                select: {
                  id: true,
                  fullName: true,
                },
              },
            },
          },
        },
      },
    },
  },
} as const;

@Injectable()
export class CompletionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activity: ActivityService,
  ) {}

  async list(params: CompletionListQueryDto, actor: ActorContext) {
    const filters: Prisma.CompletionWhereInput[] = [];

    if (params.departureId) {
      filters.push({ departureId: params.departureId });
    }
    if (params.applicationId) {
      filters.push({
        departure: {
          reservation: {
            applicationItem: {
              applicationId: params.applicationId,
            },
          },
        },
      });
    }
    if (params.outcome) {
      filters.push({ outcome: params.outcome });
    }
    if (actor.role === 'manager') {
      filters.push({
        departure: {
          reservation: {
            applicationItem: {
              application: { responsibleManagerId: actor.id },
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
            departure: {
              reservation: {
                applicationItem: {
                  application: {
                    number: { contains: q, mode: 'insensitive' },
                  },
                },
              },
            },
          },
          {
            departure: {
              reservation: {
                applicationItem: {
                  application: {
                    client: {
                      name: { contains: q, mode: 'insensitive' },
                    },
                  },
                },
              },
            },
          },
          {
            departure: {
              reservation: {
                applicationItem: {
                  equipmentTypeLabel: { contains: q, mode: 'insensitive' },
                },
              },
            },
          },
        ],
      });
    }

    const where: Prisma.CompletionWhereInput =
      filters.length > 0 ? { AND: filters } : {};

    const items = await this.prisma.completion.findMany({
      where,
      orderBy: [{ completedAt: 'desc' }],
      take: 500,
      include: COMPLETION_INCLUDE,
    });

    return { items, total: items.length };
  }

  async listPending(params: CompletionListQueryDto, actor: ActorContext) {
    const filters: Prisma.DepartureWhereInput[] = [
      { completion: null },
      { status: { in: ['scheduled', 'in_transit', 'arrived'] } },
    ];

    if (params.departureId) {
      filters.push({ id: params.departureId });
    }
    if (params.applicationId) {
      filters.push({
        reservation: {
          applicationItem: {
            applicationId: params.applicationId,
          },
        },
      });
    }
    if (actor.role === 'manager') {
      filters.push({
        reservation: {
          applicationItem: {
            application: { responsibleManagerId: actor.id },
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
                  client: {
                    name: { contains: q, mode: 'insensitive' },
                  },
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
      include: PENDING_DEPARTURE_INCLUDE,
    });

    return { items, total: items.length };
  }

  async get(id: string, actor: ActorContext) {
    const completion = await this.prisma.completion.findUnique({
      where: { id },
      include: COMPLETION_INCLUDE,
    });
    if (!completion) throw new NotFoundException('Completion not found');

    if (
      actor.role === 'manager' &&
      completion.departure.reservation.applicationItem.application.responsibleManagerId !==
        actor.id
    ) {
      throw new NotFoundException('Completion not found');
    }

    return completion;
  }

  private ensureOutcomeReady(
    departureStatus: 'scheduled' | 'in_transit' | 'arrived' | 'completed' | 'cancelled',
    outcome: CompletionOutcome,
  ) {
    if (departureStatus === 'cancelled') {
      throw new BadRequestException('Cannot complete cancelled departure');
    }
    if (outcome === 'completed' && !['arrived', 'completed'].includes(departureStatus)) {
      throw new BadRequestException('Departure must be arrived before completed outcome');
    }
  }

  async create(dto: CreateCompletionDto, actor: ActorContext) {
    if (dto.outcome === 'unqualified' && !dto.unqualifiedReason?.trim()) {
      throw new BadRequestException('unqualifiedReason is required for unqualified outcome');
    }

    const departure = await this.prisma.departure.findUnique({
      where: { id: dto.departureId },
      include: {
        reservation: {
          select: {
            id: true,
            isActive: true,
            applicationItem: {
              select: {
                applicationId: true,
                application: {
                  select: {
                    id: true,
                    leadId: true,
                    responsibleManagerId: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!departure) throw new NotFoundException('Departure not found');
    if (
      actor.role === 'manager' &&
      departure.reservation.applicationItem.application.responsibleManagerId !== actor.id
    ) {
      throw new NotFoundException('Departure not found');
    }

    this.ensureOutcomeReady(departure.status, dto.outcome);

    const existing = await this.prisma.completion.findUnique({
      where: { departureId: dto.departureId },
      select: { id: true },
    });
    if (existing) {
      throw new BadRequestException('Completion already exists for this departure');
    }

    const now = new Date();
    const appId = departure.reservation.applicationItem.applicationId;
    const leadId = departure.reservation.applicationItem.application.leadId;

    const created = await this.prisma.$transaction(async (tx) => {
      const completion = await tx.completion.create({
        data: {
          departureId: dto.departureId,
          outcome: dto.outcome,
          completionNote: dto.completionNote,
          unqualifiedReason: dto.unqualifiedReason,
          completedById: actor.id,
          completedAt: now,
        },
      });

      await tx.departure.update({
        where: { id: dto.departureId },
        data: {
          status: dto.outcome === 'completed' ? 'completed' : 'cancelled',
          completedAt: dto.outcome === 'completed' ? now : undefined,
          cancelledAt: dto.outcome === 'unqualified' ? now : undefined,
          cancellationReason:
            dto.outcome === 'unqualified'
              ? dto.unqualifiedReason ?? 'unqualified'
              : undefined,
        },
      });

      await tx.reservation.updateMany({
        where: {
          isActive: true,
          applicationItem: { applicationId: appId },
        },
        data: {
          isActive: false,
          releasedAt: now,
          releaseReason: `completion:${dto.outcome}`,
          internalStage: 'released',
        },
      });

      await tx.application.updateMany({
        where: { id: appId, isActive: true },
        data: {
          isActive: false,
          stage: dto.outcome === 'completed' ? 'completed' : 'cancelled',
          completedAt: dto.outcome === 'completed' ? now : null,
          cancelledAt: dto.outcome === 'unqualified' ? now : null,
        },
      });

      if (leadId) {
        await tx.lead.update({
          where: { id: leadId },
          data: {
            stage: dto.outcome === 'completed' ? 'completed' : 'unqualified',
            unqualifiedReason:
              dto.outcome === 'unqualified'
                ? dto.unqualifiedReason ?? undefined
                : undefined,
            lastActivityAt: now,
          },
        });
      }

      await tx.activityLogEntry.create({
        data: {
          action: dto.outcome === 'completed' ? 'completed' : 'unqualified',
          entityType: 'completion',
          entityId: completion.id,
          summary:
            dto.outcome === 'completed'
              ? 'Order marked as completed'
              : 'Order marked as unqualified',
          actorId: actor.id,
          payload: {
            departureId: dto.departureId,
            applicationId: appId,
            leadId,
          },
        },
      });

      return completion;
    });

    return created;
  }

  async update(id: string, dto: UpdateCompletionDto, actor: ActorContext) {
    await this.get(id, actor);

    const updated = await this.prisma.completion.update({
      where: { id },
      data: {
        completionNote:
          dto.completionNote === undefined ? undefined : dto.completionNote,
        unqualifiedReason:
          dto.unqualifiedReason === undefined ? undefined : dto.unqualifiedReason,
      },
    });

    await this.activity.log({
      action: 'updated',
      entityType: 'completion',
      entityId: id,
      summary: 'Completion updated',
      actorId: actor.id,
    });

    return updated;
  }
}
