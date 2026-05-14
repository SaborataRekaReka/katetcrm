import { RotateCcw, Trash2 } from 'lucide-react';
import { useAuth } from '../../auth/AuthProvider';
import type { LeadApi } from '../../lib/leadsApi';
import {
  useDeleteLeadChain,
  useRollbackLeadStage,
} from '../../hooks/useLeadMutations';
import { Button } from '../ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '../ui/alert-dialog';

interface LifecycleRollbackActionsProps {
  leadId?: string | null;
  canRollback?: boolean;
  onRollbackSuccess?: (lead: LeadApi) => void;
  onChainDeleted?: () => void;
  onError?: (message: string) => void;
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export function LifecycleRollbackActions({
  leadId,
  canRollback = true,
  onRollbackSuccess,
  onChainDeleted,
  onError,
}: LifecycleRollbackActionsProps) {
  const { user } = useAuth();
  const rollbackMutation = useRollbackLeadStage();
  const deleteChainMutation = useDeleteLeadChain();
  const isAdmin = user?.role === 'admin';
  const busy = rollbackMutation.isPending || deleteChainMutation.isPending;
  const rollbackDisabled = !leadId || !canRollback || busy;
  const chainDisabled = !leadId || busy;

  const handleRollback = async () => {
    if (!leadId || rollbackDisabled) return;
    try {
      const fresh = await rollbackMutation.mutateAsync({
        id: leadId,
        reason: 'ui_rollback',
      });
      onRollbackSuccess?.(fresh);
    } catch (error) {
      onError?.(getErrorMessage(error, 'Не удалось откатить стадию'));
    }
  };

  const handleDeleteChain = async () => {
    if (!leadId || chainDisabled) return;
    try {
      await deleteChainMutation.mutateAsync({
        id: leadId,
        reason: 'ui_delete_chain',
      });
      onChainDeleted?.();
    } catch (error) {
      onError?.(getErrorMessage(error, 'Не удалось удалить цепочку'));
    }
  };

  return (
    <div className="flex items-center gap-1.5">
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            size="sm"
            variant="outline"
            className="h-7 gap-1 text-[11px]"
            disabled={rollbackDisabled}
          >
            <RotateCcw className="h-3 w-3" />
            {rollbackMutation.isPending ? 'Откатываем...' : 'Откатить стадию'}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Откатить текущую стадию?</AlertDialogTitle>
            <AlertDialogDescription>
              Текущее представление будет удалено, цепочка вернется на предыдущий этап. Запись действия останется в журнале.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleRollback()} disabled={rollbackDisabled}>
              Откатить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {isAdmin ? (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              size="sm"
              variant="outline"
              className="h-7 gap-1 border-red-200 text-[11px] text-red-700 hover:bg-red-50 hover:text-red-800"
              disabled={chainDisabled}
            >
              <Trash2 className="h-3 w-3" />
              {deleteChainMutation.isPending ? 'Удаляем...' : 'Удалить цепочку'}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Удалить всю CRM-цепочку?</AlertDialogTitle>
              <AlertDialogDescription>
                Будут удалены лид, заявка, позиции, брони, выезды и завершения. Клиент, контакты и журнал аудита сохранятся.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={busy}>Отмена</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => void handleDeleteChain()}
                disabled={chainDisabled}
                className="bg-red-600 text-white hover:bg-red-700"
              >
                Удалить цепочку
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : null}
    </div>
  );
}