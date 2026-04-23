import { Plus } from 'lucide-react';

interface KanbanAddCardProps {
  onClick?: () => void;
}

export function KanbanAddCard({ onClick }: KanbanAddCardProps) {
  return (
    <button
      onClick={onClick}
      className="w-full border-2 border-dashed border-gray-300 rounded-md p-2 text-xs text-muted-foreground hover:border-gray-400 hover:text-gray-700 transition-colors flex items-center justify-center gap-1"
    >
      <Plus className="w-3 h-3" />
      <span>Добавить карточку</span>
    </button>
  );
}
