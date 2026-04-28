import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Prisma,
  type IntegrationChannel,
  type IntegrationEvent,
  type IntegrationEventStatus,
  type SourceChannel,
} from '@prisma/client';
import { createHash, createHmac, timingSafeEqual } from 'crypto';
import { normalizeCompany, normalizePhone } from '../../common/normalize';
import { PrismaService } from '../../prisma/prisma.service';
import { ActivityService } from '../activity/activity.service';
import { type ActorContext, LeadsService } from '../leads/leads.service';
import {
  type IntegrationEventListQueryDto,
  type ReceiveIntegrationEventDto,
} from './integrations.dto';

type ProcessingMode = 'ingest' | 'retry' | 'replay';

type FailureClass = 'validation' | 'business_rule' | 'transient' | 'unknown';

interface FailureInfo {
  errorClass: FailureClass;
  errorCode: string;
  errorMessage: string;
  transient: boolean;
}

interface NormalizedLeadPayload {
  contactName: string;
  contactPhone: string;
  contactCompany?: string;
  equipmentTypeHint?: string;
  requestedDate?: string;
  timeWindow?: string;
  address?: string;
  comment?: string;
  isUrgent: boolean;
}

interface LeadUpsertResult {
  leadId: string;
  operation: 'created' | 'updated';
  duplicatesFound: number;
}

interface IngestAuthHeaders {
  signature?: string;
  timestamp?: string;
}

export interface IntegrationProcessResult {
  event: IntegrationEvent;
  processed: boolean;
  failure?: FailureInfo;
}

export interface IntegrationIngestResult extends IntegrationProcessResult {
  deduplicated: boolean;
}

const MAX_RETRY_ATTEMPTS = 3;

const CHANNEL_TO_SOURCE: Record<IntegrationChannel, SourceChannel> = {
  site: 'site',
  mango: 'mango',
  telegram: 'telegram',
  max: 'max',
};

const TRANSIENT_PRISMA_CODES = new Set(['P1001', 'P1002', 'P1008', 'P1017']);

const SENSITIVE_KEY_PARTS = ['password', 'token', 'secret', 'authorization'];

const CHANNEL_SECRET_ENV_KEY: Record<
  IntegrationChannel,
  | 'INTEGRATION_SITE_SECRET'
  | 'INTEGRATION_MANGO_SECRET'
  | 'INTEGRATION_TELEGRAM_SECRET'
  | 'INTEGRATION_MAX_SECRET'
> = {
  site: 'INTEGRATION_SITE_SECRET',
  mango: 'INTEGRATION_MANGO_SECRET',
  telegram: 'INTEGRATION_TELEGRAM_SECRET',
  max: 'INTEGRATION_MAX_SECRET',
};

const DEFAULT_HMAC_TOLERANCE_SECONDS = 300;

