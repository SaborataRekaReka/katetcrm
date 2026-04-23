import { useMemo, useState } from 'react';
import { CheckCircle2, FileText } from 'lucide-react';
import { cn } from '../ui/utils';
import { useLayout } from '../shell/layoutStore';
import { getModuleMeta } from '../shell/navConfig';
import { ListScaffold } from '../shell/ListScaffold';
import { SimpleToolbar } from '../shell/SimpleToolbar';
import { Dialog, DialogContent } from '../ui/dialog';
import { CompletionWorkspace } from './CompletionWorkspace';
import { ClientWorkspace } from '../client/ClientWorkspace';
import { mockLeads } from '../../data/mockLeads';
import type { Lead } from '../../types/kanban';

interface Filters {
  manager: string;
  completion: 'all' | 'with' | 'without';
  equipment: string;
}
const DEFAULT: Filters = { manager: 'all', completion: 'all', equipment: 'all' };

export function CompletionWorkspacePage() {
  const { activeSecondaryNav, currentView } = useLayout();
  const meta = getModuleMeta(activeSecondaryNav);
  const [filters, setFilters] = useState<Filters>(DEFAULT);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Lead | null>(null);
  const [clientLead, setClientLead] = useState<Lead | null>(null);

  const effectiveView: 'list' | 'table' = currentView === 'table' ? 'table' : 'list';

  // Under «Completion» we show records in the completed terminal state; the
  // saved view «no-completion» surfaces ones missing completion artifacts.
  const baseRows = useMemo(
    () => mockLeads.filter((l) => l.stage === 'completed' || l.stage === 'departure'),
    [],
  );

  const aliasFiltered = useMemo(() => {
    if (activeSecondaryNav === 'view-no-completion') {
      return baseRows.filter((l) => !l.completionDate);
    }
    if (activeSecondaryNav === 'completion') {
      return baseRows.filter((l) => l.stage === 'completed');
    }
    return baseRows;
  }, [activeSecondaryNav, baseRows]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return aliasFiltered.filter((l) => {
      if (filters.manager !== 'all' && l.manager !== filters.manager) return false;
      if (filters.completion === 'with' && !l.completionDate) return false;
      if (filters.completion === 'without' && l.completionDate) return false;
      if (
        filters.equipment !== 'all' &&
        !(l.equipmentType || '').toLowerCase().includes(filters.equipment.toLowerCase())
      )
        return false;
      if (q) {
        const hay = [l.client, l.company, l.phone, l.equipmentType, l.address, l.manager, l.completionReason]
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
    filters.completion !== 'all' ||
    filters.equipment !== 'all' ||
    query.length > 0;

  const managers = Array.from(new Set(baseRows.map((l) => l.manager))).sort();

  const toolbar = (
    <SimpleToolbar
      searchPlaceholder={meta.searchPlaceholder}
      query={query}
      onQueryChange={setQuery}
      filters={[
        {
          id: 'completion',
          value: filters.completion,
          placeholder: 'Акт',
          width: 140,
          options: [
            { value: 'all', label: 'Все' },
            { value: 'with', label: 'С завершением' },
            { value: 'without', label: 'Без завершения' },
          ],
          onChange: (v) => setFilters((p) => ({ ...p, completion: v as Filters['completion'] })),
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
      onSaveView={() => {}}
    />
  );

  return (
    <ListScaffold toolbar={toolbar}>
      {filtered.length === 0 ? (
        <div className="flex flex-1 items-center justify-center p-10 text-[13px] text-muted-foreground">
          Записей не найдено
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-auto">
          <table className={cn('w-full border-collapse text-[12px]', effectiveView === 'table' ? 'min-w-[1100px]' : 'min-w-[900px]')}>
            <thead className="sticky top-0 z-10 bg-white">
              <tr className="border-b border-border/60 text-[11px] uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-2 text-left font-medium">Завершение · Клиент</th>
                <th className="px-3 py-2 text-left font-medium">Акт</th>
                <th className="px-3 py-2 text-left font-medium">Техника</th>
                <th className="px-3 py-2 text-left font-medium">Дата завершения</th>
                {effectiveView === 'table' ? (
                  <>
                    <th className="px-3 py-2 text-left font-medium">Причина</th>
                    <th className="px-3 py-2 text-left font-medium">Адрес</th>
                  </>
                ) : null}
                <th className="px-3 py-2 text-left font-medium">Менеджер</th>
                <th className="px-3 py-2 text-left font-medium">Обновлено</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((l) => (
                <tr
                  key={l.id}
                  onClick={() => setSelected(l)}
                  className="cursor-pointer border-b border-border/40 hover:bg-muted/30"
                >
                  <td className="px-4 py-2.5">
                    <div className="truncate font-medium text-foreground">
                      CMP-{l.id.padStart(5, '0')}
                    </div>
                    <div className="truncate text-[11px] text-muted-foreground">
                      {l.company ?? l.client}
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    {l.completionDate ? (
                      <span className="inline-flex items-center gap-1 rounded border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[10px] text-emerald-700">
                        <CheckCircle2 className="h-3 w-3" />
                        Закрыт
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] text-amber-700">
                        <FileText className="h-3 w-3" />
                        Нужен акт
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-foreground/80">{l.equipmentType}</td>
                  <td className="px-3 py-2.5 text-muted-foreground">
                    {l.completionDate ?? '—'}
                  </td>
                  {effectiveView === 'table' ? (
                    <>
                      <td className="px-3 py-2.5 text-muted-foreground">
                        {l.completionReason ?? '—'}
                      </td>
                      <td className="px-3 py-2.5 text-muted-foreground">{l.address ?? '—'}</td>
                    </>
                  ) : null}
                  <td className="px-3 py-2.5 text-foreground/80">{l.manager}</td>
                  <td className="px-3 py-2.5 text-muted-foreground">{l.lastActivity}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="!max-w-none w-[96vw] h-[92vh] p-0 gap-0 rounded-lg overflow-hidden [&>button]:hidden">
          {selected ? (
            <CompletionWorkspace
              lead={selected}
              onClose={() => setSelected(null)}
              onOpenClient={setClientLead}
            />
          ) : null}
        </DialogContent>
      </Dialog>
      <Dialog open={!!clientLead} onOpenChange={(o) => !o && setClientLead(null)}>
        <DialogContent className="!max-w-none w-[96vw] h-[92vh] p-0 gap-0 rounded-lg overflow-hidden [&>button]:hidden">
          {clientLead ? <ClientWorkspace lead={clientLead} onClose={() => setClientLead(null)} /> : null}
        </DialogContent>
      </Dialog>
    </ListScaffold>
  );
}
