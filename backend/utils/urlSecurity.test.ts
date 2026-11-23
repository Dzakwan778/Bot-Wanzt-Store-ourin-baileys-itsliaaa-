import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import {
  UrlSecurityError,
  assertSafeExternalHttpsUrl,
  isBlockedHostname,
  isPrivateOrReservedIp,
  safeExternalFetch,
  validateExternalHttpsUrlSyntax,
} from './urlSecurity.ts';

test('isPrivateOrReservedIp identifies IPv4 and IPv6 private/loopback/metadata addresses and allows public IPs', () => {
  const blockedIps = [
    '127.0.0.1',
    '127.255.255.254',
    '10.0.0.1',
    '172.16.0.1',
    '172.31.255.254',
    '192.168.1.1',
    '169.254.169.254',
    '100.64.0.1',
    '0.0.0.0',
    '224.0.0.1',
    '::',
    '::1',
    'fc00::1',
    'fd12:3456:789a::1',
    'fe80::1',
    'fe80::1%eth0',
    '::ffff:127.0.0.1',
    '::ffff:7f00:1',
    '::ffff:169.254.169.254',
    '::ffff:10.0.0.1',
  ];

  for (const ip of blockedIps) {
    assert.equal(isPrivateOrReservedIp(ip), true, `Expected ${ip} to be blocked`);
  }

  const publicIps = ['1.1.1.1', '8.8.8.8', '172.32.0.1', '192.169.1.1', '2606:4700:4700::1111'];
  for (const ip of publicIps) {
    assert.equal(isPrivateOrReservedIp(ip), false, `Expected ${ip} to be allowed`);
  }
});

test('isBlockedHostname and validateExternalHttpsUrlSyntax enforce HTTPS and block internal hosts', () => {
  assert.equal(isBlockedHostname('localhost'), true);
  assert.equal(isBlockedHostname('sub.localhost'), true);
  assert.equal(isBlockedHostname('metadata.google.internal'), true);
  assert.equal(isBlockedHostname('redis'), true);
  assert.equal(isBlockedHostname('api.xavierastore.com'), false);

  const badUrls = [
    '',
    'not-a-url',
    'http://lunasqris.com',
    'ftp://xavierastore.com',
    'https://user:pass@lunasqris.com',
    'https://localhost/api',
    'https://127.0.0.1/api',
    'https://[::1]/api',
    'https://169.254.169.254/latest/meta-data',
    'https://internal-service/api',
  ];

  for (const url of badUrls) {
    assert.throws(() => validateExternalHttpsUrlSyntax(url), UrlSecurityError, `Expected reject: ${url}`);
  }

  const parsed = validateExternalHttpsUrlSyntax('https://xavierastore.com/api/v1');
  assert.equal(parsed.hostname, 'xavierastore.com');
  assert.equal(parsed.protocol, 'https:');
});

test('assertSafeExternalHttpsUrl resolves DNS and rejects if any returned IP is private/reserved', async () => {
  await assert.rejects(
    () =>
      assertSafeExternalHttpsUrl('https://evil-rebind.example/api', {
        resolveHost: async () => [{ address: '1.1.1.1' }, { address: '::1' }],
      }),
    UrlSecurityError
  );

  await assert.rejects(
    () =>
      assertSafeExternalHttpsUrl('https://private-dns.example/api', {
        resolveHost: async () => [{ address: '10.0.0.5' }],
      }),
    UrlSecurityError
  );

  const ok = await assertSafeExternalHttpsUrl('https://safe-merchant.example/api/v1', {
    resolveHost: async () => [{ address: '104.21.10.20' }],
  });
  assert.equal(ok.toString(), 'https://safe-merchant.example/api/v1');
});

test('safeExternalFetch aborts before calling fetchFn on unsafe targets and forces redirect: error', async () => {
  let called = false;
  await assert.rejects(
    () =>
      safeExternalFetch(
        'https://private.example/secret',
        { method: 'GET' },
        {
          resolveHost: async () => [{ address: '127.0.0.1' }],
          fetchFn: async () => {
            called = true;
            return new Response('should not run');
          },
        }
      ),
    UrlSecurityError
  );
  assert.equal(called, false);

  let capturedInit: RequestInit | undefined;
  const res = await safeExternalFetch(
    'https://safe-api.example/v1/profile',
    { method: 'GET', redirect: 'follow' },
    {
      resolveHost: async () => [{ address: '93.184.216.34' }],
      fetchFn: async (_input, init) => {
        capturedInit = init;
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      },
    }
  );
  assert.equal(res.status, 200);
  assert.equal(capturedInit?.redirect, 'error');
});

