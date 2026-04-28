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
  DEFAULT_RESERVATIONS_FILTERS,
  ReservationsFiltersState,
} from './filterTypes';
import { RESERVATION_STAGE_ORDER, RESERVATION_STAGE_LABEL } from './reservationHelpers';
import {
  LIST_TOOLBAR_BAR,
  LIST_TOOLBAR_SEARCH_INPUT,
  LIST_TOOLBAR_TRIGGER,
  ToolbarDivider,
  ToolbarToggle,
  ToolbarUtilityButton,
} from './listToolbarPrimitives';

interface ReservationsToolbarProps {
  filters?: ReservationsFiltersState;
  onFiltersChange?: (next: ReservationsFiltersState) => void;
  query?: string;
  onQueryChange?: (q: string) => void;
  managers?: string[];
  equipmentTypes?: string[];
  subcontractors?: string[];
  onSaveView?: () => void;
}

export function ReservationsToolbar({
  filters: filtersProp,
  onFiltersChange,
  query: queryProp,
  onQueryChange,
  managers = ['Петров А.', 'Сидоров Б.', 'Иванова С.'],
  equipmentTypes = ['Экскаватор', 'Бульдозер', 'Кран', 'Погрузчик', 'Автокран'],
  subcontractors = [],
  onSaveView,
}: ReservationsToolbarProps) {
  const { activeSecondaryNav } = useLayout();
  const meta = getModuleMeta(activeSecondaryNav);

  const [localFilters, setLocalFilters] = useState<ReservationsFiltersState>(
    DEFAULT_RESERVATIONS_FILTERS,
  );
  const [localQuery, setLocalQuery] = useState('');

  const filters = filtersProp ?? localFilters;
  const query = queryProp ?? localQuery;

  const updateFilters = (next: ReservationsFiltersState) => {
    if (onFiltersChange) onFiltersChange(next);
    else setLocalFilters(next);
  };
  const updateQuery = (q: string) => {
    if (onQueryChange) onQueryChange(q);
    else setLocalQuery(q);
  };
  const setField = <K extends keyof ReservationsFiltersState>(
    key: K,
    value: ReservationsFiltersState[K],
  ) => updateFilters({ ...filters, [key]: value });

  const hasActive =
    filters.scope !== 'all' ||
    filters.manager !== 'all' ||
    filters.status !== 'all' ||
    filters.internalStage !== 'all' ||
    filters.source !== 'all' ||
    filters.equipment !== 'all' ||
    filters.subcontractor !== 'all' ||
    filters.unitSelection !== 'all' ||
    filters.conflict ||
    filters.readyForDeparture ||
    query.length > 0;

  const reset = () => {
    updateFilters(DEFAULT_RESERVATIONS_FILTERS);
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
        <SelectTrigger className={`${LIST_TOOLBAR_TRIGGER} w-[80px]`}><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Все</SelectItem>
          <SelectItem value="my">Мои</SelectItem>
        </SelectContent>
      </Select>

      <Select value={filters.status} onValueChange={(v) => setField('status', v as ReservationsFiltersState['status'])}>
        <SelectTrigger className={`${LIST_TOOLBAR_TRIGGER} w-[100px]`}><SelectValue placeholder="Статус" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Любой статус</SelectItem>
          <SelectItem value="active">Активна</SelectItem>
          <SelectItem value="released">Снята</SelectItem>
        </SelectContent>
      </Select>

      <Select value={filters.internalStage} onValueChange={(v) => setField('internalStage', v)}>
        <SelectTrigger className={`${LIST_TOOLBAR_TRIGGER} w-[150px]`}><SelectValue placeholder="Стадия" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Все стадии</SelectItem>
          {RESERVATION_STAGE_ORDER.map((s) => (
            <SelectItem key={s} value={s}>{RESERVATION_STAGE_LABEL[s]}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={filters.source} onValueChange={(v) => setField('source', v as ReservationsFiltersState['source'])}>
        <SelectTrigger className={`${LIST_TOOLBAR_TRIGGER} w-[120px]`}><SelectValue placeholder="Источник" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Любой источник</SelectItem>
          <SelectItem value="own">Своя техника</SelectItem>
          <SelectItem value="subcontractor">Подрядчик</SelectItem>
          <SelectItem value="undecided">Не выбран</SelectItem>
        </SelectContent>
      </Select>

      <Select value={filters.equipment} onValueChange={(v) => setField('equipment', v)}>
        <SelectTrigger className={`${LIST_TOOLBAR_TRIGGER} w-[120px]`}><SelectValue placeholder="Тип техники" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Все типы</SelectItem>
          {equipmentTypes.map((e) => (
            <SelectItem key={e} value={e}>{e}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={filters.unitSelection} onValueChange={(v) => setField('unitSelection', v as ReservationsFiltersState['unitSelection'])}>
        <SelectTrigger className={`${LIST_TOOLBAR_TRIGGER} w-[120px]`}><SelectValue placeholder="Unit" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Unit: любой</SelectItem>
          <SelectItem value="selected">Unit выбран</SelectItem>
          <SelectItem value="not_selected">Unit не выбран</SelectItem>
        </SelectContent>
      </Select>

      <Select value={filters.manager} onValueChange={(v) => setField('manager', v)}>
        <SelectTrigger className={`${LIST_TOOLBAR_TRIGGER} w-[120px]`}><SelectValue placeholder="Менеджер" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Все менеджеры</SelectItem>
          {managers.map((m) => (
            <SelectItem key={m} value={m}>{m}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {subcontractors.length > 0 ? (
        <Select value={filters.subcontractor} onValueChange={(v) => setField('subcontractor', v)}>
          <SelectTrigger className={`${LIST_TOOLBAR_TRIGGER} w-[140px]`}><SelectValue placeholder="Подрядчик" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все подрядчики</SelectItem>
            {subcontractors.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : null}

      <ToolbarDivider />

      <ToolbarToggle label="Конфликт" active={filters.conflict} onClick={() => setField('conflict', !filters.conflict)} />
      <ToolbarToggle label="Готовы к выезду" active={filters.readyForDeparture} onClick={() => setField('readyForDeparture', !filters.readyForDeparture)} />

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
