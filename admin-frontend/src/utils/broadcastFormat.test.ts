import test from 'node:test';
import assert from 'node:assert/strict';
import {
  toWibDateTimeLocalInput,
  describeScheduleRule,
  previewBroadcastText,
} from './broadcastFormat.ts';

test('toWibDateTimeLocalInput formats UTC timestamp as WIB YYYY-MM-DDTHH:mm', () => {
  // 2026-11-15T02:30:00.000Z == 2026-11-15 09:30 WIB
  assert.equal(toWibDateTimeLocalInput('2026-11-15T02:30:00.000Z'), '2026-11-15T09:30');
});

test('describeScheduleRule produces clear human labels for all schedule modes', () => {
  assert.equal(
    describeScheduleRule({
      schedule_type: 'daily',
      scheduled_at: null,
      recurrence_time: '08:15',
      recurrence_day_of_week: null,
      recurrence_day_of_month: null,
    }),
    'Harian · Pukul 08:15 WIB'
  );

  assert.equal(
    describeScheduleRule({
      schedule_type: 'weekly',
      scheduled_at: null,
      recurrence_time: '19:00',
      recurrence_day_of_week: 5,
      recurrence_day_of_month: null,
    }),
    'Mingguan · Setiap Jumat, 19:00 WIB'
  );

  assert.equal(
    describeScheduleRule({
      schedule_type: 'monthly',
      scheduled_at: null,
      recurrence_time: '09:00',
      recurrence_day_of_week: null,
      recurrence_day_of_month: 25,
    }),
    'Bulanan · Tanggal 25, 09:00 WIB'
  );
});

test('previewBroadcastText renders sample tenant placeholders cleanly', () => {
  const now = Date.UTC(2026, 10, 14, 0, 0, 0);
  const rendered = previewBroadcastText(
    'Halo {ownerName} dari {storeName} ({tenantId}), sisa {daysRemaining} hari.',
    {
      tenant_id: 't_wanzt',
      store_name: 'Wanzt Store',
      owner_name: 'Dzakwan',
      owner_phone: '+6282173515807',
      expires_at: new Date(now + 10 * 24 * 60 * 60 * 1000).toISOString(),
    },
    now
  );
  assert.equal(rendered, 'Halo Dzakwan dari Wanzt Store (t_wanzt), sisa 10 hari.');
});
