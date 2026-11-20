import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { parseAllowedCorsOrigins, isCorsOriginAllowed } from '../utils/corsSecurity.ts';

test('Sesi 6 pure CORS allowlist helper rejects wildcard and untrusted external origins', () => {
  assert.deepEqual(
    parseAllowedCorsOrigins('*, https://testbot.wanma2.my.id/, http://localhost:3000, invalid-url'),
    ['https://testbot.wanma2.my.id', 'http://localhost:3000']
  );

  assert.equal(
    isCorsOriginAllowed('https://evil.attacker.test', {
      corsOriginsEnv: 'https://testbot.wanma2.my.id',
      requestHost: 'testbot.wanma2.my.id',
      isProduction: true,
    }),
    false
  );

  assert.equal(
    isCorsOriginAllowed('https://testbot.wanma2.my.id', {
      corsOriginsEnv: '*',
      requestHost: 'api.internal.test',
      isProduction: true,
    }),
    false
  );

  assert.equal(
    isCorsOriginAllowed('https://testbot.wanma2.my.id', {
      corsOriginsEnv: 'https://testbot.wanma2.my.id,https://admin.wanma2.my.id',
      requestHost: 'localhost:5000',
      isProduction: true,
    }),
    true
  );

  assert.equal(
    isCorsOriginAllowed('https://panel.tenant.test', {
      corsOriginsEnv: '',
      requestHost: 'panel.tenant.test',
      isProduction: true,
    }),
    true
  );

  assert.equal(
    isCorsOriginAllowed('http://localhost:3000', {
      corsOriginsEnv: '',
      requestHost: 'localhost:5000',
      isProduction: true,
    }),
    false
  );

  assert.equal(
    isCorsOriginAllowed('http://localhost:3000', {
      corsOriginsEnv: '',
      requestHost: 'localhost:5000',
      isProduction: false,
    }),
    true
  );
});

