import { Plus } from 'lucide-react';

interface KanbanAddCardProps {
  onClick?: () => void;
}

export function KanbanAddCard({ onClick }: KanbanAddCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-center gap-1 rounded-md border-2 border-dashed border-[var(--brand-accent-border)] bg-white/70 p-2 text-xs text-[var(--brand-accent)] transition-colors hover:border-[var(--brand-accent)] hover:bg-[var(--brand-accent-soft)]"
    >
      <Plus className="w-3 h-3" />
      <span>Добавить лид</span>
    </button>
  );
}
