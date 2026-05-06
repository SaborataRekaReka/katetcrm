import { useState } from 'react';
import { Lead, StageType } from '../../types/kanban';
import { LeadKanbanCard } from './LeadKanbanCard';
import { ApplicationKanbanCard } from './ApplicationKanbanCard';
import { ReservationKanbanCard } from './ReservationKanbanCard';
import { DepartureKanbanCard } from './DepartureKanbanCard';
import { CompletedKanbanCard } from './CompletedKanbanCard';
import { UnqualifiedKanbanCard } from './UnqualifiedKanbanCard';
import { KanbanAddCard } from './KanbanAddCard';
import { cn } from '../ui/utils';

type Props = {
  title: string;
  stage: StageType;
  leads: Lead[];
  color: string;
  onCardClick?: (lead: Lead) => void;
  onCardDragStart?: (lead: Lead) => void;
  onCardDragEnd?: () => void;
  /** Колонка — валидная цель для drop (подсветить зелёным пунктиром). */
  dropActive?: boolean;
  /** Колонка — НЕ валидная цель (подсветить красным, запретить drop). */
  dropDisabled?: boolean;
  onColumnDrop?: () => void;
};

export function LeadsKanbanColumn({
  title,
  stage,
  leads,
  color,
  onCardClick,
  onCardDragStart,
  onCardDragEnd,
  dropActive,
  dropDisabled,
  onColumnDrop,
}: Props) {
  const [isOver, setIsOver] = useState(false);

  const dragProps = (lead: Lead) =>
    onCardDragStart
      ? {
          draggable: true,
          onDragStart: (e: React.DragEvent) => {
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', lead.id);
            onCardDragStart(lead);
          },
          onDragEnd: () => onCardDragEnd?.(),
        }
      : {};

  const renderCard = (lead: Lead) => {
    const props = {
      lead,
      onClick: () => onCardClick?.(lead),
      ...dragProps(lead),
    };
    switch (stage) {
      case 'lead':
        return <LeadKanbanCard key={lead.id} {...props} />;
      case 'application':
        return <ApplicationKanbanCard key={lead.id} {...props} />;
      case 'reservation':
        return <ReservationKanbanCard key={lead.id} {...props} />;
      case 'departure':
        return <DepartureKanbanCard key={lead.id} {...props} />;
      case 'completed':
        return <CompletedKanbanCard key={lead.id} {...props} />;
      case 'unqualified':
        return <UnqualifiedKanbanCard key={lead.id} {...props} />;
      default:
        return null;
    }
  };

  return (
    <div
      onDragOver={(e) => {
        if (dropActive) {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
          if (!isOver) setIsOver(true);
        }
      }}
      onDragLeave={() => setIsOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsOver(false);
        if (dropActive) onColumnDrop?.();
      }}
      className={cn(
        'flex h-full w-[272px] shrink-0 flex-col rounded-lg bg-[#f1f2f4]/60 transition-colors',
        dropActive && 'ring-1 ring-emerald-300/60 bg-emerald-50/40',
        dropActive && isOver && 'ring-2 ring-emerald-400 bg-emerald-50/70',
        dropDisabled && 'opacity-60',
      )}
    >
      <div className="flex h-8 shrink-0 items-center justify-between px-2.5">
        <div className="flex items-center gap-1.5">
          <span className={cn('h-2 w-2 rounded-full', color)} />
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-foreground/80">
            {title}
          </h3>
          <span className="text-[11px] text-muted-foreground">{leads.length}</span>
        </div>
      </div>

      <div className="scroll-xthin flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto overflow-x-hidden px-1.5 pb-2">
        {leads.length === 0 ? (
          <div className="flex h-20 items-center justify-center text-[11px] text-muted-foreground">
            Нет записей
          </div>
        ) : (
          leads.map(renderCard)
        )}
        {stage === 'lead' && <KanbanAddCard />}
      </div>
    </div>
  );
}
