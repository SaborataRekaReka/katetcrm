import { useEffect, useMemo, useState, type ReactNode } from 'react';
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
  UserPlus,
  XCircle,
} from 'lucide-react';
import type { Lead } from '../../types/kanban';
import { useCompletionQuery } from '../../hooks/useCompletionsQuery';
import { useDepartureQuery } from '../../hooks/useDeparturesQuery';
import { useCreateCompletion, useUpdateCompletion } from '../../hooks/useCompletionMutations';
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

export function CompletionWorkspaceApi({
  lead,
  completionId,
  departureId,
  onClose,
  onOpenClient,
}: Props) {
  const { setActiveSecondaryNav } = useLayout();

  const [resolvedCompletionId, setResolvedCompletionId] = useState<string | undefined>(completionId);
  const [note, setNote] = useState('');
  const [unqualifiedReason, setUnqualifiedReason] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);

  const completionQuery = useCompletionQuery(resolvedCompletionId, !!resolvedCompletionId);
  const departureQuery = useDepartureQuery(departureId, !!departureId);

  const createMutation = useCreateCompletion();
  const updateMutation = useUpdateCompletion();

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

  const openSecondary = (secondaryId: string) => {
    setActiveSecondaryNav(secondaryId);
    onClose();
  };

  const completion = completionQuery.data;
  const departure = departureQuery.data;

  const createDisabledReason = useMemo(() => {
    if (completion) return 'Завершение уже создано';
    if (!departure) return 'Выезд не загружен';
    if (departure.status === 'cancelled') return 'Отмененный выезд нельзя завершить';
    if (departure.status !== 'arrived' && departure.status !== 'completed') {
      return 'Сначала зафиксируйте прибытие в выезде';
    }
    return null;
  }, [completion, departure]);

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
    if (outcome === 'completed' && createDisabledReason) return;
    if (outcome === 'unqualified' && departure.status === 'cancelled') return;

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

  const renderShell = (main: ReactNode, sidebar: ReactNode = <></>) => (
    <DetailShell
      breadcrumb={<Breadcrumb items={['CRM', 'Ops', 'Completion']} />}
      onClose={onClose}
      main={main}
      sidebar={sidebar}
    />
  );

  if ((completionQuery.isPending && !completion) || (!resolvedCompletionId && departureQuery.isPending && !departure)) {
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
  const linkedAddress = completion?.context.address ?? departure?.linked.address;
  const linkedPlannedDate = completion?.context.plannedDate ?? departure?.linked.plannedDate;
  const linkedPlannedStart = completion?.context.plannedStart ?? departure?.linked.plannedStart;
  const linkedPlannedTimeFrom = completion?.context.plannedTimeFrom ?? departure?.linked.plannedTimeFrom;
  const linkedPlannedTimeTo = completion?.context.plannedTimeTo ?? departure?.linked.plannedTimeTo;
  const hasLeadLink = !!linkedLeadId;
  const hasApplicationLink = !!linkedApplicationId;
  const hasReservationLink = !!linkedReservationId;
  const hasDepartureLink = !!linkedDepartureId;
  const canOpenClient = !!onOpenClient && !!linkedClientId;
  const entitySwitcherOptions = [
    ...(hasLeadLink ? [{ id: 'lead', label: 'Лид', onSelect: () => openSecondary('leads') }] : []),
    ...(hasApplicationLink
      ? [{ id: 'application', label: 'Заявка', onSelect: () => openSecondary('applications') }]
      : []),
    ...(hasReservationLink
      ? [{ id: 'reservation', label: 'Бронь', onSelect: () => openSecondary('reservations') }]
      : []),
    ...(hasDepartureLink
      ? [{ id: 'departure', label: 'Выезд', onSelect: () => openSecondary('departures') }]
      : []),
    {
      id: 'completed',
      label: 'Завершение',
      active: true,
      onSelect: () => openSecondary('completion'),
    },
  ];

  const main = (
    <div className="max-w-[820px] mx-auto px-8 pt-6 pb-10">
      <EntityModalHeader
        entityIcon={<CheckCircle2 className="w-3 h-3" />}
        entityLabel="Завершение"
        entitySwitcherOptions={entitySwitcherOptions}
        title={completion ? `CMP-${completion.id.slice(0, 8).toUpperCase()}` : 'Ожидает завершения'}
        subtitle={
          <>
            <button
              type="button"
              onClick={() => openSecondary('departures')}
              disabled={!hasDepartureLink}
              className="text-blue-600 hover:underline disabled:text-gray-500 disabled:no-underline disabled:cursor-not-allowed"
            >
              {linkedDepartureId ? `DEP-${linkedDepartureId.slice(0, 8).toUpperCase()}` : 'Выезд'}
            </button>{' '}
            ·{' '}
            <button
              type="button"
              onClick={() => openSecondary('applications')}
              disabled={!hasApplicationLink}
              className="text-blue-600 hover:underline disabled:text-gray-500 disabled:no-underline disabled:cursor-not-allowed"
            >
              {linkedApplicationNumber ?? (linkedApplicationId ? `APP-${linkedApplicationId.slice(0, 8).toUpperCase()}` : 'Заявка')}
            </button>{' '}
            ·{' '}
            <button
              type="button"
              className="text-blue-600 hover:underline disabled:text-gray-500 disabled:no-underline disabled:cursor-not-allowed"
              onClick={onOpenClient ? () => onOpenClient(lead) : undefined}
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
          onClick: () => openSecondary('departures'),
        }}
      />

      <NextStepLine
        className="mt-2 mb-4"
        label={completion ? 'Сохранить комментарий' : 'Создать завершение'}
        reason={completion ? null : createDisabledReason}
      />

      {actionError ? (
        <Alert variant="destructive" className="mb-5 py-2 px-3">
          <XCircle className="h-4 w-4" />
          <AlertTitle className="text-[12px]">Операция не выполнена</AlertTitle>
          <AlertDescription className="text-[11px] mt-0.5">{actionError}</AlertDescription>
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
          {createDisabledReason ? (
            <Alert className="mb-3">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle className="text-[12px]">Пока нельзя завершить</AlertTitle>
              <AlertDescription className="text-[11px] mt-0.5">{createDisabledReason}</AlertDescription>
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
              disabled={!!createDisabledReason || busy}
            >
              <CheckCircle2 className="h-3.5 w-3.5" /> Завершить
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => void handleCreate('unqualified')}
              disabled={departure?.status === 'cancelled' || busy}
            >
              Пометить некачественным
            </Button>
          </div>
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
                onClick={canOpenClient ? () => onOpenClient(lead) : undefined}
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
            onClick={() => openSecondary('departures')}
          />
        )}
        {hasReservationLink && (
          <ActionButton
            icon={<FileText className="w-3.5 h-3.5" />}
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
        <SidebarField
          label="Статус"
          value={completion ? (completion.outcome === 'completed' ? 'Завершен' : 'Некачественный') : 'Ожидает завершения'}
        />
        <SidebarField
          label="Дата"
          value={fmtIso(completion?.completedAt ?? departure?.completion?.completedAt ?? null)}
        />
        <SidebarField label="Менеджер" value={linkedManager} />
      </SidebarSection>

      <SidebarSection title="Связанные записи">
        {hasDepartureLink && (
          <SidebarField
            label="Выезд"
            value={
              <button
                type="button"
                className="text-blue-600 hover:underline text-left"
                onClick={() => openSecondary('departures')}
              >
                {linkedDepartureId ? `DEP-${linkedDepartureId.slice(0, 8).toUpperCase()}` : '—'}
              </button>
            }
          />
        )}
        {hasReservationLink && (
          <SidebarField
            label="Бронь"
            value={
              <button
                type="button"
                className="text-blue-600 hover:underline text-left"
                onClick={() => openSecondary('reservations')}
              >
                {linkedReservationId ? `RSV-${linkedReservationId.slice(0, 8).toUpperCase()}` : '—'}
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
                {linkedApplicationNumber ?? (linkedApplicationId ? `APP-${linkedApplicationId.slice(0, 8).toUpperCase()}` : '—')}
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
                {linkedClient}
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
            onClick={() => openSecondary('departures')}
          >
            <ExternalLink className="w-3 h-3 mr-1" /> Открыть выезд
          </Button>
          {!completion ? (
            <Button
              size="sm"
              variant="outline"
              className="h-6 w-full justify-start text-[11px]"
              onClick={() => void handleCreate('completed')}
              disabled={!!createDisabledReason || busy}
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
        </div>
      </SidebarSection>
    </>
  );

  return renderShell(main, sidebar);
}
