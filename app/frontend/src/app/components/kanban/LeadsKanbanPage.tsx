import { useEffect, useMemo, useState } from 'react';
import { Lead } from '../../types/kanban';
import { mockLeads } from '../../data/mockLeads';
import { mockApplication } from '../../data/mockApplications';
import { mockApplicationsList } from '../../data/mockApplicationsList';
import { LeadsKanbanBoard } from './LeadsKanbanBoard';
import { KpiCardId, KpiRow } from './KpiRow';
import { WorkspaceHeader } from '../shell/WorkspaceHeader';
import { LeadsToolbar, applyLeadsFilters } from '../shell/LeadsToolbar';
import { DEFAULT_LEADS_FILTERS, LeadsFiltersState } from '../shell/filterTypes';
import { LeadDetailModal } from '../detail/LeadDetailModal';
import { ClientWorkspace } from '../client/ClientWorkspace';
import { Dialog, DialogContent } from '../ui/dialog';
import { useLayout } from '../shell/layoutStore';
import { LeadsListView } from '../views/LeadsListView';
import { LeadsTableView } from '../views/LeadsTableView';
import { USE_API } from '../../lib/featureFlags';
import { useLeadsQuery } from '../../hooks/useLeadsQuery';
import { useLeadQuery } from '../../hooks/useLeadsQuery';
import { toKanbanLead } from '../../lib/leadAdapter';
import { LeadListParams, PipelineStage, SourceChannel } from '../../lib/leadsApi';
import { useApplicationsQuery } from '../../hooks/useApplicationsQuery';
import { useManagersQuery } from '../../hooks/useUsersQuery';
import { toUiApplication } from '../../lib/applicationAdapter';
import { useRegisterPrimaryCta } from '../shell/primaryCtaStore';
import { NewLeadDialog } from '../leads/NewLeadDialog';
import { saveViewSnapshot } from '../../lib/viewSnapshots';

/**
 * Routed page for /leads (and saved-view aliases). Hosts three views —
 * board (kanban), list and table — all sharing the same filter state so that
 * switching view never loses or diverges from current filters.
 */
