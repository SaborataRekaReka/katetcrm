import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Button } from '../ui/button';
import { useCancelApplication } from '../../hooks/useApplicationMutations';

type CancelApplicationDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  applicationId: string | null;
  applicationNumber: string | null;
  onDone?: () => void;
};

export function CancelApplicationDialog({
  open,
  onOpenChange,
  applicationId,
  applicationNumber,
  onDone,
}: CancelApplicationDialogProps) {
  const [reason, setReason] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const mutation = useCancelApplication();

  useEffect(() => {
    if (open) {
      setReason('');
      setSubmitError(null);
      mutation.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const canSubmit = !mutation.isPending && !!applicationId;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || !applicationId) return;
    setSubmitError(null);
    try {
      await mutation.mutateAsync({
        id: applicationId,
        reason: reason.trim() || undefined,
      });
      onOpenChange(false);
      onDone?.();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Не удалось отменить заявку');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>
            Отменить заявку{applicationNumber ? ` ${applicationNumber}` : ''}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="text-[12px] text-gray-600">
            Заявка будет переведена в статус «Отменена» и станет неактивной.
            Нельзя отменить, если у позиций есть активные брони.
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cancel-app-reason">Причина (необязательно)</Label>
            <Textarea
              id="cancel-app-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="Например: клиент отказался, дубль, ошибочная заявка"
            />
          </div>
          {submitError ? (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-700">
              {submitError}
            </div>
          ) : null}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={mutation.isPending}
            >
              Не отменять
            </Button>
            <Button type="submit" disabled={!canSubmit} variant="destructive">
              {mutation.isPending ? 'Отменяем…' : 'Отменить заявку'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
