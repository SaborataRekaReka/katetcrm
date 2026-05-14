import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../prisma/prisma.service';
import { ActivityService } from '../activity/activity.service';
import {
  DEFAULT_PERMISSIONS_MATRIX,
  PERMISSIONS_MATRIX_KEY,
  isAdminOnlyCapability,
  isManagerRequiredCapability,
  type PermissionsMatrixState,
  normalizePermissionsMatrix,
} from './permissions-matrix.defaults';
import {
  CreateUserDto,
  ListUsersQueryDto,
  UpdatePermissionCapabilityDto,
  UpdateUserDto,
} from './users.dto';

const USER_SELECT = {
  id: true,
  email: true,
  fullName: true,
  role: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activity: ActivityService,
  ) {}

  async listUsers(params: ListUsersQueryDto) {
    const where: Prisma.UserWhereInput = {};

    if (params.role) where.role = params.role as UserRole;
    if (typeof params.isActive === 'boolean') where.isActive = params.isActive;

    const query = params.query?.trim();
    if (query) {
      where.OR = [
        { fullName: { contains: query, mode: 'insensitive' } },
        { email: { contains: query, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        select: USER_SELECT,
        orderBy: [
          { role: 'asc' },
          { fullName: 'asc' },
        ],
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      items,
      total,
    };
  }

  listManagers() {
    return this.prisma.user.findMany({
      where: {
        role: 'manager',
        isActive: true,
      },
      select: {
        id: true,
        fullName: true,
        email: true,
      },
      orderBy: {
        fullName: 'asc',
      },
    });
  }

  async createUser(dto: CreateUserDto, actorId?: string) {
    const email = dto.email.trim().toLowerCase();
    const fullName = dto.fullName.trim();
    if (fullName.length < 2) {
      throw new BadRequestException('Имя должно содержать минимум 2 символа.');
    }

    const existing = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException('Пользователь с таким email уже существует.');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const created = await this.prisma.user.create({
      data: {
        email,
        fullName,
        passwordHash,
        role: dto.role ?? 'manager',
        isActive: dto.isActive ?? true,
      },
      select: USER_SELECT,
    });

    await this.activity.log({
      action: 'created',
      entityType: 'user',
      entityId: created.id,
      actorId,
      summary: `Создан пользователь ${created.fullName}`,
      payload: {
        email: created.email,
        role: created.role,
        isActive: created.isActive,
      },
    });

    return created;
  }

  async updateUser(id: string, dto: UpdateUserDto, actorId?: string) {
    const existing = await this.prisma.user.findUnique({
      where: { id },
      select: USER_SELECT,
    });
    if (!existing) {
      throw new NotFoundException('Пользователь не найден.');
    }

    const data: Prisma.UserUpdateInput = {};
    const before = {
      email: existing.email,
      fullName: existing.fullName,
      role: existing.role,
      isActive: existing.isActive,
    };

    if (dto.email !== undefined) {
      const email = dto.email.trim().toLowerCase();
      if (email !== existing.email) {
        const emailOwner = await this.prisma.user.findUnique({
          where: { email },
          select: { id: true },
        });
        if (emailOwner && emailOwner.id !== id) {
          throw new ConflictException('Пользователь с таким email уже существует.');
        }
        data.email = email;
      }
    }

    if (dto.fullName !== undefined) {
      const fullName = dto.fullName.trim();
      if (fullName.length < 2) {
        throw new BadRequestException('Имя должно содержать минимум 2 символа.');
      }
      if (fullName !== existing.fullName) data.fullName = fullName;
    }

    const nextRole = dto.role ?? existing.role;
    const nextIsActive = dto.isActive ?? existing.isActive;

    if (actorId === id && existing.isActive && !nextIsActive) {
      throw new BadRequestException('Нельзя деактивировать свою учётную запись.');
    }

    if (actorId === id && existing.role === 'admin' && nextRole !== 'admin') {
      throw new BadRequestException('Нельзя снять роль admin со своей учётной записи.');
    }

    if (
      existing.role === 'admin'
      && existing.isActive
      && (nextRole !== 'admin' || !nextIsActive)
    ) {
      const otherActiveAdmins = await this.prisma.user.count({
        where: {
          id: { not: id },
          role: 'admin',
          isActive: true,
        },
      });
      if (otherActiveAdmins === 0) {
        throw new BadRequestException('Нельзя убрать последнего активного администратора.');
      }
    }

    if (dto.role !== undefined && dto.role !== existing.role) data.role = dto.role;
    if (dto.isActive !== undefined && dto.isActive !== existing.isActive) data.isActive = dto.isActive;
    if (dto.password !== undefined) {
      data.passwordHash = await bcrypt.hash(dto.password, 10);
    }

    if (Object.keys(data).length === 0) {
      throw new BadRequestException('Нет изменений для сохранения.');
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data,
      select: USER_SELECT,
    });

    await this.activity.log({
      action: 'updated',
      entityType: 'user',
      entityId: updated.id,
      actorId,
      summary: `Обновлён пользователь ${updated.fullName}`,
      payload: {
        before,
        after: {
          email: updated.email,
          fullName: updated.fullName,
          role: updated.role,
          isActive: updated.isActive,
        },
        passwordChanged: dto.password !== undefined,
      },
    });

    return updated;
  }

  async getPermissionsMatrix() {
    return this.readPermissionsMatrix();
  }

  async updatePermissionCapability(
    id: string,
    dto: UpdatePermissionCapabilityDto,
    actorId?: string,
  ) {
    const matrix = await this.readPermissionsMatrix();
    const capability = matrix.capabilities.find((c) => c.id === id);
    if (!capability) {
      throw new NotFoundException('Возможность не найдена.');
    }

    const previous = {
      label: capability.label,
      admin: capability.matrix.admin,
      manager: capability.matrix.manager,
    };

    const hasChanges =
      dto.label !== undefined
      || dto.admin !== undefined
      || dto.manager !== undefined;

    if (!hasChanges) {
      throw new BadRequestException('Нет изменений для сохранения.');
    }

    if (capability.id === 'admin.permissions' && dto.admin === false) {
      throw new BadRequestException('Нельзя отключить право управления матрицей для роли admin.');
    }

    if (dto.manager === true && isAdminOnlyCapability(capability.id)) {
      throw new BadRequestException('Эта возможность закреплена только за ролью admin.');
    }

    if (dto.manager === false && isManagerRequiredCapability(capability.id)) {
      throw new BadRequestException('Эта возможность обязательна для роли manager.');
    }

    if (dto.label !== undefined) capability.label = dto.label.trim();
    if (dto.admin !== undefined) capability.matrix.admin = dto.admin;
    if (dto.manager !== undefined) capability.matrix.manager = dto.manager;
    if (isAdminOnlyCapability(capability.id)) capability.matrix.manager = false;
    if (isManagerRequiredCapability(capability.id)) capability.matrix.manager = true;

    await this.persistPermissionsMatrix(matrix);

    await this.activity.log({
      action: 'updated',
      entityType: 'permissions',
      entityId: capability.id,
      actorId,
      summary: `Обновлена матрица права ${capability.label}`,
      payload: {
        before: previous,
        after: {
          label: capability.label,
          admin: capability.matrix.admin,
          manager: capability.matrix.manager,
        },
      },
    });

    return capability;
  }

  private async readPermissionsMatrix(): Promise<PermissionsMatrixState> {
    const fallback = cloneJson(DEFAULT_PERMISSIONS_MATRIX);
    const existing = await this.prisma.systemConfig.findUnique({
      where: { key: PERMISSIONS_MATRIX_KEY },
      select: { payload: true },
    });

    if (!existing) {
      await this.prisma.systemConfig.create({
        data: {
          key: PERMISSIONS_MATRIX_KEY,
          payload: fallback as unknown as Prisma.InputJsonValue,
        },
      });
      return fallback;
    }

    return normalizePermissionsMatrix(existing.payload);
  }

  private async persistPermissionsMatrix(matrix: PermissionsMatrixState) {
    await this.prisma.systemConfig.upsert({
      where: { key: PERMISSIONS_MATRIX_KEY },
      create: {
        key: PERMISSIONS_MATRIX_KEY,
        payload: matrix as unknown as Prisma.InputJsonValue,
      },
      update: {
        payload: matrix as unknown as Prisma.InputJsonValue,
      },
    });
  }

  findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
  }

  findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }
}
