import { useState, type ReactNode } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  Calendar,
  CheckCircle2,
  Circle,
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '../ui/alert-dialog';
import { useLayout } from '../shell/layoutStore';
import { buildAbsoluteEntityUrl } from '../shell/routeSync';
import {
  ActionButton,
  Breadcrumb,
  DetailShell,
  NextStepLine,
  PropertyRow,
  SidebarField,
  SidebarSection,
  ToolbarPill,
  sidebarTokens,
} from '../detail/DetailShell';
import { badgeTones } from '../kanban/badgeTokens';
import {
  EntityMetaGrid,
  EntityModalHeader,
  EntitySection,
} from '../detail/EntityModalFramework';

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

const STATUS_TONE: Record<DepartureStatus, string> = {
  scheduled: badgeTones.progress,
  in_transit: badgeTones.progress,
  arrived: badgeTones.success,
  completed: badgeTones.muted,
  cancelled: badgeTones.warning,
};

const ALERT_META = {
  overdue_start: {
    title: 'Просрочен старт выезда',
    description: 'Плановое время подачи прошло, но выезд еще не зафиксирован.',
  },
  overdue_arrival: {
    title: 'Просрочено прибытие',
    description: 'Техника слишком долго в пути, нужен оперативный контроль.',
  },
  stale: {
    title: 'Выезд долго без завершения',
    description: 'После прибытия заказ не закрыт. Зафиксируйте финальный итог.',
  },
} as const;

const sidebarStatusBadgeClass =
  'inline-flex items-center gap-1 h-5 px-1.5 rounded border text-[11px]';

const headerStatusBadgeClass =
  'inline-flex items-center gap-1 h-6 px-2 rounded border text-[11px] font-medium';

type DepartureStepState = 'done' | 'current' | 'locked';

function DepartureStepMarker({
  label,
  value,
  state,
}: {
  label: string;
  value: string;
  state: DepartureStepState;
}) {
  const Icon = state === 'done' ? CheckCircle2 : state === 'current' ? Clock : Circle;
  const tone =
    state === 'done'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
      : state === 'current'
        ? 'border-blue-200 bg-blue-50 text-blue-700'
        : 'border-gray-200 bg-white text-gray-500';
  const iconTone =
    state === 'done'
      ? 'text-emerald-600'
      : state === 'current'
        ? 'text-blue-600'
        : 'text-gray-300';

  return (
    <div className={`flex min-w-0 items-start gap-2 rounded-md border px-2.5 py-2 ${tone}`}>
      <Icon className={`mt-0.5 h-3.5 w-3.5 flex-shrink-0 ${iconTone}`} />
      <div className="min-w-0">
        <div className="truncate text-[11px] font-medium leading-4">{label}</div>
        <div className="truncate text-[10px] leading-4 opacity-80">{value}</div>
      </div>
    </div>
  );
}

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

function formatDateOnly(value: string | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('ru-RU');
}

