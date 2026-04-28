import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, type SourceChannel } from '@prisma/client';
import { createHash } from 'crypto';
import { normalizeCompany, normalizePhone } from '../../common/normalize';
import { PrismaService } from '../../prisma/prisma.service';
import { ActivityService } from '../activity/activity.service';
import { ClientsService } from '../clients/clients.service';
import type { UpdateClientDto } from '../clients/clients.dto';
import { LeadsService, type ActorContext } from '../leads/leads.service';
import type { UpdateLeadDto } from '../leads/leads.dto';
import {
  IMPORT_DEDUP_POLICY,
  type ImportDedupPolicy,
  type ImportEntityType,
  type ImportPreviewDto,
  type RunImportDto,
} from './imports.dto';

type RowStatus = 'valid' | 'duplicate' | 'error';

type LeadImportField =
  | 'contactName'
  | 'contactPhone'
  | 'contactCompany'
  | 'equipmentTypeHint'
  | 'requestedDate'
  | 'timeWindow'
  | 'address'
  | 'comment'
  | 'source'
  | 'isUrgent'
  | 'externalSourceId';

type ClientImportField =
  | 'name'
  | 'phone'
  | 'company'
  | 'email'
  | 'notes'
  | 'externalSourceId';

const LEAD_IMPORT_FIELDS: LeadImportField[] = [
  'contactName',
  'contactPhone',
  'contactCompany',
  'equipmentTypeHint',
  'requestedDate',
  'timeWindow',
  'address',
  'comment',
  'source',
  'isUrgent',
  'externalSourceId',
];

const CLIENT_IMPORT_FIELDS: ClientImportField[] = [
  'name',
  'phone',
  'company',
  'email',
  'notes',
  'externalSourceId',
];

const REQUIRED_FIELDS: Record<ImportEntityType, string[]> = {
  lead: ['contactName', 'contactPhone'],
  client: ['name', 'phone'],
};

const FIELD_LABEL: Record<string, string> = {
  contactName: 'Имя контакта',
  contactPhone: 'Телефон',
  contactCompany: 'Компания',
  equipmentTypeHint: 'Тип техники',
  requestedDate: 'Дата заявки',
  timeWindow: 'Окно времени',
  address: 'Адрес',
  comment: 'Комментарий',
  source: 'Канал',
  isUrgent: 'Срочно',
  externalSourceId: 'Внешний ID',
  name: 'Имя',
  phone: 'Телефон',
  company: 'Компания',
  email: 'Email',
  notes: 'Заметки',
};

const FIELD_ALIASES: Record<ImportEntityType, Record<string, string[]>> = {
  lead: {
    contactName: ['contactName', 'name', 'fullName', 'clientName'],
    contactPhone: ['contactPhone', 'phone', 'phoneNumber', 'mobile'],
    contactCompany: ['contactCompany', 'company', 'organization'],
    equipmentTypeHint: ['equipmentTypeHint', 'equipmentType', 'machineType'],
    requestedDate: ['requestedDate', 'requestDate', 'date'],
    timeWindow: ['timeWindow', 'timeSlot', 'time'],
    address: ['address', 'location'],
    comment: ['comment', 'note', 'notes', 'message'],
    source: ['source', 'sourceChannel', 'channel'],
    isUrgent: ['isUrgent', 'urgent', 'priority'],
    externalSourceId: ['externalSourceId', 'externalId', 'sourceId'],
  },
  client: {
    name: ['name', 'fullName', 'clientName'],
    phone: ['phone', 'phoneNumber', 'mobile'],
    company: ['company', 'organization'],
    email: ['email', 'mail'],
    notes: ['notes', 'comment', 'note'],
    externalSourceId: ['externalSourceId', 'externalId', 'sourceId'],
  },
};

const PREVIEW_ROWS_LIMIT = 250;

interface ImportSummary {
  totalRows: number;
  validRows: number;
  errorRows: number;
  potentialDuplicates: number;
}

interface PreviewRowDto {
  rowNumber: number;
  status: RowStatus;
  errors: string[];
  duplicateHints: string[];
  existingIds: string[];
  transformed: Record<string, string | boolean | null>;
}

interface PreparedLeadData {
  contactName: string;
  contactPhone: string;
  contactCompany?: string;
  equipmentTypeHint?: string;
  requestedDate?: string;
  timeWindow?: string;
  address?: string;
  comment?: string;
  source?: SourceChannel;
  isUrgent: boolean;
  externalSourceId?: string;
  phoneNormalized?: string;
  companyNormalized?: string;
}

interface PreparedClientData {
  name: string;
  phone: string;
  company?: string;
  email?: string;
  notes?: string;
  externalSourceId?: string;
  phoneNormalized?: string;
  companyNormalized?: string;
}

