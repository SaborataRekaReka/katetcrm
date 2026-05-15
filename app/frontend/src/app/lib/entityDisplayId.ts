const ENTITY_PREFIX: Record<string, string> = {
  lead: 'LEAD',
  application: 'APP',
  application_item: 'APP',
  reservation: 'RSV',
  departure: 'DEP',
  completion: 'CMP',
  client: 'CL',
};

const DISPLAY_ID_RE = /^(LEAD|APP|RSV|DEP|CMP|CL)-[A-Z0-9-]+$/i;

function normalizeEntityId(entityId?: string | null): string | null {
  const value = entityId?.trim();
  return value ? value : null;
}

export function getEntityDisplayId(entityType: string, entityId?: string | null): string | null {
  const normalizedId = normalizeEntityId(entityId);
  if (!normalizedId) return null;

  if (DISPLAY_ID_RE.test(normalizedId)) {
    return normalizedId.toUpperCase();
  }

  const prefix = ENTITY_PREFIX[entityType] ?? entityType.slice(0, 4).toUpperCase();
  return `${prefix}-${normalizedId.slice(0, 8).toUpperCase()}`;
}

export function formatEntityDisplayId(
  entityType: string,
  entityId?: string | null,
  fallback = '-',
): string {
  return getEntityDisplayId(entityType, entityId) ?? fallback;
}

export function formatApplicationDisplayId(
  applicationNumber?: string | null,
  applicationId?: string | null,
  fallback = '-',
): string {
  const number = applicationNumber?.trim();
  if (number) return number;
  return formatEntityDisplayId('application', applicationId, fallback);
}
