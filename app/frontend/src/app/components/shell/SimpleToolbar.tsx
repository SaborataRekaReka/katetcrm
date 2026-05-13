import { ReactNode } from 'react';
import { Search, X, Bookmark } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Input } from '../ui/input';
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

export interface SimpleFilterOption {
  value: string;
  label: string;
}

export interface SimpleFilterDef {
  id: string;
  value: string;
  placeholder: string;
  width?: number;
  options: SimpleFilterOption[];
  onChange: (v: string) => void;
}

export interface SimpleToggleDef {
  id: string;
  label: string;
  active: boolean;
  onToggle: () => void;
}

interface SimpleToolbarProps {
  searchPlaceholder: string;
  query: string;
  onQueryChange: (v: string) => void;
  filters?: SimpleFilterDef[];
  toggles?: SimpleToggleDef[];
  onReset?: () => void;
  onSaveView?: () => void;
  /**
   * Whether to render the "Save view" utility button. Defaults to `hasActive`
   * so the action only shows when there is real state to save — matches the
   * ClickUp contract: no view control without actual view state.
   */
  canSaveView?: boolean;
  hasActive: boolean;
  /** Extra utility-zone items (left of Reset/SaveView). */
  extraUtility?: ReactNode;
}

/**
 * Reusable compact toolbar for list/table screens that don't need a
 * domain-specific filter component. Follows the same visual pattern as
 * LeadsToolbar / ApplicationsToolbar / ReservationsToolbar.
 */
export function SimpleToolbar({
  searchPlaceholder,
  query,
  onQueryChange,
  filters = [],
  toggles = [],
  onReset,
  onSaveView,
  canSaveView,
  hasActive,
  extraUtility,
}: SimpleToolbarProps) {
  return (
    <div className={LIST_TOOLBAR_BAR}>
      <div className={LIST_TOOLBAR_SEARCH_WRAP}>
        <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          data-crm-search-input="true"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder={searchPlaceholder}
          className={LIST_TOOLBAR_SEARCH_INPUT}
        />
      </div>

      {filters.map((f) => (
        <Select key={f.id} value={f.value} onValueChange={f.onChange}>
          <SelectTrigger
            className={`${LIST_TOOLBAR_TRIGGER}`}
            style={{ width: f.width ?? 120 }}
          >
            <SelectValue placeholder={f.placeholder} />
          </SelectTrigger>
          <SelectContent>
            {f.options.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ))}

      {toggles.length > 0 ? (
        <>
          <ToolbarDivider />
          {toggles.map((t) => (
            <ToolbarToggle
              key={t.id}
              label={t.label}
              active={t.active}
              onClick={t.onToggle}
            />
          ))}
        </>
      ) : null}

      <div className={LIST_TOOLBAR_UTILITY_GROUP}>
        {extraUtility}
        {hasActive && onReset ? (
          <ToolbarUtilityButton
            label="Сбросить"
            icon={<X className="h-3.5 w-3.5" />}
            onClick={onReset}
          />
        ) : null}
        {onSaveView !== undefined && (canSaveView ?? hasActive) ? (
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