interface PreparedRowBase {
  rowNumber: number;
  errors: string[];
  duplicateHints: string[];
  existingIds: string[];
  dedupKeys: string[];
  transformed: Record<string, string | boolean | null>;
}

interface PreparedLeadRow extends PreparedRowBase {
  mapped: PreparedLeadData;
}

interface PreparedClientRow extends PreparedRowBase {
  mapped: PreparedClientData;
}

interface PreparedResult<T extends PreparedRowBase> {
  headers: string[];
  mapping: Record<string, string>;
  requiredFields: string[];
  rows: T[];
  summary: ImportSummary;
}

interface ImportIssue {
  rowNumber: number;
  status: 'skipped' | 'failed';
  reason: string;
}

interface StoredImportSummary {
  totalRows: number;
  validRows: number;
  errorRows: number;
  potentialDuplicates: number;
  created: number;
  updated: number;
  imported: number;
  skipped: number;
  failed: number;
  duplicates: number;
  errors: number;
}

interface StoredImportPayload {
  fileName: string | null;
  source: string | null;
  headers: string[];
  requiredFields: string[];
  mapping: Record<string, string>;
  dedupPolicy: ImportDedupPolicy;
  rowsFingerprint: string | null;
  summary: StoredImportSummary;
  issues: ImportIssue[];
  errorReportCsvAvailable: boolean;
}

