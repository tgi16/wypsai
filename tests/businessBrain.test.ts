import test from 'node:test';
import assert from 'node:assert/strict';
import { buildBusinessBrainSnapshot } from '../businessBrain';

const storageReader = (values: Record<string, unknown>) => (key: string) => (
  key in values ? JSON.stringify(values[key]) : null
);

test('Business Brain summarizes operations without leaking secret fields', () => {
  const snapshot = buildBusinessBrainSnapshot('strategy', storageReader({
    wyps_pos_bookings_cache_v1: [
      {
        id: 'booking-1',
        source: 'booking',
        clientName: 'Test Client',
        phone: '09123456789',
        notes: 'private client note',
        refreshToken: 'secret-refresh-token',
        packageName: 'Outdoor Couple',
        date: '2026-08-26',
        status: 'Confirmed',
        workStatus: 'Open',
        balance: 125000,
      },
    ],
    wyps_pos_reminder_status_v1: {},
    wyps_content_approval_board_v1: [
      { status: 'Draft', title: 'Outdoor story', facebookCaption: 'Do not include the full caption' },
    ],
    wyp_content_history: [
      { description: 'Recent portrait', content: { facebookCaption: 'Fresh opening line\n\nBody' } },
    ],
    wyp_facebook_insights_summary: {
      topTopics: [{ topic: 'Outdoor pre-wedding' }],
      recommendations: ['Use visible location details'],
      pageToken: 'secret-page-token',
    },
    wyps_pos_package_catalog_v1: {
      packages: [{ name: 'Outdoor Couple', category: 'Outdoor', price: 250000 }],
      refreshToken: 'catalog-secret',
    },
  }), new Date('2026-08-25T12:00:00+06:30'));

  assert.equal(snapshot.metrics.bookings, 1);
  assert.equal(snapshot.metrics.upcomingSevenDays, 1);
  assert.equal(snapshot.metrics.outstandingBalance, 125000);
  assert.equal(snapshot.metrics.pendingContent, 1);
  assert.match(snapshot.context, /Outdoor Couple/);
  assert.match(snapshot.context, /Recent openings to avoid repeating/);
  assert.doesNotMatch(snapshot.context, /09123456789/);
  assert.doesNotMatch(snapshot.context, /private client note/);
  assert.doesNotMatch(snapshot.context, /secret-refresh-token|secret-page-token|catalog-secret/);
});

test('Business Brain treats missing data as unavailable instead of inventing activity', () => {
  const snapshot = buildBusinessBrainSnapshot('content', () => null, new Date('2026-08-25T12:00:00+06:30'));

  assert.equal(snapshot.sourceCount, 0);
  assert.equal(snapshot.metrics.bookings, 0);
  assert.match(snapshot.context, /Missing data means unknown/);
  assert.match(snapshot.context, /no cached bookings/i);
});
