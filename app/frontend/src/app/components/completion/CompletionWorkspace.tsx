import { useMemo, useState } from 'react';
import {
  FileText,
  ChevronDown,
  Truck,
  Building2,
  Wrench,
  UserPlus,
  Calendar,
  Clock,
  MapPin,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Circle,
  ArrowRight,
  Copy,
  Activity,
  ExternalLink,
  XCircle,
  Phone,
  User as UserIcon,
  PlayCircle,
  Flag,
  Package,
  Edit3,
} from 'lucide-react';
import { Lead } from '../../types/kanban';
import { Completion, CompletionStatus } from '../../types/completion';
import { buildMockCompletion } from '../../data/mockCompletion';
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
  DetailShell,
  Breadcrumb,
  ToolbarPill,
  PropertyRow,
  InlineValue,
  SidebarSection,
  SidebarField,
  ActionButton,
  NextStepLine,
  sidebarTokens,
} from '../detail/DetailShell';
import {
  EntityActivityList,
  EntityModalHeader,
  EntitySection,
  type EntityModalAction,
} from '../detail/EntityModalFramework';
import { PhoneLink } from '../detail/ContactAtoms';
import { useLayout } from '../shell/layoutStore';
import { buildAbsoluteEntityUrl } from '../shell/routeSync';
import { CompletionWorkspaceApi } from './CompletionWorkspaceApi';

interface Props {
  lead: Lead;
  onClose: () => void;
  onOpenClient?: (lead: Lead) => void;
  apiCompletionId?: string;
  apiDepartureId?: string;
}

const statusLabel: Record<CompletionStatus, string> = {
  ready_to_complete: 'Готов к завершению',
  blocked: 'Завершение заблокировано',
  completed: 'Завершён',
  unqualified: 'Некачественный',
};

const statusTone: Record<CompletionStatus, string> = {
  ready_to_complete: badgeTones.progress,
  blocked: badgeTones.warning,
  completed: badgeTones.success,
  unqualified: badgeTones.muted,
};

const sidebarStatusBadgeClass =
  'inline-flex items-center gap-1 h-5 px-1.5 rounded border text-[11px]';

const headerStatusBadgeClass =
  'inline-flex items-center gap-1 h-6 px-2 rounded border text-[11px] font-medium';

const alertMeta = {
  stale: {
    title: 'Заказ давно не завершён',
    label: 'Ждёт завершения',
    tone: badgeTones.caution,
    description: 'Прибытие зафиксировано, но менеджер не закрыл заказ. Проверьте статус работ.',
  },
  missing_arrival: {
    title: 'Нет фиксации прибытия',
    label: 'Нет прибытия',
    tone: badgeTones.warning,
    description: 'Прибытие на объект не зафиксировано. Завершение заказа недоступно.',
  },
  reservation_mismatch: {
    title: 'Расхождение с бронью',
    label: 'Расхождение',
    tone: badgeTones.warning,
    description: 'Бронь не соответствует завершаемому выезду. Проверьте связанные записи.',
  },
};

