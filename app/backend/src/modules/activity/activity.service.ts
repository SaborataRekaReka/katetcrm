import { Injectable } from '@nestjs/common';
import { Prisma, type ActivityAction } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export interface LogInput {
  action: ActivityAction;
  entityType: string;
  entityId: string;
  summary: string;
  actorId?: string | null;
  payload?: Prisma.InputJsonValue;
}

@Injectable()
export class ActivityService {
  constructor(private readonly prisma: PrismaService) {}

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
    });
  }

  listRecent(take = 100) {
    return this.prisma.activityLogEntry.findMany({
      orderBy: { createdAt: 'desc' },
      take,
    });
  }
}
