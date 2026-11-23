import test from 'node:test';
import assert from 'node:assert/strict';
import {
  REPORT_IMAGE_MAX_BYTES,
  REPORT_VIDEO_MAX_BYTES,
  getReportStatusBadge,
  validateClientReportFileSelection,
  validateClientReportForm,
} from './reportHelpers';

test('validateClientReportFileSelection enforces 3-media cap, 1-video cap, and 5MB/25MB size caps', () => {
  const existing = [
    { mediaType: 'image' as const },
    { mediaType: 'video' as const },
  ];

  // Second video rejected
  const secondVideo = validateClientReportFileSelection(existing, {
    name: 'clip2.mp4',
    type: 'video/mp4',
    size: 1024 * 1024,
  });
  assert.equal(secondVideo.valid, false);
  assert.match(secondVideo.error || '', /1 video/i);

  // Oversized image rejected
  const hugeImg = validateClientReportFileSelection([{ mediaType: 'image' }], {
    name: 'huge.png',
    type: 'image/png',
    size: REPORT_IMAGE_MAX_BYTES + 1,
  });
  assert.equal(hugeImg.valid, false);

  // Oversized video rejected
  const hugeVid = validateClientReportFileSelection([], {
    name: 'huge.mp4',
    type: 'video/mp4',
    size: REPORT_VIDEO_MAX_BYTES + 1,
  });
  assert.equal(hugeVid.valid, false);

  // Valid 3rd media as image accepted
  const thirdImage = validateClientReportFileSelection(existing, {
    name: 'screen.jpg',
    type: 'image/jpeg',
    size: 2 * 1024 * 1024,
  });
  assert.equal(thirdImage.valid, true);
  assert.equal(thirdImage.mediaType, 'image');

  // 4th media rejected
  const fourth = validateClientReportFileSelection(
    [...existing, { mediaType: 'image' }],
    { name: 'extra.png', type: 'image/png', size: 1000 }
  );
  assert.equal(fourth.valid, false);
  assert.match(fourth.error || '', /3 media/i);
});

test('validateClientReportForm enforces 30-char title and non-empty message', () => {
  assert.equal(validateClientReportForm({ title: '', message: 'Isi pesan' }).valid, false);
  assert.equal(
    validateClientReportForm({ title: 'x'.repeat(31), message: 'Isi pesan' }).valid,
    false
  );
  assert.equal(
    validateClientReportForm({ title: 'x'.repeat(30), message: 'Detail lengkap kendala.' }).valid,
    true
  );
});

test('getReportStatusBadge maps terkirim=gray, proses=yellow/amber, selesai=green', () => {
  const t = getReportStatusBadge('terkirim');
  assert.equal(t.label, 'Terkirim');
  assert.match(t.className, /bg-slate-100/);

  const p = getReportStatusBadge('proses');
  assert.equal(p.label, 'Proses');
  assert.match(p.className, /bg-amber-50/);

  const s = getReportStatusBadge('selesai');
  assert.equal(s.label, 'Selesai');
  assert.match(s.className, /bg-emerald-50/);
});
