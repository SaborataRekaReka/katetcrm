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
  type UpdateMangoCallRoutingSettingsDto,
  type UpdateSiteLeadRoutingSettingsDto,
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

export interface MangoCallRoutingRule {
  extension: string;
  userId: string;
  isActive: boolean;
}

export interface MangoCallRoutingSettings {
  enabled: boolean;
  updateResponsibleOnAnswered: boolean;
  updateResponsibleOnTransfer: boolean;
  assignMissedCalls: boolean;
  fallbackManagerId: string | null;
  rules: MangoCallRoutingRule[];
}

export interface SiteLeadRoutingSettings {
  enabled: boolean;
  preserveExistingManager: boolean;
  fallbackManagerId: string | null;
  managerIds: string[];
  lastAssignedManagerId: string | null;
}

interface IntegrationManagerAssignment {
  managerId: string;
  channel: 'mango' | 'site';
  extension?: string;
  reason: 'extension_match' | 'fallback' | 'round_robin';
}

type MangoManagerAssignment = IntegrationManagerAssignment & {
  channel: 'mango';
  reason: 'extension_match' | 'fallback' | 'round_robin';
};

type SiteLeadManagerAssignment = IntegrationManagerAssignment & {
  channel: 'site';
  reason: 'round_robin' | 'fallback';
};

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
  managerAssignment?: IntegrationManagerAssignment;
}

interface MangoPhoneOptionalProcessing {
  shouldHandle: boolean;
  call?: NormalizedCallContext;
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

interface MangoRecordingProxyResult {
  buffer: Buffer;
  contentType: string;
}

interface MangoRecordingFetchAttempt {
  source: 'legacy' | 'signed_link' | 'post_download';
  status: number;
}

const MAX_RETRY_ATTEMPTS = 3;

const CHANNEL_TO_SOURCE: Record<IntegrationChannel, SourceChannel> = {
  site: 'site',
  mango: 'mango',
  telegram: 'telegram',
  max: 'max',
};

const MANGO_CALL_ROUTING_SETTINGS_KEY = 'integrations.mango.call_routing.v1';
const SITE_LEAD_ROUTING_SETTINGS_KEY = 'integrations.site.lead_routing.v1';
const DEFAULT_MANGO_RECORDING_URL_TEMPLATE =
  'https://lk.mango-office.ru/issa/api/{apiKey}/{accountId}/call-recording/play-record/{recordingId}';
const MANGO_SIGNED_RECORDING_LINK_BASE =
  'https://app.mango-office.ru/vpbx/queries/recording/link';
const MANGO_RECORDING_POST_URL = 'https://app.mango-office.ru/vpbx/queries/recording/post';
const MANGO_SIGNED_RECORDING_LINK_ACTION = 'play';
const MANGO_RECORDING_POST_ACTION = 'download';
const MANGO_SIGNED_RECORDING_LINK_TTL_SECONDS = 300;

const DEFAULT_MANGO_CALL_ROUTING_SETTINGS: MangoCallRoutingSettings = {
  enabled: true,
  updateResponsibleOnAnswered: true,
  updateResponsibleOnTransfer: true,
  assignMissedCalls: false,
  fallbackManagerId: null,
  rules: [],
};

const DEFAULT_SITE_LEAD_ROUTING_SETTINGS: SiteLeadRoutingSettings = {
  enabled: true,
  preserveExistingManager: true,
  fallbackManagerId: null,
  managerIds: [],
  lastAssignedManagerId: null,
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
const MANGO_RECORDING_PROXY_PATH_RE =
  /^\/issa\/api\/[^/]+\/\d{4,20}\/call-recording\/play-record\/[^/]+$/;

@Injectable()
export class IntegrationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly leads: LeadsService,
    private readonly activity: ActivityService,
    private readonly config: ConfigService,
  ) {}

  async getMangoCallRoutingSettings(): Promise<MangoCallRoutingSettings> {
    return this.readMangoCallRoutingSettings();
  }

  async updateMangoCallRoutingSettings(
    dto: UpdateMangoCallRoutingSettingsDto,
    actorId?: string,
  ): Promise<MangoCallRoutingSettings> {
    const previous = await this.readMangoCallRoutingSettings();
    const next: MangoCallRoutingSettings = {
      ...previous,
      enabled: dto.enabled ?? previous.enabled,
      updateResponsibleOnAnswered:
        dto.updateResponsibleOnAnswered ?? previous.updateResponsibleOnAnswered,
      updateResponsibleOnTransfer:
        dto.updateResponsibleOnTransfer ?? previous.updateResponsibleOnTransfer,
      assignMissedCalls: dto.assignMissedCalls ?? previous.assignMissedCalls,
      fallbackManagerId:
        dto.fallbackManagerId === undefined
          ? previous.fallbackManagerId
          : dto.fallbackManagerId?.trim() || null,
      rules: dto.rules
        ? this.normalizeMangoCallRoutingRules(dto.rules)
        : previous.rules,
    };

    await this.assertMangoCallRoutingUsersExist(next);

    await this.prisma.systemConfig.upsert({
      where: { key: MANGO_CALL_ROUTING_SETTINGS_KEY },
      create: {
        key: MANGO_CALL_ROUTING_SETTINGS_KEY,
        payload: next as unknown as Prisma.InputJsonValue,
      },
      update: {
        payload: next as unknown as Prisma.InputJsonValue,
      },
    });

    await this.activity.log({
      action: 'updated',
      entityType: 'integration_settings',
      entityId: MANGO_CALL_ROUTING_SETTINGS_KEY,
      actorId: actorId ?? null,
      summary: 'Обновлены правила распределения звонков Mango',
      payload: {
        before: previous,
        after: next,
      } as unknown as Prisma.InputJsonValue,
    });

    return next;
  }

  async getSiteLeadRoutingSettings(): Promise<SiteLeadRoutingSettings> {
    return this.readSiteLeadRoutingSettings();
  }

