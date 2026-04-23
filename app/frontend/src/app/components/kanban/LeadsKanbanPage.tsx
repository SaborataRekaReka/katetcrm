import { useState, useMemo } from 'react';
import { Lead } from '../../types/kanban';
import { mockLeads } from '../../data/mockLeads';
import { mockApplication } from '../../data/mockApplications';
import { mockApplicationsList } from '../../data/mockApplicationsList';
import { LeadsKanbanBoard } from './LeadsKanbanBoard';
import { KpiRow } from './KpiRow';
import { WorkspaceHeader } from '../shell/WorkspaceHeader';
import { LeadsToolbar, applyLeadsFilters } from '../shell/LeadsToolbar';
import { DEFAULT_LEADS_FILTERS, LeadsFiltersState } from '../shell/filterTypes';
import { LeadDetailModal } from '../detail/LeadDetailModal';
import { ReservationWorkspace } from '../reservation/ReservationWorkspace';
import { DepartureWorkspace } from '../departure/DepartureWorkspace';
import { CompletionWorkspace } from '../completion/CompletionWorkspace';
import { ClientWorkspace } from '../client/ClientWorkspace';
import { Dialog, DialogContent } from '../ui/dialog';
import { useLayout } from '../shell/layoutStore';
import { LeadsListView } from '../views/LeadsListView';
import { LeadsTableView } from '../views/LeadsTableView';
import { USE_API } from '../../lib/featureFlags';
import { useLeadsQuery } from '../../hooks/useLeadsQuery';
import { toKanbanLead } from '../../lib/leadAdapter';
import { useRegisterPrimaryCta } from '../shell/primaryCtaStore';
import { NewLeadDialog } from '../leads/NewLeadDialog';

/**
 * Routed page for /leads (and saved-view aliases). Hosts three views —
 * board (kanban), list and table — all sharing the same filter state so that
 * switching view never loses or diverges from current filters.
 */
export function LeadsKanbanPage() {
  const { currentView, activeSecondaryNav } = useLayout();
  const leadsQuery = useLeadsQuery({ scope: 'all' }, USE_API);
  const apiLeads = useMemo<Lead[]>(
    () => (leadsQuery.data?.items ?? []).map(toKanbanLead),
    [leadsQuery.data],
  );
  const [leads] = useState<Lead[]>(mockLeads);
  const activeLeads = USE_API ? apiLeads : leads;
  const [filters, setFilters] = useState<LeadsFiltersState>(DEFAULT_LEADS_FILTERS);
  const [query, setQuery] = useState('');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [clientLead, setClientLead] = useState<Lead | null>(null);
  const [isClientOpen, setIsClientOpen] = useState(false);
  const [isNewLeadOpen, setIsNewLeadOpen] = useState(false);

  useRegisterPrimaryCta(
    activeSecondaryNav,
    USE_API ? () => setIsNewLeadOpen(true) : null,
  );

  const effectiveView: 'board' | 'list' | 'table' =
    currentView === 'list' || currentView === 'table' ? currentView : 'board';

  const filteredLeads = useMemo(
    () => applyLeadsFilters(activeLeads, filters, query),
    [activeLeads, filters, query],
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
    setSelectedLead(lead);
    setIsDetailOpen(true);
  };
  const handleCloseDetail = () => {
    setIsDetailOpen(false);
    setSelectedLead(null);
  };
  const handleOpenClient = (lead: Lead) => {
    setClientLead(lead);
    setIsClientOpen(true);
  };
  const handleCloseClient = () => {
    setIsClientOpen(false);
    setClientLead(null);
  };

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col">
      <WorkspaceHeader />
      <LeadsToolbar
        filters={filters}
        onFiltersChange={setFilters}
        query={query}
        onQueryChange={setQuery}
        showStageFilter={effectiveView === 'table'}
      />
      {effectiveView === 'board' ? <KpiRow leads={filteredLeads} /> : null}

      {effectiveView === 'board' && (
        <LeadsKanbanBoard leads={filteredLeads} onCardClick={handleCardClick} />
      )}

      {effectiveView === 'list' && (
        <LeadsListView
          leads={filteredLeads}
          onRowClick={handleCardClick}
          isFiltered={hasActiveFilter}
        />
      )}

      {effectiveView === 'table' && (
        <LeadsTableView
          leads={filteredLeads}
          onRowClick={handleCardClick}
          isFiltered={hasActiveFilter}
        />
      )}

      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="!max-w-none w-[96vw] h-[92vh] p-0 gap-0 rounded-lg overflow-hidden [&>button]:hidden">
          {selectedLead && selectedLead.stage === 'reservation' ? (
            <ReservationWorkspace lead={selectedLead} onClose={handleCloseDetail} onOpenClient={handleOpenClient} />
          ) : selectedLead && selectedLead.stage === 'departure' ? (
            <DepartureWorkspace lead={selectedLead} onClose={handleCloseDetail} onOpenClient={handleOpenClient} />
          ) : selectedLead && (selectedLead.stage === 'completed' || selectedLead.stage === 'unqualified') ? (
            <CompletionWorkspace lead={selectedLead} onClose={handleCloseDetail} onOpenClient={handleOpenClient} />
          ) : selectedLead ? (
            <LeadDetailModal
              lead={selectedLead.stage !== 'application' ? selectedLead : undefined}
              application={
                selectedLead.stage === 'application'
                  ? mockApplicationsList.find((a) => a.leadId === selectedLead.id) ?? mockApplication
                  : undefined
              }
              onClose={handleCloseDetail}
              onOpenClient={() => handleOpenClient(selectedLead)}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      <NewLeadDialog open={isNewLeadOpen} onOpenChange={setIsNewLeadOpen} />

      <Dialog open={isClientOpen} onOpenChange={setIsClientOpen}>
        <DialogContent className="!max-w-none w-[96vw] h-[92vh] p-0 gap-0 rounded-lg overflow-hidden [&>button]:hidden">
          {clientLead && <ClientWorkspace lead={clientLead} onClose={handleCloseClient} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

