import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

test('reportService end-to-end DB isolation, media upload rules, and admin status/reply visibility', () => {
  const repoRoot = path.resolve(import.meta.dirname, '..', '..');
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wanzt-report-svc-'));

  const masterDbMod = path.join(repoRoot, 'admin-backend', 'database', 'masterSqlite.ts');
  const tenantSvcMod = path.join(repoRoot, 'admin-backend', 'services', 'tenantService.ts');
  const reportSvcMod = path.join(repoRoot, 'backend', 'services', 'reportService.ts');

  const script = `
import assert from 'node:assert/strict';
import { initMasterDatabase } from ${JSON.stringify(masterDbMod)};
import { TenantService } from ${JSON.stringify(tenantSvcMod)};
import {
  saveStagingReportMedia,
  deleteStagingReportMedia,
  createTenantReport,
  listTenantReports,
  listAdminReports,
  updateAdminReportStatus,
  getTenantReportMediaFile,
  getAdminReportMediaFile,
} from ${JSON.stringify(reportSvcMod)};

initMasterDatabase();

const tenantA = TenantService.createTenant({
  tenant_id: 't_rpt_a',
  username: 'rpt_a',
  password: 'PasswordA123!',
  store_name: 'Toko Alpha',
  owner_name: 'Budi',
  owner_phone: '08111111111',
});

const tenantB = TenantService.createTenant({
  tenant_id: 't_rpt_b',
  username: 'rpt_b',
  password: 'PasswordB123!',
  store_name: 'Toko Beta',
  owner_name: 'Siti',
  owner_phone: '08222222222',
});

// Minimal valid 1x1 PNG header bytes
const fakePng = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]);
// Minimal valid MP4 ftyp header bytes
const fakeMp4 = Buffer.from([0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x6d, 0x70, 0x34, 0x32]);
// Invalid executable disguised as PNG
const badFile = Buffer.from('<script>alert(1)</script>');

const badUpload = saveStagingReportMedia(tenantA.tenant_id, badFile, 'image/png', 'evil.png');
assert.equal(badUpload.success, false);

const img1 = saveStagingReportMedia(tenantA.tenant_id, fakePng, 'image/png', 'bukti1.png');
const img2 = saveStagingReportMedia(tenantA.tenant_id, fakePng, 'image/png', 'bukti2.png');
const vid1 = saveStagingReportMedia(tenantA.tenant_id, fakeMp4, 'video/mp4', 'rekam1.mp4');
const vid2 = saveStagingReportMedia(tenantA.tenant_id, fakeMp4, 'video/mp4', 'rekam2.mp4');
const stagingTrash = saveStagingReportMedia(tenantA.tenant_id, fakePng, 'image/png', 'hapus.png');

assert.equal(img1.success, true);
assert.equal(img2.success, true);
assert.equal(vid1.success, true);
assert.equal(vid2.success, true);
assert.equal(deleteStagingReportMedia(tenantA.tenant_id, stagingTrash.media!.stagingToken), true);

// Reject 2 videos in 1 report
const twoVidAttempt = createTenantReport(tenantA.tenant_id, {
  title: 'Dua Video',
  message: 'Tidak boleh 2 video',
  stagingTokens: [vid1.media!.stagingToken, vid2.media!.stagingToken],
});
assert.equal(twoVidAttempt.success, false);
deleteStagingReportMedia(tenantA.tenant_id, vid2.media!.stagingToken);

// Create valid report with 2 images + 1 video (max 3 media, max 1 video)
const created = createTenantReport(tenantA.tenant_id, {
  title: 'QRIS Tidak Muncul',
  message: 'Setelah checkout QRIS tidak tampil di grup WhatsApp.',
  stagingTokens: [img1.media!.stagingToken, img2.media!.stagingToken, vid1.media!.stagingToken],
});
assert.equal(created.success, true);
assert.equal(created.report?.status, 'terkirim');
assert.equal(created.report?.adminReply, null);
assert.equal(created.report?.media.length, 3);

// Tenant B cannot see Tenant A reports or fetch Tenant A media
assert.equal(listTenantReports(tenantB.tenant_id).length, 0);
const mediaId = created.report!.media[0].id;
assert.equal(getTenantReportMediaFile(tenantB.tenant_id, mediaId), null);
assert.notEqual(getTenantReportMediaFile(tenantA.tenant_id, mediaId), null);
assert.notEqual(getAdminReportMediaFile(mediaId), null);

// Admin list contains full owner info & counts.terkirim == 1
const adminList1 = listAdminReports('all');
assert.equal(adminList1.counts.terkirim, 1);
assert.equal(adminList1.reports[0].ownerName, 'Budi');
assert.equal(adminList1.reports[0].tenantId, tenantA.tenant_id);
assert.equal(adminList1.reports[0].media.length, 3);

// Admin clicks Proses Laporan with a draft reply -> Tenant sees status 'proses' and adminReply STILL null
const stepProses = updateAdminReportStatus(created.report!.id, {
  status: 'proses',
  replyEnabled: true,
  adminReply: 'Draft balasan belum final',
});
assert.equal(stepProses.success, true);
const tenantAfterProses = listTenantReports(tenantA.tenant_id)[0];
assert.equal(tenantAfterProses.status, 'proses');
assert.equal(tenantAfterProses.adminReply, null);

// Admin toggles OFF and clicks Laporan Selesai -> Tenant sees 'selesai' and adminReply STILL null
const stepSelesaiNoReply = updateAdminReportStatus(created.report!.id, {
  status: 'selesai',
  replyEnabled: false,
  adminReply: 'Draft diabaikan',
});
assert.equal(stepSelesaiNoReply.success, true);
const tenantAfterSelesaiOff = listTenantReports(tenantA.tenant_id)[0];
assert.equal(tenantAfterSelesaiOff.status, 'selesai');
assert.equal(tenantAfterSelesaiOff.adminReply, null);

// Admin edits completed report, toggles ON and sets reply -> Tenant sees 'selesai' AND adminReply
const stepEditReply = updateAdminReportStatus(created.report!.id, {
  status: 'selesai',
  replyEnabled: true,
  adminReply: 'Sudah kami perbaiki melalui pembaruan webhook.',
});
assert.equal(stepEditReply.success, true);
const tenantAfterEditOn = listTenantReports(tenantA.tenant_id)[0];
assert.equal(tenantAfterEditOn.status, 'selesai');
assert.equal(tenantAfterEditOn.adminReply, 'Sudah kami perbaiki melalui pembaruan webhook.');
console.log('REPORT_SERVICE_ALL_OK');
`;

  try {
    const out = execFileSync(
      path.join(repoRoot, 'node_modules', '.bin', 'tsx'),
      ['--input-type=module', '-e', script],
      { cwd: tmpDir, encoding: 'utf-8' }
    );
    assert.match(out, /REPORT_SERVICE_ALL_OK/);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});
