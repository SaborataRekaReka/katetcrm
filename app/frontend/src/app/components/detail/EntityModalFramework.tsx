import { KeyboardEvent, ReactNode, useState } from 'react';
import {
  Activity,
  AtSign,
  Check,
  CheckCircle2,
  ChevronDown,
  Circle,
  FileText,
  Loader2,
  MessageSquare,
  Paperclip,
  Smile,
  Truck,
  UserPlus,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { IconBtn, SidebarSection } from './DetailShell';

export interface EntityModalAction {
  label: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  icon?: ReactNode;
  /** Иконка слева от label — удобно для `<Phone/>Позвонить` и т.п. */
  iconBefore?: ReactNode;
  /** Элемент целиком (если нужна нестандартная обёртка вроде AlertDialogTrigger). */
  render?: ReactNode;
}

export interface EntitySwitcherOption {
  id: string;
  label: string;
  onSelect?: () => void;
  disabled?: boolean;
  active?: boolean;
}

function getEntitySwitcherIcon(id: string): ReactNode {
  if (id === 'lead') return <UserPlus className="w-3.5 h-3.5 text-gray-500" />;
  if (id === 'application') return <FileText className="w-3.5 h-3.5 text-gray-500" />;
  if (id === 'reservation') return <FileText className="w-3.5 h-3.5 text-gray-500" />;
  if (id === 'departure') return <Truck className="w-3.5 h-3.5 text-gray-500" />;
  if (id === 'completed' || id === 'completion') {
    return <CheckCircle2 className="w-3.5 h-3.5 text-gray-500" />;
  }
  return <Circle className="w-3.5 h-3.5 text-gray-400" />;
}

export interface EntityModalHeaderProps {
  /**
   * Иконка слева от entityLabel в breadcrumb (FileText / Truck / Building2 ...).
   * Если не задано — breadcrumb показывается без иконки.
   */
  entityIcon?: ReactNode;
  entityLabel: ReactNode;
  entitySwitcherOptions?: EntitySwitcherOption[];
  title: ReactNode;
  /**
   * Строка метаданных под заголовком: клиент · заявка · тип техники и т.п.
   * Принимает ReactNode, чтобы внутрь можно было класть ссылки/кнопки.
   */
  subtitle?: ReactNode;
  chips?: ReactNode[];
  primaryAction?: EntityModalAction;
  /** Одна кнопка; оставлена для совместимости. */
  secondaryAction?: EntityModalAction;
  /** Массив вторичных действий (рендерится после secondaryAction). */
  secondaryActions?: EntityModalAction[];
  className?: string;
}

export function EntityModalShell({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn('mx-auto w-full max-w-[860px] px-6 py-6 sm:px-8', className)}>{children}</div>;
}

function renderAction(action: EntityModalAction, variant: 'primary' | 'secondary') {
  if (action.render) return action.render;
  const disabled = action.disabled ?? !action.onClick;
  const base =
    variant === 'primary'
      ? 'h-7 gap-1 bg-blue-600 hover:bg-blue-700 text-white text-[11px]'
      : 'h-7 text-[11px] gap-1';
  return (
    <Button
      size="sm"
      variant={variant === 'primary' ? 'default' : 'outline'}
      className={base}
      data-testid={variant === 'primary' ? 'entity-primary-action' : 'entity-secondary-action'}
      onClick={action.onClick}
      disabled={disabled}
    >
      {action.iconBefore}
      {action.label}
      {action.icon}
    </Button>
  );
}

export function EntityModalHeader({
  entityIcon,
  entityLabel,
  entitySwitcherOptions,
  title,
  subtitle,
  chips = [],
  primaryAction,
  secondaryAction,
  secondaryActions,
  className,
}: EntityModalHeaderProps) {
  const secondaries: EntityModalAction[] = [
    ...(secondaryAction ? [secondaryAction] : []),
    ...(secondaryActions ?? []),
  ];
  const hasEntitySwitcher = (entitySwitcherOptions?.length ?? 0) > 0;

  return (
    <header className={cn('space-y-3', className)}>
      {hasEntitySwitcher ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="inline-flex items-center gap-1 px-1.5 py-0.5 -ml-1.5 rounded text-[11px] text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
            >
              {entityIcon}
              <span>{entityLabel}</span>
              <ChevronDown className="w-3 h-3" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-[180px]">
            {entitySwitcherOptions!.map((option) => (
              <DropdownMenuItem
                key={option.id}
                className="text-[11px]"
                onSelect={option.onSelect}
                disabled={option.disabled || !option.onSelect}
              >
                <span className="mr-1.5 flex-shrink-0">{getEntitySwitcherIcon(option.id)}</span>
                <span className="flex-1">{option.label}</span>
                {option.active ? <Check className="w-3.5 h-3.5 text-blue-600" /> : null}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 -ml-1.5 rounded text-[11px] text-gray-500">
          {entityIcon}
          <span>{entityLabel}</span>
        </span>
      )}

      <div className="flex items-start justify-between gap-4">
        <h1 className="text-[22px] leading-[1.25] text-gray-900">{title}</h1>
        {(primaryAction || secondaries.length > 0) && (
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {primaryAction && <div key="primary">{renderAction(primaryAction, 'primary')}</div>}
            {secondaries.map((a, idx) => (
              <div key={`sec-${idx}`}>{renderAction(a, 'secondary')}</div>
            ))}
          </div>
        )}
      </div>

      {subtitle && <div className="text-[11px] text-gray-500">{subtitle}</div>}

      {chips.length > 0 && <div className="flex flex-wrap items-center gap-1.5">{chips.map((chip, idx) => <div key={idx}>{chip}</div>)}</div>}
    </header>
  );
}

export function EntitySection({
  title,
  action,
  children,
  className,
  disableDivider = false,
}: {
  title?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  disableDivider?: boolean;
}) {
  return (
    <section className={cn('space-y-2', className)}>
      {(title || action) && (
        <div className="flex items-center gap-2 min-h-6">
          {title && <h3 className="text-[11px] text-gray-500 uppercase tracking-wide">{title}</h3>}
          {action && <div className="ml-auto">{action}</div>}
        </div>
      )}
      <div className={cn(!disableDivider && 'border-t border-gray-200 pt-3')}>{children}</div>
    </section>
  );
}

export function EntityMetaGrid({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn('grid grid-cols-1 gap-x-8 sm:grid-cols-2', className)}>{children}</div>;
}

export interface EntitySidebarSection {
  title: string;
  content: ReactNode;
  defaultOpen?: boolean;
  action?: ReactNode;
}

export function EntitySummarySidebar({
  sections,
  quickActions,
  quickActionsTitle = 'Quick actions',
}: {
  sections: EntitySidebarSection[];
  quickActions?: ReactNode;
  quickActionsTitle?: string;
}) {
  return (
    <>
      {sections.map((section, idx) => (
        <SidebarSection key={`${section.title}-${idx}`} title={section.title} defaultOpen={section.defaultOpen} action={section.action}>
          {section.content}
        </SidebarSection>
      ))}
      {quickActions && (
        <SidebarSection title={quickActionsTitle} defaultOpen={false}>
          {quickActions}
        </SidebarSection>
      )}
    </>
  );
}

type EntityCommentsTab = 'comments' | 'activity';

export function EntityCommentsPanel({
  tab,
  onTabChange,
  commentsCount,
  commentsContent,
  activityContent,
  commentsLabel = 'Comments',
  activityLabel = 'Activity',
  className,
}: {
  tab: EntityCommentsTab;
  onTabChange: (tab: EntityCommentsTab) => void;
  commentsCount?: number;
  commentsContent: ReactNode;
  activityContent: ReactNode;
  commentsLabel?: string;
  activityLabel?: string;
  className?: string;
}) {
  return (
    <div className={cn('border-t border-gray-200 pt-4 space-y-3', className)}>
      <div className="flex items-center gap-1">
        <EntityTabButton
          icon={<MessageSquare className="w-3 h-3" />}
          label={commentsLabel}
          active={tab === 'comments'}
          count={commentsCount}
          onClick={() => onTabChange('comments')}
        />
        <EntityTabButton
          icon={<Activity className="w-3 h-3" />}
          label={activityLabel}
          active={tab === 'activity'}
          onClick={() => onTabChange('activity')}
        />
      </div>

      {tab === 'comments' ? commentsContent : activityContent}
    </div>
  );
}

export interface EntityCommentEntry {
  id: string;
  author: string;
  avatar: string;
  color: string;
  time: string;
  text: string;
}

export interface EntityActivityEntry {
  id: string;
  actor: string;
  text: string;
  entity?: string;
  time: string;
  details?: string[];
  links?: Array<{
    label: string;
    href: string;
  }>;
}

export function EntityCommentList({
  comments,
  emptyText,
}: {
  comments: EntityCommentEntry[];
  emptyText: string;
}) {
  if (comments.length === 0) {
    return <div className="text-[11px] text-gray-400">{emptyText}</div>;
  }

  return (
    <div className="space-y-3">
      {comments.map((comment) => (
        <div key={comment.id} className="flex gap-2">
          <div
            className={`w-6 h-6 rounded-full bg-gradient-to-br ${comment.color} text-white text-[10px] inline-flex items-center justify-center flex-shrink-0`}
          >
            {comment.avatar}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-gray-900">{comment.author}</span>
              <span className="text-[10px] text-gray-400">{comment.time}</span>
            </div>
            <div className="text-[11px] text-gray-700 mt-0.5">{comment.text}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function EntityActivityList({
  entries,
  emptyText,
}: {
  entries: EntityActivityEntry[];
  emptyText: string;
}) {
  if (entries.length === 0) {
    return <div className="text-[11px] text-gray-400">{emptyText}</div>;
  }

  return (
    <div className="space-y-2">
      {entries.map((entry) => (
        <div key={entry.id} className="flex items-start gap-2 rounded-sm px-1 py-1 text-[11px] text-gray-600">
          <Circle className="w-2 h-2 mt-1 text-gray-300 fill-gray-300 flex-shrink-0" />
          <div className="min-w-0 flex-1 space-y-0.5">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-gray-900 truncate">{entry.actor}</span>
              <span className="text-gray-400 ml-auto flex-shrink-0">{entry.time}</span>
            </div>
            <div className="text-gray-500 leading-snug break-words">
              <span>{entry.text}</span>
              {entry.entity ? <span className="text-gray-700"> · {entry.entity}</span> : null}
            </div>
            {entry.details && entry.details.length > 0 ? (
              <div className="pt-0.5 space-y-0.5">
                {entry.details.map((line, idx) => (
                  <div key={`${entry.id}-detail-${idx}`} className="text-[10px] text-gray-500 break-words">
                    {line}
                  </div>
                ))}
              </div>
            ) : null}
            {entry.links && entry.links.length > 0 ? (
              <div className="flex flex-wrap gap-2 pt-0.5">
                {entry.links.map((link, idx) => (
                  <a
                    key={`${entry.id}-link-${idx}`}
                    href={link.href}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="text-[10px] text-blue-600 hover:text-blue-700 hover:underline"
                  >
                    {link.label}
                  </a>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}

export function EntityCommentsComposer({
  placeholder,
  avatar = 'A',
  avatarGradient = 'from-indigo-400 to-purple-500',
  onSubmit,
  onMention,
  onEmoji,
  onAttach,
  disabled = false,
}: {
  placeholder: string;
  avatar?: string;
  avatarGradient?: string;
  onSubmit?: (text: string) => void | Promise<void>;
  onMention?: () => void;
  onEmoji?: () => void;
  onAttach?: () => void;
  disabled?: boolean;
}) {
  const [value, setValue] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const canCompose = !!onSubmit && !disabled;
  const canSubmit = canCompose && !isSubmitting && value.trim().length > 0;

  const handleSubmit = async () => {
    if (!canSubmit || !onSubmit) return;
    setIsSubmitting(true);
    try {
      await onSubmit(value.trim());
      setValue('');
    } catch {
      // Keep draft text so user can retry after transient errors.
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      void handleSubmit();
    }
  };

  return (
    <div className="flex items-center gap-2 px-3 h-10">
      <div
        className={`w-6 h-6 rounded-full bg-gradient-to-br ${avatarGradient} text-white text-[10px] inline-flex items-center justify-center flex-shrink-0`}
      >
        {avatar}
      </div>
      <input
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={canCompose ? handleKeyDown : undefined}
        disabled={!canCompose}
        placeholder={placeholder}
        className={`flex-1 h-6 px-1.5 text-[11px] bg-transparent outline-none placeholder:text-gray-400 ${
          canCompose ? 'text-gray-800' : 'text-gray-400 cursor-not-allowed'
        }`}
      />
      {canCompose ? (
        <>
          {onMention ? (
            <IconBtn onClick={onMention} title="Упомянуть">
              <AtSign className="w-3.5 h-3.5" />
            </IconBtn>
          ) : null}
          {onEmoji ? (
            <IconBtn onClick={onEmoji} title="Эмодзи">
              <Smile className="w-3.5 h-3.5" />
            </IconBtn>
          ) : null}
          {onAttach ? (
            <IconBtn onClick={onAttach} title="Прикрепить файл">
              <Paperclip className="w-3.5 h-3.5" />
            </IconBtn>
          ) : null}
          <IconBtn onClick={() => void handleSubmit()} title="Отправить" className="text-blue-600 hover:text-blue-700">
            {isSubmitting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <CheckCircle2 className="w-3.5 h-3.5" />
            )}
          </IconBtn>
        </>
      ) : null}
    </div>
  );
}

function EntityTabButton({
  icon,
  label,
  active,
  count,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  active?: boolean;
  count?: number;
  onClick?: () => void;
}) {
  if (!onClick) {
    return (
      <span
        className={`inline-flex items-center gap-1 h-6 px-1.5 rounded text-[11px] ${
          active ? 'bg-gray-100 text-gray-800' : 'text-gray-500'
        }`}
      >
        {icon}
        <span>{label}</span>
        {typeof count === 'number' && <span className="text-[10px] text-gray-400">{count}</span>}
      </span>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1 h-6 px-1.5 rounded text-[11px] transition-colors ${
        active ? 'bg-gray-100 text-gray-800' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
      }`}
    >
      {icon}
      <span>{label}</span>
      {typeof count === 'number' && <span className="text-[10px] text-gray-400">{count}</span>}
    </button>
  );
}
