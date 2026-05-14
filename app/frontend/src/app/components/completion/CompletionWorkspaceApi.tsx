import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  AlertTriangle,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  FileText,
  Loader2,
  MapPin,
  UserPlus,
  XCircle,
} from 'lucide-react';
import type { Lead } from '../../types/kanban';
import type { LeadApi } from '../../lib/leadsApi';
import { useCompletionQuery } from '../../hooks/useCompletionsQuery';
import { useDepartureQuery } from '../../hooks/useDeparturesQuery';
import { useCreateCompletion, useUpdateCompletion } from '../../hooks/useCompletionMutations';
import { useCreateLead } from '../../hooks/useLeadMutations';
import type { ClientOrderHistoryItem } from '../../types/client';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { useLayout } from '../shell/layoutStore';
import { buildAbsoluteEntityUrl } from '../shell/routeSync';
import { RepeatOrderDialog, type RepeatOrderPayload } from '../client/RepeatOrderDialog';
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
import { EntityMetaGrid, EntityModalHeader, EntitySection } from '../detail/EntityModalFramework';
import { LifecycleRollbackActions } from '../detail/LifecycleRollbackActions';

interface Props {
  lead: Lead;
  completionId?: string;
  departureId?: string;
  onClose: () => void;
  onOpenClient?: (lead: Lead) => void;
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

const sidebarStatusBadgeClass =
  'inline-flex items-center gap-1 h-5 px-1.5 rounded border text-[11px]';

export function CompletionWorkspaceApi({
  lead,
  completionId,
  departureId,
  onClose,
  onOpenClient,
}: Props) {
  const { setActiveSecondaryNav, openSecondaryWithEntity, activeEntityType } = useLayout();

  const [resolvedCompletionId, setResolvedCompletionId] = useState<string | undefined>(completionId);
  const [note, setNote] = useState('');
  const [unqualifiedReason, setUnqualifiedReason] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);

  const completionQuery = useCompletionQuery(resolvedCompletionId, !!resolvedCompletionId);
  const departureQuery = useDepartureQuery(departureId, !!departureId);
  const hasDepartureId = Boolean(departureId);

  const createMutation = useCreateCompletion();
  const updateMutation = useUpdateCompletion();
  const createLeadMutation = useCreateLead();

  const [repeatOpen, setRepeatOpen] = useState(false);
  const [repeatSource, setRepeatSource] = useState<ClientOrderHistoryItem | null>(null);
  const [createdLeadId, setCreatedLeadId] = useState<string | null>(null);
  const [repeatError, setRepeatError] = useState<string | null>(null);

  useEffect(() => {
    setResolvedCompletionId(completionId);
  }, [completionId]);

  useEffect(() => {
    if (!resolvedCompletionId && departureQuery.data?.completion?.id) {
      setResolvedCompletionId(departureQuery.data.completion.id);
    }
  }, [departureQuery.data, resolvedCompletionId]);

  useEffect(() => {
    if (!completionQuery.data) return;
    setNote(completionQuery.data.completionNote ?? '');
    setUnqualifiedReason(completionQuery.data.unqualifiedReason ?? '');
  }, [completionQuery.data]);

