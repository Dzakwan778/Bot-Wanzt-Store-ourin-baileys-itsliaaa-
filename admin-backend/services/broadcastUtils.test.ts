import test from 'node:test';
import assert from 'node:assert/strict';
import {
  resolveBroadcastPlaceholders,
  parseWibDateTimeToUtcIso,
  computeNextRecurringRunUtc,
  evaluateCampaignRunStatus,
  deriveCampaignTitle,
} from './broadcastUtils.ts';

test('resolveBroadcastPlaceholders replaces all tenant variables accurately', () => {
  const now = Date.UTC(2026, 10, 14, 2, 0, 0); // 14 Nov 2026 09:00 WIB
  const expiresAt = new Date(now + 5 * 24 * 60 * 60 * 1000).toISOString();

  const result = resolveBroadcastPlaceholders(
    'Halo {ownerName} dari {storeName} ({tenantId}), WA {ownerPhone}, sisa {daysRemaining} hari ({remainingTime}) sampai {expiryDate}.',
    {
      tenant_id: 't_berkah',
      store_name: 'Berkah Store',
      owner_name: 'Budi',
      owner_phone: '+628123456789',
      expires_at: expiresAt,
    },
    now
  );

  assert.ok(result.includes('Halo Budi dari Berkah Store (t_berkah)'));
  assert.ok(result.includes('WA +628123456789'));
  assert.ok(result.includes('sisa 5 hari (5 hari)'));
  assert.ok(result.includes('WIB'));
});

test('parseWibDateTimeToUtcIso converts WIB datetime string to exact UTC ISO', () => {
  // 2026-11-15 09:30 WIB == 2026-11-15 02:30 UTC
  const iso = parseWibDateTimeToUtcIso('2026-11-15T09:30');
  assert.equal(iso, '2026-11-15T02:30:00.000Z');
  assert.equal(parseWibDateTimeToUtcIso('2026-02-31T09:00'), null);
});

test('computeNextRecurringRunUtc handles daily WIB schedules properly', () => {
  // 2026-11-14 08:00 WIB (01:00 UTC) -> target 09:00 WIB runs same day (02:00 UTC)
  const morningRef = Date.UTC(2026, 10, 14, 1, 0, 0);
  assert.equal(
    computeNextRecurringRunUtc({ schedule_type: 'daily', recurrence_time: '09:00' }, morningRef),
    '2026-11-14T02:00:00.000Z'
  );

  // 2026-11-14 09:00 WIB exact -> advances to next day 2026-11-15 09:00 WIB
  const exactRef = Date.UTC(2026, 10, 14, 2, 0, 0);
  assert.equal(
    computeNextRecurringRunUtc({ schedule_type: 'daily', recurrence_time: '09:00' }, exactRef),
    '2026-11-15T02:00:00.000Z'
  );
});

test('computeNextRecurringRunUtc handles weekly WIB schedules properly', () => {
  // 2026-11-14 is Saturday (day 6), 08:00 WIB
  const satMorning = Date.UTC(2026, 10, 14, 1, 0, 0);
  // Target Monday (day 1) 10:00 WIB -> 2026-11-16 03:00 UTC
  assert.equal(
    computeNextRecurringRunUtc(
      { schedule_type: 'weekly', recurrence_day_of_week: 1, recurrence_time: '10:00' },
      satMorning
    ),
    '2026-11-16T03:00:00.000Z'
  );
});

test('computeNextRecurringRunUtc clamps day 31 in February accurately', () => {
  // 2026-02-01 08:00 WIB -> target day 31 at 09:00 WIB -> 2026-02-28 09:00 WIB (02:00 UTC)
  const febStart = Date.UTC(2026, 1, 1, 1, 0, 0);
  assert.equal(
    computeNextRecurringRunUtc(
      { schedule_type: 'monthly', recurrence_day_of_month: 31, recurrence_time: '09:00' },
      febStart
    ),
    '2026-02-28T02:00:00.000Z'
  );
});

test('evaluateCampaignRunStatus returns expected outcome status', () => {
  assert.equal(evaluateCampaignRunStatus({ totalSuccess: 4, totalFailed: 0 }), 'completed');
  assert.equal(evaluateCampaignRunStatus({ totalSuccess: 2, totalFailed: 2 }), 'partial');
  assert.equal(evaluateCampaignRunStatus({ totalSuccess: 0, totalFailed: 3 }), 'failed');
  assert.equal(evaluateCampaignRunStatus({ totalSuccess: 0, totalFailed: 0 }), 'completed');
});

test('deriveCampaignTitle falls back to trimmed first line when title blank', () => {
  assert.equal(deriveCampaignTitle('  Promo Server  ', 'Isi pesan'), 'Promo Server');
  assert.equal(deriveCampaignTitle('', '\n  Halo seluruh mitra toko!\nDetail lengkapnya...'), 'Halo seluruh mitra toko!');
});
