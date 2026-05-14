import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Application } from '../../types/application';
import { Lead, StageType } from '../../types/kanban';
import { WorkspaceHeader } from '../shell/WorkspaceHeader';
import { ApplicationsToolbar } from '../shell/ApplicationsToolbar';
import {
  ApplicationsFiltersState,
  DEFAULT_APPLICATIONS_FILTERS,
} from '../shell/filterTypes';
import { useLayout } from '../shell/layoutStore';
import { ApplicationsListView } from '../views/ApplicationsListView';
import { ApplicationsTableView } from '../views/ApplicationsTableView';
import { Dialog, DialogContent } from '../ui/dialog';
import { LeadDetailModal } from '../detail/LeadDetailModal';
import { ClientWorkspace } from '../client/ClientWorkspace';
import { USE_API } from '../../lib/featureFlags';
import { useApplicationQuery, useApplicationsQuery } from '../../hooks/useApplicationsQuery';
import { toUiApplication } from '../../lib/applicationAdapter';
import { useLeadQuery } from '../../hooks/useLeadsQuery';
import { toKanbanLead } from '../../lib/leadAdapter';
import { isApiErrorStatus } from '../../lib/apiErrors';
import { ApplicationListParams } from '../../lib/applicationsApi';
import { useManagersQuery } from '../../hooks/useUsersQuery';
import { saveViewSnapshot } from '../../lib/viewSnapshots';

/**
 * Adapt an Application row into a Lead-shaped object for cross-entity helpers
 * (например, открытие клиента из карточки заявки) without duplicating mapper
 * logic in multiple UI handlers.
 */
function applicationToLead(a: Application): Lead {
  const pos0 = a.positions[0];
  const stage: StageType = a.stage as StageType;
  return {
    id: a.leadId ?? a.id,
    apiClientId: a.clientId,
    stage,
    client: a.clientName,
    company: a.clientCompany,
    phone: a.clientPhone,
    source: 'Заявка',
    equipmentType: pos0?.equipmentType ?? '',
    date: a.requestedDate,
    timeWindow:
      a.requestedTimeFrom && a.requestedTimeTo
        ? `${a.requestedTimeFrom}-${a.requestedTimeTo}`
        : undefined,
    address: a.address,
    manager: a.responsibleManager,
    lastActivity: a.lastActivity,
    isUrgent: a.isUrgent,
    ownOrSubcontractor: pos0?.sourcingType,
    subcontractor: pos0?.subcontractor,
    equipmentUnit: pos0?.unit,
    hasConflict: pos0?.reservationState === 'conflict',
    readyForDeparture: pos0?.status === 'reserved' && pos0?.readyForReservation,
  };
}

/**
 * Routed page for /applications (and its saved-view aliases).
 * Supports list + table views; board is intentionally absent because there is
 * no applications kanban in the product right now — заявки живут внутри
 * воронки лидов, а отдельная доска не входит в MVP этой итерации.
 */
