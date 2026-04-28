import { apiRequest } from './apiClient';

export type ImportEntityType = 'lead' | 'client';
export type ImportDedupPolicy = 'skip' | 'update';

export interface ImportPreviewRowApi {
  rowNumber: number;
  status: 'valid' | 'duplicate' | 'error';
  errors: string[];
  duplicateHints: string[];
  existingIds: string[];
  transformed: Record<string, string | boolean | null>;
}

export interface ImportPreviewResponseApi {
  entityType: ImportEntityType;
  headers: string[];
  mapping: Record<string, string>;
  requiredFields: string[];
  summary: {
    totalRows: number;
    validRows: number;
    errorRows: number;
    potentialDuplicates: number;
  };
  rows: ImportPreviewRowApi[];
}

export interface ImportRunResponseApi {
  importId: string;
  activityId: string;
  entityType: ImportEntityType;
  fileName: string | null;
  dedupPolicy: ImportDedupPolicy;
  rowsFingerprint?: string | null;
  mapping: Record<string, string>;
  summary: {
    totalRows: number;
    validRows: number;
    errorRows: number;
    potentialDuplicates: number;
    created: number;
    updated: number;
    imported: number;
    skipped: number;
    failed: number;
  };
  issues: Array<{
    rowNumber: number;
    status: 'skipped' | 'failed';
    reason: string;
  }>;
  errorReportCsv: string | null;
}

export interface ImportReportResponseApi extends ImportRunResponseApi {
  createdAt: string;
  actor: {
    id: string;
    fullName: string;
    email: string;
  } | null;
  source: string | null;
  headers: string[];
  requiredFields: string[];
}

export interface ImportPreviewRequestApi {
  entityType: ImportEntityType;
  fileName?: string;
  sourceLabel?: string;
  rows: Array<Record<string, unknown>>;
  mapping?: Record<string, string>;
}

export interface ImportRunRequestApi extends ImportPreviewRequestApi {
  dedupPolicy?: ImportDedupPolicy;
}

export function previewImport(payload: ImportPreviewRequestApi) {
  return apiRequest<ImportPreviewResponseApi>('imports/preview', {
    method: 'POST',
    body: payload,
  });
}

export function runImport(payload: ImportRunRequestApi) {
  return apiRequest<ImportRunResponseApi>('imports/run', {
    method: 'POST',
    body: payload,
  });
}

export function getImportReport(importId: string) {
  return apiRequest<ImportReportResponseApi>(`imports/${importId}/report`);
}
