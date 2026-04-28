import { useEffect, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Calendar,
  CheckCircle2,
  Copy,
  FileText,
  MapPin,
  Truck,
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog';
import { Textarea } from '../ui/textarea';
import { Input } from '../ui/input';
import { badgeBase, badgeTones } from '../kanban/badgeTokens';
import { ClientOrderHistoryItem } from '../../types/client';

interface RepeatOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  source: ClientOrderHistoryItem | null;
  clientName: string;
  defaultManager?: string;
  onConfirm: (payload: RepeatOrderPayload) => void;
}

export interface RepeatOrderPayload {
  date: string;
  time: string;
  address: string;
  note: string;
}

function nextStamp() {
  const d = new Date();
  d.setDate(d.getDate() + 3);
  return d.toISOString().slice(0, 10);
}

export function RepeatOrderDialog({
  open,
  onOpenChange,
  source,
  clientName,
  defaultManager,
  onConfirm,
}: RepeatOrderDialogProps) {
  const [date, setDate] = useState<string>(nextStamp());
  const [time, setTime] = useState<string>('09:00–18:00');
  const [address, setAddress] = useState<string>(source?.address ?? '');
  const [note, setNote] = useState<string>('');

  // Reset form when source changes
  useEffect(() => {
    setDate(nextStamp());
    setTime('09:00–18:00');
    setAddress(source?.address ?? '');
    setNote('');
  }, [source?.id]);

  const positionsCount = source?.positions.length ?? 0;

  if (!source) return null;

  const carryOver = [
    'Клиент',
    `Позиции (${positionsCount})`,
    'Типы техники',
    'Адрес (можно изменить)',
    'Заметки',
  ];

  const willNotCarry = [
    'Прошлые брони',
    'Прошлый выезд',
    'Completed-state',
    'Конфликты',
    'Фактические timestamps',
  ];

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="sm:max-w-xl">
        <AlertDialogHeader>
          <AlertDialogTitle>Повторить заказ {source.number}?</AlertDialogTitle>
          <AlertDialogDescription>
            Будет создана новая заявка для {clientName} по шаблону прошлого заказа.
            Активные операционные состояния не копируются — заявка стартует чистой.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-3">
          {/* Source summary */}
          <div className="border border-gray-200 rounded-md bg-gray-50/60 p-2.5">
            <div className="flex items-center gap-2 text-[11px] text-gray-700">
              <FileText className="w-3 h-3 text-gray-400" />
              <span className="text-gray-900">{source.number}</span>
              <span className="text-gray-400">·</span>
              <span className="text-gray-500">{source.date}</span>
              {source.amount && (
                <>
                  <span className="text-gray-400">·</span>
                  <span className="text-gray-500">{source.amount}</span>
                </>
              )}
            </div>
            <div className="mt-1 space-y-0.5">
              {source.positions.map((p, i) => (
                <div key={i} className="flex items-center gap-1.5 text-[11px] text-gray-700">
                  <Truck className="w-3 h-3 text-gray-400" />
                  <span>{p.equipmentType}</span>
                  <span className="text-gray-400">× {p.quantity}</span>
                  {p.unit && (
                    <span className="text-[10px] text-gray-500">· unit {p.unit}</span>
                  )}
                  {p.subcontractor && (
                    <span className="text-[10px] text-gray-500">· {p.subcontractor}</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Update fields */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-[11px] text-gray-500 mb-1 flex items-center gap-1">
                <Calendar className="w-3 h-3" /> Дата подачи
              </div>
              <Input
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="h-7 text-[12px]"
                placeholder="2026-04-25"
              />
            </div>
            <div>
              <div className="text-[11px] text-gray-500 mb-1 flex items-center gap-1">
                <Calendar className="w-3 h-3" /> Время подачи
              </div>
              <Input
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="h-7 text-[12px]"
                placeholder="09:00–18:00"
              />
            </div>
            <div className="col-span-2">
              <div className="text-[11px] text-gray-500 mb-1 flex items-center gap-1">
                <MapPin className="w-3 h-3" /> Адрес
              </div>
              <Input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="h-7 text-[12px]"
                placeholder="Адрес объекта"
              />
            </div>
          </div>

          {/* Comment */}
          <div>
            <div className="text-[11px] text-gray-500 mb-1">Заметка к новой заявке</div>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Например: согласовать пропуск, уточнить контакт на объекте…"
              className="text-[12px]"
            />
          </div>

          {/* What will / will not carry over */}
          <div className="grid grid-cols-2 gap-3">
            <div className="border border-emerald-200 rounded-md bg-emerald-50/40 p-2">
              <div className="flex items-center gap-1.5 text-[11px] text-emerald-900">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                <span>Скопируется</span>
              </div>
              <div className="mt-1 flex flex-wrap gap-1">
                {carryOver.map((c) => (
                  <span key={c} className={`${badgeBase} ${badgeTones.success}`}>
                    {c}
                  </span>
                ))}
              </div>
            </div>
            <div className="border border-gray-200 rounded-md bg-gray-50/60 p-2">
              <div className="flex items-center gap-1.5 text-[11px] text-gray-700">
                <AlertCircle className="w-3 h-3 text-gray-500" />
                <span>Не переносится</span>
              </div>
              <div className="mt-1 flex flex-wrap gap-1">
                {willNotCarry.map((c) => (
                  <span key={c} className={`${badgeBase} ${badgeTones.muted}`}>
                    {c}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Footer hint */}
          <div className="flex items-center gap-1 text-[10px] text-gray-500">
            <ArrowRight className="w-3 h-3 text-blue-500" />
            После создания откроется новый лид
            {defaultManager ? <> · ответственный <span className="text-gray-700">{defaultManager}</span></> : null}
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>Отмена</AlertDialogCancel>
          <AlertDialogAction
            onClick={() =>
              onConfirm({
                date,
                time,
                address,
                note,
              })
            }
          >
            <Copy className="w-3 h-3 mr-1" />
            Создать лид
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
