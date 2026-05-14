import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  type UserRole,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ActivityService } from '../activity/activity.service';
import {
  type BugReportListResponse,
  BugReportListQueryDto,
  type BugReportView,
  CreateBugReportDto,
  UpdateBugReportStatusDto,
} from './bug-reports.dto';

export interface BugReportActorContext {
  id: string;
  role: UserRole;
}

const BUG_REPORT_INCLUDE = {
  reporter: {
    select: {
      id: true,
      fullName: true,
      email: true,
    },
  },
  resolvedBy: {
    select: {
      id: true,
      fullName: true,
      email: true,
    },
  },
} satisfies Prisma.BugReportInclude;

type BugReportWithRelations = Prisma.BugReportGetPayload<{ include: typeof BUG_REPORT_INCLUDE }>;

@Injectable()
export class BugReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activity: ActivityService,
  ) {}

  async create(dto: CreateBugReportDto, actor: BugReportActorContext): Promise<BugReportView> {
    const created = await this.prisma.bugReport.create({
      data: {
        title: dto.title.trim(),
        description: dto.description.trim(),
        steps: dto.steps?.trim() || null,
        expected: dto.expected?.trim() || null,
        routePath: dto.routePath?.trim() || null,
        severity: dto.severity ?? 'normal',
        reporterId: actor.id,
      },
      include: BUG_REPORT_INCLUDE,
    });

    await this.activity.log({
      action: 'created',
      entityType: 'bug_report',
      entityId: created.id,
      actorId: actor.id,
      summary: `Создано сообщение о баге: ${created.title}`,
      payload: {
        severity: created.severity,
        routePath: created.routePath,
      },
    });

    return this.toView(created);
  }

  async list(query: BugReportListQueryDto, actor: BugReportActorContext): Promise<BugReportListResponse> {
    this.assertAdmin(actor);

    const take = Math.min(Math.max(query.take ?? 200, 1), 500);
    const skip = Math.max(query.skip ?? 0, 0);
    const q = query.query?.trim();

    const where: Prisma.BugReportWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.severity ? { severity: query.severity } : {}),
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: 'insensitive' } },
              { description: { contains: q, mode: 'insensitive' } },
              { routePath: { contains: q, mode: 'insensitive' } },
              { reporter: { fullName: { contains: q, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.bugReport.findMany({
        where,
        orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
        include: BUG_REPORT_INCLUDE,
        take,
        skip,
      }),
      this.prisma.bugReport.count({ where }),
    ]);

    return {
      items: items.map((item) => this.toView(item)),
      total,
    };
  }

  async setStatus(
    id: string,
    dto: UpdateBugReportStatusDto,
    actor: BugReportActorContext,
  ): Promise<BugReportView> {
    this.assertAdmin(actor);

    const exists = await this.prisma.bugReport.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Сообщение о баге не найдено.');

    const updated = await this.prisma.bugReport.update({
      where: { id },
      data: {
        status: dto.status,
        resolvedAt: dto.status === 'resolved' ? new Date() : null,
        resolvedById: dto.status === 'resolved' ? actor.id : null,
      },
      include: BUG_REPORT_INCLUDE,
    });

    await this.activity.log({
      action: 'updated',
      entityType: 'bug_report',
      entityId: id,
      actorId: actor.id,
      summary: `Изменён статус сообщения о баге: ${updated.title} -> ${updated.status}`,
      payload: {
        status: updated.status,
      },
    });

    return this.toView(updated);
  }

  async remove(id: string, actor: BugReportActorContext) {
    this.assertAdmin(actor);

    const existing = await this.prisma.bugReport.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Сообщение о баге не найдено.');

    await this.prisma.bugReport.delete({ where: { id } });

    await this.activity.log({
      action: 'updated',
      entityType: 'bug_report',
      entityId: id,
      actorId: actor.id,
      summary: `Удалено сообщение о баге: ${existing.title}`,
    });

    return {
      ok: true as const,
      id,
    };
  }

  private assertAdmin(actor: BugReportActorContext) {
    if (actor.role !== 'admin') {
      throw new ForbiddenException('Только администратор может управлять сообщениями о багах.');
    }
  }

  private toView(item: BugReportWithRelations): BugReportView {
    return {
      id: item.id,
      title: item.title,
      description: item.description,
      steps: item.steps,
      expected: item.expected,
      routePath: item.routePath,
      severity: item.severity,
      status: item.status,
      reporterId: item.reporterId,
      reporterName: item.reporter?.fullName ?? null,
      resolvedAt: item.resolvedAt ? item.resolvedAt.toISOString() : null,
      resolvedById: item.resolvedById,
      resolvedByName: item.resolvedBy?.fullName ?? null,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    };
  }
}
