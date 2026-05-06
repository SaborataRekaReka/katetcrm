import { useMemo } from 'react';
import { toKanbanLead } from '../../lib/leadAdapter';
import { toUiApplication } from '../../lib/applicationAdapter';
import { toReservationRow } from '../../lib/reservationAdapter';
import {
  toCompletionLeadFromCompletion,
  toDepartureLead,
} from '../../lib/departureAdapter';
import { USE_API } from '../../lib/featureFlags';
import { useApplicationQuery } from '../../hooks/useApplicationsQuery';
import { useCompletionQuery } from '../../hooks/useCompletionsQuery';
import { useDepartureQuery } from '../../hooks/useDeparturesQuery';
import { useLeadQuery } from '../../hooks/useLeadsQuery';
import { useReservationQuery } from '../../hooks/useReservationsQuery';
import { LeadDetailModal } from '../detail/LeadDetailModal';
import { ReservationWorkspace } from '../reservation/ReservationWorkspace';
import { DepartureWorkspace } from '../departure/DepartureWorkspace';
import { CompletionWorkspace } from '../completion/CompletionWorkspace';
import { ClientWorkspace } from '../client/ClientWorkspace';
import { Dialog, DialogContent } from '../ui/dialog';
import { useLayout } from './layoutStore';
import type { RouteEntityType } from './routeSync';

const SECONDARY_IDS_BY_ENTITY: Record<RouteEntityType, ReadonlySet<string>> = {
  lead: new Set([
    'leads',
    'my-leads',
    'view-urgent',
    'view-no-contact',
    'view-to-application',
    'view-needs-reservation',
    'view-stale',
    'view-duplicates',
  ]),
  application: new Set(['applications', 'my-applications', 'apps-no-reservation', 'apps-ready']),
  reservation: new Set([
    'reservations',
    'view-conflict',
    'view-need-confirm',
    'view-no-unit',
    'view-no-subcontractor',
    'view-ready-departure',
    'view-released',
  ]),
  departure: new Set(['departures', 'view-departures-today', 'view-overdue-departures']),
  completion: new Set(['completion', 'view-no-completion']),
  client: new Set(['clients', 'clients-new', 'clients-repeat', 'clients-vip', 'clients-debt']),
};

function entityHandledByCurrentSecondary(
  secondaryId: string,
  entityType: RouteEntityType,
): boolean {
  return SECONDARY_IDS_BY_ENTITY[entityType].has(secondaryId);
}

function OverlayMessage({ text, tone = 'muted' }: { text: string; tone?: 'muted' | 'danger' }) {
  return (
    <div
      className={
        tone === 'danger'
          ? 'flex h-full items-center justify-center text-[12px] text-rose-700'
          : 'flex h-full items-center justify-center text-[12px] text-muted-foreground'
      }
    >
      {text}
    </div>
  );
}

