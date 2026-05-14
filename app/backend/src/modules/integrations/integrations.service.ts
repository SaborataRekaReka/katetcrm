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
  call?: NormalizedCallContext;
}

type CallDirection = 'inbound' | 'outbound' | 'unknown';

interface NormalizedCallContext {
  callId?: string;
  direction: CallDirection;
  from?: string;
  to?: string;
  status?: string;
  durationSec?: number;
  startedAt?: string;
  endedAt?: string;
  recordingUrl?: string;
}

interface LeadUpsertResult {
  leadId: string;
  operation: 'created' | 'updated';
  duplicatesFound: number;
}

interface IngestAuthHeaders {
  signature?: string;
  timestamp?: string;
  mangoConnector?: MangoConnectorAuth;
}

interface MangoConnectorAuth {
  apiKey?: string;
  sign?: string;
  rawJson?: string;
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

const SENSITIVE_KEY_PARTS = [
  'password',
  'token',
  'secret',
  'authorization',
  'signature',
  'sign',
  'key',
];

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

  async ingestMangoConnectorEvent(
    payload: Record<string, unknown>,
    auth: IngestAuthHeaders = {},
    connectorEventType?: string,
  ): Promise<IntegrationIngestResult> {
    try {
      const connector = this.unwrapMangoConnectorPayload(payload, connectorEventType);
      const externalId = this.extractMangoExternalId(connector.payload);
      return await this.ingest(
        {
          channel: 'mango',
          externalId,
          payload: connector.payload,
        },
        {
          ...auth,
          mangoConnector: connector.auth,
        },
      );
    } catch (error) {
      await this.recordFailedMangoConnectorAttempt(payload, error, connectorEventType);
      throw error;
    }
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
      const normalizedPayload = this.normalizeLeadPayload(
        event.channel,
        event.payload,
        event.externalId,
      );
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

      await this.logMangoCallActivity(
        event,
        leadResult.leadId,
        normalizedPayload.call,
      );

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

    if (dto.channel === 'mango' && auth.mangoConnector) {
      this.assertMangoConnectorAuth(auth.mangoConnector, secret);
      return;
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
      'from_number',
      'fromNumber',
      'to',
      'to_number',
      'toNumber',
      'caller_number',
      'callee_number',
      'abonent_number',
      'line_number',
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
            'call_id',
            'sessionId',
            'session_id',
            'eventId',
            'event_id',
            'entryId',
            'entry_id',
            'timestamp',
            'eventTime',
            'event_time',
            'create_time',
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

  private unwrapMangoConnectorPayload(
    payload: Record<string, unknown>,
    connectorEventType?: string,
  ): {
    payload: Record<string, unknown>;
    auth?: MangoConnectorAuth;
  } {
    const rawJson = this.pickString([payload], ['json']);
    if (!rawJson) {
      return { payload: this.withMangoConnectorMeta(payload, payload, connectorEventType) };
    }

    const parsed = this.parseMangoConnectorJson(rawJson);
    const apiKey = this.pickString([payload], ['vpbx_api_key', 'api_key', 'apiKey']);
    const sign = this.pickString([payload], ['sign', 'signature']);

    return {
      payload: this.withMangoConnectorMeta(parsed, payload, connectorEventType),
      auth: {
        apiKey,
        sign,
        rawJson,
      },
    };
  }

  private withMangoConnectorMeta(
    parsedPayload: Record<string, unknown>,
    formPayload: Record<string, unknown>,
    connectorEventType?: string,
  ): Record<string, unknown> {
    const eventType = connectorEventType?.trim();
    if (!eventType) return parsedPayload;

    return {
      ...parsedPayload,
      _connector: {
        eventType: this.limitText(eventType, 50),
        formFields: Object.keys(formPayload).sort(),
      },
    };
  }

  private parseMangoConnectorJson(rawJson: string): Record<string, unknown> {
    try {
      const parsed = JSON.parse(rawJson) as unknown;
      const record = this.asRecord(parsed);
      if (!record) {
        throw new BadRequestException('Mango connector json must be an object');
      }
      return record;
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException('Invalid Mango connector json');
    }
  }

  private buildMangoConnectorDiagnosticPayload(
    payload: Record<string, unknown>,
    connectorEventType?: string,
  ): Record<string, unknown> {
    const rawJson = this.pickString([payload], ['json']);
    const eventType = connectorEventType?.trim();
    const connectorMeta = {
      ...(eventType ? { eventType: this.limitText(eventType, 50) } : {}),
      formFields: Object.keys(payload).sort(),
      hasApiKey: Boolean(this.pickString([payload], ['vpbx_api_key', 'api_key', 'apiKey'])),
      hasSign: Boolean(this.pickString([payload], ['sign', 'signature'])),
      hasJson: Boolean(rawJson),
      jsonParse: rawJson ? 'ok' : 'missing',
    };

    if (!rawJson) {
      return {
        _connector: connectorMeta,
        raw: payload,
      };
    }

    try {
      return {
        ...this.parseMangoConnectorJson(rawJson),
        _connector: connectorMeta,
      };
    } catch {
      return {
        _connector: {
          ...connectorMeta,
          jsonParse: 'failed',
        },
        raw: payload,
      };
    }
  }

  private async recordFailedMangoConnectorAttempt(
    payload: Record<string, unknown>,
    error: unknown,
    connectorEventType?: string,
  ): Promise<void> {
    const failure = this.classifyFailure(error);
    const diagnosticPayload = this.buildMangoConnectorDiagnosticPayload(payload, connectorEventType);
    const externalId = this.extractMangoExternalId(diagnosticPayload);
    const idempotencyKey = this.computeIdempotencyKey('mango', externalId, diagnosticPayload);
    const payloadSafe = this.redactPayload(diagnosticPayload);
    const payloadSummary = this.buildPayloadSummary(payloadSafe);
    const failedData = {
      payload: payloadSafe as Prisma.InputJsonValue,
      payloadSummary: payloadSummary as Prisma.InputJsonValue,
      status: 'failed' as const,
      errorCode: failure.errorCode,
      errorClass: failure.errorClass,
      errorMessage: failure.errorMessage,
      processedAt: null,
    };

    try {
      await this.prisma.integrationEvent.create({
        data: {
          channel: 'mango',
          externalId: externalId ?? null,
          correlationId: externalId ?? null,
          idempotencyKey,
          ...failedData,
        },
      });
      return;
    } catch (createError) {
      if (!this.isIntegrationEventUniqueViolation(createError)) {
        throw createError;
      }
    }

    const existing = await this.prisma.integrationEvent.findFirst({
      where: {
        OR: [
          { idempotencyKey },
          ...(externalId ? [{ channel: 'mango' as const, externalId }] : []),
        ],
      },
      select: { id: true },
    });

    if (!existing) return;

    await this.prisma.integrationEvent.update({
      where: { id: existing.id },
      data: failedData,
    });
  }

  private assertMangoConnectorAuth(auth: MangoConnectorAuth, secret: string) {
    const apiKey = auth.apiKey?.trim();
    const sign = auth.sign?.trim();
    const rawJson = auth.rawJson?.trim();
    if (!apiKey || !sign || !rawJson) {
      throw new ForbiddenException('Missing Mango connector auth fields');
    }

    const expectedApiKey = (this.config.get<string>('INTEGRATION_MANGO_API_KEY') ?? '').trim();
    if (expectedApiKey && apiKey !== expectedApiKey) {
      throw new ForbiddenException('Invalid Mango connector API key');
    }

    const expectedHex = createHash('sha256')
      .update(`${apiKey}${rawJson}${secret}`)
      .digest('hex');
    const provided = this.parseSignatureHeader(sign);

    if (!this.safeHexEquals(expectedHex, provided)) {
      throw new ForbiddenException('Invalid Mango connector signature');
    }
  }

  private extractMangoExternalId(payload: Record<string, unknown>): string | undefined {
    const root = this.asRecord(payload);
    const call = this.asRecord(root?.call);
    const scopes = [root, call];
    const externalId = this.pickString(scopes, [
      'entryId',
      'entry_id',
      'eventId',
      'event_id',
      'recordId',
      'record_id',
      'uuid',
      'requestId',
      'request_id',
      'callId',
      'call_id',
      'sessionId',
      'session_id',
      'sipCallId',
      'sip_call_id',
    ]);
    return externalId ? this.limitText(externalId, 255) : undefined;
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

  private normalizeLeadPayload(
    channel: IntegrationChannel,
    payload: Prisma.JsonValue,
    externalId: string | null,
  ): NormalizedLeadPayload {
    const root = this.asRecord(payload);
    const lead = this.asRecord(root?.lead);
    const contact = this.asRecord(root?.contact);
    const sender = this.asRecord(root?.sender);
    const call = this.asRecord(root?.call);
    const scopes = [root, lead, contact, sender, call];
    const callScopes = [call, root, lead, contact, sender];

    const callContext =
      channel === 'mango'
        ? this.normalizeCallContext(callScopes, externalId)
        : undefined;

    const nameRaw =
      this.pickString(scopes, [
        'contactName',
        'name',
        'fullName',
        'senderName',
        'callerName',
        'fromDisplayName',
        'calleeName',
        'toDisplayName',
      ]) ??
      'Интеграционный контакт';
    const contactName = this.limitText(nameRaw, 200);

    const callCounterpartyPhone = callContext
      ? this.pickCallCounterpartyPhone(callContext)
      : undefined;

    const phoneRaw =
      callCounterpartyPhone
      ?? this.pickString(scopes, ['contactPhone', 'phone', 'phoneNumber', 'senderPhone'])
      ?? this.pickString(scopes, [
        'from',
        'from_number',
        'fromNumber',
        'to',
        'to_number',
        'toNumber',
        'caller_number',
        'callee_number',
        'abonent_number',
        'line_number',
      ])
      ?? '';
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
    const callComment = callContext ? this.buildCallComment(callContext) : undefined;
    const comment = this.mergeComments(commentRaw, callComment);

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
      call: callContext,
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
    const call = this.asRecord(root?.call);
    const scopes = [root, lead, contact, call];
    const callScopes = [call, root, lead, contact];

    const phone = this.pickString(scopes, ['contactPhone', 'phone', 'phoneNumber']);
    const company = this.pickString(scopes, ['contactCompany', 'company']);
    const recordingUrl = this.pickUrl(callScopes, [
      'recordingUrl',
      'recording_url',
      'recordUrl',
      'record_url',
      'recording',
      'record',
      'recordingLink',
      'recordLink',
      'talkRecordUrl',
    ]);
    const duration = this.normalizeDurationSeconds(
      this.pickNumber(callScopes, [
        'durationSec',
        'duration',
        'durationSeconds',
        'talkDuration',
        'talkTime',
        'billsec',
      ]),
    );

    return {
      contactName: this.pickString(scopes, ['contactName', 'name', 'fullName']) ?? null,
      contactPhone: phone ? normalizePhone(phone) : null,
      contactCompany: company ? normalizeCompany(company) : null,
      requestedDate:
        this.pickDate(scopes, ['requestedDate', 'requestedAt', 'date', 'timestamp'])?.toISOString() ??
        null,
      hasComment: Boolean(this.pickString(scopes, ['comment', 'message', 'text', 'note'])),
      isUrgent: this.pickBoolean(scopes, ['isUrgent', 'urgent']) ?? false,
      callDirection:
        this.normalizeCallDirection(
          this.pickString(callScopes, ['direction', 'callDirection', 'call_direction']),
        ) ?? null,
      callDurationSec: duration ?? null,
      hasRecording: Boolean(recordingUrl),
    };
  }

  private async logMangoCallActivity(
    event: IntegrationEvent,
    leadId: string,
    call: NormalizedCallContext | undefined,
  ): Promise<void> {
    if (event.channel !== 'mango' || !call) return;

    const summary = this.buildCallActivitySummary(call);
    const payload: Prisma.InputJsonValue = {
      integration: {
        provider: 'mango',
        eventId: event.id,
        channel: event.channel,
        externalId: event.externalId,
        correlationId: event.correlationId,
      },
      telephony: {
        callId: call.callId ?? null,
        direction: call.direction,
        from: call.from ?? null,
        to: call.to ?? null,
        status: call.status ?? null,
        durationSec: call.durationSec ?? null,
        startedAt: call.startedAt ?? null,
        endedAt: call.endedAt ?? null,
        recordingUrl: call.recordingUrl ?? null,
      },
    };

    await this.activity.log({
      action: 'note_added',
      entityType: 'lead',
      entityId: leadId,
      summary,
      actorId: null,
      payload,
    });

    const activeApplications = await this.prisma.application.findMany({
      where: {
        leadId,
        isActive: true,
      },
      select: {
        id: true,
      },
    });

    for (const app of activeApplications) {
      await this.activity.log({
        action: 'note_added',
        entityType: 'application',
        entityId: app.id,
        summary,
        actorId: null,
        payload,
      });
    }
  }

  private normalizeCallContext(
    scopes: Array<Record<string, unknown> | undefined>,
    externalId: string | null,
  ): NormalizedCallContext | undefined {
    const callId = this.pickString(scopes, [
      'callId',
      'call_id',
      'sessionId',
      'session_id',
      'eventId',
      'event_id',
      'entryId',
      'entry_id',
      'recordId',
      'record_id',
      'sipCallId',
      'sip_call_id',
    ]) ?? externalId ?? undefined;

    const direction =
      this.normalizeCallDirection(
        this.pickString(scopes, [
          'direction',
          'callDirection',
          'call_direction',
          'callDirectionType',
          'type',
        ]),
      )
      ?? this.normalizeCallDirectionFromFlags(scopes)
      ?? 'unknown';

    const from = this.pickString(scopes, [
      'from',
      'from_number',
      'fromNumber',
      'caller',
      'callerPhone',
      'callerNumber',
      'caller_number',
      'ani',
      'sourceNumber',
      'source_number',
      'abonent_number',
    ]);
    const to = this.pickString(scopes, [
      'to',
      'to_number',
      'toNumber',
      'callee',
      'calleePhone',
      'calleeNumber',
      'callee_number',
      'dnis',
      'destinationNumber',
      'destination_number',
      'line_number',
    ]);
    const status = this.pickString(scopes, [
      'status',
      'result',
      'disposition',
      'hangupReason',
      'hangup_reason',
      'call_state',
      'callState',
    ]);
    const durationSec = this.normalizeDurationSeconds(
      this.pickNumber(scopes, [
        'durationSec',
        'duration',
        'durationSeconds',
        'talkDuration',
        'talkTime',
        'billsec',
        'talk_time',
        'call_duration',
      ]),
    );
    const startedAt = this.pickDate(scopes, [
      'startedAt',
      'started_at',
      'startTime',
      'start_time',
      'timestamp',
      'eventTime',
      'event_time',
      'create_time',
      'call_start_time',
    ])?.toISOString();
    const endedAt = this.pickDate(scopes, [
      'endedAt',
      'ended_at',
      'endTime',
      'end_time',
      'finish_time',
      'call_end_time',
    ])?.toISOString();
    const recordingUrl = this.pickUrl(scopes, [
      'recordingUrl',
      'recording_url',
      'recordUrl',
      'record_url',
      'recording',
      'record',
      'recordingLink',
      'recordLink',
      'talkRecordUrl',
    ]);

    const hasCallContext =
      Boolean(callId) ||
      Boolean(from) ||
      Boolean(to) ||
      Boolean(status) ||
      typeof durationSec === 'number' ||
      Boolean(recordingUrl);

    if (!hasCallContext) return undefined;

    return {
      callId,
      direction,
      from,
      to,
      status,
      durationSec,
      startedAt,
      endedAt,
      recordingUrl,
    };
  }

  private normalizeCallDirection(raw: string | undefined): CallDirection | undefined {
    if (!raw) return undefined;
    const value = raw.trim().toLowerCase();

    if (['in', 'incoming', 'inbound', 'entry', 'входящий', 'вход'].includes(value)) {
      return 'inbound';
    }
    if (['out', 'outgoing', 'outbound', 'исходящий', 'исход'].includes(value)) {
      return 'outbound';
    }

    return undefined;
  }

  private normalizeCallDirectionFromFlags(
    scopes: Array<Record<string, unknown> | undefined>,
  ): CallDirection | undefined {
    const isIncoming = this.pickBoolean(scopes, ['isIncoming', 'incoming']);
    if (isIncoming === true) return 'inbound';
    if (isIncoming === false) return 'outbound';
    return undefined;
  }

  private normalizeDurationSeconds(raw: number | undefined): number | undefined {
    if (raw === undefined || !Number.isFinite(raw)) return undefined;
    if (raw <= 0) return undefined;

    // Some providers send milliseconds in duration-like fields.
    const seconds = raw > 86_400 ? Math.round(raw / 1000) : Math.round(raw);
    return seconds > 0 ? seconds : undefined;
  }

  private pickCallCounterpartyPhone(call: NormalizedCallContext): string | undefined {
    if (call.direction === 'outbound') {
      return call.to ?? call.from;
    }
    if (call.direction === 'inbound') {
      return call.from ?? call.to;
    }
    return call.from ?? call.to;
  }

  private mergeComments(
    primary: string | undefined,
    secondary: string | undefined,
  ): string | undefined {
    const first = primary?.trim();
    const second = secondary?.trim();
    if (!first && !second) return undefined;
    if (!first) return this.limitText(second!, 1500);
    if (!second) return this.limitText(first, 1500);
    if (first.includes(second)) return this.limitText(first, 1500);
    return this.limitText(`${first}\n${second}`, 1500);
  }

  private describeCallDirection(direction: CallDirection): string {
    if (direction === 'inbound') return 'Входящий';
    if (direction === 'outbound') return 'Исходящий';
    return 'Телефонный';
  }

  private formatCallDuration(seconds: number | undefined): string | undefined {
    if (!seconds || seconds <= 0) return undefined;
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) {
      return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  private buildCallComment(call: NormalizedCallContext): string {
    const parts: string[] = [`${this.describeCallDirection(call.direction)} звонок`];
    const counterparty = this.pickCallCounterpartyPhone(call);
    if (counterparty) {
      parts.push(`контакт: ${counterparty}`);
    }
    const duration = this.formatCallDuration(call.durationSec);
    if (duration) {
      parts.push(`длительность: ${duration}`);
    }
    if (call.recordingUrl) {
      parts.push(`запись: ${call.recordingUrl}`);
    }
    return parts.join(' · ');
  }

  private buildCallActivitySummary(call: NormalizedCallContext): string {
    const parts: string[] = [`${this.describeCallDirection(call.direction)} звонок Mango`];
    const counterparty = this.pickCallCounterpartyPhone(call);
    if (counterparty) {
      parts.push(counterparty);
    }
    const duration = this.formatCallDuration(call.durationSec);
    if (duration) {
      parts.push(`длительность ${duration}`);
    }
    if (call.recordingUrl) {
      parts.push('есть запись');
    }
    return parts.join(' · ');
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

  private isIntegrationEventUniqueViolation(error: unknown): boolean {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError)) return false;
    if (error.code !== 'P2002') return false;

    const target = (error.meta as Record<string, unknown> | undefined)?.target;
    const targetStr = Array.isArray(target) ? target.join(',') : String(target ?? '');
    return (
      targetStr.includes('idempotency_key') ||
      targetStr.includes('idempotencyKey') ||
      targetStr.includes('external_id') ||
      targetStr.includes('externalId')
    );
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

  private pickNumber(
    scopes: Array<Record<string, unknown> | undefined>,
    keys: string[],
  ): number | undefined {
    for (const scope of scopes) {
      if (!scope) continue;
      for (const key of keys) {
        const value = scope[key];
        if (typeof value === 'number' && Number.isFinite(value)) {
          return value;
        }
        if (typeof value === 'string' && value.trim()) {
          const normalized = value.trim().replace(',', '.');
          const parsed = Number(normalized);
          if (Number.isFinite(parsed)) {
            return parsed;
          }
        }
      }
    }
    return undefined;
  }

  private pickUrl(
    scopes: Array<Record<string, unknown> | undefined>,
    keys: string[],
  ): string | undefined {
    const raw = this.pickString(scopes, keys);
    if (!raw) return undefined;
    try {
      const parsed = new URL(raw);
      if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
        return raw;
      }
      return undefined;
    } catch {
      return undefined;
    }
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
