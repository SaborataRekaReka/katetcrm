import type React from 'react';
import { Application, ApplicationPosition, ApplicationActivity } from '../../types/application';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import {
  X,
  MoreHorizontal,
  User,
  Building2,
  Phone,
  Calendar,
  MapPin,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Truck,
  Copy,
  Edit,
  Trash2,
  Plus,
  FileText,
  ArrowRightCircle,
  Package,
  UserCheck,
} from 'lucide-react';
import { badgeBase, badgeTones } from '../kanban/badgeTokens';

interface ApplicationDetailViewProps {
  application: Application;
  activities: ApplicationActivity[];
  onClose: () => void;
}

type Stage = Application['stage'];

const STAGE_LABEL: Record<Stage, string> = {
  application: 'Заявка',
  reservation: 'В брони',
  departure: 'Выезд',
  completed: 'Завершена',
  cancelled: 'Отменена',
};

const STAGE_TONE: Record<Stage, string> = {
  application: badgeTones.progress,
  reservation: badgeTones.caution,
  departure: badgeTones.success,
  completed: badgeTones.muted,
  cancelled: badgeTones.warning,
};

function formatDate(value?: string) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('ru-RU', { day: '2-digit', month: 'long', year: 'numeric' });
}

function formatActivityTimestamp(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.toLocaleDateString('ru-RU')}, ${date.toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  })}`;
}

export function ApplicationDetailView({ application, activities, onClose }: ApplicationDetailViewProps) {
  const positions = application.positions;
  const totalPositions = positions.length;
  const queuedForReservation = positions.filter(p => p.status === 'no_reservation').length;
  const reservedPositions = positions.filter(p => p.status === 'reserved').length;
  const conflictPositions = positions.filter(p => p.reservationState === 'conflict' || p.status === 'conflict').length;
  const undecidedPositions = positions.filter(p => p.sourcingType === 'undecided').length;

  const ownCount = positions.filter(p => p.sourcingType === 'own').length;
  const subCount = positions.filter(p => p.sourcingType === 'subcontractor').length;
  const sourcingSummary =
    ownCount === totalPositions ? 'Своя техника'
    : subCount === totalPositions ? 'Подрядчик'
    : ownCount > 0 && subCount > 0 ? `Смешанный источник (${ownCount}/${subCount})`
    : undecidedPositions === totalPositions ? 'Источник не определён'
    : `${ownCount} своя · ${subCount} подрядчик · ${undecidedPositions} не определено`;

  const plannedDate = formatDate(application.requestedDate);
  const plannedWindow = [application.requestedTimeFrom, application.requestedTimeTo].filter(Boolean).join('–');

  const canGoToReservation = application.stage === 'application' && readyPositions > 0;
  const canGoToDeparture = application.stage === 'reservation' && reservedPositions === totalPositions && conflictPositions === 0;
  const canComplete = application.stage === 'departure';

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-start justify-between px-8 pt-7 pb-5 border-b border-gray-100">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className={`${badgeBase} ${STAGE_TONE[application.stage]}`}>
              <Package className="w-3 h-3" />
              {STAGE_LABEL[application.stage]}
            </span>
            {application.isUrgent && (
              <span className={`${badgeBase} ${badgeTones.warning}`}>
                <AlertTriangle className="w-3 h-3" />
                Срочно
              </span>
            )}
            {conflictPositions > 0 && (
              <span className={`${badgeBase} ${badgeTones.warning}`}>
                <AlertTriangle className="w-3 h-3" />
                Конфликт: {conflictPositions}
              </span>
            )}
          </div>
          <h1 className="text-2xl text-gray-900 leading-tight">Заявка {application.number}</h1>
          <div className="mt-1 text-sm text-gray-500">
            {application.clientName}
            {application.clientCompany ? ` · ${application.clientCompany}` : ''}
          </div>
        </div>

        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-gray-100 rounded">
            <MoreHorizontal className="w-4 h-4 text-gray-500" />
          </Button>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-gray-100 rounded" onClick={onClose}>
            <X className="w-4 h-4 text-gray-500" />
          </Button>
        </div>
      </div>

      {/* Summary pills */}
      <div className="px-8 py-4 border-b border-gray-100 flex flex-wrap gap-2 text-[11px] text-gray-600">
        <SummaryPill icon={<UserCheck className="w-3 h-3" />} label={application.responsibleManager} />
        <SummaryPill icon={<Phone className="w-3 h-3" />} label={application.clientPhone} />
        {plannedDate && (
          <SummaryPill
            icon={<Calendar className="w-3 h-3" />}
            label={plannedWindow ? `${plannedDate} · ${plannedWindow}` : plannedDate}
          />
        )}
        {application.address && <SummaryPill icon={<MapPin className="w-3 h-3" />} label={application.address} />}
        <SummaryPill
          icon={<Truck className="w-3 h-3" />}
          label={sourcingSummary}
          tone={undecidedPositions > 0 ? 'warning' : 'default'}
        />
        <SummaryPill
          icon={<CheckCircle2 className="w-3 h-3" />}
          label={`Ожидают брони: ${queuedForReservation} / ${totalPositions}`}
          tone={queuedForReservation === 0 ? 'success' : 'default'}
        />
        {reservedPositions > 0 && (
          <SummaryPill
            icon={<CheckCircle2 className="w-3 h-3" />}
            label={`В брони: ${reservedPositions} / ${totalPositions}`}
            tone="success"
          />
        )}
      </div>

      {/* Main */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="px-8 py-6 space-y-8">
          {/* Positions */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm text-gray-900">
                Позиции заявки <span className="text-gray-400">({totalPositions})</span>
              </h3>
              <Button variant="outline" size="sm" className="h-7 text-xs border-gray-300 hover:bg-gray-50">
                <Plus className="w-3 h-3 mr-1" />
                Добавить позицию
              </Button>
            </div>
            <div className="space-y-2.5">
              {positions.map(p => <PositionRow key={p.id} position={p} />)}
              {totalPositions === 0 && (
                <div className="text-sm text-gray-500 border border-dashed border-gray-200 rounded-md py-6 text-center">
                  В заявке пока нет позиций
                </div>
              )}
            </div>
          </section>

          {/* Comment */}
          {application.comment && (
            <section>
              <h3 className="text-sm text-gray-900 mb-2">Комментарий</h3>
              <div className="text-sm text-gray-700 bg-gray-50 border border-gray-100 rounded-md px-3 py-2.5 whitespace-pre-line">
                {application.comment}
              </div>
            </section>
          )}

          {/* Activity */}
          {activities.length > 0 && (
            <section>
              <h3 className="text-sm text-gray-900 mb-3">История</h3>
              <div className="space-y-3">
                {activities.map((a) => (
                  <div key={a.id} className="flex gap-3 text-sm">
                    <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                      <User className="w-3 h-3 text-gray-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-gray-900">{a.description}</div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {a.user} · {formatActivityTimestamp(a.timestamp)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </ScrollArea>

      {/* Footer actions */}
      <div className="border-t border-gray-100 px-8 py-3 flex items-center justify-between bg-white">
        <div className="text-[11px] text-gray-500">
          Последняя активность: {application.lastActivity}
        </div>
        <div className="flex items-center gap-2">
          {canGoToReservation && (
            <Button size="sm" className="h-8 text-xs">
              <ArrowRightCircle className="w-3.5 h-3.5 mr-1.5" />
              Перейти к брони
            </Button>
          )}
          {canGoToDeparture && (
            <Button size="sm" className="h-8 text-xs">
              <Truck className="w-3.5 h-3.5 mr-1.5" />
              Перевести в выезд
            </Button>
          )}
          {canComplete && (
            <Button size="sm" className="h-8 text-xs">
              <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
              Завершить
            </Button>
          )}
          {!canGoToReservation && !canGoToDeparture && !canComplete && (
            <Button size="sm" variant="outline" className="h-8 text-xs">
              <FileText className="w-3.5 h-3.5 mr-1.5" />
              Редактировать заявку
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function SummaryPill({
  icon,
  label,
  tone = 'default',
}: {
  icon: React.ReactNode;
  label: string;
  tone?: 'default' | 'success' | 'warning';
}) {
  const cls =
    tone === 'success'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
      : tone === 'warning'
      ? 'border-amber-200 bg-amber-50 text-amber-700'
      : 'border-gray-200 bg-gray-50 text-gray-700';
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md border ${cls}`}>
      {icon}
      {label}
    </span>
  );
}

