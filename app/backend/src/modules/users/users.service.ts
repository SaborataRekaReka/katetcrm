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

export interface PermissionCapability {
  id: string;
  label: string;
  matrix: Record<UserRole, boolean>;
}

export interface PermissionsMatrixState {
  roles: UserRole[];
  capabilities: PermissionCapability[];
}

const PERMISSIONS_MATRIX_KEY = 'admin.permissions_matrix.v1';

const DEFAULT_PERMISSIONS_MATRIX: PermissionsMatrixState = {
  roles: ['admin', 'manager'],
  capabilities: [
    {
      id: 'leads.read',
      label: 'Чтение лидов',
      matrix: { admin: true, manager: true },
    },
    {
      id: 'leads.write',
      label: 'Редактирование лидов',
      matrix: { admin: true, manager: true },
    },
    {
      id: 'applications.write',
      label: 'Редактирование заявок',
      matrix: { admin: true, manager: true },
    },
    {
      id: 'reservations.confirm',
      label: 'Подтверждение броней',
      matrix: { admin: true, manager: true },
    },
    {
      id: 'departures.start',
      label: 'Запуск выездов',
      matrix: { admin: true, manager: true },
    },
    {
      id: 'completion.sign',
      label: 'Подписание актов',
      matrix: { admin: true, manager: true },
    },
    {
      id: 'catalogs.write',
      label: 'Управление справочниками',
      matrix: { admin: true, manager: false },
    },
    {
      id: 'admin.users',
      label: 'Управление пользователями',
      matrix: { admin: true, manager: false },
    },
    {
      id: 'admin.permissions',
      label: 'Управление правами',
      matrix: { admin: true, manager: false },
    },
    {
      id: 'admin.imports',
      label: 'Импорты',
      matrix: { admin: true, manager: false },
    },
  ],
};

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

  async createUser(dto: CreateUserDto) {
    const email = dto.email.trim().toLowerCase();
    const fullName = dto.fullName.trim();

    const existing = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException('Пользователь с таким email уже существует.');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    return this.prisma.user.create({
      data: {
        email,
        fullName,
        passwordHash,
        role: dto.role ?? 'manager',
        isActive: dto.isActive ?? true,
      },
      select: USER_SELECT,
    });
  }

  async updateUser(id: string, dto: UpdateUserDto) {
    const existing = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) {
      throw new NotFoundException('Пользователь не найден.');
    }

    const data: Prisma.UserUpdateInput = {};

    if (dto.fullName !== undefined) data.fullName = dto.fullName.trim();
    if (dto.role !== undefined) data.role = dto.role;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    if (dto.password !== undefined) {
      data.passwordHash = await bcrypt.hash(dto.password, 10);
    }

    if (Object.keys(data).length === 0) {
      throw new BadRequestException('Нет изменений для сохранения.');
    }

    return this.prisma.user.update({
      where: { id },
      data,
      select: USER_SELECT,
    });
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

    if (dto.label !== undefined) capability.label = dto.label.trim();
    if (dto.admin !== undefined) capability.matrix.admin = dto.admin;
    if (dto.manager !== undefined) capability.matrix.manager = dto.manager;

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

    const payload = existing.payload as PermissionsMatrixState | null;
    if (!payload || !Array.isArray(payload.roles) || !Array.isArray(payload.capabilities)) {
      return fallback;
    }

    return cloneJson(payload);
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
    return this.prisma.user.findUnique({ where: { email } });
  }

  findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }
}
