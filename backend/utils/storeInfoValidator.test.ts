import test from 'node:test';
import assert from 'node:assert/strict';
import { validateStoreInfoForSave } from './storeInfoValidator.ts';

test('validateStoreInfoForSave accepts complete store info with valid Indonesian phone formats', () => {
  assert.equal(
    validateStoreInfoForSave({
      storeName: 'Wanzt Store',
      ownerName: 'Dzakwan',
      ownerNumber: '+6282173515807',
    }).valid,
    true
  );
  assert.equal(
    validateStoreInfoForSave({
      storeName: 'Wanzt Store',
      ownerName: 'Dzakwan',
      ownerNumber: '082173515807',
    }).valid,
    true
  );
});

test('validateStoreInfoForSave rejects missing or blank required fields', () => {
  const emptyName = validateStoreInfoForSave({
    storeName: '',
    ownerName: 'Dzakwan',
    ownerNumber: '+6282173515807',
  });
  assert.equal(emptyName.valid, false);
  assert.match(emptyName.error || '', /Konfigurasi gagal disimpan/i);

  const emptyOwner = validateStoreInfoForSave({
    storeName: 'Wanzt Store',
    ownerName: '   ',
    ownerNumber: '+6282173515807',
  });
  assert.equal(emptyOwner.valid, false);

  const emptyPhone = validateStoreInfoForSave({
    storeName: 'Wanzt Store',
    ownerName: 'Dzakwan',
    ownerNumber: '',
  });
  assert.equal(emptyPhone.valid, false);

  const shortPhone = validateStoreInfoForSave({
    storeName: 'Wanzt Store',
    ownerName: 'Dzakwan',
    ownerNumber: '628123',
  });
  assert.equal(shortPhone.valid, false);
});
