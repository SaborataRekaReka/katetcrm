import { Injectable } from '@nestjs/common';
import type { Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { StatsAnalyticsViewId } from './stats.dto';

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

export interface StatsReportRow {
  id: string;
  name: string;
  category: 'Продажи' | 'Операции' | 'Контроль' | 'Импорт';
  period: string;
  owner: string;
  value: string;
  targetModule: 'dashboard' | 'audit' | 'imports';
}

export interface StatsReportsResponse {
  generatedAt: string;
  periodDays: 7 | 30;
  items: StatsReportRow[];
}

export interface StatsAnalyticsManagerRow {
  id: string;
  name: string;
  count: number;
}

export interface StatsAnalyticsSampleRow {
  id: string;
  stage: string;
  manager: string;
  company: string | null;
  client: string;
  equipmentType: string;
  isUrgent: boolean;
  isStale: boolean;
  hasConflict: boolean;
  lastActivityAt: string;
}

export interface StatsAnalyticsViewResponse {
  generatedAt: string;
  viewId: StatsAnalyticsViewId;
  summary: {
    total: number;
    managers: number;
    urgent: number;
    conflicts: number;
  };
  managers: StatsAnalyticsManagerRow[];
  samples: StatsAnalyticsSampleRow[];
}

interface StatsScopes {
  leadScope: Prisma.LeadWhereInput;
  applicationScope: Prisma.ApplicationWhereInput;
  reservationScope: Prisma.ReservationWhereInput;
  departureScope: Prisma.DepartureWhereInput;
  completionScope: Prisma.CompletionWhereInput;
  activityScope: Prisma.ActivityLogEntryWhereInput;
}

const TERMINAL_LEAD_STAGES = ['completed', 'unqualified', 'cancelled'] as const;
const ACTIVE_DEPARTURE_STATUSES = ['scheduled', 'in_transit', 'arrived'] as const;
const STALE_LEAD_DAYS = 3;

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
    const staleThreshold = this.getStaleThreshold(now);

    const {
      leadScope,
      reservationScope,
      departureScope,
      completionScope,
      activityScope,
    } = this.buildScopes(actor);

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
          lastActivityAt: { lt: staleThreshold },
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
          status: { in: [...ACTIVE_DEPARTURE_STATUSES] },
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

  async getReportSlices(
    actor: StatsActorContext,
    periodDays: 7 | 30 = 30,
  ): Promise<StatsReportsResponse> {
    const safePeriod: 7 | 30 = periodDays === 7 ? 7 : 30;
    const now = new Date();
    const dayMs = 24 * 60 * 60 * 1000;
    const from = new Date(now.getTime() - safePeriod * dayMs);
    const periodLabel = `${safePeriod} дней`;

    const {
      leadScope,
      applicationScope,
      reservationScope,
      activityScope,
    } = this.buildScopes(actor);

    const [summary, leadsCreated, applicationsCreated, conflictWarnings, auditEvents, importedEvents] =
      await Promise.all([
        this.getSummary(actor),
        this.prisma.lead.count({
          where: {
            ...leadScope,
            createdAt: { gte: from },
          },
        }),
        this.prisma.application.count({
          where: {
            ...applicationScope,
            createdAt: { gte: from },
          },
        }),
        this.prisma.reservation.count({
          where: {
            ...reservationScope,
            hasConflictWarning: true,
            createdAt: { gte: from },
          },
        }),
        this.prisma.activityLogEntry.count({
          where: {
            ...activityScope,
            createdAt: { gte: from },
          },
        }),
        this.prisma.activityLogEntry.count({
          where: {
            ...activityScope,
            action: 'imported',
            createdAt: { gte: from },
          },
        }),
      ]);

    const conversion =
      leadsCreated > 0
        ? ((applicationsCreated / leadsCreated) * 100).toFixed(1)
        : '0.0';

    return {
      generatedAt: now.toISOString(),
      periodDays: safePeriod,
      items: [
        {
          id: 'KPI-PIPE-ACTIVE',
          name: 'Активные записи в воронке',
          category: 'Продажи',
          period: 'Сейчас',
          owner: 'Система',
          value: String(summary.pipeline.active),
          targetModule: 'dashboard',
        },
        {
          id: 'KPI-CONV-LEAD-APP',
          name: 'Конверсия lead → application',
          category: 'Продажи',
          period: periodLabel,
          owner: 'Система',
          value: `${conversion}%`,
          targetModule: 'dashboard',
        },
        {
          id: 'KPI-OPS-CONFLICTS',
          name: 'Конфликты бронирований',
          category: 'Операции',
          period: periodLabel,
          owner: 'Система',
          value: String(conflictWarnings),
          targetModule: 'dashboard',
        },
        {
          id: 'KPI-AUDIT-COVERAGE',
          name: 'События аудита',
          category: 'Контроль',
          period: periodLabel,
          owner: 'Система',
          value: String(auditEvents),
          targetModule: 'audit',
        },
        {
          id: 'KPI-IMPORT-TOTAL',
          name: 'Импортированные записи',
          category: 'Импорт',
          period: periodLabel,
          owner: 'Система',
          value: String(importedEvents),
          targetModule: 'imports',
        },
      ],
    };
  }

  async getAnalyticsView(
    actor: StatsActorContext,
    viewId: StatsAnalyticsViewId,
    sampleTake = 6,
  ): Promise<StatsAnalyticsViewResponse> {
    const now = new Date();
    const safeTake = Math.min(Math.max(sampleTake, 1), 20);

    const {
      leadScope,
      reservationScope,
    } = this.buildScopes(actor);

    const filteredLeadScope = this.buildLeadScopeForAnalyticsView(leadScope, viewId);

    const [
      total,
      urgent,
      groupedManagers,
      sampleLeads,
      conflicts,
    ] = await Promise.all([
      this.prisma.lead.count({ where: filteredLeadScope }),
      this.prisma.lead.count({
        where: {
          ...filteredLeadScope,
          isUrgent: true,
        },
      }),
      this.prisma.lead.groupBy({
        by: ['managerId'],
        where: filteredLeadScope,
        _count: { _all: true },
      }),
      this.prisma.lead.findMany({
        where: filteredLeadScope,
        orderBy: [{ lastActivityAt: 'desc' }],
        take: safeTake,
        include: {
          manager: { select: { id: true, fullName: true } },
        },
      }),
      viewId === 'view-active-reservations'
        ? this.prisma.reservation.count({
            where: {
              ...reservationScope,
              isActive: true,
              hasConflictWarning: true,
            },
          })
        : Promise.resolve(0),
    ]);

    const managerIds = groupedManagers
      .map((row) => row.managerId)
      .filter((id): id is string => !!id);

    const managerNameById = new Map<string, string>();
    if (managerIds.length > 0) {
      const managers = await this.prisma.user.findMany({
        where: { id: { in: managerIds } },
        select: { id: true, fullName: true },
      });
      for (const m of managers) {
        managerNameById.set(m.id, m.fullName);
      }
    }

    const managerRows: StatsAnalyticsManagerRow[] = groupedManagers
      .map((row) => {
        const id = row.managerId ?? 'unassigned';
        return {
          id,
          name: row.managerId ? (managerNameById.get(row.managerId) ?? 'Не назначен') : 'Не назначен',
          count: row._count._all,
        };
      })
      .sort((a, b) => b.count - a.count);

    let conflictLeadIds = new Set<string>();
    if (viewId === 'view-active-reservations' && sampleLeads.length > 0) {
      const leadIds = sampleLeads.map((lead) => lead.id);
      const conflictedReservations = await this.prisma.reservation.findMany({
        where: {
          ...reservationScope,
          isActive: true,
          hasConflictWarning: true,
          applicationItem: {
            application: {
              leadId: { in: leadIds },
            },
          },
        },
        select: {
          applicationItem: {
            select: {
              application: {
                select: {
                  leadId: true,
                },
              },
            },
          },
        },
      });

      conflictLeadIds = new Set(
        conflictedReservations.map((item) => item.applicationItem.application.leadId),
      );
    }

    const samples: StatsAnalyticsSampleRow[] = sampleLeads.map((lead) => ({
      id: lead.id,
      stage: lead.stage,
      manager: lead.manager?.fullName ?? 'Не назначен',
      company: lead.contactCompany,
      client: lead.contactName,
      equipmentType: lead.equipmentTypeHint ?? '—',
      isUrgent: lead.isUrgent,
      isStale: lead.isStale,
      hasConflict: conflictLeadIds.has(lead.id),
      lastActivityAt: lead.lastActivityAt.toISOString(),
    }));

    return {
      generatedAt: now.toISOString(),
      viewId,
      summary: {
        total,
        managers: managerRows.length,
        urgent,
        conflicts,
      },
      managers: managerRows,
      samples,
    };
  }

  private buildLeadScopeForAnalyticsView(
    baseLeadScope: Prisma.LeadWhereInput,
    viewId: StatsAnalyticsViewId,
  ): Prisma.LeadWhereInput {
    if (viewId === 'view-stale-leads') {
      const staleThreshold = this.getStaleThreshold();
      return {
        ...baseLeadScope,
        lastActivityAt: { lt: staleThreshold },
        stage: { notIn: [...TERMINAL_LEAD_STAGES] },
      };
    }

    if (viewId === 'view-lost-leads') {
      return {
        ...baseLeadScope,
        stage: 'unqualified',
      };
    }

    if (viewId === 'view-active-reservations') {
      return {
        ...baseLeadScope,
        stage: 'reservation',
      };
    }

    return {
      ...baseLeadScope,
      stage: { notIn: [...TERMINAL_LEAD_STAGES] },
    };
  }

  private getStaleThreshold(from: Date = new Date()) {
    return new Date(from.getTime() - STALE_LEAD_DAYS * 24 * 60 * 60 * 1000);
  }

  private buildScopes(actor: StatsActorContext): StatsScopes {
    const leadScope: Prisma.LeadWhereInput =
      actor.role === 'manager' ? { managerId: actor.id } : {};

    const applicationScope: Prisma.ApplicationWhereInput =
      actor.role === 'manager' ? { responsibleManagerId: actor.id } : {};

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

    return {
      leadScope,
      applicationScope,
      reservationScope,
      departureScope,
      completionScope,
      activityScope,
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
