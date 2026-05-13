import { useEffect, useMemo, useState } from 'react';
import { Truck, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { cn } from '../ui/utils';
import { useLayout } from '../shell/layoutStore';
import { getModuleMeta } from '../shell/navConfig';
import { ListScaffold } from '../shell/ListScaffold';
import { SimpleToolbar } from '../shell/SimpleToolbar';
import { Dialog, DialogContent } from '../ui/dialog';
import { DepartureWorkspace } from './DepartureWorkspace';
import { ClientWorkspace } from '../client/ClientWorkspace';
import { mockLeads } from '../../data/mockLeads';
import type { Lead } from '../../types/kanban';
import { saveViewSnapshot } from '../../lib/viewSnapshots';
import { USE_API } from '../../lib/featureFlags';
import { useDepartureQuery, useDeparturesQuery } from '../../hooks/useDeparturesQuery';
import { toDepartureLead } from '../../lib/departureAdapter';

interface Filters {
  manager: string;
  status: 'all' | 'today' | 'soon' | 'overdue' | 'awaiting';
  equipment: string;
}
const DEFAULT: Filters = { manager: 'all', status: 'all', equipment: 'all' };

const STATUS_LABEL: Record<NonNullable<Lead['departureStatus']>, string> = {
  today: 'Сегодня',
  soon: 'Скоро',
  overdue: 'Просрочен',
  awaiting: 'Ожидается',
};
const STATUS_TONE: Record<NonNullable<Lead['departureStatus']>, string> = {
  today: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  soon: 'bg-sky-50 text-sky-700 border-sky-200',
  overdue: 'bg-rose-50 text-rose-700 border-rose-200',
  awaiting: 'bg-slate-50 text-slate-700 border-slate-200',
};

export function DeparturesWorkspacePage() {
  const {
    activeSecondaryNav,
    currentView,
    activeEntityType,
    activeEntityId,
    setActiveEntityRoute,
    clearActiveEntityRoute,
  } = useLayout();
  const meta = getModuleMeta(activeSecondaryNav);
  const departuresQuery = useDeparturesQuery({}, USE_API);
  const routedDepartureQuery = useDepartureQuery(
    activeEntityType === 'departure' ? activeEntityId : null,
    USE_API && activeEntityType === 'departure' && !!activeEntityId,
  );
  const [filters, setFilters] = useState<Filters>(DEFAULT);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Lead | null>(null);
  const [clientLead, setClientLead] = useState<Lead | null>(null);

  const effectiveView: 'list' | 'table' = currentView === 'table' ? 'table' : 'list';

  const apiRows = useMemo<Lead[]>(
    () => (departuresQuery.data?.items ?? []).map(toDepartureLead),
    [departuresQuery.data],
  );

  const sourceRows = useMemo(
    () => (USE_API ? apiRows : mockLeads.filter((l) => l.stage === 'departure')),
    [apiRows],
  );

  const aliasFiltered = useMemo(() => {
    switch (activeSecondaryNav) {
      case 'view-departures-today':
        return sourceRows.filter((l) => l.departureStatus === 'today');
      case 'view-overdue-departures':
        return sourceRows.filter((l) => l.departureStatus === 'overdue');
      default:
        return sourceRows;
    }
  }, [activeSecondaryNav, sourceRows]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return aliasFiltered.filter((l) => {
      if (filters.manager !== 'all' && l.manager !== filters.manager) return false;
      if (filters.status !== 'all' && l.departureStatus !== filters.status) return false;
      if (
        filters.equipment !== 'all' &&
        !(l.equipmentType || '').toLowerCase().includes(filters.equipment.toLowerCase())
      )
        return false;
      if (q) {
        const hay = [l.client, l.company, l.phone, l.equipmentType, l.address, l.manager]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [aliasFiltered, filters, query]);

  const hasActive =
    filters.manager !== 'all' ||
    filters.status !== 'all' ||
    filters.equipment !== 'all' ||
    query.length > 0;

  const managers = Array.from(new Set(sourceRows.map((l) => l.manager))).sort();

  const handleOpenDeparture = (departure: Lead) => {
    setSelected(departure);
    setActiveEntityRoute('departure', departure.id);
  };

  const handleCloseDeparture = () => {
    setSelected(null);
    clearActiveEntityRoute();
  };

  useEffect(() => {
    if (activeEntityType !== 'departure' || !activeEntityId) return;

    if (USE_API) {
      if (!routedDepartureQuery.data) return;
      setSelected(toDepartureLead(routedDepartureQuery.data));
      return;
    }

    const localDeparture = sourceRows.find((row) => row.id === activeEntityId);
    if (!localDeparture) return;
    setSelected(localDeparture);
  }, [
    activeEntityType,
    activeEntityId,
    sourceRows,
    routedDepartureQuery.data,
  ]);

  const handleSaveView = () => {
    void saveViewSnapshot({
      moduleId: activeSecondaryNav,
      view: effectiveView,
      query,
      filters,
    });
  };

  const toolbar = (
    <SimpleToolbar
      searchPlaceholder={meta.searchPlaceholder}
      query={query}
      onQueryChange={setQuery}
      filters={[
        {
          id: 'status',
          value: filters.status,
          placeholder: 'Статус',
          width: 120,
          options: [
            { value: 'all', label: 'Все статусы' },
            { value: 'today', label: 'Сегодня' },
            { value: 'soon', label: 'Скоро' },
            { value: 'overdue', label: 'Просрочен' },
            { value: 'awaiting', label: 'Ожидается' },
          ],
          onChange: (v) => setFilters((p) => ({ ...p, status: v as Filters['status'] })),
        },
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
          id: 'equipment',
          value: filters.equipment,
          placeholder: 'Тип техники',
          width: 130,
          options: [
            { value: 'all', label: 'Все типы' },
            { value: 'Экскаватор', label: 'Экскаватор' },
            { value: 'Бульдозер', label: 'Бульдозер' },
            { value: 'Кран', label: 'Кран' },
            { value: 'Погрузчик', label: 'Погрузчик' },
          ],
          onChange: (v) => setFilters((p) => ({ ...p, equipment: v })),
        },
      ]}
      hasActive={hasActive}
      onReset={() => {
        setFilters(DEFAULT);
        setQuery('');
      }}
      onSaveView={handleSaveView}
    />
  );

  return (
    <ListScaffold toolbar={toolbar}>
      {USE_API && departuresQuery.isPending && !departuresQuery.data ? (
        <div className="flex flex-1 items-center justify-center p-10 text-[13px] text-muted-foreground">
          Загрузка выездов...
        </div>
      ) : null}

      {USE_API && departuresQuery.isError && !departuresQuery.data ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 p-10 text-[13px] text-muted-foreground">
          <span>{departuresQuery.error instanceof Error ? departuresQuery.error.message : 'Не удалось загрузить выезды'}</span>
        </div>
      ) : null}

      {(USE_API && (departuresQuery.isPending || departuresQuery.isError) && !departuresQuery.data) ? null : filtered.length === 0 ? (
        <div className="flex flex-1 items-center justify-center p-10 text-[13px] text-muted-foreground">
          Выезды не найдены
        </div>
      ) : effectiveView === 'list' ? (
        <DeparturesListView rows={filtered} onRowClick={handleOpenDeparture} />
      ) : (
        <DeparturesTableView rows={filtered} onRowClick={handleOpenDeparture} />
      )}

      <Dialog open={!!selected} onOpenChange={(o) => !o && handleCloseDeparture()}>
        <DialogContent className="!max-w-none w-[calc(100vw-1rem)] h-[calc(100dvh-1rem)] sm:w-[96vw] sm:h-[92vh] p-0 gap-0 rounded-lg overflow-hidden [&>button]:hidden">
          {selected ? (
            <DepartureWorkspace
              lead={selected}
              apiDepartureId={USE_API ? selected.id : undefined}
              onClose={handleCloseDeparture}
              onOpenClient={setClientLead}
            />
          ) : null}
        </DialogContent>
      </Dialog>
      <Dialog open={!!clientLead} onOpenChange={(o) => !o && setClientLead(null)}>
        <DialogContent className="!max-w-none w-[calc(100vw-1rem)] h-[calc(100dvh-1rem)] sm:w-[96vw] sm:h-[92vh] p-0 gap-0 rounded-lg overflow-hidden [&>button]:hidden">
          {clientLead ? <ClientWorkspace lead={clientLead} onClose={() => setClientLead(null)} /> : null}
        </DialogContent>
      </Dialog>
    </ListScaffold>
  );
}

function StatusBadge({ status }: { status?: NonNullable<Lead['departureStatus']> }) {
  if (!status) return <span className="text-muted-foreground">—</span>;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px]',
        STATUS_TONE[status],
      )}
    >
      {status === 'overdue' ? (
        <AlertTriangle className="h-3 w-3" />
      ) : status === 'today' ? (
        <CheckCircle2 className="h-3 w-3" />
      ) : (
        <Truck className="h-3 w-3" />
      )}
      {STATUS_LABEL[status]}
    </span>
  );
}

