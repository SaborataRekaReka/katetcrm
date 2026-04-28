import type { DepartureStatus, Prisma } from '@prisma/client';

export type DepartureAlert = 'none' | 'overdue_start' | 'overdue_arrival' | 'stale';

export interface DepartureView {
  id: string;
  reservationId: string;
  status: DepartureStatus;
  scheduledAt: string;
  startedAt: string | null;
  arrivedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  notes: string | null;
  deliveryNotes: string | null;
  createdAt: string;
  updatedAt: string;
  linked: {
    applicationId: string;
    applicationNumber: string | null;
    leadId: string | null;
    clientId: string | null;
    clientName: string | null;
    clientCompany: string | null;
    clientPhone: string | null;
    responsibleManagerId: string | null;
    responsibleManagerName: string | null;
    applicationItemId: string;
    positionLabel: string;
    quantity: number;
    equipmentTypeId: string | null;
    equipmentTypeLabel: string | null;
    equipmentUnitId: string | null;
    equipmentUnitLabel: string | null;
    equipmentUnitPlate: string | null;
    subcontractorId: string | null;
    subcontractorLabel: string | null;
    address: string | null;
    plannedStart: string;
    plannedEnd: string;
    plannedDate: string | null;
    plannedTimeFrom: string | null;
    plannedTimeTo: string | null;
    reservationComment: string | null;
  };
  completion: {
    id: string;
    outcome: 'completed' | 'unqualified';
    completedAt: string;
  } | null;
  derived: {
    alert: DepartureAlert;
    canStart: boolean;
    canArrive: boolean;
    canComplete: boolean;
  };
}

type WithIncludes = Prisma.DepartureGetPayload<{
  include: {
    completion: {
      select: {
        id: true;
        outcome: true;
        completedAt: true;
      };
    };
    reservation: {
      select: {
        id: true;
        plannedStart: true;
        plannedEnd: true;
        comment: true;
        equipmentTypeId: true;
        equipmentType: { select: { id: true; name: true } };
        equipmentUnitId: true;
        equipmentUnit: { select: { id: true; name: true; plateNumber: true } };
        subcontractorId: true;
        subcontractor: { select: { id: true; name: true } };
        applicationItem: {
          select: {
            id: true;
            applicationId: true;
            equipmentTypeLabel: true;
            quantity: true;
            address: true;
            plannedDate: true;
            plannedTimeFrom: true;
            plannedTimeTo: true;
            application: {
              select: {
                id: true;
                number: true;
                leadId: true;
                clientId: true;
                client: {
                  select: {
                    id: true;
                    name: true;
                    company: true;
                    phone: true;
                  };
                };
                responsibleManagerId: true;
                responsibleManager: {
                  select: {
                    id: true;
                    fullName: true;
                  };
                };
              };
            };
          };
        };
      };
    };
  };
}>;

const HOUR_MS = 60 * 60 * 1000;

function deriveAlert(d: WithIncludes): DepartureAlert {
  const now = Date.now();
  const scheduledAt = d.scheduledAt.getTime();
  const startedAt = d.startedAt?.getTime();
  const arrivedAt = d.arrivedAt?.getTime();

  if (d.status === 'scheduled' && scheduledAt < now) {
    return 'overdue_start';
  }
  if (d.status === 'in_transit' && startedAt && now - startedAt > 4 * HOUR_MS) {
    return 'overdue_arrival';
  }
  if (d.status === 'arrived' && arrivedAt && now - arrivedAt > 24 * HOUR_MS) {
    return 'stale';
  }
  return 'none';
}

export function projectDeparture(d: WithIncludes): DepartureView {
  return {
    id: d.id,
    reservationId: d.reservationId,
    status: d.status,
    scheduledAt: d.scheduledAt.toISOString(),
    startedAt: d.startedAt ? d.startedAt.toISOString() : null,
    arrivedAt: d.arrivedAt ? d.arrivedAt.toISOString() : null,
    completedAt: d.completedAt ? d.completedAt.toISOString() : null,
    cancelledAt: d.cancelledAt ? d.cancelledAt.toISOString() : null,
    cancellationReason: d.cancellationReason,
    notes: d.notes,
    deliveryNotes: d.deliveryNotes,
    createdAt: d.createdAt.toISOString(),
    updatedAt: d.updatedAt.toISOString(),
    linked: {
      applicationId: d.reservation.applicationItem.applicationId,
      applicationNumber: d.reservation.applicationItem.application.number,
      leadId: d.reservation.applicationItem.application.leadId,
      clientId: d.reservation.applicationItem.application.clientId,
      clientName: d.reservation.applicationItem.application.client?.name ?? null,
      clientCompany: d.reservation.applicationItem.application.client?.company ?? null,
      clientPhone: d.reservation.applicationItem.application.client?.phone ?? null,
      responsibleManagerId: d.reservation.applicationItem.application.responsibleManagerId,
      responsibleManagerName:
        d.reservation.applicationItem.application.responsibleManager?.fullName ?? null,
      applicationItemId: d.reservation.applicationItem.id,
      positionLabel: d.reservation.applicationItem.equipmentTypeLabel,
      quantity: d.reservation.applicationItem.quantity,
      equipmentTypeId: d.reservation.equipmentTypeId,
      equipmentTypeLabel:
        d.reservation.equipmentType?.name ??
        d.reservation.applicationItem.equipmentTypeLabel,
      equipmentUnitId: d.reservation.equipmentUnitId,
      equipmentUnitLabel: d.reservation.equipmentUnit?.name ?? null,
      equipmentUnitPlate: d.reservation.equipmentUnit?.plateNumber ?? null,
      subcontractorId: d.reservation.subcontractorId,
      subcontractorLabel: d.reservation.subcontractor?.name ?? null,
      address: d.reservation.applicationItem.address,
      plannedStart: d.reservation.plannedStart.toISOString(),
      plannedEnd: d.reservation.plannedEnd.toISOString(),
      plannedDate: d.reservation.applicationItem.plannedDate
        ? d.reservation.applicationItem.plannedDate.toISOString()
        : null,
      plannedTimeFrom: d.reservation.applicationItem.plannedTimeFrom,
      plannedTimeTo: d.reservation.applicationItem.plannedTimeTo,
      reservationComment: d.reservation.comment,
    },
    completion: d.completion
      ? {
          id: d.completion.id,
          outcome: d.completion.outcome,
          completedAt: d.completion.completedAt.toISOString(),
        }
      : null,
    derived: {
      alert: deriveAlert(d),
      canStart: d.status === 'scheduled',
      canArrive: d.status === 'in_transit',
      canComplete: d.status === 'arrived',
    },
  };
}

export function projectDepartures(items: WithIncludes[]): DepartureView[] {
  return items.map(projectDeparture);
}
