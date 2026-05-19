import { Injectable, MessageEvent } from '@nestjs/common';
import type { UserRole } from '@prisma/client';
import { Observable, Subject, filter, map } from 'rxjs';

type LeadCreatedEvent = {
  type: 'lead_created';
  leadId: string;
  managerId: string | null;
  createdAt: string;
};

@Injectable()
export class LeadsEventsService {
  private readonly leadCreated$ = new Subject<LeadCreatedEvent>();

  emitLeadCreated(params: { leadId: string; managerId?: string | null; createdAt?: string }) {
    this.leadCreated$.next({
      type: 'lead_created',
      leadId: params.leadId,
      managerId: params.managerId ?? null,
      createdAt: params.createdAt ?? new Date().toISOString(),
    });
  }

  streamLeadEvents(actor: { id: string; role: UserRole }): Observable<MessageEvent> {
    return this.leadCreated$.pipe(
      filter((event) => actor.role === 'admin' || event.managerId === actor.id),
      map((event) => ({
        type: event.type,
        data: event,
      } satisfies MessageEvent)),
    );
  }
}
