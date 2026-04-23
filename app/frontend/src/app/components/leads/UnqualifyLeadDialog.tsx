import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Button } from '../ui/button';
import { useChangeLeadStage } from '../../hooks/useLeadMutations';

type UnqualifyLeadDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId: string | null;
  onDone?: () => void;
};

export function UnqualifyLeadDialog({
  open,
  onOpenChange,
  leadId,
  onDone,
}: UnqualifyLeadDialogProps) {
  const [reason, setReason] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const mutation = useChangeLeadStage();

  useEffect(() => {
    if (open) {
      setReason('');
      setSubmitError(null);
      mutation.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const canSubmit = reason.trim().length >= 3 && !mutation.isPending && !!leadId;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || !leadId) return;
    setSubmitError(null);
    try {
      await mutation.mutateAsync({ id: leadId, stage: 'unqualified', reason: reason.trim() });
      onOpenChange(false);
      onDone?.();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Не удалось дисквалифицировать');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>Пометить некачественным</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="unqual-reason">Причина *</Label>
            <Textarea
              id="unqual-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              minLength={3}
              required
              placeholder="Например: не целевой клиент, дубль, отказ"
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
              Отмена
            </Button>
            <Button type="submit" disabled={!canSubmit} variant="destructive">
              {mutation.isPending ? 'Сохраняем…' : 'Пометить'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
