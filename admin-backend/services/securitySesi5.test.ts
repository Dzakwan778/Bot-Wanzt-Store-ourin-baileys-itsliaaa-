import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

test('Sesi 5: legacy /api/apartment decommissioned, XFF lockout spoofing blocked (admin + partner), and per-username + global fallback limits enforced', () => {
  const repoRoot = path.resolve(import.meta.dirname, '..', '..');
  const tmpDir1 = fs.mkdtempSync(path.join(os.tmpdir(), 'wanzt-sesi5-main-'));
  const tmpDir2 = fs.mkdtempSync(path.join(os.tmpdir(), 'wanzt-sesi5-global-'));

  const expressPath = path.join(repoRoot, 'node_modules', 'express', 'index.js');
  const appPath = path.join(repoRoot, 'backend', 'app.ts');
  const apartmentRoutesPath = path.join(repoRoot, 'backend', 'routes', 'apartmentRoutes.ts');
  const apartmentMgrPath = path.join(repoRoot, 'backend', 'services', 'apartmentManager.ts');
  const masterDbPath = path.join(repoRoot, 'admin-backend', 'database', 'masterSqlite.ts');
  const adminAuthPath = path.join(repoRoot, 'admin-backend', 'services', 'adminAuthService.ts');
  const partnerSvcPath = path.join(repoRoot, 'admin-backend', 'services', 'partnerApiService.ts');

  const scriptMain = `
import assert from 'node:assert/strict';
import http from 'node:http';
import express from ${JSON.stringify(expressPath)};
import { serverApp } from ${JSON.stringify(appPath)};
import { apartmentRouter } from ${JSON.stringify(apartmentRoutesPath)};
import { createMasterAdminSession } from ${JSON.stringify(apartmentMgrPath)};
import { getMasterDb, hashPassword } from ${JSON.stringify(masterDbPath)};
import { AdminAuthService } from ${JSON.stringify(adminAuthPath)};
import { PartnerApiService } from ${JSON.stringify(partnerSvcPath)};

async function main() {
  assert.equal(serverApp.get('trust proxy'), 1, 'Express trust proxy harus diset ke 1');

  const db = getMasterDb();
  const nowIso = new Date().toISOString();
  const adminPass = 'Sesi5AdminPass!23';
  db.prepare(\`
    INSERT INTO super_admins (username, password_hash, name, created_at)
    VALUES (?, ?, ?, ?)
  \`).run('master_sesi5', hashPassword(adminPass), 'Master Sesi 5', nowIso);

  const partnerCreated = PartnerApiService.createKey('Partner Uji Sesi 5');

  const server = http.createServer(serverApp);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));

  // Server terpisah khusus menguji router apartmentRoutes bila di-mount langsung
  const isolatedApp = express();
  isolatedApp.use(express.json());
  isolatedApp.use('/api/apartment', apartmentRouter);
  const isolatedServer = http.createServer(isolatedApp);
  await new Promise<void>((resolve) => isolatedServer.listen(0, '127.0.0.1', resolve));

  try {
    const addr = server.address() as { port: number };
    const baseUrl = \`http://127.0.0.1:\${addr.port}\`;

    const isoAddr = isolatedServer.address() as { port: number };
    const isoBaseUrl = \`http://127.0.0.1:\${isoAddr.port}\`;

    // 1. Legacy /api/apartment/* dinonaktifkan di server utama (404 JSON)
    for (const ep of ['/api/apartment/stats', '/api/apartment/tenants', '/api/apartment/current-lease', '/api/apartment/tenants/unit-101']) {
      const r = await fetch(\`\${baseUrl}\${ep}\`);
      assert.equal(r.status, 404, \`\${ep} harus mengembalikan 404\`);
      const body = await r.json();
      assert.equal(body.success, false);
    }

    // 2. apartmentRouter langsung juga wajib menuntut header auth & menolak ?token= query param
    const validLegacyToken = createMasterAdminSession('legacy_check');
    for (const ep of ['/api/apartment/stats', '/api/apartment/tenants', '/api/apartment/current-lease', '/api/apartment/tenants/unit-101']) {
      const unauth = await fetch(\`\${isoBaseUrl}\${ep}\`);
      assert.equal(unauth.status, 401, \`Direct \${ep} tanpa token harus 401\`);

      const queryTok = await fetch(\`\${isoBaseUrl}\${ep}?token=\${validLegacyToken}\`);
      assert.equal(queryTok.status, 401, \`Direct \${ep} via ?token= harus ditolak 401\`);
    }
    const authBearerRes = await fetch(\`\${isoBaseUrl}/api/apartment/stats\`, {
      headers: { Authorization: \`Bearer \${validLegacyToken}\` },
    });
    assert.equal(authBearerRes.status, 200);

    // 3. Simulasi di balik reverse proxy (Nginx appends real IP di paling kanan XFF):
    //    Spoofing leftmost XFF dengan username berbeda tetap terkunci pada percobaan ke-5 (IP asli: 203.0.113.50)
    const proxyIpStatuses: number[] = [];
    for (let i = 1; i <= 5; i++) {
      const r = await fetch(\`\${baseUrl}/api/admin/auth/login\`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Forwarded-For': \`198.51.100.\${i}, 203.0.113.50\`,
        },
        body: JSON.stringify({ username: \`wrong_user_\${i}\`, password: 'WrongPassword!' }),
      });
      proxyIpStatuses.push(r.status);
    }
    assert.deepEqual(proxyIpStatuses, [401, 401, 401, 401, 429]);

    const rotatedAfterLock = await fetch(\`\${baseUrl}/api/admin/auth/login\`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Forwarded-For': '198.51.100.99, 203.0.113.50',
      },
      body: JSON.stringify({ username: 'another_user', password: 'WrongPassword!' }),
    });
    assert.equal(rotatedAfterLock.status, 429, 'Rotasi leftmost XFF di balik proxy tetap kena lockout IP');

    // 4. Simulasi rotasi IP langsung (tiap request memakai single IP berbeda) ke username yang SAMA:
    //    Harus terkunci berdasarkan username pada percobaan ke-5 dan tetap 429 di IP baru ke-6!
    const userStatuses: number[] = [];
    for (let i = 1; i <= 5; i++) {
      const r = await fetch(\`\${baseUrl}/api/admin/auth/login\`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Forwarded-For': \`198.51.101.\${i}\`,
        },
        body: JSON.stringify({ username: 'master_sesi5', password: 'BadPassword!' }),
      });
      userStatuses.push(r.status);
    }
    assert.deepEqual(userStatuses, [401, 401, 401, 401, 429]);

    const userBypassAttempt = await fetch(\`\${baseUrl}/api/admin/auth/login\`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Forwarded-For': '198.51.101.200',
      },
      body: JSON.stringify({ username: 'MASTER_SESI5', password: adminPass }),
    });
    assert.equal(userBypassAttempt.status, 429, 'Username yang terkunci harus tetap menolak walau ganti IP & casing');

    // 5. Login valid (username terpisah) membersihkan counter failed attempts
    db.prepare(\`
      INSERT INTO super_admins (username, password_hash, name, created_at)
      VALUES (?, ?, ?, ?)
    \`).run('clean_admin', hashPassword('CleanPass#5'), 'Clean Admin', nowIso);
    assert.throws(
      () => AdminAuthService.login('clean_admin', 'WrongPass', '203.0.113.88'),
      /Username atau password tidak valid/
    );
    const okLogin = AdminAuthService.login('clean_admin', 'CleanPass#5', '203.0.113.88');
    assert.ok(okLogin.token);
    const leftIp = db.prepare('SELECT * FROM admin_login_attempts WHERE ip = ?').get('203.0.113.88');
    const leftUser = db.prepare('SELECT * FROM admin_username_login_attempts WHERE username = ?').get('clean_admin');
    assert.equal(leftIp, undefined);
    assert.equal(leftUser, undefined);

    // 6. Partner API di balik proxy: rotasi leftmost XFF tetap kena rate limit IP asli (203.0.113.77) di request ke-61
    for (let i = 1; i <= 60; i++) {
      const r = await fetch(\`\${baseUrl}/api/v1/partner/tokens/create\`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': 'wzp_invalid_key_test',
          'X-Forwarded-For': \`198.51.102.\${i}, 203.0.113.77\`,
        },
        body: JSON.stringify({ amount: 30, unit: 'days' }),
      });
      assert.equal(r.status, 401);
    }
    const partnerBlocked = await fetch(\`\${baseUrl}/api/v1/partner/tokens/create\`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': 'wzp_invalid_key_test',
        'X-Forwarded-For': '198.51.102.250, 203.0.113.77',
      },
      body: JSON.stringify({ amount: 30, unit: 'days' }),
    });
    assert.equal(partnerBlocked.status, 429);

    // Pastikan API Key partner valid tetap berjalan normal walau invalid limiter penuh
    const validPartnerRes = await fetch(\`\${baseUrl}/api/v1/partner/tokens/create\`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': partnerCreated.raw_api_key,
        'X-Forwarded-For': '198.51.102.251, 203.0.113.78',
      },
      body: JSON.stringify({ amount: 7, unit: 'days' }),
    });
    assert.equal(validPartnerRes.status, 201);

    console.log('SESI5_MAIN_OK');
  } finally {
    server.close();
    isolatedServer.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
`;

  const scriptGlobal = `
import assert from 'node:assert/strict';
import http from 'node:http';
import { serverApp } from ${JSON.stringify(appPath)};
import { PartnerApiService } from ${JSON.stringify(partnerSvcPath)};

async function main() {
  const validPartner = PartnerApiService.createKey('Partner Valid Global Test');
  const server = http.createServer(serverApp);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));

  try {
    const addr = server.address() as { port: number };
    const baseUrl = \`http://127.0.0.1:\${addr.port}\`;

    // Kirim 60 percobaan key invalid dengan IP unik berbeda setiap request
    for (let i = 1; i <= 60; i++) {
      const r = await fetch(\`\${baseUrl}/api/v1/partner/tokens/create\`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': 'wzp_bruteforce_invalid',
          'X-Forwarded-For': \`203.0.114.\${i}\`,
        },
        body: JSON.stringify({ amount: 30, unit: 'days' }),
      });
      assert.equal(r.status, 401);
    }

    // Request ke-61 dari IP baru ke-61 harus tetap kena global fallback rate limit (429)
    const blocked = await fetch(\`\${baseUrl}/api/v1/partner/tokens/create\`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': 'wzp_bruteforce_invalid',
        'X-Forwarded-For': '203.0.114.200',
      },
      body: JSON.stringify({ amount: 30, unit: 'days' }),
    });
    assert.equal(blocked.status, 429, 'Global invalid-key fallback rate limit harus memblokir rotasi IP penuh');
    const body = await blocked.json();
    assert.equal(body.error, 'RATE_LIMIT_EXCEEDED');

    // Partner key sah tetap tidak terdampak oleh blokir invalid-key
    const validRes = await fetch(\`\${baseUrl}/api/v1/partner/tokens/create\`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': validPartner.raw_api_key,
        'X-Forwarded-For': '203.0.114.201',
      },
      body: JSON.stringify({ amount: 14, unit: 'days' }),
    });
    assert.equal(validRes.status, 201);

    console.log('SESI5_GLOBAL_OK');
  } finally {
    server.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
`;

  const p1 = path.join(tmpDir1, 'sesi5-main.ts');
  const p2 = path.join(tmpDir2, 'sesi5-global.ts');
  fs.writeFileSync(p1, scriptMain, 'utf8');
  fs.writeFileSync(p2, scriptGlobal, 'utf8');

  try {
    const tsxBin = path.join(repoRoot, 'node_modules', '.bin', 'tsx');
    const out1 = execFileSync(tsxBin, [p1], { cwd: tmpDir1, encoding: 'utf-8' });
    assert.match(out1, /SESI5_MAIN_OK/);

    const out2 = execFileSync(tsxBin, [p2], { cwd: tmpDir2, encoding: 'utf-8' });
    assert.match(out2, /SESI5_GLOBAL_OK/);
  } finally {
    fs.rmSync(tmpDir1, { recursive: true, force: true });
    fs.rmSync(tmpDir2, { recursive: true, force: true });
  }
});
