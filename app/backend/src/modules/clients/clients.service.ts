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
        contacts: {
          orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
        },
        requisites: true,
        tags: {
          orderBy: { assignedAt: 'desc' },
          include: {
            tag: {
              select: {
                id: true,
                label: true,
                tone: true,
                isSystem: true,
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
    const contactName = dto.name.trim();
    const contactPhone = dto.phone.trim();
    const contactEmail = dto.email?.trim() || null;

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
        contacts: {
          create: [
            {
              name: contactName,
              role: dto.company ? 'Контактное лицо' : 'Основной контакт',
              phone: contactPhone || null,
              email: contactEmail,
              isPrimary: true,
            },
          ],
        },
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
    const existing = await this.prisma.client.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException('Клиент не найден');

    const { contacts, requisites, ...clientPatch } = dto;

    await this.prisma.$transaction(async (tx) => {
      await tx.client.update({
        where: { id },
        data: {
          ...clientPatch,
          phoneNormalized:
            clientPatch.phone !== undefined
              ? normalizePhone(clientPatch.phone)
              : undefined,
          companyNormalized:
            clientPatch.company !== undefined
              ? (clientPatch.company ? normalizeCompany(clientPatch.company) : null)
              : undefined,
        },
      });

      if (contacts !== undefined) {
        const normalizedContacts = contacts
          .map((contact) => ({
            name: contact.name.trim(),
            role: contact.role?.trim() || null,
            phone: contact.phone?.trim() || null,
            email: contact.email?.trim() || null,
            isPrimary: contact.isPrimary ?? false,
          }))
          .filter((contact) => contact.name.length > 0);

        const hasPrimaryContact = normalizedContacts.some((contact) => contact.isPrimary);
        const contactsForCreate = normalizedContacts.map((contact, index) => ({
          clientId: id,
          name: contact.name,
          role: contact.role,
          phone: contact.phone,
          email: contact.email,
          isPrimary: hasPrimaryContact ? contact.isPrimary : index === 0,
        }));

        await tx.clientContact.deleteMany({ where: { clientId: id } });
        if (contactsForCreate.length > 0) {
          await tx.clientContact.createMany({ data: contactsForCreate });
        }
      }

      if (requisites !== undefined) {
        const requisitesPatch = {
          inn: requisites.inn?.trim() || null,
          kpp: requisites.kpp?.trim() || null,
          ogrn: requisites.ogrn?.trim() || null,
          legalAddress: requisites.legalAddress?.trim() || null,
          bankName: requisites.bankName?.trim() || null,
          bankAccount: requisites.bankAccount?.trim() || null,
          correspondentAccount: requisites.correspondentAccount?.trim() || null,
          bik: requisites.bik?.trim() || null,
        };

        const hasAnyRequisitesValue = Object.values(requisitesPatch).some(
          (value) => value !== null,
        );

        if (hasAnyRequisitesValue) {
          await tx.clientRequisites.upsert({
            where: { clientId: id },
            update: requisitesPatch,
            create: {
              clientId: id,
              ...requisitesPatch,
            },
          });
        } else {
          await tx.clientRequisites.deleteMany({ where: { clientId: id } });
        }
      }
    });

    const updated = await this.get(id);
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
