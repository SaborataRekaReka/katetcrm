import { Lead, StageType } from '../../types/kanban';
import { GroupedList, GroupedListGroup } from './GroupedList';
import { SourceBadge } from '../kanban/SourceBadge';
import { badgeBase, badgeTones } from '../kanban/badgeTokens';
import { cn } from '../ui/utils';
import {
  AlertTriangle,
  Copy,
  Flame,
  Clock,
  PhoneOff,
  MoreHorizontal,
  ArrowRightCircle,
  Phone,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { PhoneLink } from '../detail/ContactAtoms';

const STAGE_ORDER: StageType[] = [
  'lead',
  'application',
  'reservation',
  'departure',
  'completed',
  'unqualified',
];

const STAGE_META: Record<StageType, { title: string; color: string }> = {
  lead: { title: 'Лид', color: 'bg-[#7B68EE]' },
  application: { title: 'Заявка', color: 'bg-[#4A90E2]' },
  reservation: { title: 'Бронь', color: 'bg-[#F5A623]' },
  departure: { title: 'Выезд', color: 'bg-[#50C878]' },
  completed: { title: 'Завершено', color: 'bg-[#9B9B9B]' },
  unqualified: { title: 'Некачественный', color: 'bg-[#E74C3C]' },
};

function formatDate(d?: string): string {
  if (!d) return '—';
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return d;
  return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
}

function formatDateTime(d?: string, t?: string): string {
  const datePart = formatDate(d);
  if (datePart === '—' && !t) return '—';
  return t ? `${datePart} · ${t}` : datePart;
}

interface LeadsListViewProps {
  leads: Lead[];
  onRowClick: (lead: Lead) => void;
  onConvertToApplication?: (lead: Lead) => void;
  isFiltered?: boolean;
}

export function LeadsListView({ leads, onRowClick, onConvertToApplication, isFiltered }: LeadsListViewProps) {
  const groups: GroupedListGroup<Lead>[] = STAGE_ORDER.map((stage) => ({
    id: stage,
    title: STAGE_META[stage].title,
    colorClass: STAGE_META[stage].color,
    items: leads.filter((l) => l.stage === stage),
  }));

  const isAllEmpty = leads.length === 0;

  if (isAllEmpty) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-1 text-muted-foreground">
        <p className="text-[13px]">
          {isFiltered ? 'Нет лидов по выбранным фильтрам' : 'Лидов пока нет'}
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-0 flex-1 overflow-auto bg-white">
      <GroupedList
        groups={groups}
        emptyGroupHint="Нет записей в этой стадии"
        columnsHeader={
          <div className="grid h-7 items-center border-b border-border/40 bg-muted/30 text-[11px] uppercase tracking-wide text-muted-foreground"
               style={{ gridTemplateColumns: 'minmax(260px,1fr) 150px 150px 140px 1fr 130px 120px 40px' }}>
            <div className="px-4">Имя · Компания</div>
            <div className="px-3">Телефон</div>
            <div className="px-3">Тип техники</div>
            <div className="px-3">Дата / время</div>
            <div className="px-3">Адрес</div>
            <div className="px-3">Менеджер</div>
            <div className="px-3">Обновлено</div>
            <div />
          </div>
        }
        renderRow={(lead) => (
          <LeadListRow
            lead={lead}
            onClick={() => onRowClick(lead)}
            onConvertToApplication={onConvertToApplication ? () => onConvertToApplication(lead) : undefined}
          />
        )}
      />
    </div>
  );
}

function LeadListRow({
  lead,
  onClick,
  onConvertToApplication,
}: {
  lead: Lead;
  onClick: () => void;
  onConvertToApplication?: () => void;
}) {
  const canConvert = lead.stage === 'lead' && !(lead.missingFields && lead.missingFields.length > 0);
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onClick();
      }}
      className={cn(
        'group grid h-9 cursor-pointer items-center border-b border-border/40 text-[12px] transition-colors hover:bg-accent/40',
      )}
      style={{ gridTemplateColumns: 'minmax(260px,1fr) 150px 150px 140px 1fr 130px 120px 40px' }}
    >
      {/* Name + badges */}
      <div className="flex min-w-0 items-center gap-2 px-4">
        <span
          className={cn('inline-block h-2 w-2 shrink-0 rounded-full', STAGE_META[lead.stage].color)}
          title={STAGE_META[lead.stage].title}
        />
        <div className="min-w-0 flex-1 truncate">
          <span className="text-[13px] font-medium text-foreground">{lead.client}</span>
          {lead.company ? (
            <span className="ml-1.5 text-[12px] text-muted-foreground">· {lead.company}</span>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <SourceBadge source={lead.source} channel={lead.sourceChannel} />
          {lead.isUrgent ? (
            <span className={cn(badgeBase, badgeTones.warning)} title="Срочно">
              <Flame className="h-2.5 w-2.5" />
            </span>
          ) : null}
          {lead.isDuplicate ? (
            <span className={cn(badgeBase, badgeTones.muted)} title="Возможный дубль">
              <Copy className="h-2.5 w-2.5" />
            </span>
          ) : null}
          {lead.missingFields && lead.missingFields.length > 0 ? (
            <span className={cn(badgeBase, badgeTones.caution)} title="Не хватает данных">
              <AlertTriangle className="h-2.5 w-2.5" />
            </span>
          ) : null}
          {lead.isStale ? (
            <span className={cn(badgeBase, badgeTones.muted)} title="Зависший">
              <Clock className="h-2.5 w-2.5" />
            </span>
          ) : null}
          {lead.hasNoContact ? (
            <span className={cn(badgeBase, badgeTones.muted)} title="Без контакта">
              <PhoneOff className="h-2.5 w-2.5" />
            </span>
          ) : null}
          {lead.hasConflict ? (
            <span className={cn(badgeBase, badgeTones.warning)} title="Конфликт брони">
              !
            </span>
          ) : null}
        </div>
      </div>

      <div className="truncate px-3 text-muted-foreground" onClick={(e) => e.stopPropagation()}>
        <PhoneLink value={lead.phone} />
      </div>
      <div className="truncate px-3">{lead.equipmentType}</div>
      <div className="truncate px-3 text-muted-foreground">
        {formatDateTime(lead.date, lead.timeWindow)}
      </div>
      <div className="truncate px-3 text-muted-foreground">{lead.address ?? '—'}</div>
      <div className="truncate px-3">{lead.manager}</div>
      <div className="truncate px-3 text-muted-foreground">{lead.lastActivity}</div>

      <div className="flex items-center justify-end pr-2 opacity-0 transition-opacity group-hover:opacity-100">
        <DropdownMenu>
          <DropdownMenuTrigger
            onClick={(e) => e.stopPropagation()}
            className="flex h-6 w-6 items-center justify-center rounded hover:bg-accent"
            aria-label="Действия"
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            onClick={(e) => e.stopPropagation()}
            className="text-[12px]"
          >
            <DropdownMenuItem onSelect={onClick}>Открыть</DropdownMenuItem>
            {canConvert && onConvertToApplication ? (
              <DropdownMenuItem onSelect={onConvertToApplication}>
                <ArrowRightCircle className="mr-1 h-3.5 w-3.5" /> Перевести в заявку
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuItem>
              <Phone className="mr-1 h-3.5 w-3.5" /> Позвонить
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Показать дубликаты</DropdownMenuItem>
            <DropdownMenuItem>Сменить менеджера</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
