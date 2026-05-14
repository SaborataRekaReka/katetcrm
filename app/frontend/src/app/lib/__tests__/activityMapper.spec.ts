import { describe, expect, it } from 'vitest';
import {
  extractLatestTelephonyRecording,
  mapActivityEntries,
} from '../activityMapper';
import type { ActivityLogEntryApi } from '../activityApi';

function activityEntry(
  overrides: Partial<ActivityLogEntryApi>,
): ActivityLogEntryApi {
  return {
    id: 'activity-1',
    action: 'note_added',
    entityType: 'lead',
    entityId: 'lead-1',
    summary: 'Входящий звонок Mango',
    actorId: null,
    actor: null,
    payload: {},
    createdAt: '2026-05-15T10:00:00.000Z',
    ...overrides,
  };
}

describe('Activity mapper telephony recording placement (QA-REQ-037)', () => {
  it('extracts the latest valid Mango recording for the sidebar player', () => {
    const entries = [
      activityEntry({
        id: 'old-call',
        createdAt: '2026-05-15T09:00:00.000Z',
        payload: {
          telephony: {
            direction: 'incoming',
            from: '+79990000001',
            to: '+74950000000',
            durationSec: 75,
            recordingUrl: 'https://records.example/old.mp3',
          },
        },
      }),
      activityEntry({
        id: 'new-call',
        summary: 'Исходящий звонок Mango',
        createdAt: '2026-05-15T11:00:00.000Z',
        payload: {
          telephony: {
            direction: 'outgoing',
            from: '+74950000000',
            to: '+79990000002',
            durationSec: 125,
            status: 'completed',
            talkRecordUrl: 'https://records.example/new.mp3',
          },
        },
      }),
    ];

    expect(extractLatestTelephonyRecording(entries)).toMatchObject({
      href: 'https://records.example/new.mp3',
      summary: 'Исходящий звонок Mango',
      direction: 'исходящий',
      from: '+74950000000',
      to: '+79990000002',
      duration: '02:05',
      status: 'completed',
    });
  });

  it('keeps recording URLs out of the activity timeline links', () => {
    const [entry] = mapActivityEntries([
      activityEntry({
        payload: {
          telephony: {
            direction: 'incoming',
            durationSec: 42,
            recordingUrl: 'https://records.example/call.mp3',
          },
        },
      }),
    ]);

    expect(entry.details).toContain('Направление: входящий');
    expect(entry.details).toContain('Длительность: 00:42');
    expect(entry.links).toBeUndefined();
  });
});