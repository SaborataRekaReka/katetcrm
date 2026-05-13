import { useState } from 'react';
import { Search, X, Bookmark } from 'lucide-react';
import type { Lead } from '../../types/kanban';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Input } from '../ui/input';
import { useLayout } from './layoutStore';
import { getModuleMeta } from './navConfig';
import { DEFAULT_LEADS_FILTERS, LeadsFiltersState } from './filterTypes';
import {
  LIST_TOOLBAR_BAR,
  LIST_TOOLBAR_SEARCH_INPUT,
  LIST_TOOLBAR_SEARCH_WRAP,
  LIST_TOOLBAR_TRIGGER,
  LIST_TOOLBAR_UTILITY_GROUP,
  ToolbarDivider,
  ToolbarToggle,
  ToolbarUtilityButton,
} from './listToolbarPrimitives';

interface LeadsToolbarProps {
  filters?: LeadsFiltersState;
  onFiltersChange?: (next: LeadsFiltersState) => void;
  query?: string;
  onQueryChange?: (q: string) => void;
  onSaveView?: () => void;
  managerOptions?: { value: string; label: string }[];
  /** Show a stage filter (used in table view for funnel context). */
  showStageFilter?: boolean;
}

const DEFAULT_MANAGER_OPTIONS: { value: string; label: string }[] = [
  { value: 'Петров А.', label: 'Петров А.' },
  { value: 'Сидоров Б.', label: 'Сидоров Б.' },
  { value: 'Иванова С.', label: 'Иванова С.' },
];

