import { useState, ReactNode } from 'react';
import {
  X,
  ChevronDown,
  ChevronRight,
  Share2,
  Eye,
  MoreHorizontal,
  List,
  ArrowRight,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';

/* ============ Screen family rules ============
 * Shared patterns for the detail screen family
 * (Lead / Application / Reservation / Departure / Completion / Client).
 *
 * 1. Canonical client entity:
 *    - company present  => primary link = company, person is secondary text
 *    - no company       => primary link = person name
 *    Use `resolveClientDisplay()` below.
 *
 * 2. Interaction hierarchy:
 *    - Primary CTA     : one main next step (blue Button)
 *    - Secondary action: state-changing buttons (outline Button)
 *    - Text link       : navigation to a linked entity (blue text, sidebarTokens.link)
 *    - Status chip     : state only, never an action (badgeBase + tones)
 *
 * 3. Next-step pattern (must stay in sync across inline + sidebar + CTA):
 *    - inline item        : "Нужно: <action>"
 *    - screen-level hint  : "Следующий шаг: <action>" (use <NextStepLine>)
 *    - primary CTA label  : <action> (same verb)
 *
 * 4. Main canvas block order:
 *    1) Overview / core info
 *    2) Main process block (positions / source / fact / readiness)
 *    3) Supporting state / selected resource / readiness summary
 *    4) Notes / comments
 *    5) Relation links (nav-only)
 *    6) Activity / history
 *
 * 5. Bottom relation links: navigation only.
 *    Business actions (repeat, duplicate, cancel, etc.) go into a separate
 *    block or into sidebar "Быстрые действия".
 */

export interface ClientDisplay {
  /** Short label for the left column (e.g. "Клиент" or "Контакт"). */
  primaryLabel: 'Клиент' | 'Контакт';
  /** Text of the primary blue link (company for legal, person for individual). */
  primaryText: string;
  /** Optional secondary plain text (contact person when company is primary). */
  secondaryText?: string;
}

export interface BreadcrumbItem {
  label: string;
  onClick?: () => void;
}

export interface DetailShellMenuAction {
  label: string;
  onSelect?: () => void;
  disabled?: boolean;
  destructive?: boolean;
}

/**
 * Canonical client entity resolver — single source of truth for the whole
 * detail screen family. Use for the main Client property row.
 */
export function resolveClientDisplay(input: {
  company?: string | null;
  personName?: string | null;
}): ClientDisplay {
  const company = input.company?.trim();
  const person = input.personName?.trim();
  if (company) {
    return {
      primaryLabel: 'Контакт',
      primaryText: company,
      secondaryText: person || undefined,
    };
  }
  return {
    primaryLabel: 'Клиент',
    primaryText: person || '—',
  };
}

/**
 * Screen-level next-step hint. Must render the same verb as the primary CTA.
 * Use below the source/readiness block, above relation links.
 */
export function NextStepLine({
  label,
  reason,
  className = '',
}: {
  label: string;
  reason?: string | null;
  className?: string;
}) {
  return (
    <div className={`flex items-center gap-1 text-[10px] text-gray-500 ${className}`}>
      <ArrowRight className="w-3 h-3 text-blue-500" />
      <span>Следующий шаг:&nbsp;<span className="text-gray-700">{label}</span></span>
      {reason && <span className="text-gray-400">&nbsp;· {reason}</span>}
    </div>
  );
}

/* ============ Atoms ============ */

export function IconBtn({
  children,
  onClick,
  className = '',
  title,
  active = false,
}: {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  title?: string;
  active?: boolean;
}) {
  if (!onClick) {
    return (
      <span
        className={`h-6 w-6 inline-flex items-center justify-center rounded ${
          active ? 'text-blue-600' : 'text-gray-400'
        } ${className}`}
        aria-hidden="true"
      >
        {children}
      </span>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      className={`h-6 w-6 inline-flex items-center justify-center rounded hover:bg-gray-100 transition-colors ${
        active ? 'text-blue-600 hover:text-blue-700' : 'text-gray-500 hover:text-gray-700'
      } ${className}`}
    >
      {children}
    </button>
  );
}

export function ToolbarPill({
  icon,
  label,
  muted = true,
  className = '',
  onClick,
}: {
  icon?: ReactNode;
  label: ReactNode;
  muted?: boolean;
  className?: string;
  onClick?: () => void;
}) {
  const classes = `inline-flex items-center gap-1 h-6 px-1.5 rounded border border-gray-200 text-[11px] ${
    muted ? 'text-gray-500' : 'text-gray-800'
  } ${className}`;
  if (!onClick) {
    return (
      <span className={classes}>
        {icon}
        <span>{label}</span>
      </span>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${classes} hover:bg-gray-50 hover:border-gray-300 transition-colors`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

export function PropertyRow({
  icon,
  label,
  value,
}: {
  icon?: ReactNode;
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="flex items-center min-h-7 py-0.5">
      <div className="flex w-[112px] flex-shrink-0 items-center gap-1.5 text-[11px] text-gray-500 sm:w-[140px]">
        {icon && <span className="text-gray-400">{icon}</span>}
        <span>{label}</span>
      </div>
      <div className="flex-1 min-w-0 text-[11px] text-gray-800">{value}</div>
    </div>
  );
}

export function EmptyValue({ text = 'Empty' }: { text?: string }) {
  return <span className="text-gray-400 text-[11px]">{text}</span>;
}

export function InlineValue({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick?: () => void;
}) {
  if (!onClick) {
    return (
      <span className="inline-flex min-h-[20px] max-w-full items-center gap-1 rounded px-1 text-[11px] text-gray-700 truncate">
        {children}
      </span>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex min-h-[20px] max-w-full items-center gap-1 rounded px-1 text-[11px] text-gray-700 truncate hover:bg-gray-100 transition-colors"
    >
      {children}
    </button>
  );
}

/* ============ Sidebar ============
 * Unified sidebar typography system — shared by all detail screens
 * (Lead, Application, Reservation, Departure, Completion, Client).
 *
 * Only three levels are allowed inside the right sidebar:
 *   - title  : one size, one weight, one color, no blue, no size jumps
 *   - label  : muted secondary color, same size as value, same line-height
 *   - value  : neutral text color (gray-700), same size as label
 *
 * Blue is reserved for linked records only (sidebarTokens.link).
 * Activity / timestamps use the muted 10px token.
 */
export const sidebarTokens = {
  title: 'text-[10px] font-medium uppercase tracking-wider text-gray-500',
  label: 'text-[11px] text-gray-500',
  value: 'text-[11px] text-gray-700',
  link: 'text-[11px] font-semibold text-blue-600 hover:underline cursor-pointer',
  muted: 'text-[10px] text-gray-500',
} as const;

export function SidebarSection({
  title,
  children,
  defaultOpen = true,
  action,
}: {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
  action?: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-gray-200">
      <div className="flex items-center justify-between h-8 px-3">
        <button
          className={`inline-flex items-center gap-1 ${sidebarTokens.title} hover:text-gray-700`}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          <span>{title}</span>
        </button>
        {action}
      </div>
      {open && <div className="px-3 pb-3 space-y-1.5">{children}</div>}
    </div>
  );
}

export function SidebarField({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center min-h-6">
      <div className={`w-[96px] flex-shrink-0 sm:w-[110px] ${sidebarTokens.label}`}>{label}</div>
      <div className={`flex-1 min-w-0 ${sidebarTokens.value} truncate`}>{value}</div>
    </div>
  );
}

/* ============ Breadcrumb ============ */

export function Breadcrumb({ items }: { items: Array<string | BreadcrumbItem> }) {
  const normalized: BreadcrumbItem[] = items.map((item) =>
    typeof item === 'string' ? { label: item } : item,
  );
  const renderPart = (
    item: BreadcrumbItem,
    isCurrent: boolean,
    withListIcon = false,
  ) => {
    const className = `inline-flex items-center gap-1 px-1.5 py-0.5 rounded ${
      item.onClick
        ? 'hover:bg-gray-100 hover:text-gray-800 transition-colors'
        : ''
    } ${isCurrent ? 'text-gray-700' : 'text-gray-500'}`;
    if (!item.onClick) {
      return (
        <span className={className}>
          {withListIcon ? <List className="w-3 h-3" /> : null}
          <span>{item.label}</span>
        </span>
      );
    }
    return (
      <button type="button" onClick={item.onClick} className={className}>
        {withListIcon ? <List className="w-3 h-3" /> : null}
        <span>{item.label}</span>
      </button>
    );
  };

  return (
    <div className="flex items-center gap-0.5 text-[11px] text-gray-500 min-w-0">
      {renderPart(normalized[0], normalized.length === 1, true)}
      {normalized.slice(1).map((item, i) => (
        <span key={i} className="inline-flex items-center gap-0.5">
          <ChevronRight className="w-3 h-3 text-gray-300" />
          {renderPart(item, i === normalized.length - 2)}
        </span>
      ))}
    </div>
  );
}

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fallthrough
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

/* ============ Shell ============ */

export function DetailShell({
  breadcrumb,
  onClose,
  main,
  sidebar,
  footer,
  onShare,
  shareUrl,
  onToggleWatch,
  isWatched,
  moreActions,
}: {
  breadcrumb: ReactNode;
  onClose: () => void;
  main: ReactNode;
  sidebar: ReactNode;
  footer?: ReactNode;
  onShare?: () => void;
  shareUrl?: string | null;
  onToggleWatch?: () => void;
  isWatched?: boolean;
  moreActions?: DetailShellMenuAction[];
}) {
  const [copied, setCopied] = useState(false);
  const [localWatched, setLocalWatched] = useState(false);
  const watched = isWatched ?? localWatched;

  const handleShare = async () => {
    if (onShare) {
      onShare();
      return;
    }
    const href = shareUrl ?? (typeof window !== 'undefined' ? window.location.href : '');
    if (!href) return;
    const ok = await copyToClipboard(href);
    if (ok) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    }
  };

  const handleToggleWatch = () => {
    if (onToggleWatch) {
      onToggleWatch();
      return;
    }
    setLocalWatched((v) => !v);
  };

  const defaultMenuActions: DetailShellMenuAction[] = [
    {
      label: copied ? 'Ссылка скопирована' : 'Скопировать ссылку',
      onSelect: () => {
        void handleShare();
      },
    },
    {
      label: 'Закрыть карточку',
      onSelect: onClose,
      destructive: true,
    },
  ];
  const menuActions = moreActions ?? defaultMenuActions;

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-white text-gray-800">
      {/* Top bar */}
      <div className="flex min-h-10 flex-shrink-0 flex-wrap items-center justify-between gap-1 border-b border-gray-200 px-3 py-1">
        <div className="min-w-0 flex-1">{breadcrumb}</div>
        <div className="flex shrink-0 items-center gap-0.5">
          <IconBtn
            onClick={() => {
              void handleShare();
            }}
            title={copied ? 'Ссылка скопирована' : 'Поделиться'}
          >
            <Share2 className="w-3.5 h-3.5" />
          </IconBtn>
          <IconBtn
            onClick={handleToggleWatch}
            active={watched}
            title={watched ? 'Не следить за карточкой' : 'Следить за карточкой'}
          >
            <Eye className="w-3.5 h-3.5" />
          </IconBtn>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="h-6 w-6 inline-flex items-center justify-center rounded hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
                title="Ещё действия"
                aria-label="Ещё действия"
              >
                <MoreHorizontal className="w-3.5 h-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[170px]">
              {menuActions.map((action, index) => (
                <DropdownMenuItem
                  key={`${action.label}-${index}`}
                  className="text-[11px]"
                  disabled={action.disabled}
                  variant={action.destructive ? 'destructive' : 'default'}
                  onSelect={action.onSelect}
                >
                  {action.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <div className="w-px h-4 bg-gray-200 mx-1" />
          <IconBtn onClick={onClose}>
            <X className="w-3.5 h-3.5" />
          </IconBtn>
        </div>
      </div>

      {/* Body */}
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <div className="flex-1 min-h-0 min-w-0 flex flex-col">
          <div className="detail-shell-scroll flex-1 min-h-0 overflow-y-auto">{main}</div>
          {footer && (
            <div className="border-t border-gray-200 flex-shrink-0 bg-white">{footer}</div>
          )}
        </div>
        <aside className="detail-shell-scroll min-h-0 max-h-[42vh] w-full flex-shrink-0 overflow-y-auto border-t border-gray-200 bg-gray-50/40 lg:max-h-none lg:w-[300px] lg:border-l lg:border-t-0">
          {sidebar}
        </aside>
      </div>
    </div>
  );
}

export function ActionButton({ icon, label, onClick }: { icon: ReactNode; label: string; onClick?: () => void }) {
  if (!onClick) {
    return (
      <div className="flex items-center gap-2 text-[11px] text-gray-500 px-1.5 py-1 -ml-1.5 w-full">
        <span className="text-gray-400">{icon}</span>
        {label}
      </div>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-2 text-[11px] text-gray-500 hover:text-gray-800 hover:bg-gray-50 px-1.5 py-1 -ml-1.5 rounded transition-colors w-full"
    >
      <span className="text-gray-400">{icon}</span>
      {label}
    </button>
  );
}