test('Session 3 HTTP SSRF boundaries (isolated scratch cwd): reject LunasQRIS baseurl overrides, private save-config URLs, and tampered stored xavieraBaseUrl', () => {
  const repoRoot = path.resolve(import.meta.dirname, '..', '..');
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wanzt-sesi3-ssrf-test-'));
  const scriptPath = path.join(tmpDir, 'run-ssrf-http-check.ts');

  const runnerSource = `
import assert from 'node:assert/strict';
import http from 'node:http';
import { serverApp } from ${JSON.stringify(path.join(repoRoot, 'backend', 'app.ts'))};
import { createSession } from ${JSON.stringify(path.join(repoRoot, 'backend', 'services', 'authManager.ts'))};
import { getBotManager } from ${JSON.stringify(path.join(repoRoot, 'backend', 'botManager.ts'))};
import { TenantManager } from ${JSON.stringify(path.join(repoRoot, 'admin-backend', 'services', 'tenantManager.ts'))};
import { runWithTenant } from ${JSON.stringify(path.join(repoRoot, 'backend', 'database', 'tenantContext.ts'))};
import { loadApiConfig } from ${JSON.stringify(path.join(repoRoot, 'backend', 'config', 'configManager.ts'))};

async function main() {
  const server = http.createServer(serverApp);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));

  // Local canary HTTP server to prove no outbound SSRF request ever hits 127.0.0.1
  let canaryHits = 0;
  const canary = http.createServer((_req, res) => {
    canaryHits++;
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'leaked' }));
  });
  await new Promise<void>((resolve) => canary.listen(0, '127.0.0.1', resolve));

  try {
    const port = (server.address() as { port: number }).port;
    const canaryPort = (canary.address() as { port: number }).port;
    const baseUrl = \`http://127.0.0.1:\${port}\`;

    const tenant = TenantManager.createTenant({
      tenant_id: 't_ssrf_01',
      store_name: 'Toko SSRF Guard',
      owner_name: 'Tester',
      owner_phone: '628111222333',
      username: 'ssrf_tester',
      password: 'StrongPassword123!',
      duration_days: 30,
    });
    const token = createSession(tenant.username, tenant.tenant_id);

    // 1. LunasQRIS query/body baseurl override must fail 400 before hitting canary
    const lunasBalanceRes = await fetch(
      \`\${baseUrl}/api/lunasqris/balance?baseurl=\${encodeURIComponent(\`http://127.0.0.1:\${canaryPort}\`)}\`,
      { headers: { Authorization: \`Bearer \${token}\` } }
    );
    assert.equal(lunasBalanceRes.status, 400);

    const lunasStatusRes = await fetch(
      \`\${baseUrl}/api/lunasqris/transaction/status?order_id=ORD-1&baseUrl=\${encodeURIComponent('https://127.0.0.1')}\`,
      { headers: { Authorization: \`Bearer \${token}\` } }
    );
    assert.equal(lunasStatusRes.status, 400);

    const lunasCreateRes = await fetch(\`\${baseUrl}/api/lunasqris/transaction/create\`, {
      method: 'POST',
      headers: {
        Authorization: \`Bearer \${token}\`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: 10000,
        order_id: 'ORD-SSRF',
        baseUrl: \`http://127.0.0.1:\${canaryPort}\`,
      }),
    });
    assert.equal(lunasCreateRes.status, 400);

    // 2. Saving invalid/private/HTTP URLs in POST /api/bot/save-config must return 400 and preserve existing SQLite config
    const badSavePayloads = [
      { xavieraBaseUrl: \`http://127.0.0.1:\${canaryPort}\` },
      { xavieraBaseUrl: 'https://169.254.169.254/latest' },
      { lunasQrisBaseUrl: 'https://[::ffff:127.0.0.1]' },
      { lunasQrisBaseUrl: 'http://lunasqris.com' },
    ];
    for (const payload of badSavePayloads) {
      const saveBadRes = await fetch(\`\${baseUrl}/api/bot/save-config\`, {
        method: 'POST',
        headers: {
          Authorization: \`Bearer \${token}\`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      assert.equal(saveBadRes.status, 400, \`Expected 400 for \${JSON.stringify(payload)}\`);
    }

    const savedCfg = runWithTenant(tenant.tenant_id, () => loadApiConfig());
    assert.equal(savedCfg.xavieraBaseUrl, 'https://xavierastore.com/api/v1');
    assert.equal(savedCfg.lunasQrisBaseUrl, 'https://lunasqris.com');

    // 3. Even if xavieraBaseUrl is tampered directly in memory, /api/xaviera/profile fails 400 before fetch()
    const mgr = getBotManager(tenant.tenant_id);
    mgr.config.xavieraApiKey = 'xv_secret_canary_check';
    mgr.config.xavieraBaseUrl = \`http://127.0.0.1:\${canaryPort}\`;

    const xavieraRes = await fetch(\`\${baseUrl}/api/xaviera/profile\`, {
      headers: { Authorization: \`Bearer \${token}\` },
    });
    assert.equal(xavieraRes.status, 400);
    assert.equal(canaryHits, 0, 'Canary internal server must NEVER receive a request');

    console.log('ALL_SSRF_HTTP_OK');
  } finally {
    await new Promise<void>((resolve) => canary.close(() => resolve()));
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
    const out = execFileSync(tsxBin, [scriptPath], { cwd: tmpDir, encoding: 'utf-8' });
    assert.match(out, /ALL_SSRF_HTTP_OK/);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});
