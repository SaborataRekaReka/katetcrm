import { useMemo, useState } from 'react';
import {
  FileText,
  ChevronDown,
  Truck,
  Building2,
  Wrench,
  UserPlus,
  Calendar,
  Clock,
  MapPin,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Circle,
  ArrowRight,
  Copy,
  Activity,
  ExternalLink,
  XCircle,
  Phone,
  User as UserIcon,
  PlayCircle,
  Flag,
  Package,
} from 'lucide-react';
import { Lead } from '../../types/kanban';
import { Departure, DepartureStatus } from '../../types/departure';
import { buildMockDeparture } from '../../data/mockDeparture';
import { USE_API } from '../../lib/featureFlags';
import { badgeBase, badgeTones } from '../kanban/badgeTokens';
import { Button } from '../ui/button';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
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
import { Textarea } from '../ui/textarea';
import {
  DetailShell,
  Breadcrumb,
  ToolbarPill,
  PropertyRow,
  InlineValue,
  SidebarSection,
  SidebarField,
  ActionButton,
  NextStepLine,
} from '../detail/DetailShell';
import { EntityModalHeader, EntitySection } from '../detail/EntityModalFramework';
import { PhoneLink } from '../detail/ContactAtoms';
import { useLayout } from '../shell/layoutStore';
import { DepartureWorkspaceApi } from './DepartureWorkspaceApi';

interface Props {
  lead: Lead;
  onClose: () => void;
  onOpenClient?: (lead: Lead) => void;
  apiDepartureId?: string;
}

const statusLabel: Record<DepartureStatus, string> = {
  planned: 'Запланирован',
  on_the_way: 'В пути',
  arrived: 'Прибыл на объект',
  completed: 'Завершён',
  cancelled: 'Отменён',
};

const statusOrder: DepartureStatus[] = ['scheduled', 'in_transit', 'arrived', 'completed'];

const statusTone: Record<DepartureStatus, string> = {
  planned: badgeTones.progress,
  on_the_way: badgeTones.progress,
  arrived: badgeTones.success,
  completed: badgeTones.muted,
  cancelled: badgeTones.warning,
};

const alertMeta = {
  overdue_start: {
    title: 'Просрочено плановое время подачи',
    tone: badgeTones.warning,
    label: 'Просрочен',
  },
  overdue_arrival: {
    title: 'Техника в пути слишком долго',
    tone: badgeTones.warning,
    label: 'Нет движения',
  },
  stale: {
    title: 'Выезд без завершения слишком долго',
    tone: badgeTones.caution,
    label: 'Ждёт завершения',
  },
};

function fmt(value?: string) {
  return value ?? '—';
}

