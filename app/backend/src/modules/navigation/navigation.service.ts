import { Injectable } from '@nestjs/common';
import type { UserRole } from '@prisma/client';
import { projectApplication } from '../../common/projections/application.projection';
import { projectCompletion } from '../../common/projections/completion.projection';
import { projectDeparture } from '../../common/projections/departure.projection';
import { buildStageLinkedIds, type StageLinkedIds } from '../../common/projections/linked-ids';
import { projectLead } from '../../common/projections/lead.projection';
import { projectReservation } from '../../common/projections/reservation.projection';
import { ApplicationsService } from '../applications/applications.service';
import { CompletionsService } from '../completions/completions.service';
import { DeparturesService } from '../departures/departures.service';
import { LeadsService } from '../leads/leads.service';
import { ReservationsService } from '../reservations/reservations.service';
import type { DeepLinkEntityType } from './navigation.dto';

const CANONICAL_SECONDARY_BY_ENTITY: Record<DeepLinkEntityType, string> = {
  lead: 'leads',
  application: 'applications',
  reservation: 'reservations',
  departure: 'departures',
  completion: 'completion',
};

interface ActorContext {
  id: string;
  role: UserRole;
}

export interface DeepLinkResolveResponse {
  canonical: {
    secondaryId: string;
    entityType: DeepLinkEntityType;
    entityId: string;
  };
  linkedIds: StageLinkedIds;
}

@Injectable()
export class NavigationService {
  constructor(
    private readonly leads: LeadsService,
    private readonly applications: ApplicationsService,
    private readonly reservations: ReservationsService,
    private readonly departures: DeparturesService,
    private readonly completions: CompletionsService,
  ) {}

  async resolve(
    entityType: DeepLinkEntityType,
    entityId: string,
    actor: ActorContext,
  ): Promise<DeepLinkResolveResponse> {
    switch (entityType) {
      case 'lead': {
        const lead = await this.leads.get(entityId, actor);
        const projected = projectLead(lead);
        return this.toResponse('lead', projected.id, projected.linkedIds);
      }
      case 'application': {
        const application = await this.applications.get(entityId, actor);
        const projected = projectApplication(application);
        return this.toResponse('application', projected.id, projected.linkedIds);
      }
      case 'reservation': {
        const reservation = await this.reservations.get(entityId, actor);
        const projected = projectReservation(reservation);
        return this.toResponse('reservation', projected.id, projected.linkedIds);
      }
      case 'departure': {
        const departure = await this.departures.get(entityId, actor);
        const projected = projectDeparture(departure);
        return this.toResponse('departure', projected.id, projected.linkedIds);
      }
      case 'completion': {
        const completion = await this.completions.get(entityId, actor);
        const projected = projectCompletion(completion);
        return this.toResponse('completion', projected.id, projected.linkedIds);
      }
      default: {
        return this.toResponse(entityType, entityId, buildStageLinkedIds({}));
      }
    }
  }

  private toResponse(
    entityType: DeepLinkEntityType,
    entityId: string,
    linkedIds: StageLinkedIds,
  ): DeepLinkResolveResponse {
    return {
      canonical: {
        secondaryId: CANONICAL_SECONDARY_BY_ENTITY[entityType],
        entityType,
        entityId,
      },
      linkedIds,
    };
  }
}
