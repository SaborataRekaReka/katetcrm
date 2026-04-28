import { useMemo, useState } from 'react';
import {
  FileText,
  ChevronDown,
  Truck,
  Building2,
  HelpCircle,
  Wrench,
  UserPlus,
  Calendar,
  MapPin,
  AlertCircle,
  CheckCircle2,
  Circle,
  ArrowRight,
  Copy,
  Activity,
  ExternalLink,
  XCircle,
} from 'lucide-react';
import { Lead, Reservation, ReservationInternalStage } from '../../types/kanban';
import { buildMockReservation } from '../../data/mockReservation';
import { badgeBase, badgeTones } from '../kanban/badgeTokens';
import { deriveReservationState } from '../shell/reservationHelpers';
import { useReleaseReservation, useUpdateReservation } from '../../hooks/useReservationMutations';
import { useChangeLeadStage } from '../../hooks/useLeadMutations';
import { useReservationQuery } from '../../hooks/useReservationsQuery';
import {
  useEquipmentUnitsQuery,
  useSubcontractorsQuery,
} from '../../hooks/useDirectoriesQuery';
import { useEntityActivity } from '../../hooks/useActivityQuery';
import { mapActivityEntries } from '../../lib/activityMapper';
import { toReservationEntity } from '../../lib/reservationAdapter';
import { USE_API } from '../../lib/featureFlags';
import type { SubcontractorConfirmationStatus } from '../../lib/reservationsApi';
import { InlineText } from '../detail/InlineEdit/InlineText';
import { InlineDate } from '../detail/InlineEdit/InlineDate';
import { InlineSelect } from '../detail/InlineEdit/InlineSelect';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { ToggleGroup, ToggleGroupItem } from '../ui/toggle-group';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
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
  EmptyValue,
  SidebarSection,
  SidebarField,
  ActionButton,
  NextStepLine,
} from '../detail/DetailShell';
import { EntityModalHeader, EntitySection } from '../detail/EntityModalFramework';
import { useLayout } from '../shell/layoutStore';

interface Props {
  lead: Lead;
  onClose: () => void;
  onOpenClient?: (lead: Lead) => void;
  /** Реальный id брони на бэкенде. Если задан и USE_API — CTA «Снять» вызывает
   * POST /reservations/:id/release. Иначе остаётся no-op (fallback для mock). */
  apiReservationId?: string;
}

const stageLabel: Record<ReservationInternalStage, string> = {
  needs_source_selection: 'Нужен выбор источника',
  searching_own_equipment: 'Подбор своей техники',
  searching_subcontractor: 'Подбор подрядчика',
  subcontractor_selected: 'Подрядчик подтверждён',
  type_reserved: 'Тип забронирован',
  unit_defined: 'Unit уточнён',
  ready_for_departure: 'Готово к выезду',
  released: 'Снята',
};

const stageOrder: ReservationInternalStage[] = [
  'needs_source_selection',
  'searching_own_equipment',
  'searching_subcontractor',
  'subcontractor_selected',
  'type_reserved',
  'unit_defined',
  'ready_for_departure',
];

const sourceMeta = {
  own: { label: 'Своя техника', Icon: Truck, tone: badgeTones.progress },
  subcontractor: { label: 'Подрядчик', Icon: Building2, tone: badgeTones.caution },
  undecided: { label: 'Не определено', Icon: HelpCircle, tone: badgeTones.caution },
};