function PositionRow({ position }: { position: ApplicationPosition }) {
  const sourcingLabel =
    position.sourcingType === 'own' ? 'Своя техника'
    : position.sourcingType === 'subcontractor' ? 'Подрядчик'
    : 'Источник не определён';
  const sourcingTone =
    position.sourcingType === 'own' ? badgeTones.success
    : position.sourcingType === 'subcontractor' ? badgeTones.progress
    : badgeTones.warning;

  return (
    <div className="border border-gray-200 rounded-lg p-3.5 bg-white hover:border-gray-300 transition-colors">
      <div className="flex items-start justify-between gap-3 mb-2.5">
        <div className="flex-1 min-w-0">
          <div className="text-sm text-gray-900 mb-1.5 font-medium">{position.equipmentType}</div>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={`${badgeBase} ${sourcingTone}`}>
              {position.sourcingType === 'own' && <Truck className="w-3 h-3" />}
              {position.sourcingType === 'subcontractor' && <Building2 className="w-3 h-3" />}
              {sourcingLabel}
            </span>
            {position.status === 'no_reservation' && (
              <span className={`${badgeBase} ${badgeTones.progress}`}>
                <Clock className="w-3 h-3" />
                Ожидает брони
              </span>
            )}
            {position.status === 'reserved' && (
              <span className={`${badgeBase} ${badgeTones.success}`}>
                <CheckCircle2 className="w-3 h-3" />
                В брони
              </span>
            )}
            {(position.reservationState === 'conflict' || position.status === 'conflict') && (
              <span className={`${badgeBase} ${badgeTones.warning}`}>
                <AlertTriangle className="w-3 h-3" />
                Конфликт
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-0.5 opacity-60 hover:opacity-100 transition-opacity">
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 hover:bg-gray-100 rounded" aria-label="Копировать позицию">
            <Copy className="w-3.5 h-3.5 text-gray-500" />
          </Button>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 hover:bg-gray-100 rounded" aria-label="Редактировать позицию">
            <Edit className="w-3.5 h-3.5 text-gray-500" />
          </Button>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 hover:bg-gray-100 rounded" aria-label="Удалить позицию">
            <Trash2 className="w-3.5 h-3.5 text-red-500" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-x-4 gap-y-1 text-xs text-gray-600">
        <div><span className="text-gray-400">Кол-во:</span> {position.quantity} шт</div>
        <div><span className="text-gray-400">Смен:</span> {position.shiftCount}</div>
        {position.pricePerShift !== undefined && (
          <div><span className="text-gray-400">За смену:</span> {position.pricePerShift.toLocaleString('ru-RU')} ₽</div>
        )}
        {position.plannedDate && (
          <div><span className="text-gray-400">Дата:</span> {position.plannedDate}</div>
        )}
        {(position.plannedTimeFrom || position.plannedTimeTo) && (
          <div>
            <span className="text-gray-400">Время:</span> {[position.plannedTimeFrom, position.plannedTimeTo].filter(Boolean).join('–')}
          </div>
        )}
        {position.unit && (
          <div><span className="text-gray-400">Единица:</span> {position.unit}</div>
        )}
        {position.subcontractor && (
          <div className="col-span-3">
            <span className="text-gray-400">Подрядчик:</span> {position.subcontractor}
          </div>
        )}
      </div>

      {position.comment && (
        <div className="mt-2.5 pt-2.5 border-t border-gray-100 text-xs text-gray-600">
          {position.comment}
        </div>
      )}
    </div>
  );
}

