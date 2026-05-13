import { useMemo, useState } from 'react';
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
  Flag,
  MapPin,
  PlayCircle,
  Truck,
  User as UserIcon,
  UserPlus,
  XCircle,
} from 'lucide-react';
import { Lead } from '../../types/kanban';
import { Departure, DepartureAlert, DepartureStatus } from '../../types/departure';
import { buildMockDeparture } from '../../data/mockDeparture';
import { USE_API } from '../../lib/featureFlags';
import { badgeTones } from '../kanban/badgeTokens';
import { Button } from '../ui/button';
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
import { Textarea } from '../ui/textarea';
import {
  ActionButton,
  Breadcrumb,
  DetailShell,
  InlineValue,
  NextStepLine,
  PropertyRow,
  SidebarField,
  SidebarSection,
  ToolbarPill,
  sidebarTokens,
} from '../detail/DetailShell';
import {
  EntityActivityList,
  EntityMetaGrid,
  EntityModalHeader,
  EntitySection,
} from '../detail/EntityModalFramework';
import { PhoneLink } from '../detail/ContactAtoms';
import { useLayout } from '../shell/layoutStore';
import { buildAbsoluteEntityUrl } from '../shell/routeSync';
import { DepartureWorkspaceApi } from './DepartureWorkspaceApi';

