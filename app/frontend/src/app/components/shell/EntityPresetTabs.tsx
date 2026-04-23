import { ReactNode } from 'react';
import { cn } from '../ui/utils';

/**
 * `EntityPresetTabs` — thin strip of saved-view chips rendered above the
 * filter toolbar on entity list/cards screens. This is the canonical
 * primitive for the ClickUp-style "one module, multiple presets" pattern
 * (e.g. Clients: Все / Новые / Повторные / VIP / С долгом, Units: Все /
 * Активные / Неактивные, Subcontractors: Все / Активные / Архив).
 *
 * Do NOT confuse with `WorkspaceHeader` tabs which switch the **view type**
 * (List / Cards / Table). Presets and view types are orthogonal axes.
 *
 * Visual language matches `listToolbarPrimitives` so both rows read as a
 * single toolset. Background is tinted gray-50 to make this a clearly
 * distinct strip from the toolbar below it.
 */
export interface EntityPreset {
  id: string;
  label: string;
  icon?: ReactNode;
  count?: number;
}

export interface EntityPresetTabsProps {
  presets: EntityPreset[];
  activeId: string;
  onChange: (id: string) => void;
  className?: string;
  /** Optional content aligned to the right (e.g. "+ View"). */
  rightSlot?: ReactNode;
}

export function EntityPresetTabs({
  presets,
  activeId,
  onChange,
  className,
  rightSlot,
}: EntityPresetTabsProps) {
  return (
    <div
      className={cn(
        'flex h-8 shrink-0 items-center gap-0.5 overflow-x-auto border-b border-border/60 bg-gray-50/60 px-3',
        className,
      )}
    >
      {presets.map((v) => {
        const active = v.id === activeId;
        return (
          <button
            key={v.id}
            type="button"
            onClick={() => onChange(v.id)}
            className={cn(
              'inline-flex h-6 shrink-0 items-center gap-1.5 rounded px-2 text-[12px] transition-colors',
              active
                ? 'bg-white text-[#2a6af0] shadow-[0_1px_0_rgba(15,23,42,0.06)] ring-1 ring-[#2a6af0]/20'
                : 'text-muted-foreground hover:bg-white/70 hover:text-foreground',
            )}
          >
            {v.icon ? <span className="shrink-0">{v.icon}</span> : null}
            <span>{v.label}</span>
            {typeof v.count === 'number' ? (
              <span
                className={cn(
                  'rounded px-1 text-[10px] tabular-nums',
                  active ? 'bg-[#2a6af0]/10 text-[#2a6af0]' : 'bg-muted/70 text-muted-foreground',
                )}
              >
                {v.count}
              </span>
            ) : null}
          </button>
        );
      })}
      {rightSlot ? <div className="ml-auto flex shrink-0 items-center gap-1">{rightSlot}</div> : null}
    </div>
  );
}
