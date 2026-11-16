import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import {
  extractTenantTokenFromReq,
  isMaskedSecret,
  maskSecret,
  parseCookieHeader,
  sanitizeBotStatusResponse,
  sanitizeTelegramConfigResponse,
} from './tenantAuth.ts';

test('parseCookieHeader & extractTenantTokenFromReq ignore query tokens and X-Tenant-Id', () => {
  const reqOnlyQuery = {
    headers: { 'x-tenant-id': 't_victim' },
    query: { token: 'query_token_should_ignore', tenant: 't_victim' },
  } as any;
  assert.equal(extractTenantTokenFromReq(reqOnlyQuery), '');

  const reqBearer = {
    headers: { authorization: 'Bearer  abc123token  ' },
    query: {},
  } as any;
  assert.equal(extractTenantTokenFromReq(reqBearer), 'abc123token');

  const reqCookie = {
    headers: { cookie: 'tenant_id=t_victim; auth_token=cookie_tok_999' },
    query: {},
  } as any;
  assert.equal(parseCookieHeader(reqCookie.headers.cookie).auth_token, 'cookie_tok_999');
  assert.equal(extractTenantTokenFromReq(reqCookie), 'cookie_tok_999');
});

test('maskSecret & sanitize responses hide plaintext secrets while preserving boolean flags', () => {
  assert.equal(maskSecret(''), '');
  assert.equal(maskSecret('short'), '••••••••');
  assert.equal(maskSecret('xv_live_secret_9876'), 'xv_l••••9876');
  assert.equal(isMaskedSecret('xv_l••••9876'), true);
  assert.equal(isMaskedSecret('xv_live_secret_9876'), false);

  const botMasked = sanitizeBotStatusResponse({
    status: 'idle',
    config: {
      xavieraApiKey: 'xv_secret_123456',
      lunasQrisApiKey: 'lq_key_123456',
      lunasQrisSecretKey: 'lq_hmac_999999',
      storeInfo: { storeName: 'Test Store' },
    },
  });
  assert.equal(botMasked.config.xavieraApiKey, 'xv_s••••3456');
  assert.equal(botMasked.config.lunasQrisApiKey, 'lq_k••••3456');
  assert.equal(botMasked.config.lunasQrisSecretKey, 'lq_h••••9999');
  assert.equal(botMasked.config.hasXavieraApiKey, true);
  assert.equal(botMasked.config.hasLunasQrisApiKey, true);
  assert.equal(botMasked.config.hasLunasQrisSecretKey, true);

  const tgMasked = sanitizeTelegramConfigResponse({
    botToken: '123456789:ABCdefGHIjklMNO',
    chatId: '998877',
    notifEnabled: true,
  });
  assert.equal(tgMasked.botToken, '1234••••lMNO');
  assert.equal(tgMasked.hasBotToken, true);
  assert.equal(tgMasked.chatId, '998877');
});