export function LeadsKanbanPage() {
  const {
    currentView,
    activeSecondaryNav,
    activeEntityType,
    activeEntityId,
    setActivePrimaryNav,
    setActiveSecondaryNav,
    setActiveEntityRoute,
    clearActiveEntityRoute,
  } = useLayout();
  const [leads] = useState<Lead[]>(mockLeads);
  const [filters, setFilters] = useState<LeadsFiltersState>(DEFAULT_LEADS_FILTERS);
  const [query, setQuery] = useState('');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [clientLead, setClientLead] = useState<Lead | null>(null);
  const [isClientOpen, setIsClientOpen] = useState(false);
  const [isNewLeadOpen, setIsNewLeadOpen] = useState(false);
  const managersQuery = useManagersQuery(USE_API);

  const managerOptions = useMemo(() => {
    if (!USE_API) {
      return [
        { value: 'Петров А.', label: 'Петров А.' },
        { value: 'Сидоров Б.', label: 'Сидоров Б.' },
        { value: 'Иванова С.', label: 'Иванова С.' },
      ];
    }

    return (managersQuery.data ?? []).map((manager) => ({
      value: manager.id,
      label: manager.fullName,
    }));
  }, [managersQuery.data]);

  const serverQueryParams = useMemo<LeadListParams>(() => {
    const params: LeadListParams = {
      scope: filters.scope === 'my' ? 'mine' : 'all',
      query: query.trim() || undefined,
    };

    const aliasStage =
      activeSecondaryNav === 'view-to-application'
        ? 'lead'
        : activeSecondaryNav === 'view-needs-reservation'
          ? 'application'
          : undefined;

    if (aliasStage) {
      params.stage = aliasStage;
    } else if (filters.stage !== 'all') {
      params.stage = filters.stage as PipelineStage;
    }

    if (filters.source !== 'all') {
      params.source = filters.source as SourceChannel;
    }

    if (filters.equipment !== 'all') {
      params.equipmentTypeHint = filters.equipment;
    }

    if (filters.urgent || activeSecondaryNav === 'view-urgent') {
      params.isUrgent = true;
    }

    if (filters.stale || activeSecondaryNav === 'view-stale') {
      params.isStale = true;
    }

    if (filters.duplicates || activeSecondaryNav === 'view-duplicates') {
      params.isDuplicate = true;
    }

    if (activeSecondaryNav === 'view-no-contact') {
      params.hasNoContact = true;
    }

    if (filters.manager !== 'all') {
      params.managerId = filters.manager;
    }

    return params;
  }, [
    activeSecondaryNav,
    filters.duplicates,
    filters.equipment,
    filters.manager,
    filters.scope,
    filters.source,
    filters.stage,
    filters.stale,
    filters.urgent,
    query,
  ]);

  const leadsQuery = useLeadsQuery(serverQueryParams, USE_API);
  const apiLeads = useMemo<Lead[]>(
    () => (leadsQuery.data?.items ?? []).map(toKanbanLead),
    [leadsQuery.data],
  );
  const apiLinkedIdsByLeadId = useMemo(
    () =>
      new Map(
        (leadsQuery.data?.items ?? []).map((item) => [item.id, item.linkedIds]),
      ),
    [leadsQuery.data],
  );
  const activeLeads = USE_API ? apiLeads : leads;

  const routedLeadQuery = useLeadQuery(
    activeEntityType === 'lead' ? activeEntityId : null,
    USE_API && activeEntityType === 'lead' && !!activeEntityId,
  );

  const selectedApplicationQuery = useApplicationsQuery(
    selectedLead?.stage === 'application' ? { leadId: selectedLead.id, scope: 'all' } : {},
    USE_API && isDetailOpen && selectedLead?.stage === 'application',
  );
  const selectedApplication = useMemo(() => {
    if (!USE_API || selectedLead?.stage !== 'application') return undefined;
    const apiApp = selectedApplicationQuery.data?.items?.[0];
    return apiApp ? toUiApplication(apiApp) : undefined;
  }, [selectedApplicationQuery.data, selectedLead]);

  useRegisterPrimaryCta(
    activeSecondaryNav,
    USE_API ? () => setIsNewLeadOpen(true) : null,
  );

  const effectiveView: 'board' | 'list' | 'table' =
    currentView === 'list' || currentView === 'table' ? currentView : 'board';

  const aliasFiltered = useMemo(() => {
    if (USE_API) {
      return activeLeads;
    }

    switch (activeSecondaryNav) {
      case 'view-urgent':
        return activeLeads.filter((l) => !!l.isUrgent);
      case 'view-no-contact':
        return activeLeads.filter((l) => !!l.hasNoContact);
      case 'view-to-application':
        return activeLeads.filter((l) => l.stage === 'lead' && !l.isNew);
      case 'view-needs-reservation':
        return activeLeads.filter((l) => l.stage === 'application');
      case 'view-stale':
        return activeLeads.filter((l) => !!l.isStale);
      case 'view-duplicates':
        return activeLeads.filter((l) => !!l.isDuplicate);
      default:
        return activeLeads;
    }
  }, [activeLeads, activeSecondaryNav]);

  const filteredLeads = useMemo(
    () => applyLeadsFilters(aliasFiltered, filters, query, { skipManagerFilter: USE_API }),
    [aliasFiltered, filters, query],
  );

  const hasActiveFilter =
    filters.scope !== 'all' ||
    filters.manager !== 'all' ||
    filters.source !== 'all' ||
    filters.equipment !== 'all' ||
    filters.stage !== 'all' ||
    filters.urgent ||
    filters.duplicates ||
    filters.stale ||
    query.length > 0;

  const handleCardClick = (lead: Lead) => {
    const linkedIds = USE_API ? apiLinkedIdsByLeadId.get(lead.id) : null;

    const reservationId = lead.stage === 'reservation' ? linkedIds?.reservationId ?? null : null;
    const departureId = lead.stage === 'departure' ? linkedIds?.departureId ?? null : null;
    const completionId =
      lead.stage === 'completed' || lead.stage === 'unqualified'
        ? linkedIds?.completionId ?? null
        : null;
    const terminalFallbackDepartureId =
      lead.stage === 'completed' || lead.stage === 'unqualified'
        ? linkedIds?.departureId ?? null
        : null;

    if (reservationId) {
      setSelectedLead(null);
      setIsDetailOpen(false);
      setActiveEntityRoute('reservation', reservationId);
      return;
    }

    if (departureId) {
      setSelectedLead(null);
      setIsDetailOpen(false);
      setActiveEntityRoute('departure', departureId);
      return;
    }

    if (completionId) {
      setSelectedLead(null);
      setIsDetailOpen(false);
      setActiveEntityRoute('completion', completionId);
      return;
    }

    if (terminalFallbackDepartureId) {
      setSelectedLead(null);
      setIsDetailOpen(false);
      setActiveEntityRoute('departure', terminalFallbackDepartureId);
      return;
    }

    setSelectedLead(lead);
    setActiveEntityRoute('lead', lead.id);
    setIsDetailOpen(true);
  };
  const handleCloseDetail = () => {
    setIsDetailOpen(false);
    setSelectedLead(null);
    clearActiveEntityRoute();
  };
  const handleWorkflowNavigate = (
    target: 'application' | 'reservation',
    payload?: { leadId?: string; reservationId?: string },
  ) => {
    if (target === 'reservation') {
      if (payload?.reservationId) {
        setSelectedLead(null);
        setIsDetailOpen(false);
        setActiveEntityRoute('reservation', payload.reservationId);
      }
      return;
    }

    if (target === 'application') {
      setSelectedLead((prev) => {
        if (!prev) return prev;
        if (payload?.leadId && prev.id !== payload.leadId) return prev;
        return { ...prev, stage: 'application' };
      });
      setIsDetailOpen(true);
    }
  };
  const handleOpenClient = (lead: Lead) => {
    setClientLead(lead);
    setIsClientOpen(true);
  };
  const handleNewLeadCreated = (leadId: string) => {
    setActiveEntityRoute('lead', leadId);
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

  const handleKpiSelect = (id: KpiCardId) => {
    const reset = () => {
      setFilters(DEFAULT_LEADS_FILTERS);
      setQuery('');
    };

    switch (id) {
      case 'new_leads':
        setActivePrimaryNav('sales');
        setActiveSecondaryNav('leads');
        setFilters({ ...DEFAULT_LEADS_FILTERS, stage: 'lead' });
        setQuery('');
        return;
      case 'no_contact':
        reset();
        setActivePrimaryNav('sales');
        setActiveSecondaryNav('view-no-contact');
        return;
      case 'awaiting_application':
        reset();
        setActivePrimaryNav('sales');
        setActiveSecondaryNav('view-to-application');
        return;
      case 'needs_reservation':
        reset();
        setActivePrimaryNav('sales');
        setActiveSecondaryNav('view-needs-reservation');
        return;
      case 'departures_today':
        reset();
        setActivePrimaryNav('ops');
        setActiveSecondaryNav('view-departures-today');
        return;
      case 'stale':
        reset();
        setActivePrimaryNav('sales');
        setActiveSecondaryNav('view-stale');
        return;
      case 'duplicates':
        reset();
        setActivePrimaryNav('sales');
        setActiveSecondaryNav('view-duplicates');
        return;
      case 'conflicts':
        reset();
        setActivePrimaryNav('ops');
        setActiveSecondaryNav('view-conflict');
        return;
      default:
        return;
    }
  };

  useEffect(() => {
    if (activeEntityType !== 'lead' || !activeEntityId) return;

    if (USE_API) {
      if (!routedLeadQuery.data) return;
      setSelectedLead(toKanbanLead(routedLeadQuery.data));
      setIsDetailOpen(true);
      return;
    }

    const localLead = activeLeads.find((item) => item.id === activeEntityId);
    if (!localLead) return;
    setSelectedLead(localLead);
    setIsDetailOpen(true);
  }, [activeEntityType, activeEntityId, activeLeads, routedLeadQuery.data]);

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col">
      <WorkspaceHeader />
      <LeadsToolbar
        filters={filters}
        onFiltersChange={setFilters}
        query={query}
        onQueryChange={setQuery}
        onSaveView={handleSaveView}
        managerOptions={managerOptions}
        showStageFilter={effectiveView === 'table'}
      />
      {effectiveView === 'board' ? <KpiRow leads={filteredLeads} onSelect={handleKpiSelect} /> : null}

      {effectiveView === 'board' && (
        <LeadsKanbanBoard leads={filteredLeads} onCardClick={handleCardClick} />
      )}

      {effectiveView === 'list' && (
        <LeadsListView
          leads={filteredLeads}
          onRowClick={handleCardClick}
          isFiltered={hasActiveFilter || activeSecondaryNav.startsWith('view-')}
        />
      )}

      {effectiveView === 'table' && (
        <LeadsTableView
          leads={filteredLeads}
          onRowClick={handleCardClick}
          isFiltered={hasActiveFilter || activeSecondaryNav.startsWith('view-')}
        />
      )}

      <Dialog
        open={isDetailOpen}
        onOpenChange={(open) => {
          if (!open) {
            handleCloseDetail();
            return;
          }
          setIsDetailOpen(true);
        }}
      >
        <DialogContent className="!max-w-none w-[96vw] h-[92vh] p-0 gap-0 rounded-lg overflow-hidden [&>button]:hidden">
          {selectedLead ? (
            <LeadDetailModal
              lead={selectedLead}
              application={
                selectedLead.stage === 'application'
                  ? (USE_API
                    ? selectedApplication
                    : mockApplicationsList.find((a) => a.leadId === selectedLead.id) ?? mockApplication)
                  : undefined
              }
              onClose={handleCloseDetail}
              onOpenClient={() => handleOpenClient(selectedLead)}
              onWorkflowNavigate={handleWorkflowNavigate}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      <NewLeadDialog
        open={isNewLeadOpen}
        onOpenChange={setIsNewLeadOpen}
        onCreated={handleNewLeadCreated}
      />

      <Dialog open={isClientOpen} onOpenChange={setIsClientOpen}>
        <DialogContent className="!max-w-none w-[96vw] h-[92vh] p-0 gap-0 rounded-lg overflow-hidden [&>button]:hidden">
          {clientLead && (
            <ClientWorkspace
              lead={clientLead}
              apiClientId={USE_API ? clientLead.apiClientId : undefined}
              onClose={handleCloseClient}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

