import { useEffect, useMemo, useState } from 'react';
import { FileText } from 'lucide-react';
import { toast } from 'sonner';
import { Lead } from '../../types/kanban';
import { mockReservations } from '../../data/mockReservations';
import { WorkspaceHeader } from '../shell/WorkspaceHeader';
import { ReservationsToolbar } from '../shell/ReservationsToolbar';
import {
  DEFAULT_RESERVATIONS_FILTERS,
  ReservationsFiltersState,
} from '../shell/filterTypes';
import {
  applyReservationsFilters,
  buildReservationRows,
  ReservationRow,
} from '../shell/reservationHelpers';
import { useLayout } from '../shell/layoutStore';
import { ReservationsListView } from '../views/ReservationsListView';
import { ReservationsTableView } from '../views/ReservationsTableView';
import { Dialog, DialogContent } from '../ui/dialog';
import { ReservationWorkspace } from './ReservationWorkspace';
import { ClientWorkspace } from '../client/ClientWorkspace';
import { LeadDetailModal } from '../detail/LeadDetailModal';
import { Button } from '../ui/button';
import { USE_API } from '../../lib/featureFlags';
import { useReservationQuery, useReservationsQuery } from '../../hooks/useReservationsQuery';
import { useApplicationsQuery } from '../../hooks/useApplicationsQuery';
import { useLeadQuery } from '../../hooks/useLeadsQuery';
import { toKanbanLead } from '../../lib/leadAdapter';
import { toReservationRow, toReservationRows } from '../../lib/reservationAdapter';
import { isApiErrorStatus } from '../../lib/apiErrors';
import { saveViewSnapshot } from '../../lib/viewSnapshots';
import {
  CreateReservationDialog,
  type ReservationCreateCandidate,
} from './CreateReservationDialog';

/**
 * Routed page for /reservations (and the ops saved-view aliases). Hosts both
 * list and table views over the same reservation dataset and opens the
 * existing ReservationWorkspace detail modal on row click so the detail
 * experience matches what users see when clicking a reservation card in the
 * leads kanban.
 *
 * There is no "New reservation" CTA: in MVP брони всегда живут в контексте
 * позиции заявки. Вместо этого в шапке списка висит secondary-ссылка
 * «Создать из заявки», переводящая в раздел Заявок.
 */
