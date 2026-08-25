import { randomBytes } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import {
  SERVICE_API_SCOPES,
  generateServiceApiToken,
  normalizeServiceApiScopes,
} from '../common/service-api-token';

const prisma = new PrismaClient();

interface ParsedArgs {
  command: string | undefined;
  flags: Map<string, string | true>;
}

function parseArgs(argv: string[]): ParsedArgs {
  const [command, ...rest] = argv;
  const flags = new Map<string, string | true>();

  for (let index = 0; index < rest.length; index += 1) {
    const item = rest[index];
    if (!item.startsWith('--')) throw new Error(`Unexpected argument: ${item}`);
    const equalsIndex = item.indexOf('=');
    if (equalsIndex > 2) {
      flags.set(item.slice(2, equalsIndex), item.slice(equalsIndex + 1));
      continue;
    }
    const key = item.slice(2);
    const next = rest[index + 1];
    if (!next || next.startsWith('--')) {
      flags.set(key, true);
      continue;
    }
    flags.set(key, next);
    index += 1;
  }

  return { command, flags };
}

function stringFlag(flags: Map<string, string | true>, name: string): string | undefined {
  const value = flags.get(name);
  return typeof value === 'string' ? value.trim() : undefined;
}

function requireStringFlag(flags: Map<string, string | true>, name: string): string {
  const value = stringFlag(flags, name);
  if (!value) throw new Error(`--${name} is required`);
  return value;
}

function parseExpiry(flags: Map<string, string | true>): Date | null {
  const raw = stringFlag(flags, 'expires-days') ?? '365';
  const days = Number.parseInt(raw, 10);
  if (!Number.isInteger(days) || days < 1 || days > 3650) {
    throw new Error('--expires-days must be an integer from 1 to 3650');
  }
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

async function ensureServiceActor(flags: Map<string, string | true>) {
  const email = (stringFlag(flags, 'actor-email') ?? 'service.crm-api@katet.local').toLowerCase();
  const fullName = stringFlag(flags, 'actor-name') ?? 'Сервисный API CRM';
  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    if (!existing.isActive || existing.role !== 'admin') {
      throw new Error(`Service actor ${email} must be an active admin`);
    }
    return existing;
  }

  const unreportedPassword = randomBytes(48).toString('base64url');
  return prisma.user.create({
    data: {
      email,
      fullName,
      role: 'admin',
      isActive: true,
      passwordHash: await bcrypt.hash(unreportedPassword, 12),
    },
  });
}

async function createToken(flags: Map<string, string | true>) {
  const name = requireStringFlag(flags, 'name');
  const scopeValue = stringFlag(flags, 'scopes') ?? SERVICE_API_SCOPES.join(',');
  const scopes = normalizeServiceApiScopes(scopeValue.split(/[,\s]+/));
  if (scopes.length === 0) throw new Error('At least one service API scope is required');

  const expiresAt = parseExpiry(flags);
  const actor = await ensureServiceActor(flags);
  const existing = await prisma.serviceApiToken.findFirst({
    where: {
      name,
      revokedAt: null,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    select: { id: true },
  });

  if (existing && !flags.has('rotate')) {
    throw new Error(`An active token named "${name}" already exists; pass --rotate to replace it`);
  }
  if (existing) {
    await prisma.serviceApiToken.updateMany({
      where: { name, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  const generated = generateServiceApiToken();
  const created = await prisma.serviceApiToken.create({
    data: {
      name,
      tokenPrefix: generated.tokenPrefix,
      tokenHash: generated.tokenHash,
      scopes,
      actorUserId: actor.id,
      expiresAt,
    },
  });

  await prisma.activityLogEntry.create({
    data: {
      action: 'created',
      entityType: 'service_api_token',
      entityId: created.id,
      summary: `Создан сервисный API-токен ${created.name}`,
      payload: {
        tokenPrefix: created.tokenPrefix,
        scopes: created.scopes,
        expiresAt: created.expiresAt?.toISOString() ?? null,
      },
    },
  });

  process.stdout.write(
    `${JSON.stringify({
      id: created.id,
      name: created.name,
      token: generated.token,
      tokenPrefix: created.tokenPrefix,
      scopes: created.scopes,
      expiresAt: created.expiresAt?.toISOString() ?? null,
      actorEmail: actor.email,
    })}\n`,
  );
}

async function listTokens() {
  const items = await prisma.serviceApiToken.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      tokenPrefix: true,
      scopes: true,
      expiresAt: true,
      revokedAt: true,
      createdAt: true,
      actorUser: { select: { email: true, isActive: true } },
    },
  });
  process.stdout.write(`${JSON.stringify({ items })}\n`);
}

async function revokeToken(flags: Map<string, string | true>) {
  const id = stringFlag(flags, 'id');
  const tokenPrefix = stringFlag(flags, 'prefix');
  if (!id && !tokenPrefix) throw new Error('--id or --prefix is required');

  const existing = await prisma.serviceApiToken.findFirst({
    where: id ? { id } : { tokenPrefix },
  });
  if (!existing) throw new Error('Service API token not found');

  const revokedAt = existing.revokedAt ?? new Date();
  await prisma.serviceApiToken.update({
    where: { id: existing.id },
    data: { revokedAt },
  });
  await prisma.activityLogEntry.create({
    data: {
      action: 'updated',
      entityType: 'service_api_token',
      entityId: existing.id,
      summary: `Отозван сервисный API-токен ${existing.name}`,
      payload: { tokenPrefix: existing.tokenPrefix, revokedAt: revokedAt.toISOString() },
    },
  });

  process.stdout.write(`${JSON.stringify({ id: existing.id, revokedAt: revokedAt.toISOString() })}\n`);
}

async function main() {
  const { command, flags } = parseArgs(process.argv.slice(2));
  if (command === 'create') return createToken(flags);
  if (command === 'list') return listTokens();
  if (command === 'revoke') return revokeToken(flags);
  throw new Error('Usage: service-api-token <create|list|revoke> [options]');
}

main()
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`Service API token command failed: ${message}\n`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
