import type { UserRole } from '@prisma/client';

export interface PermissionCapability {
  id: string;
  label: string;
  matrix: Record<UserRole, boolean>;
}

export interface PermissionsMatrixState {
  roles: UserRole[];
  capabilities: PermissionCapability[];
}

export const PERMISSIONS_MATRIX_KEY = 'admin.permissions_matrix.v1';

export const ADMIN_ONLY_CAPABILITY_IDS = new Set<string>([
  'admin.users',
  'admin.permissions',
  'admin.settings',
  'admin.imports',
  'admin.integrations',
]);

export const MANAGER_REQUIRED_CAPABILITY_IDS = new Set<string>([
  'catalogs.write',
]);

export function isAdminOnlyCapability(capabilityId: string): boolean {
  return ADMIN_ONLY_CAPABILITY_IDS.has(capabilityId);
}

export function isManagerRequiredCapability(capabilityId: string): boolean {
  return MANAGER_REQUIRED_CAPABILITY_IDS.has(capabilityId);
}

export const DEFAULT_PERMISSIONS_MATRIX: PermissionsMatrixState = {
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
      matrix: { admin: true, manager: true },
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
      id: 'admin.settings',
      label: 'Глобальные настройки',
      matrix: { admin: true, manager: false },
    },
    {
      id: 'admin.imports',
      label: 'Импорты',
      matrix: { admin: true, manager: false },
    },
    {
      id: 'admin.integrations',
      label: 'Журнал интеграций',
      matrix: { admin: true, manager: false },
    },
  ],
};

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function isUserRole(value: unknown): value is UserRole {
  return value === 'admin' || value === 'manager';
}

function normalizeCapability(input: unknown): PermissionCapability | null {
  if (!input || typeof input !== 'object') return null;

  const source = input as {
    id?: unknown;
    label?: unknown;
    matrix?: unknown;
  };

  if (typeof source.id !== 'string' || source.id.trim().length === 0) return null;

  const id = source.id.trim();
  const fallback: PermissionCapability = {
    id,
    label: id,
    matrix: {
      admin: false,
      manager: false,
    },
  };

  if (typeof source.label === 'string' && source.label.trim().length > 0) {
    fallback.label = source.label.trim();
  }

  if (source.matrix && typeof source.matrix === 'object') {
    const matrix = source.matrix as Record<string, unknown>;
    if (typeof matrix.admin === 'boolean') fallback.matrix.admin = matrix.admin;
    if (typeof matrix.manager === 'boolean') fallback.matrix.manager = matrix.manager;
  }

  if (isAdminOnlyCapability(fallback.id)) {
    fallback.matrix.manager = false;
  }

  if (isManagerRequiredCapability(fallback.id)) {
    fallback.matrix.manager = true;
  }

  return fallback;
}

export function normalizePermissionsMatrix(payload: unknown): PermissionsMatrixState {
  const fallback = cloneJson(DEFAULT_PERMISSIONS_MATRIX);

  if (!payload || typeof payload !== 'object') {
    return fallback;
  }

  const source = payload as {
    roles?: unknown;
    capabilities?: unknown;
  };

  const sourceRoles = Array.isArray(source.roles)
    ? source.roles.filter(isUserRole)
    : [];

  const roles = sourceRoles.length > 0
    ? (Array.from(new Set([...fallback.roles, ...sourceRoles])) as UserRole[])
    : fallback.roles;

  const byId = new Map<string, PermissionCapability>();
  for (const item of fallback.capabilities) {
    byId.set(item.id, cloneJson(item));
  }

  if (Array.isArray(source.capabilities)) {
    for (const raw of source.capabilities) {
      const normalized = normalizeCapability(raw);
      if (!normalized) continue;

      const existing = byId.get(normalized.id);
      if (!existing) {
        byId.set(normalized.id, normalized);
        continue;
      }

      existing.label = normalized.label || existing.label;
      existing.matrix.admin = normalized.matrix.admin;
      existing.matrix.manager = normalized.matrix.manager;
      byId.set(existing.id, existing);
    }
  }

  const capabilities = Array.from(byId.values()).map((capability) => {
    if (isAdminOnlyCapability(capability.id)) {
      capability.matrix.manager = false;
    }
    if (isManagerRequiredCapability(capability.id)) {
      capability.matrix.manager = true;
    }
    return capability;
  });

  return {
    roles,
    capabilities,
  };
}