  async updateSiteLeadRoutingSettings(
    dto: UpdateSiteLeadRoutingSettingsDto,
    actorId?: string,
  ): Promise<SiteLeadRoutingSettings> {
    const previous = await this.readSiteLeadRoutingSettings();
    const managerIds = dto.managerIds
      ? this.normalizeSiteLeadRoutingManagerIds(dto.managerIds)
      : previous.managerIds;
    const next: SiteLeadRoutingSettings = {
      ...previous,
      enabled: dto.enabled ?? previous.enabled,
      preserveExistingManager:
        dto.preserveExistingManager ?? previous.preserveExistingManager,
      fallbackManagerId:
        dto.fallbackManagerId === undefined
          ? previous.fallbackManagerId
          : dto.fallbackManagerId?.trim() || null,
      managerIds,
      lastAssignedManagerId: previous.lastAssignedManagerId && managerIds.includes(previous.lastAssignedManagerId)
        ? previous.lastAssignedManagerId
        : null,
    };

    await this.assertSiteLeadRoutingUsersExist(next);

    await this.prisma.systemConfig.upsert({
      where: { key: SITE_LEAD_ROUTING_SETTINGS_KEY },
      create: {
        key: SITE_LEAD_ROUTING_SETTINGS_KEY,
        payload: next as unknown as Prisma.InputJsonValue,
      },
      update: {
        payload: next as unknown as Prisma.InputJsonValue,
      },
    });

    await this.activity.log({
      action: 'updated',
      entityType: 'integration_settings',
      entityId: SITE_LEAD_ROUTING_SETTINGS_KEY,
      actorId: actorId ?? null,
      summary: 'Обновлены правила распределения заявок с сайта',
      payload: {
        before: previous,
        after: next,
      } as unknown as Prisma.InputJsonValue,
    });

    return next;
  }

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
      const externalIdentity = this.extractMangoExternalIdentity(connector.payload);
      return await this.ingest(
        {
          channel: 'mango',
          externalId: externalIdentity.externalId,
          correlationId: externalIdentity.correlationId,
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

  async replayEvent(
    id: string,
    actorId: string,
    reason?: string,
  ): Promise<IntegrationProcessResult> {
    const event = await this.requireEventById(id);
    const replayableStatuses: IntegrationEventStatus[] = ['failed', 'replayed'];
    if (!replayableStatuses.includes(event.status)) {
      throw new BadRequestException('Replay доступен только для failed/replayed событий');
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

  async proxyMangoRecording(rawUrl: string): Promise<MangoRecordingProxyResult> {
    const url = this.parseMangoRecordingProxyUrl(rawUrl);

    let response: globalThis.Response | undefined;
    const attempts: MangoRecordingFetchAttempt[] = [];
    const recordingId = this.extractMangoRecordingIdFromLegacyUrl(url);

    if (recordingId) {
      const postResponse = await this.fetchMangoRecordingViaPostDownload(recordingId);
      attempts.push({ source: 'post_download', status: postResponse.status });
      response = postResponse;
    }

    if (!response?.ok && response?.status !== 429) {
      const signedFallbackUrl = this.buildMangoSignedRecordingLinkFromLegacyUrl(url);
      if (signedFallbackUrl) {
        const fallbackResponse = await this.fetchMangoRecordingResponse(signedFallbackUrl);
        attempts.push({ source: 'signed_link', status: fallbackResponse.status });
        if (fallbackResponse.ok) {
          response = fallbackResponse;
        }
      }
    }

    if (!response?.ok && response?.status !== 429) {
      const legacyResponse = await this.fetchMangoRecordingResponse(url.toString());
      attempts.push({ source: 'legacy', status: legacyResponse.status });
      if (legacyResponse.ok || !response) {
        response = legacyResponse;
      }
    }

    if (!response) {
      throw new ServiceUnavailableException('Mango recording request could not be started');
    }

    if (response.status === 403) {
      throw new ForbiddenException(this.buildMangoRecordingFailureMessage(
        'Mango recording access denied',
        attempts,
      ));
    }
    if (response.status === 404) {
      throw new NotFoundException(this.buildMangoRecordingFailureMessage(
        'Mango recording not found',
        attempts,
      ));
    }
    if (!response.ok) {
      throw new ServiceUnavailableException(
        this.buildMangoRecordingFailureMessage(
          `Mango recording request failed with status ${response.status}`,
          attempts,
        ),
      );
    }

    const contentType = response.headers.get('content-type')?.trim() ?? 'application/octet-stream';
    if (!this.isMangoRecordingContentTypeAllowed(contentType)) {
      throw new ServiceUnavailableException('Mango recording returned unsupported content type');
    }

    const payload = await response.arrayBuffer();
    if (payload.byteLength === 0) {
      throw new ServiceUnavailableException('Mango recording returned empty body');
    }

    return {
      buffer: Buffer.from(payload),
      contentType,
    };
  }

  private async fetchMangoRecordingResponse(url: string): Promise<globalThis.Response> {
    try {
      return await fetch(url, {
        method: 'GET',
        redirect: 'follow',
        headers: {
          Accept: 'audio/*,application/octet-stream;q=0.9,*/*;q=0.1',
        },
      });
    } catch {
      throw new ServiceUnavailableException('Mango recording service is unreachable');
    }
  }

  private async fetchMangoRecordingViaPostDownload(
    recordingId: string,
  ): Promise<globalThis.Response> {
    const apiKey = (this.config.get<string>('INTEGRATION_MANGO_API_KEY') ?? '').trim();
    const apiSalt = (this.config.get<string>('INTEGRATION_MANGO_SECRET') ?? '').trim();
    if (!apiKey || !apiSalt) {
      return new Response(null, { status: 503 });
    }

    const json = JSON.stringify({
      recording_id: recordingId,
      action: MANGO_RECORDING_POST_ACTION,
    });
    const form = new URLSearchParams({
      vpbx_api_key: apiKey,
      sign: createHash('sha256').update(`${apiKey}${json}${apiSalt}`).digest('hex'),
      json,
    });

    let tempLinkResponse: globalThis.Response;
    try {
      tempLinkResponse = await fetch(MANGO_RECORDING_POST_URL, {
        method: 'POST',
        redirect: 'manual',
        headers: {
          Accept: '*/*',
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: form,
      });
    } catch {
      throw new ServiceUnavailableException('Mango recording service is unreachable');
    }

    const tempLink = tempLinkResponse.headers.get('location')?.trim();
    if (!tempLink || ![301, 302, 303, 307, 308].includes(tempLinkResponse.status)) {
      return tempLinkResponse;
    }

    const downloadUrl = this.parseMangoRecordingTempLink(tempLink, MANGO_RECORDING_POST_URL);
    return this.fetchMangoRecordingResponse(downloadUrl.toString());
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
      const mangoPhoneOptional = this.detectMangoPhoneOptionalProcessing(event);
      if (mangoPhoneOptional.shouldHandle) {
        return await this.processMangoPhoneOptionalEvent(
          event,
          mode,
          mangoPhoneOptional.call,
          initiatedByActorId,
          reason,
        );
      }

      const normalizedPayload = this.normalizeLeadPayload(
        event.channel,
        event.payload,
        event.externalId,
      );
      const mangoManagerAssignment = await this.resolveMangoManagerAssignment(
        event.channel,
        event.payload,
        normalizedPayload.call,
      );
      const leadResult = await this.upsertLeadFromEvent(
        event,
        normalizedPayload,
        actor,
        mangoManagerAssignment,
      );
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
        mangoManagerAssignment,
      );

      await this.applyMangoManagerAssignmentToActiveApplications(
        event,
        leadResult.leadId,
        mangoManagerAssignment,
      );

      await this.applySiteManagerAssignmentToActiveApplications(
        event,
        leadResult.leadId,
        leadResult.managerAssignment,
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
            managerAssignment: leadResult.managerAssignment
              ? {
                  channel: leadResult.managerAssignment.channel,
                  managerId: leadResult.managerAssignment.managerId,
                  reason: leadResult.managerAssignment.reason,
                  extension: leadResult.managerAssignment.extension ?? null,
                }
              : null,
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

  private detectMangoPhoneOptionalProcessing(
    event: IntegrationEvent,
  ): MangoPhoneOptionalProcessing {
    if (event.channel !== 'mango') {
      return { shouldHandle: false };
    }

    const root = this.asRecord(event.payload);
    const lead = this.asRecord(root?.lead);
    const contact = this.asRecord(root?.contact);
    const sender = this.asRecord(root?.sender);
    const call = this.asRecord(root?.call);
    const scopes = [root, lead, contact, sender, call];
    const callScopes = [call, root, lead, contact, sender];

    const callContext = this.normalizeCallContext(callScopes, event.externalId);
    const hasPhone = this.hasMangoContactPhone(scopes, callContext);
    if (hasPhone) {
      return { shouldHandle: false };
    }

    const isRecording = this.isMangoRecordingPayload(root, call, callContext);
    if (!isRecording) {
      return { shouldHandle: false };
    }

    return {
      shouldHandle: true,
      call: callContext,
    };
  }

  private async processMangoPhoneOptionalEvent(
    event: IntegrationEvent,
    mode: ProcessingMode,
    call: NormalizedCallContext | undefined,
    initiatedByActorId?: string,
    reason?: string,
  ): Promise<IntegrationProcessResult> {
    const leadId = await this.resolveLeadIdForMangoCallContext(event, call);
    const status: IntegrationEventStatus = mode === 'replay' ? 'replayed' : 'processed';

    const updated = await this.prisma.integrationEvent.update({
      where: { id: event.id },
      data: {
        status,
        relatedLeadId: leadId ?? null,
        processedAt: new Date(),
        replayedAt: mode === 'replay' ? new Date() : undefined,
        errorCode: null,
        errorClass: null,
        errorMessage: null,
      },
    });

    if (leadId && call) {
      await this.logMangoCallActivity(event, leadId, call);
    }

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
          leadId: leadId ?? null,
          operation: leadId ? 'updated' : 'skipped',
          duplicatesFound: 0,
          managerAssignment: null,
        },
      });
    }

    return {
      event: updated,
      processed: true,
    };
  }

  private async upsertLeadFromEvent(
    event: IntegrationEvent,
    payload: NormalizedLeadPayload,
    actor: ActorContext,
    managerAssignment?: MangoManagerAssignment,
  ): Promise<LeadUpsertResult> {
    const duplicates = await this.leads.findDuplicates(payload.contactPhone, payload.contactCompany);
    if (duplicates.length > 0) {
      const target = duplicates[0];
      const effectiveManagerAssignment = managerAssignment
        ?? await this.resolveSiteLeadManagerAssignment(event.channel, target.managerId);
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
          managerId: effectiveManagerAssignment?.managerId,
        },
        actor,
      );

      return {
        leadId: updated.id,
        operation: 'updated',
        duplicatesFound: duplicates.length,
        managerAssignment: effectiveManagerAssignment,
      };
    }

    const effectiveManagerAssignment = managerAssignment
      ?? await this.resolveSiteLeadManagerAssignment(event.channel);

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
        managerId: effectiveManagerAssignment?.managerId ?? null,
      },
      actor,
    );

    return {
      leadId: lead.id,
      operation: 'created',
      duplicatesFound: 0,
      managerAssignment: effectiveManagerAssignment,
    };
  }

  private async requireEventById(id: string): Promise<IntegrationEvent> {
    const event = await this.prisma.integrationEvent.findUnique({ where: { id } });
    if (!event) throw new NotFoundException('Интеграционное событие не найдено');
    return event;
  }

  private async readMangoCallRoutingSettings(): Promise<MangoCallRoutingSettings> {
    const existing = await this.prisma.systemConfig.findUnique({
      where: { key: MANGO_CALL_ROUTING_SETTINGS_KEY },
      select: { payload: true },
    });

    if (!existing) {
      return this.cloneMangoCallRoutingSettings(DEFAULT_MANGO_CALL_ROUTING_SETTINGS);
    }

    return this.normalizeMangoCallRoutingSettings(existing.payload);
  }

  private async readSiteLeadRoutingSettings(): Promise<SiteLeadRoutingSettings> {
    const existing = await this.prisma.systemConfig.findUnique({
      where: { key: SITE_LEAD_ROUTING_SETTINGS_KEY },
      select: { payload: true },
    });

    if (!existing) {
      return this.cloneSiteLeadRoutingSettings(DEFAULT_SITE_LEAD_ROUTING_SETTINGS);
    }

    return this.normalizeSiteLeadRoutingSettings(existing.payload);
  }

  private normalizeMangoCallRoutingSettings(payload: unknown): MangoCallRoutingSettings {
    const root = this.asRecord(payload);
    if (!root) {
      return this.cloneMangoCallRoutingSettings(DEFAULT_MANGO_CALL_ROUTING_SETTINGS);
    }

    const fallback = DEFAULT_MANGO_CALL_ROUTING_SETTINGS;
    return {
      enabled: typeof root.enabled === 'boolean' ? root.enabled : fallback.enabled,
      updateResponsibleOnAnswered:
        typeof root.updateResponsibleOnAnswered === 'boolean'
          ? root.updateResponsibleOnAnswered
          : fallback.updateResponsibleOnAnswered,
      updateResponsibleOnTransfer:
        typeof root.updateResponsibleOnTransfer === 'boolean'
          ? root.updateResponsibleOnTransfer
          : fallback.updateResponsibleOnTransfer,
      assignMissedCalls:
        typeof root.assignMissedCalls === 'boolean'
          ? root.assignMissedCalls
          : fallback.assignMissedCalls,
      fallbackManagerId:
        typeof root.fallbackManagerId === 'string' && root.fallbackManagerId.trim()
          ? root.fallbackManagerId.trim()
          : null,
      rules: this.normalizeMangoCallRoutingRules(
        Array.isArray(root.rules) ? root.rules : fallback.rules,
      ),
    };
  }

  private normalizeSiteLeadRoutingSettings(payload: unknown): SiteLeadRoutingSettings {
    const root = this.asRecord(payload);
    if (!root) {
      return this.cloneSiteLeadRoutingSettings(DEFAULT_SITE_LEAD_ROUTING_SETTINGS);
    }

    const fallback = DEFAULT_SITE_LEAD_ROUTING_SETTINGS;
    return {
      enabled: typeof root.enabled === 'boolean' ? root.enabled : fallback.enabled,
      preserveExistingManager:
        typeof root.preserveExistingManager === 'boolean'
          ? root.preserveExistingManager
          : fallback.preserveExistingManager,
      fallbackManagerId:
        typeof root.fallbackManagerId === 'string' && root.fallbackManagerId.trim()
          ? root.fallbackManagerId.trim()
          : null,
      managerIds: this.normalizeSiteLeadRoutingManagerIds(
        Array.isArray(root.managerIds) ? root.managerIds : fallback.managerIds,
      ),
      lastAssignedManagerId:
        typeof root.lastAssignedManagerId === 'string' && root.lastAssignedManagerId.trim()
          ? root.lastAssignedManagerId.trim()
          : null,
    };
  }

  private normalizeMangoCallRoutingRules(
    rules: Array<{ extension?: unknown; userId?: unknown; isActive?: unknown }>,
  ): MangoCallRoutingRule[] {
    const normalized: MangoCallRoutingRule[] = [];
    const seen = new Set<string>();

    for (const rule of rules) {
      const extension = this.normalizeMangoExtension(rule.extension);
      const userId = typeof rule.userId === 'string' ? rule.userId.trim() : '';
      if (!extension || !userId) {
        throw new BadRequestException('Укажите внутренний номер Mango и менеджера CRM.');
      }
      if (seen.has(extension)) {
        throw new BadRequestException(`Внутренний номер Mango ${extension} указан несколько раз.`);
      }
      seen.add(extension);
      normalized.push({
        extension,
        userId,
        isActive: typeof rule.isActive === 'boolean' ? rule.isActive : true,
      });
    }

    return normalized;
  }

  private normalizeSiteLeadRoutingManagerIds(managerIds: unknown[]): string[] {
    const normalized: string[] = [];
    const seen = new Set<string>();

    for (const value of managerIds) {
      const managerId = typeof value === 'string' ? value.trim() : '';
      if (!managerId) {
        throw new BadRequestException('Укажите менеджера CRM в каждой строке распределения сайта.');
      }
      if (seen.has(managerId)) {
        throw new BadRequestException('Менеджер CRM указан в очереди сайта несколько раз.');
      }
      seen.add(managerId);
      normalized.push(managerId);
    }

    return normalized;
  }

  private normalizeMangoExtension(value: unknown): string | undefined {
    if (value === null || value === undefined) return undefined;
    const raw = String(value).trim();
    if (!raw) return undefined;
    const parenthesized = /\(([\d#*]{1,6})\)/.exec(raw);
    if (parenthesized) return parenthesized[1];

    const compact = raw.replace(/[^\d#*]/g, '');
    if (/^[\d#*]{1,6}$/.test(compact)) return compact;

    const firstShortNumber = /(?:^|\D)([\d#*]{1,6})(?:\D|$)/.exec(raw);
    return firstShortNumber?.[1];
  }

  private cloneMangoCallRoutingSettings(
    value: MangoCallRoutingSettings,
  ): MangoCallRoutingSettings {
    return JSON.parse(JSON.stringify(value)) as MangoCallRoutingSettings;
  }

  private cloneSiteLeadRoutingSettings(
    value: SiteLeadRoutingSettings,
  ): SiteLeadRoutingSettings {
    return JSON.parse(JSON.stringify(value)) as SiteLeadRoutingSettings;
  }

  private async assertMangoCallRoutingUsersExist(settings: MangoCallRoutingSettings) {
    const userIds = Array.from(new Set([
      ...settings.rules.map((rule) => rule.userId),
      ...(settings.fallbackManagerId ? [settings.fallbackManagerId] : []),
    ]));
    if (userIds.length === 0) return;

    const users = await this.prisma.user.findMany({
      where: {
        id: { in: userIds },
        role: 'manager',
        isActive: true,
      },
      select: { id: true },
    });
    const existingIds = new Set(users.map((user) => user.id));
    const missing = userIds.filter((userId) => !existingIds.has(userId));
    if (missing.length > 0) {
      throw new BadRequestException('В правилах Mango выбран неактивный или несуществующий менеджер.');
    }
  }

  private async assertSiteLeadRoutingUsersExist(settings: SiteLeadRoutingSettings) {
    const userIds = Array.from(new Set([
      ...settings.managerIds,
      ...(settings.fallbackManagerId ? [settings.fallbackManagerId] : []),
    ]));
    if (userIds.length === 0) return;

    const users = await this.prisma.user.findMany({
      where: {
        id: { in: userIds },
        role: 'manager',
        isActive: true,
      },
      select: { id: true },
    });
    const existingIds = new Set(users.map((user) => user.id));
    const missing = userIds.filter((userId) => !existingIds.has(userId));
    if (missing.length > 0) {
      throw new BadRequestException('В правилах сайта выбран неактивный или несуществующий менеджер.');
    }
  }

  private async resolveSiteLeadManagerAssignment(
    channel: IntegrationChannel,
    existingManagerId?: string | null,
  ): Promise<SiteLeadManagerAssignment | undefined> {
    if (channel !== 'site') return undefined;

    const settings = await this.readSiteLeadRoutingSettings();
    if (!settings.enabled) return undefined;
    if (settings.preserveExistingManager && existingManagerId) return undefined;

    return this.selectNextSiteLeadRoutingManager(settings);
  }

  private async selectNextSiteLeadRoutingManager(
    settings: SiteLeadRoutingSettings,
  ): Promise<SiteLeadManagerAssignment | undefined> {
    const userIds = Array.from(new Set([
      ...settings.managerIds,
      ...(settings.fallbackManagerId ? [settings.fallbackManagerId] : []),
    ]));
    if (userIds.length === 0) return undefined;

    const users = await this.prisma.user.findMany({
      where: {
        id: { in: userIds },
        role: 'manager',
        isActive: true,
      },
      select: { id: true },
    });
    const activeIds = new Set(users.map((user) => user.id));
    const activeManagerIds = settings.managerIds.filter((managerId) => activeIds.has(managerId));

    if (activeManagerIds.length > 0) {
      const currentIndex = settings.lastAssignedManagerId
        ? activeManagerIds.indexOf(settings.lastAssignedManagerId)
        : -1;
      const nextManagerId = activeManagerIds[(currentIndex + 1) % activeManagerIds.length];
      await this.persistSiteLeadRoutingCursor(settings, nextManagerId);
      return {
        channel: 'site',
        managerId: nextManagerId,
        reason: 'round_robin',
      };
    }

    if (settings.fallbackManagerId && activeIds.has(settings.fallbackManagerId)) {
      return {
        channel: 'site',
        managerId: settings.fallbackManagerId,
        reason: 'fallback',
      };
    }

    return undefined;
  }

  private async persistSiteLeadRoutingCursor(
    settings: SiteLeadRoutingSettings,
    managerId: string,
  ) {
    const next: SiteLeadRoutingSettings = {
      ...settings,
      lastAssignedManagerId: managerId,
    };

    await this.prisma.systemConfig.upsert({
      where: { key: SITE_LEAD_ROUTING_SETTINGS_KEY },
      create: {
        key: SITE_LEAD_ROUTING_SETTINGS_KEY,
        payload: next as unknown as Prisma.InputJsonValue,
      },
      update: {
        payload: next as unknown as Prisma.InputJsonValue,
      },
    });
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

    const isMangoRecording =
      dto.channel === 'mango'
      && this.isMangoRecordingPayload(root, call);

    const phone = this.pickEndpointString(scopes, [
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
    if (!phone && !isMangoRecording) {
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

  private extractMangoExternalIdentity(payload: Record<string, unknown>): {
    externalId?: string;
    correlationId?: string;
  } {
    const baseExternalId = this.extractMangoBaseExternalId(payload);
    if (!baseExternalId) return {};

    const discriminator = this.extractMangoLifecycleDiscriminator(payload);
    if (!discriminator) {
      return { externalId: baseExternalId };
    }

    return {
      externalId: this.limitText(`${baseExternalId}:${discriminator}`, 255),
      correlationId: baseExternalId,
    };
  }

  private extractMangoExternalId(payload: Record<string, unknown>): string | undefined {
    return this.extractMangoExternalIdentity(payload).externalId;
  }

  private extractMangoBaseExternalId(payload: Record<string, unknown>): string | undefined {
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

  private extractMangoLifecycleDiscriminator(payload: Record<string, unknown>): string | undefined {
    const root = this.asRecord(payload);
    const call = this.asRecord(root?.call);
    const connector = this.asRecord(root?._connector);
    const scopes = [root, call, connector];

    const sequence = this.pickString(scopes, ['seq', 'sequence', 'eventSeq', 'event_seq']);
    if (sequence) return `seq:${this.normalizeExternalIdPart(sequence)}`;

    const hasExplicitDirection = Boolean(
      this.pickString(scopes, ['direction', 'callDirection', 'call_direction', 'callDirectionType']),
    );
    if (hasExplicitDirection) return undefined;

    const state = this.pickString(scopes, ['call_state', 'callState', 'status']);
    const location = this.pickString(scopes, ['location', 'callLocation', 'call_location']);
    const timestamp = this.pickString(scopes, ['timestamp', 'eventTime', 'event_time']);
    if (!state && !location && !timestamp) return undefined;

    return [
      'event',
      state ? `state-${this.normalizeExternalIdPart(state)}` : undefined,
      location ? `loc-${this.normalizeExternalIdPart(location)}` : undefined,
      timestamp ? `ts-${this.normalizeExternalIdPart(timestamp)}` : undefined,
    ].filter(Boolean).join(':');
  }

  private normalizeExternalIdPart(value: string): string {
    const normalized = value.trim().replace(/[^a-zA-Z0-9_.=-]+/g, '-');
    return this.limitText(normalized || 'na', 80);
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
      ?? this.pickEndpointString(scopes, [
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

  private async resolveMangoManagerAssignment(
    channel: IntegrationChannel,
    payload: Prisma.JsonValue,
    call: NormalizedCallContext | undefined,
  ): Promise<MangoManagerAssignment | undefined> {
    if (channel !== 'mango' || !call || call.direction !== 'inbound') return undefined;

    const settings = await this.readMangoCallRoutingSettings();
    if (!settings.enabled) return undefined;

    const isTransfer = this.isMangoTransferPayload(payload);
    const isMissed = this.isMangoMissedCall(payload, call);

    if (isTransfer && !settings.updateResponsibleOnTransfer) return undefined;
    if (isMissed && !settings.assignMissedCalls) return undefined;
    if (!isTransfer && !isMissed && !settings.updateResponsibleOnAnswered) return undefined;

    const activeRuleList = settings.rules.filter((rule) => rule.isActive);
    const activeRules = new Map(activeRuleList.map((rule) => [rule.extension, rule]));
    const extensions = this.collectMangoRoutingExtensions(payload);

    for (const extension of extensions) {
      const rule = activeRules.get(extension);
      if (rule) {
        return {
          channel: 'mango',
          managerId: rule.userId,
          extension,
          reason: 'extension_match',
        };
      }
    }

    if (settings.fallbackManagerId) {
      return {
        channel: 'mango',
        managerId: settings.fallbackManagerId,
        reason: 'fallback',
      };
    }

    return this.resolveMangoRoutingPoolAssignment(activeRuleList, call);
  }

  private resolveMangoRoutingPoolAssignment(
    activeRules: MangoCallRoutingRule[],
    call: NormalizedCallContext,
  ): MangoManagerAssignment | undefined {
    const managerIds = Array.from(new Set(activeRules.map((rule) => rule.userId).filter(Boolean)));
    if (managerIds.length === 0) return undefined;

    const hashSource = [call.callId, call.from, call.to, call.startedAt]
      .filter(Boolean)
      .join('|') || 'mango-call';
    const hash = createHash('sha256').update(hashSource).digest();
    const index = hash.readUInt32BE(0) % managerIds.length;

    return {
      channel: 'mango',
      managerId: managerIds[index],
      reason: 'round_robin',
    };
  }

  private collectMangoRoutingExtensions(payload: Prisma.JsonValue): string[] {
    const root = this.asRecord(payload);
    if (!root) return [];

    const found = new Set<string>();
    const visit = (value: unknown, key = '', depth = 0) => {
      if (depth > 4) return;

      const normalized = this.shouldTreatMangoKeyAsExtension(key)
        ? this.normalizeMangoExtension(value)
        : undefined;
      if (normalized) {
        found.add(normalized);
      }

      if (!value || typeof value !== 'object') return;
      if (Array.isArray(value)) {
        for (const item of value) visit(item, key, depth + 1);
        return;
      }

      for (const [childKey, childValue] of Object.entries(value)) {
        visit(childValue, childKey, depth + 1);
      }
    };

    visit(root);
    return Array.from(found);
  }

  private shouldTreatMangoKeyAsExtension(key: string): boolean {
    const normalized = key.toLowerCase();
    return (
      normalized === 'ext' ||
      normalized === 'to' ||
      normalized === 'dst' ||
      normalized === 'number' ||
      normalized.includes('number') ||
      normalized.includes('extension') ||
      normalized.includes('abonent') ||
      normalized.includes('operator') ||
      normalized.includes('employee') ||
      normalized.includes('internal') ||
      normalized.includes('manager') ||
      normalized.includes('member') ||
      normalized.includes('participant') ||
      normalized.includes('recipient') ||
      normalized.includes('responsible') ||
      normalized.includes('destination')
    );
  }

  private isMangoTransferPayload(payload: Prisma.JsonValue): boolean {
    const root = this.asRecord(payload);
    const connector = this.asRecord(root?._connector);
    const value = this.pickString([connector, root], [
      'eventType',
      'event_type',
      'type',
      'call_state',
      'callState',
      'status',
    ])?.toLowerCase();
    return Boolean(value && /transfer|redirect|forward|перевод/.test(value));
  }

  private isMangoMissedCall(
    payload: Prisma.JsonValue,
    call: NormalizedCallContext,
  ): boolean {
    const root = this.asRecord(payload);
    const value = [
      call.status,
      this.pickString([root], ['status', 'result', 'disposition', 'call_state', 'callState']),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return /miss|no[_\s-]?answer|unanswered|lost|пропущ|не\s*ответ/.test(value);
  }

  private async logMangoCallActivity(
    event: IntegrationEvent,
    leadId: string,
    call: NormalizedCallContext | undefined,
    managerAssignment?: MangoManagerAssignment,
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
      managerAssignment: managerAssignment
        ? {
            managerId: managerAssignment.managerId,
            extension: managerAssignment.extension ?? null,
            reason: managerAssignment.reason,
          }
        : null,
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

  private async applyMangoManagerAssignmentToActiveApplications(
    event: IntegrationEvent,
    leadId: string,
    managerAssignment?: MangoManagerAssignment,
  ): Promise<void> {
    if (event.channel !== 'mango' || !managerAssignment) return;

    const activeApplications = await this.prisma.application.findMany({
      where: {
        leadId,
        isActive: true,
      },
      select: {
        id: true,
        responsibleManagerId: true,
      },
    });

    for (const application of activeApplications) {
      if (application.responsibleManagerId === managerAssignment.managerId) continue;

      await this.prisma.application.update({
        where: { id: application.id },
        data: {
          responsibleManagerId: managerAssignment.managerId,
          lastActivityAt: new Date(),
        },
      });

      await this.activity.log({
        action: 'updated',
        entityType: 'application',
        entityId: application.id,
        summary: 'Ответственный обновлен по звонку Mango',
        actorId: null,
        payload: {
          integration: {
            provider: 'mango',
            eventId: event.id,
            externalId: event.externalId,
          },
          before: {
            responsibleManagerId: application.responsibleManagerId,
          },
          after: {
            responsibleManagerId: managerAssignment.managerId,
          },
          managerAssignment: {
            extension: managerAssignment.extension ?? null,
            reason: managerAssignment.reason,
          },
        } as unknown as Prisma.InputJsonValue,
      });
    }
  }

  private async applySiteManagerAssignmentToActiveApplications(
    event: IntegrationEvent,
    leadId: string,
    managerAssignment?: IntegrationManagerAssignment,
  ): Promise<void> {
    if (event.channel !== 'site' || managerAssignment?.channel !== 'site') return;

    const activeApplications = await this.prisma.application.findMany({
      where: {
        leadId,
        isActive: true,
      },
      select: {
        id: true,
        responsibleManagerId: true,
      },
    });

    for (const application of activeApplications) {
      if (application.responsibleManagerId === managerAssignment.managerId) continue;

      await this.prisma.application.update({
        where: { id: application.id },
        data: {
          responsibleManagerId: managerAssignment.managerId,
          lastActivityAt: new Date(),
        },
      });

      await this.activity.log({
        action: 'updated',
        entityType: 'application',
        entityId: application.id,
        summary: 'Ответственный обновлен по заявке с сайта',
        actorId: null,
        payload: {
          integration: {
            provider: 'site',
            eventId: event.id,
            externalId: event.externalId,
          },
          before: {
            responsibleManagerId: application.responsibleManagerId,
          },
          after: {
            responsibleManagerId: managerAssignment.managerId,
          },
          managerAssignment: {
            reason: managerAssignment.reason,
          },
        } as unknown as Prisma.InputJsonValue,
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

    const from = this.pickEndpointString(scopes, [
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
    const to = this.pickEndpointString(scopes, [
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
      ?? this.inferMangoCallDirection(scopes, from, to)
      ?? 'unknown';
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
    const recordingUrl =
      this.pickUrl(scopes, [
        'recordingUrl',
        'recording_url',
        'recordUrl',
        'record_url',
        'recording',
        'record',
        'recordingLink',
        'recordLink',
        'talkRecordUrl',
      ])
      ?? this.buildMangoRecordingUrl(
        this.pickString(scopes, ['recordingId', 'recording_id', 'recordId', 'record_id']),
      );

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

  private inferMangoCallDirection(
    scopes: Array<Record<string, unknown> | undefined>,
    from: string | undefined,
    to: string | undefined,
  ): CallDirection | undefined {
    const location = this.pickString(scopes, ['location', 'callLocation', 'call_location'])
      ?.toLowerCase();
    if (location && /ivr|queue|acd|incoming|inbound|вход/.test(location)) {
      return 'inbound';
    }
    if (location && /outgoing|outbound|исход/.test(location)) {
      return 'outbound';
    }

    const fromExtension = this.normalizeMangoEndpointExtension(from);
    const toExtension = this.normalizeMangoEndpointExtension(to);
    if (!fromExtension && toExtension) return 'inbound';
    if (fromExtension && !toExtension) return 'outbound';

    return undefined;
  }

  private normalizeMangoEndpointExtension(value: string | undefined): string | undefined {
    if (!value) return undefined;
    const compact = value.trim().replace(/[^\d#*]/g, '');
    if (/^[\d#*]{1,6}$/.test(compact)) return compact;
    return undefined;
  }

  private buildMangoRecordingUrl(recordingIdRaw: string | undefined): string | undefined {
    const recordingId = recordingIdRaw?.trim();
    if (!recordingId) return undefined;

    const apiKey = (this.config.get<string>('INTEGRATION_MANGO_API_KEY') ?? '').trim();
    const configuredAccountId =
      (this.config.get<string>('INTEGRATION_MANGO_RECORDING_ACCOUNT_ID') ?? '').trim();
    const accountId = configuredAccountId || this.extractMangoRecordingAccountId(recordingId) || '';
    const template =
      (this.config.get<string>('INTEGRATION_MANGO_RECORDING_URL_TEMPLATE') ?? '').trim();

    if (template) {
      return this.interpolateMangoRecordingUrlTemplate(template, {
        apiKey,
        accountId,
        recordingId,
      });
    }

    if (!apiKey || !accountId) {
      return undefined;
    }

    return this.interpolateMangoRecordingUrlTemplate(
      DEFAULT_MANGO_RECORDING_URL_TEMPLATE,
      {
        apiKey,
        accountId,
        recordingId,
      },
    );
  }

  private parseMangoRecordingProxyUrl(rawUrl: string): URL {
    const candidate = rawUrl?.trim();
    if (!candidate) {
      throw new BadRequestException('Recording URL is required');
    }

    let parsed: URL;
    try {
      parsed = new URL(candidate);
    } catch {
      throw new BadRequestException('Recording URL must be an absolute URL');
    }

    if (parsed.protocol !== 'https:') {
      throw new BadRequestException('Recording URL protocol is not allowed');
    }
    if (parsed.hostname !== 'lk.mango-office.ru') {
      throw new BadRequestException('Recording host is not allowed');
    }
    if (parsed.search || parsed.hash) {
      throw new BadRequestException('Recording URL must not include query or fragment');
    }
    if (!MANGO_RECORDING_PROXY_PATH_RE.test(parsed.pathname)) {
      throw new BadRequestException('Recording URL path is not allowed');
    }

    return parsed;
  }

  private buildMangoSignedRecordingLinkFromLegacyUrl(url: URL): string | undefined {
    const recordingId = this.extractMangoRecordingIdFromLegacyUrl(url);
    if (!recordingId) {
      return undefined;
    }

    const apiKey = (this.config.get<string>('INTEGRATION_MANGO_API_KEY') ?? '').trim();
    const apiSalt = (this.config.get<string>('INTEGRATION_MANGO_SECRET') ?? '').trim();
    if (!apiKey || !apiSalt) {
      return undefined;
    }

    const expires = Math.floor(Date.now() / 1000) + MANGO_SIGNED_RECORDING_LINK_TTL_SECONDS;
    const sign = createHash('sha256')
      .update(`${apiKey}${expires}${recordingId}${apiSalt}`)
      .digest('hex');

    return [
      MANGO_SIGNED_RECORDING_LINK_BASE,
      encodeURIComponent(recordingId),
      MANGO_SIGNED_RECORDING_LINK_ACTION,
      encodeURIComponent(apiKey),
      String(expires),
      sign,
    ].join('/');
  }

  private extractMangoRecordingIdFromLegacyUrl(url: URL): string | undefined {
    if (!MANGO_RECORDING_PROXY_PATH_RE.test(url.pathname)) {
      return undefined;
    }

    const pathParts = url.pathname.split('/').filter(Boolean);
    const encodedRecordingId = pathParts[pathParts.length - 1]?.trim();
    if (!encodedRecordingId) {
      return undefined;
    }

    try {
      const recordingId = decodeURIComponent(encodedRecordingId).trim();
      return recordingId || undefined;
    } catch {
      return undefined;
    }
  }

  private parseMangoRecordingTempLink(rawUrl: string, baseUrl: string): URL {
    let parsed: URL;
    try {
      parsed = new URL(rawUrl, baseUrl);
    } catch {
      throw new ServiceUnavailableException('Mango recording returned invalid temporary link');
    }

    if (parsed.protocol !== 'https:') {
      throw new ServiceUnavailableException('Mango recording temporary link protocol is not allowed');
    }
    const hostname = parsed.hostname.toLowerCase();
    if (hostname !== 'mango-office.ru' && !hostname.endsWith('.mango-office.ru')) {
      throw new ServiceUnavailableException(
        `Mango recording temporary link host is not allowed (${hostname})`,
      );
    }

    return parsed;
  }

  private buildMangoRecordingFailureMessage(
    baseMessage: string,
    attempts: MangoRecordingFetchAttempt[],
  ): string {
    if (attempts.length <= 1) {
      return baseMessage;
    }

    const trace = attempts
      .map((attempt) => `${attempt.source}:${attempt.status}`)
      .join(', ');
    return `${baseMessage} (${trace})`;
  }

  private isMangoRecordingContentTypeAllowed(contentTypeRaw: string): boolean {
    const contentType = contentTypeRaw.split(';')[0]?.trim().toLowerCase() ?? '';
    return contentType.startsWith('audio/') || contentType === 'application/octet-stream';
  }

  private extractMangoRecordingAccountId(recordingId: string): string | undefined {
    const rawParts = recordingId.split(':');
    if (rawParts.length >= 2) {
      const candidate = rawParts[1]?.trim();
      if (candidate && /^\d{4,20}$/.test(candidate)) {
        return candidate;
      }
    }

    const decoded = this.decodeBase64Loose(recordingId);
    if (!decoded) return undefined;

    const decodedParts = decoded.split(':');
    if (decodedParts.length < 2) return undefined;

    const candidate = decodedParts[1]?.trim();
    if (candidate && /^\d{4,20}$/.test(candidate)) {
      return candidate;
    }

    return undefined;
  }

  private decodeBase64Loose(value: string): string | undefined {
    const normalized = value.trim().replaceAll('-', '+').replaceAll('_', '/');
    if (!normalized) return undefined;

    const remainder = normalized.length % 4;
    const padded = remainder === 0
      ? normalized
      : `${normalized}${'='.repeat(4 - remainder)}`;

    try {
      return Buffer.from(padded, 'base64').toString('utf8');
    } catch {
      return undefined;
    }
  }

  private interpolateMangoRecordingUrlTemplate(
    templateRaw: string,
    values: {
      apiKey: string;
      accountId: string;
      recordingId: string;
    },
  ): string | undefined {
    const template = templateRaw.trim();
    if (!template) return undefined;

    if (
      template.includes('{apiKey}') && !values.apiKey
      || template.includes('{accountId}') && !values.accountId
    ) {
      return undefined;
    }

    const candidate = template
      .replaceAll('{apiKey}', encodeURIComponent(values.apiKey))
      .replaceAll('{accountId}', encodeURIComponent(values.accountId))
      .replaceAll('{recordingId}', encodeURIComponent(values.recordingId));

    try {
      const parsed = new URL(candidate);
      if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
        return parsed.toString();
      }
      return undefined;
    } catch {
      return undefined;
    }
  }

  private hasMangoContactPhone(
    scopes: Array<Record<string, unknown> | undefined>,
    call: NormalizedCallContext | undefined,
  ): boolean {
    const callCounterpartyPhone = call
      ? this.pickCallCounterpartyPhone(call)
      : undefined;

    const phoneRaw =
      callCounterpartyPhone
      ?? this.pickString(scopes, ['contactPhone', 'phone', 'phoneNumber', 'senderPhone'])
      ?? this.pickEndpointString(scopes, [
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

    return Boolean(normalizePhone(phoneRaw));
  }

  private isMangoRecordingPayload(
    root: Record<string, unknown> | undefined,
    call?: Record<string, unknown>,
    callContext?: NormalizedCallContext,
  ): boolean {
    const connector = this.asRecord(root?._connector);
    const typeRaw = this.pickString([connector, root, call], [
      'eventType',
      'event_type',
      'type',
    ])?.toLowerCase();
    if (typeRaw?.includes('recording')) {
      return true;
    }

    if (
      Boolean(
        this.pickString([root, call], [
          'recordingId',
          'recording_id',
          'recordingState',
          'recording_state',
        ]),
      )
    ) {
      return true;
    }

    return Boolean(callContext?.recordingUrl);
  }

  private async resolveLeadIdForMangoCallContext(
    event: IntegrationEvent,
    call: NormalizedCallContext | undefined,
  ): Promise<string | undefined> {
    if (event.relatedLeadId) {
      return event.relatedLeadId;
    }

    const callId = call?.callId?.trim();
    if (!callId) {
      return undefined;
    }

    const recentEvents = await this.prisma.integrationEvent.findMany({
      where: {
        channel: 'mango',
        id: { not: event.id },
        relatedLeadId: { not: null },
      },
      orderBy: { receivedAt: 'desc' },
      take: 300,
      select: {
        externalId: true,
        relatedLeadId: true,
        payload: true,
      },
    });

    for (const candidate of recentEvents) {
      const root = this.asRecord(candidate.payload);
      const lead = this.asRecord(root?.lead);
      const contact = this.asRecord(root?.contact);
      const sender = this.asRecord(root?.sender);
      const nestedCall = this.asRecord(root?.call);
      const callScopes = [nestedCall, root, lead, contact, sender];
      const candidateCall = this.normalizeCallContext(callScopes, candidate.externalId);
      if (candidateCall?.callId === callId) {
        return candidate.relatedLeadId ?? undefined;
      }
    }

    return undefined;
  }

  private normalizeCallDirection(raw: string | undefined): CallDirection | undefined {
    if (!raw) return undefined;
    const value = raw.trim().toLowerCase();

    if (
      ['1', 'in', 'incoming', 'inbound', 'entry', 'входящий', 'вход'].includes(value) ||
      /incoming|inbound|incoming_call|inbound_call|входящ/.test(value)
    ) {
      return 'inbound';
    }
    if (
      ['2', '0', 'out', 'outgoing', 'outbound', 'исходящий', 'исход'].includes(value) ||
      /outgoing|outbound|outgoing_call|outbound_call|исходящ/.test(value)
    ) {
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
        if (typeof value === 'number' && Number.isFinite(value)) {
          return String(value);
        }
      }
    }
    return undefined;
  }

  private pickEndpointString(
    scopes: Array<Record<string, unknown> | undefined>,
    keys: string[],
  ): string | undefined {
    const direct = this.pickString(scopes, keys);
    if (direct) return direct;

    for (const scope of scopes) {
      if (!scope) continue;
      for (const key of keys) {
        const value = this.asRecord(scope[key]);
        if (!value) continue;
        const nested = this.pickString([value], [
          'number',
          'phone',
          'phoneNumber',
          'from_number',
          'to_number',
          'caller_number',
          'callee_number',
          'abonent_number',
          'line_number',
        ]);
        if (nested) return nested;
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