@Injectable()
export class IntegrationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly leads: LeadsService,
    private readonly activity: ActivityService,
    private readonly config: ConfigService,
  ) {}

  async ingest(
    dto: ReceiveIntegrationEventDto,
    auth: IngestAuthHeaders = {},
  ): Promise<IntegrationIngestResult> {
    this.assertIngestAuth(dto, auth);
    this.validateChannelPayload(dto);

    const externalId = dto.externalId?.trim() || undefined;
    const correlationId = dto.correlationId?.trim() || undefined;
    const idempotencyKey = this.computeIdempotencyKey(dto.channel, externalId, dto.payload);

    const existing = await this.prisma.integrationEvent.findUnique({
      where: { idempotencyKey },
    });
    if (existing) {
      return this.handleExistingEvent(existing);
    }

    const created = await this.createEventRecord({
      channel: dto.channel,
      externalId,
      correlationId,
      idempotencyKey,
      payload: dto.payload,
    });

    return {
      deduplicated: false,
      ...(await this.processEvent(created, 'ingest')),
    };
  }

  async list(params: IntegrationEventListQueryDto) {
    const where: Prisma.IntegrationEventWhereInput = {};

    if (params.channel) where.channel = params.channel;
    if (params.status) where.status = params.status;

    if (params.from || params.to) {
      where.receivedAt = {
        ...(params.from ? { gte: new Date(params.from) } : {}),
        ...(params.to ? { lte: new Date(params.to) } : {}),
      };
    }

    const q = params.query?.trim();
    if (q) {
      where.OR = [
        { externalId: { contains: q, mode: 'insensitive' } },
        { idempotencyKey: { contains: q, mode: 'insensitive' } },
        { correlationId: { contains: q, mode: 'insensitive' } },
        { errorMessage: { contains: q, mode: 'insensitive' } },
        { relatedLeadId: { contains: q, mode: 'insensitive' } },
      ];
    }

    const take = Math.min(Math.max(params.take ?? 100, 1), 500);
    const skip = Math.max(params.skip ?? 0, 0);

    const [items, total] = await Promise.all([
      this.prisma.integrationEvent.findMany({
        where,
        orderBy: [{ receivedAt: 'desc' }],
        take,
        skip,
      }),
      this.prisma.integrationEvent.count({ where }),
    ]);

    return { items, total };
  }

  async getById(id: string) {
    const event = await this.prisma.integrationEvent.findUnique({ where: { id } });
    if (!event) throw new NotFoundException('Интеграционное событие не найдено');
    return event;
  }

  async retryFailedEvent(
    id: string,
    actorId: string,
    reason?: string,
  ): Promise<IntegrationProcessResult> {
    const event = await this.requireEventById(id);
    if (event.status !== 'failed') {
      throw new BadRequestException('Retry доступен только для failed событий');
    }
    if (event.retryCount >= MAX_RETRY_ATTEMPTS) {
      throw new BadRequestException(
        `Retry limit reached: ${event.retryCount}/${MAX_RETRY_ATTEMPTS}`,
      );
    }

    await this.activity.log({
      action: 'updated',
      entityType: 'integration_event',
      entityId: event.id,
      summary: `Retry requested for integration event ${event.id}`,
      actorId,
      payload: {
        reason: reason ?? null,
        retryCountBefore: event.retryCount,
      },
    });

    return this.processEvent(event, 'retry', actorId, reason);
  }

  async replayFailedEvent(
    id: string,
    actorId: string,
    reason?: string,
  ): Promise<IntegrationProcessResult> {
    const event = await this.requireEventById(id);
    if (event.status !== 'failed') {
      throw new BadRequestException('Replay доступен только для failed событий');
    }

    await this.activity.log({
      action: 'updated',
      entityType: 'integration_event',
      entityId: event.id,
      summary: `Replay requested for integration event ${event.id}`,
      actorId,
      payload: {
        reason: reason ?? null,
        retryCountBefore: event.retryCount,
      },
    });

    return this.processEvent(event, 'replay', actorId, reason);
  }

  private async handleExistingEvent(existing: IntegrationEvent): Promise<IntegrationIngestResult> {
    if (['processed', 'replayed', 'duplicate'].includes(existing.status)) {
      return {
        deduplicated: true,
        event: existing,
        processed: true,
      };
    }

    if (existing.status === 'failed' && existing.retryCount >= MAX_RETRY_ATTEMPTS) {
      return {
        deduplicated: true,
        event: existing,
        processed: false,
        failure: {
          errorClass: 'transient',
          errorCode: 'RETRY_LIMIT_REACHED',
          errorMessage: `Retry limit reached: ${existing.retryCount}/${MAX_RETRY_ATTEMPTS}`,
          transient: false,
        },
      };
    }

    return {
      deduplicated: true,
      ...(await this.processEvent(existing, 'retry')),
    };
  }

  private async createEventRecord(input: {
    channel: IntegrationChannel;
    externalId?: string;
    correlationId?: string;
    idempotencyKey: string;
    payload: Record<string, unknown>;
  }): Promise<IntegrationEvent> {
    const payloadSafe = this.redactPayload(input.payload);
    const payloadSummary = this.buildPayloadSummary(payloadSafe);

    try {
      return await this.prisma.integrationEvent.create({
        data: {
          channel: input.channel,
          externalId: input.externalId ?? null,
          correlationId: input.correlationId ?? null,
          idempotencyKey: input.idempotencyKey,
          payload: payloadSafe as Prisma.InputJsonValue,
          payloadSummary: payloadSummary as Prisma.InputJsonValue,
          status: 'received',
        },
      });
    } catch (error) {
      if (this.isIdempotencyUniqueViolation(error)) {
        const existing = await this.prisma.integrationEvent.findUnique({
          where: { idempotencyKey: input.idempotencyKey },
        });
        if (existing) return existing;
      }
      throw error;
    }
  }

  private async processEvent(
    event: IntegrationEvent,
    mode: ProcessingMode,
    initiatedByActorId?: string,
    reason?: string,
  ): Promise<IntegrationProcessResult> {
    const actor = await this.resolveSystemActor();

    try {
      const normalizedPayload = this.normalizeLeadPayload(event.payload);
      const leadResult = await this.upsertLeadFromEvent(event, normalizedPayload, actor);
      const status: IntegrationEventStatus = mode === 'replay' ? 'replayed' : 'processed';

      const updated = await this.prisma.integrationEvent.update({
        where: { id: event.id },
        data: {
          status,
          relatedLeadId: leadResult.leadId,
          processedAt: new Date(),
          replayedAt: mode === 'replay' ? new Date() : undefined,
          errorCode: null,
          errorClass: null,
          errorMessage: null,
        },
      });

      if (mode === 'retry' || mode === 'replay') {
        await this.activity.log({
          action: 'updated',
          entityType: 'integration_event',
          entityId: event.id,
          summary:
            mode === 'replay'
              ? `Replay succeeded for integration event ${event.id}`
              : `Retry succeeded for integration event ${event.id}`,
          actorId: initiatedByActorId ?? null,
          payload: {
            reason: reason ?? null,
            leadId: leadResult.leadId,
            operation: leadResult.operation,
            duplicatesFound: leadResult.duplicatesFound,
          },
        });
      }

      return {
        event: updated,
        processed: true,
      };
    } catch (error) {
      const failure = this.classifyFailure(error);
      const failedEvent = await this.prisma.integrationEvent.update({
        where: { id: event.id },
        data: {
          status: 'failed',
          retryCount: { increment: 1 },
          errorCode: failure.errorCode,
          errorClass: failure.errorClass,
          errorMessage: failure.errorMessage,
          processedAt: null,
        },
      });

      if (mode === 'retry' || mode === 'replay') {
        await this.activity.log({
          action: 'updated',
          entityType: 'integration_event',
          entityId: event.id,
          summary:
            mode === 'replay'
              ? `Replay failed for integration event ${event.id}`
              : `Retry failed for integration event ${event.id}`,
          actorId: initiatedByActorId ?? null,
          payload: {
            reason: reason ?? null,
            failure: {
              errorClass: failure.errorClass,
              errorCode: failure.errorCode,
              errorMessage: failure.errorMessage,
              transient: failure.transient,
            },
            retryCountAfter: failedEvent.retryCount,
          },
        });
      }

      return {
        event: failedEvent,
        processed: false,
        failure,
      };
    }
  }

  private async upsertLeadFromEvent(
    event: IntegrationEvent,
    payload: NormalizedLeadPayload,
    actor: ActorContext,
  ): Promise<LeadUpsertResult> {
    const duplicates = await this.leads.findDuplicates(payload.contactPhone, payload.contactCompany);
    if (duplicates.length > 0) {
      const target = duplicates[0];
      const comment = this.mergeIntegrationComment(
        target.comment ?? undefined,
        payload.comment,
        event.channel,
        event.externalId,
      );

      const updated = await this.leads.update(
        target.id,
        {
          contactName: payload.contactName,
          contactCompany: payload.contactCompany,
          contactPhone: payload.contactPhone,
          equipmentTypeHint: payload.equipmentTypeHint,
          requestedDate: payload.requestedDate,
          timeWindow: payload.timeWindow,
          address: payload.address,
          comment,
          isUrgent: payload.isUrgent,
        },
        actor,
      );

      return {
        leadId: updated.id,
        operation: 'updated',
        duplicatesFound: duplicates.length,
      };
    }

    const comment = this.mergeIntegrationComment(
      undefined,
      payload.comment,
      event.channel,
      event.externalId,
    );

    const { lead } = await this.leads.create(
      {
        source: CHANNEL_TO_SOURCE[event.channel],
        sourceLabel: `integration:${event.channel}`,
        contactName: payload.contactName,
        contactCompany: payload.contactCompany,
        contactPhone: payload.contactPhone,
        equipmentTypeHint: payload.equipmentTypeHint,
        requestedDate: payload.requestedDate,
        timeWindow: payload.timeWindow,
        address: payload.address,
        comment,
        isUrgent: payload.isUrgent,
      },
      actor,
    );

    return {
      leadId: lead.id,
      operation: 'created',
      duplicatesFound: 0,
    };
  }

  private async requireEventById(id: string): Promise<IntegrationEvent> {
    const event = await this.prisma.integrationEvent.findUnique({ where: { id } });
    if (!event) throw new NotFoundException('Интеграционное событие не найдено');
    return event;
  }

  private async resolveSystemActor(): Promise<ActorContext> {
    const admin = await this.prisma.user.findFirst({
      where: { role: 'admin', isActive: true },
      orderBy: { createdAt: 'asc' },
      select: { id: true, role: true },
    });
    if (admin) return { id: admin.id, role: admin.role };

    const manager = await this.prisma.user.findFirst({
      where: { role: 'manager', isActive: true },
      orderBy: { createdAt: 'asc' },
      select: { id: true, role: true },
    });
    if (manager) return { id: manager.id, role: manager.role };

    throw new BadRequestException('Нет активного пользователя для integration processing');
  }

  private assertIngestAuth(dto: ReceiveIntegrationEventDto, auth: IngestAuthHeaders) {
    const requireSignatures =
      this.config.get<boolean>('INTEGRATION_REQUIRE_SIGNATURES') ?? false;
    const secret = this.readChannelSecret(dto.channel);
    if (!secret) {
      const nodeEnv = (this.config.get<string>('NODE_ENV') ?? 'development').toLowerCase();
      if (!requireSignatures && nodeEnv !== 'production') {
        // Local/dev environments may run without shared webhook secrets.
        return;
      }
      throw new ServiceUnavailableException(
        `Integration channel ${dto.channel} is not configured`,
      );
    }

    const signatureRaw = auth.signature?.trim();
    const timestampRaw = auth.timestamp?.trim();
    if (!signatureRaw || !timestampRaw) {
      throw new ForbiddenException('Missing integration auth headers');
    }

    const timestampMs = this.parseTimestampHeader(timestampRaw);
    const toleranceSec =
      this.config.get<number>('INTEGRATION_HMAC_TOLERANCE_SEC') ??
      DEFAULT_HMAC_TOLERANCE_SECONDS;
    if (Math.abs(Date.now() - timestampMs) > toleranceSec * 1000) {
      throw new ForbiddenException('Integration signature expired');
    }

    const canonicalPayload = this.stableSerialize(dto.payload);
    const signedMessage = `${timestampRaw}.${dto.channel}.${canonicalPayload}`;
    const expectedHex = createHmac('sha256', secret).update(signedMessage).digest('hex');
    const provided = this.parseSignatureHeader(signatureRaw);

    if (!this.safeHexEquals(expectedHex, provided)) {
      throw new ForbiddenException('Invalid integration signature');
    }
  }

  private validateChannelPayload(dto: ReceiveIntegrationEventDto) {
    const root = this.asRecord(dto.payload);
    if (!root) {
      throw new BadRequestException('payload must be an object');
    }

    const lead = this.asRecord(root.lead);
    const contact = this.asRecord(root.contact);
    const sender = this.asRecord(root.sender);
    const call = this.asRecord(root.call);
    const scopes = [root, lead, contact, sender, call];

    const phone = this.pickString(scopes, [
      'contactPhone',
      'phone',
      'phoneNumber',
      'senderPhone',
      'from',
    ]);
    if (!phone) {
      throw new BadRequestException(
        `payload does not match ${dto.channel} schema: missing contact phone`,
      );
    }

    if (dto.channel === 'site') {
      const hasContactContext = Boolean(
        this.pickString(scopes, [
          'contactName',
          'name',
          'fullName',
          'company',
          'contactCompany',
        ]),
      );
      if (!hasContactContext) {
        throw new BadRequestException(
          'payload does not match site schema: missing contact context',
        );
      }
      return;
    }

    if (dto.channel === 'mango') {
      const hasCallContext = Boolean(
        dto.externalId?.trim() ||
          this.pickString(scopes, [
            'callId',
            'sessionId',
            'eventId',
            'timestamp',
            'eventTime',
          ]),
      );
      if (!hasCallContext) {
        throw new BadRequestException(
          'payload does not match mango schema: missing call/event identity',
        );
      }
      return;
    }

    if (dto.channel === 'telegram') {
      const hasSenderContext = Boolean(
        dto.externalId?.trim() ||
          this.pickString(scopes, ['senderId', 'chatId', 'username', 'telegramUserId']),
      );
      if (!hasSenderContext) {
        throw new BadRequestException(
          'payload does not match telegram schema: missing sender/chat identity',
        );
      }
      return;
    }

    if (dto.channel === 'max') {
      const hasRequestContext = Boolean(
        dto.externalId?.trim() ||
          this.pickString(scopes, [
            'requestId',
            'ticketId',
            'messageId',
            'conversationId',
            'eventTime',
          ]),
      );
      if (!hasRequestContext) {
        throw new BadRequestException(
          'payload does not match max schema: missing request identity',
        );
      }
    }
  }

  private readChannelSecret(channel: IntegrationChannel): string {
    const envKey = CHANNEL_SECRET_ENV_KEY[channel];
    return (this.config.get<string>(envKey) ?? '').trim();
  }

  private parseTimestampHeader(raw: string): number {
    if (!/^\d{10,13}$/.test(raw)) {
      throw new ForbiddenException('Invalid integration timestamp');
    }
    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) {
      throw new ForbiddenException('Invalid integration timestamp');
    }
    return raw.length <= 10 ? parsed * 1000 : parsed;
  }

  private parseSignatureHeader(raw: string): Buffer {
    const normalized = raw.startsWith('sha256=') ? raw.slice(7) : raw;
    if (!/^[a-fA-F0-9]{64}$/.test(normalized)) {
      throw new ForbiddenException('Invalid integration signature format');
    }
    return Buffer.from(normalized, 'hex');
  }

  private safeHexEquals(expectedHex: string, provided: Buffer): boolean {
    const expected = Buffer.from(expectedHex, 'hex');
    if (expected.length !== provided.length) return false;
    return timingSafeEqual(expected, provided);
  }

  private normalizeLeadPayload(payload: Prisma.JsonValue): NormalizedLeadPayload {
    const root = this.asRecord(payload);
    const lead = this.asRecord(root?.lead);
    const contact = this.asRecord(root?.contact);
    const sender = this.asRecord(root?.sender);
    const scopes = [root, lead, contact, sender];

    const nameRaw =
      this.pickString(scopes, ['contactName', 'name', 'fullName', 'senderName']) ??
      'Интеграционный контакт';
    const contactName = this.limitText(nameRaw, 200);

    const phoneRaw =
      this.pickString(scopes, ['contactPhone', 'phone', 'phoneNumber', 'senderPhone', 'from']) ??
      '';
    const phoneNormalized = normalizePhone(phoneRaw);
    if (!phoneNormalized) {
      throw new BadRequestException('payload.contactPhone is required');
    }
    const contactPhone = this.limitText(phoneRaw || phoneNormalized, 64);

    const companyRaw = this.pickString(scopes, ['contactCompany', 'company']);
    const contactCompany = companyRaw ? this.limitText(companyRaw, 200) : undefined;

    const equipmentTypeHintRaw = this.pickString(scopes, [
      'equipmentTypeHint',
      'equipmentType',
      'machineType',
    ]);
    const equipmentTypeHint = equipmentTypeHintRaw
      ? this.limitText(equipmentTypeHintRaw, 200)
      : undefined;

    const timeWindowRaw = this.pickString(scopes, ['timeWindow']);
    const timeWindow = timeWindowRaw ? this.limitText(timeWindowRaw, 50) : undefined;

    const addressRaw = this.pickString(scopes, ['address', 'location']);
    const address = addressRaw ? this.limitText(addressRaw, 500) : undefined;

    const commentRaw = this.pickString(scopes, ['comment', 'message', 'text', 'note']);
    const comment = commentRaw ? this.limitText(commentRaw, 1500) : undefined;

    const requestedAt = this.pickDate(scopes, [
      'requestedDate',
      'requestedAt',
      'date',
      'timestamp',
      'eventTime',
    ]);

    return {
      contactName,
      contactPhone,
      contactCompany,
      equipmentTypeHint,
      requestedDate: requestedAt?.toISOString(),
      timeWindow,
      address,
      comment,
      isUrgent: this.pickBoolean(scopes, ['isUrgent', 'urgent']) ?? false,
    };
  }

  private computeIdempotencyKey(
    channel: IntegrationChannel,
    externalId: string | undefined,
    payload: Record<string, unknown>,
  ): string {
    if (externalId) return `${channel}:${externalId}`;

    const root = this.asRecord(payload);
    const sender = this.pickString([root], ['senderId', 'sender', 'phone', 'contactPhone']) ?? 'na';
    const timestamp =
      this.pickString([root], ['timestamp', 'eventTime', 'sentAt', 'messageTimestamp']) ??
      'na';
    const hashSource = this.stableSerialize(this.redactPayload(payload));
    const hash = createHash('sha256').update(hashSource).digest('hex').slice(0, 20);

    return `${channel}:${sender}:${timestamp}:${hash}`;
  }

  private buildPayloadSummary(payload: unknown) {
    const root = this.asRecord(payload);
    const lead = this.asRecord(root?.lead);
    const contact = this.asRecord(root?.contact);
    const scopes = [root, lead, contact];

    const phone = this.pickString(scopes, ['contactPhone', 'phone', 'phoneNumber']);
    const company = this.pickString(scopes, ['contactCompany', 'company']);

    return {
      contactName: this.pickString(scopes, ['contactName', 'name', 'fullName']) ?? null,
      contactPhone: phone ? normalizePhone(phone) : null,
      contactCompany: company ? normalizeCompany(company) : null,
      requestedDate:
        this.pickDate(scopes, ['requestedDate', 'requestedAt', 'date', 'timestamp'])?.toISOString() ??
        null,
      hasComment: Boolean(this.pickString(scopes, ['comment', 'message', 'text', 'note'])),
      isUrgent: this.pickBoolean(scopes, ['isUrgent', 'urgent']) ?? false,
    };
  }

  private mergeIntegrationComment(
    existingComment: string | undefined,
    incomingComment: string | undefined,
    channel: IntegrationChannel,
    externalId: string | null,
  ): string | undefined {
    const sourceStamp = externalId
      ? `[integration:${channel}#${externalId}]`
      : `[integration:${channel}]`;
    const entry = incomingComment?.trim()
      ? `${sourceStamp} ${incomingComment.trim()}`
      : sourceStamp;

    if (!existingComment?.trim()) return this.limitText(entry, 2000);
    if (existingComment.includes(entry)) return existingComment;

    return this.limitText(`${existingComment}\n${entry}`, 2000);
  }

  private redactPayload(value: unknown): unknown {
    if (Array.isArray(value)) {
      return value.map((item) => this.redactPayload(item));
    }

    const record = this.asRecord(value);
    if (!record) return value;

    const sanitized: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(record)) {
      const keyLower = key.toLowerCase();
      const masked = SENSITIVE_KEY_PARTS.some((part) => keyLower.includes(part));
      sanitized[key] = masked ? '***' : this.redactPayload(item);
    }
    return sanitized;
  }

  private classifyFailure(error: unknown): FailureInfo {
    if (error instanceof BadRequestException) {
      return {
        errorClass: 'validation',
        errorCode: 'VALIDATION_ERROR',
        errorMessage: this.extractHttpErrorMessage(error),
        transient: false,
      };
    }

    if (error instanceof ForbiddenException || error instanceof NotFoundException) {
      return {
        errorClass: 'business_rule',
        errorCode: 'BUSINESS_RULE_ERROR',
        errorMessage: this.extractHttpErrorMessage(error),
        transient: false,
      };
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      const transient = TRANSIENT_PRISMA_CODES.has(error.code);
      return {
        errorClass: transient ? 'transient' : 'business_rule',
        errorCode: error.code,
        errorMessage: error.message,
        transient,
      };
    }

    if (error instanceof Error) {
      return {
        errorClass: 'unknown',
        errorCode: 'INTERNAL_ERROR',
        errorMessage: error.message,
        transient: true,
      };
    }

    return {
      errorClass: 'unknown',
      errorCode: 'INTERNAL_ERROR',
      errorMessage: 'Unknown integration processing error',
      transient: true,
    };
  }

  private extractHttpErrorMessage(error: BadRequestException | ForbiddenException | NotFoundException) {
    const response = error.getResponse();
    if (typeof response === 'string') return response;

    const message = this.asRecord(response)?.message;
    if (typeof message === 'string') return message;
    if (Array.isArray(message)) return message.filter(Boolean).join('; ');

    return error.message;
  }

  private isIdempotencyUniqueViolation(error: unknown): boolean {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError)) return false;
    if (error.code !== 'P2002') return false;

    const target = (error.meta as Record<string, unknown> | undefined)?.target;
    const targetStr = Array.isArray(target) ? target.join(',') : String(target ?? '');
    return targetStr.includes('idempotency_key') || targetStr.includes('idempotencyKey');
  }

  private pickString(
    scopes: Array<Record<string, unknown> | undefined>,
    keys: string[],
  ): string | undefined {
    for (const scope of scopes) {
      if (!scope) continue;
      for (const key of keys) {
        const value = scope[key];
        if (typeof value === 'string' && value.trim()) {
          return value.trim();
        }
      }
    }
    return undefined;
  }

  private pickBoolean(
    scopes: Array<Record<string, unknown> | undefined>,
    keys: string[],
  ): boolean | undefined {
    for (const scope of scopes) {
      if (!scope) continue;
      for (const key of keys) {
        const value = scope[key];
        if (typeof value === 'boolean') return value;
        if (typeof value === 'string') {
          if (value.toLowerCase() === 'true') return true;
          if (value.toLowerCase() === 'false') return false;
        }
      }
    }
    return undefined;
  }

  private pickDate(
    scopes: Array<Record<string, unknown> | undefined>,
    keys: string[],
  ): Date | undefined {
    for (const scope of scopes) {
      if (!scope) continue;
      for (const key of keys) {
        const value = scope[key];
        const date = this.parseDateValue(value);
        if (date) return date;
      }
    }
    return undefined;
  }

  private parseDateValue(value: unknown): Date | undefined {
    if (typeof value === 'string') {
      const ts = Date.parse(value);
      if (!Number.isNaN(ts)) return new Date(ts);
      return undefined;
    }

    if (typeof value === 'number' && Number.isFinite(value)) {
      const ms = value < 1_000_000_000_000 ? value * 1000 : value;
      const date = new Date(ms);
      if (!Number.isNaN(date.getTime())) return date;
    }

    return undefined;
  }

  private asRecord(value: unknown): Record<string, unknown> | undefined {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
    return value as Record<string, unknown>;
  }

  private stableSerialize(value: unknown): string {
    if (Array.isArray(value)) {
      return `[${value.map((item) => this.stableSerialize(item)).join(',')}]`;
    }

    const record = this.asRecord(value);
    if (!record) return JSON.stringify(value);

    const entries = Object.entries(record).sort(([a], [b]) => a.localeCompare(b));
    return `{${entries
      .map(([key, item]) => `${JSON.stringify(key)}:${this.stableSerialize(item)}`)
      .join(',')}}`;
  }

  private limitText(value: string, maxLength: number): string {
    return value.trim().slice(0, maxLength);
  }
}
