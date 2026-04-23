import { Lead } from '../types/kanban';
import {
  Departure,
  DepartureActivityItem,
  DepartureAlert,
  DepartureStatus,
} from '../types/departure';

export function buildMockDeparture(lead?: Lead): Departure {
  const id = lead ? `DEP-${lead.id.padStart(5, '0')}` : 'DEP-00001';

  // Derive operational state from lead.departureStatus if present
  const ds = lead?.departureStatus;
  const status: DepartureStatus =
    ds === 'awaiting' ? 'arrived' : ds === 'overdue' ? 'scheduled' : 'scheduled';
  const alert: DepartureAlert =
    ds === 'overdue' ? 'overdue_start' : ds === 'awaiting' ? 'stale' : 'none';

  const [timeFrom, timeTo] = (lead?.timeWindow ?? '09:00-13:00')
    .split(/[-–]/)
    .map((x) => x.trim());

  const plannedDate = lead?.date ?? '2026-04-25';
  const plannedTimeFrom = timeFrom ?? '09:00';
  const plannedTimeTo = timeTo ?? '13:00';

  const equipmentType = lead?.equipmentType ?? 'Экскаватор';
  const equipmentUnit = lead?.equipmentUnit;
  const subcontractor = lead?.subcontractor;

  const departedAt = status === 'in_transit' || status === 'arrived' || status === 'completed'
    ? `${plannedDate} 08:42`
    : undefined;
  const arrivedAt = status === 'arrived' || status === 'completed'
    ? `${plannedDate} 09:18`
    : undefined;
  const completedAt = status === 'completed' ? `${plannedDate} 18:05` : undefined;

  const activity: DepartureActivityItem[] = [
    {
      id: 'a1',
      at: `${plannedDate} 07:10`,
      actor: 'Система',
      kind: 'created',
      message: 'Выезд создан из брони',
    },
    {
      id: 'a2',
      at: `${plannedDate} 07:12`,
      actor: lead?.manager ?? 'Петров А.',
      kind: 'plan_changed',
      message: `Плановое время подачи: ${plannedTimeFrom}–${plannedTimeTo}`,
    },
  ];

  if (departedAt) {
    activity.push({
      id: 'a3',
      at: departedAt,
      actor: lead?.manager ?? 'Петров А.',
      kind: 'departed',
      message: 'Зафиксирована отправка',
    });
  }
  if (arrivedAt) {
    activity.push({
      id: 'a4',
      at: arrivedAt,
      actor: lead?.manager ?? 'Петров А.',
      kind: 'arrived',
      message: 'Зафиксировано прибытие на объект',
    });
  }
  if (completedAt) {
    activity.push({
      id: 'a5',
      at: completedAt,
      actor: lead?.manager ?? 'Петров А.',
      kind: 'completed',
      message: 'Заказ завершён',
    });
  }

  return {
    id,
    status,
    alert,
    manager: lead?.manager ?? 'Петров А.',
    createdAt: `${plannedDate} 07:10`,
    updatedAt: lead?.lastActivity ?? '15 мин назад',
    lastActivity: lead?.lastActivity ?? '15 мин назад',
    comment: 'Подача со стороны двора. Пропуск оформлен на водителя.',
    linked: {
      reservationId: lead ? `RSV-${lead.id.padStart(5, '0')}` : 'RSV-00001',
      reservationTitle: lead ? `Бронь RSV-${lead.id.padStart(5, '0')}` : 'Бронь RSV-00001',
      applicationId: 'APP-00123',
      applicationTitle: 'Заявка #APP-00123',
      clientId: 'CL-77',
      clientName: lead?.company ?? lead?.client ?? 'ООО Стройтех',
      leadId: lead?.id,
      leadTitle: lead ? `Лид #${lead.id}` : undefined,
      equipmentType,
      equipmentUnit,
      subcontractor,
      quantity: 1,
    },
    plan: {
      plannedDate,
      plannedTimeFrom,
      plannedTimeTo,
      address: lead?.address ?? 'г. Москва, ул. Ленина, 10',
      contactName: lead?.client,
      contactPhone: lead?.phone,
      deliveryNotes: 'Узкий подъезд, нужен сопровождающий на объекте.',
    },
    fact: {
      departedAt,
      arrivedAt,
      completedAt,
    },
    activity,
  };
}