export function ApplicationsWorkspacePage() {
  const {
    currentView,
    activeSecondaryNav,
    activeEntityType,
    activeEntityId,
    setActiveSecondaryNav,
    setActiveEntityRoute,
    clearActiveEntityRoute,
  } = useLayout();
  const [filters, setFilters] = useState<ApplicationsFiltersState>(DEFAULT_APPLICATIONS_FILTERS);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Application | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [clientLead, setClientLead] = useState<Lead | null>(null);
  const [isClientOpen, setIsClientOpen] = useState(false);
  const [leadOverlayId, setLeadOverlayId] = useState<string | null>(null);
  const [isLeadOverlayOpen, setIsLeadOverlayOpen] = useState(false);
  const managersQuery = useManagersQuery(USE_API);

  const managerOptions = useMemo(() => {
    return (managersQuery.data ?? []).map((manager) => ({
      value: manager.id,
      label: manager.fullName,
    }));
  }, [managersQuery.data]);

  const effectiveView: 'list' | 'table' =
    currentView === 'table' ? 'table' : 'list';

  // Источник данных: API. Ответ уже спроецирован бэкендом
  // (applicationGroup / positionsReady / status per position), FE adapter
  // только презентационно маппит в UI-тип.
  const serverQueryParams = useMemo<ApplicationListParams>(() => {
    const params: ApplicationListParams = {
      scope: filters.scope === 'my' ? 'mine' : 'all',
      query: query.trim() || undefined,
      // Sales surface: only application-stage records. Ops stages live in Reservations/Departures/Completion.
      stage: 'application',
    };

    if (activeSecondaryNav === 'my-applications') {
      params.scope = 'mine';
    }

    if (activeSecondaryNav === 'apps-no-reservation' || activeSecondaryNav === 'apps-ready') {
      params.readinessReservation = 'no_data';
    }

    if (filters.manager !== 'all') {
      params.managerId = filters.manager;
    }

    if (filters.sourcing !== 'all') {
      params.sourcing = filters.sourcing;
    }

    if (filters.equipment !== 'all') {
      params.equipment = filters.equipment;
    }

    if (filters.readinessReservation !== 'all') {
      params.readinessReservation = filters.readinessReservation;
    }

    if (filters.conflict) {
      params.conflict = true;
    }

    return params;
  }, [activeSecondaryNav, filters, query]);

  const applicationsQuery = useApplicationsQuery(serverQueryParams, USE_API);
  const routedApplicationQuery = useApplicationQuery(
    activeEntityType === 'application' ? activeEntityId : null,
    USE_API && activeEntityType === 'application' && !!activeEntityId,
  );
  const sourceApplications: Application[] = useMemo(() => {
    if (!applicationsQuery.data) return [];
    return applicationsQuery.data.items.map(toUiApplication);
  }, [applicationsQuery.data]);

  const salesStageApplications = useMemo(
    () => sourceApplications.filter((a) => a.stage === 'application'),
    [sourceApplications],
  );

  // Saved-view aliases are encoded into API query params above (scope/readiness).
  const aliasFiltered = useMemo(() => {
    return salesStageApplications;
  }, [salesStageApplications]);

  const filtered = aliasFiltered;

  const hasActiveFilter =
    filters.scope !== 'all' ||
    filters.manager !== 'all' ||
    filters.status !== 'all' ||
    filters.sourcing !== 'all' ||
    filters.equipment !== 'all' ||
    filters.readinessReservation !== 'all' ||
    filters.conflict ||
    query.length > 0;

  // Legacy route alias: /applications/ready is merged into Active Applications.
  useEffect(() => {
    if (activeSecondaryNav === 'apps-ready') {
      setActiveSecondaryNav('apps-no-reservation');
    }
  }, [activeSecondaryNav, setActiveSecondaryNav]);

  const handleRowClick = (app: Application) => {
    setSelected(app);
    setActiveEntityRoute('application', app.id);
    setIsOpen(true);
  };
  const handleClose = () => {
    setIsOpen(false);
    setSelected(null);
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

  const handleSaveView = () => {
    void saveViewSnapshot({
      moduleId: activeSecondaryNav,
      view: effectiveView,
      query,
      filters,
    });
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

  const handleWorkflowNavigate = (
    target: 'application' | 'reservation',
    payload?: { leadId?: string; reservationId?: string },
  ) => {
    if (target === 'reservation' && payload?.reservationId) {
      setIsOpen(false);
      setSelected(null);
      setActiveEntityRoute('reservation', payload.reservationId);
    }
  };

  // Lazy-load lead by id only when overlay is requested (cross-entity nav
  // from an application card's "Открыть лид" action). We reuse the same
  // LeadDetailModal used by the leads page.
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
    if (activeEntityType !== 'application' || !activeEntityId) return;
    if (!USE_API) return;

    if (!routedApplicationQuery.data) return;
    setSelected(toUiApplication(routedApplicationQuery.data));
    setIsOpen(true);
  }, [
    activeEntityType,
    activeEntityId,
    routedApplicationQuery.data,
  ]);

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col">
      <WorkspaceHeader />
      <ApplicationsToolbar
        filters={filters}
        onFiltersChange={setFilters}
        query={query}
        onQueryChange={setQuery}
        onSaveView={handleSaveView}
        managerOptions={managerOptions}
      />

      {effectiveView === 'list' ? (
        <ApplicationsListView
          applications={filtered}
          onRowClick={handleRowClick}
          isFiltered={hasActiveFilter || activeSecondaryNav.startsWith('apps-')}
        />
      ) : (
        <ApplicationsTableView
          applications={filtered}
          onRowClick={handleRowClick}
          isFiltered={hasActiveFilter || activeSecondaryNav.startsWith('apps-')}
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
        <DialogContent className="!max-w-none w-[calc(100vw-1rem)] h-[calc(100dvh-1rem)] sm:w-[96vw] sm:h-[92vh] p-0 gap-0 rounded-lg overflow-hidden [&>button]:hidden">
          {selected ? (
            <LeadDetailModal
              application={selected}
              onClose={handleClose}
              onOpenClient={() => handleOpenClient(applicationToLead(selected))}
              onOpenLead={USE_API ? handleOpenLead : undefined}
              onWorkflowNavigate={handleWorkflowNavigate}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={isClientOpen} onOpenChange={setIsClientOpen}>
        <DialogContent className="!max-w-none w-[calc(100vw-1rem)] h-[calc(100dvh-1rem)] sm:w-[96vw] sm:h-[92vh] p-0 gap-0 rounded-lg overflow-hidden [&>button]:hidden">
          {clientLead && <ClientWorkspace lead={clientLead} onClose={handleCloseClient} />}
        </DialogContent>
      </Dialog>

      <Dialog open={isLeadOverlayOpen} onOpenChange={handleLeadOverlayOpenChange}>
        <DialogContent className="!max-w-none w-[calc(100vw-1rem)] h-[calc(100dvh-1rem)] sm:w-[96vw] sm:h-[92vh] p-0 gap-0 rounded-lg overflow-hidden [&>button]:hidden">
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
    </div>
  );
}
