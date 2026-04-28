import { ReactNode } from 'react';
import {
  Activity,
  AtSign,
  ChevronDown,
  Circle,
  MessageSquare,
  Paperclip,
  Smile,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from '../ui/button';
import { IconBtn, SidebarSection } from './DetailShell';

export interface EntityModalAction {
  label: ReactNode;
  onClick?: () => void;
  icon?: ReactNode;
  /** Иконка слева от label — удобно для `<Phone/>Позвонить` и т.п. */
  iconBefore?: ReactNode;
  /** Элемент целиком (если нужна нестандартная обёртка вроде AlertDialogTrigger). */
  render?: ReactNode;
}

export interface EntityModalHeaderProps {
  /**
   * Иконка слева от entityLabel в breadcrumb (FileText / Truck / Building2 ...).
   * Если не задано — breadcrumb показывается без иконки.
   */
  entityIcon?: ReactNode;
  entityLabel: ReactNode;
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
  const base =
    variant === 'primary'
      ? 'h-7 gap-1 bg-blue-600 hover:bg-blue-700 text-white text-[11px]'
      : 'h-7 text-[11px] gap-1';
  return (
    <Button
      size="sm"
      variant={variant === 'primary' ? 'default' : 'outline'}
      className={base}
      onClick={action.onClick}
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
  return (
    <header className={cn('space-y-3', className)}>
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 -ml-1.5 rounded text-[11px] text-gray-500">
        {entityIcon}
        <span>{entityLabel}</span>
        <ChevronDown className="w-3 h-3" />
      </span>

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
        <div key={entry.id} className="flex items-center gap-2 text-[11px] text-gray-600">
          <Circle className="w-2 h-2 text-gray-300 fill-gray-300" />
          <span className="text-gray-900">{entry.actor}</span>
          <span className="text-gray-500">{entry.text}</span>
          {entry.entity ? <span className="text-gray-700">{entry.entity}</span> : null}
          <span className="text-gray-400 ml-auto">{entry.time}</span>
        </div>
      ))}
    </div>
  );
}

export function EntityCommentsComposer({
  placeholder,
  avatar = 'A',
  avatarGradient = 'from-indigo-400 to-purple-500',
}: {
  placeholder: string;
  avatar?: string;
  avatarGradient?: string;
}) {
  return (
    <div className="flex items-center gap-2 px-3 h-10">
      <div
        className={`w-6 h-6 rounded-full bg-gradient-to-br ${avatarGradient} text-white text-[10px] inline-flex items-center justify-center flex-shrink-0`}
      >
        {avatar}
      </div>
      <input
        placeholder={placeholder}
        className="flex-1 h-6 px-1.5 text-[11px] bg-transparent outline-none placeholder:text-gray-400 text-gray-800"
      />
      <IconBtn>
        <AtSign className="w-3.5 h-3.5" />
      </IconBtn>
      <IconBtn>
        <Smile className="w-3.5 h-3.5" />
      </IconBtn>
      <IconBtn>
        <Paperclip className="w-3.5 h-3.5" />
      </IconBtn>
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
