import { type ChangeEvent, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  Bell,
  Building2,
  Check,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Loader2,
  Play,
  Plus,
  Settings as SettingsIcon,
  Shield,
  Upload,
  Users as UsersIcon,
  Workflow,
  X,
} from 'lucide-react';
import { useLayout } from '../shell/layoutStore';
import { getModuleMeta } from '../shell/navConfig';
import { ListScaffold } from '../shell/ListScaffold';
import { SimpleToolbar } from '../shell/SimpleToolbar';
import { Button } from '../ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { DashboardPage, CompactPageHeader, WidgetCard } from '../shell/dashboard';
import { IntegrationsWorkspacePage } from '../integrations/IntegrationsWorkspacePage';
import { useActivitySearchQuery } from '../../hooks/useActivityQuery';
import { useImportPreviewMutation, useRunImportMutation } from '../../hooks/useImportMutations';
import { useUpdateWorkspaceSection } from '../../hooks/useSettingsMutations';
import { useWorkspaceSettingsQuery } from '../../hooks/useSettingsQuery';
import { usePermissionsMatrixQuery, useUsersQuery } from '../../hooks/useUsersQuery';
import {
  useCreateUser,
  useUpdatePermissionCapability,
  useUpdateUser,
} from '../../hooks/useUserMutations';
import { USE_API } from '../../lib/featureFlags';
import type { ActivityLogEntryApi } from '../../lib/activityApi';
import type {
  ImportDedupPolicy,
  ImportEntityType,
  ImportPreviewResponseApi,
  ImportRunResponseApi,
} from '../../lib/importsApi';
import type { UserRole } from '../../lib/usersApi';

export function AdminWorkspacePage() {
  const { activeSecondaryNav } = useLayout();
  if (activeSecondaryNav === 'imports') return <ImportsPage />;
  if (activeSecondaryNav === 'integrations') return <IntegrationsWorkspacePage />;
  if (activeSecondaryNav === 'settings') return <SettingsPage />;
  if (activeSecondaryNav === 'users') return <UsersPage />;
  if (activeSecondaryNav === 'permissions') return <PermissionsPage />;
  return <ImportsPage />;
}

type ImportLogStatus = 'success' | 'partial' | 'error';
type ImportPeriod = 'all' | '7d' | '30d' | '90d';

interface ImportLogRow {
  id: string;
  createdAt: string;
  entityType: string;
  entityId: string;
  actor: string;
  source: string;
  imported: number | null;
  duplicates: number | null;
  errors: number | null;
  status: ImportLogStatus;
  summary: string;
}

const ENTITY_LABEL: Record<string, string> = {
  lead: 'Лид',
  application: 'Заявка',
  application_item: 'Позиция',
  client: 'Клиент',
  reservation: 'Бронь',
  departure: 'Выезд',
  completion: 'Завершение',
};

const ENTITY_PREFIX: Record<string, string> = {
  lead: 'LEAD',
  application: 'APP',
  application_item: 'ITEM',
  client: 'CL',
  reservation: 'RSV',
  departure: 'DEP',
  completion: 'CMP',
};

const FALLBACK_IMPORT_LOG: ImportLogRow[] = [
  {
    id: 'IMP-001',
    createdAt: '2026-04-20T14:32:00.000Z',
    entityType: 'lead',
    entityId: 'mock-lead-001',
    actor: 'Admin',
    source: 'leads-2024-q1.csv',
    imported: 124,
    duplicates: 3,
    errors: 0,
    status: 'success',
    summary: 'Импорт лидов выполнен успешно.',
  },
  {
    id: 'IMP-002',
    createdAt: '2026-04-18T10:05:00.000Z',
    entityType: 'client',
    entityId: 'mock-client-002',
    actor: 'Admin',
    source: 'clients-crm-legacy.xlsx',
    imported: 412,
    duplicates: 14,
    errors: 0,
    status: 'partial',
    summary: 'Импорт клиентов завершён с дублями.',
  },
  {
    id: 'IMP-003',
    createdAt: '2026-04-15T18:40:00.000Z',
    entityType: 'reservation',
    entityId: 'mock-reservation-003',
    actor: 'Admin',
    source: 'reservations-history.csv',
    imported: 96,
    duplicates: 0,
    errors: 2,
    status: 'partial',
    summary: 'Импорт броней завершён частично: 2 ошибки.',
  },
  {
    id: 'IMP-004',
    createdAt: '2026-04-10T12:20:00.000Z',
    entityType: 'application',
    entityId: 'mock-application-004',
    actor: 'Admin',
    source: 'applications-bad-format.csv',
    imported: 0,
    duplicates: 0,
    errors: 98,
    status: 'error',
    summary: 'Импорт остановлен: ошибки в формате колонок.',
  },
];

const IMPORT_FIELD_CONFIG: Record<
  ImportEntityType,
  Array<{ id: string; label: string; required?: boolean }>
> = {
  lead: [
    { id: 'contactName', label: 'Имя контакта', required: true },
    { id: 'contactPhone', label: 'Телефон', required: true },
    { id: 'contactCompany', label: 'Компания' },
    { id: 'equipmentTypeHint', label: 'Тип техники' },
    { id: 'requestedDate', label: 'Дата заявки' },
    { id: 'timeWindow', label: 'Окно времени' },
    { id: 'address', label: 'Адрес' },
    { id: 'comment', label: 'Комментарий' },
    { id: 'source', label: 'Канал' },
    { id: 'isUrgent', label: 'Срочно' },
    { id: 'externalSourceId', label: 'Внешний ID' },
  ],
  client: [
    { id: 'name', label: 'Имя', required: true },
    { id: 'phone', label: 'Телефон', required: true },
    { id: 'company', label: 'Компания' },
    { id: 'email', label: 'Email' },
    { id: 'notes', label: 'Заметки' },
    { id: 'externalSourceId', label: 'Внешний ID' },
  ],
};

const UNMAPPED_VALUE = '__unmapped__';

function detectDelimiter(line: string): ',' | ';' | '\t' {
  const variants: Array<',' | ';' | '\t'> = [',', ';', '\t'];
  let best: ',' | ';' | '\t' = ',';
  let bestScore = -1;

  for (const variant of variants) {
    const score = line.split(variant).length;
    if (score > bestScore) {
      best = variant;
      bestScore = score;
    }
  }

  return best;
}

function parseDelimitedTable(text: string, delimiter: ',' | ';' | '\t'): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];

    if (ch === '"') {
      if (inQuotes && text[i + 1] === '"') {
        cell += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (!inQuotes && ch === delimiter) {
      row.push(cell);
      cell = '';
      continue;
    }

    if (!inQuotes && (ch === '\n' || ch === '\r')) {
      if (ch === '\r' && text[i + 1] === '\n') i += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
      continue;
    }

    cell += ch;
  }

  row.push(cell);
  if (row.length > 1 || row[0].trim() !== '') rows.push(row);

  return rows;
}

function normalizeHeaderName(value: string): string {
  return value.trim().toLowerCase().replace(/[\s_-]+/g, '');
}