interface Props {
  lead: Lead;
  onClose: () => void;
  onOpenClient?: (lead: Lead) => void;
  apiDepartureId?: string;
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

const ALERT_META: Record<Exclude<DepartureAlert, 'none'>, { title: string; description: string }> = {
  overdue_start: {
    title: 'Просрочен старт выезда',
    description: 'Плановое время подачи прошло, но отправка еще не зафиксирована.',
  },
  overdue_arrival: {
    title: 'Просрочено прибытие',
    description: 'Техника слишком долго в пути. Нужна оперативная проверка статуса.',
  },
  stale: {
    title: 'Выезд долго без завершения',
    description: 'После прибытия нет финального закрытия. Зафиксируйте итог работ.',
  },
};

const STAGE_ORDER: DepartureStatus[] = [
  'scheduled',
  'in_transit',
  'arrived',
  'completed',
];

const sidebarStatusBadgeClass =
  'inline-flex items-center gap-1 h-5 px-1.5 rounded border text-[11px]';

const headerStatusBadgeClass =
  'inline-flex items-center gap-1 h-6 px-2 rounded border text-[11px] font-medium';

function nowStamp() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatFact(value?: string) {
  return value ?? '—';
}

export function DepartureWorkspace({ lead, onClose, onOpenClient, apiDepartureId }: Props) {
  if (USE_API && apiDepartureId) {
    return (
      <DepartureWorkspaceApi
        departureId={apiDepartureId}
        lead={lead}
        onClose={onClose}
        onOpenClient={onOpenClient}
      />
    );
  }

  const { setActiveSecondaryNav, openSecondaryWithEntity, activeEntityType } = useLayout();
  const base: Departure = useMemo(() => buildMockDeparture(lead), [lead]);

  const [status, setStatus] = useState<DepartureStatus>(base.status);
  const [startedAt, setStartedAt] = useState<string | undefined>(base.fact.departedAt);
  const [arrivedAt, setArrivedAt] = useState<string | undefined>(base.fact.arrivedAt);
  const [completedAt, setCompletedAt] = useState<string | undefined>(base.fact.completedAt);
  const [cancelledAt, setCancelledAt] = useState<string | undefined>(base.fact.cancelledAt);
  const [cancelReason, setCancelReason] = useState(base.fact.cancellationReason ?? '');
  const [cancelOpen, setCancelOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const leadEntityId = base.linked.leadId ?? null;
  const applicationEntityId = base.linked.applicationId ?? null;
  const reservationEntityId = base.linked.reservationId ?? null;
  const departureEntityId = apiDepartureId ?? lead.id ?? null;
  const completionEntityId = status === 'completed' ? (lead.id ?? null) : null;

  const hasLead = !!leadEntityId;
  const hasApplication = !!applicationEntityId;
  const hasReservation = !!reservationEntityId;
  const hasCompletion = !!completionEntityId;
  const canOpenClient = !!onOpenClient;

  const activeSwitcherEntityType = activeEntityType ?? 'departure';
  const shareUrl = departureEntityId
    ? buildAbsoluteEntityUrl('departure', departureEntityId)
    : null;

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

  const handleOpenLead = () => openEntitySecondary('leads', 'lead', leadEntityId);
  const handleOpenApplication = () =>
    openEntitySecondary('applications', 'application', applicationEntityId);
  const handleOpenReservation = () =>
    openEntitySecondary('reservations', 'reservation', reservationEntityId);
  const handleOpenDeparture = () =>
    openEntitySecondary('departures', 'departure', departureEntityId);
  const handleOpenCompletion = () =>
    openEntitySecondary('completion', 'completion', completionEntityId);

  const canStart = status === 'scheduled';
  const canArrive = status === 'in_transit';
  const canComplete = status === 'arrived' && !!startedAt && !!arrivedAt;
  const canCancel = status !== 'completed' && status !== 'cancelled';

  const activeAlert: DepartureAlert =
    status === 'completed' || status === 'cancelled'
      ? 'none'
      : base.alert;

  const nextStep = (() => {
    if (status === 'scheduled') {
      return {
        label: 'Зафиксировать выезд',
        reason: 'Подача техники еще не начата',
      };
    }
    if (status === 'in_transit') {
      return {
        label: 'Зафиксировать прибытие',
        reason: 'Ожидается прибытие техники на объект',
      };
    }
    if (status === 'arrived') {
      return {
        label: 'Завершить выезд',
        reason: canComplete ? null : 'Перед завершением нужно зафиксировать старт и прибытие',
      };
    }
    if (status === 'completed') {
      return {
        label: 'Открыть завершение',
        reason: hasCompletion ? null : 'Связанное завершение для выезда не найдено',
      };
    }
    return {
      label: 'Выезд отменен',
      reason: cancelReason || 'Переходы заблокированы для отмененного выезда',
    };
  })();

  const runStart = () => {
    if (!canStart) return;
    setActionError(null);
    setStartedAt((prev) => prev ?? nowStamp());
    setStatus('in_transit');
  };

  const runArrive = () => {
    if (!canArrive) return;
    setActionError(null);
    setArrivedAt((prev) => prev ?? nowStamp());
    setStatus('arrived');
  };

  const runComplete = () => {
    if (!canComplete) {
      setActionError('Нельзя завершить выезд до фиксации старта и прибытия');
      return;
    }
    setActionError(null);
    setCompletedAt((prev) => prev ?? nowStamp());
    setStatus('completed');
  };

  const runCancel = () => {
    if (!canCancel) return;
    setActionError(null);
    setStatus('cancelled');
    setCancelledAt((prev) => prev ?? nowStamp());
    setCancelOpen(false);
  };

  const primaryAction = (() => {
    if (status === 'scheduled') {
      return {
        label: 'Зафиксировать выезд',
        disabled: false,
        onClick: runStart,
      };
    }
    if (status === 'in_transit') {
      return {
        label: 'Зафиксировать прибытие',
        disabled: false,
        onClick: runArrive,
      };
    }
    if (status === 'arrived') {
      return {
        label: 'Завершить выезд',
        disabled: !canComplete,
        onClick: runComplete,
      };
    }
    if (status === 'completed') {
      return {
        label: 'Открыть завершение',
        disabled: !hasCompletion,
        onClick: hasCompletion ? handleOpenCompletion : undefined,
      };
    }
    return {
      label: 'Выезд отменен',
      disabled: true,
      onClick: undefined,
    };
  })();

  const checklist = [
    {
      label: 'Старт зафиксирован',
      done: !!startedAt,
    },
    {
      label: 'Прибытие зафиксировано',
      done: !!arrivedAt,
    },
    {
      label: 'Завершение зафиксировано',
      done: !!completedAt,
    },
    {
      label: 'Выезд не в отмене',
      done: status !== 'cancelled',
    },
  ];

  const timeline = [
    ...base.activity,
    ...(startedAt && !base.fact.departedAt
      ? [
          {
            id: 'runtime-started',
            actor: base.manager,
            message: 'Зафиксирована отправка',
            at: startedAt,
          },
        ]
      : []),
    ...(arrivedAt && !base.fact.arrivedAt
      ? [
          {
            id: 'runtime-arrived',
            actor: base.manager,
            message: 'Зафиксировано прибытие на объект',
            at: arrivedAt,
          },
        ]
      : []),
    ...(completedAt && !base.fact.completedAt
      ? [
          {
            id: 'runtime-completed',
            actor: base.manager,
            message: 'Выезд завершен',
            at: completedAt,
          },
        ]
      : []),
    ...(cancelledAt && status === 'cancelled'
      ? [
          {
            id: 'runtime-cancelled',
            actor: base.manager,
            message: `Выезд отменен${cancelReason ? ` (${cancelReason})` : ''}`,
            at: cancelledAt,
          },
        ]
      : []),
  ];

  const entitySwitcherOptions = [
    {
      id: 'lead',
      label: 'Лид',
      active: activeSwitcherEntityType === 'lead',
      onSelect: hasLead ? handleOpenLead : undefined,
      disabled: !hasLead,
    },
    {
      id: 'application',
      label: 'Заявка',
      active: activeSwitcherEntityType === 'application',
      onSelect: hasApplication ? handleOpenApplication : undefined,
      disabled: !hasApplication,
    },
    {
      id: 'reservation',
      label: 'Бронь',
      active: activeSwitcherEntityType === 'reservation',
      onSelect: hasReservation ? handleOpenReservation : undefined,
      disabled: !hasReservation,
    },
    {
      id: 'departure',
      label: 'Выезд',
      active: activeSwitcherEntityType === 'departure',
      onSelect: departureEntityId ? handleOpenDeparture : undefined,
      disabled: !departureEntityId,
    },
    {
      id: 'completed',
      label: 'Завершение',
      active: activeSwitcherEntityType === 'completion',
      onSelect: hasCompletion ? handleOpenCompletion : undefined,
      disabled: !hasCompletion,
    },
  ];

  const main = (
    <div className="mx-auto max-w-[820px] px-4 pb-10 pt-6 sm:px-6 lg:px-8">
      <EntityModalHeader
        entityIcon={<Truck className="h-3 w-3" />}
        entityLabel="Выезд"
        entitySwitcherOptions={entitySwitcherOptions}
        title={base.id}
        subtitle={
          <>
            <button
              type="button"
              onClick={handleOpenApplication}
              disabled={!hasApplication}
              className="text-blue-600 hover:underline disabled:cursor-not-allowed disabled:text-gray-500 disabled:no-underline"
            >
              {base.linked.applicationTitle}
            </button>{' '}
            ·{' '}
            <button
              type="button"
              onClick={canOpenClient ? () => onOpenClient(lead) : undefined}
              disabled={!canOpenClient}
              className="text-blue-600 hover:underline disabled:cursor-not-allowed disabled:text-gray-500 disabled:no-underline"
            >
              {base.linked.clientName}
            </button>{' '}
            · {base.linked.equipmentType}
          </>
        }
        chips={[
          <span key="status" className={`${headerStatusBadgeClass} ${STATUS_TONE[status]}`}>
            <Flag className="h-3 w-3" />
            {STATUS_LABEL[status]}
          </span>,
          <ToolbarPill key="manager" icon={<UserPlus className="h-3 w-3" />} label={base.manager} />,
          <ToolbarPill key="date" icon={<Calendar className="h-3 w-3" />} label={base.plan.plannedDate} />,
          <ToolbarPill
            key="window"
            icon={<Clock className="h-3 w-3" />}
            label={`${base.plan.plannedTimeFrom}${base.plan.plannedTimeTo ? `-${base.plan.plannedTimeTo}` : ''}`}
          />,
          ...(activeAlert !== 'none'
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
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-[11px]"
                  disabled={!canCancel}
                >
                  Отменить выезд
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Отменить выезд {base.id}?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Действие зафиксируется в журнале. Причина нужна для прозрачности команды.
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
                  <AlertDialogAction onClick={runCancel}>Отменить выезд</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ),
        }}
        className="mb-5"
      />

      <NextStepLine className="mb-4" label={nextStep.label} reason={nextStep.reason} />

      {activeAlert !== 'none' ? (
        <Alert className="mb-5 px-3 py-2" variant={activeAlert === 'stale' ? 'default' : 'destructive'}>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle className="text-[12px]">{ALERT_META[activeAlert].title}</AlertTitle>
          <AlertDescription className="mt-0.5 text-[11px]">
            {ALERT_META[activeAlert].description}
          </AlertDescription>
        </Alert>
      ) : null}

      {actionError ? (
        <Alert className="mb-5 px-3 py-2" variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertTitle className="text-[12px]">Операция недоступна</AlertTitle>
          <AlertDescription className="mt-0.5 text-[11px]">{actionError}</AlertDescription>
        </Alert>
      ) : null}

      <EntitySection title="План и контекст" className="mb-5">
        <EntityMetaGrid>
          <PropertyRow
            icon={<FileText className="h-3 w-3" />}
            label="Бронь"
            value={
              <button type="button" className={sidebarTokens.link} onClick={handleOpenReservation}>
                {base.linked.reservationTitle}
              </button>
            }
          />
          <PropertyRow
            icon={<FileText className="h-3 w-3" />}
            label="Заявка"
            value={
              <button
                type="button"
                className={`${sidebarTokens.link} disabled:cursor-not-allowed disabled:text-gray-500 disabled:no-underline`}
                onClick={handleOpenApplication}
                disabled={!hasApplication}
              >
                {base.linked.applicationTitle}
              </button>
            }
          />
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
                {base.linked.clientName}
              </button>
            }
          />
          <PropertyRow
            icon={<Truck className="h-3 w-3" />}
            label="Техника"
            value={<InlineValue>{base.linked.equipmentType}</InlineValue>}
          />
          {base.linked.equipmentUnit ? (
            <PropertyRow
              icon={<Truck className="h-3 w-3" />}
              label="Единица"
              value={<InlineValue>{base.linked.equipmentUnit}</InlineValue>}
            />
          ) : null}
          {base.linked.subcontractor ? (
            <PropertyRow
              icon={<Building2 className="h-3 w-3" />}
              label="Подрядчик"
              value={<InlineValue>{base.linked.subcontractor}</InlineValue>}
            />
          ) : null}
          <PropertyRow
            icon={<Calendar className="h-3 w-3" />}
            label="Дата и окно"
            value={
              <InlineValue>
                {base.plan.plannedDate} · {base.plan.plannedTimeFrom}
                {base.plan.plannedTimeTo ? `-${base.plan.plannedTimeTo}` : ''}
              </InlineValue>
            }
          />
          <PropertyRow
            icon={<MapPin className="h-3 w-3" />}
            label="Адрес"
            value={<InlineValue>{base.plan.address}</InlineValue>}
          />
          {base.plan.contactName ? (
            <PropertyRow
              icon={<UserIcon className="h-3 w-3" />}
              label="Контакт"
              value={<InlineValue>{base.plan.contactName}</InlineValue>}
            />
          ) : null}
          {base.plan.contactPhone ? (
            <PropertyRow
              icon={<UserPlus className="h-3 w-3" />}
              label="Телефон"
              value={<PhoneLink value={base.plan.contactPhone} />}
            />
          ) : null}
        </EntityMetaGrid>
      </EntitySection>

      <EntitySection title="Управление этапом" className="mb-5">
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={runStart} disabled={!canStart}>
              <PlayCircle className="mr-1 h-3.5 w-3.5" /> Зафиксировать выезд
            </Button>
            <Button size="sm" variant="outline" onClick={runArrive} disabled={!canArrive}>
              <Flag className="mr-1 h-3.5 w-3.5" /> Зафиксировать прибытие
            </Button>
            <Button size="sm" variant="outline" onClick={runComplete} disabled={!canComplete}>
              <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Завершить выезд
            </Button>
            <Button size="sm" variant="outline" onClick={handleOpenCompletion} disabled={!hasCompletion}>
              <ExternalLink className="mr-1 h-3.5 w-3.5" /> Открыть завершение
            </Button>
          </div>

          <div className="rounded-md border border-gray-200 bg-white px-3 py-2">
            {checklist.map((item) => (
              <div key={item.label} className="flex items-center gap-1.5 py-0.5 text-[11px]">
                {item.done ? (
                  <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0 text-emerald-500" />
                ) : (
                  <Circle className="h-3.5 w-3.5 flex-shrink-0 text-gray-300" />
                )}
                <span className={item.done ? 'text-gray-700' : 'text-gray-500'}>{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </EntitySection>

      <EntitySection title="План / факт" className="mb-5">
        <EntityMetaGrid>
          <PropertyRow icon={<Clock className="h-3 w-3" />} label="Старт" value={formatFact(startedAt)} />
          <PropertyRow icon={<Clock className="h-3 w-3" />} label="Прибытие" value={formatFact(arrivedAt)} />
          <PropertyRow icon={<Clock className="h-3 w-3" />} label="Завершение" value={formatFact(completedAt)} />
          <PropertyRow icon={<XCircle className="h-3 w-3" />} label="Отмена" value={formatFact(cancelledAt)} />
        </EntityMetaGrid>
      </EntitySection>

      {base.comment ? (
        <EntitySection title="Комментарий" className="mb-5">
          <div className="text-[11px] leading-relaxed text-gray-700">{base.comment}</div>
        </EntitySection>
      ) : null}

      <div className="mb-6 space-y-0.5">
        <ActionButton icon={<FileText className="h-3.5 w-3.5" />} label="Открыть бронь" onClick={hasReservation ? handleOpenReservation : undefined} />
        <ActionButton icon={<FileText className="h-3.5 w-3.5" />} label="Открыть заявку" onClick={hasApplication ? handleOpenApplication : undefined} />
        <ActionButton icon={<Building2 className="h-3.5 w-3.5" />} label="Открыть клиента" onClick={canOpenClient ? () => onOpenClient(lead) : undefined} />
        {hasLead ? (
          <ActionButton icon={<UserPlus className="h-3.5 w-3.5" />} label="Открыть лид" onClick={handleOpenLead} />
        ) : null}
      </div>

      <EntitySection title="Журнал изменений">
        <EntityActivityList
          entries={timeline.map((item) => ({
            id: item.id,
            actor: item.actor,
            text: item.message,
            time: item.at,
          }))}
          emptyText="Событий пока нет"
        />
      </EntitySection>
    </div>
  );

  const sidebar = (
    <>
      <SidebarSection title="Сводка">
        <SidebarField
          label="Статус"
          value={<span className={`${sidebarStatusBadgeClass} ${STATUS_TONE[status]}`}>{STATUS_LABEL[status]}</span>}
        />
        <SidebarField label="Менеджер" value={base.manager} />
        <SidebarField label="Создан" value={base.createdAt} />
        <SidebarField label="Обновлен" value={base.updatedAt} />
        <SidebarField
          label="Алерт"
          value={activeAlert === 'none' ? 'Нет' : ALERT_META[activeAlert].title}
        />
      </SidebarSection>

      <SidebarSection title="Этапы">
        <div className="space-y-0.5">
          {STAGE_ORDER.map((stage) => {
            const currentIndex = STAGE_ORDER.indexOf(status === 'cancelled' ? 'arrived' : status);
            const stageIndex = STAGE_ORDER.indexOf(stage);
            const passed = stageIndex < currentIndex;
            const active = stage === status;
            return (
              <div
                key={stage}
                className={`flex items-center gap-1.5 rounded px-1.5 py-0.5 text-[11px] ${
                  active ? 'font-medium text-gray-700' : passed ? 'text-gray-700' : 'text-gray-500'
                }`}
              >
                {active || passed ? (
                  <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                ) : (
                  <Circle className="h-3 w-3 text-gray-300" />
                )}
                <span>{STATUS_LABEL[stage]}</span>
              </div>
            );
          })}
          {status === 'cancelled' ? (
            <div className="flex items-center gap-1.5 rounded px-1.5 py-0.5 text-[11px] text-rose-700">
              <XCircle className="h-3 w-3" />
              <span>Отменен</span>
            </div>
          ) : null}
        </div>
      </SidebarSection>

      <SidebarSection title="План / факт">
        <SidebarField label="Дата" value={base.plan.plannedDate} />
        <SidebarField
          label="Окно"
          value={`${base.plan.plannedTimeFrom}${base.plan.plannedTimeTo ? `-${base.plan.plannedTimeTo}` : ''}`}
        />
        <SidebarField label="Старт" value={formatFact(startedAt)} />
        <SidebarField label="Прибытие" value={formatFact(arrivedAt)} />
        <SidebarField label="Завершение" value={formatFact(completedAt)} />
        <SidebarField label="Отмена" value={formatFact(cancelledAt)} />
      </SidebarSection>

      <SidebarSection title="Связанные записи">
        <SidebarField
          label="Лид"
          value={
            <button
              type="button"
              className={`${sidebarTokens.link} disabled:cursor-not-allowed disabled:text-gray-500 disabled:no-underline`}
              onClick={handleOpenLead}
              disabled={!hasLead}
            >
              {hasLead ? base.linked.leadTitle : '—'}
            </button>
          }
        />
        <SidebarField
          label="Заявка"
          value={
            <button
              type="button"
              className={`${sidebarTokens.link} disabled:cursor-not-allowed disabled:text-gray-500 disabled:no-underline`}
              onClick={handleOpenApplication}
              disabled={!hasApplication}
            >
              {base.linked.applicationTitle}
            </button>
          }
        />
        <SidebarField
          label="Бронь"
          value={
            <button
              type="button"
              className={`${sidebarTokens.link} disabled:cursor-not-allowed disabled:text-gray-500 disabled:no-underline`}
              onClick={handleOpenReservation}
              disabled={!hasReservation}
            >
              {base.linked.reservationTitle}
            </button>
          }
        />
        <SidebarField
          label="Выезд"
          value={
            <button
              type="button"
              className={`${sidebarTokens.link} disabled:cursor-not-allowed disabled:text-gray-500 disabled:no-underline`}
              onClick={handleOpenDeparture}
              disabled={!departureEntityId}
            >
              {base.id}
            </button>
          }
        />
        <SidebarField
          label="Завершение"
          value={
            <button
              type="button"
              className={`${sidebarTokens.link} disabled:cursor-not-allowed disabled:text-gray-500 disabled:no-underline`}
              onClick={handleOpenCompletion}
              disabled={!hasCompletion}
            >
              {hasCompletion ? `CMP-${completionEntityId?.slice(0, 8).toUpperCase()}` : '—'}
            </button>
          }
        />
      </SidebarSection>

      <SidebarSection title="Быстрые действия" defaultOpen={false}>
        <div className="space-y-1">
          <Button size="sm" variant="outline" className="h-6 w-full justify-start text-[11px]" onClick={runStart} disabled={!canStart}>
            <PlayCircle className="mr-1 h-3 w-3" /> Зафиксировать выезд
          </Button>
          <Button size="sm" variant="outline" className="h-6 w-full justify-start text-[11px]" onClick={runArrive} disabled={!canArrive}>
            <Flag className="mr-1 h-3 w-3" /> Зафиксировать прибытие
          </Button>
          <Button size="sm" variant="outline" className="h-6 w-full justify-start text-[11px]" onClick={runComplete} disabled={!canComplete}>
            <CheckCircle2 className="mr-1 h-3 w-3" /> Завершить выезд
          </Button>
        </div>
      </SidebarSection>
    </>
  );

  return (
    <DetailShell
      breadcrumb={<Breadcrumb items={breadcrumbItems} />}
      onClose={onClose}
      shareUrl={shareUrl}
      main={main}
      sidebar={sidebar}
    />
  );
}
