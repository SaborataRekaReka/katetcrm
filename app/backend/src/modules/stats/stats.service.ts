import { Injectable } from '@nestjs/common';
import type { Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export interface StatsActorContext {
  id: string;
  role: UserRole;
}

export interface ManagerLoad {
  id: string;
  name: string;
  openLeads: number;
  openApplications: number;
  activeReservations: number;
  activeDepartures: number;
}

const TERMINAL_LEAD_STAGES = ['completed', 'unqualified', 'cancelled'] as const;
const ACTIVE_DEPARTURE_STATUSES = ['scheduled', 'in_transit', 'arrived'] as const;

@Injectable()
export class StatsService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary(actor: StatsActorContext) {
    const now = new Date();
    const startToday = new Date(now);
    startToday.setHours(0, 0, 0, 0);
    const endToday = new Date(now);
    endToday.setHours(23, 59, 59, 999);
    const dayMs = 24 * 60 * 60 * 1000;
    const sevenDaysAgo = new Date(now.getTime() - 7 * dayMs);
    const twentyFourHoursAgo = new Date(now.getTime() - dayMs);

    const leadScope: Prisma.LeadWhereInput =
      actor.role === 'manager' ? { managerId: actor.id } : {};

    const reservationScope: Prisma.ReservationWhereInput =
      actor.role === 'manager'
        ? {
            applicationItem: {
              application: { responsibleManagerId: actor.id },
            },
          }
        : {};

    const departureScope: Prisma.DepartureWhereInput =
      actor.role === 'manager'
        ? {
            reservation: {
              applicationItem: {
                application: { responsibleManagerId: actor.id },
              },
            },
          }
        : {};

    const completionScope: Prisma.CompletionWhereInput =
      actor.role === 'manager'
        ? {
            departure: {
              reservation: {
                applicationItem: {
                  application: { responsibleManagerId: actor.id },
                },
              },
            },
          }
        : {};

    const activityScope: Prisma.ActivityLogEntryWhereInput =
      actor.role === 'manager' ? { actorId: actor.id } : {};

    const [
      groupedByStage,
      urgentLeads,
      staleLeads,
      conflicts,
      departuresToday,
      activeReservations,
      activeDepartures,
      completions7d,
      events24h,
      events7d,
      managers,
    ] = await Promise.all([
      this.prisma.lead.groupBy({
        by: ['stage'],
        where: leadScope,
        _count: { _all: true },
      }),
      this.prisma.lead.count({
        where: {
          ...leadScope,
          isUrgent: true,
          stage: { notIn: [...TERMINAL_LEAD_STAGES] },
        },
      }),
      this.prisma.lead.count({
        where: {
          ...leadScope,
          isStale: true,
          stage: { notIn: [...TERMINAL_LEAD_STAGES] },
        },
      }),
      this.prisma.reservation.count({
        where: {
          ...reservationScope,
          isActive: true,
          hasConflictWarning: true,
        },
      }),
      this.prisma.departure.count({
        where: {
          ...departureScope,
          scheduledAt: {
            gte: startToday,
            lte: endToday,
          },
        },
      }),
      this.prisma.reservation.count({
        where: {
          ...reservationScope,
          isActive: true,
        },
      }),
      this.prisma.departure.count({
        where: {
          ...departureScope,
          status: { in: [...ACTIVE_DEPARTURE_STATUSES] },
        },
      }),
      this.prisma.completion.count({
        where: {
          ...completionScope,
          completedAt: { gte: sevenDaysAgo },
        },
      }),
      this.prisma.activityLogEntry.count({
        where: {
          ...activityScope,
          createdAt: { gte: twentyFourHoursAgo },
        },
      }),
      this.prisma.activityLogEntry.count({
        where: {
          ...activityScope,
          createdAt: { gte: sevenDaysAgo },
        },
      }),
      this.buildManagersLoad(actor),
    ]);

    const stageMap = new Map<string, number>();
    for (const row of groupedByStage) {
      stageMap.set(row.stage, row._count._all);
    }

    const lead = stageMap.get('lead') ?? 0;
    const application = stageMap.get('application') ?? 0;
    const reservation = stageMap.get('reservation') ?? 0;
    const departure = stageMap.get('departure') ?? 0;
    const completed = stageMap.get('completed') ?? 0;
    const unqualified = stageMap.get('unqualified') ?? 0;
    const cancelled = stageMap.get('cancelled') ?? 0;

    const total =
      lead + application + reservation + departure + completed + unqualified + cancelled;
    const active = total - completed - unqualified - cancelled;

    return {
      generatedAt: now.toISOString(),
      pipeline: {
        lead,
        application,
        reservation,
        departure,
        completed,
        unqualified,
        cancelled,
        total,
        active,
      },
      operations: {
        urgentLeads,
        staleLeads,
        conflicts,
        departuresToday,
        activeReservations,
        activeDepartures,
        completions7d,
      },
      audit: {
        events24h,
        events7d,
      },
      managers,
    };
  }

  private async buildManagersLoad(actor: StatsActorContext): Promise<ManagerLoad[]> {
    if (actor.role === 'manager') {
      const me = await this.prisma.user.findUnique({
        where: { id: actor.id },
        select: { id: true, fullName: true },
      });
      if (!me) return [];
      return [await this.countForManager(me.id, me.fullName)];
    }

    const managers = await this.prisma.user.findMany({
      where: { role: 'manager', isActive: true },
      orderBy: { fullName: 'asc' },
      select: { id: true, fullName: true },
    });

    return Promise.all(
      managers.map((m) => this.countForManager(m.id, m.fullName)),
    );
  }

  private async countForManager(id: string, name: string): Promise<ManagerLoad> {
    const [openLeads, openApplications, activeReservations, activeDepartures] =
      await Promise.all([
        this.prisma.lead.count({
          where: {
            managerId: id,
            stage: { notIn: [...TERMINAL_LEAD_STAGES] },
          },
        }),
        this.prisma.application.count({
          where: {
            responsibleManagerId: id,
            isActive: true,
          },
        }),
        this.prisma.reservation.count({
          where: {
            isActive: true,
            applicationItem: {
              application: { responsibleManagerId: id },
            },
          },
        }),
        this.prisma.departure.count({
          where: {
            status: { in: [...ACTIVE_DEPARTURE_STATUSES] },
            reservation: {
              applicationItem: {
                application: { responsibleManagerId: id },
              },
            },
          },
        }),
      ]);

    return {
      id,
      name,
      openLeads,
      openApplications,
      activeReservations,
      activeDepartures,
    };
  }
}
