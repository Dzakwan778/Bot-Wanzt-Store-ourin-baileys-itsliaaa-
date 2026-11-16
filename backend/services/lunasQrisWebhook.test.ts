import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { verifyLunasQrisSignature } from './lunasQrisService.ts';

function signWebhook(rawBody: string, ts: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(`${ts}.${rawBody}`).digest('hex');
}

test('verifyLunasQrisSignature enforces fresh timestamp (<= 300s) and valid HMAC', () => {
  const secret = 'whsec_test_12345';
  const rawBody = JSON.stringify({ event: 'transaction.paid', data: { order_id: 'ORD-1', total_amount: 10000 } });
  const nowMs = 1_760_000_000_000;
  const freshTsSec = String(Math.floor(nowMs / 1000) - 60);
  const expiredTsSec = String(Math.floor(nowMs / 1000) - 301);
  const futureExpiredTsSec = String(Math.floor(nowMs / 1000) + 305);

  const validSig = signWebhook(rawBody, freshTsSec, secret);
  assert.equal(verifyLunasQrisSignature(rawBody, freshTsSec, validSig, secret, { nowMs }), true);
  assert.equal(verifyLunasQrisSignature(rawBody, freshTsSec, `sha256=${validSig.toUpperCase()}`, secret, { nowMs }), true);

  // Expired timestamp even with valid HMAC MUST fail
  const expiredSig = signWebhook(rawBody, expiredTsSec, secret);
  assert.equal(verifyLunasQrisSignature(rawBody, expiredTsSec, expiredSig, secret, { nowMs }), false);

  const futureSig = signWebhook(rawBody, futureExpiredTsSec, secret);
  assert.equal(verifyLunasQrisSignature(rawBody, futureExpiredTsSec, futureSig, secret, { nowMs }), false);

  // Tampered body / invalid sig / empty secret MUST fail
  assert.equal(verifyLunasQrisSignature(rawBody + ' ', freshTsSec, validSig, secret, { nowMs }), false);
  assert.equal(verifyLunasQrisSignature(rawBody, freshTsSec, validSig, '', { nowMs }), false);
  assert.equal(verifyLunasQrisSignature(rawBody, 'not-a-timestamp', validSig, secret, { nowMs }), false);
});

