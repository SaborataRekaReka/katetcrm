import { useEffect, useMemo, useState, type ComponentType } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Activity,
  CheckCircle2,
  ExternalLink,
  Globe2,
  Loader2,
  MessageCircle,
  PhoneCall,
  Plug,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  Trash2,
} from 'lucide-react';
import { ListScaffold } from '../shell/ListScaffold';
import { SimpleToolbar } from '../shell/SimpleToolbar';
import { getModuleMeta } from '../shell/navConfig';
import { useLayout } from '../shell/layoutStore';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Switch } from '../ui/switch';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { cn } from '../ui/utils';
import {
  useIntegrationEventQuery,
  useIntegrationEventsQuery,
  useMangoCallRoutingSettingsQuery,
} from '../../hooks/useIntegrationsQuery';
import {
  useUpdateMangoCallRoutingSettings,
  useReplayIntegrationEvent,
  useRetryIntegrationEvent,
} from '../../hooks/useIntegrationsMutations';
import { useManagersQuery } from '../../hooks/useUsersQuery';
import type {
  IntegrationChannel,
  IntegrationEventApi,
  IntegrationEventStatus,
  MangoCallRoutingSettingsApi,
} from '../../lib/integrationsApi';

type PeriodFilter = 'all' | '24h' | '7d' | '30d';
type IntegrationSectionId = 'mango-office' | 'events';

interface IntegrationSectionItem {
  id: IntegrationSectionId;
  label: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
}

const INTEGRATION_SECTIONS: IntegrationSectionItem[] = [
  {
    id: 'mango-office',
    label: 'Mango Office',
    description: 'Телефония, записи, ответственные',
    icon: PhoneCall,
  },
  {
    id: 'events',
    label: 'Журнал событий',
    description: 'Webhook, ошибки, replay',
    icon: Activity,
  },
];

const MANAGER_NONE_VALUE = '__none__';

const CHANNEL_LABEL: Record<IntegrationChannel, string> = {
  site: 'Сайт',
  mango: 'Mango',
  telegram: 'Telegram',
  max: 'MAX',
};

const STATUS_LABEL: Record<IntegrationEventStatus, string> = {
  received: 'Получено',
  processed: 'Обработано',
  failed: 'Ошибка',
  duplicate: 'Дубликат',
  replayed: 'Переиграно',
};

const STATUS_TONE: Record<IntegrationEventStatus, string> = {
  received: 'border-sky-200 bg-sky-50 text-sky-700',
  processed: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  failed: 'border-rose-200 bg-rose-50 text-rose-700',
  duplicate: 'border-amber-200 bg-amber-50 text-amber-700',
  replayed: 'border-violet-200 bg-violet-50 text-violet-700',
};

function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—';
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

function periodToFromIso(period: PeriodFilter): string | undefined {
  if (period === 'all') return undefined;
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  if (period === '24h') return new Date(now - dayMs).toISOString();
  if (period === '7d') return new Date(now - 7 * dayMs).toISOString();
  return new Date(now - 30 * dayMs).toISOString();
}

function shortId(id: string): string {
  return id.slice(0, 8).toUpperCase();
}

