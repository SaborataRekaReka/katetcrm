import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type {
  DepartureStatus,
  PipelineStage,
  ReservationInternalStage,
  UserRole,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ActivityService } from '../activity/activity.service';
import { normalizePhone } from '../../common/normalize';
import {
  ChangeStageDto,
  CreateLeadDto,
  LifecycleActionDto,
  LeadListQueryDto,
  UpdateLeadDto,
} from './leads.dto';

export interface ActorContext {
  id: string;
  role: UserRole;
}

type LeadApplicationPrerequisites = {
  address: string | null;
  requestedDate: Date | null;
  contactPhone: string | null;
  hasNoContact: boolean;
};

/**
 * Правила перехода стадий (ТЗ §2.3, §3):
 *   lead          → application | unqualified
 *   application   → reservation | unqualified
 *   reservation   → departure | unqualified
 *   departure     → (terminal outcomes only through completion flow)
 *   completed     → (terminal)
 *   unqualified   → (terminal)
 */
const ALLOWED_TRANSITIONS: Record<PipelineStage, PipelineStage[]> = {
  lead: ['application', 'unqualified'],
  application: ['reservation', 'unqualified'],
  reservation: ['departure', 'unqualified'],
  departure: [],
  completed: [],
  unqualified: [],
  cancelled: [],
};

const ACTIVE_DEPARTURE_STATUSES: DepartureStatus[] = [
  'scheduled',
  'in_transit',
  'arrived',
];

const LEAD_LIFECYCLE_INCLUDE = Prisma.validator<Prisma.LeadInclude>()({
  client: true,
  manager: { select: { id: true, fullName: true, email: true } },
  applications: {
    orderBy: [{ createdAt: 'desc' }],
    include: {
      items: {
        orderBy: [{ createdAt: 'asc' }],
        include: {
          reservations: {
            orderBy: [{ createdAt: 'desc' }],
            include: {
              departures: {
                orderBy: [{ scheduledAt: 'desc' }],
                include: { completion: true },
              },
            },
          },
        },
      },
    },
  },
});

type LeadLifecycleGraph = Prisma.LeadGetPayload<{
  include: typeof LEAD_LIFECYCLE_INCLUDE;
}>;
type LifecycleApplication = LeadLifecycleGraph['applications'][number];
type LifecycleReservation = LifecycleApplication['items'][number]['reservations'][number];
type LifecycleDeparture = LifecycleReservation['departures'][number];
type LifecycleMutationKind = 'rollback' | 'delete_current';