@Injectable()
export class ImportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activity: ActivityService,
    private readonly leads: LeadsService,
    private readonly clients: ClientsService,
  ) {}

  async preview(dto: ImportPreviewDto) {
    if (dto.entityType === 'lead') {
      const prepared = await this.prepareLeadRows(dto);
      return this.toPreviewResponse(dto.entityType, prepared);
    }

    const prepared = await this.prepareClientRows(dto);
    return this.toPreviewResponse(dto.entityType, prepared);
  }

  async run(dto: RunImportDto, actorId: string) {
    const dedupPolicy: ImportDedupPolicy = dto.dedupPolicy ?? IMPORT_DEDUP_POLICY.skip;
    if (dto.entityType === 'lead') {
      return this.runLeadImport(dto, actorId, dedupPolicy);
    }
    return this.runClientImport(dto, actorId, dedupPolicy);
  }

  async getReport(importId: string) {
    const activity = await this.prisma.activityLogEntry.findFirst({
      where: {
        action: 'imported',
        entityId: importId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        actor: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    });

    if (!activity) {
      throw new NotFoundException('Импорт не найден');
    }

    const payload = this.parseStoredPayload(activity.payload);
    const errorReportCsv = payload.issues.length > 0 ? this.toIssueCsv(payload.issues) : null;

    return {
      importId,
      activityId: activity.id,
      entityType: activity.entityType,
      createdAt: activity.createdAt.toISOString(),
      actor: activity.actor
        ? {
            id: activity.actor.id,
            fullName: activity.actor.fullName,
            email: activity.actor.email,
          }
        : null,
      fileName: payload.fileName,
      source: payload.source,
      headers: payload.headers,
      requiredFields: payload.requiredFields,
      mapping: payload.mapping,
      dedupPolicy: payload.dedupPolicy,
      rowsFingerprint: payload.rowsFingerprint,
      summary: payload.summary,
      issues: payload.issues,
      errorReportCsv,
    };
  }

  private toPreviewResponse<T extends PreparedRowBase>(
    entityType: ImportEntityType,
    prepared: PreparedResult<T>,
  ) {
    return {
      entityType,
      headers: prepared.headers,
      mapping: prepared.mapping,
      requiredFields: prepared.requiredFields,
      summary: prepared.summary,
      rows: prepared.rows.slice(0, PREVIEW_ROWS_LIMIT).map((row) => {
        const status: RowStatus = row.errors.length > 0
          ? 'error'
          : row.duplicateHints.length > 0
            ? 'duplicate'
            : 'valid';
        return {
          rowNumber: row.rowNumber,
          status,
          errors: row.errors,
          duplicateHints: row.duplicateHints,
          existingIds: row.existingIds,
          transformed: row.transformed,
        } satisfies PreviewRowDto;
      }),
    };
  }

  private async runLeadImport(
    dto: RunImportDto,
    actorId: string,
    dedupPolicy: ImportDedupPolicy,
  ) {
    const prepared = await this.prepareLeadRows(dto);
    const actor: ActorContext = { id: actorId, role: 'admin' };
    const sourceLabel = (dto.sourceLabel?.trim() || dto.fileName?.trim() || '').slice(0, 200) || undefined;

    let created = 0;
    let updated = 0;
    let skipped = 0;
    let failed = 0;
    const issues: ImportIssue[] = [];
    const seen = new Map<string, string>();

    for (const row of prepared.rows) {
      if (row.errors.length > 0) {
        failed += 1;
        issues.push({
          rowNumber: row.rowNumber,
          status: 'failed',
          reason: row.errors.join('; '),
        });
        continue;
      }

      const existingDuplicateId = row.existingIds[0];
      const seenDuplicateId = this.findSeenDuplicate(seen, row.dedupKeys);

      if (dedupPolicy === IMPORT_DEDUP_POLICY.skip && (existingDuplicateId || seenDuplicateId)) {
        skipped += 1;
        issues.push({
          rowNumber: row.rowNumber,
          status: 'skipped',
          reason: existingDuplicateId
            ? 'Пропущено: найден дубль в CRM'
            : 'Пропущено: дубль в текущем пакете',
        });
        continue;
      }

      try {
        const targetId = existingDuplicateId ?? seenDuplicateId;
        let persistedId: string;

        if (targetId) {
          await this.updateLeadFromImport(targetId, row.mapped, actor);
          persistedId = targetId;
          updated += 1;
        } else {
          persistedId = await this.createLeadFromImport(row.mapped, actor, sourceLabel);
          created += 1;
        }

        this.markSeen(seen, row.dedupKeys, persistedId);
      } catch (error) {
        failed += 1;
        issues.push({
          rowNumber: row.rowNumber,
          status: 'failed',
          reason: this.stringifyError(error),
        });
      }
    }

    return this.finalizeRun({
      dto,
      prepared,
      dedupPolicy,
      created,
      updated,
      skipped,
      failed,
      issues,
      actorId,
    });
  }

  private async runClientImport(
    dto: RunImportDto,
    actorId: string,
    dedupPolicy: ImportDedupPolicy,
  ) {
    const prepared = await this.prepareClientRows(dto);

    let created = 0;
    let updated = 0;
    let skipped = 0;
    let failed = 0;
    const issues: ImportIssue[] = [];
    const seen = new Map<string, string>();

    for (const row of prepared.rows) {
      if (row.errors.length > 0) {
        failed += 1;
        issues.push({
          rowNumber: row.rowNumber,
          status: 'failed',
          reason: row.errors.join('; '),
        });
        continue;
      }

      const existingDuplicateId = row.existingIds[0];
      const seenDuplicateId = this.findSeenDuplicate(seen, row.dedupKeys);

      if (dedupPolicy === IMPORT_DEDUP_POLICY.skip && (existingDuplicateId || seenDuplicateId)) {
        skipped += 1;
        issues.push({
          rowNumber: row.rowNumber,
          status: 'skipped',
          reason: existingDuplicateId
            ? 'Пропущено: найден дубль в CRM'
            : 'Пропущено: дубль в текущем пакете',
        });
        continue;
      }

      try {
        const targetId = existingDuplicateId ?? seenDuplicateId;
        let persistedId: string;

        if (targetId) {
          await this.updateClientFromImport(targetId, row.mapped, actorId);
          persistedId = targetId;
          updated += 1;
        } else {
          persistedId = await this.createClientFromImport(row.mapped, actorId);
          created += 1;
        }

        this.markSeen(seen, row.dedupKeys, persistedId);
      } catch (error) {
        failed += 1;
        issues.push({
          rowNumber: row.rowNumber,
          status: 'failed',
          reason: this.stringifyError(error),
        });
      }
    }

    return this.finalizeRun({
      dto,
      prepared,
      dedupPolicy,
      created,
      updated,
      skipped,
      failed,
      issues,
      actorId,
    });
  }

  private async finalizeRun(input: {
    dto: RunImportDto;
    prepared: PreparedResult<PreparedRowBase>;
    dedupPolicy: ImportDedupPolicy;
    created: number;
    updated: number;
    skipped: number;
    failed: number;
    issues: ImportIssue[];
    actorId: string;
  }) {
    const importId = this.generateImportId();
    const imported = input.created + input.updated;
    const rowsFingerprint = this.computeRowsFingerprint(input.dto.rows);
    const summaryText = this.buildSummaryText(
      input.dto.entityType,
      input.created,
      input.updated,
      input.skipped,
      input.failed,
    );

    const errorReportCsv = input.issues.length > 0
      ? this.toIssueCsv(input.issues)
      : null;

    const activityEntry = await this.activity.log({
      action: 'imported',
      entityType: input.dto.entityType,
      entityId: importId,
      summary: summaryText,
      actorId: input.actorId,
      payload: ({
        fileName: input.dto.fileName ?? null,
        source: input.dto.sourceLabel ?? null,
        headers: input.prepared.headers,
        requiredFields: input.prepared.requiredFields,
        mapping: input.prepared.mapping,
        dedupPolicy: input.dedupPolicy,
        rowsFingerprint,
        summary: {
          totalRows: input.prepared.summary.totalRows,
          validRows: input.prepared.summary.validRows,
          errorRows: input.prepared.summary.errorRows,
          potentialDuplicates: input.prepared.summary.potentialDuplicates,
          created: input.created,
          updated: input.updated,
          imported,
          skipped: input.skipped,
          failed: input.failed,
          duplicates: input.prepared.summary.potentialDuplicates,
          errors: input.failed,
        },
        issues: input.issues,
        errorReportCsvAvailable: Boolean(errorReportCsv),
      }) as unknown as Prisma.InputJsonValue,
    });

    return {
      importId,
      activityId: activityEntry.id,
      entityType: input.dto.entityType,
      fileName: input.dto.fileName ?? null,
      dedupPolicy: input.dedupPolicy,
      rowsFingerprint,
      mapping: input.prepared.mapping,
      summary: {
        ...input.prepared.summary,
        created: input.created,
        updated: input.updated,
        imported,
        skipped: input.skipped,
        failed: input.failed,
      },
      issues: input.issues,
      errorReportCsv,
    };
  }

  private parseStoredPayload(payload: Prisma.JsonValue | null): StoredImportPayload {
    const record = this.asRecord(payload);
    const summaryRecord = this.asRecord(record?.summary);

    const dedupPolicyRaw = this.toText(record?.dedupPolicy);
    const dedupPolicy = dedupPolicyRaw === IMPORT_DEDUP_POLICY.update
      ? IMPORT_DEDUP_POLICY.update
      : IMPORT_DEDUP_POLICY.skip;

    return {
      fileName: this.toText(record?.fileName) ?? null,
      source: this.toText(record?.source) ?? null,
      headers: this.asStringArray(record?.headers),
      requiredFields: this.asStringArray(record?.requiredFields),
      mapping: this.asStringMap(record?.mapping),
      dedupPolicy,
      rowsFingerprint: this.toText(record?.rowsFingerprint) ?? null,
      summary: {
        totalRows: this.toNumber(summaryRecord?.totalRows),
        validRows: this.toNumber(summaryRecord?.validRows),
        errorRows: this.toNumber(summaryRecord?.errorRows),
        potentialDuplicates: this.toNumber(summaryRecord?.potentialDuplicates),
        created: this.toNumber(summaryRecord?.created),
        updated: this.toNumber(summaryRecord?.updated),
        imported: this.toNumber(summaryRecord?.imported),
        skipped: this.toNumber(summaryRecord?.skipped),
        failed: this.toNumber(summaryRecord?.failed),
        duplicates: this.toNumber(summaryRecord?.duplicates),
        errors: this.toNumber(summaryRecord?.errors),
      },
      issues: this.asIssues(record?.issues),
      errorReportCsvAvailable: this.toBoolean(record?.errorReportCsvAvailable),
    };
  }

  private async prepareLeadRows(dto: ImportPreviewDto): Promise<PreparedResult<PreparedLeadRow>> {
    const headers = this.collectHeaders(dto.rows);
    const mapping = this.buildMapping('lead', headers, dto.mapping);

    const rows: PreparedLeadRow[] = dto.rows.map((rawRow, idx) => {
      const rowNumber = idx + 1;
      const errors: string[] = [];

      const contactName = this.clip(this.toText(this.pick(rawRow, mapping.contactName)) ?? '', 200);
      const contactPhoneRaw = this.toText(this.pick(rawRow, mapping.contactPhone)) ?? '';
      const contactPhone = this.clip(contactPhoneRaw, 64);
      const phoneNormalized = normalizePhone(contactPhoneRaw);

      if (!contactName || contactName.length < 2) {
        errors.push('Не заполнено поле Имя контакта');
      }
      if (!phoneNormalized) {
        errors.push('Не заполнено поле Телефон');
      }

      const contactCompany = this.clipOrUndefined(
        this.toText(this.pick(rawRow, mapping.contactCompany)),
        200,
      );
      const companyNormalized = normalizeCompany(contactCompany);

      const equipmentTypeHint = this.clipOrUndefined(
        this.toText(this.pick(rawRow, mapping.equipmentTypeHint)),
        200,
      );
      const timeWindow = this.clipOrUndefined(
        this.toText(this.pick(rawRow, mapping.timeWindow)),
        50,
      );
      const address = this.clipOrUndefined(this.toText(this.pick(rawRow, mapping.address)), 500);
      const comment = this.clipOrUndefined(this.toText(this.pick(rawRow, mapping.comment)), 2000);

      const requestedDateResult = this.parseDateIso(this.pick(rawRow, mapping.requestedDate));
      if (requestedDateResult.error) {
        errors.push(requestedDateResult.error);
      }

      const sourceResult = this.parseSource(this.pick(rawRow, mapping.source));
      if (sourceResult.error) {
        errors.push(sourceResult.error);
      }

      const isUrgent = this.parseBoolean(this.pick(rawRow, mapping.isUrgent)) ?? false;
      const externalSourceId = this.clipOrUndefined(
        this.toText(this.pick(rawRow, mapping.externalSourceId)),
        255,
      );

      const dedupKeys = this.compact([
        phoneNormalized ? `phone:${phoneNormalized}` : '',
        companyNormalized ? `company:${companyNormalized}` : '',
        externalSourceId ? `external:${externalSourceId.toLowerCase()}` : '',
      ]);

      return {
        rowNumber,
        errors,
        duplicateHints: [],
        existingIds: [],
        dedupKeys,
        transformed: {
          contactName: contactName || null,
          contactPhone: phoneNormalized || null,
          contactCompany: companyNormalized || null,
          requestedDate: requestedDateResult.value ?? null,
          source: sourceResult.value ?? 'manual',
          isUrgent,
          externalSourceId: externalSourceId ?? null,
        },
        mapped: {
          contactName,
          contactPhone,
          contactCompany,
          equipmentTypeHint,
          requestedDate: requestedDateResult.value,
          timeWindow,
          address,
          comment,
          source: sourceResult.value,
          isUrgent,
          externalSourceId,
          phoneNormalized,
          companyNormalized,
        },
      };
    });

    this.addInFileDuplicateHints(rows);
    await this.addExistingLeadDuplicateHints(rows);

    return {
      headers,
      mapping,
      requiredFields: REQUIRED_FIELDS.lead,
      summary: this.summarize(rows),
      rows,
    };
  }

  private async prepareClientRows(
    dto: ImportPreviewDto,
  ): Promise<PreparedResult<PreparedClientRow>> {
    const headers = this.collectHeaders(dto.rows);
    const mapping = this.buildMapping('client', headers, dto.mapping);

    const rows: PreparedClientRow[] = dto.rows.map((rawRow, idx) => {
      const rowNumber = idx + 1;
      const errors: string[] = [];

      const name = this.clip(this.toText(this.pick(rawRow, mapping.name)) ?? '', 200);
      const phoneRaw = this.toText(this.pick(rawRow, mapping.phone)) ?? '';
      const phone = this.clip(phoneRaw, 64);
      const phoneNormalized = normalizePhone(phoneRaw);

      if (!name || name.length < 2) {
        errors.push('Не заполнено поле Имя');
      }
      if (!phoneNormalized) {
        errors.push('Не заполнено поле Телефон');
      }

      const company = this.clipOrUndefined(this.toText(this.pick(rawRow, mapping.company)), 200);
      const companyNormalized = normalizeCompany(company);

      const email = this.clipOrUndefined(this.toText(this.pick(rawRow, mapping.email)), 320);
      if (email && !this.isEmail(email)) {
        errors.push('Некорректный email');
      }

      const notes = this.clipOrUndefined(this.toText(this.pick(rawRow, mapping.notes)), 1000);
      const externalSourceId = this.clipOrUndefined(
        this.toText(this.pick(rawRow, mapping.externalSourceId)),
        255,
      );

      const dedupKeys = this.compact([
        phoneNormalized ? `phone:${phoneNormalized}` : '',
        companyNormalized ? `company:${companyNormalized}` : '',
        externalSourceId ? `external:${externalSourceId.toLowerCase()}` : '',
      ]);

      return {
        rowNumber,
        errors,
        duplicateHints: [],
        existingIds: [],
        dedupKeys,
        transformed: {
          name: name || null,
          phone: phoneNormalized || null,
          company: companyNormalized || null,
          email: email ?? null,
          externalSourceId: externalSourceId ?? null,
        },
        mapped: {
          name,
          phone,
          company,
          email,
          notes,
          externalSourceId,
          phoneNormalized,
          companyNormalized,
        },
      };
    });

    this.addInFileDuplicateHints(rows);
    await this.addExistingClientDuplicateHints(rows);

    return {
      headers,
      mapping,
      requiredFields: REQUIRED_FIELDS.client,
      summary: this.summarize(rows),
      rows,
    };
  }

  private addInFileDuplicateHints(rows: PreparedRowBase[]) {
    const counts = new Map<string, number>();
    for (const row of rows) {
      for (const key of row.dedupKeys) {
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
    }

    for (const row of rows) {
      for (const key of row.dedupKeys) {
        if ((counts.get(key) ?? 0) <= 1) continue;
        if (key.startsWith('phone:')) {
          row.duplicateHints.push('Повтор в файле по телефону');
        } else if (key.startsWith('company:')) {
          row.duplicateHints.push('Повтор в файле по компании');
        } else if (key.startsWith('external:')) {
          row.duplicateHints.push('Повтор в файле по внешнему ID');
        }
      }
      row.duplicateHints = this.unique(row.duplicateHints);
    }
  }

  private async addExistingLeadDuplicateHints(rows: PreparedLeadRow[]) {
    const phones = this.unique(
      rows
        .map((row) => row.mapped.phoneNormalized)
        .filter((value): value is string => Boolean(value)),
    );
    const companies = this.unique(
      rows
        .map((row) => row.mapped.companyNormalized)
        .filter((value): value is string => Boolean(value)),
    );

    const byPhone = new Map<string, string[]>();
    const byCompany = new Map<string, string[]>();

    if (phones.length > 0) {
      const existingByPhone = await this.prisma.lead.findMany({
        where: {
          phoneNormalized: {
            in: phones,
          },
        },
        select: {
          id: true,
          phoneNormalized: true,
          contactCompany: true,
        },
      });
      for (const item of existingByPhone) {
        this.pushMapValue(byPhone, item.phoneNormalized, item.id);
        this.pushMapValue(byCompany, normalizeCompany(item.contactCompany), item.id);
      }
    }

    if (companies.length > 0) {
      for (const chunk of this.chunk(companies, 100)) {
        const existingByCompany = await this.prisma.lead.findMany({
          where: {
            OR: chunk.map((company) => ({
              contactCompany: {
                equals: company,
                mode: 'insensitive',
              },
            })),
          },
          select: {
            id: true,
            phoneNormalized: true,
            contactCompany: true,
          },
        });

        for (const item of existingByCompany) {
          this.pushMapValue(byPhone, item.phoneNormalized, item.id);
          this.pushMapValue(byCompany, normalizeCompany(item.contactCompany), item.id);
        }
      }
    }

    for (const row of rows) {
      const foundIds = this.unique([
        ...(row.mapped.phoneNormalized ? byPhone.get(row.mapped.phoneNormalized) ?? [] : []),
        ...(row.mapped.companyNormalized ? byCompany.get(row.mapped.companyNormalized) ?? [] : []),
      ]);

      if (foundIds.length > 0) {
        row.existingIds = foundIds;
        if (row.mapped.phoneNormalized && (byPhone.get(row.mapped.phoneNormalized)?.length ?? 0) > 0) {
          row.duplicateHints.push('Совпадение в CRM по телефону');
        }
        if (row.mapped.companyNormalized && (byCompany.get(row.mapped.companyNormalized)?.length ?? 0) > 0) {
          row.duplicateHints.push('Совпадение в CRM по компании');
        }
      }

      row.duplicateHints = this.unique(row.duplicateHints);
    }
  }

  private async addExistingClientDuplicateHints(rows: PreparedClientRow[]) {
    const phones = this.unique(
      rows
        .map((row) => row.mapped.phoneNormalized)
        .filter((value): value is string => Boolean(value)),
    );
    const companies = this.unique(
      rows
        .map((row) => row.mapped.companyNormalized)
        .filter((value): value is string => Boolean(value)),
    );

    if (phones.length === 0 && companies.length === 0) return;

    const existing = await this.prisma.client.findMany({
      where: {
        OR: [
          ...(phones.length > 0
            ? [
                {
                  phoneNormalized: {
                    in: phones,
                  },
                },
              ]
            : []),
          ...(companies.length > 0
            ? [
                {
                  companyNormalized: {
                    in: companies,
                  },
                },
              ]
            : []),
        ],
      },
      select: {
        id: true,
        phoneNormalized: true,
        companyNormalized: true,
      },
    });

    const byPhone = new Map<string, string[]>();
    const byCompany = new Map<string, string[]>();
    for (const item of existing) {
      this.pushMapValue(byPhone, item.phoneNormalized, item.id);
      this.pushMapValue(byCompany, item.companyNormalized ?? '', item.id);
    }

    for (const row of rows) {
      const foundIds = this.unique([
        ...(row.mapped.phoneNormalized ? byPhone.get(row.mapped.phoneNormalized) ?? [] : []),
        ...(row.mapped.companyNormalized ? byCompany.get(row.mapped.companyNormalized) ?? [] : []),
      ]);

      if (foundIds.length > 0) {
        row.existingIds = foundIds;
        if (row.mapped.phoneNormalized && (byPhone.get(row.mapped.phoneNormalized)?.length ?? 0) > 0) {
          row.duplicateHints.push('Совпадение в CRM по телефону');
        }
        if (
          row.mapped.companyNormalized
          && (byCompany.get(row.mapped.companyNormalized)?.length ?? 0) > 0
        ) {
          row.duplicateHints.push('Совпадение в CRM по компании');
        }
      }

      row.duplicateHints = this.unique(row.duplicateHints);
    }
  }

  private summarize(rows: PreparedRowBase[]): ImportSummary {
    return {
      totalRows: rows.length,
      validRows: rows.filter((row) => row.errors.length === 0).length,
      errorRows: rows.filter((row) => row.errors.length > 0).length,
      potentialDuplicates: rows.filter((row) => row.duplicateHints.length > 0).length,
    };
  }

  private buildMapping(
    entityType: ImportEntityType,
    headers: string[],
    mapping?: Record<string, string>,
  ): Record<string, string> {
    const fields = entityType === 'lead' ? LEAD_IMPORT_FIELDS : CLIENT_IMPORT_FIELDS;
    const aliases = FIELD_ALIASES[entityType];

    return Object.fromEntries(
      fields.map((field) => {
        const mapped = mapping?.[field];
        if (mapped) {
          const resolved = this.resolveHeader(headers, mapped);
          if (resolved) return [field, resolved];
        }

        const candidates = aliases[field] ?? [field];
        for (const candidate of candidates) {
          const resolved = this.resolveHeader(headers, candidate);
          if (resolved) return [field, resolved];
        }

        return [field, ''];
      }),
    );
  }

  private resolveHeader(headers: string[], rawHeader: string): string | null {
    if (!rawHeader) return null;
    if (headers.includes(rawHeader)) return rawHeader;
    const normalized = this.normalizeHeader(rawHeader);
    return (
      headers.find((header) => this.normalizeHeader(header) === normalized)
      ?? null
    );
  }

  private collectHeaders(rows: Array<Record<string, unknown>>): string[] {
    const seen = new Set<string>();
    for (const row of rows) {
      for (const key of Object.keys(row)) {
        if (!seen.has(key)) seen.add(key);
      }
    }
    return [...seen];
  }

  private normalizeHeader(value: string): string {
    return value
      .trim()
      .toLowerCase()
      .replace(/[\s_-]+/g, '');
  }

  private pick(row: Record<string, unknown>, column: string): unknown {
    if (!column) return undefined;
    if (column in row) return row[column];
    const normalized = this.normalizeHeader(column);
    const foundKey = Object.keys(row).find(
      (key) => this.normalizeHeader(key) === normalized,
    );
    return foundKey ? row[foundKey] : undefined;
  }

  private parseDateIso(value: unknown): { value?: string; error?: string } {
    const asText = this.toText(value);
    if (!asText) return {};
    const ts = Date.parse(asText);
    if (Number.isNaN(ts)) {
      return {
        error: `Некорректная дата: ${asText}`,
      };
    }
    return {
      value: new Date(ts).toISOString(),
    };
  }

  private parseSource(value: unknown): { value?: SourceChannel; error?: string } {
    const raw = this.toText(value);
    if (!raw) return {};
    const normalized = raw.trim().toLowerCase();

    const mapped: Record<string, SourceChannel> = {
      site: 'site',
      mango: 'mango',
      telegram: 'telegram',
      max: 'max',
      manual: 'manual',
      other: 'other',
    };

    const source = mapped[normalized];
    if (!source) {
      return {
        error: `Некорректный канал: ${raw}`,
      };
    }

    return {
      value: source,
    };
  }

  private parseBoolean(value: unknown): boolean | undefined {
    if (typeof value === 'boolean') return value;
    const text = this.toText(value)?.toLowerCase();
    if (!text) return undefined;
    if (['1', 'true', 'yes', 'y'].includes(text)) return true;
    if (['0', 'false', 'no', 'n'].includes(text)) return false;
    return undefined;
  }

  private async createLeadFromImport(
    row: PreparedLeadData,
    actor: ActorContext,
    sourceLabel?: string,
  ): Promise<string> {
    const created = await this.leads.create(
      {
        contactName: row.contactName,
        contactPhone: row.contactPhone,
        contactCompany: row.contactCompany,
        equipmentTypeHint: row.equipmentTypeHint,
        requestedDate: row.requestedDate,
        timeWindow: row.timeWindow,
        address: row.address,
        comment: row.comment,
        source: row.source ?? 'manual',
        sourceLabel: sourceLabel ? `import:${sourceLabel}` : 'import:manual',
        isUrgent: row.isUrgent,
      },
      actor,
    );

    return created.lead.id;
  }

  private async updateLeadFromImport(
    leadId: string,
    row: PreparedLeadData,
    actor: ActorContext,
  ) {
    const patch: UpdateLeadDto = {
      contactName: row.contactName,
      contactPhone: row.contactPhone,
      contactCompany: row.contactCompany,
      equipmentTypeHint: row.equipmentTypeHint,
      requestedDate: row.requestedDate,
      timeWindow: row.timeWindow,
      address: row.address,
      comment: row.comment,
      isUrgent: row.isUrgent,
    };
    await this.leads.update(leadId, patch, actor);
  }

  private async createClientFromImport(row: PreparedClientData, actorId: string): Promise<string> {
    const created = await this.clients.create(
      {
        name: row.name,
        phone: row.phone,
        company: row.company,
        email: row.email,
        notes: row.notes,
      },
      actorId,
    );
    return created.id;
  }

  private async updateClientFromImport(
    clientId: string,
    row: PreparedClientData,
    actorId: string,
  ) {
    const patch: UpdateClientDto = {
      name: row.name,
      phone: row.phone,
      company: row.company,
      email: row.email,
      notes: row.notes,
    };
    await this.clients.update(clientId, patch, actorId);
  }

  private buildSummaryText(
    entityType: ImportEntityType,
    created: number,
    updated: number,
    skipped: number,
    failed: number,
  ): string {
    const label = entityType === 'lead' ? 'лидов' : 'клиентов';
    return `Импорт ${label}: создано ${created}, обновлено ${updated}, пропущено ${skipped}, ошибок ${failed}.`;
  }

  private toIssueCsv(issues: ImportIssue[]): string {
    const lines = ['rowNumber,status,reason'];
    for (const issue of issues) {
      lines.push([
        String(issue.rowNumber),
        issue.status,
        this.escapeCsv(issue.reason),
      ].join(','));
    }
    return lines.join('\n');
  }

  private escapeCsv(value: string): string {
    const escaped = value.replace(/"/g, '""');
    return `"${escaped}"`;
  }

  private generateImportId(): string {
    const random = Math.random().toString(36).slice(2, 8).toUpperCase();
    return `IMP-${Date.now().toString(36).toUpperCase()}-${random}`;
  }

  private pushMapValue(map: Map<string, string[]>, key: string, value: string) {
    if (!key) return;
    const existing = map.get(key);
    if (!existing) {
      map.set(key, [value]);
      return;
    }
    if (!existing.includes(value)) existing.push(value);
  }

  private findSeenDuplicate(seen: Map<string, string>, keys: string[]): string | null {
    for (const key of keys) {
      const id = seen.get(key);
      if (id) return id;
    }
    return null;
  }

  private markSeen(seen: Map<string, string>, keys: string[], entityId: string) {
    for (const key of keys) {
      seen.set(key, entityId);
    }
  }

  private chunk<T>(values: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < values.length; i += size) {
      chunks.push(values.slice(i, i + size));
    }
    return chunks;
  }

  private clip(value: string, maxLength: number): string {
    return value.trim().slice(0, maxLength);
  }

  private clipOrUndefined(value: string | undefined, maxLength: number): string | undefined {
    if (!value) return undefined;
    return this.clip(value, maxLength);
  }

  private toText(value: unknown): string | undefined {
    if (value === null || value === undefined) return undefined;
    if (typeof value === 'string') return value.trim();
    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value).trim();
    }
    return undefined;
  }

  private asRecord(value: unknown): Record<string, unknown> | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    return value as Record<string, unknown>;
  }

  private compact(values: string[]): string[] {
    return values.filter((value) => value.length > 0);
  }

  private unique(values: string[]): string[] {
    return [...new Set(values.filter(Boolean))];
  }

  private isEmail(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  private stringifyError(error: unknown): string {
    if (error instanceof Error) return error.message;
    return 'Неизвестная ошибка импорта';
  }

  private computeRowsFingerprint(rows: Array<Record<string, unknown>>): string {
    const normalized = rows.map((row) =>
      Object.fromEntries(
        Object.entries(row)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([key, value]) => [key, this.toText(value) ?? String(value ?? '')]),
      ),
    );

    const source = JSON.stringify(normalized);
    return createHash('sha256').update(source).digest('hex');
  }

  private asStringArray(value: unknown): string[] {
    if (!Array.isArray(value)) return [];
    return value
      .map((item) => this.toText(item))
      .filter((item): item is string => Boolean(item));
  }

  private asStringMap(value: unknown): Record<string, string> {
    const record = this.asRecord(value);
    if (!record) return {};

    return Object.fromEntries(
      Object.entries(record)
        .map(([key, val]) => [key, this.toText(val) ?? ''])
        .filter(([key]) => key.length > 0),
    );
  }

  private asIssues(value: unknown): ImportIssue[] {
    if (!Array.isArray(value)) return [];

    return value
      .map((item) => {
        const row = this.asRecord(item);
        if (!row) return null;
        const rowNumber = this.toNumber(row.rowNumber);
        const statusRaw = this.toText(row.status);
        const reason = this.toText(row.reason) ?? '';
        const status = statusRaw === 'failed' ? 'failed' : statusRaw === 'skipped' ? 'skipped' : null;
        if (!status || rowNumber <= 0) return null;
        return { rowNumber, status, reason } satisfies ImportIssue;
      })
      .filter((item): item is ImportIssue => Boolean(item));
  }

  private toNumber(value: unknown): number {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    const fromText = this.toText(value);
    if (!fromText) return 0;
    const parsed = Number(fromText);
    if (!Number.isFinite(parsed)) return 0;
    return parsed;
  }

  private toBoolean(value: unknown): boolean {
    if (typeof value === 'boolean') return value;
    const fromText = this.toText(value)?.toLowerCase();
    if (!fromText) return false;
    return fromText === 'true' || fromText === '1' || fromText === 'yes';
  }
}
