import { useMemo, useState, type ReactNode } from 'react';
import {
  AlertTriangle,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileText,
  Loader2,
  MapPin,
  Truck,
  UserPlus,
  XCircle,
} from 'lucide-react';
import type { Lead } from '../../types/kanban';
import type { CompletionOutcome, DepartureStatus } from '../../lib/departuresApi';
import { useDepartureQuery } from '../../hooks/useDeparturesQuery';
import {
  useArriveDeparture,
  useCancelDeparture,
  useCompleteDeparture,
  useStartDeparture,
} from '../../hooks/useDepartureMutations';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { useLayout } from '../shell/layoutStore';
import {
  ActionButton,
  Breadcrumb,
  DetailShell,
  NextStepLine,
  PropertyRow,
  SidebarField,
  SidebarSection,
  ToolbarPill,
} from '../detail/DetailShell';
import { EntityMetaGrid, EntityModalHeader, EntitySection } from '../detail/EntityModalFramework';

interface Props {
  departureId: string;
  lead: Lead;
  onClose: () => void;
  onOpenClient?: (lead: Lead) => void;
}

const STATUS_LABEL: Record<DepartureStatus, string> = {
  scheduled: 'Запланирован',
  in_transit: 'В пути',
  arrived: 'Прибыл на объект',
  completed: 'Завершен',
  cancelled: 'Отменен',
};

const ALERT_LABEL = {
  overdue_start: 'Просрочен старт',
  overdue_arrival: 'Просрочено прибытие',
  stale: 'Долго без завершения',
} as const;

