import { useEffect, useMemo, useState } from 'react';
import { useLayout } from '../shell/layoutStore';
import { getModuleMeta } from '../shell/navConfig';
import { ListScaffold } from '../shell/ListScaffold';
import { SimpleToolbar } from '../shell/SimpleToolbar';
import { Dialog, DialogContent } from '../ui/dialog';
import { ClientWorkspace } from './ClientWorkspace';
import { ClientsListView } from '../views/ClientsListView';
import { ClientsCardsView } from '../views/ClientsCardsView';
import { mockClientsList, type ClientsListItem } from '../../data/mockClientsList';
import type { Lead } from '../../types/kanban';
import { USE_API } from '../../lib/featureFlags';
import { useClientsQuery } from '../../hooks/useClientsQuery';
import { toClientsListItems } from '../../lib/clientAdapter';
import { useRegisterPrimaryCta } from '../shell/primaryCtaStore';
import { NewClientDialog } from './NewClientDialog';
import { saveViewSnapshot } from '../../lib/viewSnapshots';

/**
 * Clients = one entity module with saved views (ClickUp pattern):
 *   view type:  list · cards   (WorkspaceHeader tabs → URL `?view=list|cards`)
 *   preset:     all · new · repeat · vip · debt   (EntityPresetTabs → URL `?preset=<id>`)
 *   toolbar:    search · manager · type · reset · save-view (when dirty)
 * These three axes are kept as separate UI rows so users can read each level
 * independently.
 */

type PresetId = 'all' | 'new' | 'repeat' | 'vip' | 'debt';

interface Filters {
  manager: string;
  type: 'all' | 'company' | 'person';
}

const DEFAULT_FILTERS: Filters = { manager: 'all', type: 'all' };

function applyPreset(preset: PresetId, rows: ClientsListItem[]): ClientsListItem[] {
  switch (preset) {
    case 'new':
      return rows.filter((c) => c.tags.includes('new'));
    case 'repeat':
      return rows.filter((c) => c.tags.includes('repeat'));
    case 'vip':
      return rows.filter((c) => c.tags.includes('vip'));
    case 'debt':
      return rows.filter((c) => c.tags.includes('debt'));
    default:
      return rows;
  }
}

function presetFromSecondary(secondaryId: string): PresetId {
  switch (secondaryId) {
    case 'clients-new':
      return 'new';
    case 'clients-repeat':
      return 'repeat';
    case 'clients-vip':
      return 'vip';
    case 'clients-debt':
      return 'debt';
    default:
      return 'all';
  }
}