function parseImportFile(text: string): {
  headers: string[];
  rows: Array<Record<string, string>>;
} {
  const clean = text.replace(/^\uFEFF/, '');
  const firstLine = clean.split(/\r?\n/, 1)[0] ?? '';
  const delimiter = detectDelimiter(firstLine);
  const matrix = parseDelimitedTable(clean, delimiter).filter((line) =>
    line.some((cell) => cell.trim().length > 0),
  );

  if (matrix.length < 2) {
    throw new Error('Файл должен содержать заголовок и минимум одну строку данных.');
  }

  const rawHeaders = matrix[0].map((cell, index) => {
    const normalized = cell.trim();
    return normalized.length > 0 ? normalized : `column_${index + 1}`;
  });

  const used = new Map<string, number>();
  const headers = rawHeaders.map((header) => {
    const key = normalizeHeaderName(header);
    const current = used.get(key) ?? 0;
    used.set(key, current + 1);
    if (current === 0) return header;
    return `${header}_${current + 1}`;
  });

  const rows = matrix
    .slice(1)
    .map((line) => {
      const row: Record<string, string> = {};
      headers.forEach((header, index) => {
        row[header] = (line[index] ?? '').trim();
      });
      return row;
    })
    .filter((row) => Object.values(row).some((value) => value.length > 0));

  if (rows.length === 0) {
    throw new Error('В файле нет непустых строк данных.');
  }

  return { headers, rows };
}