function fmtIso(value: string | null | undefined): string {
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

function statusTone(status: DepartureStatus): string {
  if (status === 'completed') return 'bg-emerald-100 text-emerald-700 border-emerald-200';
  if (status === 'cancelled') return 'bg-rose-100 text-rose-700 border-rose-200';
  return 'bg-blue-100 text-blue-700 border-blue-200';
}

function nextStepLabel(status: DepartureStatus): string {
  if (status === 'scheduled') return 'Зафиксировать выезд';
  if (status === 'in_transit') return 'Зафиксировать прибытие';
  if (status === 'arrived') return 'Завершить выезд';
  return 'Процесс завершён';
}

export function DepartureWorkspaceApi({ departureId, lead, onClose, onOpenClient }: Props) {
  const { setActiveSecondaryNav } = useLayout();
  const query = useDepartureQuery(departureId, true);
  const startMutation = useStartDeparture();
  const arriveMutation = useArriveDeparture();
  const cancelMutation = useCancelDeparture();
  const completeMutation = useCompleteDeparture();

  const [completionNote, setCompletionNote] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);

  const busy =
    startMutation.isPending ||
    arriveMutation.isPending ||
    cancelMutation.isPending ||
    completeMutation.isPending;

  const openSecondary = (secondaryId: string) => {
    setActiveSecondaryNav(secondaryId);
    onClose();
  };

  const completeDisabledReason = useMemo(() => {
    if (!query.data) return 'Выезд не загружен';
    if (query.data.status === 'cancelled') return 'Отмененный выезд нельзя завершить';
    if (query.data.completion) return 'Завершение уже создано';
    if (!query.data.derived.canComplete) return 'Сначала зафиксируйте прибытие';
    return null;
  }, [query.data]);

  const runTransition = async (fn: () => Promise<unknown>) => {
    setActionError(null);
    try {
      await fn();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Операция не выполнена');
    }
  };

  const handleComplete = async (outcome: CompletionOutcome) => {
    if (!query.data || completeDisabledReason) return;

    await runTransition(async () => {
      await completeMutation.mutateAsync({
        id: query.data.id,
        outcome,
        completionNote: completionNote.trim() || undefined,
        unqualifiedReason:
          outcome === 'unqualified' ? completionNote.trim() || 'manual_unqualified' : undefined,
      });
      openSecondary('completion');
    });
  };

  const renderShell = (main: ReactNode, sidebar: ReactNode = <></>) => (
    <DetailShell
      breadcrumb={<Breadcrumb items={['CRM', 'Ops', 'Departure']} />}
      onClose={onClose}
      main={main}
      sidebar={sidebar}
    />
  );

  if (query.isPending && !query.data) {
    return renderShell(
      <div className="flex h-full min-h-[420px] items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Загрузка выезда...
      </div>
    );
  }

  if (query.isError || !query.data) {
    const message = query.error instanceof Error ? query.error.message : 'Не удалось загрузить выезд';
    return renderShell(
      <div className="flex h-full min-h-[420px] flex-col items-center justify-center gap-3 px-6 text-center text-sm text-muted-foreground">
        <span>{message}</span>
        <Button size="sm" variant="outline" onClick={onClose}>
          Закрыть
        </Button>
      </div>
    );
  }

  const departure = query.data;
  const hasLeadLink = !!departure.linked.leadId;
  const hasApplicationLink = !!departure.linked.applicationId;
  const hasReservationLink = !!departure.reservationId;
  const canOpenClient = !!onOpenClient && !!departure.linked.clientId;
  const entitySwitcherOptions = [
    ...(hasLeadLink ? [{ id: 'lead', label: 'Лид', onSelect: () => openSecondary('leads') }] : []),
    ...(hasApplicationLink
      ? [{ id: 'application', label: 'Заявка', onSelect: () => openSecondary('applications') }]
      : []),
    ...(hasReservationLink
      ? [{ id: 'reservation', label: 'Бронь', onSelect: () => openSecondary('reservations') }]
      : []),
    {
      id: 'departure',
      label: 'Выезд',
      active: true,
      onSelect: () => openSecondary('departures'),
    },
    { id: 'completed', label: 'Завершение', onSelect: () => openSecondary('completion') },
  ];

  const main = (
    <div className="max-w-[820px] mx-auto px-8 pt-6 pb-10">
      <EntityModalHeader
        entityIcon={<Truck className="w-3 h-3" />}
        entityLabel="Выезд"
        entitySwitcherOptions={entitySwitcherOptions}
        title={`DEP-${departure.id.slice(0, 8).toUpperCase()}`}
        subtitle={
          <>
            <button
              type="button"
              onClick={() => openSecondary('applications')}
              disabled={!hasApplicationLink}
              className="text-blue-600 hover:underline disabled:text-gray-500 disabled:no-underline disabled:cursor-not-allowed"
            >
              {departure.linked.applicationNumber ?? `APP-${departure.linked.applicationId.slice(0, 8).toUpperCase()}`}
            </button>{' '}
            ·{' '}
            <button
              type="button"
              className="text-blue-600 hover:underline disabled:text-gray-500 disabled:no-underline disabled:cursor-not-allowed"
              onClick={onOpenClient ? () => onOpenClient(lead) : undefined}
              disabled={!canOpenClient}
            >
              {departure.linked.clientCompany ?? departure.linked.clientName ?? '—'}
            </button>{' '}
            · {departure.linked.positionLabel}
          </>
        }
        chips={[
          <span
            key="status"
            className={`inline-flex items-center rounded border px-2 py-1 text-[11px] ${statusTone(departure.status)}`}
          >
            {STATUS_LABEL[departure.status]}
          </span>,
          <ToolbarPill
            key="planned"
            icon={<Calendar className="w-3 h-3" />}
            label={departure.linked.plannedDate?.slice(0, 10) ?? departure.linked.plannedStart.slice(0, 10)}
          />,
          <ToolbarPill
            key="manager"
            icon={<UserPlus className="w-3 h-3" />}
            label={departure.linked.responsibleManagerName ?? '—'}
          />,
        ]}
        primaryAction={{
          label: 'Открыть завершение',
          iconBefore: <ExternalLink className="w-3 h-3" />,
          onClick: () => openSecondary('completion'),
        }}
      />

      <NextStepLine
        className="mt-2 mb-4"
        label={nextStepLabel(departure.status)}
        reason={completeDisabledReason}
      />

      {departure.derived.alert !== 'none' ? (
        <Alert variant="destructive" className="mb-5 py-2 px-3">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle className="text-[12px]">Нужна реакция по выезду</AlertTitle>
          <AlertDescription className="text-[11px] mt-0.5">
            {ALERT_LABEL[departure.derived.alert]}
          </AlertDescription>
        </Alert>
      ) : null}

      {actionError ? (
        <Alert variant="destructive" className="mb-5 py-2 px-3">
          <XCircle className="h-4 w-4" />
          <AlertTitle className="text-[12px]">Операция не выполнена</AlertTitle>
          <AlertDescription className="text-[11px] mt-0.5">{actionError}</AlertDescription>
        </Alert>
      ) : null}

      <EntitySection title="Переходы статуса" className="mb-5">
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            onClick={() => runTransition(() => startMutation.mutateAsync(departure.id))}
            disabled={!departure.derived.canStart || busy}
          >
            Зафиксировать выезд
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => runTransition(() => arriveMutation.mutateAsync(departure.id))}
            disabled={!departure.derived.canArrive || busy}
          >
            Зафиксировать прибытие
          </Button>
        </div>
        {!departure.derived.canStart && !departure.derived.canArrive ? (
          <div className="mt-2 text-[11px] text-muted-foreground">
            Переход недоступен для текущего статуса.
          </div>
        ) : null}
      </EntitySection>

      <EntitySection title="Завершение выезда" className="mb-5">
        <Textarea
          value={completionNote}
          onChange={(e) => setCompletionNote(e.target.value)}
          placeholder="Комментарий к завершению или причина некачественного закрытия"
          className="min-h-[72px]"
          disabled={busy}
        />
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            size="sm"
            className="gap-1"
            onClick={() => void handleComplete('completed')}
            disabled={!!completeDisabledReason || busy}
          >
            <CheckCircle2 className="h-3.5 w-3.5" /> Завершить
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => void handleComplete('unqualified')}
            disabled={!!completeDisabledReason || busy}
          >
            Пометить некачественным
          </Button>
        </div>
        {completeDisabledReason ? (
          <div className="mt-2 text-[11px] text-muted-foreground">{completeDisabledReason}</div>
        ) : null}
        {departure.completion ? (
          <div className="mt-2 text-[11px] text-emerald-700">
            Завершение уже создано: {departure.completion.outcome === 'completed' ? 'успешно' : 'некачественно'} · {fmtIso(departure.completion.completedAt)}
          </div>
        ) : null}
      </EntitySection>

      {departure.status !== 'completed' && departure.status !== 'cancelled' ? (
        <EntitySection title="Отмена выезда" className="mb-5">
          <Textarea
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            placeholder="Причина отмены"
            className="min-h-[72px]"
            disabled={busy}
          />
          <div className="mt-3">
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                runTransition(() =>
                  cancelMutation.mutateAsync({
                    id: departure.id,
                    reason: cancelReason.trim() || undefined,
                  }),
                )
              }
              disabled={busy}
            >
              Отменить выезд
            </Button>
          </div>
        </EntitySection>
      ) : null}

      <EntitySection title="План и факт" className="mb-5">
        <EntityMetaGrid>
          <PropertyRow
            icon={<Calendar className="w-3 h-3" />}
            label="Дата и окно"
            value={
              <span>
                {departure.linked.plannedDate?.slice(0, 10) ?? departure.linked.plannedStart.slice(0, 10)}
                {departure.linked.plannedTimeFrom
                  ? ` · ${departure.linked.plannedTimeFrom}${departure.linked.plannedTimeTo ? `-${departure.linked.plannedTimeTo}` : ''}`
                  : ''}
              </span>
            }
          />
          <PropertyRow
            icon={<MapPin className="w-3 h-3" />}
            label="Адрес"
            value={departure.linked.address ?? '—'}
          />
          <PropertyRow
            icon={<Building2 className="w-3 h-3" />}
            label="Клиент"
            value={
              <button
                type="button"
                className="text-blue-600 hover:underline text-left disabled:text-gray-500 disabled:no-underline disabled:cursor-not-allowed"
                onClick={canOpenClient ? () => onOpenClient(lead) : undefined}
                disabled={!canOpenClient}
              >
                {departure.linked.clientCompany ?? departure.linked.clientName ?? '—'}
              </button>
            }
          />
          <PropertyRow
            icon={<UserPlus className="w-3 h-3" />}
            label="Менеджер"
            value={departure.linked.responsibleManagerName ?? '—'}
          />
          <PropertyRow
            icon={<Clock className="w-3 h-3" />}
            label="Старт"
            value={fmtIso(departure.startedAt)}
          />
          <PropertyRow
            icon={<Clock className="w-3 h-3" />}
            label="Прибытие"
            value={fmtIso(departure.arrivedAt)}
          />
        </EntityMetaGrid>
      </EntitySection>

      <div className="space-y-0.5 mb-6">
        {hasReservationLink && (
          <ActionButton
            icon={<ExternalLink className="w-3.5 h-3.5" />}
            label="Открыть бронь"
            onClick={() => openSecondary('reservations')}
          />
        )}
        {hasApplicationLink && (
          <ActionButton
            icon={<FileText className="w-3.5 h-3.5" />}
            label="Открыть заявку"
            onClick={() => openSecondary('applications')}
          />
        )}
        <ActionButton
          icon={<CheckCircle2 className="w-3.5 h-3.5" />}
          label="Открыть завершения"
          onClick={() => openSecondary('completion')}
        />
        {hasLeadLink && (
          <ActionButton
            icon={<UserPlus className="w-3.5 h-3.5" />}
            label="Открыть лид"
            onClick={() => openSecondary('leads')}
          />
        )}
        {canOpenClient && (
          <ActionButton
            icon={<Building2 className="w-3.5 h-3.5" />}
            label="Открыть клиента"
            onClick={() => onOpenClient(lead)}
          />
        )}
      </div>
    </div>
  );

  const sidebar = (
    <>
      <SidebarSection title="Сводка">
        <SidebarField label="Статус" value={STATUS_LABEL[departure.status]} />
        <SidebarField
          label="Алерт"
          value={departure.derived.alert === 'none' ? 'Нет' : ALERT_LABEL[departure.derived.alert]}
        />
        <SidebarField label="План" value={fmtIso(departure.scheduledAt)} />
        <SidebarField label="Старт" value={fmtIso(departure.startedAt)} />
        <SidebarField label="Прибытие" value={fmtIso(departure.arrivedAt)} />
        <SidebarField label="Завершён" value={fmtIso(departure.completedAt)} />
      </SidebarSection>

      <SidebarSection title="Связанные записи">
        {hasReservationLink && (
          <SidebarField
            label="Бронь"
            value={
              <button
                type="button"
                className="text-blue-600 hover:underline text-left"
                onClick={() => openSecondary('reservations')}
              >
                RSV-{departure.reservationId.slice(0, 8).toUpperCase()}
              </button>
            }
          />
        )}
        {hasApplicationLink && (
          <SidebarField
            label="Заявка"
            value={
              <button
                type="button"
                className="text-blue-600 hover:underline text-left"
                onClick={() => openSecondary('applications')}
              >
                {departure.linked.applicationNumber ?? `APP-${departure.linked.applicationId.slice(0, 8).toUpperCase()}`}
              </button>
            }
          />
        )}
        {canOpenClient && (
          <SidebarField
            label="Клиент"
            value={
              <button
                type="button"
                className="text-blue-600 hover:underline text-left"
                onClick={() => onOpenClient(lead)}
              >
                {departure.linked.clientCompany ?? departure.linked.clientName ?? '—'}
              </button>
            }
          />
        )}
      </SidebarSection>

      <SidebarSection title="Быстрые действия" defaultOpen={false}>
        <div className="space-y-1">
          <Button
            size="sm"
            variant="outline"
            className="h-6 w-full justify-start text-[11px]"
            onClick={() => runTransition(() => startMutation.mutateAsync(departure.id))}
            disabled={!departure.derived.canStart || busy}
          >
            <Truck className="w-3 h-3 mr-1" /> Зафиксировать выезд
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-6 w-full justify-start text-[11px]"
            onClick={() => runTransition(() => arriveMutation.mutateAsync(departure.id))}
            disabled={!departure.derived.canArrive || busy}
          >
            <CheckCircle2 className="w-3 h-3 mr-1" /> Зафиксировать прибытие
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-6 w-full justify-start text-[11px]"
            onClick={() => openSecondary('completion')}
          >
            <ExternalLink className="w-3 h-3 mr-1" /> Открыть завершения
          </Button>
        </div>
      </SidebarSection>
    </>
  );

  return renderShell(main, sidebar);
}
