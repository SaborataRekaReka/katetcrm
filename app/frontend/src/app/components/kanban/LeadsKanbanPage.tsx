import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Lead, StageType } from '../../types/kanban';
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
import { IS_SALES_LITE, USE_API } from '../../lib/featureFlags';
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
import { ACCESS_TOKEN_KEY } from '../../lib/apiClient';

const OPENED_LEAD_IDS_STORAGE_KEY = 'katet-crm.leads.opened.v1';
const UNOPENED_NEW_LEAD_IDS_STORAGE_KEY = 'katet-crm.leads.new-unopened.v1';
const LEADS_STREAM_RECONNECT_MS = 3_000;

let leadArrivalAudioContext: AudioContext | null = null;

function readStoredIdSet(key: string): Set<string> {
  if (typeof window === 'undefined') return new Set<string>();
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return new Set<string>();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set<string>();
    return new Set<string>(parsed.filter((v): v is string => typeof v === 'string' && v.trim().length > 0));
  } catch {
    return new Set<string>();
  }
}

function writeStoredIdSet(key: string, ids: Set<string>) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(Array.from(ids)));
  } catch {
    /* ignore localStorage write failures */
  }
}

function resolveLeadsStreamUrl() {
  const base = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'http://localhost:3001/api/v1';
  const normalizedBase = base.endsWith('/') ? base : `${base}/`;

  if (/^https?:\/\//i.test(normalizedBase)) {
    return new URL('leads/stream', normalizedBase).toString();
  }

  const origin = typeof window === 'undefined' ? 'http://localhost' : window.location.origin;
  const resolvedBase = new URL(normalizedBase.replace(/^\/+/, ''), `${origin}/`).toString();
  return new URL('leads/stream', resolvedBase).toString();
}