function downloadTextFile(fileName: string, content: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function asObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function readNumber(payload: Record<string, unknown> | null, keys: string[]): number | null {
  if (!payload) return null;
  for (const key of keys) {
    const raw = payload[key];
    if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
    if (typeof raw === 'string') {
      const n = Number(raw);
      if (Number.isFinite(n)) return n;
    }
  }
  return null;
}

function readString(payload: Record<string, unknown> | null, keys: string[]): string | null {
  if (!payload) return null;
  for (const key of keys) {
    const raw = payload[key];
    if (typeof raw === 'string' && raw.trim().length > 0) return raw.trim();
  }
  return null;
}

function resolveImportStatus(
  entry: ActivityLogEntryApi,
  payload: Record<string, unknown> | null,
  imported: number | null,
  duplicates: number | null,
  errors: number | null,
): ImportLogStatus {
  const summary = entry.summary.toLowerCase();
  const status = readString(payload, ['status', 'result'])?.toLowerCase();

  if (status && (status.includes('error') || status.includes('fail'))) return 'error';
  if (summary.includes('ошиб') || summary.includes('error')) {
    if (!imported || imported === 0) return 'error';
  }
  if (status && (status.includes('partial') || status.includes('warn'))) return 'partial';
  if ((errors ?? 0) > 0 || (duplicates ?? 0) > 0 || summary.includes('частич')) return 'partial';
  return 'success';
}

function mapActivityToImportLogRow(entry: ActivityLogEntryApi): ImportLogRow {
  const payload = asObject(entry.payload);
  const imported = readNumber(payload, ['imported', 'importedCount', 'created', 'createdCount', 'rowsImported', 'successCount']);
  const duplicates = readNumber(payload, ['duplicates', 'duplicateCount', 'duplicateRows']);
  const errors = readNumber(payload, ['errors', 'errorCount', 'failed', 'failedCount', 'errorRows']);
  const source = readString(payload, ['fileName', 'filename', 'file', 'source']) ?? '—';

  return {
    id: entry.id,
    createdAt: entry.createdAt,
    entityType: entry.entityType,
    entityId: entry.entityId,
    actor: entry.actor?.fullName ?? 'Система',
    source,
    imported,
    duplicates,
    errors,
    status: resolveImportStatus(entry, payload, imported, duplicates, errors),
    summary: entry.summary,
  };
}

function formatDateTime(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString('ru-RU', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function periodToFromIso(period: ImportPeriod): string | undefined {
  if (period === 'all') return undefined;
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  if (period === '7d') return new Date(now - 7 * dayMs).toISOString();
  if (period === '30d') return new Date(now - 30 * dayMs).toISOString();
  return new Date(now - 90 * dayMs).toISOString();
}

function isWithinPeriod(value: string, period: ImportPeriod): boolean {
  if (period === 'all') return true;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  const from = periodToFromIso(period);
  if (!from) return true;
  return date.getTime() >= new Date(from).getTime();
}

function formatEntityRef(entityType: string, entityId: string): string {
  const prefix = ENTITY_PREFIX[entityType] ?? entityType.slice(0, 4).toUpperCase();
  const suffix = entityId.slice(-6).toUpperCase();
  return `${prefix}-${suffix}`;
}

function ImportsPage() {
  const meta = getModuleMeta('imports');
  const [query, setQuery] = useState('');
  const [logEntityType, setLogEntityType] = useState('all');
  const [status, setStatus] = useState<'all' | ImportLogStatus>('all');
  const [period, setPeriod] = useState<ImportPeriod>('30d');
  const [importEntityType, setImportEntityType] = useState<ImportEntityType>('lead');
  const [dedupPolicy, setDedupPolicy] = useState<ImportDedupPolicy>('skip');
  const [fileName, setFileName] = useState('');
  const [headers, setHeaders] = useState<string[]>([]);
  const [importRows, setImportRows] = useState<Array<Record<string, string>>>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [previewData, setPreviewData] = useState<ImportPreviewResponseApi | null>(null);
  const [runResult, setRunResult] = useState<ImportRunResponseApi | null>(null);
  const [wizardError, setWizardError] = useState<string | null>(null);
  const [wizardSuccess, setWizardSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const previewMutation = useImportPreviewMutation();
  const runMutation = useRunImportMutation();

  const fromIso = useMemo(() => periodToFromIso(period), [period]);
  const importLogQuery = useActivitySearchQuery(
    {
      action: 'imported',
      entityType: USE_API && logEntityType !== 'all' ? logEntityType : undefined,
      query: USE_API ? query.trim() || undefined : undefined,
      from: USE_API ? fromIso : undefined,
      take: 300,
      skip: 0,
    },
    USE_API,
  );

  const sourceRows = useMemo(() => {
    if (!USE_API) return FALLBACK_IMPORT_LOG;
    return (importLogQuery.data?.items ?? []).map(mapActivityToImportLogRow);
  }, [importLogQuery.data?.items]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sourceRows.filter((row) => {
      if (!USE_API && logEntityType !== 'all' && row.entityType !== logEntityType) return false;
      if (!USE_API && !isWithinPeriod(row.createdAt, period)) return false;
      if (status !== 'all' && row.status !== status) return false;
      if (!q) return true;
      return `${row.id} ${row.summary} ${row.actor} ${row.source} ${row.entityType} ${row.entityId}`
        .toLowerCase()
        .includes(q);
    });
  }, [logEntityType, period, query, sourceRows, status]);

  const fieldConfig = IMPORT_FIELD_CONFIG[importEntityType];
  const activeHeaders = previewData?.headers ?? headers;
  const mappingFields = previewData
    ? Object.keys(previewData.mapping)
    : fieldConfig.map((field) => field.id);
  const requiredFields = previewData?.requiredFields
    ?? fieldConfig.filter((field) => field.required).map((field) => field.id);
  const unresolvedRequired = requiredFields.filter((fieldId) => !mapping[fieldId]);
  const unresolvedRequiredLabels = unresolvedRequired.map(
    (fieldId) => fieldConfig.find((field) => field.id === fieldId)?.label ?? fieldId,
  );

  const runPreview = async (nextMapping?: Record<string, string>) => {
    if (!USE_API) {
      setWizardError('Импорт доступен только при включённом API режиме (VITE_USE_API=true).');
      return;
    }

    if (importRows.length === 0) {
      setWizardError('Загрузите CSV-файл перед предпросмотром.');
      return;
    }

    try {
      setWizardError(null);
      setWizardSuccess(null);
      const result = await previewMutation.mutateAsync({
        entityType: importEntityType,
        fileName: fileName || undefined,
        rows: importRows,
        mapping: nextMapping ?? mapping,
      });
      setPreviewData(result);
      setMapping(result.mapping);
      setRunResult(null);
      setWizardSuccess(
        `Предпросмотр готов: ${result.summary.validRows}/${result.summary.totalRows} валидных строк.`,
      );
    } catch (error) {
      setWizardError(
        error instanceof Error
          ? error.message
          : 'Не удалось построить предпросмотр импорта.',
      );
    }
  };

  const handleMappingChange = (fieldId: string, column: string) => {
    setMapping((prev) => ({
      ...prev,
      [fieldId]: column,
    }));
  };

  const handleEntityChange = (value: ImportEntityType) => {
    setImportEntityType(value);
    setPreviewData(null);
    setRunResult(null);
    setMapping({});
    setWizardSuccess(null);
    setWizardError(null);
  };

  const handleFileSelect = async (event: ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0];
    if (!selected) return;

    try {
      const raw = await selected.text();
      const parsed = parseImportFile(raw);
      setFileName(selected.name);
      setHeaders(parsed.headers);
      setImportRows(parsed.rows);
      setPreviewData(null);
      setRunResult(null);
      setMapping({});
      setWizardError(null);
      setWizardSuccess(`Файл загружен: ${parsed.rows.length} строк.`);
    } catch (error) {
      setFileName(selected.name);
      setHeaders([]);
      setImportRows([]);
      setPreviewData(null);
      setRunResult(null);
      setMapping({});
      setWizardSuccess(null);
      setWizardError(
        error instanceof Error ? error.message : 'Не удалось прочитать CSV-файл.',
      );
    } finally {
      event.target.value = '';
    }
  };

  const handleRunImport = async () => {
    if (!USE_API) {
      setWizardError('Импорт доступен только при включённом API режиме (VITE_USE_API=true).');
      return;
    }

    if (importRows.length === 0) {
      setWizardError('Загрузите CSV-файл перед запуском импорта.');
      return;
    }

    try {
      setWizardError(null);
      setWizardSuccess(null);
      const result = await runMutation.mutateAsync({
        entityType: importEntityType,
        fileName: fileName || undefined,
        rows: importRows,
        mapping,
        dedupPolicy,
      });
      setRunResult(result);
      setWizardSuccess(
        `Импорт завершён: импортировано ${result.summary.imported}, ошибок ${result.summary.failed}.`,
      );
      void importLogQuery.refetch();
    } catch (error) {
      setWizardError(
        error instanceof Error ? error.message : 'Не удалось выполнить импорт.',
      );
    }
  };

  const downloadErrorReport = () => {
    if (!runResult?.errorReportCsv) return;
    downloadTextFile(`import-report-${runResult.importId}.csv`, runResult.errorReportCsv);
  };

  const toolbar = (
    <SimpleToolbar
      searchPlaceholder={meta.searchPlaceholder}
      query={query}
      onQueryChange={setQuery}
      filters={[
        {
          id: 'entityType',
          value: logEntityType,
          placeholder: 'Объект',
          width: 150,
          options: [
            { value: 'all', label: 'Все объекты' },
            { value: 'lead', label: ENTITY_LABEL.lead },
            { value: 'application', label: ENTITY_LABEL.application },
            { value: 'client', label: ENTITY_LABEL.client },
            { value: 'reservation', label: ENTITY_LABEL.reservation },
            { value: 'departure', label: ENTITY_LABEL.departure },
          ],
          onChange: setLogEntityType,
        },
        {
          id: 'status',
          value: status,
          placeholder: 'Статус',
          width: 130,
          options: [
            { value: 'all', label: 'Все статусы' },
            { value: 'success', label: 'Успешно' },
            { value: 'partial', label: 'Частично' },
            { value: 'error', label: 'Ошибка' },
          ],
          onChange: (value) => setStatus(value as 'all' | ImportLogStatus),
        },
        {
          id: 'period',
          value: period,
          placeholder: 'Период',
          width: 130,
          options: [
            { value: 'all', label: 'Всё время' },
            { value: '7d', label: '7 дней' },
            { value: '30d', label: '30 дней' },
            { value: '90d', label: '90 дней' },
          ],
          onChange: (value) => setPeriod(value as ImportPeriod),
        },
      ]}
      hasActive={query.length > 0 || logEntityType !== 'all' || status !== 'all' || period !== '30d'}
      onReset={() => {
        setQuery('');
        setLogEntityType('all');
        setStatus('all');
        setPeriod('30d');
      }}
    />
  );

  return (
    <ListScaffold toolbar={toolbar}>
      <div className="flex min-h-0 flex-1 flex-col overflow-auto">
        <section className="border-b border-border/60 bg-muted/20 p-4">
          <div className="space-y-3 rounded border border-border/60 bg-white p-3">
            <div className="flex flex-wrap items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv,.txt"
                className="hidden"
                onChange={(event) => {
                  void handleFileSelect(event);
                }}
              />
              <Button
                size="sm"
                variant="outline"
                className="h-8 gap-1"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-3.5 w-3.5" /> Загрузить CSV
              </Button>
              <div className="inline-flex h-8 items-center rounded border border-border/60 bg-white px-2 text-[11px] text-muted-foreground">
                Файл: {fileName || 'не выбран'}
              </div>
              <div className="inline-flex h-8 items-center rounded border border-border/60 bg-white px-2 text-[11px] text-muted-foreground">
                Строк: {importRows.length}
              </div>
            </div>

            {!USE_API ? (
              <div className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-amber-800">
                API режим выключен. Импорт в mock-режиме недоступен. Включите VITE_USE_API=true.
              </div>
            ) : null}

            <div className="grid gap-2 md:grid-cols-4">
              <label className="space-y-1">
                <span className="text-[11px] text-muted-foreground">Импортируемая сущность</span>
                <Select
                  value={importEntityType}
                  onValueChange={(value) => handleEntityChange(value as ImportEntityType)}
                >
                  <SelectTrigger size="sm" className="text-[12px]">
                    <SelectValue placeholder="Выберите сущность" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lead">Лиды</SelectItem>
                    <SelectItem value="client">Клиенты</SelectItem>
                  </SelectContent>
                </Select>
              </label>

              <label className="space-y-1">
                <span className="text-[11px] text-muted-foreground">Политика дедупликации</span>
                <Select
                  value={dedupPolicy}
                  onValueChange={(value) => setDedupPolicy(value as ImportDedupPolicy)}
                >
                  <SelectTrigger size="sm" className="text-[12px]">
                    <SelectValue placeholder="Выберите политику" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="skip">Пропускать дубли</SelectItem>
                    <SelectItem value="update">Обновлять дубль</SelectItem>
                  </SelectContent>
                </Select>
              </label>

              <div className="flex items-end">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 w-full gap-1"
                  onClick={() => {
                    void runPreview();
                  }}
                  disabled={!USE_API || importRows.length === 0 || previewMutation.isPending}
                >
                  {previewMutation.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <FileSpreadsheet className="h-3.5 w-3.5" />
                  )}
                  Предпросмотр
                </Button>
              </div>

              <div className="flex items-end">
                <Button
                  size="sm"
                  className="h-8 w-full gap-1 bg-[#2a6af0] text-white hover:bg-[#2358d1]"
                  onClick={() => {
                    void handleRunImport();
                  }}
                  disabled={!USE_API || importRows.length === 0 || runMutation.isPending}
                >
                  {runMutation.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Play className="h-3.5 w-3.5" />
                  )}
                  Запустить импорт
                </Button>
              </div>
            </div>

            {unresolvedRequired.length > 0 ? (
              <div className="text-[11px] text-amber-700">
                Не замаплены обязательные поля: {unresolvedRequiredLabels.join(', ')}
              </div>
            ) : null}

            {wizardError ? (
              <div className="flex items-start gap-2 rounded border border-rose-200 bg-rose-50 px-3 py-2 text-[12px] text-rose-700">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5" />
                <span>{wizardError}</span>
              </div>
            ) : null}

            {wizardSuccess ? (
              <div className="flex items-start gap-2 rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-[12px] text-emerald-700">
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5" />
                <span>{wizardSuccess}</span>
              </div>
            ) : null}

            {activeHeaders.length > 0 ? (
              <div className="rounded border border-border/60">
                <div className="border-b border-border/60 bg-muted/20 px-3 py-2 text-[11px] uppercase tracking-wide text-muted-foreground">
                  Mapping колонок
                </div>
                <div className="grid gap-2 px-3 py-3 md:grid-cols-2 xl:grid-cols-3">
                  {mappingFields.map((fieldId) => {
                    const config = fieldConfig.find((entry) => entry.id === fieldId);
                    const label = config?.label ?? fieldId;
                    const required = requiredFields.includes(fieldId);
                    return (
                      <label key={fieldId} className="space-y-1">
                        <span className="text-[11px] text-muted-foreground">
                          {label}
                          {required ? ' *' : ''}
                        </span>
                        <Select
                          value={mapping[fieldId] || UNMAPPED_VALUE}
                          onValueChange={(value) =>
                            handleMappingChange(fieldId, value === UNMAPPED_VALUE ? '' : value)
                          }
                        >
                          <SelectTrigger size="sm" className="text-[12px]">
                            <SelectValue placeholder="— не маппить —" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={UNMAPPED_VALUE}>— не маппить —</SelectItem>
                            {activeHeaders.map((header) => (
                              <SelectItem key={header} value={header}>
                                {header}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </label>
                    );
                  })}
                </div>
                <div className="border-t border-border/60 px-3 py-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 gap-1"
                    onClick={() => {
                      void runPreview(mapping);
                    }}
                    disabled={!USE_API || importRows.length === 0 || previewMutation.isPending}
                  >
                    <FileSpreadsheet className="h-3.5 w-3.5" /> Обновить предпросмотр
                  </Button>
                </div>
              </div>
            ) : null}

            {previewData ? (
              <div className="space-y-2 rounded border border-border/60">
                <div className="border-b border-border/60 bg-muted/20 px-3 py-2 text-[11px] uppercase tracking-wide text-muted-foreground">
                  Итог предпросмотра
                </div>
                <div className="grid gap-2 px-3 py-2 md:grid-cols-4">
                  <StatChip label="Всего" value={String(previewData.summary.totalRows)} />
                  <StatChip label="Валидно" value={String(previewData.summary.validRows)} />
                  <StatChip label="Ошибки" value={String(previewData.summary.errorRows)} />
                  <StatChip
                    label="Потенц. дубли"
                    value={String(previewData.summary.potentialDuplicates)}
                  />
                </div>
                {previewData.rows.length > 0 ? (
                  <div className="overflow-auto border-t border-border/60">
                    <table className="w-full min-w-[920px] border-collapse text-[12px]">
                      <thead className="bg-white">
                        <tr className="border-b border-border/60 text-[11px] uppercase tracking-wide text-muted-foreground">
                          <th className="px-3 py-2 text-left font-medium">Строка</th>
                          <th className="px-3 py-2 text-left font-medium">Статус</th>
                          <th className="px-3 py-2 text-left font-medium">Ошибки</th>
                          <th className="px-3 py-2 text-left font-medium">Дубли</th>
                          <th className="px-3 py-2 text-left font-medium">Трансформация</th>
                        </tr>
                      </thead>
                      <tbody>
                        {previewData.rows.slice(0, 30).map((row) => (
                          <tr key={row.rowNumber} className="border-b border-border/40 align-top">
                            <td className="px-3 py-2.5 font-mono text-[11px] text-muted-foreground">
                              {row.rowNumber}
                            </td>
                            <td className="px-3 py-2.5">
                              <PreviewStatusPill status={row.status} />
                            </td>
                            <td className="px-3 py-2.5 text-[11px] text-rose-700">
                              {row.errors.length > 0 ? row.errors.join('; ') : '—'}
                            </td>
                            <td className="px-3 py-2.5 text-[11px] text-amber-700">
                              {row.duplicateHints.length > 0 ? row.duplicateHints.join('; ') : '—'}
                            </td>
                            <td className="px-3 py-2.5 text-[11px] text-foreground/80">
                              <pre className="max-h-20 overflow-auto whitespace-pre-wrap font-mono text-[10px]">
                                {JSON.stringify(row.transformed)}
                              </pre>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : null}
              </div>
            ) : null}

            {runResult ? (
              <div className="space-y-2 rounded border border-border/60 bg-[#f7fbff] px-3 py-2">
                <div className="text-[12px] font-medium text-foreground">Результат запуска</div>
                <div className="grid gap-2 md:grid-cols-4">
                  <StatChip label="Импорт" value={String(runResult.summary.imported)} />
                  <StatChip label="Создано" value={String(runResult.summary.created)} />
                  <StatChip label="Обновлено" value={String(runResult.summary.updated)} />
                  <StatChip label="Ошибки" value={String(runResult.summary.failed)} />
                </div>
                <div className="grid gap-2 md:grid-cols-3">
                  <StatChip label="Пропущено" value={String(runResult.summary.skipped)} />
                  <StatChip label="Дубликаты" value={String(runResult.summary.potentialDuplicates)} />
                  <StatChip label="ID импорта" value={runResult.importId} mono />
                </div>
                {runResult.errorReportCsv ? (
                  <div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 gap-1"
                      onClick={downloadErrorReport}
                    >
                      <Download className="h-3.5 w-3.5" /> Скачать отчёт ошибок
                    </Button>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </section>

        <div className="min-h-0 flex-1 overflow-auto">
          {USE_API && importLogQuery.isPending && !importLogQuery.data ? (
            <div className="flex h-full min-h-[260px] items-center justify-center gap-2 text-[13px] text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Загружаем журнал импорта...
            </div>
          ) : null}

          {USE_API && importLogQuery.isError && !importLogQuery.data ? (
            <div className="flex h-full min-h-[260px] items-center justify-center px-4 text-center text-[13px] text-muted-foreground">
              {importLogQuery.error instanceof Error
                ? importLogQuery.error.message
                : 'Не удалось загрузить журнал импорта.'}
            </div>
          ) : null}

          {!USE_API || importLogQuery.data || (!importLogQuery.isPending && !importLogQuery.isError) ? (
            <table className="w-full min-w-[1100px] border-collapse text-[12px]">
              <thead className="sticky top-0 z-10 bg-white">
                <tr className="border-b border-border/60 text-[11px] uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-2 text-left font-medium">ID</th>
                  <th className="px-3 py-2 text-left font-medium">Время</th>
                  <th className="px-3 py-2 text-left font-medium">Объект</th>
                  <th className="px-3 py-2 text-left font-medium">Источник</th>
                  <th className="px-3 py-2 text-right font-medium">Импорт</th>
                  <th className="px-3 py-2 text-right font-medium">Дубли</th>
                  <th className="px-3 py-2 text-right font-medium">Ошибки</th>
                  <th className="px-3 py-2 text-left font-medium">Статус</th>
                  <th className="px-3 py-2 text-left font-medium">Комментарий</th>
                  <th className="px-3 py-2 text-left font-medium">Автор</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-12 text-center text-muted-foreground">
                      Импорт-событий не найдено.
                    </td>
                  </tr>
                ) : (
                  filtered.map((row) => (
                    <tr key={row.id} className="border-b border-border/40 hover:bg-muted/30">
                      <td className="px-4 py-2.5 font-mono text-[11px] text-muted-foreground">
                        {row.id.slice(0, 8).toUpperCase()}
                      </td>
                      <td className="px-3 py-2.5 font-mono text-[11px] text-muted-foreground">
                        {formatDateTime(row.createdAt)}
                      </td>
                      <td className="px-3 py-2.5 text-foreground/80">
                        <div className="font-medium text-foreground">{ENTITY_LABEL[row.entityType] ?? row.entityType}</div>
                        <div className="font-mono text-[10px] text-muted-foreground">{formatEntityRef(row.entityType, row.entityId)}</div>
                      </td>
                      <td className="px-3 py-2.5 text-foreground/80">{row.source}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-foreground/80">{row.imported ?? '—'}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-foreground/80">{row.duplicates ?? '—'}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-foreground/80">{row.errors ?? '—'}</td>
                      <td className="px-3 py-2.5">
                        <ImportStatusPill status={row.status} />
                      </td>
                      <td className="max-w-[320px] px-3 py-2.5 text-foreground/80">{row.summary}</td>
                      <td className="px-3 py-2.5 text-foreground/80">{row.actor}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          ) : null}
        </div>
      </div>
    </ListScaffold>
  );
}

function StatChip({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="rounded border border-border/60 bg-white px-2.5 py-2 text-[11px]">
      <div className="text-muted-foreground">{label}</div>
      <div className={mono ? 'font-mono text-[11px] text-foreground' : 'text-[13px] font-medium text-foreground'}>
        {value}
      </div>
    </div>
  );
}

function PreviewStatusPill({ status }: { status: 'valid' | 'duplicate' | 'error' }) {
  const map = {
    valid: { label: 'Валидно', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    duplicate: { label: 'Дубль', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
    error: { label: 'Ошибка', cls: 'bg-rose-50 text-rose-700 border-rose-200' },
  } as const;

  const item = map[status];
  return <span className={`inline-flex rounded border px-1.5 py-0.5 text-[10px] ${item.cls}`}>{item.label}</span>;
}

function ImportStatusPill({ status }: { status: ImportLogStatus }) {
  const map = {
    success: { label: 'Успешно', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    partial: { label: 'Частично', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
    error: { label: 'Ошибка', cls: 'bg-rose-50 text-rose-700 border-rose-200' },
  } as const;
  const it = map[status];
  return <span className={`inline-flex rounded border px-1.5 py-0.5 text-[10px] ${it.cls}`}>{it.label}</span>;
}

function SettingsPage() {
  const FALLBACK_SECTIONS = [
    {
      id: 'company',
      title: 'Организация',
      description: 'Общая информация о компании',
      icon: <Building2 className="h-3.5 w-3.5" />,
      rows: [
        { label: 'Название', value: 'ООО «Катет»' },
        { label: 'ИНН / КПП', value: '7701234567 / 770101001' },
        { label: 'Юр. адрес', value: 'г. Москва, ул. Ленина, д. 1' },
        { label: 'Основной менеджер', value: 'Петров А.' },
      ],
    },
    {
      id: 'stages',
      title: 'Этапы воронки',
      description: 'Условия перехода между стадиями',
      icon: <Workflow className="h-3.5 w-3.5" />,
      rows: [
        { label: 'lead → application', value: 'Требуются: контакт, тип техники' },
        { label: 'application → reservation', value: 'Требуется: подтверждённая позиция' },
        { label: 'reservation → departure', value: 'Требуется: назначенная единица' },
        { label: 'departure → completed', value: 'Требуется: акт выполнения' },
      ],
    },
    {
      id: 'notifications',
      title: 'Уведомления',
      description: 'Каналы и события',
      icon: <Bell className="h-3.5 w-3.5" />,
      rows: [
        { label: 'Срочный лид', value: 'Email + в интерфейсе' },
        { label: 'Конфликт брони', value: 'В интерфейсе' },
        { label: 'Просроченный выезд', value: 'Email + SMS ответственному' },
      ],
    },
  ];

  const settingsQuery = useWorkspaceSettingsQuery(USE_API);
  const updateSectionMutation = useUpdateWorkspaceSection();
  const [settingsMutationError, setSettingsMutationError] = useState<string | null>(null);
  const [settingsMutationSuccess, setSettingsMutationSuccess] = useState<string | null>(null);
  const [draftValuesBySection, setDraftValuesBySection] = useState<Record<string, Record<number, string>>>({});

  const sections = useMemo(() => {
    if (!USE_API) return FALLBACK_SECTIONS;

    const iconById: Record<string, React.ReactNode> = {
      company: <Building2 className="h-3.5 w-3.5" />,
      general: <Building2 className="h-3.5 w-3.5" />,
      stages: <Workflow className="h-3.5 w-3.5" />,
      notifications: <Bell className="h-3.5 w-3.5" />,
    };

    return (settingsQuery.data?.sections ?? []).map((s) => ({
      ...s,
      icon: iconById[s.id] ?? <SettingsIcon className="h-3.5 w-3.5" />,
    }));
  }, [settingsQuery.data]);

  const handleSettingValueSave = async (
    sectionId: string,
    rowIndex: number,
    nextValueRaw: string,
    rows: Array<{ label: string; value: string }>,
  ) => {
    setSettingsMutationError(null);
    setSettingsMutationSuccess(null);

    const current = rows[rowIndex];
    if (!current) return;

    const nextValue = nextValueRaw.trim();
    if (nextValue.length === 0) {
      setSettingsMutationError('Значение настройки не может быть пустым.');
      setDraftValuesBySection((prev) => ({
        ...prev,
        [sectionId]: { ...(prev[sectionId] ?? {}), [rowIndex]: current.value },
      }));
      return;
    }

    if (nextValue === current.value) return;

    if (!USE_API) return;

    try {
      const nextRows = rows.map((row, index) => (
        index === rowIndex
          ? { ...row, value: nextValue }
          : row
      ));

      const updated = await updateSectionMutation.mutateAsync({
        sectionId,
        patch: { rows: nextRows },
      });

      setSettingsMutationSuccess(`Секция «${updated.title}» обновлена.`);
      setDraftValuesBySection((prev) => ({
        ...prev,
        [sectionId]: {},
      }));
    } catch (error) {
      setSettingsMutationError(error instanceof Error ? error.message : 'Не удалось обновить настройки.');
    }
  };

  return (
    <ListScaffold>
      <DashboardPage>
        <CompactPageHeader
          title="Настройки"
          subtitle="Базовые параметры рабочего пространства"
          icon={<SettingsIcon className="h-3.5 w-3.5" />}
        />

        {settingsMutationError ? (
          <div className="rounded border border-rose-200 bg-rose-50 px-3 py-2 text-[12px] text-rose-700">
            {settingsMutationError}
          </div>
        ) : null}

        {settingsMutationSuccess ? (
          <div className="rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-[12px] text-emerald-700">
            {settingsMutationSuccess}
          </div>
        ) : null}

        {USE_API && settingsQuery.isPending && !settingsQuery.data ? (
          <div className="rounded border border-dashed border-border/70 px-3 py-2 text-[12px] text-muted-foreground">
            Загружаем настройки...
          </div>
        ) : null}

        {USE_API && settingsQuery.isError && !settingsQuery.data ? (
          <div className="rounded border border-rose-200 bg-rose-50 px-3 py-2 text-[12px] text-rose-700">
            {settingsQuery.error instanceof Error
              ? settingsQuery.error.message
              : 'Не удалось загрузить настройки.'}
          </div>
        ) : null}

        {USE_API && (settingsQuery.isPending || settingsQuery.isError) && !settingsQuery.data ? null : (
          sections.length === 0 ? (
            <WidgetCard>
              <div className="px-3 py-2 text-[12px] text-muted-foreground">Настройки пока не заданы.</div>
            </WidgetCard>
          ) : (
            sections.map((s) => (
              <WidgetCard key={s.id} title={s.title} description={s.description} icon={s.icon} bodyPadded={false}>
                <dl className="divide-y divide-border/40">
                  {s.rows.map((r, i) => (
                    <div key={i} className="grid grid-cols-[220px_1fr] gap-4 px-4 py-2.5 text-[12px]">
                      <dt className="text-muted-foreground">{r.label}</dt>
                      <dd className="text-foreground">
                        {USE_API ? (
                          <input
                            value={draftValuesBySection[s.id]?.[i] ?? r.value}
                            onChange={(event) => {
                              const value = event.target.value;
                              setDraftValuesBySection((prev) => ({
                                ...prev,
                                [s.id]: {
                                  ...(prev[s.id] ?? {}),
                                  [i]: value,
                                },
                              }));
                            }}
                            onBlur={(event) => {
                              void handleSettingValueSave(s.id, i, event.target.value, s.rows);
                            }}
                            disabled={updateSectionMutation.isPending}
                            className="h-7 w-full rounded border border-border bg-background px-2 text-[11px] text-foreground outline-none ring-0"
                          />
                        ) : (
                          r.value
                        )}
                      </dd>
                    </div>
                  ))}
                </dl>
              </WidgetCard>
            ))
          )
        )}
      </DashboardPage>
    </ListScaffold>
  );
}

function UsersPage() {
  const meta = getModuleMeta('users');
  const [query, setQuery] = useState('');
  const [role, setRole] = useState<'all' | UserRole>('all');
  const [active, setActive] = useState<'all' | 'active' | 'inactive'>('all');
  const [nameDraftById, setNameDraftById] = useState<Record<string, string>>({});
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [mutationSuccess, setMutationSuccess] = useState<string | null>(null);

  type UsersRow = {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    active: boolean;
    lastLogin: string;
  };

  const [localUsers, setLocalUsers] = useState<UsersRow[]>([
    { id: 'U-001', name: 'Петров А.', email: 'petrov@katet.ru', role: 'manager', active: true, lastLogin: '2026-04-22 09:12' },
    { id: 'U-002', name: 'Сидоров Б.', email: 'sidorov@katet.ru', role: 'manager', active: true, lastLogin: '2026-04-22 08:40' },
    { id: 'U-003', name: 'Иванова С.', email: 'ivanova@katet.ru', role: 'manager', active: true, lastLogin: '2026-04-21 17:05' },
    { id: 'U-004', name: 'Admin', email: 'admin@katet.ru', role: 'admin', active: true, lastLogin: '2026-04-22 10:00' },
    { id: 'U-005', name: 'Кузнецов Д.', email: 'kuznetsov@katet.ru', role: 'manager', active: false, lastLogin: '2025-12-02 14:20' },
  ]);

  const usersQuery = useUsersQuery(
    {
      role: USE_API && role !== 'all' ? role : undefined,
      query: USE_API ? query.trim() || undefined : undefined,
      isActive: USE_API && active !== 'all' ? active === 'active' : undefined,
    },
    USE_API,
  );
  const createUserMutation = useCreateUser();
  const updateUserMutation = useUpdateUser();

  const sourceRows = useMemo(() => {
    if (USE_API) {
      return (usersQuery.data?.items ?? []).map((u) => ({
        id: u.id,
        name: u.fullName,
        email: u.email,
        role: u.role,
        active: u.isActive,
        lastLogin: formatDateTime(u.updatedAt),
      }));
    }
    return localUsers;
  }, [localUsers, usersQuery.data?.items]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sourceRows.filter((u) => {
      if (role !== 'all' && u.role !== role) return false;
      if (active === 'active' && !u.active) return false;
      if (active === 'inactive' && u.active) return false;
      return !q || `${u.name} ${u.email}`.toLowerCase().includes(q);
    });
  }, [active, query, role, sourceRows]);

  const handleCreateUser = async () => {
    setMutationError(null);
    setMutationSuccess(null);

    if (USE_API) {
      try {
        const seed = Date.now().toString().slice(-6);
        const nextRole: UserRole = role === 'all' ? 'manager' : role;
        const created = await createUserMutation.mutateAsync({
          fullName: `Новый ${nextRole === 'admin' ? 'администратор' : 'менеджер'} ${seed}`,
          email: `new.user.${seed}@katet.local`,
          password: 'manager123',
          role: nextRole,
          isActive: true,
        });
        setMutationSuccess(`Пользователь ${created.fullName} создан (временный пароль: manager123).`);
      } catch (error) {
        setMutationError(error instanceof Error ? error.message : 'Не удалось создать пользователя.');
      }
      return;
    }

    setLocalUsers((prev) => {
      const max = prev.reduce((acc, user) => {
        const num = Number(user.id.replace(/[^0-9]/g, ''));
        return Number.isFinite(num) ? Math.max(acc, num) : acc;
      }, 0);
      const nextId = `U-${String(max + 1).padStart(3, '0')}`;
      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, '0');
      const stamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
      const draft: UsersRow = {
        id: nextId,
        name: `Новый пользователь ${max + 1}`,
        email: `new.user.${max + 1}@katet.ru`,
        role: role === 'all' ? 'manager' : role,
        active: true,
        lastLogin: stamp,
      };
      return [draft, ...prev];
    });
  };

  const handleToggleActive = async (userId: string, isActiveNow: boolean) => {
    setMutationError(null);
    setMutationSuccess(null);

    if (USE_API) {
      try {
        const updated = await updateUserMutation.mutateAsync({
          id: userId,
          patch: { isActive: !isActiveNow },
        });
        setMutationSuccess(
          `Пользователь ${updated.fullName} ${updated.isActive ? 'активирован' : 'деактивирован'}.`,
        );
      } catch (error) {
        setMutationError(error instanceof Error ? error.message : 'Не удалось обновить пользователя.');
      }
      return;
    }

    setLocalUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, active: !isActiveNow } : u)),
    );
  };

  const handleRoleChange = async (userId: string, nextRole: UserRole) => {
    setMutationError(null);
    setMutationSuccess(null);

    const current = sourceRows.find((u) => u.id === userId);
    if (!current || current.role === nextRole) return;

    if (USE_API) {
      try {
        const updated = await updateUserMutation.mutateAsync({
          id: userId,
          patch: { role: nextRole },
        });
        setMutationSuccess(`Роль пользователя ${updated.fullName} изменена на ${updated.role}.`);
      } catch (error) {
        setMutationError(error instanceof Error ? error.message : 'Не удалось обновить роль пользователя.');
      }
      return;
    }

    setLocalUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, role: nextRole } : u)),
    );
  };

  const handleNameChange = async (userId: string, nextNameRaw: string) => {
    setMutationError(null);
    setMutationSuccess(null);

    const nextName = nextNameRaw.trim();
    if (nextName.length < 2) {
      setMutationError('Имя должно содержать минимум 2 символа.');
      setNameDraftById((prev) => ({ ...prev, [userId]: sourceRows.find((u) => u.id === userId)?.name ?? '' }));
      return;
    }

    const current = sourceRows.find((u) => u.id === userId);
    if (!current || current.name === nextName) return;

    if (USE_API) {
      try {
        const updated = await updateUserMutation.mutateAsync({
          id: userId,
          patch: { fullName: nextName },
        });
        setMutationSuccess(`Имя пользователя обновлено: ${updated.fullName}.`);
      } catch (error) {
        setMutationError(error instanceof Error ? error.message : 'Не удалось обновить имя пользователя.');
      }
      return;
    }

    setLocalUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, name: nextName } : u)),
    );
  };

  const handleResetPassword = async (userId: string) => {
    setMutationError(null);
    setMutationSuccess(null);

    const nextPassword = globalThis.prompt('Введите новый пароль (минимум 6 символов):');
    if (nextPassword === null) return;

    const trimmed = nextPassword.trim();
    if (trimmed.length < 6) {
      setMutationError('Пароль должен содержать минимум 6 символов.');
      return;
    }

    if (USE_API) {
      try {
        const updated = await updateUserMutation.mutateAsync({
          id: userId,
          patch: { password: trimmed },
        });
        setMutationSuccess(`Пароль пользователя ${updated.fullName} обновлён.`);
      } catch (error) {
        setMutationError(error instanceof Error ? error.message : 'Не удалось обновить пароль.');
      }
      return;
    }

    const current = sourceRows.find((u) => u.id === userId);
    if (current) {
      setMutationSuccess(`Пароль пользователя ${current.name} обновлён.`);
    }
  };

  const toolbar = (
    <SimpleToolbar
      searchPlaceholder={meta.searchPlaceholder}
      query={query}
      onQueryChange={setQuery}
      filters={[
        {
          id: 'role',
          value: role,
          placeholder: 'Роль',
          width: 120,
          options: [
            { value: 'all', label: 'Все роли' },
            { value: 'admin', label: 'Админ' },
            { value: 'manager', label: 'Менеджер' },
          ],
          onChange: (value) => setRole(value as 'all' | UserRole),
        },
        {
          id: 'active',
          value: active,
          placeholder: 'Статус',
          width: 120,
          options: [
            { value: 'all', label: 'Все' },
            { value: 'active', label: 'Активные' },
            { value: 'inactive', label: 'Неактивные' },
          ],
          onChange: (value) => setActive(value as 'all' | 'active' | 'inactive'),
        },
      ]}
      hasActive={query.length > 0 || role !== 'all' || active !== 'all'}
      onReset={() => {
        setQuery('');
        setRole('all');
        setActive('all');
      }}
      extraUtility={
        <Button
          size="sm"
          className="h-7 gap-1 bg-[#2a6af0] px-2.5 text-[12px] text-white hover:bg-[#2358d1]"
          onClick={() => {
            void handleCreateUser();
          }}
          disabled={createUserMutation.isPending}
        >
          {createUserMutation.isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Plus className="h-3.5 w-3.5" />
          )}
          {createUserMutation.isPending ? 'Создаём...' : 'Новый пользователь'}
        </Button>
      }
    />
  );

  return (
    <ListScaffold toolbar={toolbar}>
      {mutationError ? (
        <div className="mx-4 mt-4 rounded border border-rose-200 bg-rose-50 px-3 py-2 text-[12px] text-rose-700">
          {mutationError}
        </div>
      ) : null}

      {mutationSuccess ? (
        <div className="mx-4 mt-4 rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-[12px] text-emerald-700">
          {mutationSuccess}
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-auto">
        {USE_API && usersQuery.isPending && !usersQuery.data ? (
          <div className="flex h-full min-h-[220px] items-center justify-center gap-2 text-[13px] text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Загружаем пользователей...
          </div>
        ) : null}

        {USE_API && usersQuery.isError && !usersQuery.data ? (
          <div className="flex h-full min-h-[220px] items-center justify-center px-4 text-center text-[13px] text-muted-foreground">
            {usersQuery.error instanceof Error
              ? usersQuery.error.message
              : 'Не удалось загрузить пользователей.'}
          </div>
        ) : null}

        {!USE_API || usersQuery.data || (!usersQuery.isPending && !usersQuery.isError) ? (
          <table className="w-full min-w-[900px] border-collapse text-[12px]">
            <thead className="sticky top-0 z-10 bg-white">
              <tr className="border-b border-border/60 text-[11px] uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-2 text-left font-medium">ID</th>
                <th className="px-3 py-2 text-left font-medium">Имя</th>
                <th className="px-3 py-2 text-left font-medium">Email</th>
                <th className="px-3 py-2 text-left font-medium">Роль</th>
                <th className="px-3 py-2 text-left font-medium">Активен</th>
                <th className="px-3 py-2 text-left font-medium">Последний апдейт</th>
                <th className="px-3 py-2 text-left font-medium">Действия</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                    Пользователи не найдены.
                  </td>
                </tr>
              ) : (
                filtered.map((u) => (
                  <tr key={u.id} className="border-b border-border/40 hover:bg-muted/30">
                    <td className="px-4 py-2.5 font-mono text-[11px] text-muted-foreground">{u.id}</td>
                    <td className="px-3 py-2.5 text-foreground">
                      <div className="flex items-center gap-2">
                        <UsersIcon className="h-3.5 w-3.5 text-muted-foreground" />
                        <input
                          value={nameDraftById[u.id] ?? u.name}
                          onChange={(event) => {
                            const value = event.target.value;
                            setNameDraftById((prev) => ({ ...prev, [u.id]: value }));
                          }}
                          onBlur={(event) => {
                            void handleNameChange(u.id, event.target.value);
                          }}
                          disabled={updateUserMutation.isPending}
                          className="h-7 min-w-[180px] rounded border border-border bg-background px-2 text-[11px] text-foreground outline-none ring-0"
                        />
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-foreground/80">{u.email}</td>
                    <td className="px-3 py-2.5 text-foreground/80">
                      <select
                        value={u.role}
                        onChange={(event) => {
                          void handleRoleChange(u.id, event.target.value as UserRole);
                        }}
                        disabled={updateUserMutation.isPending}
                        className="h-7 rounded border border-border bg-background px-2 text-[11px] text-foreground outline-none ring-0"
                      >
                        <option value="admin">admin</option>
                        <option value="manager">manager</option>
                      </select>
                    </td>
                    <td className="px-3 py-2.5">
                      {u.active ? (
                        <span className="inline-flex items-center gap-1 rounded border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[10px] text-emerald-700">
                          <Check className="h-3 w-3" /> Да
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] text-slate-600">
                          <X className="h-3 w-3" /> Нет
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-[11px] text-muted-foreground">{u.lastLogin}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-6 px-2 text-[11px]"
                          onClick={() => {
                            void handleToggleActive(u.id, u.active);
                          }}
                          disabled={updateUserMutation.isPending}
                        >
                          {u.active ? 'Деактивировать' : 'Активировать'}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 px-2 text-[11px]"
                          onClick={() => {
                            void handleResetPassword(u.id);
                          }}
                          disabled={updateUserMutation.isPending}
                        >
                          Сброс пароля
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        ) : null}
      </div>
    </ListScaffold>
  );
}

function PermissionsPage() {
  const FALLBACK_ROLES: UserRole[] = ['admin', 'manager'];
  const FALLBACK_CAPABILITIES: Array<{ id: string; label: string; matrix: Record<UserRole, boolean> }> = [
    { id: 'leads.read', label: 'Чтение лидов', matrix: { admin: true, manager: true } },
    { id: 'leads.write', label: 'Редактирование лидов', matrix: { admin: true, manager: true } },
    { id: 'applications.write', label: 'Редактирование заявок', matrix: { admin: true, manager: true } },
    { id: 'reservations.confirm', label: 'Подтверждение броней', matrix: { admin: true, manager: true } },
    { id: 'departures.start', label: 'Запуск выездов', matrix: { admin: true, manager: true } },
    { id: 'completion.sign', label: 'Подписание актов', matrix: { admin: true, manager: true } },
    { id: 'catalogs.write', label: 'Управление справочниками', matrix: { admin: true, manager: false } },
    { id: 'admin.users', label: 'Управление пользователями', matrix: { admin: true, manager: false } },
    { id: 'admin.permissions', label: 'Управление правами', matrix: { admin: true, manager: false } },
    { id: 'admin.imports', label: 'Импорты', matrix: { admin: true, manager: false } },
  ];

  const permissionsQuery = usePermissionsMatrixQuery(USE_API);
  const updateCapabilityMutation = useUpdatePermissionCapability();
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [mutationSuccess, setMutationSuccess] = useState<string | null>(null);

  const roles = USE_API
    ? (permissionsQuery.data?.roles ?? FALLBACK_ROLES)
    : FALLBACK_ROLES;
  const capabilities = USE_API
    ? (permissionsQuery.data?.capabilities ?? FALLBACK_CAPABILITIES)
    : FALLBACK_CAPABILITIES;

  const handleToggleCapability = async (
    capabilityId: string,
    role: UserRole,
    enabledNow: boolean,
  ) => {
    setMutationError(null);
    setMutationSuccess(null);

    if (!USE_API) return;

    try {
      const updated = await updateCapabilityMutation.mutateAsync({
        capabilityId,
        patch: role === 'admin'
          ? { admin: !enabledNow }
          : { manager: !enabledNow },
      });
      setMutationSuccess(`Обновлено: ${updated.label} (${role}=${!enabledNow ? 'да' : 'нет'}).`);
    } catch (error) {
      setMutationError(error instanceof Error ? error.message : 'Не удалось обновить права.');
    }
  };

  return (
    <ListScaffold>
      <DashboardPage>
        <CompactPageHeader
          title="Роли и права"
          subtitle="Матрица возможностей по ролям. В API-режиме доступно редактирование значений."
          icon={<Shield className="h-3.5 w-3.5" />}
        />

        {mutationError ? (
          <div className="rounded border border-rose-200 bg-rose-50 px-3 py-2 text-[12px] text-rose-700">
            {mutationError}
          </div>
        ) : null}

        {mutationSuccess ? (
          <div className="rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-[12px] text-emerald-700">
            {mutationSuccess}
          </div>
        ) : null}

        {USE_API && permissionsQuery.isPending && !permissionsQuery.data ? (
          <div className="rounded border border-dashed border-border/70 px-3 py-2 text-[12px] text-muted-foreground">
            Загружаем матрицу прав...
          </div>
        ) : null}

        {USE_API && permissionsQuery.isError && !permissionsQuery.data ? (
          <div className="rounded border border-rose-200 bg-rose-50 px-3 py-2 text-[12px] text-rose-700">
            {permissionsQuery.error instanceof Error
              ? permissionsQuery.error.message
              : 'Не удалось загрузить матрицу прав.'}
          </div>
        ) : null}

        {USE_API && (permissionsQuery.isPending || permissionsQuery.isError) && !permissionsQuery.data ? null : (
          <WidgetCard bodyPadded={false}>
            <table className="w-full border-collapse text-[12px]">
              <thead>
                <tr className="border-b border-border/60 text-[11px] uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-2 text-left font-medium">Возможность</th>
                  {roles.map((r) => (
                    <th key={r} className="px-3 py-2 text-center font-medium">
                      {r}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {capabilities.map((c) => (
                  <tr key={c.id} className="border-b border-border/40 last:border-b-0 hover:bg-muted/30">
                    <td className="px-4 py-2.5 text-foreground">{c.label}</td>
                    {roles.map((r) => (
                      <td key={r} className="px-3 py-2.5 text-center">
                        {USE_API ? (
                          <button
                            type="button"
                            onClick={() => {
                              void handleToggleCapability(c.id, r, c.matrix[r]);
                            }}
                            disabled={updateCapabilityMutation.isPending}
                            className="mx-auto inline-flex h-6 w-8 items-center justify-center rounded border border-border/70 bg-background hover:bg-muted/50 disabled:opacity-60"
                          >
                            {c.matrix[r] ? (
                              <Check className="h-3.5 w-3.5 text-emerald-600" />
                            ) : (
                              <span className="text-muted-foreground/60">—</span>
                            )}
                          </button>
                        ) : c.matrix[r] ? (
                          <Check className="mx-auto h-3.5 w-3.5 text-emerald-600" />
                        ) : (
                          <span className="text-muted-foreground/50">—</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </WidgetCard>
        )}
      </DashboardPage>
    </ListScaffold>
  );
}