export function DepartureWorkspaceApi({ departureId, lead, onClose, onOpenClient }: Props) {
  const { setActiveSecondaryNav, openSecondaryWithEntity, activeEntityType } = useLayout();
  const query = useDepartureQuery(departureId, true);
  const startMutation = useStartDeparture();
  const arriveMutation = useArriveDeparture();
  const cancelMutation = useCancelDeparture();
  const completeMutation = useCompleteDeparture();

  const [completionNote, setCompletionNote] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [cancelOpen, setCancelOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const busy =
    startMutation.isPending
    || arriveMutation.isPending
    || cancelMutation.isPending
    || completeMutation.isPending;

  const openEntitySecondary = (
    secondaryId: string,
    entityType: 'lead' | 'application' | 'reservation' | 'departure' | 'completion',
    entityId?: string | null,
  ) => {
    if (!entityId) return false;
    openSecondaryWithEntity(secondaryId, entityType, entityId);
    return true;
  };

  const openSecondary = (secondaryId: string) => {
    setActiveSecondaryNav(secondaryId);
    onClose();
  };

  const breadcrumbItems = [
    { label: 'CRM', onClick: () => openSecondary('overview') },
    { label: 'Операции', onClick: () => openSecondary('departures') },
    { label: 'Выезд' },
  ];

  const runTransition = async (fn: () => Promise<unknown>) => {
    setActionError(null);
    try {
      await fn();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Операция не выполнена');
    }
  };

  const renderShell = (
    main: ReactNode,
    sidebar: ReactNode = <></>,
    shareUrl?: string | null,
  ) => (
    <DetailShell
      breadcrumb={<Breadcrumb items={breadcrumbItems} />}
      onClose={onClose}
      shareUrl={shareUrl}
      main={main}
      sidebar={sidebar}
    />
  );

  if (query.isPending && !query.data) {
    return renderShell(
      <div className="flex h-full min-h-[420px] items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Загрузка выезда...
      </div>,
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
      </div>,
    );
  }

  const departure = query.data;
  const linkedIds = departure.linkedIds;

  const leadEntityId = linkedIds.leadId ?? departure.linked.leadId;
  const applicationEntityId = linkedIds.applicationId ?? departure.linked.applicationId;
  const reservationEntityId = linkedIds.reservationId ?? departure.reservationId;
  const departureEntityId = linkedIds.departureId ?? departure.id;
  const completionEntityId = linkedIds.completionId ?? departure.completion?.id ?? null;

  const hasLead = !!leadEntityId;
  const hasApplication = !!applicationEntityId;
  const hasReservation = !!reservationEntityId;
  const hasCompletion = !!completionEntityId;
  const canOpenClient = !!onOpenClient && !!departure.linked.clientId;

  const activeSwitcherEntityType = activeEntityType ?? 'departure';
  const shareUrl = departureEntityId
    ? buildAbsoluteEntityUrl('departure', departureEntityId)
    : null;

  const completeAsCompletedReason = (() => {
    if (departure.status === 'cancelled') return 'Отмененный выезд нельзя завершить';
    if (departure.completion) return 'Завершение уже создано';
    if (!departure.derived.canComplete) return 'Сначала зафиксируйте прибытие';
    return null;
  })();

  const completeAsUnqualifiedReason = (() => {
    if (departure.status === 'cancelled') return 'Отмененный выезд нельзя завершить';
    if (departure.completion) return 'Завершение уже создано';
    if (!completionNote.trim()) return 'Укажите причину некачественного завершения';
    return null;
  })();

  const nextStep = (() => {
    if (departure.status === 'scheduled') {
      return {
        label: 'Зафиксировать выезд',
        reason: departure.derived.canStart ? null : 'Выезд пока нельзя стартовать',
      };
    }
    if (departure.status === 'in_transit') {
      return {
        label: 'Зафиксировать прибытие',
        reason: departure.derived.canArrive ? null : 'Прибытие пока нельзя зафиксировать',
      };
    }
    if (departure.status === 'arrived') {
      return {
        label: 'Завершить выезд',
        reason: completeAsCompletedReason,
      };
    }
    if (departure.status === 'completed') {
      return {
        label: 'Открыть завершение',
        reason: hasCompletion ? null : 'Связанное завершение не найдено',
      };
    }
    return {
      label: 'Выезд отменен',
      reason: departure.cancellationReason || 'Переходы для отмененного выезда недоступны',
    };
  })();

  const runComplete = async (outcome: CompletionOutcome) => {
    const reason = outcome === 'completed' ? completeAsCompletedReason : completeAsUnqualifiedReason;
    if (reason) {
      setActionError(reason);
      return;
    }
    await runTransition(async () => {
      const updatedDeparture = await completeMutation.mutateAsync({
        id: departure.id,
        outcome,
        completionNote: completionNote.trim() || undefined,
        unqualifiedReason:
          outcome === 'unqualified' ? completionNote.trim() : undefined,
      });
      openEntitySecondary(
        'completion',
        'completion',
        updatedDeparture.completion?.id ?? updatedDeparture.linkedIds.completionId,
      );
    });
  };

  const primaryAction = (() => {
    if (departure.status === 'scheduled') {
      return {
        label: 'Зафиксировать выезд',
        disabled: !departure.derived.canStart || busy,
        onClick: () => runTransition(() => startMutation.mutateAsync(departure.id)),
      };
    }
    if (departure.status === 'in_transit') {
      return {
        label: 'Зафиксировать прибытие',
        disabled: !departure.derived.canArrive || busy,
        onClick: () => runTransition(() => arriveMutation.mutateAsync(departure.id)),
      };
    }
    if (departure.status === 'arrived') {
      return {
        label: 'Завершить выезд',
        disabled: !!completeAsCompletedReason || busy,
        onClick: () => {
          void runComplete('completed');
        },
      };
    }
    if (departure.status === 'completed') {
      return {
        label: 'Открыть завершение',
        disabled: !hasCompletion,
        onClick: hasCompletion
          ? () => openEntitySecondary('completion', 'completion', completionEntityId)
          : undefined,
      };
    }
    return {
      label: 'Выезд отменен',
      disabled: true,
      onClick: undefined,
    };
  })();

  const stepState = (step: 'start' | 'arrival' | 'completion'): DepartureStepState => {
    if (departure.status === 'cancelled') return 'locked';
    if (step === 'start') {
      if (departure.startedAt || departure.status !== 'scheduled') return 'done';
      return 'current';
    }
    if (step === 'arrival') {
      if (departure.arrivedAt || departure.status === 'completed') return 'done';
      return departure.status === 'in_transit' ? 'current' : 'locked';
    }
    if (departure.completedAt || departure.completion) return 'done';
    return departure.status === 'arrived' ? 'current' : 'locked';
  };

  const stageSteps = [
    {
      label: 'Старт выезда',
      value: fmtIso(departure.startedAt),
      state: stepState('start'),
    },
    {
      label: 'Прибытие',
      value: fmtIso(departure.arrivedAt),
      state: stepState('arrival'),
    },
    {
      label: 'Итог',
      value: fmtIso(departure.completedAt),
      state: stepState('completion'),
    },
  ];

  const currentActionDescription = (() => {
    if (departure.status === 'scheduled') return 'Запустите выезд, когда техника фактически вышла на маршрут.';
    if (departure.status === 'in_transit') return 'Зафиксируйте прибытие после подтверждения от объекта или водителя.';
    if (departure.status === 'arrived') return 'Закройте выезд итогом после фактического выполнения работ.';
    if (departure.status === 'completed') return 'Выезд уже закрыт. Итог доступен в связанной карточке завершения.';
    return 'Выезд отменен. Новые переходы по этапу недоступны.';
  })();

  const showStagePanelAction = departure.status !== 'completed' && departure.status !== 'cancelled';

  const canCancel = departure.status !== 'completed' && departure.status !== 'cancelled';

  const entitySwitcherOptions = [
    {
      id: 'lead',
      label: 'Лид',
      active: activeSwitcherEntityType === 'lead',
      onSelect: hasLead ? () => openEntitySecondary('leads', 'lead', leadEntityId) : undefined,
      disabled: !hasLead,
    },
    {
      id: 'application',
      label: 'Заявка',
      active: activeSwitcherEntityType === 'application',
      onSelect: hasApplication
        ? () => openEntitySecondary('applications', 'application', applicationEntityId)
        : undefined,
      disabled: !hasApplication,
    },
    {
      id: 'reservation',
      label: 'Бронь',
      active: activeSwitcherEntityType === 'reservation',
      onSelect: hasReservation
        ? () => openEntitySecondary('reservations', 'reservation', reservationEntityId)
        : undefined,
      disabled: !hasReservation,
    },
    {
      id: 'departure',
      label: 'Выезд',
      active: activeSwitcherEntityType === 'departure',
      onSelect: departureEntityId
        ? () => openEntitySecondary('departures', 'departure', departureEntityId)
        : undefined,
      disabled: !departureEntityId,
    },
    {
      id: 'completed',
      label: 'Завершение',
      active: activeSwitcherEntityType === 'completion',
      onSelect: hasCompletion
        ? () => openEntitySecondary('completion', 'completion', completionEntityId)
        : undefined,
      disabled: !hasCompletion,
    },
  ];

  const main = (
    <div className="mx-auto max-w-[820px] px-8 pb-10 pt-6">
      <EntityModalHeader
        entityIcon={<Truck className="h-3 w-3" />}
        entityLabel="Выезд"
        entitySwitcherOptions={entitySwitcherOptions}
        title={`DEP-${departure.id.slice(0, 8).toUpperCase()}`}
        subtitle={
          <>
            <button
              type="button"
              className="text-blue-600 hover:underline disabled:cursor-not-allowed disabled:text-gray-500 disabled:no-underline"
              onClick={() => openEntitySecondary('applications', 'application', applicationEntityId)}
              disabled={!hasApplication}
            >
              {departure.linked.applicationNumber
                ?? `APP-${departure.linked.applicationId.slice(0, 8).toUpperCase()}`}
            </button>{' '}
            ·{' '}
            <button
              type="button"
              className="text-blue-600 hover:underline disabled:cursor-not-allowed disabled:text-gray-500 disabled:no-underline"
              onClick={canOpenClient ? () => onOpenClient(lead) : undefined}
              disabled={!canOpenClient}
            >
              {departure.linked.clientCompany ?? departure.linked.clientName ?? '—'}
            </button>{' '}
            · {departure.linked.positionLabel}
          </>
        }
        chips={[
          <span key="status" className={`${headerStatusBadgeClass} ${STATUS_TONE[departure.status]}`}>
            {STATUS_LABEL[departure.status]}
          </span>,
          <ToolbarPill
            key="planned"
            icon={<Calendar className="h-3 w-3" />}
            label={formatDateOnly(departure.scheduledAt)}
          />,
          <ToolbarPill
            key="manager"
            icon={<UserPlus className="h-3 w-3" />}
            label={departure.linked.responsibleManagerName ?? '—'}
          />,
          ...(departure.derived.alert !== 'none'
            ? [
                <span key="alert" className={`${headerStatusBadgeClass} ${badgeTones.warning}`}>
                  <AlertTriangle className="h-3 w-3" />
                  Внимание
                </span>,
              ]
            : []),
        ]}
        primaryAction={{
          label: primaryAction.label,
          render: (
            <Button
              size="sm"
              className="h-7 gap-1 bg-blue-600 text-[11px] text-white hover:bg-blue-700"
              disabled={primaryAction.disabled}
              onClick={primaryAction.onClick}
            >
              {primaryAction.label}
              <ArrowRight className="h-3 w-3" />
            </Button>
          ),
        }}
        secondaryAction={{
          label: 'Отменить выезд',
          render: (
            <AlertDialog open={cancelOpen} onOpenChange={setCancelOpen}>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="outline" className="h-7 text-[11px]" disabled={!canCancel || busy}>
                  Отменить выезд
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Отменить выезд?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Выезд перейдет в терминальный статус, действие попадет в аудит и заблокирует дальнейшие переходы.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <Textarea
                  value={cancelReason}
                  onChange={(event) => setCancelReason(event.target.value)}
                  placeholder="Причина отмены"
                  className="text-[12px]"
                />
                <AlertDialogFooter>
                  <AlertDialogCancel>Отмена</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => {
                      void runTransition(() =>
                        cancelMutation.mutateAsync({
                          id: departure.id,
                          reason: cancelReason.trim() || undefined,
                        }),
                      );
                    }}
                  >
                    Отменить выезд
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ),
        }}
        className="mb-5"
      />

      <NextStepLine className="mb-4" label={nextStep.label} reason={nextStep.reason} />

      {departure.derived.alert !== 'none' ? (
        <Alert className="mb-5 px-3 py-2" variant={departure.derived.alert === 'stale' ? 'default' : 'destructive'}>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle className="text-[12px]">{ALERT_META[departure.derived.alert].title}</AlertTitle>
          <AlertDescription className="mt-0.5 text-[11px]">
            {ALERT_META[departure.derived.alert].description}
          </AlertDescription>
        </Alert>
      ) : null}

      {actionError ? (
        <Alert className="mb-5 px-3 py-2" variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertTitle className="text-[12px]">Операция не выполнена</AlertTitle>
          <AlertDescription className="mt-0.5 text-[11px]">{actionError}</AlertDescription>
        </Alert>
      ) : null}

      <EntitySection title="План и факт" className="mb-5">
        <EntityMetaGrid>
          <PropertyRow
            icon={<Building2 className="h-3 w-3" />}
            label="Клиент"
            value={
              <button
                type="button"
                className={`${sidebarTokens.link} disabled:cursor-not-allowed disabled:text-gray-500 disabled:no-underline`}
                onClick={canOpenClient ? () => onOpenClient(lead) : undefined}
                disabled={!canOpenClient}
              >
                {departure.linked.clientCompany ?? departure.linked.clientName ?? '—'}
              </button>
            }
          />
          <PropertyRow
            icon={<UserPlus className="h-3 w-3" />}
            label="Менеджер"
            value={departure.linked.responsibleManagerName ?? '—'}
          />
          <PropertyRow
            icon={<Truck className="h-3 w-3" />}
            label="Позиция"
            value={departure.linked.positionLabel}
          />
          <PropertyRow
            icon={<Truck className="h-3 w-3" />}
            label="Техника"
            value={departure.linked.equipmentTypeLabel ?? '—'}
          />
          <PropertyRow
            icon={<MapPin className="h-3 w-3" />}
            label="Адрес"
            value={departure.linked.address ?? '—'}
          />
          <PropertyRow
            icon={<Calendar className="h-3 w-3" />}
            label="План дата"
            value={departure.linked.plannedDate ?? formatDateOnly(departure.linked.plannedStart)}
          />
          <PropertyRow
            icon={<Clock className="h-3 w-3" />}
            label="План окно"
            value={
              departure.linked.plannedTimeFrom
                ? `${departure.linked.plannedTimeFrom}${departure.linked.plannedTimeTo ? `-${departure.linked.plannedTimeTo}` : ''}`
                : '—'
            }
          />
          <PropertyRow icon={<Clock className="h-3 w-3" />} label="Старт" value={fmtIso(departure.startedAt)} />
          <PropertyRow icon={<Clock className="h-3 w-3" />} label="Прибытие" value={fmtIso(departure.arrivedAt)} />
          <PropertyRow icon={<Clock className="h-3 w-3" />} label="Завершение" value={fmtIso(departure.completedAt)} />
          <PropertyRow icon={<XCircle className="h-3 w-3" />} label="Отмена" value={fmtIso(departure.cancelledAt)} />
          <PropertyRow icon={<FileText className="h-3 w-3" />} label="Причина отмены" value={departure.cancellationReason ?? '—'} />
        </EntityMetaGrid>
      </EntitySection>

      <EntitySection title="Управление этапом" className="mb-5">
        <div className="overflow-hidden rounded-md border border-gray-200 bg-white">
          <div className="grid gap-2 border-b border-gray-200 bg-gray-50/70 p-2 sm:grid-cols-3">
            {stageSteps.map((step) => (
              <DepartureStepMarker
                key={step.label}
                label={step.label}
                value={step.value}
                state={step.state}
              />
            ))}
          </div>

          <div className="grid gap-3 p-3 lg:grid-cols-[minmax(0,1fr)_300px]">
            <div className="min-w-0 rounded-md border border-blue-100 bg-blue-50/60 p-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <div className="text-[10px] font-medium uppercase tracking-wide text-blue-700">
                    {showStagePanelAction ? 'Следующее действие' : 'Состояние этапа'}
                  </div>
                  <div className="text-[14px] font-semibold leading-5 text-gray-900">
                    {showStagePanelAction ? primaryAction.label : STATUS_LABEL[departure.status]}
                  </div>
                  <div className="max-w-[520px] text-[11px] leading-5 text-gray-600">
                    {currentActionDescription}
                  </div>
                  {nextStep.reason ? (
                    <div className="inline-flex items-center gap-1 rounded border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] text-amber-700">
                      <AlertTriangle className="h-3 w-3" />
                      {nextStep.reason}
                    </div>
                  ) : null}
                </div>
                {showStagePanelAction ? (
                  <Button
                    size="sm"
                    className="h-8 gap-1.5 bg-blue-600 text-[12px] text-white hover:bg-blue-700"
                    disabled={primaryAction.disabled}
                    onClick={primaryAction.onClick}
                  >
                    {primaryAction.label}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                ) : null}
              </div>
            </div>

            <div className="rounded-md border border-gray-200 bg-white p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <div>
                  <div className="text-[10px] font-medium uppercase tracking-wide text-gray-500">
                    Финальный исход
                  </div>
                  <div className="text-[11px] leading-5 text-gray-600">
                    Закройте выезд результатом работ
                  </div>
                </div>
                {hasCompletion ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-[11px]"
                    onClick={() => openEntitySecondary('completion', 'completion', completionEntityId)}
                  >
                    <ExternalLink className="mr-1 h-3 w-3" /> Открыть
                  </Button>
                ) : null}
              </div>

              {departure.completion ? (
                <div className="rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] leading-5 text-emerald-700">
                  Завершение уже создано: {departure.completion.outcome === 'completed' ? 'успешно' : 'некачественно'} · {fmtIso(departure.completion.completedAt)}
                </div>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 justify-start border-emerald-200 bg-emerald-50/70 text-[12px] text-emerald-800 hover:bg-emerald-50 hover:text-emerald-900"
                    onClick={() => {
                      void runComplete('completed');
                    }}
                    disabled={!!completeAsCompletedReason || busy}
                  >
                    <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Выполнен
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 justify-start border-rose-200 bg-rose-50/70 text-[12px] text-rose-800 hover:bg-rose-50 hover:text-rose-900"
                    onClick={() => {
                      void runComplete('unqualified');
                    }}
                    disabled={!!completeAsUnqualifiedReason || busy}
                  >
                    <XCircle className="mr-1 h-3.5 w-3.5" /> Некачественный
                  </Button>
                </div>
              )}
            </div>
          </div>

          {!departure.completion ? (
            <div className="border-t border-gray-200 bg-gray-50/50 p-3">
              <Textarea
                value={completionNote}
                onChange={(event) => setCompletionNote(event.target.value)}
                placeholder="Комментарий к итогу выезда"
                className="min-h-[68px] resize-none border-gray-200 bg-white text-[12px]"
                disabled={busy}
              />
              <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                {completeAsCompletedReason ? (
                  <span>Для выполненного: {completeAsCompletedReason}</span>
                ) : null}
                {completeAsUnqualifiedReason && completeAsUnqualifiedReason !== completeAsCompletedReason ? (
                  <span>Для некачественного: {completeAsUnqualifiedReason}</span>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      </EntitySection>

      <div className="mb-6 space-y-0.5">
        {hasReservation ? (
          <ActionButton
            icon={<ExternalLink className="h-3.5 w-3.5" />}
            label="Открыть бронь"
            onClick={() => openEntitySecondary('reservations', 'reservation', reservationEntityId)}
          />
        ) : null}
        {hasApplication ? (
          <ActionButton
            icon={<FileText className="h-3.5 w-3.5" />}
            label="Открыть заявку"
            onClick={() => openEntitySecondary('applications', 'application', applicationEntityId)}
          />
        ) : null}
        {hasLead ? (
          <ActionButton
            icon={<UserPlus className="h-3.5 w-3.5" />}
            label="Открыть лид"
            onClick={() => openEntitySecondary('leads', 'lead', leadEntityId)}
          />
        ) : null}
        {canOpenClient ? (
          <ActionButton
            icon={<Building2 className="h-3.5 w-3.5" />}
            label="Открыть клиента"
            onClick={() => onOpenClient(lead)}
          />
        ) : null}
      </div>
    </div>
  );

  const sidebar = (
    <>
      <SidebarSection title="Сводка">
        <SidebarField label="Статус" value={<span className={`${sidebarStatusBadgeClass} ${STATUS_TONE[departure.status]}`}>{STATUS_LABEL[departure.status]}</span>} />
        <SidebarField label="План" value={fmtIso(departure.scheduledAt)} />
        <SidebarField label="Старт" value={fmtIso(departure.startedAt)} />
        <SidebarField label="Прибытие" value={fmtIso(departure.arrivedAt)} />
        <SidebarField label="Завершен" value={fmtIso(departure.completedAt)} />
        <SidebarField label="Алерт" value={departure.derived.alert === 'none' ? 'Нет' : ALERT_META[departure.derived.alert].title} />
      </SidebarSection>

      <SidebarSection title="Связанные записи">
        <SidebarField
          label="Лид"
          value={
            <button
              type="button"
              className={`${sidebarTokens.link} disabled:cursor-not-allowed disabled:text-gray-500 disabled:no-underline`}
              disabled={!hasLead}
              onClick={() => openEntitySecondary('leads', 'lead', leadEntityId)}
            >
              {leadEntityId ? `LEAD-${leadEntityId.slice(0, 8).toUpperCase()}` : '—'}
            </button>
          }
        />
        <SidebarField
          label="Заявка"
          value={
            <button
              type="button"
              className={`${sidebarTokens.link} disabled:cursor-not-allowed disabled:text-gray-500 disabled:no-underline`}
              disabled={!hasApplication}
              onClick={() => openEntitySecondary('applications', 'application', applicationEntityId)}
            >
              {departure.linked.applicationNumber
                ?? (applicationEntityId ? `APP-${applicationEntityId.slice(0, 8).toUpperCase()}` : '—')}
            </button>
          }
        />
        <SidebarField
          label="Бронь"
          value={
            <button
              type="button"
              className={`${sidebarTokens.link} disabled:cursor-not-allowed disabled:text-gray-500 disabled:no-underline`}
              disabled={!hasReservation}
              onClick={() => openEntitySecondary('reservations', 'reservation', reservationEntityId)}
            >
              {reservationEntityId ? `RSV-${reservationEntityId.slice(0, 8).toUpperCase()}` : '—'}
            </button>
          }
        />
        <SidebarField
          label="Выезд"
          value={
            <button
              type="button"
              className={`${sidebarTokens.link} disabled:cursor-not-allowed disabled:text-gray-500 disabled:no-underline`}
              disabled={!departureEntityId}
              onClick={() => openEntitySecondary('departures', 'departure', departureEntityId)}
            >
              {departureEntityId ? `DEP-${departureEntityId.slice(0, 8).toUpperCase()}` : '—'}
            </button>
          }
        />
        <SidebarField
          label="Завершение"
          value={
            <button
              type="button"
              className={`${sidebarTokens.link} disabled:cursor-not-allowed disabled:text-gray-500 disabled:no-underline`}
              disabled={!hasCompletion}
              onClick={() => openEntitySecondary('completion', 'completion', completionEntityId)}
            >
              {completionEntityId ? `CMP-${completionEntityId.slice(0, 8).toUpperCase()}` : '—'}
            </button>
          }
        />
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
            <Truck className="mr-1 h-3 w-3" /> Зафиксировать выезд
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-6 w-full justify-start text-[11px]"
            onClick={() => runTransition(() => arriveMutation.mutateAsync(departure.id))}
            disabled={!departure.derived.canArrive || busy}
          >
            <CheckCircle2 className="mr-1 h-3 w-3" /> Зафиксировать прибытие
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-6 w-full justify-start text-[11px]"
            onClick={() => {
              void runComplete('completed');
            }}
            disabled={!!completeAsCompletedReason || busy}
          >
            <ArrowRight className="mr-1 h-3 w-3" /> Завершить выезд
          </Button>
        </div>
      </SidebarSection>
    </>
  );

  return renderShell(main, sidebar, shareUrl);
}