test('Session 1 HTTP boundaries (isolated scratch cwd): unauthenticated 401, X-Tenant-Id override blocked, ghost DB blocked, masked secret preserved', () => {
  const repoRoot = path.resolve(import.meta.dirname, '..', '..');
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wanzt-sesi1-test-'));
  const scriptPath = path.join(tmpDir, 'run-http-check.ts');
  const appPath = path.join(repoRoot, 'backend', 'app.ts');
  const authMgrPath = path.join(repoRoot, 'backend', 'services', 'authManager.ts');
  const tenantMgrPath = path.join(repoRoot, 'admin-backend', 'services', 'tenantManager.ts');
  const statusSvcPath = path.join(repoRoot, 'admin-backend', 'services', 'tenantStatusService.ts');
  const ctxPath = path.join(repoRoot, 'backend', 'database', 'tenantContext.ts');
  const cfgPath = path.join(repoRoot, 'backend', 'config', 'configManager.ts');
  const tgSvcPath = path.join(repoRoot, 'backend', 'services', 'telegramService.ts');

  const runnerSource = `
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { serverApp } from ${JSON.stringify(appPath)};
import { createSession } from ${JSON.stringify(authMgrPath)};
import { TenantManager } from ${JSON.stringify(tenantMgrPath)};
import { TenantStatusService } from ${JSON.stringify(statusSvcPath)};
import { runWithTenant } from ${JSON.stringify(ctxPath)};
import { loadApiConfig } from ${JSON.stringify(cfgPath)};
import { getTelegramConfig } from ${JSON.stringify(tgSvcPath)};

async function main() {
  const server = http.createServer(serverApp);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  try {
    const addr = server.address() as { port: number };
    const baseUrl = \`http://127.0.0.1:\${addr.port}\`;

    const tenantA = TenantManager.createTenant({
      tenant_id: 't_alpha_01',
      store_name: 'Toko Alpha',
      owner_name: 'Owner A',
      owner_phone: '628111111111',
      username: 'alpha_user',
      password: 'PasswordAlpha1!',
      duration_days: 30,
    });
    const tenantB = TenantManager.createTenant({
      tenant_id: 't_beta_02',
      store_name: 'Toko Beta',
      owner_name: 'Owner B',
      owner_phone: '628222222222',
      username: 'beta_user',
      password: 'PasswordBeta2!',
      duration_days: 30,
    });

    const tokenA = createSession(tenantA.username, tenantA.tenant_id);
    const tokenB = createSession(tenantB.username, tenantB.tenant_id);

    const unauthPaths: Array<[string, string, any?]> = [
      ['GET', '/api/bot/status'],
      ['POST', '/api/bot/start', {}],
      ['GET', '/api/bot/telegram/config'],
      ['POST', '/api/bot/telegram/config', { botToken: 'x', chatId: 'y' }],
      ['GET', '/api/pricing'],
      ['POST', '/api/pricing', { mode: 'rp', value: 1 }],
      ['GET', '/api/promos'],
      ['GET', '/api/transactions'],
      ['GET', '/api/media/pictures'],
      ['GET', '/api/bot/templates'],
      ['POST', '/api/bot/redeem-token', { tokenCode: 'TEST-1234-5678-9012', tenantId: tenantB.tenant_id }],
      ['GET', '/api/auth/store-status'],
      ['POST', '/api/auth/store-setup', { storeName: 'Hacked', ownerName: 'X', ownerNumber: '6289' }],
      ['POST', '/api/auth/profile/update-username', { newUsername: 'hijacked_99' }],
      ['GET', '/api/xaviera/profile'],
      ['GET', '/api/lunasqris/balance'],
    ];

    for (const [method, urlPath, body] of unauthPaths) {
      const res = await fetch(\`\${baseUrl}\${urlPath}\`, {
        method,
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      assert.equal(res.status, 401, \`\${method} \${urlPath} should return 401 without auth\`);
    }

    const ghostAttempt = await fetch(\`\${baseUrl}/api/bot/status?tenant=ghost_unlisted_999\`, {
      headers: { 'X-Tenant-Id': 'ghost_unlisted_999' },
    });
    assert.equal(ghostAttempt.status, 401);
    assert.equal(
      fs.existsSync(path.join(process.cwd(), 'database', 'tenants', 'ghost_unlisted_999.db')),
      false
    );
    const ghostExpiry = await TenantStatusService.enforceRealtimeTenantExpiry('ghost_unlisted_999');
    assert.equal(ghostExpiry, 'expired');

    const overrideRes = await fetch(\`\${baseUrl}/api/auth/store-status?tenant=\${tenantB.tenant_id}\`, {
      headers: {
        Authorization: \`Bearer \${tokenA}\`,
        'X-Tenant-Id': tenantB.tenant_id,
      },
    });
    assert.equal(overrideRes.status, 200);
    const overrideJson: any = await overrideRes.json();
    assert.equal(overrideJson.tenantId, tenantA.tenant_id);
    assert.equal(overrideJson.storeInfo.storeName, 'Toko Alpha');

    const saveRes = await fetch(\`\${baseUrl}/api/bot/save-config\`, {
      method: 'POST',
      headers: {
        Authorization: \`Bearer \${tokenB}\`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        xavieraApiKey: 'xv_real_secret_token_9988',
        lunasQrisApiKey: 'lq_real_api_key_7766',
        lunasQrisSecretKey: 'lq_real_hmac_secret_5544',
      }),
    });
    assert.equal(saveRes.status, 200);
    const saveJson: any = await saveRes.json();
    assert.equal(saveJson.config.xavieraApiKey, 'xv_r••••9988');
    assert.equal(saveJson.config.lunasQrisApiKey, 'lq_r••••7766');
    assert.equal(saveJson.config.lunasQrisSecretKey, 'lq_r••••5544');

    const statusBRes = await fetch(\`\${baseUrl}/api/bot/status\`, {
      headers: { Authorization: \`Bearer \${tokenB}\` },
    });
    assert.equal(statusBRes.status, 200);
    const statusBJson: any = await statusBRes.json();
    assert.equal(statusBJson.config.xavieraApiKey, 'xv_r••••9988');
    assert.equal(statusBJson.config.hasXavieraApiKey, true);

    const resaveMasked = await fetch(\`\${baseUrl}/api/bot/save-config\`, {
      method: 'POST',
      headers: {
        Authorization: \`Bearer \${tokenB}\`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        menuOutputText: 'Updated menu greeting',
        xavieraApiKey: 'xv_r••••9988',
        lunasQrisApiKey: 'lq_r••••7766',
        lunasQrisSecretKey: 'lq_r••••5544',
      }),
    });
    assert.equal(resaveMasked.status, 200);

    const storedB = runWithTenant(tenantB.tenant_id, () => loadApiConfig());
    assert.equal(storedB.xavieraApiKey, 'xv_real_secret_token_9988');
    assert.equal(storedB.lunasQrisApiKey, 'lq_real_api_key_7766');
    assert.equal(storedB.lunasQrisSecretKey, 'lq_real_hmac_secret_5544');

    const tgSaveRes = await fetch(\`\${baseUrl}/api/bot/telegram/config\`, {
      method: 'POST',
      headers: {
        Authorization: \`Bearer \${tokenB}\`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        botToken: '987654321:REAL_TELEGRAM_SECRET_TOKEN',
        chatId: '123456789',
        notifEnabled: true,
      }),
    });
    assert.equal(tgSaveRes.status, 200);
    const tgSaveJson: any = await tgSaveRes.json();
    assert.equal(tgSaveJson.config.botToken, '9876••••OKEN');
    assert.equal(tgSaveJson.config.hasBotToken, true);

    const tgResave = await fetch(\`\${baseUrl}/api/bot/telegram/config\`, {
      method: 'POST',
      headers: {
        Authorization: \`Bearer \${tokenB}\`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        botToken: '9876••••OKEN',
        chatId: '123456789',
        notifEnabled: false,
      }),
    });
    assert.equal(tgResave.status, 200);
    const storedTgB = getTelegramConfig(tenantB.tenant_id);
    assert.equal(storedTgB.botToken, '987654321:REAL_TELEGRAM_SECRET_TOKEN');
    assert.equal(storedTgB.notifEnabled, false);
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
