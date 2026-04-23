import { Lead, StageType } from '../../types/kanban';
import { DenseDataTable, DenseColumn } from './DenseDataTable';
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
  Phone,
  ArrowRightCircle,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { PhoneLink } from '../detail/ContactAtoms';

const STAGE_META: Record<StageType, { title: string; color: string }> = {
  lead: { title: 'Лид', color: 'bg-[#7B68EE]' },
  application: { title: 'Заявка', color: 'bg-[#4A90E2]' },
  reservation: { title: 'Бронь', color: 'bg-[#F5A623]' },
  departure: { title: 'Выезд', color: 'bg-[#50C878]' },
  completed: { title: 'Завершено', color: 'bg-[#9B9B9B]' },
  unqualified: { title: 'Некачественный', color: 'bg-[#E74C3C]' },
};

function fmtDate(d?: string) {
  if (!d) return '—';
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return d;
  return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
}

interface LeadsTableViewProps {
  leads: Lead[];
  onRowClick: (lead: Lead) => void;
  onConvertToApplication?: (lead: Lead) => void;
  isFiltered?: boolean;
}

export function LeadsTableView({ leads, onRowClick, onConvertToApplication, isFiltered }: LeadsTableViewProps) {
  const columns: DenseColumn<Lead>[] = [
    {
      id: 'client',
      header: 'Имя',
      width: 220,
      sortValue: (l) => l.client.toLowerCase(),
      cell: (l) => (
        <div className="flex min-w-0 items-center gap-2">
          <span
            className={cn('inline-block h-2 w-2 shrink-0 rounded-full', STAGE_META[l.stage].color)}
          />
          <span className="truncate font-medium text-foreground">{l.client}</span>
        </div>
      ),
    },
    {
      id: 'company',
      header: 'Компания',
      width: 180,
      sortValue: (l) => (l.company ?? '').toLowerCase(),
      cell: (l) => <span className="truncate text-muted-foreground">{l.company ?? '—'}</span>,
      hideable: true,
    },
    {
      id: 'stage',
      header: 'Статус',
      width: 140,
      sortValue: (l) => l.stage,
      cell: (l) => (
        <span className={cn(badgeBase, badgeTones.muted)}>
          <span className={cn('mr-1 inline-block h-1.5 w-1.5 rounded-full', STAGE_META[l.stage].color)} />
          {STAGE_META[l.stage].title}
        </span>
      ),
    },
    {
      id: 'source',
      header: 'Источник',
      width: 120,
      sortValue: (l) => l.sourceChannel ?? l.source ?? '',
      cell: (l) => <SourceBadge source={l.source} channel={l.sourceChannel} />,
    },
    {
      id: 'phone',
      header: 'Телефон',
      width: 180,
      sortValue: (l) => l.phone,
      cell: (l) => <div onClick={(e) => e.stopPropagation()}><PhoneLink value={l.phone} className="text-muted-foreground" /></div>,
    },
    {
      id: 'equipment',
      header: 'Тип техники',
      width: 160,
      sortValue: (l) => l.equipmentType,
      cell: (l) => <span className="truncate">{l.equipmentType}</span>,
    },
    {
      id: 'date',
      header: 'Дата',
      width: 90,
      sortValue: (l) => l.date ?? '',
      cell: (l) => <span className="text-muted-foreground">{fmtDate(l.date)}</span>,
    },
    {
      id: 'time',
      header: 'Время',
      width: 110,
      sortValue: (l) => l.timeWindow ?? '',
      cell: (l) => <span className="text-muted-foreground">{l.timeWindow ?? '—'}</span>,
      defaultVisible: true,
      hideable: true,
    },
    {
      id: 'address',
      header: 'Адрес',
      width: 220,
      sortValue: (l) => l.address ?? '',
      cell: (l) => <span className="truncate text-muted-foreground">{l.address ?? '—'}</span>,
    },
    {
      id: 'manager',
      header: 'Менеджер',
      width: 140,
      sortValue: (l) => l.manager,
      cell: (l) => <span className="truncate">{l.manager}</span>,
    },
    {
      id: 'lastActivity',
      header: 'Активность',
      width: 130,
      sortValue: (l) => l.lastActivity,
      cell: (l) => <span className="truncate text-muted-foreground">{l.lastActivity}</span>,
    },
    {
      id: 'warnings',
      header: 'Дубль / Флаги',
      width: 150,
      sortValue: (l) => Number(!!l.isDuplicate) + Number(!!l.isUrgent) + Number(!!l.isStale),
      cell: (l) => (
        <div className="flex items-center gap-1">
          {l.isUrgent ? (
            <span className={cn(badgeBase, badgeTones.warning)} title="Срочно">
              <Flame className="h-2.5 w-2.5" />
            </span>
          ) : null}
          {l.isDuplicate ? (
            <span className={cn(badgeBase, badgeTones.muted)} title="Возможный дубль">
              <Copy className="h-2.5 w-2.5" /> Дубль
            </span>
          ) : null}
          {l.missingFields && l.missingFields.length > 0 ? (
            <span className={cn(badgeBase, badgeTones.caution)} title="Не хватает данных">
              <AlertTriangle className="h-2.5 w-2.5" />
            </span>
          ) : null}
          {l.isStale ? (
            <span className={cn(badgeBase, badgeTones.muted)} title="Зависший">
              <Clock className="h-2.5 w-2.5" />
            </span>
          ) : null}
          {l.hasNoContact ? (
            <span className={cn(badgeBase, badgeTones.muted)} title="Без контакта">
              <PhoneOff className="h-2.5 w-2.5" />
            </span>
          ) : null}
          {l.hasConflict ? (
            <span className={cn(badgeBase, badgeTones.warning)} title="Конфликт">
              !
            </span>
          ) : null}
        </div>
      ),
    },
    {
      id: 'channel',
      header: 'Канал',
      width: 110,
      defaultVisible: false,
      sortValue: (l) => l.sourceChannel ?? '',
      cell: (l) => <span className="truncate text-muted-foreground">{l.sourceChannel ?? '—'}</span>,
    },
    {
      id: 'closeReason',
      header: 'Причина закрытия',
      width: 180,
      defaultVisible: false,
      sortValue: (l) => l.unqualifiedReason ?? l.completionReason ?? '',
      cell: (l) => (
        <span className="truncate text-muted-foreground">
          {l.unqualifiedReason ?? l.completionReason ?? '—'}
        </span>
      ),
    },
    {
      id: 'actions',
      header: '',
      width: 44,
      stickyRight: true,
      hideable: false,
      cell: (l) => {
        const canConvert = l.stage === 'lead' && !(l.missingFields && l.missingFields.length > 0);
        return (
          <div className="flex w-full justify-end">
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
                <DropdownMenuItem onSelect={() => onRowClick(l)}>Открыть</DropdownMenuItem>
                {canConvert && onConvertToApplication ? (
                  <DropdownMenuItem onSelect={() => onConvertToApplication(l)}>
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
        );
      },
    },
  ];

  return (
    <DenseDataTable
      columns={columns}
      rows={leads}
      getRowId={(l) => l.id}
      onRowClick={onRowClick}
      storageKey="katet-crm.leads-table.v1"
      emptyMessage={
        isFiltered ? 'Нет лидов по выбранным фильтрам' : 'Лидов пока нет'
      }
    />
  );
}