export function DepartureWorkspace({ lead, onClose, onOpenClient, apiDepartureId }: Props) {
  if (USE_API && apiDepartureId) {
    return (
      <DepartureWorkspaceApi
        departureId={apiDepartureId}
        lead={lead}
        onClose={onClose}
        onOpenClient={onOpenClient}
      />
    );
  }

  const { setActiveSecondaryNav } = useLayout();
  const base: Departure = useMemo(() => buildMockDeparture(lead), [lead]);

  // Local operational state — single source of truth for manual fact tracking
  const [status, setStatus] = useState<DepartureStatus>(base.status);
  const [departedAt, setDepartedAt] = useState<string | undefined>(base.fact.departedAt);
  const [arrivedAt, setArrivedAt] = useState<string | undefined>(base.fact.arrivedAt);
  const [completedAt, setCompletedAt] = useState<string | undefined>(base.fact.completedAt);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  const nowStamp = () => {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const handleDepart = () => {
    setDepartedAt(nowStamp());
    setStatus('in_transit');
  };
  const handleArrive = () => {
    setArrivedAt(nowStamp());
    setStatus('arrived');
  };
  const handleComplete = () => {
    setCompletedAt(nowStamp());
    setStatus('completed');
  };

  const alert = base.alert; // from mock, not recomputed locally in MVP
  const reservationOk = !!base.linked.reservationId;
  const hasUnitOrSub = !!base.linked.equipmentUnit || !!base.linked.subcontractor;

  // Readiness for completion
  const checks: { label: string; ok: boolean }[] = [
    { label: 'Бронь связана', ok: reservationOk },
    { label: 'Ресурс назначен', ok: hasUnitOrSub },
    { label: 'Отправка зафиксирована', ok: !!departedAt },
    { label: 'Прибытие зафиксировано', ok: !!arrivedAt },
    { label: 'Нет критичных состояний', ok: alert !== 'overdue_arrival' },
  ];
  const ready = checks.every((c) => c.ok);

  // Primary CTA — single next step
  const primary = (() => {
    if (status === 'completed') {
      return { label: 'Заказ завершён', onClick: undefined, disabled: true, reason: null as string | null };
    }
    if (status === 'cancelled') {
      return { label: 'Выезд отменён', onClick: undefined, disabled: true, reason: null };
    }
    if (!departedAt) {
      return {
        label: 'Зафиксировать отправку',
        onClick: handleDepart,
        disabled: false,
        reason: 'Техника ещё не выехала',
      };
    }
    if (!arrivedAt) {
      return {
        label: 'Зафиксировать прибытие',
        onClick: handleArrive,
        disabled: false,
        reason: 'Прибытие не зафиксировано',
      };
    }
    return {
      label: 'Завершить заказ',
      onClick: handleComplete,
      disabled: !ready,
      reason: ready ? null : 'Не все условия выполнены',
    };
  })();

  const plan = base.plan;
  const linked = base.linked;

  const openSecondary = (secondaryId: string) => {
    setActiveSecondaryNav(secondaryId);
    onClose();
  };
  const entitySwitcherOptions = [
    { id: 'lead', label: 'Лид', onSelect: () => openSecondary('leads') },
    { id: 'application', label: 'Заявка', onSelect: () => openSecondary('applications') },
    { id: 'reservation', label: 'Бронь', onSelect: () => openSecondary('reservations') },
    {
      id: 'departure',
      label: 'Выезд',
      active: true,
      onSelect: () => openSecondary('departures'),
    },
    { id: 'completed', label: 'Завершение', onSelect: () => openSecondary('completion') },
  ];

  const main = (
    <div className="max-w-[820px] mx-auto px-8 pt-6 pb-10">
      <EntityModalHeader
        entityIcon={<Truck className="w-3 h-3" />}
        entityLabel="Выезд"
        entitySwitcherOptions={entitySwitcherOptions}
        title={base.id}
        subtitle={
          <>
            <button
              type="button"
              onClick={() => openSecondary('applications')}
              className="text-blue-600 hover:underline"
            >
              {linked.applicationTitle}
            </button>{' '}
            ·{' '}
            <button
              type="button"
              onClick={onOpenClient ? () => onOpenClient(lead) : undefined}
              disabled={!onOpenClient}
              className="text-blue-600 hover:underline disabled:text-gray-500 disabled:no-underline disabled:cursor-not-allowed"
            >
              {linked.clientName}
            </button>{' '}
            · {linked.equipmentType}
            {linked.equipmentUnit ? ` · ${linked.equipmentUnit}` : ''}
          </>
        }
        primaryAction={{
          label: primary.label,
          render: (
            <Button
              size="sm"
              className="h-7 gap-1 bg-blue-600 hover:bg-blue-700 text-white text-[11px]"
              disabled={primary.disabled}
              onClick={primary.onClick}
            >
              {primary.label}
              <ArrowRight className="w-3 h-3" />
            </Button>
          ),
        }}
        secondaryAction={{
          label: 'Отменить выезд',
          render: (
            <AlertDialog open={cancelOpen} onOpenChange={setCancelOpen}>
              <AlertDialogTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-[11px]"
                  disabled={status === 'completed' || status === 'cancelled'}
                >
                  Отменить выезд
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Отменить выезд {base.id}?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Действие будет зафиксировано в журнале. Укажите причину (необязательно).
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <Textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Причина отмены…"
                  className="text-[12px]"
                />
                <AlertDialogFooter>
                  <AlertDialogCancel>Отмена</AlertDialogCancel>
                  <AlertDialogAction onClick={() => setStatus('cancelled')}>
                    Отменить выезд
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ),
        }}
        chips={[
          <span key="status" className={`${badgeBase} ${statusTone[status]}`}>
            <Flag className="w-3 h-3" />
            {statusLabel[status]}
          </span>,
          <ToolbarPill key="mgr" icon={<UserPlus className="w-3 h-3" />} label={base.manager} />,
          <ToolbarPill key="date" icon={<Calendar className="w-3 h-3" />} label={plan.plannedDate} />,
          <ToolbarPill
            key="time"
            icon={<Clock className="w-3 h-3" />}
            label={`${plan.plannedTimeFrom}${plan.plannedTimeTo ? '–' + plan.plannedTimeTo : ''}`}
          />,
          <ToolbarPill key="type" icon={<Truck className="w-3 h-3" />} label={linked.equipmentType} />,
          <ToolbarPill
            key="rsv"
            icon={<FileText className="w-3 h-3" />}
            label={linked.reservationTitle}
            onClick={() => openSecondary('reservations')}
          />,
          ...(alert !== 'none'
            ? [
                <span key="alert" className={`${badgeBase} ${alertMeta[alert].tone}`}>
                  <AlertTriangle className="w-3 h-3" />
                  {alertMeta[alert].label}
                </span>,
              ]
            : []),
        ]}
        className="mb-5"
      />

      {/* Stale / overdue banner */}
      {alert !== 'none' && (
        <Alert
          variant={alert === 'stale' ? 'default' : 'destructive'}
          className="mb-5 py-2 px-3"
        >
          <AlertCircle className="h-4 w-4" />
          <AlertTitle className="text-[12px]">{alertMeta[alert].title}</AlertTitle>
          <AlertDescription className="text-[11px] mt-0.5">
            {alert === 'overdue_start' &&
              'Плановое время подачи прошло, отправка не зафиксирована.'}
            {alert === 'overdue_arrival' &&
              'Техника в пути слишком долго — уточните статус у водителя.'}
            {alert === 'stale' &&
              'Прибытие зафиксировано, но заказ не завершён дольше обычного.'}
            <div className="mt-1.5 flex gap-2">
              {!departedAt && status !== 'cancelled' && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-6 px-2 text-[11px]"
                  onClick={handleDepart}
                >
                  Зафиксировать отправку
                </Button>
              )}
              {departedAt && !arrivedAt && status !== 'cancelled' && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-6 px-2 text-[11px]"
                  onClick={handleArrive}
                >
                  Зафиксировать прибытие
                </Button>
              )}
              {arrivedAt && status !== 'completed' && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-6 px-2 text-[11px]"
                  onClick={handleComplete}
                >
                  Завершить заказ
                </Button>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Overview */}
      <EntitySection title="Основные данные" className="mb-5">
        <div className="grid grid-cols-2 gap-x-8 gap-y-0">
          <PropertyRow
            icon={<FileText className="w-3 h-3" />}
            label="ID"
            value={<InlineValue>{base.id}</InlineValue>}
          />
          <PropertyRow
            icon={<Activity className="w-3 h-3" />}
            label="Статус"
            value={<span className={`${badgeBase} ${statusTone[status]}`}>{statusLabel[status]}</span>}
          />
          <PropertyRow
            icon={<FileText className="w-3 h-3" />}
            label="Бронь"
            value={
              <button
                type="button"
                className="text-blue-600 hover:underline text-left"
                onClick={() => openSecondary('reservations')}
              >
                {linked.reservationTitle}
              </button>
            }
          />
          <PropertyRow
            icon={<FileText className="w-3 h-3" />}
            label="Заявка"
            value={
              <button
                type="button"
                className="text-blue-600 hover:underline text-left"
                onClick={() => openSecondary('applications')}
              >
                {linked.applicationTitle}
              </button>
            }
          />
          <PropertyRow
            icon={<Building2 className="w-3 h-3" />}
            label="Клиент"
            value={
              <button type="button" onClick={onOpenClient ? () => onOpenClient(lead) : undefined} disabled={!onOpenClient} className="text-[11px] text-blue-600 hover:underline text-left truncate disabled:text-gray-500 disabled:no-underline disabled:cursor-not-allowed">
                {linked.clientName}
              </button>
            }
          />
          <PropertyRow
            icon={<Truck className="w-3 h-3" />}
            label="Тип техники"
            value={<InlineValue>{linked.equipmentType}</InlineValue>}
          />
          {linked.equipmentUnit && (
            <PropertyRow
              icon={<Wrench className="w-3 h-3" />}
              label="Unit"
              value={<InlineValue>{linked.equipmentUnit}</InlineValue>}
            />
          )}
          {linked.subcontractor && (
            <PropertyRow
              icon={<Building2 className="w-3 h-3" />}
              label="Подрядчик"
              value={<InlineValue>{linked.subcontractor}</InlineValue>}
            />
          )}
          <PropertyRow
            icon={<UserPlus className="w-3 h-3" />}
            label="Ответственный"
            value={<InlineValue>{base.manager}</InlineValue>}
          />
          <PropertyRow
            icon={<Calendar className="w-3 h-3" />}
            label="Создан"
            value={<InlineValue>{base.createdAt}</InlineValue>}
          />
          <PropertyRow
            icon={<Activity className="w-3 h-3" />}
            label="Последняя активность"
            value={<InlineValue>{base.lastActivity}</InlineValue>}
          />
        </div>
      </EntitySection>

      {/* Planned trip */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-1.5">
          <div className="text-[11px] text-gray-500 uppercase tracking-wide">План выезда</div>
          <button
            type="button"
            className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:underline"
            onClick={() => openSecondary('reservations')}
          >
            <ExternalLink className="w-3 h-3" /> Открыть бронь
          </button>
        </div>
        <div className="grid grid-cols-2 gap-x-8 gap-y-0">
          <PropertyRow
            icon={<Calendar className="w-3 h-3" />}
            label="Дата подачи"
            value={<InlineValue>{plan.plannedDate}</InlineValue>}
          />
          <PropertyRow
            icon={<Clock className="w-3 h-3" />}
            label="Время подачи"
            value={
              <InlineValue>
                {plan.plannedTimeFrom}
                {plan.plannedTimeTo ? `–${plan.plannedTimeTo}` : ''}
              </InlineValue>
            }
          />
          <PropertyRow
            icon={<MapPin className="w-3 h-3" />}
            label="Адрес"
            value={<InlineValue>{plan.address}</InlineValue>}
          />
          <PropertyRow
            icon={<Package className="w-3 h-3" />}
            label="Количество"
            value={<InlineValue>{linked.quantity} шт</InlineValue>}
          />
          {plan.contactName && (
            <PropertyRow
              icon={<UserIcon className="w-3 h-3" />}
              label="Контакт"
              value={<InlineValue>{plan.contactName}</InlineValue>}
            />
          )}
          {plan.contactPhone && (
            <PropertyRow
              icon={<Phone className="w-3 h-3" />}
              label="Телефон"
              value={<PhoneLink value={plan.contactPhone} />}
            />
          )}
        </div>
        {plan.deliveryNotes && (
          <div className="mt-1.5 text-[10px] text-gray-500 italic">{plan.deliveryNotes}</div>
        )}
      </div>

      {/* Fact tracking */}
      <div className="mb-5">
        <div className="text-[11px] text-gray-500 uppercase tracking-wide mb-2">
          Факт отправки и прибытия
        </div>
        <div className="divide-y divide-gray-200 border border-gray-200 rounded-md bg-white overflow-hidden">
          {/* Departure row */}
          <div className="flex items-center gap-3 px-3 py-2">
            <PlayCircle
              className={`w-4 h-4 flex-shrink-0 ${departedAt ? 'text-emerald-500' : 'text-gray-400'}`}
            />
            <div className="flex-1 min-w-0">
              <div className="text-[12px] text-gray-800">Отправление</div>
              {departedAt ? (
                <div className="text-[11px]"><span className="text-emerald-700">Зафиксировано</span> <span className="text-gray-500">· {departedAt}</span></div>
              ) : (
                <div className="text-[11px] text-gray-600">Не зафиксировано</div>
              )}
            </div>
            {!departedAt && (
              <Button
                size="sm"
                variant="outline"
                className="h-6 px-2 text-[11px]"
                onClick={handleDepart}
                disabled={status === 'cancelled'}
              >
                Зафиксировать
              </Button>
            )}
          </div>

          {/* Arrival row */}
          <div className={`flex items-center gap-3 px-3 py-2 ${!departedAt ? 'bg-gray-50/60' : ''}`}>
            <Flag
              className={`w-4 h-4 flex-shrink-0 ${arrivedAt ? 'text-emerald-500' : departedAt ? 'text-gray-400' : 'text-gray-300'}`}
            />
            <div className="flex-1 min-w-0">
              <div className={`text-[12px] ${departedAt ? 'text-gray-800' : 'text-gray-500'}`}>Прибытие на объект</div>
              {arrivedAt ? (
                <div className="text-[11px]"><span className="text-emerald-700">Зафиксировано</span> <span className="text-gray-500">· {arrivedAt}</span></div>
              ) : (
                <div className={`text-[11px] ${departedAt ? 'text-gray-600' : 'text-gray-400 italic'}`}>
                  {departedAt ? 'Не зафиксировано' : 'Доступно после отправки'}
                </div>
              )}
            </div>
            {departedAt && !arrivedAt && (
              <Button
                size="sm"
                variant="outline"
                className="h-6 px-2 text-[11px]"
                onClick={handleArrive}
                disabled={status === 'cancelled'}
              >
                Зафиксировать
              </Button>
            )}
          </div>

          {/* Completion — tertiary row */}
          <div className="flex items-center gap-3 px-3 py-1.5 bg-gray-50/60">
            <CheckCircle2
              className={`w-3.5 h-3.5 flex-shrink-0 ${completedAt ? 'text-gray-500' : 'text-gray-300'}`}
            />
            <div className="flex-1 min-w-0 text-[11px] text-gray-500">
              Завершение
              {completedAt && <span className="text-gray-700 ml-2">{completedAt}</span>}
            </div>
            {!completedAt && (
              <span className="text-[10px] text-gray-400 italic">
                {arrivedAt ? 'готово к завершению' : 'доступно после прибытия'}
              </span>
            )}
          </div>
        </div>
        <div className="mt-1 text-[10px] text-gray-400">
          Факт фиксируется вручную. Telematics в MVP не подключена.
        </div>
      </div>

      {/* Next step hint — mirrors primary CTA verb */}
      {primary.label && !primary.disabled && (
        <div className="mb-5">
          <NextStepLine label={primary.label} reason={primary.reason} />
        </div>
      )}

      {/* Comment */}
      {base.comment && (
        <div className="mb-5">
          <div className="text-[11px] text-gray-500 uppercase tracking-wide mb-1">
            Комментарий менеджера
          </div>
          <div className="text-[11px] text-gray-700 leading-relaxed">{base.comment}</div>
        </div>
      )}

      {/* Quick link actions — ordered by process hierarchy; "Дублировать выезд" moved to sidebar overflow */}
      <div className="space-y-0.5 mb-6">
        <ActionButton
          icon={<ExternalLink className="w-3.5 h-3.5" />}
          label="Открыть бронь"
          onClick={() => openSecondary('reservations')}
        />
        <ActionButton
          icon={<FileText className="w-3.5 h-3.5" />}
          label="Открыть заявку"
          onClick={() => openSecondary('applications')}
        />
        <ActionButton icon={<Building2 className="w-3.5 h-3.5" />} label="Открыть клиента" onClick={onOpenClient ? () => onOpenClient(lead) : undefined} />
        {linked.leadTitle && (
          <ActionButton
            icon={<UserPlus className="w-3.5 h-3.5" />}
            label="Открыть лид"
            onClick={() => openSecondary('leads')}
          />
        )}
      </div>

      {/* History */}
      <div className="border-t border-gray-200 pt-4">
        <div className="text-[11px] text-gray-500 uppercase tracking-wide mb-2">
          Журнал изменений
        </div>
        <div className="space-y-2">
          {base.activity.map((a) => (
            <div key={a.id} className="flex items-center gap-2 text-[11px] text-gray-600">
              <Circle className="w-2 h-2 text-gray-300 fill-gray-300 flex-shrink-0" />
              <span className="text-gray-900">{a.actor}</span>
              <span className="text-gray-500 truncate">{a.message}</span>
              <span className="text-gray-400 ml-auto flex-shrink-0">{a.at}</span>
            </div>
          ))}
          {departedAt && !base.activity.some((a) => a.kind === 'departed') && (
            <div className="flex items-center gap-2 text-[11px] text-gray-600">
              <Circle className="w-2 h-2 text-gray-300 fill-gray-300 flex-shrink-0" />
              <span className="text-gray-900">{base.manager}</span>
              <span className="text-gray-500 truncate">Зафиксирована отправка</span>
              <span className="text-gray-400 ml-auto flex-shrink-0">{departedAt}</span>
            </div>
          )}
          {arrivedAt && !base.activity.some((a) => a.kind === 'arrived') && (
            <div className="flex items-center gap-2 text-[11px] text-gray-600">
              <Circle className="w-2 h-2 text-gray-300 fill-gray-300 flex-shrink-0" />
              <span className="text-gray-900">{base.manager}</span>
              <span className="text-gray-500 truncate">Зафиксировано прибытие на объект</span>
              <span className="text-gray-400 ml-auto flex-shrink-0">{arrivedAt}</span>
            </div>
          )}
          {completedAt && !base.activity.some((a) => a.kind === 'completed') && (
            <div className="flex items-center gap-2 text-[11px] text-gray-600">
              <Circle className="w-2 h-2 text-gray-300 fill-gray-300 flex-shrink-0" />
              <span className="text-gray-900">{base.manager}</span>
              <span className="text-gray-500 truncate">Заказ завершён</span>
              <span className="text-gray-400 ml-auto flex-shrink-0">{completedAt}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const sidebar = (
    <>
      <SidebarSection title="Статус">
        <SidebarField
          label="Статус"
          value={<span className={`${badgeBase} ${statusTone[status]}`}>{statusLabel[status]}</span>}
        />
        <SidebarField label="Менеджер" value={base.manager} />
        <SidebarField label="Создан" value={base.createdAt} />
        <SidebarField label="Обновлён" value={base.updatedAt} />
      </SidebarSection>

      <SidebarSection title="Готовность к завершению">
        <div className="space-y-1">
          {checks.map((c) => (
            <div key={c.label} className="flex items-center gap-1.5 text-[11px]">
              {c.ok ? (
                <CheckCircle2 className="w-3 h-3 text-emerald-500 flex-shrink-0" />
              ) : (
                <Circle className="w-3 h-3 text-gray-300 flex-shrink-0" />
              )}
              <span className={c.ok ? 'text-gray-700' : 'text-gray-500'}>{c.label}</span>
            </div>
          ))}
        </div>
        <div className="pt-2">
          <Button
            size="sm"
            className="h-7 w-full text-[11px]"
            disabled={primary.disabled}
            onClick={primary.onClick}
          >
            {primary.label}
          </Button>
          {primary.reason && (
            <div className="text-[10px] text-gray-500 mt-1">{primary.reason}</div>
          )}
        </div>
      </SidebarSection>

      <SidebarSection title="План / факт">
        <SidebarField
          label="План дата"
          value={plan.plannedDate}
        />
        <SidebarField
          label="План время"
          value={`${plan.plannedTimeFrom}${plan.plannedTimeTo ? '–' + plan.plannedTimeTo : ''}`}
        />
        <SidebarField
          label="Отправление"
          value={
            departedAt ? (
              <span className="text-gray-800">{departedAt}</span>
            ) : (
              <span className="text-gray-400">—</span>
            )
          }
        />
        <SidebarField
          label="Прибытие"
          value={
            arrivedAt ? (
              <span className="text-gray-800">{arrivedAt}</span>
            ) : (
              <span className="text-gray-400">—</span>
            )
          }
        />
        <SidebarField
          label="Завершение"
          value={
            completedAt ? (
              <span className="text-gray-800">{completedAt}</span>
            ) : (
              <span className="text-gray-400">—</span>
            )
          }
        />
      </SidebarSection>

      {alert !== 'none' && (
        <SidebarSection title="Внимание">
          <div className="text-[11px] text-red-700">{alertMeta[alert].title}</div>
          <div className="text-[10px] text-gray-500 mt-0.5">
            {alert === 'overdue_start' && 'Плановое время подачи прошло.'}
            {alert === 'overdue_arrival' && 'Слишком долго нет фиксации прибытия.'}
            {alert === 'stale' && 'Заказ давно не закрыт.'}
          </div>
        </SidebarSection>
      )}

      <SidebarSection title="Этап выезда">
        <div className="space-y-0.5">
          {statusOrder.map((s) => {
            const active = s === status;
            const passed = statusOrder.indexOf(s) < statusOrder.indexOf(status);
            return (
              <div
                key={s}
                className={`flex items-center gap-1.5 text-[11px] px-1.5 py-0.5 rounded ${
                  active ? 'text-gray-700 font-medium' : passed ? 'text-gray-700' : 'text-gray-500'
                }`}
              >
                {active || passed ? (
                  <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                ) : (
                  <Circle className="w-3 h-3 text-gray-300" />
                )}
                <span>{statusLabel[s]}</span>
              </div>
            );
          })}
        </div>
      </SidebarSection>

      <SidebarSection title="Связанные записи">
        <SidebarField
          label="Бронь"
          value={
            <button
              type="button"
              className="text-blue-600 hover:underline text-left"
              onClick={() => openSecondary('reservations')}
            >
              {linked.reservationTitle}
            </button>
          }
        />
        <SidebarField
          label="Заявка"
          value={
            <button
              type="button"
              className="text-blue-600 hover:underline text-left"
              onClick={() => openSecondary('applications')}
            >
              {linked.applicationTitle}
            </button>
          }
        />
        <SidebarField
          label="Клиент"
          value={
            <button type="button" onClick={onOpenClient ? () => onOpenClient(lead) : undefined} disabled={!onOpenClient} className="text-blue-600 hover:underline text-left disabled:text-gray-500 disabled:no-underline disabled:cursor-not-allowed">
              {linked.clientName}
            </button>
          }
        />
        {linked.leadTitle && (
          <SidebarField
            label="Лид"
            value={
              <button
                type="button"
                className="text-blue-600 hover:underline text-left"
                onClick={() => openSecondary('leads')}
              >
                {linked.leadTitle}
              </button>
            }
          />
        )}
        {linked.equipmentUnit && <SidebarField label="Unit" value={linked.equipmentUnit} />}
        {linked.subcontractor && <SidebarField label="Подрядчик" value={linked.subcontractor} />}
      </SidebarSection>

      <SidebarSection title="Последние изменения" defaultOpen={false}>
        <div className="space-y-1">
          {base.activity.slice(-3).map((a) => (
            <div key={a.id} className="text-[10px] text-gray-500 leading-tight">
              <span className="text-gray-700">{a.actor}</span> · {a.message}
              <div className="text-gray-500">{a.at}</div>
            </div>
          ))}
        </div>
      </SidebarSection>

      <SidebarSection title="Быстрые действия" defaultOpen={false}>
        <div className="space-y-1">
          <Button
            size="sm"
            variant="outline"
            className="h-6 w-full justify-start text-[11px]"
            onClick={handleDepart}
            disabled={!!departedAt || status === 'cancelled'}
          >
            <PlayCircle className="w-3 h-3 mr-1" /> Зафиксировать отправку
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-6 w-full justify-start text-[11px]"
            onClick={handleArrive}
            disabled={!departedAt || !!arrivedAt || status === 'cancelled'}
          >
            <Flag className="w-3 h-3 mr-1" /> Зафиксировать прибытие
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-6 w-full justify-start text-[11px]"
            onClick={handleComplete}
            disabled={!ready || status === 'completed' || status === 'cancelled'}
          >
            <CheckCircle2 className="w-3 h-3 mr-1" /> Завершить заказ
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-6 w-full justify-start text-[11px]"
            onClick={() => setCancelOpen(true)}
            disabled={status === 'completed' || status === 'cancelled'}
          >
            <XCircle className="w-3 h-3 mr-1" /> Отменить выезд
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-6 w-full justify-start text-[11px] text-gray-500"
            onClick={() => openSecondary('applications')}
          >
            <Copy className="w-3 h-3 mr-1" /> Дублировать выезд
          </Button>
        </div>
      </SidebarSection>
    </>
  );

  return (
    <DetailShell
      breadcrumb={<Breadcrumb items={['CRM', 'Sales', 'Departure']} />}
      onClose={onClose}
      main={main}
      sidebar={sidebar}
    />
  );
}
