import { useState } from 'react';
import { Lead, StageType, KanbanColumn } from '../../types/kanban';
import { LeadsKanbanColumn } from './LeadsKanbanColumn';
import { STAGE_ORDER, STAGE_LABEL, STAGE_BAR } from '../../lib/stageTokens';
import { useChangeLeadStage } from '../../hooks/useLeadMutations';
import { USE_API } from '../../lib/featureFlags';

type Props = {
  leads: Lead[];
  onCardClick?: (lead: Lead) => void;
};

const COLUMNS: KanbanColumn[] = STAGE_ORDER.map((id) => ({
  id,
  title: STAGE_LABEL[id],
  count: 0,
  color: STAGE_BAR[id],
}));

// Допустимые переходы (зеркалит бэкенд ALLOWED_TRANSITIONS). Поддерживаем
// одношаговый drop между соседними стадиями + в «некачественный» с любой
// активной стадии. Обратные drops запрещены — столбец не подсвечивается.
const ALLOWED: Record<StageType, StageType[]> = {
  lead: ['application', 'unqualified'],
  application: ['reservation', 'unqualified'],
  reservation: ['departure', 'unqualified'],
  departure: ['completed', 'unqualified'],
  completed: [],
  unqualified: [],
};

export function LeadsKanbanBoard({ leads, onCardClick }: Props) {
  const changeStage = useChangeLeadStage();
  const [dragging, setDragging] = useState<Lead | null>(null);
  const [dragError, setDragError] = useState<string | null>(null);

  const byStage = (stage: StageType) => leads.filter((l) => l.stage === stage);

  const canDropOn = (target: StageType): boolean => {
    if (!dragging) return false;
    if (dragging.stage === target) return false;
    return ALLOWED[dragging.stage]?.includes(target) ?? false;
  };

  const handleDropOn = async (target: StageType) => {
    if (!dragging || !USE_API) {
      setDragging(null);
      return;
    }
    const lead = dragging;
    setDragging(null);
    if (!canDropOn(target)) return;
    try {
      await changeStage.mutateAsync({ id: lead.id, stage: target });
      setDragError(null);
    } catch (err) {
      setDragError(
        err instanceof Error ? err.message : 'Не удалось сменить стадию',
      );
      setTimeout(() => setDragError(null), 4000);
    }
  };

  return (
    <div className="scroll-thin flex min-h-0 flex-1 overflow-x-auto overflow-y-hidden bg-[#fafbfc]">
      <div className="flex h-full min-w-full gap-2 p-3 relative">
        {dragError && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 z-20 rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-[11px] text-red-700 shadow-sm">
            {dragError}
          </div>
        )}
        {COLUMNS.map((c) => (
          <LeadsKanbanColumn
            key={c.id}
            title={c.title}
            stage={c.id}
            leads={byStage(c.id)}
            color={c.color}
            onCardClick={onCardClick}
            onCardDragStart={USE_API ? (lead) => setDragging(lead) : undefined}
            onCardDragEnd={USE_API ? () => setDragging(null) : undefined}
            dropActive={!!dragging && canDropOn(c.id)}
            dropDisabled={!!dragging && !canDropOn(c.id) && dragging.stage !== c.id}
            onColumnDrop={USE_API ? () => handleDropOn(c.id) : undefined}
          />
        ))}
      </div>
    </div>
  );
}
