import { useEffect, useMemo, useState } from 'react';
import { CalendarClock, Search } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { useCreateReservation } from '../../hooks/useReservationMutations';
import type { SourcingType } from '../../lib/applicationsApi';

export interface ReservationCreateCandidate {
  applicationItemId: string;
  applicationId: string;
  applicationNumber: string;
  clientName: string;
  equipmentTypeLabel: string;
  equipmentTypeId: string | null;
  address: string | null;
  plannedDate: string | null;
  plannedTimeFrom: string | null;
  plannedTimeTo: string | null;
}

interface CreateReservationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidates: ReservationCreateCandidate[];
  onCreated?: (reservationId: string) => void;
}

function tomorrowIsoDate() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

function combineIso(date: string, time: string): string {
  return new Date(`${date}T${time}:00`).toISOString();
}

function sourceToStage(source: SourcingType) {
  if (source === 'own') return 'searching_own_equipment';
  if (source === 'subcontractor') return 'searching_subcontractor';
  return 'needs_source_selection';
}

export function CreateReservationDialog({
  open,
  onOpenChange,
  candidates,
  onCreated,
}: CreateReservationDialogProps) {
  const createMutation = useCreateReservation();

  const [query, setQuery] = useState('');
  const [selectedItemId, setSelectedItemId] = useState('');
  const [source, setSource] = useState<SourcingType>('undecided');
  const [date, setDate] = useState(tomorrowIsoDate());
  const [timeFrom, setTimeFrom] = useState('09:00');
  const [timeTo, setTimeTo] = useState('18:00');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const first = candidates[0];
    setQuery('');
    setSelectedItemId(first?.applicationItemId ?? '');
    setSource('undecided');
    setDate(first?.plannedDate?.slice(0, 10) ?? tomorrowIsoDate());
    setTimeFrom(first?.plannedTimeFrom ?? '09:00');
    setTimeTo(first?.plannedTimeTo ?? '18:00');
    setError(null);
    createMutation.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, candidates.length]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows = q
      ? candidates.filter((c) =>
          `${c.applicationNumber} ${c.clientName} ${c.equipmentTypeLabel} ${c.address ?? ''}`
            .toLowerCase()
            .includes(q),
        )
      : candidates;
    return rows.slice(0, 80);
  }, [candidates, query]);

  const selected =
    candidates.find((c) => c.applicationItemId === selectedItemId) ?? filtered[0] ?? null;

  const canCreate = !!selected && !!date && !!timeFrom && !!timeTo && !createMutation.isPending;

  const submit = async () => {
    setError(null);
    if (!canCreate || !selected) return;

    try {
      const created = await createMutation.mutateAsync({
        applicationItemId: selected.applicationItemId,
        sourcingType: source,
        equipmentTypeId: selected.equipmentTypeId ?? undefined,
        plannedStart: combineIso(date, timeFrom),
        plannedEnd: combineIso(date, timeTo),
        internalStage: sourceToStage(source),
      });
      onCreated?.(created.id);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось создать бронь');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Новая бронь</DialogTitle>
          <DialogDescription>
            Выберите позицию заявки, источник и окно брони. Создание доступно только для позиций без активной брони.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <div className="text-[11px] text-muted-foreground">Позиция заявки</div>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Найти по клиенту, заявке или технике"
                className="pl-7"
              />
            </div>
            <select
              className="h-8 w-full rounded border border-input bg-background px-2 text-[12px]"
              value={selected?.applicationItemId ?? ''}
              onChange={(e) => setSelectedItemId(e.target.value)}
            >
              {filtered.map((c) => (
                <option key={c.applicationItemId} value={c.applicationItemId}>
                  {c.applicationNumber} · {c.clientName} · {c.equipmentTypeLabel}
                </option>
              ))}
            </select>
            {selected ? (
              <div className="text-[11px] text-muted-foreground">
                {selected.address ? `Адрес: ${selected.address}` : 'Адрес не указан'}
              </div>
            ) : (
              <div className="text-[11px] text-muted-foreground">Нет доступных позиций для бронирования</div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="space-y-1">
              <span className="text-[11px] text-muted-foreground">Источник</span>
              <select
                className="h-8 w-full rounded border border-input bg-background px-2 text-[12px]"
                value={source}
                onChange={(e) => setSource(e.target.value as SourcingType)}
              >
                <option value="undecided">Не выбран</option>
                <option value="own">Свой парк</option>
                <option value="subcontractor">Подрядчик</option>
              </select>
            </label>

            <label className="space-y-1">
              <span className="text-[11px] text-muted-foreground">Дата</span>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </label>

            <label className="space-y-1">
              <span className="text-[11px] text-muted-foreground">С</span>
              <Input type="time" value={timeFrom} onChange={(e) => setTimeFrom(e.target.value)} />
            </label>

            <label className="space-y-1">
              <span className="text-[11px] text-muted-foreground">До</span>
              <Input type="time" value={timeTo} onChange={(e) => setTimeTo(e.target.value)} />
            </label>
          </div>

          {error ? (
            <div className="rounded border border-rose-200 bg-rose-50 px-3 py-2 text-[12px] text-rose-700">
              {error}
            </div>
          ) : null}

          <div className="flex items-center justify-end gap-2 pt-1">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button onClick={() => void submit()} disabled={!canCreate} className="gap-1">
              <CalendarClock className="h-3.5 w-3.5" />
              {createMutation.isPending ? 'Создаём…' : 'Создать бронь'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