function DeparturesListView({ rows, onRowClick }: { rows: Lead[]; onRowClick: (l: Lead) => void }) {
  const today = rows.filter((l) => l.departureStatus === 'today');
  const overdue = rows.filter((l) => l.departureStatus === 'overdue');
  const soon = rows.filter((l) => l.departureStatus === 'soon');
  const awaiting = rows.filter(
    (l) => !l.departureStatus || l.departureStatus === 'awaiting',
  );
  const groups = [
    { id: 'overdue', label: 'Просроченные', dotCls: 'bg-rose-500', rows: overdue },
    { id: 'today', label: 'Сегодня', dotCls: 'bg-emerald-500', rows: today },
    { id: 'soon', label: 'Скоро', dotCls: 'bg-sky-500', rows: soon },
    { id: 'awaiting', label: 'Ожидается', dotCls: 'bg-slate-400', rows: awaiting },
  ].filter((g) => g.rows.length > 0);

  return (
    <div className="min-h-0 flex-1 overflow-auto">
      {groups.map((g) => (
        <div key={g.id}>
          <div className="sticky top-0 z-10 flex items-center gap-2 border-y border-border/60 bg-muted/30 px-4 py-1.5 text-[11px] font-medium text-foreground/80">
            <span className={cn('h-2 w-2 rounded-full', g.dotCls)} />
            {g.label}
            <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
              {g.rows.length}
            </span>
          </div>
          <table className="w-full min-w-[1000px] border-collapse text-[12px]">
            <tbody>
              {g.rows.map((l) => (
                <tr
                  key={l.id}
                  onClick={() => onRowClick(l)}
                  className="cursor-pointer border-b border-border/40 hover:bg-muted/30"
                >
                  <td className="px-4 py-2.5 w-[180px]">
                    <div className="truncate font-medium text-foreground">DEP-{l.id.padStart(5, '0')}</div>
                    <div className="truncate text-[11px] text-muted-foreground">
                      {l.company ?? l.client}
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <StatusBadge status={l.departureStatus} />
                  </td>
                  <td className="px-3 py-2.5 text-foreground/80">{l.equipmentType}</td>
                  <td className="px-3 py-2.5 text-muted-foreground">
                    {l.date}
                    {l.timeWindow ? ` · ${l.timeWindow}` : ''}
                  </td>
                  <td className="px-3 py-2.5 text-muted-foreground">{l.address ?? '—'}</td>
                  <td className="px-3 py-2.5 text-foreground/80">{l.manager}</td>
                  <td className="px-3 py-2.5 text-right text-muted-foreground">{l.lastActivity}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}

function DeparturesTableView({ rows, onRowClick }: { rows: Lead[]; onRowClick: (l: Lead) => void }) {
  return (
    <div className="min-h-0 flex-1 overflow-auto">
      <table className="w-full min-w-[1100px] border-collapse text-[12px]">
        <thead className="sticky top-0 z-10 bg-white">
          <tr className="border-b border-border/60 text-[11px] uppercase tracking-wide text-muted-foreground">
            <th className="px-4 py-2 text-left font-medium">Выезд · Клиент</th>
            <th className="px-3 py-2 text-left font-medium">Статус</th>
            <th className="px-3 py-2 text-left font-medium">Техника</th>
            <th className="px-3 py-2 text-left font-medium">Единица / подрядчик</th>
            <th className="px-3 py-2 text-left font-medium">Дата / окно</th>
            <th className="px-3 py-2 text-left font-medium">Адрес</th>
            <th className="px-3 py-2 text-left font-medium">Менеджер</th>
            <th className="px-3 py-2 text-left font-medium">Обновлено</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((l) => (
            <tr
              key={l.id}
              onClick={() => onRowClick(l)}
              className="cursor-pointer border-b border-border/40 hover:bg-muted/30"
            >
              <td className="px-4 py-2.5">
                <div className="truncate font-medium text-foreground">
                  DEP-{l.id.padStart(5, '0')}
                </div>
                <div className="truncate text-[11px] text-muted-foreground">
                  {l.company ?? l.client}
                </div>
              </td>
              <td className="px-3 py-2.5">
                <StatusBadge status={l.departureStatus} />
              </td>
              <td className="px-3 py-2.5 text-foreground/80">{l.equipmentType}</td>
              <td className="px-3 py-2.5 text-muted-foreground">
                {l.equipmentUnit ?? l.subcontractor ?? '—'}
              </td>
              <td className="px-3 py-2.5 text-muted-foreground">
                {l.date}
                {l.timeWindow ? ` · ${l.timeWindow}` : ''}
              </td>
              <td className="px-3 py-2.5 text-muted-foreground">{l.address ?? '—'}</td>
              <td className="px-3 py-2.5 text-foreground/80">{l.manager}</td>
              <td className="px-3 py-2.5 text-muted-foreground">{l.lastActivity}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