@Injectable()
export class LeadsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activity: ActivityService,
  ) {}

  async list(params: LeadListQueryDto, actor: ActorContext) {
    const where: Prisma.LeadWhereInput = {};
    if (params.stage) where.stage = params.stage;
    if (params.source) where.source = params.source;
    if (params.clientId) where.clientId = params.clientId;
    if (params.equipmentTypeHint) {
      where.equipmentTypeHint = { contains: params.equipmentTypeHint.trim(), mode: 'insensitive' };
    }
    if (typeof params.isUrgent === 'boolean') where.isUrgent = params.isUrgent;
    if (typeof params.isStale === 'boolean') where.isStale = params.isStale;
    if (typeof params.isDuplicate === 'boolean') where.isDuplicate = params.isDuplicate;
    if (typeof params.hasNoContact === 'boolean') where.hasNoContact = params.hasNoContact;
    // manager сам фильтрует "мои" через scope; admin видит всё.
    if (actor.role === 'manager' && params.scope !== 'all') {
      where.managerId = actor.id;
    } else if (params.managerId) {
      where.managerId = params.managerId;
    }
    const q = params.query?.trim();
    if (q) {
      const phoneNormalized = normalizePhone(q);
      where.OR = [
        { contactName: { contains: q, mode: 'insensitive' } },
        { contactCompany: { contains: q, mode: 'insensitive' } },
        phoneNormalized
          ? { phoneNormalized: { contains: phoneNormalized } }
          : { contactPhone: { contains: q } },
      ];
    }
    const items = await this.prisma.lead.findMany({
      where,
      orderBy: [{ lastActivityAt: 'desc' }],
      take: 500,
      include: {
        client: true,
        manager: { select: { id: true, fullName: true } },
        applications: {
          orderBy: [{ createdAt: 'desc' }],
          take: 1,
          select: {
            id: true,
            clientId: true,
            isActive: true,
            createdAt: true,
            items: {
              orderBy: [{ createdAt: 'desc' }],
              take: 1,
              select: {
                id: true,
                createdAt: true,
                reservations: {
                  orderBy: [{ createdAt: 'desc' }],
                  take: 1,
                  select: {
                    id: true,
                    isActive: true,
                    createdAt: true,
                    applicationItemId: true,
                    departures: {
                      orderBy: [{ scheduledAt: 'desc' }],
                      take: 1,
                      select: {
                        id: true,
                        status: true,
                        scheduledAt: true,
                        completion: { select: { id: true } },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
    return { items, total: items.length };
  }

  async get(id: string, actor: ActorContext) {
    const lead = await this.prisma.lead.findUnique({
      where: { id },
      include: {
        client: true,
        manager: { select: { id: true, fullName: true, email: true } },
        applications: {
          orderBy: [{ createdAt: 'desc' }],
          take: 3,
          select: {
            id: true,
            clientId: true,
            isActive: true,
            createdAt: true,
            items: {
              orderBy: [{ createdAt: 'desc' }],
              take: 3,
              select: {
                id: true,
                createdAt: true,
                reservations: {
                  orderBy: [{ createdAt: 'desc' }],
                  take: 3,
                  select: {
                    id: true,
                    isActive: true,
                    createdAt: true,
                    applicationItemId: true,
                    departures: {
                      orderBy: [{ scheduledAt: 'desc' }],
                      take: 3,
                      select: {
                        id: true,
                        status: true,
                        scheduledAt: true,
                        completion: { select: { id: true } },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
    if (!lead) throw new NotFoundException('Лид не найден');
    if (actor.role === 'manager' && lead.managerId !== actor.id) {
      throw new ForbiddenException('Недоступно');
    }
    return lead;
  }

  async findDuplicates(phone: string | undefined, company: string | undefined) {
    const phoneNormalized = normalizePhone(phone);
    const companyNormalized = company?.trim().toLowerCase().replace(/\s+/g, ' ');
    if (!phoneNormalized && !companyNormalized) return [];
    const or: Prisma.LeadWhereInput[] = [];
    if (phoneNormalized) or.push({ phoneNormalized });
    if (companyNormalized) or.push({ contactCompany: { equals: company, mode: 'insensitive' } });
    return this.prisma.lead.findMany({
      where: { OR: or, stage: { notIn: ['completed', 'unqualified'] } },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });
  }

  async create(dto: CreateLeadDto, actor: ActorContext) {
    const phoneNormalized = normalizePhone(dto.contactPhone);
    const duplicates = await this.findDuplicates(dto.contactPhone, dto.contactCompany);
    const managerId = dto.managerId ?? actor.id;
    const lead = await this.prisma.lead.create({
      data: {
        source: dto.source ?? 'manual',
        sourceLabel: dto.sourceLabel,
        contactName: dto.contactName,
        contactCompany: dto.contactCompany,
        contactPhone: dto.contactPhone,
        phoneNormalized,
        equipmentTypeHint: dto.equipmentTypeHint,
        requestedDate: dto.requestedDate ? new Date(dto.requestedDate) : null,
        timeWindow: dto.timeWindow,
        address: dto.address,
        comment: dto.comment,
        managerId,
        clientId: dto.clientId,
        isUrgent: dto.isUrgent ?? false,
        isDuplicate: duplicates.length > 0,
      },
    });
    await this.activity.log({
      action: 'created',
      entityType: 'lead',
      entityId: lead.id,
      summary: `Создан лид ${lead.contactName}`,
      actorId: actor.id,
      payload: { duplicatesFound: duplicates.length },
    });
    return { lead, duplicates };
  }

  private getLeadApplicationMissingFields(lead: LeadApplicationPrerequisites): string[] {
    const missing: string[] = [];
    if (!lead.address?.trim()) missing.push('адрес');
    if (!lead.requestedDate) missing.push('дата');
    if (!lead.contactPhone?.trim() || lead.hasNoContact) missing.push('контакт');
    return missing;
  }

  private async assertReservationTransitionReady(
    tx: Prisma.TransactionClient,
    leadId: string,
  ): Promise<string[]> {
    const applications = await tx.application.findMany({
      where: { leadId, isActive: true },
      select: {
        id: true,
        items: {
          select: {
            reservations: {
              where: { isActive: true },
              select: { id: true },
              take: 1,
            },
          },
        },
      },
    });

    if (applications.length === 0) {
      throw new BadRequestException(
        'Нельзя перевести в бронь без активной заявки',
      );
    }

    const hasActiveReservation = applications.some((application) =>
      application.items.some((item) => item.reservations.length > 0),
    );

    if (!hasActiveReservation) {
      throw new BadRequestException(
        'Сначала создайте бронь по готовой позиции заявки',
      );
    }

    return applications.map((application) => application.id);
  }

  private toJsonSnapshot(value: unknown): Prisma.InputJsonValue {
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
  }

  private async getLifecycleGraph(
    tx: Prisma.TransactionClient,
    id: string,
    actor: ActorContext,
  ): Promise<LeadLifecycleGraph> {
    const lead = await tx.lead.findUnique({
      where: { id },
      include: LEAD_LIFECYCLE_INCLUDE,
    });
    if (!lead) throw new NotFoundException('Лид не найден');
    if (actor.role === 'manager' && lead.managerId !== actor.id) {
      throw new ForbiddenException('Недоступно');
    }
    return lead;
  }

  private pickActiveApplication(lead: LeadLifecycleGraph): LifecycleApplication | null {
    return lead.applications.find((application) => application.isActive) ?? null;
  }

  private pickLatestApplication(lead: LeadLifecycleGraph): LifecycleApplication | null {
    return this.pickActiveApplication(lead) ?? lead.applications[0] ?? null;
  }

  private getReservations(application: LifecycleApplication): LifecycleReservation[] {
    return application.items.flatMap((item) => item.reservations);
  }

  private getDepartures(application: LifecycleApplication): LifecycleDeparture[] {
    return this.getReservations(application).flatMap((reservation) => reservation.departures);
  }

  private uniqueIds(items: Array<{ id: string }>): string[] {
    return Array.from(new Set(items.map((item) => item.id)));
  }

  private restoreDepartureStatus(departure: LifecycleDeparture): DepartureStatus {
    if (departure.arrivedAt) return 'arrived';
    if (departure.startedAt) return 'in_transit';
    return 'scheduled';
  }

  private restoreReservationStage(
    reservation: LifecycleReservation,
  ): ReservationInternalStage {
    if (reservation.equipmentUnitId) return 'ready_for_departure';
    if (reservation.subcontractorId) return 'subcontractor_selected';
    if (reservation.equipmentTypeId) return 'type_reserved';
    if (reservation.sourcingType === 'own') return 'searching_own_equipment';
    if (reservation.sourcingType === 'subcontractor') return 'searching_subcontractor';
    return 'needs_source_selection';
  }

  private async logLifecycleAction(
    tx: Prisma.TransactionClient,
    input: {
      leadId: string;
      actor: ActorContext;
      summary: string;
      payload: Record<string, unknown>;
      action?: 'updated' | 'stage_changed';
    },
  ) {
    await tx.activityLogEntry.create({
      data: {
        action: input.action ?? 'updated',
        entityType: 'lead',
        entityId: input.leadId,
        summary: input.summary,
        actorId: input.actor.id,
        payload: this.toJsonSnapshot(input.payload),
      },
    });
  }

  private lifecycleActionLabel(kind: LifecycleMutationKind): string {
    return kind === 'rollback' ? 'Откат стадии' : 'Удаление текущего представления';
  }

  private async rollbackApplication(
    tx: Prisma.TransactionClient,
    lead: LeadLifecycleGraph,
    dto: LifecycleActionDto,
    actor: ActorContext,
    kind: LifecycleMutationKind,
  ) {
    const application = this.pickActiveApplication(lead);
    if (!application) {
      throw new BadRequestException('Нет активной заявки для отката');
    }

    const downstreamReservations = this.getReservations(application);
    if (downstreamReservations.length > 0) {
      throw new BadRequestException(
        'Нельзя удалить заявку с бронями — сначала откатите цепочку с этапа брони',
      );
    }

    const now = new Date();
    await this.logLifecycleAction(tx, {
      leadId: lead.id,
      actor,
      summary: `${this.lifecycleActionLabel(kind)}: application → lead`,
      action: 'stage_changed',
      payload: {
        kind,
        from: 'application',
        to: 'lead',
        reason: dto.reason,
        deleted: { applicationId: application.id, number: application.number },
        snapshot: { application },
      },
    });

    await tx.application.delete({ where: { id: application.id } });
    await tx.lead.update({
      where: { id: lead.id },
      data: {
        stage: 'lead',
        unqualifiedReason: null,
        lastActivityAt: now,
      },
    });
  }

  private async rollbackReservation(
    tx: Prisma.TransactionClient,
    lead: LeadLifecycleGraph,
    dto: LifecycleActionDto,
    actor: ActorContext,
    kind: LifecycleMutationKind,
  ) {
    const application = this.pickActiveApplication(lead);
    if (!application) {
      throw new BadRequestException('Нет активной заявки для отката брони');
    }

    const activeReservations = this.getReservations(application).filter(
      (reservation) => reservation.isActive,
    );
    if (activeReservations.length === 0) {
      throw new BadRequestException('Нет активных броней для удаления');
    }

    const departures = activeReservations.flatMap((reservation) => reservation.departures);
    if (departures.length > 0) {
      throw new BadRequestException(
        'Нельзя удалить бронь с выездом — сначала откатите этап выезда',
      );
    }

    const reservationIds = this.uniqueIds(activeReservations);
    const now = new Date();
    await this.logLifecycleAction(tx, {
      leadId: lead.id,
      actor,
      summary: `${this.lifecycleActionLabel(kind)}: reservation → application`,
      action: 'stage_changed',
      payload: {
        kind,
        from: 'reservation',
        to: 'application',
        reason: dto.reason,
        deleted: { reservationIds },
        applicationId: application.id,
        snapshot: { reservations: activeReservations },
      },
    });

    await tx.reservation.deleteMany({ where: { id: { in: reservationIds } } });
    await tx.application.update({
      where: { id: application.id },
      data: {
        stage: 'application',
        isActive: true,
        cancelledAt: null,
        completedAt: null,
        lastActivityAt: now,
      },
    });
    await tx.lead.update({
      where: { id: lead.id },
      data: {
        stage: 'application',
        unqualifiedReason: null,
        lastActivityAt: now,
      },
    });
  }

  private async rollbackDeparture(
    tx: Prisma.TransactionClient,
    lead: LeadLifecycleGraph,
    dto: LifecycleActionDto,
    actor: ActorContext,
    kind: LifecycleMutationKind,
  ) {
    const application = this.pickActiveApplication(lead);
    if (!application) {
      throw new BadRequestException('Нет активной заявки для отката выезда');
    }

    const activeReservations = this.getReservations(application).filter(
      (reservation) => reservation.isActive,
    );
    const activeDepartures = activeReservations
      .flatMap((reservation) => reservation.departures)
      .filter((departure) => ACTIVE_DEPARTURE_STATUSES.includes(departure.status));
    if (activeDepartures.length === 0) {
      throw new BadRequestException('Нет активных выездов для удаления');
    }
    if (activeDepartures.some((departure) => departure.completion)) {
      throw new BadRequestException(
        'Выезд уже имеет завершение — используйте откат терминальной стадии',
      );
    }

    const departureIds = this.uniqueIds(activeDepartures);
    const reservationIds = this.uniqueIds(activeReservations);
    const now = new Date();
    await this.logLifecycleAction(tx, {
      leadId: lead.id,
      actor,
      summary: `${this.lifecycleActionLabel(kind)}: departure → reservation`,
      action: 'stage_changed',
      payload: {
        kind,
        from: 'departure',
        to: 'reservation',
        reason: dto.reason,
        deleted: { departureIds },
        applicationId: application.id,
        reservationIds,
        snapshot: { departures: activeDepartures },
      },
    });

    await tx.departure.deleteMany({ where: { id: { in: departureIds } } });
    await tx.reservation.updateMany({
      where: { id: { in: reservationIds } },
      data: {
        isActive: true,
        releasedAt: null,
        releaseReason: null,
      },
    });
    await tx.application.update({
      where: { id: application.id },
      data: {
        stage: 'reservation',
        isActive: true,
        cancelledAt: null,
        completedAt: null,
        lastActivityAt: now,
      },
    });
    await tx.lead.update({
      where: { id: lead.id },
      data: {
        stage: 'reservation',
        unqualifiedReason: null,
        lastActivityAt: now,
      },
    });
  }

  private async restoreReservations(
    tx: Prisma.TransactionClient,
    reservations: LifecycleReservation[],
  ) {
    for (const reservation of reservations) {
      await tx.reservation.update({
        where: { id: reservation.id },
        data: {
          isActive: true,
          releasedAt: null,
          releaseReason: null,
          internalStage: this.restoreReservationStage(reservation),
        },
      });
    }
  }

  private async restoreTerminalDepartures(
    tx: Prisma.TransactionClient,
    departures: LifecycleDeparture[],
  ) {
    for (const departure of departures) {
      await tx.departure.update({
        where: { id: departure.id },
        data: {
          status: this.restoreDepartureStatus(departure),
          completedAt: null,
          cancelledAt: null,
          cancellationReason: null,
        },
      });
    }
  }

  private async rollbackTerminal(
    tx: Prisma.TransactionClient,
    lead: LeadLifecycleGraph,
    dto: LifecycleActionDto,
    actor: ActorContext,
    kind: LifecycleMutationKind,
  ) {
    const application = this.pickLatestApplication(lead);
    const now = new Date();

    if (!application) {
      await this.logLifecycleAction(tx, {
        leadId: lead.id,
        actor,
        summary: `${this.lifecycleActionLabel(kind)}: ${lead.stage} → lead`,
        action: 'stage_changed',
        payload: {
          kind,
          from: lead.stage,
          to: 'lead',
          reason: dto.reason,
          snapshot: { lead },
        },
      });
      await tx.lead.update({
        where: { id: lead.id },
        data: { stage: 'lead', unqualifiedReason: null, lastActivityAt: now },
      });
      return;
    }

    const reservations = this.getReservations(application);
    const departures = this.getDepartures(application);
    const departuresWithCompletion = departures.filter((departure) => departure.completion);

    if (departuresWithCompletion.length > 0) {
      const completionIds = departuresWithCompletion
        .map((departure) => departure.completion?.id)
        .filter((id): id is string => Boolean(id));

      await this.logLifecycleAction(tx, {
        leadId: lead.id,
        actor,
        summary: `${this.lifecycleActionLabel(kind)}: ${lead.stage} → departure`,
        action: 'stage_changed',
        payload: {
          kind,
          from: lead.stage,
          to: 'departure',
          reason: dto.reason,
          deleted: { completionIds },
          applicationId: application.id,
          snapshot: {
            completions: departuresWithCompletion.map((departure) => departure.completion),
            departures: departuresWithCompletion,
            reservations,
            application,
          },
        },
      });

      await tx.completion.deleteMany({ where: { id: { in: completionIds } } });
      await this.restoreTerminalDepartures(tx, departuresWithCompletion);
      await this.restoreReservations(tx, reservations);
      await tx.application.update({
        where: { id: application.id },
        data: {
          stage: 'departure',
          isActive: true,
          completedAt: null,
          cancelledAt: null,
          lastActivityAt: now,
        },
      });
      await tx.lead.update({
        where: { id: lead.id },
        data: {
          stage: 'departure',
          unqualifiedReason: null,
          lastActivityAt: now,
        },
      });
      return;
    }

    const fallbackStage: PipelineStage = departures.length > 0
      ? 'departure'
      : reservations.length > 0
        ? 'reservation'
        : 'application';

    await this.logLifecycleAction(tx, {
      leadId: lead.id,
      actor,
      summary: `${this.lifecycleActionLabel(kind)}: ${lead.stage} → ${fallbackStage}`,
      action: 'stage_changed',
      payload: {
        kind,
        from: lead.stage,
        to: fallbackStage,
        reason: dto.reason,
        applicationId: application.id,
        snapshot: { application, reservations, departures },
      },
    });

    if (departures.length > 0) {
      await this.restoreTerminalDepartures(
        tx,
        departures.filter((departure) => departure.status === 'completed' || departure.status === 'cancelled'),
      );
    }
    if (reservations.length > 0) {
      await this.restoreReservations(tx, reservations);
    }
    await tx.application.update({
      where: { id: application.id },
      data: {
        stage: fallbackStage === 'application' ? 'application' : fallbackStage,
        isActive: true,
        completedAt: null,
        cancelledAt: null,
        lastActivityAt: now,
      },
    });
    await tx.lead.update({
      where: { id: lead.id },
      data: {
        stage: fallbackStage,
        unqualifiedReason: null,
        lastActivityAt: now,
      },
    });
  }

  private async applyLifecycleRollback(
    tx: Prisma.TransactionClient,
    lead: LeadLifecycleGraph,
    dto: LifecycleActionDto,
    actor: ActorContext,
    kind: LifecycleMutationKind,
  ) {
    if (lead.stage === 'lead') {
      throw new BadRequestException('Лид уже на первой стадии цепочки');
    }
    if (lead.stage === 'cancelled') {
      throw new BadRequestException('Откат из стадии cancelled не поддерживается');
    }
    if (lead.stage === 'application') {
      await this.rollbackApplication(tx, lead, dto, actor, kind);
      return;
    }
    if (lead.stage === 'reservation') {
      await this.rollbackReservation(tx, lead, dto, actor, kind);
      return;
    }
    if (lead.stage === 'departure') {
      await this.rollbackDeparture(tx, lead, dto, actor, kind);
      return;
    }
    await this.rollbackTerminal(tx, lead, dto, actor, kind);
  }

  async rollbackStage(id: string, dto: LifecycleActionDto, actor: ActorContext) {
    await this.prisma.$transaction(async (tx) => {
      const lead = await this.getLifecycleGraph(tx, id, actor);
      await this.applyLifecycleRollback(tx, lead, dto, actor, 'rollback');
    });
    return this.get(id, actor);
  }

  async deleteCurrentRepresentation(id: string, dto: LifecycleActionDto, actor: ActorContext) {
    await this.prisma.$transaction(async (tx) => {
      const lead = await this.getLifecycleGraph(tx, id, actor);
      await this.applyLifecycleRollback(tx, lead, dto, actor, 'delete_current');
    });
    return this.get(id, actor);
  }

  async deleteChain(id: string, dto: LifecycleActionDto, actor: ActorContext) {
    if (actor.role !== 'admin') {
      throw new ForbiddenException('Удаление цепочки доступно только администратору');
    }

    return this.prisma.$transaction(async (tx) => {
      const lead = await this.getLifecycleGraph(tx, id, actor);
      const applications = lead.applications;
      const reservations = applications.flatMap((application) => this.getReservations(application));
      const departures = applications.flatMap((application) => this.getDepartures(application));
      const completions = departures
        .map((departure) => departure.completion)
        .filter((completion): completion is NonNullable<typeof completion> => Boolean(completion));
      const applicationIds = this.uniqueIds(applications);
      const reservationIds = this.uniqueIds(reservations);
      const departureIds = this.uniqueIds(departures);
      const completionIds = this.uniqueIds(completions);

      await this.logLifecycleAction(tx, {
        leadId: lead.id,
        actor,
        summary: 'Удалена CRM-цепочка лида',
        payload: {
          kind: 'delete_chain',
          reason: dto.reason,
          preserved: {
            clientId: lead.clientId,
            clientName: lead.client?.name ?? null,
            clientCompany: lead.client?.company ?? null,
          },
          deleted: {
            leadId: lead.id,
            applicationIds,
            reservationIds,
            departureIds,
            completionIds,
          },
          snapshot: { lead },
        },
      });

      if (completionIds.length > 0) {
        await tx.completion.deleteMany({ where: { id: { in: completionIds } } });
      }
      if (departureIds.length > 0) {
        await tx.departure.deleteMany({ where: { id: { in: departureIds } } });
      }
      if (reservationIds.length > 0) {
        await tx.reservation.deleteMany({ where: { id: { in: reservationIds } } });
      }
      if (applicationIds.length > 0) {
        await tx.application.deleteMany({ where: { id: { in: applicationIds } } });
      }
      await tx.lead.delete({ where: { id: lead.id } });

      return {
        ok: true,
        deleted: {
          leadId: lead.id,
          applications: applicationIds.length,
          reservations: reservationIds.length,
          departures: departureIds.length,
          completions: completionIds.length,
        },
        preserved: {
          clientId: lead.clientId,
        },
      };
    });
  }

  async update(id: string, dto: UpdateLeadDto, actor: ActorContext) {
    const existing = await this.get(id, actor);
    const phoneChanged = dto.contactPhone !== undefined && dto.contactPhone !== existing.contactPhone;
    const updated = await this.prisma.lead.update({
      where: { id },
      data: {
        ...dto,
        phoneNormalized: phoneChanged ? normalizePhone(dto.contactPhone) : undefined,
        requestedDate: dto.requestedDate ? new Date(dto.requestedDate) : undefined,
        lastActivityAt: new Date(),
      },
    });
    await this.activity.log({
      action: 'updated',
      entityType: 'lead',
      entityId: id,
      summary: `Обновлён лид ${updated.contactName}`,
      actorId: actor.id,
    });
    return updated;
  }

  async changeStage(id: string, dto: ChangeStageDto, actor: ActorContext) {
    const existing = await this.get(id, actor);
    if (existing.stage === 'lead' && dto.stage === 'application') {
      const missing = this.getLeadApplicationMissingFields(existing);
      if (missing.length > 0) {
        throw new BadRequestException(
          `Для перевода в заявку заполните: ${missing.join(', ')}`,
        );
      }
    }
    if (dto.stage === 'unqualified' && !dto.reason?.trim()) {
      throw new BadRequestException('reason is required for unqualified stage');
    }
    if (
      existing.stage === 'departure' &&
      (dto.stage === 'completed' || dto.stage === 'unqualified')
    ) {
      throw new BadRequestException(
        'Завершение этапа departure выполняется через completion',
      );
    }
    const allowed = ALLOWED_TRANSITIONS[existing.stage];
    if (!allowed.includes(dto.stage)) {
      throw new BadRequestException(
        `Недопустимый переход ${existing.stage} → ${dto.stage}`,
      );
    }

    // Инвариант: lead → application создаёт одну активную Application.
    // Используем partial unique index (leadId, isActive=true) для enforcement.
    return this.prisma.$transaction(async (tx) => {
      const now = new Date();
      const activeApplicationIdsForReservation =
        existing.stage === 'application' && dto.stage === 'reservation'
          ? await this.assertReservationTransitionReady(tx, id)
          : [];

      const lead = await tx.lead.update({
        where: { id },
        data: {
          stage: dto.stage,
          unqualifiedReason: dto.stage === 'unqualified' ? dto.reason : existing.unqualifiedReason,
          lastActivityAt: now,
        },
      });

      // Создание Application при lead→application
      if (existing.stage === 'lead' && dto.stage === 'application') {
        if (!lead.clientId) {
          // создаём клиента из контактов лида (минимальный сценарий)
          const created = await tx.client.create({
            data: {
              name: lead.contactName,
              company: lead.contactCompany,
              phone: lead.contactPhone,
              phoneNormalized: lead.phoneNormalized,
              companyNormalized: lead.contactCompany
                ? lead.contactCompany.trim().toLowerCase().replace(/\s+/g, ' ')
                : null,
              contacts: {
                create: [
                  {
                    name: lead.contactName,
                    role: lead.contactCompany ? 'Контактное лицо' : 'Основной контакт',
                    phone: lead.contactPhone,
                    isPrimary: true,
                  },
                ],
              },
            },
          });
          await tx.lead.update({ where: { id }, data: { clientId: created.id } });
          lead.clientId = created.id;
        }
        const count = await tx.application.count({});
        const number = `APP-${(count + 1).toString().padStart(6, '0')}`;
        await tx.application.create({
          data: {
            number,
            leadId: lead.id,
            clientId: lead.clientId!,
            responsibleManagerId: lead.managerId,
            requestedDate: lead.requestedDate,
            address: lead.address,
            comment: lead.comment,
            isUrgent: lead.isUrgent,
            isActive: true,
          },
        });
      }

      if (existing.stage === 'application' && dto.stage === 'reservation') {
        await tx.application.updateMany({
          where: { id: { in: activeApplicationIdsForReservation } },
          data: {
            stage: 'reservation',
            lastActivityAt: now,
          },
        });
      }

      // Автосоздание Departure при reservation→departure по всем активным броням
      // этого лида (если у конкретной брони ещё нет активного выезда).
      if (existing.stage === 'reservation' && dto.stage === 'departure') {
        const apps = await tx.application.findMany({
          where: { leadId: id, isActive: true },
          select: { id: true },
        });
        if (apps.length > 0) {
          const appIds = apps.map((a) => a.id);
          const reservations = await tx.reservation.findMany({
            where: {
              isActive: true,
              applicationItem: { applicationId: { in: appIds } },
            },
            select: {
              id: true,
              plannedStart: true,
              comment: true,
              departures: {
                where: { status: { in: ['scheduled', 'in_transit', 'arrived'] } },
                select: { id: true },
                take: 1,
              },
            },
          });
          for (const r of reservations) {
            if (r.departures.length > 0) continue;
            const dep = await tx.departure.create({
              data: {
                reservationId: r.id,
                scheduledAt: r.plannedStart,
                notes: r.comment,
                status: 'scheduled',
              },
            });
            await tx.activityLogEntry.create({
              data: {
                action: 'created',
                entityType: 'departure',
                entityId: dep.id,
                summary: 'Departure auto-created from lead transition to departure',
                actorId: actor.id,
                payload: {
                  leadId: id,
                  reservationId: r.id,
                },
              },
            });
          }
        }
      }

      // Автоснятие активных броней при completed/unqualified (ТЗ §3.3)
      if (dto.stage === 'completed' || dto.stage === 'unqualified') {
        const apps = await tx.application.findMany({
          where: { leadId: id, isActive: true },
          select: { id: true },
        });
        if (apps.length > 0) {
          const appIds = apps.map((a) => a.id);
          await tx.reservation.updateMany({
            where: { applicationItem: { applicationId: { in: appIds } }, isActive: true },
            data: {
              isActive: false,
              releasedAt: new Date(),
              releaseReason: `lead:${dto.stage}`,
              internalStage: 'released',
            },
          });
          if (dto.stage === 'completed' || dto.stage === 'unqualified') {
            await tx.application.updateMany({
              where: { id: { in: appIds } },
              data: {
                isActive: false,
                completedAt: dto.stage === 'completed' ? new Date() : null,
                cancelledAt: dto.stage === 'unqualified' ? new Date() : null,
                // Application domain keeps terminal states as completed/cancelled.
                stage: dto.stage === 'completed' ? 'completed' : 'cancelled',
              },
            });
          }
        }
      }

      await this.activity.log({
        action: 'stage_changed',
        entityType: 'lead',
        entityId: id,
        summary: `Стадия: ${existing.stage} → ${dto.stage}`,
        actorId: actor.id,
        payload: { from: existing.stage, to: dto.stage, reason: dto.reason },
      });

      return lead;
    });
  }
}