function playLeadArrivalSound() {
  if (typeof window === 'undefined' || typeof window.AudioContext === 'undefined') return;
  try {
    if (!leadArrivalAudioContext) {
      leadArrivalAudioContext = new window.AudioContext();
    }
    const ctx = leadArrivalAudioContext;
    if (ctx.state === 'suspended') {
      void ctx.resume();
    }

    const now = ctx.currentTime + 0.01;
    const tone = (frequency: number, start: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(frequency, start);

      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.07, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + duration + 0.02);
    };

    tone(880, now, 0.13);
    tone(1174, now + 0.17, 0.13);
  } catch {
    /* ignore audio playback errors (autoplay policy, unsupported output, etc.) */
  }
}

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
  const [openedLeadIds, setOpenedLeadIds] = useState<Set<string>>(() => readStoredIdSet(OPENED_LEAD_IDS_STORAGE_KEY));
  const [unopenedNewLeadIds, setUnopenedNewLeadIds] = useState<Set<string>>(() => readStoredIdSet(UNOPENED_NEW_LEAD_IDS_STORAGE_KEY));
  const openedLeadIdsRef = useRef(openedLeadIds);
  const unopenedNewLeadIdsRef = useRef(unopenedNewLeadIds);
  const mutedLeadIdsRef = useRef<Set<string>>(new Set());
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

  const markLeadAsOpened = useCallback((leadId: string) => {
    mutedLeadIdsRef.current.delete(leadId);

    setOpenedLeadIds((prev) => {
      if (prev.has(leadId)) return prev;
      const next = new Set(prev);
      next.add(leadId);
      writeStoredIdSet(OPENED_LEAD_IDS_STORAGE_KEY, next);
      return next;
    });

    setUnopenedNewLeadIds((prev) => {
      if (!prev.has(leadId)) return prev;
      const next = new Set(prev);
      next.delete(leadId);
      writeStoredIdSet(UNOPENED_NEW_LEAD_IDS_STORAGE_KEY, next);
      return next;
    });
  }, []);

  const withLeadNewState = useCallback(
    (lead: Lead): Lead => {
      const opened = openedLeadIds.has(lead.id);
      const pendingNew = unopenedNewLeadIds.has(lead.id);
      const isNew = lead.stage === 'lead' && !opened && (Boolean(lead.isNew) || pendingNew);
      if (lead.isNew === isNew) return lead;
      return { ...lead, isNew };
    },
    [openedLeadIds, unopenedNewLeadIds],
  );

  const sourceLeads = USE_API ? apiLeads : leads;
  const activeLeads = useMemo(
    () => sourceLeads.map(withLeadNewState),
    [sourceLeads, withLeadNewState],
  );

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

  useEffect(() => {
    openedLeadIdsRef.current = openedLeadIds;
  }, [openedLeadIds]);

  useEffect(() => {
    unopenedNewLeadIdsRef.current = unopenedNewLeadIds;
  }, [unopenedNewLeadIds]);

  const handleLeadCreatedEvent = useCallback(
    (leadId: string) => {
      if (openedLeadIdsRef.current.has(leadId)) return;
      if (mutedLeadIdsRef.current.has(leadId)) return;
      if (unopenedNewLeadIdsRef.current.has(leadId)) return;

      setUnopenedNewLeadIds((prev) => {
        if (prev.has(leadId)) return prev;
        const next = new Set(prev);
        next.add(leadId);
        writeStoredIdSet(UNOPENED_NEW_LEAD_IDS_STORAGE_KEY, next);
        return next;
      });

      void leadsQuery.refetch();
      playLeadArrivalSound();
    },
    [leadsQuery.refetch],
  );

  useEffect(() => {
    if (!USE_API || typeof window === 'undefined') return;

    let stopped = false;
    let reconnectTimer: number | null = null;
    let abortController: AbortController | null = null;

    const scheduleReconnect = () => {
      if (stopped || reconnectTimer !== null) return;
      reconnectTimer = window.setTimeout(() => {
        reconnectTimer = null;
        void connect();
      }, LEADS_STREAM_RECONNECT_MS);
    };

    const connect = async () => {
      if (stopped) return;

      const token = window.localStorage.getItem(ACCESS_TOKEN_KEY);
      if (!token) {
        scheduleReconnect();
        return;
      }

      abortController = new AbortController();

      try {
        const response = await fetch(resolveLeadsStreamUrl(), {
          method: 'GET',
          headers: {
            Accept: 'text/event-stream',
            Authorization: `Bearer ${token}`,
          },
          cache: 'no-store',
          signal: abortController.signal,
        });

        if (!response.ok || !response.body) {
          throw new Error('Leads stream unavailable');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let buffer = '';

        while (!stopped) {
          const chunk = await reader.read();
          if (chunk.done) break;

          buffer += decoder.decode(chunk.value, { stream: true }).replace(/\r\n/g, '\n');
          let boundaryIndex = buffer.indexOf('\n\n');

          while (boundaryIndex !== -1) {
            const rawEvent = buffer.slice(0, boundaryIndex);
            buffer = buffer.slice(boundaryIndex + 2);

            const dataPayload = rawEvent
              .split('\n')
              .filter((line) => line.startsWith('data:'))
              .map((line) => line.slice(5).trimStart())
              .join('\n');

            if (dataPayload.length > 0) {
              try {
                const payload = JSON.parse(dataPayload) as { leadId?: string };
                if (typeof payload.leadId === 'string' && payload.leadId.length > 0) {
                  handleLeadCreatedEvent(payload.leadId);
                }
              } catch {
                // Ignore malformed stream payloads and keep subscription alive.
              }
            }

            boundaryIndex = buffer.indexOf('\n\n');
          }
        }

        reader.releaseLock();
      } catch {
        // Keep silent: connection recovery is handled by reconnect timer.
      } finally {
        abortController = null;
        if (!stopped) {
          scheduleReconnect();
        }
      }
    };

    void connect();

    return () => {
      stopped = true;
      if (abortController) {
        abortController.abort();
      }
      if (reconnectTimer !== null) {
        window.clearTimeout(reconnectTimer);
      }
    };
  }, [USE_API, handleLeadCreatedEvent]);

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

  const validateStageDrop = (lead: Lead, target: StageType): string | null => {
    if (lead.stage === 'lead' && target === 'application') {
      const missing: string[] = [];
      if (!lead.address?.trim()) missing.push('адрес');
      if (!lead.date) missing.push('дата');
      if (lead.hasNoContact || !lead.phone?.trim()) missing.push('контакт');

      if (missing.length > 0) {
        const targetLabel = IS_SALES_LITE ? 'работу' : 'заявку';
        return `Для перевода в ${targetLabel} заполните: ${missing.join(', ')}`;
      }
    }

    if (!IS_SALES_LITE && lead.stage === 'application' && target === 'reservation') {
      const linkedIds = USE_API ? apiLinkedIdsByLeadId.get(lead.id) : null;
      if (!linkedIds?.applicationId) {
        return 'Сначала должна быть создана заявка';
      }
      if (!linkedIds.reservationId) {
        return 'Сначала подготовьте бронь по готовой позиции заявки';
      }
    }

    return null;
  };

  const handleCardClick = (lead: Lead) => {
    if (lead.stage === 'lead') {
      markLeadAsOpened(lead.id);
    }

    if (IS_SALES_LITE && (lead.stage === 'completed' || lead.stage === 'unqualified')) {
      setSelectedLead(lead);
      setActiveEntityRoute('lead', lead.id);
      setIsDetailOpen(true);
      return;
    }

    const linkedIds = USE_API ? apiLinkedIdsByLeadId.get(lead.id) : null;

    const applicationId = lead.stage === 'application' ? linkedIds?.applicationId ?? null : null;
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

    if (applicationId) {
      setSelectedLead(null);
      setIsDetailOpen(false);
      setActiveEntityRoute('application', applicationId);
      return;
    }

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
      if (IS_SALES_LITE) return;
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
    mutedLeadIdsRef.current.add(leadId);
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
        if (IS_SALES_LITE) {
          setActiveSecondaryNav('leads');
          setFilters({ ...DEFAULT_LEADS_FILTERS, stage: 'application' });
          return;
        }
        setActiveSecondaryNav('view-needs-reservation');
        return;
      case 'departures_today':
        if (IS_SALES_LITE) return;
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
        if (IS_SALES_LITE) return;
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

    markLeadAsOpened(activeEntityId);

    if (USE_API) {
      if (!routedLeadQuery.data) return;
      setSelectedLead(withLeadNewState(toKanbanLead(routedLeadQuery.data)));
      setIsDetailOpen(true);
      return;
    }

    const localLead = activeLeads.find((item) => item.id === activeEntityId);
    if (!localLead) return;
    setSelectedLead(withLeadNewState(localLead));
    setIsDetailOpen(true);
  }, [
    activeEntityType,
    activeEntityId,
    activeLeads,
    markLeadAsOpened,
    routedLeadQuery.data,
    withLeadNewState,
  ]);

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
        <LeadsKanbanBoard
          leads={filteredLeads}
          onCardClick={handleCardClick}
          onAddLead={() => setIsNewLeadOpen(true)}
          validateStageDrop={validateStageDrop}
        />
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
        <DialogContent className="!max-w-none w-[calc(100vw-1rem)] h-[calc(100dvh-1rem)] sm:w-[96vw] sm:h-[92vh] p-0 gap-0 rounded-lg overflow-hidden [&>button]:hidden">
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
        <DialogContent className="!max-w-none w-[calc(100vw-1rem)] h-[calc(100dvh-1rem)] sm:w-[96vw] sm:h-[92vh] p-0 gap-0 rounded-lg overflow-hidden [&>button]:hidden">
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