test('POST /api/lunasqris/webhook fails closed, blocks underpayment/replay, and updates atomically', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lunas-webhook-test-'));
  const repoRoot = process.cwd();

  const script = `
    import assert from 'node:assert/strict';
    import crypto from 'node:crypto';
    import http from 'node:http';
    import { serverApp } from ${JSON.stringify(path.join(repoRoot, 'backend/app.ts'))};
    import { botManager } from ${JSON.stringify(path.join(repoRoot, 'backend/botManager.ts'))};
    import { saveApiConfig } from ${JSON.stringify(path.join(repoRoot, 'backend/config/configManager.ts'))};
    import { recordTransaction, getAllTransactions, updateTransactionStatus } from ${JSON.stringify(path.join(repoRoot, 'backend/services/transactionManager.ts'))};

    function sign(raw, ts, secret) {
      return crypto.createHmac('sha256', secret).update(ts + '.' + raw).digest('hex');
    }

    const server = http.createServer(serverApp);
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const port = server.address().port;
    const base = 'http://127.0.0.1:' + port;

    try {
      // Seed pending order total 10123 and cancelled order
      recordTransaction({
        orderId: 'ORD-PAY-1',
        trxId: 'TRX-PAY-1',
        customerNumber: '628123456789',
        productName: 'YouTube',
        variantName: '1 Bulan',
        nominal: 10000,
        uniqueCode: 123,
        total: 10123,
        status: 'pending',
      });
      recordTransaction({
        orderId: 'ORD-CANCEL-1',
        trxId: 'TRX-CANCEL-1',
        customerNumber: '628123456789',
        productName: 'Netflix',
        variantName: '1 Bulan',
        nominal: 15000,
        uniqueCode: 50,
        total: 15050,
        status: 'cancel',
      });

      const bodyValid = JSON.stringify({
        event: 'transaction.paid',
        data: { order_id: 'ORD-PAY-1', trx_id: 'TRX-PAY-1', status: 'paid', amount: 10000, unique_code: 123, total_amount: 10123 },
      });

      // 1. Empty secret key MUST fail closed (401)
      saveApiConfig({ lunasQrisSecretKey: '' });
      botManager.loadConfig();
      const resNoSecret = await fetch(base + '/api/lunasqris/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: bodyValid,
      });
      assert.equal(resNoSecret.status, 401);

      // Configure secret key
      const secret = 'whsec_live_secret_999';
      saveApiConfig({ lunasQrisSecretKey: secret });
      botManager.loadConfig();

      // 2. Expired timestamp (> 300s) MUST return 401
      const oldTs = String(Math.floor(Date.now() / 1000) - 400);
      const resExpired = await fetch(base + '/api/lunasqris/webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-callback-timestamp': oldTs,
          'x-callback-signature': sign(bodyValid, oldTs, secret),
        },
        body: bodyValid,
      });
      assert.equal(resExpired.status, 401);

      // 3. Underpayment (total_amount: 1) MUST return 422 and keep status pending
      const freshTs = String(Math.floor(Date.now() / 1000));
      const bodyUnderpaid = JSON.stringify({
        event: 'transaction.paid',
        data: { order_id: 'ORD-PAY-1', trx_id: 'TRX-PAY-1', status: 'paid', total_amount: 1 },
      });
      const resUnderpaid = await fetch(base + '/api/lunasqris/webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-callback-timestamp': freshTs,
          'x-callback-signature': sign(bodyUnderpaid, freshTs, secret),
        },
        body: bodyUnderpaid,
      });
      assert.equal(resUnderpaid.status, 422);
      assert.equal(getAllTransactions().find((t) => t.orderId === 'ORD-PAY-1')?.status, 'pending');

      // 4. Missing amount MUST return 422
      const bodyNoAmount = JSON.stringify({
        event: 'transaction.paid',
        data: { order_id: 'ORD-PAY-1', trx_id: 'TRX-PAY-1', status: 'paid' },
      });
      const resNoAmount = await fetch(base + '/api/lunasqris/webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-callback-timestamp': freshTs,
          'x-callback-signature': sign(bodyNoAmount, freshTs, secret),
        },
        body: bodyNoAmount,
      });
      assert.equal(resNoAmount.status, 422);

      // 5. Valid webhook -> 200 and updates pending -> paid
      const resOk = await fetch(base + '/api/lunasqris/webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-callback-timestamp': freshTs,
          'x-callback-signature': sign(bodyValid, freshTs, secret),
        },
        body: bodyValid,
      });
      assert.equal(resOk.status, 200);
      assert.equal(getAllTransactions().find((t) => t.orderId === 'ORD-PAY-1')?.status, 'paid');

      // 6. Cancel-after-paid MUST be rejected (409) and remain paid
      const bodyCancelAfterPaid = JSON.stringify({
        event: 'transaction.expired',
        data: { order_id: 'ORD-PAY-1', trx_id: 'TRX-PAY-1', status: 'expired' },
      });
      const resCancelPaid = await fetch(base + '/api/lunasqris/webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-callback-timestamp': freshTs,
          'x-callback-signature': sign(bodyCancelAfterPaid, freshTs, secret),
        },
        body: bodyCancelAfterPaid,
      });
      assert.equal(resCancelPaid.status, 409);
      assert.equal(getAllTransactions().find((t) => t.orderId === 'ORD-PAY-1')?.status, 'paid');

      // 7. Paid-after-cancel MUST be rejected (409) and remain cancel
      const bodyPaidCancelled = JSON.stringify({
        event: 'transaction.paid',
        data: { order_id: 'ORD-CANCEL-1', trx_id: 'TRX-CANCEL-1', status: 'paid', total_amount: 15050 },
      });
      const resPaidCancelled = await fetch(base + '/api/lunasqris/webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-callback-timestamp': freshTs,
          'x-callback-signature': sign(bodyPaidCancelled, freshTs, secret),
        },
        body: bodyPaidCancelled,
      });
      assert.equal(resPaidCancelled.status, 409);
      assert.equal(updateTransactionStatus('ORD-CANCEL-1', 'paid'), null);
      assert.equal(getAllTransactions().find((t) => t.orderId === 'ORD-CANCEL-1')?.status, 'cancel');

      console.log('ALL_WEBHOOK_HTTP_OK');
    } finally {
      server.close();
    }
  `;

  try {
    const out = execFileSync(
      process.execPath,
      [path.join(repoRoot, 'node_modules/tsx/dist/cli.mjs'), '--input-type=module', '-e', script],
      { cwd: tmpDir, encoding: 'utf-8' }
    );
    assert.match(out, /ALL_WEBHOOK_HTTP_OK/);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});