export function LeadsToolbar({
  filters: filtersProp,
  onFiltersChange,
  query: queryProp,
  onQueryChange,
  onSaveView,
  managerOptions,
  showStageFilter,
}: LeadsToolbarProps = {}) {
  const { activeSecondaryNav } = useLayout();
  const meta = getModuleMeta(activeSecondaryNav);

  const [localFilters, setLocalFilters] = useState<LeadsFiltersState>(DEFAULT_LEADS_FILTERS);
  const [localQuery, setLocalQuery] = useState('');

  const filters = filtersProp ?? localFilters;
  const query = queryProp ?? localQuery;
  const effectiveManagerOptions = managerOptions ?? DEFAULT_MANAGER_OPTIONS;

  const updateFilters = (next: LeadsFiltersState) => {
    if (onFiltersChange) onFiltersChange(next);
    else setLocalFilters(next);
  };
  const updateQuery = (q: string) => {
    if (onQueryChange) onQueryChange(q);
    else setLocalQuery(q);
  };

  const setField = <K extends keyof LeadsFiltersState>(key: K, value: LeadsFiltersState[K]) =>
    updateFilters({ ...filters, [key]: value });

  const hasActive =
    filters.scope !== 'all' ||
    filters.manager !== 'all' ||
    filters.source !== 'all' ||
    filters.equipment !== 'all' ||
    filters.stage !== 'all' ||
    filters.urgent ||
    filters.duplicates ||
    filters.stale ||
    query.length > 0;

  const reset = () => {
    updateFilters(DEFAULT_LEADS_FILTERS);
    updateQuery('');
  };

  return (
    <div className={LIST_TOOLBAR_BAR}>
      <div className={LIST_TOOLBAR_SEARCH_WRAP}>
        <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          data-crm-search-input="true"
          value={query}
          onChange={(e) => updateQuery(e.target.value)}
          placeholder={meta.searchPlaceholder}
          className={LIST_TOOLBAR_SEARCH_INPUT}
        />
      </div>

      <Select value={filters.scope} onValueChange={(v) => setField('scope', v as 'all' | 'my')}>
        <SelectTrigger className={`${LIST_TOOLBAR_TRIGGER} w-[80px]`}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Все</SelectItem>
          <SelectItem value="my">Мои</SelectItem>
        </SelectContent>
      </Select>

      <Select value={filters.manager} onValueChange={(v) => setField('manager', v)}>
        <SelectTrigger className={`${LIST_TOOLBAR_TRIGGER} w-[120px]`}>
          <SelectValue placeholder="Менеджер" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Все менеджеры</SelectItem>
          {effectiveManagerOptions.map((manager) => (
            <SelectItem key={manager.value} value={manager.value}>
              {manager.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={filters.source} onValueChange={(v) => setField('source', v)}>
        <SelectTrigger className={`${LIST_TOOLBAR_TRIGGER} w-[110px]`}>
          <SelectValue placeholder="Источник" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Все источники</SelectItem>
          <SelectItem value="site">Сайт</SelectItem>
          <SelectItem value="mango">Mango</SelectItem>
          <SelectItem value="telegram">Telegram</SelectItem>
          <SelectItem value="max">MAX</SelectItem>
          <SelectItem value="manual">Ручной</SelectItem>
        </SelectContent>
      </Select>

      <Select value={filters.equipment} onValueChange={(v) => setField('equipment', v)}>
        <SelectTrigger className={`${LIST_TOOLBAR_TRIGGER} w-[120px]`}>
          <SelectValue placeholder="Тип техники" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Все типы</SelectItem>
          <SelectItem value="Экскаватор">Экскаватор</SelectItem>
          <SelectItem value="Бульдозер">Бульдозер</SelectItem>
          <SelectItem value="Кран">Кран</SelectItem>
          <SelectItem value="Погрузчик">Погрузчик</SelectItem>
        </SelectContent>
      </Select>

      {showStageFilter ? (
        <Select value={filters.stage} onValueChange={(v) => setField('stage', v)}>
          <SelectTrigger className={`${LIST_TOOLBAR_TRIGGER} w-[120px]`}>
            <SelectValue placeholder="Стадия" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все стадии</SelectItem>
            <SelectItem value="lead">Лид</SelectItem>
            <SelectItem value="application">Заявка</SelectItem>
            <SelectItem value="reservation">Бронь</SelectItem>
            <SelectItem value="departure">Выезд</SelectItem>
            <SelectItem value="completed">Завершено</SelectItem>
            <SelectItem value="unqualified">Некачественный</SelectItem>
          </SelectContent>
        </Select>
      ) : null}

      <ToolbarDivider />

      <ToolbarToggle
        label="Срочные"
        active={filters.urgent}
        onClick={() => setField('urgent', !filters.urgent)}
      />
      <ToolbarToggle
        label="Дубли"
        active={filters.duplicates}
        onClick={() => setField('duplicates', !filters.duplicates)}
      />
      <ToolbarToggle
        label="Зависшие"
        active={filters.stale}
        onClick={() => setField('stale', !filters.stale)}
      />

      <div className={LIST_TOOLBAR_UTILITY_GROUP}>
        {hasActive && (
          <ToolbarUtilityButton
            label="Сбросить"
            icon={<X className="h-3.5 w-3.5" />}
            onClick={reset}
          />
        )}
        {onSaveView ? (
          <ToolbarUtilityButton
            label="Сохранить вид"
            icon={<Bookmark className="h-3.5 w-3.5" />}
            iconOnlyOnNarrow
            onClick={onSaveView}
          />
        ) : null}
      </div>
    </div>
  );
}

/** Filter a Lead list using the shared LeadsFiltersState + free-text query. */
export function applyLeadsFilters(
  leads: Lead[],
  filters: LeadsFiltersState,
  query: string,
  options: { skipManagerFilter?: boolean } = {},
): Lead[] {
  const q = query.trim().toLowerCase();
  const skipManagerFilter = options.skipManagerFilter ?? false;

  return leads.filter((l) => {
    if (filters.stage !== 'all' && l.stage !== filters.stage) return false;
    if (!skipManagerFilter && filters.manager !== 'all' && l.manager !== filters.manager) return false;
    if (filters.source !== 'all' && (l.sourceChannel ?? '') !== filters.source) return false;
    if (filters.equipment !== 'all' && !(l.equipmentType || '').toLowerCase().includes(filters.equipment.toLowerCase())) return false;
    if (filters.urgent && !l.isUrgent) return false;
    if (filters.duplicates && !l.isDuplicate) return false;
    if (filters.stale && !l.isStale) return false;
    if (q) {
      const hay = [l.client, l.company, l.phone, l.equipmentType, l.address, l.manager, l.source]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}
