import { useEffect, useMemo, useState } from 'react';
import { Bug, CheckCircle2, Send } from 'lucide-react';
import { Button } from '../ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Textarea } from '../ui/textarea';
import { useCreateBugReportMutation } from '../../hooks/useBugReportMutations';

type BugSeverity = 'low' | 'normal' | 'high' | 'blocker';

const SEVERITY_LABEL: Record<BugSeverity, string> = {
  low: 'Низкая',
  normal: 'Обычная',
  high: 'Высокая',
  blocker: 'Блокер',
};

type BugReportDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function BugReportDialog({ open, onOpenChange }: BugReportDialogProps) {
  const [title, setTitle] = useState('');
  const [severity, setSeverity] = useState<BugSeverity>('normal');
  const [description, setDescription] = useState('');
  const [steps, setSteps] = useState('');
  const [expected, setExpected] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const createMutation = useCreateBugReportMutation();

  useEffect(() => {
    if (!open) return;
    setSent(false);
    setError(null);
  }, [open]);

  const route = useMemo(() => {
    if (typeof window === 'undefined') return '';
    return `${window.location.pathname}${window.location.search}`;
  }, [open]);

  const canSend =
    title.trim().length >= 3
    && description.trim().length >= 5
    && !createMutation.isPending;

  const submit = async () => {
    if (!canSend) return;
    setError(null);
    setSent(false);

    try {
      await createMutation.mutateAsync({
        title: title.trim(),
        description: description.trim(),
        steps: steps.trim() || undefined,
        expected: expected.trim() || undefined,
        routePath: route || undefined,
        severity,
      });
      setTitle('');
      setDescription('');
      setSteps('');
      setExpected('');
      setSeverity('normal');
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось сохранить сообщение о баге');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[560px] gap-4 p-5">
        <DialogHeader className="gap-1.5">
          <DialogTitle className="flex items-center gap-2 text-[15px]">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[var(--brand-accent-soft)] text-[var(--brand-accent)]">
              <Bug className="h-4 w-4" />
            </span>
            Сообщить о баге
          </DialogTitle>
          <DialogDescription className="text-[12px]">
            Сообщение попадёт в раздел «Контроль → Сообщения о багах» для администратора.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label className="text-[12px]" htmlFor="bug-title">Кратко *</Label>
            <Input
              id="bug-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="h-8 text-[12px] focus-visible:border-[var(--brand-accent)] focus-visible:ring-[var(--brand-accent-border)]"
              placeholder="Например: не сохраняется позиция заявки"
            />
          </div>

          <div className="grid gap-1.5">
            <Label className="text-[12px]">Критичность</Label>
            <Select value={severity} onValueChange={(value) => setSeverity(value as BugSeverity)}>
              <SelectTrigger className="h-8 text-[12px] focus-visible:border-[var(--brand-accent)] focus-visible:ring-[var(--brand-accent-border)]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(SEVERITY_LABEL) as BugSeverity[]).map((key) => (
                  <SelectItem key={key} value={key}>{SEVERITY_LABEL[key]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-1.5">
            <Label className="text-[12px]" htmlFor="bug-description">Описание *</Label>
            <Textarea
              id="bug-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className="min-h-24 text-[12px] focus-visible:border-[var(--brand-accent)] focus-visible:ring-[var(--brand-accent-border)]"
              placeholder="Что сломалось и что видно на экране"
            />
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label className="text-[12px]" htmlFor="bug-steps">Шаги</Label>
              <Textarea
                id="bug-steps"
                value={steps}
                onChange={(event) => setSteps(event.target.value)}
                className="min-h-20 text-[12px] focus-visible:border-[var(--brand-accent)] focus-visible:ring-[var(--brand-accent-border)]"
              />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-[12px]" htmlFor="bug-expected">Ожидание</Label>
              <Textarea
                id="bug-expected"
                value={expected}
                onChange={(event) => setExpected(event.target.value)}
                className="min-h-20 text-[12px] focus-visible:border-[var(--brand-accent)] focus-visible:ring-[var(--brand-accent-border)]"
              />
            </div>
          </div>

          {sent ? (
            <div className="flex items-center gap-2 rounded-md border border-[var(--brand-accent-border)] bg-[var(--brand-accent-soft)] px-3 py-2 text-[12px] text-[var(--brand-accent-foreground)]">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Сообщение сохранено.
            </div>
          ) : null}

          {error ? (
            <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-[12px] text-rose-700">
              {error}
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Закрыть
          </Button>
          <Button
            size="sm"
            className="bg-[var(--brand-accent)] text-white hover:bg-[var(--brand-accent-hover)]"
            onClick={submit}
            disabled={!canSend}
          >
            <Send className="h-3.5 w-3.5" />
            {createMutation.isPending ? 'Сохраняем…' : 'Отправить'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}