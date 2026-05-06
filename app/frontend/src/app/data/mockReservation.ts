import { Lead, Reservation } from '../types/kanban';

export function buildMockReservation(lead?: Lead): Reservation {
  const id = lead ? `RSV-${lead.id.padStart(5, '0')}` : 'RSV-00001';
  const source = lead?.ownOrSubcontractor ?? 'undecided';
  const hasConflict = lead?.hasConflict ?? false;
  const unit = lead?.equipmentUnit;
  const sub = lead?.subcontractor;

  const internalStage = (() => {
    if (lead?.readyForDeparture) return 'ready_for_departure' as const;
    if (unit) return 'unit_defined' as const;
    if (source === 'subcontractor' && !sub) return 'searching_subcontractor' as const;
    if (source === 'own' && !unit) return 'searching_own_equipment' as const;
    if (source === 'undecided') return 'needs_source_selection' as const;
    return 'type_reserved' as const;
  })();

  return {
    id,
    status: 'active',
    internalStage,
    reservationType: unit ? 'specific_unit' : 'equipment_type',
    equipmentType: lead?.equipmentType ?? 'Экскаватор',
    equipmentUnit: unit,
    source,
    subcontractor: sub,
    reservedBy: lead?.manager ?? 'Петров А.',
    reservedAt: '2026-04-20 14:32',
    comment: 'Клиент просил уточнить время подачи техники до 09:00.',
    lastActivity: lead?.lastActivity ?? '10 мин назад',
    hasConflict,
    conflict: hasConflict
      ? {
          id: 'CF-1',
          summary: 'Unit уже забронирован на пересекающийся интервал',
          conflictingReservationId: 'RSV-00042',
          conflictingAt: '2026-04-25 08:00–12:00',
        }
      : undefined,
    readyForDeparture: lead?.readyForDeparture ?? false,
    linked: {
      applicationId: 'APP-00123',
      applicationTitle: 'Заявка #APP-00123',
      clientId: 'CL-77',
      clientName: lead?.client ?? 'Иван Петров',
      clientCompany: lead?.company ?? 'ООО Стройтех',
      leadId: lead?.id,
      leadTitle: lead ? `Лид #${lead.id}` : undefined,
      positionTitle: 'Позиция 1',
      equipmentType: lead?.equipmentType ?? 'Экскаватор',
      quantity: 1,
      plannedDate: lead?.date ?? '2026-04-25',
      plannedTime: lead?.timeWindow ?? '09:00–13:00',
      address: lead?.address ?? 'г. Москва, ул. Ленина, 10',
      comment: 'Подъезд со стороны двора.',
    },
    candidateUnits: [
      { id: 'U-101', name: 'CAT 320', plate: 'А123ВС77', status: 'available' },
      { id: 'U-102', name: 'Komatsu PC200', plate: 'В456ТТ77', status: 'busy', note: 'На выезде до 15:00' },
      { id: 'U-103', name: 'Hitachi ZX200', plate: 'Е789ММ77', status: 'maintenance', note: 'ТО до 23.04' },
    ],
    subcontractorOptions: [
      { id: 'S-1', name: 'СпецТехПартнёр', category: 'Экскаваторы', priceNote: 'от 3 500 ₽/час', usage: '12 заказов' },
      { id: 'S-2', name: 'СтройАренда', category: 'Экскаваторы, Краны', priceNote: 'от 3 800 ₽/час', usage: '5 заказов' },
    ],
    activity: [
      { id: 'a1', at: '2026-04-20 14:32', actor: 'Петров А.', kind: 'created', message: 'Бронь создана по позиции заявки' },
      { id: 'a2', at: '2026-04-20 14:40', actor: 'Система', kind: 'stage_changed', message: 'Стадия → Тип забронирован' },
      ...(source !== 'undecided'
        ? [{ id: 'a3', at: '2026-04-20 15:05', actor: 'Петров А.', kind: 'source_changed' as const, message: `Источник изменён → ${source === 'own' ? 'Своя техника' : 'Подрядчик'}` }]
        : []),
      ...(unit
        ? [{ id: 'a4', at: '2026-04-21 10:05', actor: 'Петров А.', kind: 'unit_assigned' as const, message: `Назначен unit ${unit}` }]
        : []),
      ...(sub
        ? [{ id: 'a5', at: '2026-04-21 10:20', actor: 'Петров А.', kind: 'subcontractor_assigned' as const, message: `Выбран подрядчик ${sub}` }]
        : []),
      ...(hasConflict
        ? [{ id: 'a6', at: '2026-04-21 11:10', actor: 'Система', kind: 'conflict_detected' as const, message: 'Обнаружен конфликт с RSV-00042' }]
        : []),
    ],
  };
}
