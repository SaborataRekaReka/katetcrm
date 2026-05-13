import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  Loader2,
  RefreshCw,
  RotateCcw,
} from 'lucide-react';
import { ListScaffold } from '../shell/ListScaffold';
import { SimpleToolbar } from '../shell/SimpleToolbar';
import { getModuleMeta } from '../shell/navConfig';
import { useLayout } from '../shell/layoutStore';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { cn } from '../ui/utils';
import {
  useIntegrationEventQuery,
  useIntegrationEventsQuery,
} from '../../hooks/useIntegrationsQuery';
import {
  useReplayIntegrationEvent,
  useRetryIntegrationEvent,
} from '../../hooks/useIntegrationsMutations';
import type {
  IntegrationChannel,
  IntegrationEventApi,
  IntegrationEventStatus,
} from '../../lib/integrationsApi';

type PeriodFilter = 'all' | '24h' | '7d' | '30d';

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

export function IntegrationsWorkspacePage() {
  const { setActivePrimaryNav, setActiveSecondaryNav } = useLayout();
  const meta = getModuleMeta('integrations');

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

  const eventsQuery = useIntegrationEventsQuery(listParams, true);
  const retryMutation = useRetryIntegrationEvent();
  const replayMutation = useReplayIntegrationEvent();

  const rows = eventsQuery.data?.items ?? [];

  useEffect(() => {
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
  }, [rows, selectedId]);

  const detailQuery = useIntegrationEventQuery(selectedId, !!selectedId);
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

  const toolbar = (
    <SimpleToolbar
      searchPlaceholder={meta.searchPlaceholder}
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
  );

  return (
    <ListScaffold toolbar={toolbar}>
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
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