export function ClientsWorkspacePage() {
  const {
    activeSecondaryNav,
    currentView,
    activeEntityType,
    activeEntityId,
    setActiveEntityRoute,
    clearActiveEntityRoute,
  } = useLayout();
  const meta = getModuleMeta(activeSecondaryNav);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [query, setQuery] = useState('');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [isNewClientOpen, setIsNewClientOpen] = useState(false);

  useRegisterPrimaryCta(
    activeSecondaryNav,
    USE_API ? () => setIsNewClientOpen(true) : null,
  );

  const preset = presetFromSecondary(activeSecondaryNav);
  const clientsQuery = useClientsQuery({ take: 200 }, USE_API);
  const isPending = USE_API && clientsQuery.isPending && !clientsQuery.data;
  const isError = USE_API && clientsQuery.isError && !clientsQuery.data;

  const effectiveView: 'list' | 'cards' = currentView === 'cards' ? 'cards' : 'list';

  // Источник: projected API (агрегаты+tags считаются бэком) либо mock.
  const sourceRows: ClientsListItem[] = useMemo(() => {
    if (USE_API) {
      return clientsQuery.data ? toClientsListItems(clientsQuery.data.items) : [];
    }
    return mockClientsList;
  }, [clientsQuery.data]);

  const presetRows = useMemo(() => applyPreset(preset, sourceRows), [preset, sourceRows]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return presetRows.filter((c) => {
      if (filters.manager !== 'all' && c.manager !== filters.manager) return false;
      if (filters.type !== 'all' && c.type !== filters.type) return false;
      if (q) {
        const hay = [c.name, c.company, c.phone, c.manager, c.id]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [presetRows, filters, query]);

  const hasActive = filters.manager !== 'all' || filters.type !== 'all' || query.length > 0;

  const reset = () => {
    setFilters(DEFAULT_FILTERS);
    setQuery('');
  };

  const handleSaveView = () => {
    void saveViewSnapshot({
      moduleId: activeSecondaryNav,
      view: effectiveView,
      query,
      filters,
      preset,
    });
  };

  const managers = Array.from(new Set(sourceRows.map((c) => c.manager))).sort();

  const openClient = (clientId: string, leadSeed?: Lead | null) => {
    setSelectedClientId(clientId);
    setSelectedLead(leadSeed ?? null);
    setActiveEntityRoute('client', clientId);
  };

  const closeClient = () => {
    setSelectedLead(null);
    setSelectedClientId(null);
    clearActiveEntityRoute();
  };

  useEffect(() => {
    if (activeEntityType !== 'client' || !activeEntityId) return;
    if (selectedClientId === activeEntityId) return;

    const matched = sourceRows.find((row) => row.id === activeEntityId);
    setSelectedLead(matched?.sourceLead ?? null);
    setSelectedClientId(activeEntityId);
  }, [activeEntityType, activeEntityId, selectedClientId, sourceRows]);

  const toolbar = (
      <SimpleToolbar
      searchPlaceholder={meta.searchPlaceholder}
      query={query}
      onQueryChange={setQuery}
      filters={[
        {
          id: 'manager',
          value: filters.manager,
          placeholder: 'Менеджер',
          width: 130,
          options: [
            { value: 'all', label: 'Все менеджеры' },
            ...managers.map((m) => ({ value: m, label: m })),
          ],
          onChange: (v) => setFilters((p) => ({ ...p, manager: v })),
        },
        {
          id: 'type',
          value: filters.type,
          placeholder: 'Тип',
          width: 110,
          options: [
            { value: 'all', label: 'Все типы' },
            { value: 'company', label: 'Компания' },
            { value: 'person', label: 'Физлицо' },
          ],
          onChange: (v) => setFilters((p) => ({ ...p, type: v as Filters['type'] })),
        },
      ]}
        hasActive={hasActive}
        onReset={reset}
        onSaveView={handleSaveView}
      />
  );

  return (
    <ListScaffold toolbar={toolbar}>
      {isPending ? (
        <div className="px-4 py-6 text-[12px] text-muted-foreground">Загружаем клиентов...</div>
      ) : isError ? (
        <div className="px-4 py-6 text-[12px] text-rose-700">
          {clientsQuery.error instanceof Error ? clientsQuery.error.message : 'Не удалось загрузить клиентов.'}
        </div>
      ) : effectiveView === 'list' ? (
        <ClientsListView rows={filtered} onRowClick={(c) => openClient(c.id, c.sourceLead)} />
      ) : (
        <ClientsCardsView rows={filtered} onCardClick={(c) => openClient(c.id, c.sourceLead)} />
      )}

      <Dialog open={!!selectedClientId} onOpenChange={(open) => !open && closeClient()}>
        <DialogContent className="!max-w-none w-[calc(100vw-1rem)] h-[calc(100dvh-1rem)] sm:w-[96vw] sm:h-[92vh] p-0 gap-0 rounded-lg overflow-hidden [&>button]:hidden">
          {selectedClientId ? (
            <ClientWorkspace
              lead={selectedLead ?? undefined}
              onClose={closeClient}
              apiClientId={USE_API ? selectedClientId : undefined}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      <NewClientDialog open={isNewClientOpen} onOpenChange={setIsNewClientOpen} />
    </ListScaffold>
  );
}