function stringifyJson(value: unknown): string {
  if (value === null || value === undefined) return '—';
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function summaryRows(summary: unknown): Array<{ key: string; value: string }> {
  if (!summary || typeof summary !== 'object' || Array.isArray(summary)) {
    return [];
  }

  const rows: Array<{ key: string; value: string }> = [];
  for (const [key, value] of Object.entries(summary)) {
    if (value === null || value === undefined || value === '') continue;
    rows.push({ key, value: String(value) });
  }
  return rows;
}

function EventStatusPill({ status }: { status: IntegrationEventStatus }) {
  return (
    <span
      className={cn(
        'inline-flex rounded border px-1.5 py-0.5 text-[10px]',
        STATUS_TONE[status],
      )}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

function EmptyDetails() {
  return (
    <div className="flex h-full min-h-[320px] items-center justify-center px-4 text-center text-[12px] text-muted-foreground">
      Выберите событие из списка, чтобы посмотреть данные и выполнить повтор или повторную обработку.
    </div>
  );
}

const EMPTY_MANGO_CALL_ROUTING: MangoCallRoutingSettingsApi = {
  enabled: true,
  updateResponsibleOnAnswered: true,
  updateResponsibleOnTransfer: true,
  assignMissedCalls: false,
  fallbackManagerId: null,
  rules: [],
};

function SettingsSwitchRow({
  title,
  description,
  checked,
  disabled,
  onCheckedChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  disabled: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex min-h-[58px] items-center justify-between gap-4 px-4 py-3">
      <div className="min-w-0">
        <div className="text-[13px] font-medium text-foreground">{title}</div>
        <div className="mt-0.5 text-[11px] text-muted-foreground">{description}</div>
      </div>
      <Switch checked={checked} disabled={disabled} onCheckedChange={onCheckedChange} />
    </div>
  );
}

function MangoOfficeSettingsPanel() {
  const managersQuery = useManagersQuery(true);
  const settingsQuery = useMangoCallRoutingSettingsQuery(true);
  const updateMutation = useUpdateMangoCallRoutingSettings();
  const [draft, setDraft] = useState<MangoCallRoutingSettingsApi>(EMPTY_MANGO_CALL_ROUTING);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (settingsQuery.data) {
      setDraft(settingsQuery.data);
      setError(null);
      setSuccess(null);
    }
  }, [settingsQuery.data]);

  const managerOptions = managersQuery.data ?? [];
  const serializedDraft = JSON.stringify(draft);
  const serializedSource = JSON.stringify(settingsQuery.data ?? EMPTY_MANGO_CALL_ROUTING);
  const dirty = serializedDraft !== serializedSource;
  const busy = settingsQuery.isPending || managersQuery.isPending || updateMutation.isPending;

  const updateRule = (
    index: number,
    patch: Partial<MangoCallRoutingSettingsApi['rules'][number]>,
  ) => {
    setDraft((prev) => ({
      ...prev,
      rules: prev.rules.map((rule, ruleIndex) => (
        ruleIndex === index ? { ...rule, ...patch } : rule
      )),
    }));
  };

  const addRule = () => {
    setDraft((prev) => ({
      ...prev,
      rules: [
        ...prev.rules,
        {
          extension: '',
          userId: managerOptions[0]?.id ?? '',
          isActive: true,
        },
      ],
    }));
  };

  const removeRule = (index: number) => {
    setDraft((prev) => ({
      ...prev,
      rules: prev.rules.filter((_, ruleIndex) => ruleIndex !== index),
    }));
  };

  const save = async () => {
    setError(null);
    setSuccess(null);

    const normalized: MangoCallRoutingSettingsApi = {
      ...draft,
      fallbackManagerId: draft.fallbackManagerId || null,
      rules: draft.rules.map((rule) => ({
        ...rule,
        extension: rule.extension.trim(),
        userId: rule.userId.trim(),
      })),
    };

    if (normalized.rules.some((rule) => !rule.extension || !rule.userId)) {
      setError('Укажите внутренний номер и менеджера во всех строках.');
      return;
    }

    const duplicateExtension = normalized.rules.find((rule, index) => (
      normalized.rules.findIndex((candidate) => candidate.extension === rule.extension) !== index
    ));
    if (duplicateExtension) {
      setError(`Внутренний номер ${duplicateExtension.extension} указан несколько раз.`);
      return;
    }

    try {
      const saved = await updateMutation.mutateAsync(normalized);
      setDraft(saved);
      setSuccess('Правила распределения Mango сохранены.');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Не удалось сохранить правила Mango.');
    }
  };

  return (
    <section className="rounded-lg border border-border/60 bg-white shadow-sm">
      <div className="flex flex-wrap items-center gap-2 border-b border-border/60 px-4 py-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-[14px] font-medium text-foreground">Распределение звонков</h2>
            <Badge
              variant="outline"
              className={cn(
                'h-5 rounded px-1.5 text-[10px]',
                draft.enabled
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                  : 'border-slate-200 bg-slate-50 text-slate-600',
              )}
            >
              {draft.enabled ? 'Включено' : 'Выключено'}
            </Badge>
          </div>
          <div className="mt-0.5 text-[11px] text-muted-foreground">
            Внутренние номера Mango сопоставляются с менеджерами CRM.
          </div>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-1.5">
          <Button
            size="sm"
            variant="outline"
            className="h-8 gap-1 px-2 text-[11px]"
            onClick={addRule}
            disabled={busy || managerOptions.length === 0}
          >
            <Plus className="h-3.5 w-3.5" /> Добавить номер
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-8 gap-1 px-2 text-[11px]"
            onClick={() => settingsQuery.data && setDraft(settingsQuery.data)}
            disabled={busy || !dirty || !settingsQuery.data}
          >
            <RotateCcw className="h-3.5 w-3.5" /> Сбросить
          </Button>
          <Button
            size="sm"
            className="h-8 gap-1 bg-[#2a6af0] px-2 text-[11px] text-white hover:bg-[#2358d1]"
            onClick={() => { void save(); }}
            disabled={busy || !dirty}
          >
            <Save className="h-3.5 w-3.5" /> {updateMutation.isPending ? 'Сохранение...' : 'Сохранить'}
          </Button>
        </div>
      </div>

      <div className="space-y-2 px-4 py-3">
      {settingsQuery.isError ? (
        <div className="rounded border border-rose-200 bg-rose-50 px-2 py-1.5 text-[11px] text-rose-700">
          {settingsQuery.error instanceof Error ? settingsQuery.error.message : 'Не удалось загрузить правила Mango.'}
        </div>
      ) : null}
      {error ? (
        <div className="rounded border border-rose-200 bg-rose-50 px-2 py-1.5 text-[11px] text-rose-700">
          {error}
        </div>
      ) : null}
      {success ? (
        <div className="rounded border border-emerald-200 bg-emerald-50 px-2 py-1.5 text-[11px] text-emerald-700">
          {success}
        </div>
      ) : null}
      </div>

      <div className="divide-y divide-border/60 border-y border-border/60">
        <SettingsSwitchRow
          title="Маршрутизация включена"
          description="CRM применяет правила Mango к входящим звонкам."
          checked={draft.enabled}
          disabled={busy}
          onCheckedChange={(checked) => setDraft((prev) => ({ ...prev, enabled: checked }))}
        />
        <SettingsSwitchRow
          title="Назначать при ответе"
          description="Ответственный обновляется, когда звонок принят сотрудником."
          checked={draft.updateResponsibleOnAnswered}
          disabled={busy}
          onCheckedChange={(checked) => setDraft((prev) => ({ ...prev, updateResponsibleOnAnswered: checked }))}
        />
        <SettingsSwitchRow
          title="Обновлять при переводе"
          description="Переведенный входящий звонок может сменить ответственного."
          checked={draft.updateResponsibleOnTransfer}
          disabled={busy}
          onCheckedChange={(checked) => setDraft((prev) => ({ ...prev, updateResponsibleOnTransfer: checked }))}
        />
        <SettingsSwitchRow
          title="Назначать пропущенные"
          description="Пропущенные звонки распределяются по найденному внутреннему номеру."
          checked={draft.assignMissedCalls}
          disabled={busy}
          onCheckedChange={(checked) => setDraft((prev) => ({ ...prev, assignMissedCalls: checked }))}
        />
      </div>

      <div className="grid gap-2 px-4 py-3 text-[12px] md:grid-cols-[220px_1fr]">
        <label className="flex items-center text-muted-foreground">Менеджер по умолчанию</label>
        <Select
          value={draft.fallbackManagerId ?? MANAGER_NONE_VALUE}
          onValueChange={(value) => setDraft((prev) => ({
            ...prev,
            fallbackManagerId: value === MANAGER_NONE_VALUE ? null : value,
          }))}
          disabled={busy}
        >
          <SelectTrigger size="sm" className="text-[12px]">
            <SelectValue placeholder="Не назначать" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={MANAGER_NONE_VALUE}>Не назначать, если номер не найден</SelectItem>
            {managerOptions.map((manager) => (
              <SelectItem key={manager.id} value={manager.id}>{manager.fullName}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-x-auto border-t border-border/60">
        <table className="w-full min-w-[680px] border-collapse text-[12px]">
          <thead className="bg-muted/30 text-muted-foreground">
            <tr>
              <th className="px-4 py-2 text-left font-medium">Внутренний номер</th>
              <th className="px-3 py-2 text-left font-medium">Менеджер CRM</th>
              <th className="w-[96px] px-3 py-2 text-left font-medium">Активно</th>
              <th className="w-12 px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {draft.rules.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-[12px] text-muted-foreground">
                  Номера еще не добавлены.
                </td>
              </tr>
            ) : draft.rules.map((rule, index) => (
              <tr key={`${rule.extension}-${index}`} className="border-t border-border/50">
                <td className="px-4 py-2">
                  <Input
                    value={rule.extension}
                    onChange={(event) => updateRule(index, { extension: event.target.value })}
                    disabled={busy}
                    placeholder="15"
                    className="h-8 text-[12px]"
                  />
                </td>
                <td className="px-3 py-2">
                  <Select
                    value={rule.userId || MANAGER_NONE_VALUE}
                    onValueChange={(value) => updateRule(index, {
                      userId: value === MANAGER_NONE_VALUE ? '' : value,
                    })}
                    disabled={busy}
                  >
                    <SelectTrigger size="sm" className="text-[12px]">
                      <SelectValue placeholder="Выберите менеджера" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={MANAGER_NONE_VALUE}>Выберите менеджера</SelectItem>
                      {managerOptions.map((manager) => (
                        <SelectItem key={manager.id} value={manager.id}>{manager.fullName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </td>
                <td className="px-3 py-2">
                  <Switch
                    checked={rule.isActive}
                    onCheckedChange={(checked) => updateRule(index, { isActive: checked })}
                    disabled={busy}
                  />
                </td>
                <td className="px-3 py-2 text-right">
                  <button
                    type="button"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-rose-50 hover:text-rose-700 disabled:opacity-50"
                    onClick={() => removeRule(index)}
                    disabled={busy}
                    aria-label="Удалить правило"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function MangoOfficePage() {
  const recentQuery = useIntegrationEventsQuery(
    { channel: 'mango', take: 6, skip: 0 },
    true,
  );
  const recentRows = recentQuery.data?.items ?? [];

  return (
    <div className="min-h-0 min-w-0 flex-1 overflow-auto bg-muted/10">
      <div className="mx-auto flex w-full max-w-[980px] flex-col gap-4 p-4">
        <section className="rounded-lg border border-border/60 bg-white shadow-sm">
          <div className="flex flex-wrap items-start gap-3 px-4 py-4">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700">
              <PhoneCall className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-[18px] font-semibold tracking-tight text-foreground">Mango Office</h1>
                <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-[10px] text-emerald-700">
                  Webhook активен
                </Badge>
              </div>
              <p className="mt-1 max-w-2xl text-[12px] leading-5 text-muted-foreground">
                Звонки Mango создают лиды, сохраняют записи и распределяют ответственных по внутренним номерам.
              </p>
            </div>
          </div>
        </section>

        <MangoOfficeSettingsPanel />

        <section className="rounded-lg border border-border/60 bg-white shadow-sm">
          <div className="flex items-center justify-between gap-2 border-b border-border/60 px-4 py-3">
            <div>
              <h2 className="text-[14px] font-medium text-foreground">Последние события Mango</h2>
              <div className="mt-0.5 text-[11px] text-muted-foreground">Свежие входящие callback-и и ошибки обработки.</div>
            </div>
            {recentQuery.isFetching ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : null}
          </div>

          {recentQuery.isError ? (
            <div className="px-4 py-4 text-[12px] text-rose-700">
              {recentQuery.error instanceof Error ? recentQuery.error.message : 'Не удалось загрузить события Mango.'}
            </div>
          ) : null}

          {!recentQuery.isError && recentRows.length === 0 ? (
            <div className="px-4 py-8 text-center text-[12px] text-muted-foreground">
              Событий Mango пока нет.
            </div>
          ) : null}

          {recentRows.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] border-collapse text-[12px]">
                <thead className="bg-muted/30 text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium">ID</th>
                    <th className="px-3 py-2 text-left font-medium">Статус</th>
                    <th className="px-3 py-2 text-left font-medium">Внешний ID</th>
                    <th className="px-3 py-2 text-left font-medium">Получено</th>
                  </tr>
                </thead>
                <tbody>
                  {recentRows.map((event) => (
                    <tr key={event.id} className="border-t border-border/50">
                      <td className="px-4 py-2.5 font-mono text-[11px] text-muted-foreground">{shortId(event.id)}</td>
                      <td className="px-3 py-2.5"><EventStatusPill status={event.status} /></td>
                      <td className="px-3 py-2.5 text-foreground/80">{event.externalId ?? '—'}</td>
                      <td className="px-3 py-2.5 text-muted-foreground">{formatDateTime(event.receivedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}

function IntegrationSectionNav({
  activeSection,
  query,
  onSelect,
}: {
  activeSection: IntegrationSectionId;
  query: string;
  onSelect: (section: IntegrationSectionId) => void;
}) {
  const normalizedQuery = query.trim().toLowerCase();
  const sections = normalizedQuery
    ? INTEGRATION_SECTIONS.filter((section) => (
        section.label.toLowerCase().includes(normalizedQuery) ||
        section.description.toLowerCase().includes(normalizedQuery)
      ))
    : INTEGRATION_SECTIONS;

  return (
    <aside className="shrink-0 border-b border-border/60 bg-white lg:w-[264px] lg:border-b-0 lg:border-r">
      <div className="space-y-4 p-3">
        <div>
          <div className="px-2 pb-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Интеграции
          </div>
          <div className="space-y-1">
            {sections.map((section) => {
              const Icon = section.icon;
              const active = section.id === activeSection;
              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => onSelect(section.id)}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left transition-colors',
                    active ? 'bg-[#e7f1ff] text-[#1f57d6]' : 'text-foreground hover:bg-muted/50',
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-medium">{section.label}</span>
                    <span className={cn('block truncate text-[11px]', active ? 'text-[#1f57d6]/75' : 'text-muted-foreground')}>
                      {section.description}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="border-t border-border/60 pt-3">
          <div className="px-2 pb-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Провайдеры
          </div>
          <div className="space-y-1">
            {[
              { label: 'Сайт', icon: Globe2 },
              { label: 'Telegram', icon: MessageCircle },
              { label: 'MAX', icon: Plug },
            ].map((provider) => {
              const Icon = provider.icon;
              return (
                <div key={provider.label} className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-muted-foreground">
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="min-w-0 flex-1 truncate text-[13px]">{provider.label}</span>
                  <Badge variant="outline" className="rounded px-1.5 text-[10px] text-muted-foreground">Скоро</Badge>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </aside>
  );
}

export function IntegrationsWorkspacePage() {
  const { setActivePrimaryNav, setActiveSecondaryNav } = useLayout();
  const meta = getModuleMeta('integrations');

  const [activeSection, setActiveSection] = useState<IntegrationSectionId>('mango-office');
  const [integrationQuery, setIntegrationQuery] = useState('');
  const [query, setQuery] = useState('');
  const [channel, setChannel] = useState<'all' | IntegrationChannel>('all');
  const [status, setStatus] = useState<'all' | IntegrationEventStatus>('all');
  const [period, setPeriod] = useState<PeriodFilter>('7d');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const listParams = useMemo(
    () => ({
      channel: channel === 'all' ? undefined : channel,
      status: status === 'all' ? undefined : status,
      query: query.trim() || undefined,
      from: periodToFromIso(period),
      take: 200,
      skip: 0,
    }),
    [channel, status, query, period],
  );

  const eventsQuery = useIntegrationEventsQuery(listParams, activeSection === 'events');
  const retryMutation = useRetryIntegrationEvent();
  const replayMutation = useReplayIntegrationEvent();

  const rows = eventsQuery.data?.items ?? [];

  useEffect(() => {
    if (activeSection !== 'events') return;
    if (rows.length === 0) {
      setSelectedId(null);
      return;
    }
    if (!selectedId) {
      setSelectedId(rows[0].id);
      return;
    }
    if (!rows.some((row) => row.id === selectedId)) {
      setSelectedId(rows[0].id);
    }
  }, [activeSection, rows, selectedId]);

  const detailQuery = useIntegrationEventQuery(
    selectedId,
    activeSection === 'events' && !!selectedId,
  );
  const selected = detailQuery.data ?? rows.find((row) => row.id === selectedId) ?? null;

  const busy = retryMutation.isPending || replayMutation.isPending;
  const canRecover = selected?.status === 'failed';

  const hasActive =
    query.length > 0 ||
    channel !== 'all' ||
    status !== 'all' ||
    period !== '7d';

  const resetFilters = () => {
    setQuery('');
    setChannel('all');
    setStatus('all');
    setPeriod('7d');
  };

  const openLeadWorkspace = () => {
    setActivePrimaryNav('sales');
    setActiveSecondaryNav('leads');
  };

  const runRecovery = async (type: 'retry' | 'replay') => {
    if (!selectedId) return;

    setActionError(null);
    setActionSuccess(null);

    try {
      const payload = {
        id: selectedId,
        reason: reason.trim() || undefined,
      };
      const result =
        type === 'retry'
          ? await retryMutation.mutateAsync(payload)
          : await replayMutation.mutateAsync(payload);

      if (result.processed) {
        setActionSuccess(type === 'retry' ? 'Повтор выполнен успешно.' : 'Повторная обработка выполнена успешно.');
      } else {
        setActionError(result.failure?.errorMessage ?? 'Операция не завершилась успешно.');
      }
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Операция не выполнена.');
    }
  };

  const toolbar = activeSection === 'events' ? (
    <SimpleToolbar
      searchPlaceholder="Поиск по событиям интеграций"
      query={query}
      onQueryChange={setQuery}
      filters={[
        {
          id: 'channel',
          value: channel,
          placeholder: 'Канал',
          width: 130,
          options: [
            { value: 'all', label: 'Все каналы' },
            { value: 'site', label: 'Сайт' },
            { value: 'mango', label: 'Mango' },
            { value: 'telegram', label: 'Telegram' },
            { value: 'max', label: 'MAX' },
          ],
          onChange: (value) => setChannel(value as 'all' | IntegrationChannel),
        },
        {
          id: 'status',
          value: status,
          placeholder: 'Статус',
          width: 140,
          options: [
            { value: 'all', label: 'Все статусы' },
            { value: 'received', label: STATUS_LABEL.received },
            { value: 'processed', label: STATUS_LABEL.processed },
            { value: 'failed', label: STATUS_LABEL.failed },
            { value: 'duplicate', label: STATUS_LABEL.duplicate },
            { value: 'replayed', label: STATUS_LABEL.replayed },
          ],
          onChange: (value) => setStatus(value as 'all' | IntegrationEventStatus),
        },
        {
          id: 'period',
          value: period,
          placeholder: 'Период',
          width: 130,
          options: [
            { value: 'all', label: 'За все время' },
            { value: '24h', label: '24 часа' },
            { value: '7d', label: '7 дней' },
            { value: '30d', label: '30 дней' },
          ],
          onChange: (value) => setPeriod(value as PeriodFilter),
        },
      ]}
      hasActive={hasActive}
      onReset={resetFilters}
    />
  ) : (
    <SimpleToolbar
      searchPlaceholder={meta.searchPlaceholder}
      query={integrationQuery}
      onQueryChange={setIntegrationQuery}
      filters={[]}
      hasActive={integrationQuery.length > 0}
      onReset={() => setIntegrationQuery('')}
    />
  );

  return (
    <ListScaffold toolbar={toolbar}>
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <IntegrationSectionNav
          activeSection={activeSection}
          query={integrationQuery}
          onSelect={setActiveSection}
        />
        {activeSection === 'mango-office' ? (
          <MangoOfficePage />
        ) : (
          <div className="flex min-h-0 min-w-0 flex-1 flex-col lg:flex-row">
          <div className="min-h-0 min-w-0 flex-1 overflow-auto border-b border-border/60 lg:border-b-0 lg:border-r">
          {eventsQuery.isPending && !eventsQuery.data ? (
            <div className="flex h-full min-h-[320px] items-center justify-center gap-2 text-[13px] text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Загрузка событий...
            </div>
          ) : null}

          {eventsQuery.isError && !eventsQuery.data ? (
            <div className="flex h-full min-h-[320px] items-center justify-center px-4 text-center text-[13px] text-muted-foreground">
              {eventsQuery.error instanceof Error ? eventsQuery.error.message : 'Не удалось загрузить события.'}
            </div>
          ) : null}

          {eventsQuery.isSuccess && rows.length === 0 ? (
            <div className="flex h-full min-h-[320px] items-center justify-center px-4 text-center text-[13px] text-muted-foreground">
              Событий не найдено.
            </div>
          ) : null}

          {rows.length > 0 ? (
            <table className="w-full min-w-[840px] border-collapse text-[12px]">
              <thead className="sticky top-0 z-10 bg-white">
                <tr className="border-b border-border/60 text-[11px] uppercase tracking-wide text-muted-foreground">
                  <th className="px-3 py-2 text-left font-medium">ID</th>
                  <th className="px-3 py-2 text-left font-medium">Канал</th>
                  <th className="px-3 py-2 text-left font-medium">Статус</th>
                  <th className="px-3 py-2 text-left font-medium">Внешний ID</th>
                  <th className="px-3 py-2 text-left font-medium">Получено</th>
                  <th className="px-3 py-2 text-right font-medium">Повторы</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((event) => {
                  const active = event.id === selectedId;
                  return (
                    <tr
                      key={event.id}
                      onClick={() => setSelectedId(event.id)}
                      className={cn(
                        'cursor-pointer border-b border-border/40 transition-colors hover:bg-muted/30',
                        active && 'bg-blue-50/70',
                      )}
                    >
                      <td className="px-3 py-2.5 font-mono text-[11px] text-muted-foreground">
                        {shortId(event.id)}
                      </td>
                      <td className="px-3 py-2.5">{CHANNEL_LABEL[event.channel]}</td>
                      <td className="px-3 py-2.5">
                        <EventStatusPill status={event.status} />
                      </td>
                      <td className="px-3 py-2.5 text-foreground/80">
                        {event.externalId ?? '—'}
                      </td>
                      <td className="px-3 py-2.5 text-muted-foreground">
                        {formatDateTime(event.receivedAt)}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-foreground/80">
                        {event.retryCount}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : null}
        </div>

        <aside className="w-full min-h-0 max-h-[45vh] overflow-auto border-t border-border/60 bg-muted/10 lg:w-[430px] lg:max-h-none lg:border-t-0">
          {!selectedId ? <EmptyDetails /> : null}

          {selectedId && detailQuery.isPending && !selected ? (
            <div className="flex h-full min-h-[320px] items-center justify-center gap-2 text-[12px] text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Загрузка деталей...
            </div>
          ) : null}

          {selectedId && detailQuery.isError && !selected ? (
            <div className="flex h-full min-h-[320px] items-center justify-center px-4 text-center text-[12px] text-muted-foreground">
              {detailQuery.error instanceof Error ? detailQuery.error.message : 'Не удалось загрузить детали события.'}
            </div>
          ) : null}

          {selected ? (
            <div className="space-y-4 p-4">
              <div>
                <div className="mb-1 flex items-center justify-between gap-2">
                  <h2 className="text-[14px] font-medium text-foreground">
                    INTEG-{shortId(selected.id)}
                  </h2>
                  <EventStatusPill status={selected.status} />
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {CHANNEL_LABEL[selected.channel]} · {formatDateTime(selected.receivedAt)}
                </div>
              </div>

              {actionSuccess ? (
                <Alert className="py-2 px-3">
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertTitle className="text-[12px]">Операция выполнена</AlertTitle>
                  <AlertDescription className="text-[11px] mt-0.5">{actionSuccess}</AlertDescription>
                </Alert>
              ) : null}

              {actionError ? (
                <Alert variant="destructive" className="py-2 px-3">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle className="text-[12px]">Операция не выполнена</AlertTitle>
                  <AlertDescription className="text-[11px] mt-0.5">{actionError}</AlertDescription>
                </Alert>
              ) : null}

              {selected.errorMessage ? (
                <Alert variant="destructive" className="py-2 px-3">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle className="text-[12px]">Ошибка обработки</AlertTitle>
                  <AlertDescription className="text-[11px] mt-0.5">
                    {selected.errorMessage}
                  </AlertDescription>
                </Alert>
              ) : null}

              <section className="rounded border border-border/60 bg-white">
                <div className="border-b border-border/60 px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Метаданные
                </div>
                <dl className="space-y-1 px-3 py-2.5 text-[12px]">
                  <Row label="Канал" value={CHANNEL_LABEL[selected.channel]} />
                  <Row label="Внешний ID" value={selected.externalId ?? '—'} mono />
                  <Row label="ID корреляции" value={selected.correlationId ?? '—'} mono />
                  <Row label="Ключ идемпотентности" value={selected.idempotencyKey} mono />
                  <Row label="Количество повторов" value={String(selected.retryCount)} />
                  <Row label="Обработано" value={formatDateTime(selected.processedAt)} />
                  <Row label="Переобработано" value={formatDateTime(selected.replayedAt)} />
                  <Row label="Лид" value={selected.relatedLeadId ?? '—'} mono />
                </dl>
              </section>

              <section className="rounded border border-border/60 bg-white">
                <div className="border-b border-border/60 px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Повтор / повторная обработка
                </div>
                <div className="space-y-2 px-3 py-2.5">
                  <Textarea
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                    placeholder="Причина повтора/повторной обработки (опционально)"
                    className="min-h-[72px] text-[12px]"
                    disabled={busy}
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      className="gap-1"
                      variant="outline"
                      disabled={!canRecover || busy}
                      onClick={() => void runRecovery('retry')}
                    >
                      <RefreshCw className="h-3.5 w-3.5" /> Повтор
                    </Button>
                    <Button
                      size="sm"
                      className="gap-1"
                      disabled={!canRecover || busy}
                      onClick={() => void runRecovery('replay')}
                    >
                      <RotateCcw className="h-3.5 w-3.5" /> Переобработать
                    </Button>
                    {selected.relatedLeadId ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="gap-1 text-[#2a6af0] hover:bg-[#e7f1ff] hover:text-[#2a6af0]"
                        onClick={openLeadWorkspace}
                      >
                        <ExternalLink className="h-3.5 w-3.5" /> Открыть лид
                      </Button>
                    ) : null}
                  </div>
                  {!canRecover ? (
                    <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <ArrowRight className="h-3 w-3" /> Повтор/переобработка доступны только для событий со статусом failed.
                    </div>
                  ) : null}
                </div>
              </section>

              <section className="rounded border border-border/60 bg-white">
                <div className="border-b border-border/60 px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Сводка данных
                </div>
                <div className="px-3 py-2.5 text-[12px]">
                  {summaryRows(selected.payloadSummary).length > 0 ? (
                    <dl className="space-y-1">
                      {summaryRows(selected.payloadSummary).map((row) => (
                        <Row key={row.key} label={row.key} value={row.value} mono={false} />
                      ))}
                    </dl>
                  ) : (
                    <div className="text-muted-foreground">Пусто</div>
                  )}
                </div>
              </section>

              <section className="rounded border border-border/60 bg-white">
                <div className="border-b border-border/60 px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Raw payload
                </div>
                <pre className="max-h-[320px] overflow-auto px-3 py-2.5 font-mono text-[10px] text-foreground/85">
                  {stringifyJson(selected.payload)}
                </pre>
              </section>
            </div>
          ) : null}
        </aside>
      </div>
        )}
      </div>
    </ListScaffold>
  );
}

function Row({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="grid grid-cols-[120px_1fr] items-start gap-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={cn('break-all text-foreground', mono && 'font-mono text-[11px]')}>
        {value}
      </dd>
    </div>
  );
}
