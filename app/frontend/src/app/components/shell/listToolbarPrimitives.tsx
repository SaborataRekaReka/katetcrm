import * as React from 'react';
import { cn } from '../ui/utils';

/**
 * Unified style tokens + primitives for list-screen control bars
 * (Leads, Applications, Reservations, ...).
 *
 * Principles:
 *  - thin, quiet, icon-like dropdowns (no always-on borders)
 *  - clear grouping: search | filters | quick toggles | utility
 *  - utility actions (save view, columns) visually lightest
 */

/**
 * Outer bar: wraps controls on narrow screens, keeps single-row dense mode
 * on desktop and preserves thin scrollbar behavior where horizontal overflow
 * still appears.
 */
export const LIST_TOOLBAR_BAR =
  'scroll-thin flex shrink-0 flex-wrap items-center gap-1 border-b border-border/60 bg-white px-2 py-1 sm:px-3';

/** Search zone: full-width on narrow screens, fixed compact width on desktop. */
export const LIST_TOOLBAR_SEARCH_WRAP =
  'relative min-w-0 grow basis-full sm:basis-auto sm:grow-0 sm:w-[220px] sm:shrink-0';

/** Utility actions: move to a dedicated row on narrow screens. */
export const LIST_TOOLBAR_UTILITY_GROUP =
  'flex w-full items-center justify-end gap-0.5 pt-0.5 sm:ml-auto sm:w-auto sm:justify-start sm:pt-0';

/** SelectTrigger class: borderless by default, hover reveals the frame. */
export const LIST_TOOLBAR_TRIGGER =
  'h-7 shrink-0 rounded-md border border-transparent bg-transparent px-2 text-[12px] text-foreground/80 shadow-none ' +
  'hover:border-border hover:bg-muted/40 data-[state=open]:border-border data-[state=open]:bg-muted/50 ' +
  'data-[placeholder]:text-muted-foreground';

/** Search input class: quiet field, no loud outline. */
export const LIST_TOOLBAR_SEARCH_INPUT =
  'h-7 rounded-md border border-transparent bg-muted/40 pl-7 text-[12px] ' +
  'hover:bg-muted/60 focus-visible:border-border focus-visible:bg-white focus-visible:ring-0';

/** Vertical divider between semantic zones. */
export function ToolbarDivider({ className }: { className?: string }) {
  return <div className={cn('mx-1 h-4 w-px shrink-0 bg-border/70', className)} />;
}

interface ToolbarToggleProps {
  label: string;
  active: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
}

/**
 * Quick-view toggle chip. Much quieter than before:
 *  - inactive: text-only, no border
 *  - hover: subtle muted bg
 *  - active: soft brand tint, still no heavy border
 */
export function ToolbarToggle({ label, active, onClick, icon }: ToolbarToggleProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex h-7 shrink-0 items-center gap-1 rounded-md px-2 text-[12px] transition-colors',
        active
          ? 'bg-[#2a6af0]/10 text-[#2a6af0]'
          : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
      )}
    >
      {icon}
      {label}
    </button>
  );
}

interface ToolbarUtilityButtonProps {
  onClick?: () => void;
  icon?: React.ReactNode;
  label: string;
  /** Hide label on narrow bars; icon remains. */
  iconOnlyOnNarrow?: boolean;
}

/** Utility action on the right side — lightest visual weight. */
export function ToolbarUtilityButton({
  onClick,
  icon,
  label,
  iconOnlyOnNarrow,
}: ToolbarUtilityButtonProps) {
  const disabled = !onClick;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={iconOnlyOnNarrow ? label : undefined}
      className={cn(
        'inline-flex h-7 shrink-0 items-center gap-1.5 rounded-md px-2 text-[12px] text-muted-foreground transition-colors',
        disabled ? 'opacity-50 cursor-default' : 'hover:bg-muted/50 hover:text-foreground',
      )}
    >
      {icon}
      <span className={cn(iconOnlyOnNarrow && 'hidden lg:inline')}>{label}</span>
    </button>
  );
}
