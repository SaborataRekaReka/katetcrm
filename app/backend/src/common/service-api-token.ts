import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

export const SERVICE_API_TOKEN_MARKER = 'katet_crm_';

export const SERVICE_API_SCOPES = [
  'leads:read',
  'leads:create',
  'leads:update',
  'integration-events:read',
] as const;

export type ServiceApiScope = (typeof SERVICE_API_SCOPES)[number];

const SERVICE_API_SCOPE_SET = new Set<string>(SERVICE_API_SCOPES);
const TOKEN_PART_PATTERN = /^[A-Za-z0-9_-]+$/;

export interface GeneratedServiceApiToken {
  token: string;
  tokenPrefix: string;
  tokenHash: string;
}

export function isServiceApiScope(value: string): value is ServiceApiScope {
  return SERVICE_API_SCOPE_SET.has(value);
}

export function normalizeServiceApiScopes(values: readonly string[]): ServiceApiScope[] {
  const normalized = Array.from(
    new Set(values.map((value) => value.trim()).filter((value) => value.length > 0)),
  );
  const invalid = normalized.filter((value) => !isServiceApiScope(value));
  if (invalid.length > 0) {
    throw new Error(`Unsupported service API scope(s): ${invalid.join(', ')}`);
  }
  return normalized as ServiceApiScope[];
}

export function hashServiceApiToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

export function generateServiceApiToken(): GeneratedServiceApiToken {
  const tokenPrefix = randomBytes(12).toString('base64url');
  const secret = randomBytes(32).toString('base64url');
  const token = `${SERVICE_API_TOKEN_MARKER}${tokenPrefix}.${secret}`;
  return {
    token,
    tokenPrefix,
    tokenHash: hashServiceApiToken(token),
  };
}

export function parseServiceApiToken(token: string): { tokenPrefix: string } | null {
  if (!token.startsWith(SERVICE_API_TOKEN_MARKER)) return null;
  const body = token.slice(SERVICE_API_TOKEN_MARKER.length);
  const separatorIndex = body.indexOf('.');
  if (separatorIndex < 8 || separatorIndex !== body.lastIndexOf('.')) return null;

  const tokenPrefix = body.slice(0, separatorIndex);
  const secret = body.slice(separatorIndex + 1);
  if (secret.length < 32) return null;
  if (!TOKEN_PART_PATTERN.test(tokenPrefix) || !TOKEN_PART_PATTERN.test(secret)) return null;

  return { tokenPrefix };
}

export function serviceApiTokenHashMatches(token: string, expectedHash: string): boolean {
  const actual = Buffer.from(hashServiceApiToken(token), 'hex');
  const expected = Buffer.from(expectedHash, 'hex');
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}
