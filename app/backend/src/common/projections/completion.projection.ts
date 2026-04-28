import type { CompletionOutcome, Prisma } from '@prisma/client';

export type CompletionStatus =
  | 'ready_to_complete'
  | 'blocked'
  | 'completed'
  | 'unqualified';

export type CompletionAlert =
  | 'none'
  | 'stale'
  | 'missing_arrival'
  | 'reservation_mismatch';

export interface CompletionView {
  id: string;
  departureId: string;
  outcome: CompletionOutcome;
  completionNote: string | null;
  unqualifiedReason: string | null;
  completedById: string | null;
  completedByName: string | null;
  completedAt: string;
  linked: {
    reservationId: string;
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
    subcontractorId: string | null;
    subcontractorLabel: string | null;
  };
  context: {
    plannedStart: string;
    plannedEnd: string;
    scheduledAt: string;
    startedAt: string | null;
    arrivedAt: string | null;
    address: string | null;
    plannedDate: string | null;
    plannedTimeFrom: string | null;
    plannedTimeTo: string | null;
    deliveryNotes: string | null;
    cancellationReason: string | null;
  };
  derived: {
    status: CompletionStatus;
    alert: CompletionAlert;
  };
}

type WithIncludes = Prisma.CompletionGetPayload<{
  include: {
    completedBy: {
      select: {
        id: true;
        fullName: true;
      };
    };
    departure: {
      select: {
        id: true;
        status: true;
        scheduledAt: true;
        startedAt: true;
        arrivedAt: true;
        deliveryNotes: true;
        cancellationReason: true;
        reservationId: true;
        reservation: {
          select: {
            id: true;
            plannedStart: true;
            plannedEnd: true;
            equipmentTypeId: true;
            equipmentType: { select: { id: true; name: true } };
            equipmentUnitId: true;
            equipmentUnit: { select: { id: true; name: true } };
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
    };
  };
}>;

const HOUR_MS = 60 * 60 * 1000;

function deriveStatus(outcome: CompletionOutcome): CompletionStatus {
  if (outcome === 'completed') return 'completed';
  return 'unqualified';
}

function deriveAlert(c: WithIncludes): CompletionAlert {
  if (!c.departure.arrivedAt) return 'missing_arrival';
  if (Date.now() - c.completedAt.getTime() > 72 * HOUR_MS) return 'stale';
  return 'none';
}

export function projectCompletion(c: WithIncludes): CompletionView {
  return {
    id: c.id,
    departureId: c.departureId,
    outcome: c.outcome,
    completionNote: c.completionNote,
    unqualifiedReason: c.unqualifiedReason,
    completedById: c.completedById,
    completedByName: c.completedBy?.fullName ?? null,
    completedAt: c.completedAt.toISOString(),
    linked: {
      reservationId: c.departure.reservationId,
      applicationId: c.departure.reservation.applicationItem.applicationId,
      applicationNumber: c.departure.reservation.applicationItem.application.number,
      leadId: c.departure.reservation.applicationItem.application.leadId,
      clientId: c.departure.reservation.applicationItem.application.clientId,
      clientName: c.departure.reservation.applicationItem.application.client?.name ?? null,
      clientCompany:
        c.departure.reservation.applicationItem.application.client?.company ?? null,
      clientPhone: c.departure.reservation.applicationItem.application.client?.phone ?? null,
      responsibleManagerId:
        c.departure.reservation.applicationItem.application.responsibleManagerId,
      responsibleManagerName:
        c.departure.reservation.applicationItem.application.responsibleManager
          ?.fullName ?? null,
      applicationItemId: c.departure.reservation.applicationItem.id,
      positionLabel: c.departure.reservation.applicationItem.equipmentTypeLabel,
      quantity: c.departure.reservation.applicationItem.quantity,
      equipmentTypeId: c.departure.reservation.equipmentTypeId,
      equipmentTypeLabel:
        c.departure.reservation.equipmentType?.name ??
        c.departure.reservation.applicationItem.equipmentTypeLabel,
      equipmentUnitId: c.departure.reservation.equipmentUnitId,
      equipmentUnitLabel: c.departure.reservation.equipmentUnit?.name ?? null,
      subcontractorId: c.departure.reservation.subcontractorId,
      subcontractorLabel: c.departure.reservation.subcontractor?.name ?? null,
    },
    context: {
      plannedStart: c.departure.reservation.plannedStart.toISOString(),
      plannedEnd: c.departure.reservation.plannedEnd.toISOString(),
      scheduledAt: c.departure.scheduledAt.toISOString(),
      startedAt: c.departure.startedAt ? c.departure.startedAt.toISOString() : null,
      arrivedAt: c.departure.arrivedAt ? c.departure.arrivedAt.toISOString() : null,
      address: c.departure.reservation.applicationItem.address,
      plannedDate: c.departure.reservation.applicationItem.plannedDate
        ? c.departure.reservation.applicationItem.plannedDate.toISOString()
        : null,
      plannedTimeFrom: c.departure.reservation.applicationItem.plannedTimeFrom,
      plannedTimeTo: c.departure.reservation.applicationItem.plannedTimeTo,
      deliveryNotes: c.departure.deliveryNotes,
      cancellationReason: c.departure.cancellationReason,
    },
    derived: {
      status: deriveStatus(c.outcome),
      alert: deriveAlert(c),
    },
  };
}

export function projectCompletions(items: WithIncludes[]): CompletionView[] {
  return items.map(projectCompletion);
}
