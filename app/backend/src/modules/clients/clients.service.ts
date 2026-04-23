import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ActivityService } from '../activity/activity.service';
import { normalizeCompany, normalizePhone } from '../../common/normalize';
import { CreateClientDto, UpdateClientDto } from './clients.dto';

export interface ClientListQuery {
  query?: string;
  take?: number;
  skip?: number;
}

@Injectable()
export class ClientsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activity: ActivityService,
  ) {}

  async list(params: ClientListQuery) {
    const take = Math.min(params.take ?? 50, 200);
    const skip = params.skip ?? 0;
    const q = params.query?.trim();
    const where = q
      ? {
          OR: [
            { name: { contains: q, mode: 'insensitive' as const } },
            { company: { contains: q, mode: 'insensitive' as const } },
            { phoneNormalized: { contains: normalizePhone(q) || q } },
          ],
        }
      : undefined;
    const [items, total] = await Promise.all([
      this.prisma.client.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        take,
        skip,
        include: {
          _count: { select: { applications: true, leads: true } },
          applications: {
            select: {
              id: true,
              isActive: true,
              completedAt: true,
              updatedAt: true,
              items: {
                select: {
                  reservations: {
                    where: { isActive: true },
                    select: { id: true },
                  },
                },
              },
            },
          },
        },
      }),
      this.prisma.client.count({ where }),
    ]);
    return { items, total };
  }

  async get(id: string) {
    const c = await this.prisma.client.findUnique({
      where: { id },
      include: {
        _count: { select: { applications: true, leads: true } },
        applications: {
          select: {
            id: true,
            isActive: true,
            completedAt: true,
            updatedAt: true,
            items: {
              select: {
                reservations: {
                  where: { isActive: true },
                  select: { id: true },
                },
              },
            },
          },
        },
      },
    });
    if (!c) throw new NotFoundException('Клиент не найден');
    return c;
  }

  async findDuplicates(phone: string | undefined, company: string | undefined) {
    const phoneNormalized = normalizePhone(phone);
    const companyNormalized = normalizeCompany(company);
    if (!phoneNormalized && !companyNormalized) return [];
    const or: Array<{ phoneNormalized?: string; companyNormalized?: string }> = [];
    if (phoneNormalized) or.push({ phoneNormalized });
    if (companyNormalized) or.push({ companyNormalized });
    return this.prisma.client.findMany({ where: { OR: or }, take: 10 });
  }

  async create(dto: CreateClientDto, actorId: string | null) {
    const created = await this.prisma.client.create({
      data: {
        name: dto.name,
        company: dto.company,
        phone: dto.phone,
        phoneNormalized: normalizePhone(dto.phone),
        companyNormalized: dto.company ? normalizeCompany(dto.company) : null,
        email: dto.email,
        notes: dto.notes,
        favoriteEquipment: dto.favoriteEquipment ?? [],
      },
    });
    await this.activity.log({
      action: 'created',
      entityType: 'client',
      entityId: created.id,
      summary: `Создан клиент ${created.name}`,
      actorId,
    });
    return created;
  }

  async update(id: string, dto: UpdateClientDto, actorId: string | null) {
    await this.get(id);
    const updated = await this.prisma.client.update({
      where: { id },
      data: {
        ...dto,
        phoneNormalized: dto.phone !== undefined ? normalizePhone(dto.phone) : undefined,
        companyNormalized:
          dto.company !== undefined ? (dto.company ? normalizeCompany(dto.company) : null) : undefined,
      },
    });
    await this.activity.log({
      action: 'updated',
      entityType: 'client',
      entityId: id,
      summary: `Обновлён клиент ${updated.name}`,
      actorId,
    });
    return this.get(id);
  }
}
