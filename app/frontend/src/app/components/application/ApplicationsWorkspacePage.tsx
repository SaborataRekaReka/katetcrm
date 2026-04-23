import { useMemo, useState } from 'react';
import { Application } from '../../types/application';
import { Lead, StageType } from '../../types/kanban';
import { mockApplicationsList } from '../../data/mockApplicationsList';
import { WorkspaceHeader } from '../shell/WorkspaceHeader';
import { ApplicationsToolbar } from '../shell/ApplicationsToolbar';
import {
  ApplicationsFiltersState,
  DEFAULT_APPLICATIONS_FILTERS,
} from '../shell/filterTypes';
import { applyApplicationsFilters, computeGroup } from '../shell/applicationHelpers';
import { useLayout } from '../shell/layoutStore';
import { ApplicationsListView } from '../views/ApplicationsListView';
import { ApplicationsTableView } from '../views/ApplicationsTableView';
import { Dialog, DialogContent } from '../ui/dialog';
import { LeadDetailModal } from '../detail/LeadDetailModal';
import { ReservationWorkspace } from '../reservation/ReservationWorkspace';
import { DepartureWorkspace } from '../departure/DepartureWorkspace';
import { CompletionWorkspace } from '../completion/CompletionWorkspace';
import { ClientWorkspace } from '../client/ClientWorkspace';
import { USE_API } from '../../lib/featureFlags';
import { useApplicationsQuery } from '../../hooks/useApplicationsQuery';
import { toUiApplication } from '../../lib/applicationAdapter';
import { useLeadQuery } from '../../hooks/useLeadsQuery';
import { toKanbanLead } from '../../lib/leadAdapter';

/**
 * Adapt an Application row into a Lead-shaped object so the stage-specific
 * detail workspaces (ReservationWorkspace / DepartureWorkspace /
 * CompletionWorkspace) — which were originally designed around Lead — can be
 * reused without duplicating their UI. We only map fields relevant for
 * detail modals; the detail shell derives everything else from mocks.
 */
function applicationToLead(a: Application): Lead {
  const pos0 = a.positions[0];
  const stage: StageType =
    a.stage === 'cancelled' ? 'unqualified' : (a.stage as StageType);
  return {
    id: a.leadId ?? a.id,
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
  const { currentView, activeSecondaryNav } = useLayout();
  const [filters, setFilters] = useState<ApplicationsFiltersState>(DEFAULT_APPLICATIONS_FILTERS);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Application | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [clientLead, setClientLead] = useState<Lead | null>(null);
  const [isClientOpen, setIsClientOpen] = useState(false);
  const [leadOverlayId, setLeadOverlayId] = useState<string | null>(null);
  const [isLeadOverlayOpen, setIsLeadOverlayOpen] = useState(false);

  const effectiveView: 'list' | 'table' =
    currentView === 'table' ? 'table' : 'list';

  // Источник данных: API (если USE_API) либо mock. API-ответ уже спроецирован
  // бэкендом (applicationGroup / positionsReady / status per position), FE
  // adapter только презентационно маппит в UI-тип.
  const applicationsQuery = useApplicationsQuery({ scope: 'all' }, USE_API);
  const sourceApplications: Application[] = useMemo(() => {
    if (USE_API && applicationsQuery.data) {
      return applicationsQuery.data.items.map(toUiApplication);
    }
    return mockApplicationsList;
  }, [applicationsQuery.data]);

  // Saved-view aliases pre-apply a filter so the page content matches nav context.
  const aliasFiltered = useMemo(() => {
    if (activeSecondaryNav === 'apps-no-reservation') {
      return sourceApplications.filter((a) => computeGroup(a) === 'no_reservation');
    }
    if (activeSecondaryNav === 'apps-ready') {
      return sourceApplications.filter((a) => computeGroup(a) === 'ready_for_departure');
    }
    if (activeSecondaryNav === 'my-applications') {
      // В отсутствии реального currentUser считаем "мои" = Иванова С. (demo).
      return sourceApplications.filter((a) => a.responsibleManager === 'Иванова С.');
    }
    return sourceApplications;
  }, [activeSecondaryNav, sourceApplications]);

  const filtered = useMemo(
    () => applyApplicationsFilters(aliasFiltered, filters, query),
    [aliasFiltered, filters, query],
  );

  const hasActiveFilter =
    filters.scope !== 'all' ||
    filters.manager !== 'all' ||
    filters.status !== 'all' ||
    filters.sourcing !== 'all' ||
    filters.equipment !== 'all' ||
    filters.readinessReservation !== 'all' ||
    filters.readyForDeparture ||
    filters.conflict ||
    query.length > 0;

  const handleRowClick = (app: Application) => {
    setSelected(app);
    setIsOpen(true);
  };
  const handleClose = () => {
    setIsOpen(false);
    setSelected(null);
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

  // Lazy-load lead by id only when overlay is requested (cross-entity nav
  // from an application card's "Открыть лид" action). We reuse the same
  // LeadDetailModal used by the leads page.
  const overlayLeadQuery = useLeadQuery(leadOverlayId, USE_API && isLeadOverlayOpen);
  const overlayLead: Lead | null = overlayLeadQuery.data
    ? toKanbanLead(overlayLeadQuery.data)
    : null;

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col">
      <WorkspaceHeader />
      <ApplicationsToolbar
        filters={filters}
        onFiltersChange={setFilters}
        query={query}
        onQueryChange={setQuery}
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

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="!max-w-none w-[96vw] h-[92vh] p-0 gap-0 rounded-lg overflow-hidden [&>button]:hidden">
          {selected ? (
            selected.stage === 'reservation' ? (
              <ReservationWorkspace
                lead={applicationToLead(selected)}
                onClose={handleClose}
                onOpenClient={handleOpenClient}
              />
            ) : selected.stage === 'departure' ? (
              <DepartureWorkspace
                lead={applicationToLead(selected)}
                onClose={handleClose}
                onOpenClient={handleOpenClient}
              />
            ) : selected.stage === 'completed' || selected.stage === 'cancelled' ? (
              <CompletionWorkspace
                lead={applicationToLead(selected)}
                onClose={handleClose}
                onOpenClient={handleOpenClient}
              />
            ) : (
              // Default entry for an application row — same card that opens
              // from the kanban. Editing via dialog (see LeadDetailModal →
              // EditApplicationDialog) is wired there.
              <LeadDetailModal
                application={selected}
                onClose={handleClose}
                onOpenClient={() => handleOpenClient(applicationToLead(selected))}
                onOpenLead={USE_API ? handleOpenLead : undefined}
              />
            )
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={isClientOpen} onOpenChange={setIsClientOpen}>
        <DialogContent className="!max-w-none w-[96vw] h-[92vh] p-0 gap-0 rounded-lg overflow-hidden [&>button]:hidden">
          {clientLead && <ClientWorkspace lead={clientLead} onClose={handleCloseClient} />}
        </DialogContent>
      </Dialog>

      <Dialog open={isLeadOverlayOpen} onOpenChange={setIsLeadOverlayOpen}>
        <DialogContent className="!max-w-none w-[96vw] h-[92vh] p-0 gap-0 rounded-lg overflow-hidden [&>button]:hidden">
          {overlayLead ? (
            <LeadDetailModal
              lead={overlayLead}
              onClose={handleCloseLeadOverlay}
              onOpenClient={() => handleOpenClient(overlayLead)}
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