export function ReservationWorkspace({ lead, onClose, onOpenClient, apiReservationId }: Props) {
  const { setActiveSecondaryNav } = useLayout();
  const isApiDetail = USE_API && !!apiReservationId;
  const reservationQuery = useReservationQuery(apiReservationId, USE_API && !!apiReservationId);
  const mockReservation: Reservation = useMemo(() => buildMockReservation(lead), [lead]);

  // Живые справочники (unit'ы и подрядчики) из API. Фильтруем активные и
  // сужаем по equipmentTypeId + окну plannedStart/plannedEnd текущей брони.
  // API исключает занятые ресурсы в пересекающемся интервале.
  const resEquipmentTypeId = reservationQuery.data?.equipmentTypeId ?? undefined;
  const availabilityStart = reservationQuery.data?.plannedStart;
  const availabilityEnd = reservationQuery.data?.plannedEnd;
  const unitsQuery = useEquipmentUnitsQuery(
    {
      equipmentTypeId: resEquipmentTypeId,
      status: 'active',
      plannedStart: availabilityStart,
      plannedEnd: availabilityEnd,
      excludeReservationId: apiReservationId,
    },
    USE_API && !!apiReservationId,
  );
  const subsQuery = useSubcontractorsQuery(
    {
      status: 'active',
      plannedStart: availabilityStart,
      plannedEnd: availabilityEnd,
      excludeReservationId: apiReservationId,
    },
    USE_API && !!apiReservationId && reservationQuery.data?.source === 'subcontractor',
  );

  // Real data (когда есть) поверх структуры мока: candidateUnits/subcontractorOptions
  // приходят из /equipment-units и /subcontractors. Для API-режима не подставляем
  // mock-активность/конфликты: показываем только то, что пришло с бэка.
  const reservation: Reservation = useMemo(() => {
    if (reservationQuery.data) {
      const fresh = toReservationEntity(reservationQuery.data);
      const candidateUnits = unitsQuery.data
        ? unitsQuery.data.map((u) => ({
            id: u.id,
            name: u.name,
            plate: u.plateNumber ?? undefined,
            // API уже отфильтровал unit'ы по пересечению окна брони.
            status: (u.status === 'active' ? 'available' : 'maintenance') as
              | 'available'
              | 'busy'
              | 'maintenance',
            note: u.activeBookingsCount ? `Активных броней: ${u.activeBookingsCount}` : undefined,
          }))
        : [];
      const subcontractorOptions = subsQuery.data
        ? subsQuery.data.map((s) => ({
            id: s.id,
            name: s.name,
            category: s.specialization ?? undefined,
            priceNote: undefined,
            usage: s.activeBookingsCount ? `Активных броней: ${s.activeBookingsCount}` : undefined,
          }))
        : [];
      return {
        ...fresh,
        candidateUnits,
        subcontractorOptions,
        activity: [],
        conflict: undefined,
      };
    }
    return mockReservation;
  }, [reservationQuery.data, unitsQuery.data, subsQuery.data, mockReservation]);
  const [localSource, setLocalSource] = useState(reservation.source);
  const [unitSearch, setUnitSearch] = useState('');
  const [subSearch, setSubSearch] = useState('');
  const [releaseOpen, setReleaseOpen] = useState(false);
  const [releaseReason, setReleaseReason] = useState('');
  const [releaseError, setReleaseError] = useState<string | null>(null);
  const releaseMutation = useReleaseReservation();
  const updateResMutation = useUpdateReservation();
  const changeLeadStage = useChangeLeadStage();

  // Журнал изменений: подтягиваем реальные записи activity-лога по этой брони.
  const activityQuery = useEntityActivity(
    'reservation',
    apiReservationId,
    USE_API && !!apiReservationId,
  );
  const activityEntries = activityQuery.data
    ? mapActivityEntries(activityQuery.data)
    : isApiDetail
      ? []
      : reservation.activity.map((a) => ({
          id: a.id,
          actor: a.actor,
          text: a.message,
          time: a.at,
        }));

  const canRelease = USE_API && !!apiReservationId && reservation.status === 'active';
  const canInlineEditRes = USE_API && !!apiReservationId && reservation.status === 'active';

  const filteredUnits = useMemo(() => {
    const q = unitSearch.trim().toLowerCase();
    if (!q) return reservation.candidateUnits;
    return reservation.candidateUnits.filter((u) =>
      `${u.name} ${u.plate ?? ''} ${u.note ?? ''}`.toLowerCase().includes(q),
    );
  }, [reservation.candidateUnits, unitSearch]);

  const filteredSubcontractors = useMemo(() => {
    const q = subSearch.trim().toLowerCase();
    if (!q) return reservation.subcontractorOptions;
    return reservation.subcontractorOptions.filter((s) =>
      `${s.name} ${s.category ?? ''} ${s.priceNote ?? ''} ${s.usage ?? ''}`
        .toLowerCase()
        .includes(q),
    );
  }, [reservation.subcontractorOptions, subSearch]);

  // Источник: если можно сохранять — берём актуальный с API (через reservation.source),
  // иначе управляем локально (для mock / kanban-контекста без apiReservationId).
  const source = canInlineEditRes ? reservation.source : localSource;

  const handleSourceChange = (next: 'own' | 'subcontractor' | 'undecided') => {
    if (canInlineEditRes && apiReservationId) {
      const sourcingType = next === 'own' ? 'own' : next === 'subcontractor' ? 'subcontractor' : 'undecided';
      updateResMutation.mutate({ id: apiReservationId, patch: { sourcingType } });
    } else {
      setLocalSource(next);
    }
  };

  /** Фабрика save-обработчиков для инлайн-полей брони. */
  const makeResFieldSaver = (
    apply: (next: string) => Parameters<typeof updateResMutation.mutateAsync>[0]['patch'],
  ) => {
    return async (next: string) => {
      if (!apiReservationId) return;
      await updateResMutation.mutateAsync({ id: apiReservationId, patch: apply(next) });
    };
  };

  const handleRelease = async () => {
    if (!canRelease || !apiReservationId) return;
    setReleaseError(null);
    try {
      await releaseMutation.mutateAsync({
        id: apiReservationId,
        reason: releaseReason.trim() || undefined,
      });
      setReleaseOpen(false);
      setReleaseReason('');
      onClose();
    } catch (err) {
      setReleaseError(err instanceof Error ? err.message : 'Не удалось снять бронь');
    }
  };

  const openSecondary = (secondaryId: string) => {
    setActiveSecondaryNav(secondaryId);
    onClose();
  };

  const handleOpenApplication = () => openSecondary('applications');
  const handleOpenLead = () => openSecondary('leads');
  const handleOpenConflict = () => openSecondary('view-conflict');
  const handleOpenDeparture = () => openSecondary('departures');
  const handleDuplicateReservation = () => openSecondary('applications');

  const selectFirstAvailableUnit = async () => {
    if (canInlineEditRes && apiReservationId) {
      const unit = reservation.candidateUnits.find((u) => u.status === 'available');
      await updateResMutation.mutateAsync({
        id: apiReservationId,
        patch: {
          sourcingType: 'own',
          equipmentUnitId: unit?.id ?? null,
        } as any,
      });
      return;
    }
    setLocalSource('own');
  };

  const selectFirstSubcontractor = async () => {
    if (canInlineEditRes && apiReservationId) {
      const subcontractor = reservation.subcontractorOptions[0];
      await updateResMutation.mutateAsync({
        id: apiReservationId,
        patch: {
          sourcingType: 'subcontractor',
          subcontractorId: subcontractor?.id ?? null,
        } as any,
      });
      return;
    }
    setLocalSource('subcontractor');
  };

  const handlePickAlternative = async () => {
    if (source === 'own') {
      await selectFirstSubcontractor();
      return;
    }
    await selectFirstAvailableUnit();
  };

  const handlePrimaryAction = async () => {
    if (derived.ctaDisabled) return;
    if (conflict) {
      handleOpenConflict();
      return;
    }

    switch (derived.stage) {
      case 'needs_source_selection':
      case 'searching_own_equipment':
        await selectFirstAvailableUnit();
        return;
      case 'searching_subcontractor':
        await selectFirstSubcontractor();
        return;
      case 'type_reserved':
      case 'unit_defined':
        if (canInlineEditRes && apiReservationId) {
          await updateResMutation.mutateAsync({
            id: apiReservationId,
            patch: { internalStage: 'ready_for_departure' } as any,
          });
        }
        return;
      case 'ready_for_departure':
        if (USE_API && lead.id) {
          await changeLeadStage.mutateAsync({ id: lead.id, stage: 'departure' });
        }
        handleOpenDeparture();
        return;
      default:
        return;
    }
  };

  const src = sourceMeta[source];
  const SrcIcon = src.Icon;

  const unitSelected = !!reservation.equipmentUnit;
  const subSelected = !!reservation.subcontractor;
  const conflict = !!reservation.hasConflict;
  const readyFlag = !!reservation.readyForDeparture;

  const clientLeadContext: Lead = useMemo(
    () => ({
      ...lead,
      id: reservation.linked.clientId,
      client: reservation.linked.clientName,
      equipmentType: reservation.linked.equipmentType,
      address: reservation.linked.address ?? lead.address,
    }),
    [lead, reservation.linked],
  );

  // Единый источник правды: stage / nextStep / CTA выводятся из одного места.
  const derived = deriveReservationState({
    status: reservation.status,
    source,
    equipmentUnit: reservation.equipmentUnit,
    subcontractor: reservation.subcontractor,
    hasConflict: conflict,
    readyForDeparture: readyFlag,
  });
  const computedStage: ReservationInternalStage = derived.stage;

  // Conditional checklist
  const checks: { label: string; ok: boolean }[] = [];
  if (source === 'undecided') {
    checks.push({ label: 'Источник не выбран', ok: false });
  } else {
    checks.push({ label: 'Источник выбран', ok: true });
    if (source === 'own') {
      checks.push({ label: 'Unit выбран', ok: unitSelected });
    } else if (source === 'subcontractor') {
      checks.push({ label: 'Подрядчик выбран', ok: subSelected });
    }
    checks.push({ label: 'Нет конфликтов', ok: !conflict });
    checks.push({ label: 'Готов к выезду', ok: readyFlag });
  }
  const ready = checks.every((c) => c.ok);

  // Primary CTA driven by computedStage — single source of truth (deriveReservationState).
  const primary = {
    label: derived.ctaLabel,
    disabled: derived.ctaDisabled,
    reason: derived.reason,
  };

  if (isApiDetail && reservationQuery.isPending && !reservationQuery.data) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Загрузка брони...
      </div>
    );
  }

  if (isApiDetail && reservationQuery.isError && !reservationQuery.data) {
    const message = reservationQuery.error instanceof Error
      ? reservationQuery.error.message
      : 'Не удалось загрузить бронь';
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center text-sm text-muted-foreground">
        <span>{message}</span>
        <Button size="sm" variant="outline" onClick={onClose}>
          Закрыть
        </Button>
      </div>
    );
  }

  const main = (
    <div className="max-w-[820px] mx-auto px-8 pt-6 pb-10">
      <EntityModalHeader
        entityIcon={<FileText className="w-3 h-3" />}
        entityLabel="Бронь"
        title={reservation.id}
        subtitle={
          <>
            {reservation.linked.applicationTitle} ·{' '}
            <button
              type="button"
              onClick={onOpenClient ? () => onOpenClient(lead) : undefined}
              disabled={!onOpenClient}
              className="text-blue-600 hover:underline disabled:text-gray-500 disabled:no-underline disabled:cursor-not-allowed"
            >
              {reservation.linked.clientName}
            </button>{' '}
            · {reservation.equipmentType}
          </>
        }
        primaryAction={{
          label: primary.label,
          icon: !primary.disabled ? <ArrowRight className="w-3 h-3" /> : undefined,
          // Используем render, чтобы сохранить disabled (EntityModalAction его не прокидывает).
          render: (
            <Button
              size="sm"
              className="h-7 gap-1 bg-blue-600 hover:bg-blue-700 text-white text-[11px]"
              disabled={primary.disabled}
              onClick={() => void handlePrimaryAction()}
            >
              {primary.label}
              {!primary.disabled && <ArrowRight className="w-3 h-3" />}
            </Button>
          ),
        }}
        secondaryAction={{
          label: 'Снять бронь',
          render: (
            <AlertDialog open={releaseOpen} onOpenChange={setReleaseOpen}>
              <AlertDialogTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-[11px]"
                  disabled={!canRelease || releaseMutation.isPending}
                  title={!canRelease ? 'Доступно только для активной брони из API' : undefined}
                >
                  Снять бронь
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Снять бронь {reservation.id}?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Действие будет зафиксировано в журнале. Укажите причину (необязательно).
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <Textarea
                  value={releaseReason}
                  onChange={(e) => setReleaseReason(e.target.value)}
                  placeholder="Причина снятия…"
                  className="text-[12px]"
                />
                {releaseError ? (
                  <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-700">
                    {releaseError}
                  </div>
                ) : null}
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={releaseMutation.isPending}>Отмена</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={(e) => {
                      e.preventDefault();
                      handleRelease();
                    }}
                    disabled={!canRelease || releaseMutation.isPending}
                  >
                    {releaseMutation.isPending ? 'Снимаем…' : 'Снять'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ),
        }}
        chips={[
          <span
            key="stage"
            className="inline-flex items-center gap-1 h-6 px-2 rounded bg-blue-500 text-white text-[11px]"
          >
            <span>{stageLabel[computedStage]}</span>
            <ChevronDown className="w-3 h-3 opacity-80" />
          </span>,
          <ToolbarPill key="by" icon={<UserPlus className="w-3 h-3" />} label={reservation.reservedBy} />,
          <ToolbarPill
            key="date"
            icon={<Calendar className="w-3 h-3" />}
            label={reservation.linked.plannedDate ?? 'Dates'}
          />,
          <ToolbarPill key="src" icon={<SrcIcon className="w-3 h-3" />} label={src.label} />,
          ...(unitSelected
            ? [
                <ToolbarPill
                  key="unit"
                  icon={<Wrench className="w-3 h-3" />}
                  label={`Unit: ${reservation.equipmentUnit}`}
                />,
              ]
            : []),
          ...(subSelected
            ? [
                <ToolbarPill
                  key="sub"
                  icon={<Building2 className="w-3 h-3" />}
                  label={`Подрядчик: ${reservation.subcontractor}`}
                />,
              ]
            : []),
          ...(conflict
            ? [
                <span key="conflict" className={`${badgeBase} ${badgeTones.warning}`}>
                  <AlertCircle className="w-3 h-3" />
                  Конфликт
                </span>,
              ]
            : []),
        ]}
        className="mb-5"
      />

      {reservation.hasConflict && (
        <Alert variant="destructive" className="mb-5 py-2 px-3">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle className="text-[12px]">Обнаружен конфликт</AlertTitle>
          <AlertDescription className="text-[11px] mt-0.5">
            {reservation.conflict
              ? `${reservation.conflict.summary} — ${reservation.conflict.conflictingReservationId} (${reservation.conflict.conflictingAt})`
              : 'Обнаружено пересечение по интервалу брони. Подробные данные конфликта будут доступны после расширения backend-проекции.'}
            <div className="mt-1.5 flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="h-6 px-2 text-[11px]"
                onClick={handleOpenConflict}
              >
                Открыть конфликт
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-6 px-2 text-[11px]"
                onClick={() => void handlePickAlternative()}
              >
                Выбрать альтернативу
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      <EntitySection title="Основные данные" className="mb-5">
        <div className="grid grid-cols-2 gap-x-8 gap-y-0">
          <PropertyRow icon={<FileText className="w-3 h-3" />} label="ID" value={<InlineValue>{reservation.id}</InlineValue>} />
          <PropertyRow
            icon={<Activity className="w-3 h-3" />}
            label="Статус"
            value={<span className={`${badgeBase} ${reservation.status === 'active' ? badgeTones.success : badgeTones.muted}`}>{reservation.status === 'active' ? 'Активна' : 'Снята'}</span>}
          />
          <PropertyRow
            icon={<Building2 className="w-3 h-3" />}
            label="Клиент"
            value={<button type="button" onClick={onOpenClient ? () => onOpenClient(lead) : undefined} disabled={!onOpenClient} className="text-[11px] text-blue-600 hover:underline text-left truncate disabled:text-gray-500 disabled:no-underline disabled:cursor-not-allowed">{reservation.linked.clientName}</button>}
          />
          <PropertyRow icon={<Truck className="w-3 h-3" />} label="Тип техники" value={<InlineValue>{reservation.equipmentType}</InlineValue>} />
          {(source === 'own' || unitSelected) && (
            <PropertyRow icon={<Wrench className="w-3 h-3" />} label="Unit" value={unitSelected ? <InlineValue>{reservation.equipmentUnit}</InlineValue> : <EmptyValue text="не выбран" />} />
          )}
          {(source === 'subcontractor' || subSelected) && (
            <PropertyRow icon={<Building2 className="w-3 h-3" />} label="Подрядчик" value={subSelected ? <InlineValue>{reservation.subcontractor}</InlineValue> : <EmptyValue text="не выбран" />} />
          )}
          {source === 'subcontractor' && canInlineEditRes && reservationQuery.data && (
            <PropertyRow
              icon={<CheckCircle2 className="w-3 h-3" />}
              label="Подтверждение"
              value={
                <InlineSelect<SubcontractorConfirmationStatus>
                  value={reservationQuery.data.subcontractorConfirmation}
                  options={[
                    { value: 'not_requested', label: 'Не запрошено' },
                    { value: 'requested', label: 'Запрошено' },
                    { value: 'confirmed', label: 'Подтверждено' },
                    { value: 'declined', label: 'Отклонено' },
                    { value: 'no_response', label: 'Нет ответа' },
                  ]}
                  onSave={async (next) => {
                    if (!apiReservationId) return;
                    await updateResMutation.mutateAsync({
                      id: apiReservationId,
                      patch: { subcontractorConfirmation: next },
                    });
                  }}
                  ariaLabel="Статус подтверждения подрядчика"
                />
              }
            />
          )}
          {source === 'subcontractor' && canInlineEditRes && (
            <PropertyRow
              icon={<Wrench className="w-3 h-3" />}
              label="Обещанный unit"
              value={
                <InlineText
                  value={reservationQuery.data?.promisedModelOrUnit ?? ''}
                  onSave={makeResFieldSaver((v) => ({ promisedModelOrUnit: v.trim() || undefined } as any))}
                  ariaLabel="Модель или unit, обещанный подрядчиком"
                  placeholder="например: CAT 320D"
                  emptyDisplay={<EmptyValue />}
                />
              }
            />
          )}
          <PropertyRow icon={<UserPlus className="w-3 h-3" />} label="Создал" value={<InlineValue>{reservation.reservedBy}</InlineValue>} />
          <PropertyRow icon={<Calendar className="w-3 h-3" />} label="Создано" value={<InlineValue>{reservation.reservedAt}</InlineValue>} />
          {reservation.releasedAt && (
            <PropertyRow icon={<XCircle className="w-3 h-3" />} label="Снята" value={<InlineValue>{reservation.releasedAt}</InlineValue>} />
          )}
          {reservation.releaseReason && (
            <PropertyRow icon={<FileText className="w-3 h-3" />} label="Причина" value={<InlineValue>{reservation.releaseReason}</InlineValue>} />
          )}
        </div>
      </EntitySection>

      <div className="mb-5">
        <div className="flex items-center justify-between mb-1.5">
          <div className="text-[11px] text-gray-500 uppercase tracking-wide">Позиция заявки · {reservation.linked.positionTitle}</div>
          <button
            type="button"
            onClick={handleOpenApplication}
            className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:underline">
            <ExternalLink className="w-3 h-3" /> Открыть заявку
          </button>
        </div>
        <div className="grid grid-cols-2 gap-x-8 gap-y-0">
          <PropertyRow icon={<Truck className="w-3 h-3" />} label="Техника" value={<InlineValue>{reservation.linked.equipmentType} × {reservation.linked.quantity}</InlineValue>} />
          <PropertyRow
            icon={<Calendar className="w-3 h-3" />}
            label="Дата"
            value={
              canInlineEditRes && reservationQuery.data ? (
                <InlineDate
                  value={reservationQuery.data.plannedStart.slice(0, 10)}
                  ariaLabel="Плановая дата"
                  onSave={async (next) => {
                    if (!apiReservationId || !reservationQuery.data) return;
                    if (!next) return;
                    const startTime = reservationQuery.data.plannedStart.slice(11);
                    const endTime = reservationQuery.data.plannedEnd.slice(11);
                    await updateResMutation.mutateAsync({
                      id: apiReservationId,
                      patch: {
                        plannedStart: `${next}T${startTime}`,
                        plannedEnd: `${next}T${endTime}`,
                      },
                    });
                  }}
                />
              ) : reservation.linked.plannedDate ? (
                <InlineValue>{reservation.linked.plannedDate}</InlineValue>
              ) : (
                <EmptyValue />
              )
            }
          />
          <PropertyRow
            icon={<Calendar className="w-3 h-3" />}
            label="Время"
            value={
              canInlineEditRes && reservationQuery.data ? (
                <InlineText
                  value={`${reservationQuery.data.plannedStart.slice(11, 16)}–${reservationQuery.data.plannedEnd.slice(11, 16)}`}
                  ariaLabel="Время (HH:MM–HH:MM)"
                  placeholder="09:00–18:00"
                  onSave={async (next) => {
                    if (!apiReservationId || !reservationQuery.data) return;
                    // Принимаем "HH:MM-HH:MM" или "HH:MM–HH:MM" (en-dash или em-dash).
                    const match = next.trim().match(/^(\d{2}:\d{2})\s*[-–—]\s*(\d{2}:\d{2})$/);
                    if (!match) throw new Error('Формат: HH:MM–HH:MM');
                    const [, startT, endT] = match;
                    const date = reservationQuery.data.plannedStart.slice(0, 10);
                    await updateResMutation.mutateAsync({
                      id: apiReservationId,
                      patch: {
                        plannedStart: `${date}T${startT}:00`,
                        plannedEnd: `${date}T${endT}:00`,
                      },
                    });
                  }}
                />
              ) : reservation.linked.plannedTime ? (
                <InlineValue>{reservation.linked.plannedTime}</InlineValue>
              ) : (
                <EmptyValue />
              )
            }
          />
          <PropertyRow icon={<MapPin className="w-3 h-3" />} label="Адрес" value={reservation.linked.address ? <InlineValue>{reservation.linked.address}</InlineValue> : <EmptyValue />} />
        </div>
        {reservation.linked.comment && (
          <div className="mt-1.5 text-[10px] text-gray-500 italic">{reservation.linked.comment}</div>
        )}
      </div>

      {/* Sourcing — один active state + симметричный secondary switch */}
      <div className="mb-3">
        <div className="flex items-center min-h-7">
          <div className="flex items-center gap-1.5 w-[140px] flex-shrink-0 text-gray-500 text-[11px]">
            <Truck className="w-3 h-3 text-gray-400" />
            <span>Источник</span>
          </div>
          <div className="flex-1 min-w-0 flex items-center gap-1.5">
            <span className={`${badgeBase} ${src.tone}`}>
              <SrcIcon className="w-3 h-3" />
              {src.label}
            </span>
            {source !== 'undecided' && (
              <button
                onClick={() => handleSourceChange(source === 'own' ? 'subcontractor' : 'own')}
                className="inline-flex items-center gap-1 h-5 px-1.5 rounded border border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-colors text-[10px] text-gray-500 hover:text-gray-700"
              >
                {source === 'own' ? <Building2 className="w-3 h-3" /> : <Truck className="w-3 h-3" />}
                <span>Сменить на {source === 'own' ? 'подрядчика' : 'свою технику'}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="mt-1 mb-5 pl-[140px]">
        <NextStepLine label={primary.label} reason={primary.reason} />
      </div>

      {source === 'undecided' && (
        <div className="mb-5 border border-dashed border-gray-200 rounded-md px-3 py-3 bg-gray-50/50">
          <div className="text-[11px] text-gray-700 mb-2">Выберите источник техники, чтобы продолжить бронь</div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="h-7 px-2 text-[11px]" onClick={() => handleSourceChange('own')}>
              <Truck className="w-3 h-3 mr-1" /> Своя техника
            </Button>
            <Button size="sm" variant="outline" className="h-7 px-2 text-[11px]" onClick={() => handleSourceChange('subcontractor')}>
              <Building2 className="w-3 h-3 mr-1" /> Подрядчик
            </Button>
          </div>
        </div>
      )}

      {source === 'own' && (
        <div className="mb-5">
          {/* When a unit is already selected — collapse the candidate table into a summary.
              Conflict is surfaced inline in the summary card (same visual contract as in the
              expanded table below). */}
          {unitSelected ? (
            <div
              className={`flex items-center gap-2 border rounded-md px-3 py-2 ${
                conflict ? 'border-red-200 bg-red-50/40' : 'border-gray-200 bg-white'
              }`}
            >
              {conflict ? (
                <AlertCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0 text-[11px] text-gray-800">
                <span className="text-gray-500">Выбран unit:</span> {reservation.equipmentUnit}
                {conflict && (
                  <span className={`${badgeBase} ${badgeTones.warning} ml-2`}>
                    <AlertCircle className="w-3 h-3" />
                    Конфликт
                  </span>
                )}
              </div>
              <details className="text-[11px]">
                <summary className="cursor-pointer inline-flex items-center gap-1 h-6 px-2 rounded border border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-colors text-gray-600 list-none">
                  <Wrench className="w-3 h-3" /> Сменить unit
                </summary>
                <div className="mt-2">
                  <div className="mb-2">
                    <Input
                      value={unitSearch}
                      onChange={(e) => setUnitSearch(e.target.value)}
                      placeholder="Поиск unit по названию/номеру"
                      className="h-7 text-[11px]"
                    />
                  </div>
                  {filteredUnits.length > 0 ? (
                    <div className="border border-gray-200 rounded-md overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="hover:bg-transparent">
                            <TableHead className="h-7 text-[11px]">Юнит</TableHead>
                            <TableHead className="h-7 text-[11px]">Номер</TableHead>
                            <TableHead className="h-7 text-[11px]">Статус</TableHead>
                            <TableHead className="h-7 text-[11px]">Примечание</TableHead>
                            <TableHead className="h-7 text-[11px] text-right">Действие</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredUnits.map((u) => {
                            const isSelected = u.name === reservation.equipmentUnit;
                            const inConflict = isSelected && conflict;
                            return (
                              <TableRow
                                key={u.id}
                                className={`text-[11px] ${inConflict ? 'bg-red-50/40' : ''}`}
                              >
                                <TableCell className="py-1.5">
                                  <span className="inline-flex items-center gap-1">
                                    {inConflict && <AlertCircle className="w-3 h-3 text-red-500" />}
                                    {u.name}
                                  </span>
                                </TableCell>
                                <TableCell className="py-1.5 text-gray-500">{u.plate ?? '—'}</TableCell>
                                <TableCell className="py-1.5">
                                  <span
                                    className={`${badgeBase} ${
                                      inConflict
                                        ? badgeTones.warning
                                        : u.status === 'available'
                                        ? badgeTones.success
                                        : u.status === 'busy'
                                        ? badgeTones.warning
                                        : badgeTones.muted
                                    }`}
                                  >
                                    {inConflict
                                      ? 'Конфликт'
                                      : u.status === 'available'
                                      ? 'Свободен'
                                      : u.status === 'busy'
                                      ? 'Занят'
                                      : 'ТО'}
                                  </span>
                                </TableCell>
                                <TableCell className="py-1.5 text-gray-500">
                                  {inConflict && reservation.conflict
                                    ? reservation.conflict.summary
                                    : u.note ?? '—'}
                                </TableCell>
                                <TableCell className="py-1.5 text-right">
                                  {isSelected ? (
                                    <span className="text-[11px] text-gray-500">Выбран</span>
                                  ) : (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-6 px-2 text-[11px]"
                                      disabled={u.status !== 'available' || !apiReservationId || updateResMutation.isPending}
                                      onClick={() => {
                                        if (!apiReservationId) return;
                                        updateResMutation.mutate({
                                          id: apiReservationId,
                                          patch: { equipmentUnitId: u.id },
                                        });
                                      }}
                                    >
                                      Назначить
                                    </Button>
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-[11px] text-gray-400 border border-dashed border-gray-200 rounded px-3 py-4 text-center">Кандидаты не найдены</div>
                  )}
                </div>
              </details>
            </div>
          ) : (
            <>
              <div className="text-[11px] text-gray-500 uppercase tracking-wide mb-1.5">Кандидатные юниты</div>
              <div className="mb-2">
                <Input
                  value={unitSearch}
                  onChange={(e) => setUnitSearch(e.target.value)}
                  placeholder="Поиск unit по названию/номеру"
                  className="h-7 text-[11px]"
                />
              </div>
              {filteredUnits.length > 0 ? (
                <div className="border border-gray-200 rounded-md overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="h-7 text-[11px]">Юнит</TableHead>
                        <TableHead className="h-7 text-[11px]">Номер</TableHead>
                        <TableHead className="h-7 text-[11px]">Статус</TableHead>
                        <TableHead className="h-7 text-[11px]">Примечание</TableHead>
                        <TableHead className="h-7 text-[11px] text-right">Действие</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUnits.map((u) => (
                        <TableRow key={u.id} className="text-[11px]">
                          <TableCell className="py-1.5">{u.name}</TableCell>
                          <TableCell className="py-1.5 text-gray-500">{u.plate ?? '—'}</TableCell>
                          <TableCell className="py-1.5">
                            <span className={`${badgeBase} ${u.status === 'available' ? badgeTones.success : u.status === 'busy' ? badgeTones.warning : badgeTones.muted}`}>
                              {u.status === 'available' ? 'Свободен' : u.status === 'busy' ? 'Занят' : 'ТО'}
                            </span>
                          </TableCell>
                          <TableCell className="py-1.5 text-gray-500">{u.note ?? '—'}</TableCell>
                          <TableCell className="py-1.5 text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-6 px-2 text-[11px]"
                              disabled={u.status !== 'available' || !apiReservationId || updateResMutation.isPending}
                              onClick={() => {
                                if (!apiReservationId) return;
                                updateResMutation.mutate({
                                  id: apiReservationId,
                                  patch: { equipmentUnitId: u.id },
                                });
                              }}
                            >
                              Назначить
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-[11px] text-gray-400 border border-dashed border-gray-200 rounded px-3 py-4 text-center">Кандидаты не найдены</div>
              )}
            </>
          )}
        </div>
      )}

      {source === 'subcontractor' && (
        <div className="mb-5">
          {subSelected ? (
            <div className="flex items-center gap-2 border border-gray-200 rounded-md bg-white px-3 py-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
              <div className="flex-1 min-w-0 text-[11px] text-gray-800">
                <span className="text-gray-500">Выбран подрядчик:</span> {reservation.subcontractor}
              </div>
              <details className="text-[11px]">
                <summary className="cursor-pointer inline-flex items-center gap-1 h-6 px-2 rounded border border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-colors text-gray-600 list-none">
                  <Building2 className="w-3 h-3" /> Сменить подрядчика
                </summary>
                <div className="mt-2">
                  <div className="mb-2">
                    <Input
                      value={subSearch}
                      onChange={(e) => setSubSearch(e.target.value)}
                      placeholder="Поиск подрядчика"
                      className="h-7 text-[11px]"
                    />
                  </div>
                  {filteredSubcontractors.length > 0 ? (
                    <div className="border border-gray-200 rounded-md overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="hover:bg-transparent">
                            <TableHead className="h-7 text-[11px]">Подрядчик</TableHead>
                            <TableHead className="h-7 text-[11px]">Категория</TableHead>
                            <TableHead className="h-7 text-[11px]">Цена</TableHead>
                            <TableHead className="h-7 text-[11px]">История</TableHead>
                            <TableHead className="h-7 text-[11px] text-right">Действие</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredSubcontractors.map((s) => {
                            const isSelected = s.name === reservation.subcontractor;
                            return (
                              <TableRow key={s.id} className="text-[11px]">
                                <TableCell className="py-1.5">{s.name}</TableCell>
                                <TableCell className="py-1.5 text-gray-500">{s.category ?? '—'}</TableCell>
                                <TableCell className="py-1.5 text-gray-500">{s.priceNote ?? '—'}</TableCell>
                                <TableCell className="py-1.5 text-gray-500">{s.usage ?? '—'}</TableCell>
                                <TableCell className="py-1.5 text-right">
                                  {isSelected ? (
                                    <span className="text-[11px] text-gray-500">Выбран</span>
                                  ) : (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-6 px-2 text-[11px]"
                                      disabled={!apiReservationId || updateResMutation.isPending}
                                      onClick={() => {
                                        if (!apiReservationId) return;
                                        updateResMutation.mutate({
                                          id: apiReservationId,
                                          patch: { subcontractorId: s.id },
                                        });
                                      }}
                                    >
                                      Выбрать
                                    </Button>
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-[11px] text-gray-400 border border-dashed border-gray-200 rounded px-3 py-4 text-center">Подрядчики не найдены</div>
                  )}
                </div>
              </details>
            </div>
          ) : (
            <>
              <div className="text-[11px] text-gray-500 uppercase tracking-wide mb-1.5">Подрядчики</div>
              <div className="mb-2">
                <Input
                  value={subSearch}
                  onChange={(e) => setSubSearch(e.target.value)}
                  placeholder="Поиск подрядчика"
                  className="h-7 text-[11px]"
                />
              </div>
              {filteredSubcontractors.length > 0 ? (
                <div className="border border-gray-200 rounded-md overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="h-7 text-[11px]">Подрядчик</TableHead>
                        <TableHead className="h-7 text-[11px]">Категория</TableHead>
                        <TableHead className="h-7 text-[11px]">Цена</TableHead>
                        <TableHead className="h-7 text-[11px]">История</TableHead>
                        <TableHead className="h-7 text-[11px] text-right">Действие</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredSubcontractors.map((s) => (
                        <TableRow key={s.id} className="text-[11px]">
                          <TableCell className="py-1.5">{s.name}</TableCell>
                          <TableCell className="py-1.5 text-gray-500">{s.category ?? '—'}</TableCell>
                          <TableCell className="py-1.5 text-gray-500">{s.priceNote ?? '—'}</TableCell>
                          <TableCell className="py-1.5 text-gray-500">{s.usage ?? '—'}</TableCell>
                          <TableCell className="py-1.5 text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-6 px-2 text-[11px]"
                              disabled={!apiReservationId || updateResMutation.isPending}
                              onClick={() => {
                                if (!apiReservationId) return;
                                updateResMutation.mutate({
                                  id: apiReservationId,
                                  patch: { subcontractorId: s.id },
                                });
                              }}
                            >
                              Выбрать
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-[11px] text-gray-400 border border-dashed border-gray-200 rounded px-3 py-4 text-center">Подрядчики не найдены</div>
              )}
            </>
          )}
        </div>
      )}

      {reservation.comment && (
        <div className="mb-5">
          <div className="text-[11px] text-gray-500 uppercase tracking-wide mb-1">Комментарий</div>
          <div className="text-[11px] text-gray-700 leading-relaxed">
            {canInlineEditRes ? (
              <InlineText
                value={reservation.comment}
                ariaLabel="Комментарий к брони"
                placeholder="Добавьте комментарий"
                multiline
                onSave={makeResFieldSaver((v) => ({ comment: v.trim() || null } as any))}
              />
            ) : (
              reservation.comment
            )}
          </div>
        </div>
      )}
      {!reservation.comment && canInlineEditRes && (
        <div className="mb-5">
          <div className="text-[11px] text-gray-500 uppercase tracking-wide mb-1">Комментарий</div>
          <div className="text-[11px] text-gray-700 leading-relaxed">
            <InlineText
              value=""
              ariaLabel="Комментарий к брони"
              placeholder="Добавьте комментарий"
              multiline
              emptyDisplay={<span className="text-gray-400 italic">Добавить комментарий…</span>}
              onSave={makeResFieldSaver((v) => ({ comment: v.trim() || null } as any))}
            />
          </div>
        </div>
      )}

      <div className="space-y-0.5 mb-6">
        <ActionButton
          icon={<ExternalLink className="w-3.5 h-3.5" />}
          label="Открыть заявку"
          onClick={handleOpenApplication}
        />
        <ActionButton icon={<Building2 className="w-3.5 h-3.5" />} label="Открыть клиента" onClick={onOpenClient ? () => onOpenClient(clientLeadContext) : undefined} />
        {reservation.linked.leadTitle && (
          <ActionButton
            icon={<UserPlus className="w-3.5 h-3.5" />}
            label="Открыть лид"
            onClick={handleOpenLead}
          />
        )}
      </div>

      <div className="border-t border-gray-200 pt-4">
        <div className="text-[11px] text-gray-500 uppercase tracking-wide mb-2">Журнал изменений</div>
        <div className="space-y-2">
          {activityEntries.length === 0 ? (
            <div className="text-[11px] text-gray-400">Событий пока нет</div>
          ) : (
            activityEntries.map((a) => (
              <div key={a.id} className="flex items-center gap-2 text-[11px] text-gray-600">
                <Circle className="w-2 h-2 text-gray-300 fill-gray-300 flex-shrink-0" />
                <span className="text-gray-900">{a.actor}</span>
                <span className="text-gray-500 truncate">{a.text}</span>
                <span className="text-gray-400 ml-auto flex-shrink-0">{a.time}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );

  const sidebar = (
    <>
      <SidebarSection title="Статус">
        <SidebarField
          label="Статус"
          value={<span className={`${badgeBase} ${reservation.status === 'active' ? badgeTones.success : badgeTones.muted}`}>{reservation.status === 'active' ? 'Активна' : 'Снята'}</span>}
        />
        <SidebarField label="Внутренняя стадия" value={stageLabel[computedStage]} />
        <SidebarField label="Источник" value={src.label} />
        <SidebarField label="Создано" value={reservation.reservedAt} />
        <SidebarField label="Создал" value={reservation.reservedBy} />
      </SidebarSection>

      <SidebarSection title="Готовность к выезду">
        <div className="space-y-1">
          {checks.map((c) => (
            <div key={c.label} className="flex items-center gap-1.5 text-[11px]">
              {c.ok ? <CheckCircle2 className="w-3 h-3 text-emerald-500 flex-shrink-0" /> : <Circle className="w-3 h-3 text-gray-300 flex-shrink-0" />}
              <span className={c.ok ? 'text-gray-700' : 'text-gray-500'}>{c.label}</span>
            </div>
          ))}
        </div>
        <div className="pt-2">
          <Button
            size="sm"
            className="h-7 w-full text-[11px]"
            onClick={() => void handlePrimaryAction()}
            disabled={!ready || primary.disabled || updateResMutation.isPending || changeLeadStage.isPending}
          >
            {primary.label}
          </Button>
          {!ready && primary.reason && (
            <div className="text-[10px] text-gray-500 mt-1">{primary.reason}</div>
          )}
        </div>
      </SidebarSection>

      {reservation.hasConflict && reservation.conflict && (
        <SidebarSection title="Конфликт">
          <div className="text-[11px] text-red-700">{reservation.conflict.summary}</div>
          <div className="text-[10px] text-gray-500">
            {reservation.conflict.conflictingReservationId} · {reservation.conflict.conflictingAt}
          </div>
          <Button
            size="sm"
            variant="outline"
            className="h-6 w-full text-[11px] mt-1"
            onClick={handleOpenConflict}
          >
            Открыть конфликт
          </Button>
        </SidebarSection>
      )}

      <SidebarSection title="Процесс брони">
        <div className="space-y-0.5">
          {stageOrder.map((s) => {
            const active = s === computedStage;
            return (
              <div key={s} className={`flex items-center gap-1.5 text-[11px] px-1.5 py-0.5 rounded ${active ? 'text-gray-700 font-medium' : 'text-gray-500'}`}>
                {active ? <CheckCircle2 className="w-3 h-3 text-emerald-500" /> : <Circle className="w-3 h-3 text-gray-300" />}
                <span>{stageLabel[s]}</span>
              </div>
            );
          })}
        </div>
      </SidebarSection>

      <SidebarSection title="Связанные записи">
        <SidebarField
          label="Заявка"
          value={
            <button
              type="button"
              className="text-blue-600 hover:underline text-left"
              onClick={handleOpenApplication}
            >
              {reservation.linked.applicationTitle}
            </button>
          }
        />
        <SidebarField label="Позиция" value={reservation.linked.positionTitle} />
        <SidebarField label="Клиент" value={<button type="button" onClick={onOpenClient ? () => onOpenClient(clientLeadContext) : undefined} disabled={!onOpenClient} className="text-blue-600 hover:underline text-left disabled:text-gray-500 disabled:no-underline disabled:cursor-not-allowed">{reservation.linked.clientName}</button>} />
        {reservation.linked.leadTitle && (
          <SidebarField
            label="Лид"
            value={
              <button
                type="button"
                className="text-blue-600 hover:underline text-left"
                onClick={handleOpenLead}
              >
                {reservation.linked.leadTitle}
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
            onClick={() => void selectFirstAvailableUnit()}
          >
            <Wrench className="w-3 h-3 mr-1" /> Назначить unit
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-6 w-full justify-start text-[11px]"
            onClick={() => void selectFirstSubcontractor()}
          >
            <Building2 className="w-3 h-3 mr-1" /> Выбрать подрядчика
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-6 w-full justify-start text-[11px] text-gray-500"
            onClick={handleDuplicateReservation}
          >
            <Copy className="w-3 h-3 mr-1" /> Дублировать бронь
          </Button>
          <Button size="sm" variant="outline" className="h-6 w-full justify-start text-[11px]" onClick={() => setReleaseOpen(true)}>
            <XCircle className="w-3 h-3 mr-1" /> Снять бронь
          </Button>
        </div>
      </SidebarSection>
    </>
  );

  return (
    <DetailShell
      breadcrumb={<Breadcrumb items={['CRM', 'Sales', 'Reservation']} />}
      onClose={onClose}
      main={main}
      sidebar={sidebar}
    />
  );
}

