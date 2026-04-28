import { Injectable } from '@nestjs/common';
import { Prisma, type ActivityAction } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { ActivityModuleFilter } from './activity.dto';

export interface LogInput {
  action: ActivityAction;
  entityType: string;
  entityId: string;
  summary: string;
  actorId?: string | null;
  payload?: Prisma.InputJsonValue;
}

export interface ActivitySearchParams {
  entityType?: string;
  entityId?: string;
  actorId?: string;
  action?: ActivityAction;
  module?: ActivityModuleFilter;
  query?: string;
  from?: Date;
  to?: Date;
  take?: number;
  skip?: number;
}

const MODULE_ENTITY_TYPES: Record<ActivityModuleFilter, string[]> = {
  sales: ['lead', 'application', 'application_item', 'client', 'task'],
  ops: ['reservation', 'departure', 'completion'],
  admin: [
    'equipment_category',
    'equipment_type',
    'equipment_unit',
    'subcontractor',
    'user',
    'settings',
    'permissions',
  ],
};

@Injectable()
export class ActivityService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly actorSelect = {
    actor: {
      select: {
        id: true,
        fullName: true,
        email: true,
      },
    },
  } as const;

  async log(input: LogInput) {
    const data = {
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      summary: input.summary,
      actorId: input.actorId ?? null,
      payload: input.payload,
    };

    try {
      return await this.prisma.activityLogEntry.create({ data });
    } catch (error) {
      // Activity actor is optional; if token sub does not exist in users anymore,
      // keep the business operation successful and log entry without actor linkage.
      if (data.actorId && this.isActorForeignKeyViolation(error)) {
        return this.prisma.activityLogEntry.create({
          data: {
            ...data,
            actorId: null,
          },
        });
      }
      throw error;
    }
  }

  private isActorForeignKeyViolation(error: unknown): boolean {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError)) return false;
    if (error.code !== 'P2003') return false;
    const fieldName = String(
      (error.meta as Record<string, unknown> | undefined)?.field_name ?? '',
    );
    return fieldName.includes('activity_log_actor_id_fkey') || fieldName.includes('actor_id');
  }

  listForEntity(entityType: string, entityId: string, take = 50) {
    return this.prisma.activityLogEntry.findMany({
      where: { entityType, entityId },
      orderBy: { createdAt: 'desc' },
      take,
      include: this.actorSelect,
    });
  }

  listRecent(take = 100) {
    return this.prisma.activityLogEntry.findMany({
      orderBy: { createdAt: 'desc' },
      take,
      include: this.actorSelect,
    });
  }

  async listFiltered(params: ActivitySearchParams) {
    const take = Math.min(Math.max(params.take ?? 100, 1), 500);
    const skip = Math.max(params.skip ?? 0, 0);

    const where: Prisma.ActivityLogEntryWhereInput = {};

    if (params.entityType) where.entityType = params.entityType;
    if (params.entityId) where.entityId = params.entityId;
    if (params.actorId) where.actorId = params.actorId;
    if (params.action) where.action = params.action;

    if (params.module) {
      where.entityType = {
        in: MODULE_ENTITY_TYPES[params.module],
      };
    }

    if (params.from || params.to) {
      where.createdAt = {
        ...(params.from ? { gte: params.from } : {}),
        ...(params.to ? { lte: params.to } : {}),
      };
    }

    const q = params.query?.trim();
    if (q) {
      where.AND = [
        {
          OR: [
            { summary: { contains: q, mode: 'insensitive' } },
            { entityId: { contains: q, mode: 'insensitive' } },
            { entityType: { contains: q, mode: 'insensitive' } },
          ],
        },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.activityLogEntry.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take,
        skip,
        include: this.actorSelect,
      }),
      this.prisma.activityLogEntry.count({ where }),
    ]);

    return { items, total };
  }

  listRecentForActor(actorId: string, take = 100) {
    return this.prisma.activityLogEntry.findMany({
      where: { actorId },
      orderBy: { createdAt: 'desc' },
      take,
      include: this.actorSelect,
    });
  }
}