export function ReservationsWorkspacePage() {
  const {
    activeSecondaryNav,
    currentView,
    activeEntityType,
    activeEntityId,
    setActiveSecondaryNav,
    setActiveEntityRoute,
    clearActiveEntityRoute,
  } = useLayout();
  const [filters, setFilters] = useState<ReservationsFiltersState>(DEFAULT_RESERVATIONS_FILTERS);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Lead | null>(null);
  const [selectedReservationId, setSelectedReservationId] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [clientLead, setClientLead] = useState<Lead | null>(null);
  const [isClientOpen, setIsClientOpen] = useState(false);
  const [leadOverlayId, setLeadOverlayId] = useState<string | null>(null);
  const [isLeadOverlayOpen, setIsLeadOverlayOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const effectiveView: 'list' | 'table' = currentView === 'table' ? 'table' : 'list';

  // Источник: либо projected API (с derived stage/nextStep/CTA/reason уже на
  // бэке), либо mock (fallback без флага USE_API). Оба пути приводятся к
  // единому ReservationRow, так что фильтры/рендер не разветвляются.
  const reservationsQuery = useReservationsQuery({ isActive: undefined }, USE_API);
  const routedReservationQuery = useReservationQuery(
    activeEntityType === 'reservation' ? activeEntityId : null,
    USE_API && activeEntityType === 'reservation' && !!activeEntityId,
  );
  const applicationsQuery = useApplicationsQuery({ scope: 'all' }, USE_API);

  const reservationCandidates = useMemo<ReservationCreateCandidate[]>(() => {
    if (!USE_API || !applicationsQuery.data) return [];
    return applicationsQuery.data.items.flatMap((app) =>
      app.positions
        .filter((p) => p.status === 'no_reservation')
        .map((p) => ({
          applicationItemId: p.id,
          applicationId: app.id,
          applicationNumber: app.number,
          clientName: app.clientCompany ?? app.clientName,
          equipmentTypeLabel: p.equipmentTypeLabel,
          equipmentTypeId: p.equipmentTypeId,
          address: p.address ?? app.address,
          plannedDate: p.plannedDate,
          plannedTimeFrom: p.plannedTimeFrom,
          plannedTimeTo: p.plannedTimeTo,
        })),
    );
  }, [applicationsQuery.data]);
  const allRows = useMemo(() => {
    if (USE_API && reservationsQuery.data) {
      return toReservationRows(reservationsQuery.data.items);
    }
    return buildReservationRows(mockReservations);
  }, [reservationsQuery.data]);

  // Saved-view aliases pre-apply a filter so page content matches nav context.
  const aliasFiltered = useMemo(() => {
    switch (activeSecondaryNav) {
      case 'view-conflict':
        return allRows.filter((r) => r.reservation.hasConflict);
      case 'view-need-confirm':
        return allRows.filter(
          (r) =>
            r.reservation.status === 'active' &&
            (r.reservation.internalStage === 'type_reserved' ||
              r.reservation.internalStage === 'unit_defined'),
        );
      case 'view-no-unit':
        return allRows.filter(
          (r) => r.reservation.source === 'own' && !r.reservation.equipmentUnit,
        );
      case 'view-no-subcontractor':
        return allRows.filter(
          (r) => r.reservation.source === 'subcontractor' && !r.reservation.subcontractor,
        );
      case 'view-ready-departure':
        return allRows.filter((r) => r.reservation.readyForDeparture);
      case 'view-released':
        return allRows.filter((r) => r.reservation.status === 'released');
      default:
        return allRows;
    }
  }, [allRows, activeSecondaryNav]);

  const filtered = useMemo(
    () => applyReservationsFilters(aliasFiltered, filters, query),
    [aliasFiltered, filters, query],
  );

  const hasActiveFilter =
    filters.scope !== 'all' ||
    filters.manager !== 'all' ||
    filters.status !== 'all' ||
    filters.internalStage !== 'all' ||
    filters.source !== 'all' ||
    filters.equipment !== 'all' ||
    filters.subcontractor !== 'all' ||
    filters.unitSelection !== 'all' ||
    filters.conflict ||
    filters.readyForDeparture ||
    query.length > 0;

  const normalizeEntityRouteId = (id?: string | null): string | null => {
    if (!id) return null;
    const value = id.trim();
    if (!value) return null;
    if (/^(LEAD|APP|RSV|DEP|CMP|CL)-\d+$/i.test(value)) {
      return null;
    }
    return value;
  };

  const canOpenApplicationFromRow = (row: ReservationRow): boolean =>
    !!normalizeEntityRouteId(row.reservation.linked.applicationId);

  const handleRowClick = (row: ReservationRow) => {
    setSelected(row.lead);
    setSelectedReservationId(row.reservation.id);
    setActiveEntityRoute('reservation', row.reservation.id);
    setIsOpen(true);
  };
  const handleOpenApplicationFromRow = (row: ReservationRow) => {
    const applicationEntityId = normalizeEntityRouteId(row.reservation.linked.applicationId);
    if (!applicationEntityId) return;
    setActiveEntityRoute('application', applicationEntityId);
  };
  const handleOpenChangeUnitFromRow = (row: ReservationRow) => {
    handleRowClick(row);
  };
  const handleOpenSelectSubcontractorFromRow = (row: ReservationRow) => {
    handleRowClick(row);
  };
  const handleOpenMoveToDepartureFromRow = (row: ReservationRow) => {
    handleRowClick(row);
  };
  const handleClose = () => {
    setIsOpen(false);
    setSelected(null);
    setSelectedReservationId(null);
    clearActiveEntityRoute();
  };
  const handleOpenClient = (lead: Lead) => {
    setClientLead(lead);
    setIsClientOpen(true);
  };
  const handleCloseClient = () => {
    setIsClientOpen(false);
    setClientLead(null);
  };

  const handleOpenLead = (leadId: string) => {
    setLeadOverlayId(leadId);
    setIsLeadOverlayOpen(true);
  };
  const handleCloseLeadOverlay = () => {
    setIsLeadOverlayOpen(false);
    setLeadOverlayId(null);
  };
  const handleLeadOverlayOpenChange = (open: boolean) => {
    setIsLeadOverlayOpen(open);
    if (!open) {
      setLeadOverlayId(null);
    }
  };

  const handleSaveView = () => {
    void saveViewSnapshot({
      moduleId: activeSecondaryNav,
      view: effectiveView,
      query,
      filters,
    });
  };

  const overlayLeadQuery = useLeadQuery(leadOverlayId, USE_API && isLeadOverlayOpen);
  const overlayLead: Lead | null = overlayLeadQuery.data
    ? toKanbanLead(overlayLeadQuery.data)
    : null;

  useEffect(() => {
    if (!isLeadOverlayOpen || !overlayLeadQuery.isError) return;
    if (isApiErrorStatus(overlayLeadQuery.error, 404)) {
      toast.warning('Связанный лид не найден или уже удален');
      handleCloseLeadOverlay();
    }
  }, [isLeadOverlayOpen, overlayLeadQuery.isError, overlayLeadQuery.error]);

  useEffect(() => {
    if (activeEntityType !== 'reservation' || !activeEntityId) return;

    if (USE_API) {
      if (!routedReservationQuery.data) return;
      const routed = toReservationRow(routedReservationQuery.data);
      setSelected(routed.lead);
      setSelectedReservationId(routed.reservation.id);
      setIsOpen(true);
      return;
    }

    const localRow = allRows.find((row) => row.reservation.id === activeEntityId);
    if (!localRow) return;
    setSelected(localRow.lead);
    setSelectedReservationId(localRow.reservation.id);
    setIsOpen(true);
  }, [
    activeEntityType,
    activeEntityId,
    routedReservationQuery.data,
    allRows,
  ]);

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col">
      <WorkspaceHeader />
      <ReservationsToolbar
        filters={filters}
        onFiltersChange={setFilters}
        query={query}
        onQueryChange={setQuery}
        onSaveView={handleSaveView}
      />
      <div className="flex h-8 shrink-0 items-center gap-2 border-b border-border/40 bg-muted/20 px-4 text-[11px] text-muted-foreground">
        <span>
          Новые брони можно создать прямо здесь из позиций заявки без активной брони.
        </span>
        {USE_API ? (
          <Button
            size="sm"
            variant="ghost"
            className="h-6 gap-1 px-2 text-[11px] text-[#2a6af0] hover:bg-[#e7f1ff] hover:text-[#2a6af0]"
            onClick={() => setIsCreateOpen(true)}
            disabled={reservationCandidates.length === 0}
          >
            <FileText className="h-3 w-3" />
            Новая бронь
          </Button>
        ) : null}
        <Button
          size="sm"
          variant="ghost"
          className="h-6 gap-1 px-2 text-[11px] text-[#2a6af0] hover:bg-[#e7f1ff] hover:text-[#2a6af0]"
          onClick={() => setActiveSecondaryNav('applications')}
        >
          <FileText className="h-3 w-3" />
          Перейти к заявкам
        </Button>
      </div>

      {effectiveView === 'list' ? (
        <ReservationsListView
          rows={filtered}
          onRowClick={handleRowClick}
          isFiltered={hasActiveFilter || activeSecondaryNav.startsWith('view-')}
          onOpenApplication={handleOpenApplicationFromRow}
          canOpenApplication={canOpenApplicationFromRow}
          onOpenChangeUnit={handleOpenChangeUnitFromRow}
          onOpenSelectSubcontractor={handleOpenSelectSubcontractorFromRow}
          onOpenMoveToDeparture={handleOpenMoveToDepartureFromRow}
        />
      ) : (
        <ReservationsTableView
          rows={filtered}
          onRowClick={handleRowClick}
          isFiltered={hasActiveFilter || activeSecondaryNav.startsWith('view-')}
        />
      )}

      <Dialog
        open={isOpen}
        onOpenChange={(open) => {
          if (!open) {
            handleClose();
            return;
          }
          setIsOpen(true);
        }}
      >
        <DialogContent className="!max-w-none w-[96vw] h-[92vh] p-0 gap-0 rounded-lg overflow-hidden [&>button]:hidden">
          {selected ? (
            <ReservationWorkspace
              lead={selected}
              onClose={handleClose}
              onOpenClient={handleOpenClient}
              onOpenLead={USE_API ? handleOpenLead : undefined}
              apiReservationId={selectedReservationId ?? undefined}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={isClientOpen} onOpenChange={setIsClientOpen}>
        <DialogContent className="!max-w-none w-[96vw] h-[92vh] p-0 gap-0 rounded-lg overflow-hidden [&>button]:hidden">
          {clientLead && (
            <ClientWorkspace
              lead={clientLead}
              onClose={handleCloseClient}
              apiClientId={USE_API ? clientLead.apiClientId : undefined}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isLeadOverlayOpen} onOpenChange={handleLeadOverlayOpenChange}>
        <DialogContent className="!max-w-none w-[96vw] h-[92vh] p-0 gap-0 rounded-lg overflow-hidden [&>button]:hidden">
          {overlayLead ? (
            <LeadDetailModal
              lead={overlayLead}
              onClose={handleCloseLeadOverlay}
              onOpenClient={() => handleOpenClient(overlayLead)}
              onOpenLead={USE_API ? handleOpenLead : undefined}
            />
          ) : overlayLeadQuery.isLoading ? (
            <div className="flex h-full items-center justify-center text-[12px] text-gray-500">
              Загружаем лид…
            </div>
          ) : overlayLeadQuery.isError ? (
            <div className="flex h-full items-center justify-center text-[12px] text-red-600">
              Не удалось загрузить лид
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <CreateReservationDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        candidates={reservationCandidates}
      />
    </div>
  );
}
