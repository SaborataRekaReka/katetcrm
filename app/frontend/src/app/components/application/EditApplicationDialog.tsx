import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Button } from '../ui/button';
import { Checkbox } from '../ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { useUpdateApplication } from '../../hooks/useApplicationMutations';
import type { Application } from '../../types/application';

type EditApplicationDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  application: Application | null;
};

type FormState = {
  requestedDate: string;
  requestedTimeFrom: string;
  requestedTimeTo: string;
  address: string;
  comment: string;
  isUrgent: boolean;
  deliveryMode: 'pickup' | 'delivery' | 'none';
  nightWork: boolean;
};

function applicationToForm(app: Application): FormState {
  return {
    requestedDate: app.requestedDate ?? '',
    requestedTimeFrom: app.requestedTimeFrom ?? '',
    requestedTimeTo: app.requestedTimeTo ?? '',
    address: app.address ?? '',
    comment: app.comment ?? '',
    isUrgent: app.isUrgent,
    deliveryMode: app.deliveryMode ?? 'none',
    nightWork: app.nightWork,
  };
}

export function EditApplicationDialog({ open, onOpenChange, application }: EditApplicationDialogProps) {
  const [form, setForm] = useState<FormState | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const mutation = useUpdateApplication();

  useEffect(() => {
    if (open && application) {
      setForm(applicationToForm(application));
      setSubmitError(null);
      mutation.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, application?.id]);

  if (!form || !application) return null;

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));

  const canSubmit = !mutation.isPending;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitError(null);

    // PATCH-семантика бэка: undefined = не менять. null/clear в этом DTO не поддерживается,
    // поэтому при пустом значении просто не отправляем соответствующее поле.
    const patch: Record<string, unknown> = {};
    if (form.requestedDate) patch.requestedDate = form.requestedDate;
    if (form.requestedTimeFrom) patch.requestedTimeFrom = form.requestedTimeFrom;
    if (form.requestedTimeTo) patch.requestedTimeTo = form.requestedTimeTo;
    if (form.address.trim()) patch.address = form.address.trim();
    if (form.comment.trim()) patch.comment = form.comment.trim();
    if (form.deliveryMode !== 'none') patch.deliveryMode = form.deliveryMode;
    patch.isUrgent = form.isUrgent;
    patch.nightWork = form.nightWork;

    try {
      await mutation.mutateAsync({ id: application.id, patch });
      onOpenChange(false);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Не удалось сохранить заявку');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Редактировать заявку {application.number}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-app-date">Плановая дата</Label>
              <Input
                id="edit-app-date"
                type="date"
                value={form.requestedDate}
                onChange={(e) => set('requestedDate', e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-app-from">С</Label>
              <Input
                id="edit-app-from"
                type="time"
                value={form.requestedTimeFrom}
                onChange={(e) => set('requestedTimeFrom', e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-app-to">До</Label>
              <Input
                id="edit-app-to"
                type="time"
                value={form.requestedTimeTo}
                onChange={(e) => set('requestedTimeTo', e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-app-address">Адрес</Label>
            <Input
              id="edit-app-address"
              value={form.address}
              onChange={(e) => set('address', e.target.value)}
              placeholder="Москва, ..."
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-app-comment">Комментарий</Label>
            <Textarea
              id="edit-app-comment"
              value={form.comment}
              onChange={(e) => set('comment', e.target.value)}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Доставка</Label>
              <Select value={form.deliveryMode} onValueChange={(v) => set('deliveryMode', v as FormState['deliveryMode'])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Не выбрано</SelectItem>
                  <SelectItem value="pickup">Самовывоз</SelectItem>
                  <SelectItem value="delivery">Доставка</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end gap-4 pb-1">
              <label className="flex items-center gap-2 text-[13px] text-gray-700">
                <Checkbox
                  checked={form.isUrgent}
                  onCheckedChange={(v) => set('isUrgent', v === true)}
                />
                Срочно
              </label>
              <label className="flex items-center gap-2 text-[13px] text-gray-700">
                <Checkbox
                  checked={form.nightWork}
                  onCheckedChange={(v) => set('nightWork', v === true)}
                />
                Ночные работы
              </label>
            </div>
          </div>

          {submitError ? (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-700">
              {submitError}
            </div>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
              Отмена
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              {mutation.isPending ? 'Сохраняем…' : 'Сохранить'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
