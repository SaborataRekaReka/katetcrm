import { Lead } from '../types/kanban';
import {
  Completion,
  CompletionActivityItem,
  CompletionAlert,
  CompletionStatus,
} from '../types/completion';

export function buildMockCompletion(lead?: Lead): Completion {
  const idBase = lead ? lead.id.padStart(5, '0') : '00001';
  const id = `CMP-${idBase}`;

  const alreadyCompleted = lead?.stage === 'completed';
  const isUnqualified = lead?.stage === 'unqualified';

  const status: CompletionStatus = isUnqualified
    ? 'unqualified'
    : alreadyCompleted
    ? 'completed'
    : lead?.departureStatus === 'awaiting'
    ? 'ready_to_complete'
    : lead?.departureStatus === 'overdue'
    ? 'blocked'
    : 'ready_to_complete';

  const alert: CompletionAlert =
    status === 'blocked'
      ? 'missing_arrival'
      : lead?.departureStatus === 'awaiting' && !alreadyCompleted
      ? 'stale'
      : 'none';

  const [timeFrom, timeTo] = (lead?.timeWindow ?? '09:00-13:00')
    .split(/[-–]/)
    .map((x) => x.trim());

  const plannedDate = lead?.date ?? '2026-04-25';
  const plannedTimeFrom = timeFrom ?? '09:00';
  const plannedTimeTo = timeTo ?? '13:00';

  const departedAt = status === 'blocked' ? undefined : `${plannedDate} 08:42`;
  const arrivedAt = status === 'blocked' ? undefined : `${plannedDate} 09:18`;
  const completedAt = alreadyCompleted
    ? lead?.completionDate ?? `${plannedDate} 18:05`
    : undefined;
  const completedBy = alreadyCompleted ? lead?.manager ?? 'Петров А.' : undefined;

  const manager = lead?.manager ?? 'Петров А.';

  const activity: CompletionActivityItem[] = [
    {
      id: 'c1',
      at: `${plannedDate} 07:10`,
      actor: 'Система',
      kind: 'created',
      message: 'Выезд создан из брони',
    },
  ];
  if (departedAt) {
    activity.push({
      id: 'c2',
      at: departedAt,
      actor: manager,
      kind: 'departed',
      message: 'Зафиксирована отправка',
    });
  }
  if (arrivedAt) {
    activity.push({
      id: 'c3',
      at: arrivedAt,
      actor: manager,
      kind: 'arrived',
      message: 'Зафиксировано прибытие на объект',
    });
  }
  if (alreadyCompleted && completedAt) {
    activity.push({
      id: 'c4',
      at: completedAt,
      actor: completedBy ?? manager,
      kind: 'completion_started',
      message: 'Инициировано завершение заказа',
    });
    activity.push({
      id: 'c5',
      at: completedAt,
      actor: completedBy ?? manager,
      kind: 'completed',
      message: 'Заказ завершён',
    });
  }
  if (isUnqualified && lead?.unqualifiedReason) {
    activity.push({
      id: 'c6',
      at: `${plannedDate} 12:00`,
      actor: manager,
      kind: 'unqualified',
      message: `Заказ помечен некачественным: ${lead.unqualifiedReason}`,
    });
  }

  return {
    id,
    status,
    alert,
    manager,
    createdAt: `${plannedDate} 07:10`,
    updatedAt: lead?.lastActivity ?? '10 мин назад',
    lastActivity: lead?.lastActivity ?? '10 мин назад',
    comment: alreadyCompleted
      ? lead?.completionReason ?? 'Работы выполнены в рамках плана. Замечаний нет.'
      : 'Подача со стороны двора. Пропуск оформлен на водителя.',
    linked: {
      departureId: `DEP-${idBase}`,
      departureTitle: `Выезд DEP-${idBase}`,
      reservationId: `RSV-${idBase}`,
      reservationTitle: `Бронь RSV-${idBase}`,
      applicationId: 'APP-00123',
      applicationTitle: 'Заявка #APP-00123',
      clientId: 'CL-77',
      clientName: lead?.company ?? lead?.client ?? 'ООО Стройтех',
      leadId: lead?.id,
      leadTitle: lead ? `Лид #${lead.id}` : undefined,
      equipmentType: lead?.equipmentType ?? 'Экскаватор',
      equipmentUnit: lead?.equipmentUnit,
      subcontractor: lead?.subcontractor,
      quantity: 1,
    },
    context: {
      plannedDate,
      plannedTimeFrom,
      plannedTimeTo,
      departedAt,
      arrivedAt,
      address: lead?.address ?? 'г. Москва, ул. Ленина, 10',
      contactName: lead?.client,
      contactPhone: lead?.phone,
      operationalNote: 'Узкий подъезд, нужен сопровождающий на объекте.',
    },
    fact: {
      completedAt,
      completedBy,
      completionNote: alreadyCompleted ? lead?.completionReason : undefined,
      unqualifiedReason: isUnqualified ? lead?.unqualifiedReason : undefined,
    },
    activity,
  };
}
