export interface StageLinkedIds {
  leadId: string | null;
  applicationId: string | null;
  reservationId: string | null;
  departureId: string | null;
  completionId: string | null;
  clientId: string | null;
  applicationItemId: string | null;
}

export function buildStageLinkedIds(partial: Partial<StageLinkedIds>): StageLinkedIds {
  return {
    leadId: null,
    applicationId: null,
    reservationId: null,
    departureId: null,
    completionId: null,
    clientId: null,
    applicationItemId: null,
    ...partial,
  };
}