export function GlobalEntityOverlayHost() {
  const {
    activeSecondaryNav,
    activeEntityType,
    activeEntityId,
    setActiveEntityRoute,
    clearActiveEntityRoute,
  } = useLayout();

  const shouldRenderOverlay =
    !!activeEntityType
    && !!activeEntityId
    && !entityHandledByCurrentSecondary(activeSecondaryNav, activeEntityType);

  const targetEntityType = shouldRenderOverlay ? activeEntityType : null;
  const targetEntityId = shouldRenderOverlay ? activeEntityId : null;

  const isLead = targetEntityType === 'lead';
  const isApplication = targetEntityType === 'application';
  const isReservation = targetEntityType === 'reservation';
  const isDeparture = targetEntityType === 'departure';
  const isCompletion = targetEntityType === 'completion';
  const isClient = targetEntityType === 'client';

  const leadQuery = useLeadQuery(targetEntityId, USE_API && isLead && !!targetEntityId);
  const applicationQuery = useApplicationQuery(
    targetEntityId,
    USE_API && isApplication && !!targetEntityId,
  );
  const reservationQuery = useReservationQuery(
    targetEntityId,
    USE_API && isReservation && !!targetEntityId,
  );
  const departureQuery = useDepartureQuery(targetEntityId, USE_API && isDeparture && !!targetEntityId);
  const completionQuery = useCompletionQuery(
    targetEntityId,
    USE_API && isCompletion && !!targetEntityId,
  );

  const lead = useMemo(
    () => (leadQuery.data ? toKanbanLead(leadQuery.data) : null),
    [leadQuery.data],
  );
  const application = useMemo(
    () => (applicationQuery.data ? toUiApplication(applicationQuery.data) : null),
    [applicationQuery.data],
  );
  const reservationRow = useMemo(
    () => (reservationQuery.data ? toReservationRow(reservationQuery.data) : null),
    [reservationQuery.data],
  );
  const departureLead = useMemo(
    () => (departureQuery.data ? toDepartureLead(departureQuery.data) : null),
    [departureQuery.data],
  );
  const completionLead = useMemo(
    () => (completionQuery.data ? toCompletionLeadFromCompletion(completionQuery.data) : null),
    [completionQuery.data],
  );

  const openClientById = (clientId: string | null | undefined) => {
    if (!clientId) return;
    setActiveEntityRoute('client', clientId);
  };

  if (!shouldRenderOverlay || !targetEntityType || !targetEntityId) return null;

  const renderOverlayBody = () => {
    if (!USE_API && targetEntityType !== 'client') {
      return <OverlayMessage text="Открытие связанной сущности доступно только в API-режиме" />;
    }

    if (isLead) {
      if (leadQuery.isPending) return <OverlayMessage text="Загрузка лида..." />;
      if (lead) {
        return (
          <LeadDetailModal
            lead={lead}
            onClose={clearActiveEntityRoute}
            onOpenClient={() => openClientById(lead.apiClientId)}
            onOpenLead={(leadId) => setActiveEntityRoute('lead', leadId)}
          />
        );
      }
      if (leadQuery.isError) return <OverlayMessage text="Не удалось загрузить лид" tone="danger" />;
      return <OverlayMessage text="Лид не найден" tone="danger" />;
    }

    if (isApplication) {
      if (applicationQuery.isPending) return <OverlayMessage text="Загрузка заявки..." />;
      if (application) {
        return (
          <LeadDetailModal
            application={application}
            onClose={clearActiveEntityRoute}
            onOpenClient={() => openClientById(application.clientId)}
            onOpenLead={(leadId) => setActiveEntityRoute('lead', leadId)}
            onWorkflowNavigate={(target, payload) => {
              if (target === 'reservation' && payload?.reservationId) {
                setActiveEntityRoute('reservation', payload.reservationId);
              }
            }}
          />
        );
      }
      if (applicationQuery.isError) {
        return <OverlayMessage text="Не удалось загрузить заявку" tone="danger" />;
      }
      return <OverlayMessage text="Заявка не найдена" tone="danger" />;
    }

    if (isReservation) {
      if (reservationQuery.isPending) return <OverlayMessage text="Загрузка брони..." />;
      if (reservationRow) {
        return (
          <ReservationWorkspace
            lead={reservationRow.lead}
            apiReservationId={reservationRow.reservation.id}
            onClose={clearActiveEntityRoute}
            onOpenClient={(nextLead) => openClientById(nextLead.apiClientId)}
          />
        );
      }
      if (reservationQuery.isError) {
        return <OverlayMessage text="Не удалось загрузить бронь" tone="danger" />;
      }
      return <OverlayMessage text="Бронь не найдена" tone="danger" />;
    }

    if (isDeparture) {
      if (departureQuery.isPending) return <OverlayMessage text="Загрузка выезда..." />;
      if (departureLead) {
        return (
          <DepartureWorkspace
            lead={departureLead}
            apiDepartureId={targetEntityId}
            onClose={clearActiveEntityRoute}
            onOpenClient={(nextLead) => openClientById(nextLead.apiClientId)}
          />
        );
      }
      if (departureQuery.isError) {
        return <OverlayMessage text="Не удалось загрузить выезд" tone="danger" />;
      }
      return <OverlayMessage text="Выезд не найден" tone="danger" />;
    }

    if (isCompletion) {
      if (completionQuery.isPending) return <OverlayMessage text="Загрузка завершения..." />;
      if (completionLead && completionQuery.data) {
        return (
          <CompletionWorkspace
            lead={completionLead}
            apiCompletionId={completionQuery.data.id}
            apiDepartureId={completionQuery.data.departureId}
            onClose={clearActiveEntityRoute}
            onOpenClient={(nextLead) => openClientById(nextLead.apiClientId)}
          />
        );
      }
      if (completionQuery.isError) {
        return <OverlayMessage text="Не удалось загрузить завершение" tone="danger" />;
      }
      return <OverlayMessage text="Завершение не найдено" tone="danger" />;
    }

    if (isClient) {
      return (
        <ClientWorkspace
          apiClientId={targetEntityId}
          onClose={clearActiveEntityRoute}
        />
      );
    }

    return <OverlayMessage text="Сущность не поддерживается" tone="danger" />;
  };

  return (
    <Dialog
      open={shouldRenderOverlay}
      onOpenChange={(open) => {
        // Guard against route loss when switching from global overlay to
        // entity handled by the current page (e.g. reservation -> lead in /leads).
        if (!open && shouldRenderOverlay) clearActiveEntityRoute();
      }}
    >
      <DialogContent className="!max-w-none w-[96vw] h-[92vh] p-0 gap-0 rounded-lg overflow-hidden [&>button]:hidden">
        {renderOverlayBody()}
      </DialogContent>
    </Dialog>
  );
}