  const busy = createMutation.isPending || updateMutation.isPending;

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
    { label: 'Операции', onClick: () => openSecondary('completion') },
    { label: 'Завершение' },
  ];

  const completion = completionQuery.data;
  const departure = departureQuery.data;
  const completionStatusLabel = completion
    ? completion.outcome === 'completed'
      ? 'Завершен'
      : 'Некачественный'
    : 'Ожидает завершения';
  const completionStatusTone = completion
    ? completion.outcome === 'completed'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
      : 'border-gray-200 bg-gray-100 text-gray-700'
    : 'border-blue-200 bg-blue-50 text-blue-700';

  const createCompletedDisabledReason = useMemo(() => {
    if (completion) return 'Завершение уже создано';
    if (!departure) return 'Выезд не загружен';
    if (departure.status === 'cancelled') return 'Отмененный выезд нельзя завершить';
    if (departure.status !== 'arrived' && departure.status !== 'completed') {
      return 'Сначала зафиксируйте прибытие в выезде';
    }
    return null;
  }, [completion, departure]);

  const createUnqualifiedDisabledReason = useMemo(() => {
    if (completion) return 'Завершение уже создано';
    if (!departure) return 'Выезд не загружен';
    if (departure.status === 'cancelled') return 'Отмененный выезд нельзя завершить';
    return null;
  }, [completion, departure]);

  const createNextStepReason =
    createCompletedDisabledReason && createUnqualifiedDisabledReason
      ? createCompletedDisabledReason
      : null;

  const runAction = async (fn: () => Promise<unknown>) => {
    setActionError(null);
    try {
      await fn();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Операция не выполнена');
    }
  };

  const handleCreate = async (outcome: 'completed' | 'unqualified') => {
    if (!departure) return;
    const disabledReason =
      outcome === 'completed'
        ? createCompletedDisabledReason
        : createUnqualifiedDisabledReason;
    if (disabledReason) return;

    await runAction(async () => {
      const created = await createMutation.mutateAsync({
        departureId: departure.id,
        outcome,
        completionNote: note.trim() || undefined,
        unqualifiedReason:
          outcome === 'unqualified'
            ? unqualifiedReason.trim() || note.trim() || 'manual_unqualified'
            : undefined,
      });
      setResolvedCompletionId(created.id);
    });
  };

  const handleSave = async () => {
    if (!completion) return;
    await runAction(async () => {
      await updateMutation.mutateAsync({
        id: completion.id,
        patch: {
          completionNote: note.trim() || null,
          unqualifiedReason:
            completion.outcome === 'unqualified'
              ? unqualifiedReason.trim() || null
              : undefined,
        },
      });
    });
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

  if (
    (!!resolvedCompletionId && completionQuery.isPending && !completion)
    || (!resolvedCompletionId && hasDepartureId && departureQuery.isPending && !departure)
  ) {
    return renderShell(
      <div className="flex h-full min-h-[420px] items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Загрузка завершения...
      </div>
    );
  }

  if (completionQuery.isError && resolvedCompletionId) {
    const message = completionQuery.error instanceof Error ? completionQuery.error.message : 'Не удалось загрузить завершение';
    return renderShell(
      <div className="flex h-full min-h-[420px] flex-col items-center justify-center gap-3 px-6 text-center text-sm text-muted-foreground">
        <span>{message}</span>
        <Button size="sm" variant="outline" onClick={onClose}>
          Закрыть
        </Button>
      </div>
    );
  }

  if (!completion && !departure) {
    return renderShell(
      <div className="flex h-full min-h-[420px] flex-col items-center justify-center gap-3 px-6 text-center text-sm text-muted-foreground">
        <span>Нет данных для завершения</span>
        <Button size="sm" variant="outline" onClick={onClose}>
          Закрыть
        </Button>
      </div>
    );
  }

  const linkedClient = completion?.linked.clientCompany
    ?? completion?.linked.clientName
    ?? departure?.linked.clientCompany
    ?? departure?.linked.clientName
    ?? 'Клиент не указан';
  const linkedIds = completion?.linkedIds ?? departure?.linkedIds;
  const linkedManager = completion?.linked.responsibleManagerName
    ?? departure?.linked.responsibleManagerName
    ?? '—';
  const linkedPosition = completion?.linked.positionLabel
    ?? departure?.linked.positionLabel
    ?? '—';
  const linkedReservationId = completion?.linked.reservationId ?? departure?.reservationId;
  const linkedApplicationId = completion?.linked.applicationId ?? departure?.linked.applicationId;
  const linkedApplicationNumber = completion?.linked.applicationNumber ?? departure?.linked.applicationNumber;
  const linkedDepartureId = completion?.departureId ?? departure?.id;
  const linkedLeadId = completion?.linked.leadId ?? departure?.linked.leadId;
  const linkedClientId = completion?.linked.clientId ?? departure?.linked.clientId;
  const leadEntityId = linkedIds?.leadId ?? linkedLeadId;
  const applicationEntityId = linkedIds?.applicationId ?? linkedApplicationId;
  const reservationEntityId = linkedIds?.reservationId ?? linkedReservationId;
  const departureEntityId = linkedIds?.departureId ?? linkedDepartureId;
  const completionEntityId = linkedIds?.completionId ?? completion?.id ?? null;
  const linkedAddress = completion?.context.address ?? departure?.linked.address;
  const linkedPlannedDate = completion?.context.plannedDate ?? departure?.linked.plannedDate;
  const linkedPlannedStart = completion?.context.plannedStart ?? departure?.linked.plannedStart;
  const linkedPlannedTimeFrom = completion?.context.plannedTimeFrom ?? departure?.linked.plannedTimeFrom;
  const linkedPlannedTimeTo = completion?.context.plannedTimeTo ?? departure?.linked.plannedTimeTo;
  const hasLeadLink = !!leadEntityId;
  const hasApplicationLink = !!applicationEntityId;
  const hasReservationLink = !!reservationEntityId;
  const hasDepartureLink = !!departureEntityId;
  const hasCompletionLink = !!completionEntityId;
  const activeSwitcherEntityType = activeEntityType ?? 'completion';
  const canOpenClient = !!onOpenClient && !!(linkedClientId ?? lead.apiClientId);
  const clientLead: Lead = {
    ...lead,
    apiClientId: linkedClientId ?? lead.apiClientId,
  };
  const handleOpenClient = () => {
    if (onOpenClient && clientLead.apiClientId) {
      onOpenClient(clientLead);
      return true;
    }
    return false;
  };
  const repeatOrderSource: ClientOrderHistoryItem | null = completion?.outcome === 'completed'
    ? {
        id: applicationEntityId ?? completion.id,
        leadId: leadEntityId ?? undefined,
        number: linkedApplicationNumber
          ?? (applicationEntityId ? `APP-${applicationEntityId.slice(0, 8).toUpperCase()}` : `CMP-${completion.id.slice(0, 8).toUpperCase()}`),
        date: (linkedPlannedDate ?? completion.completedAt).slice(0, 10),
        status: 'completed',
        positions: [
          {
            equipmentType: completion.linked.equipmentTypeLabel ?? completion.linked.positionLabel,
            quantity: completion.linked.quantity,
            unit: completion.linked.equipmentUnitLabel ?? undefined,
            subcontractor: completion.linked.subcontractorLabel ?? undefined,
          },
        ],
        equipmentSummary: completion.linked.equipmentTypeLabel ?? completion.linked.positionLabel,
        address: linkedAddress ?? undefined,
        reservationId: reservationEntityId ?? undefined,
        departureId: departureEntityId ?? undefined,
        completionId: completionEntityId ?? undefined,
        comment: completion.completionNote ?? undefined,
      }
    : null;
  const handleOpenRepeatOrder = () => {
    if (!repeatOrderSource) return;
    setRepeatError(null);
    setRepeatSource(repeatOrderSource);
    setRepeatOpen(true);
  };
  const handleConfirmRepeatOrder = async (payload: RepeatOrderPayload) => {
    if (!repeatSource) return;
    setRepeatError(null);

    try {
      if (!linkedClientId) {
        throw new Error('Повтор недоступен: у завершения нет связанного клиента.');
      }

      const equipmentHint = repeatSource.positions[0]?.equipmentType ?? repeatSource.equipmentSummary;
      const commentParts = [
        `Повтор заказа ${repeatSource.number}`,
        payload.time ? `Окно: ${payload.time}` : null,
        payload.note.trim() ? payload.note.trim() : null,
      ].filter(Boolean);

      const created = await createLeadMutation.mutateAsync({
        contactName: completion?.linked.clientName ?? lead.client,
        contactCompany: completion?.linked.clientCompany ?? lead.company,
        contactPhone: completion?.linked.clientPhone ?? lead.phone,
        clientId: linkedClientId,
        source: 'manual',
        sourceLabel: 'repeat_order',
        equipmentTypeHint: equipmentHint,
        requestedDate: payload.date || undefined,
        timeWindow: payload.time || undefined,
        address: payload.address.trim() || repeatSource.address || undefined,
        comment: commentParts.join(' · ') || undefined,
      });

      setCreatedLeadId(created.lead.id);
      setRepeatOpen(false);
    } catch (err) {
      setCreatedLeadId(null);
      setRepeatError(err instanceof Error ? err.message : 'Не удалось создать повторный заказ.');
    }
  };
  const shareUrl = completionEntityId
    ? buildAbsoluteEntityUrl('completion', completionEntityId)
    : null;
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
  const handleLifecycleChainDeleted = () => {
    setActionError(null);
    openSecondary('leads');
  };
  const entitySwitcherOptions = [
    {
      id: 'lead',
      label: 'Лид',
      active: activeSwitcherEntityType === 'lead',
      onSelect: hasLeadLink ? () => openEntitySecondary('leads', 'lead', leadEntityId) : undefined,
      disabled: !hasLeadLink,
    },
    {
      id: 'application',
      label: 'Заявка',
      active: activeSwitcherEntityType === 'application',
      onSelect: hasApplicationLink
        ? () => openEntitySecondary('applications', 'application', applicationEntityId)
        : undefined,
      disabled: !hasApplicationLink,
    },
    {
      id: 'reservation',
      label: 'Бронь',
      active: activeSwitcherEntityType === 'reservation',
      onSelect: hasReservationLink
        ? () => openEntitySecondary('reservations', 'reservation', reservationEntityId)
        : undefined,
      disabled: !hasReservationLink,
    },
    {
      id: 'departure',
      label: 'Выезд',
      active: activeSwitcherEntityType === 'departure',
      onSelect: hasDepartureLink
        ? () => openEntitySecondary('departures', 'departure', departureEntityId)
        : undefined,
      disabled: !hasDepartureLink,
    },
    {
      id: 'completed',
      label: 'Завершение',
      active: activeSwitcherEntityType === 'completion',
      onSelect: hasCompletionLink ? () => openEntitySecondary('completion', 'completion', completionEntityId) : undefined,
      disabled: !hasCompletionLink,
    },
  ];

  const main = (
    <div className="max-w-[820px] mx-auto px-4 pb-10 pt-6 sm:px-6 lg:px-8">
      <EntityModalHeader
        entityIcon={<CheckCircle2 className="w-3 h-3" />}
        entityLabel="Завершение"
        entitySwitcherOptions={entitySwitcherOptions}
        title={completion ? `CMP-${completion.id.slice(0, 8).toUpperCase()}` : 'Ожидает завершения'}
        subtitle={
          <>
            <button
              type="button"
              onClick={() =>
                openEntitySecondary('departures', 'departure', departureEntityId)
              }
              disabled={!hasDepartureLink}
              className="text-blue-600 hover:underline disabled:text-gray-500 disabled:no-underline disabled:cursor-not-allowed"
            >
              {linkedDepartureId ? `DEP-${linkedDepartureId.slice(0, 8).toUpperCase()}` : 'Выезд'}
            </button>{' '}
            ·{' '}
            <button
              type="button"
              onClick={() =>
                openEntitySecondary('applications', 'application', applicationEntityId)
              }
              disabled={!hasApplicationLink}
              className="text-blue-600 hover:underline disabled:text-gray-500 disabled:no-underline disabled:cursor-not-allowed"
            >
              {linkedApplicationNumber ?? (linkedApplicationId ? `APP-${linkedApplicationId.slice(0, 8).toUpperCase()}` : 'Заявка')}
            </button>{' '}
            ·{' '}
            <button
              type="button"
              className="text-blue-600 hover:underline disabled:text-gray-500 disabled:no-underline disabled:cursor-not-allowed"
              onClick={canOpenClient ? handleOpenClient : undefined}
              disabled={!canOpenClient}
            >
              {linkedClient}
            </button>
          </>
        }
        chips={[
          <ToolbarPill
            key="manager"
            icon={<UserPlus className="w-3 h-3" />}
            label={linkedManager}
          />,
          <ToolbarPill
            key="position"
            icon={<FileText className="w-3 h-3" />}
            label={linkedPosition}
          />,
        ]}
        primaryAction={{
          label: 'Открыть выезд',
          iconBefore: <ExternalLink className="w-3 h-3" />,
          onClick: hasDepartureLink ? () => openEntitySecondary('departures', 'departure', departureEntityId) : undefined,
          disabled: !hasDepartureLink,
        }}
        secondaryActions={
          leadEntityId
            ? [
                {
                  label: 'Откат и удаление',
                  render: (
                    <LifecycleRollbackActions
                      leadId={leadEntityId}
                      onRollbackSuccess={openLeadLifecycleStage}
                      onChainDeleted={handleLifecycleChainDeleted}
                      onError={setActionError}
                    />
                  ),
                },
              ]
            : undefined
        }
      />

      <NextStepLine
        className="mt-2 mb-4"
        label={completion ? 'Сохранить комментарий' : 'Создать завершение'}
        reason={completion ? null : createNextStepReason}
      />

      {actionError ? (
        <Alert variant="destructive" className="mb-5 py-2 px-3">
          <XCircle className="h-4 w-4" />
          <AlertTitle className="text-[12px]">Операция не выполнена</AlertTitle>
          <AlertDescription className="text-[11px] mt-0.5">{actionError}</AlertDescription>
        </Alert>
      ) : null}

      {createdLeadId ? (
        <Alert className="mb-5 py-2 px-3 border-emerald-200 bg-emerald-50/60">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <AlertTitle className="text-[12px] text-emerald-900">
            Создан новый лид {createdLeadId}
          </AlertTitle>
          <AlertDescription className="text-[11px] mt-0.5 text-emerald-800/85">
            Лид создан на основе завершенного заказа и связан с клиентом.
          </AlertDescription>
        </Alert>
      ) : null}

      {repeatError ? (
        <Alert className="mb-5 py-2 px-3 border-rose-200 bg-rose-50/60">
          <AlertTriangle className="h-4 w-4 text-rose-600" />
          <AlertTitle className="text-[12px] text-rose-900">Повтор заказа не создан</AlertTitle>
          <AlertDescription className="text-[11px] mt-0.5 text-rose-800/85">
            {repeatError}
          </AlertDescription>
        </Alert>
      ) : null}

      {completion ? (
        <EntitySection title="Итог завершения" className="mb-5">
          <EntityMetaGrid>
            <PropertyRow
              icon={<CheckCircle2 className="w-3 h-3" />}
              label="Исход"
              value={completion.outcome === 'completed' ? 'Завершен' : 'Некачественный'}
            />
            <PropertyRow
              icon={<Clock className="w-3 h-3" />}
              label="Дата"
              value={fmtIso(completion.completedAt)}
            />
            <PropertyRow
              icon={<UserPlus className="w-3 h-3" />}
              label="Менеджер"
              value={completion.completedByName ?? linkedManager}
            />
            <PropertyRow
              icon={<FileText className="w-3 h-3" />}
              label="Позиция"
              value={completion.linked.positionLabel}
            />
          </EntityMetaGrid>

          <Textarea
            className="mt-3 min-h-[72px]"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Комментарий по завершению"
            disabled={busy}
          />
          {completion.outcome === 'unqualified' ? (
            <Textarea
              className="mt-2 min-h-[72px]"
              value={unqualifiedReason}
              onChange={(e) => setUnqualifiedReason(e.target.value)}
              placeholder="Причина некачественного завершения"
              disabled={busy}
            />
          ) : null}
          <div className="mt-3">
            <Button size="sm" onClick={() => void handleSave()} disabled={busy}>
              Сохранить комментарий
            </Button>
          </div>
        </EntitySection>
      ) : (
        <EntitySection title="Создать завершение" className="mb-5">
          <div className="mb-2 text-[12px] text-muted-foreground">
            Статус выезда: {departure?.status ?? '—'}
          </div>
          {createCompletedDisabledReason && createCompletedDisabledReason === createUnqualifiedDisabledReason ? (
            <Alert className="mb-3">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle className="text-[12px]">Пока нельзя завершить</AlertTitle>
              <AlertDescription className="text-[11px] mt-0.5">{createCompletedDisabledReason}</AlertDescription>
            </Alert>
          ) : null}
          <Textarea
            className="min-h-[72px]"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Комментарий к завершению"
            disabled={busy}
          />
          <Textarea
            className="mt-2 min-h-[72px]"
            value={unqualifiedReason}
            onChange={(e) => setUnqualifiedReason(e.target.value)}
            placeholder="Причина некачественного завершения (если нужно)"
            disabled={busy}
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              size="sm"
              className="gap-1"
              onClick={() => void handleCreate('completed')}
              disabled={!!createCompletedDisabledReason || busy}
            >
              <CheckCircle2 className="h-3.5 w-3.5" /> Завершить
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => void handleCreate('unqualified')}
              disabled={!!createUnqualifiedDisabledReason || busy}
            >
              Пометить некачественным
            </Button>
          </div>
          {createCompletedDisabledReason && createCompletedDisabledReason !== createUnqualifiedDisabledReason ? (
            <div className="mt-2 text-[11px] text-muted-foreground">
              Для "Завершить": {createCompletedDisabledReason}
            </div>
          ) : null}
          {createUnqualifiedDisabledReason && createUnqualifiedDisabledReason !== createCompletedDisabledReason ? (
            <div className="mt-1 text-[11px] text-muted-foreground">
              Для "Некачественный": {createUnqualifiedDisabledReason}
            </div>
          ) : null}
        </EntitySection>
      )}

      <EntitySection title="Контекст" className="mb-5">
        <EntityMetaGrid>
          <PropertyRow
            icon={<Calendar className="w-3 h-3" />}
            label="Дата и окно"
            value={
              <span>
                {linkedPlannedDate?.slice(0, 10) ?? linkedPlannedStart?.slice(0, 10) ?? '—'}
                {linkedPlannedTimeFrom
                  ? ` · ${linkedPlannedTimeFrom}${linkedPlannedTimeTo ? `-${linkedPlannedTimeTo}` : ''}`
                  : ''}
              </span>
            }
          />
          <PropertyRow
            icon={<MapPin className="w-3 h-3" />}
            label="Адрес"
            value={linkedAddress ?? '—'}
          />
          <PropertyRow
            icon={<Building2 className="w-3 h-3" />}
            label="Клиент"
            value={
              <button
                type="button"
                className="text-blue-600 hover:underline text-left disabled:text-gray-500 disabled:no-underline disabled:cursor-not-allowed"
                onClick={canOpenClient ? handleOpenClient : undefined}
                disabled={!canOpenClient}
              >
                {linkedClient}
              </button>
            }
          />
          <PropertyRow
            icon={<UserPlus className="w-3 h-3" />}
            label="Менеджер"
            value={linkedManager}
          />
        </EntityMetaGrid>
      </EntitySection>

      <div className="space-y-0.5 mb-6">
        {hasDepartureLink && (
          <ActionButton
            icon={<ExternalLink className="w-3.5 h-3.5" />}
            label="Открыть выезд"
            onClick={() => openEntitySecondary('departures', 'departure', departureEntityId)}
          />
        )}
        {hasReservationLink && (
          <ActionButton
            icon={<FileText className="w-3.5 h-3.5" />}
            label="Открыть бронь"
            onClick={() =>
              openEntitySecondary('reservations', 'reservation', reservationEntityId)
            }
          />
        )}
        {hasApplicationLink && (
          <ActionButton
            icon={<FileText className="w-3.5 h-3.5" />}
            label="Открыть заявку"
            onClick={() =>
              openEntitySecondary('applications', 'application', applicationEntityId)
            }
          />
        )}
        {hasLeadLink && (
          <ActionButton
            icon={<UserPlus className="w-3.5 h-3.5" />}
            label="Открыть лид"
            onClick={() => openEntitySecondary('leads', 'lead', leadEntityId)}
          />
        )}
        {canOpenClient && (
          <ActionButton
            icon={<Building2 className="w-3.5 h-3.5" />}
            label="Открыть клиента"
            onClick={handleOpenClient}
          />
        )}
      </div>

      {completion?.outcome === 'completed' ? (
        <div className="mb-6 rounded-md border border-blue-200 bg-blue-50/50 px-3 py-2">
          <div className="mb-1.5 flex items-center gap-1.5">
            <Copy className="h-3.5 w-3.5 text-blue-600" />
            <span className="text-[11px] text-blue-900">Повторный заказ</span>
          </div>
          <div className="mb-2 text-[10px] leading-snug text-blue-900/70">
            Заказ клиента закрыт — можно сразу создать новый лид по шаблону прошлого заказа.
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <Button
              size="sm"
              className="h-7 gap-1 bg-blue-600 text-[11px] text-white hover:bg-blue-700"
              onClick={repeatOrderSource ? handleOpenRepeatOrder : undefined}
              disabled={!repeatOrderSource || createLeadMutation.isPending}
            >
              <Copy className="h-3 w-3" />
              Создать повторный заказ
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 gap-1 text-[11px]"
              onClick={canOpenClient ? handleOpenClient : undefined}
              disabled={!canOpenClient}
            >
              <Building2 className="h-3 w-3" />
              Карточка клиента
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );

  const sidebar = (
    <>
      <SidebarSection title="Сводка">
        <SidebarField
          label="Статус"
          value={<span className={`${sidebarStatusBadgeClass} ${completionStatusTone}`}>{completionStatusLabel}</span>}
        />
        <SidebarField
          label="Дата"
          value={fmtIso(completion?.completedAt ?? departure?.completion?.completedAt ?? null)}
        />
        <SidebarField label="Менеджер" value={linkedManager} />
      </SidebarSection>

      <SidebarSection title="Связанные записи">
        <SidebarField
          label="Лид"
          value={
            <button
              type="button"
              className={`${sidebarTokens.link} disabled:text-gray-500 disabled:no-underline disabled:cursor-not-allowed`}
              disabled={!hasLeadLink}
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
              className={`${sidebarTokens.link} disabled:text-gray-500 disabled:no-underline disabled:cursor-not-allowed`}
              disabled={!hasApplicationLink}
              onClick={() =>
                openEntitySecondary('applications', 'application', applicationEntityId)
              }
            >
              {linkedApplicationNumber ?? (linkedApplicationId ? `APP-${linkedApplicationId.slice(0, 8).toUpperCase()}` : '—')}
            </button>
          }
        />
        <SidebarField
          label="Бронь"
          value={
            <button
              type="button"
              className={`${sidebarTokens.link} disabled:text-gray-500 disabled:no-underline disabled:cursor-not-allowed`}
              disabled={!hasReservationLink}
              onClick={() =>
                openEntitySecondary('reservations', 'reservation', reservationEntityId)
              }
            >
              {linkedReservationId ? `RSV-${linkedReservationId.slice(0, 8).toUpperCase()}` : '—'}
            </button>
          }
        />
        <SidebarField
          label="Выезд"
          value={
            <button
              type="button"
              className={`${sidebarTokens.link} disabled:text-gray-500 disabled:no-underline disabled:cursor-not-allowed`}
              disabled={!hasDepartureLink}
              onClick={() =>
                openEntitySecondary('departures', 'departure', departureEntityId)
              }
            >
              {linkedDepartureId ? `DEP-${linkedDepartureId.slice(0, 8).toUpperCase()}` : '—'}
            </button>
          }
        />
        <SidebarField
          label="Завершение"
          value={
            <button
              type="button"
              className={`${sidebarTokens.link} disabled:text-gray-500 disabled:no-underline disabled:cursor-not-allowed`}
              disabled={!hasCompletionLink}
              onClick={() => openEntitySecondary('completion', 'completion', completionEntityId)}
            >
              {completionEntityId ? `CMP-${completionEntityId.slice(0, 8).toUpperCase()}` : '—'}
            </button>
          }
        />
        <SidebarField
          label="Клиент"
          value={
            <button
              type="button"
              className={`${sidebarTokens.link} disabled:text-gray-500 disabled:no-underline disabled:cursor-not-allowed`}
              onClick={canOpenClient ? handleOpenClient : undefined}
              disabled={!canOpenClient}
            >
              {linkedClient}
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
            onClick={() => openEntitySecondary('departures', 'departure', departureEntityId)}
            disabled={!hasDepartureLink}
          >
            <ExternalLink className="w-3 h-3 mr-1" /> Открыть выезд
          </Button>
          {!completion ? (
            <Button
              size="sm"
              variant="outline"
              className="h-6 w-full justify-start text-[11px]"
              onClick={() => void handleCreate('completed')}
              disabled={!!createCompletedDisabledReason || busy}
            >
              <CheckCircle2 className="w-3 h-3 mr-1" /> Создать завершение
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              className="h-6 w-full justify-start text-[11px]"
              onClick={() => void handleSave()}
              disabled={busy}
            >
              <CheckCircle2 className="w-3 h-3 mr-1" /> Сохранить
            </Button>
          )}
          {completion?.outcome === 'completed' ? (
            <Button
              size="sm"
              variant="outline"
              className="h-6 w-full justify-start text-[11px]"
              onClick={repeatOrderSource ? handleOpenRepeatOrder : undefined}
              disabled={!repeatOrderSource || createLeadMutation.isPending}
            >
              <Copy className="w-3 h-3 mr-1" /> Создать повторный заказ
            </Button>
          ) : null}
        </div>
      </SidebarSection>
    </>
  );

  return (
    <>
      {renderShell(main, sidebar, shareUrl)}
      <RepeatOrderDialog
        open={repeatOpen}
        onOpenChange={setRepeatOpen}
        source={repeatSource}
        clientName={linkedClient}
        defaultManager={linkedManager}
        onConfirm={(payload) => {
          void handleConfirmRepeatOrder(payload);
        }}
      />
    </>
  );
}
