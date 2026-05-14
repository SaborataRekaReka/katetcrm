import { useMemo, useState } from 'react';
import {
  Activity,
  AlertCircle,
  ArrowRight,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Copy,
  Edit3,
  FileText,
  HelpCircle,
  Link as LinkIcon,
  MapPin,
  Package,
  Phone,
  Truck,
  User as UserIcon,
  UserPlus,
  Wrench,
} from 'lucide-react';
import { Application, ApplicationPosition } from '../../types/application';
import { Lead } from '../../types/kanban';
import { badgeBase, badgeTones } from '../kanban/badgeTokens';
import { SourceBadge } from '../kanban/SourceBadge';
import { Button } from '../ui/button';
import {
  ActionButton,
  Breadcrumb,
  DetailShell,
  EmptyValue,
  InlineValue,
  PropertyRow,
  SidebarField,
  ToolbarPill,
  resolveClientDisplay,
  sidebarTokens,
} from './DetailShell';
import {
  EntityActivityList,
  EntityCommentList,
  EntityCommentsPanel,
  EntityMetaGrid,
  EntityModalHeader,
  EntityModalShell,
  EntitySection,
  EntitySidebarSection,
  EntitySummarySidebar,
} from './EntityModalFramework';
import { useChangeLeadStage, useUpdateLead } from '../../hooks/useLeadMutations';
import { useUpdateApplication, useDeleteApplicationItem } from '../../hooks/useApplicationMutations';
import { useCreateReservation } from '../../hooks/useReservationMutations';
import { useCreateClient } from '../../hooks/useClientMutations';
import { useLeadQuery } from '../../hooks/useLeadsQuery';
import { useApplicationQuery, useApplicationsQuery } from '../../hooks/useApplicationsQuery';
import { useReservationsQuery } from '../../hooks/useReservationsQuery';
import { useManagersQuery } from '../../hooks/useUsersQuery';
import { useEntityActivity } from '../../hooks/useActivityQuery';
import { mapActivityEntries } from '../../lib/activityMapper';
import { toKanbanLead } from '../../lib/leadAdapter';
import { toUiApplication } from '../../lib/applicationAdapter';
import { USE_API } from '../../lib/featureFlags';
import { EditLeadDialog } from '../leads/EditLeadDialog';
import { UnqualifyLeadDialog } from '../leads/UnqualifyLeadDialog';
import { EditApplicationDialog } from '../application/EditApplicationDialog';
import { CancelApplicationDialog } from '../application/CancelApplicationDialog';
import { PositionDialog } from '../application/PositionDialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog';
import { Plus, Trash2 } from 'lucide-react';
import { InlineText, InlineSelect, InlineDate } from './InlineEdit';
import type { SourceChannel } from '../../lib/leadsApi';
import { updateLead as updateLeadApi } from '../../lib/leadsApi';
import { updateApplication } from '../../lib/applicationsApi';
import { useLayout } from '../shell/layoutStore';
import { buildAbsoluteEntityUrl } from '../shell/routeSync';
import { RelatedRecordsFields, type RelatedRecordItem } from './RelatedRecordsFields';
import { LifecycleRollbackActions } from './LifecycleRollbackActions';
import type { LeadApi } from '../../lib/leadsApi';

type LeadPatch = Parameters<typeof updateLeadApi>[1];

const LEAD_SOURCE_OPTIONS: { value: SourceChannel; label: string }[] = [
  { value: 'manual', label: 'Ручной ввод' },
  { value: 'site', label: 'Сайт' },
  { value: 'mango', label: 'Mango (звонок)' },
  { value: 'telegram', label: 'Telegram' },
  { value: 'max', label: 'MAX' },
  { value: 'other', label: 'Другое' },
];

const BOOL_OPTIONS: { value: string; label: string }[] = [
  { value: 'true', label: 'Да' },
  { value: 'false', label: 'Нет' },
];

const UNASSIGNED_MANAGER_OPTION = '__unassigned_manager__';

const propertyLinkInlineClass =
  'inline-flex min-h-[20px] max-w-full items-center rounded px-1 text-[11px] text-blue-600 text-left truncate hover:bg-gray-100 hover:underline transition-colors disabled:text-gray-500 disabled:no-underline disabled:cursor-not-allowed';

const headerStatusBadgeClass =
  'inline-flex items-center gap-1 h-6 px-1.5 rounded border text-[11px]';

const sidebarStatusBadgeClass =
  'inline-flex items-center gap-1 h-5 px-1.5 rounded border text-[11px]';

interface LeadDetailModalProps {
  lead?: Lead;
  application?: Application;
  onClose: () => void;
  onOpenClient?: () => void;
  onOpenLead?: (leadId: string) => void;
  onEditApplication?: () => void;
  onWorkflowNavigate?: (
    target: 'application' | 'reservation',
    payload?: { leadId?: string; reservationId?: string },
  ) => void;
}

const positionStatusMeta: Record<
  NonNullable<ApplicationPosition['status']>,
  { label: string; tone: string; Icon: React.ComponentType<{ className?: string }> }
> = {
  no_reservation: { label: 'Нет брони', tone: badgeTones.muted, Icon: AlertCircle },
  unit_selected: { label: 'Единица выбрана', tone: badgeTones.progress, Icon: Wrench },
  reserved: { label: 'Забронировано', tone: badgeTones.success, Icon: CheckCircle2 },
  conflict: { label: 'Конфликт', tone: badgeTones.warning, Icon: AlertCircle },
};

const sourcingMeta = {
  own: { label: 'Своя техника', tone: badgeTones.progress, Icon: Truck },
  subcontractor: { label: 'Подрядчик', tone: badgeTones.caution, Icon: Building2 },
  undecided: { label: 'Не определено', tone: badgeTones.caution, Icon: HelpCircle },
};

const MOCK_COMMENTS = [
  {
    id: '1',
    author: 'Анна Смирнова',
    avatar: 'А',
    color: 'from-pink-400 to-rose-500',
    time: '2 часа назад',
    text: 'Клиент попросил перезвонить после 15:00 - обсудить сроки поставки.',
  },
  {
    id: '2',
    author: 'Иван Петров',
    avatar: 'И',
    color: 'from-indigo-400 to-purple-500',
    time: 'вчера, 18:22',
    text: 'Отправил КП, ждём подтверждение по позициям.',
  },
];

const MOCK_ACTIVITY = [
  { id: '1', text: 'создал(а) задачу', who: 'Иван Петров', time: '3 дня назад' },
  { id: '2', text: 'изменил(а) статус на Бронь', who: 'Анна Смирнова', time: '2 дня назад' },
  { id: '3', text: 'добавил(а) менеджера', who: 'Олег Ким', time: 'вчера' },
];

function getPrimaryCTA(
  stage: string | undefined,
  isLead: boolean,
  hasLinkedApplication = false,
): { label: string; secondary?: string } {
  if (isLead) {
    const canMarkUnqualified =
      stage !== 'completed' && stage !== 'unqualified' && stage !== 'cancelled';
    return {
      label: hasLinkedApplication ? 'Открыть заявку' : 'Перевести в заявку',
      secondary: canMarkUnqualified ? 'Пометить некачественным' : undefined,
    };
  }

  switch (stage) {
    case 'application':
      return { label: 'Подготовить к брони', secondary: 'Открыть бронь' };
    case 'reservation':
      return { label: 'Перевести в выезд', secondary: 'Редактировать бронь' };
    case 'departure':
      return { label: 'Завершить', secondary: 'Отметить проблему' };
    case 'completed':
      return { label: 'Создать повтор', secondary: 'Архивировать' };
    default:
      return { label: 'Далее', secondary: 'Действия' };
  }
}

