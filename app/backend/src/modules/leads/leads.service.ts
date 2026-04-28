import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma, UserRole, PipelineStage } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ActivityService } from '../activity/activity.service';
import { normalizePhone } from '../../common/normalize';
import {
  ChangeStageDto,
  CreateLeadDto,
  LeadListQueryDto,
  UpdateLeadDto,
} from './leads.dto';

export interface ActorContext {
  id: string;
  role: UserRole;
}

/**
 * Правила перехода стадий (ТЗ §2.3, §3):
 *   lead          → application | unqualified
 *   application   → reservation | unqualified
 *   reservation   → departure | unqualified
 *   departure     → completed | unqualified
 *   completed     → (terminal)
 *   unqualified   → (terminal)
 */
const ALLOWED_TRANSITIONS: Record<PipelineStage, PipelineStage[]> = {
  lead: ['application', 'unqualified'],
  application: ['reservation', 'unqualified'],
  reservation: ['departure', 'unqualified'],
  departure: ['completed', 'unqualified'],
  completed: [],
  unqualified: [],
  cancelled: [],
};

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
      include: { client: true, manager: { select: { id: true, fullName: true } } },
    });
    return { items, total: items.length };
  }

  async get(id: string, actor: ActorContext) {
    const lead = await this.prisma.lead.findUnique({
      where: { id },
      include: {
        client: true,
        manager: { select: { id: true, fullName: true, email: true } },
        applications: { where: { isActive: true } },
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
    const allowed = ALLOWED_TRANSITIONS[existing.stage];
    if (!allowed.includes(dto.stage)) {
      throw new BadRequestException(
        `Недопустимый переход ${existing.stage} → ${dto.stage}`,
      );
    }

    // Инвариант: lead → application создаёт одну активную Application.
    // Используем partial unique index (leadId, isActive=true) для enforcement.
    return this.prisma.$transaction(async (tx) => {
      const lead = await tx.lead.update({
        where: { id },
        data: {
          stage: dto.stage,
          unqualifiedReason: dto.stage === 'unqualified' ? dto.reason : existing.unqualifiedReason,
          lastActivityAt: new Date(),
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
