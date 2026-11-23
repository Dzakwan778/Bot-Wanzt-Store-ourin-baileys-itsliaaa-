import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

test('Sesi 4: revocation on password/suspend/reset/delete, hardened cookies, single-use hash impersonation linked to admin session, and atomic promo/token quotas', () => {
  const repoRoot = path.resolve(import.meta.dirname, '..', '..');
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wanzt-sesi4-test-'));
  const scriptPath = path.join(tmpDir, 'run-sesi4-checks.ts');

  const appPath = path.join(repoRoot, 'backend', 'app.ts');
  const authMgrPath = path.join(repoRoot, 'backend', 'services', 'authManager.ts');
  const masterDbPath = path.join(repoRoot, 'admin-backend', 'database', 'masterSqlite.ts');
  const adminAuthPath = path.join(repoRoot, 'admin-backend', 'services', 'adminAuthService.ts');
  const tenantSvcPath = path.join(repoRoot, 'admin-backend', 'services', 'tenantService.ts');
  const tenantMgrPath = path.join(repoRoot, 'admin-backend', 'services', 'tenantManager.ts');
  const statusSvcPath = path.join(repoRoot, 'admin-backend', 'services', 'tenantStatusService.ts');
  const tokenSvcPath = path.join(repoRoot, 'admin-backend', 'services', 'tokenService.ts');
  const ctxPath = path.join(repoRoot, 'backend', 'database', 'tenantContext.ts');
  const sqlitePath = path.join(repoRoot, 'backend', 'database', 'sqlite.ts');
  const trxMgrPath = path.join(repoRoot, 'backend', 'services', 'transactionManager.ts');
  const dispatcherPath = path.join(repoRoot, 'backend', 'handlers', 'messageDispatcher.ts');

  const runnerSource = `
import assert from 'node:assert/strict';
import http from 'node:http';
import { serverApp } from ${JSON.stringify(appPath)};
import { createSession, getSession } from ${JSON.stringify(authMgrPath)};
import { getMasterDb, hashPassword } from ${JSON.stringify(masterDbPath)};
import * as AdminAuthMod from ${JSON.stringify(adminAuthPath)};
import { AdminAuthService } from ${JSON.stringify(adminAuthPath)};
import { TenantService } from ${JSON.stringify(tenantSvcPath)};
import { TenantManager } from ${JSON.stringify(tenantMgrPath)};
import { TenantStatusService } from ${JSON.stringify(statusSvcPath)};
import { TokenService } from ${JSON.stringify(tokenSvcPath)};
import { runWithTenant } from ${JSON.stringify(ctxPath)};
import {
  createPromoCode,
  getPromoCodeById,
  reservePromoQuota,
  releasePromoQuota,
} from ${JSON.stringify(sqlitePath)};
import {
  recordTransaction,
  updateTransactionStatus,
  applyLunasQrisWebhookUpdate,
} from ${JSON.stringify(trxMgrPath)};
import {
  dispatchIncomingMessages,
  activeCheckoutSessions,
} from ${JSON.stringify(dispatcherPath)};

function parseSetCookies(res: Response): string[] {
  const h = res.headers as any;
  if (typeof h.getSetCookie === 'function') {
    return h.getSetCookie();
  }
  const single = res.headers.get('set-cookie');
  return single ? [single] : [];
}

async function main() {
  // Pastikan activeAdminTokens sudah dihapus dari adminAuthService
  assert.equal('activeAdminTokens' in AdminAuthMod, false, 'activeAdminTokens harus sudah dihapus');

  const masterDb = getMasterDb();
  const nowIso = new Date().toISOString();
  const adminPass = 'AdminSesi4Pass!';
  masterDb.prepare(\`
    INSERT INTO super_admins (username, password_hash, name, created_at)
    VALUES (?, ?, ?, ?)
  \`).run('master_sesi4', hashPassword(adminPass), 'Master Sesi 4', nowIso);

  const server = http.createServer(serverApp);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));

  try {
    const addr = server.address() as { port: number };
    const baseUrl = \`http://127.0.0.1:\${addr.port}\`;

    // Buat tenant uji Sesi 4
    const tenant = TenantManager.createTenant({
      tenant_id: 't_sesi4_shop',
      store_name: 'Toko Sesi 4',
      owner_name: 'Owner Sesi 4',
      owner_phone: '628123450004',
      username: 'sesi4_user',
      password: 'OldPassword1!',
      duration_days: 10,
    });

    // 1. Uji atribut cookie sesi pada HTTP & HTTPS (via X-Forwarded-Proto: https)
    const loginHttpRes = await fetch(\`\${baseUrl}/api/auth/login\`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'sesi4_user', password: 'OldPassword1!' }),
    });
    assert.equal(loginHttpRes.status, 200);
    const loginHttpJson: any = await loginHttpRes.json();
    const oldToken = loginHttpJson.token;
    assert.ok(oldToken);

    const httpCookies = parseSetCookies(loginHttpRes);
    const authCookieHttp = httpCookies.find((c) => c.startsWith('auth_token='));
    assert.ok(authCookieHttp, 'auth_token cookie harus dikirim');
    assert.match(authCookieHttp!, /HttpOnly/i);
    assert.match(authCookieHttp!, /SameSite=Lax/i);
    assert.doesNotMatch(authCookieHttp!, /;\\s*Secure\\b/i);

    const loginHttpsRes = await fetch(\`\${baseUrl}/api/auth/login\`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Forwarded-Proto': 'https',
      },
      body: JSON.stringify({ username: 'sesi4_user', password: 'OldPassword1!' }),
    });
    assert.equal(loginHttpsRes.status, 200);
    const loginHttpsJson: any = await loginHttpsRes.json();
    const secondDeviceToken = loginHttpsJson.token;
    const httpsCookies = parseSetCookies(loginHttpsRes);
    const authCookieHttps = httpsCookies.find((c) => c.startsWith('auth_token='));
    assert.ok(authCookieHttps);
    assert.match(authCookieHttps!, /HttpOnly/i);
    assert.match(authCookieHttps!, /SameSite=Lax/i);
    assert.match(authCookieHttps!, /;\\s*Secure\\b/i);

    // Kedua token aktif sebelum ganti password
    const beforeChangeRes = await fetch(\`\${baseUrl}/api/auth/store-status\`, {
      headers: { Authorization: \`Bearer \${secondDeviceToken}\` },
    });
    assert.equal(beforeChangeRes.status, 200);

    // 2. Uji ganti password mencabut seluruh token lama & merotasi token pemanggil
    const pwRes = await fetch(\`\${baseUrl}/api/auth/profile/update-password\`, {
      method: 'POST',
      headers: {
        Authorization: \`Bearer \${oldToken}\`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        currentPassword: 'OldPassword1!',
        newPassword: 'NewPassword2!',
        confirmPassword: 'NewPassword2!',
      }),
    });
    assert.equal(pwRes.status, 200);
    const pwJson: any = await pwRes.json();
    const rotatedToken = pwJson.token;
    assert.ok(rotatedToken && rotatedToken !== oldToken);

    // Token lama milik device 1 maupun device 2 harus langsung 401
    assert.equal(getSession(oldToken), null);
    assert.equal(getSession(secondDeviceToken), null);
    const staleRes1 = await fetch(\`\${baseUrl}/api/auth/store-status\`, {
      headers: { Authorization: \`Bearer \${oldToken}\` },
    });
    assert.equal(staleRes1.status, 401);
    const staleRes2 = await fetch(\`\${baseUrl}/api/auth/store-status\`, {
      headers: { Authorization: \`Bearer \${secondDeviceToken}\` },
    });
    assert.equal(staleRes2.status, 401);

    // Token rotasi baru tetap aktif (200)
    const activeRotatedRes = await fetch(\`\${baseUrl}/api/auth/store-status\`, {
      headers: { Authorization: \`Bearer \${rotatedToken}\` },
    });
    assert.equal(activeRotatedRes.status, 200);

    // 3. Uji Master Admin reset password langsung mencabut token tenant aktif
    TenantService.resetPassword(tenant.tenant_id, 'AdminReset3!');
    const afterResetRes = await fetch(\`\${baseUrl}/api/auth/store-status\`, {
      headers: { Authorization: \`Bearer \${rotatedToken}\` },
    });
    assert.equal(afterResetRes.status, 401);

    // 4. Uji impersonasi via one-time exchange code & pencabutan saat Master Admin logout / ganti password
    const adminLogin1 = AdminAuthService.login('master_sesi4', adminPass, '127.0.0.1');
    const impReqRes = await fetch(\`\${baseUrl}/api/admin/tenants/\${tenant.tenant_id}/impersonate\`, {
      method: 'POST',
      headers: { Authorization: \`Bearer \${adminLogin1.token}\` },
    });
    assert.equal(impReqRes.status, 200);
    const impReqJson: any = await impReqRes.json();
    assert.ok(impReqJson.code);
    assert.equal(impReqJson.redirectUrl, \`/#impersonate_code=\${impReqJson.code}\`);

    // Tukar code via POST
    const exchangeRes = await fetch(\`\${baseUrl}/api/auth/impersonate/exchange\`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: impReqJson.code }),
    });
    assert.equal(exchangeRes.status, 200);
    const exchangeJson: any = await exchangeRes.json();
    const impToken1 = exchangeJson.token;
    assert.ok(impToken1);
    assert.equal(exchangeJson.user.isImpersonation, true);

    // Code bersifat single-use (replay ditolak 401)
    const replayExchangeRes = await fetch(\`\${baseUrl}/api/auth/impersonate/exchange\`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: impReqJson.code }),
    });
    assert.equal(replayExchangeRes.status, 401);

    // Token impersonasi aktif
    const impCheck1 = await fetch(\`\${baseUrl}/api/auth/store-status\`, {
      headers: { Authorization: \`Bearer \${impToken1}\` },
    });
    assert.equal(impCheck1.status, 200);

    // Saat Master Admin logout, token impersonasi langsung mati (401)
    const adminLogoutRes = await fetch(\`\${baseUrl}/api/admin/auth/logout\`, {
      method: 'POST',
      headers: { Authorization: \`Bearer \${adminLogin1.token}\` },
    });
    assert.equal(adminLogoutRes.status, 200);

    const impAfterLogout = await fetch(\`\${baseUrl}/api/auth/store-status\`, {
      headers: { Authorization: \`Bearer \${impToken1}\` },
    });
    assert.equal(impAfterLogout.status, 401);

    // Uji ulang saat Master Admin ganti password: token impersonasi juga ikut mati
    const adminLogin2 = AdminAuthService.login('master_sesi4', adminPass, '127.0.0.1');
    const impReqRes2 = await fetch(\`\${baseUrl}/api/admin/tenants/\${tenant.tenant_id}/impersonate\`, {
      method: 'POST',
      headers: { Authorization: \`Bearer \${adminLogin2.token}\` },
    });
    const impReqJson2: any = await impReqRes2.json();
    const exchangeRes2 = await fetch(\`\${baseUrl}/api/auth/impersonate/exchange\`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: impReqJson2.code }),
    });
    const exchangeJson2: any = await exchangeRes2.json();
    const impToken2 = exchangeJson2.token;

    const adminNewPass = 'AdminSesi4Baru!';
    AdminAuthService.changePassword(adminLogin2.admin.id, adminPass, adminNewPass, adminNewPass);

    const impAfterAdminPw = await fetch(\`\${baseUrl}/api/auth/store-status\`, {
      headers: { Authorization: \`Bearer \${impToken2}\` },
    });
    assert.equal(impAfterAdminPw.status, 401);

    // 5. Uji status suspended mencabut sesi, sedangkan expired mengunci operasional selain redeem-token & status
    const tokPreExpire = createSession(tenant.username, tenant.tenant_id);
    masterDb.prepare("UPDATE tenants SET expires_at = ? WHERE tenant_id = ?").run(
      new Date(Date.now() - 60_000).toISOString(),
      tenant.tenant_id
    );
    const expiredBlockedRes = await fetch(\`\${baseUrl}/api/pricing\`, {
      headers: { Authorization: \`Bearer \${tokPreExpire}\` },
    });
    assert.equal(expiredBlockedRes.status, 403);
    const expiredStatusRes = await fetch(\`\${baseUrl}/api/bot/status\`, {
      headers: { Authorization: \`Bearer \${tokPreExpire}\` },
    });
    assert.equal(expiredStatusRes.status, 200);

    // 6. Uji TokenService.redeemToken atomik single-use & membuka kembali status active
    const voucher = TokenService.createToken(14, 'days');
    const firstRedeem = TokenService.redeemToken(voucher.token_code, tenant.tenant_id);
    assert.equal(firstRedeem.success, true);
    assert.equal(firstRedeem.token?.status, 'used');

    const expAfterFirst = TenantService.getTenant(tenant.tenant_id)!.expires_at;
    const noHyphenCode = voucher.token_code.replace(/-/g, '');
    const secondRedeem = TokenService.redeemToken(noHyphenCode, tenant.tenant_id);
    assert.equal(secondRedeem.success, false);
    assert.equal(TenantService.getTenant(tenant.tenant_id)!.expires_at, expAfterFirst);

    // 7. Uji status suspended mencabut sesi tenant & impersonasi secara penuh
    const tokBeforeSuspend = createSession(tenant.username, tenant.tenant_id);
    await TenantStatusService.setStatus(tenant.tenant_id, 'suspended');
    assert.equal(getSession(tokBeforeSuspend), null);
    const afterSuspendRes = await fetch(\`\${baseUrl}/api/bot/status\`, {
      headers: { Authorization: \`Bearer \${tokBeforeSuspend}\` },
    });
    assert.equal(afterSuspendRes.status, 401);

    // 8. Uji reservasi kuota promo atomik (quota=1) & pengembalian kuota saat cancel
    runWithTenant(tenant.tenant_id, () => {
      const promo = createPromoCode({
        code: 'SATUKALI',
        discountMode: 'rp',
        discountValue: 1000,
        quota: 1,
        isForever: true,
      });

      const r1 = reservePromoQuota(promo.id);
      assert.equal(r1.reserved, true);
      assert.equal(getPromoCodeById(promo.id)?.usedCount, 1);

      const r2 = reservePromoQuota(promo.id);
      assert.equal(r2.reserved, false);
      assert.equal(getPromoCodeById(promo.id)?.usedCount, 1);

      recordTransaction({
        orderId: 'ORD-PROMO-CANCEL-1',
        trxId: 'TRX-PC-1',
        customerNumber: '628999000111',
        productName: 'Netflix Premium',
        variantName: '1 Bulan',
        nominal: 20000,
        uniqueCode: 123,
        total: 20123,
        promoId: promo.id,
        status: 'pending',
      });

      const cancelled = updateTransactionStatus('ORD-PROMO-CANCEL-1', 'cancel');
      assert.ok(cancelled);
      assert.equal(cancelled?.status, 'cancel');
      assert.equal(getPromoCodeById(promo.id)?.usedCount, 0);

      // Idempotency: cancel ulang tidak menurunkan used_count di bawah 0
      assert.equal(updateTransactionStatus('ORD-PROMO-CANCEL-1', 'cancel'), null);
      assert.equal(getPromoCodeById(promo.id)?.usedCount, 0);

      // Webhook cancel juga mengembalikan kuota promo sekali saja
      const r3 = reservePromoQuota(promo.id);
      assert.equal(r3.reserved, true);
      recordTransaction({
        orderId: 'ORD-PROMO-CANCEL-2',
        trxId: 'TRX-PC-2',
        customerNumber: '628999000112',
        productName: 'Spotify',
        variantName: '1 Bulan',
        nominal: 15000,
        uniqueCode: 111,
        total: 15111,
        promoId: promo.id,
        status: 'pending',
      });
      const whCancel = applyLunasQrisWebhookUpdate({
        orderId: 'ORD-PROMO-CANCEL-2',
        trxId: 'TRX-PC-2',
        targetStatus: 'cancel',
      });
      assert.equal(whCancel.ok, true);
      assert.equal(getPromoCodeById(promo.id)?.usedCount, 0);

      // Release langsung setelah gateway error
      assert.equal(reservePromoQuota(promo.id).reserved, true);
      assert.equal(getPromoCodeById(promo.id)?.usedCount, 1);
      assert.equal(releasePromoQuota(promo.id), true);
      assert.equal(getPromoCodeById(promo.id)?.usedCount, 0);
    });

    // 9. Uji 2 pembeli paralel mengirim TEST10 serentak di WhatsApp dispatcher pada promo kuota=1:
    // hanya 1 pembeli yang boleh mendapat notif "KODE PROMO BERHASIL DIGUNAKAN!"
    await runWithTenant(tenant.tenant_id, async () => {
      const racePromo = createPromoCode({
        code: 'TEST10',
        discountMode: 'rp',
        discountValue: 100,
        quota: 1,
        isForever: true,
      });

      const b1 = '628111000001@s.whatsapp.net';
      const b2 = '628111000002@s.whatsapp.net';
      const nowMs = Date.now();
      activeCheckoutSessions.set(b1, {
        senderJid: b1,
        senderCleanNumber: '628111000001',
        senderName: 'Buyer Satu',
        productName: 'Netflix',
        variantName: '1P',
        price: 1300,
        costPrice: 1200,
        initialMargin: 100,
        createdAt: nowMs,
        expiresAt: nowMs + 60_000,
        waitingForPromo: true,
      });
      activeCheckoutSessions.set(b2, {
        senderJid: b2,
        senderCleanNumber: '628111000002',
        senderName: 'Buyer Dua',
        productName: 'Netflix',
        variantName: '1P',
        price: 1300,
        costPrice: 1200,
        initialMargin: 100,
        createdAt: nowMs,
        expiresAt: nowMs + 60_000,
        waitingForPromo: true,
      });

      const sentByBuyer: Record<string, string[]> = { [b1]: [], [b2]: [] };
      const fakeSock = {
        sendMessage: async (jid: string, payload: any) => {
          await new Promise((r) => setTimeout(r, 35));
          if (!sentByBuyer[jid]) sentByBuyer[jid] = [];
          sentByBuyer[jid].push(String(payload?.text || ''));
          return { key: { id: 'msg-' + Math.random().toString(36).slice(2) } };
        },
      };

      const fakeCfg: any = {
        lunasQrisApiKey: 'dummy-key-so-it-does-not-release-immediately',
        storeInfo: { storeName: 'Toko Uji' },
      };
      const fakeDeps = {
        addLog: () => {},
        resolveTargetJid: (j: string) => j,
      };

      // Catat: karena lunasQrisApiKey dummy akan gagal HTTP ke lunasqris.com dan memanggil releasePromoQuota,
      // kita uji persis saat notif sukses vs gagal dikirim sebelum invoice QRIS selesai:
      await Promise.all([
        dispatchIncomingMessages(
          fakeSock,
          fakeCfg,
          [{ key: { remoteJid: b1, id: 'in-1' }, pushName: 'Buyer 1', message: { conversation: 'TEST10' } }],
          'notify',
          fakeDeps
        ),
        dispatchIncomingMessages(
          fakeSock,
          fakeCfg,
          [{ key: { remoteJid: b2, id: 'in-2' }, pushName: 'Buyer 2', message: { conversation: 'TEST10' } }],
          'notify',
          fakeDeps
        ),
      ]);

      const b1GotSuccess = sentByBuyer[b1].some((t) => t.includes('KODE PROMO BERHASIL'));
      const b2GotSuccess = sentByBuyer[b2].some((t) => t.includes('KODE PROMO BERHASIL'));
      const b2GotRejected = sentByBuyer[b2].some((t) => t.includes('TIDAK VALID') || t.includes('habis'));
      assert.equal(b1GotSuccess, true, 'Pembeli 1 harus mendapat notif sukses promo');
      assert.equal(b2GotSuccess, false, 'Pembeli 2 TIDAK boleh mendapat notif sukses promo');
      assert.equal(b2GotRejected, true, 'Pembeli 2 harus langsung mendapat notif promo kuota habis');
      assert.ok(racePromo.id);
    });
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
`;

  fs.writeFileSync(scriptPath, runnerSource, 'utf8');
  try {
    const tsxBin = path.join(repoRoot, 'node_modules', '.bin', 'tsx');
    execFileSync(tsxBin, [scriptPath], { cwd: tmpDir, stdio: 'inherit' });
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});