function nowStamp() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function CompletionWorkspace({
  lead,
  onClose,
  onOpenClient,
  apiCompletionId,
  apiDepartureId,
}: Props) {
  if (USE_API && (apiCompletionId || apiDepartureId)) {
    return (
      <CompletionWorkspaceApi
        lead={lead}
        completionId={apiCompletionId}
        departureId={apiDepartureId}
        onClose={onClose}
        onOpenClient={onOpenClient}
      />
    );
  }

  const { setActiveSecondaryNav, openSecondaryWithEntity, activeEntityType } = useLayout();
  const base: Completion = useMemo(() => buildMockCompletion(lead), [lead]);

  const [status, setStatus] = useState<CompletionStatus>(base.status);
  const [completedAt, setCompletedAt] = useState<string | undefined>(base.fact.completedAt);
  const [completedBy, setCompletedBy] = useState<string | undefined>(base.fact.completedBy);
  const [completionNote, setCompletionNote] = useState<string>(base.fact.completionNote ?? '');
  const [noteEditing, setNoteEditing] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [unqualifyOpen, setUnqualifyOpen] = useState(false);
  const [unqualifyReason, setUnqualifyReason] = useState<string>(base.fact.unqualifiedReason ?? '');

  const linked = base.linked;
  const ctx = base.context;
  const leadEntityId = linked.leadId ?? null;
  const applicationEntityId = linked.applicationId ?? null;
  const reservationEntityId = linked.reservationId ?? null;
  const departureEntityId = linked.departureId ?? apiDepartureId ?? null;
  const completionEntityId = apiCompletionId ?? lead.id ?? null;
  const hasLinkedLead = !!leadEntityId;
  const hasLinkedApplication = !!applicationEntityId;
  const hasLinkedReservation = !!reservationEntityId;
  const hasLinkedDeparture = !!departureEntityId;
  const hasLinkedCompletion = !!completionEntityId;
  const canOpenClient = !!onOpenClient;
  const activeSwitcherEntityType = activeEntityType ?? 'completion';
  const shareUrl = completionEntityId
    ? buildAbsoluteEntityUrl('completion', completionEntityId)
    : null;

  const openSecondary = (secondaryId: string) => {
    setActiveSecondaryNav(secondaryId);
    onClose();
  };

  const openEntitySecondary = (
    secondaryId: string,
    entityType: 'lead' | 'application' | 'reservation' | 'departure' | 'completion',
    entityId?: string | null,
  ) => {
    if (!entityId) return false;
    openSecondaryWithEntity(secondaryId, entityType, entityId);
    return true;
  };

  const breadcrumbItems = [
    { label: 'CRM', onClick: () => openSecondary('overview') },
    { label: 'Операции', onClick: () => openSecondary('completion') },
    { label: 'Завершение' },
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
  const entitySwitcherOptions = [
    {
      id: 'lead',
      label: 'Лид',
      active: activeSwitcherEntityType === 'lead',
      onSelect: hasLinkedLead ? handleOpenLead : undefined,
      disabled: !hasLinkedLead,
    },
    {
      id: 'application',
      label: 'Заявка',
      active: activeSwitcherEntityType === 'application',
      onSelect: hasLinkedApplication ? handleOpenApplication : undefined,
      disabled: !hasLinkedApplication,
    },
    {
      id: 'reservation',
      label: 'Бронь',
      active: activeSwitcherEntityType === 'reservation',
      onSelect: hasLinkedReservation ? handleOpenReservation : undefined,
      disabled: !hasLinkedReservation,
    },
    {
      id: 'departure',
      label: 'Выезд',
      active: activeSwitcherEntityType === 'departure',
      onSelect: hasLinkedDeparture ? handleOpenDeparture : undefined,
      disabled: !hasLinkedDeparture,
    },
    {
      id: 'completed',
      label: 'Завершение',
      active: activeSwitcherEntityType === 'completion',
      onSelect: hasLinkedCompletion ? handleOpenCompletion : undefined,
      disabled: !hasLinkedCompletion,
    },
  ];

  // Readiness checks
  const readinessChecks: { label: string; ok: boolean; hint?: string }[] = [
    { label: 'Выезд существует', ok: !!linked.departureId },
    { label: 'Отправка зафиксирована', ok: !!ctx.departedAt, hint: 'Вернитесь в выезд и зафиксируйте отправку' },
    { label: 'Прибытие зафиксировано', ok: !!ctx.arrivedAt, hint: 'Зафиксируйте прибытие на объект' },
    { label: 'Бронь связана', ok: !!linked.reservationId },
  ];
  const completionChecks: { label: string; ok: boolean; hint?: string }[] = [
    ...readinessChecks,
    { label: 'Заказ ещё не завершён', ok: status !== 'completed' },
  ];
  const ready = completionChecks.every((c) => c.ok);
  const blockingReason = completionChecks.find((c) => !c.ok)?.hint ?? 'Не все условия выполнены';

  const isFinal = status === 'completed' || status === 'unqualified';
  const isCompleted = status === 'completed';

  // Primary CTA — single next step, synced across header, sidebar, helper
  const primary = (() => {
    if (status === 'completed') {
      return { label: 'Заказ завершён', onClick: undefined, disabled: true, reason: null as string | null };
    }
    if (status === 'unqualified') {
      return { label: 'Помечен некачественным', onClick: undefined, disabled: true, reason: null };
    }
    if (!ready) {
      return {
        label: 'Завершить заказ',
        onClick: undefined,
        disabled: true,
        reason: blockingReason,
      };
    }
    return {
      label: 'Завершить заказ',
      onClick: () => setConfirmOpen(true),
      disabled: false,
      reason: null,
    };
  })();

  const handleConfirmComplete = () => {
    setCompletedAt(nowStamp());
    setCompletedBy(base.manager);
    setStatus('completed');
    setConfirmOpen(false);
  };

  const handleUnqualify = () => {
    setStatus('unqualified');
    setUnqualifyOpen(false);
  };

  const historyEntries = [
    ...base.activity.map((a) => ({
      id: a.id,
      actor: a.actor,
      text: a.message,
      time: a.at,
    })),
    ...(status === 'completed' && !base.activity.some((a) => a.kind === 'completed') && completedAt
      ? [
          {
            id: 'runtime-completed',
            actor: completedBy ?? base.manager,
            text: 'Заказ завершен',
            time: completedAt,
          },
        ]
      : []),
  ];

  const main = (
    <div className="max-w-[820px] mx-auto px-8 pt-6 pb-10">
      <EntityModalHeader
        entityIcon={<CheckCircle2 className="w-3 h-3" />}
        entityLabel="Завершение"
        entitySwitcherOptions={entitySwitcherOptions}
        title={base.id}
        subtitle={
          <>
            <button
              type="button"
              onClick={handleOpenDeparture}
              disabled={!hasLinkedDeparture}
              className="text-blue-600 hover:underline disabled:text-gray-500 disabled:no-underline disabled:cursor-not-allowed"
            >
              {linked.departureTitle}
            </button>{' '}
            ·{' '}
            <button
              type="button"
              onClick={handleOpenApplication}
              disabled={!hasLinkedApplication}
              className="text-blue-600 hover:underline disabled:text-gray-500 disabled:no-underline disabled:cursor-not-allowed"
            >
              {linked.applicationTitle}
            </button>{' '}
            ·{' '}
            <button
              type="button"
              onClick={onOpenClient ? () => onOpenClient(lead) : undefined}
              disabled={!canOpenClient}
              className="text-blue-600 hover:underline disabled:text-gray-500 disabled:no-underline disabled:cursor-not-allowed"
            >
              {linked.clientName}
            </button>{' '}
            · {linked.equipmentType}
            {linked.equipmentUnit ? ` · ${linked.equipmentUnit}` : ''}
          </>
        }
        primaryAction={
          !isFinal
            ? {
                label: primary.label,
                render: (
                  <Button
                    size="sm"
                    className="h-7 gap-1 bg-blue-600 hover:bg-blue-700 text-white text-[11px]"
                    disabled={primary.disabled}
                    onClick={primary.onClick}
                  >
                    {primary.label}
                    {!primary.disabled && <ArrowRight className="w-3 h-3" />}
                  </Button>
                ),
              }
            : undefined
        }
        secondaryActions={[
          {
            label: 'Открыть выезд',
            iconBefore: <ExternalLink className="w-3 h-3" />,
            onClick: hasLinkedDeparture ? handleOpenDeparture : undefined,
            disabled: !hasLinkedDeparture,
          },
          ...(!isFinal
            ? [
                {
                  label: 'Пометить некачественным',
                  render: (
                    <AlertDialog open={unqualifyOpen} onOpenChange={setUnqualifyOpen}>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => setUnqualifyOpen(true)}>
                          Пометить некачественным
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            Пометить заказ {base.id} некачественным?
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            Заказ будет закрыт как некачественный. Действие попадёт в журнал.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <Textarea
                          value={unqualifyReason}
                          onChange={(e) => setUnqualifyReason(e.target.value)}
                          placeholder="Причина…"
                          className="text-[12px]"
                        />
                        <AlertDialogFooter>
                          <AlertDialogCancel>Отмена</AlertDialogCancel>
                          <AlertDialogAction onClick={handleUnqualify}>
                            Пометить
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  ),
                } satisfies EntityModalAction,
              ]
            : []),
        ]}
        chips={[
          ...(!isCompleted
            ? [
                <span key="status" className={`${headerStatusBadgeClass} ${statusTone[status]}`}>
                  <Flag className="w-3 h-3" />
                  {statusLabel[status]}
                </span>,
              ]
            : []),
          <ToolbarPill key="mgr" icon={<UserPlus className="w-3 h-3" />} label={base.manager} />,
          <ToolbarPill
            key="date"
            icon={<Calendar className="w-3 h-3" />}
            label={completedAt ?? ctx.plannedDate}
          />,
          <ToolbarPill
            key="dep"
            icon={<Truck className="w-3 h-3" />}
            label={linked.departureTitle}
            onClick={hasLinkedDeparture ? handleOpenDeparture : undefined}
          />,
          <ToolbarPill
            key="rsv"
            icon={<FileText className="w-3 h-3" />}
            label={linked.reservationTitle}
            onClick={hasLinkedReservation ? handleOpenReservation : undefined}
          />,
          ...(base.alert !== 'none' && !isFinal
            ? [
                <span key="alert" className={`${headerStatusBadgeClass} ${alertMeta[base.alert].tone}`}>
                  <AlertTriangle className="w-3 h-3" />
                  {alertMeta[base.alert].label}
                </span>,
              ]
            : []),
        ]}
        className="mb-5"
      />

      {/* Completed-state banner — compact, one-line */}
      {status === 'completed' && (
        <Alert className="mb-4 py-1 px-2.5 border-emerald-200 bg-emerald-50/60">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
          <AlertTitle className="text-[12px] text-emerald-900 mb-0">Заказ завершён</AlertTitle>
          <AlertDescription className="text-[10px] text-emerald-800/80 mt-0 leading-snug">
            {completedAt} · {completedBy ?? base.manager}
            {completionNote ? ` · ${completionNote}` : ''}
            <span className="text-emerald-800/60"> · Бронь закрыта · Выезд завершён</span>
          </AlertDescription>
        </Alert>
      )}
      {status === 'unqualified' && (
        <Alert className="mb-5 py-2 px-3">
          <XCircle className="h-4 w-4 text-gray-500" />
          <AlertTitle className="text-[12px]">Заказ помечен некачественным</AlertTitle>
          <AlertDescription className="text-[11px] mt-0.5">
            {unqualifyReason || '—'}
          </AlertDescription>
        </Alert>
      )}

      {/* Stale / blocking banner */}
      {!isFinal && base.alert !== 'none' && (
        <Alert
          variant={base.alert === 'stale' ? 'default' : 'destructive'}
          className="mb-5 py-2 px-3"
        >
          <AlertCircle className="h-4 w-4" />
          <AlertTitle className="text-[12px]">{alertMeta[base.alert].title}</AlertTitle>
          <AlertDescription className="text-[11px] mt-0.5">
            {alertMeta[base.alert].description}
          </AlertDescription>
        </Alert>
      )}

      {/* Screen-level next-step hint — mirrors primary CTA verb */}
      {!isFinal && (
        <div className="mb-4">
          <NextStepLine label={primary.label} reason={primary.reason} />
        </div>
      )}

      {/* Overview */}
      <EntitySection title="Основные данные" className="mb-5">
        <div className="grid grid-cols-2 gap-x-8 gap-y-0">
          <PropertyRow
            icon={<FileText className="w-3 h-3" />}
            label="ID"
            value={<InlineValue>{base.id}</InlineValue>}
          />
          {!isCompleted && (
            <PropertyRow
              icon={<Activity className="w-3 h-3" />}
              label="Статус"
              value={<span className={`${sidebarStatusBadgeClass} ${statusTone[status]}`}>{statusLabel[status]}</span>}
            />
          )}
          <PropertyRow
            icon={<Truck className="w-3 h-3" />}
            label="Выезд"
            value={
              <button
                type="button"
                className="text-blue-600 hover:underline text-left disabled:text-gray-500 disabled:no-underline disabled:cursor-not-allowed"
                onClick={handleOpenDeparture}
                disabled={!hasLinkedDeparture}
              >
                {linked.departureTitle}
              </button>
            }
          />
          <PropertyRow
            icon={<FileText className="w-3 h-3" />}
            label="Бронь"
            value={
              <button
                type="button"
                className="text-blue-600 hover:underline text-left disabled:text-gray-500 disabled:no-underline disabled:cursor-not-allowed"
                onClick={handleOpenReservation}
                disabled={!hasLinkedReservation}
              >
                {linked.reservationTitle}
              </button>
            }
          />
          <PropertyRow
            icon={<FileText className="w-3 h-3" />}
            label="Заявка"
            value={
              <button
                type="button"
                className="text-blue-600 hover:underline text-left disabled:text-gray-500 disabled:no-underline disabled:cursor-not-allowed"
                onClick={handleOpenApplication}
                disabled={!hasLinkedApplication}
              >
                {linked.applicationTitle}
              </button>
            }
          />
          <PropertyRow
            icon={<Building2 className="w-3 h-3" />}
            label="Клиент"
            value={
              <button type="button" onClick={onOpenClient ? () => onOpenClient(lead) : undefined} disabled={!onOpenClient} className="text-[11px] text-blue-600 hover:underline text-left truncate disabled:text-gray-500 disabled:no-underline disabled:cursor-not-allowed">
                {linked.clientName}
              </button>
            }
          />
          <PropertyRow
            icon={<Truck className="w-3 h-3" />}
            label="Тип техники"
            value={<InlineValue>{linked.equipmentType}</InlineValue>}
          />
          {linked.equipmentUnit && (
            <PropertyRow
              icon={<Wrench className="w-3 h-3" />}
              label="Единица"
              value={<InlineValue>{linked.equipmentUnit}</InlineValue>}
            />
          )}
          {linked.subcontractor && (
            <PropertyRow
              icon={<Building2 className="w-3 h-3" />}
              label="Подрядчик"
              value={<InlineValue>{linked.subcontractor}</InlineValue>}
            />
          )}
          <PropertyRow
            icon={<UserPlus className="w-3 h-3" />}
            label="Ответственный"
            value={<InlineValue>{base.manager}</InlineValue>}
          />
          <PropertyRow
            icon={<Calendar className="w-3 h-3" />}
            label="Создан"
            value={<InlineValue>{base.createdAt}</InlineValue>}
          />
          <PropertyRow
            icon={<Activity className="w-3 h-3" />}
            label="Последняя активность"
            value={<InlineValue>{base.lastActivity}</InlineValue>}
          />
        </div>
      </EntitySection>

      {/* Linked departure context */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-1.5">
          <div className="text-[11px] text-gray-500 uppercase tracking-wide">Контекст выезда</div>
          <button
            type="button"
            className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:underline"
            onClick={handleOpenDeparture}
          >
            <ExternalLink className="w-3 h-3" /> Открыть выезд
          </button>
        </div>
        <div className="grid grid-cols-2 gap-x-8 gap-y-0">
          <PropertyRow
            icon={<Calendar className="w-3 h-3" />}
            label="Дата подачи"
            value={<InlineValue>{ctx.plannedDate}</InlineValue>}
          />
          <PropertyRow
            icon={<Clock className="w-3 h-3" />}
            label="Время подачи"
            value={
              <InlineValue>
                {ctx.plannedTimeFrom}
                {ctx.plannedTimeTo ? `–${ctx.plannedTimeTo}` : ''}
              </InlineValue>
            }
          />
          <PropertyRow
            icon={<PlayCircle className="w-3 h-3" />}
            label="Отправление"
            value={
              ctx.departedAt ? (
                <InlineValue>{ctx.departedAt}</InlineValue>
              ) : (
                <span className="text-gray-400 text-[11px]">Не зафиксировано</span>
              )
            }
          />
          <PropertyRow
            icon={<Flag className="w-3 h-3" />}
            label="Прибытие"
            value={
              ctx.arrivedAt ? (
                <InlineValue>{ctx.arrivedAt}</InlineValue>
              ) : (
                <span className="text-gray-400 text-[11px]">Не зафиксировано</span>
              )
            }
          />
          <PropertyRow
            icon={<MapPin className="w-3 h-3" />}
            label="Адрес"
            value={<InlineValue>{ctx.address}</InlineValue>}
          />
          <PropertyRow
            icon={<Package className="w-3 h-3" />}
            label="Количество"
            value={<InlineValue>{linked.quantity} шт</InlineValue>}
          />
          {ctx.contactName && (
            <PropertyRow
              icon={<UserIcon className="w-3 h-3" />}
              label="Контакт"
              value={<InlineValue>{ctx.contactName}</InlineValue>}
            />
          )}
          {ctx.contactPhone && (
            <PropertyRow
              icon={<Phone className="w-3 h-3" />}
              label="Телефон"
              value={<PhoneLink value={ctx.contactPhone} />}
            />
          )}
        </div>
        {ctx.operationalNote && (
          <div className="mt-1.5 text-[10px] text-gray-500 italic">{ctx.operationalNote}</div>
        )}
      </div>

      {/* Completion readiness — only meaningful while the order is still
          in progress. For terminal states (completed / unqualified) we skip
          this section entirely so the screen reflects the actual outcome
          instead of a checklist that no longer applies. */}
      {!isFinal && (
        <div className="mb-5">
          <div className="text-[11px] text-gray-500 uppercase tracking-wide mb-2">
            Готовность к завершению
          </div>
          <div className="border border-gray-200 rounded-md bg-white divide-y divide-gray-200 overflow-hidden">
            {completionChecks.map((c) => (
              <div key={c.label} className="flex items-center gap-3 px-3 py-1.5">
                {c.ok ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                ) : (
                  <Circle className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0 text-[11px]">
                  <span className={c.ok ? 'text-gray-800' : 'text-gray-600'}>{c.label}</span>
                  {!c.ok && c.hint && (
                    <span className="text-gray-400"> · {c.hint}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {isCompleted && (
        <div className="mb-5">
          <div className="text-[11px] text-gray-500 uppercase tracking-wide mb-2">
            Проверка завершения
          </div>
          <div className="border border-emerald-200 rounded-md bg-emerald-50/50 px-2.5 py-1.5 flex items-start gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 mt-[1px] flex-shrink-0" />
            <div className="text-[11px]">
              <div className="text-emerald-900">Условия завершения выполнены</div>
              <div className="text-[10px] text-emerald-800/80 mt-0.5">Проверка пройдена перед закрытием заказа.</div>
            </div>
          </div>
        </div>
      )}
      {status === 'unqualified' && (
        <div className="mb-5">
          <div className="text-[11px] text-gray-500 uppercase tracking-wide mb-2">
            Итоговый результат
          </div>
          <div className="border border-gray-200 rounded-md bg-gray-50/60 px-3 py-2 space-y-1">
            <div className="flex items-center gap-2 text-[11px] text-gray-800">
              <XCircle className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
              <span>Заказ помечен некачественным — процесс завершения не применяется.</span>
            </div>
            {unqualifyReason && (
              <div className="text-[10px] text-gray-500 leading-snug pl-5">
                Причина: {unqualifyReason}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Completion confirmation */}
      {!isFinal && (
        <div className="mb-5">
          <div className="text-[11px] text-gray-500 uppercase tracking-wide mb-2">
            Подтверждение завершения
          </div>
          <div className="border border-gray-200 rounded-md bg-white p-3 space-y-2">
            <div className="text-[11px] text-gray-600">
              Менеджер подтверждает, что работы по выезду выполнены и заказ можно закрыть.
            </div>
            <Textarea
              value={completionNote}
              onChange={(e) => setCompletionNote(e.target.value)}
              placeholder="Итоговый комментарий (необязательно)…"
              className="text-[12px]"
            />
            <div className="flex items-center gap-1.5">
              <Button
                size="sm"
                className="h-7 gap-1 bg-blue-600 hover:bg-blue-700 text-white text-[11px]"
                disabled={primary.disabled}
                onClick={primary.onClick}
              >
                {primary.label}
                {!primary.disabled && <ArrowRight className="w-3 h-3" />}
              </Button>
              {primary.reason && (
                <span className="text-[10px] text-gray-500">· {primary.reason}</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Effect summary */}
      {!isFinal && (
        <div className="mb-5">
          <div className="text-[11px] text-gray-500 uppercase tracking-wide mb-2">
            Что произойдёт после завершения
          </div>
          <div className="border border-gray-200 rounded-md bg-gray-50/60 p-3 space-y-1">
            <EffectRow text="Заказ перейдёт в статус «Завершён»" />
            <EffectRow text={`Выезд ${linked.departureTitle} будет закрыт`} />
            <EffectRow text={`Бронь ${linked.reservationTitle} будет освобождена`} />
            <EffectRow text="Запись пропадёт из активных operational-стадий" />
            <EffectRow text="Событие попадёт в журнал изменений" />
          </div>
        </div>
      )}

      {/* Manager comment / completion note */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-1">
          <div className="text-[11px] text-gray-500 uppercase tracking-wide">
            {isFinal ? 'Итоговый комментарий' : 'Комментарий менеджера'}
          </div>
          {!isFinal && (
            <button
              className="inline-flex items-center gap-1 text-[11px] text-gray-500 hover:text-gray-800"
              onClick={() => setNoteEditing((v) => !v)}
            >
              <Edit3 className="w-3 h-3" /> {noteEditing ? 'Готово' : 'Редактировать'}
            </button>
          )}
        </div>
        {isFinal ? (
          <div className="text-[11px] text-gray-700 leading-relaxed">
            {completionNote || base.comment || '—'}
          </div>
        ) : noteEditing ? (
          <Textarea
            value={completionNote}
            onChange={(e) => setCompletionNote(e.target.value)}
            placeholder="Комментарий к завершению…"
            className="text-[12px]"
          />
        ) : (
          <div className="text-[11px] text-gray-700 leading-relaxed">
            {completionNote || base.comment || '—'}
          </div>
        )}
      </div>

      {/* Linked records — process hierarchy. When completed, the most valuable next contexts are
          client card and repeat order; "Открыть лид" is moved to sidebar only. */}
      <div className="mb-6">
        <div className="space-y-0.5">
          <ActionButton
            icon={<ExternalLink className="w-3.5 h-3.5" />}
            label="Открыть выезд"
            onClick={hasLinkedDeparture ? handleOpenDeparture : undefined}
          />
          <ActionButton
            icon={<FileText className="w-3.5 h-3.5" />}
            label="Открыть бронь"
            onClick={hasLinkedReservation ? handleOpenReservation : undefined}
          />
          <ActionButton
            icon={<FileText className="w-3.5 h-3.5" />}
            label="Открыть заявку"
            onClick={hasLinkedApplication ? handleOpenApplication : undefined}
          />
          <ActionButton icon={<Building2 className="w-3.5 h-3.5" />} label="Открыть клиента" onClick={canOpenClient ? () => onOpenClient(lead) : undefined} />
          {!isCompleted && linked.leadTitle && (
            <ActionButton
              icon={<UserPlus className="w-3.5 h-3.5" />}
              label="Открыть лид"
              onClick={hasLinkedLead ? handleOpenLead : undefined}
            />
          )}
        </div>
        {/* Next-step business actions after completion: repeat order pairs with client context */}
        {isCompleted && (
          <div className="mt-3 rounded-md border border-blue-200 bg-blue-50/50 px-3 py-2">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Copy className="w-3.5 h-3.5 text-blue-600" />
              <span className="text-[11px] text-blue-900">Повторный заказ</span>
            </div>
            <div className="text-[10px] text-blue-900/70 mb-2 leading-snug">
              Заказ клиента закрыт — можно сразу запустить повтор или вернуться в карточку клиента.
            </div>
            <div className="flex items-center gap-1.5">
              <Button
                size="sm"
                className="h-7 gap-1 bg-blue-600 hover:bg-blue-700 text-white text-[11px]"
                onClick={canOpenClient ? () => onOpenClient(lead) : undefined}
                disabled={!canOpenClient}
              >
                <Copy className="w-3 h-3" />
                Создать повторный заказ
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-7 gap-1 text-[11px]"
                onClick={canOpenClient ? () => onOpenClient(lead) : undefined}
                disabled={!canOpenClient}
              >
                <Building2 className="w-3 h-3" />
                Карточка клиента
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* History */}
      <div className="border-t border-gray-200 pt-4">
        <div className="text-[11px] text-gray-500 uppercase tracking-wide mb-2">
          Журнал изменений
        </div>
        <EntityActivityList entries={historyEntries} emptyText="Событий пока нет" />
      </div>
    </div>
  );

  const sidebar = (
    <>
      <SidebarSection title="Статус">
        <SidebarField
          label="Статус"
          value={<span className={`${sidebarStatusBadgeClass} ${statusTone[status]}`}>{statusLabel[status]}</span>}
        />
        <SidebarField label="Менеджер" value={base.manager} />
        <SidebarField label="Создан" value={base.createdAt} />
        <SidebarField label="Обновлён" value={base.updatedAt} />
        {completedAt && <SidebarField label="Завершён" value={completedAt} />}
        {completedBy && <SidebarField label="Закрыл" value={completedBy} />}
      </SidebarSection>

      <SidebarSection title={isCompleted ? 'Проверка завершения' : 'Готовность к завершению'}>
        {isCompleted ? (
          <div className="rounded border border-emerald-200 bg-emerald-50/50 px-2 py-1 text-[11px] text-emerald-900">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3 h-3 text-emerald-600 flex-shrink-0" />
              <span>Проверка пройдена</span>
            </div>
            <div className="text-[10px] text-emerald-800/80 mt-0.5">Условия завершения выполнены.</div>
          </div>
        ) : (
          <>
            <div className="space-y-1">
              {completionChecks.map((c) => (
                <div key={c.label} className="flex items-center gap-1.5 text-[11px]">
                  {c.ok ? (
                    <CheckCircle2 className="w-3 h-3 text-emerald-500 flex-shrink-0" />
                  ) : (
                    <Circle className="w-3 h-3 text-gray-300 flex-shrink-0" />
                  )}
                  <span className={c.ok ? 'text-gray-700' : 'text-gray-500'}>{c.label}</span>
                </div>
              ))}
            </div>
            {!isFinal && (
              <div className="pt-2">
                <Button
                  size="sm"
                  className="h-7 w-full text-[11px]"
                  disabled={primary.disabled}
                  onClick={primary.onClick}
                >
                  {primary.label}
                </Button>
                {primary.reason && (
                  <div className="text-[10px] text-gray-500 mt-1">{primary.reason}</div>
                )}
              </div>
            )}
          </>
        )}
      </SidebarSection>

      <SidebarSection title="Итог">
        {isFinal ? (
          <>
            <SidebarField
              label="Результат"
              value={status === 'completed' ? 'Цепочка закрыта' : 'Помечен некачественным'}
            />
            {completedAt && <SidebarField label="Завершено" value={completedAt} />}
            {completedBy && <SidebarField label="Кем" value={completedBy} />}
            {(completionNote || base.comment) && (
              <div className="text-[11px] text-gray-700 leading-relaxed pt-1">
                {completionNote || base.comment}
              </div>
            )}
          </>
        ) : (
          <div className="text-[11px] text-gray-500">
            Итог появится после завершения заказа.
          </div>
        )}
      </SidebarSection>

      {base.alert !== 'none' && !isFinal && (
        <SidebarSection title="Внимание">
          <div className="text-[11px] text-red-700">{alertMeta[base.alert].title}</div>
          <div className="text-[10px] text-gray-500 mt-0.5">
            {alertMeta[base.alert].description}
          </div>
        </SidebarSection>
      )}

      <SidebarSection title="Связанные записи">
        <SidebarField
          label="Выезд"
          value={
            <button
              type="button"
              className={`${sidebarTokens.link} disabled:text-gray-500 disabled:no-underline disabled:cursor-not-allowed`}
              onClick={handleOpenDeparture}
              disabled={!hasLinkedDeparture}
            >
              {linked.departureTitle}
            </button>
          }
        />
        <SidebarField
          label="Бронь"
          value={
            <button
              type="button"
              className={`${sidebarTokens.link} disabled:text-gray-500 disabled:no-underline disabled:cursor-not-allowed`}
              onClick={handleOpenReservation}
              disabled={!hasLinkedReservation}
            >
              {linked.reservationTitle}
            </button>
          }
        />
        <SidebarField
          label="Заявка"
          value={
            <button
              type="button"
              className={`${sidebarTokens.link} disabled:text-gray-500 disabled:no-underline disabled:cursor-not-allowed`}
              onClick={handleOpenApplication}
              disabled={!hasLinkedApplication}
            >
              {linked.applicationTitle}
            </button>
          }
        />
        <SidebarField
          label="Клиент"
          value={
            <button type="button" onClick={onOpenClient ? () => onOpenClient(lead) : undefined} disabled={!onOpenClient} className={`${sidebarTokens.link} disabled:text-gray-500 disabled:no-underline disabled:cursor-not-allowed`}>
              {linked.clientName}
            </button>
          }
        />
        {linked.leadTitle && (
          <SidebarField
            label="Лид"
            value={
              <button
                type="button"
                className={`${sidebarTokens.link} disabled:text-gray-500 disabled:no-underline disabled:cursor-not-allowed`}
                onClick={handleOpenLead}
                disabled={!hasLinkedLead}
              >
                {linked.leadTitle}
              </button>
            }
          />
        )}
        {linked.equipmentUnit && <SidebarField label="Единица" value={linked.equipmentUnit} />}
        {linked.subcontractor && <SidebarField label="Подрядчик" value={linked.subcontractor} />}
      </SidebarSection>

      <SidebarSection title="Последние изменения" defaultOpen={false}>
        <div className="space-y-1">
          {base.activity.slice(-3).map((a) => (
            <div key={a.id} className="text-[10px] text-gray-500 leading-tight">
              <span className="text-gray-700">{a.actor}</span> · {a.message}
              <div className="text-gray-500">{a.at}</div>
            </div>
          ))}
        </div>
      </SidebarSection>

      <SidebarSection title="Быстрые действия" defaultOpen={false}>
        <div className="space-y-1">
          {!isFinal && (
            <Button
              size="sm"
              variant="outline"
              className="h-6 w-full justify-start text-[11px]"
              disabled={primary.disabled}
              onClick={primary.onClick}
            >
              <CheckCircle2 className="w-3 h-3 mr-1" /> Завершить заказ
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            className="h-6 w-full justify-start text-[11px]"
            onClick={handleOpenDeparture}
            disabled={!hasLinkedDeparture}
          >
            <ExternalLink className="w-3 h-3 mr-1" /> Открыть выезд
          </Button>
          {!isFinal && (
            <Button
              size="sm"
              variant="outline"
              className="h-6 w-full justify-start text-[11px]"
              onClick={() => setUnqualifyOpen(true)}
            >
              <XCircle className="w-3 h-3 mr-1" /> Пометить некачественным
            </Button>
          )}
        </div>
      </SidebarSection>
    </>
  );

  return (
    <>
      <DetailShell
        breadcrumb={<Breadcrumb items={breadcrumbItems} />}
        onClose={onClose}
        shareUrl={shareUrl}
        main={main}
        sidebar={sidebar}
      />
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Завершить заказ {base.id}?</AlertDialogTitle>
            <AlertDialogDescription>
              Заказ перейдёт в статус «Завершён», выезд {linked.departureTitle} будет закрыт,
              бронь {linked.reservationTitle} будет освобождена. Действие попадёт в журнал.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            value={completionNote}
            onChange={(e) => setCompletionNote(e.target.value)}
            placeholder="Итоговый комментарий (необязательно)…"
            className="text-[12px]"
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmComplete}>
              Завершить заказ
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function EffectRow({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2 text-[11px] text-gray-700">
      <ArrowRight className="w-3 h-3 text-blue-500 flex-shrink-0" />
      <span>{text}</span>
    </div>
  );
}

