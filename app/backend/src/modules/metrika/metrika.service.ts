import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PipelineStage, Prisma, type MetrikaConversion } from '@prisma/client';
import { ActivityService } from '../activity/activity.service';
import { PrismaService } from '../../prisma/prisma.service';

type MetrikaTarget = 'MARKETING_QUAL' | 'SALES_QUAL';

interface GoalDefinition {
  target: MetrikaTarget;
  goalId: string;
}

interface UploadResponse {
  uploading?: {
    id?: string | number;
  };
}

const GOALS: Record<MetrikaTarget, GoalDefinition> = {
  MARKETING_QUAL: { target: 'MARKETING_QUAL', goalId: '601866056' },
  SALES_QUAL: { target: 'SALES_QUAL', goalId: '601866057' },
};

const RETRY_INTERVAL_MS = 60_000;
const STALE_PROCESSING_MS = 10 * 60_000;
const WAITING_IDENTITY_MS = 10 * 60_000;
const REQUEST_TIMEOUT_MS = 15_000;

@Injectable()
export class MetrikaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MetrikaService.name);
  private interval?: NodeJS.Timeout;
  private initialFlush?: NodeJS.Timeout;
  private flushInProgress = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly activity: ActivityService,
  ) {}

  onModuleInit() {
    this.initialFlush = setTimeout(() => void this.flushPending(), 5_000);
    this.initialFlush.unref();
    this.interval = setInterval(() => void this.flushPending(), RETRY_INTERVAL_MS);
    this.interval.unref();
  }

  onModuleDestroy() {
    if (this.initialFlush) clearTimeout(this.initialFlush);
    if (this.interval) clearInterval(this.interval);
  }

  async enqueueForStage(
    tx: Prisma.TransactionClient,
    leadId: string,
    stage: PipelineStage,
    occurredAt: Date,
  ): Promise<void> {
    for (const goal of this.goalsForStage(stage)) {
      await tx.metrikaConversion.upsert({
        where: {
          leadId_target: {
            leadId,
            target: goal.target,
          },
        },
        create: {
          leadId,
          target: goal.target,
          goalId: goal.goalId,
          occurredAt,
          status: 'pending',
          nextAttemptAt: new Date(),
        },
        update: {
          goalId: goal.goalId,
        },
      });
    }
  }

  scheduleFlush(): void {
    setTimeout(() => void this.flushPending(), 0).unref();
  }

  async flushPending(leadId?: string): Promise<void> {
    if (this.flushInProgress || !this.isConfigured()) return;
    this.flushInProgress = true;

    try {
      await this.recoverStaleProcessing();
      const due = await this.prisma.metrikaConversion.findMany({
        where: {
          ...(leadId ? { leadId } : {}),
          status: { in: ['pending', 'failed', 'waiting_identity'] },
          nextAttemptAt: { lte: new Date() },
        },
        orderBy: [{ nextAttemptAt: 'asc' }, { createdAt: 'asc' }],
        take: 25,
      });

      for (const conversion of due) {
        await this.processConversion(conversion);
      }
    } catch (error) {
      this.logger.error(`Metrika retry loop failed: ${this.errorMessage(error)}`);
    } finally {
      this.flushInProgress = false;
    }
  }

  private goalsForStage(stage: PipelineStage): GoalDefinition[] {
    if (stage === 'marketing_qualified') return [GOALS.MARKETING_QUAL];
    if (stage === 'completed') return [GOALS.MARKETING_QUAL, GOALS.SALES_QUAL];
    return [];
  }

  private isConfigured(): boolean {
    return Boolean(this.counterId() && this.oauthToken());
  }

  private counterId(): string {
    return (this.config.get<string>('YANDEX_METRIKA_COUNTER_ID') ?? '').trim();
  }

  private oauthToken(): string {
    return (this.config.get<string>('YANDEX_METRIKA_OAUTH_TOKEN') ?? '').trim();
  }

  private async recoverStaleProcessing(): Promise<void> {
    const staleBefore = new Date(Date.now() - STALE_PROCESSING_MS);
    await this.prisma.metrikaConversion.updateMany({
      where: {
        status: 'processing',
        lastAttemptAt: { lt: staleBefore },
      },
      data: {
        status: 'failed',
        nextAttemptAt: new Date(),
        lastErrorCode: 'STALE_PROCESSING_RECOVERED',
        lastErrorMessage: 'Recovered after an interrupted Metrika upload attempt',
      },
    });
  }

  private async processConversion(conversion: MetrikaConversion): Promise<void> {
    const claimed = await this.prisma.metrikaConversion.updateMany({
      where: {
        id: conversion.id,
        status: { in: ['pending', 'failed', 'waiting_identity'] },
        nextAttemptAt: { lte: new Date() },
      },
      data: {
        status: 'processing',
        lastAttemptAt: new Date(),
        nextAttemptAt: null,
      },
    });
    if (claimed.count === 0) return;

    const attribution = await this.prisma.leadAttribution.findFirst({
      where: {
        leadId: conversion.leadId,
        OR: [
          { metrikaClientId: { not: null } },
          { yclid: { not: null } },
        ],
      },
      orderBy: [{ capturedAt: 'desc' }, { createdAt: 'desc' }],
    });

    const metrikaClientId = attribution?.metrikaClientId?.trim() || undefined;
    const yclid = attribution?.yclid?.trim() || undefined;
    if (!metrikaClientId && !yclid) {
      await this.prisma.metrikaConversion.update({
        where: { id: conversion.id },
        data: {
          status: 'waiting_identity',
          nextAttemptAt: new Date(Date.now() + WAITING_IDENTITY_MS),
          lastErrorCode: 'IDENTITY_NOT_AVAILABLE',
          lastErrorMessage: 'Lead has no Metrika ClientID or yclid yet',
        },
      });
      return;
    }

    const attempt = conversion.attempts + 1;
    await this.prisma.metrikaConversion.update({
      where: { id: conversion.id },
      data: {
        attempts: { increment: 1 },
        metrikaClientId: metrikaClientId ?? null,
        yclid: yclid ?? null,
      },
    });

    try {
      const uploadId = await this.uploadConversion({
        ...conversion,
        metrikaClientId: metrikaClientId ?? null,
        yclid: yclid ?? null,
      });
      const sentAt = new Date();
      await this.prisma.metrikaConversion.update({
        where: { id: conversion.id },
        data: {
          status: 'sent',
          nextAttemptAt: null,
          sentAt,
          uploadId,
          lastErrorCode: null,
          lastErrorMessage: null,
        },
      });
      await this.activity.log({
        action: 'updated',
        entityType: 'metrika_conversion',
        entityId: conversion.id,
        actorId: null,
        summary: `Отправлена цель ${conversion.target} в Яндекс Метрику`,
        payload: {
          leadId: conversion.leadId,
          target: conversion.target,
          goalId: conversion.goalId,
          uploadId,
          attempt,
        },
      });
    } catch (error) {
      const failure = this.classifyUploadFailure(error);
      const nextAttemptAt = failure.transient
        ? new Date(Date.now() + this.retryDelayMs(attempt))
        : null;
      await this.prisma.metrikaConversion.update({
        where: { id: conversion.id },
        data: {
          status: 'failed',
          nextAttemptAt,
          lastErrorCode: failure.code,
          lastErrorMessage: failure.message,
        },
      });
    }
  }

  private async uploadConversion(conversion: MetrikaConversion): Promise<string | null> {
    const timestamp = Math.min(
      Math.floor(conversion.occurredAt.getTime() / 1000),
      Math.floor(Date.now() / 1000) - 1,
    );
    const csv = [
      'ClientId,Yclid,Target,DateTime',
      [
        this.csvCell(conversion.metrikaClientId),
        this.csvCell(conversion.yclid),
        this.csvCell(conversion.target),
        String(timestamp),
      ].join(','),
      '',
    ].join('\r\n');

    const form = new FormData();
    form.append(
      'file',
      new Blob([csv], { type: 'text/csv;charset=utf-8' }),
      `crm-${conversion.id}.csv`,
    );

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    timeout.unref();
    let response: Response;
    try {
      const counterId = encodeURIComponent(this.counterId());
      response = await fetch(
        `https://api-metrika.yandex.net/management/v1/counter/${counterId}/offline_conversions/upload?type=BASIC&comment=Katet%20CRM`,
        {
          method: 'POST',
          headers: {
            Authorization: `OAuth ${this.oauthToken()}`,
          },
          body: form,
          signal: controller.signal,
        },
      );
    } finally {
      clearTimeout(timeout);
    }

    const body = await response.text();
    if (!response.ok) {
      const error = new Error(`Metrika HTTP ${response.status}: ${body.slice(0, 500)}`) as Error & {
        status?: number;
      };
      error.status = response.status;
      throw error;
    }

    if (!body.trim()) return null;
    try {
      const parsed = JSON.parse(body) as UploadResponse;
      const id = parsed.uploading?.id;
      return id === undefined || id === null ? null : String(id);
    } catch {
      return null;
    }
  }

  private classifyUploadFailure(error: unknown): {
    code: string;
    message: string;
    transient: boolean;
  } {
    const status = typeof error === 'object' && error !== null && 'status' in error
      ? Number((error as { status?: unknown }).status)
      : undefined;
    const transient = status === undefined || status === 408 || status === 429 || status >= 500;
    return {
      code: status ? `HTTP_${status}` : 'NETWORK_ERROR',
      message: this.errorMessage(error).slice(0, 1000),
      transient,
    };
  }

  private retryDelayMs(attempt: number): number {
    return Math.min(60_000 * 2 ** Math.max(0, attempt - 1), 6 * 60 * 60_000);
  }

  private csvCell(value: string | null | undefined): string {
    if (!value) return '';
    const escaped = value.replace(/"/g, '""');
    return /[",\r\n]/.test(escaped) ? `"${escaped}"` : escaped;
  }

  private errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
}