function deriveAppReadiness(app: Application) {
  const total = app.positions.length;
  const inReservation = app.positions.filter((p) => p.status && p.status !== 'no_reservation').length;

  if (total === 0) return { label: 'Нет данных', tone: badgeTones.warning, Icon: AlertCircle };
  if (inReservation === total) return { label: 'Передано в бронирование', tone: badgeTones.success, Icon: CheckCircle2 };
  if (inReservation > 0) return { label: `${inReservation}/${total} в бронировании`, tone: badgeTones.progress, Icon: Package };

  const hasNoData = app.positions.some((p) => p.sourcingType === 'undecided');
  if (hasNoData) return { label: 'Потребности сформированы', tone: badgeTones.progress, Icon: AlertCircle };

  return { label: 'Готово к передаче в бронь', tone: badgeTones.progress, Icon: Clock };
}

function normalizeDatePart(value?: string | null): string | null {
  if (!value) return null;
  const day = value.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : null;
}

function normalizeTimePart(value: string | null | undefined, fallback: string): string {
  if (!value) return fallback;
  const m = /^([01]\d|2[0-3]):([0-5]\d)/.exec(value.trim());
  return m ? `${m[1]}:${m[2]}` : fallback;
}

function buildReservationWindow(position: ApplicationPosition, app: Application) {
  const day =
    normalizeDatePart(position.plannedDate) ??
    normalizeDatePart(app.requestedDate) ??
    new Date().toISOString().slice(0, 10);
  const from = normalizeTimePart(
    position.plannedTimeFrom ?? app.requestedTimeFrom,
    '09:00',
  );
  let to = normalizeTimePart(position.plannedTimeTo ?? app.requestedTimeTo, '18:00');

  if (to <= from) {
    const [hour, minute] = from.split(':').map(Number);
    const nextHour = (hour + 1) % 24;
    to = `${String(nextHour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  }

  return {
    plannedStart: `${day}T${from}:00`,
    plannedEnd: `${day}T${to}:00`,
  };
}

function resolveInitialReservationStage(sourcing: ApplicationPosition['sourcingType']) {
  switch (sourcing) {
    case 'own':
      return 'searching_own_equipment' as const;
    case 'subcontractor':
      return 'searching_subcontractor' as const;
    case 'undecided':
    default:
      return 'needs_source_selection' as const;
  }
}

function PositionCard({
  pos,
  idx,
  canEdit,
  onEdit,
  onDelete,
}: {
  pos: ApplicationPosition;
  idx: number;
  canEdit: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  const src = sourcingMeta[pos.sourcingType];
  const SrcIcon = src.Icon;
  const status = pos.status ?? 'no_reservation';
  const st = positionStatusMeta[status];
  const StIcon = st.Icon;

  let nextStep: string | null;
  if (status === 'reserved') nextStep = null;
  else if (status === 'conflict') nextStep = 'Разрешить конфликт';
  else if (status === 'no_reservation') nextStep = 'Создать бронь';
  else if (pos.sourcingType === 'undecided') nextStep = 'Выбрать sourcing';
  else nextStep = 'Продолжить обработку';

  const reservationExists =
    status === 'reserved' || status === 'conflict' || status === 'unit_selected';
  const readyForBooking = status === 'no_reservation';

  return (
    <div className="border border-gray-200 rounded-md bg-white p-2.5 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center justify-center w-4 h-4 rounded bg-gray-100 text-[10px] text-gray-600">
              {idx + 1}
            </span>
            <span className="text-[12px] text-gray-900 truncate">{pos.equipmentType}</span>
            <span className="text-[10px] text-gray-500">x {pos.quantity}</span>
          </div>
          <div className="text-[10px] text-gray-500 mt-0.5">
            Смен: {pos.shiftCount}
            {pos.plannedDate && ` • ${new Date(pos.plannedDate).toLocaleDateString('ru-RU')}`}
            {pos.plannedTimeFrom && ` ${pos.plannedTimeFrom}${pos.plannedTimeTo ? '-' + pos.plannedTimeTo : ''}`}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1">
        <span className={`${badgeBase} ${src.tone}`}>
          <SrcIcon className="w-3 h-3" />
          {src.label}
        </span>
        <span className={`${badgeBase} ${st.tone}`}>
          <StIcon className="w-3 h-3" />
          {st.label}
        </span>
        {pos.unit && (
          <span className={`${badgeBase} ${badgeTones.progress}`}>
            <Wrench className="w-3 h-3" />
            {pos.unit}
          </span>
        )}
        {pos.subcontractor && (
          <span className={`${badgeBase} ${badgeTones.source}`}>
            <Building2 className="w-3 h-3" />
            {pos.subcontractor}
          </span>
        )}
      </div>

      {nextStep && (
        <div className="flex items-center gap-1 text-[11px] text-gray-600">
          <ArrowRight className="w-3 h-3 text-blue-500" />
          <span>
            Нужно: <b className="text-gray-800">{nextStep}</b>
          </span>
        </div>
      )}

      <div className="flex items-center gap-1 pt-1 border-t border-gray-100">
        <button
          type="button"
          disabled={!canEdit}
          onClick={onEdit}
          className="inline-flex items-center gap-1 h-6 px-1.5 rounded text-[11px] text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Edit3 className="w-3 h-3" /> Редактировать
        </button>
        <button
          type="button"
          disabled={!canEdit}
          onClick={onDelete}
          className="inline-flex items-center gap-1 h-6 px-1.5 rounded text-[11px] text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Trash2 className="w-3 h-3" /> Удалить
        </button>
        {reservationExists ? (
          <span className="ml-auto inline-flex items-center gap-1 h-6 px-1.5 rounded text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200">
            Бронь создана
          </span>
        ) : readyForBooking ? (
          <span className="ml-auto inline-flex items-center gap-1 h-6 px-1.5 rounded text-[11px] text-blue-700 bg-blue-50 border border-blue-200">
            Готово к брони
          </span>
        ) : null}
      </div>
    </div>
  );
}

export function LeadDetailModal({
  lead: initialLead,
  application: initialApplication,
  onClose,
  onOpenClient,
  onOpenLead,
  onEditApplication,
  onWorkflowNavigate,
}: LeadDetailModalProps) {
  const { setActiveSecondaryNav, openSecondaryWithEntity, activeEntityType } = useLayout();
  const [tab, setTab] = useState<'comments' | 'activity'>('comments');
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isUnqualOpen, setIsUnqualOpen] = useState(false);
  const [isEditAppOpen, setIsEditAppOpen] = useState(false);
  const [isCancelAppOpen, setIsCancelAppOpen] = useState(false);
  const [isAddPositionOpen, setIsAddPositionOpen] = useState(false);
  const [editingPosition, setEditingPosition] = useState<ApplicationPosition | null>(null);
  const [deletingPosition, setDeletingPosition] = useState<ApplicationPosition | null>(null);
  const [positionError, setPositionError] = useState<string | null>(null);
  const [stageError, setStageError] = useState<string | null>(null);
  const changeStage = useChangeLeadStage();
  const updateLead = useUpdateLead();
  const createReservation = useCreateReservation();
  const createClientMutation = useCreateClient();
  const updateAppMutation = useUpdateApplication();
  const deleteItemMutation = useDeleteApplicationItem();

  // Подписываемся на detail-cache соответствующей сущности. После save
  // мутация пишет свежий API-объект в этот ключ через setQueryData, так что
  // модалка перерисовывается сразу, не дожидаясь refetch'а листа и без
  // участия родителя, который передал нам prop.
  const leadDetailQuery = useLeadQuery(
    initialLead?.id,
    USE_API && !!initialLead?.id,
  );
  const applicationDetailQuery = useApplicationQuery(
    initialApplication?.id,
    USE_API && !!initialApplication?.id,
  );
  const managersQuery = useManagersQuery(USE_API && !!initialApplication?.id);

  // Используем свежие данные из query, если доступны — иначе prop как seed.
  const lead = leadDetailQuery.data
    ? toKanbanLead(leadDetailQuery.data)
    : initialLead;
  const application = applicationDetailQuery.data
    ? toUiApplication(applicationDetailQuery.data)
    : initialApplication;
  const isLead = !!lead;
  const leadApplicationsQuery = useApplicationsQuery(
    { leadId: lead?.id, scope: 'mine' },
    USE_API && isLead && !!lead?.id,
  );
  const linkedLeadQuery = useLeadQuery(
    application?.leadId,
    USE_API && !isLead && !!application?.leadId,
  );
  const activeReservationsQuery = useReservationsQuery(
    { applicationId: application?.id, isActive: 'true' },
    USE_API && !isLead && !!application?.id,
  );
  const existingReservationId = activeReservationsQuery.data?.items?.[0]?.id ?? null;

  const managerOptions = useMemo(() => {
    const options = (managersQuery.data ?? []).map((manager) => ({
      value: manager.id,
      label: manager.fullName,
    }));

    if (application?.responsibleManagerId) {
      const exists = options.some((option) => option.value === application.responsibleManagerId);
      if (!exists) {
        options.unshift({
          value: application.responsibleManagerId,
          label: application.responsibleManager || 'Текущий менеджер',
        });
      }
    } else {
      options.unshift({
        value: UNASSIGNED_MANAGER_OPTION,
        label: 'Не назначен',
      });
    }

    return options;
  }, [application?.responsibleManager, application?.responsibleManagerId, managersQuery.data]);

  if (!lead && !application) return null;

  const canInlineEditLead = isLead && USE_API && !!lead?.id;
  const canInlineEditApp = !isLead && USE_API && !!application?.id;

  /**
   * Фабрика save-обработчиков для инлайн-полей лида.
   * Возвращает Promise от мутации, чтобы примитив сам управлял
   * pending/error-состоянием и выходом из edit-режима.
   */
  const makeLeadFieldSaver = (
    apply: (next: string) => LeadPatch,
  ) => {
    return async (next: string) => {
      if (!lead) return;
      await updateLead.mutateAsync({ id: lead.id, patch: apply(next) });
    };
  };

  /** Фабрика save-обработчиков для инлайн-полей заявки. */
  const makeAppFieldSaver = (
    apply: (next: string) => Parameters<typeof updateApplication>[1],
  ) => {
    return async (next: string) => {
      if (!application) return;
      await updateAppMutation.mutateAsync({ id: application.id, patch: apply(next) });
    };
  };
  const entityType = isLead ? 'Лид' : 'Заявка';
  const listName = isLead ? 'Лиды' : 'Заявки';
  const title = isLead ? lead.client : application!.number;
  const appReadiness = !isLead ? deriveAppReadiness(application!) : null;
  const activeSwitcherEntityType = activeEntityType ?? (isLead ? 'lead' : 'application');

  const linkedIds = isLead ? leadDetailQuery.data?.linkedIds : applicationDetailQuery.data?.linkedIds;
  const firstLinkedApplicationId = leadApplicationsQuery.data?.items[0]?.id ?? null;
  const leadEntityId = isLead
    ? (lead?.id ?? linkedIds?.leadId ?? null)
    : (application?.leadId ?? linkedIds?.leadId ?? null);
  const applicationEntityId = isLead
    ? (linkedIds?.applicationId ?? firstLinkedApplicationId)
    : (application?.id ?? linkedIds?.applicationId ?? null);
  const reservationEntityId = linkedIds?.reservationId ?? existingReservationId;
  const hasLinkedReservation = !!reservationEntityId;
  const departureEntityId = linkedIds?.departureId ?? null;
  const completionEntityId = linkedIds?.completionId ?? null;
  const hasLinkedApplication = !!applicationEntityId;
  const hasDownstreamForLead =
    !!applicationEntityId || hasLinkedReservation || !!departureEntityId || !!completionEntityId;
  const hasDownstreamForApplication =
    hasLinkedReservation || !!departureEntityId || !!completionEntityId;
  const isCurrentStageTail = isLead ? !hasDownstreamForLead : !hasDownstreamForApplication;
  const targetLeadIdForUnqualify = leadEntityId;
  const linkedLeadStage = isLead ? lead?.stage : linkedLeadQuery.data?.stage;
  const lifecycleLeadStage = linkedLeadStage ?? (isLead ? lead?.stage : application?.stage);
  const canRollbackCurrentStage = lifecycleLeadStage
    ? lifecycleLeadStage !== 'lead' && lifecycleLeadStage !== 'cancelled'
    : !!application;
  const canMarkChainUnqualified =
    USE_API
    && !!targetLeadIdForUnqualify
    && linkedLeadStage !== 'completed'
    && linkedLeadStage !== 'unqualified'
    && linkedLeadStage !== 'cancelled'
    && isCurrentStageTail;
  const canMarkUnqualified = isLead && canMarkChainUnqualified;
  const cta = getPrimaryCTA(application?.stage || lead?.stage, isLead, hasLinkedApplication);
  const clientEntityId = isLead
    ? (lead?.apiClientId ?? linkedIds?.clientId ?? null)
    : (application?.clientId ?? linkedIds?.clientId ?? null);
  const canOpenClientDetails = !!clientEntityId;
  const clientRecordLabel = canOpenClientDetails ? 'Клиент' : 'Контакт';
  const shareEntityType = isLead ? 'lead' : 'application';
  const shareEntityId = isLead ? lead?.id : application?.id;
  const shareUrl = shareEntityId
    ? buildAbsoluteEntityUrl(shareEntityType, shareEntityId)
    : null;

  const openSecondary = (secondaryId: string) => {
    setActiveSecondaryNav(secondaryId);
    onClose();
  };

  const openEntitySecondary = (
    secondaryId: string,
    targetEntityType: 'lead' | 'application' | 'reservation' | 'departure' | 'completion' | 'client',
    targetEntityId?: string | null,
  ) => {
    if (!targetEntityId) return false;
    openSecondaryWithEntity(secondaryId, targetEntityType, targetEntityId);
    return true;
  };

  const openLeadLifecycleStage = (fresh: LeadApi) => {
    const ids = fresh.linkedIds;
    if (fresh.stage === 'application' && ids.applicationId) {
      openEntitySecondary('applications', 'application', ids.applicationId);
      return;
    }
    if (fresh.stage === 'reservation' && ids.reservationId) {
      openEntitySecondary('reservations', 'reservation', ids.reservationId);
      return;
    }
    if (fresh.stage === 'departure' && ids.departureId) {
      openEntitySecondary('departures', 'departure', ids.departureId);
      return;
    }
    if ((fresh.stage === 'completed' || fresh.stage === 'unqualified') && ids.completionId) {
      openEntitySecondary('completion', 'completion', ids.completionId);
      return;
    }
    openEntitySecondary('leads', 'lead', fresh.id);
  };

  const handleLifecycleRollbackSuccess = (fresh: LeadApi) => {
    setStageError(null);
    openLeadLifecycleStage(fresh);
  };

  const handleLifecycleChainDeleted = () => {
    setStageError(null);
    openSecondary('leads');
  };

  const formatEntityLink = (prefix: string, entityId?: string | null): string | null => {
    if (!entityId) return null;
    return `${prefix}-${entityId.slice(0, 8).toUpperCase()}`;
  };
  const normalizeDisplayText = (value?: string | null): string | null => {
    const text = value?.trim();
    if (!text || text === '—') return null;
    return text;
  };

  const openClientDetails = () => {
    if (!clientEntityId) return;
    if (onOpenClient) {
      onOpenClient();
      return;
    }
    openEntitySecondary('clients', 'client', clientEntityId);
  };

  const handleCreateClientFromLead = async () => {
    if (!lead || !USE_API || canOpenClientDetails) return;

    const contactName = lead.client?.trim() ?? '';
    const contactCompany = lead.company?.trim() ?? '';
    const phone = lead.phone?.trim() ?? '';

    if (!contactName && !contactCompany) {
      setStageError('Нельзя создать клиента: заполните имя контакта или компанию в лиде.');
      return;
    }
    if (!phone || phone === '—') {
      setStageError('Нельзя создать клиента: в лиде не указан телефон.');
      return;
    }

    setStageError(null);
    try {
      const created = await createClientMutation.mutateAsync({
        name: contactName || contactCompany,
        company: contactCompany || undefined,
        phone,
        notes: lead.address ? `Адрес из лида: ${lead.address}` : undefined,
      });

      await updateLead.mutateAsync({
        id: lead.id,
        patch: { clientId: created.id },
      });

      openEntitySecondary('clients', 'client', created.id);
    } catch (err) {
      setStageError(
        err instanceof Error
          ? err.message
          : 'Не удалось создать клиента из лида',
      );
    }
  };
  const leadClientDisplay = resolveClientDisplay({
    company: lead?.company,
    personName: lead?.client,
  });
  const applicationClientDisplay = resolveClientDisplay({
    company: application?.clientCompany,
    personName: application?.clientName,
  });
  const leadClientPrimaryText = normalizeDisplayText(leadClientDisplay.primaryText);
  const leadClientSecondaryText = normalizeDisplayText(leadClientDisplay.secondaryText);
  const applicationClientPrimaryText = normalizeDisplayText(applicationClientDisplay.primaryText);
  const applicationClientSecondaryText = normalizeDisplayText(applicationClientDisplay.secondaryText);

  const leadRelatedRecordItems: RelatedRecordItem[] = isLead ? [
    {
      label: 'Лид',
      text: formatEntityLink('LEAD', leadEntityId),
      onClick: leadEntityId ? () => openEntitySecondary('leads', 'lead', leadEntityId) : null,
    },
    {
      label: 'Заявка',
      text: formatEntityLink('APP', applicationEntityId),
      onClick: applicationEntityId
        ? () => openEntitySecondary('applications', 'application', applicationEntityId)
        : null,
    },
    {
      label: 'Бронь',
      text: formatEntityLink('RSV', reservationEntityId),
      onClick: reservationEntityId
        ? () => openEntitySecondary('reservations', 'reservation', reservationEntityId)
        : null,
    },
    {
      label: 'Выезд',
      text: formatEntityLink('DEP', departureEntityId),
      onClick: departureEntityId
        ? () => openEntitySecondary('departures', 'departure', departureEntityId)
        : null,
    },
    {
      label: 'Завершение',
      text: formatEntityLink('CMP', completionEntityId),
      onClick: completionEntityId
        ? () => openEntitySecondary('completion', 'completion', completionEntityId)
        : null,
    },
    {
      label: clientRecordLabel,
      text: leadClientPrimaryText,
      onClick: leadClientPrimaryText && canOpenClientDetails ? openClientDetails : null,
    },
    ...(leadClientSecondaryText
      ? [
          {
            label: 'Контактное лицо',
            text: leadClientSecondaryText,
          },
        ]
      : []),
  ] : [];

  const applicationRelatedRecordItems: RelatedRecordItem[] = !isLead ? [
    {
      label: 'Лид',
      text: formatEntityLink('LEAD', leadEntityId),
      onClick: leadEntityId ? () => openEntitySecondary('leads', 'lead', leadEntityId) : null,
    },
    {
      label: 'Заявка',
      text: application?.number ?? null,
      onClick: applicationEntityId
        ? () => openEntitySecondary('applications', 'application', applicationEntityId)
        : null,
    },
    {
      label: 'Бронь',
      text: formatEntityLink('RSV', reservationEntityId),
      onClick: reservationEntityId
        ? () => openEntitySecondary('reservations', 'reservation', reservationEntityId)
        : null,
    },
    {
      label: 'Выезд',
      text: formatEntityLink('DEP', departureEntityId),
      onClick: departureEntityId
        ? () => openEntitySecondary('departures', 'departure', departureEntityId)
        : null,
    },
    {
      label: 'Завершение',
      text: formatEntityLink('CMP', completionEntityId),
      onClick: completionEntityId
        ? () => openEntitySecondary('completion', 'completion', completionEntityId)
        : null,
    },
    {
      label: clientRecordLabel,
      text: applicationClientPrimaryText,
      onClick: applicationClientPrimaryText && canOpenClientDetails ? openClientDetails : null,
    },
    ...(applicationClientSecondaryText
      ? [
          {
            label: 'Контактное лицо',
            text: applicationClientSecondaryText,
          },
        ]
      : []),
  ] : [];

  const breadcrumbItems = [
    { label: 'CRM', onClick: () => openSecondary('overview') },
    {
      label: 'Продажи',
      onClick: () => openSecondary(isLead ? 'leads' : 'applications'),
    },
    { label: listName },
  ];

  const entitySwitcherOptions = [
    {
      id: 'lead',
      label: 'Лид',
      active: activeSwitcherEntityType === 'lead',
      onSelect: leadEntityId ? () => openEntitySecondary('leads', 'lead', leadEntityId) : undefined,
      disabled: !leadEntityId,
    },
    {
      id: 'application',
      label: 'Заявка',
      active: activeSwitcherEntityType === 'application',
      onSelect: applicationEntityId ? () => openEntitySecondary('applications', 'application', applicationEntityId) : undefined,
      disabled: !applicationEntityId,
    },
    {
      id: 'reservation',
      label: 'Бронь',
      active: activeSwitcherEntityType === 'reservation',
      onSelect: reservationEntityId ? () => openEntitySecondary('reservations', 'reservation', reservationEntityId) : undefined,
      disabled: !reservationEntityId,
    },
    {
      id: 'departure',
      label: 'Выезд',
      active: activeSwitcherEntityType === 'departure',
      onSelect: departureEntityId ? () => openEntitySecondary('departures', 'departure', departureEntityId) : undefined,
      disabled: !departureEntityId,
    },
    {
      id: 'completed',
      label: 'Завершение',
      active: activeSwitcherEntityType === 'completion',
      onSelect: completionEntityId ? () => openEntitySecondary('completion', 'completion', completionEntityId) : undefined,
      disabled: !completionEntityId,
    },
  ];

  // Готовность лида к переводу в заявку: адрес, дата, телефон.
  const leadMissingFields: string[] = [];
  if (isLead) {
    if (!lead!.address) leadMissingFields.push('адрес');
    if (!lead!.date) leadMissingFields.push('дата');
    if (lead!.hasNoContact || !lead!.phone) leadMissingFields.push('контакт');
  }
  const canPromoteToApplication = isLead && leadMissingFields.length === 0 && USE_API;

  const handlePromoteToApplication = async () => {
    if (!lead || !canPromoteToApplication) return;
    setStageError(null);
    try {
      await changeStage.mutateAsync({ id: lead.id, stage: 'application' });
      if (onWorkflowNavigate) {
        onWorkflowNavigate('application', { leadId: lead.id });
        return;
      }
      onClose();
    } catch (err) {
      setStageError(err instanceof Error ? err.message : 'Не удалось перевести в заявку');
    }
  };

  const handleOpenUnqualify = () => {
    if (!canMarkChainUnqualified || !targetLeadIdForUnqualify) {
      setStageError('Нельзя закрыть как некачественный: действие доступно только на последней актуальной стадии цепочки.');
      return;
    }
    setStageError(null);
    setIsUnqualOpen(true);
  };

  const navigateToReservation = (reservationId?: string | null) => {
    const opened = openEntitySecondary('reservations', 'reservation', reservationId);
    if (!opened && onWorkflowNavigate) {
      onWorkflowNavigate('reservation', {
        leadId: application?.leadId,
        reservationId: reservationId ?? undefined,
      });
    }
  };

  const openLinkedLead = (closeCurrent = false): boolean => {
    if (!application?.leadId) return false;

    if (onOpenLead) {
      onOpenLead(application.leadId);
      if (closeCurrent) {
        onClose();
      }
      return true;
    }

    const opened = openEntitySecondary('leads', 'lead', application.leadId);
    if (opened && closeCurrent) {
      onClose();
    }
    return opened;
  };

  const handleMarkDuplicate = async () => {
    if (!lead || !USE_API || lead.isDuplicate) return;
    setStageError(null);
    try {
      await updateLead.mutateAsync({ id: lead.id, patch: { isDuplicate: true } });
    } catch (err) {
      setStageError(err instanceof Error ? err.message : 'Не удалось пометить как дубль');
    }
  };

  const canPrepareReservation =
    !!application
    && USE_API
    && application.stage !== 'departure'
    && application.stage !== 'completed'
    && application.stage !== 'cancelled';

  const canMoveLeadToReservation =
    !!application?.leadId
    && USE_API
    && application.stage !== 'reservation'
    && application.stage !== 'departure'
    && application.stage !== 'completed'
    && application.stage !== 'cancelled';

  const handlePrepareReservation = async () => {
    if (!application || !canPrepareReservation) return;

    setStageError(null);

    const toCreate = application.positions.filter(
      (p) => p.readyForReservation && (!p.status || p.status === 'no_reservation'),
    );
    const hasAnyReservation = application.positions.some(
      (p) => p.status === 'unit_selected' || p.status === 'reserved' || p.status === 'conflict',
    );

    if (toCreate.length === 0 && !hasAnyReservation) {
      setStageError('Нет готовых позиций без брони. Отметьте позицию как готовую к брони.');
      return;
    }

    try {
      for (const position of toCreate) {
        const { plannedStart, plannedEnd } = buildReservationWindow(position, application);
        await createReservation.mutateAsync({
          applicationItemId: position.id,
          sourcingType: position.sourcingType,
          internalStage: resolveInitialReservationStage(position.sourcingType),
          plannedStart,
          plannedEnd,
        });
      }

      if (canMoveLeadToReservation && application.leadId) {
        await changeStage.mutateAsync({ id: application.leadId, stage: 'reservation' });
      }
    } catch (err) {
      setStageError(
        err instanceof Error
          ? err.message
          : 'Не удалось создать бронь из готовых позиций',
      );
    }
  };

  const toolbarChips = [
    <ToolbarPill key="manager" icon={<UserPlus className="w-3 h-3" />} label={isLead ? lead!.manager : application!.responsibleManager} />,
    <ToolbarPill
      key="date"
      icon={<Calendar className="w-3 h-3" />}
      label={
        isLead
          ? lead!.date
            ? new Date(lead!.date).toLocaleDateString('ru-RU')
            : 'Dates'
          : application!.requestedDate
            ? new Date(application!.requestedDate).toLocaleDateString('ru-RU')
            : 'Dates'
      }
    />,
  ];

  if (isLead) {
    toolbarChips.push(
      <SourceBadge
        key="source"
        source={lead!.source}
        channel={lead!.sourceChannel}
        size="md"
      />,
    );

    if (lead!.isUrgent) {
      toolbarChips.push(
        <ToolbarPill key="urgent" icon={<AlertCircle className="w-3 h-3 text-red-500" />} label="Срочно" muted={false} />,
      );
    }

    if (lead!.isNew) toolbarChips.push(<span key="new" className={`${headerStatusBadgeClass} ${badgeTones.success}`}>Новый</span>);
    if (lead!.isDuplicate) toolbarChips.push(<span key="dup" className={`${headerStatusBadgeClass} ${badgeTones.caution}`}>Дубль</span>);
    if (lead!.isStale) toolbarChips.push(<span key="stale" className={`${headerStatusBadgeClass} ${badgeTones.muted}`}>Завис</span>);
    if (lead!.hasNoContact) toolbarChips.push(<span key="no-contact" className={`${headerStatusBadgeClass} ${badgeTones.caution}`}>Без контакта</span>);
  } else {
    toolbarChips.push(<ToolbarPill key="positions" icon={<FileText className="w-3 h-3" />} label={`Позиций: ${application!.positions.length}`} />);
    if (appReadiness) {
      toolbarChips.push(
        <ToolbarPill key="readiness" icon={<appReadiness.Icon className="w-3 h-3" />} label={appReadiness.label} />,
      );
    }
  }

  const linkedActions = isLead ? (
    <>
      {canOpenClientDetails ? (
        <ActionButton icon={<Building2 className="w-3.5 h-3.5" />} label="Открыть клиента" onClick={openClientDetails} />
      ) : USE_API ? (
        <ActionButton
          icon={<LinkIcon className="w-3.5 h-3.5" />}
          label="Создать клиента"
          onClick={() => void handleCreateClientFromLead()}
        />
      ) : (
        <ActionButton icon={<LinkIcon className="w-3.5 h-3.5" />} label="Связать с клиентом" onClick={onOpenClient} />
      )}
      {USE_API ? (
        <ActionButton
          icon={<Edit3 className="w-3.5 h-3.5" />}
          label="Редактировать лид"
          onClick={() => setIsEditOpen(true)}
        />
      ) : null}
    </>
  ) : (
    <>
      <ActionButton
        icon={<Building2 className="w-3.5 h-3.5" />}
        label="Открыть клиента"
        onClick={canOpenClientDetails ? openClientDetails : onOpenClient}
      />
      {application!.leadId ? (
        <ActionButton
          icon={<UserIcon className="w-3.5 h-3.5" />}
          label="Открыть лид"
          onClick={() => {
            void openLinkedLead();
          }}
        />
      ) : null}
      {USE_API ? (
        <ActionButton
          icon={<Edit3 className="w-3.5 h-3.5" />}
          label="Редактировать заявку"
          onClick={() => setIsEditAppOpen(true)}
        />
      ) : onEditApplication ? (
        <ActionButton icon={<Edit3 className="w-3.5 h-3.5" />} label="Редактировать заявку" onClick={onEditApplication} />
      ) : null}
    </>
  );

  const activityEntityType = isLead ? 'lead' : 'application';
  const activityEntityId = isLead ? lead?.id : application?.id;
  const activityQuery = useEntityActivity(
    activityEntityType,
    activityEntityId,
    USE_API && !!activityEntityId,
  );
  const activityEntries = activityQuery.data
    ? mapActivityEntries(activityQuery.data)
    : MOCK_ACTIVITY.map((item) => ({
        id: item.id,
        actor: item.who,
        text: item.text,
        time: item.time,
      }));

  const main = (
    <EntityModalShell className="pb-10 space-y-6">
      <EntityModalHeader
        entityLabel={entityType}
        entitySwitcherOptions={entitySwitcherOptions}
        title={title}
        chips={toolbarChips}
        primaryAction={
          isLead
            ? {
                label: cta.label,
                icon: <ArrowRight className="w-3 h-3" />,
                onClick: hasLinkedApplication
                  ? () => {
                      const opened = openEntitySecondary(
                        'applications',
                        'application',
                        applicationEntityId,
                      );
                      if (!opened && onWorkflowNavigate && lead) {
                        onWorkflowNavigate('application', { leadId: lead.id });
                        return;
                      }
                    }
                  : canPromoteToApplication
                    ? handlePromoteToApplication
                    : undefined,
              }
            : undefined
        }
        secondaryAction={
          isLead && canMarkUnqualified && cta.secondary
            ? {
                label: cta.secondary,
                onClick: USE_API ? handleOpenUnqualify : undefined,
              }
            : undefined
        }
        secondaryActions={
          USE_API
            ? [
                ...(!isLead && canMarkChainUnqualified
                  ? [
                      {
                        label: 'Закрыть как некачественный',
                        onClick: handleOpenUnqualify,
                      },
                    ]
                  : []),
                ...(!isLead && application!.stage !== 'cancelled'
                  ? [
                      {
                        label: 'Отменить заявку',
                        onClick: () => setIsCancelAppOpen(true),
                      },
                    ]
                  : []),
                ...(leadEntityId
                  ? [
                      {
                        label: 'Откат и удаление',
                        render: (
                          <LifecycleRollbackActions
                            leadId={leadEntityId}
                            canRollback={canRollbackCurrentStage}
                            onRollbackSuccess={handleLifecycleRollbackSuccess}
                            onChainDeleted={handleLifecycleChainDeleted}
                            onError={setStageError}
                          />
                        ),
                      },
                    ]
                  : []),
              ]
            : undefined
        }
      />

      {stageError ? (
        <div
          role="alert"
          className="-mt-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-700"
        >
          {stageError}
        </div>
      ) : null}

      {isLead && !hasLinkedApplication && !canPromoteToApplication && USE_API && leadMissingFields.length > 0 ? (
        <div className="-mt-2 text-[11px] text-amber-600">
          Для перевода в заявку не хватает: {leadMissingFields.join(', ')}
        </div>
      ) : null}

      {isLead && lead!.isDuplicate && canOpenClientDetails && (
        <div className="-mt-2 text-[11px] text-blue-600">
          <button type="button" onClick={openClientDetails} className="hover:underline">
            Открыть клиента
          </button>
        </div>
      )}

      <EntitySection title="Основные данные">
        <EntityMetaGrid>
          {isLead ? (
            (() => {
              const clientDisplay = resolveClientDisplay({ company: lead!.company, personName: lead!.client });
              const disabledInline = !canInlineEditLead;

              return (
                <>
                  <PropertyRow
                    icon={<UserPlus className="w-3 h-3" />}
                    label={clientDisplay.primaryLabel}
                    value={
                      lead!.company ? (
                        <button
                          type="button"
                          onClick={canOpenClientDetails ? openClientDetails : undefined}
                          className={propertyLinkInlineClass}
                          disabled={!canOpenClientDetails}
                        >
                          {clientDisplay.primaryText}
                        </button>
                      ) : (
                        <InlineText
                          value={lead!.client ?? ''}
                          onSave={makeLeadFieldSaver((v) => ({ contactName: v.trim() }))}
                          ariaLabel="Имя контакта"
                          placeholder="Имя контакта"
                          required
                          disabled={disabledInline}
                          maxLength={200}
                        />
                      )
                    }
                  />
                  <PropertyRow icon={<UserPlus className="w-3 h-3" />} label="Менеджер" value={<InlineValue>{lead!.manager}</InlineValue>} />
                  <PropertyRow
                    icon={<Building2 className="w-3 h-3" />}
                    label={lead!.company ? 'Контактное лицо' : 'Компания'}
                    value={
                      lead!.company ? (
                        <InlineText
                          value={lead!.client ?? ''}
                          onSave={makeLeadFieldSaver((v) => ({ contactName: v.trim() }))}
                          ariaLabel="Имя контакта"
                          placeholder="Имя контакта"
                          required
                          disabled={disabledInline}
                          maxLength={200}
                        />
                      ) : (
                        <InlineText
                          value={lead!.company ?? ''}
                          onSave={makeLeadFieldSaver((v) => ({
                            contactCompany: v.trim() ? v.trim() : null,
                          }))}
                          ariaLabel="Компания"
                          placeholder="Компания (физ. лицо, если пусто)"
                          emptyDisplay={<EmptyValue text="физ. лицо" />}
                          disabled={disabledInline}
                          maxLength={200}
                        />
                      )
                    }
                  />
                  <PropertyRow
                    icon={<Phone className="w-3 h-3" />}
                    label="Телефон"
                    value={
                      <InlineText
                        value={lead!.phone ?? ''}
                        onSave={makeLeadFieldSaver((v) => ({ contactPhone: v.trim() }))}
                        ariaLabel="Телефон"
                        placeholder="+7…"
                        required
                        disabled={disabledInline}
                        emptyDisplay={
                          <span className="text-[11px] text-amber-600">Не заполнено · нужно для заявки</span>
                        }
                      />
                    }
                  />
                  <PropertyRow
                    icon={<Truck className="w-3 h-3" />}
                    label="Тип техники"
                    value={
                      <InlineText
                        value={lead!.equipmentType && lead!.equipmentType !== '—' ? lead!.equipmentType : ''}
                        onSave={makeLeadFieldSaver((v) => ({
                          equipmentTypeHint: v.trim() ? v.trim() : null,
                        }))}
                        ariaLabel="Тип техники"
                        placeholder="Например: экскаватор"
                        disabled={disabledInline}
                      />
                    }
                  />
                  <PropertyRow
                    icon={<MapPin className="w-3 h-3" />}
                    label="Адрес"
                    value={
                      <InlineText
                        value={lead!.address ?? ''}
                        onSave={makeLeadFieldSaver((v) => ({
                          address: v.trim() ? v.trim() : null,
                        }))}
                        ariaLabel="Адрес"
                        placeholder="Адрес объекта"
                        maxLength={500}
                        disabled={disabledInline}
                        emptyDisplay={
                          <span className="text-[11px] text-amber-600">Не заполнено · нужно для заявки</span>
                        }
                      />
                    }
                  />
                  <PropertyRow
                    icon={<Calendar className="w-3 h-3" />}
                    label="Желаемая дата"
                    value={
                      <InlineDate
                        value={lead!.date ?? ''}
                        onSave={makeLeadFieldSaver((v) => ({
                          requestedDate: v ? v : null,
                        }))}
                        ariaLabel="Желаемая дата"
                        disabled={disabledInline}
                        emptyDisplay={
                          <span className="text-[11px] text-amber-600">Не заполнено · нужно для заявки</span>
                        }
                      />
                    }
                  />
                  <PropertyRow
                    icon={<Clock className="w-3 h-3" />}
                    label="Время"
                    value={
                      <InlineText
                        value={lead!.timeWindow ?? ''}
                        onSave={makeLeadFieldSaver((v) => ({
                          timeWindow: v.trim() ? v.trim() : null,
                        }))}
                        ariaLabel="Окно времени"
                        placeholder="например: 09:00–18:00"
                        disabled={disabledInline}
                        emptyDisplay={<EmptyValue />}
                      />
                    }
                  />
                  <PropertyRow
                    icon={<HelpCircle className="w-3 h-3" />}
                    label="Источник"
                    value={
                      <InlineSelect<SourceChannel>
                        value={(lead!.sourceChannel as SourceChannel) ?? 'manual'}
                        options={LEAD_SOURCE_OPTIONS}
                        onSave={makeLeadFieldSaver((v) => ({ source: v as SourceChannel }))}
                        ariaLabel="Источник"
                        disabled={disabledInline}
                      />
                    }
                  />
                </>
              );
            })()
          ) : (
            (() => {
              const clientDisplay = resolveClientDisplay({
                company: application!.clientCompany,
                personName: application!.clientName,
              });

              return (
                <>
                  <PropertyRow
                    icon={<UserPlus className="w-3 h-3" />}
                    label={clientDisplay.primaryLabel}
                    value={
                      <button
                        type="button"
                        onClick={canOpenClientDetails ? openClientDetails : undefined}
                        className={propertyLinkInlineClass}
                        disabled={!canOpenClientDetails}
                      >
                        {clientDisplay.primaryText}
                      </button>
                    }
                  />
                  <PropertyRow
                    icon={<UserPlus className="w-3 h-3" />}
                    label="Менеджер"
                    value={
                      canInlineEditApp && managerOptions.length > 0 ? (
                        <InlineSelect<string>
                          value={application!.responsibleManagerId ?? UNASSIGNED_MANAGER_OPTION}
                          options={managerOptions}
                          onSave={makeAppFieldSaver((v) => ({
                            responsibleManagerId:
                              v === UNASSIGNED_MANAGER_OPTION ? undefined : v,
                          }))}
                          ariaLabel="Ответственный менеджер"
                          disabled={!canInlineEditApp || managersQuery.isPending}
                        />
                      ) : (
                        <InlineValue>{application!.responsibleManager}</InlineValue>
                      )
                    }
                  />
                  <PropertyRow
                    icon={<Building2 className="w-3 h-3" />}
                    label={application!.clientCompany ? 'Контактное лицо' : 'Компания'}
                    value={
                      application!.clientCompany ? (
                        <InlineValue>{clientDisplay.secondaryText ?? '—'}</InlineValue>
                      ) : (
                        <EmptyValue text="физ. лицо" />
                      )
                    }
                  />
                  <PropertyRow icon={<FileText className="w-3 h-3" />} label="Позиций" value={<InlineValue>{application!.positions.length}</InlineValue>} />
                  <PropertyRow
                    icon={<Phone className="w-3 h-3" />}
                    label="Телефон"
                    value={
                      <div className="space-y-0.5">
                        <InlineValue>{application!.clientPhone ?? '—'}</InlineValue>
                        {canInlineEditApp ? (
                          <span className="text-[10px] text-gray-500">Редактируйте телефон в карточке клиента.</span>
                        ) : null}
                      </div>
                    }
                  />
                  <PropertyRow
                    icon={<MapPin className="w-3 h-3" />}
                    label="Адрес"
                    value={
                      <InlineText
                        value={application!.address ?? ''}
                        onSave={makeAppFieldSaver((v) => ({
                          address: v.trim() ? v.trim() : null,
                        }))}
                        ariaLabel="Адрес"
                        disabled={!canInlineEditApp}
                        emptyDisplay={<EmptyValue />}
                      />
                    }
                  />
                  <PropertyRow
                    icon={<Calendar className="w-3 h-3" />}
                    label="Желаемая дата"
                    value={
                      <InlineDate
                        value={application!.requestedDate ?? ''}
                        onSave={makeAppFieldSaver((v) => ({
                          requestedDate: v ? v : null,
                        }))}
                        ariaLabel="Желаемая дата"
                        disabled={!canInlineEditApp}
                        emptyDisplay={<EmptyValue />}
                      />
                    }
                  />
                  <PropertyRow
                    icon={<AlertCircle className="w-3 h-3" />}
                    label="Срочно"
                    value={
                      <InlineSelect<string>
                        value={application!.isUrgent ? 'true' : 'false'}
                        options={BOOL_OPTIONS}
                        onSave={makeAppFieldSaver((v) => ({ isUrgent: v === 'true' }))}
                        ariaLabel="Признак срочности"
                        disabled={!canInlineEditApp}
                      />
                    }
                  />
                  <PropertyRow
                    icon={<Clock className="w-3 h-3" />}
                    label="Ночная работа"
                    value={
                      <InlineSelect<string>
                        value={application!.nightWork ? 'true' : 'false'}
                        options={BOOL_OPTIONS}
                        onSave={makeAppFieldSaver((v) => ({ nightWork: v === 'true' }))}
                        ariaLabel="Ночная работа"
                        disabled={!canInlineEditApp}
                      />
                    }
                  />
                </>
              );
            })()
          )}
        </EntityMetaGrid>
      </EntitySection>

      {!isLead && (
        <EntitySection
          title="Позиции заявки"
          action={
            canInlineEditApp ? (
              <button
                type="button"
                onClick={() => setIsAddPositionOpen(true)}
                className="inline-flex items-center gap-1 h-7 px-2 rounded text-[11px] text-gray-700 hover:bg-gray-100 border border-gray-200 transition-colors"
              >
                <Plus className="w-3 h-3" /> Добавить позицию
              </button>
            ) : null
          }
        >
          {application!.positions.length > 0 ? (
            <div className="space-y-1.5">
              {application!.positions.map((pos, idx) => (
                <PositionCard
                  key={pos.id}
                  pos={pos}
                  idx={idx}
                  canEdit={canInlineEditApp}
                  onEdit={() => setEditingPosition(pos)}
                  onDelete={() => {
                    setPositionError(null);
                    setDeletingPosition(pos);
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="text-[12px] text-gray-500 border border-dashed border-gray-200 rounded-md py-4 text-center">
              В заявке пока нет позиций
            </div>
          )}
        </EntitySection>
      )}

      {!isLead && (
        <EntitySection title="Комментарий">
          <InlineText
            value={application!.comment ?? ''}
            onSave={makeAppFieldSaver((v) => ({
              comment: v.trim() ? v.trim() : null,
            }))}
            ariaLabel="Комментарий"
            disabled={!canInlineEditApp}
            multiline
            emptyDisplay={
              <span className="text-[11px] text-gray-400 italic">Нажмите, чтобы добавить…</span>
            }
          />
        </EntitySection>
      )}

      {isLead && (
        <EntitySection title="Комментарий">
          <InlineText
            value={lead!.comment ?? ''}
            onSave={makeLeadFieldSaver((v) => ({
              comment: v.trim() ? v.trim() : null,
            }))}
            ariaLabel="Комментарий"
            disabled={!canInlineEditLead}
            multiline
            emptyDisplay={
              <span className="text-[11px] text-gray-400 italic">Нажмите, чтобы добавить…</span>
            }
          />
        </EntitySection>
      )}

      <EntitySection title="Связанные действия">
        <div className="space-y-0.5">{linkedActions}</div>
      </EntitySection>

      <EntityCommentsPanel
        tab={tab}
        onTabChange={setTab}
        commentsCount={MOCK_COMMENTS.length}
        commentsLabel="Комментарии"
        activityLabel="Журнал изменений"
        commentsContent={<EntityCommentList comments={MOCK_COMMENTS} emptyText="Комментариев пока нет" />}
        activityContent={<EntityActivityList entries={activityEntries} emptyText="Событий пока нет" />}
      />
    </EntityModalShell>
  );

  const leadSections: EntitySidebarSection[] = isLead ? [
    {
      title: 'Статус и мета',
      content: (
        <>
          <SidebarField label="Этап" value={<span className={`${sidebarStatusBadgeClass} ${badgeTones.source}`}>Лид</span>} />
          <SidebarField label="Источник" value={<SourceBadge source={lead!.source} channel={lead!.sourceChannel} size="sm" />} />
          <SidebarField label="Создан" value="21.04.2026" />
          <SidebarField label="Активность" value={lead!.lastActivity} />
          <SidebarField label="Менеджер" value={lead!.manager} />
        </>
      ),
    },
    {
      title: 'Готовность к заявке',
      content: (
        <>
          {(() => {
            const missing: string[] = [];
            if (!lead!.address) missing.push('адрес');
            if (!lead!.date) missing.push('дата');
            if (lead!.hasNoContact || !lead!.phone) missing.push('контакт');

            return missing.length === 0 ? (
              <div className={`${sidebarStatusBadgeClass} ${badgeTones.success}`}>
                <CheckCircle2 className="w-3 h-3" /> Готов к заявке
              </div>
            ) : (
              <div className="space-y-1">
                <div className={`${sidebarStatusBadgeClass} ${badgeTones.caution}`}>
                  <AlertCircle className="w-3 h-3" /> Не хватает данных
                </div>
                <div className="text-[11px] text-gray-600">Заполните: {missing.join(', ')}</div>
              </div>
            );
          })()}
          <div className="pt-2">
            <Button
              size="sm"
              className="h-7 w-full text-[11px]"
              onClick={
                hasLinkedApplication
                  ? () => {
                      const opened = openEntitySecondary(
                        'applications',
                        'application',
                        applicationEntityId,
                      );
                      if (!opened && onWorkflowNavigate && lead) {
                        onWorkflowNavigate('application', { leadId: lead.id });
                        return;
                      }
                    }
                  : canPromoteToApplication
                    ? handlePromoteToApplication
                    : undefined
              }
              disabled={hasLinkedApplication ? false : !canPromoteToApplication || changeStage.isPending}
            >
              {hasLinkedApplication
                ? 'Открыть заявку'
                : changeStage.isPending
                  ? 'Переводим…'
                  : 'Перевести в заявку'}
            </Button>
          </div>
        </>
      ),
    },
    {
      title: 'Связанные записи',
      content: (
        <RelatedRecordsFields items={leadRelatedRecordItems} />
      ),
    },
    {
      title: 'История',
      content: <EntityActivityList entries={activityEntries.slice(0, 3)} emptyText="Событий пока нет" />,
    },
  ] : [];

  const applicationSections: EntitySidebarSection[] = !isLead ? [
    {
      title: 'Статус и мета',
      content: (
        <>
          <SidebarField label="Этап" value={<span className={`${sidebarStatusBadgeClass} ${badgeTones.progress}`}>Заявка</span>} />
          <SidebarField label="Номер" value={application!.number} />
          <SidebarField label="Обновлено" value={application!.lastActivity} />
          <SidebarField label="Менеджер" value={application!.responsibleManager} />
        </>
      ),
    },
    {
      title: 'Готовность к брони',
      content: appReadiness ? (
        <>
          <div className={`${sidebarStatusBadgeClass} ${appReadiness.tone}`}>
            <appReadiness.Icon className="w-3 h-3" />
            {appReadiness.label}
          </div>
          <div className="text-[11px] text-gray-500 mt-1">
            {application!.positions.filter((p) => p.status && p.status !== 'no_reservation').length} из {application!.positions.length} позиций в бронировании
          </div>
          <div className="pt-2">
            <Button
              size="sm"
              className="h-7 w-full text-[11px]"
              onClick={
                hasLinkedReservation
                  ? () => navigateToReservation(reservationEntityId)
                  : () => void handlePrepareReservation()
              }
              disabled={
                hasLinkedReservation
                  ? false
                  : !canPrepareReservation || changeStage.isPending || createReservation.isPending
              }
            >
              {hasLinkedReservation ? 'Открыть бронь' : 'Подготовить к брони'}
            </Button>
          </div>
        </>
      ) : (
        <EmptyValue text="Нет данных" />
      ),
    },
    {
      title: 'Связанные записи',
      content: (
        <RelatedRecordsFields items={applicationRelatedRecordItems} />
      ),
    },
    {
      title: 'Позиции',
      content: (
        <div className="space-y-1">
          {application!.positions.map((position, index) => {
            const status = position.status || 'no_reservation';
            const statusMeta = positionStatusMeta[status];

            return (
              <div key={position.id} className="flex items-center justify-between gap-1 text-[11px]">
                <span className="truncate text-gray-700">
                  {index + 1}. {position.equipmentType}
                </span>
                <span className={`${sidebarStatusBadgeClass} ${statusMeta.tone} flex-shrink-0`}>
                  <statusMeta.Icon className="w-2.5 h-2.5" />
                  {statusMeta.label}
                </span>
              </div>
            );
          })}
        </div>
      ),
    },
    {
      title: 'История',
      content: <EntityActivityList entries={activityEntries.slice(0, 3)} emptyText="Событий пока нет" />,
    },
  ] : [];

  const sidebar = isLead ? (
    <EntitySummarySidebar
      sections={leadSections}
      quickActionsTitle="Быстрые действия"
      quickActions={
        <div className="space-y-1">
          <Button
            size="sm"
            variant="outline"
            className="h-6 w-full justify-start text-[11px]"
            onClick={() => void handleMarkDuplicate()}
            disabled={!USE_API || lead!.isDuplicate || updateLead.isPending}
          >
            Отметить как дубль
          </Button>
          {canMarkUnqualified ? (
            <Button
              size="sm"
              variant="outline"
              className="h-6 w-full justify-start text-[11px]"
              onClick={handleOpenUnqualify}
              disabled={!USE_API}
            >
              Пометить некачественным
            </Button>
          ) : null}
        </div>
      }
    />
  ) : (
    <EntitySummarySidebar
      sections={applicationSections}
      quickActionsTitle="Быстрые действия"
      quickActions={
        <div className="space-y-1">
          <Button
            size="sm"
            variant="outline"
            className="h-6 w-full justify-start text-[11px]"
            onClick={() => openSecondary('applications')}
          >
            Открыть список заявок
          </Button>
          {canMarkChainUnqualified ? (
            <Button
              size="sm"
              variant="outline"
              className="h-6 w-full justify-start text-[11px]"
              onClick={handleOpenUnqualify}
            >
              Закрыть как некачественный
            </Button>
          ) : null}
          <Button
            size="sm"
            variant="outline"
            className="h-6 w-full justify-start text-[11px]"
            onClick={USE_API && application!.stage !== 'cancelled' ? () => setIsCancelAppOpen(true) : undefined}
            disabled={!USE_API || application!.stage === 'cancelled'}
          >
            Отменить заявку
          </Button>
        </div>
      }
    />
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
      {isLead ? (
        <>
          <EditLeadDialog open={isEditOpen} onOpenChange={setIsEditOpen} lead={lead ?? null} />
        </>
      ) : (
        <>
          <EditApplicationDialog
            open={isEditAppOpen}
            onOpenChange={setIsEditAppOpen}
            application={application ?? null}
          />
          <CancelApplicationDialog
            open={isCancelAppOpen}
            onOpenChange={setIsCancelAppOpen}
            applicationId={application?.id ?? null}
            applicationNumber={application?.number ?? null}
            onDone={onClose}
          />
          {application?.id ? (
            <>
              <PositionDialog
                open={isAddPositionOpen}
                onOpenChange={setIsAddPositionOpen}
                mode="add"
                applicationId={application.id}
              />
              <PositionDialog
                open={!!editingPosition}
                onOpenChange={(v) => !v && setEditingPosition(null)}
                mode="edit"
                applicationId={application.id}
                position={editingPosition ?? undefined}
              />
              <AlertDialog
                open={!!deletingPosition}
                onOpenChange={(v) => {
                  if (!v) {
                    setDeletingPosition(null);
                    setPositionError(null);
                  }
                }}
              >
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Удалить позицию?</AlertDialogTitle>
                    <AlertDialogDescription>
                      {deletingPosition
                        ? `Позиция «${deletingPosition.equipmentType}» будет удалена без возможности восстановления.`
                        : ''}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  {positionError ? (
                    <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-700">
                      {positionError}
                    </div>
                  ) : null}
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={deleteItemMutation.isPending}>
                      Отмена
                    </AlertDialogCancel>
                    <AlertDialogAction
                      disabled={deleteItemMutation.isPending}
                      onClick={async (e) => {
                        e.preventDefault();
                        if (!deletingPosition || !application?.id) return;
                        setPositionError(null);
                        try {
                          await deleteItemMutation.mutateAsync({
                            itemId: deletingPosition.id,
                            applicationId: application.id,
                          });
                          setDeletingPosition(null);
                        } catch (err) {
                          setPositionError(
                            err instanceof Error ? err.message : 'Не удалось удалить позицию',
                          );
                        }
                      }}
                    >
                      {deleteItemMutation.isPending ? 'Удаляем…' : 'Удалить'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          ) : null}
        </>
      )}
      <UnqualifyLeadDialog
        open={isUnqualOpen}
        onOpenChange={setIsUnqualOpen}
        leadId={targetLeadIdForUnqualify ?? null}
        onDone={onClose}
      />
    </>
  );
}