test('Sesi 6 integration: CORS hardening, security HTTP headers, Telegram HTML escaping, paymentUrl HTTPS enforcement, and VPS hardening', () => {
  const repoRoot = path.resolve(import.meta.dirname, '..', '..');
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wanzt-sesi6-'));

  const appPath = path.join(repoRoot, 'backend', 'app.ts');
  const telegramPath = path.join(repoRoot, 'backend', 'services', 'telegramService.ts');
  const trxMgrPath = path.join(repoRoot, 'backend', 'services', 'transactionManager.ts');
  const tenantDbPath = path.join(repoRoot, 'backend', 'database', 'tenantDbManager.ts');
  const sqlitePath = path.join(repoRoot, 'backend', 'database', 'sqlite.ts');

  const integrationScript = `
import assert from 'node:assert/strict';
import http from 'node:http';
import { serverApp } from ${JSON.stringify(appPath)};
import {
  escapeTelegramHtml,
  saveTelegramConfig,
  testTelegramConnection,
  notifyTransactionPaid,
  notifyTransactionFailed,
  sendAdminMessageToTelegram,
  sendAdminBroadcastToTelegram,
} from ${JSON.stringify(telegramPath)};
import { recordTransaction, getAllTransactions } from ${JSON.stringify(trxMgrPath)};
import { initTenantDb } from ${JSON.stringify(tenantDbPath)};
import { db } from ${JSON.stringify(sqlitePath)};

async function main() {
  const server = http.createServer(serverApp);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));

  const originalFetch = globalThis.fetch;

  try {
    const addr = server.address() as { port: number };
    const baseUrl = \`http://127.0.0.1:\${addr.port}\`;

    // 1. CORS & Security HTTP headers check via real HTTP requests
    const untrustedRes = await originalFetch(\`\${baseUrl}/api/health\`, {
      headers: {
        Origin: 'https://untrusted-attacker.example',
      },
    });
    assert.equal(untrustedRes.status, 200);
    assert.equal(untrustedRes.headers.get('access-control-allow-origin'), null);
    assert.equal(untrustedRes.headers.get('x-powered-by'), null);
    assert.equal(untrustedRes.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(untrustedRes.headers.get('x-frame-options'), 'SAMEORIGIN');
    assert.equal(untrustedRes.headers.get('referrer-policy'), 'strict-origin-when-cross-origin');
    assert.equal(untrustedRes.headers.get('strict-transport-security'), null);

    // Preflight from untrusted origin must never return ACAO: * or reflect untrusted origin
    const untrustedPreflight = await originalFetch(\`\${baseUrl}/api/pricing\`, {
      method: 'OPTIONS',
      headers: {
        Origin: 'https://untrusted-attacker.example',
        'Access-Control-Request-Method': 'GET',
      },
    });
    assert.equal(untrustedPreflight.headers.get('access-control-allow-origin'), null);

    // HSTS header sent when behind HTTPS proxy
    const httpsProxyRes = await originalFetch(\`\${baseUrl}/api/auth/session\`, {
      headers: {
        Origin: 'https://testbot.wanma2.my.id',
        'X-Forwarded-Proto': 'https',
      },
    });
    assert.equal(
      httpsProxyRes.headers.get('access-control-allow-origin'),
      'https://testbot.wanma2.my.id'
    );
    assert.equal(
      httpsProxyRes.headers.get('strict-transport-security'),
      'max-age=31536000; includeSubDomains'
    );

    // Preflight for allowed origin returns exact origin, never '*'
    const allowedPreflight = await originalFetch(\`\${baseUrl}/api/pricing\`, {
      method: 'OPTIONS',
      headers: {
        Origin: 'https://admin.wanma2.my.id',
        'Access-Control-Request-Method': 'POST',
      },
    });
    assert.equal(
      allowedPreflight.headers.get('access-control-allow-origin'),
      'https://admin.wanma2.my.id'
    );

    // 2. Telegram HTML escaping unit + payload interception checks
    assert.equal(
      escapeTelegramHtml('<a href="https://evil.test">Klik & Menang</a>'),
      '&lt;a href=&quot;https://evil.test&quot;&gt;Klik &amp; Menang&lt;/a&gt;'
    );

    initTenantDb('t_wanzt');
    saveTelegramConfig('t_wanzt', {
      botToken: '123456:TEST_TOKEN_SECRET',
      chatId: '-100999888',
      notifEnabled: true,
      adminDisabled: false,
    });

    const sentTelegramPayloads: any[] = [];
    globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
      const urlStr = String(url);
      if (urlStr.includes('api.telegram.org') && urlStr.endsWith('/getMe')) {
        return new Response(
          JSON.stringify({ ok: true, result: { first_name: 'Bot <Evil> & Co', username: 'safe_bot' } }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      if (urlStr.includes('api.telegram.org') && urlStr.endsWith('/sendMessage')) {
        const body = JSON.parse(String(init?.body || '{}'));
        sentTelegramPayloads.push(body);
        return new Response(
          JSON.stringify({ ok: true, result: { message_id: sentTelegramPayloads.length } }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      throw new Error(\`Unexpected external fetch: \${urlStr}\`);
    }) as typeof fetch;

    const xssPayload = 'Toko <a href="https://phishing.test">Klik</a> & "Test"';
    const testConnRes = await testTelegramConnection('123456:TEST_TOKEN_SECRET', '-100999888', xssPayload);
    assert.equal(testConnRes.success, true);

    const paidOk = await notifyTransactionPaid('t_wanzt', {
      orderId: 'ORD-<1>',
      productName: 'VPS <script>alert(1)</script>',
      variantName: '1GB & <img src=x>',
      totalPrice: 25000,
      buyerNumber: '6281234567890',
      storeName: xssPayload,
    });
    assert.equal(paidOk, true);

    const failOk = await notifyTransactionFailed('t_wanzt', {
      orderId: 'ORD-<2>',
      productName: 'Panel <a href="https://evil.test">X</a>',
      variantName: 'VIP',
      totalPrice: 15000,
      reason: 'Timeout <b onmouseover="bad">x</b> & retry',
      storeName: xssPayload,
    });
    assert.equal(failOk, true);

    const adminMsgRes = await sendAdminMessageToTelegram(
      't_wanzt',
      'Halo <a href="https://evil.test">Reset Password</a> & cek',
      xssPayload
    );
    assert.equal(adminMsgRes.success, true);

    const broadcastRes = await sendAdminBroadcastToTelegram('t_wanzt', 'Info broadcast polos <tag> & update');
    assert.equal(broadcastRes.success, true);

    assert.equal(sentTelegramPayloads.length, 5);
    for (let i = 0; i < 4; i++) {
      const p = sentTelegramPayloads[i];
      assert.equal(p.parse_mode, 'HTML');
      assert.doesNotMatch(p.text, /<a\\s+href=/i, \`HTML payload #\${i} must not render unescaped anchor tag\`);
      assert.doesNotMatch(p.text, /<script>/i, \`HTML payload #\${i} must not contain raw script tag\`);
      assert.match(p.text, /&lt;/, \`HTML payload #\${i} must contain escaped entities\`);
    }

    // Broadcast keeps Parse Mode None (plain text)
    assert.equal(sentTelegramPayloads[4].parse_mode, undefined);
    assert.equal(sentTelegramPayloads[4].text, 'Info broadcast polos <tag> & update');

    // 3. Transaction paymentUrl HTTPS-only sanitization
    const unsafeTrx = recordTransaction({
      orderId: 'ORD-UNSAFE-URL',
      customerNumber: '628111111111',
      productName: 'Produk Uji',
      variantName: 'Reguler',
      nominal: 10000,
      uniqueCode: 12,
      total: 10012,
      paymentUrl: 'javascript:alert(1)',
    });
    assert.equal(unsafeTrx.paymentUrl, '');

    const httpTrx = recordTransaction({
      orderId: 'ORD-HTTP-URL',
      customerNumber: '628111111112',
      productName: 'Produk Uji 2',
      variantName: 'Reguler',
      nominal: 10000,
      uniqueCode: 13,
      total: 10013,
      paymentUrl: 'http://insecure.example.com/pay',
    });
    assert.equal(httpTrx.paymentUrl, '');

    const validTrx = recordTransaction({
      orderId: 'ORD-HTTPS-URL',
      customerNumber: '628111111113',
      productName: 'Produk Uji 3',
      variantName: 'Reguler',
      nominal: 10000,
      uniqueCode: 14,
      total: 10014,
      paymentUrl: 'https://checkout.lunasqris.test/pay/123',
    });
    assert.equal(validTrx.paymentUrl, 'https://checkout.lunasqris.test/pay/123');

    // Inject raw javascript: URL directly into SQLite row to ensure getAllTransactions() sanitizes on read
    db.prepare('UPDATE transactions SET payment_url = ? WHERE order_id = ?').run(
      'javascript:fetch("https://evil.test")',
      'ORD-UNSAFE-URL'
    );
    const listed = getAllTransactions();
    const unsafeRead = listed.find((t) => t.orderId === 'ORD-UNSAFE-URL');
    const validRead = listed.find((t) => t.orderId === 'ORD-HTTPS-URL');
    assert.equal(unsafeRead?.paymentUrl, '');
    assert.equal(validRead?.paymentUrl, 'https://checkout.lunasqris.test/pay/123');

    console.log('SESI6_MAIN_OK');
  } finally {
    globalThis.fetch = originalFetch;
    server.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
`;

  const scriptPath = path.join(tmpDir, 'sesi6-integration.ts');
  fs.writeFileSync(scriptPath, integrationScript, 'utf8');

  try {
    const tsxBin = path.join(repoRoot, 'node_modules', '.bin', 'tsx');
    const out = execFileSync(tsxBin, [scriptPath], {
      cwd: tmpDir,
      encoding: 'utf-8',
      env: {
        ...process.env,
        NODE_ENV: 'production',
        CORS_ORIGINS: 'https://testbot.wanma2.my.id,https://admin.wanma2.my.id',
      },
    });
    assert.match(out, /SESI6_MAIN_OK/);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }

  // 4. Static hardening assertions for deploy-vps.sh, backend/server.ts, and ecosystem.config.cjs
  const deployScript = fs.readFileSync(path.join(repoRoot, 'deploy-vps.sh'), 'utf8');
  assert.doesNotMatch(deployScript, /chmod\s+755\s+\/root/);
  assert.doesNotMatch(deployScript, /chmod\s+-R\s+755\s+"\$APP_DIR"/);
  assert.doesNotMatch(deployScript, /ufw\s+allow\s+5000\/tcp/);
  assert.match(deployScript, /SERVICE_USER="wanztbot"/);
  assert.match(deployScript, /chmod\s+700\s+"\$SENSITIVE_DIR"/);
  assert.match(deployScript, /chmod\s+600\s+\{\}/);
  assert.match(deployScript, /127\.0\.0\.1:5000/);
  assert.match(deployScript, /server_tokens\s+off;/);
  assert.match(deployScript, /X-Content-Type-Options/);

  const backendServer = fs.readFileSync(path.join(repoRoot, 'backend', 'server.ts'), 'utf8');
  assert.match(backendServer, /const HOST = process\.env\.HOST \|\| '127\.0\.0\.1';/);

  const ecosystem = fs.readFileSync(path.join(repoRoot, 'ecosystem.config.cjs'), 'utf8');
  assert.match(ecosystem, /HOST:\s*'127\.0\.0\.1'/);
  assert.match(ecosystem, /CORS_ORIGINS:\s*'https:\/\/testbot\.wanma2\.my\.id'/);
});
