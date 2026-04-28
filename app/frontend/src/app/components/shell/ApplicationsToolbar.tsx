import { useState } from 'react';
import { Search, X, Bookmark } from 'lucide-react';
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
import {
  DEFAULT_APPLICATIONS_FILTERS,
  ApplicationsFiltersState,
} from './filterTypes';
import {
  LIST_TOOLBAR_BAR,
  LIST_TOOLBAR_SEARCH_INPUT,
  LIST_TOOLBAR_TRIGGER,
  ToolbarDivider,
  ToolbarToggle,
  ToolbarUtilityButton,
} from './listToolbarPrimitives';

interface ApplicationsToolbarProps {
  filters?: ApplicationsFiltersState;
  onFiltersChange?: (next: ApplicationsFiltersState) => void;
  query?: string;
  onQueryChange?: (q: string) => void;
  onSaveView?: () => void;
}

export function ApplicationsToolbar({
  filters: filtersProp,
  onFiltersChange,
  query: queryProp,
  onQueryChange,
  onSaveView,
}: ApplicationsToolbarProps) {
  const { activeSecondaryNav } = useLayout();
  const meta = getModuleMeta(activeSecondaryNav);

  const [localFilters, setLocalFilters] = useState<ApplicationsFiltersState>(
    DEFAULT_APPLICATIONS_FILTERS,
  );
  const [localQuery, setLocalQuery] = useState('');

  const filters = filtersProp ?? localFilters;
  const query = queryProp ?? localQuery;

  const updateFilters = (next: ApplicationsFiltersState) => {
    if (onFiltersChange) onFiltersChange(next);
    else setLocalFilters(next);
  };
  const updateQuery = (q: string) => {
    if (onQueryChange) onQueryChange(q);
    else setLocalQuery(q);
  };
  const setField = <K extends keyof ApplicationsFiltersState>(
    key: K,
    value: ApplicationsFiltersState[K],
  ) => updateFilters({ ...filters, [key]: value });

  const hasActive =
    filters.scope !== 'all' ||
    filters.manager !== 'all' ||
    filters.status !== 'all' ||
    filters.sourcing !== 'all' ||
    filters.equipment !== 'all' ||
    filters.readinessReservation !== 'all' ||
    filters.readyForDeparture ||
    filters.conflict ||
    query.length > 0;

  const reset = () => {
    updateFilters(DEFAULT_APPLICATIONS_FILTERS);
    updateQuery('');
  };

  return (
    <div className={LIST_TOOLBAR_BAR}>
      <div className="relative w-[220px] shrink-0">
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
          <SelectItem value="Петров А.">Петров А.</SelectItem>
          <SelectItem value="Сидоров Б.">Сидоров Б.</SelectItem>
          <SelectItem value="Иванова С.">Иванова С.</SelectItem>
        </SelectContent>
      </Select>

      <Select value={filters.status} onValueChange={(v) => setField('status', v)}>
        <SelectTrigger className={`${LIST_TOOLBAR_TRIGGER} w-[120px]`}>
          <SelectValue placeholder="Статус" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Все статусы</SelectItem>
          <SelectItem value="application">В работе</SelectItem>
          <SelectItem value="reservation">Бронь</SelectItem>
          <SelectItem value="departure">Выезд</SelectItem>
          <SelectItem value="completed">Завершена</SelectItem>
          <SelectItem value="cancelled">Отменена</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={filters.readinessReservation}
        onValueChange={(v) =>
          setField('readinessReservation', v as ApplicationsFiltersState['readinessReservation'])
        }
      >
        <SelectTrigger className={`${LIST_TOOLBAR_TRIGGER} w-[140px]`}>
          <SelectValue placeholder="Готовность" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Готовность: все</SelectItem>
          <SelectItem value="ready">Готовы к брони</SelectItem>
          <SelectItem value="waiting">Частично</SelectItem>
          <SelectItem value="no_data">Без брони</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={filters.sourcing}
        onValueChange={(v) => setField('sourcing', v as ApplicationsFiltersState['sourcing'])}
      >
        <SelectTrigger className={`${LIST_TOOLBAR_TRIGGER} w-[140px]`}>
          <SelectValue placeholder="Источник техники" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Парк + подрядчик</SelectItem>
          <SelectItem value="own">Свой парк</SelectItem>
          <SelectItem value="subcontractor">Подрядчик</SelectItem>
          <SelectItem value="undecided">Не выбран</SelectItem>
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

      <ToolbarDivider />

      <ToolbarToggle
        label="Готовы к выезду"
        active={filters.readyForDeparture}
        onClick={() => setField('readyForDeparture', !filters.readyForDeparture)}
      />
      <ToolbarToggle
        label="Конфликт"
        active={filters.conflict}
        onClick={() => setField('conflict', !filters.conflict)}
      />

      <div className="ml-auto flex shrink-0 items-center gap-0.5">
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
