import test from 'node:test';
import assert from 'node:assert/strict';
import { hasRequiredStoreInfoFields, validateStoreInfoSubmission } from './storeInfoValidation';

test('hasRequiredStoreInfoFields returns true only when storeName, ownerName, and valid ownerNumber are present', () => {
  assert.equal(
    hasRequiredStoreInfoFields({
      storeName: 'Wanzt Store',
      ownerName: 'Dzakwan',
      ownerNumber: '+6282173515807',
    }),
    true
  );

  assert.equal(
    hasRequiredStoreInfoFields({
      storeName: '',
      ownerName: 'Dzakwan',
      ownerNumber: '+6282173515807',
    }),
    false
  );

  assert.equal(
    hasRequiredStoreInfoFields({
      storeName: 'Wanzt Store',
      ownerName: '   ',
      ownerNumber: '+6282173515807',
    }),
    false
  );

  assert.equal(
    hasRequiredStoreInfoFields({
      storeName: 'Wanzt Store',
      ownerName: 'Dzakwan',
      ownerNumber: '62123',
    }),
    false
  );
});

test('validateStoreInfoSubmission rejects empty required fields and preserves descriptive error message', () => {
  const missingStore = validateStoreInfoSubmission({
    storeName: '  ',
    ownerName: 'Dzakwan',
    ownerNumber: '+6282173515807',
  });
  assert.equal(missingStore.valid, false);
  assert.match(missingStore.error || '', /Konfigurasi gagal disimpan/i);

  const missingOwner = validateStoreInfoSubmission({
    storeName: 'Wanzt Store',
    ownerName: '',
    ownerNumber: '+6282173515807',
  });
  assert.equal(missingOwner.valid, false);
  assert.match(missingOwner.error || '', /Nama Pemilik/i);

  const missingPhone = validateStoreInfoSubmission({
    storeName: 'Wanzt Store',
    ownerName: 'Dzakwan',
    ownerNumber: '',
  });
  assert.equal(missingPhone.valid, false);
  assert.match(missingPhone.error || '', /WhatsApp Owner/i);
});

test('validateStoreInfoSubmission normalizes valid payload including optional fields', () => {
  const ok = validateStoreInfoSubmission({
    storeName: '  Wanzt Store ',
    ownerName: ' Dzakwan ',
    ownerNumber: '082173515807',
    adminName: ' CS ',
    adminNumber: '82345678901',
    webLink: ' https://toko.id ',
    telegramBot: ' @tokobot ',
    waLink: ' https://whatsapp.com/channel/123 ',
  });
  assert.equal(ok.valid, true);
  assert.deepEqual(ok.normalized, {
    storeName: 'Wanzt Store',
    ownerName: 'Dzakwan',
    ownerNumber: '+6282173515807',
    adminName: 'CS',
    adminNumber: '+6282345678901',
    webLink: 'https://toko.id',
    telegramBot: '@tokobot',
    waLink: 'https://whatsapp.com/channel/123',
  });
});
